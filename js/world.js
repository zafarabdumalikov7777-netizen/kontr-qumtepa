'use strict';
// ---------- World construction ----------
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const std = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
let skyMesh = null, snowPts = null;

function boxGeo(w, h, d, ts, hs = 1) {
  const g = new THREE.BoxGeometry(w, h, d, 1, hs, 1), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const du = ax > 0.5 ? d : w, dv = ay > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * du / ts, uv.getY(i) * dv / ts);
  }
  return g;
}
// Darken the base of walls (cheap ambient occlusion baked into vertex colours)
function aoColors(g, h) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + h / 2) / h, k = 0.5 + 0.5 * Math.min(1, t * 2.2);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const add = (m, opts = {}) => {
  if (opts.cast !== false) m.castShadow = true;
  if (opts.receive !== false) m.receiveShadow = true;
  worldGroup.add(m); if (opts.hit) worldMeshes.push(m); return m;
};

function clearWorld() {
  worldGroup.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map && !m.map.keep) m.map.dispose(); m.dispose(); }); }
  });
  worldGroup.clear(); boxes.length = 0; worldMeshes.length = 0; skyMesh = null; snowPts = null;
}

function buildWorld() {
  const T = MAP.theme;
  seed = 1337 + MAP.id.length * 97;
  // floor
  const [fTex, fTs, fBump, fRough] = floorTex(T.floor.style, T.floor.base);
  const fg = new THREE.PlaneGeometry(W * CELL, H * CELL), fuv = fg.attributes.uv;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) * W * CELL / fTs, fuv.getY(i) * H * CELL / fTs);
  const floor = add(new THREE.Mesh(fg, std({ map: fTex, bumpMap: fTex, bumpScale: fBump, roughness: fRough })), { cast: false, hit: true });
  floor.rotation.x = -Math.PI / 2;
  const dirt = add(new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), new THREE.MeshBasicMaterial({ alphaMap: dirtTex(), color: T.snow ? lin(0x8fa3bb) : lin(0x2d2215), transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })), { cast: false });
  dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.01;
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), std({ color: lin(T.ground), roughness: 1 })), { cast: false });
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03;

  // walls: greedy-merge wall cells into rectangles
  const [wTex, wTs, wBump] = wallTex(T.wall.style, T.wall.base);
  const matWall = std({ map: wTex, bumpMap: wTex, bumpScale: wBump, vertexColors: true });
  const matCap = std({ color: lin(T.cap), roughness: 0.8 });
  const cellH = G.map(r => r.map(() => 0));
  const used = G.map(r => r.map(() => false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (G[y][x] !== '#' || used[y][x]) continue;
    let w = 1; while (x + w < W && G[y][x + w] === '#' && !used[y][x + w]) w++;
    let h = 1;
    outer: while (y + h < H) { for (let k = 0; k < w; k++) if (G[y + h][x + k] !== '#' || used[y + h][x + k]) break outer; h++; }
    const hgt = T.wallH[0] + Math.round(rnd() * 6) / 6 * (T.wallH[1] - T.wallH[0]);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { used[yy][xx] = true; cellH[yy][xx] = hgt; }
    const x0 = OX + x * CELL, z0 = OZ + y * CELL, ww = w * CELL, dd = h * CELL;
    const geo = boxGeo(ww, hgt, dd, wTs, 4); aoColors(geo, hgt);
    add(new THREE.Mesh(geo, matWall), { hit: true }).position.set(x0 + ww / 2, hgt / 2, z0 + dd / 2);
    add(new THREE.Mesh(new THREE.BoxGeometry(ww + 0.24, 0.28, dd + 0.24), matCap), { hit: true }).position.set(x0 + ww / 2, hgt + 0.14, z0 + dd / 2);
    boxes.push({ x0, x1: x0 + ww, z0, z1: z0 + dd, y0: 0, y1: hgt + 0.3 });
  }

  // crates / containers
  const crateMats = T.crate === 'container'
    ? [0xb5452f, 0x2f6fa8, 0x3e7d4a, 0xc9852d, 0x8a8f94].map(c => std({ map: containerTex(), color: lin(c), roughness: 0.55, metalness: 0.35 }))
    : [(() => { const t = crateTex(); return std({ map: t, bumpMap: t, bumpScale: 0.03 }); })()];
  const snowMat = std({ color: lin(0xf4f8fb), roughness: 0.7 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = G[y][x]; if (c !== 'c' && c !== 'C') continue;
    const px = cxw(x), pz = czw(y), mat = pick(crateMats);
    add(new THREE.Mesh(new THREE.BoxGeometry(CRATE_S, CRATE_H, CRATE_S), mat), { hit: true }).position.set(px, CRATE_H / 2, pz);
    let top = CRATE_H;
    if (c === 'C') {
      const t = add(new THREE.Mesh(new THREE.BoxGeometry(CRATE_S * 0.86, CRATE_H, CRATE_S * 0.86), T.crate === 'container' ? pick(crateMats) : mat), { hit: true });
      t.position.set(px, CRATE_H * 1.5, pz); t.rotation.y = rand(-0.25, 0.25); top = CRATE_H * 2;
    }
    if (T.crateSnow) add(new THREE.Mesh(new THREE.BoxGeometry(CRATE_S * 0.84, 0.08, CRATE_S * 0.84), snowMat), { cast: false }).position.set(px, top + 0.04, pz);
    boxes.push({ x0: px - CRATE_S / 2, x1: px + CRATE_S / 2, z0: pz - CRATE_S / 2, z1: pz + CRATE_S / 2, y0: 0, y1: top });
  }

  // site letters painted on the ground
  Object.entries(MAP.letters).forEach(([ch, [cx, cz]]) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), std({ map: letterTex(ch), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })), { cast: false });
    m.rotation.x = -Math.PI / 2; m.position.set(OX + (cx + 0.5) * CELL, 0.02, OZ + (cz + 0.5) * CELL);
  });

  buildDecor(T, cellH);
  buildRoofs(T);
  buildSky(T);
  buildLandmarks(T);
  if (T.snow) buildSnow();
}

// Windows, doors, awnings, lamps, barrels and overhead cables
function buildDecor(T, cellH) {
  const winMat = std({ map: windowTex(T.windows, T.shutter), roughness: 0.6, emissive: T.windows === 'glass-warm' ? lin(0x5a3510) : 0x000000, emissiveMap: T.windows === 'glass-warm' ? windowTex(T.windows) : null });
  const doorMat = std({ map: doorTex(T.windows === 'shutter' ? '#6b4a2b' : T.wall.style === 'concrete' ? '#56606a' : '#7a5232') });
  const awnMats = (T.awnings || []).map(c => std({ map: fabricTex(c), side: THREE.DoubleSide }));
  const lampMat = std({ color: 0x222222, emissive: lin(0xffd59a), emissiveIntensity: 2 });
  const winGeo = new THREE.PlaneGeometry(1.05, 1.35), doorGeo = new THREE.PlaneGeometry(1.25, 2.3);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (G[z][x] !== '#' || cellH[z][x] < 4.5) continue;
    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || G[nz][nx] === '#') continue;
      const r = rnd(), lat = rand(-0.9, 0.9), rotY = Math.atan2(dx, dz);
      const fx = cxw(x) + dx * (CELL / 2 + 0.02) + dz * lat, fz = czw(z) + dz * (CELL / 2 + 0.02) + dx * lat;
      let top = 0;
      if (r < 0.09) { const m = add(new THREE.Mesh(doorGeo, doorMat), { cast: false }); m.position.set(fx, 1.15, fz); m.rotation.y = rotY; top = 2.35; }
      else if (r < 0.4) {
        const wy = rand(2.6, 3.2), m = add(new THREE.Mesh(winGeo, winMat), { cast: false }); m.position.set(fx, wy, fz); m.rotation.y = rotY; top = wy + 0.7;
        if (cellH[z][x] > 6.6 && rnd() < 0.6) { const m2 = add(new THREE.Mesh(winGeo, winMat), { cast: false }); m2.position.set(fx, wy + 2.4, fz); m2.rotation.y = rotY; }
      }
      if (top && awnMats.length && rnd() < 0.45) {
        const a = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.0), pick(awnMats)), { receive: false });
        a.position.set(fx + dx * 0.5, top + 0.2, fz + dz * 0.5); a.rotation.y = rotY; a.rotateX(0.32);
      }
      if (T.lamps && rnd() < 0.07) { const l = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), lampMat), { receive: false }); l.position.set(fx + dx * 0.15, 4.2, fz + dz * 0.15); l.rotation.y = rotY; }
      // barrels against the wall, on the floor cell next to it
      const fc = G[nz][nx];
      if (T.barrels && rnd() < 0.05 && '.AB'.includes(fc)) {
        const bx = cxw(nx) - dx * (CELL / 2 - 0.42) + dz * lat * 0.6, bz = czw(nz) - dz * (CELL / 2 - 0.42) + dx * lat * 0.6;
        const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.92, 16), std({ color: lin(T.barrels), roughness: 0.55, metalness: 0.4 })), { hit: true });
        b.position.set(bx, 0.46, bz);
        boxes.push({ x0: bx - 0.3, x1: bx + 0.3, z0: bz - 0.3, z1: bz + 0.3, y0: 0, y1: 0.92 });
      }
    }
  }
  if (!T.cables) return;
  const cableMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  const cable = (ax, az, bx, bz, y) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new V3(ax + (bx - ax) * t, y - Math.sin(t * Math.PI) * 0.7, az + (bz - az) * t)); }
    worldGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  };
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (G[z][x] !== '#' && G[z][x - 1] === '#') {
      let e = x; while (e < W && G[z][e] !== '#') e++;
      if (e < W && e - x <= 3 && rnd() < 0.3) { const y = Math.min(cellH[z][x - 1], cellH[z][e]) - 0.5, zz = czw(z) + rand(-1, 1); cable(OX + x * CELL, zz, OX + e * CELL, zz, y); }
    }
    if (G[z][x] !== '#' && G[z - 1][x] === '#') {
      let e = z; while (e < H && G[e][x] !== '#') e++;
      if (e < H && e - z <= 3 && rnd() < 0.3) { const y = Math.min(cellH[z - 1][x], cellH[e][x]) - 0.5, xx = cxw(x) + rand(-1, 1); cable(xx, OZ + z * CELL, xx, OZ + e * CELL, y); }
    }
  }
}

function buildRoofs(T) {
  if (!MAP.roofs) return;
  const roofMat = std({ color: lin(0x55595c), roughness: 0.7, metalness: 0.3 });
  const beamMat = std({ color: lin(0x3a3d40), roughness: 0.6, metalness: 0.5 });
  const lampMat = std({ color: 0x222222, emissive: lin(0xfff1d0), emissiveIntensity: 3 });
  for (const [x0, z0, x1, z1] of MAP.roofs) {
    const ax = OX + (x0 - 1) * CELL, az = OZ + (z0 - 1) * CELL, w = (x1 - x0 + 3) * CELL, d = (z1 - z0 + 3) * CELL, cx = ax + w / 2, cz = az + d / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), roofMat)).position.set(cx, 7.1, cz);
    for (let i = 1; i < 5; i++) add(new THREE.Mesh(new THREE.BoxGeometry(w - 2, 0.35, 0.25), beamMat)).position.set(cx, 6.8, az + d * i / 5);
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.4), lampMat), { cast: false }).position.set(cx, 6.5, cz + s * d / 5);
      const pl = new THREE.PointLight(0xfff1d0, 1.3, 24, 2); pl.position.set(cx, 6.2, cz + s * d / 5); worldGroup.add(pl);
    }
  }
}

function buildSky(T) {
  const d = new V3(...T.sunDir).normalize();
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: lin(T.sky[0]) }, mid: { value: lin(T.sky[1]) }, bot: { value: lin(T.sky[2]) }, sunDir: { value: d }, sunCol: { value: lin(T.sunCol) }, cloud: { value: T.cloud } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top,mid,bot,sunDir,sunCol; uniform float cloud; varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        vec3 d=normalize(vP); float h=d.y;
        vec3 c = h>0.0 ? mix(mid,top,pow(h,0.5)) : mix(mid,bot,min(1.0,-h*4.0));
        float s=max(dot(d,sunDir),0.0);
        c += sunCol*(pow(s,900.0)*6.0 + pow(s,12.0)*0.35);
        if(h>0.0){
          vec2 uv=d.xz/(h+0.12)*1.3; float n=fbm(uv);
          float cl=smoothstep(0.62-cloud*0.3,0.9,n)*smoothstep(0.0,0.2,h);
          vec3 cc=mix(mid*0.85, vec3(1.0), n) + sunCol*pow(s,4.0)*0.3;
          c=mix(c,cc,cl*0.9);
        }
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  }));
  skyMesh.renderOrder = -1; worldGroup.add(skyMesh);
}

function buildLandmarks(T) {
  const far = std({ color: lin(T.far), roughness: 1 });
  const ring = (n, rmin, rmax, fn) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.1, r = rmin + rnd() * (rmax - rmin); fn(Math.cos(a) * r, Math.sin(a) * r, a); } };
  const put = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; worldGroup.add(m); return m; };
  if (T.landmark === 'dome') {
    ring(46, 80, 160, (x, z) => { const w = 8 + rnd() * 16, h = 6 + rnd() * 14; put(new THREE.BoxGeometry(w, h, w * (0.6 + rnd())), far, x, h / 2, z, rnd() * 3); });
    const tile = std({ color: lin(0x2f8f9d), roughness: 0.4, metalness: 0.1 });
    for (const [x, z, h] of [[95, -88, 34], [122, -60, 30]]) { put(new THREE.CylinderGeometry(1.6, 2.3, h, 14), far, x, h / 2, z); put(new THREE.CylinderGeometry(2.4, 1.7, 2.4, 14), tile, x, h + 1.2, z); }
    put(new THREE.CylinderGeometry(11, 11, 10, 24), far, 110, 14, -74);
    put(new THREE.SphereGeometry(11.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tile, 110, 19, -74).scale.y = 1.25;
  } else if (T.landmark === 'tower') {
    const roof = std({ color: lin(0xa64b2a), roughness: 0.8 });
    ring(54, 75, 150, (x, z) => {
      const w = 7 + rnd() * 9, h = 7 + rnd() * 9, ry = rnd() * 3;
      put(new THREE.BoxGeometry(w, h, w), far, x, h / 2, z, ry);
      put(new THREE.ConeGeometry(w * 0.75, 3.5, 4), roof, x, h + 1.75, z, ry + Math.PI / 4);
    });
    put(new THREE.BoxGeometry(7, 34, 7), far, -95, 17, 70); put(new THREE.ConeGeometry(5.6, 10, 4), roof, -95, 39, 70, Math.PI / 4);
  } else if (T.landmark === 'cranes') {
    const yel = std({ color: lin(0xd9a21b), roughness: 0.6, metalness: 0.3 }), red = std({ color: lin(0xb03a2e), roughness: 0.6, metalness: 0.3 });
    for (const [x, z, m] of [[-60, -110, yel], [10, -125, red], [80, -105, yel]]) {
      put(new THREE.BoxGeometry(2, 36, 2), m, x, 18, z); put(new THREE.BoxGeometry(2, 36, 2), m, x + 8, 18, z);
      put(new THREE.BoxGeometry(12, 2, 46), m, x + 4, 37, z + 10); put(new THREE.BoxGeometry(4, 3, 4), m, x + 4, 34, z);
    }
    const cols = [0xb5452f, 0x2f6fa8, 0x3e7d4a, 0xc9852d, 0x8a8f94].map(c => std({ color: lin(c), roughness: 0.6, metalness: 0.3 }));
    ring(40, 70, 120, (x, z, a) => { if (Math.sin(a) < -0.3) return; const n = 1 + (rnd() * 3 | 0); for (let k = 0; k < n; k++) put(new THREE.BoxGeometry(6, 2.6, 2.5), pick(cols), x, 1.3 + k * 2.6, z, a); });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 500), std({ color: lin(0x3d5566), roughness: 0.25, metalness: 0.4 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.01, -390); worldGroup.add(sea);
  } else if (T.landmark === 'pines') {
    const trunk = std({ color: lin(0x4a3424) }), green = std({ color: lin(0x2c4a35), roughness: 0.95 }), snowy = std({ color: lin(0xe8eef3), roughness: 0.8 });
    ring(110, 62, 160, (x, z) => {
      const s = 0.8 + rnd() * 0.9;
      put(new THREE.CylinderGeometry(0.4 * s, 0.5 * s, 3 * s, 6), trunk, x, 1.5 * s, z);
      for (let k = 0; k < 3; k++) put(new THREE.ConeGeometry((3.6 - k) * s, 4.2 * s, 8), k === 2 ? snowy : green, x, (3.5 + k * 2.6) * s, z);
    });
    const rock = std({ color: lin(0x7d8794), roughness: 1 });
    ring(14, 300, 380, (x, z) => { const h = 70 + rnd() * 80; put(new THREE.ConeGeometry(70 + rnd() * 50, h, 7), rock, x, h / 2, z, rnd() * 3); put(new THREE.ConeGeometry(30, h * 0.35, 7), snowy, x, h * 0.83, z); });
  }
}

function buildSnow() {
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-30, 30); pos[i * 3 + 1] = rand(0, 24); pos[i * 3 + 2] = rand(-30, 30); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  snowPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false }));
  snowPts.frustumCulled = false; worldGroup.add(snowPts);
}
function updateWeather(dt) {
  if (!snowPts) return;
  const a = snowPts.geometry.attributes.position, c = camera.position, t = performance.now() / 1000;
  for (let i = 0; i < a.count; i++) {
    let x = a.getX(i) + Math.sin(t + i) * 0.3 * dt + 0.6 * dt, y = a.getY(i) - 1.4 * dt, z = a.getZ(i);
    if (y < 0) y += 24;
    if (x - c.x > 30) x -= 60; else if (x - c.x < -30) x += 60;
    if (z - c.z > 30) z -= 60; else if (z - c.z < -30) z += 60;
    a.setXYZ(i, x, y, z);
  }
  a.needsUpdate = true;
}

function applyAtmosphere() {
  const T = MAP.theme;
  scene.fog.color.copy(lin(T.fog[0])); scene.fog.near = T.fog[1]; scene.fog.far = T.fog[2];
  renderer.toneMappingExposure = T.exposure;
  hemi.color.copy(lin(T.hemi[0])); hemi.groundColor.copy(lin(T.hemi[1])); hemi.intensity = T.hemi[2];
  sun.color.copy(lin(T.sunCol)); sun.intensity = T.sunI;
  vHemi.color.copy(lin(T.hemi[0])); vHemi.groundColor.copy(lin(T.hemi[1])); vSun.color.copy(lin(T.sunCol));
  updateSun(0, 0);
}
function loadMap(id) {
  const def = MAPS.find(m => m.id === id) || MAPS[0];
  setGrid(def); clearWorld(); buildWorld(); applyAtmosphere();
}
