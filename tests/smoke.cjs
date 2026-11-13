const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
const OUT = __dirname + '/out/';
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function run(vp, tag) {
    const p = await b.newPage({ viewport: vp });
    p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
    await p.goto(URL0);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + tag + '-1title.png' });
    await p.click('#titleBtns [data-act=new]');
    await p.waitForTimeout(800);
    // click on first jinx
    const pos = await p.evaluate(() => { const h = JG.game.hits.find(h => h.kind === 'jinx' && h.j.stage !== 'egg'); return [h.x, h.y]; });
    await p.mouse.click(pos[0], pos[1]);
    await p.waitForTimeout(400);
    await p.click('#panel [data-act=feed]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + tag + '-2garden.png' });
    await p.click('#panel [data-act=run]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + tag + '-3confirm.png' });
    await p.click('#modal [data-act=go]');
    await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + tag + '-4map.png' });
    await p.click('.node.can');
    await p.waitForTimeout(900);
    await p.screenshot({ path: OUT + tag + '-5battle.png' });
    // play the battle out by clicking cards
    for (let k = 0; k < 60; k++) {
      const st = await p.evaluate(() => { const B = JG.game.B; return B ? { over: B.over, busy: B.busy, e: B.p.energy, hand: B.hand.map(c => JG.CARDS[c.id].cost) } : null; });
      if (!st || st.over) break;
      if (st.busy) { await p.waitForTimeout(200); continue; }
      const i = st.hand.findIndex(c => c <= st.e);
      if (i >= 0) await p.click(`#hand .card[data-i="${i}"]`, { position: { x: 12, y: 80 } }); else await p.click('#endTurn');
      await p.waitForTimeout(250);
      if (k === 3) await p.screenshot({ path: OUT + tag + '-6mid.png' });
    }
    await p.waitForTimeout(1800);
    await p.screenshot({ path: OUT + tag + '-7after.png' });
    await p.close();
  }
  await run({ width: 1366, height: 768 }, 'desk');
  await run({ width: 400, height: 860 }, 'phone');
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
