'use strict';
// ---------- Dropped weapons: fall from a dead player's hands, can be picked up (E) or swapped ----------
const drops = [];
let pickTarget = null;
function dropWeapon(st, pos, yaw, toss) {
  if (!st || !st.def || st.def.melee || st.def.id === 'he') return;
  const holder = new THREE.Group(), gun = worldGun(st.def.model);
  gun.rotation.z = Math.PI / 2; holder.add(gun); // lie on its side
  holder.position.set(pos.x, (pos.y || 0) + 1.15, pos.z); holder.rotation.y = yaw + rand(-0.7, 0.7);
  scene.add(holder);
  drops.push({ st, mesh: holder, vy: 1, vx: toss ? toss.x : rand(-0.6, 0.6), vz: toss ? toss.z : rand(-0.6, 0.6), floor: pos.y || 0, settled: false });
}
function removeDrop(d) { scene.remove(d.mesh); drops.splice(drops.indexOf(d), 1); if (pickTarget === d) pickTarget = null; }
function clearDrops() { while (drops.length) removeDrop(drops[0]); }
// The weapon a dead soldier was holding leaves their hands
function dropOnDeath(a) {
  if (a.isPlayer) {
    const slot = a.inv[1] ? 1 : a.inv[2] ? 2 : 0;
    if (slot) { dropWeapon(a.inv[slot], a.pos, a.yaw); a.inv[slot] = null; }
    if (playerBody) hideSoldierGun(playerBody);
  } else {
    const st = a.primary || a.pistol;
    dropWeapon(st, a.pos, a.yaw);
    if (a.primary) a.primary = null; else a.pistol = null;
    hideSoldierGun(a.model);
  }
}
function hideSoldierGun(m) { if (m.gun) m.upper.remove(m.gun); m.gun = null; m.gunKind = ''; }
function pickUp(d) {
  const p = player, st = d.st, slot = st.def.slot, cur = p.inv[slot], prev = p.slot;
  removeDrop(d);
  if (cur) { const f = new V3(-Math.sin(p.yaw) * 2.5, 0, -Math.cos(p.yaw) * 2.5); dropWeapon(cur, p.pos, p.yaw, f); }
  p.inv[slot] = st; p.slot = 0; switchTo(slot); p.prevSlot = prev === slot ? 3 : prev;
}
function pickupTarget() { if (pickTarget && player.alive) pickUp(pickTarget); }
function dropCurrent() {
  const p = player; if (!p.alive || (p.slot !== 1 && p.slot !== 2) || !p.inv[p.slot]) return;
  const f = new V3(-Math.sin(p.yaw) * 3, 0, -Math.cos(p.yaw) * 3);
  dropWeapon(p.inv[p.slot], p.pos, p.yaw, f); p.inv[p.slot] = null;
  const next = p.inv[1] ? 1 : p.inv[2] ? 2 : 3; p.slot = 0; switchTo(next);
}
function updateDrops(dt) {
  for (const d of drops) {
    if (d.settled) continue;
    d.vy -= 14 * dt;
    const m = d.mesh.position;
    m.x += d.vx * dt; m.z += d.vz * dt; m.y += d.vy * dt;
    if (hitBox(m.x, m.y, m.z, 0.15, 0.1)) { m.x -= d.vx * dt; m.z -= d.vz * dt; d.vx = d.vz = 0; }
    if (m.y <= d.floor + 0.035) { m.y = d.floor + 0.035; d.settled = true; }
  }
  // bots without a rifle grab one they walk over
  for (const b of bots) {
    if (!b.alive || b.primary) continue;
    for (const d of drops) if (d.settled && d.st.def.slot === 1 && Math.hypot(d.mesh.position.x - b.pos.x, d.mesh.position.z - b.pos.z) < 1.1) { b.primary = d.st; removeDrop(d); break; }
  }
  pickTarget = null;
  const p = player; if (!p.alive || game.state === 'menu') return;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  let best = 1e9;
  for (const d of drops) {
    if (!d.settled) continue;
    const dx = d.mesh.position.x - p.pos.x, dz = d.mesh.position.z - p.pos.z, dist = Math.hypot(dx, dz);
    if (Math.abs(d.mesh.position.y - p.pos.y) > 1.2) continue;
    // walking over a weapon whose slot is empty picks it up, like CS
    if (dist < 0.9 && !p.inv[d.st.def.slot]) { pickUp(d); return; }
    if (dist < 2.2 && (dist < 1 || (dx * fx + dz * fz) / dist > 0.55) && dist < best) { best = dist; pickTarget = d; }
  }
}
