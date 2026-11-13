// Close-ups of foes, a few per image, to check that parts line up.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1800, height: 800 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  await p.goto(URL0);
  await p.waitForTimeout(900);
  const ids = await p.evaluate(() => Object.keys(JG.FOES));
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const list = only || ids;
  const per = 6;
  for (let page = 0; page * per < list.length; page++) {
    const chunk = list.slice(page * per, page * per + per);
    await p.evaluate(({ chunk, t }) => {
      document.querySelector('#title').hidden = true;
      document.querySelector('#grain').hidden = true;
      const G = JG.game, D = JG.draw;
      G.mode = 'sheet';
      const ctx = document.querySelector('#scene').getContext('2d');
      ctx.fillStyle = '#3a3350'; ctx.fillRect(0, 0, 1800, 800);
      chunk.forEach((id, i) => {
        const def = JG.FOES[id], f = { def, charge: false, hp: 5, maxHp: 10 };
        const sc = Math.min(2.4, 2.2 / def.size);
        D.drawFoe(f, 150 + i * 300, 720, t, { scale: sc });
        ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(def.name, 150 + i * 300, 790); ctx.textAlign = 'left';
      });
    }, { chunk, t: +(process.argv[3] || 3.3) });
    await p.screenshot({ path: __dirname + `/out/big-${page}.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
