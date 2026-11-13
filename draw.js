// Jinx Garden: everything drawn on the canvas. No images; all shapes are built in code.
(function () {
  const D = (JG.draw = {});
  let cv, ctx, W = 0, H = 0, DPR = 1, U = 1;
  let bg = null;
  const twinkles = [];
  D.particles = [];
  D.floats = [];

  // ---------- helpers ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  D.rng = rng;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    const A = typeof a === "string" ? hex(a) : a, B = typeof b === "string" ? hex(b) : b;
    return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
  }
  function rgb(c, a) {
    if (typeof c === "string") c = hex(c);
    return a === undefined
      ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
      : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
  }
  D.mix = mix; D.rgb = rgb; D.hsl = hsl;

  D.init = function (canvas) {
    cv = canvas;
    ctx = cv.getContext("2d");
    D.resize();
    addEventListener("resize", D.resize);
  };
  D.size = () => ({ W, H, U });

  D.resize = function () {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth || innerWidth;
    H = cv.clientHeight || innerHeight;
    U = clamp(Math.min(W, H * 1.2) / 760, 0.62, 1.35);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildBg();
    twinkles.length = 0;
    const r = rng(77);
    for (let i = 0; i < 110; i++) twinkles.push({ x: r(), y: r() * 0.75, s: 0.6 + r() * 1.6, ph: r() * 6.28, sp: 0.6 + r() * 2.2 });
  };

  const BGM = 16;
  function buildBg() {
    // built a little bigger than the screen, so it can slide for parallax without being stretched
    bg = document.createElement("canvas");
    const m = BGM * U;
    bg.width = Math.max(1, Math.round((W + m * 2) * DPR));
    bg.height = Math.max(1, Math.round((H + m * 2) * DPR));
    const g = bg.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, m * DPR, m * DPR);
    g.fillStyle = "#04020c";
    g.fillRect(-m, -m, W + m * 2, H + m * 2);
    const lin = g.createLinearGradient(0, 0, 0, H);
    lin.addColorStop(0, "#04020c");
    lin.addColorStop(0.5, "#0f0a28");
    lin.addColorStop(1, "#190b26");
    g.fillStyle = lin;
    g.fillRect(-m, -m, W + m * 2, H + m * 2);
    const r = rng(1999);
    const neb = ["#7a2bd6", "#1f8fa3", "#4a2a9a", "#2f8f7a", "#a8306a"];
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = r() * H * 0.8, rad = (0.15 + r() * 0.35) * Math.max(W, H);
      const c = neb[i % neb.length];
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, rgb(c, 0.1 + r() * 0.07));
      rg.addColorStop(0.5, rgb(c, 0.035));
      rg.addColorStop(1, rgb(c, 0));
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }
    // dust lanes: dark smudges that make the nebula look sludgy
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = r() * H * 0.7, rad = (0.08 + r() * 0.2) * Math.max(W, H);
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, "rgba(6,2,14,0.45)");
      rg.addColorStop(1, "rgba(6,2,14,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }
    const st = 13;
    for (let yy = 0; yy < H; yy += st) {
      for (let xx = (Math.round(yy / st) % 2) * st * 0.5; xx < W; xx += st) {
        const k = Math.max(0, 1 - Math.hypot(xx - W * 0.1, yy - H * 0.95) / (Math.max(W, H) * 0.75));
        const k2 = Math.max(0, 1 - Math.hypot(xx - W * 0.95, yy - H * 0.05) / (Math.max(W, H) * 0.6));
        if (k > 0.04) { g.fillStyle = "rgba(190,60,150,0.14)"; g.beginPath(); g.arc(xx, yy, k * 4.2, 0, Math.PI * 2); g.fill(); }
        if (k2 > 0.04) { g.fillStyle = "rgba(47,183,201,0.14)"; g.beginPath(); g.arc(xx + st * 0.3, yy + st * 0.3, k2 * 3.6, 0, Math.PI * 2); g.fill(); }
      }
    }
    for (let i = 0; i < 700; i++) {
      const s = r();
      g.fillStyle = `rgba(255,${200 + r() * 55 | 0},${220 + r() * 35 | 0},${0.15 + s * 0.6})`;
      g.fillRect(r() * W, r() * H * 0.85, s < 0.97 ? 1 : 2, s < 0.97 ? 1 : 2);
    }
  }

  // Depth: every layer of scenery slides by a different amount as the view shifts. cam runs -1 to 1.
  const cam = { x: 0, y: 0 };
  function camStep(pointer, dt, t) {
    const tx = (pointer ? clamp((pointer[0] / W) * 2 - 1, -1, 1) * 0.7 : 0) + Math.sin(t * 0.13) * 0.3;
    const ty = (pointer ? clamp((pointer[1] / H) * 2 - 1, -1, 1) * 0.6 : 0) + Math.cos(t * 0.1) * 0.2;
    const k = Math.min(1, (dt || 0.016) * 2.5);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    return cam;
  }
  // how far a layer at this depth moves: far things barely, near things a lot, against the view
  const par = (depth) => [-cam.x * depth * U, -cam.y * depth * 0.6 * U];
  function drawBg(t) {
    const m = BGM * U, [bx, by] = par(5), px = (v) => Math.round(v * DPR) / DPR;
    ctx.drawImage(bg, px(-m + bx), px(-m + by), bg.width / DPR, bg.height / DPR);
    const [sx, sy] = par(8);
    for (const s of twinkles) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.sp + s.ph));
      sparkle(s.x * W + sx, s.y * H + sy, s.s * 2.2 * a, `rgba(235,240,255,${a})`);
    }
    ctx.save();
    ctx.translate(...par(34));
    hangers(t);
    ctx.restore();
    // the occasional shooting star
    const ph = (t % 9) / 9;
    if (ph < 0.12) {
      const k = ph / 0.12, sx = W * (0.1 + 0.5 * ((t / 9) % 1)), sy = H * 0.08;
      const x = sx + k * W * 0.3, y = sy + k * H * 0.12;
      const lg = ctx.createLinearGradient(x - 80 * U, y - 32 * U, x, y);
      lg.addColorStop(0, "rgba(143,233,255,0)");
      lg.addColorStop(1, `rgba(255,255,255,${1 - k})`);
      ctx.strokeStyle = lg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 80 * U, y - 32 * U);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  const HANG = [[0.05, 0.2, 0], [0.16, 0.11, 1], [0.29, 0.17, 0], [0.43, 0.08, 0], [0.57, 0.14, 2], [0.7, 0.09, 0], [0.93, 0.18, 1]];
  function hangers(t) {
    const neon = D.paper.neon, cols = neon ? ["#b6ff5c", "#ff4fa3", "#8fe9ff"] : ["#ffd23f", "#fbf8f2", "#ffe680"];
    HANG.forEach(([fx, fy, kind], i) => {
      const len = H * fy, a = Math.sin(t * 0.9 + i * 1.7) * 0.07, x0 = W * fx;
      const x = x0 + Math.sin(a) * len, y = Math.cos(a) * len, s = (kind === 2 ? 20 : 11 + (i % 3) * 3) * U;
      ctx.strokeStyle = "rgba(239,230,210,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, -4); ctx.lineTo(x, y - s); ctx.stroke();
      const p = new Path2D();
      if (kind === 2) {
        p.arc(0, 0, s, 0.6, Math.PI * 2 - 1.0);
        p.arc(s * 0.42, -s * 0.22, s * 0.8, Math.PI * 2 - 1.35, 0.85, true);
        p.closePath();
      } else {
        for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; k ? p.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : p.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        p.closePath();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a * 2 + (kind === 1 ? 0.3 : 0));
      ctx.lineJoin = "round";
      ctx.shadowColor = neon ? cols[i % 3] : "rgba(8,3,16,0.5)";
      ctx.shadowBlur = neon ? 16 * U * DPR : 0;
      ctx.shadowOffsetX = neon ? 0 : 3 * U * DPR;
      ctx.shadowOffsetY = neon ? 0 : 4 * U * DPR;
      ctx.strokeStyle = neon ? cols[i % 3] : "#fbf8f2";
      ctx.lineWidth = 5 * U;
      ctx.stroke(p);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = neon ? "#140a1e" : cols[i % 3];
      ctx.fill(p);
      ctx.strokeStyle = neon ? cols[i % 3] : "#1b1029";
      ctx.lineWidth = 1.5 * U;
      ctx.stroke(p);
      ctx.restore();
    });
  }
  function sparkle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.quadraticCurveTo(x, y, x + r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 2);
    ctx.quadraticCurveTo(x, y, x - r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 2);
    ctx.fill();
  }

  // ---------- paper cut-outs ----------
  // Characters and props are drawn into a small off-screen sheet, then stuck onto the scene with a
  // white cut edge and a hard drop shadow, like pieces of a toy theatre. Soft light (glows, beams,
  // smoke) goes on a second sheet that is laid over the top, so it never gets an edge of its own.
  D.paper = { on: true, edge: "#fbf8f2", neon: false, act: 1 };
  const sheets = {};
  let glowCtx = null, cutDepth = 0, lightUsed = false, PS = null;
  // Sheets come in size buckets: pasting from a canvas costs by the size of the whole canvas, so a small
  // sprite must not share a sheet with a big one.
  function sheet(name, w, h) {
    const bw = Math.ceil(w / 96) * 96, bh = Math.ceil(h / 96) * 96, key = name + ":" + bw + "x" + bh;
    let L = sheets[key];
    if (!L) { const cv = document.createElement("canvas"); cv.width = bw; cv.height = bh; L = sheets[key] = { cv, g: cv.getContext("2d") }; }
    return L;
  }
  // draw(): draws in the usual coordinates. The box around (x, y) is hw to each side, up above and down below.
  function cutout(draw, x, y, hw, up, down, opt) {
    opt = opt || {};
    if (!D.paper.on || cutDepth || opt.flat) {
      if (opt.dy) { ctx.save(); ctx.translate(0, opt.dy); draw(); ctx.restore(); } else draw();
      return;
    }
    const w = Math.max(2, Math.ceil(hw * 2 * DPR)), h = Math.max(2, Math.ceil((up + down) * DPR));
    const S = sheet("sprite", w, h), Gl = sheet("light", w, h);
    for (const L of [S, Gl]) {
      L.g.setTransform(1, 0, 0, 1, 0, 0);
      L.g.globalCompositeOperation = "source-over";
      L.g.globalAlpha = 1;
      L.g.filter = "none";
      if (L === S || L.dirty) L.g.clearRect(0, 0, L.cv.width, L.cv.height);
      L.g.setTransform(DPR, 0, 0, DPR, (hw - x) * DPR, (up - y) * DPR);
    }
    Gl.dirty = false;
    const main = ctx;
    ctx = S.g;
    glowCtx = Gl.g;
    lightUsed = false;
    cutDepth++;
    S.g.save();
    Gl.g.save();
    try { draw(); } finally { S.g.restore(); Gl.g.restore(); ctx = main; glowCtx = null; cutDepth--; Gl.dirty = lightUsed; }
    // The silhouette, fattened by the width of the cut edge. It is built at reduced size: its outer rim is
    // all that shows, and this is most of the cost of a cut-out.
    const ES = DPR >= 2 ? 0.5 : 0.75, ew = Math.ceil(w * ES), eh = Math.ceil(h * ES), M = sheet("edge", ew, eh);
    const e = (opt.edge || 3) * U, ee = e * DPR * ES, col = opt.edgeColor || D.paper.edge;
    M.g.setTransform(1, 0, 0, 1, 0, 0);
    M.g.globalCompositeOperation = "source-over";
    M.g.clearRect(0, 0, ew, eh);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; M.g.drawImage(S.cv, 0, 0, w, h, Math.cos(a) * ee, Math.sin(a) * ee, w * ES, h * ES); }
    const tint = (c) => { M.g.globalCompositeOperation = "source-in"; M.g.fillStyle = c; M.g.fillRect(0, 0, ew, eh); M.g.globalCompositeOperation = "source-over"; };
    const dx = x - hw, dy = y - up + (opt.dy || 0), dw = hw * 2, dh = up + down;
    main.save();
    const ga = main.globalAlpha;
    if (D.paper.neon) {
      // blacklight: the edge glows. The glow is a tiny blurred copy, blown back up.
      tint(col);
      const tw = Math.ceil(ew / 5), th = Math.ceil(eh / 5), T = sheet("halo", tw, th);
      T.g.setTransform(1, 0, 0, 1, 0, 0);
      T.g.clearRect(0, 0, tw, th);
      T.g.filter = `blur(${Math.max(1, (9 * U * DPR * ES) / 5).toFixed(1)}px)`;
      T.g.drawImage(M.cv, 0, 0, ew, eh, 0, 0, tw, th);
      T.g.filter = "none";
      main.globalCompositeOperation = "lighter";
      main.globalAlpha = ga * 0.85;
      main.drawImage(T.cv, 0, 0, tw, th, dx, dy, dw, dh);
      main.globalCompositeOperation = "source-over";
    } else {
      // the shadow the paper throws on whatever is behind it
      const lift = (opt.lift || 4) * U;
      tint("#08030f");
      main.globalAlpha = ga * 0.5;
      main.drawImage(M.cv, 0, 0, ew, eh, dx + lift, dy + lift * 1.5, dw, dh);
      tint(col);
    }
    main.globalAlpha = ga;
    main.drawImage(M.cv, 0, 0, ew, eh, dx, dy, dw, dh);
    main.drawImage(S.cv, 0, 0, w, h, dx, dy, dw, dh);
    if (lightUsed) {
      main.globalCompositeOperation = "lighter";
      main.drawImage(Gl.cv, 0, 0, w, h, dx, dy, dw, dh);
    }
    main.restore();
  }
  D.cutout = cutout;
  // run fn so that what it draws lands on the light sheet (when a cut-out is being made)
  function lightLayer(fn) {
    if (PS) {
      if (PS.measure) return;
      if (ctx === PS.g) { PS.lights.push({ m: PS.binv.multiply(ctx.getTransform()), fn }); return; }
    }
    if (!glowCtx || ctx === glowCtx) { fn(); return; }
    const keep = ctx;
    lightUsed = true;
    glowCtx.save();
    glowCtx.setTransform(ctx.getTransform());
    ctx = glowCtx;
    try { fn(); } finally { ctx = keep; glowCtx.restore(); }
  }

  function glow(x, y, r, color, a) {
    if (PS) {
      if (PS.measure) return;
      if (ctx === PS.g) { PS.lights.push({ m: PS.binv.multiply(ctx.getTransform()), fn: () => glow(x, y, r, color, a) }); return; }
    }
    const c = glowCtx && ctx !== glowCtx ? glowCtx : ctx;
    if (c !== ctx) { lightUsed = true; c.save(); c.setTransform(ctx.getTransform()); }
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(color, a));
    g.addColorStop(1, rgb(color, 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    if (c !== ctx) c.restore();
  }

  function heart(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  }

  // ---------- planet with a circus-striped ring ----------
  // ---- deep scenery: a black sun, far islands in haze, fog, fireflies, and dark shapes close to the lens ----
  function eclipse(x, y, r, t) {
    const pulse = 1 + 0.04 * Math.sin(t * 0.7);
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 4.2 * pulse);
    g.addColorStop(0, "rgba(190,225,255,0.5)");
    g.addColorStop(0.18, "rgba(150,170,255,0.2)");
    g.addColorStop(0.5, "rgba(120,90,220,0.07)");
    g.addColorStop(1, "rgba(120,90,220,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4.4, y - r * 4.4, r * 8.8, r * 8.8);
    // streamers
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const a = i * 0.698 + Math.sin(t * 0.2 + i) * 0.05, len = r * (2.1 + 1.2 * hashN(i + 2)) * pulse;
      const lg = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      lg.addColorStop(0.3, "rgba(200,225,255,0.16)");
      lg.addColorStop(1, "rgba(200,225,255,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.1) * r, Math.sin(a - 0.1) * r); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.lineTo(Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#03010a";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(240,248,255,0.95)";
    ctx.lineWidth = 2.2 * U;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // the bright bead where the light breaks round the edge
    glow(x + r * 0.72, y - r * 0.7, r * 0.5, "#ffffff", 0.9);
  }
  // A far island: no outlines and little contrast, because there is a lot of air in the way.
  function farIsle(x, y, w, k, t, i, kind) {
    y += Math.sin(t * 0.3 + i * 2.1) * 4 * U;
    const col = (a) => `rgba(${52 + k * 40 | 0},${42 + k * 38 | 0},${92 + k * 40 | 0},${a})`;
    ctx.fillStyle = col(0.9);
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    for (let q = 1; q < 7; q++) ctx.lineTo(x - w + (q / 7) * w * 2, y + Math.sin((q / 7) * Math.PI) * w * (0.55 + hashN(q + i * 5) * 0.5));
    ctx.lineTo(x + w, y);
    ctx.ellipse(x, y, w, w * 0.2, 0, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = col(1);
    ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // its far rim catches the black sun
    ctx.strokeStyle = `rgba(200,215,255,${0.35 - k * 0.15})`;
    ctx.lineWidth = 1.2 * U;
    ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.2, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = col(1);
    if (kind === 0) {
      // a small tent with one lit doorway
      ctx.beginPath(); ctx.moveTo(x - w * 0.34, y - w * 0.02); ctx.lineTo(x - w * 0.34, y - w * 0.3); ctx.quadraticCurveTo(x - w * 0.1, y - w * 0.4, x, y - w * 0.75); ctx.quadraticCurveTo(x + w * 0.1, y - w * 0.4, x + w * 0.34, y - w * 0.3); ctx.lineTo(x + w * 0.34, y - w * 0.02); ctx.fill();
      ctx.fillStyle = `rgba(255,190,120,${0.5 + 0.2 * Math.sin(t * 2 + i)})`;
      ctx.beginPath(); ctx.moveTo(x - w * 0.05, y - w * 0.02); ctx.quadraticCurveTo(x, y - w * 0.22, x + w * 0.05, y - w * 0.02); ctx.fill();
    } else if (kind === 1) {
      // a dead ferris wheel
      ctx.strokeStyle = col(1);
      ctx.lineWidth = 1.6 * U;
      ctx.beginPath(); ctx.arc(x, y - w * 0.6, w * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1 * U;
      for (let q = 0; q < 6; q++) { const a = q * 1.047 + t * 0.03; ctx.beginPath(); ctx.moveTo(x, y - w * 0.6); ctx.lineTo(x + Math.cos(a) * w * 0.45, y - w * 0.6 + Math.sin(a) * w * 0.45); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - w * 0.2, y); ctx.lineTo(x, y - w * 0.6); ctx.lineTo(x + w * 0.2, y); ctx.stroke();
    } else {
      // bare trees
      for (const dx of [-0.4, 0.1, 0.45]) { ctx.fillRect(x + dx * w - 1 * U, y - w * 0.45, 2 * U, w * 0.45); ctx.beginPath(); ctx.arc(x + dx * w, y - w * 0.5, w * 0.16, 0, Math.PI * 2); ctx.fill(); }
    }
    // a chain hanging off into the dark
    ctx.strokeStyle = col(0.7);
    ctx.lineWidth = 1 * U;
    ctx.setLineDash([3 * U, 3 * U]);
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + w * 0.3); ctx.lineTo(x + w * 0.5 + Math.sin(t * 0.5 + i) * 4 * U, y + w * 1.6); ctx.stroke();
    ctx.setLineDash([]);
  }
  // fog: big soft blobs drifting sideways in a band
  const fogBlobs = {};
  function fog(y, h, a, t, speed, seed, tint) {
    tint = tint || "#aab4e6";
    // one soft blob per colour, drawn once and stretched: far cheaper than a fresh gradient for every puff
    let blob = fogBlobs[tint];
    if (!blob) {
      blob = fogBlobs[tint] = document.createElement("canvas");
      blob.width = blob.height = 96;
      const bg2 = blob.getContext("2d"), gr = bg2.createRadialGradient(48, 48, 0, 48, 48, 48);
      gr.addColorStop(0, rgb(tint, 1));
      gr.addColorStop(0.5, rgb(tint, 0.42));
      gr.addColorStop(1, rgb(tint, 0));
      bg2.fillStyle = gr;
      bg2.fillRect(0, 0, 96, 96);
    }
    ctx.save();
    ctx.globalAlpha *= a;
    for (let i = 0; i < 5; i++) {
      const w = W * (0.35 + hashN(seed + i) * 0.3), x = ((hashN(seed + i * 3) * 1.6 + t * speed * (0.6 + hashN(seed + i * 7))) % 1.6 + 1.6) % 1.6 * W - 0.3 * W, yy = y + (hashN(seed + i * 11) - 0.5) * h;
      ctx.drawImage(blob, x - w, yy - h, w * 2, h * 2);
    }
    ctx.restore();
  }
  // the long shadow a thing throws toward us, away from the black sun behind it
  function castShadow(x, y, w, len, a) {
    const dx = clamp((x - sun.x) / (W * 0.5), -1, 1) * len * 0.55, dy = len * 0.42;
    const g = ctx.createLinearGradient(x, y, x + dx, y + dy);
    g.addColorStop(0, `rgba(4,2,12,${a || 0.42})`);
    g.addColorStop(1, "rgba(4,2,12,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.lineTo(x + dx + w * 1.7, y + dy); ctx.lineTo(x + dx - w * 1.7, y + dy);
    ctx.fill();
  }
  const sun = { x: 0, y: 0 };
  // fireflies at different depths: the near ones are bigger, softer and move more with the view
  function motes(t, front) {
    for (let i = 0; i < 30; i++) {
      const z = 0.4 + hashN(i * 3 + 1) * 1.5;
      if ((z > 1.25) !== front) continue;
      const [px, py] = par(z * 26);
      const x = ((hashN(i + 40) + t * 0.008 * (0.5 + hashN(i)) * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * W + px, y = H * (0.25 + hashN(i * 7 + 2) * 0.6) + Math.sin(t * 0.6 + i) * 14 * U + py;
      const a = (0.25 + 0.75 * Math.abs(Math.sin(t * 0.9 + i * 2.3))) * (front ? 0.4 : 0.75), r = 1.6 * U * z;
      glow(x, y, r * 5, i % 3 ? "#d4ff7a" : "#bfe6ff", a * 0.5);
      ctx.fillStyle = i % 3 ? `rgba(230,255,170,${a})` : `rgba(220,240,255,${a})`;
      ctx.beginPath(); ctx.arc(x, y, r * (front ? 1.6 : 1), 0, Math.PI * 2); ctx.fill();
    }
  }
  // Out-of-focus shapes close to the lens, in the corners: they frame the scene and move the most.
  let fgCv = null, fgKey = "";
  const FGM = 36;
  function foreground(t) {
    const key = W + "x" + H + "x" + DPR;
    if (fgKey !== key) {
      fgKey = key;
      fgCv = document.createElement("canvas");
      const m = FGM * U;
      fgCv.width = Math.ceil((W + m * 2) * DPR); fgCv.height = Math.ceil((H + m * 2) * DPR);
      const g = fgCv.getContext("2d");
      g.setTransform(DPR, 0, 0, DPR, m * DPR, m * DPR);
      g.filter = `blur(${(3.5 * U).toFixed(1)}px)`;
      const dark = "rgba(5,2,14,0.96)", rim = "rgba(120,130,200,0.35)";
      // curtain swags hanging in from the top corners
      for (const sd of [0, 1]) {
        g.save();
        if (sd) { g.translate(W, 0); g.scale(-1, 1); }
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(-90, -90); g.lineTo(W * 0.3, -90);
        g.bezierCurveTo(W * 0.2, H * 0.1, W * 0.1, H * 0.06, W * 0.07, H * 0.22);
        g.bezierCurveTo(W * 0.05, H * 0.34, W * 0.02, H * 0.3, -90, H * 0.5);
        g.fill();
        g.strokeStyle = rim; g.lineWidth = 3 * U;
        g.beginPath(); g.moveTo(W * 0.3, 0); g.bezierCurveTo(W * 0.2, H * 0.1, W * 0.1, H * 0.06, W * 0.07, H * 0.22); g.stroke();
        g.restore();
      }
      // tall grass and a leaning lamp post, bottom left
      g.fillStyle = dark;
      for (let i = 0; i < 26; i++) {
        const x = -60 + hashN(i) * W * 0.32, hh = H * (0.08 + hashN(i + 9) * 0.16), lean = (hashN(i + 4) - 0.4) * 50 * U;
        g.beginPath(); g.moveTo(x - 7 * U, H + 90); g.quadraticCurveTo(x + lean * 0.3, H - hh * 0.6, x + lean, H - hh); g.quadraticCurveTo(x + lean * 0.5, H - hh * 0.5, x + 7 * U, H + 90); g.fill();
      }
      g.strokeStyle = dark; g.lineWidth = 9 * U; g.lineCap = "round";
      g.beginPath(); g.moveTo(W * 0.035, H + 90); g.lineTo(W * 0.075, H * 0.62); g.stroke();
      g.beginPath(); g.arc(W * 0.075, H * 0.6, 13 * U, 0, Math.PI * 2); g.fill();
      // a rope of pennants sagging across the bottom right
      g.lineWidth = 3 * U;
      g.beginPath(); g.moveTo(W * 0.6, H + 90); g.quadraticCurveTo(W * 0.85, H * 0.86, W + 90, H * 0.7); g.stroke();
      for (let i = 0; i < 7; i++) {
        const k = i / 6, x = W * 0.64 + k * W * 0.34, y = H * (1.0 - 0.02) - Math.sin(k * 1.5) * H * 0.27 + (1 - k) * H * 0.03;
        g.beginPath(); g.moveTo(x - 16 * U, y - 4 * U); g.lineTo(x + 16 * U, y - 10 * U); g.lineTo(x + 3 * U, y + 30 * U); g.fill();
      }
      g.filter = "none";
    }
    const m = FGM * U, [px, py] = par(46), sn = (v) => Math.round(v * DPR) / DPR;
    ctx.drawImage(fgCv, sn(-m + px), sn(-m + py), fgCv.width / DPR, fgCv.height / DPR);
    // the lamp is lit
    glow(W * 0.075 + px, H * 0.6 + py, 70 * U, "#ffb36b", 0.2 + 0.05 * Math.sin(t * 5));
  }

  function planet(x, y, r, t) {
    const tilt = -0.32;
    const ringSeg = (front) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      const N = 28;
      ctx.lineWidth = r * 0.2;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2 + t * 0.05, a1 = a0 + (Math.PI * 2) / N;
        const mid = (a0 + a1) / 2;
        const isFront = Math.sin(mid) > 0;
        if (isFront !== front) continue;
        ctx.strokeStyle = i % 2 ? "rgba(239,230,210,0.85)" : "rgba(214,40,57,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.05, r * 0.5, 0, a0, a1 + 0.01);
        ctx.stroke();
      }
      ctx.restore();
    };
    glow(x, y, r * 3, "#8a3dff", 0.25);
    ringSeg(false);
    ctx.save();
    ctx.shadowColor = "rgba(8,3,16,0.5)";
    ctx.shadowOffsetX = 4 * U * DPR;
    ctx.shadowOffsetY = 6 * U * DPR;
    ctx.fillStyle = D.paper.edge;
    ctx.beginPath();
    ctx.arc(x, y, r + 3 * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, "#d9b8ff");
    g.addColorStop(0.6, "#7a3fc4");
    g.addColorStop(1, "#2a0f4a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.25;
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = i % 2 ? "#ff5fa8" : "#1a0830";
      ctx.beginPath();
      ctx.ellipse(x, y + i * r * 0.28 + Math.sin(t * 0.3 + i) * r * 0.03, r * 1.2, r * 0.07, tilt, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ringSeg(true);
  }

  // ---------- the island geometry (shared with game.js for walking) ----------
  D.island = function () {
    const portrait = H > W;
    const rx = Math.min(W * 0.47, 640 * U);
    const ry = rx * (portrait ? 0.62 : 0.36);
    return { cx: W / 2, cy: H * (portrait ? 0.46 : 0.63), rx, ry };
  };
  D.toScreen = function (u, v) {
    const I = D.island();
    return [I.cx + u * I.rx * 0.86, I.cy + v * I.ry * 0.78];
  };

  function tent(x, y, w, h, t) {
    const peak = [x, y - h];
    ctx.save();
    const path = new Path2D();
    path.moveTo(x - w * 0.5, y);
    path.lineTo(x - w * 0.5, y - h * 0.42);
    path.quadraticCurveTo(x - w * 0.22, y - h * 0.62, peak[0], peak[1]);
    path.quadraticCurveTo(x + w * 0.22, y - h * 0.62, x + w * 0.5, y - h * 0.42);
    path.lineTo(x + w * 0.5, y);
    path.closePath();
    ctx.clip(path);
    ctx.fillStyle = "#3b1530";
    ctx.fillRect(x - w, y - h * 1.2, w * 2, h * 1.3);
    const N = 12;
    for (let i = 0; i < N; i++) {
      if (i % 2) continue;
      ctx.fillStyle = "#8f2238";
      ctx.beginPath();
      ctx.moveTo(peak[0], peak[1]);
      ctx.lineTo(x - w * 0.5 + (i / N) * w, y + 2);
      ctx.lineTo(x - w * 0.5 + ((i + 1) / N) * w, y + 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(205,190,160,0.22)";
    for (let i = 1; i < N; i += 2) {
      ctx.beginPath();
      ctx.moveTo(peak[0], peak[1]);
      ctx.lineTo(x - w * 0.5 + (i / N) * w, y + 2);
      ctx.lineTo(x - w * 0.5 + ((i + 1) / N) * w, y + 2);
      ctx.fill();
    }
    // night shading
    const sh = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    sh.addColorStop(0, "rgba(10,4,24,0.55)");
    sh.addColorStop(0.5, "rgba(10,4,24,0)");
    sh.addColorStop(1, "rgba(10,4,24,0.6)");
    ctx.fillStyle = sh;
    ctx.fillRect(x - w, y - h * 1.2, w * 2, h * 1.3);
    ctx.restore();
    // doorway with warm light
    glow(x, y - h * 0.15, h * 0.5, "#ffb36b", 0.35 + 0.08 * Math.sin(t * 3));
    ctx.fillStyle = "#1a0710";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.11, y);
    ctx.quadraticCurveTo(x, y - h * 0.55, x + w * 0.11, y);
    ctx.fill();
    ctx.fillStyle = "rgba(255,179,107,0.55)";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.06, y);
    ctx.quadraticCurveTo(x, y - h * 0.4, x + w * 0.06, y);
    ctx.fill();
    // scallop trim
    for (let i = 0; i < 9; i++) {
      const k = i / 8, sx = x - w * 0.5 + k * w;
      ctx.fillStyle = i % 2 ? "#d9cdb4" : "#b52a42";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(sx, y - h * 0.42 + Math.abs(k - 0.5) * -h * 0.0, w * 0.06, 0, Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // flag
    ctx.strokeStyle = "#d9cdb4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(peak[0], peak[1]);
    ctx.lineTo(peak[0], peak[1] - h * 0.25);
    ctx.stroke();
    ctx.fillStyle = "#a6d94a";
    ctx.beginPath();
    const fy = peak[1] - h * 0.25;
    ctx.moveTo(peak[0], fy);
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      ctx.lineTo(peak[0] + k * h * 0.22, fy + k * h * 0.05 + Math.sin(t * 5 + k * 4) * 3 * U);
    }
    ctx.lineTo(peak[0], fy + h * 0.1);
    ctx.fill();
    return peak;
  }

  function lights(x0, y0, x1, y1, sag, t, seed) {
    const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / (20 * U)));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
    ctx.strokeStyle = "rgba(20,10,30,0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();
    const cols = ["#ff5fa8", "#ffd23f", "#8fe9ff", "#a6d94a", "#ffb36b"];
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
      const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1 + 3 * U;
      const busted = (i * 7 + seed) % 11 === 0 && Math.sin(t * 13 + i) > -0.2;
      const c = cols[(i + seed) % cols.length];
      const a = busted ? 0.15 : 0.75 + 0.25 * Math.sin(t * 2 + i);
      glow(x, y, 9 * U, c, a * 0.5);
      ctx.fillStyle = rgb(c, a);
      ctx.beginPath();
      ctx.arc(x, y, 2.4 * U, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tv(x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.3, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a7088";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.5);
    ctx.lineTo(-s * 0.7, -s * 2.4);
    ctx.moveTo(0, -s * 1.5);
    ctx.lineTo(s * 0.6, -s * 2.3);
    ctx.stroke();
    ctx.fillStyle = "#3a3048";
    ctx.beginPath();
    ctx.roundRect(-s * 1.1, -s * 1.55, s * 2.2, s * 1.6, s * 0.2);
    ctx.fill();
    ctx.fillStyle = "#2a2236";
    ctx.fillRect(-s * 1.1, -s * 0.05, s * 2.2, s * 0.12);
    // static
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-s * 0.9, -s * 1.38, s * 1.4, s * 1.15, s * 0.15);
    ctx.clip();
    ctx.fillStyle = "#a9a3b8";
    ctx.fillRect(-s, -s * 1.5, s * 2, s * 1.4);
    for (let i = 0; i < 40; i++) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v + 20 > 255 ? 255 : v + 20})`;
      ctx.fillRect(-s * 0.9 + Math.random() * s * 1.4, -s * 1.38 + Math.random() * s * 1.15, s * 0.3, s * 0.06);
    }
    ctx.fillStyle = "rgba(166,217,74,0.25)";
    ctx.fillRect(-s * 0.9, -s * 1.38 + ((t * 40) % (s * 1.15)), s * 1.4, s * 0.12);
    ctx.restore();
    ctx.fillStyle = "#ff5fa8";
    ctx.beginPath();
    ctx.arc(s * 0.8, -s * 1.1, s * 0.1, 0, Math.PI * 2);
    ctx.arc(s * 0.8, -s * 0.75, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    glow(x - s * 0.2, y - s * 0.8, s * 2.4, "#c8c0ff", 0.12);
  }

  function island(t) {
    const I = D.island();
    const { cx, cy, rx, ry } = I;
    const r = rng(42);
    // underside: jagged rock that drips sludge
    ctx.save();
    const under = new Path2D();
    under.moveTo(cx - rx, cy);
    const N = 16;
    for (let i = 1; i < N; i++) {
      const k = i / N;
      const x = cx - rx + k * rx * 2;
      const depth = Math.sin(k * Math.PI) * ry * (1.9 + r() * 0.9);
      under.lineTo(x, cy + depth);
    }
    under.lineTo(cx + rx, cy);
    under.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false);
    const ug = ctx.createLinearGradient(0, cy, 0, cy + ry * 2.8);
    ug.addColorStop(0, "#3a2147");
    ug.addColorStop(0.5, "#1d0f2a");
    ug.addColorStop(1, "#0a0414");
    ctx.fillStyle = ug;
    ctx.fill(under);
    ctx.clip(under);
    ctx.strokeStyle = "rgba(166,217,74,0.12)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + i * ry * 0.35, rx * (1 - i * 0.14), ry * 0.6, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    // glowing sludge drips falling off the bottom
    const r2 = rng(9);
    for (let i = 0; i < 7; i++) {
      const k = 0.15 + r2() * 0.7;
      const x = cx - rx + k * rx * 2;
      const base = cy + Math.sin(k * Math.PI) * ry * 1.4;
      const ph = (t * (0.25 + r2() * 0.2) + r2()) % 1;
      const len = 10 * U + ph * 26 * U;
      ctx.fillStyle = "rgba(166,217,74,0.75)";
      ctx.beginPath();
      ctx.moveTo(x - 3 * U, base);
      ctx.quadraticCurveTo(x, base + len, x + 3 * U, base);
      ctx.fill();
      if (ph > 0.6) {
        const fy = base + len + (ph - 0.6) * 300 * U;
        glow(x, fy, 8 * U, "#b6ff5c", 0.5 * (1 - ph));
        ctx.fillStyle = `rgba(182,255,92,${1 - ph})`;
        ctx.beginPath();
        ctx.arc(x, fy, 2.5 * U, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // the island is a stack of card: each sheet a little smaller and darker than the one above
    for (let i = 4; i >= 1; i--) {
      const k = i / 4, yy = cy + i * 11 * U;
      ctx.fillStyle = rgb(mix("#2a3f48", "#0d0a1c", k));
      ctx.beginPath(); ctx.ellipse(cx, yy, rx * (1 - k * 0.07), ry * (1 - k * 0.05), 0, 0, Math.PI); ctx.lineTo(cx - rx, yy - 12 * U); ctx.lineTo(cx + rx, yy - 12 * U); ctx.fill();
      ctx.strokeStyle = `rgba(251,248,242,${0.5 - k * 0.32})`;
      ctx.lineWidth = 1.6 * U;
      ctx.beginPath(); ctx.ellipse(cx, yy, rx * (1 - k * 0.07), ry * (1 - k * 0.05), 0, 0.04, Math.PI - 0.04); ctx.stroke();
    }
    // the top surface: lit from behind by the black sun, darker toward us
    const tg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    tg.addColorStop(0, "#3d6a66");
    tg.addColorStop(0.35, "#25474a");
    tg.addColorStop(1, "#111f2c");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // cold light falling across the far side, a pool of warm light from the tent door, green from the pond
    const lg = ctx.createRadialGradient(sun.x, cy - ry * 0.9, 0, sun.x, cy - ry * 0.9, rx * 0.9);
    lg.addColorStop(0, "rgba(170,205,255,0.26)");
    lg.addColorStop(1, "rgba(170,205,255,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    const dx = cx - rx * 0.38, dy = cy - ry * 0.55;
    ctx.save();
    ctx.translate(dx, dy); ctx.scale(1, 0.42);
    const wg = ctx.createRadialGradient(0, 0, 0, 0, ry * 0.5, rx * 0.34);
    wg.addColorStop(0, `rgba(255,190,120,${0.4 + 0.06 * Math.sin(t * 3)})`);
    wg.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = wg;
    ctx.fillRect(-rx * 0.4, -ry * 0.2, rx * 0.8, rx * 0.9);
    ctx.restore();
    const pg = ctx.createRadialGradient(cx + rx * 0.6, cy + ry * 0.36, 0, cx + rx * 0.6, cy + ry * 0.36, rx * 0.36);
    pg.addColorStop(0, "rgba(182,255,92,0.2)");
    pg.addColorStop(1, "rgba(182,255,92,0)");
    ctx.fillStyle = pg;
    ctx.fillRect(cx, cy - ry, rx, ry * 2);
    ctx.restore();
    ctx.strokeStyle = "rgba(251,248,242,0.92)";
    ctx.lineWidth = 3.5 * U;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // grass tufts
    ctx.strokeStyle = "rgba(166,217,74,0.35)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.95;
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      const near = 0.55 + 0.9 * ((y - cy) / ry * 0.5 + 0.5), sway = Math.sin(t * 1.5 + x * 0.05) * 2 * U * near;
      ctx.strokeStyle = `rgba(166,217,74,${0.14 + near * 0.22})`;
      ctx.lineWidth = 1.2 * near;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2 * U * near + sway, y - 6 * U * near);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2 * U * near + sway, y - 7 * U * near);
      ctx.stroke();
    }
    return I;
  }

  function ring(I, t) {
    const x = I.cx - I.rx * 0.04, y = I.cy + I.ry * 0.06;
    const a = I.rx * 0.4, b = I.ry * 0.42;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, a, b, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(1, b / a);
    ctx.rotate(Math.PI / 4 + t * 0.02);
    const sq = a / 4.5;
    for (let i = -7; i < 7; i++) for (let j = -7; j < 7; j++) {
      ctx.fillStyle = (i + j) & 1 ? "#1b1726" : "#d9cdb4";
      ctx.fillRect(i * sq, j * sq, sq + 0.5, sq + 0.5);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, a, b, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(42,13,46,0.35)";
    ctx.fill();
    ctx.lineWidth = 7 * U;
    ctx.strokeStyle = "#d62839";
    ctx.stroke();
    ctx.setLineDash([12 * U, 12 * U]);
    ctx.strokeStyle = "#efe6d2";
    ctx.stroke();
    ctx.restore();
  }

  function pond(I, t) {
    const x = I.cx + I.rx * 0.6, y = I.cy + I.ry * 0.36, a = I.rx * 0.17, b = I.ry * 0.24;
    glow(x, y, a * 1.8, "#b6ff5c", 0.28);
    const g = ctx.createRadialGradient(x, y - b * 0.3, 0, x, y, a);
    g.addColorStop(0, "#d4ff7a");
    g.addColorStop(0.5, "#7fc22e");
    g.addColorStop(1, "#2f5a14");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, a, b, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,40,10,0.8)";
    ctx.lineWidth = 3 * U;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.5 + i * 0.37) % 1;
      const bx = x + Math.sin(i * 9.1) * a * 0.6, by = y + Math.cos(i * 5.3) * b * 0.5;
      ctx.strokeStyle = `rgba(230,255,180,${0.8 * (1 - ph)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, (1 + ph * 5) * U, 0, Math.PI * 2);
      ctx.stroke();
    }
    return [x, y];
  }

  function constellations(sky, t) {
    if (!sky) return;
    ctx.save();
    for (const c of sky) {
      const pts = c.pts.map((p) => [p[0] * W, p[1] * H]);
      ctx.strokeStyle = "rgba(201,184,255,0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      pts.forEach((p, i) => {
        const a = 0.6 + 0.4 * Math.sin(t * 1.3 + i + c.pts.length);
        glow(p[0], p[1], 8 * U, "#c9b8ff", 0.4 * a);
        sparkle(p[0], p[1], 1.6 * U, `rgba(255,255,255,${a})`);
      });
      ctx.fillStyle = "rgba(201,184,255,0.5)";
      ctx.font = `${11 * U}px "Special Elite", monospace`;
      ctx.textAlign = "center";
      ctx.fillText(c.name, pts[0][0], pts[0][1] - 10 * U);
    }
    ctx.restore();
  }

  // ---------- Jinx (the pet) ----------
  // ---- hats: things a Jinx can wear on top of whatever grows from its head ----
  // Drawn in the head's own space: (0, hCy) is the middle of the head, hRx and hRy its radii.
  function wearHat(id, j, R, hRx, hRy, hCy, lw, t, ink, jig) {
    const paint = (p, fill, w) => { ctx.fillStyle = fill; ctx.fill(p); ctx.strokeStyle = ink; ctx.lineWidth = w || lw; ctx.stroke(p); };
    const line = (p, w) => { ctx.strokeStyle = ink; ctx.lineWidth = w || lw; ctx.stroke(p); };
    ctx.save();
    ctx.translate(0, hCy - hRy * 0.9);
    ctx.rotate(-0.1 + (jig || 0) / (R * 3));
    if (id === "cone") {
      const base = new Path2D();
      base.roundRect(-R * 0.66, -R * 0.05, R * 1.32, R * 0.22, R * 0.06);
      paint(base, "#e8590c");
      const c = new Path2D();
      c.moveTo(-R * 0.46, R * 0.0); c.lineTo(-R * 0.13, -R * 1.2); c.quadraticCurveTo(0, -R * 1.3, R * 0.13, -R * 1.2); c.lineTo(R * 0.46, R * 0.0); c.closePath();
      ctx.fillStyle = "#ff7a1a";
      ctx.fill(c);
      ctx.save();
      ctx.clip(c);
      ctx.fillStyle = "#fbf8f2";
      ctx.fillRect(-R, -R * 0.82, R * 2, R * 0.24);
      ctx.fillRect(-R, -R * 0.36, R * 2, R * 0.16);
      ctx.fillStyle = "rgba(60,20,0,0.18)";
      ctx.fillRect(R * 0.08, -R * 1.4, R, R * 1.5);
      ctx.restore();
      line(c);
    } else if (id === "pot") {
      ctx.strokeStyle = "#3f7a2a";
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.78); ctx.quadraticCurveTo(R * 0.14, -R * 1.1, R * 0.04 + Math.sin(t * 2) * R * 0.05, -R * 1.42); ctx.stroke();
      const leaf = new Path2D();
      leaf.ellipse(R * 0.2, -R * 1.02, R * 0.16, R * 0.07, -0.5, 0, Math.PI * 2);
      paint(leaf, "#6fb63f", lw * 0.6);
      const fx = R * 0.04 + Math.sin(t * 2) * R * 0.05, fy = -R * 1.48;
      for (let k = 0; k < 6; k++) { const pt = new Path2D(); pt.ellipse(fx + Math.cos(k * 1.047) * R * 0.15, fy + Math.sin(k * 1.047) * R * 0.15, R * 0.11, R * 0.11, 0, 0, Math.PI * 2); paint(pt, "#fbf8f2", lw * 0.5); }
      const mid = new Path2D(); mid.arc(fx, fy, R * 0.1, 0, Math.PI * 2); paint(mid, "#ffd23f", lw * 0.5);
      const pot = new Path2D();
      pot.moveTo(-R * 0.36, -R * 0.8); pot.lineTo(R * 0.36, -R * 0.8); pot.lineTo(R * 0.52, R * 0.0); pot.lineTo(-R * 0.52, R * 0.0); pot.closePath();
      paint(pot, "#c8643c");
      ctx.fillStyle = "rgba(60,15,0,0.2)";
      ctx.beginPath(); ctx.moveTo(R * 0.1, -R * 0.8); ctx.lineTo(R * 0.36, -R * 0.8); ctx.lineTo(R * 0.52, 0); ctx.lineTo(R * 0.2, 0); ctx.fill();
      const rim = new Path2D();
      rim.roundRect(-R * 0.6, -R * 0.06, R * 1.2, R * 0.24, R * 0.05);
      paint(rim, "#d97a4e");
    } else if (id === "bucket") {
      const b = new Path2D();
      b.moveTo(-R * 0.4, -R * 0.85); b.lineTo(R * 0.4, -R * 0.85); b.lineTo(R * 0.6, R * 0.12); b.lineTo(-R * 0.6, R * 0.12); b.closePath();
      ctx.fillStyle = "#b9c2cc";
      ctx.fill(b);
      ctx.save();
      ctx.clip(b);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(-R * 0.36, -R, R * 0.14, R * 1.2);
      ctx.fillStyle = "rgba(20,10,40,0.2)";
      ctx.fillRect(R * 0.16, -R, R, R * 1.2);
      ctx.strokeStyle = "rgba(20,10,40,0.45)";
      ctx.lineWidth = lw * 0.6;
      for (const yy of [-0.6, -0.1]) { ctx.beginPath(); ctx.moveTo(-R, yy * R); ctx.lineTo(R, yy * R); ctx.stroke(); }
      ctx.restore();
      line(b);
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.arc(R * 0.5, -R * 0.2, R * 0.42, -1.2, 1.3); ctx.stroke();
    } else if (id === "bow") {
      ctx.translate(R * 0.34, R * 0.02);
      ctx.rotate(0.3);
      for (const sd of [-1, 1]) {
        const lp = new Path2D();
        lp.moveTo(0, 0); lp.bezierCurveTo(sd * R * 0.3, -R * 0.6, sd * R * 0.95, -R * 0.5, sd * R * 0.8, 0); lp.bezierCurveTo(sd * R * 0.95, R * 0.4, sd * R * 0.3, R * 0.35, 0, 0);
        paint(lp, "#ff5fa8");
        ctx.strokeStyle = "rgba(120,10,60,0.5)";
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath(); ctx.moveTo(sd * R * 0.12, 0); ctx.lineTo(sd * R * 0.55, -R * 0.08); ctx.stroke();
        const tail = new Path2D();
        tail.moveTo(0, R * 0.05); tail.lineTo(sd * R * 0.42, R * 0.62); tail.lineTo(sd * R * 0.2, R * 0.56); tail.lineTo(sd * R * 0.1, R * 0.7); tail.closePath();
        paint(tail, "#e23f8c", lw * 0.7);
      }
      const kn = new Path2D();
      kn.roundRect(-R * 0.14, -R * 0.16, R * 0.28, R * 0.32, R * 0.08);
      paint(kn, "#ff8cc0");
    } else if (id === "antenna") {
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath();
      ctx.moveTo(-R * 0.05, -R * 0.1); ctx.lineTo(-R * 0.62, -R * 1.25);
      ctx.moveTo(R * 0.05, -R * 0.1); ctx.lineTo(R * 0.58, -R * 1.32);
      ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      for (const [ax, ay] of [[-0.62, -1.25], [0.58, -1.32]]) { const bl = new Path2D(); bl.arc(ax * R, ay * R, R * 0.09, 0, Math.PI * 2); paint(bl, "#cfc6d8", lw * 0.6); }
      if (Math.sin(t * 7) > 0.6) glow(R * 0.58, -R * 1.32, R * 0.45, "#a6d94a", 0.8);
      const box = new Path2D();
      box.roundRect(-R * 0.28, -R * 0.2, R * 0.56, R * 0.3, R * 0.07);
      paint(box, "#4a3a6a");
      ctx.fillStyle = Math.sin(t * 4) > 0 ? "#ff3b4a" : "#7a1020";
      ctx.beginPath(); ctx.arc(R * 0.14, -R * 0.05, R * 0.045, 0, Math.PI * 2); ctx.fill();
    } else if (id === "shell") {
      const sh = new Path2D();
      sh.moveTo(-R * 0.62, R * 0.12);
      sh.bezierCurveTo(-R * 0.66, -R * 0.75, R * 0.66, -R * 0.75, R * 0.62, R * 0.12);
      for (let k = 0; k <= 6; k++) sh.lineTo(R * 0.62 - k * R * 0.207, R * (k % 2 ? 0.3 : 0.1));
      sh.closePath();
      ctx.fillStyle = rgb(hsl(j.hue, 70, 88));
      ctx.fill(sh);
      ctx.save();
      ctx.clip(sh);
      ctx.fillStyle = rgb(hsl((j.hue + 40) % 360, 75, 68));
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc((hashN(k + j.hue) - 0.5) * R, -R * 0.1 - hashN(k * 3 + 1) * R * 0.4, R * 0.09, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.ellipse(-R * 0.26, -R * 0.3, R * 0.16, R * 0.08, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      line(sh);
    } else if (id === "propeller") {
      const cols = ["#d62839", "#ffd23f", "#2fb7c9", "#a6d94a"];
      const dome = new Path2D();
      dome.moveTo(-R * 0.56, R * 0.08); dome.bezierCurveTo(-R * 0.58, -R * 0.62, R * 0.58, -R * 0.62, R * 0.56, R * 0.08); dome.closePath();
      ctx.save();
      ctx.clip(dome);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(-R * 0.56 + k * R * 0.28, -R, R * 0.29, R * 1.2); }
      ctx.restore();
      line(dome);
      const brim = new Path2D();
      brim.ellipse(R * 0.46, R * 0.1, R * 0.4, R * 0.1, 0.1, 0, Math.PI * 2);
      paint(brim, "#d62839", lw * 0.8);
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.44); ctx.lineTo(0, -R * 0.7); ctx.stroke();
      const wv = Math.cos(t * 9);
      for (const sd of [-1, 1]) { const bl = new Path2D(); bl.ellipse(sd * R * 0.26 * wv, -R * 0.72, Math.max(R * 0.04, R * 0.26 * Math.abs(wv)), R * 0.07, 0, 0, Math.PI * 2); paint(bl, sd < 0 ? "#ffd23f" : "#2fb7c9", lw * 0.6); }
      const nub = new Path2D(); nub.arc(0, -R * 0.72, R * 0.06, 0, Math.PI * 2); paint(nub, "#d62839", lw * 0.5);
    } else if (id === "wig") {
      const cols = ["#d62839", "#ff8a3d", "#ffd23f", "#a6d94a", "#2fb7c9", "#8a3dff", "#ff5fa8"];
      for (let row = 0; row < 2; row++) for (let k = 0; k < 7; k++) {
        const a = Math.PI * (1.02 + (k / 6) * 0.96), rr = row ? 0.92 : 1.2;
        const c = new Path2D();
        c.arc(Math.cos(a) * hRx * rr, hRy * 0.9 + Math.sin(a) * hRy * rr * 1.05, R * (row ? 0.3 : 0.34), 0, Math.PI * 2);
        paint(c, cols[(k + row * 3) % 7], lw * 0.7);
      }
    } else if (id === "crown") {
      const c = new Path2D();
      c.moveTo(-R * 0.56, R * 0.1);
      for (let k = 0; k <= 6; k++) c.lineTo(-R * 0.56 + k * R * 0.187, k % 2 ? -R * 0.3 : -R * 0.72);
      c.lineTo(R * 0.56, R * 0.1);
      c.closePath();
      paint(c, "#ffd23f");
      ctx.fillStyle = "rgba(160,110,0,0.35)";
      ctx.fillRect(-R * 0.54, -R * 0.06, R * 1.08, R * 0.05);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = ["#d62839", "#2fb7c9", "#ff5fa8"][k]; ctx.beginPath(); ctx.arc(-R * 0.3 + k * R * 0.3, -R * 0.16, R * 0.07, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = lw * 0.5;
      ctx.beginPath(); ctx.moveTo(-R * 0.44, -R * 0.02); ctx.lineTo(-R * 0.44, -R * 0.4); ctx.stroke();
    } else if (id === "topper") {
      ctx.translate(-R * 0.12, 0);
      const brim = new Path2D();
      brim.ellipse(0, R * 0.0, R * 0.56, R * 0.12, 0, 0, Math.PI * 2);
      paint(brim, "#1f1430");
      const tube = new Path2D();
      tube.moveTo(-R * 0.32, 0); tube.lineTo(-R * 0.38, -R * 0.8); tube.quadraticCurveTo(0, -R * 0.92, R * 0.38, -R * 0.8); tube.lineTo(R * 0.32, 0); tube.closePath();
      paint(tube, "#1f1430");
      ctx.fillStyle = "#d62839";
      ctx.beginPath(); ctx.moveTo(-R * 0.33, -R * 0.06); ctx.lineTo(R * 0.33, -R * 0.06); ctx.lineTo(R * 0.34, -R * 0.24); ctx.lineTo(-R * 0.34, -R * 0.24); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(-R * 0.08, -R * 0.24, R * 0.16, R * 0.18);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(-R * 0.26, -R * 0.78, R * 0.1, R * 0.5);
    }
    ctx.restore();
  }
  D.HAT_IDS = ["bow", "cone", "bucket", "pot", "antenna", "shell", "propeller", "wig", "crown", "topper"];

  D.jinxLook = function (j) {
    const a = j.align || 0, m = j.moon || 0, adult = j.stage === "adult";
    const lean = !adult ? "base" : a > 0.33 ? "stardust" : a < -0.33 ? "sludge" : m >= 0.33 ? "pierrot" : "harlequin";
    let best = "juggle", bv = -1;
    for (const s of JG.STATS) if (j.stats[s].lv > bv) { bv = j.stats[s].lv; best = s; }
    return { lean, best, adult, head: j.head || "disc", piece: j.piece || "corona", body: j.body || "night" };
  };
  const hashN = (n) => { const v = Math.sin(n * 127.1 + 1.3) * 43758.5453; return v - Math.floor(v); };

  // ---------- the Jinx ----------
  // Three kinds: Umbra (a black disc head, a corona with comet tails, a starry cloak), Hollow (a mask, a hood with
  // drooping tails, a tattered cloak) and Lantern (a pale bulb head, floating ribbons, a floating body with a
  // light in its chest). Every Jinx is a head, a headpiece and a body, and a duet's egg takes each from one
  // parent or the other, so the kinds mix. None has a mouth: the eyes and the chest light show the mood.
  // Each part has a version for every lean (base for a child, then stardust, sludge, harlequin, pierrot).
  // paintJinx draws one in its own units: feet at (0, 0), about 2.3 tall, on the current context.
  const lightAt = (x, y, r, c, a) => glow(x, y, r, c, a);
  const paintJinx = (function () {
  const INK = "#120a1e", BONE = "#efe6d2", PAPER = "#fbf8f2", NOIR = "#16101f", RED = "#8f2238";
  const hash = (n) => { const v = Math.sin(n * 127.1 + 1.3) * 43758.5453; return v - Math.floor(v); };
  let g, A = { t: 0, walk: false, ph: 0, seed: 0, spinA: 0 }, cH, cL, cU;
  // things that hang swing a little on their own, and more when it walks
  const sway = (px, py, sd, amp) => { g.translate(px, py); g.rotate(Math.sin(A.t * 1.8 + sd + A.seed) * amp + (A.walk ? Math.sin(A.ph + sd) * amp * 1.6 : 0)); g.translate(-px, -py); };
  const foot = (sd, fn) => { g.save(); if (A.walk) g.translate(sd * Math.sin(A.ph) * 0.04, -Math.max(0, Math.sin(A.ph + (sd > 0 ? Math.PI : 0))) * 0.08); fn(); g.restore(); };
  const path = (fn) => { const p = new Path2D(); fn(p); return p; };
  const fill = (p, c) => { g.fillStyle = c; g.fill(p); };
  const line = (p, w, c) => { g.strokeStyle = c || INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(p); };
  const paint = (p, c, w) => { fill(p, c); line(p, w || 0.045); };
  const inside = (p, fn) => { g.save(); g.clip(p); fn(); g.restore(); };
  const ell = (x, y, rx, ry, rot) => path((p) => p.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2));
  const glow = (x, y, r, rgbs, a) => lightAt(x, y, r, rgbs.split(",").map(Number), a);
  const shade = (p, a) => inside(p, () => { g.fillStyle = `rgba(18,8,40,${a || 0.28})`; g.save(); g.translate(0.16, 0.1); g.fill(p); g.restore(); });
  const bell = (x, y, r) => { paint(ell(x, y, r, r), "#e8b923", 0.035); g.fillStyle = INK; g.fillRect(x - r * 0.5, y + r * 0.1, r, r * 0.16); g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.2, 0, 7); g.fill(); };
  const starP = (x, y, r) => path((p) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, rr = k % 2 ? r * 0.38 : r; p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } p.closePath(); });
  const star = (x, y, r, c) => fill(starP(x, y, r), c);
  const diamondP = (x, y, w, h) => path((p) => { p.moveTo(x, y - h); p.lineTo(x + w, y); p.lineTo(x, y + h); p.lineTo(x - w, y); p.closePath(); });
  const dripP = (x, y, w, len) => path((p) => { p.moveTo(x - w, y); p.quadraticCurveTo(x - w, y + len * 0.7, x, y + len); p.quadraticCurveTo(x + w, y + len * 0.7, x + w, y); p.closePath(); });
  // what hangs on the end of a tail or ribbon
  function tip(x, y, kind) {
    if (kind === "star") { paint(starP(x, y, 0.13), "#ffd23f", 0.03); }
    else if (kind === "pom") paint(ell(x, y, 0.1, 0.1), NOIR, 0.035);
    else if (kind === "drip") paint(dripP(x, y - 0.06, 0.06, 0.26), "#a6d94a", 0.03);
    else bell(x, y, 0.085);
  }
  const TIP = { base: "bell", stardust: "star", sludge: "drip", harlequin: "bell", pierrot: "pom" };

  // ================= Hollow's parts =================
  const PAL_H = {
    base:      { hood: "#241a45", cloak: "#1c1533", m1: BONE, m2: "#cdc2ae", glow: "143,233,255", pupil: "#eafcff", band: BONE, hi: "190,224,255" },
    stardust:  { hood: "#c3cbee", cloak: "#dcdaf6", m1: "#ffffff", m2: "#eef0ff", glow: "255,225,140", pupil: "#fffbe0", band: "#ffd23f", hi: "255,255,255" },
    sludge:    { hood: "#1f2b1f", cloak: "#172018", m1: "#d6d8b8", m2: "#a9b08a", glow: "182,255,92", pupil: "#eaffc0", band: "#6f9a22", hi: "182,255,92" },
    harlequin: { hood: RED, cloak: NOIR, m1: PAPER, m2: NOIR, glow: "255,210,63", pupil: "#fff3c2", band: NOIR, hi: "255,220,220" },
    pierrot:   { hood: NOIR, cloak: "#f4efe6", m1: "#ffffff", m2: "#ecebf5", glow: "170,200,255", pupil: "#ffffff", band: PAPER, hi: "200,210,255" }
  };
  function tails(C, tl, kind) {
    for (const [sd, len, kink] of [[-1, 1, 0], [1, 0.78, 0.2]]) {
      g.save();
      sway(sd * 0.3, -2.12, sd, 0.05);
      const t = path((p) => {
        p.moveTo(sd * 0.3, -2.12);
        p.bezierCurveTo(sd * 0.7, -2.5 * (0.9 + tl * 0.1), sd * (0.9 + tl * 0.35), -2.3, sd * (0.98 + tl * 0.3), -1.95 + (1 - len) * 0.3);
        p.quadraticCurveTo(sd * (1.05 + tl * 0.34), -1.6 + kink, sd * (0.95 + tl * 0.3), -1.25 - (1 - tl) * 0.5 + (1 - len) * 0.35);
        p.quadraticCurveTo(sd * (0.86 + tl * 0.26), -1.7, sd * (0.7 + tl * 0.2), -1.92);
        p.bezierCurveTo(sd * 0.62, -2.05, sd * 0.56, -1.95, sd * 0.5, -1.75);
        p.closePath();
      });
      paint(t, C.hood);
      inside(t, () => { g.fillStyle = C.band; for (let k = 0; k < 4; k++) { g.save(); g.translate(sd * (0.98 + tl * 0.3), -1.9 + k * 0.2); g.rotate(sd * 0.3); g.fillRect(-0.3, 0, 0.6, 0.07); g.restore(); } });
      shade(t, 0.3);
      line(t, 0.045);
      tip(sd * (0.95 + tl * 0.3), -1.2 - (1 - tl) * 0.5 + (1 - len) * 0.35, kind);
      g.restore();
    }
  }
  function cloak(C, L, grown) {
    for (const sd of [-1, 1]) foot(sd, () => paint(path((p) => { p.moveTo(sd * 0.1, -0.02); p.quadraticCurveTo(sd * 0.2, -0.2, sd * 0.4, -0.06); p.quadraticCurveTo(sd * 0.5, -0.12, sd * 0.46, 0); p.closePath(); }), L === "pierrot" ? NOIR : "#0e0a1c", 0.04));
    const c = path((p) => {
      p.moveTo(-0.3, -1.12);
      p.bezierCurveTo(-0.5, -0.8, -0.7, -0.45, -0.66, -0.14);
      for (let k = 0; k <= 8; k++) p.lineTo(-0.66 + k * 0.165, k % 2 ? -0.06 : -0.2 - (L === "sludge" ? hash(k) * 0.1 : 0));
      p.bezierCurveTo(0.7, -0.45, 0.5, -0.8, 0.3, -1.12);
      p.closePath();
    });
    fill(c, C.cloak);
    inside(c, () => {
      if (L === "harlequin") { for (let r = 0; r < 8; r++) for (let q = 0; q < 10; q++) { g.fillStyle = (r + q) % 2 ? RED : BONE; if ((r * 3 + q) % 3 === 0) continue; g.fill(diamondP(-0.7 + q * 0.16 + (r % 2) * 0.08, -1.1 + r * 0.14, 0.08, 0.07)); } }
      else if (L === "pierrot") { for (let k = 0; k < 3; k++) fill(ell(0, -0.86 + k * 0.24, 0.07, 0.07), NOIR); }
      else if (L === "sludge") { g.fillStyle = "#3d5a1c"; g.save(); g.translate(0.22, -0.5); g.rotate(0.2); g.fillRect(-0.12, -0.1, 0.24, 0.2); g.restore(); g.fillStyle = "rgba(166,217,74,0.5)"; for (let k = 0; k < 5; k++) g.fill(dripP(-0.5 + k * 0.25, -0.4 + hash(k) * 0.1, 0.04, 0.2)); }
      else for (let k = 0; k < 14; k++) star((hash(k) - 0.5) * 1.1, -0.2 - hash(k + 5) * 0.55, 0.03 + hash(k + 9) * 0.02, L === "stardust" ? (k % 3 ? "#ffd23f" : "#8a7ad6") : (k % 3 ? "#7a5ac8" : "#bfe0ff"));
      g.fillStyle = `rgba(${C.hi},0.14)`; g.beginPath(); g.moveTo(-0.3, -1.12); g.lineTo(-0.66, -0.14); g.lineTo(-0.48, -0.14); g.lineTo(-0.2, -1.12); g.fill();
    });
    shade(c, L === "pierrot" || L === "stardust" ? 0.16 : 0.34);
    line(c, 0.045);
    if (L === "sludge") for (const x of [-0.42, 0.1, 0.5]) paint(dripP(x, -0.12, 0.045, 0.2), "#a6d94a", 0.03);
    if (grown || L === "pierrot") ruff(L);
  }
  function ruff(L) {
    const wide = L === "pierrot" ? 1.25 : 1;
    const r = path((p) => { p.moveTo(-0.46 * wide, -1.08); for (let k = 0; k <= 8; k++) p.lineTo((-0.46 + k * 0.115) * wide, k % 2 ? -0.86 + (wide - 1) * 0.2 : -1.02); p.lineTo(0.46 * wide, -1.08); p.quadraticCurveTo(0, -1.24, -0.46 * wide, -1.08); });
    paint(r, L === "harlequin" ? "#e8b923" : L === "sludge" ? "#a9b08a" : PAPER, 0.04);
    if (L !== "pierrot") inside(r, () => { g.fillStyle = L === "harlequin" ? RED : "#1c1533"; for (let k = 1; k <= 8; k += 2) { g.beginPath(); g.arc(-0.46 + k * 0.115, -0.87, 0.045, 0, 7); g.fill(); } });
  }
  function hood(C, L, s, open) {
    s = s || 1;
    const h = ell(0, -1.62, 0.76 * s, 0.7 * s);
    fill(h, C.hood);
    inside(h, () => {
      if (L === "harlequin") { g.fillStyle = NOIR; g.fillRect(0, -2.4, 1, 1.6); }
      g.fillStyle = `rgba(${C.hi},0.18)`; g.beginPath(); g.ellipse(-0.3, -1.95, 0.5, 0.3, -0.5, 0, 7); g.fill();
    });
    shade(h, L === "stardust" ? 0.18 : 0.3);
    line(h, 0.045);
    if (open !== false) paint(ell(0, -1.58, 0.56, 0.56), "#0a0616", 0.03);
    if (L === "sludge") { line(path((p) => { p.moveTo(-0.62, -2.0); p.lineTo(-0.42, -2.1); }), 0.025, "#cfc6d8"); paint(ell(-0.63, -2.0, 0.035, 0.035), "#cfc6d8", 0.015); }
    if (L === "stardust") { g.save(); g.translate(0.02, -2.5); g.rotate(-0.12); const hl = path((p) => p.ellipse(0, 0, 0.44, 0.1, 0, 0, 7)); line(hl, 0.1, INK); line(hl, 0.045, "#ffe9a8"); g.restore(); }
  }
  // eyes for a mask. kind "slit" is Hollow's, "ring" is Lantern's
  function slitEye(sd, mood, C) {
    const x = sd * 0.21, y = -1.62;
    if (mood === "happy") {
      const e = path((p) => { p.moveTo(x - 0.13, y + 0.04); p.quadraticCurveTo(x, y - 0.22, x + 0.13, y + 0.04); p.quadraticCurveTo(x, y - 0.08, x - 0.13, y + 0.04); });
      fill(e, "#05020c"); glow(x, y - 0.06, 0.2, C.glow, 0.7);
      line(path((p) => { p.moveTo(x - 0.07, y - 0.03); p.quadraticCurveTo(x, y - 0.12, x + 0.07, y - 0.03); }), 0.03, C.pupil);
    } else if (mood === "asleep") {
      line(path((p) => { p.moveTo(x - 0.12, y); p.quadraticCurveTo(x, y + 0.05, x + 0.12, y); }), 0.045, "#05020c");
    } else if (mood === "startled") {
      fill(ell(x, y, 0.13, 0.15), "#05020c"); glow(x, y, 0.3, C.glow, 0.95); fill(ell(x, y, 0.055, 0.065), C.pupil);
    } else {
      const sad = mood === "sad";
      g.save();
      g.translate(x, y); if (sad) g.rotate(sd * 0.5);
      const e = path((p) => { p.moveTo(-sd * 0.01, -0.22 * (sad ? 0.7 : 1)); p.quadraticCurveTo(sd * 0.13, -0.02, sd * 0.03, 0.18 * (sad ? 0.7 : 1)); p.quadraticCurveTo(-sd * 0.11, 0, -sd * 0.01, -0.22 * (sad ? 0.7 : 1)); });
      fill(e, "#05020c");
      glow(sd * 0.02, 0.06, 0.2, C.glow, sad ? 0.3 : 0.7);
      fill(ell(sd * 0.02, 0.06, 0.04, 0.055), sad ? `rgba(${C.glow},0.7)` : C.pupil);
      g.restore();
      if (sad && sd < 0) { glow(x - 0.02, y + 0.3, 0.12, C.glow, 0.7); fill(dripP(x - 0.02, y + 0.22, 0.03, 0.1), C.pupil); }
    }
  }
  function ringEye(x, y, sd, mood, ring, glowC, s) {
    s = s || 1;
    if (mood === "asleep") { line(path((p) => { p.moveTo(x - 0.14 * s, y); p.quadraticCurveTo(x, y + 0.09 * s, x + 0.14 * s, y); }), 0.05 * s, "#07030f"); return; }
    const big = mood === "startled" ? 1.18 : 1, sad = mood === "sad";
    fill(ell(x, y, 0.16 * s * big, 0.21 * s * big, sd * (sad ? 0.45 : 0.1)), "#07030f");
    glow(x, y + 0.02, 0.24 * s, glowC, mood === "startled" ? 0.85 : sad ? 0.25 : 0.5);
    const r = 0.075 * s * (mood === "startled" ? 1.25 : 1), yy = y + 0.02 + (sad ? 0.05 * s : 0);
    if (mood === "happy") line(path((p) => p.arc(x, yy + 0.03 * s, r * 1.15, Math.PI * 1.08, Math.PI * 1.92)), 0.04 * s, ring);
    else if (sad) { g.globalAlpha = 0.7; line(path((p) => p.arc(x, yy, r, 0.15, Math.PI - 0.15)), 0.028 * s, ring); g.globalAlpha = 1; }
    else { line(ell(x, yy, r, r), 0.028 * s, ring); if (mood === "startled") fill(ell(x, yy, r * 0.3, r * 0.3), ring); }
  }
  function mask(C, L, mood, eyes, ring) {
    const m = path((p) => { p.moveTo(0, -2.04); p.bezierCurveTo(0.5, -2.04, 0.56, -1.66, 0.42, -1.36); p.quadraticCurveTo(0.24, -1.1, 0, -1.08); p.quadraticCurveTo(-0.24, -1.1, -0.42, -1.36); p.bezierCurveTo(-0.56, -1.66, -0.5, -2.04, 0, -2.04); });
    fill(m, C.m1);
    inside(m, () => {
      g.fillStyle = C.m2; g.fillRect(0, -2.2, 1, 1.4);
      if (L !== "harlequin") { g.fillStyle = "rgba(18,8,40,0.2)"; g.beginPath(); g.ellipse(0.2, -1.2, 0.5, 0.2, 0, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(-0.24, -1.86, 0.16, 0.07, -0.5, 0, 7); g.fill();
      if (L === "sludge") { g.fillStyle = "rgba(111,154,34,0.35)"; g.beginPath(); g.ellipse(0.26, -1.3, 0.2, 0.14, 0.4, 0, 7); g.fill(); }
      if (L === "harlequin") fill(diamondP(-0.21, -1.62, 0.17, 0.3), RED);
    });
    line(m, 0.045);
    if (L === "stardust") {
      // cracks with light behind them
      const cr = path((p) => { p.moveTo(-0.34, -1.98); p.lineTo(-0.24, -1.84); p.lineTo(-0.32, -1.74); p.moveTo(0.1, -2.03); p.lineTo(0.16, -1.9); p.lineTo(0.08, -1.82); p.lineTo(0.14, -1.72); p.moveTo(0.3, -1.24); p.lineTo(0.2, -1.32); p.lineTo(0.26, -1.42); });
      inside(m, () => { glow(-0.28, -1.86, 0.22, C.glow, 0.8); glow(0.12, -1.86, 0.24, C.glow, 0.8); glow(0.24, -1.32, 0.2, C.glow, 0.8); });
      line(cr, 0.035, "#e8b923"); line(cr, 0.014, "#fffbe0");
    } else if (L !== "harlequin") line(path((p) => { p.moveTo(-0.3, -2.0); p.lineTo(-0.24, -1.86); p.lineTo(-0.3, -1.78); p.lineTo(-0.22, -1.7); }), 0.02);
    for (const sd of [-1, 1]) {
      if (eyes === "ring") ringEye(sd * 0.21, -1.6, sd, mood, ring, C.glow, 0.92);
      else if (eyes === "slit") slitEye(sd, mood, C);
      if (L === "sludge") paint(dripP(sd * 0.22, -1.48, 0.035, sd < 0 ? 0.32 : 0.2), "#a6d94a", 0.022);
    }
    if (L === "pierrot") { line(path((p) => { p.moveTo(-0.22, -1.4); p.lineTo(-0.22, -1.22); }), 0.03, NOIR); fill(dripP(-0.22, -1.24, 0.035, 0.09), NOIR); for (const sd of [-1, 1]) line(path((p) => { p.moveTo(sd * 0.1, -1.92); p.lineTo(sd * 0.3, -1.88); }), 0.025, NOIR); }
    else if (L === "base" && mood !== "sad") fill(diamondP(-0.24, -1.28, 0.05, 0.08), "#05020c");
  }
  // ================= Lantern's parts =================
  const PAL_L = {
    base:      { robe: ["#f1edff", "#b9aeea", "rgba(134,114,214,0.35)"], sl: ["#e6e0fb", "#e6e0fb"], head: ["#ffffff", "#d6ccf6"], ring: "#bff4ff", glow: "143,233,255", rib: "#d9d0f8", light: "255,225,140" },
    stardust:  { robe: ["#fffdf2", "#f6e6a8", "rgba(255,210,63,0.4)"], sl: ["#fff6d8", "#fff6d8"], head: ["#ffffff", "#fff0c2"], ring: "#ffe9a8", glow: "255,225,140", rib: "#ffe9a8", light: "255,225,140" },
    sludge:    { robe: ["#cfd6b4", "#7f9a5a", "rgba(63,90,28,0.55)"], sl: ["#b9c49a", "#b9c49a"], head: ["#e4e8cc", "#a9b88a"], ring: "#b6ff5c", glow: "182,255,92", rib: "#7f9a5a", light: "182,255,92" },
    harlequin: { robe: ["#f4efe6", "#cdbfd0", "rgba(143,34,56,0.5)"], sl: [RED, NOIR], head: ["#ffffff", "#e6d6dc"], ring: "#ffd23f", glow: "255,210,63", rib: RED, light: "255,90,110" },
    pierrot:   { robe: ["#ffffff", "#e4e0f0", "rgba(200,200,230,0.45)"], sl: ["#f4f1fb", "#f4f1fb"], head: ["#ffffff", "#e9e6f4"], ring: "#bfd8ff", glow: "170,200,255", rib: NOIR, light: "200,220,255" }
  };
  function ribbons(C, L, tl) {
    for (const sd of [-1, 1]) {
      g.save();
      sway(sd * 0.3, -1.9, sd, 0.07);
      const droop = L === "sludge";
      const ex = sd * (0.95 + tl * 0.1), ey = droop ? -1.5 + tl * 0.2 : -2.9 - tl * 0.25;
      const r = path((p) => { p.moveTo(sd * 0.3, -1.9); if (droop) p.bezierCurveTo(sd * 0.8, -2.2, sd * 1.0, -2.0, ex, ey); else p.bezierCurveTo(sd * 0.7, -2.3, sd * 0.6, -2.7 - tl * 0.2, ex, ey); });
      line(r, 0.1, INK); line(r, 0.045, C.rib);
      tip(ex, ey - (droop ? -0.04 : 0.05), TIP[L] === "bell" && L === "base" ? "star" : TIP[L]);
      g.restore();
    }
  }
  function robe(C, L, tl) {
    const r = path((p) => {
      p.moveTo(-0.32, -1.1); p.bezierCurveTo(-0.6, -0.9, -0.62, -0.5, -0.4, -0.3);
      p.bezierCurveTo(-0.2, -0.1, 0.1, -0.1, 0.16, 0.12 + tl * 0.1); p.bezierCurveTo(0.2, 0.3, 0.0, 0.34, -0.06, 0.24);
      p.bezierCurveTo(0.3, 0.2, 0.36, -0.2, 0.5, -0.4); p.bezierCurveTo(0.64, -0.6, 0.56, -0.92, 0.32, -1.1); p.closePath();
    });
    const rg = g.createLinearGradient(0, -1.1, 0, 0.3);
    rg.addColorStop(0, C.robe[0]); rg.addColorStop(0.6, C.robe[1]); rg.addColorStop(1, C.robe[2]);
    fill(r, rg);
    inside(r, () => {
      if (L === "harlequin") for (let q = 0; q < 9; q++) { g.fillStyle = q % 2 ? RED : NOIR; g.fill(diamondP(-0.56 + q * 0.14, -0.42 + Math.abs(q - 4) * 0.012, 0.07, 0.1)); }
      if (L === "pierrot") for (const [x, y] of [[-0.32, -0.6], [0.34, -0.62]]) fill(ell(x, y, 0.06, 0.06), NOIR);
      if (L === "sludge") { g.fillStyle = "rgba(63,90,28,0.45)"; for (let k = 0; k < 4; k++) g.fill(dripP(-0.4 + k * 0.26, -0.5 + hash(k + 3) * 0.1, 0.05, 0.24)); }
    });
    shade(r, 0.2);
    line(r, 0.045);
    for (const sd of [-1, 1]) {
      const sl = path((p) => { p.moveTo(sd * 0.3, -1.06); p.quadraticCurveTo(sd * 0.74, -0.9, sd * 0.72, -0.5); p.lineTo(sd * 0.66, -0.34); p.lineTo(sd * 0.6, -0.46); p.lineTo(sd * 0.54, -0.32); p.quadraticCurveTo(sd * 0.46, -0.7, sd * 0.3, -0.84); p.closePath(); });
      paint(sl, C.sl[sd < 0 ? 0 : 1], 0.04);
      if (L === "sludge") paint(dripP(sd * 0.6, -0.4, 0.035, 0.2), "#a6d94a", 0.025);
      if (L === "pierrot") fill(ell(sd * 0.58, -0.62, 0.05, 0.05), NOIR);
    }
  }
  // the barred window, and whatever is burning in it
  function chest(C, L, mood) {
    const win = path((p) => p.roundRect(-0.19, -1.0, 0.38, 0.5, 0.17));
    const k = mood === "happy" ? 1.25 : mood === "startled" ? 1.5 : mood === "sad" ? 0.45 : mood === "asleep" ? 0.3 : 1;
    fill(win, "#140a2a");
    glow(0, -0.74, 0.5 * Math.sqrt(k), C.light, Math.min(1, 0.75 * k) * (0.86 + 0.14 * Math.sin(A.t * 6 + A.seed)));
    const s = 0.7 + 0.3 * Math.min(1.3, k);
    if (L === "sludge") { fill(ell(0, -0.68, 0.12 * s, 0.14 * s), "#b6ff5c"); fill(ell(-0.04, -0.72, 0.03, 0.03), "#eaffc0"); }
    else if (L === "harlequin") { g.save(); g.translate(0, -0.74); g.rotate(0.2); fill(diamondP(0, 0, 0.09 * s, 0.14 * s), "#ff5a6e"); fill(diamondP(-0.02, -0.03, 0.03, 0.05), "#ffd0d6"); g.restore(); }
    else if (L === "pierrot") { fill(ell(0, -0.74, 0.11 * s, 0.11 * s), "#eef4ff"); fill(ell(0.06 * s, -0.78, 0.09 * s, 0.09 * s), "#140a2a"); }
    else star(0, -0.74, 0.12 * s, "#fff3c2");
    line(win, 0.04);
    for (const x of [-0.07, 0.07]) line(path((p) => { p.moveTo(x, -1.0); p.lineTo(x, -0.5); }), 0.03, BONE);
    if (L === "sludge") for (const x of [-0.07, 0.07]) paint(dripP(x, -0.52, 0.035, 0.22 + (x > 0 ? 0.1 : 0)), "#a6d94a", 0.025);
  }
  function lhead(C, L, o, tl) {
    const h = path((p) => {
      p.moveTo(0, -1.08); p.bezierCurveTo(-0.5, -1.08, -0.76, -1.36, -0.66, -1.72);
      p.bezierCurveTo(-0.56, -2.06, -0.2, -2.14, 0.0, -2.36 - tl * 0.1); p.bezierCurveTo(0.1, -2.5, 0.3, -2.44, 0.24, -2.3);
      p.bezierCurveTo(0.2, -2.38, 0.1, -2.36, 0.12, -2.24); p.bezierCurveTo(0.3, -2.1, 0.6, -2.0, 0.66, -1.72); p.bezierCurveTo(0.76, -1.36, 0.5, -1.08, 0, -1.08);
    });
    const hg = g.createLinearGradient(0, -2.4, 0, -1.08);
    hg.addColorStop(0, C.head[0]); hg.addColorStop(1, C.head[1]);
    fill(h, hg);
    inside(h, () => {
      if (L === "pierrot") { g.fillStyle = NOIR; g.beginPath(); g.moveTo(-0.8, -1.96); g.quadraticCurveTo(0, -2.12, 0.8, -1.96); g.lineTo(0.8, -2.7); g.lineTo(-0.8, -2.7); g.fill(); }
      if (L === "sludge") { g.fillStyle = "rgba(63,90,28,0.4)"; g.fill(dripP(-0.4, -2.1, 0.08, 0.5)); g.fill(dripP(0.36, -2.1, 0.06, 0.36)); }
      if (L === "harlequin") { g.fillStyle = RED; g.fill(diamondP(0.27, -1.5, 0.2, 0.33)); }
    });
    shade(h, 0.16);
    line(h, 0.045);
    if (!o.noEyes) for (const sd of [-1, 1]) ringEye(sd * 0.27, -1.52, sd, o.mood, C.ring, C.glow);
    if (L === "pierrot") { line(path((p) => { p.moveTo(-0.27, -1.28); p.lineTo(-0.27, -1.16); }), 0.03, NOIR); fill(dripP(-0.27, -1.18, 0.035, 0.09), NOIR); }
    else if (L !== "harlequin") line(path((p) => p.arc(0.02, -1.9, 0.08, 0.6, 2.6)), 0.03, L === "sludge" ? "#6f9a22" : L === "stardust" ? "#e8b923" : "#7fd8ea");
    if (L === "stardust") { g.save(); g.translate(0.04, -2.72); g.rotate(-0.2); const hl = path((p) => p.ellipse(0, 0, 0.42, 0.1, 0, 0.5, 5.6)); line(hl, 0.09, INK); line(hl, 0.04, "#ffe9a8"); g.restore(); }
  }
  const PAL_U = {
    base:      { disc: "#05030c", rim: "#eaf4ff", ray: "#bfe0ff", ray2: "#7f96dc", cloak: "#0d0b22", eye: "#eaf4ff", glow: "190,225,255", speck: "#bfe0ff" },
    stardust:  { disc: "#15103a", rim: "#fff3c2", ray: "#ffd23f", ray2: "#fff0b8", cloak: "#2a2460", eye: "#fff3c2", glow: "255,225,140", speck: "#ffd23f" },
    sludge:    { disc: "#070b06", rim: "#b6ff5c", ray: "#6f9a22", ray2: "#3d5a1c", cloak: "#111a10", eye: "#b6ff5c", glow: "182,255,92", speck: "#6f9a22" },
    harlequin: { disc: "#0a0612", rim: PAPER, ray: RED, ray2: BONE, cloak: NOIR, eye: "#ffd23f", glow: "255,210,63", speck: RED },
    pierrot:   { disc: "#f6f3ec", rim: NOIR, ray: NOIR, ray2: "#ffffff", cloak: "#f4efe6", eye: NOIR, glow: "170,200,255", speck: NOIR }
  };
  // an eye that is a moon: its phase is the mood
  function phaseEye(x, y, r, sd, mood, C) {
    if (mood === "asleep") { g.globalAlpha = 0.55; line(ell(x, y, r * 0.8, r * 0.8), 0.022, C.eye); g.globalAlpha = 1; return; }
    const e = ell(x, y, r, r);
    glow(x, y, r * 2.4, C.glow, mood === "startled" ? 0.8 : mood === "sad" ? 0.2 : 0.45);
    g.globalAlpha = mood === "sad" ? 0.75 : 1;
    fill(e, C.eye);
    g.globalAlpha = 1;
    if (mood === "startled") return;
    // the shadow across it
    const [ox, oy, rr] = mood === "happy" ? [0, r * 0.62, r * 1.05] : mood === "sad" ? [sd * r * 0.2, -r * 0.55, r * 1.1] : [sd * r * 0.55, -r * 0.3, r * 0.98];
    inside(e, () => fill(ell(x + ox, y + oy, rr, rr), C.disc));
    line(e, 0.012, C.disc);
  }
  // ================= Umbra, cut into the same three parts as the others =================
  function cometTails(C, L, k) {
    for (const [sd, len] of [[-1, 1], [1, 0.8]]) {
      g.save();
      sway(sd * 0.36, -2.0, sd, 0.06);
      const ex = sd * (0.86 + k * 0.3), ey = -1.2 - (1 - k) * 0.35 + (1 - len) * 0.3;
      const t = path((p) => { p.moveTo(sd * 0.36, -2.0); p.bezierCurveTo(sd * 0.9, -2.3, sd * (1.0 + k * 0.3), -1.9, ex, ey); });
      line(t, 0.17, INK); line(t, 0.09, C.cloak === "#f4efe6" ? NOIR : C.cloak); line(t, 0.03, C.ray);
      if (L === "base") { paint(ell(ex, ey, 0.085, 0.085), "#c9b8ff", 0.03); line(path((p) => p.ellipse(ex, ey, 0.17, 0.05, -0.4, 0, 7)), 0.025, "#eaf4ff"); }
      else tip(ex, ey, TIP[L]);
      g.restore();
    }
  }
  function nightCloak(C, L) {
    for (const sd of [-1, 1]) foot(sd, () => paint(path((p) => { p.moveTo(sd * 0.08, -0.02); p.quadraticCurveTo(sd * 0.18, -0.18, sd * 0.36, -0.05); p.quadraticCurveTo(sd * 0.46, -0.1, sd * 0.42, 0); p.closePath(); }), L === "pierrot" ? NOIR : "#07051a", 0.04));
    const cl = path((p) => {
      p.moveTo(-0.24, -1.1); p.bezierCurveTo(-0.44, -0.8, -0.62, -0.45, -0.58, -0.16);
      for (let q = 1; q <= 6; q++) p.quadraticCurveTo(-0.58 + (q - 0.5) * 0.193, -0.02 - (L === "sludge" ? hash(q) * 0.08 : 0), -0.58 + q * 0.193, -0.16);
      p.bezierCurveTo(0.62, -0.45, 0.44, -0.8, 0.24, -1.1); p.closePath();
    });
    fill(cl, C.cloak);
    inside(cl, () => {
      if (L === "harlequin") { for (let r = 0; r < 8; r++) for (let q = 0; q < 9; q++) if ((r + q) % 2) { g.fillStyle = (r + q) % 4 === 1 ? RED : BONE; g.fill(diamondP(-0.62 + q * 0.155, -1.05 + r * 0.135, 0.075, 0.065)); } }
      else if (L === "pierrot") { for (let q = 0; q < 3; q++) fill(ell(0, -0.84 + q * 0.23, 0.065, 0.065), NOIR); }
      else if (L === "sludge") { g.fillStyle = "rgba(166,217,74,0.5)"; for (let q = 0; q < 5; q++) g.fill(dripP(-0.44 + q * 0.22, -0.9 + hash(q + 1) * 0.3, 0.035, 0.24)); }
      else for (let q = 0; q < 16; q++) star((hash(q + 20) - 0.5) * 1.0, -0.22 - hash(q + 25) * 0.75, 0.025 + hash(q + 29) * 0.025, q % 4 ? C.speck : "#ffffff");
      g.strokeStyle = `rgba(${C.glow},0.5)`; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.22, -1.08); g.bezierCurveTo(-0.42, -0.8, -0.6, -0.45, -0.56, -0.18); g.stroke();
    });
    shade(cl, L === "pierrot" ? 0.14 : 0.3);
    line(cl, 0.045);
    if (L === "sludge") for (const x of [-0.38, 0.12, 0.44]) paint(dripP(x, -0.1, 0.04, 0.18), "#a6d94a", 0.028);
  }
  const HY = -1.62;
  function coronaRays(C, L, R, k, grown) {
    const n = grown ? 16 : 12, w = 0.13 * 0.56 / R;
    for (let q = 0; q < n; q++) {
      const a = (q / n) * Math.PI * 2 + 0.1 + A.spinA, long = q % 2 === 0, len = R + (long ? 0.42 : 0.24) * k * (L === "sludge" ? 0.6 + hash(q + 3) * 0.8 : 1);
      const ray = path((p) => { p.moveTo(Math.cos(a - w) * R * 0.9, HY + Math.sin(a - w) * R * 0.9); p.lineTo(Math.cos(a) * len, HY + Math.sin(a) * len); p.lineTo(Math.cos(a + w) * R * 0.9, HY + Math.sin(a + w) * R * 0.9); p.closePath(); });
      paint(ray, long ? C.ray : C.ray2, 0.035);
    }
  }
  // the ring a Stardust Jinx wears round its head like a planet's: back half first, front half last
  function planetRing(R, front) {
    g.save(); g.translate(0, HY); g.rotate(-0.3);
    const arc = path((p) => front ? p.ellipse(0, 0, R * 1.78, R * 0.4, 0, 0.08, Math.PI - 0.08) : p.ellipse(0, 0, R * 1.78, R * 0.4, 0, Math.PI, Math.PI * 2));
    line(arc, 0.12, INK); line(arc, 0.06, "#ffe9a8");
    g.restore();
  }
  function discHead(C, L, R) {
    const disc = ell(0, HY, R, R);
    paint(disc, C.disc, 0.05);
    line(ell(0, HY, R - 0.055, R - 0.055), 0.04, C.rim);
    if (L !== "pierrot") { glow(R * 0.64, HY - R * 0.71, 0.26, "255,255,255", 0.9); fill(ell(R * 0.64, HY - R * 0.71, 0.035, 0.035), "#ffffff"); }
    else inside(disc, () => { g.fillStyle = "rgba(18,8,40,0.1)"; for (const [x, y, r] of [[0.2, -0.26, 0.1], [-0.3, 0.16, 0.07], [0.3, 0.2, 0.05]]) { g.beginPath(); g.arc(x * R / 0.56, HY + y * R / 0.56, r, 0, 7); g.fill(); } });
    if (L === "harlequin") inside(disc, () => fill(diamondP(-0.2, HY - 0.02, 0.18, 0.3), RED));
  }
  function discMarks(C, L, R, mood) {
    if (L === "pierrot") { line(path((p) => { p.moveTo(-0.2, HY + 0.16); p.lineTo(-0.2, HY + 0.3); }), 0.03, NOIR); fill(dripP(-0.2, HY + 0.28, 0.035, 0.09), NOIR); }
    if (L === "sludge") for (const [x, len] of [[-0.3, 0.3], [0.05, 0.2], [0.34, 0.36]]) paint(dripP(x * R / 0.56, HY + Math.sqrt(Math.max(0, R * R - x * x * R * R / 0.3136)) - 0.04, 0.045, len), "#0c120a", 0.03);
    if (mood === "sad") { glow(-0.2, HY + 0.26, 0.1, C.glow, 0.7); fill(dripP(-0.2, HY + 0.18, 0.028, 0.09), C.eye); }
  }
  function ribbonCap(R, color) {
    const a0 = -Math.PI / 2 - 0.62, a1 = -Math.PI / 2 + 0.62;
    const cap = path((p) => { p.arc(0, HY, R + 0.01, a0, a1); p.quadraticCurveTo(0, HY - R + 0.2, Math.cos(a0) * (R + 0.01), HY + Math.sin(a0) * (R + 0.01)); p.closePath(); });
    paint(cap, color, 0.04);
    for (const sd of [-1, 1]) paint(ell(sd * 0.24, HY - R + 0.05, 0.055, 0.055), "#ffd23f", 0.03);
  }
  // eyes on a head that isn't their own
  function otherEyes(kind, where, mood, L) {
    const [ex, ey] = where === "bulb" ? [0.27, -1.52] : where === "mask" ? [0.21, -1.62] : [0.2, -1.64];
    for (const sd of [-1, 1]) {
      const x = sd * ex, y = ey;
      if (kind === "moon") { fill(ell(x, y, 0.16, 0.19), "#07030f"); phaseEye(x, y, 0.115, sd, mood, { eye: L === "pierrot" ? "#eef4ff" : cU.eye, glow: cU.glow, disc: "#07030f" }); }
      else if (kind === "ring") ringEye(x, y + 0.02, sd, mood, cL.ring, cL.glow, where === "bulb" ? 1 : 0.92);
      else if (where === "disc") { const e = path((p) => { p.moveTo(x - sd * 0.01, y - 0.2); p.quadraticCurveTo(x + sd * 0.12, y, x + sd * 0.03, y + 0.18); p.quadraticCurveTo(x - sd * 0.1, y, x - sd * 0.01, y - 0.2); }); glow(x, y, 0.3, cH.glow, 0.6); fill(e, cH.pupil); }
      else { g.save(); g.translate(x - sd * 0.21, y + 1.62); slitEye(sd, mood, cH); g.restore(); }
    }
  }
  const OWN = { disc: "moon", mask: "slit", bulb: "ring" };

  // o: { head: disc|mask|bulb, piece: corona|hood|ribbons, body: night|tatter|wisp, grown, lean, mood,
  //      t, walk, ph, seed, tilt, look, hat, hue, evil, j }
  return function (o) {
    g = ctx;
    A = { t: o.t || 0, walk: !!o.walk, ph: o.ph || 0, seed: o.seed || 0, spinA: (o.t || 0) * (o.mood === "happy" ? 0.5 : 0.12) };
    const L = o.lean || "base";
    cH = PAL_H[L]; cL = PAL_L[L]; cU = PAL_U[L];
    if (o.evil) { cH = Object.assign({}, cH, { glow: "255,60,80", pupil: "#ffd0d6" }); cL = Object.assign({}, cL, { ring: "#ff5a6e", glow: "255,60,80" }); cU = Object.assign({}, cU, { eye: "#ff8a94", glow: "255,60,80" }); }
    else if (L === "base" && o.hue !== undefined) {
      // a child's eyes shine in its own colour
      const c = hsl(o.hue, 90, 76), cs = c.map((v) => v | 0).join(","), pale = rgb(mix(c, "#ffffff", 0.6));
      cH = Object.assign({}, cH, { glow: cs, pupil: pale }); cL = Object.assign({}, cL, { ring: pale, glow: cs }); cU = Object.assign({}, cU, { eye: pale, glow: cs });
    }
    const H = cH, Lc = cL, Uc = cU;
    const grown = o.grown, floats = o.body === "wisp", k = grown ? 1 : 0.72, tl = grown ? 1 : 0.6, ek = OWN[o.head];
    const R = o.head === "bulb" ? 0.7 : o.head === "mask" ? 0.6 : o.piece === "hood" ? 0.5 : 0.56;
    const look = o.look || [0, 0];
    const headXf = () => { g.translate(0, -1.1); g.rotate(o.tilt || 0); g.translate(0, 1.1); };
    g.save();
    g.lineJoin = "round";
    g.lineCap = "round";
    g.translate(0, floats ? -0.22 + (o.mood === "sad" ? 0.12 : o.mood === "asleep" && o.asleep ? 0.2 : o.mood === "happy" ? -0.08 : 0) : grown ? 0 : 0.22);
    // what hangs behind the head
    g.save();
    headXf();
    if (o.piece === "hood") tails(H, grown ? 1 : 0.55, TIP[L]);
    if (o.piece === "ribbons") ribbons(Lc, L, tl);
    if (o.piece === "corona") cometTails(Uc, L, k);
    g.restore();
    // the body; a child has the same head on a shorter one
    g.save();
    if (!grown) { g.translate(0, -1.1); g.scale(0.92, 0.8); g.translate(0, 1.1); }
    if (floats) {
      g.translate(0, -1.1); g.rotate(Math.sin(A.t * 1.6 + A.seed) * 0.05 + (A.walk ? 0.1 : 0)); g.translate(0, 1.1);
      robe(Lc, L, tl);
      chest(Lc, L, o.mood);
    } else if (o.body === "tatter") cloak(H, L, false);
    else nightCloak(Uc, L);
    g.restore();
    // the headpiece, the head, the eyes, a hat
    g.save();
    headXf();
    if (o.piece === "hood" && (grown || L === "pierrot") && !(o.body === "tatter" && L === "pierrot")) ruff(L);
    if (o.piece === "corona") { coronaRays(Uc, L, R, k, grown); if (L === "stardust") planetRing(R, false); }
    if (o.piece === "hood") hood(H, L, o.head === "bulb" ? 1.14 : 1, o.head !== "bulb");
    const eyesNow = () => {
      g.save();
      g.translate(look[0] * 0.035, look[1] * 0.03);
      if (o.head === "disc") for (const sd of [-1, 1]) phaseEye(sd * 0.2, HY - 0.02, 0.125, sd, o.mood, Uc);
      else otherEyes(ek, o.head, o.mood, L);
      g.restore();
    };
    if (o.head === "disc") { discHead(Uc, L, R); eyesNow(); discMarks(Uc, L, R, o.mood); }
    else if (o.head === "mask") {
      if (o.piece !== "hood") { const back = ell(0, HY, 0.6, 0.6); paint(back, L === "harlequin" ? NOIR : H.hood); inside(back, () => { g.fillStyle = `rgba(${H.hi},0.16)`; g.beginPath(); g.ellipse(-0.28, HY - 0.34, 0.3, 0.13, -0.5, 0, 7); g.fill(); }); }
      mask(H, L, o.mood, "none", Lc.ring);
      eyesNow();
    } else { lhead(Lc, L, { mood: o.mood, noEyes: true }, tl); eyesNow(); }
    if (o.piece === "ribbons" && o.head !== "bulb") ribbonCap(R, Lc.rib === NOIR ? "#3a3350" : Lc.rib);
    if (o.piece === "corona" && L === "stardust") planetRing(R, true);
    if (o.hat) { const hr = o.piece === "hood" ? 0.74 : R; wearHat(o.hat, o.j || { hue: 300 }, 0.62, hr, hr * 0.96, HY, 0.045, A.t, INK, 0); }
    g.restore();
    g.restore();
  };
  })();

  D.KINDS = { Umbra: { head: "disc", piece: "corona", body: "night" }, Hollow: { head: "mask", piece: "hood", body: "tatter" }, Lantern: { head: "bulb", piece: "ribbons", body: "wisp" } };

  D.drawJinx = function (j, x, y, o) {
    o = o || {};
    const t = o.t || 0, K = D.jinxLook(j), sd = j.seed || 0, grown = K.adult, floats = K.body === "wisp";
    const u = 27 * U * (grown ? 1 : 0.92) * (o.scale || 1);
    const walk = !!o.walk, dir = o.dir || 1, hop = o.hop || 0, sit = !!o.sleep;
    const ph = t * 9 + sd, beat = Math.sin((t * Math.PI * 2) / 0.6 + sd), pulse = (0.5 + 0.5 * beat) * (0.5 + 0.5 * beat);
    const sad = (j.mood === undefined ? 60 : j.mood) < 30 && !o.happy;
    // a floater bobs in the air; a walker bounces on its feet
    const hover = floats && !sit ? u * 0.07 * Math.sin(t * 2 + sd) : 0;
    const bounce = walk ? (floats ? 0 : Math.abs(Math.sin(ph)) * u * 0.14) : sit ? 0 : pulse * u * 0.045;
    const lift = bounce + hop + hover;
    const tilt = o.hurt ? -0.22 : sit ? 0.16 : walk ? Math.sin(ph) * 0.05 : Math.sin((t * Math.PI) / 0.6 + sd) * 0.05;
    const lean = o.hurt ? -0.16 : walk ? 0.06 : 0;
    const squash = o.hurt ? 0.1 : walk ? Math.cos(ph * 2) * 0.03 : sit ? 0 : -beat * 0.015;
    const blink = (t + sd * 3) % 4.3 < 0.13;
    const mood = sit ? "asleep" : o.hurt || o.wide ? "startled" : o.happy ? "happy" : sad ? "sad" : blink ? "asleep" : null;

    // shadow
    const sh = ctx.createRadialGradient(x, y, 0, x, y, u * 1.1);
    sh.addColorStop(0, floats ? "rgba(5,2,12,0.35)" : "rgba(5,2,12,0.55)");
    sh.addColorStop(1, "rgba(5,2,12,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.max(0.5, 1 - lift / (u * 4)), 0.24);
    ctx.translate(-x, -y);
    ctx.fillStyle = sh;
    ctx.fillRect(x - u * 1.2, y - u * 1.2, u * 2.4, u * 2.4);
    ctx.restore();
    if (o.selected) {
      ctx.save();
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, u * 1.4, u * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const drawBody = () => {
      ctx.save();
      ctx.translate(x, y);
      if (o.spin) { ctx.translate(0, -u * 1.1); ctx.rotate(o.spin); ctx.translate(0, u * 1.1); }
      ctx.rotate(lean);
      // it turns like a paper cut-out: flat on, then edge on, then the other way
      const tw = o.twirl ? Math.cos(o.twirl) : 1;
      const fdir = Math.abs(dir) < 0.14 ? 0.14 * (dir < 0 ? -1 : 1) : dir;
      ctx.scale((1 + squash) * fdir * (Math.abs(tw) < 0.12 ? 0.12 * (tw < 0 ? -1 : 1) : tw), 1 - squash);
      ctx.scale(u, u);
      paintJinx({ head: K.head, piece: K.piece, body: K.body, grown, lean: K.lean, mood, asleep: sit, t, walk, ph, seed: sd, tilt,
        look: o.look ? [o.look[0] * (dir < 0 ? -1 : 1), o.look[1]] : null, hat: o.hat !== undefined ? o.hat : j.hat, hue: j.hue, evil: o.evil, j });
      ctx.restore();
    };
    const tall = u * 4.4, wide = o.spin ? tall : u * 1.75;
    cutout(drawBody, x, y, wide, tall, o.spin ? tall : u * 0.65, { dy: -lift, flat: o.flat, edgeColor: o.edgeColor, edge: Math.max(2.2, 2.6 * (o.scale || 1)) });

    const topScreen = y - lift - u * 2.2;
    if (grown && K.best === "juggle") {
      // a Jinx whose best stat is Juggle keeps three small planets in the air
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k * 2.09, R = u * 0.75;
        const px = x + Math.cos(a) * R * 1.5, py = topScreen - R * 1.5 - Math.abs(Math.sin(a)) * R * 1.0;
        ctx.fillStyle = ["#ff5fa8", "#ffd23f", "#8fe9ff"][k];
        ctx.strokeStyle = "#120a1e";
        ctx.lineWidth = Math.max(1, u * 0.035);
        ctx.beginPath(); ctx.arc(px, py, R * 0.19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath(); ctx.ellipse(px, py, R * 0.32, R * 0.08, -0.4, 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (sit) {
      ctx.fillStyle = "rgba(201,184,255,0.9)";
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.5 + k / 3) % 1;
        ctx.globalAlpha = 1 - q;
        ctx.font = `${(8 + q * 10) * U * (o.scale || 1)}px "Permanent Marker", cursive`;
        ctx.fillText("z", x + dir * u * (0.8 + q * 0.5), topScreen - q * u * 1.0);
      }
      ctx.globalAlpha = 1;
    }
    return { x, y: y - lift - u * 1.3, r: u, faceY: y - lift - u * 1.6, topY: topScreen - u * 1.0, feetY: y };
  };

  D.drawEgg = function (e, x, y, t) {
    const r = 18 * U;
    const wob = e.wobble || 0;
    const prog = 1 - e.hatch / (e.hatchMax || 45);
    ctx.fillStyle = "rgba(5,2,12,0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    cutout(() => {
    ctx.save();
    ctx.translate(x, y - r * 1.15);
    ctx.rotate(Math.sin(t * 18) * wob * 0.25 + Math.sin(t * 1.3 + (e.seed || 0)) * 0.04 * (0.3 + prog));
    const c = hsl(e.hue, 70, 72);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.3);
    g.addColorStop(0, "#fffaf0");
    g.addColorStop(0.6, rgb(mix(c, "#ffffff", 0.55)));
    g.addColorStop(1, rgb(mix(c, "#1b1029", 0.35)));
    const egg = new Path2D();
    egg.moveTo(0, -r * 1.25);
    egg.bezierCurveTo(r * 0.85, -r * 1.2, r * 1.0, r * 0.4, 0, r * 1.0);
    egg.bezierCurveTo(-r * 1.0, r * 0.4, -r * 0.85, -r * 1.2, 0, -r * 1.25);
    glow(0, 0, r * 2.2, rgb(c), 0.15 + prog * 0.25);
    ctx.fillStyle = g;
    ctx.fill(egg);
    ctx.save();
    ctx.clip(egg);
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = i % 2 ? "rgba(214,40,57,0.7)" : "rgba(27,23,38,0.6)";
      ctx.beginPath();
      ctx.moveTo(i * r * 0.4, -r * 0.05);
      ctx.lineTo(i * r * 0.4 + r * 0.2, r * 0.18);
      ctx.lineTo(i * r * 0.4, r * 0.41);
      ctx.lineTo(i * r * 0.4 - r * 0.2, r * 0.18);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(90,40,120,0.35)";
    const rr = rng(e.seed || 3);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc((rr() - 0.5) * r * 1.4, -r * 0.4 - rr() * r * 0.7, r * 0.06 + rr() * r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    if (prog > 0.55) {
      ctx.strokeStyle = "#1b1029";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.6);
      ctx.lineTo(-r * 0.2, -r * 0.4);
      ctx.lineTo(0, -r * 0.7);
      if (prog > 0.8) {
        ctx.lineTo(r * 0.25, -r * 0.45);
        ctx.lineTo(r * 0.55, -r * 0.65);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#1b1029";
    ctx.lineWidth = 2;
    ctx.stroke(egg);
    ctx.restore();
    }, x, y, r * 1.7, r * 2.8, r * 0.3, { edge: 2.4 });
    return { x, y: y - r * 1.15, r };
  };

  // ---------- foes ----------
  // Every foe has its own drawing in ART, built from shared inked parts: bodies with crosshatched
  // shadows, gloved hands, big shoes, eyes and mouths that can make faces, and patterned cloth.
  const FINK = "#140a1e";
  for (const k in JG.FOES) JG.FOES[k].id = k;
  function fPaint(path, fill, lw) {
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }
  // shadow on the side away from the light, crosshatched like a zine drawing, and a rim of light
  function fShade(path, r, lx, ly, k) {
    ctx.save();
    ctx.clip(path);
    const sh = new Path2D();
    sh.rect(-r * 5, -r * 5, r * 10, r * 10);
    sh.arc(lx === undefined ? -r * 0.3 : lx, ly === undefined ? -r * 0.4 : ly, r * 1.2, 0, Math.PI * 2, true);
    ctx.fillStyle = `rgba(20,8,45,${k || 0.26})`;
    ctx.fill(sh, "evenodd");
    ctx.save();
    ctx.clip(sh, "evenodd");
    ctx.strokeStyle = "rgba(20,8,45,0.3)";
    ctx.lineWidth = Math.max(0.8, r * 0.02);
    const st = Math.max(4, r * 0.11);
    ctx.beginPath();
    for (let i = -40; i < 40; i++) { ctx.moveTo(i * st - r * 3, -r * 3); ctx.lineTo(i * st + r * 3, r * 3); }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = r * 0.12;
    ctx.stroke(path);
    ctx.restore();
  }
  function fBody(path, fill, r, lw, lx, ly, k) {
    ctx.fillStyle = fill;
    ctx.fill(path);
    fShade(path, r, lx, ly, k);
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }
  function vgrad(c0, c1, y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }
  function limb(pts, w, fill, lw) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [width, col] of [[w + lw * 2, FINK], [w, fill]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  }
  // cloth patterns, drawn inside a shape
  function stripes(path, col, w, ang, x0) {
    ctx.save();
    ctx.clip(path);
    ctx.rotate(ang || 0);
    ctx.fillStyle = col;
    for (let i = -30; i < 30; i++) ctx.fillRect((x0 || 0) + i * w * 2, -w * 60, w, w * 120);
    ctx.restore();
  }
  function diamonds(path, c1, c2, s, ox, oy) {
    ctx.save();
    ctx.clip(path);
    for (let i = -8; i <= 8; i++) for (let k = -8; k <= 8; k++) {
      const x = (ox || 0) + i * s + (k % 2 ? s / 2 : 0), y = (oy || 0) + k * s * 0.8;
      ctx.fillStyle = (i + k) % 2 ? c1 : c2;
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.8); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y + s * 0.8); ctx.lineTo(x - s / 2, y); ctx.fill();
    }
    ctx.restore();
  }
  function dots(path, col, s, rr) {
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = col;
    for (let i = -10; i <= 10; i++) for (let k = -10; k <= 10; k++) {
      ctx.beginPath(); ctx.arc(i * s + (k % 2 ? s / 2 : 0), k * s * 0.85, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // a cartoon glove: palm, three fingers, a thumb and a cuff
  function glove(x, y, s, rot, fill, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const p = new Path2D();
    p.moveTo(-s * 0.7, s * 0.5);
    p.lineTo(-s * 0.75, -s * 0.2);
    for (let i = 0; i < 3; i++) {
      const fx = -s * 0.5 + i * s * 0.5;
      p.quadraticCurveTo(fx - s * 0.28, -s * (1.0 + (i === 1 ? 0.15 : 0)), fx, -s * (1.05 + (i === 1 ? 0.15 : 0)));
      p.quadraticCurveTo(fx + s * 0.28, -s * (1.0 + (i === 1 ? 0.15 : 0)), fx + s * 0.25, -s * 0.25);
    }
    p.quadraticCurveTo(s * 1.25, -s * 0.5, s * 1.2, -s * 0.05);
    p.quadraticCurveTo(s * 1.0, s * 0.2, s * 0.7, s * 0.5);
    p.closePath();
    fPaint(p, fill || "#fbf8f2", lw);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, -s * 0.3); ctx.lineTo(-s * 0.25, s * 0.1);
    ctx.moveTo(s * 0.25, -s * 0.3); ctx.lineTo(s * 0.25, s * 0.1);
    ctx.stroke();
    const cuff = new Path2D();
    cuff.roundRect(-s * 0.85, s * 0.42, s * 1.7, s * 0.4, s * 0.15);
    fPaint(cuff, fill || "#fbf8f2", lw);
    ctx.restore();
  }
  // a big clown shoe pointing along dir
  function shoe(x, y, s, dir, fill, lw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const p = new Path2D();
    p.moveTo(-s * 0.7, -s * 0.5);
    p.quadraticCurveTo(-s * 0.85, 0, -s * 0.5, 0);
    p.lineTo(s * 1.0, 0);
    p.quadraticCurveTo(s * 1.7, -s * 0.05, s * 1.6, -s * 0.6);
    p.quadraticCurveTo(s * 1.3, -s * 1.05, s * 0.8, -s * 0.7);
    p.quadraticCurveTo(s * 0.3, -s * 0.5, -s * 0.1, -s * 0.75);
    p.closePath();
    fPaint(p, fill, lw);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.ellipse(s * 1.15, -s * 0.6, s * 0.28, s * 0.14, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.12); ctx.lineTo(s * 1.5, -s * 0.12); ctx.stroke();
    ctx.restore();
  }
  // one eye. o: iris, look [x,y], lid (0 open to 1 shut), slant (angry < 0 < sad), kind, white, glow
  function eye(x, y, w, h, o) {
    o = o || {};
    const kind = o.kind || "round", lk = o.look || [0, 0];
    ctx.save();
    ctx.translate(x, y);
    if (o.glow) glow(0, 0, w * 2.4, o.glow, 0.6);
    const p = new Path2D();
    p.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    if (kind === "x") {
      ctx.strokeStyle = o.iris || FINK;
      ctx.lineWidth = w * 0.45;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(w, h); ctx.moveTo(w, -h); ctx.lineTo(-w, h); ctx.stroke();
      ctx.restore();
      return;
    }
    fPaint(p, o.white || "#ffffff", Math.max(1, w * 0.18));
    ctx.save();
    ctx.clip(p);
    const px = lk[0] * w * 0.35, py = lk[1] * h * 0.35;
    if (kind === "spiral") {
      ctx.strokeStyle = o.iris || FINK;
      ctx.lineWidth = w * 0.2;
      ctx.beginPath();
      for (let k = 0; k < 30; k++) { const a = k * 0.5 + (o.t || 0) * 4, rr = (k / 30) * w * 0.95; k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(0, 0); }
      ctx.stroke();
    } else {
      ctx.fillStyle = o.iris || "#3a2a52";
      ctx.beginPath(); ctx.ellipse(px, py, w * 0.62, h * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = FINK;
      ctx.beginPath();
      if (kind === "slit") ctx.ellipse(px, py, w * 0.14, h * 0.55, 0, 0, Math.PI * 2);
      else ctx.ellipse(px, py, w * 0.32, h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(px - w * 0.22, py - h * 0.25, w * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    const lid = o.lid || 0, sl = o.slant || 0;
    if (lid > 0 || sl) {
      ctx.fillStyle = o.lidColor || "#d9c7a7";
      ctx.beginPath();
      ctx.moveTo(-w * 1.3, -h * 1.3); ctx.lineTo(w * 1.3, -h * 1.3);
      ctx.lineTo(w * 1.3, -h + lid * h * 2 + sl * h * 0.7); ctx.lineTo(-w * 1.3, -h + lid * h * 2 - sl * h * 0.7);
      ctx.fill();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = Math.max(1, w * 0.2);
      ctx.beginPath(); ctx.moveTo(-w * 1.3, -h + lid * h * 2 - sl * h * 0.7); ctx.lineTo(w * 1.3, -h + lid * h * 2 + sl * h * 0.7); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  // a mouth. o: curve (+ smile, - frown), open (0 to 1), teeth ("flat", "sharp", none), fill, tongue
  function mouth(x, y, w, o, lw) {
    o = o || {};
    const cv = (o.curve === undefined ? 1 : o.curve) * w * 0.45, op = (o.open === undefined ? 0.6 : o.open) * w * 0.5;
    const p = new Path2D();
    p.moveTo(x - w, y - cv);
    p.quadraticCurveTo(x, y + cv, x + w, y - cv);
    p.quadraticCurveTo(x, y + cv + op * 2, x - w, y - cv);
    p.closePath();
    fPaint(p, o.fill || "#4a0f24", lw);
    ctx.save();
    ctx.clip(p);
    if (o.tongue) { ctx.fillStyle = "#ff6b8f"; ctx.beginPath(); ctx.ellipse(x, y + cv * 0.4 + op * 1.3, w * 0.45, op * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
    if (o.teeth) {
      ctx.fillStyle = "#fffdf2";
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.4;
      const n = o.n || 7;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, tx = x - w + k * w * 2, ty = y - cv + (1 - Math.pow(2 * k - 1, 2)) * cv * 2 * 0.5 - cv * 0.0;
        ctx.beginPath();
        if (o.teeth === "sharp") { ctx.moveTo(tx - w / n, ty - op * 0.2); ctx.lineTo(tx, ty + op * 0.9); ctx.lineTo(tx + w / n, ty - op * 0.2); }
        else ctx.rect(tx - (w / n) * 0.85, ty - op * 0.3, (w / n) * 1.7, op * 0.85);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function brow(x, y, w, ang, lw) {
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * w, y - Math.sin(ang) * w);
    ctx.lineTo(x + Math.cos(ang) * w, y + Math.sin(ang) * w);
    ctx.stroke();
  }
  function fNose(x, y, r, lw) {
    const p = new Path2D();
    p.arc(x, y, r, 0, Math.PI * 2);
    fPaint(p, "#ff3b4a", lw * 0.6);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  function ruffle(x, y, w, n, r, c1, c2, lw) {
    for (let i = 0; i < n; i++) {
      const xx = x + (i - (n - 1) / 2) * (w / n), sc = new Path2D();
      sc.arc(xx, y - Math.abs(xx - x) * 0.12, r, 0, Math.PI);
      sc.closePath();
      fPaint(sc, i % 2 ? c1 : c2, lw * 0.7);
    }
  }
  function fCone(x, top, r, paint, lw, tilt) {
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tilt || 0);
    const p = new Path2D();
    p.moveTo(-r * 0.45, r * 0.1); p.quadraticCurveTo(-r * 0.1, -r * 0.6, r * 0.05, -r * 1.1); p.quadraticCurveTo(r * 0.3, -r * 0.5, r * 0.45, r * 0.1); p.closePath();
    ctx.fillStyle = "#efe6d2";
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = paint;
    for (let i = 0; i < 6; i++) ctx.fillRect(-r, -r * 1.1 + i * r * 0.24, r * 2, r * 0.12);
    ctx.fillStyle = "rgba(20,8,45,0.2)";
    ctx.fillRect(r * 0.1, -r * 1.2, r, r * 1.4);
    ctx.restore();
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.stroke(p);
    for (let i = 0; i < 5; i++) { const pm = new Path2D(); pm.arc(-r * 0.4 + i * r * 0.2, r * 0.1, r * 0.11, 0, Math.PI * 2); fPaint(pm, "#fbf8f2", lw * 0.5); }
    const pom = new Path2D();
    pom.arc(r * 0.05, -r * 1.12, r * 0.15, 0, Math.PI * 2);
    fPaint(pom, "#ffd23f", lw * 0.7);
    ctx.restore();
  }
  function fTopHat(x, top, r, paint, lw, tilt) {
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tilt || 0);
    const p = new Path2D();
    p.moveTo(-r * 0.4, 0); p.lineTo(-r * 0.46, -r * 0.92); p.quadraticCurveTo(0, -r * 1.02, r * 0.46, -r * 0.92); p.lineTo(r * 0.4, 0); p.closePath();
    fBody(p, "#1f1430", r * 0.6, lw, -r * 0.2, -r * 0.6, 0.35);
    ctx.fillStyle = paint;
    ctx.fillRect(-r * 0.41, -r * 0.32, r * 0.82, r * 0.18);
    const bk = new Path2D();
    bk.rect(-r * 0.09, -r * 0.34, r * 0.18, r * 0.22);
    fPaint(bk, "#ffd23f", lw * 0.5);
    const b = new Path2D();
    b.ellipse(0, 0, r * 0.7, r * 0.13, 0, 0, Math.PI * 2);
    fPaint(b, "#1f1430", lw);
    ctx.restore();
  }
  function fHorns(top, r, paint, lw, t) {
    for (const s of [-1, 1]) {
      const tx = s * r * 1.0, ty = top - r * 0.95 + Math.sin(t * 3 + s) * r * 0.08;
      const p = new Path2D();
      p.moveTo(-s * r * 0.1, top + r * 0.15);
      p.quadraticCurveTo(s * r * 0.4, top - r * 0.9, tx, ty);
      p.quadraticCurveTo(s * r * 0.5, top - r * 0.3, s * r * 0.5, top + r * 0.2);
      p.closePath();
      fPaint(p, s < 0 ? paint : "#1a1024", lw);
      diamonds(p, "rgba(255,210,63,0.75)", "rgba(0,0,0,0)", r * 0.22, s * r * 0.1, top);
      const bl = new Path2D();
      bl.arc(tx, ty, r * 0.13, 0, Math.PI * 2);
      fPaint(bl, "#ffd23f", lw * 0.7);
    }
  }
  function fPillbox(x, top, r, col, lw) {
    const p = new Path2D();
    p.roundRect(x - r * 0.42, top - r * 0.42, r * 0.84, r * 0.46, r * 0.08);
    fBody(p, col, r * 0.5, lw, x - r * 0.2, top - r * 0.4, 0.3);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(x - r * 0.42, top - r * 0.14, r * 0.84, r * 0.09);
    const bt = new Path2D();
    bt.arc(x, top - r * 0.44, r * 0.08, 0, Math.PI * 2);
    fPaint(bt, "#ffd23f", lw * 0.6);
  }
  function fHalo(top, r, paint, t) {
    glow(0, top - r * 0.35, r * 1.0, paint, 0.5);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.ellipse(0, top - r * 0.35 + Math.sin(t * 2) * r * 0.05, r * 0.55, r * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  function fCrown(x, top, r, paint, lw) {
    const p = new Path2D();
    p.moveTo(x - r * 0.6, top + r * 0.1);
    for (let k = 0; k <= 4; k++) p.lineTo(x - r * 0.6 + k * r * 0.3, top - r * (k % 2 ? 0.25 : 0.62));
    p.lineTo(x + r * 0.6, top + r * 0.1);
    p.closePath();
    fBody(p, "#e8b923", r * 0.6, lw, x - r * 0.2, top - r * 0.4, 0.3);
    for (let k = 0; k <= 4; k += 2) { const j = new Path2D(); j.arc(x - r * 0.6 + k * r * 0.3, top - r * 0.62, r * 0.07, 0, Math.PI * 2); fPaint(j, paint, lw * 0.5); }
    ctx.fillStyle = paint;
    ctx.beginPath(); ctx.arc(x, top - r * 0.08, r * 0.09, 0, Math.PI * 2); ctx.fill();
  }
  function noiseRect(x, y, w, h, n, tint) {
    for (let i = 0; i < n; i++) {
      const v = (40 + Math.random() * 150) | 0;
      ctx.fillStyle = tint ? `rgba(${v * 0.6 | 0},${Math.min(255, v + 60)},${v * 0.6 | 0},0.75)` : `rgba(${v},${v},${Math.min(255, v + 30)},0.8)`;
      ctx.fillRect(x + Math.random() * w, y + Math.random() * h, w * 0.18, Math.max(1.5, h * 0.03));
    }
  }
  function tear(x, y, s, t, ph) {
    const k = (t * 0.8 + ph) % 1;
    ctx.fillStyle = `rgba(143,233,255,${1 - k * 0.5})`;
    ctx.strokeStyle = "rgba(20,40,80,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + k * s * 5 - s * 1.2);
    ctx.quadraticCurveTo(x + s, y + k * s * 5 + s * 0.6, x, y + k * s * 5 + s);
    ctx.quadraticCurveTo(x - s, y + k * s * 5 + s * 0.6, x, y + k * s * 5 - s * 1.2);
    ctx.fill();
    ctx.stroke();
  }

  const ART = {
    mime(f, r, t, lw, ft) {
      const sway = Math.sin(t * 1.4) * r * 0.04;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.22, r * 0.55], [s * r * 0.3, r * 0.85], [s * r * 0.28, ft - r * 0.1]], r * 0.19, "#1a1024", lw * 0.5);
        shoe(s * r * 0.26 - r * 0.1, ft, r * 0.2, -1, "#1a1024", lw * 0.8);
      }
      P("torso", { pv: [0, 0.6], sw: 0.02, sp: 1.4, z: 0.7 });
      const torso = new Path2D();
      torso.moveTo(-r * 0.5, -r * 0.3);
      torso.quadraticCurveTo(-r * 0.68, r * 0.2, -r * 0.5, r * 0.66);
      torso.lineTo(r * 0.5, r * 0.66);
      torso.quadraticCurveTo(r * 0.68, r * 0.2, r * 0.5, -r * 0.3);
      torso.quadraticCurveTo(0, -r * 0.45, -r * 0.5, -r * 0.3);
      ctx.fillStyle = "#f4efe6";
      ctx.fill(torso);
      ctx.save();
      ctx.clip(torso);
      ctx.fillStyle = "#1a1024";
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(0, -r * 0.24 + i * r * 0.15, r * 0.9, r * 0.045, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(torso, r * 0.9, -r * 0.3, -r * 0.3);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      const belt = new Path2D();
      belt.rect(-r * 0.52, r * 0.52, r * 1.04, r * 0.16);
      fPaint(belt, "#1a1024", lw * 0.7);
      ctx.strokeStyle = "#d62839";
      ctx.lineWidth = r * 0.075;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, -r * 0.32); ctx.lineTo(-r * 0.22, r * 0.52);
      ctx.moveTo(r * 0.28, -r * 0.32); ctx.lineTo(r * 0.22, r * 0.52);
      ctx.stroke();
      for (const s of [-1, 1]) { const bt = new Path2D(); bt.arc(s * r * 0.22, r * 0.5, r * 0.05, 0, Math.PI * 2); fPaint(bt, "#ffd23f", lw * 0.4); }
      P("head", { pv: [0, -0.34], sw: 0.06, sp: 1.4, ph: 0.6, z: 1.2, brad: true });
      // head
      const head = new Path2D();
      head.ellipse(sway, -r * 0.74, r * 0.4, r * 0.44, 0, 0, Math.PI * 2);
      fBody(head, "#fbf8f2", r * 0.5, lw, sway - r * 0.12, -r * 0.9);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#1a1024";
        ctx.beginPath();
        ctx.moveTo(sway + s * r * 0.17, -r * 1.0); ctx.lineTo(sway + s * r * 0.23, -r * 0.8); ctx.lineTo(sway + s * r * 0.17, -r * 0.56); ctx.lineTo(sway + s * r * 0.11, -r * 0.8);
        ctx.fill();
        eye(sway + s * r * 0.17, -r * 0.8, r * 0.085, r * 0.075, { look: [-0.8, 0.3], lid: 0.25, slant: s * 0.5, lidColor: "#fbf8f2" });
        brow(sway + s * r * 0.17, -r * 0.96, r * 0.09, s * 0.5, lw * 0.6);
        ctx.fillStyle = "rgba(214,40,57,0.55)";
        ctx.beginPath(); ctx.arc(sway + s * r * 0.26, -r * 0.62, r * 0.055, 0, Math.PI * 2); ctx.fill();
      }
      tear(sway + r * 0.2, -r * 0.68, r * 0.035, t, 0);
      mouth(sway, -r * 0.5, r * 0.11, { curve: -0.8, open: 0.25, fill: "#1a1024" }, lw * 0.6);
      const beret = new Path2D();
      beret.moveTo(sway - r * 0.42, -r * 1.02);
      beret.bezierCurveTo(sway - r * 0.5, -r * 1.35, sway + r * 0.55, -r * 1.42, sway + r * 0.5, -r * 1.05);
      beret.quadraticCurveTo(sway, -r * 1.12, sway - r * 0.42, -r * 1.02);
      fBody(beret, "#1f1430", r * 0.5, lw, sway - r * 0.1, -r * 1.3, 0.3);
      ctx.fillStyle = FINK;
      ctx.fillRect(sway + r * 0.08, -r * 1.46, r * 0.05, r * 0.1);
      P("arms", { pv: [0, -0.14], sw: 0.025, sp: 2.1, ph: 2, z: 1.7 });
      // hands pressed flat against a wall that isn't there
      for (const s of [-1, 1]) {
        const hx = -r * (s > 0 ? 0.78 : 1.0) + Math.sin(t * 1.4 + s) * r * 0.05, hy = (s > 0 ? r * 0.12 : -r * 0.6) + Math.cos(t * 1.4 + s) * r * 0.06;
        limb([[s * r * 0.44, -r * 0.14], s > 0 ? [-r * 0.1, r * 0.28] : [-r * 0.82, -r * 0.2], [hx + r * 0.16, hy + r * 0.04]], r * 0.15, "#f4efe6", lw * 0.5);
        glove(hx, hy, r * 0.15, -Math.PI / 2 + 0.1 * s, "#ffffff", lw * 0.7);
        lightLayer(() => {
          ctx.strokeStyle = `rgba(143,233,255,${0.5 + 0.3 * Math.sin(t * 3 + s)})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy - r * 0.34); ctx.lineTo(hx - r * 0.2, hy + r * 0.34); ctx.stroke();
        });
      }
    },

    goblin(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.3, r * 0.7], [s * r * 0.36, ft - r * 0.1]], r * 0.15, "#7fae3a", lw * 0.5);
        shoe(s * r * 0.36 - r * 0.12, ft, r * 0.17, -1, "#d62839", lw * 0.7);
      }
      const pk = Math.sin(t * 2) * r * 0.05;
      P("head", { pv: [0, -0.1], sw: 0.05, sp: 2, z: 1.2 });
      for (const s of [-1, 1]) {
        const ear = new Path2D();
        ear.moveTo(s * r * 0.42, -r * 0.72 + pk);
        ear.quadraticCurveTo(s * r * 0.9, -r * 1.25 + pk, s * r * 1.25, -r * 1.0 + pk + Math.sin(t * 5 + s) * r * 0.06);
        ear.quadraticCurveTo(s * r * 0.85, -r * 0.7 + pk, s * r * 0.52, -r * 0.4 + pk);
        ear.closePath();
        fBody(ear, "#9fd052", r * 0.6, lw, s * r * 0.6, -r * 0.9);
        ctx.fillStyle = "rgba(255,95,168,0.5)";
        ctx.beginPath(); ctx.ellipse(s * r * 0.78, -r * 0.82 + pk, r * 0.16, r * 0.07, s * -0.5, 0, Math.PI * 2); ctx.fill();
      }
      const head = new Path2D();
      head.moveTo(-r * 0.62, -r * 0.1);
      head.bezierCurveTo(-r * 0.7, -r * 0.9 + pk, -r * 0.3, -r * 1.12 + pk, 0, -r * 1.1 + pk);
      head.bezierCurveTo(r * 0.3, -r * 1.12 + pk, r * 0.7, -r * 0.9 + pk, r * 0.62, -r * 0.1);
      head.closePath();
      fBody(head, vgrad("#b6e36a", "#7fae3a", -r * 1.1, -r * 0.1), r * 0.7, lw, -r * 0.2, -r * 0.8 + pk);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = "rgba(60,100,20,0.5)"; ctx.beginPath(); ctx.arc((hashN(i + 3) - 0.5) * r * 0.9, -r * 0.95 + pk + hashN(i + 8) * r * 0.25, r * 0.03, 0, Math.PI * 2); ctx.fill(); }
      for (const s of [-1, 1]) {
        eye(s * r * 0.25, -r * 0.66 + pk, r * 0.17, r * 0.19, { iris: "#ffd23f", kind: "slit", look: [-0.7, 0.2], lid: 0.1, slant: -s * 0.55, lidColor: "#9fd052", t });
      }
      mouth(0, -r * 0.34 + pk, r * 0.36, { curve: 0.7, open: 0.55, teeth: "sharp", n: 8 }, lw * 0.7);
      fNose(0, -r * 0.5 + pk, r * 0.09, lw);
      fCone(r * 0.1, -r * 1.02 + pk, r * 0.5, "#d62839", lw, 0.25);
      P("popcorn", { pv: [0, -0.1], sw: 0.015, sp: 3, ph: 1, z: 1.6 });
      // popcorn heaped on top, some of it popping
      for (let i = 0; i < 11; i++) {
        const pk3 = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        const px = (i - 5) * r * 0.17, pop = pk3 * pk3 * pk3 * r * (Math.abs(i - 5) >= 4 ? 0.5 : 0.04);
        for (let q = 0; q < 3; q++) {
          const pc = new Path2D();
          pc.arc(px + (q - 1) * r * 0.07, -r * 0.13 - pop + (q % 2) * r * 0.05 + (i % 2) * r * 0.07, r * 0.1, 0, Math.PI * 2);
          fPaint(pc, q === 1 ? "#fff6d8" : "#ffe9a8", lw * 0.5);
        }
      }
      P("box", { pv: [0, 0.86], sw: 0.025, sp: 1.7, ph: 1, z: 0.6 });
      const box = new Path2D();
      box.moveTo(-r * 0.95, -r * 0.1); box.lineTo(r * 0.95, -r * 0.1); box.lineTo(r * 0.7, r * 0.86); box.lineTo(-r * 0.7, r * 0.86); box.closePath();
      ctx.fillStyle = "#fbf8f2";
      ctx.fill(box);
      ctx.save();
      ctx.clip(box);
      ctx.fillStyle = "#d62839";
      for (let i = -4; i <= 4; i++) {
        if (i % 2 === 0) continue;
        ctx.beginPath();
        ctx.moveTo(i * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.155, r * 0.86); ctx.lineTo(i * r * 0.155, r * 0.86);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(180,120,40,0.25)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((hashN(i) - 0.5) * r * 1.4, r * (0.1 + hashN(i + 5) * 0.7), r * 0.09, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(box, r, -r * 0.4, -r * 0.5);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(box);
      const rim = new Path2D();
      rim.roundRect(-r * 1.0, -r * 0.16, r * 2.0, r * 0.13, r * 0.05);
      fPaint(rim, "#fbf8f2", lw * 0.8);
      const badge = new Path2D();
      badge.ellipse(0, r * 0.4, r * 0.42, r * 0.24, -0.08, 0, Math.PI * 2);
      fPaint(badge, "#ffd23f", lw * 0.7);
      ctx.fillStyle = "#d62839";
      ctx.font = `${r * 0.27}px "Bungee", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POP", 0, r * 0.42);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      P("hands", { pv: [0, -0.12], sw: 0.02, sp: 3, ph: 2, z: 1.9 });
      for (const s of [-1, 1]) glove(s * r * 0.8, -r * 0.12, r * 0.13, Math.PI + s * 0.2, "#9fd052", lw * 0.6);
    },

    balloon(f, r, t, lw, ft) {
      ctx.strokeStyle = "rgba(239,230,210,0.9)";
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);
      for (let k = 1; k <= 12; k++) ctx.lineTo(Math.sin(t * 3 + k) * r * 0.1, r * 1.2 + (k / 12) * (ft - r * 1.35));
      ctx.stroke();
      const tag = new Path2D();
      tag.roundRect(-r * 0.16, ft - r * 0.2, r * 0.32, r * 0.2, r * 0.03);
      fPaint(tag, "#efe6d2", lw * 0.6);
      P("balloon", { pv: [0, 1.12], sw: 0.07, sp: 1.3, z: 1, brad: true });
      const sq = 1 + Math.sin(t * 2.6) * 0.03 + (f.charge ? Math.sin(t * 18) * 0.03 : 0);
      ctx.save();
      ctx.scale(sq, 1 / sq);
      const b = new Path2D();
      b.moveTo(0, r * 1.12);
      b.bezierCurveTo(-r * 1.25, r * 0.6, -r * 1.2, -r * 1.12, 0, -r * 1.12);
      b.bezierCurveTo(r * 1.2, -r * 1.12, r * 1.25, r * 0.6, 0, r * 1.12);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.25);
      g.addColorStop(0, "#ffc4e0");
      g.addColorStop(0.55, f.charge ? "#ff8a3d" : "#ff5fa8");
      g.addColorStop(1, "#a0205e");
      fBody(b, g, r, lw);
      const knot = new Path2D();
      knot.moveTo(-r * 0.14, r * 1.26); knot.lineTo(r * 0.14, r * 1.26); knot.lineTo(0, r * 1.08); knot.closePath();
      fPaint(knot, "#d6408a", lw * 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.ellipse(-r * 0.48, -r * 0.55, r * 0.17, r * 0.34, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.62, -r * 0.08, r * 0.06, 0, Math.PI * 2); ctx.fill();
      // a stitched-on face
      for (const s of [-1, 1]) {
        eye(s * r * 0.34, -r * 0.12, r * 0.13, r * 0.13, { kind: "x", iris: "#ffffff" });
        brow(s * r * 0.34, -r * 0.4, r * 0.16, -s * (f.charge ? 0.6 : 0.2), lw * 0.9);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.07;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) { const px = (k - 4) * r * 0.1, py = r * 0.36 + (k % 2 ? -1 : 1) * r * (f.charge ? 0.11 : 0.06); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.restore();
      P("static", { box: [-2.0, -2.2, 2.0, 2.2], z: 2 });
      // crackling static
      const n = f.charge ? 12 : 5;
      ctx.lineJoin = "miter";
      for (let i = 0; i < n; i++) {
        const sd = Math.floor(t * 10) * 7 + i * 13, a = hashN(sd) * Math.PI * 2, rr = r * 1.18;
        ctx.strokeStyle = i % 2 ? "#fffbe0" : "#8fe9ff";
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const q = rr + k * r * 0.11, aa = a + (k % 2 ? 0.13 : -0.09);
          k ? ctx.lineTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1) : ctx.moveTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1);
        }
        ctx.stroke();
      }
      if (f.charge) glow(0, 0, r * 1.6, "#ffd23f", 0.25 + 0.15 * Math.sin(t * 14));
    },

    tearer(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.45, r * 0.7], [s * r * 0.48, ft - r * 0.12]], r * 0.24, "#1a1024", lw * 0.5);
        shoe(s * r * 0.48 - r * 0.14, ft, r * 0.22, -1, "#1a1024", lw * 0.8);
      }
      P("body", { pv: [0, 0.98], sw: 0.02, sp: 1.1, z: 0.6 });
      const body = new Path2D();
      body.moveTo(0, -r * 0.95);
      body.bezierCurveTo(r * 1.5, -r * 0.95, r * 1.6, r * 0.9, 0, r * 0.98);
      body.bezierCurveTo(-r * 1.6, r * 0.9, -r * 1.5, -r * 0.95, 0, -r * 0.95);
      fBody(body, vgrad("#c2334d", "#6a1428", -r, r), r * 1.25, lw);
      ctx.save();
      ctx.clip(body);
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(-r * 2, r * 0.72, r * 4, r * 0.08);
      ctx.restore();
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const bt = new Path2D(); bt.arc(s * r * (0.3 + i * 0.07), -r * 0.6 + i * r * 0.3, r * 0.075, 0, Math.PI * 2); fPaint(bt, "#ffd23f", lw * 0.5); }
      P("arms", { pv: [0, -0.5], sw: 0.03, sp: 2, ph: 1, z: 1.6 });
      for (const s of [-1, 1]) {
        const ep = new Path2D();
        ep.ellipse(s * r * 1.0, -r * 0.62, r * 0.36, r * 0.15, s * 0.5, 0, Math.PI * 2);
        fPaint(ep, "#ffd23f", lw * 0.8);
        ctx.strokeStyle = "#c99a0e";
        ctx.lineWidth = lw * 0.6;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(s * r * (0.82 + k * 0.1), -r * 0.52 + k * s * 0.0 + k * r * 0.02); ctx.lineTo(s * r * (0.86 + k * 0.1), -r * 0.34 + k * r * 0.03); ctx.stroke(); }
        limb([[s * r * 1.12, -r * 0.38], [s * r * 1.45, r * 0.0], [s * r * 1.38, r * 0.3 + Math.sin(t * 2 + s) * r * 0.05]], r * 0.26, "#8f2238", lw * 0.5);
        glove(s * r * 1.38, r * 0.42 + Math.sin(t * 2 + s) * r * 0.05, r * 0.16, Math.PI + s * 0.3, "#ffffff", lw * 0.7);
      }
      P("slot", { pv: [0, 0.98], sw: 0.02, sp: 1.1, z: 0.6, edge: 0 });
      // a ticket slot for a mouth, feeding out a strip
      const slot = new Path2D();
      slot.roundRect(-r * 0.5, r * 0.02, r * 1.0, r * 0.4, r * 0.1);
      fPaint(slot, "#12080f", lw);
      ctx.fillStyle = "#efe6d2";
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.4;
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.47 + k * r * 0.12, r * 0.03); ctx.lineTo(-r * 0.41 + k * r * 0.12, r * 0.16 + (k % 2) * r * 0.03); ctx.lineTo(-r * 0.35 + k * r * 0.12, r * 0.03);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.47 + k * r * 0.12, r * 0.41); ctx.lineTo(-r * 0.41 + k * r * 0.12, r * 0.3); ctx.lineTo(-r * 0.35 + k * r * 0.12, r * 0.41);
        ctx.fill(); ctx.stroke();
      }
      P("tickets", { pv: [-0.1, 0.25], sw: 0.05, sp: 2.6, z: 1.9 });
      for (let k = 0; k < 7; k++) {
        ctx.save();
        ctx.translate(-r * 0.1 - k * r * 0.27, r * 0.28 + k * r * 0.11 + Math.sin(t * 4 + k) * r * 0.05);
        ctx.rotate(-0.38 + Math.sin(t * 4 + k) * 0.15);
        const tk = new Path2D();
        tk.roundRect(-r * 0.14, -r * 0.085, r * 0.28, r * 0.17, r * 0.02);
        fPaint(tk, k % 2 ? "#efe6d2" : "#ff8a9a", lw * 0.5);
        ctx.fillStyle = "rgba(20,10,30,0.5)";
        ctx.fillRect(-r * 0.08, -r * 0.02, r * 0.16, r * 0.04);
        ctx.restore();
      }
      P("head", { pv: [0, -0.7], sw: 0.05, sp: 1.6, ph: 2, z: 1.2, brad: true });
      const head = new Path2D();
      head.ellipse(0, -r * 0.96, r * 0.38, r * 0.36, 0, 0, Math.PI * 2);
      fBody(head, "#d5ccb4", r * 0.45, lw, -r * 0.1, -r * 1.05);
      for (const s of [-1, 1]) {
        eye(s * r * 0.15, -r * 0.97, r * 0.1, r * 0.12, { white: "#0a0414", iris: "#ff3b4a", glow: "#ff3b4a", look: [-0.6, 0.2], lid: 0.2, slant: -s * 0.4, lidColor: "#d5ccb4" });
      }
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(-r * 0.13, -r * 0.74); ctx.lineTo(r * 0.13, -r * 0.74); ctx.stroke();
      const mst = new Path2D();
      mst.moveTo(0, -r * 0.82); mst.quadraticCurveTo(-r * 0.2, -r * 0.74, -r * 0.3, -r * 0.84); mst.quadraticCurveTo(-r * 0.15, -r * 0.84, 0, -r * 0.82);
      mst.quadraticCurveTo(r * 0.2, -r * 0.74, r * 0.3, -r * 0.84); mst.quadraticCurveTo(r * 0.15, -r * 0.84, 0, -r * 0.82);
      fPaint(mst, "#1a1024", lw * 0.4);
      fPillbox(0, -r * 1.24, r * 0.95, "#c2334d", lw);
    },

    strongman(f, r, t, lw, ft) {
      const lift = Math.sin(t * 1.6) * r * 0.06, sob = Math.sin(t * 6) * r * 0.015;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.35, r * 0.62], [s * r * 0.42, ft - r * 0.14]], r * 0.36, "#e8a17a", lw * 0.5);
        const boot = new Path2D();
        boot.roundRect(s * r * 0.42 - r * 0.3, ft - r * 0.3, r * 0.56, r * 0.3, r * 0.08);
        fBody(boot, "#1f1430", r * 0.3, lw * 0.8, s * r * 0.3, ft - r * 0.3, 0.3);
        ctx.strokeStyle = "#efe6d2";
        ctx.lineWidth = lw * 0.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(s * r * 0.42 - r * 0.1, ft - r * 0.25 + k * r * 0.07); ctx.lineTo(s * r * 0.42 + r * 0.1, ft - r * 0.25 + k * r * 0.07); ctx.stroke(); }
      }
      P("barbell", { pv: [0, -0.5], sw: 0.03, sp: 1.6, z: 1.6 });
      // barbell, held up and shaking
      const by0 = -r * 1.66 + lift;
      ctx.strokeStyle = FINK;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath(); ctx.moveTo(-r * 2.05, by0); ctx.quadraticCurveTo(0, by0 + r * 0.12, r * 2.05, by0); ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = r * 0.07;
      ctx.stroke();
      for (const s of [-1, 1]) {
        for (const [dx, rr] of [[1.72, 0.4], [1.95, 0.32]]) {
          const wt = new Path2D();
          wt.ellipse(s * r * dx, by0, r * 0.13, r * rr, 0, 0, Math.PI * 2);
          fBody(wt, "#2a2236", r * 0.4, lw, s * r * dx - r * 0.1, by0 - r * 0.2, 0.3);
        }
        limb([[s * r * 1.08, -r * 0.5], [s * r * 1.55, -r * 0.92], [s * r * 1.3, by0 + r * 0.1]], r * 0.4, "#e8a17a", lw * 0.5);
        ctx.strokeStyle = "rgba(120,60,40,0.5)";
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.arc(s * r * 1.42, -r * 0.8, r * 0.16, s > 0 ? 3.4 : 5.2, s > 0 ? 5.0 : 6.8); ctx.stroke();
        glove(s * r * 1.3, by0 + r * 0.02, r * 0.17, 0, "#e8a17a", lw * 0.7);
      }
      P("torso", { pv: [0, 0.78], sw: 0.018, sp: 1.6, ph: 1, z: 0.7 });
      const torso = new Path2D();
      torso.moveTo(-r * 1.3, -r * 0.55);
      torso.quadraticCurveTo(-r * 1.45, -r * 0.1, -r * 0.6, r * 0.78);
      torso.lineTo(r * 0.6, r * 0.78);
      torso.quadraticCurveTo(r * 1.45, -r * 0.1, r * 1.3, -r * 0.55);
      torso.quadraticCurveTo(0, -r * 0.98, -r * 1.3, -r * 0.55);
      ctx.fillStyle = vgrad("#f0b08c", "#d98a66", -r, r);
      ctx.fill(torso);
      ctx.save();
      ctx.clip(torso);
      // leopard singlet with one strap
      const sg = new Path2D();
      sg.moveTo(-r * 1.5, r * 0.9); sg.lineTo(-r * 0.95, -r * 0.05); sg.quadraticCurveTo(-r * 0.2, -r * 0.2, r * 0.15, -r * 0.95); sg.lineTo(r * 0.75, -r * 0.95); sg.quadraticCurveTo(r * 0.5, -r * 0.2, r * 1.0, r * 0.1); sg.lineTo(r * 1.5, r * 0.9);
      ctx.fillStyle = "#e8b923";
      ctx.fill(sg);
      ctx.save();
      ctx.clip(sg);
      for (let i = 0; i < 22; i++) {
        const px = (hashN(i * 3) - 0.5) * r * 2.2, py = r * (-0.7 + hashN(i * 7) * 1.5);
        ctx.fillStyle = "#6a3a14";
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.09, r * 0.06, i, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c98a2a";
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.045, r * 0.03, i, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // chest hair and a belly button
      ctx.strokeStyle = "rgba(90,40,20,0.6)";
      ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-r * 0.55 + i * r * 0.08, -r * 0.45 + (i % 2) * r * 0.08, r * 0.05, 0.3, 2.6); ctx.stroke(); }
      ctx.restore();
      fShade(torso, r * 1.25, -r * 0.4, -r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      const belt = new Path2D();
      belt.rect(-r * 0.66, r * 0.56, r * 1.32, r * 0.22);
      fPaint(belt, "#1f1430", lw * 0.7);
      const bk = new Path2D();
      bk.roundRect(-r * 0.17, r * 0.52, r * 0.34, r * 0.3, r * 0.05);
      fPaint(bk, "#ffd23f", lw * 0.7);
      sparkle(0, r * 0.67, r * 0.06, "#d62839");
      P("head", { pv: [0, -0.68], sw: 0.045, sp: 3, ph: 1, z: 1.2, brad: true });
      const head = new Path2D();
      head.ellipse(0, -r * 1.0 + sob, r * 0.36, r * 0.38, 0, 0, Math.PI * 2);
      fBody(head, "#f0b08c", r * 0.42, lw, -r * 0.1, -r * 1.1);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.arc(r * 0.02, -r * 1.36 + sob, r * 0.1, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
      for (const s of [-1, 1]) {
        eye(s * r * 0.15, -r * 1.05 + sob, r * 0.085, r * 0.07, { iris: "#5a3e2b", look: [-0.5, 0.4], lid: 0.2, slant: s * 0.7, lidColor: "#f0b08c" });
        brow(s * r * 0.16, -r * 1.2 + sob, r * 0.1, s * 0.6, lw * 0.9);
        tear(s * r * 0.2, -r * 0.94 + sob, r * 0.04, t, s > 0 ? 0 : 0.5);
        ctx.fillStyle = "rgba(255,95,140,0.4)";
        ctx.beginPath(); ctx.arc(s * r * 0.24, -r * 0.92 + sob, r * 0.06, 0, Math.PI * 2); ctx.fill();
      }
      mouth(0, -r * 0.76 + sob, r * 0.1, { curve: -0.9, open: 0.5 + 0.3 * Math.sin(t * 6), fill: "#4a0f24" }, lw * 0.6);
      const ms = new Path2D();
      ms.moveTo(0, -r * 0.88 + sob);
      ms.bezierCurveTo(-r * 0.15, -r * 0.78 + sob, -r * 0.34, -r * 0.8 + sob, -r * 0.36, -r * 0.98 + sob);
      ms.bezierCurveTo(-r * 0.28, -r * 0.86 + sob, -r * 0.12, -r * 0.9 + sob, 0, -r * 0.9 + sob);
      ms.bezierCurveTo(r * 0.12, -r * 0.9 + sob, r * 0.28, -r * 0.86 + sob, r * 0.36, -r * 0.98 + sob);
      ms.bezierCurveTo(r * 0.34, -r * 0.8 + sob, r * 0.15, -r * 0.78 + sob, 0, -r * 0.88 + sob);
      fPaint(ms, "#1a1024", lw * 0.4);
    },

    calliope(f, r, t, lw, ft) {
      // brass pipes rising behind, puffing in turn
      for (let i = -4; i <= 4; i++) {
        const h = r * (1.4 + (4 - Math.abs(i)) * 0.34), px = i * r * 0.3;
        const pg = ctx.createLinearGradient(px - r * 0.12, 0, px + r * 0.12, 0);
        pg.addColorStop(0, "#6a5a2a");
        pg.addColorStop(0.35, "#fff1b0");
        pg.addColorStop(0.55, "#e8c45a");
        pg.addColorStop(1, "#5a4a1a");
        const p = new Path2D();
        p.roundRect(px - r * 0.12, -h - r * 0.1, r * 0.24, h, r * 0.04);
        fPaint(p, pg, lw * 0.8);
        const lip = new Path2D();
        lip.ellipse(px, -h - r * 0.1, r * 0.15, r * 0.05, 0, 0, Math.PI * 2);
        fPaint(lip, "#3a2a10", lw * 0.6);
        ctx.fillStyle = FINK;
        ctx.beginPath(); ctx.moveTo(px - r * 0.07, -h * 0.55); ctx.lineTo(px + r * 0.07, -h * 0.55); ctx.lineTo(px, -h * 0.55 + r * 0.12); ctx.fill();
        const on = Math.floor(t * 5) % 9 === i + 4, puff = (t * 0.8 + Math.abs(i) * 0.25) % 1;
        lightLayer(() => {
          ctx.fillStyle = `rgba(232,224,255,${(on ? 0.85 : 0.5) * (1 - puff)})`;
          ctx.beginPath(); ctx.arc(px + Math.sin(puff * 5) * r * 0.1, -h - r * 0.2 - puff * r * 0.9, r * (0.1 + puff * 0.24), 0, Math.PI * 2); ctx.fill();
        });
      }
      P("body", { pv: [0, 0], sw: 0.035, sp: 1.2, z: 1 });
      const body = new Path2D();
      body.moveTo(-r * 0.98, 0);
      body.bezierCurveTo(-r * 1.0, -r * 1.25, r * 1.0, -r * 1.25, r * 0.98, 0);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; body.lineTo(r * 0.98 * (1 - kk * 0.85) + Math.sin(t * 3 + kk * 6) * r * 0.16, kk * r * 1.5); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; body.lineTo(-r * 0.98 * (1 - kk * 0.85) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.16, kk * r * 1.5); }
      body.closePath();
      ctx.globalAlpha = 0.94;
      fBody(body, vgrad("#f4efff", "#8672d6", -r, r * 1.5), r * 1.15, lw);
      ctx.globalAlpha = 1;
      // sheet-music staves running across it
      ctx.save();
      ctx.clip(body);
      ctx.strokeStyle = "rgba(91,42,134,0.3)";
      ctx.lineWidth = lw * 0.4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r, r * (0.65 + i * 0.07)); ctx.bezierCurveTo(-r * 0.3, r * (0.55 + i * 0.07), r * 0.3, r * (0.8 + i * 0.07), r, r * (0.65 + i * 0.07)); ctx.stroke(); }
      ctx.fillStyle = "rgba(91,42,134,0.45)";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-r * 0.6 + i * r * 0.3, r * (0.7 + (i % 3) * 0.07), r * 0.05, r * 0.035, -0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fHorns(-r * 0.86, r, "#5b2a86", lw, t);
      for (const s of [-1, 1]) {
        eye(s * r * 0.38, -r * 0.34, r * 0.2, r * 0.27, { white: "#160a2a", iris: "#c9b8ff", glow: "#c9b8ff", look: [-0.5, 0.2 + Math.sin(t) * 0.2], lid: 0.12, slant: -s * 0.35, lidColor: "#d9d0f8" });
      }
      // a keyboard for a mouth
      const kb = new Path2D();
      kb.moveTo(-r * 0.7, r * 0.1); kb.quadraticCurveTo(0, r * 0.22, r * 0.7, r * 0.1); kb.lineTo(r * 0.62, r * 0.5); kb.quadraticCurveTo(0, r * 0.64, -r * 0.62, r * 0.5); kb.closePath();
      fPaint(kb, "#12080f", lw);
      ctx.save();
      ctx.clip(kb);
      for (let k = 0; k < 9; k++) {
        const down = Math.floor(t * 5 + k * 3) % 9 === k, kx = -r * 0.64 + k * r * 0.143, ky = r * 0.16 + (1 - Math.pow((k - 4) / 4.5, 2)) * r * 0.06;
        ctx.fillStyle = down ? "#c9b8ff" : "#fbf8f2";
        ctx.fillRect(kx, ky + (down ? r * 0.04 : 0), r * 0.125, r * 0.34);
        if (k % 7 !== 2 && k % 7 !== 6 && k < 8) { ctx.fillStyle = "#12080f"; ctx.fillRect(kx + r * 0.09, ky, r * 0.08, r * 0.19); }
      }
      ctx.restore();
      P("arms", { pv: [0, 0.2], sw: 0.03, sp: 2.5, ph: 1, z: 1.7 });
      for (const s of [-1, 1]) {
        const wv = Math.sin(t * 2.5 + s) * r * 0.22;
        limb([[s * r * 0.88, r * 0.2], [s * r * 1.4, -r * 0.05 + wv], [s * r * 1.55, -r * 0.5 + wv]], r * 0.17, "#d9d0f8", lw * 0.5);
        glove(s * r * 1.56, -r * 0.6 + wv, r * 0.15, s * 0.3, "#f4efff", lw * 0.6);
      }
      // conductor's baton
      const wv = Math.sin(t * 2.5 - 1) * r * 0.22;
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 1.56, -r * 0.7 + wv); ctx.lineTo(-r * 1.95, -r * 1.3 + wv); ctx.stroke();
      ctx.strokeStyle = "#fbf8f2";
      ctx.lineWidth = lw * 0.5;
      ctx.stroke();
    },

    seal(f, r, t, lw, ft) {
      const bob = Math.sin(t * 2.2) * r * 0.05;
      for (const s of [-1, 1]) {
        const fl = new Path2D();
        fl.ellipse(r * 1.34, r * 0.45 + s * r * 0.17, r * 0.36, r * 0.13, s * 0.6 - 0.5 + Math.sin(t * 3) * 0.2, 0, Math.PI * 2);
        fBody(fl, "#3d4a30", r * 0.4, lw, r * 1.2, r * 0.3, 0.3);
      }
      P("body", { pv: [0.3, 0.86], sw: 0.02, sp: 2.2, z: 0.8 });
      const body = new Path2D();
      body.moveTo(-r * 0.92, -r * 0.3 + bob);
      body.quadraticCurveTo(-r * 0.98, r * 0.5, -r * 0.55, r * 0.86);
      body.lineTo(r * 0.7, r * 0.86);
      body.quadraticCurveTo(r * 1.32, r * 0.8, r * 1.22, r * 0.45);
      body.quadraticCurveTo(r * 0.5, r * 0.25, r * 0.18, -r * 0.4 + bob);
      body.quadraticCurveTo(-r * 0.02, -r * 1.2 + bob, -r * 0.6, -r * 1.12 + bob);
      body.quadraticCurveTo(-r * 1.18, -r * 0.98 + bob, -r * 0.92, -r * 0.3 + bob);
      ctx.fillStyle = vgrad("#6f8256", "#2f3a26", -r, r);
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      const cols = ["rgba(255,95,168,0.24)", "rgba(143,233,255,0.24)", "rgba(166,217,74,0.3)", "rgba(138,61,255,0.24)"];
      for (let i = 0; i < 9; i++) {
        ctx.strokeStyle = cols[i % 4];
        ctx.lineWidth = r * 0.11;
        ctx.beginPath();
        ctx.moveTo(-r * 1.5 + i * r * 0.36 + Math.sin(t + i) * r * 0.1, -r * 1.3);
        ctx.bezierCurveTo(-r * 0.8 + i * r * 0.36, -r * 0.3, -r * 1.9 + i * r * 0.36, r * 0.3, -r * 1.3 + i * r * 0.36, r);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(226,236,196,0.35)";
      ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.35, r * 0.4, r * 0.58, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(20,30,10,0.4)";
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-r * 0.2 + hashN(i) * r * 1.2, -r * 0.2 + hashN(i + 4) * r * 0.9, r * (0.03 + hashN(i + 9) * 0.04), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(body, r * 1.2, -r * 0.5, -r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(body);
      const flip = new Path2D();
      flip.ellipse(-r * 0.12, r * 0.64, r * 0.52, r * 0.17, 0.5 + Math.sin(t * 4) * 0.15, 0, Math.PI * 2);
      fBody(flip, "#3d4a30", r * 0.5, lw, -r * 0.3, r * 0.5, 0.3);
      P("face", { pv: [-0.4, -0.3], sw: 0.04, sp: 2.2, ph: 0.8, z: 1.2 });
      // a ruff, a face looking at the player
      ctx.save();
      ctx.translate(-r * 0.42, bob);
      ctx.rotate(0.35);
      ruffle(r * 0.0, -r * 0.3, r * 0.8, 5, r * 0.12, "#a6d94a", "#fbf8f2", lw);
      ctx.restore();
      eye(-r * 0.66, -r * 0.74 + bob, r * 0.11, r * 0.14, { white: "#0a0414", iris: "#a6d94a", glow: "#a6d94a", look: [-0.7, 0.1], lid: 0.2, slant: 0.3, lidColor: "#6f8256" });
      eye(-r * 0.3, -r * 0.8 + bob, r * 0.13, r * 0.16, { white: "#0a0414", iris: "#a6d94a", glow: "#a6d94a", look: [-0.7, 0.1], lid: 0.2, slant: -0.3, lidColor: "#6f8256" });
      const snout = new Path2D();
      snout.ellipse(-r * 0.72, -r * 0.5 + bob, r * 0.27, r * 0.18, 0.1, 0, Math.PI * 2);
      fBody(snout, "#8a9c70", r * 0.3, lw * 0.8, -r * 0.8, -r * 0.6 + bob, 0.25);
      fNose(-r * 0.9, -r * 0.56 + bob, r * 0.085, lw);
      ctx.strokeStyle = "rgba(239,230,210,0.85)";
      ctx.lineWidth = 1.3;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.66, -r * 0.46 + bob); ctx.lineTo(-r * 0.22, -r * 0.42 + bob + k * r * 0.1); ctx.stroke(); }
      mouth(-r * 0.72, -r * 0.4 + bob, r * 0.14, { curve: 0.6, open: 0.3, teeth: "sharp", n: 5 }, lw * 0.5);
      fCone(-r * 0.28, -r * 1.1 + bob, r * 0.5, "#a6d94a", lw, 0.25);
      P("ball", { pv: [-1.0, -0.6], sw: 0.06, sp: 2.2, ph: 1.5, z: 2 });
      // a ball balanced on its nose
      const bx = -r * 1.02, by2 = -r * 1.05 + bob - Math.abs(Math.sin(t * 2.2)) * r * 0.28;
      const ball = new Path2D();
      ball.arc(bx, by2, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = "#fbf8f2";
      ctx.fill(ball);
      ctx.save();
      ctx.clip(ball);
      ctx.translate(bx, by2);
      ctx.rotate(t * 2);
      for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillStyle = ["#d62839", "#ffd23f", "#2f8f9a"][k % 3]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.4, 0, Math.PI / 6); ctx.fill(); }
      ctx.restore();
      fShade(ball, r * 0.32, bx - r * 0.1, by2 - r * 0.12);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke(ball);
      P("drips", { pv: [0.3, 0.86], sw: 0.02, sp: 2.2, z: 0.8, edge: 0 });
      ctx.fillStyle = "rgba(166,217,74,0.92)";
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < 4; i++) {
        const len = r * (0.12 + 0.12 * Math.abs(Math.sin(t * 1.3 + i * 2)));
        ctx.beginPath();
        ctx.moveTo(-r * 0.3 + i * r * 0.3 - r * 0.07, r * 0.86);
        ctx.quadraticCurveTo(-r * 0.3 + i * r * 0.3, r * 0.86 + len * 2, -r * 0.3 + i * r * 0.3 + r * 0.07, r * 0.86);
        ctx.fill(); ctx.stroke();
      }
    },

    glass(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.25, r * 0.95], [s * r * 0.3, ft - r * 0.08]], r * 0.1, "#bdf3ff", lw * 0.4);
        shoe(s * r * 0.3 - r * 0.1, ft, r * 0.16, -1, "#2a6f86", lw * 0.7);
      }
      P("jar", { pv: [0, 1.06], sw: 0.03, sp: 1.5, z: 0.8 });
      const body = new Path2D();
      body.moveTo(-r * 0.25, -r * 1.15);
      body.lineTo(r * 0.25, -r * 1.15);
      body.bezierCurveTo(r * 0.25, -r * 0.8, r * 0.78, -r * 0.7, r * 0.76, -r * 0.2);
      body.bezierCurveTo(r * 0.84, r * 0.5, r * 0.7, r * 1.05, r * 0.5, r * 1.06);
      body.lineTo(-r * 0.5, r * 1.06);
      body.bezierCurveTo(-r * 0.7, r * 1.05, -r * 0.84, r * 0.5, -r * 0.76, -r * 0.2);
      body.bezierCurveTo(-r * 0.78, -r * 0.7, -r * 0.25, -r * 0.8, -r * 0.25, -r * 1.15);
      ctx.fillStyle = "rgba(190,243,255,0.4)";
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      // something teal sloshing inside, with bubbles
      ctx.fillStyle = "rgba(47,183,201,0.65)";
      ctx.beginPath();
      ctx.moveTo(-r, r * 1.2);
      for (let k = 0; k <= 10; k++) ctx.lineTo(-r + k * r * 0.2, r * 0.42 + Math.sin(t * 2.5 + k * 0.9) * r * 0.07);
      ctx.lineTo(r, r * 1.2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.4 + i * 0.17) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc((hashN(i) - 0.5) * r * 1.1, r * 1.0 - k * r * 0.55, r * (0.03 + hashN(i + 3) * 0.05), 0, Math.PI * 2); ctx.stroke();
      }
      // facets and shine
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.8); ctx.lineTo(-r * 0.5, r * 0.2); ctx.lineTo(-r * 0.2, r * 1.06);
      ctx.moveTo(r * 0.25, -r * 0.8); ctx.lineTo(r * 0.52, r * 0.1); ctx.lineTo(r * 0.3, r * 1.06);
      ctx.moveTo(-r * 0.5, r * 0.2); ctx.lineTo(r * 0.52, r * 0.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.35); ctx.lineTo(-r * 0.45, -r * 0.42); ctx.lineTo(-r * 0.5, r * 0.85); ctx.lineTo(-r * 0.64, r * 0.8); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.55, -r * 0.4); ctx.lineTo(r * 0.55, r * 0.3); ctx.lineTo(r * 0.42, r * 0.3); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.4;
      ctx.stroke(body);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = lw * 0.5;
      ctx.stroke(body);
      const cork = new Path2D();
      cork.roundRect(-r * 0.3, -r * 1.32, r * 0.6, r * 0.22, r * 0.05);
      fBody(cork, "#b98a4a", r * 0.3, lw * 0.8, -r * 0.1, -r * 1.3, 0.3);
      fHorns(-r * 1.24, r * 0.75, "#2a6f86", lw, t);
      // a face made of too many eyes
      const pos = [[-0.34, -0.2, 0.15], [0.34, -0.2, 0.15], [0, -0.42, 0.11], [-0.2, 0.08, 0.09], [0.24, 0.1, 0.1]];
      pos.forEach((p, i) => {
        const open = Math.sin(t * 1.7 + i * 1.9) > -0.85;
        eye(p[0] * r, p[1] * r, r * p[2], r * p[2] * (open ? 1.15 : 0.15), { iris: "#2fb7c9", look: [-0.6 + Math.sin(t + i) * 0.3, 0.2] });
      });
      mouth(0, r * 0.26, r * 0.3, { curve: 0.6, open: 0.5, teeth: "flat", n: 6, fill: "#17424e" }, lw * 0.7);
      P("arms", { pv: [0, -0.2], sw: 0.03, sp: 3.2, ph: 1, z: 1.6 });
      for (const s of [-1, 1]) {
        limb([[s * r * 0.72, -r * 0.2], [s * r * 1.12, -r * 0.6], [s * r * 0.97, -r * 1.05 + Math.sin(t * 3.2 + s) * r * 0.1]], r * 0.1, "#bdf3ff", lw * 0.4);
        glove(s * r * 0.97, -r * 1.14 + Math.sin(t * 3.2 + s) * r * 0.1, r * 0.13, 0, "#eafcff", lw * 0.6);
      }
      P("bubbles", { box: [-1.4, -3.15, 1.4, -1.45], pv: [0, -2], sw: 0.02, z: 2 });
      for (let k = 0; k < 4; k++) {
        const a = t * 3.2 + k * 1.57, px = Math.cos(a) * r * 0.97, py = -r * 1.85 - Math.abs(Math.sin(a)) * r * 0.9;
        const gb = new Path2D();
        gb.arc(px, py, r * 0.21, 0, Math.PI * 2);
        ctx.fillStyle = ["rgba(191,243,255,0.5)", "rgba(255,180,220,0.5)"][k % 2];
        ctx.fill(gb);
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw * 0.7;
        ctx.stroke(gb);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.ellipse(px - r * 0.07, py - r * 0.08, r * 0.06, r * 0.035, -0.6, 0, Math.PI * 2); ctx.fill();
      }
    },

    moth(f, r, t, lw, ft) {
      const flap = Math.sin(t * 7) * 0.22;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.scale(s, 1);
        ctx.rotate(flap * 0.6);
        const lower = new Path2D();
        lower.moveTo(r * 0.2, r * 0.1);
        lower.bezierCurveTo(r * 1.3, r * 0.2, r * 1.6, r * 1.1, r * 0.95, r * 1.35);
        lower.bezierCurveTo(r * 0.5, r * 1.25, r * 0.3, r * 0.7, r * 0.2, r * 0.1);
        fBody(lower, vgrad("#a07a52", "#5a3e2b", 0, r * 1.3), r, lw, r * 0.4, 0);
        for (let k = 0; k < 4; k++) { const sc = new Path2D(); sc.arc(r * (0.7 + k * 0.12), r * (1.3 - k * 0.02), r * 0.08, 0, Math.PI); fPaint(sc, "#e6d3ad", lw * 0.4); }
        const upper = new Path2D();
        upper.moveTo(r * 0.15, -r * 0.35);
        upper.bezierCurveTo(r * 0.9, -r * 1.75, r * 2.35, -r * 1.35, r * 2.05, -r * 0.3);
        upper.bezierCurveTo(r * 1.95, r * 0.3, r * 0.9, r * 0.5, r * 0.15, r * 0.15);
        upper.closePath();
        ctx.fillStyle = vgrad("#f0dfbb", "#9a7a52", -r * 1.5, r * 0.4);
        ctx.fill(upper);
        ctx.save();
        ctx.clip(upper);
        ctx.strokeStyle = "rgba(90,62,43,0.55)";
        ctx.lineWidth = r * 0.035;
        for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.1); ctx.quadraticCurveTo(r * 1.2, -r * 1.0 + k * r * 0.22, r * 2.4, -r * 1.5 + k * r * 0.34); ctx.stroke(); }
        ctx.fillStyle = "rgba(90,62,43,0.6)";
        ctx.beginPath(); ctx.ellipse(r * 1.95, -r * 0.6, r * 0.42, r * 1.1, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(r * (1.75 + (k % 2) * 0.12), -r * 1.15 + k * r * 0.24, r * 0.05, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        fShade(upper, r * 1.3, r * 0.8, -r * 0.9);
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw;
        ctx.stroke(upper);
        for (const [rr, col] of [[0.34, FINK], [0.28, "#ffd23f"], [0.2, "#ff8a3d"], [0.12, FINK], [0.05, "#ffffff"]]) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(r * 1.3, -r * 0.55, r * rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      P("legs", { pv: [0, 0], sw: 0.02, sp: 3, z: 0.6 });
      for (const s of [-1, 1]) {
        limb([[s * r * 0.15, r * 0.9], [s * r * 0.34, ft - r * 0.3], [s * r * 0.24, ft - r * 0.06]], r * 0.06, FINK, 0);
        limb([[s * r * 0.4, -r * 0.2], [s * r * 0.75, r * 0.1], [s * r * 0.6, r * 0.4 + Math.sin(t * 3 + s) * r * 0.05]], r * 0.07, FINK, 0);
      }
      P("abdomen", { pv: [0, 0.1], sw: 0.07, sp: 3.5, z: 1 });
      const abd = new Path2D();
      abd.moveTo(-r * 0.32, r * 0.1);
      abd.bezierCurveTo(-r * 0.45, r * 0.7, -r * 0.2, r * 1.2, 0, r * 1.22);
      abd.bezierCurveTo(r * 0.2, r * 1.2, r * 0.45, r * 0.7, r * 0.32, r * 0.1);
      abd.closePath();
      ctx.fillStyle = "#d9b77a";
      ctx.fill(abd);
      ctx.save();
      ctx.clip(abd);
      ctx.fillStyle = "#5a3e2b";
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(0, r * 0.22 + k * r * 0.19, r * 0.5, r * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      fShade(abd, r * 0.6, -r * 0.1, r * 0.3);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(abd);
      P("thorax", { pv: [0, -0.2], sw: 0.02, sp: 2, z: 0.8 });
      const thor = new Path2D();
      thor.ellipse(0, -r * 0.2, r * 0.46, r * 0.5, 0, 0, Math.PI * 2);
      fBody(thor, "#b02a6e", r * 0.5, lw, -r * 0.1, -r * 0.4);
      diamonds(thor, "rgba(255,210,63,0.8)", "rgba(0,0,0,0)", r * 0.26, 0, -r * 0.2);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(thor);
      for (let k = 0; k < 11; k++) {
        const a = Math.PI + (k / 10) * Math.PI, fz = new Path2D();
        fz.arc(Math.cos(a) * r * 0.44, -r * 0.56 + Math.sin(a) * r * 0.1, r * (0.12 + (k % 2) * 0.03), 0, Math.PI * 2);
        fPaint(fz, "#f4e8cf", lw * 0.5);
      }
      P("head", { pv: [0, -0.62], sw: 0.06, sp: 2, ph: 1, z: 1.3, brad: true });
      const head = new Path2D();
      head.ellipse(0, -r * 0.95, r * 0.38, r * 0.36, 0, 0, Math.PI * 2);
      fBody(head, "#e6d3ad", r * 0.42, lw, -r * 0.1, -r * 1.05);
      for (const s of [-1, 1]) {
        const ey = new Path2D();
        ey.ellipse(s * r * 0.18, -r * 0.98, r * 0.15, r * 0.19, s * 0.3, 0, Math.PI * 2);
        fPaint(ey, "#0a0414", lw * 0.5);
        ctx.fillStyle = "rgba(255,138,61,0.95)";
        ctx.beginPath(); ctx.arc(s * r * 0.15, -r * 1.04, r * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(s * r * 0.2 + q * r * 0.03, -r * 0.92 + q * r * 0.03, r * 0.012, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.12, -r * 1.26);
        ctx.quadraticCurveTo(s * r * 0.3, -r * 1.85, s * r * 0.8, -r * 1.8 + Math.sin(t * 2 + s) * r * 0.06);
        ctx.stroke();
        ctx.lineWidth = lw * 0.4;
        for (let k = 1; k < 8; k++) {
          const kk = k / 8, px = s * r * (0.12 + kk * 0.65), py = -r * (1.28 + Math.sin(kk * Math.PI * 0.6) * 0.56);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s * r * 0.03, py + r * 0.15); ctx.moveTo(px, py); ctx.lineTo(px - s * r * 0.02, py - r * 0.1); ctx.stroke();
        }
      }
      mouth(0, -r * 0.76, r * 0.08, { curve: 0.4, open: 0.3, fill: "#5a3e2b" }, lw * 0.5);
    },

    double(f, r, t, lw, ft) {
      // a bad copy of your own Jinx
      const m = f.mimic || { hue: 320, align: 0, stage: "child", seed: 2, stats: { juggle: { lv: 1 }, tumble: { lv: 1 }, glow: { lv: 1 }, grit: { lv: 1 } } };
      const copy = Object.assign({}, m, { hue: (m.hue + 180) % 360, mood: 90, seed: (m.seed || 0) + 3 });
      const sc = r / (30 * U);
      const wob = 1 + Math.sin(t * 2.3) * 0.12;
      // the funhouse mirror it stepped out of
      const fr = new Path2D();
      fr.moveTo(-r * 0.95, ft); fr.lineTo(-r * 0.95, -r * 0.9); fr.arc(0, -r * 0.9, r * 0.95, Math.PI, 0); fr.lineTo(r * 0.95, ft); fr.closePath();
      ctx.fillStyle = "rgba(40,90,110,0.45)";
      ctx.fill(fr);
      ctx.save();
      ctx.clip(fr);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      const sx = ((t * 0.4) % 1.6) * r * 3 - r * 2;
      ctx.beginPath(); ctx.moveTo(sx, -r * 2); ctx.lineTo(sx + r * 0.4, -r * 2); ctx.lineTo(sx - r * 0.5, ft); ctx.lineTo(sx - r * 0.9, ft); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FINK; ctx.lineWidth = lw * 2.4; ctx.stroke(fr);
      ctx.strokeStyle = "#b98ad6"; ctx.lineWidth = lw * 1.4; ctx.stroke(fr);
      P("copy", { pv: [0, ft / r], sw: 0.035, sp: 2.3, z: 1.4 });
      ctx.save();
      ctx.translate(0, ft);
      ctx.scale(wob, 1 / wob);
      D.drawJinx(copy, 0, 0, { t: t + 5, dir: -1, scale: sc, evil: true });
      ctx.restore();
      lightLayer(() => {
        if (Math.sin(t * 17) > 0.5) { ctx.fillStyle = "rgba(255,40,80,0.35)"; ctx.fillRect(-r * 1.5, Math.sin(t * 31) * r * 0.8, r * 3, r * 0.1); }
        if (Math.sin(t * 13 + 2) > 0.6) { ctx.fillStyle = "rgba(40,220,255,0.35)"; ctx.fillRect(-r * 1.5, Math.cos(t * 23) * r * 0.8, r * 3, r * 0.07); }
      });
    },

    shadow(f, r, t, lw, ft) {
      // tattered coat-tails of smoke
      const body = new Path2D();
      body.moveTo(-r * 0.9, -r * 0.5);
      body.bezierCurveTo(-r * 0.55, 0, -r * 0.6, r * 0.5, -r * 0.95, r * 1.0);
      for (let k = 0; k <= 10; k++) body.lineTo(-r * 1.0 + k * r * 0.2, r * (1.25 + (k % 2 ? 0.38 : 0)) + Math.sin(t * 4 + k) * r * 0.1);
      body.bezierCurveTo(r * 0.6, r * 0.5, r * 0.55, 0, r * 0.9, -r * 0.5);
      body.quadraticCurveTo(0, -r * 0.95, -r * 0.9, -r * 0.5);
      ctx.fillStyle = vgrad("#34225a", "rgba(20,10,36,0.15)", -r * 0.6, r * 1.7);
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      for (let i = 0; i < 8; i++) {
        const k = (t * 0.3 + i * 0.13) % 1;
        ctx.fillStyle = `rgba(90,50,140,${0.3 * (1 - k)})`;
        ctx.beginPath(); ctx.arc((hashN(i) - 0.5) * r * 1.6, r * 1.4 - k * r * 1.6, r * (0.12 + k * 0.2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,59,74,0.7)";
      ctx.lineWidth = lw * 0.8;
      ctx.stroke(body);
      // lapels, waistcoat buttons, a bow tie
      ctx.strokeStyle = "rgba(255,59,74,0.5)";
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.62); ctx.lineTo(-r * 0.05, r * 0.2); ctx.lineTo(-r * 0.3, r * 0.9);
      ctx.moveTo(r * 0.4, -r * 0.62); ctx.lineTo(r * 0.05, r * 0.2); ctx.lineTo(r * 0.3, r * 0.9);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,59,74,0.8)";
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, r * (0.3 + i * 0.22), r * 0.04, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.22, -r * 0.62); ctx.lineTo(-r * 0.22, -r * 0.38); ctx.lineTo(0, -r * 0.5); ctx.lineTo(r * 0.22, -r * 0.62); ctx.lineTo(r * 0.22, -r * 0.38); ctx.fill();
      P("whip", { pv: [-0.8, -0.4], sw: 0.04, sp: 2, z: 1.6 });
      // a whip of shadow
      ctx.lineCap = "round";
      const whip = () => {
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, -r * 0.05);
        for (let k = 1; k <= 16; k++) { const kk = k / 16; ctx.lineTo(-r * 1.05 - kk * r * 1.6, -r * 0.05 - Math.sin(kk * 5 - t * 6) * r * 0.38 * kk - kk * r * 0.6); }
        ctx.stroke();
      };
      ctx.strokeStyle = "#1a1030"; ctx.lineWidth = lw * 1.6; whip();
      ctx.strokeStyle = "rgba(255,59,74,0.7)"; ctx.lineWidth = lw * 0.4; whip();
      limb([[-r * 0.8, -r * 0.4], [-r * 1.1, -r * 0.2], [-r * 1.05, -r * 0.05]], r * 0.16, "#2b1c48", lw * 0.3);
      limb([[r * 0.8, -r * 0.4], [r * 1.05, 0], [r * 0.7, r * 0.3]], r * 0.16, "#2b1c48", lw * 0.3);
      P("head", { pv: [0, -0.6], sw: 0.05, sp: 1.3, ph: 1, z: 1.2 });
      const head = new Path2D();
      head.ellipse(0, -r * 0.98, r * 0.42, r * 0.44, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#2a1b48";
      ctx.fill(head);
      ctx.strokeStyle = "rgba(255,59,74,0.7)";
      ctx.lineWidth = lw * 0.8;
      ctx.stroke(head);
      for (const s of [-1, 1]) {
        glow(s * r * 0.17, -r * 1.02, r * 0.34, "#ff3b4a", 0.8);
        ctx.fillStyle = "#ff8a94";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.05, -r * 0.97); ctx.quadraticCurveTo(s * r * 0.2, -r * 1.15, s * r * 0.33, -r * 1.1); ctx.quadraticCurveTo(s * r * 0.28, -r * 0.94, s * r * 0.05, -r * 0.97);
        ctx.fill();
      }
      const gr = new Path2D();
      gr.moveTo(-r * 0.3, -r * 0.86); gr.quadraticCurveTo(0, -r * 0.6, r * 0.3, -r * 0.86); gr.quadraticCurveTo(0, -r * 0.74, -r * 0.3, -r * 0.86);
      ctx.fillStyle = "#ff3b4a";
      ctx.fill(gr);
      ctx.strokeStyle = "#2a1b48";
      ctx.lineWidth = lw * 0.5;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.07, -r * 0.84); ctx.lineTo(k * r * 0.07, -r * 0.7); ctx.stroke(); }
      const ms = new Path2D();
      ms.moveTo(0, -r * 0.9); ms.quadraticCurveTo(-r * 0.25, -r * 0.82, -r * 0.42, -r * 0.98); ms.quadraticCurveTo(-r * 0.2, -r * 0.93, 0, -r * 0.92);
      ms.quadraticCurveTo(r * 0.2, -r * 0.93, r * 0.42, -r * 0.98); ms.quadraticCurveTo(r * 0.25, -r * 0.82, 0, -r * 0.9);
      ctx.fillStyle = "#140a24";
      ctx.fill(ms);
      fTopHat(0, -r * 1.34, r * 0.8, "#ff3b4a", lw * 0.6, -0.15);
    },

    mirrorrm(f, r, t, lw, ft, hpK) {
      const cape = new Path2D();
      cape.moveTo(-r * 0.55, -r * 0.85);
      cape.bezierCurveTo(-r * 1.5, -r * 0.3, -r * 1.3, r * 0.6, -r * 1.1 + Math.sin(t * 2) * r * 0.1, ft - r * 0.05);
      for (let k = 0; k <= 8; k++) cape.lineTo(-r * 1.1 + k * r * 0.275 + Math.sin(t * 2 + k) * r * 0.05, ft - r * 0.05 - (k % 2) * r * 0.12);
      cape.bezierCurveTo(r * 1.3, r * 0.6, r * 1.5, -r * 0.3, r * 0.55, -r * 0.85);
      cape.closePath();
      fBody(cape, vgrad("#e0304a", "#5a0f1f", -r, r * 1.2), r * 1.5, lw);
      ctx.save();
      ctx.clip(cape);
      ctx.strokeStyle = "rgba(20,8,30,0.35)";
      ctx.lineWidth = lw * 0.7;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.2, -r * 0.8); ctx.quadraticCurveTo(k * r * 0.5, r * 0.2, k * r * 0.4 + Math.sin(t * 2 + k) * r * 0.05, ft); ctx.stroke(); }
      ctx.restore();
      const col = new Path2D();
      col.moveTo(-r * 0.7, -r * 0.8); col.quadraticCurveTo(-r * 1.0, -r * 1.25, -r * 0.5, -r * 1.2); col.lineTo(-r * 0.35, -r * 0.85); col.closePath();
      fPaint(col, "#8c1a2e", lw * 0.8);
      const col2 = new Path2D();
      col2.moveTo(r * 0.7, -r * 0.8); col2.quadraticCurveTo(r * 1.0, -r * 1.25, r * 0.5, -r * 1.2); col2.lineTo(r * 0.35, -r * 0.85); col2.closePath();
      fPaint(col2, "#8c1a2e", lw * 0.8);
      for (const s of [-1, 1]) {
        limb([[s * r * 0.2, r * 0.95], [s * r * 0.24, ft - r * 0.14]], r * 0.13, "#1a1024", lw * 0.4);
        shoe(s * r * 0.24 - r * 0.08, ft, r * 0.16, -1, "#1a1024", lw * 0.7);
      }
      P("mirror", { pv: [0, 1.0], sw: 0.02, sp: 1, z: 0.8 });
      // the body is a standing mirror
      const fr = new Path2D();
      fr.moveTo(-r * 0.62, r * 1.0);
      fr.lineTo(-r * 0.62, -r * 0.5);
      fr.arc(0, -r * 0.5, r * 0.62, Math.PI, 0);
      fr.lineTo(r * 0.62, r * 1.0);
      fr.closePath();
      ctx.fillStyle = vgrad("#eefbff", "#6f9cc0", -r * 1.1, r);
      ctx.fill(fr);
      ctx.save();
      ctx.clip(fr);
      const tones = ["rgba(255,255,255,0.4)", "rgba(40,70,110,0.3)", "rgba(143,233,255,0.32)", "rgba(20,30,60,0.28)", "rgba(255,180,220,0.2)"];
      const pts = [[-0.7, -1.2], [0.1, -1.2], [0.7, -0.6], [0.7, 0.3], [0.2, 1.1], [-0.7, 1.1], [-0.7, 0]];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        ctx.fillStyle = tones[i % 5];
        ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(p[0] * r, p[1] * r); ctx.lineTo(q[0] * r, q[1] * r); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(p[0] * r, p[1] * r); ctx.stroke();
      });
      const sx = ((t * 0.5) % 2) * r * 3 - r * 2;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.moveTo(sx, -r * 1.3); ctx.lineTo(sx + r * 0.35, -r * 1.3); ctx.lineTo(sx - r * 0.4, r * 1.3); ctx.lineTo(sx - r * 0.75, r * 1.3); ctx.fill();
      ctx.restore();
      for (const s of [-1, 1]) {
        eye(s * r * 0.26, -r * 0.5, r * 0.17, r * 0.19, { kind: "spiral", iris: "#d62839", t: t * s });
        brow(s * r * 0.26, -r * 0.78, r * 0.17, -s * 0.45, lw);
      }
      mouth(0, -r * 0.2, r * 0.36, { curve: 0.75, open: 0.55, teeth: "flat", n: 8, fill: "#5a0f1f" }, lw * 0.8);
      const ms = new Path2D();
      ms.moveTo(0, -r * 0.3);
      ms.bezierCurveTo(-r * 0.2, -r * 0.2, -r * 0.42, -r * 0.24, -r * 0.5, -r * 0.45);
      ms.bezierCurveTo(-r * 0.36, -r * 0.3, -r * 0.16, -r * 0.34, 0, -r * 0.33);
      ms.bezierCurveTo(r * 0.16, -r * 0.34, r * 0.36, -r * 0.3, r * 0.5, -r * 0.45);
      ms.bezierCurveTo(r * 0.42, -r * 0.24, r * 0.2, -r * 0.2, 0, -r * 0.3);
      fPaint(ms, "#1a1024", lw * 0.4);
      // it cracks as it gets hurt
      const cracks = Math.round((1 - hpK) * 8);
      ctx.strokeStyle = "rgba(20,10,30,0.9)";
      ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < cracks; i++) {
        let px = (hashN(i * 3.1) - 0.5) * r * 0.9, py = (hashN(i * 7.7) - 0.5) * r * 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (hashN(i * 11 + k) - 0.5) * r * 0.4; py += (hashN(i * 13 + k) - 0.3) * r * 0.35; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.strokeStyle = FINK; ctx.lineWidth = lw * 3; ctx.stroke(fr);
      ctx.strokeStyle = "#e8b923"; ctx.lineWidth = lw * 1.9; ctx.stroke(fr);
      ctx.strokeStyle = "#fff1b0"; ctx.lineWidth = lw * 0.5; ctx.stroke(fr);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI, st = new Path2D();
        st.arc(Math.cos(a) * r * 0.62, -r * 0.5 + Math.sin(a) * r * 0.62, r * 0.05, 0, Math.PI * 2);
        fPaint(st, "#d62839", lw * 0.4);
      }
      P("arms", { pv: [0, -0.3], sw: 0.025, sp: 2, ph: 1, z: 1.6 });
      for (const s of [-1, 1]) {
        const hx = s * r * 1.02, hy = r * 0.15 + Math.sin(t * 2 + s) * r * 0.05;
        limb([[s * r * 0.62, -r * 0.35], [s * r * 0.98, -r * 0.1], [hx, hy]], r * 0.15, "#b02a42", lw * 0.4);
        glove(hx, hy + r * 0.1, r * 0.13, Math.PI, "#ffffff", lw * 0.6);
      }
      ctx.strokeStyle = FINK;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(-r * 1.02, r * 0.2); ctx.lineTo(-r * 1.18, ft - r * 0.03); ctx.stroke();
      ctx.strokeStyle = "#3a2a52";
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      const kn = new Path2D();
      kn.arc(-r * 1.02, r * 0.16, r * 0.11, 0, Math.PI * 2);
      fPaint(kn, "#e8b923", lw * 0.6);
      P("hat", { pv: [0, -1.1], sw: 0.06, sp: 1.7, ph: 0.5, z: 2 });
      fTopHat(0, -r * 1.1, r * 0.85, "#d62839", lw, 0.08);
    },

    comet(f, r, t, lw, ft) {
      for (let layer = 0; layer < 3; layer++) {
        const p = new Path2D(), L2 = r * (2.7 - layer * 0.6), wd = r * (1.02 - layer * 0.22);
        p.moveTo(0, -wd);
        for (let k = 1; k <= 12; k++) {
          const kk = k / 12;
          p.lineTo(kk * L2 + Math.sin(t * 9 + k * 1.3 + layer) * r * 0.13, -wd * (1 - kk) - kk * r * 0.55 + (k % 2 ? -1 : 1) * r * 0.16 * (1 - kk));
        }
        for (let k = 12; k >= 1; k--) {
          const kk = k / 12;
          p.lineTo(kk * L2 * 0.92 + Math.sin(t * 8 + k * 1.7 + layer) * r * 0.13, wd * (1 - kk) - kk * r * 0.3 + (k % 2 ? 1 : -1) * r * 0.16 * (1 - kk));
        }
        p.lineTo(0, wd);
        p.closePath();
        fPaint(p, ["#d62839", "#ff8a3d", "#ffe680"][layer], layer ? lw * 0.5 : lw);
      }
      for (let i = 0; i < 6; i++) {
        const k = (t * 1.2 + i * 0.17) % 1;
        sparkle(r * (1 + k * 2.2), -r * 0.6 * k + (hashN(i) - 0.5) * r, r * 0.07 * (1 - k), `rgba(255,236,150,${1 - k})`);
      }
      glow(0, 0, r * 2.2, "#ff8a3d", 0.3);
      P("head", { pv: [0, 0], sw: 0.045, sp: 1.5, z: 1 });
      ruffle(0, r * 0.82, r * 1.9, 7, r * 0.2, "#ff8a3d", "#fbf8f2", lw);
      const head = new Path2D();
      head.arc(0, 0, r, 0, Math.PI * 2);
      fBody(head, vgrad("#fffaf0", "#ffe2b0", -r, r), r, lw);
      // craters, like a little moon in greasepaint
      ctx.save();
      ctx.clip(head);
      ctx.fillStyle = "rgba(200,150,90,0.25)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((hashN(i) - 0.5) * r * 1.6, (hashN(i + 7) - 0.5) * r * 1.6, r * 0.12, r * 0.09, i, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.36, -r * 0.68); ctx.lineTo(s * r * 0.36 + r * 0.16, -r * 0.2); ctx.lineTo(s * r * 0.36, r * 0.22); ctx.lineTo(s * r * 0.36 - r * 0.16, -r * 0.2);
        ctx.fill();
        eye(s * r * 0.36, -r * 0.2, r * 0.21, r * 0.23, { kind: "spiral", iris: FINK, t: t * s });
        brow(s * r * 0.36, -r * 0.56, r * 0.2, -s * 0.5, lw * 1.1);
        ctx.fillStyle = "rgba(255,95,140,0.45)";
        ctx.beginPath(); ctx.arc(s * r * 0.62, r * 0.2, r * 0.13, 0, Math.PI * 2); ctx.fill();
      }
      mouth(0, r * 0.3, r * 0.5, { curve: 0.8, open: 0.6, teeth: "flat", n: 9, tongue: true, fill: "#7a1020" }, lw * 0.8);
      fNose(0, r * 0.02, r * 0.14, lw);
      P("hat", { pv: [-0.15, -0.9], sw: 0.07, sp: 2, ph: 1, z: 1.9 });
      fCone(-r * 0.15, -r * 0.95, r * 0.72, "#ff8a3d", lw, -0.2);
      P("tufts", { pv: [0, 0], sw: 0.045, sp: 1.5, z: 1 });
      for (const s of [-1, 1]) {
        const tf = new Path2D();
        tf.moveTo(s * r * 0.8, -r * 0.55);
        for (let k = 0; k < 4; k++) tf.lineTo(s * r * (1.05 + (k % 2) * 0.22), -r * (0.6 - k * 0.2));
        tf.lineTo(s * r * 0.92, r * 0.1);
        tf.closePath();
        fPaint(tf, "#d62839", lw * 0.7);
      }
    },

    usher(f, r, t, lw, ft) {
      lightLayer(() => {
        const sw = Math.sin(t * 1.2) * r * 0.3;
        const bg3 = ctx.createLinearGradient(-r * 0.9, r * 0.1, -r * 3.2, r * 0.9);
        bg3.addColorStop(0, "rgba(143,233,255,0.5)");
        bg3.addColorStop(1, "rgba(143,233,255,0)");
        ctx.fillStyle = bg3;
        ctx.beginPath(); ctx.moveTo(-r * 1.1, r * 0.1); ctx.lineTo(-r * 3.4, r * 0.3 + sw); ctx.lineTo(-r * 3.2, r * 1.3 + sw); ctx.fill();
      });
      const body = new Path2D();
      body.moveTo(-r * 0.6, -r * 0.72);
      body.quadraticCurveTo(0, -r * 0.86, r * 0.6, -r * 0.72);
      body.bezierCurveTo(r * 0.72, -r * 0.2, r * 0.85, r * 0.5, r * 0.7, ft);
      for (let k = 0; k <= 6; k++) body.lineTo(r * 0.7 - k * r * 0.233, ft - (k % 2) * r * 0.08);
      body.bezierCurveTo(-r * 0.85, r * 0.5, -r * 0.72, -r * 0.2, -r * 0.6, -r * 0.72);
      ctx.fillStyle = "#080414";
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      glow(-r * 0.2, r * 0.1, r * 0.9, "#8a3dff", 0.4);
      glow(r * 0.3, r * 0.7, r * 0.7, "#2fb7c9", 0.35);
      glow(r * 0.1, -r * 0.4, r * 0.5, "#ff5fa8", 0.2);
      for (let i = 0; i < 34; i++) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i * 2.1));
        sparkle((hashN(i) - 0.5) * r * 1.5, -r * 0.7 + hashN(i + 30) * (ft + r * 0.7), r * 0.025 * (1 + a), `rgba(255,255,255,${a})`);
      }
      // a tiny ringed planet drifting through
      const px = ((t * 0.12) % 1.4 - 0.2) * r * 1.6 - r * 0.8, py = r * 0.45;
      ctx.fillStyle = "#c9b8ff";
      ctx.beginPath(); ctx.arc(px, py, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ff5fa8";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(px, py, r * 0.17, r * 0.04, -0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = FINK; ctx.lineWidth = lw * 1.9; ctx.stroke(body);
      ctx.strokeStyle = "#8fe9ff"; ctx.lineWidth = lw * 0.6; ctx.stroke(body);
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const bt = new Path2D(); bt.arc(s * r * 0.14, -r * 0.5 + i * r * 0.3, r * 0.055, 0, Math.PI * 2); fPaint(bt, "#ffd23f", lw * 0.4); }
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = lw * 0.4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.5 + i * r * 0.3); ctx.lineTo(r * 0.14, -r * 0.5 + i * r * 0.3); ctx.stroke(); }
      for (const s of [-1, 1]) {
        const ep = new Path2D();
        ep.ellipse(s * r * 0.58, -r * 0.72, r * 0.28, r * 0.11, s * 0.3, 0, Math.PI * 2);
        fPaint(ep, "#1a1230", lw * 0.7);
        ctx.strokeStyle = "#8fe9ff";
        ctx.lineWidth = lw * 0.5;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(s * r * (0.42 + k * 0.1), -r * 0.66); ctx.lineTo(s * r * (0.44 + k * 0.1), -r * 0.52); ctx.stroke(); }
      }
      P("torch", { pv: [-0.58, -0.42], sw: 0.04, sp: 1.2, z: 1.5 });
      limb([[-r * 0.58, -r * 0.42], [-r * 1.0, -r * 0.05], [-r * 0.92, r * 0.1]], r * 0.15, "#100826", lw * 0.4);
      const tor = new Path2D();
      tor.moveTo(-r * 0.82, r * 0.0); tor.lineTo(-r * 1.15, -r * 0.02); tor.lineTo(-r * 1.28, -r * 0.1); tor.lineTo(-r * 1.28, r * 0.28); tor.lineTo(-r * 1.15, r * 0.2); tor.lineTo(-r * 0.82, r * 0.18); tor.closePath();
      fBody(tor, "#cfc6d8", r * 0.3, lw * 0.7, -r * 1.0, 0, 0.3);
      glow(-r * 1.3, r * 0.09, r * 0.3, "#8fe9ff", 0.9);
      glove(-r * 0.92, r * 0.1, r * 0.11, Math.PI / 2, "#ffffff", lw * 0.6);
      P("arm", { pv: [0.58, -0.42], sw: 0.05, sp: 1.6, ph: 2, z: 1.5 });
      limb([[r * 0.58, -r * 0.42], [r * 0.9, 0.0], [r * 0.8, r * 0.35]], r * 0.15, "#100826", lw * 0.4);
      glove(r * 0.8, r * 0.42, r * 0.11, Math.PI, "#ffffff", lw * 0.6);
      P("head", { pv: [0, -0.7], sw: 0.05, sp: 1.1, ph: 1, z: 1.2 });
      // no face: just eyes in the dark under the cap
      const hd = new Path2D();
      hd.ellipse(0, -r * 0.98, r * 0.38, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#080414";
      ctx.fill(hd);
      ctx.strokeStyle = "#8fe9ff"; ctx.lineWidth = lw * 0.5; ctx.stroke(hd);
      const pos = [[-0.2, -0.02, 0.08], [0.2, -0.02, 0.08], [0, -0.13, 0.06], [-0.1, 0.1, 0.05], [0.11, 0.11, 0.055]];
      pos.forEach((p, i) => {
        const open = Math.sin(t * 1.7 + i * 1.9) > -0.85;
        eye(p[0] * r, -r * 0.96 + p[1] * r, r * p[2], r * p[2] * (open ? 1 : 0.15), { white: "#8fe9ff", iris: "#080414", glow: "#8fe9ff", look: [-0.6, 0.2] });
      });
      fPillbox(0, -r * 1.2, r * 0.95, "#1a1230", lw);
    },

    angel(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        for (let k = 0; k < 7; k++) {
          ctx.save();
          ctx.scale(s, 1);
          ctx.translate(r * 0.45, -r * 0.15);
          ctx.rotate(-1.05 + k * 0.31 + Math.sin(t * 5) * 0.1 * (1 - k * 0.1));
          const fe = new Path2D(), len = r * (2.0 - k * 0.2);
          fe.moveTo(0, -r * 0.12); fe.quadraticCurveTo(len * 0.6, -r * 0.2, len, 0); fe.quadraticCurveTo(len * 0.6, r * 0.2, 0, r * 0.12); fe.closePath();
          ctx.fillStyle = "#dbe2f0";
          ctx.fill(fe);
          ctx.save();
          ctx.clip(fe);
          noiseRect(0, -r * 0.2, len, r * 0.4, 18, false);
          ctx.restore();
          ctx.strokeStyle = FINK;
          ctx.lineWidth = lw * 0.8;
          ctx.stroke(fe);
          ctx.strokeStyle = "rgba(143,233,255,0.6)";
          ctx.lineWidth = lw * 0.4;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.95, 0); ctx.stroke();
          ctx.restore();
        }
      }
      P("body", { pv: [0, 0], sw: 0.035, sp: 1.4, z: 1 });
      const body = new Path2D();
      body.moveTo(-r * 0.92, 0);
      body.bezierCurveTo(-r * 0.95, -r * 1.2, r * 0.95, -r * 1.2, r * 0.92, 0);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; body.lineTo(r * 0.92 * (1 - kk) + Math.sin(t * 3 + kk * 6) * r * 0.14, kk * r * 1.5); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; body.lineTo(-r * 0.92 * (1 - kk) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.14, kk * r * 1.5); }
      body.closePath();
      fBody(body, vgrad("#ffffff", "#aebfe6", -r, r * 1.4), r, lw);
      // robe trim and scanlines
      ctx.save();
      ctx.clip(body);
      ctx.strokeStyle = "rgba(143,233,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.moveTo(-r, -r + i * r * 0.13 + ((t * 20) % (r * 0.13))); ctx.lineTo(r, -r + i * r * 0.13 + ((t * 20) % (r * 0.13))); ctx.stroke(); }
      ctx.restore();
      P("halo", { pv: [0, -0.9], sw: 0.05, sp: 2, ph: 1, z: 2 });
      fHalo(-r * 0.9, r, "#8fe9ff", t);
      P("face", { pv: [0, 0], sw: 0.035, sp: 1.4, z: 1, edge: 0 });
      for (const s of [-1, 1]) {
        eye(s * r * 0.33, -r * 0.2, r * 0.15, r * 0.15, { kind: "x", iris: "#2a6f86" });
        brow(s * r * 0.33, -r * 0.48, r * 0.16, s * 0.3, lw * 0.9);
        ctx.fillStyle = "rgba(143,233,255,0.5)";
        ctx.beginPath(); ctx.arc(s * r * 0.55, r * 0.05, r * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      const mo = new Path2D();
      mo.ellipse(0, r * 0.22, r * 0.13, r * (0.14 + 0.07 * Math.sin(t * 6)), 0, 0, Math.PI * 2);
      fPaint(mo, "#2a6f86", lw * 0.7);
      P("notes", { box: [-2.2, -1.2, 0, 0.6], z: 2 });
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        ctx.fillStyle = `rgba(143,233,255,${1 - k})`;
        ctx.font = `${r * 0.3}px "Permanent Marker", serif`;
        ctx.fillText(i % 2 ? "♪" : "♫", -r * 0.5 - k * r * 1.2, r * 0.1 - k * r * 0.8 + Math.sin(k * 8) * r * 0.1);
      }
      P("hands", { pv: [0, 0.68], sw: 0.04, sp: 2.5, ph: 2, z: 1.6 });
      for (const s of [-1, 1]) glove(s * r * 0.12, r * 0.68, r * 0.13, s * -0.5, "#ffffff", lw * 0.6);
      if (Math.sin(t * 9) > 0.8) lightLayer(() => { ctx.fillStyle = "rgba(143,233,255,0.45)"; ctx.fillRect(-r * 1.2, Math.sin(t * 40) * r, r * 2.4, r * 0.08); });
    },

    trapeze(f, r, t, lw, ft, hpK, topY) {
      const sw = Math.sin(t * 1.5) * 0.13, barY = -r * 1.25;
      ctx.save();
      ctx.translate(0, barY);
      ctx.rotate(sw);
      const bar = new Path2D();
      bar.roundRect(-r * 0.9, -r * 0.07, r * 1.8, r * 0.14, r * 0.07);
      fBody(bar, "#e8b923", r * 0.5, lw * 0.7, 0, -r * 0.2, 0.3);
      for (const s of [-1, 1]) {
        limb([[s * r * 0.22, r * 0.45], [s * r * 0.27, r * 0.0], [s * r * 0.32, -r * 0.3], [s * r * 0.22, -r * 0.6]], r * 0.18, "#fbf8f2", lw * 0.5);
        ctx.strokeStyle = "#ff5fa8";
        ctx.lineWidth = r * 0.06;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(s * r * 0.15, r * 0.36 - k * r * 0.2); ctx.lineTo(s * r * 0.38, r * 0.34 - k * r * 0.2); ctx.stroke(); }
        const sl = new Path2D();
        sl.ellipse(s * r * 0.2, -r * 0.68, r * 0.13, r * 0.2, s * 0.3, 0, Math.PI * 2);
        fPaint(sl, "#5b2a86", lw * 0.6);
      }
      P("hair", { pv: [0, -0.25], sw: 0.03, sp: 1.5, ph: 1, z: 1.4 });
      // ponytail hangs past the head
      const pt = new Path2D();
      pt.moveTo(-r * 0.24, r * 1.85);
      pt.bezierCurveTo(-r * 0.5 - sw * r * 2, r * 2.3, -r * 0.2 - sw * r * 3, r * 2.6, -sw * r * 3.5, r * 2.9);
      pt.bezierCurveTo(r * 0.2 - sw * r * 3, r * 2.6, r * 0.5 - sw * r * 2, r * 2.3, r * 0.24, r * 1.85);
      fBody(pt, "#7a3fc4", r * 0.6, lw, -r * 0.1, r * 2.1, 0.3);
      ctx.strokeStyle = "rgba(20,8,45,0.4)";
      ctx.lineWidth = lw * 0.5;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.1, r * 1.9); ctx.quadraticCurveTo(k * r * 0.15 - sw * r * 2, r * 2.4, -sw * r * 3.4, r * 2.85); ctx.stroke(); }
      for (const s of [-1, 1]) {
        const ax = s * r * 0.66 - sw * r * 2.5 - (s < 0 ? r * 0.3 : 0), ay = r * 2.25 + Math.sin(t * 2 + s) * r * 0.06;
        limb([[s * r * 0.4, r * 1.0], [s * r * 0.62, r * 1.6], [ax, ay]], r * 0.15, "#ffd6e8", lw * 0.5);
        glove(ax, ay + r * 0.1, r * 0.13, Math.PI, "#ffffff", lw * 0.6);
      }
      P("torso", { pv: [0, -1.25], sw: 0.02, sp: 1.5, z: 0.8 });
      const torso = new Path2D();
      torso.moveTo(-r * 0.36, r * 0.35);
      torso.bezierCurveTo(-r * 0.3, r * 0.7, -r * 0.6, r * 0.95, -r * 0.44, r * 1.2);
      torso.lineTo(r * 0.44, r * 1.2);
      torso.bezierCurveTo(r * 0.6, r * 0.95, r * 0.3, r * 0.7, r * 0.36, r * 0.35);
      torso.closePath();
      ctx.fillStyle = "#5b2a86";
      ctx.fill(torso);
      diamonds(torso, "#ff5fa8", "rgba(0,0,0,0)", r * 0.24, 0, r * 0.5);
      fShade(torso, r * 0.6, -r * 0.2, r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      ruffle(0, r * 1.16, r * 1.0, 5, r * 0.12, "#ffd23f", "#fbf8f2", lw);
      P("head", { pv: [0, -0.05], sw: 0.05, sp: 1.8, ph: 2, z: 1.3, brad: true });
      // head, upside down
      ctx.save();
      ctx.translate(0, r * 1.6);
      ctx.rotate(Math.PI);
      const head = new Path2D();
      head.ellipse(0, 0, r * 0.4, r * 0.42, 0, 0, Math.PI * 2);
      fBody(head, "#ffe9f1", r * 0.44, lw, r * 0.1, r * 0.15);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#5b2a86";
        ctx.beginPath(); ctx.moveTo(s * r * 0.16, -r * 0.28); ctx.lineTo(s * r * 0.22, -r * 0.06); ctx.lineTo(s * r * 0.16, r * 0.18); ctx.lineTo(s * r * 0.1, -r * 0.06); ctx.fill();
        eye(s * r * 0.16, -r * 0.06, r * 0.09, r * 0.08, { iris: "#5b2a86", look: [0.6, -0.3], lid: 0.2, slant: s * 0.6, lidColor: "#ffe9f1" });
        ctx.fillStyle = "rgba(255,95,140,0.5)";
        ctx.beginPath(); ctx.arc(s * r * 0.26, r * 0.12, r * 0.055, 0, Math.PI * 2); ctx.fill();
      }
      mouth(0, r * 0.2, r * 0.1, { curve: -0.8, open: 0.3, fill: "#d62839" }, lw * 0.5);
      fCrown(0, -r * 0.38, r * 0.5, "#ff5fa8", lw * 0.8);
      ctx.restore();
      tear(r * 0.16, r * 1.72, r * 0.035, t, 0);
      ctx.restore();
    },

    mother(f, r, t, lw, ft) {
      for (let i = 0; i < 7; i++) {
        const sx = (i - 3) * r * 0.28, pts = [[sx, r * 0.55]];
        for (let k = 1; k <= 10; k++) {
          const kk = k / 10;
          pts.push([sx + Math.sin(t * 2 + i + kk * 5) * r * 0.32 * kk + (i - 3) * r * 0.24 * kk, r * 0.55 + kk * (ft - r * 0.6)]);
        }
        limb(pts, r * 0.13, i % 2 ? "#2b2140" : "#3f3358", lw * 0.4);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = r * 0.03;
        ctx.beginPath(); pts.forEach((q, k) => (k ? ctx.lineTo(q[0] - r * 0.03, q[1]) : ctx.moveTo(q[0] - r * 0.03, q[1]))); ctx.stroke();
        const e = pts[pts.length - 1];
        const plug = new Path2D();
        plug.roundRect(e[0] - r * 0.12, e[1] - r * 0.08, r * 0.24, r * 0.18, r * 0.04);
        fPaint(plug, "#cfc6d8", lw * 0.6);
        ctx.fillStyle = "#e8b923";
        ctx.fillRect(e[0] - r * 0.07, e[1] + r * 0.1, r * 0.04, r * 0.09);
        ctx.fillRect(e[0] + r * 0.03, e[1] + r * 0.1, r * 0.04, r * 0.09);
      }
      P("tvs", { pv: [0, 0.1], sw: 0.03, sp: 1.8, z: 1.6 });
      for (const s of [-1, 1]) {
        const tx = s * r * 1.6, ty = -r * 0.3 + Math.sin(t * 1.8 + s) * r * 0.15;
        limb([[s * r * 0.9, r * 0.1], [s * r * 1.3, r * 0.3], [tx, ty + r * 0.22]], r * 0.08, "#2b2140", lw * 0.4);
        const tv2 = new Path2D();
        tv2.roundRect(tx - r * 0.32, ty - r * 0.24, r * 0.64, r * 0.48, r * 0.08);
        fBody(tv2, "#4a3a6a", r * 0.4, lw * 0.8, tx - r * 0.1, ty - r * 0.2, 0.3);
        ctx.fillStyle = "#0c1410";
        ctx.fillRect(tx - r * 0.25, ty - r * 0.17, r * 0.5, r * 0.34);
        noiseRect(tx - r * 0.25, ty - r * 0.17, r * 0.5, r * 0.34, 8, true);
        eye(tx, ty, r * 0.11, r * 0.11, { white: "#d4ff7a", iris: "#0c1410", look: [-s * 0.7, 0.3], glow: "#a6d94a" });
        ctx.strokeStyle = "#cfc6d8";
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.moveTo(tx, ty - r * 0.24); ctx.lineTo(tx - r * 0.12, ty - r * 0.42); ctx.moveTo(tx, ty - r * 0.24); ctx.lineTo(tx + r * 0.12, ty - r * 0.42); ctx.stroke();
      }
      P("antenna", { pv: [0, -0.75], sw: 0.04, sp: 2.2, ph: 1, z: 1.8 });
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75); ctx.lineTo(-r * 0.8, -r * 1.6);
      ctx.moveTo(0, -r * 0.75); ctx.lineTo(r * 0.7, -r * 1.65);
      ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      for (const [ax, ay] of [[-0.8, -1.6], [0.7, -1.65]]) { const bl = new Path2D(); bl.arc(ax * r, ay * r, r * 0.08, 0, Math.PI * 2); fPaint(bl, "#cfc6d8", lw * 0.5); if (Math.sin(t * 9 + ax) > 0.5) glow(ax * r, ay * r, r * 0.4, "#a6d94a", 0.8); }
      P("box", { pv: [0, 0.7], sw: 0.015, sp: 1, z: 0.8 });
      const box = new Path2D();
      box.roundRect(-r * 1.08, -r * 0.8, r * 2.16, r * 1.54, r * 0.22);
      fBody(box, vgrad("#54427a", "#221838", -r * 0.8, r * 0.75), r * 1.4, lw);
      // wood-grain trim
      ctx.save();
      ctx.clip(box);
      ctx.strokeStyle = "rgba(20,8,45,0.3)";
      ctx.lineWidth = lw * 0.4;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-r * 1.1, -r * 0.75 + k * r * 0.05); ctx.bezierCurveTo(-r * 0.3, -r * 0.8 + k * r * 0.05, r * 0.3, -r * 0.7 + k * r * 0.05, r * 1.1, -r * 0.76 + k * r * 0.05); ctx.stroke(); }
      ctx.restore();
      const scr = new Path2D();
      scr.moveTo(-r * 0.9, -r * 0.56);
      scr.quadraticCurveTo(-r * 0.15, -r * 0.72, r * 0.56, -r * 0.56);
      scr.quadraticCurveTo(r * 0.66, 0, r * 0.56, r * 0.53);
      scr.quadraticCurveTo(-r * 0.15, r * 0.66, -r * 0.9, r * 0.53);
      scr.quadraticCurveTo(-r * 0.98, 0, -r * 0.9, -r * 0.56);
      ctx.fillStyle = "#0c1410";
      ctx.fill(scr);
      ctx.save();
      ctx.clip(scr);
      noiseRect(-r * 0.97, -r * 0.7, r * 1.65, r * 1.35, 80, true);
      glow(-r * 0.15, 0, r * 1.1, "#a6d94a", 0.28);
      ctx.save();
      ctx.translate(-r * 0.17, 0);
      const pos = [[-0.42, -0.08, 0.13], [0.42, -0.08, 0.13], [0, -0.3, 0.1], [-0.2, 0.1, 0.08], [0.22, 0.12, 0.09]];
      pos.forEach((p, i) => {
        const open = Math.sin(t * 1.7 + i * 1.9) > -0.85;
        eye(p[0] * r, p[1] * r - r * 0.05, r * p[2], r * p[2] * (open ? 1 : 0.12), { white: "#d4ff7a", iris: "#0c1410", look: [-0.6 + Math.sin(t * 0.8 + i) * 0.3, 0.2] });
      });
      mouth(0, r * 0.28, r * 0.5, { curve: 0.7, open: 0.5, teeth: "sharp", n: 10, fill: "#0c1410" }, lw * 0.6);
      ctx.restore();
      ctx.fillStyle = "rgba(212,255,122,0.22)";
      ctx.fillRect(-r, -r * 0.7 + ((t * 0.5) % 1) * r * 1.4, r * 2, r * 0.1);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(-r, -r * 0.6 + i * r * 0.08); ctx.lineTo(r, -r * 0.6 + i * r * 0.08); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath(); ctx.ellipse(-r * 0.52, -r * 0.3, r * 0.3, r * 0.13, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.3;
      ctx.stroke(scr);
      for (let k = 0; k < 2; k++) {
        const dl = new Path2D();
        dl.arc(r * 0.84, -r * 0.4 + k * r * 0.34, r * 0.12, 0, Math.PI * 2);
        fBody(dl, "#cfc6d8", r * 0.14, lw * 0.7, r * 0.8, -r * 0.45 + k * r * 0.34, 0.3);
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath(); ctx.moveTo(r * 0.84, -r * 0.4 + k * r * 0.34); ctx.lineTo(r * 0.84 + Math.cos(t + k * 2) * r * 0.1, -r * 0.4 + k * r * 0.34 + Math.sin(t + k * 2) * r * 0.1); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(20,10,30,0.85)";
      ctx.lineWidth = lw * 0.5;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(r * 0.72, r * 0.26 + k * r * 0.07); ctx.lineTo(r * 0.96, r * 0.26 + k * r * 0.07); ctx.stroke(); }
      ctx.fillStyle = Math.sin(t * 4) > 0 ? "#ff3b4a" : "#5a0f1f";
      ctx.beginPath(); ctx.arc(r * 0.84, r * 0.14, r * 0.035, 0, Math.PI * 2); ctx.fill();
      P("crown", { pv: [0, -0.84], sw: 0.07, sp: 1.6, ph: 1, z: 2 });
      fCrown(0, -r * 0.84, r * 0.62, "#a6d94a", lw);
    }
  };

  // ---- foes are jointed paper puppets ----
  // A foe's drawing is cut into parts by P() markers. Each part is its own piece of card with a cut edge and a
  // shadow on the parts beneath, and swings a little on its own pin, so the pieces shift against each other.
  // P(name, { pv: [x, y] pin in units of r, sw: swing in radians, sp: speed, ph: phase, z: how loose it is,
  //           box: [x0, y0, x1, y1] fixed bounds in units of r, edge: 0 for a part glued flat to the one below })
  function P(name, o) { if (PS) PS.mark(o || {}); }
  const puppets = {};
  let measG = null;
  const MEAS = 220;
  // Finds the bounds of every part by drawing the foe small at many moments of its animation.
  function measurePuppet(r, hw, up, down, pad, drawAt) {
    const sc = MEAS / Math.max(hw * 2, up + down);
    if (!measG) { const cv = document.createElement("canvas"); cv.width = cv.height = MEAS; measG = cv.getContext("2d", { willReadFrequently: true }); }
    const g = measG, acc = [], keep = ctx, fixed = [];
    const flush = () => {
      const i = PS.i;
      if (i < 0) return;
      if (!acc[i]) { const cv = document.createElement("canvas"); cv.width = cv.height = MEAS; acc[i] = cv.getContext("2d", { willReadFrequently: true }); }
      acc[i].drawImage(g.canvas, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, MEAS, MEAS); g.restore();
    };
    cutDepth++;
    try {
      for (let k = 0; k < 14; k++) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
        g.filter = "none";
        g.clearRect(0, 0, MEAS, MEAS);
        g.setTransform(sc, 0, 0, sc, hw * sc, up * sc);
        g.lineJoin = "round";
        g.lineCap = "round";
        PS = { measure: true, i: -1, g, mark(op) { flush(); this.i++; if (op && op.box && !k) fixed.push(op.box.map((v) => v * r)); } };
        ctx = g;
        g.save();
        PS.mark();
        drawAt(k);
        flush();
        g.restore();
      }
    } finally { ctx = keep; PS = null; cutDepth--; }
    const boxes = acc.map((a) => {
      if (!a) return null;
      const d = a.getImageData(0, 0, MEAS, MEAS).data;
      let x0 = MEAS, y0 = MEAS, x1 = -1, y1 = -1;
      for (let y = 0; y < MEAS; y++) for (let x = 0; x < MEAS; x++) {
        if (d[(y * MEAS + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) return null;
      const m = pad + 2 / sc;
      return [Math.max(-hw, x0 / sc - hw - m), Math.max(-up, y0 / sc - up - m), Math.min(hw, (x1 + 1) / sc - hw + m), Math.min(down, (y1 + 1) / sc - up + m)];
    });
    // the sheet the parts are drawn on only has to cover them
    const u = [0, 0, 0, 0];
    for (const b of boxes.concat(fixed)) if (b) { u[0] = Math.min(u[0], b[0]); u[1] = Math.min(u[1], b[1]); u[2] = Math.max(u[2], b[2]); u[3] = Math.max(u[3], b[3]); }
    return { boxes, hw: Math.min(hw, Math.max(-u[0], u[2]) + 2), up: Math.min(up, -u[1] + 2), down: Math.min(down, u[3] + 2) };
  }
  function puppet(f, r, t, lw, ft, hpK, art, o, hw, up, down) {
    const main = ctx, e = 2.3 * U, lift = 2.6 * U, key = f.def.id + ":" + Math.round(r) + ":" + DPR;
    let info = puppets[key];
    if (!info) {
      info = puppets[key] = measurePuppet(r, hw, up, down, r * 0.1 + e, (k) =>
        art(k % 2 ? Object.assign({}, f, { charge: 1 }) : f, r, k * 0.61 + 0.2, lw, ft, k % 3 ? 1 : 0.2, -r * 4));
    }
    const boxes = info.boxes;
    hw = info.hw; up = info.up; down = info.down;
    const W = Math.ceil(hw * 2 * DPR), H = Math.ceil((up + down) * DPR), S = sheet("foe", W, H), g = S.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.filter = "none";
    g.clearRect(0, 0, W, H);
    g.setTransform(DPR, 0, 0, DPR, hw * DPR, up * DPR);
    g.lineJoin = "round";
    g.lineCap = "round";
    const col = o.edgeColor || D.paper.edge, hk = o.hurtK || 0, ga = main.globalAlpha;
    const finish = () => {
      const i = PS.i, op = PS.opts;
      if (i < 0) return;
      let b = boxes[i];
      if (op.box) b = [op.box[0] * r, op.box[1] * r, op.box[2] * r, op.box[3] * r];
      // how this part hangs on its pin right now
      const z = op.z === undefined ? 1 : op.z, pv = op.pv || [0, 0], side = i % 2 ? 1 : -1;
      const ang = (op.sw || 0) * Math.sin(t * (op.sp || 1.5) + (op.ph || 0)) + hk * 0.2 * z * side + (f.charge ? Math.sin(t * 43 + i * 2) * 0.012 * z : 0);
      const ox = Math.sin(t * 0.9 + i * 1.7) * r * 0.012 * z + hk * r * 0.07 * z * side, oy = -hk * r * 0.09 * z;
      main.save();
      main.translate(pv[0] * r + ox, pv[1] * r + oy);
      main.rotate(ang);
      main.translate(-pv[0] * r, -pv[1] * r);
      if (b) {
        const sx = Math.max(0, Math.floor((b[0] + hw) * DPR)), sy = Math.max(0, Math.floor((b[1] + up) * DPR));
        const sw = Math.min(W, Math.ceil((b[2] + hw) * DPR)) - sx, sh = Math.min(H, Math.ceil((b[3] + up) * DPR)) - sy;
        if (sw > 1 && sh > 1) {
          const lx = sx / DPR - hw, ly = sy / DPR - up, lwd = sw / DPR, lh = sh / DPR;
          const Pc = sheet("part", sw, sh);
          Pc.g.globalCompositeOperation = "copy";
          Pc.g.drawImage(S.cv, sx, sy, sw, sh, 0, 0, sw, sh);
          if (op.edge !== 0) {
            const ES = DPR >= 2 ? 0.5 : 0.75, ew = Math.ceil(sw * ES), eh = Math.ceil(sh * ES), M = sheet("edge", ew, eh), ee = e * DPR * ES;
            M.g.setTransform(1, 0, 0, 1, 0, 0);
            M.g.globalCompositeOperation = "source-over";
            M.g.clearRect(0, 0, ew, eh);
            for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; M.g.drawImage(Pc.cv, 0, 0, sw, sh, Math.cos(a) * ee, Math.sin(a) * ee, sw * ES, sh * ES); }
            const tint = (c) => { M.g.globalCompositeOperation = "source-in"; M.g.fillStyle = c; M.g.fillRect(0, 0, ew, eh); M.g.globalCompositeOperation = "source-over"; };
            if (!D.paper.neon) {
              tint("#08030f");
              main.globalAlpha = ga * 0.42;
              main.drawImage(M.cv, 0, 0, ew, eh, lx + lift, ly + lift * 1.4, lwd, lh);
              main.globalAlpha = ga;
            }
            tint(col);
            main.drawImage(M.cv, 0, 0, ew, eh, lx, ly, lwd, lh);
          }
          main.drawImage(Pc.cv, 0, 0, sw, sh, lx, ly, lwd, lh);
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(sx, sy, sw, sh); g.restore();
        }
      }
      if (op.brad) {
        // the split pin holding this part on
        main.fillStyle = "#3a2a10";
        main.beginPath(); main.arc(pv[0] * r, pv[1] * r, r * 0.06, 0, Math.PI * 2); main.fill();
        main.fillStyle = "#e8b923";
        main.beginPath(); main.arc(pv[0] * r, pv[1] * r, r * 0.042, 0, Math.PI * 2); main.fill();
        main.fillStyle = "rgba(255,255,255,0.7)";
        main.beginPath(); main.arc(pv[0] * r - r * 0.014, pv[1] * r - r * 0.014, r * 0.014, 0, Math.PI * 2); main.fill();
      }
      for (const L of PS.lights) {
        main.save();
        main.transform(L.m.a, L.m.b, L.m.c, L.m.d, L.m.e, L.m.f);
        main.globalCompositeOperation = "lighter";
        ctx = main;
        try { L.fn(); } finally { ctx = g; }
        main.restore();
      }
      PS.lights.length = 0;
      main.restore();
    };
    PS = { g, i: -1, opts: {}, lights: [], binv: new DOMMatrix([DPR, 0, 0, DPR, hw * DPR, up * DPR]).inverse(), mark(op) { finish(); this.i++; this.opts = op; } };
    ctx = g;
    cutDepth++;
    g.save();
    try {
      PS.mark({ z: 0.5 });
      art(f, r, t, lw, ft, hpK, -r * 4);
      finish();
    } finally { g.restore(); ctx = main; cutDepth--; PS = null; }
  }

  D.foeCenter = function (look, feetY, scale) {
    const r = 42 * U * look.size * (scale || 1);
    const off = { tall: 1.15, round: 1.0, balloon: 2.0, wide: 1.0, blob: 0.85, wisp: 1.6, tv: 1.25 }[look.body] || 1;
    return { r, cy: feetY - r * off };
  };

  // Behind every foe: a burst of torn paper strips, in night paper tinted for the act. Two layers, long
  // ones at the back and short dark ones in front. In Act III the tears glow instead of showing pale.
  const ACT_TONE = [
    { paper: "#2a1218", ink: "#d62839", edge: "#e6d9bd", a: "#5a1420", core: "#ece3cf" },
    { paper: "#0e2228", ink: "#2fb7c9", edge: "#bff4ff", a: "#12333c", core: "#cfe6ea" },
    { paper: "#150c26", ink: "#ff4fa3", edge: "#ff4fa3", a: "#231244", core: "#ff7ab8" }
  ];
  const bursts = {};
  let burstKeys = [];
  function buildBurst(f, r, act) {
    const T = ACT_TONE[act - 1], neon = act === 3, id = f.def.id || f.def.name;
    let h = 7;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 99991;
    const rn = rng(h + 11), rx = r * 1.6 * (f.def.boss ? 1.12 : 1), ext = rx * 1.46 + 16 * U;
    const cv = document.createElement("canvas");
    cv.width = cv.height = Math.ceil(ext * 2 * DPR);
    const g = cv.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, ext * DPR, ext * DPR);
    g.lineJoin = "round";
    const poly = (pts) => { const p = new Path2D(); pts.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py))); p.closePath(); return p; };
    // a tear: it wanders slowly and frays finely
    const fray = (pts) => {
      const out = [], ph = rn() * 6.28;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = Math.max(1, Math.round(d / (r * 0.055)));
        for (let k = 0; k < n; k++) {
          const u = k / n, s0 = (i * 7 + k) * 0.55 + ph, j = Math.sin(s0) * r * 0.022 + Math.sin(s0 * 2.7 + 1) * r * 0.012 + (rn() - 0.5) * r * 0.022;
          out.push([a[0] + (b[0] - a[0]) * u - ((b[1] - a[1]) / d) * j, a[1] + (b[1] - a[1]) * u + ((b[0] - a[0]) / d) * j]);
        }
      }
      return out;
    };
    // the pale inside of the sheet shows in patches along the tear, wider in some places than others
    const core = (pts) => {
      let area = 0;
      const n = pts.length, ph = rn() * 6.28;
      for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
      const sg = area > 0 ? 1 : -1;
      return pts.map((q, i) => {
        const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], d = Math.hypot(tx, ty) || 1;
        const k = r * (0.012 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(i * 0.23 + ph), 2) + rn() * 0.012);
        return [q[0] + (ty / d) * sg * k, q[1] - (tx / d) * sg * k];
      });
    };
    const strip = (a, len, wb, wt, bend, back) => {
      // tapered, a little bent, with a ragged tip
      const pts = [], N = 5, side = (u) => wb + (wt - wb) * Math.pow(u, 0.8);
      for (let k = 0; k <= N; k++) { const u = k / N; pts.push([r * 0.1 + (len - r * 0.1) * u, bend * u * u - side(u)]); }
      pts.push([len + r * (0.06 + rn() * 0.12), bend - wt * 0.4], [len - r * 0.04, bend + wt * 0.1], [len + r * (0.02 + rn() * 0.1), bend + wt * 0.65]);
      for (let k = N; k >= 0; k--) { const u = k / N; pts.push([r * 0.1 + (len - r * 0.1) * u, bend * u * u + side(u)]); }
      g.save();
      g.rotate(a);
      const face = fray(pts), pf = poly(face), pc = poly(core(face));
      g.save();
      g.shadowColor = neon ? T.edge : "rgba(4,2,10,0.6)";
      g.shadowBlur = (neon ? 9 : 5) * U * DPR;
      g.shadowOffsetX = neon ? 0 : 3 * U * DPR;      // the shadow falls down the screen whichever way the strip points
      g.shadowOffsetY = neon ? 0 : 5 * U * DPR;
      g.fillStyle = T.core;
      g.fill(pc);
      g.restore();
      g.save();
      g.clip(pf);
      g.fillStyle = back ? rgb(mix(T.paper, T.a, 0.8)) : T.paper;
      g.fillRect(0, -r, len + r, r * 2);
      // newsprint: faint columns of type across the strip
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let xx = r * 0.3; xx < len; xx += r * 0.085) { let yy = -wb; while (yy < wb) { const hh = r * (0.05 + rn() * 0.2); g.fillRect(xx, yy, r * 0.03, hh); yy += hh + r * 0.04; } }
      // print dots, growing toward the tip
      const st = Math.max(3.5, r * 0.105);
      g.fillStyle = rgb(T.ink, back ? 0.3 : 0.2);
      for (let xx = len * 0.45; xx < len + r * 0.2; xx += st) for (let yy = -wb - st; yy < wb + st; yy += st) {
        const k = (xx / len - 0.5) * 1.6;
        if (k > 0) { g.beginPath(); g.arc(xx, yy + (Math.round(xx / st) % 2) * st * 0.5 + bend * (xx / len) * (xx / len), Math.min(st * 0.36, st * 0.42 * k), 0, 7); g.fill(); }
      }
      // grain
      for (let k = 0; k < 70; k++) { g.fillStyle = rn() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)"; g.fillRect(rn() * len, (rn() - 0.5) * wb * 2, 1 + rn() * 2.5, 1); }
      // darker where it passes behind the foe
      const sh = g.createLinearGradient(0, 0, len, 0);
      sh.addColorStop(0, "rgba(4,2,10,0.85)");
      sh.addColorStop(back ? 0.6 : 0.5, "rgba(4,2,10,0)");
      g.fillStyle = sh;
      g.fillRect(0, -r, len + r, r * 2);
      // one lit edge, as if the stage light caught the fold
      g.strokeStyle = neon ? "rgba(255,180,220,0.35)" : "rgba(255,255,255,0.14)";
      g.lineWidth = Math.max(1, r * 0.012);
      g.beginPath();
      for (let k = 2; k <= N; k++) { const u = k / N, px = r * 0.1 + (len - r * 0.1) * u, py = bend * u * u - side(u) * 0.72; k === 2 ? g.moveTo(px, py) : g.lineTo(px, py); }
      g.stroke();
      g.restore();
      g.restore();
    };
    // strips that point down are shorter: the stage is in the way
    const reach = (a) => 1 - 0.3 * Math.max(0, Math.sin(a)) + 0.08 * Math.max(0, -Math.sin(a));
    const a0 = rn() * 0.5, nb = 7, nf = 6;
    for (let i = 0; i < nb; i++) { const a = a0 + (i / nb) * Math.PI * 2 + (rn() - 0.5) * 0.16; strip(a, rx * (1.08 + rn() * 0.2) * reach(a), r * (0.46 + rn() * 0.1), r * (0.17 + rn() * 0.07), (rn() - 0.5) * r * 0.3, true); }
    for (let i = 0; i < nf; i++) { const a = a0 + ((i + 0.5) / nf) * Math.PI * 2 + (rn() - 0.5) * 0.2; strip(a, rx * (0.72 + rn() * 0.14) * reach(a), r * (0.5 + rn() * 0.1), r * (0.2 + rn() * 0.08), (rn() - 0.5) * r * 0.22, false); }
    return { cv, size: cv.width / DPR, rot: (rn() - 0.5) * 0.26 };
  }
  function tornBurst(f, x, y, r, t) {
    const act = D.paper.act || 1, key = (f.def.id || f.def.name) + ":" + act + ":" + Math.round(r) + ":" + DPR;
    let sp = bursts[key];
    if (!sp) {
      // printed once, then pasted every frame; only the last few are kept
      sp = bursts[key] = buildBurst(f, r, act);
      burstKeys.push(key);
      while (burstKeys.length > 4) delete bursts[burstKeys.shift()];
    }
    ctx.save();
    ctx.translate(x, y - r * 0.15);
    ctx.rotate(sp.rot - Math.sin(t * 1.15 + r) * 0.035);
    ctx.drawImage(sp.cv, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
    ctx.restore();
  }
  D.drawFoe = function (f, x, feetY, t, o) {
    o = o || {};
    const L = f.def.look;
    const { r, cy } = D.foeCenter(L, feetY, o.scale);
    const floaty = ["balloon", "wisp", "tv"].includes(L.body) || f.def.id === "comet";
    const bob = Math.sin(t * (floaty ? 1.6 : 2.4)) * r * (floaty ? 0.08 : 0.025);
    const y = cy + bob - (f.def.id === "comet" ? r * 0.35 : 0);
    const sh = ctx.createRadialGradient(x, feetY, 0, x, feetY, r * 1.3);
    sh.addColorStop(0, "rgba(5,2,12,0.6)");
    sh.addColorStop(1, "rgba(5,2,12,0)");
    ctx.save();
    ctx.translate(x, feetY);
    ctx.scale(floaty ? 0.8 : 1.1, 0.24);
    ctx.translate(-x, -feetY);
    ctx.fillStyle = sh;
    ctx.fillRect(x - r * 1.4, feetY - r * 1.4, r * 2.8, r * 2.8);
    ctx.restore();
    if (D.paper.on && !o.flat) tornBurst(f, x, cy - (f.def.id === "comet" ? r * 0.35 : 0), r, t);
    ctx.save();
    if (o.tint && (f.def.boss || f.def.elite)) {
      // a slow sunburst behind the big names
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.15);
      ctx.globalCompositeOperation = "lighter";
      const n = f.def.boss ? 14 : 10, rr = r * (f.def.boss ? 3.0 : 2.3);
      for (let i = 0; i < n; i++) {
        ctx.rotate((Math.PI * 2) / n);
        const g = ctx.createLinearGradient(0, 0, rr, 0);
        g.addColorStop(0, rgb(o.tint, f.def.boss ? 0.22 : 0.14));
        g.addColorStop(1, rgb(o.tint, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rr, -rr * 0.1); ctx.lineTo(rr, rr * 0.1); ctx.fill();
      }
      ctx.restore();
    }
    if (f.charge) glow(x, y, r * 2.5, "#ffd23f", 0.25 + 0.2 * Math.sin(t * 12));
    if (f.def.id === "trapeze") {
      // the ropes run up out of sight
      const sw = Math.sin(t * 1.5) * 0.13;
      ctx.strokeStyle = "#d9cdb4";
      ctx.lineWidth = Math.max(1.5, r * 0.04);
      ctx.beginPath();
      for (const sx of [-0.7, 0.7]) { ctx.moveTo(x + sx * r, y - r * 1.25); ctx.lineTo(x + sx * r - sw * r * 4, y - r * 1.25 - (y + 40)); }
      ctx.stroke();
    }
    ctx.restore();
    const hw = r * 3.7, up = r * 4.1, down = Math.max(feetY - y + r * 0.5, r * 3.0);
    const paper = D.paper.on && !cutDepth && !o.flat;
    if (paper && D.paper.neon) glow(x, y, r * 2.4, o.edgeColor || D.paper.edge, 0.3);
    ctx.save();
    if (o.hurt) ctx.filter = "brightness(2.2) saturate(0.3)";
    // paper on a stick: a slow sway from the base
    ctx.translate(x, feetY);
    ctx.rotate(Math.sin(t * 1.15 + r) * 0.02);
    ctx.translate(-x, -feetY);
    ctx.translate(x + (f.charge ? Math.sin(t * 46) * r * 0.018 : 0), y);
    const hk = o.hurtK || 0;
    if (hk) { ctx.translate(0, feetY - y); ctx.rotate(0.13 * hk); ctx.scale(1 + 0.1 * hk, 1 - 0.1 * hk); ctx.translate(0, y - feetY); }
    const br = 1 + Math.sin(t * 2.2) * 0.012;
    ctx.scale(1 / br, br);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const lw = Math.max(1.6, r * 0.055);
    const hpK = f.maxHp ? Math.max(0, f.hp) / f.maxHp : 1;
    const art = ART[f.def.id] || ART.mime;
    if (paper) puppet(f, r, t, lw, feetY - y, hpK, art, o, hw, up, down);
    else art(f, r, t, lw, feetY - y, hpK, -r * 4);
    ctx.restore();
    return { x, y, r };
  };

  // ---------- particles and floating numbers ----------
  const CONFETTI = ["#ff4fa3", "#ffd23f", "#8fe9ff", "#a6d94a", "#c9b8ff", "#efe6d2"];
  D.burst = function (x, y, kind, n, color) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2, sp = (40 + Math.random() * (kind === "confetti" ? 260 : 120)) * U;
      const c = color === "multi" ? CONFETTI[(Math.random() * CONFETTI.length) | 0] : color || "#ffd23f";
      D.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === "confetti" ? 200 : 80) * U, life: 1, kind: kind || "star", color: c, s: (3 + Math.random() * 4) * U, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 12 });
    }
  };
  D.float = function (x, y, text, color, big) {
    D.floats.push({ x, y, text, color, life: 1, big: !!big });
  };
  function particlesStep(dt) {
    for (let i = D.particles.length - 1; i >= 0; i--) {
      const p = D.particles[i];
      const conf = p.kind === "confetti";
      p.life -= dt * (conf ? 0.38 : 0.9);
      if (p.life <= 0) { D.particles.splice(i, 1); continue; }
      p.vy += 160 * U * dt * (p.kind === "note" || p.kind === "heart" ? -0.6 : conf ? 0.9 : 1);
      if (conf) { p.vy = Math.min(p.vy, 70 * U); p.vx += Math.sin(p.rot * 2) * 30 * U * dt; p.rot += p.spin * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= conf ? 0.985 : 0.97;
      const a = Math.min(1, p.life * 1.5);
      if (conf) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillStyle = rgb(p.color, a);
        ctx.fillRect(-p.s * 0.8, -p.s * 0.4, p.s * 1.6, p.s * 0.8);
        ctx.restore();
      } else if (p.kind === "heart") heart(p.x, p.y, p.s, rgb(p.color, a));
      else if (p.kind === "drop") {
        ctx.fillStyle = rgb(p.color, a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "note") {
        ctx.fillStyle = rgb(p.color, a);
        ctx.font = `${p.s * 4}px "Permanent Marker", serif`;
        ctx.fillText("♪", p.x, p.y);
      } else sparkle(p.x, p.y, p.s * 0.6, rgb(p.color, a));
    }
    for (let i = D.floats.length - 1; i >= 0; i--) {
      const f = D.floats[i];
      f.life -= dt * 0.8;
      if (f.life <= 0) { D.floats.splice(i, 1); continue; }
      f.y -= 40 * U * dt;
      const size = (f.big ? 38 : 26) * U * (1 + (1 - f.life) * 0.1);
      ctx.font = `${size}px "Bungee", "Permanent Marker", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(10,4,20,${f.life})`;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = rgb(f.color, Math.min(1, f.life * 2));
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.textAlign = "left";
  }

  // ---------- scenes ----------
  // where a Jinx's eyes go: toward the pointer, more strongly when it's far away
  function lookAt(p, x, y) {
    if (!p) return undefined;
    const dx = p[0] - x, dy = p[1] - (y - 30 * U), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / (140 * U));
    return [(dx / d) * k, (dy / d) * k];
  }
  D.fromScreen = function (x, y) {
    const I = D.island();
    let u = (x - I.cx) / (I.rx * 0.86), v = (y - I.cy) / (I.ry * 0.78);
    const d = Math.hypot(u, v);
    if (d > 0.92) { u *= 0.92 / d; v *= 0.92 / d; }
    return [u, v];
  };
  const GINK = "#1b1029";
  function gPaint(p, fill, lw) { ctx.fillStyle = fill; ctx.fill(p); ctx.strokeStyle = GINK; ctx.lineWidth = lw || 2; ctx.stroke(p); }
  function gShadow(x, y, rx) {
    const sh = ctx.createRadialGradient(x, y, 0, x, y, rx);
    sh.addColorStop(0, "rgba(5,2,12,0.5)");
    sh.addColorStop(1, "rgba(5,2,12,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.28);
    ctx.translate(-x, -y);
    ctx.fillStyle = sh;
    ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }
  // a candy-floss tree that grows snacks
  const SLOTS = [[-0.52, -1.02], [0.1, -0.86], [0.56, -1.08], [-0.14, -1.34]];
  function snackTree(x, y, t, tree) {
    const s = 74 * U, lw = Math.max(1.6, 2.2 * U);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 38) * 0.05 * Math.min(1, (tree.shake || 0) * 2) + Math.sin(t * 0.9) * 0.012);
    ctx.lineJoin = "round";
    const trunk = new Path2D();
    trunk.moveTo(-s * 0.2, 0);
    trunk.bezierCurveTo(-s * 0.05, -s * 0.4, -s * 0.22, -s * 0.7, -s * 0.06, -s * 1.1);
    trunk.lineTo(s * 0.12, -s * 1.1);
    trunk.bezierCurveTo(s * 0.02, -s * 0.7, s * 0.2, -s * 0.4, s * 0.22, 0);
    trunk.closePath();
    gPaint(trunk, "#4a2a52", lw);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = lw * 0.6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * (0.15 + i * 0.24)); ctx.quadraticCurveTo(s * 0.02, -s * (0.25 + i * 0.24), s * 0.12, -s * (0.2 + i * 0.24)); ctx.stroke(); }
    ctx.strokeStyle = GINK;
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.75); ctx.quadraticCurveTo(-s * 0.4, -s * 0.9, -s * 0.52, -s * 1.15); ctx.moveTo(s * 0.06, -s * 0.8); ctx.quadraticCurveTo(s * 0.4, -s * 0.85, s * 0.55, -s * 1.2); ctx.stroke();
    const puffs = [[-0.6, -1.45, 0.5, "#ff9ad0"], [0.62, -1.5, 0.52, "#9fe0ff"], [0, -1.75, 0.62, "#ffb3e6"], [-0.3, -1.25, 0.42, "#c9b8ff"], [0.32, -1.28, 0.44, "#ff9ad0"]];
    for (const [px, py, pr, col] of puffs) {
      const p = new Path2D();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2, rr = s * pr * (1 + 0.1 * Math.sin(a * 5 + px * 9));
        const qx = px * s + Math.cos(a) * rr, qy = py * s + Math.sin(a) * rr * 0.85;
        k ? p.lineTo(qx, qy) : p.moveTo(qx, qy);
      }
      p.closePath();
      const g = ctx.createRadialGradient(px * s - s * 0.12, py * s - s * 0.15, s * 0.05, px * s, py * s, s * pr);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, col);
      g.addColorStop(1, rgb(mix(col, "#2a1050", 0.35)));
      gPaint(p, g, lw);
    }
    // what's growing
    for (const f of tree.fruits || []) {
      const sl = SLOTS[f.slot % SLOTS.length], it = JG.ITEMS[f.item], fx = sl[0] * s, fy = sl[1] * s, fr = (4 + f.grow * 7) * U;
      ctx.strokeStyle = GINK;
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(fx, fy - s * 0.12); ctx.lineTo(fx, fy - fr); ctx.stroke();
      const fp = new Path2D();
      fp.arc(fx, fy + Math.sin(t * 2 + f.slot) * U, fr, 0, Math.PI * 2);
      gPaint(fp, it.color, lw * 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(fx - fr * 0.3, fy - fr * 0.3, fr * 0.25, 0, Math.PI * 2); ctx.fill();
      if (f.grow >= 1) sparkle(fx + fr, fy - fr, (2 + Math.sin(t * 5 + f.slot)) * U, "#ffffff");
    }
    ctx.restore();
  }
  function groundItem(id, x, y, t, lifted) {
    const it = JG.ITEMS[id], r = 10 * U, by = y - r - (lifted ? 26 * U : Math.abs(Math.sin(t * 2 + x)) * 2 * U);
    gShadow(x, y, r * 1.6);
    const p = new Path2D();
    p.arc(x, by, r, 0, Math.PI * 2);
    gPaint(p, it.color, Math.max(1.5, 2 * U));
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(x - r * 0.3, by - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GINK;
    ctx.font = `${r * 1.1}px "Bungee", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(it.glyph, x, by + r * 0.08);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    return { x, y: by, r: r * 1.5 };
  }
  function toyDraw(id, x, y, t, use) {
    const s = 34 * U, lw = Math.max(1.5, 2 * U);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";
    if (id === "pins") {
      const crate = new Path2D();
      crate.roundRect(-s * 0.9, -s * 0.45, s * 1.8, s * 0.45, s * 0.06);
      gPaint(crate, "#8a5a3a", lw);
      ctx.strokeStyle = "rgba(27,16,41,0.5)";
      ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.22); ctx.lineTo(s * 0.9, -s * 0.22); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate((i - 1) * s * 0.55, -s * 0.45 - (use ? Math.abs(Math.sin(t * 6 + i * 2)) * s * 1.2 : 0));
        ctx.rotate(use ? t * 8 + i : (i - 1) * 0.12);
        const pin = new Path2D();
        pin.moveTo(-s * 0.16, 0); pin.bezierCurveTo(-s * 0.26, -s * 0.5, -s * 0.07, -s * 0.7, -s * 0.09, -s * 0.95);
        pin.bezierCurveTo(-s * 0.16, -s * 1.2, s * 0.16, -s * 1.2, s * 0.09, -s * 0.95);
        pin.bezierCurveTo(s * 0.07, -s * 0.7, s * 0.26, -s * 0.5, s * 0.16, 0);
        pin.closePath();
        gPaint(pin, "#fbf8f2", lw * 0.8);
        ctx.fillStyle = ["#d62839", "#ffd23f", "#2f8f9a"][i];
        ctx.fillRect(-s * 0.2, -s * 0.5, s * 0.4, s * 0.12);
        ctx.fillRect(-s * 0.1, -s * 0.98, s * 0.2, s * 0.08);
        ctx.restore();
      }
    } else if (id === "tramp") {
      ctx.strokeStyle = GINK;
      ctx.lineWidth = lw * 1.4;
      for (const sx of [-1, -0.35, 0.35, 1]) { ctx.beginPath(); ctx.moveTo(sx * s, -s * 0.42 + Math.abs(sx) * s * 0.08); ctx.lineTo(sx * s * 1.05, 0); ctx.stroke(); }
      const dip = use ? Math.max(0, Math.sin(t * 9)) * s * 0.12 : 0;
      const mat = new Path2D();
      mat.ellipse(0, -s * 0.45, s * 1.15, s * 0.36, 0, 0, Math.PI * 2);
      gPaint(mat, "#ff4fa3", lw);
      const inner = new Path2D();
      inner.ellipse(0, -s * 0.45 + dip, s * 0.88, s * 0.25, 0, 0, Math.PI * 2);
      gPaint(inner, "#1b1726", lw * 0.7);
      ctx.strokeStyle = "rgba(255,210,63,0.9)";
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 4 - Math.PI / 2; const px = Math.cos(a) * s * 0.4, py = -s * 0.45 + dip + Math.sin(a) * s * 0.12; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
      ctx.stroke();
    } else if (id === "crystal") {
      const cloth = new Path2D();
      cloth.moveTo(-s * 0.75, -s * 0.75); cloth.lineTo(s * 0.75, -s * 0.75); cloth.lineTo(s * 0.95, 0);
      for (let k = 0; k <= 6; k++) cloth.lineTo(s * 0.95 - (k / 6) * s * 1.9, (k % 2 ? -s * 0.1 : 0));
      cloth.closePath();
      gPaint(cloth, "#5b2a86", lw);
      for (let k = 0; k < 5; k++) sparkle(-s * 0.55 + k * s * 0.28, -s * 0.38 + (k % 2) * s * 0.14, 1.6 * U, "#ffd23f");
      const base = new Path2D();
      base.roundRect(-s * 0.32, -s * 0.92, s * 0.64, s * 0.2, s * 0.06);
      gPaint(base, "#e8b923", lw * 0.8);
      glow(0, -s * 1.3, s * (use ? 1.6 : 1.1), "#8fe9ff", use ? 0.7 : 0.4);
      const orb = new Path2D();
      orb.arc(0, -s * 1.3, s * 0.46, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-s * 0.15, -s * 1.45, s * 0.05, 0, -s * 1.3, s * 0.46);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#8fe9ff");
      g.addColorStop(1, "#5b2a86");
      gPaint(orb, g, lw);
      ctx.save();
      ctx.clip(orb);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(Math.sin(t * 1.3 + k * 2) * s * 0.2, -s * 1.3 + Math.cos(t + k) * s * 0.15, s * (0.12 + k * 0.08), t + k, t + k + 3.5); ctx.stroke(); }
      ctx.restore();
    } else if (id === "bag") {
      ctx.strokeStyle = GINK;
      ctx.lineWidth = lw * 2.2;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s * 0.7, 0); ctx.lineTo(s * 0.7, -s * 2.3); ctx.lineTo(-s * 0.15, -s * 2.3); ctx.moveTo(s * 0.3, 0); ctx.lineTo(s * 1.1, 0); ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
      ctx.save();
      ctx.translate(-s * 0.15, -s * 2.3);
      ctx.rotate(use ? Math.sin(t * 7) * 0.4 : Math.sin(t * 1.2) * 0.04);
      ctx.strokeStyle = GINK;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 0.35); ctx.stroke();
      const bag = new Path2D();
      bag.roundRect(-s * 0.38, s * 0.35, s * 0.76, s * 1.35, s * 0.3);
      gPaint(bag, "#d62839", lw);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-s * 0.26, s * 0.5, s * 0.14, s * 0.9);
      const patch = new Path2D();
      patch.rect(-s * 0.05, s * 0.9, s * 0.3, s * 0.28);
      gPaint(patch, "#ffd23f", lw * 0.6);
      ctx.fillStyle = GINK;
      ctx.beginPath(); ctx.arc(s * 0.03, s * 1.0, s * 0.03, 0, Math.PI * 2); ctx.arc(s * 0.17, s * 1.0, s * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.1, s * 1.14, s * 0.06, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return { x, y: y - s * 0.8, r: s * 1.2 };
  }

  // A contestant at the talent show: the Jinx doing its act under a spotlight, its name, and the judges' card.
  D.performer = function (c, x, y, t, v) {
    const j = c.j, act = v.acting ? v.stat : null, u = U;
    if (v.acting) {
      const g = ctx.createLinearGradient(x, y - 330 * u, x, y);
      g.addColorStop(0, "rgba(255,244,200,0)");
      g.addColorStop(1, "rgba(255,244,200,0.3)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 14 * u, y - 330 * u); ctx.lineTo(x + 14 * u, y - 330 * u); ctx.lineTo(x + 62 * u, y); ctx.lineTo(x - 62 * u, y); ctx.fill();
      ctx.fillStyle = "rgba(255,244,200,0.28)";
      ctx.beginPath(); ctx.ellipse(x, y, 62 * u, 17 * u, 0, 0, Math.PI * 2); ctx.fill();
    }
    const o = { t, scale: c.scale || 1.25, dir: c.dir || 1, happy: !!act || v.cheer > 0 || v.won, hop: 0, look: [0, 0] };
    let jx = 0;
    if (act === "tumble") { o.spin = (t * 6) % (Math.PI * 2); o.hop = Math.abs(Math.sin(t * 6)) * 40 * u; }
    else if (act === "juggle") o.hop = Math.abs(Math.sin(t * 6)) * 5 * u;
    else if (act === "glow") { o.hop = (0.5 + 0.5 * Math.sin(t * 2.4)) * 24 * u; o.twirl = t * 3; glow(x, y - 44 * u - o.hop, 95 * u, "#8fe9ff", 0.3 + 0.18 * Math.sin(t * 5)); }
    else if (act === "grit") jx = Math.sin(t * 38) * 1.6 * u;
    if (v.cheer > 0) o.hop += Math.sin((1 - v.cheer) * Math.PI) * 26 * u;
    if (v.won) o.hop += Math.abs(Math.sin(t * 5)) * 22 * u;
    const r = D.drawJinx(j, x + jx, y, o), top = r.topY + 22 * u;
    if (act === "juggle") {
      for (let k = 0; k < 5; k++) {
        const a = t * 4.2 + k * 1.2566, px = x + Math.cos(a) * 34 * u, py = top - 16 * u - Math.abs(Math.sin(a)) * 78 * u;
        ctx.fillStyle = ["#ff5fa8", "#ffd23f", "#8fe9ff", "#a6d94a", "#fbf8f2"][k];
        ctx.strokeStyle = GINK;
        ctx.lineWidth = 1.6 * u;
        ctx.beginPath(); ctx.arc(px, py, 7.5 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (act === "grit") {
      // a barbell, with more plates the longer it holds
      const by = top - 12 * u + Math.sin(t * 38) * 1.2 * u, n = 1 + Math.min(3, Math.floor((v.k || 0) * 4));
      ctx.strokeStyle = GINK; ctx.lineWidth = 6 * u;
      ctx.beginPath(); ctx.moveTo(x - 52 * u, by); ctx.lineTo(x + 52 * u, by); ctx.stroke();
      ctx.strokeStyle = "#cfc6d8"; ctx.lineWidth = 3 * u; ctx.stroke();
      for (const sd of [-1, 1]) for (let k = 0; k < n; k++) {
        const wt = new Path2D();
        wt.roundRect(x + sd * (38 + k * 9) * u - 4 * u, by - (17 - k * 2) * u, 8 * u, (34 - k * 4) * u, 2 * u);
        ctx.fillStyle = "#2a2236"; ctx.fill(wt);
        ctx.strokeStyle = GINK; ctx.lineWidth = 1.5 * u; ctx.stroke(wt);
      }
      for (let k = 0; k < 2; k++) { const kk = (t * 1.5 + k * 0.5) % 1; ctx.fillStyle = `rgba(143,233,255,${1 - kk})`; ctx.beginPath(); ctx.arc(x + (k ? 26 : -26) * u, r.faceY - 8 * u + kk * 16 * u, 2.4 * u, 0, Math.PI * 2); ctx.fill(); }
    } else if (act === "glow") {
      for (let k = 0; k < 6; k++) { const a = t * 2.2 + k * 1.047; sparkle(x + Math.cos(a) * 46 * u, y - 44 * u - o.hop + Math.sin(a) * 30 * u, 5 * u, k % 2 ? "#ffffff" : "#8fe9ff"); }
    } else if (act === "tumble") {
      ctx.strokeStyle = "rgba(255,210,63,0.6)"; ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.arc(x, y - 40 * u - o.hop, 46 * u, t * 6, t * 6 + 1.6); ctx.stroke();
    }
    // name on a strip of paper, with the running total
    ctx.save();
    ctx.font = `${11 * u}px "Bungee", sans-serif`;
    const label = j.name.toUpperCase(), tw = ctx.measureText(label).width + 12 * u;
    ctx.translate(x, y + (c.low ? 34 : 16) * u);
    ctx.rotate(c.me ? -0.03 : 0.02);
    ctx.fillStyle = "rgba(8,3,16,0.5)";
    ctx.fillRect(-tw / 2 + 2 * u, -7 * u + 3 * u, tw, 15 * u);
    ctx.fillStyle = c.me ? "#ffd23f" : "#fbf8f2";
    ctx.fillRect(-tw / 2, -7 * u, tw, 15 * u);
    ctx.fillStyle = GINK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1 * u);
    if (v.total) {
      ctx.font = `${10 * u}px "Special Elite", monospace`;
      ctx.fillStyle = "#fbf8f2";
      ctx.fillText(v.total.toFixed(1), 0, 17 * u);
    }
    ctx.restore();
    // the judges' card, on a stick
    if (v.card) {
      const k = clamp((t - v.card.t0) / 0.28, 0, 1), cy = top - 58 * u, flip = Math.sin(k * Math.PI / 2);
      ctx.save();
      ctx.fillStyle = GINK; ctx.fillRect(x + 30 * u - 2.5 * u, cy, 5 * u, 60 * u);
      ctx.fillStyle = "#d9b77a"; ctx.fillRect(x + 30 * u - 1.5 * u, cy, 3 * u, 60 * u);
      ctx.translate(x + 30 * u, cy);
      ctx.rotate(0.08);
      ctx.scale(Math.max(0.05, flip), 1);
      ctx.fillStyle = "rgba(8,3,16,0.5)";
      ctx.fillRect(-21 * u + 3 * u, -27 * u + 4 * u, 42 * u, 44 * u);
      ctx.fillStyle = "#fbf8f2";
      ctx.fillRect(-21 * u, -27 * u, 42 * u, 44 * u);
      ctx.fillStyle = v.card.v >= 8 ? "#d62839" : GINK;
      ctx.font = `${20 * u}px "Bungee", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.card.v.toFixed(1), 0, -4 * u);
      ctx.restore();
    }
    return r;
  };

  D.garden = function (t, dt, G) {
    D.paper.neon = false;
    D.paper.edge = "#fbf8f2";
    camStep(G && G.pointer, dt, t);
    const portrait = H > W;
    const I = D.island();
    drawBg(t);
    constellations(G && G.save && G.save.sky, t);
    // far to near: the black sun, the ringed planet, islands lost in haze, fog, then our island
    const [ex, ey] = par(9);
    sun.x = I.cx + I.rx * 0.2 + ex;
    sun.y = I.cy - I.ry - (portrait ? 120 : 96) * U + ey;
    eclipse(sun.x, sun.y, (portrait ? 44 : 58) * U, t);
    const [qx, qy] = par(12);
    planet(W * (portrait ? 0.78 : 0.82) + qx, H * (portrait ? 0.14 : 0.2) + qy, Math.min(W, H) * (portrait ? 0.09 : 0.08), t);
    const [f1x, f1y] = par(14), [f2x, f2y] = par(20);
    farIsle(I.cx - I.rx * 0.2 + f1x, I.cy - I.ry * 1.45 + f1y, I.rx * 0.07, 1, t, 0, 2);
    farIsle(I.cx + I.rx * 0.72 + f1x, I.cy - I.ry * 1.25 + f1y, I.rx * 0.1, 0.7, t, 1, 1);
    fog(I.cy - I.ry * 1.2, I.ry * 0.5, 0.06, t, 0.006, 3);
    farIsle(I.cx - I.rx * 0.86 + f2x, I.cy - I.ry * 0.95 + f2y, I.rx * 0.17, 0.35, t, 2, 0);
    farIsle(I.cx + I.rx * 1.0 + f2x, I.cy - I.ry * 0.5 + f2y, I.rx * 0.13, 0.2, t, 3, 2);
    fog(I.cy - I.ry * 0.8, I.ry * 0.45, 0.085, t, 0.01, 17);
    fog(I.cy + I.ry * 2.3, I.ry * 0.7, 0.07, t, -0.008, 29, "#7a5ac8");
    const tentX = I.cx - I.rx * 0.38, tentY = I.cy - I.ry * 0.55;
    const tw = I.rx * 0.55, th = I.rx * 0.5;
    island(t);
    // haze lying on the far side of the island
    ctx.save();
    ctx.beginPath(); ctx.ellipse(I.cx, I.cy, I.rx, I.ry, 0, 0, Math.PI * 2); ctx.clip();
    fog(I.cy - I.ry * 0.75, I.ry * 0.3, 0.1, t, 0.012, 41);
    ctx.restore();
    let peak;
    castShadow(tentX, tentY, tw * 0.5, I.ry * 1.5, 0.5);
    cutout(() => { peak = tent(tentX, tentY, tw, th, t); }, tentX, tentY, tw * 0.66, th * 1.4, 8 * U, { edge: 3.4, lift: 6 });
    lights(peak[0], peak[1], I.cx + I.rx * 0.92, I.cy - I.ry * 0.25, I.ry * 0.5, t, 1);
    lights(peak[0], peak[1], I.cx - I.rx * 0.96, I.cy - I.ry * 0.1, I.ry * 0.35, t, 3);
    ring(I, t);
    pond(I, t);
    castShadow(I.cx - I.rx * 0.7, I.cy + I.ry * 0.28, 12 * U, 60 * U, 0.35);
    cutout(() => tv(I.cx - I.rx * 0.7, I.cy + I.ry * 0.28, 14 * U, t), I.cx - I.rx * 0.7, I.cy + I.ry * 0.28, 28 * U, 40 * U, 8 * U, { edge: 2.2 });
    // things further back are drawn a little smaller
    const deep = (v) => 0.88 + 0.2 * clamp((v + 1) / 2, 0, 1);
    motes(t, false);
    const hits = [];
    if (G && G.save) {
      // everything that stands on the island, drawn back to front
      const s = G.save, things = [];
      const show = G.talent;
      if (show) show.cast.forEach((c, i) => {
        const [x, y] = D.toScreen(c.u, c.v);
        things.push({ y, f: () => { castShadow(x, y, 15 * U, 80 * U, 0.3); const h = D.performer(c, x, y, t, show.view(i)); if (c.me) hits.push({ kind: "jinx", j: c.j, ...h }); } });
      });
      const duet = G.duet && G.duet.phase === "sing" ? G.duet : null;
      if (duet) {
        // the heart balloon they share, drifting up between them
        const [x, y] = D.toScreen(duet.u, duet.v), k = clamp(duet.t / 3.6, 0, 1);
        things.push({ y: y + 1, f: () => {
          const by = y - 70 * U - k * 60 * U, bx = x + Math.sin(t * 2) * 6 * U, sz = 15 * U * (1 + 0.08 * Math.sin(t * 6));
          ctx.strokeStyle = "rgba(239,230,210,0.8)"; ctx.lineWidth = 1.2 * U;
          ctx.beginPath(); ctx.moveTo(bx, by + sz); ctx.quadraticCurveTo(bx + 8 * U, by + sz + 22 * U, x, y - 34 * U); ctx.stroke();
          cutout(() => heart(bx, by - sz * 0.2, sz, "#ff5fa8"), bx, by, sz * 2.4, sz * 2.4, sz * 2.4, { edge: 2 });
          glow(bx, by, sz * 3.2, "#ff5fa8", 0.25);
        } });
      }
      for (const j of s.jinxes) {
        if (show && show.cast.some((c) => c.j === j)) continue;
        const [x, y] = D.toScreen(j.u, j.v);
        things.push({ y: j.held ? 1e9 : y, f: () => {
          if (j.stage === "egg") { castShadow(x, y, 9 * U, 40 * U, 0.3); hits.push({ kind: "jinx", j, ...D.drawEgg(j, x, y, t) }); }
          else {
            const lift = j.held ? 34 * U : j.hopT > 0 ? Math.sin((1 - j.hopT) * Math.PI) * 28 * U : 0;
            if (!j.held) castShadow(x, y, 15 * U * deep(j.v), 85 * U * deep(j.v), 0.32);
            hits.push({ kind: "jinx", j, ...D.drawJinx(j, x, y, { t, scale: 1.25 * deep(j.v), walk: j.moving || j.held, dir: j.face === undefined ? j.dir : j.face, selected: G.selected === j.id, happy: j.happyT > 0 && !j.held,
              look: j.held ? [0, 1] : lookAt(G.pointer, x, y), hop: lift, spin: j.spinT > 0 ? (1 - j.spinT) * Math.PI * 2 : 0, sleep: j.sleep }) });
          }
        } });
      }
      if (s.tree) {
        const [x, y] = D.toScreen(JG.TREE.u, JG.TREE.v);
        things.push({ y, f: () => { castShadow(x, y, 14 * U, 150 * U, 0.42); gShadow(x, y, 80 * U); cutout(() => snackTree(x, y, t, s.tree), x, y, 110 * U, 190 * U, 8 * U, { lift: 6 }); hits.push({ kind: "tree", x, y: y - 96 * U, r: 70 * U }); } });
      }
      for (const id in s.toys || {}) {
        const T = JG.TOYS[id];
        if (!T || !s.toys[id]) continue;
        const [x, y] = D.toScreen(T.u, T.v);
        things.push({ y, f: () => {
          castShadow(x, y, 16 * U, 70 * U, 0.34);
          gShadow(x, y, 48 * U);
          let h;
          cutout(() => { h = toyDraw(id, x, y, t, G.toyUse && G.t - (G.toyUse[id] || -9) < 0.4); }, x, y, 50 * U, 130 * U, 8 * U, { edge: 2.4 });
          hits.push({ kind: "toy", id, ...h });
        } });
      }
      for (const it of s.ground || []) {
        const [x, y] = D.toScreen(it.u, it.v);
        things.push({ y: it.held ? 1e9 : y - 1, f: () => hits.push({ kind: "item", it, ...groundItem(it.item, x, y, t, it.held) }) });
      }
      things.sort((a, b) => a.y - b.y).forEach((q) => q.f());
    }
    motes(t, true);
    particlesStep(dt);
    foreground(t);
    return hits;
  };

  D.mapBg = function (t, dt, act) {
    D.paper.neon = act === 3;
    D.paper.edge = "#fbf8f2";
    camStep(JG.game && JG.game.pointer, dt, t);
    drawBg(t);
    const [ex, ey] = par(9), [qx, qy] = par(16);
    eclipse(W * 0.82 + ex, H * 0.2 + ey, Math.min(W, H) * 0.07, t);
    farIsle(W * 0.9 + qx, H * 0.62 + qy, Math.min(W, H) * 0.09, 0.5, t, 1, act === 1 ? 0 : act === 2 ? 1 : 2);
    farIsle(W * 0.07 + qx, H * 0.4 + qy, Math.min(W, H) * 0.06, 0.9, t, 2, 2);
    fog(H * 0.7, H * 0.2, 0.07, t, 0.008, 5);
    planet(W * 0.15 + qx * 1.4, H * 0.82 + qy, Math.min(W, H) * 0.12, t);
    const tint = JG.ACTS[act - 1].tint;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, rgb(tint, 0));
    g.addColorStop(1, rgb(tint, 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    motes(t, false);
    motes(t, true);
    particlesStep(dt);
    foreground(t);
  };

  D.stagePos = function () {
    const portrait = H > W;
    return { px: W * (portrait ? 0.27 : 0.3), fx: W * (portrait ? 0.72 : 0.68), feet: H * (portrait ? 0.56 : 0.64), portrait };
  };

  // helpers for stage.js, which draws the battle stage
  D._ = { ctx: () => ctx, glow, sparkle, heart, drawBg, particlesStep, planet, tent, lights, rng, mix, rgb, camStep, par, fog, farIsle, eclipse, sun };

  D.clear = function () {
    D.particles.length = 0;
    D.floats.length = 0;
  };
})();
