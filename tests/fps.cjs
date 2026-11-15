const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: process.env.PHONE ? { width: 400, height: 860 } : { width: 1366, height: 768 }, deviceScaleFactor: process.env.PHONE ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.waitForTimeout(800);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(300);
  const fps = async () => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 3000) r(Math.round(n / 3)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  console.log('garden fps', await fps());
  await p.evaluate(() => { const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg'); G.selected = j.id; });
  await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(300);
  for (const [act, foe] of [[1, 'mime'], [2, 'seal'], [3, 'mother']]) {
    await p.evaluate(({ act, foe }) => { const G = JG.game; G.run.act = act; document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, 'fight'); }, { act, foe });
    await p.waitForTimeout(1200);
    console.log('act', act, 'fps', await fps());
  }
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
