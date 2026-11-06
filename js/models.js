'use strict';
// ---------- Soldier model (bots + the player's own shadow body) ----------
// Feet at y=0, facing +z. `upper` drops when crouching; legs are hip → knee pivots.
const SGEO = {
  thigh: new THREE.CylinderGeometry(0.09, 0.075, 0.46, 10), shin: new THREE.CylinderGeometry(0.07, 0.055, 0.46, 10),
  boot: new THREE.BoxGeometry(0.13, 0.11, 0.29), pelvis: new THREE.BoxGeometry(0.34, 0.18, 0.22),
  torso: new THREE.LatheGeometry([[0, -0.28], [0.15, -0.28], [0.165, -0.18], [0.172, -0.05], [0.19, 0.1], [0.2, 0.2], [0.175, 0.265], [0.1, 0.29], [0, 0.29]].map(([r, y]) => new THREE.Vector2(r, y)), 14),
  vest: new THREE.BoxGeometry(0.42, 0.44, 0.3),
  pouch: new THREE.BoxGeometry(0.1, 0.12, 0.06), pack: new THREE.BoxGeometry(0.3, 0.38, 0.16),
  neck: new THREE.CylinderGeometry(0.055, 0.06, 0.12, 8), head: new THREE.SphereGeometry(0.118, 16, 12),
  helmet: new THREE.SphereGeometry(0.138, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), beanie: new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  visor: new THREE.BoxGeometry(0.2, 0.025, 0.1), goggles: new THREE.BoxGeometry(0.19, 0.05, 0.04), eyes: new THREE.BoxGeometry(0.15, 0.035, 0.03),
  limbU: new THREE.CylinderGeometry(0.058, 0.05, 1, 8), limbL: new THREE.CylinderGeometry(0.05, 0.042, 1, 8), hand: new THREE.SphereGeometry(0.048, 8, 6),
  joint: new THREE.SphereGeometry(1, 10, 8), belt: new THREE.BoxGeometry(0.35, 0.06, 0.25), pad: new THREE.BoxGeometry(0.11, 0.12, 0.05), sole: new THREE.BoxGeometry(0.14, 0.035, 0.31),
  nose: new THREE.BoxGeometry(0.028, 0.045, 0.04), collar: new THREE.TorusGeometry(0.07, 0.022, 6, 14),
  gun: new THREE.BoxGeometry(0.06, 0.1, 0.5), barrel: new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), mag: new THREE.BoxGeometry(0.045, 0.16, 0.07), stock: new THREE.BoxGeometry(0.05, 0.09, 0.22)
};
const OUTFITS = {
  T: [
    { top: 0x6f5b3e, pants: 0x4a4438, vest: 0x3b3428, head: 'balaclava', pack: true },
    { top: 0x3c4a33, pants: 0x3c4250, vest: 0x262420, head: 'beanie', pack: false },
    { top: 0x5a4636, pants: 0x55524a, vest: 0x2e2a24, head: 'cap', pack: true }
  ],
  KT: [
    { top: 0x3a4b63, pants: 0x2d3644, vest: 0x232c38, head: 'helmet', pack: false },
    { top: 0x4d5660, pants: 0x383f48, vest: 0x2a3038, head: 'helmet', pack: true },
    { top: 0x34465a, pants: 0x2b3340, vest: 0x1f2832, head: 'cap', pack: false }
  ]
};
const _ya = new V3(0, 1, 0), _dv = new V3();
// A face painted on the head sphere (u = 0.25 faces +z). Balaclavas show only the eyes.
const faceCache = {};
function faceTex(skin, cover) {
  const key = skin + '_' + cover; if (faceCache[key]) return faceCache[key];
  const sc = '#' + new THREE.Color(skin).getHexString();
  return (faceCache[key] = canvasTex(256, (g, s) => {
    g.fillStyle = cover ? '#1f1d1b' : sc; g.fillRect(0, 0, s, s);
    const cx = s * 0.25;
    g.save(); g.translate(cx, 0); g.scale(0.5, 1); // the sphere stretches u twice as much as v
    if (cover) { g.fillStyle = sc; g.beginPath(); g.ellipse(0, s * 0.44, 62, 16, 0, 0, 7); g.fill(); }
    else {
      const sh = g.createRadialGradient(0, s * 0.5, 20, 0, s * 0.5, 130); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,30,15,0.25)');
      g.fillStyle = sh; g.fillRect(-140, 0, 280, s);
      g.fillStyle = 'rgba(60,40,30,0.22)'; g.beginPath(); g.ellipse(0, s * 0.68, 50, 26, 0, 0, Math.PI); g.fill(); // stubble
      g.fillStyle = 'rgba(190,90,70,0.18)'; for (const x of [-38, 38]) { g.beginPath(); g.ellipse(x, s * 0.56, 14, 8, 0, 0, 7); g.fill(); }
      g.strokeStyle = '#2a1a12'; g.lineWidth = 4; g.lineCap = 'round';
      for (const x of [-30, 30]) { g.beginPath(); g.moveTo(x - 14, s * 0.39); g.quadraticCurveTo(x, s * 0.37, x + 14 * Math.sign(x), s * 0.395); g.stroke(); } // brows
      g.strokeStyle = 'rgba(110,40,35,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, s * 0.635); g.quadraticCurveTo(0, s * 0.645, 16, s * 0.635); g.stroke(); // mouth
    }
    for (const x of [-30, 30]) { // eyes
      g.fillStyle = '#efe9e0'; g.beginPath(); g.ellipse(x, s * 0.44, 12, 5.5, 0, 0, 7); g.fill();
      g.fillStyle = '#3a2a1c'; g.beginPath(); g.ellipse(x, s * 0.44, 5, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#0b0806'; g.beginPath(); g.ellipse(x, s * 0.44, 2.4, 2.4, 0, 0, 7); g.fill();
    }
    g.restore();
  }));
}
// `variant` is an index into the stock outfits or an agent (whose `look` dresses the soldier)
function makeSoldier(team, variant, ghost) {
  const o = typeof variant === 'object' && variant ? variant.look : OUTFITS[team][variant % OUTFITS[team].length];
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const upper = new THREE.Group(); g.add(upper);
  const mats = [], hit = [], cache = {};
  const M = (c, rough = 0.85, metal = 0) => {
    const k = (typeof c === 'object' ? JSON.stringify(c) : c) + '_' + rough; if (cache[k]) return cache[k];
    const m = typeof c === 'object' ? clothMaterial(c, rough) : std(Object.assign({ color: lin(c), roughness: rough, metalness: metal }, rough >= 0.75 && !metal ? { bumpMap: weaveTex, bumpScale: 0.003 } : {}));
    mats.push(m); cache[k] = m; return m;
  };
  const mesh = (geo, mat, parent, x, y, z, part) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = !ghost; parent.add(m);
    if (part) { m.userData = { agent: null, part }; hit.push(m); }
    return m;
  };
  const limb = (geo, mat, a, b, part) => {
    const m = mesh(geo, mat, upper, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, part);
    _dv.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); m.scale.y = _dv.length(); m.quaternion.setFromUnitVectors(_ya, _dv.normalize());
    return m;
  };
  const skin = o.skin || 0xc2946c, boot = 0x1b1a18, glove = o.glove || 0x22201d;
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.1 * s, 0.94, 0); g.add(hip);
    mesh(SGEO.thigh, M(o.pants), hip, 0, -0.23, 0, 'legs');
    const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
    mesh(SGEO.shin, M(o.pants), knee, 0, -0.23, 0, 'legs');
    mesh(SGEO.boot, M(boot, 0.6), knee, 0, -0.44, 0.04);
    mesh(SGEO.sole, M(0x0d0c0b, 0.9), knee, 0, -0.5, 0.045);
    mesh(SGEO.pad, M(0x1c1d1e, 0.7), knee, 0, -0.03, 0.075);
    legs.push({ hip, knee });
  }
  mesh(SGEO.pelvis, M(o.pants), upper, 0, 1.0, 0);
  mesh(SGEO.torso, M(o.top), upper, 0, 1.3, 0, 'body').scale.z = 0.72;
  mesh(SGEO.vest, M(o.vest, 0.7), upper, 0, 1.32, 0);
  mesh(SGEO.belt, M(0x1a1916, 0.6), upper, 0, 1.08, 0); mesh(SGEO.nose, M(0x8a8f94, 0.3, 0.8), upper, 0, 1.08, 0.13).scale.set(1.8, 0.8, 0.3);
  for (const x of [-0.12, 0, 0.12]) mesh(SGEO.pouch, M(o.vest, 0.7), upper, x, 1.2, 0.17);
  if (o.pack) mesh(SGEO.pack, M(team === 'T' ? 0x4a3f2c : 0x2a3340), upper, 0, 1.33, -0.22);
  mesh(SGEO.neck, M(skin, 0.6), upper, 0, 1.6, 0);
  mesh(SGEO.collar, M(o.top), upper, 0, 1.555, 0).rotation.x = Math.PI / 2;
  // real faces for human heads; masks, hoods and characters bring their own
  const face = !o.morph && o.head !== 'mask' && o.head !== 'hood';
  let headMat = o.head === 'balaclava' ? M(0x1f1d1b) : M(skin, 0.6);
  if (face) { headMat = std({ map: faceTex(skin, o.head === 'balaclava'), roughness: 0.62 }); mats.push(headMat); }
  const headMesh = mesh(SGEO.head, headMat, upper, 0, 1.72, 0.01, 'head');
  if (face) {
    headMesh.scale.set(0.94, 1.06, 1);
    mesh(SGEO.nose, o.head === 'balaclava' ? M(0x1f1d1b) : M(skin, 0.6), upper, 0, 1.712, 0.118);
    if (o.head !== 'balaclava') for (const x of [-0.112, 0.112]) mesh(SGEO.joint, M(skin, 0.6), upper, x, 1.72, 0).scale.set(0.012, 0.03, 0.022);
  }
  if (o.head === 'helmet') { mesh(SGEO.helmet, M(o.helmetCol || 0x2e3a2c, 0.7), upper, 0, 1.75, 0); mesh(SGEO.goggles, M(0x101214, 0.3, 0.4), upper, 0, 1.76, 0.115); }
  if (o.head === 'beanie') mesh(SGEO.beanie, M(o.headCol || 0x2a2622), upper, 0, 1.75, 0);
  if (o.head === 'cap') { mesh(SGEO.beanie, M(o.headCol || (team === 'T' ? 0x3a3428 : 0x232c38)), upper, 0, 1.74, 0).scale.y = 0.6; mesh(SGEO.visor, M(0x1d1c1a), upper, 0, 1.76, 0.13); }
  if (o.head === 'beret') { const b = mesh(SGEO.head, M(o.headCol || 0x7a1c1c), upper, -0.02, 1.81, 0); b.scale.set(1.12, 0.38, 1.1); b.rotation.z = 0.28; }
  if (o.head === 'bandana') { mesh(SGEO.goggles, M(o.headCol || 0xb3261e), upper, 0, 1.68, 0.1).scale.set(1.15, 1.8, 1.4); mesh(SGEO.beanie, M(o.headCol || 0xb3261e), upper, 0, 1.75, 0).scale.y = 0.5; }
  if (o.head === 'hood') { const hd = mesh(SGEO.head, M(o.headCol || 0x2a1838), upper, 0, 1.74, -0.03); hd.scale.set(1.25, 1.18, 1.22); mesh(SGEO.eyes, M(0x0c0a0c), upper, 0, 1.72, 0.115).scale.set(1.2, 2.2, 1); }
  if (o.head === 'mask') { // gas mask: dark faceplate, round eye glass and a filter canister
    mesh(SGEO.goggles, M(0x15171a, 0.5), upper, 0, 1.7, 0.1).scale.set(1, 2.6, 1.6);
    for (const x of [-0.045, 0.045]) mesh(SGEO.hand, M(0x2b3a40, 0.15, 0.6), upper, x, 1.745, 0.115).scale.set(0.55, 0.45, 0.3);
    const f = mesh(SGEO.barrel, M(0x30343a, 0.5, 0.4), upper, 0, 1.63, 0.15); f.scale.set(2.6, 0.25, 2.6); f.rotation.x = Math.PI / 2;
    mesh(SGEO.beanie, M(o.headCol || 0x1b1d20), upper, 0, 1.74, -0.01).scale.set(1.05, 0.9, 1.05);
  }
  if (o.morph) dressMorph(o.morph, { mesh, M, mats, upper, head: headMesh });
  // arms holding the rifle
  const top = M(o.top), gl = M(glove, 0.7);
  const shR = [0.21, 1.5, -0.01], elR = [0.25, 1.27, 0.15], haR = [0.08, 1.33, 0.33];
  const shL = [-0.21, 1.5, 0], elL = [-0.21, 1.3, 0.3], haL = [-0.01, 1.37, 0.56];
  limb(SGEO.limbU, top, shR, elR, 'body'); limb(SGEO.limbL, top, elR, haR, 'body');
  limb(SGEO.limbU, top, shL, elL, 'body'); limb(SGEO.limbL, top, elL, haL, 'body');
  for (const p of [shR, shL]) mesh(SGEO.joint, top, upper, ...p).scale.setScalar(0.072);
  for (const p of [elR, elL]) mesh(SGEO.joint, top, upper, ...p).scale.setScalar(0.052);
  mesh(SGEO.hand, gl, upper, ...haR); mesh(SGEO.hand, gl, upper, ...haL);
  let flash = null, marker = null;
  if (!ghost) {
    flash = new THREE.Sprite(flashMat); flash.scale.set(0.6, 0.6, 0.6); flash.visible = false;
    marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexs[team], depthTest: false, transparent: true }));
    marker.scale.set(0.35, 0.35, 0.35); marker.position.set(0, 2.2, 0); marker.renderOrder = 10; g.add(marker);
  }
  scene.add(g);
  const m = { group: g, upper, legs, hit, mats, muzzle: null, flash, marker, flashT: 0, fall: 1, gun: null, gunKind: '', ghostModel: !!ghost };
  setGhost(m, !!ghost);
  setSoldierGun(m, team === 'T' ? 'ak' : 'm4');
  return m;
}
// The gun the soldier carries matches its current weapon; the grip sits in the right hand.
const ghostGunMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function setSoldierGun(m, kind) {
  if (m.gunKind === kind) return;
  if (m.gun) m.upper.remove(m.gun);
  const g = worldGun(kind); g.position.set(0.075, 1.395, 0.33);
  if (m.ghostModel) g.traverse(o => { if (o.isMesh) { o.userData.mat = o.material; if (m.ghost) o.material = ghostGunMat; } });
  m.upper.add(g); m.gun = g; m.gunKind = kind;
  m.muzzle = g.getObjectByName('muzzle');
  if (m.flash) m.muzzle.add(m.flash);
}
// A ghost body is invisible to the camera but still casts a shadow (the shadow pass ignores colorWrite).
function setGhost(m, on) {
  for (const mat of m.mats) { mat.colorWrite = !on; mat.depthWrite = !on; }
  m.ghost = on;
  if (m.gun && m.ghostModel) m.gun.traverse(o => { if (o.isMesh) o.material = on ? ghostGunMat : o.userData.mat || o.material; });
}
function poseSoldier(m, phase, run, crouch, air) {
  const drop = 0.42 * crouch, th = Math.acos(clamp((0.92 - drop) / 0.92, -1, 1));
  m.upper.position.y = -drop;
  const sw = Math.sin(phase) * 0.6 * run * (1 - crouch * 0.5);
  for (let i = 0; i < 2; i++) {
    const s = i ? -1 : 1, L = m.legs[i];
    L.hip.position.y = 0.94 - drop;
    let h = -th + s * sw, k = 2 * th + Math.max(0, -s * Math.sin(phase)) * 0.7 * run;
    if (air) { h -= 0.45; k += 0.8; }
    L.hip.rotation.x = h; L.knee.rotation.x = k;
  }
}
function disposeSoldier(m) {
  scene.remove(m.group);
  m.mats.forEach(x => x.dispose());
  if (m.marker) m.marker.material.dispose();
}
