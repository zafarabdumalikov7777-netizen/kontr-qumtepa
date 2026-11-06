'use strict';
// ---------- Skins, agents, cases and the player's inventory ----------
const RARITY = {
  blue:   { name: 'Harbiy',     color: '#4b69ff', w: 7992, val: 60 },
  purple: { name: 'Cheklangan', color: '#8847ff', w: 1598, val: 260 },
  pink:   { name: 'Maxfiy',     color: '#d32ce6', w: 320,  val: 900 },
  red:    { name: 'Yashirin',   color: '#eb4b4b', w: 64,   val: 2600 },
  gold:   { name: 'Nodir',      color: '#e4ae39', w: 26,   val: 6500 }
};
const RARITY_ORDER = ['blue', 'purple', 'pink', 'red', 'gold'];
const WEAR = [[0.07, 'Zavoddan yangi'], [0.15, 'Kam ishlatilgan'], [0.38, 'Dalada sinalgan'], [0.45, 'Ko‘p ishlatilgan'], [1.01, 'Jangda eskirgan']];
const wearName = f => WEAR.find(([m]) => f < m)[1];

// [id, weapon, name, rarity, pattern, colours, metalness, roughness]
const SKIN_ROWS = {
  qumtepa: [
    ['glock_qum', 'glock', 'Qum bo‘roni', 'blue', 'camo', ['#c9a66b', '#a07c48', '#7d5f36', '#e2cc9a']],
    ['mp5_chol', 'mp5', 'Cho‘l kamuflyaji', 'blue', 'digital', ['#cdb07a', '#8f6d3f', '#5b4a33', '#e0cfa4']],
    ['usp_saroy', 'usp', 'Saroy', 'blue', 'stripes', ['#262626', '#c9a24a', '#7a5a20']],
    ['deagle_quyosh', 'deagle', 'Quyosh botishi', 'purple', 'fade', ['#ff7a18', '#af002d', '#319197'], 0.6, 0.3],
    ['m4_karvon', 'm4a1', 'Karvon', 'purple', 'tiger', ['#d9a441', '#2a1e10']],
    ['ak_yolbars', 'ak47', 'Qum yo‘lbarsi', 'pink', 'tiger', ['#e08a2e', '#1b1208']],
    ['awp_ajdar', 'awp', 'Sahro ajdari', 'red', 'neon', ['#f2efe8', '#151515', '#ff7a1a']],
    ['knife_quyosh', 'knife', 'Pichoq | Quyosh', 'gold', 'fade', ['#ffd34d', '#ff5f6d', '#7a2bff'], 1, 0.18],
    ['knife_yolbars', 'knife', 'Pichoq | Yo‘lbars', 'gold', 'tiger', ['#f39c32', '#120c06'], 0.8, 0.25],
    ['knife_sahro', 'knife', 'Pichoq | Sahro', 'gold', 'fade', ['#f2d49b', '#c27c3a', '#5a3418'], 0.7, 0.3]
  ],
  registon: [
    ['glock_koshin', 'glock', 'Ko‘k koshin', 'blue', 'tiles', ['#1d5f8a', '#3fb6c8', '#f2e9d0']],
    ['mp5_minora', 'mp5', 'Minora', 'blue', 'hex', ['#2e3a46', '#3fb6c8', '#1d2630']],
    ['usp_moviy', 'usp', 'Moviy chiziq', 'blue', 'stripes', ['#11161c', '#3fb6c8', '#0e5a6b']],
    ['deagle_gumbaz', 'deagle', 'Gumbaz', 'purple', 'tiles', ['#0f4c75', '#39a7c4', '#e8d8a0'], 0.4, 0.35],
    ['m4_registon', 'm4a1', 'Registon', 'purple', 'tiles', ['#103f63', '#46c2d6', '#f4e7c2']],
    ['awp_tun', 'awp', 'Samarqand kechasi', 'pink', 'fade', ['#0b1d3a', '#1d5f8a', '#c8a24a'], 0.5, 0.3],
    ['ak_rasadxona', 'ak47', 'Ulug‘bek rasadxonasi', 'red', 'marble', ['#e9eef2', '#1b3a5c', '#c8a24a'], 0.3, 0.25],
    ['knife_koshin', 'knife', 'Pichoq | Koshin', 'gold', 'tiles', ['#0f4c75', '#46c2d6', '#f4e7c2'], 0.6, 0.2],
    ['knife_lazurit', 'knife', 'Pichoq | Lazurit', 'gold', 'fade', ['#1a237e', '#3fb6c8', '#c8a24a'], 1, 0.15],
    ['knife_samarqand', 'knife', 'Pichoq | Samarqand', 'gold', 'tiles', ['#123a6b', '#3fb6c8', '#f4e7c2'], 0.5, 0.25]
  ],
  ipak: [
    ['glock_adras', 'glock', 'Adras', 'blue', 'ikat', ['#6b2c5e', '#e0a33a', '#2c5e8a', '#f0e2c8']],
    ['mp5_beqasam', 'mp5', 'Beqasam', 'blue', 'stripes', ['#5a1e2e', '#d8b45a', '#2b6a8a']],
    ['usp_suzani', 'usp', 'Suzani', 'purple', 'suzani', ['#efe3c8', '#b8312f', '#2c6e49']],
    ['m4_atlas', 'm4a1', 'Atlas', 'purple', 'ikat', ['#d1286b', '#ffd23f', '#1f8ac0', '#2e2e3a']],
    ['deagle_lola', 'deagle', 'Lola', 'pink', 'suzani', ['#2a1f3d', '#e5384f', '#f4c542']],
    ['awp_zarbof', 'awp', 'Zarbof', 'pink', 'suzani', ['#3b0d2a', '#d4a73c', '#f2d27a'], 0.5, 0.35],
    ['ak_atlas', 'ak47', 'Atlas shamoli', 'red', 'ikat', ['#e62e6b', '#ffcf3a', '#18a0d8', '#3a1250']],
    ['knife_atlas', 'knife', 'Pichoq | Atlas', 'gold', 'ikat', ['#e62e6b', '#ffcf3a', '#18a0d8', '#3a1250'], 0.5, 0.25],
    ['knife_oltin', 'knife', 'Pichoq | Oltin', 'gold', 'gold', ['#fff1a8', '#e2b13c', '#8a5a12'], 1, 0.12],
    ['knife_suzani', 'knife', 'Pichoq | Suzani', 'gold', 'suzani', ['#f3e6c8', '#b3261e', '#1f5f4a', '#2a3f7a'], 0.3, 0.4]
  ],
  qish: [
    ['glock_qirov', 'glock', 'Qirov', 'blue', 'digital', ['#e8eef3', '#a9bccd', '#6f8396', '#d0dbe4']],
    ['mp5_qor', 'mp5', 'Qor bo‘roni', 'blue', 'camo', ['#f0f4f7', '#c7d3dd', '#8c9eb0', '#dfe7ee']],
    ['usp_muz', 'usp', 'Muz', 'purple', 'marble', ['#dff4ff', '#7fb7d8', '#ffffff'], 0.3, 0.2],
    ['deagle_yogdu', 'deagle', 'Shimoliy yog‘du', 'purple', 'fade', ['#00c9a7', '#845ec2', '#0b132b'], 0.6, 0.25],
    ['m4_qoryolbars', 'm4a1', 'Qor yo‘lbarsi', 'pink', 'tiger', ['#f4f7fa', '#2b3440']],
    ['awp_archazor', 'awp', 'Archazor', 'pink', 'camo', ['#2c4a35', '#e8eef3', '#1b2b22', '#5d7a63']],
    ['ak_qahraton', 'ak47', 'Qahraton', 'red', 'neon', ['#e8f4ff', '#0b1b2b', '#3fd0ff']],
    ['knife_qirov', 'knife', 'Pichoq | Qirov', 'gold', 'marble', ['#e6f7ff', '#5fa8d3', '#ffffff'], 0.8, 0.15],
    ['knife_muz', 'knife', 'Pichoq | Muz', 'gold', 'fade', ['#bfefff', '#3fa9f5', '#ffffff'], 1, 0.12],
    ['knife_qorboron', 'knife', 'Pichoq | Qor bo‘roni', 'gold', 'camo', ['#f4f8fb', '#9fb3c8', '#5f7a96', '#dfe8f0'], 0.4, 0.4]
  ]
};
// Agents: whole outfits. top/pants are a colour or a pattern {p, c}
const AGENT_ROWS = [
  ['ag_chegarachi', 'KT', 'Chegarachi', 'blue', { top: { p: 'camo', c: ['#4b5a39', '#2f3a25', '#6b7350', '#1f261a'] }, pants: '#38412c', vest: '#2a3022', head: 'helmet', glove: '#2b2a24' }],
  ['ag_qorbars', 'KT', 'Qor yo‘lbarsi', 'blue', { top: { p: 'camo', c: ['#eef2f5', '#c3cfd9', '#8fa1b3', '#dde5ec'] }, pants: '#d6dee6', vest: '#9aa8b5', head: 'beanie', headCol: '#e8edf1', glove: '#c9d2da' }],
  ['ag_alfa', 'KT', 'Alfa bo‘linmasi', 'purple', { top: '#1a1d21', pants: '#15181b', vest: '#0e1012', head: 'helmet', helmetCol: '#121416', glove: '#0d0d0d', pack: true }],
  ['ag_togchi', 'KT', 'Tog‘ chavandozi', 'purple', { top: { p: 'digital', c: ['#7d8a6a', '#5a6649', '#a7ad8c', '#3f4834'] }, pants: '#4f5940', vest: '#3a4230', head: 'cap', headCol: '#5a6649', glove: '#3a3326' }],
  ['ag_shahar', 'KT', 'Shahar maxsus kuchi', 'pink', { top: { p: 'digital', c: ['#6e7378', '#4b4f54', '#9aa0a6', '#2f3236'] }, pants: '#3a3d41', vest: '#24272a', head: 'mask', glove: '#1b1b1b', pack: true }],
  ['ag_temur', 'KT', 'Qo‘mondon Temur', 'red', { top: '#1d2b48', pants: '#17223a', vest: '#c9a24a', head: 'beret', headCol: '#8a1c1c', glove: '#e8e2d0', skin: '#b98a63' }],
  ['ag_bori', 'T', 'Cho‘l bo‘risi', 'blue', { top: { p: 'camo', c: ['#c9a66b', '#9c7a47', '#6e5634', '#e0caa0'] }, pants: '#8a7350', vest: '#5a4a32', head: 'balaclava', glove: '#4a3c28' }],
  ['ag_tulki', 'T', 'Bozor tulkisi', 'blue', { top: '#5b3a26', pants: '#2f3b55', vest: '#3a2a1c', head: 'cap', headCol: '#1f1f1f', glove: '#2a1f17', skin: '#a8754f' }],
  ['ag_qoraniqob', 'T', 'Qora niqob', 'purple', { top: '#151515', pants: '#1c1c1c', vest: '#0b0b0b', head: 'balaclava', glove: '#0a0a0a', pack: true }],
  ['ag_bandana', 'T', 'Qizil bandana', 'purple', { top: '#3a3f2e', pants: '#2f4a6a', vest: '#262a1f', head: 'bandana', headCol: '#b3261e', glove: '#2b2b26', skin: '#c99a72' }],
  ['ag_atlas', 'T', 'Atlas qo‘riqchisi', 'pink', { top: { p: 'ikat', c: ['#e62e6b', '#ffcf3a', '#18a0d8', '#3a1250'] }, pants: '#2a2230', vest: '#1c1620', head: 'hood', headCol: '#2a1838', glove: '#1a1418' }],
  ['ag_zahar', 'T', 'Zahar', 'red', { top: '#5f7d1e', pants: '#4a6316', vest: '#2a3510', head: 'mask', glove: '#1b1b10', pack: true }]
];
const SKINS = {}, AGENTS = {};
const CASES = [
  { id: 'qumtepa', name: 'Qumtepa keysi', price: 250, color: '#c9a24a', items: [] },
  { id: 'registon', name: 'Registon keysi', price: 300, color: '#2f8f9d', items: [] },
  { id: 'ipak', name: 'Ipak yo‘li keysi', price: 350, color: '#b03a6a', items: [] },
  { id: 'qish', name: 'Qish keysi', price: 250, color: '#8fb4d8', items: [] },
  { id: 'agent', name: 'Agentlar keysi', price: 400, color: '#56663f', items: [] }
];
for (const [caseId, rows] of Object.entries(SKIN_ROWS)) for (const [id, weapon, name, rarity, pat, c, metal, rough] of rows) {
  SKINS[id] = { id, kind: 'skin', weapon, name, rarity, pat: { p: pat, c }, metal: metal ?? 0.25, rough: rough ?? 0.5, caseId };
  CASES.find(k => k.id === caseId).items.push(id);
}
for (const [id, team, name, rarity, look] of AGENT_ROWS) { AGENTS[id] = { id, kind: 'agent', team, name, rarity, look }; CASES[4].items.push(id); }
// every gold skin is its own kind of knife
const KNIVES = { knife: 'Pichoq', karambit: 'Karambit', butterfly: 'Kapalak pichoq', bayonet: 'Nayza pichoq', bowie: 'Bowie pichog‘i', chust: 'Chust pichog‘i' };
const KNIFE_OF = { knife_quyosh: 'karambit', knife_yolbars: 'bayonet', knife_sahro: 'bowie', knife_koshin: 'chust', knife_lazurit: 'butterfly', knife_samarqand: 'bayonet',
  knife_atlas: 'chust', knife_oltin: 'bowie', knife_suzani: 'karambit', knife_qirov: 'butterfly', knife_muz: 'karambit', knife_qorboron: 'bowie' };
for (const [id, k] of Object.entries(KNIFE_OF)) SKINS[id].knife = k;
const skinModel = (model, skinId) => (skinId && SKINS[skinId] && SKINS[skinId].knife) || model;
const weaponName = d => d.knife ? KNIVES[d.knife] : WEAPONS[d.weapon].name;
const itemDef = id => SKINS[id] || AGENTS[id];
const itemTitle = d => d.kind === 'agent' ? `${d.name} (${d.team === 'KT' ? 'KT' : 'T'} agent)` : `${weaponName(d)} | ${d.name.replace(/^Pichoq \| /, '')}`;

// ---------- procedural patterns (each skin draws the same way every time) ----------
const patCache = {};
function patternTex(pat) {
  const key = pat.p + pat.c.join('');
  if (patCache[key]) return patCache[key];
  let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; seed = h || 1;
  const [c0, c1 = c0, c2 = c1, c3 = c2] = pat.c;
  const t = canvasTex(256, (g, s) => {
    g.fillStyle = c0; g.fillRect(0, 0, s, s);
    const blob = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 5; k++) { const a = rnd() * 6.3, rr = r * (0.5 + rnd() * 0.6); g.moveTo(x + Math.cos(a) * rr + rr, y + Math.sin(a) * rr); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr, 0, 7); } g.fill(); };
    switch (pat.p) {
      case 'camo': for (let i = 0; i < 46; i++) blob(rnd() * s, rnd() * s, 10 + rnd() * 22, [c1, c2, c3][i % 3]); break;
      case 'digital': for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 8) { const v = Math.sin(x * 0.05 + rnd() * 0.8) + Math.cos(y * 0.06 + rnd() * 0.8); g.fillStyle = v > 0.9 ? c1 : v > 0 ? c2 : v > -0.9 ? c0 : c3; g.fillRect(x, y, 8, 8); } break;
      case 'stripes': g.save(); g.translate(s / 2, s / 2); g.rotate(-0.6); for (let x = -s; x < s; x += 42) { g.fillStyle = c1; g.fillRect(x, -s, 14, s * 2); g.fillStyle = c2; g.fillRect(x + 20, -s, 4, s * 2); } g.restore(); break;
      case 'tiger': g.strokeStyle = c1; g.lineCap = 'round'; for (let i = 0; i < 22; i++) { const y = rnd() * s; g.lineWidth = 4 + rnd() * 9; g.beginPath(); g.moveTo(-10, y); g.bezierCurveTo(s * 0.3, y + (rnd() - 0.5) * 60, s * 0.6, y + (rnd() - 0.5) * 60, s * (0.4 + rnd() * 0.7), y + (rnd() - 0.5) * 40); g.stroke(); } break;
      case 'hex': { const r = 14, hh = r * Math.sqrt(3); g.lineWidth = 2; for (let y = 0; y < s + hh; y += hh) for (let x = 0, k = 0; x < s + r * 2; x += r * 1.5, k++) { const cy = y + (k % 2 ? hh / 2 : 0); g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(x + r * Math.cos(a * Math.PI / 3), cy + r * Math.sin(a * Math.PI / 3)); g.closePath(); if (rnd() < 0.18) { g.fillStyle = c2; g.fill(); } g.strokeStyle = c1; g.stroke(); } break; }
      case 'fade': { const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, c0); gr.addColorStop(0.5, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, s, s); break; }
      case 'gold': { const gr = g.createLinearGradient(0, 0, s, s * 0.6); gr.addColorStop(0, c0); gr.addColorStop(0.45, c1); gr.addColorStop(0.55, c0); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, s, s); break; }
      case 'marble': g.lineCap = 'round'; for (let i = 0; i < 26; i++) { g.strokeStyle = i % 3 ? c1 : c2; g.globalAlpha = 0.35 + rnd() * 0.5; g.lineWidth = 1 + rnd() * 4; let x = rnd() * s, y = rnd() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.3) * 60; y += (rnd() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; break;
      case 'neon': for (let i = 0; i < 14; i++) { g.fillStyle = c1; g.fillRect(rnd() * s, rnd() * s, 20 + rnd() * 70, 8 + rnd() * 30); } g.fillStyle = c2; for (let i = 0; i < 10; i++) g.fillRect(rnd() * s, rnd() * s, 30 + rnd() * 90, 3 + rnd() * 5); break;
      case 'tiles': { const n = 32; for (let y = 0; y < s; y += n) for (let x = 0; x < s; x += n) { g.fillStyle = (x / n + y / n) % 2 ? c0 : c1; g.fillRect(x, y, n, n); g.fillStyle = c2; g.beginPath(); for (let a = 0; a < 16; a++) { const rr = a % 2 ? n * 0.18 : n * 0.42; g.lineTo(x + n / 2 + rr * Math.cos(a * Math.PI / 8), y + n / 2 + rr * Math.sin(a * Math.PI / 8)); } g.closePath(); g.fill(); } break; }
      case 'ikat': { // Uzbek atlas: vertical bands with blurred zig-zag edges
        const cols = [c0, c1, c2, c3]; for (let x = 0, k = 0; x < s; x += 32, k++) for (let y = 0; y < s; y += 4) { const off = Math.sin(y * 0.09 + k) * 10 + (rnd() - 0.5) * 4; g.fillStyle = cols[k % 4]; g.fillRect(x + off, y, 30, 4); }
        g.globalAlpha = 0.25; g.drawImage(g.canvas, 3, 0); g.drawImage(g.canvas, -3, 0); g.globalAlpha = 1; break;
      }
      case 'suzani': for (let i = 0; i < 9; i++) { const x = (i % 3 + 0.5) * s / 3 + (rnd() - 0.5) * 20, y = (Math.floor(i / 3) + 0.5) * s / 3 + (rnd() - 0.5) * 20; for (const [r, col] of [[34, c1], [24, c2], [14, c1], [6, c0]]) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } g.strokeStyle = c2; g.lineWidth = 3; for (let a = 0; a < 8; a++) { g.beginPath(); g.ellipse(x + Math.cos(a * 0.785) * 44, y + Math.sin(a * 0.785) * 44, 8, 4, a * 0.785, 0, 7); g.stroke(); } } break;
    }
    // light grain so flat colours read as paint
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + rnd() * 0.05})`; g.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); }
  });
  return (patCache[key] = t);
}
const skinMatCache = {};
function skinMaterial(skinId) {
  if (skinMatCache[skinId]) return skinMatCache[skinId];
  const sk = SKINS[skinId], src = patternTex(sk.pat).image;
  // chips and fine scratches show bare metal through the paint
  const tex = canvasTex(src.width, (g, s) => {
    g.drawImage(src, 0, 0, s, s);
    seed = 99 + skinId.length * 7;
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(185,188,192,${0.3 + rnd() * 0.4})`; const r = 1 + rnd() * 3; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, r * 1.6, r, rnd() * 3, 0, 7); g.fill(); }
    g.lineWidth = 0.7;
    for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(220,222,225,${0.12 + rnd() * 0.22})`; const x = rnd() * s, y = rnd() * s, a = rnd() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
  });
  tex.repeat.set(6, 6);
  return (skinMatCache[skinId] = new THREE.MeshPhysicalMaterial({ map: tex, metalness: sk.metal, roughness: sk.rough, envMap: gunEnv, envMapIntensity: 1.1,
    clearcoat: sk.metal > 0.7 ? 0.3 : 0.75, clearcoatRoughness: 0.18, roughnessMap: gunWear, bumpMap: gunWear, bumpScale: 0.00025 }));
}
function clothMaterial(spec, rough = 0.9) {
  if (typeof spec === 'string') return std({ color: lin(spec), roughness: rough, bumpMap: weaveTex, bumpScale: 0.003 });
  const tex = patternTex({ p: spec.p, c: spec.c }).clone(); tex.needsUpdate = true; tex.repeat.set(2, 2);
  return std({ map: tex, roughness: rough, bumpMap: weaveTex, bumpScale: 0.003 });
}

// ---------- inventory (kept in this browser) ----------
const INV = (() => {
  const s = store.get('kq_inv', null), o = { wallet: 1000, items: [], equip: {}, next: 1, earned: 0, promoDay: {}, promoReset: 1, vip: false };
  if (s && typeof s === 'object') {
    o.wallet = Math.max(0, +s.wallet || 0); o.next = Math.max(1, +s.next || 1); o.earned = +s.earned || 0;
    if (s.promoReset === 1 && s.promoDay && typeof s.promoDay === 'object') for (const [k, v] of Object.entries(s.promoDay)) if (typeof v === 'string') o.promoDay[k] = v;
    o.vip = s.vip === true; if (o.vip) o.wallet = Infinity; // VIP: endless money (saved as null, restored here)
    o.items = Array.isArray(s.items) ? s.items.filter(it => it && itemDef(it.id)).map(it => ({ uid: +it.uid, id: it.id, f: clamp(+it.f || 0, 0, 1) })) : [];
    if (s.equip && typeof s.equip === 'object') for (const [k, v] of Object.entries(s.equip)) if (o.items.some(it => it.uid === v)) o.equip[k] = v;
  }
  return o;
})();
const saveInv = () => store.set('kq_inv', INV);
const usd = n => n === Infinity ? '∞ VIP' : '$' + Math.floor(n).toLocaleString('en-US');
// The VIP code itself is not in the source, only its SHA-256, so only whoever was given it can turn VIP on.
const VIP_HASH = '2c54ffd8488e335f4ae6b8494ad926a675efa1a942e2f0f93ecd9c19a666856a';
async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// Bonus codes: each works once a day (local date), VIP any number of times
const BONUS = {
  VIP: { money: 10000, repeat: true },
  QUMTEPA: { money: 500 },
  KONTR2026: { money: 1500 },
  BEPULKEYS: { case: 'qumtepa' },
  AGENT: { case: 'agent' },
  PICHOQ: { knife: true }
};
// result: 'bad' | 'used' | 'vip' | 'vipon' | { money } | { caseId, win? }
async function redeemPromo(code) {
  const k = String(code || '').trim().toUpperCase(); if (!k) return 'bad';
  const b = BONUS[k];
  if (b) {
    const day = new Date().toLocaleDateString('en-CA');
    if (!b.repeat) { if (INV.promoDay[k] === day) return 'used'; INV.promoDay[k] = day; }
    if (b.money) { INV.wallet += b.money; saveInv(); return { money: b.money }; }
    saveInv();
    if (b.case) return { caseId: b.case };
    // a knife: pick a case that holds one and make the roulette land on it
    const c = pick(CASES.filter(c => c.items.some(id => itemDef(id).rarity === 'gold')));
    return { caseId: c.id, win: pick(c.items.filter(id => itemDef(id).rarity === 'gold')) };
  }
  if (!(window.crypto && crypto.subtle) || await sha256(k) !== VIP_HASH) return 'bad';
  if (INV.vip) return 'vipon';
  INV.vip = true; INV.wallet = Infinity; saveInv(); return 'vip';
}
const promoText = r => r === 'bad' ? 'Bunday promo kod yo‘q.' : r === 'used' ? 'Bu kod bugun ishlatilgan. Ertaga yana ishlaydi!' : r === 'vipon' ? 'VIP allaqachon yoqilgan.' : r === 'vip' ? 'VIP yoqildi: pulingiz endi cheksiz!'
  : r.money ? '+' + usd(r.money) + ' bonus hisobingizga qo‘shildi!' : r.win ? 'Bonus: kafolatlangan ★ pichoq!' : 'Bonus: bepul keys ochilmoqda!';
const itemByUid = uid => INV.items.find(it => it.uid === uid);
function equippedSkin(weaponId) { const it = itemByUid(INV.equip[weaponId]); return it ? it.id : null; }
function equippedAgent(team) { const it = itemByUid(INV.equip['agent_' + team]); return it ? AGENTS[it.id] : null; }
const equipSlot = d => d.kind === 'agent' ? 'agent_' + d.team : d.weapon;
function itemValue(it) { const d = itemDef(it.id); return Math.round(RARITY[d.rarity].val * (d.kind === 'agent' ? 1 : 1.35 - it.f * 0.6)); }
function addItem(id) { const it = { uid: INV.next++, id, f: AGENTS[id] ? 0 : Math.pow(Math.random(), 1.3) * 0.8 }; INV.items.push(it); saveInv(); return it; }
function sellItem(uid) {
  const it = itemByUid(uid); if (!it) return 0;
  const v = itemValue(it); INV.wallet += v;
  for (const [k, u] of Object.entries(INV.equip)) if (u === uid) delete INV.equip[k];
  INV.items = INV.items.filter(x => x.uid !== uid); saveInv(); return v;
}
function toggleEquip(uid) {
  const it = itemByUid(uid), slot = equipSlot(itemDef(it.id));
  if (INV.equip[slot] === uid) delete INV.equip[slot]; else INV.equip[slot] = uid;
  saveInv();
}
// Case roll: pick a rarity by CS-like odds, then an item of that rarity from the case
function rollCase(c) {
  const have = RARITY_ORDER.filter(r => c.items.some(id => itemDef(id).rarity === r));
  let x = Math.random() * have.reduce((s, r) => s + RARITY[r].w, 0), rar = have[0];
  for (const r of have) { x -= RARITY[r].w; if (x <= 0) { rar = r; break; } }
  return pick(c.items.filter(id => itemDef(id).rarity === rar));
}
// Match reward paid into the wallet when a match ends
function matchReward() {
  if (game.mode === 'practice') return 0;
  const p = player, won = game.score[p.team] > game.score[p.team === 'KT' ? 'T' : 'KT'];
  if (game.mode === 'gg') return (game.ggWinner === p ? 500 : 150) + p.kills * 10;
  return isDM() ? 100 + p.kills * 10 : (won ? 400 : 150) + p.kills * 15 + game.score[p.team] * 10;
}
