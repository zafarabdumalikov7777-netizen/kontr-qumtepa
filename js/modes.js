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
// ---------- Practice range: face a wall ~11 m away and hang a white target board on it ----------
let practiceBoard = null;
function removePracticeBoard() {
  if (!practiceBoard) return;
  worldGroup.remove(practiceBoard); const i = worldMeshes.indexOf(practiceBoard); if (i >= 0) worldMeshes.splice(i, 1);
  practiceBoard.geometry.dispose(); practiceBoard.material.map.dispose(); practiceBoard.material.dispose(); practiceBoard = null;
}
function setupPractice() {
  removePracticeBoard();
  const p = player; let best = null;
  for (let i = 0; i < 72; i++) {
    const yaw = i / 72 * Math.PI * 2, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let d = 0.5, pcx = wcx(p.pos.x), pcz = wcz(p.pos.z), axis = '';
    while (d < 40) {
      const x = p.pos.x + fx * d, z = p.pos.z + fz * d, cx = wcx(x), cz = wcz(z);
      const c = G[cz] && G[cz][cx];
      if (c === undefined || c === '#' || c === 'C') { axis = cx !== pcx ? 'x' : 'z'; break; }
      pcx = cx; pcz = cz; d += 0.05;
    }
    if (d > 6 && d < 40) {
      // prefer facing the wall squarely, and the whole 3.4 m board must land on solid wall
      const square = axis === 'x' ? Math.abs(fx) : Math.abs(fz);
      const hx = p.pos.x + fx * d, hz = p.pos.z + fz * d, tx = axis === 'x' ? 0 : 1, tz = axis === 'x' ? 1 : 0;
      const into = (x, z) => { const c = G[wcz(z)] && G[wcz(z)][wcx(x)]; return c === '#'; };
      const fits = [-1.8, 1.8].every(o => into(hx + tx * o + fx * 0.15, hz + tz * o + fz * 0.15));
      const score = Math.abs(d - 11) + 10 * (1 - square) + (fits ? 0 : 100);
      if (!best || score < best.score) best = { yaw, d, score, fx, fz, axis };
    }
  }
  if (!best) return;
  p.yaw = best.yaw; p.pitch = 0;
  const tex = canvasTex(512, (g, s) => {
    g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(60,60,70,0.18)'; g.lineWidth = 1;
    for (let k = 0; k <= s; k += s / 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, s); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(s, k); g.stroke(); }
    g.strokeStyle = 'rgba(200,40,30,0.8)'; g.lineWidth = 3;
    for (const r of [24, 64, 120]) { g.beginPath(); g.arc(s / 2, s * 0.62, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#c8281e'; g.beginPath(); g.arc(s / 2, s * 0.62, 7, 0, Math.PI * 2); g.fill();
  }, { repeat: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), std({ map: tex, roughness: 0.95 }));
  const hx = p.pos.x + best.fx * (best.d - 0.04), hz = p.pos.z + best.fz * (best.d - 0.04);
  // hang it flat on the wall: its normal points back along the axis the ray crossed
  const nx = best.axis === 'x' ? -Math.sign(best.fx) : 0, nz = best.axis === 'z' ? -Math.sign(best.fz) : 0;
  m.position.set(hx + nx * 0.07, 1.65 + 0.46, hz + nz * 0.07); m.rotation.y = Math.atan2(nx, nz); m.receiveShadow = true;
  worldGroup.add(m); worldMeshes.push(m); practiceBoard = m;
}
function dmTick(dt) {
  for (const a of agents) if (!a.alive && a.respawnT > 0) { a.respawnT -= dt; if (a.respawnT <= 0) dmRespawn(a); }
}
function dmKill(v, att) {
  v.respawnT = DM_RESPAWN;
  if (att && att !== v) game.score[att.team]++;
}
