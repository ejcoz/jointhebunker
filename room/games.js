// Join the Bunker: five short mini games. Each draws into a 300x360 SVG and calls end(coins, line).
(() => {
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, html = "") => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; };
const rnd = (a, b) => a + Math.random() * (b - a), pickOne = a => a[Math.floor(Math.random() * a.length)];
let AC = null;
const beep = (f, d = .09, type = "square", v = .05) => { try { if (window.BK_MUTE) return; AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} };
const floatText = (svg, x, y, t, c = "#ffc23a") => { const e = el("text", { x, y, "text-anchor": "middle", class: "pop", style: `font:400 16px Anton,sans-serif;fill:${c}` }); e.textContent = t; svg.appendChild(e); setTimeout(() => e.remove(), 420); };
const loop = (g, fn) => { let last = performance.now(); const f = now => { if (g.over) return; const dt = Math.min(.05, (now - last) / 1000); last = now; fn(dt); if (!g.over) requestAnimationFrame(f); }; requestAnimationFrame(f); };

const GAMES = [];

// ---------------- 1. Patch the Pipes (reflex) ----------------
GAMES.push({ id: "pipes", n: "Patch the Pipes", d: "Leaks pop. Tap them before the room floods. Gold leaks are worth 3.", col: "#3aa0ff",
start(h) {
  const S = h.svg, J = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) J.push([60 + c * 90, 52 + r * 84]);
  let b = `<rect width="300" height="360" fill="#2b2820"/>`;
  for (let r = 0; r < 4; r++) b += `<rect x="20" y="${46 + r * 84}" width="260" height="12" fill="#5e5a48" stroke="#121210"/>`;
  for (let c = 0; c < 3; c++) b += `<rect x="${54 + c * 90}" y="16" width="12" height="330" fill="#4b4838" stroke="#121210"/>`;
  J.forEach(([x, y]) => b += `<circle cx="${x}" cy="${y}" r="13" fill="#6e6a56" stroke="#121210" stroke-width="2"/>`);
  S.innerHTML = b + `<g id="lk"></g>`;
  const g = { t: 35, flood: 0, score: 0, combo: 0, live: new Map(), next: .4, over: false };
  const lk = S.querySelector("#lk");
  const spawn = () => {
    const free = J.map((_, i) => i).filter(i => !g.live.has(i)); if (!free.length) return;
    const i = pickOne(free), [x, y] = J[i], gold = Math.random() < .12;
    const n = el("g", { class: "leak" }); n.dataset.i = i;
    n.innerHTML = `<circle cx="${x}" cy="${y}" r="32" fill="transparent"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${gold ? "#ffc23a" : "#3aa0ff"}" stroke-width="3.5"/>` + [-12, 0, 12].map(dx => `<circle class="spray" cx="${x + dx}" cy="${y + 10}" r="3" fill="${gold ? "#ffe08a" : "#7cc4ff"}" style="animation-delay:${Math.random() * .5}s"/>`).join("");
    lk.appendChild(n); g.live.set(i, { n, gold, age: 0, life: gold ? 1.3 : 9 });
  };
  S.onpointerdown = e => {
    const n = e.target.closest(".leak"); if (!n || g.over) return;
    const i = +n.dataset.i, L = g.live.get(i), [x, y] = J[i]; n.remove(); g.live.delete(i);
    g.combo++; const pts = (L.gold ? 3 : 1) + (g.combo >= 10 ? 1 : 0); g.score += pts; beep(L.gold ? 880 : 520, .06);
    floatText(S, x, y - 18, "+" + pts + (g.combo >= 10 ? " COMBO" : ""));
  };
  loop(g, dt => {
    g.t -= dt; const pace = 1 - .6 * (1 - g.t / 35);
    g.next -= dt; if (g.next <= 0) { spawn(); g.next = pace * rnd(.45, 1); }
    for (const [i, L] of g.live) { L.age += dt; if (L.gold && L.age > L.life) { L.n.remove(); g.live.delete(i); } }
    const wet = [...g.live.values()].filter(L => !L.gold).length; if (wet >= 3) g.combo = 0;
    g.flood += dt * wet * 2.2; h.bar(g.flood); h.hud(`${Math.ceil(Math.max(0, g.t))}s · ${g.score} pts`);
    if (g.t <= 0 || g.flood >= 100) { g.over = true; h.end(Math.min(60, Math.round(g.score * .45)), g.flood >= 100 ? "The room flooded." : "The pipes are holding."); }
  });
  return () => g.over = true;
}});

// ---------------- 2. Keep the Lights On (timing) ----------------
GAMES.push({ id: "gen", n: "Keep the Lights On", d: "Tap when the needle hits the green. Dead centre is a perfect. Three misses and the lights go out.", col: "#9cf04a",
start(h) {
  const S = h.svg;
  S.innerHTML = `<rect width="300" height="360" fill="#15130f"/><rect id="glow" width="300" height="360" fill="#ffd27a" opacity=".12"/>
  <g transform="translate(150 70)">${[...Array(9)].map((_, k) => `<g transform="translate(${-120 + k * 30} 0)"><path d="M-8 0 h16 l-4 14 h-8z" fill="#2e2c24"/><circle class="bulb" cy="20" r="8" fill="#ffd27a"/></g>`).join("")}</g>
  <rect x="30" y="170" width="240" height="44" rx="8" fill="#2e2c24" stroke="#121210" stroke-width="2"/><rect id="zone" x="120" y="174" width="60" height="36" fill="#3fae49"/><rect id="perf" x="146" y="174" width="8" height="36" fill="#9cf04a"/>
  <rect id="needle" x="30" y="160" width="5" height="64" rx="2" fill="#ffc23a" stroke="#121210"/>
  <text x="150" y="270" text-anchor="middle" style="font:400 18px Anton,sans-serif;fill:#b3aa90;letter-spacing:.1em">TAP ANYWHERE</text>
  <g id="lives" transform="translate(150 310)"></g>`;
  const g = { x: 0, dir: 1, speed: 120, zx: 120, zw: 60, score: 0, miss: 0, streak: 0, over: false, t: 0 };
  const Z = S.querySelector("#zone"), P = S.querySelector("#perf"), N = S.querySelector("#needle"), Lv = S.querySelector("#lives"), glow = S.querySelector("#glow");
  const drawLives = () => Lv.innerHTML = [0, 1, 2].map(k => `<circle cx="${(k - 1) * 30}" r="9" fill="${k < 3 - g.miss ? "#ffd27a" : "#3a372c"}" stroke="#121210"/>`).join("");
  const newZone = () => { g.zw = Math.max(18, 60 - g.score * 1.4); g.zx = rnd(34, 266 - g.zw); Z.setAttribute("x", g.zx); Z.setAttribute("width", g.zw); P.setAttribute("x", g.zx + g.zw / 2 - 4); };
  drawLives(); newZone();
  S.onpointerdown = () => {
    if (g.over) return; const nx = 30 + g.x;
    if (nx + 2.5 >= g.zx && nx + 2.5 <= g.zx + g.zw) {
      const perfect = Math.abs(nx + 2.5 - (g.zx + g.zw / 2)) <= 5; g.streak++; const pts = perfect ? 3 : 1; g.score += pts;
      beep(perfect ? 990 : 660, .07); floatText(S, nx, 150, perfect ? "PERFECT +3" : "+1", perfect ? "#9cf04a" : "#ffc23a");
      g.speed = Math.min(420, g.speed + 9); newZone(); glow.setAttribute("opacity", ".22");
    } else {
      g.miss++; g.streak = 0; beep(140, .25, "sawtooth", .06); floatText(S, nx, 150, "MISS", "#ff3b3b"); drawLives();
      S.querySelectorAll(".bulb").forEach((b, k) => { if (k < g.miss * 3) b.setAttribute("fill", "#3a372c"); }); glow.setAttribute("opacity", "0");
      if (g.miss >= 3) { g.over = true; h.end(g.score, "The lights went out."); }
    }
  };
  loop(g, dt => {
    g.t += dt; g.x += g.dir * g.speed * dt; if (g.x > 235) { g.x = 235; g.dir = -1; } if (g.x < 0) { g.x = 0; g.dir = 1; }
    N.setAttribute("x", 30 + g.x); h.hud(`${g.score} pts · streak ${g.streak}`); h.bar(0);
    glow.setAttribute("opacity", (+glow.getAttribute("opacity") * .97 + .12 * .03).toFixed(3));
    if (g.t > 60) { g.over = true; h.end(g.score, "The generator's humming."); }
  });
  return () => g.over = true;
}});

// ---------------- 3. Pantry Sort (sorting) ----------------
const ICONS = {
  FOOD: [
    `<rect x="-11" y="-14" width="22" height="28" rx="3" fill="#c5221f" stroke="#121210"/><rect x="-11" y="-6" width="22" height="12" fill="#f1ece0"/><text y="4" text-anchor="middle" style="font:400 8px Anton,sans-serif;fill:#c5221f">BEANS</text>`,
    `<path d="M-16 4 q0 -18 16 -18 q16 0 16 18 v8 h-32z" fill="#d89a4a" stroke="#121210"/><path d="M-8 -6 l4 4 M2 -8 l4 4" stroke="#a8641a" stroke-width="2"/>`,
    `<circle r="13" fill="#e8432e" stroke="#121210"/><path d="M0 -13 q2 -6 6 -7" stroke="#5a3a1a" stroke-width="2" fill="none"/><path d="M2 -14 q8 -6 10 0 q-6 3 -10 0z" fill="#3fae49"/>`,
    `<path d="M-4 -16 l8 0 l6 30 h-20z" fill="#ff8c2a" stroke="#121210"/><path d="M0 -16 q-6 -8 -2 -12 M0 -16 q6 -8 4 -12" stroke="#3fae49" stroke-width="3" fill="none"/>`],
  MEDICAL: [
    `<rect x="-16" y="-12" width="32" height="24" rx="4" fill="#f1ece0" stroke="#121210"/><rect x="-3" y="-8" width="6" height="16" fill="#c5221f"/><rect x="-8" y="-3" width="16" height="6" fill="#c5221f"/>`,
    `<rect x="-9" y="-10" width="18" height="24" rx="3" fill="#ff8c2a" opacity=".85" stroke="#121210"/><rect x="-11" y="-16" width="22" height="7" rx="2" fill="#f1ece0" stroke="#121210"/>`,
    `<rect x="-16" y="-6" width="32" height="12" rx="6" fill="#f6c38a" stroke="#121210" transform="rotate(-25)"/><rect x="-5" y="-4" width="10" height="8" fill="#e8dcc0" transform="rotate(-25)"/>`,
    `<rect x="-3" y="-17" width="6" height="28" rx="3" fill="#f1ece0" stroke="#121210"/><circle cy="12" r="5" fill="#c5221f" stroke="#121210"/>`],
  TOOLS: [
    `<path d="M-4 -18 a9 9 0 1 0 8 0 v7 h-8z" fill="#9a9a9a" stroke="#121210"/><rect x="-3.5" y="-4" width="7" height="22" rx="2" fill="#9a9a9a" stroke="#121210"/>`,
    `<rect x="-8" y="-14" width="16" height="28" rx="3" fill="#2e2c24" stroke="#121210"/><rect x="-4" y="-18" width="8" height="5" fill="#9a9a9a"/><rect x="-8" y="-6" width="16" height="10" fill="#f2c230"/>`,
    `<rect x="-6" y="-4" width="12" height="20" rx="3" fill="#2e2c24" stroke="#121210"/><path d="M-10 -4 h20 l-4 -12 h-12z" fill="#9a9a9a" stroke="#121210"/><circle cy="-10" r="4" fill="#ffd27a"/>`,
    `<circle r="13" fill="#9a9a9a" stroke="#121210"/><circle r="6" fill="#2b2820" stroke="#121210"/>`]
};
const BIN = [["FOOD", "#e8432e", 50], ["MEDICAL", "#f1ece0", 150], ["TOOLS", "#9a9a9a", 250]];
GAMES.push({ id: "pantry", n: "Pantry Sort", d: "Supplies come down the chute. Tap the right bin: food, medical or tools. Three wrong and the cook takes over.", col: "#e8432e",
start(h) {
  const S = h.svg;
  S.innerHTML = `<rect width="300" height="360" fill="#2b2820"/><rect x="118" y="0" width="64" height="250" fill="#3a372c"/>${[...Array(12)].map((_, k) => `<rect class="belt" x="118" y="${k * 22}" width="64" height="2" fill="#4b4838"/>`).join("")}
  <g id="items"></g>` + BIN.map(([n, c, x]) => `<g class="bin" data-b="${n}"><rect x="${x - 46}" y="262" width="92" height="90" rx="10" fill="#1b1a15" stroke="${c}" stroke-width="3"/><text x="${x}" y="340" text-anchor="middle" style="font:400 15px Anton,sans-serif;fill:${c};letter-spacing:.06em">${n}</text><g transform="translate(${x} 296) scale(.9)">${ICONS[n][0]}</g></g>`).join("") + `<g id="lives" transform="translate(150 18)"></g>`;
  const g = { score: 0, wrong: 0, items: [], next: .2, speed: 70, over: false, t: 0 };
  const G = S.querySelector("#items"), Lv = S.querySelector("#lives");
  const drawLives = () => Lv.innerHTML = [0, 1, 2].map(k => `<path transform="translate(${(k - 1) * 24} 0)" d="M0 6 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5z" fill="${k < 3 - g.wrong ? "#e8432e" : "#3a372c"}"/>`).join("");
  drawLives();
  const spawn = () => { const kind = pickOne(["FOOD", "MEDICAL", "TOOLS"]), n = el("g", {}, `<rect x="-24" y="-24" width="48" height="48" rx="8" fill="#e8dcc0" stroke="#121210" stroke-width="1.5"/>${pickOne(ICONS[kind])}`); G.appendChild(n); g.items.push({ n, kind, y: -30 }); };
  const fail = (why) => { g.wrong++; drawLives(); beep(150, .25, "sawtooth", .06); floatText(S, 150, 240, why, "#ff3b3b"); if (g.wrong >= 3) { g.over = true; h.end(g.score, "The pantry's a mess."); } };
  S.onpointerdown = e => {
    const b = e.target.closest(".bin"); if (!b || g.over) return; const it = g.items[0]; if (!it) return;
    it.n.remove(); g.items.shift();
    if (it.kind === b.dataset.b) { g.score++; beep(600 + Math.min(g.score, 30) * 12, .06); floatText(S, BIN.find(x => x[0] === b.dataset.b)[2], 256, "+1"); g.speed += 4; }
    else fail("WRONG BIN");
  };
  loop(g, dt => {
    g.t += dt; g.next -= dt; if (g.next <= 0 && g.items.length < 3) { spawn(); g.next = Math.max(.7, 2.1 - g.t * .03); }
    g.items.forEach((it, k) => { const target = 205 - k * 60; it.y = Math.min(target + 30, it.y + g.speed * dt); it.n.setAttribute("transform", `translate(150 ${it.y.toFixed(1)})`); });
    const f = g.items[0]; if (f && f.y >= 230) { f.n.remove(); g.items.shift(); fail("TOO SLOW"); }
    S.querySelectorAll(".belt").forEach((b, k) => b.setAttribute("y", ((k * 22 + g.t * g.speed) % 264 - 12).toFixed(1)));
    h.hud(`${g.score} sorted`); h.bar(0);
    if (g.t > 75) { g.over = true; h.end(g.score + 5, "Shift over. +5 bonus."); }
  });
  return () => g.over = true;
}});

// ---------------- 4. Shaft Drop (dodger) ----------------
GAMES.push({ id: "shaft", n: "Shaft Drop", d: "Ride the lift from B1 to B7. Drag to dodge falling junk and grab coins. Make it to the bottom for a bonus.", col: "#ffc23a",
start(h) {
  const S = h.svg;
  S.innerHTML = `<rect width="300" height="360" fill="#1b1a15"/><g id="walls"></g><g id="objs"></g>
  <g id="lift"><rect x="-26" y="-14" width="52" height="28" rx="3" fill="#8a8670" stroke="#121210" stroke-width="2"/><path d="M-26 -14 l52 28 M26 -14 l-52 28" stroke="#5e5a48" stroke-width="2"/><rect x="-26" y="-18" width="52" height="5" fill="#f2c230"/><path d="M0 -18 v-500" stroke="#3a372c" stroke-width="2"/></g>
  <text id="depth" x="290" y="28" text-anchor="end" style="font:400 22px Anton,sans-serif;fill:#ffc23a">B1</text>`;
  const W = S.querySelector("#walls"); W.innerHTML = [...Array(10)].map((_, k) => `<rect class="w" x="0" y="${k * 40}" width="14" height="38" fill="#3a372c"/><rect class="w" x="286" y="${k * 40}" width="14" height="38" fill="#3a372c"/>`).join("");
  const O = S.querySelector("#objs"), Lf = S.querySelector("#lift"), D = S.querySelector("#depth");
  const g = { x: 150, tx: 150, objs: [], t: 0, hits: 0, coins: 0, next: .5, over: false, inv: 0, sp: 140 };
  const pt = e => { const r = S.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 300; };
  S.onpointerdown = e => { g.tx = pt(e); S.setPointerCapture && S.setPointerCapture(e.pointerId); };
  S.onpointermove = e => { if (e.buttons || e.pointerType === "touch") g.tx = pt(e); };
  const spawn = () => {
    const coin = Math.random() < .42, x = rnd(34, 266);
    const n = el("g", {}, coin ? `<circle r="9" fill="#ffc23a" stroke="#6b4a12" stroke-width="2"/><text y="4" text-anchor="middle" style="font:400 10px Anton,sans-serif;fill:#6b4a12">B</text>`
      : pickOne([`<rect x="-30" y="-7" width="60" height="14" rx="3" fill="#5e5a48" stroke="#121210" stroke-width="2"/>`, `<path d="M-16 8 l6 -18 l14 -4 l12 10 l-4 12z" fill="#6e6a56" stroke="#121210" stroke-width="2"/>`, `<rect x="-12" y="-12" width="24" height="24" fill="#8a5a2b" stroke="#121210" stroke-width="2"/><path d="M-12 -12 l24 24 M12 -12 l-24 24" stroke="#5a3a1a"/>`]));
    O.appendChild(n); g.objs.push({ n, x, y: -20, coin, w: coin ? 10 : 24, v: rnd(.9, 1.3) });
  };
  loop(g, dt => {
    g.t += dt; const lvl = Math.min(7, 1 + Math.floor(g.t / 8)); D.textContent = "B" + lvl; g.sp = 140 + g.t * 4;
    g.x += (Math.max(40, Math.min(260, g.tx)) - g.x) * Math.min(1, dt * 12); Lf.setAttribute("transform", `translate(${g.x.toFixed(1)} 320)`);
    Lf.setAttribute("opacity", g.inv > 0 && Math.floor(g.inv * 10) % 2 ? .4 : 1); g.inv = Math.max(0, g.inv - dt);
    S.querySelectorAll(".w").forEach((w, k) => w.setAttribute("y", (((Math.floor(k / 2) * 40 - g.t * g.sp) % 400 + 400) % 400 - 40).toFixed(1)));
    g.next -= dt; if (g.next <= 0) { spawn(); g.next = Math.max(.28, .8 - g.t * .01); }
    for (const o of [...g.objs]) {
      o.y += g.sp * o.v * dt; o.n.setAttribute("transform", `translate(${o.x.toFixed(1)} ${o.y.toFixed(1)})`);
      if (o.y > 300 && o.y < 340 && Math.abs(o.x - g.x) < 26 + o.w) {
        o.n.remove(); g.objs.splice(g.objs.indexOf(o), 1);
        if (o.coin) { g.coins++; beep(760, .05); floatText(S, o.x, 296, "+1"); }
        else if (g.inv <= 0) { g.hits++; g.inv = 1; beep(120, .3, "sawtooth", .07); floatText(S, g.x, 290, "OUCH", "#ff3b3b"); if (g.hits >= 3) { g.over = true; h.end(g.coins, `Stuck at B${lvl}.`); return; } }
      } else if (o.y > 380) { o.n.remove(); g.objs.splice(g.objs.indexOf(o), 1); }
    }
    h.hud(`${g.coins} coins · ${3 - g.hits} ♥`); h.bar(Math.min(100, g.t / 56 * 100));
    if (g.t >= 56) { g.over = true; h.end(g.coins + 15, "You reached B7. +15 bonus."); }
  });
  return () => g.over = true;
}});

// ---------------- 5. Hatch Watch (memory) ----------------
GAMES.push({ id: "hatch", n: "Hatch Watch", d: "Something knocks on the hatch. Watch the bolts, then knock the pattern back. It gets longer every round.", col: "#ff3b3b",
start(h) {
  const S = h.svg, BOLT = [[150, 92, "#ff3b3b", 330], [238, 180, "#ffc23a", 392], [150, 268, "#3aa0ff", 494], [62, 180, "#9cf04a", 587]];
  S.innerHTML = `<rect width="300" height="360" fill="#120b0b"/><circle cx="150" cy="180" r="118" fill="#2e2c24" stroke="#121210" stroke-width="4"/><circle cx="150" cy="180" r="100" fill="#3a1c1c" stroke="#5e5a48" stroke-width="3"/>
  <g transform="translate(150 180)"><circle r="34" fill="none" stroke="#8a2a22" stroke-width="7"/><path d="M-34 0 H34 M0 -34 V34" stroke="#8a2a22" stroke-width="6"/><circle r="7" fill="#8a2a22"/></g>` +
    BOLT.map(([x, y, c], i) => `<g class="bolt" data-i="${i}"><circle cx="${x}" cy="${y}" r="34" fill="transparent"/><circle class="bc" cx="${x}" cy="${y}" r="24" fill="#5e5a48" stroke="#121210" stroke-width="3"/><circle cx="${x}" cy="${y}" r="9" fill="#2e2c24"/></g>`).join("") +
    `<text id="msg" x="150" y="345" text-anchor="middle" style="font:400 16px Anton,sans-serif;fill:#b3aa90;letter-spacing:.1em">WATCH</text>`;
  const g = { seq: [], pos: 0, round: 0, busy: true, over: false };
  const M = S.querySelector("#msg"), bc = [...S.querySelectorAll(".bc")];
  const flash = (i, ms = 380) => { bc[i].setAttribute("fill", BOLT[i][2]); beep(BOLT[i][3], ms / 1000 * .8, "triangle", .08); setTimeout(() => bc[i].setAttribute("fill", "#5e5a48"), ms); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const next = async () => {
    g.round++; g.seq.push(Math.floor(Math.random() * 4)); g.pos = 0; g.busy = true; M.textContent = `ROUND ${g.round} · WATCH`; h.hud(`round ${g.round}`); h.bar(0);
    await wait(650); const sp = Math.max(240, 520 - g.round * 22);
    for (const i of g.seq) { if (g.over) return; flash(i, sp * .75); await wait(sp); }
    g.busy = false; M.textContent = "YOUR TURN";
  };
  S.onpointerdown = e => {
    const b = e.target.closest(".bolt"); if (!b || g.busy || g.over) return; const i = +b.dataset.i; flash(i, 220);
    if (i !== g.seq[g.pos]) { g.over = true; beep(110, .5, "sawtooth", .08); M.textContent = "WRONG KNOCK"; const done = g.round - 1; setTimeout(() => h.end(done * 4, `You held the watch for ${done} round${done === 1 ? "" : "s"}.`), 700); return; }
    g.pos++; if (g.pos === g.seq.length) { g.busy = true; M.textContent = "HELD"; setTimeout(next, 500); }
  };
  next();
  return () => g.over = true;
}});

window.BK_GAMES = GAMES;
})();
