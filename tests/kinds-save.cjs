// Parts through the game: migration of an old save, duet inheritance, eggs from runs, names.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto(URL0); await p.waitForTimeout(700);
  // an old save, from before the three kinds
  await p.evaluate(() => {
    const st = { juggle: { lv: 5, xp: 0 }, tumble: { lv: 4, xp: 0 }, glow: { lv: 3, xp: 0 }, grit: { lv: 6, xp: 0 } };
    localStorage.setItem('jinxgarden.v1', JSON.stringify({ v: 1, tix: 200, inv: { moonpie: 1, balloon: 2 }, sky: [], records: { runs: 4, wins: 0, bestAct: 1, hatched: 2 },
      jinxes: [{ id: 'a', name: 'Old Pal', stage: 'adult', hue: 40, seed: 1, align: 0.6, stats: st, belly: 80, mood: 70, love: 60, age: 5, gen: 1, u: 0, v: 0.2, trait: 'glutton', hat: 'cone' },
               { id: 'b', name: 'Older Pal', stage: 'adult', hue: 200, seed: 2, align: -0.6, stats: JSON.parse(JSON.stringify(st)), belly: 80, mood: 70, love: 60, age: 6, gen: 1, u: 0.3, v: 0.2, trait: 'hothead' },
               { id: 'e', stage: 'egg', hatch: 20, hatchMax: 40, hue: 100, seed: 3, u: -0.3, v: 0.3 }] }));
  });
  await p.reload(); await p.waitForTimeout(700);
  await p.click('#titleBtns [data-act=continue]'); await p.waitForTimeout(600);
  console.log('migrated', JSON.stringify(await p.evaluate(() => JG.game.save.jinxes.map(j => j.stage === 'egg' ? 'egg:' + JSON.stringify(j.parts || null) : j.name + ':' + JG.debug.kindName(j) + ':' + j.hat))));
  // make one a Lantern, then sing duets and look at the eggs
  const kids = await p.evaluate(async () => {
    const G = JG.game, s = G.save, a = s.jinxes[0], b2 = s.jinxes[1], out = [];
    Object.assign(b2, JG.draw.KINDS.Lantern);
    s.jinxes = s.jinxes.filter(j => j.stage !== 'egg');
    for (let k = 0; k < 4; k++) {
      s.inv.balloon = 1; a.duetAge = -9; b2.duetAge = -9;
      JG.debug.startDuet(a, b2);
      for (let i = 0; i < 400 && G.duet; i++) await new Promise(r => setTimeout(r, 50));
      const e = s.jinxes[s.jinxes.length - 1];
      JG.debug.hatchEgg(e);
      const j = s.jinxes[s.jinxes.length - 1];
      out.push(JG.debug.kindName(j) + ' [' + j.head + ',' + j.piece + ',' + j.body + ']');
    }
    return out;
  });
  console.log('duet children', kids.join(' | '));
  await p.screenshot({ path: __dirname + '/out/kinds-duet.png' });
  console.log('toast:', await p.evaluate(() => document.querySelector('#toast').textContent));
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
