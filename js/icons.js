'use strict';
// ---------- Weapon pictures for the buy menu, kill feed and ammo panel ----------
// Each gun's own 3D model is rendered once from the side into a transparent PNG and cached.
const ICON_W = 256, ICON_H = 112, ICON_SS = 2;
const iconCache = {};
const iconScene = new THREE.Scene();
iconScene.add(new THREE.HemisphereLight(0xffffff, 0x3a3631, 1.25));
const iconSun = new THREE.DirectionalLight(0xfff4e2, 2.4); iconSun.position.set(4, 3, 2); iconScene.add(iconSun);
const iconRim = new THREE.DirectionalLight(0xbfd6ff, 0.9); iconRim.position.set(2, -1, -4); iconScene.add(iconRim);
const iconCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
iconCam.rotation.y = Math.PI / 2; // looking along −x: the muzzle (−z) points to the right of the picture

function pixelsToPng(buf, w, h, ow, oh) {
  const big = document.createElement('canvas'); big.width = w; big.height = h;
  const bctx = big.getContext('2d'), img = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); // WebGL rows are bottom-up
  bctx.putImageData(img, 0, 0);
  const out = document.createElement('canvas'); out.width = ow; out.height = oh;
  const octx = out.getContext('2d'); octx.imageSmoothingQuality = 'high'; octx.drawImage(big, 0, 0, ow, oh);
  return out.toDataURL('image/png');
}
// Photograph `obj` with an orthographic camera that frames it; side = gun profile, front = a soldier
function snapshot(obj, side, W, H) {
  iconScene.add(obj); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!side) box.min.y = Math.max(box.min.y, box.max.y - 1.05); // soldiers: frame from the waist up so the outfit reads at card size
  const size = box.getSize(new V3()), c = box.getCenter(new V3());
  const across = side ? size.z : size.x;
  const s = Math.max(across / (W * 0.9), size.y / (H * (side ? 0.82 : 0.92))); // world units per pixel, so the object fills the frame
  Object.assign(iconCam, { left: -W / 2 * s, right: W / 2 * s, top: H / 2 * s, bottom: -H / 2 * s });
  iconCam.rotation.y = side ? Math.PI / 2 : 0;
  iconCam.updateProjectionMatrix(); if (side) iconCam.position.set(c.x + 5, c.y, c.z); else iconCam.position.set(c.x, c.y, c.z + 5);
  const w = W * ICON_SS, h = H * ICON_SS;
  const rt = new THREE.WebGLRenderTarget(w, h, { encoding: THREE.sRGBEncoding });
  const prevColor = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(iconScene, iconCam);
  const buf = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  renderer.setRenderTarget(null); renderer.setClearColor(prevColor, prevAlpha);
  rt.dispose(); iconScene.remove(obj);
  return pixelsToPng(buf, w, h, W, H);
}
function renderGunIcon(kind, skinId) {
  const { g } = gunModel(kind, skinId);
  const url = snapshot(g, true, ICON_W, ICON_H);
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  return url;
}
function renderAgentIcon(agentId) {
  const a = AGENTS[agentId], m = makeSoldier(a.team, a, false);
  scene.remove(m.group); if (m.marker) m.marker.visible = false;
  m.group.rotation.y = 0.35; poseSoldier(m, 0, 0, 0, false);
  const url = snapshot(m.group, false, 150, 140);
  disposeSoldier(m);
  return url;
}
// Picture for an inventory item: a skinned gun or an agent
function itemIcon(id) {
  const key = 'item|' + id;
  if (!iconCache[key]) iconCache[key] = SKINS[id] ? renderGunIcon(skinModel(WEAPONS[SKINS[id].weapon].model, id), id) : renderAgentIcon(id);
  return iconCache[key];
}

// Gear has no 3D model: kevlar vest, vest + helmet, defuse kit are drawn by hand
function drawGearIcon(id) {
  const c = document.createElement('canvas'); c.width = ICON_W * ICON_SS; c.height = ICON_H * ICON_SS;
  const g = c.getContext('2d'); g.scale(ICON_SS, ICON_SS); g.lineJoin = 'round';
  const shade = (x0, y0, x1, y1, a, b) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  const vest = (cx, cy, k) => {
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.beginPath(); g.moveTo(-30, -46); g.lineTo(-14, -46); g.quadraticCurveTo(0, -30, 14, -46); g.lineTo(30, -46);
    g.lineTo(38, -22); g.lineTo(37, 44); g.lineTo(-37, 44); g.lineTo(-38, -22); g.closePath();
    g.fillStyle = shade(0, -46, 0, 44, '#56614a', '#323a2a'); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#262c1f'; g.fillRect(-37, -4, 74, 7);
    for (const x of [-30, -9, 12]) { g.fillStyle = shade(0, 8, 0, 34, '#4a543f', '#2e3527'); g.fillRect(x, 8, 18, 26); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, 8, 18, 5); }
    g.restore();
  };
  if (id === 'kevlar') vest(ICON_W / 2, ICON_H / 2 + 2, 1);
  else if (id === 'kevlarh') {
    vest(ICON_W / 2 + 28, ICON_H / 2 + 2, 0.95);
    const hx = ICON_W / 2 - 46, hy = ICON_H / 2 + 6;
    g.beginPath(); g.arc(hx, hy, 32, Math.PI, 0); g.lineTo(hx + 38, hy + 6); g.lineTo(hx - 38, hy + 6); g.closePath();
    g.fillStyle = shade(hx, hy - 32, hx, hy + 6, '#66704f', '#363d2b'); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(hx - 10, hy - 18, 12, 6, -0.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2a24'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - 26, hy + 6); g.quadraticCurveTo(hx, hy + 30, hx + 26, hy + 6); g.stroke();
  } else if (id === 'kit') {
    // wire cutters with red and blue wires
    const cx = ICON_W / 2, cy = ICON_H / 2;
    g.lineCap = 'round';
    for (const [col, dy] of [['#d0352b', -18], ['#2f6fd0', 18]]) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 100, cy + dy); g.bezierCurveTo(cx - 40, cy + dy * 2.2, cx + 40, cy - dy * 0.4, cx + 100, cy + dy * 0.6); g.stroke(); }
    g.save(); g.translate(cx, cy); g.rotate(-0.25); g.scale(1.45, 1.45);
    for (const s of [-1, 1]) {
      g.fillStyle = shade(0, 0, 70, 0, '#c9372c', '#7a1d16');
      g.beginPath(); g.moveTo(4, s * 3); g.quadraticCurveTo(40, s * 22, 78, s * 14); g.lineTo(80, s * 4); g.quadraticCurveTo(40, s * 9, 4, -s * 2); g.closePath(); g.fill();
      g.fillStyle = shade(-50, 0, 0, 0, '#d9dde1', '#7c8187');
      g.beginPath(); g.moveTo(4, s * 3); g.lineTo(-46, s * 7); g.lineTo(-48, 0); g.lineTo(4, -s * 2); g.closePath(); g.fill();
    }
    g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(2, 0, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4b5056'; g.beginPath(); g.arc(2, 0, 3, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const out = document.createElement('canvas'); out.width = ICON_W; out.height = ICON_H;
  const octx = out.getContext('2d'); octx.imageSmoothingQuality = 'high'; octx.drawImage(c, 0, 0, ICON_W, ICON_H);
  return out.toDataURL('image/png');
}

// model kind ('ak', 'usp', …) or gear id ('kevlar', 'kevlarh', 'kit') → PNG data URL
function iconFor(key) {
  if (!iconCache[key]) iconCache[key] = ['kevlar', 'kevlarh', 'kit'].includes(key) ? drawGearIcon(key) : renderGunIcon(key);
  return iconCache[key];
}
// Render everything up front (on match start) so nothing stalls mid-fight
function warmIcons() {
  for (const k of ['usp', 'pistol', 'deagle', 'smg', 'ak', 'm4', 'awp', 'galil', 'famas', 'scout', 'p90', 'nova', 'knife', 'he', 'flash', 'smoke', 'molotov', 'c4', 'kevlar', 'kevlarh', 'kit']) {
    try { iconFor(k); } catch (e) { iconCache[k] = ''; }
  }
}
