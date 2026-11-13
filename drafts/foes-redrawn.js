// DRAFTS, not part of the game. A redrawn version of every foe, shown to the user on the "Foe Revisions"
// sheet and not yet chosen. This file is a fragment: apply.py pastes it into a copy of draw.js, where it
// can use that file's helpers (fPaint, fBody, limb, eye, glow, lightLayer and so on).
// The drawings are not yet cut into puppet parts with P() markers.
  // ================= redrawn foes: cooler, stranger, fewer colours =================
  const BONE = "#e6dcc8", NIGHT = "#16101f", DUSK = "#2a1f45", WINE = "#8f2238";
  // a dark eye hole with a light in it
  function socket(x, y, w, h, col, o) {
    o = o || {};
    const p = new Path2D();
    p.ellipse(x, y, w, h, o.rot || 0, 0, Math.PI * 2);
    ctx.fillStyle = "#05020c";
    ctx.fill(p);
    if (o.rim) { ctx.strokeStyle = o.rim; ctx.lineWidth = Math.max(1, w * 0.14); ctx.stroke(p); }
    glow(x + (o.dx || 0), y + (o.dy || 0), w * 1.7, col, 0.5);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x + (o.dx || 0), y + (o.dy || 0), w * (o.k || 0.34), h * (o.k || 0.34), 0, 0, Math.PI * 2); ctx.fill();
  }
  // a hand with long thin fingers
  function longHand(x, y, s, rot, fill, lw, n) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    n = n || 4;
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.34; limb([[0, 0], [Math.sin(a) * s * 0.9, -Math.cos(a) * s * 0.9], [Math.sin(a * 1.5) * s * 1.7, -Math.cos(a * 1.5) * s * 1.7]], s * 0.2, fill, lw * 0.4); }
    const palm = new Path2D();
    palm.ellipse(0, s * 0.1, s * 0.5, s * 0.42, 0, 0, Math.PI * 2);
    fPaint(palm, fill, lw * 0.6);
    ctx.restore();
  }
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const ink = (p, w, c) => { ctx.strokeStyle = c || FINK; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(p); };
  const seg = (x0, y0, x1, y1, w, c) => { ctx.strokeStyle = c || FINK; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

  const ART2 = {
    // A porcelain mask on a thin body, hands flat against a pane only it can feel.
    mime(f, r, t, lw, ft) {
      const sway = Math.sin(t * 1.4) * r * 0.03;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.16, r * 0.5], [s * r * 0.21, r * 0.86], [s * r * 0.24, ft - r * 0.08]], r * 0.13, NIGHT, lw * 0.5);
        shoe(s * r * 0.24 - r * 0.08, ft, r * 0.15, -1, NIGHT, lw * 0.7);
      }
      const torso = new Path2D();
      torso.moveTo(-r * 0.36, -r * 0.42); torso.quadraticCurveTo(-r * 0.48, r * 0.1, -r * 0.3, r * 0.6); torso.lineTo(r * 0.3, r * 0.6);
      torso.quadraticCurveTo(r * 0.48, r * 0.1, r * 0.36, -r * 0.42); torso.quadraticCurveTo(0, -r * 0.56, -r * 0.36, -r * 0.42);
      ctx.fillStyle = NIGHT; ctx.fill(torso);
      ctx.save(); ctx.clip(torso); ctx.fillStyle = "#bdb3a2";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(0, -r * 0.3 + i * r * 0.17, r * 0.8, r * 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(torso, r * 0.8, -r * 0.3, -r * 0.3, 0.4);
      ink(torso, lw);
      for (const s of [-1, 1]) seg(s * r * 0.2, -r * 0.46, s * r * 0.16, r * 0.58, r * 0.05, WINE);
      // the mask
      const head = new Path2D();
      head.ellipse(sway, -r * 0.95, r * 0.34, r * 0.46, 0, 0, Math.PI * 2);
      fBody(head, BONE, r * 0.5, lw, sway - r * 0.12, -r * 1.1, 0.3);
      for (const s of [-1, 1]) {
        // a black diamond over each eye that runs on down the cheek
        ctx.fillStyle = NIGHT;
        ctx.beginPath(); ctx.moveTo(sway + s * r * 0.15, -r * 1.24); ctx.lineTo(sway + s * r * 0.23, -r * 1.0); ctx.lineTo(sway + s * r * 0.17, -r * 0.62); ctx.lineTo(sway + s * r * 0.13, -r * 0.62); ctx.lineTo(sway + s * r * 0.07, -r * 1.0); ctx.fill();
        socket(sway + s * r * 0.15, -r * 1.0, r * 0.075, r * 0.1, "#fbf8f2", { k: 0.3, dy: r * 0.02 });
      }
      seg(sway - r * 0.09, -r * 0.7, sway + r * 0.09, -r * 0.7, lw * 0.7);
      for (let k = -1; k <= 1; k++) seg(sway + k * r * 0.06, -r * 0.73, sway + k * r * 0.06, -r * 0.67, lw * 0.4);
      ink(poly([[sway - r * 0.3, -r * 1.2], [sway - r * 0.22, -r * 1.06], [sway - r * 0.3, -r * 0.98]]), lw * 0.4);
      const beret = new Path2D();
      beret.moveTo(sway - r * 0.36, -r * 1.26); beret.bezierCurveTo(sway - r * 0.46, -r * 1.56, sway + r * 0.52, -r * 1.62, sway + r * 0.44, -r * 1.3); beret.quadraticCurveTo(sway, -r * 1.38, sway - r * 0.36, -r * 1.26);
      fBody(beret, NIGHT, r * 0.5, lw, sway - r * 0.1, -r * 1.5, 0.3);
      seg(sway + r * 0.08, -r * 1.56, sway + r * 0.1, -r * 1.66, lw);
      // the pane: a few lines of light where the hands are
      lightLayer(() => {
        ctx.strokeStyle = `rgba(190,225,255,${0.35 + 0.2 * Math.sin(t * 2.5)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 1.1, -r * 1.5); ctx.lineTo(-r * 1.1, r * 0.9); ctx.moveTo(-r * 1.1, -r * 0.5); ctx.lineTo(-r * 0.7, -r * 0.62); ctx.moveTo(-r * 1.1, r * 0.2); ctx.lineTo(-r * 0.75, r * 0.1); ctx.stroke();
      });
      for (const [hx, hy, sx, sy] of [[-1.02, -0.72, -0.34, -0.3], [-1.02, 0.02, 0.34, -0.26]]) {
        const hh = hy * r + Math.sin(t * 1.4 + hx + hy) * r * 0.04;
        limb([[sx * r, sy * r], [(sx - 0.38) * r * (sx > 0 ? 0.3 : 1.6), (sy + 0.34) * r], [hx * r + r * 0.14, hh]], r * 0.11, NIGHT, lw * 0.5);
        longHand(hx * r + r * 0.06, hh, r * 0.13, -Math.PI / 2, BONE, lw, 4);
      }
    },

    // A popcorn box with something living in it.
    goblin(f, r, t, lw, ft) {
      const pk = Math.sin(t * 2) * r * 0.04;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.3, r * 0.7], [s * r * 0.38, ft - r * 0.1]], r * 0.1, "#3d4a30", lw * 0.5);
        shoe(s * r * 0.38 - r * 0.1, ft, r * 0.14, -1, NIGHT, lw * 0.7);
        // long arms that reach the floor
        limb([[s * r * 0.8, r * 0.05], [s * r * 1.2, r * 0.3], [s * r * 1.12, ft - r * 0.2]], r * 0.09, "#3d4a30", lw * 0.5);
        longHand(s * r * 1.12, ft - r * 0.14, r * 0.12, Math.PI, "#55663c", lw, 3);
      }
      // ears and the top of a head, behind the box
      for (const s of [-1, 1]) {
        const ear = new Path2D();
        ear.moveTo(s * r * 0.4, -r * 0.5 + pk); ear.quadraticCurveTo(s * r * 0.9, -r * 1.15 + pk, s * r * 1.3, -r * 0.95 + pk + Math.sin(t * 5 + s) * r * 0.05); ear.quadraticCurveTo(s * r * 0.9, -r * 0.6 + pk, s * r * 0.5, -r * 0.2 + pk); ear.closePath();
        fBody(ear, "#55663c", r * 0.6, lw, s * r * 0.6, -r * 0.9, 0.35);
      }
      const dark = new Path2D();
      dark.moveTo(-r * 0.86, -r * 0.1); dark.quadraticCurveTo(0, -r * 0.95 + pk, r * 0.86, -r * 0.1); dark.closePath();
      fPaint(dark, "#0c0714", lw);
      for (const s of [-1, 1]) socket(s * r * 0.26, -r * 0.34 + pk, r * 0.13, r * 0.1, "#ffd23f", { rot: s * 0.35, k: 0.42 });
      // popcorn heaped round the eyes
      for (let i = 0; i < 9; i++) {
        if (i > 2 && i < 6) continue;
        const pop = Math.pow(0.5 + 0.5 * Math.sin(t * 3 + i * 1.7), 3) * r * (i % 4 === 0 ? 0.45 : 0.03);
        for (let q = 0; q < 3; q++) { const pc = new Path2D(); pc.arc((i - 4) * r * 0.2 + (q - 1) * r * 0.07, -r * 0.14 - pop + (q % 2) * r * 0.05, r * 0.1, 0, Math.PI * 2); fPaint(pc, q === 1 ? "#d9cfb6" : "#b9ad90", lw * 0.5); }
      }
      const box = poly([[-r * 0.95, -r * 0.1], [r * 0.95, -r * 0.1], [r * 0.7, r * 0.86], [-r * 0.7, r * 0.86]]);
      ctx.fillStyle = "#cfc4ab"; ctx.fill(box);
      ctx.save(); ctx.clip(box);
      ctx.fillStyle = "#6e1a2b";
      for (let i = -4; i <= 4; i++) { if (i % 2 === 0) continue; ctx.beginPath(); ctx.moveTo(i * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.155, r * 0.86); ctx.lineTo(i * r * 0.155, r * 0.86); ctx.fill(); }
      ctx.fillStyle = "rgba(60,30,10,0.3)";
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse((hashN(i) - 0.5) * r * 1.4, r * (0.1 + hashN(i + 5) * 0.7), r * 0.12, r * 0.08, i, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(box, r, -r * 0.4, -r * 0.5, 0.4);
      ink(box, lw);
      // a mouth torn in the card
      const maw = [];
      for (let k = 0; k <= 10; k++) maw.push([-r * 0.56 + k * r * 0.112, r * (0.3 + (k % 2 ? 0.1 : 0)) - Math.sin((k / 10) * Math.PI) * r * 0.06]);
      for (let k = 10; k >= 0; k--) maw.push([-r * 0.56 + k * r * 0.112, r * (0.58 - (k % 2 ? 0.1 : 0)) + Math.sin((k / 10) * Math.PI) * r * 0.08]);
      const mp = poly(maw);
      fPaint(mp, "#0c0714", lw * 0.7);
      lightLayer(() => glow(0, r * 0.46, r * 0.5, "#ffd23f", 0.25 + 0.1 * Math.sin(t * 4)));
      const rim = new Path2D();
      rim.roundRect(-r * 1.0, -r * 0.16, r * 2.0, r * 0.13, r * 0.05);
      fPaint(rim, "#cfc4ab", lw * 0.8);
    },

    // A black balloon full of weather.
    balloon(f, r, t, lw, ft) {
      // its string is a thread of lightning
      ctx.lineJoin = "miter";
      for (const [w, c] of [[lw * 1.6, FINK], [lw * 0.7, "#8fe9ff"]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(0, r * 1.2);
        for (let k = 1; k <= 9; k++) ctx.lineTo((k % 2 ? 1 : -1) * r * 0.12 * (1 + 0.3 * Math.sin(t * 9 + k)), r * 1.2 + (k / 9) * (ft - r * 1.3));
        ctx.stroke();
      }
      lightLayer(() => glow(0, ft - r * 0.1, r * 0.4, "#8fe9ff", 0.5));
      const sq = 1 + Math.sin(t * 2.6) * 0.03 + (f.charge ? Math.sin(t * 18) * 0.03 : 0);
      ctx.save();
      ctx.scale(sq, 1 / sq);
      const b = new Path2D();
      b.moveTo(0, r * 1.12); b.bezierCurveTo(-r * 1.25, r * 0.6, -r * 1.2, -r * 1.12, 0, -r * 1.12); b.bezierCurveTo(r * 1.2, -r * 1.12, r * 1.25, r * 0.6, 0, r * 1.12);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.25);
      g.addColorStop(0, "#4a3a7a"); g.addColorStop(0.55, "#1c1436"); g.addColorStop(1, "#07040f");
      ctx.fillStyle = g; ctx.fill(b);
      // a storm inside
      ctx.save(); ctx.clip(b);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = "rgba(120,110,190,0.16)"; ctx.beginPath(); ctx.ellipse((hashN(i) - 0.5) * r * 1.4 + Math.sin(t * 0.7 + i) * r * 0.1, -r * 0.5 + hashN(i + 4) * r * 0.5, r * 0.5, r * 0.22, 0, 0, Math.PI * 2); ctx.fill(); }
      const fl = Math.floor(t * 6);
      if (f.charge || hashN(fl) > 0.5) {
        ctx.strokeStyle = "rgba(190,240,255,0.9)"; ctx.lineWidth = lw * 0.6;
        let x = (hashN(fl + 1) - 0.5) * r, y = -r * 0.9;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (hashN(fl + k * 3) - 0.5) * r * 0.5; y += r * 0.22; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
      ink(b, lw);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.6, r * 0.14, r * 0.3, 0.5, 0, Math.PI * 2); ctx.fill();
      const knot = poly([[-r * 0.14, r * 1.26], [r * 0.14, r * 1.26], [0, r * 1.08]]);
      fPaint(knot, "#1c1436", lw * 0.7);
      // a face of light: two jagged eyes and a stitched grin
      lightLayer(() => glow(0, r * 0.1, r * 0.9, "#8fe9ff", 0.22));
      ctx.fillStyle = "#c8f6ff";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.5, -r * 0.3); ctx.lineTo(s * r * 0.2, -r * 0.14); ctx.lineTo(s * r * 0.3, -r * 0.02); ctx.lineTo(s * r * 0.56, -r * 0.1); ctx.fill(); }
      ctx.strokeStyle = "#c8f6ff"; ctx.lineWidth = r * 0.05; ctx.lineJoin = "round";
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const px = (k - 5) * r * 0.1, py = r * 0.32 + Math.pow((k - 5) / 5, 2) * -r * 0.12 + (k % 2 ? -1 : 1) * r * (f.charge ? 0.09 : 0.05); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.restore();
      // static crawling over it
      ctx.lineJoin = "miter";
      for (let i = 0; i < (f.charge ? 12 : 6); i++) {
        const sd = Math.floor(t * 10) * 7 + i * 13, a = hashN(sd) * Math.PI * 2;
        ctx.strokeStyle = i % 2 ? "#eafcff" : "#8fe9ff"; ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) { const q = r * 1.18 + k * r * 0.11, aa = a + (k % 2 ? 0.13 : -0.09); k ? ctx.lineTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1) : ctx.moveTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1); }
        ctx.stroke();
      }
    },

    // A ticket booth that walks.
    tearer(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.5, r * 0.7], [s * r * 0.62, r * 0.84], [s * r * 0.55, ft - r * 0.06]], r * 0.12, "#3a3350", lw * 0.5);
        for (let k = -1; k <= 1; k++) seg(s * r * 0.55, ft - r * 0.08, s * r * 0.55 + k * r * 0.16, ft, lw * 1.4);
        // arms that end in a punch
        const sw = Math.sin(t * 2 + s) * r * 0.08;
        limb([[s * r * 0.95, -r * 0.2], [s * r * 1.5, -r * 0.5 + sw], [s * r * 1.55, r * 0.1 + sw]], r * 0.1, "#3a3350", lw * 0.5);
        const jaw = new Path2D();
        jaw.moveTo(s * r * 1.4, r * 0.1 + sw); jaw.lineTo(s * r * 1.7, r * 0.1 + sw); jaw.lineTo(s * r * 1.74, r * 0.46 + sw); jaw.lineTo(s * r * 1.62, r * 0.3 + sw); jaw.lineTo(s * r * 1.55, r * 0.48 + sw); jaw.lineTo(s * r * 1.48, r * 0.3 + sw); jaw.lineTo(s * r * 1.36, r * 0.46 + sw); jaw.closePath();
        fBody(jaw, "#8a8498", r * 0.3, lw * 0.7, s * r * 1.5, r * 0.1, 0.3);
      }
      const booth = new Path2D();
      booth.roundRect(-r * 1.0, -r * 0.7, r * 2.0, r * 1.5, r * 0.08);
      fBody(booth, vgrad("#5a1424", "#2a0a14", -r * 0.7, r * 0.8), r * 1.3, lw, -r * 0.4, -r * 0.6, 0.3);
      ctx.save(); ctx.clip(booth);
      ctx.strokeStyle = "rgba(230,220,200,0.18)"; ctx.lineWidth = lw * 0.5;
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.24, -r * 0.7); ctx.lineTo(i * r * 0.24, r * 0.8); ctx.stroke(); }
      ctx.restore();
      // the window: something sits in the dark behind the bars
      const win = new Path2D();
      win.moveTo(-r * 0.62, r * 0.12); win.lineTo(-r * 0.62, -r * 0.2); win.arc(0, -r * 0.2, r * 0.62, Math.PI, 0); win.lineTo(r * 0.62, r * 0.12); win.closePath();
      fPaint(win, "#07040f", lw);
      socket(-r * 0.05 + Math.sin(t * 0.8) * r * 0.18, -r * 0.22, r * 0.2, r * 0.2, "#ff3b4a", { k: 0.45 });
      for (let i = -2; i <= 2; i++) seg(i * r * 0.24, -r * 0.2 - Math.sqrt(Math.max(0, 0.38 - i * i * 0.0576)) * r, i * r * 0.24, r * 0.12, lw * 1.2, "#b9a45a");
      // the slot, with its tongue of tickets
      const slot = new Path2D();
      slot.roundRect(-r * 0.5, r * 0.26, r * 1.0, r * 0.16, r * 0.05);
      fPaint(slot, "#07040f", lw * 0.8);
      for (let k = 0; k < 7; k++) {
        ctx.save();
        ctx.translate(-r * 0.05 - k * r * 0.24, r * 0.4 + k * r * 0.12 + Math.sin(t * 4 + k) * r * 0.04);
        ctx.rotate(-0.42 + Math.sin(t * 4 + k) * 0.14);
        const tk = new Path2D();
        tk.roundRect(-r * 0.13, -r * 0.08, r * 0.26, r * 0.16, r * 0.02);
        fPaint(tk, k % 2 ? BONE : "#b9a45a", lw * 0.5);
        ctx.fillStyle = "rgba(20,10,30,0.5)"; ctx.fillRect(-r * 0.07, -r * 0.02, r * 0.14, r * 0.04);
        ctx.restore();
      }
      // roof and sign
      const roof = poly([[-r * 1.15, -r * 0.7], [-r * 0.9, -r * 1.05], [r * 0.9, -r * 1.05], [r * 1.15, -r * 0.7]]);
      ctx.fillStyle = NIGHT; ctx.fill(roof);
      stripes(roof, "#8f2238", r * 0.13, 0.25, 0);
      ink(roof, lw);
      for (let i = 0; i < 9; i++) { const sc = new Path2D(); sc.arc(-r * 1.02 + i * r * 0.255, -r * 0.7, r * 0.128, 0, Math.PI); sc.closePath(); fPaint(sc, i % 2 ? NIGHT : "#8f2238", lw * 0.6); }
      const sign = new Path2D();
      sign.roundRect(-r * 0.56, -r * 1.36, r * 1.12, r * 0.28, r * 0.04);
      fPaint(sign, NIGHT, lw * 0.8);
      ctx.fillStyle = Math.sin(t * 5) > -0.6 ? "#ffd23f" : "#6a5a1a";
      ctx.font = `${r * 0.2}px "Bungee", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("TICKETS", 0, -r * 1.21);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    },

    // A giant in an iron mask, lifting two small moons.
    strongman(f, r, t, lw, ft) {
      const lift = Math.sin(t * 1.6) * r * 0.05, sob = Math.sin(t * 6) * r * 0.012, by0 = -r * 1.7 + lift;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.34, r * 0.6], [s * r * 0.42, ft - r * 0.14]], r * 0.32, "#3a2f55", lw * 0.5);
        const boot = new Path2D();
        boot.roundRect(s * r * 0.42 - r * 0.3, ft - r * 0.3, r * 0.56, r * 0.3, r * 0.08);
        fBody(boot, NIGHT, r * 0.3, lw * 0.8, s * r * 0.3, ft - r * 0.3, 0.3);
      }
      // the bar, and a moon on each end
      seg(-r * 1.9, by0, r * 1.9, by0, r * 0.13);
      seg(-r * 1.9, by0, r * 1.9, by0, r * 0.06, "#8a8498");
      const m1 = new Path2D();
      m1.arc(-r * 1.9, by0, r * 0.42, 0, Math.PI * 2);
      fBody(m1, "#d9d0bc", r * 0.45, lw, -r * 2.0, by0 - r * 0.15, 0.35);
      ctx.fillStyle = "rgba(60,50,70,0.35)";
      for (const [cx2, cy2, cr] of [[-2.0, -0.1, 0.1], [-1.78, 0.14, 0.07], [-1.95, 0.2, 0.05]]) { ctx.beginPath(); ctx.arc(cx2 * r, by0 + cy2 * r, cr * r, 0, Math.PI * 2); ctx.fill(); }
      const m2 = new Path2D();
      m2.arc(r * 1.9, by0, r * 0.4, 0, Math.PI * 2);
      fPaint(m2, "#07040f", lw);
      ink(m2, lw * 0.5, "#eaf4ff");
      lightLayer(() => glow(r * 1.9, by0, r * 0.9, "#bfe0ff", 0.4));
      for (const s of [-1, 1]) {
        limb([[s * r * 1.05, -r * 0.5], [s * r * 1.5, -r * 0.95], [s * r * 1.22, by0 + r * 0.1]], r * 0.38, "#3a2f55", lw * 0.5);
        // a band of stars tattooed round each arm
        ctx.fillStyle = "#bfe0ff";
        for (let k = 0; k < 3; k++) sparkle(s * r * (1.2 + k * 0.1), -r * (0.62 + k * 0.1), r * 0.03, "#bfe0ff");
        glove(s * r * 1.22, by0 + r * 0.02, r * 0.17, 0, NIGHT, lw * 0.7);
      }
      const torso = new Path2D();
      torso.moveTo(-r * 1.3, -r * 0.55); torso.quadraticCurveTo(-r * 1.45, -r * 0.1, -r * 0.55, r * 0.78); torso.lineTo(r * 0.55, r * 0.78);
      torso.quadraticCurveTo(r * 1.45, -r * 0.1, r * 1.3, -r * 0.55); torso.quadraticCurveTo(0, -r * 0.98, -r * 1.3, -r * 0.55);
      ctx.fillStyle = vgrad("#4a3d6a", "#2a2140", -r, r); ctx.fill(torso);
      ctx.save(); ctx.clip(torso);
      const sg = new Path2D();
      sg.moveTo(-r * 1.5, r * 0.9); sg.lineTo(-r * 0.95, -r * 0.05); sg.quadraticCurveTo(-r * 0.2, -r * 0.2, r * 0.15, -r * 0.95); sg.lineTo(r * 0.75, -r * 0.95); sg.quadraticCurveTo(r * 0.5, -r * 0.2, r * 1.0, r * 0.1); sg.lineTo(r * 1.5, r * 0.9);
      ctx.fillStyle = "#0e0a1c"; ctx.fill(sg);
      ctx.save(); ctx.clip(sg);
      for (let i = 0; i < 16; i++) sparkle((hashN(i * 3) - 0.5) * r * 2.0, r * (-0.6 + hashN(i * 7) * 1.4), r * (0.025 + hashN(i) * 0.03), i % 3 ? "#7a6ac8" : "#eaf4ff");
      ctx.restore();
      // black tears run all the way down
      ctx.strokeStyle = "rgba(7,4,15,0.8)"; ctx.lineWidth = r * 0.05;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.14, -r * 0.8); ctx.quadraticCurveTo(s * r * 0.3, -r * 0.3, s * r * 0.2, r * 0.5); ctx.stroke(); }
      ctx.restore();
      fShade(torso, r * 1.25, -r * 0.4, -r * 0.6, 0.4);
      ink(torso, lw);
      const belt = new Path2D();
      belt.rect(-r * 0.62, r * 0.56, r * 1.24, r * 0.22);
      fPaint(belt, NIGHT, lw * 0.7);
      const bk = new Path2D();
      bk.arc(0, r * 0.67, r * 0.16, 0, Math.PI * 2);
      fPaint(bk, "#b9a45a", lw * 0.7);
      // a small head in an iron mask
      const helm = new Path2D();
      helm.moveTo(-r * 0.34, -r * 0.72 + sob); helm.lineTo(-r * 0.36, -r * 1.12 + sob); helm.quadraticCurveTo(0, -r * 1.5 + sob, r * 0.36, -r * 1.12 + sob); helm.lineTo(r * 0.34, -r * 0.72 + sob); helm.quadraticCurveTo(0, -r * 0.6 + sob, -r * 0.34, -r * 0.72 + sob);
      fBody(helm, "#6a647a", r * 0.45, lw, -r * 0.12, -r * 1.2, 0.35);
      const slit = new Path2D();
      slit.roundRect(-r * 0.26, -r * 1.1 + sob, r * 0.52, r * 0.1, r * 0.04);
      fPaint(slit, "#05020c", lw * 0.5);
      lightLayer(() => { glow(-r * 0.12, -r * 1.05 + sob, r * 0.2, "#8fe9ff", 0.8); glow(r * 0.12, -r * 1.05 + sob, r * 0.2, "#8fe9ff", 0.8); });
      for (let k = -2; k <= 2; k++) seg(k * r * 0.08, -r * 0.94 + sob, k * r * 0.08, -r * 0.72 + sob, lw * 0.5);
      for (const [rx2, ry2] of [[-0.3, -1.14], [0.3, -1.14], [0, -1.36]]) { const rv = new Path2D(); rv.arc(rx2 * r, ry2 * r + sob, r * 0.03, 0, Math.PI * 2); fPaint(rv, "#b9a45a", lw * 0.3); }
      for (const s of [-1, 1]) tear(s * r * 0.14, -r * 0.98 + sob, r * 0.04, t, s > 0 ? 0 : 0.5);
    },

    // A hooded thing crowned with organ pipes, with a keyboard where its mouth should be.
    calliope(f, r, t, lw, ft) {
      for (let i = -4; i <= 4; i++) {
        const h = r * (1.1 + (4 - Math.abs(i)) * 0.3), px = i * r * 0.27, a = i * 0.11;
        ctx.save();
        ctx.translate(px, -r * 0.5); ctx.rotate(a);
        const pg = ctx.createLinearGradient(-r * 0.11, 0, r * 0.11, 0);
        pg.addColorStop(0, "#3a3020"); pg.addColorStop(0.35, "#c9b272"); pg.addColorStop(0.6, "#8a7440"); pg.addColorStop(1, "#2a2212");
        const p = new Path2D();
        p.roundRect(-r * 0.11, -h, r * 0.22, h, r * 0.04);
        fPaint(p, pg, lw * 0.8);
        const lip = new Path2D();
        lip.ellipse(0, -h, r * 0.13, r * 0.045, 0, 0, Math.PI * 2);
        fPaint(lip, "#120c06", lw * 0.6);
        ctx.fillStyle = FINK; ctx.beginPath(); ctx.moveTo(-r * 0.06, -h * 0.5); ctx.lineTo(r * 0.06, -h * 0.5); ctx.lineTo(0, -h * 0.5 + r * 0.1); ctx.fill();
        const puff = (t * 0.8 + Math.abs(i) * 0.25) % 1;
        lightLayer(() => { ctx.fillStyle = `rgba(220,214,255,${0.5 * (1 - puff)})`; ctx.beginPath(); ctx.arc(Math.sin(puff * 5) * r * 0.1, -h - r * 0.1 - puff * r * 0.8, r * (0.08 + puff * 0.22), 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
      }
      const robe = new Path2D();
      robe.moveTo(-r * 0.95, -r * 0.05);
      robe.bezierCurveTo(-r * 1.0, -r * 1.3, r * 1.0, -r * 1.3, r * 0.95, -r * 0.05);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; robe.lineTo(r * 0.95 * (1 - kk * 0.8) + Math.sin(t * 3 + kk * 6) * r * 0.14, -r * 0.05 + kk * r * 1.55); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; robe.lineTo(-r * 0.95 * (1 - kk * 0.8) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.14, -r * 0.05 + kk * r * 1.55); }
      robe.closePath();
      fBody(robe, vgrad("#3a2f5e", "#120c22", -r, r * 1.5), r * 1.15, lw, -r * 0.3, -r * 0.6, 0.35);
      ctx.save(); ctx.clip(robe);
      ctx.strokeStyle = "rgba(201,184,255,0.25)"; ctx.lineWidth = lw * 0.4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r, r * (0.7 + i * 0.07)); ctx.bezierCurveTo(-r * 0.3, r * (0.6 + i * 0.07), r * 0.3, r * (0.85 + i * 0.07), r, r * (0.7 + i * 0.07)); ctx.stroke(); }
      ctx.fillStyle = "rgba(201,184,255,0.45)";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-r * 0.6 + i * r * 0.3, r * (0.76 + (i % 3) * 0.07), r * 0.05, r * 0.035, -0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // the hood's opening, and what looks out of it
      const face = new Path2D();
      face.ellipse(0, -r * 0.3, r * 0.66, r * 0.6, 0, 0, Math.PI * 2);
      fPaint(face, "#07040f", lw);
      ink(face, lw * 0.5, "#6a5aa0");
      for (const s of [-1, 1]) socket(s * r * 0.3, -r * 0.5, r * 0.16, r * 0.2, "#e6dcff", { rot: -s * 0.3, k: 0.34, dy: r * 0.03, rim: "#8a7ab8" });
      const kb = new Path2D();
      kb.moveTo(-r * 0.5, -r * 0.14); kb.quadraticCurveTo(0, -r * 0.02, r * 0.5, -r * 0.14); kb.lineTo(r * 0.44, r * 0.14); kb.quadraticCurveTo(0, r * 0.28, -r * 0.44, r * 0.14); kb.closePath();
      fPaint(kb, "#07040f", lw * 0.8);
      ctx.save(); ctx.clip(kb);
      for (let k = 0; k < 9; k++) {
        const down = Math.floor(t * 5 + k * 3) % 9 === k, kx = -r * 0.46 + k * r * 0.103, ky = -r * 0.1 + (1 - Math.pow((k - 4) / 4.5, 2)) * r * 0.05;
        ctx.fillStyle = down ? "#c9b8ff" : BONE; ctx.fillRect(kx, ky + (down ? r * 0.03 : 0), r * 0.088, r * 0.3);
        if (k % 7 !== 2 && k % 7 !== 6 && k < 8) { ctx.fillStyle = "#07040f"; ctx.fillRect(kx + r * 0.064, ky, r * 0.06, r * 0.16); }
      }
      ctx.restore();
      for (const s of [-1, 1]) {
        const wv = Math.sin(t * 2.5 + s) * r * 0.2;
        limb([[s * r * 0.86, r * 0.2], [s * r * 1.4, -r * 0.02 + wv], [s * r * 1.56, -r * 0.5 + wv]], r * 0.12, "#2a2148", lw * 0.5);
        longHand(s * r * 1.57, -r * 0.56 + wv, r * 0.13, s * 0.3, BONE, lw, 4);
      }
      const wv = Math.sin(t * 2.5 - 1) * r * 0.2;
      seg(-r * 1.56, -r * 0.66 + wv, -r * 1.98, -r * 1.3 + wv, lw * 1.2);
      seg(-r * 1.56, -r * 0.66 + wv, -r * 1.98, -r * 1.3 + wv, lw * 0.5, BONE);
    },

    // Slick black, with a bone mask, balancing a small eclipse.
    seal(f, r, t, lw, ft) {
      const bob = Math.sin(t * 2.2) * r * 0.05;
      for (const s of [-1, 1]) {
        const fl = new Path2D();
        fl.ellipse(r * 1.34, r * 0.45 + s * r * 0.17, r * 0.36, r * 0.13, s * 0.6 - 0.5 + Math.sin(t * 3) * 0.2, 0, Math.PI * 2);
        fBody(fl, "#120e1e", r * 0.4, lw, r * 1.2, r * 0.3, 0.3);
      }
      const body = new Path2D();
      body.moveTo(-r * 0.92, -r * 0.3 + bob); body.quadraticCurveTo(-r * 0.98, r * 0.5, -r * 0.55, r * 0.86); body.lineTo(r * 0.7, r * 0.86);
      body.quadraticCurveTo(r * 1.32, r * 0.8, r * 1.22, r * 0.45); body.quadraticCurveTo(r * 0.5, r * 0.25, r * 0.18, -r * 0.4 + bob);
      body.quadraticCurveTo(-r * 0.02, -r * 1.2 + bob, -r * 0.6, -r * 1.12 + bob); body.quadraticCurveTo(-r * 1.18, -r * 0.98 + bob, -r * 0.92, -r * 0.3 + bob);
      ctx.fillStyle = vgrad("#2a2440", "#07040f", -r, r); ctx.fill(body);
      ctx.save(); ctx.clip(body);
      // an oil sheen sliding over it
      const cols = ["rgba(255,95,168,0.28)", "rgba(143,233,255,0.28)", "rgba(166,217,74,0.3)", "rgba(138,61,255,0.28)"];
      for (let i = 0; i < 6; i++) { ctx.strokeStyle = cols[i % 4]; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.moveTo(-r * 1.2 + i * r * 0.1 + Math.sin(t + i) * r * 0.1, -r * 1.3); ctx.bezierCurveTo(-r * 0.5 + i * r * 0.1, -r * 0.3, -r * 1.5 + i * r * 0.12, r * 0.3, -r * 0.9 + i * r * 0.14, r); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.5, r * 0.5, r * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      fShade(body, r * 1.2, -r * 0.5, -r * 0.6, 0.3);
      ink(body, lw);
      const flip = new Path2D();
      flip.ellipse(-r * 0.12, r * 0.64, r * 0.52, r * 0.17, 0.5 + Math.sin(t * 4) * 0.15, 0, Math.PI * 2);
      fBody(flip, "#120e1e", r * 0.5, lw, -r * 0.3, r * 0.5, 0.3);
      ctx.save();
      ctx.translate(-r * 0.42, bob); ctx.rotate(0.35);
      ruffle(0, -r * 0.3, r * 0.8, 5, r * 0.12, NIGHT, "#8a8498", lw);
      ctx.restore();
      // the mask
      const mask = new Path2D();
      mask.moveTo(-r * 1.02, -r * 0.62 + bob); mask.quadraticCurveTo(-r * 0.95, -r * 1.02 + bob, -r * 0.5, -r * 1.02 + bob); mask.quadraticCurveTo(-r * 0.08, -r * 0.98 + bob, -r * 0.1, -r * 0.6 + bob);
      mask.quadraticCurveTo(-r * 0.4, -r * 0.46 + bob, -r * 0.72, -r * 0.32 + bob); mask.quadraticCurveTo(-r * 1.06, -r * 0.36 + bob, -r * 1.02, -r * 0.62 + bob);
      fBody(mask, BONE, r * 0.5, lw, -r * 0.7, -r * 0.9, 0.3);
      socket(-r * 0.7, -r * 0.74 + bob, r * 0.1, r * 0.07, "#a6d94a", { rot: 0.35, k: 0.4 });
      socket(-r * 0.36, -r * 0.78 + bob, r * 0.12, r * 0.08, "#a6d94a", { rot: -0.3, k: 0.4 });
      ink(poly([[-r * 0.5, -r * 1.0 + bob], [-r * 0.56, -r * 0.86 + bob], [-r * 0.48, -r * 0.8 + bob]]), lw * 0.4);
      const nose = new Path2D();
      nose.ellipse(-r * 0.9, -r * 0.48 + bob, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
      fPaint(nose, NIGHT, lw * 0.5);
      for (let k = -1; k <= 1; k++) seg(-r * 0.78, -r * 0.42 + bob, -r * 0.4, -r * 0.36 + bob + k * r * 0.08, 1.2, "rgba(20,10,30,0.6)");
      // the eclipse it balances
      const bx = -r * 1.02, by2 = -r * 1.0 + bob - Math.abs(Math.sin(t * 2.2)) * r * 0.26;
      lightLayer(() => glow(bx, by2, r * 0.8, "#bfe0ff", 0.45));
      const ball = new Path2D();
      ball.arc(bx, by2, r * 0.3, 0, Math.PI * 2);
      fPaint(ball, "#05020c", lw * 0.8);
      ink(ball, lw * 0.5, "#eaf4ff");
      ctx.save(); ctx.translate(bx, by2); ctx.rotate(-0.4 + t * 0.5);
      const ring = new Path2D();
      ring.ellipse(0, 0, r * 0.5, r * 0.1, 0, 0.2, Math.PI - 0.2);
      ink(ring, lw * 1.2); ink(ring, lw * 0.5, "#bfe0ff");
      ctx.restore();
      // it drips
      ctx.fillStyle = "#07040f";
      for (let i = 0; i < 4; i++) { const len = r * (0.1 + 0.12 * Math.abs(Math.sin(t * 1.3 + i * 2))); ctx.beginPath(); ctx.moveTo(-r * 0.3 + i * r * 0.3 - r * 0.07, r * 0.86); ctx.quadraticCurveTo(-r * 0.3 + i * r * 0.3, r * 0.86 + len * 2, -r * 0.3 + i * r * 0.3 + r * 0.07, r * 0.86); ctx.fill(); }
    },

    // A bell jar on legs with a storm and one eye inside, juggling glass eyes.
    glass(f, r, t, lw, ft) {
      for (const s of [-1, 0, 1]) {
        limb([[s * r * 0.3, r * 0.98], [s * r * 0.55, ft - r * 0.25], [s * r * 0.5, ft - r * 0.04]], r * 0.06, "#b9a45a", lw * 0.4);
        const ft2 = new Path2D();
        ft2.arc(s * r * 0.5, ft - r * 0.03, r * 0.06, 0, Math.PI * 2);
        fPaint(ft2, "#b9a45a", lw * 0.4);
      }
      const base = new Path2D();
      base.roundRect(-r * 0.74, r * 0.84, r * 1.48, r * 0.2, r * 0.06);
      fBody(base, "#8a7440", r * 0.5, lw, -r * 0.3, r * 0.8, 0.3);
      const jar = new Path2D();
      jar.moveTo(-r * 0.64, r * 0.86); jar.lineTo(-r * 0.64, -r * 0.5); jar.bezierCurveTo(-r * 0.64, -r * 1.3, r * 0.64, -r * 1.3, r * 0.64, -r * 0.5); jar.lineTo(r * 0.64, r * 0.86); jar.closePath();
      ctx.fillStyle = "rgba(120,200,215,0.22)"; ctx.fill(jar);
      ctx.save(); ctx.clip(jar);
      // the storm
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(${40 + i * 8},${70 + i * 6},${90 + i * 5},0.5)`; ctx.beginPath(); ctx.ellipse((hashN(i) - 0.5) * r * 0.9 + Math.sin(t * 0.9 + i) * r * 0.1, r * (0.2 + hashN(i + 3) * 0.5), r * 0.42, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
      const fl = Math.floor(t * 5);
      if (hashN(fl) > 0.45) { ctx.strokeStyle = "rgba(220,250,255,0.9)"; ctx.lineWidth = lw * 0.5; let x = (hashN(fl + 2) - 0.5) * r * 0.6, y = r * 0.1; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (hashN(fl + k * 5) - 0.5) * r * 0.4; y += r * 0.18; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.restore();
      // one eye, looking at you
      const ey = -r * 0.42 + Math.sin(t * 1.3) * r * 0.05;
      const eb = new Path2D();
      eb.ellipse(0, ey, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
      fPaint(eb, BONE, lw * 0.8);
      ctx.save(); ctx.clip(eb);
      ctx.fillStyle = "#2fb7c9"; ctx.beginPath(); ctx.arc(-r * 0.1, ey + r * 0.02, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#05020c"; ctx.beginPath(); ctx.ellipse(-r * 0.1, ey + r * 0.02, r * 0.05, r * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(214,40,57,0.5)"; ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(r * 0.4, ey - r * 0.2 + k * r * 0.1); ctx.lineTo(r * 0.16, ey - r * 0.1 + k * r * 0.05); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.moveTo(-r * 0.54, -r * 0.6); ctx.lineTo(-r * 0.42, -r * 0.72); ctx.lineTo(-r * 0.42, r * 0.7); ctx.lineTo(-r * 0.54, r * 0.7); ctx.fill();
      ink(jar, lw * 1.4);
      ink(jar, lw * 0.5, "rgba(230,250,255,0.9)");
      const knob = new Path2D();
      knob.arc(0, -r * 1.2, r * 0.12, 0, Math.PI * 2);
      fPaint(knob, "rgba(190,240,250,0.6)", lw * 0.8);
      // arms of bent glass tube, and what it juggles
      for (const s of [-1, 1]) {
        const hy = -r * 0.9 + Math.sin(t * 3.2 + s) * r * 0.1;
        limb([[s * r * 0.64, -r * 0.1], [s * r * 1.1, -r * 0.4], [s * r * 1.0, hy]], r * 0.08, "#a8dfe8", lw * 0.4);
        longHand(s * r * 1.0, hy - r * 0.04, r * 0.11, 0, "#d6f4f8", lw, 3);
      }
      for (let k = 0; k < 4; k++) {
        const a = t * 3.2 + k * 1.57, px = Math.cos(a) * r * 1.0, py = -r * 1.75 - Math.abs(Math.sin(a)) * r * 0.9;
        const gb = new Path2D();
        gb.arc(px, py, r * 0.2, 0, Math.PI * 2);
        fPaint(gb, BONE, lw * 0.7);
        ctx.fillStyle = k % 2 ? "#2fb7c9" : "#8f2238"; ctx.beginPath(); ctx.arc(px + Math.cos(a) * r * 0.05, py + r * 0.03, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#05020c"; ctx.beginPath(); ctx.arc(px + Math.cos(a) * r * 0.05, py + r * 0.03, r * 0.045, 0, Math.PI * 2); ctx.fill();
      }
    },

    // Wings of broken mirror, and a pale face like a mask.
    moth(f, r, t, lw, ft) {
      const flap = Math.sin(t * 7) * 0.2;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.scale(s, 1);
        ctx.rotate(flap * 0.6);
        ctx.translate(0, -r * 0.12);
        // each wing is a fan of long shards, like feathers of broken mirror
        const shards = [[1.0, 1.05, 0.3], [0.56, 1.35, 0.36], [0.12, 1.6, 0.4], [-0.32, 1.95, 0.44], [-0.74, 2.2, 0.44], [-1.14, 2.25, 0.38]];
        shards.forEach(([a, len, w], i) => {
          ctx.save();
          ctx.rotate(a);
          const L = len * r, p = poly([[r * 0.12, 0], [L * 0.5, -w * r], [L * 0.86, -w * r * 0.7], [L + (i % 2 ? r * 0.12 : 0), w * r * (i % 2 ? -0.1 : 0.2)], [L * 0.66, w * r * 0.7]]);
          const lg = ctx.createLinearGradient(0, -w * r, L, w * r);
          lg.addColorStop(0, "#0b1f26"); lg.addColorStop(0.5, i % 2 ? "#2c6878" : "#3e8494"); lg.addColorStop(1, "#0e2a33");
          ctx.fillStyle = lg; ctx.fill(p);
          ctx.save(); ctx.clip(p);
          ctx.fillStyle = "rgba(220,250,255,0.22)";
          const sx = ((t * 0.3 + i * 0.3) % 1) * L * 1.4;
          ctx.beginPath(); ctx.moveTo(sx, -r); ctx.lineTo(sx + r * 0.2, -r); ctx.lineTo(sx - r * 0.3, r); ctx.lineTo(sx - r * 0.5, r); ctx.fill();
          ctx.restore();
          ink(p, lw * 1.2);
          ink(p, lw * 0.4, "#bff4ff");
          if (i === 4) {
            // an eye in the wing, cracked across
            socket(L * 0.62, -w * r * 0.1, r * 0.2, r * 0.25, "#ff5a6e", { k: 0.36 });
            ink(poly([[L * 0.62 - r * 0.26, -r * 0.22], [L * 0.62, 0], [L * 0.62 + r * 0.24, -r * 0.14]]), lw * 0.4, "#bff4ff");
          }
          ctx.restore();
        });
        ctx.restore();
      }
      for (const s of [-1, 1]) {
        limb([[s * r * 0.15, r * 0.9], [s * r * 0.34, ft - r * 0.3], [s * r * 0.24, ft - r * 0.06]], r * 0.05, FINK, 0);
        limb([[s * r * 0.36, -r * 0.2], [s * r * 0.7, r * 0.1], [s * r * 0.56, r * 0.4 + Math.sin(t * 3 + s) * r * 0.05]], r * 0.06, FINK, 0);
      }
      const abd = new Path2D();
      abd.moveTo(-r * 0.3, r * 0.1); abd.bezierCurveTo(-r * 0.42, r * 0.7, -r * 0.18, r * 1.2, 0, r * 1.22); abd.bezierCurveTo(r * 0.18, r * 1.2, r * 0.42, r * 0.7, r * 0.3, r * 0.1); abd.closePath();
      ctx.fillStyle = "#2a2440"; ctx.fill(abd);
      ctx.save(); ctx.clip(abd); ctx.fillStyle = "#0e0a1c";
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(0, r * 0.22 + k * r * 0.19, r * 0.5, r * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(abd, r * 0.6, -r * 0.1, r * 0.3, 0.3);
      ink(abd, lw);
      const thor = new Path2D();
      thor.ellipse(0, -r * 0.2, r * 0.44, r * 0.48, 0, 0, Math.PI * 2);
      fBody(thor, "#16101f", r * 0.5, lw, -r * 0.1, -r * 0.4, 0.3);
      for (let k = 0; k < 11; k++) { const a = Math.PI + (k / 10) * Math.PI, fz = new Path2D(); fz.arc(Math.cos(a) * r * 0.42, -r * 0.54 + Math.sin(a) * r * 0.1, r * (0.12 + (k % 2) * 0.03), 0, Math.PI * 2); fPaint(fz, k % 2 ? "#8a8498" : "#cfc6d8", lw * 0.5); }
      // the face: a pale mask, eyes like holes
      const head = new Path2D();
      head.moveTo(0, -r * 0.6); head.bezierCurveTo(-r * 0.46, -r * 0.62, -r * 0.46, -r * 1.3, 0, -r * 1.32); head.bezierCurveTo(r * 0.46, -r * 1.3, r * 0.46, -r * 0.62, 0, -r * 0.6);
      fBody(head, BONE, r * 0.42, lw, -r * 0.1, -r * 1.1, 0.3);
      for (const s of [-1, 1]) {
        socket(s * r * 0.17, -r * 1.0, r * 0.13, r * 0.17, "#ff5a6e", { rot: s * 0.3, k: 0.28, dy: r * 0.03 });
        ctx.strokeStyle = FINK; ctx.lineWidth = lw * 0.8;
        ctx.beginPath(); ctx.moveTo(s * r * 0.12, -r * 1.28); ctx.quadraticCurveTo(s * r * 0.3, -r * 1.9, s * r * 0.8, -r * 1.84 + Math.sin(t * 2 + s) * r * 0.06); ctx.stroke();
        ctx.lineWidth = lw * 0.4;
        for (let k = 1; k < 8; k++) { const kk = k / 8, px = s * r * (0.12 + kk * 0.65), py = -r * (1.3 + Math.sin(kk * Math.PI * 0.6) * 0.58); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s * r * 0.03, py + r * 0.15); ctx.moveTo(px, py); ctx.lineTo(px - s * r * 0.02, py - r * 0.1); ctx.stroke(); }
      }
      for (let k = -2; k <= 2; k++) seg(k * r * 0.05, -r * 0.78, k * r * 0.05, -r * 0.68, lw * 0.4);
    },

    // Your own Jinx, stepping out of a cracked mirror with the colours wrong.
    double(f, r, t, lw, ft) {
      const m = f.mimic || { hue: 320, align: 0, stage: "child", seed: 2, stats: { juggle: { lv: 1 }, tumble: { lv: 1 }, glow: { lv: 1 }, grit: { lv: 1 } } };
      const copy = Object.assign({}, m, { hue: (m.hue + 180) % 360, mood: 90, seed: (m.seed || 0) + 3, hat: null });
      const sc = r / (30 * U), wob = 1 + Math.sin(t * 2.3) * 0.1;
      const fr = new Path2D();
      fr.moveTo(-r * 0.95, ft); fr.lineTo(-r * 0.95, -r * 0.7); fr.lineTo(0, -r * 1.9); fr.lineTo(r * 0.95, -r * 0.7); fr.lineTo(r * 0.95, ft); fr.closePath();
      ctx.fillStyle = vgrad("#12333c", "#05101a", -r * 1.9, ft); ctx.fill(fr);
      ctx.save(); ctx.clip(fr);
      ctx.fillStyle = "rgba(200,245,255,0.12)";
      const sx = ((t * 0.4) % 1.6) * r * 3 - r * 2;
      ctx.beginPath(); ctx.moveTo(sx, -r * 2); ctx.lineTo(sx + r * 0.4, -r * 2); ctx.lineTo(sx - r * 0.5, ft); ctx.lineTo(sx - r * 0.9, ft); ctx.fill();
      // cracks spreading from where it came through
      ctx.strokeStyle = "rgba(191,244,255,0.7)"; ctx.lineWidth = lw * 0.4;
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.2; let x = 0, y = -r * 0.3; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(a + (hashN(i * 5 + k) - 0.5) * 0.9) * r * 0.36; y += Math.sin(a + (hashN(i * 7 + k) - 0.5) * 0.9) * r * 0.36; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.restore();
      ink(fr, lw * 2.6);
      ink(fr, lw * 1.4, "#3a2f55");
      ink(fr, lw * 0.4, "#8a7ab8");
      for (const [px, py] of [[-0.95, -0.7], [0.95, -0.7], [0, -1.9]]) { const kn = new Path2D(); kn.arc(px * r, py * r, r * 0.09, 0, Math.PI * 2); fPaint(kn, "#b9a45a", lw * 0.6); }
      ctx.save();
      ctx.translate(0, ft);
      ctx.scale(wob, 1 / wob);
      D.drawJinx(copy, 0, 0, { t: t + 5, dir: -1, scale: sc, evil: true });
      ctx.restore();
      // shards hanging in the air round it
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + t * 0.3, d = r * (1.25 + 0.2 * Math.sin(t * 1.3 + i)), px = Math.cos(a) * d, py = -r * 0.4 + Math.sin(a) * d * 0.9, sz = r * (0.1 + hashN(i) * 0.1);
        ctx.save(); ctx.translate(px, py); ctx.rotate(a * 2 + t);
        const sh = poly([[0, -sz * 1.4], [sz * 0.7, sz * 0.4], [-sz * 0.5, sz]]);
        fPaint(sh, "#2c6878", lw * 0.6);
        ink(sh, lw * 0.3, "#bff4ff");
        ctx.restore();
      }
      lightLayer(() => {
        if (Math.sin(t * 17) > 0.5) { ctx.fillStyle = "rgba(255,40,80,0.3)"; ctx.fillRect(-r * 1.5, Math.sin(t * 31) * r * 0.8, r * 3, r * 0.08); }
        if (Math.sin(t * 13 + 2) > 0.6) { ctx.fillStyle = "rgba(40,220,255,0.3)"; ctx.fillRect(-r * 1.5, Math.cos(t * 23) * r * 0.8, r * 3, r * 0.06); }
      });
    },

    // A shadow with nobody to cast it: stretched thin, with a white smile.
    shadow(f, r, t, lw, ft) {
      // the pool it rises out of
      const pool = new Path2D();
      pool.ellipse(0, ft - r * 0.05, r * 1.3, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#05020c"; ctx.fill(pool);
      const body = new Path2D();
      body.moveTo(-r * 0.62, -r * 0.5);
      body.bezierCurveTo(-r * 0.4, 0, -r * 0.34, r * 0.6, -r * 0.9, ft - r * 0.08);
      body.lineTo(r * 0.9, ft - r * 0.08);
      body.bezierCurveTo(r * 0.34, r * 0.6, r * 0.4, 0, r * 0.62, -r * 0.5);
      body.quadraticCurveTo(0, -r * 0.8, -r * 0.62, -r * 0.5);
      ctx.fillStyle = vgrad("#1a1030", "#05020c", -r * 0.6, ft); ctx.fill(body);
      // a long tail coat, cut in two points
      for (const s of [-1, 1]) {
        const tail = new Path2D();
        tail.moveTo(s * r * 0.5, -r * 0.2); tail.bezierCurveTo(s * r * 1.0, r * 0.3, s * r * 0.9, r * 0.9, s * r * (1.25 + 0.06 * Math.sin(t * 2 + s)), r * 1.3); tail.bezierCurveTo(s * r * 0.8, r * 1.0, s * r * 0.5, r * 0.6, s * r * 0.3, r * 0.3); tail.closePath();
        ctx.fillStyle = "#0c0718"; ctx.fill(tail);
        ink(tail, lw * 0.6, "rgba(255,59,74,0.6)");
      }
      ink(body, lw * 0.7, "rgba(255,59,74,0.7)");
      ctx.strokeStyle = "rgba(255,59,74,0.45)"; ctx.lineWidth = lw * 0.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.6); ctx.lineTo(-r * 0.04, r * 0.3); ctx.moveTo(r * 0.3, -r * 0.6); ctx.lineTo(r * 0.04, r * 0.3); ctx.stroke();
      ctx.fillStyle = "rgba(255,59,74,0.8)";
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, r * (0.4 + i * 0.22), r * 0.035, 0, Math.PI * 2); ctx.fill(); }
      // arms too long, fingers longer
      const wv = Math.sin(t * 2) * r * 0.06;
      limb([[-r * 0.56, -r * 0.4], [-r * 1.2, -r * 0.2 + wv], [-r * 1.3, r * 0.5 + wv]], r * 0.1, "#0c0718", lw * 0.3);
      longHand(-r * 1.3, r * 0.56 + wv, r * 0.17, Math.PI, "#0c0718", lw * 0.5, 4);
      limb([[r * 0.56, -r * 0.4], [r * 1.15, -r * 0.7 - wv], [r * 1.4, -r * 1.3 - wv]], r * 0.1, "#0c0718", lw * 0.3);
      // the whip, cracking
      ctx.lineCap = "round";
      for (const [w, c] of [[lw * 1.5, "#0c0718"], [lw * 0.4, "rgba(255,59,74,0.8)"]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(r * 1.4, -r * 1.3 - wv);
        for (let k = 1; k <= 16; k++) { const kk = k / 16; ctx.lineTo(r * 1.4 - kk * r * 3.0, -r * 1.3 - wv - Math.sin(kk * 5 - t * 6) * r * 0.4 * kk - Math.sin(kk * Math.PI) * r * 0.9); }
        ctx.stroke();
      }
      // a small head under a hat that goes on and on
      const head = new Path2D();
      head.ellipse(0, -r * 0.98, r * 0.34, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0718"; ctx.fill(head);
      ink(head, lw * 0.7, "rgba(255,59,74,0.7)");
      ctx.fillStyle = "#fbf8f2";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.05, -r * 1.02); ctx.quadraticCurveTo(s * r * 0.18, -r * 1.14, s * r * 0.28, -r * 1.1); ctx.quadraticCurveTo(s * r * 0.2, -r * 1.0, s * r * 0.05, -r * 1.02); ctx.fill(); }
      lightLayer(() => glow(0, -r * 1.0, r * 0.5, "#ffffff", 0.25));
      const grin = new Path2D();
      grin.moveTo(-r * 0.24, -r * 0.88); grin.quadraticCurveTo(0, -r * 0.66, r * 0.24, -r * 0.88); grin.quadraticCurveTo(0, -r * 0.78, -r * 0.24, -r * 0.88);
      ctx.fillStyle = "#fbf8f2"; ctx.fill(grin);
      ctx.strokeStyle = "#0c0718"; ctx.lineWidth = lw * 0.4;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.06, -r * 0.88); ctx.lineTo(k * r * 0.06, -r * 0.7); ctx.stroke(); }
      const hat = poly([[-r * 0.3, -r * 1.3], [-r * 0.34, -r * 2.25], [r * 0.36, -r * 2.35], [r * 0.3, -r * 1.3]]);
      ctx.fillStyle = "#0c0718"; ctx.fill(hat);
      ink(hat, lw * 0.7, "rgba(255,59,74,0.7)");
      ctx.fillStyle = "#ff3b4a"; ctx.fillRect(-r * 0.31, -r * 1.56, r * 0.62, r * 0.14);
      const brim = new Path2D();
      brim.ellipse(0, -r * 1.3, r * 0.6, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0718"; ctx.fill(brim);
      ink(brim, lw * 0.7, "rgba(255,59,74,0.7)");
    },

    // A standing mirror in a ringmaster's coat. Every shard of its face has an eye.
    mirrorrm(f, r, t, lw, ft, hpK) {
      const cape = new Path2D();
      cape.moveTo(-r * 0.55, -r * 0.85);
      cape.bezierCurveTo(-r * 1.5, -r * 0.3, -r * 1.3, r * 0.6, -r * 1.1 + Math.sin(t * 2) * r * 0.1, ft - r * 0.05);
      for (let k = 0; k <= 8; k++) cape.lineTo(-r * 1.1 + k * r * 0.275 + Math.sin(t * 2 + k) * r * 0.05, ft - r * 0.05 - (k % 2) * r * 0.12);
      cape.bezierCurveTo(r * 1.3, r * 0.6, r * 1.5, -r * 0.3, r * 0.55, -r * 0.85);
      cape.closePath();
      fBody(cape, vgrad("#5a1424", "#16060c", -r, r * 1.2), r * 1.5, lw, -r * 0.4, -r * 0.5, 0.4);
      for (const s of [-1, 1]) {
        const col = new Path2D();
        col.moveTo(s * r * 0.7, -r * 0.8); col.quadraticCurveTo(s * r * 1.1, -r * 1.4, s * r * 0.5, -r * 1.25); col.lineTo(s * r * 0.35, -r * 0.85); col.closePath();
        fPaint(col, "#2a0a14", lw * 0.8);
        limb([[s * r * 0.2, r * 0.95], [s * r * 0.24, ft - r * 0.14]], r * 0.13, NIGHT, lw * 0.4);
        shoe(s * r * 0.24 - r * 0.08, ft, r * 0.16, -1, NIGHT, lw * 0.7);
      }
      const fr = new Path2D();
      fr.moveTo(-r * 0.62, r * 1.0); fr.lineTo(-r * 0.62, -r * 0.5); fr.arc(0, -r * 0.5, r * 0.62, Math.PI, 0); fr.lineTo(r * 0.62, r * 1.0); fr.closePath();
      ctx.fillStyle = vgrad("#2c6878", "#07161c", -r * 1.1, r); ctx.fill(fr);
      ctx.save(); ctx.clip(fr);
      // the glass is in pieces, and something looks out of each
      const c0 = [0.05, -0.15], pts = [[-0.7, -1.2], [0.1, -1.2], [0.7, -0.7], [0.7, 0.2], [0.3, 1.1], [-0.4, 1.1], [-0.7, 0.3], [-0.7, -0.5]];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        ctx.fillStyle = ["rgba(200,245,255,0.16)", "rgba(4,12,16,0.35)", "rgba(143,233,255,0.1)", "rgba(4,12,16,0.2)"][i % 4];
        ctx.beginPath(); ctx.moveTo(c0[0] * r, c0[1] * r); ctx.lineTo(p[0] * r, p[1] * r); ctx.lineTo(q[0] * r, q[1] * r); ctx.fill();
      });
      ctx.strokeStyle = "rgba(191,244,255,0.6)"; ctx.lineWidth = lw * 0.4;
      pts.forEach((p) => { ctx.beginPath(); ctx.moveTo(c0[0] * r, c0[1] * r); ctx.lineTo(p[0] * r, p[1] * r); ctx.stroke(); });
      const eyes = [[-0.26, -0.62, 0.15], [0.3, -0.52, 0.12], [0.36, 0.02, 0.09], [-0.34, -0.1, 0.1], [-0.1, 0.42, 0.11], [0.26, 0.56, 0.07], [-0.36, 0.7, 0.06]];
      eyes.forEach(([ex, ey, es], i) => {
        const open = Math.sin(t * 1.3 + i * 2.1) > -0.8;
        const eb = new Path2D();
        eb.ellipse(ex * r, ey * r, es * r, es * r * (open ? 0.7 : 0.1), i * 0.4 - 0.6, 0, Math.PI * 2);
        fPaint(eb, BONE, lw * 0.5);
        if (open) { ctx.fillStyle = "#d62839"; ctx.beginPath(); ctx.arc(ex * r + Math.sin(t + i) * es * r * 0.25, ey * r, es * r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#05020c"; ctx.beginPath(); ctx.arc(ex * r + Math.sin(t + i) * es * r * 0.25, ey * r, es * r * 0.2, 0, Math.PI * 2); ctx.fill(); }
      });
      // more cracks as it is hurt
      ctx.strokeStyle = "rgba(5,2,12,0.9)"; ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < Math.round((1 - hpK) * 8); i++) {
        let px = (hashN(i * 3.1) - 0.5) * r * 0.9, py = (hashN(i * 7.7) - 0.5) * r * 1.6;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (hashN(i * 11 + k) - 0.5) * r * 0.4; py += (hashN(i * 13 + k) - 0.3) * r * 0.35; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      const sx = ((t * 0.5) % 2) * r * 3 - r * 2;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.moveTo(sx, -r * 1.3); ctx.lineTo(sx + r * 0.3, -r * 1.3); ctx.lineTo(sx - r * 0.4, r * 1.3); ctx.lineTo(sx - r * 0.7, r * 1.3); ctx.fill();
      ctx.restore();
      ink(fr, lw * 3);
      ink(fr, lw * 1.9, "#8a7440");
      ink(fr, lw * 0.5, "#e6d28a");
      for (const s of [-1, 1]) {
        const hx = s * r * 1.02, hy = r * 0.15 + Math.sin(t * 2 + s) * r * 0.05;
        limb([[s * r * 0.62, -r * 0.35], [s * r * 0.98, -r * 0.1], [hx, hy]], r * 0.14, "#3a0c18", lw * 0.4);
        longHand(hx, hy + r * 0.06, r * 0.13, Math.PI, BONE, lw, 4);
      }
      // a cane with a shard for a head
      seg(-r * 1.02, r * 0.2, -r * 1.18, ft - r * 0.03, r * 0.09);
      seg(-r * 1.02, r * 0.2, -r * 1.18, ft - r * 0.03, r * 0.04, "#3a2f55");
      const sh = poly([[-r * 1.02, -r * 0.2], [-r * 0.88, r * 0.14], [-r * 1.02, r * 0.26], [-r * 1.16, r * 0.14]]);
      fPaint(sh, "#2c6878", lw * 0.6);
      ink(sh, lw * 0.3, "#bff4ff");
      // a hat too tall
      ctx.save(); ctx.translate(0, -r * 1.1); ctx.rotate(0.06);
      const hat = poly([[-r * 0.36, 0], [-r * 0.42, -r * 1.25], [r * 0.44, -r * 1.3], [r * 0.36, 0]]);
      fBody(hat, NIGHT, r * 0.6, lw, -r * 0.2, -r * 0.8, 0.35);
      ctx.fillStyle = "#8f2238"; ctx.fillRect(-r * 0.37, -r * 0.34, r * 0.74, r * 0.18);
      const bk = poly([[0, -r * 0.4], [r * 0.09, -r * 0.25], [0, -r * 0.1], [-r * 0.09, -r * 0.25]]);
      fPaint(bk, "#2c6878", lw * 0.5);
      const brim = new Path2D();
      brim.ellipse(0, 0, r * 0.7, r * 0.13, 0, 0, Math.PI * 2);
      fPaint(brim, NIGHT, lw);
      ctx.restore();
    },

    // A falling moon with a painted grin and a tail of cold fire.
    comet(f, r, t, lw, ft) {
      for (let layer = 0; layer < 3; layer++) {
        const p = new Path2D(), L2 = r * (2.8 - layer * 0.6), wd = r * (1.02 - layer * 0.22);
        p.moveTo(0, -wd);
        for (let k = 1; k <= 12; k++) { const kk = k / 12; p.lineTo(kk * L2 + Math.sin(t * 9 + k * 1.3 + layer) * r * 0.13, -wd * (1 - kk) - kk * r * 0.55 + (k % 2 ? -1 : 1) * r * 0.16 * (1 - kk)); }
        for (let k = 12; k >= 1; k--) { const kk = k / 12; p.lineTo(kk * L2 * 0.92 + Math.sin(t * 8 + k * 1.7 + layer) * r * 0.13, wd * (1 - kk) - kk * r * 0.3 + (k % 2 ? 1 : -1) * r * 0.16 * (1 - kk)); }
        p.lineTo(0, wd); p.closePath();
        fPaint(p, ["#2a1f6a", "#6a4ad6", "#c9b8ff"][layer], layer ? lw * 0.5 : lw);
      }
      for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i * 0.17) % 1; sparkle(r * (1 + k * 2.2), -r * 0.6 * k + (hashN(i) - 0.5) * r, r * 0.07 * (1 - k), `rgba(220,210,255,${1 - k})`); }
      lightLayer(() => glow(0, 0, r * 2.2, "#8a6aff", 0.3));
      // a ruff of flame
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.08 + (i / 8) * 0.84), fl = new Path2D(), len = r * (0.34 + 0.1 * Math.sin(t * 6 + i));
        fl.moveTo(Math.cos(a - 0.16) * r * 0.9, r * 0.2 + Math.sin(a - 0.16) * r * 0.9); fl.lineTo(Math.cos(a) * (r * 0.95 + len), r * 0.2 + Math.sin(a) * (r * 0.95 + len)); fl.lineTo(Math.cos(a + 0.16) * r * 0.9, r * 0.2 + Math.sin(a + 0.16) * r * 0.9); fl.closePath();
        fPaint(fl, i % 2 ? "#6a4ad6" : "#2a1f6a", lw * 0.6);
      }
      const head = new Path2D();
      head.arc(0, 0, r, 0, Math.PI * 2);
      fBody(head, vgrad("#e9e4f4", "#a79fc4", -r, r), r, lw, -r * 0.3, -r * 0.4, 0.34);
      ctx.save(); ctx.clip(head);
      ctx.fillStyle = "rgba(60,50,100,0.25)";
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse((hashN(i) - 0.5) * r * 1.6, (hashN(i + 7) - 0.5) * r * 1.6, r * 0.14, r * 0.1, i, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      for (const s of [-1, 1]) {
        ctx.fillStyle = NIGHT;
        ctx.beginPath(); ctx.moveTo(s * r * 0.36, -r * 0.78); ctx.lineTo(s * r * 0.36 + r * 0.2, -r * 0.2); ctx.lineTo(s * r * 0.36, r * 0.34); ctx.lineTo(s * r * 0.36 - r * 0.2, -r * 0.2); ctx.fill();
        socket(s * r * 0.36, -r * 0.2, r * 0.13, r * 0.15, "#c9b8ff", { k: 0.4 });
      }
      // a grin sewn on, corner to corner
      const gr = new Path2D();
      gr.moveTo(-r * 0.66, r * 0.14); gr.quadraticCurveTo(0, r * 0.82, r * 0.66, r * 0.14);
      ink(gr, lw * 1.1);
      for (let k = 0; k <= 8; k++) { const u = k / 8, px = -r * 0.66 + u * r * 1.32, py = r * 0.14 + 4 * u * (1 - u) * r * 0.34; seg(px, py - r * 0.07, px, py + r * 0.07, lw * 0.6); }
      fNose(0, r * 0.06, r * 0.1, lw);
      ctx.save(); ctx.translate(-r * 0.15, -r * 0.95); ctx.rotate(-0.2);
      const cone = new Path2D();
      cone.moveTo(-r * 0.32, r * 0.08); cone.quadraticCurveTo(-r * 0.06, -r * 0.4, r * 0.04, -r * 0.8); cone.quadraticCurveTo(r * 0.2, -r * 0.36, r * 0.32, r * 0.08); cone.closePath();
      fBody(cone, NIGHT, r * 0.4, lw, -r * 0.1, -r * 0.4, 0.3);
      for (let i = 0; i < 4; i++) sparkle((hashN(i + 2) - 0.5) * r * 0.3, -r * (0.1 + i * 0.15), r * 0.03, "#c9b8ff");
      const pom = new Path2D();
      pom.arc(r * 0.04, -r * 0.82, r * 0.1, 0, Math.PI * 2);
      fPaint(pom, "#c9b8ff", lw * 0.6);
      ctx.restore();
    },

    // An usher whose coat is the night sky, carrying a caged star.
    usher(f, r, t, lw, ft) {
      const sw = Math.sin(t * 1.2) * 0.12;
      const body = new Path2D();
      body.moveTo(-r * 0.56, -r * 0.72); body.quadraticCurveTo(0, -r * 0.86, r * 0.56, -r * 0.72);
      body.bezierCurveTo(r * 0.7, -r * 0.2, r * 0.95, r * 0.5, r * 0.84, ft);
      for (let k = 0; k <= 8; k++) body.lineTo(r * 0.84 - k * r * 0.21, ft - (k % 2) * r * 0.1);
      body.bezierCurveTo(-r * 0.95, r * 0.5, -r * 0.7, -r * 0.2, -r * 0.56, -r * 0.72);
      ctx.fillStyle = "#06030f"; ctx.fill(body);
      ctx.save(); ctx.clip(body);
      glow(-r * 0.2, r * 0.1, r * 0.9, "#8a3dff", 0.4);
      glow(r * 0.3, r * 0.7, r * 0.7, "#2fb7c9", 0.3);
      for (let i = 0; i < 34; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i * 2.1)); sparkle((hashN(i) - 0.5) * r * 1.6, -r * 0.7 + hashN(i + 30) * (ft + r * 0.7), r * 0.025 * (1 + a), `rgba(255,255,255,${a})`); }
      // a constellation that is nearly a face
      ctx.strokeStyle = "rgba(191,224,255,0.4)"; ctx.lineWidth = 1;
      const cs = [[-0.24, 0.1], [0, 0.3], [0.24, 0.1], [0.3, 0.55], [0, 0.72], [-0.3, 0.55]];
      ctx.beginPath(); cs.forEach((q, i) => (i ? ctx.lineTo(q[0] * r, q[1] * r) : ctx.moveTo(q[0] * r, q[1] * r))); ctx.closePath(); ctx.stroke();
      ctx.restore();
      ink(body, lw * 1.9);
      ink(body, lw * 0.6, "#8fe9ff");
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const bt = new Path2D(); bt.arc(s * r * 0.13, -r * 0.5 + i * r * 0.28, r * 0.05, 0, Math.PI * 2); fPaint(bt, "#b9a45a", lw * 0.4); }
      for (const s of [-1, 1]) {
        const ep = new Path2D();
        ep.ellipse(s * r * 0.56, -r * 0.72, r * 0.3, r * 0.11, s * 0.3, 0, Math.PI * 2);
        fPaint(ep, "#1a1230", lw * 0.7);
        for (let k = 0; k < 5; k++) seg(s * r * (0.38 + k * 0.09), -r * 0.66, s * r * (0.4 + k * 0.09), -r * 0.48, lw * 0.5, "#b9a45a");
      }
      // the lantern
      ctx.save();
      ctx.translate(-r * 1.02, -r * 0.2); ctx.rotate(sw);
      seg(0, 0, 0, r * 0.34, lw * 0.6);
      const cage = new Path2D();
      cage.moveTo(-r * 0.2, r * 0.4); cage.lineTo(r * 0.2, r * 0.4); cage.lineTo(r * 0.24, r * 0.9); cage.lineTo(-r * 0.24, r * 0.9); cage.closePath();
      fPaint(cage, "rgba(20,12,40,0.7)", lw * 0.8);
      lightLayer(() => glow(0, r * 0.66, r * 1.1, "#8fe9ff", 0.6));
      sparkle(0, r * 0.66, r * 0.09, "#eafcff");
      for (let k = -1; k <= 1; k++) seg(k * r * 0.1, r * 0.4, k * r * 0.12, r * 0.9, lw * 0.5);
      const cap = poly([[-r * 0.24, r * 0.4], [0, r * 0.26], [r * 0.24, r * 0.4]]);
      fPaint(cap, "#b9a45a", lw * 0.6);
      ctx.restore();
      limb([[-r * 0.56, -r * 0.42], [-r * 1.05, -r * 0.5], [-r * 1.02, -r * 0.2]], r * 0.13, "#0c0620", lw * 0.4);
      glove(-r * 1.02, -r * 0.22, r * 0.1, Math.PI, BONE, lw * 0.6);
      limb([[r * 0.56, -r * 0.42], [r * 0.95, 0.0], [r * 0.86, r * 0.36]], r * 0.13, "#0c0620", lw * 0.4);
      longHand(r * 0.86, r * 0.42, r * 0.11, Math.PI, BONE, lw, 4);
      // under the cap there is only dark, and three eyes
      const hd = new Path2D();
      hd.ellipse(0, -r * 0.98, r * 0.36, r * 0.32, 0, 0, Math.PI * 2);
      fPaint(hd, "#06030f", lw * 0.6);
      ink(hd, lw * 0.5, "#8fe9ff");
      for (const [ex, ey, es] of [[-0.16, -0.96, 0.07], [0.16, -0.96, 0.07], [0, -1.1, 0.055]]) {
        const open = Math.sin(t * 1.7 + ex * 9) > -0.85;
        if (open) socket(ex * r, ey * r, es * r, es * r, "#8fe9ff", { k: 0.5 }); else seg((ex - es) * r, ey * r, (ex + es) * r, ey * r, lw * 0.5, "#8fe9ff");
      }
      const capP = new Path2D();
      capP.roundRect(-r * 0.4, -r * 1.56, r * 0.8, r * 0.36, r * 0.06);
      fBody(capP, "#1a1230", r * 0.5, lw, -r * 0.2, -r * 1.5, 0.3);
      ctx.fillStyle = "#b9a45a"; ctx.fillRect(-r * 0.4, -r * 1.32, r * 0.8, r * 0.07);
      const visor = new Path2D();
      visor.moveTo(-r * 0.44, -r * 1.2); visor.quadraticCurveTo(0, -r * 1.08, r * 0.44, -r * 1.2); visor.quadraticCurveTo(0, -r * 1.26, -r * 0.44, -r * 1.2);
      fPaint(visor, "#05020c", lw * 0.7);
    },

    // Six wings round a blank face, and none of it quite lines up.
    angel(f, r, t, lw, ft) {
      const wing = (ang, len, n, flap) => {
        for (let k = 0; k < n; k++) {
          ctx.save();
          ctx.rotate(ang + k * 0.2 + Math.sin(t * 5 + ang) * flap * (1 - k * 0.1));
          const fe = new Path2D(), L = r * len * (1 - k * 0.11);
          fe.moveTo(r * 0.3, -r * 0.1); fe.quadraticCurveTo(L * 0.6, -r * 0.2, L, 0); fe.quadraticCurveTo(L * 0.6, r * 0.18, r * 0.3, r * 0.1); fe.closePath();
          ctx.fillStyle = k % 2 ? "#aeb8d0" : "#d6dcea"; ctx.fill(fe);
          ctx.save(); ctx.clip(fe); noiseRect(r * 0.3, -r * 0.2, L, r * 0.4, 10, false); ctx.restore();
          ink(fe, lw * 0.7);
          ctx.restore();
        }
      };
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1); ctx.translate(0, -r * 0.2);
        wing(-1.25, 2.0, 5, 0.08);
        wing(-0.25, 1.7, 4, 0.06);
        wing(0.75, 1.5, 4, 0.05);
        ctx.restore();
      }
      const robe = new Path2D();
      robe.moveTo(-r * 0.6, -r * 0.1);
      robe.bezierCurveTo(-r * 0.64, -r * 0.9, r * 0.64, -r * 0.9, r * 0.6, -r * 0.1);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; robe.lineTo(r * 0.6 * (1 - kk) + Math.sin(t * 3 + kk * 6) * r * 0.12, -r * 0.1 + kk * r * 1.6); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; robe.lineTo(-r * 0.6 * (1 - kk) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.12, -r * 0.1 + kk * r * 1.6); }
      robe.closePath();
      fBody(robe, vgrad("#e9edf6", "#6a7494", -r, r * 1.5), r, lw, -r * 0.3, -r * 0.5, 0.3);
      ctx.save(); ctx.clip(robe);
      ctx.strokeStyle = "rgba(20,30,60,0.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) { const yy = -r + i * r * 0.11 + ((t * 20) % (r * 0.11)); ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke(); }
      ctx.restore();
      for (const s of [-1, 1]) longHand(s * r * 0.1, r * 0.34, r * 0.12, s * -0.25, BONE, lw, 4);
      // the face: an oval with nothing on it but a band of static
      const face = new Path2D();
      face.ellipse(0, -r * 0.68, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
      fBody(face, "#f4f1ea", r * 0.5, lw, -r * 0.14, -r * 0.9, 0.24);
      const band = new Path2D();
      band.rect(-r * 0.5, -r * 0.82, r * 1.0, r * 0.2);
      ctx.save(); ctx.clip(face);
      ctx.fillStyle = "#05020c"; ctx.fill(band);
      noiseRect(-r * 0.45, -r * 0.82, r * 0.9, r * 0.2, 26, false);
      ctx.restore();
      lightLayer(() => glow(0, -r * 0.72, r * 0.6, "#8fe9ff", 0.3));
      // two halos, slipping
      for (const [dx, dy, c] of [[-0.06, 0, "#8fe9ff"], [0.07, -0.05, "#ff5fa8"], [0, -0.02, "#ffffff"]]) {
        const h = new Path2D();
        h.ellipse(dx * r + Math.sin(t * 9) * r * 0.02, -r * 1.42 + dy * r + Math.sin(t * 2) * r * 0.04, r * 0.52, r * 0.13, 0, 0, Math.PI * 2);
        ink(h, r * 0.06, c);
      }
      lightLayer(() => { glow(0, -r * 1.42, r * 0.9, "#8fe9ff", 0.35); if (Math.sin(t * 9) > 0.8) { ctx.fillStyle = "rgba(143,233,255,0.45)"; ctx.fillRect(-r * 1.6, Math.sin(t * 40) * r, r * 3.2, r * 0.07); } });
    },

    // Hanging by the knees from a trapeze that goes up out of sight, hair and arms straight down.
    trapeze(f, r, t, lw, ft, hpK, topY) {
      const sw = Math.sin(t * 1.5) * 0.13, barY = -r * 1.25;
      ctx.save();
      ctx.translate(0, barY);
      ctx.rotate(sw);
      const bar = new Path2D();
      bar.roundRect(-r * 0.9, -r * 0.07, r * 1.8, r * 0.14, r * 0.07);
      fBody(bar, "#8a7440", r * 0.5, lw * 0.7, 0, -r * 0.2, 0.3);
      // legs hooked over the bar
      for (const s of [-1, 1]) {
        limb([[s * r * 0.2, r * 0.5], [s * r * 0.26, r * 0.0], [s * r * 0.3, -r * 0.3], [s * r * 0.2, -r * 0.62]], r * 0.15, NIGHT, lw * 0.5);
        for (let k = 0; k < 3; k++) { const d = poly([[s * r * 0.26, r * (0.36 - k * 0.2) - r * 0.07], [s * r * 0.26 + r * 0.05, r * (0.36 - k * 0.2)], [s * r * 0.26, r * (0.36 - k * 0.2) + r * 0.07], [s * r * 0.26 - r * 0.05, r * (0.36 - k * 0.2)]]); ctx.fillStyle = "#cfc6d8"; ctx.fill(d); }
        const sl = new Path2D();
        sl.ellipse(s * r * 0.2, -r * 0.7, r * 0.11, r * 0.2, s * 0.3, 0, Math.PI * 2);
        fPaint(sl, NIGHT, lw * 0.6);
      }
      // hair, straight down past the head
      const hair = new Path2D();
      hair.moveTo(-r * 0.3, r * 1.8); hair.bezierCurveTo(-r * 0.4 - sw * r * 2, r * 2.4, -r * 0.24 - sw * r * 3, r * 2.9, -sw * r * 3.6, r * 3.3);
      hair.bezierCurveTo(r * 0.24 - sw * r * 3, r * 2.9, r * 0.4 - sw * r * 2, r * 2.4, r * 0.3, r * 1.8);
      fBody(hair, "#0e0a1c", r * 0.6, lw, -r * 0.1, r * 2.2, 0.3);
      ctx.strokeStyle = "rgba(160,150,200,0.35)"; ctx.lineWidth = lw * 0.4;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.1, r * 1.9); ctx.quadraticCurveTo(k * r * 0.12 - sw * r * 2, r * 2.5, -sw * r * 3.5 + k * r * 0.02, r * 3.2); ctx.stroke(); }
      // arms hang, longer than they should be
      for (const s of [-1, 1]) {
        const ax = s * r * 0.6 - sw * r * 2.8, ay = r * 2.75 + Math.sin(t * 2 + s) * r * 0.05;
        limb([[s * r * 0.36, r * 1.0], [s * r * 0.6 - sw * r, r * 1.8], [ax, ay]], r * 0.11, BONE, lw * 0.5);
        longHand(ax, ay + r * 0.04, r * 0.13, Math.PI, BONE, lw, 4);
      }
      const torso = new Path2D();
      torso.moveTo(-r * 0.34, r * 0.35); torso.bezierCurveTo(-r * 0.28, r * 0.7, -r * 0.56, r * 0.95, -r * 0.42, r * 1.2); torso.lineTo(r * 0.42, r * 1.2); torso.bezierCurveTo(r * 0.56, r * 0.95, r * 0.28, r * 0.7, r * 0.34, r * 0.35); torso.closePath();
      ctx.fillStyle = NIGHT; ctx.fill(torso);
      diamonds(torso, "#8a8498", "rgba(0,0,0,0)", r * 0.24, 0, r * 0.5);
      fShade(torso, r * 0.6, -r * 0.2, r * 0.6, 0.35);
      ink(torso, lw);
      ruffle(0, r * 1.16, r * 1.0, 5, r * 0.12, "#8a8498", BONE, lw);
      // the face, upside down: a white mask with its eyes shut
      ctx.save();
      ctx.translate(0, r * 1.6);
      ctx.rotate(Math.PI);
      const head = new Path2D();
      head.ellipse(0, 0, r * 0.38, r * 0.44, 0, 0, Math.PI * 2);
      fBody(head, BONE, r * 0.44, lw, r * 0.1, r * 0.15, 0.3);
      for (const s of [-1, 1]) {
        ctx.fillStyle = NIGHT;
        ctx.beginPath(); ctx.moveTo(s * r * 0.16, -r * 0.3); ctx.lineTo(s * r * 0.23, -r * 0.06); ctx.lineTo(s * r * 0.16, r * 0.22); ctx.lineTo(s * r * 0.09, -r * 0.06); ctx.fill();
        const lid = new Path2D();
        lid.moveTo(s * r * 0.07, -r * 0.06); lid.quadraticCurveTo(s * r * 0.16, r * 0.0, s * r * 0.25, -r * 0.06);
        ink(lid, lw * 0.7, BONE);
      }
      seg(-r * 0.08, r * 0.24, r * 0.08, r * 0.24, lw * 0.6);
      fCrown(0, -r * 0.4, r * 0.5, "#8f2238", lw * 0.8);
      ctx.restore();
      tear(r * 0.16, r * 1.74, r * 0.035, t, 0);
      ctx.restore();
    },

    // Three old televisions stacked into something that watches.
    mother(f, r, t, lw, ft) {
      // cables for legs
      for (let i = 0; i < 8; i++) {
        const sx = (i - 3.5) * r * 0.26, pts = [[sx, r * 0.6]], out = (i - 3.5) * r * 0.42;
        for (let k = 1; k <= 8; k++) { const kk = k / 8; pts.push([sx + out * kk + Math.sin(t * 2 + i + kk * 5) * r * 0.14 * kk, r * 0.6 + Math.sin(kk * Math.PI * 0.5) * (ft - r * 0.62) - Math.sin(kk * Math.PI) * r * 0.25]); }
        limb(pts, r * 0.1, i % 2 ? "#1a1430" : "#2b2140", lw * 0.4);
        const e = pts[pts.length - 1];
        const plug = new Path2D();
        plug.roundRect(e[0] - r * 0.1, e[1] - r * 0.1, r * 0.2, r * 0.14, r * 0.04);
        fPaint(plug, "#8a8498", lw * 0.6);
      }
      const tv = (x, y, w, h, tilt, face) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(tilt);
        const box = new Path2D();
        box.roundRect(-w, -h, w * 2, h * 2, Math.min(w, h) * 0.2);
        fBody(box, vgrad("#3a2f55", "#120c22", -h, h), w * 1.3, lw, -w * 0.4, -h * 0.6, 0.35);
        const scr = new Path2D();
        scr.roundRect(-w * 0.84, -h * 0.76, w * 1.4, h * 1.52, Math.min(w, h) * 0.22);
        ctx.fillStyle = "#06100a"; ctx.fill(scr);
        ctx.save(); ctx.clip(scr);
        noiseRect(-w * 0.84, -h * 0.76, w * 1.4, h * 1.52, Math.round(26 * w / r), true);
        face(w, h);
        ctx.fillStyle = "rgba(212,255,122,0.2)"; ctx.fillRect(-w, -h * 0.76 + ((t * 0.5 + x) % 1) * h * 1.5, w * 2, h * 0.12);
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
        for (let yy = -h; yy < h; yy += r * 0.07) { ctx.beginPath(); ctx.moveTo(-w, yy); ctx.lineTo(w, yy); ctx.stroke(); }
        ctx.restore();
        ink(scr, lw * 1.2);
        for (let k = 0; k < 2; k++) { const dl = new Path2D(); dl.arc(w * 0.78, -h * 0.4 + k * h * 0.5, Math.min(w, h) * 0.11, 0, Math.PI * 2); fPaint(dl, "#8a8498", lw * 0.6); }
        ctx.fillStyle = Math.sin(t * 4 + x) > 0 ? "#ff3b4a" : "#4a0f18";
        ctx.beginPath(); ctx.arc(w * 0.78, h * 0.5, Math.min(w, h) * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      lightLayer(() => glow(-r * 0.1, -r * 0.2, r * 2.2, "#a6d94a", 0.22));
      // bottom: the mouth
      tv(0, r * 0.14, r * 1.1, r * 0.62, 0, (w, h) => {
        mouth(-w * 0.14, -h * 0.2, w * 0.56, { curve: 0.8, open: 0.7, teeth: "sharp", n: 11, fill: "#06100a" }, lw * 0.6);
      });
      // middle: one eye
      tv(r * 0.06, -r * 0.98, r * 0.74, r * 0.5, 0.05, (w, h) => {
        const eb = new Path2D();
        eb.ellipse(-w * 0.14, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#d4ff7a"; ctx.fill(eb);
        ctx.fillStyle = "#06100a"; ctx.beginPath(); ctx.ellipse(-w * 0.14 + Math.sin(t * 0.8) * w * 0.2, 0, w * 0.1, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      });
      // top: a small one, off to one side, showing an eye of its own
      tv(-r * 0.62, -r * 1.7, r * 0.4, r * 0.3, -0.16, (w, h) => {
        ctx.fillStyle = "#d4ff7a"; ctx.beginPath(); ctx.ellipse(-w * 0.14, 0, w * 0.34, h * (Math.sin(t * 1.7) > -0.8 ? 0.4 : 0.06), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#06100a"; ctx.beginPath(); ctx.arc(-w * 0.14, 0, w * 0.12, 0, Math.PI * 2); ctx.fill();
      });
      // rabbit ears with a crown hung on one
      seg(r * 0.3, -r * 1.48, r * 0.05, -r * 2.05, lw * 1.4); seg(r * 0.3, -r * 1.48, r * 0.05, -r * 2.05, lw * 0.6, "#8a8498");
      seg(r * 0.3, -r * 1.48, r * 0.78, -r * 2.0, lw * 1.4); seg(r * 0.3, -r * 1.48, r * 0.78, -r * 2.0, lw * 0.6, "#8a8498");
      lightLayer(() => { if (Math.sin(t * 9) > 0.4) glow(r * 0.05, -r * 2.05, r * 0.4, "#a6d94a", 0.8); });
      ctx.save(); ctx.translate(r * 0.7, -r * 1.86); ctx.rotate(0.45);
      fCrown(0, 0, r * 0.42, "#a6d94a", lw * 0.8);
      ctx.restore();
      // little screens on stalks, watching from the sides
      for (const s of [-1, 1]) {
        const tx = s * r * 1.7, ty = -r * 0.5 + Math.sin(t * 1.8 + s) * r * 0.14;
        limb([[s * r * 1.05, r * 0.1], [s * r * 1.4, r * 0.2], [tx, ty + r * 0.2]], r * 0.07, "#2b2140", lw * 0.4);
        tv(tx, ty, r * 0.3, r * 0.22, s * 0.1, (w, h) => { ctx.fillStyle = "#d4ff7a"; ctx.beginPath(); ctx.arc(-w * 0.14 - s * w * 0.2, 0, h * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#06100a"; ctx.beginPath(); ctx.arc(-w * 0.14 - s * w * 0.3, 0, h * 0.18, 0, Math.PI * 2); ctx.fill(); });
      }
    }
  };
