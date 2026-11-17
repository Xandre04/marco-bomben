// Il personaggio delle tele di Marco in 3D.
// Braccia, mani, gambe e stivali sono modellati in Blender (metaball) ed esportati in un binario
// minuscolo (mascotte.bin, ~50 KB): posizioni quantizzate a 16 bit + indici. Il volto è una texture
// dipinta (mascotte-volto.webp); occhi, ciuffo e corpo sono costruiti qui.
import * as THREE from './three/three.module.min.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';

const base = new URL('./', import.meta.url);

async function loadParts() {
  const buf = await (await fetch(new URL('mascotte.bin', base))).arrayBuffer();
  const hl = new DataView(buf).getUint32(0, true);
  const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  let o = 4 + hl; const out = {};
  for (const [name, nv, ni] of hdr) {
    const q = new Int16Array(buf, o, nv * 3); o += nv * 6; o += (4 - (o % 4)) % 4;
    const idx = new Uint16Array(buf, o, ni); o += ni * 2; o += (4 - (o % 4)) % 4;
    const pos = new Float32Array(nv * 3); for (let i = 0; i < pos.length; i++) pos[i] = (q[i] / 32767) * 1.8;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
    g.computeVertexNormals(); out[name] = g;
  }
  return out;
}

export async function mount(stage, opts = {}) {
  const reduce = !!opts.reduce;
  const canvas = stage.querySelector('canvas');
  const [parts, faceTex] = await Promise.all([
    loadParts(),
    new THREE.TextureLoader().loadAsync(new URL('../img/mascotte-volto.webp', base).href),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(-0.08, 0.3, 5.5);
  camera.lookAt(-0.08, -0.3, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(-2.5, 3.5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff0f6, 0.45); fill.position.set(3, 0.5, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(2, 3, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8d8, 0.5));

  const ink = new THREE.MeshStandardMaterial({ color: '#141014', roughness: 0.35 });
  const vinyl = (hex, r = 0.5) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: r, clearcoat: 0.25, clearcoatRoughness: 0.45 });
  const M = { teal: vinyl('#58ab9f'), tealLeg: vinyl('#5fb3a7'), pink: vinyl('#ea6fa5'), pinkLeg: vinyl('#e8749f'), white: vinyl('#f8f6f2', 0.22) };

  // ---------- corpo: la tela ----------
  faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  // la texture copre x ∈ [-0.52, 0.80], y ∈ [-0.85, 0.84]
  faceTex.repeat.set(1 / 1.32, 1 / 1.69); faceTex.offset.set(0.52 / 1.32, 0.85 / 1.69);
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 });
  const edgeMat = vinyl('#e67cb4', 0.55);
  function slab(x0, y0, x1, y1, d) {
    const sh = new THREE.Shape(); sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.012, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -d / 2); return g;
  }

  const toy = new THREE.Group(); scene.add(toy);
  const bodyPivot = new THREE.Group(); toy.add(bodyPivot);
  const body = new THREE.Group(); body.rotation.z = -0.07; bodyPivot.add(body);
  const main = new THREE.Mesh(slab(-0.5, -0.83, 0.5, 0.82, 0.28), [faceMat, edgeMat]); body.add(main);
  const block = new THREE.Mesh(slab(0.47, 0.2, 0.78, 0.81, 0.26), [faceMat, edgeMat]); block.position.z = -0.025; body.add(block);
  const FZ = 0.14 + 0.025; // fronte della tela

  // occhi in rilievo: disco bianco lucido, contorno nero, pupilla mobile
  function eye(x, y, z, r, pupil) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const w = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), M.white); w.scale.z = 0.32; g.add(w);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.085, 10, 40), ink); ring.scale.z = 0.8; ring.position.z = 0.005; g.add(ring);
    let p = null;
    if (pupil) { p = new THREE.Mesh(new THREE.SphereGeometry(r * pupil, 24, 12), ink); p.scale.z = 0.3; p.position.z = r * 0.3; g.add(p); }
    body.add(g); return { g, p, r };
  }
  const eyes = [eye(-0.17, 0.46, FZ, 0.15, 0.45), eye(0.025, 0.4, FZ, 0.083, 0), eye(0.66, 0.47, FZ - 0.012, 0.09, 0.42)];
  eyes[0].rest = [0.32, -0.12]; eyes[2].rest = [-0.25, -0.05];

  // ciuffo bianco con il bordo nero e il ricciolo
  const leaf = new THREE.Shape(); leaf.moveTo(0.04, 0); leaf.quadraticCurveTo(0.1, 0.13, 0.27, 0.12); leaf.quadraticCurveTo(0.36, 0.1, 0.34, 0); leaf.closePath();
  const tuft = new THREE.Group(); tuft.position.set(-0.02, 0.83, 0.05); tuft.rotation.z = -0.04; tuft.scale.setScalar(1.15); body.add(tuft);
  const lw = new THREE.Mesh(new THREE.ExtrudeGeometry(leaf, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2 }), M.white); lw.position.z = -0.025; tuft.add(lw);
  const lb = new THREE.Mesh(new THREE.ExtrudeGeometry(leaf, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.026, bevelSegments: 2 }), ink); lb.position.z = -0.03; tuft.add(lb);
  const curlPts = [[0.33, 0.0], [0.4, 0.01], [0.47, 0.035], [0.5, 0.075], [0.47, 0.095], [0.445, 0.075], [0.465, 0.06]].map(([x, y]) => new THREE.Vector3(x, y, 0.03));
  tuft.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curlPts), 40, 0.008, 6), ink));

  // ---------- arti modellati in Blender ----------
  const mesh = (name, mat) => new THREE.Mesh(parts[name], mat);
  const SH = new THREE.Vector3(-0.45, -0.05, -0.05); // spalla sinistra: perno del saluto
  const armL = new THREE.Group(); armL.position.copy(SH); body.add(armL);
  for (const [n, m] of [['sleeveL', M.teal], ['handL', M.pink]]) { const o = mesh(n, m); o.position.copy(SH).negate(); armL.add(o); }
  body.add(mesh('armR', M.pink));
  const legs = new THREE.Group(); toy.add(legs);
  legs.add(mesh('legL', M.tealLeg), mesh('legR', M.pinkLeg));
  parts.legL.computeBoundingBox(); const floorY = parts.legL.boundingBox.min.y;

  // ombra morbida a terra
  const shc = document.createElement('canvas'); shc.width = shc.height = 256; const shx = shc.getContext('2d');
  const rg = shx.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(60,30,70,.42)'); rg.addColorStop(1, 'rgba(60,30,70,0)'); shx.fillStyle = rg; shx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-0.12, floorY + 0.005, 0.1); toy.add(shadow);

  toy.rotation.y = -0.09;
  const REST_Y = -0.09;

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
    if (wave > 0) { wave -= dt; armL.rotation.z = Math.sin(t * 10) * 0.12 * Math.min(1, wave * 2) * amp; }
    else { armL.rotation.z += (Math.sin(t * 2.1) * 0.02 * amp - armL.rotation.z) * Math.min(1, dt * 4); if (!reduce && Math.random() < dt / 6) wave = 1.6; }
    // sguardo e battito di ciglia
    if (!reduce) { nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0; nextBlink = 2.5 + Math.random() * 3; } }
    let lid = 1;
    if (blinkT >= 0) { blinkT += dt; const k = blinkT / 0.09; lid = k < 1 ? 1 - k * 0.9 : k < 2 ? 0.1 + (k - 1) * 0.9 : 1; if (k >= 2) blinkT = -1; }
    for (const e of eyes) {
      e.g.scale.y = lid;
      if (!e.p) continue;
      const rx = e.rest[0] * (1 - Math.abs(look.x)) + look.x, ry = e.rest[1] * (1 - Math.abs(look.y)) - look.y;
      const tx = rx * e.r * 0.42, ty = ry * e.r * 0.42;
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
  if (opts.still) for (const e of eyes) if (e.p) e.p.position.set(e.rest[0] * e.r * 0.42, e.rest[1] * e.r * 0.42, e.p.position.z);
  renderer.render(scene, camera);
  return { hello() { wave = 1.8; }, render() { renderer.render(scene, camera); } };
}
