'use strict';
// ---------- Agents ----------
const NAMES = {
  KT: ['Aziz', 'Doniyor', 'Farrux', 'Shoxrux', 'Ulug‘bek', 'Javohir', 'Sherzod', 'Akmal', 'Otabek', 'Nodir'],
  T: ['Bobur', 'Jasur', 'Sardor', 'Temur', 'Rustam', 'Islom', 'Bekzod', 'Anvar', 'Dilshod', 'Kamron']
};
let agents = [], bots = [];
const player = {
  isPlayer: true, id: 0, name: 'Siz', team: 'KT', alive: true, hp: 100, armor: 0, helmet: false, money: 800, kills: 0, deaths: 0,
  pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, jumpReady: true,
  inv: { 1: null, 2: null, 3: null, 4: null }, slot: 2, prevSlot: 3,
  cool: 0, reloadT: 0, switchT: 0, shots: 0, shotsF: 0, punchP: 0, punchY: 0, vpP: 0, vpY: 0, hops: 0, groundT: 0, scope: 0, scopeResume: 0, rescopeT: 0, autoReload: false,
  triggerReleased: true, lastShot: -99, spotUntil: 0, deathT: 0, stepDist: 0, hitMeshes: []
};
const eyeH = () => 1.65 - 0.45 * player.crouch;
const agentEye = a => a.isPlayer ? a.pos.y + eyeH() : 1.7 - 0.42 * a.crouch;
const pistolFor = team => team === 'T' ? WEAPONS.glock : WEAPONS.usp;
const wstate = def => ({ def, mag: def.mag, res: def.res });

// Invisible hitboxes so bots can shoot the player with the same raycast as everyone else
(() => {
  const mat = new THREE.MeshBasicMaterial();
  const mk = (w, h, d, part) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.visible = false; m.userData = { agent: player, part }; scene.add(m); player.hitMeshes.push(m); return m; };
  player.hb = { head: mk(0.28, 0.28, 0.28, 'head'), body: mk(0.5, 0.62, 0.32, 'body'), legs: mk(0.4, 0.8, 0.3, 'legs') };
})();
function syncPlayerHB() {
  const p = player.pos, e = eyeH(), hb = player.hb;
  hb.head.position.set(p.x, p.y + e - 0.02, p.z);
  hb.body.position.set(p.x, p.y + e - 0.5, p.z);
  hb.legs.position.set(p.x, p.y + 0.4 - 0.12 * player.crouch, p.z); hb.legs.scale.y = 1 - 0.35 * player.crouch;
}

function makeBot(name, team, id) {
  const b = {
    isPlayer: false, id, name, team, alive: true, hp: 100, armor: 0, helmet: false, money: 800, kills: 0, deaths: 0,
    pos: new V3(), yaw: 0, primary: null, pistol: wstate(pistolFor(team)), crouch: 0, wantCrouch: false,
    target: null, seeT: 0, reactT: 0.5, aimHead: false, scanT: 0, cool: 0, reloadT: 0, burst: 0, burstLen: 4,
    strafe: 0, strafeT: 0, moveSpeed: 0, walkPh: 0, stepDist: 0, lastSeen: new V3(), lastSeenT: 0, chasing: false, hunting: false, repathT: 0,
    path: null, pi: 0, plan: [], holdT: 0, pendingHold: 0, watchYaw: 0, stuckT: 0, lastPos: new V3(), noticeAgent: null, noticeUntil: 0,
    role: 'A', spotUntil: 0, lastShot: -99, hitMeshes: null
  };
  b.model = makeSoldier(team, id);
  b.model.hit.forEach(m => { m.userData.agent = b; });
  b.hitMeshes = b.model.hit;
  return b;
}
const botWeapon = b => b.primary || b.pistol;

// ---------- Combat ----------
const raycaster = new THREE.Raycaster();
const _list = [];
function shootRay(origin, dir, shooter, def, range) {
  range = range || 220; raycaster.set(origin, dir); raycaster.far = range;
  _list.length = 0;
  for (const m of worldMeshes) _list.push(m);
  for (const a of agents) { if (a === shooter || !a.alive) continue; for (const m of a.hitMeshes) _list.push(m); }
  const hits = raycaster.intersectObjects(_list, false);
  if (!hits.length) return { point: origin.clone().addScaledVector(dir, range), agent: null };
  const h = hits[0], ud = h.object.userData;
  if (ud.agent) {
    const falloff = def.melee ? 1 : Math.max(0.75, 1 - h.distance / 400);
    applyDamage(ud.agent, shooter, def.dmg * falloff, ud.part, def, origin);
    emit(h.point.x, h.point.y, h.point.z, 10, 0x8a1010, 2.2, 0.4, 9, dir.x, dir.y, dir.z);
    return { point: h.point, agent: ud.agent };
  }
  const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new V3(0, 1, 0);
  addDecal(h.point, n);
  emit(h.point.x, h.point.y, h.point.z, 7, 0xcdb48a, 2.4, 0.35, 9, n.x, n.y, n.z);
  emit(h.point.x, h.point.y, h.point.z, 2, 0xffd27a, 4, 0.12, 0, n.x, n.y, n.z);
  return { point: h.point, agent: null };
}
function applyDamage(v, att, dmg, part, def, from) {
  if (!v.alive || game.state === 'freeze') return;
  if (att && att !== v && att.team === v.team) return; // do‘stona otish o‘chirilgan
  let d = dmg * (part === 'head' ? 4 : part === 'legs' ? 0.75 : 1);
  if (v.armor > 0 && (part === 'body' || (part === 'head' && v.helmet))) {
    const reduced = d * (def.armorPen || 0.5);
    v.armor = Math.max(0, v.armor - Math.round((d - reduced) * 0.5)); d = reduced;
  }
  d = Math.max(1, Math.round(d)); v.hp -= d;
  if (att && att.isPlayer && att !== v) { hitMarker(part === 'head'); Snd.hit(part === 'head'); }
  if (v.isPlayer) playerHurt(att, d, from);
  else botHurt(v, att);
  if (v.hp <= 0) { v.hp = 0; kill(v, att, def, part === 'head'); }
}
function kill(v, att, def, hs) {
  v.alive = false; v.deaths++;
  if (att && att !== v) {
    att.kills++; const reward = def.kill || 300; att.money = Math.min(16000, att.money + reward);
    if (att.isPlayer) moneyPop(reward);
  }
  addFeed(att || v, v, def, hs);
  if (v.isPlayer) playerDied(att, def);
  else { v.model.fall = 0; v.model.marker.visible = false; v.target = null; v.model.flash.visible = false; }
  dropOnDeath(v);
  checkRoundEnd();
}
function alertHearing(src) {
  for (const b of bots) {
    if (!b.alive || b.team === src.team || b.target) continue;
    const d = Math.hypot(b.pos.x - src.pos.x, b.pos.z - src.pos.z);
    if (d < 32 && Math.random() < 0.6) { b.lastSeen.copy(src.pos); b.lastSeenT = 3.5; b.chasing = false; b.noticeAgent = src; b.noticeUntil = game.time + 1.2; }
  }
}
function botHurt(b, att) {
  if (!att || att.team === b.team || !att.alive) return;
  b.noticeAgent = att; b.noticeUntil = game.time + 2; b.scanT = 0;
  if (!b.target) { b.lastSeen.copy(att.pos); b.lastSeenT = 3; b.chasing = false; b.yaw = turnToward(b.yaw, Math.atan2(att.pos.x - b.pos.x, att.pos.z - b.pos.z), 1.2); }
}

// ---------- Player weapons ----------
const curState = () => player.inv[player.slot];
const curDef = () => (curState() || player.inv[3]).def;
// ---------- Spray patterns: cumulative [right, up] offsets in degrees for each shot of a burst ----------
const SPRAY = (() => {
  const ak = [[0, 0], [0, 0.35], [0.05, 0.9], [0.1, 1.6], [0.05, 2.35], [-0.05, 3], [-0.15, 3.55], [-0.1, 3.95], [0.05, 4.25], [-0.35, 4.45],
    [-0.75, 4.55], [-1.15, 4.6], [-1.45, 4.65], [-1.6, 4.75], [-1.4, 4.8], [-0.9, 4.85], [-0.3, 4.85], [0.3, 4.9], [0.85, 4.95], [1.25, 5],
    [1.45, 5], [1.2, 5.05], [0.8, 5.05], [0.4, 5.1], [0.1, 5.1], [-0.2, 5.15], [0, 5.2], [0.3, 5.2], [0.55, 5.25], [0.7, 5.25]];
  const m4 = [[0, 0], [0, 0.25], [0, 0.65], [0.05, 1.15], [0.05, 1.65], [0, 2.1], [-0.05, 2.45], [-0.1, 2.7], [-0.25, 2.9], [-0.45, 3],
    [-0.6, 3.05], [-0.65, 3.1], [-0.5, 3.15], [-0.25, 3.2], [0.05, 3.2], [0.35, 3.25], [0.6, 3.25], [0.75, 3.3], [0.7, 3.3], [0.5, 3.35],
    [0.25, 3.35], [0, 3.4], [-0.2, 3.4], [-0.35, 3.45], [-0.4, 3.45]];
  const mp5 = Array.from({ length: 30 }, (_, i) => [0.5 * Math.sin(i / 3.2) * Math.min(1, i / 8), 2.2 * (1 - Math.exp(-i / 5))]);
  const semi = k => Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * 0.08 * i, k * Math.min(i, 6)]);
  return { ak47: ak, m4a1: m4, mp5, usp: semi(0.45), glock: semi(0.4), deagle: semi(1.5), awp: [[0, 0], [0, 2.5]] };
})();
function sprayAt(def, i) {
  const pat = SPRAY[def.id]; if (!pat) return [0, 0];
  const k = pat[Math.min(i, pat.length - 1)], s = 1.25 * Math.PI / 180;
  return [k[0] * s, k[1] * s];
}
function aimDir(spread) {
  const p = player; let yaw = p.yaw + p.punchY, pit = p.pitch + p.punchP;
  if (spread > 0) { const r = spread * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2; yaw += Math.cos(th) * r; pit += Math.sin(th) * r; }
  const cp = Math.cos(pit);
  return new V3(-Math.sin(yaw) * cp, Math.sin(pit), -Math.cos(yaw) * cp);
}
function currentSpread() {
  const p = player, def = curDef(); if (!def.mag) return 0;
  const hs = Math.hypot(p.vel.x, p.vel.z);
  let s = (def.scope && !p.scope ? def.unscoped : def.spread) + def.moveInacc * Math.min(1, hs / 6);
  if (!p.onGround) s += 0.12;
  if (p.crouch > 0.5) s *= 0.75;
  if (def.auto) s += Math.min(p.shots, 10) * 0.0004;
  return s;
}
function switchTo(s) {
  const p = player; if (!p.inv[s] || s === p.slot || !p.alive) return;
  p.prevSlot = p.slot; p.slot = s; p.reloadT = 0; p.scope = 0; p.scopeResume = 0; p.rescopeT = 0; p.autoReload = false;
  p.switchT = s === 3 ? 0.35 : 0.55; p.shots = 0; p.shotsF = 0; p.punchP = p.punchY = 0; vm.set(p.inv[s].def, p.team); Snd.draw();
}
function cycleWeapon(dir) {
  const order = [1, 2, 3, 4].filter(s => player.inv[s]); let i = order.indexOf(player.slot);
  i = (i + dir + order.length) % order.length; switchTo(order[i]);
}
function startReload() {
  const p = player, st = curState();
  if (!st || !st.def.mag || p.reloadT > 0 || st.mag >= st.def.mag || st.res <= 0 || p.switchT > 0) return;
  p.reloadT = st.def.reload; p.scope = 0; p.scopeResume = 0; p.autoReload = false; Snd.reload();
}
function finishReload() {
  const st = curState(); if (!st || !st.def.mag) return;
  const n = Math.min(st.def.mag - st.mag, st.res); st.mag += n; st.res -= n;
}
function secondaryAction() {
  const p = player, def = curDef(); if (!p.alive) return;
  if (def.scope && p.reloadT <= 0 && p.switchT <= 0) { p.scope = (p.scope + 1) % 3; p.rescopeT = 0; p.scopeResume = 0; Snd.draw(); }
  else if (def.melee && p.cool <= 0 && p.switchT <= 0) knifeAttack(true);
}
function knifeAttack(heavy) {
  const p = player, def = WEAPONS.knife;
  p.cool = heavy ? 1.0 : def.rate; vm.swing = 1; Snd.knife();
  shootRay(camera.position.clone(), aimDir(0), p, heavy ? Object.assign({}, def, { dmg: 65 }) : def, 2.3);
}
function tryFire() {
  const p = player, st = curState(); if (!st) return;
  const def = st.def;
  if (p.cool > 0 || p.switchT > 0) return;
  if (def.melee) { knifeAttack(false); return; }
  if (def.id === 'he') { if (!p.triggerReleased) return; p.triggerReleased = false; throwNade(); p.cool = 0.6; return; }
  if (p.reloadT > 0) return;
  if (!def.auto && !p.triggerReleased) return;
  if (st.mag <= 0) { if (p.triggerReleased) Snd.dry(); p.triggerReleased = false; startReload(); return; }
  p.triggerReleased = false;
  st.mag--; p.cool = def.rate; p.lastShot = game.time;
  // Each shot lands on the weapon's fixed spray pattern; pulling the mouse down compensates
  const idx = Math.round(p.shotsF), sp = sprayAt(def, idx);
  p.punchY = -sp[0]; p.punchP = sp[1];
  const dir = aimDir(currentSpread());
  const res = shootRay(camera.position.clone(), dir, p, def);
  const from = p.scope ? camera.localToWorld(new V3(0, -0.3, -0.5)) : camera.localToWorld(new V3(0.15, -0.13, -0.7));
  tracer(from, res.point);
  vm.fire(); muzzleLight.position.copy(from); muzzleLight.intensity = 2.2;
  Snd.shot(def.snd, 0.9, 0.05);
  p.shotsF = idx + 1; p.shots = idx + 1;
  if (def.scope && p.scope) { p.scopeResume = p.scope; p.scope = 0; p.rescopeT = def.rate * 0.9; }
  if (st.mag === 0 && st.res > 0) p.autoReload = true;
  alertHearing(p);
}

// ---------- Grenades ----------
const nades = [];
const nadeGeo = new THREE.SphereGeometry(0.08, 10, 8), nadeMat = new THREE.MeshLambertMaterial({ color: 0x4c5a33 });
function throwNade() {
  const p = player, st = p.inv[4]; if (!st || st.count <= 0) return;
  st.count--;
  const dir = aimDir(0), pos = camera.position.clone().addScaledVector(dir, 0.5);
  const vel = dir.multiplyScalar(17).add(new V3(p.vel.x * 0.5, 2.5, p.vel.z * 0.5));
  const mesh = new THREE.Mesh(nadeGeo, nadeMat); mesh.castShadow = true; mesh.position.copy(pos); scene.add(mesh);
  nades.push({ mesh, pos, vel, t: 0, owner: p }); Snd.knife();
  if (st.count <= 0) { p.inv[4] = null; switchTo(p.inv[1] ? 1 : 2); }
}
const blocked = (x, y, z) => y < 0.07 || !!hitBox(x, y - 0.07, z, 0.07, 0.14);
function updateNades(dt) {
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i]; n.t += dt; n.vel.y -= 16 * dt;
    const nx = n.pos.x + n.vel.x * dt; if (blocked(nx, n.pos.y, n.pos.z)) n.vel.x *= -0.45; else n.pos.x = nx;
    const nz = n.pos.z + n.vel.z * dt; if (blocked(n.pos.x, n.pos.y, nz)) n.vel.z *= -0.45; else n.pos.z = nz;
    const ny = n.pos.y + n.vel.y * dt;
    if (blocked(n.pos.x, ny, n.pos.z)) { n.vel.y *= -0.35; n.vel.x *= 0.75; n.vel.z *= 0.75; if (Math.abs(n.vel.y) < 0.6) n.vel.y = 0; }
    else n.pos.y = ny;
    n.mesh.position.copy(n.pos); n.mesh.rotation.x += dt * 8;
    if (n.t > 1.7) { explode(n); scene.remove(n.mesh); nades.splice(i, 1); }
  }
}
function explode(n) {
  const s = spatial(n.pos); Snd.boom(Math.min(1, s.vol * 1.6), s.pan);
  puff(n.pos.x, n.pos.y + 0.5, n.pos.z, 3, 0.35, true);
  for (let k = 0; k < 4; k++) puff(n.pos.x + rand(-1, 1), n.pos.y + 0.6 + k * 0.3, n.pos.z + rand(-1, 1), 2.4, 1.6, false);
  emit(n.pos.x, n.pos.y + 0.2, n.pos.z, 60, 0xffb24a, 9, 0.5, 6);
  emit(n.pos.x, n.pos.y + 0.2, n.pos.z, 40, 0x6b5a44, 6, 1.0, 5);
  for (const a of agents) {
    if (!a.alive) continue;
    const cy = a.pos.y + 1.0, d = Math.hypot(a.pos.x - n.pos.x, cy - n.pos.y, a.pos.z - n.pos.z);
    if (d < 9 && losClear(n.pos.x, n.pos.y + 0.2, n.pos.z, a.pos.x, cy, a.pos.z))
      applyDamage(a, n.owner, 98 * Math.pow(1 - d / 9, 1.3), 'body', WEAPONS.he, n.pos);
  }
  if (player.alive) shake = Math.max(shake, clamp(1 - s.d / 20, 0, 1) * 0.06);
}
let shake = 0;

// ---------- Bot AI ----------
function planBot(b) {
  b.plan = [];
  if (b.team === 'T') {
    const site = game.tSite;
    if (Math.random() < 0.6) b.plan.push({ c: pick(MAP.via[site]), hold: rand(0, 2.5) });
    const sc = pick(SITES[site]); b.plan.push({ c: [sc.x, sc.z], hold: rand(2, 6) });
  } else if (b.role === 'mid') b.plan.push({ c: pick(MAP.mid), hold: rand(18, 32) });
  else { const sc = pick(SITES[b.role]); b.plan.push({ c: [sc.x, sc.z], hold: rand(18, 32) }); }
}
function setGoalWorld(b, x, z) {
  const gc = nearestWalkable(wcx(x), wcz(z)), sc = nearestWalkable(wcx(b.pos.x), wcz(b.pos.z));
  const p = astar(sc.x, sc.z, gc.x, gc.z);
  b.path = p ? smoothPath(b.pos.x, b.pos.z, p) : null; b.pi = 0; b.stuckT = 0; b.lastPos.copy(b.pos);
  return !!p;
}
function nextGoal(b) {
  if (b.plan.length) {
    const g = b.plan.shift(), gx = cxw(g.c[0]), gz = czw(g.c[1]);
    setGoalWorld(b, gx, gz); b.pendingHold = g.hold; b.hunting = false;
    const enemy = SPAWN_C[b.team === 'T' ? 'KT' : 'T']; b.watchYaw = Math.atan2(enemy.x - gx, enemy.z - gz);
  } else huntGoal(b);
}
function huntGoal(b) {
  const foes = agents.filter(a => a.alive && a.team !== b.team);
  if (!foes.length) { b.path = null; return; }
  const e = pick(foes); setGoalWorld(b, e.pos.x, e.pos.z); b.hunting = true; b.repathT = rand(2.5, 4); b.pendingHold = 0;
}
function findTarget(b) {
  let best = null, bd = 1e9; const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  for (const e of agents) {
    if (!e.alive || e.team === b.team) continue;
    const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z, d = Math.hypot(dx, dz);
    if (d > 75) continue;
    const noticed = e === b.target || (e === b.noticeAgent && game.time < b.noticeUntil);
    if (!noticed && d > 5 && (dx * fx + dz * fz) / (d || 1) < 0.2) continue;
    if (!losClear(b.pos.x, agentEye(b), b.pos.z, e.pos.x, agentEye(e) - 0.1, e.pos.z)) continue;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
const _o = new V3(), _t = new V3(), _d = new V3(), _r = new V3(), _u = new V3(), _m = new V3(), UP = new V3(0, 1, 0);
function botFire(b) {
  const st = botWeapon(b), def = st.def, t = b.target;
  st.mag--;
  b.cool = def.id === 'awp' ? def.rate + rand(0.2, 0.6) : def.rate * (def.auto ? 1 : rand(1.2, 2));
  _o.set(b.pos.x, agentEye(b) - 0.15, b.pos.z);
  _t.set(t.pos.x, agentEye(t) - (b.aimHead ? 0.03 : 0.5), t.pos.z);
  _d.subVectors(_t, _o).normalize();
  const err = SK.err * (1 + b.burst * 0.45) * (b.moveSpeed > 0.5 ? 1.8 : 1) * (def.id === 'awp' ? 0.35 : def.slot === 2 ? 1.2 : 1);
  const r = err * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
  _r.crossVectors(_d, UP).normalize(); _u.crossVectors(_r, _d);
  _d.addScaledVector(_r, Math.cos(th) * r).addScaledVector(_u, Math.sin(th) * r).normalize();
  const res = shootRay(_o.clone(), _d.clone(), b, def);
  b.model.muzzle.getWorldPosition(_m); tracer(_m, res.point);
  b.model.flash.visible = true; b.model.flashT = 0.05; b.model.flash.material.rotation = Math.random() * 6;
  const s = spatial(_o); Snd.shot(def.snd, s.vol, s.pan);
  b.lastShot = game.time;
  if (def.auto) { b.burst++; if (b.burst >= b.burstLen) { b.cool += rand(0.28, 0.55); b.burst = 0; b.burstLen = randi(SK.burst[0], SK.burst[1]); } }
  alertHearing(b);
}
function updateBot(b, dt) {
  const m = b.model;
  if (m.flashT > 0) { m.flashT -= dt; if (m.flashT <= 0) m.flash.visible = false; }
  if (!b.alive) {
    if (m.fall < 1) { m.fall = Math.min(1, m.fall + dt * 2.6); const k = m.fall * m.fall; m.group.rotation.x = -k * Math.PI / 2; m.group.position.y = 0.12 * k; }
    return;
  }
  b.moveSpeed = 0;
  if (game.state === 'live' || game.state === 'end') {
    const st = botWeapon(b);
    b.cool -= dt;
    if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) st.mag = st.def.mag; }
    else if (st.mag <= 0) b.reloadT = st.def.reload;
    b.scanT -= dt;
    if (b.scanT <= 0) {
      b.scanT = 0.1 + Math.random() * 0.06;
      const t = findTarget(b);
      if (t) {
        if (t !== b.target) {
          b.target = t; b.seeT = 0; b.aimHead = Math.random() < SK.head; b.reactT = SK.react * rand(0.8, 1.3);
          b.wantCrouch = Math.random() < SK.crouch && b.pos.distanceTo(t.pos) > 6;
        }
        b.lastSeen.copy(t.pos); b.lastSeenT = 5; b.chasing = false;
        if (b.team === player.team) t.spotUntil = game.time + 1.2;
      } else { b.target = null; b.wantCrouch = false; }
    }
    let mx = 0, mz = 0, spd = 0;
    if (b.target && b.target.alive) {
      const t = b.target; b.seeT += dt;
      const want = Math.atan2(t.pos.x - b.pos.x, t.pos.z - b.pos.z);
      b.yaw = turnToward(b.yaw, want, SK.turn * dt);
      if (b.seeT > b.reactT && Math.abs(angDiff(b.yaw, want)) < 0.12 && b.cool <= 0 && b.reloadT <= 0 && st.mag > 0) botFire(b);
      b.strafeT -= dt;
      if (b.strafeT <= 0) { b.strafeT = rand(0.4, 1.3); b.strafe = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
      if (b.strafe && !b.wantCrouch && b.burst === 0 && b.cool > 0.08) { mx = Math.cos(b.yaw) * b.strafe; mz = -Math.sin(b.yaw) * b.strafe; spd = 3; }
    } else if (game.state === 'live') {
      b.target = null;
      if (b.lastSeenT > 0) {
        b.lastSeenT -= dt;
        if (!b.chasing) { b.chasing = true; b.holdT = 0; b.hunting = false; setGoalWorld(b, b.lastSeen.x, b.lastSeen.z); }
      } else if (b.chasing) { b.chasing = false; b.path = null; }
      if (b.hunting) { b.repathT -= dt; if (b.repathT <= 0) huntGoal(b); }
      if (b.path && b.pi < b.path.length) {
        const wp = b.path[b.pi], dx = wp.x - b.pos.x, dz = wp.z - b.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.45) b.pi++;
        else { mx = dx / d; mz = dz / d; spd = 5.4 * (st.def.speed || 1); b.yaw = turnToward(b.yaw, Math.atan2(dx, dz), 7 * dt); }
        if (b.path && b.pi >= b.path.length) { b.path = null; b.holdT = b.pendingHold || 0; b.pendingHold = 0; }
        b.stuckT += dt;
        if (b.stuckT > 1.2) {
          if (b.pos.distanceTo(b.lastPos) < 0.5 && b.path) { const last = b.path[b.path.length - 1]; setGoalWorld(b, last.x + rand(-1, 1), last.z + rand(-1, 1)); }
          b.stuckT = 0; b.lastPos.copy(b.pos);
        }
      } else if (b.holdT > 0) {
        b.holdT -= dt;
        b.yaw = turnToward(b.yaw, b.watchYaw + Math.sin(game.time * 0.6 + b.id * 1.7) * 0.6, 2.5 * dt);
      } else if (!b.chasing) nextGoal(b);
    }
    if (spd > 0) {
      const ox = b.pos.x, oz = b.pos.z;
      moveXZ(b.pos, mx * spd * dt, mz * spd * dt, 0.34, 1.8);
      b.moveSpeed = Math.hypot(b.pos.x - ox, b.pos.z - oz) / dt;
      b.stepDist += b.moveSpeed * dt;
      if (b.stepDist > 2.4 && b.moveSpeed > 4) {
        b.stepDist = 0; const s = spatial(b.pos);
        if (s.d < 28) Snd.step(s.vol * (b.team === player.team ? 0.25 : 0.55), s.pan);
      }
    }
  }
  b.crouch = clamp(b.crouch + (b.wantCrouch && b.target ? 1 : -1) * dt * 6, 0, 1);
  setSoldierGun(m, botWeapon(b).def.model);
  m.group.position.set(b.pos.x, 0, b.pos.z); m.group.rotation.y = b.yaw;
  if (b.moveSpeed > 0.5) b.walkPh += dt * b.moveSpeed * 1.9;
  poseSoldier(m, b.walkPh, Math.min(1, b.moveSpeed / 5), b.crouch, false);
}
function separateBots() {
  for (let i = 0; i < bots.length; i++) {
    const a = bots[i]; if (!a.alive) continue;
    for (let j = 0; j < agents.length; j++) {
      const b = agents[j]; if (b === a || !b.alive) continue;
      const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.75 && d > 0.0001 && Math.abs(a.pos.y - b.pos.y) < 1.5) {
        const push = (0.75 - d) * (b.isPlayer ? 1 : 0.5);
        moveXZ(a.pos, dx / d * push, dz / d * push, 0.34, 1.8);
      }
    }
  }
}
function botBuy(b) {
  const rifle = b.team === 'T' ? WEAPONS.ak47 : WEAPONS.m4a1;
  if (!b.primary) {
    if (b.money >= 5750 && Math.random() < 0.2) { b.primary = wstate(WEAPONS.awp); b.money -= 4750; }
    else if (b.money >= rifle.price + 650) { b.primary = wstate(rifle); b.money -= rifle.price; }
    else if (b.money >= 2150 && Math.random() < 0.5) { b.primary = wstate(WEAPONS.mp5); b.money -= 1500; }
    else if (b.money >= 700 && b.pistol.def.id !== 'deagle' && Math.random() < 0.35) { b.pistol = wstate(WEAPONS.deagle); b.money -= 700; }
  }
  if (b.armor < 100 && b.money >= 1000) { b.armor = 100; b.helmet = true; b.money -= 1000; }
  else if (b.armor < 100 && b.money >= 650) { b.armor = 100; b.money -= 650; }
  for (const st of [b.primary, b.pistol]) if (st) { st.mag = st.def.mag; st.res = st.def.res; }
}
