#!/usr/bin/env python3
"""Magic Formula tab -> data/magic-formula.json

Joel Greenblatt's Magic Formula. Universe: US-listed stocks over $2B on Nasdaq's screener, excluding the Finance,
Utilities and Real Estate sectors (Greenblatt excludes financials and utilities; REITs are financial-like) and bitcoin miners.
  Earnings yield   = EBIT (TTM) / enterprise value                     (StockAnalysis statistics, USD)
  Return on capital = EBIT (TTM) / (net working capital + net fixed assets)
      net working capital = (current assets - cash & short-term investments) - (current liabilities - current debt), floored at 0
      net fixed assets    = net property, plant & equipment                (latest quarterly balance sheet)
      EBIT for ROC = sum of the last four quarters' operating income in the statements' own currency, so the ratio is FX-neutral.
Each stock is ranked on both (1 = best); combined rank = sum; lowest combined rank wins. Stocks with negative EBIT,
non-positive EV or non-positive capital are dropped. Top 12 = picks, next 18 = bench.
Usage: python3 scripts/update_magic_formula.py [--limit=N]
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import update_early_inflection as ei
import futura_cache
import futura_universe as fu

OUT = os.path.join(ei.ROOT, "data", "magic-formula.json")
PICKS_N, BENCH_N = 12, 18
EXCL = ("Finance", "Utilities", "Real Estate")


def bal(t):
    b = ei.get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/balance-sheet/?p=quarterly")
    q = ei.get(f"https://stockanalysis.com/stocks/{t.lower()}/financials/?p=quarterly")
    A = lambda h, k: [x if isinstance(x, float) else None for x in ei._arr(h, k)]  # noqa: E731
    cur = ei.re.search(r'details:\{source:"[^"]*",currency:"([A-Z]{3})"', q)
    return {"date": (ei._arr(b, "datekey") or [None])[0], "ca": A(b, "assetsc"), "cash": A(b, "totalcash"), "cl": A(b, "currentLiabilities"),
            "debtc": A(b, "debtc"), "ppe": A(b, "netPPE"), "opinc": A(q, "opinc"), "currency": cur.group(1) if cur else None}


def main():
    limit = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--limit=")), None)
    today = dt.date.today().isoformat()
    uni, listed, miners = fu.universe(2e9, EXCL)
    if limit:
        uni = uni[:limit]
    stats = futura_cache.stats_for([u["ticker"] for u in uni])
    pre = []
    for u in uni:
        s = stats.get(u["ticker"])
        if not s:
            continue
        ebit, ev = ei.fnum(s.get("ebit")), ei.fnum(s.get("enterpriseValue"))
        if ebit and ebit > 0 and ev and ev > 0:
            pre.append({"u": u, "s": s, "ebit": ebit, "ev": ev, "ey": ebit / ev * 100})
    print(f"{len(uni)} stocks (ex financials/utilities/real estate); {len(pre)} with positive EBIT and EV")
    det = ei.pmap(bal, [c["u"]["ticker"] for c in pre], "balance sheets")
    ok = []
    for c in pre:
        x = det.get(c["u"]["ticker"])
        if not isinstance(x, dict):
            continue
        g = lambda a: a[0] if a else None  # noqa: E731
        ca, cash, cl, dc, ppe = g(x["ca"]), g(x["cash"]) or 0.0, g(x["cl"]), g(x["debtc"]) or 0.0, g(x["ppe"]) or 0.0
        op = x["opinc"][:4]
        if ca is None or cl is None or len(op) < 4 or None in op:
            continue
        nwc = max(0.0, (ca - cash) - (cl - dc))
        cap = nwc + ppe
        ebit_l = sum(op)
        if cap <= 0 or ebit_l <= 0:
            continue
        c.update(nwc=nwc, ppe=ppe, cap=cap, roc=ebit_l / cap * 100, cur=x["currency"], bsDate=x["date"])
        ok.append(c)
    for i, c in enumerate(sorted(ok, key=lambda c: -c["ey"]), 1):
        c["eyRank"] = i
    for i, c in enumerate(sorted(ok, key=lambda c: -c["roc"]), 1):
        c["rocRank"] = i
    ok.sort(key=lambda c: (c["eyRank"] + c["rocRank"], c["eyRank"]))
    print(f"{len(ok)} ranked")
    also = fu.also_in()
    n = len(ok)

    def entry(c, pos):
        u, s, t = c["u"], c["s"], c["u"]["ticker"]
        h = ei.nasdaq_history(t, days=10)
        cur = "" if c["cur"] in (None, "USD") else f" ({c['cur']})"
        risks = []
        if c["roc"] > 200:
            risks.append(f"Return on capital {c['roc']:.0f}% reflects a very small capital base (asset-light), so it overstates the edge")
        if c["cur"] and c["cur"] != "USD":
            risks.append(f"Financials reported in {c['cur']}")
        ch = ei.fnum(s.get("ch1y"))
        if ch is not None and ch < -30:
            risks.append(f"Stock down {abs(ch):.0f}% in a year: high earnings yield may mean the market expects EBIT to fall")
        fpe, pe = ei.fnum(s.get("peForward")), ei.fnum(s.get("pe"))
        if fpe and pe and fpe > pe * 1.25:
            risks.append(f"Forward P/E {fpe:.1f} vs trailing {pe:.1f}: analysts expect lower earnings")
        return {
            "company": ei.clean_name(u["name"]), "ticker": t, "sector": " – ".join(x for x in (u["sector"], u["industry"]) if x) or "n/a",
            "price": round(h[-1][1], 2) if h else None, "priceDate": h[-1][0].isoformat() if h else None,
            "marketCap": ei.fmt_money(ei.fnum(s.get("marketcap")) or u["mcap"]),
            "forwardPE": round(fpe, 2) if fpe else "n/a",
            "peg": round(ei.fnum(s.get("pegRatio")), 2) if ei.fnum(s.get("pegRatio")) else "n/a",
            "revenueGrowth": "n/a", "alsoIn": also.get(t, []),
            "magicRank": pos,
            "keyFigures": [{"label": "Earnings yield", "value": f"{c['ey']:.1f}%"}, {"label": "Return on capital", "value": f"{c['roc']:.0f}%"},
                           {"label": "EY rank", "value": f"{c['eyRank']} of {n}"}, {"label": "ROC rank", "value": f"{c['rocRank']} of {n}"},
                           {"label": "Combined", "value": str(c["eyRank"] + c["rocRank"])}, {"label": "EV", "value": ei.fmt_money(c["ev"])}],
            "drivers": [f"Earnings yield: EBIT {ei.fmt_money(c['ebit'])} ÷ EV {ei.fmt_money(c['ev'])} = {c['ey']:.1f}% (rank {c['eyRank']})",
                        f"Return on capital{cur}: EBIT ÷ (net working capital {ei.fmt_money(c['nwc'])} + net PP&E {ei.fmt_money(c['ppe'])}) = {c['roc']:.0f}% (rank {c['rocRank']}; balance sheet {c['bsDate']})",
                        f"Combined rank {c['eyRank'] + c['rocRank']} → #{pos} of {n}"],
            "risks": risks or ["No data-driven red flags; check whether recent EBIT is sustainable"],
            "analystRating": f"{s.get('analystRatings') or 'n/a'} ({int(ei.fnum(s.get('analystCount')) or 0)} analysts)", "priceTarget": ei.fnum(s.get("priceTarget")),
            "sourceUrl": [f"https://stockanalysis.com/stocks/{t.lower()}/statistics/", f"https://stockanalysis.com/stocks/{t.lower()}/financials/balance-sheet/?p=quarterly"],
        }
    # revenue growth (TTM) from stats is not available directly; leave n/a rather than guess
    picks = [entry(c, i + 1) for i, c in enumerate(ok[:PICKS_N])]
    bench = [dict(entry(c, PICKS_N + i + 1), rank=i + 1) for i, c in enumerate(ok[PICKS_N:PICKS_N + BENCH_N])]
    for e in picks + bench:
        e["revenueGrowth"] = e.pop("revenueGrowth")
    data = {
        "schemaVersion": 1, "lastUpdated": today, "priceDate": max((p["priceDate"] for p in picks if p.get("priceDate")), default=None),
        "title": "Magic Formula",
        "method": (f"Joel Greenblatt's Magic Formula: good businesses at bargain prices. Universe: US-listed stocks over $2B on Nasdaq's screener, excluding "
                   f"financials, utilities and real estate, and bitcoin miners ({len(uni)} stocks; {n} with positive EBIT, EV and capital). Every stock is ranked "
                   f"on earnings yield (EBIT ÷ enterprise value) and on return on capital (EBIT ÷ net working capital + net fixed assets); the two ranks are added "
                   f"and the lowest totals win. Top {PICKS_N} are the picks; the next {len(bench)} are backups."),
        "rubric": [{"component": "Earnings yield", "points": "rank", "how": "TTM EBIT ÷ enterprise value (StockAnalysis); higher is better"},
                   {"component": "Return on capital", "points": "rank", "how": "TTM operating income ÷ (net working capital excl. cash and current debt, floored at 0, + net PP&E) from the latest quarterly statements; higher is better"}],
        "dataNotes": "EBIT and enterprise value from StockAnalysis statistics; working capital and PP&E from StockAnalysis quarterly balance sheets; prices are Nasdaq closes. Greenblatt suggests holding a basket for a year; this tab is a daily snapshot.",
        "universe": {"listed": listed, "screened": len(uni), "ranked": n},
        "excluded": {"miners": miners, "sectors": list(EXCL)},
        "disclaimer": "Quantitative value ideas for research only. The formula can lag for years at a time. Not financial advice.",
        "picks": picks, "bench": bench,
    }
    fu.keep_grades(OUT, data)
    json.dump(data, open(OUT, "w"), indent=2, ensure_ascii=False)
    print("wrote", OUT)
    for e in picks + bench:
        print(e["magicRank"], e["ticker"], [k["value"] for k in e["keyFigures"]], e["sector"])


if __name__ == "__main__":
    main()
