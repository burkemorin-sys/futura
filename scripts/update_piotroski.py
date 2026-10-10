#!/usr/bin/env python3
"""Piotroski tab -> data/piotroski.json

Joseph Piotroski's 9-point F-Score applied to the cheapest fifth (lowest price-to-book) of US-listed stocks over $2B.
Universe: Nasdaq screener, market cap > $2B, positive book value (P/B > 0), bitcoin/crypto miners excluded.
The cheapest quintile by P/B (StockAnalysis statistics) is scored; picks = F-Score 8 or 9, ranked by F-Score then by
lowest P/B. Any 8-9 scorers beyond 12 form the bench (shown when a pick is dismissed).

F-Score (latest fiscal year vs the year before, StockAnalysis annual statements; 1 point each):
 Profitability: 1 ROA > 0 (net income / start-of-year total assets)   2 Operating cash flow > 0
                3 ROA higher than the prior year                      4 Operating cash flow > net income (accruals)
 Leverage/liquidity: 5 Long-term debt / total assets lower (both zero counts as lower)
                6 Current ratio higher                                7 No new shares (year-end shares outstanding not up)
 Efficiency:    8 Gross margin higher                                 9 Asset turnover (revenue / start-of-year assets) higher
A test whose inputs are missing (e.g. banks have no gross margin or current ratio) scores 0 and is shown as n/a.
Usage: python3 scripts/update_piotroski.py [--limit=N]
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import update_early_inflection as ei
import futura_cache
import futura_universe as fu

OUT = os.path.join(ei.ROOT, "data", "piotroski.json")
PICKS_N = 12
TESTS = [("roa", "ROA positive"), ("cfo", "Operating cash flow positive"), ("droa", "ROA improving"),
         ("accrual", "Cash flow > net income"), ("lev", "Long-term debt / assets falling"), ("cr", "Current ratio rising"),
         ("shares", "No new shares issued"), ("gm", "Gross margin rising"), ("at", "Asset turnover rising")]


def annual(t):
    base = f"https://stockanalysis.com/stocks/{t.lower()}/financials/"
    i, b, c = ei.get(base), ei.get(base + "balance-sheet/"), ei.get(base + "cash-flow-statement/")
    cur = ei.re.search(r'details:\{source:"[^"]*",currency:"([A-Z]{3})"', i)
    A = lambda h, k: [x if isinstance(x, float) else None for x in ei._arr(h, k)]  # noqa: E731
    return {"fy": ei._arr(i, "datekey"), "rev": A(i, "revenue"), "gp": A(i, "gp"), "ni": A(i, "netinccmn"),
            "assets": A(b, "assets"), "ca": A(b, "assetsc"), "cl": A(b, "currentLiabilities"), "ltd": A(b, "debtnc"),
            "shares": A(b, "sharesOutTotalCommon"), "cfo": A(c, "ncfo"), "currency": cur.group(1) if cur else None}


def g(a, i):
    return a[i] if len(a) > i else None


def fscore(x):
    ni0, ni1 = g(x["ni"], 0), g(x["ni"], 1)
    a0, a1, a2 = g(x["assets"], 0), g(x["assets"], 1), g(x["assets"], 2)
    cfo0 = g(x["cfo"], 0)
    roa0 = ni0 / a1 if ni0 is not None and a1 else None
    roa1 = ni1 / a2 if ni1 is not None and a2 else None
    lev = lambda i: (g(x["ltd"], i) or 0.0) / g(x["assets"], i) if g(x["assets"], i) else None  # noqa: E731 (no LT-debt line = 0)
    cr = lambda i: g(x["ca"], i) / g(x["cl"], i) if g(x["ca"], i) is not None and g(x["cl"], i) else None  # noqa: E731
    gm = lambda i: g(x["gp"], i) / g(x["rev"], i) if g(x["gp"], i) is not None and g(x["rev"], i) else None  # noqa: E731
    at0 = g(x["rev"], 0) / a1 if g(x["rev"], 0) is not None and a1 else None
    at1 = g(x["rev"], 1) / a2 if g(x["rev"], 1) is not None and a2 else None
    l0, l1, c0, c1, m0, m1 = lev(0), lev(1), cr(0), cr(1), gm(0), gm(1)
    s0, s1 = g(x["shares"], 0), g(x["shares"], 1)
    P = lambda v, d=1: "n/a" if v is None else f"{v*100:.{d}f}%"  # noqa: E731
    F = lambda v: "n/a" if v is None else f"{v:.2f}"  # noqa: E731
    cur = x["currency"] or "USD"
    M = lambda v: "n/a" if v is None else (ei.fmt_money(v) if cur == "USD" else ei.fmt_money(v).replace("$", cur + " "))  # noqa: E731
    r = {
        "roa": (None if roa0 is None else roa0 > 0, f"ROA {P(roa0)}"),
        "cfo": (None if cfo0 is None else cfo0 > 0, f"Operating cash flow {M(cfo0)}"),
        "droa": (None if roa0 is None or roa1 is None else roa0 > roa1, f"ROA {P(roa0)} vs {P(roa1)} prior year"),
        "accrual": (None if cfo0 is None or ni0 is None else cfo0 > ni0, f"Cash flow {M(cfo0)} vs net income {M(ni0)}"),
        "lev": (None if l0 is None or l1 is None else (l0 < l1 or (l0 == 0 and l1 == 0)), f"LT debt / assets {P(l0)} vs {P(l1)}"),
        "cr": (None if c0 is None or c1 is None else c0 > c1, f"Current ratio {F(c0)} vs {F(c1)}"),
        "shares": (None if s0 is None or s1 is None else s0 <= s1, f"Shares {ei.fmt_money(s0).replace('$', '')} vs {ei.fmt_money(s1).replace('$', '')}" if s0 and s1 else "n/a"),
        "gm": (None if m0 is None or m1 is None else m0 > m1, f"Gross margin {P(m0)} vs {P(m1)}"),
        "at": (None if at0 is None or at1 is None else at0 > at1, f"Asset turnover {F(at0)} vs {F(at1)}"),
    }
    return sum(1 for k in r if r[k][0]), r, {"roa": roa0, "grossMargin": m0, "currentRatio": c0}


def main():
    limit = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--limit=")), None)
    today = dt.date.today().isoformat()
    uni, listed, miners = fu.universe(2e9)
    if limit:
        uni = uni[:limit]
    print(f"{len(uni)} US-listed stocks over $2B")
    stats = futura_cache.stats_for([u["ticker"] for u in uni])
    pb = []
    for u in uni:
        s = stats.get(u["ticker"])
        v = ei.fnum(s.get("pb")) if s else None
        if v and v > 0:
            pb.append((v, u, s))
    pb.sort(key=lambda x: x[0])
    q = pb[: max(1, len(pb) // 5)]
    cut = q[-1][0]
    print(f"{len(pb)} with positive book value; cheapest quintile = {len(q)} stocks, P/B ≤ {cut:.2f}")
    det = ei.pmap(annual, [u["ticker"] for _, u, _ in q], "annual statements")
    scored = []
    for v, u, s in q:
        x = det.get(u["ticker"])
        if not isinstance(x, dict) or len(x["ni"]) < 2:
            continue
        f, r, m = fscore(x)
        scored.append({"u": u, "s": s, "pb": v, "f": f, "r": r, "m": m, "x": x})
    scored.sort(key=lambda c: (-c["f"], c["pb"]))
    seen_co, dd = set(), []
    for c in scored:  # one share class per company (e.g. CENT / CENTA)
        k = ei.clean_name(c["u"]["name"]).lower()
        if k not in seen_co:
            seen_co.add(k)
            dd.append(c)
    scored = dd
    hi = [c for c in scored if c["f"] >= 8]
    dist = {n: sum(1 for c in scored if c["f"] == n) for n in range(10)}
    print(f"{len(scored)} scored; F-Score 8-9: {len(hi)}; distribution {dist}")
    also = fu.also_in()
    tick = {}  # Nasdaq closes for picks (price date)

    def entry(c):
        u, s, t = c["u"], c["s"], c["u"]["ticker"]
        h = ei.nasdaq_history(t, days=10)
        fy = c["x"]["fy"][0] if c["x"]["fy"] else None
        pt = ei.fnum(s.get("priceTarget"))
        risks = []
        if c["x"]["currency"] and c["x"]["currency"] != "USD":
            risks.append(f"Financials reported in {c['x']['currency']}")
        if u["sector"] == "Finance":
            risks.append("Financial company: gross margin and current ratio tests don't apply, so 8+ is harder to reach")
        if c["pb"] < 0.7:
            risks.append(f"Very low P/B ({c['pb']:.2f}): the market may expect lower book value (write-downs)")
        if (ei.fnum(s.get("ch1y")) or 0) < -30:
            risks.append(f"Stock down {abs(ei.fnum(s.get('ch1y'))):.0f}% in a year")
        return {
            "company": ei.clean_name(u["name"]), "ticker": t, "sector": " – ".join(x for x in (u["sector"], u["industry"]) if x) or "n/a",
            "price": round(h[-1][1], 2) if h else None, "priceDate": h[-1][0].isoformat() if h else None,
            "marketCap": ei.fmt_money(ei.fnum(s.get("marketcap")) or u["mcap"]),
            "forwardPE": round(ei.fnum(s.get("peForward")), 2) if ei.fnum(s.get("peForward")) else "n/a",
            "peg": round(ei.fnum(s.get("pegRatio")), 2) if ei.fnum(s.get("pegRatio")) else "n/a",
            "revenueGrowth": (lambda r: f"{ei.pct((r[0]/r[1]-1)*100, 1)} YoY (FY)" if len(r) > 1 and r[0] and r[1] else "n/a")(c["x"]["rev"]),
            "score": c["f"], "scoreMax": 9, "alsoIn": also.get(t, []),
            "keyFigures": [{"label": "F-Score", "value": f"{c['f']}/9"}, {"label": "Price / book", "value": f"{c['pb']:.2f}"},
                           {"label": "ROA", "value": "n/a" if c["m"]["roa"] is None else f"{c['m']['roa']*100:.1f}%"},
                           {"label": "Fiscal year", "value": fy or "n/a"}],
            "checklist": [{"key": k, "label": lab, "met": c["r"][k][0], "detail": c["r"][k][1]} for k, lab in TESTS],
            "risks": risks or ["No data-driven red flags; check why the market prices it below peers"],
            "analystRating": f"{s.get('analystRatings') or 'n/a'} ({int(ei.fnum(s.get('analystCount')) or 0)} analysts)", "priceTarget": pt,
            "sourceUrl": [f"https://stockanalysis.com/stocks/{t.lower()}/financials/", f"https://stockanalysis.com/stocks/{t.lower()}/statistics/"],
        }
    picks = [entry(c) for c in hi[:PICKS_N]]
    bench = [dict(entry(c), rank=i + 1) for i, c in enumerate(hi[PICKS_N:])]
    data = {
        "schemaVersion": 1, "lastUpdated": today, "priceDate": max((p["priceDate"] for p in picks if p.get("priceDate")), default=None),
        "title": "Piotroski",
        "method": (f"Joseph Piotroski's F-Score on cheap stocks. Universe: every US-listed stock over $2B on Nasdaq's screener with positive book value "
                   f"({len(pb)} stocks, bitcoin miners excluded). The cheapest fifth by price-to-book ({len(q)} stocks, P/B ≤ {cut:.2f}) is scored 0–9 "
                   f"on the nine tests below using the latest fiscal year vs the year before. Picks are the stocks scoring 8 or 9, ranked by score, "
                   f"then lowest P/B; up to {PICKS_N} are shown, with the rest as backups."),
        "rubric": [{"component": lab, "points": 1, "how": how} for (k, lab), how in zip(TESTS, [
            "Net income ÷ start-of-year total assets > 0", "Operating cash flow > 0", "ROA above last year's",
            "Operating cash flow larger than net income (earnings backed by cash)", "Long-term debt ÷ total assets below last year's (no debt both years counts)",
            "Current assets ÷ current liabilities above last year's", "Year-end shares outstanding not above last year's",
            "Gross profit ÷ revenue above last year's", "Revenue ÷ start-of-year total assets above last year's"])],
        "dataNotes": (f"Annual income statements, balance sheets and cash-flow statements from StockAnalysis; P/B from StockAnalysis statistics; prices are Nasdaq closes. "
                      f"F-Score distribution in the cheap quintile: " + ", ".join(f"{n}: {dist[n]}" for n in range(9, -1, -1) if dist[n]) +
                      ". A test with missing data scores 0 (shown as n/a); banks and insurers have no gross margin or current ratio."),
        "universe": {"listed": listed, "screened": len(uni), "positiveBook": len(pb), "quintile": len(q), "pbCutoff": round(cut, 3), "scored": len(scored), "picks8plus": len(hi), "distribution": dist},
        "excluded": {"miners": miners},
        "disclaimer": "Value stocks with improving fundamentals. Cheap stocks can stay cheap. For research only, not financial advice.",
        "picks": picks, "bench": bench,
    }
    fu.keep_grades(OUT, data)
    json.dump(data, open(OUT, "w"), indent=2, ensure_ascii=False)
    print("wrote", OUT)
    for e in picks + bench:
        print(e["ticker"], e["score"], [k["value"] for k in e["keyFigures"]], e["sector"])


if __name__ == "__main__":
    main()
