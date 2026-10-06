/* Futura ambient music: an original, generative piece for nylon-string guitar, celesta and an airy pad, made with the Web Audio API.
 *
 * Nothing is downloaded. Guitar notes are synthesised with Karplus-Strong (a soft, lowpassed excitation through a
 * tuned, damped delay loop), cached, and replayed through a guitar-body EQ. Celesta notes are additive sine partials.
 * Everything goes into a long (5.6 s) generated convolution reverb with a subtle octave-up "shimmer" send.
 *
 * Harmony: an original 16-bar cycle in D minor (see FORM) at 58 BPM in 3/4. The B section turns to major colour
 * (Fmaj7, B♭maj7♯11, Cadd9). On every pass the picking pattern, rests, the sparse melody, the celesta and the pad
 * are re-chosen, so it never loops exactly.
 *
 * Browsers block audible autoplay, so playback starts on the first click, tap or key press (if enabled).
 * The preference is stored in localStorage ("music": "on" | "off"; default on).
 * Playback pauses while the page is hidden.
 */
(function () {
  "use strict";

  const BPM = 58;
  const EIGHTH = 60 / BPM / 2;          // 3/4 time: 6 eighths per bar
  const BAR = EIGHTH * 6;
  const MASTER = 0.17;                  // master gain at full fade-in (levels checked offline; see README)
  const PREF_KEY = "music";

  // ---------- harmony (MIDI note numbers; [bass, ...upper voices]) ----------
  const V = {
    "Dm(add9)":  [38, 45, 50, 53, 57, 64],
    "Bbmaj7#11": [46, 53, 57, 62, 64],
    "Gm9":       [43, 50, 58, 65, 69],
    "Asus4":     [45, 52, 57, 62, 64],
    "A7":        [45, 52, 55, 61, 64],
    "Dm/C":      [48, 53, 57, 62, 65],
    "Bbmaj7":    [46, 53, 57, 62, 65],
    "Gm6":       [43, 50, 52, 58, 62],
    "Asus2":     [45, 52, 57, 59, 64],
    "A7b9":      [45, 52, 55, 61, 70],
    "Fmaj7":     [41, 48, 53, 57, 64],
    "Fmaj7/A":   [45, 53, 57, 60, 64],
    "Cadd9/E":   [40, 48, 55, 62, 64],
    "Dm9":       [38, 45, 53, 60, 64],
  };
  // One chord per bar, or two half-bar chords.
  const A1 = [["Dm(add9)"], ["Bbmaj7#11"], ["Gm9"], ["Asus4", "A7"]];
  const A2 = [["Dm/C"], ["Bbmaj7"], ["Gm6"], ["Asus2", "A7b9"]];
  const B  = [["Fmaj7"], ["Bbmaj7#11"], ["Fmaj7/A"], ["Cadd9/E"], ["Dm9"], ["Bbmaj7"], ["Gm9"], ["Asus4", "A7"]];
  const FORM = [...A1, ...A2, ...B];   // 16 bars ≈ 49.7 s per cycle
  const MAJOR_BARS = new Set([8, 9, 10, 11]);   // the "wonder" bars

  // D natural minor plus C# (leading tone, only over A chords)
  const SCALE = [2, 4, 5, 7, 9, 10, 0, 1];

  // Fingerpicking patterns over six eighths: indices into the voicing (0 = bass), null = rest,
  // and a nested array = notes plucked together (used sparingly).
  const PATTERNS = [
    [0, 2, 3, null, 4, 2],
    [0, null, 2, 3, 2, null],
    [0, 3, null, 2, 4, null],
    [[0, 4], null, 2, null, 3, null],
    [0, 2, null, 4, null, 3],
    [0, null, null, 3, null, 2],
  ];

  // ---------- helpers ----------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Karplus-Strong plucked string: soft lowpassed excitation, pick-position comb, fractional-delay tuning.
  function pluckBuffer(ctx, midi, bright, rand) {
    const sr = ctx.sampleRate, f = mtof(midi);
    const dur = midi < 50 ? 4.6 : midi < 62 ? 3.8 : 3.2;
    const len = Math.floor(sr * dur);
    const out = new Float32Array(len);
    // Loop delay = L (buffer) - s (loss filter weights delays L and L-1) + d (allpass). Solve for d in [0.1, 1.1).
    const P = sr / f, sLoss = 0.5 - 0.04 * bright;
    const L = Math.floor(P + sLoss - 0.1);
    const d = P - L + sLoss;
    const C = (1 - d) / (1 + d);                  // first-order allpass, phase delay ≈ d at low frequencies
    const t60 = midi < 50 ? 4.0 : midi < 62 ? 3.0 : 2.2;
    const g = Math.pow(10, -3 / (t60 * f));       // loop gain per period
    // excitation: noise -> two one-pole lowpasses (soft flesh of the thumb, no nail) -> pick-position comb
    const exc = new Float32Array(L);
    let lp = 0, lp2 = 0; const a = 0.1 + 0.28 * bright;
    for (let i = 0; i < L; i++) { lp += a * ((rand() * 2 - 1) - lp); lp2 += a * (lp - lp2); exc[i] = lp2; }
    const pp = Math.max(1, Math.round(L * 0.2));
    const buf = new Float32Array(L);
    for (let i = 0; i < L; i++) buf[i] = exc[i] - 0.5 * (i >= pp ? exc[i - pp] : 0);
    let idx = 0, apX = 0, apY = 0;
    for (let n = 0; n < len; n++) {
      const cur = buf[idx];
      const nxt = buf[(idx + 1) % L];
      const lossed = g * ((1 - sLoss) * cur + sLoss * nxt);
      const y = C * lossed + apX - C * apY; apX = lossed; apY = y;
      out[n] = cur;
      buf[idx] = y;
      idx = (idx + 1) % L;
    }
    // DC block, normalise, short fade at the tail
    let x1 = 0, y1 = 0, peak = 1e-9;
    for (let n = 0; n < len; n++) { const y = out[n] - x1 + 0.995 * y1; x1 = out[n]; y1 = y; out[n] = y; peak = Math.max(peak, Math.abs(y)); }
    const fade = Math.floor(sr * 0.1);
    for (let n = 0; n < len; n++) { out[n] /= peak; if (n > len - fade) out[n] *= (len - n) / fade; }
    const ab = ctx.createBuffer(1, len, sr); ab.getChannelData(0).set(out);
    return ab;
  }

  // Stereo impulse response: exponentially decaying noise that slowly darkens but keeps some sparkle in the tail.
  function impulse(ctx, seconds, rand) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        const coef = 0.42 * Math.exp(-t * 0.9) + 0.06;
        lp += coef * ((rand() * 2 - 1) - lp);
        const pre = Math.min(1, t / 0.025);                   // 25 ms pre-delay ramp: lets the pluck speak first
        const env = Math.exp(-t * (6.9 / seconds)) * (1 - Math.exp(-t * 18));  // soft bloom, then a long decay
        d[n] = lp * env * pre;
      }
      // fade the last 300 ms to zero
      const f = Math.floor(sr * 0.3); for (let n = len - f; n < len; n++) d[n] *= (len - n) / f;
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

    // master -> limiter -> out
    const master = ctx.createGain(); master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.knee.value = 10; limiter.ratio.value = 6; limiter.attack.value = 0.004; limiter.release.value = 0.3;
    master.connect(limiter); limiter.connect(ctx.destination);

    // reverb (long, lush) with its own darkening EQ
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 5.6, rand);
    const verbHp = ctx.createBiquadFilter(); verbHp.type = "highpass"; verbHp.frequency.value = 140;
    const verbLp = ctx.createBiquadFilter(); verbLp.type = "lowpass"; verbLp.frequency.value = 7000;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    const send = ctx.createGain(); send.gain.value = 1;       // everything that goes to the reverb
    send.connect(verbHp); verbHp.connect(verb); verb.connect(verbLp); verbLp.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.62; dry.connect(master);

    // guitar: body EQ, warm top
    const guitar = ctx.createGain(); guitar.gain.value = 0.9;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 60; hp.Q.value = 0.7;
    const body1 = ctx.createBiquadFilter(); body1.type = "peaking"; body1.frequency.value = 105; body1.Q.value = 1.1; body1.gain.value = 3.5;
    const body2 = ctx.createBiquadFilter(); body2.type = "peaking"; body2.frequency.value = 230; body2.Q.value = 1.4; body2.gain.value = 2;
    const nasal = ctx.createBiquadFilter(); nasal.type = "peaking"; nasal.frequency.value = 1100; nasal.Q.value = 1; nasal.gain.value = -3;
    const warm = ctx.createBiquadFilter(); warm.type = "highshelf"; warm.frequency.value = 3200; warm.gain.value = -9;
    guitar.connect(hp); hp.connect(body1); body1.connect(body2); body2.connect(nasal); nasal.connect(warm);
    warm.connect(dry); warm.connect(send);

    // celesta: a little dry, mostly reverb
    const bells = ctx.createGain(); bells.gain.value = 1;
    const bellLp = ctx.createBiquadFilter(); bellLp.type = "lowpass"; bellLp.frequency.value = 6500;
    bells.connect(bellLp);
    const bellDry = ctx.createGain(); bellDry.gain.value = 0.45; bellLp.connect(bellDry); bellDry.connect(dry); bellLp.connect(send);

    // airy pad: slow tremolo, soft lowpass with slowly drifting cutoff
    const pad = ctx.createGain(); pad.gain.value = 1;
    const padLp = ctx.createBiquadFilter(); padLp.type = "lowpass"; padLp.frequency.value = 1400; padLp.Q.value = 0.3;
    const trem = ctx.createGain(); trem.gain.value = 0.82;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.18; lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.037;
    const lfo2Amt = ctx.createGain(); lfo2Amt.gain.value = 500; lfo2.connect(lfo2Amt); lfo2Amt.connect(padLp.frequency);
    lfo.start(); lfo2.start();
    pad.connect(padLp); padLp.connect(trem);
    const padDry = ctx.createGain(); padDry.gain.value = 0.5; trem.connect(padDry); padDry.connect(dry); trem.connect(send);

    // shimmer: octave-up ghosts of selected notes, sent only to the reverb
    const shimmer = ctx.createGain(); shimmer.gain.value = 1;
    const shimLp = ctx.createBiquadFilter(); shimLp.type = "lowpass"; shimLp.frequency.value = 5000;
    shimmer.connect(shimLp); shimLp.connect(send);

    const cleanup = (...nodes) => () => nodes.forEach((n) => n && n.disconnect());
    function note(midi, t, vel, pan, ring, bright, opts = {}) {
      const buf = getPluck(midi, bright);
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.detune.value = (rand() - 0.5) * 6;                 // a few cents of human tuning drift
      const g = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const att = opts.attack || 0.012;                       // soften the transient
      const end = t + Math.min(buf.duration, ring);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + att);
      g.gain.setValueAtTime(vel, Math.max(t + att, end - 0.45));
      g.gain.exponentialRampToValueAtTime(0.0006, end);
      src.connect(g);
      if (p) { p.pan.value = pan; g.connect(p); p.connect(guitar); } else g.connect(guitar);
      src.start(t); src.stop(end + 0.02);
      let ghost = null, gg = null;
      if (opts.shimmer) {                                     // same string, an octave up, reverb only
        ghost = ctx.createBufferSource(); ghost.buffer = buf; ghost.playbackRate.value = 2;
        gg = ctx.createGain();
        gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(vel * opts.shimmer, t + 0.25);
        gg.gain.exponentialRampToValueAtTime(0.0004, t + buf.duration / 2);
        ghost.connect(gg); gg.connect(shimmer); ghost.start(t); ghost.stop(t + buf.duration / 2 + 0.02);
        ghost.onended = cleanup(ghost, gg);
      }
      src.onended = cleanup(src, g, p);
    }
    // Celesta / music-box: fundamental + a quiet 4th harmonic + a faint inharmonic partial, each with its own decay.
    function bell(midi, t, vel, pan) {
      const f = mtof(midi);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const out = ctx.createGain(); out.gain.value = vel;
      if (p) { p.pan.value = pan; out.connect(p); p.connect(bells); } else out.connect(bells);
      [[1, 1, 2.6], [4, 0.12, 0.7], [2.76, 0.018, 0.22], [2, 0.05, 1.4]].forEach(([ratio, amp, decay]) => {
        if (f * ratio > 12000) return;
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0002, t + decay);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + decay + 0.05);
        o.onended = ratio === 1 ? cleanup(o, g, out, p) : cleanup(o, g);   // the fundamental rings longest
      });
      // shimmer ghost an octave above, reverb only
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vel * 0.18, t + 0.3); g2.gain.exponentialRampToValueAtTime(0.0002, t + 2.4);
      o2.connect(g2); g2.connect(shimmer); o2.start(t); o2.stop(t + 2.5);
      o2.onended = cleanup(o2, g2);
    }
    // Airy pad: slow swells; sines in the low voices, soft triangles above, each pair slightly detuned.
    function padChord(midis, t, dur, level) {
      midis.forEach((m, i) => {
        [-5, 5].forEach((cents) => {
          const o = ctx.createOscillator(); o.type = i < 2 ? "sine" : "triangle";
          o.frequency.value = mtof(m); o.detune.value = cents + (rand() - 0.5) * 3;
          const g = ctx.createGain();
          const lvl = level * (i < 2 ? 1 : 0.6);
          g.gain.setValueAtTime(0.00005, t);
          g.gain.exponentialRampToValueAtTime(lvl, t + Math.min(3.2, dur * 0.6));
          g.gain.setValueAtTime(lvl, t + dur);
          g.gain.exponentialRampToValueAtTime(0.00005, t + dur + 3.5);
          o.connect(g); g.connect(pad); o.start(t); o.stop(t + dur + 3.6);
          o.onended = cleanup(o, g);
        });
      });
    }

    // ---- composition state ----
    let bar = 0, cycle = 0, pattern = 0, mel = 69, melRhythm = null, padOn = false, lastBell = 81;
    const voicePan = (i, n) => (i === 0 ? -0.06 : -0.3 + 0.6 * (i / Math.max(1, n - 1))) * 0.8;

    function chooseMelRhythm() {
      // [start, length, ...] in eighths for each bar of a 4-bar phrase; sparse and long
      const options = [
        [[0, 6], [], [0, 3, 3, 3], [0, 6]],
        [[], [0, 6], [], [3, 3]],
        [[0, 4], [], [0, 6], []],
        [[3, 3], [0, 6], [], [0, 6]],
      ];
      return options[Math.floor(rand() * options.length)];
    }
    function nextMel(chord) {
      const tones = chord.slice(1).map((m) => m % 12);
      const cands = [];
      for (let m = 62; m <= 76; m++) {
        const pc = m % 12;
        if (!SCALE.includes(pc)) continue;
        if (pc === 1 && !chord.some((x) => x % 12 === 1)) continue;
        const dist = Math.abs(m - mel);
        if (dist > 4) continue;
        const w = (tones.includes(pc) ? 3 : 0.7) * (dist === 0 ? 0.4 : dist <= 2 ? 1.7 : 1);
        cands.push([m, w]);
      }
      let r = rand() * cands.reduce((s, c) => s + c[1], 0);
      for (const [m, w] of cands) { if ((r -= w) <= 0) { mel = m; break; } }
      return mel;
    }
    function bellNote(chord) {
      // chord tones lifted into the D5–E6 range, moving gently from the previous bell note
      const pcs = chord.slice(1).map((m) => m % 12);
      const cands = [];
      for (let m = 74; m <= 88; m++) if (pcs.includes(m % 12) && Math.abs(m - lastBell) <= 7) cands.push(m);
      lastBell = cands.length ? cands[Math.floor(rand() * cands.length)] : 81;
      return lastBell;
    }

    function scheduleBar(t0) {
      const pos = bar % FORM.length;
      if (pos === 0) cycle++;
      const chords = FORM[pos];
      if (pos % 4 === 0) {                                 // new phrase: maybe change pattern, melody, pad
        if (rand() < 0.6) pattern = Math.floor(rand() * PATTERNS.length);
        melRhythm = (cycle > 1 || pos >= 8) && rand() < 0.6 ? chooseMelRhythm() : null;
        padOn = pos >= 8 ? rand() < 0.85 : rand() < 0.5;
      }
      const wonder = MAJOR_BARS.has(pos);
      const melBar = melRhythm ? melRhythm[pos % 4] : [];
      const chordAt = (e) => V[chords.length === 2 && e >= 3 ? chords[1] : chords[0]];
      const sw = 0.016;                                      // gentle swing on the off-beats
      for (let e = 0; e < 6; e++) {
        const chord = chordAt(e);
        let step = PATTERNS[pattern][e];
        if (step === null) continue;
        if (e > 0 && rand() < 0.12) continue;              // breathe: drop the odd note
        const t = t0 + e * EIGHTH + (e % 2 ? sw : 0) + (rand() - 0.5) * 0.016;
        const idxs = Array.isArray(step) ? step : [step];
        idxs.forEach((ix, k) => {
          const vi = Math.min(ix, chord.length - 1);
          const m = chord[vi];
          const isBass = vi === 0;
          const accent = e === 0 ? 1 : e === 3 ? 0.9 : 0.78;
          const vel = (isBass ? 0.5 : 0.3) * accent * (0.85 + rand() * 0.22);
          note(m, t + k * 0.03, vel, voicePan(vi, chord.length), isBass ? BAR * 1.5 : BAR * 1.05, isBass ? 0 : 0.25,
            { attack: isBass ? 0.01 : 0.014, shimmer: !isBass && vi >= 3 && rand() < 0.25 ? 0.35 : 0 });
        });
        if (e % 2 === 1 && rand() < 0.04) {               // rare grace-note hammer-on from below
          const m = chord[Math.min(3, chord.length - 1)];
          note(m - (SCALE.includes((m - 1) % 12) ? 1 : 2), t - 0.08, 0.12, 0.15, 0.14, 0.25);
        }
      }
      // melody: top voice, slightly louder, soft attack, with shimmer
      for (let n = 0; n + 1 < melBar.length; n += 2) {
        const e = melBar[n], len = melBar[n + 1];
        const m = nextMel(chordAt(e));
        note(m, t0 + e * EIGHTH + 0.01, 0.36 * (0.9 + rand() * 0.2), 0.12, EIGHTH * len + 1.6, 0.5, { attack: 0.02, shimmer: 0.4 });
      }
      // celesta: sparse high notes now and then; a little more often in the major bars
      if (rand() < (wonder ? 0.6 : 0.28)) {
        const count = rand() < 0.3 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const e = [1, 2, 4, 5][Math.floor(rand() * 4)] + k * 0.5;
          bell(bellNote(chordAt(Math.floor(e))), t0 + e * EIGHTH + 0.02, 0.07 * (0.8 + rand() * 0.4), (rand() - 0.5) * 1.1);
        }
      }
      // airy pad swelling under the phrase
      if (padOn) {
        chords.forEach((c, k) => {
          const v = V[c];
          const tones = [v[0] + 12, v[2], v[3], v[v.length - 1] + 12].map((m) => (m < 48 ? m + 12 : m));
          padChord(tones, t0 + k * BAR / chords.length, BAR / chords.length, wonder ? 0.005 : 0.004);
        });
      }
      // a soft rolled Dm(add9) as the cycle turns over, with a celesta answer
      if (pos === FORM.length - 1) {
        const v = V["Dm(add9)"];
        v.forEach((m, i) => note(m, t0 + BAR - EIGHTH * 0.9 + i * 0.06, 0.16, voicePan(i, v.length), BAR * 2.4, 0.15, { attack: 0.02, shimmer: i > 3 ? 0.3 : 0 }));
        bell(81, t0 + BAR + EIGHTH * 1.5, 0.06, 0.35);
      }
      bar++;
    }

    let nextBar = 0, timer = null;
    return {
      ctx, master,
      scheduleUntil(t) { if (!nextBar) nextBar = ctx.currentTime + 0.15; while (nextBar < t) { scheduleBar(nextBar); nextBar += BAR; } },
      start() {
        const tick = () => this.scheduleUntil(ctx.currentTime + 1.4);
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
