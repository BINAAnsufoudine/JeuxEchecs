/* Cavalier — moteur de règles d'échecs. Case 0 = a8, 63 = h1. */
(function (root) {
  'use strict';

  const FILES = 'abcdefgh';
  const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));
  const sqIndex = (s) => (8 - parseInt(s[1], 10)) * 8 + FILES.indexOf(s[0]);
  const colorOf = (p) => (p === p.toUpperCase() ? 'w' : 'b');

  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function fromFen(fen) {
    const [placement, turn, castle, ep, half, full] = fen.trim().split(/\s+/);
    const board = new Array(64).fill(null);
    let i = 0;
    for (const ch of placement) {
      if (ch === '/') continue;
      if (/\d/.test(ch)) i += parseInt(ch, 10);
      else board[i++] = ch;
    }
    return {
      board,
      turn: turn || 'w',
      castling: castle && castle !== '-' ? castle : '',
      ep: ep && ep !== '-' ? sqIndex(ep) : -1,
      half: parseInt(half || '0', 10),
      full: parseInt(full || '1', 10),
    };
  }

  function toFen(s) {
    let out = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = s.board[r * 8 + f];
        if (!p) empty++;
        else { if (empty) { out += empty; empty = 0; } out += p; }
      }
      if (empty) out += empty;
      if (r < 7) out += '/';
    }
    return `${out} ${s.turn} ${s.castling || '-'} ${s.ep >= 0 ? sqName(s.ep) : '-'} ${s.half} ${s.full}`;
  }

  // Clé de position pour la répétition (sans les compteurs ni une prise en passant illégale)
  function positionKey(s) {
    let ep = '-';
    if (s.ep >= 0) {
      const sourceRank = (s.ep >> 3) + (s.turn === 'w' ? 1 : -1);
      for (const file of [(s.ep & 7) - 1, (s.ep & 7) + 1]) {
        if (file < 0 || file > 7) continue;
        const from = sourceRank * 8 + file;
        const piece = s.board[from];
        if (!piece || piece.toLowerCase() !== 'p' || colorOf(piece) !== s.turn) continue;
        const move = { from, to: s.ep, piece, captured: s.turn === 'w' ? 'p' : 'P', flag: 'ep' };
        if (!inCheck(makeMove(s, move), s.turn)) { ep = sqName(s.ep); break; }
      }
    }
    return `${toFen(s).split(' ').slice(0, 3).join(' ')} ${ep}`;
  }

  function isAttacked(board, sq, by) {
    const r = sq >> 3, f = sq & 7;
    const at = (rr, ff) => (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? board[rr * 8 + ff] : undefined);
    const own = (p, t) => p && colorOf(p) === by && p.toLowerCase() === t;

    // Pions : un pion blanc attaque vers le haut (rang - 1)
    const pr = by === 'w' ? r + 1 : r - 1;
    if (own(at(pr, f - 1), 'p') || own(at(pr, f + 1), 'p')) return true;
    for (const [dr, df] of KNIGHT) if (own(at(r + dr, f + df), 'n')) return true;
    for (const [dr, df] of KING) if (own(at(r + dr, f + df), 'k')) return true;
    for (const [dirs, kinds] of [[ROOK_DIRS, 'rq'], [BISHOP_DIRS, 'bq']]) {
      for (const [dr, df] of dirs) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const p = board[rr * 8 + ff];
          if (p) {
            if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true;
            break;
          }
          rr += dr; ff += df;
        }
      }
    }
    return false;
  }

  const kingSquare = (board, color) => board.indexOf(color === 'w' ? 'K' : 'k');
  const inCheck = (s, color = s.turn) => isAttacked(s.board, kingSquare(s.board, color), color === 'w' ? 'b' : 'w');

  function pseudoMoves(s) {
    const moves = [];
    const { board, turn } = s;
    const enemy = turn === 'w' ? 'b' : 'w';
    const add = (from, to, extra) => {
      const m = { from, to, piece: board[from], captured: board[to] || null };
      if (extra) Object.assign(m, extra);
      moves.push(m);
    };

    for (let sq = 0; sq < 64; sq++) {
      const p = board[sq];
      if (!p || colorOf(p) !== turn) continue;
      const r = sq >> 3, f = sq & 7, t = p.toLowerCase();

      if (t === 'p') {
        const dir = turn === 'w' ? -1 : 1;
        const startRank = turn === 'w' ? 6 : 1;
        const lastRank = turn === 'w' ? 0 : 7;
        const pushPawn = (to, extra) => {
          if ((to >> 3) === lastRank) for (const promo of 'qrbn') add(sq, to, Object.assign({ promo }, extra));
          else add(sq, to, extra);
        };
        const one = sq + dir * 8;
        if (!board[one]) {
          pushPawn(one);
          const two = sq + dir * 16;
          if (r === startRank && !board[two]) add(sq, two, { flag: 'double' });
        }
        for (const df of [-1, 1]) {
          const ff = f + df;
          if (ff < 0 || ff > 7) continue;
          const to = (r + dir) * 8 + ff;
          if (board[to] && colorOf(board[to]) === enemy) pushPawn(to);
          else if (to === s.ep) add(sq, to, { flag: 'ep', captured: turn === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, df] of t === 'n' ? KNIGHT : KING) {
          const rr = r + dr, ff = f + df;
          if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
          const to = rr * 8 + ff;
          if (!board[to] || colorOf(board[to]) === enemy) add(sq, to);
        }
        if (t === 'k') {
          const rights = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
          const home = turn === 'w' ? 60 : 4;
          if (sq === home && !isAttacked(board, home, enemy)) {
            if (s.castling.includes(rights[0]) && board[home + 3] === (turn === 'w' ? 'R' : 'r') && !board[home + 1] && !board[home + 2] &&
                !isAttacked(board, home + 1, enemy) && !isAttacked(board, home + 2, enemy))
              add(sq, home + 2, { flag: 'castle' });
            if (s.castling.includes(rights[1]) && board[home - 4] === (turn === 'w' ? 'R' : 'r') && !board[home - 1] && !board[home - 2] && !board[home - 3] &&
                !isAttacked(board, home - 1, enemy) && !isAttacked(board, home - 2, enemy))
              add(sq, home - 2, { flag: 'castle' });
          }
        }
      } else {
        const dirs = t === 'r' ? ROOK_DIRS : t === 'b' ? BISHOP_DIRS : ROOK_DIRS.concat(BISHOP_DIRS);
        for (const [dr, df] of dirs) {
          let rr = r + dr, ff = f + df;
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const to = rr * 8 + ff;
            if (board[to]) {
              if (colorOf(board[to]) === enemy) add(sq, to);
              break;
            }
            add(sq, to);
            rr += dr; ff += df;
          }
        }
      }
    }
    return moves;
  }

  function makeMove(s, m) {
    const board = s.board.slice();
    const piece = board[m.from];
    board[m.to] = m.promo ? (s.turn === 'w' ? m.promo.toUpperCase() : m.promo) : piece;
    board[m.from] = null;
    if (m.flag === 'ep') board[m.to + (s.turn === 'w' ? 8 : -8)] = null;
    if (m.flag === 'castle') {
      const kingside = m.to > m.from;
      const rookFrom = kingside ? m.from + 3 : m.from - 4;
      const rookTo = kingside ? m.from + 1 : m.from - 1;
      board[rookTo] = board[rookFrom];
      board[rookFrom] = null;
    }
    let castling = s.castling;
    const strip = (chars) => { for (const c of chars) castling = castling.replace(c, ''); };
    if (piece === 'K') strip('KQ');
    if (piece === 'k') strip('kq');
    for (const sq of [m.from, m.to]) {
      if (sq === 63) strip('K');
      if (sq === 56) strip('Q');
      if (sq === 7) strip('k');
      if (sq === 0) strip('q');
    }
    const isPawn = piece.toLowerCase() === 'p';
    return {
      board,
      turn: s.turn === 'w' ? 'b' : 'w',
      castling,
      ep: m.flag === 'double' ? (m.from + m.to) / 2 : -1,
      half: isPawn || m.captured ? 0 : s.half + 1,
      full: s.turn === 'b' ? s.full + 1 : s.full,
    };
  }

  function legalMoves(s) {
    return pseudoMoves(s).filter((m) => !inCheck(makeMove(s, m), s.turn));
  }

  function insufficientMaterial(board) {
    const pieces = [];
    for (let i = 0; i < 64; i++) if (board[i] && board[i].toLowerCase() !== 'k') pieces.push([board[i], i]);
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && 'nb'.includes(pieces[0][0].toLowerCase())) return true;
    // Uniquement des fous, tous sur des cases de même couleur
    if (pieces.every(([p]) => p.toLowerCase() === 'b')) {
      const shade = (i) => ((i >> 3) + (i & 7)) % 2;
      return pieces.every(([, i]) => shade(i) === shade(pieces[0][1]));
    }
    return false;
  }

  function toSan(s, m, legal) {
    let san;
    const t = m.piece.toLowerCase();
    if (m.flag === 'castle') san = m.to > m.from ? 'O-O' : 'O-O-O';
    else {
      const capture = !!m.captured;
      if (t === 'p') {
        san = (capture ? sqName(m.from)[0] + 'x' : '') + sqName(m.to);
        if (m.promo) san += '=' + m.promo.toUpperCase();
      } else {
        const rivals = legal.filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
        let dis = '';
        if (rivals.length) {
          const sameFile = rivals.some((o) => (o.from & 7) === (m.from & 7));
          const sameRank = rivals.some((o) => (o.from >> 3) === (m.from >> 3));
          if (!sameFile) dis = sqName(m.from)[0];
          else if (!sameRank) dis = sqName(m.from)[1];
          else dis = sqName(m.from);
        }
        san = t.toUpperCase() + dis + (capture ? 'x' : '') + sqName(m.to);
      }
    }
    const next = makeMove(s, m);
    if (inCheck(next)) san += legalMoves(next).length ? '+' : '#';
    return san;
  }

  const normalizeSan = (san) => san.replace(/^0-0(-0)?/, (_, long) => long ? 'O-O-O' : 'O-O').replace(/[+#?!]+$/g, '');

  const toUci = (m) => sqName(m.from) + sqName(m.to) + (m.promo || '');

  /* Partie : historique d'états, coups joués, détection de fin */
  class Game {
    constructor(fen = START_FEN) {
      this.states = [fromFen(fen)];
      this.history = []; // { move, san }
    }
    get state() { return this.states[this.states.length - 1]; }
    get turn() { return this.state.turn; }
    moves() { return legalMoves(this.state); }
    movesFrom(sq) { return this.moves().filter((m) => m.from === sq); }
    play(from, to, promo) {
      const legal = this.moves();
      const m = legal.find((x) => x.from === from && x.to === to && (!x.promo || x.promo === (promo || 'q')));
      if (!m) return null;
      const san = toSan(this.state, m, legal);
      this.states.push(makeMove(this.state, m));
      this.history.push({ move: m, san });
      return { move: m, san };
    }
    playUci(uci) {
      return this.play(sqIndex(uci.slice(0, 2)), sqIndex(uci.slice(2, 4)), uci[4]);
    }
    playSan(san) {
      const legal = this.moves();
      const wanted = normalizeSan(san);
      const m = legal.find((x) => normalizeSan(toSan(this.state, x, legal)) === wanted);
      if (!m) return null;
      const notation = toSan(this.state, m, legal);
      this.states.push(makeMove(this.state, m));
      this.history.push({ move: m, san: notation });
      return { move: m, san: notation };
    }
    undo() {
      if (!this.history.length) return null;
      this.states.pop();
      return this.history.pop();
    }
    inCheck() { return inCheck(this.state); }
    repetitionCount() {
      const key = positionKey(this.state);
      return this.states.filter((st) => positionKey(st) === key).length;
    }
    // { over, result: '1-0' | '0-1' | '1/2-1/2', reason }
    status() {
      const s = this.state;
      if (legalMoves(s).length === 0) {
        if (inCheck(s)) return { over: true, result: s.turn === 'w' ? '0-1' : '1-0', reason: 'mat' };
        return { over: true, result: '1/2-1/2', reason: 'pat' };
      }
      if (insufficientMaterial(s.board)) return { over: true, result: '1/2-1/2', reason: 'materiel' };
      if (s.half >= 100) return { over: true, result: '1/2-1/2', reason: '50coups' };
      if (this.repetitionCount() >= 3) return { over: true, result: '1/2-1/2', reason: 'repetition' };
      return { over: false };
    }
    uciList() { return this.history.map((h) => toUci(h.move)); }
    lastMove() { return this.history.length ? this.history[this.history.length - 1].move : null; }
  }

  root.Chess = {
    START_FEN, Game, fromFen, toFen, legalMoves, pseudoMoves, makeMove, inCheck, isAttacked,
    sqName, sqIndex, colorOf, toUci, positionKey, insufficientMaterial,
  };
})(typeof self !== 'undefined' ? self : globalThis);
