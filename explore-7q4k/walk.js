// Join the Bunker: free-roam 3D bunker. Walk in through the blast door, ride the lift to any floor, find your door and step inside.
// Three.js only, no models: everything is built here from boxes and canvas-drawn textures.
import * as THREE from "/vendor/three.module.min.js";

try { await document.fonts.load("96px Anton"); } catch (e) {}
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString("en-US");
const ev = n => { try { window.gcEv && window.gcEv(n) } catch (e) {} };

// ---------- who is visiting ----------
let qs = new URLSearchParams(location.hash.slice(1) || location.search);
if (!qs.get("h")) { try { const u = localStorage.getItem("bunkerRoomUrl"); if (u && u.includes("#")) qs = new URLSearchParams(u.split("#")[1]); } catch (e) {} }
const handle = (qs.get("h") || "").toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._]/g, "").slice(0, 30);
const bed = Math.max(0, Math.min(99999, parseInt(qs.get("b"), 10) || 0));
const founder = parseInt(qs.get("f"), 10) || 0;
const LEVELS = [
  ["B1", "Entry and decontamination", 1, 10000, 0xd9ffd0],
  ["B2", "Command and medical", 10001, 20000, 0xe6f4ff],
  ["B3", "The garden", 20001, 30000, 0xd9a0ff],
  ["B4", "Commons and pantry", 30001, 40000, 0xffd8a0],
  ["B5", "Main dormitory", 40001, 70000, 0xffe6b0],
  ["B6", "The armory", 70001, 85000, 0xfff0d0],
  ["B7", "Engineering", 85001, 100000, 0xffa860],
];
const MINE = handle && bed ? LEVELS.findIndex(l => bed >= l[2] && bed <= l[3]) : -1;
const roomUrl = MINE >= 0 ? `/room/#h=${encodeURIComponent(handle)}&b=${bed}` : "/";
$("csub").textContent = MINE >= 0 ? `Your bed is ${fmt(bed)} on ${LEVELS[MINE][0]}. Go and find it. Sound on.` : "Look around as a visitor. Find your bed on the main page to get a door of your own.";

// ---------- renderer ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
catch (e) { location.replace(roomUrl); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050403);
scene.fog = new THREE.Fog(0x050403, 7, 32);
const portrait = () => innerWidth < innerHeight;
const cam = new THREE.PerspectiveCamera(portrait() ? 78 : 66, innerWidth / innerHeight, 0.05, 80);
cam.rotation.order = "YXZ";
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = portrait() ? 78 : 66; cam.updateProjectionMatrix(); });

// ---------- textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function noise(g, w, h, base, spread, n) { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = rnd(-spread, spread); g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 4), rnd(1, 4)); } }
const concrete = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#4a463a", .06, 2600); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 0 : 64; x < w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }, [4, 1.2]);
const floorTex = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#2c2a24", .05, 2000); g.fillStyle = "#e0b52c"; for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 6, y + 8, 12, 36); }, [1, 10]);
const tileTex = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#302d26", .05, 1500); g.strokeStyle = "rgba(0,0,0,.4)"; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [3, 3]);
const hazard = canvasTex(256, 32, (g, w, h) => { g.fillStyle = "#15100a"; g.fillRect(0, 0, w, h); g.fillStyle = "#f2c230"; for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } }, [8, 1]);
const ceilTex = canvasTex(128, 128, (g, w, h) => noise(g, w, h, "#24221c", .05, 800), [2, 10]);
function label(text, opts = {}) {
  const { w = 512, h = 128, fg = "#ffc23a", bg = null, font = "Anton", size = 96 } = opts;
  return canvasTex(w, h, g => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = fg; g.font = `${size}px ${font}, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4, w - 20); });
}

// ---------- materials + helpers ----------
const std = o => new THREE.MeshStandardMaterial(o);
const M = {
  wall: std({ map: concrete, roughness: .95 }), floor: std({ map: floorTex, roughness: .8, metalness: .1 }),
  tile: std({ map: tileTex, roughness: .85 }), ceil: std({ map: ceilTex, roughness: 1 }), hazard: std({ map: hazard, roughness: .7 }),
  steel: std({ color: 0x6c6855, roughness: .55, metalness: .6 }), dark: std({ color: 0x1b1a15, roughness: .7, metalness: .4 }),
  gold: std({ color: 0xffc23a, emissive: 0x6b4a00, roughness: .4, metalness: .5 }), olive: std({ color: 0x4e5a3a, roughness: .7 }),
  green: std({ color: 0x3f6b35, roughness: .8 }), white: std({ color: 0xe8e4d6, roughness: .8 }), wood: std({ color: 0x6b4a2e, roughness: .8 }),
  red: std({ color: 0x8f2e2a, roughness: .7 }), pipe: std({ color: 0x3e4a3a, roughness: .6, metalness: .5 }),
  glass: new THREE.MeshBasicMaterial({ color: 0xfff1b0 }), off: new THREE.MeshBasicMaterial({ color: 0x3a3a2a }),
};
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const H = 3.2, ELZ = -14;

function room(group, x0, x1, z0, z1, lamp, floorM = M.floor) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const f = plane(w, d, floorM); f.rotation.x = -Math.PI / 2; group.add(at(f, cx, 0, cz));
  const c = plane(w, d, M.ceil); c.rotation.x = Math.PI / 2; group.add(at(c, cx, H, cz));
  if (lamp) { const lm = new THREE.MeshBasicMaterial({ color: lamp }); for (let z = z0 + 2; z < z1 - .5; z += 4) group.add(at(box(.9, .05, .25, lm), cx, H - .03, z)); }
}
function wallX(group, x, z0, z1, facing) {
  const len = z1 - z0, ry = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  const w = plane(len, H, M.wall); w.rotation.y = ry; group.add(at(w, x, H / 2, (z0 + z1) / 2));
  const s = plane(len, .22, M.hazard); s.rotation.y = ry; group.add(at(s, x + facing * .01, .11, (z0 + z1) / 2));
}
function wallZ(group, z, x0, x1, facing) {
  const w = plane(x1 - x0, H, M.wall); w.rotation.y = facing > 0 ? 0 : Math.PI; group.add(at(w, (x0 + x1) / 2, H / 2, z));
}
function sign(group, text, x, y, z, ry, w = 2.4, opts = {}) {
  const p = plane(w, w * .18, new THREE.MeshBasicMaterial({ map: label(text, { w: 1280, h: 230, size: 120, bg: "#15100a", ...opts }) }));
  p.rotation.y = ry; group.add(at(p, x, y, z)); return p;
}

// ---------- sound ----------
let ac = null, master = null;
function audioOn() { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination); } catch (e) { ac = null; } }
function tone(f, d, type = "sine", v = .2, when = 0) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05); }
function thud(v = .5, fq = 180) { if (!ac) return; const n = ac.sampleRate * .25 | 0, b = ac.createBuffer(1, n, ac.sampleRate), c = b.getChannelData(0); for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "lowpass"; f.frequency.value = fq; g.gain.value = v; s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(); }
let hum = null;
function humOn(on) { if (!ac) return; if (on && !hum) { const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = 55; o2.frequency.value = 82; g.gain.value = 0; g.gain.linearRampToValueAtTime(.06, ac.currentTime + .5); f.type = "lowpass"; f.frequency.value = 300; o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start(); hum = { o, o2, g }; } if (!on && hum) { hum.g.gain.linearRampToValueAtTime(0, ac.currentTime + .4); const h = hum; setTimeout(() => { try { h.o.stop(); h.o2.stop(); } catch (e) {} }, 600); hum = null; } }

// ---------- the lift, shared by every floor ----------
const lift = new THREE.Group(); scene.add(lift);
{
  const panelTex = canvasTex(256, 256, (g, w, h) => { noise(g, w, h, "#4f4b3e", .05, 1200); g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, [2, 1]);
  const inner = std({ map: panelTex, roughness: .6, metalness: .4 });
  lift.add(at(plane(2.6, H, inner), 0, H / 2, ELZ - 2.6));
  for (const s of [-1, 1]) { const p = plane(2.6, H, inner); p.rotation.y = -s * Math.PI / 2; lift.add(at(p, s * 1.3, H / 2, ELZ - 1.3)); }
  const f = plane(2.6, 2.6, M.dark); f.rotation.x = -Math.PI / 2; lift.add(at(f, 0, .002, ELZ - 1.3));
  const c = plane(2.6, 2.6, M.ceil); c.rotation.x = Math.PI / 2; lift.add(at(c, 0, H, ELZ - 1.3));
  lift.add(at(box(.9, .04, .5, new THREE.MeshBasicMaterial({ color: 0xd8cfa8 })), 0, H - .02, ELZ - 1.3));
  lift.add(at(box(2.4, .06, .06, M.steel), 0, 1, ELZ - 2.55));
  lift.add(at(new THREE.PointLight(0xfff3cf, 1.6, 4, 1.8), 0, 2.6, ELZ - 1.3));
  for (const side of [1, -1]) {
    const s = new THREE.Shape(); s.moveTo(-1.8, 0); s.lineTo(1.8, 0); s.lineTo(1.8, H); s.lineTo(-1.8, H); s.lineTo(-1.8, 0);
    const hole = new THREE.Path(); hole.moveTo(-1.05, 0); hole.lineTo(-1.05, 2.5); hole.lineTo(1.05, 2.5); hole.lineTo(1.05, 0); hole.lineTo(-1.05, 0); s.holes.push(hole);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(s), M.wall); w.position.z = ELZ + side * .002; if (side < 0) w.rotation.y = Math.PI; lift.add(w);
  }
}
const doorL = box(1.05, 2.5, .08, M.steel), doorR = box(1.05, 2.5, .08, M.steel);
at(doorL, -.525, 1.25, ELZ - .05); at(doorR, .525, 1.25, ELZ - .05); scene.add(doorL, doorR);
for (const d of [doorL, doorR]) for (const y of [-1, .9]) d.add(at(box(1.0, .12, .09, M.hazard), 0, y, 0));
const indC = document.createElement("canvas"); indC.width = 256; indC.height = 96; const indG = indC.getContext("2d"); const indT = new THREE.CanvasTexture(indC); indT.colorSpace = THREE.SRGBColorSpace;
let indLast = ""; function setInd(t) { if (t === indLast) return; indLast = t; indG.fillStyle = "#0a0806"; indG.fillRect(0, 0, 256, 96); indG.fillStyle = "#ffc23a"; indG.font = "72px Anton, Impact, sans-serif"; indG.textAlign = "center"; indG.textBaseline = "middle"; indG.fillText(t, 128, 52); indT.needsUpdate = true; }
for (const [z, ry, y, w] of [[ELZ + .02, 0, 2.8, .6], [ELZ - .14, Math.PI, 2.62, .66]]) { const p = plane(w, w * .37, new THREE.MeshBasicMaterial({ map: indT })); p.rotation.y = ry; scene.add(at(p, 0, y, z)); }

// ---------- floors ----------
const SP = 2.6, Z0 = ELZ + 4.2, NDOORS = 14, CEND = Z0 + (NDOORS - 1) * SP + 2;
const floors = [];
function blockFor(i) {
  const Lv = LEVELS[i];
  if (i !== MINE) return { start: Lv[2], k: -1 };
  const k = Math.min(6, Math.floor((bed - Lv[2]) / 2));
  return { start: bed - 2 * k, k };
}
function bunkDoor(group, x, z, side, num, mine) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  if (mine) { g.add(at(box(.1, 2.35, .1, M.gold), -.575, 1.18, 0)); g.add(at(box(.1, 2.35, .1, M.gold), .575, 1.18, 0)); g.add(at(box(1.25, .12, .1, M.gold), 0, 2.29, 0)); }
  else g.add(at(box(1.25, 2.35, .1, M.dark), 0, 1.18, 0));
  const leaf = new THREE.Group(); leaf.position.set(-.52, 0, .02); g.add(leaf);
  leaf.add(at(box(1.05, 2.15, .12, M.steel), .52, 1.12, 0));
  leaf.add(at(new THREE.Mesh(new THREE.CircleGeometry(.2, 24), mine ? M.glass : M.off), .52, 1.75, .07));
  leaf.add(at(box(.6, .18, .02, M.dark), .52, .5, .07));
  if (num) { const t = plane(.9, .25, new THREE.MeshBasicMaterial({ map: label(fmt(num), { w: 384, h: 96, size: 80, fg: mine ? "#ffc23a" : "#b3aa90" }), transparent: true })); g.add(at(t, 0, 2.55, .06)); }
  if (mine) {
    leaf.add(at(plane(.9, .2, new THREE.MeshBasicMaterial({ map: label("@" + handle, { w: 512, h: 112, size: 52, fg: "#15100a", bg: "#ffc23a", font: "Inter" }) })), .52, 1.3, .07));
    if (founder) { const st = plane(.7, .2, new THREE.MeshBasicMaterial({ map: label("FOUNDER #" + founder, { w: 384, h: 96, size: 54, fg: "#e03a2e" }), transparent: true })); st.rotation.z = .12; leaf.add(at(st, .52, 1.0, .07)); }
    g.add(at(new THREE.PointLight(0xffc23a, 3, 4.5, 1.6), 0, 2.2, 1.2));
  }
  group.add(g); return { g, leaf };
}
function yourRoom(group, z) {
  const x0 = -5.4, x1 = -1.8, z0 = z - 1.7, z1 = z + 1.7;
  room(group, x0, x1, z0, z1, 0, M.tile);
  wallX(group, x0, z0, z1, 1); wallZ(group, z0, x0, x1, 1); wallZ(group, z1, x0, x1, -1);
  const back = plane(z1 - z0, H, M.wall); back.rotation.y = -Math.PI / 2; // the corridor wall seen from inside the room
  const bunk = new THREE.Group(); bunk.position.set(-4.85, 0, z);
  for (const dz of [-1, 1]) for (const dx of [-.4, .4]) bunk.add(at(box(.07, 1.9, .07, M.dark), dx, .95, dz * .95));
  const RM = { mats: [], pillows: [], z, x0, x1, z0, z1, group };
  for (const y of [.45, 1.45]) { bunk.add(at(box(.9, .1, 2.0, M.dark), 0, y, 0)); const m = box(.85, .14, 1.9, M.green.clone()); RM.mats.push(m); bunk.add(at(m, 0, y + .12, 0)); const pw = box(.6, .1, .3, M.white.clone()); RM.pillows.push(pw); bunk.add(at(pw, 0, y + .24, -.75)); }
  group.add(bunk);
  group.add(at(box(.5, 1.9, .5, M.steel), -5.1, .95, z + 1.35));
  group.add(at(box(.9, .4, .45, M.olive), -3.8, .2, z - 1.4));
  const poster = plane(.6, .8, new THREE.MeshBasicMaterial({ map: label("SURVIVE", { w: 256, h: 340, size: 60, fg: "#15100a", bg: "#ffc23a" }) })); poster.rotation.y = Math.PI; group.add(at(poster, -3.6, 1.7, z1 - .01)); RM.poster = poster;
  const plate = plane(1.6, .32, new THREE.MeshBasicMaterial({ map: label(`BED ${fmt(bed)} · @${handle}`, { w: 1024, h: 205, size: 80, fg: "#15100a", bg: "#ffc23a" }) })); plate.rotation.y = Math.PI / 2; group.add(at(plate, x0 + .01, 2.5, z));
  RM.light = new THREE.PointLight(0xffe0a0, 4, 6, 1.5); group.add(at(RM.light, -3.6, 2.7, z));
  return RM;
  group.add(at(box(.6, .04, .6, new THREE.MeshBasicMaterial({ color: 0xffe9b0 })), -3.6, H - .02, z));
}
// ---------- each floor's main area: a full room to walk around ----------
const AREAS = { B2: "MED BAY", B3: "THE GARDEN", B4: "MESS HALL", B5: "DORMITORY", B6: "ARMORY", B7: "ENGINEERING" };
const AW = 6, AD = 15; // half width, depth
function mainArea(g, i, out) {
  const Lv = LEVELS[i], t = Lv[0], tint = Lv[4], z0 = CEND, z1 = CEND + AD, cz = (z0 + z1) / 2;
  const floorM = t === "B2" ? std({ map: canvasTex(256, 256, (c, w, h) => { noise(c, w, h, "#bdbcb2", .04, 900); c.strokeStyle = "rgba(0,0,0,.2)"; for (let k = 0; k <= w; k += 64) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } }, [6, 7]), roughness: .6 })
    : t === "B3" ? std({ map: canvasTex(256, 256, (c, w, h) => noise(c, w, h, "#3b2f22", .07, 2600), [5, 6]), roughness: 1 })
    : std({ map: tileTex, roughness: .85 });
  room(g, -AW, AW, z0, z1, 0, floorM);
  wallX(g, -AW, z0, z1, 1); wallX(g, AW, z0, z1, -1); wallZ(g, z1, -AW, AW, -1);
  wallZ(g, z0, 1.8, AW, 1); wallZ(g, z0, -AW, -1.8, 1);
  const lampM = new THREE.MeshBasicMaterial({ color: t === "B3" ? 0xd36bff : tint });
  for (let x = -3.5; x <= 3.5; x += 3.5) for (let z = z0 + 2.5; z < z1 - 1; z += 4) g.add(at(box(1.4, .05, .3, lampM), x, H - .03, z));
  for (const [x, z] of [[-3, z0 + 3.5], [3, z0 + 3.5], [-3, z0 + 10.5], [3, z0 + 10.5]]) g.add(at(new THREE.PointLight(t === "B3" ? 0xd9a0ff : tint, 6, 11, 1.2), x, 2.7, z));
  g.add(at(new THREE.PointLight(0xfff0d8, 3, 10, 1.2), 0, 2.7, cz));
  sign(g, AREAS[t], 0, 2.66, z0 - .03, Math.PI, 2.2);
  sign(g, AREAS[t], 0, 2.9, z1 - .03, Math.PI, 3.2);
  const blocks = out.blocks = [];
  // put something down; if it has a footprint, nobody can walk through it
  const P = (o, x, y, z, w = 0, d = 0) => { g.add(at(o, x, y, z)); if (w && d) blocks.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }); return o; };
  const bunk = (x, z, rot = 0) => { const b = new THREE.Group(); for (const dz of [-1, 1]) for (const dx of [-.4, .4]) b.add(at(box(.07, 1.9, .07, M.dark), dx, .95, dz * .95)); for (const y of [.45, 1.45]) { b.add(at(box(.9, .1, 2.0, M.dark), 0, y, 0)); b.add(at(box(.85, .14, 1.9, M.green), 0, y + .12, 0)); b.add(at(box(.6, .1, .3, M.white), 0, y + .24, -.75)); } b.rotation.y = rot; return P(b, x, 0, z, rot ? 2.1 : 1.0, rot ? 1.0 : 2.1); };
  const crate = (x, z, s = .8, m = M.olive) => P(box(s, s, s, m), x, s / 2, z, s, s);
  const locker = (x, z, rot) => { const l = box(.55, 1.9, .5, M.steel); l.rotation.y = rot; return P(l, x, .95, z, .55, .55); };
  if (t === "B2") { // med bay: two rows of beds with curtain rails, an operating table, cabinets
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
      const z = z0 + 3 + k * 2.6, x = side * (AW - 1.1), bed = new THREE.Group();
      bed.add(at(box(1.9, .1, .9, M.steel), 0, .55, 0)); bed.add(at(box(1.8, .14, .85, M.white), 0, .67, 0)); bed.add(at(box(.35, .12, .6, M.white), side * .7, .8, 0));
      for (const dx of [-.85, .85]) for (const dz of [-.38, .38]) bed.add(at(box(.05, .55, .05, M.steel), dx, .27, dz));
      P(bed, x, 0, z, 1.9, .9);
      const rail = box(.03, .03, 2.2, M.steel); P(rail, x - side * 1.05, 2.5, z);
      const cur = plane(1.9, 1.7, std({ color: 0x9fc4c0, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .85 })); cur.rotation.y = Math.PI / 2; P(cur, x - side * 1.05, 1.6, z + .25);
      const iv = new THREE.Group(); iv.add(at(box(.04, 1.8, .04, M.steel), 0, .9, 0)); iv.add(at(box(.2, .28, .06, std({ color: 0xd8f0ff, transparent: true, opacity: .8 })), 0, 1.7, 0)); P(iv, x - side * .2, 0, z + .75, .2, .2);
    }
    const op = new THREE.Group(); op.add(at(box(2.0, .12, .8, M.steel), 0, .9, 0)); op.add(at(box(.3, .85, .3, M.dark), 0, .43, 0)); P(op, 0, 0, cz + 1.5, 2.0, .8);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.55, .7, .25, 20), M.steel); P(lamp, 0, 2.55, cz + 1.5); P(new THREE.Mesh(new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })), 0, 2.42, cz + 1.5).rotation.x = Math.PI / 2;
    for (const x of [-2.5, -1.2, 1.2, 2.5]) P(box(1.1, 2.0, .45, M.white), x, 1.0, z1 - .3, 1.1, .45);
    const cross = new THREE.Group(); cross.add(box(.7, .2, .02, M.red)); cross.add(box(.2, .7, .02, M.red)); cross.rotation.y = Math.PI; P(cross, 0, 2.3, z1 - .55);
  }
  if (t === "B3") { // garden: long planter rows under purple grow lights, a water tank, small trees
    const leaf = std({ color: 0x4f8f3a, roughness: .8 }), leaf2 = std({ color: 0x6aa84f, roughness: .8 }), soil = std({ color: 0x2a2016, roughness: 1 });
    for (const x of [-3.8, -1.3, 1.3, 3.8]) {
      const len = 9; P(box(1.0, .45, len, M.wood), x, .22, cz - .5, 1.0, len); P(box(.9, .05, len - .1, soil), x, .46, cz - .5);
      for (let k = 0; k < 14; k++) { const r = rnd(.12, .22), s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), k % 2 ? leaf : leaf2); P(s, x + rnd(-.3, .3), .5 + r * .8, cz - .5 - len / 2 + .4 + k * (len - .8) / 13); }
      const grow = box(.2, .05, len, new THREE.MeshBasicMaterial({ color: 0xd36bff })); P(grow, x, 2.4, cz - .5);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.2, 24), std({ color: 0x3a6b8f, roughness: .4, metalness: .3 })); P(tank, AW - 1.3, 1.1, z1 - 1.4, 1.8, 1.8);
    for (const x of [-AW + 1, -AW + 2.6]) { const tr = new THREE.Group(); tr.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 1.4, 8), M.wood), 0, .7, 0)); tr.add(at(new THREE.Mesh(new THREE.SphereGeometry(.7, 12, 10), leaf), 0, 1.7, 0)); tr.add(at(box(.7, .5, .7, M.wood), 0, .25, 0)); P(tr, x, 0, z1 - 1.2, .8, .8); }
  }
  if (t === "B4") { // mess hall: long tables and benches, a serving counter, pantry shelves
    for (const x of [-3.3, 0, 3.3]) for (const z of [z0 + 4, z0 + 8.5]) {
      P(box(1.0, .07, 3.4, M.wood), x, .76, z, 1.9, 3.4); for (const dz of [-1.4, 1.4]) P(box(.1, .72, .1, M.wood), x, .36, z + dz);
      for (const dx of [-.75, .75]) P(box(.3, .44, 3.2, M.wood), x + dx, .22, z);
      for (let k = 0; k < 3; k++) P(new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .12, 10), M.steel), x + rnd(-.2, .2), .86, z - 1 + k);
    }
    P(box(7, 1.0, .8, M.steel), 0, .5, z1 - 2.6, 7, .8); P(box(7, .06, .9, M.dark), 0, 1.03, z1 - 2.6);
    for (let k = 0; k < 5; k++) P(new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .25, 14), M.steel), -2.8 + k * 1.4, 1.18, z1 - 2.6);
    for (const x of [-AW + .3, AW - .3]) for (let k = 0; k < 4; k++) { const z = z0 + 2.5 + k * 2.8, sh = new THREE.Group(); for (const y of [.4, 1.0, 1.6, 2.2]) { sh.add(at(box(.5, .05, 2.2, M.wood), 0, y, 0)); for (let q = 0; q < 6; q++) sh.add(at(box(.3, .3, .28, q % 2 ? M.olive : std({ color: 0xa8743a })), 0, y + .18, -.9 + q * .36)); } P(sh, x, 0, z, .55, 2.2); }
  }
  if (t === "B5") { // dormitory: rows and rows of bunks with lockers
    for (const x of [-4.3, -1.7, 1.7, 4.3]) for (let k = 0; k < 4; k++) { const z = z0 + 2.6 + k * 3; bunk(x, z); locker(x + (x < 0 ? .8 : -.8), z + .6, 0); }
  }
  if (t === "B6") { // armory: equipment racks (everything stays racked), gear lockers, a briefing table
    const rack = (x, z, rot) => { const r = new THREE.Group(); r.add(at(box(.3, 2.2, 3.0, M.dark), 0, 1.1, 0)); for (let k = -5; k <= 5; k++) { r.add(at(box(.07, 1.1, .07, M.steel), .2, 1.25, k * .26)); r.add(at(box(.12, .25, .1, M.dark), .2, .65, k * .26)); } r.add(at(box(.35, .08, 3.0, M.steel), .1, .5, 0)); r.add(at(box(.35, .08, 3.0, M.steel), .1, 1.85, 0)); r.rotation.y = rot; return P(r, x, 0, z, rot ? 3.0 : .5, rot ? .5 : 3.0); };
    for (const z of [z0 + 3, z0 + 7, z0 + 11]) { rack(-AW + .3, z, 0); rack(AW - .3, z, Math.PI); }
    for (let k = 0; k < 6; k++) locker(-2.2 + k * .6, z1 - .35, 0);
    for (let k = 0; k < 5; k++) { const helmet = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.olive); P(helmet, -2.2 + k * .9 + .3, 2.05, z1 - .35); }
    const table = new THREE.Group(); table.add(at(box(2.6, .1, 1.6, M.wood), 0, .9, 0)); table.add(at(box(2.2, .85, 1.2, M.dark), 0, .43, 0));
    const map = plane(2.4, 1.4, new THREE.MeshBasicMaterial({ map: label("HATCH WATCH · B8", { w: 512, h: 300, size: 46, fg: "#ffc23a", bg: "#1d2a1a" }) })); map.rotation.set(-Math.PI / 2, 0, Math.PI); table.add(at(map, 0, .96, 0));
    P(table, 0, 0, cz, 2.6, 1.6);
    for (const [x, z] of [[-1.5, cz + 4], [1.6, cz + 4.3], [1.2, z0 + 2.4]]) crate(x, z, .75);
  }
  if (t === "B7") { // engineering: generators, a turbine, pipes, control panels with blinking lights
    for (const x of [-3.6, 3.6]) for (const z of [z0 + 4, z0 + 9]) { const gen = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.8, 22), M.steel); gen.rotation.x = Math.PI / 2; P(gen, x, 1.0, z, 2.0, 3.0); P(box(2.2, .02, 3.2, M.hazard), x, .015, z); P(box(.4, 1.6, .4, M.dark), x, .8, z + 1.7); }
    const turb = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.6, 28), std({ color: 0x8a6a3a, roughness: .4, metalness: .7 })); P(turb, 0, 1.3, z1 - 2.4, 2.8, 2.8);
    for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, AD, 10), M.pipe); p.rotation.x = Math.PI / 2; P(p, -AW + .3, .6 + k * .45, cz); const p2 = p.clone(); P(p2, AW - .3, .6 + k * .45, cz); }
    const panel = box(3.2, 1.2, .3, M.dark); P(panel, 0, .9, z0 + 2.2, 3.2, .4);
    out.blink = []; for (let k = 0; k < 12; k++) { const l = new THREE.Mesh(new THREE.CircleGeometry(.05, 10), new THREE.MeshBasicMaterial({ color: [0xff3b3b, 0x9cf04a, 0xffc23a][k % 3] })); l.rotation.y = Math.PI; P(l, -1.3 + (k % 6) * .5, .95 + Math.floor(k / 6) * .3, z0 + 2.04); out.blink.push(l); }
    const warn = new THREE.PointLight(0xff7a20, 0, 8, 1.4); P(warn, 0, 2.8, z1 - 2.4); out.warn = warn;
  }
  out.walk.push({ x0: -AW + .3, x1: AW - .3, z0: z0 - .1, z1: z1 - .3 });
  out.areaEntry = { x: 0, z: z0 + 1.2, yaw: Math.PI };
}
function buildFloor(i) {
  if (floors[i]) return floors[i];
  const Lv = LEVELS[i], g = new THREE.Group(), tint = Lv[4]; g.visible = false; scene.add(g);
  const { start, k } = blockFor(i);
  room(g, -1.8, 1.8, ELZ, CEND, tint);
  const myZ = k >= 0 ? Z0 + k * SP : null;
  if (myZ !== null) {
    wallX(g, -1.8, ELZ, myZ - .55, 1); wallX(g, -1.8, myZ + .55, CEND, 1);
    const lint = plane(1.1, H - 2.3, M.wall); lint.rotation.y = Math.PI / 2; g.add(at(lint, -1.8, 2.3 + (H - 2.3) / 2, myZ));
    for (const s of [-1, 1]) { const inn = plane(1.15, H, M.wall); inn.rotation.y = -Math.PI / 2; g.add(at(inn, -1.82, H / 2, myZ + s * 1.12)); }
    const innTop = plane(1.1, H - 2.3, M.wall); innTop.rotation.y = -Math.PI / 2; g.add(at(innTop, -1.82, 2.3 + (H - 2.3) / 2, myZ));
  } else wallX(g, -1.8, ELZ, CEND, 1);
  wallX(g, 1.8, ELZ, CEND, -1);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, CEND - ELZ, 8), M.pipe); p.rotation.x = Math.PI / 2; g.add(at(p, s * 1.65, H - .25, (ELZ + CEND) / 2)); }
  let mine = null;
  for (let d = 0; d < NDOORS; d++) {
    const z = Z0 + d * SP, nl = start + 2 * d, nr = nl + 1;
    const dl = bunkDoor(g, -1.8, z, -1, nl <= Lv[3] ? nl : 0, d === k); if (d === k) mine = dl;
    bunkDoor(g, 1.8, z, 1, nr <= Lv[3] ? nr : 0, false);
  }
  sign(g, `${Lv[0]} · ${Lv[1].toUpperCase()}`, 0, 2.62, ELZ + 6.5, Math.PI);
  sign(g, `${Lv[0]} · ${Lv[1].toUpperCase()}`, 0, 2.62, ELZ + 6.52, 0);
  sign(g, `BEDS ${fmt(start)} – ${fmt(Math.min(Lv[3], start + 2 * NDOORS - 1))}`, 0, 2.62, CEND - .4, Math.PI, 2.2, { fg: "#b3aa90" });
  const out = { group: g, mine, myZ, walk: [{ x0: -1.6, x1: 1.6, z0: ELZ + .05, z1: CEND }] };
  if (i === 0) {
    const z1 = CEND + 5, z2 = z1 + 9;
    room(g, -1.8, 1.8, CEND, z2, 0xd9ffd0);
    wallX(g, -1.8, CEND, z2, 1); wallX(g, 1.8, CEND, z2, -1); wallZ(g, z2, -1.8, 1.8, -1);
    const glow = new THREE.MeshBasicMaterial({ color: 0x9cf04a });
    for (const z of [CEND + 1.5, CEND + 3.5]) { for (const s of [-1, 1]) g.add(at(box(.25, H, .25, M.dark), s * 1.62, H / 2, z)); g.add(at(box(3.4, .25, .25, M.dark), 0, H - .12, z)); g.add(at(box(3.0, .04, .1, glow), 0, H - .26, z)); }
    for (const side of [1, -1]) {
      const s = new THREE.Shape(); s.moveTo(-1.8, 0); s.lineTo(1.8, 0); s.lineTo(1.8, H); s.lineTo(-1.8, H); s.lineTo(-1.8, 0);
      const hole = new THREE.Path(); hole.absarc(0, 1.55, 1.45, 0, Math.PI * 2, true); s.holes.push(hole);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(s, 32), M.wall); w.position.z = z1 + side * .002; if (side < 0) w.rotation.y = Math.PI; g.add(w);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.75, 48), M.hazard); ring.position.set(0, 1.55, z1 + side * .02); if (side < 0) ring.rotation.y = Math.PI; g.add(ring);
    }
    const welcome = plane(2.6, .4, new THREE.MeshBasicMaterial({ map: label("JOIN THE BUNKER", { w: 1024, h: 160, size: 120 }), transparent: true })); welcome.rotation.y = Math.PI; g.add(at(welcome, 0, 2.95, z1 + .05));
    const blast = new THREE.Group(); blast.position.set(0, 1.55, z1); g.add(blast);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, .35, 48), M.steel); d.rotation.x = Math.PI / 2; blast.add(d);
    for (const sd of [1, -1]) { const face = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), std({ color: 0x8a8670, roughness: .5, metalness: .6 })); face.position.z = sd * .18; if (sd < 0) face.rotation.y = Math.PI; blast.add(face); const wh = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 32), M.gold); wh.position.z = sd * .26; blast.add(wh); for (let q = 0; q < 4; q++) { const sp = box(.84, .06, .06, M.gold); sp.rotation.z = q * Math.PI / 4; sp.position.z = sd * .26; blast.add(sp); } }
    g.add(at(new THREE.PointLight(0xfff0d0, 3, 8, 1.5), 0, 2.6, z2 - 3));
    out.blast = blast; out.blastZ = z1; out.spawnZ = z2 - 1.6;
    out.walk.push({ x0: -1.6, x1: 1.6, z0: CEND - .1, z1: z1 - .25 }, { x0: -1.6, x1: 1.6, z0: z1 + .25, z1: z2 - .05 });
    out.gate = { x0: -1.0, x1: 1.0, z0: z1 - .5, z1: z1 + .5 };
  } else mainArea(g, i, out);
  if (myZ !== null) { out.room = yourRoom(g, myZ); decorate(out.room); out.roomWalk = { x0: -5.15, x1: -1.7, z0: myZ - 1.45, z1: myZ + 1.45 }; out.doorGap = { x0: -2.3, x1: -1.3, z0: myZ - .5, z1: myZ + .5 }; }
  floors[i] = out; return out;
}


// ---------- your saved room, in 3D, and the 3D room editor ----------
// Same save as the 2D room page (localStorage "bunkerRoom:<handle>"): coins, own, eq. Coins are only ever earned in the games.
function loadScript(src) { return new Promise(r => { const sc = document.createElement("script"); sc.src = src; sc.onload = () => r(true); sc.onerror = () => r(false); document.head.appendChild(sc); }); }
function svgCanvas(inner, vb, scale = 4) {
  return new Promise(res => {
    const [x, y, w, h] = vb, svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w * scale}" height="${h * scale}">${inner}</svg>`;
    const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale; c.getContext("2d").drawImage(img, 0, 0); res(c); }; img.onerror = () => res(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
function cropAlpha(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
}
const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const card = (c, hgt) => new THREE.Mesh(new THREE.PlaneGeometry(hgt * c.width / c.height, hgt), new THREE.MeshStandardMaterial({ map: texOf(c), transparent: true, alphaTest: .05, side: THREE.DoubleSide, roughness: .8 }));
const colorsIn = svg => [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map(m => m[1]).filter(c => !/^#1[0-2]1[0-2]1[0-2]$/i.test(c));
const ED = { st: null, BY: {}, SL: {}, ITEMS: [], petSnap: null, preview: null, sel: null, slot: "all", open: false, RM: null, thumbs: {} };
const MIG = { blanket: "blanket-red", poster: "poster-sunset", lights: "lights-rainbow", rug: "rug-braided", plant: "corner-plant", radio: "top-radio", petbed: "pet-cushion-blue", flag: "wall-banner-gold" };
const EDIT_SLOTS = [["all", "All"], ["blanket", "Blanket"], ["pillow", "Pillow"], ["wallA", "Poster"], ["wallB", "Wall"], ["top", "Locker top"], ["locker", "Footlocker"], ["rug", "Rug"], ["corner", "Corner"], ["lights", "Lights"]];
let edReady = null;
function loadEditor() {
  if (edReady) return edReady;
  edReady = (async () => {
    const ok = await loadScript("/room/items.js");
    if (ok && window.BK_ITEMS) { ED.BY = window.BK_ITEMS.BY; ED.SL = window.BK_ITEMS.SLOTS; ED.ITEMS = window.BK_ITEMS.ITEMS.filter(i => !i.pet); }
    let s = null; try { s = JSON.parse(localStorage.getItem("bunkerRoom:" + handle)); } catch (e) {}
    const st = Object.assign({ coins: 0, earned: 0, own: [], eq: {}, best: {} }, s || {});
    st.own = (st.own || []).map(x => MIG[x] || x).filter(x => ED.BY[x]); st.eq = st.eq || {};
    if (s && s.on) { for (const x of s.on) { const id = MIG[x] || x; if (ED.BY[id]) st.eq[ED.BY[id].slot] = id; } delete st.on; }
    ED.st = st;
    try { ED.petSnap = JSON.parse(localStorage.getItem("bunkerPetSvg:" + handle) || "null"); } catch (e) {}
  })();
  return edReady;
}
function saveRoom() { try { const cur = JSON.parse(localStorage.getItem("bunkerRoom:" + handle) || "{}"); localStorage.setItem("bunkerRoom:" + handle, JSON.stringify(Object.assign(cur, { coins: ED.st.coins, own: ED.st.own, eq: ED.st.eq, earned: ED.st.earned, best: ED.st.best }))); } catch (e) {} }
const worn = slot => { if (ED.preview && ED.BY[ED.preview].slot === slot) return ED.BY[ED.preview]; const id = ED.st && ED.st.eq[slot]; return id && ED.BY[id] ? ED.BY[id] : null; };

let decoRun = 0;
async function decorate(RM) {
  ED.RM = RM; await loadEditor(); const run = ++decoRun;
  const { z, x0, z0, z1, group } = RM, o = { lvl: MINE >= 0 ? LEVELS[MINE][0] : "B1" };
  const next = new THREE.Group(); // build the new look off-screen, then swap
  const reset = () => { RM.poster.visible = true; for (const m of RM.mats) { m.material.map = null; m.material.color.set(0x3f6b35); m.material.needsUpdate = true; } for (const p of RM.pillows) p.material.color.set(0xe8e4d6); RM.light.color.set(0xffe0a0); };
  const jobs = [], todo = [];
  const put = (slot, place) => { const it = worn(slot); if (!it || !ED.SL[slot]) return; const svg = it.draw(o); if (!svg) return; jobs.push(svgCanvas(svg, ED.SL[slot].box).then(c => { if (c) todo.push(() => place(c, svg, it)); })); };
  put("wallA", c => { const t = cropAlpha(c); if (!t) return; RM.poster.visible = false; const m = card(t, .95); m.rotation.y = Math.PI; next.add(at(m, -3.6, 1.75, z1 - .02)); });
  put("wallB", c => { const t = cropAlpha(c); if (!t) return; next.add(at(card(t, .85), -2.9, 1.8, z0 + .02)); });
  put("top", c => { const t = cropAlpha(c); if (!t) return; const m = card(t, .42); m.rotation.y = Math.PI / 2; next.add(at(m, -5.0, 2.11, z + 1.35)); });
  put("corner", c => { const t = cropAlpha(c); if (!t) return; const h = Math.min(1.5, .55 + t.height / 260), m = card(t, h); m.rotation.y = Math.PI / 2 + .5; next.add(at(m, -2.35, h / 2, z + 1.25)); });
  put("rug", c => { const t = cropAlpha(c); if (!t) return; const tx = texOf(t); tx.rotation = Math.PI / 2; tx.center.set(.5, .5); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ map: tx, transparent: true, alphaTest: .05, roughness: 1 })); m.rotation.x = -Math.PI / 2; next.add(at(m, -3.3, .006, z)); });
  put("locker", c => { next.add(at(plane(.9, .4, new THREE.MeshStandardMaterial({ map: texOf(c), roughness: .7 })), -3.8, .2, z0 + .526)); });
  put("blanket", c => { const t = texOf(c); for (const m of RM.mats) { m.material.map = t; m.material.color.set(0xffffff); m.material.needsUpdate = true; } });
  put("pillow", (c, svg) => { const col = colorsIn(svg)[0]; if (col) for (const p of RM.pillows) p.material.color.set(col); });
  put("lights", (c, svg) => {
    const cols = [...new Set(colorsIn(svg))].slice(0, 6); if (!cols.length) return; const n = 26;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), b = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: cols[i % cols.length] })); next.add(at(b, x0 + .1, H - .18 - Math.sin(t * Math.PI) * .25, z0 + .1 + t * (z1 - z0 - .2))); }
    RM.light.color.set(cols[0]).lerp(new THREE.Color(0xffe0a0), .6);
  });
  if (ED.petSnap && ED.petSnap.svg) {
    const k = ED.petSnap.k, A = { cat: [160, 168], dog: [160, 326], rabbit: [196, 330], critter: [200, 330], bird: [262, 262], fish: [96, 240], rodent: [262, 290], snake: [258, 292], lizard: [258, 292], turtle: [258, 292] }[k] || [200, 330];
    jobs.push(svgCanvas(ED.petSnap.svg, [A[0] - 62, A[1] - 52, 124, 82], 4).then(c => { const t = c && cropAlpha(c); if (t) todo.push(() => { const onBunk = k === "cat", h = Math.min(.75, Math.max(.3, t.height / 4 / 90)), m = card(t, h); m.rotation.y = Math.PI / 2; next.add(at(m, onBunk ? -4.5 : -3.3, (onBunk ? .64 : 0) + h / 2, onBunk ? z + .4 : z + .55)); }); }));
  }
  await Promise.all(jobs);
  if (run !== decoRun) return; // a newer change won
  reset(); todo.forEach(f => f());
  if (RM.deco) group.remove(RM.deco); RM.deco = next; group.add(next);
  if (!RM.hot) { // invisible tap targets: tap a spot in your room to change what goes there
    const hot = new THREE.Group(), inv = new THREE.MeshBasicMaterial({ visible: false }), add = (slot, w, h, d, x, y, zz) => { const m = box(w, h, d, inv); m.userData.slot = slot; hot.add(at(m, x, y, zz)); };
    add("wallA", 1.1, 1.1, .1, -3.6, 1.75, z1 - .05); add("wallB", 1.1, 1.0, .1, -2.9, 1.8, z0 + .05); add("top", .5, .5, .5, -5.0, 2.15, z + 1.35);
    add("corner", .8, 1.4, .8, -2.35, .7, z + 1.2); add("rug", 1.2, .05, 2.0, -3.3, .03, z); add("locker", .95, .45, .5, -3.8, .22, z0 + .3);
    add("blanket", .9, .3, 1.5, -4.85, .62, z + .25); add("blanket", .9, .3, 1.5, -4.85, 1.62, z + .25); add("pillow", .65, .2, .4, -4.85, .74, z - .75); add("pillow", .65, .2, .4, -4.85, 1.74, z - .75);
    add("lights", 3.2, .2, 3.2, -3.6, H - .15, z);
    group.add(hot); RM.hot = hot;
  }
}

// ---------- editor UI ----------
async function thumb(it) {
  if (ED.thumbs[it.id]) return ED.thumbs[it.id];
  const c = await svgCanvas(it.draw({ lvl: MINE >= 0 ? LEVELS[MINE][0] : "B1" }), ED.SL[it.slot].box, 2), t = c && cropAlpha(c);
  return ED.thumbs[it.id] = t ? t.toDataURL() : "";
}
async function renderEd() {
  const st = ED.st; $("edCoins").textContent = fmt(st.coins);
  $("edTabs").innerHTML = EDIT_SLOTS.map(([k, n]) => `<button type="button" data-s="${k}" class="${ED.slot === k ? "on" : ""}">${n}</button>`).join("");
  const list = ED.ITEMS.filter(i => ED.slot === "all" || i.slot === ED.slot).sort((a, b) => a.c - b.c);
  const urls = await Promise.all(list.map(thumb));
  $("edGrid").innerHTML = list.map((i, k) => { const own = st.own.includes(i.id), on = st.eq[i.slot] === i.id;
    return `<button type="button" data-i="${i.id}" class="${ED.sel === i.id ? "sel " : ""}${on ? "on " : ""}${i.rare ? "rare" : ""}"><span class="th">${urls[k] ? `<img src="${urls[k]}" alt="">` : ""}</span><b>${i.n}</b><small>${on ? "In your room" : own ? "Owned" : `<i class="cn"></i>${fmt(i.c)}`}</small></button>`; }).join("");
  const i = ED.sel && ED.BY[ED.sel], bar = $("edAct");
  if (!i) { bar.innerHTML = `<span class="tip">Tap an item to try it on. Tap something in your room to change it.</span>`; return; }
  const own = st.own.includes(i.id), on = st.eq[i.slot] === i.id;
  bar.innerHTML = `<div class="nm"><b>${i.n}</b><small>${i.d}</small></div>` + (on ? `<button type="button" data-a="off" class="ghost">Take off</button>` : own ? `<button type="button" data-a="on" class="go sm">PUT IT ON</button>` : st.coins >= i.c ? `<button type="button" data-a="buy" class="go sm">BUY · ${fmt(i.c)}</button>` : `<a class="ghost" href="/room/" data-a="earn">Need ${fmt(i.c - st.coins)} more · Play</a>`);
}
const FOCUS = { all: [-4.6, 1.2, 0], blanket: [-4.85, .9, .1], pillow: [-4.85, 1.0, -.7], wallA: [-3.6, 1.75, 1.7], wallB: [-2.9, 1.8, -1.7], top: [-5.0, 2.0, 1.35], corner: [-2.35, .7, 1.25], rug: [-3.3, 0, 0], locker: [-3.8, .25, -1.4], lights: [-4.2, 2.9, 0] };
const CAMAT = { corner: [-4.3, -.6], locker: [-3.0, .9], wallB: [-2.5, 1.1], wallA: [-2.5, -1.1] };
function focus(slot) {
  if (!F.myZ) return; const f = FOCUS[slot] || FOCUS.all, c = CAMAT[slot] || [-2.05, 0], cx = c[0], cz = F.myZ + c[1], tx = f[0], ty = f[1], tz = F.myZ + f[2];
  const dx = tx - cx, dz = tz - cz, dy = ty - 1.62;
  ED.cam = { x: cx, z: cz, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), t: 0 };
}
function openEd(slot) {
  if (MINE < 0) return;
  loadEditor().then(() => {
    ED.open = true; ED.slot = slot || ED.slot || "all"; ED.sel = null; ED.preview = null;
    document.body.classList.add("editing"); $("editor").classList.add("on");
    focus(ED.slot);
    renderEd(); ev("walk-editor");
  });
}
function closeEd() { ED.open = false; ED.cam = null; ED.sel = null; if (ED.preview) { ED.preview = null; decorate(ED.RM); } document.body.classList.remove("editing"); $("editor").classList.remove("on"); }
$("edTabs").onclick = e => { const b = e.target.closest("[data-s]"); if (!b) return; ED.slot = b.dataset.s; focus(ED.slot); renderEd(); };
$("edGrid").onclick = e => { const b = e.target.closest("[data-i]"); if (!b) return; ED.sel = b.dataset.i; ED.preview = ED.st.eq[ED.BY[ED.sel].slot] === ED.sel ? null : ED.sel; focus(ED.BY[ED.sel].slot); decorate(ED.RM); renderEd(); };
$("edAct").onclick = e => {
  const b = e.target.closest("[data-a]"); if (!b) return; const i = ED.BY[ED.sel], st = ED.st;
  if (b.dataset.a === "earn") { try { sessionStorage.setItem("bunkerOpenPlay", "1"); } catch (x) {} return; }
  if (b.dataset.a === "buy" && st.coins >= i.c && !st.own.includes(i.id)) { st.coins -= i.c; st.own.push(i.id); st.eq[i.slot] = i.id; ev("buy-" + i.id); tone(660, .12, "triangle", .12); tone(990, .2, "triangle", .1, .1); }
  if (b.dataset.a === "on") st.eq[i.slot] = i.id;
  if (b.dataset.a === "off") delete st.eq[i.slot];
  ED.preview = null; saveRoom(); decorate(ED.RM); renderEd();
};
$("edDone").onclick = closeEd;
$("edPlay").onclick = () => { try { sessionStorage.setItem("bunkerOpenPlay", "1"); } catch (x) {} };

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xfff2d8, 0x2a2014, .95));
const head = new THREE.PointLight(0xfff0d0, 5, 9, 1.6); scene.add(head);

// ---------- state ----------
const S = { lvl: 0, x: 0, z: 0, yaw: 0, pitch: 0, liftDoor: 0, riding: 0, rideTo: 0, rideT: 0, blastOpen: 0, myDoor: 0, inRoom: false, inLift: false, walked: 0, stepT: 0 };
const visited = new Set();
let F = null;
function showFloor(i) {
  floors.forEach((f, k) => { if (f) f.group.visible = k === i; });
  F = buildFloor(i); F.group.visible = true; S.lvl = i; setInd(LEVELS[i][0]);
  $("floorChip").textContent = `${LEVELS[i][0]} · ${LEVELS[i][1]}`;
  [...$("liftBtns").children].forEach((b, k) => b.classList.toggle("cur", k === i));
  if (!visited.has(i)) { visited.add(i); ev("walk-floor-" + LEVELS[i][0]); }
}

// ---------- walking areas ----------
const R = .28;
function areas() {
  const a = [...F.walk];
  a.push({ x0: -1.0, x1: 1.0, z0: ELZ - 2.4, z1: ELZ + .35, need: () => S.liftDoor > .85 || S.inLift });
  if (F.gate) a.push({ ...F.gate, need: () => S.blastOpen > .9 });
  if (F.doorGap) a.push({ ...F.doorGap, need: () => S.myDoor > .8 || S.inRoom }, { ...F.roomWalk, need: () => S.myDoor > .8 || S.inRoom });
  return a.filter(r => !r.need || r.need());
}
const inRect = (x, z, r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
function ok(x, z, list) { // the body must be inside open areas and clear of furniture
  if (F.blocks) for (const b of F.blocks) if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) return false;
  for (const [dx, dz] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R], [R * .7, R * .7], [-R * .7, R * .7], [R * .7, -R * .7], [-R * .7, -R * .7]]) if (!list.some(r => inRect(x + dx, z + dz, r))) return false;
  return true;
}
function tryMove(dx, dz) {
  const list = areas();
  if (ok(S.x + dx, S.z + dz, list)) { S.x += dx; S.z += dz; return true; }
  if (ok(S.x + dx, S.z, list)) { S.x += dx; return true; }
  if (ok(S.x, S.z + dz, list)) { S.z += dz; return true; }
  return false;
}

// ---------- controls: left thumb walks, right thumb looks; WASD + drag on a computer ----------
const el = renderer.domElement, joy = $("joy"), knob = $("knob");
const move = { x: 0, y: 0 }, touches = new Map(), keys = {};
const joyCenter = () => { const r = joy.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
function stick(e) { const c = joyCenter(), dx = e.clientX - c.x, dy = e.clientY - c.y, m = Math.hypot(dx, dy), k = Math.min(1, m / 52); move.x = m ? dx / m * k : 0; move.y = m ? dy / m * k : 0; knob.style.transform = `translate(${move.x * 38}px,${move.y * 38}px)`; }
el.addEventListener("pointerdown", e => {
  try { el.setPointerCapture(e.pointerId); } catch (x) {}
  const c = joyCenter(), nearStick = Math.hypot(e.clientX - c.x, e.clientY - c.y) < 110;
  const left = e.pointerType !== "mouse" && (nearStick || e.clientX < innerWidth * .4);
  touches.set(e.pointerId, { left, x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch });
  if (left) { joy.classList.add("on"); stick(e); }
  $("hint").classList.remove("on");
});
el.addEventListener("pointermove", e => {
  const t = touches.get(e.pointerId); if (!t) return;
  if (t.left) stick(e);
  else { const dx = e.clientX - t.x, dy = e.clientY - t.y; S.yaw = t.yaw - dx * .006; S.pitch = Math.max(-.7, Math.min(.7, t.pitch - dy * .004)); }
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function tapAt(cx, cy) {
  if (!S.inRoom || !F.room || !F.room.hot) return;
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects(F.room.hot.children, false)[0]; if (!hit) return;
  if (ED.open) { ED.slot = hit.object.userData.slot; focus(ED.slot); ED.sel = null; if (ED.preview) { ED.preview = null; decorate(ED.RM); } renderEd(); } else openEd(hit.object.userData.slot);
}
const up = e => { const t0 = touches.get(e.pointerId); if (t0 && !t0.left && Math.hypot(e.clientX - t0.x, e.clientY - t0.y) < 8) tapAt(e.clientX, e.clientY);
  const t = touches.get(e.pointerId); if (t && t.left) { move.x = move.y = 0; joy.classList.remove("on"); knob.style.transform = ""; } touches.delete(e.pointerId); };
el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

// ---------- lift panel ----------
LEVELS.forEach((Lv, i) => {
  const b = document.createElement("button"); b.type = "button";
  b.innerHTML = `<b>${Lv[0]}</b><span>${Lv[1]}</span>${i === MINE ? "<i>Your bed</i>" : ""}`;
  b.onclick = () => ride(i); $("liftBtns").appendChild(b);
});
function ride(i) {
  if (S.riding || i === S.lvl) return;
  S.rideTo = i; S.riding = 1; S.rideT = 0; thud(.35); tone(660, .15, "triangle", .12); ev("walk-lift-" + LEVELS[i][0]);
}
showFloor(0);
S.z = F.spawnZ; S.yaw = 0;

// ---------- guide ----------
function goal() {
  if (MINE < 0 || S.inRoom) return null;
  if (S.lvl !== MINE) return { x: 0, z: ELZ - 1.2, text: S.inLift ? `Your bed is on ${LEVELS[MINE][0]}` : `Lift to ${LEVELS[MINE][0]}` };
  return { x: -1.8, z: F.myZ, text: `Bed ${fmt(bed)}` };
}

// ---------- loop ----------
let last = performance.now(), started = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  let moving = false;
  if (started && !S.riding && !ED.open) {
    let mx = move.x, my = move.y;
    if (keys.w || keys.arrowup) my = -1; if (keys.s || keys.arrowdown) my = 1; if (keys.a) mx = -1; if (keys.d) mx = 1;
    if (keys.arrowleft) S.yaw += dt * 2; if (keys.arrowright) S.yaw -= dt * 2;
    const sp = 2.4 * dt, fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
    const dx = (fx * -my + rx * mx) * sp, dz = (fz * -my + rz * mx) * sp;
    if ((dx || dz) && tryMove(dx, dz)) { moving = true; S.walked += Math.hypot(dx, dz); if (S.walked - S.stepT > .75) { S.stepT = S.walked; thud(.1); } }
  }
  S.inLift = S.z < ELZ - .15;
  S.inRoom = !!F.roomWalk && S.x < -1.9;
  if (F.blast) {
    if (Math.abs(S.z - F.blastZ) < 4.5 && S.blastOpen === 0 && started) { S.blastOpen = .001; thud(.6); tone(90, 1.4, "sawtooth", .08); ev("walk-blast"); }
    if (S.blastOpen > 0 && S.blastOpen < 1) S.blastOpen = Math.min(1, S.blastOpen + dt / 1.8);
    const k = S.blastOpen * S.blastOpen * (3 - 2 * S.blastOpen); F.blast.position.x = -k * 3.2; F.blast.rotation.z = k * 2.2;
  }
  const nearLift = S.z < ELZ + 3 && Math.abs(S.x) < 1.7;
  const want = S.riding ? 0 : nearLift ? 1 : 0, prev = S.liftDoor;
  S.liftDoor += Math.sign(want - S.liftDoor) * Math.min(Math.abs(want - S.liftDoor), dt / .7);
  if (prev < .01 && S.liftDoor >= .01) tone(880, .12, "triangle", .08);
  doorL.position.x = -.525 - S.liftDoor; doorR.position.x = .525 + S.liftDoor;
  if (S.riding) {
    if (!S.inLift) S.riding = 0;
    else if (S.liftDoor <= .001) {
      S.rideT += dt; humOn(true);
      const from = S.lvl, to = S.rideTo, dur = 1.2 + .5 * Math.abs(to - from), k = Math.min(1, S.rideT / dur);
      setInd(LEVELS[Math.round(from + (to - from) * k)][0]);
      if (k >= 1) { humOn(false); tone(880, .25, "triangle", .14); showFloor(to); S.riding = 0; S.myDoor = 0; }
    }
  }
  const lp = started && S.inLift && !S.riding; $("liftPanel").classList.toggle("on", lp); document.body.classList.toggle("lift", lp); document.body.classList.toggle("inroom", S.inRoom);
  if (F.mine) {
    const near = Math.hypot(S.x + 1.8, S.z - F.myZ) < 2.4 || S.inRoom, t = near ? 1 : 0, p0 = S.myDoor;
    S.myDoor += Math.sign(t - S.myDoor) * Math.min(Math.abs(t - S.myDoor), dt / .6);
    if (p0 === 0 && S.myDoor > 0) { thud(.3, 260); if (!S.doorFirst) { S.doorFirst = 1; ev("walk-door"); } }
    F.mine.leaf.rotation.y = S.myDoor * 1.7;
  }
  $("roomBar").classList.toggle("on", S.inRoom && !ED.open);
  if (S.inRoom && !S.roomFirst) { S.roomFirst = 1; ev("walk-room"); tone(523, .3, "sine", .12); tone(784, .5, "sine", .1, .18); }
  const gl = started ? goal() : null;
  if (gl) {
    const ang = Math.atan2(-(gl.x - S.x), -(gl.z - S.z)) - S.yaw, dist = Math.hypot(gl.x - S.x, gl.z - S.z);
    $("garrow").style.transform = `rotate(${-ang}rad)`;
    $("gtext").textContent = gl.text + (dist > 2.5 && S.lvl === MINE ? ` · ${Math.round(dist)} m` : "");
    $("guide").classList.add("on");
  } else $("guide").classList.remove("on");
  if (ED.open && ED.cam) { const c = ED.cam, k = Math.min(1, dt * 5); c.t += dt; if (c.t < 1.2) { S.x += (c.x - S.x) * k; S.z += (c.z - S.z) * k; let dy = c.yaw - S.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); S.yaw += dy * k; S.pitch += (c.pitch - S.pitch) * k; } }
  const off = ED.open ? innerHeight * .26 : 0; if (off !== (cam.view && cam.view.enabled ? cam.view.offsetY : 0)) { if (off) cam.setViewOffset(innerWidth, innerHeight, 0, off, innerWidth, innerHeight); else cam.clearViewOffset(); }
  if (F.blink) F.blink.forEach((l, k) => { l.visible = Math.sin(now / (180 + k * 37) + k) > -.2; }); if (F.warn) F.warn.intensity = Math.max(0, Math.sin(now / 300)) * 4;
  const bob = moving ? Math.sin(now / 110) * .03 : 0, shake = S.riding && S.liftDoor <= .001 ? Math.sin(now / 25) * .004 : 0;
  cam.position.set(S.x + shake, 1.62 + bob, S.z);
  cam.rotation.set(S.pitch, S.yaw, 0);
  head.intensity = S.inLift ? 1.2 : 5; head.position.set(S.x - Math.sin(S.yaw) * 1.5, 2.4, S.z - Math.cos(S.yaw) * 1.5);
  renderer.render(scene, cam);
}
requestAnimationFrame(frame);

function start() {
  if (!ac) audioOn(); if (ac && ac.state === "suspended") ac.resume();
  $("cover").classList.add("off"); started = true; document.body.classList.add("playing");
  if (qs.get("at") === "room" && MINE >= 0 && !S.startedOnce) { showFloor(MINE); S.myDoor = 1; S.x = -3.0; S.z = F.myZ - .2; S.yaw = Math.PI / 2 + .25; S.pitch = -.12; }
  S.startedOnce = true; ev("walk-start");
  setTimeout(() => $("hint").classList.add("on"), 600); setTimeout(() => $("hint").classList.remove("on"), 7000);
}
$("start").onclick = start;
$("roomGo").onclick = e => { e.preventDefault(); openEd("all"); };
$("start").disabled = false; $("start").textContent = "▶ ENTER";
// ---------- quick travel ----------
let travelling = false;
function travel(dest) {
  if (travelling || S.riding) return; travelling = true; $("travelMenu").classList.remove("on");
  if (ED.open) closeEd();
  $("fade").classList.add("on"); tone(520, .18, "triangle", .08); tone(780, .22, "triangle", .06, .08);
  setTimeout(() => {
    if (dest === "room" && MINE >= 0) { showFloor(MINE); S.myDoor = 1; S.x = -3.0; S.z = F.myZ - .2; S.yaw = Math.PI / 2 + .25; S.pitch = -.12; }
    else if (dest === "lift") { S.x = 0; S.z = ELZ - 1.3; S.yaw = Math.PI; S.pitch = 0; S.liftDoor = 1; }
    else if (dest === "door") { showFloor(0); S.blastOpen = 1; S.x = 0; S.z = F.blastZ - 2.2; S.yaw = 0; S.pitch = 0; }
    else if (dest.startsWith("area")) { const i = +dest.slice(4); showFloor(i); const e = F.areaEntry; S.x = e.x; S.z = e.z; S.yaw = e.yaw; S.pitch = 0; }
    ev("walk-travel-" + dest);
    setTimeout(() => { $("fade").classList.remove("on"); travelling = false; }, 60);
  }, 260);
}
{
  const nice = t => t.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
  const places = [];
  if (MINE >= 0) places.push(["room", "My room", `Bed ${fmt(bed)} · ${LEVELS[MINE][0]}`]);
  places.push(["lift", "The lift", "Pick any floor"], ["door", "Entrance", "B1 · the blast door"]);
  LEVELS.forEach((Lv, i) => { if (AREAS[Lv[0]]) places.push(["area" + i, nice(AREAS[Lv[0]]), Lv[0] + " · " + Lv[1]]); });
  $("travelList").innerHTML = places.map(([k, n, d]) => `<button type="button" data-go="${k}"><b>${n}</b><small>${d}</small></button>`).join("");
  $("travelList").onclick = e => { const b = e.target.closest("[data-go]"); if (b) travel(b.dataset.go); };
  $("travelBtn").onclick = () => $("travelMenu").classList.toggle("on");
  $("travelClose").onclick = () => $("travelMenu").classList.remove("on");
}
if (qs.get("at") === "room" && MINE >= 0) { $("ctitle").innerHTML = `YOUR<br><b>ROOM</b>`; $("csub").textContent = `Bed ${fmt(bed)} on ${LEVELS[MINE][0]}. Walk out to explore the bunker. Sound on.`; }
window.__bk = { S, start, ride, tp: (lvl, x, z, yaw) => { showFloor(lvl); S.x = x; S.z = z; if (yaw != null) S.yaw = yaw; }, get F() { return F; } };
