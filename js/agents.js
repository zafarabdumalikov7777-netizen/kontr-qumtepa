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
  cool: 0, reloadT: 0, switchT: 0, shots: 0, shotsF: 0, punchP: 0, punchY: 0, vpP: 0, vpY: 0, kickP: 0, kickY: 0, kTP: 0, kTY: 0, hops: 0, groundT: 0, scope: 0, scopeResume: 0, rescopeT: 0, autoReload: false,
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
  // bots wear a random agent most of the time, so a team never looks like clones
  const looks = Object.values(AGENTS).filter(a => a.team === team);
  b.model = makeSoldier(team, morphVariant() || (Math.random() < 0.65 ? pick(looks) : id));
  if (MODS.big) bigHead(b.model);
  b.model.hit.forEach(m => { m.userData.agent = b; });
  b.hitMeshes = b.model.hit;
  return b;
}
const botWeapon = b => b.primary || b.pistol;

// ---------- Combat ----------
const raycaster = new THREE.Raycaster();
const _list = [];
const eyePos = () => new V3(player.pos.x, player.pos.y + eyeH(), player.pos.z);
// third person: the bullet leaves the eyes toward whatever the camera's crosshair ray hits
function aimPoint(origin, dir, range = 220) {
  raycaster.set(origin, dir); raycaster.far = range; _list.length = 0;
  for (const m of worldMeshes) _list.push(m);
  for (const a of agents) { if (a === player || !a.alive) continue; for (const m of a.hitMeshes) _list.push(m); }
  const h = raycaster.intersectObjects(_list, false)[0];
  return h ? h.point.clone() : origin.clone().addScaledVector(dir, range);
}
// how much damage survives a crate
const PEN = { p250: 0.35, tec9: 0.45, fiveseven: 0.45, mac10: 0.3, ump45: 0.35, aug: 0.65, sg553: 0.7, xm1014: 0.15, negev: 0.55, ak47: 0.6, m4a1: 0.55, galil: 0.55, famas: 0.5, awp: 0.8, ssg08: 0.75, deagle: 0.5, mp5: 0.35, p90: 0.3, nova: 0.15, usp: 0.3, glock: 0.25 };
function shootRay(origin, dir, shooter, def, range) {
  range = range || 220; raycaster.set(origin, dir); raycaster.far = range;
  _list.length = 0;
  for (const m of worldMeshes) _list.push(m);
  for (const a of agents) { if (a === shooter || !a.alive) continue; for (const m of a.hitMeshes) _list.push(m); }
  const hits = raycaster.intersectObjects(_list, false);
  // wallbang: rifles, pistols and the AWP punch through crates and lose part of their damage
  let i = 0, pen = 1;
  while (i < hits.length && hits[i].object.userData.pen && PEN[def.id] && pen > 0.3) {
    const o = hits[i].object, n = hits[i].face ? hits[i].face.normal.clone().transformDirection(o.matrixWorld) : new V3(0, 1, 0);
    addDecal(hits[i].point, n); emit(hits[i].point.x, hits[i].point.y, hits[i].point.z, 5, 0xb08a5a, 2, 0.3, 6, n.x, n.y, n.z);
    pen *= PEN[def.id]; while (i < hits.length && hits[i].object === o) i++;
  }
  if (i >= hits.length) return { point: origin.clone().addScaledVector(dir, range), agent: null };
  const h = hits[i], ud = h.object.userData;
  if (ud.agent) {
    const falloff = def.melee ? 1 : Math.max(def.pellets ? 0.2 : 0.75, 1 - h.distance * (def.falloff || 1 / 400));
    applyDamage(ud.agent, shooter, def.dmg * falloff * pen, ud.part, def, origin);
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
  if (v.protectUntil && game.time < v.protectUntil) return; // respawn protection (deathmatch)
  let d = dmg * (part === 'head' ? 4 : part === 'legs' ? 0.75 : 1);
  if (v.armor > 0 && (part === 'body' || (part === 'head' && v.helmet))) {
    const reduced = d * (def.armorPen || 0.5);
    v.armor = Math.max(0, v.armor - Math.round((d - reduced) * 0.5)); d = reduced;
  }
  d = Math.max(1, Math.round(d));
  if (att && att !== v) att.dmg = (att.dmg || 0) + Math.min(d, v.hp);
  if (att && att !== v && (att.isPlayer || v.isPlayer)) logDamage(att, v, Math.min(d, v.hp));
  v.hp -= d;
  if (att && att.isPlayer && att !== v) { hitMarker(part === 'head'); Snd.hit(part === 'head'); }
  if (v.isPlayer) playerHurt(att, d, from);
  else botHurt(v, att);
  if (v.hp <= 0) { v.hp = 0; kill(v, att, def, part === 'head'); }
}
function kill(v, att, def, hs) {
  v.alive = false; v.deaths++;
  if (att && att !== v) {
    att.kills++; if (hs) att.hs = (att.hs || 0) + 1;
    if (!att.isPlayer) { att.roundKills = (att.roundKills || 0) + 1; if (Math.random() < 0.5) radio(att, pick(['Bittasini oldim!', 'Urdim!', 'Biri ketdi!'])); } // the player's count is kept by the streak banner
    const reward = def.kill || 300; att.money = Math.min(16000, att.money + reward);
    if (att.isPlayer) { if (!isDM()) moneyPop(reward); playerKillStreak(hs); }
  }
  addFeed(att || v, v, def, hs);
  if (v.isPlayer) playerDied(att, def);
  else { v.model.fall = 0; v.model.marker.visible = false; v.target = null; v.model.flash.visible = false; }
  if (bomb.carrier === v) dropBomb(v);
  if (game.mode !== 'gg') dropOnDeath(v);
  if (isDM()) { dmKill(v, att); updatePips(); return; }
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
// AK-47 and M4 use Counter-Strike's per-shot recoil table (screen deltas, x right / y up), summed into a path.
const AK_DELTAS = [[-4, 7], [4, 19], [-3, 29], [-1, 31], [13, 31], [8, 28], [13, 21], [-17, 12], [-42, -3], [-21, 2], [12, 11], [-15, 7], [-26, -8], [-3, 4], [40, 1],
  [19, 7], [14, 10], [27, 0], [33, -10], [-21, -2], [7, 3], [-7, 9], [-8, 4], [19, -3], [5, 6], [-20, -1], [-33, -4], [-45, -21], [-14, 1]];
const M4_DELTAS = [[2, 7], [0, 9], [-6, 16], [7, 21], [-9, 23], [-5, 27], [16, 15], [11, 13], [22, 5], [-4, 11], [-18, 6], [-30, -4], [-24, 0], [-25, -6],
  [0, 4], [8, 4], [-11, 1], [-13, -2], [2, 2], [33, -1], [10, 6], [27, 3], [10, 2], [11, 0]];
const fromDeltas = (deltas, degPerUnit) => { let x = 0, y = 0; return [[0, 0], ...deltas.map(([dx, dy]) => { x += dx; y += dy; return [x * degPerUnit, y * degPerUnit]; })]; };
const SPRAY = (() => {
  const ak = fromDeltas(AK_DELTAS, 0.05);   // tops out ≈ 9.5° up, −4°…+2.6° sideways
  const m4 = fromDeltas(M4_DELTAS, 0.042);  // silenced M4: ≈ 7.5° up, smaller sway
  const mp5 = Array.from({ length: 30 }, (_, i) => [0.5 * Math.sin(i / 3.2) * Math.min(1, i / 8), 2.2 * (1 - Math.exp(-i / 5))]);
  const semi = k => Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * 0.08 * i, k * Math.min(i, 6)]);
  const p90 = Array.from({ length: 50 }, (_, i) => [0.45 * Math.sin(i / 4) * Math.min(1, i / 10), 2 * (1 - Math.exp(-i / 7))]);
  return { ak47: ak, m4a1: m4, mp5, usp: semi(0.45), glock: semi(0.4), deagle: semi(1.5), awp: [[0, 0], [0, 2.5]],
    galil: fromDeltas(AK_DELTAS, 0.044), famas: fromDeltas(M4_DELTAS, 0.046), p90, ssg08: [[0, 0], [0, 1.8]], nova: [[0, 0], [0, 2.4]],
    p250: semi(0.5), tec9: semi(0.35), fiveseven: semi(0.4), mac10: mp5.map(([x, y]) => [x * 1.4, y * 1.1]), ump45: mp5.map(([x, y]) => [x * 0.8, y * 1.25]),
    aug: fromDeltas(M4_DELTAS, 0.04), sg553: fromDeltas(AK_DELTAS, 0.042), xm1014: [[0, 0], [0, 1.6]],
    negev: Array.from({ length: 150 }, (_, i) => [0.8 * Math.sin(i / 5) * Math.min(1, i / 12), 3.2 * (1 - Math.exp(-i / 6)) - 1.4 * clamp((i - 12) / 20, 0, 1)]) };
})();
// How far each pattern is stretched (AK tops out near 9° like CS2) and how hard each shot snaps the view (radians)
const SPRAY_SCALE = { p250: 1.3, tec9: 1.3, fiveseven: 1.3, mac10: 1.5, ump45: 1.4, aug: 1, sg553: 1, xm1014: 1, negev: 1, ak47: 1, m4a1: 1, galil: 1, famas: 1, mp5: 1.5, p90: 1.4, deagle: 1.3, usp: 1.3, glock: 1.3, ssg08: 1, nova: 1, awp: 1 };
// view punch (rad), its sideways spread, and how the weapon moves in the hands: kicked back, muzzle rise, roll
const RECOIL = {
  ak47: { kick: 0.0014, side: 0.3, back: 1, rise: 1, roll: 0.02 }, m4a1: { kick: 0.0011, side: 0.25, back: 0.85, rise: 0.8, roll: 0.015 },
  mp5: { kick: 0.0008, side: 0.4, back: 0.6, rise: 0.6, roll: 0.02 }, awp: { kick: 0.02, side: 0.1, back: 2.2, rise: 2.4, roll: 0.02 },
  deagle: { kick: 0.016, side: 0.15, back: 2.2, rise: 3, roll: 0.05 }, usp: { kick: 0.005, side: 0.2, back: 1.3, rise: 1.6, roll: 0.03 },
  glock: { kick: 0.0045, side: 0.25, back: 1.2, rise: 1.5, roll: 0.03 },
  galil: { kick: 0.0013, side: 0.3, back: 0.95, rise: 0.95, roll: 0.02 }, famas: { kick: 0.0011, side: 0.25, back: 0.85, rise: 0.8, roll: 0.015 },
  p90: { kick: 0.0008, side: 0.4, back: 0.55, rise: 0.5, roll: 0.02 }, ssg08: { kick: 0.012, side: 0.1, back: 1.8, rise: 2, roll: 0.02 },
  nova: { kick: 0.02, side: 0.15, back: 2.4, rise: 2.6, roll: 0.03 },
  p250: { kick: 0.006, side: 0.2, back: 1.3, rise: 1.6, roll: 0.03 }, tec9: { kick: 0.005, side: 0.3, back: 1.1, rise: 1.3, roll: 0.03 },
  fiveseven: { kick: 0.005, side: 0.2, back: 1.2, rise: 1.4, roll: 0.03 }, mac10: { kick: 0.0009, side: 0.5, back: 0.55, rise: 0.5, roll: 0.025 },
  ump45: { kick: 0.001, side: 0.35, back: 0.7, rise: 0.65, roll: 0.02 }, aug: { kick: 0.001, side: 0.2, back: 0.8, rise: 0.75, roll: 0.012 },
  sg553: { kick: 0.0012, side: 0.25, back: 0.85, rise: 0.8, roll: 0.015 }, xm1014: { kick: 0.012, side: 0.2, back: 1.8, rise: 1.8, roll: 0.03 },
  negev: { kick: 0.0012, side: 0.45, back: 0.9, rise: 0.7, roll: 0.03 }
};
const RECOIL_DEF = { kick: 0.002, side: 0.3, back: 0.8, rise: 0.8, roll: 0.02 };
// The crosshair stays put and the bullets climb the spray pattern above it (AK ≈ 7.5° after 30 bullets)
const RECOIL_SCALE = 0.8;
function sprayAt(def, i) {
  const pat = SPRAY[def.id]; if (!pat) return [0, 0];
  const k = pat[Math.min(i, pat.length - 1)], s = (SPRAY_SCALE[def.id] || 1.4) * RECOIL_SCALE * Math.PI / 180;
  return [k[0] * s, k[1] * s];
}
// a direction inside a cone around d (shotgun pellets)
const _cr = new V3(), _cu = new V3();
function coneDir(d, cone) {
  const r = cone * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
  _cr.crossVectors(d, UP).normalize(); _cu.crossVectors(_cr, d);
  return d.clone().addScaledVector(_cr, Math.cos(th) * r).addScaledVector(_cu, Math.sin(th) * r).normalize();
}
function aimDir(spread) {
  const p = player; let yaw = p.yaw + p.punchY, pit = p.pitch + p.punchP; // the crosshair plus the spray offset of this bullet
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
  const order = [1, 2, 3, 4, 5].filter(s => player.inv[s]); let i = order.indexOf(player.slot);
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
  if (game.mode === 'practice') st.res = st.def.res;
}
function secondaryAction() {
  const p = player, def = curDef(); if (!p.alive) return;
  if (def.scope && p.reloadT <= 0 && p.switchT <= 0) { p.scope = (p.scope + 1) % 3; p.rescopeT = 0; p.scopeResume = 0; Snd.draw(); }
  else if (def.melee && p.cool <= 0 && p.switchT <= 0) knifeAttack(true);
}
function knifeAttack(heavy) {
  const p = player, def = WEAPONS.knife;
  p.cool = heavy ? 1.0 : def.rate; vm.swing = 1; Snd.knife();
  shootRay(eyePos(), aimDir(0), p, heavy ? Object.assign({}, def, { dmg: 65 }) : def, 2.3);
}
function tryFire() {
  const p = player, st = curState(); if (!st) return;
  const def = st.def;
  if (def.id === 'c4' || p.cool > 0 || p.switchT > 0) return;
  vm.inspect = 0;
  if (def.melee) { knifeAttack(false); return; }
  if (def.slot === 4) { if (!p.triggerReleased) return; p.triggerReleased = false; throwNade(); p.cool = 0.6; return; }
  if (p.reloadT > 0) return;
  if (!def.auto && !p.triggerReleased) return;
  if (st.mag <= 0) { if (p.triggerReleased) Snd.dry(); p.triggerReleased = false; startReload(); return; }
  p.triggerReleased = false;
  st.mag--; p.cool = (def.auto && p.cool > -0.05 ? p.cool : 0) + def.rate; p.lastShot = game.time;
  if (game.mode === 'practice') st.res = st.def.res; // practice: endless reserve, reloads stay real
  // CS2: the crosshair never moves — each bullet lands on the weapon's fixed spray pattern above it,
  // pulling the mouse down compensates; only the gun in your hands kicks
  const idx = Math.round(p.shotsF), sp = sprayAt(def, idx);
  p.punchY = -sp[0]; p.punchP = sp[1];
  const rc = RECOIL[def.id] || RECOIL_DEF;
  const tp = thirdPerson(), eye = eyePos();
  let dir = aimDir(currentSpread());
  if (tp) { const t = aimPoint(camera.position, dir); if (t.distanceTo(eye) > 0.6) dir = t.sub(eye).normalize(); }
  const res = shootRay(eye, dir, p, def);
  const from = tp && playerBody && playerBody.muzzle ? playerBody.muzzle.getWorldPosition(new V3())
    : p.scope ? camera.localToWorld(new V3(0, -0.3, -0.5)) : camera.localToWorld(new V3(0.15, -0.13, -0.7));
  tracer(from, res.point);
  for (let k = 1; k < (def.pellets || 1); k++) { const r2 = shootRay(eye, coneDir(dir, def.cone), p, def); if (k % 3 === 0) tracer(from, r2.point); } // shotgun pellets
  vm.fire(rc); muzzleLight.position.copy(from); muzzleLight.intensity = 3.2;
  if (!def.melee && !tp) ejectShell(def.slot === 2);
  if (p.shots % 3 === 2) puff(from.x, from.y, from.z, 0.22, 0.7, false); // barrel smoke builds up during a spray
  Snd.shot(def.snd, 0.9, 0.05);
  p.shotsF = idx + 1; p.shots = idx + 1;
  if (def.scope && p.scope) { p.scopeResume = p.scope; p.scope = 0; p.rescopeT = def.rate * 0.9; }
  if (st.mag === 0 && st.res > 0) p.autoReload = true;
  alertHearing(p);
}

// ---------- Grenades ----------
const nades = [];
const nadeGeo = new THREE.SphereGeometry(0.08, 10, 8), nadeMat = new THREE.MeshLambertMaterial({ color: 0x4c5a33 });
const nadeMats = { he: nadeMat, flash: new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }), smoke: new THREE.MeshLambertMaterial({ color: 0x5d646d }), molotov: new THREE.MeshLambertMaterial({ color: 0x6b4a1e }) };
const NADE_MAX = { he: 1, flash: 2, smoke: 1, molotov: 1 };
// Slot 4 shows one grenade type at a time; `prefer` selects a type, otherwise keep the current one
function syncNadeSlot(prefer) {
  const p = player, n = p.nades || (p.nades = { he: 0, flash: 0, smoke: 0, molotov: 0 });
  const cur = p.inv[4] && p.inv[4].def.id;
  const t = prefer && n[prefer] > 0 ? prefer : cur && n[cur] > 0 ? cur : NADE_ORDER.find(k => n[k] > 0);
  p.inv[4] = t ? { def: WEAPONS[t], count: n[t] } : null;
  if (p.slot === 4 && p.inv[4] && p.inv[4].def.id !== cur) vm.set(p.inv[4].def, p.team);
}
function cycleNade() {
  const p = player, n = p.nades; if (!n || !p.inv[4]) return;
  const i = NADE_ORDER.indexOf(p.inv[4].def.id);
  for (let k = 1; k <= NADE_ORDER.length; k++) { const t = NADE_ORDER[(i + k) % NADE_ORDER.length]; if (n[t] > 0) { syncNadeSlot(t); Snd.draw(); return; } }
}
function throwNade() {
  const p = player, st = p.inv[4]; if (!st || !p.nades) return;
  const kind = st.def.id; if (!(p.nades[kind] > 0)) return;
  p.nades[kind]--;
  const dir = aimDir(0), pos = eyePos().addScaledVector(dir, 0.5);
  const vel = dir.multiplyScalar(17).add(new V3(p.vel.x * 0.5, 2.5, p.vel.z * 0.5));
  const mesh = new THREE.Mesh(nadeGeo, nadeMats[kind]); mesh.castShadow = true; mesh.position.copy(pos); scene.add(mesh);
  nades.push({ mesh, pos, vel, t: 0, owner: p, kind }); Snd.knife();
  syncNadeSlot();
  if (!p.inv[4]) { p.slot = 0; switchTo(p.inv[1] ? 1 : 2); }
}
const blocked = (x, y, z) => y < 0.07 || !!hitBox(x, y - 0.07, z, 0.07, 0.14);
function updateNades(dt) {
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i]; n.t += dt; n.vel.y -= 16 * dt;
    const nx = n.pos.x + n.vel.x * dt; if (blocked(nx, n.pos.y, n.pos.z)) n.vel.x *= -0.45; else n.pos.x = nx;
    const nz = n.pos.z + n.vel.z * dt; if (blocked(n.pos.x, n.pos.y, nz)) n.vel.z *= -0.45; else n.pos.z = nz;
    const ny = n.pos.y + n.vel.y * dt;
    if (blocked(n.pos.x, ny, n.pos.z)) { if (n.vel.y < 0) n.landed = true; n.vel.y *= -0.35; n.vel.x *= 0.75; n.vel.z *= 0.75; if (Math.abs(n.vel.y) < 0.6) n.vel.y = 0; }
    else n.pos.y = ny;
    n.mesh.position.copy(n.pos); n.mesh.rotation.x += dt * 8;
    const done = n.kind === 'molotov' ? n.landed || n.t > 2.2 : n.kind === 'smoke' ? (n.t > 1.2 && Math.hypot(n.vel.x, n.vel.z) < 1) || n.t > 3 : n.t > (n.kind === 'flash' ? 1.5 : 1.7);
    if (done) { explode(n); scene.remove(n.mesh); nades.splice(i, 1); }
  }
}
function explode(n) {
  if (n.kind === 'smoke') return startSmoke(n.pos);
  if (n.kind === 'flash') return flashBang(n.pos);
  if (n.kind === 'molotov') return startFire(n.pos, n.owner);
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
  if (b.blindUntil && game.time < b.blindUntil) return null; // flashed
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
  if (def.melee) {
    b.cool = 0.6; _o.set(b.pos.x, agentEye(b) - 0.3, b.pos.z); _t.set(t.pos.x, agentEye(t) - 0.5, t.pos.z);
    shootRay(_o.clone(), _d.subVectors(_t, _o).normalize().clone(), b, def, 2.4); Snd.knife(); b.lastShot = game.time; return;
  }
  st.mag--;
  b.cool = def.scope ? def.rate + rand(0.2, 0.6) : def.rate * (def.auto ? 1 : rand(1.2, 2));
  _o.set(b.pos.x, agentEye(b) - 0.15, b.pos.z);
  _t.set(t.pos.x, agentEye(t) - (b.aimHead ? 0.03 : 0.5), t.pos.z);
  _d.subVectors(_t, _o).normalize();
  const err = SK.err * (1 + b.burst * 0.45) * (b.moveSpeed > 0.5 ? 1.8 : 1) * (def.scope ? 0.35 : def.slot === 2 ? 1.2 : 1);
  const r = err * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
  _r.crossVectors(_d, UP).normalize(); _u.crossVectors(_r, _d);
  _d.addScaledVector(_r, Math.cos(th) * r).addScaledVector(_u, Math.sin(th) * r).normalize();
  const res = shootRay(_o.clone(), _d.clone(), b, def);
  for (let k = 1; k < (def.pellets || 1); k++) shootRay(_o.clone(), coneDir(_d, def.cone), b, def);
  // a miss that passes close to the player's head cracks past their ear
  if (player.alive && res.agent !== player && b.team !== player.team) {
    const e = camera.position, ab = _m.subVectors(res.point, _o), L = ab.lengthSq() || 1;
    const k = clamp(((e.x - _o.x) * ab.x + (e.y - _o.y) * ab.y + (e.z - _o.z) * ab.z) / L, 0, 1);
    const dx = _o.x + ab.x * k - e.x, dy = _o.y + ab.y * k - e.y, dz = _o.z + ab.z * k - e.z;
    if (k > 0.05 && k < 0.99 && dx * dx + dy * dy + dz * dz < 2.2) Snd.whiz(spatial(res.point).pan);
  }
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
          if (!b.target) radio(b, `Raqib ko‘rindi — ${placeName(t.pos)}!`);
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
      const melee = st.def.melee, dist = melee ? Math.hypot(t.pos.x - b.pos.x, t.pos.z - b.pos.z) : 0;
      if (b.seeT > b.reactT && Math.abs(angDiff(b.yaw, want)) < 0.12 && b.cool <= 0 && b.reloadT <= 0 && (melee ? dist < 2 : st.mag > 0)) botFire(b);
      if (melee && dist > 1.4) { mx = Math.sin(want); mz = Math.cos(want); spd = 5.8; }
      if (b.nadeKind && b.seeT > 0.35 && b.seeT < 0.55 && game.state === 'live' && Math.random() < 0.5) { const dd = Math.hypot(t.pos.x - b.pos.x, t.pos.z - b.pos.z); if (dd > 7 && dd < 28) botThrowNade(b, t); }
      b.strafeT -= dt;
      if (b.strafeT <= 0) { b.strafeT = rand(0.4, 1.3); b.strafe = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
      if (!melee && b.strafe && !b.wantCrouch && b.burst === 0 && b.cool > 0.08) { mx = Math.cos(b.yaw) * b.strafe; mz = -Math.sin(b.yaw) * b.strafe; spd = 3; }
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
    if (b.boostT > 0) { // boosting the player: walk to the spot and hold still (crouched until they are on top)
      b.boostT -= dt;
      const dx = b.boostX - b.pos.x, dz = b.boostZ - b.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.35) { mx = dx / d; mz = dz / d; spd = 4.2; b.yaw = turnToward(b.yaw, Math.atan2(dx, dz), 8 * dt); } else spd = 0;
    }
    if (bombBotBusy(b, dt)) spd = 0;
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
  const boosting = b.boostT > 0 && Math.hypot(b.boostX - b.pos.x, b.boostZ - b.pos.z) <= 0.35;
  b.crouch = clamp(b.crouch + ((boosting ? !b.boostUp : b.wantCrouch && b.target) ? 1 : -1) * dt * (boosting ? 2.5 : 6), 0, 1);
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
// ---------- Bots throw grenades: one per round (if they have one), at an enemy they have just spotted ----------
const BOT_NADES = ['he', 'he', 'flash', 'molotov'];
const giveBotNade = (b, chance) => { b.nadeKind = Math.random() < chance ? pick(BOT_NADES) : null; };
function botThrowNade(b, t) {
  const kind = b.nadeKind; b.nadeKind = null; b.cool = Math.max(b.cool, 0.8);
  const from = new V3(b.pos.x, 1.6, b.pos.z), dx = t.pos.x - from.x, dz = t.pos.z - from.z, d = Math.hypot(dx, dz);
  const T = clamp(d / 15, 0.55, 1.3), vel = new V3(dx / T, (0.1 - 1.6 + 8 * T * T) / T, dz / T); // lands at the target (gravity 16)
  const mesh = new THREE.Mesh(nadeGeo, nadeMats[kind]); mesh.castShadow = true; mesh.position.copy(from); scene.add(mesh);
  nades.push({ mesh, pos: from, vel, t: 0, owner: b, kind });
  radio(b, kind === 'flash' ? 'Flesh tashlayapman!' : kind === 'molotov' ? 'Molotov!' : 'Granata!');
}
// ---------- Radio: teammates call out what they see ----------
let radioT = -9;
function placeName(pos) {
  const c = G[wcz(pos.z)] && G[wcz(pos.z)][wcx(pos.x)];
  if (c === 'A' || c === 'B') return `${c} nuqtada`;
  if (Math.hypot(pos.x - SPAWN_C.T.x, pos.z - SPAWN_C.T.z) < 12) return 'T spawn yonida';
  if (Math.hypot(pos.x - SPAWN_C.KT.x, pos.z - SPAWN_C.KT.z) < 12) return 'KT spawn yonida';
  let best = null, bd = 1e9;
  for (const s of ['A', 'B']) for (const cell of SITES[s]) { const d = Math.hypot(cxw(cell.x) - pos.x, czw(cell.z) - pos.z); if (d < bd) { bd = d; best = s; } }
  return best && bd < 30 ? `${best} tomonda` : 'o‘rtada';
}
function radio(b, text) {
  if (b.team !== player.team || b.isPlayer || game.time - radioT < 2.5 || game.mode === 'practice') return;
  radioT = game.time;
  const box = document.getElementById('radio'), el = document.createElement('div');
  el.className = 'rd'; el.innerHTML = `<b>${b.name}:</b> ${text}`;
  box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 4500);
  if (Snd.ctx) Snd.tone(Snd.bus(0.1), Snd.ctx.currentTime, 1400, 1100, 0.06, 0.4, 'square');
}
function botBuy(b) {
  const rifle = b.team === 'T' ? WEAPONS.ak47 : WEAPONS.m4a1;
  if (!b.primary) {
    const cheap = b.team === 'T' ? WEAPONS.galil : WEAPONS.famas, scoped = b.team === 'T' ? WEAPONS.sg553 : WEAPONS.aug;
    const light = pick([WEAPONS.mp5, WEAPONS.p90, WEAPONS.nova, WEAPONS.ump45, WEAPONS.xm1014, WEAPONS.negev, b.team === 'T' ? WEAPONS.mac10 : WEAPONS.mp5]);
    if (b.money >= 5750 && Math.random() < 0.18) { b.primary = wstate(WEAPONS.awp); b.money -= 4750; }
    else if (b.money >= scoped.price + 650 && Math.random() < 0.2) { b.primary = wstate(scoped); b.money -= scoped.price; }
    else if (b.money >= rifle.price + 650 && Math.random() < 0.8) { b.primary = wstate(rifle); b.money -= rifle.price; }
    else if (b.money >= 2400 && Math.random() < 0.18) { b.primary = wstate(WEAPONS.ssg08); b.money -= 1700; }
    else if (b.money >= cheap.price + 650) { b.primary = wstate(cheap); b.money -= cheap.price; }
    else if (b.money >= light.price + 650 && Math.random() < 0.6) { b.primary = wstate(light); b.money -= light.price; }
    else if (b.money >= 700 && b.pistol.def.id !== 'deagle' && Math.random() < 0.35) { const pd = pick([WEAPONS.deagle, WEAPONS.p250, b.team === 'T' ? WEAPONS.tec9 : WEAPONS.fiveseven]); b.pistol = wstate(pd); b.money -= pd.price; }
  }
  if (b.armor < 100 && b.money >= 1000) { b.armor = 100; b.helmet = true; b.money -= 1000; }
  else if (b.armor < 100 && b.money >= 650) { b.armor = 100; b.money -= 650; }
  if (b.team === 'KT' && !b.kit && b.money >= 400 && Math.random() < 0.6) { b.kit = true; b.money -= 400; }
  for (const st of [b.primary, b.pistol]) if (st) { st.mag = st.def.mag; st.res = st.def.res; }
}
