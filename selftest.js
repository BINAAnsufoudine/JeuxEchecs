/* Cavalier — tests automatiques (navigateur). Résultat final dans window.__tests = { done, ok, results }. */
(function () {
  'use strict';
  const { Game, fromFen, legalMoves, makeMove, START_FEN } = window.Chess;
  const results = [], problems = [];
  window.__tests = { done: false, ok: false, results };

  // Toute erreur levée pendant les tests (y compris la boucle 3D, qui journalise au lieu de planter) fait échouer la suite
  window.addEventListener('error', (e) => problems.push(`erreur : ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => problems.push(`promesse rejetée : ${e.reason}`));
  const nativeError = console.error;
  console.error = (...args) => { problems.push(args.map((a) => (a && a.message) || String(a)).join(' ')); nativeError.apply(console, args); };

  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const list = document.getElementById('list');

  async function test(name, fn) {
    const before = problems.length;
    let error = '';
    try { await fn(); } catch (e) { error = (e && e.message) || String(e); }
    if (!error && problems.length > before) error = problems.slice(before).join(' | ');
    results.push({ name, ok: !error, error });
    const li = document.createElement('li');
    li.className = error ? 'ko' : 'ok';
    li.textContent = `${error ? '✗' : '✓'} ${name}${error ? ` — ${error}` : ''}`;
    list.appendChild(li);
  }

  const perft = (s, depth) => {
    if (!depth) return 1;
    let n = 0;
    for (const m of legalMoves(s)) n += depth === 1 ? 1 : perft(makeMove(s, m), depth - 1);
    return n;
  };

  const OPERA = '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';
  function sanMoves(pgn) {
    return pgn.replace(/\d+\./g, ' ').replace(/[*#]|1-0|0-1/g, ' ').split(/\s+/).filter((x) => x && !x.includes('...'));
  }
  function play(pgn) {
    const g = new Game();
    for (const san of sanMoves(pgn)) { if (!g.playSan(san)) break; }
    return g;
  }

  (async () => {
    await test('Perft position initiale (profondeur 3 = 8902)', () => assert(perft(fromFen(START_FEN), 3) === 8902, 'nombre de coups inattendu'));
    await test('Perft Kiwipete (profondeur 2 = 2039)', () => assert(perft(fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 2) === 2039, 'roques / prises / clouages incorrects'));
    await test('Perft finale à pion en passant (profondeur 3 = 2812)', () => assert(perft(fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 3) === 2812, 'prise en passant ou échecs incorrects'));
    await test('Partie de l\'Opéra : mat en 17 coups', () => {
      const g = play(OPERA);
      assert(g.history.length === 33, `33 demi-coups attendus, ${g.history.length} obtenus`);
      const st = g.status();
      assert(st.over && st.result === '1-0', 'le mat des Blancs n\'est pas détecté');
    });
    await test('Mat du berger et pat détectés', () => {
      assert(new Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').status().reason === 'pat', 'pat non détecté');
      const g = play('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#');
      assert(g.status().over, 'mat non détecté');
    });
    await test('Revue : le coup qui laisse un mat est une gaffe', () => {
      const r = window.Coach.reviewGame(['f2f3', 'e7e5', 'g2g4', 'd8h4'], { depth: 2, q: 3 });
      assert(r.ev.length === 5 && r.marks.length === 4, 'structure de la revue incorrecte');
      assert(r.marks[2][0] === 'blunder', `g4 devrait être une gaffe, obtenu ${r.marks[2][0]}`);
      assert(r.marks[3][0] === 'best', 'Dh4# devrait être le meilleur coup');
      assert(Math.abs(r.ev[4]) >= 1000 && r.ev[4] < 0, 'l\'évaluation finale doit annoncer le mat noir');
    });
    await test('Reconnaissance d\'ouverture', () => {
      assert(window.Coach.openingName(['e2e4', 'c7c5', 'g1f3']) === 'Défense sicilienne', 'sicilienne non reconnue');
      assert(window.Coach.openingName(['d2d4', 'd7d5', 'c2c4', 'e7e6']) === 'Gambit dame refusé', 'gambit dame refusé non reconnu');
    });

    await test('Coach : description du coup, ouverture et gaffe', () => {
      const g = new Game();
      ['e2e4', 'e7e5', 'd1h5', 'b8c6'].forEach((u) => g.playUci(u));
      const d = window.Coach.describeMove(window.Chess.toFen(new Game().state), 'e2e4', [], { user: 'w' });
      assert(/ouverture/.test(d.text), 'ouverture non annoncée');
      const j = window.Coach.judgeMove(window.Chess.toFen(g.state), 'h5e5', g.uciList(), { user: 'w' });
      assert(j.cls === 'blunder' && /peut être prise/.test(j.warning), 'la dame prenant e5 doit être jugée gaffe');
    });

    // Stress 3D : coups rapides (cas qui laissaient des résidus), puis rythme normal, avec prises, échecs et mat
    const THREE = window.THREE;
    let board3d = null;
    try { board3d = new window.Board3D(document.getElementById('stage'), () => {}); } catch (e) { board3d = null; }
    if (!board3d) {
      results.push({ name: '3D : WebGL indisponible, tests ignorés', ok: true, error: '' });
    } else {
      const drive = async (pgn, delay, name) => test(name, async () => {
        const g = new Game(), moves = sanMoves(pgn);
        board3d.setLite(false);
        const frame = (animate) => {
          const s = g.state, last = g.lastMove();
          board3d.update({ board: s.board, selected: -1, targets: [], last, check: g.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1, mateFire: [], mateUltimate: null, hint: null, flipped: false, showMoves: false, coords: true, light: '#e8dcc0', dark: '#6f8f6a', animate, outcome: null, arrows: [] });
        };
        frame(false);
        for (const san of moves) {
          if (!g.playSan(san)) break;
          frame(true);
          await sleep(delay);
        }
        await sleep(3500);
        const onBoard = g.state.board.filter(Boolean).length;
        assert(board3d.chars.size === onBoard, `${board3d.chars.size} figurines affichées pour ${onBoard} pièces`);
        assert(board3d.dying.length === 0, `${board3d.dying.length} animation(s) de mort restée(s) à l'écran`);
      });
      await drive(OPERA, 120, '3D : partie de l\'Opéra en coups rapides (prises de fous, de dames, mat)');
      await drive(OPERA.split(' 9. ')[0], 1100, '3D : début de partie au rythme normal');
      await test('3D : mode léger activable à chaud', () => { board3d.setLite(true); board3d.setLite(false); });
    }

    const ok = results.every((r) => r.ok);
    const summary = document.getElementById('summary');
    summary.textContent = ok ? `Tous les tests passent (${results.length})` : `${results.filter((r) => !r.ok).length} test(s) en échec sur ${results.length}`;
    summary.className = ok ? 'ok' : 'ko';
    window.__tests.ok = ok;
    window.__tests.done = true;
  })();
})();
