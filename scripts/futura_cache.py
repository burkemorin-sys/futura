"""Same-day cache of StockAnalysis statistics pages, shared by the screener scripts (avoids refetching ~2,000 pages)."""
import datetime as dt
import json
import os

import update_early_inflection as ei

CACHE_DIR = "/tmp/futura_cache"


def stats_for(tickers):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"stats-{dt.date.today().isoformat()}.json")
    cache = {}
    if os.path.exists(path):
        try:
            cache = json.load(open(path))
        except Exception:  # noqa: BLE001
            cache = {}
    need = [t for t in tickers if t not in cache]
    if need:
        got = ei.pmap(ei.sa_stats, need, "stats")
        for t, v in got.items():
            if isinstance(v, dict):
                cache[t] = v
        json.dump(cache, open(path, "w"))
    return {t: cache.get(t) for t in tickers}
