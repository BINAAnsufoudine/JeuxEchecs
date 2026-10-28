  /* ---------- Coups ---------- */
  function tryMove(from, to) {
    const options = game.movesFrom(from).filter((m) => m.to === to);
    if (!options.length) return false;
    if (options.some((m) => m.promo)) {
      if (settings.autoQueen) commit(from, to, 'q');
      else askPromotion(from, to);
    } else commit(from, to);
    return true;
  }

  function askPromotion(from, to) {
    const body = document.createElement('div');
    body.className = 'promo-choices';
    const color = game.turn;
    let chosen = null;
    for (const t of 'qrbn') {
      const b = document.createElement('button');
      const piece = document.createElement('span');
      piece.className = `pc ${color}`;
      piece.textContent = glyph(color === 'w' ? t.toUpperCase() : t);
      b.appendChild(piece);
      const name = L({ q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' }, { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[t];
      b.setAttribute('aria-label', L(`${name} ${color === 'w' ? 'blanche' : 'noire'}`, `${color === 'w' ? 'White' : 'Black'} ${name.toLowerCase()}`));
      b.title = name;
      b.onclick = () => { chosen = t; closeModal(); commit(from, to, t); };
      body.appendChild(b);
    }
    modal({ title: L('Promotion', 'Promotion'), text: L('Choisissez la nouvelle pièce', 'Choose the new piece'), body, actions: [{ label: L('Annuler', 'Cancel'), ghost: true, onClick: () => { if (!chosen) { selected = -1; renderBoard(); } } }] });
    // Pièces noires : fenêtre blanche pour bien les distinguer
    $('modal').querySelector('.sheet').classList.toggle('light-sheet', color === 'b');
  }

  function commit(from, to, promo) {
    if (!pz && cfg.mode === 'coach' && !result && !judging && colorOf(game.state.board[from]) === cfg.playerColor && window.Coach) { judgeThenPlay(from, to, promo); return; }
    playMove(from, to, promo);
  }

  function playMove(from, to, promo, insight) {
    const res = game.play(from, to, promo);
    if (!res) return;
    selected = -1; hint = null;
    if (pz) { pzAfterMove(res); return; }
    afterMove(res, insight);
  }

  // Partie coachée : le coup est jugé avant d'être joué ; une erreur ou une gaffe déclenche « Êtes-vous sûr ? »
  function judgeThenPlay(from, to, promo) {
    const uci = sqName(from) + sqName(to) + (promo || '');
    const seq = ++judgeSeq;
    judging = true;
    renderActions();
    const payload = { fen: window.Chess.toFen(game.state), uci, history: game.uciList(), user: cfg.playerColor };
    let timer = null;
    const done = (ins) => {
      clearTimeout(timer);
      if (seq !== judgeSeq) return;
      judging = false;
      if (ins && (ins.cls === 'mistake' || ins.cls === 'blunder')) ins.sure = true;
      playMove(from, to, promo, ins);
    };
    try { judgeWorker = judgeWorker || new Worker(`analyse-worker.js?lang=${LANG}`); } catch { done(null); return; }
    const w = judgeWorker;
    // En cas de blocage du worker, le coup est joué sans jugement
    timer = setTimeout(() => { if (judgeWorker === w) { w.terminate(); judgeWorker = null; } done(null); }, 8000);
    w.onmessage = (e) => { if (e.data.id === seq) done(e.data.ok ? e.data.insight : null); };
    w.onerror = () => done(null);
    w.postMessage({ id: seq, insight: payload });
  }

  function afterMove(res, insight) {
    animateNext = true;
    if (cfg.mode === 'coach' && colorOf(res.move.piece) === cfg.playerColor) coachHintLevel = 0;
    const st = game.status();
    if (st.over) {
      result = { result: st.result, reason: st.reason, ultimateId: `${game.history.length}-${Date.now()}` };
      if (st.reason === 'mat') shout(L('Échec et mat !', 'Checkmate!'));
      finish();
    } else {
      if (game.inCheck()) { sounds.check(); shout(L('Échec !', 'Check!')); }
      else if (res.move.captured) sounds.capture();
      else sounds.move();
    }
    if (cfg.mode === 'coach' && !result) coachGameCommentary(res, insight);
    if (cfg.mode === 'online' && colorOf(res.move.piece) === cfg.playerColor) {
      const uci = window.Chess.toUci(res.move), ply = game.history.length - 1;
      if (isDeferred() && settings.autoConfirm === false && !result) { pendingMove = { uci, ply, san: res.san || uci }; renderConfirm(); }
      else sendOnlineMove(uci, ply, result);
    }
    render();
    save();
    if (!result) maybeAiMove();
  }

  function coachGameCommentary(res, insight) {
    const userPlayed = colorOf(res.move.piece) === cfg.playerColor;
    const C = window.Coach;
    let d = insight;
    if (!d && C) {
      const before = game.states[game.states.length - 2];
      d = C.describeMove(window.Chess.toFen(before), window.Chess.toUci(res.move), game.uciList().slice(0, -1), { user: cfg.playerColor });
    }
    if (!d) return;
    coachArrows = d.arrows || [];
    const pick = (list) => list[game.history.length % list.length];
    if (userPlayed && d.sure) {
      setCoachMessage(L(`Êtes-vous sûr ? ${d.warning || ''} Utilise « Annuler » pour reprendre ton coup.`, `Are you sure? ${d.warning || ''} Use “Undo” to take your move back.`).replace(/\s+/g, ' '), 'worried', settings.voice);
      return;
    }
    let verdict = '';
    if (userPlayed && d.cls) {
      const why = d.reasons[0];
      if (d.cls === 'best') verdict = why ? L(`Excellent coup, c'est aussi celui que je jouerais : ${why}.`, `Excellent move, it's the one I would play too: ${why}.`) : L('Excellent coup, c\'est aussi celui que je jouerais.', "Excellent move, it's the one I would play too.");
      else if (d.cls === 'good') verdict = why ? L(`Bon coup : ${why}.`, `Good move: ${why}.`) : pick(L(['Bon coup, solide.', 'Bon coup : tu gardes ta position bien coordonnée.', 'Bon choix, tu ne laisses rien à ma portée.'], ['Good, solid move.', 'Good move: your pieces stay well coordinated.', 'Good choice, you leave nothing within my reach.']));
      else if (d.cls === 'inaccuracy') verdict = pick(L(['Un peu imprécis : il y avait plus précis.', 'Coup jouable, mais pas le plus précis.'], ['A little inaccurate: there was something more precise.', 'Playable, but not the most precise move.']));
      else verdict = L('Tu as maintenu ton coup : voyons si je peux en profiter.', 'You kept your move: let’s see if I can take advantage of it.');
    } else if (userPlayed && d.reasons[0]) verdict = d.reasons[0].charAt(0).toUpperCase() + d.reasons[0].slice(1) + '.';
    if (userPlayed) {
      setCoachMessage([...d.parts, verdict].filter(Boolean).join(' '), d.cls === 'mistake' || d.cls === 'blunder' ? 'worried' : 'happy', settings.voice);
      return;
    }
    setCoachMessage([...d.parts, championTip() || pick(L(['À toi de jouer.', 'Que réponds-tu ?', 'Regarde bien les menaces avant de répondre.'], ['Your move.', 'What is your answer?', 'Look carefully at the threats before you answer.']))].join(' '), '', settings.voice);
  }

  function finish() {
    render();
    save();
    let outcome = 'draw';
    if (result.result !== '1/2-1/2') {
      const winner = result.result === '1-0' ? 'w' : 'b';
      outcome = cfg.mode !== 'local' ? (winner === cfg.playerColor ? 'win' : 'loss') : 'win';
    }
    let opened = 0;
    if (cfg.mode === 'online') {
      if (onlineGame && onlineGame.tournamentId) ON.reportResult(onlineGame.tournamentId, onlineGame.id, result.result).catch(() => {});
      const g = onlineGame || {}, oppElo = cfg.playerColor === 'w' ? g.blackElo : g.whiteElo;
      updatePlayerRating(oppElo || 600, outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0, 32, 'games');
      ON.setElo(estimatedElo());
      const arch = store.get('onlineArchive', []);
      if (!arch.some((x) => x.gameId === cfg.online.id)) {
        arch.push({ id: Date.now(), gameId: cfg.online.id, moves: game.uciList(), result: result.result, reason: result.reason, white: g.whiteName, black: g.blackName, whiteElo: g.whiteElo, blackElo: g.blackElo, color: cfg.playerColor, tc: g.tc });
        store.set('onlineArchive', arch.slice(-50));
        onlineReward(outcome, !!g.tournamentId);
        updateGrade(outcome, cfg.playerColor === 'w' ? g.black : g.white);
      }
    } else if (cfg.mode !== 'local' && cfg.fen) {
      // position libre ou finale contre l'ordinateur : comptée aussi pour l'Elo (seules les parties à deux sur un appareil ne comptent pas)
      updatePlayerRating(LEVEL_ELO[cfg.level] || 600, outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0, 32, 'games');
      archiveGame();
    }
    else if (cfg.mode !== 'local') {
      updatePlayerRating(LEVEL_ELO[cfg.level] || 600, outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0, 32, 'games');
      recordStat(cfg.level, outcome); archiveGame();
      gameReward(outcome, cfg.level, result.reason === 'mat');
      // Une victoire au plus haut niveau débloqué ouvre le suivant
      if (outcome === 'win' && cfg.level === unlocked() && cfg.level < MAX_GAME_LEVEL) {
        opened = cfg.level + 1;
        store.set('unlocked', opened);
        setup.level = opened; store.set('setup', setup);
      }
    }
    (outcome === 'win' ? sounds.win : outcome === 'loss' ? sounds.lose : sounds.draw)();
    const drill = cfg.drill && (window.TRAINER ? window.TRAINER.ENDGAMES.find((x) => x.id === cfg.drill) : null);
    const drillOk = drill && (drill.goal === 'draw' ? outcome === 'draw' : outcome === 'win');
    if (drillOk) { lessonReward(`end:${drill.id}`); const d = store.get('trainDone', {}); d[`end:${drill.id}`] = Date.now(); store.set('trainDone', d); }
    const snap = { moves: game.uciList(), cfg: { ...cfg }, result: result.result };
    const replayTitle = cfg.mode === 'online' ? L('Partie en ligne', 'Online game')
      : cfg.mode === 'local' ? L('Deux joueurs', 'Two players')
        : cfg.mode === 'coach' ? L('Partie coachée', 'Coached game')
          : cfg.fen ? L('Position libre', 'Custom position') : `${L('Contre ordinateur', 'Against computer')} · ${LEVEL_NAMES[cfg.level] || ''}`.trim();
    const replayNames = cfg.mode === 'online' && onlineGame
      ? { white: onlineGame.whiteName, black: onlineGame.blackName }
      : sideNames(cfg);
    // L'analyse démarre tout de suite : le bilan est souvent prêt quand on l'ouvre
    if (cfg.mode !== 'local' && cfg.mode !== 'online' && snap.moves.length >= 8) requestReview(cfg.fen || window.Chess.START_FEN, snap.moves).catch(() => {});
    if (cfg.mode === 'local' && !replay) {
      const local = store.get('localArchive', []);
      local.push({ id: Date.now(), mode: 'local', fen: cfg.fen || undefined, moves: game.uciList(), result: result.result, reason: result.reason });
      store.set('localArchive', local.slice(-30));
    }
    setTimeout(() => {
      modal({
        title: resultText(),
        text: (drill ? (drillOk ? L(`Exercice réussi : ${drill.name}. `, `Exercise passed: ${drill.name}. `) : L(`Exercice raté : ${drill.name}. Relis la méthode et réessaie. `, `Exercise failed: ${drill.name}. Reread the method and try again. `)) : '') + REASONS[result.reason] + L(` · ${Math.ceil(game.history.length / 2)} coups`, ` · ${Math.ceil(game.history.length / 2)} moves`) + (opened ? L(`\nNiveau débloqué : ${LEVEL_NAMES[opened]} !`, `\nLevel unlocked: ${LEVEL_NAMES[opened]}!`) : ''),
        actions: [
          ...(opened ? [{ label: L(`Jouer ${LEVEL_NAMES[opened]}`, `Play ${LEVEL_NAMES[opened]}`), primary: true, onClick: () => startGame({ ...cfg, level: opened, playerColor: randomColor() }) }] : []),
          ...(cfg.mode === 'online' && onlineGame && onlineGame.tournamentId ? [{ label: L('Retour au tournoi', 'Back to the tournament'), primary: true, onClick: () => { const tid = onlineGame.tournamentId; stopOnline(); show('tournaments'); openTournament(tid); } }]
            : cfg.mode === 'online' ? [{ label: L('Jouer en ligne', 'Play online'), primary: true, onClick: () => { stopOnline(); renderOnline(); returnTo = 'home'; show('online'); } }] : [{ label: L('Rejouer', 'Play again'), primary: true, onClick: () => startGame({ ...cfg, playerColor: cfg.fen ? cfg.playerColor : randomColor() }) }]),
          ...(cfg.fen ? [{ label: L('Modifier la position', 'Edit the position'), onClick: () => openEditor(cfg.fen) }] : []),
          ...(cfg.mode !== 'local' && cfg.mode !== 'online' ? [{ label: L('Choisir un niveau', 'Choose a level'), onClick: () => { renderSetup(); returnTo = 'home'; show('setup'); } }] : []),
          ...(snap.moves.length ? [{ label: L('Analyser', 'Analyse'), onClick: () => startReplay({ moves: snap.moves, fen: cfg.fen, result: snap.result, title: replayTitle, ...replayNames, flipped }, () => show('home')) }] : []),
          ...(snap.moves.length >= 8 ? [{ label: L('Bilan de Maître Sissa', 'Master Sissa’s review'), onClick: () => showBilan(snap) }] : []),
          { label: L('Voir le plateau', 'View the board'), ghost: true },
          { label: L('Accueil', 'Home'), ghost: true, onClick: () => show('home') },
        ],
      });
    }, Math.max(450, (b3d ? b3d.busyLeftMs() : 0) + 400)); // après le duel final
  }

  /* ---------- IA (Web Worker) ---------- */
  let worker = null;
  function getWorker() {
    if (!worker) {
      worker = new Worker('ai-worker.js');
      worker.onmessage = onAiMessage;
    }
    return worker;
  }
  // À partir de 1320 Elo, l'ordinateur joue avec Stockfish bridé à l'Elo exact du niveau (réglage UCI_Elo)
  const SF_MIN_ELO = 1320;
  let sfw = null, sfFailed = false, sfCur = 0, sfBusy = false, sfNext = null;
  function getSf() {
    if (!sfw) {
      sfw = new Worker('stockfish.js');
      sfw.onmessage = (e) => {
        const line = String(e.data);
        if (!line.startsWith('bestmove')) return;
        sfBusy = false;
        onAiMessage({ data: { id: sfCur, move: line.split(' ')[1] } }); // un coup périmé est ignoré (id différent)
        if (sfNext) { const run = sfNext; sfNext = null; run(); }
      };
      sfw.onerror = () => { sfFailed = true; sfw = null; if (pending && pending.sf) { const k = pending.kind; pending = null; ask(k, cfg.level); } };
      sfw.postMessage('uci');
      sfw.postMessage('setoption name UCI_LimitStrength value true');
    }
    return sfw;
  }
  const usesSf = (level) => !sfFailed && typeof WebAssembly === 'object' && LEVEL_ELO[level] >= SF_MIN_ELO;

  let pending = null; // { id, kind: 'move' | 'hint' }
  function ask(kind, level) {
    const id = ++requestId;
    pending = { id, kind };
    if (kind === 'move' && usesSf(level)) {
      try {
        const w = getSf(), moves = game.uciList().join(' ');
        pending.sf = true;
        const run = () => {
          sfCur = id; sfBusy = true;
          w.postMessage('setoption name UCI_Elo value ' + LEVEL_ELO[level]);
          w.postMessage((cfg.fen ? 'position fen ' + cfg.fen : 'position startpos') + ' moves ' + moves);
          w.postMessage('go movetime 1000');
        };
        if (sfBusy) sfNext = run; else run();
        return;
      } catch { sfFailed = true; pending = { id, kind }; }
    }
    const keys = game.states.map(positionKey);
    try {
      getWorker().postMessage({ id, fen: window.Chess.toFen(game.state), history: keys, level });
    } catch {
      pending = null; thinking = false;
      toast(L("L'IA ne peut pas démarrer ici. Ouvrez l'app via un serveur web.", 'The AI cannot start here. Open the app through a web server.'));
    }
  }
  function onAiMessage(e) {
    const { id, move } = e.data;
    if (!pending || id !== pending.id || !move) return;
    const kind = pending.kind;
    pending = null;
    const from = window.Chess.sqIndex(move.slice(0, 2)), to = window.Chess.sqIndex(move.slice(2, 4));
    if (kind === 'hint') {
      const hintLevel = cfg.mode === 'coach' ? Math.max(1, coachHintLevel) : 2;
      hint = { from, to: cfg.mode === 'coach' && hintLevel === 1 ? from : to };
      renderBoard(); renderActions();
      if (cfg.mode === 'coach') {
        if (hintLevel === 1) {
          setCoachMessage(L(`Premier indice: observe la pièce en ${move.slice(0, 2)}. Quels coups forcés peut-elle jouer?`, `First hint: look at the piece on ${move.slice(0, 2)}. Which forcing moves can it play?`), '', settings.voice);
          return;
        }
        if (hintLevel === 2) {
          setCoachMessage(L(`Deuxième indice: la case ${move.slice(2, 4)} est une cible possible. Calcule les réponses adverses avant de choisir.`, `Second hint: the square ${move.slice(2, 4)} is a possible target. Work out your opponent's replies before choosing.`), '', settings.voice);
          return;
        }
        const probe = new Game(window.Chess.toFen(game.state));
        const answer = probe.play(from, to, move[4]);
        const san = answer ? answer.san : `${move.slice(0, 2)} → ${move.slice(2, 4)}`;
        const advice = coachPlan().theme ? L(` Garde aussi en tête ${PZ[coachPlan().theme].name.toLowerCase()}, ton axe de travail du moment.`, ` Also keep in mind ${PZ[coachPlan().theme].name.toLowerCase()}, your current training focus.`) : '';
        setCoachMessage(L(`Tu me demandes la solution : ${san}. Vérifie les menaces que ce coup crée et les pièces qu’il protège.${advice}`, `You asked me for the solution: ${san}. Check the threats this move creates and the pieces it protects.${advice}`), 'happy', settings.voice);
      } else toast(L('Indice : ', 'Hint: ') + move.slice(0, 2) + ' → ' + move.slice(2, 4));
      return;
    }
    // l'ordinateur a réfléchi pendant l'animation : il joue dès que le plateau est libre
    const ply = game.history.length;
    const playNow = () => {
      if (!thinking || !game || game.history.length !== ply) return;
      const wait = b3d ? b3d.busyLeftMs() : 0;
      if (wait > 0) { setTimeout(playNow, wait + 120); return; }
      thinking = false;
      const res = game.play(from, to, move[4]);
      if (res) afterMove(res);
    };
    playNow();
  }
  function maybeAiMove() {
    if (!game || result || cfg.mode === 'local' || cfg.mode === 'online') return;
    // pendant que le joueur réfléchit, le moteur Stockfish se charge déjà (le premier chargement est long)
    if (game.turn === cfg.playerColor) { if (usesSf(cfg.level)) try { getSf(); } catch { /* repli sur l'IA maison */ } return; }
    thinking = true;
    renderStatus(); renderActions();
    // L'ordinateur réfléchit pendant l'animation du coup du joueur (au lieu d'attendre qu'elle finisse) ;
    // son coup n'est joué qu'une fois le plateau libre (voir onAiMessage)
    const busy = 0;
    const launch = () => {
      if (!thinking) return;
      // En partie coachée, le coach finit de parler avant de jouer
      if (cfg.mode === 'coach' && speechBusy()) { setTimeout(launch, 200); return; }
      const book = championBookMove();
      if (book) {
        const res = game.playUci(book);
        if (res) { thinking = false; afterMove(res); return; }
      }
      ask('move', cfg.level);
    };
    setTimeout(launch, Math.max(250, busy + 150));
  }
  // Coup tiré du répertoire d'ouvertures du champion adversaire (suites UCI dont le début correspond à la partie)
  function championBookMove() {
    const champ = activeChampion();
    if (!champ || !champ.openings) return null;
    const played = game.uciList();
    const next = champ.openings.map((line) => line.split(' '))
      .filter((line) => line.length > played.length && played.every((u, i) => line[i] === u))
      .map((line) => line[played.length]);
    return next.length ? next[Math.floor(Math.random() * next.length)] : null;
  }
  function cancelAi() { pending = null; thinking = false; judgeSeq++; judging = false; coachArrows = []; }

  /* ---------- Saisie : toucher ou glisser ---------- */
  function tapSquare(sq, boardSq = sq) {
    if (!game || !canInteract()) return;
    // Une case jouable sous le doigt l'emporte sur un personnage qui la recouvre
    if (selected >= 0 && boardSq >= 0 && game.movesFrom(selected).some((m) => m.to === boardSq)) { tryMove(selected, boardSq); return; }
    if (selected >= 0 && selected !== sq && !ownPiece(sq)) {
      if (!tryMove(selected, sq)) { selected = -1; renderBoard(); }
      return;
    }
    if (!ownPiece(sq)) { selected = -1; renderBoard(); return; }
    selected = selected === sq ? -1 : sq;
    hint = null;
    renderBoard();
  }
  const boardEl = $('board');
  let drag = null;
  function squareAt(x, y) {
    const rect = boardEl.getBoundingClientRect();
    if (x < rect.left || y < rect.top || x >= rect.right || y >= rect.bottom) return -1;
    const col = Math.floor(((x - rect.left) / rect.width) * 8);
    const row = Math.floor(((y - rect.top) / rect.height) * 8);
    return displayToBoard(row * 8 + col);
  }
  const ownPiece = (sq) => { const p = game.state.board[sq]; return p && colorOf(p) === game.turn; };

  boardEl.addEventListener('pointerdown', (e) => {
    if (!game || !canInteract()) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (sq < 0) return;
    if (selected >= 0 && selected !== sq && !ownPiece(sq)) {
      if (!tryMove(selected, sq)) { selected = -1; renderBoard(); }
      return;
    }
    if (!ownPiece(sq)) return;
    const wasSelected = selected === sq;
    selected = sq;
    hint = null;
    renderBoard();
    const cell = boardEl.querySelector(`[data-sq="${sq}"]`);
    const pc = cell && cell.querySelector('.pc');
    if (!pc) return;
    const ghost = pc.cloneNode(true);
    ghost.classList.add('drag');
    ghost.style.fontSize = getComputedStyle(pc).fontSize;
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    ghost.style.display = 'none';
    document.body.appendChild(ghost);
    drag = { from: sq, ghost, cell, wasSelected, moved: false, x: e.clientX, y: e.clientY };
    boardEl.setPointerCapture(e.pointerId);
  });
  boardEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.moved = true;
    drag.ghost.style.display = 'flex';
    drag.cell.classList.add('ghost');
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
  });
  function endDrag(e, cancelled) {
    if (!drag) return;
    const d = drag; drag = null;
    d.ghost.remove();
    d.cell.classList.remove('ghost');
    if (cancelled) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (d.moved) {
      if (sq >= 0 && sq !== d.from && tryMove(d.from, sq)) return;
      renderBoard();
    } else if (d.wasSelected) {
      selected = -1; renderBoard(); // second toucher : désélectionne
    }
  }
  boardEl.addEventListener('pointerup', (e) => endDrag(e, false));
  boardEl.addEventListener('pointercancel', (e) => endDrag(e, true));

  /* ---------- Actions ---------- */
  $('btn-undo').onclick = () => {
    if (animBusy()) return;
    // entre deux humains, reprendre un coup demande l'accord de l'adversaire
    if (humanVsHuman()) { requestTakeback(); return; }
    cancelAi();
    if (cfg.mode !== 'local') {
      game.undo();
      if (game.turn !== cfg.playerColor) game.undo();
    } else game.undo();
    selected = -1; hint = null;
    render(); save();
    maybeAiMove();
  };
  $('btn-hint').onclick = () => {
    if (!canInteract()) return;
    if (cfg.mode === 'coach') coachHintLevel = Math.min(3, coachHintLevel + 1);
    else toast(L('Recherche du meilleur coup…', 'Looking for the best move…'));
    ask('hint', 4);
  };
  $('btn-flip').onclick = () => { flipped = !flipped; render(); save(); };
  $('btn-resign').onclick = () => {
    if (result) return;
    modal({
      title: L('Abandonner ?', 'Resign?'), text: L('La partie sera comptée comme perdue.', 'The game will count as a loss.'),
      actions: [
        { label: L('Abandonner', 'Resign'), primary: true, onClick: () => {
          cancelAi();
          const loser = cfg.mode !== 'local' ? cfg.playerColor : game.turn;
          result = { result: loser === 'w' ? '0-1' : '1-0', reason: 'abandon' };
          if (cfg.mode === 'online') ON.endGame(cfg.online.id, result.result, 'abandon');
          finish();
        } },
        { label: L('Continuer à jouer', 'Keep playing'), ghost: true },
      ],
    });
  };
  $('btn-menu').onclick = () => { if (replay) { exitReplay(); return; } save(); show('home'); };
  $('btn-game-settings').onclick = () => { returnTo = 'game'; renderSettings(); show('settings'); };

