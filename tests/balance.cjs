// Play-tests the combat balance with two automated players:
//   random: clicks any card it can afford, like a player who isn't thinking
//   smart:  reads the foe's next move, guards when a hit is coming, uses order bonuses and weak spots
// Usage: node sim.cjs [runs per setup]
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const N = +(process.argv[2] || 8);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  await p.goto(URL0);
  await p.waitForTimeout(600);
  await p.click('#titleBtns [data-act=new]');
  const TUNE = process.env.TUNE ? JSON.parse(process.env.TUNE) : null;
  await p.evaluate((TUNE_ARG) => {
    JG.fast = true;
    const tune = TUNE_ARG; if (tune) Object.assign(JG.TUNE, tune);
    const mc = new MessageChannel(); let mcq = []; mc.port1.onmessage = () => { const q = mcq; mcq = []; q.forEach((f) => f()); };
    const tick = () => new Promise((r) => { mcq.push(r); mc.port2.postMessage(0); });
    const $ = (s) => document.querySelector(s);
    const pick = (a) => a[(Math.random() * a.length) | 0];
    const dbg = JG.debug;
    function incoming(B) {
      const m = B.foe.stunned ? {} : B.foe.intent;
      return m.atk ? dbg.foeHitValue(m.atk) * (m.n || 1) : 0;
    }
    function score(c, B, need) {
      const def = JG.CARDS[c.id], fx = dbg.effFx(def, B), bo = dbg.bonuses(B.jinx), run = JG.game.run;
      let v = 0;
      const hits = fx.hits || 1;
      if (fx.dmg || fx.blockHit) {
        const per = fx.dmg ? dbg.dmgValue(fx.dmg, B, def.type) : B.p.block, tot = per * hits;
        if (B.foe.st.counter && tot < B.foe.hp + B.foe.block) v -= B.foe.st.counter * hits * 1.5 - tot * 0.3;
        else v += tot + (B.foe.charge && B.foe.flinchNeed ? tot * 0.6 : 0) + (tot >= B.foe.hp + B.foe.block ? 50 : 0);
      }
      if (fx.block) { const bl = fx.block + bo.blk; v += Math.min(bl, need) * 1.3 + Math.max(0, bl - need) * 0.1; }
      if (fx.heal) v += Math.min(fx.heal + bo.heal, run.maxHp - run.hp) * 0.9;
      if (fx.gunk) v += dbg.gunkValue(fx.gunk + bo.gunk, B) * 1.3;
      if (fx.doubleGunk) v += (B.foe.st.gunk || 0) * 1.3;
      if (fx.dazed) v += incoming(B) ? 4 : 1.5;
      if (fx.pied) v += 3;
      if (fx.hype) v += fx.hype * 4;
      if (fx.draw) v += fx.draw * 2.5;
      if (fx.energy) v += 5;
      if (fx.selfdmg) v -= fx.selfdmg * (run.hp < 12 ? 3 : 1);
      return v / Math.max(0.6, def.cost);
    }
    // keep the card that answers what the foe does the turn after next
    function hold(B) {
      if (!B.hand.length) return;
      const moves = B.foe.def.moves, m2 = moves[(B.foe.mi + 1) % moves.length], bo = dbg.bonuses(B.jinx);
      let best = -1, bv = 0;
      B.hand.forEach((c, i) => {
        const fx = JG.CARDS[c.id].fx;
        const v = m2.atk ? (fx.block || 0) + (fx.block ? bo.blk : 0) + (fx.dazed ? 3 : 0) : m2.counter ? (fx.gunk || 0) + (fx.block || 0) * 0.3 : (fx.dmg || 0) * (fx.hits || 1) + (fx.gunk || 0);
        if (v > bv) { bv = v; best = i; }
      });
      if (best >= 0) dbg.toggleHold(best);
    }
    async function turn(bot) {
      const B = JG.game.B;
      if (B.applause >= 100) { B.shows = (B.shows || 0) + 1; await dbg.showstopper(); return; }
      const can = B.hand.map((c, i) => [c, i]).filter(([c]) => JG.CARDS[c.id].cost <= B.p.energy);
      if (!can.length) { if (bot === 'smart') hold(B); await dbg.endTurn(); return; }
      if (bot === 'random') { await dbg.playCard(pick(can)[1]); return; }
      const need = Math.max(0, incoming(B) - B.p.block);
      let best = null, bv = 0.5;
      for (const [c, i] of can) { const v = score(c, B, need); if (v > bv) { bv = v; best = i; } }
      if (best === null) { hold(B); await dbg.endTurn(); } else await dbg.playCard(best);
    }
    window.__run = async (bot, lv, align, moon) => {
      const G = JG.game, j = G.save.jinxes.find((j) => j.stage !== 'egg');
      for (const s of JG.STATS) j.stats[s] = { lv, xp: 0 };
      Object.assign(j, { belly: 100, mood: 70, love: 30, align, moon: moon || 0, learned: [], grades: { juggle: 2, tumble: 2, glow: 2, grit: 2 }, age: 0, stage: lv >= 8 ? 'adult' : 'child', trait: 'glutton' });
      G.selected = j.id;
      $('#modal').hidden = true;
      $('#hud [data-act=bigtop]').click();
      await tick();
      $('#modal [data-act=go]').click();
      let act = 1, fights = 0, lastB = null; const log = [];
      for (let step = 0; step < 6000; step++) {
        await tick();
        if (G.run) act = G.run.act;
        if (G.B && G.B !== lastB) { if (lastB) log[log.length - 1] += ` -> ${G.run.hp} after ${lastB.turn} turns, shows ${lastB.shows || 0}, hype ${lastB.p.st.hype || 0}`; lastB = G.B; fights++; log.push(`${G.B.foe.def.name} hp${G.B.foe.maxHp} | you ${G.run.hp}/${G.run.maxHp} deck ${G.run.deck.length} charms ${G.run.charms.join(',')}`); }
        if (G.B && G.B.applause >= 100) G.B.shows = (G.B.shows || 0) + 0;
        if (!$('#modal').hidden) {
          const title = ($('#modalBody h2') || {}).textContent || '';
          const acts = [...document.querySelectorAll('#modalBody [data-act]')].filter((e) => !e.disabled);
          const names = acts.map((e) => e.dataset.act);
          if (names.includes('home')) {
            acts[names.indexOf('home')].click();
            await tick();
            $('#modal').hidden = true;
            return { won: /conquered/.test(title), act, fights, log };
          }
          const order = ['take', 'c', 'nap', 'leave', 'ok', 'pick', 'skip', 'close'];
          const a = order.find((x) => names.includes(x));
          if (!a) return { err: 'stuck: ' + title };
          pick(acts.filter((e) => e.dataset.act === a)).click();
          continue;
        }
        if (G.mode === 'map') { const n = [...document.querySelectorAll('.node.can')]; if (n.length) pick(n).click(); continue; }
        if (G.mode === 'battle' && G.B && !G.B.busy && !G.B.over) await turn(bot);
      }
      return { err: 'timeout', act, fights };
    };
  }, TUNE);
  if (process.argv[3] === 'trace') { const r = await p.evaluate((bot) => window.__run(bot, 2, 0), process.argv[4] || 'random'); console.log(r.log.join('\n'), r.won, r.act); await b.close(); return; }
  const setups = process.env.FULL ? [['random', 2, 0], ['smart', 2, 0], ['random', 12, 0], ['smart', 12, 0], ['smart', 12, 0.8], ['smart', 12, -0.8], ['smart', 25, 0], ['random', 25, 0]] : [['random', 2, 0], ['smart', 2, 0], ['smart', 12, 0], ['smart', 12, 0, 0.8], ['smart', 25, 0]];
  for (const [bot, lv, align, moon] of setups) {
    const res = [];
    for (let i = 0; i < N; i++) res.push(await p.evaluate(([bot, lv, align, moon]) => window.__run(bot, lv, align, moon), [bot, lv, align, moon || 0]));
    const by = [0, 0, 0, 0];
    res.forEach((r) => { if (r.won) by[3]++; else by[(r.act || 1) - 1]++; });
    const fights = (res.reduce((s, r) => s + (r.fights || 0), 0) / res.length).toFixed(1);
    console.log(`${bot.padEnd(6)} level ${String(lv).padStart(2)} lean ${String(align).padStart(4)}${moon ? ' moonlit' : ''}: fainted in act I ${by[0]}, II ${by[1]}, III ${by[2]}, won ${by[3]}   (avg ${fights} fights)` + (res.some((r) => r.err) ? '  ERR ' + res.filter((r) => r.err).map((r) => r.err).join(';') : ''));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await b.close();
})();
