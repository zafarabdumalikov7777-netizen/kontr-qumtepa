'use strict';
// ---------- Smoke and flash grenades ----------
function startSmoke(pos) {
  const g = new THREE.Group();
  const mat = new THREE.SpriteMaterial({ map: texSmoke, color: lin(0xeae6df), transparent: true, depthWrite: false, opacity: 0 });
  for (let i = 0; i < 20; i++) {
    const s = new THREE.Sprite(mat), a = Math.random() * Math.PI * 2, r = Math.random() * 2.3, h = Math.random() * 2.6;
    s.position.set(Math.cos(a) * r, 0.7 + h, Math.sin(a) * r);
    const sc = 3 + Math.random() * 2.4; s.scale.set(sc, sc, sc); s.material.rotation = Math.random() * 6; g.add(s);
  }
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  smokes.push({ x: pos.x, y: 1.6, z: pos.z, r: 0, t: 0, life: 18, g, mat });
  const s = spatial(pos);
  if (Snd.ctx) Snd.noiseHit(Snd.bus(s.vol, s.pan), Snd.ctx.currentTime, 2.4, 1600, 'bandpass', 0.5, 0.6);
}
function updateSmokes(dt) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i]; s.t += dt;
    const bloom = Math.min(1, s.t / 1.3), fade = clamp((s.life - s.t) / 2.5, 0, 1);
    s.r = 3.3 * bloom * fade; s.mat.opacity = 0.95 * Math.min(1, bloom * 1.4) * fade; s.g.rotation.y += dt * 0.03;
    if (s.t >= s.life) { scene.remove(s.g); s.mat.dispose(); smokes.splice(i, 1); }
  }
}
let flashAmt = 0, flashHold = 0;
const _fd = new V3(), _ft = new V3();
function flashBang(pos) {
  puff(pos.x, pos.y, pos.z, 2.2, 0.12, true);
  emit(pos.x, pos.y, pos.z, 30, 0xffffff, 8, 0.25, 4);
  const s = spatial(pos);
  if (Snd.ctx) { const o = Snd.bus(Math.min(1, s.vol * 1.5), s.pan), t = Snd.ctx.currentTime; Snd.noiseHit(o, t, 0.35, 3500, 'highpass', 0.7, 1.2); Snd.tone(o, t, 180, 60, 0.3, 0.9); }
  if (player.alive) {
    const e = camera.position, d = e.distanceTo(pos);
    if (d < 32 && losClear(pos.x, pos.y + 0.1, pos.z, e.x, e.y, e.z)) {
      camera.getWorldDirection(_fd); _ft.copy(pos).sub(e).normalize();
      const dot = _fd.dot(_ft), face = dot > 0.5 ? 1 : dot > -0.1 ? 0.55 : 0.2;
      const dur = (0.4 + 3.6 * face) * (1 - d / 36);
      if (dur > flashHold) { flashHold = dur; flashAmt = 1; }
      if (face > 0.5 && Snd.ctx) Snd.tone(Snd.bus(0.12), Snd.ctx.currentTime, 3200, 3100, dur + 0.5, 0.5);
    }
  }
  for (const b of bots) {
    if (!b.alive) continue;
    const by = agentEye(b), d = Math.hypot(b.pos.x - pos.x, by - pos.y, b.pos.z - pos.z);
    if (d > 32 || !losClear(pos.x, pos.y + 0.1, pos.z, b.pos.x, by, b.pos.z)) continue;
    const dot = (Math.sin(b.yaw) * (pos.x - b.pos.x) + Math.cos(b.yaw) * (pos.z - b.pos.z)) / (Math.hypot(pos.x - b.pos.x, pos.z - b.pos.z) || 1);
    const dur = (0.3 + 3.2 * (dot > 0.4 ? 1 : dot > -0.2 ? 0.5 : 0.15)) * (1 - d / 36);
    b.blindUntil = Math.max(b.blindUntil || 0, game.time + dur);
    if (dur > 1) b.target = null;
  }
}
function updateFlash(dt) {
  if (flashHold > 0) flashHold -= dt; else flashAmt = Math.max(0, flashAmt - dt * 0.9);
  els.flashO.style.opacity = String(flashAmt);
}
function clearUtility() {
  while (smokes.length) { const s = smokes.pop(); scene.remove(s.g); s.mat.dispose(); }
  flashAmt = flashHold = 0;
}
