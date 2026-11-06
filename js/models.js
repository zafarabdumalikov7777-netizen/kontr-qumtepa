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
  // arms: shoulder → elbow → hand, re-posed by setArmPose for each weapon (rifle, pistol, knife, grenade…)
  const top = M(o.top), gl = M(glove, 0.7);
  const arm = () => {
    const a = { u: mesh(SGEO.limbU, top, upper, 0, 0, 0, 'body'), l: mesh(SGEO.limbL, top, upper, 0, 0, 0, 'body'),
      js: mesh(SGEO.joint, top, upper, 0, 0, 0), je: mesh(SGEO.joint, top, upper, 0, 0, 0), h: mesh(SGEO.hand, gl, upper, 0, 0, 0) };
    a.js.scale.setScalar(0.072); a.je.scale.setScalar(0.052); return a;
  };
  const arms = { R: arm(), L: arm() };
  let flash = null, marker = null;
  if (!ghost) {
    flash = new THREE.Sprite(flashMat); flash.scale.set(0.6, 0.6, 0.6); flash.visible = false;
    marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexs[team], depthTest: false, transparent: true }));
    marker.scale.set(0.35, 0.35, 0.35); marker.position.set(0, 2.2, 0); marker.renderOrder = 10; g.add(marker);
  }
  scene.add(g);
  const m = { group: g, upper, legs, hit, mats, muzzle: null, flash, marker, flashT: 0, fall: 1, gun: null, gunKind: '', ghostModel: !!ghost, arms };
  setGhost(m, !!ghost);
  setSoldierGun(m, team === 'T' ? 'ak' : 'm4');
  return m;
}
// The gun the soldier carries matches its current weapon; the arms take the hold that fits it.
const ghostGunMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function setSoldierGun(m, kind) {
  if (m.gunKind === kind) return;
  if (m.gun) m.upper.remove(m.gun);
  const g = worldGun(kind);
  if (m.ghostModel) g.traverse(o => { if (o.isMesh) { o.userData.mat = o.material; if (m.ghost) o.material = ghostGunMat; } });
  m.upper.add(g); m.gun = g; m.gunKind = kind;
  m.muzzle = g.getObjectByName('muzzle');
  if (m.flash) m.muzzle.add(m.flash);
  const info = g.userData.info || {};
  setArmPose(m, info.knife ? 'knife' : info.he ? 'he' : info.pistol ? 'pistol' : 'rifle', info);
}
// ---------- Arm poses ----------
// A pose places the gun (origin = top of the grip) and the left hand; the right hand takes the grip and
// both elbows are solved (two-bone IK), so any weapon can be held any way.
const ARM_SH = { R: new V3(0.21, 1.5, -0.01), L: new V3(-0.21, 1.5, 0) }, ARM_U = 0.33, ARM_L = 0.32;
const ARM_POSES = {
  // in a fight
  rifle: { g: [0.075, 1.395, 0.33], r: [0, 0, 0], L: 'fore' },
  pistol: { g: [0.035, 1.45, 0.47], r: [0, 0, 0], L: 'cup' },
  knife: { g: [0.17, 1.24, 0.4], r: [-0.25, 0, 0], L: [-0.13, 1.3, 0.3] },
  he: { g: [0.17, 1.44, 0.28], r: [0, 0, 0], L: [-0.13, 1.3, 0.3] },
  // main menu: the relaxed holds agents stand with in the CS2 lobby
  lowRifle: { g: [0.11, 1.28, 0.2], r: [0.5, -0.32, 0.14], L: 'fore' },
  lowSniper: { g: [0.11, 1.31, 0.16], r: [0.74, -0.26, 0.1], L: 'fore' },
  lowSmg: { g: [0.1, 1.31, 0.25], r: [0.38, -0.38, 0.16], L: 'fore' },
  hip: { g: [0.14, 1.15, 0.2], r: [0.12, -0.2, 0.04], L: 'fore' },
  lowPistol: { g: [0.05, 1.2, 0.33], r: [0.9, -0.14, 0], L: 'cup' },
  sideKnife: { g: [0.27, 1.02, 0.2], r: [0.6, 0.1, -0.08], L: [-0.27, 1.0, 0.06] },
  chestNade: { g: [0.07, 1.33, 0.3], r: [0, 0, 0], L: 'cup' }
};
const _ikD = new V3(), _ikP = new V3(), _ikE = new V3(), _ikH = new V3(), _hR = new V3(), _hL = new V3(), _eu = new THREE.Euler();
function placeLimb(m, a, b) {
  m.position.addVectors(a, b).multiplyScalar(0.5);
  _dv.subVectors(b, a); m.scale.y = _dv.length(); m.quaternion.setFromUnitVectors(_ya, _dv.normalize());
}
function solveArm(A, S, H, side) {
  const d = _ikD.subVectors(H, S), len = clamp(d.length(), 0.12, ARM_U + ARM_L - 0.004); d.normalize();
  const hand = _ikH.copy(S).addScaledVector(d, len);
  const a = (ARM_U * ARM_U - ARM_L * ARM_L + len * len) / (2 * len), h = Math.sqrt(Math.max(0, ARM_U * ARM_U - a * a));
  const p = _ikP.set(0.75 * side, -0.65, -0.15); p.addScaledVector(d, -p.dot(d)).normalize(); // elbows out and down
  const e = _ikE.copy(S).addScaledVector(d, a).addScaledVector(p, h);
  placeLimb(A.u, S, e); placeLimb(A.l, e, hand);
  A.js.position.copy(S); A.je.position.copy(e); A.h.position.copy(hand);
}
// pose: a name from ARM_POSES or a pose object; info: the gun's info (fore grip, pistol, knife…)
function setArmPose(m, pose, info) {
  const P = typeof pose === 'string' ? ARM_POSES[pose] || ARM_POSES.rifle : pose; info = info || {};
  if (typeof pose === 'string') m.armPose = pose;
  const gp = m.gun ? m.gun.position : _ikH, gr = m.gun ? m.gun.rotation : _eu;
  gp.fromArray(P.g); gr.set(P.r[0], P.r[1], P.r[2]);
  const pt = (x, y, z, out) => out.set(x, y, z).applyEuler(gr).add(gp);
  if (info.knife) pt(0, -0.008, -0.06, _hR); else if (info.he) pt(-0.005, -0.075, 0.035, _hR); else pt(0.005, -0.065, 0, _hR);
  if (Array.isArray(P.L)) _hL.fromArray(P.L);
  else if (P.L === 'fore' && info.fore) pt(0.004, (info.foreY || 0) - 0.045, Math.min(info.fore, 0.27), _hL);
  else _hL.set(_hR.x - 0.048, _hR.y - 0.012, _hR.z - 0.005);
  solveArm(m.arms.R, ARM_SH.R, _hR, 1); solveArm(m.arms.L, ARM_SH.L, _hL, -1);
}
// the lobby hold for a weapon
function menuPose(def, info) {
  if (def.melee) return 'sideKnife';
  if (info.he || def.slot === 4) return 'chestNade';
  if (info.pistol) return 'lowPistol';
  if (def.id === 'negev') return 'hip';
  if (def.scope) return 'lowSniper';
  if (['mp5', 'p90', 'mac10', 'ump45'].includes(def.id)) return 'lowSmg';
  return 'lowRifle';
}
// blend two poses (for the lobby's smooth weapon change and idle breathing)
function mixPose(A, B, t) {
  const l = (a, b) => a.map((v, i) => v + (b[i] - v) * t);
  return { g: l(A.g, B.g), r: l(A.r, B.r), L: Array.isArray(A.L) && Array.isArray(B.L) ? l(A.L, B.L) : t < 0.5 ? A.L : B.L };
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
