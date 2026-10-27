'use strict';
// ---------- FPS counter ----------
const fpsMeter = {
  frames: 0, acc: 0,
  tick(dt) {
    const el = document.getElementById('fps');
    el.hidden = !settings.fps;
    this.frames++; this.acc += dt;
    if (this.acc < 0.5) return;
    const fps = Math.round(this.frames / this.acc), ms = (1000 * this.acc / this.frames).toFixed(1);
    el.textContent = `${fps} FPS · ${ms} ms`; el.className = fps >= 55 ? 'ok' : fps >= 30 ? 'mid' : 'low';
    this.frames = 0; this.acc = 0;
  }
};

// ---------- Kill streak banners ----------
let streakTimer = 0;
function playerKillStreak(hs) {
  const p = player;
  p.roundKills = (p.roundKills || 0) + 1;
  p.multi = game.mode === 'dm' ? (game.time - (p.lastKillT || -99) < 4 ? (p.multi || 0) + 1 : 1) : p.roundKills;
  p.lastKillT = game.time;
  const enemies = agents.filter(a => a.team !== p.team).length;
  let txt = '';
  if (game.mode === 'comp' && p.roundKills >= enemies && enemies >= 3) txt = 'ACE!';
  else if (p.multi >= 2) txt = ['', '', 'IKKITA!', 'UCHTA!', 'TO‘RTTA!'][p.multi] || 'BESHTA!';
  if (txt) { showStreak(txt, false); Snd.chime(true); }
  else if (hs) showStreak('BOSHGA!', true);
}
function showStreak(txt, small) {
  const el = document.getElementById('streak');
  el.textContent = txt; el.className = small ? 'small' : ''; el.hidden = false;
  void el.offsetWidth; el.classList.add('on'); streakTimer = small ? 0.9 : 1.8;
}
function updateStreak(dt) { if (streakTimer > 0) { streakTimer -= dt; if (streakTimer <= 0) document.getElementById('streak').hidden = true; } }

// ---------- Settings: graphics, FOV, volume, FPS, weapon hand ----------
function applyQuality() {
  const q = settings.quality, dpr = window.devicePixelRatio || 1;
  // phones have tiny dense screens: their "low" keeps one device pixel per CSS pixel so text stays sharp
  renderer.setPixelRatio([input.touchMode ? Math.min(dpr, 1) : 0.75, Math.min(dpr, 1.25), Math.min(dpr, 2)][q]);
  renderer.setSize(innerWidth, innerHeight);
  const on = q > 0, size = q === 2 ? 4096 : 2048;
  if (sun.castShadow !== on || sun.shadow.mapSize.x !== size) {
    sun.castShadow = on; sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
}
function applyVolume() { if (Snd.master) Snd.master.gain.value = settings.volume * 0.7; }
function initSettingsUI(onClose) {
  const panel = document.getElementById('setPanel');
  const seg = (id, key, store_key, parse, after) => {
    const el = document.getElementById(id);
    const sync = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(parse(b.dataset.v) === settings[key])));
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings[key] = parse(b.dataset.v); store.set(store_key, settings[key]); sync(); after && after(); });
    return sync;
  };
  const range = (id, key, store_key, fmt, after) => {
    const el = document.getElementById(id), out = document.getElementById(id + 'O');
    const sync = () => { el.value = settings[key]; out.textContent = fmt(settings[key]); };
    el.addEventListener('input', () => { settings[key] = +el.value; store.set(store_key, settings[key]); sync(); after && after(); });
    return sync;
  };
  const check = (id, key, store_key) => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => { settings[key] = el.checked; store.set(store_key, el.checked); });
    return () => { el.checked = settings[key]; };
  };
  const syncs = [
    seg('setQuality', 'quality', 'kq_quality', v => +v, applyQuality),
    seg('setHand', 'hand', 'kq_hand', v => v),
    range('setFov', 'fov', 'kq_fov', v => v + '°'),
    range('setVol', 'volume', 'kq_volume', v => Math.round(v * 100) + '%', applyVolume),
    check('setFps', 'fps', 'kq_fps'),
    check('setSpeedo', 'speedo', 'kq_speedo')
  ];
  document.getElementById('setDone').addEventListener('click', () => { panel.hidden = true; onClose && onClose(); });
  return { open() { syncs.forEach(s => s()); panel.hidden = false; } };
}
