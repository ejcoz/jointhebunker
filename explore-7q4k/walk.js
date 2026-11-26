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
  for (const y of [.45, 1.45]) { bunk.add(at(box(.9, .1, 2.0, M.dark), 0, y, 0)); bunk.add(at(box(.85, .14, 1.9, M.green), 0, y + .12, 0)); bunk.add(at(box(.6, .1, .3, M.white), 0, y + .24, -.75)); }
  group.add(bunk);
  group.add(at(box(.5, 1.9, .5, M.steel), -5.1, .95, z + 1.35));
  group.add(at(box(.9, .4, .45, M.olive), -3.8, .2, z - 1.4));
  const poster = plane(.6, .8, new THREE.MeshBasicMaterial({ map: label("SURVIVE", { w: 256, h: 340, size: 60, fg: "#15100a", bg: "#ffc23a" }) })); poster.rotation.y = Math.PI; group.add(at(poster, -3.6, 1.7, z1 - .01));
  const plate = plane(1.6, .32, new THREE.MeshBasicMaterial({ map: label(`BED ${fmt(bed)} · @${handle}`, { w: 1024, h: 205, size: 80, fg: "#15100a", bg: "#ffc23a" }) })); plate.rotation.y = Math.PI / 2; group.add(at(plate, x0 + .01, 2.5, z));
  group.add(at(new THREE.PointLight(0xffe0a0, 4, 6, 1.5), -3.6, 2.7, z));
  group.add(at(box(.6, .04, .6, new THREE.MeshBasicMaterial({ color: 0xffe9b0 })), -3.6, H - .02, z));
}
function theme(group, i, cz) {
  const t = LEVELS[i][0], P = (o, x, y, z) => group.add(at(o, x, y, z));
  if (t === "B2") { for (const x of [-2.4, 2.4]) { P(box(.9, .5, 2, M.white), x, .45, cz); P(box(.9, .1, 2, M.dark), x, .2, cz); } const cross = new THREE.Group(); cross.add(box(.5, .14, .02, M.red)); cross.add(box(.14, .5, .02, M.red)); cross.rotation.y = Math.PI; P(cross, 0, 2.3, cz + 3.15); }
  if (t === "B3") { for (const x of [-2.6, 2.6]) for (const dz of [-1.5, 0, 1.5]) { P(box(.9, .5, 1.1, M.wood), x, .25, cz + dz); for (let k = 0; k < 3; k++) P(new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), M.green), x + rnd(-.25, .25), .65, cz + dz + rnd(-.3, .3)); } }
  if (t === "B4") { P(box(1.2, .08, 3.6, M.wood), 0, .78, cz); P(box(.12, .74, .12, M.wood), 0, .37, cz - 1.5); P(box(.12, .74, .12, M.wood), 0, .37, cz + 1.5); for (const x of [-.95, .95]) P(box(.3, .45, 3.4, M.wood), x, .23, cz); for (const [x, z] of [[-2.9, cz - 2], [2.9, cz + 1.8], [2.8, cz - 2.2]]) P(box(.8, .8, .8, M.olive), x, .4, z); }
  if (t === "B5") { for (const x of [-2.7, 2.7]) for (const dz of [-1.3, 1.3]) for (const y of [.45, 1.45]) { P(box(.9, .1, 2, M.dark), x, y, cz + dz); P(box(.85, .14, 1.9, M.green), x, y + .12, cz + dz); } }
  if (t === "B6") { for (const x of [-3.3, 3.3]) { P(box(.3, 2.2, 3.4, M.dark), x, 1.1, cz); for (let k = -6; k <= 6; k++) P(box(.06, 1.2, .06, M.steel), x + (x < 0 ? .22 : -.22), 1.2, cz + k * .24); } }
  if (t === "B7") { for (const x of [-2.5, 2.5]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 2.4, 20), M.steel); g.rotation.x = Math.PI / 2; P(g, x, .8, cz); P(box(1.6, .02, 2.6, M.hazard), x, .02, cz); } }
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
  } else {
    const cz = CEND + 3.2, z2 = CEND + 6.4;
    room(g, -3.6, 3.6, CEND, z2, tint);
    wallX(g, -3.6, CEND, z2, 1); wallX(g, 3.6, CEND, z2, -1); wallZ(g, z2, -3.6, 3.6, -1);
    wallZ(g, CEND, 1.8, 3.6, 1); wallZ(g, CEND, -3.6, -1.8, 1);
    theme(g, i, cz);
    g.add(at(new THREE.PointLight(tint, 4, 9, 1.4), 0, 2.6, cz));
    out.walk.push({ x0: -3.3, x1: 3.3, z0: CEND - .1, z1: z2 - .05 });
  }
  if (myZ !== null) { yourRoom(g, myZ); out.roomWalk = { x0: -5.15, x1: -1.7, z0: myZ - 1.45, z1: myZ + 1.45 }; out.doorGap = { x0: -2.3, x1: -1.3, z0: myZ - .5, z1: myZ + .5 }; }
  floors[i] = out; return out;
}

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
function ok(x, z, list) { // the body (a small square) must be covered by open areas
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
const up = e => { const t = touches.get(e.pointerId); if (t && t.left) { move.x = move.y = 0; joy.classList.remove("on"); knob.style.transform = ""; } touches.delete(e.pointerId); };
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
  if (started && !S.riding) {
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
  $("roomBar").classList.toggle("on", S.inRoom);
  if (S.inRoom && !S.roomFirst) { S.roomFirst = 1; ev("walk-room"); tone(523, .3, "sine", .12); tone(784, .5, "sine", .1, .18); }
  const gl = started ? goal() : null;
  if (gl) {
    const ang = Math.atan2(-(gl.x - S.x), -(gl.z - S.z)) - S.yaw, dist = Math.hypot(gl.x - S.x, gl.z - S.z);
    $("garrow").style.transform = `rotate(${-ang}rad)`;
    $("gtext").textContent = gl.text + (dist > 2.5 && S.lvl === MINE ? ` · ${Math.round(dist)} m` : "");
    $("guide").classList.add("on");
  } else $("guide").classList.remove("on");
  const bob = moving ? Math.sin(now / 110) * .03 : 0, shake = S.riding && S.liftDoor <= .001 ? Math.sin(now / 25) * .004 : 0;
  cam.position.set(S.x + shake, 1.62 + bob, S.z);
  cam.rotation.set(S.pitch, S.yaw, 0);
  head.intensity = S.inLift ? 1.2 : 5; head.position.set(S.x - Math.sin(S.yaw) * 1.5, 2.4, S.z - Math.cos(S.yaw) * 1.5);
  renderer.render(scene, cam);
}
requestAnimationFrame(frame);

function start() {
  if (!ac) audioOn(); if (ac && ac.state === "suspended") ac.resume();
  $("cover").classList.add("off"); started = true; document.body.classList.add("playing"); ev("walk-start");
  setTimeout(() => $("hint").classList.add("on"), 600); setTimeout(() => $("hint").classList.remove("on"), 7000);
}
$("start").onclick = start;
$("roomGo").href = roomUrl;
$("start").disabled = false; $("start").textContent = "▶ ENTER";
window.__bk = { S, start, ride, tp: (lvl, x, z, yaw) => { showFloor(lvl); S.x = x; S.z = z; if (yaw != null) S.yaw = yaw; }, get F() { return F; } };
