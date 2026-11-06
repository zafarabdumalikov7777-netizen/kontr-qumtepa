// UZB Strike — offline support. Network first (so updates arrive at once), cache as the fallback.
const CACHE = 'kontr-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'js/agents.js', 'js/bomb.js', 'js/caseui.js', 'js/core.js', 'js/crosshair.js', 'js/drops.js', 'js/extras.js', 'js/fx.js', 'js/game.js', 'js/guns.js', 'js/icons.js', 'js/inspect.js', 'js/maps.js', 'js/models.js', 'js/modes.js', 'js/mods.js', 'js/rank.js', 'js/skins.js', 'js/textures.js', 'js/touch.js', 'js/utility.js', 'js/world.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
