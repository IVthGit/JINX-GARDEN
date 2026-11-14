// Fight and run rules that have gone wrong before, each set up by hand and checked against a number.
// Unlike most checks this one fails (exit code 1) when a rule is broken.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await p.goto(URL0); await p.waitForTimeout(700);
  await p.click('#titleBtns [data-act=new]'); await p.waitForTimeout(400);
  // a plain Jinx: no dodging, no part abilities, no improvising, so every number is exact
  await p.evaluate(() => {
    const G = JG.game, j = G.save.jinxes.find(j => j.stage !== 'egg');
    for (const s of JG.STATS) { j.stats[s].lv = 0; j.stats[s].xp = 0; }
    j.love = 0; j.mood = 100; j.align = 0; G.selected = j.id; JG.TUNE.noParts = true; JG.fast = true;
  });
  await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(300);
  const out = await p.evaluate(async () => {
    const G = JG.game, d = JG.debug, res = [];
    const say = (ok, text) => res.push((ok ? 'ok    ' : 'WRONG ') + text);
    const fight = (moves) => {
      G.run.hp = G.run.maxHp = 200; G.run.act = 1; document.querySelector('#modal').hidden = true;
      d.startBattle('mime', 'fight');
      const B = G.B; B.foe.hp = B.foe.maxHp = 900; B.wild = null;
      if (moves) { B.foe.def = Object.assign({}, B.foe.def, { moves }); B.foe.mi = 0; B.foe.intent = moves[0]; }
      return B;
    };
    const foeTurn = async (B) => { const hp = G.run.hp; await d.endTurn(); for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50)); B.p.block = 0; return hp - G.run.hp; };

    // 1. A foe's pie makes its NEXT hit 50% harder, and the number shown is the number dealt.
    let B = fight([{ atk: 6, pied: 1 }, { atk: 10 }, { atk: 10 }]);
    B.p.block = 0;
    const plain = d.foeHitValue(10), plain6 = d.foeHitValue(6);
    const first = await foeTurn(B);
    say(first === plain6, `the hit that throws the pie is not boosted itself (took ${first})`);
    const shown = d.foeHitValue(10);
    say(B.p.st.pied === 1 && shown === Math.floor(plain * 1.5), `Pied 1 is showing and the next attack reads ${shown} (plain ${plain})`);
    const second = await foeTurn(B);
    say(second === shown, `the pied hit dealt ${second}, as shown`);
    say(!B.p.st.pied, 'Pied has worn off after that hit');
    const third = await foeTurn(B);
    say(third === plain, `the hit after that is back to ${third}`);

    // 2. Mosh Pit hits with Block, doubled by a Full moon (which it spends) and raised by Pied.
    const mosh = async (setup) => {
      const B = fight(); B.p.block = 10; setup(B);
      B.hand[0] = { id: 'mosh', u: 987654 }; B.p.energy = 3;
      const m = d.typeMult(B, 'atk'), text = d.blockHitValue ? d.blockHitValue(B, 1, 'atk') : NaN, hp = B.foe.hp;
      await d.playCard(0);
      for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
      return { dealt: hp - B.foe.hp, text, m, B };
    };
    let r = await mosh(() => {});
    say(r.dealt === Math.floor(10 * r.m) && r.text === r.dealt, `Mosh Pit with 10 Block dealt ${r.dealt}`);
    r = await mosh((B) => { B.fullMoon = true; B.moon = 4; });
    say(r.dealt === Math.floor(20 * r.m) && r.text === r.dealt, `under a Full moon it dealt ${r.dealt}`);
    say(!r.B.fullMoon && r.B.moon === 0, 'and the Full moon was spent');
    r = await mosh((B) => { B.foe.st.pied = 2; });
    say(r.dealt === Math.floor(15 * r.m) && r.text === r.dealt, `against a Pied foe it dealt ${r.dealt}`);

    // 3. The Fortune tent raises a stat by a whole level even for the slowest learner.
    G.B = null; G.run.floor = 0; G.run.at = 0;   // as if standing on the first stop
    const j = G.save.jinxes.find(j => j.id === G.run.jid);
    j.grades.juggle = 0; j.stats.juggle.lv = 5; j.stats.juggle.xp = 3;
    if (!d.runRest) return res.concat('WRONG no Fortune tent hook in this build');
    d.runRest();
    document.querySelector('#modal [data-act=train][data-s=juggle]').click();
    say(j.stats.juggle.lv === 6 && j.stats.juggle.xp === 3, `Fortune tent: an E-grade Juggle went 5 -> ${j.stats.juggle.lv}, keeping its progress`);
    return res;
  });
  console.log(out.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || out.some(l => l.startsWith('WRONG'))) process.exit(1);
})();
