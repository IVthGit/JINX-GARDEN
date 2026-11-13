// What the garden's frame is made of: count the canvas copies, and time it with pieces switched off.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL0); await p.waitForTimeout(700);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const G = JG.game, s = G.save, K = JG.draw.KINDS;
    s.jinxes = s.jinxes.filter(j => j.stage !== 'egg');
    const mk = (name, parts, align, moon) => { const j = JG.debug.makeJinx({ name, parts, align, moon }); j.stage = 'adult'; return j; };
    s.jinxes.push(mk('A', K.Hollow, 0.8, 0), mk('B', K.Lantern, -0.8, 0), mk('C', { head: 'disc', piece: 'hood', body: 'wisp' }, 0, 0.8), mk('D', K.Umbra, 0, -0.5), mk('E', K.Lantern, 0.8, 0));
    s.toys = { pins: true, tramp: true, crystal: true, bag: true };
    // count copies between canvases, and how many pixels they move
    const pr = CanvasRenderingContext2D.prototype, di = pr.drawImage;
    window.__c = { n: 0, px: 0, frames: 0, grads: 0, paths: 0 };
    pr.drawImage = function (src) { __c.n++; __c.px += (src.width || 0) * (src.height || 0); return di.apply(this, arguments); };
    for (const k of ['createLinearGradient', 'createRadialGradient']) { const f = pr[k]; pr[k] = function () { __c.grads++; return f.apply(this, arguments); }; }
    const P0 = window.Path2D; window.Path2D = function (a) { __c.paths++; return a === undefined ? new P0() : new P0(a); }; window.Path2D.prototype = P0.prototype;
    const raf = () => { __c.frames++; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  });
  const ms = async () => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 2500) r((2500 / n).toFixed(1)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  await p.waitForTimeout(600);
  await p.evaluate(() => { Object.assign(__c, { n: 0, px: 0, frames: 0, grads: 0, paths: 0 }); });
  console.log('garden, 6 Jinxes, as is:', await ms(), 'ms/frame');
  console.log('  per frame:', JSON.stringify(await p.evaluate(() => ({ copies: Math.round(__c.n / __c.frames), megapixelsCopied: +(__c.px / __c.frames / 1e6).toFixed(1), gradients: Math.round(__c.grads / __c.frames), paths: Math.round(__c.paths / __c.frames) }))));
  await p.evaluate(() => { JG.draw.paper.on = false; const g = JG.draw.garden; JG.draw.garden = function (t, dt, G) { JG.draw.paper.on = false; const save = Object.getOwnPropertyDescriptor(JG.draw.paper, 'on'); return g.call(this, t, dt, G); }; });
  await p.close();
  // battle counts
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }); const p2 = await ctx2.newPage();
  await p2.goto(URL0); await p2.waitForTimeout(700);
  await p2.click('#titleBtns [data-act=new]'); await p2.waitForTimeout(400);
  await p2.evaluate(() => { const G = JG.game; G.selected = G.save.jinxes[0].id; });
  await p2.click('#hud [data-act=bigtop]'); await p2.click('#modal [data-act=go]'); await p2.waitForTimeout(400);
  await p2.evaluate(() => {
    const pr = CanvasRenderingContext2D.prototype, di = pr.drawImage;
    window.__c = { n: 0, px: 0, frames: 0 };
    pr.drawImage = function (src) { __c.n++; __c.px += (src.width || 0) * (src.height || 0); return di.apply(this, arguments); };
    const raf = () => { __c.frames++; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  });
  for (const [act, foe, kind] of [[1, 'mime', 'fight'], [2, 'seal', 'fight'], [3, 'mother', 'boss']]) {
    await p2.evaluate(({ act, foe, kind }) => { const G = JG.game; G.run.act = act; document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, kind); }, { act, foe, kind });
    await p2.waitForTimeout(1200);
    await p2.evaluate(() => { Object.assign(__c, { n: 0, px: 0, frames: 0 }); });
    await p2.waitForTimeout(2500);
    console.log(`fight act ${act} ${foe}: per frame`, JSON.stringify(await p2.evaluate(() => ({ copies: Math.round(__c.n / __c.frames), megapixelsCopied: +(__c.px / __c.frames / 1e6).toFixed(1) }))));
  }
  await b.close();
})();
