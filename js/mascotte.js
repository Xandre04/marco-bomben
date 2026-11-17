// Il personaggio delle tele di Marco, costruito in 3D direttamente nel browser.
// Nessun modello da scaricare: il volto è dipinto su un canvas, il corpo è fatto di forme semplici
// con un materiale lucido da giocattolo in vinile.
import * as THREE from './three/three.module.min.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';

export function mount(stage, opts = {}) {
  const reduce = !!opts.reduce;
  const canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.05, 6.9);
  camera.lookAt(0, -0.25, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6f0, 1.1); rim.position.set(4, 2, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff4fb, 0xc9a0dc, 0.55));

  // ---------- colori presi dalle tele ----------
  const C = { pink: '#ff4fa3', rose: '#f39ac9', lilac: '#d9a3e6', purple: '#b98ae2', peach: '#f6cfc8', teal: '#6fd6c8', mint: '#9fe6cf', ink: '#0a0a0a', white: '#f7f5f2' };
  const vinyl = (hex) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color('#ffffff') });

  // ---------- volto dipinto ----------
  const fc = document.createElement('canvas'); fc.width = fc.height = 1024; const g = fc.getContext('2d');
  const look = { x: 0, y: 0, blink: 0 };
  function airbrush(x0, y0, x1, y1, a, b) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
  function poly(pts, fill, lw = 18) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = C.ink; g.lineJoin = 'round'; g.stroke(); } }
  function eye(x, y, r, px, py, lid) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = C.white; g.fill();
    const pr = r * 0.46, ox = x + px * r * 0.42, oy = y + py * r * 0.42;
    g.beginPath(); g.arc(ox, oy, pr, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill();
    g.beginPath(); g.arc(ox - pr * 0.35, oy - pr * 0.4, pr * 0.22, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
    if (lid > 0) { g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip(); g.fillStyle = C.rose; g.fillRect(x - r, y - r, r * 2, r * 2 * lid); g.lineWidth = 10; g.strokeStyle = C.ink; g.beginPath(); g.moveTo(x - r, y - r + r * 2 * lid); g.lineTo(x + r, y - r + r * 2 * lid); g.stroke(); g.restore(); }
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.lineWidth = 16; g.strokeStyle = C.ink; g.stroke();
  }
  function paintFace() {
    const S = 1024;
    g.fillStyle = airbrush(0, 0, S, S, '#f59ccd', '#c995ea'); g.fillRect(0, 0, S, S);
    // campiture di fondo, come nelle tele: viola in basso a sinistra, rosa acceso ai lati
    poly([[0, 610], [210, 560], [260, 1024], [0, 1024]], airbrush(0, 600, 260, 1024, '#c38fe6', '#a77ad8'), 0);
    poly([[60, 470], [175, 470], [175, 600], [60, 600]], C.pink, 14);
    poly([[860, 760], [990, 760], [990, 900], [860, 900]], C.pink, 14);
    // la cornice nera storta con dentro il "volto"
    const fr = [[190, 330], [820, 268], [858, 900], [214, 935]];
    poly(fr, airbrush(200, 300, 860, 940, '#f9cfd6', '#f3a9cf'), 30);
    g.save(); g.beginPath(); g.moveTo(fr[0][0], fr[0][1]); fr.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.clip();
    poly([[560, 640], [880, 560], [880, 960], [600, 960]], airbrush(560, 600, 880, 960, '#7bdccd', '#5cc7c0'), 0);
    // denti a punta sopra la bocca
    poly([[300, 760], [370, 560], [425, 690], [470, 600], [520, 720]], C.peach, 7);
    poly([[600, 690], [640, 520], [700, 610], [748, 560], [760, 650]], '#bff0e6', 7);
    g.restore();
    // bocca a mezzaluna
    g.beginPath(); g.moveTo(250, 790); g.lineTo(812, 626); g.bezierCurveTo(800, 830, 520, 960, 250, 790); g.closePath();
    g.fillStyle = airbrush(250, 650, 800, 900, '#ff69b4', '#ff3d97'); g.fill(); g.lineWidth = 20; g.strokeStyle = C.ink; g.lineJoin = 'round'; g.stroke();
    // naso: due trattini
    g.fillStyle = C.ink; [[478, 530], [520, 524]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 10, 24, 0.08, 0, Math.PI * 2); g.fill(); });
    // sopracciglio: la grande curva che attraversa il volto
    g.beginPath(); g.moveTo(140, 300); g.bezierCurveTo(330, 470, 640, 470, 900, 330); g.lineWidth = 24; g.strokeStyle = C.ink; g.lineCap = 'round'; g.stroke();
    // occhi
    eye(300, 215, 98, look.x, look.y - 0.35, look.blink);
    eye(470, 250, 58, look.x, look.y - 0.2, look.blink);
    // ricciolo in basso
    g.beginPath(); g.moveTo(300, 985); g.bezierCurveTo(420, 940, 520, 1010, 640, 975); g.bezierCurveTo(690, 960, 690, 920, 655, 925); g.lineWidth = 9; g.strokeStyle = C.ink; g.stroke();
    // bordo nero della tela
    g.lineWidth = 40; g.strokeStyle = C.ink; g.strokeRect(20, 20, S - 40, S - 40);
  }
  paintFace();
  const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;

  // scatola laterale con il secondo occhio
  const sc = document.createElement('canvas'); sc.width = sc.height = 512; const s = sc.getContext('2d');
  function paintSide() {
    s.fillStyle = (() => { const gr = s.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, '#f7a6d2'); gr.addColorStop(1, '#ec86c0'); return gr; })(); s.fillRect(0, 0, 512, 512);
    const x = 250, y = 230, r = 120;
    s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fillStyle = C.white; s.fill();
    const ox = x + look.x * r * 0.4, oy = y + (look.y - 0.1) * r * 0.4;
    s.beginPath(); s.arc(ox, oy, r * 0.42, 0, Math.PI * 2); s.fillStyle = C.ink; s.fill();
    s.beginPath(); s.arc(ox - 16, oy - 18, 10, 0, Math.PI * 2); s.fillStyle = '#fff'; s.fill();
    if (look.blink > 0) { s.save(); s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.clip(); s.fillStyle = '#f39ac9'; s.fillRect(x - r, y - r, r * 2, r * 2 * look.blink); s.restore(); }
    s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.lineWidth = 18; s.strokeStyle = C.ink; s.stroke();
    s.fillStyle = C.pink; s.fillRect(300, 400, 140, 70); s.lineWidth = 10; s.strokeRect(300, 400, 140, 70);
    s.lineWidth = 34; s.strokeRect(17, 17, 478, 478);
  }
  paintSide();
  const sideTex = new THREE.CanvasTexture(sc); sideTex.colorSpace = THREE.SRGBColorSpace;

  // ---------- geometrie ----------
  function slab(w, h, d, r) {
    const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 8 });
    geo.translate(0, 0, -d / 2); return geo;
  }
  const capMat = (tex, w, h) => { const t = tex; t.repeat.set(1 / w, 1 / h); t.offset.set(0.5, 0.5); return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 }); };

  const toy = new THREE.Group(); scene.add(toy);
  const bodyPivot = new THREE.Group(); toy.add(bodyPivot);

  const FW = 1.5, FH = 1.72;
  const body = new THREE.Mesh(slab(FW, FH, 0.5, 0.08), [capMat(faceTex, FW, FH), vinyl('#f08cc4')]);
  body.rotation.z = -0.05; bodyPivot.add(body);

  const SW = 0.62, SH = 0.72;
  const side = new THREE.Mesh(slab(SW, SH, 0.36, 0.06), [capMat(sideTex, SW, SH), vinyl('#ee8cc2')]);
  side.position.set(0.9, 0.28, -0.16); side.rotation.set(0, -0.32, -0.04); bodyPivot.add(side);

  // ciuffo bianco con contorno nero
  const tuftGeo = new THREE.SphereGeometry(1, 24, 16);
  const tuft = new THREE.Mesh(tuftGeo, vinyl(C.white)); tuft.scale.set(0.27, 0.085, 0.07); tuft.position.set(0.3, 0.98, 0.05); tuft.rotation.z = 0.18; bodyPivot.add(tuft);
  const tuftLine = new THREE.Mesh(tuftGeo, new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide })); tuftLine.scale.set(1.12, 1.35, 1.3); tuft.add(tuftLine);
  const curl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.52, 0.99, 0.05), new THREE.Vector3(0.64, 1.03, 0.05), new THREE.Vector3(0.68, 0.95, 0.05), new THREE.Vector3(0.6, 0.93, 0.05)]), 20, 0.012, 6), new THREE.MeshBasicMaterial({ color: C.ink }));
  bodyPivot.add(curl);

  // mani: palmo morbido + dita a capsula
  function hand(color, spread = 1) {
    const h = new THREE.Group(), m = vinyl(color);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), m); palm.scale.set(0.16, 0.17, 0.09); h.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1 - Math.abs(i - 1.5) * 0.02, 6, 12), m);
      const a = (i - 1.5) * 0.24 * spread; f.position.set(Math.sin(a) * 0.17, 0.16 + Math.cos(a) * 0.04 - Math.abs(i - 1.5) * 0.02, 0); f.rotation.z = -a; h.add(f);
    }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.08, 6, 12), m); th.position.set(0.16, -0.02, 0.03); th.rotation.z = -1.1; h.add(th);
    return h;
  }
  function limb(points, r, color) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = vinyl(color), grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 18), m));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m); cap.position.copy(curve.getPoint(0)); grp.add(cap);
    const end = cap.clone(); end.position.copy(curve.getPoint(1)); grp.add(end);
    return grp;
  }

  // braccio che saluta (turchese), con avambraccio su un perno per il saluto
  const armL = new THREE.Group(); armL.position.set(-0.72, 0.02, 0.02); bodyPivot.add(armL);
  armL.add(limb([[0, 0, 0], [-0.22, -0.02, 0.04], [-0.36, 0.12, 0.05], [-0.38, 0.28, 0.05]], 0.12, C.teal));
  const fore = new THREE.Group(); fore.position.set(-0.38, 0.28, 0.05); armL.add(fore);
  fore.add(limb([[0, 0, 0], [-0.02, 0.18, 0], [0, 0.32, 0]], 0.115, C.teal));
  const hL = hand('#f27fb9', 1.25); hL.position.set(0, 0.5, 0.02); hL.rotation.z = 0.1; fore.add(hL);

  // braccio che si appoggia al bordo della tela (rosa)
  const armR = limb([[0.72, -0.08, 0.1], [0.93, -0.28, 0.24], [0.8, -0.5, 0.36]], 0.12, '#f27fb9');
  bodyPivot.add(armR);
  const hR = hand('#f27fb9', 0.8); hR.position.set(0.68, -0.58, 0.4); hR.rotation.set(0.25, 0.2, 1.9); bodyPivot.add(hR);

  // gambe e scarponi
  function leg(x, color, lift = 0) {
    const grp = new THREE.Group(); grp.position.set(x, -0.82, 0);
    grp.add(limb([[0, 0, 0], [0, -0.22, 0], [0.02 * Math.sign(x), -0.42, 0.02]], 0.17, color));
    const boot = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), vinyl(color)); boot.scale.set(0.32, 0.21, 0.42); boot.position.set(0.03 * Math.sign(x), -0.6 + lift, 0.13); grp.add(boot);
    return grp;
  }
  const legL = leg(-0.36, C.teal), legR = leg(0.34, '#f27fb9');
  toy.add(legL, legR);

  // ombra morbida a terra
  const shc = document.createElement('canvas'); shc.width = shc.height = 256; const shx = shc.getContext('2d');
  const rg = shx.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(70,20,80,.38)'); rg.addColorStop(1, 'rgba(70,20,80,0)'); shx.fillStyle = rg; shx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -1.52, 0.1); scene.add(shadow);

  toy.position.y = 0.12;

  // ---------- interazione ----------
  const tgt = { ry: 0, rx: 0 }, cur = { ry: 0, rx: 0 };
  let drag = null, spin = 0, jump = 0, jv = 0, wave = 1.6, nextBlink = 1.5, blinkT = -1;
  const rect = () => stage.getBoundingClientRect();
  function aim(e) { const r = rect(); const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1; tgt.ry = THREE.MathUtils.clamp(nx, -1.2, 1.2) * 0.45; tgt.rx = THREE.MathUtils.clamp(ny, -1, 1) * 0.12; look.x = THREE.MathUtils.clamp(nx * 1.1, -1, 1); look.y = THREE.MathUtils.clamp(ny * 1.1, -1, 1); }
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
  let running = false, last = performance.now(), t = 0, faceDirty = true, lastLook = '';
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!drag) spin *= Math.pow(0.04, dt); // torna dritto piano dopo averlo girato
    cur.ry += (tgt.ry + spin - cur.ry) * Math.min(1, dt * 6); cur.rx += (tgt.rx - cur.rx) * Math.min(1, dt * 6);
    toy.rotation.y = cur.ry; toy.rotation.x = cur.rx;
    const amp = reduce ? 0 : 1;
    // salto con schiacciamento all'atterraggio
    if (jv || jump > 0) { jv -= 12 * dt; jump += jv * dt; if (jump <= 0) { jump = 0; jv = 0; } }
    const land = jump === 0 ? 0 : 0;
    bodyPivot.position.y = Math.sin(t * 2.1) * 0.025 * amp + jump;
    const sq = 1 + Math.sin(t * 2.1 + 1) * 0.012 * amp - (jv < -2 && jump < 0.15 ? 0.05 : 0) + land;
    bodyPivot.scale.set(2 - sq, sq, 1);
    legL.position.y = legR.position.y = -0.82 + jump * 0.85;
    shadow.scale.setScalar(1 - Math.min(0.4, jump * 0.5)); shadow.material.opacity = 1 - Math.min(0.6, jump);
    // saluto
    if (wave > 0) { wave -= dt; fore.rotation.z = Math.sin(t * 11) * 0.38 * Math.min(1, wave * 2) * amp; }
    else { fore.rotation.z += (0 - fore.rotation.z) * dt * 4; if (!reduce && Math.random() < dt / 6) wave = 1.6; }
    armL.rotation.z = Math.sin(t * 2.1) * 0.03 * amp;
    // battito di ciglia
    if (!reduce) { nextBlink -= dt; if (nextBlink <= 0) { blinkT = 0; nextBlink = 2.5 + Math.random() * 3; } }
    if (blinkT >= 0) { blinkT += dt; const k = blinkT / 0.16; look.blink = k < 1 ? k : k < 2 ? 2 - k : 0; if (k >= 2) blinkT = -1; faceDirty = true; }
    const lk = look.x.toFixed(2) + look.y.toFixed(2) + look.blink.toFixed(2);
    if (lk !== lastLook) { lastLook = lk; faceDirty = true; }
    if (faceDirty) { paintFace(); paintSide(); faceTex.needsUpdate = true; sideTex.needsUpdate = true; faceDirty = false; }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  const stop = () => { running = false; };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !document.hidden ? start() : stop())), { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  renderer.render(scene, camera);
  return { hello() { wave = 1.8; } };
}
