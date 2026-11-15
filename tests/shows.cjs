// Hats, the talent show and duets.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
const OUT = __dirname + '/out/';
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function run(vp, tag) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message + '\n' + e.stack));
    p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
    await p.goto(URL0);
    await p.waitForTimeout(900);
    await p.click('#titleBtns [data-act=new]');
    await p.waitForTimeout(500);
    // a garden with three grown Jinxes, every hat, and a balloon
    await p.evaluate(() => {
      const G = JG.game, s = G.save, a = s.jinxes.find(j => j.stage !== 'egg');
      const mk = (name, hue, align, moon, hat, u) => Object.assign(JSON.parse(JSON.stringify(a)), { id: name, name, hue, align, moon, hat, u, v: 0.3, stage: 'adult', love: 60, age: 4 });
      Object.assign(a, { stage: 'adult', love: 70, age: 4, u: -0.5, v: 0.3, mood: 85 });
      for (const st of JG.STATS) a.stats[st].lv = 9;
      s.jinxes.push(mk('Static', 160, -0.7, 0, 'bucket', -0.2), mk('Halley', 260, 0.7, 0, 'crown', 0.1), mk('Tinsel', 210, 0, 0.8, 'bow', 0.4));
      for (const id in JG.HATS) JG.debug.grantHat(id);
      s.inv.balloon = 1; s.tix = 500;
      G.selected = a.id;
    });
    await p.click('#hud [data-act=sky]'); await p.click('#modal [data-act=close]');
    await p.evaluate(() => { const j = JG.game.save.jinxes[0]; JG.game.selected = j.id; });
    await p.waitForTimeout(2300);
    await p.click('#panel [data-act=hats]');
    await p.waitForTimeout(200);
    await p.screenshot({ path: OUT + tag + '-g3-hats.png' });
    await p.click('#panel [data-act=wear][data-hat=cone]');
    console.log(tag, 'hat', await p.evaluate(() => JG.game.save.jinxes[0].hat));
    // shop
    await p.click('#panel [data-act=close]');
    await p.click('#hud [data-act=shop]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + tag + '-g3-shop.png' });
    await p.click('#modal [data-act=hat][data-id=pot]');
    await p.click('#modal [data-act=close]');
    // talent show
    await p.evaluate(() => { JG.game.selected = JG.game.save.jinxes[0].id; });
    await p.click('#hud [data-act=talent]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + tag + '-g3-talent0.png' });
    await p.click('#modal [data-act=enter][data-id=revue]');
    let shot = 0;
    for (let k = 0; k < 900; k++) {
      await p.waitForTimeout(100);
      const st = await p.evaluate(() => { const T = JG.game.talent; return { modal: !document.querySelector('#modal').hidden, meter: T && T.meter ? T.meter.pos : null, acting: T ? T.acting : -1, stat: T && T.stat }; });
      if (st.modal) break;
      if (k === 30 || k === 45) await p.screenshot({ path: OUT + tag + `-g3-talent-rival${k}.png` });
      if (st.meter !== null && shot < 3) { await p.screenshot({ path: OUT + tag + `-g3-talent-me${shot++}.png` }); await p.evaluate(() => { const iv = setInterval(() => { const T = JG.game.talent, m = T && T.meter; if (!m) { clearInterval(iv); return; } if (Math.abs(m.pos - 0.5) < 0.06) document.querySelector('#cheerBtn').click(); }, 8); }); }
    }
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + tag + '-g3-talent-result.png' });
    console.log(tag, 'talent', await p.evaluate(() => document.querySelector('#modalBody h2').textContent + ' | ' + [...document.querySelectorAll('#modalBody .loot li')].map(l => l.textContent).join(' / ')));
    await p.click('#modal [data-act=home]');
    await p.waitForTimeout(300);
    // can't enter twice
    await p.click('#hud [data-act=talent]');
    console.log(tag, 'again disabled', await p.evaluate(() => [...document.querySelectorAll('#modal [data-act=enter]')].every(b => b.disabled)));
    await p.click('#modal [data-act=close]');
    // duet
    await p.click('#panel [data-act=duet]');
    await p.waitForTimeout(200);
    await p.screenshot({ path: OUT + tag + '-g3-duet0.png' });
    await p.click('#modal [data-act=sing][data-id=Halley]');
    const n0 = await p.evaluate(() => JG.game.save.jinxes.length);
    for (let k = 0; k < 150; k++) {
      await p.waitForTimeout(100);
      const ph = await p.evaluate(() => JG.game.duet && JG.game.duet.phase + ':' + JG.game.duet.t.toFixed(1));
      if (ph && ph.startsWith('sing:1.8')) await p.screenshot({ path: OUT + tag + '-g3-duet1.png' });
      if (!ph) break;
    }
    await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + tag + '-g3-duet2.png' });
    console.log(tag, 'duet', await p.evaluate((n0) => { const s = JG.game.save, e = s.jinxes[s.jinxes.length - 1]; return { grew: s.jinxes.length - n0, egg: e.stage, inherit: e.inherit, balloons: s.inv.balloon }; }, n0));
    // hatch it
    await p.evaluate(() => { const s = JG.game.save, e = s.jinxes[s.jinxes.length - 1]; JG.debug.hatchEgg(e); });
    await p.waitForTimeout(400);
    console.log(tag, 'hatched', await p.evaluate(() => { const s = JG.game.save, j = s.jinxes[s.jinxes.length - 1]; return { name: j.name, gen: j.gen, grades: j.grades, hat: j.hat, trait: j.trait, toast: document.querySelector('#toast').textContent }; }));
    await p.close();
  }
  await run({ width: 1366, height: 768 }, 'd');
  await run({ width: 400, height: 860 }, 'm');
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
