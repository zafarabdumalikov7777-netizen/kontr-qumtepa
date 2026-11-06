'use strict';
// ---------- Online: friends join a room by code over WebRTC (PeerJS). No game server. ----------
// The host runs the match (bots, hits, deaths, respawns, clock); each guest moves on their own screen,
// sends where they are and what they hit, and draws everyone else from the host's snapshots.
const NET = { role: null, peer: null, host: null, peers: [], code: '', myId: -1, started: false, puppets: new Map(), sendT: 0, snapT: 0, lib: null };
const netOn = () => NET.started && !!NET.role;
const netClient = () => NET.started && NET.role === 'client';
const netHost = () => NET.started && NET.role === 'host';
const NET_PREFIX = 'uzbstrike-room-';
const NET_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const r2 = v => Math.round(v * 100) / 100;

function netLoadLib() {
  if (window.Peer) return Promise.resolve();
  if (NET.lib) return NET.lib;
  return (NET.lib = new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = ok; s.onerror = () => { NET.lib = null; bad(new Error('lib')); };
    document.head.appendChild(s);
  }));
}
const netName = () => (typeof PROFILE !== 'undefined' && PROFILE.name) || 'O‘yinchi';
function netSend(conn, msg) { try { if (conn && conn.open) conn.send(msg); } catch (e) {} }
function netBroadcast(msg, except) { for (const p of NET.peers) if (p.conn !== except) netSend(p.conn, msg); }
function netAgent(i) { return NET.role === 'client' ? (i === NET.myId ? player : NET.puppets.get(i)) : agents.find(a => a.id === i); }

// ---------- lobby UI ----------
const netUI = {
  info: () => document.getElementById('netInfo'),
  render() {
    const el = this.info(); if (!el) return;
    if (!NET.role) { el.hidden = true; document.getElementById('netRow').hidden = false; return; }
    document.getElementById('netRow').hidden = true; el.hidden = false;
    const team = t => t === 'KT' ? '<span class="c-kt">KT</span>' : '<span class="c-te">T</span>';
    if (NET.role === 'host') {
      const list = [`<li>${team(settings.team)} ${netName()} <small>(xona egasi)</small></li>`, ...NET.peers.map(p => `<li>${team(p.team)} ${p.name}</li>`)].join('');
      el.innerHTML = `<div class="net-code">Xona kodi: <b>${NET.code || '…'}</b><button type="button" class="ghost" id="netCopy">Nusxa</button></div>
        <p class="note">${NET.code ? 'Kodni do‘stlaringizga yuboring. Ular «Qo‘shilish» orqali kiradi. Hamma tayyor bo‘lsa, O‘YNASH ni bosing — onlayn Deathmatch boshlanadi, bo‘sh joylarni botlar to‘ldiradi.' : 'Xona ochilyapti…'}</p>
        <ul class="net-list">${list}</ul><button type="button" class="ghost" id="netLeave">Xonani yopish</button>`;
      const cp = document.getElementById('netCopy');
      if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(NET.code); cp.textContent = 'Nusxalandi ✓'; } catch (e) {} };
    } else {
      el.innerHTML = `<div class="net-code">Xona: <b>${NET.code}</b></div><p class="note">${NET.host && NET.host.open ? 'Ulandingiz. Xona egasi o‘yinni boshlashini kuting…' : 'Ulanmoqda…'}</p>
        <ul class="net-list">${(NET.lobby || []).map(p => `<li>${team(p.t)} ${p.n}</li>`).join('')}</ul><button type="button" class="ghost" id="netLeave">Chiqish</button>`;
    }
    document.getElementById('netLeave').onclick = () => netLeave();
  },
  msg(t) { const el = document.getElementById('netMsg'); if (el) el.textContent = t || ''; }
};
function netInitUI() {
  const code = document.getElementById('netCode');
  document.getElementById('netHostBtn').onclick = () => netCreate();
  document.getElementById('netJoinBtn').onclick = () => netJoin(code.value);
  code.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') netJoin(code.value); });
  code.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
  // a link ending in ?xona=CODE joins straight away
  const q = new URLSearchParams(location.search).get('xona');
  if (q) { code.value = q.toUpperCase(); setTimeout(() => netJoin(q), 400); }
}

// ---------- host ----------
async function netCreate() {
  if (NET.role) return;
  netUI.msg('Xona ochilyapti…');
  try { await netLoadLib(); } catch (e) { netUI.msg('Internet yo‘q yoki onlayn xizmat ochilmadi.'); return; }
  NET.role = 'host'; NET.peers = []; NET.started = false;
  const tryOpen = n => {
    NET.code = Array.from({ length: 5 }, () => NET_ABC[Math.random() * NET_ABC.length | 0]).join('');
    const peer = new Peer(NET_PREFIX + NET.code); NET.peer = peer;
    peer.on('open', () => { netUI.msg(''); netUI.render(); });
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && n < 4) { peer.destroy(); tryOpen(n + 1); return; }
      if (NET.role === 'host' && !NET.peers.length && !NET.started) { netUI.msg('Xona ochilmadi: ' + (err.type || 'tarmoq xatosi')); netLeave(true); }
    });
    peer.on('connection', conn => {
      conn.on('data', d => netHostRecv(conn, d));
      conn.on('close', () => netDropPeer(conn));
      conn.on('error', () => netDropPeer(conn));
    });
  };
  tryOpen(0); netUI.render();
}
function netLobbyList() { return [{ n: netName(), t: settings.team }, ...NET.peers.map(p => ({ n: p.name, t: p.team }))]; }
function netHostRecv(conn, d) {
  if (!d || typeof d !== 'object') return;
  let p = NET.peers.find(q => q.conn === conn);
  if (d.t === 'hello') {
    if (p) return;
    if (NET.peers.length >= 9) { netSend(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    // balance the sides (the host counts too)
    const n = { KT: 0, T: 0 }; n[settings.team]++; NET.peers.forEach(q => n[q.team]++);
    p = { conn, name: String(d.name || 'O‘yinchi').slice(0, 16), team: n.KT <= n.T ? 'KT' : 'T', id: -1, st: null };
    NET.peers.push(p);
    netBroadcast({ t: 'lobby', l: netLobbyList(), code: NET.code });
    netUI.render(); if (Snd.ctx) Snd.chime(true);
    if (NET.started) netSendStart(p); // joining a match in progress: a bot steps aside
    return;
  }
  if (!p || !NET.started) return;
  const b = agents.find(a => a.id === p.id); if (!b) return;
  if (d.t === 'st') { b.net = d; }
  else if (d.t === 'hit') {
    const v = agents.find(a => a.id === d.v), def = WEAPONS[d.w] || WEAPONS.knife;
    if (v && b.alive && v.alive && isFinite(d.d)) applyDamage(v, b, clamp(d.d, 0, 400), d.p === 'head' || d.p === 'legs' ? d.p : 'body', def, b.pos);
  } else if (d.t === 'sh') { netShowShot(b, d); netBroadcast({ t: 'sh', i: b.id, o: d.o, p: d.p, w: d.w }, conn); }
}
function netDropPeer(conn) {
  const i = NET.peers.findIndex(q => q.conn === conn); if (i < 0) return;
  const p = NET.peers[i]; NET.peers.splice(i, 1);
  const b = agents.find(a => a.id === p.id);
  if (b) { b.remote = null; b.net = null; b.name = b.name + ' (bot)'; if (!b.primary) dmLoadout(b); }
  netBroadcast({ t: 'lobby', l: netLobbyList(), code: NET.code });
  if (NET.started) showCenter(p.name, 'o‘yindan chiqdi — o‘rniga bot o‘ynaydi', '', 2);
  netUI.render();
}
// before the host's match starts: online play is deathmatch on a regular map
function netHostPrepare() {
  settings.mode = 'dm';
  document.querySelectorAll('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === 'dm')));
  if (MAP.pool) selectMap(mapPool('dm')[0].id);
  NET.started = true;
}
// the host's roster: each guest takes the place of a bot on their side
function netTeams(list, nextId) {
  if (NET.role === 'host') {
    for (const p of NET.peers) {
      let b = list.find(x => x.team === p.team && !x.remote);
      if (!b) { b = makeBot(p.name, p.team, nextId++); list.push(b); }
      b.remote = p; b.name = p.name; b.net = null; p.id = b.id;
    }
    return list;
  }
  // a guest sees everyone else as puppets moved by the host
  for (const b of list) disposeSoldier(b.model);
  NET.puppets.clear();
  const out = [];
  for (const r of NET.roster) {
    if (r.i === NET.myId) continue;
    const b = makeBot(r.n, r.t, r.i); b.puppet = true; b.tgt = new V3(); b.kind = '';
    out.push(b); NET.puppets.set(r.i, b);
  }
  return out;
}
function netRoster() {
  const r = agents.map(a => ({ i: a.id, n: a.isPlayer ? netName() : a.name, t: a.team }));
  return r;
}
function netSendStart(only) {
  const roster = netRoster();
  for (const p of only ? [only] : NET.peers) {
    if (p.id < 0) { // joined mid-match: take over a bot
      const b = bots.find(x => x.team === p.team && !x.remote) || bots.find(x => !x.remote);
      if (!b) continue;
      b.remote = p; b.name = p.name; p.team = b.team; p.id = b.id;
    }
    netSend(p.conn, { t: 'start', map: MAP.id, mode: game.mode, you: p.id, team: p.team, roster: netRoster(), time: game.timer, state: game.state });
  }
}
// ---------- guest ----------
async function netJoin(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (NET.role) return;
  if (code.length !== 5) { netUI.msg('Xona kodi 5 ta belgidan iborat.'); return; }
  netUI.msg('Ulanmoqda…');
  try { await netLoadLib(); } catch (e) { netUI.msg('Internet yo‘q yoki onlayn xizmat ochilmadi.'); return; }
  NET.role = 'client'; NET.code = code; NET.started = false;
  const peer = new Peer(); NET.peer = peer;
  peer.on('open', () => {
    const conn = peer.connect(NET_PREFIX + code, { reliable: true }); NET.host = conn;
    const to = setTimeout(() => { if (!conn.open) { netUI.msg('Xona topilmadi yoki ulanib bo‘lmadi.'); netLeave(true); } }, 15000);
    conn.on('open', () => { clearTimeout(to); netSend(conn, { t: 'hello', name: netName() }); netUI.msg(''); netUI.render(); });
    conn.on('data', d => netClientRecv(d));
    conn.on('close', () => netLost());
    conn.on('error', () => netLost());
  });
  peer.on('error', err => {
    if (NET.role !== 'client') return;
    netUI.msg(err.type === 'peer-unavailable' ? 'Bunday xona yo‘q. Kodni tekshiring.' : 'Ulanib bo‘lmadi: ' + (err.type || 'tarmoq xatosi'));
    if (!NET.started) netLeave(true);
  });
  netUI.render();
}
function netLost() {
  if (NET.role !== 'client') return;
  const was = NET.started;
  netLeave(true);
  if (was) { toMenu(); }
  netUI.msg('Xona egasi bilan aloqa uzildi.');
}
function netClientRecv(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'lobby') { NET.lobby = d.l; netUI.render(); return; }
  if (d.t === 'full') { netUI.msg('Xona to‘la.'); netLeave(true); return; }
  if (d.t === 'start') {
    NET.myId = d.you; NET.roster = d.roster; NET.started = true;
    settings.mode = d.mode; settings.team = d.team;
    if (MAP.id !== d.map) { settings.map = d.map; loadMap(d.map); buildRadarMap(); }
    els.over.hidden = true;
    startGame({ pointerType: input.touchMode || matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse' });
    game.state = d.state; game.timer = d.time;
    showCenter('Onlayn Deathmatch', 'Xona ' + NET.code + ' · ekranni bosib o‘yinni davom ettiring', '', 3);
    return;
  }
  if (!NET.started) return;
  if (d.t === 'snap') netApplySnap(d);
  else if (d.t === 'sh') { const a = netAgent(d.i); if (a && a !== player) netShowShot(a, d); }
  else if (d.t === 'hurt') { const a = netAgent(d.a); if (d.hp != null) { player.hp = d.hp; player.armor = d.ar || 0; } playerHurt(a && a !== player ? a : null, d.d, new V3(d.x, 0, d.z)); }
  else if (d.t === 'kill') {
    const v = netAgent(d.v), a = d.a >= 0 ? netAgent(d.a) : null, def = WEAPONS[d.w] || WEAPONS.knife; if (!v) return;
    addFeed(a || v, v, def, d.hs);
    if (v === player) { if (player.alive) { player.alive = false; player.hp = 0; player.deathT = 0; playerDied(a, def); } }
    else if (v.alive) { v.alive = false; v.model.fall = 0; v.model.marker.visible = false; v.model.flash.visible = false; }
    if (a === player && v !== player && typeof playerKillStreak === 'function') playerKillStreak(d.hs);
  } else if (d.t === 'spawn') {
    dmRespawn(player); player.pos.set(d.x, 0, d.z); player.yaw = d.yaw;
  } else if (d.t === 'end') { NET.started = false; game.score = d.sc; showMatchEnd(); }
}
function netApplySnap(d) {
  game.state = d.s; game.timer = d.tm; game.score = d.sc;
  for (const e of d.ag) {
    const [i, x, y, z, yaw, cr, alive, hp, kind, k, de] = e;
    if (i === NET.myId) {
      player.hp = hp; player.kills = k; player.deaths = de; player.armor = e[11] || 0;
      if (!alive && player.alive) { player.alive = false; player.hp = 0; playerDied(null, WEAPONS.knife); }
      continue;
    }
    const b = NET.puppets.get(i); if (!b) continue;
    b.kills = k; b.deaths = de; b.hp = hp;
    if (alive && !b.alive) { b.alive = true; b.pos.set(x, y, z); b.yaw = yaw; resetBotModel(b); }
    else if (!alive && b.alive) { b.alive = false; b.model.fall = 0; b.model.marker.visible = false; }
    if (!b.gotSnap) { b.gotSnap = true; b.pos.set(x, y, z); b.yaw = yaw; }
    b.tgt.set(x, y, z); b.tyaw = yaw; b.crouch = cr; b.kind = kind;
  }
}
// ---------- both sides ----------
const _nm = new V3();
function netShowShot(a, d) {
  const def = WEAPONS[d.w] || WEAPONS.ak47, to = new V3(d.p[0], d.p[1], d.p[2]);
  if (a.model && a.model.muzzle) { a.model.muzzle.getWorldPosition(_nm); tracer(_nm, to); a.model.flash.visible = true; a.model.flashT = 0.05; }
  const s = spatial(a.pos);
  if (def.melee) Snd.knife(); else Snd.shot(def.snd, s.vol, s.pan);
  a.lastShot = game.time;
  if (NET.role === 'host') alertHearing(a);
}
// every shot that anyone takes, so the others see the tracer and hear it
function netShot(a, from, to, def) {
  if (!netOn()) return;
  const msg = { t: 'sh', o: [r2(from.x), r2(from.y), r2(from.z)], p: [r2(to.x), r2(to.y), r2(to.z)], w: def.id };
  if (NET.role === 'client') { if (a === player) netSend(NET.host, msg); }
  else { msg.i = a.id; netBroadcast(msg); }
}
// guest: their bullets and grenades report hits to the host instead of dealing damage here
function netClientDamage(v, att, dmg, part, def) {
  if (att !== player || v === player || !v.alive || !isFinite(dmg)) return;
  netSend(NET.host, { t: 'hit', v: v.id, d: Math.round(dmg * 10) / 10, p: part, w: def.id });
  hitMarker(part === 'head'); Snd.hit(part === 'head');
}
// host: tell a guest they were hit, killed or respawned
function netHurt(v, att, d, from) {
  const src = (att && att.pos) || from || v.pos;
  netSend(v.remote.conn, { t: 'hurt', d, hp: Math.max(0, Math.round(v.hp)), ar: Math.round(v.armor || 0), a: att ? att.id : -1, x: r2(src.x), z: r2(src.z) });
}
function netKill(v, att, def, hs) { netBroadcast({ t: 'kill', v: v.id, a: att ? att.id : -1, w: def.id, hs: !!hs }); }
function netSpawn(a) { a.net = null; netSend(a.remote.conn, { t: 'spawn', x: r2(a.pos.x), z: r2(a.pos.z), yaw: r2(a.yaw + Math.PI) }); }
function netMatchEnd() {
  if (netHost()) { netBroadcast({ t: 'end', sc: game.score }); NET.started = false; }
}
// a guest (on the host) or anyone else (on a guest): follows the network instead of thinking
function netPuppet(b, dt) {
  const m = b.model;
  let tx, ty, tz, tyaw, cr, kind;
  if (b.remote) { const n = b.net; if (!n) return; tx = n.x; ty = n.y; tz = n.z; tyaw = n.yaw; cr = n.c; kind = n.w; }
  else { if (!b.gotSnap) return; tx = b.tgt.x; ty = b.tgt.y; tz = b.tgt.z; tyaw = b.tyaw; cr = b.crouch; kind = b.kind; }
  const ox = b.pos.x, oz = b.pos.z, k = Math.min(1, dt * 14);
  b.pos.x += (tx - b.pos.x) * k; b.pos.y += (ty - b.pos.y) * k; b.pos.z += (tz - b.pos.z) * k;
  if (tyaw != null) { let dy = tyaw - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * k; }
  b.crouch = cr || 0;
  const sp = Math.hypot(b.pos.x - ox, b.pos.z - oz) / Math.max(dt, 1e-3);
  b.moveSpeed = sp; if (sp > 0.5) b.walkPh += dt * sp * 1.9;
  if (kind && WEAPON_KINDS.has(kind)) setSoldierGun(m, kind);
  m.group.position.set(b.pos.x, b.pos.y, b.pos.z); m.group.rotation.y = b.yaw;
  poseSoldier(m, b.walkPh, Math.min(1, sp / 5), b.crouch, b.pos.y > 0.3 && sp > 0.1);
}
const WEAPON_KINDS = new Set(['usp', 'pistol', 'deagle', 'smg', 'ak', 'm4', 'awp', 'galil', 'famas', 'scout', 'p90', 'nova', 'p250', 'tec9', 'fiveseven', 'mac10', 'ump', 'aug', 'sg553', 'xm', 'negev',
  'knife', 'karambit', 'butterfly', 'bayonet', 'bowie', 'chust', 'stiletto', 'talon', 'he', 'flash', 'smoke', 'molotov', 'c4']);
// sending: guests 20 times a second, the host's snapshot 15 times a second
function netTick(dt) {
  if (!netOn()) return;
  if (NET.role === 'client') {
    NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = 0.05;
    const p = player, def = curDef();
    netSend(NET.host, { t: 'st', x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), yaw: r2(p.yaw + Math.PI), c: r2(p.crouch), w: skinModel(def.model, equippedSkin(def.id)) });
    return;
  }
  NET.snapT -= dt; if (NET.snapT > 0) return; NET.snapT = 1 / 15;
  const ag = agents.map(a => {
    const yaw = a.isPlayer ? a.yaw + Math.PI : a.yaw;
    const kind = a.isPlayer ? skinModel(curDef().model, equippedSkin(curDef().id)) : a.remote ? (a.net && a.net.w) || '' : a.model.gunKind;
    return [a.id, r2(a.pos.x), r2(a.pos.y || 0), r2(a.pos.z), r2(yaw), r2(a.crouch || 0), a.alive ? 1 : 0, Math.round(a.hp), kind, a.kills, a.deaths, Math.round(a.armor || 0)];
  });
  netBroadcast({ t: 'snap', s: game.state, tm: r2(game.timer), sc: game.score, ag });
}
function netLeave(quiet) {
  const wasHost = NET.role === 'host';
  try { if (NET.host) NET.host.close(); } catch (e) {}
  if (wasHost) for (const p of NET.peers) { try { p.conn.close(); } catch (e) {} }
  try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
  for (const a of agents) { if (a.remote) a.remote = null; }
  Object.assign(NET, { role: null, peer: null, host: null, peers: [], code: '', myId: -1, started: false, lobby: null });
  NET.puppets.clear();
  if (!quiet) netUI.msg('');
  netUI.render();
}
addEventListener('load', () => { try { netInitUI(); netUI.render(); } catch (e) {} });
// the host's tab in the background (browsers stop drawing hidden tabs): keep the match running for everyone
NET.lastFrame = performance.now();
setInterval(() => {
  if (!netHost() || performance.now() - NET.lastFrame < 250 || game.state === 'menu' || game.state === 'over') return;
  try { update(1 / 20); } catch (e) {}
}, 50);
