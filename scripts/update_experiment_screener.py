#!/usr/bin/env python3
"""Experiment Screener -> data/experiment-screener.json

The user's eight rules, applied strictly (no loosening). A stock is a pick only if it passes ALL of them:
  1. ROIC > 15%                          StockAnalysis statistics "roic" (TTM return on invested capital)
  2. Operating cash flow > 30% of total debt   TTM operating cash flow ("ncfo") / total debt ("debt"); zero debt passes
  3. Free cash flow / total assets > 10%  TTM free cash flow ("fcf") / total assets on the latest quarterly balance sheet
  4. QoQ EPS growth > 20%                 latest-quarter diluted EPS vs the immediately prior quarter (sequential).
                                          If the prior quarter's EPS is zero or negative, growth is not meaningful and the rule FAILS.
                                          YoY quarterly EPS growth (vs the same quarter a year earlier) is shown as context only.
  5. Annual revenue growth > 15%          TTM revenue (last 4 quarters) vs the 4 quarters before
  6. Price > 150-day and 200-day SMA      computed from Nasdaq daily closes
  7. RSI(14) between 50 and 65            Wilder's RSI on Nasdaq daily closes
  8. Market cap > $2B                     StockAnalysis market cap (Nasdaq screener cap as fallback)
Bitcoin/crypto miners are excluded (standing preference).

Universe: every US-listed common stock on Nasdaq's public screener with a market cap over $2B.
For speed, the per-stock financial statements and price history are only fetched for names that can still
pass or miss by one rule after the statistics-page rules (1, 2, 8) are checked; that only skips stocks that
already fail two or more rules, so it never changes who passes or who is a near miss.

Score (0-100, ranking only, transparent): five fundamental rules worth 20 points each, scaled linearly from the
threshold (0) to a cap (20): ROIC 15%->45%, OCF/debt 30%->150% (no debt = 20), FCF/assets 10%->25%,
QoQ EPS 20%->80%, revenue growth 15%->45%. The technical rules are pass/fail gates.

Usage: python3 scripts/update_experiment_screener.py [--limit N]
Then python3 scripts/futura_grades.py and python3 scripts/update_track_record.py.
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import update_early_inflection as ei  # shared fetch helpers (stdlib only)

ROOT = ei.ROOT
OUT = os.path.join(ROOT, "data", "experiment-screener.json")
MCAP_MIN = 2e9
PICKS_N = 12
NEAR_N = 25
RULES = [
    ("roic", "ROIC > 15%"),
    ("ocfDebt", "Operating cash flow > 30% of total debt"),
    ("fcfAssets", "Free cash flow / total assets > 10%"),
    ("epsQoQ", "QoQ EPS growth > 20%"),
    ("revGrowth", "Annual revenue growth > 15%"),
    ("stage2", "Price above 150-day and 200-day averages"),
    ("rsi", "RSI(14) between 50 and 65"),
    ("mcap", "Market cap > $2B"),
]
CAPS = {"roic": (15, 45), "ocfDebt": (30, 150), "fcfAssets": (10, 25), "epsQoQ": (20, 80), "revGrowth": (15, 45)}


def rsi14(closes):
    if len(closes) < 30:
        return None
    d = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    g = sum(max(x, 0) for x in d[:14]) / 14
    l = sum(max(-x, 0) for x in d[:14]) / 14
    for x in d[14:]:
        g = (g * 13 + max(x, 0)) / 14
        l = (l * 13 + max(-x, 0)) / 14
    return 100.0 if l == 0 else 100 - 100 / (1 + g / l)


def sma(closes, n):
    return sum(closes[-n:]) / n if len(closes) >= n else None


def detail(t):
    q = ei.get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly")
    b = ei.get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/balance-sheet/?p=quarterly")
    h = ei.nasdaq_history(t, days=480)
    cur = ei.re.search(r'details:\{source:"[^"]*",currency:"([A-Z]{3})"', q)
    return {"dates": ei._arr(q, "datekey"), "rev": ei._arr(q, "revenue"), "eps": ei._arr(q, "epsdil"),
            "assets": ei._arr(b, "assets"), "hist": h, "currency": cur.group(1) if cur else None}


def f(x):
    return x if isinstance(x, float) else None


def main():
    limit = None
    for a in sys.argv[1:]:
        if a.startswith("--limit"):
            limit = int(a.split("=", 1)[1]) if "=" in a else int(sys.argv[sys.argv.index(a) + 1])
    today = dt.date.today().isoformat()
    print("1/4 Nasdaq universe…")
    d = json.loads(ei.get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", accept="application/json", timeout=90))
    rows = d["data"]["rows"]
    uni, seen, miners = [], set(), []
    for r in rows:
        sym = (r.get("symbol") or "").strip().upper()
        mcap = ei.fnum(r.get("marketCap"))
        name = r.get("name") or ""
        if not sym or not ei.re.fullmatch(r"[A-Z]{1,5}", sym) or mcap is None or mcap <= MCAP_MIN:
            continue
        if ei.re.search(r"\b(warrant|right|unit|preferred|depositary shares? representing|notes due)\b", name, ei.re.I):
            continue
        if sym in ei.MINERS:
            miners.append(sym)
            continue
        k = " ".join(ei.re.sub(r"\b(class|series)\s+[a-z]\b|common stock|capital stock|ordinary shares|american depositary shares?|[^a-z ]", " ", name.lower()).split())
        if k in seen:
            continue
        seen.add(k)
        uni.append({"ticker": sym, "name": name, "sector": r.get("sector") or "", "industry": r.get("industry") or "", "mcap": mcap})
    if limit:
        uni = uni[:limit]
    print(f"   {len(uni)} US-listed stocks over $2B (of {len(rows)} listed); miners excluded: {miners}")

    print("2/4 StockAnalysis statistics…")
    import futura_cache
    stats = futura_cache.stats_for([u["ticker"] for u in uni])
    pre = []
    nostats = 0
    for u in uni:
        s = stats.get(u["ticker"])
        if not isinstance(s, dict):
            nostats += 1
            continue
        m = {}
        m["mcap"] = ei.fnum(s.get("marketcap")) or u["mcap"]
        m["roic"] = ei.fnum(s.get("roic"))
        ocf, debt = ei.fnum(s.get("ncfo")), ei.fnum(s.get("debt"))
        m["ocf"], m["debt"], m["fcf"] = ocf, debt, ei.fnum(s.get("fcf"))
        if ocf is None:
            m["ocfDebt"] = None
        elif not debt:  # zero debt, or no debt line on the statistics page = no debt -> passes
            m["ocfDebt"] = float("inf") if ocf > 0 else ocf
        else:
            m["ocfDebt"] = ocf / debt * 100
        m["stats"] = s
        fails = sum([m["roic"] is None or m["roic"] <= 15, m["ocfDebt"] is None or m["ocfDebt"] <= 30, m["mcap"] <= MCAP_MIN,
                     m["fcf"] is None or m["fcf"] <= 0])
        if fails <= 1:
            pre.append({**u, "m": m})
    print(f"   {len(pre)} can still pass or miss by one rule ({nostats} had no statistics page)")

    print("3/4 quarterly statements, balance sheets and Nasdaq closes…")
    det = ei.pmap(detail, [c["ticker"] for c in pre], "details")
    spy = ei.nasdaq_history("SPY", days=480)
    price_date = spy[-1][0].isoformat() if spy else None
    evald = []
    for c in pre:
        x = det.get(c["ticker"])
        if not isinstance(x, dict):
            continue
        m = c["m"]
        rev, eps, assets = [f(v) for v in x["rev"]], [f(v) for v in x["eps"]], [f(v) for v in x["assets"]]
        m["currency"] = x["currency"]
        m["lastQ"] = x["dates"][0] if x["dates"] else None
        m["assets"] = assets[0] if assets else None
        # statements of foreign filers are in their reporting currency; statistics (FCF) are in USD.
        # Convert assets with the implied FX rate = USD TTM revenue (statistics) / local TTM revenue (statements).
        if m["assets"] and m["currency"] and m["currency"] != "USD":
            rusd, rloc = ei.fnum(m["stats"].get("revenue")), (sum(rev[0:4]) if None not in rev[0:4] and len(rev) >= 4 else None)
            m["assets"] = m["assets"] * rusd / rloc if rusd and rloc else None
        m["fcfAssets"] = m["fcf"] / m["assets"] * 100 if m["fcf"] is not None and m["assets"] else None
        e0, e1 = (eps + [None, None])[:2]
        m["eps0"], m["eps1"] = e0, e1
        m["eps4"] = eps[4] if len(eps) > 4 else None
        m["epsQoQ"] = (e0 / e1 - 1) * 100 if e0 is not None and e1 is not None and e1 > 0 else None
        m["epsYoYq"] = (e0 / m["eps4"] - 1) * 100 if e0 is not None and m["eps4"] and m["eps4"] > 0 else None
        ttm, prev = rev[0:4], rev[4:8]
        m["revGrowth"] = (sum(ttm) / sum(prev) - 1) * 100 if len(prev) == 4 and None not in ttm + prev and sum(prev) > 0 else None
        h = x["hist"] or []
        closes = [p for _, p in h]
        m["price"] = closes[-1] if closes else None
        m["priceDate"] = h[-1][0].isoformat() if h else None
        m["sma150"], m["sma200"] = sma(closes, 150), sma(closes, 200)
        m["rsi"] = rsi14(closes[-300:]) if closes else None
        res = {
            "roic": m["roic"] is not None and m["roic"] > 15,
            "ocfDebt": m["ocfDebt"] is not None and m["ocfDebt"] > 30,
            "fcfAssets": m["fcfAssets"] is not None and m["fcfAssets"] > 10,
            "epsQoQ": m["epsQoQ"] is not None and m["epsQoQ"] > 20,
            "revGrowth": m["revGrowth"] is not None and m["revGrowth"] > 15,
            "stage2": bool(m["price"] and m["sma150"] and m["sma200"] and m["price"] > m["sma150"] and m["price"] > m["sma200"]),
            "rsi": m["rsi"] is not None and 50 <= m["rsi"] <= 65,
            "mcap": m["mcap"] > MCAP_MIN,
        }
        c["res"] = res
        c["fails"] = [k for k, ok in res.items() if not ok]
        pts = {}
        for k, (lo, hi) in CAPS.items():
            v = m.get(k)
            pts[k] = 20.0 if v == float("inf") else (0.0 if v is None else ei.clamp((v - lo) / (hi - lo)) * 20)
        c["parts"] = {k: round(v, 1) for k, v in pts.items()}
        c["score"] = round(sum(pts.values()))
        evald.append(c)
    passers = sorted([c for c in evald if not c["fails"]], key=lambda c: -c["score"])
    near = sorted([c for c in evald if len(c["fails"]) == 1], key=lambda c: (c["fails"][0], -c["score"]))
    print(f"   {len(passers)} pass all 8; {len(near)} miss exactly one")

    print("4/4 writing…")
    also = ei.load_also_in()
    try:
        ed = json.load(open(os.path.join(ROOT, "data", "early-inflection.json")))
        for p in ed.get("picks") or []:
            also.setdefault(p["ticker"], []).append("Early Inflection")
    except Exception:  # noqa: BLE001
        pass

    def fv(k, m):
        v = m.get(k)
        if k == "ocfDebt":
            return "no debt" if v == float("inf") else ei.pct(v, 0, False)
        if k in ("roic", "fcfAssets", "revGrowth"):
            return ei.pct(v, 1, False)
        if k == "epsQoQ":
            if v is None:
                return f"n/a (EPS {m['eps1']} → {m['eps0']})" if m.get("eps1") is not None and m["eps1"] <= 0 else "n/a"
            return ei.pct(v, 0)
        if k == "rsi":
            return "n/a" if v is None else f"{v:.1f}"
        if k == "mcap":
            return ei.fmt_money(v)
        return ""

    def check(c):
        m, out = c["m"], []
        dets = {
            "roic": f"ROIC {fv('roic', m)} (TTM) vs > 15%",
            "ocfDebt": (f"Operating cash flow {ei.fmt_money(m['ocf'])} vs total debt {ei.fmt_money(m['debt']) if m['debt'] else '$0'}: "
                        f"{fv('ocfDebt', m)} vs > 30%"),
            "fcfAssets": f"FCF {ei.fmt_money(m['fcf'])} (TTM) / total assets {ei.fmt_money(m.get('assets'))} = {fv('fcfAssets', m)} vs > 10%",
            "epsQoQ": (f"Diluted EPS {m.get('eps0')} (latest quarter, {m.get('lastQ')}) vs {m.get('eps1')} prior quarter: {fv('epsQoQ', m)} vs > 20%"
                       f"; YoY same quarter {ei.pct(m.get('epsYoYq'), 0)} (context)"),
            "revGrowth": f"TTM revenue {fv('revGrowth', m)} YoY vs > 15%",
            "stage2": (f"Price {m['price']:.2f} vs 150-day {m['sma150']:.2f} and 200-day {m['sma200']:.2f}" if m.get("price") and m.get("sma150") and m.get("sma200") else "Price history too short (n/a)"),
            "rsi": f"RSI(14) {fv('rsi', m)} vs 50–65",
            "mcap": f"Market cap {fv('mcap', m)} vs > $2B",
        }
        for k, label in RULES:
            out.append({"key": k, "label": label, "met": c["res"][k], "detail": dets[k]})
        return out

    def entry(c):
        m, s, t = c["m"], c["m"]["stats"], c["ticker"]
        pt = ei.fnum(s.get("priceTarget"))
        risks = []
        if m["rsi"] and m["rsi"] > 62:
            risks.append(f"RSI {m['rsi']:.0f}, near the top of the 50–65 band")
        if m.get("epsYoYq") is not None and m["epsYoYq"] < 0:
            risks.append(f"EPS is up on the prior quarter but down {abs(m['epsYoYq']):.0f}% vs the same quarter a year ago (possible seasonality)")
        fpe = ei.fnum(s.get("peForward"))
        if fpe and fpe > 40:
            risks.append(f"Rich forward P/E ({fpe:.0f})")
        if m["currency"] and m["currency"] != "USD":
            risks.append(f"Financials reported in {m['currency']}")
        sh = ei.fnum(s.get("shortFloat"))
        if sh and sh > 10:
            risks.append(f"Short interest {sh:.0f}% of float")
        return {
            "company": ei.clean_name(c["name"]), "ticker": t, "sector": " – ".join(x for x in (c["sector"], c["industry"]) if x) or "n/a",
            "price": round(m["price"], 2) if m.get("price") else None, "priceDate": m.get("priceDate"),
            "marketCap": ei.fmt_money(m["mcap"]), "forwardPE": round(fpe, 2) if fpe else "n/a",
            "peg": round(ei.fnum(s.get("pegRatio")), 2) if ei.fnum(s.get("pegRatio")) else "n/a",
            "revenueGrowth": f"{ei.pct(m['revGrowth'], 1)} YoY (TTM)" if m["revGrowth"] is not None else "n/a",
            "score": c["score"], "scoreParts": c["parts"], "alsoIn": also.get(t, []),
            "failed": [dict(RULES)[k] for k in c["fails"]],
            "checklist": check(c),
            "keyFigures": [{"label": "ROIC", "value": fv("roic", m)}, {"label": "OCF / debt", "value": fv("ocfDebt", m)},
                           {"label": "FCF / assets", "value": fv("fcfAssets", m)}, {"label": "EPS QoQ", "value": fv("epsQoQ", m)},
                           {"label": "RSI(14)", "value": fv("rsi", m)}, {"label": "EPS YoY (Q)", "value": ei.pct(m.get("epsYoYq"), 0)}],
            "drivers": [f"{dict(RULES)[k]}: {fv(k, m)} → {c['parts'][k]:.0f}/20" for k in CAPS],
            "risks": risks or ["No data-driven red flags; check the latest earnings report"],
            "analystRating": f"{s.get('analystRatings') or 'n/a'} ({int(ei.fnum(s.get('analystCount')) or 0)} analysts)", "priceTarget": pt,
            "sourceUrl": [f"https://stockanalysis.com/stocks/{t.lower()}/statistics/", f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly"],
            "screenMetrics": {k: (None if v == float("inf") else round(v, 3) if isinstance(v, float) else v) for k, v in m.items() if k != "stats"},
        }

    picks = [entry(c) for c in passers[:PICKS_N]]
    bench = [dict(entry(c), rank=i + 1) for i, c in enumerate(passers[PICKS_N:])]
    nm = [entry(c) for c in near]
    by_rule = {}
    for c in near:
        by_rule[dict(RULES)[c["fails"][0]]] = by_rule.get(dict(RULES)[c["fails"][0]], 0) + 1
    data = {
        "schemaVersion": 1, "lastUpdated": today, "priceDate": price_date, "title": "Experiment Screener",
        "method": ("Your eight rules, applied strictly to every US-listed stock over $2B on Nasdaq's screener (bitcoin/crypto miners excluded). "
                   "A stock is a pick only if it passes all eight. Passers are ranked by a simple 0–100 score; stocks that miss exactly one rule are listed "
                   "below as near misses with the rule they missed. Nothing is loosened: if few stocks pass, few are shown."),
        "rubric": [{"component": "ROIC", "points": 20, "how": "0 at 15%, full at 45%+"},
                   {"component": "Operating cash flow / debt", "points": 20, "how": "0 at 30%, full at 150%+ (no debt = full)"},
                   {"component": "FCF / total assets", "points": 20, "how": "0 at 10%, full at 25%+"},
                   {"component": "QoQ EPS growth", "points": 20, "how": "0 at 20%, full at 80%+"},
                   {"component": "Annual revenue growth", "points": 20, "how": "0 at 15%, full at 45%+"},
                   {"component": "Technical rules", "points": 0, "how": "Stage 2 (price above 150- and 200-day averages), RSI 50–65 and market cap over $2B are pass/fail gates, not scored"}],
        "definitions": [
            "ROIC: trailing-12-month return on invested capital from StockAnalysis.",
            "Operating cash flow / total debt: TTM operating cash flow ÷ total debt (incl. leases) from StockAnalysis; companies with no debt pass.",
            "FCF / total assets: TTM free cash flow (operating cash flow minus capex) ÷ total assets on the latest quarterly balance sheet.",
            "QoQ EPS growth: latest quarter's diluted EPS vs the immediately preceding quarter. If that prior quarter's EPS was zero or negative, growth isn't meaningful and the rule fails. Year-over-year growth for the same quarter is shown for context only (it isn't a rule), since sequential EPS can be seasonal.",
            "Annual revenue growth: last four quarters' revenue vs the four before (TTM YoY).",
            "Stage 2: latest Nasdaq close above both its 150-day and 200-day simple moving averages.",
            "RSI(14): Wilder's 14-day RSI on Nasdaq daily closes, inclusive 50–65.",
            "Market cap: StockAnalysis, over $2B.",
        ],
        "dataNotes": (f"Prices and moving averages/RSI from Nasdaq daily closes ({price_date}). Fundamentals from StockAnalysis statistics pages, quarterly income statements and balance sheets. "
                      f"This run: {len(uni)} stocks over $2B screened, {len(evald)} checked against all eight rules (the rest already failed two or more of ROIC, OCF/debt or positive FCF), "
                      f"{len(passers)} passed everything, {len(near)} missed exactly one. 'n/a' means the data wasn't available, which counts as a miss."),
        "universe": {"listed": len(rows), "screened": len(uni), "fullyChecked": len(evald), "passed": len(passers), "nearMisses": len(near), "noStatistics": nostats},
        "nearMissesByRule": by_rule,
        "excluded": {"miners": miners},
        "disclaimer": "An experiment with your own rules, for research only. Strict multi-factor screens can be tiny or empty some days. Not financial advice.",
        "picks": picks, "bench": bench, "nearMisses": nm,
    }
    try:
        prev = json.load(open(OUT))
        old = {e.get("ticker"): e for e in (prev.get("picks") or []) + (prev.get("bench") or [])}
        for e in picks + bench:
            o = old.get(e["ticker"])
            if o and o.get("grades"):
                e["grades"], e["gradeInputs"] = o["grades"], o.get("gradeInputs", {})
        if prev.get("grading"):
            data["grading"] = prev["grading"]
    except Exception:  # noqa: BLE001
        pass
    with open(OUT, "w") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("wrote", OUT)
    for e in picks + bench:
        print("PASS", e["ticker"], e["score"], [k["value"] for k in e["keyFigures"]], e["revenueGrowth"])
    for e in nm:
        print("NEAR", e["ticker"], e["failed"], [k["value"] for k in e["keyFigures"]], e["revenueGrowth"])


if __name__ == "__main__":
    main()
