'use strict';
// ---------- Crosshair: customisable like CS2, drawn on a canvas ----------
const XH_DEFAULT = { style: 'dynamic', color: '#8dff70', alpha: 100, len: 7, thick: 2, gap: 4, outline: true, outlineW: 1, dot: false, tee: false };
const XH_PRESETS = {
  standart: { ...XH_DEFAULT },
  klassik: { style: 'dynamic', color: '#00ff00', alpha: 80, len: 9, thick: 2, gap: 5, outline: false, outlineW: 1, dot: false, tee: false },
  ixcham: { style: 'static', color: '#4dfff0', alpha: 100, len: 4, thick: 1, gap: 1, outline: true, outlineW: 1, dot: false, tee: false },
  nuqta: { style: 'static', color: '#ffe14d', alpha: 100, len: 0, thick: 3, gap: 0, outline: true, outlineW: 1, dot: true, tee: false },
  tshakl: { style: 'static', color: '#ff6bd6', alpha: 100, len: 6, thick: 2, gap: 3, outline: true, outlineW: 1, dot: true, tee: true }
};
const XH_COLORS = [['Yashil', '#8dff70'], ['Sariq', '#ffe14d'], ['Ko‘k', '#4da6ff'], ['Moviy', '#4dfff0'], ['Qizil', '#ff4d4d'], ['Oq', '#ffffff'], ['Pushti', '#ff6bd6']];
const XH_RANGES = { len: [0, 20, 0.5], thick: [0.5, 6, 0.5], gap: [-5, 15, 0.5], outlineW: [0.5, 3, 0.5], alpha: [20, 100, 5] };
function xhSanitize(c) {
  const o = { ...XH_DEFAULT };
  if (c && typeof c === 'object') {
    for (const k of Object.keys(XH_RANGES)) if (typeof c[k] === 'number' && isFinite(c[k])) o[k] = clamp(c[k], XH_RANGES[k][0], XH_RANGES[k][1]);
    for (const k of ['outline', 'dot', 'tee']) if (typeof c[k] === 'boolean') o[k] = c[k];
    if (c.style === 'static' || c.style === 'dynamic') o.style = c.style;
    if (typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color)) o.color = c.color.toLowerCase();
  }
  return o;
}
const Xhair = {
  cfg: xhSanitize(store.get('kq_xhair', null)),
  ver: 0,
  save() { store.set('kq_xhair', this.cfg); this.ver++; },
  // Draw one crosshair centred at (cx, cy) in device pixels; s = device pixels per CSS pixel
  draw(ctx, cfg, cx, cy, s, extraGap) {
    const r = v => Math.round(v * s);
    const t = Math.max(1, r(cfg.thick)), L = r(cfg.len), gap = r(cfg.gap + extraGap), ow = cfg.outline ? Math.max(1, r(cfg.outlineW)) : 0;
    const x0 = Math.round(cx - t / 2), y0 = Math.round(cy - t / 2);
    const rects = [];
    if (L > 0) {
      if (!cfg.tee) rects.push([x0, y0 - gap - L, t, L]);
      rects.push([x0, y0 + t + gap, t, L], [x0 - gap - L, y0, L, t], [x0 + t + gap, y0, L, t]);
    }
    if (cfg.dot) rects.push([x0, y0, t, t]);
    ctx.globalAlpha = cfg.alpha / 100;
    if (ow) { ctx.fillStyle = '#000'; for (const [x, y, w, h] of rects) ctx.fillRect(x - ow, y - ow, w + ow * 2, h + ow * 2); }
    ctx.fillStyle = cfg.color; for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  },
  // HUD crosshair; dynGap is the spread-based expansion in CSS pixels
  render(dynGap, show) {
    const c = this.canvas || (this.canvas = document.getElementById('xhair'));
    const extra = this.cfg.style === 'dynamic' ? Math.round(dynGap) : 0, key = show + '|' + extra + '|' + this.ver;
    if (key === this.lastKey) return; this.lastKey = key;
    c.hidden = !show; if (!show) return;
    const s = Math.min(2, window.devicePixelRatio || 1), size = 160;
    if (c.width !== size * s) { c.width = c.height = size * s; }
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
    this.draw(ctx, this.cfg, c.width / 2, c.height / 2, s, extra);
  },
  code() { try { return 'KQX-' + btoa(JSON.stringify(this.cfg)); } catch (e) { return ''; } },
  fromCode(str) {
    try { const j = JSON.parse(atob(String(str).trim().replace(/^KQX-/i, ''))); this.cfg = xhSanitize(j); this.save(); return true; } catch (e) { return false; }
  }
};

// ---------- Crosshair settings panel ----------
function initCrosshairUI(onClose) {
  const panel = document.getElementById('xhSet'), prev = document.getElementById('xhPrev');
  const sw = document.getElementById('xhColors');
  sw.innerHTML = XH_COLORS.map(([n, c]) => `<button type="button" class="sw" data-c="${c}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('') +
    '<label class="sw custom" title="Boshqa rang"><input type="color" id="xhCustom" aria-label="Boshqa rang"></label>';
  const pre = document.getElementById('xhPresets');
  const PRESET_NAMES = { standart: 'Standart', klassik: 'Klassik', ixcham: 'Ixcham', nuqta: 'Nuqta', tshakl: 'T-shakl' };
  pre.innerHTML = Object.keys(XH_PRESETS).map(k => `<button type="button" class="chip" data-p="${k}">${PRESET_NAMES[k]}</button>`).join('');
  const cfg = () => Xhair.cfg;
  const drawPreview = () => {
    const s = Math.min(2, window.devicePixelRatio || 1), w = prev.clientWidth || 420, h = prev.clientHeight || 140;
    prev.width = w * s; prev.height = h * s;
    const ctx = prev.getContext('2d'), bgs = ['#7aa6d8', '#c9a46a', '#2a2e33'];
    bgs.forEach((b, i) => { ctx.fillStyle = b; ctx.fillRect(i * prev.width / 3, 0, prev.width / 3 + 1, prev.height); });
    for (let i = 0; i < 3; i++) Xhair.draw(ctx, cfg(), (i + 0.5) * prev.width / 3, prev.height / 2, s, 0);
  };
  const sync = () => {
    const c = cfg();
    for (const k of Object.keys(XH_RANGES)) { const el = document.getElementById('xh_' + k); el.value = c[k]; document.getElementById('xh_' + k + 'O').textContent = k === 'alpha' ? c[k] + '%' : c[k]; }
    for (const k of ['outline', 'dot', 'tee']) document.getElementById('xh_' + k).checked = c[k];
    document.getElementById('xh_outlineW').disabled = !c.outline;
    document.querySelectorAll('#xhStyle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === c.style)));
    sw.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === c.color)));
    document.getElementById('xhCustom').value = c.color;
    document.getElementById('xhCode').value = Xhair.code();
    drawPreview();
  };
  const set = (k, v) => { Xhair.cfg = xhSanitize({ ...cfg(), [k]: v }); Xhair.save(); sync(); };
  for (const k of Object.keys(XH_RANGES)) document.getElementById('xh_' + k).addEventListener('input', e => set(k, +e.target.value));
  for (const k of ['outline', 'dot', 'tee']) document.getElementById('xh_' + k).addEventListener('change', e => set(k, e.target.checked));
  document.getElementById('xhStyle').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) set('style', b.dataset.s); });
  sw.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) set('color', b.dataset.c); });
  document.getElementById('xhCustom').addEventListener('input', e => set('color', e.target.value));
  pre.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { Xhair.cfg = { ...XH_PRESETS[b.dataset.p] }; Xhair.save(); sync(); } });
  const msg = document.getElementById('xhMsg');
  const say = t => { msg.textContent = t; clearTimeout(say.t); say.t = setTimeout(() => { msg.textContent = ''; }, 2500); };
  document.getElementById('xhCopy').addEventListener('click', () => {
    const inp = document.getElementById('xhCode');
    const fallback = () => { inp.focus(); inp.select(); say('Kod belgilandi — Ctrl+C bilan nusxalang'); };
    try { navigator.clipboard.writeText(inp.value).then(() => say('Kod nusxalandi'), fallback); } catch (e) { fallback(); }
  });
  document.getElementById('xhApply').addEventListener('click', () => {
    say(Xhair.fromCode(document.getElementById('xhCode').value) ? 'Kod qo‘llandi' : 'Kod noto‘g‘ri: “KQX-” bilan boshlanadigan kodni qo‘ying');
    sync();
  });
  document.getElementById('xhReset').addEventListener('click', () => { Xhair.cfg = { ...XH_DEFAULT }; Xhair.save(); sync(); say('Standart pritsel tiklandi'); });
  document.getElementById('xhDone').addEventListener('click', () => { panel.hidden = true; onClose && onClose(); });
  addEventListener('resize', () => { if (!panel.hidden) drawPreview(); });
  return { open() { panel.hidden = false; sync(); } };
}
