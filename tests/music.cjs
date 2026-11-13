// Renders each piece offline and reports levels. Also writes short WAV previews.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await p.goto(URL0); await p.waitForTimeout(600);
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const names = only || await p.evaluate(() => Object.keys(JG.music.SONGS));
  for (const name of names) {
    const r = await p.evaluate(async (name) => {
      const S = JG.music.SONGS[name], spb = 60 / S.bpm / 4, bars = S.bars, dur = bars * 16 * spb + 2.5, sr = 32000;
      const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      const nb = oc.createBuffer(1, sr, sr), d = nb.getChannelData(0);
      for (let i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1;
      // the same chain the game uses: music gain 0.8 -> master 0.7 -> limiter
      const master = oc.createGain(); master.gain.value = 0.7;
      const lim = oc.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 10; lim.ratio.value = 6; lim.attack.value = 0.004; lim.release.value = 0.18;
      const mus = oc.createGain(); mus.gain.value = 0.8; mus.connect(master); master.connect(lim); lim.connect(oc.destination);
      JG.music.init(oc, mus, nb);
      for (let st = 0; st < bars * 16; st++) { const s = st % 16; S.play(S, Math.floor(st / 16), s, 0.1 + st * spb + (s % 2 ? S.swing * spb : 0), spb); }
      const t0 = performance.now();
      const buf = await oc.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, sum = 0, clip = 0; const secs = [];
      for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > peak) peak = v; if (v > 0.99) clip++; sum += L[i] * L[i]; const k = Math.floor(i / sr / 4); secs[k] = (secs[k] || 0) + L[i] * L[i]; }
      // rough brightness: share of energy above ~2 kHz, by first difference
      let hi = 0; for (let i = 1; i < L.length; i++) { const dd = L[i] - L[i - 1]; hi += dd * dd; }
      const n = Math.min(L.length, sr * 20), pcm = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) { pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
      return { dur: +dur.toFixed(1), renderMs: Math.round(performance.now() - t0), peak: +peak.toFixed(3), rms: +Math.sqrt(sum / L.length).toFixed(3), clip, bright: +(hi / sum).toFixed(3), per4s: secs.map((x) => +Math.sqrt(x / sr / 4).toFixed(3)), pcm: Array.from(new Uint8Array(pcm.buffer)), sr };
    }, name);
    const pcm = Buffer.from(r.pcm), h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(r.sr, 24); h.writeUInt32LE(r.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(__dirname + '/out/' + name + '.wav', Buffer.concat([h, pcm]));
    delete r.pcm;
    console.log(name.padEnd(8), JSON.stringify(r));
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
