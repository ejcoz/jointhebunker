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
      const skip = id === "B3" || (id === "B7" && j > 7) || (id === "B4" && r === 1);
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
  // B3 garden: planters, leaves, pink grow-lights
  { const f = L("B3").floorY; const box = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: .9 });
    const leaf = [0x5fb036, 0x86cc45, 0x3f8a2a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
    for (let j = 0; j < 9; j++) { const a = Math.PI / 2 + .3 + j / 8 * (Math.PI - .6), x = .82 * Math.sin(a), z = .82 * Math.cos(a);
      const p = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .1), box); p.position.set(x, f + .08, z); p.rotation.y = a; scene.add(p);
      for (let n = 0; n < 3; n++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.045 + (n % 2) * .015, 8, 6), leaf[(j + n) % 3]); s.position.set(x + (n - 1) * .045, f + .15 + (n % 2) * .04, z); scene.add(s); } }
    const pink = new THREE.PointLight(0xff6ad0, .55, .9, 2); pink.position.set(0, f + .3, -.55); scene.add(pink); }
  // B6 armory: crates and racks
  { const f = L("B6").floorY; const crate = new THREE.MeshStandardMaterial({ color: 0x4f5a33, roughness: .9 });
    for (const [x, z, s] of [[-.55, -.35, .12], [-.42, -.42, .1], [-.5, -.3, .09], [.5, -.4, .12], [.62, -.25, .1]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s * .8, s), crate); c.position.set(x, f + .05 + s * .4, z); scene.add(c); } }
  // B7 engineering: generators and an orange glow
  { const f = L("B7").floorY; const gen = new THREE.MeshStandardMaterial({ color: 0x4b4636, roughness: .7, metalness: .3 });
    for (const x of [.35, .58]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .26, 16), gen); c.rotation.z = Math.PI / 2; c.position.set(x, f + .14, -.5); scene.add(c); }
    const o = new THREE.PointLight(0xff8a2a, 1.4, 1.6, 2); o.position.set(.45, f + .25, -.25); scene.add(o); }
  // B2: a blinking red light by the radio
  const b2led = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
  { const f = L("B2").floorY; b2led.position.set(.7, f + .28, -.6); scene.add(b2led); }

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
  const hz = canvasTex(512, 32, (g, w, h) => { g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, h); g.fillStyle = "#15100a"; for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x, h); g.lineTo(x - 16, h); g.fill(); } });
  hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(4, 1);
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
    cam.position.set(target.x + Math.sin(a) * DIST, target.y + .55 + Math.sin(t * .23) * .05, target.z + Math.cos(a) * DIST);
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
