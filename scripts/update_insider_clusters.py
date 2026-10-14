#!/usr/bin/env python3
"""Insider Buys tab -> data/insider-clusters.json

Insider cluster buys from SEC EDGAR Form 4 filings.
Source: EDGAR daily form indexes for the last 30 calendar days. Every Form 4 / 4/A for issuers
in the Nasdaq screener over $300M is fetched once (parsed result cached in ~/.cache/futura/form4.json)
and its nonDerivativeTransaction rows with transaction code P (open-market or private purchase) are kept.
A company is flagged when, inside the window, 3+ distinct insiders bought, total purchase value
(shares x price as filed) is above $250K, and market cap is above $300M.
Bitcoin miners and crypto-treasury companies are excluded (MINERS / CRYPTO_TREASURY in update_early_inflection.py).
Ranked by number of insiders, then total dollars. Up to 12 picks; the rest form the bench.
SEC fair-access: declared User-Agent with contact email, <= 10 requests/second.
Usage: python3 scripts/update_insider_clusters.py [--days=30]
"""
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import update_early_inflection as ei
import futura_cache
import futura_universe as fu


def usd(v):
    return f"${v/1e6:.1f}M" if v >= 1e6 else f"${v/1e3:,.0f}K"

OUT = os.path.join(ei.ROOT, "data", "insider-clusters.json")
CACHE = os.path.expanduser("~/.cache/futura/form4.json")
SEC_UA = "Futura personal research burkemorin@gmail.com"
PICKS_N, MIN_INSIDERS, MIN_DOLLARS, MIN_CAP = 12, 3, 250_000, 300e6
_lock, _last = threading.Lock(), [0.0]


def sec_get(url, tries=4, allow_missing=False):
    for i in range(tries):
        with _lock:
            w = _last[0] + 0.1 - time.time()
            if w > 0:
                time.sleep(w)
            _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": SEC_UA, "Accept-Encoding": "identity"})
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 404) and allow_missing:
                return None
            if e.code == 404:
                return None
            time.sleep(2 * (i + 1))
        except Exception:  # noqa: BLE001
            time.sleep(2 * (i + 1))
    if allow_missing:
        return None
    raise RuntimeError(f"SEC fetch failed: {url}")


def company_tickers():
    return json.loads(sec_get("https://www.sec.gov/files/company_tickers.json"))


def daily_filings(day, cik_set):
    q = (day.month - 1) // 3 + 1
    txt = sec_get(
        f"https://www.sec.gov/Archives/edgar/daily-index/{day.year}/QTR{q}/form.{day:%Y%m%d}.idx",
        allow_missing=True,
    )
    if not txt:
        return []
    out = []
    for line in txt.splitlines():
        if not (line.startswith("4 ") or line.startswith("4/A ")):
            continue
        m = re.search(r"\s(\d{5,10})\s+\d{8}\s+(edgar/data/\S+\.txt)", line)
        if not m:
            continue
        cik = m.group(1)
        if cik in cik_set or cik.lstrip("0") in cik_set or cik.zfill(10) in cik_set:
            out.append(m.group(2))
    return out


def T(el, path):
    x = el.find(path)
    return (x.text or "").strip() if x is not None and x.text else ""


def parse(path):
    txt = sec_get("https://www.sec.gov/Archives/" + path, allow_missing=True)
    if not txt:
        return {"buys": []}
    m = re.search(r"<ownershipDocument>.*?</ownershipDocument>", txt, re.S)
    if not m:
        return {"buys": []}
    root = ET.fromstring(m.group(0))
    owners = []
    for o in root.findall("reportingOwner"):
        rel = o.find("reportingOwnerRelationship")
        roles = []
        if rel is not None:
            if T(rel, "isDirector") in ("1", "true"):
                roles.append("Director")
            if T(rel, "isOfficer") in ("1", "true"):
                roles.append(T(rel, "officerTitle") or "Officer")
            if T(rel, "isTenPercentOwner") in ("1", "true"):
                roles.append("10% owner")
            if T(rel, "isOther") in ("1", "true"):
                roles.append(T(rel, "otherText") or "Other")
        owners.append({
            "cik": T(o, "reportingOwnerId/rptOwnerCik"),
            "name": T(o, "reportingOwnerId/rptOwnerName"),
            "role": ", ".join(roles),
        })
    buys = []
    for t in root.findall("nonDerivativeTable/nonDerivativeTransaction"):
        if T(t, "transactionCoding/transactionCode") != "P":
            continue
        if T(t, "transactionAmounts/transactionAcquiredDisposedCode/value") != "A":
            continue
        try:
            sh = float(T(t, "transactionAmounts/transactionShares/value"))
            px = float(T(t, "transactionAmounts/transactionPricePerShare/value") or 0)
        except ValueError:
            continue
        buys.append({"date": T(t, "transactionDate/value")[:10], "shares": sh, "price": px})
    return {
        "issuerCik": T(root, "issuer/issuerCik"),
        "issuerName": T(root, "issuer/issuerName"),
        "symbol": T(root, "issuer/issuerTradingSymbol").upper().replace(".", "-"),
        "owners": owners,
        "buys": buys,
        "accession": path.rsplit("/", 1)[-1][:-4],
        "amend": T(root, "documentType") == "4/A",
    }


def main():
    days = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--days=")), 30)
    today = dt.date.today()
    start = today - dt.timedelta(days=days)

    uni, listed, miners = fu.universe(MIN_CAP)
    U = {u["ticker"]: u for u in uni}
    cmap = company_tickers()
    cik_set = set()
    cik2t = {}
    for v in cmap.values():
        t = v["ticker"].upper()
        if t in U:
            s = str(v["cik_str"])
            cik_set |= {s, s.lstrip("0"), s.zfill(10)}
            cik2t[s] = cik2t[s.zfill(10)] = cik2t[s.lstrip("0") or "0"] = t
    print(f"universe {len(U)} stocks over ${MIN_CAP/1e6:.0f}M; {len(cik2t)//3} with SEC CIKs", flush=True)

    paths, d = [], start
    while d <= today:
        if d.weekday() < 5:
            got = daily_filings(d, cik_set)
            print(f"  {d}: {len(got)} Form 4s in universe", flush=True)
            paths += got
        d += dt.timedelta(days=1)
    paths = sorted(set(paths))
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    need = [p for p in paths if p not in cache]
    print(f"{len(paths)} Form 4 filings to cover, {len(need)} to fetch", flush=True)

    def one(p):
        try:
            return p, parse(p)
        except Exception as e:  # noqa: BLE001
            return p, e

    with cf.ThreadPoolExecutor(10) as ex:
        for i, fut in enumerate(cf.as_completed([ex.submit(one, p) for p in need]), 1):
            p, r = fut.result()
            if isinstance(r, Exception):
                print("  skip", p, r, flush=True)
            else:
                cache[p] = r
            if i % 250 == 0 or i == len(need):
                print(f"  form4: {i}/{len(need)}", flush=True)
                json.dump(cache, open(CACHE, "w"))
    if need:
        json.dump(cache, open(CACHE, "w"))

    co, seen, seen_by, seen_who = {}, set(), {}, {}
    for p in paths:
        f = cache.get(p)
        if not isinstance(f, dict) or not f.get("buys"):
            continue
        sym = (f.get("symbol") or "").upper()
        if not sym or sym not in U:
            # fall back to CIK map when the Form 4 symbol is blank / odd share class
            sym = cik2t.get(f.get("issuerCik", ""), "")
            if sym not in U:
                continue
        for b in f["buys"]:
            if not b["date"] or b["date"] < start.isoformat() or b["date"] > today.isoformat():
                continue
            for o in f["owners"][:1]:
                # same trade (date, shares, price) filed separately by members of one holder group
                # (fund + its partner, joint 10% owners) is one purchase, counted once for the first filer
                key = (f["issuerCik"], b["date"], round(b["shares"], 4), round(b["price"], 4))
                if key in seen and not (b["shares"] < 5000 and seen_by.get(key) != o["cik"]):
                    continue
                if key in seen and o["cik"] in seen_who.get(key, set()):
                    continue
                seen.add(key)
                seen_by.setdefault(key, o["cik"])
                seen_who.setdefault(key, set()).add(o["cik"])
                c = co.setdefault(sym, {"name": f["issuerName"], "cik": f["issuerCik"], "ins": {}, "tx": []})
                v = b["shares"] * b["price"]
                i = c["ins"].setdefault(o["cik"], {"name": o["name"], "role": o["role"], "dollars": 0.0, "shares": 0.0, "dates": set()})
                i["dollars"] += v
                i["shares"] += b["shares"]
                i["dates"].add(b["date"])
                c["tx"].append({
                    "insider": o["name"], "date": b["date"], "shares": b["shares"],
                    "price": b["price"], "value": v, "accession": f["accession"],
                })

    cand = {
        s: c for s, c in co.items()
        if len(c["ins"]) >= MIN_INSIDERS and sum(i["dollars"] for i in c["ins"].values()) > MIN_DOLLARS
    }
    print(f"{len(co)} companies with insider purchases; {len(cand)} with {MIN_INSIDERS}+ insiders and > $250K")

    excl, keep = [], []
    for s, c in cand.items():
        if s in ei.MINERS or s in ei.CRYPTO_TREASURY:
            excl.append(s)
            continue
        keep.append((s, c))
    keep.sort(key=lambda x: (-len(x[1]["ins"]), -sum(i["dollars"] for i in x[1]["ins"].values())))
    stats = futura_cache.stats_for([s for s, _ in keep])
    also = fu.also_in()

    def entry(s, c):
        u, st = U[s], stats.get(s) or {}
        h = ei.nasdaq_history(s, days=10)
        tot = sum(i["dollars"] for i in c["ins"].values())
        dates = sorted({x["date"] for x in c["tx"]})
        ins = sorted(c["ins"].values(), key=lambda i: -i["dollars"])
        pt = ei.fnum(st.get("priceTarget"))
        sh_tot = sum(i["shares"] for i in ins)
        avg = tot / sh_tot if sh_tot else None
        risks = []
        roles = " ".join(i["role"] for i in ins)
        if "Officer" not in roles and not re.search(r"chief|ceo|cfo|president|officer|coo", roles, re.I):
            risks.append("Buyers are directors or large holders only, no executive officers")
        top = ins[0]["dollars"] / tot if tot else 0
        if top > 0.8:
            risks.append(f"One insider ({ins[0]['name']}) accounts for {top*100:.0f}% of the dollars")
        if (ei.fnum(st.get("ch1y")) or 0) < -30:
            risks.append(f"Stock down {abs(ei.fnum(st.get('ch1y'))):.0f}% in a year: insiders may be buying a falling knife")
        return {
            "company": ei.clean_name(u["name"]), "ticker": s,
            "sector": " – ".join(x for x in (u["sector"], u["industry"]) if x) or "n/a",
            "price": round(h[-1][1], 2) if h else None,
            "priceDate": h[-1][0].isoformat() if h else None,
            "marketCap": ei.fmt_money(ei.fnum(st.get("marketcap")) or u["mcap"]),
            "forwardPE": round(ei.fnum(st.get("peForward")), 2) if ei.fnum(st.get("peForward")) else "n/a",
            "peg": round(ei.fnum(st.get("pegRatio")), 2) if ei.fnum(st.get("pegRatio")) else "n/a",
            "revenueGrowth": "n/a", "score": len(ins), "alsoIn": also.get(s, []),
            "insiderCount": len(ins), "totalBought": round(tot, 2),
            "firstBuy": dates[0], "lastBuy": dates[-1],
            "keyFigures": [
                {"label": "Insiders buying", "value": str(len(ins))},
                {"label": "Total bought", "value": usd(tot)},
                {"label": "Avg price paid", "value": f"${avg:,.2f}" if avg else "n/a"},
                {"label": "Buy dates", "value": dates[0] if len(dates) == 1 else f"{dates[0]} → {dates[-1]}"},
            ],
            "checklist": [
                {
                    "key": f"i{n}", "label": i["name"].title(), "met": True,
                    "detail": f"{i['role'] or 'Insider'}: {usd(i['dollars'])} ({i['shares']:,.0f} sh) on {', '.join(sorted(i['dates']))}",
                }
                for n, i in enumerate(ins)
            ],
            "risks": risks or ["No data-driven red flags; insiders can still be wrong"],
            "analystRating": f"{st.get('analystRatings') or 'n/a'} ({int(ei.fnum(st.get('analystCount')) or 0)} analysts)",
            "priceTarget": pt,
            "transactions": sorted(c["tx"], key=lambda x: x["date"], reverse=True),
            "sourceUrl": [
                f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={c['cik']}&type=4&dateb=&owner=include&count=40",
                f"https://stockanalysis.com/stocks/{s.lower()}/statistics/",
            ],
        }

    rows = [entry(s, c) for s, c in keep]
    picks = rows[:PICKS_N]
    bench = [dict(e, rank=i + 1) for i, e in enumerate(rows[PICKS_N:])]
    data = {
        "schemaVersion": 1,
        "lastUpdated": today.isoformat(),
        "priceDate": max((p["priceDate"] for p in picks if p.get("priceDate")), default=None),
        "title": "Insider Buys",
        "method": (
            f"Insider cluster buys from SEC Form 4 filings. Every Form 4 filed on EDGAR from {start.isoformat()} "
            f"to {today.isoformat()} for US-listed issuers over $300M ({len(paths):,} filings) was read, keeping "
            f"open-market purchases (transaction code P). A company qualifies when {MIN_INSIDERS}+ different "
            f"insiders bought within the last {days} days, together spending more than $250K. Ranked by number "
            f"of insiders buying, then dollars; up to {PICKS_N} picks, the rest are backups."
        ),
        "rubric": [
            {"component": "Insiders", "points": 1, "how": "3 or more distinct reporting insiders with code-P purchases in the window"},
            {"component": "Dollars", "points": 1, "how": "Shares × price as filed, summed across insiders: above $250,000"},
            {"component": "Size", "points": 1, "how": "Market cap above $300M on Nasdaq's screener"},
        ],
        "dataNotes": (
            f"Form 4 XML from SEC EDGAR (daily form indexes; only issuers in the ${MIN_CAP/1e6:.0f}M+ universe are fetched). "
            f"Duplicate rows from joint filings and amendments are counted once. "
            f"{len(co)} companies had insider purchases; {len(cand)} met the insider/dollar test; "
            f"{len(excl)} excluded as bitcoin miners or crypto-treasury companies. Prices are Nasdaq closes. "
            f"Form 4s are due within 2 business days of the trade."
        ),
        "universe": {
            "listed": listed, "screened": len(U), "filings": len(paths),
            "companiesWithBuys": len(co), "clusters": len(cand), "qualified": len(keep),
        },
        "excluded": {"minersOrCryptoTreasury": sorted(excl), "minersUniverse": miners},
        "disclaimer": "Insider buying is a signal, not a guarantee. For research only, not financial advice.",
        "picks": picks, "bench": bench,
    }
    fu.keep_grades(OUT, data)
    # strip non-JSON sets left behind (none expected)
    json.dump(data, open(OUT, "w"), indent=2, ensure_ascii=False, default=lambda o: list(o) if isinstance(o, set) else o)
    print("wrote", OUT)
    for e in picks + bench:
        print(e["ticker"], e["insiderCount"], usd(e["totalBought"]), e["firstBuy"], e["lastBuy"], e["marketCap"])


if __name__ == "__main__":
    main()
