'use strict';
// ---------- Cases, roulette, inventory and market screens ----------
const caseIcons = {};
function caseIcon(c) {
  if (caseIcons[c.id]) return caseIcons[c.id];
  const W = 240, H = 150, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
  const g = cv.getContext('2d'); g.scale(2, 2);
  const col = new THREE.Color(c.color), dark = `rgb(${col.r * 120 | 0},${col.g * 120 | 0},${col.b * 120 | 0})`, light = `rgb(${Math.min(255, col.r * 300) | 0},${Math.min(255, col.g * 300) | 0},${Math.min(255, col.b * 300) | 0})`;
  const box = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2, H - 14, 92, 9, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, 22, 0, H - 18); gr.addColorStop(0, light); gr.addColorStop(0.5, c.color); gr.addColorStop(1, dark);
  box(28, 24, W - 56, H - 44, 12); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(28, 56, W - 56, 6);                    // lid seam
  g.fillStyle = '#1b1d20'; for (const x of [48, W - 66]) { box(x, 50, 18, 18, 3); g.fill(); }    // latches
  g.fillStyle = '#c9ccd0'; for (const x of [52, W - 62]) g.fillRect(x, 56, 10, 6);
  g.fillStyle = 'rgba(255,255,255,.18)'; box(36, 28, W - 72, 14, 6); g.fill();          // highlight
  g.fillStyle = 'rgba(0,0,0,.55)'; box(W / 2 - 66, 74, 132, 34, 6); g.fill();             // label plate
  g.fillStyle = '#f4ead4'; g.font = '700 15px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(c.name.replace(' keysi', '').toUpperCase(), W / 2, 91);
  return (caseIcons[c.id] = cv.toDataURL('image/png'));
}
const goldCard = '<div class="gold-star">★</div>';
function itemCard(id, opts = {}) {
  const d = itemDef(id), r = RARITY[d.rarity], hide = opts.hideGold && d.rarity === 'gold';
  const top = d.kind === 'agent' ? d.name : WEAPONS[d.weapon].name, sub = d.kind === 'agent' ? (d.team === 'KT' ? 'KT agenti' : 'T agenti') : d.name.replace(/^Pichoq \| /, '');
  return `<div class="icard ${opts.cls || ''}" style="--rc:${r.color}" ${opts.attr || ''}>` +
    (hide ? goldCard + '<span class="iname">★ Nodir pichoq</span><span class="isub">Juda kam uchraydi</span>' :
      `<img src="${itemIcon(id)}" alt=""><span class="iname">${top}</span><span class="isub">${sub}</span>`) + (opts.extra || '') + '</div>';
}

const ShopUI = (() => {
  const el = document.getElementById('shop'), body = document.getElementById('shopBody'), roll = document.getElementById('roll');
  let tab = 'cases', invFilter = 'all', onClose = null;
  const money = () => { document.getElementById('shopWallet').textContent = usd(INV.wallet); const b = document.getElementById('shopBtn'); if (b) b.querySelector('b').textContent = usd(INV.wallet); };
  function setTab(t) { tab = t; document.querySelectorAll('#shopTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t))); render(); }
  function render() {
    money();
    if (tab === 'cases') body.innerHTML = `<div class="case-grid">${CASES.map(c => `<button class="case" data-case="${c.id}" type="button" style="--cc:${c.color}"><img src="${caseIcon(c)}" alt=""><b>${c.name}</b><span>$${c.price}</span></button>`).join('')}</div>
      <p class="shop-note">Har bir o‘yin oxirida hisobingizga pul tushadi: g‘alaba, qotillik va yutilgan raundlar uchun.</p>
      <div class="code-row promo"><input id="promoIn" type="text" placeholder="Promo kod" autocomplete="off" spellcheck="false" aria-label="Promo kod"><button class="ghost" id="promoBtn" type="button">Faollashtirish</button></div>
      <p class="shop-note" id="promoMsg" role="status"></p>`;
    if (tab === 'cases') {
      const inp = document.getElementById('promoIn'), msg = document.getElementById('promoMsg');
      const go = async () => {
        const r = await redeemPromo(inp.value);
        msg.textContent = promoText(r);
        if (typeof r === 'object' || r === 'vip') { inp.value = ''; money(); if (Snd.ctx) Snd.chime(true); }
        if (r.caseId) bonusCase(r);
      };
      document.getElementById('promoBtn').onclick = go;
      inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); };
    }
    else if (tab === 'inv') renderInv();
    else renderMarket();
  }
  function showCase(id) {
    const c = CASES.find(k => k.id === id), items = [...c.items].sort((a, b) => RARITY_ORDER.indexOf(itemDef(b).rarity) - RARITY_ORDER.indexOf(itemDef(a).rarity));
    body.innerHTML = `<div class="case-head"><img src="${caseIcon(c)}" alt=""><div><h3>${c.name}</h3><p>${c.items.length} ta buyum · ochish narxi $${c.price}</p>
      <div class="row"><button class="primary" id="caseOpen" type="button" ${INV.wallet < c.price ? 'disabled' : ''}>OCHISH · $${c.price}</button><button class="ghost" id="caseBack" type="button">Orqaga</button></div>
      ${INV.wallet < c.price ? `<p class="shop-warn">Pul yetmaydi: yana $${c.price - INV.wallet} kerak. O‘yin o‘ynab pul yig‘ing.</p>` : ''}</div></div>
      <div class="odds">${RARITY_ORDER.filter(r => c.items.some(i => itemDef(i).rarity === r)).map(r => `<span style="--rc:${RARITY[r].color}">${RARITY[r].name}</span>`).join('')}</div>
      <div class="item-grid">${items.map(i => itemCard(i, { hideGold: true })).join('')}</div>`;
    document.getElementById('caseOpen').onclick = () => openCase(c);
    document.getElementById('caseBack').onclick = () => render();
  }
  // ---- roulette ----
  const ROLL_MS = 6400;
  let rollToken = 0;
  // a promo code's free case (optionally with a fixed prize)
  function bonusCase(r) { openCase(CASES.find(c => c.id === r.caseId), { free: true, win: r.win }); }
  function openCase(c, opt = {}) {
    if (!opt.free) {
      if (INV.wallet < c.price) return;
      INV.wallet -= c.price; saveInv(); money();
    }
    Snd.init();
    const win = opt.win || rollCase(c), WIN_AT = 48;
    const strip = Array.from({ length: 56 }, (_, i) => i === WIN_AT ? win : rollCase(c));
    const track = document.getElementById('rollTrack'), wrap = track.parentElement, res = document.getElementById('rollResult');
    document.getElementById('rollCase').textContent = c.name;
    track.innerHTML = strip.map(id => itemCard(id, { hideGold: true, cls: 'rc' })).join('');
    res.hidden = true; roll.hidden = false;
    track.style.transition = 'none'; track.style.transform = 'translateX(0px)';
    // measure the real card layout (zoom, fonts and CSS can change the width)
    const cards = track.children, el = cards[WIN_AT], x0 = cards[0].offsetLeft, pitch = cards[1].offsetLeft - x0;
    const half = wrap.clientWidth / 2;
    const target = el.offsetLeft + el.offsetWidth / 2 - half + rand(-0.38, 0.38) * el.offsetWidth;
    const token = ++rollToken, t0 = performance.now();
    let last = -1, done = false;
    const place = x => { track.style.transform = `translateX(${-x}px)`; };
    const finish = () => {
      if (done || token !== rollToken) return;
      done = true; place(target); reveal(c, win);
    };
    const tick = now => {
      if (done || token !== rollToken) return;
      const t = Math.min(1, (now - t0) / ROLL_MS), x = target * (1 - Math.pow(1 - t, 4.2));
      place(x);
      const i = Math.floor((x + half - x0) / pitch);
      if (i !== last) { last = i; if (Snd.ctx) Snd.tone(Snd.bus(0.18), Snd.ctx.currentTime, 2100, 1700, 0.025, 0.5, 'square'); }
      if (t >= 1) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, ROLL_MS + 600); // background tab: rAF paused, still land on the winner
  }
  function reveal(c, id) {
    const it = addItem(id), d = itemDef(id), r = RARITY[d.rarity], res = document.getElementById('rollResult');
    if (Snd.ctx) Snd.chime(true);
    res.innerHTML = `<div class="won" style="--rc:${r.color}"><img src="${itemIcon(id)}" alt=""><div>
      <div class="eyebrow" style="color:${r.color}">${r.name}${d.kind === 'skin' ? ' · ' + wearName(it.f) : ''}</div>
      <h3>${itemTitle(d)}</h3><p>Qiymati: $${itemValue(it)}</p>
      <div class="row"><button class="primary" id="wonEquip" type="button">JIHOZLASH</button><button class="ghost" id="wonSell" type="button">Sotish · $${itemValue(it)}</button></div>
      <div class="row"><button class="ghost" id="wonAgain" type="button" ${INV.wallet < c.price ? 'disabled' : ''}>Yana ochish · $${c.price}</button><button class="ghost" id="wonClose" type="button">Yopish</button></div></div></div>`;
    res.hidden = false;
    const close = () => { roll.hidden = true; showCase(c.id); };
    document.getElementById('wonEquip').onclick = () => { if (equipSlot(d) && INV.equip[equipSlot(d)] !== it.uid) toggleEquip(it.uid); close(); };
    document.getElementById('wonSell').onclick = () => { sellItem(it.uid); money(); close(); };
    document.getElementById('wonAgain').onclick = () => { roll.hidden = true; openCase(c); };
    document.getElementById('wonClose').onclick = close;
  }
  // ---- inventory ----
  function renderInv() {
    const list = INV.items.filter(it => invFilter === 'all' || (invFilter === 'agent') === !!AGENTS[it.id])
      .sort((a, b) => RARITY_ORDER.indexOf(itemDef(b.id).rarity) - RARITY_ORDER.indexOf(itemDef(a.id).rarity) || b.uid - a.uid);
    const equipped = new Set(Object.values(INV.equip));
    body.innerHTML = `<div class="seg inv-filter" id="invFilter"><button data-f="all" type="button">Hammasi (${INV.items.length})</button><button data-f="skin" type="button">Qurollar</button><button data-f="agent" type="button">Agentlar</button></div>` +
      (list.length ? `<div class="item-grid">${list.map(it => itemCard(it.id, { attr: `data-uid="${it.uid}" tabindex="0" role="button"`, cls: 'pickable' + (equipped.has(it.uid) ? ' equipped' : ''),
        extra: `<span class="ival">$${itemValue(it)}${AGENTS[it.id] ? '' : ' · ' + wearName(it.f)}</span>${equipped.has(it.uid) ? '<i class="eqb">JIHOZLANGAN</i>' : ''}` })).join('')}</div>`
        : '<p class="shop-note">Inventar bo‘sh. Keys oching yoki do‘kondan skin oling.</p>');
    document.querySelectorAll('#invFilter button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.f === invFilter)); b.onclick = () => { invFilter = b.dataset.f; renderInv(); }; });
    body.querySelectorAll('[data-uid]').forEach(n => { n.onclick = () => detail(+n.dataset.uid); n.onkeydown = e => { if (e.key === 'Enter') detail(+n.dataset.uid); }; });
  }
  function detail(uid) {
    const it = itemByUid(uid), d = itemDef(it.id), r = RARITY[d.rarity], on = INV.equip[equipSlot(d)] === uid;
    body.innerHTML = `<div class="won" style="--rc:${r.color}"><img src="${itemIcon(it.id)}" alt=""><div>
      <div class="eyebrow" style="color:${r.color}">${r.name}${d.kind === 'skin' ? ' · ' + wearName(it.f) + ' · ' + it.f.toFixed(3) : ''}</div>
      <h3>${itemTitle(d)}</h3><p>${d.kind === 'agent' ? `Jihozlansa, ${d.team} jamoasida o‘ynaganingizda shu kiyimda bo‘lasiz (qo‘llaringiz va soyangiz).` : `Jihozlansa, ${WEAPONS[d.weapon].name} shu skin bilan ko‘rinadi.`}</p>
      <div class="row"><button class="primary" id="dEquip" type="button">${on ? 'YECHISH' : 'JIHOZLASH'}</button><button class="ghost" id="dSell" type="button">Sotish · $${itemValue(it)}</button><button class="ghost" id="dBack" type="button">Orqaga</button></div></div></div>`;
    document.getElementById('dEquip').onclick = () => { toggleEquip(uid); renderInv(); };
    document.getElementById('dSell').onclick = () => { sellItem(uid); renderInv(); money(); };
    document.getElementById('dBack').onclick = renderInv;
  }
  // ---- market: a daily set of skins and agents to buy outright ----
  function offers() {
    let s = Math.floor(Date.now() / 864e5) % 2147483646 + 1;
    const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    const skins = Object.keys(SKINS).filter(id => SKINS[id].rarity !== 'gold').sort(() => r() - 0.5).slice(0, 8);
    const knife = Object.keys(SKINS).filter(id => SKINS[id].rarity === 'gold').sort(() => r() - 0.5)[0];
    const ags = Object.keys(AGENTS).sort(() => r() - 0.5).slice(0, 3);
    return [...skins, knife, ...ags];
  }
  const priceFor = id => Math.round(RARITY[itemDef(id).rarity].val * 1.6 / 10) * 10;
  function renderMarket() {
    body.innerHTML = `<p class="shop-note">Bugungi takliflar har kuni yangilanadi.</p><div class="item-grid">${offers().map(id => itemCard(id, {
      extra: `<button class="buyb" data-mk="${id}" type="button" ${INV.wallet < priceFor(id) ? 'disabled' : ''}>$${priceFor(id)}</button>` })).join('')}</div>`;
    body.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => {
      const id = b.dataset.mk, p = priceFor(id); if (INV.wallet < p) return;
      INV.wallet -= p; addItem(id); if (Snd.ctx) Snd.buy(); b.textContent = 'Olindi ✓'; b.disabled = true; money();
      body.querySelectorAll('[data-mk]').forEach(o => { if (!o.disabled && INV.wallet < priceFor(o.dataset.mk)) o.disabled = true; });
    });
  }
  body.addEventListener('click', e => { const c = e.target.closest('[data-case]'); if (c) showCase(c.dataset.case); });
  document.querySelectorAll('#shopTabs button').forEach(b => b.onclick = () => setTab(b.dataset.t));
  document.getElementById('shopClose').onclick = () => { el.hidden = true; vm.cache = {}; if (onClose) onClose(); };
  return {
    open(cb) { onClose = cb; el.hidden = false; Snd.init(); setTab(tab); },
    money, bonusCase
  };
})();
// a link ending in ?kod=XXXX redeems that promo code and opens the shop
addEventListener('load', async () => {
  const k = new URLSearchParams(location.search).get('kod'); if (!k) return;
  history.replaceState(null, '', location.pathname);
  const r = await redeemPromo(k);
  ShopUI.open();
  document.getElementById('promoMsg').textContent = promoText(r);
  if (r.caseId) ShopUI.bonusCase(r);
});
