'use strict';
// ---------- Deathmatch: instant respawns, free weapons, timed match ----------
const DM_TIME = 360, DM_RESPAWN = 2.5;
const dmRifle = team => team === 'T' ? WEAPONS.ak47 : WEAPONS.m4a1;
let dmCells = null;
function dmLoadout(a) {
  a.armor = 100; a.helmet = true;
  if (a.isPlayer) {
    a.inv = { 1: wstate(player.dmPrimary || dmRifle(a.team)), 2: wstate(player.dmPistol || pistolFor(a.team)), 3: { def: WEAPONS.knife }, 4: null, 5: null };
    a.nades = { he: 1, flash: 1, smoke: 0 }; syncNadeSlot();
  } else {
    const r = Math.random();
    a.primary = wstate(r < 0.12 ? WEAPONS.awp : r < 0.25 ? WEAPONS.mp5 : dmRifle(a.team));
    a.pistol = wstate(Math.random() < 0.3 ? WEAPONS.deagle : pistolFor(a.team));
  }
}
// Pick the sampled floor cell farthest from living enemies
function dmSpawnPoint(a) {
  if (!dmCells) { dmCells = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (walkable(x, z)) dmCells.push({ x, z }); }
  let best = null, bs = -1;
  for (let i = 0; i < 40; i++) {
    const c = pick(dmCells), x = cxw(c.x), z = czw(c.z); let md = 1e9;
    for (const e of agents) if (e.alive && e.team !== a.team) md = Math.min(md, Math.hypot(e.pos.x - x, e.pos.z - z));
    if (md > bs) { bs = md; best = { x, z }; }
    if (md > 30) break;
  }
  return best;
}
function resetBotModel(a) {
  const m = a.model;
  m.group.rotation.x = 0; m.group.position.y = 0; m.fall = 1; m.group.visible = true; m.marker.visible = a.team === player.team; m.flash.visible = false;
  Object.assign(a, { crouch: 0, wantCrouch: false, target: null, path: null, holdT: 0, pendingHold: 0, lastSeenT: 0, chasing: false, hunting: false, cool: 0, burst: 0, reloadT: 0, noticeAgent: null, moveSpeed: 0, blindUntil: 0, plan: [], plantT: 0 });
  m.group.position.set(a.pos.x, 0, a.pos.z); m.group.rotation.y = a.yaw;
}
function dmRespawn(a) {
  const s = dmSpawnPoint(a);
  a.alive = true; a.hp = 100; a.spotUntil = 0; a.protectUntil = game.time + 1.5; a.respawnT = 0;
  a.pos.set(s.x + rand(-0.5, 0.5), 0, s.z + rand(-0.5, 0.5)); a.yaw = rand(0, Math.PI * 2);
  dmLoadout(a);
  if (a.isPlayer) {
    Object.assign(a, { pitch: 0, crouch: 0, reloadT: 0, switchT: 0, shots: 0, shotsF: 0, punchP: 0, punchY: 0, vpP: 0, vpY: 0, hops: 0, groundT: 0, scope: 0, scopeResume: 0, rescopeT: 0, cool: 0, deathT: 0, autoReload: false });
    a.vel.set(0, 0, 0); a.slot = 1; a.prevSlot = 2; vm.set(a.inv[1].def, a.team);
    if (playerBody) { setGhost(playerBody, true); playerBody.fall = 1; playerBody.group.rotation.x = 0; }
    setSpectate(null);
  } else resetBotModel(a);
  updatePips();
}
function dmTick(dt) {
  for (const a of agents) if (!a.alive && a.respawnT > 0) { a.respawnT -= dt; if (a.respawnT <= 0) dmRespawn(a); }
}
function dmKill(v, att) {
  v.respawnT = DM_RESPAWN;
  if (att && att !== v) game.score[att.team]++;
}
