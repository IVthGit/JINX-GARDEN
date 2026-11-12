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
    const a = j.align || 0, m = j.moon || 0;
    const adult = j.stage === "adult", mid = Math.abs(a) <= 0.33;
    const form = adult ? (a > 0.33 ? "ether" : a < -0.33 ? "grunge" : m >= 0.33 ? "pierrot" : "neutral") : "child";
    let body = hsl(j.hue, 72, 70);
    if (a > 0) body = mix(body, "#efeaff", Math.min(0.72, a * (adult ? 1.0 : 0.8)));
    if (a < 0) body = mix(body, "#56604a", Math.min(1, -a * (adult ? 1.1 : 0.75)));
    if (mid && m > 0) body = mix(body, "#fbf8f2", Math.min(0.86, m * (adult ? 1.7 : 1.0)));
    let hat = ["#d62839", "#1b1726"], bell = "#ffd23f";
    if (form === "ether" || (!adult && a > 0.33)) { hat = ["#c9b8ff", "#8fe9ff"]; bell = "#f4f0ff"; }
    if (form === "grunge" || (!adult && a < -0.33)) { hat = ["#2a2632", "#7fae3a"]; bell = "#b9b2a6"; }
    if (form === "pierrot" || (!adult && mid && m >= 0.33)) { hat = ["#fbf8f2", "#e9e4f0"]; bell = "#1b1726"; }
    let best = "juggle", bv = -1;
    for (const s of JG.STATS) if (j.stats[s].lv > bv) { bv = j.stats[s].lv; best = s; }
    return { form, body, hat, bell, best, adult };
  };

  // A Jinx: a big head on a small body, with arms, legs and a tail. The "hat" is part of it:
  // soft lappets that grow from the head and end in bells. Drawn like an inked cartoon,
  // with a wobbling line and a lit side. Each grown-up form has its own silhouette.
  const hashN = (n) => { const v = Math.sin(n * 127.1 + 1.3) * 43758.5453; return v - Math.floor(v); };
  D.drawJinx = function (j, x, y, o) {
    o = o || {};
    const t = o.t || 0, L = D.jinxLook(j), sd = j.seed || 0, A = L.adult, form = L.form, best = A ? L.best : null;
    const s = (A ? 1 : 0.88) * (o.scale || 1), R = 20 * U * s;
    const walk = !!o.walk, dir = o.dir || 1, hop = o.hop || 0, sit = !!o.sleep;
    const ph = t * 9 + sd, beat = Math.sin((t * Math.PI * 2) / 0.6 + sd);
    const ink = form === "grunge" ? "#0b0810" : "#1b1029", lw = Math.max(1.4, R * 0.085);
    const ft8 = t * 5, frame = Math.floor(ft8), fk = ft8 - frame, fs = fk * fk * (3 - 2 * fk);
    const wb = (i) => ((hashN(i + sd * 10 + frame * 13.1) - 0.5) * (1 - fs) + (hashN(i + sd * 10 + (frame + 1) * 13.1) - 0.5) * fs) * R * 0.035;
    const pier = form === "pierrot";
    const mood = j.mood === undefined ? 60 : j.mood, sad = mood < 30 && !o.happy;
    const skin = L.body, skinD = rgb(mix(skin, "#2a1050", 0.28)), skinL = rgb(mix(skin, "#ffffff", 0.35));

    // proportions
    const hover = form === "ether" && !sit ? R * (0.34 + 0.08 * Math.sin(t * 2 + sd)) : 0;
    const legH = sit ? R * 0.06 : R * (A ? (best === "tumble" ? 0.82 : 0.5) : 0.32);
    const bodyH = R * (A ? 1.0 : 0.78), hipW = R * (best === "grit" ? 1.0 : A ? 0.8 : 0.74), neckW = R * (best === "grit" ? 0.72 : 0.46);
    const pulse = (0.5 + 0.5 * beat) * (0.5 + 0.5 * beat);
    const bounce = walk ? Math.abs(Math.sin(ph)) * R * 0.22 : sit ? 0 : pulse * R * 0.07;
    const lift = bounce + hop + hover;
    const hipY = -legH, neckY = hipY - bodyH;
    const hRx = R * 1.05, hRy = R * 0.86, hCy = neckY - hRy * 0.72, topY = hCy - hRy * 0.8;
    const headTilt = o.hurt ? -0.22 : sit ? 0.18 : walk ? Math.sin(ph) * 0.05 : Math.sin((t * Math.PI) / 0.6 + sd) * 0.06;
    const lean = o.hurt ? -0.16 : walk ? 0.07 : 0;
    const squash = o.hurt ? 0.1 : walk ? Math.cos(ph * 2) * 0.04 : sit ? 0 : -beat * 0.02;

    // shadow
    const sh = ctx.createRadialGradient(x, y, 0, x, y, R * 1.5);
    sh.addColorStop(0, "rgba(5,2,12,0.55)");
    sh.addColorStop(1, "rgba(5,2,12,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.max(0.5, 1 - lift / (R * 5)), 0.24);
    ctx.translate(-x, -y);
    ctx.fillStyle = sh;
    ctx.fillRect(x - R * 1.6, y - R * 1.6, R * 3.2, R * 3.2);
    ctx.restore();
    if (o.selected) {
      ctx.save();
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 1.9, R * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y - lift);
    if (o.spin) { ctx.translate(0, neckY); ctx.rotate(o.spin); ctx.translate(0, -neckY); }
    ctx.rotate(lean);
    const tw = o.twirl ? Math.cos(o.twirl) : 1;
    const fdir = Math.abs(dir) < 0.14 ? 0.14 * (dir < 0 ? -1 : 1) : dir;
    ctx.scale((1 + squash) * fdir * (Math.abs(tw) < 0.12 ? 0.12 * (tw < 0 ? -1 : 1) : tw), 1 - squash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const seg = (pts, w, fill) => {
      for (const [width, col] of [[w + lw * 2, ink], [w, fill]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = width;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      }
    };
    const paint = (p, fill, w) => { ctx.fillStyle = fill; ctx.fill(p); ctx.strokeStyle = ink; ctx.lineWidth = w || lw; ctx.stroke(p); };
    const shade = (p, cx, cy, rr, k) => {
      ctx.save();
      ctx.clip(p);
      ctx.fillStyle = `rgba(27,10,50,${k || 0.2})`;
      ctx.beginPath();
      ctx.rect(-R * 4, -R * 6, R * 8, R * 8);
      ctx.arc(cx, cy, rr, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.strokeStyle = form === "ether" ? "rgba(200,245,255,0.45)" : "rgba(255,255,255,0.2)";
      ctx.lineWidth = R * 0.13;
      ctx.stroke(p);
      ctx.restore();
    };

    if (form === "ether") glow(0, neckY, R * 3.2, "#8fe9ff", 0.18 + 0.06 * Math.sin(t * 3));
    if (pier) glow(0, hCy, R * 3, "#cfe3ff", 0.13 + 0.04 * Math.sin(t * 1.5));
    if (form === "grunge") {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.35 + i / 3 + sd) % 1;
        ctx.fillStyle = `rgba(166,217,74,${0.16 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(Math.sin(i * 4 + t) * R, hCy - k * R * 1.8, R * (0.2 + k * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- tail ----
    const wag = Math.sin(t * 3 + sd) * 0.25 + (walk ? Math.sin(ph) * 0.3 : 0);
    const tb = [-hipW * 0.4, hipY - bodyH * 0.2];
    if (form === "ether") {
      for (let k = 1; k <= 6; k++) {
        const px = tb[0] - k * R * 0.26, py = tb[1] + Math.sin(t * 3 + k) * R * 0.1 + k * R * 0.05, a = 1 - k / 7;
        glow(px, py, R * 0.4 * a, "#8fe9ff", 0.5 * a);
        sparkle(px, py, R * 0.1 * a, `rgba(255,255,255,${a})`);
      }
    } else {
      const pts = [];
      if (form === "grunge") {
        for (let k = 0; k <= 8; k++) { const kk = k / 8; pts.push([tb[0] - kk * R * 0.95, tb[1] + kk * kk * (-tb[1] - R * 0.12) + Math.sin(kk * 3 + wag * 2) * R * 0.05]); }
      } else if (pier) {
        for (let k = 0; k <= 8; k++) { const kk = k / 8; pts.push([tb[0] - kk * R * 0.8, tb[1] - Math.sin(kk * 2.6) * R * 0.5 + wag * kk * R * 0.25]); }
      } else if (form === "neutral") {
        const cx0 = tb[0] - R * 0.55, cy0 = tb[1] - R * 0.25;
        for (let k = 0; k <= 12; k++) { const kk = k / 12, a = 0.38 + kk * Math.PI * 1.7 + wag * kk, rr = R * (0.55 - 0.36 * kk); pts.push([cx0 + Math.cos(a) * rr, cy0 + Math.sin(a) * rr]); }
      } else {
        for (let k = 0; k <= 5; k++) { const kk = k / 5; pts.push([tb[0] - kk * R * 0.55, tb[1] - Math.sin(kk * 1.5) * R * 0.35 + wag * kk * R * 0.3]); }
      }
      seg(pts, R * (pier ? 0.09 : 0.15), pier ? "#1b1726" : skinD);
      const e = pts[pts.length - 1];
      if (pier) {
        const d = new Path2D();
        d.arc(e[0], e[1], R * 0.2, 0.5, Math.PI * 2 - 0.9);
        d.arc(e[0] + R * 0.09, e[1] - R * 0.05, R * 0.15, Math.PI * 2 - 1.2, 0.7, true);
        d.closePath();
        paint(d, "#ffe680", lw * 0.7);
      } else if (form === "neutral") {
        const d = new Path2D();
        d.moveTo(e[0], e[1] - R * 0.2); d.lineTo(e[0] + R * 0.13, e[1]); d.lineTo(e[0], e[1] + R * 0.2); d.lineTo(e[0] - R * 0.13, e[1]); d.closePath();
        paint(d, "#d62839", lw * 0.8);
      } else if (form === "grunge") {
        const d = new Path2D();
        d.arc(e[0], e[1], R * 0.17, 0, Math.PI * 2);
        paint(d, rgb(mix(skin, "#a6d94a", 0.5)), lw * 0.8);
      } else {
        const d = new Path2D();
        d.arc(e[0], e[1], R * 0.13, 0, Math.PI * 2);
        paint(d, L.bell, lw * 0.8);
      }
    }

    // ---- arms (the far one goes behind the body) ----
    const aL = R * (best === "juggle" ? 0.82 : form === "pierrot" ? 0.74 : 0.6);
    const armA = (side) => (o.hurt ? 1.5 : o.happy ? 2.6 + Math.sin(t * 14 + side) * 0.25 : sit ? 0.12 : walk ? 0.3 + Math.sin(ph) * 0.7 * side : 0.38 + Math.sin(t * 2 + sd + side) * 0.1);
    const arm = (side) => {
      const a = armA(side), sx = side * neckW * 0.55, sy = neckY + R * 0.22;
      const hx = sx + side * Math.sin(a) * aL, hy = sy + Math.cos(a) * aL;
      seg([[sx, sy], [(sx + hx) / 2 + side * R * 0.08, (sy + hy) / 2], [hx, hy]], R * (pier ? 0.26 : 0.2), pier ? (side < 0 ? "#dcd8e8" : "#fbf8f2") : side < 0 ? skinD : rgb(skin));
      const hand = new Path2D();
      if (pier) {
        const ang = Math.atan2(hy - sy, hx - sx);
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(ang);
        hand.moveTo(-R * 0.12, -R * 0.16); hand.lineTo(R * 0.24, -R * 0.3); hand.quadraticCurveTo(R * 0.32, 0, R * 0.24, R * 0.3); hand.lineTo(-R * 0.12, R * 0.16); hand.closePath();
        paint(hand, side < 0 ? "#dcd8e8" : "#fbf8f2", lw * 0.8);
        ctx.fillStyle = "rgba(27,16,41,0.35)";
        ctx.beginPath(); ctx.ellipse(R * 0.24, 0, R * 0.05, R * 0.24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (best === "juggle") {
        hand.arc(hx, hy, R * 0.25, 0, Math.PI * 2);
        paint(hand, "#fbf8f2", lw * 0.8);
        ctx.strokeStyle = ink;
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.moveTo(hx - R * 0.08, hy - R * 0.2); ctx.lineTo(hx - R * 0.08, hy - R * 0.02); ctx.moveTo(hx + R * 0.06, hy - R * 0.22); ctx.lineTo(hx + R * 0.06, hy - R * 0.04); ctx.stroke();
      } else {
        hand.arc(hx, hy, R * 0.17, 0, Math.PI * 2);
        paint(hand, side < 0 ? skinD : skinL, lw * 0.8);
      }
      if (best === "grit") {
        ctx.fillStyle = "#16101c";
        ctx.beginPath(); ctx.arc((sx + hx * 2) / 3, (sy + hy * 2) / 3, R * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#d9d2e6";
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc((sx + hx * 2) / 3 + (k - 1) * R * 0.09, (sy + hy * 2) / 3, R * 0.035, 0, Math.PI * 2); ctx.fill(); }
      }
    };
    arm(-1);

    // ---- legs and feet: curled toes, like jester shoes that grew there ----
    const step = walk ? Math.sin(ph) : 0;
    for (const side of [-1, 1]) {
      const hx = side * hipW * 0.24;
      let fx = hx + (walk ? side * step * R * 0.3 : 0) + R * 0.05, fy = walk && side * step > 0 ? -Math.abs(step) * R * 0.18 : 0;
      if (sit) { fx = hx + R * 0.5; fy = 0; }
      if (hover) { fx = hx - R * 0.12 + Math.sin(t * 2 + side) * R * 0.04; fy = -R * 0.02; }
      seg([[hx, hipY - R * 0.05], [(hx + fx) / 2, (hipY + fy) / 2 - R * 0.05], [fx, fy - R * 0.14]], R * (pier ? 0.3 : 0.24), pier ? (side < 0 ? "#dcd8e8" : "#fbf8f2") : side < 0 ? skinD : rgb(skin));
      if (best === "tumble") {
        ctx.strokeStyle = "#fbf8f2";
        ctx.lineWidth = R * 0.07;
        for (let k = 1; k <= 3; k++) {
          const kk = k / 4, px = hx + (fx - hx) * kk, py = hipY + (fy - R * 0.14 - hipY) * kk;
          ctx.beginPath(); ctx.moveTo(px - R * 0.1, py); ctx.lineTo(px + R * 0.1, py); ctx.stroke();
        }
      }
      const boot = new Path2D(), bs = best === "tumble" ? 1.2 : 1;
      boot.moveTo(fx - R * 0.22 * bs, fy - R * 0.2);
      boot.quadraticCurveTo(fx - R * 0.3 * bs, fy, fx - R * 0.05, fy);
      boot.lineTo(fx + R * 0.3 * bs, fy);
      boot.quadraticCurveTo(fx + R * 0.58 * bs, fy - R * 0.02, fx + R * 0.56 * bs, fy - R * 0.26);
      boot.quadraticCurveTo(fx + R * 0.5 * bs, fy - R * 0.38, fx + R * 0.4 * bs, fy - R * 0.27);
      boot.quadraticCurveTo(fx + R * 0.38 * bs, fy - R * 0.12, fx + R * 0.18, fy - R * 0.2);
      boot.quadraticCurveTo(fx, fy - R * 0.32, fx - R * 0.22 * bs, fy - R * 0.2);
      paint(boot, pier ? "#1b1726" : side < 0 ? L.hat[0] : L.hat[1]);
      if (pier) {
        const pm = new Path2D();
        pm.arc(fx + R * 0.14, fy - R * 0.2, R * 0.09, 0, Math.PI * 2);
        paint(pm, "#fbf8f2", lw * 0.6);
      } else if (A && form !== "ether") {
        const bl = new Path2D();
        bl.arc(fx + R * 0.44 * bs, fy - R * 0.34, R * 0.08, 0, Math.PI * 2);
        paint(bl, L.bell, lw * 0.6);
      }
    }

    // ---- body ----
    const body = new Path2D();
    body.moveTo(-neckW / 2 + wb(1), neckY);
    body.bezierCurveTo(-hipW * 0.62, neckY + bodyH * 0.35, -hipW * 0.68 + wb(2), hipY - bodyH * 0.05, -hipW * 0.3, hipY + R * 0.06);
    body.quadraticCurveTo(0, hipY + R * 0.16, hipW * 0.3, hipY + R * 0.06);
    body.bezierCurveTo(hipW * 0.68 + wb(3), hipY - bodyH * 0.05, hipW * 0.62, neckY + bodyH * 0.35, neckW / 2 + wb(4), neckY);
    body.closePath();
    const bgr = ctx.createLinearGradient(0, neckY, 0, hipY);
    bgr.addColorStop(0, pier ? "#ffffff" : rgb(skin));
    bgr.addColorStop(1, pier ? "#d9d5ea" : rgb(mix(skin, "#2a1050", 0.16)));
    ctx.fillStyle = bgr;
    if (form === "ether") ctx.globalAlpha = 0.92;
    ctx.fill(body);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.clip(body);
    const by0 = neckY, bh0 = bodyH;
    if (form === "ether") {
      ctx.globalCompositeOperation = "lighter";
      glow(-R * 0.2, by0 + bh0 * 0.4, R * 0.7, "#ff5fa8", 0.3);
      glow(R * 0.25, by0 + bh0 * 0.7, R * 0.7, "#8a3dff", 0.3);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 7; i++) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7));
        sparkle((hashN(i + sd) - 0.5) * hipW, by0 + hashN(i + sd + 20) * bh0, R * 0.035 * (1 + a), `rgba(255,255,255,${a})`);
      }
    } else if (form === "grunge") {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(13,10,18,0.26)";
        ctx.fillRect(-R, by0 + i * bh0 * 0.22, R * 2, bh0 * 0.09);
        ctx.fillRect(-R * 0.8 + i * R * 0.4, by0, R * 0.1, bh0 * 1.2);
        ctx.fillStyle = "rgba(182,255,92,0.3)";
        ctx.fillRect(-R, by0 + i * bh0 * 0.22 + bh0 * 0.12, R * 2, bh0 * 0.025);
      }
      ctx.save();
      ctx.translate(-hipW * 0.22, by0 + bh0 * 0.68);
      ctx.rotate(-0.25);
      ctx.fillStyle = rgb(mix(skin, "#d62839", 0.6));
      ctx.fillRect(-R * 0.15, -R * 0.13, R * 0.3, R * 0.26);
      ctx.strokeStyle = "#e6e0d6";
      ctx.lineWidth = Math.max(1, R * 0.03);
      ctx.setLineDash([R * 0.06, R * 0.05]);
      ctx.strokeRect(-R * 0.15, -R * 0.13, R * 0.3, R * 0.26);
      ctx.restore();
    } else if (pier) {
      ctx.strokeStyle = "rgba(27,16,41,0.18)";
      ctx.lineWidth = Math.max(1, R * 0.03);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * R * 0.16, by0); ctx.quadraticCurveTo(i * R * 0.3, by0 + bh0 * 0.5, i * R * 0.24, by0 + bh0 * 1.1); ctx.stroke(); }
    } else if (form === "neutral") {
      ctx.fillStyle = "rgba(214,40,57,0.55)";
      ctx.fillRect(-R * 1.2, by0, R * 1.2, bh0 * 1.3);
      ctx.fillStyle = "rgba(27,23,38,0.6)";
      ctx.fillRect(0, by0, R * 1.2, bh0 * 1.3);
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = i % 2 ? "#1b1726" : "#d62839";
        ctx.strokeStyle = "rgba(255,210,63,0.85)";
        ctx.lineWidth = Math.max(0.8, R * 0.025);
        const dx = i * R * 0.3, dy = hipY - bh0 * 0.2;
        ctx.beginPath();
        ctx.moveTo(dx, dy - R * 0.2); ctx.lineTo(dx + R * 0.15, dy); ctx.lineTo(dx, dy + R * 0.2); ctx.lineTo(dx - R * 0.15, dy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.ellipse(R * 0.08, hipY - bh0 * 0.38, hipW * 0.36, bh0 * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    shade(body, -R * 0.25, neckY + bodyH * 0.3, R * 0.95);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke(body);
    if (pier) {
      for (let i = 0; i < 3; i++) {
        const pm = new Path2D();
        pm.arc(R * 0.07, neckY + bodyH * (0.36 + i * 0.25), R * 0.115, 0, Math.PI * 2);
        paint(pm, "#1b1726", lw * 0.5);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.arc(R * 0.04, neckY + bodyH * (0.36 + i * 0.25) - R * 0.04, R * 0.035, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (best === "glow") {
      glow(R * 0.05, neckY + bodyH * 0.5, R * 0.6, "#8fe9ff", 0.7);
      const gem = new Path2D();
      gem.moveTo(R * 0.05, neckY + bodyH * 0.34); gem.lineTo(R * 0.19, neckY + bodyH * 0.5); gem.lineTo(R * 0.05, neckY + bodyH * 0.68); gem.lineTo(-R * 0.09, neckY + bodyH * 0.5); gem.closePath();
      paint(gem, "#dff8ff", lw * 0.7);
    }
    if (form === "grunge" || (!A && (j.align || 0) < -0.5)) {
      ctx.fillStyle = rgb(mix(skin, "#a6d94a", 0.45));
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 0.7;
      for (let i = 0; i < 2; i++) {
        const dx = (i - 0.5) * hipW * 0.5, len = R * (0.14 + 0.14 * Math.abs(Math.sin(t * 1.3 + i * 2)));
        ctx.beginPath();
        ctx.moveTo(dx - R * 0.08, hipY + R * 0.05);
        ctx.quadraticCurveTo(dx, hipY + R * 0.05 + len * 2, dx + R * 0.08, hipY + R * 0.05);
        ctx.fill();
        ctx.stroke();
      }
    }
    arm(1);

    // ---- head, with everything that grows from it ----
    ctx.save();
    ctx.translate(0, neckY);
    ctx.rotate(headTilt);
    ctx.translate(0, -neckY);

    // the ruff sits behind the chin
    const ruffY = neckY + R * 0.02;
    if (best === "grit") {
      const band = new Path2D();
      band.roundRect(-neckW * 0.75, ruffY - R * 0.02, neckW * 1.5, R * 0.2, R * 0.08);
      paint(band, "#16101c");
      for (let i = 0; i < 5; i++) {
        const sp = new Path2D(), xx = (i - 2) * neckW * 0.33;
        sp.moveTo(xx - R * 0.09, ruffY + R * 0.14); sp.lineTo(xx, ruffY + R * 0.42); sp.lineTo(xx + R * 0.09, ruffY + R * 0.14); sp.closePath();
        paint(sp, "#d9d2e6", lw * 0.6);
      }
    } else {
      const rows = pier ? 3 : A ? 2 : 1;
      for (let row = rows - 1; row >= 0; row--) {
        const n = row === 2 ? 8 : row ? 7 : 6, w = R * (row === 2 ? 0.33 : row ? 0.3 : 0.26) * (pier ? 1.08 : 1), span = (n - 1) * w;
        for (let i = 0; i < n; i++) {
          const xx = i * w - span / 2, k = xx / (span / 2 + 0.001);
          const yy = ruffY + R * (row === 2 ? 0.32 : row ? 0.2 : 0.08) - k * k * R * 0.14;
          const pt = new Path2D();
          if (form === "grunge") {
            const len = R * (0.2 + hashN(i + row * 9 + sd) * 0.22);
            pt.moveTo(xx - w * 0.55, yy); pt.lineTo(xx + w * 0.55, yy); pt.lineTo(xx + w * 0.1, yy + len); pt.closePath();
          } else {
            pt.arc(xx, yy, w * 0.58, 0, Math.PI);
            pt.closePath();
          }
          paint(pt, pier ? (row === 1 ? "#e4e0f0" : "#ffffff") : row ? L.hat[i % 2] : rgb(mix(L.hat[(i + 1) % 2], "#ffffff", 0.4)), lw * 0.7);
        }
      }
    }

    // lappets: tapered ribbons that follow a curve
    const jig = Math.sin(t * 2.6 + sd) * R * 0.08 + (walk ? Math.sin(ph - 0.8) * R * 0.14 : beat * R * 0.05) + (o.hurt ? R * 0.25 : 0);
    const lappet = (bx, by, cx1, cy1, tx, ty, w0, w1, col, k, tip, studs) => {
      const Lp = [], Rp = [], mid = [];
      for (let q = 0; q <= 9; q++) {
        const u = q / 9, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c2 = u * u;
        const px = a * bx + b * cx1 + c2 * tx, py = a * by + b * cy1 + c2 * ty;
        const dx = 2 * (1 - u) * (cx1 - bx) + 2 * u * (tx - cx1), dy = 2 * (1 - u) * (cy1 - by) + 2 * u * (ty - cy1), dl = Math.hypot(dx, dy) || 1;
        const w = (w0 + (w1 - w0) * u) / 2 + (q ? wb(40 + k * 7 + q) * 0.5 : 0);
        Lp.push([px - (dy / dl) * w, py + (dx / dl) * w]);
        Rp.push([px + (dy / dl) * w, py - (dx / dl) * w]);
        mid.push([px, py, -dy / dl, dx / dl, w]);
      }
      const p = new Path2D();
      Lp.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
      Rp.reverse().forEach((q) => p.lineTo(q[0], q[1]));
      p.closePath();
      ctx.fillStyle = col;
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      if (form === "grunge") {
        ctx.strokeStyle = "rgba(182,255,92,0.35)";
        ctx.lineWidth = R * 0.035;
        for (let q = -8; q < 10; q++) { ctx.beginPath(); ctx.moveTo(q * R * 0.3, hCy - R * 3); ctx.lineTo(q * R * 0.3 + R * 0.8, hCy + R * 1.5); ctx.stroke(); }
      } else if (form === "ether") {
        mid.forEach((m, i) => { if (i % 2) sparkle(m[0], m[1], R * 0.04, "rgba(255,255,255,0.95)"); });
      } else if (pier) {
        /* plain white */
      } else {
        mid.forEach((m, i) => {
          if (i % 2 === 0 || i > 7) return;
          ctx.fillStyle = k % 2 ? "#d62839" : "#ffd23f";
          ctx.beginPath(); ctx.moveTo(m[0], m[1] - R * 0.1); ctx.lineTo(m[0] + R * 0.07, m[1]); ctx.lineTo(m[0], m[1] + R * 0.1); ctx.lineTo(m[0] - R * 0.07, m[1]); ctx.fill();
        });
      }
      // darker along one edge
      ctx.strokeStyle = "rgba(20,8,40,0.3)";
      ctx.lineWidth = w0 * 0.5;
      ctx.beginPath();
      Lp.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.stroke(p);
      if (studs) {
        for (const q of [3, 5, 7]) {
          const m = mid[q], sp = new Path2D();
          sp.moveTo(m[0] - m[2] * m[4] - m[3] * R * 0.08, m[1] - m[3] * m[4] + m[2] * R * 0.08);
          sp.lineTo(m[0] - m[2] * (m[4] + R * 0.24), m[1] - m[3] * (m[4] + R * 0.24));
          sp.lineTo(m[0] - m[2] * m[4] + m[3] * R * 0.08, m[1] - m[3] * m[4] - m[2] * R * 0.08);
          sp.closePath();
          paint(sp, "#d9d2e6", lw * 0.6);
        }
      }
      // what hangs on the end
      if (tip === "star") {
        glow(tx, ty, R * 0.6, "#8fe9ff", 0.7);
        sparkle(tx, ty, R * 0.13, "#ffffff");
      } else if (tip === "orb") {
        glow(tx, ty, R * 1.1, "#8fe9ff", 0.75);
        const ob = new Path2D();
        ob.arc(tx, ty, R * 0.2, 0, Math.PI * 2);
        paint(ob, "#eafcff", lw * 0.7);
        sparkle(tx, ty, R * 0.09, "#ffffff");
      } else if (tip !== "none") {
        let by2 = ty;
        if (tip === "rust") {
          by2 = ty + R * 0.22;
          ctx.strokeStyle = ink;
          ctx.lineWidth = lw * 0.5;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, by2); ctx.stroke();
        }
        const bl = new Path2D(), br = R * (tip === "pom" ? 0.14 : 0.18);
        bl.arc(tx, by2, br, 0, Math.PI * 2);
        paint(bl, L.bell, lw * 0.8);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.beginPath(); ctx.arc(tx - br * 0.35, by2 - br * 0.35, br * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink;
        ctx.fillRect(tx - br * 0.55, by2 + br * 0.2, br * 1.1, br * 0.2);
      }
    };
    const orb = best === "glow";
    const studs = best === "grit";
    if (form === "ether") {
      for (let i = 0; i < 3; i++) {
        const bx = (i - 1) * hRx * 0.42, wv = Math.sin(t * 1.8 + i * 1.4 + sd) * R * 0.18;
        lappet(bx, topY + R * 0.1, bx - R * 0.15, topY - R * (1.0 + i * 0.1), bx - R * (0.95 + i * 0.3) + wv, topY - R * (1.45 - i * 0.4) + wv * 0.6 + jig * 0.3,
          R * 0.38, R * 0.07, L.hat[i % 2], i, orb && i === 1 ? "orb" : "star", studs);
      }
    } else if (form === "grunge") {
      lappet(0, topY + R * 0.05, R * 0.1, topY - R * 0.45, R * 0.34, topY - R * 0.6, R * 0.42, R * 0.24, L.hat[0], 2, orb ? "orb" : "none", false);
      for (const side of [-1, 1]) {
        lappet(side * hRx * 0.55, topY + R * 0.15, side * hRx * 1.4, topY - R * 0.4, side * hRx * 1.22 + jig * 0.4, hCy + hRy * 0.7 + Math.abs(jig) * 0.5,
          R * 0.62, R * 0.24, L.hat[side < 0 ? 0 : 1], side < 0 ? 0 : 1, "rust", studs);
      }
    } else if (pier) {
      for (const side of [-1, 1]) {
        lappet(side * hRx * 0.6, topY + R * 0.2, side * hRx * 1.45, topY - R * 0.2, side * hRx * 1.3 + jig * 0.5, hCy + hRy * 1.25 + Math.abs(jig) * 0.5,
          R * 0.5, R * 0.2, L.hat[side < 0 ? 1 : 0], side < 0 ? 0 : 1, "pom", studs);
      }
    } else if (A) {
      for (const side of [-1, 1]) {
        lappet(side * hRx * 0.5, topY + R * 0.12, side * hRx * 0.95, topY - R * 1.2, side * hRx * 1.55, topY - R * 0.4 + jig * side,
          R * 0.58, R * 0.15, L.hat[side < 0 ? 0 : 1], side < 0 ? 0 : 1, "bell", studs);
      }
      lappet(0, topY + R * 0.05, R * 0.3, topY - R * 0.85, -R * 0.08 + jig, topY - R * 1.55, R * 0.5, R * 0.13, L.hat[0], 2, orb ? "orb" : "bell", false);
    } else {
      for (const side of [-1, 1]) {
        lappet(side * hRx * 0.45, topY + R * 0.12, side * hRx * 0.85, topY - R * 0.8, side * hRx * 1.3 + jig * 0.4, topY + R * 0.05 + jig * side,
          R * 0.5, R * 0.16, L.hat[side < 0 ? 0 : 1], side < 0 ? 0 : 1, "pom", false);
      }
    }

    // the head itself: wide at the cheeks
    const head = new Path2D();
    const hx = (v, i) => v * hRx + wb(20 + i), hy = (v, i) => hCy + v * hRy + wb(30 + i);
    head.moveTo(hx(0, 0), hy(-1, 0));
    head.bezierCurveTo(hx(0.75, 1), hy(-1.02, 1), hx(1.08, 2), hy(-0.25, 2), hx(1.0, 3), hy(0.25, 3));
    head.bezierCurveTo(hx(0.92, 4), hy(0.85, 4), hx(0.4, 5), hy(1.02, 5), hx(0, 6), hy(1.0, 6));
    head.bezierCurveTo(hx(-0.4, 7), hy(1.02, 7), hx(-0.92, 8), hy(0.85, 8), hx(-1.0, 9), hy(0.25, 9));
    head.bezierCurveTo(hx(-1.08, 10), hy(-0.25, 10), hx(-0.75, 11), hy(-1.02, 11), hx(0, 0), hy(-1, 0));
    const hg = ctx.createRadialGradient(-hRx * 0.3, hCy - hRy * 0.4, R * 0.1, 0, hCy, hRx * 1.3);
    hg.addColorStop(0, skinL);
    hg.addColorStop(0.6, rgb(skin));
    hg.addColorStop(1, rgb(mix(skin, "#2a1050", 0.25)));
    ctx.fillStyle = hg;
    if (form === "ether") ctx.globalAlpha = 0.94;
    ctx.fill(head);
    ctx.globalAlpha = 1;
    if (form === "ether") {
      ctx.save();
      ctx.clip(head);
      ctx.globalCompositeOperation = "lighter";
      glow(hRx * 0.4, hCy + hRy * 0.5, R * 0.9, "#8a3dff", 0.22);
      glow(-hRx * 0.5, hCy + hRy * 0.3, R * 0.8, "#ff5fa8", 0.18);
      ctx.restore();
    }
    shade(head, -hRx * 0.25, hCy - hRy * 0.3, hRx * 1.12);
    ctx.save();
    ctx.clip(head);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.ellipse(-hRx * 0.5, hCy - hRy * 0.55, R * 0.26, R * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke(head);

    // the cap trim across the crown, where the lappets come out
    const trim = new Path2D();
    const a0 = Math.PI * 1.13, a1 = Math.PI * 1.87;
    for (let q = 0; q <= 10; q++) {
      const a = a0 + ((a1 - a0) * q) / 10, px = Math.cos(a) * hRx * 1.01, py = hCy + Math.sin(a) * hRy * 1.03;
      q ? trim.lineTo(px, py) : trim.moveTo(px, py);
    }
    for (let q = 10; q >= 0; q--) {
      const a = a0 + ((a1 - a0) * q) / 10, rr = q % 2 ? 0.66 : 0.84;
      trim.lineTo(Math.cos(a) * hRx * (0.98 - (1 - rr) * 0.25), hCy + Math.sin(a) * hRy * rr);
    }
    trim.closePath();
    if (pier) {
      const cap = new Path2D();
      for (let q = 0; q <= 12; q++) {
        const a = Math.PI * 1.06 + (Math.PI * 0.88 * q) / 12, px = Math.cos(a) * hRx * 1.01, py = hCy + Math.sin(a) * hRy * 1.03;
        q ? cap.lineTo(px, py) : cap.moveTo(px, py);
      }
      cap.quadraticCurveTo(hRx * 0.55, hCy - hRy * 0.6, R * 0.1, hCy - hRy * 0.28);
      cap.quadraticCurveTo(-hRx * 0.45, hCy - hRy * 0.6, -hRx * 0.99, hCy - hRy * 0.2);
      cap.closePath();
      paint(cap, "#1b1726");
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath(); ctx.ellipse(-hRx * 0.4, hCy - hRy * 0.78, R * 0.26, R * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();
      // a small cone hat, tipped to one side
      ctx.save();
      ctx.translate(-hRx * 0.25, hCy - hRy * 0.93);
      ctx.rotate(-0.32 + jig / (R * 2));
      const cone = new Path2D();
      cone.moveTo(-R * 0.34, R * 0.06); cone.quadraticCurveTo(-R * 0.08, -R * 0.5, R * 0.02, -R * 0.95); cone.quadraticCurveTo(R * 0.2, -R * 0.45, R * 0.34, R * 0.06); cone.closePath();
      paint(cone, "#fbf8f2");
      for (let q = 0; q < 2; q++) { const pm = new Path2D(); pm.arc(R * (0.0 + q * 0.03), -R * (0.22 + q * 0.3), R * 0.085, 0, Math.PI * 2); paint(pm, "#1b1726", lw * 0.5); }
      const tip = new Path2D();
      tip.arc(R * 0.02, -R * 0.98, R * 0.11, 0, Math.PI * 2);
      paint(tip, "#1b1726", lw * 0.6);
      ctx.restore();
    } else paint(trim, L.hat[1]);
    if (form === "grunge") {
      ctx.save();
      ctx.translate(hRx * 0.38, hCy - hRy * 0.72);
      ctx.rotate(-0.5);
      ctx.strokeStyle = "#e6e0d6";
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(-R * 0.2, -R * 0.03); ctx.lineTo(R * 0.16, -R * 0.03);
      ctx.moveTo(-R * 0.2, R * 0.03); ctx.lineTo(R * 0.16, R * 0.03);
      ctx.arc(-R * 0.2, 0, R * 0.03, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = "#e6e0d6";
      ctx.fillRect(R * 0.13, -R * 0.055, R * 0.09, R * 0.11);
      ctx.restore();
    }

    // ---- face, turned a little toward where it's heading ----
    const fx0 = R * 0.1, eyeY = hCy + hRy * 0.2, eH = R * 0.27;
    const lk = o.look || [0.5 * dir, 0.1];
    const lx = clamp(lk[0] * dir, -1, 1) * R * 0.06, ly = clamp(lk[1], -1, 1) * R * 0.05;
    const blink = (t * 0.7 + sd) % 4 < 0.12;
    const iris = o.evil ? "#ff3b4a" : form === "ether" ? "#5fd4ff" : form === "grunge" ? "#b6ff5c" : form === "neutral" ? "#ff5fa8" : pier ? "#9fc4ff" : rgb(hsl((j.hue + 180) % 360, 80, 68));
    for (const side of [-1, 1]) {
      const eW = R * (side > 0 ? 0.18 : 0.21), ex = fx0 + side * hRx * 0.42;
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      if (o.hurt) {
        ctx.beginPath();
        ctx.moveTo(ex - side * eW * 0.9, eyeY - eH * 0.5); ctx.lineTo(ex + side * eW * 0.6, eyeY); ctx.lineTo(ex - side * eW * 0.9, eyeY + eH * 0.5);
        ctx.stroke();
      } else if (o.happy) {
        ctx.beginPath(); ctx.arc(ex, eyeY + eH * 0.3, eW, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (blink || sit) {
        ctx.beginPath(); ctx.arc(ex, eyeY - eH * 0.1, eW, 0.2, Math.PI - 0.2); ctx.stroke();
      } else {
        ctx.fillStyle = "#16091f";
        ctx.beginPath(); ctx.ellipse(ex + lx, eyeY + ly, eW, eH, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = iris;
        ctx.beginPath(); ctx.ellipse(ex + lx, eyeY + ly + eH * 0.55, eW * 1.05, eH * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#16091f";
        ctx.beginPath(); ctx.ellipse(ex + lx * 1.4, eyeY + ly * 1.4 + eH * 0.05, eW * 0.5, eH * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        if (form === "ether") sparkle(ex + lx - eW * 0.3, eyeY + ly - eH * 0.35, eW * 0.24, "#ffffff");
        else { ctx.beginPath(); ctx.arc(ex + lx - eW * 0.3, eyeY + ly - eH * 0.35, eW * 0.36, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(ex + lx + eW * 0.35, eyeY + ly + eH * 0.4, eW * 0.16, 0, Math.PI * 2); ctx.fill();
        if (sad || form === "grunge" || o.evil || pier) {
          const inK = o.evil ? -0.05 : sad ? 0.5 : pier ? 0.42 : 0.45, outK = o.evil ? 0.7 : sad ? 0.05 : pier ? 0.22 : 0.45;
          const yL = eyeY - eH * (side > 0 ? inK : outK), yR = eyeY - eH * (side > 0 ? outK : inK);
          ctx.fillStyle = rgb(mix(skin, "#1b1029", form === "grunge" || o.evil ? 0.35 : pier ? 0.04 : 0.1));
          ctx.beginPath();
          ctx.moveTo(ex - eW * 1.3, eyeY - eH * 1.2); ctx.lineTo(ex + eW * 1.3, eyeY - eH * 1.2); ctx.lineTo(ex + eW * 1.3, yR); ctx.lineTo(ex - eW * 1.3, yL);
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = lw * (form === "grunge" || o.evil ? 1.3 : 0.8);
          ctx.beginPath(); ctx.moveTo(ex - eW * 1.25, yL); ctx.lineTo(ex + eW * 1.25, yR); ctx.stroke();
        }
      }
      // blush and face paint
      const cx2 = fx0 + side * hRx * 0.7, cy2 = hCy + hRy * 0.55;
      ctx.fillStyle = pier ? "rgba(159,196,255,0.3)" : "rgba(255,95,140,0.32)";
      ctx.beginPath(); ctx.ellipse(cx2, cy2, R * 0.15, R * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      if (pier) {
        if (side < 0) {
          // a painted tear under one eye
          ctx.fillStyle = "#6fa8ff";
          ctx.strokeStyle = ink;
          ctx.lineWidth = lw * 0.4;
          ctx.beginPath();
          ctx.moveTo(ex, eyeY + eH * 1.15);
          ctx.quadraticCurveTo(ex + R * 0.1, eyeY + eH * 1.75, ex, eyeY + eH * 1.9);
          ctx.quadraticCurveTo(ex - R * 0.1, eyeY + eH * 1.75, ex, eyeY + eH * 1.15);
          ctx.fill(); ctx.stroke();
        } else {
          ctx.fillStyle = "#1b1726";
          ctx.beginPath();
          ctx.moveTo(ex, eyeY + eH * 1.2); ctx.lineTo(ex + R * 0.06, eyeY + eH * 1.5); ctx.lineTo(ex, eyeY + eH * 1.8); ctx.lineTo(ex - R * 0.06, eyeY + eH * 1.5);
          ctx.fill();
        }
      } else if (form === "ether") sparkle(cx2, cy2 - R * 0.02, R * 0.05, "rgba(255,255,255,0.95)");
      else if (form === "grunge") {
        ctx.strokeStyle = "rgba(10,8,14,0.85)";
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx2 - R * 0.07, cy2 - R * 0.07); ctx.lineTo(cx2 + R * 0.07, cy2 + R * 0.07);
        ctx.moveTo(cx2 + R * 0.07, cy2 - R * 0.07); ctx.lineTo(cx2 - R * 0.07, cy2 + R * 0.07);
        ctx.stroke();
      } else {
        ctx.fillStyle = form === "neutral" ? "#d62839" : "rgba(255,95,168,0.85)";
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 - R * 0.11); ctx.lineTo(cx2 + R * 0.075, cy2); ctx.lineTo(cx2, cy2 + R * 0.11); ctx.lineTo(cx2 - R * 0.075, cy2);
        ctx.fill();
      }
    }
    if (form === "ether") {
      // a crescent on the brow
      ctx.fillStyle = "#ffe680";
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.arc(fx0, hCy - hRy * 0.3, R * 0.15, 0.3, Math.PI * 2 - 0.9);
      ctx.arc(fx0 + R * 0.07, hCy - hRy * 0.34, R * 0.11, Math.PI * 2 - 1.2, 0.5, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // mouth
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.8;
    const mx = fx0 + R * 0.02, my = hCy + hRy * 0.58;
    ctx.beginPath();
    if (o.hurt) {
      for (let k = 0; k <= 4; k++) { const px = mx + (k - 2) * R * 0.07, py = my + R * 0.04 + (k % 2 ? -1 : 1) * R * 0.035; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    } else if (o.evil) {
      ctx.moveTo(mx - R * 0.26, my - R * 0.04);
      for (let k = 1; k <= 8; k++) ctx.lineTo(mx - R * 0.26 + k * R * 0.065, my + (k % 2 ? R * 0.1 : 0) + Math.sin((k / 8) * Math.PI) * R * 0.05);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();
    } else if (o.happy) {
      ctx.moveTo(mx - R * 0.17, my - R * 0.05);
      ctx.quadraticCurveTo(mx, my + R * 0.28, mx + R * 0.17, my - R * 0.05);
      ctx.closePath();
      ctx.fillStyle = "#5a1030";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff7aa8";
      ctx.beginPath(); ctx.ellipse(mx, my + R * 0.07, R * 0.07, R * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    } else if (sit) {
      ctx.ellipse(mx, my, R * 0.04, R * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (sad) {
      ctx.arc(mx, my + R * 0.1, R * 0.1, Math.PI + 0.4, -0.4);
      ctx.stroke();
    } else {
      ctx.arc(mx - R * 0.075, my - R * 0.04, R * 0.075, 0.1, Math.PI - 0.3);
      ctx.moveTo(mx + R * 0.15, my - R * 0.03);
      ctx.arc(mx + R * 0.075, my - R * 0.04, R * 0.075, 0.3, Math.PI - 0.1);
      ctx.stroke();
      if (form === "grunge") {
        ctx.fillStyle = "#ffffff";
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.moveTo(mx + R * 0.1, my + R * 0.02); ctx.lineTo(mx + R * 0.14, my + R * 0.13); ctx.lineTo(mx + R * 0.18, my + R * 0.01); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    if (form === "ether" && !sit) {
      // a ring of light above the head
      ctx.strokeStyle = `rgba(255,236,150,${0.8 + 0.2 * Math.sin(t * 2)})`;
      ctx.lineWidth = lw * 1.2;
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(R * 0.1, hCy - hRy * 1.45 + Math.sin(t * 2) * R * 0.06, R * 0.6, R * 0.15, -0.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();   // head
    ctx.restore();   // body

    const topScreen = y - lift + hCy - hRy;
    if (best === "juggle") {
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k * 2.09;
        const px = x + Math.cos(a) * R * 1.3, py = topScreen - R * 1.9 - Math.abs(Math.sin(a)) * R * 1.1;
        ctx.fillStyle = ["#ff5fa8", "#ffd23f", "#8fe9ff"][k];
        ctx.strokeStyle = ink;
        ctx.lineWidth = lw * 0.6;
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
        ctx.font = `${(8 + q * 10) * U * s}px "Permanent Marker", cursive`;
        ctx.fillText("z", x + dir * R * (1.0 + q * 0.7), topScreen - q * R * 1.4);
      }
      ctx.globalAlpha = 1;
    }
    return { x, y: y - lift + (hCy - hRy) / 2, r: R * 1.35, faceY: y - lift + hCy + hRy * 0.25, topY: topScreen - R * 1.3, feetY: y };
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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r * 0.09;
    ctx.shadowColor = paint;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, top - r * 0.35 + Math.sin(t * 2) * r * 0.05, r * 0.55, r * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
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
      // hands pressed flat against a wall that isn't there
      for (const s of [-1, 1]) {
        const hx = -r * (s > 0 ? 0.78 : 1.0) + Math.sin(t * 1.4 + s) * r * 0.05, hy = (s > 0 ? r * 0.12 : -r * 0.6) + Math.cos(t * 1.4 + s) * r * 0.06;
        limb([[s * r * 0.44, -r * 0.14], s > 0 ? [-r * 0.1, r * 0.28] : [-r * 0.82, -r * 0.2], [hx + r * 0.16, hy + r * 0.04]], r * 0.15, "#f4efe6", lw * 0.5);
        glove(hx, hy, r * 0.15, -Math.PI / 2 + 0.1 * s, "#ffffff", lw * 0.7);
        ctx.strokeStyle = `rgba(143,233,255,${0.35 + 0.25 * Math.sin(t * 3 + s)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy - r * 0.3); ctx.lineTo(hx - r * 0.2, hy + r * 0.3); ctx.stroke();
      }
    },

    goblin(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.3, r * 0.7], [s * r * 0.36, ft - r * 0.1]], r * 0.15, "#7fae3a", lw * 0.5);
        shoe(s * r * 0.36 - r * 0.12, ft, r * 0.17, -1, "#d62839", lw * 0.7);
      }
      const pk = Math.sin(t * 2) * r * 0.05;
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
        ctx.fillStyle = `rgba(232,224,255,${(on ? 0.85 : 0.5) * (1 - puff)})`;
        ctx.beginPath(); ctx.arc(px + Math.sin(puff * 5) * r * 0.1, -h - r * 0.2 - puff * r * 0.9, r * (0.1 + puff * 0.24), 0, Math.PI * 2); ctx.fill();
      }
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
      for (const s of [-1, 1]) {
        limb([[s * r * 0.72, -r * 0.2], [s * r * 1.12, -r * 0.6], [s * r * 0.97, -r * 1.05 + Math.sin(t * 3.2 + s) * r * 0.1]], r * 0.1, "#bdf3ff", lw * 0.4);
        glove(s * r * 0.97, -r * 1.14 + Math.sin(t * 3.2 + s) * r * 0.1, r * 0.13, 0, "#eafcff", lw * 0.6);
      }
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
      for (const s of [-1, 1]) {
        limb([[s * r * 0.15, r * 0.9], [s * r * 0.34, ft - r * 0.3], [s * r * 0.24, ft - r * 0.06]], r * 0.06, FINK, 0);
        limb([[s * r * 0.4, -r * 0.2], [s * r * 0.75, r * 0.1], [s * r * 0.6, r * 0.4 + Math.sin(t * 3 + s) * r * 0.05]], r * 0.07, FINK, 0);
      }
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
      ctx.save();
      ctx.translate(0, ft);
      ctx.scale(wob, 1 / wob);
      D.drawJinx(copy, 0, 0, { t: t + 5, dir: -1, scale: sc, evil: true });
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (Math.sin(t * 17) > 0.5) { ctx.fillStyle = "rgba(255,40,80,0.35)"; ctx.fillRect(-r * 1.5, Math.sin(t * 31) * r * 0.8, r * 3, r * 0.1); }
      if (Math.sin(t * 13 + 2) > 0.6) { ctx.fillStyle = "rgba(40,220,255,0.35)"; ctx.fillRect(-r * 1.5, Math.cos(t * 23) * r * 0.8, r * 3, r * 0.07); }
      ctx.restore();
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
      fCone(-r * 0.15, -r * 0.95, r * 0.72, "#ff8a3d", lw, -0.2);
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
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const sw = Math.sin(t * 1.2) * r * 0.3;
      const bg3 = ctx.createLinearGradient(-r * 0.9, r * 0.1, -r * 3.2, r * 0.9);
      bg3.addColorStop(0, "rgba(143,233,255,0.5)");
      bg3.addColorStop(1, "rgba(143,233,255,0)");
      ctx.fillStyle = bg3;
      ctx.beginPath(); ctx.moveTo(-r * 1.1, r * 0.1); ctx.lineTo(-r * 3.4, r * 0.3 + sw); ctx.lineTo(-r * 3.2, r * 1.3 + sw); ctx.fill();
      ctx.restore();
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
      limb([[-r * 0.58, -r * 0.42], [-r * 1.0, -r * 0.05], [-r * 0.92, r * 0.1]], r * 0.15, "#100826", lw * 0.4);
      const tor = new Path2D();
      tor.moveTo(-r * 0.82, r * 0.0); tor.lineTo(-r * 1.15, -r * 0.02); tor.lineTo(-r * 1.28, -r * 0.1); tor.lineTo(-r * 1.28, r * 0.28); tor.lineTo(-r * 1.15, r * 0.2); tor.lineTo(-r * 0.82, r * 0.18); tor.closePath();
      fBody(tor, "#cfc6d8", r * 0.3, lw * 0.7, -r * 1.0, 0, 0.3);
      glow(-r * 1.3, r * 0.09, r * 0.3, "#8fe9ff", 0.9);
      glove(-r * 0.92, r * 0.1, r * 0.11, Math.PI / 2, "#ffffff", lw * 0.6);
      limb([[r * 0.58, -r * 0.42], [r * 0.9, 0.0], [r * 0.8, r * 0.35]], r * 0.15, "#100826", lw * 0.4);
      glove(r * 0.8, r * 0.42, r * 0.11, Math.PI, "#ffffff", lw * 0.6);
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
      fHalo(-r * 0.9, r, "#8fe9ff", t);
      for (const s of [-1, 1]) {
        eye(s * r * 0.33, -r * 0.2, r * 0.15, r * 0.15, { kind: "x", iris: "#2a6f86" });
        brow(s * r * 0.33, -r * 0.48, r * 0.16, s * 0.3, lw * 0.9);
        ctx.fillStyle = "rgba(143,233,255,0.5)";
        ctx.beginPath(); ctx.arc(s * r * 0.55, r * 0.05, r * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      const mo = new Path2D();
      mo.ellipse(0, r * 0.22, r * 0.13, r * (0.14 + 0.07 * Math.sin(t * 6)), 0, 0, Math.PI * 2);
      fPaint(mo, "#2a6f86", lw * 0.7);
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        ctx.fillStyle = `rgba(143,233,255,${1 - k})`;
        ctx.font = `${r * 0.3}px "Permanent Marker", serif`;
        ctx.fillText(i % 2 ? "♪" : "♫", -r * 0.5 - k * r * 1.2, r * 0.1 - k * r * 0.8 + Math.sin(k * 8) * r * 0.1);
      }
      for (const s of [-1, 1]) glove(s * r * 0.12, r * 0.68, r * 0.13, s * -0.5, "#ffffff", lw * 0.6);
      if (Math.sin(t * 9) > 0.8) { ctx.fillStyle = "rgba(143,233,255,0.45)"; ctx.fillRect(-r * 1.2, Math.sin(t * 40) * r, r * 2.4, r * 0.08); }
    },

    trapeze(f, r, t, lw, ft, hpK, topY) {
      const sw = Math.sin(t * 1.5) * 0.13, barY = -r * 1.25;
      ctx.strokeStyle = "#d9cdb4";
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, barY); ctx.lineTo(-r * 0.7 - sw * r * 4, topY);
      ctx.moveTo(r * 0.7, barY); ctx.lineTo(r * 0.7 - sw * r * 4, topY);
      ctx.stroke();
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
      fCrown(0, -r * 0.84, r * 0.62, "#a6d94a", lw);
    }
  };

  D.foeCenter = function (look, feetY, scale) {
    const r = 42 * U * look.size * (scale || 1);
    const off = { tall: 1.15, round: 1.0, balloon: 2.0, wide: 1.0, blob: 0.85, wisp: 1.6, tv: 1.25 }[look.body] || 1;
    return { r, cy: feetY - r * off };
  };

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
    if (o.hurt) ctx.filter = "brightness(2.2) saturate(0.3)";
    if (f.charge) glow(x, y, r * 2.5, "#ffd23f", 0.25 + 0.2 * Math.sin(t * 12));
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
    art(f, r, t, lw, feetY - y, hpK, -y - 20);
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
    gShadow(x, y, s * 1.1);
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
    gShadow(x, y, s * 1.4);
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

  D.garden = function (t, dt, G) {
    drawBg(t);
    constellations(G && G.save && G.save.sky, t);
    const portrait = H > W;
    planet(W * (portrait ? 0.78 : 0.82), H * (portrait ? 0.14 : 0.2), Math.min(W, H) * (portrait ? 0.09 : 0.08), t);
    const I = D.island();
    const tentX = I.cx - I.rx * 0.38, tentY = I.cy - I.ry * 0.55;
    const tw = I.rx * 0.55, th = I.rx * 0.5;
    island(t);
    const peak = tent(tentX, tentY, tw, th, t);
    lights(peak[0], peak[1], I.cx + I.rx * 0.92, I.cy - I.ry * 0.25, I.ry * 0.5, t, 1);
    lights(peak[0], peak[1], I.cx - I.rx * 0.96, I.cy - I.ry * 0.1, I.ry * 0.35, t, 3);
    ring(I, t);
    pond(I, t);
    tv(I.cx - I.rx * 0.7, I.cy + I.ry * 0.28, 14 * U, t);
    const hits = [];
    if (G && G.save) {
      // everything that stands on the island, drawn back to front
      const s = G.save, things = [];
      for (const j of s.jinxes) {
        const [x, y] = D.toScreen(j.u, j.v);
        things.push({ y: j.held ? 1e9 : y, f: () => {
          if (j.stage === "egg") hits.push({ kind: "jinx", j, ...D.drawEgg(j, x, y, t) });
          else {
            const lift = j.held ? 34 * U : j.hopT > 0 ? Math.sin((1 - j.hopT) * Math.PI) * 28 * U : 0;
            hits.push({ kind: "jinx", j, ...D.drawJinx(j, x, y, { t, scale: 1.25, walk: j.moving || j.held, dir: j.face === undefined ? j.dir : j.face, selected: G.selected === j.id, happy: j.happyT > 0 && !j.held,
              look: j.held ? [0, 1] : lookAt(G.pointer, x, y), hop: lift, spin: j.spinT > 0 ? (1 - j.spinT) * Math.PI * 2 : 0, sleep: j.sleep }) });
          }
        } });
      }
      if (s.tree) {
        const [x, y] = D.toScreen(JG.TREE.u, JG.TREE.v);
        things.push({ y, f: () => { snackTree(x, y, t, s.tree); hits.push({ kind: "tree", x, y: y - 96 * U, r: 70 * U }); } });
      }
      for (const id in s.toys || {}) {
        const T = JG.TOYS[id];
        if (!T || !s.toys[id]) continue;
        const [x, y] = D.toScreen(T.u, T.v);
        things.push({ y, f: () => hits.push({ kind: "toy", id, ...toyDraw(id, x, y, t, G.toyUse && G.t - (G.toyUse[id] || -9) < 0.4) }) });
      }
      for (const it of s.ground || []) {
        const [x, y] = D.toScreen(it.u, it.v);
        things.push({ y: it.held ? 1e9 : y - 1, f: () => hits.push({ kind: "item", it, ...groundItem(it.item, x, y, t, it.held) }) });
      }
      things.sort((a, b) => a.y - b.y).forEach((q) => q.f());
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

  // helpers for stage.js, which draws the battle stage
  D._ = { ctx: () => ctx, glow, sparkle, heart, drawBg, particlesStep, planet, tent, lights, rng, mix, rgb };

  D.clear = function () {
    D.particles.length = 0;
    D.floats.length = 0;
  };
})();
