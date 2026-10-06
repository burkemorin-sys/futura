/* Futura ambient music, piano version: an original, generative piece for soft felt piano, an airy choir pad and celesta,
 * made with the Web Audio API. It is NOT loaded by the app. To use it, follow README "Background music" and
 * load this file instead of music.js. It exposes the same window.FuturaMusic API.
 *
 * Piano: each note is synthesised additively, once, then cached. It has 2–3 slightly detuned unison strings,
 * stretched (inharmonic) partials, a felt-hammer spectrum and lowpass, two-stage per-partial decay, a soft attack,
 * and a little hammer thump. The sustain pedal is modelled by letting notes ring until the next pedal change.
 * Ethereal layers: a formant-filtered "aah" choir that swells slowly, sparse celesta sparkles,
 * octave-up shimmer sends, and a 7 s stereo convolution reverb.
 *
 * Music: original; D minor with a major-colour passage, 68 BPM in 3/4, flowing broken chords and a sparse melody.
 */
(function () {
  "use strict";

  const BPM = 68;
  const EIGHTH = 60 / BPM / 2;          // 3/4: six eighths per bar
  const BAR = EIGHTH * 6;
  const MASTER = 0.08;                  // master gain at full fade-in: RMS ≈ -34 dBFS, peak ≈ -17 dBFS (checked offline)
  const PREF_KEY = "music";

  // ---------- harmony ([left-hand bass, ...upper voices], MIDI) ----------
  const V = {
    "Dm(add9)":  [38, 50, 57, 60, 64, 65],
    "Bbmaj7#11": [46, 53, 57, 62, 64, 65],
    "Gm9":       [43, 50, 58, 62, 65, 69],
    "Asus4":     [45, 52, 57, 62, 64, 69],
    "A7":        [45, 52, 55, 61, 64, 67],
    "Dm/C":      [48, 55, 57, 62, 65, 69],
    "Bbmaj9":    [46, 53, 57, 60, 62, 65],
    "Gm6":       [43, 50, 58, 62, 64, 67],
    "Asus2":     [45, 52, 57, 59, 64, 69],
    "Fmaj9":     [41, 48, 57, 60, 64, 67],
    "Fmaj7/A":   [45, 52, 57, 60, 64, 65],
    "Cadd9/E":   [40, 47, 55, 60, 62, 67],
    "Dm9":       [38, 45, 57, 60, 64, 65],
    "Bbmaj7":    [46, 53, 57, 62, 65, 69],
  };
  const A1 = [["Dm(add9)"], ["Bbmaj7#11"], ["Gm9"], ["Asus4", "A7"]];
  const A2 = [["Dm/C"], ["Bbmaj9"], ["Gm6"], ["Asus2", "A7"]];
  const B  = [["Fmaj9"], ["Bbmaj7#11"], ["Fmaj7/A"], ["Cadd9/E"], ["Dm9"], ["Bbmaj7"], ["Gm9"], ["Asus4", "A7"]];
  const FORM = [...A1, ...A2, ...B];   // 16 bars ≈ 42 s per cycle
  const MAJOR_BARS = new Set([8, 9, 10, 11]);
  const SCALE = [2, 4, 5, 7, 9, 10, 0, 1]; // D natural minor + C# over A chords

  // Broken-chord patterns over six eighths: 0 = bass, 1 = left-hand fifth, 2.. = right hand; null = rest.
  const PATTERNS = [
    [0, 2, 3, 4, 3, null],
    [0, 1, 3, null, 4, 2],
    [0, 3, null, 2, 5, null],
    [0, 2, 4, null, 3, 5],
    [0, null, 3, 2, null, 4],
  ];

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- felt piano note (additive) ----------
  function pianoBuffer(ctx, midi, layer, rand) {
    const sr = ctx.sampleRate, f0 = mtof(midi);
    const v = 0.25 + 0.25 * layer;                         // layer 0..3 -> timbre velocity 0.25..1
    const tau = Math.min(9, Math.max(1.4, 7.5 * Math.pow(2, -(midi - 45) / 16)));  // aftersound decay (s)
    const dur = Math.min(9, Math.max(3, tau * 2.6));
    const len = Math.floor(sr * dur);
    const out = new Float32Array(len);
    const B = 0.00008 * Math.exp((midi - 40) * 0.04);     // string stiffness: stretched partials
    const strings = midi < 40 ? 1 : midi < 52 ? 2 : 3;
    const fc = 1400 + 3000 * v * v + f0 * 2;              // felt lowpass: softer notes are darker
    const tilt = 1.2 - 0.35 * v;                          // spectral roll-off
    const strike = 1 / 7.3;                                // hammer position (weakens the ~7th partial)
    const att = Math.floor(sr * (0.016 - 0.008 * v));     // soft felt attack
    for (let n = 1; n <= 28; n++) {
      const fn = n * f0 * Math.sqrt(1 + B * n * n);
      if (fn > Math.min(9500, sr * 0.45)) break;
      let amp = Math.pow(n, -tilt) / (1 + Math.pow(fn / fc, 2)) * Math.abs(Math.sin(Math.PI * n * strike)) / Math.sin(Math.PI * strike);
      if (amp < 0.002) continue;
      const tn = tau / (1 + 0.16 * Math.pow(n - 1, 1.15) + fn / 4000);   // higher partials die sooner
      const t1 = tn * 0.22, w = 0.55;                      // prompt sound + aftersound
      const k1 = Math.exp(-1 / (t1 * sr)), k2 = Math.exp(-1 / (tn * sr));
      const stop = Math.min(len, Math.floor(tn * 7 * sr));
      for (let s = 0; s < strings; s++) {
        const det = strings === 1 ? 0 : (s - (strings - 1) / 2) * (0.5 + rand() * 0.6);  // cents between unison strings
        const w0 = 2 * Math.PI * fn * Math.pow(2, det / 1200) / sr;
        const c = Math.cos(w0), sn = Math.sin(w0);
        let ph = rand() * Math.PI * 2, x = Math.cos(ph), y = Math.sin(ph);
        let e1 = 1, e2 = 1;
        const a = amp / strings;
        for (let i = 0; i < stop; i++) {
          const nx = x * c - y * sn; y = x * sn + y * c; x = nx;
          out[i] += a * (w * e1 + (1 - w) * e2) * y;
          e1 *= k1; e2 *= k2;
          if ((i & 4095) === 0) { const r = 1 / Math.hypot(x, y); x *= r; y *= r; }
        }
      }
    }
    // hammer/felt thump: short lowpassed noise
    let lp = 0, lp2 = 0; const th = Math.floor(sr * 0.05), tc = 0.02 + 0.03 * v;
    for (let i = 0; i < th; i++) { lp += tc * ((rand() * 2 - 1) - lp); lp2 += tc * (lp - lp2); out[i] += lp2 * 0.5 * v * Math.exp(-i / (sr * 0.012)); }
    // soft attack (raised cosine) + tail fade + DC block
    for (let i = 0; i < att; i++) out[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / att);
    const fade = Math.floor(sr * 0.25); for (let i = len - fade; i < len; i++) out[i] *= (len - i) / fade;
    let x1 = 0, y1 = 0; for (let i = 0; i < len; i++) { const yy = out[i] - x1 + 0.997 * y1; x1 = out[i]; y1 = yy; out[i] = yy; }
    const ab = ctx.createBuffer(1, len, sr); ab.getChannelData(0).set(out.map((q) => q * 0.35));
    return ab;
  }

  // Stereo impulse: decorrelated L/R noise, soft bloom, long darkening tail.
  function impulse(ctx, seconds, rand) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let n = 0; n < len; n++) {
        const t = n / sr;
        lp += (0.38 * Math.exp(-t * 0.7) + 0.05) * ((rand() * 2 - 1) - lp);
        d[n] = lp * Math.exp(-t * (6.9 / seconds)) * (1 - Math.exp(-t * 9)) * Math.min(1, t / 0.03);
      }
      const f = Math.floor(sr * 0.4); for (let n = len - f; n < len; n++) d[n] *= (len - n) / f;
    }
    return ir;
  }

  function Engine(ctx, seed) {
    const rand = rng(seed);
    const cache = new Map();
    const getPiano = (m, layer) => { const k = m * 4 + layer; if (!cache.has(k)) cache.set(k, pianoBuffer(ctx, m, layer, rand)); return cache.get(k); };
    const cleanup = (...nodes) => () => nodes.forEach((n) => n && n.disconnect());

    const master = ctx.createGain(); master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.knee.value = 10; limiter.ratio.value = 5; limiter.attack.value = 0.005; limiter.release.value = 0.3;
    master.connect(limiter); limiter.connect(ctx.destination);

    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 7, rand);
    const verbHp = ctx.createBiquadFilter(); verbHp.type = "highpass"; verbHp.frequency.value = 160;
    const verbLp = ctx.createBiquadFilter(); verbLp.type = "lowpass"; verbLp.frequency.value = 7500;
    const send = ctx.createGain(); const wet = ctx.createGain(); wet.gain.value = 0.6;
    send.connect(verbHp); verbHp.connect(verb); verb.connect(verbLp); verbLp.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.6; dry.connect(master);

    // piano bus: gentle warmth, a touch of low-mid body
    const piano = ctx.createGain();
    const pBody = ctx.createBiquadFilter(); pBody.type = "peaking"; pBody.frequency.value = 180; pBody.Q.value = 0.9; pBody.gain.value = 0.5;
    const pBox = ctx.createBiquadFilter(); pBox.type = "peaking"; pBox.frequency.value = 650; pBox.Q.value = 1; pBox.gain.value = -2.5;
    const pWarm = ctx.createBiquadFilter(); pWarm.type = "highshelf"; pWarm.frequency.value = 4000; pWarm.gain.value = -3;
    const pHp = ctx.createBiquadFilter(); pHp.type = "highpass"; pHp.frequency.value = 55;
    piano.connect(pHp); pHp.connect(pBody); pBody.connect(pBox); pBox.connect(pWarm); pWarm.connect(dry);
    const pSend = ctx.createGain(); pSend.gain.value = 0.85; pWarm.connect(pSend); pSend.connect(send);

    // shimmer: octave-up ghosts into the reverb only
    const shimmer = ctx.createGain(); const shimLp = ctx.createBiquadFilter(); shimLp.type = "lowpass"; shimLp.frequency.value = 5500;
    shimmer.connect(shimLp); shimLp.connect(send);

    // celesta
    const bells = ctx.createGain(); const bellLp = ctx.createBiquadFilter(); bellLp.type = "lowpass"; bellLp.frequency.value = 6500;
    bells.connect(bellLp); const bellDry = ctx.createGain(); bellDry.gain.value = 0.4; bellLp.connect(bellDry); bellDry.connect(dry); bellLp.connect(send);

    // choir: saw pairs -> parallel "aah" formants -> slow tremolo; wide
    const choir = ctx.createGain();
    const choirOut = ctx.createGain(); choirOut.gain.value = 1;
    [[750, 6, 1], [1150, 8, 0.55], [2700, 10, 0.18]].forEach(([fq, q, g]) => {
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = q;
      const gg = ctx.createGain(); gg.gain.value = g; choir.connect(bp); bp.connect(gg); gg.connect(choirOut);
    });
    const choirLp = ctx.createBiquadFilter(); choirLp.type = "lowpass"; choirLp.frequency.value = 3200;
    const trem = ctx.createGain(); trem.gain.value = 0.85;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.15;
    lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
    const vib = ctx.createOscillator(); vib.frequency.value = 4.6; const vibAmt = ctx.createGain(); vibAmt.gain.value = 5; vib.connect(vibAmt);
    lfo.start(); vib.start();
    choirOut.connect(choirLp); choirLp.connect(trem);
    const choirDry = ctx.createGain(); choirDry.gain.value = 0.35; trem.connect(choirDry); choirDry.connect(dry); trem.connect(send);

    let ringing = [];                                       // piano notes held by the pedal
    function pianoNote(m, t, vel, opts = {}) {
      const layer = Math.max(0, Math.min(3, Math.round(vel * 3.4 - 0.3)));
      const buf = getPiano(m, layer);
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.detune.value = (rand() - 0.5) * 3;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.35 + 0.65 * vel, t);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      src.connect(g);
      if (p) { p.pan.value = Math.max(-0.6, Math.min(0.6, (m - 60) / 40)) + (rand() - 0.5) * 0.1; g.connect(p); p.connect(piano); } else g.connect(piano);
      src.start(t); src.stop(t + buf.duration);
      src.onended = cleanup(src, g, p);
      ringing.push({ g, t, held: opts.held });
      if (opts.shimmer) {
        const gh = ctx.createBufferSource(); gh.buffer = buf; gh.playbackRate.value = 2;
        const gg = ctx.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(vel * opts.shimmer, t + 0.3);
        gg.gain.exponentialRampToValueAtTime(0.0003, t + buf.duration / 2);
        gh.connect(gg); gg.connect(shimmer); gh.start(t); gh.stop(t + buf.duration / 2);
        gh.onended = cleanup(gh, gg);
      }
    }
    // pedal change: damp what was ringing (a felt damper takes a moment), keep notes struck at/after `t`
    function pedalChange(t) {
      const keep = [];
      ringing.forEach((r) => {
        if (r.t >= t - 0.01) { keep.push(r); return; }
        r.g.gain.setTargetAtTime(0.0001, t, 0.16);
      });
      ringing = keep;
    }
    function bell(midi, t, vel, pan) {
      const f = mtof(midi);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const out = ctx.createGain(); out.gain.value = vel;
      if (p) { p.pan.value = pan; out.connect(p); p.connect(bells); } else out.connect(bells);
      [[1, 1, 2.8], [2, 0.05, 1.4], [4, 0.1, 0.7], [2.76, 0.015, 0.2]].forEach(([ratio, amp, decay]) => {
        if (f * ratio > 12000) return;
        const o = ctx.createOscillator(); o.frequency.value = f * ratio;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0002, t + decay);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + decay + 0.05);
        o.onended = ratio === 1 ? cleanup(o, g, out, p) : cleanup(o, g);
      });
      const o2 = ctx.createOscillator(); o2.frequency.value = f * 2;
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vel * 0.2, t + 0.3); g2.gain.exponentialRampToValueAtTime(0.0002, t + 2.6);
      o2.connect(g2); g2.connect(shimmer); o2.start(t); o2.stop(t + 2.7); o2.onended = cleanup(o2, g2);
    }
    function choirChord(midis, t, dur, level) {
      midis.forEach((m, i) => {
        [-7, 7].forEach((cents, k) => {
          const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = cents + (rand() - 0.5) * 4;
          vibAmt.connect(o.detune);
          const g = ctx.createGain(); const lvl = level * (i === 0 ? 0.8 : 1);
          g.gain.setValueAtTime(0.00003, t); g.gain.exponentialRampToValueAtTime(lvl, t + Math.min(4, dur * 0.7));
          g.gain.setValueAtTime(lvl, t + dur); g.gain.exponentialRampToValueAtTime(0.00003, t + dur + 4.5);
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          o.connect(g);
          if (p) { p.pan.value = (k ? 0.7 : -0.7) * (0.6 + 0.4 * rand()); g.connect(p); p.connect(choir); } else g.connect(choir);
          o.start(t); o.stop(t + dur + 4.6);
          o.onended = () => { try { vibAmt.disconnect(o.detune); } catch (e) { /* already gone */ } cleanup(o, g, p)(); };
        });
      });
    }

    // ---- composition ----
    let bar = 0, cycle = 0, pattern = 0, mel = 74, melRhythm = null, choirOn = false, lastBell = 84;
    function chooseMelRhythm() {
      const o = [[[0, 6], [], [0, 3, 3, 3], [0, 6]], [[], [0, 6], [], [3, 3]], [[0, 4], [], [0, 6], []], [[3, 3], [0, 6], [], [0, 6]]];
      return o[Math.floor(rand() * o.length)];
    }
    function nextMel(chord) {
      const tones = chord.slice(2).map((m) => m % 12), cands = [];
      for (let m = 69; m <= 83; m++) {
        const pc = m % 12; if (!SCALE.includes(pc)) continue;
        if (pc === 1 && !chord.some((x) => x % 12 === 1)) continue;
        const d = Math.abs(m - mel); if (d > 4) continue;
        cands.push([m, (tones.includes(pc) ? 3 : 0.6) * (d === 0 ? 0.4 : d <= 2 ? 1.7 : 1)]);
      }
      let r = rand() * cands.reduce((s, c) => s + c[1], 0);
      for (const [m, w] of cands) if ((r -= w) <= 0) { mel = m; break; }
      return mel;
    }
    function bellNote(chord) {
      const pcs = chord.slice(2).map((m) => m % 12), c = [];
      for (let m = 79; m <= 93; m++) if (pcs.includes(m % 12) && Math.abs(m - lastBell) <= 7) c.push(m);
      lastBell = c.length ? c[Math.floor(rand() * c.length)] : 86; return lastBell;
    }

    function scheduleBar(t0) {
      const pos = bar % FORM.length; if (pos === 0) cycle++;
      const chords = FORM[pos];
      if (pos % 4 === 0) {
        if (rand() < 0.6) pattern = Math.floor(rand() * PATTERNS.length);
        melRhythm = (cycle > 1 || pos >= 8) && rand() < 0.65 ? chooseMelRhythm() : null;
        choirOn = pos >= 8 ? rand() < 0.9 : rand() < 0.55;
      }
      const wonder = MAJOR_BARS.has(pos);
      const chordAt = (e) => V[chords.length === 2 && e >= 3 ? chords[1] : chords[0]];
      // pedal: change on each new chord, just after the new bass note sounds (legato pedalling)
      pedalChange(t0 + 0.02);
      if (chords.length === 2) pedalChange(t0 + 3 * EIGHTH + 0.02);
      for (let e = 0; e < 6; e++) {
        const step = PATTERNS[pattern][e]; if (step === null) continue;
        if (e > 0 && rand() < 0.1) continue;
        const chord = chordAt(e);
        const t = t0 + e * EIGHTH + (e % 2 ? 0.012 : 0) + (rand() - 0.5) * 0.014;
        const ix = Math.min(step, chord.length - 1), m = chord[ix];
        const shape = e === 0 ? 1 : e === 3 ? 0.85 : 0.72;
        const vel = (ix === 0 ? 0.42 : ix === 1 ? 0.3 : 0.32) * shape * (0.85 + rand() * 0.25);
        pianoNote(m, t, vel, { shimmer: ix >= 4 && rand() < 0.3 ? 0.3 : 0 });
        if (e === 0 && rand() < 0.3) pianoNote(chord[1], t + 0.035, vel * 0.55);   // soft left-hand fifth
      }
      for (let n = 0; n + 1 < (melRhythm ? melRhythm[pos % 4].length : 0); n += 2) {
        const e = melRhythm[pos % 4][n];
        pianoNote(nextMel(chordAt(e)), t0 + e * EIGHTH + 0.015, 0.4 * (0.9 + rand() * 0.2), { shimmer: 0.4 });
      }
      if (rand() < (wonder ? 0.55 : 0.25)) {
        const count = rand() < 0.3 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const e = [1, 2, 4, 5][Math.floor(rand() * 4)] + k * 0.5;
          bell(bellNote(chordAt(Math.floor(e))), t0 + e * EIGHTH + 0.02, 0.07 * (0.8 + rand() * 0.4), (rand() - 0.5) * 1.3);
        }
      }
      if (choirOn) chords.forEach((c, k) => {
        const v = V[c]; const voices = [v[2], v[3], v[v.length - 1]].map((m) => (m < 60 ? m + 12 : m));
        choirChord(voices, t0 + k * BAR / chords.length, BAR / chords.length, wonder ? 0.0042 : 0.0034);
      });
      if (pos === FORM.length - 1) {
        const v = V["Dm(add9)"];
        v.forEach((m, i) => pianoNote(m + (i ? 12 : 0), t0 + BAR - EIGHTH * 0.8 + i * 0.07, 0.2, { shimmer: i > 3 ? 0.3 : 0 }));
        bell(86, t0 + BAR + EIGHTH * 1.5, 0.05, 0.4);
      }
      bar++;
    }

    let nextBar = 0, timer = null;
    return {
      ctx, master,
      scheduleUntil(t) { if (!nextBar) nextBar = ctx.currentTime + 0.15; while (nextBar < t) { scheduleBar(nextBar); nextBar += BAR; } },
      start() { const tick = () => this.scheduleUntil(ctx.currentTime + 1.4); tick(); timer = setInterval(tick, 200); },
      fade(to, sec) { const now = ctx.currentTime, gp = master.gain; gp.cancelScheduledValues(now); gp.setValueAtTime(Math.max(gp.value, 0.0001), now); gp.exponentialRampToValueAtTime(Math.max(to, 0.0001), now + sec); },
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
