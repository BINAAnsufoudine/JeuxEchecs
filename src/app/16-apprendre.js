  /* ---------- Apprendre : mats guidés, finales de base, ouvertures, parties célèbres, défi du jour ---------- */
  const TR = window.TRAINER || { MATES: [], ENDGAMES: [], OPENINGS: [], FAMOUS: [], TUTORIALS: [] };
  const DAY = 86400000;
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  // même jour, écrit avec des zéros (2026-03-05) pour le classement en ligne
  const dayId = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Position de départ (fen et/ou coups déjà joués) et suite de coups en UCI ; null si une ligne ne se joue pas
  function trainLine(fen, moves, san) {
    const g = new Game(fen || undefined);
    for (const m of moves || []) if (!g.playSan(m)) return null;
    const start = window.Chess.toFen(g.state), line = [];
    for (const s of san) { const r = g.playSan(s); if (!r) return null; line.push(window.Chess.toUci(r.move)); }
    return { fen: start, line };
  }
  // Tous les coups qui matent tout de suite (plusieurs réponses justes possibles)
  function matingMoves(fen) {
    const g = new Game(fen), out = [];
    for (const m of g.moves()) { g.play(m.from, m.to, m.promo); const st = g.status(); if (st.over && st.reason === 'mat') out.push(window.Chess.toUci(m)); g.undo(); }
    return out;
  }
  const trainDone = () => store.get('trainDone', {});
  const markTrain = (key, value = Date.now()) => { const d = trainDone(); d[key] = value; store.set('trainDone', d); };
  function startTrainer(lesson, steps, onDone) {
    if (!lesson.resume || !lesson.resume.startsWith('tutorial:')) addPrincipleExamples(steps);
    pz = { kind: 'lesson', lesson: { theme: 'mat', ...lesson, back: 'train', noRating: true, onDone }, steps, idx: 0, misses: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  function startTutorial(chapter, continueCourse = true) {
    if (!chapter) return;
    const steps = chapter.steps.map((step) => ({ ...step, theme: 'mat' }));
    // Chaque notion repart de sa position de départ ; aucune pièce ni marque
    // du chapitre précédent ne doit rester sur le plateau.
    steps[0] = { ...steps[0], fen: steps[0].fen || window.Chess.START_FEN };
    startTrainer({ title: chapter.title, theme: 'mat', resume: `tutorial:${chapter.id}` }, steps, () => {
      markTrain(`tutorial:${chapter.id}`);
      const chapterIndex = TR.TUTORIALS.indexOf(chapter);
      if (continueCourse && chapterIndex >= 0 && chapterIndex + 1 < TR.TUTORIALS.length) return startTutorial(TR.TUTORIALS[chapterIndex + 1], true);
      toast(L(`Tutoriel terminé : ${chapter.title}`, `Tutorial complete: ${chapter.title}`));
      leavePuzzle();
    });
  }
  const sideName = (c) => (c === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black'));

  function startMateLesson(m) {
    const demo = trainLine(m.demo, m.moves, []);
    const steps = [{ text: `${m.name}. ${m.text}`, fen: demo.fen, marks: m.marks }];
    m.ex.forEach((e, i) => {
      const x = trainLine(e.fen, e.moves, e.san);
      if (!x) return;
      steps.push({ text: e.note || (i === 0 ? L('À toi : trouve le mat.', 'Your turn: find the mate.') : L('Encore un : trouve le mat.', 'One more: find the mate.')), fen: x.fen, line: x.line, alts: x.line.length === 1 ? matingMoves(x.fen) : undefined, theme: 'mat',
        why: L(`Échec et mat ! C'est ${m.name.toLowerCase()}.`, `Checkmate! That's the ${m.name.toLowerCase()}.`),
        wrong: L('Ce coup ne mate pas. Regarde toutes les cases où le roi pourrait fuir.', 'That move does not mate. Look at every square the king could escape to.') });
    });
    steps.push({ text: m.tip || L(`Bravo, tu connais maintenant ${m.name.toLowerCase()}. Cherche ce motif dans tes parties : il revient souvent.`, `Well done, you now know the ${m.name.toLowerCase()}. Look for this pattern in your games: it comes up often.`) });
    startTrainer({ title: m.name, theme: 'mat', resume: `mate:${m.id}` }, steps, () => { lessonReward(`mate:${m.id}`); markTrain(`mate:${m.id}`); leavePuzzle(); });
  }
  function startEndgame(e) {
    const examples = {
      kqk: [['d1d4'], ['e1f2']],
      krk: [['a1a5'], ['e1e2']],
      kbbk: [['c1e3'], ['e1d2']],
      lucena: [['c1c4'], ['c1c8']],
      philidor: [['a6e6'], ['a6a1']],
    };
    const steps = e.steps.map((text, i) => ({ text, fen: e.fen, demoMoves: (examples[e.id] || [])[i] }));
    steps.push({ text: e.goal === 'draw'
      ? L(`À toi : tu joues les ${sideName(e.color)} contre l'ordinateur au plus haut niveau. Obtiens la nulle. Appuie sur « Terminer » pour commencer.`, `Your turn: you play ${sideName(e.color)} against the computer at its highest level. Get the draw. Press "Finish" to start.`)
      : L(`À toi : tu joues les ${sideName(e.color)} contre l'ordinateur au plus haut niveau. Donne le mat. Appuie sur « Terminer » pour commencer.`, `Your turn: you play ${sideName(e.color)} against the computer at its highest level. Deliver mate. Press "Finish" to start.`), fen: e.fen });
    startTrainer({ title: e.name, theme: 'finale', resume: `end:${e.id}` }, steps, () => startGame({ mode: 'ai', playerColor: e.color, level: MAX_GAME_LEVEL, fen: e.fen, drill: e.id }, [], null, e.color === 'b'));
  }
  // Ouvertures : révision espacée (1, 3, 7, 14 puis 30 jours) ; une erreur la fait revenir vite
  const OPEN_GAPS = [1, 3, 7, 14, 30];
  const openingsSR = () => store.get('openingsSR', {});
  function openingEvidence(opening) {
    const line = trainLine(null, [], opening.san)?.line;
    if (!line || !line.length) return { line: [], eligible: [], used: [] };
    const threshold = Math.min(8, line.length);
    const eligible = store.get('archive', []).filter((g) => !g.fen && g.analysed && g.moves && g.moves.length >= Math.max(12, threshold) && g.color === opening.color);
    const used = eligible.filter((g) => line.slice(0, threshold).every((move, i) => g.moves[i] === move));
    return { line, eligible, used };
  }
  function openingMistakes(opening) {
    const { line, used } = openingEvidence(opening);
    if (!line.length || !used.length) return [];
    const mistakes = store.get('mistakes', []), found = [];
    for (const g of used.slice().reverse()) {
      for (const m of mistakes.filter((x) => x.date === g.id)) {
        const prefix = `${g.id}-`, ply = String(m.id).startsWith(prefix) ? Number(String(m.id).slice(prefix.length)) : NaN;
        if (!Number.isInteger(ply) || ply < 0 || ply >= line.length || (ply % 2 === 0 ? 'w' : 'b') !== opening.color || !m.fen || !m.line || !m.line[0]) continue;
        const badMove = uciOf(m), goodMove = m.line[0];
        if (badMove) found.push({ mistake: m, badMove, goodMove });
      }
      if (found.length >= 3) break;
    }
    return found.slice(0, 3);
  }
  function openingStats(opening) {
    const { line, eligible, used } = openingEvidence(opening);
    if (!line.length) return null;
    if (!eligible.length || !used.length) return { usage: eligible.length ? 0 : null, mastery: null };
    const mistakes = store.get('mistakes', []);
    let playerMoves = 0, cleanMoves = 0;
    for (const g of used) {
      const plies = Math.min(line.length, g.moves.length);
      for (let ply = 0; ply < plies; ply++) {
        if ((ply % 2 === 0 ? 'w' : 'b') !== opening.color) continue;
        playerMoves++;
        const madeMistake = mistakes.some((m) => m.date === g.id && Number(String(m.id).slice(String(g.id).length + 1)) === ply);
        if (!madeMistake) cleanMoves++;
      }
    }
    return {
      usage: Math.round(used.length / eligible.length * 100),
      mastery: playerMoves ? Math.round(cleanMoves / playerMoves * 100) : null,
    };
  }
  function openingMovePurpose(opening, uci, san, color, position) {
    if (/^O-O(-O)?/.test(san)) return L('Mettre le roi à l’abri et rapprocher les tours.', 'Bring the king to safety and connect the rooks.');
    const from = uci.slice(0, 2), to = uci.slice(2, 4), piece = position.state.board[window.Chess.sqIndex(from)]?.toLowerCase();
    const captured = position.state.board[window.Chess.sqIndex(to)];
    const center = ['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5'].includes(to);
    const named = {
      italienne: { 'c2c3': L('Soutenir le prochain coup d4 pour prendre le centre.', 'Support the coming d4 push to take the centre.'), 'f1c4': L('Développer le fou sur une diagonale active et viser le point faible f7.', 'Develop the bishop on an active diagonal and target the weak f7 square.'), 'd2d4': L('Ouvrir le centre pendant que les pièces blanches sont prêtes à jouer.', 'Open the centre while White’s pieces are ready to play.') },
      espagnole: { 'f1b5': L('Mettre la pression sur le cavalier c6 qui défend le pion e5.', 'Pressure the c6 knight that defends the e5 pawn.'), 'a7a6': L('Demander au fou blanc de choisir sa case et préparer l’expansion b5.', 'Ask the white bishop to choose a square and prepare the b5 advance.'), 'b7b5': L('Chasser le fou et gagner de l’espace sur l’aile dame.', 'Chase the bishop and gain queenside space.') },
      gambitdame: { 'c2c4': L('Contester le centre avec le pion c et proposer un pion pour détourner le pion d5.', 'Challenge the centre with the c-pawn and offer a pawn to deflect the d5-pawn.') },
      londres: { 'c1f4': L('Développer le fou avant de jouer e3, sans l’enfermer derrière les pions.', 'Develop the bishop before playing e3, so it is not trapped behind the pawns.') },
      sicilienne: { 'c7c5': L('Contester le centre depuis le côté et créer une position déséquilibrée.', 'Challenge the centre from the side and create an unbalanced position.'), 'a7a6': L('Empêcher les pièces blanches d’arriver en b5 et préparer une poussée sur l’aile dame.', 'Stop White’s pieces from settling on b5 and prepare queenside expansion.') },
      carokann: { 'c7c6': L('Préparer d5 tout en gardant le fou de cases blanches libre.', 'Prepare d5 while keeping the light-squared bishop free.') },
      francaise: { 'e7e6': L('Préparer la poussée d5 pour contester le centre blanc.', 'Prepare the d5 push to challenge White’s centre.') },
      scandinave: { 'd7d5': L('Attaquer immédiatement le pion blanc e4 et contester le centre.', 'Immediately attack White’s e4 pawn and challenge the centre.'), 'd8d5': L('Reprendre le pion central pour rétablir l’équilibre matériel.', 'Recapture the central pawn to restore material balance.'), 'd5a5': L('Mettre la dame à l’abri tout en gardant la pression sur le centre.', 'Move the queen to safety while keeping pressure on the centre.') },
      estindienne: { 'g7g6': L('Préparer le fianchetto : le fou ira en g7 pour viser le centre à distance.', 'Prepare a fianchetto: the bishop will go to g7 and target the centre from afar.'), 'f8g7': L('Placer le fou sur la grande diagonale pour contrôler le centre à distance.', 'Place the bishop on the long diagonal to control the centre from afar.'), 'e7e5': L('Frapper le centre blanc après avoir terminé le développement.', 'Strike White’s centre after completing development.') },
    }[opening.id]?.[uci];
    if (named) return named;
    if (captured) return center
      ? L('Échanger au centre pour ouvrir les lignes et conserver une présence dans la lutte centrale.', 'Exchange in the centre to open lines and stay involved in the central fight.')
      : L('Capturer la pièce adverse pour gagner du matériel ou simplifier la position.', 'Capture the enemy piece to win material or simplify the position.');
    if (piece === 'p') {
      if (center) return L('Occuper ou soutenir le centre, et ouvrir des lignes pour les pièces.', 'Occupy or support the centre and open lines for the pieces.');
      if (to[0] === 'c') return L('Contester le centre depuis l’aile et préparer le développement des pièces.', 'Challenge the centre from the flank and prepare to develop the pieces.');
      if (to[0] === 'a' && color === 'b') return L('Gagner de l’espace sur l’aile dame et préparer une avancée de pion.', 'Gain queenside space and prepare a pawn advance.');
      return L('Soutenir les pions centraux et préparer une case de développement pour les pièces.', 'Support the central pawns and prepare a square for a piece to develop to.');
    }
    if (piece === 'n') return L('Développer le cavalier vers le centre pour contrôler davantage de cases.', 'Develop the knight toward the centre to control more squares.');
    if (piece === 'b') return L('Développer le fou sur une diagonale active pour participer au contrôle du centre.', 'Develop the bishop on an active diagonal to help control the centre.');
    if (piece === 'r') return L('Placer la tour sur une colonne utile pour soutenir les pions et les pièces.', 'Place the rook on a useful file to support the pawns and pieces.');
    if (piece === 'q') return L('Replacer la dame sur une case sûre où elle soutient le développement.', 'Move the queen to a safe square where it supports development.');
    return L('Améliorer la coordination des pièces et préparer la suite du plan.', 'Improve piece coordination and prepare the next part of the plan.');
  }
  function startOpening(o) {
    const pre = o.color === 'b' ? o.san.slice(0, 1) : [];
    const x = trainLine(null, pre, o.san.slice(pre.length));
    const demo = trainLine(null, [], o.san);
    if (!x || !demo) return;
    const steps = [];
    const demoPosition = new Game(demo.fen);
    demo.line.forEach((uci, index) => {
      const fen = window.Chess.toFen(demoPosition.state), color = demoPosition.state.turn;
      const played = demoPosition.playUci(uci);
      if (!played) return;
      const purpose = openingMovePurpose(o, uci, played.san, color, new Game(fen));
      const moveLabel = `${Math.floor(index / 2) + 1}${index % 2 ? '…' : '.'} ${played.san}`;
      const intro = index === 0 ? `${o.name}. ${o.text} ` : '';
      steps.push({
        text: L(`${intro}Coup ${moveLabel} (${sideName(color)}) : ${purpose}`, `${intro}Move ${moveLabel} (${sideName(color)}): ${purpose}`),
        fen, demoMoves: [uci], demoSpeech: openingSpeechLine(fen, [uci]), annotateRelations: true, syncDemoWithVoice: true,
        demoStartText: L(`Regarde ${moveLabel} : la flèche verte montre le déplacement, les rouges les attaques et les bleues les défenses.`, `Watch ${moveLabel}: the green arrow shows the move, red arrows show attacks and blue arrows show defenses.`),
        demoDoneText: L(`But du coup : ${purpose} ${L('Appuie sur Continuer pour observer le coup suivant.', 'Press Continue to see the next move.')}`, `Purpose: ${purpose} Press Continue to see the next move.`),
      });
    });
    for (const { mistake: m, badMove, goodMove } of openingMistakes(o)) {
      const goodSan = (() => { try { return new Game(m.fen).playUci(goodMove).san; } catch { return goodMove; } })();
      const arrow = (uci, color) => ({ from: window.Chess.sqIndex(uci.slice(0, 2)), to: window.Chess.sqIndex(uci.slice(2, 4)), color });
      steps.push({ text: L(`Dans ta partie du ${fmtDate(m.date)}, au coup ${m.move}, tu as joué ${m.played}. Regarde ce coup joué.`, `In your game on ${fmtDate(m.date)}, on move ${m.move}, you played ${m.played}. Watch that move.`), fen: m.fen, demoMoves: [badMove], demoSpeech: openingSpeechLine(m.fen, [badMove]), arrows: [arrow(badMove, 'red')], annotateRelations: true,
        demoStartText: L('Voici le coup joué dans ta partie…', 'Here is the move played in your game…'),
        demoDoneText: L('Ce coup a été signalé par l’analyse. Regarde la correction.', 'The analysis flagged this move. Now look at the correction.') });
      steps.push({ text: L(`Le meilleur coup était ${goodSan}.`, `The best move was ${goodSan}.`), fen: m.fen, demoMoves: [goodMove], demoSpeech: openingSpeechLine(m.fen, [goodMove]), arrows: [arrow(goodMove, 'green')], annotateRelations: true,
        demoStartText: L('La flèche montre le bon coup…', 'The arrow shows the right move…'),
        demoDoneText: L('Garde ce coup en mémoire.', 'Remember this move.') });
    }
    const examplePly = o.color === 'w' ? 0 : 1;
    const exampleUci = demo.line[examplePly];
    if (exampleUci) {
      const examplePosition = new Game(demo.fen);
      for (const uci of demo.line.slice(0, examplePly)) examplePosition.playUci(uci);
      const exampleFen = window.Chess.toFen(examplePosition.state);
      const exampleColor = examplePosition.state.turn;
      const example = examplePosition.playUci(exampleUci);
      if (example) {
        const purpose = openingMovePurpose(o, exampleUci, example.san, exampleColor, new Game(exampleFen));
        const label = `${Math.floor(examplePly / 2) + 1}${examplePly % 2 ? '…' : '.'} ${example.san}`;
        steps.push({
          text: L(`Petit exemple guidé : ${sideName(exampleColor)} joue ${label}. Ce coup sert à ${purpose.charAt(0).toLowerCase()}${purpose.slice(1)}`, `Simple guided example: ${sideName(exampleColor)} plays ${label}. The purpose is to ${purpose.charAt(0).toLowerCase()}${purpose.slice(1)}`),
          fen: exampleFen, demoMoves: [exampleUci], demoSpeech: openingSpeechLine(exampleFen, [exampleUci]), annotateRelations: true, syncDemoWithVoice: true,
          demoStartText: L('Observe cet exemple simple et les flèches qui montrent le coup.', 'Watch this simple example and the arrows showing the move.'),
          demoDoneText: L('Tu as vu le coup et son objectif. À toi de jouer maintenant : appuie sur Continuer.', 'You have seen the move and its purpose. Now it is your turn: press Continue.'),
        });
      }
    }
    steps.push({ text: L(`Rejoue de mémoire les coups des ${sideName(o.color)}. Les réponses adverses se jouent seules.`, `Replay ${sideName(o.color)}'s moves from memory. The opponent's replies are played for you.`), fen: x.fen, line: x.line, theme: 'tactique', annotateRelations: true,
        why: L('Ouverture rejouée en entier !', 'Opening replayed in full!'),
        wrong: L(`Ce n'est pas le coup de la ${o.name.toLowerCase()}. Réessaie, ou demande un indice.`, `That is not the ${o.name} move. Try again, or ask for a hint.`) });
    startTrainer({ title: o.name, theme: 'tactique', resume: `open:${o.id}` }, steps, () => {
      const sr = openingsSR(), row = sr[o.id] || { stage: 0 };
      const clean = !pz.failed && !pz.misses;
      row.stage = clean ? Math.min(OPEN_GAPS.length, row.stage + 1) : 0;
      row.due = Date.now() + (clean ? OPEN_GAPS[row.stage - 1] * DAY : 10 * 60000);
      sr[o.id] = row; store.set('openingsSR', sr);
      if (clean) { reward(10, 15, L('Ouverture révisée', 'Opening reviewed')); questEvent('opening'); }
      questEvent('lesson');
      toast(clean ? L(`Parfait ! Prochaine révision dans ${OPEN_GAPS[row.stage - 1]} jour${OPEN_GAPS[row.stage - 1] > 1 ? 's' : ''}.`, `Perfect! Next review in ${OPEN_GAPS[row.stage - 1]} day${OPEN_GAPS[row.stage - 1] > 1 ? 's' : ''}.`) : L('Quelques erreurs : cette ouverture reviendra bientôt.', 'A few mistakes: this opening will come back soon.'));
      leavePuzzle();
    });
  }
  // Devine le coup : on joue le camp du champion et on cherche ses coups
  function startFamous(f) {
    const x = trainLine(null, f.san.slice(0, f.from), f.san.slice(f.from));
    if (!x) return;
    const champ = champById(f.champion), who = champ ? champShort(champ) : '';
    const total = Math.ceil(x.line.length / 2);
    const steps = [
      { text: `${f.name} (${f.players}). ${f.text}`, fen: x.fen },
      { text: L(`Tu joues ${who} avec les ${sideName(f.color)}. Devine chacun de ses coups : les réponses de l'adversaire se jouent seules.`, `You play ${who} with ${sideName(f.color)}. Guess each of his moves: the opponent's replies are played for you.`), fen: x.fen, line: x.line, theme: 'tactique',
        why: L(`Partie terminée ! C'est ainsi que ${who} l'a jouée.`, `Game over! That is how ${who} played it.`),
        wrong: L(`Ce n'est pas le coup joué par ${who}. Réessaie, ou demande un indice.`, `That is not the move ${who} played. Try again, or ask for a hint.`) },
    ];
    startTrainer({ title: f.name, theme: 'tactique', resume: `famous:${f.id}` }, steps, () => {
      const found = Math.max(0, total - (pz.misses || 0));
      const best = Math.max(found, trainDone()[`famous:${f.id}`] || 0);
      markTrain(`famous:${f.id}`, best);
      reward(Math.max(2, 2 * found), Math.max(5, 3 * found), L('Devine le coup', 'Guess the move')); questEvent('lesson');
      toast(L(`${found} coup${found > 1 ? 's' : ''} sur ${total} trouvé${found > 1 ? 's' : ''} du premier coup.`, `${found} move${found === 1 ? '' : 's'} out of ${total} found at the first try.`));
      leavePuzzle();
    });
  }
  // Défi du jour : le même problème pour toute la journée ; une série de jours réussis à garder
  // Défi du jour : trois problèmes par jour ; ceux qui n'ont pas été trouvés du premier coup reviennent dans la journée
  function dailyPuzzles() {
    const key = todayKey(); let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = BANK.filter((p) => p.line && p.line.length && (p.rating || 3) >= 3);
    const src = pool.length ? pool : BANK, out = [];
    for (let i = 0; out.length < 3 && i < 30; i++) {
      const p = src[(h + i * 7919) % src.length];
      if (p && !out.includes(p)) out.push(p);
    }
    return out;
  }
  // État du jour : pour chaque problème, 'ok' (trouvé du premier coup) ou 'retry' (à refaire)
  function dailyState() {
    const d = store.get('daily', { streak: 0, best: 0 });
    if (d.day !== todayKey()) { d.day = todayKey(); d.res = {}; d.finished = false; d.first = {}; d.started = 0; d.sent = false; }
    d.first = d.first || {};
    return d;
  }
  function startDaily(i) {
    const list = dailyPuzzles(), p = list[i], d = dailyState();
    if (!p) return;
    if (!d.started) { d.started = Date.now(); store.set('daily', d); } // le chrono du classement part au premier problème ouvert
    const side = new Game(p.fen).turn, again = d.res[i] === 'retry';
    const steps = [{
      text: L(`Défi du jour, problème ${i + 1} sur 3${again ? ', deuxième chance' : ''}. Tu joues les ${sideName(side)}. ${PZ[p.theme] ? PZ[p.theme].name : ''} : trouve le meilleur coup du premier coup.`,
        `Daily challenge, puzzle ${i + 1} of 3${again ? ', second chance' : ''}. You play ${sideName(side)}. ${PZ[p.theme] ? PZ[p.theme].name : ''}: find the best move at the first try.`),
      fen: p.fen, line: p.line, alts: p.alts, theme: p.theme,
    }];
    startTrainer({ title: L(`Défi du jour · ${i + 1}/3`, `Daily challenge · ${i + 1}/3`), theme: p.theme, resume: `daily:${i}` }, steps, () => {
      const clean = !pz.failed && !pz.misses;
      const st = dailyState();
      if (st.res[i] !== 'ok') st.res[i] = clean ? 'ok' : 'retry';
      if (st.first[i] == null) st.first[i] = clean; // pour le classement, seul le premier essai compte
      const okCount = [0, 1, 2].filter((k) => st.res[k] === 'ok').length;
      if (okCount === 3 && !st.finished) {
        // la série avance quand les trois problèmes du jour sont trouvés du premier coup (au besoin en les refaisant)
        const yesterday = todayKey(new Date(Date.now() - DAY));
        st.streak = st.last === yesterday ? (st.streak || 0) + 1 : 1;
        st.best = Math.max(st.best || 0, st.streak); st.last = todayKey(); st.finished = true;
        toast(L(`Défi du jour réussi ! Série : ${st.streak} jour${st.streak > 1 ? 's' : ''}.`, `Daily challenge complete! Streak: ${st.streak} day${st.streak === 1 ? '' : 's'}.`));
        setTimeout(() => { reward(40 + 5 * Math.min(st.streak, 10), 50, L('Défi du jour', 'Daily challenge')); questEvent('daily'); countMode('daily'); }, 50);
        setTimeout(() => sendDailyScore(dailyState()), 100);
      } else if (!clean) toast(L('Pas du premier coup : ce problème te sera reproposé aujourd\'hui.', 'Not at the first try: this puzzle will come back today.'));
      else toast(L(`Bravo ! ${okCount} sur 3 aujourd'hui.`, `Well done! ${okCount} out of 3 today.`));
      store.set('daily', st);
      leavePuzzle();
    });
  }
  // Classement commun : envoyé une fois, dès que le joueur connecté a fini ses trois problèmes
  function sendDailyScore(st) {
    if (st.sent || !st.started || !window.Online || !Online.user) return;
    const first = [0, 1, 2].filter((k) => st.first[k] === true).length;
    Online.submitDaily(dayId(), first, Math.max(5000, Date.now() - st.started)).then((ok) => {
      if (!ok) return;
      const cur = dailyState(); cur.sent = true; store.set('daily', cur);
      if (trainSection === 'daily' && document.body.dataset.screen === 'train') renderTrain('daily');
    });
  }
  const fmtTime = (ms) => { const s = Math.round(ms / 1000); return s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`; };
  function boardRows(rows, mine, sub) {
    if (!rows.length) return `<p class="level-help">${L('Personne pour l’instant : sois le premier !', 'Nobody yet: be the first!')}</p>`;
    const top = rows.slice(0, 10), me = rows.findIndex((r) => r.uid === mine);
    const line = (r, i) => `<li class="${r.uid === mine ? 'me' : ''}"><b>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b><span>${escHtml(r.pseudo || '?')}</span><small>${sub(r)}</small><strong>${r.pts}</strong></li>`;
    return `<ol class="daily-board">${top.map(line).join('')}${me >= 10 ? line(rows[me], me) : ''}</ol>`;
  }
  // Classement du jour (et de la saison du mois), chargé à l'ouverture de l'onglet
  function loadDailyBoard() {
    const box = $('daily-board-box');
    if (!box) return;
    if (!window.Online || !Online.user) { box.innerHTML = `<p class="level-help">${L('Connecte-toi pour apparaître dans le classement du jour : tous les joueurs ont les mêmes problèmes.', 'Sign in to appear in the daily ranking: every player gets the same puzzles.')}</p>`; return; }
    const d = new Date(), month = dayId(d).slice(0, 7), mine = Online.user.uid;
    Promise.all([Online.dailyBoard(dayId(d)), Online.seasonBoard(month)]).then(([day, season]) => {
      if (!document.body.contains(box)) return;
      box.innerHTML = `<h3 class="train-h">${L('Classement du jour', 'Today’s ranking')}<small>${L('10 pts pour finir, +10 par problème trouvé du premier coup', '10 pts to finish, +10 per puzzle solved at the first try')}</small></h3>`
        + boardRows(day, mine, (r) => `${r.first}/3 · ${fmtTime(r.ms)}`)
        + `<h3 class="train-h">${L('Saison du mois', 'This month’s season')}<small>${L('Total des points du défi du jour', 'Total daily challenge points')}</small></h3>`
        + boardRows(season, mine, (r) => L(`${r.days} jour${r.days > 1 ? 's' : ''}`, `${r.days} day${r.days === 1 ? '' : 's'}`));
    }).catch(() => { box.innerHTML = `<p class="level-help">${L('Classement indisponible pour le moment.', 'Ranking unavailable right now.')}</p>`; });
  }
  let trainSection = 'daily';
  const TRAIN_TITLES = L({ tutorial: 'Tutoriel débutant', lesson: 'Leçon du jour', daily: 'Défi du jour', mates: 'Les mats', endgames: 'Finales de base', openings: 'Ouvertures', famous: 'Devine le coup' },
    { tutorial: 'Beginner tutorial', lesson: 'Lesson of the day', daily: 'Daily challenge', mates: 'Checkmates', endgames: 'Basic endgames', openings: 'Openings', famous: 'Guess the move' });
  const TRAIN_HELP = L({
    tutorial: 'Découvre les échecs à ton rythme : choisis librement un chapitre, apprends le vocabulaire et entraîne-toi sur l’échiquier. Chaque chapitre peut être repris quand tu veux.',
    lesson: 'Découvre une notion un peu au-dessus de ton niveau actuel. Les leçons déjà terminées ne sont pas reproposées ; un exercice adapté à ton niveau suit l’explication.',
    daily: 'Trois problèmes par jour. Ceux que tu ne trouves pas du premier coup te sont reproposés dans la journée. Réussis les trois pour prolonger ta série.',
    mates: 'Choisis le mat que tu veux apprendre : Maître Sissa te le montre, puis tu le trouves toi-même.',
    endgames: 'Apprends la méthode, puis joue la position contre l\'ordinateur au plus haut niveau.',
    openings: 'Découvre les coups d\'une ouverture, puis rejoue-les de mémoire. Elles reviennent à réviser au bon moment.',
    famous: 'Prends la place d\'un champion dans sa partie la plus célèbre et devine ses coups.',
  }, {
    tutorial: 'Discover chess at your own pace: choose any chapter, learn the vocabulary, and practise on the board. You can revisit each chapter whenever you like.',
    lesson: 'Discover a concept just above your current level. Completed lessons will not be repeated; an exercise adapted to your level follows the explanation.',
    daily: 'Three puzzles a day. The ones you miss at the first try come back later the same day. Solve all three to extend your streak.',
    mates: 'Choose the mate you want to learn: Master Sissa shows it to you, then you find it yourself.',
    endgames: 'Learn the method, then play the position against the computer at its highest level.',
    openings: 'Discover the moves of an opening, then replay them from memory. They come back for review at the right time.',
    famous: 'Take a champion\'s place in their most famous game and guess their moves.',
  });
  const BEGINNER_PATH = [
    { number: 3, id: 'basics', title: L('Échecs : application tutoriel pour prendre de bonnes bases', 'Chess: a tutorial app for learning the basics'), description: L('Découvre les règles, l’échiquier et les pièces.', 'Learn the rules, the board and the pieces.') },
    { number: 5, id: 'check', title: L('Échec', 'Check'), description: L('Comprends la menace contre le roi et les façons d’y répondre.', 'Understand threats against the king and how to answer them.') },
    { number: 6, id: 'mate', title: L('Échec et mat', 'Checkmate'), description: L('Apprends à reconnaître et donner le mat.', 'Learn to recognize and deliver checkmate.') },
    { number: 7, id: 'stalemate', title: L('Pat', 'Stalemate'), description: L('Distingue le pat de l’échec et mat.', 'Tell stalemate apart from checkmate.') },
    { number: 8, id: 'draws', title: L('Comment faire match nul ?', 'How to draw a game'), description: L('Découvre les principales règles de nulle.', 'Learn the main ways a game can be drawn.') },
    { number: 9, id: 'mate-patterns', title: L('Toutes les façons de faire échec et mat', 'Ways to checkmate'), description: L('Observe plusieurs motifs de mat, puis entraîne-toi.', 'Study checkmate patterns, then practise them.') },
    { number: 10, id: 'castling', title: L('Défendre le roi : le roque', 'Protect the king: castling'), description: L('Mets ton roi à l’abri et active ta tour.', 'Keep your king safe and activate your rook.') },
    { number: 11, id: 'openings', title: L('Comment commencer une partie ? Les principes de l’ouverture', 'How to start a game: opening principles'), description: L('Développe tes pièces et contrôle le centre.', 'Develop your pieces and control the centre.') },
    { number: 13, id: 'tactics', title: L('Toutes les tactiques utiles', 'Useful tactical ideas'), description: L('Choisis des thèmes tactiques et résous des problèmes.', 'Choose tactical themes and solve puzzles.') },
    { number: 14, id: 'blunders', title: L('Comment éviter les gaffes ?', 'How to avoid blunders'), description: L('Travaille les erreurs révélées par tes parties.', 'Work on mistakes found in your games.') },
    { number: 15, id: 'strategy', title: L('Comment créer une stratégie ?', 'How to build a strategy'), description: L('Apprends un principe et observe-le dans une position.', 'Learn a principle and see it in a position.') },
    { number: 16, id: 'master', title: L('Comment jouer comme un maître ?', 'How to play like a master'), description: L('Découvre les parties des champions et devine leurs coups.', 'Explore master games and guess their moves.') },
  ];
  function openBeginnerTopic(id) {
    if (id === 'basics') return startTutorial(TR.TUTORIALS.find((chapter) => chapter.id === 'board'));
    if (id === 'check') return startTutorial(TR.TUTORIALS.find((chapter) => chapter.id === 'check'), false);
    if (id === 'mate') return startMateLesson(TR.MATES.find((mate) => mate.id === 'couloir'));
    if (id === 'stalemate' || id === 'draws' || id === 'castling') return startTutorial(TR.TUTORIALS.find((chapter) => chapter.id === id), false);
    if (id === 'mate-patterns') { renderTrain('mates'); show('train'); return; }
    if (id === 'openings') { renderTrain('openings'); show('train'); return; }
    if (id === 'tactics') { problemsSection = 'themes'; renderProblems(); show('problems'); return; }
    if (id === 'blunders') { $('btn-program').click(); return; }
    if (id === 'strategy') return startTutorial(TR.TUTORIALS.find((chapter) => chapter.id === 'strategy'), false);
    if (id === 'master') { renderTrain('famous'); show('train'); }
  }
  function dailyLessonOfDay() {
    const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const completed = store.get('lessonsDone', {});
    const available = LESSONS.filter((lesson) => !completed[lesson.theme]);
    if (!available.length) return null;
    const open = store.get('openLesson', null);
    const openTheme = open && /^lesson:/.test(open.key || '') ? open.key.slice('lesson:'.length) : null;
    const inProgress = available.find((lesson) => lesson.theme === openTheme);
    if (inProgress) return inProgress;
    const saved = store.get('dailyLesson', null);
    if (saved && saved.date === date) {
      const same = available.find((lesson) => lesson.theme === saved.theme);
      if (same) return same;
    }
    const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
    const lesson = available[dayNumber % available.length];
    store.set('dailyLesson', { date, theme: lesson.theme });
    return lesson;
  }
  function startDailyLesson() {
    const lesson = dailyLessonOfDay();
    if (!lesson) return toast(L('Tu as terminé toutes les leçons disponibles. Retrouve les thèmes à retravailler dans ton programme personnalisé.', 'You have completed all available lessons. Find themes to revisit in your personalized plan.'));
    const open = store.get('openLesson', null);
    if (open && open.key === `lesson:${lesson.theme}`) return resumeOpenLesson();
    startLesson(lesson.theme, { daily: true });
  }
  function renderTrain(section = trainSection) {
    trainSection = section;
    $('train-title').textContent = TRAIN_TITLES[section];
    const done = trainDone(), sr = openingsSR(), d = dailyState(), now = Date.now();
    const item = (key, title, sub, extra = '') => `<button type="button" class="btn replay-item" data-train="${key}"><strong>${escHtml(title)}${extra}</strong><span>${escHtml(sub)}</span></button>`;
    const ok = ' ✓';
    let html = `<p class="level-help">${TRAIN_HELP[section]}</p>`;
    if (section === 'tutorial') html += `<div class="replay-items tutorial-items">${BEGINNER_PATH.map((topic) => item(`beginner:${topic.id}`, `${topic.number}. ${topic.title}`, topic.description)).join('')}</div>`;
    if (section === 'lesson') {
      const lesson = dailyLessonOfDay();
      const completed = LESSONS.filter((entry) => store.get('lessonsDone', {})[entry.theme]).length;
      const open = store.get('openLesson', null), inProgress = lesson && open && open.key === `lesson:${lesson.theme}`;
      html += lesson
        ? `<div class="replay-items"><button type="button" class="btn replay-item" data-train="lesson-day"><strong>📘 ${escHtml(lesson.title)}</strong><span>${escHtml(PZ[lesson.theme].name)} · ${inProgress ? L(`À reprendre · étape ${open.idx + 1}/${open.total}`, `Resume · step ${open.idx + 1}/${open.total}`) : L('Nouvelle notion', 'New concept')} · ${L(`Notions terminées : ${completed}/${LESSONS.length}`, `Completed concepts: ${completed}/${LESSONS.length}`)}</span></button></div>`
        : `<p class="level-help">${L('Tu as terminé toutes les notions disponibles. Elles restent dans ton programme personnalisé pour les révisions.', 'You have completed every available concept. They remain in your personalized plan for review.')}</p>`;
    }
    if (section === 'daily') {
      const label = { ok: L('trouvé du premier coup', 'found at the first try'), retry: L('à refaire', 'to try again') };
      html += `<p class="level-help">${L(`Série en cours : ${d.streak || 0} jour${(d.streak || 0) > 1 ? 's' : ''} · record : ${d.best || 0}`, `Current streak: ${d.streak || 0} day${(d.streak || 0) === 1 ? '' : 's'} · best: ${d.best || 0}`)}</p>`;
      // les problèmes ratés sont reproposés en premier
      const order = [0, 1, 2].sort((x, y) => (d.res[y] === 'retry') - (d.res[x] === 'retry'));
      html += `<div class="replay-items">${order.map((k) => item(`daily:${k}`, L(`Problème ${k + 1}`, `Puzzle ${k + 1}`) + (d.res[k] === 'retry' ? L(' · à refaire', ' · try again') : ''), d.res[k] ? label[d.res[k]] : L('à faire', 'to do'), d.res[k] === 'ok' ? ok : '')).join('')}</div>`;
      html += `<div id="daily-board-box"><p class="level-help">${L('Chargement du classement…', 'Loading the ranking…')}</p></div>`;
    }
    if (section === 'mates') html += `<div class="replay-items">${TR.MATES.map((m) => item(`mate:${m.id}`, m.name, m.text.split('.')[0] + '.', done[`mate:${m.id}`] ? ok : '')).join('')}</div>`;
    if (section === 'endgames') html += `<div class="replay-items">${TR.ENDGAMES.map((e) => item(`end:${e.id}`, e.name, e.goal === 'draw' ? L('Défends et obtiens la nulle contre l\'ordinateur', 'Defend and draw against the computer') : L('Donne le mat contre l\'ordinateur', 'Deliver mate against the computer'), done[`end:${e.id}`] ? ok : '')).join('')}</div>`;
    if (section === 'openings') html += `<div class="replay-items">${TR.OPENINGS.map((o) => {
      const r = sr[o.id], due = r && r.due <= now;
      const stats = openingStats(o);
      const usage = stats && stats.usage != null ? `${stats.usage} %` : '—';
      const mastery = stats && stats.mastery != null ? `${stats.mastery} %` : '—';
      const sub = `${L('Avec les', 'With')} ${sideName(o.color)} · ${!r ? L('nouvelle', 'new') : due ? L('à réviser', 'to review') : L(`révision dans ${Math.max(1, Math.round((r.due - now) / DAY))} j`, `review in ${Math.max(1, Math.round((r.due - now) / DAY))} d`)} · ${L(`Utilisation ${usage} · Maîtrise ${mastery}`, `Used ${usage} · Mastery ${mastery}`)}`;
      return item(`open:${o.id}`, o.name, sub, r && r.stage && !due ? ok : '');
    }).join('')}</div>`;
    if (section === 'famous') html += `<div class="replay-items">${TR.FAMOUS.map((f) => item(`famous:${f.id}`, f.name, `${f.players}${done[`famous:${f.id}`] != null ? L(` · record : ${done[`famous:${f.id}`]} coups trouvés`, ` · best: ${done[`famous:${f.id}`]} moves found`) : ''}`)).join('')}</div>`;
    $('train-body').innerHTML = html;
    if (section === 'daily') { if (d.finished && !d.sent) sendDailyScore(d); loadDailyBoard(); }
  }
  $('train-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-train]'); if (!b) return;
    const [kind, id] = b.dataset.train.split(':');
    if (kind === 'beginner') return openBeginnerTopic(id);
    if (kind === 'lesson-day') return startDailyLesson();
    if (kind === 'tutorial') return startTutorial(TR.TUTORIALS.find((x) => x.id === id));
    if (kind === 'daily') return startDaily(Number(id) || 0);
    if (kind === 'mate') return startMateLesson(TR.MATES.find((x) => x.id === id));
    if (kind === 'end') return startEndgame(TR.ENDGAMES.find((x) => x.id === id));
    if (kind === 'open') return startOpening(TR.OPENINGS.find((x) => x.id === id));
    if (kind === 'famous') return startFamous(TR.FAMOUS.find((x) => x.id === id));
  });
  $('btn-train-menu').onclick = () => {
    const open = $('train-submenu').hidden;
    $('train-submenu').hidden = !open;
    $('btn-train-menu').setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('[data-train-section]').forEach((b) => { b.onclick = () => { returnTo = 'home'; renderTrain(b.dataset.trainSection); show('train'); }; });

