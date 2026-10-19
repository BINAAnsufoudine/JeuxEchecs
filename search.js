/* Cavalier — recherche partagée : évaluation, alpha-bêta, quiescence (IA, analyse, problèmes). */
const { fromFen, legalMoves, makeMove, inCheck, toUci, positionKey } = self.Chess;

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Tables de position (vue des blancs, case 0 = a8)
const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  kEnd: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
      -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
};

// Score du point de vue du joueur au trait
function evaluate(s) {
  let score = 0, material = 0;
  for (const p of s.board) if (p && p.toLowerCase() !== 'p' && p.toLowerCase() !== 'k') material += VALUE[p.toLowerCase()];
  const endgame = material <= 2600;
  for (let i = 0; i < 64; i++) {
    const p = s.board[i];
    if (!p) continue;
    const t = p.toLowerCase();
    const white = p !== t;
    const idx = white ? i : (7 - (i >> 3)) * 8 + (i & 7);
    const table = t === 'k' && endgame ? PST.kEnd : PST[t];
    const v = VALUE[t] + table[idx];
    score += white ? v : -v;
  }
  return s.turn === 'w' ? score : -score;
}

const MATE = 100000;
let deadline = 0, nodes = 0, stopped = false;

function order(moves) {
  return moves.sort((a, b) => {
    const sa = (a.captured ? 10 * VALUE[a.captured.toLowerCase()] - VALUE[a.piece.toLowerCase()] : -10000) + (a.promo ? 8000 : 0);
    const sb = (b.captured ? 10 * VALUE[b.captured.toLowerCase()] - VALUE[b.piece.toLowerCase()] : -10000) + (b.promo ? 8000 : 0);
    return sb - sa;
  });
}

function quiesce(s, alpha, beta, depth) {
  // La recherche tactique peut s'étendre bien au-delà de la profondeur normale.
  // Respecte aussi la limite de temps pendant cette phase.
  if ((++nodes & 255) === 0 && Date.now() > deadline) stopped = true;
  if (stopped) return 0;
  const checked = inCheck(s);
  if (!checked) {
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
  } else if (depth < -8) return evaluate(s);
  const moves = legalMoves(s);
  if (!moves.length) return checked ? -MATE : 0;
  const candidates = order(checked ? moves : moves.filter((m) => m.captured || m.promo));
  for (const m of candidates) {
    const score = -quiesce(makeMove(s, m), -beta, -alpha, depth - 1);
    if (stopped) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(s, depth, alpha, beta, ply, seen, qDepth) {
  if ((++nodes & 255) === 0 && Date.now() > deadline) stopped = true;
  if (stopped) return 0;
  if (ply > 0) {
    const key = positionKey(s);
    if (seen.has(key) || s.half >= 100) return 0;
  }
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
  if (depth <= 0) return qDepth > 0 ? quiesce(s, alpha, beta, qDepth) : evaluate(s);
  order(moves);
  const key = positionKey(s);
  seen.add(key);
  for (const m of moves) {
    const score = -search(makeMove(s, m), depth - 1, -beta, -alpha, ply + 1, seen, qDepth);
    if (stopped) break;
    if (score >= beta) { seen.delete(key); return beta; }
    if (score > alpha) alpha = score;
  }
  seen.delete(key);
  return alpha;
}


const isMate = (score) => Math.abs(score) > MATE - 200;
// Nombre de coups du camp gagnant jusqu'au mat (score vu du joueur au trait)
const mateIn = (score) => Math.ceil((MATE - Math.abs(score)) / 2);

// Note chaque coup à la racine. Les coups à moins de `margin` du meilleur ont un score exact,
// les autres une borne haute (ils sont de toute façon plus faibles de `margin` au moins).
function rootSearch(s, depth, q, seenKeys, margin = 0, timeMs = 60000) {
  deadline = Date.now() + timeMs; stopped = false; nodes = 0;
  const seen = new Set(seenKeys || []);
  seen.delete(positionKey(s));
  const moves = order(legalMoves(s));
  let best = -Infinity;
  const out = [];
  for (const m of moves) {
    const lo = best === -Infinity ? -Infinity : best - margin - 1;
    const score = -search(makeMove(s, m), depth - 1, -Infinity, -lo, 1, seen, q);
    out.push({ m, score });
    if (score > best) best = score;
  }
  return out.sort((a, b) => b.score - a.score);
}

// Score exact d'un coup donné
function moveScore(s, m, depth, q, seenKeys) {
  deadline = Date.now() + 60000; stopped = false;
  const seen = new Set(seenKeys || []);
  return -search(makeMove(s, m), depth - 1, -Infinity, Infinity, 1, seen, q);
}

self.Search = { VALUE, MATE, evaluate, order, rootSearch, moveScore, isMate, mateIn };
