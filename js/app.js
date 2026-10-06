/* Futura: tiny hash-routed static app.
 * To add a section: add an entry to SECTIONS with id, label, short, icon and render(mainEl). */
(function () {
  "use strict";

  /* ---------------- Icons ---------------- */
  const ICONS = {
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 12l3 3"/><path d="M12 15l-3-3c1.5-4.5 5-9 11-9 0 6-4.5 9.5-9 11z"/><circle cx="15.5" cy="8.5" r="1.5"/>',
    growth: '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 6-7"/><path d="M15 7h4v4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 13.5v6M13.5 16.5h6"/>',
    ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    warn: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>',
    up: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
    down: '<path d="M4 7l6 6 4-4 6 7"/><path d="M15 16h5v-5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isNA = (v) => v == null || v === "" || (typeof v === "number" && !isFinite(v)) || String(v).trim().toLowerCase() === "n/a";
  const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);

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
  const brandHTML = () => `${cassiopeia({ cls: "logo", variant: "logo", title: "Cassiopeia" })}<span class="wordmark">Futura</span>`;

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
    { id: "ipos", label: "IPO Tracker", short: "IPOs", icon: "rocket", render: renderIpoTracker },
    { id: "growth", label: "Growth Picks", short: "Growth", icon: "growth", render: renderGrowth },
    { id: "more", label: "More coming soon", short: "More", icon: "grid", render: renderPlaceholder },
  ];

  const main = document.getElementById("main");
  const navList = document.getElementById("nav-list");

  function buildNav() {
    document.querySelectorAll("[data-brand]").forEach((b) => (b.innerHTML = brandHTML()));
    navList.innerHTML = SECTIONS.map(
      (s) => `<li><a class="nav-link" href="#/${s.id}" data-id="${s.id}">${svg(s.icon)}<span></span></a></li>`
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

  function route() {
    const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    const section = SECTIONS.find((s) => s.id === id) || SECTIONS[0];
    navList.querySelectorAll(".nav-link").forEach((a) => {
      if (a.dataset.id === section.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title = `${section.label} · Futura`;
    window.scrollTo(0, 0);
    section.render(main);
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

  /* ---------------- Placeholder ---------------- */
  function renderPlaceholder(el) {
    el.innerHTML = `<div class="placeholder">
      ${cassiopeia({ cls: "logo", variant: "motif", twinkle: true })}
      <h1>More coming soon</h1>
      <p>New sections will appear here as they're added.</p>
    </div>`;
  }

  /* ================= IPO Tracker ================= */
  const GROUPS = ["thisWeek", "nextWeek", "newFilings", "pulledDeals", "lastWeekDebuts"];
  const DEFAULT_LABELS = {
    thisWeek: "This week", nextWeek: "Next week", newFilings: "New filings",
    pulledDeals: "Pulled / postponed", lastWeekDebuts: "Last week's debuts",
  };
  const ipoState = { data: null, hideSpacs: localStorage.getItem("hideSpacs") === "1", open: new Set() };

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
    const spacCount = GROUPS.reduce((n, g) => n + ((sections[g] && sections[g].ipos) || []).filter((i) => i.isSpac).length, 0);

    const highlights = (d.highlights || [])
      .map((h) => `<li><span class="dot"></span><span>${esc(h.text)}${
        h.unconfirmed ? ` <span class="tag warn">${svg("warn")}${esc(h.note || "Unconfirmed")}</span>` : ""
      }</span></li>`).join("");

    const chips = GROUPS.filter((g) => sections[g]).map((g) =>
      `<button class="chip" data-jump="${g}">${esc(sections[g].label || DEFAULT_LABELS[g])} <span class="count">${visible(sections[g].ipos).length}</span></button>`
    ).join("");

    const groups = GROUPS.filter((g) => sections[g]).map((g) => {
      const s = sections[g];
      const items = visible(s.ipos);
      const hidden = (s.ipos || []).length - items.length;
      return `<section class="group" id="g-${g}" aria-labelledby="h-${g}">
        <div class="group-head">
          <h2 id="h-${g}">${esc(s.label || DEFAULT_LABELS[g])}</h2>
          ${s.dateRange ? `<span class="range">${esc(s.dateRange)}</span>` : ""}
          <span class="rule"></span>
          <span class="n">${items.length} ${items.length === 1 ? "deal" : "deals"}</span>
        </div>
        ${items.length ? `<div class="cards">${items.map(ipoCard).join("")}</div>`
          : `<div class="empty">${hidden ? `${hidden} SPAC${hidden > 1 ? "s" : ""} hidden` : "Nothing here this week"}</div>`}
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
        ${spacCount ? `<button class="chip toggle" id="spac-toggle" aria-pressed="${ipoState.hideSpacs}"><span class="sw" aria-hidden="true"></span>Hide SPACs</button><span class="sep"></span>` : ""}
        ${chips}
      </div>
      ${groups}
      ${footer("For information only — not investment advice. Details come from public reports and filings and may be incomplete or change; items flagged “Unconfirmed” are reported but not verified. Always check the source.")}`;

    el.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => document.getElementById(`g-${b.dataset.jump}`).scrollIntoView({ behavior: "smooth" })));
    const t = el.querySelector("#spac-toggle");
    if (t) t.addEventListener("click", () => {
      ipoState.hideSpacs = !ipoState.hideSpacs;
      localStorage.setItem("hideSpacs", ipoState.hideSpacs ? "1" : "0");
      const y = window.scrollY;
      drawIpos(el);
      window.scrollTo(0, y);
    });
    el.querySelectorAll(".more-btn").forEach((b) => b.addEventListener("click", () => {
      const c = b.closest(".card");
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      b.querySelector("span").textContent = open ? "Less" : "Details";
      c.querySelector(".detail").hidden = !open;
      c.classList.toggle("is-open", open);
      open ? ipoState.open.add(c.dataset.id) : ipoState.open.delete(c.dataset.id);
    }));
  }

  const metaItem = (label, value) =>
    `<div><dt>${label}</dt><dd class="${isNA(value) ? "na" : ""}">${esc(isNA(value) ? "n/a" : value)}</dd></div>`;

  const srcLink = (url, label = "Source") => {
    const u = safeUrl(url);
    return u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${svg("ext")}</a>`
      : `<span class="src na">${esc(label)}: n/a</span>`;
  };

  function ipoCard(i) {
    const hasDetail = !!(i.detail && (i.detail.intro || i.detail.table || (i.detail.facts || []).length || (i.detail.bullets || []).length));
    const open = hasDetail && ipoState.open.has(i.id);
    const tags = [
      isNA(i.ticker) ? `<span class="tag ticker na">No ticker yet</span>` : `<span class="tag ticker">${esc(i.ticker)}</span>`,
      i.isSpac ? `<span class="tag spac">SPAC</span>` : "",
      i.status ? `<span class="tag status">${esc(i.status)}</span>` : "",
      i.unconfirmed ? `<span class="tag warn">${svg("warn")}Unconfirmed</span>` : "",
    ].join("");
    return `<article class="panel card${i.unconfirmed ? " is-unconfirmed" : ""}${open ? " is-open" : ""}" data-id="${esc(i.id)}">
      <div class="card-top"><div class="card-title"><h3>${esc(i.company)}</h3><div class="tags">${tags}</div></div></div>
      ${isNA(i.description) ? "" : `<p class="desc">${esc(i.description)}</p>`}
      <dl class="meta">
        ${metaItem("Exchange", i.exchange)}${metaItem("Trade date", i.tradeDate)}
        ${metaItem("Price range", i.priceRange)}${metaItem("Deal size", i.dealSize)}
      </dl>
      ${i.performance && i.performance.text ? `<div class="perf ${i.performance.direction === "up" ? "up" : "down"}">${svg(i.performance.direction === "up" ? "up" : "down")}<span>${esc(i.performance.text)}</span></div>` : ""}
      ${i.unconfirmed && i.unconfirmedNote ? `<div class="unconf-note">${svg("warn")}<span>${esc(i.unconfirmedNote)}</span></div>` : ""}
      <div class="card-foot">
        ${srcLink(i.sourceUrl)}
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
  const growthState = { data: null, isExample: false, sector: "All", sort: localStorage.getItem("growthSort") || "default" };
  const SORTS = {
    default: { label: "Default order" },
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

  async function renderGrowth(el) {
    if (!growthState.data) {
      el.innerHTML = `<div class="loading">Loading growth picks…</div>`;
      try {
        let res = await fetch("data/growth-picks.json", { cache: "no-cache" });
        growthState.isExample = false;
        if (!res.ok) {
          res = await fetch("data/growth-picks.example.json", { cache: "no-cache" });
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
    const picks = Array.isArray(d.picks) ? d.picks : [];
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
    const sortSel = `<select class="select" id="growth-sort" aria-label="Sort picks">${Object.entries(SORTS)
      .map(([k, v]) => `<option value="${k}"${k === growthState.sort ? " selected" : ""}>${esc(v.label)}</option>`).join("")}</select>`;

    el.innerHTML = `
      ${hero("Growth Picks", "High-growth watchlist", `<span>${svg("clock")}Last updated ${esc(fmtDate(d.lastUpdated))}</span><span>${svg("list")}${picks.length} ${picks.length === 1 ? "pick" : "picks"}</span>`)}
      ${growthState.isExample ? `<div class="example-banner" role="note">${svg("warn")}<span><strong>EXAMPLE DATA</strong> — fictional placeholder for testing. Real picks will load automatically from data/growth-picks.json.</span></div>` : ""}
      ${isNA(d.method) ? "" : `<section class="panel method"><h2>Method</h2><p>${esc(d.method)}</p>${isNA(d.dataNotes) ? "" : `<p class="notes">${esc(d.dataNotes)}</p>`}</section>`}
      <div class="toolbar" role="toolbar" aria-label="Sort and filter by sector">
        ${sortSel}<span class="sep"></span>${chips}
      </div>
      <section class="group" aria-label="Picks">
        ${list.length ? `<div class="cards">${list.map(({ p }) => pickCard(p)).join("")}</div>` : `<div class="empty">No picks in this sector</div>`}
      </section>
      ${footer(isNA(d.disclaimer) ? "For information only — not investment advice." : `${d.disclaimer}${/not investment advice/i.test(d.disclaimer) ? "" : " Not investment advice."}`)}`;

    el.querySelectorAll("[data-sector]").forEach((b) => b.addEventListener("click", () => {
      growthState.sector = b.dataset.sector;
      drawGrowth(el);
    }));
    el.querySelector("#growth-sort").addEventListener("change", (e) => {
      growthState.sort = e.target.value;
      localStorage.setItem("growthSort", growthState.sort);
      drawGrowth(el);
    });
  }

  // Top-level sector for filtering: "Technology – Semiconductors" -> "Technology"
  const sectorGroup = (p) => (isNA(p.sector) ? "Other" : String(p.sector).split(/\s+[–—-]\s+/)[0].trim());
  function growthStat(v) {
    const txt = fmtPct(v);
    const m = /^(.*?)\s*(\(.*\))\s*$/.exec(txt);
    return `<div><dt>Revenue growth</dt><dd class="${txt === "n/a" ? "na" : ""}">${esc(m ? m[1] : txt)}${m ? `<small>${esc(m[2])}</small>` : ""}</dd></div>`;
  }
  function pickCard(p) {
    const stat = (label, val) => `<div><dt>${label}</dt><dd class="${val === "n/a" ? "na" : ""}">${esc(val)}</dd></div>`;
    const risks = Array.isArray(p.risks) ? p.risks.filter((r) => !isNA(r)) : isNA(p.risks) ? [] : [p.risks];
    const up = upside(p);
    const sources = (Array.isArray(p.sourceUrl) ? p.sourceUrl : [p.sourceUrl]).filter(safeUrl);
    return `<article class="panel card">
      <div class="pick-head">
        <div class="card-title">
          <h3>${esc(p.company)}</h3>
          <div class="tags">
            ${isNA(p.ticker) ? `<span class="tag ticker na">n/a</span>` : `<span class="tag ticker">${esc(p.ticker)}</span>`}
            ${isNA(p.sector) ? "" : `<span class="tag sector">${esc(p.sector)}</span>`}
          </div>
        </div>
        <div class="pick-price">
          <div class="p">${esc(money(p.price))}</div>
          ${isNA(p.priceDate) ? "" : `<div class="d">as of ${esc(fmtShortDate(p.priceDate))}</div>`}
        </div>
      </div>
      <dl class="stats">
        ${stat("Market cap", fmtCap(p.marketCap))}${growthStat(p.revenueGrowth)}
        ${stat("Forward P/E", fmtMult(p.forwardPE))}${stat("PEG", typeof p.peg === "number" ? p.peg.toFixed(2) : isNA(p.peg) ? "n/a" : String(p.peg))}
      </dl>
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

  buildSky();
  buildNav();
  window.addEventListener("hashchange", route);
  route();
})();
