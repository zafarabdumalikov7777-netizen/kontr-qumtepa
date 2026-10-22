'use strict';
// ---------- C4: carry, drop, plant on A/B, defuse (E), explode ----------
const BOMB_TIME = 40, PLANT_TIME = 3.2, DEFUSE_TIME = 10, DEFUSE_KIT = 5;
const bomb = { state: 'none', carrier: null, pos: new V3(), site: '', timer: 0, plantT: 0, defuser: null, defuseT: 0, beepT: 0, wasPlanted: false, mesh: null, led: null, orderT: 0 };
const ledOn = new THREE.MeshBasicMaterial({ color: 0xff2a1a }), ledOff = new THREE.MeshBasicMaterial({ color: 0x3a0806 });
function bombMesh() {
  if (bomb.mesh) return bomb.mesh;
  const g = new THREE.Group(), gun = worldGun('c4'); gun.position.y = 0.05; g.add(gun);
  bomb.led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), ledOff); bomb.led.position.set(0.05, 0.11, 0.0); g.add(bomb.led);
  g.visible = false; scene.add(g); bomb.mesh = g; return g;
}
const siteAt = pos => { const c = G[wcz(pos.z)] && G[wcz(pos.z)][wcx(pos.x)]; return c === 'A' || c === 'B' ? c : ''; };
function bombReset() {
  Object.assign(bomb, { state: 'none', carrier: null, site: '', timer: 0, plantT: 0, defuser: null, defuseT: 0, wasPlanted: false, orderT: 0 });
  bombMesh().visible = false; player.inv[5] = null; player.defusing = false;
}
function bombRoundStart() {
  bombReset();
  if (game.mode !== 'comp') return;
  const ts = agents.filter(a => a.team === 'T' && a.alive);
  if (ts.length) giveBomb(pick(ts));
}
function giveBomb(a) {
  bomb.state = 'carried'; bomb.carrier = a; bombMesh().visible = false;
  if (a.isPlayer) player.inv[5] = { def: WEAPONS.c4 };
  else { const sc = pick(SITES[game.tSite]); a.plan = [{ c: [sc.x, sc.z], hold: 6 }]; a.path = null; a.hunting = false; a.chasing = false; a.holdT = 0; }
}
function dropBomb(a) {
  if (bomb.carrier !== a || bomb.state !== 'carried') return;
  bomb.state = 'dropped'; bomb.carrier = null; bomb.plantT = 0;
  bomb.pos.set(a.pos.x, a.pos.y, a.pos.z);
  if (a.isPlayer) {
    const f = new V3(-Math.sin(a.yaw), 0, -Math.cos(a.yaw)); bomb.pos.addScaledVector(f, a.alive ? 1.2 : 0);
    player.inv[5] = null; if (player.slot === 5) { player.slot = 0; switchTo(player.inv[1] ? 1 : 2); }
  }
  const m = bombMesh(); m.position.copy(bomb.pos); m.rotation.y = rand(0, 6); m.visible = true;
}
function plantBomb(a) {
  bomb.state = 'planted'; bomb.wasPlanted = true; bomb.carrier = null; bomb.timer = BOMB_TIME; bomb.site = siteAt(a.pos); bomb.beepT = 0;
  bomb.pos.set(a.pos.x, a.pos.y, a.pos.z);
  const m = bombMesh(); m.position.copy(bomb.pos); m.rotation.y = a.isPlayer ? a.yaw : a.yaw + Math.PI; m.visible = true;
  if (a.isPlayer) { player.inv[5] = null; player.slot = 0; switchTo(player.inv[1] ? 1 : 2); }
  showCenter('Bomba qo‘yildi', `${bomb.site} nuqtasi · 40 soniya`, 'te', 2.5);
  if (Snd.ctx) Snd.chime(player.team === 'T');
  // everyone reacts: T guard the bomb, KT go to defuse
  for (const b of bots) {
    if (!b.alive) continue;
    b.plan = []; b.hunting = false; b.chasing = false; b.lastSeenT = 0; b.holdT = 0;
    const off = b.team === 'T' ? 3 : 0.2;
    setGoalWorld(b, bomb.pos.x + rand(-off, off), bomb.pos.z + rand(-off, off)); b.pendingHold = 60;
  }
}
function explodeBomb() {
  bomb.state = 'exploded'; bombMesh().visible = false;
  const p = bomb.pos;
  for (let k = 0; k < 6; k++) puff(p.x + rand(-2, 2), 1 + k * 0.8, p.z + rand(-2, 2), 6, 0.6, true);
  for (let k = 0; k < 8; k++) puff(p.x + rand(-4, 4), 2 + k, p.z + rand(-4, 4), 7, 3, false);
  emit(p.x, 0.5, p.z, 200, 0xffa53a, 22, 1.2, 6);
  const s = spatial(p); Snd.boom(1, s.pan * 0.5); Snd.boom(0.8, -s.pan * 0.5);
  shake = Math.max(shake, clamp(1 - s.d / 60, 0.1, 1) * 0.12);
  for (const a of agents) {
    if (!a.alive) continue;
    const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
    if (d < 24) applyDamage(a, null, 230 * Math.pow(1 - d / 24, 1.4), 'legs', WEAPONS.c4, p);
  }
  endRound('T', 'bomb');
}
function defuseDone() {
  bomb.state = 'defused'; bomb.defuser = null;
  if (Snd.ctx) Snd.chime(player.team === 'KT');
  endRound('KT', 'defuse');
}
// Called each frame from the bot update: returns true while the bot is busy planting/defusing (stand still)
function bombBotBusy(b, dt) {
  if (game.mode !== 'comp' || game.state !== 'live' || b.target) return false;
  if (bomb.state === 'carried' && bomb.carrier === b && siteAt(b.pos)) {
    b.plantT = (b.plantT || 0) + dt;
    if (b.plantT >= PLANT_TIME) { b.plantT = 0; plantBomb(b); }
    return true;
  }
  b.plantT = 0;
  if (bomb.state === 'planted' && b.team === 'KT' && Math.hypot(b.pos.x - bomb.pos.x, b.pos.z - bomb.pos.z) < 1.4 && (!bomb.defuser || bomb.defuser === b)) {
    bomb.defuser = b; bomb.defuseT += dt;
    if (bomb.defuseT >= (b.kit ? DEFUSE_KIT : DEFUSE_TIME)) defuseDone();
    return true;
  }
  if (bomb.defuser === b) { bomb.defuser = null; bomb.defuseT = 0; }
  return false;
}
function updateBomb(dt) {
  if (game.mode !== 'comp' || game.state !== 'live') { player.defusing = false; return; }
  const p = player;
  if (bomb.state === 'dropped') {
    for (const a of agents) if (a.alive && a.team === 'T' && Math.hypot(a.pos.x - bomb.pos.x, a.pos.z - bomb.pos.z) < 1 && Math.abs(a.pos.y - bomb.pos.y) < 1.2) { giveBomb(a); break; }
    bomb.orderT -= dt;
    if (bomb.state === 'dropped' && bomb.orderT <= 0) {
      bomb.orderT = 2.5;
      let best = null, bd = 1e9;
      for (const b of bots) if (b.alive && b.team === 'T') { const d = b.pos.distanceTo(bomb.pos); if (d < bd) { bd = d; best = b; } }
      if (best) { best.plan = []; best.hunting = false; best.chasing = false; best.holdT = 0; setGoalWorld(best, bomb.pos.x, bomb.pos.z); best.pendingHold = 0.3; }
    }
  }
  // carrier bot that wandered off goes back to a site
  if (bomb.state === 'carried' && !bomb.carrier.isPlayer) {
    const b = bomb.carrier; bomb.orderT -= dt;
    if (bomb.orderT <= 0 && !b.target && !b.chasing && !siteAt(b.pos) && (b.hunting || (!b.path && b.holdT <= 0))) { bomb.orderT = 4; giveBomb(b); }
  }
  // player planting: hold fire with C4 out, standing on a site
  p.planting = false;
  if (bomb.state === 'carried' && bomb.carrier === p && p.alive && p.slot === 5) {
    const still = Math.hypot(p.vel.x, p.vel.z) < 1.5 && p.onGround;
    if (input.mouseDown || touch.fire) {
      if (siteAt(p.pos) && still) { p.planting = true; bomb.plantT += dt; if (bomb.plantT >= PLANT_TIME) { bomb.plantT = 0; plantBomb(p); } }
      else bomb.plantT = 0;
    } else bomb.plantT = 0;
  }
  // player defusing: hold E next to the planted bomb
  p.defusing = false;
  if (bomb.state === 'planted') {
    if (p.alive && p.team === 'KT' && (input.keys.KeyE || touch.use) && p.onGround && Math.hypot(p.pos.x - bomb.pos.x, p.pos.z - bomb.pos.z) < 1.7 && (!bomb.defuser || bomb.defuser === p)) {
      p.defusing = true; bomb.defuser = p; bomb.defuseT += dt;
      if (bomb.defuseT >= (p.kit ? DEFUSE_KIT : DEFUSE_TIME)) { defuseDone(); return; }
    } else if (bomb.defuser === p) { bomb.defuser = null; bomb.defuseT = 0; }
    if (bomb.defuser && !bomb.defuser.alive) { bomb.defuser = null; bomb.defuseT = 0; }
    bomb.orderT -= dt;
    if (bomb.orderT <= 0) { // KT bots that got distracted head back to the bomb
      bomb.orderT = 3;
      for (const b of bots) if (b.alive && b.team === 'KT' && !b.target && !b.chasing && Math.hypot(b.pos.x - bomb.pos.x, b.pos.z - bomb.pos.z) > 1.4 && (b.hunting || !b.path)) {
        b.hunting = false; b.plan = []; setGoalWorld(b, bomb.pos.x, bomb.pos.z); b.pendingHold = 60;
      }
    }
    bomb.timer -= dt; bomb.beepT -= dt;
    if (bomb.beepT <= 0) {
      bomb.beepT = 0.12 + 0.88 * (bomb.timer / BOMB_TIME);
      bomb.led.material = ledOn; setTimeout(() => { if (bomb.led) bomb.led.material = ledOff; }, 90);
      const s = spatial(bomb.pos); if (Snd.ctx) Snd.tone(Snd.bus(Math.min(0.5, s.vol), s.pan), Snd.ctx.currentTime, 2900, 2900, 0.08, 0.6, 'square');
    }
    if (bomb.timer <= 0) explodeBomb();
  }
}
// Progress bar + hint text for the HUD
function bombHud() {
  const p = player;
  if (bomb.state === 'planted' && bomb.defuser === p) return { label: p.kit ? 'Zararsizlantirilmoqda (kit bilan)' : 'Zararsizlantirilmoqda', k: bomb.defuseT / (p.kit ? DEFUSE_KIT : DEFUSE_TIME) };
  if (p.planting) return { label: 'Bomba qo‘yilmoqda', k: bomb.plantT / PLANT_TIME };
  return null;
}
function bombHint() {
  const p = player; if (!p.alive || game.mode !== 'comp') return '';
  if (bomb.state === 'carried' && bomb.carrier === p) return siteAt(p.pos) ? (p.slot === 5 ? 'Sichqonchani bosib turing — bomba qo‘yiladi' : '5 — bombani oling, keyin sichqonchani bosib turing') : 'Bomba sizda — A yoki B nuqtasiga olib boring';
  if (bomb.state === 'planted' && p.team === 'KT' && !p.defusing && Math.hypot(p.pos.x - bomb.pos.x, p.pos.z - bomb.pos.z) < 1.7) return 'E ni bosib turing — bombani zararsizlantirish';
  return '';
}
