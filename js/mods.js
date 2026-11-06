'use strict';
// ---------- Mods: wallhack, characters, big heads, moon gravity ----------
const MODS = {
  wall: store.get('kq_mod_wall', false) === true,
  big: store.get('kq_mod_big', false) === true,
  grav: store.get('kq_mod_grav', false) === true,
  morph: store.get('kq_mod_morph', 'off')
};
// Original characters: each dresses the stock soldier in its colours and adds its own head
const MORPHS = {
  robot: { name: 'Robot', icon: '🤖', look: { top: 0x8c939b, pants: 0x5d636b, vest: 0x3a3f46, skin: 0x9aa3ad, glove: 0x30343a, head: 'none' } },
  alien: { name: 'O‘zga sayyoralik', icon: '👽', look: { top: 0x4b2a6b, pants: 0x2f1a45, vest: 0x2a173f, skin: 0x7fd36b, glove: 0x7fd36b, head: 'none' } },
  skelet: { name: 'Skelet', icon: '💀', look: { top: 0x161616, pants: 0x161616, vest: 0x0e0e0e, skin: 0xece6d6, glove: 0xece6d6, head: 'none' } },
  zombi: { name: 'Zombi', icon: '🧟', look: { top: 0x5a4a3a, pants: 0x3a3a4a, vest: 0x4a3a2a, skin: 0x8fae6b, glove: 0x8fae6b, head: 'none' } },
  qahramon: { name: 'Supergeroy', icon: '🦸', look: { top: 0x1f4fbf, pants: 0x1f4fbf, vest: 0x1f4fbf, skin: 0xd9a77e, glove: 0xc81e1e, head: 'none' } },
  multfilm: { name: 'Multfilm qahramoni', icon: '😃', look: { top: 0xff8a1f, pants: 0x2f6fd8, vest: 0xff8a1f, skin: 0xffd23a, glove: 0xffffff, head: 'none' } },
  qovoq: { name: 'Qovoq bosh', icon: '🎃', look: { top: 0x1a1a1a, pants: 0x1a1a1a, vest: 0x2a1a0a, skin: 0xff7a1a, glove: 0x1a1a1a, head: 'none' } },
  kosmonavt: { name: 'Kosmonavt', icon: '🧑‍🚀', look: { top: 0xeef1f4, pants: 0xeef1f4, vest: 0xc9ced4, skin: 0xd9a77e, glove: 0xeef1f4, head: 'none' } }
};
// a makeSoldier variant for the chosen character, or null when the mod is off
function morphVariant() {
  if (!MORPHS[MODS.morph] && MODS.morph !== 'mix') return null;
  const id = MODS.morph === 'mix' ? pick(Object.keys(MORPHS)) : MODS.morph;
  return { look: Object.assign({ morph: id }, MORPHS[id].look) };
}
const MG = {
  box: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(1, 14, 10), rod: new THREE.CylinderGeometry(1, 1, 1, 8),
  tri: new THREE.ConeGeometry(1, 1, 3), cone: new THREE.ConeGeometry(1, 1, 10), cape: new THREE.PlaneGeometry(1, 1), smile: new THREE.TorusGeometry(1, 0.17, 6, 16, Math.PI)
};
// k = { mesh, M, mats, upper, head } from makeSoldier; head is the hit sphere at y 1.72
function dressMorph(id, k) {
  const { M, head } = k;
  const own = o => { const m = std(o); k.mats.push(m); return m; };
  const glow = c => own({ color: lin(c), emissive: lin(c), emissiveIntensity: 1.6 });
  const cloth = c => own({ color: lin(c), roughness: 0.8, side: THREE.DoubleSide });
  const put = (geo, mat, x, y, z, sx, sy = sx, sz = sx) => { const m = k.mesh(geo, mat, k.upper, x, y, z); m.scale.set(sx, sy, sz); return m; };
  const dark = M(0x0d0d0d, 0.5);
  if (id === 'robot') {
    head.visible = false;
    put(MG.box, M(0xa7b0ba, 0.35, 0.8), 0, 1.74, 0.01, 0.26, 0.25, 0.25);
    put(MG.box, glow(0x38e1ff), 0, 1.75, 0.135, 0.2, 0.05, 0.02);
    for (const s of [-1, 1]) put(MG.rod, M(0x5d636b, 0.4, 0.8), s * 0.14, 1.74, 0, 0.035, 0.03, 0.035).rotation.z = Math.PI / 2;
    put(MG.rod, M(0x5d636b, 0.4, 0.8), 0, 1.92, 0, 0.008, 0.14, 0.008);
    put(MG.ball, glow(0xff3b3b), 0, 2.0, 0, 0.025);
    put(MG.box, glow(0x38e1ff), 0, 1.4, 0.16, 0.08, 0.05, 0.02);
  } else if (id === 'alien') {
    head.scale.set(1.2, 1.5, 1.2); head.position.y = 1.77;
    for (const s of [-1, 1]) put(MG.ball, M(0x050505, 0.08, 0.3), s * 0.052, 1.77, 0.12, 0.042, 0.028, 0.02).rotation.z = s * 0.45;
  } else if (id === 'skelet') {
    for (const s of [-1, 1]) put(MG.ball, dark, s * 0.045, 1.745, 0.098, 0.03);
    put(MG.tri, dark, 0, 1.7, 0.112, 0.015, 0.025, 0.01);
    put(MG.box, M(0xf2ecdc, 0.6), 0, 1.655, 0.095, 0.1, 0.025, 0.02);
    put(MG.box, dark, 0, 1.655, 0.106, 0.1, 0.004, 0.004);
    for (let i = 0; i < 4; i++) put(MG.box, M(0xece6d6, 0.6), 0, 1.47 - i * 0.075, 0.156, 0.3 - i * 0.02, 0.028, 0.012);
    put(MG.box, M(0xece6d6, 0.6), 0, 1.36, 0.157, 0.03, 0.36, 0.012);
  } else if (id === 'zombi') {
    head.rotation.z = 0.22;
    for (const s of [-1, 1]) put(MG.ball, glow(0xff2a1a), s * 0.042, 1.745, 0.105, 0.016);
    put(MG.box, M(0x2a0a0a), 0, 1.665, 0.108, 0.07, 0.022, 0.01);
    put(MG.box, M(0x6a0d0d, 0.5), 0.08, 1.3, 0.153, 0.1, 0.14, 0.01); put(MG.box, M(0x6a0d0d, 0.5), -0.1, 1.43, 0.153, 0.06, 0.05, 0.01);
    put(MG.ball, M(0x2a2218), 0, 1.79, -0.02, 0.1, 0.05, 0.1);
  } else if (id === 'qahramon') {
    put(MG.box, M(0x111111, 0.5), 0, 1.745, 0.1, 0.23, 0.05, 0.04);
    put(MG.ball, M(0x1b1410), 0, 1.77, -0.005, 0.125, 0.08, 0.125);
    put(MG.box, M(0xffd23a, 0.4), 0, 1.42, 0.155, 0.1, 0.1, 0.012).rotation.z = Math.PI / 4;
    put(MG.box, M(0xc81e1e), 0, 1.42, 0.162, 0.05, 0.05, 0.01).rotation.z = Math.PI / 4;
    put(MG.box, M(0xffd23a, 0.4), 0, 1.07, 0, 0.36, 0.05, 0.24);
    put(MG.cape, cloth(0xc81e1e), 0, 1.08, -0.2, 0.5, 0.95, 1).rotation.x = 0.12;
  } else if (id === 'multfilm') {
    head.scale.setScalar(1.9); head.position.y = 1.87;
    for (const s of [-1, 1]) { put(MG.ball, M(0xffffff, 0.3), s * 0.075, 1.93, 0.18, 0.055); put(MG.ball, M(0x111111, 0.2), s * 0.075, 1.93, 0.228, 0.026); }
    put(MG.smile, M(0x7a1d1d, 0.5), 0, 1.83, 0.2, 0.07).rotation.z = Math.PI;
    put(MG.ball, M(0xff9a3a), 0, 1.87, 0.225, 0.028);
    put(MG.cone, M(0x6b3a1a), 0, 2.12, 0, 0.05, 0.12, 0.05);
  } else if (id === 'qovoq') {
    head.scale.set(1.55, 1.25, 1.55); head.position.y = 1.78;
    for (const s of [-1, 1]) put(MG.tri, glow(0xffb31a), s * 0.06, 1.81, 0.17, 0.03, 0.035, 0.01);
    put(MG.box, glow(0xffb31a), 0, 1.73, 0.175, 0.15, 0.03, 0.01);
    put(MG.rod, M(0x3f6b2a), 0, 1.97, 0, 0.02, 0.07, 0.02);
  } else if (id === 'kosmonavt') {
    put(MG.ball, M(0xf4f6f8, 0.4), 0, 1.74, 0, 0.19);
    put(MG.ball, M(0xd9a23a, 0.12, 0.9), 0, 1.745, 0.075, 0.15, 0.13, 0.12);
    put(MG.box, M(0xdfe3e8, 0.5), 0, 1.33, -0.22, 0.34, 0.42, 0.16);
    put(MG.box, glow(0x3ad17a), 0.06, 1.42, 0.16, 0.05, 0.03, 0.01); put(MG.box, glow(0xff3b3b), -0.04, 1.42, 0.16, 0.03, 0.03, 0.01);
  }
}
// "Katta kallalar": everything above the shoulders grows around the neck
function bigHead(m, k = 1.8) {
  for (const c of m.upper.children) {
    if (!c.isMesh || c.position.y < 1.57) continue;
    c.position.set(c.position.x * k, 1.62 + (c.position.y - 1.62) * k, c.position.z * k); c.scale.multiplyScalar(k);
  }
}
// Wallhack: after the normal frame, redo the depth buffer with walls/crates/floor only (layer 4),
// then draw soldiers where they are behind that geometry (depth test "greater"):
// red for enemies, blue for teammates. A soldier in plain sight is not tinted.
const xrayMats = [0xff3b2f, 0x4aa8ff].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false }));
const depthOnlyMat = new THREE.MeshBasicMaterial({ colorWrite: false });
function wallhackPass() {
  if (!MODS.wall || game.state === 'menu') return;
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  for (const m of worldMeshes) m.layers.enable(4);
  renderer.clearDepth(); camera.layers.set(4); scene.overrideMaterial = depthOnlyMat;
  renderer.render(scene, camera);
  for (const pass of [0, 1]) {
    const L = 1 + pass; let any = false;
    for (const b of bots) {
      const on = b.alive && (b.team === player.team) === !!pass && b.model.group.visible;
      b.model.group.traverse(o => { if (o.isMesh) { if (on) o.layers.enable(L); else o.layers.disable(L); } });
      any = any || on;
    }
    if (!any) continue;
    camera.layers.set(L); scene.overrideMaterial = xrayMats[pass];
    renderer.render(scene, camera);
  }
  scene.overrideMaterial = null; camera.layers.set(0); renderer.shadowMap.autoUpdate = auto;
}
// ---- menu panel ----
(() => {
  const panel = document.getElementById('modsPanel'), grid = document.getElementById('modMorph');
  const opts = [['off', '🙂', 'Oddiy'], ['mix', '🎲', 'Aralash'], ...Object.entries(MORPHS).map(([id, m]) => [id, m.icon, m.name])];
  grid.innerHTML = opts.map(([v, ic, n]) => `<button type="button" data-v="${v}"><span>${ic}</span>${n}</button>`).join('');
  const sum = () => {
    const n = ['wall', 'big', 'grav'].filter(k => MODS[k]).length + (MODS.morph !== 'off' ? 1 : 0);
    for (const id of ['modsSum', 'modsSum2']) { const e = document.getElementById(id); if (e) e.textContent = n ? n + ' ta yoqilgan' : 'o‘chiq'; }
  };
  const sync = () => {
    for (const [id, k] of [['modWall', 'wall'], ['modBig', 'big'], ['modGrav', 'grav']]) document.getElementById(id).checked = MODS[k];
    grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === MODS.morph)));
    sum();
  };
  for (const [id, k] of [['modWall', 'wall'], ['modBig', 'big'], ['modGrav', 'grav']])
    document.getElementById(id).addEventListener('change', e => { MODS[k] = e.target.checked; store.set('kq_mod_' + k, MODS[k]); sum(); });
  grid.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; MODS.morph = b.dataset.v; store.set('kq_mod_morph', MODS.morph); sync(); });
  for (const id of ['modsBtn', 'modsBtn2']) document.getElementById(id).addEventListener('click', () => { sync(); panel.hidden = false; });
  document.getElementById('modsDone').addEventListener('click', () => { panel.hidden = true; });
  sync();
})();
