/* Cavalier — cache hors ligne */
const CACHE = 'cavalier-v413';
// Ne précacher que les fichiers effectivement présents : un seul fichier absent
// fait échouer addAll et empêche toute installation du service worker.
const FILES = ['./', 'index.html', 'style.css', 'button-icons.js', 'engine.js', 'pgn.js', 'app.js', 'ai-worker.js', 'search.js', 'coach-core.js', 'analyse-worker.js', 'puzzles.js', 'lichess_puzzles.js', 'i18n.js', 'lessons.js', 'champions.js', 'trainer.js', 'online.js', 'sissa/sissa.jpg', 'sissa/sissa-face.jpg', 'sissa/legende-1.jpg', 'sissa/legende-2.jpg', 'sissa/legende-3.jpg', 'sissa/legende-4.jpg', 'sissa/legende-5.jpg', 'sissa/montagne-de-riz.jpg', 'characters.js', 'board3d.js', 'models3d.js', 'ocean3d.js', 'themes3d.js', 'warriors3d.js', 'fond_ecran/ocean.webp', 'fond_ecran/plants.webp', 'fond_ecran/land.webp', 'fond_ecran/birds.webp', 'fond_ecran/ninjas.webp', 'fond_ecran/ancient.webp', 'fond_ecran/modern.webp', 'stockfish.js', 'stockfish.wasm', 'vendor/three.min.js', 'icon.svg', 'manifest.json', 'logo/logo-32.png', 'logo/logo-180.png', 'logo/logo-192.png', 'logo/logo-512.png', 'logo/logo-maskable-512.png',
  'champions/steinitz.jpg', 'champions/lasker.jpg', 'champions/capablanca.jpg', 'champions/alekhine.jpg', 'champions/tal.jpg', 'champions/petrosian.jpg', 'champions/fischer.jpg', 'champions/karpov.jpg', 'champions/kasparov.jpg', 'champions/carlsen.jpg'];
// Fichiers lourds qui changent rarement (moteur Stockfish, three.js, problèmes, images) : gardés dans un cache
// qui survit aux mises à jour de l'appli, servis tout de suite depuis ce cache et rafraîchis en arrière-plan.
// Avant, chaque nouvelle version retéléchargeait tout (environ 10 Mo, dont 7 Mo de moteur).
const HEAVY = 'cavalier-lourd-v1';
const isHeavy = (url) => /(stockfish\.(wasm|js)|three\.min\.js|lichess_puzzles\.js|puzzles\.js|\.(jpg|jpeg|png|webp|svg))(\?|$)/.test(url);
// « no-cache » : le navigateur redemande le fichier mais n'en reçoit pas le contenu s'il n'a pas changé (réponse 304)
const revalidate = (req) => new Request(req, { cache: 'no-cache' });
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(CACHE), heavy = await caches.open(HEAVY);
    await Promise.all(FILES.map(async (f) => {
      const req = new Request(f);
      if (isHeavy(req.url)) { if (!(await heavy.match(req))) await heavy.add(revalidate(req)); }
      else await shell.add(revalidate(req));
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== HEAVY).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Clic sur une notification (à toi de jouer, invitation, tournoi) : on ramène l'appli au premier plan
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c);
    return open ? open.focus() : self.clients.openWindow('./');
  }));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  if (isHeavy(e.request.url)) {
    // cache d'abord, mise à jour discrète pour la prochaine fois
    e.respondWith(caches.open(HEAVY).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const update = fetch(revalidate(e.request)).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
      if (hit) { e.waitUntil(update.catch(() => {})); return hit; }
      return update;
    }));
    return;
  }
  // Le reste (pages, scripts, styles) : réseau d'abord, pour avoir toujours la dernière version, puis cache hors ligne
  const fresh = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache' }) : revalidate(e.request);
  e.respondWith(fetch(fresh).then((response) => {
    if (response.ok) e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, response.clone())));
    return response;
  }).catch((error) => caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    throw error;
  })));
});
