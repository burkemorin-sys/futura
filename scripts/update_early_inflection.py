#!/usr/bin/env python3
"""Early Inflection screen -> data/early-inflection.json (+ data/early-inflection-history.json).

Looks for "early LITE-2025" setups: revenue that has bottomed and is accelerating, gross margin rising,
strong forward growth, still-reasonable valuation, a stock that has NOT already run 3-5x, a trend that
is turning up, constructive analysts, and (bonus) a supplier role in an AI-infrastructure bottleneck.

Pipeline (stdlib only, no keys, real data only):
  1. Universe: every US-listed stock on Nasdaq's public screener with a $1B-$30B market cap, excluding
     Finance and Real Estate sectors (bank/insurer/REIT accounts have no comparable gross margin),
     preferred/warrant/unit symbols, bitcoin/crypto miners and known pending-merger targets.
  2. StockAnalysis statistics page for each -> filters: 3+ analysts with a target, $100M+ TTM revenue
     (USD, = market cap / P/S), $5M+/day average dollar volume.
  3. StockAnalysis quarterly income statement for the survivors -> revenue acceleration, margin trend.
  4. Preliminary score; the top PRE_N get Nasdaq daily closes (1-yr move, 52-wk high, 3-month relative
     strength vs SPY) and a pending-deal check (tiny realized volatility + flat price = likely a cash deal).
  5. Final 0-100 score (rubric below), at most MAX_PER_INDUSTRY names per industry; top 12 = picks, next
     BENCH_N = bench.
  6. Appends today's price target / forward P/S / forward P/E for the top HISTORY_N names to
     data/early-inflection-history.json so analyst/estimate revisions can be measured over time.

Score (0-100):
  Revenue acceleration 20 | Margin expansion 15 | Forward growth 15 | Valuation 15 |
  Not already run 10 (heavy penalty over +300% in a year) | Trend turning 10 | Analysts 10 | Bottleneck theme 5

Usage:
  python3 scripts/update_early_inflection.py            # full run (about 5-8 minutes)
  python3 scripts/update_early_inflection.py --limit 200   # quick test on the first 200 names
Then: python3 scripts/futura_grades.py (letter grades) and python3 scripts/update_track_record.py.
"""
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "early-inflection.json")
HIST = os.path.join(ROOT, "data", "early-inflection-history.json")
GROWTH = os.path.join(ROOT, "data", "growth-picks.json")
RISKIT = os.path.join(ROOT, "data", "risk-it.json")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

MCAP_MIN, MCAP_MAX = 1e9, 30e9
REV_MIN = 100e6
ANALYSTS_MIN = 3
DOLLAR_VOL_MIN = 5e6
PRE_N = 70
PICKS_N, BENCH_N = 12, 18
MAX_PER_INDUSTRY = 3
HISTORY_N = 150
THREADS = 4

# Bitcoin / crypto miners (incl. miners pivoting to AI/HPC hosting that still earn meaningful mining revenue).
MINERS = {"MARA", "RIOT", "CLSK", "HUT", "CIFR", "IREN", "WULF", "BTDR", "HIVE", "BITF", "CORZ", "BTBT", "CAN",
          "SDIG", "GREE", "ARBK", "SLNH", "DGHI", "LMFA", "BTCM", "SAI", "MIGI", "ABTC", "GRYP", "BTOG", "DMGI",
          "CANG", "SOS", "FUFU", "AIRE", "BMNR", "GPUS", "USBC", "NCPL"}
# Known pending-merger targets whose price is tied to a deal (update as deals close or break).
PENDING_DEALS = {
    "VECO": "Pending all-stock merger with Axcelis (awaiting China SAMR review)",
}
EXCLUDE_SECTORS = {"Finance", "Real Estate"}
# Commodity producers (metal/coal/lithium miners, oil & gas producers, refiners, smelters, fertilizer makers): their revenue
# swings with commodity prices, which is not the demand-driven inflection this screen looks for. Nasdaq screener industry names.
COMMODITY_INDUSTRIES = {"Metal Mining", "Other Metals and Minerals", "Precious Metals", "Coal Mining", "Oil & Gas Production",
                        "Integrated oil Companies", "Oil Refining/Marketing", "Aluminum", "Steel/Iron Ore",
                        "Mining & Quarrying of Nonmetallic Minerals (No Fuels)", "Agricultural Chemicals"}
ACQ_JUMP_PCT = 8  # goodwill + intangibles up by more than this % of total assets in a year → acquisition-driven growth

# AI-infrastructure bottleneck theme via StockAnalysis industry membership (+ a few explicit overrides).
THEME_CORE = {
    "semiconductors": "Semiconductors",
    "semiconductor-equipment-and-materials": "Semiconductor Equipment & Materials",
    "communication-equipment": "Communication Equipment",
    "electronic-components": "Electronic Components",
    "computer-hardware": "Computer Hardware",
    "electrical-equipment-and-parts": "Electrical Equipment & Parts",
}
THEME_ADJ = {
    "scientific-and-technical-instruments": "Scientific & Technical Instruments",
    "specialty-industrial-machinery": "Specialty Industrial Machinery",
    "utilities-independent-power-producers": "Independent Power Producers",
    "engineering-and-construction": "Engineering & Construction",
}
SLUG_SECTOR = {"semiconductors": "Technology", "semiconductor-equipment-and-materials": "Technology", "communication-equipment": "Technology",
               "electronic-components": "Technology", "computer-hardware": "Technology", "scientific-and-technical-instruments": "Technology",
               "electrical-equipment-and-parts": "Industrials", "specialty-industrial-machinery": "Industrials",
               "engineering-and-construction": "Industrials", "utilities-independent-power-producers": "Utilities"}
THEME_OVERRIDE = {  # ticker -> (points, reason)
    "MOD": (5, "data-center thermal management"),
    "COHR": (5, "optical transceivers and lasers"),
    "MKSI": (5, "lasers/photonics and chip-equipment subsystems"),
    "LASR": (5, "semiconductor lasers"),
    "LPTH": (3, "optical components"),
}

PATTERN = ("Lumentum (LITE) bottomed at $49.56 on Apr 4, 2025 and closed 2025 at $368.59 (+644%); by Oct 2026 it was "
           "about 22x the low. What was visible at the time: revenue had troughed in mid-2024 and was accelerating "
           "(+6%, +10%, +16% YoY), gross margin had risen four quarters in a row, it beat the top of guidance and then "
           "raised mid-quarter, it supplied a bottleneck (laser chips for AI optics; Nvidia's co-packaged-optics partner), "
           "and it traded near 2.3x sales and ~17x forward earnings after a tariff-driven 48% drop while analysts were "
           "cutting targets. The stock reclaimed its 200-day average a week after the May beat-and-raise and broke its "
           "2021 high in late July 2025, and buying that breakout still returned about 10x. This screen scores today's "
           "stocks on the same signals. Hindsight caveat: no one knew in 2025 how big the move would be, and most "
           "stocks that pass a screen like this will not become LITE.")
RUBRIC = [
    {"component": "Revenue acceleration", "points": 20, "how": "Latest-quarter YoY growth vs the prior quarter (up to 7) and vs a year earlier (up to 7), plus the growth level (up to 6, full at 40%+). Zero if revenue is shrinking."},
    {"component": "Margin expansion", "points": 15, "how": "Gross margin (last 2 quarters vs same 2 a year earlier, full at +5 pts) up to 9; operating margin (full at +8 pts) up to 6."},
    {"component": "Forward growth", "points": 15, "how": "Implied next-12-month revenue growth (P/S ÷ forward P/S, full at 35%+) up to 10; 3-yr EPS growth forecast (full at 40%+) up to 5."},
    {"component": "Valuation", "points": 15, "how": "Forward P/E (15 or less full, 45+ zero) up to 9; EV / forward sales (2x or less full, 10x+ zero) up to 6."},
    {"component": "Not already run", "points": 10, "how": "1-yr move up to +100% scores 7, fading to 5 at +150% and 1 at +300%; over +300% scores 0 and costs 5 more points. Plus up to 3 for a 15–50% pullback from the 52-week high."},
    {"component": "Trend turning", "points": 10, "how": "Above the 200-day average 4, above the 50-day 2, 50-day above 200-day 2, beating SPY over 3 months 2."},
    {"component": "Analysts", "points": 10, "how": "Upside to the average target (full at 50%+) up to 6; consensus Strong Buy 4, Buy 3, Hold 1."},
    {"component": "Bottleneck theme", "points": 5, "how": "AI-infrastructure supplier industries (semis, chip equipment, optics/communication equipment, electronic components, hardware, electrical equipment) 5; adjacent industries (instruments, industrial machinery, power producers, engineering & construction) 3."},
]


def get(url, accept="text/html", tries=3, timeout=30):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Accept-Language": "en-US,en;q=0.9"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def fnum(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "").replace("$", "").replace("%", "")
    if not s or s.lower() in ("n/a", "-", "--", "none", "null"):
        return None
    m = re.match(r"^[+-]?\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def fmt_money(v):
    if v is None:
        return "n/a"
    a = abs(v)
    s = f"${a/1e12:.2f}T" if a >= 1e12 else f"${a/1e9:.1f}B" if a >= 1e9 else f"${a/1e6:.0f}M"
    return ("-" if v < 0 else "") + s


def pct(v, d=0, sign=True):
    return "n/a" if v is None else (f"{v:+.{d}f}%" if sign else f"{v:.{d}f}%")


# ---------------- data sources ----------------
def nasdaq_universe():
    d = json.loads(get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", accept="application/json", timeout=90))
    rows = d["data"]["rows"]
    out = []
    for r in rows:
        sym = (r.get("symbol") or "").strip().upper()
        mcap = fnum(r.get("marketCap"))
        if not sym or not re.fullmatch(r"[A-Z]{1,5}", sym) or mcap is None:
            continue
        if not (MCAP_MIN <= mcap <= MCAP_MAX) or (r.get("sector") or "") in EXCLUDE_SECTORS:
            continue
        name = r.get("name") or ""
        if re.search(r"\b(warrant|right|unit|preferred|depositary shares? representing|notes due)\b", name, re.I):
            continue
        out.append({"ticker": sym, "name": name, "sector": r.get("sector") or "", "industry": r.get("industry") or "",
                    "country": r.get("country") or "", "lastsale": fnum(r.get("lastsale")), "volume": fnum(r.get("volume")), "mcap": mcap})
    return out, len(rows)


def sa_industries():
    out = {}
    for slug in list(THEME_CORE) + list(THEME_ADJ):
        try:
            h = get(f"https://stockanalysis.com/stocks/industry/{slug}/")
            for s in re.findall(r'\{no:\d+,s:"([^"]+)"', h):
                out.setdefault(s.upper(), slug)
        except Exception as e:  # noqa: BLE001
            print("industry page failed", slug, e)
        time.sleep(0.3)
    return out


def sa_stats(t):
    h = get(f"https://stockanalysis.com/stocks/{t.lower()}/statistics/")
    items = re.findall(r'\{id:"([^"]+)",title:"[^"]+",value:"([^"]*)",hover:"([^"]*)"', h)
    if not items:
        raise RuntimeError("no statistics data")
    return {k: (hv if hv not in ("", None) else v) for k, v, hv in items}


def _arr(h, key):
    m = re.search(key + r":\[([^\]]*)\]", h)
    if not m:
        return []
    out = []
    for x in m.group(1).split(","):
        x = x.strip().strip('"')
        try:
            out.append(float(x))
        except ValueError:
            out.append(None if x in ("null", "", "void 0") else x)
    return out


def sa_quarterly(t):
    h = get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly")
    cur = re.search(r'details:\{source:"[^"]*",currency:"([A-Z]{3})"', h)
    return {"dates": _arr(h, "datekey"), "rev": _arr(h, "revenue"), "gm": _arr(h, "grossMargin"), "om": _arr(h, "operatingMargin"),
            "currency": cur.group(1) if cur else None}


def clean_name(n):
    n = re.sub(r"\s+(Common Stock|Ordinary Shares|Class [A-Z] (Common Stock|Ordinary Shares|Shares)|American Depositary Shares?.*|"
               r"Sponsored ADR.*|ADS.*|Common Shares|Subordinate Voting Shares|New)\b.*$", "", n.strip(), flags=re.I)
    n2 = re.sub(r"\s*\(New\)", "", n).strip(" ,")
    return n2 or n


def sa_acq_jump(t):
    """Goodwill + other intangibles added over the last 4 quarters, as % of total assets a year ago (acquisition detector)."""
    h = get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/balance-sheet/?p=quarterly")
    gw, oi, a = _arr(h, "goodwill"), _arr(h, "otherIntangibles"), _arr(h, "assets")

    def v(arr, i):
        return arr[i] if i < len(arr) and isinstance(arr[i], float) else 0.0
    if len(a) < 5 or not isinstance(a[4], float) or a[4] <= 0:
        return None
    return ((v(gw, 0) + v(oi, 0)) - (v(gw, 4) + v(oi, 4))) / a[4] * 100


def nasdaq_history(t, days=400):
    to = dt.date.today()
    fr = to - dt.timedelta(days=days)
    for ac in ("stocks", "etf"):
        url = (f"https://api.nasdaq.com/api/quote/{t}/historical?assetclass={ac}&fromdate={fr.isoformat()}"
               f"&todate={to.isoformat()}&limit=9999")
        try:
            d = json.loads(get(url, accept="application/json"))
        except Exception:  # noqa: BLE001
            continue
        rows = (((d or {}).get("data") or {}).get("tradesTable") or {}).get("rows") or []
        out = []
        for r in rows:
            try:
                out.append((dt.datetime.strptime(r["date"], "%m/%d/%Y").date(), float(str(r["close"]).replace(",", "").replace("$", ""))))
            except Exception:  # noqa: BLE001
                pass
        if out:
            return sorted(out)
    return []


def chg_days(h, days):
    if len(h) < 2:
        return None
    tgt = h[-1][0] - dt.timedelta(days=days)
    if h[0][0] > tgt + dt.timedelta(days=5):
        return None
    base = [c for d, c in h if d <= tgt]
    return (h[-1][1] / base[-1] - 1) * 100 if base else None


def pmap(fn, items, label):
    out, n = {}, len(items)
    with cf.ThreadPoolExecutor(THREADS) as ex:
        futs = {ex.submit(fn, it): it for it in items}
        for i, f in enumerate(cf.as_completed(futs), 1):
            it = futs[f]
            try:
                out[it] = f.result()
            except Exception as e:  # noqa: BLE001
                out[it] = e
            if i % 100 == 0 or i == n:
                print(f"  {label}: {i}/{n}", flush=True)
    return out


# ---------------- scoring ----------------
def yoy(rev, i):
    if len(rev) > i + 4 and isinstance(rev[i], float) and isinstance(rev[i + 4], float) and rev[i + 4] > 0:
        return (rev[i] / rev[i + 4] - 1) * 100
    return None


def avg2(a, i):
    v = [x for x in a[i:i + 2] if isinstance(x, float)]
    return sum(v) / len(v) * 100 if len(v) == 2 else None


def fundamentals(c):
    s, q = c["stats"], c["q"]
    rev = [x if isinstance(x, float) else None for x in q["rev"]]
    m = {}
    m["yoy0"], m["yoy1"], m["yoy4"] = yoy(rev, 0), yoy(rev, 1), yoy(rev, 4)
    ttm = rev[0:4]
    prev = rev[4:8]
    m["ttmGrowth"] = ((sum(ttm) / sum(prev) - 1) * 100) if len(prev) == 4 and None not in ttm + prev and sum(prev) > 0 else None
    q8 = [x for x in rev[:8] if x is not None]
    m["troughQAgo"] = rev[:8].index(min(q8)) if q8 else None
    g0, g4 = avg2(q["gm"], 0), avg2(q["gm"], 4)
    o0, o4 = avg2(q["om"], 0), avg2(q["om"], 4)
    m["gm"] = q["gm"][0] * 100 if q["gm"] and isinstance(q["gm"][0], float) else None
    m["om"] = q["om"][0] * 100 if q["om"] and isinstance(q["om"][0], float) else None
    m["gmChg"] = (g0 - g4) if g0 is not None and g4 is not None else None
    m["omChg"] = (o0 - o4) if o0 is not None and o4 is not None else None
    ps, psf = fnum(s.get("ps")), fnum(s.get("psForward"))
    m["fwdRevGrowth"] = (ps / psf - 1) * 100 if ps and psf and ps > 0 and psf > 0 else None
    m["eps3y"] = fnum(s.get("eps3y"))
    m["fpe"] = fnum(s.get("peForward"))
    evs = fnum(s.get("evSales"))
    m["evSales"] = evs
    m["evFwdSales"] = evs * psf / ps if evs is not None and ps and psf else None
    m["peg"] = fnum(s.get("pegRatio"))
    m["ch1y"] = fnum(s.get("ch1y"))
    m["sma50"], m["sma200"] = fnum(s.get("sma50")), fnum(s.get("sma200"))
    m["pt"] = fnum(s.get("priceTarget"))
    m["rating"] = s.get("analystRatings") or "n/a"
    m["analysts"] = int(fnum(s.get("analystCount")) or 0)
    m["psForward"] = psf
    m["netcash"] = fnum(s.get("netcash"))
    m["sharesYoY"] = fnum(s.get("sharesgrowthyoy"))
    m["shortFloat"] = fnum(s.get("shortFloat"))
    m["beta"] = fnum(s.get("beta"))
    m["grossMarginTTM"] = fnum(s.get("grossMargin"))
    m["mcap"] = fnum(s.get("marketcap")) or c["mcap"]
    m["revUSD"] = m["mcap"] / ps if ps else None
    m["currency"] = q.get("currency")
    m["lastQ"] = q["dates"][0] if q["dates"] else None
    return m


def score(c):
    m = c["m"]
    pts, drv = {}, []
    A, B, C = m["yoy0"], m["yoy1"], m["yoy4"]
    if A is not None and A > 0:
        q = clamp(((A - B) if B is not None else 0) / 10) * 7
        y = clamp(((A - C) if C is not None else 0) / 25) * 7
        lv = clamp(A / 40) * 6
        pts["rev"] = q + y + lv
    else:
        pts["rev"] = 0.0
    deal_sh = m["sharesYoY"] is not None and m["sharesYoY"] > 15
    deal_acq = (m.get("acqJump") or 0) > ACQ_JUMP_PCT
    if deal_sh or deal_acq:
        pts["rev"] *= 0.5
    why = (f"share count +{m['sharesYoY']:.0f}% YoY" if deal_sh else "") + (" and " if deal_sh and deal_acq else "") + \
          (f"goodwill/intangibles up {m['acqJump']:.0f}% of assets in a year" if deal_acq else "")
    drv.append(f"Revenue: latest quarter {pct(A)} YoY vs {pct(B)} the quarter before and {pct(C)} a year earlier"
               + (f" (halved: {why} suggests acquisition-driven growth)" if why else "") + f" → {pts['rev']:.0f}/20")
    g = clamp((m["gmChg"] or 0) / 5) * 9 if m["gmChg"] is not None else 0
    o = clamp((m["omChg"] or 0) / 8) * 6 if m["omChg"] is not None else 0
    pts["margin"] = g + o
    drv.append(f"Margins: gross {pct(m['gmChg'], 1).replace('%', ' pts')}, operating {pct(m['omChg'], 1).replace('%', ' pts')} YoY (last 2 quarters) → {pts['margin']:.0f}/15")
    f1 = clamp((m["fwdRevGrowth"] or 0) / 35) * 10 if m["fwdRevGrowth"] is not None else 0
    f2 = clamp((m["eps3y"] or 0) / 40) * 5 if m["eps3y"] is not None else 0
    pts["forward"] = f1 + f2
    drv.append(f"Forward: next-12-month revenue {pct(m['fwdRevGrowth'])} (implied), 3-yr EPS growth forecast {pct(m['eps3y'], 0)} a year → {pts['forward']:.0f}/15")
    v1 = clamp((45 - m["fpe"]) / 30) * 9 if m["fpe"] and m["fpe"] > 0 else 0
    v2 = clamp((10 - m["evFwdSales"]) / 8) * 6 if m["evFwdSales"] is not None and m["evFwdSales"] > 0 else 0
    pts["value"] = v1 + v2
    drv.append(f"Valuation: forward P/E {m['fpe'] if m['fpe'] else 'n/a'}, EV/forward sales {('%.1fx' % m['evFwdSales']) if m['evFwdSales'] else 'n/a'} → {pts['value']:.0f}/15")
    r = m.get("ch1yNasdaq", m["ch1y"])
    penalty = 0
    if r is None:
        n1 = 4
    elif r > 300:
        n1, penalty = 0, 5
    elif r > 150:
        n1 = 5 - 4 * (r - 150) / 150
    elif r > 100:
        n1 = 7 - 2 * (r - 100) / 50
    elif r < -40:
        n1 = 4
    else:
        n1 = 7
    dd = m.get("offHigh")
    if dd is None:
        n2 = 0
    elif -50 <= dd <= -15:
        n2 = 3
    elif dd > -15:
        n2 = 3 * (-dd / 15)
    else:
        n2 = 1
    pts["notRun"] = n1 + n2
    drv.append(f"Not already run: 1-yr {pct(r)}{' (heavy penalty −5)' if penalty else ''}, {pct(dd)} vs 52-week high → {pts['notRun']:.0f}/10" + (" −5" if penalty else ""))
    px = m.get("price")
    t = 0
    if px and m["sma200"]:
        t += 4 if px > m["sma200"] else 0
    if px and m["sma50"]:
        t += 2 if px > m["sma50"] else 0
    if m["sma50"] and m["sma200"]:
        t += 2 if m["sma50"] > m["sma200"] else 0
    if m.get("rs3m") is not None:
        t += 2 if m["rs3m"] > 0 else 0
    pts["trend"] = t
    drv.append(f"Trend: price {'above' if px and m['sma200'] and px > m['sma200'] else 'below'} 200-day, {'above' if px and m['sma50'] and px > m['sma50'] else 'below'} 50-day, 3-month vs SPY {pct(m.get('rs3m'), 0).replace('%', ' pts')} → {t}/10")
    up = (m["pt"] / px - 1) * 100 if m["pt"] and px else None
    m["upside"] = up
    a1 = clamp((up or 0) / 50) * 6 if up is not None else 0
    rt = str(m["rating"]).lower()
    a2 = 4 if "strong buy" in rt else 3 if rt == "buy" else 1 if rt == "hold" else 0
    pts["analysts"] = a1 + a2
    drv.append(f"Analysts: {m['rating']} ({m['analysts']}), {pct(up)} to target → {pts['analysts']:.0f}/10")
    th, why = c["theme"]
    pts["theme"] = th
    drv.append(f"Bottleneck theme: {why} → {th}/5")
    total = sum(pts.values()) - penalty
    return max(0, round(total)), {k: round(v, 1) for k, v in pts.items()}, drv, penalty


def checklist(c):
    m = c["m"]
    A, B, C = m["yoy0"], m["yoy1"], m["yoy4"]
    def item(key, label, ok, detail):
        return {"key": key, "label": label, "met": ok, "detail": detail}
    rev_ok = None if A is None else bool(A > 0 and (B is None or A > B) and (C is None or A > C))
    th = c["theme"][0]
    out = [
        item("revenue", "Revenue turned up and accelerating", rev_ok, f"{pct(A)} YoY latest quarter vs {pct(B)} prior, {pct(C)} a year ago"
             + (" (partly from an acquisition)" if (m.get("acqJump") or 0) > ACQ_JUMP_PCT else "")),
        item("theme", "Supplier to an AI-infrastructure bottleneck", th >= 3, c["theme"][1]),
        item("margin", "Gross margin rising", None if m["gmChg"] is None else m["gmChg"] >= 1, f"{pct(m['gmChg'], 1).replace('%', ' pts')} YoY (last 2 quarters)"),
        item("forward", "Strong forward growth (20%+ next 12 months)", None if m["fwdRevGrowth"] is None else m["fwdRevGrowth"] >= 20, f"Implied next-12-month revenue {pct(m['fwdRevGrowth'])}"),
        item("value", "Still cheap vs growth (fwd P/E ≤ 25 or EV/fwd sales ≤ 4)", bool((m["fpe"] and 0 < m["fpe"] <= 25) or (m["evFwdSales"] and m["evFwdSales"] <= 4)),
             f"Forward P/E {m['fpe'] if m['fpe'] else 'n/a'}, EV/forward sales {('%.1fx' % m['evFwdSales']) if m['evFwdSales'] else 'n/a'}"),
        item("notrun", "Not already run (1-yr ≤ +150%)", None if m.get("ch1yNasdaq") is None else m["ch1yNasdaq"] <= 150, f"1-yr {pct(m.get('ch1yNasdaq'))} vs SPY {pct(c.get('spy1y'))}"),
        item("pullback", "Pulled back 15–50% from the 52-week high", None if m.get("offHigh") is None else -50 <= m["offHigh"] <= -15, f"{pct(m.get('offHigh'))} vs 52-week high"),
        item("trend", "Trend turning up (above 200-day, beating SPY over 3 months)",
             None if m.get("price") is None or m["sma200"] is None else bool(m["price"] > m["sma200"] and (m.get("rs3m") or 0) > 0),
             f"{'Above' if m.get('price') and m['sma200'] and m['price'] > m['sma200'] else 'Below'} 200-day; 3-month vs SPY {pct(m.get('rs3m'), 0).replace('%', ' pts')}"),
        item("analysts", "Analysts constructive (Buy+ and 15%+ upside)", bool(str(m["rating"]).lower() in ("buy", "strong buy") and (m.get("upside") or 0) >= 15),
             f"{m['rating']} ({m['analysts']}), {pct(m.get('upside'))} to target"),
        item("revisions", "Targets / estimates being raised (30-day)", c.get("revisionMet"), c.get("revisionDetail") or "Revision history started Oct 8, 2026; needs about 30 days of data"),
    ]
    return out


def risks(c):
    m, out = c["m"], []
    r = m.get("ch1yNasdaq")
    if r is not None and r > 150:
        out.append(f"Already up {r:.0f}% in a year: much of the turn may be priced in")
    if m.get("offHigh") is not None and m["offHigh"] < -50:
        out.append(f"Down {abs(m['offHigh']):.0f}% from its 52-week high: falling-knife risk")
    if m["gmChg"] is not None and m["gmChg"] < 0:
        out.append(f"Gross margin down {abs(m['gmChg']):.1f} pts YoY")
    if m["gm"] is not None and m["gm"] < 20:
        out.append(f"Thin gross margin ({m['gm']:.0f}%) leaves little room for error")
    if m["netcash"] is not None and m["netcash"] < 0 and m["mcap"] and -m["netcash"] > 0.15 * m["mcap"]:
        out.append(f"Net debt {fmt_money(-m['netcash'])} ({-m['netcash'] / m['mcap'] * 100:.0f}% of market cap)")
    if (m.get("acqJump") or 0) > ACQ_JUMP_PCT:
        out.append(f"Recent acquisition (goodwill/intangibles up {m['acqJump']:.0f}% of assets in a year): part of the revenue jump is bought, not organic")
    if m["sharesYoY"] is not None and m["sharesYoY"] > 8:
        out.append(f"Share count +{m['sharesYoY']:.0f}% YoY (dilution or a stock-funded deal can flatter growth)")
    if m["shortFloat"] is not None and m["shortFloat"] > 10:
        out.append(f"Short interest {m['shortFloat']:.0f}% of float")
    if not m["fpe"] or m["fpe"] <= 0:
        out.append("No positive forward P/E (unprofitable or no estimate)")
    elif m["fpe"] > 40:
        out.append(f"Rich forward P/E ({m['fpe']:.0f})")
    if m.get("price") and m["sma200"] and m["price"] < m["sma200"]:
        out.append("Still below its 200-day average: the turn isn't confirmed")
    if m["analysts"] < 5:
        out.append(f"Thin coverage ({m['analysts']} analysts)")
    if m["beta"] and m["beta"] > 2:
        out.append(f"High volatility (beta {m['beta']:.1f})")
    if m["currency"] and m["currency"] != "USD":
        out.append(f"Financials reported in {m['currency']}")
    if c["theme"][0] >= 5:
        out.append("Cyclical hardware demand: AI capex pauses or inventory digestion would hit results")
    return out[:6] or ["No data-driven red flags; check the latest earnings call"]


def build_entry(c, also_in, notes, spy1y):
    m = c["m"]
    lastq = m["lastQ"] or ""
    try:
        lq_label = dt.date.fromisoformat(lastq).strftime("%b %Y")
    except ValueError:
        lq_label = lastq
    cur = "" if m["currency"] in (None, "USD") else f"{m['currency']} "
    rev0 = c["q"]["rev"][0] if c["q"]["rev"] and isinstance(c["q"]["rev"][0], float) else None
    fund = (f"Latest quarter ({lq_label}) revenue {cur}{fmt_money(rev0).replace('$', '$' if not cur else '')}, {pct(m['yoy0'])} YoY "
            f"(prior quarter {pct(m['yoy1'])}, a year earlier {pct(m['yoy4'])}); TTM revenue {pct(m['ttmGrowth'])}. "
            f"Gross margin {pct(m['gm'], 1, False)} ({pct(m['gmChg'], 1).replace('%', ' pts')} YoY), operating margin {pct(m['om'], 1, False)}. "
            f"Net {'cash' if (m['netcash'] or 0) >= 0 else 'debt'} {fmt_money(abs(m['netcash'])) if m['netcash'] is not None else 'n/a'}.")
    trend = (f"1-yr {pct(m.get('ch1yNasdaq'))} vs SPY {pct(spy1y)}; {pct(m.get('offHigh'))} from the 52-week high; "
             f"{'above' if m.get('price') and m['sma200'] and m['price'] > m['sma200'] else 'below'} its 200-day average. "
             f"Implied next-12-month revenue growth {pct(m['fwdRevGrowth'])}.")
    note = notes.get(c["ticker"])
    t = c["ticker"]
    key_figs = [
        {"label": "Latest Q rev", "value": pct(m["yoy0"])},
        {"label": "Gross margin Δ", "value": pct(m["gmChg"], 1).replace("%", " pts")},
        {"label": "Next-12m rev", "value": pct(m["fwdRevGrowth"])},
        {"label": "EV / fwd sales", "value": ("%.1fx" % m["evFwdSales"]) if m["evFwdSales"] else "n/a"},
        {"label": "1-yr move", "value": pct(m.get("ch1yNasdaq"))},
        {"label": "vs 52-wk high", "value": pct(m.get("offHigh"))},
    ]
    e = {
        "company": clean_name(c["name"]), "ticker": t, "sector": c["sectorLabel"], "price": round(m["price"], 2) if m.get("price") else None,
        "priceDate": m.get("priceDate"), "marketCap": fmt_money(m["mcap"]), "forwardPE": round(m["fpe"], 2) if m["fpe"] else "n/a",
        "peg": round(m["peg"], 2) if m["peg"] else "n/a",
        "revenueGrowth": f"{pct(m['ttmGrowth'], 1)} YoY (TTM; latest quarter {pct(m['yoy0'], 1)})" if m["ttmGrowth"] is not None else f"{pct(m['yoy0'], 1)} YoY (latest quarter)",
        "score": c["score"], "scoreParts": c["parts"], "alsoIn": also_in.get(t, []),
        "checklist": c["checklist"], "drivers": c["drivers"], "keyFigures": key_figs,
        "trend": trend, "fundamentals": fund, "risks": risks(c),
        "analystRating": f"{m['rating']} ({m['analysts']} analysts)", "priceTarget": m["pt"],
        "revisions": c.get("revisions"),
        "sourceUrl": [f"https://stockanalysis.com/stocks/{t.lower()}/statistics/", f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly"],
        "eiMetrics": {k: (round(v, 2) if isinstance(v, float) else v) for k, v in m.items() if k not in ("sma50", "sma200")},
    }
    if note:
        e["catalyst"] = note
        if note.get("source"):
            e["sourceUrl"].append(note["source"])
    return e


def load_also_in():
    out = {}
    for path, label in ((GROWTH, "Growth"), (RISKIT, "Risk It")):
        try:
            d = json.load(open(path))
        except Exception:  # noqa: BLE001
            continue
        for p in (d.get("picks") or []):
            out.setdefault(p.get("ticker"), []).append(label)
        for p in (d.get("bench") or []):
            out.setdefault(p.get("ticker"), []).append(f"{label} bench")
    return out


def revisions_for(t, hist, today_vals):
    """Compare today's target / forward P/S with the oldest snapshot 25-35 days back (if any)."""
    days = sorted(d for d in hist.get("days", {}) if d < dt.date.today().isoformat())
    if not days:
        return None, None, None
    tgt = (dt.date.today() - dt.timedelta(days=30)).isoformat()
    cands = [d for d in days if d <= tgt and t in hist["days"][d]]
    if not cands:
        first = next((d for d in days if t in hist["days"][d]), None)
        return None, None, ({"since": first, "note": "under 30 days of history"} if first else None)
    d0 = cands[-1]
    pt0, psf0 = hist["days"][d0][t][0], hist["days"][d0][t][1]
    pt1, psf1 = today_vals
    ptc = (pt1 / pt0 - 1) * 100 if pt0 and pt1 else None
    # forward P/S moves with price; forward sales = price / forward P/S -> compare implied forward revenue per share
    rev = {"since": d0, "priceTargetChangePct": round(ptc, 1) if ptc is not None else None}
    met = ptc is not None and ptc > 2
    return met, f"Average target {pct(ptc, 1)} since {d0}", rev


_IND_CACHE = {}


def evaluate_ticker(t, spy=None, ind=None):
    """Score ONE ticker on the Early Inflection rubric/checklist, outside the daily screen.

    Used for Search deep dives (scripts/futura_grades.py) so tickers that are not in the screen's
    universe (e.g. LITE at ~$100B market cap) still get the same checklist and 0-100 score.
    Returns a dict ready to store as company["earlyInflection"]; raises on missing data.
    """
    t = t.upper()
    if ind is None:
        if "ind" not in _IND_CACHE:
            _IND_CACHE["ind"] = sa_industries()
        ind = _IND_CACHE["ind"]
    s = sa_stats(t)
    q = sa_quarterly(t)
    mcap = fnum(s.get("marketcap"))
    c = {"ticker": t, "name": t, "stats": s, "q": q, "mcap": mcap, "lastsale": None}
    slug = ind.get(t)
    if t in THEME_OVERRIDE:
        pts, why = THEME_OVERRIDE[t]
        c["theme"] = (pts, f"AI-infrastructure supplier ({why})" if pts >= 5 else f"Adjacent to AI infrastructure ({why})")
    elif slug in THEME_CORE:
        c["theme"] = (5, f"AI-infrastructure supplier industry ({THEME_CORE[slug]})")
    elif slug in THEME_ADJ:
        c["theme"] = (3, f"Adjacent to AI infrastructure ({THEME_ADJ[slug]})")
    else:
        c["theme"] = (0, "Not an AI-infrastructure supplier industry")
    c["m"] = fundamentals(c)
    m = c["m"]
    h = nasdaq_history(t)
    if spy is None:
        spy = nasdaq_history("SPY")
    spy1y, spy3m = chg_days(spy, 365), chg_days(spy, 91)
    if h:
        m["price"], m["priceDate"] = h[-1][1], h[-1][0].isoformat()
        yr = [x for d, x in h if d >= h[-1][0] - dt.timedelta(days=365)]
        m["offHigh"] = (h[-1][1] / max(yr) - 1) * 100
        m["ch1yNasdaq"] = chg_days(h, 365)
        c3 = chg_days(h, 91)
        m["rs3m"] = (c3 - spy3m) if c3 is not None and spy3m is not None else None
    try:
        aj = sa_acq_jump(t)
        m["acqJump"] = aj if isinstance(aj, float) else None
    except Exception:  # noqa: BLE001
        m["acqJump"] = None
    c["spy1y"] = spy1y
    sc, parts, drivers, penalty = score(c)
    c["revisionMet"], c["revisionDetail"] = None, "Revision history is only kept for screen candidates"
    why_out = []
    if mcap is not None and not (MCAP_MIN <= mcap <= MCAP_MAX):
        why_out.append(f"market cap {fmt_money(mcap)} is outside the screen's $1B-$30B range")
    if t in MINERS:
        why_out.append("bitcoin/crypto miner (excluded)")
    try:  # the screen also drops commodity producers by Nasdaq industry (COMMODITY_INDUSTRIES)
        if "uni" not in _IND_CACHE:
            _IND_CACHE["uni"] = {u["ticker"]: u.get("industry") for u in nasdaq_universe()[0]}
        nq_ind = _IND_CACHE["uni"].get(t)
        if nq_ind in COMMODITY_INDUSTRIES:
            why_out.append(f"commodity producer (Nasdaq industry: {nq_ind}), excluded from the screen")
    except Exception:  # noqa: BLE001
        pass
    rev_usd = mcap / fnum(s.get("ps")) if mcap and fnum(s.get("ps")) else None
    if rev_usd is not None and rev_usd < REV_MIN:
        why_out.append("TTM revenue under $100M")
    if int(fnum(s.get("analystCount")) or 0) < ANALYSTS_MIN:
        why_out.append("fewer than 3 analysts")
    if (m["yoy0"] or 0) <= 0 or (m["fwdRevGrowth"] or 0) < 8:
        why_out.append("fails the inflection gate (shrinking revenue or <8% forward growth)")
    return {
        "asOf": dt.date.today().isoformat(), "priceDate": m.get("priceDate"), "inScreen": False,
        "outsideScreenReason": "; ".join(why_out) or None,
        "score": sc, "scoreParts": {k: round(v, 1) for k, v in parts.items()}, "penalty": penalty,
        "checklist": checklist(c), "drivers": drivers, "risks": risks(c),
        "keyFigures": [
            {"label": "Latest Q rev", "value": pct(m["yoy0"])},
            {"label": "Gross margin Δ", "value": pct(m["gmChg"], 1).replace("%", " pts")},
            {"label": "Next-12m rev", "value": pct(m["fwdRevGrowth"])},
            {"label": "EV / fwd sales", "value": ("%.1fx" % m["evFwdSales"]) if m["evFwdSales"] else "n/a"},
            {"label": "1-yr move", "value": pct(m.get("ch1yNasdaq"))},
            {"label": "vs 52-wk high", "value": pct(m.get("offHigh"))},
        ],
        "eiMetrics": {k: (round(v, 2) if isinstance(v, float) else v) for k, v in m.items() if k not in ("sma50", "sma200")},
        "sourceUrl": [f"https://stockanalysis.com/stocks/{t.lower()}/statistics/", f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly",
                      f"https://www.nasdaq.com/market-activity/stocks/{t.lower()}/historical"],
    }


def main():
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    today = dt.date.today().isoformat()
    prev = {}
    if os.path.exists(OUT):
        try:
            prev = json.load(open(OUT))
        except Exception:  # noqa: BLE001
            prev = {}
    notes = prev.get("catalystNotes") or {}

    print("1/6 universe (Nasdaq screener)…")
    uni, total_rows = nasdaq_universe()
    excluded_miners = sorted({u["ticker"] for u in uni if u["ticker"] in MINERS})
    excluded_deals = sorted({u["ticker"] for u in uni if u["ticker"] in PENDING_DEALS})
    excluded_commodity = sorted({u["ticker"] for u in uni if u["industry"] in COMMODITY_INDUSTRIES})
    uni = [u for u in uni if u["ticker"] not in MINERS and u["ticker"] not in PENDING_DEALS and u["industry"] not in COMMODITY_INDUSTRIES]
    uni = [u for u in uni if (u["lastsale"] or 0) * (u["volume"] or 0) >= 1e6]  # rough liquidity pre-filter (1 day)
    uni.sort(key=lambda u: -u["mcap"])
    seen, dedup = set(), []
    for u in uni:  # one listing per company (dual share classes / tracking stocks)
        k = re.sub(r"\b(class|series)\s+[a-z]\b|common stock|ordinary shares|american depositary shares?|subordinate voting shares|[^a-z ]", " ", u["name"].lower())
        k = " ".join(k.split())
        if k in seen:
            continue
        seen.add(k)
        dedup.append(u)
    uni = dedup
    if limit:
        uni = uni[:limit]
    print(f"   {len(uni)} names after market-cap/sector/liquidity pre-filter (of {total_rows} listed)")
    ind = sa_industries()

    print("2/6 StockAnalysis statistics…")
    stats = pmap(sa_stats, [u["ticker"] for u in uni], "stats")
    cands = []
    for u in uni:
        s = stats.get(u["ticker"])
        if not isinstance(s, dict):
            continue
        ps = fnum(s.get("ps"))
        mcap = fnum(s.get("marketcap")) or u["mcap"]
        rev_usd = mcap / ps if ps else None
        nan = int(fnum(s.get("analystCount")) or 0)
        avgvol = fnum(s.get("averageVolume")) or 0
        if not (MCAP_MIN <= mcap <= MCAP_MAX) or rev_usd is None or rev_usd < REV_MIN or nan < ANALYSTS_MIN or fnum(s.get("priceTarget")) is None:
            continue
        if avgvol * (u["lastsale"] or 0) < DOLLAR_VOL_MIN:
            continue
        cands.append({**u, "stats": s})
    print(f"   {len(cands)} pass revenue/analyst/liquidity filters")

    print("3/6 quarterly financials…")
    qs = pmap(sa_quarterly, [c["ticker"] for c in cands], "financials")
    scored, gated = [], 0
    for c in cands:
        q = qs.get(c["ticker"])
        if not isinstance(q, dict) or len([x for x in q["rev"] if isinstance(x, float)]) < 6:
            continue
        c["q"] = q
        slug = ind.get(c["ticker"])
        if c["ticker"] in THEME_OVERRIDE:
            p, why = THEME_OVERRIDE[c["ticker"]]
            c["theme"] = (p, f"AI-infrastructure supplier ({why})" if p >= 5 else f"Adjacent to AI infrastructure ({why})")
        elif slug in THEME_CORE:
            c["theme"] = (5, f"AI-infrastructure supplier industry ({THEME_CORE[slug]})")
        elif slug in THEME_ADJ:
            c["theme"] = (3, f"Adjacent to AI infrastructure ({THEME_ADJ[slug]})")
        else:
            c["theme"] = (0, "Not an AI-infrastructure supplier industry")
        indname = THEME_CORE.get(slug) or THEME_ADJ.get(slug) or c["industry"] or "Other"
        c["industryKey"] = indname
        c["sectorLabel"] = f"{SLUG_SECTOR.get(slug) or c['sector'] or 'Other'} – {indname}"
        c["m"] = fundamentals(c)
        c["m"]["price"] = c["lastsale"]
        # inflection gate: revenue must be growing now and expected to keep growing
        if (c["m"]["yoy0"] or 0) <= 0 or (c["m"]["fwdRevGrowth"] or 0) < 8:
            gated += 1
            continue
        c["score"], c["parts"], c["drivers"], c["penalty"] = score(c)
        scored.append(c)
    scored.sort(key=lambda c: -c["score"])
    print(f"   {len(scored)} fully scored on fundamentals ({gated} dropped: shrinking revenue or <8% forward growth)")

    print("4/6 Nasdaq price history for the top candidates…")
    spy = nasdaq_history("SPY")
    spy1y, spy3m = chg_days(spy, 365), chg_days(spy, 91)
    top = scored[:PRE_N]
    hists = pmap(nasdaq_history, [c["ticker"] for c in top], "history")
    acqs = pmap(sa_acq_jump, [c["ticker"] for c in top], "balance sheets")
    flagged_deals = []
    final = []
    for c in top:
        h = hists.get(c["ticker"])
        if not isinstance(h, list) or len(h) < 60:
            continue
        m = c["m"]
        m["price"], m["priceDate"] = h[-1][1], h[-1][0].isoformat()
        yr = [x for d, x in h if d >= h[-1][0] - dt.timedelta(days=365)]
        m["offHigh"] = (h[-1][1] / max(yr) - 1) * 100
        m["ch1yNasdaq"] = chg_days(h, 365)
        c3 = chg_days(h, 91)
        m["rs3m"] = (c3 - spy3m) if c3 is not None and spy3m is not None else None
        # pending-deal heuristic: price pinned (annualized vol < 12% over 60 sessions and < 6% move in 3 months)
        rets = [h[i][1] / h[i - 1][1] - 1 for i in range(len(h) - 60, len(h))]
        mu = sum(rets) / len(rets)
        vol = (sum((r - mu) ** 2 for r in rets) / (len(rets) - 1)) ** 0.5 * (252 ** 0.5) * 100
        if vol < 12 and c3 is not None and abs(c3) < 6:
            flagged_deals.append(c["ticker"])
            continue
        aj = acqs.get(c["ticker"])
        m["acqJump"] = aj if isinstance(aj, float) else None
        c["spy1y"] = spy1y
        c["score"], c["parts"], c["drivers"], c["penalty"] = score(c)
        final.append(c)
    final.sort(key=lambda c: (-c["score"], -(c["m"]["yoy0"] or 0)))

    # history / revisions
    hist = {"schemaVersion": 1, "fields": ["priceTarget", "psForward", "forwardPE"], "days": {}}
    if os.path.exists(HIST):
        try:
            hist = json.load(open(HIST))
        except Exception:  # noqa: BLE001
            pass
    for c in final:
        met, detail, rev = revisions_for(c["ticker"], hist, (c["m"]["pt"], c["m"]["psForward"]))
        c["revisionMet"], c["revisionDetail"], c["revisions"] = met, detail, rev
        c["checklist"] = checklist(c)

    print("5/6 ranking…")
    also_in = load_also_in()
    per_ind, chosen = {}, []
    for c in final:
        k = c["industryKey"]
        if per_ind.get(k, 0) >= MAX_PER_INDUSTRY:
            continue
        per_ind[k] = per_ind.get(k, 0) + 1
        chosen.append(c)
        if len(chosen) >= PICKS_N + BENCH_N:
            break
    picks = [build_entry(c, also_in, notes, spy1y) for c in chosen[:PICKS_N]]
    bench = [dict(build_entry(c, also_in, notes, spy1y), rank=i + 1) for i, c in enumerate(chosen[PICKS_N:])]
    price_date = max((p["priceDate"] for p in picks if p.get("priceDate")), default=None)

    snap = {}
    for c in (chosen + [x for x in scored if x not in chosen])[:max(HISTORY_N, len(chosen))]:
        m = c["m"]
        snap[c["ticker"]] = [m["pt"], m["psForward"], m["fpe"]]
    hist["days"][today] = snap
    hist["lastUpdated"] = today
    with open(HIST, "w") as f:
        json.dump(hist, f, separators=(",", ":"))
        f.write("\n")

    data = {
        "schemaVersion": 1,
        "lastUpdated": today,
        "priceDate": price_date,
        "title": "Early Inflection",
        "method": ("Looks for stocks in an 'early LITE-2025' position: revenue that has bottomed and is accelerating, rising margins, strong "
                   f"forward growth and a reasonable price, before the stock has already run. Universe: every US-listed stock with a $1B–$30B market "
                   f"cap on Nasdaq's screener (excluding banks, insurers, REITs and other financials), then 3+ analysts with a price target, $100M+ "
                   f"TTM revenue and $5M+ a day of trading, with revenue growing in the latest quarter and 8%+ implied growth over the next 12 months. Each survivor is scored 0–100 on the rubric below; the top {PICKS_N} are the picks and the "
                   f"next {len(bench)} form the ranked bench, with at most {MAX_PER_INDUSTRY} per industry. Excludes bitcoin/crypto miners, other "
                   "commodity producers (metal, coal and lithium miners, oil & gas producers, refiners, smelters, fertilizer makers: their revenue "
                   "tracks commodity prices) and pending-merger targets. Revenue points are halved when growth looks bought (a big jump in "
                   "goodwill/intangibles or share count)."),
        "pattern": PATTERN,
        "rubric": RUBRIC,
        "dataNotes": (f"Prices are Nasdaq closes ({price_date}). Quarterly revenue and margins come from StockAnalysis income statements "
                      "(S&P Global Market Intelligence); forward P/E, P/S, forward P/S, EV/sales, EPS growth forecast, 50/200-day averages, "
                      "consensus rating, analyst count and average target come from StockAnalysis statistics pages. Next-12-month revenue growth "
                      "is implied as P/S ÷ forward P/S. Beat-and-raise history is not scored automatically. Analyst target and forward P/S are "
                      "saved daily (data/early-inflection-history.json), so 30-day revisions show up from early November 2026. "
                      f"This run: {len(uni)} names screened, {len(cands)} passed the filters, {len(scored)} scored on fundamentals, "
                      f"top {len(top)} checked against price history. 'n/a' means not available."),
        "universe": {"listed": total_rows, "screened": len(uni), "passedFilters": len(cands), "scored": len(scored), "priceChecked": len(top)},
        "excluded": {"miners": excluded_miners, "commodityProducers": len(excluded_commodity), "pendingDeals": [{"ticker": t, "reason": PENDING_DEALS[t]} for t in excluded_deals],
                     "pricePinnedPossibleDeal": flagged_deals},
        "spy": {"chg1yPct": round(spy1y, 2) if spy1y is not None else None, "chg3mPct": round(spy3m, 2) if spy3m is not None else None},
        "disclaimer": ("Early-stage ideas for research only. Inflections can fail, cyclical recoveries can reverse, and most stocks that "
                       "pass this screen will not become the next LITE. Not financial advice."),
        "catalystNotes": notes,
        "picks": picks,
        "bench": bench,
    }
    # keep letter grades from the previous run until futura_grades.py recomputes them
    old = {e.get("ticker"): e for e in (prev.get("picks") or []) + (prev.get("bench") or [])}
    for e in picks + bench:
        o = old.get(e["ticker"])
        if o and o.get("grades"):
            e["grades"], e["gradeInputs"] = o["grades"], o.get("gradeInputs", {})
            if o.get("metrics"):
                e["metrics"] = o["metrics"]
    if prev.get("grading"):
        data["grading"] = prev["grading"]
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("6/6 wrote", OUT)
    for i, e in enumerate(picks + bench, 1):
        print(f"{i:2d} {'PICK ' if i <= PICKS_N else 'bench'} {e['ticker']:6s} {e['score']:3d}  {e['sector']}  {e['alsoIn']}")


if __name__ == "__main__":
    main()
