'use strict';
// ---------- Inspect: a skin, weapon or agent up close, turned with the mouse or a finger ----------
// It draws on the main canvas (same renderer, same gun lighting) while every other screen is set aside.
const Inspect = (() => {
  const el = document.getElementById('inspect');
  const iscene = new THREE.Scene(), icam = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  iscene.add(new THREE.HemisphereLight(0xffffff, 0x4a4036, 0.85));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.8); key.position.set(1.5, 2.2, 2.4); iscene.add(key);
  const rim = new THREE.DirectionalLight(0xa9c8ff, 1.1); rim.position.set(-2, 1, -2.2); iscene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-1.5, -0.6, 1.8); iscene.add(fill);
  const bgTex = c => canvasTex(512, (g, s) => {
    const k = new THREE.Color(c), rgb = `${k.r * 255 | 0},${k.g * 255 | 0},${k.b * 255 | 0}`;
    g.fillStyle = '#0b0d10'; g.fillRect(0, 0, s, s);
    const gr = g.createRadialGradient(s * 0.5, s * 0.45, 10, s * 0.5, s * 0.5, s * 0.75);
    gr.addColorStop(0, `rgba(${rgb},0.55)`); gr.addColorStop(0.6, `rgba(${rgb},0.12)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, { repeat: false });
  const pivot = new THREE.Group(); iscene.add(pivot);
  const st = { on: false, obj: null, soldier: null, yaw: 0, pitch: 0.12, dist: 1, base: 1, drag: null, idle: 0, hidden: [] };
  const titleEl = document.getElementById('insTitle'), subEl = document.getElementById('insSub'), eyeEl = document.getElementById('insEye');
  function clear() {
    if (st.soldier) { pivot.remove(st.soldier.group); disposeSoldier(st.soldier); st.soldier = null; }
    if (st.obj) { pivot.remove(st.obj); st.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); }); st.obj = null; }
  }
  // what: { skin } | { weapon } | { agent } (+ optional float for the wear line)
  function open(what) {
    clear();
    let title, sub, color = '#2a3038', eye = 'Ko‘rish';
    if (what.agent) {
      const a = AGENTS[what.agent], m = makeSoldier(a.team, a, false);
      scene.remove(m.group); if (m.marker) m.marker.visible = false;
      poseSoldier(m, 0, 0, 0, false);
      m.group.position.set(0, -0.95, 0); pivot.add(m.group); st.soldier = m;
      st.base = 4.1; st.pitch = 0.08; title = itemTitle(a); sub = RARITY[a.rarity].name; color = RARITY[a.rarity].color;
    } else {
      const skin = what.skin || '', def = WEAPONS[skin ? SKINS[skin].weapon : what.weapon];
      const kind = skinModel(def.model, skin), { g } = gunModel(kind, skin);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new V3()), sz = box.getSize(new V3());
      g.position.sub(c); const holder = new THREE.Group(); holder.add(g); holder.rotation.y = -Math.PI / 2; // side on, muzzle to the right
      pivot.add(holder); st.obj = holder;
      st.base = Math.max(sz.x, sz.y, sz.z) * 2.15 + 0.12; st.pitch = 0.1;
      if (skin) { const d = SKINS[skin]; title = itemTitle(d); sub = RARITY[d.rarity].name + (what.f != null ? ' · ' + wearName(what.f) + ' · ' + what.f.toFixed(3) : ''); color = RARITY[d.rarity].color; }
      else { title = def.name; sub = 'Standart ko‘rinish'; }
    }
    st.yaw = -0.5; st.dist = st.base; st.idle = 0;
    if (iscene.background) iscene.background.dispose();
    iscene.background = bgTex(color);
    titleEl.textContent = title; subEl.textContent = sub; el.style.setProperty('--rc', color); eyeEl.textContent = eye;
    // set the other screens aside while inspecting
    st.hidden = [...document.querySelectorAll('.overlay:not([hidden]), #menu:not([hidden])')].filter(n => n !== el);
    st.hidden.forEach(n => { n.hidden = true; });
    el.hidden = false; st.on = true;
    document.getElementById('insClose').focus();
  }
  function close() {
    if (!st.on) return;
    st.on = false; el.hidden = true; clear();
    st.hidden.forEach(n => { n.hidden = false; }); st.hidden = [];
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  // drag to turn, wheel or pinch to zoom; left alone it slowly turns by itself
  const pts = new Map();
  el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); st.idle = 0; });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1) { st.yaw += (e.clientX - p.x) * 0.009; st.pitch = clamp(st.pitch + (e.clientY - p.y) * 0.006, -1.2, 1.2); }
    else {
      const [a, b] = [...pts.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const [c, d] = [...pts.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (d0 > 0) st.dist = clamp(st.dist * d0 / d1, st.base * 0.45, st.base * 1.6);
    }
    p.x = e.clientX; p.y = e.clientY; st.idle = 0;
  });
  const up = e => pts.delete(e.pointerId);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); st.dist = clamp(st.dist * (1 + Math.sign(e.deltaY) * 0.1), st.base * 0.45, st.base * 1.6); }, { passive: false });
  document.getElementById('insClose').onclick = close;
  document.getElementById('insReset').onclick = () => { st.yaw = -0.5; st.pitch = 0.1; st.dist = st.base; };
  addEventListener('keydown', e => { if (st.on && (e.code === 'Escape' || e.code === 'KeyF')) { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);
  function frame(dt) {
    st.idle += dt;
    if (!pts.size && st.idle > 2.5) st.yaw += dt * 0.35;
    pivot.rotation.set(st.pitch, st.yaw, 0, 'XYZ');
    if (st.soldier) st.soldier.upper.position.y = Math.sin(performance.now() / 600) * 0.005;
    icam.aspect = innerWidth / innerHeight;
    // on a narrow screen pull back so a long rifle still fits across
    const fit = icam.aspect < 1 ? 1 / Math.max(0.5, icam.aspect) : 1;
    icam.position.set(0, 0, st.dist * fit); icam.lookAt(0, 0, 0); icam.updateProjectionMatrix();
    const exp = renderer.toneMappingExposure; renderer.toneMappingExposure = 1.05;
    renderer.clear(); renderer.render(iscene, icam);
    renderer.toneMappingExposure = exp;
  }
  return { open, close, frame, get on() { return st.on; } };
})();
