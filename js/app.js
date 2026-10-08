/* Futura: tiny hash-routed static app.
 * To add a section: add an entry to SECTIONS with id, label, short, icon and render(mainEl). */
(function () {
  "use strict";

  /* ---------------- Icons ---------------- */
  const ICONS = {
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 12l3 3"/><path d="M12 15l-3-3c1.5-4.5 5-9 11-9 0 6-4.5 9.5-9 11z"/><circle cx="15.5" cy="8.5" r="1.5"/>',
    growth: '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 6-7"/><path d="M15 7h4v4"/>',
    flame: '<path d="M12 3c.5 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.3 1.2-3.6 2.2-4.8.3 1.6 1 2.5 2 2.8-.4-2.6-.3-5.4.3-8z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 13.5v6M13.5 16.5h6"/>',
    ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    warn: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>',
    up: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
    down: '<path d="M4 7l6 6 4-4 6 7"/><path d="M15 16h5v-5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-28 12 12)"/><circle cx="19.6" cy="7.4" r="1.1"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.2c2.4-.3 4.1 1.3 4.5 4.3"/>',
    news: '<rect x="3.5" y="5" width="13" height="14" rx="1.5"/><path d="M16.5 9h3a1 1 0 0 1 1 1v7.5a1.5 1.5 0 0 1-3 0V9"/><path d="M6.5 9h7M6.5 12.5h7M6.5 16h4"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    home: '<path d="M4 11.5L12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10.5 19v-5h3v5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    cas: '<polyline points="3.5,8 7.5,14 12,10 16.5,16 20.5,8" fill="none"/><circle cx="3.5" cy="8" r="1.35"/><circle cx="7.5" cy="14" r="1.5"/><circle cx="12" cy="10" r="1.7"/><circle cx="16.5" cy="16" r="1.55"/><circle cx="20.5" cy="8" r="1.45"/>',
    star: '<path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.6 7.2 18.1l.9-5.4-3.9-3.8 5.4-.8z"/>',
    starFill: '<path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.6 7.2 18.1l.9-5.4-3.9-3.8 5.4-.8z" fill="currentColor" stroke="none"/>',
    grip: '<circle cx="9" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="17" r="1.2"/><circle cx="15" cy="17" r="1.2"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>',
    chevUp: '<path d="M6 14l6-6 6 6"/>',
    chevDown: '<path d="M6 10l6 6 6-6"/>',
    chart: '<path d="M4 4v16h16"/><path d="M7 15l4-5 3 3 5-7"/><circle cx="19" cy="6" r="1.2"/>',
    sunrise: '<path d="M3 18.5h18"/><path d="M7 18.5a5 5 0 0 1 10 0"/><path d="M12 5v3.5M5.6 9.6l1.9 1.9M18.4 9.6l-1.9 1.9M3 14.5h2M19 14.5h2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    minus: '<path d="M7 12h10"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isNA = (v) => v == null || v === "" || (typeof v === "number" && !isFinite(v)) || String(v).trim().toLowerCase() === "n/a";
  const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);

  /* Ticker helpers + Following watchlist (IPO / Growth / company / Search / Home ETFs). */
  const normalizeTicker = (raw) => String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9./-]/g, "").slice(0, 12);
  const isValidTicker = (t) => /^[A-Z][A-Z0-9./-]{0,9}$/.test(t);
  const SEARCH_RECENT_KEY = "searchRecent";
  const FOLLOWING_KEY = "followingTickers";
  const FOLLOWING_DEFAULT = ["SPCX", "TSLA", "NVDA", "AAPL", "MU"];
  const searchState = { index: null, recent: [], following: [], editMode: false };
  try { searchState.recent = JSON.parse(localStorage.getItem(SEARCH_RECENT_KEY) || "[]"); } catch (e) { searchState.recent = []; }
  function loadFollowing() {
    try {
      const raw = localStorage.getItem(FOLLOWING_KEY);
      if (raw == null) throw new Error("missing");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("bad");
      return parsed.map(normalizeTicker).filter(isValidTicker).filter((t, i, a) => a.indexOf(t) === i);
    } catch (e) {
      const seed = FOLLOWING_DEFAULT.slice();
      try { localStorage.setItem(FOLLOWING_KEY, JSON.stringify(seed)); } catch (err) { /* ignore */ }
      return seed;
    }
  }
  function saveFollowing() {
    try { localStorage.setItem(FOLLOWING_KEY, JSON.stringify(searchState.following)); } catch (e) { /* ignore */ }
  }
  searchState.following = loadFollowing();
  function isFollowing(t) { return searchState.following.indexOf(normalizeTicker(t)) >= 0; }
  function addFollow(t) {
    t = normalizeTicker(t);
    if (!isValidTicker(t) || isFollowing(t)) return false;
    searchState.following.push(t);
    saveFollowing();
    return true;
  }
  function removeFollow(t) {
    t = normalizeTicker(t);
    const next = searchState.following.filter((x) => x !== t);
    if (next.length === searchState.following.length) return false;
    searchState.following = next;
    saveFollowing();
    return true;
  }
  function toggleFollow(t) {
    t = normalizeTicker(t);
    if (!isValidTicker(t)) return false;
    return isFollowing(t) ? (removeFollow(t), false) : (addFollow(t), true);
  }
  function moveFollow(from, to) {
    if (from === to || from < 0 || to < 0 || from >= searchState.following.length || to >= searchState.following.length) return;
    const next = searchState.following.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    searchState.following = next;
    saveFollowing();
  }
  function followToggleHTML(ticker, opts = {}) {
    const t = normalizeTicker(ticker);
    if (!t || !isValidTicker(t)) return "";
    const on = isFollowing(t);
    const compact = !!opts.compact;
    return `<button type="button" class="follow-toggle chip${on ? " is-following" : ""}${compact ? " follow-toggle-compact" : ""}" data-follow-toggle="${esc(t)}" aria-pressed="${on ? "true" : "false"}" aria-label="${on ? "Unfollow" : "Follow"} ${esc(t)}">${on ? svg("starFill") : svg("star")}<span>${on ? "Following" : "Follow"}</span></button>`;
  }
  function paintFollowToggle(btn, on) {
    if (!btn) return;
    const t = btn.dataset.followToggle || "";
    btn.classList.toggle("is-following", !!on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", `${on ? "Unfollow" : "Follow"} ${t}`);
    btn.innerHTML = `${on ? svg("starFill") : svg("star")}<span>${on ? "Following" : "Follow"}</span>`;
  }
  function bindFollowToggles(root) {
    if (!root) return;
    root.querySelectorAll("[data-follow-toggle]").forEach((b) => {
      if (b.dataset.boundFollow === "1") return;
      b.dataset.boundFollow = "1";
      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const t = normalizeTicker(b.dataset.followToggle);
        if (!isValidTicker(t)) return;
        const on = toggleFollow(t);
        document.querySelectorAll(`[data-follow-toggle="${t}"]`).forEach((btn) => paintFollowToggle(btn, on));
        const main = document.getElementById("main");
        if (main && main.querySelector(".following")) {
          try { refreshFollowingUI(main); } catch (e) { /* ignore */ }
        }
      });
    });
  }

  /* ---------------- Live quotes ----------------
   * Source: CNBC's public quote service (quote.cnbc.com). It sends `Access-Control-Allow-Origin: *`, needs no key,
   * and takes many symbols per request ("AAPL|MSFT|..."), so each page makes ONE batched request (chunks of 50),
   * repeated every 45 s during pre/regular/after-hours sessions (5 min when the market is closed), paused while the
   * tab is hidden. Unofficial/undocumented: it can change or block without notice. When it fails, every price falls
   * back to the last daily close from the JSON files (labelled as such). Nothing is ever estimated or invented.
   * Markup contract: any element with data-lq="TICKER" gets live values painted into its .p (price), .chg (today %)
   * and .d (status line) children. data-lq-close / data-lq-date hold the daily-close fallback; data-lq-optional
   * elements stay hidden unless a valid US quote arrives (IPO cards). [data-live-badge] shows feed status. */
  const LQ_URL = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol";
  const US_EXCHANGES = /^(NASDAQ|NYSE|NYSE ARCA|NYSE AMERICAN|NYSE MKT|AMEX|CBOE|BATS|IEX)/i;
  const NYSE_HOLIDAYS = new Set(["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"]);
  const NYSE_EARLY_CLOSE = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]);
  const live = { quotes: {}, fetchedAt: 0, error: null, timer: null, inflight: null, tickers: [] };

  function nyNow() {
    const parts = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    return { date: `${parts.year}-${parts.month}-${parts.day}`, mins: +parts.hour * 60 + +parts.minute, wd: parts.weekday };
  }
  // US equity session from the New York clock: "pre" 4:00-9:30, "open" 9:30-16:00 (13:00 on early-close days), "post" until 20:00, else "closed".
  function marketSession() {
    const n = nyNow();
    if (n.wd === "Sat" || n.wd === "Sun" || NYSE_HOLIDAYS.has(n.date)) return "closed";
    const close = NYSE_EARLY_CLOSE.has(n.date) ? 13 * 60 : 16 * 60;
    if (n.mins >= 4 * 60 && n.mins < 9 * 60 + 30) return "pre";
    if (n.mins >= 9 * 60 + 30 && n.mins < close) return "open";
    if (n.mins >= close && n.mins < (close === 16 * 60 ? 20 * 60 : 17 * 60)) return "post";
    return "closed";
  }
  const lqNum = (v) => { const n = parseFloat(String(v ?? "").replace(/[,$%+]/g, "")); return isFinite(n) ? n : null; };
  function parseQuote(q) {
    if (!q || q.code !== 0 && q.code !== "0") return null;
    const last = lqNum(q.last);
    if (last == null || !US_EXCHANGES.test(String(q.exchange || "")) || (q.currencyCode && q.currencyCode !== "USD")) return null;
    const ext = q.ExtendedMktQuote && lqNum(q.ExtendedMktQuote.last) != null ? {
      type: q.ExtendedMktQuote.type, last: lqNum(q.ExtendedMktQuote.last), changePct: lqNum(q.ExtendedMktQuote.change_pct), time: q.ExtendedMktQuote.last_time,
    } : null;
    return {
      symbol: String(q.symbol).toUpperCase(), last, change: lqNum(q.change), changePct: lqNum(q.change_pct), prevClose: lqNum(q.previous_day_closing),
      time: q.last_time || "", realTime: String(q.realTime) === "true", status: q.curmktstatus || "", ext,
    };
  }
  async function fetchQuotes(tickers) {
    const out = {};
    const chunks = [];
    for (let i = 0; i < tickers.length; i += 50) chunks.push(tickers.slice(i, i + 50));
    await Promise.all(chunks.map(async (c) => {
      const url = `${LQ_URL}?symbols=${encodeURIComponent(c.join("|"))}&requestMethod=itv&noform=1&partnerId=2&fund=0&exthrs=1&output=json&events=0`;
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const to = ctl ? setTimeout(() => ctl.abort(), 12000) : 0;
      try {
        const res = await fetch(url, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: ctl ? ctl.signal : undefined });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const list = ((j && j.FormattedQuoteResult && j.FormattedQuoteResult.FormattedQuote) || []);
        (Array.isArray(list) ? list : [list]).forEach((q) => { const p = parseQuote(q); if (p) out[p.symbol] = p; });
      } finally { clearTimeout(to); }
    }));
    return out;
  }
  const nyTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }) + " ET";
  };
  const nyDay = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }); };
  const fmtChgPct = (v) => (v == null ? "" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}%`);
  const toneOf = (v) => (v == null ? "" : v > 0 ? "up" : v < 0 ? "down" : "");
  const lqPrice = (v) => (v == null ? "n/a" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 4 : 2 })}`);

  function paintQuote(host) {
    const t = host.dataset.lq;
    const q = live.quotes[t];
    const pEl = host.querySelector(".p"), cEl = host.querySelector(".chg"), dEl = host.querySelector(".d");
    if (!q) {
      if (host.hasAttribute("data-lq-optional")) { host.hidden = true; return; }
      host.classList.remove("is-live");
      // Fallback: last daily close from the JSON (already rendered); just label it honestly once the feed has answered.
      if (dEl && (live.error || live.fetchedAt) && host.dataset.lqDate) dEl.textContent = `close ${fmtShortDate(host.dataset.lqDate).replace(/, \d{4}$/, "")} · daily`;
      return;
    }
    host.hidden = false;
    host.classList.add("is-live");
    const session = marketSession();
    const today = nyNow().date;
    const quoteDay = q.time ? new Date(q.time).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : "";
    const tradingToday = session === "open" && quoteDay === today;
    if (pEl) pEl.textContent = lqPrice(q.last);
    if (cEl) { cEl.textContent = fmtChgPct(q.changePct); cEl.className = `chg ${toneOf(q.changePct)}`; cEl.title = tradingToday ? "Change today" : `Change on ${nyDay(q.time)}`; }
    if (dEl) {
      let txt;
      if (tradingToday) txt = `${q.realTime ? "live" : "delayed"} · ${nyTime(q.time)}`;
      else if (q.ext && (session === "pre" || session === "post") && q.ext.time && new Date(q.ext.time).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) === today) {
        txt = `${session === "pre" ? "pre-mkt" : "after hrs"} ${lqPrice(q.ext.last)} ${fmtChgPct(q.ext.changePct)}`;
      } else txt = `close ${nyDay(q.time)}${q.realTime ? "" : " · delayed"}`;
      dEl.textContent = txt;
      dEl.classList.toggle("delayed", !q.realTime);
    }
  }
  function paintBadges() {
    const session = marketSession();
    const n = Object.keys(live.quotes).length;
    const anyDelayed = live.tickers.some((t) => live.quotes[t] && !live.quotes[t].realTime);
    document.querySelectorAll("[data-live-badge]").forEach((b) => {
      let cls = "", txt;
      if (live.error && !n) { cls = "is-off"; txt = "Live quotes unavailable · showing last daily close"; }
      else if (!live.fetchedAt) { txt = "Loading live quotes…"; }
      else if (session === "open") { cls = "is-on"; txt = `Market open · ${anyDelayed ? "some quotes delayed ~15 min" : "live quotes"} · updated ${new Date(live.fetchedAt).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit" })} ET`; }
      else if (session === "pre") { cls = "is-ext"; txt = "Pre-market · prices are the last close, pre-market moves shown separately"; }
      else if (session === "post") { cls = "is-ext"; txt = "After hours · prices are today's close, after-hours moves shown separately"; }
      else { txt = "Market closed · showing the last close"; }
      if (live.error && n) txt += " · last refresh failed";
      b.className = `live-badge ${cls}`;
      b.innerHTML = `<span class="lb-dot" aria-hidden="true"></span><span>${esc(txt)}</span>`;
      b.title = "Quotes: CNBC public quote feed (unofficial). Nasdaq Last Sale prices are real-time; others may be delayed. Falls back to the daily close if unavailable.";
    });
  }
  function paintLive(root) {
    (root || document).querySelectorAll("[data-lq]").forEach(paintQuote);
    paintBadges();
  }
  async function refreshLive() {
    const root = document.getElementById("main");
    const tickers = [...new Set([...root.querySelectorAll("[data-lq]")].map((e) => e.dataset.lq).filter(isValidTicker))];
    live.tickers = tickers;
    if (!tickers.length) return;
    if (live.inflight) return live.inflight;
    live.inflight = (async () => {
      try {
        const q = await fetchQuotes(tickers);
        Object.assign(live.quotes, q);
        live.error = Object.keys(q).length || !tickers.length ? null : "no quotes returned";
        live.fetchedAt = Date.now();
      } catch (e) {
        live.error = e && e.name === "AbortError" ? "timeout" : (e && e.message) || "fetch failed";
        if (!live.fetchedAt) live.fetchedAt = 0;
      } finally {
        live.inflight = null;
        paintLive(document.getElementById("main"));
      }
    })();
    return live.inflight;
  }
  function scheduleLive() {
    clearTimeout(live.timer);
    if (document.hidden) return;
    const s = marketSession();
    live.timer = setTimeout(async () => { await refreshLive(); scheduleLive(); }, s === "closed" ? 300000 : 45000);
  }
  // Call after any render that may contain [data-lq]. Paints cached quotes instantly, fetches if stale or new tickers appeared.
  function watchLive(root) {
    const el = root || document.getElementById("main");
    const tickers = [...new Set([...el.querySelectorAll("[data-lq]")].map((e) => e.dataset.lq))];
    if (!tickers.length && !el.querySelector("[data-live-badge]")) return;
    paintLive(el);
    const missing = tickers.some((t) => !(t in live.quotes));
    if (missing || Date.now() - live.fetchedAt > 30000) refreshLive();
    scheduleLive();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearTimeout(live.timer); return; }
    if (document.getElementById("main").querySelector("[data-lq]")) { refreshLive(); scheduleLive(); }
  });
  const liveBadgeHTML = () => `<p class="live-badge" data-live-badge><span class="lb-dot" aria-hidden="true"></span><span>Loading live quotes…</span></p>`;
  // Price block used by cards: daily close as the honest fallback, live values painted over it.
  function lqBlock(ticker, close, closeDate, extraCls = "") {
    const t = normalizeTicker(ticker);
    if (!isValidTicker(t)) return "";
    const c = typeof close === "number" ? close : num(close);
    return `<div class="pick-price lq ${extraCls}" data-lq="${esc(t)}"${c != null ? ` data-lq-close="${c}"` : ""}${closeDate ? ` data-lq-date="${esc(closeDate)}"` : ""}>
      <div class="p">${esc(c != null ? money(c) : "—")}</div>
      <div class="chg"></div>
      <div class="d">${closeDate ? `close ${esc(fmtShortDate(closeDate).replace(/, \d{4}$/, ""))}` : ""}</div>
    </div>`;
  }

  /* ---------------- Cassiopeia ----------------
   * Positions from J2000 RA/Dec of the five main stars, gnomonic projection (north up, east left),
   * rotated ~20deg so it reads as the familiar "W". Brightness (radius) follows visual magnitude. */
  const CAS = [
    { n: "Segin", greek: "ε", x: 12, y: 12, m: 3.37 },
    { n: "Ruchbah", greek: "δ", x: 76.7, y: 56.2, m: 2.68 },
    { n: "Navi", greek: "γ", x: 129.8, y: 31.3, m: 2.15 },
    { n: "Schedar", greek: "α", x: 187.4, y: 81, m: 2.24 },
    { n: "Caph", greek: "β", x: 228, y: 12, m: 2.28 },
  ];
  let casId = 0;
  function cassiopeia({ cls = "", variant = "logo", labels = false, twinkle = false, title = "" } = {}) {
    const id = `cas${++casId}`;
    const logo = variant === "logo";
    const rBase = logo ? 7 : 2.2, rK = logo ? 3.2 : 1.5, sw = logo ? 2.6 : 0.7;
    const pad = logo ? 14 : labels ? 26 : 22;
    const vb = `${-pad + 12} ${-pad + 12} ${216 + pad * 2} ${69 + pad * 2}`;
    const pts = CAS.map((s) => `${s.x},${s.y}`).join(" ");
    const stars = CAS.map((s, i) => {
      const r = (rBase + (3.6 - s.m) * rK).toFixed(2);
      const halo = logo ? "" : `<circle cx="${s.x}" cy="${s.y}" r="${(r * 4.5).toFixed(1)}" fill="url(#${id}h)"/>`;
      const tw = twinkle ? ` tw" style="--d:${5 + i * 1.3}s;--delay:${i * 0.9}s` : "";
      const label = labels
        ? `<text x="${s.x}" y="${s.y + (s.y > 40 ? 16 : -10)}" text-anchor="middle" class="cas-label">${s.n}</text>`
        : "";
      return `${halo}<circle class="cas-star${tw}" cx="${s.x}" cy="${s.y}" r="${r}" fill="url(#${id}s)"/>${label}`;
    }).join("");
    return `<svg class="${cls}" viewBox="${vb}" ${title ? `role="img" aria-label="${esc(title)}"` : 'aria-hidden="true"'}>
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f7e7a9"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#a8842a"/>
        </linearGradient>
        <radialGradient id="${id}s"><stop offset="0" stop-color="#fffaf0"/><stop offset=".45" stop-color="#f3dc8c"/><stop offset="1" stop-color="#c79f3a"/></radialGradient>
        <radialGradient id="${id}h"><stop offset="0" stop-color="#f3dc8c" stop-opacity=".35"/><stop offset="1" stop-color="#f3dc8c" stop-opacity="0"/></radialGradient>
      </defs>
      <polyline points="${pts}" fill="none" stroke="url(#${id}g)" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" opacity="${logo ? 0.9 : 0.6}"/>
      ${stars}
      ${labels ? `<style>.cas-label{font:500 7px var(--font);letter-spacing:.18em;text-transform:uppercase;fill:#b8a36a;opacity:.75}</style>` : ""}
    </svg>`;
  }
  const brandHTML = (withMotto = false) =>
    `${cassiopeia({ cls: "logo", variant: "logo", title: "Cassiopeia" })}<span class="brand-text"><span class="wordmark">Futura</span>${withMotto ? `<span class="motto" aria-label="Motto">looking higher</span>` : ""}</span>`;

  /* ---------------- Starfield ---------------- */
  function buildSky() {
    // Stars are laid out in pixel space for the current viewport so they never stretch or scale.
    const W = Math.max(320, window.innerWidth), H = Math.max(320, window.innerHeight);
    const count = Math.min(700, Math.round((W * H) / 6500));
    let seed = 20261006;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    let out = "";
    for (let i = 0; i < count; i++) {
      const x = (rnd() * W).toFixed(1), y = (rnd() * H).toFixed(1);
      const big = rnd() > 0.94;
      const r = (big ? 0.9 + rnd() * 0.6 : 0.35 + rnd() * 0.5).toFixed(2);
      const o = (big ? 0.45 + rnd() * 0.3 : 0.1 + rnd() * 0.35).toFixed(2);
      const tw = rnd() > 0.75;
      out += `<circle class="s${tw ? " tw" : ""}" cx="${x}" cy="${y}" r="${r}" opacity="${o}"${
        tw ? ` style="--o:${o};--d:${(4 + rnd() * 6).toFixed(1)}s;--delay:${(rnd() * 6).toFixed(1)}s"` : ""
      }/>`;
    }
    document.getElementById("sky").innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out}</svg>`;
  }
  // Rebuild on real size changes only (ignore mobile address-bar show/hide).
  let skyT, skyW = window.innerWidth, skyH = window.innerHeight;
  window.addEventListener("resize", () => {
    clearTimeout(skyT);
    skyT = setTimeout(() => {
      if (window.innerWidth !== skyW || Math.abs(window.innerHeight - skyH) > 160) {
        skyW = window.innerWidth; skyH = window.innerHeight; buildSky();
      }
    }, 200);
  });

  /* ---------------- Sections registry ---------------- */
  const SECTIONS = [
    { id: "home", label: "Home", short: "Home", icon: "home", render: renderHome },
    { id: "ipos", label: "IPO Tracker", short: "IPOs", icon: "rocket", render: renderIpoTracker },
    { id: "growth", label: "Growth Picks", short: "Growth", icon: "growth", render: renderGrowth },
    { id: "riskit", label: "Risk It", short: "Risk It", icon: "flame", render: renderRiskIt },
    { id: "early", label: "Early Inflection", short: "Early", icon: "sunrise", render: renderEarly, overflow: true },
    { id: "spacex", label: "SpaceX", short: "SpaceX", icon: "orbit", render: (el) => renderCompany(el, "spacex"), overflow: true },
    { id: "tesla", label: "Tesla", short: "Tesla", icon: "bolt", render: (el) => renderCompany(el, "tesla"), overflow: true },
    { id: "search", label: "Search", short: "Search", icon: "search", render: renderSearch },
    { id: "track", label: "Track Record", short: "Record", icon: "chart", render: renderTrack, overflow: true },
    { id: "cassiopeia", label: "Cassiopeia", short: "Cas", icon: "cas", render: renderCassiopeia, overflow: true },
    { id: "more", label: "More", short: "More", icon: "grid", render: renderMore },
  ];

  const main = document.getElementById("main");
  const navList = document.getElementById("nav-list");

  // Music is disabled: extras/music.js is not loaded, so this renders nothing. See README "Background music".
  const musicButton = (cls) => (window.FuturaMusic ? window.FuturaMusic.button(cls) : "");

  function buildNav() {
    document.querySelectorAll("[data-brand]").forEach((b) => {
      b.innerHTML = brandHTML(b.classList.contains("brand-side"));
    });
    // Music toggles: top bar (mobile) and sidebar (desktop). The Home hero adds its own.
    if (window.FuturaMusic && !document.querySelector(".mt-bar")) {
      document.querySelector(".appbar").insertAdjacentHTML("beforeend", musicButton("mt-bar"));
      document.getElementById("nav").insertAdjacentHTML("afterbegin", musicButton("mt-side"));
    }
    navList.innerHTML = SECTIONS.map(
      (s) => `<li${s.overflow ? ' class="nav-overflow"' : ""}><a class="nav-link" href="#/${s.id}" data-id="${s.id}">${svg(s.icon)}<span></span></a></li>`
    ).join("");
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () =>
      navList.querySelectorAll(".nav-link").forEach((a) => {
        const s = SECTIONS.find((x) => x.id === a.dataset.id);
        a.querySelector("span").textContent = mq.matches ? s.label : s.short;
      });
    mq.addEventListener("change", apply);
    apply();
  }

  function parseHash() {
    const raw = (location.hash || "#/").slice(1); // "/search?t=AAPL"
    const q = raw.indexOf("?");
    const path = q < 0 ? raw : raw.slice(0, q);
    const id = (path.match(/^\/([\w-]+)/) || [])[1] || "";
    const params = {};
    if (q >= 0) new URLSearchParams(raw.slice(q + 1)).forEach((v, k) => { params[k] = v; });
    return { id, params };
  }

  function route() {
    const { id, params } = parseHash();
    const section = SECTIONS.find((s) => s.id === id) || SECTIONS[0];
    navList.querySelectorAll(".nav-link").forEach((a) => {
      if (a.dataset.id === section.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
      // Overflow sections light up "More" on the mobile tab bar.
      a.classList.toggle("is-parent", !!section.overflow && a.dataset.id === "more");
    });
    document.body.dataset.route = section.id;
    document.title = section.id === "home" ? "Futura · looking higher" : `${section.label} · Futura`;
    window.scrollTo(0, 0);
    if (casState.anim) { casState.anim.destroy(); casState.anim = null; }
    clearTimeout(live.timer);
    main.dataset.token = section.id + (params.t ? ":" + params.t : "");
    document.body.dataset.route = section.id;
    section.render(main, params);
  }

  const hero = (eyebrow, title, metaHTML) => `
    <header class="hero">
      ${cassiopeia({ cls: "hero-motif", variant: "motif", labels: window.matchMedia("(min-width: 900px)").matches, twinkle: true })}
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1 class="page-title">${esc(title)}</h1>
      <div class="page-meta">${metaHTML}</div>
    </header>`;
  const footer = (text) => `<footer class="disclaimer">${cassiopeia({ cls: "logo", variant: "logo" })}<span>${esc(text)}</span></footer>`;

  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "n/a";
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  const fmtShortDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : iso;
  };


  /* ================= IPO Tracker ================= */
  const GROUPS = ["thisWeek", "nextTwoWeeks", "nextWeek", "newFilings", "pulledDeals", "pastTwoWeeks", "lastWeekDebuts"];
  const PAST = "pastTwoWeeks";
  const DEFAULT_LABELS = {
    thisWeek: "This week", nextTwoWeeks: "Next 2 weeks", nextWeek: "Next week", newFilings: "New filings",
    pulledDeals: "Pulled / postponed", pastTwoWeeks: "Past 2 weeks", lastWeekDebuts: "Last week's debuts",
  };
  const ipoState = {
    data: null,
    hideSpacs: localStorage.getItem("hideSpacs") === "1",
    showPast: localStorage.getItem("showPastTwoWeeks") !== "0", // default ON
    open: new Set(),
  };
  // A group holds either a flat "ipos" list or "weeks": [{label, ipos}] sub-groups.
  const allIpos = (s) => (s ? (s.weeks ? s.weeks.flatMap((w) => w.ipos || []) : s.ipos || []) : []);
  const groupOn = (g) => g !== PAST || ipoState.showPast;

  async function renderIpoTracker(el) {
    if (!ipoState.data) {
      el.innerHTML = `<div class="loading">Loading IPO data…</div>`;
      try {
        const res = await fetch("data/ipos.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        ipoState.data = await res.json();
      } catch (err) {
        el.innerHTML = `<div class="error">Couldn't load IPO data (${esc(err.message)}).</div>`;
        return;
      }
    }
    drawIpos(el);
  }

  const visible = (ipos) => (ipos || []).filter((i) => !(ipoState.hideSpacs && i.isSpac));

  function drawIpos(el) {
    const d = ipoState.data;
    const sections = d.sections || {};
    const spacCount = GROUPS.reduce((n, g) => n + allIpos(sections[g]).filter((i) => i.isSpac).length, 0);
    const hasPast = !!sections[PAST];

    const highlights = (d.highlights || [])
      .map((h) => `<li><span class="dot"></span><span>${esc(h.text)}${
        h.unconfirmed ? ` <span class="tag warn">${svg("warn")}${esc(h.note || "Unconfirmed")}</span>` : ""
      }</span></li>`).join("");

    const chips = GROUPS.filter((g) => sections[g] && groupOn(g)).map((g) =>
      `<button class="chip" data-jump="${g}">${esc(sections[g].label || DEFAULT_LABELS[g])} <span class="count">${visible(allIpos(sections[g])).length}</span></button>`
    ).join("");

    const cardsOrEmpty = (list) => {
      const items = visible(list);
      const hidden = (list || []).length - items.length;
      return items.length ? `<div class="cards">${items.map(ipoCard).join("")}</div>`
        : `<div class="empty">${hidden ? `${hidden} SPAC${hidden > 1 ? "s" : ""} hidden` : "Nothing here this week"}</div>`;
    };
    const groups = GROUPS.filter((g) => sections[g] && groupOn(g)).map((g) => {
      const s = sections[g];
      const items = visible(allIpos(s));
      return `<section class="group" id="g-${g}" aria-labelledby="h-${g}">
        <div class="group-head">
          <h2 id="h-${g}">${esc(s.label || DEFAULT_LABELS[g])}</h2>
          ${s.dateRange ? `<span class="range">${esc(s.dateRange)}</span>` : ""}
          <span class="rule"></span>
          <span class="n">${items.length} ${items.length === 1 ? "deal" : "deals"}</span>
        </div>
        ${s.weeks
          ? s.weeks.map((w) => `<div class="week"><h3 class="week-head">${esc(w.label)}</h3>${cardsOrEmpty(w.ipos)}</div>`).join("")
          : cardsOrEmpty(s.ipos)}
      </section>`;
    }).join("");

    el.innerHTML = `
      ${hero("IPO Tracker", d.weekLabel || "This week", `<span>${svg("clock")}Last updated ${esc(fmtDate(d.lastUpdated))}</span>`)}
      <section class="panel summary" aria-label="Summary">
        ${d.headline ? `<h2>${esc(d.headline)}</h2>` : ""}
        <p>${esc(d.summary || "")}</p>
        ${highlights ? `<ul class="highlights">${highlights}</ul>` : ""}
      </section>
      <div class="toolbar" role="toolbar" aria-label="Jump to group and filters">
        ${hasPast ? `<button class="chip toggle" id="past-toggle" aria-pressed="${ipoState.showPast}"><span class="sw" aria-hidden="true"></span>Past 2 weeks</button>` : ""}
        ${spacCount ? `<button class="chip toggle" id="spac-toggle" aria-pressed="${ipoState.hideSpacs}"><span class="sw" aria-hidden="true"></span>Hide SPACs</button>` : ""}
        ${hasPast || spacCount ? `<span class="sep"></span>` : ""}
        ${chips}
      </div>
      ${groups}
      ${footer("For information only — not investment advice. Details come from public reports and filings and may be incomplete or change; items flagged “Unconfirmed” are reported but not verified. Always check the source.")}`;

    el.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => document.getElementById(`g-${b.dataset.jump}`).scrollIntoView({ behavior: "smooth" })));
    const bindToggle = (sel, key, storageKey) => {
      const t = el.querySelector(sel);
      if (t) t.addEventListener("click", () => {
        ipoState[key] = !ipoState[key];
        localStorage.setItem(storageKey, ipoState[key] ? "1" : "0");
        const y = window.scrollY;
        drawIpos(el);
        window.scrollTo(0, y);
        const again = el.querySelector(sel);
        if (again) again.focus({ preventScroll: true });
      });
    };
    bindToggle("#spac-toggle", "hideSpacs", "hideSpacs");
    bindToggle("#past-toggle", "showPast", "showPastTwoWeeks");
    watchLive(el);
    el.querySelectorAll(".more-btn").forEach((b) => b.addEventListener("click", () => {
      const c = b.closest(".card");
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      b.querySelector("span").textContent = open ? "Less" : "Details";
      c.querySelector(".detail").hidden = !open;
      c.classList.toggle("is-open", open);
      open ? ipoState.open.add(c.dataset.id) : ipoState.open.delete(c.dataset.id);
    }));
    bindFollowToggles(el);
  }

  const metaItem = (label, value) =>
    `<div><dt>${label}</dt><dd class="${isNA(value) ? "na" : ""}">${esc(isNA(value) ? "n/a" : value)}</dd></div>`;

  const srcLink = (url, label = "Source") => {
    const u = safeUrl(url);
    return u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${svg("ext")}</a>`
      : `<span class="src na">${esc(label)}: n/a</span>`;
  };

  const sign = (v) => (/^\s*-/.test(String(v)) ? "down" : /^\s*\+?0(\.0+)?%/.test(String(v)) ? "flat" : /^\s*\+/.test(String(v)) ? "up" : "flat");
  function returnsStrip(r) {
    if (!r) return "";
    const cell = (label, val, sub) => `<div><dt>${label}</dt><dd class="${isNA(val) ? "na" : sign(val)}">${esc(isNA(val) ? "n/a" : val)}</dd>${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</div>`;
    const latestSub = [isNA(r.latestPrice) ? "" : r.latestPrice, isNA(r.latestDate) ? "" : `as of ${fmtShortDate(r.latestDate)}`].filter(Boolean).join(" · ");
    return `<dl class="returns">
      ${cell("First day", r.firstDay, r.firstDayNote)}
      ${cell("Since IPO", r.latest, [latestSub, r.latestNote].filter(Boolean).join(" — "))}
    </dl>`;
  }
  function sourceLinks(urls) {
    const list = (Array.isArray(urls) ? urls : [urls]).filter(safeUrl);
    if (list.length <= 1) return srcLink(list[0] || null);
    return `<span class="srcs">${list.map((u, n) => srcLink(u, n ? String(n + 1) : "Source 1")).join("")}</span>`;
  }
  function ipoCard(i) {
    const hasDetail = !!(i.detail && (i.detail.intro || i.detail.table || (i.detail.facts || []).length || (i.detail.bullets || []).length));
    const open = hasDetail && ipoState.open.has(i.id);
    const tick = isNA(i.ticker) ? "" : normalizeTicker(i.ticker);
    const tags = [
      tick ? `<span class="tag ticker">${esc(tick)}</span>` : `<span class="tag ticker na">No ticker yet</span>`,
      i.isSpac ? `<span class="tag spac">SPAC</span>` : "",
      i.status ? `<span class="tag status">${esc(i.status)}</span>` : "",
      i.unconfirmed ? `<span class="tag warn">${svg("warn")}Unconfirmed</span>` : "",
      tick ? followToggleHTML(tick, { compact: true }) : "",
    ].join("");
    return `<article class="panel card${i.unconfirmed ? " is-unconfirmed" : ""}${open ? " is-open" : ""}" data-id="${esc(i.id)}">
      <div class="card-top"><div class="card-title"><h3>${esc(i.company)}</h3><div class="tags">${tags}</div></div>${tick ? `<div class="pick-price lq ipo-lq" data-lq="${esc(tick)}" data-lq-optional hidden><div class="p"></div><div class="chg"></div><div class="d"></div></div>` : ""}</div>
      ${isNA(i.description) ? "" : `<p class="desc">${esc(i.description)}</p>`}
      <dl class="meta">
        ${metaItem("Exchange", i.exchange)}${metaItem("Trade date", i.tradeDate)}
        ${metaItem("Price range", i.priceRange)}${metaItem("Deal size", i.dealSize)}
      </dl>
      ${i.performance && i.performance.text ? `<div class="perf ${i.performance.direction === "up" ? "up" : "down"}">${svg(i.performance.direction === "up" ? "up" : "down")}<span>${esc(i.performance.text)}</span></div>` : ""}
      ${returnsStrip(i.returns)}
      ${i.unconfirmed && i.unconfirmedNote ? `<div class="unconf-note">${svg("warn")}<span>${esc(i.unconfirmedNote)}</span></div>` : ""}
      <div class="card-foot">
        ${sourceLinks(i.sourceUrl)}
        ${hasDetail ? `<button class="more-btn" aria-expanded="${open}" aria-controls="d-${esc(i.id)}"><span>${open ? "Less" : "Details"}</span>${svg("chev")}</button>` : ""}
      </div>
      ${hasDetail ? ipoDetail(i, open) : ""}
    </article>`;
  }

  function ipoDetail(i, open) {
    const d = i.detail;
    const facts = (d.facts || []).length
      ? `<dl class="facts">${d.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>` : "";
    let table = "";
    if (d.table && d.table.rows) {
      const cols = d.table.columns || [];
      table = `<div class="table-wrap"><table class="fin">
        ${d.table.caption ? `<caption>${esc(d.table.caption)}</caption>` : ""}
        <thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${d.table.rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1)
          .map((v) => `<td class="${/^\(.*\)$/.test(String(v)) ? "neg" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    const bullets = (d.bullets || []).length ? `<ul class="bullets">${d.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
    return `<div class="detail${table ? " has-table" : ""}" id="d-${esc(i.id)}" ${open ? "" : "hidden"}>
      ${d.intro ? `<p>${esc(d.intro)}</p>` : ""}${table}${facts}${bullets}
      ${safeUrl(d.sourceUrl) ? `<div class="detail-src">${srcLink(d.sourceUrl, d.sourceLabel || "Detail source")}</div>` : ""}
    </div>`;
  }

  /* ================= Growth Picks ================= */
  const GROWTH_MODES = {
    growth: { id: "growth", file: "data/growth-picks.json", example: "data/growth-picks.example.json", dismissKey: "growthDismissed", sortKey: "growthSort", title: "Growth Picks", sub: "Conservative growth at a reasonable price", state: { data: null, isExample: false, sector: "All", sort: localStorage.getItem("growthSort") || "default" } },
    riskit: { id: "riskit", file: "data/risk-it.json", example: null, dismissKey: "riskItDismissed", sortKey: "riskItSort", title: "Risk It", sub: "Speculative high-growth · higher risk", scoreLabel: "Risk It score", state: { data: null, isExample: false, sector: "All", sort: localStorage.getItem("riskItSort") || "default" } },
    early: { id: "early", file: "data/early-inflection.json", example: null, dismissKey: "earlyDismissed", sortKey: "earlySort", title: "Early Inflection", sub: "Turning up, not yet run · the LITE 2025 pattern", scoreLabel: "Early Inflection score", banner: "EARLY-STAGE", state: { data: null, isExample: false, sector: "All", sort: localStorage.getItem("earlySort") || "default" } },
  };
  let gMode = GROWTH_MODES.growth;
  const growthState = new Proxy({}, { get: (_, k) => gMode.state[k], set: (_, k, v) => { gMode.state[k] = v; return true; } });
  const SORTS = {
    default: { label: "Default order" },
    score: { label: "Score", key: (p) => num(p.score), dir: -1, only: ["riskit", "early"] },
    growth: { label: "Revenue growth", key: (p) => pctNum(p.revenueGrowth), dir: -1 },
    upside: { label: "Upside to target", key: (p) => upside(p), dir: -1 },
    peg: { label: "PEG (low → high)", key: (p) => num(p.peg), dir: 1 },
    pe: { label: "Forward P/E (low → high)", key: (p) => num(p.forwardPE), dir: 1 },
    cap: { label: "Market cap (large → small)", key: (p) => capNum(p.marketCap), dir: -1 },
    az: { label: "Company A–Z" },
  };

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (isNA(v)) return null;
    const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function pctNum(v) {
    if (typeof v === "number") return Math.abs(v) < 2 ? v * 100 : v; // 0.35 => 35%
    return num(v);
  }
  function capNum(v) {
    if (typeof v === "number") return v < 1e5 ? v * 1e9 : v; // bare small numbers treated as $B
    const n = num(v);
    if (n == null) return null;
    const s = String(v).toUpperCase();
    return n * (/\dT|TRILLION/.test(s.replace(/\s/g, "")) ? 1e12 : /\dB|BILLION/.test(s.replace(/\s/g, "")) ? 1e9 : /\dM|MILLION/.test(s.replace(/\s/g, "")) ? 1e6 : 1);
  }
  function upside(p) {
    const pr = num(p.price), t = num(p.priceTarget);
    return pr && t ? ((t - pr) / pr) * 100 : null;
  }
  const money = (v) => (typeof v === "number" ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : isNA(v) ? "n/a" : String(v));
  function fmtCap(v) {
    if (typeof v !== "number") return isNA(v) ? "n/a" : String(v);
    const d = capNum(v);
    return d >= 1e12 ? `$${(d / 1e12).toFixed(2)}T` : d >= 1e9 ? `$${(d / 1e9).toFixed(1)}B` : `$${(d / 1e6).toFixed(0)}M`;
  }
  const fmtMult = (v) => (typeof v === "number" ? `${+v.toFixed(2)}x` : isNA(v) ? "n/a" : String(v));
  const fmtPct = (v) => (typeof v === "number" ? `${pctNum(v).toFixed(0)}%` : isNA(v) ? "n/a" : String(v));

  function renderRiskIt(el) { gMode = GROWTH_MODES.riskit; return loadGrowth(el); }
  function renderEarly(el) { gMode = GROWTH_MODES.early; return loadGrowth(el); }
  async function renderGrowth(el) { gMode = GROWTH_MODES.growth; return loadGrowth(el); }
  async function loadGrowth(el) {
    if (!growthState.data) {
      el.innerHTML = `<div class="loading">Loading growth picks…</div>`;
      try {
        let res = await fetch(gMode.file, { cache: "no-cache" });
        growthState.isExample = false;
        if (!res.ok && gMode.example) {
          res = await fetch(gMode.example, { cache: "no-cache" });
          growthState.isExample = true;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        growthState.data = await res.json();
        if (growthState.data.example) growthState.isExample = true;
      } catch (err) {
        el.innerHTML = `<div class="error">Couldn't load growth picks (${esc(err.message)}).</div>`;
        return;
      }
    }
    drawGrowth(el);
  }

  function drawGrowth(el) {
    const d = growthState.data;
    const allPicks = Array.isArray(d.picks) ? d.picks : [];
    const bench = (Array.isArray(d.bench) ? d.bench.slice() : []).sort((a, b) => (a.rank || 999) - (b.rank || 999));
    const dismissed = growthDismissed();
    const keyOf = (p) => normalizeTicker(p.ticker) || String(p.company);
    const slots = allPicks.length || 12;
    const picks = allPicks.filter((p) => !dismissed.includes(keyOf(p)));
    for (const b of bench) { if (picks.length >= slots) break; if (!dismissed.includes(keyOf(b)) && !picks.some((x) => keyOf(x) === keyOf(b))) picks.push(b); }
    const sectors = [...new Set(picks.map(sectorGroup))].sort();
    if (growthState.sector !== "All" && !sectors.includes(growthState.sector)) growthState.sector = "All";

    let list = picks.map((p, idx) => ({ p, idx }))
      .filter(({ p }) => growthState.sector === "All" || sectorGroup(p) === growthState.sector);
    const s = SORTS[growthState.sort] || SORTS.default;
    if (growthState.sort === "az") list.sort((a, b) => String(a.p.company).localeCompare(String(b.p.company)));
    else if (s.key) list.sort((a, b) => {
      const ka = s.key(a.p), kb = s.key(b.p);
      if (ka == null && kb == null) return a.idx - b.idx;
      if (ka == null) return 1;
      if (kb == null) return -1;
      return (ka - kb) * s.dir || a.idx - b.idx;
    });

    const chip = (name, n) => `<button class="chip" data-sector="${esc(name)}" aria-pressed="${growthState.sector === name}">${esc(name)} <span class="count">${n}</span></button>`;
    const chips = chip("All", picks.length) + sectors.map((sec) => chip(sec, picks.filter((p) => sectorGroup(p) === sec).length)).join("");
    const sortSel = `<select class="select" id="growth-sort" aria-label="Sort picks">${Object.entries(SORTS).filter(([, v]) => !v.only || [].concat(v.only).includes(gMode.id))
      .map(([k, v]) => `<option value="${k}"${k === growthState.sort ? " selected" : ""}>${esc(k === "score" ? gMode.scoreLabel || v.label : v.label)}</option>`).join("")}</select>`;

    el.innerHTML = `
      ${hero(gMode.title, gMode.sub, `<span>${svg("clock")}Last updated ${esc(fmtDate(d.lastUpdated))}</span><span>${svg("list")}${picks.length} ${picks.length === 1 ? "pick" : "picks"}</span>`)}
      ${growthState.isExample ? `<div class="example-banner" role="note">${svg("warn")}<span><strong>EXAMPLE DATA</strong> — fictional placeholder for testing. Real picks will load automatically from data/growth-picks.json.</span></div>` : ""}
      ${isNA(d.disclaimer) ? "" : `<div class="example-banner riskit-note${gMode.id === "early" ? " early-banner" : ""}" role="note">${svg("warn")}<span><strong>${esc(gMode.banner || "SPECULATIVE")}</strong> — ${esc(d.disclaimer)}</span></div>`}
      ${isNA(d.pattern) ? "" : `<section class="panel method ei-pattern"><h2>The LITE 2025 pattern</h2><p>${esc(d.pattern)}</p></section>`}
      ${isNA(d.method) ? "" : `<section class="panel method"><h2>Method</h2><p>${esc(d.method)}</p>${Array.isArray(d.rubric) && d.rubric.length ? rubricHTML(d.rubric) : ""}${isNA(d.dataNotes) ? "" : `<p class="notes">${esc(d.dataNotes)}</p>`}</section>`}
      <a class="panel track-link" href="#/track?list=${gMode.id}" data-track-link="${gMode.id}">
        <span class="home-tile-icon">${svg("chart")}</span>
        <span class="tl-body"><span class="tl-title">Track record</span><span class="tl-line">How these picks are doing vs QQQ</span></span>
        <svg class="home-tile-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </a>
      ${gMode.id === "early" ? "" : `<a class="panel track-link ei-link" href="#/early">
        <span class="home-tile-icon">${svg("sunrise")}</span>
        <span class="tl-body"><span class="tl-title">Early Inflection</span><span class="tl-line">LITE-2025-style setups: revenue turning up, stock not yet run</span></span>
        <svg class="home-tile-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </a>`}
      ${allPicks.some((p) => p.grades) ? gradeLegendHTML(d, allPicks.length + bench.length) : ""}
      ${liveBadgeHTML()}
      <div class="toolbar" role="toolbar" aria-label="Sort and filter by sector">
        ${sortSel}<span class="sep"></span>${chips}
      </div>
      ${dismissed.length ? `<p class="growth-restore"><button type="button" class="link-btn" id="growth-restore">Restore dismissed (${dismissed.length})</button>${picks.length < slots ? ` · bench exhausted, showing ${picks.length}` : ""}</p>` : ""}
      <section class="group" aria-label="Picks">
        ${list.length ? `<div class="cards">${list.map(({ p }) => pickCard(p)).join("")}</div>` : `<div class="empty">No picks in this sector</div>`}
      </section>
      ${footer(isNA(d.disclaimer) ? "For information only — not investment advice." : `${d.disclaimer}${/not investment advice/i.test(d.disclaimer) ? "" : " Not investment advice."}`)}`;

    el.querySelectorAll("[data-sector]").forEach((b) => b.addEventListener("click", () => {
      growthState.sector = b.dataset.sector;
      drawGrowth(el);
    }));
    el.querySelectorAll("[data-dismiss]").forEach((b) => b.addEventListener("click", () => {
      const card = b.closest(".card");
      const done = () => { const y = window.scrollY; growthSetDismissed([...growthDismissed(), b.dataset.dismiss]); drawGrowth(el); window.scrollTo(0, y); };
      if (card && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) { card.classList.add("is-dismissing"); setTimeout(done, 220); } else done();
    }));
    const rs = el.querySelector("#growth-restore");
    if (rs) rs.addEventListener("click", () => { growthSetDismissed([]); drawGrowth(el); });
    el.querySelector("#growth-sort").addEventListener("change", (e) => {
      growthState.sort = e.target.value;
      localStorage.setItem(gMode.sortKey, growthState.sort);
      drawGrowth(el);
    });
    bindFollowToggles(el);
    fillTrackLink(el);
    watchLive(el);
  }

  function growthDismissed() { try { const a = JSON.parse(localStorage.getItem(gMode.dismissKey) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function growthSetDismissed(a) { try { localStorage.setItem(gMode.dismissKey, JSON.stringify([...new Set(a)])); } catch (e) { /* ignore */ } }

  // Top-level sector for filtering: "Technology – Semiconductors" -> "Technology"
  const sectorGroup = (p) => (isNA(p.sector) ? "Other" : String(p.sector).split(/\s+[–—-]\s+/)[0].trim());
  function growthStat(v) {
    const txt = fmtPct(v);
    const m = /^(.*?)\s*(\(.*\))\s*$/.exec(txt);
    return `<div><dt>Revenue growth</dt><dd class="${txt === "n/a" ? "na" : ""}">${esc(m ? m[1] : txt)}${m ? `<small>${esc(m[2])}</small>` : ""}</dd></div>`;
  }
  /* Letter grades (A+..F) are computed by scripts/futura_grades.py and stored on each entry as p.grades. */
  const GRADE_KEYS = [
    { k: "growth", label: "Growth", short: "Growth" },
    { k: "value", label: "Value", short: "Value" },
    { k: "momentum", label: "Momentum", short: "Momentum" },
    { k: "profitability", label: "Profitability", short: "Profit" },
  ];
  const gradeTier = (g) => (!g || g === "n/a" ? "na" : g[0].toLowerCase());
  function gradesHTML(p, ariaLabel = "Letter grades within this list") {
    const g = p.grades;
    if (!g || typeof g !== "object") return "";
    const inputs = p.gradeInputs || {};
    return `<dl class="grades" aria-label="${esc(ariaLabel)}">
      ${GRADE_KEYS.map(({ k, label, short }) => {
        const v = isNA(g[k]) ? "n/a" : String(g[k]);
        const used = inputs[k] ? ` · ${inputs[k]} inputs` : "";
        return `<div class="grade g-${gradeTier(v)}" title="${esc(label)}: ${esc(v)}${esc(used)}"><dt>${esc(short)}</dt><dd>${esc(v)}${inputs[k] && /^[1-9]\/[2-9]$/.test(inputs[k]) && inputs[k][0] !== inputs[k][2] ? `<sup aria-label="partial inputs">*</sup>` : ""}</dd></div>`;
      }).join("")}
    </dl>`;
  }
  function gradeLegendHTML(d, poolSize) {
    const gi = (d.grading && d.grading.inputs) || {};
    return `<details class="panel grade-legend">
      <summary><span class="gl-title">Grades</span><span class="gl-scale"><b class="g-a">A</b><b class="g-b">B</b><b class="g-c">C</b><b class="g-d">D</b><b class="g-f">F</b></span><span class="gl-hint">What do they mean?</span></summary>
      <p>Each card gets four letter grades (A+ to F), ranked by percentile against all ${poolSize} stocks in this list (picks plus backups), not the whole market. A “C” here can still look good next to the S&amp;P 500.</p>
      <ul class="bullets">
        <li><strong>Growth</strong>: ${esc(gi.growth || "revenue growth and forecast EPS growth")}</li>
        <li><strong>Value</strong>: ${esc(gi.value || "forward P/E, PEG and EV/sales")}</li>
        <li><strong>Momentum</strong>: ${esc(gi.momentum || "1-yr relative strength vs SPY, 6- and 3-month price change")}</li>
        <li><strong>Profit</strong>: ${esc(gi.profitability || "gross, operating, net and FCF margins")}</li>
      </ul>
      <p class="fineprint top"><strong>n/a</strong> means none of that grade's inputs exist. <strong>*</strong> means some inputs were missing, so the grade uses the rest (many Risk It names have no forward P/E or PEG). Recomputed by the daily refresh${d.grading && d.grading.asOf ? `; last computed ${esc(fmtShortDate(d.grading.asOf))}` : ""}. Sources: StockAnalysis statistics pages and Nasdaq daily closes.</p>
    </details>`;
  }

  function rubricHTML(rows) {
    const total = rows.reduce((n, r) => n + (num(r.points) || 0), 0);
    return `<details class="ei-rubric"><summary>Scoring rubric (${total} points)</summary><ul class="bullets">${rows.map((r) => `<li><strong>${esc(r.component)} ${esc(r.points)}</strong>: ${esc(r.how)}</li>`).join("")}</ul></details>`;
  }
  function checklistHTML(items) {
    if (!Array.isArray(items) || !items.length) return "";
    const known = items.filter((i) => i.met === true || i.met === false);
    const met = known.filter((i) => i.met === true).length;
    return `<div class="block"><h4>LITE-pattern checklist <span class="ck-count">${met}/${known.length} met</span></h4><ul class="checklist">${items.map((i) => {
      const st = i.met === true ? "met" : i.met === false ? "miss" : "na";
      return `<li class="ck-${st}"><span class="ck-ico" aria-label="${st === "met" ? "Met" : st === "miss" ? "Missed" : "Not available yet"}">${svg(st === "met" ? "check" : st === "miss" ? "x" : "minus")}</span><span class="ck-body"><span class="ck-label">${esc(i.label)}</span>${isNA(i.detail) ? "" : `<span class="ck-detail">${esc(i.detail)}</span>`}</span></li>`;
    }).join("")}</ul></div>`;
  }

  function pickCard(p) {
    const stat = (label, val) => `<div><dt>${label}</dt><dd class="${val === "n/a" ? "na" : ""}">${esc(val)}</dd></div>`;
    const risks = Array.isArray(p.risks) ? p.risks.filter((r) => !isNA(r)) : isNA(p.risks) ? [] : [p.risks];
    const up = upside(p);
    const sources = (Array.isArray(p.sourceUrl) ? p.sourceUrl : [p.sourceUrl]).filter(safeUrl);
    const tick = isNA(p.ticker) ? "" : normalizeTicker(p.ticker);
    const dkey = tick || String(p.company);
    return `<article class="panel card pick-card" data-key="${esc(dkey)}">
      <button type="button" class="pick-dismiss" data-dismiss="${esc(dkey)}" aria-label="Dismiss ${esc(p.company)} and show the next idea" title="Dismiss">${svg("x")}</button>
      <div class="pick-head">
        <div class="card-title">
          <h3>${esc(p.company)}</h3>
          <div class="tags">
            ${tick ? `<span class="tag ticker">${esc(tick)}</span>` : `<span class="tag ticker na">n/a</span>`}
            ${isNA(p.sector) ? "" : `<span class="tag sector">${esc(p.sector)}</span>`}
            ${p.riskLevel ? `<span class="tag risk-lvl${/very/i.test(p.riskLevel) ? " very" : ""}">${esc(p.riskLevel)} risk</span>` : ""}
            ${(Array.isArray(p.alsoIn) ? p.alsoIn : []).map((l) => `<span class="tag also">Also in ${esc(l)}</span>`).join("")}
            ${tick ? followToggleHTML(tick, { compact: true }) : ""}
          </div>
        </div>
        <div class="pick-price lq"${tick ? ` data-lq="${esc(tick)}"` : ""}${isNA(p.priceDate) ? "" : ` data-lq-date="${esc(p.priceDate)}"`}>
          <div class="p">${esc(money(p.price))}</div>
          <div class="chg"></div>
          <div class="d">${isNA(p.priceDate) ? "" : `close ${esc(fmtShortDate(p.priceDate).replace(/, \d{4}$/, ""))}`}</div>
          ${typeof p.score === "number" ? `<div class="score-badge${gMode.id === "early" ? " is-early" : ""}" title="${esc(gMode.scoreLabel || "Score")} (0–100)">${p.score}<small>/100</small></div>` : ""}
        </div>
      </div>
      <dl class="stats">
        ${stat("Market cap", fmtCap(p.marketCap))}${growthStat(p.revenueGrowth)}
        ${stat("Forward P/E", fmtMult(p.forwardPE))}${stat("PEG", typeof p.peg === "number" ? p.peg.toFixed(2) : isNA(p.peg) ? "n/a" : String(p.peg))}
      </dl>
      ${Array.isArray(p.keyFigures) && p.keyFigures.length ? `<dl class="stats kf">${p.keyFigures.map((k) => stat(esc(k.label), isNA(k.value) ? "n/a" : String(k.value))).join("")}</dl>` : ""}
      ${gradesHTML(p)}
      ${p.catalyst && !isNA(p.catalyst.text) ? `<div class="block ei-catalyst"><h4>Catalyst${isNA(p.catalyst.asOf) ? "" : ` <span class="ck-count">${esc(fmtShortDate(p.catalyst.asOf))}</span>`}</h4><p>${esc(p.catalyst.text)}${/^https?:\/\//.test(p.catalyst.source || "") ? ` <a class="src" href="${esc(p.catalyst.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</p></div>` : ""}
      ${checklistHTML(p.checklist)}
      ${Array.isArray(p.drivers) && p.drivers.length ? (Array.isArray(p.checklist)
        ? `<details class="block ei-drivers"><summary>Score breakdown</summary><ul class="bullets drivers">${p.drivers.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></details>`
        : `<div class="block"><h4>Score drivers</h4><ul class="bullets drivers">${p.drivers.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>`) : ""}
      ${isNA(p.trend) ? "" : `<div class="block"><h4>Trend</h4><p>${esc(p.trend)}</p></div>`}
      ${isNA(p.fundamentals) ? "" : `<div class="block"><h4>Fundamentals</h4><p>${esc(p.fundamentals)}</p></div>`}
      ${risks.length ? `<div class="block"><h4>Risks</h4><ul class="bullets risk">${risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
      <div class="analyst">
        <span>Analysts: <span class="rating">${esc(isNA(p.analystRating) ? "n/a" : p.analystRating)}</span></span>
        <span>Target: <span class="rating">${esc(money(p.priceTarget))}</span>${up != null ? ` <span style="color:var(${up >= 0 ? "--up" : "--down"})">(${up >= 0 ? "+" : ""}${up.toFixed(0)}%)</span>` : ""}</span>
      </div>
      <div class="card-foot">${sources.length ? sources.map((u, i) => srcLink(u, sources.length > 1 ? `Source ${i + 1}` : "Source")).join("") : srcLink(null)}</div>
    </article>`;
  }

  /* ================= Track record ================= */
  const trackState = { data: null, list: "growth" };
  async function loadTrack() {
    if (!trackState.data) trackState.data = await getJSON("data/track-record.json");
    return trackState.data;
  }
  const fmtRet = (v, digits = 2) => (typeof v === "number" && isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}%` : "n/a");
  const retTone = (v) => (typeof v !== "number" ? "" : v > 0 ? "up" : v < 0 ? "down" : "");
  const tradingDays = (d) => Math.max(0, Object.keys(d.prices || {}).length - 1);

  async function fillTrackLink(el) {
    const a = el.querySelector("[data-track-link]");
    if (!a) return;
    try {
      const d = await loadTrack();
      const L = d.lists && d.lists[a.dataset.trackLink];
      const q = d.benchSeries && d.benchSeries.QQQ;
      if (!L || !q || !a.isConnected) return;
      const qr = typeof L.vsQQQPct === "number" ? L.returnPct - L.vsQQQPct : q[q.length - 1][1] - 100;
      const days = Math.max(0, (L.series || []).length - 1);
      a.querySelector(".tl-line").innerHTML = `Since ${esc(fmtShortDate(L.startDate || d.trackingStart))}: <span class="${retTone(L.returnPct)}">${esc(fmtRet(L.returnPct))}</span> vs QQQ <span class="${retTone(qr)}">${esc(fmtRet(qr))}</span> · ${days} trading day${days === 1 ? "" : "s"}, too early to judge`;
    } catch (e) { /* link still works without numbers */ }
  }

  // Small dependency-free SVG line chart: one value series per line, indexed to 100.
  function trackChartSVG(lines, dates) {
    const W = 360, H = 200, padL = 44, padR = 8, padT = 10, padB = 24;
    const all = lines.flatMap((l) => l.points.map((p) => p[1]));
    let lo = Math.min(100, ...all), hi = Math.max(100, ...all);
    const span = Math.max(hi - lo, 2);
    lo -= span * 0.12; hi += span * 0.12;
    const n = dates.length;
    const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
    const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
    const step = (hi - lo) / 4;
    const ticks = [0, 1, 2, 3, 4].map((k) => lo + step * k);
    const grid = ticks.map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="tc-grid"/><text x="${padL - 6}" y="${(y(t) + 4).toFixed(1)}" class="tc-ax" text-anchor="end">${(t - 100 >= 0 ? "+" : "−") + Math.abs(t - 100).toFixed(1)}%</text>`).join("");
    const base = `<line x1="${padL}" x2="${W - padR}" y1="${y(100).toFixed(1)}" y2="${y(100).toFixed(1)}" class="tc-base"/>`;
    const idx = Object.fromEntries(dates.map((d, i) => [d, i]));
    const paths = lines.map((l) => {
      const pts = l.points.filter((p) => p[0] in idx).map((p) => `${x(idx[p[0]]).toFixed(1)},${y(p[1]).toFixed(1)}`);
      const last = l.points[l.points.length - 1];
      return `<polyline points="${pts.join(" ")}" class="tc-line ${l.cls}" fill="none"/>${last ? `<circle cx="${x(idx[last[0]]).toFixed(1)}" cy="${y(last[1]).toFixed(1)}" r="3.2" class="tc-dot ${l.cls}"/>` : ""}`;
    }).join("");
    const xl = dates.length ? [0, n - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="tc-ax" text-anchor="${i === 0 ? "start" : "end"}">${esc(fmtShortDate(dates[i]).replace(/, \d{4}$/, ""))}${i === 0 ? " (start)" : ""}</text>`).join("") : "";
    return `<svg class="track-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Value of $100 since tracking began: ${esc(lines.map((l) => `${l.label} ${l.points.length ? (l.points[l.points.length - 1][1] - 100).toFixed(2) : "n/a"}%`).join(", "))}">${grid}${base}${paths}${xl}</svg>`;
  }

  async function renderTrack(el, params = {}) {
    const token = (el.dataset.token = `track-${Date.now()}`);
    el.innerHTML = `<div class="loading">Loading track record…</div>`;
    let d;
    try { d = await loadTrack(); } catch (err) {
      if (el.dataset.token === token) el.innerHTML = `<div class="error">Couldn't load data/track-record.json (${esc(err.message)}).</div>`;
      return;
    }
    if (el.dataset.token !== token) return;
    if (params.list && d.lists[params.list]) trackState.list = params.list;
    const dates = Object.keys(d.prices || {}).sort();
    const days = tradingDays(d);
    const qqq = d.benchSeries.QQQ, spy = d.benchSeries.SPY;
    const benchRet = (s) => (s && s.length ? s[s.length - 1][1] - 100 : null);
    const summary = Object.entries(d.lists).map(([k, L]) => {
      const hr = L.hitRate || {};
      return `<button type="button" class="panel tr-sum ${k === "riskit" ? "is-risk" : k === "early" ? "is-early" : ""}${trackState.list === k ? " is-active" : ""}" data-list="${esc(k)}" aria-pressed="${trackState.list === k}">
        <span class="tr-sum-label">${esc(L.label)}</span>${(L.startPriceDate || L.startDate) && (L.startPriceDate || L.startDate) !== d.baseDate ? `<span class="tr-sum-since">from ${esc(fmtShortDate(L.startPriceDate || L.startDate).replace(/, \d{4}$/, ""))} close</span>` : ""}
        <span class="tr-sum-ret ${retTone(L.returnPct)}">${esc(fmtRet(L.returnPct))}</span>
        <span class="tr-sum-vs">vs QQQ <b class="${retTone(L.vsQQQPct)}">${esc(fmtRet(L.vsQQQPct).replace("%", " pts"))}</b> · vs SPY <b class="${retTone(L.vsSPYPct)}">${esc(fmtRet(L.vsSPYPct).replace("%", " pts"))}</b></span>
        <span class="tr-sum-hit">${hr.of ? `${hr.beat} of ${hr.of} picks beat QQQ (${Math.round((hr.beat / hr.of) * 100)}%)` : "Hit rate after the first close"}</span>
      </button>`;
    }).join("");
    const lines = [
      { label: "Growth", cls: "l-growth", points: d.lists.growth ? d.lists.growth.series : [] },
      { label: "Risk It", cls: "l-risk", points: d.lists.riskit ? d.lists.riskit.series : [] },
      ...(d.lists.early ? [{ label: "Early Inflection", cls: "l-early", points: d.lists.early.series || [] }] : []),
      { label: "QQQ", cls: "l-qqq", points: qqq || [] },
      { label: "SPY", cls: "l-spy", points: spy || [] },
    ];
    const legend = lines.map((l) => {
      const last = l.points.length ? l.points[l.points.length - 1][1] - 100 : null;
      return `<span class="tc-key ${l.cls}"><i></i>${esc(l.label)} <b class="${retTone(last)}">${esc(fmtRet(last))}</b></span>`;
    }).join("");

    const L = d.lists[trackState.list];
    const rows = (L.holdings || []).slice().sort((a, b) => (b.returnPct ?? -1e9) - (a.returnPct ?? -1e9)).map((h) => `<tr>
        <th scope="row"><a href="#/search?t=${esc(h.ticker)}" class="tr-tick">${esc(h.ticker)}</a><span class="row-note">${esc(h.company || "")}</span></th>
        <td data-label="Entry">${esc(money(h.entryPrice))}<span class="row-note">${esc(fmtShortDate(h.entryPriceDate).replace(/, \d{4}$/, ""))} close</span></td>
        <td data-label="Last close">${esc(money(h.lastPrice))}</td>
        <td data-label="Return" class="${retTone(h.returnPct)}">${esc(fmtRet(h.returnPct))}</td>
        <td data-label="vs QQQ" class="${h.lastPriceDate === h.entryPriceDate ? "" : h.beatQQQ ? "up" : "down"}">${h.lastPriceDate === h.entryPriceDate ? "–" : h.beatQQQ ? "Beat" : "Lagged"}</td>
        <td data-label="Today"><span class="lq lq-mini" data-lq="${esc(h.ticker)}"><span class="chg"></span></span></td>
      </tr>`).join("");
    const closed = (L.closed || []).map((c) => `<tr>
        <th scope="row">${esc(c.ticker)}<span class="row-note">${esc(c.company || "")}</span></th>
        <td data-label="Entry">${esc(money(c.entryPrice))}<span class="row-note">${esc(fmtShortDate(c.entryPriceDate))}</span></td>
        <td data-label="Exit">${esc(money(c.exitPrice))}<span class="row-note">${esc(fmtShortDate(c.exitPriceDate))}</span></td>
        <td data-label="Return" class="${retTone(c.returnPct)}">${esc(fmtRet(c.returnPct))}</td>
        <td data-label="QQQ same period" class="${retTone(c.qqqPct)}">${esc(fmtRet(c.qqqPct))}</td>
      </tr>`).join("");
    const log = (L.log || []).slice().reverse().map((g) => `<li><span class="when">${esc(fmtShortDate(g.date))}</span><span class="what">${
      g.action === "start" ? `Tracking started with ${esc((g.tickers || []).join(", "))} at the ${esc(fmtShortDate(g.priceDate))} close`
      : g.action === "add" ? `<b class="up">Added</b> ${esc(g.ticker)} at ${esc(money(g.price))} (${esc(fmtShortDate(g.priceDate))} close)`
      : g.action === "remove" ? `<b class="down">Removed</b> ${esc(g.ticker)} at ${esc(money(g.price))} (${esc(fmtShortDate(g.priceDate))} close)`
      : esc(g.note || g.action)}</span></li>`).join("");

    el.innerHTML = `
      ${hero("Track record", "Picks vs QQQ", `<span>${svg("clock")}Tracking since ${esc(fmtShortDate(d.trackingStart))}</span><span>${svg("chart")}Last close ${esc(fmtShortDate(d.latestDate))}</span>`)}
      <div class="example-banner early-note" role="note">${svg("warn")}<span><strong>EARLY DAYS</strong>: tracking started Oct 7, 2026, from the ${esc(fmtShortDate(d.baseDate))} close${d.lists.early && d.lists.early.startPriceDate ? ` (Early Inflection joined from the ${esc(fmtShortDate(d.lists.early.startPriceDate))} close, indexed to 100 on its own start)` : ""}. With ${days} trading day${days === 1 ? "" : "s"} of data these numbers are mostly noise. Give it several months before reading anything into them.</span></div>
      <div class="tr-sums" role="group" aria-label="Choose list">${summary}</div>
      <section class="panel pad tr-chart-panel" aria-label="Performance chart">
        <h3 class="mini">Value of $100 since tracking began</h3>
        <div class="tc-legend">${legend}</div>
        ${trackChartSVG(lines, dates)}
        <p class="fineprint top">Daily closes only. The chart gets a new point each morning after the refresh.</p>
      </section>
      <section class="group" aria-labelledby="h-trpicks">
        ${sectionHead("trpicks", `${L.label} picks`, `<span class="range">${(L.holdings || []).length} held</span>`)}
        <div class="panel pad"><div class="table-wrap"><table class="fin tr-table">
          <thead><tr><th scope="col">Pick</th><th scope="col">Entry</th><th scope="col">Last close</th><th scope="col">Return</th><th scope="col">vs QQQ</th><th scope="col">Today</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
          <p class="fineprint">Return is the price change from the entry close to the last close (${esc(fmtShortDate(d.latestDate))}). “Beat” means it did better than QQQ over the same days. “Today” is the live intraday move.</p>
        </div>
        ${closed ? `<div class="panel pad" style="margin-top:12px"><h3 class="mini">Removed picks</h3><div class="table-wrap"><table class="fin tr-table"><thead><tr><th scope="col">Pick</th><th scope="col">Entry</th><th scope="col">Exit</th><th scope="col">Return</th><th scope="col">QQQ same period</th></tr></thead><tbody>${closed}</tbody></table></div></div>` : ""}
        <div class="panel pad" style="margin-top:12px"><h3 class="mini">Change log</h3><ul class="catalysts tr-log">${log}</ul></div>
      </section>
      <section class="panel method" style="margin-top:18px"><h2>Method</h2><p>${esc(d.method || "")}</p></section>
      ${footer("Past performance, especially over a few days, says little about the future. Hypothetical portfolio for information only, not investment advice.")}`;

    el.querySelectorAll("[data-list]").forEach((b) => b.addEventListener("click", () => {
      trackState.list = b.dataset.list;
      const y = window.scrollY;
      history.replaceState(null, "", `#/track?list=${trackState.list}`);
      renderTrack(el, { list: trackState.list }).then(() => window.scrollTo(0, y));
    }));
    watchLive(el);
  }

  /* ================= Company pages (SpaceX, Tesla) ================= */
  const companyCache = {};
  let sentimentCache = null;
  const getJSON = async (url) => {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const PARTS = [
    { id: "live", label: "Live", icon: "pulse" },
    { id: "grades", label: "Grades", icon: "chart" },
    { id: "fundamentals", label: "Fundamentals", icon: "growth" },
    { id: "investors", label: "Major investors", icon: "users" },
    { id: "news", label: "News", icon: "news" },
    { id: "sentiment", label: "Sentiment", icon: "chat" },
  ];

  async function renderCompany(el, key) {
    const token = (el.dataset.token = `${key}-${Date.now()}`);
    if (!companyCache[key]) {
      el.innerHTML = `<div class="loading">Loading ${esc(key === "spacex" ? "SpaceX" : "Tesla")}…</div>`;
      try {
        companyCache[key] = await getJSON(`data/${key}.json`);
      } catch (err) {
        if (el.dataset.token === token) el.innerHTML = `<div class="error">Couldn't load data/${esc(key)}.json (${esc(err.message)}).</div>`;
        return;
      }
    }
    if (!sentimentCache) {
      try { sentimentCache = await getJSON("data/sentiment.json"); } catch (e) { sentimentCache = { error: e.message }; }
    }
    if (el.dataset.token !== token) return; // user navigated away meanwhile
    drawCompany(el, companyCache[key], sentimentCache);
  }

  const sectionHead = (id, title, extra = "") => `<div class="group-head"><h2 id="h-${id}">${esc(title)}</h2>${extra}<span class="rule"></span></div>`;
  const asOf = (txt) => (isNA(txt) ? "" : `<span class="range">${esc(txt)}</span>`);
  const linkOr = (text, url) => (safeUrl(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : esc(text));
  const tone = (v) => (/^\s*[−-]/.test(String(v)) ? "down" : /^\s*\+/.test(String(v)) ? "up" : "");

  function finTable(t) {
    const cols = t.columns || [];
    return `<div class="table-wrap"><table class="fin">
      ${t.caption ? `<caption>${esc(t.caption)}</caption>` : ""}
      <thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${(t.rows || []).map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1)
        .map((v) => `<td class="${/^\(.*\)$/.test(String(v)) || /^[−-]\d/.test(String(v)) ? "neg" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>${safeUrl(t.sourceUrl) ? `<div class="tbl-src">${srcLink(t.sourceUrl, t.sourceLabel || "Source")}</div>` : ""}`;
  }

  function drawCompany(el, d, sent) {
    const f = d.fundamentals || {}, snap = d.snapshot || {}, inv = d.investors || {};
    const chips = PARTS.filter((p) => p.id !== "grades" || hasDeepGrades(d)).map((p) => `<button class="chip" data-jump="${p.id}">${esc(p.label)}</button>`).join("");

    /* ---- Status / snapshot ---- */
    const ipo = d.ipo;
    const statusPanel = `<section class="panel summary co-status" aria-label="Snapshot">
      <div class="co-quote">
        <div>
          <div class="tags"><span class="tag ticker">${esc(d.ticker)}</span><span class="tag sector">${esc(d.exchange)}</span>${d.status === "public" ? `<span class="tag live-tag"><span class="live-dot"></span>Public</span>` : `<span class="tag spac">Private</span>`}${followToggleHTML(d.ticker, { compact: true })}</div>
        </div>
        <div class="pick-price lq" data-lq="${esc(normalizeTicker(d.ticker))}"${etfCloseDate(snap.asOf) ? ` data-lq-date="${etfCloseDate(snap.asOf)}"` : ""}>
          <div class="p">${esc(money(snap.price))}</div>
          <div class="chg ${tone(snap.change)}">${esc(snap.change || "")}</div>
          <div class="d">${esc(snap.asOf || "")} · snapshot</div>
        </div>
      </div>
      <p class="co-tagline">${esc(d.tagline || "")}</p>
      <dl class="meta">
        ${metaItem("Market cap", snap.marketCap)}${metaItem(ipo ? "Range since IPO" : "52-week range", ipo ? (snap.range52w || "").replace(/\s*\(since IPO\)/, "") : snap.range52w)}
        ${metaItem("Analysts", f.analyst ? `${f.analyst.rating} (${f.analyst.count})` : "n/a")}${metaItem("Avg. target", f.analyst ? `${f.analyst.priceTarget} (${f.analyst.upside})` : "n/a")}
      </dl>
      ${d.statusNote ? `<p class="co-note">${esc(d.statusNote)}</p>` : ""}
      ${ipo ? `<dl class="facts ipo-facts">
          <div><dt>IPO date</dt><dd>${esc(fmtShortDate(ipo.date))}</dd></div>
          <div><dt>IPO price</dt><dd>${esc(ipo.price)}</dd></div>
          <div><dt>Raised</dt><dd>${esc(ipo.proceeds)}</dd></div>
          <div><dt>Valuation at IPO</dt><dd>${esc(ipo.valuationAtIpo)}</dd></div>
          <div><dt>First-day close</dt><dd>${esc(ipo.firstDayClose)}</dd></div>
          <div><dt>Lead banks</dt><dd>${esc(ipo.leads)}</dd></div>
          <div><dt>Lock-up</dt><dd>${esc(ipo.lockup)}</dd></div>
        </dl>
        <div class="srcs tbl-src">${(ipo.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>` : ""}
      <div class="tbl-src">${srcLink(snap.sourceUrl, "Price snapshot source")}</div>
    </section>`;

    /* ---- Live ---- */
    const live = `<section class="group" id="g-live" aria-labelledby="h-live">
      ${sectionHead("live", "Live", `<span class="range">TradingView</span>`)}
      <div class="panel tv-panel"><div class="tv" id="tv-quote" data-kind="symbol-info"></div></div>
      <div class="panel tv-panel tv-chart"><div class="tv" id="tv-chart" data-kind="advanced-chart"></div></div>
      <div class="panel tv-panel tv-feed"><div class="tv" id="tv-feed" data-kind="timeline"></div></div>
      <p class="fineprint">Live quote, chart and headline feed are TradingView widgets loaded in your browser (quotes may be delayed per exchange rules). If they're blocked or you're offline, use the snapshot above. <a href="https://www.tradingview.com/symbols/${esc(String(d.tvSymbol || "").replace(":", "-"))}/" target="_blank" rel="noopener noreferrer">Open ${esc(d.ticker)} on TradingView</a></p>
    </section>`;

    /* ---- Fundamentals ---- */
    const kpis = (f.kpis || []).map((k) => `<div><dt>${esc(k.label)}</dt><dd class="${tone(k.value)}">${esc(k.value)}</dd>${k.note ? `<span class="sub">${esc(k.note)}</span>` : ""}</div>`).join("");
    const an = f.analyst;
    const pointList = (arr, cls) => `<ul class="bullets ${cls}">${(arr || []).map((b) => `<li>${esc(b.text)} ${safeUrl(b.url) ? `<a class="src inline" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" aria-label="Source">${svg("ext")}</a>` : ""}</li>`).join("")}</ul>`;
    const catalysts = (f.catalysts || []).map((c) => `<li><span class="when">${esc(/^\d{4}-\d{2}-\d{2}$/.test(c.date) ? fmtShortDate(c.date) : /^\d{4}-\d{2}$/.test(c.date) ? new Date(c.date + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : c.date)}</span>
        <span class="what">${linkOr(c.event, c.url)} ${c.status && !/confirmed|scheduled/.test(c.status) ? `<span class="tag ${c.status === "unconfirmed" ? "warn" : ""}">${esc(c.status)}</span>` : ""}</span></li>`).join("");
    const fundamentals = `<section class="group" id="g-fundamentals" aria-labelledby="h-fundamentals">
      ${sectionHead("fundamentals", "Fundamentals")}
      <p class="fineprint top">${esc(f.asOf || "")} · ${srcLink(f.kpiSource, "Source")}</p>
      <dl class="kpis">${kpis}</dl>
      <div class="co-grid">
        ${(f.tables || []).map((t) => `<div class="panel pad">${finTable(t)}</div>`).join("")}
      </div>
      ${(f.notes || []).length ? `<ul class="bullets notes-list">${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul><div class="tbl-src">${srcLink(f.notesSourceUrl, "Source")}</div>` : ""}
      <div class="co-grid">
        <div class="panel pad"><h3 class="mini">Bull case</h3>${pointList(f.bull, "bull")}</div>
        <div class="panel pad"><h3 class="mini">Bear case</h3>${pointList(f.bear, "risk")}</div>
        ${an ? `<div class="panel pad"><h3 class="mini">Analyst consensus</h3>
          <div class="consensus"><span class="rating">${esc(an.rating)}</span><span>${esc(an.count)} analysts · avg target <strong>${esc(an.priceTarget)}</strong> <span class="${tone(an.upside)}">(${esc(an.upside)})</span></span></div>
          <ul class="bullets">${(an.calls || []).map((c) => `<li>${linkOr(c.text, c.url)}</li>`).join("")}</ul>
          <div class="tbl-src">${srcLink(an.sourceUrl, "Consensus source")}</div></div>` : ""}
        <div class="panel pad"><h3 class="mini">Upcoming catalysts</h3><ul class="catalysts">${catalysts}</ul></div>
      </div>
    </section>`;

    /* ---- Investors ---- */
    const insiders = (inv.insiders || []).map((p) => `<div class="panel pad insider">
        <div class="insider-head"><h3>${esc(p.name)}</h3><div class="big">${esc(p.pct)}</div></div>${p.pctNote ? `<p class="pct-note">${esc(p.pctNote)}</p>` : ""}
        <p class="fineprint top">${esc(p.shares)} shares · as of ${esc(fmtShortDate(p.asOf))} · ${srcLink(p.sourceUrl, p.sourceLabel || "Filing")}${(p.extraSources || []).map((x) => ` · ${srcLink(x.url, x.label)}`).join("")}</p>
        <ul class="bullets">${(p.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`).join("");
    const it = inv.institutions || {};
    const instRows = (it.rows || []).map((r) => `<tr>
        <th scope="row">${linkOr(r.name, r.url)}${r.estimate ? ` <span class="tag warn">est.</span>` : ""}${r.note ? `<span class="row-note">${esc(r.note)}</span>` : ""}</th>
        <td data-label="Shares">${esc(r.shares)}</td><td data-label="% held">${esc(r.pct)}</td><td data-label="Value">${esc(r.value)}</td><td data-label="Change / note" class="${tone(r.change)} wrap">${esc(r.change)}</td></tr>`).join("");
    const investors = `<section class="group" id="g-investors" aria-labelledby="h-investors">
      ${sectionHead("investors", "Major investors", asOf(it.asOf ? `as of ${fmtShortDate(it.asOf)}` : ""))}
      ${insiders}
      <div class="panel pad">
        <h3 class="mini">Institutional holders</h3>
        <div class="table-wrap"><table class="fin holders">
          <thead><tr><th scope="col">Holder</th><th scope="col">Shares</th><th scope="col">% held</th><th scope="col">Value</th><th scope="col">Change / note</th></tr></thead>
          <tbody>${instRows}</tbody></table></div>
        <p class="fineprint">${esc(it.note || "")} ${srcLink(it.sourceUrl, "Holder data")}</p>
      </div>
      ${(inv.notes || []).length ? `<ul class="bullets notes-list">${inv.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${(inv.sources || []).length ? `<div class="srcs tbl-src">${inv.sources.map((x) => srcLink(x.url, x.label)).join("")}</div>` : ""}
    </section>`;

    /* ---- News ---- */
    const news = `<section class="group" id="g-news" aria-labelledby="h-news">
      ${sectionHead("news", "Latest news", asOf(`${(d.news || []).length} headlines`))}
      <ol class="news">${(d.news || []).map((n) => `<li class="panel">
        <div class="news-meta"><span class="outlet">${esc(n.outlet)}</span><span>${esc(fmtShortDate(n.date))}</span></div>
        <h3>${linkOr(n.title, n.url)}</h3>
        <p>${esc(n.summary)}</p>
      </li>`).join("")}</ol>
      <p class="fineprint">Curated on ${esc(fmtShortDate(d.lastUpdated))}. For a live headline stream see the TradingView feed above.</p>
    </section>`;

    const eyebrow = d.exchange ? `${d.company} · ${d.exchange}` : d.company;
    el.innerHTML = `
      ${hero(eyebrow, d.company, `<span>${svg("clock")}Data updated ${esc(fmtDate(d.lastUpdated))}</span><span>${svg("pulse")}Live quote via TradingView</span>${followToggleHTML(d.ticker)}`)}
      ${liveBadgeHTML()}
      ${statusPanel}
      <div class="toolbar" role="toolbar" aria-label="Jump to section">${chips}</div>
      ${live}${deepGradesSection(d)}${fundamentals}${investors}${news}${sentimentSection(d.ticker, sent)}
      ${footer("For information only — not investment advice. Fundamentals, holdings and news are point-in-time snapshots from the linked sources and may be stale or incomplete; figures marked est. are approximations. Social sentiment is a noisy sample, not a signal.")}`;

    el.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => document.getElementById(`g-${b.dataset.jump}`).scrollIntoView({ behavior: "smooth" })));
    mountTradingView(el, d.tvSymbol || d.ticker);
    bindFollowToggles(el);
    if (el.isConnected) watchLive(el);
  }

  /* Deep-dive grades (scripts/futura_grades.py → d.grades/gradeMetrics/grading), Early Inflection checklist (d.earlyInflection)
     and an optional hand-curated run note (d.runContext). */
  const hasDeepGrades = (d) => !!(d && ((d.grades && typeof d.grades === "object") || (d.earlyInflection && typeof d.earlyInflection.score === "number") || d.runContext || (Array.isArray(d.listContext) && d.listContext.length)));
  function deepGradesSection(d) {
    if (!hasDeepGrades(d)) return "";
    const gm = d.gradeMetrics || {}, gr = d.grading || {}, ei = d.earlyInflection, rc = d.runContext;
    const pctv = (v, dgt = 0) => (typeof v === "number" ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(dgt)}%` : "n/a");
    const plain = (v, dgt = 1) => (typeof v === "number" ? `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(dgt)}%` : "n/a");
    const mult = (v) => (typeof v === "number" ? `${v.toFixed(1)}x` : "n/a");
    const stat = (label, val) => `<div><dt>${esc(label)}</dt><dd class="${val === "n/a" ? "na" : ""}">${esc(val)}</dd></div>`;
    const inputs = d.grades ? `<details class="block ei-drivers dd-inputs"><summary>Grade inputs</summary>
        <dl class="stats kf">
          ${stat("Revenue TTM", pctv(gm.revenueGrowthPct))}${stat("EPS 3-yr fcst", pctv(gm.epsGrowth3yPct))}${stat("Forward P/E", mult(gm.forwardPE))}
          ${stat("PEG", typeof gm.peg === "number" ? gm.peg.toFixed(2) : "n/a")}${stat("EV / sales", mult(gm.evSales))}${stat("1-yr vs SPY", typeof gm.relStrength1yPct === "number" ? `${gm.relStrength1yPct >= 0 ? "+" : "−"}${Math.abs(gm.relStrength1yPct).toFixed(0)} pts` : "n/a")}
          ${stat("6-month", pctv(gm.chg6mPct))}${stat("3-month", pctv(gm.chg3mPct))}${stat("Gross margin", plain(gm.grossMarginPct))}
          ${stat("Op. margin", plain(gm.operatingMarginPct))}${stat("Net margin", plain(gm.netMarginPct))}${stat("FCF margin", plain(gm.fcfMarginPct))}
        </dl></details>` : "";
    const gradesPanel = d.grades ? `<div class="panel pad dd-grades">
        <h3 class="mini">Letter grades</h3>
        ${gradesHTML(d, `Letter grades for ${d.ticker}`)}
        ${d.gradeNote ? `<p class="co-note">${esc(d.gradeNote)}</p>` : ""}
        <p class="fineprint top dd-pool">${esc(gr.pool || "Ranked against the Growth, Risk It and Early Inflection picks and backups")}.${gr.asOf ? ` Computed ${esc(fmtShortDate(gr.asOf))}.` : ""} <strong>*</strong> = some inputs missing; n/a = none available.</p>
        <ul class="bullets dd-legend">
          <li><strong>Growth</strong>: ${esc((gr.inputs || {}).growth || "revenue growth and forecast EPS growth")}</li>
          <li><strong>Value</strong>: ${esc((gr.inputs || {}).value || "forward P/E, PEG and EV/sales")}</li>
          <li><strong>Momentum</strong>: ${esc((gr.inputs || {}).momentum || "1-yr relative strength vs SPY, 6- and 3-month price change")}</li>
          <li><strong>Profit</strong>: ${esc((gr.inputs || {}).profitability || "gross, operating, net and FCF margins")}</li>
        </ul>
        ${inputs}
        <div class="tbl-src">${(gr.sources || []).slice(0, 3).map((u, i) => srcLink(u, ["StockAnalysis stats", "Quarterly financials", "Nasdaq closes"][i] || "Source")).join("")}</div>
      </div>` : "";
    const eiPanel = ei && typeof ei.score === "number" ? `<div class="panel pad dd-ei">
        <div class="dd-ei-head"><h3 class="mini">Early Inflection</h3><span class="score-badge is-early" title="Early Inflection score (0–100)">${esc(ei.score)}<small>/100</small></span></div>
        <p class="fineprint top">${ei.inScreen ? "Scored in today's Early Inflection screen." : `Not in the daily screen${ei.outsideScreenReason ? ` (${esc(ei.outsideScreenReason)})` : ""}, so it's scored here with the same rubric and checklist.`}${ei.priceDate ? ` Prices as of ${esc(fmtShortDate(ei.priceDate))}.` : ""}</p>
        ${Array.isArray(ei.keyFigures) && ei.keyFigures.length ? `<dl class="stats kf">${ei.keyFigures.map((k) => stat(k.label, isNA(k.value) ? "n/a" : String(k.value))).join("")}</dl>` : ""}
        ${checklistHTML(ei.checklist)}
        ${Array.isArray(ei.drivers) && ei.drivers.length ? `<details class="block ei-drivers"><summary>Score breakdown</summary><ul class="bullets drivers">${ei.drivers.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></details>` : ""}
        <div class="tbl-src"><a class="src" href="#/early">Open the Early Inflection tab</a>${(Array.isArray(ei.sourceUrl) ? ei.sourceUrl : []).slice(0, 1).map((u) => srcLink(u, "Inputs")).join("")}</div>
      </div>` : "";
    const rcPanel = rc ? `<div class="panel pad dd-run">
        <h3 class="mini">${esc(rc.title || "Context")}</h3>
        ${rc.summary ? `<p class="dd-run-sum">${esc(rc.summary)}</p>` : ""}
        ${Array.isArray(rc.points) && rc.points.length ? `<dl class="stats kf">${rc.points.map((k) => `<div><dt>${esc(k.label)}</dt><dd>${esc(k.value)}${k.note ? `<small>${esc(k.note)}</small>` : ""}</dd></div>`).join("")}</dl>` : ""}
        ${Array.isArray(rc.signals) && rc.signals.length ? `<div class="block"><h4>${esc(rc.signalsTitle || "What was visible at the time")}</h4><ul class="bullets">${rc.signals.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${rc.caveat ? `<p class="fineprint top">${esc(rc.caveat)}</p>` : ""}
        ${(rc.sources || []).length ? `<div class="srcs tbl-src">${rc.sources.map((x) => srcLink(x.url, x.label)).join("")}</div>` : ""}
      </div>` : "";
    const routes = { "Growth": "#/growth", "Risk It": "#/riskit", "Early Inflection": "#/early" };
    const lists = (Array.isArray(d.listContext) ? d.listContext : []).filter((c) => c && c.list);
    const listPanels = lists.map((c) => {
      const isRisk = c.list === "Risk It", route = routes[c.list] || "#/";
      const where = `${c.role === "bench" ? "Backup" : "Pick"} #${esc(c.rank)}${c.of ? ` of ${esc(c.of)}` : ""}`;
      return `<div class="panel pad dd-list">
        <div class="dd-ei-head"><h3 class="mini">On ${esc(c.list)}</h3>${typeof c.score === "number" ? `<span class="score-badge${c.list === "Early Inflection" ? " is-early" : ""}" title="${esc(c.list)} score (0–100)">${esc(c.score)}<small>/100</small></span>` : ""}</div>
        <p class="dd-run-sum">${where}${c.riskLevel ? ` · Risk: <strong>${esc(c.riskLevel)}</strong>` : ""}${c.priceDate ? ` · prices ${esc(fmtShortDate(c.priceDate))}` : ""}</p>
        ${c.trend ? `<p class="co-note">${esc(c.trend)}</p>` : ""}
        ${Array.isArray(c.drivers) && c.drivers.length ? `<div class="block"><h4>Score breakdown</h4><ul class="bullets drivers">${c.drivers.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
        ${Array.isArray(c.risks) && c.risks.length ? `<details class="block ei-drivers"><summary>${isRisk ? "Flagged risks" : "Risks"}</summary><ul class="bullets">${c.risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></details>` : ""}
        <p class="fineprint top">Copied from the ${esc(c.list)} list${c.listUpdated ? ` updated ${esc(fmtShortDate(c.listUpdated))}` : ""}; refreshed with the daily run.</p>
        <div class="tbl-src"><a class="src" href="${route}">Open the ${esc(c.list)} tab</a></div>
      </div>`;
    }).join("");
    return `<section class="group" id="g-grades" aria-labelledby="h-grades">
      ${sectionHead("grades", "Grades", asOf(gr.asOf ? `computed ${fmtShortDate(gr.asOf)}` : ""))}
      <div class="co-grid">${gradesPanel}${listPanels}${eiPanel}${rcPanel}</div>
    </section>`;
  }

  function sentimentSection(ticker, sent) {
    const head = sectionHead("sentiment", "Sentiment", asOf(sent && sent.lastUpdated ? new Date(sent.lastUpdated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""));
    if (!sent || sent.error || !sent.symbols || !sent.symbols[ticker]) {
      return `<section class="group" id="g-sentiment" aria-labelledby="h-sentiment">${head}<div class="empty">Sentiment snapshot unavailable${sent && sent.error ? ` (${esc(sent.error)})` : ""}.</div></section>`;
    }
    const s = sent.symbols[ticker];
    const st = s.stocktwits || {}, ap = s.apewisdom || {}, ws = s.wsbTradestie || {};
    const tiles = [];
    if (st.status === "ok") {
      const bull = st.bullishPctOfTagged;
      tiles.push(`<div class="panel pad senti">
        <h3 class="mini">StockTwits</h3>
        <div class="big ${bull >= 50 ? "up" : "down"}">${bull == null ? "n/a" : `${bull.toFixed(0)}% bullish`}</div>
        <div class="bar" role="img" aria-label="${st.bullish} bullish vs ${st.bearish} bearish"><span class="b-up" style="width:${bull || 0}%"></span><span class="b-down" style="width:${bull == null ? 0 : 100 - bull}%"></span></div>
        <p class="fineprint top">${st.bullish} bullish · ${st.bearish} bearish · ${st.untagged} untagged of the last ${st.messagesSampled} messages${st.windowStart ? ` (${esc(new Date(st.windowStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}–${esc(new Date(st.windowEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }))})` : ""}</p>
        ${st.watchlistCount ? `<p class="fineprint">${Number(st.watchlistCount).toLocaleString("en-US")} watchers</p>` : ""}
        <div class="tbl-src">${srcLink(st.url, "Open StockTwits stream")}</div></div>`);
    }
    if (ap.status === "ok") {
      const delta = ap.mentionsPrev24h ? Math.round(((ap.mentions24h - ap.mentionsPrev24h) / ap.mentionsPrev24h) * 100) : null;
      tiles.push(`<div class="panel pad senti">
        <h3 class="mini">Reddit & 4chan mentions</h3>
        <div class="big">${ap.mentions24h} <small>mentions / 24h</small></div>
        <p class="fineprint top">${delta == null ? "" : `<span class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "+" : ""}${delta}%</span> vs prior 24h (${ap.mentionsPrev24h}) · `}rank #${ap.rank} of all tickers${ap.rankPrev24h ? ` (was #${ap.rankPrev24h})` : ""} · ${ap.upvotes24h} upvotes</p>
        <div class="tbl-src">${srcLink(ap.url, "ApeWisdom")}</div></div>`);
    }
    if (ws.status === "ok") {
      tiles.push(`<div class="panel pad senti">
        <h3 class="mini">r/wallstreetbets mood</h3>
        <div class="big ${ws.sentiment === "Bullish" ? "up" : "down"}">${esc(ws.sentiment)}</div>
        <p class="fineprint top">Score ${ws.score > 0 ? "+" : ""}${ws.score} on ${ws.comments} comments today (Tradestie, −1 to +1)${ws.comments < 10 ? " — tiny sample" : ""}</p>
        <div class="tbl-src">${srcLink("https://tradestie.com/apps/reddit/api/", "Tradestie")}</div></div>`);
    }
    const q = encodeURIComponent(ticker);
    return `<section class="group" id="g-sentiment" aria-labelledby="h-sentiment">${head}
      <p class="fineprint top">Snapshot of public social data${sent.lastUpdated ? ` taken ${esc(new Date(sent.lastUpdated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}` : ""}; refreshed by scripts/refresh_sentiment.py.</p>
      <div class="co-grid three">${tiles.join("") || `<div class="empty">No sources returned data in this snapshot.</div>`}</div>
      <div class="panel pad method-note">
        <h3 class="mini">How this is measured</h3>
        <p>${esc(sent.method || "")}</p>
        ${(sent.unavailable || []).length ? `<ul class="bullets">${sent.unavailable.map((u) => `<li><strong>${esc(u.source)}:</strong> ${esc(u.reason)}</li>`).join("")}</ul>` : ""}
        <div class="srcs tbl-src">
          ${srcLink(`https://www.reddit.com/search/?q=%24${ticker}&sort=new`, "Reddit search")}
          ${srcLink(`https://trends.google.com/trends/explore?date=now%207-d&geo=US&q=${q}`, "Google Trends")}
          ${srcLink(`https://x.com/search?q=%24${ticker}&f=live`, "X search")}
        </div>
      </div>
    </section>`;
  }

  /* TradingView embeds: free, client-side, no key. Scripts must be created via DOM to execute. */
  function mountTradingView(root, symbol) {
    if (!symbol) return;
    const base = { colorTheme: "dark", isTransparent: true, locale: "en" };
    const configs = {
      "symbol-info": { ...base, symbol, width: "100%" },
      "advanced-chart": { ...base, theme: "dark", symbol, width: "100%", height: 440, interval: "D", timezone: "America/New_York", style: "1", hide_side_toolbar: true, allow_symbol_change: false, withdateranges: true, save_image: false, backgroundColor: "rgba(10, 10, 12, 1)", gridColor: "rgba(212,175,55,0.06)", support_host: "https://www.tradingview.com" },
      timeline: { ...base, feedMode: "symbol", symbol, displayMode: "compact", width: "100%", height: 420 },
    };
    const load = (box) => {
      if (box.dataset.loaded) return;
      box.dataset.loaded = "1";
      const kind = box.dataset.kind;
      box.className = "tv tradingview-widget-container";
      box.innerHTML = `<div class="tradingview-widget-container__widget"></div><div class="tv-fallback">Loading TradingView ${kind === "timeline" ? "news feed" : kind === "advanced-chart" ? "chart" : "quote"}…</div>`;
      const sc = document.createElement("script");
      sc.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`;
      sc.async = true;
      sc.text = JSON.stringify(configs[kind]);
      sc.onerror = () => { box.querySelector(".tv-fallback").textContent = "TradingView widget couldn't load (offline or blocked). Showing snapshot data only."; };
      box.appendChild(sc);
      const fb = box.querySelector(".tv-fallback");
      new MutationObserver((_, obs) => { if (box.querySelector("iframe")) { fb.remove(); obs.disconnect(); } }).observe(box, { childList: true, subtree: true });
    };
    const boxes = root.querySelectorAll(".tv[data-kind]");
    if (!navigator.onLine) {
      boxes.forEach((b) => (b.innerHTML = `<div class="tv-fallback">Offline: live widgets unavailable. Showing snapshot data.</div>`));
      return;
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: "300px" });
      boxes.forEach((b) => io.observe(b));
    } else boxes.forEach(load);
  }

  /* ================= Cassiopeia ================= */
  const casState = { data: null, anim: null };

  async function renderCassiopeia(el) {
    const token = (el.dataset.token = `cassiopeia-${Date.now()}`);
    if (!casState.data) {
      el.innerHTML = `<div class="loading">Loading Cassiopeia…</div>`;
      try { casState.data = await getJSON("data/cassiopeia.json"); }
      catch (err) {
        if (el.dataset.token === token) el.innerHTML = `<div class="error">Couldn't load data/cassiopeia.json (${esc(err.message)}).</div>`;
        return;
      }
    }
    if (el.dataset.token !== token) return;
    if (casState.anim) { casState.anim.destroy(); casState.anim = null; }
    drawCassiopeia(el, casState.data);
  }

  function drawCassiopeia(el, d) {
    const starCards = (d.stars.items || []).map((st) => `
      <article class="panel pad cas-star-card" data-star="${esc(st.id)}">
        <div class="cas-star-head">
          <span class="cas-dot" style="--g:${Number(st.glow) || 0.8}" aria-hidden="true"></span>
          <div>
            <h3>${esc(st.name)} <span class="bayer">${esc(st.bayer)}</span></h3>
            <div class="tags">
              <span class="tag sector">${esc(st.spectral)}</span>
              <span class="tag">mag ${esc(st.magnitude)}</span>
              <span class="tag">${esc(st.distance)}</span>
            </div>
          </div>
        </div>
        <p>${esc(st.fact)}</p>
        <div class="srcs tbl-src">${(st.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>
      </article>`).join("");

    const deep = (d.deepSky.items || []).map((o) => `
      <article class="panel pad">
        <h3 class="mini">${esc(o.name)}</h3>
        <div class="tags" style="margin:0 0 8px">
          <span class="tag sector">${esc(o.designation)}</span>
          ${o.distance ? `<span class="tag">${esc(o.distance)}</span>` : ""}
          ${o.size ? `<span class="tag">${esc(o.size)}</span>` : ""}
        </div>
        <p class="block" style="margin:0"><span style="color:var(--muted);font-size:14px">${esc(o.blurb)}</span></p>
        <div class="srcs tbl-src">${(o.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>
      </article>`).join("");

    const obsFacts = (d.observing.facts || []).map((f) =>
      `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("");

    el.innerHTML = `
      <section class="cas-hero" aria-label="Cassiopeia constellation animation">
        <div class="cas-stage" id="cas-stage"></div>
        <div class="cas-hero-copy">
          <p class="eyebrow">The northern queen</p>
          <h1 class="page-title">${esc(d.title)}</h1>
          <p class="cas-tagline">${esc(d.tagline)}</p>
          <p class="motto-line"><span class="motto">${esc(d.motto || "looking higher")}</span></p>
          <div class="page-meta"><span>${svg("clock")}Updated ${esc(fmtDate(d.lastUpdated))}</span></div>
        </div>
      </section>

      <section class="panel method cas-intro">
        <p>${esc(d.intro)}</p>
      </section>

      <section class="group" id="g-myth" aria-labelledby="h-myth">
        ${sectionHead("myth", d.mythology.title)}
        <div class="panel pad cas-prose"><p>${esc(d.mythology.prose)}</p>
          <div class="srcs tbl-src">${(d.mythology.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>
        </div>
      </section>

      <section class="group" id="g-observe" aria-labelledby="h-observe">
        ${sectionHead("observe", d.observing.title)}
        <div class="panel pad cas-prose"><p>${esc(d.observing.prose)}</p>
          <dl class="facts" style="margin-top:14px">${obsFacts}</dl>
          <div class="srcs tbl-src">${(d.observing.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>
        </div>
      </section>

      <section class="group" id="g-stars" aria-labelledby="h-stars">
        ${sectionHead("stars", d.stars.title)}
        <p class="fineprint top">${esc(d.stars.intro)}</p>
        <div class="cas-stars">${starCards}</div>
      </section>

      <section class="group" id="g-deep" aria-labelledby="h-deep">
        ${sectionHead("deep", d.deepSky.title)}
        <p class="fineprint top">${esc(d.deepSky.intro)}</p>
        <div class="co-grid">${deep}</div>
      </section>

      <section class="group" id="g-why" aria-labelledby="h-why">
        ${sectionHead("why", d.whyFutura.title)}
        <div class="panel pad cas-prose why-panel">
          <p class="motto-line why-motto"><span class="motto">${esc(d.motto || "looking higher")}</span></p>
          <p>${esc(d.whyFutura.prose)}</p>
          <div class="srcs tbl-src">${(d.whyFutura.sources || []).map((x) => srcLink(x.url, x.label)).join("")}</div>
        </div>
      </section>

      ${`<footer class="disclaimer cas-foot">${cassiopeia({ cls: "logo", variant: "logo" })}<span><span class="motto foot-motto">${esc(d.motto || "looking higher")}</span>${esc(d.disclaimer || "For inspiration and learning — not investment advice.")}</span></footer>`}`;

    casState.anim = mountCasHero(el.querySelector("#cas-stage"));
  }

  /* Lifelike Cassiopeia hero: SVG W + independent magnitude-weighted glows + soft starfield drift.
   * Coordinates match the shared CAS projection used in the logo (Segin→Caph). */
  function mountCasHero(stage) {
    if (!stage) return { destroy() {} };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = 720, H = 420;
    // Project CAS into a generous padded frame for the hero (north-up W).
    const padX = 90, padY = 70;
    const xs = CAS.map((s) => s.x), ys = CAS.map((s) => s.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
    const scale = Math.min((W - padX * 2) / spanX, (H - padY * 2) / spanY);
    const ox = (W - spanX * scale) / 2 - minX * scale;
    const oy = (H - spanY * scale) / 2 - minY * scale + 8;
    // Spectral warmth: K→amber-orange, F→honey gold, A→cream gold, B→hot white-gold (still warm, not cool blue).
    const TONES = {
      Segin:   { halo: "#e8c878", core: "#fff1c4", mid: "#f0d48a", rim: "#c9953a" }, // B3 — hot white-gold
      Ruchbah: { halo: "#e8c070", core: "#fff4d0", mid: "#efd090", rim: "#c9943a" }, // A5 — cream gold
      Navi:    { halo: "#edd48a", core: "#fff8e0", mid: "#f3dc9a", rim: "#d4af37" }, // B0.5 — brightest white-gold
      Schedar: { halo: "#e0a04a", core: "#ffe0a8", mid: "#e8b45a", rim: "#b8732a" }, // K0 — orange-gold
      Caph:    { halo: "#e8c060", core: "#fff0c0", mid: "#efcc78", rim: "#c99832" }, // F2 — honey gold
    };
    const pts = CAS.map((s) => ({
      ...s,
      px: ox + s.x * scale,
      py: oy + s.y * scale,
      bright: Math.max(0.55, Math.min(1, (3.55 - s.m) / 1.45)),
      tone: TONES[s.n] || TONES.Caph,
    }));

    let seed = 20261006;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const bgCount = Math.round((W * H) / 2800);
    let bg = "";
    for (let i = 0; i < bgCount; i++) {
      const x = rnd() * W, y = rnd() * H, r = 0.35 + rnd() * 0.85, o = 0.07 + rnd() * 0.26;
      const tw = rnd() > 0.82;
      // Warm cream field stars (not cool white)
      bg += `<circle class="cas-bg${tw && !reduce ? " tw" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"${
        tw && !reduce ? ` style="--o:${o.toFixed(2)};--d:${(5 + rnd() * 7).toFixed(1)}s;--delay:${(rnd() * 8).toFixed(1)}s"` : ""
      }/>`;
    }
    const line = pts.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
    const grads = pts.map((p, i) => {
      const t = p.tone;
      return `<radialGradient id="casCore${i}" cx="35%" cy="30%" r="65%">
          <stop offset="0" stop-color="#fffaf0"/><stop offset=".35" stop-color="${t.core}"/><stop offset=".75" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.rim}"/>
        </radialGradient>
        <radialGradient id="casHalo${i}" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="${t.halo}" stop-opacity=".55"/><stop offset=".35" stop-color="${t.mid}" stop-opacity=".22"/><stop offset=".7" stop-color="${t.rim}" stop-opacity=".06"/><stop offset="1" stop-color="${t.rim}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="casBloom${i}" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="${t.halo}" stop-opacity=".28"/><stop offset=".5" stop-color="${t.mid}" stop-opacity=".08"/><stop offset="1" stop-color="${t.rim}" stop-opacity="0"/>
        </radialGradient>`;
    }).join("");
    const stars = pts.map((p, i) => {
      const r = 3.4 + p.bright * 5.4;
      // Label offset: keep names off the connecting lines; alternate above/below.
      const below = p.py > H * 0.48;
      const ly = below ? p.py + r * 2.8 + 14 : p.py - r * 2.8 - 8;
      return `<g class="cas-main" data-i="${i}" data-star="${esc(p.n)}" style="--bright:${p.bright.toFixed(3)};--halo:${p.tone.halo}">
        <circle class="cas-bloom" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${(r * 8.5).toFixed(1)}" fill="url(#casBloom${i})"/>
        <circle class="cas-halo" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${(r * 4.6).toFixed(1)}" fill="url(#casHalo${i})"/>
        <circle class="cas-core" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${r.toFixed(2)}" fill="url(#casCore${i})"/>
        <circle class="cas-spark" cx="${(p.px - r * 0.18).toFixed(1)}" cy="${(p.py - r * 0.22).toFixed(1)}" r="${(r * 0.32).toFixed(2)}"/>
        <text class="cas-name" x="${p.px.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${esc(p.n)}</text>
      </g>`;
    }).join("");

    stage.innerHTML = `<svg class="cas-sky${reduce ? " is-reduced" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Cassiopeia as a glowing W of five stars: Segin, Ruchbah, Navi, Schedar, Caph">
      <defs>
        <radialGradient id="casHeroGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stop-color="#d4af37" stop-opacity=".12"/>
          <stop offset=".55" stop-color="#c9953a" stop-opacity=".03"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="casHeroLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3dc8c"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#a8842a"/>
        </linearGradient>
        <filter id="casSoft" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="1.8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="casGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.4" result="g"/>
          <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        ${grads}
      </defs>
      <rect width="${W}" height="${H}" fill="url(#casHeroGlow)"/>
      <g class="cas-field">${bg}</g>
      <polyline class="cas-line" points="${line}" fill="none" stroke="url(#casHeroLine)" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round" opacity=".68"/>
      ${stars}
    </svg>`;

    const svgEl = stage.querySelector(".cas-sky");
    const mains = [...stage.querySelectorAll(".cas-main")];
    const timers = [];
    let raf = 0, destroyed = false;
    let px = 0, py = 0, tx = 0, ty = 0;

    const pulse = (g) => {
      if (destroyed || reduce) return;
      const bright = parseFloat(g.style.getPropertyValue("--bright")) || 0.8;
      g.classList.remove("is-pulsing");
      // Force reflow so repeated pulses re-trigger the CSS animation.
      void g.offsetWidth;
      g.style.setProperty("--pulse-peak", (0.55 + bright * 0.55).toFixed(2));
      g.style.setProperty("--pulse-ms", `${Math.round(1400 + bright * 900)}ms`);
      g.classList.add("is-pulsing");
      const wait = 2200 + Math.random() * 5200 + (1 - bright) * 1800;
      const t = setTimeout(() => pulse(g), wait);
      timers.push(t);
    };

    if (reduce) {
      mains.forEach((g) => g.classList.add("is-rest"));
    } else {
      mains.forEach((g, i) => {
        g.classList.add("is-rest");
        const t = setTimeout(() => pulse(g), 400 + i * 380 + Math.random() * 900);
        timers.push(t);
      });
    }

    const onMove = (e) => {
      if (reduce || destroyed) return;
      const r = stage.getBoundingClientRect();
      const x = (("clientX" in e ? e.clientX : (e.touches && e.touches[0].clientX)) - r.left) / r.width - 0.5;
      const y = (("clientY" in e ? e.clientY : (e.touches && e.touches[0].clientY)) - r.top) / r.height - 0.5;
      tx = (x || 0) * 14; ty = (y || 0) * 8;
    };
    const tick = () => {
      if (destroyed) return;
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      svgEl.style.setProperty("--parx", px.toFixed(2) + "px");
      svgEl.style.setProperty("--pary", py.toFixed(2) + "px");
      raf = requestAnimationFrame(tick);
    };
    if (!reduce) {
      stage.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(tick);
    }

    return {
      destroy() {
        destroyed = true;
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        stage.removeEventListener("pointermove", onMove);
      },
    };
  }



  /* ================= Search ================= */
  const isValidFollowTicker = (t) => isValidTicker(t);

  async function loadCompanyIndex() {
    if (searchState.index) return searchState.index;
    try { searchState.index = await getJSON("data/companies/index.json"); }
    catch (e) { searchState.index = { tickers: {}, error: e.message }; }
    return searchState.index;
  }

  function rememberTicker(t) {
    searchState.recent = [t, ...searchState.recent.filter((x) => x !== t)].slice(0, 8);
    localStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(searchState.recent));
  }

  function tickerDisplayName(t) {
    const entry = (searchState.index && searchState.index.tickers && searchState.index.tickers[t]) || null;
    return entry && entry.company ? entry.company : "";
  }

  async function loadDeepDive(ticker) {
    const idx = await loadCompanyIndex();
    const entry = (idx.tickers || {})[ticker];
    const cacheKey = entry ? `file:${entry.file}` : `companies/${ticker}`;
    if (companyCache[cacheKey]) return { data: companyCache[cacheKey], fromIndex: !!entry };
    // Prefer alias map (SPCX→spacex.json, TSLA→tesla.json, AAPL→companies/AAPL.json)
    // Indexed tickers use their mapped file. Unknown tickers try companies/{T}.json once
    // (so a newly added file works without an index bump); no noisy lowercase fallback.
    const url = entry ? `data/${entry.file}` : `data/companies/${ticker}.json`;
    try {
      const d = await getJSON(url);
      companyCache[cacheKey] = d;
      return { data: d, fromIndex: !!entry };
    } catch (e) {
      return { data: null, fromIndex: false };
    }
  }

  function goSearch(ticker) {
    const t = normalizeTicker(ticker);
    if (!isValidTicker(t)) return;
    rememberTicker(t);
    const next = `#/search?t=${encodeURIComponent(t)}`;
    if (location.hash === next) route();
    else location.hash = next;
  }

  function followingSectionHTML(activeTicker = "") {
    const rows = searchState.following.map((t, i) => {
      const name = tickerDisplayName(t);
      const active = t === activeTicker ? " is-active" : "";
      return `<li class="follow-row${active}" data-ticker="${esc(t)}" data-index="${i}" draggable="false">
        <button type="button" class="follow-handle" aria-label="Drag to reorder ${esc(t)}" title="Drag to reorder">${svg("grip")}</button>
        <button type="button" class="follow-open" data-open="${esc(t)}">
          <span class="follow-ticker">${esc(t)}</span>
          ${name ? `<span class="follow-name">${esc(name)}</span>` : `<span class="follow-name faint">Ticker</span>`}
        </button>
        <button type="button" class="follow-quote lq" data-lq="${esc(t)}" data-open="${esc(t)}" tabindex="-1" aria-hidden="true"><span class="p">—</span><span class="chg"></span><span class="d"></span></button>
        <div class="follow-actions">
          <button type="button" class="follow-move follow-up" data-move="up" data-index="${i}" aria-label="Move ${esc(t)} up" ${i === 0 ? "disabled" : ""}>${svg("chevUp")}</button>
          <button type="button" class="follow-move follow-down" data-move="down" data-index="${i}" aria-label="Move ${esc(t)} down" ${i === searchState.following.length - 1 ? "disabled" : ""}>${svg("chevDown")}</button>
          <button type="button" class="follow-remove" data-unfollow="${esc(t)}" aria-label="Unfollow ${esc(t)}">${svg("x")}</button>
        </div>
      </li>`;
    }).join("");
    const empty = `<li class="follow-empty">No tickers yet — add one below or tap Follow on a quote.</li>`;
    return `
      <section class="following panel" aria-label="Following watchlist">
        <div class="following-head">
          <div>
            <h2 class="following-title">Following</h2>
            <p class="following-sub">Your watchlist · drag to reorder</p>
            <p class="live-badge" data-live-badge><span class="lb-dot" aria-hidden="true"></span><span>Loading live quotes…</span></p>
          </div>
          <button type="button" class="chip ghost follow-edit-btn" aria-pressed="${searchState.editMode ? "true" : "false"}">${searchState.editMode ? "Done" : "Edit"}</button>
        </div>
        <ul class="follow-list${searchState.editMode ? " is-editing" : ""}" id="follow-list">${rows || empty}</ul>
        <form class="follow-add" autocomplete="off">
          <label class="visually-hidden" for="follow-input">Add ticker to Following</label>
          <input id="follow-input" class="follow-input" type="text" inputmode="text" spellcheck="false"
            maxlength="12" placeholder="Add ticker" aria-describedby="follow-add-hint" />
          <button type="submit" class="follow-add-btn">+ Follow</button>
        </form>
        <p id="follow-add-hint" class="fineprint top follow-hint">Uppercase letters, digits, dots or hyphens. Order is saved on this device.</p>
        <p class="follow-add-error search-error" hidden role="alert"></p>
      </section>`;
  }

  function searchFormHTML(value = "", opts = {}) {
    const recent = (searchState.recent || []).filter((t) => t !== value).slice(0, 6)
      .map((t) => `<button type="button" class="chip ghost" data-t="${esc(t)}">${esc(t)}</button>`).join("");
    return `
      <form class="search-form panel" role="search" autocomplete="off">
        <label class="search-label" for="ticker-input">US ticker</label>
        <div class="search-row">
          <input id="ticker-input" class="search-input" name="t" type="text" inputmode="text" spellcheck="false"
            maxlength="12" placeholder="e.g. AAPL" value="${esc(value)}" aria-describedby="ticker-hint" />
          <button type="submit" class="search-go">${svg("search")}<span>Search</span></button>
        </div>
        <p id="ticker-hint" class="fineprint top">Letters, digits, dots and dashes. Live TradingView loads for any major US-listed symbol; a full deep dive appears when we have a local data file.</p>
        ${opts.error ? `<p class="search-error" role="alert">${esc(opts.error)}</p>` : ""}
        ${opts.followToggle || ""}
      </form>
      ${followingSectionHTML(value)}
      ${recent ? `<div class="search-chips panel search-recent"><span class="chips-label">Recent</span>${recent}</div>` : ""}`;
  }

  function refreshFollowingUI(root) {
    const host = root.querySelector(".following");
    if (!host) return;
    const active = normalizeTicker((root.querySelector("#ticker-input") || {}).value || "");
    const wrap = document.createElement("div");
    wrap.innerHTML = followingSectionHTML(active);
    host.replaceWith(wrap.firstElementChild);
    bindFollowing(root);
    root.querySelectorAll("[data-follow-toggle]").forEach((tog) => {
      paintFollowToggle(tog, isFollowing(tog.dataset.followToggle));
      delete tog.dataset.boundFollow;
    });
    bindFollowToggles(root);
  }

  function bindFollowing(el) {
    const section = el.querySelector(".following");
    if (!section) return;

    const editBtn = section.querySelector(".follow-edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        searchState.editMode = !searchState.editMode;
        refreshFollowingUI(el);
      });
    }

    const addForm = section.querySelector(".follow-add");
    const addInput = section.querySelector("#follow-input");
    const addErr = section.querySelector(".follow-add-error");
    if (addForm && addInput) {
      addInput.addEventListener("input", (e) => {
        const start = e.target.selectionStart;
        e.target.value = normalizeTicker(e.target.value);
        try { e.target.setSelectionRange(start, start); } catch (err) { /* ignore */ }
      });
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const t = normalizeTicker(addInput.value);
        if (!isValidFollowTicker(t)) {
          if (addErr) { addErr.hidden = false; addErr.textContent = "Enter a valid ticker (letters, digits, dots or hyphens)."; }
          return;
        }
        if (isFollowing(t)) {
          if (addErr) { addErr.hidden = false; addErr.textContent = `${t} is already on your Following list.`; }
          return;
        }
        addFollow(t);
        addInput.value = "";
        if (addErr) { addErr.hidden = true; addErr.textContent = ""; }
        refreshFollowingUI(el);
      });
    }

    section.querySelectorAll("[data-open]").forEach((b) => {
      b.addEventListener("click", () => goSearch(b.dataset.open));
    });
    section.querySelectorAll("[data-unfollow]").forEach((b) => {
      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        removeFollow(b.dataset.unfollow);
        refreshFollowingUI(el);
      });
    });
    section.querySelectorAll("[data-move]").forEach((b) => {
      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const i = +b.dataset.index;
        const to = b.dataset.move === "up" ? i - 1 : i + 1;
        moveFollow(i, to);
        refreshFollowingUI(el);
      });
    });

    // Pointer-event drag (works on iPhone; avoid HTML5 DnD).
    const list = section.querySelector("#follow-list");
    if (list) bindFollowPointerDrag(list, el);
    watchLive(el);
  }

  function bindFollowPointerDrag(list, root) {
    let drag = null;

    const onPointerDown = (e) => {
      if (e.button != null && e.button !== 0) return;
      const handle = e.target.closest(".follow-handle");
      if (!handle || !list.contains(handle)) return;
      const row = handle.closest(".follow-row");
      if (!row) return;
      e.preventDefault();
      const rows = [...list.querySelectorAll(".follow-row")];
      const index = rows.indexOf(row);
      if (index < 0) return;
      const rect = row.getBoundingClientRect();
      drag = {
        pointerId: e.pointerId,
        row,
        index,
        startY: e.clientY,
        offsetY: e.clientY - rect.top,
        height: rect.height,
        moved: false,
      };
      row.classList.add("is-dragging");
      list.classList.add("is-dragging");
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dy) > 4) drag.moved = true;
      drag.row.style.transform = `translateY(${dy}px)`;
      drag.row.style.zIndex = "5";
      const rows = [...list.querySelectorAll(".follow-row")].filter((r) => r !== drag.row);
      const mid = drag.row.getBoundingClientRect().top + drag.height / 2;
      let target = drag.index;
      rows.forEach((r) => {
        const rr = r.getBoundingClientRect();
        const rm = rr.top + rr.height / 2;
        const ri = +r.dataset.index;
        if (mid < rm && ri < target) target = ri;
        if (mid > rm && ri > target) target = ri;
      });
      // Visual reorder hint via CSS order on siblings
      list.querySelectorAll(".follow-row").forEach((r) => r.classList.remove("drop-above", "drop-below"));
      if (target !== drag.index) {
        const targetRow = list.querySelector(`.follow-row[data-index="${target}"]`);
        if (targetRow) targetRow.classList.add(target < drag.index ? "drop-above" : "drop-below");
      }
      drag.targetIndex = target;
    };

    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const handle = e.currentTarget;
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      drag.row.classList.remove("is-dragging");
      list.classList.remove("is-dragging");
      drag.row.style.transform = "";
      drag.row.style.zIndex = "";
      list.querySelectorAll(".follow-row").forEach((r) => r.classList.remove("drop-above", "drop-below"));
      const from = drag.index;
      const to = drag.targetIndex != null ? drag.targetIndex : from;
      drag = null;
      if (to !== from) {
        moveFollow(from, to);
        refreshFollowingUI(root);
      }
    };

    list.querySelectorAll(".follow-handle").forEach((h) => {
      h.addEventListener("pointerdown", onPointerDown);
      // Prevent scroll while dragging on touch
      h.style.touchAction = "none";
    });
  }

  function bindSearchForm(el) {
    const form = el.querySelector(".search-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const raw = form.querySelector("#ticker-input").value;
        const t = normalizeTicker(raw);
        if (!isValidTicker(t)) {
          const err = el.querySelector(".search-form .search-error") || document.createElement("p");
          err.className = "search-error"; err.setAttribute("role", "alert");
          err.textContent = "Enter a valid US ticker (1–10 characters, starting with a letter).";
          form.appendChild(err);
          return;
        }
        goSearch(t);
      });
      const input = form.querySelector("#ticker-input");
      if (input) {
        input.addEventListener("input", (e) => {
          const start = e.target.selectionStart;
          e.target.value = normalizeTicker(e.target.value);
          try { e.target.setSelectionRange(start, start); } catch (err) { /* ignore */ }
        });
      }
    }
    el.querySelectorAll(".search-chips [data-t], .search-recent [data-t]").forEach((b) =>
      b.addEventListener("click", () => goSearch(b.dataset.t)));
    bindFollowing(el);
    bindFollowToggles(el);
  }

  async function renderSearch(el, params = {}) {
    const token = (el.dataset.token = `search-${Date.now()}`);
    el.innerHTML = `<div class="loading">Loading search…</div>`;
    await loadCompanyIndex();
    if (!sentimentCache) {
      try { sentimentCache = await getJSON("data/sentiment.json"); } catch (e) { sentimentCache = { error: e.message }; }
    }
    if (el.dataset.token !== token) return;

    const ticker = normalizeTicker(params.t || "");
    if (!ticker) {
      el.innerHTML = `
        ${hero("Search", "Look up a ticker", `<span>${svg("search")}Live TradingView for any US symbol · deep dive when on file</span>`)}
        ${searchFormHTML("")}
        ${footer("Type a ticker to open a live quote, chart and news feed. Fundamentals, investors and curated news appear only when Futura has a local deep-dive file for that symbol.")}`;
      bindSearchForm(el);
      return;
    }
    if (!isValidTicker(ticker)) {
      el.innerHTML = `
        ${hero("Search", "Look up a ticker", `<span>${svg("search")}Live TradingView for any US symbol</span>`)}
        ${searchFormHTML(ticker, { error: "That doesn't look like a valid US ticker." })}
        ${footer("For information only — not investment advice.")}`;
      bindSearchForm(el);
      return;
    }

    const { data } = await loadDeepDive(ticker);
    if (el.dataset.token !== token) return;

    // Always show Live widgets for the typed ticker.
    const tvSymbol = (data && data.tvSymbol) || ticker;
    const companyName = (data && data.company) || tickerDisplayName(ticker) || ticker;
    const liveOnly = `
      <section class="group" id="g-live" aria-labelledby="h-live">
        ${sectionHead("live", "Live", `<span class="range">TradingView · ${esc(tvSymbol)}</span>`)}
        <div class="panel tv-panel"><div class="tv" id="tv-quote" data-kind="symbol-info"></div></div>
        <div class="panel tv-panel tv-chart"><div class="tv" id="tv-chart" data-kind="advanced-chart"></div></div>
        <div class="panel tv-panel tv-feed"><div class="tv" id="tv-feed" data-kind="timeline"></div></div>
        <p class="fineprint">Live quote, chart and headline feed are TradingView widgets for <strong>${esc(ticker)}</strong>. Quotes may be delayed per exchange rules. <a href="https://www.tradingview.com/symbols/${esc(String(tvSymbol).replace(":", "-"))}/" target="_blank" rel="noopener noreferrer">Open on TradingView</a></p>
      </section>`;

    let deep = "";
    if (data) {
      // Reuse the company renderer into a staging element, then lift its sections (skip its own Live + hero).
      const staging = document.createElement("div");
      drawCompany(staging, data, sentimentCache);
      const status = staging.querySelector(".co-status");
      const gradesSec = staging.querySelector("#g-grades");
      const fund = staging.querySelector("#g-fundamentals");
      const inv = staging.querySelector("#g-investors");
      const news = staging.querySelector("#g-news");
      const senti = staging.querySelector("#g-sentiment");
      const deepChips = PARTS.filter((p) => p.id !== "live" && (p.id !== "grades" || gradesSec)).map((p) =>
        `<button class="chip" data-jump="${p.id}">${esc(p.label)}</button>`).join("");
      deep = `
        <section class="group" id="g-deep" aria-labelledby="h-deep">
          ${sectionHead("deep", "Deep analysis", `<span class="range">on file · updated ${esc(fmtShortDate(data.lastUpdated))}</span>`)}
          <div class="toolbar" role="toolbar" aria-label="Jump to deep-dive section">${deepChips}</div>
          ${status ? status.outerHTML : ""}
          ${gradesSec ? gradesSec.outerHTML : ""}
          ${fund ? fund.outerHTML : ""}
          ${inv ? inv.outerHTML : ""}
          ${news ? news.outerHTML : ""}
          ${senti ? senti.outerHTML : ""}
        </section>`;
    } else {
      deep = `
        <section class="group" id="g-deep" aria-labelledby="h-deep">
          ${sectionHead("deep", "Deep analysis")}
          <div class="panel pad search-empty">
            <h3 class="mini">No deep dive on file for ${esc(ticker)} yet</h3>
            <p>Futura is a static app, so fundamentals, major investors and curated news only appear when a local data file exists (for example <code>data/companies/${esc(ticker)}.json</code>). Live TradingView above still works for any major US-listed symbol.</p>
            <p class="ask-line"><strong>Ask Investing App to research this ticker</strong> — a Sunday refresh can add popular names to the deep-dive library.</p>
            <p class="fineprint top">Tip: deep-dive URLs look like <code>#/search?t=${esc(ticker)}</code>, so once a file is added this page fills in automatically.</p>
          </div>
        </section>`;
    }

    el.innerHTML = `
      ${hero("Search", companyName, `<span class="tag ticker">${esc(ticker)}</span><span>${svg("pulse")}Live via TradingView</span>${data ? `<span>${svg("growth")}Deep dive on file</span>` : `<span>${svg("warn")}Live only</span>`}`)}
      ${searchFormHTML(ticker, { followToggle: `<div class="search-follow-row">${followToggleHTML(ticker)}</div>` })}
      ${liveOnly}
      ${deep}
      ${footer("For information only — not investment advice. Live widgets come from TradingView; deep-dive figures are point-in-time snapshots from linked sources and may be stale.")}`;

    bindSearchForm(el);
    el.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => document.getElementById(`g-${b.dataset.jump}`)?.scrollIntoView({ behavior: "smooth" })));
    mountTradingView(el, tvSymbol);
    const input = el.querySelector("#ticker-input");
    if (input) input.focus();
  }

  /* ================= Home ================= */
  // Fallback one-liners for the More overflow cards (Home no longer shows section tiles).
  const HOME_TILES = [
    { id: "spacex", title: "SpaceX", icon: "orbit", fallback: "SpaceX deep dive — catalysts, holders and valuation" },
    { id: "tesla", title: "Tesla", icon: "bolt", fallback: "Tesla deep dive — catalysts, holders and valuation" },
    { id: "search", title: "Search", icon: "search", fallback: "Look up any US ticker — live quote plus deep dive when on file" },
    { id: "early", title: "Early Inflection", icon: "sunrise", fallback: "LITE-2025-style setups: revenue turning up, stock not yet run" },
    { id: "track", title: "Track Record", icon: "chart", fallback: "How the Growth, Risk It and Early Inflection picks are doing vs QQQ and SPY" },
    { id: "cassiopeia", title: "Cassiopeia", icon: "cas", fallback: "The five stars behind the Futura W" },
  ];

  // "Oct 6, 2026 close" -> "2026-10-06" (used as the daily-close fallback label).
  function etfCloseDate(asOf) {
    const d = new Date(String(asOf || "").replace(/\s*close\s*$/i, ""));
    return isNaN(d) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function etfCard(e) {
    const chg = e.change || "";
    const tick = normalizeTicker(e.ticker);
    return `<a class="etf-card panel" href="#/search?t=${esc(tick)}" data-etf="${esc(tick)}">
      <div class="etf-top">
        <div>
          <div class="tags"><span class="tag ticker">${esc(tick)}</span><span class="tag sector">${esc(e.exchange || "ETF")}</span>${followToggleHTML(tick, { compact: true })}</div>
          <h3 class="etf-name">${esc(e.name)}</h3>
        </div>
        <div class="pick-price lq" data-lq="${esc(tick)}"${e.priceDate ? ` data-lq-date="${esc(e.priceDate)}"` : ""}>
          <div class="p">${esc(money(e.price))}</div>
          <div class="chg ${tone(chg)}">${esc(chg)}</div>
          <div class="d">${esc(e.priceDate ? `close ${fmtShortDate(e.priceDate).replace(/, \d{4}$/, "")}` : (e.asOf || ""))}</div>
        </div>
      </div>
      <p class="etf-tagline">${esc(e.tagline || "")}</p>
      <dl class="meta etf-meta">
        ${metaItem("Expense ratio", e.expenseRatio)}
        ${metaItem("AUM", e.aum)}
        ${metaItem("YTD", e.ytd)}
        ${metaItem("1Y return", e.return1y)}
      </dl>
      <div class="etf-foot">
        <span class="fineprint">${esc(e.ytdNote || e.return1yNote || "")}</span>
        <svg class="home-tile-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </div>
    </a>`;
  }

  async function renderHome(el) {
    const token = el.dataset.token;
    el.innerHTML = `
      <section class="home-hero" aria-label="Futura">
        <div class="home-stage" id="home-stage"></div>
        ${musicButton("mt-hero")}
        <div class="home-brand">
          <h1 class="home-wordmark">Futura</h1>
          <p class="home-motto"><span class="motto">looking higher</span></p>
        </div>
      </section>
      <section class="home-etfs" aria-label="Index ETFs">
        <div class="group-head"><h2>Index ETFs</h2><span class="range">VOO · QQQ</span><span class="rule"></span></div>
        ${liveBadgeHTML()}
        <div class="etf-grid"><div class="loading">Loading ETF snapshots…</div></div>
      </section>
      ${footer("Futura is a personal investing dashboard for information only, not investment advice. ETF figures are snapshots from the linked sources; tap a card to open Search for that ticker.")}`;

    casState.anim = mountCasHero(el.querySelector("#home-stage"));

    // VOO / QQQ cards (Search + Following live only on the Search tab).
    const grid = el.querySelector(".etf-grid");
    try {
      const d = await getJSON("data/etfs.json");
      if (el.dataset.token !== token) return;
      const list = d.etfs || [];
      grid.innerHTML = list.length
        ? list.map((x) => etfCard({ ...x, priceDate: x.priceDate || etfCloseDate(d.asOf) })).join("")
        : `<div class="empty">No ETF snapshots on file.</div>`;
      const headRange = el.querySelector(".home-etfs .range");
      if (headRange && d.asOf) headRange.textContent = d.asOf;
      // Prefer goSearch so recent searches update when tapping a card.
      grid.querySelectorAll("[data-etf]").forEach((a) => {
        a.addEventListener("click", (ev) => {
          if (ev.target.closest("[data-follow-toggle]")) return;
          ev.preventDefault();
          goSearch(a.dataset.etf);
        });
      });
      bindFollowToggles(el);
      watchLive(el);
    } catch (err) {
      if (el.dataset.token === token) grid.innerHTML = `<div class="error">Couldn't load ETF data (${esc(err.message)}).</div>`;
    }
  }

  /* "More" now doubles as the overflow menu for sections hidden from the mobile tab bar. */
  function renderMore(el) {
    const overflow = SECTIONS.filter((s) => s.overflow);
    el.innerHTML = `
      ${hero("More", "More sections", `<span>${svg("grid")}Everything that doesn't fit in the tab bar</span>`)}
      <section class="home-tiles more-tiles" aria-label="More sections">
        ${overflow.map((s) => {
          const t = HOME_TILES.find((x) => x.id === s.id) || { fallback: "" };
          return `<a class="home-tile panel" href="#/${s.id}">
            <span class="home-tile-icon">${svg(s.icon)}</span>
            <span class="home-tile-body"><span class="home-tile-title">${esc(s.label)}</span><span class="home-tile-line">${esc(t.fallback)}</span></span>
            <svg class="home-tile-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </a>`;
        }).join("")}
        <div class="home-tile panel is-soon">
          <span class="home-tile-icon">${svg("grid")}</span>
          <span class="home-tile-body"><span class="home-tile-title">Coming soon</span><span class="home-tile-line">New sections will appear here as they're added.</span></span>
        </div>
      </section>`;
  }

  buildSky();
  buildNav();
  window.addEventListener("hashchange", route);
  route();

  /* PWA: offline shell + network-first data (see sw.js). Relative URL keeps scope at the /futura/ subpath. */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e)));
  }
})();
