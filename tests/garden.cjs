const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [vp, tag] of [[{ width: 1366, height: 768 }, 'd'], [{ width: 400, height: 860 }, 'm']]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    p.on('pageerror', e => errs.push(tag + ' PAGEERR ' + e.message + '\n' + e.stack));
    p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' CONSOLE ' + m.text()); });
    await p.goto(URL0);
    await p.waitForTimeout(1300);
    await p.screenshot({ path: __dirname + `/out/g2-${tag}-title.png` });
    await p.click('#titleBtns [data-act=new]');
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const G = JG.game, base = G.save.jinxes.find(j => j.stage !== 'egg');
      const mk = (name, hue, align, moon, best) => { const j = JSON.parse(JSON.stringify(base)); Object.assign(j, { id: name, name, hue, align, moon, stage: 'adult', seed: Math.random() * 9, u: Math.random() - 0.5, v: Math.random() * 0.5 - 0.1, idle: 0.2, belly: 40 }); j.stats[best].lv = 20; return j; };
      G.save.jinxes.push(mk('Static', 120, -0.8, 0, 'grit'), mk('Halley', 250, 0.8, 0, 'glow'), mk('Tinsel', 30, 0, 0.8, 'tumble'));
      G.save.toys = { pins: true, tramp: true, crystal: true, bag: true };
      G.save.tix = 300;
      G.save.tree.fruits = [{ item: 'plum', grow: 1, slot: 0 }, { item: 'comet', grow: 1, slot: 1 }, { item: 'moonpie', grow: 0.4, slot: 2 }];
    });
    // shake the tree
    const tree = await p.evaluate(() => { const h = JG.game.hits.find(h => h.kind === 'tree'); return [h.x, h.y]; });
    await p.mouse.click(tree[0], tree[1]);
    await p.waitForTimeout(500);
    // carry a Jinx to the trampoline
    const from = await p.evaluate(() => { const h = JG.game.hits.find(h => h.kind === 'jinx' && h.j.name === 'Tinsel'); return [h.x, h.y]; });
    const to = await p.evaluate(() => JG.draw.toScreen(JG.TOYS.tramp.u, JG.TOYS.tramp.v));
    await p.mouse.move(from[0], from[1]); await p.mouse.down();
    await p.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 40, { steps: 6 });
    await p.waitForTimeout(200);
    await p.screenshot({ path: __dirname + `/out/g2-${tag}-carry.png` });
    await p.mouse.move(to[0], to[1] - 30, { steps: 6 }); await p.mouse.up();
    await p.waitForTimeout(1200);
    // drag a snack onto a Jinx
    const food = await p.evaluate(() => { const h = JG.game.hits.find(h => h.kind === 'item'); const j = JG.game.hits.find(h => h.kind === 'jinx' && h.j.name === 'Static'); return h && j ? [h.x, h.y, j.x, j.y] : null; });
    if (food) { await p.mouse.move(food[0], food[1]); await p.mouse.down(); await p.mouse.move(food[2], food[3], { steps: 8 }); await p.mouse.up(); }
    await p.waitForTimeout(600);
    const seen = new Set();
    for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); (await p.evaluate(() => JG.game.save.jinxes.filter(j => j.act).map(j => j.act.kind))).forEach(a => seen.add(a)); if (i === 14) await p.screenshot({ path: __dirname + `/out/g2-${tag}-garden.png` }); }
    console.log(tag, 'activities:', [...seen].join(', '), '| ground', await p.evaluate(() => JG.game.save.ground.length), '| tinsel act', await p.evaluate(() => JSON.stringify(JG.game.save.jinxes.map(j => [j.name, Math.round(j.belly || 0)]))));
    // select a Jinx, open college, whistle
    const tp = await p.evaluate(() => { const h = JG.game.hits.find(h => h.kind === 'jinx' && h.j.name === 'Tinsel'); return [h.x, h.y]; });
    await p.mouse.click(tp[0], tp[1]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: __dirname + `/out/g2-${tag}-panel.png` });
    await p.click('#hud [data-act=college]');
    await p.waitForTimeout(400);
    await p.screenshot({ path: __dirname + `/out/g2-${tag}-college.png` });
    await p.click('#modal [data-act=learn]:not([disabled])');
    await p.waitForTimeout(300);
    await p.click('#hud [data-act=whistle]');
    await p.waitForTimeout(300);
    console.log(tag, 'learned', await p.evaluate(() => JSON.stringify(JG.game.save.jinxes.find(j => j.name === 'Tinsel').learned)));
    await p.close();
  }
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
