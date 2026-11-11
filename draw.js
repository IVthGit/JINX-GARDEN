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

  function buildBg() {
    bg = document.createElement("canvas");
    bg.width = Math.max(1, Math.round(W * DPR));
    bg.height = Math.max(1, Math.round(H * DPR));
    const g = bg.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const lin = g.createLinearGradient(0, 0, 0, H);
    lin.addColorStop(0, "#0a0418");
    lin.addColorStop(0.55, "#1c0a33");
    lin.addColorStop(1, "#2a0d2e");
    g.fillStyle = lin;
    g.fillRect(0, 0, W, H);
    const r = rng(1999);
    const neb = ["#ff2e93", "#2fb7c9", "#8a3dff", "#a6d94a", "#ff8a3d"];
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = r() * H * 0.8, rad = (0.15 + r() * 0.35) * Math.max(W, H);
      const c = neb[i % neb.length];
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, rgb(c, 0.13 + r() * 0.07));
      rg.addColorStop(0.5, rgb(c, 0.04));
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
    for (let i = 0; i < 700; i++) {
      const s = r();
      g.fillStyle = `rgba(255,${200 + r() * 55 | 0},${220 + r() * 35 | 0},${0.15 + s * 0.6})`;
      g.fillRect(r() * W, r() * H * 0.85, s < 0.97 ? 1 : 2, s < 0.97 ? 1 : 2);
    }
  }

  function drawBg(t) {
    ctx.drawImage(bg, 0, 0, W, H);
    for (const s of twinkles) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.sp + s.ph));
      sparkle(s.x * W, s.y * H, s.s * 2.2 * a, `rgba(255,240,255,${a})`);
    }
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

  function glow(x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(color, a));
    g.addColorStop(1, rgb(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
    // the top surface
    const tg = ctx.createRadialGradient(cx, cy - ry * 0.3, ry * 0.2, cx, cy, rx);
    tg.addColorStop(0, "#3e6a58");
    tg.addColorStop(0.6, "#28474a");
    tg.addColorStop(1, "#1a2a3a");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(143,233,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // grass tufts
    ctx.strokeStyle = "rgba(166,217,74,0.35)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.95;
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      const sway = Math.sin(t * 1.5 + x * 0.05) * 2 * U;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2 * U + sway, y - 6 * U);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2 * U + sway, y - 7 * U);
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
  D.jinxLook = function (j) {
    const a = j.align || 0;
    const adult = j.stage === "adult";
    const form = adult ? (a > 0.33 ? "ether" : a < -0.33 ? "grunge" : "neutral") : "child";
    let body = hsl(j.hue, 72, 70);
    if (a > 0) body = mix(body, "#efeaff", Math.min(0.72, a * (adult ? 1.0 : 0.8)));
    if (a < 0) body = mix(body, "#56604a", Math.min(1, -a * (adult ? 1.1 : 0.75)));
    let hat = ["#d62839", "#1b1726"], bell = "#ffd23f";
    if (form === "ether" || (!adult && a > 0.33)) { hat = ["#c9b8ff", "#8fe9ff"]; bell = "#f4f0ff"; }
    if (form === "grunge" || (!adult && a < -0.33)) { hat = ["#2a2632", "#7fae3a"]; bell = "#b9b2a6"; }
    let best = "juggle", bv = -1;
    for (const s of JG.STATS) if (j.stats[s].lv > bv) { bv = j.stats[s].lv; best = s; }
    return { form, body, hat, bell, best, adult };
  };

  D.drawJinx = function (j, x, y, o) {
    o = o || {};
    const t = o.t || 0;
    const L = D.jinxLook(j);
    const s = (j.stage === "adult" ? 1 : 0.78) * (o.scale || 1);
    const r = 27 * U * s;
    const walk = o.walk ? 1 : 0;
    const hop = o.hop || 0;
    const ph = t * 9 + (j.seed || 0);
    const bounce = walk ? Math.abs(Math.sin(ph)) * r * 0.35 : Math.abs(Math.sin(t * 2.2 + (j.seed || 0))) * r * 0.05;
    const squash = walk ? Math.cos(ph * 2) * 0.05 : Math.sin(t * 2.2 + (j.seed || 0)) * 0.03;
    const dir = o.dir || 1;
    const by = y - r * 0.85 - bounce - hop;
    // shadow
    ctx.fillStyle = "rgba(5,2,12,0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1 - bounce / (r * 1.5)), r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.selected) {
      ctx.save();
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, by);
    if (o.spin) ctx.rotate(o.spin);
    ctx.scale((1 + squash) * dir, 1 - squash);

    if (L.form === "ether") {
      glow(0, 0, r * 2.6, "#8fe9ff", 0.22 + 0.06 * Math.sin(t * 3));
    }
    if (L.form === "grunge") {
      glow(0, r * 0.4, r * 2, "#a6d94a", 0.12);
    }
    // feet
    const step = walk ? Math.sin(ph) : 0;
    const footC = rgb(mix(L.body, "#1b1029", 0.25));
    if (L.adult && L.best === "tumble") {
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let k = 0; k <= 12; k++) {
          const yy = r * 0.7 + (k / 12) * r * 0.35;
          const xx = side * r * 0.42 + Math.sin(k * 1.6) * r * 0.12;
          k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = footC;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.42, r * 0.82 - (side * step > 0 ? step * r * 0.15 * side : 0) + (L.adult && L.best === "tumble" ? r * 0.25 : 0),
        r * 0.28, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // arms
    const swing = walk ? Math.sin(ph) * 0.5 : Math.sin(t * 2) * 0.12;
    ctx.fillStyle = rgb(mix(L.body, "#1b1029", 0.12));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * r * 0.88, r * 0.2);
      ctx.rotate(side * (0.5 + swing * side));
      ctx.beginPath();
      ctx.ellipse(0, r * 0.18, r * (L.adult && L.best === "juggle" ? 0.22 : 0.16), r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // body: a gumdrop
    const body = new Path2D();
    body.moveTo(-r * 0.98, r * 0.62);
    body.bezierCurveTo(-r * 1.08, -r * 0.4, -r * 0.6, -r * 1.12, 0, -r * 1.1);
    body.bezierCurveTo(r * 0.6, -r * 1.12, r * 1.08, -r * 0.4, r * 0.98, r * 0.62);
    body.bezierCurveTo(r * 0.7, r * 0.95, -r * 0.7, r * 0.95, -r * 0.98, r * 0.62);
    const bg2 = ctx.createRadialGradient(-r * 0.35, -r * 0.55, r * 0.1, 0, 0, r * 1.25);
    bg2.addColorStop(0, rgb(mix(L.body, "#ffffff", 0.45)));
    bg2.addColorStop(0.55, rgb(L.body));
    bg2.addColorStop(1, rgb(mix(L.body, "#1b1029", 0.45)));
    ctx.globalAlpha = L.form === "ether" ? 0.88 : 1;
    ctx.fillStyle = bg2;
    ctx.fill(body);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.clip(body);
    if (L.form === "neutral") {
      // harlequin diamonds on the belly
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = i % 2 ? "rgba(214,40,57,0.55)" : "rgba(27,23,38,0.45)";
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, r * 0.35);
        ctx.lineTo(i * r * 0.36 + r * 0.18, r * 0.62);
        ctx.lineTo(i * r * 0.36, r * 0.9);
        ctx.lineTo(i * r * 0.36 - r * 0.18, r * 0.62);
        ctx.fill();
      }
    }
    if (L.form === "grunge") {
      // ripped stripes
      ctx.strokeStyle = "rgba(20,16,26,0.5)";
      ctx.lineWidth = r * 0.12;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-r, r * (0.1 + i * 0.22));
        ctx.lineTo(r * 0.2, r * (0.15 + i * 0.22));
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = L.form === "grunge" ? "rgba(10,8,14,0.9)" : "rgba(27,16,41,0.55)";
    ctx.lineWidth = L.form === "grunge" ? 2.4 : 1.5;
    ctx.stroke(body);
    if (L.form === "grunge" || (!L.adult && (j.align || 0) < -0.5)) {
      ctx.fillStyle = rgb(mix(L.body, "#a6d94a", 0.35));
      for (let i = 0; i < 3; i++) {
        const dx = (-0.5 + i * 0.5) * r, len = r * (0.25 + 0.2 * Math.abs(Math.sin(t * 1.3 + i * 2)));
        ctx.beginPath();
        ctx.moveTo(dx - r * 0.09, r * 0.8);
        ctx.quadraticCurveTo(dx, r * 0.8 + len * 2, dx + r * 0.09, r * 0.8);
        ctx.fill();
      }
    }
    // ruff collar
    for (let i = 0; i < 7; i++) {
      const xx = -r * 0.78 + i * r * 0.26;
      ctx.fillStyle = L.hat[i % 2];
      ctx.beginPath();
      ctx.moveTo(xx - r * 0.15, r * 0.12);
      ctx.lineTo(xx + r * 0.15, r * 0.12);
      ctx.lineTo(xx, r * 0.36);
      ctx.fill();
    }
    // face
    const blink = (t * 0.7 + (j.seed || 0)) % 4 < 0.12;
    const sad = (j.mood || 50) < 30;
    const eyeY = -r * 0.32;
    for (const side of [-1, 1]) {
      const ex = side * r * 0.34;
      if (blink || o.sleep) {
        ctx.strokeStyle = "#1b1029";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, eyeY, r * 0.14, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#1b1029";
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, r * 0.17, r * 0.23, 0, 0, Math.PI * 2);
        ctx.fill();
        if (L.form === "grunge") {
          ctx.strokeStyle = "#0a070e";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ex - side * r * 0.12 - r * 0.12, eyeY - r * 0.12);
          ctx.lineTo(ex + side * r * 0.3, eyeY - r * 0.02);
          ctx.stroke();
        }
        ctx.fillStyle = L.form === "ether" ? "#8fe9ff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - r * 0.05, eyeY - r * 0.08, r * 0.07, 0, Math.PI * 2);
        ctx.arc(ex + r * 0.06, eyeY + r * 0.07, r * 0.03, 0, Math.PI * 2);
        ctx.fill();
        if (sad) {
          ctx.fillStyle = rgb(L.body);
          ctx.fillRect(ex - r * 0.2, eyeY - r * 0.26, r * 0.4, r * 0.15);
        }
      }
      // cheek paint
      const cx2 = side * r * 0.58, cy2 = -r * 0.02;
      if (L.form === "ether") {
        sparkle(cx2, cy2, r * 0.05, "rgba(143,233,255,0.9)");
      } else if (L.form === "grunge") {
        ctx.strokeStyle = "rgba(10,8,14,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx2 - r * 0.07, cy2 - r * 0.07);
        ctx.lineTo(cx2 + r * 0.07, cy2 + r * 0.07);
        ctx.moveTo(cx2 + r * 0.07, cy2 - r * 0.07);
        ctx.lineTo(cx2 - r * 0.07, cy2 + r * 0.07);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,95,168,0.75)";
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 - r * 0.1);
        ctx.lineTo(cx2 + r * 0.07, cy2);
        ctx.lineTo(cx2, cy2 + r * 0.1);
        ctx.lineTo(cx2 - r * 0.07, cy2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "#1b1029";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (sad) ctx.arc(0, r * 0.06, r * 0.1, Math.PI + 0.4, -0.4);
    else if (o.happy) {
      ctx.fillStyle = "#5a1030";
      ctx.arc(0, -r * 0.06, r * 0.13, 0.1, Math.PI - 0.1);
      ctx.closePath();
      ctx.fill();
    } else ctx.arc(0, -r * 0.06, r * 0.1, 0.4, Math.PI - 0.4);
    ctx.stroke();

    // hat: two floppy prongs with bells
    const hatY = -r * 0.92;
    const droop = L.adult ? 0 : r * 0.25;
    const jig = Math.sin(t * 3 + (j.seed || 0)) * r * 0.06 + (walk ? Math.sin(ph) * r * 0.1 : 0);
    ctx.fillStyle = L.hat[1];
    ctx.beginPath();
    ctx.ellipse(0, hatY + r * 0.06, r * 0.62, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    const tips = [];
    for (const side of [-1, 1]) {
      const tx = side * r * (L.adult ? 1.35 : 1.15), ty = hatY - r * (L.adult ? 0.55 : 0.2) + droop + jig * side;
      tips.push([tx, ty]);
      ctx.fillStyle = side < 0 ? L.hat[0] : L.hat[1];
      ctx.beginPath();
      ctx.moveTo(-r * 0.55 * (side < 0 ? 1 : -0.1), hatY + r * 0.05);
      ctx.quadraticCurveTo(side * r * 0.25, hatY - r * 1.1, tx, ty);
      ctx.quadraticCurveTo(side * r * 0.45, hatY - r * 0.25, side * r * 0.55, hatY + r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(10,6,16,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (L.adult && L.best === "grit") {
        ctx.fillStyle = "#cfc6d8";
        for (let k = 1; k < 4; k++) {
          const kk = k / 4;
          const px = (1 - kk) * (1 - kk) * 0 + 2 * (1 - kk) * kk * side * r * 0.25 + kk * kk * tx;
          const py = (1 - kk) * (1 - kk) * hatY + 2 * (1 - kk) * kk * (hatY - r * 1.1) + kk * kk * ty;
          ctx.beginPath();
          ctx.moveTo(px - r * 0.07, py);
          ctx.lineTo(px, py - r * 0.24);
          ctx.lineTo(px + r * 0.07, py);
          ctx.fill();
        }
      }
    }
    // middle prong for adults
    if (L.adult) {
      ctx.fillStyle = L.hat[0];
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, hatY);
      ctx.quadraticCurveTo(0, hatY - r * 1.0, jig, hatY - r * 1.15);
      ctx.quadraticCurveTo(r * 0.05, hatY - r * 0.5, r * 0.2, hatY);
      ctx.fill();
      tips.push([jig, hatY - r * 1.15]);
    }
    for (const [tx, ty] of tips) {
      ctx.fillStyle = L.bell;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(tx - r * 0.05, ty - r * 0.05, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(20,10,30,0.7)";
      ctx.fillRect(tx - r * 0.07, ty + r * 0.03, r * 0.14, r * 0.03);
    }
    if (L.form === "grunge") {
      // a safety pin through the hat band
      ctx.strokeStyle = "#e6e0d6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(r * 0.3, hatY + r * 0.05, r * 0.16, r * 0.05, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (L.adult && L.best === "glow") {
      ctx.strokeStyle = rgb(mix(L.body, "#1b1029", 0.3));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.9, r * 0.25, -r * 1.25);
      ctx.stroke();
      glow(r * 0.25, -r * 1.3, r * 0.8, "#8fe9ff", 0.6);
      sparkle(r * 0.25, -r * 1.3, r * 0.1, "#ffffff");
    }
    if (L.form === "ether") {
      ctx.strokeStyle = `rgba(255,236,150,${0.8 + 0.2 * Math.sin(t * 2)})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, hatY - r * 1.5 + Math.sin(t * 2) * r * 0.06, r * 0.55, r * 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    // juggled planets stay upright, outside the flip
    if (L.adult && L.best === "juggle") {
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k * 2.09;
        const px = x + Math.cos(a) * r * 0.9, py = by - r * 1.9 - Math.abs(Math.sin(a)) * r * 0.9;
        ctx.fillStyle = ["#ff5fa8", "#ffd23f", "#8fe9ff"][k];
        ctx.beginPath();
        ctx.arc(px, py, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px, py, r * 0.24, r * 0.06, -0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (o.sleep) {
      ctx.fillStyle = "rgba(201,184,255,0.8)";
      ctx.font = `${12 * U}px "Permanent Marker", cursive`;
      ctx.fillText("z", x + r * 0.9, by - r * 1.2 - ((t * 10) % 12));
    }
    return { x, y: by, r };
  };

  D.drawEgg = function (e, x, y, t) {
    const r = 18 * U;
    const wob = e.wobble || 0;
    const prog = 1 - e.hatch / (e.hatchMax || 45);
    ctx.fillStyle = "rgba(5,2,12,0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.9, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.strokeStyle = "rgba(27,16,41,0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke(egg);
    ctx.restore();
    return { x, y: y - r * 1.15, r };
  };

  // ---------- foes ----------
  D.foeCenter = function (look, feetY) {
    const r = 42 * U * look.size;
    const off = { tall: 1.15, round: 1.0, balloon: 2.0, wide: 1.0, blob: 0.85, wisp: 1.6, tv: 1.25 }[look.body] || 1;
    return { r, cy: feetY - r * off };
  };

  D.drawFoe = function (f, x, feetY, t, o) {
    o = o || {};
    const L = f.def.look;
    const { r, cy } = D.foeCenter(L, feetY);
    const floaty = ["balloon", "wisp", "tv"].includes(L.body);
    const y = cy + Math.sin(t * (floaty ? 1.6 : 2.4)) * r * (floaty ? 0.08 : 0.03);
    const skin = L.skin, paint = L.paint;
    ctx.fillStyle = "rgba(5,2,12,0.5)";
    ctx.beginPath();
    ctx.ellipse(x, feetY, r * (floaty ? 0.8 : 1.1), r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    if (o.hurt) ctx.filter = "brightness(2.2) saturate(0.3)";
    if (f.charge) {
      glow(x, y, r * 2.5, "#ffd23f", 0.25 + 0.2 * Math.sin(t * 12));
    }
    ctx.translate(x, y);

    // things behind the body
    if (L.extra === "wings") {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(Math.sin(t * 6) * 0.15);
        const wg = ctx.createRadialGradient(r * 0.6, -r * 0.4, 0, r * 0.6, -r * 0.4, r * 1.6);
        wg.addColorStop(0, rgb(mix(skin, "#ffffff", 0.3), 0.95));
        wg.addColorStop(1, rgb(mix(skin, paint, 0.6), 0.7));
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(r * 0.2, -r * 0.2);
        ctx.bezierCurveTo(r * 1.4, -r * 1.6, r * 2.2, -r * 0.6, r * 1.6, r * 0.1);
        ctx.bezierCurveTo(r * 1.9, r * 0.7, r * 1.0, r * 1.1, r * 0.2, r * 0.3);
        ctx.fill();
        ctx.fillStyle = rgb(paint, 0.7);
        ctx.beginPath();
        ctx.arc(r * 1.2, -r * 0.5, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(r * 1.2, -r * 0.5, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (L.extra === "pipes") {
      for (let i = -3; i <= 3; i++) {
        const h = r * (1.4 + (3 - Math.abs(i)) * 0.35);
        const px = i * r * 0.32;
        const pg = ctx.createLinearGradient(px - r * 0.1, 0, px + r * 0.1, 0);
        pg.addColorStop(0, "#6a5a2a");
        pg.addColorStop(0.5, "#f2d27a");
        pg.addColorStop(1, "#5a4a1a");
        ctx.fillStyle = pg;
        ctx.fillRect(px - r * 0.11, -h - r * 0.2, r * 0.22, h);
        ctx.fillStyle = "#1b1029";
        ctx.fillRect(px - r * 0.06, -h * 0.5, r * 0.12, r * 0.08);
        const puff = (t * 0.8 + i * 0.3) % 1;
        ctx.fillStyle = `rgba(216,208,255,${0.5 * (1 - puff)})`;
        ctx.beginPath();
        ctx.arc(px + Math.sin(puff * 5) * r * 0.1, -h - r * 0.3 - puff * r, r * (0.1 + puff * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (L.extra === "tail") {
      for (let i = 8; i > 0; i--) {
        const k = i / 8;
        const c = mix("#ffd23f", "#ff3b4a", k);
        ctx.fillStyle = rgb(c, 0.5 * (1 - k * 0.6));
        ctx.beginPath();
        ctx.arc(r * 1.2 * k * 1.6 + Math.sin(t * 8 + i) * r * 0.1, -r * 0.2 * k + Math.cos(t * 7 + i) * r * 0.1, r * (1 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (L.extra === "tentacles") {
      ctx.strokeStyle = rgb(mix(skin, paint, 0.3));
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        ctx.lineWidth = r * 0.16;
        ctx.beginPath();
        const sx = (i - 2.5) * r * 0.32;
        ctx.moveTo(sx, r * 0.5);
        for (let k = 1; k <= 10; k++) {
          const kk = k / 10;
          ctx.lineTo(sx + Math.sin(t * 2 + i + kk * 5) * r * 0.3 * kk + (i - 2.5) * r * 0.2 * kk, r * 0.5 + kk * r * 1.3);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
    if (L.extra === "ropes") {
      ctx.strokeStyle = "#d9cdb4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.2);
      ctx.lineTo(-r * 0.9, -y);
      ctx.moveTo(r * 0.9, -r * 0.2);
      ctx.lineTo(r * 0.9, -y);
      ctx.stroke();
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(-r * 1.0, -r * 0.25, r * 2.0, r * 0.1);
    }
    if (L.extra === "string") {
      ctx.strokeStyle = "rgba(239,230,210,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.15);
      for (let k = 1; k <= 10; k++) ctx.lineTo(Math.sin(t * 3 + k) * r * 0.08, r * 1.15 + k * r * 0.1);
      ctx.stroke();
    }

    // body
    const bodyP = new Path2D();
    let faceY = 0;
    if (L.body === "tall") {
      bodyP.roundRect(-r * 0.68, -r * 1.15, r * 1.36, r * 2.3, r * 0.6);
      faceY = -r * 0.45;
    } else if (L.body === "round") {
      bodyP.arc(0, 0, r, 0, Math.PI * 2);
      faceY = -r * 0.1;
    } else if (L.body === "balloon") {
      bodyP.ellipse(0, 0, r, r * 1.12, 0, 0, Math.PI * 2);
      bodyP.moveTo(-r * 0.12, r * 1.2);
      bodyP.lineTo(r * 0.12, r * 1.2);
      bodyP.lineTo(0, r * 1.08);
      faceY = -r * 0.1;
    } else if (L.body === "wide") {
      bodyP.ellipse(0, 0, r * 1.35, r, 0, 0, Math.PI * 2);
      faceY = -r * 0.25;
    } else if (L.body === "blob") {
      bodyP.moveTo(-r * 1.2, r * 0.85);
      bodyP.bezierCurveTo(-r * 1.4, -r * 0.6, -r * 0.5, -r * 1.2, 0, -r * 1.1);
      bodyP.bezierCurveTo(r * 0.8, -r * 1.1, r * 1.4, -r * 0.4, r * 1.2, r * 0.85);
      for (let k = 0; k <= 6; k++) bodyP.lineTo(r * 1.2 - (k / 6) * r * 2.4, r * 0.85 + Math.sin(k * 2 + t * 3) * r * 0.08);
      faceY = -r * 0.35;
    } else if (L.body === "wisp") {
      bodyP.moveTo(-r * 0.9, 0);
      bodyP.arc(0, 0, r * 0.9, Math.PI, 0);
      for (let k = 0; k <= 12; k++) {
        const kk = k / 12;
        const w = r * 0.9 * (1 - kk);
        bodyP.lineTo(w + Math.sin(t * 3 + kk * 6) * r * 0.15, kk * r * 1.5);
      }
      for (let k = 12; k >= 0; k--) {
        const kk = k / 12;
        const w = r * 0.9 * (1 - kk);
        bodyP.lineTo(-w + Math.sin(t * 3 + kk * 6 + 1) * r * 0.15, kk * r * 1.5);
      }
      faceY = -r * 0.2;
    } else if (L.body === "tv") {
      bodyP.roundRect(-r * 0.95, -r * 0.75, r * 1.9, r * 1.4, r * 0.18);
      faceY = -r * 0.05;
    }
    const g = ctx.createLinearGradient(0, -r * 1.2, 0, r * 1.2);
    g.addColorStop(0, rgb(mix(skin, "#ffffff", 0.3)));
    g.addColorStop(0.6, skin);
    g.addColorStop(1, rgb(mix(skin, "#0a0414", 0.5)));
    ctx.fillStyle = g;
    ctx.fill(bodyP);
    ctx.save();
    ctx.clip(bodyP);
    if (L.extra === "stripes") {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? rgb(paint, 0.85) : "rgba(0,0,0,0)";
        ctx.fillRect(-r * 1.5, r * 0.05 + i * r * 0.18, r * 3, r * 0.18);
      }
    }
    if (L.body === "tv") {
      ctx.fillStyle = "#11161a";
      ctx.fillRect(-r * 0.8, -r * 0.62, r * 1.6, r * 1.14);
      for (let i = 0; i < 70; i++) {
        const v = 40 + Math.random() * 120 | 0;
        ctx.fillStyle = `rgba(${v},${v + 30},${v},0.6)`;
        ctx.fillRect(-r * 0.8 + Math.random() * r * 1.6, -r * 0.62 + Math.random() * r * 1.14, r * 0.25, r * 0.04);
      }
      glow(0, 0, r, paint, 0.25);
    }
    if (L.extra === "mirror") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      const sx = ((t * 0.6) % 2) * r * 3 - r * 2;
      ctx.moveTo(sx, -r * 1.3);
      ctx.lineTo(sx + r * 0.4, -r * 1.3);
      ctx.lineTo(sx - r * 0.4, r * 1.3);
      ctx.lineTo(sx - r * 0.8, r * 1.3);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(10,4,20,0.85)";
    ctx.lineWidth = 2.5;
    ctx.stroke(bodyP);

    // face paint and eyes
    const ex = r * 0.33, ey = faceY;
    const eyeC = L.body === "tv" ? paint : "#140a1e";
    if (L.eyes === "tear") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = rgb(paint, 0.9);
        ctx.beginPath();
        ctx.moveTo(s * ex, ey - r * 0.32);
        ctx.lineTo(s * ex + r * 0.1, ey);
        ctx.lineTo(s * ex, ey + r * 0.32);
        ctx.lineTo(s * ex - r * 0.1, ey);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(s * ex, ey, r * 0.12, r * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = eyeC;
        ctx.beginPath();
        ctx.arc(s * ex, ey, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#8fe9ff";
      const tp = (t * 0.7) % 1;
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.35 + tp * r * 0.5, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (L.eyes === "x") {
      ctx.strokeStyle = eyeC;
      ctx.lineWidth = r * 0.08;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - r * 0.11, ey - r * 0.11);
        ctx.lineTo(s * ex + r * 0.11, ey + r * 0.11);
        ctx.moveTo(s * ex + r * 0.11, ey - r * 0.11);
        ctx.lineTo(s * ex - r * 0.11, ey + r * 0.11);
        ctx.stroke();
      }
    } else if (L.eyes === "hollow") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#0a0414";
        ctx.beginPath();
        ctx.ellipse(s * ex, ey, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        glow(s * ex, ey, r * 0.2, paint, 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s * ex, ey, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (L.eyes === "spiral") {
      ctx.strokeStyle = eyeC;
      ctx.lineWidth = r * 0.04;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const a = k * 0.55 + t * 4 * s, rr = (k / 24) * r * 0.16;
          const px = s * ex + Math.cos(a) * rr, py = ey + Math.sin(a) * rr;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    } else if (L.eyes === "many") {
      const pos = [[-0.4, -0.05], [0.4, -0.05], [0, -0.25], [-0.2, 0.12], [0.22, 0.14]];
      pos.forEach((p, i) => {
        const open = Math.sin(t * 1.7 + i * 1.9) > -0.85;
        ctx.fillStyle = L.body === "tv" ? rgb(paint) : "#fff";
        ctx.beginPath();
        ctx.ellipse(p[0] * r, ey + p[1] * r, r * 0.09, open ? r * 0.09 : r * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
        if (open) {
          ctx.fillStyle = "#140a1e";
          ctx.beginPath();
          ctx.arc(p[0] * r, ey + p[1] * r, r * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    // mouth
    const frown = L.eyes === "tear" || L.eyes === "hollow";
    ctx.fillStyle = rgb(L.body === "tv" ? paint : "#d62839");
    ctx.beginPath();
    if (frown) {
      ctx.moveTo(-r * 0.3, ey + r * 0.48);
      ctx.quadraticCurveTo(0, ey + r * 0.22, r * 0.3, ey + r * 0.48);
      ctx.quadraticCurveTo(0, ey + r * 0.34, -r * 0.3, ey + r * 0.48);
    } else {
      ctx.moveTo(-r * 0.38, ey + r * 0.25);
      ctx.quadraticCurveTo(0, ey + r * 0.72, r * 0.38, ey + r * 0.25);
      ctx.quadraticCurveTo(0, ey + r * 0.45, -r * 0.38, ey + r * 0.25);
    }
    ctx.fill();
    if (!frown) {
      ctx.fillStyle = "#ffffff";
      for (let k = -2; k <= 2; k++) ctx.fillRect(k * r * 0.1 - r * 0.035, ey + r * 0.33, r * 0.07, r * 0.07);
    }
    // a red nose for most of them
    if (!["tv", "balloon"].includes(L.body)) {
      ctx.fillStyle = "#ff3b4a";
      ctx.beginPath();
      ctx.arc(0, ey + r * 0.14, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(-r * 0.03, ey + r * 0.11, r * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    // hats
    const top = { tall: -r * 1.15, round: -r * 0.95, balloon: -r * 1.1, wide: -r * 0.95, blob: -r * 1.05, wisp: -r * 0.88, tv: -r * 0.75 }[L.body];
    if (L.hat === "cone") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, top + r * 0.1);
      ctx.lineTo(r * 0.1, top - r * 1.1);
      ctx.lineTo(r * 0.45, top + r * 0.1);
      ctx.closePath();
      ctx.fillStyle = "#efe6d2";
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = paint;
      for (let i = 0; i < 6; i++) ctx.fillRect(-r, top - r * 1.1 + i * r * 0.24, r * 2, r * 0.12);
      ctx.restore();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.arc(r * 0.1, top - r * 1.12, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    } else if (L.hat === "top") {
      ctx.fillStyle = "#140a1e";
      ctx.fillRect(-r * 0.62, top - r * 0.05, r * 1.24, r * 0.14);
      ctx.fillRect(-r * 0.4, top - r * 0.95, r * 0.8, r * 0.92);
      ctx.fillStyle = paint;
      ctx.fillRect(-r * 0.4, top - r * 0.3, r * 0.8, r * 0.14);
    } else if (L.hat === "horns") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = s < 0 ? paint : "#140a1e";
        ctx.beginPath();
        ctx.moveTo(-r * 0.35 * s * -1, top + r * 0.15);
        ctx.quadraticCurveTo(s * r * 0.4, top - r * 0.9, s * r * 1.0, top - r * 0.95 + Math.sin(t * 3 + s) * r * 0.08);
        ctx.quadraticCurveTo(s * r * 0.5, top - r * 0.3, s * r * 0.45, top + r * 0.2);
        ctx.fill();
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.arc(s * r * 1.0, top - r * 0.95 + Math.sin(t * 3 + s) * r * 0.08, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (L.hat === "crown") {
      ctx.fillStyle = "#e8b923";
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, top + r * 0.1);
      for (let k = 0; k <= 4; k++) {
        ctx.lineTo(-r * 0.6 + k * r * 0.3, top - r * (k % 2 ? 0.25 : 0.6));
      }
      ctx.lineTo(r * 0.6, top + r * 0.1);
      ctx.fill();
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.arc(0, top - r * 0.1, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (L.hat === "halo") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.08;
      ctx.shadowColor = paint;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(0, top - r * 0.35 + Math.sin(t * 2) * r * 0.05, r * 0.55, r * 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (L.hat === "beret") {
      ctx.fillStyle = "#140a1e";
      ctx.beginPath();
      ctx.ellipse(r * 0.1, top + r * 0.02, r * 0.62, r * 0.2, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(r * 0.05, top - r * 0.25, r * 0.06, r * 0.1);
    }

    // things in front
    if (L.extra === "popcorn") {
      for (let k = 0; k < 6; k++) {
        const a = t * 1.5 + k * 1.05;
        const px = Math.cos(a) * r * 1.4, py = Math.sin(a) * r * 0.4 - r * 0.2;
        if (Math.sin(a) < 0) continue;
        ctx.fillStyle = "#fff6d8";
        for (let q = 0; q < 3; q++) {
          ctx.beginPath();
          ctx.arc(px + (q - 1) * r * 0.07, py + (q % 2) * r * 0.05, r * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (L.extra === "arms") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = rgb(mix(skin, "#000", 0.1));
        ctx.beginPath();
        ctx.ellipse(s * r * 1.35, r * 0.05 + Math.sin(t * 2 + s) * r * 0.05, r * 0.35, r * 0.5, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,4,20,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "#140a1e";
      ctx.fillRect(-r * 1.9, r * 0.4, r * 3.8, r * 0.1);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * r * 1.9, r * 0.45, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (L.extra === "tickets") {
      for (let k = 0; k < 4; k++) {
        const a = t * 2 + k * 1.6;
        ctx.save();
        ctx.translate(Math.cos(a) * r * 1.6, -r * 0.4 + Math.sin(a * 1.3) * r * 0.6);
        ctx.rotate(a);
        ctx.fillStyle = "#d62839";
        ctx.fillRect(-r * 0.18, -r * 0.09, r * 0.36, r * 0.18);
        ctx.fillStyle = "#efe6d2";
        ctx.fillRect(-r * 0.12, -r * 0.03, r * 0.24, r * 0.06);
        ctx.restore();
      }
    }
    if (L.extra === "fins") {
      ctx.fillStyle = rgb(mix(skin, "#000", 0.25));
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * r * 1.2, r * 0.4, r * 0.45, r * 0.18, s * (0.6 + Math.sin(t * 4) * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.arc(0, top - r * 1.25 + Math.abs(Math.sin(t * 3)) * -r * 0.3, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (L.extra === "glassballs") {
      for (let k = 0; k < 3; k++) {
        const a = t * 3.2 + k * 2.09;
        const px = Math.cos(a) * r * 0.9, py = -r * 1.6 - Math.abs(Math.sin(a)) * r * 1.0;
        ctx.fillStyle = "rgba(191,243,255,0.45)";
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (L.extra === "glitch") {
      ctx.globalCompositeOperation = "lighter";
      const off = (Math.sin(t * 23) > 0.6 ? 1 : 0.3) * r * 0.08;
      ctx.strokeStyle = "rgba(255,40,80,0.55)";
      ctx.lineWidth = 2;
      ctx.save();
      ctx.translate(off, 0);
      ctx.stroke(bodyP);
      ctx.restore();
      ctx.strokeStyle = "rgba(40,220,255,0.55)";
      ctx.save();
      ctx.translate(-off, 0);
      ctx.stroke(bodyP);
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      if (Math.sin(t * 17) > 0.7) {
        ctx.fillStyle = "rgba(166,217,74,0.5)";
        ctx.fillRect(-r * 1.4, (Math.sin(t * 31) * 0.8) * r, r * 2.8, r * 0.08);
      }
    }
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
  D.garden = function (t, dt, G) {
    drawBg(t);
    constellations(G && G.save && G.save.sky, t);
    const portrait = H > W;
    planet(W * (portrait ? 0.78 : 0.82), H * (portrait ? 0.14 : 0.2), Math.min(W, H) * (portrait ? 0.09 : 0.08), t);
    const I = D.island();
    const tentX = I.cx - I.rx * 0.38, tentY = I.cy - I.ry * 0.55;
    const tw = I.rx * 0.55, th = I.rx * 0.5;
    // tent sits on the back edge, before the island top, so its base is hidden behind the rim
    island(t);
    const peak = tent(tentX, tentY, tw, th, t);
    lights(peak[0], peak[1], I.cx + I.rx * 0.92, I.cy - I.ry * 0.25, I.ry * 0.5, t, 1);
    lights(peak[0], peak[1], I.cx - I.rx * 0.96, I.cy - I.ry * 0.1, I.ry * 0.35, t, 3);
    ring(I, t);
    pond(I, t);
    tv(I.cx - I.rx * 0.7, I.cy + I.ry * 0.28, 14 * U, t);
    const hits = [];
    if (G && G.save) {
      const list = G.save.jinxes.slice().sort((a, b) => a.v - b.v);
      for (const j of list) {
        const [x, y] = D.toScreen(j.u, j.v);
        if (j.stage === "egg") hits.push({ j, ...D.drawEgg(j, x, y, t) });
        else hits.push({ j, ...D.drawJinx(j, x, y, { t, walk: j.moving, dir: j.dir, selected: G.selected === j.id, happy: j.happyT > 0, hop: j.hopT > 0 ? Math.sin((1 - j.hopT) * Math.PI) * 28 * U : 0, spin: j.spinT > 0 ? (1 - j.spinT) * Math.PI * 2 : 0, sleep: j.sleep }) });
      }
    }
    particlesStep(dt);
    return hits;
  };

  D.mapBg = function (t, dt, act) {
    drawBg(t);
    planet(W * 0.15, H * 0.82, Math.min(W, H) * 0.12, t);
    const tint = JG.ACTS[act - 1].tint;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, rgb(tint, 0));
    g.addColorStop(1, rgb(tint, 0.28));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    particlesStep(dt);
  };

  D.stagePos = function () {
    const portrait = H > W;
    return { px: W * (portrait ? 0.27 : 0.3), fx: W * (portrait ? 0.72 : 0.68), feet: H * (portrait ? 0.56 : 0.64), portrait };
  };

  D.stage = function (t, dt, B) {
    drawBg(t);
    const act = B.act;
    const tint = JG.ACTS[act - 1].tint;
    const P = D.stagePos();
    // floor: checker in perspective
    const hz = P.feet - 50 * U;
    ctx.fillStyle = "#120818";
    ctx.fillRect(0, hz, W, H - hz);
    const rows = 9;
    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const y0 = hz + Math.pow(rIdx / rows, 1.8) * (H - hz), y1 = hz + Math.pow((rIdx + 1) / rows, 1.8) * (H - hz);
      const w0 = 0.6 + (rIdx / rows) * 0.9, w1 = 0.6 + ((rIdx + 1) / rows) * 0.9;
      const cols = 14;
      for (let c = 0; c < cols; c++) {
        if ((c + rIdx) % 2) continue;
        const xa0 = W / 2 + ((c / cols) - 0.5) * W * w0 * 1.6, xb0 = W / 2 + (((c + 1) / cols) - 0.5) * W * w0 * 1.6;
        const xa1 = W / 2 + ((c / cols) - 0.5) * W * w1 * 1.6, xb1 = W / 2 + (((c + 1) / cols) - 0.5) * W * w1 * 1.6;
        ctx.fillStyle = `rgba(217,205,180,${0.07 + (rIdx / rows) * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(xa0, y0);
        ctx.lineTo(xb0, y0);
        ctx.lineTo(xb1, y1);
        ctx.lineTo(xa1, y1);
        ctx.fill();
      }
    }
    const fade = ctx.createLinearGradient(0, hz - 30 * U, 0, hz + 60 * U);
    fade.addColorStop(0, "rgba(18,8,24,0)");
    fade.addColorStop(1, "rgba(18,8,24,0.0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, hz - 30 * U, W, 90 * U);
    // spotlights
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ap = (B.applause || 0) / 100;
    const pCol = rgb(mix("#ffe9b0", "#ffd23f", ap));
    for (const [sx, c] of [[P.px, pCol], [P.fx, tint]]) {
      const lg = ctx.createLinearGradient(0, 0, 0, P.feet);
      lg.addColorStop(0, rgb(c, 0.02));
      lg.addColorStop(1, rgb(c, 0.2));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - 20 * U, -10);
      ctx.lineTo(sx + 20 * U, -10);
      ctx.lineTo(sx + 95 * U, P.feet);
      ctx.lineTo(sx - 95 * U, P.feet);
      ctx.fill();
      ctx.fillStyle = rgb(c, 0.18);
      ctx.beginPath();
      ctx.ellipse(sx, P.feet, 95 * U, 22 * U, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // curtains
    const cw = W * (P.portrait ? 0.08 : 0.12);
    for (const side of [0, 1]) {
      const x0 = side ? W - cw : 0;
      for (let i = 0; i < 6; i++) {
        const k = i / 6;
        const g = ctx.createLinearGradient(x0 + k * cw, 0, x0 + (k + 1 / 6) * cw, 0);
        g.addColorStop(0, "#3a0714");
        g.addColorStop(0.5, "#8c1a2e");
        g.addColorStop(1, "#3a0714");
        ctx.fillStyle = g;
        ctx.fillRect(x0 + k * cw, 0, cw / 6 + 1, H);
      }
    }
    // valance
    ctx.fillStyle = "#6a0f22";
    ctx.fillRect(0, 0, W, 26 * U);
    for (let i = 0; i < Math.ceil(W / (40 * U)); i++) {
      ctx.fillStyle = "#6a0f22";
      ctx.beginPath();
      ctx.arc(i * 40 * U + 20 * U, 26 * U, 20 * U, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#c9a227";
      ctx.beginPath();
      ctx.arc(i * 40 * U + 20 * U, 46 * U, 3 * U, 0, Math.PI * 2);
      ctx.fill();
    }
    // fighters
    const lungeK = (t0, dur) => {
      if (!t0) return 0;
      const k = (t - t0) / dur;
      return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
    };
    const shake = (t0) => (t0 && t - t0 < 0.3 ? Math.sin((t - t0) * 80) * 6 * U * (1 - (t - t0) / 0.3) : 0);
    const pl = lungeK(B.anim.pLunge, 0.35) * W * 0.12;
    const fl = lungeK(B.anim.fLunge, 0.35) * W * 0.12;
    const pr = B.jinx ? D.drawJinx(B.jinx, P.px + pl + shake(B.anim.pHurt), P.feet, { t, dir: 1, scale: 1.55, happy: B.over === "win", walk: pl > 0, sleep: B.over === "lose" }) : null;
    let fr = null;
    if (B.foe && !(B.over === "win" && t - B.anim.fDie > 0.8)) {
      ctx.save();
      if (B.over === "win") ctx.globalAlpha = Math.max(0, 1 - (t - B.anim.fDie) / 0.8);
      fr = D.drawFoe(B.foe, P.fx - fl + shake(B.anim.fHurt), P.feet, t, { hurt: B.anim.fHurt && t - B.anim.fHurt < 0.12 });
      ctx.restore();
    }
    B.screen = { p: pr, f: fr };
    if (ap >= 0.6 && Math.random() < dt * (ap - 0.5) * 30) {
      D.particles.push({ x: Math.random() * W, y: -10, vx: 0, vy: 20 * U, life: 1, kind: "confetti", color: ["#ff4fa3", "#ffd23f", "#8fe9ff", "#a6d94a"][(Math.random() * 4) | 0], s: (3 + Math.random() * 3) * U, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10 });
    }
    particlesStep(dt);
    if (B.anim.show && t - B.anim.show < 0.7) {
      const k = 1 - (t - B.anim.show) / 0.7;
      ctx.fillStyle = `rgba(255,230,140,${0.45 * k})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (B.anim.heckle && t - B.anim.heckle < 0.5) {
      const k = 1 - (t - B.anim.heckle) / 0.5;
      ctx.fillStyle = `rgba(60,30,90,${0.35 * k})`;
      ctx.fillRect(0, 0, W, H);
    }
  };

  D.clear = function () {
    D.particles.length = 0;
    D.floats.length = 0;
  };
})();
