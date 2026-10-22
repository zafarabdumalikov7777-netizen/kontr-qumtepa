'use strict';
// ---------- Game state ----------
const game = { state: 'menu', round: 0, score: { KT: 0, T: 0 }, timer: 0, loss: { KT: 0, T: 0 }, winTo: 8, paused: false, time: 0, tSite: 'A', over: false, buyWindow: 20 };
const ROUND_TIME = 115;
const TEAM_NAME = { KT: 'Kontr-terroristlar', T: 'Terroristlar' };
const els = {};
['hud', 'moneyV', 'moneyPop', 'scKT', 'scT', 'pipKT', 'pipT', 'timer', 'feed', 'dmg', 'dirs', 'scope', 'hitmark', 'pick', 'speedo', 'spdV', 'tPick', 'center', 'centerH', 'centerP', 'hint', 'spec',
 'hpV', 'hpBox', 'arV', 'wName', 'magV', 'resV', 'slots', 'menu', 'pause', 'buy', 'buyGrid', 'buyMoney', 'buyTime', 'board', 'boardCard', 'over', 'touch'].forEach(id => els[id] = document.getElementById(id));
const input = { keys: {}, mouseDown: false, locked: false, fallback: false, touchMode: false, buyOpen: false, boardOpen: false };
const touch = { mx: 0, my: 0, fire: false, jump: false, crouch: false };
let spectating = null, playerBody = null, bodyPh = 0;

function setupTeams(team) {
  for (const b of bots) disposeSoldier(b.model);
  if (playerBody) disposeSoldier(playerBody);
  playerBody = makeSoldier(team, 0, true);
  player.team = team; bots = []; let id = 1;
  const enemy = team === 'KT' ? 'T' : 'KT';
  NAMES[team].slice(0, settings.allies).forEach(n => bots.push(makeBot(n, team, id++)));
  NAMES[enemy].slice(0, settings.enemies).forEach(n => bots.push(makeBot(n, enemy, id++)));
  agents = [player, ...bots];
  const roles = ['A', 'B', 'mid']; let r = 0;
  bots.forEach(b => { if (b.team === 'KT') b.role = roles[r++ % roles.length]; });
}
function resetLoadout(a) {
  a.armor = 0; a.helmet = false;
  if (a.isPlayer) {
    a.inv = { 1: null, 2: wstate(pistolFor(a.team)), 3: { def: WEAPONS.knife }, 4: null };
  } else { a.primary = null; a.pistol = wstate(pistolFor(a.team)); }
}
function spawnAll(first) {
  const sp = { KT: shuffle(cellsOf('S')), T: shuffle(cellsOf('T')) }, idx = { KT: 0, T: 0 };
  for (const a of agents) {
    if (first || !a.alive) resetLoadout(a);
    a.alive = true; a.hp = 100; a.spotUntil = 0;
    const c = sp[a.team][idx[a.team]++ % sp[a.team].length];
    a.pos.set(cxw(c.x) + rand(-0.6, 0.6), 0, czw(c.z) + rand(-0.6, 0.6));
    const face = a.team === 'KT' ? 0 : Math.PI; // bots: +z is forward
    if (a.isPlayer) {
      Object.assign(a, { yaw: a.team === 'KT' ? Math.PI : 0, pitch: 0, crouch: 0, reloadT: 0, switchT: 0, shots: 0, shotsF: 0, punchP: 0, punchY: 0, vpP: 0, vpY: 0, hops: 0, groundT: 0, scope: 0, scopeResume: 0, rescopeT: 0, cool: 0, deathT: 0, autoReload: false });
      for (const s of [1, 2]) if (a.inv[s]) { a.inv[s].mag = a.inv[s].def.mag; a.inv[s].res = a.inv[s].def.res; } // full ammo every round
      a.vel.set(0, 0, 0); a.slot = a.inv[1] ? 1 : 2; a.prevSlot = 3; vm.set(a.inv[a.slot].def, a.team);
      if (playerBody) { setGhost(playerBody, true); playerBody.fall = 1; playerBody.group.rotation.x = 0; }
    } else {
      const m = a.model;
      m.group.rotation.x = 0; m.group.position.y = 0; m.fall = 1; m.group.visible = true; m.marker.visible = a.team === player.team; m.flash.visible = false;
      Object.assign(a, { yaw: face, crouch: 0, wantCrouch: false, target: null, path: null, holdT: 0, pendingHold: 0, lastSeenT: 0, chasing: false, hunting: false, cool: 0, burst: 0, burstLen: randi(SK.burst[0], SK.burst[1]), reloadT: 0, noticeAgent: null, moveSpeed: 0 });
      m.group.position.set(a.pos.x, 0, a.pos.z); m.group.rotation.y = a.yaw;
    }
  }
}
function newMatch() {
  setupTeams(settings.team);
  game.score = { KT: 0, T: 0 }; game.loss = { KT: 0, T: 0 }; game.round = 0; game.over = false; game.time = 0;
  for (const a of agents) { a.money = 800; a.kills = 0; a.deaths = 0; }
  els.feed.innerHTML = '';
  startRound(true);
}
function startRound(first) {
  game.round++; game.state = 'freeze'; game.timer = first ? 6 : 5; game.tSite = Math.random() < 0.5 ? 'A' : 'B';
  clearFx(); clearDrops(); nades.forEach(n => scene.remove(n.mesh)); nades.length = 0;
  setSpectate(null);
  spawnAll(first);
  for (const b of bots) { botBuy(b); planBot(b); }
  showCenter(`Raund ${game.round}`, `Xarid vaqti · B tugmasi · ${game.score.KT}:${game.score.T}`, '', 2.5);
  updatePips(); Snd.chime(true);
}
function endRound(winner, reason) {
  if (game.state !== 'live') return;
  game.state = 'end'; game.timer = 5;
  game.score[winner]++;
  const loser = winner === 'KT' ? 'T' : 'KT';
  const bonus = 1400 + 500 * Math.min(4, game.loss[loser]);
  game.loss[loser]++; game.loss[winner] = 0;
  for (const a of agents) a.money = Math.min(16000, a.money + (a.team === winner ? 3250 : bonus));
  if (game.score[winner] >= game.winTo) game.over = true;
  showCenter(`${TEAM_NAME[winner]} g‘alaba qozondi`, reason === 'time' ? 'Vaqt tugadi — nuqtalar himoya qilindi' : 'Raqib jamoa butunlay yo‘q qilindi', winner === 'KT' ? 'kt' : 'te', 4.5);
  Snd.chime(winner === player.team);
  closeBuy(false);
}
function checkRoundEnd() {
  updatePips();
  if (game.state !== 'live') return;
  const kt = agents.some(a => a.alive && a.team === 'KT'), t = agents.some(a => a.alive && a.team === 'T');
  if (!kt) endRound('T', 'elim'); else if (!t) endRound('KT', 'elim');
}
function updateRound(dt) {
  game.timer -= dt;
  if (game.state === 'freeze' && game.timer <= 0) { game.state = 'live'; game.timer = ROUND_TIME; showCenter('Oldinga!', '', '', 1); }
  else if (game.state === 'live' && game.timer <= 0) { game.timer = 0; endRound('KT', 'time'); }
  else if (game.state === 'end' && game.timer <= 0) { if (game.over) showMatchEnd(); else startRound(false); }
}
const canBuy = () => player.alive && (game.state === 'freeze' || (game.state === 'live' && ROUND_TIME - game.timer < game.buyWindow));

// ---------- Player ----------
function updatePlayer(dt) {
  const p = player;
  if (!p.alive) { p.deathT += dt; return; }
  const canMove = game.state !== 'freeze', k = input.keys;
  p.crouch = clamp(p.crouch + ((k.KeyC || k.ControlLeft || k.ControlRight || touch.crouch) ? 1 : -1) * dt * 7, 0, 1);
  const mf = clamp((k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0) - touch.my, -1, 1), mr = clamp((k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + touch.mx, -1, 1);
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = -sy * mf + cy * mr, wz = -cy * mf - sy * mr; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  const def = curDef();
  let spd = 6.1 * (def.speed || 1);
  if (k.ShiftLeft || k.ShiftRight) spd *= 0.52;
  spd *= 1 - 0.64 * p.crouch; if (p.scope) spd *= 0.55; if (!canMove) spd = 0;
  const wish = spd * Math.min(1, wl), jumpKey = (k.Space || touch.jump) && canMove;
  // Source-style movement: ground friction + acceleration, air strafing, and bunnyhop
  if (p.onGround) {
    p.groundT += dt;
    if (jumpKey) {
      // Holding Space re-jumps on the landing frame, so friction never bites; each chained hop adds speed
      accelerate(p, wx, wz, wish, 10, dt);
      if (p.hops > 0 && p.groundT < 0.08) {
        const hs = Math.hypot(p.vel.x, p.vel.z);
        if (hs > 3) { const f = Math.min(BHOP_MAX, hs * 1.07) / hs; if (f > 1) { p.vel.x *= f; p.vel.z *= f; } }
      }
      p.hops++; p.vel.y = 6; p.onGround = false;
    } else {
      if (p.groundT > 0.08) p.hops = 0;
      groundFriction(p, dt); accelerate(p, wx, wz, wish, 10, dt);
    }
  } else airAccelerate(p, wx, wz, wish, dt);
  const hsMax = Math.hypot(p.vel.x, p.vel.z); if (hsMax > 16) { p.vel.x *= 16 / hsMax; p.vel.z *= 16 / hsMax; }
  const h = 1.8 - 0.45 * p.crouch, ox = p.pos.x, oz = p.pos.z;
  moveXZ(p.pos, p.vel.x * dt, p.vel.z * dt, 0.34, h);
  if (Math.abs(p.pos.x - ox - p.vel.x * dt) > 1e-4) p.vel.x = 0; // hit a wall: lose that component
  if (Math.abs(p.pos.z - oz - p.vel.z * dt) > 1e-4) p.vel.z = 0;
  p.vel.y -= 17 * dt; p.pos.y += p.vel.y * dt;
  const wasAir = !p.onGround; p.onGround = false;
  if (p.pos.y <= 0) { p.pos.y = 0; p.vel.y = 0; p.onGround = true; }
  else { const b = hitBox(p.pos.x, p.pos.y, p.pos.z, 0.34, h); if (b) { if (p.vel.y <= 0) { p.pos.y = b.y1; p.onGround = true; } else p.pos.y = b.y0 - h; p.vel.y = 0; } }
  if (wasAir && p.onGround) { Snd.step(0.35, 0); p.groundT = 0; }
  const hs = Math.hypot(p.vel.x, p.vel.z);
  if (p.onGround && hs > 4.2) { p.stepDist += hs * dt; if (p.stepDist > 2.3) { p.stepDist = 0; Snd.step(0.22, 0); } }
  syncPlayerHB();
  // weapon timers
  p.cool -= dt; if (p.switchT > 0) p.switchT -= dt;
  if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) finishReload(); }
  if (p.autoReload && p.cool <= 0) startReload();
  if (p.rescopeT > 0) { p.rescopeT -= dt; if (p.rescopeT <= 0 && p.scopeResume && curDef().scope && p.reloadT <= 0) p.scope = p.scopeResume; if (p.rescopeT <= 0) p.scopeResume = 0; }
  const firing = input.mouseDown || touch.fire;
  if (firing && (game.state === 'live' || game.state === 'end')) tryFire();
  if (!firing) p.triggerReleased = true;
  // Between bursts the spray resets: the shot index winds back and the aim punch settles
  if (game.time - p.lastShot > Math.max(0.12, (def.rate || 0.2) * 1.25)) {
    p.shotsF = Math.max(0, p.shotsF - dt * 14);
    const rec = 1 - Math.exp(-dt * 6); p.punchP -= p.punchP * rec; p.punchY -= p.punchY * rec;
  }
  p.shots = Math.round(p.shotsF);
  const vk = 1 - Math.exp(-dt * 25); p.vpP += (p.punchP - p.vpP) * vk; p.vpY += (p.punchY - p.vpY) * vk;
}
const BHOP_MAX = 12.5; // ≈45 km/h
function groundFriction(p, dt) {
  const s = Math.hypot(p.vel.x, p.vel.z); if (s < 0.01) { p.vel.x = p.vel.z = 0; return; }
  const k = Math.max(0, s - Math.max(s, 1.9) * 5.5 * dt) / s; p.vel.x *= k; p.vel.z *= k;
}
function accelerate(p, wx, wz, wish, acc, dt) {
  const add = wish - (p.vel.x * wx + p.vel.z * wz); if (add <= 0) return;
  const a = Math.min(acc * dt * wish, add); p.vel.x += a * wx; p.vel.z += a * wz;
}
// Air acceleration caps the gain along the wish direction, so turning the mouse while strafing builds speed
function airAccelerate(p, wx, wz, wish, dt) {
  const add = Math.min(wish, 0.76) - (p.vel.x * wx + p.vel.z * wz); if (add <= 0) return;
  const a = Math.min(12 * dt * wish, add); p.vel.x += a * wx; p.vel.z += a * wz;
}
function playerHurt(att, d, from) {
  Snd.hurt(); flashDmg = Math.min(1, flashDmg + d / 60); shake = Math.max(shake, 0.012);
  const src = (att && att.pos) || from; if (!src) return;
  const dx = src.x - player.pos.x, dz = src.z - player.pos.z;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
  const el = document.createElement('div'); el.className = 'ind'; el.style.transform = `rotate(${ang}rad)`;
  els.dirs.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function updatePlayerBody(dt) {
  const m = playerBody, p = player; if (!m) return;
  if (!p.alive) {
    if (m.fall < 1) { m.fall = Math.min(1, m.fall + dt * 2.6); const k = m.fall * m.fall; m.group.rotation.x = -k * Math.PI / 2; m.group.position.y = p.pos.y + 0.12 * k; }
    if (m.ghost && p.deathT > 2.5) setGhost(m, false); // corpse becomes visible once the camera leaves it
    return;
  }
  m.group.position.copy(p.pos); m.group.rotation.y = p.yaw + Math.PI;
  setSoldierGun(m, curDef().model);
  const hs = Math.hypot(p.vel.x, p.vel.z); if (hs > 0.5) bodyPh += dt * hs * 1.9;
  poseSoldier(m, bodyPh, Math.min(1, hs / 5), p.crouch, !p.onGround);
}
function playerDied(att, def) {
  player.scope = 0; if (playerBody) playerBody.fall = 0;
  showCenter('Siz halok bo‘ldingiz', att && att !== player ? `${att.name} · ${def.name}` : def.name, 'te', 2.5);
}
function setSpectate(b) {
  if (spectating) spectating.model.group.visible = true;
  spectating = b;
  if (b) b.model.group.visible = false;
}
function updateCamera(dt) {
  const p = player;
  shake *= Math.exp(-dt * 6);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  if (p.alive) {
    camera.position.set(p.pos.x, p.pos.y + eyeH(), p.pos.z);
    camera.rotation.set(p.pitch + p.vpP * 0.5 + sy, p.yaw + p.vpY * 0.5 + sx, 0);
  } else if (p.deathT < 2.5 || !agents.some(a => a.alive && a.team === p.team)) {
    setSpectate(null);
    const k = Math.min(1, p.deathT / 0.6);
    camera.position.set(p.pos.x, p.pos.y + eyeH() - 1.3 * k, p.pos.z);
    camera.rotation.set(p.pitch * (1 - k) + 0.25 * k, p.yaw, 0.5 * k);
  } else {
    if (!spectating || !spectating.alive) setSpectate(agents.find(a => a.alive && a.team === p.team && !a.isPlayer) || null);
    const b = spectating;
    if (b) { camera.position.set(b.pos.x, 1.62, b.pos.z); camera.rotation.set(0, b.yaw + Math.PI, 0); }
  }
  const def = curDef();
  const fov = p.alive && def.scope && p.scope ? (p.scope === 1 ? 30 : 12) : 68;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  muzzleLight.intensity *= Math.exp(-dt * 40);
  updateSun(camera.position.x, camera.position.z);
}
function updateVM(dt) {
  const p = player, def = curDef(), base = VM_POS[vm.kind];
  const hs = Math.hypot(p.vel.x, p.vel.z);
  if (p.onGround && hs > 0.5) vm.bob += dt * hs * 1.5;
  const amp = Math.min(1, hs / 6) * (p.onGround ? 1 : 0.3);
  vm.kick *= Math.exp(-dt * 14); vm.swing *= Math.exp(-dt * 8); vm.swayX *= Math.exp(-dt * 8); vm.swayY *= Math.exp(-dt * 8);
  let y = base[1] - Math.abs(Math.cos(vm.bob)) * 0.01 * amp - vm.swayY, rx = vm.kick * 0.12, ry = base[3] || 0, rz = 0;
  const x = base[0] + Math.sin(vm.bob) * 0.012 * amp - vm.swayX, z = base[2] + vm.kick * 0.05;
  if (p.reloadT > 0) { const s = Math.sin(clamp(1 - p.reloadT / (def.reload || 2), 0, 1) * Math.PI); rx -= s * 0.55; y -= s * 0.08; rz += s * 0.3; }
  if (p.switchT > 0) { const s = p.switchT / 0.55; y -= s * 0.25; rx -= s * 0.5; }
  if (vm.kind === 'knife') { rz -= vm.swing * 0.9; ry += vm.swing * 0.8; }
  vm.root.position.set(x, y, z); vm.root.rotation.set(rx, ry, rz);
  vm.root.visible = p.alive && !p.scope;
  if (vm.flashT > 0) { vm.flashT -= dt; if (vm.flashT <= 0) vmFlash.visible = false; }
}
let spotT = 0;
function spotTick(dt) {
  spotT -= dt; if (spotT > 0 || !player.alive) return; spotT = 0.15;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), e = camera.position;
  for (const a of agents) {
    if (!a.alive || a.team === player.team) continue;
    const dx = a.pos.x - e.x, dz = a.pos.z - e.z, d = Math.hypot(dx, dz);
    if ((dx * fx + dz * fz) / d > 0.55 && losClear(e.x, e.y, e.z, a.pos.x, 1.5, a.pos.z)) a.spotUntil = game.time + 1.2;
  }
}

// ---------- HUD ----------
const cache = {};
const setT = (id, v) => { if (cache[id] !== v) { cache[id] = v; els[id].textContent = v; } };
let flashDmg = 0, centerT = 0, popT = 0;
function showCenter(h, p, cls, dur) { els.centerH.textContent = h; els.centerP.textContent = p || ''; els.center.className = cls || ''; els.center.hidden = false; centerT = dur; }
function moneyPop(v) { els.moneyPop.textContent = `+$${v}`; els.moneyPop.classList.add('on'); popT = 1.5; }
function hitMarker(head) { const h = els.hitmark; h.classList.remove('on'); void h.offsetWidth; h.classList.toggle('head', head); h.classList.add('on'); }
function addFeed(att, vic, def, hs) {
  const el = document.createElement('div');
  el.className = 'kf' + (att.isPlayer || vic.isPlayer ? ' me' : '');
  const tag = a => `<span class="${a.team === 'KT' ? 'c-kt' : 'c-te'}">${a.name}</span>`;
  el.innerHTML = (att !== vic ? tag(att) : '') + `<em>${def.name}</em>` + (hs ? '<b>BOSH</b>' : '') + tag(vic);
  els.feed.prepend(el); while (els.feed.children.length > 6) els.feed.lastChild.remove();
  setTimeout(() => el.remove(), 6000);
}
function updatePips() {
  for (const t of ['KT', 'T']) {
    els['pip' + t].innerHTML = agents.filter(a => a.team === t).map(a => `<i class="${a.alive ? '' : 'dead'}"></i>`).join('');
  }
}
function updateHUD(dt) {
  const p = player;
  setT('hpV', String(p.hp)); setT('arV', String(p.armor)); setT('moneyV', String(p.money));
  els.hpBox.classList.toggle('low', p.hp <= 25);
  setT('scKT', String(game.score.KT)); setT('scT', String(game.score.T));
  const t = Math.max(0, Math.ceil(game.timer)); setT('timer', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  els.timer.className = game.state === 'freeze' ? 'freeze' : (game.state === 'live' && t <= 10 ? 'low' : '');
  const st = curState() || p.inv[3], def = st.def;
  setT('wName', def.name);
  if (def.mag) { setT('magV', String(st.mag)); setT('resV', String(st.res)); }
  else if (def.id === 'he') { setT('magV', String(st.count)); setT('resV', '1'); }
  else { setT('magV', '—'); setT('resV', '—'); }
  const slotsKey = [1, 2, 3, 4].map(s => (p.inv[s] ? s : '') + (s === p.slot ? '*' : '')).join(',');
  if (cache.slots !== slotsKey) { cache.slots = slotsKey; els.slots.innerHTML = [1, 2, 3, 4].filter(s => p.inv[s]).map(s => `<span class="${s === p.slot ? 'on' : ''}">${s}</span>`).join(''); }
  Xhair.render(Math.min(52, currentSpread() * 700 + p.punchP * 60), p.alive && !p.scope && !def.scope);
  els.scope.hidden = !(p.alive && p.scope > 0);
  flashDmg = Math.max(0, flashDmg - dt * 1.4); els.dmg.style.opacity = String(flashDmg);
  if (centerT > 0) { centerT -= dt; if (centerT <= 0) els.center.hidden = true; }
  if (popT > 0) { popT -= dt; if (popT <= 0) els.moneyPop.classList.remove('on'); }
  const buyLeft = game.state === 'freeze' ? game.timer + game.buyWindow : game.buyWindow - (ROUND_TIME - game.timer);
  const hint = canBuy() && !input.buyOpen ? `B — xarid menyusi · ${Math.ceil(buyLeft)} s` : '';
  setT('hint', hint); els.hint.hidden = !hint;
  const pt = pickTarget && pickTarget.st.def, cur = pt && p.inv[pt.slot];
  const pk = pt ? `E — ${pt.name} olish${cur ? ` (${cur.def.name} tashlanadi)` : ''}` : '';
  setT('pick', pk); els.pick.hidden = !pk; els.tPick.hidden = !pk || !input.touchMode;
  const kmh = Math.round(Math.hypot(p.vel.x, p.vel.z) * 3.6);
  els.speedo.hidden = !settings.speedo || !p.alive;
  if (settings.speedo) { setT('spdV', String(kmh)); els.speedo.classList.toggle('fast', kmh > 24); }
  const specTxt = !p.alive && spectating ? `${spectating.name} · ${spectating.hp} HP` : '';
  if (cache.spec !== specTxt) { cache.spec = specTxt; els.spec.innerHTML = specTxt ? `<small>KUZATILMOQDA</small>${specTxt}` : ''; }
  els.spec.hidden = !specTxt;
  if (input.buyOpen) { setT('buyMoney', String(p.money)); setT('buyTime', canBuy() ? `Xarid uchun ${Math.ceil(buyLeft)} s qoldi` : 'Xarid vaqti tugadi'); }
  drawRadar();
}

// ---------- Radar ----------
const RS = 2.3, radar = document.getElementById('radar'), rg = radar.getContext('2d');
const radarMap = document.createElement('canvas');
function buildRadarMap() {
  const s = CELL * RS; radarMap.width = W * s; radarMap.height = H * s;
  const g = radarMap.getContext('2d');
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = G[z][x]; if (c === '#') continue;
    g.fillStyle = c === 'A' || c === 'B' ? 'rgba(227,140,110,0.45)' : c === 'c' || c === 'C' ? 'rgba(120,90,50,0.85)' : 'rgba(227,197,142,0.32)';
    g.fillRect(x * s, z * s, s + 0.5, s + 0.5);
  }
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = 'bold 16px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  Object.entries(MAP.letters).forEach(([ch, [cx, cz]]) => g.fillText(ch, (cx + 0.5) * s, (cz + 0.5) * s));
}
function sizeRadar() { const r = radar.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); radar.width = Math.max(1, r.width * dpr); radar.height = Math.max(1, r.height * dpr); }
function drawRadar() {
  const w = radar.width, h = radar.height; if (!w) return;
  const sc = w / 170, cam = camera.position, yaw = player.alive ? player.yaw : camera.rotation.y;
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, w, h);
  rg.save(); rg.beginPath(); rg.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); rg.clip();
  rg.translate(w / 2, h / 2); rg.scale(sc, sc); rg.rotate(yaw);
  rg.translate(-(cam.x - OX) * RS, -(cam.z - OZ) * RS);
  rg.drawImage(radarMap, 0, 0);
  for (const a of agents) {
    if (a.isPlayer || !a.alive) continue;
    const ally = a.team === player.team; if (!ally && a.spotUntil < game.time) continue;
    rg.fillStyle = ally ? (a.team === 'KT' ? '#72b4ff' : '#f2a93b') : '#ff4d40';
    rg.beginPath(); rg.arc((a.pos.x - OX) * RS, (a.pos.z - OZ) * RS, 3.6 / 1, 0, Math.PI * 2); rg.fill();
  }
  rg.restore();
  rg.setTransform(sc, 0, 0, sc, w / 2, h / 2);
  rg.fillStyle = '#fff'; rg.beginPath(); rg.moveTo(0, -7); rg.lineTo(5, 5); rg.lineTo(0, 2); rg.lineTo(-5, 5); rg.closePath(); rg.fill();
}

// ---------- Buy menu ----------
const BUY = [
  { k: '1', id: 'deagle' }, { k: '2', id: 'mp5' }, { k: '3', id: 'rifle' }, { k: '4', id: 'awp' },
  { k: '5', id: 'kevlar', name: 'Kevlar zirh', price: 650, stat: '100 zirh, tanani himoya qiladi' },
  { k: '6', id: 'kevlarh', name: 'Zirh + dubulg‘a', price: 1000, stat: 'Boshga tekkan o‘qni ham yumshatadi' },
  { k: '7', id: 'he' }
];
const buyDef = it => it.id === 'rifle' ? (player.team === 'T' ? WEAPONS.ak47 : WEAPONS.m4a1) : WEAPONS[it.id];
function priceOf(it) { if (it.id === 'kevlarh') return player.armor >= 100 && !player.helmet ? 350 : 1000; const d = buyDef(it); return d ? d.price : it.price; }
function owned(it) {
  const p = player, d = buyDef(it);
  if (it.id === 'kevlar') return p.armor >= 100; if (it.id === 'kevlarh') return p.armor >= 100 && p.helmet;
  if (it.id === 'he') return !!p.inv[4];
  return !!d && Object.values(p.inv).some(s => s && s.def === d);
}
function renderBuy() {
  els.buyGrid.innerHTML = BUY.map(it => {
    const d = buyDef(it), name = d ? d.name : it.name, price = priceOf(it), own = owned(it);
    const stat = d ? (d.mag ? `${d.stat} · zarar ${d.dmg} · ${d.mag}/${d.res}` : d.stat) : it.stat;
    return `<button class="item${own ? ' owned' : ''}" data-buy="${it.id}" type="button" ${own || player.money < price || !canBuy() ? 'disabled' : ''}><kbd>${it.k}</kbd><span class="nm">${name}</span><span class="pr">${own ? 'Bor' : '$' + price}</span><span class="st">${stat}</span></button>`;
  }).join('');
}
function buy(id) {
  const it = BUY.find(b => b.id === id), p = player; if (!it || !canBuy() || owned(it)) return;
  const price = priceOf(it); if (p.money < price) return;
  p.money -= price;
  if (id === 'kevlar') p.armor = 100;
  else if (id === 'kevlarh') { p.armor = 100; p.helmet = true; }
  else if (id === 'he') p.inv[4] = { def: WEAPONS.he, count: 1 };
  else { const d = buyDef(it), prev = p.slot; p.inv[d.slot] = wstate(d); p.slot = 0; switchTo(d.slot); p.prevSlot = prev === d.slot ? 3 : prev; }
  Snd.buy(); renderBuy();
}
function openBuy() {
  if (!canBuy() || input.buyOpen) return;
  input.buyOpen = true; renderBuy(); els.buy.hidden = false; input.mouseDown = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeBuy(relock = true) {
  if (!input.buyOpen) return;
  input.buyOpen = false; els.buy.hidden = true;
  if (relock) lockPointer();
}
els.buyGrid.addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) buy(b.dataset.buy); });
document.getElementById('buyClose').addEventListener('click', () => closeBuy(true));

// ---------- Scoreboard ----------
function renderBoard() {
  const table = t => {
    const rows = agents.filter(a => a.team === t).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map(a => `<tr class="${a.alive ? '' : 'dead'} ${a.isPlayer ? 'me' : ''}"><td>${a.name}</td><td>${a.kills}</td><td>${a.deaths}</td><td>${a.team === player.team ? '$' + a.money : '—'}</td></tr>`).join('');
    return `<div><h4 class="${t === 'KT' ? 'c-kt' : 'c-te'}"><span>${TEAM_NAME[t]}</span><span>${game.score[t]}</span></h4><table><thead><tr><th>O‘yinchi</th><th>Q</th><th>O‘</th><th>Pul</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  els.boardCard.innerHTML = table('KT') + table('T');
}

// ---------- Menus & pause ----------
function lockPointer() {
  if (input.touchMode || input.fallback) return;
  try {
    const r = renderer.domElement.requestPointerLock();
    if (r && r.catch) r.catch(lockFailed);
  } catch (e) { lockFailed(); }
}
// A frame that never grants pointer lock switches to free-mouse look; a one-off refusal just pauses.
function lockFailed() {
  if (input.locked) return;
  if (!input.everLocked) input.fallback = true;
  else if (playing() && !input.buyOpen) pauseGame();
}
function pauseGame() {
  if (game.state === 'menu' || game.paused || !els.over.hidden) return;
  game.paused = true; input.mouseDown = false; els.pause.hidden = false; syncSens();
}
function resumeGame() { game.paused = false; els.pause.hidden = true; tryFullscreen(); lockPointer(); Snd.init(); }
// Fullscreen + keyboard lock lets Ctrl+W be used for crouch-walking without closing the tab (where the browser allows it).
function tryFullscreen() {
  if (!settings.fullscreen || input.touchMode) return;
  const lockKeys = () => { try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyR', 'KeyT', 'KeyN', 'Tab', 'Space']).catch(() => {}); } catch (e) {} };
  try {
    if (document.fullscreenElement) { lockKeys(); return; }
    const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (r && r.then) r.then(lockKeys).catch(() => {});
  } catch (e) {}
}
function selectMap(id) {
  settings.map = id; store.set('kq_map', id);
  loadMap(id); buildRadarMap(); spawnAll(true);
  document.querySelectorAll('.map').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.map === MAP.id)));
}
function toMenu() {
  game.state = 'menu'; game.paused = false; els.pause.hidden = true; els.over.hidden = true; closeBuy(false); Snd.ambient(0);
  els.hud.hidden = true; els.touch.hidden = true; els.menu.hidden = false; setSpectate(null);
  if (document.pointerLockElement) document.exitPointerLock();
}
function showMatchEnd() {
  game.state = 'over';
  const win = game.score.KT >= game.winTo ? 'KT' : 'T', me = win === player.team;
  document.getElementById('overEyebrow').textContent = `Hisob ${game.score.KT} : ${game.score.T}`;
  document.getElementById('overTitle').textContent = me ? 'G‘alaba!' : 'Mag‘lubiyat';
  document.getElementById('overSub').textContent = `${TEAM_NAME[win]} ${game.winTo} raundda birinchi bo‘lib g‘olib chiqdi.`;
  document.getElementById('stK').textContent = player.kills; document.getElementById('stD').textContent = player.deaths;
  document.getElementById('stR').textContent = (player.kills / Math.max(1, player.deaths)).toFixed(2);
  els.over.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
}
function startGame(e) {
  Snd.init();
  input.touchMode = (e && e.pointerType === 'touch') || matchMedia('(pointer: coarse)').matches;
  SK = SKILL[settings.diff];
  els.menu.hidden = true; els.over.hidden = true; els.hud.hidden = false; els.touch.hidden = !input.touchMode;
  sizeRadar(); newMatch(); Snd.ambient(MAP.theme.wind);
  if (input.touchMode) { try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (err) {} }
  else { tryFullscreen(); lockPointer(); }
}
function syncSens() {
  for (const [id, out] of [['sens', 'sensOut'], ['sens2', 'sensOut2']]) { document.getElementById(id).value = settings.sens; document.getElementById(out).textContent = settings.sens.toFixed(2); }
}
function initMenu() {
  const teamBtns = document.querySelectorAll('.team'), diffBtns = document.querySelectorAll('#diffSeg button');
  const sync = () => {
    teamBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.team === settings.team)));
    diffBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === settings.diff)));
    syncSens();
  };
  for (const [id, key, min, max] of [['allies', 'kq_allies', 0, 9], ['enemies', 'kq_enemies', 1, 10]]) {
    const el = document.getElementById(id), out = document.getElementById(id + 'Out');
    el.value = settings[id]; out.textContent = settings[id];
    el.addEventListener('input', () => { settings[id] = clamp(+el.value | 0, min, max); out.textContent = settings[id]; store.set(key, settings[id]); });
  }
  const spd = document.getElementById('spdChk');
  spd.checked = settings.speedo; spd.addEventListener('change', () => { settings.speedo = spd.checked; store.set('kq_speedo', spd.checked); });
  const xh = initCrosshairUI();
  document.getElementById('xhBtn').addEventListener('click', () => xh.open());
  document.getElementById('xhBtn2').addEventListener('click', () => xh.open());
  const mapsEl = document.getElementById('maps');
  mapsEl.innerHTML = MAPS.map(m => `<button class="map" data-map="${m.id}" type="button"><b>${m.name}</b><small>${m.blurb}</small></button>`).join('');
  mapsEl.addEventListener('click', e => { const b = e.target.closest('[data-map]'); if (b && b.dataset.map !== MAP.id) selectMap(b.dataset.map); });
  document.querySelectorAll('.map').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.map === MAP.id)));
  const fs = document.getElementById('fsChk');
  fs.checked = settings.fullscreen; fs.addEventListener('change', () => { settings.fullscreen = fs.checked; store.set('kq_fs', fs.checked); });
  document.getElementById('nextMapBtn').addEventListener('click', () => {
    const i = MAPS.findIndex(m => m.id === MAP.id); selectMap(MAPS[(i + 1) % MAPS.length].id);
    startGame({ pointerType: input.touchMode ? 'touch' : 'mouse' });
  });
  teamBtns.forEach(b => b.addEventListener('click', () => { settings.team = b.dataset.team; store.set('kq_team', settings.team); sync(); }));
  diffBtns.forEach(b => b.addEventListener('click', () => { settings.diff = +b.dataset.d; store.set('kq_diff', settings.diff); sync(); }));
  for (const id of ['sens', 'sens2']) document.getElementById(id).addEventListener('input', e => { settings.sens = +e.target.value; store.set('kq_sens', settings.sens); syncSens(); });
  let startPointer = null;
  const sb = document.getElementById('startBtn');
  sb.addEventListener('pointerdown', e => { startPointer = e.pointerType; });
  sb.addEventListener('click', () => startGame({ pointerType: startPointer }));
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('quitBtn').addEventListener('click', toMenu);
  document.getElementById('againBtn').addEventListener('click', e => startGame({ pointerType: input.touchMode ? 'touch' : 'mouse' }));
  document.getElementById('menuBtn').addEventListener('click', toMenu);
  sync();
}

// ---------- Input ----------
const playing = () => game.state !== 'menu' && game.state !== 'over' && !game.paused;
addEventListener('keydown', e => {
  if (e.code === 'Tab') { if (playing()) { e.preventDefault(); input.boardOpen = true; renderBoard(); els.board.hidden = false; } return; }
  if (!playing()) { if (e.code === 'Escape' && game.paused && input.fallback) resumeGame(); return; }
  if (e.ctrlKey) e.preventDefault(); // Ctrl is crouch: block Ctrl+S, Ctrl+D and other browser shortcuts the page may stop
  if (e.code === 'Space') e.preventDefault();
  input.keys[e.code] = true;
  if (input.buyOpen) {
    const it = BUY.find(b => b.k === e.key); if (it) { buy(it.id); return; }
    if (e.code === 'KeyB' || e.code === 'Escape') closeBuy(true);
    return;
  }
  if (e.repeat) return;
  switch (e.code) {
    case 'Digit1': switchTo(1); break; case 'Digit2': switchTo(2); break; case 'Digit3': switchTo(3); break; case 'Digit4': switchTo(4); break;
    case 'KeyQ': switchTo(player.prevSlot); break;
    case 'KeyR': startReload(); break;
    case 'KeyB': openBuy(); break;
    case 'KeyE': pickupTarget(); break;
    case 'KeyG': dropCurrent(); break;
    case 'Escape': if (input.fallback) pauseGame(); break;
  }
});
addEventListener('keyup', e => {
  input.keys[e.code] = false;
  if (e.code === 'Tab') { input.boardOpen = false; els.board.hidden = true; }
});
// Ask before leaving mid-match (catches an accidental Ctrl+W where the browser shows the prompt)
addEventListener('beforeunload', e => { if (game.state !== 'menu' && game.state !== 'over') { e.preventDefault(); e.returnValue = ''; } });
addEventListener('blur', () => { input.keys = {}; input.mouseDown = false; if (playing() && !input.buyOpen) pauseGame(); });
const cvs = renderer.domElement;
cvs.addEventListener('mousedown', e => {
  if (!playing() || input.touchMode) return;
  Snd.init();
  if (!input.locked && !input.fallback) { lockPointer(); return; }
  if (e.button === 0) input.mouseDown = true;
  if (e.button === 2) secondaryAction();
});
addEventListener('mouseup', e => { if (e.button === 0) input.mouseDown = false; });
cvs.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (!playing() || input.buyOpen || input.touchMode) return;
  if (!input.locked && !input.fallback) return;
  look(e.movementX || 0, e.movementY || 0, 0.0022);
});
addEventListener('wheel', e => { if (playing() && !input.buyOpen && (input.locked || input.fallback)) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
function look(dx, dy, k) {
  if (!player.alive) return;
  const s = settings.sens * k * (camera.fov / 68);
  player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s, -1.5, 1.5);
  vm.swayX = clamp(vm.swayX + dx * 0.00012, -0.03, 0.03); vm.swayY = clamp(vm.swayY - dy * 0.00012, -0.03, 0.03);
}
document.addEventListener('pointerlockchange', () => {
  input.locked = document.pointerLockElement === cvs;
  if (input.locked) input.everLocked = true;
  if (!input.locked && playing() && !input.buyOpen && !input.fallback && !input.touchMode) pauseGame();
});
document.addEventListener('pointerlockerror', lockFailed);

// Touch controls
(function initTouch() {
  const base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob');
  let stickId = null, sx = 0, sy = 0;
  const zone = document.getElementById('stickZone');
  zone.addEventListener('pointerdown', e => { stickId = e.pointerId; zone.setPointerCapture(e.pointerId); const r = base.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; moveStick(e); });
  zone.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; };
  zone.addEventListener('pointerup', endStick); zone.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    let dx = e.clientX - sx, dy = e.clientY - sy; const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx *= max / d; dy *= max / d; }
    touch.mx = dx / max; touch.my = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  const lookers = {};
  const lookStart = e => { lookers[e.pointerId] = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); };
  const lookMove = e => { const l = lookers[e.pointerId]; if (!l || !playing()) return; look(e.clientX - l.x, e.clientY - l.y, 0.006); l.x = e.clientX; l.y = e.clientY; };
  const lookEnd = e => { delete lookers[e.pointerId]; };
  const lz = document.getElementById('lookZone');
  lz.addEventListener('pointerdown', lookStart); lz.addEventListener('pointermove', lookMove); lz.addEventListener('pointerup', lookEnd); lz.addEventListener('pointercancel', lookEnd);
  const fire = document.getElementById('tFire');
  fire.addEventListener('pointerdown', e => { touch.fire = true; fire.classList.add('on'); lookStart(e); });
  fire.addEventListener('pointermove', lookMove);
  const fireEnd = e => { touch.fire = false; fire.classList.remove('on'); lookEnd(e); };
  fire.addEventListener('pointerup', fireEnd); fire.addEventListener('pointercancel', fireEnd);
  const hold = (id, key) => { const b = document.getElementById(id); b.addEventListener('pointerdown', () => { touch[key] = true; b.classList.add('on'); }); const off = () => { touch[key] = false; b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); };
  hold('tJump', 'jump');
  const crouchBtn = document.getElementById('tCrouch');
  crouchBtn.addEventListener('pointerdown', () => { touch.crouch = !touch.crouch; crouchBtn.classList.toggle('on', touch.crouch); });
  const tap = (id, fn) => document.getElementById(id).addEventListener('pointerdown', e => { e.preventDefault(); if (playing()) fn(); });
  tap('tPick', pickupTarget);
  tap('tReload', startReload); tap('tSwap', () => cycleWeapon(1)); tap('tScope', secondaryAction);
  tap('tBuy', () => input.buyOpen ? closeBuy(false) : openBuy()); tap('tPause', pauseGame);
})();

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = vCam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vCam.updateProjectionMatrix();
  sizeRadar();
});

// ---------- Main loop ----------
function update(dt) {
  game.time += dt;
  updateRound(dt);
  updatePlayer(dt);
  updatePlayerBody(dt);
  for (const b of bots) updateBot(b, dt);
  separateBots();
  updateNades(dt);
  updateDrops(dt);
  updateFx(dt);
  spotTick(dt);
  updateCamera(dt);
  updateVM(dt);
  updateHUD(dt);
  for (const b of bots) b.model.marker.visible = b.alive && b.team === player.team && spectating !== b;
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (game.state === 'menu') {
    const t = now / 1000 * 0.05;
    camera.position.set(Math.sin(t) * 40, 17, Math.cos(t) * 40); camera.lookAt(0, 2, 0);
    if (camera.fov !== 68) { camera.fov = 68; camera.updateProjectionMatrix(); }
    for (const b of bots) updateBot(b, dt);
    updateSun(0, 0);
  } else if (!game.paused && game.state !== 'over') update(dt);
  updateWeather(dt);
  if (skyMesh) skyMesh.position.copy(camera.position);
  renderer.clear(); renderer.render(scene, camera);
  if (game.state !== 'menu' && vm.root.visible) { renderer.clearDepth(); renderer.render(vScene, vCam); }
}

settings.fullscreen = store.get('kq_fs', true) !== false;
loadMap(settings.map);
buildRadarMap();
setupTeams(settings.team);
spawnAll(true);
initMenu();
requestAnimationFrame(frame);
