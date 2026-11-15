const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
const OUT = __dirname + '/out/';
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function run(vp, tag, plan) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message + '\n' + e.stack));
    p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
    await p.goto(URL0);
    await p.waitForTimeout(1200);
    await p.click('#titleBtns [data-act=new]');
    await p.waitForTimeout(300);
    await p.evaluate(() => { const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg'); for (const s of JG.STATS) j.stats[s].lv = 14; j.stage = 'adult'; G.selected = j.id; });
    await p.click('#hud [data-act=bigtop]');
    await p.click('#modal [data-act=go]');
    await p.waitForTimeout(300);
    for (const step of plan) {
      await p.evaluate(({ act, foe, kind, align, moon, st }) => {
        const G = JG.game; G.run.act = act; G.run.hp = G.run.maxHp;
        Object.assign(G.save.jinxes.find(j => j.id === G.run.jid), { align, moon: moon || 0 });
        document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, kind); G.B.foe.hp = G.B.foe.maxHp = 600;
        Object.assign(G.B.p.st, st.p || {}); Object.assign(G.B.foe.st, st.f || {}); G.B.p.block = st.block || 0; G.B.res = st.res || 0; G.B.applause = st.ap || 0;
      }, step);
      await p.waitForTimeout(900);
      await p.screenshot({ path: OUT + `${tag}-act${step.act}-${step.foe}-idle.png` });
      // play the first affordable attack and catch it mid-flight and at impact
      const i = await p.evaluate(() => JG.game.B.hand.findIndex(c => JG.CARDS[c.id].fx.dmg));
      if (process.env.DBG) console.log(JSON.stringify(await p.evaluate((i) => { const c = document.querySelector(`#hand .card[data-i="${i}"]`), r = c.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 12, r.top + 80); return { i, rect: [r.left, r.top, r.width, r.height], hit: e && (e.id || e.className || e.tagName), sy: scrollY, app: document.querySelector('#app').scrollTop, bodyTop: document.body.getBoundingClientRect().top }; }, i)));
      if (i >= 0) {
        await p.click(`#hand .card[data-i="${i}"]`, { position: { x: 12, y: 80 } });
        await p.waitForTimeout(170);
        await p.screenshot({ path: OUT + `${tag}-act${step.act}-${step.foe}-fly.png` });
        await p.waitForTimeout(230);
        await p.screenshot({ path: OUT + `${tag}-act${step.act}-${step.foe}-hit.png` });
      }
      await p.waitForTimeout(700);
      if (step.show) {
        await p.evaluate(() => { JG.game.B.applause = 100; });
        await p.keyboard.press('s');
        await p.waitForTimeout(600);
        await p.screenshot({ path: OUT + `${tag}-act${step.act}-show1.png` });
        await p.waitForTimeout(500);
        await p.screenshot({ path: OUT + `${tag}-act${step.act}-show2.png` });
        await p.waitForTimeout(300);
        await p.screenshot({ path: OUT + `${tag}-act${step.act}-show3.png` });
        await p.waitForTimeout(900);
      }
      if (step.foeTurn) {
        await p.evaluate(() => document.querySelector('#endTurn').click());
        for (let k = 0; k < 4; k++) { await p.waitForTimeout(330); await p.screenshot({ path: OUT + `${tag}-act${step.act}-foe${k}.png` }); }
        await p.waitForTimeout(1200);
      }
    }
    await p.close();
  }
  const plan = process.env.PLAN ? JSON.parse(process.env.PLAN) : [
    { act: 1, foe: 'mime', kind: 'fight', align: 0, moon: 0.8, st: { ap: 80 }, show: true, foeTurn: true },
    { act: 1, foe: 'strongman', kind: 'elite', align: 0, moon: 0.8, st: { ap: 10 }, foeTurn: true },
    { act: 2, foe: 'seal', kind: 'fight', align: 0, moon: -0.5, st: { ap: 20 }, foeTurn: true }
  ];
  await run({ width: 1366, height: 768 }, 'd', plan);
  await run({ width: 400, height: 860 }, 'm', [plan[0]]);
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
