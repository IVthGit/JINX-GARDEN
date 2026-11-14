// Takes the pictures for the props-and-understudy draft sheet (stage-extras.html).
// Plays the real game with stage-extras.js added on top. Run from the top folder:
//   node drafts/stage-extras-shots.cjs
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'tests/node_modules/playwright'));
const { pathToFileURL } = require('url');
const OUT = path.join(__dirname, 'stage-extras');
const SETS = ['sticks', 'rigging', 'shadows'], PROPS = ['plant', 'amp', 'net', 'cannon'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const errs = [];
  const open = async (vp, scale) => {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale || 1 });
    p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
    await p.goto(pathToFileURL(path.join(ROOT, 'index.html')).href); await p.waitForTimeout(900);
    await p.addScriptTag({ path: path.join(__dirname, 'stage-extras.js') });
    await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(500);
    await p.evaluate(() => {
      const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg');
      const u = JG.debug.makeJinx({ name: 'Wings', parts: JG.draw.KINDS.Lantern }); u.love = 55; u.stats.glow.lv = 12;
      G.save.jinxes.push(u); G.selected = j.id;
    });
    await p.click('#hud [data-act=bigtop]'); await p.waitForTimeout(400);
    await p.click('#modal [data-act=go]'); await p.waitForTimeout(500);
    return p;
  };
  const fight = (p, act, foe, kind) => p.evaluate(([act, foe, kind]) => {
    const G = JG.game; G.run.act = act; document.querySelector('#modal').hidden = true; JG.debug.startBattle(foe, kind); G.B.req = null;
  }, [act, foe, kind]);
  const look = (p, set, prop, aim) => p.evaluate(([set, prop, aim]) => {
    const E = JG.draw.extras, B = JG.game.B; E.set = set; E.prop = prop;
    if (!B.prop) B.prop = { id: prop, def: JG.PROPS[prop], hp: 9, maxHp: 9, fuse: 3 };
    B.target = aim ? 'prop' : 'foe';
  }, [set, prop, aim]);
  const bare = (p, on) => p.evaluate((on) => {
    let s = document.querySelector('#bareStage');
    if (!s) { s = document.createElement('style'); s.id = 'bareStage'; document.body.appendChild(s); }
    s.textContent = on ? '#app > *:not(canvas):not(#grain) { visibility: hidden !important; }' : '';
  }, on);

  // laptop: each look whole, with the real buttons on top, then close-ups with them hidden
  const p = await open({ width: 1366, height: 768 });
  await fight(p, 1, 'strongman', 'elite');
  const g = await p.evaluate(() => Object.assign(JG.draw.size(), JG.draw.stagePos()));
  for (const set of SETS) {
    await look(p, set, 'cannon', false); await bare(p, false); await p.waitForTimeout(1300);
    await p.screenshot({ path: path.join(OUT, `whole-${set}.png`) });
    await bare(p, true);
    await p.screenshot({ path: path.join(OUT, `under-${set}.png`), clip: { x: Math.max(0, g.px - 300 * g.U), y: 60, width: 400 * g.U, height: g.feet + 40 * g.U - 60 } });
    for (const prop of PROPS) {
      await look(p, set, prop, prop === 'amp'); await p.waitForTimeout(700);
      await p.screenshot({ path: path.join(OUT, `prop-${set}-${prop}.png`), clip: { x: g.fx + 168 * g.U - 120 * g.U, y: g.feet - 300 * g.U, width: 240 * g.U, height: 340 * g.U } });
    }
  }
  // Act III is under blacklight: the cut edges glow
  await bare(p, true);
  await fight(p, 3, 'mother', 'boss');
  for (const set of SETS) {
    await look(p, set, 'net', false); await p.waitForTimeout(1300);
    await p.screenshot({ path: path.join(OUT, `act3-${set}.png`), clip: { x: 0, y: 60, width: 1366, height: g.feet + 60 * g.U - 60 } });
  }
  await p.close();
  // phone
  const q = await open({ width: 400, height: 860 }, 2);
  await fight(q, 1, 'strongman', 'elite');
  for (const set of SETS) {
    await look(q, set, 'cannon', false); await q.waitForTimeout(1300);
    await q.screenshot({ path: path.join(OUT, `phone-${set}.png`) });
  }
  await q.close();
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
