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

  // Langue de l'interface (le worker charge aussi i18n.js)
  const EN = root.LANG === 'en';
  const OPENINGS_EN = {
    'Partie espagnole (Ruy Lopez)': 'Spanish Game (Ruy Lopez)', 'Partie italienne': 'Italian Game', 'Partie écossaise': 'Scotch Game',
    'Défense russe (Petrov)': 'Russian Defense (Petrov)', 'Défense Philidor': 'Philidor Defense', 'Partie des quatre cavaliers': 'Four Knights Game',
    'Gambit du roi': "King's Gambit", 'Partie viennoise': 'Vienna Game', 'Partie du pion roi (jeu ouvert)': "King's Pawn Game (open game)",
    'Défense sicilienne': 'Sicilian Defense', 'Défense française': 'French Defense', 'Défense Caro-Kann': 'Caro-Kann Defense',
    'Défense scandinave': 'Scandinavian Defense', 'Défense Pirc': 'Pirc Defense', 'Défense Alekhine': "Alekhine's Defense",
    'Défense moderne': 'Modern Defense', 'Partie du pion roi': "King's Pawn Game",
    'Gambit dame refusé': "Queen's Gambit Declined", 'Gambit dame accepté': "Queen's Gambit Accepted", 'Gambit dame': "Queen's Gambit",
    'Défense slave': 'Slav Defense', 'Défense est-indienne': "King's Indian Defense", 'Défense nimzo-indienne': 'Nimzo-Indian Defense',
    'Défense indienne': 'Indian Defense', 'Défense hollandaise': 'Dutch Defense', 'Partie de la dame': "Queen's Pawn Game (d5)", 'Partie du pion dame': "Queen's Pawn Game",
    'Partie anglaise': 'English Opening', 'Partie Réti': 'Réti Opening', 'Attaque Bird': "Bird's Opening", 'Ouverture Larsen': "Larsen's Opening",
    'Ouverture du fianchetto roi': "King's Fianchetto Opening", 'Ouverture Dunst': 'Dunst Opening',
  };
  // Ouvertures reconnues (coups UCI) ; la plus longue séquence commune gagne
  const OPENINGS = [
    ['Partie espagnole (Ruy Lopez)', 'e2e4 e7e5 g1f3 b8c6 f1b5'], ['Partie italienne', 'e2e4 e7e5 g1f3 b8c6 f1c4'],
    ['Partie écossaise', 'e2e4 e7e5 g1f3 b8c6 d2d4'], ['Défense russe (Petrov)', 'e2e4 e7e5 g1f3 g8f6'],
    ['Défense Philidor', 'e2e4 e7e5 g1f3 d7d6'], ['Partie des quatre cavaliers', 'e2e4 e7e5 g1f3 b8c6 b1c3 g8f6'],
    ['Gambit du roi', 'e2e4 e7e5 f2f4'], ['Partie viennoise', 'e2e4 e7e5 b1c3'], ['Partie du pion roi (jeu ouvert)', 'e2e4 e7e5'],
    ['Défense sicilienne', 'e2e4 c7c5'], ['Défense française', 'e2e4 e7e6'], ['Défense Caro-Kann', 'e2e4 c7c6'],
    ['Défense scandinave', 'e2e4 d7d5'], ['Défense Pirc', 'e2e4 d7d6'], ['Défense Alekhine', 'e2e4 g8f6'],
    ['Défense moderne', 'e2e4 g7g6'], ['Partie du pion roi', 'e2e4'],
    ['Gambit dame refusé', 'd2d4 d7d5 c2c4 e7e6'], ['Gambit dame accepté', 'd2d4 d7d5 c2c4 d5c4'], ['Gambit dame', 'd2d4 d7d5 c2c4'],
    ['Défense slave', 'd2d4 d7d5 c2c4 c7c6'], ['Défense est-indienne', 'd2d4 g8f6 c2c4 g7g6'], ['Défense nimzo-indienne', 'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4'],
    ['Défense indienne', 'd2d4 g8f6'], ['Défense hollandaise', 'd2d4 f7f5'], ['Partie de la dame', 'd2d4 d7d5'], ['Partie du pion dame', 'd2d4'],
    ['Partie anglaise', 'c2c4'], ['Partie Réti', 'g1f3'], ['Attaque Bird', 'f2f4'], ['Ouverture Larsen', 'b2b3'],
    ['Ouverture du fianchetto roi', 'g2g3'], ['Ouverture Dunst', 'b1c3'],
  ].map(([name, line]) => ({ name: EN ? (OPENINGS_EN[name] || name) : name, line: line.split(' ') })).sort((a, b) => b.line.length - a.line.length);
  const openingName = (moves) => {
    const hit = OPENINGS.find((o) => o.line.every((u, i) => moves[i] === u));
    return hit ? hit.name : null;
  };

  const CLASSES = [[15, 'best'], [60, 'good'], [150, 'inaccuracy'], [320, 'mistake'], [Infinity, 'blunder']];
  const clampEval = (x) => Math.max(-1500, Math.min(1500, x));

  // Revue complète : évaluation (point de vue des Blancs) avant/après chaque coup et qualité de chaque coup des deux camps.
  // ev[0] = position initiale, ev[i] = après le coup i. marks[i-1] = [classe, perte, meilleur coup UCI].
  function reviewGame(moves, opts = {}) {
    const depth = opts.depth || 3, q = opts.q || 5;
    const states = [fromFen(opts.fen || root.Chess.START_FEN)];
    const played = [];
    for (const u of moves) {
      const s = states[states.length - 1];
      const m = legalMoves(s).find((x) => toUci(x) === u || toUci(x) === u + 'q');
      if (!m) break;
      played.push(m);
      states.push(makeMove(s, m));
    }
    const ev = [], marks = [];
    const sums = { w: [0, 0], b: [0, 0] };
    for (let i = 0; i < played.length; i++) {
      const s = states[i], pm = played[i];
      const keys = states.slice(0, i).map(positionKey);
      const r = rootSearch(s, depth, q, keys, 60);
      const sign = s.turn === 'w' ? 1 : -1;
      if (!r.length) break;
      const best = r[0];
      if (i === 0) ev.push(clampEval(best.score * sign));
      const sameAsBest = toUci(best.m) === toUci(pm);
      const ps = sameAsBest ? best.score : moveScore(s, pm, depth, q, keys);
      let loss = (isMate(best.score) && best.score > 0 && !(isMate(ps) && ps > 0)) ? 1000 : Math.max(0, best.score - ps);
      if (!isMate(best.score) && best.score > 600 && ps > 600) loss = 0;
      const cls = (CLASSES.find(([limit]) => loss <= limit) || CLASSES[CLASSES.length - 1])[1];
      ev.push(clampEval(ps * sign));
      marks.push([sameAsBest ? 'best' : cls, Math.round(loss), toUci(best.m)]);
      sums[s.turn][0] += 100 * Math.exp(-loss / 300); sums[s.turn][1]++;
      if (opts.onProgress) opts.onProgress(i + 1, played.length);
    }
    const acc = (c) => (sums[c][1] ? Math.round(sums[c][0] / sums[c][1]) : null);
    return { ev, marks, accuracy: { w: acc('w'), b: acc('b') }, opening: openingName(moves), count: marks.length };
  }

  /* ----- Commentaire de coup pour la partie coachée -----
     « toi » = le joueur (`opts.user`), « moi » = le coach. Toutes les pièces sont désignées avec ton/ta ou mon/ma. */
  const NAME = EN ? { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } : { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
  const PVAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const sqn = (sq) => root.Chess.sqName(sq);
  const own = (p, user) => {
    const t = p.toLowerCase(), fem = t === 'r' || t === 'q';
    if (EN) return `${colorOf(p) === user ? 'your' : 'my'} ${NAME[t]}`;
    return `${colorOf(p) === user ? (fem ? 'ta' : 'ton') : (fem ? 'ma' : 'mon')} ${NAME[t]}`;
  };
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${EN ? 'and' : 'et'} ${items[items.length - 1]}`);
  // Cases des pièces de `color` qui protègent `sq` : une pièce adverse fictive y est posée pour révéler les « prises »
  function guards(s, sq, color) {
    const b = s.board.slice();
    b[sq] = color === 'w' ? 'p' : 'P';
    return pseudoMoves({ ...s, board: b, turn: color, ep: -1 }).filter((m) => m.to === sq && m.captured).map((m) => m.from);
  }
  const captures = (s, color) => pseudoMoves({ ...s, turn: color, ep: -1 }).filter((m) => m.captured && m.captured.toLowerCase() !== 'k');

  function describeMove(fen, uci, history, opts = {}) {
    const s = fromFen(fen);
    const m = legalMoves(s).find((x) => toUci(x) === uci || toUci(x) === uci + 'q');
    if (!m) return null;
    const me = s.turn, foe = enemy(me), user = opts.user || me, byUser = me === user;
    const a = makeMove(s, m);
    const mover = a.board[m.to], mt = mover.toLowerCase();
    const sq = sqn(m.to), moverName = own(mover, user);
    const S = byUser ? 'Tu' : 'Je';
    const fem = mt === 'r' || mt === 'q';
    const It = fem ? 'Elle' : 'Il';
    const ply = history.length;

    // Ce que la pièce jouée attaque et protège
    const targets = captures(a, me).filter((x) => x.from === m.to)
      .map((x) => ({ sq: x.to, p: x.captured, guarded: guards(a, x.to, foe) }))
      .sort((x, y) => PVAL[y.p.toLowerCase()] - PVAL[x.p.toLowerCase()]);
    const threatsBefore = captures(s, foe);
    const myGuard = [];
    a.board.forEach((p, i) => {
      if (!p || i === m.to || colorOf(p) !== me || p.toLowerCase() === 'k') return;
      if (guards(a, i, me).includes(m.to)) myGuard.push(i);
    });
    const wasThreatened = (i) => threatsBefore.some((t) => t.to === i && (!guards(s, i, me).length || PVAL[t.captured.toLowerCase()] > PVAL[t.piece.toLowerCase()]));
    const guardedThreatened = myGuard.filter((i) => wasThreatened(m.from === i ? m.to : i));
    const foeThreats = captures(a, foe)
      .filter((x) => x.to === m.to || !guards(a, x.to, me).length || PVAL[x.captured.toLowerCase()] > PVAL[x.piece.toLowerCase()]);

    const parts = [];
    const developing = ply < 20 && 'nb'.includes(mt) && (me === 'w' ? m.from >> 3 === 7 : m.from >> 3 === 0);
    const center = mt === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(sq);
    if (EN) return describeMoveEn({ s, m, a, me, foe, user, byUser, mover, mt, sq, moverName, ply, targets, threatsBefore, myGuard, guardedThreatened, foeThreats, developing, center, history, counter: opts.counter });
    if (m.flag === 'castle') parts.push(`${S} roques ${m.to > m.from ? 'côté roi' : 'côté dame'} : ${byUser ? 'ton' : 'mon'} roi est plus en sécurité et ${byUser ? 'ta' : 'ma'} tour entre en jeu.`);
    else if (m.captured) parts.push(`${S} prends ${own(m.captured, user)} en ${sq} avec ${moverName}${m.flag === 'ep' ? ' (prise en passant)' : ''}.`);
    else if (m.promo) parts.push(`${S} promeus ${byUser ? 'ton' : 'mon'} pion en ${NAME[m.promo.toLowerCase()]}.`);
    else if (developing) parts.push(`${cap1(moverName)} se développe en ${sq}.`);
    else if (center) parts.push(`${cap1(moverName)} occupe le centre en ${sq}.`);
    else parts.push(`${cap1(moverName)} va en ${sq}.`);
    if (inCheck(a)) parts.push(byUser ? 'Tu donnes échec à mon roi.' : 'Échec à ton roi !');

    if (targets.length) {
      const names = targets.slice(0, 2).map((t) => `${own(t.p, user)} en ${sqn(t.sq)}${t.guarded.length ? '' : ' sans défense'}`);
      parts.push(`${It} attaque ${listOf(names)}.`);
    }
    const showGuard = myGuard.length && (guardedThreatened.length || !targets.length) ? (guardedThreatened.length ? guardedThreatened : myGuard).slice(0, 2) : [];
    if (showGuard.length) parts.push(`${It} protège ${listOf(showGuard.map((i) => `${own(a.board[i], user)} en ${sqn(i)}`))}.`);

    // Ouverture
    const before = openingName(history), after = openingName([...history, toUci(m)]);
    if (after && after !== before) parts.push(`Cela fait partie de l'ouverture : ${after}.`);
    else if (before && !after && ply < 16) parts.push(byUser ? 'Tu quittes les lignes d\'ouverture classiques.' : 'Je quitte les lignes d\'ouverture classiques.');

    // Pourquoi le coup est bon
    const reasons = [];
    const safe = !isAttacked(a.board, m.to, foe) || guards(a, m.to, me).length > 0 && !foeThreats.some((x) => x.to === m.to && PVAL[x.piece.toLowerCase()] < PVAL[mt]);
    if (m.captured && (safe || PVAL[m.captured.toLowerCase()] >= PVAL[m.piece.toLowerCase()])) reasons.push('il gagne du matériel sans risque');
    if (threatsBefore.some((t) => t.to === m.from) && safe && m.from !== m.to) reasons.push(`${moverName} était menacé${fem ? 'e' : ''} et le voilà à l'abri`);
    if (guardedThreatened.length) reasons.push(`il protège ${own(a.board[guardedThreatened[0]], user)}, qui était menacé${a.board[guardedThreatened[0]].toLowerCase().match(/[rq]/) ? 'e' : ''}`);
    const win = targets.find((t) => !t.guarded.length || PVAL[t.p.toLowerCase()] > PVAL[mt]);
    if (win) reasons.push(`il crée une menace sur ${own(win.p, user)}`);
    if (m.flag === 'castle') reasons.push('le roi est à l\'abri et la tour rejoint la partie');
    else if (developing) reasons.push('développer ses pièces tôt donne l\'initiative');
    else if (center) reasons.push('le centre donne de l\'espace aux pièces');

    // Ce qui menace après le coup (pour les alertes)
    const danger = foeThreats.slice(0, 2).map((x) => {
      const t = a.board[x.to].toLowerCase();
      return `${own(a.board[x.to], user)} en ${sqn(x.to)} peut être pris${t === 'r' || t === 'q' ? 'e' : ''} par ${own(x.piece, user)}`;
    });

    const arrows = [];
    const seen = new Set();
    const push = (from, to, color) => { const k = `${from}-${to}-${color}`; if (!seen.has(k)) { seen.add(k); arrows.push({ from, to, color }); } };
    for (const t of targets.slice(0, 3)) push(m.to, t.sq, byUser ? 'green' : 'red');
    for (const i of showGuard) push(m.to, i, byUser ? 'blue' : 'violet');
    if (byUser && opts.counter !== false) {
      for (const x of foeThreats.slice(0, 3)) push(x.from, x.to, 'red');
      for (const t of targets.slice(0, 2)) for (const g of t.guarded.slice(0, 2)) push(g, t.sq, 'violet');
    }
    return { parts, reasons, danger, arrows, opening: after, text: parts.join(' ') };
  }

  // Même commentaire que describeMove, rédigé en anglais
  function describeMoveEn(x) {
    const { m, a, me, foe, user, byUser, mover, mt, sq, moverName, ply, targets, threatsBefore, myGuard, guardedThreatened, foeThreats, developing, center, history } = x;
    const S = byUser ? 'You' : 'I';
    const parts = [];
    if (m.flag === 'castle') parts.push(`${S} castle ${m.to > m.from ? 'kingside' : 'queenside'}: ${byUser ? 'your' : 'my'} king is safer and ${byUser ? 'your' : 'my'} rook comes into play.`);
    else if (m.captured) parts.push(`${S} take ${own(m.captured, user)} on ${sq} with ${moverName}${m.flag === 'ep' ? ' (en passant)' : ''}.`);
    else if (m.promo) parts.push(`${S} promote ${byUser ? 'your' : 'my'} pawn to a ${NAME[m.promo.toLowerCase()]}.`);
    else if (developing) parts.push(`${cap1(moverName)} develops to ${sq}.`);
    else if (center) parts.push(`${cap1(moverName)} takes the center on ${sq}.`);
    else parts.push(`${cap1(moverName)} goes to ${sq}.`);
    if (inCheck(a)) parts.push(byUser ? 'You give check to my king.' : 'Check to your king!');
    if (targets.length) {
      const names = targets.slice(0, 2).map((t) => `${own(t.p, user)} on ${sqn(t.sq)}${t.guarded.length ? '' : ' (undefended)'}`);
      parts.push(`It attacks ${listOf(names)}.`);
    }
    const showGuard = myGuard.length && (guardedThreatened.length || !targets.length) ? (guardedThreatened.length ? guardedThreatened : myGuard).slice(0, 2) : [];
    if (showGuard.length) parts.push(`It protects ${listOf(showGuard.map((i) => `${own(a.board[i], user)} on ${sqn(i)}`))}.`);
    const before = openingName(history), after = openingName([...history, toUci(m)]);
    if (after && after !== before) parts.push(`This is part of the opening: ${after}.`);
    else if (before && !after && ply < 16) parts.push(byUser ? 'You leave the classical opening lines.' : 'I leave the classical opening lines.');
    const reasons = [];
    const safe = !isAttacked(a.board, m.to, foe) || guards(a, m.to, me).length > 0 && !foeThreats.some((t) => t.to === m.to && PVAL[t.piece.toLowerCase()] < PVAL[mt]);
    if (m.captured && (safe || PVAL[m.captured.toLowerCase()] >= PVAL[m.piece.toLowerCase()])) reasons.push('it wins material safely');
    if (threatsBefore.some((t) => t.to === m.from) && safe && m.from !== m.to) reasons.push(`${moverName} was threatened and is now safe`);
    if (guardedThreatened.length) reasons.push(`it protects ${own(a.board[guardedThreatened[0]], user)}, which was threatened`);
    const win = targets.find((t) => !t.guarded.length || PVAL[t.p.toLowerCase()] > PVAL[mt]);
    if (win) reasons.push(`it creates a threat on ${own(win.p, user)}`);
    if (m.flag === 'castle') reasons.push('the king is safe and the rook joins the game');
    else if (developing) reasons.push('developing your pieces early gives you the initiative');
    else if (center) reasons.push('the center gives your pieces space');
    const danger = foeThreats.slice(0, 2).map((t) => `${own(a.board[t.to], user)} on ${sqn(t.to)} can be taken by ${own(t.piece, user)}`);
    const arrows = [];
    const seen = new Set();
    const push = (from, to, color) => { const k = `${from}-${to}-${color}`; if (!seen.has(k)) { seen.add(k); arrows.push({ from, to, color }); } };
    for (const t of targets.slice(0, 3)) push(m.to, t.sq, byUser ? 'green' : 'red');
    for (const i of showGuard) push(m.to, i, byUser ? 'blue' : 'violet');
    if (byUser && x.counter !== false) {
      for (const t of foeThreats.slice(0, 3)) push(t.from, t.to, 'red');
      for (const t of targets.slice(0, 2)) for (const g of t.guarded.slice(0, 2)) push(g, t.sq, 'violet');
    }
    return { parts, reasons, danger, arrows, opening: after, text: parts.join(' ') };
  }

  const WARN = EN ? { mistake: 'This move is a mistake.', blunder: 'This move is a blunder.' } : { mistake: 'Ce coup est une erreur.', blunder: 'Ce coup est une gaffe.' };
  // Juge le coup `uci` joué dans `fen` avant qu'il ne soit joué : description, qualité et mise en garde
  function judgeMove(fen, uci, history, opts = {}) {
    const depth = opts.depth || 3, q = opts.q || 5;
    const s = fromFen(fen);
    const pm = legalMoves(s).find((x) => toUci(x) === uci || toUci(x) === uci + 'q');
    const d = describeMove(fen, uci, history, opts);
    if (!pm || !d) return null;
    const r = rootSearch(s, depth, q, null, 60);
    if (!r.length) return d;
    const best = r[0], same = toUci(best.m) === toUci(pm);
    const ps = same ? best.score : moveScore(s, pm, depth, q, null);
    let loss = same ? 0 : (isMate(best.score) && best.score > 0 && !(isMate(ps) && ps > 0)) ? 1000 : Math.max(0, best.score - ps);
    if (!isMate(best.score) && best.score > 600 && ps > 600) loss = 0;
    const cls = same ? 'best' : (CLASSES.find(([limit]) => loss <= limit) || CLASSES[CLASSES.length - 1])[1];
    const matedNext = isMate(ps) && ps < 0;
    let warning = '';
    if (cls === 'mistake' || cls === 'blunder') {
      warning = matedNext ? (EN ? 'This move allows checkmate.' : 'Ce coup laisse un échec et mat.') : (d.danger[0] ? `${cap1(d.danger[0])}.` : `${WARN[cls]} ${EN ? 'I see a reply that costs you dearly.' : 'Je vois une réponse qui te coûte cher.'}`);
    }
    return { ...d, cls, loss: Math.round(loss), best: toUci(best.m), warning };
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

  root.Coach = { explainError, describeMove, judgeMove, THEME_ORDER, analyseGame, reviewGame, openingName, buildLine, themeOfSolution, defenseProblem, levelOf, balance, isFork, isPin, isFreeCapture, isEndgame };
})(typeof self !== 'undefined' ? self : globalThis);
