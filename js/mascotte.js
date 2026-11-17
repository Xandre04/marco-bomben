// Il personaggio delle tele di Marco in 3D: modello scolpito in Blender (mascotte.glb),
// con il dipinto cotto nella texture. Qui solo luci, saluto e interazione.
import * as THREE from './three/three.module.min.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';
import { GLTFLoader } from './three/GLTFLoader.js';

const base = new URL('./', import.meta.url);

export async function mount(stage, opts = {}) {
  const reduce = !!opts.reduce;
  const canvas = stage.querySelector('canvas');
  const gltf = await new GLTFLoader().loadAsync(new URL('mascotte.glb', base).href);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(-0.08, 0.05, 5.4);
  camera.lookAt(-0.08, -0.28, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(-2.5, 3.5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff0f6, 0.45); fill.position.set(3, 0.5, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(2, 3, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8d8, 0.5));

  const toy = new THREE.Group(); scene.add(toy);
  const fig = new THREE.Group(); toy.add(fig);
  const bodyPivot = new THREE.Group(); fig.add(bodyPivot);
  const model = gltf.scene; bodyPivot.add(model);
  model.traverse(o => { if (o.isMesh) { o.material.side = THREE.FrontSide; if (o.material.map) o.material.map.anisotropy = 4; } });
  // piedi a y=0, alto ~2.22: lo porto alla scala della scena precedente (alto ~1.9, centrato)
  const S = 0.86; model.scale.setScalar(S);
  const box0 = new THREE.Box3().setFromObject(model); const c0 = box0.getCenter(new THREE.Vector3());
  model.position.set(-c0.x, -box0.min.y - 1.24, -c0.z);
  const armL = model.getObjectByName('braccio_saluto'); const arm0 = armL ? armL.quaternion.clone() : null;
  const legs = new THREE.Group();
  fig.updateMatrixWorld(true); const floorY = new THREE.Box3().setFromObject(model).min.y;
  // occhi: perno al centro per il battito; pupille staccate dall'anello nero e mobili
  const eyes = [];
  for (const name of ['occhio_grande', 'occhio_lato', 'occhio_piccolo']) {
    const node = model.getObjectByName(name); if (!node) continue;
    const ms = []; node.traverse(m => { if (m.isMesh) ms.push(m); });
    const bb = new THREE.Box3(); for (const m of ms) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); }
    const c = bb.getCenter(new THREE.Vector3()), r = (bb.max.x - bb.min.x) / 2;
    const g = new THREE.Group(); g.position.copy(c); node.add(g);
    let p = null;
    for (const m of ms) {
      m.geometry.translate(-c.x, -c.y, -c.z); g.add(m);
      const n = m.geometry.attributes.position.count;
      if (m.material.name !== 'black') continue;
      // componenti connesse: il pezzo nero più piccolo è la pupilla
      const pos = m.geometry.attributes.position, idx = m.geometry.index.array, par = new Int32Array(n).map((_, i) => i);
      const f = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
      for (let i = 0; i < idx.length; i += 3) { const a = f(idx[i]); par[f(idx[i + 1])] = a; par[f(idx[i + 2])] = a; }
      const box = new Map();
      for (let i = 0; i < n; i++) { const k = f(i); const bx = box.get(k) || new THREE.Box3(); bx.expandByPoint(new THREE.Vector3().fromBufferAttribute(pos, i)); box.set(k, bx); }
      if (box.size < 2) continue;
      const [pk, pb] = [...box].sort((u, v) => (u[1].max.x - u[1].min.x) - (v[1].max.x - v[1].min.x))[0];
      const A = [], B = [];
      for (let i = 0; i < idx.length; i += 3) (f(idx[i]) === pk ? A : B).push(idx[i], idx[i + 1], idx[i + 2]);
      const pc = pb.getCenter(new THREE.Vector3());
      const pg = m.geometry.clone(); pg.setIndex(A); pg.translate(-pc.x, -pc.y, 0); m.geometry.setIndex(B);
      p = new THREE.Mesh(pg, m.material); p.position.set(pc.x, pc.y, 0.004); g.add(p);
      p.userData.lim = Math.max(0, (r - (pb.max.x - pb.min.x) / 2) * 0.8);
    }
    eyes.push({ g, p, r, rest: [0, 0], p0: p ? p.position.clone() : null });
  }

  // ombra morbida a terra
  const shc = document.createElement('canvas'); shc.width = shc.height = 256; const shx = shc.getContext('2d');
  const rg = shx.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(60,30,70,.42)'); rg.addColorStop(1, 'rgba(60,30,70,0)'); shx.fillStyle = rg; shx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-0.3, floorY + 0.005, 0.1); toy.add(shadow);

  const qz = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1);
  toy.rotation.y = 0;
  const REST_Y = 0;

  // ---------- interazione ----------
  const tgt = { ry: 0, rx: 0 }, cur = { ry: 0, rx: 0 }, look = { x: 0, y: 0 };
  let drag = null, spin = 0, jump = 0, jv = 0, wave = 1.6, nextBlink = 1.5, blinkT = -1;
  const rect = () => stage.getBoundingClientRect();
  function aim(e) { const r = rect(); const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1; tgt.ry = THREE.MathUtils.clamp(nx, -1.2, 1.2) * 0.4; tgt.rx = THREE.MathUtils.clamp(ny, -1, 1) * 0.1; look.x = THREE.MathUtils.clamp(nx * 1.2, -1, 1); look.y = THREE.MathUtils.clamp(ny * 1.2, -1, 1); }
  const sect = stage.closest('section') || stage;
  sect.addEventListener('pointermove', e => { if (!drag && e.pointerType === 'mouse') aim(e); });
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, s: spin, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(e.clientY - drag.y)); spin = THREE.MathUtils.clamp(drag.s + dx * 0.01, -1.1, 1.1); aim(e); });
  const up = () => { if (!drag) return; if (drag.moved < 6) { jv = 3.2; wave = 1.4; } drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jv = 3.2; wave = 1.4; } if (e.key === 'ArrowLeft') spin = Math.max(-1.1, spin - 0.25); if (e.key === 'ArrowRight') spin = Math.min(1.1, spin + 0.25); });
  sect.addEventListener('pointerleave', () => { tgt.ry = 0; tgt.rx = 0; look.x = 0; look.y = 0; });

  // ---------- ciclo ----------
  function resize() { const r = rect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(stage); resize();
  let running = false, last = performance.now(), t = 0;
  function pose(dt) {
    t += dt;
    if (!drag) spin *= Math.pow(0.04, dt);
    cur.ry += (tgt.ry + spin - cur.ry) * Math.min(1, dt * 6); cur.rx += (tgt.rx - cur.rx) * Math.min(1, dt * 6);
    toy.rotation.y = REST_Y + cur.ry; toy.rotation.x = cur.rx;
    const amp = reduce ? 0 : 1;
    if (jv || jump > 0) { jv -= 12 * dt; jump += jv * dt; if (jump <= 0) { jump = 0; jv = 0; } }
    bodyPivot.position.y = Math.sin(t * 2.1) * 0.018 * amp + jump;
    const sq = 1 + Math.sin(t * 2.1 + 1) * 0.01 * amp;
    bodyPivot.scale.set(2 - sq, sq, 1);
    legs.position.y = jump * 0.9;
    shadow.scale.setScalar(1 - Math.min(0.4, jump * 0.5)); shadow.material.opacity = 1 - Math.min(0.6, jump);
    // saluto: tutto il braccio oscilla dalla spalla
    let wz = 0;
    if (wave > 0) { wave -= dt; wz = Math.sin(t * 10) * 0.14 * Math.min(1, wave * 2) * amp; }
    else { wz = Math.sin(t * 2.1) * 0.02 * amp; if (!reduce && Math.random() < dt / 6) wave = 1.6; }
    if (armL) armL.quaternion.copy(arm0).premultiply(qz.setFromAxisAngle(ZA, wz));
    // sguardo e battito di ciglia
    if (!reduce) { nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0; nextBlink = 2.5 + Math.random() * 3; } }
    let lid = 1;
    if (blinkT >= 0) { blinkT += dt; const k = blinkT / 0.09; lid = k < 1 ? 1 - k * 0.9 : k < 2 ? 0.1 + (k - 1) * 0.9 : 1; if (k >= 2) blinkT = -1; }
    for (const e of eyes) {
      e.g.scale.y = lid;
      if (!e.p) continue;
      const rx = e.rest[0] * (1 - Math.abs(look.x)) + look.x, ry = e.rest[1] * (1 - Math.abs(look.y)) - look.y;
      let tx = e.p0.x + rx * e.r * 0.3, ty = e.p0.y + ry * e.r * 0.3; const L = Math.hypot(tx, ty), lim = e.p.userData.lim; if (L > lim) { tx *= lim / L; ty *= lim / L; }
      e.p.position.x += (tx - e.p.position.x) * Math.min(1, dt * 10); e.p.position.y += (ty - e.p.position.y) * Math.min(1, dt * 10);
    }
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    pose(dt); renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  const stop = () => { running = false; };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !document.hidden ? start() : stop())), { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  wave = opts.still ? 0 : wave;
  pose(opts.still ? 0 : 0.016);
  if (opts.still) for (const e of eyes) if (e.p) e.p.position.copy(e.p0);
  renderer.render(scene, camera);
  return { hello() { wave = 1.8; }, render() { renderer.render(scene, camera); } };
}
