'use strict';
// ---------- Rank, Prime and the leaderboard (kept in this browser) ----------
// [name, rating needed, colour]
const RANKS = [
  ['Bronza I', 0, '#a0683a'], ['Bronza II', 850, '#b0743f'], ['Bronza III', 950, '#c08048'],
  ['Kumush I', 1050, '#9aa4ad'], ['Kumush II', 1150, '#adb7c0'], ['Kumush III', 1250, '#c3ccd4'],
  ['Oltin I', 1350, '#c9a227'], ['Oltin II', 1450, '#d8b13a'], ['Oltin III', 1550, '#e6c14f'],
  ['Platina I', 1650, '#4fb3bf'], ['Platina II', 1750, '#5fc9d6'],
  ['Olmos I', 1850, '#6f8cff'], ['Olmos II', 1950, '#8aa0ff'],
  ['Afsona', 2100, '#c45cff'], ['Qumtepa Qiroli', 2300, '#ff4f5e']
];
const LEVEL_XP = 500, PRIME_LEVEL = 5;
const PROFILE = (() => {
  const s = store.get('kq_profile', null) || {};
  return {
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 16) : 'O‘yinchi',
    rating: Number.isFinite(+s.rating) && s.rating ? +s.rating : 1000, best: +s.best || 1000,
    xp: +s.xp || 0, wins: +s.wins || 0, losses: +s.losses || 0, matches: +s.matches || 0
  };
})();
const saveProfile = () => store.set('kq_profile', PROFILE);
const rankOf = r => { let k = RANKS[0]; for (const x of RANKS) if (r >= x[1]) k = x; return k; };
const levelOf = xp => 1 + Math.floor(xp / LEVEL_XP);
const isPrime = () => levelOf(PROFILE.xp) >= PRIME_LEVEL;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rankBadge = r => { const [n, , c] = rankOf(r); return `<span class="rk" style="--rk:${c}"><i></i>${n}</span>`; };
const primeBadge = () => isPrime() ? '<span class="prime">★ PRIME</span>' : '';

// After a match: rating up for a win, down for a loss; kills, deaths and difficulty move it a little.
// won: true / false / null (draw)
function applyMatchResult(won, kills, deaths) {
  if (game.mode === 'practice') return null;
  const before = PROFILE.rating, lvl0 = levelOf(PROFILE.xp), prime0 = isPrime();
  const perf = clamp(kills - deaths, -6, 10), diff = settings.diff * 3;
  const weight = game.mode === 'comp' ? 1 : 0.7;
  let delta = won === null ? 2 : won ? 24 + perf + diff : -(20 - Math.max(-4, Math.min(8, perf)) - diff * 0.5);
  delta = Math.round(clamp(delta, -26, 42) * weight);
  PROFILE.rating = Math.max(0, before + delta); PROFILE.best = Math.max(PROFILE.best, PROFILE.rating);
  PROFILE.matches++; if (won) PROFILE.wins++; else if (won === false) PROFILE.losses++;
  const xp = kills * 10 + (won ? 150 : 50); PROFILE.xp += xp;
  saveProfile(); renderProfile();
  return { before, after: PROFILE.rating, delta, xp, rankUp: rankOf(PROFILE.rating) !== rankOf(before) && delta > 0, rankDown: rankOf(PROFILE.rating) !== rankOf(before) && delta < 0,
    levelUp: levelOf(PROFILE.xp) > lvl0, primeNew: isPrime() && !prime0 };
}

// AI rivals: their ratings move a little every day, so the ladder stays alive
const RIVALS = ['Qumtepa_Sher', 'AWP_Ustasi', 'Headshot_UZ', 'Toshkent_Boss', 'Samarqand_Burgut', 'Buxoro_Ninja', 'Xorazm_Lochin', 'Fargona_Tulpor',
  'Namangan_Snayper', 'Andijon_Bars', 'Shoxrux_07', 'Bekzod_Pro', 'Azizbek', 'Jasur_AK', 'Sardor', 'Doniyor_M4', 'Ulugbek_Rasad', 'Javohir', 'Otabek_Deagle',
  'Diyorbek', 'Nodir_Tez', 'Temur_Lion', 'Islom', 'Akmal_Spray', 'Behruz', 'Sanjar', 'Kamron_Flick', 'Abdulloh', 'Firdavs', 'Dilshod_Clutch',
  'Rustam', 'Mirjalol', 'Asadbek_Ace', 'Xurshid', 'Laziz', 'Sherzod_Usta', 'Ibrohim', 'Umid', 'Registon_Qorovul', 'Chust_Pichoq'];
function rivalRating(name) {
  let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const day = Math.floor(Date.now() / 864e5);
  return Math.round(780 + (h % 1500) + Math.sin(day * 0.37 + h) * 45 + ((day * 13 + h) % 23));
}
function leaderboard() {
  return [...RIVALS.map(n => ({ name: n, rating: rivalRating(n), ai: true })), { name: PROFILE.name, rating: PROFILE.rating, me: true }]
    .sort((a, b) => b.rating - a.rating).map((r, i) => Object.assign(r, { pos: i + 1 }));
}

// ---- menu card and the leaderboard panel ----
function renderProfile() {
  const lvl = levelOf(PROFILE.xp), into = PROFILE.xp % LEVEL_XP;
  document.getElementById('pfRank').innerHTML = rankBadge(PROFILE.rating) + primeBadge();
  document.getElementById('pfChipRank').innerHTML = rankBadge(PROFILE.rating) + primeBadge();
  document.getElementById('pfChipName').textContent = PROFILE.name;
  document.getElementById('pfStats').textContent = `Reyting ${PROFILE.rating} · ${PROFILE.wins} g‘alaba / ${PROFILE.matches} o‘yin`;
  document.getElementById('pfLvl').textContent = `Daraja ${lvl}${isPrime() ? '' : ` · Prime: ${PRIME_LEVEL}-daraja`}`;
  document.getElementById('pfBar').style.width = (into / LEVEL_XP * 100).toFixed(1) + '%';
  const me = leaderboard().find(r => r.me);
  document.getElementById('pfPos').textContent = `#${me.pos}`;
}
(() => {
  const name = document.getElementById('pfName'), panel = document.getElementById('rankPanel');
  name.value = PROFILE.name;
  name.addEventListener('change', () => { PROFILE.name = name.value.trim().slice(0, 16) || 'O‘yinchi'; name.value = PROFILE.name; saveProfile(); renderProfile(); });
  name.addEventListener('keydown', e => e.stopPropagation());
  document.getElementById('pfBoard').addEventListener('click', () => {
    const rows = leaderboard();
    document.getElementById('rankList').innerHTML = rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td>${r.pos}</td><td>${esc(r.name)}${r.me ? ' (siz)' : ''}</td><td>${rankBadge(r.rating)}</td><td>${r.rating}</td></tr>`).join('');
    panel.hidden = false;
    const me = panel.querySelector('tr.me'); if (me) me.scrollIntoView({ block: 'center' });
  });
  document.getElementById('rankClose').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('rankTiers').innerHTML = RANKS.map(([n, r, c]) => `<span class="rk" style="--rk:${c}"><i></i>${n} <small>${r}+</small></span>`).join('');
  renderProfile();
})();
