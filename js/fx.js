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
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
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
  shot(kind, vol = 1, pan = 0) {
    if (!this.ctx) return;
    const P = SHOT[kind] || SHOT.pistol, t = this.ctx.currentTime, out = this.bus(vol, pan), far = vol < 0.35;
    this.noiseHit(out, t, P.d, far ? P.f * 0.45 : P.f, 'lowpass', 0.7, 1);
    this.noiseHit(out, t, P.d * 0.35, far ? 900 : 5200, 'bandpass', 1.2, 0.45);
    this.tone(out, t, P.th, P.th * 0.35, P.d * 0.8, P.tv);
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
for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), decalMat); m.visible = false; scene.add(m); decals.push(m); }
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
function updateFx(dt) {
  updateParts(dt);
  for (const tr of tracers) { if (tr.t > 0) { tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / 0.07) * 0.8; } }
  for (const p of puffs) {
    if (!p.s.visible) continue; p.t -= dt;
    if (p.t <= 0) { p.s.visible = false; continue; }
    const k = 1 - p.t / p.max, sc = p.base * (1 + k * p.grow);
    p.s.scale.set(sc, sc, sc); p.s.material.opacity = (1 - k) * 0.9; p.s.position.y += dt * 0.6;
  }
}
function clearFx() {
  parts.length = 0; decals.forEach(d => d.visible = false); puffs.forEach(p => p.s.visible = false); tracers.forEach(t => { t.t = 0; t.l.material.opacity = 0; });
}

// ---------- First-person viewmodel ----------
// [x, y, z, yaw] of the grip in front of the camera
const VM_POS = { rifle: [0.15, -0.155, -0.47, 0], pistol: [0.135, -0.125, -0.42, 0.02], knife: [0.14, -0.13, -0.36, 0.22], he: [0.13, -0.11, -0.34, 0] };
const VM_KIND = { ak: 'rifle', m4: 'rifle', awp: 'rifle', smg: 'rifle', pistol: 'pistol', usp: 'pistol', deagle: 'pistol', knife: 'knife', he: 'he', smoke: 'he', flash: 'he', c4: 'he' };
const flashMat = new THREE.SpriteMaterial({ map: texFlash, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const vmFlash = new THREE.Sprite(flashMat); vmFlash.scale.set(0.22, 0.22, 0.22); vmFlash.visible = false;
const vm = {
  root: new THREE.Group(), cur: null, kind: 'pistol', cache: {}, kick: 0, bob: 0, swayX: 0, swayY: 0, swing: 0, flashT: 0,
  set(def, team) {
    const key = def.model + '_' + team;
    if (this.cur) this.root.remove(this.cur);
    let m = this.cache[key]; if (!m) { m = buildGun(def.model, team); this.cache[key] = m; }
    this.cur = m; this.root.add(m); m.userData.muzzle.add(vmFlash); this.kind = VM_KIND[def.model] || 'rifle';
  },
  fire(power = 1) { this.kick = power; this.kickY = (Math.random() - 0.5) * 0.06 * power; vmFlash.visible = this.kind !== 'knife' && this.kind !== 'he'; vmFlash.material.rotation = Math.random() * 6; this.flashT = 0.045; }
};
vScene.add(vm.root);
