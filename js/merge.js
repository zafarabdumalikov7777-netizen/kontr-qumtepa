'use strict';
// ---------- Draw-call merging ----------
// Phones are limited by how many separate meshes are drawn per frame, not by triangles. Meshes that never
// move relative to each other and share a material are welded into one geometry. Hit meshes stay in place,
// hidden, so bullets still find heads, bodies and walls exactly as before.
const WHITE_C = new THREE.Color(1, 1, 1);
const _mm = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _mn = new THREE.Matrix3(), _mv = new V3();
function mergeGeometries(items) {
  let vc = 0, ic = 0;
  const hasUv = items.some(it => it.geo.attributes.uv), hasCol = items.some(it => it.c || it.geo.attributes.color);
  for (const it of items) { vc += it.geo.attributes.position.count; ic += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = hasUv ? new Float32Array(vc * 2) : null, col = hasCol ? new Float32Array(vc * 3) : null;
  const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
  let vo = 0, io = 0;
  for (const it of items) {
    const g = it.geo, m = it.m, p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv, ca = g.attributes.color;
    _mn.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) {
      _mv.fromBufferAttribute(p, i).applyMatrix4(m); pos[(vo + i) * 3] = _mv.x; pos[(vo + i) * 3 + 1] = _mv.y; pos[(vo + i) * 3 + 2] = _mv.z;
      if (n) { _mv.fromBufferAttribute(n, i).applyMatrix3(_mn).normalize(); nor[(vo + i) * 3] = _mv.x; nor[(vo + i) * 3 + 1] = _mv.y; nor[(vo + i) * 3 + 2] = _mv.z; }
      if (uv && t) { uv[(vo + i) * 2] = t.getX(i); uv[(vo + i) * 2 + 1] = t.getY(i); }
      if (col) {
        if (!it.c && ca) { col[(vo + i) * 3] = ca.getX(i); col[(vo + i) * 3 + 1] = ca.getY(i); col[(vo + i) * 3 + 2] = ca.getZ(i); }
        else { const c = it.c || WHITE_C; col[(vo + i) * 3] = c.r; col[(vo + i) * 3 + 1] = c.g; col[(vo + i) * 3 + 2] = c.b; }
      }
    }
    const flip = m.determinant() < 0; // a mirrored part: keep its faces pointing outwards
    const cnt = g.index ? g.index.count : p.count, at = k => g.index ? g.index.getX(k) : k;
    for (let k = 0; k < cnt; k += 3) {
      const a = at(k), b = at(k + 1), c = at(k + 2);
      idx[io + k] = a + vo; idx[io + k + 1] = (flip ? c : b) + vo; idx[io + k + 2] = (flip ? b : c) + vo;
    }
    io += cnt; vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}
const mergeable = o => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && o.geometry.isBufferGeometry && o.geometry.attributes.position &&
  !Array.isArray(o.material) && o.visible && !o.userData.noMerge;
// Welds the meshes under `root` that `filter` accepts: one mesh per (parent, material, shadow flags).
// keep(o): meshes that must stay (hidden) because something raycasts them; the rest are taken out.
// vc: a material to share (vertexColors) for plain untextured parts, so a whole body part is one draw
const vcOk = m => !m.map && !m.transparent && m.opacity >= 1 && m.colorWrite !== false && (!m.emissive || m.emissive.getHex() === 0) && m.color;
// flat: the whole tree is static, so parts from any sub-group can be welded together under root
function mergeTree(root, filter = () => true, keep = () => false, vc = null, flat = false) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse(o => {
    if (o === root || !mergeable(o) || !filter(o)) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible) return;
    const k = (flat ? '' : o.parent.uuid) + '|' + (vc && vcOk(o.material) ? 'vc' : o.material.uuid) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.layers.mask + '|' + o.renderOrder;
    let gr = groups.get(k); if (!gr) groups.set(k, gr = []);
    gr.push(o);
  });
  const made = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parent = flat ? root : list[0].parent;
    _mi.copy(parent.matrixWorld).invert();
    const items = list.map(o => {
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      return { geo: o.geometry, m: new THREE.Matrix4().multiplyMatrices(_mi, o.matrixWorld), c: vc && vcOk(o.material) ? o.material.color : null };
    });
    const mesh = new THREE.Mesh(mergeGeometries(items), items[0].c ? vc : list[0].material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow; mesh.layers.mask = list[0].layers.mask; mesh.renderOrder = list[0].renderOrder;
    mesh.userData.merged = true;
    parent.add(mesh); made.push(mesh);
    for (const o of list) { if (keep(o)) o.visible = false; else o.parent.remove(o); }
  }
  return made;
}
// the static map: everything in the world group; walls and crates stay (hidden) for bullets and grenades
let worldMerged = [];
function mergeWorld() {
  const hit = new Set(worldMeshes);
  worldMerged = mergeTree(worldGroup, o => o !== skyMesh, o => hit.has(o), null, true);
  for (const o of worldMeshes) if (!o.visible) o.matrixAutoUpdate = false;
}

// soldiers' arms are re-posed per weapon: rebuild their welded mesh after each pose
function mergeArms(m) {
  if (!m.armMerge) return;
  if (m.armMeshes) for (const a of m.armMeshes) { m.upper.remove(a); a.geometry.dispose(); }
  const parts = [];
  for (const A of Object.values(m.arms)) for (const o of [A.u, A.l, A.js, A.je, A.h]) { o.updateMatrix(); parts.push(o); o.visible = false; }
  const by = new Map();
  for (const o of parts) { const k = m.armVc && vcOk(o.material) ? 'vc' : o.material.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(o); }
  m.armMeshes = [];
  for (const [k, list] of by) {
    const items = list.map(o => ({ geo: o.geometry, m: o.matrix, c: k === 'vc' ? o.material.color : null }));
    const mesh = new THREE.Mesh(mergeGeometries(items), k === 'vc' ? m.armVc : list[0].material);
    mesh.castShadow = true; mesh.receiveShadow = !m.ghostModel; mesh.userData.merged = true;
    m.upper.add(mesh); m.armMeshes.push(mesh);
  }
}
function unmergeArms(m) {
  m.armMerge = false;
  if (m.armMeshes) for (const a of m.armMeshes) { m.upper.remove(a); a.geometry.dispose(); }
  m.armMeshes = null;
  for (const A of Object.values(m.arms)) for (const o of [A.u, A.l, A.js, A.je, A.h]) o.visible = true;
}
