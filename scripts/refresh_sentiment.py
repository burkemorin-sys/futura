#!/usr/bin/env python3
"""Refresh data/sentiment.json from free, key-less public sources.

Sources (all fetched server-side; none send CORS headers, so a browser can't call them directly):
  - StockTwits public symbol stream: last N messages, counts of user-tagged Bullish/Bearish.
  - ApeWisdom: Reddit/4chan mention counts (24h) and rank across all stocks.
  - Tradestie: WallStreetBets top-50 sentiment (only if the ticker appears in the top 50).
Any source that fails is recorded with status "unavailable" and an error note; nothing is invented.
Usage: python3 scripts/refresh_sentiment.py [--pages 4]
"""
import json, sys, time, urllib.request, urllib.error, datetime, pathlib, argparse

UA = {"User-Agent": "Mozilla/5.0 (compatible; FuturaDashboard/1.0; +https://burkemorin-sys.github.io/futura/)"}
BASE_TICKERS = ["TSLA", "SPCX"]
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "sentiment.json"
INDEX = OUT.parent / "companies" / "index.json"


def deep_dive_tickers():
    """TSLA and SPCX plus every Search deep dive listed in data/companies/index.json."""
    out = list(BASE_TICKERS)
    try:
        for t in json.loads(INDEX.read_text()).get("tickers", {}):
            if t.upper() not in out:
                out.append(t.upper())
    except Exception:
        pass
    return out


TICKERS = deep_dive_tickers()


def get_json(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def stocktwits(sym, pages):
    url = f"https://api.stocktwits.com/api/2/streams/symbol/{sym}.json"
    msgs, max_id = [], None
    for _ in range(pages):
        d = get_json(url + (f"?max={max_id}" if max_id else ""))
        batch = d.get("messages", [])
        if not batch:
            break
        msgs.extend(batch)
        max_id = d.get("cursor", {}).get("max")
        if not d.get("cursor", {}).get("more"):
            break
        time.sleep(1.5)
    bull = sum(1 for m in msgs if ((m.get("entities") or {}).get("sentiment") or {}).get("basic") == "Bullish")
    bear = sum(1 for m in msgs if ((m.get("entities") or {}).get("sentiment") or {}).get("basic") == "Bearish")
    times = sorted(m.get("created_at") for m in msgs if m.get("created_at"))
    tagged = bull + bear
    return {
        "status": "ok",
        "messagesSampled": len(msgs),
        "bullish": bull,
        "bearish": bear,
        "untagged": len(msgs) - tagged,
        "bullishPctOfTagged": round(100 * bull / tagged, 1) if tagged else None,
        "windowStart": times[0] if times else None,
        "windowEnd": times[-1] if times else None,
        "watchlistCount": (d.get("symbol") or {}).get("watchlist_count"),
        "url": f"https://stocktwits.com/symbol/{sym}",
    }


def apewisdom(tickers):
    found = {}
    page, pages = 1, 1
    while page <= pages and len(found) < len(tickers):
        d = get_json(f"https://apewisdom.io/api/v1.0/filter/all-stocks/page/{page}")
        pages = d.get("pages", 1)
        for r in d.get("results", []):
            if r.get("ticker") in tickers:
                found[r["ticker"]] = r
        page += 1
        time.sleep(1)
    out = {}
    for t in tickers:
        r = found.get(t)
        out[t] = ({"status": "ok", "rank": r.get("rank"), "mentions24h": r.get("mentions"), "mentionsPrev24h": r.get("mentions_24h_ago"),
                   "upvotes24h": r.get("upvotes"), "rankPrev24h": r.get("rank_24h_ago"), "url": f"https://apewisdom.io/stocks/{t}/"}
                  if r else {"status": "not-listed", "note": "Ticker not in ApeWisdom's current all-stocks ranking."})
    return out


def tradestie(tickers):
    rows = get_json("https://tradestie.com/api/v1/apps/reddit")
    by = {r.get("ticker"): r for r in rows}
    return {t: ({"status": "ok", "sentiment": by[t].get("sentiment"), "score": by[t].get("sentiment_score"), "comments": by[t].get("no_of_comments")}
                if t in by else {"status": "not-in-top-50", "note": "Not among today's top-50 WallStreetBets tickers on Tradestie."}) for t in tickers}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=4)
    a = ap.parse_args()
    result = {
        "lastUpdated": now_iso(),
        "method": ("Snapshot computed server-side (none of these sources allow browser CORS requests). StockTwits: the most recent "
                   f"~{a.pages * 30} public messages per symbol, counting messages the author tagged Bullish or Bearish; untagged messages are ignored for the ratio. "
                   "ApeWisdom: 24-hour mention counts across Reddit investing subreddits (incl. r/wallstreetbets) and 4chan /biz/. "
                   "Tradestie: WallStreetBets daily sentiment score, only for its top-50 tickers. Small samples are noisy; treat as a mood gauge, not a signal."),
        "unavailable": [
            {"source": "Reddit JSON API (r/teslainvestorsclub, r/SpaceX, r/wallstreetbets)", "reason": "reddit.com returns HTTP 403 to unauthenticated server requests and sends no CORS headers; OAuth app credentials would be required."},
            {"source": "X / Twitter", "reason": "API access is paid; not used."},
            {"source": "Google Trends", "reason": "No official public API; unofficial endpoints are rate-limited/blocked."},
        ],
        "symbols": {},
    }
    ape, tdz = {}, {}
    try:
        ape = apewisdom(TICKERS)
    except Exception as e:
        ape = {t: {"status": "unavailable", "error": str(e)[:200]} for t in TICKERS}
    try:
        tdz = tradestie(TICKERS)
    except Exception as e:
        tdz = {t: {"status": "unavailable", "error": str(e)[:200]} for t in TICKERS}
    for t in TICKERS:
        try:
            st = stocktwits(t, a.pages)
        except Exception as e:
            st = {"status": "unavailable", "error": str(e)[:200]}
        result["symbols"][t] = {"stocktwits": st, "apewisdom": ape.get(t), "wsbTradestie": tdz.get(t)}
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result["symbols"], indent=1))


if __name__ == "__main__":
    main()
