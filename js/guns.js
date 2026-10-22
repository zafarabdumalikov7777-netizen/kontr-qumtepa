'use strict';
// ---------- Weapon models ----------
// Every part is an extruded side profile (x = forward along the bore, y = up), lathed tubes or rings —
// so the silhouettes read as real guns instead of boxes. Units are metres, origin at the top of the grip.
const gunEnv = (() => {
  const t = canvasTex(512, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#7fa6d6'); gr.addColorStop(0.46, '#f1e7d2'); gr.addColorStop(0.52, '#8c7559'); gr.addColorStop(1, '#3b3127');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(40,34,28,0.7)';
    for (let x = 0; x < s; x += 22 + rnd() * 30) g.fillRect(x, s * 0.36 + rnd() * 30, 12 + rnd() * 26, s * 0.12);
    const sg = g.createRadialGradient(s * 0.3, s * 0.18, 0, s * 0.3, s * 0.18, 40); sg.addColorStop(0, '#fffbe8'); sg.addColorStop(1, 'rgba(255,250,230,0)');
    g.fillStyle = sg; g.fillRect(0, 0, s, s);
  }, { repeat: false });
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t);
  pm.dispose(); t.dispose();
  return rt.texture;
})();
const woodTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#8a4f26'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const y = rnd() * s; g.strokeStyle = `rgba(${rnd() < 0.5 ? '60,28,10' : '170,110,60'},${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + rand(-6, 6), s * 0.6, y + rand(-6, 6), s, y + rand(-3, 3)); g.stroke();
  }
});
woodTex.repeat.set(7, 7);
const GMAT_DEF = {
  steel: { color: 0x26282b, metalness: 0.85, roughness: 0.32 },
  park: { color: 0x2c2e30, metalness: 0.6, roughness: 0.48 },
  poly: { color: 0x1c1d1f, metalness: 0.05, roughness: 0.6 },
  wood: { color: 0xffffff, metalness: 0, roughness: 0.5, map: woodTex },
  bakelite: { color: 0x5e2b1b, metalness: 0.05, roughness: 0.35 },
  olive: { color: 0x5a6a42, metalness: 0.05, roughness: 0.62 },
  chrome: { color: 0xc4c7cb, metalness: 0.95, roughness: 0.2 },
  blade: { color: 0xd2d5d9, metalness: 1, roughness: 0.14 },
  lens: { color: 0x10324f, metalness: 0.9, roughness: 0.04 },
  bore: { color: 0x050505, metalness: 0.2, roughness: 0.9 },
  glove: { color: 0x2b2824, metalness: 0, roughness: 0.82 },
  knuckle: { color: 0x3a3631, metalness: 0, roughness: 0.7 },
  sleeve_KT: { color: 0x2f4058, metalness: 0, roughness: 0.9 },
  sleeve_T: { color: 0x6b5839, metalness: 0, roughness: 0.92 },
  olivedrab: { color: 0x4f5a34, metalness: 0.1, roughness: 0.6 }
};
const GMAT = {};
const gmat = n => GMAT[n] || (GMAT[n] = new THREE.MeshStandardMaterial(Object.assign({}, GMAT_DEF[n], { color: lin(GMAT_DEF[n].color), envMap: gunEnv, envMapIntensity: 0.9 })));

function shapeFrom(cmds) {
  const s = new THREE.Shape();
  cmds.forEach((c, i) => {
    if (i === 0) s.moveTo(c[0], c[1]);
    else if (c[0] === 'q') s.quadraticCurveTo(c[1], c[2], c[3], c[4]);
    else s.lineTo(c[0], c[1]);
  });
  return s;
}
// Extruded profile, centred on the bore plane; `side` shifts it right (+) or left (-)
function slab(g, mat, cmds, thick, side = 0, holes) {
  const s = shapeFrom(cmds); if (holes) holes.forEach(h => s.holes.push(shapeFrom(h)));
  const bev = Math.min(0.004, thick * 0.18);
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -(thick - bev * 2) / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.x = side; g.add(m); return m;
}
// Cylinder along the bore from x0 to x1 (radius r0 at the back, r1 at the front)
function tube(g, mat, r0, r1, x0, x1, y = 0, side = 0, seg = 16) {
  const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, seg); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set(side, y, -(x0 + x1) / 2); g.add(m); return m;
}
// Revolved profile along the bore: pts = [[radius, x], ...] with x increasing
function lathe(g, mat, pts, y = 0, side = 0) {
  const geo = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), 24); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set(side, y, 0); g.add(m); return m;
}
function ring(g, mat, r, tubeR, x, y, arc = Math.PI * 2) {
  const geo = new THREE.TorusGeometry(r, tubeR, 8, 20, arc); geo.rotateZ(Math.PI); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set(0, y, -x); g.add(m); return m;
}
let GUN_LITE = false; // third-person / dropped guns skip the tiny details
const tiny = (g, mat, w, h, len, x, y, side = 0) => { if (GUN_LITE) return null; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat); m.position.set(side, y, -x); g.add(m); return m; };

const GUNS = {
  ak(g) {
    const st = gmat('steel'), pk = gmat('park'), wd = gmat('wood'), bk = gmat('bakelite');
    slab(g, pk, [[-0.1, -0.045], [0.215, -0.045], [0.215, -0.004], [0.2, 0.014], [-0.055, 0.016], ['q', -0.095, 0.018, -0.1, 0]], 0.034);
    for (let x = -0.05; x < 0.19; x += 0.06) tiny(g, st, 0.036, 0.004, 0.008, x, 0.0);
    slab(g, st, [[0.205, -0.004], [0.27, -0.004], [0.27, 0.016], [0.24, 0.027], [0.205, 0.02]], 0.03);
    slab(g, wd, [[0.27, -0.038], ['q', 0.27, -0.006, 0.29, -0.004], [0.45, -0.004], ['q', 0.47, -0.02, 0.455, -0.04], ['q', 0.36, -0.05, 0.27, -0.038]], 0.044);
    slab(g, wd, [[0.28, 0.004], [0.44, 0.004], ['q', 0.452, 0.03, 0.43, 0.034], [0.29, 0.034], ['q', 0.274, 0.03, 0.28, 0.004]], 0.03);
    tube(g, st, 0.0095, 0.0095, 0.215, 0.63, 0);
    tube(g, st, 0.011, 0.011, 0.44, 0.52, 0.02);
    slab(g, st, [[0.505, 0.006], [0.535, 0.006], [0.535, 0.03], [0.505, 0.03]], 0.024);
    slab(g, st, [[0.57, -0.012], [0.6, -0.012], [0.598, 0.012], ['q', 0.593, 0.05, 0.586, 0.05], ['q', 0.579, 0.05, 0.575, 0.012]], 0.016);
    lathe(g, st, [[0, 0.625], [0.0125, 0.625], [0.013, 0.66], [0.01, 0.668], [0, 0.668]]);
    slab(g, bk, [[0.075, -0.044], [0.155, -0.044], ['q', 0.2, -0.15, 0.255, -0.245], [0.19, -0.272], ['q', 0.13, -0.16, 0.075, -0.044]], 0.028);
    for (let k = 0; k < 3; k++) slab(g, bk, [[0.12 + k * 0.03, -0.07 - k * 0.055], [0.135 + k * 0.03, -0.07 - k * 0.055], [0.15 + k * 0.032, -0.11 - k * 0.055], [0.135 + k * 0.032, -0.11 - k * 0.055]], 0.032);
    ring(g, st, 0.022, 0.0035, 0.035, -0.045, Math.PI);
    slab(g, st, [[0.03, -0.04], [0.036, -0.04], [0.032, -0.064], [0.026, -0.064]], 0.006);
    slab(g, bk, [[-0.008, -0.045], [0.03, -0.045], ['q', 0.02, -0.09, 0.004, -0.14], ['q', -0.02, -0.15, -0.04, -0.138], ['q', -0.03, -0.09, -0.008, -0.045]], 0.03);
    slab(g, wd, [[-0.095, 0.006], [-0.43, -0.014], [-0.44, -0.135], [-0.405, -0.14], ['q', -0.25, -0.09, -0.13, -0.06], [-0.095, -0.045]], 0.036);
    slab(g, st, [[-0.44, -0.014], [-0.452, -0.014], [-0.452, -0.136], [-0.44, -0.136]], 0.038);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), st); ch.position.set(0.024, 0.002, -0.17); g.add(ch);
    return { mz: 0.668, fore: 0.37, foreY: -0.03 };
  },
  m4(g) {
    const al = gmat('park'), pl = gmat('poly'), st = gmat('steel');
    slab(g, al, [[-0.12, -0.006], [0.165, -0.006], [0.165, 0.028], [-0.12, 0.028]], 0.03);
    slab(g, st, [[-0.12, 0.028], [0.165, 0.028], [0.165, 0.036], [-0.12, 0.036]], 0.022);
    for (let x = -0.112; x < 0.16; x += 0.0105) tiny(g, st, 0.024, 0.005, 0.005, x, 0.039);
    slab(g, al, [[-0.1, -0.006], [0.13, -0.006], [0.13, -0.04], [0.12, -0.064], [0.055, -0.064], [0.045, -0.04], [-0.02, -0.04], ['q', -0.07, -0.045, -0.1, -0.03]], 0.032);
    tube(g, pl, 0.026, 0.026, 0.165, 0.43, 0.006, 0, 12);
    for (let x = 0.19; x < 0.42; x += 0.035) tube(g, st, 0.0275, 0.0275, x, x + 0.007, 0.006, 0, 12);
    slab(g, st, [[0.4, 0.02], [0.44, 0.02], ['q', 0.432, 0.05, 0.427, 0.082], [0.418, 0.082], ['q', 0.41, 0.05, 0.4, 0.02]], 0.014);
    lathe(g, st, [[0, 0.43], [0.017, 0.43], [0.0185, 0.44], [0.0185, 0.64], [0.016, 0.652], [0.006, 0.654], [0, 0.654]], 0.006);
    slab(g, st, [[-0.1, 0.036], [-0.06, 0.036], [-0.066, 0.063], [-0.094, 0.063]], 0.02);
    slab(g, al, [[0.058, -0.062], [0.118, -0.062], ['q', 0.13, -0.14, 0.15, -0.215], [0.095, -0.226], ['q', 0.08, -0.14, 0.058, -0.062]], 0.024);
    ring(g, al, 0.021, 0.003, 0.032, -0.04, Math.PI);
    slab(g, pl, [[-0.022, -0.04], [0.016, -0.04], ['q', 0.01, -0.09, -0.004, -0.132], ['q', -0.03, -0.142, -0.052, -0.126], ['q', -0.04, -0.08, -0.022, -0.04]], 0.03);
    tube(g, al, 0.015, 0.015, -0.33, -0.12, 0.004);
    slab(g, pl, [[-0.24, 0.026], [-0.4, 0.02], [-0.41, -0.106], [-0.385, -0.112], ['q', -0.32, -0.04, -0.25, -0.025]], 0.036);
    slab(g, st, [[-0.135, 0.016], [-0.12, 0.016], [-0.12, 0.03], [-0.135, 0.03]], 0.042);
    return { mz: 0.654, mzY: 0.006, fore: 0.31, foreY: -0.022 };
  },
  awp(g) {
    const ol = gmat('olive'), st = gmat('steel'), pl = gmat('poly'), lens = gmat('lens');
    const outer = [[0.32, -0.008], [0.32, -0.045], ['q', 0.2, -0.062, 0.03, -0.05], [0.005, -0.06], ['q', -0.03, -0.16, -0.08, -0.165], ['q', -0.12, -0.16, -0.13, -0.07],
      [-0.36, -0.075], ['q', -0.5, -0.13, -0.58, -0.15], [-0.6, -0.145], [-0.6, 0.02], ['q', -0.45, 0.03, -0.33, 0.01], [-0.16, 0.004], [-0.16, -0.008]];
    const hole = [[-0.05, -0.068], ['q', -0.028, -0.07, -0.038, -0.11], ['q', -0.07, -0.142, -0.1, -0.112], ['q', -0.112, -0.072, -0.05, -0.068]];
    slab(g, ol, outer, 0.044, 0, [hole]);
    slab(g, ol, [[-0.34, 0.01], [-0.52, 0.018], ['q', -0.42, 0.065, -0.35, 0.048]], 0.034);
    tube(g, st, 0.021, 0.021, -0.16, 0.13, 0.012);
    const bh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.055, 8), st); bh.rotation.z = -Math.PI / 2 + 0.35; bh.position.set(0.045, 0.004, 0.1); g.add(bh);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), st); knob.position.set(0.07, -0.006, 0.1); g.add(knob);
    tube(g, st, 0.014, 0.011, 0.13, 0.84, 0.012);
    lathe(g, st, [[0, 0.84], [0.019, 0.84], [0.0205, 0.85], [0.0205, 0.9], [0.013, 0.906], [0, 0.906]], 0.012);
    lathe(g, pl, [[0, -0.175], [0.026, -0.175], [0.031, -0.168], [0.031, -0.11], [0.017, -0.085], [0.017, 0.08], [0.034, 0.13], [0.037, 0.2], [0, 0.2]], 0.088);
    const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 14), pl); tur.position.set(0, 0.115, 0); g.add(tur);
    const tur2 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.026, 14), pl); tur2.rotation.z = Math.PI / 2; tur2.position.set(0.028, 0.088, 0); g.add(tur2);
    for (const x of [-0.06, 0.06]) { tube(g, st, 0.021, 0.021, x - 0.01, x + 0.01, 0.088); slab(g, st, [[x - 0.012, 0.03], [x + 0.012, 0.03], [x + 0.012, 0.07], [x - 0.012, 0.07]], 0.018); }
    const fl = new THREE.Mesh(new THREE.CircleGeometry(0.034, 20), lens); fl.position.set(0, 0.088, -0.2005); fl.rotation.y = Math.PI; g.add(fl);
    slab(g, pl, [[0.02, -0.05], [0.1, -0.05], [0.1, -0.092], [0.02, -0.092]], 0.03);
    ring(g, st, 0.02, 0.0035, -0.03, -0.05, Math.PI);
    return { mz: 0.906, mzY: 0.012, fore: 0.24, foreY: -0.045 };
  },
  smg(g) {
    const st = gmat('park'), pl = gmat('poly');
    slab(g, st, [[-0.1, -0.03], [0.17, -0.03], [0.17, 0], ['q', 0.17, 0.022, 0.15, 0.022], [-0.08, 0.022], ['q', -0.1, 0.022, -0.1, 0]], 0.034);
    tube(g, st, 0.009, 0.009, -0.02, 0.2, 0.028, -0.004);
    lathe(g, st, [[0, 0.17], [0.024, 0.17], [0.026, 0.18], [0.026, 0.45], [0.022, 0.46], [0, 0.46]], -0.002);
    slab(g, pl, [[0.17, -0.014], [0.3, -0.014], ['q', 0.312, -0.042, 0.296, -0.052], [0.18, -0.052], ['q', 0.165, -0.04, 0.17, -0.014]], 0.056);
    slab(g, st, [[0.04, -0.03], [0.08, -0.03], ['q', 0.12, -0.12, 0.18, -0.2], [0.15, -0.216], ['q', 0.09, -0.13, 0.04, -0.03]], 0.022);
    slab(g, pl, [[-0.07, -0.03], [0.03, -0.03], [0.03, -0.045], ['q', 0, -0.05, -0.006, -0.06], ['q', 0, -0.1, -0.012, -0.132], ['q', -0.036, -0.142, -0.056, -0.126], ['q', -0.046, -0.08, -0.07, -0.045]], 0.03, 0,
      [[[0.0, -0.034], [0.022, -0.034], ['q', 0.018, -0.046, 0.004, -0.048]]]);
    for (const s of [-0.017, 0.017]) tube(g, st, 0.005, 0.005, -0.3, -0.1, 0.006, s);
    slab(g, st, [[-0.3, 0.022], [-0.318, 0.022], [-0.322, -0.1], [-0.3, -0.1]], 0.044);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 14), st); drum.rotation.z = Math.PI / 2; drum.position.set(0, 0.04, 0.07); g.add(drum);
    return { mz: 0.46, mzY: -0.002, fore: 0.24, foreY: -0.04 };
  },
  pistol(g) { return pistolBase(g, 'glock'); },
  usp(g) { return pistolBase(g, 'usp'); },
  deagle(g) {
    const ch = gmat('chrome'), pl = gmat('poly'), st = gmat('steel');
    slab(g, ch, [[-0.05, 0], [0.21, 0], [0.21, 0.036], [0.2, 0.046], [-0.04, 0.046], [-0.05, 0.034]], 0.032);
    slab(g, ch, [[-0.02, 0.046], [0.205, 0.046], [0.205, 0.054], [-0.02, 0.054]], 0.012);
    for (let x = -0.045; x < -0.005; x += 0.007) tiny(g, gmat('park'), 0.0335, 0.024, 0.0016, x, 0.022);
    slab(g, ch, [[-0.045, 0], [0.2, 0], [0.2, -0.015], [0.07, -0.02], ['q', 0.066, -0.056, 0.04, -0.06], [0.014, -0.06], [0.01, -0.03], [-0.045, -0.026]], 0.03, 0,
      [[[0.02, -0.022], [0.058, -0.022], ['q', 0.054, -0.048, 0.032, -0.05], [0.02, -0.05]]]);
    slab(g, pl, [[-0.046, -0.022], [0.012, -0.026], ['q', 0.006, -0.09, 0, -0.142], ['q', -0.03, -0.152, -0.062, -0.142], ['q', -0.056, -0.08, -0.046, -0.022]], 0.036);
    slab(g, st, [[0.03, -0.022], [0.036, -0.022], [0.033, -0.042], [0.027, -0.042]], 0.007);
    tube(g, gmat('bore'), 0.007, 0.007, 0.207, 0.211, 0.02);
    tiny(g, st, 0.004, 0.008, 0.006, 0.2, 0.058); tiny(g, st, 0.016, 0.008, 0.006, -0.015, 0.058);
    return { mz: 0.211, mzY: 0.02, pistol: true };
  },
  knife(g) {
    const bl = gmat('blade'), pl = gmat('poly'), st = gmat('steel');
    slab(g, bl, [[0, 0.004], [0.17, 0.006], ['q', 0.216, 0.008, 0.238, 0.022], ['q', 0.2, -0.012, 0.15, -0.024], [0, -0.022]], 0.005);
    slab(g, st, [[0.02, 0.0], [0.14, 0.002], [0.14, -0.004], [0.02, -0.006]], 0.0056);
    slab(g, st, [[-0.006, 0.014], [0.008, 0.014], [0.008, -0.034], [-0.006, -0.034]], 0.024);
    slab(g, pl, [[-0.12, 0.008], [-0.006, 0.008], [-0.006, -0.026], ['q', -0.03, -0.033, -0.045, -0.024], ['q', -0.06, -0.035, -0.076, -0.026], ['q', -0.1, -0.034, -0.12, -0.022]], 0.024);
    lathe(g, st, [[0, -0.135], [0.012, -0.132], [0.013, -0.12], [0, -0.118]], -0.007);
    return { mz: 0.238, knife: true };
  },
  he(g) {
    const od = gmat('olivedrab'), st = gmat('steel');
    const body = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.05], [0.028, -0.047], [0.04, -0.03], [0.044, 0], [0.041, 0.028], [0.03, 0.044], [0.016, 0.05], [0, 0.051]].map(([r, y]) => new THREE.Vector2(r, y)), 24), od);
    body.position.set(0, -0.02, -0.04); g.add(body);
    const fuze = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.03, 14), st); fuze.position.set(0, 0.045, -0.04); g.add(fuze);
    slab(g, st, [[0.02, 0.056], [0.04, 0.056], ['q', 0.06, 0.04, 0.062, -0.02], [0.056, -0.02], ['q', 0.054, 0.03, 0.02, 0.05]], 0.016);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0022, 6, 16), st); pin.position.set(0.02, 0.058, -0.03); pin.rotation.y = 0.6; g.add(pin);
    return { mz: 0.05, he: true };
  }
};
function pistolBase(g, kind) {
  const sl = gmat(kind === 'usp' ? 'steel' : 'park'), pl = gmat('poly'), st = gmat('steel');
  const len = kind === 'usp' ? 0.16 : 0.15;
  slab(g, sl, kind === 'usp'
    ? [[-0.045, 0], [len, 0], [len, 0.024], ['q', len, 0.032, len - 0.01, 0.032], [-0.035, 0.032], ['q', -0.045, 0.032, -0.045, 0.022]]
    : [[-0.045, 0], [len, 0], [len, 0.022], [len - 0.007, 0.03], [-0.04, 0.03], [-0.045, 0.025]], 0.026);
  for (let x = -0.04; x < 0.0; x += 0.007) tiny(g, st, 0.028, 0.02, 0.0022, x, 0.015);
  slab(g, pl, [[-0.035, 0], [len - 0.005, 0], [len - 0.005, -0.016], [0.06, -0.018], ['q', 0.056, -0.046, 0.035, -0.049], [0.012, -0.049],
    ['q', 0.006, -0.08, 0.002, -0.122], ['q', -0.02, -0.13, -0.047, -0.122], ['q', -0.04, -0.06, -0.035, 0]], 0.028, 0,
    [[[0.018, -0.02], [0.05, -0.02], ['q', 0.046, -0.04, 0.03, -0.042], [0.018, -0.04]]]);
  for (let k = 0; k < 3; k++) slab(g, pl, [[0.004 - k * 0.002, -0.06 - k * 0.02], [0.009 - k * 0.002, -0.06 - k * 0.02], [0.007 - k * 0.002, -0.068 - k * 0.02], [0.002 - k * 0.002, -0.068 - k * 0.02]], 0.03);
  slab(g, st, [[0.025, -0.02], [0.031, -0.02], [0.028, -0.037], [0.023, -0.037]], 0.006);
  tiny(g, st, 0.004, 0.008, 0.006, len - 0.01, 0.034); tiny(g, st, 0.016, 0.008, 0.006, -0.03, 0.034);
  let mz = len + 0.002;
  if (kind === 'usp') { lathe(g, gmat('steel'), [[0, len], [0.0155, len], [0.0165, len + 0.01], [0.0165, len + 0.17], [0.012, len + 0.176], [0, len + 0.176]], 0.013); mz = len + 0.176; }
  else tube(g, gmat('bore'), 0.006, 0.006, len - 0.002, len + 0.002, 0.012);
  return { mz, mzY: 0.013, pistol: true };
}

// Gloved hands and sleeves for the first-person view
const _hy = new V3(0, 1, 0), _hd = new V3();
function limb(g, mat, a, b, r0, r1) {
  _hd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, _hd.length(), 14), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(_hy, _hd.normalize()); g.add(m); return m;
}
function fist(g, x, y, z, ry = 0) {
  const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; g.add(h);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), gmat('glove')); palm.scale.set(0.9, 1.15, 1.35); h.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0088, 0.046, 8), gmat('glove'));
    f.rotation.z = Math.PI / 2; f.position.set(-0.012, 0.026 - i * 0.017, -0.03); h.add(f);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 8, 6), gmat('knuckle')); k.position.set(0.012, 0.026 - i * 0.017, -0.032); h.add(k);
  }
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.009, 0.05, 8), gmat('glove')); th.rotation.x = 1.1; th.position.set(-0.024, 0.03, -0.012); h.add(th);
  return h;
}
function addHands(g, team, info) {
  const sv = gmat('sleeve_' + team), cuff = gmat('poly');
  const arm = (hand, elbow) => { limb(g, cuff, hand, [hand[0] + (elbow[0] - hand[0]) * 0.12, hand[1] + (elbow[1] - hand[1]) * 0.12, hand[2] + (elbow[2] - hand[2]) * 0.12], 0.036, 0.038); limb(g, sv, hand, elbow, 0.04, 0.052); };
  if (info.he) { fist(g, 0.005, -0.075, -0.035); arm([0.01, -0.1, 0.0], [0.11, -0.3, 0.3]); return; }
  if (info.knife) { fist(g, 0, -0.012, 0.06); arm([0.01, -0.035, 0.095], [0.11, -0.25, 0.38]); return; }
  fist(g, -0.002, -0.07, 0.008);
  arm([0.01, -0.1, 0.04], [0.1, -0.3, 0.34]);
  if (info.pistol) { fist(g, -0.03, -0.088, 0.012, 0.4); arm([-0.04, -0.11, 0.045], [-0.17, -0.3, 0.3]); }
  else { const z = -info.fore, y = info.foreY - 0.032; fist(g, -0.004, y, z, -0.2); arm([-0.02, y - 0.03, z + 0.03], [-0.19, -0.3, z + 0.38]); }
}
function finishGun(g, info) {
  const mz = new THREE.Object3D(); mz.name = 'muzzle'; mz.position.set(0, info.mzY || 0, -info.mz); g.add(mz); g.userData.muzzle = mz;
}
// First-person model (with hands)
function buildGun(kind, team) {
  const g = new THREE.Group(), info = (GUNS[kind] || GUNS.ak)(g);
  addHands(g, team, info); finishGun(g, info);
  return g;
}
// Third-person model for soldiers: same gun, no hands, facing +z
const gunProtos = {};
function worldGun(kind) {
  if (!gunProtos[kind]) {
    GUN_LITE = true;
    const inner = new THREE.Group(), info = (GUNS[kind] || GUNS.ak)(inner); finishGun(inner, info);
    GUN_LITE = false;
    inner.rotation.y = Math.PI; inner.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const outer = new THREE.Group(); outer.add(inner); gunProtos[kind] = outer;
  }
  return gunProtos[kind].clone(true);
}
