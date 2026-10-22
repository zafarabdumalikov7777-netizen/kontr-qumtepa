'use strict';
// ---------- Procedural textures ----------
function canvasTex(size, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function blotches(g, s, n, dark, light, rmin, rmax) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * s, y = rnd() * s, r = rmin + rnd() * (rmax - rmin);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rnd() < 0.55 ? dark : light); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function speckle(g, s, n, a, dark = '90,62,30', light = '255,238,200') {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? dark : light},${a * (0.4 + rnd())})`;
    const r = 1 + rnd() * 2; g.fillRect(rnd() * s, rnd() * s, r, r);
  }
}
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const shade = (hex, k) => { const c = new THREE.Color(hex); return `rgb(${clamp(c.r * 255 * k, 0, 255) | 0},${clamp(c.g * 255 * k, 0, 255) | 0},${clamp(c.b * 255 * k, 0, 255) | 0})`; };
function cracks(g, s, n, col) {
  g.strokeStyle = col; g.lineWidth = 1;
  for (let k = 0; k < n; k++) { let x = rnd() * s, y = rnd() * s; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 8; i++) { x += rand(-14, 14); y += rand(4, 16); g.lineTo(x, y); } g.stroke(); }
}

// Floor textures: [texture, world size of one tile, bump scale, roughness]
function floorTex(style, base) {
  if (style === 'cobble') return [canvasTex(512, (g, s) => {
    g.fillStyle = '#4c463e'; g.fillRect(0, 0, s, s);
    for (let row = 0; row < 16; row++) {
      const y = row * 32, off = (row % 2) * 18;
      for (let x = -36 + off; x < s; x += 36) {
        const w = 30 + rnd() * 6;
        rrect(g, x + 2, y + 2, w - 4, 28, 9); g.fillStyle = shade(base, 0.75 + rnd() * 0.5); g.fill();
        const gr = g.createLinearGradient(0, y, 0, y + 30); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
        g.fillStyle = gr; g.fill();
      }
    }
    blotches(g, s, 40, 'rgba(40,35,28,0.18)', 'rgba(230,220,200,0.08)', 30, 90);
    speckle(g, s, 5000, 0.08);
  }), 3.5, 0.06, 0.85];
  if (style === 'asphalt') return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    speckle(g, s, 30000, 0.18, '20,20,22', '200,200,200');
    blotches(g, s, 40, 'rgba(15,15,18,0.28)', 'rgba(160,160,155,0.10)', 20, 100);
    g.fillStyle = 'rgba(25,25,28,0.55)'; g.fillRect(0, 0, s, 3); g.fillRect(0, 0, 3, s);
    cracks(g, s, 10, 'rgba(20,20,22,0.6)');
  }), 8, 0.03, 0.92];
  if (style === 'snow') return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    blotches(g, s, 80, 'rgba(160,182,208,0.22)', 'rgba(255,255,255,0.35)', 25, 110);
    speckle(g, s, 9000, 0.25, '150,170,195', '255,255,255');
    g.strokeStyle = 'rgba(140,160,185,0.2)'; g.lineWidth = 6;
    for (let i = 0; i < 6; i++) { g.beginPath(); const y = rnd() * s; g.moveTo(0, y); g.bezierCurveTo(s / 3, y + rand(-40, 40), 2 * s / 3, y + rand(-40, 40), s, y); g.stroke(); }
  }), 6, 0.04, 0.75];
  return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    blotches(g, s, 90, 'rgba(120,88,50,0.16)', 'rgba(245,225,185,0.16)', 30, 110);
    g.strokeStyle = 'rgba(80,58,30,0.35)'; g.lineWidth = 4;
    for (let row = 0; row < 4; row++) {
      const y = row * 128, off = (row % 2) * 64;
      g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
      for (let x = off; x < s + 128; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); }
    }
    speckle(g, s, 14000, 0.12);
    cracks(g, s, 6, 'rgba(80,58,34,0.35)');
  }), 7, 0.05, 0.9];
}
// Wall textures: [texture, world size, bump scale]
function wallTex(style, base) {
  if (style === 'concrete') return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    blotches(g, s, 60, 'rgba(60,62,60,0.18)', 'rgba(220,220,215,0.12)', 30, 120);
    for (let i = 0; i < 40; i++) { const x = rnd() * s, y = rnd() * s * 0.5, len = 60 + rnd() * 160; const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, 'rgba(70,55,40,0.22)'); gr.addColorStop(1, 'rgba(70,55,40,0)'); g.fillStyle = gr; g.fillRect(x, y, 3 + rnd() * 6, len); }
    g.fillStyle = 'rgba(40,42,42,0.55)'; g.fillRect(0, 0, s, 3); g.fillRect(0, 0, 3, s); g.fillRect(256, 0, 2, s); g.fillRect(0, 256, s, 2);
    g.fillStyle = 'rgba(30,30,30,0.5)';
    for (let y = 64; y < s; y += 128) for (let x = 64; x < s; x += 128) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    speckle(g, s, 9000, 0.1, '40,40,40', '230,230,230');
  }), 4, 0.03];
  if (style === 'brick') return [canvasTex(512, (g, s) => {
    g.fillStyle = '#b7aea2'; g.fillRect(0, 0, s, s);
    for (let row = 0; row < 24; row++) {
      const y = row * 21.33, off = (row % 2) * 32;
      for (let x = -64 + off; x < s; x += 64) { g.fillStyle = shade(base, 0.7 + rnd() * 0.55); g.fillRect(x + 2, y + 2, 60, 17); }
    }
    blotches(g, s, 50, 'rgba(30,20,15,0.25)', 'rgba(255,240,230,0.08)', 30, 110);
    speckle(g, s, 8000, 0.12);
  }), 3.2, 0.05];
  if (style === 'stucco') return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    blotches(g, s, 90, 'rgba(140,90,50,0.16)', 'rgba(255,240,215,0.2)', 20, 110);
    // one patch of fallen plaster showing the stone underneath
    const px = rnd() * (s - 120), py = rnd() * (s - 80);
    g.save(); g.beginPath(); g.ellipse(px + 40, py + 24, 40, 22, rnd(), 0, 7); g.clip();
    g.fillStyle = shade(base, 0.72); g.fillRect(px, py, 100, 60);
    for (let i = 0; i < 10; i++) { rrect(g, px + rnd() * 80, py + rnd() * 48, 22, 13, 5); g.fillStyle = shade(base, 0.8 + rnd() * 0.2); g.fill(); }
    g.restore();
    cracks(g, s, 8, 'rgba(90,60,35,0.35)');
    speckle(g, s, 7000, 0.1);
  }), 4, 0.03];
  return [canvasTex(512, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    blotches(g, s, 70, 'rgba(120,88,52,0.17)', 'rgba(250,232,196,0.18)', 20, 100);
    g.fillStyle = 'rgba(110,80,48,0.10)'; g.fillRect(0, 250, s, 3); g.fillRect(0, 500, s, 3);
    cracks(g, s, 6, 'rgba(80,58,34,0.35)');
    speckle(g, s, 6000, 0.1);
  }), 4, 0.025];
}
function crateTex() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#93652f'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(60,35,10,0.12)' : 'rgba(255,220,160,0.06)'; g.fillRect(0, i * 32, s, 32); g.fillStyle = 'rgba(50,28,8,0.5)'; g.fillRect(0, i * 32, s, 2); }
    g.strokeStyle = 'rgba(60,36,12,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const y = rnd() * s, x = rnd() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 50, y + rand(-1, 1)); g.stroke(); }
    g.strokeStyle = '#5a3a17'; g.lineWidth = 22; g.strokeRect(11, 11, s - 22, s - 22);
    g.lineWidth = 20; g.beginPath(); g.moveTo(22, 22); g.lineTo(s - 22, s - 22); g.stroke();
    g.fillStyle = '#2b1b0b'; [[11, 11], [s - 11, 11], [11, s - 11], [s - 11, s - 11]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(30,18,6,0.55)'; g.font = 'bold 20px monospace'; g.fillText('QT-07', 150, 70);
  }, { repeat: false });
}
function containerTex() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#d4d4d4'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0.25)'); g.fillStyle = gr; g.fillRect(x, 0, 16, s); }
    g.strokeStyle = 'rgba(40,40,40,0.7)'; g.lineWidth = 10; g.strokeRect(5, 5, s - 10, s - 10);
    blotches(g, s, 18, 'rgba(110,60,25,0.35)', 'rgba(110,60,25,0.2)', 6, 26);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = 'bold 18px monospace'; g.fillText('QTPU 418207', 24, 40);
  }, { repeat: false });
}
function windowTex(kind, shutter) {
  return canvasTex(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#4a3423'; g.fillRect(0, 0, s, s);
    if (kind === 'shutter') {
      g.fillStyle = shutter || '#3f6b4f'; g.fillRect(8, 8, 54, 112); g.fillRect(66, 8, 54, 112);
      g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 12; y < 118; y += 8) { g.fillRect(10, y, 50, 2); g.fillRect(68, y, 50, 2); }
    } else if (kind === 'glass' || kind === 'glass-warm') {
      g.fillStyle = '#3b3f43'; g.fillRect(0, 0, s, s);
      const gr = g.createLinearGradient(0, 0, s, s);
      if (kind === 'glass-warm') { gr.addColorStop(0, '#ffcf7a'); gr.addColorStop(1, '#c4782e'); } else { gr.addColorStop(0, '#9fb3c2'); gr.addColorStop(1, '#3b4a57'); }
      g.fillStyle = gr; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.fillRect(10 + x * 56, 10 + y * 56, 52, 52);
    } else {
      g.fillStyle = '#17120d'; g.fillRect(10, 10, 108, 108);
      g.fillStyle = '#5a3d25'; g.fillRect(60, 10, 8, 108); g.fillRect(10, 60, 108, 8);
    }
  }, { repeat: false });
}
function doorTex(col) {
  return canvasTex(128, (g, s) => {
    g.fillStyle = '#2d2219'; g.fillRect(0, 0, s, s);
    for (let x = 10; x < 118; x += 18) { g.fillStyle = shade(col, 0.8 + rnd() * 0.35); g.fillRect(x, 8, 16, 120); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(10, 30, 108, 6); g.fillRect(10, 90, 108, 6);
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(100, 70, 4, 0, 7); g.fill();
  }, { repeat: false });
}
function fabricTex(col) {
  return canvasTex(128, (g, s) => {
    for (let x = 0; x < s; x += 16) { g.fillStyle = (x / 16) % 2 ? '#efe6d2' : shade(col, 1); g.fillRect(x, 0, 16, s); }
    blotches(g, s, 10, 'rgba(60,40,20,0.2)', 'rgba(255,255,255,0.1)', 10, 40);
  }, { repeat: false });
}
function dirtTex() {
  return canvasTex(1024, (g, s) => {
    g.clearRect(0, 0, s, s);
    blotches(g, s, 140, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.25)', 30, 160);
  }, { repeat: false, srgb: false });
}
const radialTex = (stops, size = 128) => canvasTex(size, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, s, s);
}, { repeat: false });
const texFlash = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.25, 'rgba(255,210,120,0.9)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,230,170,0.9)'; g.lineWidth = 5;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.stroke(); }
}, { repeat: false });
const texHole = radialTex([[0, 'rgba(15,10,6,0.95)'], [0.35, 'rgba(30,22,14,0.8)'], [1, 'rgba(40,30,20,0)']], 64);
const texSmoke = radialTex([[0, 'rgba(120,110,95,0.85)'], [1, 'rgba(120,110,95,0)']], 128);
const texFire = radialTex([[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,170,60,0.95)'], [1, 'rgba(200,60,10,0)']], 128);
function letterTex(ch) {
  return canvasTex(256, (g) => {
    g.font = 'bold 210px "Chakra Petch", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(178,38,28,${0.06 + rnd() * 0.05})`; g.fillText(ch, 128 + rand(-5, 5), 136 + rand(-5, 5)); }
    g.fillStyle = 'rgba(178,38,28,0.75)'; g.fillText(ch, 128, 136);
  }, { repeat: false });
}
function markerTex(color) {
  return canvasTex(64, (g) => {
    g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(14, 18); g.lineTo(50, 18); g.lineTo(32, 46); g.closePath(); g.stroke(); g.fill();
  }, { repeat: false });
}
const markerTexs = { KT: markerTex('#72b4ff'), T: markerTex('#f2a93b') };
