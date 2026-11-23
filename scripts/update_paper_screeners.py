#!/usr/bin/env python3
"""Paper-test screeners (user-approved Nov 23, 2026). PAPER ONLY: never live lists, never traded.

Builds three lists from the rules frozen in the Nov 23, 2026 research (/workspace/screener-research/new-screeners.md,
"PHASE 2 UPDATE"), with the same code as the backtest harness (screener-research/harness: extract_sec.py,
build_panel.py, backtest.py):
  #1 QTRX  quality + trend      -> data/paper-qtrx.json
  #2 QGT   quality growth + trend -> data/paper-qgt.json
  #3 CQC-D cash-quality compounders in an uptrend (150/200-day) -> data/paper-cqcd.json

Universe: US-listed common stocks on Nasdaq's public screener with a SEC us-gaap filer CIK, market cap over $2B,
price >= $5, excluding Finance and Real Estate, bitcoin/crypto miners and crypto-treasury companies (the shared sets in
update_early_inflection.py), and names without 8 contiguous quarters of SEC data. Percentile ranks are taken across
that whole universe.
Fundamentals: SEC companyfacts bulk file (originally filed values, only filings on or before the as-of close, quarters
older than 230 days ignored). Prices: Yahoo daily chart (adjusted closes), cut at the as-of close.
Portfolio: score order with at most 3 names per Nasdaq industry and 6 semiconductor/hardware names; the first 12 are
the paper picks and the next 13 the bench (25 = the backtested portfolio size). As backtested, the paper picks are
held for a quarter: weekly runs refresh every number but only replace picks at the quarterly rebalance (91 days
after formation), or when a pick is delisted. --rebalance forces a new list.

Needs pandas + numpy (no other installs). Run it with the venv so the system pandas is never touched:
  [ -x /workspace/futura-venv/bin/python ] || python3 -m venv --system-site-packages /workspace/futura-venv
  /workspace/futura-venv/bin/python scripts/update_paper_screeners.py
Options: --rebalance  --asof=YYYY-MM-DD  --data-dir=/workspace/futura-paper-data
"""
import concurrent.futures as cf
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from collections import defaultdict
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import update_early_inflection as ei  # noqa: E402
import futura_cache  # noqa: E402
import futura_universe as fu  # noqa: E402

ROOT = ei.ROOT
SEC_UA = "Futura personal research burkemorin@gmail.com"
YUA = "Mozilla/5.0"
DATA_DIR = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--data-dir=")), "/workspace/futura-paper-data")
PICKS_N, BENCH_N, IND_CAP, THEME_CAP = 12, 13, 3, 6
HOLD_DAYS = 91
START = "2026-11-23"  # paper test approved and started

# ---------------------------------------------------------------- SEC fundamentals (verbatim from harness/extract_sec.py)
DUR = {
    "rev": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet", "SalesRevenueGoodsNet", "SalesRevenueServicesNet", "RevenuesNetOfInterestExpense"],
    "cogs": ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold", "CostOfServices", "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization"],
    "gp": ["GrossProfit"],
    "opinc": ["OperatingIncomeLoss"],
    "ni": ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
    "eps": ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted", "EarningsPerShareBasic"],
    "cfo": ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PaymentsForCapitalImprovements"],
    "rd": ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"],
    "sbc": ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"],
    "dilsh": ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfShareOutstandingBasicAndDiluted"],
    "buyback": ["PaymentsForRepurchaseOfCommonStock"],
    "intexp": ["InterestExpense", "InterestExpenseNonoperating"],
}
INST = {
    "assets": ["Assets"], "equity": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "ca": ["AssetsCurrent"], "cl": ["LiabilitiesCurrent"], "cash": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
    "ltd": ["LongTermDebtNoncurrent", "LongTermDebt"], "std": ["LongTermDebtCurrent", "DebtCurrent", "ShortTermBorrowings"],
    "liab": ["Liabilities"], "gw": ["Goodwill"],
}


def _d(s):
    return dt.date.fromisoformat(s)


def pick_records(gaap, tags, unit_pref, cutoff):
    out = {}
    for tag in tags:
        if tag not in gaap:
            continue
        units = gaap[tag]["units"]
        u = next((x for x in unit_pref if x in units), None)
        if not u:
            continue
        for r in units[u]:
            if not r.get("form", "").startswith(("10-Q", "10-K", "20-F", "40-F", "6-K", "8-K")):
                continue
            if r["filed"] > cutoff:  # as-of: only filings public by the as-of close
                continue
            k = (r.get("start"), r["end"])
            cur = out.get(k)
            if cur is None or r["filed"] < cur[1]:
                out[k] = (r["val"], r["filed"], tag)
    return out


def quarterly_flow(recs):
    by_start = defaultdict(list)
    q = {}
    for (s, e), (v, f, _) in recs.items():
        if s is None:
            continue
        days = (_d(e) - _d(s)).days
        if 80 <= days <= 100:
            if e not in q or f < q[e][1]:
                q[e] = (v, f)
        by_start[s].append((_d(e), v, f, days))
    for s, lst in by_start.items():
        lst.sort()
        for i in range(1, len(lst)):
            e, v, f, days = lst[i]
            for j in range(i):
                e2, v2, f2, days2 = lst[j]
                if 80 <= (e - e2).days <= 100 and days > 100:
                    k = e.isoformat()
                    if k not in q:
                        q[k] = (v - v2, max(f, f2))
    return q


def instant(recs):
    q = {}
    for (s, e), (v, f, _) in recs.items():
        if s is None and (e not in q or f < q[e][1]):
            q[e] = (v, f)
    return q


def shares_dei(facts, cutoff):
    dei = facts.get("dei", {}).get("EntityCommonStockSharesOutstanding", {}).get("units", {}).get("shares", [])
    by = defaultdict(lambda: defaultdict(float))
    fil = {}
    for r in dei:
        if r["filed"] > cutoff:
            continue
        by[r["accn"]][r["end"]] += r["val"]
        fil[r["accn"]] = r["filed"]
    out = []
    for a, m in by.items():
        for e, v in m.items():
            out.append((fil[a], e, v))
    return sorted(out)


def build_fund(cik_facts, cutoff):
    facts = cik_facts.get("facts", {})
    gaap = facts.get("us-gaap", {})
    if not gaap:
        return None
    rows = defaultdict(dict)
    for k, tags in DUR.items():
        unit = ("USD/shares",) if k == "eps" else (("shares",) if k == "dilsh" else ("USD",))
        for e, (v, f) in quarterly_flow(pick_records(gaap, tags, unit, cutoff)).items():
            rows[e][k] = v
            rows[e]["f_" + k] = f
    for k, tags in INST.items():
        for e, (v, f) in instant(pick_records(gaap, tags, ("USD",), cutoff)).items():
            rows[e][k] = v
            rows[e]["f_" + k] = f
    if not rows:
        return None
    df = pd.DataFrame.from_dict(rows, orient="index")
    df.index = pd.to_datetime(df.index)
    return df.sort_index(), shares_dei(facts, cutoff)


def q_signals(q):
    """verbatim from harness/build_panel.py"""
    q = q.copy()
    if "rev" not in q:
        return None
    if "gp" not in q:
        q["gp"] = np.nan
    gp = q["gp"].copy()
    if "cogs" in q:
        gp = gp.fillna(q["rev"] - q["cogs"])
    q["gp2"] = gp
    for c in ["rev", "gp2", "opinc", "ni", "eps", "cfo", "capex", "rd", "sbc", "buyback", "intexp", "dilsh", "assets", "equity", "ca", "cl", "cash", "ltd", "std", "liab", "gw"]:
        if c not in q:
            q[c] = np.nan
    fcols = [c for c in ["f_rev", "f_ni", "f_assets"] if c in q]
    if not fcols:
        return None
    avail = pd.to_datetime(q[fcols].max(axis=1), errors="coerce")
    q = q[avail.notna() & (q["rev"] > 0)]
    avail = avail[q.index]
    if len(q) < 5:
        return None
    ends = q.index.to_series()
    contig = ends.diff().dt.days.between(75, 105)
    run = np.zeros(len(q), int)
    for i in range(len(q)):
        run[i] = 1 if i == 0 or not contig.iloc[i] else run[i - 1] + 1

    def ttm(c, lag=0):
        return q[c].rolling(4, min_periods=4).sum().shift(lag)
    out = pd.DataFrame(index=q.index)
    out["avail"] = avail.values
    out["run"] = run
    R, R4 = ttm("rev"), ttm("rev", 4)
    GP, GP4 = ttm("gp2"), ttm("gp2", 4)
    OI, NI, CFO, CAPEX, RD = ttm("opinc"), ttm("ni"), ttm("cfo"), ttm("capex"), ttm("rd")
    RDf = RD.fillna(0)
    A = q["assets"]
    A4 = A.shift(4)
    Aavg = (A + A4) / 2
    out["rev_ttm"] = R
    out["gp_ttm"] = GP
    out["ni_ttm"] = NI
    out["cfo_ttm"] = CFO
    out["opinc_ttm"] = OI
    out["fcf_ttm"] = CFO - CAPEX.fillna(0)
    out["assets"] = A
    out["gpa"] = GP / Aavg
    out["cbop"] = CFO / Aavg
    out["oprd"] = (OI + RDf) / Aavg
    out["accruals"] = (NI - CFO) / Aavg
    out["fcf_a"] = out["fcf_ttm"] / Aavg
    out["gm"] = GP / R
    out["gm_chg"] = GP / R - GP4 / R4
    out["rev_g"] = R / R4 - 1
    yq = q["rev"] / q["rev"].shift(4) - 1
    out["rev_gq"] = yq
    de = q["eps"] - q["eps"].shift(4)
    out["sue"] = de / de.rolling(8, min_periods=6).std()
    out["eps_up8"] = (de > 0).rolling(8, min_periods=8).sum()
    out["ni_pos8"] = (q["ni"] > 0).rolling(8, min_periods=8).sum()
    # fallback share-change inputs (diluted weighted-average shares now vs four quarters earlier)
    out["dilsh"] = q["dilsh"]
    out["dilsh4"] = q["dilsh"].shift(4)
    out["qend4"] = ends.shift(4).values
    out.loc[out["run"] < 5, "dilsh4"] = np.nan
    bad = out["run"] < 8
    for c in ["gpa", "cbop", "oprd", "accruals", "fcf_a", "gm_chg", "rev_g"]:
        out.loc[bad, c] = np.nan
    return out


# ---------------------------------------------------------------- screens (verbatim from harness/backtest.py)
COMMODITY_IND = ("Metal Mining", "Other Metals and Minerals", "Precious Metals", "Coal Mining", "Oil & Gas Production", "Integrated oil Companies",
                 "Oil Refining/Marketing", "Aluminum", "Steel/Iron Ore", "Mining & Quarrying of Nonmetallic Minerals (No Fuels)", "Agricultural Chemicals",
                 "Major Chemicals", "Forest Products", "Paper", "Oilfield Services/Equipment", "Natural Gas Distribution")
SEMI_LIKE = ("Semiconductor", "Electronic Components", "Computer peripheral", "Computer Communications", "Computer Manufacturing")


def srank(X, col, sign=1):
    return (sign * X[col]).rank(pct=True)


def cash_quality(X):
    return (srank(X, "cbop") + srank(X, "oprd") + srank(X, "fcf_a") + srank(X.assign(i=X.sh_g12.fillna(0)), "i", -1)
            + srank(X.assign(e=X.eps_up8.fillna(4)), "e") + srank(X, "accruals", -1)) / 6


def S_QTRX(X):
    q = cash_quality(X)
    rules = [("Cash quality in the top 40%", q >= q.quantile(0.6)), ("Price above its 10-month average", X.sma10 > 0),
             ("12-month volatility below the 80th percentile", X.vol12 < X.vol12.quantile(0.8)),
             ("Cash-based operating profit above zero", X.cbop > 0), ("Not a commodity producer", ~X.industry.isin(COMMODITY_IND))]
    return rules, (srank(X, "mom12_1") + q) / 2, q


def S_QGT(X):
    q = cash_quality(X)
    rules = [("Cash quality in the top 50%", q >= q.quantile(0.5)), ("Revenue growth (TTM) above 8%", X.rev_g > 0.08),
             ("Cash-based operating profit above zero", X.cbop > 0), ("Share count up less than 3% in 12 months", X.sh_g12.fillna(0) < 0.03),
             ("Not a commodity producer", ~X.industry.isin(COMMODITY_IND)), ("Price above its 10-month average", X.sma10 > 0)]
    sc = (srank(X.assign(s=X.sue.fillna(0)), "s") + srank(X, "rev_gq") + srank(X.assign(g=X.gm_chg.fillna(0)), "g") + q + srank(X, "mom12_1")) / 5
    return rules, sc, q


def S_CQCD(X):
    q = cash_quality(X)
    rules = [("Cash-based operating profit above zero", X.cbop > 0), ("Free cash flow (TTM) above zero", X.fcf_ttm > 0),
             ("Share count up less than 2% in 12 months", X.sh_g12.fillna(0) < 0.02), ("Profitable in at least 6 of the last 8 quarters", X.ni_pos8.fillna(0) >= 6),
             ("Revenue growing (TTM)", X.rev_g > 0), ("Price above its 150-day average", X.ab150 == 1), ("Price above its 200-day average", X.ab200 == 1)]
    return rules, q, q


def select(X, ok, score, n):
    X = X.assign(_s=score)[ok & score.notna()].sort_values("_s", ascending=False)
    picks, ind, theme = [], {}, 0
    for t, ind_name in zip(X.ticker, X.industry):
        if IND_CAP and ind.get(ind_name, 0) >= IND_CAP:
            continue
        is_th = any(k.lower() in (ind_name or "").lower() for k in SEMI_LIKE)
        if THEME_CAP and is_th and theme >= THEME_CAP:
            continue
        picks.append(t)
        ind[ind_name] = ind.get(ind_name, 0) + 1
        theme += is_th
        if len(picks) >= n:
            break
    return picks


SCREENS = {
    "qtrx": {"fn": S_QTRX, "rank": 1, "code": "QTRX", "file": "paper-qtrx.json", "title": "Paper test #1: Quality + Trend (QTRX)",
             "how": "Ranked by the average of 12-1 momentum (percentile) and cash quality (percentile).",
             "summary": "High cash-quality companies in an uptrend with moderate volatility, ranked by 12-month momentum and quality.",
             "bt": "Backtest 2012–Nov 2026 (SEC + Yahoo, top 1,000 US stocks, 25 names, quarterly, 10 bp costs): +1.2 to +2.2%/yr vs the same-universe equal-weight basket, Sharpe about 0.8, max drawdown about −30%. 1975–2025 survivorship-free check (OSAP/CRSP proxy): +5.0%/yr vs the market; +10.7%/yr in 1975–2004. It lagged in 2020–26 and in the Jul–Nov 2026 reversal."},
    "qgt": {"fn": S_QGT, "rank": 2, "code": "QGT", "file": "paper-qgt.json", "title": "Paper test #2: Quality Growth + Trend (QGT)",
            "how": "Ranked by the average percentile of earnings surprise (SUE), latest-quarter revenue growth YoY, gross-margin change, cash quality and 12-1 momentum.",
            "summary": "Growing, cash-generative companies with earnings surprises and an uptrend, commodity producers excluded.",
            "bt": "Backtest 2012–Nov 2026: +2.5%/yr vs the same-universe equal-weight basket (top 1,000; 2012–19 −1.5, 2020–26 +7.2), max drawdown about −34%. 1975–2025 proxy check: +2.9%/yr vs the market; +6.5%/yr in 1975–2004. Fell about 33% in Jul–Nov 2026."},
    "cqcd": {"fn": S_CQCD, "rank": 3, "code": "CQC-D", "file": "paper-cqcd.json", "title": "Paper test #3: Cash-Quality Compounders in an uptrend (CQC-D)",
             "how": "Ranked by cash quality: the average percentile of cash-based operating profit/assets, R&D-adjusted operating profit/assets, FCF/assets, low share issuance, EPS-up quarters and low accruals.",
             "summary": "Steady cash compounders (profitable, FCF-positive, not diluting) trading above their 150- and 200-day averages.",
             "bt": "Backtest 2012–Nov 2026: +0.5 to +0.7%/yr vs the same-universe equal-weight basket, Sharpe about 0.8, max drawdown about −30%; the only one of the three ahead of that basket in 2026. Least overlap with #1/#2 (27–35%). The 150/200-day gate is supported by 2012–26 data only; on 1975–2025 data plain cash quality did slightly better."},
}


# ---------------------------------------------------------------- data fetching
def http(url, ua, timeout=60, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "identity"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 404:
                raise
            time.sleep(60 if e.code == 429 else 2 + 3 * i)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 + 3 * i)
    raise last


def companyfacts_zip(today):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, "companyfacts.zip")
    fresh = os.path.exists(path) and (time.time() - os.path.getmtime(path)) < 20 * 3600
    if not fresh:
        tmp = path + ".part"
        print("downloading SEC companyfacts.zip (about 1.4 GB)…", flush=True)
        req = urllib.request.Request("https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip", headers={"User-Agent": SEC_UA})
        with urllib.request.urlopen(req, timeout=600) as r, open(tmp, "wb") as f:
            while True:
                b = r.read(1 << 22)
                if not b:
                    break
                f.write(b)
        os.replace(tmp, path)
    return path


def yahoo_daily(t, day_dir):
    p = os.path.join(day_dir, t + ".json")
    if os.path.exists(p):
        return json.load(open(p))
    url = (f"https://query{1 + hash(t) % 2}.finance.yahoo.com/v8/finance/chart/{t}?range=2y&interval=1d&events=split"
           f"&includeAdjustedClose=true")
    time.sleep(0.35)
    try:
        j = json.loads(http(url, YUA, 30, 5))["chart"]["result"][0]
    except Exception:  # noqa: BLE001
        return None
    q = j["indicators"]["quote"][0]
    out = {"t": j.get("timestamp") or [], "close": q.get("close") or [], "adj": (j["indicators"].get("adjclose") or [{}])[0].get("adjclose") or [],
           "splits": list(((j.get("events") or {}).get("splits") or {}).values()), "tz": j["meta"].get("exchangeTimezoneName"),
           "currency": j["meta"].get("currency")}
    json.dump(out, open(p, "w"))
    return out


def price_features(j, asof):
    """Monthly (sma10, mom12_1, vol12) and daily (ab150, ab200) trend features at the as-of close, as in the harness."""
    if not j or not j["t"] or not j["adj"]:
        return None
    idx = pd.to_datetime(j["t"], unit="s", utc=True).tz_convert("America/New_York").tz_localize(None).normalize()
    df = pd.DataFrame({"close": j["close"], "adj": j["adj"]}, index=idx).astype(float).dropna()
    df = df[~df.index.duplicated(keep="last")]
    df = df[df.index <= pd.Timestamp(asof)]
    if len(df) < 220 or df.index[-1] < pd.Timestamp(asof) - pd.Timedelta(days=6):
        return None
    s = df["adj"]
    m = s.groupby(s.index.to_period("M")).last()
    if len(m) < 13:
        return None
    ret = m.pct_change()
    lr = np.log1p(ret)
    f = {"price": float(df["close"].iloc[-1]), "priceDate": df.index[-1].date().isoformat(),
         "sma10": float(m.iloc[-1] / m.iloc[-10:].mean() - 1),
         "mom12_1": float(np.expm1(lr.shift(1).iloc[-11:].sum())),
         "vol12": float(ret.iloc[-12:].std() * math.sqrt(12))}
    sma150, sma200 = s.iloc[-150:].mean(), s.iloc[-200:].mean()
    f.update(ab150=float(s.iloc[-1] > sma150), ab200=float(s.iloc[-1] > sma200),
             pct150=float(s.iloc[-1] / sma150 - 1), pct200=float(s.iloc[-1] / sma200 - 1),
             chg3m=float(s.iloc[-1] / s[s.index <= df.index[-1] - pd.DateOffset(months=3)].iloc[-1] - 1))
    f["splits"] = [(pd.Timestamp(x["date"], unit="s"), x["numerator"] / x["denominator"]) for x in j.get("splits") or [] if x.get("denominator")]
    return f


def shares_asof(shares, when, splits):
    """Cover-page share count known on `when` (by filing date), put on today's split basis."""
    best = None
    for filed, end, v in shares:
        if filed <= when:
            best = (end, v)
    if not best:
        return None
    end, v = best
    return v * float(np.prod([r for d0, r in splits if d0 > pd.Timestamp(end)] or [1.0]))


def last_close_date():
    """Latest completed US session: today after 4:30 pm New York time on a weekday, otherwise the previous weekday."""
    now = dt.datetime.now(ZoneInfo("America/New_York"))
    d = now.date()
    if d.weekday() >= 5 or now.hour * 60 + now.minute < 16 * 60 + 30:
        d -= dt.timedelta(days=1)
    while d.weekday() >= 5:
        d -= dt.timedelta(days=1)
    return d.isoformat()


# ---------------------------------------------------------------- build
def pct(v, d=1, sign=True):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "n/a"
    return f"{v * 100:+.{d}f}%" if sign else f"{v * 100:.{d}f}%"


def clean(o):
    """NaN/inf -> None so the JSON stays valid for browsers."""
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if not math.isfinite(float(o)) else float(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def main():
    asof = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--asof=")), None) or last_close_date()
    today = dt.date.today().isoformat()
    print("as-of close", asof)
    excl = set(ei.MINERS) | set(ei.CRYPTO_TREASURY)

    # 1) universe: Nasdaq screener rows mapped to SEC CIKs (first listed ticker per CIK, preferreds/units excluded)
    rows = json.loads(ei.get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", accept="application/json", timeout=90))["data"]["rows"]
    nas = {(r.get("symbol") or "").strip().upper().replace("/", "-"): r for r in rows}
    sect = json.loads(http("https://www.sec.gov/files/company_tickers_exchange.json", SEC_UA))
    tick2cik = {}
    for cik, name, t, ex in sect["data"]:
        if t and re.fullmatch(r"[A-Z]{1,5}(-[AB])?", t) and cik not in tick2cik.values() and t in nas:
            tick2cik[t] = cik
    cand = {}
    for t, cik in tick2cik.items():
        r = nas[t]
        mc = ei.fnum(r.get("marketCap"))
        if t in excl or (r.get("sector") or "") in ("Finance", "Real Estate") or not mc or mc < 1.5e9:
            continue
        if re.search(r"\b(warrant|right|unit|preferred|depositary shares? representing|notes due)\b", r.get("name") or "", re.I):
            continue
        cand[t] = {"cik": cik, "row": r}
    print(f"{len(rows)} Nasdaq rows; {len(cand)} candidates over $1.5B (final cut at $2B after SEC share counts)")

    # 2) SEC fundamentals as of the close
    z = zipfile.ZipFile(companyfacts_zip(today))
    names = set(z.namelist())
    fund = {}
    for t, c in cand.items():
        nm = f"CIK{c['cik']:010d}.json"
        if nm not in names:
            continue
        try:
            r = build_fund(json.loads(z.read(nm)), asof)
        except Exception as e:  # noqa: BLE001
            print("sec fail", t, e)
            continue
        if not r:
            continue
        qs = q_signals(r[0])
        if qs is None:
            continue
        known = qs[qs["avail"] <= pd.Timestamp(asof)]
        if not len(known):
            continue
        row = known.iloc[-1]
        if row.name < pd.Timestamp(asof) - pd.Timedelta(days=230) or pd.isna(row["gpa"]):
            continue
        fund[t] = (row, r[1])
    print(f"{len(fund)} with 8+ contiguous quarters of current SEC data")

    # 3) prices
    day_dir = os.path.join(DATA_DIR, "yahoo", asof)
    os.makedirs(day_dir, exist_ok=True)
    tick = sorted(fund)
    with cf.ThreadPoolExecutor(2) as ex:
        px = dict(zip(tick, ex.map(lambda t: yahoo_daily(t, day_dir), tick)))
    recs, nopx = [], []
    asof_m_end = (pd.Timestamp(asof) + pd.offsets.MonthEnd(0)).date().isoformat()
    m12 = (pd.Timestamp(asof) + pd.offsets.MonthEnd(0) - pd.DateOffset(months=12) + pd.offsets.MonthEnd(0)).date().isoformat()
    for t in tick:
        f = price_features(px.get(t), asof)
        if not f:
            nopx.append(t)
            continue
        row, shares = fund[t]
        sh_now = shares_asof(shares, min(asof, asof_m_end), f["splits"])
        sh_12 = shares_asof(shares, m12, f["splits"])
        mcap = f["price"] * sh_now if sh_now else ei.fnum(cand[t]["row"].get("marketCap"))
        sh_g12, sh_src = ((sh_now / sh_12 - 1), "cover") if (sh_now and sh_12) else (np.nan, None)
        if pd.isna(sh_g12) and row["dilsh"] > 0 and row["dilsh4"] > 0:
            # multi-class filers report cover-page shares only by class, which SEC's bulk file omits:
            # use diluted weighted-average shares vs four quarters earlier, put on the same split basis
            spl = float(np.prod([r for d0, r in f["splits"] if pd.Timestamp(row["qend4"]) < d0 <= row.name] or [1.0]))
            sh_g12, sh_src = row["dilsh"] / (row["dilsh4"] * spl) - 1, "diluted"
        r = cand[t]["row"]
        recs.append({"ticker": t, "cik": cand[t]["cik"], "name": r.get("name") or t, "sector": r.get("sector") or "", "industry": r.get("industry") or "",
                     "mcap": mcap, "sh_g12": sh_g12, "sh_src": sh_src, "qend": row.name.date().isoformat(),
                     **{k: row[k] for k in ["gpa", "cbop", "oprd", "accruals", "fcf_a", "fcf_ttm", "rev_ttm", "gm", "gm_chg", "rev_g", "rev_gq", "sue", "eps_up8", "ni_pos8", "ni_ttm", "cfo_ttm"]},
                     **{k: v for k, v in f.items() if k != "splits"}})
    X = pd.DataFrame(recs)
    for c in X.columns:
        if c not in ("ticker", "name", "sector", "industry", "qend", "priceDate", "sh_src"):
            X[c] = pd.to_numeric(X[c], errors="coerce")
    X = X[(X.price >= 5) & (X.mcap > 2e9)].reset_index(drop=True)
    print(f"no usable Yahoo prices for {len(nopx)}: {nopx[:20]}")
    print(f"universe: {len(X)} stocks over $2B with SEC fundamentals and prices")
    price_date = max(X.priceDate)

    also = fu.also_in()
    nas_n = len(rows)
    for key, S in SCREENS.items():
        rules, score, q = S["fn"](X)
        ok = pd.Series(True, index=X.index)
        for _, m in rules:
            ok &= m.fillna(False)
        ranked = select(X, ok, score, PICKS_N + BENCH_N + 10)
        out_path = os.path.join(ROOT, "data", S["file"])
        prev = json.load(open(out_path)) if os.path.exists(out_path) else None
        port = (prev or {}).get("portfolio") or {}
        rebalance = "--rebalance" in sys.argv or not port.get("tickers") or today >= port.get("nextRebalance", "0000")
        log = []
        if rebalance:
            held = ranked[:PICKS_N]
            port = {"formedOn": today, "formedPriceDate": price_date, "nextRebalance": (dt.date.fromisoformat(today) + dt.timedelta(days=HOLD_DAYS)).isoformat(), "tickers": held}
            log.append(f"{'Formed' if not prev else 'Quarterly rebalance'} on {today} from the {price_date} close")
        else:
            held = list(port["tickers"])
            gone = [t for t in held if t not in set(X.ticker)]
            for t in gone:  # delisted / acquired / no data: replace with the best-ranked passer not already held
                rep = next((r for r in ranked if r not in held), None)
                held[held.index(t)] = rep
                log.append(f"{t} replaced by {rep} on {today}: no longer in the universe (delisted, acquired or no current data)")
            held = [t for t in held if t]
            port["tickers"] = held
        bench = [t for t in ranked if t not in held][:BENCH_N]
        n = len(X)
        rank_of = {t: i + 1 for i, t in enumerate(X.assign(_s=score)[ok].sort_values("_s", ascending=False).ticker)}
        stats = futura_cache.stats_for(held + bench)
        XI = X.set_index("ticker")
        qpct = q.set_axis(X.ticker)
        spct = score.set_axis(X.ticker)

        def entry(t, role, pos):
            x = XI.loc[t]
            s = stats.get(t) or {}
            i = X.index[X.ticker == t][0]
            ck = [{"key": f"r{j}", "label": lab, "met": bool(m.iloc[i]) if not pd.isna(m.iloc[i]) else None} for j, (lab, m) in enumerate(rules)]
            det = {"Cash quality": f"cash-quality percentile {qpct[t] * 100:.0f}",
                   "Revenue growth (TTM) above 8%": f"TTM revenue {pct(x.rev_g)} YoY", "Revenue growing (TTM)": f"TTM revenue {pct(x.rev_g)} YoY",
                   "Cash-based operating profit above zero": f"operating cash flow / assets {pct(x.cbop, 1, False)}",
                   "Free cash flow (TTM) above zero": f"FCF {ei.fmt_money(x.fcf_ttm)} (FCF / assets {pct(x.fcf_a, 1, False)})",
                   "Price above its 10-month average": f"{pct(x.sma10)} vs 10-month average (month-end closes)",
                   "12-month volatility below the 80th percentile": f"annualised volatility {x.vol12 * 100:.0f}% (cut-off {X.vol12.quantile(0.8) * 100:.0f}%)",
                   "Profitable in at least 6 of the last 8 quarters": f"{int(x.ni_pos8) if not pd.isna(x.ni_pos8) else 'n/a'} of 8 quarters profitable",
                   "Price above its 150-day average": f"{pct(x.pct150)} vs 150-day average", "Price above its 200-day average": f"{pct(x.pct200)} vs 200-day average",
                   "Not a commodity producer": x.industry or "n/a"}
            for c in ck:
                c["detail"] = next((v for k, v in det.items() if c["label"].startswith(k)), "")
                if c["label"].startswith("Share count"):
                    c["detail"] = (f"{pct(x.sh_g12)} over 12 months (" + ("SEC cover-page shares" if x.sh_src == "cover" else "SEC diluted weighted-average shares, latest quarter vs a year earlier") + ", split-adjusted)") if not pd.isna(x.sh_g12) else "n/a in SEC data (counted as 0, as in the backtest)"
            kf = [{"label": "Cash quality", "value": f"{qpct[t] * 100:.0f}th pct"}]
            if key == "qtrx":
                kf += [{"label": "12-1 momentum", "value": pct(x.mom12_1, 0)}, {"label": "Volatility (12m)", "value": f"{x.vol12 * 100:.0f}%"},
                       {"label": "vs 10-mo avg", "value": pct(x.sma10, 0)}, {"label": "FCF / assets", "value": pct(x.fcf_a, 0, False)}]
            elif key == "qgt":
                kf += [{"label": "EPS surprise (SUE)", "value": "n/a" if pd.isna(x.sue) else f"{x.sue:+.2f}"}, {"label": "Qtr revenue YoY", "value": pct(x.rev_gq, 0)},
                       {"label": "Gross margin chg", "value": "n/a" if pd.isna(x.gm_chg) else f"{x.gm_chg * 100:+.1f} pts"}, {"label": "12-1 momentum", "value": pct(x.mom12_1, 0)},
                       {"label": "vs 10-mo avg", "value": pct(x.sma10, 0)}]
            else:
                kf += [{"label": "FCF / assets", "value": pct(x.fcf_a, 0, False)}, {"label": "Share count 12m", "value": pct(x.sh_g12, 1)},
                       {"label": "Profitable qtrs", "value": f"{int(x.ni_pos8)}/8" if not pd.isna(x.ni_pos8) else "n/a"},
                       {"label": "vs 150-day", "value": pct(x.pct150, 0)}, {"label": "vs 200-day", "value": pct(x.pct200, 0)}]
            drivers = [f"Score {spct[t] * 100:.0f}/100 → #{rank_of.get(t, '–')} of {int(ok.sum())} passers ({n} stocks screened)", S["how"],
                       f"Cash quality {qpct[t] * 100:.0f}th percentile: cash op. profit/assets {pct(x.cbop, 1, False)}, FCF/assets {pct(x.fcf_a, 1, False)}, accruals {pct(x.accruals, 1)}, EPS up YoY in {int(x.eps_up8) if not pd.isna(x.eps_up8) else 'n/a'} of 8 quarters",
                       f"Fundamentals through the quarter ending {x.qend} (SEC filings public by {asof})"]
            risks = []
            if x.mom12_1 > 1:
                risks.append(f"Up {x.mom12_1 * 100:.0f}% over the 12 months to last month: momentum names can reverse hard (Jul–Nov 2026 quality/momentum lists fell 15–33%)")
            if x.vol12 > 0.45:
                risks.append(f"Volatile: {x.vol12 * 100:.0f}% annualised")
            if not pd.isna(x.rev_gq) and x.rev_gq < 0:
                risks.append(f"Latest quarter revenue {pct(x.rev_gq)} YoY")
            failed = [c["label"] for c in ck if c["met"] is False]
            if role == "pick" and failed:
                risks.insert(0, f"Held from the {port['formedPriceDate']} rebalance but now misses: {'; '.join(failed)}. It stays until the next quarterly rebalance ({port['nextRebalance']}), as backtested.")
            risks.append("Paper test: rules were chosen on 2012–26 data; a live record is needed before trusting them")
            fpe, peg = ei.fnum(s.get("peForward")), ei.fnum(s.get("pegRatio"))
            e = {"company": ei.clean_name(x["name"]), "ticker": t, "sector": " – ".join(v for v in (x.sector, x.industry) if v) or "n/a",
                 "price": round(float(x.price), 2), "priceDate": x.priceDate, "marketCap": ei.fmt_money(float(x.mcap)),
                 "forwardPE": round(fpe, 2) if fpe else "n/a", "peg": round(peg, 2) if peg else "n/a",
                 "revenueGrowth": f"{pct(x.rev_g)} YoY (TTM; latest quarter {pct(x.rev_gq)})" if not pd.isna(x.rev_g) else "n/a",
                 "score": int(round(spct[t] * 100)), "paperRank": pos, "alsoIn": also.get(t, []),
                 "checklist": ck, "keyFigures": kf, "drivers": drivers, "risks": risks,
                 "analystRating": f"{s.get('analystRatings') or 'n/a'} ({int(ei.fnum(s.get('analystCount')) or 0)} analysts)", "priceTarget": ei.fnum(s.get("priceTarget")),
                 "sourceUrl": [f"https://data.sec.gov/api/xbrl/companyfacts/CIK{int(x.cik):010d}.json", f"https://stockanalysis.com/stocks/{t.lower()}/statistics/"],
                 "paperMetrics": {k: (None if pd.isna(x[k]) else round(float(x[k]), 4)) for k in ["rev_g", "rev_gq", "gm_chg", "sue", "cbop", "oprd", "fcf_a", "accruals", "sh_g12", "eps_up8", "ni_pos8", "mom12_1", "vol12", "sma10", "pct150", "pct200"]}}
            if role == "bench":
                e["rank"] = pos - PICKS_N
            return e
        picks = [entry(t, "pick", i + 1) for i, t in enumerate(held)]
        benchE = [entry(t, "bench", PICKS_N + i + 1) for i, t in enumerate(bench)]
        data = {"schemaVersion": 1, "paperTest": True, "status": "PAPER TEST, not a live list", "lastUpdated": today, "asOf": asof, "priceDate": price_date,
                "title": S["title"], "code": S["code"], "rankInStudy": S["rank"],
                "method": (f"{S['summary']} Universe: US-listed stocks over $2B with SEC us-gaap filings ({n} stocks; {int(ok.sum())} pass every rule), excluding "
                           "financials, real estate, bitcoin miners and crypto-treasury companies. Percentile ranks are across that universe. "
                           f"Picks are the top {PICKS_N} in score order with at most {IND_CAP} per industry and {THEME_CAP} semiconductor/hardware names; the next {BENCH_N} are backups. "
                           f"As backtested, picks are held for a quarter: weekly refreshes update the numbers, and the list is rebuilt at the quarterly rebalance (next: {port['nextRebalance']})."),
                "rubric": [{"component": lab, "points": "rule", "how": "must pass"} for lab, _ in rules] + [{"component": "Score", "points": "rank", "how": S["how"]}],
                "dataNotes": (f"Fundamentals: SEC XBRL companyfacts, originally filed values, filings public by the {asof} close; quarters older than 230 days are ignored. "
                              "Prices: Yahoo daily adjusted closes (month-end closes for the 10-month average, momentum and volatility; daily closes for the 150/200-day averages). "
                              "Forward P/E, PEG, analysts and targets: StockAnalysis. Same code as the Nov 23, 2026 backtest harness."),
                "backtest": S["bt"],
                "disclaimer": "Paper test only (user-approved Nov 23, 2026): not a live list, nothing is traded, and the live screeners are unchanged. Backtests overstate future returns. Not financial advice.",
                "portfolio": {**port, "log": ((prev or {}).get("portfolio") or {}).get("log", []) + log},
                "universe": {"nasdaqRows": nas_n, "screened": n, "passers": int(ok.sum())},
                "excluded": {"sectors": ["Finance", "Real Estate"], "miners": sorted(ei.MINERS), "cryptoTreasury": sorted(ei.CRYPTO_TREASURY)},
                "picks": picks, "bench": benchE}
        fu.keep_grades(out_path, data)
        json.dump(clean(data), open(out_path, "w"), indent=2, ensure_ascii=False, allow_nan=False)
        print(f"\n{S['code']}: {int(ok.sum())} passers; picks {held}; bench {bench} -> {out_path}")


if __name__ == "__main__":
    main()
