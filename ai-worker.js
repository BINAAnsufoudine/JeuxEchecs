/* Cavalier — IA : alpha-bêta + quiescence, approfondissement itératif. */
importScripts('engine.js', 'search.js');

// 22 niveaux (au-delà de 1320 Elo, l'app utilise Stockfish bridé à l'Elo du niveau) : profondeur max, temps (ms), quiescence, marge d'erreur volontaire, part de coups au hasard
const LEVELS = [null,
  // Débutant 1-3 et Facile 1 : réglés par matchs en chaîne (≈150 Elo d'écart chacun) à partir de Facile 2 ≈ 900,
  // lui-même mesuré contre Stockfish bridé à 1320 Elo
  { depth: 1, time: 300, q: 1, noise: 260, blunder: 0.18 },
  { depth: 1, time: 300, q: 1, noise: 240, blunder: 0.11 },
  { depth: 2, time: 400, q: 2, noise: 210, blunder: 0.14 },
  // Facile 1-3
  { depth: 2, time: 450, q: 2, noise: 190, blunder: 0.11 },
  { depth: 2, time: 500, q: 2, noise: 160, blunder: 0.08 },
  { depth: 2, time: 600, q: 3, noise: 120, blunder: 0.05 },
  // Intermédiaire 1-3
  { depth: 3, time: 800, q: 4, noise: 90, blunder: 0.03 },
  { depth: 3, time: 1000, q: 4, noise: 70, blunder: 0.02 },
  { depth: 3, time: 1200, q: 5, noise: 50, blunder: 0 },
  // Difficile 1-3
  { depth: 4, time: 1500, q: 6, noise: 35, blunder: 0 },
  { depth: 4, time: 1700, q: 6, noise: 25, blunder: 0 },
  { depth: 4, time: 2000, q: 6, noise: 15, blunder: 0 },
  // Expert 1-3
  { depth: 5, time: 2000, q: 6, noise: 10, blunder: 0 },
  { depth: 5, time: 2300, q: 8, noise: 5, blunder: 0 },
  { depth: 5, time: 2600, q: 8, noise: 0, blunder: 0 },
  // Maître 1-3
  { depth: 6, time: 2800, q: 8, noise: 0, blunder: 0 },
  { depth: 6, time: 3200, q: 8, noise: 0, blunder: 0 },
  { depth: 6, time: 3600, q: 8, noise: 0, blunder: 0 },
  // Grand maître 1-3
  { depth: 7, time: 4000, q: 8, noise: 0, blunder: 0 },
  { depth: 7, time: 5000, q: 8, noise: 0, blunder: 0 },
  { depth: 8, time: 6000, q: 8, noise: 0, blunder: 0 },
  // Champion
  { depth: 9, time: 8000, q: 10, noise: 0, blunder: 0 },
];

function bestMove(fen, history, level) {
  const cfg = LEVELS[level] || LEVELS[5];
  const s = fromFen(fen);
  const seen = new Set(history || []);
  seen.delete(positionKey(s));
  let moves = order(legalMoves(s));
  if (!moves.length) return null;
  // Les petits niveaux jouent parfois un coup au hasard
  if (cfg.blunder && Math.random() < cfg.blunder) return toUci(moves[Math.floor(Math.random() * moves.length)]);
  deadline = Date.now() + cfg.time;
  stopped = false; nodes = 0;
  let best = moves[0];
  let scored = moves.map((m) => ({ m, score: 0 }));
  for (let d = 1; d <= cfg.depth; d++) {
    const results = [];
    let alpha = -Infinity;
    for (const { m } of scored) {
      // Fenêtre élargie pour garder des scores comparables entre coups (bruit volontaire)
      const lower = cfg.noise ? -Infinity : alpha;
      const score = -search(makeMove(s, m), d - 1, -Infinity, -lower, 1, seen, cfg.q);
      if (stopped) break;
      results.push({ m, score });
      if (score > alpha) alpha = score;
    }
    if (stopped && results.length < scored.length) {
      // Itération incomplète : on garde le meilleur trouvé s'il bat l'ancien
      if (results.length && results[0].score >= scored[0].score) {
        const rest = scored.filter((x) => !results.some((r) => r.m === x.m));
        scored = results.sort((a, b) => b.score - a.score).concat(rest);
      }
      break;
    }
    scored = results.sort((a, b) => b.score - a.score);
    if (Math.abs(scored[0].score) > MATE - 100) break;
    if (Date.now() > deadline) break;
  }
  if (cfg.noise) {
    const top = scored[0].score;
    const pool = scored.filter((x) => x.score >= top - cfg.noise);
    best = pool[Math.floor(Math.random() * pool.length)].m;
  } else best = scored[0].m;
  return toUci(best);
}

self.onmessage = (e) => {
  const { id, fen, history, level } = e.data;
  self.postMessage({ id, move: bestMove(fen, history, level) });
};
