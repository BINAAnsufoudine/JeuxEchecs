/* Cavalier — cache hors ligne */
const CACHE = 'cavalier-v510';
// Ne précacher que les fichiers effectivement présents : un seul fichier absent
// fait échouer addAll et empêche toute installation du service worker.
const FILES = ['./', 'index.html', 'style.css', 'button-icons.js', 'engine.js', 'pgn.js', 'app.js', 'otb.js', 'ai-worker.js', 'search.js', 'coach-core.js', 'analyse-worker.js', 'puzzles.js', 'lichess_puzzles.js', 'i18n.js', 'lessons.js', 'champions.js', 'trainer.js', 'online.js', 'sissa/sissa.jpg', 'sissa/sissa-face.jpg', 'sissa/legende-1.jpg', 'sissa/legende-2.jpg', 'sissa/legende-3.jpg', 'sissa/legende-4.jpg', 'sissa/legende-5.jpg', 'sissa/montagne-de-riz.jpg', 'characters.js', 'board3d.js', 'models3d.js', 'ocean3d.js', 'themes3d.js', 'warriors3d.js', 'auras3d.js', 'sabres3d.js', 'baobabs3d.js', 'dinos3d.js', 'fond_ecran/kingdom.png', 'fond_ecran/wood.png', 'fond_ecran/ocean.webp', 'fond_ecran/plants.webp', 'fond_ecran/land.webp', 'fond_ecran/birds.webp', 'fond_ecran/ninjas.webp', 'fond_ecran/ancient.webp', 'fond_ecran/modern.webp', 'fond_ecran/auras.webp', 'fond_ecran/sabres.webp', 'fond_ecran/baobabs.webp', 'fond_ecran/dinos.webp', 'fond_ecran/banniere/ninjas.webp', 'fond_ecran/banniere/ocean.webp', 'fond_ecran/banniere/plants.webp', 'fond_ecran/banniere/land.webp', 'fond_ecran/banniere/birds.webp', 'fond_ecran/banniere/ancient.webp', 'fond_ecran/banniere/modern.webp', 'fond_ecran/banniere/auras.webp', 'fond_ecran/banniere/sabres.webp', 'fond_ecran/banniere/baobabs.webp', 'fond_ecran/banniere/dinos.webp', 'fond_ecran/mini/ninjas.webp', 'fond_ecran/mini/ocean.webp', 'fond_ecran/mini/plants.webp', 'fond_ecran/mini/land.webp', 'fond_ecran/mini/birds.webp', 'fond_ecran/mini/ancient.webp', 'fond_ecran/mini/modern.webp', 'fond_ecran/mini/auras.webp', 'fond_ecran/mini/sabres.webp', 'fond_ecran/mini/baobabs.webp', 'fond_ecran/mini/dinos.webp', 'stockfish.js', 'stockfish.wasm', 'vendor/three.min.js', 'icon.svg', 'manifest.json', 'logo/logo-32.png', 'logo/logo-180.png', 'logo/logo-192.png', 'logo/logo-512.png', 'logo/logo-maskable-512.png',
  'champions/steinitz.jpg', 'champions/lasker.jpg', 'champions/capablanca.jpg', 'champions/alekhine.jpg', 'champions/tal.jpg', 'champions/petrosian.jpg', 'champions/fischer.jpg', 'champions/karpov.jpg', 'champions/kasparov.jpg', 'champions/carlsen.jpg'];
// Fichiers lourds qui changent rarement (moteur Stockfish, three.js, problèmes, images) : gardés dans un cache
// qui survit aux mises à jour de l'appli, servis tout de suite depuis ce cache et rafraîchis en arrière-plan.
// Avant, chaque nouvelle version retéléchargeait tout (environ 10 Mo, dont 7 Mo de moteur).
const HEAVY = 'cavalier-lourd-v1';
// Les images ont leur propre cache : le changer ne redemande pas le moteur. Une image remplacée se publie avec un nouveau ?v=
const IMAGES = 'cavalier-images-v1';
const isImage = (url) => /\.(jpg|jpeg|png|webp|svg)(\?|$)/.test(url);
const isHeavy = (url) => isImage(url) || /(stockfish\.(wasm|js)|three\.min\.js|lichess_puzzles\.js|puzzles\.js)(\?|$)/.test(url);
// « no-cache » : le navigateur redemande le fichier mais n'en reçoit pas le contenu s'il n'a pas changé (réponse 304)
const revalidate = (req) => new Request(req, { cache: 'no-cache' });
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(CACHE), heavy = await caches.open(HEAVY), images = await caches.open(IMAGES);
    await Promise.all(FILES.map(async (f) => {
      const req = new Request(f);
      const big = isImage(req.url) ? images : heavy;
      if (isHeavy(req.url)) { if (!(await big.match(req))) await big.add(revalidate(req)); }
      else await shell.add(revalidate(req));
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== HEAVY && k !== IMAGES).map((k) => caches.delete(k)));
    // anciennes images restées avec le moteur : elles cachaient les images remplacées
    const heavy = await caches.open(HEAVY);
    await Promise.all((await heavy.keys()).filter((r) => isImage(r.url)).map((r) => heavy.delete(r)));
    await self.clients.claim();
  })());
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
    const image = isImage(e.request.url);
    e.respondWith(caches.open(image ? IMAGES : HEAVY).then(async (c) => {
      // image : la version exacte demandée (?v=), l'ancienne seulement hors ligne
      const hit = await c.match(e.request, { ignoreSearch: !image });
      const update = fetch(revalidate(e.request)).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
      if (hit) { e.waitUntil(update.catch(() => {})); return hit; }
      return image ? update.catch(async (error) => (await c.match(e.request, { ignoreSearch: true })) || Promise.reject(error)) : update;
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
