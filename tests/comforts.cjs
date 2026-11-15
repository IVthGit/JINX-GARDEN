// The small comforts: a duet's egg survives closing the game, going home before the show starts is free,
// an unreadable save is kept aside, Escape closes things, the side panel isn't rebuilt under a tap, and a
// tap on small print shows what a hover would. Fails if one is wrong.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  const bad = [];
  const ok = (name, pass, got) => { console.log((pass ? 'ok   ' : 'WRONG'), name, got === undefined ? '' : JSON.stringify(got)); if (!pass) bad.push(name); };
  const st = () => ({ juggle: { lv: 5, xp: 0 }, tumble: { lv: 4, xp: 0 }, glow: { lv: 3, xp: 0 }, grit: { lv: 6, xp: 0 } });
  await p.goto(URL0); await p.waitForTimeout(600);
  await p.evaluate((st) => {
    localStorage.setItem('jinxgarden.v1', JSON.stringify({ v: 1, tix: 200, inv: { moonpie: 1, balloon: 1 }, sky: [], records: { runs: 4, wins: 0, bestAct: 1, hatched: 2 },
      jinxes: [{ id: 'a', name: 'Ada', stage: 'adult', hue: 40, seed: 1, align: 0.6, stats: st[0], belly: 80, mood: 70, love: 60, age: 5, gen: 1, u: 0, v: 0.2, trait: 'glutton' },
               { id: 'b', name: 'Bo', stage: 'adult', hue: 200, seed: 2, align: -0.6, stats: st[1], belly: 80, mood: 70, love: 60, age: 6, gen: 1, u: 0.3, v: 0.2, trait: 'hothead' }] }));
  }, [st(), st()]);
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#titleBtns [data-act=continue]'); await p.waitForTimeout(500);

  // ---- the side panel ----
  await p.evaluate(() => { const G = JG.game; G.selected = 'a'; G.panelT = 9; });
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.__btn = document.querySelector('#panel [data-act=pet]'); });
  await p.waitForTimeout(4500);     // two of its regular refreshes
  ok('the panel keeps its buttons while nothing changes', await p.evaluate(() => window.__btn && window.__btn.isConnected));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('Escape closes the panel', await p.evaluate(() => document.querySelector('#panel').hidden && !JG.game.selected));

  // ---- small print by touch ----
  await p.evaluate(() => { JG.game.selected = 'a'; JG.game.panelT = 9; }); await p.waitForTimeout(300);
  const tip = await p.evaluate(() => {
    const el = document.querySelector('#panel .gr');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const t = document.querySelector('#toast');
    return { shown: t.classList.contains('show'), text: t.textContent, title: el.title };
  });
  ok('a tap on a grade shows its explanation', tip.shown && tip.text === tip.title && /Aptitude/.test(tip.text), tip.text);
  await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' })));

  // ---- a duet cut short ----
  const mid = await p.evaluate(() => { const G = JG.game, s = G.save; JG.debug.startDuet(s.jinxes[0], s.jinxes[1]); return { balloon: s.inv.balloon, stored: !!JSON.parse(localStorage.getItem('jinxgarden.v1')).duetEgg }; });
  ok('the duet spends the balloon and saves the egg at once', mid.balloon === 0 && mid.stored, mid);
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#titleBtns [data-act=continue]'); await p.waitForTimeout(500);
  const after = await p.evaluate(() => { const s = JG.game.save, e = s.jinxes.find(j => j.stage === 'egg'); return { eggs: s.jinxes.filter(j => j.stage === 'egg').length, duet: !!(e && e.inherit && e.inherit.duet), left: !!s.duetEgg }; });
  ok('closing the game mid-song still leaves the egg', after.eggs === 1 && after.duet && !after.left, after);

  // ---- going home before the show starts ----
  const before = await p.evaluate(() => { const G = JG.game, j = G.save.jinxes[0]; G.selected = j.id; return { age: j.age, runs: G.save.records.runs, mood: j.mood }; });
  await p.click('#hud [data-act=bigtop]'); await p.click('#modal [data-act=go]'); await p.waitForTimeout(900);
  await p.click('#btnQuit'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('Escape closes a question that can be declined', await p.evaluate(() => document.querySelector('#modal').hidden && JG.game.mode === 'map'));
  await p.click('#btnQuit'); await p.click('#modal [data-act=yes]'); await p.waitForTimeout(300);
  const home = await p.evaluate(() => { const G = JG.game, j = G.save.jinxes[0]; return { mode: G.mode, run: !!G.run, saved: !!JSON.parse(localStorage.getItem('jinxgarden.v1')).run, age: j.age, runs: G.save.records.runs, mood: j.mood }; });
  ok('going home before the first stop is free', home.mode === 'garden' && !home.run && !home.saved && home.age === before.age && home.runs === before.runs && Math.abs(home.mood - before.mood) < 2, home);

  // ---- a save that can't be read ----
  await p.evaluate(() => localStorage.setItem('jinxgarden.v1', '{"v":1,"jinxes":[{"na'));
  await p.reload(); await p.waitForTimeout(600);
  const broke = await p.evaluate(() => ({ kept: localStorage.getItem('jinxgarden.v1.unreadable'), note: /couldn't be opened/.test(document.querySelector('#titleBtns').textContent), fresh: !!document.querySelector('#titleBtns [data-act=new]') && !document.querySelector('#titleBtns [data-act=continue]') }));
  ok('an unreadable save is kept aside and the title says so', broke.kept === '{"v":1,"jinxes":[{"na' && broke.note && broke.fresh, { note: broke.note });

  // ---- the page itself ----
  const page = await p.evaluate(() => ({ viewport: !!document.querySelector('meta[name=viewport]'), touch: getComputedStyle(document.querySelector('#scene')).touchAction }));
  ok('the page is set up for phones', page.viewport && page.touch === 'none', page);

  console.log(errs.join('\n') || 'no errors'); if (errs.length || bad.length) process.exitCode = 1;
  if (bad.length) console.log('WRONG: ' + bad.join('; '));
  await b.close();
})();
