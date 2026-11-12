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

  // A Jinx is drawn like an inked cartoon: a wobbly ink line, flat shading with a lit side,
  // and a texture that depends on how it leans.
  const hashN = (n) => { const v = Math.sin(n * 127.1 + 1.3) * 43758.5453; return v - Math.floor(v); };
  D.drawJinx = function (j, x, y, o) {
    o = o || {};
    const t = o.t || 0, L = D.jinxLook(j), sd = j.seed || 0;
    const s = (L.adult ? 1 : 0.8) * (o.scale || 1), r = 27 * U * s;
    const walk = !!o.walk, hop = o.hop || 0, dir = o.dir || 1;
    const ph = t * 9 + sd;
    const beat = Math.sin((t * Math.PI * 2) / 0.6 + sd);          // bobbing in time with the waltz
    const bounce = walk ? Math.abs(Math.sin(ph)) * r * 0.32 : o.sleep ? 0 : Math.max(0, beat) * r * 0.07;
    const squash = o.hurt ? 0.14 : walk ? Math.cos(ph * 2) * 0.05 : o.sleep ? Math.sin(t * 1.5 + sd) * 0.03 : -beat * 0.035;
    const lean = o.sleep || o.hurt ? 0 : walk ? Math.sin(ph) * 0.07 : Math.sin((t * Math.PI) / 0.6 + sd) * 0.05;
    const by = y - r * 0.92 - bounce - hop;
    const ink = L.form === "grunge" ? "#0b0810" : "#1b1029", lw = Math.max(1.4, r * 0.075);
    const frame = Math.floor(t * 8);
    const wb = (i) => (hashN(i + sd * 10 + frame * 13.1) - 0.5) * r * 0.035;   // the line "boils" a little
    const mood = j.mood === undefined ? 60 : j.mood;
    const sad = mood < 30 && !o.happy;

    // shadow
    const sh = ctx.createRadialGradient(x, y, 0, x, y, r * 1.2);
    sh.addColorStop(0, "rgba(5,2,12,0.55)");
    sh.addColorStop(1, "rgba(5,2,12,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 - (bounce + hop) / (r * 4), 0.26);
    ctx.translate(-x, -y);
    ctx.fillStyle = sh;
    ctx.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
    ctx.restore();
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
    ctx.rotate(lean);
    ctx.scale((1 + squash) * dir, 1 - squash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (L.form === "ether") glow(0, 0, r * 2.8, "#8fe9ff", 0.2 + 0.07 * Math.sin(t * 3));
    if (L.form === "grunge") {
      // fumes
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.35 + i / 3 + sd) % 1;
        ctx.fillStyle = `rgba(166,217,74,${0.16 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(Math.sin(i * 4 + t) * r * 0.8, -r * 0.6 - k * r * 1.6, r * (0.18 + k * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- feet: little jester boots with curled toes ----
    const step = walk ? Math.sin(ph) : 0;
    const bootC = rgb(mix(L.hat[1], "#1b1029", 0.15));
    const springs = L.adult && L.best === "tumble";
    for (const side of [-1, 1]) {
      const lift = side * step > 0 ? Math.abs(step) * r * 0.2 : 0;
      const fx = side * r * 0.45, fy = r * 0.86 - lift + (springs ? r * 0.2 : 0);
      if (springs) {
        ctx.strokeStyle = "#d9d2e6";
        ctx.lineWidth = lw * 0.9;
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const yy = r * 0.66 + (k / 10) * (fy - r * 0.72), xx = fx + (k % 2 ? 1 : -1) * r * 0.13;
          k ? ctx.lineTo(xx, yy) : ctx.moveTo(fx, yy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = side < 0 ? rgb(mix(L.hat[0], "#1b1029", 0.15)) : bootC;
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.3, fy - r * 0.05);
      ctx.quadraticCurveTo(fx - r * 0.3, fy + r * 0.2, fx, fy + r * 0.2);
      ctx.quadraticCurveTo(fx + r * 0.42, fy + r * 0.2, fx + r * 0.5, fy - r * 0.02);
      ctx.quadraticCurveTo(fx + r * 0.52, fy - r * 0.2, fx + r * 0.4, fy - r * 0.16);
      ctx.quadraticCurveTo(fx + r * 0.36, fy + r * 0.02, fx + r * 0.16, fy - r * 0.08);
      ctx.quadraticCurveTo(fx - r * 0.1, fy - r * 0.2, fx - r * 0.3, fy - r * 0.05);
      ctx.fill();
      ctx.stroke();
      if (L.adult) {
        ctx.fillStyle = L.bell;
        ctx.beginPath();
        ctx.arc(fx + r * 0.42, fy - r * 0.2, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---- body ----
    const P = (v, i) => v * r + wb(i);
    const body = new Path2D();
    body.moveTo(P(-0.98, 1), P(0.6, 2));
    body.bezierCurveTo(P(-1.1, 3), P(-0.45, 4), P(-0.62, 5), P(-1.14, 6), P(0, 7), P(-1.12, 8));
    body.bezierCurveTo(P(0.62, 9), P(-1.14, 10), P(1.1, 11), P(-0.45, 12), P(0.98, 13), P(0.6, 14));
    body.bezierCurveTo(P(0.72, 15), P(0.98, 16), P(-0.72, 17), P(0.98, 18), P(-0.98, 1), P(0.6, 2));
    const bg2 = ctx.createRadialGradient(-r * 0.3, -r * 0.5, r * 0.1, 0, 0, r * 1.3);
    bg2.addColorStop(0, rgb(mix(L.body, "#ffffff", 0.32)));
    bg2.addColorStop(0.6, rgb(L.body));
    bg2.addColorStop(1, rgb(mix(L.body, "#2a1050", 0.3)));
    ctx.fillStyle = bg2;
    if (L.form === "ether") ctx.globalAlpha = 0.9;
    ctx.fill(body);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.clip(body);
    if (L.form === "ether") {
      // a little nebula inside
      ctx.globalCompositeOperation = "lighter";
      const neb = [["#ff5fa8", -0.4, 0.3], ["#8a3dff", 0.4, -0.1], ["#8fe9ff", 0, 0.6]];
      neb.forEach((n, i) => glow(n[1] * r + Math.sin(t * 0.7 + i * 2) * r * 0.2, n[2] * r + Math.cos(t * 0.5 + i) * r * 0.15, r * 0.9, n[0], 0.3));
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 9; i++) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7));
        sparkle((hashN(i + sd) - 0.5) * r * 1.6, (hashN(i + sd + 20) - 0.2) * r * 1.2, r * 0.035 * (1 + a), `rgba(255,255,255,${a})`);
      }
    } else if (L.form === "grunge") {
      // worn plaid, a sewn-on patch
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(13,10,18,0.26)";
        ctx.fillRect(-r * 1.2, r * (0.08 + i * 0.22), r * 2.4, r * 0.1);
        ctx.fillRect(-r * 1.0 + i * r * 0.48, r * 0.02, r * 0.12, r);
        ctx.fillStyle = "rgba(182,255,92,0.28)";
        ctx.fillRect(-r * 1.2, r * (0.2 + i * 0.22), r * 2.4, r * 0.025);
        ctx.fillRect(-r * 0.82 + i * r * 0.48, r * 0.02, r * 0.025, r);
      }
      ctx.save();
      ctx.translate(-r * 0.5, r * 0.55);
      ctx.rotate(-0.25);
      ctx.fillStyle = rgb(mix(L.body, "#d62839", 0.55));
      ctx.fillRect(-r * 0.17, -r * 0.15, r * 0.34, r * 0.3);
      ctx.strokeStyle = "#e6e0d6";
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.setLineDash([r * 0.06, r * 0.05]);
      ctx.strokeRect(-r * 0.17, -r * 0.15, r * 0.34, r * 0.3);
      ctx.restore();
    } else if (L.form === "neutral") {
      // motley: two halves and a belt of diamonds
      ctx.fillStyle = "rgba(214,40,57,0.2)";
      ctx.fillRect(-r * 1.2, r * 0.05, r * 1.2, r);
      ctx.fillStyle = "rgba(27,23,38,0.22)";
      ctx.fillRect(0, r * 0.05, r * 1.2, r);
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = i % 2 ? "#d62839" : "#1b1726";
        ctx.strokeStyle = "rgba(255,210,63,0.8)";
        ctx.lineWidth = Math.max(0.8, r * 0.025);
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, r * 0.4);
        ctx.lineTo(i * r * 0.36 + r * 0.18, r * 0.64);
        ctx.lineTo(i * r * 0.36, r * 0.88);
        ctx.lineTo(i * r * 0.36 - r * 0.18, r * 0.64);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // children: a pale tummy
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.62, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // flat shadow on the side away from the light, a rim of light on the other
    ctx.fillStyle = L.form === "ether" ? "rgba(60,30,120,0.16)" : "rgba(27,10,50,0.2)";
    ctx.beginPath();
    ctx.rect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
    ctx.arc(-r * 0.3, -r * 0.35, r * 1.18, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = L.form === "ether" ? "rgba(200,245,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = r * 0.16;
    ctx.stroke(body);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, -r * 0.7, r * 0.26, r * 0.13, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.72, -r * 0.42, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke(body);
    if (L.form === "grunge" || (!L.adult && (j.align || 0) < -0.5)) {
      ctx.fillStyle = rgb(mix(L.body, "#a6d94a", 0.45));
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 0.7;
      for (let i = 0; i < 3; i++) {
        const dx = (-0.5 + i * 0.5) * r, len = r * (0.22 + 0.2 * Math.abs(Math.sin(t * 1.3 + i * 2)));
        ctx.beginPath();
        ctx.moveTo(dx - r * 0.1, r * 0.84);
        ctx.quadraticCurveTo(dx, r * 0.84 + len * 2, dx + r * 0.1, r * 0.84);
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---- arms ----
    const armA = o.hurt ? 1.5 : o.happy ? -2.3 + Math.sin(t * 14) * 0.3 : o.sleep ? 0.15 : walk ? 0.5 + Math.sin(ph) * 0.6 : 0.45 + Math.sin(t * 2 + sd) * 0.12;
    for (const side of [-1, 1]) {
      const a = walk ? 0.5 + Math.sin(ph) * 0.6 * side : armA;
      ctx.save();
      ctx.translate(side * r * 0.9, r * 0.14);
      ctx.rotate(side * a);
      ctx.fillStyle = rgb(mix(L.body, "#ffffff", 0.08));
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.22, r * (L.adult && L.best === "juggle" ? 0.21 : 0.16), r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (L.adult && L.best === "grit") {
        // a studded cuff
        ctx.fillStyle = "#16101c";
        ctx.fillRect(-r * 0.17, r * 0.2, r * 0.34, r * 0.1);
        ctx.fillStyle = "#d9d2e6";
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(k * r * 0.1, r * 0.25, r * 0.03, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }

    // ---- ruff collar: two rows of scallops ----
    ctx.lineWidth = lw * 0.75;
    ctx.strokeStyle = ink;
    for (let row = 0; row < 2; row++) {
      const n = row ? 6 : 7, w = r * (row ? 0.25 : 0.27), yy = r * (row ? 0.25 : 0.36);
      for (let i = 0; i < n; i++) {
        const xx = (i - (n - 1) / 2) * w;
        ctx.fillStyle = row ? rgb(mix(L.hat[(i + 1) % 2], "#ffffff", 0.35)) : L.hat[i % 2];
        ctx.beginPath();
        ctx.arc(xx, yy - Math.abs(xx) * 0.12, w * 0.56, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // ---- face ----
    const lk = o.look || [0.5 * dir, 0.1];
    const lx = clamp(lk[0] * dir, -1, 1) * r * 0.055, ly = clamp(lk[1], -1, 1) * r * 0.05;
    const blink = (t * 0.7 + sd) % 4 < 0.12;
    const eyeY = -r * 0.34, eW = r * 0.19, eH = r * 0.26;
    const iris = o.evil ? "#ff3b4a" : L.form === "ether" ? "#5fd4ff" : L.form === "grunge" ? "#b6ff5c" : L.form === "neutral" ? "#ff5fa8" : rgb(hsl((j.hue + 180) % 360, 80, 68));
    for (const side of [-1, 1]) {
      const ex = side * r * 0.36;
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      if (o.hurt) {
        ctx.beginPath();
        ctx.moveTo(ex - side * eW * 0.9, eyeY - eH * 0.5);
        ctx.lineTo(ex + side * eW * 0.6, eyeY);
        ctx.lineTo(ex - side * eW * 0.9, eyeY + eH * 0.5);
        ctx.stroke();
      } else if (o.happy) {
        ctx.beginPath();
        ctx.arc(ex, eyeY + eH * 0.3, eW, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (blink || o.sleep) {
        ctx.beginPath();
        ctx.arc(ex, eyeY - eH * 0.1, eW, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#16091f";
        ctx.beginPath();
        ctx.ellipse(ex + lx, eyeY + ly, eW, eH, 0, 0, Math.PI * 2);
        ctx.fill();
        // a crescent of colour low in the eye
        ctx.save();
        ctx.clip();
        ctx.fillStyle = iris;
        ctx.beginPath();
        ctx.ellipse(ex + lx, eyeY + ly + eH * 0.55, eW * 1.05, eH * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16091f";
        ctx.beginPath();
        ctx.ellipse(ex + lx * 1.4, eyeY + ly * 1.4 + eH * 0.05, eW * 0.5, eH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        if (L.form === "ether") sparkle(ex + lx - eW * 0.3, eyeY + ly - eH * 0.35, eW * 0.24, "#ffffff");
        else { ctx.beginPath(); ctx.arc(ex + lx - eW * 0.3, eyeY + ly - eH * 0.35, eW * 0.36, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath();
        ctx.arc(ex + lx + eW * 0.35, eyeY + ly + eH * 0.4, eW * 0.16, 0, Math.PI * 2);
        ctx.fill();
        if (sad || L.form === "grunge" || o.evil) {
          // a heavy lid: drooping when sad, slanted in when mean
          const inK = o.evil ? -0.05 : sad ? 0.5 : 0.45, outK = o.evil ? 0.7 : sad ? 0.05 : 0.45;
          const yL = eyeY - eH * (side > 0 ? inK : outK), yR = eyeY - eH * (side > 0 ? outK : inK);
          ctx.fillStyle = rgb(mix(L.body, "#1b1029", L.form === "grunge" || o.evil ? 0.35 : 0.1));
          ctx.beginPath();
          ctx.moveTo(ex - eW * 1.3, eyeY - eH * 1.2);
          ctx.lineTo(ex + eW * 1.3, eyeY - eH * 1.2);
          ctx.lineTo(ex + eW * 1.3, yR);
          ctx.lineTo(ex - eW * 1.3, yL);
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.lineWidth = lw * (L.form === "grunge" || o.evil ? 1.3 : 0.8);
          ctx.beginPath();
          ctx.moveTo(ex - eW * 1.25, yL);
          ctx.lineTo(ex + eW * 1.25, yR);
          ctx.stroke();
        }
      }
      // blush and face paint
      const cx2 = side * r * 0.62, cy2 = -r * 0.02;
      ctx.fillStyle = "rgba(255,95,140,0.3)";
      ctx.beginPath();
      ctx.ellipse(cx2, cy2 + r * 0.02, r * 0.14, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      if (L.form === "ether") sparkle(cx2, cy2, r * 0.05, "rgba(255,255,255,0.95)");
      else if (L.form === "grunge") {
        ctx.strokeStyle = "rgba(10,8,14,0.85)";
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx2 - r * 0.07, cy2 - r * 0.07); ctx.lineTo(cx2 + r * 0.07, cy2 + r * 0.07);
        ctx.moveTo(cx2 + r * 0.07, cy2 - r * 0.07); ctx.lineTo(cx2 - r * 0.07, cy2 + r * 0.07);
        ctx.stroke();
      } else {
        ctx.fillStyle = L.form === "neutral" ? "#d62839" : "rgba(255,95,168,0.8)";
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 - r * 0.1); ctx.lineTo(cx2 + r * 0.07, cy2); ctx.lineTo(cx2, cy2 + r * 0.1); ctx.lineTo(cx2 - r * 0.07, cy2);
        ctx.fill();
      }
    }
    // mouth
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.8;
    const my = -r * 0.04;
    ctx.beginPath();
    if (o.hurt) {
      for (let k = 0; k <= 4; k++) { const px = (k - 2) * r * 0.07, py = my + r * 0.06 + (k % 2 ? -1 : 1) * r * 0.035; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    } else if (o.evil) {
      ctx.moveTo(-r * 0.24, my - r * 0.02);
      for (let k = 1; k <= 8; k++) ctx.lineTo(-r * 0.24 + k * r * 0.06, my + (k % 2 ? r * 0.12 : r * 0.02) + Math.sin((k / 8) * Math.PI) * r * 0.05);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();
    } else if (o.happy) {
      ctx.moveTo(-r * 0.16, my);
      ctx.quadraticCurveTo(0, my + r * 0.3, r * 0.16, my);
      ctx.closePath();
      ctx.fillStyle = "#5a1030";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff7aa8";
      ctx.beginPath();
      ctx.ellipse(0, my + r * 0.11, r * 0.07, r * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.sleep) {
      ctx.ellipse(0, my + r * 0.05, r * 0.04, r * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (sad) {
      ctx.arc(0, my + r * 0.14, r * 0.1, Math.PI + 0.4, -0.4);
      ctx.stroke();
    } else {
      ctx.arc(-r * 0.07, my, r * 0.07, 0.1, Math.PI - 0.3);
      ctx.moveTo(r * 0.14, my + r * 0.01);
      ctx.arc(r * 0.07, my, r * 0.07, 0.3, Math.PI - 0.1);
      ctx.stroke();
    }

    // ---- hat ----
    const hatY = -r * 0.92;
    const droop = L.adult ? 0 : r * 0.25;
    const jig = Math.sin(t * 3 + sd) * r * 0.06 + (walk ? Math.sin(ph) * r * 0.12 : beat * r * 0.05) + (o.hurt ? r * 0.2 : 0);
    const tips = [];
    const prong = (side, col, k) => {
      const tx = side * r * (L.adult ? 1.38 : 1.15) * (side ? 1 : 0) + (side ? 0 : jig), ty = side ? hatY - r * (L.adult ? 0.58 : 0.2) + droop + jig * side : hatY - r * 1.2;
      const p = new Path2D();
      if (side) {
        p.moveTo(side * -r * 0.12, hatY + r * 0.08);
        p.quadraticCurveTo(side * r * 0.28, hatY - r * 1.12 + wb(30 + k), tx, ty);
        p.quadraticCurveTo(side * r * 0.5, hatY - r * 0.22, side * r * 0.62, hatY + r * 0.1);
      } else {
        p.moveTo(-r * 0.24, hatY + r * 0.02);
        p.quadraticCurveTo(-r * 0.05, hatY - r * 1.0, tx, ty);
        p.quadraticCurveTo(r * 0.08, hatY - r * 0.5, r * 0.24, hatY + r * 0.02);
      }
      p.closePath();
      ctx.fillStyle = col;
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      if (L.form === "grunge") {
        ctx.strokeStyle = "rgba(182,255,92,0.35)";
        ctx.lineWidth = r * 0.03;
        for (let q = -6; q < 8; q++) { ctx.beginPath(); ctx.moveTo(q * r * 0.25, hatY - r * 1.4); ctx.lineTo(q * r * 0.25 + r * 0.5, hatY + r * 0.3); ctx.stroke(); }
      } else if (L.form === "ether") {
        for (let q = 0; q < 6; q++) sparkle(side * r * (0.2 + hashN(q + k) * 0.9), hatY - r * hashN(q + k + 5) * 0.9, r * 0.03, "rgba(255,255,255,0.9)");
      } else {
        ctx.fillStyle = k % 2 ? "rgba(214,40,57,0.9)" : "rgba(255,210,63,0.9)";
        for (let q = 0; q < 5; q++) {
          const dx = side * r * (0.25 + q * 0.24), dy = hatY - r * (0.25 + (q % 2) * 0.3) + droop * (q / 5);
          ctx.beginPath(); ctx.moveTo(dx, dy - r * 0.08); ctx.lineTo(dx + r * 0.055, dy); ctx.lineTo(dx, dy + r * 0.08); ctx.lineTo(dx - r * 0.055, dy); ctx.fill();
        }
      }
      // shade the underside
      ctx.fillStyle = "rgba(20,8,40,0.22)";
      ctx.beginPath();
      ctx.ellipse(side * r * 0.6, hatY + r * 0.05, r * 0.9, r * 0.3, side * -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.stroke(p);
      tips.push([tx, ty]);
      if (side && L.adult && L.best === "grit") {
        ctx.fillStyle = "#d9d2e6";
        ctx.lineWidth = lw * 0.6;
        for (let q = 1; q < 4; q++) {
          const kk = q / 4;
          const px = 2 * (1 - kk) * kk * side * r * 0.28 + kk * kk * tx - (1 - kk) * (1 - kk) * side * r * 0.12;
          const py = (1 - kk) * (1 - kk) * (hatY + r * 0.08) + 2 * (1 - kk) * kk * (hatY - r * 1.12) + kk * kk * ty;
          ctx.beginPath();
          ctx.moveTo(px - r * 0.08, py + r * 0.02);
          ctx.lineTo(px + side * r * 0.03, py - r * 0.26);
          ctx.lineTo(px + r * 0.08, py + r * 0.02);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    };
    prong(-1, L.hat[0], 0);
    prong(1, L.hat[1], 1);
    if (L.adult) prong(0, L.hat[0], 2);
    // hat band with a zigzag trim
    ctx.fillStyle = L.hat[1];
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-r * 0.74, hatY + r * 0.22);
    ctx.quadraticCurveTo(0, hatY - r * 0.16, r * 0.74, hatY + r * 0.22);
    for (let q = 6; q >= 0; q--) {
      const xx = -r * 0.74 + (q / 6) * r * 1.48, arc = hatY + r * 0.22 - Math.sin((q / 6) * Math.PI) * r * 0.19;
      ctx.lineTo(xx, arc + (q % 2 ? r * 0.2 : r * 0.08));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const [tx, ty] of tips) {
      ctx.fillStyle = L.bell;
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(tx - r * 0.05, ty - r * 0.05, r * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillRect(tx - r * 0.08, ty + r * 0.03, r * 0.16, r * 0.03);
      if (L.form === "ether") glow(tx, ty, r * 0.5, "#8fe9ff", 0.5);
    }
    if (L.form === "grunge") {
      // a safety pin through the band
      ctx.strokeStyle = "#e6e0d6";
      ctx.lineWidth = lw * 0.6;
      ctx.save();
      ctx.translate(r * 0.34, hatY + r * 0.16);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.03); ctx.lineTo(r * 0.16, -r * 0.03);
      ctx.moveTo(-r * 0.2, r * 0.03); ctx.lineTo(r * 0.16, r * 0.03);
      ctx.arc(-r * 0.2, 0, r * 0.03, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = "#e6e0d6";
      ctx.fillRect(r * 0.13, -r * 0.055, r * 0.09, r * 0.11);
      ctx.restore();
    }
    if (L.adult && L.best === "glow") {
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.82);
      ctx.quadraticCurveTo(r * 0.75, -r * 1.0, r * 0.5, -r * 1.5 + beat * r * 0.05);
      ctx.stroke();
      glow(r * 0.5, -r * 1.55, r * 0.9, "#8fe9ff", 0.65);
      sparkle(r * 0.5, -r * 1.55 + beat * r * 0.05, r * 0.11, "#ffffff");
    }
    if (L.form === "ether") {
      ctx.strokeStyle = `rgba(255,236,150,${0.8 + 0.2 * Math.sin(t * 2)})`;
      ctx.lineWidth = lw * 1.2;
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, hatY - r * 1.55 + Math.sin(t * 2) * r * 0.06, r * 0.55, r * 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // juggled planets stay upright, outside the flip
    if (L.adult && L.best === "juggle") {
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k * 2.09;
        const px = x + Math.cos(a) * r * 0.9, py = by - r * 2.0 - Math.abs(Math.sin(a)) * r * 0.9;
        ctx.fillStyle = ["#ff5fa8", "#ffd23f", "#8fe9ff"][k];
        ctx.strokeStyle = ink;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(px, py, r * 0.24, r * 0.06, -0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (o.sleep) {
      ctx.fillStyle = "rgba(201,184,255,0.9)";
      for (let k = 0; k < 3; k++) {
        const q = (t * 0.5 + k / 3) % 1;
        ctx.globalAlpha = 1 - q;
        ctx.font = `${(8 + q * 10) * U * s}px "Permanent Marker", cursive`;
        ctx.fillText("z", x + r * (0.8 + q * 0.6), by - r * (1.0 + q * 1.3));
      }
      ctx.globalAlpha = 1;
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
  // Every foe has its own drawing in ART, built from a few shared inked parts.
  const FINK = "#140a1e";
  for (const k in JG.FOES) JG.FOES[k].id = k;
  function fPaint(path, fill, lw) {
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }
  // flat shadow on the side away from the light, a thin rim of light inside the edge
  function fShade(path, r, lx, ly, k) {
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = `rgba(20,8,45,${k || 0.24})`;
    ctx.beginPath();
    ctx.rect(-r * 4, -r * 4, r * 8, r * 8);
    ctx.arc(lx === undefined ? -r * 0.3 : lx, ly === undefined ? -r * 0.4 : ly, r * 1.25, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = r * 0.14;
    ctx.stroke(path);
    ctx.restore();
  }
  function fBody(path, fill, r, lw, lx, ly) {
    ctx.fillStyle = fill;
    ctx.fill(path);
    fShade(path, r, lx, ly);
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
  function fEyes(kind, ex, ey, r, t, paint, eyeC) {
    eyeC = eyeC || FINK;
    if (kind === "tear") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = rgb(paint, 0.9);
        ctx.beginPath();
        ctx.moveTo(s * ex, ey - r * 0.32); ctx.lineTo(s * ex + r * 0.1, ey); ctx.lineTo(s * ex, ey + r * 0.32); ctx.lineTo(s * ex - r * 0.1, ey);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(s * ex, ey, r * 0.13, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = eyeC;
        ctx.beginPath(); ctx.arc(s * ex, ey + r * 0.02, r * 0.055, 0, Math.PI * 2); ctx.fill();
        const tp = (t * 0.7 + (s > 0 ? 0.4 : 0)) % 1;
        ctx.fillStyle = "#8fe9ff";
        ctx.beginPath(); ctx.ellipse(s * ex, ey + r * 0.3 + tp * r * 0.5, r * 0.045, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === "x") {
      ctx.strokeStyle = eyeC;
      ctx.lineWidth = r * 0.08;
      ctx.lineCap = "round";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * ex - r * 0.11, ey - r * 0.11); ctx.lineTo(s * ex + r * 0.11, ey + r * 0.11);
        ctx.moveTo(s * ex + r * 0.11, ey - r * 0.11); ctx.lineTo(s * ex - r * 0.11, ey + r * 0.11);
        ctx.stroke();
      }
    } else if (kind === "hollow") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#0a0414";
        ctx.beginPath(); ctx.ellipse(s * ex, ey, r * 0.15, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        glow(s * ex, ey, r * 0.22, paint, 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(s * ex, ey, r * 0.035, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === "spiral") {
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = FINK;
        ctx.lineWidth = r * 0.03;
        ctx.beginPath(); ctx.arc(s * ex, ey, r * 0.19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = eyeC;
        ctx.lineWidth = r * 0.04;
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const a = k * 0.55 + t * 4 * s, rr = (k / 24) * r * 0.16;
          const px = s * ex + Math.cos(a) * rr, py = ey + Math.sin(a) * rr;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    } else if (kind === "many") {
      const pos = [[-0.4, -0.05], [0.4, -0.05], [0, -0.25], [-0.2, 0.12], [0.22, 0.14]];
      pos.forEach((p, i) => {
        const open = Math.sin(t * 1.7 + i * 1.9) > -0.85;
        ctx.fillStyle = paint;
        ctx.beginPath(); ctx.ellipse(p[0] * r, ey + p[1] * r, r * 0.1, open ? r * 0.1 : r * 0.015, 0, 0, Math.PI * 2); ctx.fill();
        if (open) {
          ctx.fillStyle = eyeC;
          ctx.beginPath(); ctx.arc(p[0] * r + Math.sin(t + i) * r * 0.02, ey + p[1] * r, r * 0.045, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
  }
  function fMouth(frown, ey, r, col, lw) {
    ctx.fillStyle = col;
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    if (frown) {
      ctx.moveTo(-r * 0.3, ey + r * 0.5);
      ctx.quadraticCurveTo(0, ey + r * 0.22, r * 0.3, ey + r * 0.5);
      ctx.quadraticCurveTo(0, ey + r * 0.36, -r * 0.3, ey + r * 0.5);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.moveTo(-r * 0.4, ey + r * 0.25);
      ctx.quadraticCurveTo(0, ey + r * 0.78, r * 0.4, ey + r * 0.25);
      ctx.quadraticCurveTo(0, ey + r * 0.42, -r * 0.4, ey + r * 0.25);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      for (let k = -2; k <= 2; k++) ctx.fillRect(k * r * 0.11 - r * 0.04, ey + r * 0.35 + Math.abs(k) * -r * 0.015, r * 0.08, r * 0.08);
    }
  }
  function fNose(x, y, r, lw) {
    ctx.fillStyle = "#ff3b4a";
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  function fCone(x, top, r, paint, lw, tilt) {
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tilt || 0);
    const p = new Path2D();
    p.moveTo(-r * 0.45, r * 0.1); p.lineTo(r * 0.05, -r * 1.1); p.lineTo(r * 0.45, r * 0.1); p.closePath();
    ctx.fillStyle = "#efe6d2";
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = paint;
    for (let i = 0; i < 6; i++) ctx.fillRect(-r, -r * 1.1 + i * r * 0.24, r * 2, r * 0.12);
    ctx.restore();
    ctx.strokeStyle = FINK;
    ctx.lineWidth = lw;
    ctx.stroke(p);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.arc(r * 0.05, -r * 1.12, r * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function fTopHat(x, top, r, paint, lw, tilt) {
    ctx.save();
    ctx.translate(x, top);
    ctx.rotate(tilt || 0);
    const p = new Path2D();
    p.rect(-r * 0.4, -r * 0.95, r * 0.8, r * 0.95);
    fPaint(p, "#1a1024", lw);
    ctx.fillStyle = paint;
    ctx.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.16);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(-r * 0.32, -r * 0.9, r * 0.12, r * 0.55);
    const b = new Path2D();
    b.ellipse(0, 0, r * 0.66, r * 0.12, 0, 0, Math.PI * 2);
    fPaint(b, "#1a1024", lw);
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
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.arc(tx, ty, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  function fPillbox(x, top, r, col, lw) {
    const p = new Path2D();
    p.roundRect(x - r * 0.42, top - r * 0.42, r * 0.84, r * 0.46, r * 0.08);
    fPaint(p, col, lw);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(x - r * 0.42, top - r * 0.14, r * 0.84, r * 0.09);
    ctx.beginPath(); ctx.arc(x, top - r * 0.42, r * 0.07, 0, Math.PI * 2); ctx.fill();
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
    fPaint(p, "#e8b923", lw);
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

  const ART = {
    mime(f, r, t, lw, ft) {
      for (const s of [-1, 1]) {
        limb([[s * r * 0.24, r * 0.5], [s * r * 0.26, ft - r * 0.08]], r * 0.2, "#1a1024", lw * 0.5);
        const sh = new Path2D();
        sh.ellipse(s * r * 0.3 - r * 0.06, ft - r * 0.05, r * 0.24, r * 0.1, 0, 0, Math.PI * 2);
        fPaint(sh, "#1a1024", lw * 0.6);
      }
      const torso = new Path2D();
      torso.roundRect(-r * 0.58, -r * 0.28, r * 1.16, r * 0.98, r * 0.28);
      ctx.fillStyle = "#f4efe6";
      ctx.fill(torso);
      ctx.save();
      ctx.clip(torso);
      ctx.fillStyle = "#1a1024";
      for (let i = 0; i < 7; i++) ctx.fillRect(-r, -r * 0.2 + i * r * 0.17, r * 2, r * 0.08);
      ctx.restore();
      fShade(torso, r, -r * 0.3, -r * 0.5);
      ctx.strokeStyle = "#d62839";
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.28); ctx.lineTo(-r * 0.22, r * 0.68);
      ctx.moveTo(r * 0.3, -r * 0.28); ctx.lineTo(r * 0.22, r * 0.68);
      ctx.stroke();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      // hands pressed flat against a wall that isn't there
      for (const s of [-1, 1]) {
        const hx = -r * 0.95 + (s > 0 ? r * 0.5 : 0) + Math.sin(t * 1.4 + s) * r * 0.05, hy = -r * (s > 0 ? 0.55 : 0.05) + Math.cos(t * 1.4 + s) * r * 0.06;
        limb([[s * r * 0.5, -r * 0.12], [(s * r * 0.5 + hx) / 2, hy + r * 0.3], [hx + r * 0.1, hy + r * 0.05]], r * 0.15, "#f4efe6", lw * 0.5);
        const g = new Path2D();
        g.roundRect(hx - r * 0.1, hy - r * 0.2, r * 0.2, r * 0.36, r * 0.07);
        fPaint(g, "#ffffff", lw * 0.7);
        ctx.strokeStyle = "rgba(143,233,255,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hx - r * 0.12, hy, r * (0.25 + 0.1 * Math.sin(t * 3 + s)), Math.PI * 0.7, Math.PI * 1.3); ctx.stroke();
      }
      const head = new Path2D();
      head.arc(0, -r * 0.72, r * 0.42, 0, Math.PI * 2);
      fBody(head, "#fbf8f2", r * 0.45, lw, -r * 0.1, -r * 0.85);
      fEyes("tear", r * 0.17, -r * 0.76, r * 0.5, t, "#1a1024");
      ctx.fillStyle = "#1a1024";
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.5); ctx.quadraticCurveTo(0, -r * 0.58, r * 0.1, -r * 0.5); ctx.quadraticCurveTo(0, -r * 0.54, -r * 0.1, -r * 0.5);
      ctx.fill();
      ctx.fillStyle = "rgba(214,40,57,0.5)";
      ctx.beginPath(); ctx.arc(-r * 0.27, -r * 0.6, r * 0.06, 0, Math.PI * 2); ctx.arc(r * 0.27, -r * 0.6, r * 0.06, 0, Math.PI * 2); ctx.fill();
      const beret = new Path2D();
      beret.ellipse(r * 0.06, -r * 1.08, r * 0.5, r * 0.17, -0.15, 0, Math.PI * 2);
      fPaint(beret, "#1a1024", lw);
      ctx.fillRect(r * 0.03, -r * 1.3, r * 0.06, r * 0.1);
    },

    goblin(f, r, t, lw, ft) {
      for (const s of [-1, 1]) limb([[s * r * 0.3, r * 0.7], [s * r * 0.36, ft - r * 0.04], [s * r * 0.36 - r * 0.16, ft - r * 0.03]], r * 0.14, "#7fae3a", lw * 0.5);
      // the goblin, peeking out of its box
      for (const s of [-1, 1]) {
        const ear = new Path2D();
        ear.moveTo(s * r * 0.4, -r * 0.7); ear.lineTo(s * r * 1.15, -r * 1.05 + Math.sin(t * 5 + s) * r * 0.05); ear.lineTo(s * r * 0.5, -r * 0.35); ear.closePath();
        fPaint(ear, "#8fc24a", lw);
      }
      const head = new Path2D();
      head.arc(0, -r * 0.45, r * 0.6, Math.PI, 0);
      head.lineTo(r * 0.6, -r * 0.1); head.lineTo(-r * 0.6, -r * 0.1); head.closePath();
      fBody(head, "#9fd052", r * 0.6, lw, -r * 0.15, -r * 0.7);
      fEyes("spiral", r * 0.25, -r * 0.6, r * 0.75, t, "#ffd23f", "#d62839");
      fMouth(false, -r * 0.72, r * 0.62, "#5a1030", lw);
      fNose(0, -r * 0.44, r * 0.09, lw);
      fCone(r * 0.05, -r * 0.98, r * 0.55, "#d62839", lw, 0.2);
      // popcorn heaped on top
      for (let i = 0; i < 9; i++) {
        const px = (i - 4) * r * 0.2, pop = Math.max(0, Math.sin(t * 3 + i * 1.7)) * r * (i % 3 === 0 ? 0.5 : 0.06);
        for (let q = 0; q < 3; q++) {
          const pc = new Path2D();
          pc.arc(px + (q - 1) * r * 0.07, -r * 0.14 - pop + (q % 2) * r * 0.05 + (i % 2) * r * 0.06, r * 0.1, 0, Math.PI * 2);
          fPaint(pc, "#fff6d8", lw * 0.5);
        }
      }
      const box = new Path2D();
      box.moveTo(-r * 0.92, -r * 0.1); box.lineTo(r * 0.92, -r * 0.1); box.lineTo(r * 0.68, r * 0.85); box.lineTo(-r * 0.68, r * 0.85); box.closePath();
      ctx.fillStyle = "#fbf8f2";
      ctx.fill(box);
      ctx.save();
      ctx.clip(box);
      ctx.fillStyle = "#d62839";
      for (let i = -4; i <= 4; i++) {
        if (i % 2 === 0) continue;
        ctx.beginPath();
        ctx.moveTo(i * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.21, -r * 0.1); ctx.lineTo((i + 1) * r * 0.155, r * 0.85); ctx.lineTo(i * r * 0.155, r * 0.85);
        ctx.fill();
      }
      ctx.restore();
      fShade(box, r, -r * 0.4, -r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(box);
      const badge = new Path2D();
      badge.ellipse(0, r * 0.38, r * 0.38, r * 0.22, 0, 0, Math.PI * 2);
      fPaint(badge, "#ffd23f", lw * 0.7);
      ctx.fillStyle = "#d62839";
      ctx.font = `${r * 0.24}px "Bungee", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POP", 0, r * 0.4);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      for (const s of [-1, 1]) {
        for (let q = 0; q < 3; q++) {
          const fg = new Path2D();
          fg.arc(s * r * (0.72 + q * 0.07), -r * 0.1, r * 0.07, 0, Math.PI * 2);
          fPaint(fg, "#8fc24a", lw * 0.5);
        }
      }
    },

    balloon(f, r, t, lw, ft) {
      ctx.strokeStyle = "rgba(239,230,210,0.9)";
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);
      for (let k = 1; k <= 10; k++) ctx.lineTo(Math.sin(t * 3 + k) * r * 0.08, r * 1.2 + (k / 10) * (ft - r * 1.25));
      ctx.stroke();
      const b = new Path2D();
      b.ellipse(0, 0, r, r * 1.12, 0, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.2);
      g.addColorStop(0, "#ffb3d6");
      g.addColorStop(0.6, "#ff5fa8");
      g.addColorStop(1, "#b02a6e");
      fBody(b, g, r, lw);
      const knot = new Path2D();
      knot.moveTo(-r * 0.13, r * 1.24); knot.lineTo(r * 0.13, r * 1.24); knot.lineTo(0, r * 1.08); knot.closePath();
      fPaint(knot, "#d6408a", lw * 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.55, r * 0.2, r * 0.32, 0.5, 0, Math.PI * 2); ctx.fill();
      fEyes("x", r * 0.33, -r * 0.1, r, t, "#fff", "#ffffff");
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = r * 0.07;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const px = (k - 3) * r * 0.11, py = r * 0.35 + (k % 2 ? -1 : 1) * r * 0.06; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      // crackling static
      const n = f.charge ? 9 : 4;
      ctx.strokeStyle = "#fffbe0";
      ctx.lineWidth = lw * 0.6;
      for (let i = 0; i < n; i++) {
        const sd = Math.floor(t * 10) * 7 + i * 13, a = (Math.sin(sd * 12.9898) * 43758.5453 % 1) * Math.PI * 2, rr = r * 1.15;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const q = rr + k * r * 0.12, aa = a + (k % 2 ? 0.12 : -0.08);
          k ? ctx.lineTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1) : ctx.moveTo(Math.cos(aa) * q, Math.sin(aa) * q * 1.1);
        }
        ctx.stroke();
      }
    },

    tearer(f, r, t, lw, ft) {
      for (const s of [-1, 1]) limb([[s * r * 0.45, r * 0.7], [s * r * 0.48, ft - r * 0.05], [s * r * 0.48 - r * 0.2, ft - r * 0.04]], r * 0.22, "#1a1024", lw * 0.5);
      const body = new Path2D();
      body.ellipse(0, 0, r * 1.3, r * 1.0, 0, 0, Math.PI * 2);
      fBody(body, vgrad("#b02a42", "#6a1428", -r, r), r * 1.2, lw);
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.62, -r * 0.45 + i * r * 0.3, r * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      for (const s of [-1, 1]) {
        const ep = new Path2D();
        ep.ellipse(s * r * 1.02, -r * 0.6, r * 0.34, r * 0.14, s * 0.5, 0, Math.PI * 2);
        fPaint(ep, "#ffd23f", lw * 0.8);
        limb([[s * r * 1.12, -r * 0.35], [s * r * 1.4, r * 0.25 + Math.sin(t * 2 + s) * r * 0.05]], r * 0.24, "#8f2238", lw * 0.5);
        const gl = new Path2D();
        gl.arc(s * r * 1.42, r * 0.36 + Math.sin(t * 2 + s) * r * 0.05, r * 0.17, 0, Math.PI * 2);
        fPaint(gl, "#ffffff", lw * 0.7);
      }
      // a ticket slot for a mouth, spitting out a strip
      const slot = new Path2D();
      slot.roundRect(-r * 0.45, r * 0.05, r * 0.9, r * 0.34, r * 0.08);
      fPaint(slot, "#12080f", lw);
      ctx.fillStyle = "#efe6d2";
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.42 + k * r * 0.12, r * 0.05); ctx.lineTo(-r * 0.36 + k * r * 0.12, r * 0.17); ctx.lineTo(-r * 0.3 + k * r * 0.12, r * 0.05);
        ctx.fill();
      }
      for (let k = 0; k < 6; k++) {
        ctx.save();
        ctx.translate(-r * 0.1 - k * r * 0.26, r * 0.3 + k * r * 0.1 + Math.sin(t * 4 + k) * r * 0.05);
        ctx.rotate(-0.35 + Math.sin(t * 4 + k) * 0.15);
        const tk = new Path2D();
        tk.rect(-r * 0.13, -r * 0.08, r * 0.26, r * 0.16);
        fPaint(tk, k % 2 ? "#efe6d2" : "#ff8a9a", lw * 0.5);
        ctx.restore();
      }
      const head = new Path2D();
      head.arc(0, -r * 0.92, r * 0.38, 0, Math.PI * 2);
      fBody(head, "#c9bfa6", r * 0.4, lw, -r * 0.1, -r);
      fEyes("hollow", r * 0.15, -r * 0.92, r * 0.5, t, "#ff3b4a");
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.7); ctx.lineTo(r * 0.12, -r * 0.7); ctx.stroke();
      fPillbox(0, -r * 1.22, r * 0.9, "#b02a42", lw);
    },

    strongman(f, r, t, lw, ft) {
      const lift = Math.sin(t * 1.6) * r * 0.06;
      for (const s of [-1, 1]) {
        limb([[s * r * 0.35, r * 0.6], [s * r * 0.4, ft - r * 0.1]], r * 0.34, "#e8a17a", lw * 0.5);
        const boot = new Path2D();
        boot.roundRect(s * r * 0.4 - r * 0.28, ft - r * 0.2, r * 0.5, r * 0.2, r * 0.06);
        fPaint(boot, "#1a1024", lw * 0.7);
      }
      // barbell, held up and shaking
      ctx.strokeStyle = FINK;
      ctx.lineWidth = r * 0.13;
      ctx.beginPath(); ctx.moveTo(-r * 2.0, -r * 1.62 + lift); ctx.lineTo(r * 2.0, -r * 1.62 + lift); ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = r * 0.06;
      ctx.stroke();
      for (const s of [-1, 1]) {
        const wt = new Path2D();
        wt.arc(s * r * 1.9, -r * 1.62 + lift, r * 0.36, 0, Math.PI * 2);
        fBody(wt, "#2a2236", r * 0.36, lw, s * r * 1.8, -r * 1.75);
        ctx.fillStyle = "#cfc6d8";
        ctx.beginPath(); ctx.arc(s * r * 1.9, -r * 1.62 + lift, r * 0.07, 0, Math.PI * 2); ctx.fill();
        limb([[s * r * 1.05, -r * 0.5], [s * r * 1.5, -r * 0.95], [s * r * 1.25, -r * 1.55 + lift]], r * 0.36, "#e8a17a", lw * 0.5);
      }
      const torso = new Path2D();
      torso.moveTo(-r * 1.3, -r * 0.55);
      torso.quadraticCurveTo(-r * 1.4, -r * 0.2, -r * 0.6, r * 0.75);
      torso.lineTo(r * 0.6, r * 0.75);
      torso.quadraticCurveTo(r * 1.4, -r * 0.2, r * 1.3, -r * 0.55);
      torso.quadraticCurveTo(0, -r * 0.95, -r * 1.3, -r * 0.55);
      ctx.fillStyle = "#e8a17a";
      ctx.fill(torso);
      ctx.save();
      ctx.clip(torso);
      // leopard singlet with one strap
      ctx.fillStyle = "#e8b923";
      ctx.beginPath();
      ctx.moveTo(-r * 1.5, r * 0.9); ctx.lineTo(-r * 0.9, -r * 0.05); ctx.lineTo(r * 0.15, -r * 0.9); ctx.lineTo(r * 0.75, -r * 0.9); ctx.lineTo(r * 0.5, r * 0.0); ctx.lineTo(r * 1.5, r * 0.9);
      ctx.fill();
      ctx.fillStyle = "#6a3a14";
      for (let i = 0; i < 14; i++) {
        const px = (Math.sin(i * 12.9) * 0.5) * r * 1.6, py = r * (-0.2 + (i % 5) * 0.2);
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.08, r * 0.055, i, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      fShade(torso, r * 1.2, -r * 0.4, -r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      const belt = new Path2D();
      belt.rect(-r * 0.64, r * 0.56, r * 1.28, r * 0.2);
      fPaint(belt, "#1a1024", lw * 0.7);
      sparkle(0, r * 0.66, r * 0.07, "#ffd23f");
      const head = new Path2D();
      head.arc(0, -r * 1.0, r * 0.36, 0, Math.PI * 2);
      fBody(head, "#eeb08a", r * 0.4, lw, -r * 0.1, -r * 1.1);
      fEyes("tear", r * 0.15, -r * 1.05, r * 0.42, t, "#e8a17a");
      // worried brows and a handlebar moustache
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.26, -r * 1.2); ctx.lineTo(-r * 0.08, -r * 1.27);
      ctx.moveTo(r * 0.26, -r * 1.2); ctx.lineTo(r * 0.08, -r * 1.27);
      ctx.stroke();
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.86);
      ctx.quadraticCurveTo(-r * 0.2, -r * 0.76, -r * 0.3, -r * 0.92);
      ctx.moveTo(0, -r * 0.86);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.76, r * 0.3, -r * 0.92);
      ctx.stroke();
    },

    calliope(f, r, t, lw, ft) {
      // brass pipes rising behind
      for (let i = -3; i <= 3; i++) {
        const h = r * (1.5 + (3 - Math.abs(i)) * 0.38), px = i * r * 0.34;
        const pg = ctx.createLinearGradient(px - r * 0.12, 0, px + r * 0.12, 0);
        pg.addColorStop(0, "#6a5a2a");
        pg.addColorStop(0.45, "#f7dc8a");
        pg.addColorStop(1, "#5a4a1a");
        const p = new Path2D();
        p.roundRect(px - r * 0.13, -h - r * 0.1, r * 0.26, h, r * 0.05);
        fPaint(p, pg, lw * 0.8);
        ctx.fillStyle = FINK;
        ctx.fillRect(px - r * 0.07, -h * 0.55, r * 0.14, r * 0.07);
        const puff = (t * 0.8 + Math.abs(i) * 0.25) % 1;
        ctx.fillStyle = `rgba(232,224,255,${0.6 * (1 - puff)})`;
        ctx.beginPath(); ctx.arc(px + Math.sin(puff * 5) * r * 0.1, -h - r * 0.2 - puff * r * 0.9, r * (0.1 + puff * 0.22), 0, Math.PI * 2); ctx.fill();
      }
      const body = new Path2D();
      body.moveTo(-r * 0.95, 0);
      body.arc(0, 0, r * 0.95, Math.PI, 0);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; body.lineTo(r * 0.95 * (1 - kk * 0.85) + Math.sin(t * 3 + kk * 6) * r * 0.14, kk * r * 1.5); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; body.lineTo(-r * 0.95 * (1 - kk * 0.85) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.14, kk * r * 1.5); }
      body.closePath();
      ctx.globalAlpha = 0.93;
      fBody(body, vgrad("#efe9ff", "#8f7fd6", -r, r * 1.5), r * 1.1, lw);
      ctx.globalAlpha = 1;
      fHorns(-r * 0.82, r, "#5b2a86", lw, t);
      fEyes("hollow", r * 0.36, -r * 0.3, r * 1.15, t, "#c9b8ff");
      // a keyboard for a mouth
      const kb = new Path2D();
      kb.roundRect(-r * 0.62, r * 0.12, r * 1.24, r * 0.36, r * 0.06);
      fPaint(kb, "#12080f", lw);
      for (let k = 0; k < 8; k++) {
        const down = Math.floor(t * 5 + k * 3) % 8 === k;
        ctx.fillStyle = down ? "#c9b8ff" : "#fbf8f2";
        ctx.fillRect(-r * 0.58 + k * r * 0.146, r * 0.16 + (down ? r * 0.04 : 0), r * 0.125, r * 0.28);
        if (k % 7 !== 2 && k < 7) { ctx.fillStyle = "#12080f"; ctx.fillRect(-r * 0.49 + k * r * 0.146, r * 0.16, r * 0.08, r * 0.16); }
      }
      for (const s of [-1, 1]) {
        const wv = Math.sin(t * 2.5 + s) * r * 0.2;
        limb([[s * r * 0.85, r * 0.2], [s * r * 1.35, -r * 0.1 + wv], [s * r * 1.5, -r * 0.5 + wv]], r * 0.16, "#cfc4f4", lw * 0.5);
      }
    },

    seal(f, r, t, lw, ft) {
      const bob = Math.sin(t * 2.2) * r * 0.05;
      // tail flukes
      for (const s of [-1, 1]) {
        const fl = new Path2D();
        fl.ellipse(r * 1.32, r * 0.45 + s * r * 0.16, r * 0.34, r * 0.13, s * 0.6 - 0.5 + Math.sin(t * 3) * 0.2, 0, Math.PI * 2);
        fPaint(fl, "#3d4a30", lw);
      }
      const body = new Path2D();
      body.moveTo(-r * 0.92, -r * 0.3 + bob);
      body.quadraticCurveTo(-r * 0.95, r * 0.5, -r * 0.55, r * 0.85);
      body.lineTo(r * 0.7, r * 0.85);
      body.quadraticCurveTo(r * 1.3, r * 0.8, r * 1.2, r * 0.45);
      body.quadraticCurveTo(r * 0.5, r * 0.25, r * 0.15, -r * 0.4 + bob);
      body.quadraticCurveTo(-r * 0.05, -r * 1.2 + bob, -r * 0.6, -r * 1.1 + bob);
      body.quadraticCurveTo(-r * 1.15, -r * 0.95 + bob, -r * 0.92, -r * 0.3 + bob);
      ctx.fillStyle = vgrad("#66784e", "#33402a", -r, r);
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      // an oil-slick sheen
      const cols = ["rgba(255,95,168,0.2)", "rgba(143,233,255,0.2)", "rgba(166,217,74,0.25)", "rgba(138,61,255,0.2)"];
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = cols[i % 4];
        ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.moveTo(-r * 1.5 + i * r * 0.4 + Math.sin(t + i) * r * 0.1, -r * 1.3);
        ctx.quadraticCurveTo(-r * 0.8 + i * r * 0.4, 0, -r * 1.6 + i * r * 0.4, r);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(220,230,190,0.28)";
      ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 0.35, r * 0.4, r * 0.55, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      fShade(body, r * 1.2, -r * 0.5, -r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(body);
      const flip = new Path2D();
      flip.ellipse(-r * 0.15, r * 0.62, r * 0.5, r * 0.17, 0.5 + Math.sin(t * 4) * 0.15, 0, Math.PI * 2);
      fPaint(flip, "#3d4a30", lw);
      // face, looking toward the player
      fEyes("hollow", r * 0.2, -r * 0.72 + bob, r * 0.75, t, "#a6d94a");
      ctx.save();
      ctx.translate(-r * 0.42, bob);
      fNose(-r * 0.35, -r * 0.52, r * 0.1, lw);
      ctx.strokeStyle = "rgba(239,230,210,0.8)";
      ctx.lineWidth = 1.2;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.45); ctx.lineTo(r * 0.15, -r * 0.4 + k * r * 0.1); ctx.stroke(); }
      ctx.restore();
      fCone(-r * 0.25, -r * 1.08 + bob, r * 0.5, "#a6d94a", lw, 0.25);
      // a ball balanced on its nose
      const bx = -r * 1.0, by2 = -r * 1.05 + bob - Math.abs(Math.sin(t * 2.2)) * r * 0.25;
      const ball = new Path2D();
      ball.arc(bx, by2, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#fbf8f2";
      ctx.fill(ball);
      ctx.save();
      ctx.clip(ball);
      ctx.translate(bx, by2);
      ctx.rotate(t * 2);
      ctx.fillStyle = "#d62839";
      for (let k = 0; k < 3; k++) { ctx.rotate((Math.PI * 2) / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.4, 0, Math.PI / 3); ctx.fill(); }
      ctx.restore();
      fShade(ball, r * 0.3, bx - r * 0.1, by2 - r * 0.1);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke(ball);
      ctx.fillStyle = "rgba(166,217,74,0.9)";
      for (let i = 0; i < 4; i++) {
        const len = r * (0.12 + 0.12 * Math.abs(Math.sin(t * 1.3 + i * 2)));
        ctx.beginPath();
        ctx.moveTo(-r * 0.3 + i * r * 0.3 - r * 0.07, r * 0.85);
        ctx.quadraticCurveTo(-r * 0.3 + i * r * 0.3, r * 0.85 + len * 2, -r * 0.3 + i * r * 0.3 + r * 0.07, r * 0.85);
        ctx.fill();
      }
    },

    glass(f, r, t, lw, ft) {
      for (const s of [-1, 1]) limb([[s * r * 0.25, r * 0.9], [s * r * 0.3, ft - r * 0.03]], r * 0.1, "#bdf3ff", lw * 0.4);
      const body = new Path2D();
      body.moveTo(-r * 0.25, -r * 1.15);
      body.lineTo(r * 0.25, -r * 1.15);
      body.quadraticCurveTo(r * 0.25, -r * 0.75, r * 0.7, -r * 0.45);
      body.quadraticCurveTo(r * 0.8, r * 0.4, r * 0.62, r * 1.05);
      body.lineTo(-r * 0.62, r * 1.05);
      body.quadraticCurveTo(-r * 0.8, r * 0.4, -r * 0.7, -r * 0.45);
      body.quadraticCurveTo(-r * 0.25, -r * 0.75, -r * 0.25, -r * 1.15);
      ctx.fillStyle = "rgba(190,243,255,0.42)";
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      // something teal sloshing inside
      ctx.fillStyle = "rgba(47,183,201,0.6)";
      ctx.beginPath();
      ctx.moveTo(-r, r * 1.2);
      for (let k = 0; k <= 10; k++) ctx.lineTo(-r + k * r * 0.2, r * 0.45 + Math.sin(t * 2.5 + k * 0.9) * r * 0.07);
      ctx.lineTo(r, r * 1.2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.4); ctx.lineTo(-r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.5, r * 0.9); ctx.lineTo(-r * 0.62, r * 0.9); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.5, r * 0.3); ctx.lineTo(r * 0.38, r * 0.3); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(body);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = lw * 0.5;
      ctx.stroke(body);
      const cork = new Path2D();
      cork.roundRect(-r * 0.3, -r * 1.3, r * 0.6, r * 0.2, r * 0.05);
      fPaint(cork, "#2a6f86", lw * 0.8);
      fHorns(-r * 1.22, r * 0.75, "#2a6f86", lw, t);
      fEyes("many", 0, -r * 0.05, r * 0.95, t, "#ffffff");
      fMouth(false, -r * 0.05, r * 0.6, "#2a6f86", lw);
      for (const s of [-1, 1]) limb([[s * r * 0.7, -r * 0.2], [s * r * 1.1, -r * 0.6], [s * r * 0.95, -r * 1.05 + Math.sin(t * 3.2 + s) * r * 0.1]], r * 0.1, "#bdf3ff", lw * 0.4);
      for (let k = 0; k < 3; k++) {
        const a = t * 3.2 + k * 2.09, px = Math.cos(a) * r * 0.95, py = -r * 1.75 - Math.abs(Math.sin(a)) * r * 0.9;
        const gb = new Path2D();
        gb.arc(px, py, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(191,243,255,0.5)";
        ctx.fill(gb);
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw * 0.7;
        ctx.stroke(gb);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(px - r * 0.07, py - r * 0.07, r * 0.06, 0, Math.PI * 2); ctx.fill();
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
        lower.bezierCurveTo(r * 1.3, r * 0.2, r * 1.5, r * 1.1, r * 0.9, r * 1.3);
        lower.bezierCurveTo(r * 0.5, r * 1.2, r * 0.3, r * 0.7, r * 0.2, r * 0.1);
        fBody(lower, "#8a6a4a", r, lw, r * 0.4, 0);
        const upper = new Path2D();
        upper.moveTo(r * 0.15, -r * 0.35);
        upper.bezierCurveTo(r * 0.9, -r * 1.7, r * 2.3, -r * 1.3, r * 2.0, -r * 0.3);
        upper.bezierCurveTo(r * 1.9, r * 0.3, r * 0.9, r * 0.5, r * 0.15, r * 0.15);
        upper.closePath();
        ctx.fillStyle = vgrad("#e6d3ad", "#9a7a52", -r * 1.5, r * 0.4);
        ctx.fill(upper);
        ctx.save();
        ctx.clip(upper);
        ctx.strokeStyle = "rgba(90,62,43,0.5)";
        ctx.lineWidth = r * 0.04;
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.1); ctx.lineTo(r * 2.3, -r * 1.4 + k * r * 0.4); ctx.stroke(); }
        ctx.fillStyle = "rgba(90,62,43,0.55)";
        ctx.beginPath(); ctx.ellipse(r * 1.9, -r * 0.6, r * 0.5, r * 1.1, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        fShade(upper, r * 1.3, r * 0.8, -r * 0.9);
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw;
        ctx.stroke(upper);
        // an eye spot
        for (const [rr, col] of [[0.3, FINK], [0.22, "#ff8a3d"], [0.12, FINK], [0.05, "#ffffff"]]) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(r * 1.3, -r * 0.55, r * rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      for (const s of [-1, 1]) limb([[s * r * 0.15, r * 0.9], [s * r * 0.3, ft - r * 0.25], [s * r * 0.22, ft - r * 0.05]], r * 0.05, FINK, 0);
      const abd = new Path2D();
      abd.ellipse(0, r * 0.55, r * 0.34, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#c9a26b";
      ctx.fill(abd);
      ctx.save();
      ctx.clip(abd);
      ctx.fillStyle = "#5a3e2b";
      for (let k = 0; k < 5; k++) ctx.fillRect(-r, r * 0.15 + k * r * 0.22, r * 2, r * 0.09);
      ctx.restore();
      fShade(abd, r * 0.6, -r * 0.1, r * 0.3);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(abd);
      const thor = new Path2D();
      thor.ellipse(0, -r * 0.2, r * 0.46, r * 0.5, 0, 0, Math.PI * 2);
      fBody(thor, "#b02a6e", r * 0.5, lw, -r * 0.1, -r * 0.4);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI, fz = new Path2D();
        fz.arc(Math.cos(a) * r * 0.42, -r * 0.55 - Math.sin(a) * r * -0.12, r * 0.13, 0, Math.PI * 2);
        fPaint(fz, "#f4e8cf", lw * 0.5);
      }
      const head = new Path2D();
      head.arc(0, -r * 0.92, r * 0.36, 0, Math.PI * 2);
      fBody(head, "#d9c7a7", r * 0.4, lw, -r * 0.1, -r);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#0a0414";
        ctx.beginPath(); ctx.ellipse(s * r * 0.17, -r * 0.95, r * 0.13, r * 0.17, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,138,61,0.9)";
        ctx.beginPath(); ctx.arc(s * r * 0.14, -r * 1.0, r * 0.04, 0, Math.PI * 2); ctx.fill();
        // feathery antennae
        ctx.strokeStyle = FINK;
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.12, -r * 1.22);
        ctx.quadraticCurveTo(s * r * 0.3, -r * 1.8, s * r * 0.75, -r * 1.75 + Math.sin(t * 2 + s) * r * 0.06);
        ctx.stroke();
        ctx.lineWidth = lw * 0.4;
        for (let k = 1; k < 6; k++) {
          const kk = k / 6, px = s * r * (0.12 + kk * 0.6), py = -r * (1.25 + Math.sin(kk * Math.PI * 0.6) * 0.55);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s * r * 0.02, py + r * 0.14); ctx.stroke();
        }
      }
    },

    double(f, r, t, lw, ft) {
      // a bad copy of your own Jinx
      const m = f.mimic || { hue: 320, align: 0, stage: "child", seed: 2, stats: { juggle: { lv: 1 }, tumble: { lv: 1 }, glow: { lv: 1 }, grit: { lv: 1 } } };
      const copy = Object.assign({}, m, { hue: (m.hue + 180) % 360, mood: 90, seed: (m.seed || 0) + 3 });
      const sc = r / (27 * U * (m.stage === "adult" ? 1 : 0.8)) * 1.05;
      const wob = 1 + Math.sin(t * 2.3) * 0.12;
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
      const body = new Path2D();
      body.moveTo(-r * 0.85, -r * 0.5);
      body.quadraticCurveTo(-r * 0.4, 0, -r * 0.75, r * 0.9);
      for (let k = 0; k <= 8; k++) body.lineTo(-r * 0.9 + k * r * 0.225, r * (1.25 + (k % 2 ? 0.3 : 0)) + Math.sin(t * 4 + k) * r * 0.1);
      body.lineTo(r * 0.75, r * 0.9);
      body.quadraticCurveTo(r * 0.4, 0, r * 0.85, -r * 0.5);
      body.quadraticCurveTo(0, -r * 0.9, -r * 0.85, -r * 0.5);
      const g = vgrad("#2b1c48", "rgba(20,10,36,0.25)", -r * 0.6, r * 1.6);
      ctx.fillStyle = g;
      ctx.fill(body);
      ctx.strokeStyle = "rgba(255,59,74,0.65)";
      ctx.lineWidth = lw * 0.7;
      ctx.stroke(body);
      // lapels
      ctx.strokeStyle = "rgba(255,59,74,0.4)";
      ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.6); ctx.lineTo(0, r * 0.1); ctx.lineTo(r * 0.35, -r * 0.6); ctx.stroke();
      // a whip of shadow
      ctx.strokeStyle = "#1a1030";
      ctx.lineWidth = lw * 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.2);
      for (let k = 1; k <= 14; k++) { const kk = k / 14; ctx.lineTo(-r * 0.8 - kk * r * 1.5, -r * 0.2 - Math.sin(kk * 5 - t * 6) * r * 0.35 * kk - kk * r * 0.5); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,59,74,0.6)";
      ctx.lineWidth = lw * 0.4;
      ctx.stroke();
      const head = new Path2D();
      head.arc(0, -r * 0.95, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = "#22163a";
      ctx.fill(head);
      ctx.strokeStyle = "rgba(255,59,74,0.65)";
      ctx.lineWidth = lw * 0.7;
      ctx.stroke(head);
      for (const s of [-1, 1]) {
        glow(s * r * 0.17, -r * 1.0, r * 0.3, "#ff3b4a", 0.8);
        ctx.fillStyle = "#ff6b7a";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.06, -r * 0.96); ctx.lineTo(s * r * 0.3, -r * 1.08); ctx.lineTo(s * r * 0.28, -r * 0.94);
        ctx.fill();
      }
      ctx.fillStyle = "#ff3b4a";
      ctx.beginPath();
      ctx.moveTo(-r * 0.26, -r * 0.82); ctx.quadraticCurveTo(0, -r * 0.6, r * 0.26, -r * 0.82); ctx.quadraticCurveTo(0, -r * 0.72, -r * 0.26, -r * 0.82);
      ctx.fill();
      fTopHat(0, -r * 1.3, r * 0.75, "#ff3b4a", lw * 0.6, -0.15);
    },

    mirrorrm(f, r, t, lw, ft, hpK) {
      // cape
      const cape = new Path2D();
      cape.moveTo(-r * 0.55, -r * 0.85);
      cape.quadraticCurveTo(-r * 1.4, 0, -r * 1.05 + Math.sin(t * 2) * r * 0.1, ft - r * 0.05);
      cape.lineTo(r * 1.05 + Math.sin(t * 2 + 1) * r * 0.1, ft - r * 0.05);
      cape.quadraticCurveTo(r * 1.4, 0, r * 0.55, -r * 0.85);
      cape.closePath();
      fBody(cape, vgrad("#d62839", "#5a0f1f", -r, r * 1.2), r * 1.4, lw);
      for (const s of [-1, 1]) {
        limb([[s * r * 0.2, r * 0.95], [s * r * 0.24, ft - r * 0.1]], r * 0.12, "#1a1024", lw * 0.4);
        const boot = new Path2D();
        boot.roundRect(s * r * 0.24 - r * 0.2, ft - r * 0.14, r * 0.34, r * 0.14, r * 0.04);
        fPaint(boot, "#1a1024", lw * 0.6);
      }
      // the body is a standing mirror
      const fr = new Path2D();
      fr.moveTo(-r * 0.62, r * 1.0);
      fr.lineTo(-r * 0.62, -r * 0.5);
      fr.arc(0, -r * 0.5, r * 0.62, Math.PI, 0);
      fr.lineTo(r * 0.62, r * 1.0);
      fr.closePath();
      ctx.fillStyle = vgrad("#e6f7ff", "#7fa8c4", -r * 1.1, r);
      ctx.fill(fr);
      ctx.save();
      ctx.clip(fr);
      const tones = ["rgba(255,255,255,0.35)", "rgba(40,70,110,0.28)", "rgba(143,233,255,0.3)", "rgba(20,30,60,0.25)"];
      const pts = [[-0.7, -1.2], [0.1, -1.2], [0.7, -0.6], [0.7, 0.3], [0.2, 1.1], [-0.7, 1.1], [-0.7, 0]];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        ctx.fillStyle = tones[i % 4];
        ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(p[0] * r, p[1] * r); ctx.lineTo(q[0] * r, q[1] * r); ctx.fill();
      });
      const sx = ((t * 0.5) % 2) * r * 3 - r * 2;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.moveTo(sx, -r * 1.3); ctx.lineTo(sx + r * 0.35, -r * 1.3); ctx.lineTo(sx - r * 0.4, r * 1.3); ctx.lineTo(sx - r * 0.75, r * 1.3); ctx.fill();
      ctx.restore();
      fEyes("spiral", r * 0.26, -r * 0.5, r * 0.85, t, "#fff", "#d62839");
      fMouth(false, -r * 0.5, r * 0.75, "#d62839", lw);
      // it cracks as it gets hurt
      const cracks = Math.round((1 - hpK) * 7);
      ctx.strokeStyle = "rgba(20,10,30,0.85)";
      ctx.lineWidth = lw * 0.5;
      for (let i = 0; i < cracks; i++) {
        let px = (hashN(i * 3.1) - 0.5) * r * 0.9, py = (hashN(i * 7.7) - 0.5) * r * 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (hashN(i * 11 + k) - 0.5) * r * 0.4; py += (hashN(i * 13 + k) - 0.3) * r * 0.35; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 2.6;
      ctx.stroke(fr);
      ctx.strokeStyle = "#e8b923";
      ctx.lineWidth = lw * 1.6;
      ctx.stroke(fr);
      ctx.strokeStyle = "#fff1b0";
      ctx.lineWidth = lw * 0.4;
      ctx.stroke(fr);
      for (const s of [-1, 1]) {
        const hx = s * r * 1.0, hy = r * 0.15 + Math.sin(t * 2 + s) * r * 0.05;
        limb([[s * r * 0.62, -r * 0.35], [s * r * 0.95, -r * 0.1], [hx, hy]], r * 0.14, "#b02a42", lw * 0.4);
        const gl = new Path2D();
        gl.arc(hx, hy + r * 0.06, r * 0.12, 0, Math.PI * 2);
        fPaint(gl, "#ffffff", lw * 0.6);
      }
      // cane
      ctx.strokeStyle = FINK;
      ctx.lineWidth = r * 0.09;
      ctx.beginPath(); ctx.moveTo(-r * 1.0, r * 0.2); ctx.lineTo(-r * 1.15, ft - r * 0.03); ctx.stroke();
      ctx.fillStyle = "#e8b923";
      ctx.beginPath(); ctx.arc(-r * 1.0, r * 0.14, r * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fTopHat(0, -r * 1.1, r * 0.8, "#d62839", lw, 0.08);
    },

    comet(f, r, t, lw, ft) {
      // hair of fire, streaming back
      for (let layer = 0; layer < 3; layer++) {
        const p = new Path2D(), L2 = r * (2.6 - layer * 0.6), wd = r * (1.0 - layer * 0.22);
        p.moveTo(0, -wd);
        for (let k = 1; k <= 10; k++) {
          const kk = k / 10;
          p.lineTo(kk * L2 + Math.sin(t * 9 + k * 1.3 + layer) * r * 0.12, -wd * (1 - kk) - kk * r * 0.5 + (k % 2 ? -1 : 1) * r * 0.14 * (1 - kk));
        }
        for (let k = 10; k >= 1; k--) {
          const kk = k / 10;
          p.lineTo(kk * L2 * 0.92 + Math.sin(t * 8 + k * 1.7 + layer) * r * 0.12, wd * (1 - kk) - kk * r * 0.3 + (k % 2 ? 1 : -1) * r * 0.14 * (1 - kk));
        }
        p.lineTo(0, wd);
        p.closePath();
        fPaint(p, ["#d62839", "#ff8a3d", "#ffd23f"][layer], layer ? lw * 0.5 : lw);
      }
      glow(0, 0, r * 2, "#ff8a3d", 0.3);
      const head = new Path2D();
      head.arc(0, 0, r, 0, Math.PI * 2);
      fBody(head, "#fff1c2", r, lw);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.36, -r * 0.6); ctx.lineTo(s * r * 0.36 + r * 0.14, -r * 0.2); ctx.lineTo(s * r * 0.36, r * 0.18); ctx.lineTo(s * r * 0.36 - r * 0.14, -r * 0.2);
        ctx.fill();
      }
      fEyes("spiral", r * 0.36, -r * 0.2, r, t, "#fff", FINK);
      fMouth(false, -r * 0.2, r, "#d62839", lw);
      fNose(0, r * 0.02, r * 0.13, lw);
      fCone(-r * 0.15, -r * 0.93, r * 0.7, "#ff8a3d", lw, -0.2);
      for (let i = 0; i < 7; i++) {
        const sc = new Path2D();
        sc.arc((i - 3) * r * 0.27, r * 0.95 - Math.abs(i - 3) * r * 0.07, r * 0.17, 0, Math.PI);
        sc.closePath();
        fPaint(sc, i % 2 ? "#ff8a3d" : "#fbf8f2", lw * 0.7);
      }
    },

    usher(f, r, t, lw, ft) {
      // flashlight beam
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const bg3 = ctx.createLinearGradient(-r * 0.9, r * 0.1, -r * 3.2, r * 0.9);
      bg3.addColorStop(0, "rgba(143,233,255,0.45)");
      bg3.addColorStop(1, "rgba(143,233,255,0)");
      ctx.fillStyle = bg3;
      const sw = Math.sin(t * 1.2) * r * 0.3;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.1); ctx.lineTo(-r * 3.4, r * 0.3 + sw); ctx.lineTo(-r * 3.2, r * 1.3 + sw); ctx.fill();
      ctx.restore();
      const body = new Path2D();
      body.moveTo(-r * 0.55, -r * 0.75);
      body.lineTo(r * 0.55, -r * 0.75);
      body.quadraticCurveTo(r * 0.8, r * 0.3, r * 0.6, ft);
      body.lineTo(-r * 0.6, ft);
      body.quadraticCurveTo(-r * 0.8, r * 0.3, -r * 0.55, -r * 0.75);
      ctx.fillStyle = "#080414";
      ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      // a window onto deep space
      glow(-r * 0.2, r * 0.1, r * 0.9, "#8a3dff", 0.35);
      glow(r * 0.3, r * 0.7, r * 0.7, "#2fb7c9", 0.3);
      for (let i = 0; i < 26; i++) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i * 2.1));
        sparkle((hashN(i) - 0.5) * r * 1.3, -r * 0.7 + hashN(i + 30) * (ft + r * 0.7), r * 0.025 * (1 + a), `rgba(255,255,255,${a})`);
      }
      ctx.restore();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.8;
      ctx.stroke(body);
      ctx.strokeStyle = "#8fe9ff";
      ctx.lineWidth = lw * 0.6;
      ctx.stroke(body);
      ctx.fillStyle = "#ffd23f";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, -r * 0.5 + i * r * 0.3, r * 0.06, 0, Math.PI * 2); ctx.fill(); }
      for (const s of [-1, 1]) {
        ctx.strokeStyle = "#8fe9ff";
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath(); ctx.ellipse(s * r * 0.55, -r * 0.72, r * 0.26, r * 0.1, s * 0.3, 0, Math.PI * 2); ctx.stroke();
      }
      limb([[-r * 0.55, -r * 0.4], [-r * 0.95, -r * 0.05], [-r * 0.85, r * 0.12]], r * 0.14, "#080414", lw * 0.4);
      const tor = new Path2D();
      tor.roundRect(-r * 1.08, r * 0.02, r * 0.34, r * 0.16, r * 0.04);
      fPaint(tor, "#cfc6d8", lw * 0.6);
      // no face: just eyes in the dark under the cap
      ctx.fillStyle = "#080414";
      ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.36, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      fEyes("many", 0, -r * 0.93, r * 0.62, t, "#8fe9ff", "#080414");
      fPillbox(0, -r * 1.18, r * 0.9, "#1a1230", lw);
    },

    angel(f, r, t, lw, ft) {
      // wings made of TV static
      for (const s of [-1, 1]) {
        for (let k = 0; k < 6; k++) {
          ctx.save();
          ctx.scale(s, 1);
          ctx.translate(r * 0.45, -r * 0.15);
          ctx.rotate(-1.0 + k * 0.34 + Math.sin(t * 5) * 0.1 * (1 - k * 0.1));
          const fe = new Path2D();
          fe.roundRect(0, -r * 0.13, r * (1.9 - k * 0.2), r * 0.26, r * 0.13);
          ctx.fillStyle = "#cfd6e6";
          ctx.fill(fe);
          ctx.save();
          ctx.clip(fe);
          noiseRect(0, -r * 0.13, r * 1.9, r * 0.26, 16, false);
          ctx.restore();
          ctx.strokeStyle = FINK;
          ctx.lineWidth = lw * 0.8;
          ctx.stroke(fe);
          ctx.restore();
        }
      }
      const body = new Path2D();
      body.moveTo(-r * 0.9, 0);
      body.arc(0, 0, r * 0.9, Math.PI, 0);
      for (let k = 0; k <= 12; k++) { const kk = k / 12; body.lineTo(r * 0.9 * (1 - kk) + Math.sin(t * 3 + kk * 6) * r * 0.13, kk * r * 1.5); }
      for (let k = 12; k >= 0; k--) { const kk = k / 12; body.lineTo(-r * 0.9 * (1 - kk) + Math.sin(t * 3 + kk * 6 + 1) * r * 0.13, kk * r * 1.5); }
      body.closePath();
      fBody(body, vgrad("#ffffff", "#b9c8ea", -r, r * 1.4), r, lw);
      fHalo(-r * 0.88, r, "#8fe9ff", t);
      fEyes("x", r * 0.33, -r * 0.2, r, t, "#fff", "#2a6f86");
      const mo = new Path2D();
      mo.ellipse(0, r * 0.22, r * 0.12, r * (0.12 + 0.06 * Math.sin(t * 6)), 0, 0, Math.PI * 2);
      fPaint(mo, "#2a6f86", lw * 0.7);
      for (const s of [-1, 1]) {
        const hd = new Path2D();
        hd.ellipse(s * r * 0.1, r * 0.6, r * 0.14, r * 0.2, s * 0.5, 0, Math.PI * 2);
        fPaint(hd, "#ffffff", lw * 0.7);
      }
      if (Math.sin(t * 9) > 0.8) { ctx.fillStyle = "rgba(143,233,255,0.4)"; ctx.fillRect(-r * 1.2, Math.sin(t * 40) * r, r * 2.4, r * 0.08); }
    },

    trapeze(f, r, t, lw, ft, hpK, topY) {
      // hanging by the knees, swinging
      const sw = Math.sin(t * 1.5) * 0.13, barY = -r * 1.25;
      ctx.strokeStyle = "#d9cdb4";
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, barY); ctx.lineTo(-r * 0.7 - sw * r * 4, topY);
      ctx.moveTo(r * 0.7, barY); ctx.lineTo(r * 0.7 - sw * r * 4, topY);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, barY);
      ctx.rotate(sw);
      const bar = new Path2D();
      bar.roundRect(-r * 0.9, -r * 0.06, r * 1.8, r * 0.12, r * 0.06);
      fPaint(bar, "#c9a227", lw * 0.7);
      for (const s of [-1, 1]) limb([[s * r * 0.22, r * 0.45], [s * r * 0.26, r * 0.0], [s * r * 0.3, -r * 0.3], [s * r * 0.22, -r * 0.55]], r * 0.17, "#ffd6e8", lw * 0.5);
      // ponytail and arms hang past the head
      ctx.fillStyle = "#5b2a86";
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 1.85);
      ctx.quadraticCurveTo(-r * 0.35 - sw * r * 2, r * 2.4, -sw * r * 3, r * 2.75);
      ctx.quadraticCurveTo(r * 0.35 - sw * r * 2, r * 2.4, r * 0.2, r * 1.85);
      ctx.fill();
      ctx.stroke();
      for (const s of [-1, 1]) {
        const ax = s * r * 0.62 - sw * r * 2.5 - (s < 0 ? r * 0.25 : 0);
        limb([[s * r * 0.4, r * 1.0], [s * r * 0.6, r * 1.6], [ax, r * 2.25 + Math.sin(t * 2 + s) * r * 0.06]], r * 0.14, "#ffd6e8", lw * 0.5);
      }
      const torso = new Path2D();
      torso.moveTo(-r * 0.36, r * 0.35);
      torso.quadraticCurveTo(-r * 0.55, r * 0.9, -r * 0.42, r * 1.2);
      torso.lineTo(r * 0.42, r * 1.2);
      torso.quadraticCurveTo(r * 0.55, r * 0.9, r * 0.36, r * 0.35);
      torso.closePath();
      ctx.fillStyle = "#5b2a86";
      ctx.fill(torso);
      ctx.save();
      ctx.clip(torso);
      ctx.fillStyle = "#ff5fa8";
      for (let i = -2; i <= 2; i++) for (let k = 0; k < 4; k++) {
        if ((i + k) % 2) continue;
        const dx = i * r * 0.2, dy = r * (0.45 + k * 0.22);
        ctx.beginPath(); ctx.moveTo(dx, dy - r * 0.11); ctx.lineTo(dx + r * 0.1, dy); ctx.lineTo(dx, dy + r * 0.11); ctx.lineTo(dx - r * 0.1, dy); ctx.fill();
      }
      ctx.restore();
      fShade(torso, r * 0.6, -r * 0.2, r * 0.6);
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(torso);
      // head, upside down
      ctx.save();
      ctx.translate(0, r * 1.55);
      ctx.rotate(Math.PI);
      const head = new Path2D();
      head.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      fBody(head, "#ffe4ef", r * 0.42, lw, r * 0.1, r * 0.15);
      fEyes("tear", r * 0.16, -r * 0.05, r * 0.48, -t, "#5b2a86");
      fMouth(true, -r * 0.08, r * 0.4, "#d62839", lw);
      fCrown(0, -r * 0.36, r * 0.5, "#ff5fa8", lw * 0.8);
      ctx.restore();
      ctx.restore();
    },

    mother(f, r, t, lw, ft) {
      // cables
      for (let i = 0; i < 6; i++) {
        const sx = (i - 2.5) * r * 0.32, pts = [[sx, r * 0.55]];
        for (let k = 1; k <= 10; k++) {
          const kk = k / 10;
          pts.push([sx + Math.sin(t * 2 + i + kk * 5) * r * 0.3 * kk + (i - 2.5) * r * 0.24 * kk, r * 0.55 + kk * (ft - r * 0.6)]);
        }
        limb(pts, r * 0.13, i % 2 ? "#2b2140" : "#3a2f52", lw * 0.4);
        const e = pts[pts.length - 1];
        const plug = new Path2D();
        plug.roundRect(e[0] - r * 0.11, e[1] - r * 0.07, r * 0.22, r * 0.16, r * 0.04);
        fPaint(plug, "#cfc6d8", lw * 0.6);
      }
      // two little TVs on stalks
      for (const s of [-1, 1]) {
        const tx = s * r * 1.55, ty = -r * 0.3 + Math.sin(t * 1.8 + s) * r * 0.15;
        limb([[s * r * 0.9, r * 0.1], [s * r * 1.3, r * 0.25], [tx, ty + r * 0.2]], r * 0.08, "#2b2140", lw * 0.4);
        const tv2 = new Path2D();
        tv2.roundRect(tx - r * 0.3, ty - r * 0.22, r * 0.6, r * 0.44, r * 0.07);
        fPaint(tv2, "#3a2f52", lw * 0.8);
        ctx.fillStyle = "#0c1410";
        ctx.fillRect(tx - r * 0.23, ty - r * 0.16, r * 0.46, r * 0.32);
        noiseRect(tx - r * 0.23, ty - r * 0.16, r * 0.46, r * 0.32, 8, true);
        ctx.fillStyle = "#b6ff5c";
        ctx.beginPath(); ctx.arc(tx, ty, r * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0c1410";
        ctx.beginPath(); ctx.arc(tx - s * r * 0.03, ty, r * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      // rabbit ears
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75); ctx.lineTo(-r * 0.75, -r * 1.55);
      ctx.moveTo(0, -r * 0.75); ctx.lineTo(r * 0.65, -r * 1.6);
      ctx.stroke();
      ctx.strokeStyle = "#cfc6d8";
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      ctx.fillStyle = "#cfc6d8";
      ctx.beginPath(); ctx.arc(-r * 0.75, -r * 1.55, r * 0.07, 0, Math.PI * 2); ctx.arc(r * 0.65, -r * 1.6, r * 0.07, 0, Math.PI * 2); ctx.fill();
      const box = new Path2D();
      box.roundRect(-r * 1.05, -r * 0.78, r * 2.1, r * 1.5, r * 0.2);
      fBody(box, vgrad("#4a3a6a", "#241a3a", -r * 0.8, r * 0.75), r * 1.4, lw);
      // the screen bulges a little
      const scr = new Path2D();
      scr.moveTo(-r * 0.88, -r * 0.55);
      scr.quadraticCurveTo(-r * 0.15, -r * 0.7, r * 0.55, -r * 0.55);
      scr.quadraticCurveTo(r * 0.64, 0, r * 0.55, r * 0.52);
      scr.quadraticCurveTo(-r * 0.15, r * 0.64, -r * 0.88, r * 0.52);
      scr.quadraticCurveTo(-r * 0.96, 0, -r * 0.88, -r * 0.55);
      ctx.fillStyle = "#0c1410";
      ctx.fill(scr);
      ctx.save();
      ctx.clip(scr);
      noiseRect(-r * 0.95, -r * 0.7, r * 1.6, r * 1.35, 70, true);
      glow(-r * 0.15, 0, r, "#a6d94a", 0.25);
      ctx.save();
      ctx.translate(-r * 0.16, 0);
      fEyes("many", 0, -r * 0.1, r * 0.95, t, "#d4ff7a", "#0c1410");
      ctx.fillStyle = "#d4ff7a";
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.2);
      ctx.quadraticCurveTo(0, r * 0.58, r * 0.5, r * 0.2);
      ctx.quadraticCurveTo(0, r * 0.38, -r * 0.5, r * 0.2);
      ctx.fill();
      ctx.fillStyle = "#0c1410";
      for (let k = -3; k <= 3; k++) ctx.fillRect(k * r * 0.12 - r * 0.01, r * 0.24, r * 0.025, r * 0.2);
      ctx.restore();
      ctx.fillStyle = "rgba(212,255,122,0.22)";
      ctx.fillRect(-r, -r * 0.7 + ((t * 0.5) % 1) * r * 1.4, r * 2, r * 0.1);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.3, r * 0.3, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = FINK;
      ctx.lineWidth = lw;
      ctx.stroke(scr);
      for (let k = 0; k < 2; k++) {
        const dl = new Path2D();
        dl.arc(r * 0.82, -r * 0.4 + k * r * 0.34, r * 0.11, 0, Math.PI * 2);
        fPaint(dl, "#cfc6d8", lw * 0.7);
        ctx.strokeStyle = FINK;
        ctx.beginPath(); ctx.moveTo(r * 0.82, -r * 0.4 + k * r * 0.34); ctx.lineTo(r * 0.82 + Math.cos(t + k * 2) * r * 0.09, -r * 0.4 + k * r * 0.34 + Math.sin(t + k * 2) * r * 0.09); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(20,10,30,0.8)";
      ctx.lineWidth = lw * 0.5;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.3 + k * r * 0.08); ctx.lineTo(r * 0.94, r * 0.3 + k * r * 0.08); ctx.stroke(); }
      fCrown(0, -r * 0.82, r * 0.6, "#a6d94a", lw);
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
    if (o.hurt) ctx.filter = "brightness(2.2) saturate(0.3)";
    if (f.charge) glow(x, y, r * 2.5, "#ffd23f", 0.25 + 0.2 * Math.sin(t * 12));
    ctx.translate(x, y);
    // a slow breath
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
        else hits.push({ j, ...D.drawJinx(j, x, y, { t, walk: j.moving, dir: j.dir, selected: G.selected === j.id, happy: j.happyT > 0, look: lookAt(G.pointer, x, y), hop: j.hopT > 0 ? Math.sin((1 - j.hopT) * Math.PI) * 28 * U : 0, spin: j.spinT > 0 ? (1 - j.spinT) * Math.PI * 2 : 0, sleep: j.sleep }) });
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

  // helpers for stage.js, which draws the battle stage
  D._ = { ctx: () => ctx, glow, sparkle, heart, drawBg, particlesStep, planet, tent, lights, rng, mix, rgb };

  D.clear = function () {
    D.particles.length = 0;
    D.floats.length = 0;
  };
})();
