'use strict';
// ---------- Utilities ----------
const $ = s => document.querySelector(s);
const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const turnToward = (a, b, step) => { const d = angDiff(a, b); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
let seed = 1337;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const settings = {
  sens: clamp(+store.get('kq_sens', 1) || 1, 0.2, 3),
  team: store.get('kq_team', 'KT') === 'T' ? 'T' : 'KT',
  diff: clamp(store.get('kq_diff', 1) | 0, 0, 2),
  map: String(store.get('kq_map', 'qumtepa')),
  allies: clamp(store.get('kq_allies', 4) | 0, 0, 9),
  enemies: clamp(store.get('kq_enemies', 5) | 0, 1, 10),
  speedo: store.get('kq_speedo', true) !== false
};
const SKILL = [
  { react: 0.75, err: 0.055, head: 0.12, turn: 5, burst: [2, 4], crouch: 0.15 },
  { react: 0.45, err: 0.034, head: 0.25, turn: 8, burst: [3, 5], crouch: 0.3 },
  { react: 0.26, err: 0.021, head: 0.42, turn: 12, burst: [3, 6], crouch: 0.5 }
];
let SK = SKILL[settings.diff];

// ---------- Weapons ----------
const WEAPONS = {
  knife:  { id: 'knife', name: 'Pichoq', slot: 3, melee: true, dmg: 40, rate: 0.45, speed: 1.05, kill: 1500, model: 'knife', snd: 'knife' },
  usp:    { id: 'usp', name: 'USP-S', slot: 2, dmg: 35, rate: 0.16, mag: 12, res: 24, reload: 2.2, spread: 0.006, moveInacc: 0.05, recoil: 0.03, armorPen: 0.5, speed: 1, price: 200, snd: 'usp', kill: 300, model: 'usp' },
  glock:  { id: 'glock', name: 'Glock-18', slot: 2, dmg: 28, rate: 0.14, mag: 20, res: 120, reload: 2.2, spread: 0.008, moveInacc: 0.05, recoil: 0.025, armorPen: 0.47, speed: 1, price: 200, snd: 'pistol', kill: 300, model: 'pistol' },
  deagle: { id: 'deagle', name: 'Desert Eagle', slot: 2, dmg: 63, rate: 0.3, mag: 7, res: 35, reload: 2.2, spread: 0.01, moveInacc: 0.09, recoil: 0.075, armorPen: 0.93, speed: 0.97, price: 700, snd: 'deagle', kill: 300, model: 'deagle', stat: 'Bir o‘q — katta zarar' },
  mp5:    { id: 'mp5', name: 'MP5-SD', slot: 1, dmg: 27, rate: 0.08, mag: 30, res: 120, reload: 2.6, spread: 0.012, moveInacc: 0.02, recoil: 0.012, auto: true, armorPen: 0.65, speed: 1, price: 1500, snd: 'smg', kill: 600, model: 'smg', stat: 'Tez, yugurib otishga qulay' },
  ak47:   { id: 'ak47', name: 'AK-47', slot: 1, dmg: 36, rate: 0.1, mag: 30, res: 90, reload: 2.5, spread: 0.006, moveInacc: 0.09, recoil: 0.022, auto: true, armorPen: 0.77, speed: 0.92, price: 2700, snd: 'ak', kill: 300, model: 'ak', stat: 'Boshga bitta o‘q yetadi' },
  m4a1:   { id: 'm4a1', name: 'M4A1-S', slot: 1, dmg: 33, rate: 0.09, mag: 25, res: 75, reload: 3.1, spread: 0.005, moveInacc: 0.08, recoil: 0.018, auto: true, armorPen: 0.7, speed: 0.94, price: 2900, snd: 'm4', kill: 300, model: 'm4', stat: 'Aniq, tepkisi kam' },
  awp:    { id: 'awp', name: 'AWP', slot: 1, dmg: 115, rate: 1.45, mag: 5, res: 30, reload: 3.6, spread: 0.0008, unscoped: 0.09, moveInacc: 0.25, recoil: 0.09, armorPen: 0.97, speed: 0.84, price: 4750, snd: 'awp', kill: 100, model: 'awp', scope: true, stat: 'Snayper, tanaga ham bir o‘q' },
  he:     { id: 'he', name: 'HE granata', slot: 4, dmg: 98, armorPen: 0.57, price: 300, model: 'he', kill: 300, stat: '9 m radiusda portlaydi' }
};
const SHOT = {
  pistol: { f: 3600, d: 0.12, th: 150, tv: 0.5 },
  usp:    { f: 1700, d: 0.09, th: 120, tv: 0.35 },
  deagle: { f: 2000, d: 0.26, th: 90, tv: 1 },
  smg:    { f: 1500, d: 0.08, th: 120, tv: 0.3 },
  ak:     { f: 2300, d: 0.2, th: 100, tv: 0.9 },
  m4:     { f: 1600, d: 0.12, th: 110, tv: 0.5 },
  awp:    { f: 1500, d: 0.6, th: 70, tv: 1.2 }
};

// ---------- Map state (filled by setGrid from a MAPS entry) ----------
const CELL = 3.5, CRATE_S = CELL * 0.82, CRATE_H = 1.05;
let MAP = null, W = 30, H = 30, G = [], OX = 0, OZ = 0;
let SPAWN_C = { KT: { x: 0, z: 0 }, T: { x: 0, z: 0 } }, SITES = { A: [], B: [] };
const cxw = c => OX + (c + 0.5) * CELL, czw = c => OZ + (c + 0.5) * CELL;
const wcx = x => Math.floor((x - OX) / CELL), wcz = z => Math.floor((z - OZ) / CELL);
const walkable = (cx, cz) => cx >= 0 && cz >= 0 && cx < W && cz < H && '#cC'.indexOf(G[cz][cx]) < 0;
const cellsOf = ch => { const out = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (G[z][x] === ch) out.push({ x, z }); return out; };
const centerOf = ch => { const c = cellsOf(ch); return { x: c.reduce((s, q) => s + cxw(q.x), 0) / c.length, z: c.reduce((s, q) => s + czw(q.z), 0) / c.length }; };
function setGrid(def) {
  MAP = def; W = def.w || 30; H = def.h || 30;
  G = Array.from({ length: H }, () => Array(W).fill('#'));
  const carve = (x0, y0, x1, y1, ch = '.') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
  const put = (x, y, ch) => { G[y][x] = ch; };
  def.build(carve, put);
  OX = -W * CELL / 2; OZ = -H * CELL / 2;
  SPAWN_C = { KT: centerOf('S'), T: centerOf('T') };
  SITES = { A: cellsOf('A'), B: cellsOf('B') };
}

// ---------- Renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;
$('#view').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8c7a6, 60, 260);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 900);
camera.rotation.order = 'YXZ';
const vScene = new THREE.Scene();
const vCam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
const vHemi = new THREE.HemisphereLight(0xffffff, 0x6b5a45, 0.9); vScene.add(vHemi);
const vSun = new THREE.DirectionalLight(0xfff1d8, 1.6); vSun.position.set(1, 2, 1.5); vScene.add(vSun);

const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x9a7a50, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2);
const SHADOW_R = 55;
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 1, far: 260 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
scene.add(sun); scene.add(sun.target);
// Keep the shadow map centred on the viewer so shadows stay sharp; snap to texels to stop shimmering.
function updateSun(x, z) {
  const t = 2 * SHADOW_R / 2048, d = MAP.theme.sunDir;
  x = Math.round(x / t) * t; z = Math.round(z / t) * t;
  sun.target.position.set(x, 0, z); sun.position.set(x + d[0] * 120, d[1] * 120, z + d[2] * 120);
}
const muzzleLight = new THREE.PointLight(0xffc27a, 0, 10, 2); scene.add(muzzleLight);

// ---------- Collision & line of sight ----------
const boxes = [];      // collision AABBs
const worldMeshes = []; // bullet targets
function hitBox(x, y, z, r, h) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y + h > b.y0 && y < b.y1) return b;
  }
  return null;
}
function moveXZ(p, dx, dz, r, h) {
  p.x += dx; let b = hitBox(p.x, p.y, p.z, r, h);
  if (b) p.x = dx > 0 ? b.x0 - r - 0.001 : b.x1 + r + 0.001;
  p.z += dz; b = hitBox(p.x, p.y, p.z, r, h);
  if (b) p.z = dz > 0 ? b.z0 - r - 0.001 : b.z1 + r + 0.001;
}
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(d / 0.3));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + dx * t, z = az + dz * t, y = ay + (by - ay) * t;
    const cx = wcx(x), cz = wcz(z);
    if (cx < 0 || cz < 0 || cx >= W || cz >= H) return false;
    const c = G[cz][cx];
    if (c === '#') return false;
    if ((c === 'c' || c === 'C') && y < (c === 'C' ? CRATE_H * 2 : CRATE_H) &&
        Math.abs(x - cxw(cx)) < CRATE_S / 2 && Math.abs(z - czw(cz)) < CRATE_S / 2) return false;
  }
  return true;
}

// ---------- Pathfinding (A* on the cell grid) ----------
function astar(sx, sz, gx, gz) {
  if (!walkable(gx, gz) || !walkable(sx, sz)) return null;
  const N = W * H, gs = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = [];
  const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
    return top;
  };
  const hh = (x, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const s = sz * W + sx, goal = gz * W + gx;
  gs[s] = 0; push(s, hh(sx, sz));
  while (heap.length) {
    const i = pop()[1]; if (closed[i]) continue; closed[i] = 1; if (i === goal) break;
    const x = i % W, z = (i / W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!walkable(nx, nz)) continue;
      if (dx && dz && (!walkable(x + dx, z) || !walkable(x, z + dz))) continue;
      const ni = nz * W + nx; if (closed[ni]) continue;
      const ng = gs[i] + (dx && dz ? 1.414 : 1);
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = i; push(ni, ng + hh(nx, nz)); }
    }
  }
  if (goal !== s && came[goal] < 0) return null;
  const out = []; for (let i = goal; i !== s; i = came[i]) out.push(i);
  out.reverse();
  return out.map(i => ({ x: cxw(i % W), z: czw((i / W) | 0) }));
}
function walkClear(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, n = Math.ceil(Math.hypot(dx, dz) / 0.4), r = 0.45;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = ax + dx * t, z = az + dz * t;
    if (!walkable(wcx(x - r), wcz(z - r)) || !walkable(wcx(x + r), wcz(z - r)) || !walkable(wcx(x - r), wcz(z + r)) || !walkable(wcx(x + r), wcz(z + r))) return false;
  }
  return true;
}
function smoothPath(sx, sz, pts) {
  const out = []; let cx = sx, cz = sz, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !walkClear(cx, cz, pts[j].x, pts[j].z)) j--;
    out.push(pts[j]); cx = pts[j].x; cz = pts[j].z; i = j + 1;
  }
  return out;
}
function nearestWalkable(cx, cz) {
  if (walkable(cx, cz)) return { x: cx, z: cz };
  for (let r = 1; r < 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++)
    if (walkable(cx + dx, cz + dz)) return { x: cx + dx, z: cz + dz };
  return { x: cx, z: cz };
}
