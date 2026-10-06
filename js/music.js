/* Futura ambient music: an original, generative piece for nylon-string guitar and pad, made with the Web Audio API.
 *
 * Nothing is downloaded. Each plucked note is synthesised once with Karplus-Strong
 * (a filtered-noise excitation through a tuned, damped delay loop), cached, and replayed through a
 * guitar-body EQ and a generated convolution reverb.
 * Harmony: an original 16-bar cycle in D minor (see FORM) at 66 BPM in 3/4, fingerpicked in eighths.
 * The pattern, ornaments, the sparse melody line and the pad all vary each pass, so it never loops exactly.
 *
 * Browsers block audible autoplay, so playback starts on the first click/tap/key (if enabled).
 * The preference is stored in localStorage ("music": "on" | "off"; default on).
 * The piece pauses when the page is hidden and resumes when it becomes visible.
 */
(function () {
  "use strict";

  const BPM = 66;
  const EIGHTH = 60 / BPM / 2;          // 3/4 time: 6 eighths per bar
  const BAR = EIGHTH * 6;
  const MASTER = 0.55;                  // master gain at full fade-in (levels were checked offline; see README)
  const PREF_KEY = "music";

  // ---------- harmony (MIDI note numbers; [bass, ...upper voices]) ----------
  const V = {
    "Dm(add9)": [38, 45, 50, 53, 57, 64],
    "Bbmaj7":   [46, 53, 57, 62, 65],
    "Gm9":      [43, 50, 58, 65, 69],
    "A7sus4":   [45, 52, 55, 62, 64],
    "A7":       [45, 52, 55, 61, 64],
    "Dm/C":     [48, 53, 57, 62, 65],
    "Bbmaj7#11":[46, 53, 57, 62, 64],
    "Gm6":      [43, 50, 52, 58, 62],
    "Asus2":    [45, 52, 57, 59, 64],
    "A7b9":     [45, 52, 55, 61, 70],
    "Fmaj7":    [41, 48, 53, 57, 64],
    "C/E":      [40, 48, 55, 60, 64],
    "Dm9":      [38, 45, 53, 60, 64],
    "Gm7":      [43, 50, 53, 58, 62],
    "Em7b5":    [40, 46, 50, 55, 62],
    "Dm":       [38, 45, 50, 57, 62],
  };
  // Each bar is one chord, or two half-bar chords.
  const A1 = [["Dm(add9)"], ["Bbmaj7"], ["Gm9"], ["A7sus4", "A7"]];
  const A2 = [["Dm/C"], ["Bbmaj7#11"], ["Gm6"], ["Asus2", "A7b9"]];
  const B  = [["Fmaj7"], ["C/E"], ["Dm9"], ["Bbmaj7"], ["Gm7"], ["Em7b5"], ["A7"], ["Dm(add9)"]];
  const FORM = [...A1, ...A2, ...B];   // 16 bars ≈ 43.6 s per cycle

  // D natural minor plus C# (leading tone) for the melody
  const SCALE = [2, 4, 5, 7, 9, 10, 0, 1];

  // Fingerpicking patterns: indices into the voicing (0 = bass). Arrays inside = pinched together.
  const PATTERNS = [
    [[0, 4], 2, 3, 1, 3, 2],
    [0, 2, 3, 4, 3, 2],
    [[0, 3], 1, 2, 4, 2, 3],
    [0, 3, 2, [1, 4], 2, 3],
    [[0, 4], 2, 1, 3, 2, 4],
  ];

  // ---------- helpers ----------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Karplus-Strong plucked string with fractional-delay tuning, a soft lowpassed excitation, and a pick-position comb.
  function pluckBuffer(ctx, midi, bright, rand) {
    const sr = ctx.sampleRate, f = mtof(midi);
    const dur = midi < 50 ? 4.2 : midi < 62 ? 3.4 : 2.8;
    const len = Math.floor(sr * dur);
    const out = new Float32Array(len);
    // Loop delay = L (buffer) - s (loss filter weights delays L and L-1) + d (allpass). Solve for d in [0.1, 1.1).
    const P = sr / f, sLoss = 0.5 - 0.06 * bright;
    const L = Math.floor(P + sLoss - 0.1);
    const d = P - L + sLoss;
    const C = (1 - d) / (1 + d);                  // first-order allpass, phase delay ≈ d at low frequencies
    const t60 = midi < 50 ? 3.6 : midi < 62 ? 2.6 : 1.8;
    const g = Math.pow(10, -3 / (t60 * f));       // loop gain per period
    // excitation: noise -> one-pole lowpass (thumb/flesh, not pick) -> pick-position comb
    const exc = new Float32Array(L);
    let lp = 0; const a = 0.18 + 0.5 * bright;
    for (let i = 0; i < exc.length; i++) { lp += a * ((rand() * 2 - 1) - lp); exc[i] = lp; }
    const pp = Math.max(1, Math.round(L * 0.18));
    const buf = new Float32Array(L);
    for (let i = 0; i < buf.length; i++) buf[i] = exc[i] - 0.6 * (i >= pp ? exc[i - pp] : 0);
    let idx = 0, apX = 0, apY = 0;
    for (let n = 0; n < len; n++) {
      const cur = buf[idx];
      const nxt = buf[(idx + 1) % L];
      // loss filter (two-point average, slightly brighter for brighter plucks)
      const lossed = g * ((1 - sLoss) * cur + sLoss * nxt);
      // allpass fractional delay
      const y = C * lossed + apX - C * apY; apX = lossed; apY = y;
      out[n] = cur;
      buf[idx] = y;
      idx = (idx + 1) % L;
    }
    // DC block + normalise + short fade at the tail
    let x1 = 0, y1 = 0, peak = 1e-9;
    for (let n = 0; n < len; n++) { const y = out[n] - x1 + 0.995 * y1; x1 = out[n]; y1 = y; out[n] = y; peak = Math.max(peak, Math.abs(y)); }
    const fade = Math.floor(sr * 0.08);
    for (let n = 0; n < len; n++) { out[n] /= peak; if (n > len - fade) out[n] *= (len - n) / fade; }
    const ab = ctx.createBuffer(1, len, sr); ab.copyToChannel ? ab.copyToChannel(out, 0) : ab.getChannelData(0).set(out);
    return ab;
  }

  // Stereo impulse response: exponentially decaying noise that darkens over time (a warm, small-hall feel).
  function impulse(ctx, seconds, rand) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        const coef = 0.55 * Math.exp(-t * 1.6) + 0.04;      // lowpass closes as the tail decays
        lp += coef * ((rand() * 2 - 1) - lp);
        const pre = Math.min(1, t / 0.012);                   // 12 ms pre-delay ramp
        d[n] = lp * Math.exp(-t * (6.9 / seconds) * 1.0) * pre;
      }
    }
    return ir;
  }

  // ---------- engine (works with AudioContext or OfflineAudioContext) ----------
  function Engine(ctx, seed) {
    const rand = rng(seed);
    const cache = new Map();
    const getPluck = (m, bright) => {
      const k = m + ":" + bright; if (!cache.has(k)) cache.set(k, pluckBuffer(ctx, m, bright, rand)); return cache.get(k);
    };

    // bus: guitar -> body EQ -> dry + reverb -> master -> limiter -> out
    const master = ctx.createGain(); master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 8; limiter.ratio.value = 6; limiter.attack.value = 0.005; limiter.release.value = 0.25;
    master.connect(limiter); limiter.connect(ctx.destination);

    const guitar = ctx.createGain(); guitar.gain.value = 0.9;
    const body1 = ctx.createBiquadFilter(); body1.type = "peaking"; body1.frequency.value = 105; body1.Q.value = 1.1; body1.gain.value = 4;
    const body2 = ctx.createBiquadFilter(); body2.type = "peaking"; body2.frequency.value = 230; body2.Q.value = 1.4; body2.gain.value = 2.5;
    const nasal = ctx.createBiquadFilter(); nasal.type = "peaking"; nasal.frequency.value = 1100; nasal.Q.value = 1; nasal.gain.value = -2.5;
    const warm = ctx.createBiquadFilter(); warm.type = "highshelf"; warm.frequency.value = 4200; warm.gain.value = -7;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 60; hp.Q.value = 0.7;
    guitar.connect(hp); hp.connect(body1); body1.connect(body2); body2.connect(nasal); nasal.connect(warm);

    const pad = ctx.createGain(); pad.gain.value = 1;
    const padLp = ctx.createBiquadFilter(); padLp.type = "lowpass"; padLp.frequency.value = 850; padLp.Q.value = 0.4;
    pad.connect(padLp);

    const dry = ctx.createGain(); dry.gain.value = 0.78;
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 3.4, rand);
    const wet = ctx.createGain(); wet.gain.value = 0.42;
    warm.connect(dry); warm.connect(verb); padLp.connect(verb); padLp.connect(dry);
    verb.connect(wet); dry.connect(master); wet.connect(master);

    const voices = new Set();
    function note(midi, t, vel, pan, ring, bright) {
      const src = ctx.createBufferSource(); src.buffer = getPluck(midi, bright);
      src.detune.value = (rand() - 0.5) * 6;                 // a few cents of human tuning drift
      const g = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const end = t + Math.min(src.buffer.duration, ring);
      g.gain.setValueAtTime(vel, t);
      g.gain.setValueAtTime(vel, Math.max(t, end - 0.35));
      g.gain.exponentialRampToValueAtTime(0.0008, end);       // let-ring then damp
      src.connect(g);
      if (p) { p.pan.value = pan; g.connect(p); p.connect(guitar); } else g.connect(guitar);
      src.start(t); src.stop(end + 0.02);
      voices.add(src); src.onended = () => { voices.delete(src); src.disconnect(); g.disconnect(); if (p) p.disconnect(); };
    }
    function padChord(midis, t, dur, level) {
      midis.forEach((m, i) => {
        [-4, 4].forEach((cents) => {
          const o = ctx.createOscillator(); o.type = i === 0 ? "sine" : "triangle";
          o.frequency.value = mtof(m); o.detune.value = cents;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(level, t + 1.6);
          g.gain.setValueAtTime(level, t + dur - 0.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.8);
          o.connect(g); g.connect(pad); o.start(t); o.stop(t + dur + 1.9);
          o.onended = () => { o.disconnect(); g.disconnect(); };
        });
      });
    }

    // ---- composition state ----
    let bar = 0, cycle = 0, pattern = 0, mel = 69, melRhythm = null, padOn = false;
    const voicePan = (i, n) => (i === 0 ? -0.08 : -0.25 + 0.5 * (i / Math.max(1, n - 1))) * 0.8;

    function chooseMelRhythm() {
      // positions (in eighths) for a 4-bar phrase; sparse, with long notes
      const options = [
        [[0, 3], [3, 3], [], [0, 6]],
        [[0, 2], [2, 1], [3, 3], [0, 6]],
        [[], [0, 3], [3, 3], [0, 6]],
        [[0, 4], [4, 2], [0, 3], [3, 3]],
      ];
      return options[Math.floor(rand() * options.length)];
    }
    function nextMel(chord) {
      // move by step toward a chord tone in the 64–76 range; leading-tone C# only over A chords
      const tones = chord.slice(1).map((m) => ((m % 12) + 12) % 12);
      const cands = [];
      for (let m = 62; m <= 77; m++) {
        const pc = m % 12;
        if (!SCALE.includes(pc)) continue;
        if (pc === 1 && !chord.some((x) => x % 12 === 1)) continue;
        const dist = Math.abs(m - mel);
        if (dist > 5) continue;
        const w = (tones.includes(pc) ? 3 : 0.8) * (dist === 0 ? 0.4 : dist <= 2 ? 1.6 : 1);
        cands.push([m, w]);
      }
      let sum = cands.reduce((s, c) => s + c[1], 0), r = rand() * sum;
      for (const [m, w] of cands) { if ((r -= w) <= 0) { mel = m; break; } }
      return mel;
    }

    function scheduleBar(t0) {
      const pos = bar % FORM.length;
      if (pos === 0) { cycle++; }
      const chords = FORM[pos];
      if (pos % 4 === 0) {                                 // new phrase: maybe change pattern, melody, pad
        if (rand() < 0.55) pattern = Math.floor(rand() * PATTERNS.length);
        melRhythm = (cycle > 1 || pos >= 8) && rand() < 0.7 ? chooseMelRhythm() : null;
        padOn = pos >= 8 ? rand() < 0.8 : rand() < 0.35;
      }
      const melBar = melRhythm ? melRhythm[pos % 4] : [];
      const sw = 0.012;                                      // gentle swing on off-beats
      for (let e = 0; e < 6; e++) {
        const chord = V[chords.length === 2 && e >= 3 ? chords[1] : chords[0]];
        const step = PATTERNS[pattern][e];
        const t = t0 + e * EIGHTH + (e % 2 ? sw : 0) + (rand() - 0.5) * 0.014;
        const idxs = Array.isArray(step) ? step : [step];
        idxs.forEach((ix, k) => {
          const vi = Math.min(ix, chord.length - 1);
          const m = chord[vi];
          const isBass = vi === 0;
          const accent = e === 0 ? 1 : e === 3 ? 0.86 : 0.7;
          const vel = (isBass ? 0.62 : 0.4) * accent * (0.85 + rand() * 0.25);
          note(m, t + k * 0.018, vel, voicePan(vi, chord.length), isBass ? BAR * 1.6 : BAR * 1.1, isBass ? 0 : 0.5);
        });
        // occasional grace-note hammer-on on the off-beats, from a scale step below
        if (e % 2 === 1 && rand() < 0.07) {
          const m = chord[Math.min(3, chord.length - 1)];
          note(m - (SCALE.includes((m - 1) % 12) ? 1 : 2), t - 0.07, 0.18, 0.15, 0.12, 0.5);
        }
      }
      // melody (top voice, a little louder and brighter); melBar is [start, length, start, length]
      for (let n = 0; n + 1 < melBar.length; n += 2) {
        const e = melBar[n], len = melBar[n + 1];
        const chord = V[chords.length === 2 && e >= 3 ? chords[1] : chords[0]];
        const m = nextMel(chord);
        note(m, t0 + e * EIGHTH + 0.006, 0.5 * (0.9 + rand() * 0.2), 0.12, EIGHTH * len + 1.2, 1);
      }
      if (padOn) {
        chords.forEach((c, k) => {
          const v = V[c];
          padChord([v[0] + 12, v[2], v[3]].map((m) => (m < 48 ? m + 12 : m)), t0 + k * BAR / chords.length, BAR / chords.length, 0.012);
        });
      }
      // a soft, rolled cadence chord at the end of the cycle
      if (pos === FORM.length - 1) {
        const v = V["Dm(add9)"];
        v.forEach((m, i) => note(m, t0 + BAR - EIGHTH * 0.9 + i * 0.045, 0.22, voicePan(i, v.length), BAR * 2.2, 0.3));
      }
      bar++;
    }

    let nextBar = 0, timer = null;
    return {
      ctx, master,
      scheduleUntil(t) { if (!nextBar) nextBar = ctx.currentTime + 0.15; while (nextBar < t) { scheduleBar(nextBar); nextBar += BAR; } },
      start() {
        const tick = () => this.scheduleUntil(ctx.currentTime + 1.2);
        tick(); timer = setInterval(tick, 200);
      },
      fade(to, sec) {
        const now = ctx.currentTime, gp = master.gain;
        gp.cancelScheduledValues(now); gp.setValueAtTime(Math.max(gp.value, 0.0001), now);
        gp.exponentialRampToValueAtTime(Math.max(to, 0.0001), now + sec);
      },
      stopTimer() { clearInterval(timer); timer = null; },
    };
  }

  // ---------- controller ----------
  let ctx = null, engine = null, started = false;
  const enabled = () => localStorage.getItem(PREF_KEY) !== "off";

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) { /* Safari only */ }
    ctx = new AC({ latencyHint: "playback" });
    engine = Engine(ctx, (Date.now() & 0xffffffff) >>> 0);
    ctx.onstatechange = sync;
  }
  function play() {
    ensureContext(); if (!ctx) return;
    const go = () => {
      if (!started) { engine.start(); started = true; }
      engine.fade(MASTER, 3.5);
      sync();
    };
    if (ctx.state !== "running") ctx.resume().then(go, () => {}); else go();
  }
  function pause(sec = 0.6, suspend = true) {
    if (!ctx || !started) return;
    engine.fade(0.0001, sec);
    if (suspend) setTimeout(() => { if (ctx.state === "running" && (document.hidden || !enabled())) ctx.suspend(); }, sec * 1000 + 60);
    sync();
  }
  const playing = () => !!(ctx && started && ctx.state === "running" && enabled() && !document.hidden);

  function sync() {
    document.querySelectorAll("[data-music-toggle]").forEach((b) => {
      const on = enabled();
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? "Background music on. Turn off" : "Background music off. Turn on");
      b.title = on ? (started ? "Music on" : "Music on (starts on your first tap)") : "Music off";
      b.classList.toggle("is-on", on);
      b.classList.toggle("is-playing", playing());
    });
  }

  const ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mt-stem" d="M9 17.2V6.4l10-2.2v10.6"/><ellipse class="mt-head" cx="6.6" cy="17.4" rx="2.6" ry="2"/><ellipse class="mt-head" cx="16.6" cy="15" rx="2.6" ry="2"/><path class="mt-slash" d="M4 4l16 16"/></svg>`;
  function button(extraClass = "") {
    const on = enabled();
    return `<button type="button" class="music-toggle ${extraClass}${on ? " is-on" : ""}${playing() ? " is-playing" : ""}" data-music-toggle aria-pressed="${on}" aria-label="${on ? "Background music on. Turn off" : "Background music off. Turn on"}">${ICON}</button>`;
  }

  // First user gesture starts the music (gestures on the toggle itself are handled by the toggle).
  function onGesture(e) {
    if (e.target && e.target.closest && e.target.closest("[data-music-toggle]")) return;
    if (enabled() && (!started || (ctx && ctx.state !== "running")) && !document.hidden) play();
  }
  ["click", "touchend", "keydown"].forEach((t) => document.addEventListener(t, onGesture, { capture: true, passive: true }));

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-music-toggle]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (enabled()) { localStorage.setItem(PREF_KEY, "off"); pause(0.8); }
    else { localStorage.setItem(PREF_KEY, "on"); play(); }
    sync();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause(0.25);
    else if (enabled() && started) play();
  });
  window.addEventListener("pagehide", () => pause(0.1));

  // Offline render for analysis/testing: returns an AudioBuffer of `seconds` of the piece with a fixed seed.
  async function render(seconds = 60, seed = 7) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OAC(2, Math.ceil(44100 * seconds), 44100);
    const eng = Engine(oc, seed);
    eng.master.gain.setValueAtTime(0.0001, 0); eng.master.gain.exponentialRampToValueAtTime(MASTER, 3.5);
    eng.scheduleUntil(seconds);
    return oc.startRendering();
  }

  window.FuturaMusic = { button, sync, play, pause, render, enabled, playing, get state() { return ctx ? ctx.state : "none"; }, get started() { return started; } };
})();
