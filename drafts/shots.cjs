// Each foe in the game three ways: as it is, repainted darker, and redrawn.
const URL0 = process.env.JINX_URL || 'http://localhost:8766/index.html';
const { chromium } = require('playwright');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await p.goto(URL0); await p.waitForTimeout(900);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg'); G.selected = j.id; });
  await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(400);
  await p.addStyleTag({ content: '#battle, #runbar, #btnQuit, #toast { visibility: hidden !important; }' });
  const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : null, modes = (process.argv[3] || 'now,night,redo').split(',');
  const foes = [];
  const acts = await p.evaluate(() => JG.ACTS.map(a => ({ foes: a.foes, elite: a.elite, boss: a.boss })));
  acts.forEach((a, i) => { for (const f of a.foes) foes.push([i + 1, f, 'fight']); for (const f of a.elite) foes.push([i + 1, f, 'elite']); foes.push([i + 1, a.boss, 'boss']); });
  for (const [act, foe, kind] of foes) {
    if (only && !only.includes(foe)) continue;
    for (const mode of modes) {
      await p.evaluate(({ mode, act, foe, kind }) => { const G = JG.game; JG.draw.foeArt = mode; G.run.act = act; G.run.hp = G.run.maxHp; document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, kind); }, { mode, act, foe, kind });
      await p.waitForTimeout(1000);
      await p.screenshot({ path: __dirname + `/out/foe-${foe}-${mode}.png`, clip: { x: 630, y: 60, width: 600, height: 520 } });
    }
  }
  console.log(foes.map(f => f[1]).join(','));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await b.close();
})();
