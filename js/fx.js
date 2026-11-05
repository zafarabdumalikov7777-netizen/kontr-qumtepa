'use strict';
// ---------- Sound (synthesised with WebAudio) ----------
const Snd = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        this.ctx = new C();
        const comp = this.ctx.createDynamicsCompressor(); comp.connect(this.ctx.destination);
        this.master = this.ctx.createGain(); this.master.gain.value = settings.volume * 0.7; this.master.connect(comp);
        const len = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
        // room: a convolution reverb (synthetic impulse response) and a slap-back echo off distant walls
        this.verb = this.ctx.createConvolver(); this.verbOut = this.ctx.createGain(); this.verb.connect(this.verbOut); this.verbOut.connect(this.master);
        this.echo = this.ctx.createDelay(1); const fb = this.ctx.createGain(), elp = this.ctx.createBiquadFilter();
        elp.type = 'lowpass'; elp.frequency.value = 1400; fb.gain.value = 0.28;
        this.echo.connect(elp); elp.connect(fb); fb.connect(this.echo); this.echoOut = this.ctx.createGain(); elp.connect(this.echoOut); this.echoOut.connect(this.master);
        // soft clipping gives near shots their punch
        this.clip = this.ctx.createWaveShaper(); const curve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.4 * x) / Math.tanh(2.4); }
        this.clip.curve = curve; this.clip.connect(this.master);
        this.setRoom();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  // Outdoor maps ring with a long thin tail and a clear echo; the warehouse map is a boomy room
  setRoom() {
    if (!this.ctx) return;
    const indoor = MAP && MAP.roofs, len = indoor ? 1.6 : 2.4, sr = this.ctx.sampleRate, ir = this.ctx.createBuffer(2, Math.floor(sr * len), sr);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / len, indoor ? 2.2 : 3.4) * (t < 0.012 ? t / 0.012 : 1); } }
    this.verb.buffer = ir; this.verbOut.gain.value = indoor ? 0.55 : 0.32;
    this.echo.delayTime.value = indoor ? 0.07 : 0.21; this.echoOut.gain.value = indoor ? 0.08 : 0.2;
  },
  bus(vol, pan) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan || 0, -1, 1); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    return g;
  },
  noiseHit(out, t, dur, f, type, q, v) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = f; fl.Q.value = q || 0.8;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  tone(out, t, f0, f1, dur, v, type) {
    const c = this.ctx, o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  },
  // A gunshot in layers: supersonic crack, muzzle blast body, low boom, action clack, then room reverb + echo
  shot(kind, vol = 1, pan = 0) {
    if (!this.ctx) return;
    const c = this.ctx, P = SHOT[kind] || SHOT.pistol, t = c.currentTime, far = vol < 0.35, near = vol > 0.7;
    const out = c.createGain(); out.gain.value = vol;
    const pn = c.createStereoPanner ? c.createStereoPanner() : null; if (pn) { pn.pan.value = clamp(pan, -1, 1); out.connect(pn); }
    const dry = pn || out;
    dry.connect(near ? this.clip : this.master);
    const send = c.createGain(); send.gain.value = far ? 1.1 : 0.55; dry.connect(send); send.connect(this.verb); send.connect(this.echo);
    if (!far) this.noiseHit(out, t, 0.018, 6500, 'highpass', 0.7, 0.9);                       // crack
    this.noiseHit(out, t, P.d, far ? P.f * 0.4 : P.f, 'lowpass', 0.8, 1.1);                    // blast body
    this.noiseHit(out, t + 0.004, P.d * 1.6, far ? 380 : 650, 'lowpass', 0.6, 0.7);            // pressure thump
    this.tone(out, t, P.th, P.th * 0.32, P.d * 0.9, P.tv);                                      // low boom
    if (P.d > 0.15) this.tone(out, t, 55, 38, 0.32, P.tv * 0.6);
    if (!far) this.noiseHit(out, t + 0.045, 0.03, 2800, 'bandpass', 3, 0.22);                 // bolt clack
  },
  tink(vol, pan) { // brass casing hitting the floor
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(vol, pan);
    this.tone(o, t, 4700 + Math.random() * 600, 4500, 0.09, 0.35, 'triangle'); this.tone(o, t + 0.005, 7300 + Math.random() * 800, 7000, 0.05, 0.18, 'sine');
  },
  whiz(pan) { // an enemy bullet passing close to your head
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.55, pan);
    this.noiseHit(o, t, 0.09, 3800, 'bandpass', 4, 0.9); this.noiseHit(o, t, 0.02, 7000, 'highpass', 0.7, 0.6);
  },
  dry() { if (!this.ctx) return; this.tone(this.bus(0.4), this.ctx.currentTime, 1900, 1700, 0.03, 0.6, 'square'); },
  reload() {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.5);
    this.noiseHit(o, t + 0.15, 0.05, 3200, 'bandpass', 2, 1); this.noiseHit(o, t + 0.9, 0.06, 2600, 'bandpass', 2, 1); this.tone(o, t + 0.9, 900, 600, 0.05, 0.4, 'square');
  },
  draw() { if (!this.ctx) return; this.noiseHit(this.bus(0.35), this.ctx.currentTime, 0.08, 4200, 'bandpass', 1.5, 0.8); },
  knife() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.5); this.noiseHit(o, t, 0.16, 2500, 'highpass', 0.6, 0.7); },
  hit(head) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.45);
    if (head) { this.tone(o, t, 2600, 2400, 0.22, 0.4, 'triangle'); this.tone(o, t, 5300, 5000, 0.12, 0.15, 'sine'); }
    else this.tone(o, t, 240, 120, 0.06, 0.6, 'sine');
  },
  hurt() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.6); this.tone(o, t, 140, 60, 0.18, 0.8); this.noiseHit(o, t, 0.1, 700, 'lowpass', 1, 0.6); },
  step(vol, pan) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(vol, pan), f = MAP ? MAP.theme.stepF : 520;
    this.noiseHit(o, t, f < 450 ? 0.12 : 0.07, f, 'lowpass', 1, 0.9); this.noiseHit(o, t, 0.03, f * 4.5, 'bandpass', 1, f > 1000 ? 0.35 : 0.15);
  },
  // Looping wind bed; level follows the map
  ambient(level) {
    if (!this.ctx) return;
    if (!this.wind) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency);
      this.wind = c.createGain(); this.wind.gain.value = 0; s.connect(f); f.connect(this.wind); this.wind.connect(this.master); s.start(); lfo.start();
    }
    this.wind.gain.setTargetAtTime(level, this.ctx.currentTime, 0.8);
  },
  boom(vol, pan) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(vol, pan);
    this.noiseHit(o, t, 1.4, 900, 'lowpass', 0.6, 1.3); this.tone(o, t, 75, 28, 0.9, 1.3); this.noiseHit(o, t, 0.25, 3000, 'bandpass', 0.8, 0.5);
  },
  buy() { if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.3); this.tone(o, t, 1200, 1800, 0.08, 0.5, 'triangle'); this.tone(o, t + 0.07, 1800, 1800, 0.12, 0.4, 'triangle'); },
  chime(up) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.bus(0.35);
    (up ? [523, 659, 784] : [523, 440, 349]).forEach((f, i) => this.tone(o, t + i * 0.12, f, f, 0.25, 0.5, 'triangle'));
  }
};
function spatial(pos) {
  const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z, d = Math.hypot(dx, dz) + 0.001;
  const rx = Math.cos(camera.rotation.y), rz = -Math.sin(camera.rotation.y);
  return { vol: clamp(1 / (1 + d * 0.07), 0.04, 1), pan: clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8, d };
}

// ---------- Particles ----------
const PMAX = 500;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false }));
points.frustumCulled = false; scene.add(points);
const parts = [];
function emit(x, y, z, n, col, spd, life, grav = 9, nx = 0, ny = 1, nz = 0) {
  const c = lin(col);
  for (let i = 0; i < n; i++) {
    if (parts.length >= PMAX) parts.shift();
    parts.push({ x, y, z, vx: (Math.random() - 0.5) * spd + nx * spd * 0.6, vy: (Math.random() - 0.3) * spd + ny * spd * 0.6, vz: (Math.random() - 0.5) * spd + nz * spd * 0.6, life: life * rand(0.6, 1.2), r: c.r, g: c.g, b: c.b, grav });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
    pCol[i * 3] = p.r; pCol[i * 3 + 1] = p.g; pCol[i * 3 + 2] = p.b;
  }
  pGeo.setDrawRange(0, parts.length);
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}

// ---------- Tracers, bullet holes, smoke ----------
const tracers = [];
for (let i = 0; i < 24; i++) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0, depthWrite: false }));
  l.frustumCulled = false; scene.add(l); tracers.push({ l, t: 0 });
}
let tracerIdx = 0;
function tracer(a, b) {
  const tr = tracers[tracerIdx++ % tracers.length], arr = tr.l.geometry.attributes.position.array;
  arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
  tr.l.geometry.attributes.position.needsUpdate = true; tr.t = 0.07;
}
const decals = [];
const decalMat = new THREE.MeshBasicMaterial({ map: texHole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
for (let i = 0; i < 180; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), decalMat); m.visible = false; scene.add(m); decals.push(m); }
let decalIdx = 0;
const _look = new V3();
function addDecal(p, n) {
  const m = decals[decalIdx++ % decals.length];
  m.position.copy(p).addScaledVector(n, 0.01); _look.copy(m.position).add(n); m.lookAt(_look); m.rotation.z = Math.random() * 6; m.visible = true;
}
const puffs = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texSmoke, transparent: true, depthWrite: false, opacity: 0 }));
  s.visible = false; scene.add(s); puffs.push({ s, t: 0, max: 1, grow: 1 });
}
let puffIdx = 0;
function puff(x, y, z, size, life, fire) {
  const p = puffs[puffIdx++ % puffs.length];
  p.s.material.map = fire ? texFire : texSmoke; p.s.material.blending = fire ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.s.position.set(x, y, z); p.s.scale.set(size, size, size); p.s.visible = true; p.t = life; p.max = life; p.grow = fire ? 3 : 1.4; p.base = size;
}
// ---------- Ejected brass ----------
const shellMat = new THREE.MeshStandardMaterial({ color: lin(0xd6a64a), metalness: 0.9, roughness: 0.28 });
const shellGeo = { rifle: new THREE.CylinderGeometry(0.0055, 0.0055, 0.034, 8), pistol: new THREE.CylinderGeometry(0.0055, 0.0055, 0.02, 8) };
const shells = [];
for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(shellGeo.rifle, shellMat); m.visible = false; m.castShadow = true; scene.add(m); shells.push({ m, v: new V3(), w: new V3(), t: 0, bounced: 0 }); }
let shellIdx = 0;
const _sr = new V3(), _su = new V3(), _sf = new V3();
// Casings fly out of the ejection port to the right, spin, bounce on the floor and lie there a moment
function ejectShell(pistol) {
  const s = shells[shellIdx++ % shells.length];
  s.m.geometry = pistol ? shellGeo.pistol : shellGeo.rifle;
  s.m.position.copy(camera.localToWorld(_sf.set(settings.hand === 'left' ? -0.12 : 0.12, -0.08, -0.45)));
  _sr.set(1, 0, 0).applyQuaternion(camera.quaternion); _su.set(0, 1, 0).applyQuaternion(camera.quaternion); camera.getWorldDirection(_sf);
  const side = settings.hand === 'left' ? -1 : 1;
  s.v.copy(_sr).multiplyScalar(side * rand(2.2, 3.2)).addScaledVector(_su, rand(1.3, 2.2)).addScaledVector(_sf, rand(-0.6, 0.2)).add(player.vel);
  s.w.set(rand(-25, 25), rand(-25, 25), rand(-25, 25));
  s.t = 3; s.bounced = 0; s.floor = player.pos.y; s.m.visible = true;
}
function updateShells(dt) {
  for (const s of shells) {
    if (s.t <= 0) continue;
    s.t -= dt; if (s.t <= 0) { s.m.visible = false; continue; }
    if (s.bounced > 3) continue; // resting
    s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt);
    s.m.rotation.x += s.w.x * dt; s.m.rotation.y += s.w.y * dt; s.m.rotation.z += s.w.z * dt;
    if (s.m.position.y < s.floor + 0.006) {
      s.m.position.y = s.floor + 0.006; s.v.y = -s.v.y * 0.35; s.v.x *= 0.55; s.v.z *= 0.55; s.w.multiplyScalar(0.5); s.bounced++;
      if (s.bounced === 1) { const sp = spatial(s.m.position); Snd.tink(Math.min(0.35, sp.vol * 0.5), sp.pan); }
      if (s.bounced > 3) { s.m.rotation.set(Math.PI / 2, s.m.rotation.y, 0); }
    }
  }
}
function updateFx(dt) {
  updateParts(dt);
  updateShells(dt);
  for (const tr of tracers) { if (tr.t > 0) { tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / 0.07) * 0.8; } }
  for (const p of puffs) {
    if (!p.s.visible) continue; p.t -= dt;
    if (p.t <= 0) { p.s.visible = false; continue; }
    const k = 1 - p.t / p.max, sc = p.base * (1 + k * p.grow);
    p.s.scale.set(sc, sc, sc); p.s.material.opacity = (1 - k) * 0.9; p.s.position.y += dt * 0.6;
  }
}
function clearFx() {
  parts.length = 0; shells.forEach(s => { s.t = 0; s.m.visible = false; }); decals.forEach(d => d.visible = false); puffs.forEach(p => p.s.visible = false); tracers.forEach(t => { t.t = 0; t.l.material.opacity = 0; });
}

// ---------- First-person viewmodel ----------
// [x, y, z, yaw] of the grip in front of the camera
const VM_POS = { rifle: [0.15, -0.155, -0.47, 0], pistol: [0.135, -0.125, -0.42, 0.02], knife: [0.14, -0.13, -0.36, 0.22], he: [0.13, -0.11, -0.34, 0] };
const VM_KIND = { ak: 'rifle', m4: 'rifle', awp: 'rifle', smg: 'rifle', pistol: 'pistol', usp: 'pistol', deagle: 'pistol', knife: 'knife', he: 'he', smoke: 'he', flash: 'he', c4: 'he' };
const flashMat = new THREE.SpriteMaterial({ map: texFlash, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const vmFlash = new THREE.Sprite(flashMat); vmFlash.scale.set(0.22, 0.22, 0.22); vmFlash.visible = false;
const vm = {
  root: new THREE.Group(), cur: null, kind: 'pistol', cache: {}, kick: 0, kv: 0, bob: 0, swayX: 0, swayY: 0, swing: 0, flashT: 0,
  set(def, team) {
    const skin = equippedSkin(def.id), agent = equippedAgent(team);
    const key = def.model + '_' + team + '_' + (skin || '') + '_' + (agent ? agent.id : '');
    if (this.cur) this.root.remove(this.cur);
    let m = this.cache[key]; if (!m) { m = buildGun(def.model, team, skin, agent); this.cache[key] = m; }
    this.cur = m; this.root.add(m); m.userData.muzzle.add(vmFlash); this.kind = VM_KIND[def.model] || 'rifle';
  },
  // the weapon is kicked like a spring: it snaps back, overshoots a little and settles
  fire(power = 1) { this.kv += 30 * power; this.kickY = (Math.random() - 0.5) * 0.06 * power; vmFlash.visible = this.kind !== 'knife' && this.kind !== 'he'; vmFlash.material.rotation = Math.random() * 6; this.flashT = 0.045; }
};
vScene.add(vm.root);
