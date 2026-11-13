// The part abilities in a fight, one kind at a time.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
const OUT = __dirname + '/out/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await p.goto(URL0); await p.waitForTimeout(700);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg'); for (const s of JG.STATS) j.stats[s].lv = 10; j.stage = 'adult'; G.selected = j.id; });
  await p.waitForTimeout(2300);
  await p.screenshot({ path: OUT + 'parts-panel.png' });
  await p.click('#hud [data-act=bigtop]'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + 'parts-confirm.png' });
  await p.click('#modal [data-act=go]'); await p.waitForTimeout(300);
  for (const kind of ['Umbra', 'Hollow', 'Lantern']) {
    const log = await p.evaluate(async (kind) => {
      const G = JG.game, j = G.save.jinxes.find(j => j.id === G.run.jid), out = [];
      Object.assign(j, JG.draw.KINDS[kind]);
      G.run.hp = G.run.maxHp = 200; G.run.act = 1;
      document.querySelector('#modal').hidden = true;
      JG.debug.startBattle('mime', 'fight');
      const B = G.B; B.foe.hp = B.foe.maxHp = 900;
      out.push(`start: applause ${B.applause}, block ${B.p.block}, hand ${B.hand.length}, moon ${B.moon}`);
      for (let t = 0; t < 5; t++) {
        const before = { hp: G.run.hp, fhp: B.foe.hp, ap: B.applause };
        const i = B.hand.findIndex(c => JG.CARDS[c.id].type === 'atk' && JG.CARDS[c.id].cost <= B.p.energy);
        const shown = i >= 0 ? JG.debug.dmgValue(JG.CARDS[B.hand[i].id].fx.dmg, B, 'atk') : null;
        const intent = JSON.stringify(B.foe.intent), counter = B.foe.st.counter || 0;
        if (i >= 0) await JG.debug.playCard(i);
        const afterCard = { hp: G.run.hp, fhp: B.foe.hp };
        await JG.debug.endTurn();
        for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
        out.push(`turn ${t + 1}: card dmg ${shown} (foe ${before.fhp}->${afterCard.fhp}, me ${before.hp}->${afterCard.hp}, counter ${counter}) | foe ${intent} | after foe: me ${G.run.hp}, foe ${B.foe.hp}, applause ${before.ap}->${Math.round(B.applause)}, block ${B.p.block}, hand ${B.hand.length}, moon ${B.moon}${B.fullMoon ? ' FULL' : ''}`);
      }
      return out;
    }, kind);
    console.log('== ' + kind + '\n' + log.join('\n'));
    await p.screenshot({ path: OUT + 'parts-' + kind + '.png' });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
