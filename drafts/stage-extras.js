// DRAFT, not loaded by the game. Three looks for the props and the understudy on the fight stage.
// Load it after game.js and set JG.draw.extras.set to "sticks", "rigging" or "shadows".
// It wraps drawJinx and drawFoe, so the extras land in the same layer as the fighters:
// behind the theatre front and the crowd, with the same paper edge.
(function () {
  "use strict";
  const D = JG.draw, X = D._;
  const E = (D.extras = { set: "sticks", prop: null, under: true });
  const INK = "#140a1e";
  let busy = false;

  // ---------- the four props, drawn about 110 tall with (0, 0) at the middle of the base ----------
  // In the "shadows" look every colour goes near black and only one accent is lit.
  function art(id, g, dark, t, fuse) {
    const col = (c, d) => (dark ? d || "#1b1330" : c);
    const ink = dark ? "#07030f" : INK;
    const box = (x, y, w, h, c, lw) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = ink; g.lineWidth = lw || 3; g.strokeRect(x, y, w, h); };
    const disc = (x, y, r, c, lw) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = c; g.fill(); g.strokeStyle = ink; g.lineWidth = lw || 3; g.stroke(); };
    const lit = (x, y, r, c, a) => X.glow(x, y, r, c, a);
    g.lineJoin = "round"; g.lineCap = "round";
    if (id === "plant") {
      // someone in a long coat and a big hat, holding up a BOO sign
      g.beginPath(); g.moveTo(-30, 0); g.lineTo(-20, -66); g.lineTo(20, -66); g.lineTo(32, 0); g.closePath();
      g.fillStyle = col("#4a3a5e", "#1b1330"); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
      g.beginPath(); g.moveTo(0, -66); g.lineTo(-3, -6); g.stroke();
      for (let k = 0; k < 3; k++) disc(4, -52 + k * 16, 2.2, col("#e8b923", "#2a2044"), 1.5);
      g.beginPath(); g.moveTo(-20, -66); g.lineTo(0, -52); g.lineTo(20, -66); g.fillStyle = col("#2b2038", "#120b22"); g.fill(); g.stroke();
      disc(0, -78, 14, col("#efe6d2", "#231a3a"));
      // the hat hides everything but the eyes
      g.beginPath(); g.ellipse(0, -86, 30, 7, -0.08, 0, 7); g.fillStyle = col("#231a30", "#0d0818"); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-15, -88); g.lineTo(-12, -108); g.lineTo(13, -110); g.lineTo(15, -89); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = col("#8f2238", "#3a1326"); g.fillRect(-14, -94, 28, 5);
      g.fillStyle = dark ? "#ff5f7a" : INK;
      g.fillRect(-8, -80, 5, 3); g.fillRect(3, -80, 5, 3);
      if (dark) { lit(-5, -79, 9, "#ff5f7a", 0.7); lit(6, -79, 9, "#ff5f7a", 0.7); }
      // the sign
      g.strokeStyle = ink; g.lineWidth = 6; g.beginPath(); g.moveTo(26, -44); g.lineTo(36, -118); g.stroke();
      g.strokeStyle = col("#d9b77a", "#2a2044"); g.lineWidth = 3; g.beginPath(); g.moveTo(26, -44); g.lineTo(36, -118); g.stroke();
      disc(26, -46, 6, col("#efe6d2", "#231a3a"), 2.5);
      g.save(); g.translate(38, -134); g.rotate(0.1 + Math.sin(t * 5) * 0.06);
      box(-30, -17, 60, 34, col("#efe6d2", "#1b1330"));
      g.font = '900 24px "Bungee", "Arial Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = col("#8f2238", "#ff5f7a"); g.fillText("BOO", 0, 2);
      g.restore();
      if (dark) lit(38, -134, 46, "#ff5f7a", 0.55);
    } else if (id === "amp") {
      // two speaker cabinets and a head, a little crooked
      const cab = (x, y, w, h, n) => {
        box(x, y, w, h, col("#231a30", "#120b22"));
        g.fillStyle = col("#3a2d4c", "#1b1330"); g.fillRect(x + 5, y + 5, w - 10, h - 10);
        for (let k = 0; k < n; k++) {
          const cx = x + (w / n) * (k + 0.5), cy = y + h / 2, r = Math.min(w / n, h) * 0.36, th = 1 + Math.sin(t * 14 + k) * 0.05;
          disc(cx, cy, r * th, col("#16101f", "#0a0614"), 2.5);
          g.strokeStyle = col("#8c7fa6", "#ffb347"); g.lineWidth = 1.6;
          g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 7); g.stroke();
          disc(cx, cy, r * 0.26, col("#5b4d73", "#2a2044"), 1.5);
          if (dark) lit(cx, cy, r * 1.3, "#ffb347", 0.35);
        }
      };
      cab(-40, -54, 80, 54, 2);
      g.save(); g.translate(2, -54); g.rotate(-0.03); cab(-34, -46, 68, 46, 2);
      box(-30, -64, 60, 18, col("#8f2238", "#1b1330"));
      for (let k = 0; k < 4; k++) disc(-20 + k * 11, -55, 3, col("#efe6d2", "#2a2044"), 1.5);
      disc(22, -55, 3.5, "#ffb347", 1.5); lit(22, -55, 16, "#ffb347", 0.8);
      g.restore();
      // sound coming off it
      g.strokeStyle = dark ? "#ffb347" : "#efe6d2"; g.lineWidth = 3;
      for (let k = 0; k < 3; k++) { const q = (t * 0.9 + k / 3) % 1; g.globalAlpha = (1 - q) * 0.8; g.beginPath(); g.arc(-44, -62, 14 + q * 30, Math.PI * 0.75, Math.PI * 1.25); g.stroke(); }
      g.globalAlpha = 1;
    } else if (id === "net") {
      // two striped poles and a sagging net
      const pole = (x) => {
        g.fillStyle = ink; g.fillRect(x - 6, -96, 12, 96);
        for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? col("#8f2238", "#1b1330") : col("#efe6d2", "#2a2044"); g.fillRect(x - 3.5, -94 + k * 11.6, 7, 11.6); }
        disc(x, -98, 6, col("#e8b923", "#2a2044"), 2.5);
        g.beginPath(); g.moveTo(x - 14, 0); g.lineTo(x + 14, 0); g.strokeStyle = ink; g.lineWidth = 7; g.stroke();
      };
      const sag = 30 + Math.sin(t * 2.2) * 3, top = -84;
      const yAt = (k, row) => top + row * 9 + Math.sin(k * Math.PI) * (sag - row * 2);
      g.strokeStyle = dark ? "#8fe9ff" : "#efe6d2"; g.lineWidth = dark ? 1.6 : 2;
      for (let row = 0; row < 4; row++) { g.beginPath(); for (let i = 0; i <= 12; i++) { const k = i / 12, x = -44 + k * 88; i ? g.lineTo(x, yAt(k, row)) : g.moveTo(x, yAt(k, row)); } g.stroke(); }
      for (let i = 0; i <= 12; i++) { const k = i / 12, x = -44 + k * 88; g.beginPath(); g.moveTo(x, yAt(k, 0)); g.lineTo(x + (i % 2 ? 3 : -3), yAt(k, 3)); g.stroke(); }
      g.strokeStyle = ink; g.lineWidth = dark ? 0 : 5; g.globalCompositeOperation = "destination-over";
      if (!dark) for (const row of [0, 3]) { g.beginPath(); for (let i = 0; i <= 12; i++) { const k = i / 12, x = -44 + k * 88; i ? g.lineTo(x, yAt(k, row)) : g.moveTo(x, yAt(k, row)); } g.stroke(); }
      g.globalCompositeOperation = "source-over";
      if (dark) lit(0, top + sag, 60, "#8fe9ff", 0.45);
      pole(-46); pole(46);
      // a plaster cross: it mends
      g.fillStyle = dark ? "#8fe9ff" : "#a6d94a"; g.strokeStyle = ink; g.lineWidth = 2.5;
      g.beginPath(); g.rect(-4, -122, 8, 22); g.rect(-11, -115, 22, 8); g.fill(); if (!dark) g.stroke();
      if (dark) lit(0, -111, 20, "#8fe9ff", 0.6);
    } else if (id === "cannon") {
      // a circus cannon aimed at your side of the stage, fuse burning
      g.save(); g.translate(8, -40); g.rotate(-0.42);
      g.beginPath(); g.moveTo(34, -20); g.lineTo(-58, -16); g.lineTo(-58, 16); g.lineTo(34, 20); g.quadraticCurveTo(52, 0, 34, -20); g.closePath();
      g.fillStyle = col("#8f2238", "#1b1330"); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
      for (const x of [-34, -6, 20]) { g.fillStyle = col("#e8b923", "#2a2044"); g.fillRect(x, -19, 7, 38); g.strokeRect(x, -19, 7, 38); }
      box(-66, -21, 10, 42, col("#e8b923", "#2a2044"));
      g.fillStyle = dark ? "#0a0614" : "#16101f"; g.beginPath(); g.ellipse(-66, 0, 4, 15, 0, 0, 7); g.fill();
      // the fuse
      g.strokeStyle = col("#efe6d2", "#3a2f4a"); g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(38, -12); g.quadraticCurveTo(54, -30, 48, -44); g.stroke();
      const fl = 5 + Math.sin(t * 30) * 2;
      g.fillStyle = "#ffd23f"; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 6, r = k % 2 ? fl * 0.45 : fl * 1.5; g.lineTo(48 + Math.cos(a) * r, -44 + Math.sin(a) * r); } g.closePath(); g.fill();
      lit(48, -44, 22, "#ffd23f", 0.9);
      g.restore();
      // the carriage
      g.beginPath(); g.moveTo(-26, -6); g.lineTo(-8, -40); g.lineTo(26, -40); g.lineTo(40, -6); g.closePath();
      g.fillStyle = col("#4a3a5e", "#150e26"); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
      disc(10, -18, 19, col("#231a30", "#120b22"));
      g.strokeStyle = col("#e8b923", "#3a2f4a"); g.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(10 - Math.cos(a) * 16, -18 - Math.sin(a) * 16); g.lineTo(10 + Math.cos(a) * 16, -18 + Math.sin(a) * 16); g.stroke(); }
      disc(10, -18, 5, col("#e8b923", "#2a2044"), 2);
      // how long is left
      if (fuse) {
        g.font = '900 22px "Bungee", "Arial Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 5; g.strokeStyle = ink; g.strokeText(fuse, 44, -96); g.fillStyle = "#ffd23f"; g.fillText(fuse, 44, -96);
      }
    }
  }

  function stick(c, x, top, H, U) {
    const w = 6 * U;
    c.fillStyle = INK; c.fillRect(x - w / 2 - 1.5 * U, top, w + 3 * U, H - top);
    c.fillStyle = "#d9b77a"; c.fillRect(x - w / 2, top, w, H - top);
    c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x - w / 2, top, w * 0.3, H - top);
  }
  function rope(c, x0, y0, x1, y1, U) {
    c.strokeStyle = INK; c.lineWidth = 4 * U; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = "#b9a37a"; c.lineWidth = 2 * U; c.setLineDash([5 * U, 3 * U]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]);
  }

  function drawProp(B, fx, feet, t, neon) {
    const id = E.prop || (B.prop && B.prop.id);
    if (!id) return;
    const { W, H, U } = D.size(), s = 1.12 * U, set = E.set, dark = set === "shadows";
    const fuse = id === "cannon" ? (B.prop && B.prop.id === "cannon" ? B.prop.fuse : 3) : 0;
    // behind the foe and a little upstage; on a narrow screen it tucks in closer
    const x = fx + Math.min(168 * U, W - fx - 62 * U);
    let y = feet - 14 * U, sway = Math.sin(t * 1.4 + 2) * 0.025;
    let c = X.ctx();
    if (set === "sticks") stick(c, x, y - 6 * U, H, U);
    if (set === "rigging") {
      y = feet - 70 * U + Math.sin(t * 1.1) * 4 * U;
      sway = Math.sin(t * 1.1 + 1) * 0.06;
      rope(c, x - 40 * U, 0, x - 34 * s + sway * 300, y - 100 * s, U);
      rope(c, x + 40 * U, 0, x + 34 * s + sway * 300, y - 100 * s, U);
    }
    D.cutout(() => {
      const g = X.ctx();
      g.save(); g.translate(x, y); g.rotate(sway); g.scale(s, s);
      if (set === "rigging") {
        // the batten it hangs from, and a luggage tag
        g.fillStyle = "#d9b77a"; g.strokeStyle = INK; g.lineWidth = 3;
        g.fillRect(-52, -150, 104, 9); g.strokeRect(-52, -150, 104, 9);
        g.lineWidth = 2; g.beginPath(); g.moveTo(-34, -141); g.lineTo(-30, -104); g.moveTo(34, -141); g.lineTo(30, -104); g.stroke();
      }
      art(id, g, dark, t, fuse);
      g.restore();
    }, x, y, 86 * s, 168 * s, 10 * s, { key: "xprop", sig: set + id + fuse, edge: dark ? 1.6 : 3, edgeColor: neon ? "#8fe9ff" : dark ? "#3b2a66" : undefined, fps: 12 });
    c = X.ctx();
    if (B.target === "prop") {
      // aimed at: the same dashed ring the garden uses for the Jinx you picked
      c.save(); c.strokeStyle = "#ffd23f"; c.lineWidth = 2.5; c.setLineDash([6, 6]); c.lineDashOffset = -t * 20;
      c.beginPath(); c.ellipse(x, set === "rigging" ? feet - 10 * U : y, 70 * U, 16 * U, 0, 0, 7); c.stroke(); c.restore();
    }
  }

  function cueLights(c, x, y, B, U) {
    const max = Math.max(B.cues || 0, 2);
    for (let i = 0; i < max; i++) {
      const bx = x + (i - (max - 1) / 2) * 15 * U, on = i < (B.cues || 0);
      c.fillStyle = INK; c.beginPath(); c.arc(bx, y, 6 * U, 0, 7); c.fill();
      c.fillStyle = on ? "#ffd23f" : "#3a2f4a"; c.beginPath(); c.arc(bx, y, 4 * U, 0, 7); c.fill();
      if (on) X.glow(bx, y, 16 * U, "#ffd23f", 0.6);
    }
  }

  function drawUnder(B, orig, px, py, o) {
    const G = JG.game, u = G.run && G.run.uid && G.save.jinxes.find((j) => j.id === G.run.uid);
    if (!u || !E.under) return;
    const { H, U } = D.size(), t = o.t || 0, set = E.set, out = G.run.underOut;
    const c = X.ctx();
    let r;
    if (set === "sticks") {
      // a smaller puppet on its own stick, a step behind the lead
      const x = px - 122 * U, y = py - 18 * U;
      stick(c, x, y - 8 * U, H, U);
      r = orig.call(D, u, x, y, { t, dir: 1, scale: 1.35, edgeColor: o.edgeColor, happy: o.happy, sleep: out });
    } else if (set === "rigging") {
      // sat up on a swing, watching
      const sw = Math.sin(t * 1.2) * 12 * U, x = px - 168 * U + sw, y = py - 168 * U - Math.abs(sw) * 0.2;
      rope(c, x - 44 * U - sw * 0.7, 0, x - 40 * U, y, U);
      rope(c, x + 44 * U - sw * 0.7, 0, x + 40 * U, y, U);
      c.fillStyle = INK; c.fillRect(x - 50 * U, y - 2 * U, 100 * U, 9 * U);
      c.fillStyle = "#d9b77a"; c.fillRect(x - 48 * U, y, 96 * U, 5 * U);
      r = orig.call(D, u, x, y - 2 * U, { t, dir: 1, scale: 1.25, edgeColor: o.edgeColor, happy: o.happy, sleep: out });
    } else {
      // a dark shape waiting upstage; only its lights show until it is cued
      const x = px - 128 * U, y = py - 24 * U;
      c.save();
      c.filter = "brightness(0.2) saturate(0.6)";
      r = orig.call(D, u, x, y, { t, dir: 1, scale: 1.55, happy: o.happy, sleep: out });
      c.restore();
      X.glow(x + 6 * U, r.faceY, 30 * U, "#c9b8ff", 0.5);
    }
    cueLights(X.ctx(), r.x, r.topY - 2 * U, B, U);
  }

  const jinx0 = D.drawJinx, foe0 = D.drawFoe;
  D.drawJinx = function (j, x, y, o) {
    const B = JG.game.B;
    if (!busy && B && o && o.scale === 2.25 && !o.flat && j === B.jinx) { busy = true; try { drawUnder(B, jinx0, x, y, o); } finally { busy = false; } }
    return jinx0.call(D, j, x, y, o);
  };
  D.drawFoe = function (f, x, feetY, t, o) {
    const B = JG.game.B;
    if (B && o && o.scale === 1.45 && !o.flat && B.over !== "win") drawProp(B, x, feetY, t, B.act === 3);
    return foe0.call(D, f, x, feetY, t, o);
  };
})();
