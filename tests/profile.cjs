// Where does the frame time go? CPU profiles of the garden and of fights, at laptop and phone sizes.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  async function run(vp, dpr, tag) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0); await p.waitForTimeout(700);
    await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(400);
    // a full garden: six Jinxes of mixed kinds, every toy
    await p.evaluate(() => {
      const G = JG.game, s = G.save, K = JG.draw.KINDS;
      s.jinxes = s.jinxes.filter(j => j.stage !== 'egg');
      const mk = (name, parts, align, moon) => { const j = JG.debug.makeJinx({ name, parts, align, moon }); j.stage = 'adult'; return j; };
      s.jinxes.push(mk('A', K.Hollow, 0.8, 0), mk('B', K.Lantern, -0.8, 0), mk('C', { head: 'disc', piece: 'hood', body: 'wisp' }, 0, 0.8), mk('D', K.Umbra, 0, -0.5), mk('E', K.Lantern, 0.8, 0));
      s.toys = { pins: true, tramp: true, crystal: true, bag: true };
    });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    const prof = async (label, ms) => {
      const f0 = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 2500) r(2500 / n); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
      await cdp.send('Profiler.start');
      await p.waitForTimeout(ms);
      const { profile } = await cdp.send('Profiler.stop');
      const self = {}, total = (profile.endTime - profile.startTime) / 1000;
      const dt = profile.timeDeltas, byId = {};
      profile.nodes.forEach(n => (byId[n.id] = n));
      profile.samples.forEach((id, i) => { const n = byId[id], k = n.callFrame.functionName || '(anon ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber + ')'; self[k] = (self[k] || 0) + (dt[i] || 0) / 1000; });
      const top = Object.entries(self).sort((a, b2) => b2[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${(v / total * 100).toFixed(1)}%`);
      console.log(`\n== ${tag} ${label}: ${f0.toFixed(1)} ms/frame\n   ` + top.join(' | '));
    };
    await p.waitForTimeout(800);
    await prof('garden, 6 Jinxes', 3000);
    await p.evaluate(() => { const G = JG.game; G.selected = G.save.jinxes[0].id; });
    await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(400);
    for (const [act, foe, kind] of [[1, 'mime', 'fight'], [2, 'seal', 'fight'], [3, 'mother', 'boss']]) {
      await p.evaluate(({ act, foe, kind }) => { const G = JG.game; G.run.act = act; document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, kind); }, { act, foe, kind });
      await p.waitForTimeout(1200);
      await prof(`fight, act ${act} ${foe}`, 3000);
    }
    // how many off-screen canvases have piled up
    console.log('   canvases in memory guess:', await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB JS heap' : 'n/a')));
    console.log(errs.join('\n') || '   no errors');
    await ctx.close();
  }
  await run({ width: 1366, height: 768 }, 1, 'laptop');
  await run({ width: 400, height: 860 }, 2, 'phone x2');
  await b.close();
})();
