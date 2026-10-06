# Futura: personal investing app

A static web app (plain HTML, CSS and JS, with no build step and no backend). It uses a black-and-gold theme, the Cassiopeia constellation as its logo and motif, and is designed mobile-first.

```
index.html            app shell (top bar + bottom tabs on mobile, sidebar on desktop)
css/styles.css        theme
js/app.js             router, sections, rendering (add a tab = add an entry to SECTIONS)
fonts/                self-hosted Inter + Cormorant Garamond (OFL)
data/ipos.json        IPO Tracker data (rewritten weekly)
data/growth-picks.json            Growth Picks data (preferred)
data/growth-picks.example.json    EXAMPLE DATA fallback, used only if growth-picks.json is missing
screenshots/          verification screenshots
```

Run locally: `python3 -m http.server 8080` in this folder, then open http://localhost:8080.
To host it, copy the folder to any static host. The app fetches JSON, so opening the file directly with `file://` won't work.
Data is fetched with `cache: no-cache`, so a refreshed JSON file shows up on the next reload.

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
    "nextWeek":       { "label": "Next week", "dateRange": "Oct 12–16", "ipos": [...] },
    "newFilings":     { "label": "New filings", "ipos": [...] },
    "pulledDeals":    { "label": "Pulled / postponed", "ipos": [...] },
    "pastTwoWeeks":   { "label": "Past 2 weeks", "dateRange": "Sep 21 – Oct 2",
                        "weeks": [ { "label": "Week of Sep 28 – Oct 2", "ipos": [...] },
                                   { "label": "Week of Sep 21 – 25", "ipos": [...] } ] }
  }
}
```

Any group can use either a flat `"ipos": [...]` list or `"weeks": [{label, ipos}]` sub-groups (rendered with week headers).
`pastTwoWeeks` replaced the old `lastWeekDebuts` group; the app still renders `lastWeekDebuts` if a file includes it.
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
