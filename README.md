# Futura: personal investing app

A static web app (plain HTML, CSS and JS, with no build step and no backend). It uses a black-and-gold theme, the Cassiopeia constellation as its logo and motif, and is designed mobile-first.

```
index.html            app shell (top bar + bottom tabs on mobile, sidebar on desktop)
css/styles.css        theme
js/app.js             router, sections, rendering (add a tab = add an entry to SECTIONS)
extras/music.js       background music, guitar version (DISABLED, not loaded; see "Background music")
extras/music-piano.js background music, felt-piano version (DISABLED, not loaded)
fonts/                self-hosted Inter + Cormorant Garamond (OFL)
data/ipos.json        IPO Tracker data (rewritten every Sunday; see "Weekly IPO refresh")
data/growth-picks.json            Growth Picks data (preferred)
data/growth-picks.example.json    EXAMPLE DATA fallback, used only if growth-picks.json is missing
data/spacex.json      SpaceX tab: snapshot, IPO facts, fundamentals, investors, news
data/tesla.json       Tesla tab: same schema as spacex.json
data/sentiment.json   social-sentiment snapshot, written by scripts/refresh_sentiment.py
data/cassiopeia.json  Cassiopeia tab: mythology, observing, stars, deep-sky, motif note
data/companies/       Search deep-dive JSONs + index.json (AAPL, NVDA, MU, LITE, LUNR, CEG, ALM, MTRN, LEN; SPCX/TSLA aliased)
scripts/refresh_sentiment.py         refreshes data/sentiment.json (Python 3 stdlib only, no keys)
scripts/refresh-data.workflow.yml    optional GitHub Actions schedule (see "Automated refresh")
manifest.webmanifest  PWA manifest (start_url/scope "./" so it works under /futura/)
sw.js                 service worker: offline app shell + network-first data/*.json
icons/                app icons (192, 512, maskable 512, apple-touch 180, favicon, svg)
screenshots/          verification screenshots (not deployed)
```

Run locally: `python3 -m http.server 8080` in this folder, then open http://localhost:8080.
To host it, copy the folder to any static host. The app fetches JSON, so opening the file directly with `file://` won't work.
Data is fetched with `cache: no-cache`, so a refreshed JSON file shows up on the next reload.

### Installable app (PWA)
- `manifest.webmanifest`: name and short_name "Futura", `display: standalone`, black background and theme color, `start_url` and `scope` set to `./`.
- iOS: `apple-mobile-web-app-capable`, `black-translucent` status bar, `apple-mobile-web-app-title`, plus `icons/apple-touch-icon.png`. Safe-area insets (notch, home bar, landscape) are applied in `css/styles.css` and need `viewport-fit=cover`.
- `sw.js`: the app shell is precached and served stale-while-revalidate, so code changes appear on the next visit. `data/*.json` is fetched network-first and falls back to the cached copy when offline. Cross-origin requests (TradingView) are left alone.
- **To roll out a shell change** (new files, or anything you want picked up immediately), bump `VERSION` in `sw.js`. Old caches are deleted when the new worker activates.
- Install it from Safari with Share → Add to Home Screen, or from Chrome/Edge with the install icon in the address bar.

## Background music
> **Disabled for now (Oct 6, 2026).** The engine is kept at `extras/music.js`, but nothing loads it, so no toggles appear and no audio plays. The service worker doesn't cache it.
> **To re-enable:**
> 1. `git mv extras/music.js js/music.js`.
> 2. In `index.html`, add `<script src="js/music.js"></script>` just before `<script src="js/app.js"></script>`.
> 3. Add `"js/music.js"` to `SHELL_FILES` in `sw.js` and bump `VERSION`.
>
> **Piano alternative:** `extras/music-piano.js` exposes the same `window.FuturaMusic` API. To use it instead, follow the same steps with that file. It features a soft felt piano (additive synthesis with inharmonic partials, unison detune, per-partial decay and pedal), plus an airy formant "aah" choir, celesta and a 7 s shimmer reverb, in D minor at 68 BPM. At full fade-in it measures about −34 dBFS RMS and −17 dBFS peak.
>
> The toggle hooks in `js/app.js` (`musicButton`) and the `.music-toggle` styles in `css/styles.css` are still in place, so the buttons reappear automatically.

When enabled, `js/music.js` plays an original, generative instrumental for nylon-string guitar, celesta and an airy pad. It is synthesised in the browser with the Web Audio API, so the app ships no audio files and doesn't use any recorded or copyrighted material.
- **Guitar:** each note is a Karplus-Strong string (a soft, doubly lowpassed noise excitation plus a pick-position comb, run through a tuned, fractionally delayed, damped loop). A 10–20 ms attack ramp softens each pluck. Notes are cached and replayed through guitar-body EQ (resonances near 105 and 230 Hz, a 9 dB shelf cut above 3.2 kHz).
- **Celesta:** additive sine partials (the fundamental, a quiet 2nd and 4th, and a faint, short inharmonic 2.76× partial) play sparse high chord tones in D5–E6, mostly into the reverb.
- **Pad:** detuned sine and triangle pairs with slow 3 s swells, a 0.09 Hz tremolo and a slowly drifting lowpass.
- **Space:** a generated 5.6 s stereo convolution reverb with a 25 ms pre-delay and a slowly darkening tail. A subtle shimmer adds octave-up ghosts of the melody, the top guitar voices and the celesta, sent only to the reverb. A gentle limiter sits on the master bus.
- **Music:** D minor, 58 BPM, 3/4, fingerpicked eighths with rests (about 3–5 guitar notes per bar, pinches rare). The 16-bar cycle is Dm(add9), B♭maj7♯11, Gm9, Asus4–A7 | Dm/C, B♭maj7, Gm6, Asus2–A7♭9 | Fmaj7, B♭maj7♯11, Fmaj7/A, Cadd9/E, Dm9, B♭maj7, Gm9, Asus4–A7. Bars 9–12 bring the major colour, with the celesta appearing more often there. On each pass the picking pattern, dropped notes, a sparse stepwise melody, celesta notes, the pad, and small timing and velocity details are re-chosen, so it plays indefinitely without an audible loop point.
- **UX:** the preference is stored in `localStorage.music` (`"on"` by default, or `"off"`). Browsers block autoplay with sound, so playback starts on the first click, tap or key press, with a 3.5 s fade-in. The gold note buttons (top bar on mobile, sidebar on desktop, and the Home hero) toggle it. Music fades out and the AudioContext is suspended when the page is hidden, then resumes when it's visible again. On iOS, `navigator.audioSession.type = "ambient"` is set where supported, so the ringer/silent switch is respected and other audio isn't interrupted.
- **Levels:** checked from a 120 s offline render (`FuturaMusic.render(seconds, seed)` returns an AudioBuffer): peak about −17 dBFS, RMS about −34 dBFS, no clipping, no clicks, string tuning within ±5 cents.

## Search

`#/search` (and `#/search?t=AAPL`) looks up a US ticker. **Live** TradingView quote, chart and news widgets always load for the typed symbol. **Deep analysis** (fundamentals, investors, curated news, sentiment) only appears when a local JSON file exists:

- `data/companies/index.json` — map of ticker → file (includes aliases `SPCX` → `spacex.json`, `TSLA` → `tesla.json`)
- `data/companies/{TICKER}.json` — same schema as `spacex.json` / `tesla.json`

Seeded deep dives: AAPL, NVDA, MU, LITE, LUNR, CEG, ALM, MTRN, LEN, SPCX, TSLA.

**Deep-dive grades.** `python3 scripts/futura_grades.py` (run by the daily refresh after the lists are graded) also grades every
deep dive (`data/companies/*.json`, `spacex.json`, `tesla.json`) A+ to F on Growth, Value, Momentum and Profit, percentile-ranked
against a reference pool of every Growth, Risk It and Early Inflection pick and backup (deduplicated) plus the ticker itself.
It writes `grades`, `gradeInputs`, `gradeMetrics`, `grading` (pool note, inputs, sources) and `earlyInflection` (the Early
Inflection checklist and 0–100 score: copied from the screen when the ticker is in it, otherwise computed off-screen with
`update_early_inflection.evaluate_ticker()`) and `listContext` (rank, score, risk level and score breakdown copied from any
Growth, Risk It or Early Inflection list the ticker is on, shown as an "On Risk It"-style panel). Hand-curated `runContext` (e.g. LITE's 2025 run) and `gradeNote` fields are left
alone. The Search view shows these in a **Grades** section above Fundamentals. Only grades: `--only=companies`. For any other ticker the Live widgets still work and the page shows an honest empty state ("No deep dive on file… Ask Investing App to research this ticker"). Recent searches are stored in `localStorage.searchRecent`. On mobile, Search lives under **More**.

## Home

`#/home` is the default route, so a bare URL and the installed PWA (`start_url: "./"`) both open here. It shows the Cassiopeia hero, the FUTURA wordmark and the motto "looking higher", then the Search form (same as `#/search`) and two Index ETF cards (VOO and QQQ) from `data/etfs.json`. Section tiles were removed from Home; the bottom tab bar / desktop sidebar still reach every section. On mobile the tab bar shows Home, IPOs, Growth, SpaceX, Tesla and More. Search and Cassiopeia live under More (`overflow: true`).

## data/ipos.json schema

```jsonc
{
  "schemaVersion": 1,
  "lastUpdated": "YYYY-MM-DD",          // shown as "Last updated"
  "weekLabel": "Week of Oct 5–9, 2026", // page title
  "headline": "short headline",         // optional
  "summary": "one paragraph",
  "highlights": [ { "text": "...", "unconfirmed": true, "note": "Reported, not confirmed" } ], // optional
  "sections": {
    "thisWeek":       { "label": "This week", "dateRange": "Oct 5–9", "ipos": [IPO, ...] },
    "nextTwoWeeks":   { "label": "Next 2 weeks", "dateRange": "Oct 12–23",
                        "weeks": [ { "label": "Week of Oct 12–16", "ipos": [...] },
                                   { "label": "Week of Oct 19–23", "ipos": [...] } ] },
    "newFilings":     { "label": "New filings", "ipos": [...] },
    "pulledDeals":    { "label": "Pulled / postponed", "ipos": [...] },
    "pastTwoWeeks":   { "label": "Past 2 weeks", "dateRange": "Sep 21 – Oct 2",
                        "weeks": [ { "label": "Week of Sep 28 – Oct 2", "ipos": [...] },
                                   { "label": "Week of Sep 21 – 25", "ipos": [...] } ] }
  }
}
```

Any group can use either a flat `"ipos": [...]` list or `"weeks": [{label, ipos}]` sub-groups (rendered with week headers).
`nextTwoWeeks` replaced the old flat `nextWeek` group, and `pastTwoWeeks` replaced `lastWeekDebuts`. The app still renders `nextWeek` and `lastWeekDebuts` if a file includes them.
Reported dates that aren't on an official calendar (single-source dates, expected filings such as Anthropic's) go in with `unconfirmed: true` and an `unconfirmedNote`. An expected filing that isn't a trade date gets a `status` such as "Filing expected".
The **Past 2 weeks** toggle (default on) shows or hides the `pastTwoWeeks` group and its jump chip. Both toggles are stored in localStorage
(`showPastTwoWeeks`, `hideSpacs`), so they persist across visits.

IPO object (use the string `"n/a"` for anything unknown):

| field | type | notes |
|---|---|---|
| id | string | unique slug (keeps expanded state) |
| company, ticker, exchange | string | |
| tradeDate, priceRange, dealSize | string | free text for display, e.g. "Fri, Oct 9", "$14–$16", "~$125M" |
| description | string | one line |
| isSpac | bool | shows the SPAC tag; the "Hide SPACs" toggle filters these out |
| unconfirmed | bool | shows the Unconfirmed flag and a dashed border |
| unconfirmedNote | string? | what exactly is unconfirmed |
| status | string? | e.g. "Postponed" (red tag) |
| performance | {text, direction: "up"\|"down"}? | debut performance strip |
| returns | object? | debut performance tiles: `firstDay` ("+14%"), `firstDayNote`, `latest` (return since IPO, "+9.3%"), `latestPrice`, `latestDate` (YYYY-MM-DD), `latestNote`. Values starting with + are shown green, values starting with - red, and 0% neutral |
| sourceUrl | string \| string[] \| null | opens in a new tab; arrays render as "Source 1 · 2 · 3"; null shows "Source: n/a" |
| detail | object? | adds a Details expander: `intro` (string), `facts` ([{label, value}]), `table` ({caption, columns[], rows[][]}, where values in parentheses are shown in red), `bullets` (string[]), `sourceUrl`, `sourceLabel` |

### Weekly IPO refresh (Sundays)
Each Sunday `data/ipos.json` is rewritten to cover:
1. **This week**: the coming Monday–Friday (`thisWeek`, flat `ipos`).
2. **Next 2 weeks**: the two weeks after that, grouped by week (`nextTwoWeeks.weeks`, two entries).
3. **New filings**: new S-1/F-1 filings since the last refresh (`newFilings`).
4. **Pulled / postponed**: deals withdrawn or postponed (`pulledDeals`).
5. **Past 2 weeks**: debuts from the previous two weeks, grouped by week, with first-day and since-IPO returns (`pastTwoWeeks.weeks`).

Sources: the Renaissance Capital calendar and news, the IPOScoop calendar, the Nasdaq and NYSE IPO calendars, company releases and SEC filings, and news reports. Only include sourced facts, use `"n/a"` when a field is missing, and flag anything unconfirmed. Also update `lastUpdated`, `weekLabel`, `summary` and `highlights`, and roll each week's group forward.

## data/growth-picks.json schema

```jsonc
{
  "lastUpdated": "YYYY-MM-DD",
  "method": "how picks were chosen",
  "dataNotes": "optional data-source note",
  "disclaimer": "text",
  "picks": [{
    "company": "", "ticker": "", "sector": "Technology – Semiconductors",  // filter chips use the part before " – "
    "price": 123.45, "priceDate": "YYYY-MM-DD",
    "marketCap": "$1.18T",            // string as displayed (numbers are treated as $B if < 100000)
    "forwardPE": 16.7, "peg": 0.55,   // number or "n/a"
    "revenueGrowth": "+21.6% YoY (TTM ...)",  // a trailing "(...)" is shown as small print
    "trend": "", "fundamentals": "", "risks": ["..."],
    "analystRating": "", "priceTarget": 237.97,   // numeric price + target gives upside %
    "sourceUrl": "https://..."        // string or array of strings
  }],
  "bench": [{ "rank": 1, /* same fields as picks */ }]  // optional ranked backups, best-first
}
```
**Bench / dismiss.** Each Growth Pick card has an × button. Dismissing saves the ticker to
`localStorage["growthDismissed"]` and the slot is refilled with the lowest-`rank` bench entry not
dismissed (and not already shown), keeping `picks.length` (12) cards visible. "Restore dismissed (N)"
clears the list. Bench entries must use the same screen, sources and `n/a` rule as `picks`; keep
~15–20 of them, re-rank best-first on every refresh, and never duplicate a ticker that is in `picks`.

The page offers sorting by revenue growth, upside to target, PEG, forward P/E, market cap, or A–Z, and filtering by sector.

## data/spacex.json and data/tesla.json schema

Both files share one schema. Every displayed number has a source link nearby, and anything missing is shown as `"n/a"`.

```jsonc
{
  "lastUpdated": "YYYY-MM-DD",
  "company": "SpaceX", "ticker": "SPCX", "exchange": "NASDAQ",
  "tvSymbol": "NASDAQ:SPCX",          // TradingView symbol for the live widgets
  "status": "public" | "private",
  "tagline": "one line",
  "statusNote": "optional banner text (e.g. IPO / private-company status)",
  "ipo": {                             // optional; SpaceX only
    "date", "price", "proceeds", "valuationAtIpo", "firstDayClose", "leads", "lockup",
    "sources": [{ "label", "url" }]
  },
  "snapshot": { "price": 171.92, "change": "+0.49%", "asOf": "Oct 6, 2026 close", "marketCap", "range52w", "sourceUrl" },
  "fundamentals": {
    "asOf": "text", "kpiSource": "url",
    "kpis": [{ "label", "value", "note"? }],          // value starting with − or - is shown red, + green
    "tables": [{ "caption", "columns": [], "rows": [[]], "sourceUrl", "sourceLabel" }],   // "(123)" cells are shown red
    "notes": ["text"], "notesSourceUrl": "url",
    "analyst": { "rating", "count", "priceTarget", "upside", "sourceUrl", "calls": [{ "text", "url"|null }] },
    "catalysts": [{ "date": "YYYY-MM-DD" | "YYYY-MM" | "TBD", "event", "status": "confirmed|scheduled|expected|estimate|reported|unconfirmed|unscheduled", "url" }],
    "bull": [{ "text", "url" }], "bear": [{ "text", "url" }]
  },
  "investors": {
    "insiders": [{ "name", "shares", "pct", "pctNote"?, "asOf", "sourceUrl", "sourceLabel", "extraSources"?: [{label,url}], "bullets": [] }],
    "institutions": { "asOf": "YYYY-MM-DD", "note", "sourceUrl",
      "rows": [{ "name", "shares", "pct", "value", "change", "note"?, "url"?, "estimate"?: true }] },   // estimate => "est." badge
    "notes": ["text"], "sources": [{ "label", "url" }]
  },
  "news": [{ "date": "YYYY-MM-DD", "outlet", "title", "summary", "url" }]   // ~10 latest
}
```

## data/sentiment.json (social sentiment)

Written by `python3 scripts/refresh_sentiment.py`, which takes no keys and uses only the standard library. The browser can't query these sources directly because none of them send CORS headers, so the site reads this snapshot instead. It covers TSLA, SPCX and every ticker in `data/companies/index.json`.

| Source | What it measures |
| --- | --- |
| StockTwits public stream | Bullish vs. bearish tags on the last ~120 messages per symbol (untagged messages are ignored for the ratio) |
| ApeWisdom | 24h mention count, rank, and upvotes across Reddit investing subs and 4chan /biz/, compared with the previous 24h |
| Tradestie | Daily r/wallstreetbets sentiment score (−1 to +1), available only when the ticker is in WSB's top 50 |

Not used: the Reddit API (needs OAuth; returns 403 without it), the X/Twitter API (paid), and Google Trends (no official API). The page links out to those sites instead.

```jsonc
{ "lastUpdated": "ISO-8601 UTC", "method": "text", "unavailable": [{ "source", "reason" }],
  "symbols": { "TSLA": { "stocktwits": {...}, "apewisdom": {...}, "wsbTradestie": {...} }, "SPCX": {...} } }
```
Any source that fails gets `"status": "unavailable"` with an error message. Values are never made up.

## Live data
The SpaceX and Tesla tabs embed free TradingView widgets (symbol quote, advanced chart, headline timeline). They load client-side, need no API key, and may be delayed per exchange rules. When the widgets are offline or blocked, the page falls back to the JSON snapshot.

## Automated refresh (optional)
`scripts/refresh-data.workflow.yml` is a ready-made GitHub Actions workflow that runs `refresh_sentiment.py` every few hours and commits `data/sentiment.json`. It isn't installed yet because pushing files under `.github/workflows/` requires a token with the `workflow` scope. To enable it, run `mkdir -p .github/workflows && git mv scripts/refresh-data.workflow.yml .github/workflows/refresh-data.yml`, then push with a token that has `workflow` scope (`gh auth refresh -s workflow`), or add the file in the GitHub web UI. Fundamentals and news in `spacex.json` and `tesla.json` are curated by hand and are not scraped.

## Risk It (`data/risk-it.json`)

A separate, **speculative** tab with the same card format as Growth: × dismiss with its own ranked bench, Restore, Follow chips, and sort/filter. Growth stays the conservative GARP screen, and no ticker may appear in both files.
- **Exclusions (Growth and Risk It):** bitcoin/crypto miners (`MINERS`) and crypto-treasury companies whose main strategy is holding/staking crypto (`CRYPTO_TREASURY`, e.g. SBET, BMNR, MSTR; user-approved Oct 10, 2026). Both sets live in `scripts/update_early_inflection.py`; never put either in picks or bench.

- Schema: the same fields as growth-picks.json, plus `disclaimer`, and on each entry `score` (0–100), `drivers` (string list), `riskLevel` ("High" | "Very High") and `risks`.
- `picks` holds 12 entries. `bench` holds 15–20, ranked with `rank` 1..N. A ticker must not appear in both picks and bench, or in growth-picks.json.
- Score: revenue growth TTM YoY, up to 40 (full marks at ≥150%) · acceleration (TTM > prior FY growth), +5 · 1-yr market-cap change as the momentum proxy, up to 25 (clamp((chg+50)/150×25)) · upside to the consensus target, up to 20 (full marks at ≥100%) · consensus Strong Buy 10 / Buy 7 / Hold 2.
- localStorage: `riskItDismissed`, `riskItSort`.

## Early Inflection (`#/early`, `data/early-inflection.json`)

Under More, and linked from the Growth and Risk It tabs. Looks for "early LITE-2025" setups: revenue that has bottomed and is accelerating, rising margins, strong forward growth, a reasonable price, and a stock that hasn't already run. Same card format as Growth/Risk It (× dismiss with its own ranked bench, Restore, Follow chips, sort/filter, letter grades, live prices), plus a met/missed checklist, key figures and a collapsible score breakdown on every card. Tickers may also appear in Growth or Risk It; they are tagged "Also in Growth" etc.

- Rebuilt by `python3 scripts/update_early_inflection.py` (stdlib, no keys; about 5–10 minutes). Universe: every US-listed $1B–$30B stock on Nasdaq's public screener, minus Finance/Real Estate, bitcoin/crypto miners and known pending-merger targets (`PENDING_DEALS` in the script, e.g. VECO). Filters from StockAnalysis statistics: 3+ analysts with a target, $100M+ TTM revenue (USD, market cap ÷ P/S), $5M+/day average dollar volume; latest-quarter revenue growing and 8%+ implied next-12-month growth. The top 70 also get Nasdaq daily closes (1-yr move, 52-week high, 3-month relative strength) and a pinned-price check that drops likely cash-deal targets.
- Score 0–100: revenue acceleration 20 · margin expansion 15 · forward growth 15 · valuation 15 · not already run 10 (−5 more over +300% in a year) · trend turning 10 · analysts 10 · AI-infrastructure bottleneck theme 5 (by StockAnalysis industry, plus a few overrides). Top 12 = `picks`, next 18 = `bench` (`rank` 1..N), at most 3 per industry. The rubric text lives in `rubric`.
- Each entry: `score`, `scoreParts`, `checklist[]` ({key,label,met:true|false|null,detail}), `drivers`, `keyFigures[]`, `trend`, `fundamentals`, `risks`, `alsoIn`, `eiMetrics`, optional `catalyst` ({text, source, asOf}). Hand-written catalyst notes go in top-level `catalystNotes{TICKER:{text,source,asOf}}` and survive reruns.
- Revision history: every run saves `[priceTarget, psForward, forwardPE]` for the top 150 names to `data/early-inflection-history.json` (not loaded by the app). The "Targets / estimates being raised" checklist item switches from n/a to met/missed once 30 days of history exist.
- localStorage: `earlyDismissed`, `earlySort`.

## Track record (`#/track`, `data/track-record.json`)
Under More, and linked from the Growth, Risk It and Early Inflection tabs. Each list is an equal-weight portfolio of its current 12 picks, valued at 100 on the Oct 6, 2026 close (tracking began Oct 7, 2026). Early Inflection joined later and is valued at 100 on the Oct 7, 2026 close (no backfill); its benchmark comparison runs from its own start. Buy-and-hold between pick changes; rebalanced to equal weight at the close whenever a pick is added or removed. Price returns only. QQQ and SPY are indexed to 100 on the same date. Hit rate = picks whose return beat QQQ over the same holding period.
- Maintained by `python3 scripts/update_track_record.py` (stdlib, no keys). It appends real daily closes from Nasdaq's public historical endpoint, detects pick changes against `picks` in growth-picks.json / risk-it.json / early-inflection.json, starts any list that is new to the file at the latest stored close, logs adds/removes with date and price, rebalances, and recomputes `series`, per-pick returns and `hitRate`. Idempotent; never invents prices (a day is skipped until every holding has a real close). `--init` creates the file (refuses to overwrite without `--force`).
- Schema: `trackingStart`, `baseDate`, `latestDate`, `method`, `prices{date:{ticker:close}}`, `benchSeries{QQQ,SPY:[[date,value]]}`, `lists.{growth,riskit,early}` with `startDate`, `startPriceDate`, `holdings[]` (entryDate, entryPriceDate, entryPrice, lastPrice, returnPct, qqqPct, spyPct, beatQQQ), `closed[]` (plus exitDate/exitPriceDate/exitPrice), `segments[]` (start, startValue, tickers), `log[]` (start/add/remove/rebalance), `series`, `returnPct`, `vsQQQPct`, `vsSPYPct`, `hitRate`.

## Letter grades (Growth, Risk It & Early Inflection cards)
`python3 scripts/futura_grades.py` stores raw inputs in each pick/bench entry's `metrics` and A+..F letters in `grades` (`growth`, `value`, `momentum`, `profitability`) plus `gradeInputs` ("2/3" = inputs available), and a top-level `grading` block. Grades are percentile ranks within that list's pool (picks + bench): Growth = TTM revenue growth + EPS growth forecast (3Y); Value = forward P/E, PEG, EV/Sales (lower better; negative = worst); Momentum = 1-yr price change minus SPY's, 6-mo and 3-mo change; Profitability = gross, operating, net, FCF margin. Input ranks are averaged, re-ranked, and mapped (A+ ≥97th pct … F <23rd). `n/a` when no inputs; `*` when partial. Sources: StockAnalysis statistics pages and Nasdaq historical closes. `--no-fetch` re-grades from stored metrics (run it after editing picks/bench by hand).

## Live quotes
Every price block with `data-lq="TICKER"` (Growth/Risk It cards, Following rows, IPO cards with a trading ticker, SpaceX/Tesla header, VOO/QQQ cards, Track record "Today" column) is painted from CNBC's public quote service (`quote.cnbc.com/quote-html-webservice/restQuote/...`, CORS `*`, no key). One batched request per page (≤50 symbols per call), every 45 s during pre/regular/after-hours, every 5 min when closed, paused while the tab is hidden. Non-US or non-USD matches (e.g. an IPO ticker colliding with a Tel Aviv listing) are ignored. If the feed fails, the card keeps the daily close from the JSON and says so. The endpoint is unofficial and undocumented, so it may change or disappear; quotes flagged `realTime:false` show "delayed".
