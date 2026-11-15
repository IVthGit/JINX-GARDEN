// Jinx Garden: the music. Everything is synthesised in the browser, so there are no sound files.
// A small step sequencer (16 steps to the bar) plays a different piece for each place:
//   title, garden   a slow, swung lullaby: sub bass, dusty drums, a pad, a music box, a calliope
//   map             almost nothing: a drone, a heartbeat, a clock, a few bells
//   Act I           circus pop-punk: palm-muted power chords, off-beat organ, a lead in harmonic minor
//   Act II          half-time and glassy: mirrored bells, a pulsing bass, a theremin
//   Act III         slow and heavy: a sludge riff with a tritone in it, a choir, a calliope gone wrong
// Ringmasters get the act's piece a little faster, a semitone up, with more cymbals.
(function () {
  "use strict";
  const JG = (window.JG = window.JG || {});
  const M = (JG.music = { scene: null });
  let c = null, out = null, noiseBuf = null;
  let dry, verb, echo, gtr, drums, song = null, want = null, step = 0, nextT = 0, switchAt = 0;
  const rnd = Math.random;
  const N = (n) => 220 * Math.pow(2, n / 12);            // semitones from A3
  const TONES = { m: [0, 3, 7], M: [0, 4, 7], 7: [0, 4, 7, 10], dim: [0, 3, 6] };
  const hit = (p, s) => (p[s] === "x" || p[s] === "X" ? 1 : p[s] === "o" ? 0.45 : 0);

  M.init = function (ctx, dest, noise) {
    c = ctx; out = dest; noiseBuf = noise;
    dry = c.createGain(); dry.gain.value = 1; dry.connect(out);
    // a room: decaying noise, darker at the tail
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) { const k = i / len; lp += ((rnd() * 2 - 1) - lp) * (0.55 - 0.45 * k); d[i] = lp * Math.pow(1 - k, 2.6); }
    }
    const conv = c.createConvolver(); conv.buffer = ir;
    verb = c.createGain(); verb.gain.value = 0.5;
    verb.connect(conv); conv.connect(out);
    // an echo, set to the song's tempo when a song starts
    const dl = c.createDelay(1.5), fb = c.createGain(), dlp = c.createBiquadFilter(), wet = c.createGain();
    fb.gain.value = 0.38; dlp.type = "lowpass"; dlp.frequency.value = 2400; wet.gain.value = 0.3;
    echo = c.createGain(); echo.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(out);
    M.delayNode = dl;
    // guitar amp: everything sent here is distorted together, like strings through one speaker
    gtr = c.createGain(); gtr.gain.value = 1;
    const ws = c.createWaveShaper(), curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = (i / 2047) * 2 - 1; curve[i] = Math.tanh(x * 9) * 0.9 + Math.tanh(x * 2) * 0.1; }
    ws.curve = curve; ws.oversample = "2x";
    const cab = c.createBiquadFilter(); cab.type = "lowpass"; cab.frequency.value = 3400; cab.Q.value = 0.7;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 95;
    const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 850; mid.gain.value = 5; mid.Q.value = 0.8;
    const go = c.createGain(); go.gain.value = 0.17;
    gtr.connect(ws); ws.connect(cab); cab.connect(hp); hp.connect(mid); mid.connect(go); go.connect(dry);
    const gv = c.createGain(); gv.gain.value = 0.12; go.connect(gv); gv.connect(verb);
    drums = c.createGain(); drums.gain.value = 1; drums.connect(dry);
    const dv = c.createGain(); dv.gain.value = 0.1; drums.connect(dv); dv.connect(verb);
  };

  // ---------- instruments ----------
  function env(g, t, a, peak, dec, hold) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (hold) g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + dec);
  }
  function voice(type, f, t, life, detune) {
    const o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.start(t); o.stop(t + life + 0.05);
    return o;
  }
  function nz(t, life) { const s = c.createBufferSource(); s.buffer = noiseBuf; s.start(t, rnd() * 0.6); s.stop(t + life + 0.05); return s; }
  function send(node, d, v, e) { node.connect(d || dry); if (v) { const s = c.createGain(); s.gain.value = v; node.connect(s); s.connect(verb); } if (e) { const s = c.createGain(); s.gain.value = e; node.connect(s); s.connect(echo); } }

  function kick(t, v, deep) {
    const o = voice("sine", deep ? 120 : 155, t, 0.3), g = c.createGain();
    o.frequency.exponentialRampToValueAtTime(deep ? 38 : 46, t + (deep ? 0.16 : 0.1));
    env(g, t, 0.003, v, deep ? 0.34 : 0.22);
    o.connect(g); g.connect(drums);
    const n = nz(t, 0.02), f = c.createBiquadFilter(), ng = c.createGain();
    f.type = "lowpass"; f.frequency.value = 2200; env(ng, t, 0.001, v * 0.35, 0.02);
    n.connect(f); f.connect(ng); ng.connect(drums);
  }
  function snare(t, v, big) {
    const n = nz(t, 0.3), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = big ? 1400 : 1900; f.Q.value = 0.6;
    env(g, t, 0.002, v, big ? 0.26 : 0.15);
    n.connect(f); f.connect(g); g.connect(drums);
    if (big) { const s = c.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(verb); }
    const o = voice("triangle", 210, t, 0.12), og = c.createGain();
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    env(og, t, 0.002, v * 0.55, 0.09);
    o.connect(og); og.connect(drums);
  }
  function hat(t, v, open) {
    const n = nz(t, open ? 0.3 : 0.06), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = open ? 6000 : 8000;
    env(g, t, 0.001, v, open ? 0.22 : 0.035);
    n.connect(f); f.connect(g); g.connect(drums);
  }
  function crash(t, v) {
    const n = nz(t, 1.6), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = 3800;
    env(g, t, 0.002, v, 1.4);
    n.connect(f); f.connect(g); g.connect(drums);
  }
  function tom(t, f0, v) {
    const o = voice("sine", f0, t, 0.3), g = c.createGain();
    o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.2);
    env(g, t, 0.003, v, 0.24);
    o.connect(g); g.connect(drums);
  }
  function tick(t, v, f0) {
    const n = nz(t, 0.03), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = f0; f.Q.value = 6;
    env(g, t, 0.001, v, 0.025);
    n.connect(f); f.connect(g); send(g, dry, 0.5);
  }
  function crackle(t, span) {
    for (let i = 0; i < 2; i++) if (rnd() < 0.5) {
      const tt = t + rnd() * span, n = nz(tt, 0.01), f = c.createBiquadFilter(), g = c.createGain();
      f.type = "highpass"; f.frequency.value = 2500 + rnd() * 3000;
      env(g, tt, 0.0005, 0.012 + rnd() * 0.02, 0.006);
      n.connect(f); f.connect(g); g.connect(dry);
    }
  }
  function sub(t, f, dur, v) {
    const o = voice("sine", f, t, dur + 0.2), o2 = voice("triangle", f * 2, t, dur + 0.2), g = c.createGain(), g2 = c.createGain();
    env(g, t, 0.01, v, 0.18, dur);
    g2.gain.value = 0.35;   // an octave up, so a phone speaker still plays the bass line
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dry);
  }
  function bass(t, f, dur, v) {
    const o = voice("sawtooth", f, t, dur + 0.15), o2 = voice("square", f, t, dur + 0.15, -7), lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = "lowpass"; lp.Q.value = 3;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(240, t + Math.min(dur, 0.2) + 0.05);
    env(g, t, 0.004, v, 0.06, dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dry);
  }
  // a power chord (or any stack of notes) into the amp. mute: palm-muted chug
  function guitar(t, freqs, dur, v, mute) {
    const g = c.createGain();
    if (mute) env(g, t, 0.002, v * 0.9, 0.07, 0.02); else env(g, t, 0.004, v, 0.12, dur);
    let dst = g;
    if (mute) { const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; lp.connect(g); dst = lp; }
    for (const f of freqs) for (const d of [-7, 7]) voice("sawtooth", f, t, (mute ? 0.12 : dur) + 0.2, d).connect(dst);
    g.connect(gtr);
  }
  function pad(t, freqs, dur, v, bright) {
    const lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = "lowpass"; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(bright || 1100, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(420, t + dur + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(1.2, dur * 0.4)); g.gain.setValueAtTime(v, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
    for (const f of freqs) for (const d of [-9, 8]) voice("sawtooth", f, t, dur + 1, d).connect(lp);
    lp.connect(g); send(g, dry, 0.7);
  }
  // voices going "ooh": saws through three vowel filters
  function choir(t, freqs, dur, v) {
    const mix = c.createGain(), g = c.createGain();
    mix.gain.value = 1;
    for (const f of freqs) for (const d of [-11, 0, 10]) voice("sawtooth", f, t, dur + 1.2, d).connect(mix);
    for (const [ff, q, k] of [[420, 5, 1], [880, 7, 0.5], [2400, 8, 0.15]]) { const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = ff; bp.Q.value = q; const bg = c.createGain(); bg.gain.value = k; mix.connect(bp); bp.connect(bg); bg.connect(g); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(1.5, dur * 0.45)); g.gain.setValueAtTime(v, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.1);
    send(g, dry, 0.9);
  }
  // a music box or a struck glass: one sine bending another
  function bell(t, f, dur, v, glass) {
    const car = voice("sine", f, t, dur + 0.1), mod = voice("sine", f * (glass ? 2.76 : 3.5), t, dur + 0.1), mg = c.createGain(), g = c.createGain();
    mg.gain.setValueAtTime(f * (glass ? 1.4 : 2.2), t); mg.gain.exponentialRampToValueAtTime(1, t + (glass ? 0.5 : 0.25));
    mod.connect(mg); mg.connect(car.frequency);
    env(g, t, 0.002, v, dur);
    car.connect(g); send(g, dry, 0.45, 0.5);
  }
  // a steam calliope: hollow, breathy, a little out of tune
  function organ(t, f, dur, v, sour) {
    const g = c.createGain(), lp = c.createBiquadFilter(), vib = voice("sine", 5.6, t, dur + 0.2), vg = c.createGain();
    lp.type = "lowpass"; lp.frequency.value = 2600;
    vg.gain.value = f * 0.006; vib.connect(vg);
    for (const [mult, type, k] of [[1, "square", 1], [2, "square", 0.45], [3, "sine", 0.3]]) {
      const o = voice(type, f * mult, t, dur + 0.2, sour || 0), og = c.createGain();
      og.gain.value = k; vg.connect(o.frequency); o.connect(og); og.connect(lp);
    }
    const n = nz(t, 0.05), nf = c.createBiquadFilter(), ng = c.createGain();
    nf.type = "bandpass"; nf.frequency.value = f * 2; env(ng, t, 0.002, 0.5, 0.04); n.connect(nf); nf.connect(ng); ng.connect(lp);
    env(g, t, 0.015, v, 0.09, dur);
    lp.connect(g); send(g, dry, 0.35, 0.18);
  }
  // a theremin: slides into every note and never quite holds still
  function theremin(t, f, dur, v, from) {
    const o = voice("sine", from || f, t, dur + 0.4), o2 = voice("triangle", (from || f) * 2, t, dur + 0.4), g = c.createGain(), g2 = c.createGain(), vib = voice("sine", 5.2, t, dur + 0.4), vg = c.createGain();
    for (const [osc, m] of [[o, 1], [o2, 2]]) { osc.frequency.setValueAtTime((from || f) * m, t); osc.frequency.exponentialRampToValueAtTime(f * m, t + 0.14); }
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.014, t + 0.4); vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.09); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
    send(g, dry, 0.8, 0.35);
  }
  function swell(t, dur, v) {
    const n = nz(t, dur), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.Q.value = 1.5; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    n.connect(f); f.connect(g); send(g, dry, 0.8);
  }

  // ---------- songs ----------
  // A song: bpm, swing, key (semitones from A), chords for each bar [root, kind], and play(S, bar, step, t, spb).
  const mel = (S, list, s, t, spb, fn) => { for (const [at, n, len] of list || []) if (at === s) fn(t, N(S.key + n), len * spb * 0.92); };
  const chordOf = (S, bar) => { const [r, q] = S.chords[bar % S.chords.length]; return { r, tones: TONES[q] }; };

  const GARDEN_MEL = [
    [[0, 12, 6], [8, 10, 2], [10, 8, 2], [12, 7, 4]], [[0, 8, 4], [4, 7, 4], [8, 5, 8]],
    [[0, 3, 4], [4, 7, 4], [8, 10, 4], [12, 7, 4]], [[0, 7, 12]],
    [[0, 8, 4], [4, 5, 4], [8, 1, 4], [12, 5, 4]], [[0, 8, 6], [8, 10, 4], [12, 8, 4]],
    [[0, 11, 6], [6, 8, 2], [8, 7, 4], [12, 2, 4]], [[0, 2, 4], [4, 1, 4], [8, -1, 8]]
  ];
  function garden(S, bar, s, t, spb) {
    const ch = chordOf(S, bar), thin = S.thin, second = bar >= 8;
    if (s === 0 && bar % 2 === 0) {
      pad(t, ch.tones.map((x) => N(S.key + ch.r + x - 12)), spb * 32, thin ? 0.11 : 0.075);
      if (second || thin) choir(t, [N(S.key + ch.r), N(S.key + ch.r + ch.tones[2])], spb * 32, thin ? 0.12 : 0.08);
    }
    crackle(t, spb);
    // music box: broken chords, sparser the first time round
    const T = [ch.tones[0], ch.tones[1], ch.tones[2], 12], seq = { 0: 0, 3: 2, 6: 1, 8: 3, 11: 2, 14: 1 };
    if (seq[s] !== undefined && (second || s === 0 || s === 6 || s === 8)) bell(t, N(S.key + ch.r + T[seq[s]] + 12), 0.9, thin ? 0.12 : 0.09);
    if (second) mel(S, GARDEN_MEL[bar - 8], s, t, spb, (tt, f, d) => organ(tt, f, d, thin ? 0.07 : 0.055));
    if (thin) return;
    if (hit(bar % 2 ? "x------x--x-----" : "x---------x-----", s)) kick(t, 0.34, true);
    if (hit("----x-------x---", s)) snare(t, 0.2);
    const h = hit("x-x-x-x-x-x-x-xo", s);
    if (h) hat(t, 0.065 * h);
    if (s === 0) sub(t, N(S.key + ch.r - 24), spb * 6, 0.17);
    if (s === 10) sub(t, N(S.key + ch.r - 24), spb * 3, 0.14);
    if (s === 14 && bar % 2) sub(t, N(S.key + ch.r - 24 + 7), spb * 1.5, 0.12);
  }

  function map(S, bar, s, t, spb) {
    const ch = chordOf(S, bar);
    if (s === 0) {
      for (const [n, v] of [[-24, 0.11], [-17, 0.07], [-12, 0.06]]) { const o = voice("sine", N(S.key + n) * (1 + (rnd() - 0.5) * 0.004), t, spb * 17), g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + spb * 4); g.gain.linearRampToValueAtTime(0.0001, t + spb * 16.5); o.connect(g); send(g, dry, 0.5); }
      if (bar % 2 === 0) choir(t, ch.tones.slice(0, 3).map((x) => N(S.key + ch.r + x)), spb * 30, 0.04);
      if (bar % 4 === 3) swell(t + spb * 8, spb * 8, 0.05);
    }
    if (s === 0) kick(t, 0.32, true);
    if (s === 3) kick(t, 0.22, true);
    if (s % 4 === 0) tick(t, 0.05, s % 8 ? 4200 : 5200);
    const motif = bar % 2 ? { 6: 7, 12: 8 } : { 4: 12, 7: 15, 10: 14, 13: 11 };
    if (motif[s] !== undefined) bell(t, N(S.key + motif[s] + 12), 2.2, 0.07, true);
    if (bar === 6 && s === 0) theremin(t, N(S.key + 12), spb * 14, 0.035, N(S.key + 7));
    if (bar === 7 && s === 0) theremin(t, N(S.key + 11), spb * 14, 0.035, N(S.key + 12));
  }

  const A1_LEAD = [
    [[0, 7, 2], [2, 12, 2], [4, 15, 4], [8, 14, 2], [10, 12, 2], [12, 11, 2], [14, 12, 2]], [[0, 14, 4], [4, 11, 4], [8, 7, 4], [12, 11, 4]],
    [[0, 15, 2], [2, 12, 2], [4, 8, 4], [8, 12, 2], [10, 15, 2], [12, 20, 4]], [[0, 19, 4], [4, 17, 2], [6, 14, 2], [8, 11, 8]],
    [[0, 12, 2], [2, 17, 2], [4, 20, 4], [8, 17, 2], [10, 12, 2], [12, 8, 4]], [[0, 7, 2], [2, 12, 2], [4, 15, 4], [8, 19, 4], [12, 15, 4]],
    [[0, 20, 4], [4, 19, 2], [6, 15, 2], [8, 12, 4], [12, 15, 4]], [[0, 14, 4], [4, 11, 4], [8, 7, 2], [10, 11, 2], [12, 14, 2], [14, 17, 2]]
  ];
  function act1(S, bar, s, t, spb) {
    const ch = chordOf(S, bar), chorus = bar >= 8, fill = bar % 8 === 7 && s >= 8, root = S.key + ch.r;
    const five = [N(root - 12), N(root - 5), N(root)];
    // drums
    if (fill) { s >= 12 ? tom(t, [190, 160, 130, 105][s - 12], 0.45) : snare(t, 0.22 + (s - 8) * 0.03); if (s % 4 === 0) kick(t, 0.6); }
    else {
      if (hit(chorus ? "x-----x-x-----x-" : "x-------x-x-----", s)) kick(t, 0.62);
      if (hit("----x-------x---", s)) snare(t, 0.3);
      if (s % 2 === 0) hat(t, chorus ? 0.07 : 0.05, chorus && s % 4 === 0);
    }
    if (s === 0 && (bar % 4 === 0 || S.boss)) crash(t, 0.16);
    // bass: eighths on the root, walking up at the end of the bar
    if (s % 2 === 0) bass(t, N(root - 24 + (s === 14 ? 7 : 0)), spb * 1.6, 0.2);
    if (!S.light) {
      if (!chorus) { if (s % 2 === 0) guitar(t, five, spb * 2, 0.5, !(s === 0 || s === 6 || s === 12)); }
      else if ([0, 6, 8, 12, 14].includes(s)) guitar(t, five, spb * (s === 0 ? 5.5 : s === 8 ? 3.6 : 1.8), 0.5);
    }
    // the organ: off-beat stabs under the verse, the tune over the chorus
    if ((!chorus || S.light) && s % 4 === 2) for (const x of ch.tones.slice(0, 3)) organ(t, N(root + x), spb * 0.9, S.light ? 0.045 : 0.024);
    if (chorus) mel(S, A1_LEAD[bar - 8], s, t, spb, (tt, f, d) => { organ(tt, f, d, S.light ? 0.08 : 0.055); if (S.boss) organ(tt, f * 2, d, 0.02); });
  }

  const A2_LEAD = [
    [[0, 12, 8], [8, 15, 8]], [[0, 14, 4], [4, 12, 4], [8, 11, 8]], [[0, 15, 8], [8, 20, 8]], [[0, 19, 4], [4, 15, 4], [8, 12, 8]],
    [[0, 17, 8], [8, 20, 8]], [[0, 19, 6], [6, 17, 2], [8, 14, 8]], [[0, 11, 8], [8, 14, 4], [12, 17, 4]], [[0, 19, 8], [8, 23, 8]]
  ];
  function act2(S, bar, s, t, spb) {
    const ch = chordOf(S, bar), second = bar >= 8, root = S.key + ch.r;
    if (hit(S.boss ? "x-----x---x-----" : "x---------x-----", s)) kick(t, 0.6, true);
    if (s === 8) snare(t, 0.34, true);
    if (s === 4 || s === 14) tick(t, 0.12, 2400);
    hat(t, s % 2 ? 0.022 : 0.045);
    if (s === 0 && bar % 8 === 0) crash(t, 0.1);
    if (s % 2 === 0) bass(t, N(root - 24), spb * 1.1, s % 4 ? 0.13 : 0.2);
    if (s === 0 && bar % 2 === 0) choir(t, ch.tones.slice(0, 3).map((x) => N(root + x - 12)), spb * 31, 0.05);
    // bells in threes and a two, each answered an octave up like a reflection
    const T = [ch.tones[0], ch.tones[1], ch.tones[2], 12], seq = { 0: 0, 3: 1, 6: 2, 8: 3, 11: 2, 14: 1 };
    if (seq[s] !== undefined) { const f = N(root + T[(seq[s] + (bar % 2)) % 4] + 12); bell(t, f, 0.7, 0.05, true); bell(t + spb, f * 2, 0.5, 0.018, true); }
    if (second) {
      let prev = null;
      for (const [at, n, len] of A2_LEAD[bar - 8]) { if (at === s) theremin(t, N(S.key + n), len * spb * 0.9, 0.05, prev === null ? N(S.key + n - 2) : N(S.key + prev)); prev = n; }
      if (s === 0) guitar(t, [N(root - 12), N(root - 5), N(root)], spb * 13, 0.32);
      if (hit("----x-x-----x-x-", s)) guitar(t, [N(root - 12), N(root - 5)], spb, 0.3, true);
    }
  }

  const A3_RIFF = [[[0, 0, 6], [6, 0, 2], [8, 3, 4], [12, 6, 4]], [[0, 5, 6], [6, 5, 2], [8, 3, 4], [12, 1, 4]], [[0, 0, 6], [6, 0, 2], [8, 3, 4], [12, 6, 4]], [[0, 5, 6], [6, 5, 2], [8, 3, 4], [12, -2, 4]]];
  const A3_ORGAN = [{ 0: 12, 3: 15, 6: 14, 8: 12, 11: 11, 14: 8 }, { 0: 7, 3: 8, 6: 11, 8: 12, 11: 15, 14: 14 }];
  function act3(S, bar, s, t, spb) {
    const ch = chordOf(S, bar), second = bar >= 8, root = S.key + ch.r;
    if (!second) {
      for (const [at, n, len] of A3_RIFF[bar % 4]) if (at === s) { guitar(t, [N(S.key + n - 24), N(S.key + n - 17), N(S.key + n - 12)], spb * len * 0.95, 0.55); bass(t, N(S.key + n - 36), spb * len * 0.9, 0.24); }
      if (hit("x-----x---x-----", s)) kick(t, 0.7, true);
      if (s === 8) snare(t, 0.4, true);
      if (s % 4 === 0) hat(t, 0.06, true);
      if (s === 0 && bar % 4 === 0) crash(t, 0.18);
      if (bar === 7 && s >= 8 && s % 2 === 0) tom(t, [150, 130, 105, 85][(s - 8) / 2], 0.5);
    } else {
      if (s === 0) { guitar(t, [N(root - 24), N(root - 17), N(root - 12)], spb * 7, 0.5); crash(t, bar % 2 ? 0.08 : 0.16); }
      if (hit("--------x-xx-xx-", s)) guitar(t, [N(root - 24), N(root - 17)], spb, 0.5, true);
      if (s % 2 === 0) bass(t, N(root - 36), spb * 1.5, 0.22);
      if (hit(S.boss ? "x-xx--x-x-xx--xx" : "x-xx--x-x-xx--x-", s)) kick(t, 0.66, true);
      if (hit("----x-------x---", s)) snare(t, 0.4, true);
      if (s % 4 === 0) hat(t, 0.07, true);
      if (bar === 15 && s >= 12) tom(t, [150, 125, 100, 80][s - 12], 0.5);
    }
    if (s === 0 && bar % 2 === 0) choir(t, [N(root - 12), N(root - 5), N(root)], spb * 31, 0.06);
    // a calliope still playing its old tune somewhere under the floor, a little flat
    if (bar % 8 >= 4) { const n = A3_ORGAN[bar % 2][s]; if (n !== undefined) organ(t, N(S.key + n + (second ? ch.r : 0)), spb * 2.2, 0.026, -22); }
  }

  const CH_GARDEN = [[0, "m"], [0, "m"], [-4, "M"], [-4, "M"], [5, "m"], [5, "m"], [-5, "7"], [-5, "7"], [0, "m"], [0, "m"], [3, "M"], [3, "M"], [1, "M"], [1, "M"], [-5, "7"], [-5, "7"]];
  const CH_ACT1 = [[0, "m"], [-4, "M"], [3, "M"], [-2, "M"], [0, "m"], [-4, "M"], [3, "M"], [-2, "M"], [0, "m"], [-5, "7"], [-4, "M"], [-5, "7"], [-7, "m"], [0, "m"], [-4, "M"], [-5, "7"]];
  const CH_ACT2 = [[0, "m"], [0, "m"], [-4, "M"], [-4, "M"], [-7, "m"], [-7, "m"], [-5, "7"], [-5, "7"]];
  const CH_ACT3 = [[0, "m"], [0, "m"], [0, "m"], [0, "m"], [0, "m"], [0, "m"], [0, "m"], [0, "m"], [0, "m"], [-4, "M"], [5, "m"], [-5, "M"], [0, "m"], [-4, "M"], [5, "m"], [-5, "M"]];
  const CH_MAP = [[0, "m"], [0, "m"], [1, "M"], [0, "m"], [5, "m"], [0, "m"], [-1, "dim"], [-5, "7"]];
  const SONGS = {
    title:   { bpm: 78, swing: 0.16, key: 5, bars: 16, chords: CH_GARDEN, play: garden, thin: true },
    garden:  { bpm: 84, swing: 0.18, key: 5, bars: 16, chords: CH_GARDEN, play: garden },
    talent:  { bpm: 148, swing: 0, key: 7, bars: 16, chords: CH_ACT1, play: act1, light: true },
    map1:    { bpm: 72, swing: 0, key: 7, bars: 8, chords: CH_MAP, play: map },
    map2:    { bpm: 70, swing: 0, key: 9, bars: 8, chords: CH_MAP, play: map },
    map3:    { bpm: 66, swing: 0, key: 3, bars: 8, chords: CH_MAP, play: map },
    battle1: { bpm: 168, swing: 0, key: 7, bars: 16, chords: CH_ACT1, play: act1 },
    battle2: { bpm: 132, swing: 0, key: 9, bars: 16, chords: CH_ACT2, play: act2 },
    battle3: { bpm: 96, swing: 0, key: 3, bars: 16, chords: CH_ACT3, play: act3 },
    boss1:   { bpm: 184, swing: 0, key: 8, bars: 16, chords: CH_ACT1, play: act1, boss: true },
    boss2:   { bpm: 144, swing: 0, key: 10, bars: 16, chords: CH_ACT2, play: act2, boss: true },
    boss3:   { bpm: 106, swing: 0, key: 4, bars: 16, chords: CH_ACT3, play: act3, boss: true }
  };
  M.SONGS = SONGS;

  // Called often. Schedules the next few steps, and changes piece when the scene changes.
  M.tick = function (scene) {
    if (!c || c.state !== "running") return;
    const now = c.currentTime;
    if (scene !== want) {
      want = scene;
      // fade out, swap, fade back in
      dry.gain.cancelScheduledValues(now);
      dry.gain.setTargetAtTime(0.0001, now, 0.09);
      switchAt = now + (song ? 0.4 : 0.05);
    }
    if (switchAt && now >= switchAt) {
      switchAt = 0;
      song = SONGS[want] || SONGS.garden;
      M.scene = want;
      step = 0;
      nextT = now + 0.08;
      M.delayNode.delayTime.setValueAtTime(Math.min(1.4, (60 / song.bpm) * 0.75), now);
      dry.gain.cancelScheduledValues(now);
      dry.gain.setTargetAtTime(1, now + 0.05, 0.12);
    }
    if (!song || switchAt) return;
    const spb = 60 / song.bpm / 4;
    if (nextT < now - 0.5) nextT = now + 0.05;   // the tab was asleep, or the sound was off: don't try to catch up
    while (nextT < now + 0.16) {
      const s = step % 16, bar = Math.floor(step / 16) % song.bars;
      song.play(song, bar, s, nextT + (s % 2 ? song.swing * spb : 0), spb);
      nextT += spb;
      step++;
    }
  };
  // where we are in the bar, 0 to 1, for anything that wants to move in time
  M.phase = function () { return song && c ? ((c.currentTime - nextT) / (60 / song.bpm) + step / 4) % 1 : 0; };
})();
