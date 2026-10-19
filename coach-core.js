/* Cavalier — coach : repère les fautes d'une partie, les range par thème, construit les solutions.
   Utilisé par le worker d'analyse et par le générateur de problèmes. */
(function (root) {
  'use strict';
  const { fromFen, toFen, legalMoves, pseudoMoves, makeMove, inCheck, isAttacked, colorOf, toUci, positionKey } = root.Chess;
  const { VALUE, MATE, evaluate, rootSearch, moveScore, isMate, mateIn } = root.Search;

  const enemy = (c) => (c === 'w' ? 'b' : 'w');
  const val = (p) => VALUE[p.toLowerCase()] + (p.toLowerCase() === 'k' ? 10000 : 0);

  // Matériel du point de vue de `color`, en centipions
  function balance(board, color) {
    let sum = 0;
    for (const p of board) if (p && p.toLowerCase() !== 'k') sum += (colorOf(p) === color ? 1 : -1) * VALUE[p.toLowerCase()];
    return sum;
  }
  function isEndgame(board) {
    let pieces = 0;
    for (const p of board) if (p && !'pk'.includes(p.toLowerCase())) pieces += VALUE[p.toLowerCase()];
    return pieces <= 1700;
  }
  // Captures possibles de la pièce posée sur `sq`
  function attacksFrom(s, sq) {
    const p = s.board[sq];
    return pseudoMoves({ ...s, turn: colorOf(p), ep: -1 }).filter((m) => m.from === sq && m.captured);
  }
  const defended = (board, sq) => isAttacked(board, sq, colorOf(board[sq]));

  // Après m, la pièce jouée attaque-t-elle au moins deux cibles qui rapportent ?
  function isFork(s, m) {
    const after = makeMove(s, m);
    const me = after.board[m.to];
    if (isAttacked(after.board, m.to, enemy(colorOf(me))) && !defended(after.board, m.to)) return false;
    const targets = attacksFrom(after, m.to).filter((t) => t.captured.toLowerCase() === 'k' || val(t.captured) > val(me) + 50 || !defended(after.board, t.to));
    return targets.length >= 2;
  }
  // Après m (pièce à longue portée), une pièce adverse est clouée ou enfilée devant une plus précieuse
  function isPin(s, m) {
    const after = makeMove(s, m);
    const me = after.board[m.to];
    const t = me.toLowerCase();
    if (!'brq'.includes(t)) return false;
    const dirs = [];
    if (t !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    if (t !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    const them = enemy(colorOf(me));
    for (const [dr, df] of dirs) {
      let r = (m.to >> 3) + dr, f = (m.to & 7) + df;
      const seen = [];
      while (r >= 0 && r < 8 && f >= 0 && f < 8 && seen.length < 2) {
        const p = after.board[r * 8 + f];
        if (p) seen.push(p);
        r += dr; f += df;
      }
      if (seen.length === 2 && seen.every((p) => colorOf(p) === them)) {
        const [a, b] = seen;
        if (val(b) > val(a) || val(a) > val(me) + 50) return true;
      }
    }
    return false;
  }
  // Prise d'une pièce sans défense, ou plus précieuse que celle qui prend
  function isFreeCapture(s, m) {
    if (!m.captured) return false;
    return !isAttacked(s.board, m.to, enemy(s.turn)) || VALUE[m.captured.toLowerCase()] > VALUE[m.piece.toLowerCase()] + 50;
  }

  // Qualifie une prise réellement jouée : gain conservé, contre-jeu concédé,
  // ou prise matérielle qui fait manquer un coup de conversion plus fort.
  function captureInsight(s, m, best, playedScore, q) {
    const loss = best.score - playedScore;
    const couldBeGood = loss <= 80 && playedScore >= 50;
    const couldBeRisky = loss >= 120;
    if (!couldBeGood && !couldBeRisky) return null;
    const after = makeMove(s, m);
    const reply = rootSearch(after, 2, q, null, 0)[0];
    const afterReply = reply ? makeMove(after, reply.m) : after;
    const net = balance(afterReply.board, s.turn) - balance(s.board, s.turn);
    const common = {
      played: toUci(m), captured: m.captured.toLowerCase(),
      best: toUci(best.m), reply: reply ? toUci(reply.m) : null,
      loss: Math.max(0, Math.round(loss)), score: Math.round(playedScore),
      netMaterial: Math.round(net), bestMate: isMate(best.score) && best.score > 0,
      mateInBest: isMate(best.score) && best.score > 0 ? mateIn(best.score) : null,
    };

    // Une prise qui reste proche du meilleur coup et conserve un gain matériel.
    if (couldBeGood && net >= 80) return { ...common, kind: 'advantageous' };

    if (loss < 120) return null;
    const givesCounterplay = reply && (
      net <= -100 || isFork(after, reply.m) || isPin(after, reply.m) || inCheck(afterReply)
    );
    if (givesCounterplay) return { ...common, kind: 'counterplay' };

    // En position favorable, signaler la prise qui remplace un coup non-capturant
    // nettement meilleur pour convertir l'avantage.
    if (!best.m.captured && best.score >= 200) return { ...common, kind: 'material-only' };
    return null;
  }

  const THEME_ORDER = ['mat', 'defense', 'prise', 'fourchette', 'clouage', 'tactique', 'finale'];

  // Thème d'une solution (coup gagnant à trouver)
  function themeOfSolution(s, line, score) {
    const first = line[0];
    if (isMate(score) && score > 0) return 'mat';
    if (isFork(s, first)) return 'fourchette';
    if (isPin(s, first)) return 'clouage';
    if (line.length === 1 && isFreeCapture(s, first)) return 'prise';
    if (isEndgame(s.board)) return 'finale';
    return 'tactique';
  }

  // Ligne de solution : coups du joueur et réponses adverses, jusqu'au mat ou au gain de matériel.
  // Renvoie null si un coup du joueur n'est pas clairement le seul bon.
  function buildLine(s, opts = {}) {
    const depth = opts.depth || 4, q = opts.q || 6, margin = opts.margin || 180;
    const me = s.turn, start = balance(s.board, me);
    const line = [];
    let cur = s, firstScore = null;
    for (let i = 0; i < 3; i++) {
      const r = rootSearch(cur, depth - (i ? 1 : 0), q, null, margin);
      if (!r.length) return null;
      const best = r[0];
      if (i === 0) firstScore = best.score;
      const second = r[1];
      const mates = isMate(best.score) && best.score > 0;
      // Sur le coup final d'un mat en 1, plusieurs mats sont acceptés par l'interface
      const lastMate = mates && mateIn(best.score) === 1;
      if (second && second.score > best.score - margin && !lastMate) return i === 0 ? null : (balance(cur.board, me) - start >= 200 ? { line, score: firstScore } : null);
      line.push(best.m);
      cur = makeMove(cur, best.m);
      if (!legalMoves(cur).length) return inCheck(cur) ? { line, score: firstScore } : null;
      const reply = rootSearch(cur, Math.max(1, depth - 2), q, null, 0)[0];
      const next = makeMove(cur, reply.m);
      if (!mates && balance(next.board, me) - start >= 200) return { line, score: firstScore };
      if (i === 2) return mates ? null : (balance(next.board, me) - start >= 200 ? { line, score: firstScore } : null);
      line.push(reply.m);
      cur = next;
    }
    return null;
  }

  const levelOf = (line, score) => {
    const n = Math.ceil(line.length / 2);
    if (isMate(score) && score > 0) return Math.min(3, mateIn(score));
    return Math.min(3, n);
  };

  // Analyse d'une partie : fautes du joueur `color`. moves = liste UCI depuis la position de départ.
  function analyseGame(moves, color, opts = {}) {
    const depth = opts.depth || 3, q = opts.q || 6;
    const states = [fromFen(root.Chess.START_FEN)];
    const played = [];
    for (const u of moves) {
      const s = states[states.length - 1];
      const m = legalMoves(s).find((x) => toUci(x) === u || toUci(x) === u + 'q');
      if (!m) break;
      played.push(m);
      states.push(makeMove(s, m));
    }
    const errors = [], captures = [];
    let checked = 0;
    for (let i = 0; i < played.length; i++) {
      const s = states[i];
      if (s.turn !== color) continue;
      checked++;
      const keys = states.slice(0, i).map(positionKey);
      const r = rootSearch(s, depth, q, keys, 60);
      if (r.length < 2) continue;
      const best = r[0];
      const pm = played[i];
      const sameAsBest = toUci(best.m) === toUci(pm);
      const ps = sameAsBest ? best.score : moveScore(s, pm, depth, q, keys);
      const loss = (isMate(best.score) && best.score > 0 && !(isMate(ps) && ps > 0)) ? 1000 : best.score - ps;
      let insight = null;
      if (pm.captured) {
        insight = captureInsight(s, pm, best, ps, q);
        if (insight) captures.push({ ply: i, fen: toFen(s), ...insight });
      }
      if (sameAsBest) continue;
      // Une partie déjà gagnée largement : on ne compte pas les imprécisions
      if (!isMate(best.score) && ps > 600) continue;
      if (loss < 180) continue;
      const theme = classifyError(s, pm, best, ps, q, insight && insight.kind);
      const sol = buildLine(s, { depth: depth + 1, q, margin: 150 });
      errors.push({
        ply: i, fen: toFen(s), played: toUci(pm), best: toUci(best.m), loss: Math.round(loss), theme,
        line: sol ? sol.line.map(toUci) : [toUci(best.m)],
        alts: sol ? [] : r.filter((x) => x.score >= best.score - 60).map((x) => toUci(x.m)),
        level: sol ? levelOf(sol.line, sol.score) : 1,
      });
    }
    return { checked, errors, captures };
  }

  function classifyError(s, pm, best, playedScore, q, captureKind) {
    if (isMate(best.score) && best.score > 0) return 'mat';
    if (isMate(playedScore) && playedScore < 0) return 'defense';
    const after = makeMove(s, pm);
    const reply = rootSearch(after, 2, q, null, 0)[0];
    const captureHasOwnCategory = captureKind === 'counterplay' || captureKind === 'material-only';
    if (reply) {
      if (isFork(after, reply.m)) return 'fourchette';
      if (isPin(after, reply.m)) return 'clouage';
      if (!captureHasOwnCategory && isFreeCapture(after, reply.m)) return 'prise';
    }
    if (isFork(s, best.m)) return 'fourchette';
    if (isPin(s, best.m)) return 'clouage';
    if (!captureHasOwnCategory && isFreeCapture(s, best.m)) return 'prise';
    if (isEndgame(s.board)) return 'finale';
    return 'tactique';
  }

  // Problème défensif : l'adversaire menace un mat, très peu de coups le parent
  function defenseProblem(s, depth = 4, q = 4) {
    if (inCheck(s)) return null;
    const pass = { ...s, turn: enemy(s.turn), ep: -1 };
    if (inCheck(pass, s.turn)) return null;
    const threat = rootSearch(pass, 3, 0, null, 0)[0];
    if (!threat || !(isMate(threat.score) && threat.score > 0)) return null;
    const r = rootSearch(s, depth, q, null, 2 * MATE);
    const saving = r.filter((x) => x.score > -(MATE - 200) && x.score > -300);
    if (saving.length < 1 || saving.length > 4 || r.length < 6) return null;
    return { line: [saving[0].m], alts: saving.map((x) => toUci(x.m)), level: mateIn(threat.score) >= 2 ? 2 : 1, threat: toUci(threat.m) };
  }

  // Détail d'une faute pour les astuces : as-tu manqué le motif, ou l'as-tu laissé à l'adversaire ?
  // kind : 'missed' | 'allowed' ; piece : pièce concernée ; punish : meilleure réponse adverse après ton coup
  function explainError(fen, playedUci, bestUci, theme, q = 6) {
    const s = fromFen(fen);
    const legal = legalMoves(s);
    const pm = legal.find((m) => toUci(m) === playedUci || toUci(m) === playedUci + 'q');
    const bm = legal.find((m) => toUci(m) === bestUci || toUci(m) === bestUci + 'q');
    if (!pm || !bm) return null;
    const after = makeMove(s, pm);
    const replies = rootSearch(after, 2, q, null, 0);
    const punish = replies.length ? replies[0].m : null;
    const me = s.turn;
    let kind = 'missed';
    if (theme === 'defense') kind = 'allowed';
    else if (theme === 'mat') kind = 'missed';
    else if (punish && (isFork(after, punish) || isPin(after, punish) || isFreeCapture(after, punish))) {
      const bestIsMotif = isFork(s, bm) || isPin(s, bm) || (bm.captured && isFreeCapture(s, bm));
      kind = bestIsMotif ? 'missed' : 'allowed';
    } else if (punish && punish.captured && balance(after.board, me) - balance(makeMove(after, punish).board, me) >= 200) kind = 'allowed';
    // pièce concernée
    let piece = bm.piece.toLowerCase();
    if (kind === 'allowed' && punish) {
      const hit = makeMove(after, punish);
      const targets = attacksFrom(hit, punish.to).map((t) => t.captured.toLowerCase());
      if (punish.captured) targets.push(punish.captured.toLowerCase());
      const own = targets.filter((t) => t !== 'k').sort((x, y) => VALUE[y] - VALUE[x]);
      piece = own[0] || (targets.includes('k') ? 'k' : pm.piece.toLowerCase());
    } else if (kind === 'missed' && bm.captured && theme === 'prise') piece = bm.captured.toLowerCase();
    return {
      kind, piece,
      punish: punish ? toUci(punish) : null,
      phase: isEndgame(s.board) ? 'finale' : (s.full || 1) <= 12 ? 'ouverture' : 'milieu',
      key: positionKey(s),
    };
  }

  root.Coach = { explainError, THEME_ORDER, analyseGame, buildLine, themeOfSolution, defenseProblem, levelOf, balance, isFork, isPin, isFreeCapture, isEndgame };
})(typeof self !== 'undefined' ? self : globalThis);
