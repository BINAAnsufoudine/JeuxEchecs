/* Cavalier — cache hors ligne */
const CACHE = 'cavalier-v127';
// Ne précacher que les fichiers effectivement présents : un seul fichier absent
// fait échouer addAll et empêche toute installation du service worker.
const FILES = ['./', 'index.html', 'style.css', 'engine.js', 'app.js', 'ai-worker.js', 'search.js', 'coach-core.js', 'analyse-worker.js', 'puzzles.js', 'lessons.js', 'champions.js', 'characters.js', 'board3d.js', 'models3d.js', 'stockfish.js', 'stockfish.wasm', 'vendor/three.min.js', 'icon.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Une navigation ne peut pas être recopiée avec des options : on refait la requête à partir de son adresse
  const fresh = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'reload' }) : new Request(e.request, { cache: 'reload' });
  e.respondWith(fetch(fresh).then((response) => {
    if (response.ok) e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, response.clone())));
    return response;
  }).catch((error) => caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    throw error;
  })));
});
