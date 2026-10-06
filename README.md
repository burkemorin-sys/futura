# Futura: personal investing app

A static web app (plain HTML, CSS and JS, with no build step and no backend). It uses a black-and-gold theme, the Cassiopeia constellation as its logo and motif, and is designed mobile-first.

```
index.html            app shell (top bar + bottom tabs on mobile, sidebar on desktop)
css/styles.css        theme
js/app.js             router, sections, rendering (add a tab = add an entry to SECTIONS)
js/music.js           original generative background music (Web Audio, no audio files)
fonts/                self-hosted Inter + Cormorant Garamond (OFL)
data/ipos.json        IPO Tracker data (rewritten every Sunday; see "Weekly IPO refresh")
data/growth-picks.json            Growth Picks data (preferred)
data/growth-picks.example.json    EXAMPLE DATA fallback, used only if growth-picks.json is missing
data/spacex.json      SpaceX tab: snapshot, IPO facts, fundamentals, investors, news
data/tesla.json       Tesla tab: same schema as spacex.json
data/sentiment.json   social-sentiment snapshot, written by scripts/refresh_sentiment.py
data/cassiopeia.json  Cassiopeia tab: mythology, observing, stars, deep-sky, motif note
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
`js/music.js` plays an original, generative instrumental for nylon-string guitar, celesta and an airy pad. It is synthesised in the browser with the Web Audio API, so the app ships no audio files and doesn't use any recorded or copyrighted material.
- **Guitar:** each note is a Karplus-Strong string (a soft, doubly lowpassed noise excitation plus a pick-position comb, run through a tuned, fractionally delayed, damped loop). A 10–20 ms attack ramp softens each pluck. Notes are cached and replayed through guitar-body EQ (resonances near 105 and 230 Hz, a 9 dB shelf cut above 3.2 kHz).
- **Celesta:** additive sine partials (the fundamental, a quiet 2nd and 4th, and a faint, short inharmonic 2.76× partial) play sparse high chord tones in D5–E6, mostly into the reverb.
- **Pad:** detuned sine and triangle pairs with slow 3 s swells, a 0.09 Hz tremolo and a slowly drifting lowpass.
- **Space:** a generated 5.6 s stereo convolution reverb with a 25 ms pre-delay and a slowly darkening tail. A subtle shimmer adds octave-up ghosts of the melody, the top guitar voices and the celesta, sent only to the reverb. A gentle limiter sits on the master bus.
- **Music:** D minor, 58 BPM, 3/4, fingerpicked eighths with rests (about 3–5 guitar notes per bar, pinches rare). The 16-bar cycle is Dm(add9), B♭maj7♯11, Gm9, Asus4–A7 | Dm/C, B♭maj7, Gm6, Asus2–A7♭9 | Fmaj7, B♭maj7♯11, Fmaj7/A, Cadd9/E, Dm9, B♭maj7, Gm9, Asus4–A7. Bars 9–12 bring the major colour, with the celesta appearing more often there. On each pass the picking pattern, dropped notes, a sparse stepwise melody, celesta notes, the pad, and small timing and velocity details are re-chosen, so it plays indefinitely without an audible loop point.
- **UX:** the preference is stored in `localStorage.music` (`"on"` by default, or `"off"`). Browsers block autoplay with sound, so playback starts on the first click, tap or key press, with a 3.5 s fade-in. The gold note buttons (top bar on mobile, sidebar on desktop, and the Home hero) toggle it. Music fades out and the AudioContext is suspended when the page is hidden, then resumes when it's visible again. On iOS, `navigator.audioSession.type = "ambient"` is set where supported, so the ringer/silent switch is respected and other audio isn't interrupted.
- **Levels:** checked from a 120 s offline render (`FuturaMusic.render(seconds, seed)` returns an AudioBuffer): peak about −17 dBFS, RMS about −34 dBFS, no clipping, no clicks, string tuning within ±5 cents.

## Home

`#/home` is the default route, so a bare URL and the installed PWA (`start_url: "./"`) both open here. It reuses the Cassiopeia hero animation and shows a FUTURA wordmark, the motto "looking higher", and one tile per section. Tile teasers are read from the data files only: the count of `ipos.json` → `sections.thisWeek`, the number of `growth-picks.json` → `picks`, the `snapshot.price` / `change` / `asOf` values from `spacex.json` and `tesla.json`, and the number of stars in `cassiopeia.json`. If a file fails to load, its tile falls back to a static description. On mobile the tab bar shows Home, IPOs, Growth, SpaceX, Tesla and More. Cassiopeia appears under More (`overflow: true` in `SECTIONS`).

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
  }]
}
```
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

Written by `python3 scripts/refresh_sentiment.py`, which takes no keys and uses only the standard library. The browser can't query these sources directly because none of them send CORS headers, so the site reads this snapshot instead.

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
