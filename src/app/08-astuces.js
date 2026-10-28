  /* ---------- Astuces solutions : les motifs d'erreur qui reviennent dans tes parties ---------- */
  const PIECE_FR = L({
    p: { mine: 'ton pion', theirs: 'un pion adverse', name: 'pion' },
    n: { mine: 'ton cavalier', theirs: 'un cavalier adverse', name: 'cavalier' },
    b: { mine: 'ton fou', theirs: 'un fou adverse', name: 'fou' },
    r: { mine: 'ta tour', theirs: 'une tour adverse', name: 'tour' },
    q: { mine: 'ta dame', theirs: 'la dame adverse', name: 'dame' },
    k: { mine: 'ton roi', theirs: 'le roi adverse', name: 'roi' },
  }, {
    p: { mine: 'your pawn', theirs: 'an enemy pawn', name: 'pawn' },
    n: { mine: 'your knight', theirs: 'an enemy knight', name: 'knight' },
    b: { mine: 'your bishop', theirs: 'an enemy bishop', name: 'bishop' },
    r: { mine: 'your rook', theirs: 'an enemy rook', name: 'rook' },
    q: { mine: 'your queen', theirs: 'the enemy queen', name: 'queen' },
    k: { mine: 'your king', theirs: 'the enemy king', name: 'king' },
  });
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Titre, explication de l'erreur, solution et conséquence, selon le thème et le sens de la faute
  function tipText(theme, kind, piece, n) {
    const P = PIECE_FR[piece] || PIECE_FR.p, mine = P.mine;
    const fois = L(`${n} fois`, n === 1 ? 'once' : `${n} times`);
    if (LANG === 'en') return tipTextEn(theme, kind, P, mine, fois);
    const T = {
      'fourchette:allowed': [`Fourchette sur ${mine}`, `${cap(fois)}, l'adversaire a attaqué deux de tes pièces d'un seul coup, et c'est ${mine} qui y est passé. Une fourchette marche quand deux de tes pièces sont sur des cases qu'une même pièce adverse peut toucher.`,
        "Avant chaque coup, regarde où les cavaliers, les pions et la dame adverses peuvent aller au coup suivant. Si l'une de ces cases touche deux de tes pièces, ou ton roi et une pièce, déplace l'une d'elles ou protège la case.", 'sa pièce attaque deux de tes pièces à la fois'],
      'fourchette:missed': [`Fourchette manquée avec ${mine}`, `${cap(fois)}, ${mine} pouvait attaquer deux pièces adverses à la fois, et le coup t'a échappé.`,
        "Cherche les pièces adverses sans défense et le roi, puis demande-toi si une de tes pièces peut en toucher deux en un seul coup. Les cavaliers et la dame sont les champions de la fourchette.", ''],
      'clouage:allowed': [`${cap(mine)} se fait clouer`, `${cap(fois)}, l'adversaire a cloué ${mine} : elle ne pouvait plus bouger sans exposer une pièce plus précieuse derrière elle.`,
        "N'aligne pas ton roi ou ta dame derrière une autre pièce, sur une colonne ou une diagonale ouverte face à un fou, une tour ou la dame adverse. Roque tôt. Si le clouage arrive, interpose une pièce protégée ou chasse la pièce qui cloue.", 'ta pièce est clouée et va tomber'],
      'clouage:missed': [`Clouage manqué avec ${mine}`, `${cap(fois)}, tu pouvais clouer une pièce adverse devant son roi ou sa dame avec ${mine}.`,
        "Repère les pièces adverses alignées avec leur roi ou leur dame. Un fou, une tour ou ta dame posés sur cette ligne les paralysent, et la pièce clouée finit souvent par tomber.", ''],
      'prise:allowed': [`${cap(mine)} sans défense`, `${cap(fois)}, tu as laissé ${mine} avec plus d'attaquants que de défenseurs, et l'adversaire a gagné du matériel.`,
        "Avant de jouer, fais le contrôle de sécurité : pour chaque pièce, compte ses attaquants et ses défenseurs. Si elle est plus attaquée que défendue, protège-la ou déplace-la. Vérifie aussi ce que ta pièce défendait avant de la bouger.", 'il gagne du matériel'],
      'prise:missed': [`Prise gratuite manquée`, `${cap(fois)}, ${P.theirs} était à prendre gratuitement et tu ne l'as pas pris.`,
        "À chaque coup, commence par regarder toutes tes prises possibles. Une pièce adverse sans défense, ou plus précieuse que celle qui la prend, c'est du matériel gratuit.", ''],
      'mat:missed': [`Mat manqué avec ${mine}`, `${cap(fois)}, un mat était possible avec ${mine}, et la partie a continué.`,
        "Avant chaque coup, passe en revue tous tes échecs, même ceux qui sacrifient une pièce. Un échec qui ne laisse aucune case de fuite au roi, c'est souvent le mat.", ''],
      'defense:allowed': ['Menace de mat non parée', `${cap(fois)}, l'adversaire menaçait de mater et ta réponse ne l'en a pas empêché.`,
        "Après chaque coup adverse, demande-toi : « Qu'est-ce qu'il menace ? » Contre un mat, il y a trois parades : fuir avec le roi, interposer une pièce, ou prendre l'attaquant. Donne aussi une case de fuite à ton roi avant le danger.", 'le mat devient imparable'],
      'tactique:allowed': [`Combinaison subie contre ${mine}`, `${cap(fois)}, une suite de coups forcés de l'adversaire a gagné ${mine}.`,
        "Avant de jouer, regarde les coups forcés de l'adversaire : échecs, prises et menaces. Si l'un d'eux gagne du matériel, change de plan.", 'il gagne du matériel par une suite forcée'],
      'tactique:missed': [`Combinaison manquée avec ${mine}`, `${cap(fois)}, une combinaison avec ${mine} gagnait du matériel.`,
        "Cherche d'abord les coups forcés : échecs, prises, menaces. Calcule la réponse adverse la plus forte avant de te lancer.", ''],
      'finale:allowed': [`Faute de finale avec ${mine}`, `${cap(fois)}, une faute en finale a coûté ${mine} ou le résultat.`,
        "En finale, ton roi devient une pièce d'attaque : centralise-le. Pousse tes pions passés, place tes tours derrière eux, et utilise la règle du carré pour savoir si un pion peut être rattrapé.", 'la finale bascule'],
      'finale:missed': [`Gain de finale manqué avec ${mine}`, `${cap(fois)}, un coup gagnant en finale avec ${mine} t'a échappé.`,
        "En finale, ton roi devient une pièce d'attaque : centralise-le. Pousse tes pions passés, place tes tours derrière eux, et utilise la règle du carré pour savoir si un pion peut être rattrapé.", ''],
    };
    return T[`${theme}:${kind}`] || T[`${theme}:missed`] || T['tactique:missed'];
  }
  function tipTextEn(theme, kind, P, mine, fois) {
    const kingTip = 'In the endgame your king becomes an attacking piece: centralise it. Push your passed pawns, put your rooks behind them, and use the rule of the square to know whether a pawn can be caught.';
    const T = {
      'fourchette:allowed': [`Fork on ${mine}`, `${cap(fois)}, your opponent attacked two of your pieces in one move, and ${mine} was lost. A fork works when two of your pieces stand on squares that one enemy piece can hit.`,
        "Before each move, look at where the enemy knights, pawns and queen can go next. If one of those squares hits two of your pieces, or your king and a piece, move one of them or cover the square.", 'their piece attacks two of yours at once'],
      'fourchette:missed': [`Missed fork with ${mine}`, `${cap(fois)}, ${mine} could attack two enemy pieces at once, and you missed it.`,
        'Look for undefended enemy pieces and the king, then ask whether one of your pieces can hit two of them in a single move. Knights and the queen are the fork champions.', ''],
      'clouage:allowed': [`${cap(mine)} gets pinned`, `${cap(fois)}, your opponent pinned ${mine}: it could no longer move without exposing a more valuable piece behind it.`,
        "Don't line up your king or queen behind another piece on an open file or diagonal facing an enemy bishop, rook or queen. Castle early. If the pin comes, block with a protected piece or chase the pinning piece.", 'your piece is pinned and will fall'],
      'clouage:missed': [`Missed pin with ${mine}`, `${cap(fois)}, you could have pinned an enemy piece in front of its king or queen with ${mine}.`,
        'Spot enemy pieces lined up with their king or queen. A bishop, a rook or your queen placed on that line paralyses them, and the pinned piece often ends up falling.', ''],
      'prise:allowed': [`${cap(mine)} left undefended`, `${cap(fois)}, you left ${mine} with more attackers than defenders, and your opponent won material.`,
        'Before moving, do a safety check: for each piece, count its attackers and defenders. If it is attacked more than defended, protect it or move it. Also check what your piece was defending before you move it.', 'they win material'],
      'prise:missed': ['Missed free capture', `${cap(fois)}, ${P.theirs} could be taken for free and you didn't take it.`,
        'On every move, start by looking at all your possible captures. An undefended enemy piece, or one worth more than the piece taking it, is free material.', ''],
      'mat:missed': [`Missed mate with ${mine}`, `${cap(fois)}, a mate was possible with ${mine}, and the game went on.`,
        'Before each move, go through all your checks, even those that sacrifice a piece. A check that leaves the king no escape square is often mate.', ''],
      'defense:allowed': ['Mate threat not stopped', `${cap(fois)}, your opponent threatened mate and your reply didn't stop it.`,
        'After each enemy move, ask yourself: “What does it threaten?” Against a mate there are three defenses: run with the king, block with a piece, or capture the attacker. Also give your king an escape square before danger comes.', 'the mate can no longer be stopped'],
      'tactique:allowed': [`Combination against ${mine}`, `${cap(fois)}, a series of forcing enemy moves won ${mine}.`,
        "Before moving, look at your opponent's forcing moves: checks, captures and threats. If one of them wins material, change your plan.", 'they win material with a forcing sequence'],
      'tactique:missed': [`Missed combination with ${mine}`, `${cap(fois)}, a combination with ${mine} would have won material.`,
        'Look for forcing moves first: checks, captures, threats. Work out the strongest reply before you commit.', ''],
      'finale:allowed': [`Endgame mistake with ${mine}`, `${cap(fois)}, an endgame mistake cost you ${mine} or the result.`, kingTip, 'the endgame turns'],
      'finale:missed': [`Missed endgame win with ${mine}`, `${cap(fois)}, you missed a winning endgame move with ${mine}.`, kingTip, ''],
    };
    return T[`${theme}:${kind}`] || T[`${theme}:missed`] || T['tactique:missed'];
  }
  // Coup joué en notation UCI (les anciennes fautes n'ont que la notation française)
  function uciOf(m) {
    if (m.uci) return m.uci;
    try {
      const g0 = new Game(m.fen);
      for (const mv of window.Chess.legalMoves(g0.state)) {
        const u = window.Chess.toUci(mv), g1 = new Game(m.fen);
        const r = g1.playUci(u);
        if (r && r.san === m.played) return u;
      }
    } catch { /* position illisible */ }
    return null;
  }
  // Les anciennes fautes reçoivent leur détail (manquée ou laissée, pièce, riposte) en arrière-plan
  function explainPending() {
    const ms = store.get('mistakes', []);
    const todo = ms.filter((m) => !m.kind && !m.noExplain).slice(-20);
    if (!todo.length || analysing) return;
    for (const m of todo) { m.uci = uciOf(m); if (!m.uci) m.noExplain = true; }
    const send = todo.filter((m) => m.uci);
    store.set('mistakes', ms);
    if (!send.length) return;
    try { aWorker = aWorker || new Worker(`analyse-worker.js?lang=${LANG}`); } catch { return; }
    analysing = true;
    aWorker.onmessage = (e) => {
      analysing = false;
      const all = store.get('mistakes', []);
      for (const x of e.data.explained || []) {
        const m = all.find((y) => y.id === x.id);
        if (m) { if (x.kind) Object.assign(m, { kind: x.kind, piece: x.piece, punish: x.punish, phase: x.phase, key: x.key }); else m.noExplain = true; }
      }
      store.set('mistakes', all);
      if ($('problems').classList.contains('active')) renderProblems();
      analyseNext();
    };
    aWorker.postMessage({ id: 'explain', explain: send.map((m) => ({ id: m.id, fen: m.fen, played: m.uci, best: m.line[0], theme: m.theme })) });
  }
  // Un motif devient une astuce dès qu'il revient dans au moins deux parties différentes
  function tipMotifs() {
    const ms = store.get('mistakes', []).filter((m) => m.kind);
    const groups = new Map();
    const add = (key, m) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); };
    for (const m of ms) {
      add(`${m.theme}:${m.kind}:${m.piece || 'p'}`, m);
      if (m.key) add('pos:' + m.key, m);
    }
    const tips = [], priorityThemes = new Set(recurringThemes(loadCoach()));
    for (const [key, list] of groups) {
      const games = new Set(list.map((m) => m.date)).size;
      if (games < 2) continue;
      const last = list[list.length - 1];
      if (!priorityThemes.has(last.theme)) continue;
      if (key.startsWith('pos:')) {
        const t = tipText(last.theme, last.kind, last.piece, games);
        tips.push({ key, list, games, pos: true, theme: last.theme, title: L(`Position qui revient (coup ${last.move})`, `Recurring position (move ${last.move})`),
          explain: L(`Cette position est revenue dans ${games} de tes parties, et tu y as joué ${[...new Set(list.map((m) => m.played))].join(' ou ')}. Ce n'était pas le meilleur coup.`, `This position came up in ${games} of your games, and you played ${[...new Set(list.map((m) => m.played))].join(' or ')}. It wasn't the best move.`), solution: t[2], cons: t[3] });
      } else {
        const [theme, kind, piece] = key.split(':');
        const [title, explain, solution, cons] = tipText(theme, kind, piece, games);
        tips.push({ key, list, games, theme, kind, piece, title, explain, solution, cons });
      }
    }
    // une position récurrente n'apparaît que si un motif plus large ne la couvre pas déjà
    const covered = new Set(tips.filter((t) => !t.pos).flatMap((t) => t.list.map((m) => m.id)));
    return tips.filter((t) => !t.pos || t.list.some((m) => !covered.has(m.id))).sort((a, b) => b.games - a.games || b.list.length - a.list.length).slice(0, 3);
  }
  function tipCard(t) {
    const done = store.get('tipsDone', {})[t.key];
    const chip = !done ? `<span class="chip hot">${L('Nouveau', 'New')}</span>` : done < t.list.length ? `<span class="chip warm">${L('Revient encore', 'Still recurring')}</span>` : `<span class="chip ok">${L('Vue', 'Seen')}</span>`;
    return `<button class="pz-card tip" data-tip="${t.key}"><span class="ico">💡</span><span class="t">${t.title}</span>${chip}
      <span class="d">${L(`${t.games} parties concernées`, `${t.games} games involved`)} · ${PZ[t.theme] ? PZ[t.theme].name : ''}</span></button>`;
  }
  // Leçon d'astuce : l'entraîneur explique l'erreur, la montre dans tes parties, puis te fait trouver la solution
  function startTip(key) {
    const t = tipMotifs().find((x) => x.key === key);
    if (!t) return;
    const steps = [{ text: L(`${t.explain} Je vais te montrer où ça s'est passé, puis on corrige ensemble.`, `${t.explain} I'll show you where it happened, then we'll fix it together.`) }];
    const seen = new Set();
    const shown = t.list.slice().reverse().filter((m) => !seen.has(m.fen) && seen.add(m.fen)).slice(0, 3);
    for (const m of shown) {
      let reply = '', marks = [];
      const uci = uciOf(m);
      try {
        const g0 = new Game(m.fen);
        if (uci) { const r = g0.playUci(uci); if (r) marks.push(uci.slice(0, 2), uci.slice(2, 4)); }
        if (m.punish && m.kind === 'allowed') {
          const r2 = g0.playUci(m.punish);
          if (r2) { reply = L(` L'adversaire a répondu ${r2.san} : ${t.cons}.`, ` Your opponent replied ${r2.san}: ${t.cons}.`); marks.push(m.punish.slice(0, 2), m.punish.slice(2, 4)); }
        }
      } catch { /* sans détail */ }
      const demoMoves = uci ? [uci, ...(m.kind === 'allowed' && m.punish ? [m.punish] : [])] : [];
      const badMove = uci;
      const arrows = [badMove, ...(m.kind === 'allowed' && m.punish ? [m.punish] : [])].filter(Boolean)
        .map((move) => ({ from: window.Chess.sqIndex(move.slice(0, 2)), to: window.Chess.sqIndex(move.slice(2, 4)), color: 'red' }));
      steps.push({ text: L(`Ta partie du ${fmtDate(m.date)}, coup ${m.move}. Tu as joué ${m.played}.${reply || ' Il y avait beaucoup mieux.'}`, `Your game of ${fmtDate(m.date)}, move ${m.move}. You played ${m.played}.${reply || ' There was much better.'}`), fen: m.fen, marks: [...new Set(marks)], demoMoves, arrows });
      steps.push({ text: L('À toi : dans cette même position, trouve le bon coup.', 'Your turn: in this same position, find the right move.'), fen: m.fen, line: m.line, alts: m.alts, mistake: m.id,
        arrows, why: L(`Voilà la solution. ${t.solution}`, `That's the solution. ${t.solution}`), wrong: L(`Pas encore. ${t.solution}`, `Not yet. ${t.solution}`), hintText: L('Regarde la pièce en surbrillance : c\'est elle qui doit jouer.', 'Look at the highlighted piece: it is the one that must move.') });
    }
    steps.push({ text: L(`Retiens bien : ${t.solution.charAt(0).toLowerCase() + t.solution.slice(1)} Je surveille tes prochaines parties pour voir si ce motif disparaît.`, `Remember: ${t.solution.charAt(0).toLowerCase() + t.solution.slice(1)} I'll watch your next games to see if this pattern disappears.`) });
    pz = { kind: 'lesson', lesson: { theme: t.theme, title: t.title, tip: t.key, count: t.list.length }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  const levelState = (row) => row.pending ? L('· validé, à confirmer en partie', '· validated, to confirm in a game') : `· ${row.ok}/${LEVEL_SET}`;
  function renderProblems() {
    const c = loadCoach();
    const prefs = problemPreferences();
    const pending = store.get('archive', []).filter((x) => !x.analysed).length;
    const mistakes = store.get('mistakes', []);
    const order = pathOrder(c);
    const acquired = ranked(c).filter((k) => !isWeak(c.themes[k]));
    const next = peekActivity();
    let html = '';
    if (problemsSection === 'program') {
      html += '<div class="pz-summary">';
      if (!c.games) html += L("Joue une partie contre l'ordinateur : je l'analyse et je construis ton programme, du point faible le plus fréquent au plus rare. En attendant, on commence par les bases.", 'Play a game against the computer: I analyse it and build your plan, from your most frequent weakness to the rarest. Meanwhile, we start with the basics.');
      else html += L(`<b>${c.games}</b> partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} · <b>${mistakes.length}</b> faute${mistakes.length > 1 ? 's' : ''} relevée${mistakes.length > 1 ? 's' : ''}`, `<b>${c.games}</b> game${c.games === 1 ? '' : 's'} analysed · <b>${mistakes.length}</b> mistake${mistakes.length === 1 ? '' : 's'} found`);
      if (pending) html += L(`<br>Analyse en cours : ${pending} partie${pending > 1 ? 's' : ''} en attente…`, `<br>Analysis running: ${pending} game${pending === 1 ? '' : 's'} waiting…`);
      html += '</div>';
    }
    const sections = [
      ['program', L('Mon programme de progression', 'My progress plan')],
      ['path', L('Parcours de problèmes', 'Puzzle path')],
      ['themes', L('Problèmes par thème', 'Puzzles by theme')],
    ];
    html += `<nav class="problems-tabs" role="tablist" aria-label="${L('Rubriques des problèmes', 'Puzzle sections')}">${sections.map(([key, label]) => `<button class="problems-tab${problemsSection === key ? ' active' : ''}" type="button" role="tab" id="problems-tab-${key}" aria-selected="${problemsSection === key}" aria-controls="problems-section-content" data-problems-section="${key}">${label}</button>`).join('')}</nav><div class="problems-section-content" id="problems-section-content" role="tabpanel" aria-labelledby="problems-tab-${problemsSection}">`;
    const training = themeTrainingPrefs();
    if (problemsSection === 'path') {
      const storedTraining = store.get('themeTraining', {});
      const cleanSolved = Number(training.solvedTotal) || 0;
      const attempts = Math.max(Number(training.attemptedTotal) || 0, cleanSolved);
      const successRate = attempts ? `${Math.round((cleanSolved / attempts) * 100)}%` : '—';
      const rating = Math.min(MAX_LEVEL, Math.max(1, Number(training.bestRating) || 1, Number(training.rating) || 1));
      const stages = [
        { emoji: '🌱', name: L('Le jardin des découvertes', 'Garden of discoveries'), levels: L('Niveaux 1–2', 'Levels 1–2'), description: L('Les premiers motifs et les coups malins.', 'First patterns and clever moves.'), from: 1, to: 3 },
        { emoji: '🧭', name: L('La forêt des tactiques', 'Forest of tactics'), levels: L('Niveaux 3–4', 'Levels 3–4'), description: L('Des défis variés choisis selon ton niveau.', 'Mixed challenges selected for your level.'), from: 3, to: 5 },
        { emoji: '🏔️', name: L('La montagne des combinaisons', 'Mountain of combinations'), levels: L('Niveaux 5–6', 'Levels 5–6'), description: L('Des séquences plus longues à découvrir.', 'Longer combinations to discover.'), from: 5, to: 7 },
        { emoji: '👑', name: L('Le sommet des champions', 'Champions’ summit'), levels: L('Niveaux 7–9', 'Levels 7–9'), description: L('Les défis les plus exigeants du parcours.', 'The most demanding challenges in the path.'), from: 7, to: 9 },
      ];
      const stageIndex = rating < 3 ? 0 : rating < 5 ? 1 : rating < 7 ? 2 : 3;
      const currentStage = stages[stageIndex];
      const stageProgress = Math.max(0, Math.min(100, ((rating - currentStage.from) / (currentStage.to - currentStage.from)) * 100));
      const streak = Math.max(0, Number(training.currentStreak) || 0);
      const streakProgress = streak % 3;
      const winsToReward = streakProgress ? 3 - streakProgress : 3;
      const stageHtml = stages.map((stage, index) => {
        const done = index < stageIndex, current = index === stageIndex;
        const state = done ? L('Palier franchi ✓', 'Milestone cleared ✓') : current ? L('Étape actuelle ⭐', 'Current stage ⭐') : L('À découvrir 🔒', 'To discover 🔒');
        return `<li class="path-stage${done ? ' complete' : ''}${current ? ' current' : ''}"><span class="path-stage-marker">${done ? '✓' : current ? stage.emoji : '🔒'}</span><div class="path-stage-content"><span class="path-stage-name">${stage.name}</span><span class="path-stage-levels">${stage.levels}</span><p>${stage.description}</p></div><span class="path-stage-state">${state}</span>${current ? `<div class="path-stage-progress"><div class="path-stage-progress-label"><span>${L('Progression vers le prochain palier', 'Progress to the next milestone')}</span><b>${Math.round(stageProgress)}%</b></div><div class="path-stage-track" role="progressbar" aria-label="${L('Progression vers le prochain palier', 'Progress to the next milestone')}" aria-valuenow="${Math.round(stageProgress)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${stageProgress}%"></i></div><div class="path-streak-count">${L(`Série sans erreur : ${streakProgress}/3 · encore ${winsToReward} réussite${winsToReward > 1 ? 's' : ''} pour le bonus`, `Clean streak: ${streakProgress}/3 · ${winsToReward} more solve${winsToReward === 1 ? '' : 's'} for a bonus`)}</div></div>` : ''}</li>`;
      }).join('');
      html += `<section class="theme-training-card path-dashboard">
        <div class="path-adventure-heading"><div><h3>${L('La grande aventure des problèmes', 'The great puzzle adventure')}</h3><p class="pz-cap">${L('Tous les thèmes sont mélangés. À toi de franchir les étapes !', 'All themes are mixed. The stages are yours to conquer!')}</p></div><span class="path-level-badge">${L(`Niveau ${Math.floor(rating)} / ${MAX_LEVEL}`, `Level ${Math.floor(rating)} / ${MAX_LEVEL}`)} ⭐</span></div>
        <div class="path-progress-stats">
          <div><strong>${attempts} 🧩</strong><span>${L('défis terminés', 'challenges completed')}</span></div>
          <div><strong>${successRate}</strong><span>${L('réussis sans erreur', 'solved without mistakes')}</span></div>
          <div><strong>${training.bestStreak || 0} 🔥</strong><span>${L('record de série', 'streak record')}</span></div>
        </div>
        <div class="path-cheer"><span aria-hidden="true">🌴</span><p><strong>${streakProgress ? L(`Bravo, ${streakProgress} défi${streakProgress > 1 ? 's' : ''} sans erreur !`, `Great job, ${streakProgress} challenge${streakProgress === 1 ? '' : 's'} without mistakes!`) : L('La prochaine récompense t’attend !', 'Your next reward is waiting!')}</strong><span>${L(`Encore ${winsToReward} réussite${winsToReward > 1 ? 's' : ''} sans erreur pour gagner 15 grains de riz et 20 points d’expérience.`, `${winsToReward} more clean solve${winsToReward === 1 ? '' : 's'} to earn 15 rice grains and 20 experience points.`)}</span></p></div>
        <button class="btn primary wide path-continue" type="button" id="theme-training-start">${attempts ? L('Continuer le parcours', 'Continue the path') : L('Commencer le parcours', 'Start the path')}</button>
        <div class="path-stage-heading"><h4>${L('Ton chemin d’aventurier', 'Your adventure path')}</h4><span>${L(`Étape ${stageIndex + 1} sur ${stages.length}`, `Stage ${stageIndex + 1} of ${stages.length}`)}</span></div>
        <p class="path-stage-intro">${L('Chaque étape mélange les thèmes et te prépare à des défis plus difficiles.', 'Every stage mixes themes and prepares you for harder challenges.')}</p>
        <ol class="path-stages" aria-label="${L('Étapes du parcours', 'Path stages')}">${stageHtml}</ol>
        ${attempts ? `<p class="theme-training-progress">${L(`${cleanSolved} réussis sans erreur sur ${attempts} défis terminés.`, `${cleanSolved} solved without mistakes out of ${attempts} completed challenges.`)}</p>` : `<p class="theme-training-progress">${storedTraining.solvedTotal ? L(`${cleanSolved} problèmes réussis. Le suivi du pourcentage commence à ta prochaine séance.`, `${cleanSolved} puzzles solved. Percentage tracking starts with your next session.`) : L('Tes progrès commenceront après ton premier défi.', 'Your progress will start after your first challenge.')}</p>`}
      </section>`;
    }
    if (problemsSection === 'themes') html += `<div class="problem-theme-catalog"><p class="pz-cap">${L('Choisis un thème pour t’entraîner. La couleur indique ta maîtrise estimée à partir des problèmes résolus et de tes parties analysées.', 'Choose a theme to practise. The color shows estimated mastery from solved puzzles and analysed games.')}</p>${trainingTopicGroups.map((group) => `<section class="theme-training-group"><h3>${group.name}</h3><div class="problem-theme-grid">${group.topics.map((topic) => {
      const mastery = topicMastery(topic);
      const masteryLabel = mastery.known ? `${L('Maîtrise', 'Mastery')} ${mastery.value}%` : mastery.text;
      return `<button class="problem-theme-card mastery-${mastery.className}" type="button" data-training-topic="${topic.key}" title="${mastery.known ? `${mastery.solved}/${mastery.attempted} · ${mastery.analysisGames} ${L('analyses', 'analyses')}` : mastery.text}"><span class="problem-theme-icon">${topic.icon}</span><span class="problem-theme-name">${topic.name}</span><span class="problem-theme-count">${topic.puzzles.length} ${L('problèmes', 'puzzles')}</span><span class="theme-mastery">${masteryLabel}</span><span class="problem-theme-action">${L('S’entraîner', 'Practise')} ›</span></button>`;
    }).join('')}</div></section>`).join('')}</div>`;
    if (problemsSection === 'program' && problemSettingsOpen) html += `<section class="pz-settings" aria-label="${L('Réglages des problèmes', 'Puzzle settings')}">
      <h3>${L('Réglages des problèmes', 'Puzzle settings')}</h3>
      <label class="field-label" for="pz-pref-games">${L('Nombre de parties récentes (1 à 20)', 'Recent games to analyse (1–20)')}</label>
      <input class="profile-name-input" id="pz-pref-games" type="number" min="1" max="20" step="1" value="${prefs.games}">
      <label class="field-label" for="pz-pref-threshold">${L('Seuil de récurrence (%)', 'Recurrence threshold (%)')}</label>
      <input class="profile-name-input" id="pz-pref-threshold" type="number" min="1" max="99" step="1" value="${prefs.threshold}">
      <small>${L('Un thème est proposé s’il revient dans plus que ce pourcentage des parties choisies. Trois priorités au maximum seront affichées.', 'A theme is suggested when it appears in more than this percentage of the selected games. At most three priorities will be shown.')}</small>
      <p id="pz-pref-error" class="pz-pref-error" role="alert"></p>
      <div class="pz-pref-actions"><button class="btn primary" id="pz-pref-save" type="button">${L('Enregistrer', 'Save')}</button><button class="btn ghost" id="pz-pref-cancel" type="button">${L('Annuler', 'Cancel')}</button></div>
    </section>`;
    // Les analyses de prises restent enregistrées pour évaluer les sacrifices et
    // les compensations, mais ce détail technique n'est pas affiché dans le programme.
    if (problemsSection === 'program') {
    const nextLabel = next.type === 'none' ? L(`Aucune erreur ne dépasse ${prefs.threshold} % sur les ${prefs.games} dernières parties.`, `No mistake exceeds ${prefs.threshold}% in the last ${prefs.games} games.`) : next.type === 'wait' ? L('Joue une partie pour confirmer tes niveaux', 'Play a game to confirm your levels') : next.type === 'lesson' ? L(`Leçon : ${lessonOf(next.theme).title}`, `Lesson: ${lessonOf(next.theme).title}`) : L(`Problèmes : ${PZ[next.theme].name} · niveau ${themeRow(c, next.theme).level} (${themeRow(c, next.theme).ok}/${LEVEL_SET})`, `Puzzles: ${PZ[next.theme].name} · level ${themeRow(c, next.theme).level} (${themeRow(c, next.theme).ok}/${LEVEL_SET})`);
    html += `<button class="btn primary wide" id="pz-go">${L('Continuer mon entraînement', 'Continue my training')}</button><p class="pz-next">${L('Prochaine étape', 'Next step')} · ${nextLabel}</p>`;
    const tips = tipMotifs();
    if (tips.length) html += `<h3 class="pz-section">${L('Astuces solutions', 'Solution tips')}</h3><p class="pz-cap">${L(`Les erreurs qui reviennent dans tes parties, expliquées par ${COACH}.`, `The mistakes that keep coming back in your games, explained by ${COACH}.`)}</p>` + tips.map(tipCard).join('');
    html += `<h3 class="pz-section">${c.games ? L('Ton programme, par priorité', 'Your plan, by priority') : L('Programme de départ', 'Starter plan')}</h3>`;
    html += order.length
      ? order.map((k, i) => card(k, themeRow(c, k), i + 1, k === next.theme)).join('')
      : `<p class="pz-cap">${L(`Aucun thème ne dépasse le seuil de récurrence. Tes priorités apparaîtront quand une même difficulté reviendra dans plus de ${prefs.threshold} % de tes ${prefs.games} dernières parties analysées.`, `No theme is above the recurrence threshold. Your priorities will appear when the same weakness occurs in more than ${prefs.threshold}% of your last ${prefs.games} analysed games.`)}</p>`;
    if (!c.games && acquired.length) html += `<h3 class="pz-section">${L('Thèmes acquis', 'Mastered themes')}</h3>` + acquired.slice(0, 3).map((k) => card(k, c.themes[k], 0)).join('');
    }
    html += '</div>';
    const body = $('problems-body');
    body.innerHTML = html;
    body.querySelectorAll('[data-problems-section]').forEach((button) => { button.onclick = () => { problemsSection = button.dataset.problemsSection; renderProblems(); }; });
    const startThemes = body.querySelector('#theme-training-start');
    if (startThemes) startThemes.onclick = () => startThemeTraining();
    body.querySelectorAll('[data-training-topic]').forEach((button) => { button.onclick = () => startThemeTraining([button.dataset.trainingTopic], 'topic'); });
    body.querySelectorAll('[data-theme]').forEach((b) => (b.onclick = () => openTheme(b.dataset.theme)));
    body.querySelectorAll('[data-tip]').forEach((b) => (b.onclick = () => startTip(b.dataset.tip)));
    const go = body.querySelector('#pz-go');
    if (go) go.onclick = nextActivity;
    $('btn-problem-settings').hidden = problemsSection !== 'program';
    $('btn-problem-settings').onclick = () => {
      problemSettingsOpen = !problemSettingsOpen;
      renderProblems();
      // sur mobile, la liste peut être longue : on amène le panneau à l'écran, sinon il s'ouvre hors de vue en haut de page
      const panel = problemSettingsOpen && $('problems-body').querySelector('.pz-settings');
      if (panel) {
        // marge pour l'en-tête quand il reste collé en haut de l'écran
        const header = document.querySelector('#problems .bar'), sticky = header && getComputedStyle(header).position !== 'static';
        const offset = (sticky ? header.getBoundingClientRect().height : 0) + 12;
        window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - offset), behavior: 'smooth' });
        setTimeout(() => { const i = panel.querySelector('input'); if (i) i.focus({ preventScroll: true }); }, 350);
      }
    };
    const savePrefs = body.querySelector('#pz-pref-save');
    if (savePrefs) savePrefs.onclick = () => {
      const games = Number(body.querySelector('#pz-pref-games').value);
      const threshold = Number(body.querySelector('#pz-pref-threshold').value);
      if (!Number.isInteger(games) || games < 1 || games > 20 || !Number.isInteger(threshold) || threshold < 1 || threshold > 99) {
        body.querySelector('#pz-pref-error').textContent = L('Choisis de 1 à 20 parties et un seuil de 1 à 99 %.', 'Choose 1–20 games and a threshold from 1–99%.');
        return;
      }
      store.set('problemPrefs', { games, threshold });
      problemSettingsOpen = false;
      renderProblems();
    };
    const cancelPrefs = body.querySelector('#pz-pref-cancel');
    if (cancelPrefs) cancelPrefs.onclick = () => { problemSettingsOpen = false; renderProblems(); };
    analyseNext();
  }

  /* Rubrique d'un thème (progrès) */
  let themeOpen = null;
  function spark(h) {
    if (h.length < 2) return '';
    const max = Math.max(1, ...h);
    const pts = h.map((v, i) => `${((i / (h.length - 1)) * 290 + 5).toFixed(1)},${(64 - (v / max) * 56).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 300 70" preserveAspectRatio="none" role="img" aria-label="${L('Évolution', 'Trend')}"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
      <p class="pz-cap">${L('Fréquence de cette faute au fil de tes parties (plus bas = mieux)', 'How often this mistake appears across your games (lower is better)')}</p>`;
  }
  function openTheme(k) { themeOpen = k; renderTheme(); show('theme'); }
  function renderTheme() {
    const k = themeOpen, c = loadCoach(), row = themeRow(c, k), info = PZ[k];
    const mine = store.get('mistakes', []).filter((m) => m.theme === k).reverse();
    const prefs = problemPreferences();
    const recent = row.recent.slice(-prefs.games).reduce((a, b) => a + b, 0);
    $('theme-title').textContent = info.name;
    let html = `<p style="color:var(--muted)">${row.errors ? info.short : L('Pas encore de faute de ce type dans tes parties.', 'No mistake of this kind in your games yet.')} ${row.errors ? `<span class="chip ${themeStatus(row)[0]}">${themeStatus(row)[1]}</span> ${trendOf(row)}` : ''}</p>`;
    html += `<div class="pz-stats"><div><b>${recent}</b><span>${L(`fautes (${prefs.games} dernières parties max.)`, `mistakes (last ${prefs.games} games max.)`)}</span></div><div><b>${row.level}</b><span>${L('niveau', 'level')} / ${MAX_LEVEL}<br>${row.pending ? L('à confirmer en partie', 'to confirm in a game') : L(`${row.ok}/${LEVEL_SET} réussis`, `${row.ok}/${LEVEL_SET} solved`)}</span></div><div><b>${row.solved}</b><span>${L('problèmes réussis', 'puzzles solved')}</span></div></div>`;
    html += spark(row.hist);
    html += `<p class="pz-tip">${info.tip}</p>`;
    if (mine.length) {
      html += `<h3 class="pz-section">${L('Tes erreurs relevées', 'Your mistakes')}</h3>` + mine.slice(0, 12).map((m) =>
        `<div class="pz-err ${m.solved ? 'done' : ''}"><span>${L(`Partie du ${fmtDate(m.date)}, coup ${m.move}`, `Game of ${fmtDate(m.date)}, move ${m.move}`)}<small>${L(`Tu as joué ${m.played}`, `You played ${m.played}`)}${m.solved ? L(' · acquise après révisions ✓', ' · mastered after reviews ✓') : m.reviewAt > Date.now() ? L(` · prochaine révision ${fmtDate(m.reviewAt)}`, ` · next review ${fmtDate(m.reviewAt)}`) : L(' · à revoir maintenant', ' · review now')}</small></span></div>`).join('');
    }
    $('theme-body').innerHTML = html;
  }

  const personalItem = (m) => ({ personal: m, fen: m.fen, line: m.line, alts: m.alts, theme: m.theme, level: m.level || 1 });

  /* L'entraîneur */
  const COACH = L('Maître Sissa', 'Master Sissa');
  // Pendant son cours ou sa partie, c'est le champion choisi qui parle et qui joue
  function activeChampion() {
    const id = pz ? pz.lesson && pz.lesson.champion : !replay && cfg && cfg.mode === 'coach' && cfg.champion;
    return id ? champById(id) || null : null;
  }
  const coachName = () => { const c = activeChampion(); return c ? c.name : COACH; };
  // Portrait affiché pour celui qui parle : photo du champion, sinon le personnage de Maître Sissa
  const hiroFace = 'sissa/sissa-face.jpg';
  function showCoachFace(img) {
    const c = activeChampion();
    const src = c && c.photo ? c.photo.src : hiroFace;
    img.classList.toggle('photo', true);
    // le lien vers la légende n'apparaît que pour Maître Sissa
    document.querySelectorAll('[data-legend]').forEach((b) => { b.hidden = !!c; });
    img.style.cursor = c ? '' : 'pointer';
    img.hidden = !src;
    if (src && img.getAttribute('src') !== src) img.src = src;
    img.alt = c ? c.name : '';
    img.title = c && c.photo ? L(`Photo : ${c.photo.author} (${c.photo.license}, Wikimedia Commons)`, `Photo: ${c.photo.author} (${c.photo.license}, Wikimedia Commons)`) : '';
  }
  // Voix de Maître Sissa : synthèse vocale du navigateur, dans la langue de l'interface
  const tts = window.speechSynthesis;
  let frVoice = null;
  function pickVoice() {
    const vs = tts ? tts.getVoices() : [];
    const own = new RegExp(`^${LANG}(-|_|$)`, 'i');
    const male = LANG === 'fr' ? /male|homme|thomas|paul|henri|nicolas/i : /male|david|daniel|alex|george|guy|james|mark/i;
    frVoice = vs.find((v) => own.test(v.lang) && male.test(v.name)) || vs.find((v) => own.test(v.lang)) || null;
  }
  if (tts) { pickVoice(); tts.onvoiceschanged = pickVoice; }
  // Fin de la parole suivie par nos propres événements (tts.speaking est peu fiable), avec un plafond de sécurité
  let speechUntil = 0, lastUtterance = null, activeSpeechResolve = null, activeSpeechCueCancel = null;
  const speechBusy = () => !!(tts && settings.voice && speechUntil > performance.now());
  function speak(text, cue = null) {
    if (!tts || !settings.voice) return Promise.resolve();
    if (shoutU) { pendingSpeech = { text, cue }; return Promise.resolve(); }
    if (activeSpeechCueCancel) {
      activeSpeechCueCancel(); activeSpeechCueCancel = null;
      if (replay && replay.demoRestore) { restoreReplayDemo(); renderBoard(); }
    }
    if (activeSpeechResolve) { const finish = activeSpeechResolve; activeSpeechResolve = null; finish(); }
    tts.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
    u.lang = LOCALE; if (frVoice) u.voice = frVoice;
    u.rate = 1.0; u.pitch = 0.9;
    const cues = (Array.isArray(cue) ? cue : cue ? [cue] : []).filter((item) => item.index >= 0);
    const cueTimers = new Map(), firedCues = new Set();
    const fireCue = (item) => {
      if (firedCues.has(item)) return;
      firedCues.add(item);
      if (cueTimers.has(item)) { clearTimeout(cueTimers.get(item)); cueTimers.delete(item); }
      if (firedCues.size === cues.length && activeSpeechCueCancel) activeSpeechCueCancel = null;
      item.run();
    };
    if (cues.length) {
      u.onboundary = (e) => cues.forEach((item) => { if (e.charIndex >= item.index) fireCue(item); });
      cues.forEach((item) => cueTimers.set(item, setTimeout(() => fireCue(item), item.index * 85)));
      activeSpeechCueCancel = () => { cueTimers.forEach(clearTimeout); cueTimers.clear(); };
    }
    let resolveSpeech;
    const finished = new Promise((resolve) => { resolveSpeech = resolve; activeSpeechResolve = resolve; });
    const done = () => {
      cueTimers.forEach(clearTimeout); cueTimers.clear();
      if (activeSpeechCueCancel) activeSpeechCueCancel = null;
      if (lastUtterance === u) { speechUntil = 0; if (game && !replay && !pz) renderActions(); }
      if (activeSpeechResolve === resolveSpeech) activeSpeechResolve = null;
      resolveSpeech();
    };
    lastUtterance = u;
    u.onend = done; u.onerror = done;
    speechUntil = performance.now() + Math.min(45000, 3000 + text.length * 90);
    tts.speak(u);
    return finished;
  }
  const hush = () => { speechUntil = 0; shoutU = null; pendingSpeech = null; if (activeSpeechCueCancel) { activeSpeechCueCancel(); activeSpeechCueCancel = null; } if (tts) tts.cancel(); if (activeSpeechResolve) { const finish = activeSpeechResolve; activeSpeechResolve = null; finish(); } if (replay && replay.demoRestore) { restoreReplayDemo(); renderBoard(); } };
  // Cri de technique : prononcé avant l'attaque ; la parole du coach attend la fin du cri
  let shoutU = null, pendingSpeech = null;
  function shout(name) {
    if (!tts || !settings.voice) return;
    if (activeSpeechResolve) { const finish = activeSpeechResolve; activeSpeechResolve = null; finish(); }
    tts.cancel();
    const u = new SpeechSynthesisUtterance(name);
    u.lang = LOCALE; if (frVoice) u.voice = frVoice;
    u.rate = 0.95; u.pitch = 0.7; u.volume = 1;
    const done = () => {
      if (shoutU !== u) return;
      shoutU = null; speechUntil = 0;
      if (pendingSpeech) { const t = pendingSpeech; pendingSpeech = null; speak(t.text, t.cue); }
    };
    shoutU = u; lastUtterance = u;
    u.onend = done; u.onerror = done;
    speechUntil = performance.now() + 4000;
    tts.speak(u);
  }
  function voiceButton() {
    const b = $('pz-voice');
    b.hidden = !tts;
    b.textContent = settings.voice ? '🔊' : '🔇';
    b.setAttribute('aria-label', settings.voice ? L('Couper la voix', 'Mute the voice') : L('Activer la voix', 'Turn the voice on'));
    const replayButton = $('rp-voice');
    replayButton.hidden = !tts;
    replayButton.textContent = settings.voice ? '🔊' : '🔇';
    replayButton.setAttribute('aria-label', settings.voice ? L('Couper la voix', 'Mute the voice') : L('Activer la voix', 'Turn the voice on'));
    const programButton = $('program-voice');
    programButton.hidden = !tts;
    programButton.textContent = settings.voice ? '🔊' : '🔇';
    programButton.setAttribute('aria-label', settings.voice ? L('Couper la voix', 'Mute the voice') : L('Activer la voix', 'Turn the voice on'));
  }
  $('pz-voice').onclick = () => {
    settings.voice = !settings.voice; store.set('settings', settings); voiceButton(); renderCoachDock();
    if (settings.voice) speak($('pz-prompt').textContent); else hush();
  };
  $('rp-voice').onclick = () => {
    settings.voice = !settings.voice; store.set('settings', settings); voiceButton(); renderCoachDock();
    if (settings.voice) speak($('rp-comment').innerText); else hush();
  };
  $('program-voice').onclick = () => {
    settings.voice = !settings.voice; store.set('settings', settings); voiceButton(); renderCoachDock();
    if (settings.voice) speak(`${$('program-text').textContent} ${$('program-focus').textContent}`); else hush();
  };
  voiceButton();
  function say(text, mood = '', voiceText = text, voiceCues = null) {
    text = coachGreeting(text);
    const p = $('pz-prompt');
    p.textContent = text;
    $('coach').querySelector('.coach-identity b').textContent = coachName();
    showCoachFace($('coach-img'));
    coachMessage = text; coachMood = mood; renderCoachDock();
    const speech = speak(voiceText, voiceCues);
    const box = $('coach');
    box.className = 'coach' + (mood ? ' ' + mood : '');
    void box.offsetWidth; box.classList.add('talk');
    return speech;
  }

  /* Résolution (problèmes et étapes de leçon) */
  let pz = null;
  let marks = null;
  function attachBoard(where) {
    const w = $('board-wrap');
    if (where === 'puzzle') { if (w.parentNode !== $('puzzle-slot')) $('puzzle-slot').appendChild(w); return; }
    const col = $('game').querySelector('.board-col');
    if (w.parentNode !== col) col.insertBefore(w, col.querySelector('.player.bottom'));
  }
  function enterPuzzleMode() {
    if (game && !pz) save();
    cancelAi();
    result = null;
    const guided = !!pz;
    $('puzzle').classList.toggle('guided-learning', guided);
    if (guided) $('learning-coach-slot').insertBefore($('coach'), $('learning-coach-slot').firstChild);
    else $('puzzle').querySelector('.board-col').insertBefore($('coach'), $('puzzle-slot'));
    attachBoard('puzzle');
    if (!$('puzzle').classList.contains('active')) { randomScenery(); show('puzzle'); }
  }
  function leavePuzzle() {
    hush();
    if (pz && pz.autoAdvanceTimer) clearTimeout(pz.autoAdvanceTimer);
    const back = pz && pz.lesson && pz.lesson.back ? pz.lesson.back : pz && pz.lesson && pz.lesson.champion ? 'champions' : 'problems';
    pz = null; marks = null; game = null;
    if (back === 'train') renderTrain();
    show(back);
  }
  function setPzStatus(cls, text) {
    const st = $('pz-status');
    st.className = 'status' + (cls ? ' ' + cls : '');
    st.textContent = text;
  }
  function puzzleTurnText() {
    const side = game.turn === 'w' ? L('les Blancs', 'White') : L('les Noirs', 'Black');
    return LANG === 'en' ? `Your move as ${side}` : `À toi de jouer avec ${side}`;
  }
  function promptOf(it) {
    if (pz && pz.kind === 'themed') {
      const session = pz.themeSession;
      const goal = session.mode === 'topic'
        ? L('Résous ce problème pour progresser dans ce thème.', 'Solve this puzzle to progress in this theme.')
        : L('Résous le problème pour avancer dans le parcours qui mélange tous les thèmes.', 'Solve the puzzle to keep progressing through the mixed-theme path.');
      return `${trainingTopicName(session.currentTopic || it.theme)} · ${L('difficulté', 'difficulty')} ${Math.round(session.rating)}/${MAX_LEVEL}. ${goal}`;
    }
    if (LANG === 'en') {
      const side = game.turn === 'w' ? 'White' : 'Black';
      if (it.personal) return `Remember your game of ${fmtDate(it.personal.date)}. On move ${it.personal.move}, you played ${it.personal.played}. There was better: find it.`;
      if (it.theme === 'mat') return `You play ${side}. There is a mate in ${Math.ceil(it.line.length / 2)}. Start by looking at every check.`;
      if (it.theme === 'defense') return `You play ${side}. Your opponent threatens mate. Find the defense.`;
      if (it.theme === 'finale') return `You play ${side}. It's an endgame: find the winning move.`;
      const goal = { fourchette: 'A double attack wins material. Find it.', clouage: 'A pin or a skewer wins material. Look for pieces lined up.', prise: 'An enemy piece is poorly protected. Win it.' }[it.theme] || 'A combination wins material. Start with the forcing moves.';
      return `You play ${side}. ${goal}`;
    }
    const side = game.turn === 'w' ? 'les Blancs' : 'les Noirs';
    if (it.personal) return `Souviens-toi de ta partie du ${fmtDate(it.personal.date)}. Au coup ${it.personal.move}, tu as joué ${it.personal.played}. Il y avait mieux : trouve-le.`;
    if (it.theme === 'mat') return `Tu joues ${side}. Il y a un mat en ${Math.ceil(it.line.length / 2)}. Commence par regarder tous les échecs.`;
    if (it.theme === 'defense') return `Tu joues ${side}. L'adversaire menace de mater. Trouve la parade.`;
    if (it.theme === 'finale') return `Tu joues ${side}. C'est une finale : trouve le coup gagnant.`;
    const goal = { fourchette: "Une attaque double gagne du matériel. Cherche-la.", clouage: 'Un clouage ou une enfilade gagne du matériel. Cherche les alignements.', prise: 'Une pièce adverse est mal protégée. Gagne-la.' }[it.theme] || 'Une combinaison gagne du matériel. Commence par les coups forcés.';
    return `Tu joues ${side}. ${goal}`;
  }
  function setPosition(fen) {
    game = new Game(fen);
    selected = -1; hint = null; animateNext = false;
    flipped = game.turn === 'b';
  }
  function loadItem(it) {
    Object.assign(pz, { item: it, step: 0, failed: false, done: false, locked: false, hintLevel: 0 });
    marks = null;
    setPosition(it.fen);
    const row = themeRow(loadCoach(), it.theme);
    $('puzzle-title').textContent = pz.kind === 'themed' ? (pz.themeSession.mode === 'topic' ? trainingTopicName(pz.themeSession.currentTopic) : L('Parcours de problèmes', 'Puzzle path')) : PZ[it.theme].name;
    $('pz-count').textContent = pz.kind === 'themed'
      ? `${L('Problème', 'Puzzle')} ${pz.themeSession.index} · ${trainingTopicName(pz.themeSession.currentTopic || it.theme)} · ${L('difficulté', 'difficulty')} ${Math.round(pz.themeSession.rating)}/${MAX_LEVEL}`
      : (it.personal ? L('Ta partie · ', 'Your game · ') : '') + `${L('Niveau', 'Level')} ${row.level} · ${row.pending ? L('révision', 'review') : `${Math.min(LEVEL_SET, row.ok + 1)}/${LEVEL_SET}`}`;
    say(promptOf(it));
    setPzStatus('', puzzleTurnText());
    renderBoard();
    pzButtons();
  }
  function pzButtons() {
    const task = pz.item && pz.item.line;
    $('pz-hint').disabled = !task || pz.done || pz.locked;
    $('pz-solution').disabled = !task || pz.done || pz.locked;
    $('pz-next').innerHTML = `<span>→</span>${pz.kind === 'lesson' ? lessonNextLabel() : pz.kind === 'themed' ? L('Prochain défi', 'Next challenge') : L('Suivant', 'Next')}`;
    $('pz-next').disabled = !pz.done;
  }
  // Libellé du bouton du bas pendant un cours, et la phrase de l'entraîneur qui invite à l'utiliser
  function lessonNextLabel() {
    const lastStep = pz.idx >= pz.steps.length - 1;
    return lastStep ? (pz.lesson && (pz.lesson.tip || pz.lesson.champion || pz.lesson.onDone || pz.lesson.resume) ? L('Terminer', 'Finish') : L('Aux problèmes', 'To the puzzles')) : L('Continuer', 'Continue');
  }
  const lessonCue = () => L(`Appuie sur « ${lessonNextLabel()} » en bas de l'écran ${pz.idx >= pz.steps.length - 1 ? 'pour terminer' : 'pour la suite'}.`, `Press “${lessonNextLabel()}” at the bottom of the screen ${pz.idx >= pz.steps.length - 1 ? 'to finish' : 'to go on'}.`);
  const busyDelay = (min) => Math.max(min, (b3d ? b3d.busyLeftMs() : 0) + 250);
  function pzAfterMove(res) {
    animateNext = true;
    const it = pz.item, uci = window.Chess.toUci(res.move);
    const expected = it.line[pz.step];
    const st = game.status();
    const mated = st.over && st.reason === 'mat';
    const good = uci === expected || mated || (pz.step === 0 && it.alts && it.alts.includes(uci));
    const lessonStep = pz.kind === 'lesson' ? pz.steps[pz.idx] : null;
    if (lessonStep && lessonStep.annotateRelations) lessonStep.arrows = openingArrowsForMove(uci, game.state, colorOf(res.move.piece), res);
    renderBoard();
    if (!good) {
      pz.failed = true; pz.locked = true; pz.misses = (pz.misses || 0) + 1;
      sounds.lose();
      setPzStatus('bad', L('Pas le bon coup, réessaie.', 'Not the right move, try again.'));
      say(lessonStep && lessonStep.wrong ? lessonStep.wrong : L(`Pas tout à fait. ${PZ[it.theme].tip}`, `Not quite. ${PZ[it.theme].tip}`), 'sad');
      pzButtons();
      setTimeout(() => { if (!pz) return; game.undo(); pz.locked = false; renderBoard(); pzButtons(); }, busyDelay(700));
      return;
    }
    res.move.captured ? sounds.capture() : sounds.move();
    // Échec et mat annoncés partout sauf pendant les cours
    if (pz.kind !== 'lesson') { if (mated) shout(L('Échec et mat !', 'Checkmate!')); else if (game.inCheck()) shout(L('Échec !', 'Check!')); }
    if (uci !== expected || mated) return pzSolved();
    pz.step++;
    pz.hintLevel = 0;
    if (pz.step >= it.line.length) return pzSolved();
    pz.locked = true;
    setPzStatus('good', L('Bien vu ! Continue…', 'Well spotted! Keep going…'));
    say(L('Bien vu ! Regarde la réponse de l\'adversaire, puis termine le travail.', "Well spotted! Watch your opponent's reply, then finish the job."), 'happy');
    pzButtons();
    setTimeout(() => {
      if (!pz || pz.item !== it) return;
      const replyUci = it.line[pz.step], replyColor = game.state.turn;
      const r = game.playUci(replyUci);
      pz.step++;
      pz.hintLevel = 0;
      if (r && lessonStep && lessonStep.annotateRelations) lessonStep.arrows = openingArrowsForMove(replyUci, game.state, replyColor, r);
      animateNext = true; pz.locked = false;
      if (r) (r.move.captured ? sounds.capture : sounds.move)();
      if (r && game.inCheck() && pz.kind !== 'lesson') shout(game.status().over ? L('Échec et mat !', 'Checkmate!') : L('Échec !', 'Check!'));
      renderBoard();
      if (pz.step >= it.line.length) pzSolved(); else pzButtons();
    }, busyDelay(600));
  }
  function pzSolved() {
    pz.done = true;
    const clean = !pz.failed;
    setTimeout(() => sounds.win(), 200);
    setPzStatus('good', clean ? L('Résolu du premier coup !', 'Solved on the first try!') : L('Résolu, avec un peu d\'aide.', 'Solved, with a little help.'));
    if (pz.kind === 'lesson') {
      const st = pz.steps[pz.idx];
      if (st.adaptive) {
        const r = recordPuzzle(pz.item, clean);
        const feedback = clean
          ? r.pending ? L('Très bien : ton niveau est prêt à être confirmé dans une partie.', 'Very good: your level is ready to be confirmed in a game.') : L(`Très bien : ${r.ok}/${LEVEL_SET} réussites vers le niveau suivant.`, `Very good: ${r.ok}/${LEVEL_SET} successes toward the next level.`)
          : L('Tu as trouvé avec de l’aide. Le prochain exercice sera ajusté à tes résultats.', 'You found it with help. The next exercise will adjust to your results.');
        say(`${st.why || L('Exactement ! Tu as trouvé.', 'Exactly! You found it.')} ${feedback} ${lessonCue()}`, 'happy');
      } else {
        if (!pz.lesson.noRating) countPuzzle();
        const tutorial = pz.lesson.resume && pz.lesson.resume.startsWith('tutorial:');
        const autoTutorial = tutorial && pz.idx === pz.steps.length - 1;
        const speech = say(`${st.why || L('Exactement ! Tu as trouvé.', 'Exactly! You found it.')} ${autoTutorial ? L('Notion terminée.', 'Topic complete.') : lessonCue()}`, 'happy');
        if (autoTutorial) scheduleTutorialAdvance(speech, pz, pz.idx, st.text.length);
      }
      if (st.mistake) touchMistake(st.mistake, clean);
      if (pz.lesson.resume && pz.lesson.resume.startsWith('tutorial:') && st.stars) renderBoard();
    } else if (pz.kind === 'themed') {
      const session = pz.themeSession, saved = themeTrainingPrefs();
      recordPuzzle(pz.item, clean);
      session.solved++;
      const pathMode = session.mode !== 'topic';
      if (pathMode) {
        saved.attemptedTotal = Math.max(Number(saved.attemptedTotal) || 0, Number(saved.solvedTotal) || 0) + 1;
        saved.topicStats = saved.topicStats || {};
        const topicStats = saved.topicStats[session.currentTopic] || { attempted: 0, solved: 0 };
        topicStats.attempted++;
        if (clean) topicStats.solved++;
        saved.topicStats[session.currentTopic] = topicStats;
        saved.route = Array.isArray(saved.route) ? saved.route : [];
        saved.route.push({ topic: session.currentTopic, clean });
        saved.route = saved.route.slice(-24);
      }
      if (clean) {
        session.cleanSolved++;
        session.streak++;
        session.rating = Math.min(MAX_LEVEL, session.rating + 0.4 + (session.streak % 3 === 0 ? 0.6 : 0));
        reward(3, 5, L(pathMode ? 'Défi du parcours réussi' : 'Problème du thème réussi', pathMode ? 'Puzzle path challenge solved' : 'Themed puzzle solved'));
        if (pathMode) {
          saved.solvedTotal = (saved.solvedTotal || 0) + 1;
          saved.bestStreak = Math.max(saved.bestStreak || 0, session.streak);
          saved.currentStreak = session.streak;
          saved.rating = session.rating;
          saved.bestRating = Math.max(Number(saved.bestRating) || 1, session.rating);
        }
        if (session.streak % 3 === 0) reward(15, 20, L(`${session.streak} problèmes de suite`, `${session.streak} puzzles in a row`));
        const praise = [L('Excellent ! Tu reconnais de mieux en mieux ce motif.', 'Excellent! You are recognising this pattern more and more.'), L('Très bien joué ! Ta régularité fait monter la difficulté.', 'Well played! Your consistency is raising the difficulty.'), L('Belle réussite ! Continue, tu prends confiance.', 'Great solve! Keep going; you are building confidence.')][(session.cleanSolved - 1) % 3];
        say(`${praise} ${L(`Série : ${session.streak}. Difficulté : ${Math.round(session.rating)} sur ${MAX_LEVEL}.`, `Streak: ${session.streak}. Difficulty: ${Math.round(session.rating)} out of ${MAX_LEVEL}.`)}`, 'happy');
        setPzStatus('good', L('Bravo ! Le prochain défi arrive quand tu appuies sur « Prochain défi ».', 'Well done! The next challenge is ready when you press “Next challenge”.'));
      } else {
        session.streak = 0;
        session.rating = Math.max(1, session.rating - 0.25);
        if (pathMode) { saved.rating = session.rating; saved.currentStreak = 0; }
        say(L(`Bien essayé. On reprend un défi adapté à la difficulté ${Math.round(session.rating)} : chaque tentative t’aide à progresser.`, `Good try. We’ll choose another challenge around difficulty ${Math.round(session.rating)}: every attempt helps you improve.`), 'happy');
        setPzStatus('good', L('La solution est trouvée. Continue à ton rythme.', 'Puzzle complete. Keep going at your own pace.'));
      }
      store.set('themeTraining', saved);
    } else {
      const r = recordPuzzle(pz.item, clean);
      say(r.validated ? L(`Bravo ! Niveau ${r.level} validé en problèmes. Joue maintenant une partie : si mon analyse voit que tu ne refais plus cette faute, tu passes au niveau ${r.level + 1}.`, `Well done! Level ${r.level} validated in puzzles. Now play a game: if my analysis sees you no longer make this mistake, you move up to level ${r.level + 1}.`)
        : clean ? (r.pending ? L('Bravo, bonne révision. Ton niveau sera confirmé par ta prochaine partie.', 'Well done, good review. Your level will be confirmed by your next game.') : L(`Bravo, c'est ça ! ${r.ok}/${LEVEL_SET} pour valider le niveau ${r.level}.`, `Well done, that's it! ${r.ok}/${LEVEL_SET} to validate level ${r.level}.`))
        : L(`Tu y es arrivé, mais avec de l'aide : celui-ci ne compte pas. On reste au niveau ${r.level}.`, `You got there, but with help: this one doesn't count. We stay at level ${r.level}.`), 'happy');
    }
    pzButtons();
  }
  // Un problème réussi du premier coup compte pour valider le niveau ; le niveau ne monte qu'après confirmation en partie
  function recordPuzzle(it, clean) {
    if (pz && pz.kind === 'path') clearOpenLesson();
    const c = loadCoach(), row = themeRow(c, it.theme);
    let validated = false;
    if (clean) {
      row.solved++;
      row.score = Math.max(0, Math.round((row.score - 0.02) * 1000) / 1000);
      if (!row.pending && ++row.ok >= LEVEL_SET) { row.pending = true; validated = true; }
    } else row.failed++;
    const challengeElo = 400 + Math.max(1, it.rating || it.level * 3 - 1) * 200;
    countPuzzle();
    store.set('coach', c);
    if (it.personal) touchMistake(it.personal.id, clean);
    if (it.id) { const st = store.get('pzdone', {}); if (clean && st[it.id] !== 's') { reward(5, 10, L('Problème résolu', 'Puzzle solved')); questEvent('puzzle'); countMode('puzzle'); } st[it.id] = clean ? 's' : 'f'; store.set('pzdone', st); }
    refreshCoachProgram();
    return { validated, level: row.level, ok: row.ok, pending: row.pending };
  }
  function touchMistake(id, clean) {
    const ms = store.get('mistakes', []);
    const m = ms.find((x) => x.id === id);
    if (!m) return;
    const now = Date.now();
    m.tries = (m.tries || 0) + 1; m.last = now;
    if (clean) {
      const stage = (m.reviewStage || 0) + 1;
      const intervals = [86400000, 259200000, 604800000];
      m.reviewStage = stage;
      m.solved = stage > intervals.length;
      m.reviewAt = m.solved ? 0 : now + intervals[stage - 1];
    } else {
      m.reviewStage = 0; m.solved = false; m.reviewAt = now + 600000;
    }
    store.set('mistakes', ms);
  }
  $('pz-hint').onclick = () => {
    if (!pz || pz.done || pz.locked || !pz.item.line) return;
    const u = pz.item.line[pz.step];
    const from = window.Chess.sqIndex(u.slice(0, 2));
    const to = window.Chess.sqIndex(u.slice(2, 4));
    pz.hintLevel = Math.min(2, (pz.hintLevel || 0) + 1);
    pz.failed = true;
    hint = { from, to: pz.hintLevel === 1 ? from : to };
    renderBoard();
    const st = pz.kind === 'lesson' ? pz.steps[pz.idx] : null;
    const text = pz.hintLevel === 1
      ? (st && st.hintText ? st.hintText : L(`Observe la pièce en ${u.slice(0, 2)}. Cherche les coups forcés qu’elle peut jouer.`, `Look at the piece on ${u.slice(0, 2)}. Look for the forcing moves it can play.`))
      : L(`La case ${u.slice(2, 4)} est la cible du motif. Trouve le meilleur trajet pour l’atteindre sans exposer ton roi.`, `The square ${u.slice(2, 4)} is the target of the pattern. Find the best route to it without exposing your king.`);
    say(text);
    pzButtons();
  };
  $('pz-solution').onclick = () => {
    if (!pz || pz.done || pz.locked || !pz.item.line) return;
    const u = pz.item.line[pz.step];
    pz.failed = true;
    hint = null;
    pz.misses = (pz.misses || 0) + 1;
    const spokenMove = openingSpeechLine(window.Chess.toFen(game.state), [u])[0];
    say(L('Regarde bien ce coup, je te le montre.', 'Watch this move carefully, I will show you.'), '', spokenMove);
    commit(window.Chess.sqIndex(u.slice(0, 2)), window.Chess.sqIndex(u.slice(2, 4)), u[4]);
  };
  $('pz-next').onclick = () => {
    if (!pz || !pz.done) return;
    if (pz.kind === 'lesson') return nextLessonStep();
    if (pz.kind === 'themed') return nextThemedPuzzle();
    nextActivity();
  };
  $('btn-puzzle-back').onclick = leavePuzzle;
  $('btn-theme-back').onclick = () => show('problems');

  /* Leçons guidées par l'entraîneur */
  function startLesson(k, options = {}) {
    const lesson = lessonOf(k);
    const c = loadCoach(), row = c.themes[k];
    const steps = lesson.steps.slice();
    const intro = row && row.errors
      ? L(`Bonjour, je suis ${COACH}. Dans tes parties, j'ai relevé ${row.errors} faute${row.errors > 1 ? 's' : ''} de type « ${PZ[k].name} ». C'est ta priorité du moment : on va la travailler ensemble.`, `Hello, I'm ${COACH}. In your games, I found ${row.errors} mistake${row.errors === 1 ? '' : 's'} of the “${PZ[k].name}” kind. It's your priority right now: let's work on it together.`)
      : L(`Bonjour, je suis ${COACH}. Aujourd'hui, on travaille « ${PZ[k].name} ».`, `Hello, I'm ${COACH}. Today we work on “${PZ[k].name}”.`);
    steps.unshift({ text: intro });
    // Dernière étape : une de tes propres erreurs sur ce thème
    const mine = store.get('mistakes', []).filter((m) => m.theme === k).pop();
    if (mine) {
      const played = uciOf(mine);
      if (played) steps.push({ text: L(`Regardons ta partie du ${fmtDate(mine.date)}, au coup ${mine.move} : tu as joué ${mine.played}.`, `Let's look at your game of ${fmtDate(mine.date)}, move ${mine.move}: you played ${mine.played}.`), fen: mine.fen,
        demoMoves: [played], demoSpeech: openingSpeechLine(mine.fen, [played]), arrows: [{ from: window.Chess.sqIndex(played.slice(0, 2)), to: window.Chess.sqIndex(played.slice(2, 4)), color: 'red' }], annotateRelations: true });
      steps.push({ text: L(`Avec ce que tu viens de voir, trouve le bon coup dans cette position.`, `Now find the right move in this position.`), fen: mine.fen, line: mine.line, alts: mine.alts, mistake: mine.id, why: L('Voilà le coup que tu cherchais. La prochaine fois, tu le verras pendant la partie.', "That's the move you were looking for. Next time, you'll see it during the game.") });
    }
    steps.push({ text: L(`${PZ[k].tip} Passons aux problèmes : à chaque réussite, le niveau monte.`, `${PZ[k].tip} On to the puzzles: each success raises the level.`) });
    addPrincipleExamples(steps);
    const currentLevel = themeRow(c, k).level;
    const challengeLevel = Math.min(MAX_LEVEL, currentLevel + 1);
    const challenge = options.puzzleId && BANK.find((p) => p.id === options.puzzleId && p.theme === k)
      || pickPuzzle(k, challengeLevel, false);
    if (challenge && challenge.line && challenge.line.length) steps.push({
      ...challenge,
      text: currentLevel < MAX_LEVEL
        ? L(`Défi adapté : essaie un exercice un niveau au-dessus de ton niveau actuel (${challengeLevel}).`, `Level-up challenge: try a puzzle one level above your current level (${challengeLevel}).`)
        : L(`Défi adapté : voici un exercice de niveau avancé (${challengeLevel}).`, `Level-up challenge: here is an advanced puzzle (level ${challengeLevel}).`),
      level: challenge.level || challengeLevel, adaptive: true,
    });
    const title = options.daily ? L(`Leçon du jour · ${lesson.title}`, `Lesson of the day · ${lesson.title}`) : lesson.title;
    pz = { kind: 'lesson', lesson: { ...lesson, title, resume: `lesson:${k}`, daily: !!options.daily, adaptivePuzzleId: challenge && challenge.id }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  // Leçon ou problème ouvert : retenu pour l'écran « Reprendre » jusqu'à ce qu'il soit terminé
  function trackOpenLesson() {
    if (!pz || !pz.lesson || !pz.lesson.resume) return;
    store.set('openLesson', { key: pz.lesson.resume, title: pz.lesson.title, idx: pz.idx, total: pz.steps.length, daily: pz.lesson.daily, puzzleId: pz.lesson.adaptivePuzzleId, at: Date.now() });
  }
  const clearOpenLesson = () => { if (store.get('openLesson', null)) store.set('openLesson', null); };
  function resumeOpenLesson() {
    const ol = store.get('openLesson', null); if (!ol) return;
    const [kind, id] = ol.key.split(':');
    if (kind === 'program') {
      const mistake = ol.personalId && store.get('mistakes', []).find((m) => m.id === ol.personalId);
      const savedPuzzle = mistake ? personalItem(mistake) : BANK.find((p) => p.id === ol.puzzleId);
      if (savedPuzzle) { pz = { kind: 'path', idx: 0, item: savedPuzzle }; enterPuzzleMode(); loadItem(savedPuzzle); return; }
      show('problems'); nextActivity(); return;
    }
    if (kind === 'tutorial') startTutorial(TR.TUTORIALS.find((x) => x.id === id));
    else if (kind === 'mate') startMateLesson(TR.MATES.find((x) => x.id === id));
    else if (kind === 'end') startEndgame(TR.ENDGAMES.find((x) => x.id === id));
    else if (kind === 'open') startOpening(TR.OPENINGS.find((x) => x.id === id));
    else if (kind === 'famous') startFamous(TR.FAMOUS.find((x) => x.id === id));
    else if (kind === 'daily') startDaily(Number(id) || 0);
    else if (kind === 'lesson') startLesson(id, { daily: !!ol.daily, puzzleId: ol.puzzleId });
    else return;
    // reprise à l'étape où l'on s'était arrêté
    if (pz && pz.steps && ol.idx > 0 && ol.idx < pz.steps.length) { pz.idx = ol.idx; loadLessonStep(); }
  }
  function loadLessonStep() {
    trackOpenLesson();
    const st = pz.steps[pz.idx];
    // Tous les parcours d'apprentissage qui rejouent ou font jouer une ligne
    // affichent les relations tactiques à chaque coup, comme les ouvertures.
    if (st.line && st.line.length || st.demoMoves && st.demoMoves.length) st.annotateRelations = true;
    const it = { id: st.id, personal: st.personal, rating: st.rating, theme: st.theme || pz.lesson.theme, level: st.level || 1, fen: st.fen, line: st.line, alts: st.alts };
    Object.assign(pz, { item: it, step: 0, failed: false, done: !st.line && !st.demoMoves?.length, locked: !!st.demoMoves?.length, demoIndex: 0 });
    if (st.fen) setPosition(st.fen);
    else if (!game) setPosition('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    selected = -1; hint = null;
    marks = st.marks ? st.marks.map((s) => window.Chess.sqIndex(s)) : null;
    $('puzzle-title').textContent = pz.lesson.title;
    $('pz-count').textContent = L(`Étape ${pz.idx + 1} / ${pz.steps.length}`, `Step ${pz.idx + 1} / ${pz.steps.length}`);
    const tutorialArrival = pz.lesson.resume && pz.lesson.resume.startsWith('tutorial:') && pz.idx === 0;
    const stepText = st.line ? st.text : `${st.text} ${lessonCue()}`;
    const spokenText = tutorialArrival
      ? `${pz.lesson.title}. ${st.demoIntroText || stepText}`
      : st.demoIntroText;
    const lessonStepIndex = pz.idx;
    const syncOpeningDemo = st.syncDemoWithVoice && st.demoMoves && st.demoMoves.length;
    const openingMoveSpeech = syncOpeningDemo && (st.demoSpeech && st.demoSpeech[0] || openingMoveSpeechForStep(st));
    const syncedVoiceText = syncOpeningDemo
      ? `${st.text} ${L('Regarde le coup :', 'Watch the move:')} ${openingMoveSpeech}`
      : spokenText;
    const openingCueIndex = syncOpeningDemo ? syncedVoiceText.indexOf(openingMoveSpeech) : -1;
    let narration = Promise.resolve();
    const voiceCues = openingCueIndex >= 0 ? [{ index: openingCueIndex, run: () => playLessonDemo(st, lessonStepIndex, Promise.resolve(), narration) }] : null;
    narration = say(`${tutorialArrival ? `${pz.lesson.title}. ` : ''}${stepText}`, '', syncedVoiceText, voiceCues);
    setPzStatus('', st.line ? puzzleTurnText() : '');
    renderBoard();
    pzButtons();
    if (st.demoMoves && st.demoMoves.length) {
      if (syncOpeningDemo && voiceCues && tts && settings.voice) return;
      playLessonDemo(st, pz.idx, narration);
    }
  }
  function openingMoveSpeechForStep(step) {
    if (!step.demoMoves || !step.demoMoves.length || !step.fen) return '';
    return openingSpeechLine(step.fen, [step.demoMoves[0]])[0] || '';
  }
  function openingMoveSpeech(san, color, uci) {
    if (/^O-O(-O)?/.test(san)) return L(`${sideName(color)} : ${san.startsWith('O-O-O') ? 'grand roque' : 'petit roque'}.`, `${sideName(color)}: ${san.startsWith('O-O-O') ? 'queenside castling' : 'kingside castling'}.`);
    const pieceKey = /^[KQRBN]/.test(san) ? san[0] : 'P';
    const piece = L({ K: 'roi', Q: 'dame', R: 'tour', B: 'fou', N: 'cavalier', P: 'pion' }[pieceKey], { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' }[pieceKey]);
    const destination = `${uci.slice(2, 3)} ${uci.slice(3, 4)}`;
    const action = san.includes('x') ? L('prend', 'takes') : L('va en', 'to');
    const suffix = san.includes('#') ? L(' échec et mat', ' checkmate') : san.includes('+') ? L(' échec', ' check') : '';
    return L(`${sideName(color)} : ${piece} ${action} ${destination}${suffix}.`, `${sideName(color)}: ${piece} ${action} ${destination}${suffix}.`);
  }
  function addPrincipleExamples(steps) {
    for (let i = 0; i < steps.length - 1; i++) {
      const explanation = steps[i], exercise = steps[i + 1];
      if (!explanation.fen || explanation.line || explanation.demoMoves?.length || !exercise.fen || !exercise.line?.length) continue;
      if (explanation.fen !== exercise.fen) continue;
      // L'explication est suivie d'un exemple bref, puis l'étape suivante
      // demande au joueur de retrouver lui-même la séquence.
      explanation.demoMoves = exercise.line.slice(0, Math.min(4, exercise.line.length));
    }
    return steps;
  }
  function openingSpeechLine(fen, moves) {
    const position = new Game(fen), speech = [];
    for (const uci of moves || []) {
      const color = position.state.turn, move = position.playUci(uci);
      if (!move) break;
      speech.push(openingMoveSpeech(move.san, color, uci));
    }
    return speech;
  }
  function openingArrowsForMove(uci, state, color, move) {
    const from = window.Chess.sqIndex(uci.slice(0, 2)), to = window.Chess.sqIndex(uci.slice(2, 4));
    const arrows = [{ from, to, color: move.move.captured ? 'red' : 'green' }];
    const owned = { ...state, turn: color };
    for (const attack of window.Chess.pseudoMoves(owned)) {
      const target = state.board[attack.to];
      if (attack.from === to && target && colorOf(target) !== color) arrows.push({ from: attack.from, to: attack.to, color: 'red' });
    }
    if (state.board[to]) {
      const board = state.board.slice();
      board[to] = color === 'w' ? 'p' : 'P';
      const defenseState = { ...state, board, turn: color };
      for (const defense of window.Chess.pseudoMoves(defenseState)) {
        if (defense.to === to && defense.from !== to && colorOf(state.board[defense.from]) === color) arrows.push({ from: defense.from, to, color: 'blue' });
      }
    }
    const seen = new Set();
    return arrows.filter((arrow) => { const key = `${arrow.from}-${arrow.to}-${arrow.color}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }
  function playLessonDemo(step, index, narration = Promise.resolve(), speechCompletion = null) {
    const session = pz;
    const baseArrows = step.arrows || [];
    const advance = async () => {
      if (pz !== session || pz.idx !== index) return;
      const uci = step.demoMoves[session.demoIndex];
      if (!uci) {
        session.locked = false; session.done = true;
        setPzStatus('good', step.demoDoneText || L('Démonstration terminée. Observe la flèche pour trouver le meilleur coup.', 'Demonstration complete. Follow the arrow to find the best move.'));
        pzButtons();
        return;
      }
      const color = game.state.turn;
      const played = game.playUci(uci);
      if (!played) { session.demoIndex++; advance(); return; }
      const spokenMove = step.demoSpeech && step.demoSpeech[session.demoIndex]
        || openingMoveSpeech(played.san, color, uci);
      const speech = step.syncDemoWithVoice ? Promise.resolve() : speak(spokenMove);
      session.demoIndex++;
      if (step.annotateRelations) {
        const dynamic = openingArrowsForMove(uci, game.state, color, played);
        step.arrows = [...baseArrows, ...dynamic].filter((arrow, i, all) => all.findIndex((other) => other.from === arrow.from && other.to === arrow.to && other.color === arrow.color) === i);
      }
      animateNext = true;
      renderBoard();
      await Promise.all([speech, speechCompletion || Promise.resolve(), new Promise((resolve) => setTimeout(resolve, Math.max(850, busyDelay(250))))]);
      advance();
    };
    setPzStatus('', step.demoStartText || L('Regarde les coups de ta partie…', 'Watch the moves from your game…'));
    Promise.resolve(narration).then(() => { if (pz === session && pz.idx === index) setTimeout(advance, 250); });
  }
  function scheduleTutorialAdvance(speech, session, index, textLength = 0) {
    Promise.resolve(speech).then(() => {
      if (pz !== session || pz.idx !== index || !session.done) return;
      const delay = tts && settings.voice ? 1200 : Math.max(3000, Math.min(5500, textLength * 32));
      session.autoAdvanceTimer = setTimeout(() => {
        session.autoAdvanceTimer = null;
        if (pz === session && pz.idx === index && session.done) nextLessonStep();
      }, delay);
    });
  }
  function nextLessonStep() {
    if (pz.autoAdvanceTimer) { clearTimeout(pz.autoAdvanceTimer); pz.autoAdvanceTimer = null; }
    if (pz.idx < pz.steps.length - 1) { pz.idx++; loadLessonStep(); return; }
    if (pz.lesson.resume) clearOpenLesson();
    if (pz.lesson.onDone) return pz.lesson.onDone();
    if (pz.lesson.champion) return finishChampionLesson(pz.lesson.champion);
    if (pz.lesson.tip) { const d = store.get('tipsDone', {}); d[pz.lesson.tip] = pz.lesson.count; store.set('tipsDone', d); return leavePuzzle(); }
    const done = store.get('lessonsDone', {}); done[pz.lesson.theme] = Date.now(); store.set('lessonsDone', done);
    nextActivity();
  }
