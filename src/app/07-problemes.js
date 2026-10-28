  /* ---------- Problèmes et leçons guidées ---------- */
  const PZ = {
    mat: { name: L('Mats à trouver', 'Mates to find'), icon: '♛', short: L("Tu as laissé passer un échec et mat.", 'You missed a checkmate.'), tip: L("Avant chaque coup, passe en revue tous tes échecs, puis toutes tes prises. Un échec qui ne laisse aucune case au roi, c'est souvent le mat.", 'Before each move, go through all your checks, then all your captures. A check that leaves the king no square is often mate.') },
    defense: { name: L('Parer le mat', 'Stopping mate'), icon: '♚', short: L("Tu as laissé l'adversaire mater ou forcer le mat.", 'You let your opponent mate you or force mate.'), tip: L("Après chaque coup adverse, demande-toi : « Qu'est-ce qu'il menace ? » Fuir, s'interposer ou prendre l'attaquant : cherche les trois parades.", 'After each enemy move, ask yourself: “What does it threaten?” Run, block or capture the attacker: look for all three defenses.') },
    prise: { name: L('Pièces en prise', 'Hanging pieces'), icon: '♟', short: L("Une pièce sans défense a été perdue, ou pas prise.", 'An undefended piece was lost, or not taken.'), tip: L("Compte les attaquants et les défenseurs de chaque pièce avant de jouer. Une pièce plus attaquée que défendue est en danger.", 'Count the attackers and defenders of each piece before you move. A piece attacked more than it is defended is in danger.') },
    fourchette: { name: L('Attaques doubles', 'Double attacks'), icon: '♞', short: L("Une pièce a attaqué deux cibles à la fois.", 'A piece attacked two targets at once.'), tip: L("Repère les cases d'où un cavalier, un pion ou la dame toucherait deux de tes pièces, et n'y laisse pas tes pièces alignées.", 'Spot the squares from which a knight, a pawn or the queen would hit two of your pieces, and do not leave your pieces lined up there.') },
    clouage: { name: L('Clouages et enfilades', 'Pins and skewers'), icon: '♝', short: L("Une pièce s'est retrouvée clouée devant une plus précieuse.", 'A piece got pinned in front of a more valuable one.'), tip: L("Évite d'aligner ton roi et ta dame sur une même ligne ou diagonale ouverte face à un fou, une tour ou la dame adverse.", 'Avoid lining up your king and queen on an open line or diagonal facing an enemy bishop, rook or queen.') },
    tactique: { name: L('Combinaisons', 'Combinations'), icon: '✦', short: L("Un gain de matériel en plusieurs coups t'a échappé.", 'You missed a material gain over several moves.'), tip: L("Cherche d'abord les coups forcés : échecs, prises, menaces. Calcule la réponse adverse la plus forte avant de te lancer.", 'Look for forcing moves first: checks, captures, threats. Work out the strongest reply before you commit.') },
    finale: { name: L('Finales', 'Endgames'), icon: '♙', short: L("Une faute en fin de partie a coûté le résultat.", 'An endgame mistake cost you the result.'), tip: L("En finale, active ton roi et pousse tes pions passés. La règle du carré dit si un pion peut être rattrapé.", 'In the endgame, activate your king and push your passed pawns. The rule of the square tells you whether a pawn can be caught.') },
  };
  const PZ_KEYS = Object.keys(PZ);
  const PZ_LEVELS = L({ 1: 'Facile', 2: 'Moyen', 3: 'Difficile' }, { 1: 'Easy', 2: 'Medium', 3: 'Hard' });
  const BANK = window.PUZZLES || [];
  const puzzleIds = new Set(BANK.map((p) => p.id));
  for (const raw of window.LICHESS_PUZZLES || []) {
    if (puzzleIds.has(`l${raw.id}`) || !Array.isArray(raw.moves) || raw.moves.length < 2) continue;
    const context = new Game(raw.fen);
    if (!context.playUci(raw.moves[0])) continue;
    const fen = window.Chess.toFen(context.state), line = raw.moves.slice(1);
    const validation = new Game(fen);
    if (line.some((move) => !validation.playUci(move))) continue;
    const tags = raw.themes || [];
    const theme = tags.some((tag) => tag === 'mate' || /^mateIn[1-5]$/.test(tag) || /Mate$/.test(tag)) ? 'mat'
      : tags.includes('defensiveMove') ? 'defense'
        : tags.includes('fork') ? 'fourchette'
          : tags.includes('pin') || tags.includes('skewer') ? 'clouage'
            : tags.includes('hangingPiece') || tags.includes('capturingDefender') ? 'prise'
              : tags.some((tag) => /Endgame$/.test(tag) || tag === 'endgame') ? 'finale' : 'tactique';
    BANK.push({ id: `l${raw.id}`, fen, line, theme, themes: tags, rating: raw.rating, sourceRating: raw.sourceRating, source: 'lichess' });
    puzzleIds.add(`l${raw.id}`);
  }
  // Filtres Lichess : les libellés ne sont affichés que si l'échantillon local
  // contient au moins un problème réellement étiqueté pour ce thème.
  function endgameMaterial(fen) {
    const board = window.Chess.fromFen(fen).board;
    const material = { q: 0, r: 0, b: 0, n: 0 };
    for (const piece of board) if (piece && piece.toLowerCase() !== 'k' && piece.toLowerCase() !== 'p') material[piece.toLowerCase()]++;
    return material;
  }
  const materialTotal = (m) => m.q + m.r + m.b + m.n;
  const isEndgamePosition = (fen) => materialTotal(endgameMaterial(fen)) <= 4;
  const rawTopic = (key, tag, name, icon, legacy = () => false) => ({
    key, name, icon,
    puzzles: BANK.filter((p) => p.themes ? p.themes.includes(tag) : legacy(p)),
  });
  const legacyMateIn = (n, p) => {
    if (p.theme !== 'mat' || !p.line || Math.ceil(p.line.length / 2) !== n) return false;
    const g = new Game(p.fen);
    for (const move of p.line) if (!g.playUci(move)) return false;
    const status = g.status();
    return status.over && status.reason === 'mat';
  };
  const phaseTopics = [
    rawTopic('phase-ouverture', 'opening', L('Ouverture', 'Opening'), '♙', (p) => p.fen && !isEndgamePosition(p.fen) && Number(p.fen.split(/\s+/)[5]) <= 12),
    rawTopic('phase-milieu', 'middlegame', L('Milieu de jeu', 'Middlegame'), '♟', (p) => p.fen && !isEndgamePosition(p.fen) && Number(p.fen.split(/\s+/)[5]) > 12),
    rawTopic('phase-finale', 'endgame', L('Finales', 'Endgames'), '♙', (p) => p.theme === 'finale' || (p.fen && isEndgamePosition(p.fen))),
  ];
  const endgameTopics = [
    rawTopic('finale-tours', 'rookEndgame', L('Finales de tours', 'Rook endgames'), '♜', (p) => p.theme === 'finale' && (() => { const m = endgameMaterial(p.fen); return !m.q && m.r > 0 && !m.b && !m.n; })()),
    rawTopic('finale-fous', 'bishopEndgame', L('Finales de fous', 'Bishop endgames'), '♝', (p) => p.theme === 'finale' && (() => { const m = endgameMaterial(p.fen); return !m.q && !m.r && m.b > 0 && !m.n; })()),
    rawTopic('finale-pions', 'pawnEndgame', L('Finales de pions', 'Pawn endgames'), '♙', (p) => p.theme === 'finale' && (() => { const m = endgameMaterial(p.fen); return !m.q && !m.r && !m.b && !m.n; })()),
    rawTopic('finale-cavaliers', 'knightEndgame', L('Finales de cavaliers', 'Knight endgames'), '♞', (p) => p.theme === 'finale' && (() => { const m = endgameMaterial(p.fen); return !m.q && !m.r && !m.b && m.n > 0; })()),
    rawTopic('finale-dames', 'queenEndgame', L('Finales de dames', 'Queen endgames'), '♛', (p) => p.theme === 'finale' && (() => { const m = endgameMaterial(p.fen); return m.q > 0 && !m.r && !m.b && !m.n; })()),
    rawTopic('finale-dames-tours', 'queenRookEndgame', L('Finales de dames et tours', 'Queen and rook endgames'), '♛♜'),
  ];
  const motifDefs = [
    ['advancedPawn', L('Pion avancé', 'Advanced pawn'), '♙'], ['attackingF2F7', L('Attaque sur f2 ou f7', 'Attack on f2 or f7'), '♟'],
    ['capturingDefender', L('Capturez le défenseur', 'Capture the defender'), '♞'], ['discoveredAttack', L('Attaque à la découverte', 'Discovered attack'), '♜'],
    ['doubleCheck', L('Échec double', 'Double check'), '♔'], ['exposedKing', L('Roi exposé', 'Exposed king'), '♚'],
    ['fork', L('Fourchette', 'Fork'), '♘'], ['hangingPiece', L('Pièce en prise', 'Hanging piece'), '♟'],
    ['kingsideAttack', L('Attaque sur l’aile roi', 'Kingside attack'), '♔'], ['pin', L('Clouage', 'Pin'), '♝'],
    ['queensideAttack', L('Attaque sur l’aile dame', 'Queenside attack'), '♕'], ['sacrifice', L('Sacrifice', 'Sacrifice'), '⚔'],
    ['skewer', L('Enfilade', 'Skewer'), '♜'], ['trappedPiece', L('Pièce enfermée', 'Trapped piece'), '♟'],
  ].map(([tag, name, icon]) => rawTopic(`lichess-${tag}`, tag, name, icon, (p) => ({ fork: 'fourchette', pin: 'clouage', skewer: 'clouage', hangingPiece: 'prise' }[tag] === p.theme)));
  const advancedDefs = [
    ['attraction', L('Attraction', 'Attraction'), '🧲'], ['clearance', L('Dégagement', 'Clearance'), '♟'],
    ['defensiveMove', L('Coup défensif', 'Defensive move'), '🛡'], ['deflection', L('Déviation', 'Deflection'), '↗'],
    ['interference', L('Interception', 'Interference'), '⛔'], ['intermezzo', L('Coup intermédiaire', 'Zwischenzug'), '♞'],
    ['quietMove', L('Coup silencieux', 'Quiet move'), '♘'], ['xRayAttack', L('Attaque « rayons X »', 'X-ray attack'), '➜'],
    ['zugzwang', 'Zugzwang', '♟'],
  ].map(([tag, name, icon]) => rawTopic(`lichess-${tag}`, tag, name, icon, (p) => tag === 'defensiveMove' && p.theme === 'defense'));
  const specialDefs = [
    ['castling', L('Roque', 'Castling'), '♜'], ['enPassant', L('Prise en passant', 'En passant'), '✦'],
    ['promotion', L('Promotion', 'Promotion'), '♕'], ['underPromotion', L('Sous-promotion', 'Underpromotion'), '♞'],
  ].map(([tag, name, icon]) => rawTopic(`lichess-${tag}`, tag, name, icon, (p) => tag === 'promotion' && p.line && p.line.some((move) => move.length > 4)));
  const goalDefs = [
    ['equality', L('Égalité', 'Equality'), '⚖'], ['advantage', L('Avantage', 'Advantage'), '👍'],
    ['crushing', L('Écrasant', 'Crushing'), '♜'], ['mate', L('Mat', 'Checkmate'), '♛'],
  ].map(([tag, name, icon]) => rawTopic(`goal-${tag}`, tag, name, icon, (p) => tag === 'mate' && p.theme === 'mat'));
  const mateDefs = [
    ['mate', L('Mat', 'Checkmate'), '♛', (p) => p.theme === 'mat'],
    ...[1, 2, 3, 4, 5].map((n) => [`mateIn${n}`, L(`Mat en ${n}`, `Mate in ${n}`), '♛', (p) => legacyMateIn(n, p)]),
    ['anastasiaMate', L('Mat d’Anastasie', 'Anastasia’s mate'), '♞'], ['arabianMate', L('Mat arabe', 'Arabian mate'), '♜'],
    ['backRankMate', L('Mat du couloir', 'Back-rank mate'), '♜'], ['bodenMate', L('Mat de Boden', 'Boden’s mate'), '♝'],
    ['doubleBishopMate', L('Mat des deux fous', 'Double-bishop mate'), '♝'], ['dovetailMate', L('Mat du guéridon', 'Dovetail mate'), '♛'],
    ['hookMate', L('Mat du hameçon', 'Hook mate'), '♞'], ['smotheredMate', L('Mat à l’étouffée', 'Smothered mate'), '♞'],
  ].map(([tag, name, icon, legacy]) => rawTopic(`lichess-${tag}`, tag, name, icon, legacy));
  const legacyTopics = PZ_KEYS.filter((key) => key !== 'finale').map((key) => ({
    key: `legacy-${key}`, name: PZ[key].name, icon: PZ[key].icon,
    puzzles: BANK.filter((p) => !p.themes && p.theme === key && p.line && p.line.length),
  }));
  const trainingTopicGroups = [
    { name: L('Motifs', 'Motifs'), topics: [...motifDefs, ...legacyTopics] },
    { name: L('Phases', 'Phases'), topics: phaseTopics },
    { name: L('Finales par matériel', 'Endgames by material'), topics: endgameTopics },
    { name: L('Avancé', 'Advanced'), topics: advancedDefs },
    { name: L('Coups spéciaux', 'Special moves'), topics: specialDefs },
    { name: L('Objectifs', 'Goals'), topics: goalDefs },
    { name: L('Thèmes de mat', 'Checkmate themes'), topics: mateDefs },
  ].map((group) => ({ ...group, topics: group.topics.filter((topic) => topic.puzzles.length) })).filter((group) => group.topics.length);
  const ALL_TRAINING_TOPICS = trainingTopicGroups.flatMap((group) => group.topics);
  const trainingTopic = (key) => ALL_TRAINING_TOPICS.find((topic) => topic.key === key);
  const trainingTopicName = (key) => trainingTopic(key)?.name || PZ[key]?.name || '';
  const trainingTopicIcon = (key) => trainingTopic(key)?.icon || PZ[key]?.icon || '♟';
  const trainingTopicPuzzles = (key) => trainingTopic(key)?.puzzles || (key === 'finale' ? BANK.filter((p) => p.theme === key && p.line && p.line.length) : []);
  function topicMastery(topic) {
    const outcomes = store.get('pzdone', {});
    let attempted = 0, solved = 0;
    for (const puzzle of topic.puzzles) {
      const outcome = outcomes[puzzle.id];
      if (outcome !== 's' && outcome !== 'f') continue;
      attempted++;
      if (outcome === 's') solved++;
    }
    const puzzleScore = attempted ? ((solved + 1) / (attempted + 2)) * 100 : null;
    const c = loadCoach(), themeCounts = {};
    for (const puzzle of topic.puzzles) if (PZ[puzzle.theme]) themeCounts[puzzle.theme] = (themeCounts[puzzle.theme] || 0) + 1;
    let analysisTotal = 0, analysisWeight = 0, analysisGames = 0;
    for (const [key, count] of Object.entries(themeCounts)) {
      const row = c.themes[key];
      if (!row || !row.recent || !row.recent.length) continue;
      const recent = row.recent.slice(-10);
      analysisGames = Math.max(analysisGames, recent.length);
      let score = Number(row.score) || 0;
      if (row.recent.slice(-5).some((n) => n > 0)) score = Math.max(score, 0.1);
      const mastery = 100 * (1 - Math.min(1, score / 0.3));
      const weight = count * recent.length;
      analysisTotal += mastery * weight;
      analysisWeight += weight;
    }
    const analysisScore = analysisWeight ? analysisTotal / analysisWeight : null;
    if (puzzleScore === null && analysisScore === null) return { known: false, text: L('À évaluer', 'Not assessed'), className: 'unknown' };
    let value = analysisScore === null ? puzzleScore : puzzleScore === null ? analysisScore : (() => {
      const puzzleWeight = Math.min(0.75, attempted / (attempted + 3));
      return puzzleScore * puzzleWeight + analysisScore * (1 - puzzleWeight);
    })();
    value = Math.round(value);
    const className = value >= 67 ? 'good' : value >= 34 ? 'warm' : 'poor';
    return { known: true, value, solved, attempted, analysisGames, text: `${value}%`, className };
  }
  const LESSONS = window.LESSONS || [];
  const fmtDate = (id) => new Date(id).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
  const loadCoach = () => Object.assign({ themes: {}, games: 0 }, store.get('coach', {}));
  function themeRow(c, k) {
    const row = c.themes[k] || (c.themes[k] = { score: 0, hist: [], errors: 0, recent: [], solved: 0, failed: 0, level: 1 });
    if (row.ok === undefined) { row.ok = 0; row.pending = false; }
    return row;
  }
  // Thèmes où tu as déjà fauté, du plus fréquent au plus rare
  function ranked(c) {
    return PZ_KEYS.filter((k) => c.themes[k] && c.themes[k].errors > 0)
      .sort((a, b) => c.themes[b].score - c.themes[a].score || c.themes[b].errors - c.themes[a].errors);
  }
  // score ≈ nombre moyen de fautes par partie sur les parties récentes
  const isWeak = (row) => row.score >= 0.1 || row.recent.slice(-5).some((n) => n > 0);
  function themeStatus(row) {
    if (row.score >= 0.3) return ['hot', L('À travailler', 'To work on')];
    if (isWeak(row)) return ['warm', L('À surveiller', 'To watch')];
    return ['ok', L('Acquis', 'Mastered')];
  }
  function trendOf(row) {
    const h = row.hist;
    if (h.length < 3) return '';
    const d = row.score - h[Math.max(0, h.length - 6)];
    if (d <= -0.05) return `<span class="trend down">${L('↓ en progrès', '↓ improving')}</span>`;
    if (d >= 0.05) return `<span class="trend up">${L('↑ plus fréquent', '↑ more frequent')}</span>`;
    return `<span class="trend">${L('→ stable', '→ steady')}</span>`;
  }

  /* Archive des parties et analyse en arrière-plan */
  function archiveGame() {
    const arch = store.get('archive', []);
    arch.push({ id: Date.now(), mode: cfg.mode, color: cfg.playerColor, level: cfg.level, champion: cfg.champion || undefined, fen: cfg.fen || undefined, moves: game.uciList(), result: result ? result.result : '*', reason: result ? result.reason : '', analysed: !!cfg.fen || game.history.length < 12 });
    store.set('archive', arch.slice(-30));
    setTimeout(analyseNext, 1500);
  }
  let aWorker = null, analysing = false, styleBackfillsThisSession = 0;
  function analyseNext() {
    if (analysing) return;
    const archive = store.get('archive', []);
    const g = archive.find((x) => !x.analysed) || (styleBackfillsThisSession < 3 ? archive.slice(-20).reverse().find((x) => !x.styleProfile && !x.styleProfileFailed && ['ai', 'coach'].includes(x.mode) && !x.fen && x.color && x.moves && x.moves.length >= 12) : null);
    if (!g) return explainPending();
    const wasAnalysed = !!g.analysed;
    if (wasAnalysed) styleBackfillsThisSession++;
    try { aWorker = aWorker || new Worker(`analyse-worker.js?lang=${LANG}`); } catch { return; }
    analysing = true;
    aWorker.onmessage = (e) => {
      analysing = false;
      const arch = store.get('archive', []);
      const row = arch.find((x) => x.id === g.id);
      if (row) {
        row.analysed = true;
        if (e.data.ok && e.data.profile) row.styleProfile = e.data.profile;
        else if (wasAnalysed) row.styleProfileFailed = true;
      }
      store.set('archive', arch);
      if (e.data.ok && !wasAnalysed) recordAnalysis(g, e.data.errors, e.data.captures || []);
      if (wasAnalysed && e.data.ok) {
        refreshCoachProgram();
        if (document.body.dataset.screen === 'home') refreshHome();
      }
      if ($('problems').classList.contains('active')) renderProblems();
      analyseNext();
    };
    aWorker.postMessage({ id: g.id, moves: g.moves, color: g.color });
  }
  function recordAnalysis(g, errors, captures = []) {
    const c = loadCoach();
    const ignoredCaptureIds = new Set(captures
      .filter((x) => x.kind === 'counterplay' || x.kind === 'material-only' || x.kind === 'advantageous')
      .map((x) => `${g.id}-${x.ply}`));
    const countedErrors = errors.filter((e) => !(e.theme === 'prise' && ignoredCaptureIds.has(`${g.id}-${e.ply}`)));
    const count = {};
    for (const e of countedErrors) count[e.theme] = (count[e.theme] || 0) + 1;
    const promoted = [], retry = [];
    for (const k of PZ_KEYS) {
      const row = themeRow(c, k), n = Math.min(3, count[k] || 0);
      row.score = Math.round((0.85 * row.score + 0.15 * n) * 1000) / 1000;
      row.hist = row.hist.concat(row.score).slice(-30);
      row.recent = row.recent.concat(n).slice(-20);
      row.errors += n;
      // L'analyse confirme le niveau validé en problèmes, ou le fait reprendre
      if (row.pending) {
        row.pending = false; row.ok = 0;
        if (n === 0 && row.level < MAX_LEVEL) { row.level++; promoted.push(L(`${PZ[k].name} niveau ${row.level}`, `${PZ[k].name} level ${row.level}`)); }
        else if (n > 0) retry.push(PZ[k].name);
      }
    }
    c.games++;
    store.set('coach', c);
    const mistakes = store.get('mistakes', []);
    for (const e of countedErrors) {
      let san = e.played;
      try { san = new Game(e.fen).playUci(e.played).san; } catch { /* coup brut */ }
      mistakes.push({
        id: `${g.id}-${e.ply}`, date: g.id, move: Math.floor(e.ply / 2) + 1,
        theme: e.theme, phase: e.phase, fen: e.fen, played: san, line: e.line, alts: e.alts,
        level: e.level, solved: false, tries: 0, last: 0, reviewStage: 0, reviewAt: Date.now(),
      });
    }
    store.set('mistakes', mistakes.slice(-150));
    const before = new Set(store.get('tipsSeen', []));
    const fresh = tipMotifs().filter((t) => !before.has(t.key));
    if (fresh.length) {
      store.set('tipsSeen', [...before, ...fresh.map((t) => t.key)]);
      setTimeout(() => toast(L(`Nouvelle astuce de ${COACH} : ${fresh[0].title}. Voir Problèmes.`, `New tip from ${COACH}: ${fresh[0].title}. See Puzzles.`)), 7000);
    }
    refreshCoachProgram();
    const summary = countedErrors.length
      ? L(`${countedErrors.length} faute${countedErrors.length > 1 ? 's' : ''}`, `${countedErrors.length} mistake${countedErrors.length === 1 ? '' : 's'}`) + ` (${[...new Set(countedErrors.map((e) => PZ[e.theme].name))].join(', ')})`
      : L('aucune grosse faute', 'no big mistake');
    toast(L(`Partie analysée : ${summary}. Voir Problèmes.`, `Game analysed: ${summary}. See Puzzles.`));
    if (promoted.length || retry.length) setTimeout(() => toast((promoted.length ? L(`Niveau confirmé : ${promoted.join(', ')}. `, `Level confirmed: ${promoted.join(', ')}. `) : '') + (retry.length ? L(`À reprendre : ${retry.join(', ')}.`, `To redo: ${retry.join(', ')}.`) : '')), 3500);
  }

  /* Parcours imposé : pour chaque thème, du plus fréquent au plus rare, la leçon puis des problèmes */
  // Chaque niveau d'un thème : quelques problèmes à réussir, puis l'analyse de tes parties confirme
  const LEVEL_SET = 3;
  const MAX_LEVEL = 9;
  let problemSettingsOpen = false;
  let problemsSection = 'program';
  const themeTrainingPrefs = () => Object.assign({ themes: [], rating: 1, bestRating: 1, solvedTotal: 0, attemptedTotal: 0, bestStreak: 0, currentStreak: 0, topicStats: {}, route: [] }, store.get('themeTraining', {}));
  function problemPreferences() {
    const saved = store.get('problemPrefs', {});
    const games = Number(saved.games), threshold = Number(saved.threshold);
    return {
      games: Number.isInteger(games) ? Math.max(1, Math.min(20, games)) : 10,
      threshold: Number.isInteger(threshold) ? Math.max(1, Math.min(99, threshold)) : 70,
    };
  }
  // Ne proposer que les thèmes qui dépassent le seuil choisi dans les parties
  // récentes analysées, avec trois priorités au maximum.
  function recurringThemes(c) {
    const prefs = problemPreferences();
    return PZ_KEYS.map((key) => {
      const row = c.themes[key];
      if (!row || !Array.isArray(row.recent) || !row.recent.length) return null;
      const recent = row.recent.slice(-prefs.games);
      const affected = recent.filter((n) => n > 0).length;
      const rate = affected / recent.length;
      return rate > prefs.threshold / 100 ? { key, row, rate, affected, sample: recent.length } : null;
    }).filter(Boolean)
      .sort((a, b) => b.rate - a.rate || b.affected - a.affected || (b.row.score || 0) - (a.row.score || 0) || b.row.errors - a.row.errors)
      .slice(0, 3)
      .map((item) => item.key);
  }
  function pathOrder(c) {
    // Avant toute analyse, proposer trois thèmes de base. Ensuite, le programme
    // ne retient que les difficultés qui dépassent réellement le seuil demandé.
    return c.games ? recurringThemes(c) : PZ_KEYS.slice(0, 3);
  }
  function pickPuzzle(k, level, includePersonal = true) {
    const now = Date.now();
    const due = (m) => m.reviewAt ?? ((m.last || 0) + 600000);
    const mine = includePersonal ? store.get('mistakes', []).filter((m) => m.theme === k && !m.solved && due(m) <= now).sort((a, b) => due(a) - due(b))[0] : null;
    if (mine) return personalItem(mine);
    const st = store.get('pzdone', {});
    const eligible = BANK.filter((p) => p.theme === k && Array.isArray(p.line) && p.line.length);
    let pool = eligible.filter((p) => st[p.id] !== 's');
    if (!pool.length) pool = eligible;
    if (!pool.length) return null;
    // Les puzzles Lichess enrichissent le programme personnalisé ; on en choisit
    // environ 7 sur 10 quand ils existent, sans perdre l'apport de la banque locale.
    const lichess = pool.filter((p) => p.source === 'lichess' || String(p.id).startsWith('l'));
    const local = pool.filter((p) => !(p.source === 'lichess' || String(p.id).startsWith('l')));
    if (lichess.length && local.length) pool = Math.random() < 0.7 ? lichess : local;
    else if (lichess.length) pool = lichess;
    const dist = (p) => Math.abs((p.rating || p.level * 3 - 1) - level) + (st[p.id] ? 0.5 : 0) + Math.random() * 0.9;
    return pool.map((p) => ({ p, d: dist(p) })).sort((a, b) => a.d - b.d)[0].p;
  }
  // Étape suivante du parcours : premier thème faible dont le niveau n'attend pas de confirmation
  function peekActivity() {
    const c = loadCoach(), order = pathOrder(c), done = store.get('lessonsDone', {});
    if (!order.length) return { type: 'none', theme: null };
    const open = order.filter((x) => !themeRow(c, x).pending && (BANK.some((p) => p.theme === x) || !done[x]));
    const k = open[0];
    if (!k) return { type: 'wait', theme: order[0] };
    if (!done[k] && LESSONS.some((x) => x.theme === k)) return { type: 'lesson', theme: k };
    return { type: 'puzzle', theme: k };
  }
  function nextActivity(force) {
    let act = peekActivity();
    if (act.type === 'none') return modal({
      title: L('Aucune erreur récurrente', 'No recurring mistakes'),
      text: L(`Aucun thème ne revient dans plus de ${problemPreferences().threshold} % de tes ${problemPreferences().games} dernières parties analysées. Continue à jouer : les leçons et problèmes ciblés apparaîtront dès qu’une difficulté récurrente se confirme.`, `No theme appears in more than ${problemPreferences().threshold}% of your last ${problemPreferences().games} analysed games. Keep playing: focused lessons and puzzles will appear as soon as a recurring weakness is confirmed.`),
      actions: [
        { label: L('Jouer une partie', 'Play a game'), primary: true, onClick: () => { setup.mode = 'ai'; renderSetup(); returnTo = 'problems'; show('setup'); } },
        { label: L('Fermer', 'Close'), ghost: true },
      ],
    });
    if (act.type === 'wait') {
      if (force !== true) return modal({
        title: L('À toi de jouer une partie', 'Time to play a game'),
        text: L("Tous tes niveaux en cours sont validés en problèmes. Joue une partie contre l'ordinateur : si mon analyse voit que tu ne refais plus ces fautes, tu passes au niveau suivant.", 'All your current levels are validated in puzzles. Play a game against the computer: if my analysis sees you no longer make these mistakes, you move up a level.'),
        actions: [
          { label: L('Jouer une partie', 'Play a game'), primary: true, onClick: () => { setup.mode = 'ai'; renderSetup(); returnTo = 'problems'; show('setup'); } },
          { label: L('Réviser en attendant', 'Review meanwhile'), ghost: true, onClick: () => nextActivity(true) },
          { label: L('Fermer', 'Close'), ghost: true },
        ],
      });
      act = { type: 'puzzle', theme: act.theme };
    }
    if (act.type === 'lesson') return startLesson(act.theme);
    const row = themeRow(loadCoach(), act.theme);
    const it = pickPuzzle(act.theme, row.level);
    if (!it) { toast(L('Aucun problème disponible pour ce thème.', 'No puzzle available for this theme.')); return leavePuzzle(); }
    pz = { kind: 'path', idx: 0, item: it };
    store.set('openLesson', { key: 'program', title: L(`Problème : ${PZ[act.theme] ? PZ[act.theme].name : ''}`, `Puzzle: ${PZ[act.theme] ? PZ[act.theme].name : ''}`), idx: 0, total: 1, puzzleId: it.id || null, personalId: it.personal && it.personal.id, theme: act.theme, level: row.level, at: Date.now() });
    enterPuzzleMode();
    loadItem(it);
  }
  function startThemeTraining(themes, mode = 'path') {
    const requested = Array.isArray(themes) ? themes : ALL_TRAINING_TOPICS.map((topic) => topic.key);
    const selected = [...new Set(requested)].filter((key) => (PZ[key] || trainingTopic(key)) && trainingTopicPuzzles(key).some((p) => p.line && p.line.length));
    if (!selected.length) return toast(L('Aucun problème n’est disponible pour le moment.', 'No puzzles are available right now.'));
    const saved = themeTrainingPrefs();
    store.set('themeTraining', saved);
    pz = { kind: 'themed', themeSession: { mode, themes: selected, rating: Math.max(1, Math.min(MAX_LEVEL, Number(saved.rating) || 1)), solved: 0, cleanSolved: 0, streak: mode === 'path' ? Math.max(0, Number(saved.currentStreak) || 0) : 0, used: [], lastTheme: '', currentTopic: '', index: 0 } };
    enterPuzzleMode();
    nextThemedPuzzle();
  }
  function nextThemedPuzzle() {
    if (!pz || pz.kind !== 'themed') return;
    const session = pz.themeSession;
    const candidatesFor = (key) => trainingTopicPuzzles(key).filter((p) => p.line && p.line.length);
    let availableTopics = session.themes.filter((key) => candidatesFor(key).some((p) => !session.used.includes(p.id)));
    if (!availableTopics.length) { session.used = []; availableTopics = session.themes.filter((key) => candidatesFor(key).length); }
    const nextTopics = availableTopics.length > 1 ? availableTopics.filter((key) => key !== session.lastTheme) : availableTopics;
    const topic = (nextTopics.length ? nextTopics : availableTopics)[Math.floor(Math.random() * (nextTopics.length || availableTopics.length))];
    const pool = candidatesFor(topic).filter((p) => !session.used.includes(p.id));
    const ratingOf = (p) => Math.max(1, Math.min(MAX_LEVEL, Number(p.rating) || Number(p.level) * 3 - 1 || 1));
    const distance = Math.min(...pool.map((p) => Math.abs(ratingOf(p) - session.rating)));
    const near = pool.filter((p) => Math.abs(ratingOf(p) - session.rating) <= distance + 0.35);
    const item = near[Math.floor(Math.random() * near.length)];
    session.lastTheme = topic;
    session.currentTopic = topic;
    session.used.push(item.id);
    session.index++;
    pz.item = item;
    loadItem(item);
  }
  const lessonOf = (k) => LESSONS.find((x) => x.theme === k);
  function card(k, row, rank, now) {
    const [cls, label] = themeStatus(row);
    const prefs = problemPreferences();
    const recent = row.recent.slice(-prefs.games).reduce((a, b) => a + b, 0);
    const width = Math.min(100, Math.round((row.score / 0.6) * 100));
    const color = cls === 'hot' ? 'var(--danger)' : cls === 'warm' ? 'var(--accent)' : '#6ebe82';
    const done = store.get('lessonsDone', {})[k];
    return `<button class="pz-card${now ? ' now' : ''}" data-theme="${k}"><span class="ico">${PZ[k].icon}</span>
      <span class="t">${rank ? `${rank}. ` : ''}${PZ[k].name}</span><span class="chip ${cls}">${label}</span>
      <span class="d">${row.recent.length ? L(`${recent} faute${recent > 1 ? 's' : ''} ${Math.min(row.recent.length, prefs.games) > 1 ? `sur tes ${Math.min(row.recent.length, prefs.games)} dernières parties` : 'dans ta dernière partie'} · `, `${recent} mistake${recent === 1 ? '' : 's'} ${Math.min(row.recent.length, prefs.games) > 1 ? `in your last ${Math.min(row.recent.length, prefs.games)} games` : 'in your last game'} · `) : ''}${L('Leçon', 'Lesson')} ${done ? '✓' : L('à faire', 'to do')} · ${L('Niveau', 'Level')} ${row.level} ${levelState(row)} ${trendOf(row)}</span>
      <span class="bar2"><i style="width:${Math.max(4, width)}%;background:${color}"></i></span></button>`;
  }
