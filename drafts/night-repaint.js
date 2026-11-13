// DRAFT, not part of the game. "Repaint": the current foe drawings with every colour darkened and cooled.
// A fragment for apply.py to paste into a copy of draw.js. While a foe is drawn, the canvas context is
// wrapped so that each colour set on it passes through nightCol(). Eyes and soft light keep their own colour.
  D.foeArt = "now";      // "now" | "night" | "redo"
  let nightSkip = 0;
  const nightCache = {};
  function nightCol(c) {
    if (nightSkip || typeof c !== "string") return c;
    if (nightCache[c] !== undefined) return nightCache[c];
    let m, R, G, B, A = 1;
    if ((m = /^#([0-9a-f]{6})$/i.exec(c))) { const n = parseInt(m[1], 16); R = n >> 16; G = (n >> 8) & 255; B = n & 255; }
    else if ((m = /^rgba?\(([^)]+)\)$/.exec(c))) { const q = m[1].split(",").map(Number); R = q[0]; G = q[1]; B = q[2]; A = q[3] === undefined ? 1 : q[3]; }
    else return (nightCache[c] = c);
    const r1 = R / 255, g1 = G / 255, b1 = B / 255, mx = Math.max(r1, g1, b1), mn = Math.min(r1, g1, b1), L = (mx + mn) / 2, d = mx - mn;
    let H = 0, Sat = 0;
    if (d > 0.0001) { Sat = d / (1 - Math.abs(2 * L - 1)); H = mx === r1 ? ((g1 - b1) / d + 6) % 6 : mx === g1 ? (b1 - r1) / d + 2 : (r1 - g1) / d + 4; H *= 60; }
    // mid tones drop a long way, pale things stay pale, colour is pulled down and toward violet
    const L2 = L > 0.85 ? 0.61 + (L - 0.85) * 1.25 : Math.pow(L, 1.5) * 0.78, S2 = Math.min(1, Sat) * 0.6;
    const dh = ((265 - H + 540) % 360) - 180, H2 = (H + dh * 0.2 + 360) % 360;
    const out = hsl(H2, S2 * 100, L2 * 100), tint = mix(out, "#2a1f45", 0.1);
    return (nightCache[c] = `rgba(${tint[0] | 0},${tint[1] | 0},${tint[2] | 0},${A})`);
  }
  function nightCtx(real) {
    return new Proxy(real, {
      get(tg, k) {
        const v = tg[k];
        if (typeof v !== "function") return v;
        if (k === "createLinearGradient" || k === "createRadialGradient") return (...a) => { const gr = tg[k](...a), add = gr.addColorStop.bind(gr); gr.addColorStop = (o, col) => add(o, nightCol(col)); return gr; };
        return v.bind(tg);
      },
      set(tg, k, v) { tg[k] = k === "fillStyle" || k === "strokeStyle" ? nightCol(v) : v; return true; }
    });
  }
