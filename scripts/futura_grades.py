#!/usr/bin/env python3
"""Futura letter grades for Growth (data/growth-picks.json) and Risk It (data/risk-it.json).

For every entry in `picks` and `bench` this script:
  1. pulls real inputs from public pages (no keys, stdlib only):
       - StockAnalysis statistics page  -> EV/Sales, gross/operating/profit/FCF margin, EPS growth forecast (3Y)
       - Nasdaq historical prices        -> 3-month, 6-month and 1-year price change (and SPY's 1-year change)
     and stores them in entry["metrics"];
  2. grades each entry A+..F within its own list's candidate pool (picks + bench) by percentile:
       Growth        = TTM revenue growth (from entry["revenueGrowth"]) + EPS growth forecast (3Y)
       Value         = forward P/E, PEG (from the card) + EV/Sales      (lower is better; negative = worst)
       Momentum      = 1-yr relative strength vs SPY + 6-mo + 3-mo price change
       Profitability = gross, operating, net and FCF margin
     Each input is percentile-ranked inside the pool, the available input ranks are averaged, and that
     composite is ranked again inside the pool and mapped to a letter. A grade is "n/a" when all of
     its inputs are missing. Results go to entry["grades"] plus top-level "grading" metadata.

Usage:
  python3 scripts/futura_grades.py            # fetch fresh inputs, then grade both lists
  python3 scripts/futura_grades.py --no-fetch # re-grade from the metrics already stored in the JSON
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {"growth": os.path.join(ROOT, "data", "growth-picks.json"), "riskit": os.path.join(ROOT, "data", "risk-it.json")}
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
LETTERS = [(97, "A+"), (90, "A"), (83, "A-"), (77, "B+"), (70, "B"), (63, "B-"), (57, "C+"), (50, "C"),
           (43, "C-"), (37, "D+"), (30, "D"), (23, "D-"), (0, "F")]
GRADE_INPUTS = {
    "growth": [("revenueGrowthPct", 1), ("epsGrowth3yPct", 1)],
    "value": [("forwardPE", -1), ("peg", -1), ("evSales", -1)],
    "momentum": [("relStrength1yPct", 1), ("chg6mPct", 1), ("chg3mPct", 1)],
    "profitability": [("grossMarginPct", 1), ("operatingMarginPct", 1), ("netMarginPct", 1), ("fcfMarginPct", 1)],
}
LOWER_IS_BETTER_NEG_WORST = {"forwardPE", "peg", "evSales"}


def get(url, accept="text/html", tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept, "Accept-Language": "en-US,en;q=0.9"})
            with urllib.request.urlopen(req, timeout=30) as r:
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
    if not s or s.lower() in ("n/a", "-", "--", "none"):
        return None
    m = re.match(r"^[+-]?\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def sa_stats(ticker):
    """Return {id: hover/raw string} from the StockAnalysis statistics page."""
    html = get(f"https://stockanalysis.com/stocks/{ticker.lower()}/statistics/")
    items = re.findall(r'\{id:"([^"]+)",title:"[^"]+",value:"([^"]*)",hover:"([^"]*)"', html)
    if not items:
        raise RuntimeError("no statistics data found")
    return {k: (hv if hv not in ("", None) else v) for k, v, hv in items}


def nasdaq_history(ticker, assetclass="stocks", days=400):
    """Return [(date, close)] oldest->newest from Nasdaq's public historical endpoint."""
    to = dt.date.today()
    fr = to - dt.timedelta(days=days)
    url = (f"https://api.nasdaq.com/api/quote/{ticker}/historical?assetclass={assetclass}"
           f"&fromdate={fr.isoformat()}&todate={to.isoformat()}&limit=9999")
    d = json.loads(get(url, accept="application/json"))
    rows = (((d or {}).get("data") or {}).get("tradesTable") or {}).get("rows") or []
    out = []
    for r in rows:
        try:
            out.append((dt.datetime.strptime(r["date"], "%m/%d/%Y").date(), float(str(r["close"]).replace(",", "").replace("$", ""))))
        except Exception:  # noqa: BLE001
            pass
    if not out and assetclass == "stocks":
        return nasdaq_history(ticker, "etf", days)
    return sorted(out)


def change_since(hist, months):
    """% change from the close on/before (last date - N months) to the last close. None if history is too short."""
    if len(hist) < 2:
        return None, None
    last_d, last_c = hist[-1]
    y, m = last_d.year, last_d.month - months
    while m <= 0:
        m += 12
        y -= 1
    day = min(last_d.day, 28 if m == 2 else 30 if m in (4, 6, 9, 11) else 31)
    target = dt.date(y, m, day)
    if hist[0][0] > target + dt.timedelta(days=5):
        return None, None  # not enough history (e.g. recent IPO)
    base = [c for d, c in hist if d <= target]
    if not base:
        return None, None
    return round((last_c / base[-1] - 1) * 100, 2), last_d.isoformat()


def ttm_rev_growth(entry):
    v = entry.get("revenueGrowth")
    if isinstance(v, (int, float)):
        return float(v) * 100 if abs(v) < 2 else float(v)
    return fnum(v)


def fetch_metrics(entry, spy1y):
    t = entry["ticker"]
    m = {"revenueGrowthPct": ttm_rev_growth(entry), "forwardPE": fnum(entry.get("forwardPE")), "peg": fnum(entry.get("peg"))}
    notes = []
    try:
        s = sa_stats(t)
        rev = fnum(s.get("revenue"))
        def margin(key, num_key):
            v = fnum(s.get(key))
            if v is None and rev and rev > 0 and fnum(s.get(num_key)) is not None:
                v = round(fnum(s.get(num_key)) / rev * 100, 2)
            return v
        m.update({
            "epsGrowth3yPct": fnum(s.get("eps3y")),
            "evSales": fnum(s.get("evSales")),
            "grossMarginPct": margin("grossMargin", "gp"),
            "operatingMarginPct": margin("operatingMargin", "opinc"),
            "netMarginPct": margin("profitMargin", "netinc"),
            "fcfMarginPct": margin("fcfMargin", "fcf"),
        })
    except Exception as e:  # noqa: BLE001
        notes.append(f"StockAnalysis statistics unavailable ({e})")
    time.sleep(0.6)
    try:
        h = nasdaq_history(t)
        c3, asof = change_since(h, 3)
        c6, _ = change_since(h, 6)
        c12, _ = change_since(h, 12)
        m.update({"chg3mPct": c3, "chg6mPct": c6, "chg1yPct": c12,
                  "relStrength1yPct": round(c12 - spy1y, 2) if (c12 is not None and spy1y is not None) else None,
                  "priceAsOf": asof or (h[-1][0].isoformat() if h else None)})
    except Exception as e:  # noqa: BLE001
        notes.append(f"Nasdaq price history unavailable ({e})")
    time.sleep(0.4)
    if notes:
        m["notes"] = notes
    return m


def pct_ranks(values, direction, neg_worst):
    """values: {key: float|None}. Returns {key: 0..100} for non-None values (higher = better)."""
    pts = {}
    for k, v in values.items():
        if v is None:
            continue
        if neg_worst and v <= 0:
            pts[k] = float("-inf")  # losses / negative multiples rank worst on Value
        else:
            pts[k] = v * direction
    keys = list(pts)
    n = len(keys)
    if n == 0:
        return {}
    if n == 1:
        return {keys[0]: 50.0}
    out = {}
    for k in keys:
        below = sum(1 for j in keys if pts[j] < pts[k])
        equal = sum(1 for j in keys if pts[j] == pts[k]) - 1
        out[k] = (below + equal / 2) / (n - 1) * 100
    return out


def letter(p):
    for cut, g in LETTERS:
        if p >= cut - 1e-9:
            return g
    return "F"


def grade_pool(entries):
    keyed = {e["ticker"]: e for e in entries}
    for g, inputs in GRADE_INPUTS.items():
        per_input = {}
        for field, direction in inputs:
            vals = {t: (e.get("metrics") or {}).get(field) for t, e in keyed.items()}
            per_input[field] = pct_ranks(vals, direction, field in LOWER_IS_BETTER_NEG_WORST)
        comp = {}
        used = {}
        for t in keyed:
            rs = [per_input[f][t] for f, _ in inputs if t in per_input[f]]
            used[t] = [f for f, _ in inputs if t in per_input[f]]
            if rs:
                comp[t] = sum(rs) / len(rs)
        final = pct_ranks(comp, 1, False)
        for t, e in keyed.items():
            e.setdefault("grades", {})
            e.setdefault("gradeInputs", {})
            e["grades"][g] = letter(final[t]) if t in final else "n/a"
            e["gradeInputs"][g] = f"{len(used[t])}/{len(inputs)}"


def main():
    fetch = "--no-fetch" not in sys.argv
    today = dt.date.today().isoformat()
    spy1y = None
    if fetch:
        spy1y, _ = change_since(nasdaq_history("SPY", "etf"), 12)
        print(f"SPY 1-yr price change: {spy1y}%")
    for key, path in FILES.items():
        with open(path) as f:
            data = json.load(f)
        pool = [e for e in (data.get("picks") or []) + (data.get("bench") or []) if e.get("ticker")]
        for e in pool:
            if fetch:
                e["metrics"] = fetch_metrics(e, spy1y)
                print(key, e["ticker"], {k: v for k, v in e["metrics"].items() if k != "notes"}, e["metrics"].get("notes", ""))
            else:
                e.setdefault("metrics", {})
                e["metrics"]["revenueGrowthPct"] = ttm_rev_growth(e)
                e["metrics"]["forwardPE"] = fnum(e.get("forwardPE"))
                e["metrics"]["peg"] = fnum(e.get("peg"))
        grade_pool(pool)
        data["grading"] = {
            "asOf": today if fetch else (data.get("grading") or {}).get("asOf", today),
            "spy1yPct": spy1y if fetch else (data.get("grading") or {}).get("spy1yPct"),
            "pool": f"{len(pool)} stocks (this list's picks + bench)",
            "scale": "Percentile rank within the pool: A+ top 3%, A 90-97, A- 83-90, B+ 77-83, B 70-77, B- 63-70, C+ 57-63, C 50-57, C- 43-50, D+ 37-43, D 30-37, D- 23-30, F bottom 23%.",
            "inputs": {
                "growth": "TTM revenue growth (YoY) and EPS growth forecast (3-yr CAGR, StockAnalysis)",
                "value": "Forward P/E, PEG and EV/Sales; lower is better, losses or negative multiples rank worst",
                "momentum": "1-yr price change minus SPY's (relative strength), 6-month and 3-month price change (Nasdaq daily closes)",
                "profitability": "Gross, operating, net and free-cash-flow margin (TTM, StockAnalysis)",
            },
            "sources": ["https://stockanalysis.com/ (statistics pages)", "https://www.nasdaq.com/ (historical quotes)"],
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
