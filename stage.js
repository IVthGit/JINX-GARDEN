// Jinx Garden: the battle stage. A backdrop for each act, the crowd, attack animations, impacts and Showstoppers.
(function () {
  const D = JG.draw, X = D._;
  const FX = (D.fx = {});
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 3.7) * 43758.5453; return x - Math.floor(x); };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const INK = "#140a1e";
  let c, W, H, U;                       // set at the top of every frame
  let shots = [], throws = [], words = [], bursts = [], puffs = [];
  let shake = 0, stopUntil = 0, flashT = 0, stageT = 0, show = null, lastB = null;
  let cache = {};
  const SCALE = 2.25, FOE_SCALE = 1.45;   // fighters are drawn bigger on stage than in the garden
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (cache = {}));

  function reset() {
    shots = []; throws = []; words = []; bursts = []; puffs = [];
    shake = 0; stopUntil = 0; flashT = 0; show = null;
  }

  // ---------- what the game asks for ----------
  const MELEE = { punch: 1, smash: 1, dive: 1 };
  const DUR = { punch: 0.15, smash: 0.17, dive: 0.26, pie: 0.36, chicken: 0.38, stars: 0.26, spray: 0.26, wave: 0.3, cannon: 0.3, beam: 0.34,
    goo: 0.36, popcorn: 0.32, zap: 0.2, tickets: 0.3, notes: 0.36, glass: 0.32, fireball: 0.3, static: 0.34, dark: 0.32 };
  const ARC = { pie: 0.22, chicken: 0.28, stars: 0.35, goo: 0.3, popcorn: 0.3, glass: 0.25, tickets: 0.12, fireball: 0.04, cannon: 0.03 };
  const LINE = { beam: 1, zap: 1, static: 1, dark: 1, spray: 1, wave: 1 };
  const WORDS = { punch: ["POW!", "BAP!"], smash: ["BONK!", "WHAM!"], dive: ["CRASH!", "OOF!"], pie: ["SPLAT!"], chicken: ["SQUAWK!"], stars: ["ZING!"],
    spray: ["FSSSH!"], wave: ["HONK!"], cannon: ["KABOOM!"], beam: ["ZAAAP!"], goo: ["SPLORT!"], popcorn: ["POP!"], zap: ["BZZT!"], tickets: ["RIP!"],
    notes: ["TOOT!"], glass: ["SMASH!"], fireball: ["FWOOM!"], static: ["KSSHH!"], dark: ["VWORP!"] };

  // Starts an attack animation. The promise resolves at the moment it lands.
  FX.attack = function (style, from, B) {
    if (!DUR[style]) style = "punch";
    const t = now(), dur = DUR[style];
    B.lastStyle = style;
    if (MELEE[style]) B.anim[from + (style === "dive" ? "Dive" : "Lunge")] = t;
    else {
      B.anim[from + "Cast"] = t;
      shots.push({ style, from, t0: t, dur, seed: Math.random() * 100 });
    }
    return JG.fast ? Promise.resolve() : new Promise((res) => setTimeout(res, dur * 1000));
  };
  FX.impact = function (target, dmg, B) {
    const t = now(), style = B.lastStyle || "punch";
    if (!reduced) shake = Math.max(shake, Math.min(18, 3 + dmg * 0.7));
    stopUntil = t + (dmg >= 15 ? 0.11 : dmg >= 8 ? 0.07 : 0.035);
    if (dmg >= 15 && !reduced) flashT = t;
    bursts.push({ target, t0: t, big: dmg >= 15 });
    if (dmg >= 10) words.push({ target, text: pick(WORDS[style] || WORDS.punch), t0: t, rot: (Math.random() - 0.5) * 0.5, big: dmg >= 15 });
  };
  FX.heal = (target) => puffs.push({ kind: "heal", target, t0: now() });
  FX.guard = (target) => puffs.push({ kind: "guard", target, t0: now() });
  // The crowd throws roses onto the stage.
  FX.cheer = function (B, n) {
    B.anim.cheer = now();
    const P = D.stagePos(), y0 = B.crowdY || H * 0.8;
    for (let i = 0; i < n; i++) {
      throws.push({ kind: "rose", x0: Math.random() * W, y0, x1: P.px + (Math.random() - 0.3) * (P.fx - P.px) * 0.7, y1: P.feet + (4 + Math.random() * 26) * U,
        t0: now() + Math.random() * 0.5, dur: 0.55 + Math.random() * 0.25, rot: Math.random() * 6 });
    }
  };
  FX.heckle = function (B) {
    B.anim.heckle = now();
    const y0 = B.crowdY || H * 0.8;
    for (let i = 0; i < 4; i++) throws.push({ kind: "tomato", x0: W * (0.2 + Math.random() * 0.6), y0, target: "p", t0: now() + i * 0.12, dur: 0.45, rot: 0 });
  };
  // Plays the big full-screen moment. Resolves when the hit should land.
  FX.showstopper = function (form, B) {
    show = { form, t0: now(), B };
    B.anim.show = show.t0;
    B.lastStyle = form === "sludge" ? "goo" : form === "stardust" ? "beam" : form === "pierrot" ? "wave" : "stars";
    return JG.fast ? Promise.resolve() : new Promise((res) => setTimeout(res, reduced ? 500 : 1300));
  };

  function actor(B, side) {
    const s = B.screen && B.screen[side];
    if (s) return s;
    const P = D.stagePos();
    return { x: side === "p" ? P.px : P.fx, y: P.feet - 50 * U, r: 40 * U };
  }

  // ---------- cached static layers ----------
  function layer(key, build) {
    const full = key + ":" + c.canvas.width + "x" + c.canvas.height;
    if (cache[key] && cache[key].k === full) return cache[key].cv;
    const cv = document.createElement("canvas");
    cv.width = c.canvas.width;
    cv.height = c.canvas.height;
    const g = cv.getContext("2d"), dpr = c.canvas.width / W;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(g);
    cache[key] = { k: full, cv };
    return cv;
  }
  // lay a finished piece of scenery onto a layer with a white cut edge and a paper shadow
  function stampFlat(g, tmp, e) {
    const dpr = c.canvas.width / W, sil = document.createElement("canvas");
    sil.width = tmp.width;
    sil.height = tmp.height;
    const sg = sil.getContext("2d");
    sg.drawImage(tmp, 0, 0);
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = "#fbf8f2";
    sg.fillRect(0, 0, sil.width, sil.height);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowColor = "rgba(8,3,16,0.55)";
    g.shadowOffsetX = 6 * U * dpr;
    g.shadowOffsetY = -3 * U * dpr;
    g.drawImage(sil, 0, 0);
    g.shadowColor = "transparent";
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.drawImage(sil, Math.cos(a) * e * dpr, Math.sin(a) * e * dpr); }
    g.drawImage(tmp, 0, 0);
    g.restore();
  }
  // ---- the toy theatre itself: side wings and the front ledge the puppet sticks vanish behind ----
  const SETS = [
    { card: "#b98d5c", dark: "#8a623a", a: "#d62839", b: "#efe6d2", trim: "#ffd23f" },
    { card: "#1f5560", dark: "#0e2f36", a: "#e8b923", b: "#0b2228", trim: "#8fe9ff" },
    { card: "#191026", dark: "#0a0612", a: "#b6ff5c", b: "#ff4fa3", trim: "#8fe9ff" }
  ];
  function buildTheatre(g, act, y0) {
    const S = SETS[act - 1], ww = clamp(W * 0.045, 22 * U, 58 * U), neon = act === 3, r = X.rng(50 + act);
    const corrug = (x, y, w, h, vertical) => {
      g.fillStyle = S.dark;
      g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(255,255,255,0.22)";
      g.lineWidth = 1;
      g.beginPath();
      const n = Math.floor((vertical ? h : w) / (5 * U));
      for (let i = 0; i < n; i++) {
        if (vertical) { const yy = y + i * 5 * U; g.moveTo(x, yy); g.quadraticCurveTo(x + w / 2, yy + 3 * U, x + w, yy); }
        else { const xx = x + i * 5 * U; g.moveTo(xx, y); g.quadraticCurveTo(xx + 3 * U, y + h / 2, xx, y + h); }
      }
      g.stroke();
    };
    const tape = (x, y, ang) => {
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.fillStyle = neon ? "rgba(182,255,92,0.5)" : "rgba(233,211,164,0.72)";
      g.fillRect(-22 * U, -7 * U, 44 * U, 14 * U);
      g.restore();
    };
    for (const side of [0, 1]) {
      g.save();
      if (side) { g.translate(W, 0); g.scale(-1, 1); }
      g.shadowColor = "rgba(8,3,16,0.6)";
      g.shadowBlur = 10 * U;
      g.shadowOffsetX = side ? -6 * U : 6 * U;
      const wing = new Path2D();
      wing.moveTo(0, 0);
      wing.lineTo(ww, 0);
      for (let y = 0; y <= H; y += 46 * U) wing.quadraticCurveTo(ww + 12 * U, y + 23 * U, ww, y + 46 * U);
      wing.lineTo(0, H + 50);
      wing.closePath();
      g.fillStyle = "#fbf8f2";
      g.fill(wing);
      g.shadowColor = "transparent";
      g.save();
      g.clip(wing);
      g.fillStyle = S.card;
      g.fillRect(0, 0, ww * 1.5, H);
      // hand-painted stripes that don't quite stay inside the lines
      for (let y = -20 * U, i = 0; y < H; y += 34 * U, i++) {
        g.fillStyle = i % 2 ? S.a : S.b;
        g.globalAlpha = neon ? 0.9 : 0.82;
        g.beginPath();
        g.moveTo(0, y + r() * 4 * U);
        g.lineTo(ww * 1.5, y - 12 * U + r() * 4 * U);
        g.lineTo(ww * 1.5, y + 5 * U + r() * 4 * U);
        g.lineTo(0, y + 17 * U + r() * 4 * U);
        g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`; g.fillRect(r() * ww * 1.3, r() * H, 1 + r() * 3, 1 + r() * 2); }
      g.restore();
      g.strokeStyle = "#fbf8f2";
      g.lineWidth = 3 * U;
      g.stroke(wing);
      g.strokeStyle = INK;
      g.lineWidth = 1.2;
      g.stroke(wing);
      g.restore();
    }
    // the ledge
    g.save();
    g.shadowColor = "rgba(8,3,16,0.65)";
    g.shadowBlur = 12 * U;
    g.shadowOffsetY = -5 * U;
    g.fillStyle = "#fbf8f2";
    g.fillRect(-10, y0 - 3 * U, W + 20, H - y0 + 20);
    g.restore();
    g.fillStyle = S.card;
    g.fillRect(0, y0, W, H - y0);
    corrug(0, y0, W, 7 * U, false);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.1})`; g.fillRect(r() * W, y0 + 8 * U + r() * (H - y0), 2 + r() * 8, 1 + r() * 2); }
    const seg = 38 * U;
    for (let x = -seg / 2, i = 0; x < W + seg; x += seg, i++) {
      g.fillStyle = "#fbf8f2";
      g.beginPath(); g.arc(x, y0 + 7 * U, seg / 2 + 2.5 * U, 0, Math.PI); g.fill();
      g.fillStyle = i % 2 ? S.a : S.b;
      g.beginPath(); g.arc(x, y0 + 7 * U, seg / 2, 0, Math.PI); g.fill();
      g.fillStyle = S.trim;
      g.beginPath(); g.arc(x, y0 + 7 * U + seg / 2 + 3 * U, 3.2 * U, 0, Math.PI * 2); g.fill();
    }
    tape(ww + 20 * U, y0 + 4 * U, -0.2);
    tape(W - ww - 20 * U, y0 + 4 * U, 0.16);
    tape(ww * 0.5, 30 * U, 1.2);
    tape(W - ww * 0.5, 34 * U, -1.1);
    // brads
    for (const [bx, by] of [[ww * 0.5, H * 0.3], [W - ww * 0.5, H * 0.34]]) {
      g.fillStyle = INK; g.beginPath(); g.arc(bx, by, 6 * U, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e8b923"; g.beginPath(); g.arc(bx, by, 4.4 * U, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(bx - 1.5 * U, by - 1.5 * U, 1.4 * U, 0, Math.PI * 2); g.fill();
    }
  }
  function theatre(B) {
    const y0 = Math.round((B.crowdY || H * 0.8) - 30 * U);
    c.drawImage(layer("set" + B.act + ":" + y0, (g) => buildTheatre(g, B.act, y0)), 0, 0, W, H);
  }
  // a lollipop stick holding a puppet up from below
  function stick(x, top) {
    const w = 7 * U;
    c.fillStyle = INK;
    c.fillRect(x - w / 2 - 1.5 * U, top, w + 3 * U, H - top);
    c.fillStyle = "#d9b77a";
    c.fillRect(x - w / 2, top, w, H - top);
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.fillRect(x - w / 2, top, w * 0.3, H - top);
    c.fillStyle = "rgba(90,60,30,0.3)";
    for (let y = top + 14 * U; y < H; y += 26 * U) c.fillRect(x - w / 2, y, w, 1.5 * U);
  }
  function checker(g, hz, tone) {
    const rows = 9, cols = 14;
    for (let r = 0; r < rows; r++) {
      const y0 = hz + Math.pow(r / rows, 1.8) * (H - hz), y1 = hz + Math.pow((r + 1) / rows, 1.8) * (H - hz);
      const w0 = 0.6 + (r / rows) * 0.9, w1 = 0.6 + ((r + 1) / rows) * 0.9;
      for (let k = 0; k < cols; k++) {
        if ((k + r) % 2) continue;
        const xa0 = W / 2 + (k / cols - 0.5) * W * w0 * 1.6, xb0 = W / 2 + ((k + 1) / cols - 0.5) * W * w0 * 1.6;
        const xa1 = W / 2 + (k / cols - 0.5) * W * w1 * 1.6, xb1 = W / 2 + ((k + 1) / cols - 0.5) * W * w1 * 1.6;
        g.fillStyle = X.rgb(tone, 0.07 + (r / rows) * 0.14);
        g.beginPath();
        g.moveTo(xa0, y0); g.lineTo(xb0, y0); g.lineTo(xb1, y1); g.lineTo(xa1, y1);
        g.fill();
      }
    }
  }

  // ---------- Act I: The Midway ----------
  function buildMidway(g, hz) {
    const r = X.rng(101);
    const gg = g.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, "#2b1612");
    gg.addColorStop(0.45, "#3f2417");
    gg.addColorStop(1, "#170b09");
    g.fillStyle = gg;
    g.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < 1100; i++) {
      const y = hz + Math.pow(r(), 1.4) * (H - hz), k = (y - hz) / (H - hz);
      g.fillStyle = r() < 0.5 ? `rgba(255,214,160,${0.05 + r() * 0.1})` : `rgba(0,0,0,${0.1 + r() * 0.15})`;
      g.fillRect(r() * W, y, (2 + r() * 5) * (0.5 + k), 1 + k * 1.5);
    }
    // a row of booths along the back
    const bw = Math.max(130 * U, W / 6.5), bh = Math.min(H * 0.2, bw * 0.95);
    const names = ["POPCORN", "RING TOSS", "FORTUNES", "SLUDGE-ADE", "PRIZES", "TATTOOS", "FREE HUGS", "MIRRORS"];
    const cols = [["#b52a42", "#d9cdb4"], ["#2f8f9a", "#d9cdb4"], ["#7a3fc4", "#ffd23f"], ["#6f9a22", "#1b1726"]];
    const neon = ["#ff4fa3", "#8fe9ff", "#ffd23f", "#a6d94a"];
    let i = 0;
    const base = g, tmp = document.createElement("canvas");
    tmp.width = base.canvas.width;
    tmp.height = base.canvas.height;
    g = tmp.getContext("2d");
    g.setTransform(base.getTransform());
    for (let x = -bw * 0.35; x < W; x += bw * 1.06, i++) {
      const top = hz - bh, cl = cols[i % cols.length];
      g.fillStyle = "#170c16";
      g.fillRect(x, top, bw, bh);
      const ig = g.createRadialGradient(x + bw / 2, hz - bh * 0.5, 4, x + bw / 2, hz - bh * 0.45, bw * 0.6);
      ig.addColorStop(0, "rgba(255,190,110,0.75)");
      ig.addColorStop(1, "rgba(255,150,80,0)");
      g.fillStyle = ig;
      g.fillRect(x, top, bw, bh);
      // prizes hanging inside
      for (let k = 0; k < 6; k++) {
        g.fillStyle = neon[(k + i) % 4];
        g.globalAlpha = 0.75;
        g.beginPath();
        g.arc(x + bw * (0.14 + k * 0.145), top + bh * (0.36 + (k % 2) * 0.09), bh * 0.055, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      // counter with stripes
      g.fillStyle = "#2a1522";
      g.fillRect(x, hz - bh * 0.3, bw, bh * 0.3);
      for (let k = 0; k < 10; k++) {
        if (k % 2) continue;
        g.fillStyle = X.rgb(cl[0], 0.55);
        g.fillRect(x + (k / 10) * bw, hz - bh * 0.27, bw / 10, bh * 0.27);
      }
      g.fillStyle = "#12080f";
      g.fillRect(x - 2, hz - bh * 0.32, bw + 4, bh * 0.05);
      // posts and scalloped awning
      g.fillRect(x, top, bw * 0.04, bh);
      g.fillRect(x + bw * 0.96, top, bw * 0.04, bh);
      const seg = bw / 6;
      for (let k = 0; k < 6; k++) {
        g.fillStyle = cl[k % 2];
        g.fillRect(x + k * seg, top - bh * 0.04, seg + 0.5, bh * 0.2);
        g.beginPath();
        g.arc(x + k * seg + seg / 2, top + bh * 0.16, seg / 2, 0, Math.PI);
        g.fill();
      }
      // sign
      g.fillStyle = "#12080f";
      g.fillRect(x + bw * 0.08, top - bh * 0.34, bw * 0.84, bh * 0.27);
      g.strokeStyle = X.rgb(neon[i % 4], 0.8);
      g.lineWidth = 1.5;
      g.strokeRect(x + bw * 0.1, top - bh * 0.32, bw * 0.8, bh * 0.23);
      g.font = `${Math.min(bh * 0.15, bw * 0.105)}px "Bungee", "Arial Black", sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = neon[i % 4];
      g.shadowBlur = 10;
      g.fillStyle = neon[i % 4];
      g.fillText(names[i % names.length], x + bw / 2, top - bh * 0.2);
      g.shadowBlur = 0;
    }
    stampFlat(base, tmp, 3.5 * U);
    g = base;
    const sh = g.createLinearGradient(0, hz - bh * 1.4, 0, hz);
    sh.addColorStop(0, "rgba(13,6,24,0.32)");
    sh.addColorStop(1, "rgba(13,6,24,0.05)");
    g.fillStyle = sh;
    g.fillRect(0, hz - bh * 1.4, W, bh * 1.4);
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    // soft focus on the back row: the fight is what's sharp
    g.save();
    g.beginPath(); g.rect(0, 0, W, hz + 3 * U); g.clip();
    g.filter = `blur(${(1.4 * U).toFixed(1)}px)`;
    g.drawImage(g.canvas, 0, 0, W, H);
    g.restore();
    const dim = g.createLinearGradient(0, hz - H * 0.3, 0, hz);
    dim.addColorStop(0, "rgba(10,4,22,0.3)");
    dim.addColorStop(1, "rgba(10,4,22,0.12)");
    g.fillStyle = dim;
    g.fillRect(0, 0, W, hz);
  }
  function ferris(x, y, R, st) {
    c.save();
    c.lineCap = "round";
    c.strokeStyle = "#1c1024";
    c.lineWidth = 6 * U;
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x - R * 0.5, y + R * 1.3);
    c.moveTo(x, y); c.lineTo(x + R * 0.5, y + R * 1.3);
    c.stroke();
    const a0 = st * 0.1;
    c.lineWidth = 2.5 * U;
    c.strokeStyle = "#4a2f5e";
    for (const rr of [1, 0.8, 0.3]) { c.beginPath(); c.arc(x, y, R * rr, 0, Math.PI * 2); c.stroke(); }
    for (let i = 0; i < 12; i++) {
      const a = a0 + (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      c.stroke();
    }
    const cols = ["#ff4fa3", "#ffd23f", "#8fe9ff", "#a6d94a"];
    for (let i = 0; i < 48; i++) {
      const a = a0 + (i / 48) * Math.PI * 2, on = (i + Math.floor(st * 5)) % 4 < 2;
      const bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R;
      if (on) X.glow(bx, by, 7 * U, cols[i % 4], 0.5);
      c.fillStyle = X.rgb(cols[i % 4], on ? 1 : 0.25);
      c.beginPath();
      c.arc(bx, by, 1.8 * U, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 12; i++) {
      const a = a0 + (i / 12) * Math.PI * 2;
      const gx = x + Math.cos(a) * R, gy = y + Math.sin(a) * R, gw = R * 0.15;
      c.strokeStyle = "#2c1a38";
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx, gy + gw * 0.35); c.stroke();
      c.fillStyle = ["#8f2238", "#2f6f7a", "#6a3fa0"][i % 3];
      c.beginPath();
      c.roundRect(gx - gw / 2, gy + gw * 0.35, gw, gw * 0.7, 3 * U);
      c.fill();
      c.fillStyle = "rgba(255,200,120,0.75)";
      c.fillRect(gx - gw * 0.32, gy + gw * 0.47, gw * 0.64, gw * 0.24);
    }
    X.glow(x, y, R * 0.3, "#ffd23f", 0.5);
    c.fillStyle = "#ffd23f";
    c.beginPath(); c.arc(x, y, R * 0.06, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function bunting(x0, y0, x1, y1, sag, st, seed) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
    c.strokeStyle = "rgba(20,10,30,0.9)";
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / (26 * U));
    const cols = ["#d62839", "#efe6d2", "#ffd23f", "#2f8f9a", "#ff4fa3"];
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
      const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1;
      const sw = Math.sin(st * 2.2 + i * 0.9 + seed) * 4 * U;
      c.fillStyle = cols[(i + seed) % cols.length];
      c.beginPath();
      c.moveTo(x - 9 * U, y);
      c.lineTo(x + 9 * U, y);
      c.lineTo(x + sw, y + 20 * U);
      c.fill();
    }
  }
  function midway(st, B, P, hz) {
    X.drawBg(st);
    c.save();
    c.translate(...X.par(7));
    X.eclipse(W * 0.84, H * 0.17, Math.min(W, H) * 0.05, st);
    X.planet(W * 0.1, H * 0.2, Math.min(W, H) * 0.045, st);
    c.restore();
    const hg = c.createLinearGradient(0, hz - H * 0.4, 0, hz);
    hg.addColorStop(0, "rgba(255,120,90,0)");
    hg.addColorStop(1, "rgba(255,140,90,0.3)");
    c.fillStyle = hg;
    c.fillRect(0, hz - H * 0.4, W, H * 0.4);
    // the far rides slide behind the booths as the view shifts, with a lot of night air in front of them
    const R = Math.min(H * 0.27, W * 0.2);
    c.save();
    c.translate(...X.par(13));
    ferris(W * 0.5, hz - R * 1.12, R, st);
    X.tent(W * 0.13, hz, Math.min(W * 0.3, H * 0.5), H * 0.34, st);
    c.restore();
    const air = c.createLinearGradient(0, 0, 0, hz);
    air.addColorStop(0, "rgba(10,5,24,0.5)");
    air.addColorStop(1, "rgba(40,16,40,0.3)");
    c.fillStyle = air;
    c.fillRect(0, 0, W, hz);
    X.fog(hz - H * 0.1, H * 0.1, 0.1, st, 0.01, 7, "#d9a0a8");
    c.drawImage(layer("midway", (g) => buildMidway(g, hz)), 0, 0, W, H);
    c.save();
    c.translate(...X.par(30));
    bunting(-60 * U, H * 0.04, W * 0.55, H * 0.1, H * 0.09, st, 0);
    bunting(W * 0.45, H * 0.1, W + 60 * U, H * 0.03, H * 0.1, st, 2);
    X.lights(-40 * U, H * 0.16, W + 40 * U, H * 0.14, H * 0.07, st, 5);
    c.restore();
    // the ring the fight happens in
    const cx = (P.px + P.fx) / 2, cy = P.feet + 8 * U, rx = Math.min(W * 0.48, (P.fx - P.px) * 0.85), ry = Math.max(34 * U, rx * 0.19);
    c.fillStyle = "rgba(255,205,150,0.09)";
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.lineWidth = 9 * U;
    c.strokeStyle = "#b52a42";
    c.stroke();
    c.setLineDash([16 * U, 16 * U]);
    c.strokeStyle = "#e6dcc6";
    c.stroke();
    c.restore();
    // warm motes in the air
    for (let i = 0; i < 26; i++) {
      const x = (hash(i) * W + st * (6 + hash(i + 50) * 10)) % W, y = hz - hash(i + 9) * H * 0.35 + Math.sin(st * 0.7 + i) * 8 * U;
      c.fillStyle = `rgba(255,210,150,${0.25 + 0.25 * Math.sin(st * 2 + i * 3)})`;
      c.fillRect(x, y, 2, 2);
    }
  }

  // ---------- Act II: The Hall of Warped Mirrors ----------
  function buildMirrorHall(g, hz) {
    const wg = g.createLinearGradient(0, 0, 0, hz);
    wg.addColorStop(0, "#0b2a31");
    wg.addColorStop(1, "#06161a");
    g.fillStyle = wg;
    g.fillRect(0, 0, W, hz);
    const s = 46 * U;
    for (let y = 0, row = 0; y < hz; y += s, row++) {
      for (let x = (row % 2) * s * 0.5 - s; x < W + s; x += s) {
        g.fillStyle = "rgba(47,183,201,0.075)";
        g.beginPath();
        g.moveTo(x, y - s * 0.3); g.quadraticCurveTo(x + s * 0.22, y, x, y + s * 0.3); g.quadraticCurveTo(x - s * 0.22, y, x, y - s * 0.3);
        g.fill();
        g.beginPath(); g.arc(x, y + s * 0.42, s * 0.05, 0, Math.PI * 2); g.fill();
      }
    }
    for (let x = 0; x < W; x += s * 2) { g.fillStyle = "rgba(255,255,255,0.018)"; g.fillRect(x, 0, s, hz); }
    g.fillStyle = "#040b0d";
    g.fillRect(0, hz - 20 * U, W, 20 * U);
    g.fillStyle = "#b9902e";
    g.fillRect(0, hz - 21 * U, W, 2 * U);
    g.fillStyle = "#04090c";
    g.fillRect(0, hz, W, H - hz);
    checker(g, hz, "#2fb7c9");
    const gl = g.createLinearGradient(0, hz, 0, H);
    gl.addColorStop(0, "rgba(143,233,255,0.14)");
    gl.addColorStop(0.3, "rgba(143,233,255,0)");
    g.fillStyle = gl;
    g.fillRect(0, hz, W, H - hz);
  }
  const WARPS = [[0.62, 1.3, 0], [1.4, 0.68, 0], [0.9, 1.0, 0.4], [0.55, 0.85, -0.25], [1.2, 1.25, 0.1]];
  function mirrorHall(st, B, P, hz, pos, rt) {
    const cv = layer("mirrors", (g) => buildMirrorHall(g, hz));
    c.drawImage(cv, 0, 0, W, H);
    const n = W > H * 1.1 ? 5 : 3;
    const mw = W / (n * 1.5), bot = hz - 26 * U, mh = Math.min(bot - H * 0.13, mw * 2.1);
    for (let i = 0; i < n; i++) {
      const cx = (W * (i + 0.5)) / n, x = cx - mw / 2, top = bot - mh;
      const path = new Path2D();
      path.moveTo(x, bot);
      path.lineTo(x, top + mw / 2);
      path.arc(cx, top + mw / 2, mw / 2, Math.PI, 0);
      path.lineTo(x + mw, bot);
      path.closePath();
      const mg = c.createLinearGradient(x, top, x + mw, bot);
      mg.addColorStop(0, "#24545e");
      mg.addColorStop(1, "#0b2228");
      c.fillStyle = mg;
      c.fill(path);
      c.save();
      c.clip(path);
      // the fight, bent out of shape
      const w = WARPS[i % WARPS.length], wob = 1 + Math.sin(st * 1.3 + i * 2.1) * 0.1;
      c.translate(cx, bot - mh * 0.08);
      c.transform(w[0] * wob, 0, w[2] * Math.sin(st * 0.8 + i), w[1] / wob, 0, 0);
      c.scale(0.8, 0.8);
      if (B.jinx) D.drawJinx(B.jinx, (pos.px - cx) * 0.7, 0, { t: st, dir: 1, scale: SCALE, hop: pos.pHop, flat: true });
      if (B.foe && !B.over) D.drawFoe(B.foe, (pos.fx - cx) * 0.7, pos.fy - P.feet, st, { scale: FOE_SCALE, flat: true });
      c.restore();
      c.save();
      c.clip(path);
      c.fillStyle = "rgba(9,34,40,0.5)";
      c.fill(path);
      const sx = x - mw + ((st * 0.12 + i * 0.37) % 1) * mw * 3;
      c.fillStyle = "rgba(220,250,255,0.13)";
      c.beginPath();
      c.moveTo(sx, top); c.lineTo(sx + mw * 0.3, top); c.lineTo(sx - mw * 0.3, bot); c.lineTo(sx - mw * 0.6, bot);
      c.fill();
      c.restore();
      c.lineWidth = 8 * U;
      const fg = c.createLinearGradient(x, top, x + mw, bot);
      fg.addColorStop(0, "#f2d27a");
      fg.addColorStop(0.5, "#8a6a1e");
      fg.addColorStop(1, "#e8c45a");
      c.strokeStyle = fg;
      c.stroke(path);
      c.lineWidth = 1.5;
      c.strokeStyle = "rgba(20,10,5,0.8)";
      c.stroke(path);
      c.fillStyle = "#e8c45a";
      c.beginPath(); c.arc(cx, top - 3 * U, 7 * U, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d62839";
      c.beginPath(); c.arc(cx, top - 3 * U, 3 * U, 0, Math.PI * 2); c.fill();
    }
    // candle sconces between the mirrors
    for (let i = 1; i < n; i++) {
      const x = (W * i) / n, y = bot - mh * 0.55, fl = 0.8 + 0.2 * Math.sin(st * 9 + i * 4);
      X.glow(x, y, 60 * U * fl, "#ffb36b", 0.3);
      c.fillStyle = "#8a6a1e";
      c.fillRect(x - 2 * U, y, 4 * U, 16 * U);
      c.fillStyle = "#ffe9b0";
      c.beginPath(); c.ellipse(x, y - 4 * U, 2.5 * U, 6 * U * fl, 0, 0, Math.PI * 2); c.fill();
    }
    // reflections in the polished floor: drawn solid, then the floor is laid back over them
    c.save();
    c.beginPath();
    c.rect(0, hz, W, H - hz);
    c.clip();
    c.translate(0, P.feet);
    c.scale(1, -0.75);
    c.translate(0, -P.feet);
    fighters(B, pos, st, rt, false);
    c.restore();
    c.save();
    c.globalAlpha = 0.8;
    const dpr = cv.width / W;
    c.drawImage(cv, 0, hz * dpr, cv.width, cv.height - hz * dpr, 0, hz, W, H - hz);
    c.restore();
  }

  // ---------- Act III: The Big Top Below ----------
  function debris(i, st, tint) {
    const sp = 6 + hash(i) * 14, dir = hash(i + 3) < 0.5 ? -1 : 1;
    const x = ((hash(i + 7) * (W + 200) + st * sp * dir) % (W + 200) + (W + 200)) % (W + 200) - 100;
    const y = H * (0.3 + hash(i + 11) * 0.3) + Math.sin(st * 0.5 + i) * 12 * U;
    const s = (10 + hash(i + 5) * 12) * U;
    c.save();
    c.translate(x, y);
    c.rotate(st * 0.25 * dir + i);
    c.fillStyle = "#120a22";
    c.strokeStyle = X.rgb(tint, 0.5);
    c.lineWidth = 1.2;
    const kind = i % 4;
    c.beginPath();
    if (kind === 0) {           // a folding chair
      c.rect(-s * 0.5, -s, s, s * 0.9);
      c.rect(-s * 0.55, 0, s * 1.1, s * 0.18);
      c.rect(-s * 0.5, s * 0.18, s * 0.1, s * 0.7);
      c.rect(s * 0.4, s * 0.18, s * 0.1, s * 0.7);
    } else if (kind === 1) {    // a ticket
      c.rect(-s * 0.7, -s * 0.3, s * 1.4, s * 0.6);
    } else if (kind === 2) {    // a popcorn box
      c.moveTo(-s * 0.4, -s * 0.6); c.lineTo(s * 0.4, -s * 0.6); c.lineTo(s * 0.3, s * 0.6); c.lineTo(-s * 0.3, s * 0.6); c.closePath();
    } else {                    // a lost balloon
      c.ellipse(0, 0, s * 0.5, s * 0.62, 0, 0, Math.PI * 2);
      c.moveTo(0, s * 0.62); c.lineTo(s * 0.1, s * 1.5);
    }
    c.fill();
    c.stroke();
    c.restore();
  }
  function bolt(x0, y0, x1, y1, seed, width, color) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(x0, y0);
    const n = 9, nx = -(y1 - y0), ny = x1 - x0, len = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) {
      const k = i / n, j = (hash(seed + i * 3.3) - 0.5) * 0.16;
      c.lineTo(lerp(x0, x1, k) + nx * j, lerp(y0, y1, k) + ny * j);
    }
    c.lineTo(x1, y1);
    c.stroke();
  }
  function below(st, B, P, hz) {
    X.drawBg(st);
    c.fillStyle = "rgba(6,0,18,0.55)";
    c.fillRect(0, 0, W, H);
    // far-off lightning
    const lp = (st % 6.5) / 6.5;
    if (lp < 0.05 && !reduced) {
      const sd = Math.floor(st / 6.5);
      c.fillStyle = `rgba(138,61,255,${0.22 * (1 - lp / 0.05)})`;
      c.fillRect(0, 0, W, H);
      const bx = W * (0.15 + hash(sd) * 0.7);
      bolt(bx, H * 0.3, bx + (hash(sd + 1) - 0.5) * W * 0.2, H * 0.75, sd, 2.5 * U, "rgba(220,200,255,0.9)");
    }
    // the tent, hanging upside down from above
    c.save();
    c.translate(W / 2, -H * 0.03);
    c.rotate(Math.PI);
    X.tent(0, 0, Math.min(W * 1.1, H * 1.5), H * 0.5, st);
    c.restore();
    const tg = c.createLinearGradient(0, 0, 0, H * 0.5);
    tg.addColorStop(0, "rgba(13,4,30,0.25)");
    tg.addColorStop(1, "rgba(13,4,30,0.6)");
    c.fillStyle = tg;
    c.fillRect(0, 0, W, H * 0.5);
    // static tears across it
    for (let i = 0; i < 3; i++) {
      if (Math.sin(st * (1.7 + i) + i * 5) < 0.55) continue;
      const y = hash(Math.floor(st * 3) + i * 13) * H * 0.42, hh = (4 + hash(i + Math.floor(st * 5)) * 10) * U;
      for (let k = 0; k < 46; k++) {
        const v = (100 + Math.random() * 155) | 0;
        c.fillStyle = `rgba(${v},${v},${Math.min(255, v + 40)},0.55)`;
        c.fillRect(Math.random() * W, y + Math.random() * hh, 30 * U * Math.random(), 2);
      }
    }
    // other wrecks, far off in the dark
    c.save();
    c.translate(...X.par(16));
    X.farIsle(W * 0.12, H * 0.5, 44 * U, 0.55, st, 5, 1);
    X.farIsle(W * 0.9, H * 0.4, 30 * U, 0.9, st, 6, 2);
    c.restore();
    X.fog(H * 0.56, H * 0.12, 0.08, st, 0.008, 19, "#7a5ac8");
    for (let i = 0; i < 11; i++) debris(i, st, "#8a3dff");
    X.fog(P.feet + 110 * U, 70 * U, 0.1, st, -0.01, 23, "#8a3dff");
    // a floating platform to fight on
    const cx = (P.px + P.fx) / 2, cy = P.feet + 8 * U, rx = Math.min(W * 0.49, (P.fx - P.px) * 0.95), ry = Math.max(34 * U, rx * 0.17);
    X.glow(cx, cy + ry * 2, rx * 1.3, "#8a3dff", 0.22);
    const ug = c.createLinearGradient(0, cy, 0, cy + rx * 0.6);
    ug.addColorStop(0, "#2a1648");
    ug.addColorStop(1, "rgba(18,8,36,0)");
    c.fillStyle = ug;
    c.beginPath();
    c.moveTo(cx - rx, cy);
    c.quadraticCurveTo(cx - rx * 0.4, cy + rx * 0.35, cx, cy + rx * 0.6);
    c.quadraticCurveTo(cx + rx * 0.4, cy + rx * 0.35, cx + rx, cy);
    c.fill();
    const pg = c.createRadialGradient(cx, cy - ry * 0.3, ry * 0.2, cx, cy, rx);
    pg.addColorStop(0, "#3a2462");
    pg.addColorStop(1, "#150b2a");
    c.fillStyle = pg;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.beginPath(); c.ellipse(cx, cy, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
    c.lineWidth = 5 * U;
    c.setLineDash([14 * U, 14 * U]);
    c.lineDashOffset = st * 14;
    c.strokeStyle = "rgba(214,40,57,0.5)";
    c.stroke();
    c.restore();
    c.strokeStyle = "rgba(201,184,255,0.5)";
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    const cols = ["#ff4fa3", "#8fe9ff", "#ffd23f", "#a6d94a"];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2, on = (i + Math.floor(st * 6)) % 3 === 0;
      const bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry;
      if (on) X.glow(bx, by, 9 * U, cols[i % 4], 0.6);
      c.fillStyle = X.rgb(cols[i % 4], on ? 1 : 0.3);
      c.beginPath(); c.arc(bx, by, 2.2 * U, 0, Math.PI * 2); c.fill();
    }
  }

  // Depth by light: the fight stands in a pool of light, and the stage falls away into the dark behind it
  // and in front of it. A low mist lies along the back of the floor.
  function depthLight(B, P, hz, st) {
    const cx = (P.px + P.fx) / 2, cy = P.feet - 40 * U;
    const vg = c.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.78);
    vg.addColorStop(0, "rgba(4,2,12,0)");
    vg.addColorStop(1, "rgba(4,2,12,0.66)");
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    X.fog(hz + 4 * U, 22 * U, 0.11, st, 0.012, 11 + B.act, ["#e6b8a8", "#8fd9e6", "#a88ae6"][B.act - 1]);
  }

  // ---------- lights ----------
  function spots(B, P, ap, st) {
    const tint = JG.ACTS[B.act - 1].tint;
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const [sx, col, a] of [[P.px, X.mix("#ffe9b0", "#ffd23f", ap), 0.16 + ap * 0.14], [P.fx, tint, 0.18]]) {
      const lg = c.createLinearGradient(0, 0, 0, P.feet);
      lg.addColorStop(0, X.rgb(col, 0.02));
      lg.addColorStop(1, X.rgb(col, a));
      c.fillStyle = lg;
      c.beginPath();
      c.moveTo(sx - 20 * U, -10); c.lineTo(sx + 20 * U, -10); c.lineTo(sx + 100 * U, P.feet); c.lineTo(sx - 100 * U, P.feet);
      c.fill();
      c.fillStyle = X.rgb(col, a * 0.9);
      c.beginPath(); c.ellipse(sx, P.feet, 100 * U, 22 * U, 0, 0, Math.PI * 2); c.fill();
    }
    if (B.kind === "boss") {
      for (const s of [-1, 1]) {
        const ox = W / 2 + s * W * 0.52, oy = H * 0.95, a = -Math.PI / 2 - s * 0.55 + Math.sin(st * 0.8 + s * 2) * 0.4, L = H * 1.3;
        const lg = c.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L);
        lg.addColorStop(0, X.rgb(tint, 0.22));
        lg.addColorStop(1, X.rgb(tint, 0));
        c.fillStyle = lg;
        c.beginPath();
        c.moveTo(ox, oy);
        c.lineTo(ox + Math.cos(a - 0.09) * L, oy + Math.sin(a - 0.09) * L);
        c.lineTo(ox + Math.cos(a + 0.09) * L, oy + Math.sin(a + 0.09) * L);
        c.fill();
      }
    }
    c.restore();
  }

  // ---------- the two fighters ----------
  function fighterPos(B, P, rt) {
    const k = (t0, dur) => { if (!t0) return 0; const q = (rt - t0) / dur; return q > 0 && q < 1 ? Math.sin(q * Math.PI) : 0; };
    const sh = (t0) => (t0 && rt - t0 < 0.3 ? Math.sin((rt - t0) * 80) * 7 * U * (1 - (rt - t0) / 0.3) : 0);
    const a = B.anim, span = P.fx - P.px;
    const sm = (q) => q * q * (3 - 2 * q);
    const lun = (t0) => {
      if (!t0) return 0;
      const q = (rt - t0) / 0.4;
      if (q <= 0 || q >= 1) return 0;
      return q < 0.15 ? -0.2 * Math.sin((q / 0.15) * Math.PI * 0.5) : q < 0.4 ? -0.2 + 1.2 * ease((q - 0.15) / 0.25) : 1 - sm((q - 0.4) / 0.6);
    };
    const pd = k(a.pDive, 0.5), fd = k(a.fDive, 0.5);
    return {
      px: P.px + lun(a.pLunge) * span * 0.32 + pd * span * 0.8 + sh(a.pHurt) - k(a.pHurt, 0.3) * 12 * U - k(a.pCast, 0.25) * 8 * U,
      py: P.feet,
      pHop: pd * H * 0.2 + k(a.pCast, 0.25) * 16 * U,
      fx: P.fx - lun(a.fLunge) * span * 0.32 - fd * span * 0.8 + sh(a.fHurt) + k(a.fHurt, 0.3) * 12 * U + k(a.fCast, 0.25) * 8 * U,
      fy: P.feet - fd * H * 0.16 - k(a.fCast, 0.25) * 12 * U
    };
  }
  function fighters(B, pos, st, rt, main) {
    const a = B.anim;
    let pr = null, fr = null;
    const neon = B.act === 3;
    if (B.jinx) {
      if (main) stick(pos.px, pos.py - pos.pHop - 8 * U);
      pr = D.drawJinx(B.jinx, pos.px, pos.py, { t: st, dir: 1, scale: SCALE, flat: !main, edgeColor: neon ? "#b6ff5c" : undefined, hop: pos.pHop, twirl: show && show.form === "pierrot" && rt - show.t0 > 0.3 && rt - show.t0 < 1.5 ? (rt - show.t0 - 0.3) * 15 : 0, hurt: a.pHurt && rt - a.pHurt < 0.4, happy: B.over === "win" || (a.show && rt - a.show < 2.2), sleep: B.over === "lose" });
    }
    if (B.foe && !(B.over === "win" && rt - a.fDie > 0.8)) {
      c.save();
      if (B.over === "win") {
        // flips over like a card and flutters off the stage
        const k = clamp((rt - a.fDie) / 0.8, 0, 1), px = pos.fx + k * 150 * U + Math.sin(k * 9) * 20 * U, py = pos.fy - 60 * U - Math.sin(k * Math.PI) * 140 * U;
        c.globalAlpha = 1 - k * k;
        c.translate(px, py);
        c.rotate(Math.sin(k * 7) * 0.5);
        c.scale(Math.cos(k * 17) * (1 - k * 0.4), 1 - k * 0.4);
        c.translate(-pos.fx, -(pos.fy - 60 * U));
      } else if (main) {
        const fc = D.foeCenter(B.foe.def.look, pos.fy, FOE_SCALE), floaty = ["balloon", "wisp", "tv"].includes(B.foe.def.look.body) || B.foe.def.id === "comet" || B.foe.def.id === "trapeze";
        if (B.foe.def.id !== "trapeze") stick(pos.fx, floaty ? fc.cy + fc.r * 0.5 : pos.fy - 8 * U);
      }
      const hk = a.fHurt && rt - a.fHurt < 0.4 ? Math.pow(1 - (rt - a.fHurt) / 0.4, 2) : 0;
      fr = D.drawFoe(B.foe, pos.fx, pos.fy, st, { scale: FOE_SCALE, flat: !main, edgeColor: neon ? "#ff4fa3" : undefined, tint: main ? JG.ACTS[B.act - 1].tint : null, hurtK: hk, hurt: main && a.fHurt && rt - a.fHurt < 0.12 });
      c.restore();
    }
    if (main) B.screen = { p: pr, f: B.over === "win" ? null : fr };
  }

  // What each fighter is carrying around: shields, flames, goo, stars.
  function statusFx(B, st) {
    for (const side of ["p", "f"]) {
      const A = B.screen && B.screen[side];
      if (!A) continue;
      const s = side === "p" ? B.p.st : B.foe.st, block = side === "p" ? B.p.block : B.foe.block, dir = side === "p" ? 1 : -1;
      const { x, y, r } = A;
      const headY = A.topY !== undefined ? A.topY : y - r * 1.7, faceY = A.faceY !== undefined ? A.faceY : y - r * 0.25, floorY = A.feetY !== undefined ? A.feetY : y + r;
      if (s.hype) {
        c.save();
        c.globalCompositeOperation = "lighter";
        const n = Math.min(7, 2 + s.hype);
        for (let i = 0; i < n; i++) {
          const fx = x + (i / (n - 1) - 0.5) * r * 2.2, hh = r * (0.9 + 0.5 * Math.sin(st * 9 + i * 2.3)) * (0.7 + Math.min(s.hype, 6) * 0.08);
          const g = c.createLinearGradient(0, floorY, 0, floorY - hh);
          g.addColorStop(0, "rgba(255,120,40,0.5)");
          g.addColorStop(1, "rgba(255,210,63,0)");
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(fx - r * 0.22, floorY);
          c.quadraticCurveTo(fx + Math.sin(st * 7 + i) * r * 0.2, floorY - hh * 0.6, fx, floorY - hh);
          c.quadraticCurveTo(fx + r * 0.3, floorY - hh * 0.5, fx + r * 0.22, floorY);
          c.fill();
        }
        c.restore();
      }
      if (s.gunk) {
        c.fillStyle = "rgba(127,194,46,0.55)";
        c.beginPath(); c.ellipse(x, floorY, r * 1.2, r * 0.22, 0, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 5; i++) {
          const ph = (st * 0.6 + i * 0.23) % 1;
          c.strokeStyle = `rgba(200,255,140,${0.9 * (1 - ph)})`;
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(x + Math.sin(i * 7.7) * r * 0.9, y + r * 0.8 - ph * r * 1.6, (2 + ph * 4) * U, 0, Math.PI * 2);
          c.stroke();
        }
        c.fillStyle = "rgba(166,217,74,0.85)";
        for (let i = 0; i < 3; i++) {
          const dx = (i - 1) * r * 0.5, len = r * (0.25 + 0.2 * Math.abs(Math.sin(st * 1.4 + i * 2)));
          c.beginPath();
          c.moveTo(x + dx - r * 0.1, y - r * 0.55);
          c.quadraticCurveTo(x + dx, y - r * 0.55 + len * 2, x + dx + r * 0.1, y - r * 0.55);
          c.fill();
        }
      }
      if (s.pied) {
        const fy = faceY;
        c.fillStyle = "#fff8e6";
        c.strokeStyle = "rgba(160,120,60,0.6)";
        c.lineWidth = 1.5;
        c.beginPath();
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * Math.PI * 2, rr = r * (0.42 + 0.12 * Math.sin(i * 2.6));
          const px = x + Math.cos(a) * rr, py = fy + Math.sin(a) * rr * 0.85;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.closePath();
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(x - r * 0.1, fy + r * 0.3);
        c.quadraticCurveTo(x, fy + r * (0.6 + 0.15 * Math.sin(st * 2)), x + r * 0.1, fy + r * 0.3);
        c.fill();
        c.fillStyle = "#d62839";
        c.beginPath(); c.arc(x + r * 0.08, fy - r * 0.08, r * 0.08, 0, Math.PI * 2); c.fill();
      }
      if (s.dazed) {
        for (let i = 0; i < 3; i++) {
          const a = st * 4 + i * 2.09, sx = x + Math.cos(a) * r * 0.9, sy = headY + Math.sin(a) * r * 0.22;
          X.sparkle(sx, sy, (2.5 + Math.sin(a) * 0.8) * U, Math.sin(a) > 0 ? "#ffd23f" : "rgba(255,210,63,0.5)");
        }
      }
      if (block > 0) {
        const al = 0.35 + Math.min(block, 20) / 45;
        c.save();
        c.translate(x + dir * r * 0.35, y);
        c.scale(dir, 1);
        const g = c.createRadialGradient(r * 1.2, 0, r * 0.2, 0, 0, r * 2);
        g.addColorStop(0, `rgba(255,236,150,${al * 0.35})`);
        g.addColorStop(1, "rgba(255,210,63,0)");
        c.fillStyle = g;
        c.beginPath(); c.arc(0, 0, r * 1.8, -1.0, 1.0); c.lineTo(r * 0.6, 0); c.fill();
        c.strokeStyle = `rgba(255,224,110,${al})`;
        c.lineWidth = 3 * U;
        c.beginPath(); c.arc(0, 0, r * 1.8, -1.0, 1.0); c.stroke();
        c.lineWidth = 1.2;
        c.strokeStyle = `rgba(255,255,255,${al * 0.8})`;
        for (let i = -2; i <= 2; i++) {
          const a = i * 0.36 + Math.sin(st * 2) * 0.03;
          c.beginPath();
          c.moveTo(Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55);
          c.lineTo(Math.cos(a) * r * 1.8, Math.sin(a) * r * 1.8);
          c.stroke();
        }
        c.restore();
      }
      if (s.counter) {
        c.strokeStyle = "#ff8a3d";
        c.fillStyle = "rgba(255,138,61,0.85)";
        c.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + st * 0.8, r0 = r * 1.35, r1 = r * (1.6 + 0.08 * Math.sin(st * 6 + i));
          c.beginPath();
          c.moveTo(x + Math.cos(a - 0.09) * r0, y + Math.sin(a - 0.09) * r0);
          c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
          c.lineTo(x + Math.cos(a + 0.09) * r0, y + Math.sin(a + 0.09) * r0);
          c.fill();
        }
        c.beginPath(); c.arc(x, y, r * 1.35, 0, Math.PI * 2); c.stroke();
      }
      if (side === "p" && B.res) {
        if (B.form === "stardust") {
          for (let i = 0; i < B.res; i++) {
            const a = st * 1.6 + (i / B.res) * Math.PI * 2, sx = x + Math.cos(a) * r * 1.7, sy = y - r * 0.3 + Math.sin(a) * r * 0.45;
            X.glow(sx, sy, 12 * U, "#8fe9ff", 0.6);
            X.sparkle(sx, sy, 3 * U, "#ffffff");
          }
        } else if (B.form === "sludge") {
          const k = Math.min(1, B.res / 20);
          X.glow(x, y + r * 0.6, r * (1.4 + k * 1.4), B.res >= 6 ? "#b6ff5c" : "#6f9a22", 0.12 + k * 0.22);
        }
      }
    }
  }

  // ---------- things in flight ----------
  function splat(style, T) {
    const S = { pie: ["drop", 16, "#fff8e6"], goo: ["drop", 14, "#a6d94a"], glass: ["star", 12, "#bdf3ff"], popcorn: ["drop", 10, "#fff6d8"], fireball: ["star", 14, "#ff8a3d"],
      chicken: ["star", 8, "#ffd23f"], tickets: ["confetti", 10, "#d62839"], cannon: ["star", 18, "#ffd23f"], notes: ["note", 4, "#c9b8ff"], spray: ["drop", 12, "#cfefff"] }[style];
    if (S) D.burst(T.x, T.y, S[0], S[1], S[2]);
  }
  function drawShots(B, rt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i], k = (rt - s.t0) / s.dur, dir = s.from === "p" ? 1 : -1;
      const A = actor(B, s.from), T = actor(B, s.from === "p" ? "f" : "p");
      if (k >= 1) { splat(s.style, T); shots.splice(i, 1); continue; }
      if (k < 0) continue;
      const sx = A.x + dir * A.r * 0.8, sy = A.y - A.r * 0.2, tx = T.x, ty = T.y, dist = Math.abs(tx - sx);
      const at = (q) => [lerp(sx, tx, q), lerp(sy, ty, q) - (ARC[s.style] || 0) * dist * 4 * q * (1 - q)];
      const [x, y] = at(k);
      c.save();
      if (LINE[s.style]) lineShot(s, k, sx, sy, tx, ty, dir, rt);
      else objShot(s, k, x, y, at, dir, rt, sx, sy);
      c.restore();
    }
  }
  function lineShot(s, k, sx, sy, tx, ty, dir, rt) {
    const st = s.style;
    if (st === "beam" || st === "dark") {
      const w = Math.sin(k * Math.PI) * 16 * U, col = st === "beam" ? "143,233,255" : "138,61,255";
      c.globalCompositeOperation = st === "beam" ? "lighter" : "source-over";
      c.lineCap = "round";
      for (const [mul, a, cc] of [[3.2, 0.25, col], [1.6, 0.6, col], [0.6, 1, st === "beam" ? "255,255,255" : "20,6,40"]]) {
        c.strokeStyle = `rgba(${cc},${a})`;
        c.lineWidth = Math.max(0.5, w * mul);
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(tx, ty); c.stroke();
      }
      X.glow(sx, sy, 40 * U, st === "beam" ? "#8fe9ff" : "#8a3dff", 0.7);
      X.glow(tx, ty, 50 * U * k, st === "beam" ? "#ffffff" : "#c9b8ff", 0.6);
    } else if (st === "zap") {
      c.globalCompositeOperation = "lighter";
      bolt(sx, sy, tx, ty, Math.floor(rt * 40), 7 * U, "rgba(255,210,63,0.35)");
      bolt(sx, sy, tx, ty, Math.floor(rt * 40), 2.5 * U, "#fffbe0");
    } else if (st === "static") {
      for (let i = 0; i < 70; i++) {
        const q = Math.random() * Math.min(1, k * 1.6), v = (120 + Math.random() * 135) | 0;
        c.fillStyle = `rgba(${v},${Math.min(255, v + 60)},${v},0.8)`;
        c.fillRect(lerp(sx, tx, q) + (Math.random() - 0.5) * 20 * U, lerp(sy, ty, q) + (Math.random() - 0.5) * 34 * U, (6 + Math.random() * 26) * U, 2.5 * U);
      }
    } else if (st === "spray") {
      for (let i = 0; i < 22; i++) {
        const q = (i / 22) * Math.min(1, k * 1.5), j = hash(s.seed + i);
        c.fillStyle = `rgba(215,240,255,${0.9 - q * 0.4})`;
        c.beginPath();
        c.arc(lerp(sx, tx, q), lerp(sy, ty, q) + (j - 0.5) * 34 * U * q - Math.sin(q * Math.PI) * 26 * U, (2 + j * 3.5) * U, 0, Math.PI * 2);
        c.fill();
      }
    } else if (st === "wave") {
      const ang = Math.atan2(ty - sy, tx - sx);
      c.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const q = k * 1.25 - i * 0.14;
        if (q <= 0 || q >= 1) continue;
        c.strokeStyle = `rgba(255,210,63,${1 - q})`;
        c.lineWidth = (5 - i) * U;
        c.beginPath();
        c.arc(lerp(sx, tx, q) - Math.cos(ang) * 20 * U, lerp(sy, ty, q) - Math.sin(ang) * 20 * U, (14 + q * 34) * U, ang - 0.8, ang + 0.8);
        c.stroke();
      }
    }
  }
  function objShot(s, k, x, y, at, dir, rt, sx, sy) {
    const st = s.style, spin = k * 9 * dir;
    if (st === "pie") {
      c.translate(x, y); c.rotate(spin * 0.5);
      c.fillStyle = "#b98a4a";
      c.beginPath(); c.ellipse(0, 4 * U, 15 * U, 6 * U, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff8e6";
      c.beginPath(); c.arc(0, 2 * U, 12 * U, Math.PI, 0); c.fill();
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 7 * U, -4 * U, 5 * U, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#d62839";
      c.beginPath(); c.arc(0, -10 * U, 3.5 * U, 0, Math.PI * 2); c.fill();
    } else if (st === "chicken") {
      c.translate(x, y); c.rotate(spin);
      c.fillStyle = "#ffd23f";
      c.strokeStyle = INK; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(0, 0, 17 * U, 8 * U, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(17 * U, -7 * U, 6 * U, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "#ff8a3d";
      c.beginPath(); c.moveTo(22 * U, -8 * U); c.lineTo(30 * U, -6 * U); c.lineTo(22 * U, -4 * U); c.fill();
      c.fillRect(-26 * U, -2 * U, 10 * U, 2 * U); c.fillRect(-26 * U, 2 * U, 10 * U, 2 * U);
      c.fillStyle = "#d62839";
      c.beginPath(); c.arc(16 * U, -13 * U, 3 * U, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK;
      c.beginPath(); c.arc(19 * U, -8 * U, 1.3 * U, 0, Math.PI * 2); c.fill();
    } else if (st === "stars") {
      for (let i = 3; i >= 0; i--) {
        const [px, py] = at(Math.max(0, k - i * 0.07));
        if (!i) X.glow(px, py, 26 * U, "#ffd23f", 0.6);
        X.sparkle(px, py, (6 - i * 1.3) * U, i ? `rgba(255,210,63,${0.6 - i * 0.15})` : "#fffbe0");
      }
    } else if (st === "goo") {
      X.glow(x, y, 30 * U, "#b6ff5c", 0.45);
      c.fillStyle = "#a6d94a"; c.strokeStyle = "#3f6a14"; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2, rr = (11 + 3 * Math.sin(a * 3 + rt * 20)) * U;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.fill(); c.stroke();
      for (let i = 1; i < 4; i++) {
        const [px, py] = at(Math.max(0, k - i * 0.08));
        c.beginPath(); c.arc(px, py, (5 - i) * U, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.beginPath(); c.arc(x - 4 * U, y - 4 * U, 3 * U, 0, Math.PI * 2); c.fill();
    } else if (st === "popcorn") {
      for (let i = 0; i < 5; i++) {
        const [px, py] = at(clamp(k * (0.85 + hash(s.seed + i) * 0.3), 0, 1));
        const oy = (hash(s.seed + i * 2) - 0.5) * 50 * U * Math.sin(k * Math.PI);
        c.fillStyle = "#fff6d8"; c.strokeStyle = "#c9a26b"; c.lineWidth = 1;
        for (let q = 0; q < 3; q++) {
          c.beginPath(); c.arc(px + (q - 1) * 4 * U, py + oy + (q % 2) * 3 * U, 4.5 * U, 0, Math.PI * 2); c.fill(); c.stroke();
        }
      }
    } else if (st === "glass") {
      c.fillStyle = "rgba(191,243,255,0.5)"; c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 11 * U, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.8)";
      c.beginPath(); c.arc(x - 4 * U, y - 4 * U, 3 * U, 0, Math.PI * 2); c.fill();
    } else if (st === "tickets") {
      for (let i = 0; i < 3; i++) {
        const [px, py] = at(Math.max(0, k - i * 0.08));
        c.save();
        c.translate(px, py + (i - 1) * 12 * U); c.rotate(spin * 1.5 + i);
        c.fillStyle = "#d62839"; c.fillRect(-11 * U, -6 * U, 22 * U, 12 * U);
        c.fillStyle = "#efe6d2"; c.fillRect(-7 * U, -2 * U, 14 * U, 4 * U);
        c.restore();
      }
    } else if (st === "notes") {
      c.font = `${26 * U}px "Permanent Marker", serif`;
      c.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        const q = Math.max(0, k - i * 0.1), [px, py] = at(q);
        c.fillStyle = ["#c9b8ff", "#ff4fa3", "#8fe9ff"][i];
        c.fillText(i % 2 ? "♫" : "♪", px, py + Math.sin(q * 14 + i) * 16 * U);
      }
    } else if (st === "fireball") {
      for (let i = 5; i > 0; i--) {
        const [px, py] = at(Math.max(0, k - i * 0.05));
        c.fillStyle = `rgba(255,${120 + i * 20},40,${0.5 - i * 0.07})`;
        c.beginPath(); c.arc(px, py + Math.sin(rt * 30 + i) * 3 * U, (12 - i * 1.5) * U, 0, Math.PI * 2); c.fill();
      }
      X.glow(x, y, 46 * U, "#ff8a3d", 0.7);
      c.fillStyle = "#fff1c2";
      c.beginPath(); c.arc(x, y, 8 * U, 0, Math.PI * 2); c.fill();
    } else if (st === "cannon") {
      if (k < 0.5) {
        for (let i = 0; i < 5; i++) {
          c.fillStyle = `rgba(200,190,210,${0.5 * (1 - k * 2)})`;
          c.beginPath(); c.arc(sx + dir * i * 9 * U * k * 4, sy + (hash(s.seed + i) - 0.5) * 30 * U, (10 + k * 40) * U, 0, Math.PI * 2); c.fill();
        }
      }
      c.fillStyle = "#16101c";
      c.beginPath(); c.arc(x, y, 13 * U, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.beginPath(); c.arc(x - 4 * U, y - 5 * U, 4 * U, 0, Math.PI * 2); c.fill();
      X.sparkle(x - dir * 14 * U, y - 10 * U, 4 * U * (0.6 + Math.random() * 0.6), "#ffd23f");
    }
  }
  function drawThrows(B, rt) {
    for (let i = throws.length - 1; i >= 0; i--) {
      const h = throws[i], k = (rt - h.t0) / h.dur;
      if (k < 0) continue;
      let x1 = h.x1, y1 = h.y1;
      if (h.target) { const T = actor(B, h.target); x1 = T.x; y1 = T.y; }
      if (h.kind === "tomato" && k >= 1) { D.burst(x1, y1, "drop", 9, "#d62839"); throws.splice(i, 1); continue; }
      if (k > 4) { throws.splice(i, 1); continue; }
      const q = Math.min(1, k), x = lerp(h.x0, x1, q), y = lerp(h.y0, y1, q) - Math.sin(q * Math.PI) * H * 0.22;
      c.save();
      c.translate(x, y);
      if (h.kind === "rose") {
        c.globalAlpha = k > 2.5 ? Math.max(0, 1 - (k - 2.5) / 1.5) : 1;
        c.rotate(k < 1 ? h.rot + k * 8 : h.rot);
        c.strokeStyle = "#3f7a1a"; c.lineWidth = 2 * U;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-16 * U, 4 * U); c.stroke();
        c.fillStyle = "#d62839";
        c.beginPath(); c.arc(0, 0, 5 * U, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#ff6b7a";
        c.beginPath(); c.arc(1 * U, -1 * U, 2.2 * U, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = "#d62839";
        c.beginPath(); c.arc(0, 0, 7 * U, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#3f7a1a";
        c.beginPath(); c.arc(0, -6 * U, 3 * U, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  }

  // ---------- impacts ----------
  function drawImpacts(B, rt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i], k = (rt - b.t0) / (b.big ? 0.26 : 0.18);
      if (k >= 1) { bursts.splice(i, 1); continue; }
      const T = actor(B, b.target), n = b.big ? 18 : 12;
      c.save();
      c.translate(T.x, T.y);
      for (let q = 0; q < n; q++) {
        const a = (q / n) * Math.PI * 2 + hash(q + b.t0) * 0.3, r0 = T.r * (1.1 + k * 0.6), r1 = T.r * (1.8 + k * 1.6 + hash(q) * 0.8) * (b.big ? 1.4 : 1);
        c.fillStyle = b.big && q % 2 ? `rgba(20,10,30,${1 - k})` : `rgba(255,255,255,${1 - k})`;
        c.beginPath();
        c.moveTo(Math.cos(a - 0.03) * r0, Math.sin(a - 0.03) * r0);
        c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        c.lineTo(Math.cos(a + 0.03) * r0, Math.sin(a + 0.03) * r0);
        c.fill();
      }
      c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      c.lineWidth = 3 * U * (1 - k);
      c.beginPath(); c.arc(0, 0, T.r * (0.8 + k * 1.6), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i], k = (rt - w.t0) / 0.7;
      if (k >= 1) { words.splice(i, 1); continue; }
      const T = actor(B, w.target), side = w.target === "f" ? 1 : -1;
      const sc = (k < 0.12 ? (k / 0.12) * 1.25 : k < 0.2 ? 1.25 - ((k - 0.12) / 0.08) * 0.25 : 1) * (w.big ? 1.3 : 1) * (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
      const x = clamp(T.x + side * (T.r * 1.3 + 60 * U), 70 * U, W - 70 * U), y = T.y - T.r * 1.5 - 50 * U;
      c.save();
      c.translate(x, y);
      c.rotate(w.rot);
      c.scale(sc, sc);
      c.fillStyle = "#ffd23f";
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.beginPath();
      for (let q = 0; q < 28; q++) {
        const a = (q / 28) * Math.PI * 2, rr = (q % 2 ? 34 : 52 + hash(q + w.t0) * 10) * U;
        const px = Math.cos(a) * rr * 1.25, py = Math.sin(a) * rr * 0.8;
        q ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = "#d62839";
      c.font = `${20 * U}px "Bungee", "Arial Black", sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeText(w.text, 0, 0);
      c.fillText(w.text, 0, 0);
      c.restore();
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i], k = (rt - p.t0) / 0.6;
      if (k >= 1) { puffs.splice(i, 1); continue; }
      const T = actor(B, p.target);
      c.save();
      if (p.kind === "heal") {
        c.strokeStyle = `rgba(143,233,255,${1 - k})`;
        c.lineWidth = 3 * U;
        c.beginPath(); c.ellipse(T.x, T.y + T.r * (0.8 - k * 1.8), T.r * 1.3, T.r * 0.3, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = `rgba(200,250,255,${1 - k})`;
        for (let q = 0; q < 6; q++) {
          const px = T.x + (hash(q + p.t0) - 0.5) * T.r * 2.4, py = T.y + T.r * 0.6 - k * T.r * (1.5 + hash(q) * 1.5), s = (4 + hash(q + 2) * 4) * U;
          c.fillRect(px - s, py - s / 3, s * 2, s / 1.5);
          c.fillRect(px - s / 3, py - s, s / 1.5, s * 2);
        }
      } else {
        c.strokeStyle = `rgba(255,224,110,${1 - k})`;
        c.lineWidth = 4 * U * (1 - k);
        c.beginPath();
        for (let q = 0; q <= 6; q++) {
          const a = (q / 6) * Math.PI * 2 + Math.PI / 6, rr = T.r * (1.2 + ease(k) * 0.9);
          const px = T.x + Math.cos(a) * rr, py = T.y + Math.sin(a) * rr;
          q ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.stroke();
      }
      c.restore();
    }
  }

  // ---------- the crowd ----------
  const CROWD = [["#140912", "#27131e", "#ffb36b"], ["#06141a", "#0e2a30", "#8fe9ff"], ["#0a0418", "#1c0d36", "#c9b8ff"]];
  function crowd(B, st, rt, ap) {
    const y0 = B.crowdY || H * 0.8, [front, back, rim] = CROWD[B.act - 1];
    const gap = 32 * U, n = Math.ceil(W / gap) + 2;
    const heckled = B.anim.heckle && rt - B.anim.heckle < 1.5;
    const cheer = B.anim.cheer && rt - B.anim.cheer < 1.4 ? 1 - (rt - B.anim.cheer) / 1.4 : 0;
    const exc = clamp(ap + cheer * 0.7, 0, 1.3), beat = st * 6.75;
    for (let row = 1; row >= 0; row--) {
      for (let i = 0; i < n; i++) {
        const id = i * 2 + row, sd = hash(id), sd2 = hash(id + 40), sd3 = hash(id + 90);
        const x = (i + (row ? 0.5 : 0) - 0.5) * gap + (sd - 0.5) * 8 * U;
        const r = (11 + sd * 5) * U * (row ? 0.88 : 1);
        const bob = Math.abs(Math.sin(beat * 0.5 + sd * 6)) * (1.5 + exc * 10) * U;
        const y = y0 - (row ? 16 * U : 0) - bob;
        c.fillStyle = row ? back : front;
        c.beginPath(); c.ellipse(x, y + r * 2.1, r * 1.7, r * 1.4, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        // hair and hats: mohawks, beanies, pigtails, party hats
        const hat = Math.floor(sd2 * 6);
        c.beginPath();
        if (hat === 0) { for (let q = -2; q <= 2; q++) { c.moveTo(x + q * r * 0.3 - r * 0.16, y - r * 0.8); c.lineTo(x + q * r * 0.3, y - r * (1.75 - Math.abs(q) * 0.2)); c.lineTo(x + q * r * 0.3 + r * 0.16, y - r * 0.8); } }
        else if (hat === 1) { c.arc(x, y - r * 0.25, r * 1.05, Math.PI, 0); c.rect(x - r * 0.15, y - r * 1.5, r * 0.3, r * 0.3); }
        else if (hat === 2) { c.arc(x - r * 1.1, y - r * 0.2, r * 0.42, 0, Math.PI * 2); c.arc(x + r * 1.1, y - r * 0.2, r * 0.42, 0, Math.PI * 2); }
        else if (hat === 3) { c.moveTo(x - r * 0.6, y - r * 0.75); c.lineTo(x + r * 0.1, y - r * 2); c.lineTo(x + r * 0.6, y - r * 0.75); }
        c.fill();
        c.strokeStyle = X.rgb(rim, row ? 0.18 : 0.32);
        c.lineWidth = 1.5;
        c.beginPath(); c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        if (exc > 0.4 && sd3 < exc - 0.25) {
          // arms in the air
          c.strokeStyle = row ? back : front;
          c.lineWidth = r * 0.5;
          c.lineCap = "round";
          const wv = Math.sin(beat + sd * 9) * 0.3;
          for (const s of [-1, 1]) {
            const hx = x + s * r * (1.5 + wv * s), hy = y - r * 1.9;
            c.beginPath(); c.moveTo(x + s * r * 1.2, y + r * 1.2); c.lineTo(hx, hy); c.stroke();
            if (s > 0 && exc > 0.7 && sd2 > 0.45) {
              // lighters and flip phones
              if (sd > 0.5) { X.glow(hx, hy - r * 0.5, 14 * U, "#ffb36b", 0.8); c.fillStyle = "#fff1c2"; c.beginPath(); c.ellipse(hx, hy - r * 0.5, 1.8 * U, 4 * U, 0, 0, Math.PI * 2); c.fill(); }
              else { X.glow(hx, hy - r * 0.4, 14 * U, "#8fe9ff", 0.7); c.fillStyle = "#cfefff"; c.fillRect(hx - 2.5 * U, hy - r * 0.8, 5 * U, 7 * U); }
            }
          }
          c.lineCap = "butt";
        }
        if (heckled && sd3 > 0.45) {
          c.fillStyle = "#ff3b4a";
          c.beginPath(); c.arc(x - r * 0.35, y - r * 0.1, 1.6 * U, 0, Math.PI * 2); c.arc(x + r * 0.35, y - r * 0.1, 1.6 * U, 0, Math.PI * 2); c.fill();
        } else if (B.act === 3 && sd3 > 0.6) {
          c.fillStyle = "rgba(201,184,255,0.7)";
          c.beginPath(); c.arc(x - r * 0.35, y - r * 0.1, 1.3 * U, 0, Math.PI * 2); c.arc(x + r * 0.35, y - r * 0.1, 1.3 * U, 0, Math.PI * 2); c.fill();
        }
      }
    }
  }

  // ---------- Showstoppers ----------
  function showBack(B, rt, P) {
    if (!show) return;
    const rel = rt - show.t0;
    if (rel > 2.4) { show = null; return; }
    const dim = Math.min(1, rel / 0.2) * (rel > 1.6 ? Math.max(0, 1 - (rel - 1.6) / 0.6) : 1);
    c.fillStyle = `rgba(8,2,18,${0.6 * dim})`;
    c.fillRect(0, 0, W, H);
    if (show.form === "pierrot") {
      const k = ease((rel - 0.2) / 0.8), mx = W * 0.5, my = lerp(H * 0.75, H * 0.26, k), mr = Math.min(W, H) * 0.2;
      c.save();
      c.globalAlpha = dim;
      X.glow(mx, my, mr * 2.6, "#cfe3ff", 0.35);
      c.fillStyle = "#f4f8ff";
      c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(160,180,220,0.35)";
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(mx + (hash(i) - 0.5) * mr * 1.3, my + (hash(i + 9) - 0.5) * mr * 1.3, mr * (0.08 + hash(i + 4) * 0.12), 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    if (show.form === "harlequin") {
      // a sweep of diamonds
      const off = rel * W * 0.9, s = 54 * U;
      c.save();
      c.globalAlpha = 0.3 * dim;
      for (let row = 0; row < Math.ceil(H / s) + 1; row++) {
        for (let col = -2; col < Math.ceil(W / s) + 2; col++) {
          const x = col * s + ((off + row * s * 0.5) % s), y = row * s, band = Math.abs(((x + y) / (W + H)) - (rel / 1.6)) < 0.22;
          if (!band) continue;
          c.fillStyle = (row + col) % 2 ? "#ff4fa3" : "#140a1e";
          c.beginPath(); c.moveTo(x, y - s / 2); c.lineTo(x + s / 2, y); c.lineTo(x, y + s / 2); c.lineTo(x - s / 2, y); c.fill();
        }
      }
      c.restore();
    }
  }
  function showFront(B, rt, st, P) {
    if (!show) return;
    const rel = rt - show.t0, A = actor(B, "p"), T = actor(B, "f"), F = JG.FORMS[show.form];
    if (show.form === "sludge" && rel > 0.4) {
      const q = ease((rel - 0.4) / 1.0), wx = lerp(-W * 0.25, W * 1.35, q), fade = rel > 1.5 ? Math.max(0, 1 - (rel - 1.5) / 0.8) : 1;
      const base = P.feet + 40 * U, hh = H * 0.36 * fade;
      const top = (x) => base - hh * (0.28 + 0.72 * Math.exp(-Math.pow((wx - x) / (W * 0.22), 2))) * (x < wx ? 1 : Math.max(0, 1 - (x - wx) / (40 * U))) + Math.sin(x * 0.03 + rt * 9) * 7 * U;
      c.save();
      c.globalAlpha = 0.93 * Math.min(1, fade * 1.5);
      const g = c.createLinearGradient(0, base - hh, 0, H);
      g.addColorStop(0, "#d4ff7a");
      g.addColorStop(0.25, "#7fc22e");
      g.addColorStop(1, "#1f3a0c");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 14) c.lineTo(x, Math.min(H, top(x)));
      c.lineTo(W, H);
      c.fill();
      c.strokeStyle = "#f0ffc8";
      c.lineWidth = 4 * U;
      c.beginPath();
      for (let x = 0; x <= Math.min(W, wx + 40 * U); x += 14) { const y = top(x); x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      for (let i = 0; i < 26; i++) {
        const bx = hash(i) * W, by = base + hash(i + 3) * (H - base) - ((rt * 60 + i * 30) % 80) * U * 0.5;
        if (bx > wx || by < top(bx)) continue;
        c.strokeStyle = "rgba(230,255,180,0.7)";
        c.lineWidth = 1.5;
        c.beginPath(); c.arc(bx, by, (3 + hash(i + 8) * 7) * U, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    if (show.form === "stardust" && rel > 0.35) {
      const sx = A.x, sy = A.y - A.r * 3.4, q = clamp((rel - 0.35) / 0.85, 0, 1), R = ease(q) * 54 * U;
      const after = rel - 1.25;
      c.save();
      c.globalCompositeOperation = "lighter";
      if (after < 0.5) {
        X.glow(sx, sy, R * 5, "#8fe9ff", 0.5);
        c.translate(sx, sy);
        c.rotate(rel * 2.5);
        for (let i = 0; i < 8; i++) {
          c.rotate(Math.PI / 4);
          c.fillStyle = i % 2 ? "rgba(255,255,255,0.9)" : "rgba(143,233,255,0.7)";
          c.beginPath(); c.moveTo(0, -R * 0.25); c.lineTo(R * (i % 2 ? 3.4 : 2.2), 0); c.lineTo(0, R * 0.25); c.fill();
        }
        c.fillStyle = "#ffffff";
        c.beginPath(); c.arc(0, 0, R * 0.7, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      if (after > 0) {
        c.save();
        c.globalCompositeOperation = "lighter";
        if (after < 0.45) {
          const w = Math.sin((after / 0.45) * Math.PI) * 34 * U;
          c.lineCap = "round";
          for (const [mul, a] of [[3, 0.25], [1.5, 0.6], [0.5, 1]]) {
            c.strokeStyle = mul < 1 ? `rgba(255,255,255,${a})` : `rgba(143,233,255,${a})`;
            c.lineWidth = w * mul;
            c.beginPath(); c.moveTo(sx, sy); c.lineTo(T.x, T.y); c.stroke();
          }
        }
        if (after < 0.8) {
          c.strokeStyle = `rgba(255,255,255,${1 - after / 0.8})`;
          c.lineWidth = 6 * U;
          c.beginPath(); c.arc(sx, sy, after * W * 0.9, 0, Math.PI * 2); c.stroke();
        }
        c.restore();
        if (after < 0.9 && Math.random() < 0.7) D.particles.push({ x: Math.random() * W, y: -6, vx: 0, vy: 160 * U, life: 1, kind: "star", color: Math.random() < 0.5 ? "#8fe9ff" : "#ffffff", s: (3 + Math.random() * 4) * U, rot: 0 });
      }
    }
    if (show.form === "pierrot" && rel > 0.3 && rel < 1.8) {
      // ribbons of moonlight spin off the pirouette
      c.save();
      c.globalCompositeOperation = "lighter";
      c.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const q = clamp((rel - 0.3 - i * 0.12) / 0.9, 0, 1), a0 = rel * 9 + i * 2.1;
        c.strokeStyle = `rgba(207,227,255,${0.7 * (1 - q)})`;
        c.lineWidth = (10 - i * 2) * U;
        c.beginPath();
        c.ellipse(lerp(A.x, T.x, q * q), A.y - A.r * 0.2, A.r * (1.2 + q * 1.6), A.r * (0.35 + q * 0.3), 0, a0, a0 + 3.6);
        c.stroke();
      }
      c.restore();
      if (Math.random() < 0.5) D.particles.push({ x: A.x + (Math.random() - 0.5) * A.r * 3, y: A.y - A.r * 2.5, vx: 0, vy: 60 * U, life: 1, kind: "drop", color: "#9fc4ff", s: (3 + Math.random() * 3) * U, rot: 0 });
    }
    if (show.form === "harlequin" && rel > 0.35 && rel < 1.5) {
      const q = clamp((rel - 0.35) / 0.75, 0, 1), fly = clamp((rel - 1.1) / 0.2, 0, 1);
      const cols = ["#ff5fa8", "#ffd23f", "#8fe9ff", "#a6d94a", "#c9b8ff"];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + rel * 7, rr = lerp(30, 150 + (i % 3) * 30, ease(q)) * U;
        const ox = A.x + Math.cos(a) * rr, oy = A.y - A.r * 0.4 + Math.sin(a) * rr * 0.55;
        const x = lerp(ox, T.x, fly * fly), y = lerp(oy, T.y, fly * fly);
        c.save();
        c.translate(x, y);
        c.rotate(a * 2 + rel * 6);
        c.fillStyle = "#efe6d2";
        c.strokeStyle = INK;
        c.lineWidth = 2;
        c.beginPath(); c.roundRect(-13 * U, -18 * U, 26 * U, 36 * U, 3 * U); c.fill(); c.stroke();
        c.fillStyle = cols[i % 5];
        c.fillRect(-13 * U, -18 * U, 26 * U, 9 * U);
        c.beginPath(); c.moveTo(0, -4 * U); c.lineTo(6 * U, 4 * U); c.lineTo(0, 12 * U); c.lineTo(-6 * U, 4 * U); c.fill();
        c.restore();
      }
    }
    // the cut-in banner, straight out of 2001
    const inK = ease(rel / 0.25), outK = rel > 0.95 ? ease((rel - 0.95) / 0.25) : 0;
    if (rel < 1.25) {
      const off = (inK - 1) * W * 1.2 + outK * W * 1.3, bh = Math.max(92 * U, H * 0.17), y = H * 0.36;
      c.save();
      c.translate(off, 0);
      c.transform(1, 0, -0.22, 1, y * 0.22, 0);
      c.fillStyle = INK;
      c.fillRect(-W * 0.2, y - bh / 2 - 8 * U, W * 1.4, bh + 16 * U);
      const g = c.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.18, F.color);
      g.addColorStop(0.5, X.rgb(X.mix(F.color, "#140a1e", 0.55)));
      g.addColorStop(0.56, F.color);
      g.addColorStop(1, X.rgb(X.mix(F.color, "#140a1e", 0.35)));
      c.fillStyle = g;
      c.fillRect(-W * 0.2, y - bh / 2, W * 1.4, bh);
      for (let x = -W * 0.2, i = 0; x < W * 1.2; x += 12 * U, i++) {
        c.fillStyle = i % 2 ? INK : "#efe6d2";
        c.fillRect(x, y - bh / 2 - 8 * U, 12 * U, 6 * U);
        c.fillStyle = i % 2 ? "#efe6d2" : INK;
        c.fillRect(x, y + bh / 2 + 2 * U, 12 * U, 6 * U);
      }
      c.restore();
      c.save();
      c.translate(off, 0);
      c.beginPath();
      c.rect(0, y - bh / 2 - 60 * U, W, bh + 60 * U);
      c.clip();
      const pr = Math.min(bh * 0.36, W * 0.085);
      D.drawJinx(show.B.jinx, W * 0.15, y + bh * 0.52, { t: st, dir: 1, scale: pr / (21 * U), happy: true });
      c.restore();
      c.save();
      c.translate(off * 1.15, 0);
      const tx = W * 0.3, big = Math.min(58 * U, (W * 0.66) / (F.show.length * 0.72));
      c.textBaseline = "middle";
      c.font = `${Math.max(14, 20 * U)}px "Permanent Marker", cursive`;
      c.fillStyle = INK;
      c.fillText(show.B.jinx.name + "'s Showstopper", tx, y - bh * 0.3);
      c.font = `${big}px "Bungee", "Arial Black", sans-serif`;
      c.lineWidth = 7;
      c.lineJoin = "round";
      c.strokeStyle = INK;
      c.strokeText(F.show.toUpperCase(), tx, y + bh * 0.1);
      c.fillStyle = "#ffffff";
      c.fillText(F.show.toUpperCase(), tx, y + bh * 0.1);
      c.restore();
    }
    if (show.form === "stardust" && rel > 1.25 && rel < 1.55 && !reduced) {
      c.fillStyle = `rgba(255,255,255,${0.85 * (1 - (rel - 1.25) / 0.3)})`;
      c.fillRect(0, 0, W, H);
    }
  }

  // ---------- one frame ----------
  D.stage = function (t, dt, B) {
    c = X.ctx();
    ({ W, H, U } = D.size());
    const rt = now(), P = D.stagePos(), hz = P.feet - 50 * U;
    if (B !== lastB) { lastB = B; reset(); }
    D.paper.neon = B.act === 3;      // Act III is lit by blacklight: cut edges glow
    D.paper.edge = "#fbf8f2";
    const frozen = rt < stopUntil;
    if (!frozen) stageT += dt;
    const st = stageT, ap = (B.applause || 0) / 100;
    const pos = fighterPos(B, P, rt);
    // the view leans toward whoever is moving
    X.camStep([W / 2 + (pos.px + pos.fx - P.px - P.fx) * 1.6, H / 2], dt, st);
    c.save();
    if (shake > 0.3) c.translate((Math.random() - 0.5) * shake * U * 2, (Math.random() - 0.5) * shake * U * 2);
    shake *= Math.pow(0.002, dt);
    if (B.act === 1) midway(st, B, P, hz);
    else if (B.act === 2) mirrorHall(st, B, P, hz, pos, rt);
    else below(st, B, P, hz);
    depthLight(B, P, hz, st);
    spots(B, P, ap, st);
    showBack(B, rt, P);
    fighters(B, pos, st, rt, true);
    statusFx(B, st);
    drawShots(B, rt);
    drawImpacts(B, rt);
    theatre(B);
    showFront(B, rt, st, P);
    // the crowd is the nearest thing to the lens, so it moves the most
    c.save();
    c.translate(W / 2 + X.par(40)[0], H);
    c.scale(1.07, 1.07);
    c.translate(-W / 2, -H);
    crowd(B, st, rt, ap);
    c.restore();
    drawThrows(B, rt);
    if (ap >= 0.6 && Math.random() < dt * (ap - 0.5) * 30) {
      D.particles.push({ x: Math.random() * W, y: -10, vx: 0, vy: 20 * U, life: 1, kind: "confetti", color: pick(["#ff4fa3", "#ffd23f", "#8fe9ff", "#a6d94a"]), s: (3 + Math.random() * 3) * U, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10 });
    }
    X.particlesStep(frozen ? 0 : dt);
    if (B.anim.heckle && rt - B.anim.heckle < 0.5) {
      c.fillStyle = `rgba(60,30,90,${0.35 * (1 - (rt - B.anim.heckle) / 0.5)})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();
    if (flashT && rt - flashT < 0.07) {
      // one inverted frame, like an old anime impact
      c.save();
      c.globalCompositeOperation = "difference";
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  };
})();
