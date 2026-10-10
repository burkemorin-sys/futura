"""US-listed common stocks over a market-cap floor from Nasdaq's public screener (shared by the screener tabs)."""
import json

import update_early_inflection as ei


def universe(mcap_min=2e9, exclude_sectors=()):
    d = json.loads(ei.get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", accept="application/json", timeout=90))
    rows = d["data"]["rows"]
    uni, seen, miners = [], set(), []
    for r in rows:
        sym = (r.get("symbol") or "").strip().upper()
        mcap = ei.fnum(r.get("marketCap"))
        name = r.get("name") or ""
        if not sym or not ei.re.fullmatch(r"[A-Z]{1,5}", sym) or mcap is None or mcap <= mcap_min:
            continue
        if ei.re.search(r"\b(warrant|right|unit|preferred|depositary shares? representing|notes due)\b", name, ei.re.I):
            continue
        if sym in ei.MINERS:
            miners.append(sym)
            continue
        if (r.get("sector") or "") in exclude_sectors:
            continue
        k = " ".join(ei.re.sub(r"\b(class|series)\s+[a-z]\b|common stock|capital stock|ordinary shares|american depositary shares?|[^a-z ]", " ", name.lower()).split())
        if k in seen:
            continue
        seen.add(k)
        uni.append({"ticker": sym, "name": name, "sector": r.get("sector") or "", "industry": r.get("industry") or "", "mcap": mcap})
    return uni, len(rows), miners


def also_in():
    import os
    out = ei.load_also_in()
    for fn, label in (("early-inflection.json", "Early Inflection"), ("experiment-screener.json", "Experiment"),
                      ("piotroski.json", "Piotroski"), ("magic-formula.json", "Magic Formula")):
        try:
            d = json.load(open(os.path.join(ei.ROOT, "data", fn)))
        except Exception:  # noqa: BLE001
            continue
        for p in d.get("picks") or []:
            out.setdefault(p["ticker"], []).append(label)
    return out


def keep_grades(out_path, data):
    try:
        prev = json.load(open(out_path))
    except Exception:  # noqa: BLE001
        return
    old = {e.get("ticker"): e for e in (prev.get("picks") or []) + (prev.get("bench") or [])}
    for e in (data.get("picks") or []) + (data.get("bench") or []):
        o = old.get(e["ticker"])
        if o and o.get("grades"):
            e["grades"], e["gradeInputs"] = o["grades"], o.get("gradeInputs", {})
    if prev.get("grading"):
        data["grading"] = prev["grading"]
