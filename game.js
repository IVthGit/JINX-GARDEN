// Jinx Garden: the garden, the runs, the card battles, sound and saving.
(function () {
  const D = JG.draw;
  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = "jinxgarden.v1";
  const G = (JG.game = { save: null, selected: null, mode: "title", run: null, B: null, t: 0, hits: [] });
  const rand = Math.random;
  const pick = (a) => a[(rand() * a.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let uid = 1;

  // =====================================================================
  // Sound: a little dark-circus waltz with a fuzzy bass, plus sound effects
  // =====================================================================
  const A = (JG.audio = { ctx: null, on: true, step: 0, nextT: 0 });
  const MEL = [
    [7, null, 3, null, 0, 2], [3, 2, 0, -1, 0, null], [8, null, 7, null, 3, 0], [2, null, -1, null, -5, null],
    [0, 3, 7, null, 12, null], [8, 7, 5, null, 0, null], [-1, 2, 5, null, 2, -1], [0, null, null, null, null, null]
  ];
  const CH = [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-5, -1, 2], [0, 3, 7], [-7, -4, 0], [-5, -1, 2], [0, 3, 7]];
  const hz = (semi, base) => (base || 440) * Math.pow(2, semi / 12);

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = A.ctx;
    A.master = c.createGain();
    A.master.gain.value = 0.55;
    A.master.connect(c.destination);
    A.music = c.createGain();
    A.music.gain.value = A.on ? 0.8 : 0;
    A.music.connect(A.master);
    A.fx = c.createGain();
    A.fx.gain.value = A.on ? 1 : 0;
    A.fx.connect(A.master);
    A.delay = c.createDelay(1);
    A.delay.delayTime.value = 0.3;
    const fb = c.createGain();
    fb.gain.value = 0.32;
    A.delay.connect(fb);
    fb.connect(A.delay);
    const wet = c.createGain();
    wet.gain.value = 0.35;
    A.delay.connect(wet);
    wet.connect(A.music);
    A.fuzz = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 6); }
    A.fuzz.curve = curve;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    A.fuzz.connect(lp);
    lp.connect(A.music);
    const len = c.sampleRate;
    A.noise = c.createBuffer(1, len, c.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = rand() * 2 - 1;
    A.nextT = c.currentTime + 0.1;
    setInterval(schedule, 30);
  };
  A.setOn = function (on) {
    A.on = on;
    if (!A.ctx) return;
    A.music.gain.setTargetAtTime(on ? 0.8 : 0, A.ctx.currentTime, 0.1);
    A.fx.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.05);
  };
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(type, f, t, dur, peak, dest, opts) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (opts && opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    if (opts && opts.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = opts.vib;
      lg.gain.value = f * 0.012;
      l.connect(lg);
      lg.connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.1);
    }
    env(g, t, (opts && opts.a) || 0.008, peak, dur);
    o.connect(g);
    g.connect(dest);
    if (opts && opts.send) g.connect(A.delay);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  function noise(t, dur, peak, type, freq, dest) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise;
    f.type = type;
    f.frequency.value = freq;
    env(g, t, 0.003, peak, dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest || A.fx);
    s.start(t, rand() * 0.5);
    s.stop(t + dur + 0.05);
  }
  function schedule() {
    const c = A.ctx;
    if (!c || c.state !== "running") return;
    const battle = G.mode === "battle";
    const eighth = battle ? 0.155 : 0.2;
    while (A.nextT < c.currentTime + 0.15) {
      const t = A.nextT, bar = Math.floor(A.step / 6) % 8, e = A.step % 6;
      const n = MEL[bar][e];
      const quiet = G.mode === "title" ? 0.6 : 1;
      if (n !== null) {
        osc("square", hz(n), t, eighth * 1.4, 0.035 * quiet, A.music, { vib: 6, send: true });
        osc("triangle", hz(n + 12), t, eighth * 1.2, 0.02 * quiet, A.music, { send: true });
      }
      const ch = CH[bar];
      if (e === 0) {
        osc("sawtooth", hz(ch[0] - 24, 220), t, eighth * 2.2, 0.22, A.fuzz);
        for (const s of ch) osc("sine", hz(s + 12, 220), t, eighth * 7, 0.012, A.music, { a: 0.3, send: true });
      }
      if (e === 2 || e === 4) for (const s of ch) osc("triangle", hz(s, 220), t, eighth * 0.7, 0.025 * quiet, A.music);
      if (battle) {
        if (e === 0 || e === 3) osc("sine", 120, t, 0.18, 0.4, A.music, { to: 45 });
        if (e === 2 || e === 5) noise(t, 0.12, 0.12, "bandpass", 1800, A.music);
        noise(t, 0.03, 0.04, "highpass", 7000, A.music);
      }
      A.nextT += eighth;
      A.step++;
    }
  }
  function sfx(kind) {
    const c = A.ctx;
    if (!c || !A.on) return;
    const t = c.currentTime + 0.01;
    switch (kind) {
      case "hit": noise(t, 0.14, 0.5, "bandpass", 900); osc("sine", 170, t, 0.18, 0.5, A.fx, { to: 45 }); break;
      case "block": osc("triangle", 1200, t, 0.12, 0.2, A.fx, { to: 700 }); osc("square", 2400, t, 0.05, 0.05, A.fx); break;
      case "heal": [660, 880, 1320].forEach((f, i) => osc("sine", f, t + i * 0.07, 0.35, 0.14, A.fx, { send: true })); break;
      case "card": noise(t, 0.05, 0.18, "highpass", 3000); break;
      case "honk": osc("square", 320, t, 0.22, 0.12, A.fx, { to: 250, vib: 18 }); osc("sawtooth", 160, t, 0.22, 0.06, A.fx, { to: 125 }); break;
      case "bell": osc("sine", 1760, t, 0.6, 0.12, A.fx, { send: true }); osc("sine", 2637, t + 0.04, 0.5, 0.07, A.fx); break;
      case "coin": osc("square", 988, t, 0.07, 0.07, A.fx); osc("square", 1319, t + 0.07, 0.18, 0.07, A.fx); break;
      case "gunk": osc("sine", 180, t, 0.25, 0.3, A.fx, { to: 420, vib: 14 }); break;
      case "buff": [440, 554, 659, 880].forEach((f, i) => osc("square", f, t + i * 0.05, 0.12, 0.05, A.fx)); break;
      case "debuff": osc("sawtooth", 300, t, 0.3, 0.08, A.fx, { to: 120, vib: 9 }); break;
      case "dodge": noise(t, 0.2, 0.2, "highpass", 5000); osc("sine", 900, t, 0.15, 0.06, A.fx, { to: 1800 }); break;
      case "win": [523, 659, 784, 1047, 1319].forEach((f, i) => osc("square", f, t + i * 0.09, 0.25, 0.06, A.fx, { send: true })); break;
      case "lose": [392, 349, 311, 233].forEach((f, i) => osc("sawtooth", f, t + i * 0.22, 0.4, 0.07, A.fx, { vib: 5 })); break;
      case "hatch": sfx("bell"); [784, 988, 1175, 1568].forEach((f, i) => osc("triangle", f, t + 0.2 + i * 0.08, 0.3, 0.08, A.fx, { send: true })); break;
      case "eat": noise(t, 0.06, 0.2, "bandpass", 1200); noise(t + 0.12, 0.06, 0.2, "bandpass", 1000); osc("sine", 500, t + 0.25, 0.15, 0.08, A.fx, { to: 800 }); break;
    }
  }
  JG.sfx = sfx;

  // =====================================================================
  // Saving
  // =====================================================================
  function persist() {
    if (!G.save || G.demo) return;
    if (G.run) G.save.run = G.run;
    else delete G.save.run;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* storage blocked: play on without saving */ }
  }
  function loadSave() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const o = JSON.parse(s);
      if (!(o && o.v === 1 && Array.isArray(o.jinxes))) return null;
      for (const j of o.jinxes) if (j.stage !== "egg" && !JG.TRAITS[j.trait]) j.trait = pick(Object.keys(JG.TRAITS));
      return o;
    } catch (e) { return null; }
  }

  function blankStats(lo, hi) {
    const st = {};
    for (const s of JG.STATS) st[s] = { lv: lo + ((rand() * (hi - lo + 1)) | 0), xp: 0 };
    return st;
  }
  function spot() {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.8;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }
  function makeJinx(o) {
    o = o || {};
    const [u, v] = spot();
    return {
      id: uid++ + "-" + Date.now().toString(36), name: o.name || pick(JG.NAMES), stage: "child",
      hue: o.hue !== undefined ? o.hue : (rand() * 360) | 0, seed: rand() * 10, align: o.align || 0,
      stats: o.stats || blankStats(1, 3), belly: 70, mood: 70, love: 10, age: 0, gen: o.gen || 1, u, v,
      trait: o.trait || pick(Object.keys(JG.TRAITS))
    };
  }
  function makeEgg(o) {
    o = o || {};
    const [u, v] = spot();
    return { id: uid++ + "-" + Date.now().toString(36), stage: "egg", hatch: o.hatch || 40, hatchMax: o.hatch || 40, hue: o.hue !== undefined ? o.hue : (rand() * 360) | 0,
      seed: rand() * 10, inherit: o.inherit || null, u, v };
  }
  function newSave() {
    const first = makeJinx({ name: "Pickles", hue: 320 });
    const egg = makeEgg({ hatch: 30 });
    return { v: 1, tix: 40, inv: { moonpie: 2, plum: 1, comet: 1 }, jinxes: [first, egg], sky: [], records: { runs: 0, wins: 0, bestAct: 0, hatched: 1 } };
  }
  function demoSave() {
    const s = newSave();
    const b = makeJinx({ name: "Static", hue: 160, align: -0.6 });
    b.stage = "adult";
    b.stats.grit.lv = 12;
    const c = makeJinx({ name: "Halley", hue: 260, align: 0.7 });
    c.stage = "adult";
    c.stats.juggle.lv = 14;
    s.jinxes.push(b, c);
    s.sky = [{ name: "Bobo", pts: [[0.12, 0.1], [0.17, 0.16], [0.22, 0.12], [0.26, 0.2], [0.2, 0.25]] }];
    return s;
  }

  const need = (lv) => 8 + lv * 2;
  function addXp(j, s, n) {
    const st = j.stats[s];
    let ups = 0;
    st.xp += Math.max(0, Math.round(n));
    while (st.xp >= need(st.lv) && st.lv < 99) { st.xp -= need(st.lv); st.lv++; ups++; }
    if (st.lv >= 99) st.xp = 0;
    return ups;
  }
  const jinxById = (id) => G.save && G.save.jinxes.find((j) => j.id === id);
  function formName(j) {
    if (j.stage === "egg") return "Egg";
    const L = D.jinxLook(j);
    const lean = j.align > 0.33 ? "Stardust" : j.align < -0.33 ? "Sludge" : "Harlequin";
    if (!L.adult) return `Child, leaning ${j.align > 0.15 ? "Stardust" : j.align < -0.15 ? "Sludge" : "nowhere yet"}`;
    const role = { juggle: "Juggler", tumble: "Tumbler", glow: "Seer", grit: "Strongheart" }[L.best];
    return `${lean} ${role}`;
  }

  // =====================================================================
  // UI helpers
  // =====================================================================
  let toastTimer = 0;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  let modalHandlers = {};
  function modal(html, handlers, opts) {
    modalHandlers = handlers || {};
    const m = $("#modal");
    $("#modalBody").innerHTML = html;
    $("#modalBody").className = "flyer" + (opts && opts.wide ? " wide" : "");
    m.hidden = false;
    const f = $("#modalBody").querySelector("button");
    if (f) f.focus({ preventScroll: true });
  }
  function closeModal() { $("#modal").hidden = true; modalHandlers = {}; }
  $("#modal").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const fn = modalHandlers[b.dataset.act];
    if (fn) fn(b);
  });
  function show(id, on) { $(id).hidden = !on; }
  function setMode(m) {
    G.mode = m;
    show("#title", m === "title");
    show("#hud", m === "garden");
    show("#panel", m === "garden" && !!G.selected);
    show("#map", m === "map");
    show("#battle", m === "battle");
    show("#runbar", m === "map" || m === "battle");
    document.body.dataset.mode = m;
    D.clear();
    if (m === "garden") { renderHud(); renderPanel(); }
  }

  function bar(v, max, color) {
    return `<span class="bar"><i style="width:${clamp((v / max) * 100, 0, 100)}%;background:${color}"></i></span>`;
  }
  function itemChip(id, n) {
    const it = JG.ITEMS[id];
    return `<span class="glyph" style="color:${it.color}">${it.glyph}</span>${esc(it.name)}${n > 1 ? ` <b>x${n}</b>` : ""}`;
  }

  // =====================================================================
  // Garden
  // =====================================================================
  function renderHud() {
    $("#tix").textContent = G.save.tix;
    $("#btnSound").textContent = A.on ? "Sound on" : "Sound off";
    $("#btnSound").setAttribute("aria-pressed", A.on ? "true" : "false");
  }
  let feedOpen = false, renaming = false;
  function renderPanel() {
    const p = $("#panel");
    const j = jinxById(G.selected);
    if (!j || G.mode !== "garden") { p.hidden = true; return; }
    p.hidden = false;
    if (j.stage === "egg") {
      p.innerHTML = `<div class="p-head"><h2>A warm egg</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
        <p class="tag">Hatches in about ${Math.ceil(j.hatch)} seconds.</p>
        <p class="note">Tap it to keep it warm and it hatches sooner.${j.inherit ? " Something of " + esc(j.inherit.name) + " is in there." : ""}</p>`;
      return;
    }
    const st = JG.STATS.map((s) => {
      const S = j.stats[s], I = JG.STAT_INFO[s];
      return `<div class="stat"><span class="sl" style="color:${I.color}">${I.label}</span><span class="lv">${S.lv}</span>${bar(S.xp, need(S.lv), I.color)}<span class="sh">${I.hint}</span></div>`;
    }).join("");
    const al = ((j.align + 1) / 2) * 100;
    const inv = Object.keys(G.save.inv).filter((k) => G.save.inv[k] > 0);
    const feed = feedOpen
      ? `<div class="feed">${inv.length ? inv.map((k) => `<button class="chip" data-act="eat" data-item="${k}" title="${esc(JG.ITEMS[k].desc)}">${itemChip(k, G.save.inv[k])}</button>`).join("") : `<p class="note">The pantry is empty. Buy snacks at the Concession stand, or bring some home from a run.</p>`}</div>`
      : "";
    const nameHtml = renaming
      ? `<input id="renameBox" maxlength="14" value="${esc(j.name)}" aria-label="New name">`
      : `<h2>${esc(j.name)}</h2>`;
    p.innerHTML = `<div class="p-head">${nameHtml}<button class="x" data-act="close" aria-label="Close">×</button></div>
      <p class="tag">${formName(j)} · show ${j.age} of 12${j.gen > 1 ? " · generation " + j.gen : ""}</p>
      ${ringHtml(j)}
      <div class="needs">
        <div><span>Belly</span>${bar(j.belly, 100, "#ffb36b")}</div>
        <div><span>Mood</span>${bar(j.mood, 100, "#ff5fa8")}</div>
        <div><span>Love</span>${bar(j.love, 100, "#c9b8ff")}</div>
      </div>
      <div class="stats">${st}</div>
      <div class="align"><span>Sludge</span><span class="track"><i style="left:${al}%"></i></span><span>Stardust</span></div>
      <div class="row">
        <button class="btn small" data-act="pet">Pet</button>
        <button class="btn small${feedOpen ? " on" : ""}" data-act="feed" aria-expanded="${feedOpen}">Feed</button>
        <button class="btn small ghost" data-act="rename">${renaming ? "Save name" : "Rename"}</button>
      </div>
      ${feed}
      <button class="btn big" data-act="run">Take ${esc(j.name)} to the Big Top</button>`;
    if (renaming) {
      const box = $("#renameBox");
      box.focus();
      box.select();
      box.addEventListener("keydown", (e) => { if (e.key === "Enter") finishRename(); });
    }
  }
  function ringHtml(j) {
    const T = JG.TRAITS[j.trait], F = JG.FORMS[leanForm(j)];
    const imp = j.love >= 70 ? "often" : j.love >= 35 ? "now and then" : "rarely";
    const mood = j.mood < 35 ? " Mood is low, so they might phone it in." : "";
    return `<div class="ring"><p><b>${T ? esc(T.name) : ""}.</b> ${T ? esc(T.desc) : ""}</p>
      <p><b style="color:${F.color}">${F.name} in the ring.</b> ${esc(F.desc)} Showstopper: ${esc(F.show)}.</p>
      <p class="note">With this much Love they improvise ${imp}.${mood}</p></div>`;
  }
  function finishRename() {
    const j = jinxById(G.selected), box = $("#renameBox");
    if (j && box) {
      const v = box.value.replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 14);
      if (v) j.name = v;
      persist();
    }
    renaming = false;
    renderPanel();
  }
  $("#panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const j = jinxById(G.selected);
    const act = b.dataset.act;
    if (act === "close") { G.selected = null; feedOpen = false; renaming = false; renderPanel(); return; }
    if (!j) return;
    if (act === "pet") petJinx(j);
    if (act === "feed") { feedOpen = !feedOpen; renderPanel(); }
    if (act === "eat") feedJinx(j, b.dataset.item);
    if (act === "rename") { if (renaming) finishRename(); else { renaming = true; renderPanel(); } }
    if (act === "run") confirmRun(j);
  });

  function jinxScreen(j) {
    const h = G.hits.find((h) => h.j === j);
    return h ? [h.x, h.y] : D.toScreen(j.u, j.v);
  }
  let petCool = 0;
  function petJinx(j) {
    if (petCool > 0) return;
    petCool = 0.35;
    j.love = clamp(j.love + 3, 0, 100);
    j.mood = clamp(j.mood + 8, 0, 100);
    j.happyT = 1.6;
    j.hopT = 1;
    j.sleep = false;
    const [x, y] = jinxScreen(j);
    D.burst(x, y - 20, "heart", 6, "#ff5fa8");
    sfx("bell");
    persist();
    renderPanel();
  }
  function feedJinx(j, id) {
    const it = JG.ITEMS[id];
    if (!it || !(G.save.inv[id] > 0)) return;
    if (it.belly > 0 && j.belly >= 97) { toast(`${j.name} is too full to eat.`); return; }
    G.save.inv[id]--;
    j.belly = clamp(j.belly + (it.belly || 0), 0, 100);
    j.mood = clamp(j.mood + (it.mood || 4), 0, 100);
    j.love = clamp(j.love + (it.love || 2), 0, 100);
    if (it.align) j.align = clamp(j.align + it.align, -1, 1);
    const ups = [];
    for (const s in it.xp || {}) if (addXp(j, s, it.xp[s])) ups.push(JG.STAT_INFO[s].label);
    j.happyT = 1.4;
    const [x, y] = jinxScreen(j);
    D.burst(x, y - 10, "star", 10, it.color);
    sfx("eat");
    if (ups.length) { setTimeout(() => sfx("buff"), 300); toast(`${j.name}'s ${ups.join(" and ")} went up!`); }
    persist();
    renderPanel();
  }

  function gardenStep(dt) {
    petCool -= dt;
    for (const j of G.save.jinxes.slice()) {
      if (j.stage === "egg") {
        if (G.demo) continue;
        j.hatch -= dt;
        j.wobble = Math.max(0, (j.wobble || 0) - dt * 2);
        if (j.hatch <= 0) hatchEgg(j);
        continue;
      }
      j.happyT = Math.max(0, (j.happyT || 0) - dt);
      j.hopT = Math.max(0, (j.hopT || 0) - dt * 1.8);
      j.spinT = Math.max(0, (j.spinT || 0) - dt * 1.2);
      j.belly = clamp(j.belly - dt / 25, 0, 100);
      if (j.belly < 25) j.mood = clamp(j.mood - dt / 20, 0, 100);
      else if (j.mood < 55) j.mood = clamp(j.mood + dt / 40, 0, 100);
      if (G.selected === j.id) { j.moving = false; continue; }
      if (j.moving) {
        const dx = j.tx - j.u, dy = j.ty - j.v, d = Math.hypot(dx, dy);
        const sp = 0.1 * (j.stage === "adult" ? 1.15 : 0.9) * (j.mood < 30 ? 0.5 : 1);
        if (d < 0.02) { j.moving = false; j.idle = 1.5 + rand() * 5; }
        else {
          j.u += (dx / d) * sp * dt;
          j.v += (dy / d) * sp * dt * 1.2;
          j.dir = dx < 0 ? -1 : 1;
        }
      } else {
        j.idle = (j.idle === undefined ? rand() * 3 : j.idle) - dt;
        if (j.idle <= 0) {
          const r = rand();
          j.sleep = false;
          if (r < 0.14) { j.hopT = 1; j.idle = 1.2; sfx("bell"); }
          else if (r < 0.22 && j.mood > 40) { j.spinT = 1; j.idle = 1.4; }
          else if (r < 0.3 && (j.mood < 40 || j.belly < 30)) { j.sleep = true; j.idle = 6; }
          else { const [u, v] = spot(); j.tx = u; j.ty = v; j.moving = true; }
        }
      }
      if (j.mood > 80 && rand() < dt * 0.15) {
        const [x, y] = jinxScreen(j);
        D.burst(x, y - 30, "note", 1, "#c9b8ff");
      }
    }
    G.panelT = (G.panelT || 0) + dt;
    if (G.panelT > 2 && G.selected && !renaming) { G.panelT = 0; renderPanel(); }
    G.saveT = (G.saveT || 0) + dt;
    if (G.saveT > 10) { G.saveT = 0; persist(); }
  }

  function hatchEgg(e) {
    const inh = e.inherit;
    const j = makeJinx({ hue: e.hue, name: inh ? inh.name : undefined, align: inh ? inh.align : 0, gen: inh ? inh.gen : 1, trait: inh ? inh.trait : undefined });
    if (inh) for (const s of JG.STATS) j.stats[s].lv = Math.max(j.stats[s].lv, inh.stats[s]);
    j.u = e.u; j.v = e.v; j.love = inh ? 30 : 10;
    const i = G.save.jinxes.indexOf(e);
    G.save.jinxes[i] = j;
    G.save.records.hatched++;
    if (G.selected === e.id) G.selected = j.id;
    const [x, y] = D.toScreen(j.u, j.v);
    D.burst(x, y - 20, "star", 16, "#ffd23f");
    D.burst(x, y - 20, "heart", 4, "#ff5fa8");
    sfx("hatch");
    toast(inh ? `${j.name} was born again!` : `An egg hatched! Say hi to ${j.name}.`);
    persist();
    renderPanel();
  }

  $("#scene").addEventListener("pointerdown", (e) => {
    if (G.mode !== "garden") return;
    A.init();
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 1e9;
    for (const h of G.hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < h.r * 1.6 && d < bd) { bd = d; best = h; }
    }
    if (!best) { if (G.selected) { G.selected = null; feedOpen = false; renaming = false; renderPanel(); } return; }
    const j = best.j;
    if (j.stage === "egg") {
      j.hatch = Math.max(0.01, j.hatch - 3);
      j.wobble = 1;
      sfx("bell");
      D.burst(best.x, best.y, "star", 4, "#ffd23f");
    } else if (G.selected === j.id) { petJinx(j); return; }
    else sfx("honk");
    if (G.selected !== j.id) { feedOpen = false; renaming = false; }
    G.selected = j.id;
    renderPanel();
  });

  function openShop() {
    const s = G.save;
    const full = s.jinxes.length >= 6;
    const rows = JG.SHOP_ITEMS.map((id) => {
      const it = JG.ITEMS[id];
      return `<div class="shoprow"><div>${itemChip(id)}<small>${esc(it.desc)}</small></div><span class="have">have ${s.inv[id] || 0}</span><button class="btn small" data-act="buy" data-item="${id}" ${s.tix < it.price ? "disabled" : ""}>${it.price} Tix</button></div>`;
    }).join("");
    modal(`<h2>Concession Stand</h2><p class="tag">You have <b class="tixnum">${s.tix}</b> Tix. Snacks go in the pantry.</p>
      <div class="shoplist">${rows}
      <div class="shoprow"><div><span class="glyph" style="color:#ffd23f">⬮</span>A mystery egg<small>${full ? "The garden is full (6 at most)." : "Something wriggles inside."}</small></div><span class="have"></span><button class="btn small" data-act="egg" ${s.tix < 80 || full ? "disabled" : ""}>80 Tix</button></div>
      </div><button class="btn" data-act="close">Done</button>`, {
      close: closeModal,
      buy: (b) => {
        const id = b.dataset.item, it = JG.ITEMS[id];
        if (s.tix < it.price) return;
        s.tix -= it.price;
        s.inv[id] = (s.inv[id] || 0) + 1;
        sfx("coin");
        persist();
        renderHud();
        renderPanel();
        openShop();
      },
      egg: () => {
        if (s.tix < 80 || s.jinxes.length >= 6) return;
        s.tix -= 80;
        const e = makeEgg({ hatch: 40 });
        s.jinxes.push(e);
        sfx("coin");
        persist();
        renderHud();
        closeModal();
        toast("A new egg! Tap it to keep it warm.");
      }
    });
  }
  function openSky() {
    const s = G.save, r = s.records;
    const list = s.sky.length
      ? `<ul class="skylist">${s.sky.map((c) => `<li><b>${esc(c.name)}</b> ${esc(c.note || "")}</li>`).join("")}</ul>`
      : `<p class="note">No one is up there yet. After a Jinx's twelfth show, they rise into the sky as a constellation.</p>`;
    modal(`<h2>The Sky</h2><p class="tag">Shows: ${r.runs} · full wins: ${r.wins} · furthest act: ${r.bestAct || "none yet"} · hatched: ${r.hatched}</p>${list}
      <h3>How it works</h3>
      <ul class="howto">
        <li>Tap a Jinx to see it. Tap again to pet it.</li>
        <li>Food raises stats. Cotton Comets and Angel Floss lean a Jinx toward Stardust; Sludge Pops and Black Hole Gum lean it toward Sludge.</li>
        <li>After 3 shows a child grows up. How it leans, and its best stat, decide what it becomes.</li>
        <li>On a run, the cards you play train the matching stat: attacks train Juggle, guards Tumble, ether Glow, and taking hits trains Grit.</li>
        <li>In a fight, the crowd's Applause fills as you play a mix of cards and avoid hits. When it's full, use your Showstopper.</li>
        <li>Each Jinx has a trait, and the more Love it has, the more often it improvises a free move. A sad Jinx sometimes phones it in.</li>
        <li>How a Jinx leans changes how it fights: Sludge builds Corruption, Stardust builds Starlight, and Harlequins get a Wild card every turn.</li>
        <li>If your Jinx faints, it comes home sad with less of what it learned and only one thing from its bag.</li>
      </ul>
      <button class="btn" data-act="close">Back</button>`, { close: closeModal });
  }

  function confirmRun(j) {
    if (j.belly < 15) { toast(`${j.name} is too hungry to perform. Feed them first.`); return; }
    const deck = starterDeck(j);
    modal(`<h2>Showtime for ${esc(j.name)}?</h2>
      <p>Three acts of the cosmic circus: <b>${JG.ACTS.map((a) => a.name).join("</b>, <b>")}</b>. Each act ends with a Ringmaster.</p>
      ${ringHtml(j)}
      <p class="note">Health ${maxHpFor(j, []) + (j.trait === "glutton" && j.belly >= 70 ? 6 : 0)}. Starting deck of ${deck.length}: ${deckSummary(deck)}.</p>
      <div class="row"><button class="btn big" data-act="go">Raise the curtain</button><button class="btn ghost" data-act="close">Not yet</button></div>`,
      { close: closeModal, go: () => { closeModal(); startRun(j); } });
  }

  // =====================================================================
  // Runs
  // =====================================================================
  function maxHpFor(j, charms) { return 24 + j.stats.grit.lv * 2 + (charms.includes("heart") ? 12 : 0); }
  function starterDeck(j) {
    const d = ["pie", "pie", "pie", "pie", "cart", "cart", "cart"];
    d.push(j.align > 0.33 ? "halohum" : j.align < -0.33 ? "gunkspit" : "honk");
    if (j.stage === "adult") {
      const best = D.jinxLook(j).best;
      d.push({ juggle: "juggle", tumble: "backflip", glow: "moonbeam", grit: "bath" }[best]);
    }
    return d;
  }
  function deckSummary(deck) {
    const c = {};
    deck.forEach((id) => (c[id] = (c[id] || 0) + 1));
    return Object.keys(c).map((id) => `${c[id]} ${JG.CARDS[id].name}`).join(", ");
  }
  function startRun(j) {
    A.init();
    G.selected = null;
    const run = { jid: j.id, act: 1, floor: -1, at: -1, map: genMap(1), deck: starterDeck(j), charms: [], tix: 0, loot: [], xp: { juggle: 0, tumble: 0, glow: 0, grit: 0 }, patchUsed: false, seen: [], foesSeen: [] };
    run.maxHp = maxHpFor(j, run.charms) + (j.trait === "glutton" && j.belly >= 70 ? 6 : 0);
    run.hp = run.maxHp;
    run.loveStart = j.love;
    run.moodStart = j.mood;
    G.run = run;
    j.sleep = false;
    persist();
    enterMap();
  }
  const runJinx = () => jinxById(G.run.jid);

  function genMap(act) {
    const floors = [];
    for (let f = 0; f < 5; f++) {
      const n = f === 0 ? 3 : 2 + ((rand() * 3) | 0);
      const row = [];
      for (let i = 0; i < n; i++) {
        let type = "fight";
        if (f === 4) type = rand() < 0.6 ? "rest" : "shop";
        else if (f > 0) {
          const r = rand();
          type = r < 0.42 ? "fight" : r < 0.66 ? "event" : r < 0.77 ? "shop" : r < 0.87 ? "rest" : f >= 2 ? "elite" : "fight";
        }
        row.push({ type, x: (i + 1) / (n + 1) + (rand() - 0.5) * 0.04, next: [] });
      }
      floors.push(row);
    }
    // guarantee one elite in the middle of the act
    if (!floors[2].concat(floors[3]).some((n) => n.type === "elite")) pick(floors[2 + ((rand() * 2) | 0)]).type = "elite";
    for (let f = 0; f < 4; f++) {
      const a = floors[f], b = floors[f + 1];
      a.forEach((n) => {
        const order = b.map((m, i) => [Math.abs(m.x - n.x), i]).sort((p, q) => p[0] - q[0]);
        n.next.push(order[0][1]);
        if (order[1] && rand() < 0.45 && order[1][0] < 0.4) n.next.push(order[1][1]);
      });
      b.forEach((m, i) => {
        if (!a.some((n) => n.next.includes(i))) {
          const order = a.map((n, k) => [Math.abs(n.x - m.x), k]).sort((p, q) => p[0] - q[0]);
          a[order[0][1]].next.push(i);
        }
      });
    }
    floors[4].forEach((n) => n.next.push(0));
    floors.push([{ type: "boss", x: 0.5, next: [] }]);
    return floors;
  }
  const NODE = {
    fight: { glyph: "✶", label: "Heckler" },
    elite: { glyph: "☠︎", label: "Headliner" },
    event: { glyph: "?", label: "Sideshow" },
    shop: { glyph: "¢", label: "Snack stand" },
    rest: { glyph: "☾", label: "Fortune tent" },
    boss: { glyph: "♛︎", label: "Ringmaster" }
  };
  function available() {
    const r = G.run;
    if (r.floor < 0) return r.map[0].map((_, i) => [0, i]);
    const node = r.map[r.floor][r.at];
    return node.next.map((i) => [r.floor + 1, i]);
  }

  function renderRunbar() {
    const r = G.run, j = runJinx();
    if (!r || !j) return;
    $("#runbar").innerHTML = `<span class="rb-name">${esc(j.name)}</span>
      <span class="rb-hp">${bar(r.hp, r.maxHp, "#ff5fa8")}<b>${r.hp}/${r.maxHp}</b></span>
      <span class="rb-tix"><b>${r.tix}</b> Tix</span>
      <button class="chip" data-act="deck">Deck ${r.deck.length}</button>
      <span class="rb-charms">${r.charms.map((c) => `<span class="charm" title="${esc(JG.CHARMS[c].name + ": " + JG.CHARMS[c].desc)}" style="color:${JG.CHARMS[c].color}">${JG.CHARMS[c].glyph}</span>`).join("")}</span>
      <span class="rb-loot" title="${esc(r.loot.map((id) => JG.ITEMS[id].name).join(", ") || "Nothing yet")}">Bag ${r.loot.length}</span>`;
  }
  $("#runbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b && b.dataset.act === "deck") showDeck();
  });
  function showDeck(onPick, title, onCancel) {
    const r = G.run;
    const cards = r.deck.map((id, i) => cardHtml(id, { i, act: onPick ? "pick" : "" })).join("");
    modal(`<h2>${title || "Your deck"}</h2>${onPick ? `<p class="tag">Pick a card.</p>` : ""}<div class="cardgrid">${cards}</div><button class="btn ghost" data-act="close">${onPick ? "Never mind" : "Close"}</button>`,
      { close: onCancel || closeModal, pick: (b) => onPick && onPick(+b.dataset.i) }, { wide: true });
  }

  function enterMap() {
    const r = G.run;
    setMode("map");
    renderRunbar();
    const act = JG.ACTS[r.act - 1];
    $("#mapTitle").innerHTML = `<small>Act ${["I", "II", "III"][r.act - 1]}</small>${esc(act.name)}`;
    const avail = available().map((p) => p.join(":"));
    const rowH = 92;
    const H = r.map.length * rowH + 40;
    let lines = "", nodes = "";
    r.map.forEach((row, f) => {
      row.forEach((n, i) => {
        const y = H - 46 - f * rowH;
        n.next.forEach((k) => {
          const m = r.map[f + 1][k];
          const done = n.done && m.done;
          lines += `<line x1="${n.x * 100}%" y1="${y}" x2="${m.x * 100}%" y2="${y - rowH}" class="${done ? "done" : ""}"/>`;
        });
        const key = f + ":" + i;
        const can = avail.includes(key);
        const here = r.floor === f && r.at === i;
        nodes += `<button class="node n-${n.type}${can ? " can" : ""}${n.done ? " done" : ""}${here ? " here" : ""}" style="left:${n.x * 100}%;top:${y}px" data-f="${f}" data-i="${i}" ${can ? "" : "disabled"} aria-label="${NODE[n.type].label}${can ? ", you can go here" : ""}">
          <span class="ng">${NODE[n.type].glyph}</span><span class="nl">${NODE[n.type].label}</span></button>`;
      });
    });
    $("#mapBoard").style.height = H + "px";
    $("#mapBoard").innerHTML = `<svg class="maplines" width="100%" height="${H}" aria-hidden="true">${lines}</svg>${nodes}`;
    const sc = $("#mapScroll");
    const targetY = H - 46 - (r.floor + 1) * rowH;
    requestAnimationFrame(() => (sc.scrollTop = targetY - sc.clientHeight * 0.6));
    persist();
  }
  $("#mapBoard").addEventListener("click", (e) => {
    const b = e.target.closest(".node.can");
    if (!b) return;
    A.init();
    const f = +b.dataset.f, i = +b.dataset.i;
    const r = G.run;
    r.floor = f;
    r.at = i;
    const node = r.map[f][i];
    sfx("card");
    const act = JG.ACTS[r.act - 1];
    if (node.type === "fight") {
      const pool = act.foes.filter((id) => !r.foesSeen.slice(-2).includes(id));
      const id = pick(pool.length ? pool : act.foes);
      r.foesSeen.push(id);
      startBattle(id, "fight");
    } else if (node.type === "elite") startBattle(pick(act.elite), "elite");
    else if (node.type === "boss") startBattle(act.boss, "boss");
    else if (node.type === "event") runEvent();
    else if (node.type === "shop") runShop();
    else if (node.type === "rest") runRest();
  });
  function nodeDone() {
    const r = G.run;
    r.map[r.floor][r.at].done = true;
    enterMap();
  }

  // ---------- cards ----------
  function bonuses(j) {
    const s = j.stats;
    return { atk: Math.floor(s.juggle.lv / 5), blk: Math.floor(s.tumble.lv / 5), heal: Math.floor(s.glow.lv / 6), gunk: Math.floor(s.glow.lv / 8) };
  }
  function dmgValue(base, B) {
    // shown and dealt damage per hit, from the player's point of view
    const j = B ? B.jinx : runJinx();
    let d = base + bonuses(j).atk + (B ? B.p.st.hype || 0 : 0);
    if (B && B.p.st.dazed) d *= 0.75;
    if (B && B.foe.st.pied) d *= 1.5;
    return Math.max(0, Math.floor(d));
  }
  function cardText(id, B) {
    const c = JG.CARDS[id], fx = c.fx, j = B ? B.jinx : runJinx(), bo = bonuses(j);
    const p = [];
    if (fx.selfdmg) p.push(`Lose ${fx.selfdmg} health.`);
    if (fx.dmg) p.push(`Deal ${dmgValue(fx.dmg, B)}${fx.hits > 1 ? ` ×${fx.hits}` : ""}.`);
    if (fx.blockHit) p.push(`Deal damage equal to your Block${B ? ` (${B.p.block})` : ""}.`);
    if (fx.piedHit) p.push(`If the foe is Pied, hit again.`);
    if (fx.block) p.push(`Block ${fx.block + bo.blk}.`);
    if (fx.heal) p.push(`Heal ${fx.heal + bo.heal}.`);
    if (fx.gunk) p.push(`Apply ${fx.gunk + bo.gunk} Gunk.`);
    if (fx.doubleGunk) p.push(`Double the foe's Gunk.`);
    if (fx.dazed) p.push(`Daze ${fx.dazed}.`);
    if (fx.pied) p.push(`Pie ${fx.pied}.`);
    if (fx.hype) p.push(`Gain ${fx.hype} Hype.`);
    if (fx.energy) p.push(`Gain ${fx.energy} energy.`);
    if (fx.draw) p.push(`Draw ${fx.draw}.`);
    if (c.exhaust) p.push(`<em>Once per fight.</em>`);
    return p.join(" ");
  }
  function cardHtml(id, o) {
    o = o || {};
    const c = JG.CARDS[id], T = JG.TYPE_INFO[c.type];
    const rar = ["Starter", "Common", "Uncommon", "Rare"][c.rarity];
    return `<button class="card t-${c.type}${o.dim ? " dim" : ""}${o.wild ? " wild" : ""}" style="--tc:${T.color}" ${o.act ? `data-act="${o.act}"` : ""} ${o.i !== undefined ? `data-i="${o.i}"` : ""} ${o.disabled ? "disabled" : ""}>
      ${o.wild ? `<span class="wildtag">Wild \u00D72</span>` : ""}<span class="cost">${c.cost}</span><span class="cname">${esc(c.name)}</span><span class="cart">${T.glyph}</span>
      <span class="ctext">${cardText(id, o.B)}</span><span class="ctype">${T.label} · ${rar}${o.price ? ` · <b>${o.price} Tix</b>` : ""}</span></button>`;
  }
  function rewardCards(kind) {
    const j = runJinx();
    const pool = Object.keys(JG.CARDS).filter((id) => JG.CARDS[id].rarity > 0);
    const weight = (id) => {
      const c = JG.CARDS[id];
      let w = [0, 6, 3, 1][c.rarity] * (kind === "boss" && c.rarity === 3 ? 6 : 1) * (kind === "elite" && c.rarity >= 2 ? 2 : 1);
      if (c.type === "eth") w *= 1 + Math.max(0, j.align) * 2;
      if (c.type === "gunk") w *= 1 + Math.max(0, -j.align) * 2;
      return w;
    };
    const out = [];
    while (out.length < 3) {
      const cand = pool.filter((id) => !out.includes(id));
      const tot = cand.reduce((s, id) => s + weight(id), 0);
      let r = rand() * tot;
      for (const id of cand) { r -= weight(id); if (r <= 0) { out.push(id); break; } }
      if (r > 0) out.push(cand[cand.length - 1]);
    }
    return out;
  }

  // ---------- battle ----------
  // Three layers sit on top of the card play:
  // Applause (the crowd), the Jinx's own will (love, mood and trait), and a mechanic per lean (form).
  function leanForm(j) { return j.align <= -0.33 ? "sludge" : j.align >= 0.33 ? "stardust" : "harlequin"; }
  JG.leanForm = leanForm;
  const scr = (k) => (G.B && G.B.screen && G.B.screen[k]) || { x: 0, y: 0 };
  const runLove = () => (G.run.loveStart === undefined ? runJinx().love : G.run.loveStart);
  const runMood = () => (G.run.moodStart === undefined ? runJinx().mood : G.run.moodStart);
  function improviseChance(j) { return clamp(runLove() / 250, 0.04, 0.4) + (j.trait === "showoff" ? 0.1 : 0); }
  function flubChance() { const m = runMood(); return m < 15 ? 0.25 : m < 35 ? 0.12 : 0; }

  function startBattle(foeId, kind) {
    const r = G.run, j = runJinx(), def = JG.FOES[foeId];
    const hp = def.hp[0] + ((rand() * (def.hp[1] - def.hp[0] + 1)) | 0);
    const B = (G.B = {
      act: r.act, kind, jinx: j, form: leanForm(j),
      foe: { id: foeId, def, hp, maxHp: hp, block: 0, st: {}, mi: 0, charge: false },
      p: { block: 0, st: {}, energy: 3 },
      draw: shuffle(r.deck.map((id) => ({ id, u: uid++ }))), hand: [], disc: [], exh: [],
      turn: 0, busy: false, over: null, anim: {},
      applause: r.charms.includes("rose") ? 25 : 0, res: 0, wild: null, lastType: null, lastCard: null, played: 0, tookDmg: 0
    });
    if (r.charms.includes("nose")) B.p.st.hype = 1;
    if (r.charms.includes("kazoo")) B.foe.st.dazed = 1;
    B.foe.intent = def.moves[0];
    setMode("battle");
    renderRunbar();
    $("#foeName").textContent = def.name;
    $("#battleTitle").textContent = kind === "boss" ? "Ringmaster" : kind === "elite" ? "Headliner" : "Heckler";
    startTurn(true);
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const k = (rand() * (i + 1)) | 0; [a[i], a[k]] = [a[k], a[i]]; }
    return a;
  }
  function drawCards(n) {
    const B = G.B;
    for (let i = 0; i < n; i++) {
      if (B.hand.length >= 10) break;
      if (!B.draw.length) { if (!B.disc.length) break; B.draw = shuffle(B.disc); B.disc = []; }
      B.hand.push(B.draw.pop());
    }
  }

  function addApplause(n, label) {
    const B = G.B;
    if (!B || B.over || !n) return;
    const was = B.applause;
    B.applause = clamp(B.applause + n, 0, 100);
    const pp = scr("p");
    if (label) D.float(pp.x, pp.y - 115, label, n > 0 ? "#ffd23f" : "#9a8fb0");
    if (was < 100 && B.applause >= 100) {
      const { W, H } = D.size();
      D.float(W / 2, H * 0.32, "Showstopper ready!", "#ffd23f", true);
      D.burst(W / 2, H * 0.3, "confetti", 36, "multi");
      sfx("buff");
    }
  }
  function gainRes(n) {
    const B = G.B;
    if (!n || B.form === "harlequin") return;
    const cap = B.form === "stardust" ? 5 : 30;
    const before = B.res;
    B.res = Math.min(cap, B.res + n);
    if (B.res > before) {
      const pp = scr("p");
      D.float(pp.x + 40, pp.y - 70, `+${B.res - before} ${JG.FORMS[B.form].res}`, JG.FORMS[B.form].color);
    }
  }
  function scaleFx(fx, k) {
    const o = {};
    for (const key in fx) {
      const v = fx[key];
      o[key] = ["hits", "piedHit", "doubleGunk", "blockHit"].includes(key) || typeof v !== "number" ? v : Math.max(1, Math.floor(v * k));
    }
    if (fx.blockHit) o.blockScale = k;
    return o;
  }

  function startTurn(first) {
    const B = G.B, r = G.run, j = B.jinx;
    B.turn++;
    if (!first && B.tookDmg === 0) addApplause(10, "Flawless!");
    B.tookDmg = 0;
    B.played = 0;
    B.p.block = first && r.charms.includes("bell") ? 6 : 0;
    B.p.energy = 3 + (first && r.charms.includes("glowstick") ? 1 : 0);
    if (B.p.st.gunk) {
      const g = B.p.st.gunk;
      hurtPlayer(g, true);
      B.p.st.gunk = g - 1;
      if (B.over) return;
    }
    if (B.form === "stardust" && B.res) {
      B.p.block += B.res * 2;
      const pp = scr("p");
      D.float(pp.x, pp.y - 30, `◆ ${B.res * 2} Starlight`, "#8fe9ff");
    }
    let n = 5 + (r.charms.includes("shoes") ? 1 : 0);
    if (j.trait === "daydream" && rand() < 0.2) { n++; D.float(scr("p").x, scr("p").y - 90, "Daydream: +1 card", "#c9b8ff"); }
    drawCards(n);
    if (j.trait === "daydream" && !first && B.hand.length > 2 && rand() < 0.1) {
      B.disc.push(B.hand.splice((rand() * B.hand.length) | 0, 1)[0]);
      D.float(scr("p").x, scr("p").y - 90, "Forgot a card…", "#9a8fb0");
    }
    B.wild = B.form === "harlequin" && B.hand.length ? pick(B.hand).u : null;
    B.busy = false;
    renderBattle();
  }
  function statusHtml(st, block) {
    const out = [];
    if (block) out.push(`<span class="st st-block" title="Block: stops this much damage until the start of the next turn">◆ ${block}</span>`);
    if (st.hype) out.push(`<span class="st st-hype" title="Hype: +${st.hype} damage on every hit">▲ Hype ${st.hype}</span>`);
    if (st.dazed) out.push(`<span class="st st-dazed" title="Dazed: deals 25% less damage. Lasts ${st.dazed} more turn(s)">✵ Dazed ${st.dazed}</span>`);
    if (st.pied) out.push(`<span class="st st-pied" title="Pied: takes 50% more damage. Lasts ${st.pied} more turn(s)">● Pied ${st.pied}</span>`);
    if (st.gunk) out.push(`<span class="st st-gunk" title="Gunk: loses ${st.gunk} health at the start of each turn, then it drops by 1">☣ Gunk ${st.gunk}</span>`);
    return out.join("");
  }
  function resHtml(B) {
    if (B.form === "sludge") return `<span class="st st-res sludge" title="${esc(JG.FORMS.sludge.desc)}">☣ Corruption ${B.res}${B.res >= 10 ? " · hits add Gunk" : ""}</span>`;
    if (B.form === "stardust") return `<span class="st st-res stardust" title="${esc(JG.FORMS.stardust.desc)}">☾ Starlight ${B.res}/5</span>`;
    return `<span class="st st-res harlequin" title="${esc(JG.FORMS.harlequin.desc)}">♠ One Wild card each turn</span>`;
  }
  function foeHitValue(base) {
    const B = G.B;
    let d = base + (B.foe.st.hype || 0);
    if (B.foe.st.dazed) d *= 0.75;
    if (B.p.st.pied) d *= 1.5;
    return Math.floor(d);
  }
  function intentHtml(m) {
    const p = [];
    if (m.charge) p.push(`<span class="in in-charge">⚡︎ Charging up</span>`);
    if (m.atk) p.push(`<span class="in in-atk">✶ Attack ${foeHitValue(m.atk)}${m.n > 1 ? "×" + m.n : ""}</span>`);
    if (m.blk) p.push(`<span class="in in-blk">◆ Block</span>`);
    if (m.heal) p.push(`<span class="in in-heal">✚ Heal</span>`);
    if (m.hype) p.push(`<span class="in in-buff">▲ Hype</span>`);
    if (m.dazed) p.push(`<span class="in in-debuff">✵ Daze you</span>`);
    if (m.pied) p.push(`<span class="in in-debuff">● Pie you</span>`);
    if (m.gunk) p.push(`<span class="in in-gunk">☣ Gunk you</span>`);
    if (m.heckle) p.push(`<span class="in in-heckle" title="Heckling drains your Applause">☹︎ Heckle</span>`);
    return p.join("");
  }
  function renderBattle() {
    const B = G.B, r = G.run;
    if (!B) return;
    const j = B.jinx, F = JG.FORMS[B.form], T = JG.TRAITS[j.trait];
    $("#youHp").innerHTML = `${bar(r.hp, r.maxHp, "#ff5fa8")}<b>${r.hp}/${r.maxHp}</b>`;
    $("#youSt").innerHTML = resHtml(B) + statusHtml(B.p.st, B.p.block);
    $("#youName").textContent = j.name;
    $("#youTag").textContent = `${T ? T.name : "Performing"} · ${F.name}`;
    $("#youTag").title = T ? T.desc : "";
    $("#foeHp").innerHTML = `${bar(B.foe.hp, B.foe.maxHp, "#a6d94a")}<b>${Math.max(0, B.foe.hp)}/${B.foe.maxHp}</b>`;
    $("#foeSt").innerHTML = statusHtml(B.foe.st, B.foe.block);
    $("#intent").innerHTML = B.over ? "" : `<span class="in-label">Next:</span>${intentHtml(B.foe.intent)}`;
    $("#energy").innerHTML = `<b>${B.p.energy}</b><small>energy</small>`;
    $("#pileDraw").textContent = `Draw ${B.draw.length}`;
    $("#pileDisc").textContent = `Used ${B.disc.length}`;
    $("#hand").innerHTML = B.hand.map((c, i) => cardHtml(c.id, { i, act: "play", B, wild: c.u === B.wild, dim: JG.CARDS[c.id].cost > B.p.energy, disabled: B.busy || !!B.over })).join("");
    $("#hand").style.setProperty("--n", B.hand.length);
    const full = B.applause >= 100;
    $("#applause").classList.toggle("full", full);
    $("#applause i").style.width = B.applause + "%";
    $("#applauseNum").textContent = full ? "Ready!" : Math.round(B.applause);
    const ss = $("#showstop");
    ss.hidden = !full || !!B.over;
    ss.disabled = B.busy;
    ss.innerHTML = `Showstopper<small>${esc(F.show)}</small>`;
    ss.title = F.showDesc;
    $("#endTurn").disabled = B.busy || !!B.over;
    renderRunbar();
  }
  $("#hand").addEventListener("click", (e) => {
    const b = e.target.closest(".card");
    if (!b || b.disabled) return;
    playCard(+b.dataset.i);
  });
  $("#endTurn").addEventListener("click", () => endTurn());
  $("#showstop").addEventListener("click", () => showstopper());
  addEventListener("keydown", (e) => {
    if (G.mode !== "battle" || !G.B || G.B.busy || G.B.over || !$("#modal").hidden) return;
    if (e.key === "e" || e.key === "E") endTurn();
    if (e.key === "s" || e.key === "S") showstopper();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) playCard(n - 1);
  });

  function gainRunXp(stat, n) { if (stat) G.run.xp[stat] += n; }
  async function playCard(i) {
    const B = G.B;
    if (!B || B.busy || B.over) return;
    const card = B.hand[i];
    if (!card) return;
    const c = JG.CARDS[card.id];
    if (c.cost > B.p.energy) { toast("Not enough energy. End your turn to get more."); return; }
    const j = B.jinx;
    const half = rand() < flubChance();
    const wild = card.u === B.wild;
    B.busy = true;
    B.p.energy -= c.cost;
    B.hand.splice(i, 1);
    (c.exhaust ? B.exh : B.disc).push(card);
    if (wild) B.wild = null;
    sfx("card");
    const T = JG.TYPE_INFO[c.type];
    if (T.stat) gainRunXp(T.stat, 2);
    else {
      let low = "juggle";
      for (const s of JG.STATS) if (j.stats[s].lv < j.stats[low].lv) low = s;
      gainRunXp(low, 2);
    }
    if (c.type === "gunk") gainRunXp("glow", 1);
    B.played++;
    const pp = scr("p");
    if (half) {
      addApplause(2);
      D.float(pp.x, pp.y - 95, `${j.name} phones it in…`, "#9a8fb0");
    } else {
      const variety = B.lastType && B.lastType !== c.type;
      addApplause(6 + (variety ? 6 : 0) + (j.trait === "showoff" ? 3 : 0));
    }
    if (wild) D.float(pp.x, pp.y - 95, "Wild! Twice!", "#ff5fa8", true);
    B.lastType = c.type;
    B.lastCard = card.id;
    if (B.form === "stardust" && c.type === "eth") gainRes(1);
    const fx = half ? scaleFx(c.fx, 0.5) : c.fx;
    for (let rep = 0; rep < (wild ? 2 : 1); rep++) {
      if (!(await applyFx(fx))) return;
      if (rep === 0 && wild) await sleep(200);
    }
    B.busy = false;
    renderBattle();
  }
  // Runs one card's effects. Returns false once the fight is over.
  async function applyFx(fx) {
    const B = G.B, r = G.run, bo = bonuses(B.jinx), pp = scr("p"), fp = scr("f");
    if (fx.selfdmg) { hurtPlayer(fx.selfdmg, true); if (B.over) return false; }
    if (fx.hype) { B.p.st.hype = (B.p.st.hype || 0) + fx.hype; D.float(pp.x, pp.y - 50, `+${fx.hype} Hype`, "#ff8a3d"); sfx("buff"); }
    if (fx.block) { B.p.block += fx.block + bo.blk; D.float(pp.x, pp.y - 30, `◆ ${fx.block + bo.blk}`, "#ffd23f"); sfx("block"); }
    if (fx.heal) {
      const h = Math.min(r.maxHp - r.hp, fx.heal + bo.heal);
      r.hp += h;
      D.float(pp.x, pp.y - 70, `+${h}`, "#8fe9ff");
      D.burst(pp.x, pp.y, "star", 8, "#8fe9ff");
      sfx("heal");
    }
    renderBattle();
    if (fx.dmg || fx.blockHit) {
      const hits = fx.hits || 1;
      const hit = () => (fx.dmg ? dmgValue(fx.dmg, B) : Math.floor(B.p.block * (fx.blockScale || 1)));
      for (let h = 0; h < hits; h++) {
        B.anim.pLunge = G.t;
        await sleep(140);
        hurtFoe(hit());
        if (B.over) return false;
        sludgeTouch();
        await sleep(hits > 1 ? 160 : 120);
      }
      if (fx.piedHit && B.foe.st.pied) {
        B.anim.pLunge = G.t;
        await sleep(140);
        hurtFoe(hit());
        if (B.over) return false;
        sludgeTouch();
      }
    }
    if (fx.gunk) applyGunk(fx.gunk + bo.gunk);
    if (fx.doubleGunk) {
      if (B.foe.st.gunk) {
        const add = B.foe.st.gunk;
        B.foe.st.gunk *= 2;
        D.float(fp.x, fp.y - 40, `Gunk ×2`, "#a6d94a");
        sfx("gunk");
        if (B.form === "sludge") gainRes(Math.ceil(add / 2));
      } else D.float(fp.x, fp.y - 40, "No Gunk to double", "#cfc6d8");
    }
    if (fx.dazed) { addFoeSt("dazed", fx.dazed); sfx("honk"); }
    if (fx.pied) { addFoeSt("pied", fx.pied); D.burst(fp.x, fp.y - 20, "drop", 12, "#efe6d2"); sfx("hit"); }
    if (fx.energy) B.p.energy += fx.energy;
    if (fx.draw) drawCards(fx.draw);
    renderBattle();
    return true;
  }
  function applyGunk(n) {
    const B = G.B, fp = scr("f");
    addFoeSt("gunk", n);
    sfx("gunk");
    D.burst(fp.x, fp.y, "drop", 10, "#a6d94a");
    if (B.form === "sludge") gainRes(Math.ceil(n / 2));
  }
  // Sludge Jinxes at 10+ Corruption smear a little Gunk with every hit.
  function sludgeTouch() {
    const B = G.B;
    if (B.form === "sludge" && B.res >= 10 && !B.over) B.foe.st.gunk = (B.foe.st.gunk || 0) + 1;
  }
  function addFoeSt(k, n) {
    const B = G.B, fp = scr("f");
    B.foe.st[k] = (B.foe.st[k] || 0) + n;
    const label = { gunk: "Gunk", dazed: "Dazed", pied: "Pied" }[k];
    D.float(fp.x, fp.y - 60, `${label} +${n}`, { gunk: "#a6d94a", dazed: "#c9b8ff", pied: "#efe6d2" }[k]);
  }
  function hurtFoe(n, isGunk) {
    const B = G.B, f = B.foe, fp = scr("f");
    let dmg = n;
    if (!isGunk && f.block) { const ab = Math.min(f.block, dmg); f.block -= ab; dmg -= ab; if (ab) D.float(fp.x + 30, fp.y - 20, `◆${ab}`, "#ffd23f"); }
    f.hp -= dmg;
    B.anim.fHurt = G.t;
    D.float(fp.x, fp.y - 40, dmg ? `-${dmg}` : "Blocked", isGunk ? "#a6d94a" : "#ffffff", dmg >= 15);
    D.burst(fp.x, fp.y, isGunk ? "drop" : "star", dmg >= 15 ? 14 : 6, isGunk ? "#a6d94a" : "#ffd23f");
    sfx(dmg ? "hit" : "block");
    if (!isGunk && dmg >= 15) addApplause(8, "Ooooh!");
    renderBattle();
    if (f.hp <= 0) winBattle();
  }
  function hurtPlayer(n, unblockable) {
    const B = G.B, r = G.run, pp = scr("p");
    let dmg = n;
    if (!unblockable) {
      const dodge = Math.min(0.15, B.jinx.stats.tumble.lv * 0.004);
      if (rand() < dodge) { D.float(pp.x, pp.y - 40, "Dodged!", "#ffd23f"); sfx("dodge"); addApplause(8); return; }
      if (B.p.block) { const ab = Math.min(B.p.block, dmg); B.p.block -= ab; dmg -= ab; if (ab) D.float(pp.x - 30, pp.y - 20, `◆${ab}`, "#ffd23f"); }
    }
    r.hp -= dmg;
    gainRunXp("grit", dmg / 3);
    if (dmg) {
      B.tookDmg += dmg;
      B.anim.pHurt = G.t;
      D.float(pp.x, pp.y - 40, `-${dmg}`, "#ff5fa8", dmg >= 12);
      sfx("hit");
      addApplause(-Math.floor(dmg / 2));
      if (!unblockable && dmg >= 8 && B.jinx.trait === "hothead" && r.hp > 0) {
        B.p.st.hype = (B.p.st.hype || 0) + 1;
        D.float(pp.x, pp.y - 75, "Hothead! +1 Hype", "#ff8a3d");
      }
    } else sfx("block");
    if (r.hp <= 0) {
      if (r.charms.includes("patch") && !r.patchUsed) {
        r.patchUsed = true;
        r.hp = 1;
        D.float(pp.x, pp.y - 80, "Iron-On Patch!", "#ff5fa8", true);
        sfx("buff");
      } else {
        r.hp = 0;
        loseBattle();
      }
    }
    renderBattle();
  }

  // Between your turn and the foe's, the Jinx may act on its own.
  async function jinxActsAlone() {
    const B = G.B, r = G.run, j = B.jinx, bo = bonuses(j), pp = scr("p");
    if (j.trait === "scaredy" && r.hp < r.maxHp / 2 && rand() < 0.45) {
      B.p.block += 5 + bo.blk;
      D.float(pp.x, pp.y - 60, `Ducks for cover! ◆${5 + bo.blk}`, "#ffd23f");
      sfx("block");
      renderBattle();
      await sleep(400);
    }
    if (rand() < improviseChance(j)) {
      D.float(pp.x, pp.y - 120, `${j.name} improvises!`, "#ff8a3d", true);
      sfx("honk");
      addApplause(8);
      renderBattle();
      await sleep(420);
      let fx;
      if (j.trait === "copycat" && B.lastCard) {
        fx = scaleFx(JG.CARDS[B.lastCard].fx, 0.5);
        delete fx.selfdmg; delete fx.energy; delete fx.draw;
      } else {
        const best = j.trait === "showoff" ? "juggle" : D.jinxLook(j).best;
        fx = { juggle: { dmg: 4 }, tumble: { block: 5 }, glow: { heal: 3, block: 2 }, grit: { dmg: 3, hype: 1 } }[best];
      }
      await applyFx(fx);
    }
  }

  async function showstopper() {
    const B = G.B;
    if (!B || B.busy || B.over || B.applause < 100) return;
    B.busy = true;
    B.applause = 0;
    B.anim.show = G.t;
    const j = B.jinx, bo = bonuses(j), r = G.run, F = JG.FORMS[B.form];
    const { W, H } = D.size();
    const pp = scr("p");
    sfx("win");
    D.float(W / 2, H * 0.3, `${F.show}!`, F.color, true);
    D.burst(pp.x, pp.y - 30, "confetti", 50, "multi");
    for (const s of JG.STATS) gainRunXp(s, 2);
    renderBattle();
    await sleep(650);
    if (B.form === "sludge") {
      const c = B.res;
      B.anim.pLunge = G.t;
      await sleep(140);
      hurtFoe(8 + Math.floor(c * 1.5) + bo.atk * 2);
      if (B.over) return;
      applyGunk(6 + bo.gunk);
      B.res = 0;
    } else if (B.form === "stardust") {
      const s = B.res;
      B.anim.pLunge = G.t;
      await sleep(140);
      hurtFoe(6 + s * 4 + bo.atk * 2);
      if (B.over) return;
      const h = Math.min(r.maxHp - r.hp, 4 + s * 3 + bo.heal);
      r.hp += h;
      D.float(pp.x, pp.y - 70, `+${h}`, "#8fe9ff", true);
      D.burst(pp.x, pp.y, "star", 20, "#8fe9ff");
      delete B.p.st.dazed; delete B.p.st.pied; delete B.p.st.gunk;
      sfx("heal");
      B.res = 0;
    } else {
      B.disc.push(...B.hand);
      B.hand = [];
      drawCards(5);
      B.p.energy += 2;
      B.p.st.hype = (B.p.st.hype || 0) + 1;
      B.wild = B.hand.length ? pick(B.hand).u : null;
      D.float(pp.x, pp.y - 70, "New hand, +2 energy, +1 Hype", "#ff5fa8");
      sfx("buff");
    }
    B.busy = false;
    renderBattle();
  }

  async function endTurn() {
    const B = G.B;
    if (!B || B.busy || B.over) return;
    B.busy = true;
    if (!B.played) addApplause(-10, "The crowd yawns…");
    B.disc.push(...B.hand);
    B.hand = [];
    B.wild = null;
    for (const k of ["dazed", "pied"]) if (B.p.st[k]) B.p.st[k]--;
    renderBattle();
    await sleep(300);
    await jinxActsAlone();
    if (B.over) return;
    const f = B.foe, fp = scr("f");
    f.block = 0;
    if (f.st.gunk) {
      const g = f.st.gunk;
      hurtFoe(g, true);
      f.st.gunk = g - 1;
      if (B.form === "sludge") gainRes(g);
      if (B.over) return;
      await sleep(350);
    }
    const m = f.intent;
    if (m.charge) { f.charge = true; D.float(fp.x, fp.y - 60, "Charging…", "#ffd23f"); sfx("buff"); }
    if (m.blk) { f.block += m.blk; D.float(fp.x, fp.y - 30, `◆ ${m.blk}`, "#ffd23f"); sfx("block"); }
    if (m.heal) { const h = Math.min(f.maxHp - f.hp, m.heal); f.hp += h; D.float(fp.x, fp.y - 60, `+${h}`, "#8fe9ff"); sfx("heal"); }
    if (m.hype) { f.st.hype = (f.st.hype || 0) + m.hype; D.float(fp.x, fp.y - 80, `+${m.hype} Hype`, "#ff8a3d"); sfx("buff"); }
    if (m.heckle) { B.anim.heckle = G.t; addApplause(-m.heckle, `Boo! -${m.heckle} Applause`); sfx("debuff"); }
    renderBattle();
    if (m.atk) {
      for (let h = 0; h < (m.n || 1); h++) {
        await sleep(220);
        B.anim.fLunge = G.t;
        await sleep(140);
        hurtPlayer(foeHitValue(m.atk));
        if (B.over) return;
      }
      f.charge = false;
    }
    const pp = scr("p");
    if (m.dazed) { B.p.st.dazed = (B.p.st.dazed || 0) + m.dazed; D.float(pp.x, pp.y - 60, `Dazed +${m.dazed}`, "#c9b8ff"); sfx("debuff"); }
    if (m.pied) { B.p.st.pied = (B.p.st.pied || 0) + m.pied; D.float(pp.x, pp.y - 75, `Pied +${m.pied}`, "#efe6d2"); sfx("debuff"); }
    if (m.gunk) { B.p.st.gunk = (B.p.st.gunk || 0) + m.gunk; D.float(pp.x, pp.y - 90, `Gunk +${m.gunk}`, "#a6d94a"); sfx("gunk"); }
    for (const k of ["dazed", "pied"]) if (f.st[k]) f.st[k]--;
    f.mi = (f.mi + 1) % f.def.moves.length;
    f.intent = f.def.moves[f.mi];
    await sleep(300);
    startTurn(false);
  }

  function winBattle() {
    const B = G.B;
    if (B.over) return;
    B.over = "win";
    B.busy = true;
    B.anim.fDie = G.t;
    sfx("win");
    const fp = scr("f");
    D.burst(fp.x, fp.y, "star", 30, "#ffd23f");
    D.burst(fp.x, fp.y - 40, "confetti", 30, "multi");
    renderBattle();
    setTimeout(() => showRewards(B.kind), 1100);
  }
  function loseBattle() {
    const B = G.B;
    if (B.over) return;
    B.over = "lose";
    B.busy = true;
    sfx("lose");
    renderBattle();
    setTimeout(() => endRun(false), 1600);
  }
  function showRewards(kind) {
    const r = G.run, j = runJinx();
    let tix = kind === "boss" ? 55 : kind === "elite" ? 30 + ((rand() * 8) | 0) : 11 + ((rand() * 8) | 0);
    if (r.charms.includes("ticket")) tix = Math.round(tix * 1.5);
    r.tix += tix;
    const lines = [`<li><span class="glyph" style="color:#ffd23f">✂</span><b>${tix}</b> Tix</li>`];
    if (r.charms.includes("halo")) { const h = Math.min(5, r.maxHp - r.hp); r.hp += h; if (h) lines.push(`<li>Gutter Halo: healed ${h}</li>`); }
    let item = null;
    if (kind === "boss" || kind === "elite") item = rand() < (kind === "boss" ? 1 : 0.5) ? pick(JG.RARE_ITEMS) : pick(JG.COMMON_ITEMS);
    else if (rand() < 0.4) item = pick(JG.COMMON_ITEMS);
    if (item) { r.loot.push(item); lines.push(`<li>${itemChip(item)} <small>(into the bag, to take home)</small></li>`); }
    let charm = null;
    if (kind !== "fight") {
      charm = randomCharm();
      if (charm) { addCharm(charm); lines.push(`<li><span class="glyph" style="color:${JG.CHARMS[charm].color}">${JG.CHARMS[charm].glyph}</span><b>${JG.CHARMS[charm].name}</b>: ${JG.CHARMS[charm].desc}</li>`); }
    }
    if (kind === "boss") {
      const h = Math.round(r.maxHp * 0.4);
      r.hp = Math.min(r.maxHp, r.hp + h);
      lines.push(`<li>A breather between acts: healed up to ${r.hp}</li>`);
    }
    const choice = rewardCards(kind);
    sfx("coin");
    const finish = () => {
      closeModal();
      if (kind === "boss") {
        r.map[r.floor][r.at].done = true;
        if (r.act >= 3) { endRun(true); return; }
        r.act++;
        r.map = genMap(r.act);
        r.floor = -1;
        r.at = -1;
        G.B = null;
        toast(`Act ${["I", "II", "III"][r.act - 1]}: ${JG.ACTS[r.act - 1].name}`);
        enterMap();
        return;
      }
      G.B = null;
      nodeDone();
    };
    modal(`<h2>${kind === "boss" ? "The Ringmaster falls!" : kind === "elite" ? "Headliner beaten!" : "The crowd goes wild"}</h2>
      <ul class="loot">${lines.join("")}</ul>
      <h3>Teach ${esc(j.name)} a new trick?</h3>
      <div class="cardgrid three">${choice.map((id) => cardHtml(id, { act: "take" }).replace('data-act="take"', `data-act="take" data-id="${id}"`)).join("")}</div>
      <button class="btn ghost" data-act="skip">Skip the trick</button>`, {
      take: (b) => { r.deck.push(b.dataset.id); sfx("bell"); finish(); },
      skip: finish
    }, { wide: true });
  }
  function randomCharm() {
    const left = Object.keys(JG.CHARMS).filter((c) => !G.run.charms.includes(c));
    return left.length ? pick(left) : null;
  }
  function addCharm(c) {
    const r = G.run;
    r.charms.push(c);
    if (c === "heart") { r.maxHp += 12; r.hp += 12; }
  }

  // ---------- sideshows, snack stands and fortune tents ----------
  function runEvent() {
    const r = G.run, j = runJinx();
    const left = JG.EVENTS.filter((e) => !r.seen.includes(e.id));
    const ev = pick(left.length ? left : JG.EVENTS);
    r.seen.push(ev.id);
    const choices = ev.choices.map((c) => {
      const ok = !c.need || r.tix >= c.need.tix;
      return `<button class="btn choice" data-act="c" data-id="${c.id}" ${ok ? "" : "disabled"}>${esc(c.label)}${ok ? "" : " (not enough Tix)"}</button>`;
    }).join("");
    modal(`<p class="eyebrow">Sideshow</p><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p><div class="choices">${choices}</div>`, {
      c: (b) => resolveEvent(ev, b.dataset.id, j)
    });
  }
  function resolveEvent(ev, cid, j) {
    const r = G.run;
    let out = "";
    const heal = (n) => { const h = Math.min(n, r.maxHp - r.hp); r.hp += h; return h; };
    const hurt = (n) => { r.hp = Math.max(1, r.hp - n); };
    const lean = (d) => { j.align = clamp(j.align + d, -1, 1); };
    const k = ev.id + "." + cid;
    if (k === "cat.pay") { r.tix -= 20; const c = randomCharm(); if (c) { addCharm(c); out = `The cat pulls a ${JG.CHARMS[c].name} out of its sleeve. ${JG.CHARMS[c].desc}`; } else out = "The cat shrugs. You already have everything it had."; sfx("coin"); }
    else if (k === "cat.pet") {
      if (rand() < 0.55) { const it = pick(JG.COMMON_ITEMS); r.loot.push(it); j.love = clamp(j.love + 5, 0, 100); out = `It purrs like a broken amp and pushes a ${JG.ITEMS[it].name} toward you.`; sfx("bell"); }
      else { hurt(4); out = "It bites. Lose 4 health. Fair, honestly."; sfx("hit"); }
    }
    else if (k === "puddle.drink") { const h = heal(12); lean(-0.12); out = `${j.name} slurps it all up. Healed ${h}. Something in their eyes gets a little murkier.`; sfx("gunk"); }
    else if (k === "puddle.bottle") { r.loot.push("sludgepop"); if (rand() < 0.35) r.loot.push("gum"); out = "You fill an old soda bottle. It goes in the bag."; sfx("gunk"); }
    else if (k === "kid.help") { hurt(6); lean(0.1); j.love = clamp(j.love + 6, 0, 100); r.loot.push("cd"); out = `It's a long walk, and ${j.name} trips twice, but you find the tent. The kid gives you a Burned CD as thanks.`; sfx("bell"); }
    else if (k === "mirror.remove") {
      if (r.deck.length <= 5) { out = "The mirror won't take any more. Your deck is already tiny."; }
      else {
        showDeck((i) => {
          const gone = r.deck.splice(i, 1)[0];
          sfx("debuff");
          eventResult(ev, `You leave ${JG.CARDS[gone].name} in the glass. It waves goodbye.`);
        }, "Leave a card in the mirror", () => eventResult(ev, "You look away before the mirror gets any ideas."));
        return;
      }
    }
    else if (k === "mosh.dive") { hurt(8); r.tix += 35; lean(-0.05); out = "You come out bruised, sticky and 35 Tix richer."; sfx("coin"); }
    else if (k === "mosh.watch") { const h = heal(6); out = `Good chord, honestly. Healed ${h}.`; sfx("heal"); }
    else if (k === "candy.eat") { r.maxHp += 6; r.hp += 6; lean(0.12); out = `${j.name} eats until they glow a little. 6 more max health.`; sfx("heal"); }
    else if (k === "candy.pocket") { r.loot.push("comet"); if (rand() < 0.35) r.loot.push("floss"); out = "Sticky pockets, but it'll keep. Into the bag."; sfx("bell"); }
    else if (k === "well.wish") {
      r.tix -= 15;
      const roll = rand();
      if (roll < 0.4) { r.hp = r.maxHp; out = "Your wish comes true: you feel brand new. Fully healed."; sfx("heal"); }
      else if (roll < 0.7) { const it = pick(JG.RARE_ITEMS); r.loot.push(it); out = `Something floats back up: a ${JG.ITEMS[it].name}.`; sfx("coin"); }
      else { j.mood = clamp(j.mood + 15, 0, 100); out = "The song changes to one you haven't heard since middle school. Nothing else happens. You feel ok, though."; sfx("bell"); }
    }
    else if (k === "tattoo.star") { r.deck.push("wish"); out = `A tiny star, right on the hat. ${j.name} learned Wish Upon a Star.`; sfx("buff"); }
    else if (k === "tattoo.skull") { r.deck.push("dive"); out = `A tiny skull. Very punk. ${j.name} learned Stage Dive.`; sfx("buff"); }
    else out = "You keep walking. The calliope music bends a little as you pass.";
    eventResult(ev, out);
  }
  function eventResult(ev, text) {
    renderRunbar();
    modal(`<p class="eyebrow">Sideshow</p><h2>${esc(ev.title)}</h2><p>${esc(text)}</p><button class="btn" data-act="ok">Onward</button>`, {
      ok: () => { closeModal(); nodeDone(); }
    });
  }
  function runShop() {
    const r = G.run;
    if (!r.shop || r.shop.key !== r.act + ":" + r.floor) {
      const cards = rewardCards("fight").map((id) => ({ id, price: [0, 28, 45, 75][JG.CARDS[id].rarity] + ((rand() * 8) | 0), sold: false }));
      const charm = randomCharm();
      r.shop = { key: r.act + ":" + r.floor, cards, charm: charm ? { id: charm, price: 85, sold: false } : null,
        items: [pick(JG.COMMON_ITEMS), pick(JG.RARE_ITEMS)].map((id) => ({ id, price: Math.round(JG.ITEMS[id].price * 0.8), sold: false })), removed: false, pretzel: false };
    }
    const S = r.shop;
    const cards = S.cards.map((c, i) => c.sold ? `<div class="card sold">Sold</div>` : cardHtml(c.id, { act: "card", i, price: c.price, disabled: r.tix < c.price })).join("");
    const ch = S.charm && !S.charm.sold
      ? `<div class="shoprow"><div><span class="glyph" style="color:${JG.CHARMS[S.charm.id].color}">${JG.CHARMS[S.charm.id].glyph}</span>${JG.CHARMS[S.charm.id].name}<small>${JG.CHARMS[S.charm.id].desc}</small></div><span></span><button class="btn small" data-act="charm" ${r.tix < S.charm.price ? "disabled" : ""}>${S.charm.price} Tix</button></div>` : "";
    const its = S.items.map((it, i) => it.sold ? "" : `<div class="shoprow"><div>${itemChip(it.id)}<small>Goes in the bag to take home.</small></div><span></span><button class="btn small" data-act="item" data-i="${i}" ${r.tix < it.price ? "disabled" : ""}>${it.price} Tix</button></div>`).join("");
    modal(`<p class="eyebrow">Snack stand</p><h2>Greasy Gus's Cosmic Concessions</h2><p class="tag">You have <b class="tixnum">${r.tix}</b> Tix to spend on this run.</p>
      <div class="cardgrid three">${cards}</div>
      <div class="shoplist">${ch}${its}
        <div class="shoprow"><div><span class="glyph" style="color:#ffb36b">∞</span>Hot pretzel<small>Heal 12.</small></div><span></span><button class="btn small" data-act="pretzel" ${r.tix < 15 || S.pretzel ? "disabled" : ""}>${S.pretzel ? "Eaten" : "15 Tix"}</button></div>
        <div class="shoprow"><div><span class="glyph" style="color:#c9b8ff">✂</span>Forget a trick<small>Take one card out of your deck.</small></div><span></span><button class="btn small" data-act="remove" ${r.tix < 40 || S.removed || r.deck.length <= 5 ? "disabled" : ""}>${S.removed ? "Done" : "40 Tix"}</button></div>
      </div>
      <button class="btn" data-act="leave">Back to the midway</button>`, {
      card: (b) => { const c = S.cards[+b.dataset.i]; if (r.tix < c.price || c.sold) return; r.tix -= c.price; c.sold = true; r.deck.push(c.id); sfx("coin"); renderRunbar(); runShop(); },
      charm: () => { if (r.tix < S.charm.price) return; r.tix -= S.charm.price; S.charm.sold = true; addCharm(S.charm.id); sfx("coin"); renderRunbar(); runShop(); },
      item: (b) => { const it = S.items[+b.dataset.i]; if (r.tix < it.price || it.sold) return; r.tix -= it.price; it.sold = true; r.loot.push(it.id); sfx("coin"); renderRunbar(); runShop(); },
      pretzel: () => { if (r.tix < 15) return; r.tix -= 15; S.pretzel = true; r.hp = Math.min(r.maxHp, r.hp + 12); sfx("eat"); renderRunbar(); runShop(); },
      remove: () => showDeck((i) => { if (r.tix < 40) return; r.tix -= 40; r.deck.splice(i, 1); S.removed = true; sfx("debuff"); renderRunbar(); runShop(); }, "Forget which trick?", runShop),
      leave: () => { closeModal(); r.shop = null; nodeDone(); }
    }, { wide: true });
  }
  function runRest() {
    const r = G.run, j = runJinx();
    const nap = Math.round(r.maxHp * 0.3 * (r.charms.includes("lantern") ? 2 : 1));
    const stats = JG.STATS.map((s) => `<button class="btn small" data-act="train" data-s="${s}" style="--bc:${JG.STAT_INFO[s].color}">${JG.STAT_INFO[s].label} ${j.stats[s].lv}</button>`).join("");
    modal(`<p class="eyebrow">Fortune tent</p><h2>Madame Nebula Will See You Now</h2>
      <p>The tent smells like incense and burnt fuses. A crystal ball shows ${esc(j.name)} doing something heroic, then something embarrassing.</p>
      <div class="choices">
        <button class="btn choice" data-act="nap">Nap on the cushions: heal ${Math.min(nap, r.maxHp - r.hp)}</button>
      </div>
      <h3>Or practice: one stat goes up for good</h3>
      <div class="row wrap">${stats}</div>`, {
      nap: () => { r.hp = Math.min(r.maxHp, r.hp + nap); sfx("heal"); closeModal(); nodeDone(); },
      train: (b) => {
        const s = b.dataset.s;
        addXp(j, s, need(j.stats[s].lv));
        if (s === "grit") { r.maxHp += 2; r.hp += 2; }
        sfx("buff");
        closeModal();
        toast(`${j.name}'s ${JG.STAT_INFO[s].label} went up to ${j.stats[s].lv}.`);
        nodeDone();
      }
    });
  }

  // ---------- the end of a run ----------
  function endRun(won) {
    const r = G.run, j = runJinx(), s = G.save;
    G.B = null;
    const mult = won ? 1.5 : 0.6;
    const before = {};
    const gains = JG.STATS.map((st) => {
      before[st] = j.stats[st].lv;
      const n = Math.round(r.xp[st] * mult);
      const ups = addXp(j, st, n);
      return { st, n, ups };
    });
    let loot = r.loot.slice();
    let lost = 0;
    if (!won && loot.length > 1) { const keep = pick(loot); lost = loot.length - 1; loot = [keep]; }
    let tix = won ? r.tix + 60 : Math.floor(r.tix / 2);
    loot.forEach((id) => (s.inv[id] = (s.inv[id] || 0) + 1));
    s.tix += tix;
    j.age++;
    j.belly = clamp(j.belly - 25, 0, 100);
    j.mood = clamp(j.mood + (won ? 25 : -25), 0, 100);
    j.love = clamp(j.love + (won ? 8 : 3), 0, 100);
    s.records.runs++;
    if (won) s.records.wins++;
    const reached = won ? 4 : r.act;
    s.records.bestAct = Math.max(s.records.bestAct, Math.min(3, reached));
    let evolved = false;
    if (j.stage === "child" && j.age >= 3) { j.stage = "adult"; evolved = true; }
    const retire = j.age >= 12;
    G.run = null;
    persist();
    const gl = gains.map((g) => {
      const I = JG.STAT_INFO[g.st];
      return `<li><span style="color:${I.color}">${I.label}</span> ${before[g.st]}${g.ups ? ` → <b>${j.stats[g.st].lv}</b>` : ""} <small>+${g.n} practice</small></li>`;
    }).join("");
    const lootHtml = loot.length ? loot.map((id) => `<li>${itemChip(id)}</li>`).join("") : "<li>Nothing in the bag.</li>";
    modal(`<p class="eyebrow">${won ? "Standing ovation" : "Curtain falls"}</p>
      <h2>${won ? `${esc(j.name)} conquered the Big Top Below!` : `${esc(j.name)} fainted in Act ${["I", "II", "III"][r.act - 1]}`}</h2>
      <p>${won ? "The whole cosmos is clapping. Every snack in the bag comes home, plus a 60 Tix bonus." : `They wobble home sad and a bit sticky.${lost ? ` ${lost} thing${lost > 1 ? "s" : ""} fell out of the bag on the way.` : ""}`}</p>
      <div class="cols"><div><h3>What they learned</h3><ul class="loot">${gl}</ul></div>
      <div><h3>Brought home</h3><ul class="loot"><li><span class="glyph" style="color:#ffd23f">✂</span><b>${tix}</b> Tix</li>${lootHtml}</ul></div></div>
      <button class="btn big" data-act="home">Back to the garden</button>`, {
      home: () => {
        closeModal();
        G.selected = j.id;
        setMode("garden");
        if (evolved) celebrateEvolve(j);
        else if (retire) retireJinx(j);
      }
    }, { wide: true });
  }
  function celebrateEvolve(j) {
    const [x, y] = jinxScreen(j);
    D.burst(x, y - 20, "star", 30, "#ffd23f");
    D.burst(x, y - 20, "heart", 8, "#ff5fa8");
    sfx("hatch");
    modal(`<p class="eyebrow">All grown up</p><h2>${esc(j.name)} is now a ${formName(j)}!</h2>
      <p>${j.align > 0.33 ? "All that stardust made them glow. Look for the halo." : j.align < -0.33 ? "All that sludge made them gloriously grungy. Note the safety pin." : "They stayed right in the middle, a classic harlequin."} Their best stat shows on them too, and they now start runs with an extra trick.</p>
      <button class="btn" data-act="ok">Aww</button>`, { ok: () => { closeModal(); renderPanel(); } });
  }
  function retireJinx(j) {
    const s = G.save;
    const loved = j.love >= 50;
    const cx = 0.08 + rand() * 0.84, cy = 0.06 + rand() * 0.22;
    const pts = [];
    for (let i = 0; i < 4 + ((rand() * 3) | 0); i++) pts.push([clamp(cx + (rand() - 0.5) * 0.18, 0.02, 0.98), clamp(cy + (rand() - 0.5) * 0.14, 0.02, 0.4)]);
    s.sky.push({ name: j.name, pts, note: `${formName(j)}, 12 shows, generation ${j.gen}` });
    const i = s.jinxes.indexOf(j);
    if (loved) {
      const inherit = { name: j.name, align: j.align * 0.5, gen: j.gen + 1, stats: {}, trait: j.trait };
      for (const st of JG.STATS) inherit.stats[st] = Math.floor(j.stats[st].lv * 0.3);
      const e = makeEgg({ hue: j.hue, inherit, hatch: 30 });
      e.u = j.u; e.v = j.v;
      s.jinxes[i] = e;
    } else s.jinxes.splice(i, 1);
    G.selected = null;
    ensureSomeone();
    persist();
    sfx("hatch");
    modal(`<p class="eyebrow">The last show</p><h2>${esc(j.name)} rises into the sky</h2>
      <p>After twelve shows, ${esc(j.name)} curls up under the big top and floats up past the string lights. Look for them among the stars.</p>
      <p>${loved ? "They left an egg behind, still warm. A little of who they were is inside." : "They didn't feel loved enough to come back. Pet your Jinxes often, and they'll leave an egg behind."}</p>
      <button class="btn" data-act="ok">Goodnight, ${esc(j.name)}</button>`, { ok: () => { closeModal(); renderPanel(); } });
  }
  function ensureSomeone() {
    const s = G.save;
    if (!s.jinxes.length) {
      s.jinxes.push(makeEgg({ hatch: 20 }));
      toast("A balloon drifts down and leaves an egg on the grass.");
    }
  }

  // =====================================================================
  // Title, HUD buttons and the frame loop
  // =====================================================================
  function renderTitle() {
    const has = !!loadSave();
    $("#titleBtns").innerHTML = has
      ? `<button class="btn big" data-act="continue">Back to my garden</button><button class="btn ghost" data-act="new">Start a new garden</button>`
      : `<button class="btn big" data-act="new">Open the gates</button>`;
  }
  let confirmNew = false;
  $("#titleBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    A.init();
    if (b.dataset.act === "continue") {
      G.demo = false;
      G.save = loadSave();
      ensureSomeone();
      if (G.save.run && jinxById(G.save.run.jid)) { G.run = G.save.run; enterMap(); toast("Picking up where you left off."); }
      else { delete G.save.run; setMode("garden"); }
    } else if (b.dataset.act === "new") {
      if (loadSave() && !confirmNew) {
        confirmNew = true;
        b.textContent = "Tap again to erase the old garden";
        b.classList.add("warn");
        return;
      }
      G.demo = false;
      G.save = newSave();
      persist();
      setMode("garden");
      setTimeout(() => toast("Tap Pickles to say hi. The egg hatches soon."), 600);
    }
  });
  $("#hud").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    A.init();
    const a = b.dataset.act;
    if (a === "shop") openShop();
    if (a === "sky") openSky();
    if (a === "sound") { A.setOn(!A.on); renderHud(); }
    if (a === "bigtop") {
      const j = jinxById(G.selected);
      if (j && j.stage !== "egg") confirmRun(j);
      else toast("Tap a Jinx first to pick who performs.");
    }
  });
  $("#btnQuit").addEventListener("click", () => {
    modal(`<h2>Leave the circus?</h2><p>Your Jinx comes home as if they fainted: less of what they learned, and only one thing from the bag.</p>
      <div class="row"><button class="btn" data-act="yes">Go home</button><button class="btn ghost" data-act="close">Keep going</button></div>`,
      { close: closeModal, yes: () => { closeModal(); if (G.run) endRun(false); } });
  });

  let last = performance.now() / 1000;
  function frame() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    G.t = now;
    if (G.mode === "garden" || G.mode === "title") {
      if (G.save) gardenStep(dt);
      G.hits = D.garden(now, dt, G);
    } else if (G.mode === "map") D.mapBg(now, dt, G.run ? G.run.act : 1);
    else if (G.mode === "battle" && G.B) D.stage(now, dt, G.B);
    requestAnimationFrame(frame);
  }

  D.init($("#scene"));
  G.save = demoSave();
  G.demo = true;
  renderTitle();
  setMode("title");
  requestAnimationFrame(frame);
  // test hook for automated checks
  JG.debug = { G, startBattle, endRun, enterMap, hatchEgg, persist };
})();
