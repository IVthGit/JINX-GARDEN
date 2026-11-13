// Jinx Garden: the garden, the runs, the card battles, sound and saving.
(function () {
  const D = JG.draw;
  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = "jinxgarden.v1";
  const G = (JG.game = { save: null, selected: null, mode: "title", run: null, B: null, t: 0, hits: [] });
  const rand = Math.random;
  const pick = (a) => a[(rand() * a.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => (JG.fast ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));   // JG.fast: automated play-tests skip the waits
  // cut-out lettering: every letter is a scrap from a different magazine
  function ransom(text) {
    let i = 0, prev = 0;
    return `<span class="ransom" aria-hidden="true">` + String(text).split(" ").map((w) => `<span class="w">` + [...w].map((ch) => {
      const k = (prev + 1 + (ch.charCodeAt(0) + i) % 5) % 6, r = ((i * 37 + 3) % 11) - 5, y = ((i * 53) % 7) - 3;
      prev = k; i++;
      return `<span class="rn k${k}" style="--r:${r}deg;--y:${(y * 0.025).toFixed(3)}em">${esc(ch)}</span>`;
    }).join("") + `</span>`).join("") + `</span>`;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let uid = 1;

  // =====================================================================
  // Sound: the music lives in music.js; this sets up the output and plays sound effects
  // =====================================================================
  const A = (JG.audio = { ctx: null, on: true });
  const hz = (semi, base) => (base || 440) * Math.pow(2, semi / 12);

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = A.ctx;
    A.master = c.createGain();
    A.master.gain.value = 0.7;
    // a limiter, so a loud chorus and a sound effect together don't crackle
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -14; lim.knee.value = 10; lim.ratio.value = 6; lim.attack.value = 0.004; lim.release.value = 0.18;
    A.master.connect(lim);
    lim.connect(c.destination);
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
    const len = c.sampleRate;
    A.noise = c.createBuffer(1, len, c.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = rand() * 2 - 1;
    JG.music.init(c, A.music, A.noise);
    setInterval(() => JG.music.tick(musicScene()), 25);
  };
  // which piece should be playing
  function musicScene() {
    if (G.mode === "battle" && G.B) return (G.B.kind === "boss" ? "boss" : "battle") + (G.B.act || 1);
    if (G.mode === "map") return "map" + (G.run ? G.run.act : 1);
    if (G.talent) return "talent";
    return G.mode === "title" ? "title" : "garden";
  }
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
      for (const j of o.jinxes) {
        if (j.stage !== "egg" && !JG.TRAITS[j.trait]) j.trait = pick(Object.keys(JG.TRAITS));
        if (j.stage !== "egg") {
          if (j.moon === undefined) j.moon = 0;
          if (!j.grades) j.grades = rollGrades();
          if (!Array.isArray(j.learned)) j.learned = [];
          // Jinxes from before the three kinds become Umbras
          if (!j.head || !j.piece || !j.body) Object.assign(j, KINDS.Umbra);
        }
        j.held = false;
        j.act = null; j.after = null; j.waitFor = null; j.moving = false;
        if (j.hat && !JG.HATS[j.hat]) j.hat = null;
      }
      return gardenDefaults(o);
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
  // Every Jinx is a head, a headpiece and a body. The three kinds are the matching sets.
  const KINDS = D.KINDS, KIND_NAMES = Object.keys(KINDS);
  const partsOf = (j) => ({ head: j.head, piece: j.piece, body: j.body });
  const randomKind = (names) => Object.assign({}, KINDS[pick(names || KIND_NAMES)]);
  // what to call it: the head gives the name, and a borrowed headpiece or body gives the first word
  function kindName(j) {
    const name = { disc: "Umbra", mask: "Hollow", bulb: "Lantern" }[j.head] || "Umbra", K = KINDS[name];
    if (j.piece === K.piece && j.body === K.body) return name;
    if (j.piece !== K.piece) return { corona: "Crowned", hood: "Hooded", ribbons: "Ribboned" }[j.piece] + " " + name;
    return (j.body === "wisp" ? "Floating " : "Cloaked ") + name;
  }
  function makeJinx(o) {
    o = o || {};
    const [u, v] = spot();
    const parts = o.parts || KINDS.Umbra;
    return {
      head: parts.head, piece: parts.piece, body: parts.body,
      id: uid++ + "-" + Date.now().toString(36), name: o.name || pick(JG.NAMES), stage: "child",
      hue: o.hue !== undefined ? o.hue : (rand() * 360) | 0, seed: rand() * 10, align: o.align || 0,
      stats: o.stats || blankStats(1, 3), belly: 70, mood: 70, love: 10, age: 0, gen: o.gen || 1, u, v,
      trait: o.trait || pick(Object.keys(JG.TRAITS)), moon: o.moon || 0, grades: o.grades || rollGrades(), learned: [], hat: null
    };
  }
  // Aptitude for each stat, E to S. Better grades learn faster. Set at birth; a loved Jinx passes on better ones.
  const GRADE = ["E", "D", "C", "B", "A", "S"], GRADE_MULT = [0.7, 0.85, 1, 1.15, 1.3, 1.5];
  function rollGrades(from) {
    const g = {};
    for (const s of JG.STATS) {
      const r = rand();
      let v = r < 0.12 ? 0 : r < 0.42 ? 1 : r < 0.78 ? 2 : r < 0.94 ? 3 : 4;
      if (from) v = Math.min(5, Math.max(v, from[s]) + (rand() < 0.45 ? 1 : 0));
      g[s] = v;
    }
    return g;
  }
  function makeEgg(o) {
    o = o || {};
    const [u, v] = spot();
    return { id: uid++ + "-" + Date.now().toString(36), stage: "egg", hatch: o.hatch || 40, hatchMax: o.hatch || 40, hue: o.hue !== undefined ? o.hue : (rand() * 360) | 0,
      seed: rand() * 10, inherit: o.inherit || null, parts: o.parts || randomKind(), u, v };
  }
  function newSave() {
    const first = makeJinx({ name: "Pickles", hue: 320 });
    // the first egg is one of the other two kinds, so a duet can mix them early
    const egg = makeEgg({ hatch: 30, parts: randomKind(["Hollow", "Lantern"]) });
    return gardenDefaults({ v: 1, tix: 40, inv: { moonpie: 2, plum: 1, comet: 1 }, jinxes: [first, egg], sky: [], records: { runs: 0, wins: 0, bestAct: 0, hatched: 1 } });
  }
  function gardenDefaults(s) {
    if (!Array.isArray(s.ground)) s.ground = [];
    if (!s.tree || !Array.isArray(s.tree.fruits)) s.tree = { t: 0, fruits: [{ item: "plum", grow: 1, slot: 0 }, { item: "moonpie", grow: 0.5, slot: 2 }] };
    if (!s.toys) s.toys = {};
    if (!s.hats) s.hats = {};
    if (!s.records.ribbons) s.records.ribbons = {};
    for (const it of s.ground) it.held = false;
    return s;
  }
  function demoSave() {
    const s = newSave();
    const b = makeJinx({ name: "Static", hue: 160, align: -0.6, parts: KINDS.Hollow });
    b.stage = "adult";
    b.stats.grit.lv = 12;
    const c = makeJinx({ name: "Halley", hue: 260, align: 0.7, parts: KINDS.Lantern });
    c.stage = "adult";
    c.stats.juggle.lv = 14;
    const d = makeJinx({ name: "Tinsel", hue: 210, moon: 0.8, parts: { head: "disc", piece: "hood", body: "wisp" } });
    d.stage = "adult";
    d.stats.tumble.lv = 12;
    s.jinxes.push(b, c, d);
    s.toys = { tramp: true, crystal: true };
    b.hat = null; c.hat = "crown"; d.hat = null;
    s.sky = [{ name: "Bobo", pts: [[0.12, 0.1], [0.17, 0.16], [0.22, 0.12], [0.26, 0.2], [0.2, 0.25]] }];
    return s;
  }

  const need = (lv) => 8 + lv * 2;
  function addXp(j, s, n) {
    const st = j.stats[s];
    let ups = 0;
    st.xp += Math.max(0, Math.round(n * GRADE_MULT[(j.grades && j.grades[s]) === undefined ? 2 : j.grades[s]]));
    while (st.xp >= need(st.lv) && st.lv < 99) { st.xp -= need(st.lv); st.lv++; ups++; }
    if (st.lv >= 99) st.xp = 0;
    return ups;
  }
  const jinxById = (id) => G.save && G.save.jinxes.find((j) => j.id === id);
  function formName(j) {
    if (j.stage === "egg") return "Egg";
    const L = D.jinxLook(j);
    const lean = j.align > 0.33 ? "Stardust" : j.align < -0.33 ? "Sludge" : (j.moon || 0) >= 0.33 ? "Pierrot" : "Harlequin";
    if (!L.adult) return `Child, leaning ${j.align > 0.15 ? "Stardust" : j.align < -0.15 ? "Sludge" : (j.moon || 0) > 0.15 ? "Moonlit" : (j.moon || 0) < -0.15 ? "Motley" : "nowhere yet"}`;
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
    if (!JG.fast) { const cu = $("#curtain"); cu.classList.remove("open"); void cu.offsetWidth; cu.classList.add("open"); }
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
  let feedOpen = false, renaming = false, hatOpen = false;
  function renderPanel() {
    const p = $("#panel");
    const j = jinxById(G.selected);
    if (!j || G.mode !== "garden") { p.hidden = true; return; }
    p.hidden = false;
    if (j.stage === "egg") {
      p.innerHTML = `<div class="p-head"><h2>A warm egg</h2><button class="x" data-act="close" aria-label="Close">×</button></div>
        <p class="tag">Hatches in about ${Math.ceil(j.hatch)} seconds.</p>
        <p class="note">Tap it to keep it warm and it hatches sooner.${j.inherit ? (j.inherit.duet ? " A duet egg from " + esc(j.inherit.parents.join(" and ")) + "." : " Something of " + esc(j.inherit.name) + " is in there.") : ""}</p>`;
      return;
    }
    const st = JG.STATS.map((s) => {
      const S = j.stats[s], I = JG.STAT_INFO[s];
      return `<div class="stat"><span class="sl" style="color:${I.color}">${I.label}</span><span class="lv">${S.lv}</span>${bar(S.xp, need(S.lv), I.color)}<span class="gr g${j.grades[s]}" title="Aptitude ${GRADE[j.grades[s]]}: learns ${Math.round(GRADE_MULT[j.grades[s]] * 100)}% as fast as average">${GRADE[j.grades[s]]}</span><span class="sh">${I.hint}</span></div>`;
    }).join("");
    const al = ((j.align + 1) / 2) * 100;
    const inv = Object.keys(G.save.inv).filter((k) => G.save.inv[k] > 0 && !JG.ITEMS[k].keep);
    const owned = Object.keys(G.save.hats).filter((k) => G.save.hats[k] > 0 && JG.HATS[k]);
    const hats = hatOpen
      ? `<div class="feed">${owned.length ? owned.map((k) => { const free = hatsFree(k) + (j.hat === k ? 1 : 0); return `<button class="chip${j.hat === k ? " on" : ""}" data-act="wear" data-hat="${k}" ${free > 0 ? "" : "disabled"} title="${esc(JG.HATS[k].desc)}">${esc(JG.HATS[k].name)}${j.hat === k ? " (take off)" : free > 0 ? "" : " (worn)"}</button>`; }).join("") : `<p class="note">The hat box is empty. The Concession stand sells hats, and talent shows give them as prizes.</p>`}</div>`
      : "";
    const rib = j.ribbons ? ` \u00B7 ${j.ribbons} ribbon${j.ribbons > 1 ? "s" : ""}` : "";
    const feed = feedOpen
      ? `<div class="feed">${inv.length ? inv.map((k) => `<button class="chip" data-act="eat" data-item="${k}" title="${esc(JG.ITEMS[k].desc)}">${itemChip(k, G.save.inv[k])}</button>`).join("") : `<p class="note">The pantry is empty. Buy snacks at the Concession stand, or bring some home from a run.</p>`}</div>`
      : "";
    const nameHtml = renaming
      ? `<input id="renameBox" maxlength="14" value="${esc(j.name)}" aria-label="New name">`
      : `<h2>${esc(j.name)}</h2>`;
    p.innerHTML = `<div class="p-head">${nameHtml}<button class="x" data-act="close" aria-label="Close">\u00D7</button></div>
      <p class="tag">${kindName(j)} \u00B7 ${formName(j)} \u00B7 show ${j.age} of 12${j.gen > 1 ? " \u00B7 generation " + j.gen : ""}${rib}</p>
      <div class="row">
        <button class="btn small" data-act="pet">Pet</button>
        <button class="btn small${feedOpen ? " on" : ""}" data-act="feed" aria-expanded="${feedOpen}">Feed</button>
        <button class="btn small${hatOpen ? " on" : ""}" style="--bc:#8fe9ff" data-act="hats" aria-expanded="${hatOpen}">Hat</button>
        ${j.stage === "adult" ? `<button class="btn small" style="--bc:#ffb3d6" data-act="duet">Duet</button>` : ""}
        <button class="btn small ghost" data-act="rename">${renaming ? "Save name" : "Rename"}</button>
      </div>
      ${feed}${hats}
      <button class="btn big" data-act="run">Take ${esc(j.name)} to the Big Top</button>
      <div class="needs">
        <div><span>Belly</span>${bar(j.belly, 100, "#ffb36b")}</div>
        <div><span>Mood</span>${bar(j.mood, 100, "#ff5fa8")}</div>
        <div><span>Love</span>${bar(j.love, 100, "#c9b8ff")}</div>
      </div>
      <div class="stats">${st}</div>
      <div class="align"><span>Sludge</span><span class="track"><i style="left:${al}%"></i></span><span>Stardust</span></div>
      <div class="align moon" title="Only matters for a Jinx that stays between Sludge and Stardust: Motley grows into a Harlequin, Moonlit into a Pierrot"><span>Motley</span><span class="track"><i style="left:${(((j.moon || 0) + 1) / 2) * 100}%"></i></span><span>Moonlit</span></div>
      ${ringHtml(j)}`;
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
      <p class="note">With this much Love they improvise ${imp}.${mood}${(j.learned || []).length ? " Learned at college: " + j.learned.map((id) => esc(JG.CARDS[id].name)).join(", ") + "." : ""}</p></div>`;
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
    if (act === "close") { G.selected = null; feedOpen = false; hatOpen = false; renaming = false; renderPanel(); return; }
    if (!j) return;
    if (act === "pet") petJinx(j);
    if (act === "feed") { feedOpen = !feedOpen; hatOpen = false; renderPanel(); }
    if (act === "hats") { hatOpen = !hatOpen; feedOpen = false; renderPanel(); }
    if (act === "wear") wearHat(j, b.dataset.hat);
    if (act === "duet") openDuet(j);
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
  function feedJinx(j, id, ground) {
    const it = JG.ITEMS[id];
    if (!it || it.keep) return;
    if (ground ? !G.save.ground.includes(ground) : !(G.save.inv[id] > 0)) return;
    if (it.belly > 0 && j.belly >= 97) { toast(`${j.name} is too full to eat.`); return; }
    if (ground) G.save.ground.splice(G.save.ground.indexOf(ground), 1);
    else G.save.inv[id]--;
    j.belly = clamp(j.belly + (it.belly || 0), 0, 100);
    j.mood = clamp(j.mood + (it.mood || 4), 0, 100);
    j.love = clamp(j.love + (it.love || 2), 0, 100);
    if (it.align) j.align = clamp(j.align + it.align, -1, 1);
    if (it.moon) j.moon = clamp((j.moon || 0) + it.moon, -1, 1);
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
    treeStep(dt);
    if (G.talent) talentStep(dt);
    if (G.duet) duetStep(dt);
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
      // turn like a paper cut-out, and ease in and out of a walk
      const face0 = j.face === undefined ? j.dir || 1 : j.face;
      j.face = face0 + ((j.dir || 1) - face0) * Math.min(1, dt * 9);
      j.pace = (j.pace || 0) + ((j.moving ? 1 : 0) - (j.pace || 0)) * Math.min(1, dt * 5);
      j.hurry = Math.max(0, (j.hurry || 0) - dt);
      if (j.held) continue;
      if (G.talent && (!j.moving || G.talent.cast.some((c) => c.j === j))) { j.moving = j.moving && !G.talent.cast.some((c) => c.j === j); if (!j.moving) { j.dir = j.u < 0 ? 1 : -1; continue; } }
      if (G.duet && (G.duet.a === j.id || G.duet.b === j.id) && (G.duet.phase === "sing" || !j.moving)) continue;
      if (G.selected === j.id) { j.moving = false; j.act = null; j.after = null; continue; }
      if (j.act) { activity(j, dt); continue; }
      if (j.moving) {
        const dx = j.tx - j.u, dy = j.ty - j.v, d = Math.hypot(dx, dy);
        const sp = 0.1 * (j.stage === "adult" ? 1.15 : 0.9) * (j.mood < 30 ? 0.5 : 1) * (j.hurry > 0 ? 2.4 : 1) * (0.25 + 0.75 * j.pace) * Math.min(1, 0.35 + d / 0.1);
        if (d < 0.02) {
          j.moving = false;
          j.idle = 1.5 + rand() * 5;
          if (j.after) { startActivity(j); }
        }
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
          j.waitFor = null;
          const sv = G.save, toys = Object.keys(sv.toys || {}).filter((id) => sv.toys[id]);
          if (j.belly < 60 && sv.ground && sv.ground.length && rand() < 0.75) {
            // hungry: go and eat something off the grass
            const it = pick(sv.ground);
            j.eatId = it.id;
            goDo(j, "eat", clamp(it.u - 0.07, -0.85, 0.85), it.v);
          }
          else if (r < 0.1) { j.hopT = 1; j.idle = 1.2; sfx("bell"); }
          else if (r < 0.16 && j.mood > 40) { j.spinT = 1; j.idle = 1.4; }
          else if (r < 0.23 && (j.mood < 40 || j.belly < 30)) { j.sleep = true; j.idle = 6; }
          else if (r < 0.33) goDo(j, "tv", -0.6 + rand() * 0.14, 0.4 + rand() * 0.12);
          else if (r < 0.43) goDo(j, "pond", 0.42 + rand() * 0.06, 0.44 + rand() * 0.12);
          else if (r < 0.62 && toys.length) { const id = pick(toys); j.toy = id; goDo(j, "toy", clamp(JG.TOYS[id].u + 0.11, -0.85, 0.85), JG.TOYS[id].v + 0.03); }
          else if (r < 0.76 && findBuddy(j)) { /* off to play */ }
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

  // ---- things Jinxes do on their own: watch the TV, splash in the pond, play together ----
  function goDo(j, kind, u, v) { j.tx = u; j.ty = v; j.moving = true; j.after = kind; }
  function findBuddy(j) {
    const b = G.save.jinxes.find((o) => o !== j && o.stage !== "egg" && o.id !== G.selected && !o.act && !o.after && !o.sleep && !o.waitFor && !o.moving);
    if (!b) return false;
    b.moving = false;
    b.idle = 12;
    b.after = null;
    b.waitFor = j.id;
    j.buddy = b.id;
    goDo(j, "play", clamp(b.u - 0.22, -0.8, 0.8), b.v);
    return true;
  }
  function startActivity(j) {
    const kind = j.after;
    j.after = null;
    if (kind === "play") {
      const b = jinxById(j.buddy);
      if (!b || b.stage === "egg" || b.id === G.selected || b.waitFor !== j.id) return;
      b.act = { kind: "play", t: 6, buddy: j.id, beat: 0.35 };
      b.dir = -1;
      b.waitFor = null;
      j.act = { kind: "play", t: 6, buddy: b.id, beat: 0 };
      j.dir = 1;
    } else if (kind === "eat") {
      const it = G.save.ground.find((g) => g.id === j.eatId);
      if (it) feedJinx(j, it.item, it);
    } else if (kind === "toy") j.act = { kind, toy: j.toy, t: 7 + rand() * 4, beat: 0.4 };
    else j.act = { kind, t: 6 + rand() * 5, beat: 0 };
  }
  function activity(j, dt) {
    const a = j.act;
    a.t -= dt;
    a.beat -= dt;
    j.mood = clamp(j.mood + dt / 6, 0, 100);
    const [x, y] = jinxScreen(j);
    if (a.kind === "tv") {
      j.dir = -1;
      if (a.beat <= 0) { a.beat = 1.6 + rand() * 2; j.happyT = 0.9; D.burst(x, y - 30, "note", 1, "#c9b8ff"); }
    } else if (a.kind === "pond") {
      j.dir = 1;
      if (a.beat <= 0) {
        a.beat = 0.9 + rand() * 0.6;
        j.hopT = 1;
        j.happyT = 0.6;
        const [px, py] = D.toScreen(0.66, 0.47);
        D.burst(px, py, "drop", 7, "#b6ff5c");
      }
    } else if (a.kind === "toy") {
      const T = JG.TOYS[a.toy];
      j.dir = T.u > j.u ? 1 : -1;
      G.toyUse = G.toyUse || {};
      G.toyUse[a.toy] = G.t;
      if (a.beat <= 0) {
        // a little practice at a time adds up
        a.beat = 1.4;
        if (a.toy === "tramp") j.hopT = 1;
        j.happyT = 0.6;
        if (addXp(j, T.stat, 1)) { toast(`${j.name}'s ${JG.STAT_INFO[T.stat].label} went up from practice!`); sfx("buff"); }
        D.burst(x, y - 34, "star", 2, JG.STAT_INFO[T.stat].color);
      }
    } else if (a.kind === "play") {
      const b = jinxById(a.buddy);
      if (!b || !b.act || b.id === G.selected) a.t = 0;
      else if (a.beat <= 0) {
        a.beat = 0.7;
        j.hopT = 1;
        j.happyT = 0.5;
        if (rand() < 0.35) D.burst(x, y - 34, "heart", 1, "#ff5fa8");
        j.love = clamp(j.love + 0.2, 0, 100);
      }
    }
    if (a.t <= 0) { j.act = null; j.idle = 1 + rand() * 3; }
  }

  function hatchEgg(e) {
    const inh = e.inherit;
    const j = makeJinx({ hue: e.hue, parts: (inh && inh.parts) || e.parts || randomKind(), name: inh ? inh.name : undefined, align: inh ? inh.align : 0, moon: inh ? inh.moon : 0, gen: inh ? inh.gen : 1, trait: inh ? inh.trait : undefined,
      grades: inh && inh.grades ? (inh.exact ? inh.grades : rollGrades(inh.grades)) : undefined });
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
    // the first hatchling keeps its shell as a hat, and now and then so does a later one
    const shell = !G.demo && (!G.save.hats.shell || rand() < 0.25);
    if (shell) { grantHat("shell"); j.hat = "shell"; }
    toast((inh && inh.duet ? `${j.name} hatched, ${/^[AEIOU]/.test(kindName(j)) ? "an" : "a"} ${kindName(j)}: the child of ${inh.parents.join(" and ")}.` : inh ? `${j.name} was born again!` : `An egg hatched! Say hi to ${j.name}, ${/^[AEIOU]/.test(kindName(j)) ? "an" : "a"} ${kindName(j)}.`) + (shell ? " It kept its shell as a hat." : ""));
    persist();
    renderPanel();
  }

  // ---- pointer: tap to pet or pick, drag to carry ----
  let drag = null;
  const scenePos = (e) => { const r = $("#scene").getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function hitAt(x, y, kind) {
    let best = null, bd = 1e9;
    for (const h of G.hits) {
      if (kind && h.kind !== kind) continue;
      const d = Math.hypot(h.x - x, h.y - y) - (h.kind === "jinx" ? 8 : h.kind === "item" ? 4 : 0);
      if (d < h.r * (h.kind === "jinx" ? 1.5 : 1.15) && d < bd) { bd = d; best = h; }
    }
    return best;
  }
  function deselect() { if (G.selected) { G.selected = null; feedOpen = false; hatOpen = false; renaming = false; renderPanel(); } }
  $("#scene").addEventListener("pointermove", (e) => {
    const [x, y] = scenePos(e);
    G.pointer = [x, y];
    if (!drag || G.mode !== "garden") return;
    if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 10) {
      if (drag.j && drag.j.stage === "egg") return;
      drag.moved = true;
      if (drag.j) {
        const j = drag.j;
        Object.assign(j, { held: true, act: null, after: null, moving: false, sleep: false });
        if (G.selected === j.id) deselect();
        sfx("honk");
      } else drag.it.held = true;
    }
    if (drag.moved) {
      const o = drag.j || drag.it, [u, v] = D.fromScreen(x, y + (drag.j ? 30 : 14));
      o.u = u;
      o.v = v;
    }
  });
  $("#scene").addEventListener("pointerleave", () => { G.pointer = null; });
  $("#scene").addEventListener("pointerdown", (e) => {
    if (G.mode !== "garden" || G.talent) return;
    A.init();
    const [x, y] = scenePos(e);
    const h = hitAt(x, y);
    if (h && h.j && G.duet && (G.duet.a === h.j.id || G.duet.b === h.j.id)) return;
    if (!h) { deselect(); return; }
    if (h.kind === "tree") { shakeTree(); return; }
    if (h.kind === "toy") { const T = JG.TOYS[h.id]; toast(`${T.name}. ${T.desc}`); return; }
    drag = { j: h.j, it: h.it, sx: x, sy: y, moved: false, h };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag, [x, y] = scenePos(e);
    drag = null;
    if (!d.moved) tapThing(d);
    else dropThing(d, x, y);
  };
  $("#scene").addEventListener("pointerup", endDrag);
  $("#scene").addEventListener("pointercancel", endDrag);
  function tapThing(d) {
    if (d.it) {
      // pick a snack up off the grass
      const s = G.save, k = s.ground.indexOf(d.it);
      if (k < 0) return;
      s.ground.splice(k, 1);
      s.inv[d.it.item] = (s.inv[d.it.item] || 0) + 1;
      sfx("coin");
      toast(`${JG.ITEMS[d.it.item].name} goes in the pantry. Drag snacks onto a Jinx to feed them straight away.`);
      persist();
      renderPanel();
      return;
    }
    const j = d.j;
    if (j.stage === "egg") {
      j.hatch = Math.max(0.01, j.hatch - 3);
      j.wobble = 1;
      sfx("bell");
      D.burst(d.h.x, d.h.y, "star", 4, "#ffd23f");
    } else if (G.selected === j.id) { petJinx(j); return; }
    else sfx("honk");
    if (G.selected !== j.id) { feedOpen = false; hatOpen = false; renaming = false; }
    G.selected = j.id;
    renderPanel();
  }
  function dropThing(d, x, y) {
    const s = G.save;
    if (d.it) {
      d.it.held = false;
      const h = hitAt(x, y - 20, "jinx");
      if (h && h.j.stage !== "egg") feedJinx(h.j, d.it.item, d.it);
      persist();
      return;
    }
    const j = d.j;
    j.held = false;
    j.hopT = 1;
    j.idle = 2;
    sfx("bell");
    const near = (u, v, rad) => Math.hypot(j.u - u, j.v - v) < rad;
    const toy = Object.keys(s.toys || {}).find((id) => s.toys[id] && near(JG.TOYS[id].u, JG.TOYS[id].v, 0.22));
    const pal = s.jinxes.find((o) => o !== j && o.stage !== "egg" && !o.held && near(o.u, o.v, 0.2));
    const snack = s.ground.find((it) => near(it.u, it.v, 0.14));
    if (near(0.66, 0.47, 0.26)) { j.u = 0.44; j.v = 0.48; j.act = { kind: "pond", t: 8, beat: 0.4 }; }
    else if (near(-0.81, 0.36, 0.28)) { j.u = -0.6; j.v = 0.43; j.act = { kind: "tv", t: 9, beat: 0.6 }; }
    else if (toy) { j.u = clamp(JG.TOYS[toy].u + 0.11, -0.85, 0.85); j.v = JG.TOYS[toy].v + 0.03; j.act = { kind: "toy", toy, t: 9, beat: 0.5 }; }
    else if (snack) feedJinx(j, snack.item, snack);
    else if (pal) {
      Object.assign(pal, { moving: false, after: null, sleep: false, dir: j.u < pal.u ? -1 : 1, act: { kind: "play", t: 6, buddy: j.id, beat: 0.35 } });
      j.dir = j.u < pal.u ? 1 : -1;
      j.act = { kind: "play", t: 6, buddy: pal.id, beat: 0 };
    }
    persist();
  }

  // ---- hats ----
  function grantHat(id) { const h = G.save.hats; h[id] = (h[id] || 0) + 1; }
  // how many of a hat are in the box, not on a head
  function hatsFree(id) { return (G.save.hats[id] || 0) - G.save.jinxes.filter((o) => o.hat === id).length; }
  function wearHat(j, id) {
    if (j.hat === id) j.hat = null;
    else if (hatsFree(id) > 0) j.hat = id;
    else return;
    j.hopT = 1;
    j.happyT = 1.2;
    sfx("honk");
    persist();
    renderPanel();
  }

  // ---- duets: two grown Jinxes share a Heart Balloon, sing in the ring, and leave an egg ----
  const canDuet = (j) => j.stage === "adult" && j.love >= 40 && j.age - (j.duetAge === undefined ? -9 : j.duetAge) >= 2;
  function openDuet(j) {
    const s = G.save, have = s.inv.balloon || 0, full = s.jinxes.length >= 6;
    const why = (o) => (o.love < 40 ? "needs more Love (40)" : !canDuet(o) ? "still hoarse from the last duet (2 shows)" : "");
    const others = s.jinxes.filter((o) => o !== j && o.stage === "adult");
    const mine = why(j);
    const rows = others.length
      ? others.map((o) => { const w = mine || why(o); return `<div class="shoprow"><div>${esc(o.name)}<small>${kindName(o)} \u00B7 ${formName(o)}${w && !mine ? " · " + w : ""}</small></div><span class="have"></span><button class="btn small" data-act="sing" data-id="${o.id}" ${w || !have || full ? "disabled" : ""}>Sing</button></div>`; }).join("")
      : `<p class="note">There's no other grown Jinx in the garden yet. A child grows up after 3 shows.</p>`;
    modal(`<p class="eyebrow">Duet</p><h2>Who sings with ${esc(j.name)}?</h2>
      <p>Two grown Jinxes who share a <b>Heart Balloon</b> sing a duet in the ring, and an egg appears. The egg takes its head, its headpiece and its body each from one of them, so two different kinds can leave something new. It also takes its colour, its lean, a trait and its aptitude grades from both, and now and then a grade comes out a step better.</p>
      <p class="tag">Heart Balloons: <b>${have}</b>${have ? "" : " · the Concession stand sells them"}${full ? " · the garden is full (6 at most)" : ""}${mine ? " · " + esc(j.name) + " " + mine : ""}</p>
      <div class="shoplist">${rows}</div>
      <button class="btn ghost" data-act="close">Not now</button>`, {
      close: closeModal,
      sing: (b) => { const o = jinxById(b.dataset.id); if (o && canDuet(j) && canDuet(o) && s.inv.balloon > 0 && s.jinxes.length < 6) { closeModal(); startDuet(j, o); } }
    });
  }
  function startDuet(a, b) {
    const s = G.save;
    s.inv.balloon--;
    a.duetAge = a.age;
    b.duetAge = b.age;
    deselect();
    for (const [j, u] of [[a, -0.14], [b, 0.08]]) Object.assign(j, { act: null, after: null, sleep: false, held: false, moving: true, hurry: 5, tx: u, ty: 0.08 });
    G.duet = { a: a.id, b: b.id, phase: "walk", t: 0, u: -0.03, v: 0.08, beat: 0 };
    toast(`${a.name} and ${b.name} head for the ring.`);
    persist();
  }
  function duetStep(dt) {
    const d = G.duet, a = jinxById(d.a), b = jinxById(d.b);
    if (!a || !b) { G.duet = null; return; }
    d.t += dt;
    if (d.phase === "walk") {
      if ((!a.moving && !b.moving) || d.t > 9) {
        Object.assign(a, { moving: false, u: -0.14, v: 0.08, dir: 1 });
        Object.assign(b, { moving: false, u: 0.08, v: 0.08, dir: -1 });
        d.phase = "sing";
        d.t = 0;
      }
      return;
    }
    d.beat -= dt;
    if (d.beat <= 0) {
      d.beat = 0.45;
      const who = Math.floor(d.t / 0.45) % 2 ? a : b, [x, y] = jinxScreen(who);
      who.hopT = 1;
      who.happyT = 1;
      D.burst(x, y - 40, "note", 2, who === a ? "#ff5fa8" : "#8fe9ff");
      sfx("bell");
    }
    if (d.t > 3.6) {
      const s = G.save, [x, y] = D.toScreen(d.u, d.v);
      const e = makeEgg({ hue: blendHue(a.hue, b.hue), inherit: duetInherit(a, b), hatch: 45 });
      e.u = d.u; e.v = d.v + 0.05;
      s.jinxes.push(e);
      for (const j of [a, b]) { j.mood = clamp(j.mood + 20, 0, 100); j.love = clamp(j.love + 5, 0, 100); j.happyT = 2.5; j.idle = 3; }
      D.burst(x, y - 30, "heart", 14, "#ff5fa8");
      D.burst(x, y - 30, "star", 12, "#ffd23f");
      sfx("hatch");
      toast(`${a.name} and ${b.name} left an egg in the ring!`);
      G.duet = null;
      persist();
    }
  }
  function blendHue(h1, h2) {
    let d = ((h2 - h1 + 540) % 360) - 180;
    return Math.round((h1 + d * (0.3 + rand() * 0.4) + (rand() - 0.5) * 40 + 360) % 360);
  }
  function duetInherit(a, b) {
    const grades = {}, stats = {};
    for (const st of JG.STATS) {
      const r = rand(), g = (rand() < 0.5 ? a : b).grades[st];
      grades[st] = clamp(g + (r < 0.22 ? 1 : r > 0.92 ? -1 : 0), 0, 5);
      stats[st] = Math.max(1, Math.floor((a.stats[st].lv + b.stats[st].lv) * 0.12));
    }
    const r = rand();
    const from = () => (rand() < 0.5 ? a : b);
    return { duet: true, exact: true, parents: [a.name, b.name], parts: { head: from().head, piece: from().piece, body: from().body }, align: clamp((a.align + b.align) / 2 * 0.6 + (rand() - 0.5) * 0.2, -1, 1), moon: clamp(((a.moon || 0) + (b.moon || 0)) / 2 * 0.6 + (rand() - 0.5) * 0.2, -1, 1),
      gen: Math.max(a.gen, b.gen) + 1, trait: r < 0.45 ? a.trait : r < 0.9 ? b.trait : pick(Object.keys(JG.TRAITS)), grades, stats };
  }

  // ---- the talent show: three rounds in the garden ring against three rivals ----
  const rested = (j) => j.showDay !== G.save.records.runs;
  function openTalent() {
    const j = jinxById(G.selected), s = G.save;
    if (!j || j.stage === "egg") { toast("Tap a Jinx first to pick who performs."); return; }
    const top = Math.max(...JG.STATS.map((st) => j.stats[st].lv));
    const no = !rested(j) ? `${j.name} has already performed and needs a rest. They can enter again after the next Big Top show.` : j.belly < 20 ? `${j.name} is too hungry to perform. Feed them first.` : "";
    const rows = JG.LEAGUES.map((L) => {
      const won = s.records.ribbons[L.id] || 0, hat = JG.HATS[L.hat];
      return `<div class="shoprow"><div>${L.name}<small>${L.blurb} Rivals are around level ${L.lv}; ${esc(j.name)}'s best stat is ${top}.</small><small>First prize: ${L.prize} Tix${s.hats[L.hat] ? "" : " and the " + hat.name}${won ? ` · won ${won} time${won > 1 ? "s" : ""}` : ""}</small></div><span class="have"></span><button class="btn small" data-act="enter" data-id="${L.id}" ${no ? "disabled" : ""}>Enter</button></div>`;
    }).join("");
    modal(`<p class="eyebrow">Talent show</p><h2>Put ${esc(j.name)} on stage?</h2>
      <p>Three rounds in the garden ring against three rivals. Each round tests one stat. When it's ${esc(j.name)}'s turn, tap <b>Cheer</b> as the marker crosses the middle of the bar: good timing lifts the judges' score.</p>
      <p class="note">A good Mood helps, and the judges like a hat. Taking part trains the stats that were tested.</p>
      ${no ? `<p class="tag">${esc(no)}</p>` : ""}
      <div class="shoplist">${rows}</div>
      <button class="btn ghost" data-act="close">Not today</button>`, {
      close: closeModal,
      enter: (b) => { const L = JG.LEAGUES.find((l) => l.id === b.dataset.id); if (L && rested(j) && j.belly >= 20) { closeModal(); talentShow(j, L); } }
    });
  }
  function makeRival(L, name) {
    const r = makeJinx({ name, align: pick([-0.8, 0, 0, 0.8]), moon: pick([-0.6, 0.8]), parts: rand() < 0.6 ? randomKind() : { head: randomKind().head, piece: randomKind().piece, body: randomKind().body } });
    r.stage = L.lv >= 8 ? "adult" : "child";
    for (const st of JG.STATS) r.stats[st].lv = Math.max(1, Math.round(L.lv + (rand() - 0.5) * 4));
    r.stats[pick(JG.STATS)].lv += 3;
    r.mood = 80;
    r.hat = rand() < 0.55 ? pick(Object.keys(JG.HATS)) : null;
    return r;
  }
  const round1 = (v) => Math.round(clamp(v, 1, 10) * 10) / 10;
  async function talentShow(j, L) {
    const s = G.save, names = shuffle(JG.RIVALS.slice());
    deselect();
    j.showDay = s.records.runs;
    j.belly = clamp(j.belly - 20, 0, 100);
    Object.assign(j, { act: null, after: null, sleep: false, moving: false, held: false });
    const tall = innerHeight > innerWidth;   // on a phone the island is narrow: stand further apart, a little smaller
    const cast = (tall ? [-0.5, -0.19, 0.12, 0.43] : [-0.38, -0.15, 0.08, 0.31]).map((u, i) => ({ j: i === 1 ? j : makeRival(L, names[i]), me: i === 1, u, v: 0.0, dir: u < 0 ? 1 : -1, cheer: 0, scale: tall ? 0.95 : 1.25, low: tall && i % 2 === 1 }));
    j.u = cast[1].u; j.v = cast[1].v;
    // everyone else comes to watch from the wings
    const SEATS = [[-0.72, 0.22], [0.66, 0.3], [-0.62, 0.42], [0.56, 0.48], [-0.8, 0.02]];
    let seat = 0;
    for (const o of s.jinxes) {
      if (o === j) continue;
      if (o.stage === "egg") { if (Math.abs(o.v) < 0.3 && Math.abs(o.u) < 0.55) o.v = 0.55; continue; }
      const st = SEATS[seat++ % SEATS.length];
      Object.assign(o, { act: null, after: null, sleep: false, held: false, moving: true, hurry: 4, tx: st[0], ty: st[1] });
    }
    const T = (G.talent = {
      L, cast, order: shuffle(JG.STATS.slice()).slice(0, 3), stat: null, acting: -1, t0: 0, cards: [], totals: [0, 0, 0, 0], meter: null, winner: -1,
      view(i) { return { acting: this.acting === i, stat: this.stat, k: clamp((G.t - this.t0) / 3, 0, 1), card: this.cards[i], total: this.totals[i], cheer: cast[i].cheer, won: this.winner === i }; }
    });
    document.body.dataset.show = "1";
    show("#talent", true);
    const say = (a, b) => { $("#tlRound").textContent = a; $("#tlHint").textContent = b || ""; };
    say(`${L.name}`, `Tonight: ${T.order.map((st) => JG.STAT_INFO[st].label).join(", ")}.`);
    sfx("hatch");
    await sleep(1600);
    const ACTS = { juggle: "juggling", tumble: "tumbling", glow: "a light show", grit: "feats of strength" };
    for (let r = 0; r < 3; r++) {
      const st = T.order[r], I = JG.STAT_INFO[st];
      T.stat = st;
      T.cards = [];
      say(`Round ${r + 1} of 3: ${I.label}`, `The rivals go first, with ${ACTS[st]}.`);
      await sleep(900);
      for (const i of [0, 2, 3]) {
        T.acting = i; T.t0 = G.t;
        sfx("card");
        await sleep(1150);
        const v = round1(5 + (cast[i].j.stats[st].lv - L.lv) * 0.35 + 0.7 + (rand() - 0.5) * 1.6);
        T.acting = -1;
        T.cards[i] = { v, t0: G.t };
        T.totals[i] += v;
        sfx("coin");
        await sleep(380);
      }
      say(`Round ${r + 1} of 3: ${I.label}`, `${j.name}'s turn. Tap Cheer when the marker is in the middle.`);
      T.acting = 1; T.t0 = G.t;
      const bonus = await cheerPhase(T, cast[1]);
      const v = round1(5 + (j.stats[st].lv - L.lv) * 0.35 + bonus + (j.mood >= 70 ? 0.4 : j.mood < 35 ? -0.6 : 0) + (j.hat ? 0.3 : 0) + (j.trait === "showoff" ? 0.4 : j.trait === "scaredy" ? -0.3 : 0) + (rand() - 0.5) * 0.6);
      T.acting = -1;
      T.cards[1] = { v, t0: G.t };
      T.totals[1] += v;
      const [x, y] = jinxScreen(j);
      D.burst(x, y - 40, "star", v >= 8 ? 18 : 8, "#ffd23f");
      sfx(v >= 8 ? "buff" : "coin");
      say(`Round ${r + 1} of 3: ${I.label}`, `The judges give ${j.name} ${v.toFixed(1)}.`);
      await sleep(1700);
    }
    // results
    const rank = [0, 1, 2, 3].sort((a, b) => T.totals[b] - T.totals[a]), place = rank.indexOf(1);
    T.cards = [];
    T.winner = rank[0];
    say(`${cast[rank[0]].j.name} takes the ribbon!`, "");
    sfx(place === 0 ? "hatch" : "bell");
    { const [x, y] = D.toScreen(cast[rank[0]].u, cast[rank[0]].v); D.burst(x, y - 50, "star", 26, "#ffd23f"); D.burst(x, y - 50, "heart", 8, "#ff5fa8"); }
    await sleep(2200);
    show("#talent", false);
    let tix = place === 0 ? L.prize : place === 1 ? Math.floor(L.prize / 3) : 0, hat = null;
    if (place === 0) {
      s.records.ribbons[L.id] = (s.records.ribbons[L.id] || 0) + 1;
      j.ribbons = (j.ribbons || 0) + 1;
      if (!s.hats[L.hat]) { hat = L.hat; grantHat(hat); }
    }
    s.tix += tix;
    const ups = [];
    for (const st of T.order) if (addXp(j, st, 3 + Math.floor(L.lv / 3) + (place === 0 ? 3 : 0))) ups.push(JG.STAT_INFO[st].label);
    j.mood = clamp(j.mood + [22, 8, 0, -8][place], 0, 100);
    j.love = clamp(j.love + (place === 0 ? 6 : 2), 0, 100);
    persist();
    const table = rank.map((i, k) => `<li>${["1st", "2nd", "3rd", "4th"][k]} <b${i === 1 ? ' style="color:var(--pink)"' : ""}>${esc(cast[i].j.name)}</b> ${T.totals[i].toFixed(1)}</li>`).join("");
    modal(`<p class="eyebrow">${L.name}</p><h2>${place === 0 ? `${esc(j.name)} wins the ribbon!` : `${esc(j.name)} came ${["first", "second", "third", "last"][place]}`}</h2>
      <p>${place === 0 ? "The whole garden is cheering." : place === 1 ? "So close. A little more practice, or better-timed cheers, would do it." : "The rivals were sharper tonight. Train the stats that were tested and try again."}</p>
      <div class="cols"><div><h3>The judges' totals</h3><ul class="loot">${table}</ul></div>
      <div><h3>Brought home</h3><ul class="loot">${tix ? `<li><span class="glyph" style="color:#ffd23f">✂</span><b>${tix}</b> Tix</li>` : ""}${hat ? `<li><span class="glyph" style="color:#8fe9ff">♛</span>${JG.HATS[hat].name}, for the hat box</li>` : ""}<li>Practice in ${T.order.map((st) => JG.STAT_INFO[st].label).join(", ")}${ups.length ? ` <small>(${ups.join(" and ")} went up)</small>` : ""}</li></ul></div></div>
      <p class="note">${esc(j.name)} needs a rest now, and can enter again after the next Big Top show.</p>
      <button class="btn big" data-act="home">Back to the garden</button>`, {
      home: () => {
        closeModal();
        G.talent = null;
        delete document.body.dataset.show;
        show("#talent", false);
        j.happyT = 2;
        G.selected = j.id;
        renderHud();
        renderPanel();
      }
    }, { wide: true });
  }
  // The cheering game: a marker sweeps the bar and the player taps as it crosses the middle, three times.
  function cheerPhase(T, c) {
    return new Promise((done) => {
      const m = (T.meter = { pos: rand() * 0.3, dir: 1, v: T.L.speed, left: 3, bonus: 0, until: G.t + 10, done, c });
      show("#tlMeter", true);
      show("#cheerBtn", true);
      $("#tlPips").textContent = "★★★";
      if (JG.fast) { m.left = 0; m.bonus = 1.2; }
    });
  }
  function cheer() {
    const T = G.talent, m = T && T.meter;
    if (!m || m.left <= 0 || G.t < (m.wait || 0)) return;
    m.wait = G.t + 0.3;   // so a double tap doesn't spend two cheers
    const d = Math.abs(m.pos - 0.5), [x, y] = jinxScreen(m.c.j);
    m.left--;
    m.c.cheer = 1;
    if (d < 0.05) { m.bonus += 0.9; D.burst(x, y - 40, "heart", 8, "#ff5fa8"); D.float && D.float(x, y - 90, "Perfect!", "#ffd23f"); sfx("buff"); }
    else if (d < 0.14) { m.bonus += 0.5; D.burst(x, y - 40, "heart", 4, "#ff5fa8"); D.float && D.float(x, y - 90, "Good!", "#8fe9ff"); sfx("bell"); }
    else { D.float && D.float(x, y - 90, m.pos < 0.5 ? "Too early" : "Too late", "#efe6d2"); sfx("honk"); }
    m.v *= 1.12;
    $("#tlPips").textContent = "★".repeat(m.left) + "☆".repeat(3 - m.left);
  }
  function talentStep(dt) {
    const T = G.talent;
    for (const c of T.cast) c.cheer = Math.max(0, c.cheer - dt * 2);
    const m = T.meter;
    if (!m) return;
    m.pos += m.dir * m.v * dt;
    if (m.pos > 1) { m.pos = 2 - m.pos; m.dir = -1; }
    if (m.pos < 0) { m.pos = -m.pos; m.dir = 1; }
    $("#tlMark").style.left = (m.pos * 100).toFixed(1) + "%";
    if (m.left <= 0 || G.t > m.until) {
      T.meter = null;
      show("#tlMeter", false);
      show("#cheerBtn", false);
      $("#tlPips").textContent = "";
      setTimeout(() => m.done(m.bonus), JG.fast ? 0 : 500);
    }
  }
  $("#cheerBtn").addEventListener("click", cheer);
  addEventListener("keydown", (e) => { if (G.talent && G.talent.meter && (e.code === "Space" || e.key === "Enter") && $("#modal").hidden) { e.preventDefault(); cheer(); } });

  // ---- the snack tree ----
  function shakeTree() {
    const s = G.save, tr = s.tree;
    tr.shake = 0.7;
    sfx("card");
    const ripe = tr.fruits.filter((f) => f.grow >= 1);
    if (!ripe.length) { toast(tr.fruits.length ? "Nothing's ripe yet. Give it a little while." : "The tree is bare. Snacks grow back in time."); return; }
    const [tx, ty] = D.toScreen(JG.TREE.u, JG.TREE.v);
    for (const f of ripe) {
      if (s.ground.length >= 8) { toast("There's no room on the grass. Pick some snacks up first."); break; }
      tr.fruits.splice(tr.fruits.indexOf(f), 1);
      s.ground.push({ id: "g" + uid++, item: f.item, u: clamp(JG.TREE.u - 0.2 + rand() * 0.3, -0.85, 0.85), v: JG.TREE.v + 0.2 + rand() * 0.2 });
      D.burst(tx, ty - 60, "star", 5, JG.ITEMS[f.item].color);
    }
    sfx("coin");
    persist();
  }
  function treeStep(dt) {
    const tr = G.save.tree;
    if (!tr) return;
    tr.shake = Math.max(0, (tr.shake || 0) - dt);
    tr.t = (tr.t || 0) + dt;
    for (const f of tr.fruits) f.grow = Math.min(1, f.grow + dt / 22);
    if (tr.t > 32 && tr.fruits.length < 4) {
      tr.t = 0;
      const slot = [0, 1, 2, 3].find((k) => !tr.fruits.some((f) => f.slot === k));
      tr.fruits.push({ item: pick(JG.TREE.items), grow: 0, slot });
    }
  }
  function whistle() {
    sfx("bell");
    setTimeout(() => sfx("bell"), 140);
    let i = 0;
    for (const j of G.save.jinxes) {
      if (j.stage === "egg" || j.held) continue;
      Object.assign(j, { act: null, after: null, sleep: false, moving: true, happyT: 1.4, hurry: 4, tx: clamp(-0.3 + i * 0.2, -0.8, 0.8), ty: 0.34 + (i % 2) * 0.16 });
      i++;
    }
    toast(i ? "Everyone, over here!" : "Nobody's hatched yet.");
  }

  function openShop() {
    const s = G.save;
    const full = s.jinxes.length >= 6;
    const rows = JG.SHOP_ITEMS.map((id) => {
      const it = JG.ITEMS[id];
      return `<div class="shoprow"><div>${itemChip(id)}<small>${esc(it.desc)}</small></div><span class="have">have ${s.inv[id] || 0}</span><button class="btn small" data-act="buy" data-item="${id}" ${s.tix < it.price ? "disabled" : ""}>${it.price} Tix</button></div>`;
    }).join("");
    modal(`<h2>Concession Stand</h2><p class="tag">You have <b class="tixnum">${s.tix}</b> Tix. Snacks go in the pantry.</p>
      <div class="shoplist">${rows}
      <div class="shoprow"><div><span class="glyph" style="color:#ffd23f">⬮</span>A mystery egg<small>${full ? "The garden is full (6 at most)." : "An Umbra, a Hollow or a Lantern. You find out when it hatches."}</small></div><span class="have"></span><button class="btn small" data-act="egg" ${s.tix < 80 || full ? "disabled" : ""}>80 Tix</button></div>
      <div class="shoprow"><div>${itemChip("balloon")}<small>${esc(JG.ITEMS.balloon.desc)}</small></div><span class="have">have ${s.inv.balloon || 0}</span><button class="btn small" data-act="buy" data-item="balloon" ${s.tix < JG.ITEMS.balloon.price ? "disabled" : ""}>${JG.ITEMS.balloon.price} Tix</button></div>
      </div>
      <h3>Hats</h3>
      <div class="shoplist">${JG.SHOP_HATS.map((id) => { const Hh = JG.HATS[id]; return `<div class="shoprow"><div><span class="glyph" style="color:#8fe9ff">\u265B</span>${Hh.name}<small>${Hh.desc}</small></div><span class="have">${s.hats[id] ? "have " + s.hats[id] : ""}</span><button class="btn small" data-act="hat" data-id="${id}" ${s.tix < Hh.price ? "disabled" : ""}>${Hh.price} Tix</button></div>`; }).join("")}
      <p class="note">Hats go in the hat box. Tap a Jinx, then Hat, to try one on. Other hats are prizes.</p>
      </div>
      <h3>Toys for the garden</h3>
      <div class="shoplist">${Object.keys(JG.TOYS).map((id) => { const T = JG.TOYS[id], own = s.toys[id]; return `<div class="shoprow"><div><span class="glyph" style="color:${JG.STAT_INFO[T.stat].color}">✦</span>${T.name}<small>${T.desc}</small></div><span class="have">${own ? "in the garden" : ""}</span><button class="btn small" data-act="toy" data-id="${id}" ${own || s.tix < T.price ? "disabled" : ""}>${own ? "Owned" : T.price + " Tix"}</button></div>`; }).join("")}</div>
      <button class="btn" data-act="close">Done</button>`, {
      close: closeModal,
      hat: (b) => {
        const Hh = JG.HATS[b.dataset.id];
        if (!Hh || s.tix < Hh.price) return;
        s.tix -= Hh.price;
        grantHat(b.dataset.id);
        sfx("coin");
        persist();
        renderHud();
        renderPanel();
        openShop();
      },
      toy: (b) => {
        const T = JG.TOYS[b.dataset.id];
        if (s.toys[b.dataset.id] || s.tix < T.price) return;
        s.tix -= T.price;
        s.toys[b.dataset.id] = true;
        sfx("coin");
        persist();
        renderHud();
        closeModal();
        toast(`The ${T.name.toLowerCase()} is set up. Jinxes will wander over, or you can carry one there.`);
      },
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
  // ---- Clown College: a Jinx keeps what it learns and brings it on every run ----
  function openCollege() {
    const j = jinxById(G.selected), s = G.save;
    if (!j || j.stage === "egg") { toast("Tap a Jinx first to pick who goes to class."); return; }
    const r = D.rng(1000 + s.records.runs * 7 + s.records.hatched);
    const pool = Object.keys(JG.CARDS).filter((id) => [1, 2].includes(JG.CARDS[id].rarity) && !JG.CARDS[id].exhaust);
    const offers = [];
    while (offers.length < 3) { const id = pool[(r() * pool.length) | 0]; if (!offers.includes(id)) offers.push(id); }
    const knows = (j.learned || []).map((id) => JG.CARDS[id].name);
    const price = (id) => (JG.CARDS[id].rarity === 1 ? 45 : 75);
    modal(`<p class="eyebrow">Clown College</p><h2>What should ${esc(j.name)} study?</h2>
      <p>A Jinx brings every trick it has learned on every run, on top of its usual deck. It can keep 2 lessons${knows.length >= 2 ? `, so a new one replaces <b>${esc(knows[0])}</b>` : ""}. Today's classes change after each show.</p>
      <p class="tag">${esc(j.name)} knows: ${knows.length ? esc(knows.join(", ")) : "nothing yet"} \u00B7 you have <b class="tixnum">${s.tix}</b> Tix</p>
      <div class="cardgrid three">${offers.map((id) => cardHtml(id, { act: "learn", price: price(id), disabled: s.tix < price(id) || knows.includes(JG.CARDS[id].name) }).replace('data-act="learn"', `data-act="learn" data-id="${id}"`)).join("")}</div>
      <button class="btn ghost" data-act="close">Not today</button>`, {
      close: closeModal,
      learn: (b) => {
        const id = b.dataset.id;
        if (s.tix < price(id)) return;
        s.tix -= price(id);
        j.learned = j.learned || [];
        if (j.learned.length >= 2) j.learned.shift();
        j.learned.push(id);
        j.happyT = 2;
        j.hopT = 1;
        const [x, y] = jinxScreen(j);
        D.burst(x, y - 30, "star", 16, "#ffd23f");
        sfx("hatch");
        persist();
        renderHud();
        renderPanel();
        closeModal();
        toast(`${j.name} learned ${JG.CARDS[id].name}!`);
      }
    }, { wide: true });
  }
  function openSky() {
    const s = G.save, r = s.records;
    const list = s.sky.length
      ? `<ul class="skylist">${s.sky.map((c) => `<li><b>${esc(c.name)}</b> ${esc(c.note || "")}</li>`).join("")}</ul>`
      : `<p class="note">No one is up there yet. After a Jinx's twelfth show, they rise into the sky as a constellation.</p>`;
    modal(`<h2>The Sky</h2><p class="tag">Shows: ${r.runs} · full wins: ${r.wins} · furthest act: ${r.bestAct || "none yet"} · hatched: ${r.hatched}</p>${list}
      <h3>How it works</h3>
      <ul class="howto">
        <li>Tap a Jinx to see it. Tap again to pet it. Drag one to carry it: drop it by the pond, the TV, a toy, a snack or a friend.</li>
        <li>Tap the candy-floss tree to shake down ripe snacks. Tap a snack to put it in the pantry, or drag it onto a Jinx. A hungry Jinx will find snacks on its own.</li>
        <li>Toys from the Concession stand train a stat a little at a time. Clown College teaches a Jinx a trick it brings on every run.</li>
        <li>Food raises stats. Cotton Comets and Angel Floss lean a Jinx toward Stardust; Sludge Pops and Black Hole Gum lean it toward Sludge.</li>
        <li>There are three kinds of Jinx: Umbra, Hollow and Lantern. Each is a head, a headpiece and a body. None of them has a mouth: watch the eyes, and a Lantern's chest light, to see how one feels.</li>
        <li>After 3 shows a child grows up, and how it leans decides its colours and details.</li>
        <li>On a run, the cards you play train the matching stat: attacks train Juggle, guards Tumble, ether Glow, and taking hits trains Grit.</li>
        <li>Card order matters. Many cards have a bonus for being played first, played after two others, or played right after a certain kind of card. A card glows when its bonus is live.</li>
        <li>You can hold one card when you end your turn. It stays in your hand instead of a new draw, so you can save a Guard for a big hit.</li>
        <li>Watch what the foe will do next. Guard when a hit is coming. When it winds up, deal enough damage that turn to make it flinch. When it takes a Counter stance, don't hit it.</li>
        <li>Foes can be weak to Attacks, Ether or Sludge, or shrug one of them off. Play 3 different kinds of card in a turn for a Hat Trick: 1 extra energy next turn.</li>
        <li>In a fight, the crowd's Applause fills as you play a mix of cards and avoid hits. When it's full, use your Showstopper.</li>
        <li>Each Jinx has a trait, and the more Love it has, the more often it improvises a free move. A sad Jinx sometimes phones it in.</li>
        <li>How a Jinx leans changes how it fights: Sludge builds Corruption, Stardust builds Starlight, Harlequins get a Wild card every turn, and Pierrots can hold two cards and play held cards for 1 less.</li>
        <li>A Jinx that stays between Sludge and Stardust grows into a Harlequin, or into a Pierrot if it leans Moonlit. Moon Pies and Paper Moons lean Moonlit; Motley Jawbreakers lean the other way.</li>
        <li>The letter beside each stat is aptitude, E up to S. Better grades learn faster. An egg left by a loved Jinx often has better grades.</li>
        <li>The Talent show is three rounds in the ring against three rivals. Tap Cheer as the marker crosses the middle of the bar. Winning gives Tix, a ribbon, and a hat the first time.</li>
        <li>Hats live in the hat box: tap a Jinx, then Hat. They are only for looks, though the talent show judges like one.</li>
        <li>Two grown Jinxes with 40 Love each can share a Heart Balloon and sing a Duet. The egg takes its head, headpiece and body each from one parent, so different kinds mix.</li>
        <li>Headliners and Ringmasters sometimes leave a strange egg, which hatches into a Hollow or a Lantern.</li>
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
  function maxHpFor(j, charms) { return JG.TUNE.baseHp + j.stats.grit.lv * 2 + (charms.includes("heart") ? 12 : 0); }
  function starterDeck(j) {
    const d = ["pie", "pie", "pie", "pie", "cart", "cart", "cart", "cart"];
    d.push({ stardust: "halohum", sludge: "gunkspit", pierrot: "tear", harlequin: "honk" }[leanForm(j)]);
    for (const id of j.learned || []) if (JG.CARDS[id]) d.push(id);
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
  const cardJinx = () => (G.run ? runJinx() : jinxById(G.selected) || G.save.jinxes.find((j) => j.stage !== "egg"));

  function genMap(act) {
    const floors = [];
    for (let f = 0; f < 5; f++) {
      const n = f === 0 ? 3 : 2 + ((rand() * 3) | 0);
      const row = [];
      for (let i = 0; i < n; i++) {
        let type = "fight";
        if (f === 4) type = rand() < 0.55 ? "rest" : rand() < 0.5 ? "shop" : "fight";
        else if (f === 1) type = rand() < 0.7 ? "fight" : "event";
        else if (f > 0) {
          const r = rand();
          type = r < 0.5 ? "fight" : r < 0.7 ? "event" : r < 0.8 ? "shop" : r < 0.87 ? "rest" : "elite";
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
    $("#mapTitle").innerHTML = `<small>Act ${["I", "II", "III"][r.act - 1]}</small>${ransom(act.name)}`;
    $("#mapTitle").setAttribute("aria-label", `Act ${r.act}: ${act.name}`);
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
  const TYPE_NAME = { atk: "Attacks", eth: "Ether", gunk: "Sludge" };
  // 1.5 if the foe is weak to this kind of card, 0.5 if it shrugs it off
  function typeMult(B, type) {
    if (!B || !type) return 1;
    const d = B.foe.def;
    return d.weak === type ? 1.5 : d.resist === type ? 0.5 : 1;
  }
  function dmgValue(base, B, type) {
    // shown and dealt damage per hit, from the player's point of view
    const j = B ? B.jinx : cardJinx();
    let d = base + bonuses(j).atk + (B ? B.p.st.hype || 0 : 0);
    if (B && B.p.st.dazed) d *= 0.75;
    if (B && B.foe.st.pied) d *= 1.5;
    d *= typeMult(B, type);
    return Math.max(0, Math.floor(d));
  }
  // Which order bonus a card has, and whether it is live right now.
  function comboOf(c, B) {
    let label = null, fx = null, on = false;
    if (c.opener) { label = "First card this turn"; fx = c.opener; on = !!B && B.played === 0; }
    else if (c.finisher) { label = "After 2 other cards"; fx = c.finisher; on = !!B && B.played >= 2; }
    else if (c.after) { label = `Right after ${{ atk: "an Attack", blk: "a Guard", eth: "an Ether card", gunk: "a Sludge card", trick: "a Trick" }[c.after[0]]}`; fx = c.after[1]; on = !!B && B.played > 0 && B.lastType === c.after[0]; }
    return fx ? { label, fx, on } : null;
  }
  function effFx(c, B) {
    const k = comboOf(c, B);
    if (!k || !k.on) return c.fx;
    const o = Object.assign({}, c.fx);
    for (const key in k.fx) o[key] = (o[key] || (key === "hits" ? 1 : 0)) + k.fx[key];
    return o;
  }
  function bonusText(fx) {
    const p = [];
    if (fx.dmg) p.push(`+${fx.dmg} damage`);
    if (fx.hits) p.push(`${fx.hits} more hit`);
    if (fx.block) p.push(`+${fx.block} Block`);
    if (fx.heal) p.push(`+${fx.heal} healing`);
    if (fx.gunk) p.push(`+${fx.gunk} Gunk`);
    if (fx.hype) p.push(`+${fx.hype} Hype`);
    if (fx.draw) p.push(`draw ${fx.draw}`);
    if (fx.energy) p.push(`+${fx.energy} energy`);
    return p.join(", ");
  }
  function cardText(id, B) {
    const c = JG.CARDS[id], fx = effFx(c, B), j = B ? B.jinx : cardJinx(), bo = bonuses(j);
    const p = [];
    if (fx.selfdmg) p.push(`Lose ${fx.selfdmg} health.`);
    if (fx.dmg) p.push(`Deal ${dmgValue(fx.dmg, B, c.type)}${fx.hits > 1 ? ` ×${fx.hits}` : ""}.`);
    if (fx.blockHit) p.push(`Deal damage equal to your Block${B ? ` (${B.p.block})` : ""}.`);
    if (fx.piedHit) p.push(`If the foe is Pied, hit again.`);
    if (fx.block) p.push(`Block ${fx.block + bo.blk}.`);
    if (fx.heal) p.push(`Heal ${fx.heal + bo.heal}.`);
    if (fx.gunk) p.push(`Apply ${gunkValue(fx.gunk + bo.gunk, B)} Gunk.`);
    if (fx.doubleGunk) p.push(`Double the foe's Gunk.`);
    if (fx.dazed) p.push(`Daze ${fx.dazed}.`);
    if (fx.pied) p.push(`Pie ${fx.pied}.`);
    if (fx.hype) p.push(`Gain ${fx.hype} Hype.`);
    if (fx.energy) p.push(`Gain ${fx.energy} energy.`);
    if (fx.draw) p.push(`Draw ${fx.draw}.`);
    if (c.exhaust) p.push(`<em>Once per fight.</em>`);
    return p.join(" ");
  }
  function gunkValue(n, B) { const m = typeMult(B, "gunk"); return m > 1 ? Math.ceil(n * m) : m < 1 ? Math.max(1, Math.floor(n * m)) : n; }
  function cardHtml(id, o) {
    o = o || {};
    const c = JG.CARDS[id], T = JG.TYPE_INFO[c.type];
    const rar = ["Starter", "Common", "Uncommon", "Rare"][c.rarity];
    const k = comboOf(c, o.B), live = k && k.on && !!o.B;
    const bonus = k ? `<span class="cbonus${live ? " on" : ""}">${live ? "\u2605 " : ""}${k.label}: ${bonusText(k.fx)}</span>` : "";
    return `<button class="card t-${c.type}${o.dim ? " dim" : ""}${o.wild ? " wild" : ""}${live ? " ready" : ""}" style="--tc:${T.color}" ${o.act ? `data-act="${o.act}"` : ""} ${o.i !== undefined ? `data-i="${o.i}"` : ""} ${o.disabled ? "disabled" : ""}>
      ${o.wild ? `<span class="wildtag">Wild \u00D72</span>` : ""}<span class="cost${o.cost !== undefined && o.cost < c.cost ? " cheap" : ""}">${o.cost !== undefined ? o.cost : c.cost}</span><span class="cname">${esc(c.name)}</span><span class="cart">${T.glyph}</span>
      <span class="ctext">${cardText(id, o.B)}</span>${bonus}<span class="ctype">${T.label} · ${rar}${o.price ? ` · <b>${o.price} Tix</b>` : ""}</span></button>`;
  }
  function rewardCards(kind) {
    const j = runJinx();
    const pool = Object.keys(JG.CARDS).filter((id) => JG.CARDS[id].rarity > 0);
    const weight = (id) => {
      const c = JG.CARDS[id];
      let w = [0, 6, 3, 1][c.rarity] * (kind === "boss" && c.rarity === 3 ? 6 : 1) * (kind === "elite" && c.rarity >= 2 ? 2 : 1);
      if (c.type === "eth") w *= 1 + Math.max(0, j.align) * 2;
      if ((c.type === "trick" || c.type === "blk") && leanForm(j) === "pierrot") w *= 1.7;
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
  function leanForm(j) { return j.align <= -0.33 ? "sludge" : j.align >= 0.33 ? "stardust" : (j.moon || 0) >= 0.33 ? "pierrot" : "harlequin"; }
  // A Pierrot may hold two cards, and a card it held costs 1 less.
  const maxHold = (B) => (B.form === "pierrot" ? 2 : 1);
  function costOf(card, B) {
    const c = JG.CARDS[card.id].cost;
    return B && B.form === "pierrot" && (B.kept || []).includes(card.u) ? Math.max(0, c - 1) : c;
  }
  JG.leanForm = leanForm;
  const scr = (k) => (G.B && G.B.screen && G.B.screen[k]) || { x: 0, y: 0 };
  const runLove = () => (G.run.loveStart === undefined ? runJinx().love : G.run.loveStart);
  const runMood = () => (G.run.moodStart === undefined ? runJinx().mood : G.run.moodStart);
  function improviseChance(j) { return clamp(runLove() / 250, 0.04, 0.4) + (j.trait === "showoff" ? 0.1 : 0); }
  function flubChance() { const m = runMood(); return m < 15 ? 0.25 : m < 35 ? 0.12 : 0; }

  function startBattle(foeId, kind) {
    const r = G.run, j = runJinx(), def = JG.FOES[foeId];
    const hp = Math.round((def.hp[0] + ((rand() * (def.hp[1] - def.hp[0] + 1)) | 0)) * JG.TUNE.hp[r.act - 1]);
    const B = (G.B = {
      act: r.act, kind, jinx: j, form: leanForm(j),
      foe: { id: foeId, def, hp, maxHp: hp, block: 0, st: {}, mi: 0, charge: false, mimic: j },
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
      D.fx.cheer(B, 5);
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
    if (!first && B.tookDmg === 0) addApplause(6, "Flawless!");
    B.tookDmg = 0;
    B.played = 0;
    B.turnDmg = 0;
    B.types = [];
    B.p.block = first && r.charms.includes("bell") ? 6 : 0;
    B.p.energy = 3 + (first && r.charms.includes("glowstick") ? 1 : 0) + (B.hatTrick ? 1 : 0);
    if (B.hatTrick) { D.float(scr("p").x, scr("p").y - 60, "Hat Trick: +1 energy", "#ffd23f"); B.hatTrick = false; }
    if (B.p.st.gunk) {
      const g = B.p.st.gunk;
      hurtPlayer(g, true);
      B.p.st.gunk = g - 1;
      if (B.over) return;
    }
    if (B.form === "stardust" && B.res) {
      B.p.block += B.res * 3;
      const pp = scr("p");
      D.float(pp.x, pp.y - 30, `◆ ${B.res * 3} Starlight`, "#8fe9ff");
    }
    let n = 5 + (r.charms.includes("shoes") ? 1 : 0) - B.hand.length;   // a held card takes the place of a draw
    if (j.trait === "daydream" && rand() < 0.2) { n++; D.float(scr("p").x, scr("p").y - 90, "Daydream: +1 card", "#c9b8ff"); }
    drawCards(n);
    if (j.trait === "daydream" && !first && B.hand.length > 2 && rand() < 0.1) {
      B.disc.push(B.hand.splice((rand() * B.hand.length) | 0, 1)[0]);
      D.float(scr("p").x, scr("p").y - 90, "Forgot a card…", "#9a8fb0");
    }
    B.wild = B.form === "harlequin" && B.hand.length ? pick(B.hand).u : null;
    B.busy = false;
    renderBattle();
    const hd = $("#hand");
    hd.classList.remove("deal");
    void hd.offsetWidth;
    hd.classList.add("deal");
    setTimeout(() => hd.classList.remove("deal"), 700);
  }
  function statusHtml(st, block) {
    const out = [];
    if (block) out.push(`<span class="st st-block" title="Block: stops this much damage until the start of the next turn">◆ ${block}</span>`);
    if (st.hype) out.push(`<span class="st st-hype" title="Hype: +${st.hype} damage on every hit">▲ Hype ${st.hype}</span>`);
    if (st.dazed) out.push(`<span class="st st-dazed" title="Dazed: deals 25% less damage. Lasts ${st.dazed} more turn(s)">✵ Dazed ${st.dazed}</span>`);
    if (st.pied) out.push(`<span class="st st-pied" title="Pied: takes 50% more damage. Lasts ${st.pied} more turn(s)">● Pied ${st.pied}</span>`);
    if (st.gunk) out.push(`<span class="st st-gunk" title="Gunk: loses ${st.gunk} health at the start of each turn, then it drops by 1">☣ Gunk ${st.gunk}</span>`);
    if (st.counter) out.push(`<span class="st st-counter" title="Counter: every hit on it this turn hurts you for ${st.counter}. Guard, Sludge and Tricks are safe.">↩ Counter ${st.counter}</span>`);
    return out.join("");
  }
  function resHtml(B) {
    if (B.form === "sludge") return `<span class="st st-res sludge" title="${esc(JG.FORMS.sludge.desc)}">☣ Corruption ${B.res}${B.res >= 6 ? " · hits add Gunk" : ""}</span>`;
    if (B.form === "stardust") return `<span class="st st-res stardust" title="${esc(JG.FORMS.stardust.desc)}">☾ Starlight ${B.res}/5</span>`;
    if (B.form === "pierrot") return `<span class="st st-res pierrot" title="${esc(JG.FORMS.pierrot.desc)}">☾ Holds 2 · held cards cost 1 less</span>`;
    return `<span class="st st-res harlequin" title="${esc(JG.FORMS.harlequin.desc)}">♠ One Wild card each turn</span>`;
  }
  function foeHitValue(base) {
    const B = G.B;
    let d = Math.round(base * JG.TUNE.dmg[B.act - 1]) + (B.foe.st.hype || 0);
    if (B.foe.st.dazed) d *= 0.75;
    if (B.p.st.pied) d *= 1.5;
    return Math.floor(d);
  }
  function intentHtml(m) {
    const p = [];
    if (m.charge) p.push(`<span class="in in-charge" title="It is winding up a big hit for the turn after">⚡︎ Winds up</span>`);
    if (m.counter) p.push(`<span class="in in-counter" title="Next turn, every hit on it will hurt you back">↩ Counter</span>`);
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
    const fl = B.foe.charge && B.foe.flinchNeed
      ? `<span class="flinch" title="Deal this much damage in one turn and it loses the big hit"><b>Make it flinch:</b> ${Math.min(B.turnDmg || 0, B.foe.flinchNeed)}/${B.foe.flinchNeed} damage this turn<span class="fbar"><i style="width:${Math.min(100, ((B.turnDmg || 0) / B.foe.flinchNeed) * 100)}%"></i></span></span>` : "";
    $("#intent").innerHTML = B.over ? "" : B.foe.stunned ? `<span class="in in-heal">Stunned: it loses its turn</span>` : `<span class="in-label">Next:</span>${intentHtml(B.foe.intent)}${fl}`;
    const d = B.foe.def;
    $("#foeTraits").innerHTML = (d.weak ? `<span class="weak">Weak to ${TYPE_NAME[d.weak]}</span>` : "") + (d.resist ? `<span class="resist">Shrugs off ${TYPE_NAME[d.resist]}</span>` : "");
    const types = B.types || [];
    $("#combo").innerHTML = `<span>Hat Trick</span>` + [0, 1, 2].map((i) => `<i style="${types[i] ? "background:" + JG.TYPE_INFO[types[i]].color : ""}"></i>`).join("");
    $("#combo").classList.toggle("done", types.length >= 3);
    $("#combo").title = "Play 3 different kinds of card in one turn for 1 extra energy next turn";
    $("#energy").innerHTML = `<b>${B.p.energy}</b><small>energy</small>`;
    $("#pileDraw").textContent = `Draw ${B.draw.length}`;
    $("#pileDisc").textContent = `Used ${B.disc.length}`;
    const holds = B.holds || [];
    $("#hand").innerHTML = B.hand.map((c, i) => {
      const held = holds.includes(c.u), cost = costOf(c, B);
      return `<span class="slot${held ? " held" : ""}" style="--i:${i}">${cardHtml(c.id, { i, act: "play", B, cost, wild: c.u === B.wild, dim: cost > B.p.energy, disabled: B.busy || !!B.over })}<button class="holdtab" data-hold="${i}" ${B.busy || B.over ? "disabled" : ""} aria-pressed="${held}" title="Hold this card: it stays in your hand for next turn instead of a new draw">${held ? "Held" : "Hold"}</button></span>`;
    }).join("");
    $("#hand").style.setProperty("--n", B.hand.length);
    B.crowdY = $("#hand").getBoundingClientRect().top + 30;
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
    const h = e.target.closest(".holdtab");
    if (h) { toggleHold(+h.dataset.hold); return; }
    const b = e.target.closest(".card");
    if (!b || b.disabled) return;
    playCard(+b.dataset.i);
  });
  // Keep one card in hand when the turn ends, instead of drawing a new one.
  function toggleHold(i) {
    const B = G.B;
    if (!B || B.busy || B.over || !B.hand[i]) return;
    const u = B.hand[i].u;
    B.holds = B.holds || [];
    if (B.holds.includes(u)) B.holds = B.holds.filter((x) => x !== u);
    else { B.holds.push(u); while (B.holds.length > maxHold(B)) B.holds.shift(); }
    sfx("card");
    renderBattle();
  }
  $("#endTurn").addEventListener("click", () => endTurn());
  $("#showstop").addEventListener("click", () => showstopper());
  addEventListener("keydown", (e) => {
    if (G.mode !== "battle" || !G.B || G.B.busy || G.B.over || !$("#modal").hidden) return;
    if (e.key === "e" || e.key === "E") endTurn();
    if (e.key === "s" || e.key === "S") showstopper();
    const dg = /^Digit([1-9])$/.exec(e.code || "");
    if (dg && e.shiftKey) { toggleHold(+dg[1] - 1); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) playCard(n - 1);
  });

  function gainRunXp(stat, n) { if (stat) G.run.xp[stat] += n; }
  // which attack animation each card uses (stage.js draws them)
  const CARD_STYLE = { pie: "pie", honk: "wave", juggle: "stars", seltzer: "spray", mallet: "smash", chicken: "chicken", chord: "wave", mosh: "dive", dive: "dive",
    feedback: "wave", cannon: "cannon", moonbeam: "beam", haloburst: "beam", mirror: "pie", blackhole: "goo" };
  async function playCard(i) {
    const B = G.B;
    if (!B || B.busy || B.over) return;
    const card = B.hand[i];
    if (!card) return;
    const c = JG.CARDS[card.id];
    const cost = costOf(card, B);
    if (cost > B.p.energy) { toast("Not enough energy. End your turn to get more."); return; }
    const j = B.jinx;
    const half = rand() < flubChance();
    const wild = card.u === B.wild;
    const combo = comboOf(c, B), fx0 = effFx(c, B);   // worked out before this card counts as played
    B.busy = true;
    B.p.energy -= cost;
    if (B.holds) B.holds = B.holds.filter((x) => x !== card.u);
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
      addApplause(1);
      D.float(pp.x, pp.y - 95, `${j.name} phones it in…`, "#9a8fb0");
    } else {
      const variety = B.lastType && B.lastType !== c.type;
      addApplause(3 + (variety ? 3 : 0) + (j.trait === "showoff" ? 2 : 0));
    }
    if (wild) D.float(pp.x, pp.y - 95, "Wild! Twice!", "#ff5fa8", true);
    if (combo && combo.on && !half) { D.float(pp.x, pp.y - 125, "Combo!", "#ffd23f"); addApplause(4); sfx("coin"); }
    B.lastType = c.type;
    B.lastCard = card.id;
    if (!B.types.includes(c.type)) {
      B.types.push(c.type);
      if (B.types.length === 3) {
        // three different kinds of card in one turn
        B.hatTrick = true;
        D.float(pp.x, pp.y - 150, "Hat Trick!", "#ffd23f", true);
        addApplause(8);
        D.fx.cheer(B, 3);
        sfx("buff");
      }
    }
    if (B.form === "stardust" && c.type === "eth") gainRes(1);
    const fx = half ? scaleFx(fx0, 0.5) : fx0;
    for (let rep = 0; rep < (wild ? 2 : 1); rep++) {
      if (!(await applyFx(fx, CARD_STYLE[card.id], c.type))) return;
      if (rep === 0 && wild) await sleep(200);
    }
    B.busy = false;
    renderBattle();
  }
  // Runs one card's effects. Returns false once the fight is over.
  async function applyFx(fx, style, type) {
    const B = G.B, r = G.run, bo = bonuses(B.jinx), pp = scr("p"), fp = scr("f");
    if (fx.selfdmg) { hurtPlayer(fx.selfdmg, true); if (B.over) return false; }
    if (fx.hype) { B.p.st.hype = (B.p.st.hype || 0) + fx.hype; D.float(pp.x, pp.y - 50, `+${fx.hype} Hype`, "#ff8a3d"); sfx("buff"); }
    if (fx.block) { B.p.block += fx.block + bo.blk; D.float(pp.x, pp.y - 30, `◆ ${fx.block + bo.blk}`, "#ffd23f"); sfx("block"); D.fx.guard("p"); }
    if (fx.heal) {
      const h = Math.min(r.maxHp - r.hp, fx.heal + bo.heal);
      r.hp += h;
      D.float(pp.x, pp.y - 70, h ? `+${h}` : "Already full", "#8fe9ff");
      D.burst(pp.x, pp.y, "star", 8, "#8fe9ff");
      D.fx.heal("p");
      sfx("heal");
    }
    renderBattle();
    if (fx.dmg || fx.blockHit) {
      const hits = fx.hits || 1;
      const hit = () => (fx.dmg ? dmgValue(fx.dmg, B, type) : Math.floor(B.p.block * (fx.blockScale || 1) * typeMult(B, type)));
      const m = typeMult(B, type);
      if (m !== 1) D.float(fp.x, fp.y - 95, m > 1 ? "Weak spot!" : "Shrugged off", m > 1 ? "#ffd23f" : "#9a8fb0");
      for (let h = 0; h < hits; h++) {
        await D.fx.attack(style || "punch", "p", B);
        hurtFoe(hit());
        if (B.over) return false;
        sludgeTouch();
        await sleep(hits > 1 ? 90 : 120);
      }
      if (fx.piedHit && B.foe.st.pied) {
        await D.fx.attack(style || "punch", "p", B);
        hurtFoe(hit());
        if (B.over) return false;
        sludgeTouch();
      }
    }
    if (fx.gunk) { await D.fx.attack("goo", "p", B); applyGunk(fx.gunk + bo.gunk); }
    if (fx.pied && !fx.dmg) await D.fx.attack("pie", "p", B);
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
    const m = typeMult(B, "gunk");
    if (m !== 1) D.float(fp.x, fp.y - 95, m > 1 ? "Weak spot!" : "Shrugged off", m > 1 ? "#ffd23f" : "#9a8fb0");
    n = gunkValue(n, B);
    addFoeSt("gunk", n);
    sfx("gunk");
    D.burst(fp.x, fp.y, "drop", 10, "#a6d94a");
    if (B.form === "sludge") gainRes(Math.ceil(n / 2));
  }
  // Sludge Jinxes at 6+ Corruption smear a little Gunk with every hit.
  function sludgeTouch() {
    const B = G.B;
    if (B.form === "sludge" && B.res >= 6 && !B.over) B.foe.st.gunk = (B.foe.st.gunk || 0) + 1;
  }
  function addFoeSt(k, n) {
    const B = G.B, fp = scr("f");
    B.foe.st[k] = (B.foe.st[k] || 0) + n;
    const label = { gunk: "Gunk", dazed: "Dazed", pied: "Pied" }[k];
    D.float(fp.x, fp.y - 60, `${label} +${n}`, { gunk: "#a6d94a", dazed: "#c9b8ff", pied: "#efe6d2" }[k]);
  }
  function hurtFoe(n, isGunk, quiet) {
    const B = G.B, f = B.foe, fp = scr("f");
    let dmg = n;
    B.turnDmg = (B.turnDmg || 0) + (isGunk ? 0 : n);
    if (!isGunk && f.block) { const ab = Math.min(f.block, dmg); f.block -= ab; dmg -= ab; if (ab) D.float(fp.x + 30, fp.y - 20, `◆${ab}`, "#ffd23f"); }
    f.hp -= dmg;
    B.anim.fHurt = G.t;
    D.float(fp.x, fp.y - 40, dmg ? `-${dmg}` : "Blocked", isGunk ? "#a6d94a" : "#ffffff", dmg >= 15);
    D.burst(fp.x, fp.y, isGunk ? "drop" : "star", dmg >= 15 ? 14 : 6, isGunk ? "#a6d94a" : "#ffd23f");
    sfx(dmg ? "hit" : "block");
    if (dmg && !isGunk) D.fx.impact("f", dmg, B);
    if (!isGunk && dmg >= 15) { addApplause(6, "Ooooh!"); D.fx.cheer(B, 3); }
    renderBattle();
    if (f.hp <= 0) { winBattle(); return; }
    // hit it hard enough while it winds up and it loses its nerve
    if (f.charge && f.flinchNeed && B.turnDmg >= f.flinchNeed) {
      f.charge = false;
      f.flinchNeed = 0;
      f.stunned = true;
      f.st.pied = (f.st.pied || 0) + 1;
      D.float(fp.x, fp.y - 110, "It flinched!", "#ffd23f", true);
      addApplause(12);
      D.fx.cheer(B, 4);
      sfx("win");
      renderBattle();
    }
    // a foe in a counter stance hits back
    if (!isGunk && !quiet && f.st.counter && !B.over) {
      D.float(fp.x, fp.y - 80, "Counter!", "#ff8a3d");
      hurtPlayer(f.st.counter);
    }
  }
  function hurtPlayer(n, unblockable) {
    const B = G.B, r = G.run, pp = scr("p");
    let dmg = n;
    if (!unblockable) {
      const dodge = Math.min(0.15, B.jinx.stats.tumble.lv * 0.004);
      if (rand() < dodge) { D.float(pp.x, pp.y - 40, "Dodged!", "#ffd23f"); sfx("dodge"); addApplause(5); return; }
      if (B.p.block) { const ab = Math.min(B.p.block, dmg); B.p.block -= ab; dmg -= ab; if (ab) D.float(pp.x - 30, pp.y - 20, `◆${ab}`, "#ffd23f"); }
    }
    r.hp -= dmg;
    gainRunXp("grit", dmg / 3);
    if (dmg) {
      B.tookDmg += dmg;
      B.anim.pHurt = G.t;
      D.float(pp.x, pp.y - 40, `-${dmg}`, "#ff5fa8", dmg >= 12);
      if (!unblockable) D.fx.impact("p", dmg, B);
      sfx("hit");
      addApplause(-dmg);
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
      addApplause(5);
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
      // it knows better than to hit a foe that will hit back
      if (B.foe.st.counter && (fx.dmg || fx.blockHit)) fx = { block: 5 };
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
    const pp = scr("p");
    sfx("win");
    for (const s of JG.STATS) gainRunXp(s, 2);
    renderBattle();
    D.fx.cheer(B, 10);
    await D.fx.showstopper(B.form, B);
    D.burst(pp.x, pp.y - 30, "confetti", 50, "multi");
    if (B.form === "sludge") {
      const c = B.res;
      hurtFoe(8 + Math.floor(c * 1.5) + bo.atk * 2, false, true);
      if (B.over) return;
      applyGunk(6 + bo.gunk);
      B.res = 0;
    } else if (B.form === "stardust") {
      const s = B.res;
      hurtFoe(6 + s * 4 + bo.atk * 2, false, true);
      if (B.over) return;
      const h = Math.min(r.maxHp - r.hp, 4 + s * 3 + bo.heal);
      r.hp += h;
      if (h) D.float(pp.x, pp.y - 70, `+${h}`, "#8fe9ff", true);
      D.burst(pp.x, pp.y, "star", 20, "#8fe9ff");
      delete B.p.st.dazed; delete B.p.st.pied; delete B.p.st.gunk;
      sfx("heal");
      B.res = 0;
    } else if (B.form === "pierrot") {
      for (let h = 0; h < 3; h++) {
        hurtFoe(dmgValue(5, B, null) + bo.atk, false, true);
        if (B.over) return;
        await sleep(160);
      }
      addFoeSt("dazed", 2);
      B.p.block += 10 + bo.blk;
      D.float(pp.x, pp.y - 30, `◆ ${10 + bo.blk}`, "#ffd23f");
      D.fx.guard("p");
      sfx("block");
    } else {
      B.disc.push(...B.hand);
      B.hand = [];
      drawCards(5);
      B.p.energy += 1;
      B.p.st.hype = (B.p.st.hype || 0) + 1;
      B.wild = B.hand.length ? pick(B.hand).u : null;
      D.float(pp.x, pp.y - 70, "New hand, +1 energy, +1 Hype", "#ff5fa8");
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
    const holds = B.holds || [];
    const kept = B.hand.filter((c) => holds.includes(c.u));
    B.disc.push(...B.hand.filter((c) => !holds.includes(c.u)));
    B.hand = kept;
    B.kept = kept.map((c) => c.u);
    B.holds = [];
    B.wild = null;
    for (const k of ["dazed", "pied"]) if (B.p.st[k]) B.p.st[k]--;
    renderBattle();
    await sleep(300);
    await jinxActsAlone();
    if (B.over) return;
    const f = B.foe, fp = scr("f");
    f.block = 0;
    f.st.counter = 0;
    if (f.st.gunk) {
      const g = f.st.gunk;
      hurtFoe(g, true);
      f.st.gunk = g - 1;
      if (B.form === "sludge") gainRes(g);
      if (B.over) return;
      await sleep(350);
    }
    if (f.stunned) {
      // it flinched: the big hit is lost, and it starts its routine over after it
      f.stunned = false;
      D.float(fp.x, fp.y - 60, "Stunned", "#c9b8ff");
      const moves = f.def.moves;
      let k = f.mi;
      for (let i = 0; i < moves.length && !moves[k].atk; i++) k = (k + 1) % moves.length;
      f.mi = (k + 1) % moves.length;
      f.intent = moves[f.mi];
      for (const q of ["dazed", "pied"]) if (f.st[q]) f.st[q]--;
      await sleep(500);
      startTurn(false);
      return;
    }
    const m = f.intent;
    if (m.charge) { f.charge = true; f.flinchNeed = Math.round((m.flinch || 0) * JG.TUNE.hp[B.act - 1]); D.float(fp.x, fp.y - 60, "Winding up…", "#ffd23f"); sfx("buff"); }
    if (m.counter) { f.st.counter = Math.round(m.counter * JG.TUNE.dmg[B.act - 1]); D.float(fp.x, fp.y - 45, "Counter stance", "#ff8a3d"); sfx("block"); }
    if (m.blk) { f.block += m.blk; D.float(fp.x, fp.y - 30, `◆ ${m.blk}`, "#ffd23f"); sfx("block"); D.fx.guard("f"); }
    if (m.heal) { const h = Math.min(f.maxHp - f.hp, m.heal); f.hp += h; D.float(fp.x, fp.y - 60, `+${h}`, "#8fe9ff"); sfx("heal"); D.fx.heal("f"); }
    if (m.hype) { f.st.hype = (f.st.hype || 0) + m.hype; D.float(fp.x, fp.y - 80, `+${m.hype} Hype`, "#ff8a3d"); sfx("buff"); }
    if (m.heckle) { D.fx.heckle(B); addApplause(-m.heckle, `Boo! -${m.heckle} Applause`); sfx("debuff"); }
    renderBattle();
    if (m.atk) {
      for (let h = 0; h < (m.n || 1); h++) {
        await sleep(200);
        await D.fx.attack(f.def.atk || "punch", "f", B);
        hurtPlayer(foeHitValue(m.atk));
        if (B.over) return;
      }
      f.charge = false;
      f.flinchNeed = 0;
    }
    const pp = scr("p");
    if (m.dazed) { B.p.st.dazed = (B.p.st.dazed || 0) + m.dazed; D.float(pp.x, pp.y - 60, `Dazed +${m.dazed}`, "#c9b8ff"); sfx("debuff"); }
    if (m.pied) { B.p.st.pied = (B.p.st.pied || 0) + m.pied; D.float(pp.x, pp.y - 75, `Pied +${m.pied}`, "#efe6d2"); sfx("debuff"); }
    if (m.gunk) { await D.fx.attack("goo", "f", B); B.p.st.gunk = (B.p.st.gunk || 0) + m.gunk; D.float(pp.x, pp.y - 90, `Gunk +${m.gunk}`, "#a6d94a"); sfx("gunk"); }
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
    D.fx.cheer(B, 7);
    renderBattle();
    setTimeout(() => showRewards(B.kind), JG.fast ? 0 : 1100);
  }
  function loseBattle() {
    const B = G.B;
    if (B.over) return;
    B.over = "lose";
    B.busy = true;
    sfx("lose");
    renderBattle();
    setTimeout(() => endRun(false), JG.fast ? 0 : 1600);
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
    // a Headliner or a Ringmaster sometimes leaves a strange egg behind: a Hollow or a Lantern
    if (kind !== "fight" && rand() < (kind === "boss" ? 0.4 : 0.25)) {
      const name = pick(["Hollow", "Lantern"]);
      r.eggs = r.eggs || [];
      r.eggs.push(name);
      lines.push(`<li><span class="glyph" style="color:#bfe0ff">\u2B2E</span><b>A strange egg</b> <small>(still warm; it goes to the garden)</small></li>`);
    }
    if (kind === "boss") {
      const h = Math.round(r.maxHp * JG.TUNE.bossHeal);
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
      else { j.mood = clamp(j.mood + 15, 0, 100); j.moon = clamp((j.moon || 0) + 0.12, -1, 1); out = "The song changes to one you haven't heard since middle school. Nothing else happens. You feel ok, though."; sfx("bell"); }
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
    // strange eggs come home either way; if the garden is full they are sold for Tix
    let eggsHome = 0, eggsSold = 0;
    for (const name of r.eggs || []) {
      if (s.jinxes.length < 6) { s.jinxes.push(makeEgg({ hatch: 45, parts: Object.assign({}, KINDS[name] || KINDS.Hollow) })); eggsHome++; }
      else { tix += 40; eggsSold++; }
    }
    s.tix += tix;
    j.age++;
    j.belly = clamp(j.belly - 25, 0, 100);
    j.mood = clamp(j.mood + (won ? 25 : -25), 0, 100);
    j.love = clamp(j.love + (won ? 8 : 3), 0, 100);
    s.records.runs++;
    if (won) s.records.wins++;
    const topper = won && !s.hats.topper;
    if (topper) grantHat("topper");
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
      <p>${won ? "The whole cosmos is clapping. Every snack in the bag comes home, plus a 60 Tix bonus." + (topper ? " A Ringmaster dropped a Tiny Topper on the way out: it's in the hat box." : "") : `They wobble home sad and a bit sticky.${lost ? ` ${lost} thing${lost > 1 ? "s" : ""} fell out of the bag on the way.` : ""}`}</p>
      <div class="cols"><div><h3>What they learned</h3><ul class="loot">${gl}</ul></div>
      <div><h3>Brought home</h3><ul class="loot"><li><span class="glyph" style="color:#ffd23f">✂</span><b>${tix}</b> Tix</li>${lootHtml}${eggsHome ? `<li><span class="glyph" style="color:#bfe0ff">\u2B2E</span>${eggsHome > 1 ? eggsHome + " strange eggs" : "A strange egg"}, now in the garden</li>` : ""}${eggsSold ? `<li><small>The garden was full, so ${eggsSold > 1 ? eggsSold + " strange eggs were" : "a strange egg was"} sold for 40 Tix each.</small></li>` : ""}</ul></div></div>
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
      <p>${j.align > 0.33 ? "All that stardust has turned them pale and gold." : j.align < -0.33 ? "All that sludge has stained them green, and they drip a little." : (j.moon || 0) >= 0.33 ? "They leaned Moonlit and grew up in black and white, with a painted tear." : "They stayed right in the middle and grew up in red, black and diamonds."} They now start runs with an extra trick for their best stat.</p>
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
      const inherit = { name: j.name, align: j.align * 0.5, moon: (j.moon || 0) * 0.5, gen: j.gen + 1, stats: {}, trait: j.trait, grades: j.grades, parts: partsOf(j) };
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
  for (const el of document.querySelectorAll(".logo, .hud-logo")) { el.setAttribute("aria-label", el.textContent); el.innerHTML = ransom(el.textContent); }
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
    if (a === "college") openCollege();
    if (a === "whistle") whistle();
    if (a === "talent") openTalent();
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
    if (JG.fast) { requestAnimationFrame(frame); return; }
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
  JG.debug = { kindName, makeJinx, makeEgg, openTalent, talentShow, cheer, startDuet, grantHat, toggleHold, G, startBattle, endRun, enterMap, hatchEgg, persist, playCard, endTurn, showstopper, effFx, dmgValue, foeHitValue, bonuses, typeMult, gunkValue };
})();
