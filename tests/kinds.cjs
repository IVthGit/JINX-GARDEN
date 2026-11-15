// The three kinds in the game: leans, hats, and poses.
const URL0 = process.env.JINX_URL || 'http://localhost:8765/index.html';
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto(URL0); await p.waitForTimeout(900);
  const setup = () => { document.querySelector('#title').hidden = true; document.querySelector('#grain').hidden = true; JG.game.mode = 'sheet'; const ctx = document.querySelector('#scene').getContext('2d'); ctx.fillStyle = '#2b3f48'; ctx.fillRect(0, 0, 1500, 900); return ctx; };
  // 1: hats on each head, grown harlequin/base
  await p.evaluate((setupSrc) => {
    const ctx = eval('(' + setupSrc + ')')(), D = JG.draw, base = JG.game.save.jinxes.find(j => j.stage !== 'egg');
    const rows = [['Umbra', 'child', 0, 0], ['Hollow', 'adult', 0, -0.5], ['Lantern', 'adult', 0.8, 0], [{ head: 'disc', piece: 'hood', body: 'wisp' }, 'adult', 0, 0.8], [{ head: 'bulb', piece: 'corona', body: 'night' }, 'adult', -0.8, 0]];
    D.HAT_IDS.forEach((h, i) => rows.forEach(([k, stage, align, moon], r) => {
      const j = Object.assign(JSON.parse(JSON.stringify(base)), typeof k === 'string' ? D.KINDS[k] : k, { stage, align, moon, hat: h, mood: 80, hue: 320 + r * 40 });
      for (const s of JG.STATS) j.stats[s].lv = s === 'grit' ? 9 : 2;
      D.drawJinx(j, 80 + i * 148, 170 + r * 172, { t: 2.2 + i, scale: 1.25 });
    }));
  }, setup.toString());
  await p.screenshot({ path: __dirname + '/out/kinds-hats.png' });
  // 2: poses: walk, happy, hurt, sleep, evil, spin, flat, dir -1, look
  await p.evaluate((setupSrc) => {
    const ctx = eval('(' + setupSrc + ')')(), D = JG.draw, base = JG.game.save.jinxes.find(j => j.stage !== 'egg');
    const poses = [{}, { walk: true }, { happy: true }, { hurt: true }, { sleep: true }, { evil: true }, { spin: 1.2 }, { dir: -1 }, { dir: 0.3 }, { look: [1, 1] }, { twirl: 0.9 }];
    ['Umbra', 'Hollow', 'Lantern'].forEach((k, r) => poses.forEach((po, i) => {
      const j = Object.assign(JSON.parse(JSON.stringify(base)), D.KINDS[k], { stage: r === 0 ? 'child' : 'adult', align: r === 2 ? 0.8 : 0, moon: 0, mood: po.sad ? 10 : 80, hue: 200 });
      for (const s of JG.STATS) j.stats[s].lv = s === 'juggle' && r === 1 ? 9 : 2;
      const ret = D.drawJinx(j, 75 + i * 135, 260 + r * 290, Object.assign({ t: 3.1 + i * 0.37, scale: 1.6 }, po));
      ctx.strokeStyle = 'rgba(255,0,0,0.5)'; ctx.beginPath(); ctx.arc(ret.x, ret.y, ret.r, 0, 7); ctx.stroke(); ctx.fillStyle = 'red'; ctx.fillRect(ret.x - 8, ret.topY, 16, 2); ctx.fillStyle = 'cyan'; ctx.fillRect(ret.x - 8, ret.faceY, 16, 2);
    }));
  }, setup.toString());
  await p.screenshot({ path: __dirname + '/out/kinds-poses.png' });
  console.log(errs.join('\n') || 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
