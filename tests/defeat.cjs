const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto(URL0); await p.waitForTimeout(800);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg'); G.selected = j.id; });
  await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const G = JG.game; document.querySelector('#modal').hidden = true; JG.debug.startBattle('goblin', 'fight'); G.B.foe.hp = 1; });
  await p.waitForTimeout(900);
  const i = await p.evaluate(() => JG.game.B.hand.findIndex(c => JG.CARDS[c.id].fx.dmg));
  await p.click(`#hand .card[data-i="${i}"]`, { position: { x: 12, y: 80 } });
  for (let k = 0; k < 6; k++) { await p.waitForTimeout(220); await p.screenshot({ path: __dirname + `/out/win-${k}.png`, clip: { x: 500, y: 60, width: 866, height: 520 } }); }
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
