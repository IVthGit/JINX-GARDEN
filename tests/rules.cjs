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
    const fight = (moves, foe) => {
      G.run.hp = G.run.maxHp = 200; G.run.act = 1; document.querySelector('#modal').hidden = true;
      d.startBattle(foe || 'mime', foe ? 'elite' : 'fight');
      const B = G.B; B.foe.hp = B.foe.maxHp = 900; B.wild = null;
      if (moves) { B.foe.moves = moves; B.foe.mi = 0; B.foe.intent = moves[0]; }
      B.req = null; if (!foe) { B.prop = null; B.target = 'foe'; }   // each case below sets up only what it tests
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

    // 4. Crowd requests: giving the crowd what it asked for pays Applause; ignoring it costs some.
    const settle = async (firstCard) => {
      const B = fight([{ blk: 1 }]); B.applause = 40;
      B.req = { k: 'open', t: 'atk', text: 'Open with an Attack' };
      B.hand[0] = { id: firstCard, u: 987655 }; B.p.energy = 3;
      await d.playCard(0);
      for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
      const mid = B.applause, state = d.reqState(B, false);
      d.settleRequest(B);
      return { gain: Math.round(B.applause - mid), state, streak: B.reqStreak };
    };
    let q = await settle('pie');
    say(q.state === true && q.gain === 12 && q.streak === 1, `opening with an Attack when asked: +${q.gain} Applause`);
    q = await settle('cart');
    say(q.state === false && q.gain === -6 && q.streak === 0, `opening with a Guard instead: ${q.gain} Applause`);

    // 5. Second act and props, on the Act I Headliner.
    B = fight(null, 'strongman');
    say(B.prop && B.prop.id === 'cannon' && B.prop.fuse === 3, `the Strongman brings a ${B.prop ? B.prop.def.name : 'nothing'} with a 3-turn fuse`);
    d.aimAt('prop');
    B.hand[0] = { id: 'pie', u: 987656 }; B.p.energy = 3;
    let fhp = B.foe.hp, php = B.prop.hp;
    await d.playCard(0);
    for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
    say(B.foe.hp === fhp && B.prop && B.prop.hp < php, `aiming at the prop: it took ${php - (B.prop ? B.prop.hp : 0)}, the foe took ${fhp - B.foe.hp}`);
    B.prop.hp = 1; B.hand[0] = { id: 'pie', u: 987657 }; B.p.energy = 3;
    await d.playCard(0);
    for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
    say(!B.prop && B.target === 'foe', 'breaking the prop removes it and aims back at the foe');
    B.foe.hp = Math.floor(B.foe.maxHp / 2);
    await foeTurn(B);
    say(B.foe.act2 && B.foe.moves === JG.FOES.strongman.act2.moves && B.foe.intent === B.foe.moves[0], 'at half health the Strongman starts his second act with a new routine');
    B = fight([{ blk: 1 }, { blk: 1 }]); B.foe.hp = Math.floor(B.foe.maxHp / 2);
    await foeTurn(B);
    say(B.foe.act2 && B.foe.st.hype === 1 && B.foe.moves.length === 2, 'a Heckler at half health gets angry: +1 Hype');
    B = fight([{ blk: 1 }], 'strongman'); B.req = null;
    const before = G.run.hp, bang = Math.round(JG.PROPS.cannon.boom * JG.TUNE.dmg[0]);
    await foeTurn(B); await foeTurn(B);
    const two = before - G.run.hp;
    B.p.block = 0; const lost = await foeTurn(B);
    say(two === 0 && lost === bang && !B.prop, `the cannon went off on the third turn for ${lost}`);

    // 6. The understudy: a free cue, and one fall taken for the lead.
    const u = d.makeJinx({ name: 'Wings' }); u.stage = 'child'; u.love = 50;
    for (const s of JG.STATS) u.stats[s].lv = 0;
    u.stats.tumble.lv = 10;
    G.save.jinxes.push(u); G.run.uid = u.id; G.run.underOut = false;
    B = fight([{ atk: 10 }]);
    say(B.cues === 2, `an understudy with 50 Love answers ${B.cues} cues a fight`);
    const e0 = B.p.energy;
    await d.cue();
    for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
    say(B.p.block === 9 && B.cues === 1 && B.p.energy === e0, `a Tumble understudy's cue gave ${B.p.block} Block for no energy`);
    G.run.hp = 1; B.p.block = 0;
    await foeTurn(B);
    say(!B.over && G.run.underOut && G.run.hp === Math.round(G.run.maxHp * 0.25) && B.cues === 0, `the understudy took the fall: the lead is on ${G.run.hp} health and the understudy is out`);

    // 7. A snack from the bag, eaten in the fight, doesn't come home.
    B = fight([{ blk: 1 }]); G.run.loot = ['spring', 'balloon'];
    await d.eatSnack('spring');
    for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
    say(B.p.block === 8 && G.run.loot.join() === 'balloon' && B.snacked && !d.snackFx('balloon'), `a Springberry gave ${B.p.block} Block and left the bag`);

    // 8. The Fortune tent polishes a card.
    G.B = null; G.run.floor = 0; G.run.at = 0; G.run.deck = ['pie', 'mosh'];
    d.runRest();
    document.querySelector('#modal [data-act=polish]').click();
    document.querySelector('#modal .card[data-i="0"]').click();
    say(G.run.deck[0] === 'pie+' && JG.CARDS['pie+'].fx.dmg === 8 && JG.CARDS['mosh+'].cost === 0, `polishing Pie Toss made ${JG.CARDS[G.run.deck[0]].name}, dealing ${JG.CARDS['pie+'].fx.dmg} before bonuses`);

    // 9. Charms that change a rule.
    G.run.charms = ['metronome', 'sleeve', 'hammer', 'shill'];
    B = fight([{ blk: 1 }]); B.played = 2; B.p.energy = 0; B.hand[0] = { id: 'mallet', u: 987658 };
    const hn = B.hand.length; await d.playCard(0);
    for (let k = 0; k < 200 && B.busy && !B.over; k++) await new Promise(r => setTimeout(r, 50));
    say(B.hand.length === hn - 1, 'Broken Metronome: the third card of the turn costs 0 (a 2-cost card played with no energy)');
    G.run.charms = [];
    return res;
  });
  console.log(out.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || out.some(l => l.startsWith('WRONG'))) process.exit(1);
})();
