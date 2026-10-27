'use strict';
// ---------- Touch controls with a layout each player arranges for themselves ----------
// x/y are the centre of each control as a fraction of the screen, so a layout fits any phone and survives rotation.
const TOUCH_BTNS = [
  { id: 'fire', label: 'OTISH', x: 0.88, y: 0.6, s: 84, kind: 'fire', red: true },
  { id: 'fire2', label: 'OT', x: 0.08, y: 0.4, s: 62, kind: 'fire', red: true },
  { id: 'jump', label: 'SAKRA', x: 0.75, y: 0.8, s: 62, kind: 'hold', key: 'jump' },
  { id: 'crouch', label: 'CHO‘K', x: 0.65, y: 0.88, s: 56, kind: 'toggle', key: 'crouch' },
  { id: 'reload', label: 'O‘Q', x: 0.76, y: 0.42, s: 54, kind: 'tap', act: () => startReload() },
  { id: 'scope', label: 'OPTIKA', x: 0.95, y: 0.36, s: 54, kind: 'tap', act: () => secondaryAction(), when: () => curDef().scope || curDef().melee },
  { id: 'swap', label: 'QUROL', x: 0.87, y: 0.25, s: 54, kind: 'tap', act: () => cycleWeapon(1) },
  { id: 'nade', label: 'GRANATA', x: 0.65, y: 0.62, s: 50, kind: 'tap', act: () => { if (player.slot === 4) cycleNade(); else switchTo(4); }, when: () => !!player.inv[4] },
  { id: 'use', label: 'OLISH', x: 0.57, y: 0.42, s: 58, kind: 'use', when: () => !!pickTarget || (bomb.state === 'planted' && player.team === 'KT') },
  { id: 'drop', label: 'TASHLA', x: 0.86, y: 0.09, s: 46, kind: 'tap', act: () => { if (player.slot === 5) dropBomb(player); else dropCurrent(); }, when: () => [1, 2, 5].includes(player.slot) },
  { id: 'buy', label: '$', x: 0.22, y: 0.12, s: 50, kind: 'tap', act: () => { if (input.buyOpen) closeBuy(false); else openBuy(); }, when: () => canBuy() || input.buyOpen },
  { id: 'score', label: 'HISOB', x: 0.77, y: 0.09, s: 46, kind: 'score' },
  { id: 'pause', label: 'II', x: 0.68, y: 0.09, s: 46, kind: 'tap', act: () => pauseGame() }
];
const TOUCH_DEFAULT = { stick: { x: 0.14, y: 0.7, s: 1 }, stickMode: 'fixed', opacity: 0.75, lookSens: 1, autoFire: false, btn: {} };
const STICK_SIZE = 130;
function loadTouchLayout() {
  const t = store.get('kq_touch', null), o = JSON.parse(JSON.stringify(TOUCH_DEFAULT));
  if (t && typeof t === 'object') {
    if (t.stick) o.stick = { x: clamp(+t.stick.x || 0.14, 0, 1), y: clamp(+t.stick.y || 0.7, 0, 1), s: clamp(+t.stick.s || 1, 0.6, 1.8) };
    if (t.stickMode === 'float') o.stickMode = 'float';
    o.opacity = clamp(+t.opacity || 0.75, 0.2, 1); o.lookSens = clamp(+t.lookSens || 1, 0.2, 3); o.autoFire = !!t.autoFire;
    for (const b of TOUCH_BTNS) { const v = t.btn && t.btn[b.id]; if (v) o.btn[b.id] = { x: clamp(+v.x, 0, 1), y: clamp(+v.y, 0, 1), s: clamp(+v.s || 1, 0.6, 1.8), hide: !!v.hide }; }
  }
  return o;
}
let TL = loadTouchLayout();
const btnCfg = b => TL.btn[b.id] || { x: b.x, y: b.y, s: 1, hide: false };

const TouchUI = (() => {
  const layer = document.getElementById('touch'), base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob');
  const els = {};
  let editing = false, selected = null, stickId = null, sx = 0, sy = 0, fireN = 0, autoT = 0, restore = null;
  const lookers = {};
  // keep receiving a finger's moves even when it slides off the control; harmless if the browser refuses
  const capture = (el, id) => { try { el.setPointerCapture(id); } catch (err) {} };
  const look2 =(e) => { const l = lookers[e.pointerId]; if (!l || !playing()) return; look(e.clientX - l.x, e.clientY - l.y, 0.0055 * TL.lookSens / settings.sens); l.x = e.clientX; l.y = e.clientY; };

  // --- build the buttons ---
  for (const b of TOUCH_BTNS) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'tb' + (b.red ? ' red' : ''); el.textContent = b.label; el.dataset.id = b.id;
    layer.appendChild(el); els[b.id] = el;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (editing) return startDrag(e, b.id);
      capture(el, e.pointerId); el.classList.add('on');
      if (b.kind === 'fire') { fireN++; touch.fire = true; lookers[e.pointerId] = { x: e.clientX, y: e.clientY }; Snd.init(); }
      else if (b.kind === 'hold') touch[b.key] = true;
      else if (b.kind === 'toggle') { touch[b.key] = !touch[b.key]; el.classList.toggle('on', touch[b.key]); }
      else if (b.kind === 'use') { touch.use = true; if (playing()) pickupTarget(); }
      else if (b.kind === 'score') { if (playing()) { input.boardOpen = true; renderBoard(); document.getElementById('board').hidden = false; } }
      else if (b.kind === 'tap' && (playing() || b.id === 'buy')) b.act();
    });
    el.addEventListener('pointermove', e => { if (editing) return moveDrag(e); if (b.kind === 'fire') look2(e); });
    const up = e => {
      if (editing) return endDrag(e);
      if (b.kind !== 'toggle') el.classList.remove('on');
      if (b.kind === 'fire') { fireN = Math.max(0, fireN - 1); touch.fire = fireN > 0; delete lookers[e.pointerId]; }
      else if (b.kind === 'hold') touch[b.key] = false;
      else if (b.kind === 'use') touch.use = false;
      else if (b.kind === 'score') { input.boardOpen = false; document.getElementById('board').hidden = true; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  // --- joystick + free look on the empty screen ---
  const stickCenter = () => ({ x: TL.stick.x * innerWidth, y: TL.stick.y * innerHeight });
  function moveStick(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy; const max = STICK_SIZE * TL.stick.s * 0.42, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    touch.mx = dx / max; touch.my = dy / max; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  function endStick() { stickId = null; touch.mx = touch.my = 0; knob.style.transform = 'translate(-50%, -50%)'; if (TL.stickMode === 'float') place(); }
  layer.addEventListener('pointerdown', e => {
    if (editing) { if (e.target === base || base.contains(e.target)) startDrag(e, 'stick'); else select(null); return; }
    if ((e.target !== layer && !base.contains(e.target)) || !playing()) return;
    e.preventDefault(); capture(layer, e.pointerId); Snd.init();
    const c = stickCenter(), r = STICK_SIZE * TL.stick.s / 2;
    const useStick = stickId === null && (TL.stickMode === 'float' ? e.clientX < innerWidth * 0.42 : Math.hypot(e.clientX - c.x, e.clientY - c.y) < r * 1.7);
    if (useStick) {
      stickId = e.pointerId;
      if (TL.stickMode === 'float') { sx = e.clientX; sy = e.clientY; base.style.left = sx + 'px'; base.style.top = sy + 'px'; } else { sx = c.x; sy = c.y; }
      moveStick(e);
    } else lookers[e.pointerId] = { x: e.clientX, y: e.clientY };
  });
  layer.addEventListener('pointermove', e => { if (editing) return moveDrag(e); if (e.pointerId === stickId) moveStick(e); else look2(e); });
  const layerUp = e => { if (editing) return endDrag(e); if (e.pointerId === stickId) endStick(); delete lookers[e.pointerId]; };
  layer.addEventListener('pointerup', layerUp); layer.addEventListener('pointercancel', layerUp);

  // --- layout ---
  function place() {
    layer.style.setProperty('--op', TL.opacity);
    const sz = STICK_SIZE * TL.stick.s;
    base.style.left = TL.stick.x * 100 + '%'; base.style.top = TL.stick.y * 100 + '%'; base.style.width = base.style.height = sz + 'px';
    knob.style.width = knob.style.height = sz * 0.4 + 'px';
    for (const b of TOUCH_BTNS) {
      const c = btnCfg(b), el = els[b.id], s = b.s * c.s;
      el.style.left = c.x * 100 + '%'; el.style.top = c.y * 100 + '%'; el.style.width = el.style.height = s + 'px';
      el.style.fontSize = Math.round(clamp(s * 0.19, 10, 16)) + 'px';
      el.classList.toggle('off', !!c.hide);
    }
  }
  // Context buttons (pick up, grenade, scope…) only appear when they do something
  function update(dt) {
    if (editing || layer.hidden) return;
    for (const b of TOUCH_BTNS) { const c = btnCfg(b); els[b.id].hidden = c.hide || (b.when ? !b.when() : false); }
    // optional auto-fire: shoot when the crosshair rests on an enemy
    autoT -= dt;
    if (autoT <= 0) { autoT = 0.06; touch.auto = TL.autoFire && player.alive && enemyUnderCrosshair(); }
  }
  const _ray = new THREE.Raycaster(), _lst = [];
  function enemyUnderCrosshair() {
    _ray.set(camera.position, aimDir(0)); _ray.far = 80; _lst.length = 0;
    for (const m of worldMeshes) _lst.push(m);
    for (const a of agents) if (a.alive && a.team !== player.team) for (const m of a.hitMeshes) _lst.push(m);
    const h = _ray.intersectObjects(_lst, false)[0];
    return !!(h && h.object.userData.agent);
  }

  // --- layout editor ---
  const bar = document.getElementById('tedit');
  const save = () => store.set('kq_touch', TL);
  let drag = null;
  function startDrag(e, id) {
    e.preventDefault(); e.stopPropagation(); select(id);
    capture(e.currentTarget && e.currentTarget.setPointerCapture ? e.currentTarget : layer, e.pointerId);
    drag = { id: e.pointerId };
  }
  function moveDrag(e) {
    if (!drag || drag.id !== e.pointerId || !selected) return;
    const x = clamp(e.clientX / innerWidth, 0.03, 0.97), y = clamp(e.clientY / innerHeight, 0.04, 0.96);
    if (selected === 'stick') { TL.stick.x = x; TL.stick.y = y; }
    else { const b = TOUCH_BTNS.find(q => q.id === selected); TL.btn[selected] = Object.assign(btnCfg(b), { x, y }); }
    place();
  }
  function endDrag() { drag = null; save(); }
  function select(id) {
    selected = id;
    layer.querySelectorAll('.sel').forEach(n => n.classList.remove('sel'));
    if (id === 'stick') base.classList.add('sel'); else if (id) els[id].classList.add('sel');
    syncBar();
  }
  function syncBar() {
    const b = TOUCH_BTNS.find(q => q.id === selected);
    document.getElementById('teName').textContent = selected === 'stick' ? 'Joystik' : b ? b.label : 'Tugmani tanlang — keyin sudrang';
    const sizeEl = document.getElementById('teSize'), hideEl = document.getElementById('teHide');
    sizeEl.disabled = !selected; hideEl.disabled = !b;
    const s = selected === 'stick' ? TL.stick.s : b ? btnCfg(b).s : 1;
    sizeEl.value = s; document.getElementById('teSizeO').textContent = Math.round(s * 100) + '%';
    hideEl.checked = b ? !!btnCfg(b).hide : false;
    document.getElementById('teOp').value = TL.opacity; document.getElementById('teOpO').textContent = Math.round(TL.opacity * 100) + '%';
    document.getElementById('teSens').value = TL.lookSens; document.getElementById('teSensO').textContent = TL.lookSens.toFixed(2);
    document.getElementById('teAuto').checked = TL.autoFire;
    document.querySelectorAll('#teStick button').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.v === TL.stickMode)));
  }
  document.getElementById('teSize').addEventListener('input', e => {
    const v = +e.target.value;
    if (selected === 'stick') TL.stick.s = v;
    else if (selected) { const b = TOUCH_BTNS.find(q => q.id === selected); TL.btn[selected] = Object.assign(btnCfg(b), { s: v }); }
    place(); syncBar(); save();
  });
  document.getElementById('teHide').addEventListener('change', e => {
    const b = TOUCH_BTNS.find(q => q.id === selected); if (!b) return;
    TL.btn[b.id] = Object.assign(btnCfg(b), { hide: e.target.checked }); place(); save();
  });
  document.getElementById('teOp').addEventListener('input', e => { TL.opacity = +e.target.value; place(); syncBar(); save(); });
  document.getElementById('teSens').addEventListener('input', e => { TL.lookSens = +e.target.value; syncBar(); save(); });
  document.getElementById('teAuto').addEventListener('change', e => { TL.autoFire = e.target.checked; save(); });
  document.getElementById('teStick').addEventListener('click', e => { const n = e.target.closest('[data-v]'); if (n) { TL.stickMode = n.dataset.v; syncBar(); save(); } });
  document.getElementById('teReset').addEventListener('click', () => { TL = JSON.parse(JSON.stringify(TOUCH_DEFAULT)); place(); select(null); save(); });
  document.getElementById('teMove').addEventListener('click', () => bar.classList.toggle('bottom'));
  document.getElementById('teDone').addEventListener('click', () => close());
  function open(onClose) {
    // hide whatever overlay is open and show the HUD faintly, so buttons are placed against the real screen
    const ov = ['menu', 'pause', 'setPanel'].filter(id => !document.getElementById(id).hidden);
    restore = { ov, hud: document.getElementById('hud').hidden, layer: layer.hidden, onClose };
    ov.forEach(id => { document.getElementById(id).hidden = true; });
    document.getElementById('hud').hidden = false;
    editing = true; layer.hidden = false; layer.classList.add('edit'); bar.hidden = false;
    for (const b of TOUCH_BTNS) els[b.id].hidden = false;
    place(); select(null);
  }
  function close() {
    editing = false; layer.classList.remove('edit'); bar.hidden = true; select(null); save();
    if (restore) {
      restore.ov.forEach(id => { document.getElementById(id).hidden = false; });
      document.getElementById('hud').hidden = restore.hud; layer.hidden = restore.layer;
      const cb = restore.onClose; restore = null; cb && cb();
    }
    place();
  }
  function reset() { fireN = 0; touch.fire = touch.jump = touch.use = touch.auto = false; touch.mx = touch.my = 0; for (const k in lookers) delete lookers[k]; stickId = null; knob.style.transform = 'translate(-50%, -50%)'; }
  addEventListener('resize', () => place());
  place();
  return { update, open, place, reset, get editing() { return editing; } };
})();
