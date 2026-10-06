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
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-28 12 12)"/><circle cx="19.6" cy="7.4" r="1.1"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.2c2.4-.3 4.1 1.3 4.5 4.3"/>',
    news: '<rect x="3.5" y="5" width="13" height="14" rx="1.5"/><path d="M16.5 9h3a1 1 0 0 1 1 1v7.5a1.5 1.5 0 0 1-3 0V9"/><path d="M6.5 9h7M6.5 12.5h7M6.5 16h4"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    cas: '<polyline points="3.5,8 7.5,14 12,10 16.5,16 20.5,8" fill="none"/><circle cx="3.5" cy="8" r="1.35"/><circle cx="7.5" cy="14" r="1.5"/><circle cx="12" cy="10" r="1.7"/><circle cx="16.5" cy="16" r="1.55"/><circle cx="20.5" cy="8" r="1.45"/>',
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
    { id: "ipos", label: "IPO Tracker", short: "IPOs", icon: "rocket", render: renderIpoTracker },
    { id: "growth", label: "Growth Picks", short: "Growth", icon: "growth", render: renderGrowth },
    { id: "spacex", label: "SpaceX", short: "SpaceX", icon: "orbit", render: (el) => renderCompany(el, "spacex") },
    { id: "tesla", label: "Tesla", short: "Tesla", icon: "bolt", render: (el) => renderCompany(el, "tesla") },
    { id: "cassiopeia", label: "Cassiopeia", short: "Cas", icon: "cas", render: renderCassiopeia },
    { id: "more", label: "More coming soon", short: "More", icon: "grid", render: renderPlaceholder },
  ];

  const main = document.getElementById("main");
  const navList = document.getElementById("nav-list");

  function buildNav() {
    document.querySelectorAll("[data-brand]").forEach((b) => {
      b.innerHTML = brandHTML(b.classList.contains("brand-side"));
    });
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
    if (casState.anim) { casState.anim.destroy(); casState.anim = null; }
    main.dataset.token = section.id;
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
  const GROUPS = ["thisWeek", "nextWeek", "newFilings", "pulledDeals", "pastTwoWeeks", "lastWeekDebuts"];
  const PAST = "pastTwoWeeks";
  const DEFAULT_LABELS = {
    thisWeek: "This week", nextWeek: "Next week", newFilings: "New filings",
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
    const chips = PARTS.map((p) => `<button class="chip" data-jump="${p.id}">${esc(p.label)}</button>`).join("");

    /* ---- Status / snapshot ---- */
    const ipo = d.ipo;
    const statusPanel = `<section class="panel summary co-status" aria-label="Snapshot">
      <div class="co-quote">
        <div>
          <div class="tags"><span class="tag ticker">${esc(d.ticker)}</span><span class="tag sector">${esc(d.exchange)}</span>${d.status === "public" ? `<span class="tag live-tag"><span class="live-dot"></span>Public</span>` : `<span class="tag spac">Private</span>`}</div>
        </div>
        <div class="pick-price">
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

    el.innerHTML = `
      ${hero(d.company === "SpaceX" ? "SpaceX · Space Exploration Technologies" : "Tesla, Inc.", d.company, `<span>${svg("clock")}Data updated ${esc(fmtDate(d.lastUpdated))}</span><span>${svg("pulse")}Live quote via TradingView</span>`)}
      ${statusPanel}
      <div class="toolbar" role="toolbar" aria-label="Jump to section">${chips}</div>
      ${live}${fundamentals}${investors}${news}${sentimentSection(d.ticker, sent)}
      ${footer("For information only — not investment advice. Fundamentals, holdings and news are point-in-time snapshots from the linked sources and may be stale or incomplete; figures marked est. are approximations. Social sentiment is a noisy sample, not a signal.")}`;

    el.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => document.getElementById(`g-${b.dataset.jump}`).scrollIntoView({ behavior: "smooth" })));
    mountTradingView(el, d.tvSymbol);
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
    const q = encodeURIComponent(ticker === "SPCX" ? "SpaceX" : "Tesla");
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
    const pts = CAS.map((s) => ({
      ...s,
      px: ox + s.x * scale,
      py: oy + s.y * scale,
      // Lower magnitude number = brighter. Map m≈2.15→1, m≈3.4→0.55.
      bright: Math.max(0.55, Math.min(1, (3.55 - s.m) / 1.45)),
    }));

    let seed = 20261006;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const bgCount = Math.round((W * H) / 2800);
    let bg = "";
    for (let i = 0; i < bgCount; i++) {
      const x = rnd() * W, y = rnd() * H, r = 0.35 + rnd() * 0.85, o = 0.08 + rnd() * 0.32;
      const tw = rnd() > 0.82;
      bg += `<circle class="cas-bg${tw && !reduce ? " tw" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"${
        tw && !reduce ? ` style="--o:${o.toFixed(2)};--d:${(5 + rnd() * 7).toFixed(1)}s;--delay:${(rnd() * 8).toFixed(1)}s"` : ""
      }/>`;
    }
    const line = pts.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
    const stars = pts.map((p, i) => {
      const r = 3.2 + p.bright * 5.2;
      return `<g class="cas-main" data-i="${i}" style="--bright:${p.bright.toFixed(3)}">
        <circle class="cas-halo" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${(r * 5.2).toFixed(1)}"/>
        <circle class="cas-core" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${r.toFixed(2)}"/>
        <circle class="cas-spark" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="${(r * 0.38).toFixed(2)}"/>
        <text class="cas-name" x="${p.px.toFixed(1)}" y="${(p.py + (p.py > H * 0.55 ? 28 : -22)).toFixed(1)}" text-anchor="middle">${esc(p.n)}</text>
      </g>`;
    }).join("");

    stage.innerHTML = `<svg class="cas-sky${reduce ? " is-reduced" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Cassiopeia as a glowing W of five stars">
      <defs>
        <radialGradient id="casHeroGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stop-color="#d4af37" stop-opacity=".14"/>
          <stop offset=".55" stop-color="#d4af37" stop-opacity=".03"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="casHeroLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f7e7a9"/><stop offset=".45" stop-color="#d4af37"/><stop offset="1" stop-color="#a8842a"/>
        </linearGradient>
        <filter id="casSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#casHeroGlow)"/>
      <g class="cas-field">${bg}</g>
      <polyline class="cas-line" points="${line}" fill="none" stroke="url(#casHeroLine)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".72"/>
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


  buildSky();
  buildNav();
  window.addEventListener("hashchange", route);
  route();

  /* PWA: offline shell + network-first data (see sw.js). Relative URL keeps scope at the /futura/ subpath. */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e)));
  }
})();
