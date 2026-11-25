// Join the Bunker: your room. Saved on this device. Coins come only from the games.
(() => {
const PETS = window.BK_PETS || {}, { SLOTS, CATS, ITEMS, BY, star } = window.BK_ITEMS, GAMES = window.BK_GAMES;
const LEVELS = [["B1","Entry and decontamination",1,10000],["B2","Command and medical",10001,20000],["B3","The garden",20001,30000],["B4","Commons and pantry",30001,40000],["B5","Main dormitory",40001,70000],["B6","The armory",70001,85000],["B7","Engineering",85001,100000]];
const JOB = {B1:"Your gas mask hangs by the door. Decontamination drills at dawn.",B2:"Your med kit is on the hook. Someone always needs a doctor.",B3:"Your watering can is by the bunk. The grow-lights never really switch off.",B4:"Your pot and ladle are on the hook. Dinner is at 18:00, sharp.",B5:"Your clock is on the shelf. Lights out at 22:00.",B6:"Your helmet is on the hook, boots by the door. Night watch starts at midnight.",B7:"Your wrench is on the hook. You can feel the generators through the floor."};
const $ = id => document.getElementById(id), fmt = n => n.toLocaleString("en-US");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 };
const ev = n => { try { window.gcEv && window.gcEv(n) } catch (e) {} };
// Playtime: anonymous bands only (no handles). Visible time is counted per visit-segment and sent when the page is hidden.
let vis = document.visibilityState === "visible" ? Date.now() : 0, acc = 0, gamesRun = 0, coinsVisit = 0;
const cb = n => n < 1 ? "0" : n < 20 ? "1-19" : n < 50 ? "20-49" : n < 100 ? "50-99" : n < 200 ? "100-199" : "200plus";
const tb = s => s < 30 ? "under-30s" : s < 60 ? "30-60s" : s < 180 ? "1-3m" : s < 600 ? "3-10m" : "10m-plus";
const gb = s => s < 10 ? "0-10s" : s < 20 ? "10-20s" : s < 40 ? "20-40s" : s < 60 ? "40-60s" : "60s-plus";
const flushTime = () => {
  if (vis) { acc += (Date.now() - vis) / 1000; vis = 0; }
  if (acc >= 3 && document.getElementById("dock")) { ev("room-time-" + tb(acc)); if (gamesRun) ev("games-per-visit-" + (gamesRun < 2 ? "1" : gamesRun < 4 ? "2-3" : "4plus")); ev("coins-per-visit-" + cb(coinsVisit)); }
  acc = 0; gamesRun = 0; coinsVisit = 0;
};
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushTime(); else vis = Date.now(); });
window.addEventListener("pagehide", flushTime);
const qs = new URLSearchParams(location.hash.slice(1) || location.search);
const handle = (qs.get("h") || "").toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._]/g, "");
const bed = parseInt(qs.get("b"), 10);
const L = LEVELS.find(l => bed >= l[2] && bed <= l[3]);
window.addEventListener("hashchange", () => location.reload());
const app = $("app");
if (!handle || !L) {
  try { const ru = localStorage.getItem("bunkerRoomUrl"); if (ru && ru.includes("#h=")) { location.replace(ru); return; } } catch (e) {}
  document.body.classList.add("nodock");
  app.innerHTML = `<div class="lock"><div class="k">JOIN THE BUNKER</div><h1>OPEN <b>YOUR ROOM</b></h1><p>Type your Instagram username. We'll find your bed and take you inside.</p>
  <form id="go" class="goform"><span>@</span><input id="gu" autocapitalize="none" spellcheck="false" placeholder="yourname" maxlength="40"><button class="btn go" type="submit">Go</button></form>
  <p class="fine">Not on the manifest yet? Follow @jointhebunker. Doors unlock after every Transmission.</p></div>`;
  $("go").onsubmit = e => { e.preventDefault(); const u = $("gu").value.trim().replace(/^@+/, ""); if (u) location.href = "/v2/?u=" + encodeURIComponent(u) + "&go=room"; };
  return;
}
const KEY = "bunkerRoom:" + handle;
let st = { coins: 0, own: [], eq: {}, best: {}, earned: 0, coat: null };
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && typeof s.coins === "number") {
    st.coins = s.coins; st.best = s.best || {}; st.earned = s.earned || s.coins; st.coat = s.coat ?? null; if (s.testPet !== undefined) st.testPet = s.testPet;
    const MIG = { blanket: "blanket-red", poster: "poster-sunset", lights: "lights-rainbow", rug: "rug-braided", plant: "corner-plant", radio: "top-radio", petbed: "pet-cushion-blue", flag: "wall-banner-gold" };
    st.own = (s.own || []).map(x => MIG[x] || x).filter(x => BY[x]);
    st.eq = s.eq || {}; if (s.on) for (const x of s.on) { const id = MIG[x] || x; if (BY[id]) st.eq[BY[id].slot] = id; }
  }
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const TEST = qs.get("test") === "1";
let pet = PETS[handle] || null;
if (TEST && st.testPet !== undefined) pet = st.testPet;
const lvl = L[0], H = hash(handle);
// ---------- sprites ----------
const BASEK = { 3: 0, 4: 1, 5: 0, 6: 1, 7: 0, 9: 0, 11: 0 };
const pick = (a, k) => a[((st.coat != null ? st.coat + (BASEK[k] || 0) : (H >>> k)) % a.length + a.length) % a.length];
const sp = {
  cat(x, y, s = 1, alt = 0) {
    const C = pick([["#e08a3a","#9a4e16","#5a2e0e"],["#2b2b2b","#111","#000"],["#9a9a9a","#6d6d6d","#333"],["#f1ece0","#c9c1ad","#6b6455"],["#c98b4f","#3b2a1d","#3b2a1d"]], 3 + alt);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 12 q-10 -2 -8 -10 q4 -6 12 -2" stroke="${C[1]}" stroke-width="6" fill="none" stroke-linecap="round"/>
<ellipse cx="0" cy="6" rx="30" ry="14" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.5"/><path d="M-14 -4 q4 8 0 18 M-2 -7 q4 10 0 22 M10 -5 q3 8 0 18" stroke="${C[1]}" stroke-width="2" fill="none" opacity=".7"/>
<circle cx="26" cy="0" r="12" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.5"/><path d="M17 -8 l2 -10 l7 7z M28 -11 l7 -7 l1 10z" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M20 0 q3 2 6 0 M29 0 q3 2 6 0" stroke="${C[0] === "#2b2b2b" ? "#9cf04a" : "#2a1606"}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M30 5 l-2 2 l-2 -2z" fill="#c5476a"/>
<path d="M16 9 q10 5 20 0" stroke="#c5221f" stroke-width="3" fill="none"/><circle cx="26" cy="13" r="3" fill="#f2c230" stroke="#6b4a12"/></g>`;
  },
  dog(x, y, s = 1, alt = 0) {
    const C = pick([["#c98b4f","#8a5a2b","#3b2a1d"],["#2b2420","#15110e","#000"],["#e6c27a","#b8904a","#5a4220"],["#f1ece0","#b9b09a","#5a5444"],["#8a5a2b","#f1ece0","#2a1b0e"]], 5 + alt);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-34 0 q-12 -10 -6 -18" stroke="${C[0]}" stroke-width="6" fill="none" stroke-linecap="round"/>
<ellipse cx="-6" cy="4" rx="32" ry="13" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.5"/><ellipse cx="-10" cy="10" rx="18" ry="5" fill="${C[1]}" opacity=".6"/>
<path d="M-30 14 h14 M8 14 h16" stroke="${C[2]}" stroke-width="5" stroke-linecap="round"/><path d="M-30 14 h14 M8 14 h16" stroke="${C[0]}" stroke-width="3" stroke-linecap="round"/>
<circle cx="26" cy="-6" r="12" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.5"/><ellipse cx="38" cy="-2" rx="8" ry="6" fill="${C[0]}" stroke="${C[2]}" stroke-width="1.5"/><circle cx="45" cy="-4" r="2.6" fill="#111"/>
<path d="M16 -14 q-8 6 -4 18 q6 -4 8 -14z" fill="${C[1]}" stroke="${C[2]}" stroke-width="1.2"/><path d="M26 -8 q3 2 6 0" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M18 4 q10 5 18 0" stroke="#2f7dd1" stroke-width="3" fill="none"/><circle cx="27" cy="8" r="3" fill="#f2c230" stroke="#6b4a12"/></g>`;
  },
  rabbit(x, y, s = 1) {
    const C = pick(["#f1ece0","#b9a58a","#8a8a8a","#5a4632"], 7);
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="17" ry="14" fill="${C}" stroke="#3a332a" stroke-width="1.5"/><circle cx="-16" cy="2" r="5" fill="#fff" stroke="#3a332a"/>
<circle cx="13" cy="-10" r="10" fill="${C}" stroke="#3a332a" stroke-width="1.5"/><path d="M9 -18 q-6 -20 0 -24 q5 6 3 24z M16 -18 q2 -20 9 -22 q2 8 -4 23z" fill="${C}" stroke="#3a332a" stroke-width="1.3"/>
<path d="M11 -36 q1 8 1 16 M20 -36 q-2 8 -4 16" stroke="#e7a1b0" stroke-width="2.4" fill="none"/><circle cx="17" cy="-11" r="1.8" fill="#111"/><circle cx="22" cy="-8" r="1.5" fill="#c5476a"/></g>`;
  },
  rodent(x, y, s = 1) {
    const C = pick(["#e6c27a","#c98b4f","#f1ece0","#8a8a8a"], 9);
    return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="14" ry="10" fill="${C}" stroke="#3a332a" stroke-width="1.5"/><circle cx="-4" cy="-9" r="4" fill="${C}" stroke="#3a332a" stroke-width="1.2"/><circle cx="7" cy="-9" r="4" fill="${C}" stroke="#3a332a" stroke-width="1.2"/>
<circle cx="-4" cy="-9" r="2" fill="#e7a1b0"/><circle cx="7" cy="-9" r="2" fill="#e7a1b0"/><circle cx="8" cy="-2" r="1.6" fill="#111"/><circle cx="13" cy="1" r="1.6" fill="#c5476a"/><path d="M-6 4 q5 3 10 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/></g>`;
  },
  critter(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 8 ${Array.from({length:10},(_, k)=>`L${-20 + k * 4.2} ${k % 2 ? -22 + Math.abs(k - 5) * 2 : -9 + Math.abs(k - 5)}`).join(" ")} L20 6z" fill="#6b5a44" stroke="#2a2016" stroke-width="1.3" stroke-linejoin="round"/>
<ellipse cx="0" cy="4" rx="20" ry="13" fill="#8a7458" stroke="#2a2016" stroke-width="1.5"/><circle cx="18" cy="0" r="9" fill="#c9b08a" stroke="#2a2016" stroke-width="1.3"/><circle cx="21" cy="-2" r="1.8" fill="#111"/><circle cx="26" cy="2" r="2" fill="#111"/></g>`;
  },
  bird(x, y, s = 1) {
    const C = pick([["#3fae49","#e8432e"],["#2f7dd1","#f2c230"],["#e8432e","#2f7dd1"],["#f2c230","#3fae49"]], 11);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 8 l-6 22 l8 -4 l4 4z" fill="${C[1]}" stroke="#222" stroke-width="1"/><ellipse cx="0" cy="0" rx="10" ry="15" fill="${C[0]}" stroke="#222" stroke-width="1.3"/>
<path d="M-6 -2 q-6 10 2 16" stroke="#00000044" stroke-width="3" fill="none"/><circle cx="2" cy="-14" r="8" fill="${C[0]}" stroke="#222" stroke-width="1.3"/><circle cx="4" cy="-15" r="2.6" fill="#fff"/><circle cx="4.5" cy="-15" r="1.4" fill="#111"/>
<path d="M9 -15 q7 2 3 8 q-3 -2 -4 -4z" fill="#3a332a"/><path d="M-6 15 h12" stroke="#5a4220" stroke-width="2"/></g>`;
  },
  fish(x, y) {
    return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="14" rx="15" ry="3" fill="#00000055"/><path d="M-16 -6 a17 17 0 1 0 32 0 z" fill="#3aa0ff55" stroke="#bfe0ff" stroke-width="1.6"/><path d="M-14 -6 h28" stroke="#bfe0ff" stroke-width="1.6"/>
<g class="swim"><ellipse cx="-2" cy="2" rx="7" ry="4.5" fill="#ff8c2a" stroke="#8a3a0a"/><path d="M5 2 l6 -5 v10z" fill="#ff8c2a" stroke="#8a3a0a"/><circle cx="-5" cy="1" r="1.2" fill="#111"/></g>
<circle cx="8" cy="-1" r="1.3" fill="none" stroke="#bfe0ff"/><circle cx="10" cy="-5" r="1" fill="none" stroke="#bfe0ff"/></g>`;
  },
  tank(x, y, inner) {
    return `<g transform="translate(${x} ${y})"><rect x="-30" y="-22" width="60" height="34" rx="3" fill="#2f4229" stroke="#bfe0ff" stroke-width="1.6"/><rect x="-30" y="-22" width="60" height="34" rx="3" fill="#9fd6ff22"/>
<rect x="-30" y="6" width="60" height="6" fill="#8a7458"/>${inner}<rect x="-32" y="-25" width="64" height="4" rx="1.5" fill="#3a372c" stroke="#121210"/></g>`;
  },
  snake() { return `<path d="M-22 4 q8 -10 16 0 t16 0 t10 -4" stroke="#3fae49" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="21" cy="-1" r="3.6" fill="#3fae49"/><circle cx="22" cy="-2" r="1" fill="#111"/><path d="M24 0 l4 1" stroke="#e8432e" stroke-width="1"/>`; },
  lizard() { return `<path d="M-24 4 q10 -2 18 0" stroke="#6b8a2e" stroke-width="3" fill="none"/><ellipse cx="2" cy="2" rx="12" ry="5" fill="#9ab045" stroke="#3a4a14"/><circle cx="16" cy="0" r="4.5" fill="#9ab045" stroke="#3a4a14"/><circle cx="17" cy="-1" r="1" fill="#111"/><path d="M-6 6 l-3 5 M8 6 l3 5 M-6 -2 l-3 -4 M8 -2 l3 -4" stroke="#3a4a14" stroke-width="2"/>`; },
  turtle() { return `<ellipse cx="14" cy="2" rx="5" ry="4" fill="#9ab045" stroke="#3a4a14"/><circle cx="16" cy="1" r="1" fill="#111"/><path d="M-12 6 l-3 4 M8 6 l3 4" stroke="#3a4a14" stroke-width="3"/><path d="M-16 6 q14 -22 28 0z" fill="#6b5a2e" stroke="#2a2016" stroke-width="1.4"/><path d="M-8 0 l6 -6 l6 6 M-2 -6 v-4" stroke="#2a2016" fill="none"/>`; }
};

// ---------- the room ----------
const has = id => st.on.includes(id);
function bowl(x, y, name) {
  return `<ellipse cx="${x}" cy="${y + 12}" rx="26" ry="7" fill="#00000055"/><path d="M${x - 24} ${y} h48 l-6 12 h-36z" fill="#c5221f" stroke="#121210" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="24" ry="5" fill="#8a2a22"/>` +
    (name ? `<text x="${x}" y="${y + 11}" text-anchor="middle" ${name.length > 7 ? `textLength="40" lengthAdjust="spacingAndGlyphs"` : ""} style="font:400 9px Anton,sans-serif;fill:#ffd9d9;letter-spacing:.08em">${esc(name.toUpperCase())}</text>` : "");
}
function jobItem() {
  const g = (b) => `<line x1="44" y1="84" x2="44" y2="94" stroke="#121210" stroke-width="2"/><g transform="translate(44 112)">${b}</g>`;
  return g({
    B1: `<ellipse cx="0" cy="0" rx="17" ry="19" fill="#3a3a32" stroke="#121210" stroke-width="1.5"/><circle cx="-7" cy="-5" r="6" fill="#9fd6ff66" stroke="#121210" stroke-width="2"/><circle cx="7" cy="-5" r="6" fill="#9fd6ff66" stroke="#121210" stroke-width="2"/><circle cx="0" cy="11" r="7" fill="#5e5a48" stroke="#121210" stroke-width="1.5"/>`,
    B2: `<rect x="-20" y="-16" width="40" height="30" rx="4" fill="#d6d2c2" stroke="#121210" stroke-width="1.5"/><rect x="-4" y="-11" width="8" height="20" fill="#c5221f"/><rect x="-10" y="-5" width="20" height="8" fill="#c5221f"/>`,
    B3: `<path d="M-14 -8 h20 l2 22 h-24z" fill="#3fae49" stroke="#121210" stroke-width="1.5"/><path d="M8 -4 l16 -10" stroke="#3fae49" stroke-width="5" stroke-linecap="round"/><path d="M-12 -8 q8 -14 18 0" stroke="#121210" stroke-width="2.5" fill="none"/>`,
    B4: `<path d="M-20 -6 h40 v10 q0 12 -20 12 q-20 0 -20 -12z" fill="#8a8670" stroke="#121210" stroke-width="1.5"/><rect x="-24" y="-9" width="48" height="5" rx="2" fill="#5e5a48" stroke="#121210"/><path d="M10 -26 v18 M10 -26 q-6 -2 -8 4" stroke="#c9c1ad" stroke-width="3" fill="none"/>`,
    B5: `<circle cx="0" cy="0" r="16" fill="#e8432e" stroke="#121210" stroke-width="1.5"/><circle cx="0" cy="0" r="11" fill="#f1ece0"/><path d="M0 0 v-8 M0 0 h6" stroke="#121210" stroke-width="2"/><circle cx="-11" cy="-15" r="5" fill="#f2c230" stroke="#121210"/><circle cx="11" cy="-15" r="5" fill="#f2c230" stroke="#121210"/>`,
    B6: `<path d="M-20 6 q0 -24 20 -24 q20 0 20 24z" fill="#4f5a3a" stroke="#121210" stroke-width="1.5"/><rect x="-23" y="4" width="46" height="5" rx="2" fill="#3a4229" stroke="#121210"/><path d="M-12 -8 h24" stroke="#00000044" stroke-width="2"/>`,
    B7: `<path d="M-4 -22 a9 9 0 1 0 8 0 v7 h-8z" fill="#9a9a9a" stroke="#121210" stroke-width="1.5"/><rect x="-3.5" y="-8" width="7" height="30" rx="2" fill="#9a9a9a" stroke="#121210" stroke-width="1.5"/>`
  }[lvl]);
}

// ---------- the room ----------
let preview = null;   // item being tried on
const worn = slot => { if (preview && BY[preview].slot === slot) return BY[preview]; const id = st.eq[slot]; return id && BY[id] ? BY[id] : null; };
const HEAD = { cat: [186, 150], dog: [186, 302], bird: [264, 192], rabbit: [209, 300], rodent: [264, 280], critter: [218, 312], fish: [96, 222], snake: [258, 262], lizard: [258, 262], turtle: [258, 262] };
function crown(x, y) { return `<g transform="translate(${x} ${y})"><path d="M-10 0 l-2 -12 l6 6 l6 -10 l6 10 l6 -6 l-2 12z" fill="#ffc23a" stroke="#6b4a12" stroke-width="1.2"/><circle cx="0" cy="-12" r="1.8" fill="#ff3b3b"/></g>`; }
function cushion(it, x, y, rx, ry) { const c = it.color; return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" stroke="#121210" stroke-width="1.5"/><ellipse cx="${x}" cy="${y - 3}" rx="${rx - 10}" ry="${ry - 5}" fill="#ffffff22"/>` + (it.plaid ? `<path d="M${x - rx + 12} ${y} h${2 * rx - 24} M${x} ${y - ry + 2} v${2 * ry - 4}" stroke="#c5221f" stroke-width="3" opacity=".7"/>` : ""); }
function draw() {
  const W = [], a = s => W.push(s), o = { lvl };
  a(`<defs><linearGradient id="wl" x1="0" x2="1"><stop offset="0" stop-color="#3f3c30"/><stop offset=".5" stop-color="#6e6a56"/><stop offset="1" stop-color="#3a372c"/></linearGradient>
<linearGradient id="fl" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#2b2820"/><stop offset="1" stop-color="#15130f"/></linearGradient>
<radialGradient id="lg" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset=".6" stop-color="#ffc23a" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`);
  a(`<rect width="300" height="400" fill="url(#wl)"/>`);
  for (let r = 0; r < 8; r++) { a(`<line x1="0" y1="${40 + r * 34}" x2="300" y2="${40 + r * 34}" stroke="#00000033"/>`); for (let c = 0; c < 5; c++) { const x = c * 60 + (r % 2) * 30; a(`<line x1="${x}" y1="${40 + r * 34}" x2="${x}" y2="${74 + r * 34}" stroke="#00000026"/>`); } }
  a(`<path d="M0 0 H300 V22 Q150 52 0 22Z" fill="#24221b"/><path d="M0 22 Q150 52 300 22" stroke="#8a8068" stroke-width="3" fill="none"/>`);
  const it = s => { const i = worn(s); if (i) a(i.draw(o)); return i; };
  it("lights");
  a(`<rect y="300" width="300" height="100" fill="url(#fl)"/><rect y="298" width="300" height="4" fill="#121210"/>`);
  a(`<line x1="150" y1="36" x2="150" y2="58" stroke="#121210" stroke-width="2"/><path d="M136 58 h28 l6 12 h-40z" fill="#2e2c24" stroke="#121210"/><ellipse cx="150" cy="71" rx="12" ry="3" fill="#ffe2a0"/><rect x="0" y="66" width="300" height="334" fill="url(#lg)"/>`);
  const hT = "@" + handle;
  a(`<rect x="182" y="82" width="98" height="40" rx="3" fill="#ffc23a" stroke="#6b4a12" stroke-width="1.5"/><text x="231" y="99" text-anchor="middle" style="font:400 15px Anton,sans-serif;fill:#1a1206">BED ${fmt(bed)}</text><text x="231" y="114" text-anchor="middle" ${hT.length > 14 ? `textLength="86" lengthAdjust="spacingAndGlyphs"` : ""} style="font:600 10px Inter,sans-serif;fill:#3a2606">${esc(hT)}</text>`);
  a(jobItem());
  it("wallA");
  a(`<rect x="0" y="140" width="300" height="6" fill="#2e2c24"/><circle cx="96" cy="143" r="5" fill="#4b4838" stroke="#121210"/><circle cx="214" cy="143" r="5" fill="#4b4838" stroke="#121210"/>`);
  it("wallB"); it("rug");
  // bunk
  a(`<rect x="18" y="196" width="208" height="10" fill="#4b4838" stroke="#121210" stroke-width="1.5"/><rect x="18" y="160" width="8" height="140" fill="#3a372c" stroke="#121210"/><rect x="218" y="160" width="8" height="140" fill="#3a372c" stroke="#121210"/>`);
  if (!it("blanket")) a(`<rect x="26" y="178" width="192" height="20" rx="5" fill="#3f5a37" stroke="#121210" stroke-width="1.5"/><rect x="26" y="190" width="192" height="8" rx="4" fill="#2f4229"/><path d="M60 180 q20 6 40 0 M120 182 q24 7 48 0" stroke="#00000044" fill="none" stroke-width="1.5"/>`);
  if (!it("pillow")) a(`<rect x="30" y="166" width="42" height="16" rx="7" fill="#d6d2c2" stroke="#121210"/>`);
  a(`<rect x="18" y="206" width="208" height="12" fill="#1b1a15"/>`);
  if (!it("locker")) a(`<rect x="70" y="252" width="96" height="46" rx="3" fill="#4f5a3a" stroke="#121210" stroke-width="1.5"/><rect x="70" y="262" width="96" height="5" fill="#00000040"/><rect x="112" y="270" width="12" height="10" rx="2" fill="#f2c230" stroke="#121210"/>`);
  it("top"); it("corner");
  // pet
  if (pet) {
    const [k, , name, n] = pet; const two = n > 1, pb = worn("petbed"), toy = worn("pettoy"), hat = worn("pethat");
    if (k === "cat") { if (pb) a(cushion(pb, 160, 182, 42, 9)); if (two) a(sp.cat(100, 170, .85, 1)); a(sp.cat(160, 168)); a(bowl(256, 318, name.split(" & ")[0])); }
    else if (k === "dog") { if (pb) a(cushion(pb, 160, 336, 62, 14)); if (two) a(sp.dog(84, 316, .8, 1)); a(sp.dog(160, 326)); a(bowl(256, 318, name.split(" & ")[0])); }
    else if (k === "fish") { a(sp.fish(96, 240)); a(`<text x="96" y="268" text-anchor="middle" style="font:400 8px Anton,sans-serif;fill:#f2c230;letter-spacing:.08em">${esc((name || "").toUpperCase())}</text>`); }
    else if (k === "bird") { a(`<ellipse cx="262" cy="318" rx="18" ry="5" fill="#00000055"/><rect x="259" y="238" width="6" height="80" fill="#5a4220" stroke="#121210"/><rect x="244" y="236" width="36" height="5" rx="2" fill="#5a4220" stroke="#121210"/>`); a(sp.bird(262, 220)); if (name) a(`<text x="262" y="334" text-anchor="middle" style="font:400 9px Anton,sans-serif;fill:#f2c230;letter-spacing:.08em">${esc(name.toUpperCase())}</text>`); }
    else if (k === "rabbit") { if (pb) a(cushion(pb, 196, 340, 34, 9)); a(sp.rabbit(196, 330)); if (two) a(sp.rabbit(150, 336, .8)); a(bowl(256, 318, name)); }
    else if (k === "rodent") { a(`<g transform="translate(262 300)"><rect x="-30" y="-36" width="60" height="44" rx="4" fill="none" stroke="#c9c1ad" stroke-width="1.5"/>${Array.from({length:9},(_, i)=>`<line x1="${-27 + i * 6.7}" y1="-36" x2="${-27 + i * 6.7}" y2="8" stroke="#c9c1ad" stroke-width="1"/>`).join("")}<rect x="-32" y="6" width="64" height="5" fill="#8a7458"/>${sp.rodent(0, -4, 1)}</g>`); if (name) a(`<text x="262" y="326" text-anchor="middle" style="font:400 9px Anton,sans-serif;fill:#f2c230;letter-spacing:.08em">${esc(name.toUpperCase())}</text>`); }
    else if (["snake","lizard","turtle"].includes(k)) { a(sp.tank(258, 292, sp[k]())); if (name) a(`<text x="258" y="318" text-anchor="middle" style="font:400 9px Anton,sans-serif;fill:#f2c230;letter-spacing:.08em">${esc(name.toUpperCase())}</text>`); }
    else { if (pb) a(cushion(pb, 200, 340, 34, 9)); a(sp.critter(200, 330)); a(bowl(256, 318, name)); }
    if (toy) a(toy.draw(o));
    if (hat && HEAD[k]) a(crown(...HEAD[k]));
  }
  a(`<path d="M0 60 L14 66 V312 L0 318Z" fill="#5e5a48" stroke="#121210" stroke-width="1.5"/>`);
  $("room").innerHTML = W.join("");
  $("coinN").textContent = fmt(st.coins);
}

// ---------- page ----------
const petLine = pet ? (() => { const [k, lab, name, n] = pet;
  return { cat: `${name || "Your cat"} found the warm spot on your bunk before you did.`, dog: `${name || "Your dog"} won't leave your side.${n > 1 ? " Neither will the other one." : ""}`, fish: `${name || "Your fish"} has the best view in the room.`, bird: `${name || "Your bird"} watches the door. Nothing gets past.`,
    rabbit: `${name || "Your rabbit"} already dug a corner of the rug.`, rodent: `${name || "Your " + lab.toLowerCase()} runs laps all night. You'll get used to it.`, snake: `${name || "Your snake"} likes the warm pipes.`, lizard: `${name || "Your " + lab.toLowerCase()} likes the warm pipes.`, turtle: `${name || "Your " + lab.toLowerCase()} is in no hurry. Nobody down here is.`, critter: `${name || "Your " + lab.toLowerCase()} made it down. Nobody asked how.` }[k]; })() : "";
const PETASK = `<div class="petask"><div class="pa-ic">🐾</div><div class="pa-t"><b>NO BUNKMATE YET?</b><span>Comment on the latest Transmission with the animal and its name. It moves in at the next manifest update.</span></div><a class="pa-go" href="https://www.instagram.com/jointhebunker/" target="_blank" rel="noopener" data-ask="1">Comment on Instagram</a></div>`;
const COATS = { cat: ["Ginger", "Black", "Grey", "White", "Brown"], dog: ["Tan", "Black", "Golden", "White", "Brown & white"], rabbit: ["White", "Fawn", "Grey", "Brown"], rodent: ["Golden", "Ginger", "White", "Grey"], bird: ["Green", "Blue", "Red", "Yellow"] };
const mate = pet ? `<div class="mate"><div style="flex:1"><small>BUNKMATE</small><b>${esc((pet[2] ? pet[2] + " · " : "") + (pet[3] > 1 ? pet[3] + " " + (/fish|sheep/i.test(pet[1]) ? pet[1] : pet[1] + "s") : pet[1])).toUpperCase()}</b></div>${COATS[pet[0]] ? `<button class="mini" id="styleBtn" type="button">Style ${esc(pet[2] ? pet[2].split(" & ")[0] : "them")}</button>` : ""}</div>` : "";
app.innerHTML = `
<div class="top"><a class="back" href="/v2/">← Hallway</a><div class="coins" aria-label="Coins"><i></i><span id="coinN">0</span></div></div>
<div class="roomwrap"><svg id="room" viewBox="0 0 300 400" role="img" aria-label="Your bunker room"></svg></div>
<div class="rtitle"><h1>YOUR ROOM</h1><div class="k">${lvl} · BED ${fmt(bed)}</div></div>
<div id="dockSlot"></div>
${pet ? mate : PETASK}
<div id="coats"></div>
<p>${petLine} ${JOB[lvl]}</p>
<div class="hint" id="hint"><b>How it works</b><ol><li><b>Play</b> a game to earn coins.</li><li>Open the <b>Catalogue</b> and tap anything to try it on.</li><li>Buy it. It stays in your room.</li></ol><button id="hintX" type="button" aria-label="Got it">Got it</button></div>
<p class="fine">Coins are earned, never bought. Your room is saved on this phone for now.</p>`;
function games() {
  $("pgrid").innerHTML = GAMES.map(g => `<button class="gm" data-g="${g.id}" type="button" style="--c:${g.col}"><b>${g.n}</b><span>${g.d}</span><em>${st.best[g.id] ? "Best: " + st.best[g.id] + " coins" : "Not played yet"}</em></button>`).join("");
}
draw(); games();
ev(pet ? "room-open-pet" : "room-open");
try { if (localStorage.getItem("bunkerHintSeen")) $("hint").hidden = true; } catch (e) {}
$("hintX").onclick = () => { $("hint").hidden = true; try { localStorage.setItem("bunkerHintSeen", "1") } catch (e) {} };
function coatPicker() {
  const box = $("coats"); if (!pet || !COATS[pet[0]]) { box.innerHTML = ""; return; }
  const k = pet[0], names = COATS[k], keep = st.coat, POS = { cat: [0, 0], dog: [0, 0], rabbit: [-4, 10], rodent: [0, 4], bird: [0, 10] };
  box.innerHTML = `<div class="coats">${names.map((n, i) => { st.coat = i; const [dx, dy] = POS[k]; const sv = `<svg viewBox="-48 -40 96 64"><g transform="translate(${dx} ${dy})">${sp[k](k === "dog" ? -6 : 0, 0, k === "rodent" ? 1.6 : 1)}</g></svg>`; return `<button class="coat${keep === i ? " on" : ""}" data-coat="${i}" type="button">${sv}<span>${n}</span></button>`; }).join("")}</div>`;
  st.coat = keep;
}
let coatOpen = false;
document.addEventListener("click", e => {
  if (e.target.closest("[data-ask]")) ev("pet-ask-click");
  if (e.target.closest("#styleBtn")) { coatOpen = !coatOpen; coatOpen ? coatPicker() : ($("coats").innerHTML = ""); return; }
  const c = e.target.closest("[data-coat]"); if (c) { st.coat = +c.dataset.coat; save(); draw(); coatPicker(); ev("pet-style"); }
});
if (TEST) {
  const kinds = ["cat", "dog", "fish", "bird", "rabbit", "rodent", "snake", "lizard", "turtle", "critter"];
  app.insertAdjacentHTML("beforeend", `<div class="test"><b>TEST MODE</b> <small>Only changes this phone.</small>
  <div class="row"><button class="btn" data-t="coins" type="button">+500 coins</button><button class="btn" data-t="all" type="button">Unlock all</button><button class="btn" data-t="reset" type="button">Reset room</button></div>
  <div class="tpets">Preview pet: ${kinds.map(k => `<button class="mini" data-tp="${k}" type="button">${k}</button>`).join("")}<button class="mini" data-tp="none" type="button">none</button><button class="mini" data-tp="real" type="button">real</button></div></div>`);
  app.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"), tp = e.target.closest("[data-tp]");
    if (t) { if (t.dataset.t === "coins") st.coins += 500; if (t.dataset.t === "all") st.own = ITEMS.map(i => i.id); if (t.dataset.t === "reset") st = { coins: 0, own: [], eq: {}, best: {}, earned: 0, coat: null }; save(); location.reload(); }
    if (tp) { const v = tp.dataset.tp; if (v === "real") delete st.testPet; else st.testPet = v === "none" ? null : [v, v[0].toUpperCase() + v.slice(1), "Test", 1]; st.coat = null; save(); location.reload(); }
  });
}

// ---------- catalogue ----------
const sheet = $("cat");
let cat = "all", sel = null;
function thumb(i) {
  const [x, y, w, hh] = SLOTS[i.slot].box;
  let inner = i.draw({ lvl });
  if (i.slot === "petbed") inner = cushion(i, 180, 336, 44, 12);
  if (i.slot === "pethat") inner = crown(170, 180);
  return `<svg viewBox="${x} ${y} ${w} ${hh}" preserveAspectRatio="xMidYMid meet"><rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#4b4838"/>${inner}</svg>`;
}
function renderCat() {
  const list = ITEMS.filter(i => (cat === "all" || i.cat === cat) && (!i.pet || pet));
  $("tabs").innerHTML = CATS.map(([id, n]) => `<button data-c="${id}" class="${id === cat ? "on" : ""}" type="button">${n}</button>`).join("");
  if (!pet && cat === "pet") { $("grid").innerHTML = `<div style="grid-column:1/-1">${PETASK}</div>`; sel = null; bar(); return; }
  $("grid").innerHTML = list.map(i => { const own = st.own.includes(i.id), on = st.eq[i.slot] === i.id;
    return `<button class="ci${sel === i.id ? " sel" : ""}${i.rare ? " rare" : ""}" data-i="${i.id}" type="button">${thumb(i)}<span class="cn">${i.n}</span><span class="cp">${on ? "In your room" : own ? "Owned" : `<i></i>${i.c}`}</span></button>`; }).join("");
  bar();
}
function bar() {
  const b = $("cbar");
  if (!sel) { b.innerHTML = `<span class="cbt">Tap anything to try it in your room.</span>`; return; }
  const i = BY[sel], own = st.own.includes(i.id), on = st.eq[i.slot] === i.id;
  b.innerHTML = `<div class="cbt"><b>${i.n}${i.rare ? " · RARE" : ""}</b><small>${i.d} · ${SLOTS[i.slot].n}</small></div>` +
    (on ? `<button class="cb" data-a="off" type="button">Take it out</button>` : own ? `<button class="cb go" data-a="on" type="button">Put it in</button>` :
      `<button class="cb go" data-a="buy" type="button" ${st.coins < i.c ? "disabled" : ""}>${st.coins < i.c ? `Need ${i.c - st.coins} more` : `Buy · ${i.c}`}</button>`);
}
const dockSet = d => document.querySelectorAll("#dock button").forEach(b => b.classList.toggle("on", b.dataset.d === d));
const closeSheets = () => { sheet.classList.remove("on"); $("play").classList.remove("on"); document.body.classList.remove("sheetopen"); if (preview || sel) { preview = null; sel = null; draw(); } dockSet("room"); };
const openCat = () => { closeSheets(); sheet.classList.add("on"); document.body.classList.add("sheetopen"); renderCat(); scrollTo({ top: 0, behavior: "smooth" }); dockSet("cat"); ev("catalogue-open"); };
const openPlay = () => { closeSheets(); $("play").classList.add("on"); document.body.classList.add("sheetopen"); games(); scrollTo({ top: 0, behavior: "smooth" }); dockSet("play"); ev("play-open"); };
$("cclose").onclick = closeSheets; $("pclose").onclick = closeSheets;
const petBtn = document.querySelector('#dock [data-d="pet"]');
if (pet && !COATS[pet[0]]) petBtn.hidden = true; else if (!pet) petBtn.querySelector("span").textContent = "Get a pet";
$("dock").onclick = e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset.d;
  if (d === "room") { closeSheets(); scrollTo({ top: 0, behavior: "smooth" }); }
  if (d === "play") $("play").classList.contains("on") ? closeSheets() : openPlay();
  if (d === "cat") sheet.classList.contains("on") ? closeSheets() : openCat();
  if (d === "pet") { closeSheets(); if (pet) { if (!coatOpen) { coatOpen = true; coatPicker(); } $("coats").scrollIntoView({ behavior: "smooth", block: "center" }); }
    else { const pa = document.querySelector("#app .petask"); if (pa) { pa.scrollIntoView({ behavior: "smooth", block: "center" }); pa.classList.remove("flash"); void pa.offsetWidth; pa.classList.add("flash"); } } dockSet(d); }
};
$("tabs").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; renderCat(); $("grid").scrollTop = 0; } };
$("grid").onclick = e => { const b = e.target.closest("[data-i]"); if (!b) return; sel = b.dataset.i; preview = st.eq[BY[sel].slot] === sel ? null : sel; draw(); renderCat(); };
$("cbar").onclick = e => {
  const b = e.target.closest("[data-a]"); if (!b || !sel) return; const i = BY[sel];
  if (b.dataset.a === "buy" && st.coins >= i.c) { st.coins -= i.c; st.own.push(i.id); st.eq[i.slot] = i.id; ev("buy-" + i.id); }
  if (b.dataset.a === "on") st.eq[i.slot] = i.id;
  if (b.dataset.a === "off") delete st.eq[i.slot];
  preview = null; save(); draw(); renderCat();
};

// ---------- games ----------
const G = $("game"); let stop = null, gId = null, gT0 = 0;
function play(id) {
  const gm = GAMES.find(g => g.id === id); G.classList.add("on"); document.body.classList.add("gameopen");
  $("gname").textContent = gm.n.toUpperCase(); $("gmsg").innerHTML = `<span class="gd">${gm.d}</span>`; $("gflood").style.width = "0";
  const svg = $("gsvg"); svg.onpointerdown = svg.onpointermove = null; svg.innerHTML = "";
  ev("game-start-" + id); gamesRun++; gId = id; gT0 = Date.now();
  stop = gm.start({ svg, hud: t => $("ghud").textContent = t, bar: p => $("gflood").style.width = Math.min(100, p) + "%",
    end: (coins, line) => {
      coins = Math.max(0, Math.round(coins)); st.coins += coins; st.earned += coins; coinsVisit += coins; const best = coins > (st.best[id] || 0); if (best) st.best[id] = coins; save(); draw(); games();
      ev("game-" + id + "-secs-" + gb((Date.now() - gT0) / 1000)); gId = null;
      ev("game-" + id + "-" + (coins < 10 ? "0-9" : coins < 20 ? "10-19" : coins < 40 ? "20-39" : coins < 70 ? "40-69" : "70plus"));
      $("gmsg").innerHTML = `<b>+${coins} COINS</b>${esc(line)}${best && coins ? " New best." : ""}<div class="row"><button class="btn" id="gx" type="button">Back to my room</button><button class="btn go" id="gy" type="button">Again</button></div>`;
      $("gx").onclick = closeGame; $("gy").onclick = () => play(id);
    } });
}
function closeGame() { if (gId) { ev("game-" + gId + "-quit-" + gb((Date.now() - gT0) / 1000)); gId = null; } if (stop) stop(); G.classList.remove("on"); document.body.classList.remove("gameopen"); }
$("pgrid").onclick = e => { const b = e.target.closest("[data-g]"); if (b) play(b.dataset.g); };
$("gquit").onclick = closeGame;
$("mute").onclick = () => { window.BK_MUTE = !window.BK_MUTE; $("mute").textContent = window.BK_MUTE ? "Sound off" : "Sound on"; try { localStorage.setItem("bunkerMute", window.BK_MUTE ? "1" : "") } catch (e) {} };
try { window.BK_MUTE = !!localStorage.getItem("bunkerMute"); } catch (e) {}
$("mute").textContent = window.BK_MUTE ? "Sound off" : "Sound on";
ev("earned-total-" + cb(st.earned || 0));
// Returning visitors: one anonymous event per page load, based on this device's last visit day (no handle).
try {
  const day = new Date().toLocaleDateString("en-CA"), prev = localStorage.getItem("bunkerSeenDay");
  if (!TEST) {
    if (!prev) ev("visit-new");
    else { const d = Math.round((new Date(day) - new Date(prev)) / 864e5); ev(d <= 0 ? "visit-back-same-day" : d === 1 ? "visit-back-1d" : d < 7 ? "visit-back-2-6d" : "visit-back-7d-plus"); }
    localStorage.setItem("bunkerSeenDay", day);
  }
} catch (e) {}
})();
