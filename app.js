/* Cavalier — interface */
(function () {
  'use strict';
  const { Game, sqName, colorOf, positionKey } = window.Chess;
  const $ = (id) => document.getElementById(id);

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const glyph = (p) => GLYPH[p.toLowerCase()] + '︎';
  const pieceName = (p) => window.Characters.NAMES[colorOf(p)][p.toLowerCase()];
  const pieceImg = (p) => (window.Characters ? `<img src="${window.Characters.dataUrl(p)}" alt="${pieceName(p)}" title="${pieceName(p)}">` : glyph(p));
  // 8 paliers de 3 niveaux, sauf Champion (22 niveaux)
  const TIERS = L(['Débutant', 'Facile', 'Intermédiaire', 'Difficile', 'Expert', 'Maître', 'Grand maître', 'Champion'], ['Beginner', 'Easy', 'Intermediate', 'Hard', 'Expert', 'Master', 'Grandmaster', 'Champion']);
  const MAX_GAME_LEVEL = 22;
  const LEVEL_NAMES = {};
  for (let l = 1; l <= MAX_GAME_LEVEL; l++) LEVEL_NAMES[l] = l === MAX_GAME_LEVEL ? 'Champion' : `${TIERS[Math.floor((l - 1) / 3)]} ${((l - 1) % 3) + 1}`;
  // Elo de chaque niveau, repris de l'application d'origine (Débutant 1-2, Intermédiaire 2 et Grand maître 1/3 interpolés)
  const LEVEL_ELO = [0, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2500, 2600, 2700, 2725, 2750, 2775, 2800];
  const THEMES = {
    foret: { name: L('Forêt', 'Forest'), light: '#e8dcc0', dark: '#6f8f6a' },
    noyer: { name: L('Noyer', 'Walnut'), light: '#ecd8b8', dark: '#a0704b' },
    ardoise: { name: L('Ardoise', 'Slate'), light: '#dfe3e8', dark: '#6d7f95' },
    corail: { name: L('Corail', 'Coral'), light: '#f3e3d3', dark: '#c9775f' },
    // plateaux de la boutique de Sissa
    marbre: { name: L('Marbre', 'Marble'), light: '#f2f0eb', dark: '#8a8d93', price: 150 },
    glace: { name: L('Glace', 'Ice'), light: '#eef7fb', dark: '#7fb0c8', price: 250 },
    nuit: { name: L('Nuit', 'Night'), light: '#c9cfe0', dark: '#2f3a5c', price: 300 },
    emeraude: { name: L('Émeraude', 'Emerald'), light: '#e3f1e6', dark: '#2f7d55', price: 350 },
    rubis: { name: L('Rubis', 'Ruby'), light: '#f4dede', dark: '#9b2f3a', price: 350 },
    or: { name: L('Or', 'Gold'), light: '#f6e7b0', dark: '#b8892e', price: 500 },
  };
  const REASONS = {
    mat: L('Échec et mat', 'Checkmate'), pat: L('Pat', 'Stalemate'), materiel: L('Matériel insuffisant', 'Insufficient material'),
    '50coups': L('Règle des 50 coups', '50-move rule'), repetition: L('Triple répétition', 'Threefold repetition'), abandon: L('Abandon', 'Resignation'), import: L('Partie importée', 'Imported game'),
    temps: L('Temps écoulé', 'Time out'), deconnexion: L('Connexion perdue (nulle)', 'Connection lost (draw)'), accord: L('Nulle par accord', 'Draw by agreement'),
  };

  /* Stockage (peut être indisponible : navigation privée, etc.) */
  let storageUnavailable = false;
  const store = {
    get(key, fallback) {
      let v;
      try { v = localStorage.getItem('cavalier.' + key); } catch { storageUnavailable = true; return fallback; }
      if (!v) return fallback;
      try { return JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem('cavalier.' + key, JSON.stringify(value)); return true; } catch { storageUnavailable = true; return false; } },
    del(key) { try { localStorage.removeItem('cavalier.' + key); } catch { storageUnavailable = true; } },
  };
  const playerProfile = () => Object.assign({ name: '', nameAsked: false, rating: null, games: 0, puzzles: 0 }, store.get('player', {}));

  // Appareil modeste (peu de mémoire ou de cœurs) : 3D allégée par défaut
  const weakDevice = !!((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  const settings = Object.assign({ anim: 'full', boardView: 'both', theme: 'foret', colorTheme: 'dark', showMoves: true, coords: true, sound: true, autoQueen: false, voice: true, coachEnabled: true, lite: weakDevice }, store.get('settings', {}));
  const setup = Object.assign({ mode: 'ai', color: 'w', level: 1 }, store.get('setup', {}));
  // Ancien réglage sur 5 niveaux : on repart du niveau débloqué
  if (!store.get('unlocked', 0)) { store.del('stats'); store.set('unlocked', 1); setup.level = 1; }
  const unlocked = () => Math.max(1, Math.min(MAX_GAME_LEVEL, store.get('unlocked', 1)));
  if (setup.level > unlocked()) setup.level = unlocked();

  let game = null;
  let replay = null;       // { moves, sans, fen, index, title, back } pendant la visualisation d'une partie
  let replayTimer = null;
  let cfg = null;          // { mode, playerColor, level }
  let result = null;       // { result, reason }
  let flipped = false;
  let selected = -1;
  let hint = null;
  let thinking = false;
  let requestId = 0;
  let animateNext = false;
  let replayAnimationOverride = null;
  let b3d = null;
  let coachDockOpen = false;
  let coachMessage = '';
  let coachMood = '';
  let coachHintLevel = 0;
  let coachArrows = [];        // flèches du dernier coup commenté (partie coachée)
  let judging = false, judgeSeq = 0, judgeWorker = null;
  const TERRAIN_NAMES = L({ forest: 'Forêt', desert: 'Désert', prairie: 'Prairie verte', grass: 'Jardin tropical', steppe: 'Plaine sèche', mud: 'Forêt humide', rock: 'Récif rocheux', water: 'Lagon tropical', beach: 'Plage tropicale', dojo: 'Jardin du dojo' }, { forest: 'Forest', desert: 'Desert', prairie: 'Green meadow', grass: 'Tropical garden', steppe: 'Dry plain', mud: 'Rainforest', rock: 'Rocky reef', water: 'Tropical lagoon', beach: 'Tropical beach', dojo: 'Dojo garden' });
  const WEATHER_NAMES = L({ sun: 'Soleil', drizzle: 'Pluie fine', heavy: 'Grosse pluie', heavystorm: 'Grosse pluie orageuse', windstorm: 'Orage et grand vent', sunwind: 'Soleil et vent', snow: 'Neige fine', sunset: 'Coucher de soleil' },
    { sun: 'Sunny', drizzle: 'Light rain', heavy: 'Heavy rain', heavystorm: 'Heavy thunderstorm', windstorm: 'Windy thunderstorm', sunwind: 'Sunny and windy', snow: 'Light snow', sunset: 'Sunset' });
  // Le paysage et la météo suivent la collection nature et le grade dans tous les modes de jeu.
  function randomScenery() {
    currentTerrain = natureTerrainForGrade();
    currentWeather = natureWeatherForGrade();
    const rank = adventureGrade(levelOf(walletState().xp).level);
    $('game').dataset.natureTerrain = currentTerrain;
    $('puzzle').dataset.natureTerrain = currentTerrain;
    $('game').dataset.natureGrade = String(rank);
    $('puzzle').dataset.natureGrade = String(rank);
    if (b3d) { b3d.setTerrain(currentTerrain); b3d.setWeather(currentWeather); }
    return `${TERRAIN_NAMES[currentTerrain]} · ${WEATHER_NAMES[currentWeather]}`;
  }
  let currentTerrain = 'forest';
  let currentWeather = 'sun';

  /* ---------- Navigation ---------- */
  function show(id) {
    const stableScreen = id === 'puzzle' || id === 'theme' ? 'problems' : id;
    const desktopShell = window.matchMedia('(min-width: 1000px)').matches;
    const mobileShell = window.matchMedia('(max-width: 999px)').matches && id !== 'home';
    store.set('lastScreen', replay || id === 'replay-list' || id === 'replay-external' ? 'home' : stableScreen);
    if (id !== 'game') stopReplayPlay();
    document.body.dataset.screen = id;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id || ((desktopShell || mobileShell) && s.id === 'home')));
    document.body.classList.remove('mobile-menu-open');
    $('mobile-menu-backdrop').hidden = true;
    $('mobile-menu-toggle').setAttribute('aria-expanded', 'false');
    if (id !== 'home') {
      $('play-submenu').hidden = true;
      $('btn-play-menu').setAttribute('aria-expanded', 'false');
      $('progress-submenu').hidden = true;
      $('btn-progress-menu').setAttribute('aria-expanded', 'false');
      $('replay-submenu').hidden = true;
      $('btn-replay-menu').setAttribute('aria-expanded', 'false');
      $('train-submenu').hidden = true;
      $('btn-train-menu').setAttribute('aria-expanded', 'false');
    }
    if (id === 'home') refreshHome();
    if (id === 'welcome') { refreshHome(); renderWelcome(); }
    if (id === 'program') renderCoachProgram();
    if (id === 'stats') renderStats();
    if (id === 'problems') renderProblems();
    if (id === 'champions') renderChampions();
    updateCoachDockForScreen(id);
    // Le même échiquier est déplacé entre les écrans de jeu et d’apprentissage.
    // Redessine-le à chaque ouverture depuis l’état courant pour enlever tout
    // repère visuel résiduel (coups, flèches, cases marquées ou étoiles).
    if ((id === 'game' || id === 'puzzle') && game) renderBoard();
    if (id === 'editor') renderEdBoard();
    if (id === 'program' && settings.voice) speak(`${$('program-text').textContent} ${$('program-focus').textContent}`);
    if (desktopShell) document.getElementById(id)?.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }
  let returnTo = 'home';
  // retour : l'écran d'où l'on vient ; jamais l'écran affiché lui-même (sinon le bouton semble bloqué)
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => {
    const here = b.closest('.screen') ? b.closest('.screen').id : document.body.dataset.screen;
    show(returnTo && returnTo !== here ? returnTo : 'home');
  }));

  function refreshHome() {
    const saved = store.get('game', null);
    $('btn-continue').disabled = !(saved && !saved.result);
    const player = playerProfile();
    $('home-player-name').textContent = player.name || L('Joueur', 'Player');
    if ($('home-greeting-player')) $('home-greeting-player').textContent = player.name || L('champion', 'champion');
    if ($('home-greeting')) $('home-greeting').textContent = L('Bonjour', 'Hello');
    $('home-player-photo').hidden = !player.photo; if (player.photo) $('home-player-photo').src = player.photo;
    renderHomeRewards();
    $('home-player-elo').textContent = L(`Elo estimé : ${estimatedElo()}`, `Estimated Elo: ${estimatedElo()}`);
    const style = dominantStyle();
    $('home-player-style').hidden = !style;
    if (style) {
      $('home-player-style').textContent = L(`Style : ${style.label}`, `Style: ${style.label}`);
      $('home-player-style').title = L(`Style estimé sur ${style.games} de tes dernières parties contre l’ordinateur ou le maître.`, `Style estimated from ${style.games} of your latest games against the computer or the coach.`);
    }
    const oldStats = Object.values(store.get('stats', {}));
    const games = player.games || oldStats.reduce((sum, row) => sum + row.win + row.loss + row.draw, 0);
    const puzzles = player.puzzles || Object.keys(store.get('pzdone', {})).length;
    $('home-player-progress').textContent = games || puzzles
      ? L(`Estimation basée sur ${games} partie${games > 1 ? 's' : ''} et ${puzzles} problème${puzzles > 1 ? 's' : ''}.`, `Based on ${games} game${games === 1 ? '' : 's'} and ${puzzles} puzzle${puzzles === 1 ? '' : 's'}.`)
      : L('L’estimation s’affine avec les parties et les problèmes.', 'The estimate gets sharper with games and puzzles.');
    renderCoachProgram();
    renderCoachDock();
  }

  function coachPlan() {
    const profile = playerProfile(), c = loadCoach();
    const mistakes = store.get('mistakes', []), puzzleDone = store.get('pzdone', {});
    const phaseInfo = phaseDifficulty(mistakes);
    const now = Date.now();
    const dueReviews = mistakes.filter((item) => !item.solved && (item.reviewAt ?? ((item.last || 0) + 600000)) <= now).length;
    const rankedThemes = PZ_KEYS.map((key) => {
      const row = c.themes[key] || { errors: 0, score: 0, solved: 0, failed: 0, pending: false };
      const puzzlePressure = row.failed / Math.max(1, row.solved + row.failed);
      const risk = (row.score || 0) + puzzlePressure * 0.22 + (row.pending ? 0.08 : 0);
      return { key, row, risk, personalErrors: mistakes.filter((item) => item.theme === key && !item.solved).length };
    }).sort((a, b) => b.risk - a.risk || b.row.errors - a.row.errors);
    const priority = rankedThemes.find((item) => item.row.errors || item.row.failed || item.row.solved || item.personalErrors);
    const completedPuzzles = Object.keys(puzzleDone).length;
    if (!priority) return {
      badge: L('Départ', 'Start'), focus: L('Première étape', 'First step'),
      text: L(`Je vais construire ton programme à partir de tes parties et de tes problèmes.${phaseInfo ? ` Je remarque aussi des difficultés ${phaseInfo.phrase} (${phaseInfo.errors} erreurs dans ${phaseInfo.games} parties analysées).` : ''} Pour commencer, ${profile.name || 'joue'} une partie contre l’ordinateur ou lance les problèmes de base.`,
        `I will build your training plan from your games and puzzles.${phaseInfo ? ` I also notice most difficulties ${phaseInfo.phrase} (${phaseInfo.errors} mistakes across ${phaseInfo.games} analysed games).` : ''} To begin${profile.name ? `, ${profile.name},` : ','} play a game against the computer or start the basic puzzles.`),
      theme: null,
    };
    const row = priority.row, theme = PZ[priority.key];
    const puzzleText = row.failed ? L(` Tu as aussi eu besoin d’aide sur ${row.failed} problème${row.failed > 1 ? 's' : ''} de ce thème.`, ` You also needed help on ${row.failed} puzzle${row.failed === 1 ? '' : 's'} of this theme.`) : '';
    const personalText = priority.personalErrors ? L(` ${priority.personalErrors} erreur${priority.personalErrors > 1 ? 's' : ''} personnelle${priority.personalErrors > 1 ? 's' : ''} reste${priority.personalErrors > 1 ? 'nt' : ''} à retravailler.`, ` ${priority.personalErrors} of your own mistake${priority.personalErrors === 1 ? '' : 's'} still need${priority.personalErrors === 1 ? 's' : ''} work.`) : '';
    const reviewText = dueReviews ? L(` ${dueReviews} révision${dueReviews > 1 ? 's' : ''} ${dueReviews === 1 ? 'est prête' : 'sont prêtes'}.`, ` ${dueReviews} review${dueReviews === 1 ? ' is' : 's are'} ready.`) : '';
    return {
      badge: L(`${c.games} partie${c.games === 1 ? '' : 's'} analysée${c.games === 1 ? '' : 's'} · ${completedPuzzles} problème${completedPuzzles === 1 ? '' : 's'}${dueReviews ? ` · ${dueReviews} révision${dueReviews > 1 ? 's' : ''} due${dueReviews > 1 ? 's' : ''}` : ''}`,
        `${c.games} game${c.games === 1 ? '' : 's'} analysed · ${completedPuzzles} puzzle${completedPuzzles === 1 ? '' : 's'}${dueReviews ? ` · ${dueReviews} review${dueReviews === 1 ? '' : 's'} due` : ''}`),
      focus: `${L(`Priorité: ${theme.name} · ${row.errors} faute${row.errors > 1 ? 's' : ''}`, `Priority: ${theme.name} · ${row.errors} mistake${row.errors === 1 ? '' : 's'}`)}${phaseInfo ? ` · ${phaseInfo.label}` : ''}`,
      text: L(`${profile.name ? `${profile.name}, ` : ''}tes analyses montrent que ${theme.name.toLowerCase()} est le meilleur levier de progression.${phaseInfo ? ` Je remarque aussi des difficultés ${phaseInfo.phrase} (${phaseInfo.errors} erreurs dans ${phaseInfo.games} parties analysées).` : ''}${puzzleText}${personalText}${reviewText} Je te propose une courte leçon, puis des exercices ciblés.`,
        `${profile.name ? `${profile.name}, ` : ''}your analyses show that ${theme.name.toLowerCase()} is where you can improve the most.${phaseInfo ? ` I also notice most difficulties ${phaseInfo.phrase} (${phaseInfo.errors} mistakes across ${phaseInfo.games} analysed games).` : ''}${puzzleText}${personalText}${reviewText} I suggest a short lesson, then targeted exercises.`),
      theme: priority.key,
    };
  }

  function phaseDifficulty(mistakes = store.get('mistakes', [])) {
    const phases = { ouverture: { name: L('Ouverture', 'Opening'), phrase: L('pendant l’ouverture', 'during the opening'), moves: 0, errors: 0, games: new Set() }, milieu: { name: L('Milieu de jeu', 'Middlegame'), phrase: L('au milieu de jeu', 'during the middlegame'), moves: 0, errors: 0, games: new Set() }, finale: { name: L('Finale', 'Endgame'), phrase: L('en finale', 'during the endgame'), moves: 0, errors: 0, games: new Set() } };
    const games = store.get('archive', []).filter((g) => ['ai', 'coach'].includes(g.mode) && !g.fen && g.color && Array.isArray(g.moves) && g.moves.length >= 12 && g.analysed).slice(-20);
    if (!games.length) return null;
    const phaseAt = (board, full = 1) => {
      const values = { n: 320, b: 330, r: 500, q: 900 };
      const material = board.reduce((sum, piece) => sum + (piece ? values[piece.toLowerCase()] || 0 : 0), 0);
      return material <= 1700 ? 'finale' : full <= 12 ? 'ouverture' : 'milieu';
    };
    const gameIds = new Set(games.map((g) => g.id));
    const phaseFor = (mistake) => {
      if (phases[mistake.phase]) return mistake.phase;
      try {
        const state = new Game(mistake.fen).state;
        return phaseAt(state.board, state.full);
      } catch { return null; }
    };
    for (const g of games) {
      const G = new Game();
      for (const uci of g.moves) {
        const current = G.state;
        if (current.turn === g.color) {
          const phase = phaseAt(current.board, current.full);
          phases[phase].moves++;
        }
        if (!G.playUci(uci)) break;
      }
    }
    for (const mistake of mistakes) if (gameIds.has(mistake.date)) {
      const phase = phaseFor(mistake);
      if (phase) { phases[phase].errors++; phases[phase].games.add(mistake.date); }
    }
    const ranked = Object.entries(phases).filter(([, p]) => p.errors >= 2 && p.games.size >= 2 && p.moves > 0)
      .sort((a, b) => b[1].errors / b[1].moves - a[1].errors / a[1].moves || b[1].errors - a[1].errors);
    if (!ranked.length) return null;
    const [key, phase] = ranked[0];
    return { name: phase.name, phrase: phase.phrase, errors: phase.errors, games: phase.games.size, label: L(`Difficulté : ${phase.name.toLowerCase()}`, `Focus: ${phase.name.toLowerCase()}`) };
  }

  function renderCoachProgram() {
    const section = $('coach-program');
    if (!section) return;
    section.hidden = !settings.coachEnabled;
    const plan = coachPlan();
    $('coach-program-badge').textContent = plan.badge;
    $('coach-program-text').textContent = plan.text;
    $('coach-program-focus').textContent = plan.focus;
    $('btn-program').hidden = !settings.coachEnabled;
    $('program-badge').textContent = plan.badge;
    $('program-text').textContent = plan.text;
    $('program-focus').textContent = plan.focus;
    $('program-progress').innerHTML = coachProgressSummary();
    const prefs = problemPreferences();
    $('program-prefs').textContent = L(`⚙ Exercices choisis d’après tes ${prefs.games} dernières parties (erreurs présentes dans plus de ${prefs.threshold} % d’entre elles) · Modifier`, `⚙ Exercises based on your last ${prefs.games} games (mistakes found in more than ${prefs.threshold}% of them) · Change`);
  }
  // Réglages du programme : nombre de parties analysées et seuil de récurrence (panneau de l'écran Problèmes)
  function openProgramSettings() {
    returnTo = 'program';
    problemsSection = 'program'; problemSettingsOpen = true;
    show('problems');
    setTimeout(() => {
      const panel = $('problems-body').querySelector('.pz-settings');
      if (!panel) return;
      window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 12), behavior: 'smooth' });
      const i = panel.querySelector('input'); if (i) i.focus({ preventScroll: true });
    }, 60);
  }
  $('btn-program-settings').onclick = openProgramSettings;
  $('program-prefs').onclick = openProgramSettings;

  function coachProgressSummary() {
    const c = loadCoach();
    const completed = LESSONS.filter((lesson) => store.get('lessonsDone', {})[lesson.theme]).length;
    const recentRows = PZ_KEYS.map((key) => c.themes[key] && Array.isArray(c.themes[key].recent) ? c.themes[key].recent : []);
    const n = c.games >= 2 && recentRows.length ? Math.min(5, Math.floor(c.games / 2), ...recentRows.map((row) => row.length)) : 0;
    let trend = L('Joue et fais analyser quelques parties : je pourrai ensuite comparer tes progrès.', 'Play a few games and have them analysed so I can track your progress.');
    if (n > 0) {
      const older = recentRows.reduce((sum, row) => sum + row.slice(-2 * n, -n).reduce((a, b) => a + b, 0), 0) / n;
      const latest = recentRows.reduce((sum, row) => sum + row.slice(-n).reduce((a, b) => a + b, 0), 0) / n;
      const delta = Math.abs(older - latest);
      trend = delta < 0.05
        ? L(`Sur tes ${n} dernières parties analysées, le nombre de fautes par partie reste stable.`, `Across your last ${n} analysed games, mistakes per game are steady.`)
        : latest < older
          ? L(`Bravo, tu progresses : environ ${NUM(delta)} faute${delta >= 1.5 ? 's' : ''} de moins par partie sur tes ${n} dernières parties analysées.`, `You’re improving: about ${NUM(delta)} fewer mistake${delta >= 1.5 ? 's' : ''} per game across your last ${n} analysed games.`)
          : L(`Point à travailler : environ ${NUM(delta)} faute${delta >= 1.5 ? 's' : ''} de plus par partie sur tes ${n} dernières parties analysées.`, `Focus area: about ${NUM(delta)} more mistake${delta >= 1.5 ? 's' : ''} per game across your last ${n} analysed games.`);
    }
    return `<p>${trend}</p><p class="pz-cap">${L(`Leçons terminées : ${completed}/${LESSONS.length}.`, `Lessons completed: ${completed}/${LESSONS.length}.`)}</p>`;
  }

  function renderCoachDock() {
    const dock = $('coach-dock');
    if (!dock) return;
    dock.hidden = !settings.coachEnabled;
    $('coach-dock-panel').hidden = !coachDockOpen;
    $('coach-dock-message').textContent = coachMessage || coachPlan().text;
    const champ = activeChampion();
    $('coach-dock-name').textContent = coachName();
    showCoachFace($('coach-dock-img'));
    const role = champ ? champ.reign : L('Coach d’échecs', 'Chess coach');
    $('coach-dock-status').textContent = coachMood || (settings.voice ? `${role} · ${L('voix active', 'voice on')}` : role);
    $('coach-dock-voice').textContent = settings.voice ? '🔊' : '🔇';
    $('coach-dock-voice').setAttribute('aria-label', settings.voice ? L('Couper la voix', 'Mute the voice') : L('Activer la voix', 'Turn the voice on'));
  }

  function updateCoachDockForScreen(id) {
    if (id === 'home') coachMessage = coachPlan().text;
    else if (id === 'program') coachMessage = coachPlan().text;
    else if (id === 'game' && cfg && cfg.mode === 'coach') coachMessage = game && game.turn === cfg.playerColor ? L('À toi de jouer. Cherche les coups forcés et demande-toi ce que mon dernier coup a changé.', 'Your move. Look for forcing moves and ask yourself what my last move changed.') : L('Observe la position; je prépare ma réponse.', 'Study the position; I am preparing my reply.');
    else if (id === 'problems' || id === 'theme') coachMessage = coachPlan().text;
    else if (id === 'champions') coachMessage = L('Choisis un champion du monde : je te présente ses idées, tu les appliques sur des problèmes à ton niveau, puis dans une partie où je te les rappelle au bon moment.', 'Pick a world champion: I present their ideas, you apply them on puzzles at your level, then in a game where I remind you of them at the right moment.');
    else if (id === 'settings') coachMessage = L('Tu peux garder ma présence discrète, couper ma voix ou me désactiver complètement ici.', 'Here you can keep me discreet, mute my voice or turn me off completely.');
    renderCoachDock();
  }

  function refreshCoachProgram() {
    renderCoachProgram();
    const active = document.body.dataset.screen || document.querySelector('.screen.active')?.id;
    if (active === 'home' || active === 'problems') {
      coachMessage = coachPlan().text;
      renderCoachDock();
    }
  }

  function coachGreeting(text) {
    const name = String(playerProfile().name || '').trim();
    if (!name) return text;
    if (/^Bonjour,\s*/.test(text)) return text.replace(/^Bonjour,\s*/, `Bonjour ${name}, `);
    if (/^Hello,\s*/.test(text)) return text.replace(/^Hello,\s*/, `Hello ${name}, `);
    return text;
  }

  function setCoachMessage(text, mood = '', vocalize = false) {
    coachMessage = coachGreeting(text);
    coachMood = mood;
    // Sans bouton flottant, le panneau s'ouvre quand le coach commente la partie
    if (cfg && cfg.mode === 'coach' && game && !replay && !pz) coachDockOpen = true;
    renderCoachDock();
    if (vocalize) speak(coachMessage);
  }

  // Photo de profil : réduite à 160 px (JPEG) pour rester légère, gardée sur l'appareil et dans le compte
  function pickPhoto(done) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0]; if (!file) return;
      const img = new Image();
      img.onload = () => {
        const size = 160, c = document.createElement('canvas'); c.width = c.height = size;
        const k = Math.max(size / img.width, size / img.height), w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(img.src);
        const data = c.toDataURL('image/jpeg', 0.82);
        const p = playerProfile(); p.photo = data; store.set('player', p); refreshHome();
        if (ON && ON.user) ON.setPhoto(data).catch(() => {});
        if (done) done(data);
      };
      img.onerror = () => toast(L('Cette image ne peut pas être lue.', 'This image cannot be read.'));
      img.src = URL.createObjectURL(file);
    };
    input.click();
  }
  function promptPlayerName() {
    if (document.body.classList.contains('admin-mode')) return;
    const player = playerProfile();
    const body = document.createElement('div');
    const photoRow = document.createElement('div'); photoRow.className = 'photo-row';
    photoRow.innerHTML = `<img class="profile-photo big" alt="" ${player.photo ? `src="${player.photo}"` : 'hidden'}><button type="button" class="btn">${player.photo ? L('Changer ma photo', 'Change my photo') : L('Ajouter ma photo', 'Add my photo')}</button>`;
    photoRow.querySelector('button').onclick = () => pickPhoto((data) => { const im = photoRow.querySelector('img'); im.src = data; im.hidden = false; });
    body.appendChild(photoRow);
    const label = document.createElement('label');
    label.className = 'field-label'; label.htmlFor = 'player-name-input'; label.textContent = L('Comment l’entraîneur doit-il t’appeler ?', 'What should the coach call you?');
    const input = document.createElement('input');
    input.id = 'player-name-input'; input.className = 'profile-name-input'; input.type = 'text';
    input.maxLength = 24; input.autocomplete = 'nickname'; input.placeholder = L('Ton prénom ou pseudo', 'Your first name or nickname'); input.value = player.name || '';
    body.append(label, input);
    modal({ title: L('Faisons connaissance', 'Let’s get acquainted'), text: L('Ton Elo estimé évoluera au fil de tes parties et de tes problèmes.', 'Your estimated Elo will evolve with your games and puzzles.'), body, actions: [
      { label: L('Enregistrer', 'Save'), primary: true, onClick: () => {
        const current = playerProfile(); current.name = input.value.trim().slice(0, 24) || L('Joueur', 'Player'); current.nameAsked = true;
        store.set('player', current); refreshHome();
      } },
      { label: L('Plus tard', 'Later'), ghost: true, onClick: () => { const current = playerProfile(); current.nameAsked = true; store.set('player', current); } },
    ] });
    input.focus();
  }

  /* ---------- Sons (synthétisés) ---------- */
  let audio = null;
  function tone(freqs, dur = 0.09, type = 'triangle', gain = 0.18) {
    if (!settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      freqs.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = f;
        const st = t0 + i * dur * 0.9;
        g.gain.setValueAtTime(gain, st);
        g.gain.exponentialRampToValueAtTime(0.001, st + dur);
        o.connect(g).connect(audio.destination);
        o.start(st); o.stop(st + dur + 0.02);
      });
    } catch { /* pas d'audio */ }
  }
  const sounds = {
    move: () => tone([330], 0.07, 'sine', 0.25),
    capture: () => tone([220, 165], 0.07, 'square', 0.08),
    check: () => tone([660, 880], 0.08, 'triangle', 0.15),
    win: () => tone([523, 659, 784, 1046], 0.13),
    lose: () => tone([392, 330, 262], 0.16),
    draw: () => tone([440, 440], 0.12),
  };

  /* ---------- Toast & modale ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }
  function modal({ title, text = '', body = null, actions = [] }) {
    $('modal').querySelector('.sheet').classList.remove('light-sheet');
    $('modal-title').textContent = title;
    $('modal-text').textContent = text;
    $('modal-text').hidden = !text;
    const b = $('modal-body'); b.innerHTML = ''; if (body) b.appendChild(body);
    const a = $('modal-actions'); a.innerHTML = '';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (act.primary ? 'primary' : act.ghost ? 'ghost' : '');
      btn.textContent = act.label;
      btn.onclick = () => { closeModal(); act.onClick && act.onClick(); };
      a.appendChild(btn);
    }
    $('modal').hidden = false;
  }
  const closeModal = () => ($('modal').hidden = true);

  /* ---------- Réglages ---------- */
  function applyTheme() {
    const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
    const lightTheme = settings.colorTheme === 'light';
    document.documentElement.dataset.colorTheme = lightTheme ? 'light' : 'dark';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = lightTheme ? '#f3f5ef' : '#13201b';
    document.documentElement.style.setProperty('--light', th.light);
    document.documentElement.style.setProperty('--dark', th.dark);
  }
  function renderSettings() {
    const wrap = $('themes'); wrap.innerHTML = '';
    for (const [key, th] of Object.entries(THEMES)) {
      const b = document.createElement('button');
      b.className = 'theme' + (settings.theme === key ? ' on' : '');
      b.setAttribute('aria-label', th.name);
      const have = owns(`theme:${key}`);
      b.innerHTML = `<i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i><span class="theme-name">${th.name}${have ? '' : ` 🔒 ${riceAmount(th.price, true)}`}</span>`;
      b.onclick = () => { if (!have) { openShop(); return; } settings.theme = key; saveSettings(); renderSettings(); };
      wrap.appendChild(b);
    }
    $('opt-moves').checked = settings.showMoves;
    $('opt-coords').checked = settings.coords;
    $('opt-sound').checked = settings.sound;
    $('opt-autoq').checked = settings.autoQueen;
    $('opt-voice').checked = settings.voice;
    $('opt-coach').checked = settings.coachEnabled;
    $('opt-lite').checked = settings.lite;
    $('opt-notify').checked = !!settings.notify && 'Notification' in window && Notification.permission === 'granted';
    for (const b of $('opt-anim').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.anim === (settings.anim || 'full')));
    $('opt-light-theme').checked = settings.colorTheme === 'light';
    $('opt-black-theme').value = settings.blackTheme || '';
    renderSyncStatus();
  }
  function renderSyncStatus(state) {
    const el = $('sync-status');
    if (!el) return;
    if (storageUnavailable) {
      el.className = 'sync-status error';
      el.textContent = L('⚠ Le stockage de cet appareil est indisponible. Exporte ta progression pour la conserver.', '⚠ This device storage is unavailable. Export your progress to keep it safe.');
      return;
    }
    const online = !!(ON && ON.user && store.get('onlineSynced', null) === ON.user.uid);
    const key = state || (!online ? 'local' : !navigator.onLine ? 'offline' : progressDirty ? 'pending' : 'synced');
    const labels = {
      local: L('Progression enregistrée sur cet appareil. Exporte-la dans Réglages pour en garder une copie.', 'Progress saved on this device. Export it in Settings to keep a backup.'),
      offline: L('Hors connexion : la progression reste en attente sur cet appareil.', 'Offline: progress is waiting on this device.'),
      pending: L('Synchronisation de la progression en cours…', 'Syncing your progress…'),
      synced: L('Progression synchronisée avec ton compte.', 'Progress synced with your account.'),
      error: L('Synchronisation impossible pour le moment. Ta progression reste sur cet appareil et sera réessayée.', 'Sync is unavailable right now. Your progress stays on this device and will be retried.'),
    };
    el.className = `sync-status ${key}`;
    el.textContent = labels[key] || labels.local;
  }
  function saveSettings() { store.set('settings', settings); applyTheme(); if (b3d) b3d.setLite(settings.lite); if (game) renderBoard(); voiceButton(); renderCoachProgram(); renderCoachDock(); if (!settings.voice) hush(); }
  [['opt-moves', 'showMoves'], ['opt-coords', 'coords'], ['opt-sound', 'sound'], ['opt-autoq', 'autoQueen'], ['opt-voice', 'voice'], ['opt-coach', 'coachEnabled'], ['opt-lite', 'lite']].forEach(([id, key]) => {
    $(id).addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); });
  });
  $('opt-light-theme').addEventListener('change', (e) => { settings.colorTheme = e.target.checked ? 'light' : 'dark'; saveSettings(); });
  // Notifications : il faut l'accord du navigateur
  $('opt-notify').addEventListener('change', async (e) => {
    if (!e.target.checked) { settings.notify = false; saveSettings(); return; }
    if (!('Notification' in window)) { e.target.checked = false; toast(L('Les notifications ne sont pas disponibles sur cet appareil.', 'Notifications are not available on this device.')); return; }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission().catch(() => 'denied');
    settings.notify = perm === 'granted'; e.target.checked = settings.notify; saveSettings();
    if (!settings.notify) toast(L('Notifications refusées : tu peux les autoriser dans les réglages du navigateur.', 'Notifications blocked: you can allow them in your browser settings.'));
  });
  // Durée des animations : complètes, courtes (deux fois plus rapides) ou aucune (les pièces se posent directement)
  $('opt-anim').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-anim]'); if (!b) return;
    settings.anim = b.dataset.anim; applyAnimSpeed(); saveSettings();
    for (const x of $('opt-anim').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  });
  // Mélange de thèmes : les Noirs peuvent avoir les pièces d'un autre thème que celui de la collection
  $('opt-black-theme').addEventListener('change', (e) => { settings.blackTheme = e.target.value; saveSettings(); applyBlackTheme(); });
  function applyBlackTheme() {
    const t = settings.blackTheme || null;
    if ((window.PieceThemeBlack || null) === t) return;
    window.PieceThemeBlack = t;
    if (b3d && b3d.rebuildPieces) { b3d.rebuildPieces(); if (game) render(); }
  }
  function applyAnimSpeed() {
    if (!b3d) return;
    if (b3d.baseSpeed == null) b3d.baseSpeed = b3d.speed;
    const speed = b3d.baseSpeed * (settings.anim === 'short' ? 2.2 : 1);
    if (speed !== b3d.speed) { b3d.skipAnimations(); b3d.speed = speed; }
  }

  $('coach-dock-close').onclick = () => { coachDockOpen = false; renderCoachDock(); };
  $('coach-dock-voice').onclick = () => {
    settings.voice = !settings.voice; saveSettings();
    if (settings.voice) speak(coachMessage || coachPlan().text); else hush();
  };

  /* ---------- Export / import de la progression ---------- */
  // Fichier JSON ouvert : toutes les données « cavalier.* » + les parties en PGN standard (lisible par d'autres apps d'échecs)
  function gamesAsPgn() {
    const out = [];
    for (const g of store.get('archive', [])) {
      const G = new window.Chess.Game(g.fen || undefined); const san = [];
      for (const u of g.moves) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
      const st = G.status(), res = g.result && g.result !== '*' ? g.result : st.over ? st.result : '*';
      const d = new Date(g.id), me = L('Joueur', 'Player'), ai = `${L('Ordinateur', 'Computer')} ${LEVEL_NAMES[g.level] || ''} (Elo ${LEVEL_ELO[g.level] || '?'})`;
      const tags = { Event: L('Partie Ata Wawé', 'Ata Wawé game'), Site: 'Ata Wawé', Date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
        White: g.color === 'w' ? me : ai, Black: g.color === 'w' ? ai : me, Result: res,
        [g.color === 'w' ? 'BlackElo' : 'WhiteElo']: String(LEVEL_ELO[g.level] || '') };
      let body = '';
      san.forEach((m, i) => { body += (i % 2 ? '' : `${i / 2 + 1}. `) + m + ' '; });
      out.push(Object.entries(tags).map(([k, v]) => `[${k} "${v}"]`).join('\n') + '\n\n' + (body + res).replace(/(.{1,78})(\s|$)/g, '$1\n').trim());
    }
    return out.join('\n\n') + '\n';
  }
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cavalier.')) { try { data[k.slice(9)] = JSON.parse(localStorage.getItem(k)); } catch { /* ignoré */ } }
    }
    return { format: 'cavalier-progression', version: 1, exportedAt: new Date().toISOString(),
      summary: { unlockedLevel: unlocked(), unlockedLevelName: LEVEL_NAMES[unlocked()], unlockedElo: LEVEL_ELO[unlocked()], gamesArchived: (data.archive || []).length },
      levels: Array.from({ length: MAX_GAME_LEVEL }, (_, i) => ({ level: i + 1, name: LEVEL_NAMES[i + 1], elo: LEVEL_ELO[i + 1] })),
      pgn: gamesAsPgn(), data };
  }
  async function saveFile(filename, text) {
    // Dans claude.ai : téléchargement confirmé par la plateforme ; ailleurs (appli installée) : lien de téléchargement classique
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch { dl = null; }
    if (dl) {
      try { await dl.save({ filename: filename.replace(/\.pgn$/, '.pgn.txt'), data: text }); toast(L('Fichier enregistré', 'File saved')); }
      catch (e) { if (e && e.code !== 'declined') toast(L("Le fichier n'a pas pu être enregistré ici.", 'The file could not be saved here.')); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : filename.endsWith('.txt') ? 'text/plain' : 'application/x-chess-pgn' }));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('btn-export').onclick = () => saveFile(`cavalier-progression-${stamp()}.json`, JSON.stringify(exportData(), null, 2));
  $('btn-export-pgn').onclick = () => {
    if (!store.get('archive', []).length) return toast(L('Aucune partie enregistrée pour le moment.', 'No saved games yet.'));
    saveFile(`cavalier-parties-${stamp()}.pgn`, gamesAsPgn());
  };
  function loadPgn(text) {
    const parsed = window.Pgn.parse(text);
    if (!parsed.games.length) return toast(L(`Le fichier PGN est invalide${parsed.error ? ` : ${parsed.error}` : '.'}`, `The PGN file is invalid${parsed.error ? `: ${parsed.error}` : '.'}`));
    const select = document.createElement('select');
    select.className = 'profile-name-input';
    select.setAttribute('aria-label', L('Partie à charger', 'Game to load'));
    parsed.games.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${index + 1}. ${entry.tags.Event || L('Partie', 'Game')} · ${entry.tags.White || L('Blancs', 'White')} - ${entry.tags.Black || L('Noirs', 'Black')}`;
      select.appendChild(option);
    });
    const body = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'field-label'; label.htmlFor = 'pgn-game-select'; label.textContent = L('Partie', 'Game');
    select.id = 'pgn-game-select'; body.append(label, select);
    modal({ title: L('Charger une partie', 'Load a game'), text: L(`${parsed.games.length} partie${parsed.games.length > 1 ? 's' : ''} trouvée${parsed.games.length > 1 ? 's' : ''}. La partie en cours sera remplacée.`, `${parsed.games.length} game${parsed.games.length === 1 ? '' : 's'} found. The current game will be replaced.`), body, actions: [
      { label: L('Charger', 'Load'), primary: true, onClick: () => {
        const entry = parsed.games[Number(select.value)];
        const finalResult = entry.result !== '*' ? entry.result : entry.status.over ? entry.status.result : null;
        const importedResult = finalResult ? { result: finalResult, reason: entry.result !== '*' ? 'import' : entry.status.reason } : null;
        startGame({ mode: 'local', playerColor: 'w', level: 1 }, entry.moves, importedResult);
      } },
      { label: L('Annuler', 'Cancel'), ghost: true },
    ] });
  }
  $('btn-import').onclick = () => $('import-file').click();
  const IMPORT_SHAPES = {
    player: 'object', settings: 'object', setup: 'object', unlocked: 'number', miniSize: 'number', stats: 'object', game: 'object',
    pzdone: 'object', archive: 'array', coach: 'object', mistakes: 'array', captureNotes: 'array',
    tipsSeen: 'array', tipsDone: 'object', lessonsDone: 'object', localArchive: 'array', external: 'array', reviews: 'array',
  };
  const validImportData = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const entries = Object.entries(data);
    if (!entries.length) return false;
    return entries.every(([key, value]) => {
      const shape = IMPORT_SHAPES[key];
      if (!shape) return false;
      if (shape === 'array') return Array.isArray(value);
      if (shape === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
      return Number.isFinite(value) && (key === 'miniSize' ? value >= 32 && value <= 512 : Number.isInteger(value) && value >= 1 && value <= MAX_GAME_LEVEL);
    });
  };
  $('import-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const text = await f.text();
    if (/\.pgn(?:\.txt)?$/i.test(f.name) || /^\s*\[Event\s+/m.test(text)) return loadPgn(text);
    let j = null;
    try { j = JSON.parse(text); } catch { /* pas du JSON */ }
    if (!j || j.format !== 'cavalier-progression' || !validImportData(j.data)) return toast(L("Ce fichier n'est pas une progression Ata Wawé valide.", 'This file is not a valid Ata Wawé progress file.'));
    modal({
      title: L('Importer la progression ?', 'Import this progress?'),
      text: L(`Niveau débloqué : ${(j.summary && j.summary.unlockedLevelName) || '?'} · ${(j.data.archive || []).length} parties.\nTa progression actuelle sur cet appareil sera remplacée.`, `Unlocked level: ${(j.summary && j.summary.unlockedLevelName) || '?'} · ${(j.data.archive || []).length} games.\nYour current progress on this device will be replaced.`),
      actions: [
        { label: L('Importer', 'Import'), primary: true, onClick: () => {
          for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('cavalier.')) localStorage.removeItem(k); }
          for (const [k, v] of Object.entries(j.data)) if (/^[a-zA-Z0-9_.-]{1,40}$/.test(k)) store.set(k, v);
          location.reload();
        } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ],
    });
  };

  /* ---------- Écran de configuration ---------- */
  function renderSetup() {
    document.querySelectorAll('.segmented').forEach((seg) => {
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.value === setup[seg.dataset.name]));
    });
    $('ai-options').hidden = setup.mode === 'local';
    $('level-name').textContent = `${LEVEL_NAMES[setup.level]} (Elo ${LEVEL_ELO[setup.level]})`;
    $('level-grid').innerHTML = levelGridHtml(setup.level);
  }
  function levelGridHtml(current) {
    const top = unlocked(), wins = store.get('stats', {});
    let html = '';
    TIERS.forEach((t, i) => {
      const lv = i === 7 ? [22] : [i * 3 + 1, i * 3 + 2, i * 3 + 3];
      html += `<div class="level-row${lv.length === 1 ? ' single' : ''}"><span class="tier">${t}</span>` + lv.map((l) =>
        `<button data-level="${l}" role="radio" aria-checked="${l === current}" class="${l === current ? 'on' : ''}${wins[l] && wins[l].win ? ' done' : ''}" ${l > top ? 'disabled' : ''} aria-label="${LEVEL_NAMES[l]}, Elo ${LEVEL_ELO[l]}${l > top ? L(' (verrouillé)', ' (locked)') : ''}" title="Elo ${LEVEL_ELO[l]}">${lv.length === 1 ? 'Champion' : (l - 1) % 3 + 1}<small>${LEVEL_ELO[l]}</small></button>`).join('') + '</div>';
    });
    return html;
  }
  document.querySelectorAll('.segmented').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      setup[seg.dataset.name] = b.dataset.value; renderSetup();
    });
  });
  $('level-grid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-level]'); if (!b || b.disabled) return;
    setup.level = +b.dataset.level; store.set('setup', setup); renderSetup();
  });

  /* ---------- Partie ---------- */
  function startGame(conf, uciMoves = [], res = null, flip, terrainId, weatherId) {
    if (document.body.classList.contains('admin-mode')) { toast(L('Le compte administrateur ne peut pas jouer.', 'The administrator account cannot play.')); show('admin'); return; }
    $('chat').hidden = true; $('online-switch').hidden = true;
    pendingMove = null;
    cancelAi();
    if (conf.mode !== 'online' && typeof stopOnline === 'function') stopOnline();
    replay = null; setReplayUi(false);
    pz = null; marks = null;
    attachBoard('game');
    game = new Game(conf.fen || undefined);
    const entryLastMove = uciMoves.length ? uciMoves[uciMoves.length - 1] : null;
    let entryPrefixValid = true;
    const entryPrefix = entryLastMove ? uciMoves.slice(0, -1) : uciMoves;
    for (const u of entryPrefix) if (!game.playUci(u)) { entryPrefixValid = false; break; }
    cfg = conf;
    if (cfg.mode === 'coach') cfg.coachTheme = coachPlan().theme;
    result = res;
    $('terrain-name').textContent = randomScenery(terrainId, weatherId);
    flipped = flip !== undefined ? flip : conf.mode !== 'local' && conf.playerColor === 'b';
    selected = -1; hint = null; animateNext = false;
    const drillOf = conf.drill && window.TRAINER && window.TRAINER.ENDGAMES.find((x) => x.id === conf.drill);
    $('game-title').textContent = conf.mode === 'online' ? (conf.online.tournament ? `${conf.online.tournament} · ${L('ronde', 'round')} ${conf.online.round}` : `${L('En ligne', 'Online')} · ${TC_LABELS[conf.online.tc] || ''}`) : (drillOf ? `${drillOf.name} · ` : conf.fen ? L('Position libre · ', 'Custom position · ') : '') + (conf.mode === 'local' ? L('Deux joueurs', 'Two players') : conf.mode === 'coach' ? `${conf.champion && champById(conf.champion) ? L(`Face à ${champShort(champById(conf.champion))}`, `Against ${champShort(champById(conf.champion))}`) : L('Partie coachée', 'Coached game')} · ${LEVEL_NAMES[conf.level]}` : `${LEVEL_NAMES[conf.level]} (Elo ${LEVEL_ELO[conf.level]})`);
    show('game');
    if (entryLastMove && entryPrefixValid) {
      if (b3d) {
        const s = game.state;
        const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
        b3d.update({ board: s.board, selected: -1, targets: [], last: game.lastMove(), check: game.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1, mateFire: [], mateUltimate: null, hint: null, flipped, showMoves: settings.showMoves, coords: settings.coords, light: th.light, dark: th.dark, animate: false, outcome: null, arrows: [], ply: game.history.length });
      }
      if (game.playUci(entryLastMove)) animateNext = true;
    }
    if (conf.mode === 'coach') {
      coachDockOpen = false;
      coachHintLevel = 0;
      const focus = cfg.coachTheme ? L(` Objectif du jour: ${PZ[cfg.coachTheme].name.toLowerCase()}.`, ` Today's goal: ${PZ[cfg.coachTheme].name.toLowerCase()}.`) : '';
      const champ = conf.champion && champById(conf.champion);
      setCoachMessage(champ ? L(`Je suis ${champ.name}, et c'est moi ton adversaire. Je te rappellerai mes principes quand la situation se présentera.`, `I am ${champ.name}, and I am your opponent. I will remind you of my principles when the situation arises.`) : L(`Nous allons jouer une partie à ton niveau. Je commenterai les idées et te laisserai chercher les coups.${focus}`, `We are going to play a game at your level. I will comment on the ideas and let you find the moves.${focus}`), 'happy');
    }
    render();
    save();
    if (conf.mode === 'online') {
      toast(L(`Tu joues les ${conf.playerColor === 'w' ? 'Blancs' : 'Noirs'}`, `You play ${conf.playerColor === 'w' ? 'White' : 'Black'}`));
    } else if (conf.mode !== 'local' && !uciMoves.length && conf.fen) {
      toast(L(`Tu joues les ${conf.playerColor === 'w' ? 'Blancs' : 'Noirs'}`, `You play ${conf.playerColor === 'w' ? 'White' : 'Black'}`));
    } else if (conf.mode !== 'local' && !uciMoves.length) {
      const side = conf.playerColor === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      toast(L(`Tirage au sort : tu joues les ${side}`, `Random draw: you play ${side}`));
      const champ = conf.mode === 'coach' && conf.champion && champById(conf.champion);
      if (champ) setCoachMessage(L(`Tu joues les ${side}. Je suis ${champ.name} et je joue contre toi. Montre-moi ce que tu as retenu de mon cours. ${championTip()}`, `You play ${side}. I am ${champ.name} and I play against you. Show me what you learned in my course. ${championTip()}`).trim(), 'happy', true);
      else if (conf.mode === 'coach') setCoachMessage(L(`Tu joues les ${side}. Je serai ton adversaire et je t’aiderai à réfléchir sans te souffler les coups.`, `You play ${side}. I will be your opponent and help you think without giving away the moves.`), 'happy', true);
    }
    maybeAiMove();
  }

  function save() {
    if (!game || pz || replay || (cfg && cfg.mode === 'online')) return;
    store.set('game', { cfg, moves: game.uciList(), result, flipped, terrain: currentTerrain, weather: currentWeather });
  }

  const isHumanTurn = () => cfg.mode === 'local' || game.turn === cfg.playerColor;
  // Une animation 3D (déplacement, duel, technique de prise ou de mat) doit finir avant tout nouveau mouvement
  const animBusy = () => !!(b3d && b3d.busyLeftMs() > 0);
  const canInteract = (ignoreAnim = false) => (replay ? false : !ignoreAnim && animBusy() ? false : pz ? !!(pz.item && pz.item.line) && !pz.done && !pz.locked : !result && !thinking && !judging && !(cfg.mode === 'coach' && speechBusy()) && isHumanTurn());

  function render() { if (replay) { renderReplay(); return; } renderBoard(); renderPlayers(); renderMoves(); renderStatus(); renderActions(); }

  function displayToBoard(i) { return flipped ? 63 - i : i; }

  // Petit échiquier 2D en haut à droite : la position exacte, en icônes
  const MINI = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function renderMinimap(board, last, selectedSq = -1, targets = [], mateFire = [], arrows = [], hintMark = null, tutorialStars = []) {
    const el = $('minimap');
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = flipped ? 63 - i : i, p = board[sq];
      const name = sqName(sq), row = i >> 3, col = i & 7;
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      const lit = last && (last.from === sq || last.to === sq);
      const selected = selectedSq === sq;
      const hinted = hintMark && hintMark.from === sq && !!p;
      const target = targets.some((m) => m.to === sq);
      const capture = target && (!!p || targets.some((m) => m.to === sq && m.flag === 'ep'));
      const coords = `${row === 0 ? `<span class="mini-coord file top ${dark ? 'd' : 'l'}">${name[0]}</span>` : ''}${row === 7 ? `<span class="mini-coord file bottom ${dark ? 'd' : 'l'}">${name[0]}</span>` : ''}${col === 0 ? `<span class="mini-coord rank left ${dark ? 'd' : 'l'}">${name[1]}</span>` : ''}${col === 7 ? `<span class="mini-coord rank right ${dark ? 'd' : 'l'}">${name[1]}</span>` : ''}`;
      const star = tutorialStars.includes(sq);
      html += `<button type="button" class="${dark ? 'd' : 'l'}${lit ? ' last' : ''}${selected ? ' sel' : ''}${hinted ? ' hint-piece' : ''}${mateFire.includes(sq) ? ' mate-fire' : ''}${star ? ' tutorial-star' : ''}${target ? ` target${capture ? ' capture' : ''}` : ''}" data-sq="${sq}" aria-label="${name} ${star ? L('étoile à récupérer', 'star to collect') : p ? pieceName(p) : mateFire.includes(sq) ? L('case vide en feu', 'empty square on fire') : L('case vide', 'empty square')}"${selected ? ' aria-pressed="true"' : ''}>${p ? `<b class="${p === p.toUpperCase() ? 'w' : 'k'}">${MINI[p.toLowerCase()]}</b>` : ''}${star ? '<span class="mini-tutorial-star">★</span>' : ''}${coords}</button>`;
    }
    el.innerHTML = html + arrowsSvg(arrows);
  }
  function animateMinimapMove(last) {
    if (!last) return;
    const animatePiece = (fromSq, toSq, piece) => {
      const from = flipped ? 63 - fromSq : fromSq, to = flipped ? 63 - toSq : toSq;
      const token = document.createElement('b');
      token.className = `mini-move-replay-token ${colorOf(piece)}`;
      token.textContent = MINI[piece.toLowerCase()];
      token.style.left = `${(from & 7) * 12.5}%`;
      token.style.top = `${(from >> 3) * 12.5}%`;
      minimap.appendChild(token);
      token.animate([
        { transform: 'translate(0, 0)' },
        { transform: `translate(${((to & 7) - (from & 7)) * 100}%, ${((to >> 3) - (from >> 3)) * 100}%)` },
      ], { duration: 800, easing: 'cubic-bezier(.2,.75,.35,1)' }).onfinish = () => token.remove();
    };
    animatePiece(last.from, last.to, last.piece);
    if (last.flag === 'castle') {
      const kingside = last.to > last.from;
      animatePiece(last.from + (kingside ? 3 : -4), last.from + (kingside ? 1 : -1), last.piece === 'K' ? 'R' : 'r');
    }
  }
  // Flèches de replay et de coach en SVG (plateau 2D et mini-carte)
  const ARROW_COLORS = { green: '#2ecc40', red: '#e53935', blue: '#2f7bff', violet: '#a855f7' };
  function arrowsSvg(arrows) {
    if (!arrows.length) return '';
    const center = (sq) => [(flipped ? 7 - (sq & 7) : sq & 7) + 0.5, (flipped ? 7 - (sq >> 3) : sq >> 3) + 0.5];
    let body = '';
    for (const a of arrows) {
      const [x1, y1] = center(a.from), [x2, y2] = center(a.to);
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const ex = x2 - ux * 0.1, ey = y2 - uy * 0.1, bx = ex - ux * 0.38, by = ey - uy * 0.38;
      const color = ARROW_COLORS[a.color] || ARROW_COLORS.green;
      body += `<g fill="${color}" stroke="${color}" opacity="0.88"><line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke-width="0.14" stroke-linecap="round"/><polygon stroke="none" points="${ex},${ey} ${bx - uy * 0.2},${by + ux * 0.2} ${bx + uy * 0.2},${by - ux * 0.2}"/></g>`;
    }
    return `<svg class="arrows-svg" viewBox="0 0 8 8" aria-hidden="true">${body}</svg>`;
  }
  const minimap = $('minimap');
  let minimapResize = null, resizeCandidate = null, suppressMinimapClick = false, minimapTap = null;
  let minimapMove = null, moveCandidate = null;
  // Position et taille choisies par le joueur, gardées d'une partie à l'autre (position en fraction de la place libre)
  const minimapPrefs = Object.assign({ size: 0, fx: null, fy: null }, store.get('minimap', {}));
  function placeMinimap() {
    if (minimapPrefs.size) { minimap.style.setProperty('--minimap-size', `${minimapPrefs.size}px`); minimap.classList.add('user-sized'); }
    if (minimapPrefs.fx === null) return;
    const wrap = $('board-wrap').getBoundingClientRect();
    if (!wrap.width) return;
    const size = minimap.getBoundingClientRect().width || minimapPrefs.size || 150;
    const free = (n) => Math.max(0, n - size - 16);
    minimap.style.left = `${8 + minimapPrefs.fx * free(wrap.width)}px`;
    minimap.style.top = `${8 + minimapPrefs.fy * free(wrap.height)}px`;
    minimap.classList.add('user-placed');
  }
  // Mémorise la position actuelle (en px dans l'échiquier) sous forme de fractions
  function rememberMinimapPlace(left, top) {
    const wrap = $('board-wrap').getBoundingClientRect(), size = minimap.getBoundingClientRect().width;
    const frac = (v, n) => { const free = n - size - 16; return free > 0 ? Math.max(0, Math.min(1, (v - 8) / free)) : 0; };
    minimapPrefs.fx = frac(left, wrap.width); minimapPrefs.fy = frac(top, wrap.height);
    store.set('minimap', minimapPrefs);
  }
  window.addEventListener('resize', placeMinimap);
  minimap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rect = minimap.getBoundingClientRect(), wrap = $('board-wrap').getBoundingClientRect();
    const left = e.clientX - rect.left <= 12;
    const bottom = rect.bottom - e.clientY <= 12;
    // Ailleurs que sur les bords : un glissement déplace l'aperçu
    if (!left && !bottom) {
      moveCandidate = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left - wrap.left, top: rect.top - wrap.top };
      return;
    }
    // Attendre un vrai glissement avant de redimensionner : un simple appui
    // près du bord doit toujours pouvoir sélectionner ou jouer un coup.
    resizeCandidate = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, size: rect.width, left: rect.left - wrap.left, top: rect.top - wrap.top, edge: left && bottom ? 'corner' : left ? 'left' : 'bottom' };
  });
  // Suivi au niveau de la fenêtre : un glissement rapide peut quitter l'aperçu avant la capture du pointeur
  window.addEventListener('pointermove', (e) => {
    if (minimapResize && e.pointerId === minimapResize.pointerId) {
      applyMinimapResize(e, minimapResize);
      return;
    }
    if (minimapMove && e.pointerId === minimapMove.pointerId) {
      applyMinimapMove(e, minimapMove);
      return;
    }
    if (moveCandidate && e.pointerId === moveCandidate.pointerId && Math.hypot(e.clientX - moveCandidate.x, e.clientY - moveCandidate.y) >= 7) {
      minimapMove = moveCandidate;
      moveCandidate = null;
      minimapTap = null;
      try { minimap.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
      minimap.classList.add('dragging');
      e.preventDefault();
      applyMinimapMove(e, minimapMove);
      return;
    }
    if (!resizeCandidate || e.pointerId !== resizeCandidate.pointerId || Math.hypot(e.clientX - resizeCandidate.x, e.clientY - resizeCandidate.y) < 7) return;
    minimapResize = resizeCandidate;
    resizeCandidate = null;
    minimapTap = null;
    try { minimap.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    e.preventDefault();
    applyMinimapResize(e, minimapResize);
  });
  function applyMinimapMove(e, drag) {
    const wrap = $('board-wrap').getBoundingClientRect(), size = minimap.getBoundingClientRect().width;
    const left = Math.max(0, Math.min(wrap.width - size, drag.left + e.clientX - drag.x));
    const top = Math.max(0, Math.min(wrap.height - size, drag.top + e.clientY - drag.y));
    minimap.style.left = `${left}px`; minimap.style.top = `${top}px`;
    minimap.classList.add('user-placed');
    drag.last = { left, top };
    suppressMinimapClick = true;
  }
  function applyMinimapResize(e, drag) {
    const dx = drag.x - e.clientX, dy = e.clientY - drag.y;
    const delta = drag.edge === 'left' ? dx : drag.edge === 'bottom' ? dy : (Math.abs(dx) >= Math.abs(dy) ? dx : dy);
    const bounds = $('board-wrap').getBoundingClientRect();
    const size = Math.max(120, Math.min(420, bounds.width - 16, bounds.height - 16, drag.size + delta));
    minimap.style.setProperty('--minimap-size', `${size}px`);
    minimap.classList.add('user-sized');
    // Aperçu déplacé : il s'agrandit vers la gauche en gardant son bord droit, sans sortir de l'échiquier
    if (minimap.classList.contains('user-placed')) {
      const left = Math.max(0, Math.min(bounds.width - size, drag.left + drag.size - size));
      const top = Math.max(0, Math.min(bounds.height - size, drag.top));
      minimap.style.left = `${left}px`; minimap.style.top = `${top}px`;
      drag.last = { left, top };
    }
    drag.lastSize = size;
    suppressMinimapClick = true;
  }
  const endMinimapResize = (e) => {
    if (resizeCandidate && e.pointerId === resizeCandidate.pointerId) resizeCandidate = null;
    if (moveCandidate && e.pointerId === moveCandidate.pointerId) moveCandidate = null;
    if (minimapMove && e.pointerId === minimapMove.pointerId) {
      if (minimap.hasPointerCapture(e.pointerId)) minimap.releasePointerCapture(e.pointerId);
      if (e.type === 'pointercancel' || !minimap.contains(e.target)) suppressMinimapClick = false;
      minimap.classList.remove('dragging');
      if (minimapMove.last) rememberMinimapPlace(minimapMove.last.left, minimapMove.last.top);
      minimapMove = null;
      return;
    }
    if (!minimapResize || e.pointerId !== minimapResize.pointerId) return;
    if (minimap.hasPointerCapture(e.pointerId)) minimap.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel' || !minimap.contains(e.target)) suppressMinimapClick = false;
    if (minimapResize.lastSize) { minimapPrefs.size = minimapResize.lastSize; store.set('minimap', minimapPrefs); }
    if (minimapResize.last) rememberMinimapPlace(minimapResize.last.left, minimapResize.last.top);
    minimapResize = null;
  };
  window.addEventListener('pointerup', endMinimapResize);
  window.addEventListener('pointercancel', endMinimapResize);
  minimap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest('button[data-sq]');
    minimapTap = cell ? { pointerId: e.pointerId, sq: Number(cell.dataset.sq) } : null;
  });
  minimap.addEventListener('pointerup', (e) => {
    if (suppressMinimapClick) { suppressMinimapClick = false; minimapTap = null; return; }
    const tap = minimapTap;
    minimapTap = null;
    if (!tap || e.pointerId !== tap.pointerId) return;
    const cell = e.target.closest('button[data-sq]');
    if (!cell || Number(cell.dataset.sq) !== tap.sq) return;
    e.preventDefault();
    tapSquare(tap.sq, tap.sq);
  });
  minimap.addEventListener('pointercancel', () => { minimapTap = null; });
  // Garder aussi l'activation clavier et lecteur d'écran (sans doubler le pointeur).
  minimap.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const cell = e.target.closest('button[data-sq]');
    if (cell) { const sq = Number(cell.dataset.sq); tapSquare(sq, sq); }
  });
  function renderBoard() {
    const el = $('board');
    if (!minimapMove && !minimapResize) placeMinimap();
    const s = game.state;
    const last = replayAnimationOverride || game.lastMove();
    const targets = marks ? marks.map((to) => ({ to })) : selected >= 0 ? game.movesFrom(selected) : [];
    const checkSq = game.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1;
    const mateFire = [];
    let mateUltimate = null;
    // En problème ou en cours, un mat déclenche aussi l'attaque de mat, comme en partie
    let shown = result;
    if (!shown && pz) { const st = game.status(); if (st.over && st.reason === 'mat') shown = { result: st.result, reason: 'mat', ultimateId: `pz-${window.Chess.toFen(s)}` }; }
    if (shown && shown.reason === 'mat') {
      const kingSq = s.board.indexOf(s.turn === 'w' ? 'K' : 'k');
      if (kingSq >= 0) {
        // C'est la pièce qui donne échec (celle qui mate) qui fait l'attaque de mat, même sur un échec à la découverte
        const checkers = window.Chess.pseudoMoves({ ...s, turn: s.turn === 'w' ? 'b' : 'w', ep: -1, castling: '' }).filter((m) => m.to === kingSq).map((m) => m.from);
        const mater = last && checkers.includes(last.to) ? last.to : checkers[0];
        // Un Roi ne peut pas attaquer directement le Roi adverse dans une position légale.
        // Ne pas lancer l'animation spectaculaire de mat si une position invalide le désigne comme attaquant.
        if (last && mater != null && s.board[mater] && s.board[mater].toLowerCase() !== 'k') {
          const movedPiece = s.board[mater];
          const ultimatePiece = movedPiece;
          const attackerTo = mater;
          const whiteQueenUltimate = ultimatePiece === 'Q';
          const flameSquares = ultimatePiece === 'q' ? s.board.reduce((squares, piece, sq) => {
            if (!piece || (piece === piece.toUpperCase()) !== (ultimatePiece === ultimatePiece.toUpperCase())) squares.push(sq);
            return squares;
          }, []) : [];
          const energySquares = whiteQueenUltimate ? s.board.reduce((squares, piece, sq) => {
            if (piece && piece === piece.toLowerCase() && piece.toLowerCase() !== 'k') squares.push(sq);
            return squares;
          }, []) : [];
          const whiteFlameSquares = whiteQueenUltimate ? s.board.reduce((squares, piece, sq) => {
            if (!piece || piece !== piece.toUpperCase()) squares.push(sq);
            return squares;
          }, []) : [];
          mateUltimate = { id: shown.ultimateId, from: mater === last.to ? last.from : mater, attackerTo, to: kingSq, piece: ultimatePiece, flameSquares, energySquares, whiteFlameSquares };
        }
        if (!b3d || !mateUltimate || mateUltimate.piece.toLowerCase() !== 'q') {
          const legalKingMoves = new Set(game.movesFrom(kingSq).map((m) => m.to));
          for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
            if (!dr && !df) continue;
            const r = (kingSq >> 3) + dr, f = (kingSq & 7) + df;
            if (r < 0 || r > 7 || f < 0 || f > 7) continue;
            const sq = r * 8 + f;
            if (!s.board[sq] && !legalKingMoves.has(sq)) mateFire.push(sq);
          }
        }
      }
    }
    const lessonStep = pz && pz.kind === 'lesson' ? pz.steps[pz.idx] : null;
    const tutorialStars = lessonStep && !pz.done && lessonStep.stars ? lessonStep.stars.map((square) => window.Chess.sqIndex(square)) : [];
    const arrows = replay ? replayArrows() : (lessonStep && lessonStep.arrows ? lessonStep.arrows : (!pz && cfg && cfg.mode === 'coach' ? coachArrows : []));
    // vue « 2D » seule : la 3D n'est pas mise à jour (et ne se dessine plus), le plateau 2D prend toute la place
    if (b3d && settings.boardView !== '2d') {
      const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
      b3d.update({ board: s.board, selected, targets, marks, last, check: checkSq, mateFire, mateUltimate, hint, tutorialStars, flipped, showMoves: settings.showMoves || !!marks, coords: settings.coords, light: th.light, dark: th.dark, animate: animateNext && settings.anim !== 'none', outcome: shown ? shown.result : null, arrows, ply: pz ? null : game.history.length });
      animateNext = false;
      renderMinimap(s.board, last, selected, targets, mateFire, arrows, hint, tutorialStars);
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 64; i++) {
      const sq = displayToBoard(i);
      const r = sq >> 3, f = sq & 7;
      const cell = document.createElement('div');
      cell.className = 'sq ' + ((r + f) % 2 ? 'd' : 'l');
      cell.dataset.sq = sq;
      cell.setAttribute('role', 'gridcell');
      if (last && (last.from === sq || last.to === sq)) cell.classList.add('last');
      if (marks && marks.includes(sq)) cell.classList.add('coach-square-mark');
      if (sq === selected) cell.classList.add('sel');
      if (sq === checkSq) cell.classList.add('check');
      if (mateFire.includes(sq)) cell.classList.add('mate-fire');
      if (hint && hint.from === sq) cell.classList.add('hint-from');
      if (hint && hint.to === sq) cell.classList.add('hint-to');
      const p = s.board[sq];
      if (tutorialStars.includes(sq)) cell.classList.add('tutorial-star');
      if (p && marks && marks.includes(sq)) cell.classList.add('coach-piece-mark');
      cell.setAttribute('aria-label', sqName(sq) + (p ? ' ' + p : ''));
      if (tutorialStars.includes(sq)) cell.setAttribute('aria-label', `${sqName(sq)} · ${L('étoile à récupérer', 'star to collect')}`);
      if (settings.coords) {
        const row = i >> 3, col = i & 7;
        const name = sqName(sq);
        if (row === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord f top">${name[0]}</span>`);
        if (row === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord f bottom">${name[0]}</span>`);
        if (col === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord r left">${name[1]}</span>`);
        if (col === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord r right">${name[1]}</span>`);
      }
      if (p) {
        const pc = document.createElement('span');
        pc.className = 'pc ' + colorOf(p);
        pc.textContent = glyph(p);
        cell.appendChild(pc);
      }
      if (settings.showMoves && targets.some((m) => m.to === sq)) {
        cell.insertAdjacentHTML('beforeend', p || targets.some((m) => m.to === sq && m.flag === 'ep') ? '<span class="ring"></span>' : '<span class="dot"></span>');
      }
      frag.appendChild(cell);
    }
    el.replaceChildren(frag);
    if (animateNext && last) {
      animateNext = false;
      const animatePiece = (from, to, piece) => {
        const fromView = displayToBoard(from), toView = displayToBoard(to);
        const fromRow = fromView >> 3, fromCol = fromView & 7;
        const toRow = toView >> 3, toCol = toView & 7;
        const target = el.querySelector(`.sq[data-sq="${to}"] .pc`);
        if (target) target.style.visibility = 'hidden';
        const token = document.createElement('span');
        token.className = `pc ${colorOf(piece)} move-replay-token`;
        token.textContent = glyph(piece);
        token.style.left = `${fromCol * 12.5}%`;
        token.style.top = `${fromRow * 12.5}%`;
        el.appendChild(token);
        const animation = token.animate([
          { transform: 'translate(0, 0)' },
          { transform: `translate(${(toCol - fromCol) * 100}%, ${(toRow - fromRow) * 100}%)` },
        ], { duration: 800, easing: 'cubic-bezier(.2,.75,.35,1)' });
        animation.onfinish = () => { token.remove(); if (target) target.style.visibility = ''; };
      };
      animatePiece(last.from, last.to, last.piece);
      if (last.flag === 'castle') {
        const kingside = last.to > last.from;
        animatePiece(last.from + (kingside ? 3 : -4), last.from + (kingside ? 1 : -1), last.piece === 'K' ? 'R' : 'r');
      }
    } else animateNext = false;
    if (arrows.length) el.insertAdjacentHTML('beforeend', arrowsSvg(arrows));
  }


  function capturedBy(color) {
    // Pièces adverses manquantes par rapport à la position de départ
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const enemy = color === 'w' ? 'b' : 'w';
    const count = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const p of game.state.board) if (p && colorOf(p) === enemy && p.toLowerCase() !== 'k') count[p.toLowerCase()]++;
    let out = '';
    for (const t of 'qrbnp') for (let i = 0; i < Math.max(0, start[t] - count[t]); i++) {
      const piece = enemy === 'w' ? t.toUpperCase() : t;
      out += `<span class="captured-piece ${enemy === 'w' ? 'w' : 'k'}" role="img" aria-label="${pieceName(piece)}" title="${pieceName(piece)}">${GLYPH[t]}</span>`;
    }
    return out;
  }
  function material(color) {
    const v = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let sum = 0;
    for (const p of game.state.board) if (p) sum += (colorOf(p) === color ? 1 : -1) * v[p.toLowerCase()];
    return sum;
  }

  function renderPlayers() {
    const bottomColor = flipped ? 'b' : 'w';
    const topColor = flipped ? 'w' : 'b';
    const playerName = String(playerProfile().name || L('Joueur', 'Player')).trim() || L('Joueur', 'Player');
    const label = (c) => {
      // Replay : les noms des joueurs du PGN remplacent « Blancs » et « Noirs »
      if (replay && (c === 'w' ? replay.white : replay.black)) return c === 'w' ? replay.white : replay.black;
      if (cfg.mode === 'local') return c === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      if (cfg.mode === 'online' && onlineGame) {
        const g = onlineGame, t = onlineTimeLeft(g, c);
        return `${c === 'w' ? g.whiteName : g.blackName} (${c === 'w' ? g.whiteElo : g.blackElo})${t != null ? ` · ${fmtClock(t)}` : ''}`;
      }
      if (c === cfg.playerColor) return playerName;
      return cfg.mode === 'coach' ? coachName() : L('Ordinateur', 'Computer');
    };
    for (const [pos, c] of [['bottom', bottomColor], ['top', topColor]]) {
      const name = $('name-' + pos);
      name.textContent = label(c);
      const champ = !replay && cfg.mode === 'coach' && c !== cfg.playerColor && activeChampion();
      if (champ && champ.photo) { const im = document.createElement('img'); im.className = 'player-photo'; im.src = champ.photo.src; im.alt = ''; name.prepend(im); }
      const ph = cfg.mode === 'online' && onlineGame ? onlinePhotos[c === 'w' ? onlineGame.white : onlineGame.black] : !replay && cfg.mode !== 'local' && c === cfg.playerColor ? playerProfile().photo : null;
      if (ph) { const im = document.createElement('img'); im.className = 'player-photo'; im.src = ph; im.alt = ''; name.prepend(im); }
      name.classList.toggle('turn', !result && game.turn === c);
      const adv = material(c);
      $('cap-' + pos).innerHTML = capturedBy(c) + (adv > 0 ? `<small>+${adv}</small>` : '');
    }
  }

  function renderMoves() {
    const ol = $('moves'); ol.innerHTML = '';
    // Position libre où les Noirs commencent : le premier coup s'écrit « 1… »
    const off = game.states[0].turn === 'b' ? 1 : 0, h = [...new Array(off).fill(null), ...game.history];
    const cell = (k) => (h[k] ? `<span data-ply="${k - off + 1}"${k === h.length - 1 ? ' class="cur"' : ''}>${h[k].san}</span>` : h.length > k ? '<span>…</span>' : '');
    for (let i = 0; i < h.length; i += 2) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i)} ${cell(i + 1)}`;
      ol.appendChild(li);
    }
    ol.scrollTop = ol.scrollHeight;
  }

  function renderStatus() {
    const st = $('status');
    st.classList.remove('alert');
    if (result) { st.textContent = `${REASONS[result.reason]} · ${resultText()}`; return; }
    if (thinking) { st.textContent = L("L'ordinateur réfléchit…", 'The computer is thinking…'); return; }
    const side = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
    if (game.inCheck()) { st.textContent = L('Échec !', 'Check!'); st.classList.add('alert'); return; }
    st.textContent = cfg.mode !== 'local' ? (isHumanTurn() ? L('À vous de jouer', 'Your move') : cfg.mode === 'coach' ? L(`${coachName()} réfléchit…`, `${coachName()} is thinking…`) : cfg.mode === 'online' && onlineGame ? L(`Au tour de ${game.turn === 'w' ? onlineGame.whiteName : onlineGame.blackName}`, `${game.turn === 'w' ? onlineGame.whiteName : onlineGame.blackName} to move`) : '') : L(`Au tour des ${side}`, `${side} to move`);
  }

  function renderActions() {
    const plies = game.history.length;
    const myPlies = cfg.mode === 'online' ? game.history.filter((h, i) => (i % 2 === 0 ? 'w' : 'b') === cfg.playerColor).length : 0;
    // parties rapides (à la pendule) : pas de reprise de coup
    const rapid = cfg.mode === 'online' && !isDeferred();
    $('btn-undo').hidden = rapid;
    $('btn-undo').disabled = rapid || !!result || plies === 0 || !!pendingMove || (cfg.mode === 'online' ? myPlies === 0 : cfg.mode !== 'local' && plies < (cfg.playerColor === 'w' ? 1 : 2));
    $('btn-draw').hidden = !humanVsHuman();
    $('btn-draw').disabled = !!result || plies < 2;
    renderConfirm();
    $('btn-hint').disabled = cfg.mode === 'online' || !canInteract(true);
    $('btn-resign').disabled = !!result;
  }

  function resultText() {
    if (!result) return '';
    if (result.result === '1/2-1/2') return L('Partie nulle', 'Draw');
    const winner = result.result === '1-0' ? 'w' : 'b';
    if (cfg.mode === 'online') return winner === cfg.playerColor ? L('Vous gagnez', 'You win') : L('Votre adversaire gagne', 'Your opponent wins');
    if (cfg.mode !== 'local') return winner === cfg.playerColor ? L('Vous gagnez', 'You win') : cfg.mode === 'coach' ? L(`${coachName()} gagne`, `${coachName()} wins`) : L("L'ordinateur gagne", 'The computer wins');
    return winner === 'w' ? L('Les Blancs gagnent', 'White wins') : L('Les Noirs gagnent', 'Black wins');
  }

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

  /* ---------- Statistiques ---------- */
  function estimatedElo() {
    const player = playerProfile();
    let rating = player.rating;
    if (rating === null) {
      const gameRating = gamePerformance();
      const done = store.get('pzdone', {}), bank = window.PUZZLES || [];
      const outcomes = Object.entries(done).map(([id, outcome]) => {
        const puzzle = bank.find((item) => item.id === id);
        return puzzle ? { challenge: 400 + Math.max(1, puzzle.rating || puzzle.level * 3 - 1) * 200, score: outcome === 's' ? 1 : 0 } : null;
      }).filter(Boolean);
      const puzzleRating = outcomes.length
        ? outcomes.reduce((sum, item) => sum + item.challenge, 0) / outcomes.length + 250 * (outcomes.reduce((sum, item) => sum + item.score, 0) / outcomes.length - 0.5)
        : null;
      rating = gameRating === null ? puzzleRating : puzzleRating === null ? gameRating : (gameRating * 0.75 + puzzleRating * 0.25);
    }
    return Math.round(Math.max(100, Math.min(3000, rating === null ? 600 : rating)) / 10) * 10;
  }
  function updatePlayerRating(opponentElo, score, k, kind) {
    const player = playerProfile();
    const current = player.rating === null ? (gamePerformance() ?? 600) : player.rating;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - current) / 400));
    player.rating = Math.round(Math.max(100, Math.min(3000, current + k * (score - expected))) / 10) * 10;
    player[kind] = (player[kind] || 0) + 1;
    store.set('player', player);
    // le même Elo est visible des autres joueurs, quel que soit le mode où il a changé
    if (window.Online && window.Online.user) window.Online.setElo(estimatedElo());
  }
  // Les problèmes et leçons ne changent plus l'Elo : il ne dépend que des parties jouées
  function countPuzzle() { const p = playerProfile(); p.puzzles = (p.puzzles || 0) + 1; store.set('player', p); }
  function recordStat(level, outcome) {
    const stats = store.get('stats', {});
    const row = stats[level] || { win: 0, loss: 0, draw: 0 };
    row[outcome]++;
    stats[level] = row;
    store.set('stats', stats);
  }
  /* Araignée des compétences : mesurée uniquement sur tes parties contre l'ordinateur.
     Base = ta performance (force des niveaux affrontés et résultats), puis chaque thème
     est corrigé selon la fréquence de ses fautes dans tes parties analysées. */
  function gamePerformance() {
    const stats = store.get('stats', {});
    let n = 0, opp = 0, score = 0;
    for (const [l, r] of Object.entries(stats)) {
      if (!LEVEL_NAMES[l]) continue;
      const k = r.win + r.draw + r.loss;
      n += k; opp += LEVEL_ELO[+l] * k; score += r.win - r.loss;
    }
    return n ? Math.round(opp / n + (400 * score) / n) : null;
  }
  function skillOf(row, base) {
    const recent = row.recent.slice(-10);
    const games = recent.length;
    if (!games || base === null) return { value: base || 800, data: false };
    const avg = recent.reduce((x, y) => x + y, 0) / games; // fautes par partie dans ce thème
    const r = base + 150 - Math.min(500, avg * 300);
    return { value: Math.round(Math.max(100, Math.min(3000, r)) / 10) * 10, data: true };
  }
  function skillRadar() {
    const c = loadCoach();
    const SHORT = L({ mat: 'Mat', defense: 'Défense', prise: 'Prises', fourchette: 'Fourchettes', clouage: 'Clouages', tactique: 'Combinaisons', finale: 'Finales' }, { mat: 'Mates', defense: 'Defense', prise: 'Captures', fourchette: 'Forks', clouage: 'Pins', tactique: 'Combinations', finale: 'Endgames' });
    const base = gamePerformance();
    const axes = PZ_KEYS.map((k) => ({ k, name: SHORT[k] || PZ[k].name, ...skillOf(themeRow(c, k), base) }));
    const any = axes.some((a) => a.data);
    const W = 340, H = 300, cx = W / 2, cy = 158, R = 96, MIN = 0, MAX = 3000;
    const n = axes.length, ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const at = (i, v) => { const r = (R * (v - MIN)) / (MAX - MIN); return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; };
    let g = '';
    for (const v of [750, 1500, 2250, 3000]) g += `<polygon points="${axes.map((_, i) => at(i, v).join(',')).join(' ')}" class="rd-grid"/>`;
    axes.forEach((_, i) => { const [x, y] = at(i, MAX); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="rd-grid"/>`; });
    for (const v of [750, 1500, 2250, 3000]) g += `<text x="${cx + 3}" y="${cy - (R * (v - MIN)) / (MAX - MIN) + 10}" class="rd-scale">${v}</text>`;
    const pts = axes.map((a, i) => at(i, a.value));
    g += `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="rd-area${any ? '' : ' empty'}"/>`;
    g += pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" class="rd-dot"/>`).join('');
    axes.forEach((a, i) => {
      const [x, y0] = at(i, MAX + 430), cos = Math.cos(ang(i)), y = y0 - (i === 0 ? 14 : 0);
      const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
      g += `<text x="${x}" y="${y}" text-anchor="${anchor}" class="rd-label">${a.name}</text><text x="${x}" y="${y + 14}" text-anchor="${anchor}" class="rd-val">${a.data ? a.value : '—'}</text>`;
    });
    const best = axes.filter((a) => a.data).sort((a, b) => b.value - a.value);
    const note = !any ? L("Joue des parties contre l'ordinateur : chaque thème recevra une note tirée de l'analyse de tes parties.", 'Play games against the computer: each theme will get a rating from the analysis of your games.')
      : L(`Mesuré sur tes ${c.games} partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} (performance ${base}). Point fort : ${best[0].name} (${best[0].value}). À travailler : ${best[best.length - 1].name} (${best[best.length - 1].value}).`,
        `Measured on your ${c.games} analysed game${c.games === 1 ? '' : 's'} (performance ${base}). Strength: ${best[0].name} (${best[0].value}). To work on: ${best[best.length - 1].name} (${best[best.length - 1].value}).`);
    return `<h3 class="pz-section">${L('Mes compétences par thème', 'My skills by theme')}</h3><svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Araignée des compétences par thème', 'Skills radar by theme')}">${g}</svg><p class="pz-cap">${note}</p>`;
  }
  function renderStats() {
    const stats = store.get('stats', {});
    const body = $('stats-body');
    const levels = Object.keys(stats).filter((l) => LEVEL_NAMES[l]).sort((a, b) => a - b);
    const radar = skillRadar();
    if (!levels.length) {
      body.innerHTML = radar + L('<p class="empty">Aucune partie terminée contre l\'ordinateur pour l\'instant.<br>Vos résultats apparaîtront ici.</p>', '<p class="empty">No finished game against the computer yet.<br>Your results will appear here.</p>');
      return;
    }
    let total = { win: 0, loss: 0, draw: 0 };
    let rows = '';
    for (const l of levels) {
      const s = stats[l];
      total.win += s.win; total.loss += s.loss; total.draw += s.draw;
      const n = s.win + s.loss + s.draw;
      rows += `<tr><td>${LEVEL_NAMES[l]} <small>(${LEVEL_ELO[l]})</small></td><td>${s.win}</td><td>${s.draw}</td><td>${s.loss}</td><td>${n ? Math.round((100 * s.win) / n) : 0} %</td></tr>`;
    }
    const n = total.win + total.loss + total.draw;
    body.innerHTML = radar + `<h3 class="pz-section">${L("Résultats contre l'ordinateur", 'Results against the computer')}</h3><table class="stats-table"><thead><tr><th>${L('Niveau', 'Level')}</th><th>${L('V', 'W')}</th><th>${L('N', 'D')}</th><th>${L('D', 'L')}</th><th>${L('Réussite', 'Win rate')}</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td><b>Total</b></td><td>${total.win}</td><td>${total.draw}</td><td>${total.loss}</td><td>${Math.round((100 * total.win) / n)} %</td></tr></tfoot></table>
      <button class="btn ghost wide" id="btn-reset-stats">${L('Remettre à zéro', 'Reset')}</button>`;
    $('btn-reset-stats').onclick = () => modal({
      title: L('Effacer les statistiques ?', 'Clear the statistics?'), actions: [
        { label: L('Effacer', 'Clear'), primary: true, onClick: () => { store.del('stats'); renderStats(); } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ],
    });
  }

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
  /* ---------- Comme un champion : idées et principes des champions du monde ---------- */
  const CHAMPS = window.CHAMPIONS || [];
  const STYLE_AXES = L({ attaque: 'attaque', tactique: 'tactique', positionnel: 'jeu positionnel', finale: 'finales', defense: 'défense' }, { attaque: 'attack', tactique: 'tactics', positionnel: 'positional play', finale: 'endgames', defense: 'defense' });
  let championLevel = store.get('championLevel', 'same'); // « same » : ton niveau ; « above » : un cran au-dessus
  const champById = (id) => CHAMPS.find((c) => c.id === id);
  const champShort = (c) => c.name.split(' ').pop();
  // Plus que six pièces (hors rois et pions) sur l'échiquier : on est en finale
  const isEndgameBoard = (board) => board.filter((p) => p && !'kKpP'.includes(p)).length <= 6;

  // Profil basé sur les évaluations de l'analyse ; les parties historiques gardent un repli heuristique.
  function gameStyle(g) {
    const p = g.styleProfile;
    if (p && p.moves) {
      const m = p.moves, unit = (x) => Math.max(0, Math.min(1, x));
      return {
        attaque: unit((p.checks / m) * 4 + (p.goodCaptures / m) * 0.8),
        tactique: unit((p.tacticalMoves / m) * 3.5),
        positionnel: unit((p.quietMoves ? p.accurateQuietMoves / p.quietMoves : 0) * 0.55 + (p.accuracy || 0) / 100 * 0.3 + (p.castling / m) * 0.15),
        finale: unit(p.endgameMoves / m),
        defense: unit((p.moves ? p.accurateEvasions / m : 0) * 8),
      };
    }
    const G = new Game();
    let moves = 0, checks = 0, captures = 0, quiet = 0, castled = 0, endgame = 0;
    for (const u of g.moves) {
      const mover = G.turn, r = G.playUci(u);
      if (!r) break;
      if (mover === g.color) {
        moves++;
        if (G.inCheck()) checks++;
        if (r.move.captured) captures++;
        else if (r.move.piece.toLowerCase() === 'p' || r.move.flag === 'castle') quiet++;
        if (r.move.flag === 'castle') castled = 1;
      }
      if (!endgame && isEndgameBoard(G.state.board)) endgame = 1;
    }
    const won = g.result === (g.color === 'w' ? '1-0' : '0-1'), lost = g.result === (g.color === 'w' ? '0-1' : '1-0');
    const m = Math.max(1, moves), unit = (x) => Math.max(0, Math.min(1, x));
    return {
      attaque: unit((checks / m) / 0.12 * 0.7 + (won && g.reason === 'mat' ? 0.6 : 0)),
      tactique: unit((captures / m) / 0.3),
      positionnel: unit((quiet / m) / 0.45 * 0.6 + castled * 0.4),
      finale: endgame,
      defense: unit((g.moves.length >= 50 && !lost ? 0.6 : 0) + castled * 0.4),
    };
  }
  const styleGames = () => store.get('archive', []).filter((g) => ['ai', 'coach'].includes(g.mode) && !g.fen && g.color && g.moves && g.moves.length >= 12 && g.analysed).slice(-20);
  // Pondère davantage les parties récentes et écarte les parties à deux joueurs / personnalisées.
  function playerStyle() {
    const games = styleGames();
    if (games.length < 3) return null;
    const avg = { games: games.length }, totalWeight = games.reduce((sum, _, i) => sum + Math.pow(0.88, games.length - 1 - i), 0);
    for (const k of Object.keys(STYLE_AXES)) avg[k] = games.reduce((sum, g, i) => sum + gameStyle(g)[k] * Math.pow(0.88, games.length - 1 - i), 0) / totalWeight;
    return avg;
  }
  // L'impulsivité dépend de gaffes par nombre de coups, pas du nombre brut de fautes.
  function styleLabel(v, errors, profile) {
    const impulsive = profile && profile.moves ? profile.severe / profile.moves >= 0.08 : errors >= 2;
    if (v.attaque >= 0.6) return impulsive ? L('Attaquant impulsif', 'Impulsive attacker') : L('Joueur agressif', 'Aggressive player');
    if (v.tactique >= 0.6) return impulsive ? L('Chasseur de matériel', 'Material hunter') : L('Tacticien opportuniste', 'Opportunistic tactician');
    if (v.finale >= 0.6 && v.positionnel >= 0.5) return L('Joueur positionnel patient', 'Patient positional player');
    if (v.positionnel >= 0.6) return impulsive ? L('Bâtisseur pressé', 'Hasty builder') : L('Stratège solide', 'Solid strategist');
    if (v.defense >= 0.6) return L('Défenseur tenace', 'Stubborn defender');
    if (v.finale >= 0.6) return L('Finisseur méthodique', 'Methodical finisher');
    return impulsive ? L('Joueur spontané', 'Spontaneous player') : L('Joueur polyvalent', 'All-round player');
  }
  // Style qui revient le plus souvent dans les parties admissibles (à égalité, le plus récent).
  function dominantStyle() {
    const games = styleGames();
    if (games.length < 3) return null;
    const mistakes = store.get('mistakes', []);
    const count = new Map();
    games.forEach((g, i) => {
      const label = styleLabel(gameStyle(g), mistakes.filter((m) => m.date === g.id).length, g.styleProfile);
      const row = count.get(label) || { n: 0, last: 0 };
      row.n++; row.last = i; count.set(label, row);
    });
    const [label, row] = [...count].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0];
    return { label, n: row.n, games: games.length };
  }
  // Proximité (en %) entre le style du joueur et celui d'un champion
  function styleMatch(champ, style) {
    if (!style) return null;
    const keys = Object.keys(STYLE_AXES);
    return Math.round((1 - keys.reduce((s, k) => s + Math.abs(champ.style[k] - style[k]), 0) / keys.length) * 100);
  }
  function championOrder() {
    const style = playerStyle();
    const list = CHAMPS.map((c, i) => ({ c, i, match: styleMatch(c, style) }))
      .sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || a.i - b.i);
    return { style, list };
  }
  // Niveau de l'ordinateur le plus proche de ton Elo estimé, ou le niveau suivant
  function championGameLevel() {
    const target = estimatedElo();
    let level = 1;
    for (let l = 2; l <= unlocked(); l++) if (Math.abs(LEVEL_ELO[l] - target) < Math.abs(LEVEL_ELO[level] - target)) level = l;
    return championLevel === 'above' ? Math.min(MAX_GAME_LEVEL, level + 1) : level;
  }
  // Problème du thème, choisi à ton niveau (échelle de difficulté 1 à 9 de la banque) ou juste au-dessus
  // Pièce qui joue le premier coup de la solution, pour coller au principe annoncé (cavalier, pion…)
  const firstMover = (p) => { try { const g = new Game(p.fen); g.playUci(p.line[0]); const m = g.lastMove(); return m ? m.piece.toLowerCase() : ''; } catch { return ''; } };
  function championPuzzle(theme, used, piece) {
    const base = Math.max(1, Math.min(9, Math.round((estimatedElo() - 400) / 200)));
    const target = championLevel === 'above' ? base + 1 : base;
    const done = store.get('pzdone', {});
    let pool = BANK.filter((p) => p.theme === theme && p.line && p.line.length && !used.has(p.id));
    if (piece) { const same = pool.filter((p) => firstMover(p) === piece); if (same.length) pool = same; }
    if (!pool.length) return null;
    const dist = (p) => Math.abs((p.rating || p.level * 2) - target) + (done[p.id] ? 1.5 : 0);
    const best = Math.min(...pool.map(dist));
    const near = pool.filter((p) => dist(p) <= best + 0.5);
    return near[Math.floor(Math.random() * near.length)];
  }
  // Une situation de tes parties précédentes où l'idée du champion s'appliquait
  function championPersonalStep(ch) {
    const name = champShort(ch), themes = ch.principles.map((p) => p.theme);
    const ms = store.get('mistakes', []).filter((m) => themes.includes(m.theme) && m.line && m.line.length);
    const m = ms.filter((x) => !x.solved).pop() || ms.pop();
    if (m) {
      const pr = ch.principles.find((p) => p.theme === m.theme);
      const played = uciOf(m), arrows = played ? [{ from: window.Chess.sqIndex(played.slice(0, 2)), to: window.Chess.sqIndex(played.slice(2, 4)), color: 'red' }] : [];
      const steps = [];
      if (played) steps.push({
        text: L(`Retour sur ta partie du ${fmtDate(m.date)}. Au coup ${m.move}, tu as joué ${m.played}. Regarde ce coup et souviens-toi : ${pr.title.toLowerCase()}.`, `Back to your game of ${fmtDate(m.date)}. On move ${m.move}, you played ${m.played}. Watch this move and remember: ${pr.title.toLowerCase()}.`),
        fen: m.fen, demoMoves: [played], demoSpeech: openingSpeechLine(m.fen, [played]), arrows, annotateRelations: true,
      });
      steps.push({ text: L(`À toi : dans cette même position, joue comme je l'aurais fait.`, `Your turn: in this same position, play as I would.`),
        fen: m.fen, line: m.line, alts: m.alts, mistake: m.id, theme: m.theme, arrows,
        why: L(`Voilà mon coup. La prochaine fois que cette situation se présente, pense à : ${pr.title.toLowerCase()}.`, `That's my move. Next time this situation comes up, think: ${pr.title.toLowerCase()}.`),
      });
      return steps;
    }
    // Sans faute sur ces thèmes : la position de ta dernière partie où la situation-clé du champion est apparue
    const finaleChamp = ch.style.finale >= 0.8;
    for (const g of store.get('archive', []).slice().reverse()) {
      if (g.fen || !g.color || !g.moves || g.moves.length < 16) continue;
      const G = new Game();
      for (let i = 0; i < g.moves.length; i++) {
        const before = window.Chess.toFen(G.state), uci = g.moves[i];
        if (!G.playUci(uci)) break;
        if ((finaleChamp ? isEndgameBoard(G.state.board) : i >= 15) && G.turn === g.color) {
          const arrow = { from: window.Chess.sqIndex(uci.slice(0, 2)), to: window.Chess.sqIndex(uci.slice(2, 4)), color: 'red' };
          return [{ text: L(`Retour sur ta partie du ${fmtDate(g.id)}, au coup ${Math.floor(i / 2) + 1}. Regarde le dernier coup joué.`, `Back to your game of ${fmtDate(g.id)}, move ${Math.floor(i / 2) + 1}. Watch the last move.`),
            fen: before, demoMoves: [uci], demoSpeech: openingSpeechLine(before, [uci]), arrows: [arrow], annotateRelations: true },
          { text: L(`${finaleChamp ? ch.tips.finale : ch.tips.milieu} Observe la position obtenue et cherche mon plan.`, `${finaleChamp ? ch.tips.finale : ch.tips.milieu} Study the resulting position and look for my plan.`), fen: window.Chess.toFen(G.state) }];
        }
      }
    }
    return null;
  }
  function startChampionLesson(id) {
    const ch = champById(id);
    if (!ch) return;
    const name = champShort(ch), used = new Set();
    const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
    // Présentation : qui je suis, d'où je viens, quand et combien de temps j'ai régné
    const reign = L(`J'ai été champion du monde ${ch.period}, soit ${ch.years} an${ch.years > 1 ? 's' : ''} de règne.`, `I was world champion ${ch.period}, a reign of ${ch.years} year${ch.years === 1 ? '' : 's'}.`);
    const steps = [{ text: L(`Bonjour, ${lc(ch.intro)} ${ch.origin} ${reign} Aujourd'hui, c'est moi qui te donne le cours : je vais t'apprendre à jouer comme moi.`, `Hello, ${ch.intro} ${ch.origin} ${reign} Today I am your teacher: I will teach you to play like me.`) }];
    ch.principles.forEach((p, i) => {
      steps.push({ text: L(`Principe ${i + 1} : ${p.title}. ${p.text}`, `Principle ${i + 1}: ${p.title}. ${p.text}`) });
      const example = championPuzzle(p.theme, used, p.piece);
      if (example) {
        used.add(example.id);
        const examplePosition = new Game(example.fen);
        const exampleColor = examplePosition.state.turn;
        example.line.forEach((uci, moveIndex) => {
          const fen = window.Chess.toFen(examplePosition.state), color = examplePosition.state.turn;
          const played = examplePosition.playUci(uci);
          if (!played) return;
          const moveLabel = `${Math.floor(moveIndex / 2) + 1}${moveIndex % 2 ? '…' : '.'} ${played.san}`;
          const explanation = moveIndex === 0
            ? L(`Voici comment j’applique « ${p.title} » : ${p.text}`, `Here is how I apply “${p.title}”: ${p.text}`)
            : color === exampleColor
              ? L(`Ce coup poursuit mon idée : ${lc(p.title)}.`, `This move continues my idea: ${lc(p.title)}.`)
              : L('Observe la réponse adverse : elle montre pourquoi le coup précédent était important.', 'Watch the opponent’s reply: it shows why the previous move mattered.');
          const finalExampleMove = moveIndex === example.line.length - 1;
          steps.push({
            text: L(`Exemple guidé · ${moveLabel}. ${explanation}`, `Guided example · ${moveLabel}. ${explanation}`),
            fen, demoMoves: [uci], demoSpeech: openingSpeechLine(fen, [uci]), annotateRelations: true, syncDemoWithVoice: true,
            demoStartText: L(`Regarde ${moveLabel} : les flèches montrent le coup, ses attaques et ses défenses.`, `Watch ${moveLabel}: the arrows show the move, its attacks and defenses.`),
            demoDoneText: finalExampleMove
              ? L(`Exemple terminé. À toi d’appliquer « ${p.title} » dans un nouveau problème : appuie sur Continuer.`, `Example complete. Now apply “${p.title}” in a new puzzle: press Continue.`)
              : L('La suite de l’exemple arrive au prochain écran. Appuie sur Continuer.', 'The next part of the example is on the next screen. Press Continue.'),
          });
        });
      }
      const it = championPuzzle(p.theme, used, p.piece);
      if (it) {
        used.add(it.id);
        steps.push({ text: L(`À toi, joue comme moi : ${lc(p.task)}`, `Your turn, play like me: ${lc(p.task)}`), fen: it.fen, line: it.line, alts: it.alts, theme: p.theme, why: L(`Bravo ! C'est exactement mon idée : ${p.title.toLowerCase()}.`, `Well done! That's exactly my idea: ${p.title.toLowerCase()}.`) });
      }
    });
    const mine = championPersonalStep(ch);
    if (mine) steps.push(...mine);
    const level = championGameLevel();
    steps.push({ text: L(`Tu connais maintenant mes idées. Pour les appliquer, affronte-moi dans une partie au niveau ${LEVEL_NAMES[level]} : je jouerai contre toi et je te rappellerai mes principes quand la situation se présentera.`, `You now know my ideas. To apply them, face me in a game at level ${LEVEL_NAMES[level]}: I will play against you and remind you of my principles when the situation arises.`) });
    pz = { kind: 'lesson', lesson: { title: L(`Le cours de ${name}`, `${name}'s course`), theme: ch.principles[0].theme, champion: ch.id }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  function finishChampionLesson(id) {
    const ch = champById(id);
    const done = store.get('championsDone', {}); done[id] = Date.now(); store.set('championsDone', done);
    leavePuzzle();
    if (!ch) return;
    const level = championGameLevel();
    modal({
      title: L(`Cours terminé : ${ch.name}`, `Course finished: ${ch.name}`),
      text: L(`${ch.name} : « Prêt à m'affronter ? » Partie au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`, `${ch.name}: “Ready to face me?” Game at level ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`),
      actions: [
        { label: L(`Affronter ${champShort(ch)}`, `Play against ${champShort(ch)}`), primary: true, onClick: () => startChampionGame(id) },
        { label: L('Plus tard', 'Later'), ghost: true },
      ],
    });
  }
  function startChampionGame(id) {
    const ch = champById(id);
    if (!ch) return;
    const level = championGameLevel();
    setup.mode = 'coach'; setup.level = level;
    store.set('setup', setup);
    startGame({ mode: 'coach', playerColor: randomColor(), level, champion: ch.id });
  }
  // Situations de partie qui appellent un principe du champion, et les thèmes de fautes passées qui s'y rattachent
  const SITUATION_THEMES = { attaque: ['mat', 'tactique', 'fourchette'], defense: ['defense'], finale: ['finale'], milieu: ['prise', 'clouage', 'fourchette', 'tactique'], ouverture: [] };
  function championSituation() {
    const ply = game.history.length, told = cfg.champTold || (cfg.champTold = {});
    const fresh = (k, gap) => told[k] === undefined || (gap && ply - told[k] >= gap);
    const s = game.state;
    if (isEndgameBoard(s.board) && fresh('finale')) return 'finale';
    const last = game.lastMove();
    if ((game.inCheck() || (last && last.captured)) && fresh('defense', 12)) return 'defense';
    if (ply >= 8 && fresh('attaque', 12) && game.moves().some((m) => window.Chess.inCheck(window.Chess.makeMove(s, m)))) return 'attaque';
    if (ply <= 6 && fresh('ouverture')) return 'ouverture';
    if (ply >= 20 && fresh('milieu')) return 'milieu';
    return null;
  }
  // Rappel du principe du champion choisi, avec la partie précédente où la même situation t'a coûté un coup
  function championTip() {
    const ch = cfg && cfg.champion && champById(cfg.champion);
    if (!ch || !game) return '';
    const k = championSituation();
    if (!k) return '';
    cfg.champTold[k] = game.history.length;
    let text = ch.tips[k];
    const recalled = cfg.champRecalled || (cfg.champRecalled = []);
    const past = store.get('mistakes', []).filter((m) => SITUATION_THEMES[k].includes(m.theme) && !recalled.includes(m.id)).pop();
    if (past) {
      recalled.push(past.id);
      text += L(` Souviens-toi de ta partie du ${fmtDate(past.date)} : dans une situation semblable, au coup ${past.move}, tu avais joué ${past.played} et ce n'était pas le meilleur.`, ` Remember your game of ${fmtDate(past.date)}: in a similar situation, on move ${past.move}, you played ${past.played} and it wasn't the best.`);
    }
    return text;
  }
  function renderChampions() {
    const { style, list } = championOrder();
    const done = store.get('championsDone', {});
    const level = championGameLevel();
    let html = '<div class="pz-summary">';
    if (style) {
      const top = Object.keys(STYLE_AXES).sort((a, b) => style[b] - style[a]).slice(0, 2).map((k) => STYLE_AXES[k]);
      html += L(`Les champions sont classés du plus proche au plus éloigné de ton style, estimé sur tes <b>${style.games}</b> dernière${style.games > 1 ? 's' : ''} partie${style.games > 1 ? 's' : ''} : ton jeu penche vers <b>${top[0]}</b> et <b>${top[1]}</b>.`, `Champions are ranked from closest to furthest from your style, estimated on your last <b>${style.games}</b> game${style.games === 1 ? '' : 's'}: your play leans toward <b>${top[0]}</b> and <b>${top[1]}</b>.`);
    } else html += L("Joue quelques parties contre l'ordinateur : j'analyserai ton style pour classer en premier les champions dont les idées te ressemblent. En attendant, ils sont dans l'ordre de l'histoire.", 'Play a few games against the computer: I will analyse your style to rank first the champions whose ideas resemble yours. Meanwhile, they are listed in historical order.');
    html += '</div>';
    html += `<label class="field-label">${L('Niveau des cours', 'Course level')}</label><div class="segmented" id="champ-level">
      <button data-lv="same" class="${championLevel === 'same' ? 'on' : ''}" aria-pressed="${championLevel === 'same'}">${L('À mon niveau', 'At my level')}</button>
      <button data-lv="above" class="${championLevel === 'above' ? 'on' : ''}" aria-pressed="${championLevel === 'above'}">${L('Un cran au-dessus', 'One step above')}</button></div>
      <p class="pz-cap">${L(`Problèmes choisis pour ton Elo estimé (${estimatedElo()}) · partie d'application au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`, `Puzzles chosen for your estimated Elo (${estimatedElo()}) · practice game at level ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`)}</p>`;
    html += list.map(({ c, match }, i) => `<article class="champ-card">
      <div class="champ-head">${c.photo ? `<img class="champ-photo" src="${c.photo.src}" alt="${c.name}">` : '<span class="ico">♚</span>'}<div><b>${i + 1}. ${c.name}</b><small>${c.reign}</small></div>${match != null ? `<span class="chip ${match >= 75 ? 'ok' : match >= 60 ? 'warm' : 'free'}" title="${L('Proximité avec ton style', 'Closeness to your style')}">${match} %</span>` : ''}</div>
      <p class="champ-tag">${c.tagline}${done[c.id] ? L(' · cours suivi ✓', ' · course done ✓') : ''}</p>
      <p class="pz-cap">${c.principles.map((p) => p.title).join(' · ')}</p>
      ${c.photo ? `<p class="photo-credit">${L('Photo', 'Photo')} : <a href="${c.photo.page}" target="_blank" rel="noopener">${c.photo.author}</a> · ${c.photo.license} · Wikimedia Commons</p>` : ''}
      <div class="champ-actions"><button class="btn primary" data-champ-lesson="${c.id}">${L('Cours guidé', 'Guided course')}</button><button class="btn ghost" data-champ-game="${c.id}">${L(`Affronter ${champShort(c)}`, `Play against ${champShort(c)}`)}</button></div>
    </article>`).join('');
    const body = $('champions-body');
    body.innerHTML = html;
    body.querySelectorAll('[data-lv]').forEach((b) => (b.onclick = () => { championLevel = b.dataset.lv; store.set('championLevel', championLevel); renderChampions(); }));
    body.querySelectorAll('[data-champ-lesson]').forEach((b) => (b.onclick = () => startChampionLesson(b.dataset.champLesson)));
    body.querySelectorAll('[data-champ-game]').forEach((b) => (b.onclick = () => startChampionGame(b.dataset.champGame)));
  }
  // Garde-fou : une ancienne page en cache n'a pas encore ce bouton
  if ($('btn-champions')) $('btn-champions').onclick = () => { returnTo = 'home'; show('champions'); };

  $('btn-problems').onclick = () => { returnTo = 'home'; show('problems'); };
  Object.defineProperty(window, 'cavalierPz', { get: () => pz }); // pour les tests
  $('coach-img').src = 'sissa/sissa-face.jpg'; $('coach-img').classList.add('photo');
  /* ---------- La légende de Sissa : le maître raconte lui-même, en slides ---------- */
  const LEGEND = L([
    { img: 'sissa/sissa.jpg', text: 'Approche, mon élève. Je suis Sissa, et je vais te raconter comment est né le jeu auquel tu joues. Appuie sur « Continuer » pour écouter mon histoire.' },
    { img: 'sissa/legende-1.jpg', text: 'Il y a bien longtemps, j\'étais sage et conseiller à la cour du roi des Indes. Pour lui enseigner la stratégie et la sagesse, j\'ai inventé un jeu : les échecs. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-2.jpg', text: 'Le roi fut si impressionné qu\'il m\'offrit la récompense de mon choix. Je ne lui ai demandé que du riz : un grain sur la première case, deux sur la deuxième, quatre sur la troisième, huit sur la quatrième, en doublant à chaque fois. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-3.jpg', text: 'Le roi éclata de rire : « Ce n\'est qu\'un grain à chaque case ! C\'est une demande bien modeste. Fais-le préparer. » Appuie sur « Continuer ».' },
    { board: 8, text: 'Regarde bien la première rangée : 1, 2, 4, 8, 16, 32, 64, 128. Chaque case contient deux fois plus de grains que la précédente. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-4.jpg', text: 'Mais très vite, ses savants comprirent leur erreur. Il y avait déjà 64 grains sur la sixième case… et sur la vingtième, il en fallait plus d\'un million ! Appuie sur « Continuer ».' },
    { board: 64, text: 'Voici l\'échiquier complet : les nombres deviennent gigantesques. Les dernières cases demandent des milliards de milliards de grains. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-5.jpg', text: 'Au total, il aurait fallu plus de 18 quintillions de grains : 18 446 744 073 709 551 615. Bien plus que tout le riz récolté dans le monde entier. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-6.jpg', text: 'Le roi resta sans voix. Je lui ai dit : « Majesté, ce jeu n\'est pas seulement un divertissement. Il montre que chaque décision, même petite, peut avoir des conséquences immenses. » Appuie sur « Continuer ».' },
    { img: 'sissa/legende-7.jpg', text: 'Le roi comprit alors la leçon et me respecta profondément. Depuis ce jour, on raconte cette légende pour rappeler que les petites choses peuvent avoir un effet immense, et que la sagesse vaut plus que la richesse. Appuie sur « Continuer ».' },
    { img: 'sissa/montagne-de-riz.jpg', text: 'Voilà la montagne de riz que ma simple demande aurait demandée. Aux échecs aussi, un petit avantage patiemment accumulé finit par tout emporter. Appuie sur « Terminer » pour revenir à ton entraînement.' },
  ], [
    { img: 'sissa/sissa.jpg', text: 'Come closer, my student. I am Sissa, and I will tell you how the game you play was born. Press "Continue" to hear my story.' },
    { img: 'sissa/legende-1.jpg', text: 'Long ago, I was a sage and counsellor at the court of the king of India. To teach him strategy and wisdom, I invented a game: chess. Press "Continue".' },
    { img: 'sissa/legende-2.jpg', text: 'The king was so impressed that he offered me any reward I wished. I only asked him for rice: one grain on the first square, two on the second, four on the third, eight on the fourth, doubling each time. Press "Continue".' },
    { img: 'sissa/legende-3.jpg', text: 'The king burst out laughing: "It is only a grain on each square! Such a modest request. Have it prepared." Press "Continue".' },
    { board: 8, text: 'Look at the first rank: 1, 2, 4, 8, 16, 32, 64, 128. Each square holds twice as many grains as the one before. Press "Continue".' },
    { img: 'sissa/legende-4.jpg', text: 'But very soon, his scholars understood their mistake. There were already 64 grains on the sixth square… and the twentieth needed more than a million! Press "Continue".' },
    { board: 64, text: 'Here is the whole board: the numbers become gigantic. The last squares need billions of billions of grains. Press "Continue".' },
    { img: 'sissa/legende-5.jpg', text: 'In all, it would have taken more than 18 quintillion grains: 18,446,744,073,709,551,615. Far more than all the rice ever harvested in the world. Press "Continue".' },
    { img: 'sissa/legende-6.jpg', text: 'The king was speechless. I told him: "Majesty, this game is not just a pastime. It shows that every decision, even a small one, can have immense consequences." Press "Continue".' },
    { img: 'sissa/legende-7.jpg', text: 'The king then understood the lesson and respected me deeply. Ever since, this legend is told to remind us that small things can have an immense effect, and that wisdom is worth more than wealth. Press "Continue".' },
    { img: 'sissa/montagne-de-riz.jpg', text: 'Here is the mountain of rice my simple request would have needed. In chess too, a small advantage patiently built up ends up carrying everything. Press "Finish" to go back to your training.' },
  ]);
  let legendIdx = 0, legendBack = 'home';
  // échiquier des grains : 1, 2, 4… sur les premières cases (en notation courte pour les grands nombres)
  const grains = (n) => { const v = Number(2n ** BigInt(n)); return v < 100000 ? v.toLocaleString(LOCALE) : v < 1e6 ? `${Math.round(v / 1000)} k` : v < 1e9 ? `${Math.round(v / 1e6)} M` : v < 1e12 ? `${Math.round(v / 1e9)} ${L('Md', 'B')}` : `2^${n}`; };
  function renderLegend() {
    const s = LEGEND[legendIdx];
    $('legend-img').hidden = !s.img;
    // image en largeur (montagne de riz, dernière vignette) : toute la largeur, proportions gardées
    if (s.img) { const im = $('legend-img'); im.onload = () => im.classList.toggle('wide', im.naturalWidth > im.naturalHeight); im.src = s.img; }
    const b = $('legend-board');
    b.hidden = !s.board;
    if (s.board) {
      let html = '';
      for (let i = 0; i < 64; i++) {
        const r = 7 - (i >> 3), f = i & 7, n = r * 8 + f, dark = (r + f) % 2 === 0;
        html += `<span class="${dark ? 'd' : 'l'}">${n < s.board ? grains(n) : ''}</span>`;
      }
      b.innerHTML = html;
    }
    $('legend-text').textContent = s.text;
    say_legend(s.text);
    $('legend-count').textContent = `${legendIdx + 1} / ${LEGEND.length}`;
    $('legend-next').textContent = legendIdx >= LEGEND.length - 1 ? L('Terminer', 'Finish') : L('Continuer', 'Continue');
  }
  function say_legend(text) { try { if (settings.voice) speak(text); } catch { /* pas de voix */ } }
  function openLegend() {
    if (activeChampion()) return;
    legendBack = document.body.dataset.screen || 'home'; returnTo = legendBack === 'legend' ? 'home' : legendBack;
    legendIdx = 0;
    renderLegend();
    show('legend');
  }
  $('legend-next').onclick = () => {
    if (legendIdx < LEGEND.length - 1) { legendIdx++; renderLegend(); return; }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* rien */ }
    show(legendBack === 'legend' ? 'home' : legendBack);
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-legend]') || (e.target.closest('#coach-img, #coach-dock-img') && !activeChampion())) { e.preventDefault(); openLegend(); }
  });


  /* ---------- Accueil ---------- */
  const randomColor = () => (Math.random() < 0.5 ? 'w' : 'b');
  $('btn-player-name').onclick = () => (ON && ON.user ? openAccount() : promptPlayerName());
  $('btn-home-settings').onclick = () => $('btn-settings').click();
  $('btn-home-progress').onclick = () => { returnTo = 'home'; show('problems'); };
  $('btn-home-learn').onclick = () => $('btn-champions').click();
  $('btn-home-play').onclick = () => $('btn-new').click();
  $('btn-home-rewards').onclick = () => $('home-rewards').click();
  $('btn-program').onclick = () => { returnTo = 'home'; show('program'); };
  $('btn-progress-menu').onclick = () => {
    const open = $('progress-submenu').hidden;
    $('progress-submenu').hidden = !open;
    $('btn-progress-menu').setAttribute('aria-expanded', String(open));
  };
  $('btn-play-menu').onclick = () => {
    const open = $('play-submenu').hidden;
    $('play-submenu').hidden = !open;
    $('btn-play-menu').setAttribute('aria-expanded', String(open));
  };
  const closeMobileMenu = () => {
    document.body.classList.remove('mobile-menu-open');
    $('mobile-menu-backdrop').hidden = true;
    $('mobile-menu-toggle').setAttribute('aria-expanded', 'false');
  };
  $('mobile-menu-toggle').onclick = () => {
    const open = !document.body.classList.contains('mobile-menu-open');
    document.body.classList.toggle('mobile-menu-open', open);
    $('mobile-menu-backdrop').hidden = !open;
    $('mobile-menu-toggle').setAttribute('aria-expanded', String(open));
  };
  $('mobile-menu-backdrop').onclick = closeMobileMenu;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileMenu();
  });
  $('program-continue').onclick = () => { returnTo = 'problems'; show('problems'); nextActivity(); };
  $('program-game').onclick = () => $('btn-coach-game').click();
  $('btn-coach-game').onclick = () => {
    const target = estimatedElo(), top = unlocked();
    let level = 1;
    for (let candidate = 2; candidate <= top; candidate++) {
      if (Math.abs(LEVEL_ELO[candidate] - target) < Math.abs(LEVEL_ELO[level] - target)) level = candidate;
    }
    setup.mode = 'coach'; setup.level = level;
    store.set('setup', setup);
    startGame({ mode: 'coach', playerColor: randomColor(), level });
  };
  $('btn-coach-program').onclick = () => { returnTo = 'problems'; show('problems'); nextActivity(); };
  $('btn-new').onclick = () => { renderSetup(); returnTo = 'home'; show('setup'); };
  $('btn-start').onclick = () => {
    store.set('setup', setup);
    startGame({ mode: setup.mode, playerColor: randomColor(), level: setup.level });
  };
  /* ---------- Construire une position ---------- */
  const ED_PIECES = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];
  const ed = { board: [], tool: 'move', from: -1, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, mode: 'ai', color: 'w', level: 1, flip: false };
  function edLoad(fen) {
    const s = window.Chess.fromFen(fen);
    ed.board = s.board.slice(); ed.turn = s.turn; ed.from = -1;
    ed.castle = { K: s.castling.includes('K'), Q: s.castling.includes('Q'), k: s.castling.includes('k'), q: s.castling.includes('q') };
  }
  // Roques possibles seulement si le roi et la tour concernés sont sur leurs cases de départ
  const edCastleOk = { K: () => ed.board[60] === 'K' && ed.board[63] === 'R', Q: () => ed.board[60] === 'K' && ed.board[56] === 'R', k: () => ed.board[4] === 'k' && ed.board[7] === 'r', q: () => ed.board[4] === 'k' && ed.board[0] === 'r' };
  function edFen() {
    const castling = ['K', 'Q', 'k', 'q'].filter((c) => ed.castle[c] && edCastleOk[c]()).join('');
    return window.Chess.toFen({ board: ed.board, turn: ed.turn, castling, ep: -1, half: 0, full: 1 });
  }
  function edError() {
    const fen = edFen(), err = fenError(fen);
    if (err) { const m = err.replace(/^FEN invalide : /, '').replace(/^Invalid FEN: /, ''); return m.charAt(0).toUpperCase() + m.slice(1); }
    const s = window.Chess.fromFen(fen);
    if (window.Chess.inCheck(s, ed.turn === 'w' ? 'b' : 'w')) return L("Le camp qui n'a pas le trait ne peut pas être en échec.", 'The side not to move cannot be in check.');
    const st = new Game(fen).status();
    if (st.over) return st.reason === 'mat' ? L('Cette position est déjà échec et mat.', 'This position is already checkmate.') : L('Cette position est déjà terminée (pat ou nulle).', 'This position is already over (stalemate or draw).');
    return '';
  }
  function openEditor(fen) {
    edLoad(fen || window.Chess.START_FEN);
    ed.level = setup.level; ed.mode = setup.mode === 'local' ? 'local' : 'ai';
    returnTo = 'home';
    renderEditor();
    show('editor');
  }
  function renderEditor() {
    const seg = (name, opts, cur) => `<div class="ed-seg" data-ed="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${v === cur ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const tool = (v, inner, label) => `<button type="button" class="ed-tool${ed.tool === v ? ' on' : ''}" data-tool="${v}" aria-label="${label}" title="${label}">${inner}</button>`;
    const castleBox = (c, label) => `<label class="ed-check${edCastleOk[c]() ? '' : ' off'}"><input type="checkbox" data-castle="${c}" ${ed.castle[c] && edCastleOk[c]() ? 'checked' : ''} ${edCastleOk[c]() ? '' : 'disabled'}> ${label}</label>`;
    const err = edError();
    $('editor-body').innerHTML = `
      <div class="ed-layout">
        <div class="ed-board-column">
          <p class="level-help">${L('Choisis une pièce puis touche les cases pour la poser. Avec la main, touche une pièce puis sa nouvelle case pour la déplacer.', 'Pick a piece, then tap squares to place it. With the hand, tap a piece and then its new square to move it.')}</p>
          <div class="ed-palette">${tool('move', '✋', L('Déplacer', 'Move'))}${ED_PIECES.slice(0, 6).map((p) => tool(p, `<span class="pc w">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
          <div class="ed-palette">${tool('erase', '⌫', L('Effacer', 'Erase'))}${ED_PIECES.slice(6).map((p) => tool(p, `<span class="pc b">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
          <div class="ed-board-wrap"><div id="ed-board" class="ed-board" role="grid" aria-label="${L('Échiquier à construire', 'Board to set up')}"></div></div>
        </div>
        <div class="ed-controls-column">
          <div class="ed-actions">
            <button type="button" class="btn" data-ed-act="start">${L('Position de départ', 'Starting position')}</button>
            <button type="button" class="btn" data-ed-act="clear">${L('Vider', 'Clear')}</button>
            <button type="button" class="btn" data-ed-act="flip">${L('Retourner', 'Flip')}</button>
          </div>
          <label class="field-label">${L('Trait aux', 'To move')}</label>
          ${seg('turn', [['w', L('Blancs', 'White')], ['b', L('Noirs', 'Black')]], ed.turn)}
          <label class="field-label">${L('Roques encore possibles', 'Castling still allowed')}</label>
          <div class="ed-castles">${castleBox('K', L('Blancs O-O', 'White O-O'))}${castleBox('Q', L('Blancs O-O-O', 'White O-O-O'))}${castleBox('k', L('Noirs O-O', 'Black O-O'))}${castleBox('q', L('Noirs O-O-O', 'Black O-O-O'))}</div>
          <label class="field-label">${L('Adversaire', 'Opponent')}</label>
          ${seg('mode', [['ai', L('Ordinateur', 'Computer')], ['local', L('Deux joueurs', 'Two players')]], ed.mode)}
          <div ${ed.mode === 'ai' ? '' : 'hidden'}>
            <label class="field-label">${L('Ta couleur', 'Your colour')}</label>
            ${seg('color', [['w', L('Blancs', 'White')], ['b', L('Noirs', 'Black')]], ed.color)}
            <label class="field-label">${L('Niveau', 'Level')} : <strong>${LEVEL_NAMES[ed.level]} (Elo ${LEVEL_ELO[ed.level]})</strong></label>
            <div id="ed-level-grid" class="level-grid" role="radiogroup" aria-label="${L('Niveau', 'Level')}">${levelGridHtml(ed.level)}</div>
          </div>
          <p class="ed-error" role="status">${escHtml(err)}</p>
          <button type="button" id="ed-play" class="btn primary wide" ${err ? 'disabled' : ''}>${L('Jouer cette position', 'Play this position')}</button>
          <p class="level-help">${L('Une partie jouée depuis une position libre ne compte pas pour ton Elo ni pour débloquer les niveaux.', 'A game played from a custom position does not count for your Elo or for unlocking levels.')}</p>
        </div>
      </div>`;
    renderEdBoard();
  }
  function renderEdBoard() {
    const el = $('ed-board'); if (!el) return;
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = ed.flip ? 63 - i : i, p = ed.board[sq], row = i >> 3, col = i & 7;
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      html += `<button type="button" class="sq ${dark ? 'd' : 'l'}${sq === ed.from ? ' sel' : ''}" data-sq="${sq}" aria-label="${sqName(sq)}${p ? ' ' + pieceName(p) : ''}">`
        + (row === 7 ? `<span class="coord f bottom">${sqName(sq)[0]}</span>` : '') + (col === 0 ? `<span class="coord r left">${sqName(sq)[1]}</span>` : '')
        + (p ? `<span class="pc ${colorOf(p)}">${glyph(p)}</span>` : '') + '</button>';
    }
    el.innerHTML = html;
  }
  function edTap(sq) {
    if (ed.tool === 'erase') ed.board[sq] = null;
    else if (ed.tool === 'move') {
      if (ed.from < 0) { if (ed.board[sq]) ed.from = sq; renderEdBoard(); return; }
      if (sq !== ed.from) { ed.board[sq] = ed.board[ed.from]; ed.board[ed.from] = null; }
      ed.from = -1;
    } else {
      const p = ed.tool;
      if (p.toLowerCase() === 'p' && (sq < 8 || sq >= 56)) return toast(L('Un pion ne peut pas être sur la première ou la dernière rangée.', 'A pawn cannot stand on the first or last rank.'));
      // un seul roi par camp : poser un roi déplace l'ancien
      if (p.toLowerCase() === 'k') { const old = ed.board.indexOf(p); if (old >= 0) ed.board[old] = null; }
      ed.board[sq] = ed.board[sq] === p ? null : p;
    }
    renderEditor();
  }
  $('editor-body').addEventListener('click', (e) => {
    const cell = e.target.closest('#ed-board [data-sq]');
    if (cell) return edTap(Number(cell.dataset.sq));
    const t = e.target.closest('[data-tool]');
    if (t) { ed.tool = t.dataset.tool; ed.from = -1; return renderEditor(); }
    const s = e.target.closest('.ed-seg [data-value]');
    if (s) { ed[s.parentElement.dataset.ed] = s.dataset.value; return renderEditor(); }
    const lv = e.target.closest('#ed-level-grid button[data-level]');
    if (lv && !lv.disabled) { ed.level = +lv.dataset.level; return renderEditor(); }
    const act = e.target.closest('[data-ed-act]');
    if (act) {
      const a = act.dataset.edAct;
      if (a === 'start') edLoad(window.Chess.START_FEN);
      else if (a === 'clear') { ed.board = new Array(64).fill(null); ed.from = -1; }
      else if (a === 'flip') ed.flip = !ed.flip;
      return renderEditor();
    }
    if (e.target.id === 'ed-play') {
      if (edError()) return;
      const fen = edFen();
      store.set('editorFen', fen);
      startGame({ mode: ed.mode, playerColor: ed.mode === 'local' ? 'w' : ed.color, level: ed.level, fen }, [], null, ed.mode === 'local' ? ed.flip : ed.color === 'b');
    }
  });
  $('editor-body').addEventListener('change', (e) => {
    const c = e.target.closest('[data-castle]');
    if (c) { ed.castle[c.dataset.castle] = c.checked; renderEditor(); }
  });
  $('btn-editor').onclick = () => openEditor(store.get('editorFen', null));
  /* ---------- En ligne : compte, progression sauvegardée, invitations et parties à distance ---------- */
  const ON = window.Online;
  const TC_LABELS = L({ unlim: '3 jours par coup', '7d': '3 jours par coup', '3d': '3 jours par coup', '1d': '1 jour par coup', pm60: '1 minute par coup', pm30: '30 secondes par coup', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' },
    { unlim: '3 days per move', '7d': '3 days per move', '3d': '3 days per move', '1d': '1 day per move', pm60: '1 minute per move', pm30: '30 seconds per move', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' });
  const announced = new Set();
  let justSignedUp = false, progressDirty = false, progressRev = 0, progressPushing = false, inviteStop = null, gamesStop = null, onlineInvites = { in: [], out: [] }, onlineGames = [];
  const SKIP_SYNC = new Set(['lastScreen', 'onlineSession', 'onlineSynced', 'progressDirty', 'progressAt', 'progressEditAt', 'deviceId']);
  // toute modification de la progression sera envoyée au compte
  const rawSet = store.set.bind(store);
  // Progression modifiée mais pas encore envoyée : retenu sur l'appareil, pour être envoyé même après
  // une coupure de connexion ou une fermeture de l'appli (à la prochaine connexion)
  store.set = (key, value) => {
    rawSet(key, value);
    if (SKIP_SYNC.has(key)) return;
    progressDirty = true; progressRev++;
    if (!store.get('progressDirty', false)) rawSet('progressDirty', true);
    rawSet('progressEditAt', Date.now());
    // envoi rapide pour que les autres appareils du compte voient la même chose (écran Reprendre compris)
    clearTimeout(pushSoon); pushSoon = setTimeout(() => pushProgress(), 4000);
  };
  let pushSoon = null;
  const deviceId = store.get('deviceId', null) || (() => { const id = Math.random().toString(36).slice(2, 10); rawSet('deviceId', id); return id; })();
  progressDirty = store.get('progressDirty', false);
  function localProgress() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cavalier.') && !SKIP_SYNC.has(k.slice(9))) { try { data[k.slice(9)] = JSON.parse(localStorage.getItem(k)); } catch { /* ignoré */ } }
    }
    return data;
  }
  const hasProgress = (d) => !!(d && ((d.archive && d.archive.length) || (d.stats && Object.keys(d.stats).length) || (d.pzdone && Object.keys(d.pzdone).length) || (d.coach && d.coach.themes && Object.keys(d.coach.themes).length)));
  function replaceLocal(data) {
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('cavalier.') && !SKIP_SYNC.has(k.slice(9))) localStorage.removeItem(k); }
    for (const [k, v] of Object.entries(data || {})) rawSet(k, v);
  }
  async function pushProgress() {
    if (!ON || !ON.user || !progressDirty || progressPushing) { renderSyncStatus(); return; }
    // on n'envoie que la progression qui appartient au compte connecté
    if (store.get('onlineSynced', null) !== ON.user.uid) { renderSyncStatus('local'); return; }
    if (!navigator.onLine) { renderSyncStatus('offline'); return; }
    // le drapeau n'est levé qu'une fois l'envoi confirmé par le serveur (hors connexion, l'envoi attend)
    progressPushing = true;
    renderSyncStatus('pending');
    const rev = progressRev;
    let failed = false;
    try {
      const at = Date.now();
      await ON.saveProgress(localProgress(), at, deviceId);
      rawSet('progressAt', at);
      if (rev === progressRev) { progressDirty = false; rawSet('progressDirty', false); }
    } catch {
      failed = true;
      renderSyncStatus('error');
    }
    progressPushing = false;
    if (!progressDirty) renderSyncStatus('synced');
    else {
      renderSyncStatus(failed ? 'error' : 'pending');
      clearTimeout(pushSoon);
      pushSoon = setTimeout(() => pushProgress(), failed ? 10000 : 1500);
    }
  }
  setInterval(pushProgress, 45000);
  window.addEventListener('online', () => pushProgress());
  window.addEventListener('offline', () => renderSyncStatus('offline'));
  setInterval(() => { if (ON && ON.user && document.visibilityState === 'visible') ON.presence(); }, 60000);
  window.addEventListener('pagehide', pushProgress);
  // Après connexion : récupère la progression du compte, ou propose d'importer celle de l'appareil
  // Progression enregistrée par un autre appareil du même compte : on la reprend ici si elle est plus récente
  let progressStop = null;
  function watchCloudProgress() {
    if (progressStop) progressStop();
    progressStop = ON.watchProgress(({ data, updatedAt, device }) => {
      if (!data || device === deviceId || updatedAt <= store.get('progressAt', 0)) return;
      if (store.get('onlineSynced', null) !== (ON.user && ON.user.uid)) return; // première connexion : gérée par syncAfterLogin
      // modifications locales plus récentes pas encore envoyées : elles l'emportent (elles partent juste après)
      if (progressDirty && store.get('progressEditAt', 0) > updatedAt) { pushProgress(); return; }
      replaceLocal({ ...data, settings: store.get('settings', data.settings || {}) });
      rawSet('progressAt', updatedAt);
      progressDirty = false; rawSet('progressDirty', false);
      refreshHome();
      const scr = document.body.dataset.screen;
      if (scr === 'welcome') renderWelcome();
      if (scr === 'profile') openProfile();
      if (scr === 'train') renderTrain();
    });
  }
  // Chaque compte garde ses propres données : la progression locale appartient au compte « onlineSynced »
  // (ou à un joueur sans compte si ce champ est vide) et n'est jamais donnée à un autre compte.
  function wipeLocalProgress() {
    replaceLocal({ settings: store.get('settings', {}) });
    progressDirty = false; rawSet('progressDirty', false); rawSet('progressAt', 0); rawSet('progressEditAt', 0);
  }
  // progression pas encore envoyée d'un compte (hors connexion) : mise de côté pour ce seul compte
  const backupKey = (uid) => `cavalierbackup.${uid}`;
  function backupFor(uid) { try { localStorage.setItem(backupKey(uid), JSON.stringify(localProgress())); } catch { /* stockage plein */ } }
  let syncingUid = null;
  async function syncAfterLogin(user, profile) {
    // l'événement de connexion peut arriver deux fois : une seule synchronisation à la fois par compte
    if (syncingUid === user.uid) return;
    syncingUid = user.uid;
    try { await syncAfterLoginNow(user, profile); } finally { syncingUid = null; }
  }
  async function syncAfterLoginNow(user, profile) {
    const owner = store.get('onlineSynced', null);
    if (owner && owner !== user.uid) {
      // données d'un autre compte sur cet appareil : mises de côté pour lui, jamais reprises par ce compte
      if (progressDirty) backupFor(owner);
      wipeLocalProgress(); rawSet('onlineSynced', null);
    }
    let backup = null;
    try { backup = JSON.parse(localStorage.getItem(backupKey(user.uid)) || 'null'); } catch { backup = null; }
    if (backup) {
      // progression de ce compte restée sur l'appareil après une déconnexion hors ligne : on la renvoie
      localStorage.removeItem(backupKey(user.uid));
      replaceLocal({ ...backup, settings: store.get('settings', backup.settings || {}) });
      rawSet('onlineSynced', user.uid); rawSet('progressEditAt', Date.now());
      progressDirty = true; await pushProgress();
      location.reload();
      return;
    }
    const local = localProgress();
    let cloud = null;
    try { cloud = await ON.loadProgress(); } catch { cloud = null; }
    const synced = store.get('onlineSynced', null) === user.uid;
    const name = profile && profile.pseudo;
    if (name) { const p = playerProfile(); p.name = name; p.nameAsked = true; store.set('player', p); }
    // progression faite hors connexion sur cet appareil : envoyée maintenant
    if (synced && cloud) { if (progressDirty) pushProgress(); refreshHome(); return; }
    if (!hasProgress(cloud) && hasProgress(local)) {
      modal({ title: L('Garder ta progression ?', 'Keep your progress?'),
        text: L('Cet appareil contient déjà une progression (parties, problèmes, niveaux). Veux-tu l\'importer dans ton compte ?', 'This device already holds progress (games, puzzles, levels). Do you want to import it into your account?'),
        actions: [
          { label: L('Importer ma progression', 'Import my progress'), primary: true, onClick: async () => { rawSet('onlineSynced', user.uid); progressDirty = true; await pushProgress(); toast(L('Progression importée dans ton compte.', 'Progress imported into your account.')); } },
          { label: L('Repartir de zéro', 'Start from scratch'), ghost: true, onClick: async () => { const keep = { settings: store.get('settings', {}), player: store.get('player', {}) }; replaceLocal(keep); rawSet('onlineSynced', user.uid); progressDirty = true; await pushProgress(); location.reload(); } },
        ] });
      return;
    }
    if (hasProgress(cloud) && !synced) {
      // la progression du compte remplace celle de l'appareil
      replaceLocal({ ...cloud, settings: store.get('settings', cloud.settings || {}) });
      rawSet('onlineSynced', user.uid);
      if (name) { const p = playerProfile(); p.name = name; rawSet('player', p); }
      location.reload();
      return;
    }
    rawSet('onlineSynced', user.uid);
    progressDirty = true; pushProgress();
    refreshHome();
  }
  async function onUserChange(user, profile) {
    rawSet('onlineSession', !!user);
    renderSyncStatus();
    clearTimeout(pushSoon); // un envoi prévu pour l'ancien compte ne part pas vers le nouveau
    if (user) await ON.loadAdminEmail();
    // compte suspendu par l'administrateur : déconnexion
    if (user && profile && profile.banned) {
      ON.signOut();
      modal({ title: L('Compte suspendu', 'Account suspended'), text: L('Ce compte a été suspendu par l’administrateur. Tu peux continuer à jouer sur cet appareil sans compte.', 'This account has been suspended by the administrator. You can keep playing on this device without an account.'), actions: [{ label: 'OK', primary: true }] });
      return;
    }
    // compte administrateur : pas de jeu, écran d'administration
    const admin = !!(user && ON.isAdminEmail());
    setAdminMode(admin);
    if (admin) {
      adminCache = null; adminSection = null;
      $('btn-account').textContent = L('Mon compte', 'My account');
      closeModal(); returnTo = 'home'; show('admin'); renderAdmin();
      ON.markAdmin();
      return;
    }
    // ancien compte administrateur redevenu joueur : il réapparaît dans la liste des joueurs
    if (user && profile && profile.admin) ON.markAdmin(false);
    $('btn-account').textContent = user ? L('Mon compte', 'My account') : L('Se connecter', 'Sign in');
    if (inviteStop) { inviteStop(); inviteStop = null; }
    if (gamesStop) { gamesStop(); gamesStop = null; }
    if (user) {
      syncAfterLogin(user, profile).finally(() => { watchCloudProgress(); renderSyncStatus(); });
      startTourWatch();
      ON.presence();
      let known = null;
      inviteStop = ON.watchInvites((all) => {
        onlineInvites = all;
        const ids = all.in.map((i) => i.id);
        if (known) for (const inv of all.in) if (!known.includes(inv.id)) toast(L(`${inv.fromName} t'invite à une partie (${TC_LABELS[inv.tc]}).`, `${inv.fromName} invites you to a game (${TC_LABELS[inv.tc]}).`));
        known = ids;
        updateOnlineBadge();
        if (document.body.dataset.screen === 'welcome') renderWelcome();
        if (document.body.dataset.screen === 'online') renderOnline();
      });
      gamesStop = ON.watchGames((games) => {
        // parties en différé : prévenir quand l'adversaire a joué dans une autre partie que celle affichée
        const me = user.uid, prev = new Map(onlineGames.map((g) => [g.id, g.moves.length]));
        for (const g of games) {
          const was = prev.get(g.id), myTurn = g.status === 'active' && (g.moves.length % 2 === 0) === (g.white === me);
          const shown = cfg && cfg.mode === 'online' && cfg.online && cfg.online.id === g.id;
          if (was != null && g.moves.length > was && myTurn && !shown) toast(L(`${g.white === me ? g.blackName : g.whiteName} a joué : à toi de jouer.`, `${g.white === me ? g.blackName : g.whiteName} has moved: your turn.`));
        }
        onlineGames = games;
        renderOnlineSwitch();
        for (const g of games) {
          if (g.status !== 'active') continue;
          const side = g.moves.length % 2 === 0 ? 'w' : 'b', left = onlineTimeLeft(g, side);
          if (left != null && left <= 0) ON.endGame(g.id, side === 'w' ? '0-1' : '1-0', 'temps');
        }
        updateOnlineBadge();
        if (document.body.dataset.screen === 'online') renderOnline();
        if (document.body.dataset.screen === 'welcome') renderWelcome();
        // une invitation que j'ai envoyée vient d'être acceptée : la partie s'ouvre
        const fresh = games.find((g) => !g.tournamentId && g.status === 'active' && !g.moves.length && g.createdAt > Date.now() - 20000 && !(cfg && cfg.online && cfg.online.id === g.id));
        for (const g of games) if (g.tournamentId && g.status === 'active' && !g.moves.length && g.createdAt > Date.now() - 20000 && !announced.has(g.id)) {
          announced.add(g.id);
          toast(L(`${g.tournamentName} : ta partie de la ronde ${g.round} est prête.`, `${g.tournamentName}: your round ${g.round} game is ready.`));
        }
        if (fresh && document.body.dataset.screen === 'online') openOnlineGame(fresh);
      });
    } else { onlineInvites = { in: [], out: [] }; onlineGames = []; updateOnlineBadge(); stopTourWatch(); if (progressStop) { progressStop(); progressStop = null; } }
    if (document.body.dataset.screen === 'account') renderAccount();
    if (document.body.dataset.screen === 'online') renderOnline();
  }
  // Pendant une partie en ligne : les autres parties en cours, pour passer de l'une à l'autre
  function renderOnlineSwitch() {
    const box = $('online-switch');
    if (!box) return;
    const cur = cfg && cfg.mode === 'online' && cfg.online ? cfg.online.id : null;
    const me = ON && ON.user && ON.user.uid;
    const others = cur && me ? onlineGames.filter((g) => g.status === 'active' && g.id !== cur) : [];
    box.hidden = !others.length;
    if (!others.length) return;
    const mine = (g) => (g.moves.length % 2 === 0) === (g.white === me);
    others.sort((a, b) => mine(b) - mine(a) || b.lastMoveAt - a.lastMoveAt);
    box.innerHTML = `<b>${L('Mes autres parties', 'My other games')} (${others.length})</b>${others.map((g) => `<button class="btn switch-game${mine(g) ? ' hot' : ''}" type="button" data-switch-game="${g.id}"><span>${L('contre', 'vs')} ${escHtml(g.white === me ? g.blackName : g.whiteName)}</span><small>${mine(g) ? L('à toi de jouer', 'your move') : L('en attente', 'waiting')} · ${TC_LABELS[g.tc] || ''}</small></button>`).join('')}`;
  }
  $('online-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-switch-game]'); if (!b) return;
    const g = onlineGames.find((x) => x.id === b.dataset.switchGame);
    if (g) openOnlineGame(g);
  });
  /* ---------- Tournois proposés : pastilles et notification ---------- */
  // Un tournoi ouvert auquel je ne suis pas inscrit et que je n'ai pas encore vu : pastille sur « Jouer »,
  // sur « Tournois » et sur « Tournois ouverts », et une notification qui m'invite à m'inscrire.
  let newTours = [];
  function startTourWatch() {
    if (!ON || !ON.user || tourListStop) return;
    tourListStop = ON.watchTournaments((all) => {
      tourList = all;
      for (const t of all.mine) if (t.status === 'open' && t.deadline && Date.now() > t.deadline && !autoStarted.has(t.id)) { autoStarted.add(t.id); ON.startTournament(t.id, true).catch(() => {}); }
      // tournoi auquel je participe qui démarre : notification
      for (const t of all.mine) {
        const key = `tour-start:${t.id}`;
        if (t.status === 'running' && notifyWatchReady.tours && !notifySeen.has(key)) notifyUser(L('Le tournoi commence', 'The tournament is starting'), L(`« ${t.name} » a commencé : ta première partie t’attend.`, `“${t.name}” has started: your first game is waiting.`), key);
        if (t.status === 'running') notifySeen.add(key);
      }
      notifyWatchReady.tours = true;
      updateTourBadge();
      if (document.body.dataset.screen === 'tournaments' && !tourDoc) renderTournaments();
    });
  }
  /* ---------- Notifications : à toi de jouer, invitation, tournoi qui commence ---------- */
  // Affichées en silence quand l'appli est en arrière-plan (onglet caché ou appli installée réduite), si le joueur les a activées.
  const notifySeen = new Set(), notifyWatchReady = { games: false, tours: false };
  function notifyUser(title, body, tag) {
    if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
    const opts = { body, tag, icon: 'logo/logo-192.png', badge: 'logo/logo-192.png', silent: true }; // sans son ni vibration
    const fallback = () => { try { new Notification(title, opts); } catch { /* non disponible */ } };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(fallback);
    else fallback();
  }
  function stopTourWatch() { if (tourListStop) { tourListStop(); tourListStop = null; } tourList = { open: [], mine: [] }; newTours = []; updateTourBadge(); }
  function updateTourBadge() {
    const me = ON && ON.user && ON.user.uid, now = Date.now(), seen = store.get('toursSeen', []);
    newTours = me ? (tourList.open || []).filter((t) => t.owner !== me && !(t.members || []).includes(me) && (!t.deadline || t.deadline > now) && !seen.includes(t.id)) : [];
    const n = newTours.length;
    $('tour-badge').hidden = !n; $('tour-badge').textContent = n;
    updatePlayBadge();
    // une seule notification par tournoi
    const told = store.get('toursNotified', []), fresh = newTours.filter((t) => !told.includes(t.id));
    if (!fresh.length) return;
    store.set('toursNotified', [...told, ...fresh.map((t) => t.id)].slice(-200));
    notifyTours(fresh);
  }
  function markToursSeen() {
    const seen = store.get('toursSeen', []), ids = (tourList.open || []).map((t) => t.id).filter((id) => !seen.includes(id));
    if (ids.length) { store.set('toursSeen', [...seen, ...ids].slice(-300)); updateTourBadge(); }
  }
  function notifyTours(list) {
    const t = list[0];
    const title = list.length > 1 ? L(`${list.length} nouveaux tournois`, `${list.length} new tournaments`) : L('Nouveau tournoi', 'New tournament');
    const text = list.length > 1
      ? L(`Des tournois sont ouverts aux inscriptions, dont « ${t.name} ». Viens t’inscrire !`, `Tournaments are open for registration, including “${t.name}”. Come and sign up!`)
      : L(`« ${t.name} » est ouvert aux inscriptions${t.deadline ? ` jusqu’au ${fmtDeadline(t.deadline)}` : ''}. Viens t’inscrire !`, `“${t.name}” is open for registration${t.deadline ? ` until ${fmtDeadline(t.deadline)}` : ''}. Come and sign up!`);
    // notification du système si le joueur l'a déjà autorisée (appli en arrière-plan)
    try { if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') new Notification(title, { body: text, icon: 'logo/logo-192.png', tag: `tour-${t.id}` }); } catch { /* non disponible */ }
    // pendant une partie, simple message pour ne pas interrompre le jeu
    if (document.body.dataset.screen === 'game' || !$('modal').hidden) { toast(`🏆 ${title} : ${t.name}`); return; }
    modal({ title: `🏆 ${title}`, text, actions: [
      { label: L('Voir les tournois ouverts', 'See open tournaments'), primary: true, onClick: () => { $('btn-tournaments').click(); tourSection = 'open'; markToursSeen(); renderTournaments(); } },
      { label: L('Plus tard', 'Later'), ghost: true },
    ] });
  }
  function updatePlayBadge() {
    const n = (Number($('online-badge').textContent) || 0) * !$('online-badge').hidden + newTours.length;
    $('play-badge').hidden = !n; $('play-badge').textContent = n;
  }
  function updateOnlineBadge() {
    const me = ON.user && ON.user.uid;
    const turnGames = onlineGames.filter((g) => g.status === 'active' && ((g.moves.length % 2 === 0) === (g.white === me)));
    const myTurn = turnGames.length;
    // notifications : un nouveau coup de l'adversaire, une nouvelle invitation (pas au démarrage pour ce qui attendait déjà)
    for (const g of turnGames) {
      const key = `turn:${g.id}:${g.moves.length}`;
      if (notifyWatchReady.games && !notifySeen.has(key) && g.moves.length) notifyUser(L('À toi de jouer', 'Your move'), L(`${g.white === me ? g.blackName : g.whiteName} a joué. C’est ton tour.`, `${g.white === me ? g.blackName : g.whiteName} has moved. It’s your turn.`), `turn-${g.id}`);
      notifySeen.add(key);
    }
    for (const inv of onlineInvites.in) {
      const key = `inv:${inv.id}`;
      if (notifyWatchReady.games && !notifySeen.has(key)) notifyUser(L('Nouvelle invitation', 'New invitation'), L(`${inv.fromName || 'Un joueur'} t’invite à jouer une partie.`, `${inv.fromName || 'A player'} invites you to play a game.`), key);
      notifySeen.add(key);
    }
    notifyWatchReady.games = true;
    const n = onlineInvites.in.length + myTurn;
    $('online-badge').hidden = !n; $('online-badge').textContent = n;
    updatePlayBadge();
  }
  if (ON) {
    ON.onUser(onUserChange);
    if (store.get('onlineSession', false)) ON.load().catch(() => {});
  }
  const field = (id, label, type = 'text', value = '', extra = '') => `<label class="field-label" for="${id}">${label}</label><input id="${id}" class="profile-name-input" type="${type}" value="${escHtml(value)}" ${extra}>`;
  let accountMode = 'signin';
  function renderAccount() {
    const body = $('account-body'), u = ON && ON.user, p = ON && ON.profile;
    if (u) {
      body.innerHTML = `<p class="level-help">${L('Connecté avec', 'Signed in as')} <b>${escHtml(u.email)}</b>${p ? ` · ${L('pseudo', 'nickname')} <b>${escHtml(p.pseudo)}</b>` : ''}</p>
        ${field('acc-pseudo', L('Changer de pseudo', 'Change nickname'), 'text', p ? p.pseudo : '', 'maxlength="24" autocomplete="nickname"')}
        <button id="acc-save-pseudo" class="btn primary wide" type="button">${L('Enregistrer le pseudo', 'Save nickname')}</button>
        <div class="photo-row">${playerProfile().photo ? `<img class="profile-photo big" alt="" src="${playerProfile().photo}">` : ''}<button id="acc-photo" class="btn" type="button">${playerProfile().photo ? L('Changer ma photo', 'Change my photo') : L('Ajouter ma photo', 'Add my photo')}</button></div>
        ${field('acc-pw-old', L('Mot de passe actuel', 'Current password'), 'password', '', 'autocomplete="current-password"')}
        ${field('acc-pw-new', L('Nouveau mot de passe (6 caractères au moins)', 'New password (at least 6 characters)'), 'password', '', 'autocomplete="new-password"')}
        <button id="acc-save-pw" class="btn wide" type="button">${L('Changer le mot de passe', 'Change password')}</button>
        <button id="acc-logout" class="btn ghost wide" type="button">${L('Se déconnecter', 'Sign out')}</button>
        <p id="acc-msg" class="ed-error" role="status"></p>
        <details class="danger-zone"><summary>${L('Supprimer mon compte', 'Delete my account')}</summary>
          <p class="level-help">${L('Ton profil, ton pseudo, ta progression en ligne et tes invitations seront effacés définitivement. Les parties déjà jouées restent dans l’historique de tes adversaires. Cet appareil repart ensuite de zéro.', 'Your profile, nickname, online progress and invitations will be erased for good. Games already played stay in your opponents’ history. This device then starts from scratch.')}</p>
          ${field('acc-del-pw', L('Mot de passe, pour confirmer', 'Password, to confirm'), 'password', '', 'autocomplete="current-password"')}
          <button id="acc-delete" class="btn danger wide" type="button">${L('Supprimer définitivement mon compte', 'Delete my account permanently')}</button>
        </details>`;
    } else {
      const up = accountMode === 'signup';
      body.innerHTML = `<div class="ed-seg" id="acc-tabs"><button type="button" data-mode="signin" class="${up ? '' : 'on'}">${L('Se connecter', 'Sign in')}</button><button type="button" data-mode="signup" class="${up ? 'on' : ''}">${L('Créer un compte', 'Create an account')}</button></div>
        <p class="level-help">${up ? L('Ton compte garde ta progression sur tous tes appareils et te permet de jouer en ligne avec tes amis.', 'Your account keeps your progress on all your devices and lets you play online with your friends.') : L('Connecte-toi avec ton adresse e-mail et ton mot de passe.', 'Sign in with your e-mail address and password.')}</p>
        ${up ? field('acc-pseudo', L('Pseudo (visible par les autres joueurs)', 'Nickname (visible to other players)'), 'text', playerProfile().name || '', 'maxlength="24" autocomplete="nickname"') : ''}
        ${field('acc-email', L('Adresse e-mail', 'E-mail address'), 'email', '', 'autocomplete="email"')}
        ${field('acc-pw', L('Mot de passe', 'Password') + (up ? L(' (6 caractères au moins)', ' (at least 6 characters)') : ''), 'password', '', `autocomplete="${up ? 'new-password' : 'current-password'}"`)}
        <button id="acc-go" class="btn primary wide" type="button">${up ? L('Créer mon compte', 'Create my account') : L('Se connecter', 'Sign in')}</button>
        ${up ? '' : `<button id="acc-forgot" class="btn ghost wide" type="button">${L('Mot de passe oublié ?', 'Forgot your password?')}</button>`}
        <p id="acc-msg" class="ed-error" role="status"></p>`;
    }
  }
  const accMsg = (t, ok) => { const m = $('acc-msg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
  async function accountAction(fn, okText) {
    accMsg(L('Un instant…', 'One moment…'), true);
    try { await fn(); if (document.body.dataset.screen === 'account') renderAccount(); if (okText) accMsg(okText, true); } catch (e) { accMsg(ON.explain(e)); }
  }
  $('account-body').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const v = (id) => ($(id) ? $(id).value : '');
    if (t.dataset.mode) { accountMode = t.dataset.mode; renderAccount(); return; }
    if (t.id === 'acc-go') {
      if (accountMode === 'signup') accountAction(async () => { justSignedUp = true; await ON.signUp(v('acc-pseudo'), v('acc-email'), v('acc-pw'), store.get('onlineSynced', null) ? 600 : estimatedElo()); }, L('Compte créé, bienvenue !', 'Account created, welcome!'));
      else accountAction(() => ON.signIn(v('acc-email'), v('acc-pw')), L('Connecté !', 'Signed in!'));
    }
    // mot de passe oublié : un lien de renouvellement est envoyé par e-mail
    if (t.id === 'acc-forgot') {
      if (!v('acc-email')) { accMsg(L('Indique d\'abord ton adresse e-mail ci-dessus.', 'First enter your e-mail address above.')); return; }
      accountAction(() => ON.resetPassword(v('acc-email')), L('Un e-mail pour choisir un nouveau mot de passe vient de t\'être envoyé.', 'An e-mail to choose a new password has just been sent to you.'));
    }
    if (t.id === 'acc-save-pseudo') accountAction(async () => { const p = await ON.changePseudo(v('acc-pseudo')); const pl = playerProfile(); pl.name = p.pseudo; store.set('player', pl); refreshHome(); }, L('Pseudo enregistré.', 'Nickname saved.'));
    if (t.id === 'acc-save-pw') accountAction(() => ON.changePassword(v('acc-pw-old'), v('acc-pw-new')), L('Mot de passe changé.', 'Password changed.'));
    if (t.id === 'acc-photo') { pickPhoto(() => renderAccount()); return; }
    if (t.id === 'acc-delete') {
      const pw = v('acc-del-pw');
      if (!pw) { accMsg(L('Indique ton mot de passe pour confirmer.', 'Enter your password to confirm.')); return; }
      modal({ title: L('Supprimer ton compte ?', 'Delete your account?'), text: L('Cette action est définitive : ton profil, ton pseudo et ta progression en ligne seront effacés.', 'This cannot be undone: your profile, nickname and online progress will be erased.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => accountAction(async () => { await ON.deleteAccount(pw); wipeLocalProgress(); rawSet('onlineSynced', null); location.reload(); }, L('Ton compte a été supprimé.', 'Your account has been deleted.')) },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (t.id === 'acc-logout') accountAction(async () => {
      const uid = ON.user && ON.user.uid;
      await pushProgress();
      // ce qui n'a pas pu partir (hors connexion) est gardé pour ce compte seulement
      if (progressDirty && uid && store.get('onlineSynced', null) === uid) backupFor(uid);
      await ON.signOut();
      // l'appareil redevient vierge : rien de ce compte ne passe au suivant
      if (store.get('onlineSynced', null)) wipeLocalProgress();
      rawSet('onlineSynced', null);
      location.reload();
    }, L('Déconnecté.', 'Signed out.'));
  });
  function openAccount() { returnTo = 'home'; renderAccount(); show('account'); if (ON) ON.load().catch(() => accMsg(L('Impossible de joindre le serveur. Vérifie ta connexion.', 'Cannot reach the server. Check your connection.'))); }
  $('btn-account').onclick = openAccount;

  /* Jouer en ligne */
  function renderOnline() {
    const body = $('online-body'), u = ON && ON.user;
    if (!u) {
      body.innerHTML = `<p class="level-help">${L('Pour jouer en ligne avec un ami, connecte-toi ou crée un compte : tes amis t\'invitent avec ton pseudo.', 'To play online with a friend, sign in or create an account: your friends invite you with your nickname.')}</p><button id="on-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>`;
      return;
    }
    const me = u.uid, myName = (ON.profile && ON.profile.pseudo) || '';
    // plus de partie sans limite : chaque partie doit pouvoir se terminer
    const tcOptions = Object.keys(TC_LABELS).filter((k) => k !== 'unlim' && k !== '7d').map((k) => `<option value="${k}"${k === store.get('onlineTc', '10m') ? ' selected' : ''}>${TC_LABELS[k]}</option>`).join('');
    const inv = onlineInvites.in, out = onlineInvites.out;
    const active = onlineGames.filter((g) => g.status === 'active').sort((a, b) => b.lastMoveAt - a.lastMoveAt);
    const myTurn = active.filter((g) => (g.moves.length % 2 === 0) === (g.white === me)).length;
    if (!onlinePlayers) loadPlayers();
    const SECTIONS = [
      ['find', '🎲', L('Trouver un adversaire', 'Find an opponent'), null],
      ['players', '👥', L('Joueurs', 'Players'), onlinePlayers ? onlinePlayers.filter((p) => p.uid !== me && isConnected(p)).length : null],
      ['pseudo', '✉️', L('Inviter par pseudo', 'Invite by nickname'), null],
      ['in', '📥', L('Invitations reçues', 'Invitations received'), inv.length],
      ['out', '📤', L('Invitations envoyées', 'Invitations sent'), out.length],
      ['games', '♟️', L('Parties en cours', 'Games in progress'), active.length],
    ];
    if (!onlineSection) {
      body.innerHTML = `<p class="level-help">${L(`Ton pseudo : <b>${escHtml(myName)}</b>. Donne-le à tes amis pour qu'ils t'invitent.`, `Your nickname: <b>${escHtml(myName)}</b>. Give it to your friends so they can invite you.`)}</p>
        <div class="tour-menu">${SECTIONS.map(([id, icon, label, n]) => `<button class="btn tour-menu-btn" type="button" data-online-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}${id === 'players' && n != null ? `<small class="tour-menu-sub">${L('connectés', 'online')}</small>` : ''}${id === 'games' && myTurn ? `<small class="tour-menu-sub">${L(`à toi de jouer : ${myTurn}`, `your move: ${myTurn}`)}</small>` : ''}</b>${n != null ? `<span class="tour-menu-count${(id === 'in' && n) || (id === 'games' && myTurn) ? ' hot' : ''}">${n}</span>` : ''}</button>`).join('')}</div>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === onlineSection);
    const tcField = `<label class="field-label" for="on-tc">${L('Cadence', 'Time control')}</label><select id="on-tc" class="profile-name-input">${tcOptions}</select>`;
    let html = `<button class="btn ghost" type="button" data-online-section="">‹ ${L('Jouer en ligne', 'Play online')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (onlineSection === 'find') html += tcField + playersHtml('find') + '<p id="on-msg" class="ed-error" role="status"></p>';
    if (onlineSection === 'players') html += tcField + '<p id="on-msg" class="ed-error" role="status"></p>' + playersHtml('list');
    if (onlineSection === 'pseudo') html += `${field('on-pseudo', L('Pseudo du joueur', 'Player\'s nickname'), 'text', '', 'maxlength="24"')}${tcField}<button id="on-invite" class="btn primary wide" type="button">${L('Envoyer l\'invitation', 'Send the invitation')}</button><p id="on-msg" class="ed-error" role="status"></p>`;
    if (onlineSection === 'in') html += inv.length ? `<div class="replay-items">${inv.map((i) => `<div class="replay-row"><div class="btn replay-item"><strong>${escHtml(i.fromName)} (${i.fromElo})</strong><span>${TC_LABELS[i.tc]}</span></div><button class="btn primary" data-accept="${i.id}">${L('Accepter', 'Accept')}</button><button class="btn ghost" data-decline="${i.id}">✕</button></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune pour le moment.', 'None for now.')}</p>`;
    if (onlineSection === 'out') html += out.length ? `<div class="replay-items">${out.map((i) => `<div class="replay-row"><div class="btn replay-item"><strong>${escHtml(i.toName)} (${i.toElo})</strong><span>${TC_LABELS[i.tc]} · ${L('en attente', 'waiting')}</span></div><button class="btn ghost" data-cancel="${i.id}">${L('Annuler', 'Cancel')}</button></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune invitation en attente.', 'No pending invitation.')}</p>`;
    if (onlineSection === 'games') html += active.length ? `<div class="replay-items">${active.map((g) => {
      const white = g.white === me, opp = white ? `${g.blackName} (${g.blackElo})` : `${g.whiteName} (${g.whiteElo})`;
      const mine = (g.moves.length % 2 === 0) === white;
      return `<button class="btn replay-item" data-game="${g.id}"><strong>${L('contre', 'vs')} ${escHtml(opp)}${mine ? L(' · à toi de jouer', ' · your move') : ''}</strong><span>${TC_LABELS[g.tc]} · ${L('tu as les', 'you play')} ${white ? L('Blancs', 'White') : L('Noirs', 'Black')} · ${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}</span></button>`;
    }).join('')}</div>` : `<p class="level-help">${L('Aucune partie en cours.', 'No game in progress.')}</p>`;
    body.innerHTML = html;
  }
  $('online-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'on-login') return openAccount();
    const msg = (x, ok) => { const m = $('on-msg'); if (m) { m.textContent = x; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    if (t.dataset.onlineSection != null) { onlineSection = t.dataset.onlineSection || null; suggestedOpp = null; renderOnline(); return; }
    if (t.id === 'on-refresh') { loadPlayers(); return; }
    if (t.id === 'on-suggest') {
      if (!onlinePlayers) await loadPlayers();
      suggestedOpp = suggestOpponent();
      renderOnline();
      if (!suggestedOpp) msg(L('Aucun adversaire disponible pour le moment : réessaie plus tard.', 'No opponent available right now: try again later.'));
      return;
    }
    if (t.dataset.inviteUid) { await invitePlayer(t.dataset.inviteUid, msg); $('on-msg').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (t.dataset.mute) { toggleMute(t.dataset.mute); return; }
    if (t.id === 'on-invite') {
      const tc = $('on-tc').value; store.set('onlineTc', tc);
      msg(L('Envoi…', 'Sending…'), true);
      try { const o = await ON.invite($('on-pseudo').value, tc); msg(L(`Invitation envoyée à ${o.pseudo}. La partie s'ouvrira dès qu'il ou elle l'acceptera.`, `Invitation sent to ${o.pseudo}. The game will open as soon as they accept.`), true); } catch (err) { msg(ON.explain(err)); }
      return;
    }
    const find = (id) => [...onlineInvites.in, ...onlineInvites.out].find((i) => i.id === id);
    if (t.dataset.accept) { try { const id = await ON.answerInvite(find(t.dataset.accept), true); const g = onlineGames.find((x) => x.id === id); if (g) openOnlineGame(g); else toast(L('Partie créée : elle apparaît dans tes parties en cours.', 'Game created: it appears in your games in progress.')); } catch (err) { toast(ON.explain(err)); } }
    if (t.dataset.decline || t.dataset.cancel) { try { await ON.answerInvite(find(t.dataset.decline || t.dataset.cancel), false); } catch (err) { toast(ON.explain(err)); } }
    if (t.dataset.game) { const g = onlineGames.find((x) => x.id === t.dataset.game); if (g) openOnlineGame(g); }
  });
  /* ---------- Tournois en ligne : individuels ou par équipe ---------- */
  let tourSection = null, tourList = { open: [], mine: [] }, tourListStop = null, tourId = null, tourDoc = null, tourStop = null;
  const FORMAT_LABELS = L({ swiss: 'Système suisse', rr: 'Toutes rondes' }, { swiss: 'Swiss system', rr: 'Round robin' });
  const TYPE_LABELS = L({ solo: 'Individuel', team: 'Par équipe' }, { solo: 'Individual', team: 'Team' });
  const STATUS_LABELS = L({ open: 'inscriptions ouvertes', running: 'en cours', over: 'terminé', cancelled: 'annulé (pas assez d\'inscrits)' }, { open: 'registration open', running: 'in progress', over: 'finished', cancelled: 'cancelled (not enough players)' });
  // cadence : pendule (temps total) ou temps par coup
  const TC_GROUPS = { clock: ['10m', '5m', '2m', '1m'], move: ['pm30', 'pm60', '1d', '3d'] };
  let tourForm = { type: 'solo', teamMode: 'auto', format: 'swiss', tcKind: 'clock', tc: '10m', rounds: 5, teamSize: 4 };
  const fmtDeadline = (ms) => new Date(ms).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const localInput = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const autoStarted = new Set();
  const pName = (t, id) => (t.type === 'team' ? (t.teams.find((x) => x.id === id) || {}).name || '?' : t.names[id] || '?');
  function standings(t) {
    const ids = ON.participants(t);
    // départage : somme des points des adversaires rencontrés (Buchholz)
    const buch = (id) => (t.met[id] || []).reduce((s, o) => s + (t.scores[o] || 0), 0);
    return ids.map((id) => ({ id, pts: t.scores[id] || 0, buch: buch(id) })).sort((a, b) => b.pts - a.pts || b.buch - a.buch);
  }
  function renderTournaments() {
    const body = $('tour-body'), u = ON && ON.user;
    $('tour-title').textContent = tourDoc ? tourDoc.name : L('Tournois', 'Tournaments');
    const otbLink = `<button id="tour-otb" class="btn wide otb-link" type="button">♟️ ${L('Tournoi en réel, sur de vrais échiquiers', 'Over-the-board tournament, on real boards')}</button>`;
    if (!u) { body.innerHTML = `<p class="level-help">${L('Les tournois se jouent en ligne : connecte-toi ou crée un compte.', 'Tournaments are played online: sign in or create an account.')}</p><button id="tour-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>${otbLink}`; return; }
    if (tourDoc) { renderTournamentDetail(); return; }
    const seg = (name, opts) => `<div class="ed-seg" data-tour="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${String(tourForm[name]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const tcOpts = Object.keys(TC_LABELS).map((k) => `<option value="${k}"${k === tourForm.tc ? ' selected' : ''}>${TC_LABELS[k]}</option>`).join('');
    const card = (t) => `<button class="btn replay-item" data-tour-open="${t.id}"><strong>${escHtml(t.name)}</strong><span>${TYPE_LABELS[t.type]} · ${FORMAT_LABELS[t.format]} · ${TC_LABELS[t.tc] || ''} · ${ON.participants(t).length} ${t.type === 'team' ? L('équipe(s)', 'team(s)') : L('joueur(s)', 'player(s)')} · ${t.status === 'open' && t.deadline ? (Date.now() < t.deadline ? L(`inscriptions jusqu'au ${fmtDeadline(t.deadline)}`, `registration until ${fmtDeadline(t.deadline)}`) : L('inscriptions closes', 'registration closed')) : STATUS_LABELS[t.status]}</span></button>`;
    const mine = tourList.mine.slice().sort((a, b) => b.createdAt - a.createdAt), open = tourList.open.filter((t) => !t.members.includes(u.uid));
    const pub = tourList.public || [];
    const running = pub.filter((t) => t.status === 'running').sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    const history = pub.filter((t) => t.status === 'over').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)).slice(0, 30);
    const list = (arr, empty) => (arr.length ? `<div class="replay-items">${arr.map(card).join('')}</div>` : `<p class="level-help">${empty}</p>`);
    // menu : un bouton par rubrique, puis la rubrique choisie
    const SECTIONS = [
      ['mine', '🎟️', L('Mes tournois', 'My tournaments'), mine.length],
      ['code', '🔑', L('Rejoindre avec un code', 'Join with a code'), null],
      ['open', '📝', L('Tournois ouverts', 'Open tournaments'), open.length],
      ['live', '🔴', L('En direct', 'Live'), running.length],
      ['history', '📜', L('Historique', 'History'), history.length],
      ['create', '➕', L('Créer un tournoi', 'Create a tournament'), null],
    ];
    if (!tourSection) {
      body.innerHTML = `<div class="tour-menu">${SECTIONS.map(([id, icon, label, n]) => `<button class="btn tour-menu-btn" type="button" data-tour-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}</b>${n != null ? `<span class="tour-menu-count${id === 'open' && newTours.length ? ' hot' : ''}">${n}</span>` : ''}${id === 'open' && newTours.length ? `<small class="tour-menu-sub">${L(`${newTours.length} nouveau${newTours.length > 1 ? 'x' : ''}`, `${newTours.length} new`)}</small>` : ''}</button>`).join('')}</div>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === tourSection);
    let html = `<button class="btn ghost" type="button" data-tour-section="">‹ ${L('Tournois', 'Tournaments')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (tourSection === 'mine') html += list(mine, L('Aucun pour le moment.', 'None for now.'));
    if (tourSection === 'code') html += `${field('tour-code', L('Code du tournoi', 'Tournament code'), 'text', '', 'maxlength="6" style="text-transform:uppercase"')}<button id="tour-join-code" class="btn primary wide" type="button">${L('Rejoindre', 'Join')}</button><p id="tour-msg" class="ed-error" role="status"></p>`;
    if (tourSection === 'open') html += list(open, L('Aucun tournoi ouvert pour le moment.', 'No open tournament for now.'));
    if (tourSection === 'live') html += `<p class="level-help">${L('Tournois en cours : ouvre-en un pour regarder les parties en direct.', 'Tournaments in progress: open one to watch the games live.')}</p>` + list(running, L('Aucun tournoi en cours.', 'No tournament in progress.'));
    if (tourSection === 'history') html += list(history, L('Aucun tournoi terminé pour le moment.', 'No finished tournament yet.'));
    if (tourSection !== 'create') { body.innerHTML = html; return; }
    body.innerHTML = html + `
      ${seg('type', [['solo', TYPE_LABELS.solo], ['team', TYPE_LABELS.team]])}
      ${tourForm.type === 'team' ? `<label class="field-label">${L('Formation des équipes', 'How teams are formed')}</label>${seg('teamMode', [['auto', L('Équilibrées par niveau', 'Balanced by level')], ['made', L('Équipes déjà faites', 'Ready-made teams')]])}<p class="level-help">${tourForm.teamMode === 'auto' ? L('Chacun s\'inscrit seul ; au départ, les équipes sont formées automatiquement pour que leur niveau moyen soit le plus proche possible.', 'Everyone registers alone; at the start, teams are formed automatically so their average levels are as close as possible.') : L('Un capitaine crée son équipe et y ajoute ses coéquipiers par leur pseudo.', 'A captain creates the team and adds teammates by nickname.')}</p>` : ''}
      ${field('tour-name', L('Nom du tournoi', 'Tournament name'), 'text', tourForm.name || '', 'maxlength="40"')}
      ${field('tour-deadline', L('Date limite d\'inscription (le tournoi démarre à ce moment-là)', 'Registration deadline (the tournament starts then)'), 'datetime-local', localInput(tourForm.deadline || Date.now() + 86400000))}
      <label class="field-label">${L('Format', 'Format')}</label>${seg('format', [['swiss', FORMAT_LABELS.swiss], ['rr', FORMAT_LABELS.rr]])}
      ${tourForm.format === 'swiss' ? `<label class="field-label">${L('Nombre de rondes', 'Number of rounds')}</label>${seg('rounds', [[3, '3'], [4, '4'], [5, '5'], [7, '7']])}` : ''}
      ${tourForm.type === 'team' ? `<label class="field-label">${L('Joueurs par équipe', 'Players per team')}</label>${seg('teamSize', [[2, '2'], [3, '3'], [4, '4']])}` : ''}
      <label class="field-label">${L('Cadence', 'Time control')}</label>${seg('tcKind', [['clock', L('Pendule', 'Clock')], ['move', L('Temps par coup', 'Time per move')]])}
      <div style="margin-top:8px">${seg('tc', (TC_GROUPS[tourForm.tcKind] || TC_GROUPS.clock).map((k) => [k, TC_LABELS[k]]))}</div>
      <button id="tour-create" class="btn primary wide" type="button">${L('Créer le tournoi', 'Create the tournament')}</button>
      <p id="tour-msg" class="ed-error" role="status"></p>`;
  }
  // Tableau du tournoi, dans la forme la plus adaptée : grille croisée pour les toutes rondes,
  // tableau ronde par ronde (couleur, rang de l'adversaire, résultat) pour le système suisse
  function tourTable(t, me) {
    const ids = t.players, rounds = Object.keys(t.pairings).map((k) => Number(k.slice(1))).sort((a, b) => a - b);
    // pour chaque joueur et chaque ronde : la liste de ses parties (aller et retour)
    const per = {}; ids.forEach((id) => { per[id] = {}; });
    for (const r of rounds) for (const m of t.pairings[`r${r}`]) {
      if (m.bye) { per[m.a][r] = [{ bye: true, pts: 2 }]; continue; }
      for (const g of m.games) {
        const sw = g.result === '1-0' ? 1 : g.result === '0-1' ? 0 : g.result ? 0.5 : null;
        (per[g.white][r] = per[g.white][r] || []).push({ opp: g.black, color: 'w', pts: sw });
        (per[g.black][r] = per[g.black][r] || []).push({ opp: g.white, color: 'b', pts: sw == null ? null : 1 - sw });
      }
    }
    const all = (id) => Object.values(per[id]).flat();
    const pts = (id) => all(id).reduce((s, x) => s + (x.pts || 0), 0);
    const opps = (id) => [...new Set(all(id).filter((x) => x.opp).map((x) => x.opp))];
    const buch = (id) => opps(id).reduce((s, o) => s + pts(o), 0);
    const order = ids.slice().sort((a, b) => pts(b) - pts(a) || buch(b) - buch(a) || (t.elos[b] || 0) - (t.elos[a] || 0));
    const rank = (id) => order.indexOf(id) + 1;
    const fmt = (x) => (x == null ? '…' : x === 0.5 ? '½' : String(x));
    const n = (x) => NUM(x, x % 1 ? 1 : 0);
    const sum = (list) => (list.some((x) => x.pts == null) ? null : list.reduce((s, x) => s + x.pts, 0));
    const title = t.status === 'over' ? L('Classement final', 'Final standings') : t.status === 'cancelled' ? L('Tournoi annulé', 'Tournament cancelled') : L('Tableau du tournoi', 'Tournament table');
    let html = `<h3 class="train-h">${title}</h3><div class="tour-scroll"><table class="tour-table">`;
    if (t.format === 'rr') {
      // grille croisée : résultats des deux parties (Blancs puis Noirs) du joueur de la ligne contre celui de la colonne
      html += `<tr><th>#</th><th>${L('Joueur', 'Player')}</th>${order.map((_, i) => `<th class="c">${i + 1}</th>`).join('')}<th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>`;
      html += order.map((id, i) => `<tr${id === me ? ' class="me"' : ''}><td>${i + 1}</td><td><a href="#" data-profile="${id}">${escHtml(t.names[id] || '?')}</a></td>${order.map((o) => {
        if (o === id) return '<td class="c x">■</td>';
        const games = all(id).filter((x) => x.opp === o).sort((x, y) => (x.color === 'w' ? -1 : 1) - (y.color === 'w' ? -1 : 1));
        return `<td class="c">${games.map((x) => fmt(x.pts)).join(' ')}</td>`;
      }).join('')}<td><b>${n(pts(id))}</b></td><td>${n(buch(id))}</td></tr>`).join('');
    } else {
      // suisse : pour chaque ronde, rang de l'adversaire et points marqués sur les deux parties
      html += `<tr><th>#</th><th>${L('Joueur', 'Player')}</th><th>Elo</th>${rounds.map((r) => `<th class="c">R${r}</th>`).join('')}<th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>`;
      html += order.map((id, i) => `<tr${id === me ? ' class="me"' : ''}><td>${i + 1}</td><td><a href="#" data-profile="${id}">${escHtml(t.names[id] || '?')}</a></td><td>${t.elos[id] || 600}</td>${rounds.map((r) => {
        const list = per[id][r];
        if (!list) return '<td class="c"></td>';
        if (list[0].bye) return `<td class="c">${L('exempt', 'bye')} 2</td>`;
        return `<td class="c">${L('c.', 'vs')} ${rank(list[0].opp)} : ${fmt(sum(list))}</td>`;
      }).join('')}<td><b>${n(pts(id))}</b></td><td>${n(buch(id))}</td></tr>`).join('');
    }
    html += '</table></div>';
    html += `<p class="level-help">${t.format === 'rr' ? L('Chaque rencontre se joue en deux parties, une avec chaque couleur : la case montre le résultat avec les Blancs, puis avec les Noirs.', 'Each pairing is played over two games, one with each colour: the square shows the result with White, then with Black.') : L('Chaque ronde se joue en deux parties, une avec chaque couleur : « c. 3 : 1½ » veut dire 1 point et demi marqué contre le 3e du classement ; … partie en cours.', 'Each round is played over two games, one with each colour: “vs 3: 1½” means 1.5 points scored against the 3rd in the standings; … game in progress.')}</p>`;
    return html;
  }
  function renderTournamentDetail() {
    const t = tourDoc, me = ON.user.uid, body = $('tour-body');
    const isOwner = t.owner === me, myTeam = t.type === 'team' ? t.teams.find((x) => x.members.includes(me)) : null;
    const inIt = t.type === 'team' && t.teamMode !== 'auto' ? !!myTeam : t.players.includes(me);
    let html = `<button id="tour-back" class="btn ghost" type="button">‹ ${L('Tous les tournois', 'All tournaments')}</button>
      <p class="level-help">${TYPE_LABELS[t.type]} · ${FORMAT_LABELS[t.format]}${t.format === 'swiss' ? ` · ${t.rounds} ${L('rondes', 'rounds')}` : ''} · ${TC_LABELS[t.tc] || ''}${t.type === 'team' ? ` · ${t.teamSize} ${L('joueurs par équipe', 'players per team')}` : ''}<br>
      ${L('Organisé par', 'Organised by')} <b>${escHtml(t.ownerName)}</b> · ${STATUS_LABELS[t.status]}${t.status === 'running' ? ` · ${L('ronde', 'round')} ${t.round}/${t.totalRounds || t.rounds}` : ''}<br>
      ${t.status === 'open' && t.deadline ? `${L('Inscriptions jusqu\'au', 'Registration until')} <b>${fmtDeadline(t.deadline)}</b><br>` : ''}
      ${L('Code à partager', 'Code to share')} : <b class="tour-code">${t.code}</b></p>`;
    // date limite passée : le premier inscrit qui ouvre le tournoi le lance
    if (t.status === 'open' && t.deadline && Date.now() > t.deadline && t.members.includes(me) && !autoStarted.has(t.id)) { autoStarted.add(t.id); ON.startTournament(t.id, true).catch(() => {}); }
    if (t.status === 'open') {
      if (t.type === 'solo' || t.teamMode === 'auto') {
        if (t.type === 'team') html += `<p class="level-help">${L(`Équipes de ${t.teamSize} formées automatiquement au départ, de niveau moyen équivalent.`, `Teams of ${t.teamSize} formed automatically at the start, with equivalent average levels.`)}</p>`;
        html += `<h3 class="train-h">${L('Joueurs inscrits', 'Registered players')} (${t.players.length})</h3><div class="replay-items">${t.players.map((p) => `<button type="button" class="btn replay-item" data-profile="${p}"><strong>${escHtml(t.names[p] || '?')} (${t.elos[p] || 600})</strong><span>${L('voir le profil', 'see profile')}</span></button>`).join('')}</div>`;
        html += inIt ? `<button id="tour-leave" class="btn ghost wide" type="button">${L('Me désinscrire', 'Withdraw')}</button>` : `<button id="tour-join" class="btn primary wide" type="button">${L('M\'inscrire', 'Register')}</button>`;
      } else {
        html += `<h3 class="train-h">${L('Équipes', 'Teams')} (${t.teams.length})</h3>` + (t.teams.length ? `<div class="replay-items">${t.teams.map((tm) => `<div class="btn replay-item"><strong>${escHtml(tm.name)} (${tm.members.length}/${t.teamSize})</strong><span>${tm.members.map((m, i) => `${i + 1}. ${escHtml(t.names[m] || '?')}${m === tm.captain ? L(' (capitaine)', ' (captain)') : ''}`).join(' · ')}</span></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune équipe pour le moment.', 'No team yet.')}</p>`);
        if (myTeam && myTeam.captain === me && myTeam.members.length < t.teamSize) html += `${field('tour-mate', L('Ajouter un coéquipier (pseudo)', 'Add a teammate (nickname)'), 'text', '', 'maxlength="24"')}<button id="tour-add-mate" class="btn wide" type="button">${L('Ajouter à mon équipe', 'Add to my team')}</button>`;
        if (!myTeam) html += `${field('tour-team', L('Nom de ton équipe', 'Your team name'), 'text', '', 'maxlength="30"')}<button id="tour-create-team" class="btn primary wide" type="button">${L('Créer mon équipe (j\'en serai le capitaine)', 'Create my team (I will be captain)')}</button>`;
        else if (myTeam.captain !== me) html += `<button id="tour-leave" class="btn ghost wide" type="button">${L('Quitter mon équipe', 'Leave my team')}</button>`;
      }
      if (isOwner) html += `<button id="tour-start" class="btn primary wide" type="button">${L('Lancer le tournoi', 'Start the tournament')}</button>`;
    } else {
      if (t.type === 'team') html += `<h3 class="train-h">${L('Équipes', 'Teams')}</h3><div class="replay-items">${t.teams.map((tm) => `<div class="btn replay-item"><strong>${escHtml(tm.name)}${tm.elo ? ` · Elo ${L('moyen', 'avg')} ${tm.elo}` : ''}</strong><span>${tm.members.map((m, i) => `${L('éch.', 'bd')} ${i + 1} : ${escHtml(t.names[m] || '?')} (${t.elos[m] || 600})`).join(' · ')}</span></div>`).join('')}</div>`;
      // ronde en cours : mes parties, puis tous les appariements
      const round = t.pairings[`r${t.round}`] || [];
      const myGames = [];
      round.forEach((m) => m.games.forEach((g) => { if ((g.white === me || g.black === me) && !g.result) myGames.push(g); }));
      if (t.status === 'running' && myGames.length) html += myGames.map((g) => `<button class="btn primary wide" data-tour-game="${g.id}">${L(`Jouer ma partie ${g.leg === 2 ? 'retour' : 'aller'} de la ronde ${t.round}`, `Play my round ${t.round} ${g.leg === 2 ? 'return' : 'first'} game`)} : ${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])}</button>`).join('');
      const res = (r) => (r ? r.replace('1/2-1/2', '½-½') : '…');
      html += `<h3 class="train-h">${t.status === 'over' ? L('Dernière ronde', 'Last round') : L(`Ronde ${t.round}`, `Round ${t.round}`)}</h3><div class="replay-items">${round.map((m) => m.bye
        ? `<div class="btn replay-item"><strong>${escHtml(pName(t, m.a))}</strong><span>${L('exempt (gagne le point)', 'bye (wins the point)')}</span></div>`
        : `<div class="btn replay-item"><strong>${escHtml(pName(t, m.a))} – ${escHtml(pName(t, m.b))}</strong>${m.games.map((g) => `<span class="tour-game">${t.type === 'team' ? `${L('éch.', 'bd')} ${g.board || 1} · ` : ''}${g.leg === 2 ? L('retour', 'return') : L('aller', 'first')} : ${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])} ${res(g.result)} <button type="button" class="btn ghost tour-watch" data-watch="${g.id}">${g.result ? L('Revoir', 'Replay') : L('Regarder', 'Watch')}</button></span>`).join('')}${isLiveTc(t) && m.games.length < (m.expected || 0) ? `<span class="tour-game">${L('retour : après la partie aller', 'return: after the first game')}</span>` : ''}</div>`).join('')}</div>`;
      // rondes précédentes, à revoir
      const past = Object.keys(t.pairings).map((k) => Number(k.slice(1))).filter((r) => r !== t.round).sort((a, b) => b - a);
      if (past.length) html += `<h3 class="train-h">${L('Rondes précédentes', 'Previous rounds')}</h3><div class="replay-items">${past.map((r) => t.pairings[`r${r}`].filter((m) => !m.bye).map((m) => `<div class="btn replay-item"><strong>${L('Ronde', 'Round')} ${r} · ${escHtml(pName(t, m.a))} – ${escHtml(pName(t, m.b))}</strong>${m.games.map((g) => `<span class="tour-game">${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])} ${res(g.result)} <button type="button" class="btn ghost tour-watch" data-watch="${g.id}">${L('Revoir', 'Replay')}</button></span>`).join('')}</div>`).join('')).join('')}</div>`;
    }
    if (t.status !== 'open') html += t.type === 'solo' ? tourTable(t, me) : `<h3 class="train-h">${t.status === 'over' ? L('Classement final', 'Final standings') : L('Classement', 'Standings')}</h3><table class="tour-table"><tr><th>#</th><th>${L('Équipe', 'Team')}</th><th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>${standings(t).map((r, i) => `<tr${myTeam && myTeam.id === r.id ? ' class="me"' : ''}><td>${i + 1}</td><td>${escHtml(pName(t, r.id))}</td><td>${NUM(r.pts, r.pts % 1 ? 1 : 0)}</td><td>${NUM(r.buch, r.buch % 1 ? 1 : 0)}</td></tr>`).join('')}</table>`;
    html += `<p id="tour-msg" class="ed-error" role="status"></p>`;
    body.innerHTML = html;
  }
  function openTournament(id) {
    if (tourStop) tourStop();
    tourId = id; tourDoc = (tourList.mine.concat(tourList.open, tourList.public || [])).find((x) => x.id === id) || null;
    tourStop = ON.watchTournament(id, (t) => { tourDoc = t; if (document.body.dataset.screen === 'tournaments' && tourId === t.id) renderTournaments(); });
    renderTournaments();
  }
  function closeTournament() { if (tourStop) tourStop(); tourStop = null; tourId = null; tourDoc = null; renderTournaments(); }
  const isLiveTc = (t) => !!((ON.TIME_CONTROLS[t.tc] || {}).ms);
  let spectStop = null;
  function stopSpect() { if (spectStop) spectStop(); spectStop = null; }
  // Partie de tournoi suivie en direct (les coups arrivent au fur et à mesure) ou revue une fois finie
  function openSpectate(id) {
    stopSpect();
    const tid = tourId;
    let first = true;
    spectStop = ON.watchGame(id, (g) => {
      const label = `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}${g.status === 'active' ? L(' · en direct', ' · live') : ''}`;
      if (first) {
        first = false;
        startReplay({ moves: g.moves, result: g.result || '*', title: label, white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})` }, () => { stopSpect(); show('tournaments'); if (tid) openTournament(tid); });
        replay.liveId = id;
        if (g.moves.length) gotoPly(g.moves.length);
        return;
      }
      if (!replay || replay.liveId !== id) { stopSpect(); return; }
      if (g.moves.length > replay.moves.length) {
        const atEnd = replay.index === replay.moves.length;
        const probe = new Game(replay.fen), sans = [];
        for (const u of g.moves) { const r = probe.playUci(u); if (!r) break; sans.push(r.san); }
        replay.moves = g.moves.slice(0, sans.length); replay.sans = sans;
        if (atEnd) gotoPly(replay.moves.length, true); else render();
      }
      if (g.status === 'over') { replay.result = g.result; $('game-title').textContent = `Replay · ${label}`; render(); }
    });
  }
  $('tour-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tourSection != null) { tourSection = t.dataset.tourSection || null; if (tourSection === 'open') markToursSeen(); renderTournaments(); $('tour-body').scrollTop = 0; return; }
    if (t.dataset.watch) return openSpectate(t.dataset.watch);
    const msg = (x, ok) => { const m = $('tour-msg'); if (m) { m.textContent = x; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    const run = async (fn, ok) => { msg(L('Un instant…', 'One moment…'), true); try { await fn(); msg(ok || '', true); } catch (err) { msg(ON.explain(err)); } };
    const seg = t.closest('[data-tour]');
    if (seg && t.dataset.value) {
      const k = seg.dataset.tour;
      if ($('tour-deadline')) tourForm.deadline = new Date($('tour-deadline').value).getTime() || tourForm.deadline;
      if ($('tour-name')) tourForm.name = $('tour-name').value;
      tourForm[k] = /^\d+$/.test(t.dataset.value) ? Number(t.dataset.value) : t.dataset.value;
      if (k === 'tcKind') tourForm.tc = TC_GROUPS[t.dataset.value][0];
      renderTournaments(); return;
    }
    if (t.id === 'tour-login') return openAccount();
    if (t.id === 'tour-otb') return openOtb();
    if (t.id === 'tour-back') return closeTournament();
    if (t.dataset.tourOpen) return openTournament(t.dataset.tourOpen);
    if (t.id === 'tour-create') return run(async () => {
      const deadline = new Date($('tour-deadline').value).getTime();
      if (!(deadline > Date.now())) throw Object.assign(new Error(L('Choisis une date limite dans le futur.', 'Choose a deadline in the future.')), { code: 'deadline' });
      const tt = await ON.createTournament({ ...tourForm, name: $('tour-name').value, deadline });
      openTournament(tt.id);
    });
    if (t.id === 'tour-join-code') return run(async () => { const tt = await ON.findTournament($('tour-code').value); openTournament(tt.id); });
    if (t.id === 'tour-join') return run(() => ON.joinTournament(tourId), L('Inscription enregistrée.', 'Registration saved.'));
    if (t.id === 'tour-leave') return run(() => ON.leaveTournament(tourId));
    if (t.id === 'tour-create-team') return run(() => ON.createTeam(tourId, $('tour-team').value), L('Équipe créée : ajoute maintenant tes coéquipiers.', 'Team created: now add your teammates.'));
    if (t.id === 'tour-add-mate') return run(() => ON.addTeammate(tourId, tourDoc.teams.find((x) => x.members.includes(ON.user.uid)).id, $('tour-mate').value), L('Coéquipier ajouté.', 'Teammate added.'));
    if (t.id === 'tour-start') return run(() => ON.startTournament(tourId), L('Le tournoi commence : bonne chance à tous !', 'The tournament begins: good luck everyone!'));
    if (t.dataset.tourGame) {
      const g = onlineGames.find((x) => x.id === t.dataset.tourGame);
      if (g) openOnlineGame(g); else toast(L('La partie se prépare, réessaie dans un instant.', 'The game is being prepared, try again in a moment.'));
    }
  });
  $('btn-tournaments').onclick = () => {
    returnTo = 'home'; tourSection = null;
    show('tournaments'); renderTournaments();
    if (!ON) return;
    ON.load().then(() => { startTourWatch(); renderTournaments(); }).catch(() => {});
  };
  /* ---------- Profil : statistiques (ordinateur, joueurs, tournois, apprentissage) et grades ---------- */
  // Rang d'un participant à la fin d'un tournoi (points, puis départage)
  function tournamentPlace(t, uid) {
    if (t.status !== 'over') return null;
    const ids = ON.participants(t);
    const buch = (id) => ((t.met || {})[id] || []).reduce((s, o) => s + ((t.scores || {})[o] || 0), 0);
    const order = ids.slice().sort((a, b) => ((t.scores || {})[b] || 0) - ((t.scores || {})[a] || 0) || buch(b) - buch(a));
    const me = t.type === 'team' ? (t.teams.find((tm) => tm.members.includes(uid)) || {}).id : uid;
    const i = order.indexOf(me);
    return i < 0 ? null : i + 1;
  }
  function localSummary(tours) {
    const stats = store.get('stats', {});
    const ai = { win: 0, draw: 0, loss: 0, best: 0 };
    for (const [lvl, s] of Object.entries(stats)) { ai.win += s.win; ai.draw += s.draw; ai.loss += s.loss; if (s.win) ai.best = Math.max(ai.best, Number(lvl)); }
    const on = { win: 0, draw: 0, loss: 0, opponents: new Set() };
    for (const g of store.get('onlineArchive', [])) {
      const mine = g.color === 'w' ? '1-0' : '0-1';
      if (g.result === mine) on.win++; else if (g.result === '1/2-1/2') on.draw++; else on.loss++;
      on.opponents.add(g.color === 'w' ? g.black : g.white);
    }
    const pz = Object.values(store.get('pzdone', {})).filter((v) => v === 's').length;
    const done = store.get('trainDone', {});
    const mates = Object.keys(done).filter((k) => k.startsWith('mate:')).length;
    const ends = Object.keys(done).filter((k) => k.startsWith('end:')).length;
    const sr = store.get('openingsSR', {});
    const openings = Object.values(sr).filter((r) => r.stage >= 3).length;
    const daily = store.get('daily', {});
    const tour = { played: 0, wins: 0, second: 0, third: 0 };
    for (const t of tours || []) {
      const place = ON && ON.user ? tournamentPlace(t, ON.user.uid) : null;
      if (t.status === 'over' && place) { tour.played++; if (place === 1) tour.wins++; else if (place === 2) tour.second++; else if (place === 3) tour.third++; }
    }
    const w = walletState();
    return { level: levelOf(w.xp).level, title: w.title ? titleName(w.title) : null, frame: w.frame, ai, online: { win: on.win, draw: on.draw, loss: on.loss, opponents: on.opponents.size }, tour, pz, mates, ends, openings, dailyBest: daily.best || 0, unlocked: unlocked(), elo: estimatedElo() };
  }
  // Grades gagnés par les exploits : étoiles (ordinateur), médailles et coupes (tournois), et plus
  const BADGES = [
    { id: 'ai1', icon: '⭐', name: L('Première victoire', 'First win'), desc: L('Battre l\'ordinateur une fois', 'Beat the computer once'), ok: (s) => s.ai.win >= 1 },
    { id: 'ai10', icon: '⭐⭐', name: L('Dix victoires', 'Ten wins'), desc: L('10 victoires contre l\'ordinateur', '10 wins against the computer'), ok: (s) => s.ai.win >= 10 },
    { id: 'ai50', icon: '⭐⭐⭐', name: L('Cinquante victoires', 'Fifty wins'), desc: L('50 victoires contre l\'ordinateur', '50 wins against the computer'), ok: (s) => s.ai.win >= 50 },
    { id: 'lvl-exp', icon: '🎖️', name: L('Expert', 'Expert'), desc: L('Battre un niveau Expert', 'Beat an Expert level'), ok: (s) => s.ai.best >= 13 },
    { id: 'lvl-gm', icon: '🎖️🎖️', name: L('Grand maître', 'Grandmaster'), desc: L('Battre un niveau Grand maître', 'Beat a Grandmaster level'), ok: (s) => s.ai.best >= 19 },
    { id: 'lvl-ch', icon: '👑', name: L('Champion', 'Champion'), desc: L('Battre le niveau Champion', 'Beat the Champion level'), ok: (s) => s.ai.best >= 22 },
    { id: 'on1', icon: '♟️', name: L('Premier duel gagné', 'First duel won'), desc: L('Gagner une partie en ligne', 'Win an online game'), ok: (s) => s.online.win >= 1 },
    { id: 'on10', icon: '⚔️', name: L('Duelliste', 'Duellist'), desc: L('10 victoires en ligne', '10 online wins'), ok: (s) => s.online.win >= 10 },
    { id: 'friends', icon: '🤝', name: L('Sociable', 'Sociable'), desc: L('Jouer contre 5 joueurs différents', 'Play 5 different players'), ok: (s) => s.online.opponents >= 5 },
    { id: 'tour1', icon: '🎟️', name: L('Compétiteur', 'Competitor'), desc: L('Finir un tournoi', 'Finish a tournament'), ok: (s) => s.tour.played >= 1 },
    { id: 'bronze', icon: '🥉', name: L('Médaille de bronze', 'Bronze medal'), desc: L('Finir 3e d\'un tournoi', 'Finish 3rd in a tournament'), ok: (s) => s.tour.third >= 1 },
    { id: 'silver', icon: '🥈', name: L('Médaille d\'argent', 'Silver medal'), desc: L('Finir 2e d\'un tournoi', 'Finish 2nd in a tournament'), ok: (s) => s.tour.second >= 1 },
    { id: 'gold', icon: '🥇', name: L('Médaille d\'or', 'Gold medal'), desc: L('Gagner un tournoi', 'Win a tournament'), ok: (s) => s.tour.wins >= 1 },
    { id: 'cup', icon: '🏆', name: L('Coupe des champions', 'Champions cup'), desc: L('Gagner 3 tournois', 'Win 3 tournaments'), ok: (s) => s.tour.wins >= 3 },
    { id: 'pz50', icon: '🧩', name: L('Résolveur', 'Solver'), desc: L('Résoudre 50 problèmes', 'Solve 50 puzzles'), ok: (s) => s.pz >= 50 },
    { id: 'mates', icon: '🧠', name: L('Maître des mats', 'Master of mates'), desc: L('Apprendre les 13 mats', 'Learn all 13 mates'), ok: (s) => s.mates >= 13 },
    { id: 'ends', icon: '🏁', name: L('Finaliste', 'Endgame expert'), desc: L('Réussir les 5 finales de base', 'Pass the 5 basic endgames'), ok: (s) => s.ends >= 5 },
    { id: 'open', icon: '📖', name: L('Théoricien', 'Theorist'), desc: L('Maîtriser 5 ouvertures', 'Master 5 openings'), ok: (s) => s.openings >= 5 },
    { id: 'streak', icon: '🔥', name: L('Assidu', 'Dedicated'), desc: L('Série de 7 jours au défi du jour', '7-day daily challenge streak'), ok: (s) => s.dailyBest >= 7 },
  ];
  function profileHtml(s, who) {
    const n = (x) => NUM(x, x % 1 ? 1 : 0);
    const won = BADGES.filter((b) => b.ok(s));
    const pct = (w, d, l) => { const t = w + d + l; return t ? `${Math.round((100 * (w + d / 2)) / t)} %` : '–'; };
    const fr = s.frame ? ` frame-${escHtml(s.frame)}` : '';
    let html = `<div class="profile-head">${who.photo ? `<img class="profile-photo big${fr}" src="${who.photo}" alt="">` : `<span class="profile-photo big placeholder${fr}">♞</span>`}<div><b>${escHtml(who.name)}</b>${s.title ? `<em class="player-title">« ${escHtml(s.title)} »</em>` : ''}<span>${s.level ? `${L('Niveau', 'Level')} ${s.level} · ` : ''}Elo ${L('estimé', 'est.')} ${s.elo}</span>${who.grade != null ? `<span class="grade-line">${gradeLabel(who.grade)} · ${gradeOf(who.grade).pts} ${L('pts', 'pts')}${gradeOf(who.grade).next ? L(` (prochain : ${gradeOf(who.grade).nextName} à ${gradeOf(who.grade).next})`, ` (next: ${gradeOf(who.grade).nextName} at ${gradeOf(who.grade).next})`) : ''}</span>` : ''}${won.length ? `<span class="profile-badges-line">${won.slice(-6).map((b) => b.icon).join(' ')}</span>` : ''}</div></div>`;
    html += `<h3 class="train-h">${L('Grades', 'Ranks')} (${won.length}/${BADGES.length})</h3><div class="badge-grid">${BADGES.map((b) => `<div class="badge${b.ok(s) ? ' on' : ''}" title="${escHtml(b.desc)}"><span class="badge-icon">${b.icon}</span><b>${escHtml(b.name)}</b><small>${escHtml(b.desc)}</small></div>`).join('')}</div>`;
    const card = (title, rows) => `<div class="stat-card"><h4>${title}</h4>${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
    html += `<h3 class="train-h">${L('Statistiques', 'Statistics')}</h3><div class="stat-cards">
      ${card(L('Contre l\'ordinateur', 'Against the computer'), [[L('Victoires', 'Wins'), s.ai.win], [L('Nulles', 'Draws'), s.ai.draw], [L('Défaites', 'Losses'), s.ai.loss], [L('Score', 'Score'), pct(s.ai.win, s.ai.draw, s.ai.loss)], [L('Meilleur niveau battu', 'Best level beaten'), s.ai.best ? LEVEL_NAMES[s.ai.best] : '–']])}
      ${card(L('Contre les joueurs', 'Against players'), [[L('Victoires', 'Wins'), s.online.win], [L('Nulles', 'Draws'), s.online.draw], [L('Défaites', 'Losses'), s.online.loss], [L('Score', 'Score'), pct(s.online.win, s.online.draw, s.online.loss)], [L('Adversaires différents', 'Different opponents'), s.online.opponents]])}
      ${card(L('Tournois', 'Tournaments'), [[L('Terminés', 'Finished'), s.tour.played], ['🥇', s.tour.wins], ['🥈', s.tour.second], ['🥉', s.tour.third]])}
      ${card(L('Apprentissage', 'Learning'), [[L('Problèmes résolus', 'Puzzles solved'), s.pz], [L('Mats appris', 'Mates learned'), `${s.mates}/13`], [L('Finales réussies', 'Endgames passed'), `${s.ends}/5`], [L('Ouvertures maîtrisées', 'Openings mastered'), s.openings], [L('Meilleure série du défi', 'Best daily streak'), n(s.dailyBest)]])}
    </div>`;
    return html;
  }
  async function openProfile(uid) {
    returnTo = document.body.dataset.screen && document.body.dataset.screen !== 'profile' ? document.body.dataset.screen : 'home';
    const mine = !uid || (ON && ON.user && uid === ON.user.uid);
    $('profile-title').textContent = mine ? L('Mon profil', 'My profile') : L('Profil', 'Profile');
    show('profile');
    const body = $('profile-body');
    if (mine) {
      const p = playerProfile();
      let tours = [];
      const payBadges = (s) => { const w = walletState(), fresh = BADGES.filter((b) => b.ok(s) && !w.badgesPaid.includes(b.id)); if (!fresh.length) return; w.badgesPaid.push(...fresh.map((b) => b.id)); store.set('wallet', w); reward(50 * fresh.length, 50 * fresh.length, L(`${fresh.length} grade${fresh.length > 1 ? 's' : ''} gagné${fresh.length > 1 ? 's' : ''}`, `${fresh.length} rank${fresh.length > 1 ? 's' : ''} earned`)); };
      payBadges(localSummary([]));
      body.innerHTML = profileHtml(localSummary([]), { name: p.name || L('Joueur', 'Player'), photo: p.photo });
      body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🍚 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
      body.querySelector('.profile-shop').onclick = openShop;
      if (ON && ON.user) {
        try { tours = await ON.myTournaments(); } catch { tours = []; }
        payBadges(localSummary(tours));
        const s = localSummary(tours);
        body.innerHTML = profileHtml(s, { name: p.name || L('Joueur', 'Player'), photo: p.photo, grade: (ON.profile && ON.profile.gradePts) || 0 });
        body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🍚 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
        body.querySelector('.profile-shop').onclick = openShop;
        try { h2hGames = await ON.myGames(); body.insertAdjacentHTML('beforeend', opponentsHtml(h2hGames, ON.user.uid)); } catch { /* hors ligne */ }
        // résumé public pour que les autres joueurs voient ce profil
        ON.publishSummary({ ...s, badges: BADGES.filter((b) => b.ok(s)).map((b) => b.id) });
      } else body.insertAdjacentHTML('beforeend', `<p class="level-help">${L('Connecte-toi pour ajouter tes parties en ligne et tes tournois, et pour que les autres joueurs voient ton profil.', 'Sign in to add your online games and tournaments, and so other players can see your profile.')}</p>`);
      return;
    }
    body.innerHTML = `<p class="level-help">${L('Chargement…', 'Loading…')}</p>`;
    try {
      const u = await ON.getProfile(uid);
      if (!u) { body.innerHTML = `<p class="level-help">${L('Profil introuvable.', 'Profile not found.')}</p>`; return; }
      const s = u.summary || { ai: { win: 0, draw: 0, loss: 0, best: 0 }, online: { win: 0, draw: 0, loss: 0, opponents: 0 }, tour: { played: 0, wins: 0, second: 0, third: 0 }, pz: 0, mates: 0, ends: 0, openings: 0, dailyBest: 0, elo: u.elo || 600 };
      body.innerHTML = profileHtml({ ...s, elo: u.elo || s.elo }, { name: u.pseudo, photo: u.photo, grade: u.gradePts || 0 }) + (u.summary ? '' : `<p class="level-help">${L('Ce joueur n\'a pas encore publié ses statistiques.', 'This player has not published their statistics yet.')}</p>`);
      if (ON.user) {
        const me = ON.user.uid;
        h2hGames = (await ON.myGames()).filter((g) => g.players.includes(uid) && g.white !== g.black);
        const head = body.querySelector('.profile-head');
        head.insertAdjacentHTML('afterend', h2hHtml(h2hGames, me, u.pseudo));
      }
    } catch (err) { body.innerHTML = `<p class="level-help">${ON.explain(err)}</p>`; }
  }
  // Face-à-face : toutes les parties contre un joueur, tous modes confondus (amicales et tournois)
  const h2hScore = (g, me) => (g.status !== 'over' ? null : g.result === '1/2-1/2' ? 0.5 : (g.result === '1-0') === (g.white === me) ? 1 : 0);
  function h2hHtml(games, me, oppName) {
    const over = games.filter((g) => g.status === 'over');
    const w = over.filter((g) => h2hScore(g, me) === 1).length, d = over.filter((g) => h2hScore(g, me) === 0.5).length, l = over.length - w - d;
    let html = `<h3 class="train-h">${L(`Face à face contre ${escHtml(oppName)}`, `Head to head against ${escHtml(oppName)}`)}</h3>`;
    if (!games.length) return html + `<p class="level-help">${L('Vous n\'avez encore jamais joué ensemble.', 'You have never played each other yet.')}</p>`;
    html += `<div class="h2h-total"><span class="win">${w} ${L('victoire', 'win')}${w > 1 ? 's' : ''}</span><span>${d} ${L('nulle', 'draw')}${d > 1 ? 's' : ''}</span><span class="loss">${l} ${L('défaite', 'loss')}${l > 1 ? 's' : ''}</span></div>`;
    html += `<table class="tour-table h2h-table"><tr><th>${L('Date', 'Date')}</th><th>${L('Partie', 'Game')}</th><th>${L('Cadence', 'Time')}</th><th>${L('Couleur', 'Colour')}</th><th>${L('Résultat', 'Result')}</th><th></th></tr>${games.sort((a, b) => b.createdAt - a.createdAt).map((g) => {
      const sc = h2hScore(g, me);
      const res = sc === null ? L('en cours', 'in progress') : sc === 1 ? L('Victoire', 'Win') : sc === 0 ? L('Défaite', 'Loss') : L('Nulle', 'Draw');
      const kind = g.tournamentId ? `🏆 ${escHtml(g.tournamentName || L('Tournoi', 'Tournament'))}${g.round ? ` · ${L('r.', 'r.')}${g.round}` : ''}` : L('Amicale', 'Friendly');
      return `<tr><td>${new Date(g.createdAt).toLocaleDateString(LOCALE)}</td><td>${kind}</td><td>${TC_LABELS[g.tc] || ''}</td><td>${g.white === me ? '♔' : '♚'}</td><td class="${sc === 1 ? 'win' : sc === 0 ? 'loss' : ''}">${res}</td><td>${g.moves && g.moves.length ? `<button class="mini" data-h2h-replay="${g.id}">${L('Revoir', 'Replay')}</button>` : ''}</td></tr>`;
    }).join('')}</table>`;
    return html;
  }
  // Mon profil : bilan contre chaque adversaire
  function opponentsHtml(games, me) {
    const by = {};
    for (const g of games) {
      const opp = g.white === me ? g.black : g.white, name = g.white === me ? g.blackName : g.whiteName;
      const row = by[opp] || (by[opp] = { name, w: 0, d: 0, l: 0, n: 0 });
      const sc = h2hScore(g, me); row.n++;
      if (sc === 1) row.w++; else if (sc === 0.5) row.d++; else if (sc === 0) row.l++;
    }
    const rows = Object.entries(by).sort((a, b) => b[1].n - a[1].n);
    if (!rows.length) return '';
    return `<h3 class="train-h">${L('Mes adversaires', 'My opponents')}</h3><table class="tour-table h2h-table"><tr><th>${L('Joueur', 'Player')}</th><th>${L('Parties', 'Games')}</th><th>+</th><th>=</th><th>−</th></tr>${rows.map(([uid, r]) => `<tr><td><a href="#" data-profile="${uid}">${escHtml(r.name)}</a></td><td>${r.n}</td><td class="win">${r.w}</td><td>${r.d}</td><td class="loss">${r.l}</td></tr>`).join('')}</table><p class="level-help">${L('Clique sur un joueur pour voir le détail de vos parties.', 'Click a player to see the details of your games.')}</p>`;
  }
  let h2hGames = [];
  $('profile-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h2h-replay]'); if (!b) return;
    const g = h2hGames.find((x) => x.id === b.dataset.h2hReplay); if (!g) return;
    const back = returnTo;
    startReplay({ moves: g.moves, result: g.result || '*', title: g.tournamentId ? `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}` : L('Partie amicale', 'Friendly game'), white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})` }, () => { show('profile'); returnTo = back; });
  });
  $('btn-profile').onclick = () => openProfile();
  // clic sur un joueur (tournois) : son profil
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-profile]'); if (el) { e.preventDefault(); openProfile(el.dataset.profile); } });
  /* ---------- Récompenses : grains de riz, grades nature, quêtes du jour, boutique de Sissa ---------- */
  const xpFor = (lvl) => 100 + 40 * (lvl - 1); // expérience pour passer du niveau lvl au suivant
  /* ---------- Grade des parties en ligne entre humains ---------- */
  // Points de grade : + en victoire (beaucoup contre un adversaire de grade plus fort, peu contre un plus faible),
  // − en défaite, inchangés en cas de nulle
  // mêmes paliers de points pour tous les thèmes ; seuls les noms des grades suivent le thème choisi
  const GRADE_STEPS = [[0, '⚪'], [100, '🟢'], [250, '🔵'], [450, '🟣'], [700, '🟠'], [1000, '🔴'], [1400, '👑']];
  const GRADE_NAMES = {
    ninjas: [['Apprenti', 'Apprentice'], ['Genin', 'Genin'], ['Chûnin', 'Chunin'], ['Jônin', 'Jonin'], ['Sannin', 'Sannin'], ['Kage', 'Kage'], ['Légende', 'Legend']],
    plants: [['Graine', 'Seed'], ['Pousse', 'Sprout'], ['Bourgeon', 'Bud'], ['Fleur', 'Flower'], ['Arbuste', 'Shrub'], ['Grand arbre', 'Great tree'], ['Baobab légendaire', 'Legendary baobab']],
    land: [['Lionceau', 'Cub'], ['Pisteur', 'Tracker'], ['Éclaireur', 'Scout'], ['Chasseur', 'Hunter'], ['Chef de meute', 'Pack leader'], ['Roi de la savane', 'King of the savanna'], ['Légende', 'Legend']],
    birds: [['Oisillon', 'Fledgling'], ['Moineau', 'Sparrow'], ['Perroquet', 'Parrot'], ['Faucon', 'Falcon'], ['Aigle', 'Eagle'], ['Aigle royal', 'Golden eagle'], ['Légende du ciel', 'Sky legend']],
    ocean: [['Moussaillon', 'Cabin boy'], ['Poisson-clown', 'Clownfish'], ['Tortue marine', 'Sea turtle'], ['Dauphin', 'Dolphin'], ['Requin', 'Shark'], ['Baleine', 'Whale'], ['Légende des mers', 'Legend of the seas']],
    ancient: [['Recrue', 'Recruit'], ['Légionnaire', 'Legionary'], ['Centurion', 'Centurion'], ['Tribun', 'Tribune'], ['Général', 'General'], ['Consul', 'Consul'], ['Empereur', 'Emperor']],
    modern: [['Recrue', 'Recruit'], ['Soldat', 'Soldier'], ['Sergent', 'Sergeant'], ['Lieutenant', 'Lieutenant'], ['Capitaine', 'Captain'], ['Colonel', 'Colonel'], ['Général', 'General']],
  };
  const gradeTable = () => {
    let theme = 'ninjas'; try { theme = activeNatureCollection; } catch { /* thème pas encore chargé */ }
    const names = GRADE_NAMES[theme] || GRADE_NAMES.ninjas;
    return GRADE_STEPS.map(([pts, icon], i) => [pts, icon, L(names[i][0], names[i][1])]);
  };
  function gradeOf(pts) {
    const GRADES = gradeTable();
    pts = Math.max(0, pts || 0);
    let i = 0; while (i < GRADES.length - 1 && pts >= GRADES[i + 1][0]) i++;
    const next = GRADES[i + 1];
    return { pts, icon: GRADES[i][1], name: GRADES[i][2], next: next ? next[0] : null, nextName: next ? next[2] : null };
  }
  const gradeLabel = (pts) => { const g = gradeOf(pts); return `${g.icon} ${g.name}`; };
  function gradeDelta(outcome, mine, opp) {
    if (outcome === 'draw') return 0;
    const diff = (opp || 0) - (mine || 0);
    if (outcome === 'win') return Math.round(Math.max(3, Math.min(45, 20 + diff / 12)));
    return -Math.round(Math.max(5, Math.min(30, 15 - diff / 15)));
  }
  async function updateGrade(outcome, oppUid) {
    if (!ON || !ON.user) return;
    let opp = 0;
    try { const u = await ON.getProfile(oppUid); opp = (u && u.gradePts) || 0; } catch { /* grade adverse inconnu */ }
    const mine = (ON.profile && ON.profile.gradePts) || 0, delta = gradeDelta(outcome, mine, opp);
    if (!delta) { rewardPop(L('Nulle : grade inchangé', 'Draw: rank unchanged')); return; }
    const before = gradeOf(mine), after = gradeOf(mine + delta), applied = after.pts - before.pts;
    if (!applied) { rewardPop(L('Défaite : ton grade est déjà au plus bas', 'Loss: your rank is already at its lowest')); return; }
    await ON.setGrade(after.pts);
    rewardPop(L(`Grade : ${applied > 0 ? '+' : ''}${applied} points (${after.pts})`, `Rank: ${applied > 0 ? '+' : ''}${applied} points (${after.pts})`), true);
    if (after.name !== before.name) setTimeout(() => rewardPop(after.pts > before.pts ? L(`Nouveau grade : ${after.icon} ${after.name} !`, `New rank: ${after.icon} ${after.name}!`) : L(`Grade perdu : ${after.icon} ${after.name}`, `Rank lost: ${after.icon} ${after.name}`), true), 900);
  }

  /* ---------- Paliers de récompenses par mode ---------- */
  const TIERS_MODE = [[1, '🥉', L('Bronze', 'Bronze'), 20], [5, '🥈', L('Argent', 'Silver'), 50], [15, '🥇', L('Or', 'Gold'), 120], [40, '💠', L('Platine', 'Platinum'), 300], [100, '💎', L('Diamant', 'Diamond'), 700]];
  function modeList() {
    return [
      ['ai', '🤖', L('Victoires contre l’ordinateur', 'Wins against the computer')],
      ['online', '🌐', L('Parties en ligne', 'Online games')],
      ['tournament', '🏆', L('Parties de tournoi', 'Tournament games')],
      ['puzzle', '🧩', L('Problèmes résolus', 'Puzzles solved')],
      ['lesson', '📘', L('Leçons terminées', 'Lessons finished')],
      ['daily', '📅', L('Défis du jour réussis', 'Daily challenges won')],
    ];
  }
  function modeTier(n) { let i = -1; while (i < TIERS_MODE.length - 1 && n >= TIERS_MODE[i + 1][0]) i++; return i; }
  function countMode(mode) {
    const w = walletState();
    w.counts = w.counts || {};
    const before = modeTier(w.counts[mode] || 0);
    w.counts[mode] = (w.counts[mode] || 0) + 1;
    const after = modeTier(w.counts[mode]);
    store.set('wallet', w);
    if (after > before) {
      const tier = TIERS_MODE[after], name = (modeList().find((m) => m[0] === mode) || [])[2] || '';
      setTimeout(() => reward(tier[3], tier[3], L(`Palier ${tier[2]} ${tier[1]} · ${name}`, `${tier[2]} tier ${tier[1]} · ${name}`)), 600);
    }
  }
  function tiersHtml() {
    const counts = walletState().counts || {};
    return `<h3 class="train-h">${L('Paliers par mode', 'Tiers by mode')}</h3><div class="tier-list">${modeList().map(([id, icon, name]) => {
      const n = counts[id] || 0, i = modeTier(n), next = TIERS_MODE[i + 1];
      const from = i >= 0 ? TIERS_MODE[i][0] : 0, pct = next ? Math.round(((n - from) / (next[0] - from)) * 100) : 100;
      return `<div class="tier-row"><span class="tier-icon">${icon}</span><div class="tier-main"><b>${name}</b><span class="xp-bar"><i style="width:${pct}%"></i></span><small>${n}${next ? ` / ${next[0]} · ${L('prochain', 'next')} : ${next[1]} ${next[2]} (+${riceAmount(next[3], true)})` : L(' · tous les paliers atteints', ' · all tiers reached')}</small></div><span class="tier-medals">${TIERS_MODE.map((tr, k) => `<i class="${k <= i ? 'on' : ''}" title="${tr[2]}">${tr[1]}</i>`).join('')}</span></div>`;
    }).join('')}</div>`;
  }
  function walletState() {
    const wallet = Object.assign({ wheat: 0, water: 0, pearls: 0, leaves: 0, meat: 0, gold: 0, xp: 0, owned: [], frame: null, title: null, firstWin: '', badgesPaid: [] }, store.get('wallet', {}));
    if (!store.get('natureCurrencyUnified', false)) {
      wallet.wheat += ['water', 'pearls', 'leaves', 'meat', 'gold'].reduce((sum, key) => sum + (Number(wallet[key]) || 0), 0);
      for (const key of ['water', 'pearls', 'leaves', 'meat', 'gold']) wallet[key] = 0;
      store.set('wallet', wallet);
      store.set('natureCurrencyUnified', true);
    }
    return wallet;
  }
  function levelOf(xp) { let l = 1; while (l < 50 && xp >= xpFor(l)) { xp -= xpFor(l); l++; } return { level: l, into: xp, need: xpFor(l) }; }
  const RICE_PER_KG = 40000;
  const RICE_UNITS = [
    { value: 1, fr: 'grains de riz', en: 'rice grains' },
    { value: RICE_PER_KG, fr: 'kg de riz', en: 'kg of rice' },
    { value: RICE_PER_KG * 1000, fr: 'tonnes de riz', en: 'tonnes of rice' },
    { value: RICE_PER_KG * 1e6, fr: 'milliers de tonnes', en: 'thousand tonnes' },
    { value: RICE_PER_KG * 1e9, fr: 'millions de tonnes', en: 'million tonnes' },
    { value: RICE_PER_KG * 1e12, fr: 'milliards de tonnes', en: 'billion tonnes' },
  ];
  const RICE_FORMAT = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
  function riceScale(amount) {
    const grains = Math.max(0, Number(amount) || 0);
    let index = 0; while (index < RICE_UNITS.length - 1 && grains >= RICE_UNITS[index + 1].value) index++;
    const unit = RICE_UNITS[index], next = RICE_UNITS[index + 1];
    return { grains, index, unit, next, value: grains / unit.value, progress: next ? Math.min(100, (100 * grains) / next.value) : 100 };
  }
  function riceAmount(amount, compact = false) {
    const scale = riceScale(amount);
    const value = scale.index === 0 ? Math.floor(scale.grains).toLocaleString(LOCALE) : RICE_FORMAT.format(scale.value);
    const label = compact && scale.index === 0 ? L('grains', 'grains') : L(scale.unit.fr, scale.unit.en);
    return `${value} ${label}${compact ? ' 🍚' : ''}`;
  }
  function riceCompact(amount) {
    const scale = riceScale(amount), value = scale.index === 0 ? Math.floor(scale.grains).toLocaleString(LOCALE) : RICE_FORMAT.format(scale.value);
    const units = [L('🍚', '🍚'), L('kg 🍚', 'kg 🍚'), L('t 🍚', 't 🍚'), L('milliers t 🍚', 'thousand t 🍚'), L('millions t 🍚', 'million t 🍚'), L('milliards t 🍚', 'billion t 🍚')];
    return `${value} ${units[scale.index]}`;
  }
  const NATURE_GRADE_PATHS = {
    plants: [
      ['Graine de riz', 'Rice seed', '🌾'], ['Germe', 'Sprout', '🌱'], ['Petite pousse', 'Young shoot', '🌿'], ['Bourgeon tropical', 'Tropical bud', '🌷'], ['Fleur tropicale', 'Tropical flower', '🌺'], ['Jardinier en herbe', 'Novice gardener', '🧑🏾‍🌾'], ['Gardien du potager', 'Garden keeper', '🥕'], ['Gardien du verger', 'Orchard keeper', '🥭'], ['Protecteur de la forêt', 'Forest guardian', '🌴'], ['Gardien du baobab', 'Baobab guardian', '🌳'],
    ],
    land: [
      ['Explorateur de la basse-cour', 'Farmyard explorer', '🐓'], ['Ami du jardin', 'Garden friend', '🦎'], ['Protecteur des tortues', 'Tortoise protector', '🐢'], ['Compagnon des lémuriens', 'Lemur companion', '🐒'], ['Gardien des singes', 'Monkey guardian', '🐵'], ['Gardien des clairières', 'Glade guardian', '🦓'], ['Protecteur des éléphants', 'Elephant protector', '🐘'], ['Protecteur de la panthère', 'Panther protector', '🐆'], ['Gardien du cœur de la jungle', 'Heart of the jungle guardian', '🌴'], ['Légende de la jungle', 'Jungle legend', '🦍'],
    ],
    birds: [
      ['Ami des oiseaux du jardin', 'Garden bird friend', '🐦'], ['Colibri agile', 'Swift hummingbird', '🐦'], ['Compagnon des perroquets', 'Parrot companion', '🦜'], ['Gardien des perruches', 'Parakeet guardian', '🦜'], ['Pêcheur du lagon', 'Lagoon fisher', '🐤'], ['Protecteur des calaos', 'Hornbill protector', '🦤'], ['Aigle pêcheur', 'Fish eagle', '🦅'], ['Maître du vol tropical', 'Master of tropical flight', '🌴'], ['Gardien de la forêt profonde', 'Deep forest guardian', '🌳'], ['Gardien du grand nid', 'Great nest guardian', '🪺'],
    ],
    ocean: [
      ['Ami de la plage', 'Beach friend', '🏖️'], ['Gardien des crabes', 'Crab guardian', '🦀'], ['Explorateur du récif', 'Reef explorer', '🪸'], ['Gardien des poissons tropicaux', 'Tropical fish guardian', '🐠'], ['Protecteur du lagon', 'Lagoon protector', '🐟'], ['Ami des tortues marines', 'Sea turtle friend', '🐢'], ['Gardien des dauphins', 'Dolphin guardian', '🐬'], ['Explorateur de la mer ouverte', 'Open sea explorer', '🌊'], ['Maître de l’océan Indien', 'Master of the Indian Ocean', '🌊'], ['Gardien de la baleine', 'Whale guardian', '🐋'],
    ],
    ancient: [
      ['Recrue', 'Recruit', '🪖'], ['Fantassin', 'Foot soldier', '🛡️'], ['Archer', 'Archer', '🏹'], ['Cavalier', 'Horseman', '🐎'], ['Centurion', 'Centurion', '⚔️'], ['Maître des machines', 'Siege master', '🏗️'], ['Tribun', 'Tribune', '🦅'], ['Général', 'General', '🎖️'], ['Consul', 'Consul', '🏛️'], ['Empereur', 'Emperor', '👑'],
    ],
    modern: [
      ['Recrue', 'Recruit', '🪖'], ['Soldat', 'Soldier', '🎒'], ['Caporal', 'Corporal', '🎖️'], ['Sergent', 'Sergeant', '📡'], ['Pilote de drone', 'Drone pilot', '🛸'], ['Tankiste', 'Tank commander', '🛡️'], ['Pilote d’hélicoptère', 'Helicopter pilot', '🚁'], ['Pilote de chasse', 'Fighter pilot', '✈️'], ['Colonel', 'Colonel', '⭐'], ['Général', 'General', '👑'],
    ],
    ninjas: [
      ['Étudiant de l’Académie', 'Academy student', '📜'], ['Genin', 'Genin', '🥷'], ['Genin confirmé', 'Senior Genin', '🌀'], ['Chûnin', 'Chunin', '🎯'], ['Chûnin d’élite', 'Elite Chunin', '⚔️'], ['Jônin', 'Jonin', '🛡️'], ['Jônin spécial', 'Special Jonin', '🥷'], ['ANBU', 'ANBU', '🎭'], ['Kage', 'Kage', '🏯'], ['Hokage', 'Hokage', '👑'],
    ],
  };
  const natureGradesFor = (collectionId = activeNatureCollection) => (NATURE_GRADE_PATHS[collectionId] || NATURE_GRADE_PATHS.plants).map(([fr, en, icon]) => ({ name: L(fr, en), icon }));
  const GARDEN_PLANTS = [
    { name: L('Riz', 'Rice'), icon: '🌱' }, { name: L('Bananier', 'Banana tree'), icon: '🍌' },
    { name: L('Ananas', 'Pineapple'), icon: '🍍' }, { name: L('Manguier', 'Mango tree'), icon: '🥭' },
    { name: L('Papayer', 'Papaya tree'), icon: '🍈' }, { name: L('Cocotier', 'Coconut palm'), icon: '🥥' },
    { name: L('Potager tropical', 'Tropical vegetable garden'), icon: '🥕' }, { name: L('Goyavier', 'Guava tree'), icon: '🍐' },
    { name: L('Palmier tropical', 'Tropical palm'), icon: '🌴' }, { name: L('Grand baobab', 'Great baobab'), icon: '🌳' },
  ];
  const NATURE_PREVIEW_ALL_UNLOCKED = true;
  const HOME_BACKGROUNDS = ['ninjas', 'ocean', 'plants', 'land', 'birds', 'ancient', 'modern']; // images dans fond_ecran/
  const NATURE_COLLECTIONS = [
    { id: 'plants', name: L('Plantes', 'Plants'), icon: '🌱', unlockGrade: 1, items: GARDEN_PLANTS },
    { id: 'land', name: L('Animaux terrestres', 'Land animals'), icon: '🐒', unlockGrade: NATURE_PREVIEW_ALL_UNLOCKED ? 1 : 2, items: [
      ['Basse-cour', 'Farmyard', '🐓', 'leaves'], ['Gecko du jardin', 'Garden gecko', '🦎', 'meat'], ['Tortue terrestre', 'Land tortoise', '🐢', 'leaves'], ['Lémurien', 'Lemur', '🐒', 'leaves'], ['Singes joueurs', 'Playful monkeys', '🐵', 'leaves'], ['Okapi', 'Okapi', '🦓', 'leaves'], ['Éléphant de forêt', 'Forest elephant', '🐘', 'leaves'], ['Panthère', 'Panther', '🐆', 'meat'], ['Cœur de la jungle', 'Heart of the jungle', '🌴', 'leaves'], ['Gardien de la jungle', 'Jungle guardian', '🦍', 'leaves'],
    ].map(([fr, en, icon, currency]) => ({ name: L(fr, en), icon, currency })) },
    { id: 'birds', name: L('Oiseaux tropicaux', 'Tropical birds'), icon: '🦜', unlockGrade: NATURE_PREVIEW_ALL_UNLOCKED ? 1 : 4, items: [
      ['Oiseaux du jardin', 'Garden birds', '🐦'], ['Colibri', 'Hummingbird', '🐦'], ['Perroquet', 'Parrot', '🦜'], ['Perruche colorée', 'Colourful parakeet', '🦜'], ['Martin-pêcheur', 'Kingfisher', '🐤'], ['Calao', 'Hornbill', '🦤'], ['Aigle pêcheur', 'Fish eagle', '🦅'], ['Vol au-dessus des palmiers', 'Flight over the palms', '🌴'], ['Forêt profonde', 'Deep forest', '🌳'], ['Grand nid tropical', 'Great tropical nest', '🪺'],
    ].map(([fr, en, icon]) => ({ name: L(fr, en), icon })) },
    { id: 'ocean', name: L('Océan Indien', 'Indian Ocean'), icon: '🐋', unlockGrade: NATURE_PREVIEW_ALL_UNLOCKED ? 1 : 6, items: [
      ['Plage', 'Beach', '🏖️'], ['Crabe de sable', 'Sand crab', '🦀'], ['Récif corallien', 'Coral reef', '🪸'], ['Poissons tropicaux', 'Tropical fish', '🐠'], ['Lagon turquoise', 'Turquoise lagoon', '🐟'], ['Tortue marine', 'Sea turtle', '🐢'], ['Dauphins', 'Dolphins', '🐬'], ['Mer ouverte', 'Open sea', '🌊'], ['Grand océan Indien', 'Great Indian Ocean', '🌊'], ['Baleine majestueuse', 'Majestic whale', '🐋'],
    ].map(([fr, en, icon]) => ({ name: L(fr, en), icon })) },
    { id: 'ancient', name: L('Guerriers de l’Antiquité', 'Ancient warriors'), icon: '🏛️', unlockGrade: NATURE_PREVIEW_ALL_UNLOCKED ? 1 : 7, items: [
      ['Camp romain', 'Roman camp', '⛺'], ['Légionnaire', 'Legionary', '🛡️'], ['Archers', 'Archers', '🏹'], ['Cavalerie', 'Cavalry', '🐎'], ['Baliste', 'Ballista', '🎯'], ['Catapulte', 'Catapult', '🪨'], ['Bélier', 'Battering ram', '🪵'], ['Tour de siège', 'Siege tower', '🏰'], ['Éléphant de guerre', 'War elephant', '🐘'], ['Char de l’empereur', 'Emperor’s chariot', '👑'],
    ].map(([fr, en, icon]) => ({ name: L(fr, en), icon })) },
    { id: 'modern', name: L('Guerriers modernes', 'Modern warriors'), icon: '🪖', unlockGrade: NATURE_PREVIEW_ALL_UNLOCKED ? 1 : 8, items: [
      ['Camp d’entraînement', 'Training camp', '⛺'], ['Soldat', 'Soldier', '🪖'], ['Jeep', 'Jeep', '🚙'], ['Radar', 'Radar', '📡'], ['Drone', 'Drone', '🛸'], ['Char d’assaut', 'Tank', '🛡️'], ['Hélicoptère', 'Helicopter', '🚁'], ['Navire', 'Warship', '🚢'], ['Avion de chasse', 'Fighter jet', '✈️'], ['Quartier général', 'Headquarters', '⭐'],
    ].map(([fr, en, icon]) => ({ name: L(fr, en), icon })) },
    { id: 'ninjas', name: L('Ninjas', 'Ninjas'), icon: '🥷', unlockGrade: 1, items: [
      ['Étudiant de l’Académie', 'Academy student', '📜'], ['Genin', 'Genin', '🥷'], ['Genin confirmé', 'Senior Genin', '🌀'], ['Chûnin', 'Chunin', '🎯'], ['Chûnin d’élite', 'Elite Chunin', '⚔️'], ['Jônin', 'Jonin', '🛡️'], ['Jônin spécial', 'Special Jonin', '🥷'], ['ANBU', 'ANBU', '🎭'], ['Kage', 'Kage', '🏯'], ['Hokage', 'Hokage', '👑'],
    ].map(([fr, en, icon]) => ({ name: L(fr, en), icon })) },
  ];
  const NATURE_COLLECTION_ORDER = ['ninjas', 'plants', 'land', 'birds', 'ocean', 'ancient', 'modern'];
  NATURE_COLLECTIONS.sort((a, b) => NATURE_COLLECTION_ORDER.indexOf(a.id) - NATURE_COLLECTION_ORDER.indexOf(b.id));
  // Saison mensuelle : chaque mois, un thème est à l'honneur (récompenses ×1,5 quand on joue avec lui)
  const SEASON_BONUS = 1.5;
  const seasonTheme = (d = new Date()) => NATURE_COLLECTION_ORDER[(d.getFullYear() * 12 + d.getMonth()) % NATURE_COLLECTION_ORDER.length];
  const seasonMonth = (d = new Date()) => d.toLocaleDateString(LOCALE, { month: 'long' });
  const BUILT_NATURE_COLLECTION_IDS = new Set(['plants', 'land', 'birds', 'ocean', 'ninjas', 'ancient', 'modern']);
  const AVAILABLE_NATURE_COLLECTIONS = NATURE_COLLECTIONS.filter((item) => BUILT_NATURE_COLLECTION_IDS.has(item.id));
  if (!store.get('natureNinjaDefaultMigrated', false)) {
    const previousCollection = store.get('natureCollection', null);
    if (!previousCollection || previousCollection === 'plants') store.set('natureCollection', 'ninjas');
    store.set('natureNinjaDefaultMigrated', true);
  }
  let activeNatureCollection = store.get('natureCollection', 'ninjas');
  if (!AVAILABLE_NATURE_COLLECTIONS.some((item) => item.id === activeNatureCollection)) {
    activeNatureCollection = 'ninjas';
    store.set('natureCollection', activeNatureCollection);
  }
  const NATURE_TERRAIN_PATHS = {
    plants: ['grass', 'grass', 'grass', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest'],
    land: ['grass', 'grass', 'grass', 'forest', 'forest', 'forest', 'forest', 'mud', 'mud', 'mud'],
    birds: ['grass', 'grass', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest', 'forest'],
    ocean: ['beach', 'beach', 'rock', 'rock', 'water', 'water', 'water', 'water', 'water', 'water'],
    ninjas: ['dojo', 'dojo', 'rock', 'rock', 'dojo', 'dojo', 'dojo', 'forest', 'forest', 'dojo'],
    ancient: ['steppe', 'steppe', 'desert', 'desert', 'steppe', 'rock', 'rock', 'desert', 'desert', 'steppe'],
    modern: ['steppe', 'mud', 'mud', 'rock', 'rock', 'desert', 'desert', 'mud', 'rock', 'steppe'],
  };
  const NATURE_WEATHER_PATH = ['sun', 'sunwind', 'cloudy', 'sun', 'drizzle', 'sunwind', 'cloudy', 'sunset', 'sunwind', 'sun'];
  function natureTerrainForGrade() {
    const rank = adventureGrade(levelOf(walletState().xp).level);
    const path = NATURE_TERRAIN_PATHS[activeNatureCollection] || NATURE_TERRAIN_PATHS.plants;
    return path[Math.max(0, Math.min(path.length - 1, rank - 1))];
  }
  function natureWeatherForGrade() {
    const rank = adventureGrade(levelOf(walletState().xp).level);
    return NATURE_WEATHER_PATH[Math.max(0, Math.min(NATURE_WEATHER_PATH.length - 1, rank - 1))];
  }
  function natureCurrency(grade = adventureGrade(levelOf(walletState().xp).level)) {
    if (activeNatureCollection === 'plants') return { key: 'wheat', icon: '💧', name: L('Gouttes d’eau', 'Water drops'), unit: L('gouttes d’eau', 'water drops') };
    if (activeNatureCollection === 'ocean') return { key: 'wheat', icon: '🦪', name: L('Perles', 'Pearls'), unit: L('perles', 'pearls') };
    if (activeNatureCollection === 'ninjas') return { key: 'wheat', icon: '🪙', name: L('Pièces d’or', 'Gold coins'), unit: L('pièces d’or', 'gold coins') };
    if (activeNatureCollection === 'ancient') return { key: 'wheat', icon: '🏺', name: L('Sesterces', 'Sesterces'), unit: L('sesterces', 'sesterces') };
    if (activeNatureCollection === 'modern') return { key: 'wheat', icon: '🎖️', name: L('Médailles', 'Medals'), unit: L('médailles', 'medals') };
    if (activeNatureCollection === 'land') {
      const item = NATURE_COLLECTIONS.find((entry) => entry.id === 'land').items[Math.max(0, Math.min(9, grade - 1))];
      return item.currency === 'meat'
        ? { key: 'wheat', icon: '🥩', name: L('Morceaux de viande', 'Meat pieces'), unit: L('morceaux de viande', 'meat pieces') }
        : { key: 'wheat', icon: '🍃', name: L('Feuilles', 'Leaves'), unit: L('feuilles', 'leaves') };
    }
    return { key: 'wheat', icon: '🍚', name: L('Grains de riz', 'Rice grains'), unit: L('grains de riz', 'rice grains'), scale: 'rice' };
  }
  function natureCurrencyAmount(currency, amount, compact = false) {
    if (currency.scale === 'rice') return riceAmount(amount, compact);
    return `${Math.floor(Number(amount) || 0).toLocaleString(LOCALE)} ${currency.unit}${compact ? ` ${currency.icon}` : ''}`;
  }
  function currentNatureBalance(wallet, grade) {
    const currency = natureCurrency(grade);
    return { currency, amount: Number(wallet[currency.key]) || 0 };
  }
  function adventureGrade(level) { return Math.min(10, Math.floor((Math.max(1, level) - 1) / 5) + 1); }
  function xpAtLevel(level) { let total = 0; for (let n = 1; n < level; n++) total += xpFor(n); return total; }
  function adventureProgress(totalXp, grade) {
    const startLevel = (grade - 1) * 5 + 1, endLevel = grade === 10 ? 50 : grade * 5 + 1;
    const start = xpAtLevel(startLevel), end = xpAtLevel(endLevel);
    return end > start ? Math.max(0, Math.min(100, (100 * (totalXp - start)) / (end - start))) : 100;
  }
  function rewardPop(text, big) {
    let box = document.querySelector('.reward-pops');
    if (!box) { box = document.createElement('div'); box.className = 'reward-pops'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'reward-pop' + (big ? ' big' : ''); el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), big ? 4200 : 3000);
  }
  function reward(wheat, xp, why) {
    if (activeNatureCollection === seasonTheme()) {
      wheat = Math.round(wheat * SEASON_BONUS); xp = Math.round(xp * SEASON_BONUS);
      why = `${why ? `${why} · ` : ''}${L('saison ×1,5', 'season ×1.5')}`;
    }
    const w = walletState(), before = levelOf(w.xp).level;
    const beforeGrade = adventureGrade(before);
    w.xp += xp;
    const after = levelOf(w.xp).level;
    const afterGrade = adventureGrade(after);
    const rewardCurrency = natureCurrency(afterGrade);
    w[rewardCurrency.key] = (Number(w[rewardCurrency.key]) || 0) + wheat;
    if (after > before) w[rewardCurrency.key] += 50 * (after - before);
    store.set('wallet', w);
    if (afterGrade > beforeGrade && game) {
      $('terrain-name').textContent = randomScenery();
      renderBoard();
    }
    rewardPop(`${why ? `${why} · ` : ''}+${natureCurrencyAmount(rewardCurrency, wheat, true)} · +${xp} XP`);
    if (after > before) { rewardPop(L(`Niveau ${after} atteint ! +${natureCurrencyAmount(rewardCurrency, 50 * (after - before), true)}`, `Level ${after} reached! +${natureCurrencyAmount(rewardCurrency, 50 * (after - before), true)}`), true); sounds.win(); }
    if (afterGrade > beforeGrade) {
      const collection = NATURE_COLLECTIONS.find((item) => item.id === activeNatureCollection) || NATURE_COLLECTIONS[0];
      const stage = collection.items[afterGrade - 1];
      setTimeout(() => rewardPop(L(`Grade ${afterGrade}/10 ! ${stage.icon} ${stage.name} rejoint ta collection.`, `Rank ${afterGrade}/10! ${stage.icon} ${stage.name} joins your collection.`), true), 800);
      const newCollection = AVAILABLE_NATURE_COLLECTIONS.find((item) => item.unlockGrade === afterGrade && item.id !== 'plants');
      if (newCollection) setTimeout(() => rewardPop(L(`Nouvelle collection débloquée : ${newCollection.icon} ${newCollection.name} !`, `New collection unlocked: ${newCollection.icon} ${newCollection.name}!`), true), 1900);
    }
    renderHomeRewards();
  }
  // Quêtes du jour : trois missions tirées chaque jour, qui font passer par les différents modes
  function questList() {
    return [
      { id: 'win_ai', goal: 1, text: L('Gagner une partie contre l\'ordinateur', 'Win a game against the computer') },
      { id: 'play_ai', goal: 2, text: L('Jouer 2 parties contre l\'ordinateur', 'Play 2 games against the computer') },
      { id: 'mate_ai', goal: 1, text: L('Gagner par échec et mat', 'Win by checkmate') },
      { id: 'puzzle', goal: 3, text: L('Résoudre 3 problèmes du premier coup', 'Solve 3 puzzles at the first try') },
      { id: 'daily', goal: 1, text: L('Réussir le défi du jour', 'Complete the daily challenge') },
      { id: 'lesson', goal: 1, text: L('Terminer une leçon (mat, finale, ouverture ou Devine le coup)', 'Finish a lesson (mate, endgame, opening or Guess the move)') },
      { id: 'opening', goal: 1, text: L('Réviser une ouverture sans faute', 'Review an opening without mistakes') },
      { id: 'online', goal: 1, text: L('Finir une partie en ligne', 'Finish an online game'), online: true },
    ];
  }
  function questState() {
    const d0 = new Date(), day = `${d0.getFullYear()}-${d0.getMonth() + 1}-${d0.getDate()}`; // même clé que todayKey
    let q = store.get('quests', null);
    if (!q || q.day !== day) {
      const pool = questList().filter((x) => !x.online || (window.Online && window.Online.user));
      let seed = [...day].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
      const ids = [];
      while (ids.length < 3 && pool.length) { seed = (seed * 1103515245 + 12345) >>> 0; ids.push(pool.splice(seed % pool.length, 1)[0].id); }
      q = { day, ids, prog: {}, claimed: {}, chest: false };
      store.set('quests', q);
    }
    return q;
  }
  function questEvent(type, n = 1) {
    const q = questState();
    if (!q.ids.includes(type) || q.claimed[type]) return;
    const def = questList().find((x) => x.id === type);
    q.prog[type] = (q.prog[type] || 0) + n;
    if (q.prog[type] >= def.goal) {
      q.claimed[type] = true; store.set('quests', q);
      reward(30, 40, L('Quête accomplie', 'Quest complete'));
      if (q.ids.every((id) => q.claimed[id]) && !q.chest) { q.chest = true; store.set('quests', q); reward(60, 60, L('Coffre des trois quêtes', 'Three-quest chest')); }
    } else { store.set('quests', q); renderHomeRewards(); }
  }
  // Gains par mode
  function gameReward(outcome, level, mate) {
    const w = walletState(), day = questState().day;
    questEvent('play_ai');
    if (outcome === 'win') countMode('ai');
    if (outcome === 'win') {
      reward(10 + 2 * level + (mate ? 5 : 0), 20 + 2 * level, L('Victoire', 'Win'));
      if (w.firstWin !== day) { const w2 = walletState(); w2.firstWin = day; store.set('wallet', w2); reward(20, 20, L('Première victoire du jour', 'First win of the day')); }
      questEvent('win_ai'); if (mate) questEvent('mate_ai');
    } else if (outcome === 'draw') reward(5 + level, 12 + level, L('Nulle', 'Draw'));
    else reward(3, 10, L('Partie jouée', 'Game played'));
  }
  function onlineReward(outcome, tournament) {
    const bonus = tournament ? 10 : 0;
    if (outcome === 'win') reward(30 + bonus, 50, tournament ? L('Victoire en tournoi', 'Tournament win') : L('Victoire en ligne', 'Online win'));
    else if (outcome === 'draw') reward(15 + bonus, 30, L('Nulle', 'Draw'));
    else reward(8 + bonus, 20, L('Partie jouée', 'Game played'));
    questEvent('online');
    countMode(tournament ? 'tournament' : 'online');
  }
  function lessonReward(key) {
    const first = !trainDone()[key];
    reward(first ? 25 : 5, first ? 40 : 10, L('Leçon terminée', 'Lesson finished'));
    questEvent('lesson');
    countMode('lesson');
  }
  // Boutique de Sissa : objets visuels achetés avec les grains de riz gagnés
  const SHOP_TITLE_PATHS = {
    plants: [['plants-1', L('Jardinier en herbe', 'Novice gardener')], ['plants-2', L('Gardien du potager', 'Garden keeper')], ['plants-3', L('Gardien du verger', 'Orchard keeper')], ['plants-4', L('Protecteur de la forêt', 'Forest guardian')], ['plants-5', L('Gardien du baobab', 'Baobab guardian')]],
    land: [['land-1', L('Explorateur de la basse-cour', 'Farmyard explorer')], ['land-2', L('Ami des herbivores', 'Herbivore friend')], ['land-3', L('Gardien des troupeaux', 'Herd guardian')], ['land-4', L('Protecteur des prédateurs', 'Predator protector')], ['land-5', L('Légende de la jungle', 'Jungle legend')]],
    birds: [['birds-1', L('Ami des oiseaux', 'Bird friend')], ['birds-2', L('Éclaireur des palmiers', 'Palm scout')], ['birds-3', L('Gardien des perroquets', 'Parrot guardian')], ['birds-4', L('Maître du ciel tropical', 'Master of the tropical sky')], ['birds-5', L('Légende de la forêt', 'Forest legend')]],
    ocean: [['ocean-1', L('Explorateur du rivage', 'Shore explorer')], ['ocean-2', L('Gardien du récif', 'Reef guardian')], ['ocean-3', L('Protecteur du lagon', 'Lagoon protector')], ['ocean-4', L('Maître des mers', 'Master of the seas')], ['ocean-5', L('Gardien de la baleine', 'Whale guardian')]],
    ancient: [['ancient-1', L('Légionnaire', 'Legionary')], ['ancient-2', L('Centurion', 'Centurion')], ['ancient-3', L('Maître des machines', 'Siege master')], ['ancient-4', L('Général', 'General')], ['ancient-5', L('Empereur', 'Emperor')]],
    modern: [['modern-1', L('Soldat', 'Soldier')], ['modern-2', L('Sergent', 'Sergeant')], ['modern-3', L('Tankiste', 'Tank commander')], ['modern-4', L('Pilote de chasse', 'Fighter pilot')], ['modern-5', L('Général', 'General')]],
    ninjas: [['ecuyer', L('Genin', 'Genin')], ['chevalier', L('Chûnin', 'Chunin')], ['seigneur', L('Jônin', 'Jonin')], ['vizir', L('Kage', 'Kage')], ['roi', L('Hokage', 'Hokage')]],
  };
  const SHOP_TITLE_ILLUSTRATIONS = {
    plants: ['🌱', '🧑🏽‍🌾', '🍎', '🌲', '🌳'],
    land: ['🐓', '🐘', '🐃', '🦁', '🐅'],
    birds: ['🐦', '🌴', '🦜', '🦅', '🦉'],
    ocean: ['🐚', '🪸', '🐠', '🌊', '🐋'],
    ninjas: ['🥷', '🗡️', '🛡️', '🐉', '🏯'],
    ancient: ['🛡️', '⚔️', '🏹', '🦅', '👑'],
    modern: ['🪖', '📡', '🛡️', '✈️', '⭐'],
  };
  function shopTitleItems() {
    const prices = [80, 200, 400, 700, 1200], levels = [1, 5, 10, 20, 30];
    return Object.entries(SHOP_TITLE_PATHS).flatMap(([collection, titles]) => titles.map(([key, name], i) => ({
      id: `title:${key}`, kind: 'title', key, collection, name, price: prices[i], lvl: levels[i],
      preview: `<span class="shop-title-art ${collection}" data-stage="${i + 1}" role="img" aria-label="${escHtml(name)}"><i aria-hidden="true"></i><b aria-hidden="true">${SHOP_TITLE_ILLUSTRATIONS[collection][i]}</b><small aria-hidden="true">${i + 1}/5</small></span>`,
    })));
  }
  function shopItems() {
    const out = [];
    for (const [k, th] of Object.entries(THEMES)) if (th.price) out.push({ id: `theme:${k}`, kind: 'theme', key: k, name: th.name, price: th.price, preview: `<span class="shop-board"><i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i></span>` });
    [['bronze', L('Cadre de bronze', 'Bronze frame'), 100], ['argent', L('Cadre d\'argent', 'Silver frame'), 250], ['or', L('Cadre d\'or', 'Gold frame'), 500], ['feu', L('Cadre de feu', 'Fire frame'), 800]]
      .forEach(([k, name, price]) => out.push({ id: `frame:${k}`, kind: 'frame', key: k, name, price, preview: `<span class="profile-photo shop-frame frame-${k}">♞</span>` }));
    out.push(...shopTitleItems().filter((item) => item.collection === activeNatureCollection));
    return out;
  }
  const owns = (id) => { const it = id.startsWith('theme:') ? THEMES[id.slice(6)] : null; return (it && !it.price) || walletState().owned.includes(id); };
  const titleName = (k) => { const it = shopTitleItems().find((x) => x.key === k); return it ? it.name : ''; };
  function renderHomeRewards() {
    const w = walletState(), lv = levelOf(w.xp), q = questState();
    const done = q.ids.filter((id) => q.claimed[id]).length;
    const grade = adventureGrade(lv.level), gradeInfo = natureGradesFor()[grade - 1], gradePct = adventureProgress(w.xp, grade);
    const balance = currentNatureBalance(w, grade);
    $('home-rewards').setAttribute('aria-label', L(`Grade nature, ${balance.currency.name} et quêtes du jour`, `Nature rank, ${balance.currency.name}, and daily quests`));
    $('home-rewards').innerHTML = `<span class="lvl-badge">${gradeInfo.icon} ${grade}/10</span><span class="xp-bar" title="${L('Progression du grade', 'Rank progress')}"><i style="width:${gradePct}%"></i></span><span>${natureCurrencyAmount(balance.currency, balance.amount, true)}</span><span>🎯 ${done}/3</span>`;
    const activeCollection = NATURE_COLLECTIONS.find((item) => item.id === activeNatureCollection) || NATURE_COLLECTIONS[0];
    if (grade < activeCollection.unlockGrade) activeNatureCollection = 'plants';
    const collection = NATURE_COLLECTIONS.find((item) => item.id === activeNatureCollection) || NATURE_COLLECTIONS[0];
    $('home-garden-grade').textContent = L(`Grade ${grade} sur 10 · ${gradeInfo.name}`, `Rank ${grade} of 10 · ${gradeInfo.name}`);
    $('home-currency-name').textContent = balance.currency.name;
    $('home-currency-icon').textContent = balance.currency.icon;
    $('home-garden-badge').textContent = `${gradeInfo.icon} ${grade} / 10`;
    $('home-garden-title').textContent = L(`Ta collection ${collection.name}`, `Your ${collection.name} collection`);
    // les icônes des boutons et des menus suivent le thème (plus d'icônes ninja dans les autres thèmes)
    if (window.setIconTheme) window.setIconTheme(collection.id);
    // personnages 3D : créatures et guerriers du thème (océan, plantes, animaux, oiseaux, Antiquité, moderne), ninjas sinon
    const pieceTheme = window.ThemeModels && window.ThemeModels[collection.id] ? collection.id : 'ninja';
    if (window.PieceTheme !== pieceTheme) {
      window.PieceTheme = pieceTheme;
      if (b3d && b3d.rebuildPieces) { b3d.rebuildPieces(); if (game) render(); }
    }
    // l'en-tête et l'accueil suivent le thème choisi
    $('home-theme-heading').textContent = L(`Thème ${collection.name} ${collection.icon}`, `${collection.name} theme ${collection.icon}`);
    const card = $('home-theme-heading').closest('.home-section-heading') && document.querySelector('.home-garden-card');
    if (card) card.setAttribute('aria-label', L(`Thème ${collection.name}`, `${collection.name} theme`));
    const HERO = {
      ninjas: [L('Ton chemin de ninja', 'Your ninja path'), L('Prêt à devenir Hokage ?', 'Ready to become Hokage?')],
      plants: [L('Ton jardin prend vie', 'Your garden comes alive'), L('Prêt à faire grandir ton jardin ?', 'Ready to grow your garden?')],
      land: [L('Ta réserve s’agrandit', 'Your reserve is growing'), L('Prêt à rencontrer de nouveaux animaux ?', 'Ready to meet new animals?')],
      birds: [L('Ta volière s’agrandit', 'Your aviary is growing'), L('Prêt à faire chanter ta volière ?', 'Ready to make your aviary sing?')],
      ocean: [L('Ton lagon s’éveille', 'Your lagoon awakens'), L('Prêt à plonger dans l’océan Indien ?', 'Ready to dive into the Indian Ocean?')],
      ancient: [L('Ta légion se rassemble', 'Your legion gathers'), L('Prêt à conquérir l’Antiquité ?', 'Ready to conquer the ancient world?')],
      modern: [L('Ton bataillon se prépare', 'Your battalion gets ready'), L('Prêt pour la mission ?', 'Ready for the mission?')],
    }[collection.id] || [L('Ton aventure continue', 'Your adventure continues'), L('Prêt pour un nouveau défi ?', 'Ready for a new challenge?')];
    $('home-hero-kicker').textContent = HERO[0]; $('home-hero-title').textContent = HERO[1];
    // fond d'écran du thème dans la bannière d'accueil (pour les thèmes qui en ont un)
    const welcome = document.querySelector('.home-welcome');
    if (welcome) { if (HOME_BACKGROUNDS.includes(collection.id)) welcome.dataset.themeBg = collection.id; else delete welcome.dataset.themeBg; }
    $('home-garden-copy').textContent = NATURE_PREVIEW_ALL_UNLOCKED
      ? L(`Toutes les étapes du thème ${collection.name} sont ouvertes à l’exploration !`, `Every ${collection.name} theme stage is open to explore!`)
      : collection.id === 'plants'
      ? L(`${grade}/10 plantes débloquées · gagne de l’expérience pour faire grandir ton jardin.`, `${grade}/10 plants unlocked · earn experience to grow your garden.`)
      : L(`${grade}/10 découvertes · les récompenses de tes défis ouvrent de nouveaux paysages.`, `${grade}/10 discoveries · challenge rewards reveal new places.`);
    // bandeau de la saison du mois
    const season = NATURE_COLLECTIONS.find((item) => item.id === seasonTheme());
    if (season) {
      $('home-season').innerHTML = `<span>🏆 ${escHtml(L(`Saison ${/^[aeiouy]/i.test(seasonMonth()) ? 'd’' : 'de '}${seasonMonth()} : thème ${season.name} ${season.icon} à l’honneur, récompenses ×1,5 en jouant avec lui.`, `${seasonMonth()} season: ${season.name} ${season.icon} theme in the spotlight, rewards ×1.5 when you play with it.`))}</span>`
        + (collection.id === season.id ? `<strong>${L('Bonus actif ✓', 'Bonus on ✓')}</strong>` : `<button type="button" class="btn" data-nature-collection="${season.id}">${L('Jouer ce thème', 'Play this theme')}</button>`);
    }
    $('home-collection-tabs').innerHTML = AVAILABLE_NATURE_COLLECTIONS.map((item) => {
      const available = grade >= item.unlockGrade, selected = collection.id === item.id;
      return `<button type="button" class="home-collection-tab${selected ? ' selected' : ''}${available ? '' : ' locked'}" data-nature-collection="${item.id}" ${available ? '' : `aria-label="${escHtml(L(`${item.name}, se débloque au grade ${item.unlockGrade}`, `${item.name}, unlocks at rank ${item.unlockGrade}`))}"`} aria-pressed="${selected}" title="${escHtml(available ? item.name : L(`Débloqué au grade ${item.unlockGrade}`, `Unlocks at rank ${item.unlockGrade}`))}"${HOME_BACKGROUNDS.includes(item.id) ? ` style="background-image:url('fond_ecran/mini/${item.id}.webp')"` : ''}><span>${item.id === seasonTheme() ? '🏆 ' : ''}${item.icon} ${escHtml(item.name)}${available ? '' : ` · 🔒 ${item.unlockGrade}`}</span></button>`;
    }).join('');
    // carrousel : le thème choisi reste visible au centre
    const pickedTab = $('home-collection-tabs').querySelector('.selected');
    if (pickedTab) requestAnimationFrame(() => { const nav = $('home-collection-tabs'); nav.scrollLeft = pickedTab.offsetLeft - (nav.clientWidth - pickedTab.offsetWidth) / 2; });
    $('home-garden-plants').innerHTML = collection.items.map((plant, index) => {
      const unlocked = NATURE_PREVIEW_ALL_UNLOCKED || index < grade, baobab = index === GARDEN_PLANTS.length - 1;
      return `<div class="home-garden-plant${unlocked ? ' unlocked' : ' locked'}${collection.id === 'ocean' && baobab ? ' whale-plant' : ''}${collection.id === 'plants' && baobab ? ' baobab-plant' : ''}" title="${escHtml(unlocked ? plant.name : L(`Grade ${index + 1} : ${plant.name}`, `Rank ${index + 1}: ${plant.name}`))}"><span class="plant-icon">${unlocked ? plant.icon : '🔒'}</span><small>${escHtml(unlocked ? plant.name : L(`Grade ${index + 1}`, `Rank ${index + 1}`))}</small></div>`;
    }).join('');
    const nextPlant = collection.items[grade];
    const nextCollection = AVAILABLE_NATURE_COLLECTIONS.find((item) => grade < item.unlockGrade);
    $('home-garden-next').textContent = NATURE_PREVIEW_ALL_UNLOCKED
      ? L('Tous les thèmes et toutes les étapes sont disponibles à l’exploration.', 'All themes and stages are available to explore.')
      : nextPlant
      ? L(`Prochaine découverte au grade ${grade + 1} : ${nextPlant.icon} ${nextPlant.name}`, `Next discovery at rank ${grade + 1}: ${nextPlant.icon} ${nextPlant.name}`)
      : collection.id === 'ocean'
        ? L('La baleine est arrivée : tu as exploré tout l’océan Indien !', 'The whale is here: you explored the whole Indian Ocean!')
        : nextCollection
          ? L(`Prochaine collection au grade ${nextCollection.unlockGrade} : ${nextCollection.icon} ${nextCollection.name}`, `Next collection at rank ${nextCollection.unlockGrade}: ${nextCollection.icon} ${nextCollection.name}`)
          : L('Tu as exploré toutes les étapes du thème Ninjas !', 'You explored every stage of the Ninjas theme!');
    $('home-rice-amount').textContent = natureCurrencyAmount(balance.currency, balance.amount);
    if (balance.currency.scale === 'rice') {
      const rice = riceScale(balance.amount), nextRice = rice.next;
      $('home-rice-conversion').textContent = L('40 000 grains de riz ≈ 1 kg.', '40,000 rice grains ≈ 1 kg.');
      $('home-rice-progress-bar').style.width = `${rice.progress}%`;
      $('home-rice-next').textContent = nextRice ? L(`Prochain changement d’unité : ${riceAmount(nextRice.value)}.`, `Next unit change: ${riceAmount(nextRice.value)}.`) : L('Une réserve digne de la légende de Sissa !', 'A reserve worthy of the legend of Sissa!');
    } else {
      $('home-rice-conversion').textContent = L('Gagne cette monnaie en réussissant des défis.', 'Earn this currency by completing challenges.');
      $('home-rice-progress-bar').style.width = `${(balance.amount % 100) || (balance.amount ? 100 : 0)}%`;
      $('home-rice-next').textContent = L(`Monnaie de la collection « ${collection.name} ».`, `Currency for the “${collection.name}” collection.`);
    }
    $('home-quest-count').textContent = L(`${done} sur 3 accomplies`, `${done} of 3 complete`);
    const nextQuestId = q.ids.find((id) => !q.claimed[id]);
    if (nextQuestId) {
      const def = questList().find((item) => item.id === nextQuestId), progress = Math.min(def.goal, q.prog[nextQuestId] || 0);
      $('home-quest-icon').textContent = ({ puzzle: '🧩', lesson: '📘', daily: '🌞', online: '♟️', win_ai: '🏆', play_ai: '♟️', mate_ai: '👑', opening: '🌱' })[nextQuestId] || '🎯';
      $('home-quest-title').textContent = def.text;
      $('home-quest-copy').textContent = L(`Progression ${progress}/${def.goal} · récompense : ${natureCurrencyAmount(balance.currency, 30, true)}.`, `Progress ${progress}/${def.goal} · reward: ${natureCurrencyAmount(balance.currency, 30, true)}.`);
    } else {
      $('home-quest-icon').textContent = q.chest ? '✅' : '🎁';
      $('home-quest-title').textContent = q.chest ? L('Toutes les quêtes sont réussies !', 'All quests complete!') : L('Le coffre des quêtes est prêt !', 'Your quest chest is ready!');
      $('home-quest-copy').textContent = q.chest ? L('Tes prochaines quêtes arrivent demain.', 'New quests arrive tomorrow.') : L(`Ouvre le coffre : ${natureCurrencyAmount(balance.currency, 60, true)} t’attendent.`, `Open the chest: ${natureCurrencyAmount(balance.currency, 60, true)} are waiting.`);
    }
    $('home-player-photo').className = 'profile-photo' + (w.frame ? ` frame-${w.frame}` : '');
    $('home-player-title').hidden = !w.title; $('home-player-title').textContent = w.title ? `« ${titleName(w.title)} »` : '';
  }
  let shopCategory = 'theme';
  function renderShop() {
    const w = walletState(), lv = levelOf(w.xp), q = questState(), defs = questList();
    const natureGrade = adventureGrade(lv.level), natureInfo = natureGradesFor()[natureGrade - 1];
    const currency = currentNatureBalance(w, natureGrade);
    let html = `<div class="shop-welcome"><div class="shop-welcome-copy"><span class="shop-kicker">${L('LE TRÉSOR DE SISSA', 'SISSA’S TREASURE')}</span><h3>${L('La boutique des ninjas', 'The ninja shop')}</h3><p>${L('Choisis un trésor pour personnaliser ton aventure. Gagne des pièces en jouant, en apprenant et en relevant des défis.', 'Choose a treasure to personalize your adventure. Earn coins by playing, learning and taking on challenges.')}</p></div><div class="shop-welcome-wallet"><span>${L('Ton trésor', 'Your treasure')}</span><strong>${currency.currency.icon} ${natureCurrencyAmount(currency.currency, currency.amount)}</strong><small>${currency.currency.name}</small></div></div>`;
    html += `<div class="shop-head"><span class="lvl-badge big">${natureInfo.icon} ${L('Grade', 'Rank')} ${natureGrade}/10</span><div class="shop-xp"><span class="xp-bar"><i style="width:${adventureProgress(w.xp, natureGrade)}%"></i></span><small>${lv.level >= 50 ? L(`Palier maximal atteint : ${natureInfo.name}`, `Top rank reached: ${natureInfo.name}`) : `${natureInfo.name} · ${lv.into} / ${lv.need} XP`}</small></div></div>`;
    html += `<p class="level-help">${L(`Gagne des ${currency.currency.unit} et de l’expérience dans tous les modes : parties, problèmes, leçons, défi du jour, parties en ligne et tournois. Chaque niveau gagné rapporte 50 ${currency.currency.unit}.`, `Earn ${currency.currency.unit} and experience in every mode: games, puzzles, lessons, daily challenge, online games and tournaments. Each level gives 50 ${currency.currency.unit}.`)}</p>`;
    html += `<h3 class="train-h shop-section-title">${L('Quêtes du jour', 'Daily quests')}<small>${L('Des pièces à gagner', 'Coins to earn')}</small></h3><div class="quest-list">${q.ids.map((id) => { const d = defs.find((x) => x.id === id); const p = Math.min(d.goal, q.prog[id] || 0), pct = Math.round(p / d.goal * 100); return `<div class="quest${q.claimed[id] ? ' done' : ''}"><div class="quest-copy"><span>${q.claimed[id] ? '✅' : '🎯'} ${d.text}</span><small>${p} / ${d.goal}</small><i class="quest-progress"><b style="width:${pct}%"></b></i></div><strong>${natureCurrencyAmount(currency.currency, 30, true)}</strong></div>`; }).join('')}<div class="quest chest${q.chest ? ' done' : ''}"><div class="quest-copy"><span>${q.chest ? '✅' : '🎁'} ${L('Coffre des trois quêtes', 'Three-quest chest')}</span><small>${q.ids.filter((id) => q.claimed[id]).length} / 3</small><i class="quest-progress"><b style="width:${q.ids.filter((id) => q.claimed[id]).length / 3 * 100}%"></b></i></div><strong>${natureCurrencyAmount(currency.currency, 60, true)}</strong></div></div>`;
    const tabs = [
      ['theme', '🧩', L('Plateaux', 'Boards')],
      ['frame', '🖼️', L('Cadres', 'Frames')],
      ['title', '🏅', L('Titres', 'Titles')],
    ];
    html += `<div class="shop-tabs" role="tablist" aria-label="${L('Catégories de la boutique', 'Shop categories')}">${tabs.map(([kind, icon, label]) => {
      const items = shopItems().filter((item) => item.kind === kind), count = items.filter((item) => owns(item.id)).length;
      return `<button type="button" role="tab" class="shop-tab${shopCategory === kind ? ' active' : ''}" data-shop-tab="${kind}" aria-selected="${shopCategory === kind}"><span>${icon} ${label}</span><small>${count}/${items.length}</small></button>`;
    }).join('')}</div>`;
    const currentItems = shopItems().filter((item) => item.kind === shopCategory);
    let equipped;
    if (shopCategory === 'theme') {
      const theme = THEMES[settings.theme] || THEMES.foret;
      equipped = { name: theme.name, preview: `<span class="shop-board"><i style="background:${theme.light}"></i><i style="background:${theme.dark}"></i><i style="background:${theme.dark}"></i><i style="background:${theme.light}"></i></span>` };
    } else if (shopCategory === 'frame') {
      equipped = w.frame ? shopItems().find((item) => item.kind === 'frame' && item.key === w.frame) : null;
      equipped ||= { name: L('Cadre standard', 'Default frame'), preview: `<span class="shop-frame">${(NATURE_COLLECTIONS.find((c) => c.id === activeNatureCollection) || { icon: '♞' }).icon}</span>` };
    } else {
      equipped = w.title ? shopTitleItems().find((item) => item.key === w.title) : null;
    }
    const equippedName = equipped ? equipped.name : L('Aucun titre équipé', 'No title equipped');
    const equippedPreview = equipped ? equipped.preview : '<span class="shop-no-title">🏅</span>';
    html += `<div class="shop-equipped"><span class="shop-equipped-caption">${L('Actuellement équipé', 'Currently equipped')}</span><span class="shop-equipped-preview">${equippedPreview}</span><b>${equippedName}</b></div>`;
    if (shopCategory === 'title') {
      const pathItems = shopTitleItems().filter((item) => item.collection === activeNatureCollection);
      html += `<div class="shop-title-path"><b>${L('Parcours des titres', 'Title path')}</b><div>${pathItems.map((item, index) => `<span class="shop-title-step${owns(item.id) ? ' reached' : ''}${w.title === item.key ? ' current' : ''}" title="${item.name}"><i>${SHOP_TITLE_ILLUSTRATIONS[item.collection][index]}</i><small>${index + 1}</small></span>`).join('')}</div></div>`;
    }
    const section = (kind, title) => {
      const items = currentItems;
      return `<h3 class="train-h shop-section-title">${title}<small>${L(`${items.filter((item) => owns(item.id)).length} possédé(s)`, `${items.filter((item) => owns(item.id)).length} owned`)}</small></h3><div class="shop-grid">${items.map((it) => {
        const have = owns(it.id), used = (kind === 'frame' && w.frame === it.key) || (kind === 'title' && w.title === it.key) || (kind === 'theme' && settings.theme === it.key);
        const locked = it.lvl && lv.level < it.lvl;
        const state = used ? L('Équipé', 'Equipped') : have ? L('Possédé · prêt à équiper', 'Owned · ready to equip') : locked ? L(`Débloqué au niveau ${it.lvl}`, `Unlocks at level ${it.lvl}`) : currency.amount >= it.price ? L('Disponible', 'Available') : L(`Encore ${natureCurrencyAmount(currency.currency, it.price - currency.amount, true)} à gagner`, `Earn ${natureCurrencyAmount(currency.currency, it.price - currency.amount, true)} more`);
        const btn = used ? `<button class="btn" data-shop-off="${it.id}">${kind === 'theme' ? L('Utilisé', 'In use') : L('Retirer', 'Remove')}</button>`
          : have ? `<button class="btn primary" data-shop-use="${it.id}">${L('Utiliser', 'Use')}</button>`
          : locked ? `<button class="btn" disabled>${L(`Niveau ${it.lvl}`, `Level ${it.lvl}`)}</button>`
          : `<button class="btn${currency.amount >= it.price ? ' primary' : ''}" data-shop-buy="${it.id}" ${currency.amount >= it.price ? '' : 'disabled'}>${natureCurrencyAmount(currency.currency, it.price, true)}</button>`;
        return `<div class="shop-item${used ? ' on' : ''}${have && !used ? ' owned' : ''}${locked ? ' locked' : ''}" data-kind="${kind}"><div class="shop-item-preview">${it.preview}</div><b>${it.name}</b><small class="shop-item-state${used ? ' equipped' : ''}">${state}</small>${btn}</div>`;
      }).join('')}</div>`;
    };
    const activeTab = tabs.find(([kind]) => kind === shopCategory) || tabs[0];
    html += `<div class="shop-tab-panel" role="tabpanel" aria-label="${activeTab[2]}">${shopCategory === 'title' ? section('title', activeTab[2]) : shopCategory === 'frame' ? section('frame', L('Cadres de photo', 'Photo frames')) : section('theme', activeTab[2])}</div>`;
    html += `<details class="shop-tier-details"><summary>${L('🏆 Progression des récompenses par mode', '🏆 Rewards progress by mode')}</summary>${tiersHtml()}</details>`;
    $('shop-body').innerHTML = html;
  }
  function openShop() {
    returnTo = document.body.dataset.screen && document.body.dataset.screen !== 'shop' ? document.body.dataset.screen : 'home';
    show('shop'); renderShop();
  }
  $('shop-body').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-shop-tab]');
    if (tab) { shopCategory = tab.dataset.shopTab; renderShop(); return; }
    const b = e.target.closest('[data-shop-buy],[data-shop-use],[data-shop-off]'); if (!b) return;
    const w = walletState();
    const id = b.dataset.shopBuy || b.dataset.shopUse || b.dataset.shopOff, it = shopItems().find((x) => x.id === id);
    if (b.dataset.shopBuy) {
      const grade = adventureGrade(levelOf(w.xp).level), currency = currentNatureBalance(w, grade);
      if (currency.amount < it.price || owns(id)) return;
      w[currency.currency.key] = currency.amount - it.price; w.owned.push(id); store.set('wallet', w);
      rewardPop(L(`${it.name} acheté !`, `${it.name} bought!`), true);
    }
    if (b.dataset.shopBuy || b.dataset.shopUse) {
      const w2 = walletState();
      if (it.kind === 'theme') { settings.theme = it.key; saveSettings(); }
      if (it.kind === 'frame') w2.frame = it.key;
      if (it.kind === 'title') w2.title = it.key;
      store.set('wallet', w2);
    } else if (it.kind !== 'theme') { const w2 = walletState(); if (it.kind === 'frame') w2.frame = null; else w2.title = null; store.set('wallet', w2); }
    renderShop(); renderHomeRewards();
  });
  $('btn-shop').onclick = openShop;
  $('home-rewards').onclick = openShop;
  $('btn-home-rice-shop').onclick = () => $('home-rewards').click();
  $('home-season').addEventListener('click', (event) => { const b = event.target.closest('[data-nature-collection]'); if (b) { const tab = $('home-collection-tabs').querySelector(`[data-nature-collection="${b.dataset.natureCollection}"]`); if (tab) tab.click(); } });
  $('home-collection-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-nature-collection]');
    if (!button) return;
    const selected = AVAILABLE_NATURE_COLLECTIONS.find((item) => item.id === button.dataset.natureCollection);
    const grade = adventureGrade(levelOf(walletState().xp).level);
    if (!selected || grade < selected.unlockGrade) return;
    activeNatureCollection = selected.id;
    store.set('natureCollection', selected.id);
    renderHomeRewards();
  });
  /* ---------- Joueurs : liste, adversaire proposé, chat coupé ---------- */
  let onlineSection = null, onlinePlayers = null, playersQuery = '', playersLoading = false;
  const isConnected = (p) => Date.now() - (p.lastSeen || 0) < 3 * 60000;
  const mutedList = () => (ON && ON.profile && ON.profile.muted) || [];
  function lastSeenLabel(p) {
    if (isConnected(p)) return L('connecté', 'online');
    if (!p.lastSeen) return '';
    const m = Math.round((Date.now() - p.lastSeen) / 60000);
    if (m < 60) return L(`vu il y a ${m} min`, `seen ${m} min ago`);
    if (m < 1440) return L(`vu il y a ${Math.round(m / 60)} h`, `seen ${Math.round(m / 60)} h ago`);
    return L(`vu il y a ${Math.round(m / 1440)} j`, `seen ${Math.round(m / 1440)} d ago`);
  }
  async function loadPlayers() {
    if (playersLoading) return;
    playersLoading = true;
    try { onlinePlayers = await ON.listPlayers(); } catch { onlinePlayers = onlinePlayers || []; }
    playersLoading = false;
    if (document.body.dataset.screen === 'online') renderOnline();
  }
  function playerRow(p, suggested) {
    const muted = mutedList().includes(p.uid), q = playersQuery.toLowerCase();
    const hide = !suggested && q && !String(p.pseudo || '').toLowerCase().includes(q);
    return `<div class="replay-row player-row" data-name="${escHtml(String(p.pseudo || '').toLowerCase())}"${hide ? ' hidden' : ''}>
      <button type="button" class="btn replay-item" data-profile="${p.uid}"><strong><i class="on-dot${isConnected(p) ? ' on' : ''}"></i>${escHtml(p.pseudo || '?')} (${p.elo})${p.summary && p.summary.title ? ` <em class="player-title">« ${escHtml(p.summary.title)} »</em>` : ''}</strong><span>${gradeLabel(p.gradePts)} · ${p.summary && p.summary.level ? `${L('Niveau', 'Level')} ${p.summary.level} · ` : ''}${lastSeenLabel(p)}${muted ? L(' · chat coupé', ' · chat muted') : ''}</span></button>
      <button class="btn primary" data-invite-uid="${p.uid}">${L('Inviter', 'Invite')}</button>
      <button class="btn ghost" data-mute="${p.uid}" title="${muted ? L('Réactiver le chat avec ce joueur', 'Unmute chat with this player') : L('Couper le chat avec ce joueur', 'Mute chat with this player')}" aria-label="${muted ? L('Réactiver le chat', 'Unmute chat') : L('Couper le chat', 'Mute chat')}">${muted ? '🔇' : '💬'}</button>
    </div>`;
  }
  // Adversaire proposé : joueurs connectés de niveau le plus proche (sinon les plus récemment vus)
  let suggestedOpp = null;
  function suggestOpponent() {
    const me = ON.user.uid, myElo = estimatedElo();
    const pool = (onlinePlayers || []).filter((p) => p.uid !== me && !mutedList().includes(p.uid));
    const live = pool.filter(isConnected), recent = pool.filter((p) => Date.now() - p.lastSeen < 7 * 86400000);
    const src = live.length ? live : recent;
    if (!src.length) return null;
    // un peu de hasard parmi les trois plus proches pour ne pas proposer toujours le même
    const close = src.slice().sort((a, b) => Math.abs(a.elo - myElo) - Math.abs(b.elo - myElo)).slice(0, 3);
    return close[Math.floor(Math.random() * close.length)];
  }
  function playersHtml(part) {
    let html = part === 'list' ? '' : `
      <button id="on-suggest" class="btn primary wide" type="button">🎲 ${L('Proposer un adversaire de mon niveau', 'Suggest an opponent at my level')}</button>`;
    if (suggestedOpp) html += `<p class="level-help">${L(`Je te propose <b>${escHtml(suggestedOpp.pseudo)}</b> (Elo ${suggestedOpp.elo}, ${lastSeenLabel(suggestedOpp)}) : son niveau est proche du tien (${estimatedElo()}).`, `I suggest <b>${escHtml(suggestedOpp.pseudo)}</b> (Elo ${suggestedOpp.elo}, ${lastSeenLabel(suggestedOpp)}): their level is close to yours (${estimatedElo()}).`)}</p><div class="replay-items">${playerRow(suggestedOpp, true)}</div>`;
    if (part === 'find') return html;
    if (!onlinePlayers) return `${html}<p class="level-help">${L('Chargement des joueurs…', 'Loading players…')}</p>`;
    const others = onlinePlayers.filter((p) => p.uid !== ON.user.uid);
    const live = others.filter(isConnected).length;
    html += `<div class="players-tools"><input id="on-search" class="profile-name-input" type="search" placeholder="${L('Chercher un joueur', 'Search a player')}" value="${escHtml(playersQuery)}"><button id="on-refresh" class="btn ghost" type="button" aria-label="${L('Actualiser', 'Refresh')}">↻</button></div>
      <p class="level-help">${L(`${others.length} joueur${others.length > 1 ? 's' : ''}, dont ${live} connecté${live > 1 ? 's' : ''}. Choisis la cadence plus haut, puis « Inviter ».`, `${others.length} player${others.length === 1 ? '' : 's'}, ${live} online. Choose the time control above, then “Invite”.`)}</p>`;
    html += others.length ? `<div class="replay-items players-list">${others.map((p) => playerRow(p)).join('')}</div>` : `<p class="level-help">${L('Aucun autre joueur pour le moment.', 'No other player yet.')}</p>`;
    return html;
  }
  async function invitePlayer(uid, msg) {
    const p = (onlinePlayers || []).find((x) => x.uid === uid);
    if (!p) return;
    const tc = $('on-tc').value; store.set('onlineTc', tc);
    msg(L('Envoi…', 'Sending…'), true);
    try { await ON.invite(p.pseudo, tc, { uid: p.uid, pseudo: p.pseudo, elo: p.elo }); msg(L(`Invitation envoyée à ${p.pseudo}. La partie s'ouvrira dès qu'il ou elle l'acceptera.`, `Invitation sent to ${p.pseudo}. The game will open as soon as they accept.`), true); } catch (err) { msg(ON.explain(err)); }
  }
  async function toggleMute(uid) {
    const list = mutedList().slice(), i = list.indexOf(uid);
    if (i >= 0) list.splice(i, 1); else list.push(uid);
    try { await ON.setMuted(list); } catch (err) { toast(ON.explain(err)); return; }
    if (document.body.dataset.screen === 'online') renderOnline();
    if (cfg && cfg.mode === 'online') renderChat();
  }
  $('online-body').addEventListener('input', (e) => {
    if (e.target.id !== 'on-search') return;
    playersQuery = e.target.value;
    const q = playersQuery.trim().toLowerCase();
    document.querySelectorAll('.players-list .player-row').forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
  });

  /* ---------- Chat pendant une partie en ligne ---------- */
  let oppMutedMe = false, chatSeen = 0;
  function renderChat() {
    const box = $('chat'), g = onlineGame;
    if (!g || !cfg || cfg.mode !== 'online') { box.hidden = true; return; }
    box.hidden = false;
    const me = ON.user.uid, opp = g.white === me ? g.black : g.white, oppName = g.white === me ? g.blackName : g.whiteName;
    const muted = mutedList().includes(opp);
    const msgs = (g.chat || []).filter((m) => !(muted && m.from === opp));
    $('chat-log').innerHTML = msgs.length ? msgs.map((m) => `<div class="chat-msg${m.from === me ? ' me' : ''}"><b>${escHtml(m.name)}</b> ${escHtml(m.text)}</div>`).join('') : `<p class="level-help">${muted ? L('Les messages de ce joueur sont masqués.', 'This player’s messages are hidden.') : L('Écris un message à ton adversaire.', 'Write a message to your opponent.')}</p>`;
    $('chat-log').scrollTop = $('chat-log').scrollHeight;
    const off = muted || oppMutedMe || (g.chat || []).length >= 300;
    $('chat-input').disabled = off; $('chat-send').disabled = off;
    $('chat-input').placeholder = muted ? L(`Chat coupé avec ${oppName}`, `Chat muted with ${oppName}`) : oppMutedMe ? L(`${oppName} a coupé le chat`, `${oppName} muted the chat`) : L('Message…', 'Message…');
    $('chat-mute').textContent = muted ? L('🔇 Réactiver le chat', '🔇 Unmute chat') : L('💬 Couper le chat', '💬 Mute chat');
    $('chat-mute').dataset.uid = opp;
  }
  function onChatUpdate(g) {
    const chat = g.chat || [], me = ON.user.uid;
    const opp = g.white === me ? g.black : g.white;
    if (chat.length > chatSeen && chatSeen) { const last = chat[chat.length - 1]; if (last.from !== me && !mutedList().includes(last.from)) { sounds.move(); const r = $('chat').getBoundingClientRect(); if (r.top > innerHeight - 40 || r.bottom < 0) toast(`${last.name} : ${last.text}`); } }
    chatSeen = chat.length;
    if (opp) renderChat();
  }
  $('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = $('chat-input').value.trim();
    if (!t || !onlineGame) return;
    // l'adversaire a peut-être coupé le chat depuis le début de la partie
    const me = ON.user.uid, opp = onlineGame.white === me ? onlineGame.black : onlineGame.white;
    try { const u = await ON.getProfile(opp); oppMutedMe = !!(u && (u.muted || []).includes(me)); } catch { /* hors ligne */ }
    if (oppMutedMe) { renderChat(); return; }
    $('chat-input').value = '';
    try { await ON.sendChat(onlineGame.id, t); } catch (err) { toast(ON.explain(err)); }
  });
  $('chat-mute').onclick = () => { if ($('chat-mute').dataset.uid) toggleMute($('chat-mute').dataset.uid); };
  $('btn-online').onclick = () => {
    returnTo = 'home';
    onlinePlayers = null; suggestedOpp = null; onlineSection = null;
    // sans pseudo, on le demande avant de jouer
    renderOnline(); show('online');
    if (ON) ON.load().then(() => { if (!ON.user) renderOnline(); }).catch(() => {});
  };

  // Partie en ligne : le plateau suit la partie stockée sur le serveur
  let onlineStop = null, onlineTimer = null, onlineGame = null, onlinePhotos = {};
  /* ---------- Entre deux humains : valider son coup (différé), reprendre un coup, proposer la nulle ---------- */
  let pendingMove = null;
  const isDeferred = () => cfg && cfg.mode === 'online' && onlineGame && !(ON.TIME_CONTROLS[onlineGame.tc] || {}).ms;
  const humanVsHuman = () => cfg && (cfg.mode === 'local' || cfg.mode === 'online');
  function renderConfirm() {
    const deferred = isDeferred();
    $('auto-confirm').hidden = !deferred || !!result;
    $('opt-autoconfirm').checked = settings.autoConfirm !== false;
    $('confirm-bar').hidden = !pendingMove;
    if (pendingMove) $('confirm-text').textContent = L(`Ton coup : ${pendingMove.san}`, `Your move: ${pendingMove.san}`);
  }
  $('opt-autoconfirm').addEventListener('change', (e) => { settings.autoConfirm = e.target.checked; store.set('settings', settings); renderConfirm(); });
  function sendOnlineMove(uci, ply, over) {
    ON.playMove(cfg.online.id, uci, ply, over).catch(() => toast(L('Coup non envoyé : vérifie ta connexion.', 'Move not sent: check your connection.')));
  }
  $('btn-confirm-move').onclick = () => {
    if (!pendingMove) return;
    const p = pendingMove; pendingMove = null;
    sendOnlineMove(p.uci, p.ply, null);
    renderConfirm(); render();
  };
  $('btn-cancel-move').onclick = () => {
    if (!pendingMove) return;
    pendingMove = null;
    game.undo(); selected = -1;
    renderConfirm(); render(); save();
  };
  // Annuler son dernier coup : l'adversaire doit l'accepter (refus : le coup reste)
  function requestTakeback() {
    if (result) return;
    if (cfg.mode === 'local') {
      const by = game.turn === 'w' ? L('Noirs', 'Black') : L('Blancs', 'White'), other = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      modal({ title: L('Annuler le dernier coup ?', 'Take back the last move?'), text: L(`Les ${by} demandent à reprendre leur dernier coup. Les ${other} acceptent-ils ?`, `${by} ask to take back their last move. Do ${other} accept?`), actions: [
        { label: L(`Les ${other} acceptent`, `${other} accept`), primary: true, onClick: () => { game.undo(); selected = -1; hint = null; render(); save(); } },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => toast(L('Demande refusée : le coup reste joué.', 'Request refused: the move stands.')) },
      ] });
      return;
    }
    if (cfg.mode !== 'online' || !onlineGame || !isDeferred()) return;
    if (onlineGame.takeback) { toast(L('Une demande est déjà en attente.', 'A request is already pending.')); return; }
    ON.requestTakeback(onlineGame.id).then(() => toast(L('Demande envoyée : ton adversaire doit l’accepter.', 'Request sent: your opponent must accept it.'))).catch((e) => toast(ON.explain(e)));
  }
  // Proposer la nulle
  $('btn-draw').onclick = () => {
    if (result || !humanVsHuman()) return;
    if (cfg.mode === 'local') {
      const by = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black'), other = game.turn === 'w' ? L('Noirs', 'Black') : L('Blancs', 'White');
      modal({ title: L('Proposer la nulle ?', 'Offer a draw?'), text: L(`Les ${by} proposent la nulle. Les ${other} acceptent-ils ?`, `${by} offer a draw. Do ${other} accept?`), actions: [
        { label: L(`Les ${other} acceptent`, `${other} accept`), primary: true, onClick: () => { result = { result: '1/2-1/2', reason: 'accord' }; finish(); } },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => toast(L('Nulle refusée : la partie continue.', 'Draw refused: the game goes on.')) },
      ] });
      return;
    }
    if (!onlineGame) return;
    if (onlineGame.drawOffer) { toast(L('Une proposition est déjà en attente.', 'An offer is already pending.')); return; }
    modal({ title: L('Proposer la nulle ?', 'Offer a draw?'), text: L('Ton adversaire pourra accepter ou refuser.', 'Your opponent can accept or refuse.'), actions: [
      { label: L('Proposer', 'Offer'), primary: true, onClick: () => ON.offerDraw(onlineGame.id).then(() => toast(L('Nulle proposée.', 'Draw offered.'))).catch((e) => toast(ON.explain(e))) },
      { label: L('Annuler', 'Cancel'), ghost: true },
    ] });
  };
  // Demandes reçues de l'adversaire en ligne, et réponses à mes demandes
  const answered = new Set();
  function onlineRequests(g) {
    const me = ON.user.uid, opp = g.white === me ? g.blackName : g.whiteName;
    if (g.status !== 'active') return;
    if (g.takeback && g.takeback.by !== me && !answered.has(`t${g.takeback.at}`)) {
      answered.add(`t${g.takeback.at}`);
      modal({ title: L('Annuler un coup ?', 'Take back a move?'), text: L(`${opp} demande à reprendre son dernier coup.`, `${opp} asks to take back their last move.`), actions: [
        { label: L('Accepter', 'Accept'), primary: true, onClick: () => ON.answerTakeback(g.id, true).catch((e) => toast(ON.explain(e))) },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => ON.answerTakeback(g.id, false).catch((e) => toast(ON.explain(e))) },
      ] });
    }
    if (g.drawOffer && g.drawOffer.by !== me && !answered.has(`d${g.drawOffer.at}`)) {
      answered.add(`d${g.drawOffer.at}`);
      modal({ title: L('Nulle proposée', 'Draw offered'), text: L(`${opp} te propose la nulle.`, `${opp} offers you a draw.`), actions: [
        { label: L('Accepter la nulle', 'Accept the draw'), primary: true, onClick: () => ON.answerDraw(g.id, true).catch((e) => toast(ON.explain(e))) },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => ON.answerDraw(g.id, false).catch((e) => toast(ON.explain(e))) },
      ] });
    }
    for (const [k, a] of [['ta', g.takebackAnswer], ['da', g.drawAnswer]]) {
      if (!a || a.by === me || answered.has(`${k}${a.at}`)) continue;
      answered.add(`${k}${a.at}`);
      if (Date.now() - a.at > 60000) continue; // réponse ancienne : déjà vue
      if (k === 'ta') toast(a.ok ? L(`${opp} a accepté : ton coup est annulé.`, `${opp} accepted: your move is taken back.`) : L(`${opp} a refusé : le coup reste joué.`, `${opp} refused: the move stands.`));
      else if (!a.ok) toast(L(`${opp} a refusé la nulle.`, `${opp} refused the draw.`));
    }
  }
  function stopOnline() { if (onlineStop) onlineStop(); onlineStop = null; clearInterval(onlineTimer); onlineTimer = null; onlineGame = null; $('chat').hidden = true; $('online-switch').hidden = true; }
  function openOnlineGame(g) {
    stopOnline();
    const me = ON.user.uid, color = g.white === me ? 'w' : 'b';
    onlineGame = g; onlinePhotos = {};
    ON.getPhotos([g.white, g.black]).then((ph) => { onlinePhotos = ph; if (cfg && cfg.mode === 'online') renderPlayers(); });
    startGame({ mode: 'online', playerColor: color, level: 1, online: { id: g.id, tc: g.tc, tournament: g.tournamentName || null, round: g.round || null } }, g.moves, null, color === 'b');
    onlineStop = ON.watchGame(g.id, onOnlineUpdate);
    onlineTimer = setInterval(onlineTick, 1000);
    chatSeen = (g.chat || []).length; oppMutedMe = false; renderChat(); renderOnlineSwitch();
    const opp = color === 'w' ? g.black : g.white;
    ON.getProfile(opp).then((u) => { oppMutedMe = !!(u && (u.muted || []).includes(me)); renderChat(); }).catch(() => {});
    ON.heartbeat(g.id);
  }
  function onOnlineUpdate(g) {
    if (!cfg || cfg.mode !== 'online' || cfg.online.id !== g.id) return;
    // coup repris d'un commun accord : la partie est rechargée à la nouvelle position
    if (g.moves.length < game.history.length - (pendingMove ? 1 : 0)) { pendingMove = null; openOnlineGame(g); return; }
    onlineGame = g;
    onChatUpdate(g);
    onlineRequests(g);
    // coups de l'adversaire pas encore joués sur ce plateau
    let played = null;
    while (game.history.length < g.moves.length) {
      const r = game.playUci(g.moves[game.history.length]);
      if (!r) break;
      played = r;
    }
    if (played) {
      animateNext = true;
      const st = game.status();
      if (st.over && !result) { result = { result: st.result, reason: st.reason, ultimateId: `${game.history.length}-${Date.now()}` }; if (st.reason === 'mat') shout(L('Échec et mat !', 'Checkmate!')); finish(); }
      else if (game.inCheck()) { sounds.check(); shout(L('Échec !', 'Check!')); } else if (played.move.captured) sounds.capture(); else sounds.move();
    }
    if (g.status === 'over' && !result) { result = { result: g.result, reason: g.reason || 'abandon' }; finish(); }
    render();
  }
  // Pendule, délai par coup et coupure de connexion (nulle après 30 s sans nouvelles sur une partie chronométrée)
  function onlineTimeLeft(g, side) {
    const tc = ON.TIME_CONTROLS[g.tc] || {};
    const running = g.status === 'active' && (g.moves.length % 2 === 0 ? 'w' : 'b') === side;
    if (tc.ms) return g.clock[side] - (running && g.moves.length ? Date.now() - g.lastMoveAt : 0);
    if (tc.perMove) return running ? tc.perMove - (Date.now() - g.lastMoveAt) : tc.perMove;
    return null;
  }
  const fmtClock = (ms) => {
    if (ms == null) return '';
    ms = Math.max(0, ms);
    if (ms >= 86400000) return `${Math.floor(ms / 86400000)} ${L('j', 'd')} ${Math.floor(ms % 86400000 / 3600000)} h`;
    if (ms >= 3600000) return `${Math.floor(ms / 3600000)} h ${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}`;
    return `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}`;
  };
  function onlineTick() {
    const g = onlineGame;
    if (!g || !cfg || cfg.mode !== 'online') return stopOnline();
    if (g.status !== 'active' || result) { renderPlayers(); return; }
    const tc = ON.TIME_CONTROLS[g.tc] || {}, side = g.moves.length % 2 === 0 ? 'w' : 'b';
    const left = onlineTimeLeft(g, side);
    if (left != null && left <= 0) {
      ON.endGame(g.id, side === 'w' ? '0-1' : '1-0', 'temps');
    } else if (tc.ms) {
      const opp = cfg.playerColor === 'w' ? g.black : g.white;
      const seen = g.seen && g.seen[opp];
      if (seen && Date.now() - seen > 30000) ON.endGame(g.id, '1/2-1/2', 'deconnexion');
    }
    if (Date.now() % 10000 < 1000) ON.heartbeat(g.id);
    renderPlayers();
  }

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

  /* ---------- Écran « Reprendre » : affiché à chaque ouverture, tout ce qui est en cours ---------- */
  function renderWelcome() {
    const p = playerProfile(), items = [];
    const card = (icon, title, sub, key, hot) => items.push(`<button class="btn welcome-card${hot ? ' hot' : ''}" type="button" data-resume="${key}"><span class="welcome-icon">${icon}</span><span class="welcome-text"><strong>${title}</strong><small>${sub}</small></span><span class="welcome-go">${L('Continuer', 'Continue')} ›</span></button>`);
    // partie sur cet appareil (ordinateur, deux joueurs, Maître Sissa, position libre)
    const saved = store.get('game', null);
    if (saved && saved.cfg && !saved.result && saved.cfg.mode !== 'online' && (saved.moves || []).length) {
      const c = saved.cfg, n = Math.ceil((saved.moves || []).length / 2);
      const who = c.mode === 'local' ? L('Partie à deux joueurs', 'Two-player game') : c.mode === 'coach' ? L('Partie avec Maître Sissa', 'Game with Master Sissa') : `${L('Contre', 'Against')} ${sideNames(c)[c.playerColor === 'w' ? 'black' : 'white']}`;
      card('♟️', who, `${c.fen ? L('Position libre · ', 'Custom position · ') : ''}${L(`${n} coup${n > 1 ? 's' : ''} joué${n > 1 ? 's' : ''}`, `${n} move${n === 1 ? '' : 's'} played`)}`, 'game', true);
    }
    // parties en ligne et de tournoi
    if (ON && ON.user) {
      const me = ON.user.uid;
      onlineGames.filter((g) => g.status === 'active').sort((a, b) => b.lastMoveAt - a.lastMoveAt).forEach((g) => {
        const white = g.white === me, opp = white ? g.blackName : g.whiteName, mine = (g.moves.length % 2 === 0) === white;
        card(g.tournamentId ? '🏆' : '🌐', `${L('Contre', 'Against')} ${escHtml(opp)}${mine ? L(' · à toi de jouer', ' · your move') : ''}`, `${g.tournamentId ? `${escHtml(g.tournamentName || '')} · ${L('ronde', 'round')} ${g.round} · ` : L('En ligne · ', 'Online · ')}${TC_LABELS[g.tc] || ''} · ${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}`, `online:${g.id}`, mine);
      });
    }
    // défi du jour commencé mais pas fini
    const d = dailyState(), okN = [0, 1, 2].filter((k) => d.res[k] === 'ok').length;
    if (!d.finished && Object.keys(d.res || {}).length) card('📅', L('Défi du jour', 'Daily challenge'), L(`${okN} sur 3 trouvés`, `${okN} of 3 found`), 'daily', true);
    // leçon ou problème ouvert puis quitté avant la fin
    const ol = store.get('openLesson', null);
    if (ol && ol.key) card(ol.key === 'program' ? '🧩' : '📘', escHtml(ol.title), ol.key === 'program' ? L('Problème ouvert, pas encore résolu', 'Puzzle opened, not solved yet') : L(`Arrêté à l’étape ${ol.idx + 1} sur ${ol.total}`, `Stopped at step ${ol.idx + 1} of ${ol.total}`), 'resume', true);
    $('welcome-title').textContent = p.name ? L(`Bon retour, ${p.name} !`, `Welcome back, ${p.name}!`) : L('Bienvenue !', 'Welcome!');
    $('welcome-body').innerHTML = `<div class="welcome-actions"><button class="btn primary" type="button" data-resume="new">${L('Nouvelle partie', 'New game')}</button><button class="btn ghost" type="button" data-resume="home">${L('Menu principal', 'Main menu')}</button></div>
      <p class="level-help">${items.length ? L('Voici ce que tu as commencé sans le terminer. Choisis ce que tu veux continuer.', 'Here is what you started without finishing. Choose what to continue.') : L('Rien en cours pour le moment : lance une nouvelle partie ou ouvre le menu principal.', 'Nothing in progress right now: start a new game or open the main menu.')}</p>
      <div class="welcome-list">${items.join('')}</div>`;
  }
  $('welcome-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-resume]'); if (!b) return;
    const [kind, id] = b.dataset.resume.split(':');
    returnTo = 'welcome';
    if (kind === 'home') return show('home');
    if (kind === 'new') { renderSetup(); show('setup'); return; }
    if (kind === 'game') { const saved = store.get('game', null); if (saved && saved.cfg) startGame(saved.cfg, saved.moves, saved.result, saved.flipped, saved.terrain, saved.weather); return; }
    if (kind === 'online') { const g = onlineGames.find((x) => x.id === id); if (g) openOnlineGame(g); return; }
    if (kind === 'invites') { onlineSection = 'in'; renderOnline(); show('online'); return; }
    if (kind === 'daily') { const d = dailyState(); const order = [0, 1, 2].sort((x, y) => (d.res[y] === 'retry') - (d.res[x] === 'retry')); const k = order.find((i) => d.res[i] !== 'ok'); return startDaily(k == null ? 0 : k); }
    if (kind === 'program') { returnTo = 'problems'; show('problems'); nextActivity(); return; }
    if (kind === 'open') return startOpening(TR.OPENINGS.find((x) => x.id === id));
    if (kind === 'mate') return startMateLesson(TR.MATES.find((x) => x.id === id));
    if (kind === 'end') return startEndgame(TR.ENDGAMES.find((x) => x.id === id));
    if (kind === 'quests') return openShop();
    if (kind === 'resume') return resumeOpenLesson();
  });
  $('btn-welcome').onclick = () => show('welcome');
  /* ---------- Administration : compte réservé au développeur, sans jeu ---------- */
  let adminSection = null, adminCache = null, adminQuery = '', adminSort = 'recent';
  const DAYMS = 86400000;
  function setAdminMode(on) {
    document.body.classList.toggle('admin-mode', on);
    $('btn-admin').hidden = !on;
  }
  async function loadAdmin() {
    $('admin-body').innerHTML = `<p class="level-help">${L('Chargement…', 'Loading…')}</p>`;
    try { adminCache = await ON.adminData(); } catch (err) { $('admin-body').innerHTML = `<p class="ed-error">${ON.explain(err)}</p><p class="level-help">${L('Vérifie que les règles Firebase avec l\u2019administration sont publiées.', 'Check that the Firebase rules with administration are published.')}</p>`; return; }
    renderAdmin();
  }
  function renderAdmin() {
    const body = $('admin-body'), u = ON && ON.user;
    if (!u || !ON.isAdminEmail()) { body.innerHTML = `<p class="level-help">${L('Réservé au compte administrateur.', 'Administrator account only.')}</p>`; return; }
    if (!ON.isAdmin()) {
      body.innerHTML = `<p class="level-help">${L(`Pour activer l’administration, confirme d’abord ton adresse <b>${escHtml(u.email)}</b> : un e-mail de vérification va t’être envoyé.`, `To enable administration, first confirm your address <b>${escHtml(u.email)}</b>: a verification e-mail will be sent to you.`)}</p>
        <button class="btn primary wide" data-admin="verify">${L('Envoyer l’e-mail de vérification', 'Send the verification e-mail')}</button>
        <button class="btn wide" data-admin="checked">${L('J’ai cliqué sur le lien', 'I clicked the link')}</button><p id="admin-msg" class="ed-error" role="status"></p>`;
      return;
    }
    if (!adminCache) { loadAdmin(); return; }
    const { users, games, tournaments } = adminCache, now = Date.now();
    const players = users.filter((x) => !x.admin);
    const SECTIONS = [['stats', '📊', L('Statistiques', 'Statistics')], ['users', '👥', L('Comptes', 'Accounts')], ['tours', '🏆', L('Tournois', 'Tournaments')], ['email', '✉️', L('Adresse administrateur', 'Administrator address')]];
    if (!adminSection) {
      body.innerHTML = `<p class="level-help">${L('Compte administrateur : on ne joue pas avec ce compte, il sert à gérer les comptes et à suivre l’appli.', 'Administrator account: you cannot play with it, it is used to manage accounts and follow the app.')}</p><div class="tour-menu">${SECTIONS.map(([id, icon, label]) => `<button class="btn tour-menu-btn" data-admin-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}</b></button>`).join('')}</div>
        <button class="btn ghost wide" data-admin="reload" style="margin-top:10px">↻ ${L('Actualiser les données', 'Refresh data')}</button>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === adminSection);
    let html = `<button class="btn ghost" data-admin-section="">‹ ${L('Administration', 'Administration')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (adminSection === 'stats') {
      const seen = (d) => players.filter((x) => now - (x.lastSeen || 0) < d * DAYMS).length;
      const created = (d) => players.filter((x) => now - (x.createdAt || 0) < d * DAYMS).length;
      const over = games.filter((g) => g.status === 'over'), live = games.filter((g) => g.status === 'active');
      const recent = (d) => games.filter((g) => now - (g.createdAt || 0) < d * DAYMS).length;
      const elos = players.map((x) => x.elo || 600), avg = elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 0;
      const tc = {}; games.forEach((g) => { tc[g.tc] = (tc[g.tc] || 0) + 1; });
      const reasons = {}; over.forEach((g) => { reasons[g.reason || '?'] = (reasons[g.reason || '?'] || 0) + 1; });
      const card = (title, rows) => `<div class="stat-card"><h4>${title}</h4>${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
      const top = players.slice().sort((a, b) => (b.elo || 0) - (a.elo || 0)).slice(0, 5);
      html += `<div class="stat-cards">
        ${card(L('Comptes', 'Accounts'), [[L('Total', 'Total'), players.length], [L('Suspendus', 'Suspended'), players.filter((x) => x.banned).length], [L('Nouveaux (7 j)', 'New (7 d)'), created(7)], [L('Nouveaux (30 j)', 'New (30 d)'), created(30)]])}
        ${card(L('Activité', 'Activity'), [[L('Connectés maintenant', 'Online now'), players.filter((x) => now - (x.lastSeen || 0) < 3 * 60000).length], [L('Actifs aujourd’hui', 'Active today'), seen(1)], [L('Actifs (7 j)', 'Active (7 d)'), seen(7)], [L('Actifs (30 j)', 'Active (30 d)'), seen(30)], [L('Inactifs depuis 1 an', 'Inactive for 1 year'), players.filter((x) => now - (x.lastSeen || x.createdAt || 0) > 365 * DAYMS).length]])}
        ${card(L('Parties en ligne', 'Online games'), [[L('Total', 'Total'), games.length], [L('En cours', 'In progress'), live.length], [L('Terminées', 'Finished'), over.length], [L('Jouées (7 j)', 'Played (7 d)'), recent(7)], [L('De tournoi', 'Tournament'), games.filter((g) => g.tournamentId).length]])}
        ${card(L('Résultats', 'Results'), [[L('Blancs gagnent', 'White wins'), over.filter((g) => g.result === '1-0').length], [L('Noirs gagnent', 'Black wins'), over.filter((g) => g.result === '0-1').length], [L('Nulles', 'Draws'), over.filter((g) => g.result === '1/2-1/2').length], ...Object.entries(reasons).map(([k, v]) => [REASONS[k] || k, v])])}
        ${card(L('Cadences', 'Time controls'), Object.entries(tc).sort((a, b) => b[1] - a[1]).map(([k, v]) => [TC_LABELS[k] || k, v]))}
        ${card(L('Tournois', 'Tournaments'), [[L('Total', 'Total'), tournaments.length], [L('Inscriptions ouvertes', 'Open'), tournaments.filter((t) => t.status === 'open').length], [L('En cours', 'Running'), tournaments.filter((t) => t.status === 'running').length], [L('Terminés', 'Finished'), tournaments.filter((t) => t.status === 'over').length]])}
        ${card(L('Niveau', 'Level'), [[L('Elo moyen', 'Average Elo'), avg], ...top.map((x, i) => [`${i + 1}. ${escHtml(x.pseudo || '?')}`, x.elo || 600])])}
      </div>`;
    }
    if (adminSection === 'users') {
      const q = adminQuery.trim().toLowerCase();
      const idle = (x) => Math.floor((now - (x.lastSeen || x.createdAt || now)) / DAYMS);
      const list = players.filter((x) => !q || String(x.pseudo || '').toLowerCase().includes(q)).sort(adminSort === 'idle' ? (a, b) => idle(b) - idle(a) : (a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
      html += `<div class="players-tools"><input id="admin-search" class="profile-name-input" type="search" placeholder="${L('Chercher un pseudo', 'Search a nickname')}" value="${escHtml(adminQuery)}"></div><div class="ed-seg" style="margin-top:8px">${[['recent', L('Vus récemment', 'Recently seen')], ['idle', L('Plus inactifs d’abord', 'Most inactive first')]].map(([k, lab]) => `<button type="button" data-admin-sort="${k}" class="${adminSort === k ? 'on' : ''}">${lab}</button>`).join('')}</div><p id="admin-msg" class="ed-error" role="status"></p>
        <table class="tour-table admin-table"><tr><th>${L('Pseudo', 'Nickname')}</th><th>Elo</th><th>${L('Créé', 'Created')}</th><th>${L('Vu', 'Seen')}</th><th>${L('Inactif', 'Idle')}</th><th>${L('Parties', 'Games')}</th><th></th></tr>${list.map((x) => `<tr class="${x.banned ? 'banned' : ''}${idle(x) >= 365 ? ' inactive' : ''}"><td><a href="#" data-profile="${x.id}">${escHtml(x.pseudo || '?')}</a>${x.banned ? ` <small>(${L('suspendu', 'suspended')})</small>` : ''}</td><td>${x.elo || 600}</td><td>${x.createdAt ? new Date(x.createdAt).toLocaleDateString(LOCALE) : '–'}</td><td>${x.lastSeen ? new Date(x.lastSeen).toLocaleDateString(LOCALE) : '–'}</td><td class="${idle(x) >= 365 ? 'loss' : ''}">${idle(x)} ${L('j', 'd')}</td><td>${games.filter((g) => (g.players || []).includes(x.id)).length}</td><td class="admin-actions"><button class="mini" data-admin-ban="${x.id}">${x.banned ? L('Réactiver', 'Reinstate') : L('Suspendre', 'Suspend')}</button><button class="mini danger" data-admin-del="${x.id}">${L('Supprimer', 'Delete')}</button></td></tr>`).join('')}</table>`;
    }
    if (adminSection === 'email') {
      html += `<p class="level-help">${L(`L’administration est liée à <b>${escHtml(ON.getAdminEmail())}</b>. Tu peux la transmettre à une autre adresse, par exemple si tu crées un compte spécial pour l’administration. Ce compte-ci redeviendra alors un compte de joueur normal.`, `Administration is linked to <b>${escHtml(ON.getAdminEmail())}</b>. You can hand it over to another address, for example if you create a dedicated administration account. This account will then become a normal player account again.`)}</p>
        ${field('admin-email', L('Nouvelle adresse administrateur', 'New administrator address'), 'email', '', 'autocomplete="off"')}
        <button class="btn primary wide" data-admin="email">${L('Transmettre l’administration', 'Hand over administration')}</button>
        <p class="level-help">${L('Le nouveau compte devra se connecter et confirmer son adresse par e-mail pour accéder à l’administration.', 'The new account will have to sign in and confirm its address by e-mail to access administration.')}</p>
        <p id="admin-msg" class="ed-error" role="status"></p>`;
    }
    if (adminSection === 'tours') {
      html += `<p id="admin-msg" class="ed-error" role="status"></p><table class="tour-table admin-table"><tr><th>${L('Nom', 'Name')}</th><th>${L('État', 'Status')}</th><th>${L('Inscrits', 'Entrants')}</th><th>${L('Créé', 'Created')}</th><th></th></tr>${tournaments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((t) => `<tr><td>${escHtml(t.name || '?')}</td><td>${STATUS_LABELS[t.status] || t.status}</td><td>${(t.members || []).length}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString(LOCALE) : '–'}</td><td><button class="mini danger" data-admin-deltour="${t.id}">${L('Supprimer', 'Delete')}</button></td></tr>`).join('')}</table>`;
    }
    body.innerHTML = html;
  }
  $('admin-body').addEventListener('input', (e) => { if (e.target.id === 'admin-search') { adminQuery = e.target.value; const pos = e.target.selectionStart; renderAdmin(); const i = $('admin-search'); i.focus(); i.setSelectionRange(pos, pos); } });
  $('admin-body').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const msg = (t, ok) => { const m = $('admin-msg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    if (b.dataset.adminSection != null) { adminSection = b.dataset.adminSection || null; renderAdmin(); return; }
    if (b.dataset.admin === 'email') {
      const email = ($('admin-email').value || '').trim().toLowerCase();
      if (!email) { msg(L('Indique la nouvelle adresse.', 'Enter the new address.')); return; }
      if (email === ON.getAdminEmail()) { msg(L('C’est déjà l’adresse administrateur.', 'This is already the administrator address.')); return; }
      modal({ title: L('Transmettre l’administration ?', 'Hand over administration?'), text: L(`L’administration passera à ${email}. Ce compte perdra immédiatement ses droits d’administrateur.`, `Administration will move to ${email}. This account will lose its administrator rights immediately.`), actions: [
        { label: L('Transmettre', 'Hand over'), primary: true, onClick: async () => { try { await ON.setAdminEmail(email); toast(L(`Administration transmise à ${email}.`, `Administration handed over to ${email}.`)); show('home'); onUserChange(ON.user, ON.profile); } catch (err) { msg(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (b.dataset.adminSort) { adminSort = b.dataset.adminSort; renderAdmin(); return; }
    if (b.dataset.admin === 'reload') { adminCache = null; loadAdmin(); return; }
    if (b.dataset.admin === 'verify') { try { await ON.sendVerification(); msg(L('E-mail envoyé : clique sur le lien qu’il contient, puis sur « J’ai cliqué sur le lien ».', 'E-mail sent: click its link, then “I clicked the link”.'), true); } catch (err) { msg(ON.explain(err)); } return; }
    if (b.dataset.admin === 'checked') { try { const ok = await ON.refreshVerification(); if (ok) { renderAdmin(); } else msg(L('Adresse pas encore vérifiée.', 'Address not verified yet.')); } catch (err) { msg(ON.explain(err)); } return; }
    const find = (id) => adminCache.users.find((x) => x.id === id);
    if (b.dataset.adminBan) {
      const x = find(b.dataset.adminBan);
      try { await ON.adminSetBanned(x.id, !x.banned); x.banned = !x.banned; renderAdmin(); } catch (err) { msg(ON.explain(err)); }
      return;
    }
    if (b.dataset.adminDel) {
      const x = find(b.dataset.adminDel);
      modal({ title: L(`Supprimer le compte de ${x.pseudo} ?`, `Delete ${x.pseudo}’s account?`), text: L('Son profil, son pseudo, sa progression en ligne et ses invitations seront effacés. Ses parties restent dans l’historique de ses adversaires. Il ne pourra plus se reconnecter avec ce compte.', 'Their profile, nickname, online progress and invitations will be erased. Their games stay in their opponents’ history. They will not be able to sign in with this account again.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: async () => { try { await ON.adminDeleteUser(x.id); adminCache.users = adminCache.users.filter((y) => y.id !== x.id); renderAdmin(); toast(L('Compte supprimé.', 'Account deleted.')); } catch (err) { toast(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (b.dataset.adminDeltour) {
      const t = adminCache.tournaments.find((x) => x.id === b.dataset.adminDeltour);
      modal({ title: L(`Supprimer le tournoi « ${t.name} » ?`, `Delete the tournament “${t.name}”?`), text: L('Le tournoi disparaît des listes et de l’historique. Ses parties restent dans l’historique des joueurs.', 'The tournament disappears from the lists and history. Its games stay in the players’ history.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: async () => { try { await ON.adminDeleteTournament(t.id); adminCache.tournaments = adminCache.tournaments.filter((y) => y.id !== t.id); renderAdmin(); } catch (err) { toast(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
    }
  });
  $('btn-admin').onclick = () => { returnTo = 'home'; adminSection = null; show('admin'); renderAdmin(); };
  $('btn-continue').onclick = () => {
    const saved = store.get('game', null);
    if (saved && saved.cfg) startGame(saved.cfg, saved.moves, saved.result, saved.flipped, saved.terrain, saved.weather);
  };
  $('btn-stats').onclick = () => { returnTo = 'home'; show('stats'); };
  $('btn-rules').onclick = () => { returnTo = 'home'; show('rules'); };
  $('btn-about').onclick = () => { returnTo = 'home'; show('about'); };
  $('btn-settings').onclick = () => { returnTo = 'home'; renderSettings(); show('settings'); };

  /* ---------- Club ou école : un responsable crée un club, les élèves le rejoignent avec un code ---------- */
  // Le responsable suit chaque membre : Elo, problèmes résolus, série et résultat du défi du jour.
  let clubOpen = null, clubCache = [];
  function renderClub() {
    const body = $('club-body'), u = ON && ON.user;
    $('club-title').textContent = clubOpen ? clubOpen.name : L('Club ou école', 'Club or school');
    if (!u) { body.innerHTML = `<p class="level-help">${L('Les clubs se gèrent en ligne : connecte-toi ou crée un compte.', 'Clubs are managed online: sign in or create an account.')}</p><button id="club-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>`; return; }
    if (clubOpen) { renderClubDetail(); return; }
    const list = clubCache.length
      ? `<div class="replay-items">${clubCache.map((c) => `<button type="button" class="btn replay-item" data-club-open="${c.id}"><strong>🏫 ${escHtml(c.name)}</strong><span>${c.owner === u.uid ? L('Tu es responsable', 'You are in charge') : L(`Responsable : ${escHtml(c.ownerName)}`, `In charge: ${escHtml(c.ownerName)}`)} · ${L(`${c.members.length} membre${c.members.length > 1 ? 's' : ''}`, `${c.members.length} member${c.members.length === 1 ? '' : 's'}`)}</span></button>`).join('')}</div>`
      : `<p class="level-help">${L('Tu ne fais partie d’aucun club pour l’instant.', 'You are not in any club yet.')}</p>`;
    body.innerHTML = `<p class="level-help">${L('Un professeur ou un responsable de club crée le club et donne son code aux élèves. Il voit ensuite la progression de chacun.', 'A teacher or club leader creates the club and gives its code to the students, then follows everyone’s progress.')}</p>
      <h3 class="train-h">${L('Mes clubs', 'My clubs')}</h3>${list}
      <h3 class="train-h">${L('Rejoindre un club', 'Join a club')}</h3>
      <div class="club-form"><input id="club-code" maxlength="6" autocomplete="off" placeholder="${L('Code du club', 'Club code')}"><button id="club-join" class="btn primary" type="button">${L('Rejoindre', 'Join')}</button></div>
      <h3 class="train-h">${L('Créer un club', 'Create a club')}</h3>
      <div class="club-form"><input id="club-name" maxlength="40" placeholder="${L('Nom du club ou de la classe', 'Club or class name')}"><button id="club-create" class="btn" type="button">${L('Créer', 'Create')}</button></div>`;
  }
  async function renderClubDetail() {
    const c = clubOpen, u = ON.user, boss = c.owner === u.uid, body = $('club-body');
    body.innerHTML = `<p class="level-help">${L('Chargement des membres…', 'Loading members…')}</p>`;
    const [members, today] = await Promise.all([
      Promise.all(c.members.map((uid) => ON.getProfile(uid).catch(() => null))),
      ON.dailyBoard(dayId()).catch(() => []),
    ]);
    if (clubOpen !== c) return;
    const daily = new Map(today.map((r) => [r.uid, r]));
    const rows = members.map((m, i) => ({ uid: c.members[i], m })).filter((r) => r.m)
      .sort((a, b) => (b.m.elo || 0) - (a.m.elo || 0));
    const cell = (r) => {
      const s = r.m.summary || {}, d = daily.get(r.uid);
      return `<tr><td><a href="#" data-profile="${r.uid}">${escHtml(r.m.pseudo || '?')}</a>${r.uid === c.owner ? ' 🎓' : ''}</td><td>${r.m.elo || 600}</td><td>${s.pz || 0}</td><td>${s.dailyBest || 0}</td><td>${d ? `✓ ${d.first}/3` : '—'}</td>${boss ? `<td>${r.uid === c.owner ? '' : `<button type="button" class="btn ghost club-kick" data-club-kick="${r.uid}" aria-label="${L('Retirer', 'Remove')}">✕</button>`}</td>` : ''}</tr>`;
    };
    body.innerHTML = `${boss ? `<p class="level-help">${L('Code à donner aux élèves', 'Code to give to students')} : <b class="tour-code">${c.code}</b></p>` : `<p class="level-help">${L(`Responsable : ${escHtml(c.ownerName)}`, `In charge: ${escHtml(c.ownerName)}`)}</p>`}
      <h3 class="train-h">${L(`Membres (${rows.length})`, `Members (${rows.length})`)}</h3>
      <div class="tour-scroll"><table class="tour-table club-table"><tr><th>${L('Joueur', 'Player')}</th><th>Elo</th><th>${L('Problèmes', 'Puzzles')}</th><th>${L('Série', 'Streak')}</th><th>${L('Défi du jour', 'Daily')}</th>${boss ? '<th></th>' : ''}</tr>${rows.map(cell).join('')}</table></div>
      <p class="level-help">${L('Clique sur un joueur pour voir son profil complet. Les chiffres se mettent à jour quand le joueur ouvre l’appli.', 'Click a player to see their full profile. Figures update when the player opens the app.')}</p>
      <div class="actions">${boss ? `<button id="club-delete" class="btn ghost" type="button">${L('Supprimer le club', 'Delete the club')}</button>` : `<button id="club-leave" class="btn ghost" type="button">${L('Quitter le club', 'Leave the club')}</button>`}</div>`;
  }
  async function refreshClubs() {
    if (!ON || !ON.user) { clubCache = []; return; }
    try { clubCache = (await ON.myClubs()).sort((a, b) => a.name.localeCompare(b.name)); } catch { clubCache = []; }
    if (clubOpen) clubOpen = clubCache.find((c) => c.id === clubOpen.id) || null;
  }
  $('btn-club').onclick = () => {
    returnTo = 'home'; clubOpen = null;
    show('club'); renderClub();
    if (!ON) return;
    ON.load().then(refreshClubs).then(renderClub).catch(() => {});
  };
  $('club-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button, [data-club-open]'); if (!t) return;
    if (t.id === 'club-login') return openAccount();
    try {
      if (t.dataset.clubOpen) { clubOpen = clubCache.find((c) => c.id === t.dataset.clubOpen) || null; return renderClub(); }
      if (t.id === 'club-create') {
        const name = $('club-name').value.trim();
        if (!name) return toast(L('Donne un nom au club.', 'Give the club a name.'));
        clubOpen = await ON.createClub(name);
        await refreshClubs(); return renderClub();
      }
      if (t.id === 'club-join') {
        const code = $('club-code').value.trim().toUpperCase();
        if (code.length !== 6) return toast(L('Le code a 6 caractères.', 'The code has 6 characters.'));
        const c = await ON.joinClub(code);
        if (!c) return toast(L('Aucun club avec ce code.', 'No club with this code.'));
        toast(L(`Bienvenue dans le club ${c.name} !`, `Welcome to the ${c.name} club!`));
        await refreshClubs(); clubOpen = clubCache.find((x) => x.id === c.id) || null; return renderClub();
      }
      if (t.id === 'club-leave' || t.id === 'club-delete') {
        const del = t.id === 'club-delete', c = clubOpen;
        return modal({ title: del ? L('Supprimer le club ?', 'Delete the club?') : L('Quitter le club ?', 'Leave the club?'), text: c.name, actions: [
          { label: L('Annuler', 'Cancel'), ghost: true },
          { label: del ? L('Supprimer', 'Delete') : L('Quitter', 'Leave'), primary: true, onClick: async () => { await (del ? ON.deleteClub(c.id) : ON.leaveClub(c.id)); clubOpen = null; await refreshClubs(); renderClub(); } },
        ] });
      }
      if (t.dataset.clubKick) { await ON.removeFromClub(clubOpen.id, t.dataset.clubKick); await refreshClubs(); return renderClub(); }
    } catch (err) { toast(ON.explain ? ON.explain(err) : L('Action impossible pour le moment.', 'Action not possible right now.')); }
  });
  /* ---------- Tournoi en réel : l'appli organise un tournoi joué sur de vrais échiquiers ---------- */
  // Les noms sont saisis librement et numérotés ; à chaque ronde, l'appli annonce les tables (qui joue contre qui,
  // avec quelle couleur), on saisit les résultats, puis elle calcule la ronde suivante jusqu'au classement final.
  // Tout reste sur l'appareil (hors connexion). Calculs : otb.js.
  const OTB = window.OTB;
  const FORMAT_NAMES = L({ swiss: 'Système suisse', rr: 'Toutes rondes', rr2: 'Toutes rondes aller-retour', ko: 'Élimination directe' },
    { swiss: 'Swiss system', rr: 'Round robin', rr2: 'Double round robin', ko: 'Knockout' });
  let otbId = null, otbTab = 'round', otbNew = null;
  const otbList = () => store.get('otb', []);
  const otbGet = () => otbList().find((t) => t.id === otbId) || null;
  function otbSave(t) { const list = otbList().filter((x) => x.id !== t.id); list.unshift(t); store.set('otb', list.slice(0, 30)); }
  const who = (t, no) => { const e = OTB.byNo(t, no); return e ? `<span class="otb-no">${no}</span> ${escHtml(e.name)}` : '—'; };
  const plain = (t, no) => { const e = OTB.byNo(t, no); return e ? `${no}. ${e.name}` : '—'; };
  function openOtb() { returnTo = 'home'; otbId = null; otbNew = null; show('otb'); renderOtb(); }
  $('btn-otb').onclick = openOtb;

  function renderOtb() {
    const t = otbGet();
    $('otb-title').textContent = t ? t.name : L('Tournoi en réel', 'Over-the-board tournament');
    if (otbNew) return renderOtbSetup();
    if (!t) return renderOtbHome();
    renderOtbTournament(t);
  }
  function renderOtbHome() {
    const list = otbList();
    $('otb-body').innerHTML = `<p class="level-help">${L('Pour un tournoi joué sur de vrais échiquiers : saisis les noms, l’appli annonce à chaque ronde qui joue contre qui, tu entres les résultats, et elle s’occupe du reste jusqu’au classement final.', 'For a tournament played on real boards: enter the names, the app announces each round who plays whom, you enter the results, and it handles the rest up to the final standings.')}</p>
      <button type="button" class="btn primary wide" data-otb="new">➕ ${L('Nouveau tournoi', 'New tournament')}</button>
      ${list.length ? `<h3 class="train-h">${L('Mes tournois', 'My tournaments')}</h3><div class="replay-items">${list.map((t) => `<button type="button" class="btn replay-item" data-otb-open="${t.id}"><strong>${t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}</strong><span>${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L('équipes', 'teams') : L('joueurs', 'players')} · ${t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${t.rounds.length} sur ${t.totalRounds}`, `round ${t.rounds.length} of ${t.totalRounds}`)}</span></button>`).join('')}</div>` : ''}`;
  }

  /* ----- Création ----- */
  function renderOtbSetup() {
    const f = otbNew, team = f.type === 'team';
    const seg = (name, opts) => `<div class="ed-seg" data-otb-seg="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${String(f[name]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const n = parseEntrants(f).length;
    $('otb-body').innerHTML = `<label class="field-label" for="otb-name">${L('Nom du tournoi', 'Tournament name')}</label>
      <input id="otb-name" class="otb-input" maxlength="50" value="${escHtml(f.name)}" placeholder="${L('Tournoi du club', 'Club tournament')}">
      <label class="field-label">${L('Type', 'Type')}</label>${seg('type', [['solo', L('Individuel', 'Individual')], ['team', L('Par équipes', 'Teams')]])}
      <label class="field-label">${L('Formule', 'Format')}</label>${seg('format', [['swiss', L('Suisse', 'Swiss')], ['rr', L('Toutes rondes', 'Round robin')], ['rr2', L('Aller-retour', 'Double RR')], ['ko', L('Élimination', 'Knockout')]])}
      <p class="level-help">${{ swiss: L('Chaque ronde oppose des joueurs qui ont le même nombre de points, sans jamais rejouer le même adversaire. Idéal pour un grand groupe.', 'Each round pairs players with the same score, never the same opponent twice. Ideal for a big group.'), rr: L('Chacun rencontre tout le monde une fois.', 'Everyone meets everyone once.'), rr2: L('Chacun rencontre tout le monde deux fois, une fois avec chaque couleur.', 'Everyone meets everyone twice, once with each colour.'), ko: L('Le perdant est éliminé. En cas de nulle, tu désignes qui passe après une partie de départage.', 'The loser is out. After a draw, you choose who goes through after a tie-break game.') }[f.format]}</p>
      ${f.format === 'swiss' ? `<label class="field-label" for="otb-rounds">${L('Nombre de rondes', 'Number of rounds')}</label><input id="otb-rounds" class="otb-input otb-small" type="number" min="1" max="15" value="${f.rounds || OTB.suggestedRounds(Math.max(2, n))}"${f.rounds ? ' data-touched="1"' : ''}><p class="level-help" id="otb-rounds-help">${L(`Conseillé pour ${n} ${team ? 'équipes' : 'joueurs'} : ${OTB.suggestedRounds(Math.max(2, n))} rondes.`, `Advised for ${n} ${team ? 'teams' : 'players'}: ${OTB.suggestedRounds(Math.max(2, n))} rounds.`)}</p>` : ''}
      ${team ? `<label class="field-label" for="otb-boards">${L('Échiquiers par équipe', 'Boards per team')}</label><input id="otb-boards" class="otb-input otb-small" type="number" min="1" max="10" value="${f.boards}">` : ''}
      <label class="field-label" for="otb-names">${team ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${n})</label>
      <textarea id="otb-names" class="otb-input" rows="10" placeholder="${team ? L('Une équipe par ligne :\nLes Lions : Awa, Moussa, Fatou, Ibrahim\nLes Aigles : Koffi, Aminata, Seydou, Mariam', 'One team per line:\nLions: Awa, Moussa, Fatou, Ibrahim') : L('Un nom par ligne :\nAwa\nMoussa\nFatou', 'One name per line:\nAwa\nMoussa')}">${escHtml(f.text)}</textarea>
      <p class="level-help">${team ? L('Range les joueurs de chaque équipe dans l’ordre des échiquiers (le premier joue à l’échiquier 1).', 'List each team’s players in board order (the first plays board 1).') : L('Chaque nom reçoit un numéro dans l’ordre de la liste.', 'Each name gets a number in list order.')}</p>
      <label class="switch"><input type="checkbox" id="otb-shuffle"${f.shuffle ? ' checked' : ''}><span>${L('Tirer les numéros au sort', 'Draw the numbers at random')}</span></label>
      <div class="actions"><button type="button" class="btn ghost" data-otb="cancel">${L('Annuler', 'Cancel')}</button><button type="button" class="btn primary" data-otb="start">${L('Commencer le tournoi', 'Start the tournament')}</button></div>`;
  }
  function parseEntrants(f) {
    return String(f.text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      if (f.type !== 'team') return { name: line.slice(0, 40) };
      const [name, rest] = line.includes(':') ? [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)] : [line, ''];
      return { name: name.trim().slice(0, 40), players: rest.split(/[,;]/).map((p) => p.trim().slice(0, 30)).filter(Boolean) };
    });
  }
  function readOtbForm() {
    if (!otbNew || !$('otb-names')) return;
    otbNew.name = $('otb-name').value; otbNew.text = $('otb-names').value; otbNew.shuffle = $('otb-shuffle').checked;
    // nombre de rondes : celui saisi à la main, sinon le nombre conseillé selon la liste
    if ($('otb-rounds') && $('otb-rounds').dataset.touched) otbNew.rounds = Number($('otb-rounds').value) || null;
    if ($('otb-boards')) otbNew.boards = Math.max(1, Math.min(10, Number($('otb-boards').value) || 4));
  }
  function startOtb() {
    readOtbForm();
    let entrants = parseEntrants(otbNew);
    if (entrants.length < 2) return toast(L('Il faut au moins deux noms.', 'At least two names are needed.'));
    if (otbNew.shuffle) entrants = entrants.map((e) => [Math.random(), e]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const t = OTB.create({ ...otbNew, entrants });
    otbSave(t); otbId = t.id; otbNew = null; otbTab = 'round';
    renderOtb();
  }

  /* ----- Déroulement ----- */
  const RESULTS = [['1-0', '1-0'], ['1/2', '½-½'], ['0-1', '0-1']];
  function resultButtons(attrs, r, locked) {
    return `<span class="otb-res">${RESULTS.map(([v, label]) => `<button type="button" ${attrs} data-res="${v}" class="${r === v ? 'on' : ''}"${locked ? ' disabled' : ''}>${label}</button>`).join('')}</span>`;
  }
  // Nom du joueur d'une équipe à un échiquier, et couleur : l'équipe citée en premier a les Blancs aux échiquiers impairs
  const boardPlayer = (t, no, k) => { const e = OTB.byNo(t, no); return (e && e.players && e.players[k]) || L(`Joueur ${k + 1}`, `Player ${k + 1}`); };
  function tableHtml(t, p, i, locked) {
    if (p.b == null) return `<div class="otb-table bye"><b>${L('Exempt', 'Bye')}</b><span>${who(t, p.a)}</span><small>${t.format === 'ko' ? L('qualifié d’office pour le tour suivant', 'goes straight to the next round') : t.type === 'team' ? L('+2 points de match', '+2 match points') : L('+1 point', '+1 point')}</small></div>`;
    let html = `<div class="otb-table"><div class="otb-head"><b>${L('Table', 'Table')} ${p.table}</b>`;
    if (t.type !== 'team') {
      html += `</div><div class="otb-match"><span class="otb-side">⚪ ${who(t, p.a)}</span>${resultButtons(`data-t="${i}"`, p.r, locked)}<span class="otb-side">⚫ ${who(t, p.b)}</span></div>`;
    } else {
      const s = OTB.tableScore(t, p);
      html += `<span>${who(t, p.a)} — ${who(t, p.b)}${s.done ? ` · <b>${s.ga} – ${s.gb}</b>` : ''}</span></div>`;
      html += p.games.map((g, k) => {
        const aWhite = k % 2 === 0;
        return `<div class="otb-match board"><span class="otb-side">${aWhite ? '⚪' : '⚫'} ${escHtml(boardPlayer(t, p.a, k))}</span>${resultButtons(`data-t="${i}" data-g="${k}"`, g.r, locked)}<span class="otb-side">${aWhite ? '⚫' : '⚪'} ${escHtml(boardPlayer(t, p.b, k))}</span><small class="otb-board">${L('Éch.', 'Bd')} ${k + 1}</small></div>`;
      }).join('');
    }
    // élimination directe : après une égalité, on désigne qui passe
    if (t.format === 'ko' && !locked) {
      const s = OTB.tableScore(t, p);
      if (s.done && s.a === s.b) html += `<div class="otb-adv"><span>${L('Égalité : qui passe au tour suivant ?', 'Tie: who goes through?')}</span>${[p.a, p.b].map((no) => `<button type="button" class="btn${p.adv === no ? ' primary' : ''}" data-t="${i}" data-adv="${no}">${escHtml(OTB.byNo(t, no).name)}</button>`).join('')}</div>`;
    }
    return html + '</div>';
  }
  function standingsHtml(t) {
    const st = OTB.standings(t), team = t.type === 'team', rr = t.format === 'rr' || t.format === 'rr2';
    const medal = (i) => (t.status === 'over' && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1);
    return `<div class="tour-scroll"><table class="tour-table otb-standings"><tr><th>${L('Rang', 'Rank')}</th><th>${team ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${team ? L('Pts match', 'Match pts') : L('Points', 'Points')}</th>${team ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}${t.format === 'ko' ? '' : `<th>${rr ? 'S-B' : 'Buchholz'}</th><th>${rr ? 'Buchholz' : 'S-B'}</th>`}<th>${L('Parties', 'Played')}</th></tr>
      ${st.map((x, i) => `<tr class="${x.out ? 'otb-out' : ''}"><td>${medal(i)}</td><td>${who(t, x.no)}${x.out ? ` <small>(${L('abandon', 'withdrew')})</small>` : ''}</td><td><b>${x.pts}</b></td>${team ? `<td>${x.game}</td>` : ''}${t.format === 'ko' ? '' : `<td>${+(rr ? x.sb : x.buch).toFixed(2)}</td><td>${+(rr ? x.buch : x.sb).toFixed(2)}</td>`}<td>${x.played}</td></tr>`).join('')}</table></div>
      <p class="level-help">${t.format === 'ko' ? L('Classement par tour atteint.', 'Ranked by round reached.') : L('À égalité de points : Buchholz (total des points des adversaires), puis Sonneborn-Berger (points des adversaires battus, la moitié pour les nulles).', 'Tied on points: Buchholz (opponents’ total points), then Sonneborn-Berger (points of beaten opponents, half for draws).')}</p>`;
  }
  function renderOtbTournament(t) {
    const round = OTB.current(t), done = OTB.roundDone(t, round), over = t.status === 'over';
    const tabs = [['round', over ? L('Podium', 'Podium') : L(`Ronde ${round.no}`, `Round ${round.no}`)], ['table', L('Classement', 'Standings')], ['people', t.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')], ['history', L('Rondes', 'Rounds')]];
    let html = `<p class="level-help">${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L(`équipes · ${t.boards} échiquiers`, `teams · ${t.boards} boards`) : L('joueurs', 'players')} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</p>
      <div class="ed-seg otb-tabs">${tabs.map(([id, label]) => `<button type="button" data-otb-tab="${id}" class="${otbTab === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    if (otbTab === 'round') {
      if (over) {
        const st = OTB.standings(t);
        html += `<div class="otb-podium">${st.slice(0, 3).map((x, i) => `<div class="p${i + 1}"><span>${['🥇', '🥈', '🥉'][i]}</span><b>${escHtml(x.name)}</b><small>${x.pts} ${t.type === 'team' ? L('pts de match', 'match pts') : L('pts', 'pts')}</small></div>`).join('')}</div>${standingsHtml(t)}`;
      } else {
        const missing = round.tables.filter((p) => !OTB.tableScore(t, p).done || (t.format === 'ko' && p.b != null && OTB.winnerOf(t, p) == null)).length;
        html += `<div class="otb-tables">${round.tables.map((p, i) => [p, i]).sort((x, y) => (x[0].b == null) - (y[0].b == null)).map(([p, i]) => tableHtml(t, p, i, false)).join('')}</div>
          <p class="level-help">${done ? L('Tous les résultats sont saisis.', 'All results are in.') : L(`Résultats à saisir : ${missing}.`, `Results to enter: ${missing}.`)}</p>
          <div class="actions"><button type="button" class="btn primary" data-otb="next"${done ? '' : ' disabled'}>${round.no >= t.totalRounds || (t.format === 'ko' && round.tables.length === 1) ? L('Terminer le tournoi', 'Finish the tournament') : L('Ronde suivante', 'Next round')}</button></div>`;
      }
      html += `<div class="actions otb-tools"><button type="button" class="btn" data-otb="big">📺 ${L('Grand écran', 'Big screen')}</button><button type="button" class="btn" data-otb="print">🖨️ ${L('Imprimer', 'Print')}</button>${t.rounds.length > 1 || over ? `<button type="button" class="btn ghost" data-otb="undo">↩️ ${over ? L('Rouvrir la dernière ronde', 'Reopen the last round') : L('Annuler cette ronde', 'Cancel this round')}</button>` : ''}</div>`;
    }
    if (otbTab === 'table') html += standingsHtml(t);
    if (otbTab === 'people') {
      const canEdit = t.format === 'swiss' && !over;
      html += `<div class="replay-items">${t.entrants.map((e) => `<div class="btn replay-item otb-person${e.out ? ' otb-out' : ''}"><strong>${who(t, e.no)}</strong>${e.players && e.players.length ? `<span>${e.players.map((p, k) => `${k + 1}. ${escHtml(p)}`).join(' · ')}</span>` : ''}${canEdit ? `<button type="button" class="btn ghost" data-otb-out="${e.no}">${e.out ? L('Réintégrer', 'Bring back') : L('Abandon', 'Withdraw')}</button>` : ''}</div>`).join('')}</div>
        ${canEdit ? `<p class="level-help">${L('Un joueur qui abandonne n’est plus apparié à partir de la ronde suivante. Un retardataire entre à la prochaine ronde avec 0 point.', 'A withdrawn player is not paired from the next round. A latecomer joins the next round with 0 points.')}</p>
          <div class="club-form"><input id="otb-late" maxlength="40" placeholder="${t.type === 'team' ? L('Équipe : joueur 1, joueur 2…', 'Team: player 1, player 2…') : L('Nom du retardataire', 'Latecomer’s name')}"><button type="button" class="btn" data-otb="late">${L('Ajouter', 'Add')}</button></div>`
          : `<p class="level-help">${t.format === 'swiss' ? '' : L('Dans cette formule, la liste est fixée au départ : un joueur absent perd ses parties par forfait (saisis 1-0 ou 0-1).', 'In this format the list is fixed: an absent player loses by forfeit (enter 1-0 or 0-1).')}</p>`}`;
    }
    if (otbTab === 'history') {
      html += t.rounds.map((r) => `<h3 class="train-h">${L(`Ronde ${r.no}`, `Round ${r.no}`)}</h3><table class="tour-table">${r.tables.map((p) => {
        const s = OTB.tableScore(t, p);
        const res = p.b == null ? L('exempt', 'bye') : s.done ? (t.type === 'team' ? `${s.ga} – ${s.gb}` : { '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½' }[p.r]) : '…';
        return `<tr><td>${p.table}</td><td>${who(t, p.a)}</td><td><b>${res}</b>${t.format === 'ko' && p.adv != null && s.a === s.b ? ` <small>(${L('passe', 'through')} : ${escHtml(OTB.byNo(t, p.adv).name)})</small>` : ''}</td><td>${p.b == null ? '' : who(t, p.b)}</td></tr>`;
      }).join('')}</table>`).join('');
    }
    html += `<div class="actions"><button type="button" class="btn ghost" data-otb="list">${L('Mes tournois', 'My tournaments')}</button><button type="button" class="btn ghost" data-otb="delete">🗑️ ${L('Supprimer', 'Delete')}</button></div>`;
    $('otb-body').innerHTML = html;
  }

  /* ----- Grand écran et impression ----- */
  function bigScreen(t) {
    const round = OTB.current(t), over = t.status === 'over';
    const box = document.createElement('div');
    box.className = 'otb-big';
    box.innerHTML = `<h1>${escHtml(t.name)} · ${over ? L('Classement final', 'Final standings') : L(`Ronde ${round.no}`, `Round ${round.no}`)}</h1>`
      + (over ? `<ol>${OTB.standings(t).slice(0, 10).map((x) => `<li>${escHtml(x.name)} <b>${x.pts}</b></li>`).join('')}</ol>`
        : `<table>${round.tables.map((p) => (p.b == null ? `<tr><td>—</td><td colspan="3">${escHtml(plain(t, p.a))} : ${L('exempt', 'bye')}</td></tr>` : `<tr><td>${p.table}</td><td>⚪ ${escHtml(plain(t, p.a))}</td><td>${L('contre', 'vs')}</td><td>⚫ ${escHtml(plain(t, p.b))}</td></tr>`)).join('')}</table>`)
      + `<p>${L('Toucher l’écran pour fermer', 'Tap to close')}</p>`;
    box.onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); box.remove(); };
    document.body.appendChild(box);
    if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  }
  function printOtb(t) {
    const round = OTB.current(t), over = t.status === 'over', st = OTB.standings(t);
    const rows = round.tables.map((p) => {
      if (p.b == null) return `<tr><td></td><td>${escHtml(plain(t, p.a))}</td><td>${L('exempt', 'bye')}</td><td></td></tr>`;
      if (t.type !== 'team') return `<tr><td>${p.table}</td><td>${escHtml(plain(t, p.a))}</td><td class="r">…… – ……</td><td>${escHtml(plain(t, p.b))}</td></tr>`;
      return `<tr><td>${p.table}</td><td>${escHtml(plain(t, p.a))}</td><td class="r">…… – ……</td><td>${escHtml(plain(t, p.b))}</td></tr>` + p.games.map((g, k) => `<tr class="bd"><td>${L('Éch.', 'Bd')} ${k + 1}</td><td>${k % 2 ? '⚫' : '⚪'} ${escHtml(boardPlayer(t, p.a, k))}</td><td class="r">…… – ……</td><td>${k % 2 ? '⚪' : '⚫'} ${escHtml(boardPlayer(t, p.b, k))}</td></tr>`).join('');
    }).join('');
    const doc = `<!doctype html><html lang="${window.LANG === 'en' ? 'en' : 'fr'}"><head><meta charset="utf-8"><title>${escHtml(t.name)}</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:20px 0 6px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px 8px;text-align:left}td.r{text-align:center;width:110px}tr.bd td{font-size:12px;color:#333}</style></head><body>
      <h1>${escHtml(t.name)}</h1><div>${FORMAT_NAMES[t.format]} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</div>
      ${over ? '' : `<h2>${L(`Ronde ${round.no} : appariements`, `Round ${round.no}: pairings`)}</h2><table><tr><th>${L('Table', 'Table')}</th><th>${L('Blancs', 'White')}</th><th>${L('Résultat', 'Result')}</th><th>${L('Noirs', 'Black')}</th></tr>${rows}</table>`}
      <h2>${L('Classement', 'Standings')}</h2><table><tr><th>#</th><th>${t.type === 'team' ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${L('Points', 'Points')}</th>${t.type === 'team' ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}<th>Buchholz</th></tr>${st.map((x, i) => `<tr><td>${i + 1}</td><td>${escHtml(plain(t, x.no))}</td><td>${x.pts}</td>${t.type === 'team' ? `<td>${x.game}</td>` : ''}<td>${x.buch}</td></tr>`).join('')}</table>
      <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast(L('Autorise les fenêtres pour imprimer.', 'Allow pop-ups to print.'));
    w.document.write(doc); w.document.close();
  }

  /* ----- Clics ----- */
  $('otb-body').addEventListener('input', (e) => {
    if (!otbNew) return;
    if (e.target.id === 'otb-rounds') e.target.dataset.touched = '1';
    if (e.target.id === 'otb-names') {
      const n = parseEntrants({ ...otbNew, text: e.target.value }).length, sug = OTB.suggestedRounds(Math.max(2, n)), team = otbNew.type === 'team';
      if ($('otb-rounds') && !$('otb-rounds').dataset.touched) $('otb-rounds').value = sug;
      if ($('otb-rounds-help')) $('otb-rounds-help').textContent = L(`Conseillé pour ${n} ${team ? 'équipes' : 'joueurs'} : ${sug} rondes.`, `Advised for ${n} ${team ? 'teams' : 'players'}: ${sug} rounds.`); readOtbForm(); const lab = document.querySelector('label[for="otb-names"]'); if (lab) lab.textContent = `${otbNew.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${parseEntrants(otbNew).length})`; }
  });
  $('otb-body').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.otb;
    if (act === 'new') { otbNew = { name: '', type: 'solo', format: 'swiss', rounds: null, boards: 4, text: '', shuffle: false }; return renderOtb(); }
    if (act === 'cancel') { otbNew = null; return renderOtb(); }
    if (b.closest('[data-otb-seg]')) { readOtbForm(); const k = b.closest('[data-otb-seg]').dataset.otbSeg; otbNew[k] = b.dataset.value; if (k === 'format') otbNew.rounds = null; return renderOtb(); }
    if (act === 'start') return startOtb();
    if (b.dataset.otbOpen) { otbId = Number(b.dataset.otbOpen); otbTab = 'round'; return renderOtb(); }
    if (act === 'list') { otbId = null; return renderOtb(); }
    const t = otbGet(); if (!t) return;
    if (b.dataset.otbTab) { otbTab = b.dataset.otbTab; return renderOtb(); }
    const round = OTB.current(t);
    if (b.dataset.res && t.status !== 'over') {
      const p = round.tables[Number(b.dataset.t)];
      if (b.dataset.g != null) { const g = p.games[Number(b.dataset.g)]; g.r = g.r === b.dataset.res ? null : b.dataset.res; } else p.r = p.r === b.dataset.res ? null : b.dataset.res;
      if (t.format === 'ko') { const s = OTB.tableScore(t, p); if (!s.done || s.a !== s.b) delete p.adv; }
      otbSave(t); return renderOtb();
    }
    if (b.dataset.adv) { round.tables[Number(b.dataset.t)].adv = Number(b.dataset.adv); otbSave(t); return renderOtb(); }
    if (act === 'next') { if (OTB.next(t)) { otbSave(t); if (t.status === 'over') toast(L('Tournoi terminé : voici le podium !', 'Tournament over: here is the podium!')); renderOtb(); window.scrollTo(0, 0); } return; }
    if (act === 'undo') {
      return modal({ title: t.status === 'over' ? L('Rouvrir la dernière ronde ?', 'Reopen the last round?') : L('Annuler cette ronde ?', 'Cancel this round?'), text: t.status === 'over' ? L('Tu pourras corriger ses résultats.', 'You can then correct its results.') : L('Ses appariements et résultats sont effacés et tu reviens à la ronde précédente pour corriger un résultat.', 'Its pairings and results are erased and you go back to the previous round to correct a result.'), actions: [
        { label: L('Non', 'No'), ghost: true },
        { label: L('Oui', 'Yes'), primary: true, onClick: () => { OTB.undoRound(t); otbSave(t); renderOtb(); } },
      ] });
    }
    if (act === 'delete') {
      return modal({ title: L('Supprimer ce tournoi ?', 'Delete this tournament?'), text: t.name, actions: [
        { label: L('Annuler', 'Cancel'), ghost: true },
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => { store.set('otb', otbList().filter((x) => x.id !== t.id)); otbId = null; renderOtb(); } },
      ] });
    }
    if (b.dataset.otbOut) { const en = OTB.byNo(t, Number(b.dataset.otbOut)); en.out = !en.out; otbSave(t); return renderOtb(); }
    if (act === 'late') {
      const v = $('otb-late').value.trim(); if (!v) return;
      const [name, rest] = t.type === 'team' && v.includes(':') ? [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)] : [v, ''];
      OTB.addEntrant(t, name.slice(0, 40), rest.split(/[,;]/).map((p) => p.trim()).filter(Boolean));
      otbSave(t); return renderOtb();
    }
    if (act === 'big') return bigScreen(t);
    if (act === 'print') return printOtb(t);
  });
  /* ---------- Replay ---------- */
  const MODE_LABELS = L({ ai: 'Contre ordinateur', coach: 'Partie coachée', local: 'Deux joueurs', free: 'Positions libres', online: 'En ligne' }, { ai: 'Against the computer', coach: 'Coached game', local: 'Two players', free: 'Custom positions', online: 'Online' });
  const RESULT_LABELS = L({ '1-0': 'Victoire des Blancs', '0-1': 'Victoire des Noirs', '1/2-1/2': 'Partie nulle', '*': 'Partie inachevée' }, { '1-0': 'White wins', '0-1': 'Black wins', '1/2-1/2': 'Draw', '*': 'Unfinished game' });
  const escHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDateTime = (id) => new Date(id).toLocaleString(LOCALE, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function setReplayUi(on) {
    $('replay-bar').hidden = !on;
    $('game-actions').hidden = on;
  }
  function stopReplayPlay() {
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    const btn = $('rp-play');
    if (btn) btn.innerHTML = `<span>▶</span>${L('Lecture', 'Play')}`;
  }

  // Seules les prises recommandées sont fléchées : la pièce prise vaut au moins autant que la pièce
  // qui prend, ou la case d'arrivée n'est plus attaquée par l'adversaire après la prise.
  function replayArrows() {
    const s = game.state, out = [], seen = new Set();
    const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    for (const [turn, color] of [[s.turn, 'green'], [s.turn === 'w' ? 'b' : 'w', 'red']]) {
      const st = turn === s.turn ? s : { ...s, turn, ep: -1 };
      const enemy = turn === 'w' ? 'b' : 'w';
      for (const m of window.Chess.legalMoves(st)) {
        if (!m.captured) continue;
        const gain = value[m.captured.toLowerCase()] - value[m.piece.toLowerCase()];
        let recommended = gain >= 0;
        if (!recommended) {
          const after = window.Chess.makeMove(st, m);
          recommended = !window.Chess.isAttacked(after.board, m.to, enemy);
        }
        if (!recommended) continue;
        const key = `${m.from}-${m.to}-${color}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ from: m.from, to: m.to, color });
      }
    }
    const mark = replay.showReview && replay.review && replay.review.marks[replay.index - 1];
    if (mark && ['inaccuracy', 'mistake', 'blunder'].includes(mark[0]) && mark[2]) {
      out.push({ from: window.Chess.sqIndex(mark[2].slice(0, 2)), to: window.Chess.sqIndex(mark[2].slice(2, 4)), color: 'blue' });
    }
    return out;
  }

  /* ---------- Analyse de partie, export PGN, lien de partage, bilan ---------- */
  const REVIEW_LABELS = L({ best: 'Meilleur coup', brilliant: 'Coup brillant', excellent: 'Très bon coup', good: 'Bon coup', inaccuracy: 'Imprécision', mistake: 'Erreur', blunder: 'Gaffe' }, { best: 'Best move', brilliant: 'Brilliant move', excellent: 'Very good move', good: 'Good move', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' });
  const REVIEW_SIGN = { best: '', brilliant: '!!', excellent: '!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' };
  const isSevere = (mark) => !!mark && (mark[0] === 'mistake' || mark[0] === 'blunder');
  const isFault = (mark) => !!mark && ['inaccuracy', 'mistake', 'blunder'].includes(mark[0]);
  const reviewKey = (fen, moves) => `v2|${fen}|${moves.join(' ')}`;
  const loadReview = (k, fen, moves) => {
    const reviews = store.get('reviews', []);
    let hit = reviews.find((x) => x.k === k);
    const legacyKey = k.startsWith('v2|') ? k.slice(3) : k;
    if (!hit) hit = reviews.find((x) => x.k === legacyKey);
    if (!hit) return null;
    const review = hit.r;
    // Reuse older saved analyses; promote exact engine choices to positive labels
    // and identify sound piece offers without making the user run the analysis again.
    if (hit.k === legacyKey && Array.isArray(review.marks) && Array.isArray(moves)) {
      const gameAtMove = new Game(fen);
      review.marks.forEach((mark, i) => {
        const played = moves[i] && gameAtMove.playUci(moves[i]);
        if (mark && mark[0] === 'best') {
          mark[0] = 'excellent';
          const last = gameAtMove.lastMove();
          const pieceValue = last && ({ p: 100, n: 320, b: 330, r: 500, q: 900 }[last.piece.toLowerCase()] || 0);
          if (played && last && pieceValue >= 300 && window.Chess.legalMoves(gameAtMove.state).some((reply) => reply.to === last.to && reply.captured)) mark[0] = 'brilliant';
        }
      });
    }
    return review;
  };
  const reviewJobs = new Map();
  let reviewing = false;

  // Une seule analyse par partie à la fois ; les demandes simultanées partagent le même calcul
  function requestReview(fen, moves, onProgress) {
    const k = reviewKey(fen, moves), cached = loadReview(k, fen, moves);
    if (cached) return Promise.resolve(cached);
    let job = reviewJobs.get(k);
    if (!job) {
      job = { listeners: new Set() };
      job.promise = new Promise((resolve, reject) => {
        let w;
        try { w = new Worker(`analyse-worker.js?lang=${LANG}`); } catch (err) { reject(err); return; }
        w.onmessage = (e) => {
          const d = e.data;
          if (d.progress) { job.listeners.forEach((f) => f(d.progress[0], d.progress[1])); return; }
          w.terminate();
          if (d.ok) {
            const list = store.get('reviews', []).filter((x) => x.k !== k);
            list.push({ k, r: d.review });
            store.set('reviews', list.slice(-20));
            resolve(d.review);
          } else reject(new Error(d.error));
        };
        w.onerror = (err) => { w.terminate(); reject(err); };
        w.postMessage({ id: 1, review: true, moves, fen: fen === window.Chess.START_FEN ? undefined : fen });
      }).finally(() => reviewJobs.delete(k));
      reviewJobs.set(k, job);
    }
    if (onProgress) job.listeners.add(onProgress);
    return job.promise;
  }

  function sanOfBest(fen, moves, ply0, uci) {
    const g = new Game(fen);
    for (let i = 0; i < ply0; i++) g.playUci(moves[i]);
    const r = g.playUci(uci);
    return r ? r.san : uci;
  }
  const fmtEval = (e) => (Math.abs(e) >= 1500 ? (e > 0 ? L('mat pour les Blancs', 'mate for White') : L('mat pour les Noirs', 'mate for Black')) : `${e > 0 ? '+' : ''}${NUM(e / 100)}`);

  function renderReview(rv, cur) {
    // Le panneau du maître fait partie de l'écran replay, même avant le calcul d'analyse.
    $('rp-review').hidden = !replay;
    $('rp-filter-label').textContent = L('Filtrer', 'Filter');
    $('rp-filter').setAttribute('aria-label', L('Filtrer la transcription', 'Filter the move list'));
    $('rp-filter').innerHTML = `<option value="all">${L('Tous les coups', 'All moves')}</option><option value="faults">${L('Fautes', 'Mistakes')}</option><option value="excellent">${L('Très bons coups', 'Excellent moves')}</option><option value="brilliant">${L('Coups brillants', 'Brilliant moves')}</option>`;
    $('rp-filter').disabled = !(replay && replay.review);
    $('rp-filter').value = replay && replay.filter || 'all';
    if (!reviewing) {
      const btn = $('rp-analyse');
      btn.disabled = false;
      btn.textContent = !replay.review ? L('📈 Analyser', '📈 Analyse') : replay.showReview ? L('📈 Masquer', '📈 Hide') : L('📈 Analyse', '📈 Analysis');
    }
    if (!rv) {
      $('rp-comment').textContent = replay
        ? replay.review
          ? L('Analyse masquée. Appuie sur « Analyser » pour afficher mes commentaires.', 'Analysis hidden. Tap “Analyse” to show my comments.')
          : L('Lance l’analyse de la partie pour que je commente les coups et repère les fautes.', 'Analyse the game to hear my comments and find mistakes.')
        : '';
      $('rp-prevbad').disabled = $('rp-nextbad').disabled = !(replay && replay.review);
      $('rp-voice').disabled = !replay;
      $('rp-acc').hidden = $('rp-graph').hidden = true;
      return;
    }
    $('rp-prevbad').disabled = $('rp-nextbad').disabled = false;
    $('rp-voice').disabled = false;
    const hasGraph = Array.isArray(rv.ev) && rv.ev.length > 1 && rv.ev.every(Number.isFinite);
    $('rp-acc').hidden = false;
    $('rp-graph').hidden = !hasGraph;
    if (hasGraph) {
      const n = rv.ev.length, X = (i) => (i / (n - 1)) * 200, Y = (e) => 32 - Math.tanh(e / 400) * 30;
      const pts = rv.ev.map((e, i) => `${X(i).toFixed(1)},${Y(e).toFixed(1)}`).join(' L');
      let svg = `<path class="g-area" d="M0,64 L${pts} L${X(n - 1).toFixed(1)},64 Z"/><line class="g-mid" x1="0" x2="200" y1="32" y2="32"/>`;
      rv.marks.forEach((m, i) => { if (isSevere(m)) svg += `<line class="g-bad" x1="${X(i + 1).toFixed(1)}" x2="${X(i + 1).toFixed(1)}" y1="54" y2="64"/>`; });
      svg += `<line class="g-cur" x1="${X(cur).toFixed(1)}" x2="${X(cur).toFixed(1)}" y1="0" y2="64"/>`;
      $('rp-graph').innerHTML = svg;
    }
    const who = rv.accuracy;
    $('rp-acc').innerHTML = `${rv.opening ? `<b>${escHtml(rv.opening)}</b><br>` : ''}${L('Précision : Blancs', 'Accuracy: White')} ${who.w == null ? '–' : who.w + ' %'} · ${L('Noirs', 'Black')} ${who.b == null ? '–' : who.b + ' %'}`;
    const mark = rv.marks[cur - 1];
    let text = L(`Position de départ · évaluation ${fmtEval(rv.ev[0] || 0)}`, `Starting position · evaluation ${fmtEval(rv.ev[0] || 0)}`);
    let speechText = '', speechCues = [];
    if (mark) {
      text = `<b>${escHtml(replay.sans[cur - 1])}${REVIEW_SIGN[mark[0]]}</b> — ${REVIEW_LABELS[mark[0]]} · ${L('évaluation', 'evaluation')} ${fmtEval(rv.ev[cur])}`;
      if (['inaccuracy', 'mistake', 'blunder'].includes(mark[0])) {
        const explanation = L(
          { inaccuracy: 'Une meilleure suite était disponible.', mistake: 'Ce coup détériore nettement la position.', blunder: 'Cette gaffe entraîne une forte dégradation de la position.' }[mark[0]],
          { inaccuracy: 'A better continuation was available.', mistake: 'This move significantly worsens the position.', blunder: 'This blunder causes a major deterioration in the position.' }[mark[0]],
        );
        const best = sanOfBest(replay.fen, replay.moves, cur - 1, mark[2]);
        const loss = NUM(mark[1] / 100), pawn = P(mark[1] / 100, 'pion', 'pions', 'pawn', 'pawns');
        text += `<br>${explanation} ${L('Perte estimée', 'Estimated loss')}: ≈ ${loss} ${pawn}.<br>${L('Meilleur coup :', 'Best move:')} <strong class="rp-best-move">${escHtml(best)}</strong>`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : ${REVIEW_LABELS[mark[0]].toLowerCase()}. ${explanation} Le meilleur coup était ${best}. Perte estimée : ${loss} ${pawn}.`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: ${REVIEW_LABELS[mark[0]].toLowerCase()}. ${explanation} The best move was ${best}. Estimated loss: ${loss} ${pawn}.`);
        const label = REVIEW_LABELS[mark[0]].toLowerCase();
        speechCues = [
          { index: speechText.indexOf(label), run: () => animateUndoMistake(cur) },
          { index: speechText.lastIndexOf(best), run: () => animateRecommendedMove(cur, mark[2]) },
        ];
      } else if (mark[0] === 'brilliant') {
        const explanation = L('Tu as trouvé un sacrifice tactique : la pièce offerte ne peut pas être prise sans conséquence, et le moteur confirme que c’est le meilleur coup.', 'You found a tactical sacrifice: taking the offered piece comes at a cost, and the engine confirms this is the best move.');
        text += `<br>${explanation}`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : coup brillant ! ${explanation}`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: brilliant move! ${explanation}`);
      } else if (mark[0] === 'excellent') {
        const explanation = L('Très bonne décision : tu as trouvé le meilleur coup ou une suite presque aussi précise.', 'Excellent decision: you found the best move or a continuation that is almost as precise.');
        text += `<br>${explanation}`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : très bon coup ! ${explanation}`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: very good move! ${explanation}`);
      }
    }
    $('rp-comment').innerHTML = text;
    if (replay.lastSpokenReviewPly !== cur) {
      replay.lastSpokenReviewPly = cur;
      if (speechText) speak(speechText, speechCues);
    }
  }
  $('rp-analyse').onclick = () => {
    if (!replay || reviewing) return;
    if (replay.review) { replay.showReview = !replay.showReview; render(); return; }
    if (!replay.moves.length) return toast(L('Aucun coup à analyser.', 'No move to analyse.'));
    const mine = replay, btn = $('rp-analyse');
    reviewing = true; btn.disabled = true; btn.textContent = '📈 0 %';
    requestReview(mine.fen, mine.moves, (done, total) => { btn.textContent = `📈 ${Math.round((done / total) * 100)} %`; })
      .then((r) => { mine.review = r; mine.showReview = true; })
      .catch(() => toast(L("L'analyse n'a pas pu être lancée sur cet appareil.", 'The analysis could not start on this device.')))
      .finally(() => { reviewing = false; if (replay) render(); });
  };
  $('rp-filter').onchange = () => {
    if (!replay) return;
    replay.filter = $('rp-filter').value;
    render();
  };
  const jumpToSevere = (dir) => {
    if (!replay || !replay.review) return;
    for (let p = replay.index + dir; p >= 1 && p <= replay.moves.length; p += dir) if (isFault(replay.review.marks[p - 1])) return navigate(p);
    toast(dir > 0 ? L('Plus de faute après ce coup.', 'No more mistakes after this move.') : L('Plus de faute avant ce coup.', 'No more mistakes before this move.'));
  };
  $('rp-nextbad').onclick = () => jumpToSevere(1);
  $('rp-prevbad').onclick = () => jumpToSevere(-1);
  $('rp-graph').onclick = (e) => {
    if (!replay || !replay.review) return;
    const box = e.currentTarget.getBoundingClientRect();
    navigate(Math.round(((e.clientX - box.left) / box.width) * (replay.review.ev.length - 1)));
  };

  const pad2 = (x) => String(x).padStart(2, '0');
  const pgnDate = (id) => { const d = new Date(id); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; };
  const sideNames = (c) => {
    if (c.mode === 'local') return { white: L('Joueur 1', 'Player 1'), black: L('Joueur 2', 'Player 2') };
    const champ = c.champion && champById(c.champion);
    const ai = champ ? champ.name : c.mode === 'coach' ? L('Maître Sissa', 'Master Sissa') : `${L('Ordinateur', 'Computer')} ${LEVEL_NAMES[c.level] || ''}`.trim();
    const me = L('Joueur', 'Player');
    return c.playerColor === 'w' ? { white: me, black: ai } : { white: ai, black: me };
  };
  function pgnFor(entry) {
    const fen = entry.fen || window.Chess.START_FEN, G = new Game(fen), san = [];
    for (const u of entry.moves || []) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
    const st = G.status(), res = entry.result && entry.result !== '*' ? entry.result : st.over ? st.result : '*';
    const tags = { Event: entry.event || L('Partie Ata Wawé', 'Ata Wawé game'), Site: 'Ata Wawé', Date: entry.date || pgnDate(Date.now()), White: entry.white || L('Blancs', 'White'), Black: entry.black || L('Noirs', 'Black'), Result: res };
    if (entry.opening) tags.Opening = entry.opening;
    if (fen !== window.Chess.START_FEN) { tags.SetUp = '1'; tags.FEN = fen; }
    const start = new Game(fen).state;
    let turn = start.turn, n = start.full || 1, body = '';
    san.forEach((m, i) => {
      if (turn === 'w') body += `${n}. ${m} `;
      else { body += `${i === 0 ? `${n}... ` : ''}${m} `; n++; }
      turn = turn === 'w' ? 'b' : 'w';
    });
    return Object.entries(tags).map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`).join('\n') + '\n\n' + (body + res).replace(/(.{1,78})(\s|$)/g, '$1\n').trim() + '\n';
  }
  // Export PGN d'une partie : fichier texte ou copie dans le presse-papiers
  function exportPgn(entry) {
    const text = pgnFor(entry);
    const pre = document.createElement('pre'); pre.className = 'pgn-preview'; pre.textContent = text;
    modal({ title: L('Exporter la partie (PGN)', 'Export the game (PGN)'), body: pre, actions: [
      { label: L('📋 Copier', '📋 Copy'), primary: true, onClick: async () => {
        try { await navigator.clipboard.writeText(text); toast(L('PGN copié dans le presse-papiers', 'PGN copied to the clipboard')); }
        catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(L('PGN copié dans le presse-papiers', 'PGN copied to the clipboard')); } catch { toast(L('Copie impossible ici.', 'Copy not possible here.')); } ta.remove(); }
      } },
      { label: L('⬇ Fichier .txt', '⬇ .txt file'), onClick: () => saveFile(`cavalier-partie-${stamp()}.pgn.txt`, text) },
      { label: L('Fermer', 'Close'), ghost: true },
    ] });
  }
  // partie en cours, quel que soit le mode
  function currentGameEntry() {
    const g = onlineGame;
    const names = cfg.mode === 'online' && g ? { white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})`, event: g.tournamentName ? `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}` : L('Partie en ligne', 'Online game') }
      : cfg.mode === 'local' ? { white: L('Blancs', 'White'), black: L('Noirs', 'Black') } : sideNames(cfg);
    return { moves: game.uciList(), fen: cfg.fen, result: result ? result.result : '*', ...names };
  }
  $('btn-pgn').onclick = () => { if (game && cfg) exportPgn(currentGameEntry()); };
  $('rp-pgn').onclick = () => {
    if (!replay) return;
    exportPgn({ ...replay, opening: replay.review && replay.review.opening });
  };

  const toB64 = (obj) => {
    let s = '';
    new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64 = (text) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
  $('rp-share').onclick = async () => {
    if (!replay) return;
    const payload = { m: replay.moves.join(' '), t: replay.title, r: replay.result, w: replay.white, b: replay.black };
    if (replay.fen !== window.Chess.START_FEN) payload.f = replay.fen;
    const url = `${location.origin}${location.pathname}#r=${toB64(payload)}`;
    try { await navigator.clipboard.writeText(url); toast(L('Lien de la partie copié', 'Game link copied')); }
    catch { modal({ title: L('Lien de partage', 'Share link'), text: url, actions: [{ label: L('Fermer', 'Close'), primary: true }] }); }
  };
  function openSharedLink() {
    const match = /^#r=([\w-]+)$/.exec(location.hash);
    if (!match) return;
    history.replaceState(history.state, '', location.pathname + location.search);
    try {
      const p = fromB64(match[1]);
      if (typeof p.m !== 'string' || p.m.length > 30000) throw new Error('lien');
      const entry = { moves: p.m ? p.m.split(' ') : [], fen: typeof p.f === 'string' ? p.f : undefined, title: String(p.t || L('Partie partagée', 'Shared game')).slice(0, 80), white: p.w ? String(p.w).slice(0, 60) : undefined, black: p.b ? String(p.b).slice(0, 60) : undefined, result: ['1-0', '0-1', '1/2-1/2'].includes(p.r) ? p.r : '*' };
      if (entry.fen && fenError(entry.fen)) throw new Error('fen');
      startReplay(entry, () => show('home'));
    } catch { replay = null; toast(L('Lien de partage invalide.', 'Invalid share link.')); }
  }

  // Bilan de Maître Sissa à la fin d'une partie
  const PHASE_ADVICE = L({
    ouverture: "Ouverture : développe tes pièces, prends le centre et roque tôt avant de lancer des attaques.",
    milieu: "Milieu de partie : avant chaque coup, cherche les menaces adverses (échecs, prises, pièces non défendues), puis tes propres tactiques.",
    finale: "Finale : active ton roi, pousse tes pions libres et calcule les coups forcés jusqu'au bout.",
  }, {
    ouverture: 'Opening: develop your pieces, take the center and castle early before launching attacks.',
    milieu: "Middlegame: before each move, look for your opponent's threats (checks, captures, undefended pieces), then your own tactics.",
    finale: 'Endgame: activate your king, push your free pawns and calculate forcing moves all the way.',
  });
  const phaseOf = (ply0) => (ply0 < 20 ? 'ouverture' : ply0 < 60 ? 'milieu' : 'finale');
  let bilanId = 0;
  function showBilan(snap) {
    const my = ++bilanId;
    modal({ title: L('Bilan de Maître Sissa', 'Master Sissa’s review'), text: L('Analyse de la partie…', 'Analysing the game…'), actions: [{ label: L('Fermer', 'Close'), ghost: true, onClick: () => { bilanId++; } }] });
    requestReview(snap.cfg.fen || window.Chess.START_FEN, snap.moves, (done, total) => {
      if (my === bilanId && !$('modal').hidden) $('modal-text').textContent = L(`Analyse de la partie… ${done} / ${total} coups`, `Analysing the game… ${done} / ${total} moves`);
    }).then((r) => { if (my === bilanId && !$('modal').hidden) renderBilan(snap, r); })
      .catch(() => { if (my === bilanId) { closeModal(); toast(L("L'analyse n'a pas pu être lancée sur cet appareil.", 'The analysis could not start on this device.')); } });
  }
  function renderBilan(snap, r) {
    const local = snap.cfg.mode === 'local', me = snap.cfg.playerColor;
    const mine = [];
    r.marks.forEach((m, i) => { if (isSevere(m) && (local || (i % 2 ? 'b' : 'w') === me)) mine.push({ i, cls: m[0], loss: m[1], best: m[2] }); });
    const top = mine.slice().sort((a, b) => b.loss - a.loss).slice(0, 3).sort((a, b) => a.i - b.i);
    const sans = []; { const g = new Game(snap.cfg.fen || window.Chess.START_FEN); for (const u of snap.moves) { const x = g.playUci(u); if (!x) break; sans.push(x.san); } }
    const num = (i) => `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'}`;
    const acc = (c) => (r.accuracy[c] == null ? '–' : `${r.accuracy[c]} %`);
    let html = '';
    if (r.opening) html += `<p><b>${L('Ouverture :', 'Opening:')}</b> ${escHtml(r.opening)}</p>`;
    html += local ? `<p><b>${L('Précision :', 'Accuracy:')}</b> ${L('Blancs', 'White')} ${acc('w')} · ${L('Noirs', 'Black')} ${acc('b')}</p>` : `<p><b>${L('Précision :', 'Accuracy:')}</b> ${L('toi', 'you')} ${acc(me)} · ${L('adversaire', 'opponent')} ${acc(me === 'w' ? 'b' : 'w')}</p>`;
    if (top.length) {
      html += `<p><b>${L(`Tes ${top.length > 1 ? `${top.length} principales erreurs` : 'principale erreur'} :`, `Your ${top.length > 1 ? `${top.length} main mistakes` : 'main mistake'}:`)}</b></p><ul>` + top.map((t) => {
        const best = sanOfBest(snap.cfg.fen || window.Chess.START_FEN, snap.moves, t.i, t.best);
        return `<li>${L('Coup', 'Move')} ${num(t.i)} ${escHtml(sans[t.i])}${REVIEW_SIGN[t.cls]} — ${L('meilleur :', 'best:')} ${escHtml(best)} (${L('perte', 'loss')} ≈ ${NUM(t.loss / 100)})</li>`;
      }).join('') + '</ul>';
      const counts = { ouverture: 0, milieu: 0, finale: 0 };
      mine.forEach((m) => { counts[phaseOf(m.i)]++; });
      const worst = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      html += `<p><b>${L('Conseil :', 'Tip:')}</b> ${PHASE_ADVICE[worst]}</p>`;
    } else {
      html += L('<p>Aucune erreur grave repérée : partie très propre, bravo ! Continue à calculer les coups forcés avant chaque décision.</p>', '<p>No serious mistake found: a very clean game, well done! Keep calculating forcing moves before each decision.</p>');
    }
    const body = document.createElement('div');
    body.className = 'bilan';
    body.innerHTML = html;
    const names = sideNames(snap.cfg);
    modal({
      title: L('Bilan de Maître Sissa', 'Master Sissa’s review'), body,
      actions: [
        { label: L("Revoir avec l'analyse", 'Review with analysis'), primary: true, onClick: () => startReplay({ moves: snap.moves, result: snap.result, title: L('Ma dernière partie', 'My last game'), ...names, flipped: !local && me === 'b' }, () => show('home')) },
        { label: L('Exporter en PGN', 'Export as PGN'), onClick: () => exportPgn({ moves: snap.moves, result: snap.result, opening: r.opening, ...names }) },
        { label: L('Fermer', 'Close'), ghost: true },
      ],
    });
  }

  function startReplay(entry, back) {
    if (replay) restoreReplayDemo();
    cancelAi(); stopReplayPlay();
    pz = null; marks = null;
    attachBoard('game');
    const fen = entry.fen || window.Chess.START_FEN;
    const probe = new Game(fen), sans = [];
    for (const u of entry.moves || []) { const r = probe.playUci(u); if (!r) break; sans.push(r.san); }
    replay = { moves: (entry.moves || []).slice(0, sans.length), sans, fen, index: 0, title: entry.title || L('Partie', 'Game'), result: entry.result || '*', back, white: entry.white, black: entry.black, event: entry.event, date: entry.date };
    replay.review = loadReview(reviewKey(fen, replay.moves), fen, replay.moves);
    replay.showReview = !!replay.review;
    cfg = { mode: 'local', playerColor: 'w', level: 1 };
    result = null; selected = -1; hint = null;
    flipped = !!entry.flipped;
    $('terrain-name').textContent = randomScenery();
    $('game-title').textContent = `Replay · ${replay.title}`;
    setReplayUi(true);
    show('game');
    gotoPly(0);
  }
  function restoreReplayDemo() {
    if (!replay || !replay.demoRestore) return;
    if (replay.demoTimer) clearTimeout(replay.demoTimer);
    game = replay.demoRestore.game; result = replay.demoRestore.result;
    replay.demoRestore = null; replay.demoTimer = null; animateNext = false; replayAnimationOverride = null;
  }
  function animateUndoMistake(ply) {
    if (!replay || replay.index !== ply || !replay.showReview) return;
    restoreReplayDemo();
    const saved = { game, result }, wrong = game.lastMove();
    if (!wrong) return;
    const before = new Game(replay.fen);
    for (let i = 0; i < ply - 1; i++) if (!before.playUci(replay.moves[i])) return;
    replay.demoRestore = saved;
    game = saved.game; result = saved.result; animateNext = false;
    renderBoard();
    game = before; result = null;
    const reverse = { ...wrong, from: wrong.to, to: wrong.from, captured: null, flag: null, promo: null };
    replayAnimationOverride = reverse; animateNext = true;
    renderBoard();
    replayAnimationOverride = null;
    animateMinimapMove(reverse);
    const wait = Math.max(1200, speechUntil - performance.now() + 500);
    replay.demoTimer = setTimeout(() => {
      if (replay && replay.demoRestore === saved) { restoreReplayDemo(); renderBoard(); }
    }, wait);
  }
  function animateRecommendedMove(ply, uci) {
    if (!replay || replay.index !== ply || !replay.showReview || !uci) return;
    const staged = !!replay.demoRestore;
    const saved = replay.demoRestore || { game, result };
    if (replay.demoTimer) clearTimeout(replay.demoTimer);
    replay.demoTimer = null;
    if (!staged) {
      const demo = new Game(replay.fen);
      for (let i = 0; i < ply - 1; i++) if (!demo.playUci(replay.moves[i])) return;
      replay.demoRestore = saved;
      game = demo; result = null; animateNext = false;
      renderBoard();
    }
    if (!game.playUci(uci)) {
      restoreReplayDemo(); renderBoard(); return;
    }
    animateNext = true;
    renderBoard();
    animateMinimapMove(game.lastMove());
    const wait = Math.max(950, (b3d ? b3d.busyLeftMs() : 0) + 150);
    replay.demoTimer = setTimeout(() => {
      if (replay && replay.demoRestore === saved) { restoreReplayDemo(); renderBoard(); }
    }, wait);
  }
  function gotoPly(n, animate = false) {
    if (!replay) return;
    restoreReplayDemo();
    n = Math.max(0, Math.min(replay.moves.length, n));
    game = new Game(replay.fen);
    for (let i = 0; i < n; i++) game.playUci(replay.moves[i]);
    animateNext = animate && n === replay.index + 1;
    // Position finale de mat : même attaque de mat qu'en partie quand on y arrive coup par coup
    const st = game.status();
    result = st.over ? { result: st.result, reason: st.reason, ultimateId: `replay-${n}-${Date.now()}` } : null;
    if (animateNext && game.inCheck()) shout(game.status().over ? L('Échec et mat !', 'Checkmate!') : L('Échec !', 'Check!'));
    replay.index = n;
    render();
  }
  function renderReplay() {
    renderBoard(); renderPlayers();
    const ol = $('moves'); ol.innerHTML = '';
    const sans = replay.sans, cur = replay.index;
    const rv = replay.review && replay.showReview ? replay.review : null;
    const BAD = ['inaccuracy', 'mistake', 'blunder'];
    // Si les Noirs commencent (position libre), le premier coup s'écrit « 1… »
    const off = window.Chess.fromFen(replay.fen).turn === 'b' ? 1 : 0;
    for (let i = 0; i < sans.length + off; i += 2) {
      const cell = (k) => {
        const ply = k - off + 1;
        if (ply < 1) return '<span>…</span>';
        if (ply > sans.length) return '';
        const mark = replay.review && replay.review.marks[ply - 1];
        const tagged = mark && [...BAD, 'brilliant', 'excellent'].includes(mark[0]);
        const cls = [ply === cur ? 'cur' : '', tagged ? `q-${mark[0]}` : ''].filter(Boolean).join(' ');
        return `<span data-ply="${ply}"${cls ? ` class="${cls}"` : ''}>${escHtml(sans[ply - 1])}${tagged ? REVIEW_SIGN[mark[0]] : ''}</span>`;
      };
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i)} ${cell(i + 1)}`;
      ol.appendChild(li);
    }
    const wanted = replay.filter === 'faults' ? new Set(BAD)
      : replay.filter === 'excellent' ? new Set(['excellent'])
        : replay.filter === 'brilliant' ? new Set(['brilliant']) : null;
    if (wanted && replay.review) [...ol.children].forEach((li) => {
      const hasWantedMove = [...li.querySelectorAll('[data-ply]')].some((span) => {
        const mark = replay.review.marks[Number(span.dataset.ply) - 1];
        return mark && wanted.has(mark[0]);
      });
      li.hidden = !hasWantedMove;
    });
    renderReview(rv, cur);
    const current = ol.querySelector('.cur');
    if (current) current.scrollIntoView({ block: 'nearest' });
    const side = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
    const atEnd = cur === sans.length;
    const status = $('status');
    status.classList.remove('alert');
    status.textContent = sans.length ? L(`Coup ${cur} / ${sans.length} · Trait aux ${side}${game.inCheck() ? ' · Échec' : ''}`, `Move ${cur} / ${sans.length} · ${side} to move${game.inCheck() ? ' · Check' : ''}`) : L(`Position · Trait aux ${side}`, `Position · ${side} to move`);
    $('replay-info').textContent = atEnd && sans.length ? `${replay.title} — ${RESULT_LABELS[replay.result] || RESULT_LABELS['*']}` : replay.title;
    $('rp-start').disabled = $('rp-prev').disabled = cur === 0;
    $('rp-next').disabled = $('rp-end').disabled = atEnd;
    $('rp-play').disabled = !sans.length;
  }
  function exitReplay() {
    if (videoRec) stopVideo(false);
    const back = replay && replay.back;
    stopReplayPlay();
    restoreReplayDemo();
    replay = null; game = null;
    setReplayUi(false);
    if (back) back(); else show('home');
  }
  $('rp-flip').onclick = () => { flipped = !flipped; render(); };
  const navigate = (n, animate = false) => {
    if (!replay) return;
    const wasDemoing = !!replay.demoRestore;
    restoreReplayDemo();
    if (wasDemoing) renderBoard();
    if (animBusy()) return;
    stopReplayPlay();
    gotoPly(n, animate);
  };
  $('rp-start').onclick = () => navigate(0);
  $('rp-prev').onclick = () => replay && navigate(replay.index - 1);
  $('rp-next').onclick = () => replay && navigate(replay.index + 1, true);
  $('rp-end').onclick = () => replay && navigate(replay.moves.length);
  $('rp-play').onclick = () => {
    if (!replay) return;
    if (replayTimer) { stopReplayPlay(); return; }
    if (replay.index >= replay.moves.length) gotoPly(0);
    $('rp-play').innerHTML = `<span>⏸</span>${L('Pause', 'Pause')}`;
    // Attend la fin de l'animation en cours (duels, techniques) avant le coup suivant
    const tick = () => {
      if (!replay || replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      gotoPly(replay.index + 1, true);
      if (replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      const busy = b3d ? b3d.busyLeftMs() : 0;
      const speech = Math.max(0, speechUntil - performance.now());
      replayTimer = setTimeout(tick, Math.max(2200, busy + 700, speech + 400));
    };
    replayTimer = setTimeout(tick, 600);
  };
  // « Ma partie en vidéo » : la partie est rejouée en 3D depuis le début et filmée, puis le fichier vidéo est proposé
  let videoRec = null;
  function videoType() {
    if (!window.MediaRecorder) return null;
    return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }
  function stopVideo(save) {
    const v = videoRec; if (!v) return;
    videoRec = null;
    clearTimeout(v.timer);
    v.save = save;
    if (v.rec.state !== 'inactive') v.rec.stop();
    $('rp-video').innerHTML = `<span>🎬</span>${L('Vidéo', 'Video')}`;
    document.body.classList.remove('recording-video');
    if (v.view) { settings.boardView = v.view; applyBoardView(true); }
  }
  $('rp-video').onclick = () => {
    if (videoRec) { stopVideo(true); return; }
    const type = videoType(), canvas = b3d && b3d.renderer && b3d.renderer.domElement;
    if (!replay || !replay.moves.length) return;
    if (!type || !canvas || !canvas.captureStream) { toast(L('Ton navigateur ne sait pas enregistrer de vidéo.', 'Your browser cannot record video.')); return; }
    restoreReplayDemo(); stopReplayPlay();
    // la vidéo filme le plateau 3D : on quitte la vue 2D le temps de l'enregistrement
    const view = settings.boardView === '2d' ? settings.boardView : null;
    if (view) { settings.boardView = 'both'; applyBoardView(true); }
    b3d.skipAnimations();
    gotoPly(0);
    const chunks = [], rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 5000000 });
    const v = videoRec = { rec, view, save: true, timer: 0 };
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (!v.save || !chunks.length) return;
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type: type.split(';')[0] }));
      a.download = `ata-wawe-${(replay && replay.title ? replay.title : 'partie').replace(/[^\w\u00C0-\u017F-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'partie'}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      toast(L('Vidéo enregistrée dans tes téléchargements.', 'Video saved to your downloads.'));
    };
    rec.start(1000);
    $('rp-video').innerHTML = `<span>⏹</span>${L('Arrêter', 'Stop')}`;
    document.body.classList.add('recording-video');
    toast(L('Enregistrement de la partie en cours… Appuie sur « Arrêter » pour finir plus tôt.', 'Recording the game… Press “Stop” to finish early.'));
    // même rythme que la lecture : chaque coup attend la fin de son animation
    const step = () => {
      if (videoRec !== v) return;
      if (!replay || replay.index >= replay.moves.length) { v.timer = setTimeout(() => stopVideo(true), Math.max(2500, (b3d ? b3d.busyLeftMs() : 0) + 1500)); return; }
      gotoPly(replay.index + 1, true);
      v.timer = setTimeout(step, Math.max(1800, (b3d ? b3d.busyLeftMs() : 0) + 600));
    };
    v.timer = setTimeout(step, 1500);
  };
  $('moves').addEventListener('click', (e) => {
    if (!replay) return;
    const span = e.target.closest('[data-ply]');
    if (span) navigate(Number(span.dataset.ply));
  });
  document.addEventListener('keydown', (e) => {
    if (!replay || document.body.dataset.screen !== 'game' || !$('modal').hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { navigate(replay.index - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { navigate(replay.index + 1, true); e.preventDefault(); }
  });

  function openReplayList(mode) {
    // Les parties jouées depuis une position construite ont leur propre rubrique, à deux ou contre l'ordinateur
    const source = mode === 'online' ? store.get('onlineArchive', []) : mode === 'free'
      ? [...store.get('archive', []), ...store.get('localArchive', []).map((g) => ({ ...g, mode: 'local' }))].filter((g) => g.fen).sort((a, b) => a.id - b.id)
      : (mode === 'local' ? store.get('localArchive', []) : store.get('archive', []).filter((g) => (g.mode || 'ai') === mode)).filter((g) => !g.fen);
    $('replay-list-title').textContent = `Replay · ${MODE_LABELS[mode]}`;
    const body = $('replay-list-body');
    if (!source.length) {
      body.innerHTML = `<p class="level-help">${L(`Aucune partie terminée dans ce mode pour le moment. Les parties « ${MODE_LABELS[mode]} » apparaîtront ici à la fin de chaque partie.`, `No finished game in this mode yet. “${MODE_LABELS[mode]}” games will appear here at the end of each game.`)}</p>`;
    } else {
      body.innerHTML = '<div class="replay-items">' + source.map((g, i) => [g, i]).reverse().map(([g, i]) => {
        const gm = mode === 'free' ? g.mode || 'ai' : mode;
        if (mode === 'online') return `<button type="button" class="btn replay-item" data-i="${i}"><strong>${escHtml(fmtDateTime(g.id))}</strong><span>${escHtml(g.white)} (${g.whiteElo}) – ${escHtml(g.black)} (${g.blackElo}) · ${TC_LABELS[g.tc] || ''} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}</span></button>`;
        const who = (mode === 'free' ? ` · ${MODE_LABELS[gm]}` : '') + (gm === 'local' ? '' : ` · ${g.champion && champById(g.champion) ? champById(g.champion).name : mode === 'coach' ? L('Maître Sissa', 'Master Sissa') : LEVEL_NAMES[g.level] || ''} · ${L('vous', 'you')}: ${g.color === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black')}`);
        return `<button type="button" class="btn replay-item" data-i="${i}"><strong>${escHtml(fmtDateTime(g.id))}</strong><span>${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}${escHtml(who)} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}</span></button>`;
      }).join('') + '</div>';
    }
    body.onclick = (e) => {
      const b = e.target.closest('.replay-item'); if (!b) return;
      const g = source[Number(b.dataset.i)]; if (!g) return;
      const gm = mode === 'free' ? g.mode || 'ai' : mode;
      if (mode === 'online') return startReplay({ moves: g.moves, result: g.result, title: `${MODE_LABELS.online} · ${fmtDateTime(g.id)}`, flipped: g.color === 'b', date: pgnDate(g.id), white: `${g.white} (${g.whiteElo})`, black: `${g.black} (${g.blackElo})` }, () => openReplayList(mode));
      startReplay({ moves: g.moves, fen: g.fen, result: g.result, title: `${MODE_LABELS[mode]} · ${fmtDateTime(g.id)}`, flipped: gm !== 'local' && g.color === 'b', date: pgnDate(g.id), ...sideNames({ mode: gm, playerColor: g.color, level: g.level, champion: g.champion }) }, () => openReplayList(mode));
    };
    returnTo = 'home';
    show('replay-list');
  }

  const looksLikeFen = (text) => /^\s*[prnbqkPRNBQK1-8]+(?:\/[prnbqkPRNBQK1-8]+){7}\s+[wb]\b/.test(text) && !/\[/.test(text);
  function fenError(fen) {
    const ranks = fen.split(/\s+/)[0].split('/');
    if (ranks.length !== 8) return L('FEN invalide : 8 rangées attendues.', 'Invalid FEN: 8 ranks expected.');
    for (const rank of ranks) {
      const width = [...rank].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 1), 0);
      if (width !== 8) return L('FEN invalide : une rangée ne compte pas 8 cases.', 'Invalid FEN: a rank does not have 8 squares.');
    }
    const board = fen.split(/\s+/)[0];
    if ((board.match(/K/g) || []).length !== 1 || (board.match(/k/g) || []).length !== 1) return L('FEN invalide : un roi blanc et un roi noir sont requis.', 'Invalid FEN: one white king and one black king are required.');
    if (/[pP]/.test(ranks[0] + ranks[7])) return L('FEN invalide : pion sur la première ou la dernière rangée.', 'Invalid FEN: pawn on the first or last rank.');
    return '';
  }
  function addExternal(text) {
    const src = text.replace(/^\uFEFF/, '').trim();
    if (!src) return toast(L('Collez un PGN ou un FEN.', 'Paste a PGN or a FEN.'));
    const entries = [];
    if (looksLikeFen(src)) {
      const fen = src.split(/\r?\n/)[0].trim().replace(/\s+/g, ' ');
      const err = fenError(fen);
      if (err) return toast(err);
      entries.push({ kind: 'fen', title: L('Position FEN', 'FEN position'), fen, moves: [], result: '*' });
    } else {
      const parsed = window.Pgn.parse(src);
      if (!parsed.games.length) return toast(L(`PGN invalide${parsed.error ? ` : ${parsed.error}` : '.'}`, `Invalid PGN${parsed.error ? `: ${parsed.error}` : '.'}`));
      for (const g of parsed.games) {
        entries.push({ kind: 'pgn', title: `${g.tags.White || L('Blancs', 'White')} – ${g.tags.Black || L('Noirs', 'Black')}`, white: g.tags.White, black: g.tags.Black, event: g.tags.Event || '', date: g.tags.Date || '', moves: g.moves, result: g.result !== '*' ? g.result : g.status.over ? g.status.result : '*' });
      }
    }
    const list = store.get('external', []), now = Date.now();
    entries.forEach((entry, i) => list.push({ ...entry, id: now + i }));
    store.set('external', list.slice(-50));
    $('ext-text').value = '';
    renderExternal();
    toast(L(`${entries.length} partie${entries.length > 1 ? 's' : ''} chargée${entries.length > 1 ? 's' : ''}`, `${entries.length} game${entries.length === 1 ? '' : 's'} loaded`));
    if (entries.length === 1) openExternal(now);
  }
  function openExternal(id) {
    const entry = store.get('external', []).find((x) => x.id === id);
    if (!entry) return;
    startReplay(entry, () => { renderExternal(); returnTo = 'home'; show('replay-external'); });
  }
  function renderExternal() {
    const list = store.get('external', []);
    $('ext-history').innerHTML = list.length
      ? '<div class="replay-items">' + list.slice().reverse().map((g) => `<div class="replay-row"><button type="button" class="btn replay-item" data-open="${g.id}"><strong>${escHtml(g.title)}</strong><span>${g.kind === 'fen' ? L('Position FEN', 'FEN position') : `${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}${g.event ? ` · ${escHtml(g.event)}` : ''}`} · ${L('chargée le', 'loaded on')} ${escHtml(fmtDateTime(g.id))}</span></button><button type="button" class="btn ghost replay-del" data-del="${g.id}" aria-label="${L('Supprimer', 'Delete')}">✕</button></div>`).join('') + '</div>'
      : L('<p class="level-help">Aucune partie chargée pour le moment. Les parties chargées sont conservées ici.</p>', '<p class="level-help">No game loaded yet. Loaded games are kept here.</p>');
  }
  $('ext-history').onclick = (e) => {
    const open = e.target.closest('[data-open]'), del = e.target.closest('[data-del]');
    if (open) openExternal(Number(open.dataset.open));
    else if (del) {
      store.set('external', store.get('external', []).filter((x) => x.id !== Number(del.dataset.del)));
      renderExternal();
    }
  };
  $('ext-load').onclick = () => addExternal($('ext-text').value);
  $('ext-file-btn').onclick = () => $('ext-file').click();
  $('ext-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { addExternal(await f.text()); } catch { toast(L('Le fichier n’a pas pu être lu.', 'The file could not be read.')); }
  };
  $('btn-replay-menu').onclick = () => {
    const open = $('replay-submenu').hidden;
    $('replay-submenu').hidden = !open;
    $('btn-replay-menu').setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('[data-replay-mode]').forEach((b) => { b.onclick = () => openReplayList(b.dataset.replayMode); });
  $('btn-replay-external').onclick = () => { renderExternal(); returnTo = 'home'; show('replay-external'); };

  // Bouton retour Android / navigateur : revient à l'accueil plutôt que de quitter
  history.replaceState({ s: 'root' }, '');
  history.pushState({ s: 'app' }, '');
  window.addEventListener('popstate', () => {
    if (!$('modal').hidden) closeModal();
    else if (replay && $('game').classList.contains('active')) exitReplay();
    else if ($('puzzle').classList.contains('active')) leavePuzzle();
    else if ($('theme').classList.contains('active')) show('problems');
    else if ((document.body.dataset.screen || 'home') !== 'home') { save(); show($('settings').classList.contains('active') ? returnTo : 'home'); }
    else return;
    history.pushState({ s: 'app' }, '');
  });

  applyTheme();
  $('board-wrap').addEventListener('board3dcontext', (e) => {
    const lost = !!e.detail.lost;
    $('board-wrap').classList.toggle('webgl-lost', lost);
    if (lost) { renderBoard(); toast(L('La 3D a été interrompue. Tu peux continuer sur le plateau 2D.', '3D was interrupted. You can keep playing on the 2D board.')); }
    else toast(L('Affichage 3D rétabli.', '3D display restored.'));
  });
  try {
    b3d = new window.Board3D($('board-wrap'), tapSquare);
    $('board-wrap').classList.add('is3d');
    b3d.setLite(settings.lite);
    b3d.onSlow = () => {
      if (settings.lite) return;
      settings.lite = true; store.set('settings', settings); b3d.setLite(true);
      toast(L('Affichage lent détecté : mode léger activé (modifiable dans Réglages).', 'Slow display detected: light mode enabled (change it in Settings).'));
    };
  } catch (err) {
    b3d = null; // pas de WebGL : plateau 2D
  }
  // Choix de la vue du plateau : 3D avec l'aperçu 2D, 2D seule (plus léger : la 3D s'arrête) ou 3D seule
  function applyBoardView(rerender) {
    const view = b3d ? (['both', '2d', '3d'].includes(settings.boardView) ? settings.boardView : 'both') : '2d';
    const wrap = $('board-wrap');
    wrap.classList.toggle('view-2d', view === '2d');
    wrap.classList.toggle('view-3d', view === '3d');
    $('view-switch').hidden = !b3d;
    for (const b of $('view-switch').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
    if (rerender && game) { if (b3d && view !== '2d') b3d.resize(); renderBoard(); }
  }
  $('view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]'); if (!b) return;
    settings.boardView = b.dataset.view; store.set('settings', settings);
    applyBoardView(true);
  });
  applyBoardView(false);
  applyAnimSpeed();
  applyBlackTheme();
  // Bouton « Passer » pendant une longue animation (prise spéciale, mat) : les pièces se posent tout de suite
  setInterval(() => {
    const show = !!(b3d && game && document.body.dataset.screen === 'game' && settings.boardView !== '2d' && b3d.busyLeftMs() > 700);
    if ($('btn-skip-anim').hidden === show) $('btn-skip-anim').hidden = !show;
  }, 250);
  $('btn-skip-anim').onclick = () => { if (!b3d) return; b3d.skipAnimations(); $('btn-skip-anim').hidden = true; renderBoard(); };

  const savedGame = store.get('game', null);
  const savedScreen = store.get('lastScreen', null);
  const restorableScreens = ['home', 'program', 'champions', 'setup', 'game', 'settings', 'problems', 'stats', 'rules', 'about'];
  // L'accueil présente le jardin et laisse « Continuer mon aventure » ouvrir les reprises disponibles.
  const initialScreen = 'home';
  if (initialScreen === 'game' && savedGame && savedGame.cfg) {
    startGame(savedGame.cfg, savedGame.moves, savedGame.result, savedGame.flipped, savedGame.terrain, savedGame.weather);
  } else {
    if (initialScreen === 'setup') renderSetup();
    if (initialScreen === 'settings') renderSettings();
    show(initialScreen);
  }
  if (!playerProfile().nameAsked) setTimeout(promptPlayerName, 250);
  openSharedLink();
  setTimeout(analyseNext, 3000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
