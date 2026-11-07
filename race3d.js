/* 3D-weergave "achter de auto" voor Marcels Race.
   De spelregels (rijden, rondes, computerauto's) blijven in race.html; dit bestand tekent alleen.
   Wereld 2D (x, y) wordt 3D (x, 0, y): y in het spel is z in 3D. Een auto met hoek a rijdt richting (cos a, 0, sin a). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const LUCHT = { kamp:0x9fd4ff, woestijn:0xf3d9ad, sneeuw:0xdfe9f3, strand:0x8fd3ff, herfst:0xc9dbe6, vulkaan:0x4a2620 };

// Basisvormen voor de versiering (gemaakt voor een grootte van 30; daarna geschaald)
const VORM = {
  stam: new THREE.CylinderGeometry(3, 4, 20, 6),
  bol: new THREE.SphereGeometry(18, 10, 8),
  kegel: new THREE.ConeGeometry(18, 50, 8),
  tent: new THREE.ConeGeometry(30, 45, 4),
  cactus: new THREE.CylinderGeometry(7, 7, 60, 8),
  arm: new THREE.CylinderGeometry(5, 5, 22, 6),
  rots: new THREE.DodecahedronGeometry(1),
  palmStam: new THREE.CylinderGeometry(3, 4, 70, 6),
  palmBlad: new THREE.ConeGeometry(40, 10, 7),
  bal: new THREE.SphereGeometry(1, 12, 10),
  paal: new THREE.CylinderGeometry(1.5, 1.5, 40, 5),
  scherm: new THREE.ConeGeometry(30, 10, 10),
  hoed: new THREE.SphereGeometry(14, 10, 6),
  voet: new THREE.CylinderGeometry(4, 5, 12, 6),
  lava: new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
};
const TENTKLEUR = ['#e67e22', '#3498db', '#e74c3c', '#f1c40f'], HERFST = ['#d35400', '#e67e22', '#c0392b', '#e8b400'];
const DELEN = {   // per soort: vorm, kleur, plaats en schaal (bij grootte 30)
  boom:        v => [['stam', '#7a5230', [0,10,0]], ['bol', '#2e8a3a', [0,34,0]]],
  herfstboom:  v => [['stam', '#6b4426', [0,10,0]], ['bol', HERFST[Math.floor(v.k * 4)], [0,34,0]]],
  den:         v => [['stam', '#5a3a20', [0,8,0]], ['kegel', '#1e5631', [0,40,0]]],
  tent:        v => [['tent', TENTKLEUR[Math.floor(v.k * 4)], [0,22,0]]],
  cactus:      v => [['cactus', '#3f8f3a', [0,30,0]], ['arm', '#3f8f3a', [-14,32,0]], ['arm', '#3f8f3a', [14,40,0]]],
  rots:        v => [['rots', null, [0,8,0], [30,18,24]]],
  palm:        v => [['palmStam', '#8a5a2b', [0,35,0]], ['palmBlad', '#2f8f3a', [0,72,0]]],
  sneeuwman:   v => [['bal', '#ffffff', [0,18,0], [18,18,18]], ['bal', '#ffffff', [0,44,0], [12,12,12]]],
  parasol:     v => [['paal', '#dddddd', [0,20,0]], ['scherm', ['#e74c3c','#3498db','#9b59b6'][Math.floor(v.k * 3)], [0,42,0]]],
  paddenstoel: v => [['voet', '#f4f0e6', [0,6,0]], ['hoed', '#d62c1f', [0,14,0], [1,0.6,1]]],
  lava:        v => [['lava', '#ff7b00', [0,0.6,0], [30,30,30]]],
};

function maakAutoModel(kleur) {
  const g = new THREE.Group();
  const lak = new THREE.MeshLambertMaterial({ color: kleur });
  const glas = new THREE.MeshLambertMaterial({ color: 0x1d2b3a });
  const zwart = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const deel = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  deel(new THREE.BoxGeometry(48, 11, 26), lak, 0, 9, 0);                  // carrosserie
  deel(new THREE.BoxGeometry(22, 10, 21), glas, -3, 19, 0);               // ramen
  deel(new THREE.BoxGeometry(18, 2, 22), lak, -3, 25, 0);                 // dak
  deel(new THREE.BoxGeometry(6, 3, 26), lak, -23, 17, 0);                 // spoiler
  const wiel = new THREE.CylinderGeometry(6, 6, 5, 12).rotateX(Math.PI / 2);
  for (const [x, z] of [[15,13],[15,-13],[-15,13],[-15,-13]]) deel(wiel, zwart, x, 6, z);
  const licht = new THREE.MeshBasicMaterial({ color: 0xfff6b0 });
  for (const z of [-8, 8]) deel(new THREE.BoxGeometry(1, 3, 5), licht, 24.2, 10, z);
  const rood = new THREE.MeshBasicMaterial({ color: 0xc0392b });
  for (const z of [-8, 8]) deel(new THREE.BoxGeometry(1, 3, 5), rood, -24.2, 10, z);
  const schaduw = new THREE.Mesh(new THREE.PlaneGeometry(58, 34).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  schaduw.position.y = 0.8; g.add(schaduw);
  return g;
}

function maakFinishboog(p, breed) {
  const g = new THREE.Group(), paalMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  for (const kant of [-1, 1]) {
    const paal = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 75, 8), paalMat);
    paal.position.set(p.x + p.nx * kant * (breed / 2 + 14), 37, p.y + p.ny * kant * (breed / 2 + 14));
    g.add(paal);
  }
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  for (let r = 0; r < 2; r++) for (let k = 0; k < 32; k++) { x.fillStyle = (r + k) % 2 ? '#111' : '#fff'; x.fillRect(k * 16, r * 32, 16, 32); }
  x.fillStyle = '#e74c3c'; x.fillRect(150, 8, 212, 48);
  x.fillStyle = '#fff'; x.font = 'bold 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FINISH', 256, 33);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const doek = new THREE.Mesh(new THREE.BoxGeometry(breed + 40, 16, 2), new THREE.MeshBasicMaterial({ map: tex }));
  doek.position.set(p.x, 72, p.y);
  doek.rotation.y = -Math.atan2(p.ny, p.nx);   // het doek staat dwars over de weg
  g.add(doek);
  return g;
}

export function maakDrie(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(64, 1, 2, 5000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.7));
  const zon = new THREE.DirectionalLight(0xffffff, 1.5); zon.position.set(400, 700, 250); scene.add(zon);

  let wereld = null, modellen = [], kleuren = '', camHoek = null;
  const camPos = new THREE.Vector3(), kijk = new THREE.Vector3();

  function bouw({ circuit, thema, themaNaam, textuur, versiering, pad, breed }) {
    if (wereld) { scene.remove(wereld); wereld.traverse(o => { if (o.material?.map) o.material.map.dispose(); }); }
    wereld = new THREE.Group(); scene.add(wereld);
    const lucht = LUCHT[themaNaam] ?? 0x9fd4ff;
    scene.background = new THREE.Color(lucht);
    scene.fog = new THREE.Fog(lucht, 600, 2600);

    const basis = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: thema.grond }));
    basis.position.y = -0.6; wereld.add(basis);
    if (circuit.zee) {
      const zee = new THREE.Mesh(new THREE.PlaneGeometry(30000, 15000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2f9fd8 }));
      zee.position.set(0, -0.3, circuit.zee + 7500); wereld.add(zee);
    }
    const tex = new THREE.CanvasTexture(textuur.canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const grond = new THREE.Mesh(new THREE.PlaneGeometry(textuur.w, textuur.h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    grond.position.set(textuur.x0 + textuur.w / 2, 0, textuur.y0 + textuur.h / 2); wereld.add(grond);

    // versiering: per soort en per deel één InstancedMesh (snel, ook op een iPhone)
    const perDeel = new Map();
    for (const v of versiering) {
      const s = v.r / 30;
      DELEN[v.soort](v).forEach(([vorm, kleur, p, sc = [1,1,1]], n) => {
        const sleutel = v.soort + n + vorm;
        if (!perDeel.has(sleutel)) perDeel.set(sleutel, { vorm, lijst: [] });
        perDeel.get(sleutel).lijst.push({ v, s, kleur: kleur ?? (themaNaam === 'vulkaan' ? '#2b2321' : themaNaam === 'sneeuw' ? '#9aa6b2' : '#8c7f72'), p, sc });
      });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), as = new THREE.Vector3(0, 1, 0), kleur = new THREE.Color();
    for (const { vorm, lijst } of perDeel.values()) {
      const lava = vorm === 'lava';
      const mat = lava ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }) : new THREE.MeshLambertMaterial({ color: 0xffffff });
      const im = new THREE.InstancedMesh(VORM[vorm], mat, lijst.length);
      lijst.forEach(({ v, s, kleur: k, p, sc }, i) => {
        q.setFromAxisAngle(as, v.k * Math.PI * 2);
        m4.compose(new THREE.Vector3(v.x + p[0] * s, p[1] * s, v.y + p[2] * s), q, new THREE.Vector3(sc[0] * s, sc[1] * s, sc[2] * s));
        im.setMatrixAt(i, m4); im.setColorAt(i, kleur.set(k));
      });
      wereld.add(im);
    }
    wereld.add(maakFinishboog(pad[0], breed));
    camHoek = null;
  }

  function autos(lijst) {
    const nu = lijst.map(a => a.kleur).join();
    if (nu === kleuren && modellen.length === lijst.length) return;
    modellen.forEach(m => scene.remove(m));
    modellen = lijst.map(a => { const m = maakAutoModel(a.kleur); scene.add(m); return m; });
    kleuren = nu;
  }

  function teken(lijst, speler, dt) {
    autos(lijst);
    lijst.forEach((a, i) => { modellen[i].position.set(a.x, 0, a.y); modellen[i].rotation.y = -a.a; });
    // camera volgt de speler zacht van achteren
    if (camHoek === null) camHoek = speler.a;
    camHoek += Math.atan2(Math.sin(speler.a - camHoek), Math.cos(speler.a - camHoek)) * Math.min(1, dt * 4.5);
    const fx = Math.cos(camHoek), fz = Math.sin(camHoek);
    const doel = new THREE.Vector3(speler.x - fx * 115, 46, speler.y - fz * 115);
    if (camPos.lengthSq() === 0 || dt === 0) camPos.copy(doel); else camPos.lerp(doel, Math.min(1, dt * 8));
    camera.position.copy(camPos);
    kijk.set(speler.x + fx * 70, 10, speler.y + fz * 70);
    camera.lookAt(kijk);
    const fov = 62 + Math.min(1, Math.abs(speler.v) / 570) * 12;
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  }

  function grootte(W, H) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  function reset() { camHoek = null; camPos.set(0, 0, 0); }

  return { bouw, teken, grootte, reset };
}
