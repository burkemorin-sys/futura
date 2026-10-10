#!/usr/bin/env python3
"""Maintain data/track-record.json: how the Growth, Risk It, Early Inflection and Experiment Screener picks perform vs QQQ (and SPY).

A list that is added later (Early Inflection joined on Oct 8, 2026) starts at 100 on the latest stored close
when it first appears (no backfill); its benchmark comparison and hit rate run from its own start.

Model: each list is an equal-weight portfolio of its current 12 picks. Between pick changes it is
buy-and-hold (weights drift); whenever the picks change it is rebalanced back to equal weight at
that day's close. Value starts at 100 on the base close (Oct 6, 2026; tracking began Oct 7, 2026).

What a run does (idempotent, stdlib only, no keys):
  1. Fetches real daily closes from Nasdaq's public historical endpoint for every held ticker,
     every current pick, QQQ and SPY, and appends any trading days newer than the last stored date.
     It never invents prices: a day is only added when QQQ, SPY and every holding have a real close.
  2. Compares the current `picks` in data/growth-picks.json and data/risk-it.json with the holdings.
     Removed picks are closed at the latest stored close; new picks are opened at that same close;
     every change is logged with date and price, then the list is rebalanced to equal weight.
  3. Recomputes the value series, per-pick returns, the benchmark returns over each pick's holding
     period, and the hit rate (share of picks beating QQQ over the same period).

Usage:
  python3 scripts/update_track_record.py          # normal daily run
  python3 scripts/update_track_record.py --init   # create the file from today's picks (first run only)
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACK = os.path.join(ROOT, "data", "track-record.json")
LISTS = {
    "growth": {"file": os.path.join(ROOT, "data", "growth-picks.json"), "label": "Growth"},
    "riskit": {"file": os.path.join(ROOT, "data", "risk-it.json"), "label": "Risk It"},
    "early": {"file": os.path.join(ROOT, "data", "early-inflection.json"), "label": "Early Inflection"},
    "experiment": {"file": os.path.join(ROOT, "data", "experiment-screener.json"), "label": "Experiment Screener"},
    "piotroski": {"file": os.path.join(ROOT, "data", "piotroski.json"), "label": "Piotroski"},
    "magic": {"file": os.path.join(ROOT, "data", "magic-formula.json"), "label": "Magic Formula"},
}
BENCH = ["QQQ", "SPY"]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"


def nasdaq_closes(ticker, since):
    """{iso_date: close} for trading days >= since (real closes only)."""
    to = dt.date.today()
    fr = dt.date.fromisoformat(since) - dt.timedelta(days=3)
    for assetclass in (("etf", "stocks") if ticker in BENCH else ("stocks", "etf")):
        url = (f"https://api.nasdaq.com/api/quote/{ticker}/historical?assetclass={assetclass}"
               f"&fromdate={fr.isoformat()}&todate={to.isoformat()}&limit=9999")
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    d = json.loads(r.read().decode("utf-8", "replace"))
                rows = (((d or {}).get("data") or {}).get("tradesTable") or {}).get("rows") or []
                out = {}
                for row in rows:
                    try:
                        day = dt.datetime.strptime(row["date"], "%m/%d/%Y").date().isoformat()
                        out[day] = round(float(str(row["close"]).replace(",", "").replace("$", "")), 4)
                    except Exception:  # noqa: BLE001
                        pass
                if out:
                    return {k: v for k, v in out.items() if k >= since}
                break
            except Exception:  # noqa: BLE001
                time.sleep(1.5 * (attempt + 1))
        time.sleep(0.3)
    return {}


def load_picks(key):
    if not os.path.exists(LISTS[key]["file"]):
        return []
    with open(LISTS[key]["file"]) as f:
        d = json.load(f)
    return [p for p in d.get("picks") or [] if p.get("ticker")]


def init():
    picks = {k: load_picks(k) for k in ("growth", "riskit")}
    base = sorted({p.get("priceDate") for k in picks for p in picks[k] if p.get("priceDate")})
    if len(base) != 1:
        sys.exit(f"expected one shared priceDate across picks, got {base}")
    base = base[0]
    bench = {t: nasdaq_closes(t, base).get(base) for t in BENCH}
    if None in bench.values():
        sys.exit(f"missing benchmark close for {base}: {bench}")
    prices = {t: bench[t] for t in BENCH}
    lists = {}
    for k, ps in picks.items():
        for p in ps:
            prices[p["ticker"]] = float(p["price"])
        lists[k] = {
            "label": LISTS[k]["label"],
            "holdings": [{"ticker": p["ticker"], "company": p.get("company", ""), "entryDate": "2026-10-07",
                          "entryPriceDate": base, "entryPrice": float(p["price"])} for p in ps],
            "closed": [],
            "segments": [{"start": base, "startValue": 100.0, "tickers": [p["ticker"] for p in ps]}],
            "log": [{"date": "2026-10-07", "priceDate": base, "action": "start",
                     "note": f"Tracking began with the 12 published {LISTS[k]['label']} picks at the {base} close",
                     "tickers": [p["ticker"] for p in ps]}],
        }
    data = {
        "schemaVersion": 1,
        "trackingStart": "2026-10-07",
        "baseDate": base,
        "lastUpdated": dt.date.today().isoformat(),
        "method": ("Each list is treated as an equal-weight portfolio of its current picks, starting at 100 on the "
                   f"{base} close (the prices the Oct 7, 2026 picks were published with). It is buy-and-hold between "
                   "changes and rebalanced to equal weight at the close whenever a pick is added or removed. Price "
                   "returns only (dividends excluded), no trading costs or taxes. Benchmarks QQQ and SPY are indexed "
                   "to 100 on the same date. Hit rate = share of picks whose price return beat QQQ over the same "
                   "holding period. Closes come from Nasdaq's public historical quotes, added by the daily refresh."),
        "benchmarks": {"QQQ": "Invesco QQQ Trust (Nasdaq-100)", "SPY": "SPDR S&P 500 ETF"},
        "prices": {base: prices},
        "lists": lists,
    }
    return data


def value_on(prices, seg, day):
    p0, p1 = prices[seg["start"]], prices[day]
    if not seg["tickers"]:  # a strict screen can have no passers: hold cash at the last value
        return seg["startValue"]
    rels = [p1[t] / p0[t] for t in seg["tickers"]]
    return seg["startValue"] * sum(rels) / len(rels)


def recompute(data):
    prices = data["prices"]
    days = sorted(prices)
    base = data["baseDate"]
    latest = days[-1]
    data["latestDate"] = latest
    data["benchSeries"] = {t: [[d, round(prices[d][t] / prices[base][t] * 100, 3)] for d in days] for t in BENCH}
    for k, L in data["lists"].items():
        segs = L["segments"]
        start = segs[0]["start"]
        L.setdefault("startDate", data["trackingStart"])
        L.setdefault("startPriceDate", start)
        series = []
        for d in days:
            if d < start:
                continue
            seg = [s for s in segs if s["start"] <= d][-1]
            series.append([d, round(value_on(prices, seg, d), 3)])
        L["series"] = series
        L["returnPct"] = round(series[-1][1] - 100, 2)
        for b in BENCH:
            bret = (prices[latest][b] / prices[start][b] - 1) * 100
            L[f"vs{b}Pct"] = round(L["returnPct"] - bret, 2)
        rows = []
        for h in L["holdings"]:
            end = prices[latest].get(h["ticker"])
            rows.append((h, end, latest, True))
        for c in L["closed"]:
            rows.append((c, c["exitPrice"], c["exitPriceDate"], False))
        beat = n = beat_open = n_open = 0
        for h, end, end_day, is_open in rows:
            if end is None:
                continue
            r = (end / h["entryPrice"] - 1) * 100
            q = (prices[end_day]["QQQ"] / prices[h["entryPriceDate"]]["QQQ"] - 1) * 100
            s = (prices[end_day]["SPY"] / prices[h["entryPriceDate"]]["SPY"] - 1) * 100
            h["lastPrice" if is_open else "exitPrice"] = end
            h["lastPriceDate" if is_open else "exitPriceDate"] = end_day
            h["returnPct"], h["qqqPct"], h["spyPct"] = round(r, 2), round(q, 2), round(s, 2)
            h["beatQQQ"] = r > q
            if end_day != h["entryPriceDate"]:
                n += 1
                beat += r > q
                if is_open:
                    n_open += 1
                    beat_open += r > q
        L["hitRate"] = {"beat": beat, "of": n, "openBeat": beat_open, "openOf": n_open}
    data["lastUpdated"] = dt.date.today().isoformat()


def main():
    if "--init" in sys.argv or not os.path.exists(TRACK):
        if os.path.exists(TRACK) and "--force" not in sys.argv:
            sys.exit("track-record.json exists; refusing to re-init (use --init --force to overwrite)")
        data = init()
    else:
        with open(TRACK) as f:
            data = json.load(f)
    prices = data["prices"]
    last = max(prices)
    current = {k: load_picks(k) for k in LISTS}

    # 1) Append new trading days with real closes for every holding + every current pick + benchmarks.
    need = set(BENCH)
    for k, L in data["lists"].items():
        need |= {h["ticker"] for h in L["holdings"]}
        need |= {p["ticker"] for p in current[k]}
    fetched = {t: nasdaq_closes(t, last) for t in sorted(need)}
    held = set(BENCH) | {h["ticker"] for L in data["lists"].values() for h in L["holdings"]}
    new_days = sorted({d for t in BENCH for d in fetched[t] if d > last})
    for d in new_days:
        missing = [t for t in held if d not in fetched[t]]
        if missing:
            print(f"skip {d}: no close yet for {missing}")
            break
        prices[d] = {t: fetched[t][d] for t in need if d in fetched[t]}
    latest = max(prices)
    # 1b) Lists that are new to the file start at 100 on the latest stored close (no backfill).
    today_iso = dt.date.today().isoformat()
    for k in LISTS:
        if k in data["lists"] or not current.get(k):
            continue
        ps = current[k]
        closes = {p["ticker"]: nasdaq_closes(p["ticker"], latest).get(latest) for p in ps}
        missing = [t for t, v in closes.items() if v is None]
        if missing:
            print(f"{k}: can't start yet, no {latest} close for {missing}")
            continue
        for t, v in closes.items():
            prices[latest][t] = v
        data["lists"][k] = {
            "label": LISTS[k]["label"], "startDate": today_iso, "startPriceDate": latest,
            "holdings": [{"ticker": p["ticker"], "company": p.get("company", ""), "entryDate": today_iso,
                          "entryPriceDate": latest, "entryPrice": closes[p["ticker"]]} for p in ps],
            "closed": [],
            "segments": [{"start": latest, "startValue": 100.0, "tickers": [p["ticker"] for p in ps]}],
            "log": [{"date": today_iso, "priceDate": latest, "action": "start",
                     "note": f"Tracking began with the {len(ps)} published {LISTS[k]['label']} picks at the {latest} close",
                     "tickers": [p["ticker"] for p in ps]}],
        }
        print(f"{k}: started tracking {len(ps)} picks at the {latest} close")
    # Make sure every current pick has a close on the latest day (it may enter today).
    for t in need:
        if t not in prices[latest] and latest in fetched.get(t, {}):
            prices[latest][t] = fetched[t][latest]

    # 2) Pick changes -> close / open at the latest close, then rebalance.
    today = dt.date.today().isoformat()
    for k, L in data["lists"].items():
        cur = {p["ticker"]: p for p in current[k]}
        held_now = {h["ticker"] for h in L["holdings"]}
        removed = [h for h in L["holdings"] if h["ticker"] not in cur]
        added = [cur[t] for t in cur if t not in held_now]
        if not removed and not added:
            continue
        unpriced = [p["ticker"] for p in added if p["ticker"] not in prices[latest]]
        if unpriced:
            print(f"{k}: can't open {unpriced} (no {latest} close); will retry next run")
            added = [p for p in added if p["ticker"] not in unpriced]
            if not removed and not added:
                continue
        for h in removed:
            px = prices[latest][h["ticker"]]
            L["closed"].append({**{k: v for k, v in h.items() if not k.startswith("lastPrice")}, "exitDate": today, "exitPriceDate": latest, "exitPrice": px})
            L["log"].append({"date": today, "priceDate": latest, "action": "remove", "ticker": h["ticker"],
                             "company": h.get("company", ""), "price": px})
        L["holdings"] = [h for h in L["holdings"] if h["ticker"] in cur]
        for p in added:
            px = prices[latest][p["ticker"]]
            L["holdings"].append({"ticker": p["ticker"], "company": p.get("company", ""), "entryDate": today,
                                  "entryPriceDate": latest, "entryPrice": px})
            L["log"].append({"date": today, "priceDate": latest, "action": "add", "ticker": p["ticker"],
                             "company": p.get("company", ""), "price": px})
        start_val = value_on(prices, L["segments"][-1], latest)
        tickers = [h["ticker"] for h in L["holdings"]]
        if L["segments"][-1]["start"] == latest:
            L["segments"][-1]["tickers"] = tickers  # second change on the same close: replace, don't stack
        else:
            L["segments"].append({"start": latest, "startValue": round(start_val, 6), "tickers": tickers})
        L["log"].append({"date": today, "priceDate": latest, "action": "rebalance",
                         "note": f"Rebalanced to equal weight across {len(tickers)} picks"})
        print(f"{k}: removed {[h['ticker'] for h in removed]}, added {[p['ticker'] for p in added]}")

    if "early" in data["lists"] and "Early Inflection" not in data.get("method", ""):
        data["method"] += (" Early Inflection was added on Oct 8, 2026: it starts at 100 on the "
                           f"{data['lists']['early']['startPriceDate']} close (no backfill), and its QQQ/SPY comparison and hit rate run from that start.")
    if "experiment" in data["lists"] and "Experiment Screener" not in data.get("method", ""):
        data["method"] += (" Experiment Screener was added on Oct 10, 2026: it starts at 100 on the "
                           f"{data['lists']['experiment']['startPriceDate']} close (no backfill) and holds however many stocks pass all eight rules (up to 12).")
    for k, nm in (("piotroski", "Piotroski"), ("magic", "Magic Formula")):
        if k in data["lists"] and f"{nm} was added" not in data.get("method", ""):
            data["method"] += f" {nm} was added on Oct 10, 2026, starting at 100 on the {data['lists'][k]['startPriceDate']} close (no backfill)."
    recompute(data)
    with open(TRACK, "w") as f:
        json.dump(data, f, indent=1)
        f.write("\n")
    for k, L in data["lists"].items():
        print(f"{L['label']}: {L['returnPct']:+.2f}% (vs QQQ {L['vsQQQPct']:+.2f} pts) hit {L['hitRate']}")
    print("latest close", data["latestDate"], "QQQ", data["benchSeries"]["QQQ"][-1], "SPY", data["benchSeries"]["SPY"][-1])


if __name__ == "__main__":
    main()
