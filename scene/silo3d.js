// Home page hero: the bunker silo in 3D (episode 1 cutaway look). Drag to turn it, tap a floor to look inside.
// Falls back to the SVG silo if WebGL isn't available. Talks to the page through window.bkTour (tap a floor).
import * as THREE from "/vendor/three.module.min.js";

const fig = document.getElementById("fig");
const svgSilo = document.getElementById("silo");
if (fig && svgSilo) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" }); } catch (e) { renderer = null; }
  if (renderer) start(renderer);
}

function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

function start(renderer) {
  const IDS = ["B1", "B2", "B3", "B4", "B5", "B6", "B7"];
  const R = 1, FH = 0.42, TOP = 1.45;                       // radius, floor height, top of B1
  const fy = i => TOP - i * FH;                               // ceiling of floor i
  const BOTTOM = fy(7);

  const cv = renderer.domElement; cv.id = "silo3d"; cv.className = "stage on";
  cv.setAttribute("aria-hidden", "true");
  fig.insertBefore(cv, svgSilo);
  fig.classList.add("td");
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120d09, 9, 18);
  const cam = new THREE.PerspectiveCamera(32, 3 / 4, 0.1, 50);

  // ---- backdrop: rust sky, ruined skyline, packed dirt ----
  const back = canvasTex(1024, 1365, (g, w, h) => {
    const sky = h * 0.2;
    let gr = g.createLinearGradient(0, 0, 0, sky); gr.addColorStop(0, "#140e0a"); gr.addColorStop(1, "#5a3417"); g.fillStyle = gr; g.fillRect(0, 0, w, sky);
    g.fillStyle = "#1a120c";
    for (let x = 0; x < w;) { const bw = 30 + Math.random() * 70, bh = sky * (0.25 + Math.random() * 0.6); g.fillRect(x, sky - bh, bw * 0.8, bh); if (Math.random() < .5) g.fillRect(x + bw * .2, sky - bh - 18, 8, 18); x += bw; }
    gr = g.createLinearGradient(0, sky, 0, h); gr.addColorStop(0, "#2a2016"); gr.addColorStop(1, "#0e0a07"); g.fillStyle = gr; g.fillRect(0, sky, w, h - sky);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${50 + Math.random() * 20},${40 + Math.random() * 15},${28 + Math.random() * 10},${.4 + Math.random() * .5})`; g.beginPath(); g.ellipse(Math.random() * w, sky + 8 + Math.random() * (h - sky), 2 + Math.random() * 6, 1.5 + Math.random() * 4, 0, 0, 7); g.fill(); }
  });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(13, 17.3), new THREE.MeshBasicMaterial({ map: back, fog: false }));
  bd.position.set(0, -0.9, -4.5); scene.add(bd);
  const surfaceY = TOP + 0.62;                                  // ground level (top of the dirt)

  // ---- light ----
  scene.add(new THREE.HemisphereLight(0xffe8c4, 0x2a2016, 1.0));
  const key = new THREE.DirectionalLight(0xffe0b8, 1.1); key.position.set(2.5, 4, 5); scene.add(key);

  // ---- the shell (back half, open to the camera) ----
  const concrete = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#a9a48c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { const v = 130 + Math.random() * 60; g.fillStyle = `rgba(${v},${v - 5},${v - 25},.18)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.strokeStyle = "rgba(60,58,45,.35)"; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping; concrete.repeat.set(3, 2);
  const half = { thetaStart: Math.PI / 2, thetaLength: Math.PI };
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TOP - BOTTOM, 48, 1, true, half.thetaStart, half.thetaLength),
    new THREE.MeshStandardMaterial({ color: 0x5a5644, roughness: .95, side: THREE.BackSide }));
  inner.position.y = (TOP + BOTTOM) / 2; scene.add(inner);
  const outerH = TOP - BOTTOM + 0.3;
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(R + .1, R + .1, outerH, 48, 1, true, half.thetaStart, half.thetaLength),
    new THREE.MeshStandardMaterial({ map: concrete, roughness: .9 }));
  outer.position.y = (TOP + .3 + BOTTOM) / 2; scene.add(outer);
  // cut faces of the wall (left and right edges) and the top rim
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(.1, outerH, .06), new THREE.MeshStandardMaterial({ map: concrete, roughness: .9 })); e.position.set(sx * (R + .05), outer.position.y, 0); scene.add(e); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + .05, .07, 10, 64), new THREE.MeshStandardMaterial({ color: 0xbdb89e, roughness: .8 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = TOP + .3; scene.add(rim);

  // ---- floors ----
  const LVL = [];                                              // per floor: hit mesh, strip indices, glow light
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xa9a48c, roughness: .9 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xbdb89e, roughness: .9 });
  const bunkGeo = new THREE.BoxGeometry(.14, .085, .05), stripGeo = new THREE.BoxGeometry(.14, .022, .056);
  const PER = 15, ROWS = 2, N = PER * ROWS * 7;
  const bunks = new THREE.InstancedMesh(bunkGeo, new THREE.MeshStandardMaterial({ color: 0x0d0e0b, roughness: .8 }), N);
  const strips = new THREE.InstancedMesh(stripGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  const GREEN = new THREE.Color(0x9cf04a), GOLD = new THREE.Color(0xffc23a), OFF = new THREE.Color(0x26301c);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  const labelTex = id => canvasTex(128, 64, (g, w, h) => { g.font = "48px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f2c230"; g.fillText(id, w / 2, h / 2 + 2); });
  IDS.forEach((id, i) => {
    const ceil = fy(i), floorY = ceil - FH;
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .05, 48, 1, false, half.thetaStart, half.thetaLength), slabMat);
    slab.position.y = floorY + .025; scene.add(slab);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2 * R, .07, .05), lipMat); lip.position.set(0, floorY + .025, -.0); scene.add(lip);
    const idx = [];
    for (let r = 0; r < ROWS; r++) for (let j = 0; j < PER; j++) {
      const skip = id === "B3" || (id !== "B5" && r === 0) || (id === "B7" && j > 9);
      const a = Math.PI / 2 + .22 + (j / (PER - 1)) * (Math.PI - .44);
      const rad = R - .06, x = rad * Math.sin(a), z = rad * Math.cos(a), y = floorY + .09 + r * .13;
      q.setFromAxisAngle(up, a + Math.PI);
      m4.compose(new THREE.Vector3(x, skip ? -99 : y, z), q, new THREE.Vector3(1, 1, 1)); bunks.setMatrixAt(k, m4);
      m4.compose(new THREE.Vector3(x * .985, skip ? -99 : y - .045, z * .985), q, new THREE.Vector3(1, 1, 1)); strips.setMatrixAt(k, m4);
      strips.setColorAt(k, OFF); idx.push(k); k++;
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(id), transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(.36, .18, 1); sp.position.set(-R - .38, floorY + .2, .05); scene.add(sp);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(R + .12, R + .12, FH - .02, 24, 1, false), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = floorY + FH / 2; hit.userData.id = id; scene.add(hit);
    const glow = new THREE.PointLight(0xffc23a, 0, 1.6, 2); glow.position.set(0, floorY + .22, -.3); scene.add(glow);
    LVL.push({ id, idx, hit, glow, floorY, on: 0 });
  });
  scene.add(bunks, strips);
  // the top cap of B1 (roof slab) and a hint of each floor's character
  { const roof = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .06, 48, 1, false, half.thetaStart, half.thetaLength), slabMat); roof.position.y = TOP + .03; scene.add(roof); }
  const L = id => LVL[IDS.indexOf(id)];
  const b2led = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); scene.add(b2led);
  const hz = canvasTex(512, 32, (g, w, h) => { g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, h); g.fillStyle = "#15100a"; for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x, h); g.lineTo(x - 16, h); g.fill(); } });
  hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(4, 1);
  // ---- what each floor is for (props sit in front of the bunks, signs on the back wall) ----
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const sign = (id, txt, col, bg = "#15120c") => { const f = L(id).floorY;
    const tx = canvasTex(256, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); g.font = "38px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); });
    const ang = Math.PI - .34, m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .085), new THREE.MeshBasicMaterial({ map: tx, fog: false })); const lv = IDS.indexOf(id); m.position.set(.86 * Math.sin(ang), f + .34 - lv * .028, .86 * Math.cos(ang)); m.rotation.y = ang + Math.PI; scene.add(m); };
  // B1 entry and decontamination: shower stalls, a yellow decon line, plastic sheeting, the airlock
  { const f = L("B1").floorY, pipe = M(0x9a9a8c, { metalness: .5 }), water = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: .35 });
    for (let n = 0; n < 3; n++) { const x = -.62 + n * .2; add(new THREE.CylinderGeometry(.008, .008, .3, 6), pipe, x, f + .17, -.62); add(new THREE.CylinderGeometry(.03, .02, .02, 10), pipe, x, f + .31, -.58); add(new THREE.ConeGeometry(.045, .26, 10, 1, true), water, x, f + .17, -.58); }
    add(new THREE.BoxGeometry(.9, .006, .05), new THREE.MeshBasicMaterial({ map: hz }), -.1, f + .056, -.3);
    const sheet = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, transparent: true, opacity: .28, side: THREE.DoubleSide, roughness: .3 });
    for (const x of [.18, .36]) add(new THREE.PlaneGeometry(.16, .3), sheet, x, f + .2, -.42, .2);
    sign("B1", "DECON", "#f2c230"); }
  // B2 command and medical: med beds with white sheets, a red cross, the radio desk
  { const f = L("B2").floorY, white = M(0xe8e4d8), frame = M(0x6c6855, { metalness: .4 });
    for (const x of [-.6, -.36]) { add(new THREE.BoxGeometry(.18, .02, .08), white, x, f + .11, -.5); add(new THREE.BoxGeometry(.18, .01, .08), frame, x, f + .095, -.5); for (const dx of [-.08, .08]) add(new THREE.BoxGeometry(.012, .05, .07), frame, x + dx, f + .075, -.5); add(new THREE.BoxGeometry(.05, .02, .07), white, x - .06, f + .13, -.5); }
    const cross = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, w, h); g.fillStyle = "#e0312b"; g.fillRect(24, 8, 16, 48); g.fillRect(8, 24, 48, 16); });
    add(new THREE.PlaneGeometry(.1, .1), new THREE.MeshBasicMaterial({ map: cross, fog: false }), -.48, f + .32, -.93);
    add(new THREE.BoxGeometry(.2, .08, .08), M(0x2a2a22), .55, f + .09, -.62);
    add(new THREE.PlaneGeometry(.12, .05), new THREE.MeshBasicMaterial({ color: 0x5cff7a }), .55, f + .12, -.578);
    b2led.position.set(.66, f + .15, -.58);
    sign("B2", "MED · RADIO", "#ff5a4a"); }
  // B3 the garden: planters, leaves, pink grow-lights
  { const f = L("B3").floorY; const box = M(0x4a3a22, { roughness: .9 });
    const leaf = [0x5fb036, 0x86cc45, 0x3f8a2a].map(c => M(c));
    for (let j = 0; j < 9; j++) { const a = Math.PI / 2 + .3 + j / 8 * (Math.PI - .6), x = .82 * Math.sin(a), z = .82 * Math.cos(a);
      add(new THREE.BoxGeometry(.16, .06, .1), box, x, f + .08, z, a);
      for (let n = 0; n < 3; n++) add(new THREE.SphereGeometry(.045 + (n % 2) * .015, 8, 6), leaf[(j + n) % 3], x + (n - 1) * .045, f + .15 + (n % 2) * .04, z); }
    for (const x of [-.4, 0, .4]) add(new THREE.BoxGeometry(.22, .012, .03), new THREE.MeshBasicMaterial({ color: 0xff7ad8 }), x, f + .39, -.45);
    const pink = new THREE.PointLight(0xff6ad0, .5, .55, 2); pink.position.set(0, f + .2, -.5); scene.add(pink);
    sign("B3", "GARDEN", "#9cf04a"); }
  // B4 commons and pantry: mess tables and benches, shelves of tins
  { const f = L("B4").floorY, wood = M(0x6a4a2a), tin = [0xc0392b, 0xd8b04a, 0x5d8aa8, 0x8a8a7a].map(c => M(c, { metalness: .5, roughness: .4 }));
    for (const x of [-.45, .05]) { add(new THREE.BoxGeometry(.34, .015, .1), wood, x, f + .1, -.4); for (const dz of [-.08, .08]) add(new THREE.BoxGeometry(.32, .01, .03), wood, x, f + .07, -.4 + dz); for (const dx of [-.15, .15]) add(new THREE.BoxGeometry(.012, .05, .08), wood, x + dx, f + .075, -.4); }
    add(new THREE.BoxGeometry(.26, .24, .07), M(0x3a3226), .64, f + .17, -.62);
    for (let r = 0; r < 3; r++) for (let n = 0; n < 6; n++) add(new THREE.CylinderGeometry(.016, .016, .04, 8), tin[(r + n) % 4], .54 + n * .04, f + .08 + r * .075, -.58);
    sign("B4", "MESS · PANTRY", "#f2c230"); }
  // B5 main dormitory: extra bunk blocks down the aisle
  { const f = L("B5").floorY, frame = M(0x2e3625), mat = M(0x0d0e0b);
    for (const x of [-.52, -.14, .6]) { add(new THREE.BoxGeometry(.22, .2, .1), frame, x, f + .15, -.38); for (const y of [.09, .18]) add(new THREE.BoxGeometry(.2, .012, .105), new THREE.MeshBasicMaterial({ color: 0x9cf04a }), x, f + y, -.33); }
    sign("B5", "DORMITORY", "#9cf04a"); }
  // B6 the armory: rifle racks, crates, a hazard-striped wall, caged lamps
  { const f = L("B6").floorY, crate = M(0x4f5a33, { roughness: .9 }), rack = M(0x3a3a32, { metalness: .4 }), gun = M(0x1a1a16, { metalness: .5 });
    for (const x of [-.55, -.25]) { add(new THREE.BoxGeometry(.24, .02, .04), rack, x, f + .26, -.66); add(new THREE.BoxGeometry(.24, .02, .04), rack, x, f + .08, -.66); for (let n = 0; n < 6; n++) add(new THREE.BoxGeometry(.012, .2, .012), gun, x - .1 + n * .04, f + .17, -.64); }
    for (const [x, z, sz] of [[.3, -.4, .11], [.42, -.45, .09], [.36, -.36, .08], [.6, -.3, .1]]) add(new THREE.BoxGeometry(sz, sz * .8, sz), crate, x, f + .05 + sz * .4, z);
    add(new THREE.BoxGeometry(.5, .05, .01), new THREE.MeshBasicMaterial({ map: hz }), -.4, f + .36, -.9);
    sign("B6", "ARMORY", "#f2c230"); }
  // B7 engineering: generators, a radiation tank, pipes, and the welded hatch in the floor
  { const f = L("B7").floorY, gen = M(0x4b4636, { roughness: .6, metalness: .4 }), pipe = M(0x7a6a50, { metalness: .5 });
    for (const x of [.35, .6]) { const c = add(new THREE.CylinderGeometry(.08, .08, .22, 16), gen, x, f + .13, -.55); c.rotation.z = Math.PI / 2; }
    const tank = add(new THREE.CylinderGeometry(.08, .08, .26, 16), M(0xd8b04a, { metalness: .3 }), -.55, f + .18, -.55);
    add(new THREE.BoxGeometry(1.2, .02, .02), pipe, 0, f + .36, -.8);
    const hatchRing = new THREE.Mesh(new THREE.RingGeometry(.09, .14, 28), new THREE.MeshBasicMaterial({ map: hz, side: THREE.DoubleSide })); hatchRing.rotation.x = -Math.PI / 2; hatchRing.position.set(-.05, f + .056, -.3); scene.add(hatchRing);
    const lid = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), M(0x4e4b3d, { metalness: .5 })); lid.rotation.x = -Math.PI / 2; lid.position.set(-.05, f + .057, -.3); scene.add(lid);
    const seam = new THREE.Mesh(new THREE.RingGeometry(.088, .096, 28), new THREE.MeshBasicMaterial({ color: 0xff3b1a })); seam.rotation.x = -Math.PI / 2; seam.position.set(-.05, f + .058, -.3); scene.add(seam);
    const o = new THREE.PointLight(0xff8a2a, 1.2, 1.4, 2); o.position.set(.45, f + .25, -.25); scene.add(o);
    sign("B7", "ENGINEERING", "#ff8a2a"); }

  // ---- the ladder and lift core down the centre ----
  { const core = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, TOP - BOTTOM, 10), new THREE.MeshStandardMaterial({ color: 0x1a1912, roughness: .7, metalness: .2 })); core.position.set(0, (TOP + BOTTOM) / 2, -.15); scene.add(core);
    const rungs = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .008, .008), new THREE.MeshStandardMaterial({ color: 0x5f5b48 }), 70);
    for (let j = 0; j < 70; j++) { m4.makeTranslation(0, BOTTOM + j * (TOP - BOTTOM) / 70, -.06); rungs.setMatrixAt(j, m4); } scene.add(rungs); }

  // ---- vent stacks with mushroom caps, rising to the surface ----
  for (const x of [-.55, .55]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, surfaceY - TOP + .1, 10), new THREE.MeshStandardMaterial({ color: 0x6c6855 })); st.position.set(x, (surfaceY + TOP + .3) / 2 + .05, -.5); scene.add(st);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a8670 })); cap.position.set(x, surfaceY + .12, -.5); scene.add(cap); }

  // ---- the entry tunnel and the blast door on B1 ----
  { const tun = new THREE.Mesh(new THREE.BoxGeometry(.24, .24, 1.6), new THREE.MeshStandardMaterial({ color: 0x16120d, roughness: 1 }));
    tun.position.set(R + .75, TOP + .25, -.2); tun.rotation.set(0, Math.PI / 2, .5); scene.add(tun);
    const tref = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#7a786a"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = "#f2c230"; g.lineWidth = 14; g.setLineDash([24, 14]); g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = "#f2c230"; g.beginPath(); g.arc(128, 128, 70, 0, 7); g.fill(); g.fillStyle = "#15100a"; for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 62, a * 2.094 - 1.57 - .52, a * 2.094 - 1.57 + .52); g.fill(); } g.fillStyle = "#f2c230"; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill(); g.fillStyle = "#15100a"; g.beginPath(); g.arc(128, 128, 7, 0, 7); g.fill(); });
    const door = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .05, 32), [new THREE.MeshStandardMaterial({ color: 0x5a584c }), new THREE.MeshStandardMaterial({ map: tref }), new THREE.MeshStandardMaterial({ color: 0x5a584c })]);
    door.rotation.z = Math.PI / 2; door.rotation.y = -.35; door.position.set(R + .14, TOP + .12, .12); scene.add(door); }

  // ---- hazard-striped footing ----
  { const foot = new THREE.Mesh(new THREE.CylinderGeometry(R + .22, R + .22, .1, 48, 1, false, half.thetaStart, half.thetaLength), [new THREE.MeshStandardMaterial({ map: hz }), new THREE.MeshStandardMaterial({ color: 0xf2c230 }), new THREE.MeshStandardMaterial({ color: 0xf2c230 })]);
    foot.position.y = BOTTOM - .05; scene.add(foot);
    const front = new THREE.Mesh(new THREE.BoxGeometry(2 * (R + .22), .1, .02), new THREE.MeshStandardMaterial({ map: hz })); front.position.set(0, BOTTOM - .05, 0); scene.add(front); }

  // ---- B8: an older drum below the foundation, one red light ----
  const b8 = new THREE.Group(); scene.add(b8);
  const b8y = BOTTOM - .48;
  { const drum = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .5, 32, 1, true, half.thetaStart, half.thetaLength), new THREE.MeshStandardMaterial({ color: 0x2a0d0b, roughness: 1, side: THREE.DoubleSide }));
    drum.position.y = b8y; b8.add(drum);
    const flr = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .04, 32, 1, false, half.thetaStart, half.thetaLength), new THREE.MeshStandardMaterial({ color: 0x1a0807 })); flr.position.y = b8y - .25; b8.add(flr);
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(.13, .2, .03), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); hatch.position.set(0, b8y - .12, -.5); b8.add(hatch);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .25, 8), new THREE.MeshStandardMaterial({ color: 0x3a1a16 })); shaft.position.set(0, BOTTOM - .2, -.15); b8.add(shaft); }
  const red = new THREE.PointLight(0xff2a1a, 1.2, 2.2, 2); red.position.set(0, b8y, -.2); scene.add(red);
  const b8hit = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .55, 16), new THREE.MeshBasicMaterial({ visible: false })); b8hit.position.y = b8y; b8hit.userData.id = "B8"; scene.add(b8hit);

  // ---- ash ----
  const AN = 260, apos = new Float32Array(AN * 3), avel = new Float32Array(AN);
  for (let i = 0; i < AN; i++) { apos[i * 3] = (Math.random() - .5) * 5; apos[i * 3 + 1] = Math.random() * 5 - 2; apos[i * 3 + 2] = Math.random() * 2.2 - .2; avel[i] = .08 + Math.random() * .12; }
  const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.BufferAttribute(apos, 3));
  const ash = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xe9d9c0, size: .025, transparent: true, opacity: .7, depthWrite: false }));
  scene.add(ash);

  // ---- camera: slow sway, drag to turn ----
  const target = new THREE.Vector3(0, (TOP + BOTTOM) / 2 - .12, 0);
  let yaw = 0, drag = 0, dragV = 0, down = null, moved = 0, lastX = 0;
  const DIST = 7.3;
  function placeCam(t) {
    const sway = Math.sin(t * .18) * .32;
    const a = Math.max(-.85, Math.min(.85, sway + drag));
    cam.position.set(target.x + Math.sin(a) * DIST, target.y + .38 + Math.sin(t * .23) * .05, target.z + Math.cos(a) * DIST);
    cam.lookAt(target);
  }
  cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; moved = 0; lastX = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); dragV = -dx * .006; drag += dragV; drag = Math.max(-1.1, Math.min(1.1, drag)); });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  cv.addEventListener("pointerup", e => {
    if (!down) return; const was = moved; down = null;
    if (was > 8) return;
    const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects([...LVL.map(l => l.hit), b8hit]);
    if (hits.length && window.bkTour) window.bkTour(hits[0].object.userData.id);
  });
  cv.style.touchAction = "pan-y";

  // ---- the page tells us which floor is yours ----
  let litId = null;
  window.bk3dLight = id => { litId = id; };

  // ---- show the 3D silo only while the page shows the plain silo ----
  let active = true;
  const sync = () => {
    const show = svgSilo.classList.contains("on") && !svgSilo.style.transform;
    if (show !== active) { active = show; cv.classList.toggle("on", show); fig.classList.toggle("td", show); }
  };
  new MutationObserver(sync).observe(svgSilo, { attributes: true, attributeFilter: ["class", "style"] });

  // ---- size ----
  function size() { const w = fig.clientWidth, h = fig.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cv.style.width = "100%"; cv.style.height = "100%"; cam.aspect = w / h; cam.fov = w / h < .8 ? 31 : 27; cam.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(fig);

  // ---- loop ----
  const clock = new THREE.Clock(); let t0 = performance.now(), visible = true;
  document.addEventListener("visibilitychange", () => { visible = document.visibilityState === "visible"; if (visible) requestAnimationFrame(loop); });
  const tmpC = new THREE.Color();
  function loop() {
    if (!visible) return;
    const dt = Math.min(.05, clock.getDelta()), t = (performance.now() - t0) / 1000;
    if (!down) { drag *= .985; }
    placeCam(t);
    // bunk lights come on floor by floor, bottom up, then flicker gently; your floor goes gold
    LVL.forEach((l, i) => {
      const onAt = .25 + (6 - i) * .18, on = t > onAt ? 1 : 0;
      const mine = litId === l.id;
      l.glow.intensity += ((mine ? 2.2 : 0) - l.glow.intensity) * .08;
      for (let n = 0; n < l.idx.length; n++) {
        const id = l.idx[n], fl = (Math.sin(t * 3 + id * 1.7) > .985) ? .4 : 1;
        tmpC.copy(on ? (mine ? GOLD : GREEN) : OFF); if (on) tmpC.multiplyScalar(fl * (.55 + .45 * ((id * 7) % 10) / 10));
        strips.setColorAt(id, tmpC);
      }
    });
    strips.instanceColor.needsUpdate = true;
    b2led.visible = Math.sin(t * 4) > 0;
    red.intensity = 1 + .6 * Math.max(Math.exp(-((t % .9) * 9)), (t % .9) > .22 ? Math.exp(-(((t % .9) - .22) * 9)) * .7 : 0) + (litId === "B8" ? 1.2 : 0);
    for (let i = 0; i < AN; i++) { apos[i * 3 + 1] -= avel[i] * dt; apos[i * 3] += Math.sin(t * .6 + i) * .0015; if (apos[i * 3 + 1] < -2.2) apos[i * 3 + 1] = 2.8; }
    ag.attributes.position.needsUpdate = true;
    if (active) renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.bk3dReady = true;
}
