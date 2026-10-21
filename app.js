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
    temps: L('Temps écoulé', 'Time out'), deconnexion: L('Connexion perdue (nulle)', 'Connection lost (draw)'),
  };

  /* Stockage (peut être indisponible : navigation privée, etc.) */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('cavalier.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem('cavalier.' + key, JSON.stringify(value)); } catch { /* ignoré */ } },
    del(key) { try { localStorage.removeItem('cavalier.' + key); } catch { /* ignoré */ } },
  };
  const playerProfile = () => Object.assign({ name: '', nameAsked: false, rating: null, games: 0, puzzles: 0 }, store.get('player', {}));

  // Appareil modeste (peu de mémoire ou de cœurs) : 3D allégée par défaut
  const weakDevice = !!((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  const settings = Object.assign({ theme: 'foret', showMoves: true, coords: true, sound: true, autoQueen: false, voice: true, coachEnabled: true, lite: weakDevice }, store.get('settings', {}));
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
  let b3d = null;
  let coachDockOpen = false;
  let coachMessage = '';
  let coachMood = '';
  let coachHintLevel = 0;
  let coachArrows = [];        // flèches du dernier coup commenté (partie coachée)
  let judging = false, judgeSeq = 0, judgeWorker = null;
  const TERRAIN_IDS = ['forest', 'desert', 'prairie', 'steppe', 'mud', 'rock', 'water', 'beach'];
  const TERRAIN_NAMES = L({ forest: 'Forêt', desert: 'Désert', prairie: 'Prairie verte', steppe: 'Plaine sèche', mud: 'Terrain boueux', rock: 'Terrain rocheux', water: 'Flaques d’eau', beach: 'Plage tropicale' }, { forest: 'Forest', desert: 'Desert', prairie: 'Green meadow', steppe: 'Dry plain', mud: 'Muddy ground', rock: 'Rocky ground', water: 'Puddles', beach: 'Tropical beach' });
  const WEATHER_IDS = ['sun', 'drizzle', 'heavy', 'heavystorm', 'windstorm', 'sunwind', 'snow', 'sunset'];
  const WEATHER_NAMES = L({ sun: 'Soleil', drizzle: 'Pluie fine', heavy: 'Grosse pluie', heavystorm: 'Grosse pluie orageuse', windstorm: 'Orage et grand vent', sunwind: 'Soleil et vent', snow: 'Neige fine', sunset: 'Coucher de soleil' },
    { sun: 'Sunny', drizzle: 'Light rain', heavy: 'Heavy rain', heavystorm: 'Heavy thunderstorm', windstorm: 'Windy thunderstorm', sunwind: 'Sunny and windy', snow: 'Light snow', sunset: 'Sunset' });
  // Décor et météo tirés au sort, pour tous les modes (parties, replays, problèmes, cours)
  function randomScenery(terrainId, weatherId) {
    currentTerrain = TERRAIN_IDS.includes(terrainId) ? terrainId : TERRAIN_IDS[Math.floor(Math.random() * TERRAIN_IDS.length)];
    currentWeather = WEATHER_IDS.includes(weatherId) ? weatherId : WEATHER_IDS[Math.floor(Math.random() * WEATHER_IDS.length)];
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
    $('home-player-photo').hidden = !player.photo; if (player.photo) $('home-player-photo').src = player.photo;
    renderHomeRewards();
    $('home-player-elo').textContent = L(`Elo estimé : ${estimatedElo()}`, `Estimated Elo: ${estimatedElo()}`);
    const style = dominantStyle();
    $('home-player-style').hidden = !style;
    if (style) {
      $('home-player-style').textContent = L(`Style : ${style.label}`, `Style: ${style.label}`);
      $('home-player-style').title = L(`Le style qui revient le plus souvent : ${style.n} de tes ${style.games} dernières parties contre l'ordinateur.`, `Your most frequent style: ${style.n} of your last ${style.games} games against the computer.`);
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
      text: L(`Je vais construire ton programme à partir de tes parties et de tes problèmes. Pour commencer, ${profile.name || 'joue'} une partie contre l’ordinateur ou lance les problèmes de base.`,
        `I will build your training plan from your games and puzzles. To begin${profile.name ? `, ${profile.name},` : ','} play a game against the computer or start the basic puzzles.`),
      theme: null,
    };
    const row = priority.row, theme = PZ[priority.key];
    const puzzleText = row.failed ? L(` Tu as aussi eu besoin d’aide sur ${row.failed} problème${row.failed > 1 ? 's' : ''} de ce thème.`, ` You also needed help on ${row.failed} puzzle${row.failed === 1 ? '' : 's'} of this theme.`) : '';
    const personalText = priority.personalErrors ? L(` ${priority.personalErrors} erreur${priority.personalErrors > 1 ? 's' : ''} personnelle${priority.personalErrors > 1 ? 's' : ''} reste${priority.personalErrors > 1 ? 'nt' : ''} à retravailler.`, ` ${priority.personalErrors} of your own mistake${priority.personalErrors === 1 ? '' : 's'} still need${priority.personalErrors === 1 ? 's' : ''} work.`) : '';
    const reviewText = dueReviews ? L(` ${dueReviews} révision${dueReviews > 1 ? 's' : ''} ${dueReviews === 1 ? 'est prête' : 'sont prêtes'}.`, ` ${dueReviews} review${dueReviews === 1 ? ' is' : 's are'} ready.`) : '';
    return {
      badge: L(`${c.games} partie${c.games === 1 ? '' : 's'} analysée${c.games === 1 ? '' : 's'} · ${completedPuzzles} problème${completedPuzzles === 1 ? '' : 's'}${dueReviews ? ` · ${dueReviews} révision${dueReviews > 1 ? 's' : ''} due${dueReviews > 1 ? 's' : ''}` : ''}`,
        `${c.games} game${c.games === 1 ? '' : 's'} analysed · ${completedPuzzles} puzzle${completedPuzzles === 1 ? '' : 's'}${dueReviews ? ` · ${dueReviews} review${dueReviews === 1 ? '' : 's'} due` : ''}`),
      focus: L(`Priorité: ${theme.name} · ${row.errors} faute${row.errors > 1 ? 's' : ''} repérée${row.errors > 1 ? 's' : ''}`, `Priority: ${theme.name} · ${row.errors} mistake${row.errors === 1 ? '' : 's'} spotted`),
      text: L(`${profile.name ? `${profile.name}, ` : ''}tes analyses montrent que ${theme.name.toLowerCase()} est le meilleur levier de progression.${puzzleText}${personalText}${reviewText} Je te propose une courte leçon, puis des exercices ciblés.`,
        `${profile.name ? `${profile.name}, ` : ''}your analyses show that ${theme.name.toLowerCase()} is where you can improve the most.${puzzleText}${personalText}${reviewText} I suggest a short lesson, then targeted exercises.`),
      theme: priority.key,
    };
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
  }

  function renderCoachDock() {
    const dock = $('coach-dock');
    if (!dock) return;
    dock.hidden = !settings.coachEnabled;
    $('coach-dock-panel').hidden = !coachDockOpen;
    $('coach-dock-message').textContent = coachMessage || coachPlan().text;
    const champ = activeChampion();
    dock.querySelector('.coach-dock-head strong').textContent = coachName();
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
      b.innerHTML = `<i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i><span class="theme-name">${th.name}${have ? '' : ` 🔒 ${th.price} 🌾`}</span>`;
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
  }
  function saveSettings() { store.set('settings', settings); applyTheme(); if (b3d) b3d.setLite(settings.lite); if (game) renderBoard(); voiceButton(); renderCoachProgram(); renderCoachDock(); if (!settings.voice) hush(); }
  [['opt-moves', 'showMoves'], ['opt-coords', 'coords'], ['opt-sound', 'sound'], ['opt-autoq', 'autoQueen'], ['opt-voice', 'voice'], ['opt-coach', 'coachEnabled'], ['opt-lite', 'lite']].forEach(([id, key]) => {
    $(id).addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); });
  });

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
  function parsePgnGame(text) {
    const tags = {};
    text.replace(/^\s*\[([A-Za-z0-9_]+)\s+"((?:\\.|[^"])*)"\]\s*$/gm, (_, key, value) => {
      tags[key] = value.replace(/\\([\\"])/g, '$1');
      return '';
    });
    const movetext = text.replace(/^\s*\[[^\r\n]*\]\s*$/gm, '').replace(/\{[^}]*\}/gs, '').replace(/;[^\r\n]*/g, '');
    let clean = '', variationDepth = 0;
    for (const char of movetext) {
      if (char === '(') variationDepth++;
      else if (char === ')' && variationDepth) variationDepth--;
      else if (!variationDepth) clean += char;
    }
    const game = new Game();
    let result = tags.Result || '*';
    for (let token of clean.replace(/\$\d+/g, '').split(/\s+/)) {
      token = token.replace(/^\d+\.(?:\.\.)?/, '').replace(/[!?]+$/g, '');
      if (!token || /^(?:e\.p\.?|ep)$/i.test(token)) continue;
      if (/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token)) { result = token; break; }
      if (!game.playSan(token)) return { error: token };
    }
    if (!game.history.length) return { error: L('aucun coup reconnu', 'no move recognised') };
    if (!/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(result)) result = '*';
    return { tags, moves: game.uciList(), result, status: game.status() };
  }
  function parsePgn(text) {
    const source = text.replace(/^\uFEFF/, '').trim();
    const starts = [...source.matchAll(/^\s*\[Event\s+/gm)].map((match) => match.index);
    const chunks = starts.length > 1 ? starts.map((start, index) => source.slice(start, starts[index + 1] || source.length).trim()) : [source];
    const games = [];
    for (const chunk of chunks) {
      const parsed = parsePgnGame(chunk);
      if (parsed.error) return { error: parsed.error, games: [] };
      games.push(parsed);
    }
    return { games };
  }
  function loadPgn(text) {
    const parsed = parsePgn(text);
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
    cancelAi();
    if (conf.mode !== 'online' && typeof stopOnline === 'function') stopOnline();
    replay = null; setReplayUi(false);
    pz = null; marks = null;
    attachBoard('game');
    game = new Game(conf.fen || undefined);
    for (const u of uciMoves) if (!game.playUci(u)) break;
    cfg = conf;
    if (cfg.mode === 'coach') cfg.coachTheme = coachPlan().theme;
    result = res;
    $('terrain-name').textContent = randomScenery(terrainId, weatherId);
    flipped = flip !== undefined ? flip : conf.mode !== 'local' && conf.playerColor === 'b';
    selected = -1; hint = null;
    const drillOf = conf.drill && window.TRAINER && window.TRAINER.ENDGAMES.find((x) => x.id === conf.drill);
    $('game-title').textContent = conf.mode === 'online' ? (conf.online.tournament ? `${conf.online.tournament} · ${L('ronde', 'round')} ${conf.online.round}` : `${L('En ligne', 'Online')} · ${TC_LABELS[conf.online.tc] || ''}`) : (drillOf ? `${drillOf.name} · ` : conf.fen ? L('Position libre · ', 'Custom position · ') : '') + (conf.mode === 'local' ? L('Deux joueurs', 'Two players') : conf.mode === 'coach' ? `${conf.champion && champById(conf.champion) ? L(`Face à ${champShort(champById(conf.champion))}`, `Against ${champShort(champById(conf.champion))}`) : L('Partie coachée', 'Coached game')} · ${LEVEL_NAMES[conf.level]}` : `${LEVEL_NAMES[conf.level]} (Elo ${LEVEL_ELO[conf.level]})`);
    show('game');
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
  function renderMinimap(board, last, selectedSq = -1, targets = [], mateFire = [], arrows = []) {
    const el = $('minimap');
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = flipped ? 63 - i : i, p = board[sq];
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      const lit = last && (last.from === sq || last.to === sq);
      const selected = selectedSq === sq;
      const target = targets.some((m) => m.to === sq);
      const capture = target && (!!p || targets.some((m) => m.to === sq && m.flag === 'ep'));
      html += `<button type="button" class="${dark ? 'd' : 'l'}${lit ? ' last' : ''}${selected ? ' sel' : ''}${mateFire.includes(sq) ? ' mate-fire' : ''}${target ? ` target${capture ? ' capture' : ''}` : ''}" data-sq="${sq}" aria-label="${sqName(sq)} ${p ? pieceName(p) : mateFire.includes(sq) ? L('case vide en feu', 'empty square on fire') : L('case vide', 'empty square')}"${selected ? ' aria-pressed="true"' : ''}>${p ? `<b class="${p === p.toUpperCase() ? 'w' : 'k'}">${MINI[p.toLowerCase()]}</b>` : ''}</button>`;
    }
    el.innerHTML = html + arrowsSvg(arrows);
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
    const last = game.lastMove();
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
        if (last && mater != null && s.board[mater]) {
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
    const arrows = replay ? replayArrows() : (!pz && cfg && cfg.mode === 'coach' ? coachArrows : []);
    if (b3d) {
      const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
      b3d.update({ board: s.board, selected, targets, last, check: checkSq, mateFire, mateUltimate, hint, flipped, showMoves: settings.showMoves || !!marks, coords: settings.coords, light: th.light, dark: th.dark, animate: animateNext, outcome: shown ? shown.result : null, arrows, ply: pz ? null : game.history.length });
      animateNext = false;
      renderMinimap(s.board, last, selected, targets, mateFire, arrows);
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
      if (sq === selected) cell.classList.add('sel');
      if (sq === checkSq) cell.classList.add('check');
      if (mateFire.includes(sq)) cell.classList.add('mate-fire');
      if (hint && hint.from === sq) cell.classList.add('hint-from');
      if (hint && hint.to === sq) cell.classList.add('hint-to');
      const p = s.board[sq];
      cell.setAttribute('aria-label', sqName(sq) + (p ? ' ' + p : ''));
      if (settings.coords) {
        const row = i >> 3, col = i & 7;
        if (row === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord f">${sqName(sq)[0]}</span>`);
        if (col === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord r">${sqName(sq)[1]}</span>`);
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
    $('btn-undo').disabled = cfg.mode === 'online' || !!result || plies === 0 || (cfg.mode !== 'local' && plies < (cfg.playerColor === 'w' ? 1 : 2));
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
    if (cfg.mode === 'online' && colorOf(res.move.piece) === cfg.playerColor) ON.playMove(cfg.online.id, window.Chess.toUci(res.move), game.history.length - 1, result).catch(() => toast(L('Coup non envoyé : vérifie ta connexion.', 'Move not sent: check your connection.')));
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
      }
    } else if (cfg.mode !== 'local' && cfg.fen) archiveGame();
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
    thinking = false;
    const res = game.play(from, to, move[4]);
    if (res) afterMove(res);
  }
  function maybeAiMove() {
    if (!game || result || cfg.mode === 'local' || cfg.mode === 'online' || game.turn === cfg.playerColor) return;
    thinking = true;
    renderStatus(); renderActions();
    // Petit délai pour que le coup du joueur s'affiche d'abord
    // Laisse le duel en cours se terminer avant que l'ordinateur ne joue
    const busy = b3d ? b3d.busyLeftMs() : 0;
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
    const games = row.recent.length;
    if (!games || base === null) return { value: base || 800, data: false };
    const avg = row.recent.reduce((x, y) => x + y, 0) / games; // fautes par partie dans ce thème
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
  let aWorker = null, analysing = false;
  function analyseNext() {
    if (analysing) return;
    const g = store.get('archive', []).find((x) => !x.analysed);
    if (!g) return explainPending();
    try { aWorker = aWorker || new Worker(`analyse-worker.js?lang=${LANG}`); } catch { return; }
    analysing = true;
    aWorker.onmessage = (e) => {
      analysing = false;
      const arch = store.get('archive', []);
      const row = arch.find((x) => x.id === g.id);
      if (row) row.analysed = true;
      store.set('archive', arch);
      if (e.data.ok) recordAnalysis(g, e.data.errors, e.data.captures || []);
      if ($('problems').classList.contains('active')) renderProblems();
      analyseNext();
    };
    aWorker.postMessage({ id: g.id, moves: g.moves, color: g.color });
  }
  function recordAnalysis(g, errors, captures = []) {
    const c = loadCoach();
    const ignoredCaptureIds = new Set(captures
      .filter((x) => x.kind === 'counterplay' || x.kind === 'material-only')
      .map((x) => `${g.id}-${x.ply}`));
    const countedErrors = errors.filter((e) => !(e.theme === 'prise' && ignoredCaptureIds.has(`${g.id}-${e.ply}`)));
    const count = {};
    for (const e of countedErrors) count[e.theme] = (count[e.theme] || 0) + 1;
    const promoted = [], retry = [];
    for (const k of PZ_KEYS) {
      const row = themeRow(c, k), n = Math.min(3, count[k] || 0);
      row.score = Math.round((0.85 * row.score + 0.15 * n) * 1000) / 1000;
      row.hist = row.hist.concat(row.score).slice(-30);
      row.recent = row.recent.concat(n).slice(-10);
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
        theme: e.theme, fen: e.fen, played: san, line: e.line, alts: e.alts,
        level: e.level, solved: false, tries: 0, last: 0, reviewStage: 0, reviewAt: Date.now(),
      });
    }
    store.set('mistakes', mistakes.slice(-150));
    if (captures.length) {
      const notes = store.get('captureNotes', []);
      const sanFor = (fen, uci) => {
        if (!uci) return '';
        try { return new Game(fen).playUci(uci).san || uci; } catch { return uci; }
      };
      for (const x of captures) {
        let replySan = x.reply;
        if (x.reply) {
          try {
            const after = new Game(x.fen);
            after.playUci(x.played);
            replySan = sanFor(window.Chess.toFen(after.state), x.reply);
          } catch { replySan = x.reply; }
        }
        notes.push({
          id: `${g.id}-${x.ply}`, date: g.id, move: Math.floor(x.ply / 2) + 1,
          kind: x.kind, played: sanFor(x.fen, x.played), captured: x.captured,
          best: sanFor(x.fen, x.best), reply: replySan,
          score: x.score, loss: x.loss, netMaterial: x.netMaterial,
          bestMate: x.bestMate, mateInBest: x.mateInBest,
        });
      }
      store.set('captureNotes', notes.slice(-100));
    }
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
    const captureCounts = {
      advantageous: captures.filter((x) => x.kind === 'advantageous').length,
      counterplay: captures.filter((x) => x.kind === 'counterplay').length,
      materialOnly: captures.filter((x) => x.kind === 'material-only').length,
    };
    const captureSummary = [
      captureCounts.advantageous && L(`${captureCounts.advantageous} prise${captureCounts.advantageous > 1 ? 's' : ''} avantageuse${captureCounts.advantageous > 1 ? 's' : ''}`, `${captureCounts.advantageous} good capture${captureCounts.advantageous === 1 ? '' : 's'}`),
      captureCounts.counterplay && L(`${captureCounts.counterplay} prise${captureCounts.counterplay > 1 ? 's' : ''} laissant du contre-jeu`, `${captureCounts.counterplay} capture${captureCounts.counterplay === 1 ? '' : 's'} allowing counterplay`),
      captureCounts.materialOnly && L(`${captureCounts.materialOnly} prise${captureCounts.materialOnly > 1 ? 's' : ''} ayant fait manquer un meilleur coup`, `${captureCounts.materialOnly} capture${captureCounts.materialOnly === 1 ? '' : 's'} that missed a better move`),
    ].filter(Boolean).join(' · ');
    toast(L(`Partie analysée : ${summary}${captureSummary ? ` · ${captureSummary}` : ''}. Voir Problèmes.`, `Game analysed: ${summary}${captureSummary ? ` · ${captureSummary}` : ''}. See Puzzles.`));
    if (promoted.length || retry.length) setTimeout(() => toast((promoted.length ? L(`Niveau confirmé : ${promoted.join(', ')}. `, `Level confirmed: ${promoted.join(', ')}. `) : '') + (retry.length ? L(`À reprendre : ${retry.join(', ')}.`, `To redo: ${retry.join(', ')}.`) : '')), 3500);
  }

  /* Parcours imposé : pour chaque thème, du plus fréquent au plus rare, la leçon puis des problèmes */
  // Chaque niveau d'un thème : quelques problèmes à réussir, puis l'analyse de tes parties confirme
  const LEVEL_SET = 3;
  const MAX_LEVEL = 9;
  function pathOrder(c) {
    const weak = ranked(c).filter((k) => isWeak(c.themes[k]));
    return weak.length ? weak : PZ_KEYS.slice();
  }
  function pickPuzzle(k, level) {
    const now = Date.now();
    const due = (m) => m.reviewAt ?? ((m.last || 0) + 600000);
    const mine = store.get('mistakes', []).filter((m) => m.theme === k && !m.solved && due(m) <= now).sort((a, b) => due(a) - due(b))[0];
    if (mine) return personalItem(mine);
    const st = store.get('pzdone', {});
    let pool = BANK.filter((p) => p.theme === k && st[p.id] !== 's');
    if (!pool.length) pool = BANK.filter((p) => p.theme === k);
    if (!pool.length) return null;
    const dist = (p) => Math.abs((p.rating || p.level * 3 - 1) - level) + (st[p.id] ? 0.5 : 0) + Math.random() * 0.9;
    return pool.map((p) => ({ p, d: dist(p) })).sort((a, b) => a.d - b.d)[0].p;
  }
  // Étape suivante du parcours : premier thème faible dont le niveau n'attend pas de confirmation
  function peekActivity() {
    const c = loadCoach(), order = pathOrder(c), done = store.get('lessonsDone', {});
    const open = order.filter((x) => !themeRow(c, x).pending && (BANK.some((p) => p.theme === x) || !done[x]));
    const k = open[0];
    if (!k) return { type: 'wait', theme: order[0] };
    if (!done[k] && LESSONS.some((x) => x.theme === k)) return { type: 'lesson', theme: k };
    return { type: 'puzzle', theme: k };
  }
  function nextActivity(force) {
    let act = peekActivity();
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
    store.set('openLesson', { key: 'program', title: L(`Problème : ${PZ[act.theme] ? PZ[act.theme].name : ''}`, `Puzzle: ${PZ[act.theme] ? PZ[act.theme].name : ''}`), idx: 0, total: 1, at: Date.now() });
    enterPuzzleMode();
    loadItem(it);
  }
  const lessonOf = (k) => LESSONS.find((x) => x.theme === k);
  function card(k, row, rank, now) {
    const [cls, label] = themeStatus(row);
    const recent = row.recent.reduce((a, b) => a + b, 0);
    const width = Math.min(100, Math.round((row.score / 0.6) * 100));
    const color = cls === 'hot' ? 'var(--danger)' : cls === 'warm' ? 'var(--accent)' : '#6ebe82';
    const done = store.get('lessonsDone', {})[k];
    return `<button class="pz-card${now ? ' now' : ''}" data-theme="${k}"><span class="ico">${PZ[k].icon}</span>
      <span class="t">${rank ? `${rank}. ` : ''}${PZ[k].name}</span><span class="chip ${cls}">${label}</span>
      <span class="d">${row.recent.length ? L(`${recent} faute${recent > 1 ? 's' : ''} ${row.recent.length > 1 ? `sur tes ${row.recent.length} dernières parties` : 'dans ta dernière partie'} · `, `${recent} mistake${recent === 1 ? '' : 's'} ${row.recent.length > 1 ? `in your last ${row.recent.length} games` : 'in your last game'} · `) : ''}${L('Leçon', 'Lesson')} ${done ? '✓' : L('à faire', 'to do')} · ${L('Niveau', 'Level')} ${row.level} ${levelState(row)} ${trendOf(row)}</span>
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
    const tips = [];
    for (const [key, list] of groups) {
      const games = new Set(list.map((m) => m.date)).size;
      if (games < 2) continue;
      const last = list[list.length - 1];
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
    return tips.filter((t) => !t.pos || t.list.some((m) => !covered.has(m.id))).sort((a, b) => b.games - a.games || b.list.length - a.list.length).slice(0, 6);
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
      steps.push({ text: L(`Ta partie du ${fmtDate(m.date)}, coup ${m.move}. Tu as joué ${m.played}.${reply || ' Il y avait beaucoup mieux.'}`, `Your game of ${fmtDate(m.date)}, move ${m.move}. You played ${m.played}.${reply || ' There was much better.'}`), fen: m.fen, marks: [...new Set(marks)] });
      steps.push({ text: L('À toi : dans cette même position, trouve le bon coup.', 'Your turn: in this same position, find the right move.'), fen: m.fen, line: m.line, alts: m.alts, mistake: m.id,
        why: L(`Voilà la solution. ${t.solution}`, `That's the solution. ${t.solution}`), wrong: L(`Pas encore. ${t.solution}`, `Not yet. ${t.solution}`), hintText: L('Regarde la pièce en surbrillance : c\'est elle qui doit jouer.', 'Look at the highlighted piece: it is the one that must move.') });
    }
    steps.push({ text: L(`Retiens bien : ${t.solution.charAt(0).toLowerCase() + t.solution.slice(1)} Je surveille tes prochaines parties pour voir si ce motif disparaît.`, `Remember: ${t.solution.charAt(0).toLowerCase() + t.solution.slice(1)} I'll watch your next games to see if this pattern disappears.`) });
    pz = { kind: 'lesson', lesson: { theme: t.theme, title: t.title, tip: t.key, count: t.list.length }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  const levelState = (row) => row.pending ? L('· validé, à confirmer en partie', '· validated, to confirm in a game') : `· ${row.ok}/${LEVEL_SET}`;
  function renderProblems() {
    const c = loadCoach();
    const pending = store.get('archive', []).filter((x) => !x.analysed).length;
    const mistakes = store.get('mistakes', []);
    const captureNotes = store.get('captureNotes', []).slice(-8).reverse();
    const order = pathOrder(c);
    const acquired = ranked(c).filter((k) => !isWeak(c.themes[k]));
    const next = peekActivity();
    let html = '<div class="pz-summary">';
    if (!c.games) html += L("Joue une partie contre l'ordinateur : je l'analyse et je construis ton programme, du point faible le plus fréquent au plus rare. En attendant, on commence par les bases.", 'Play a game against the computer: I analyse it and build your plan, from your most frequent weakness to the rarest. Meanwhile, we start with the basics.');
    else html += L(`<b>${c.games}</b> partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} · <b>${mistakes.length}</b> faute${mistakes.length > 1 ? 's' : ''} relevée${mistakes.length > 1 ? 's' : ''}`, `<b>${c.games}</b> game${c.games === 1 ? '' : 's'} analysed · <b>${mistakes.length}</b> mistake${mistakes.length === 1 ? '' : 's'} found`);
    if (pending) html += L(`<br>Analyse en cours : ${pending} partie${pending > 1 ? 's' : ''} en attente…`, `<br>Analysis running: ${pending} game${pending === 1 ? '' : 's'} waiting…`);
    html += '</div>';
    if (captureNotes.length) {
      const pieceNames = L({ p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'une dame', k: 'un roi' }, { p: 'a pawn', n: 'a knight', b: 'a bishop', r: 'a rook', q: 'a queen', k: 'a king' });
      const pawns = (cp) => `${NUM(Math.abs(cp) / 100)} ${P(Math.abs(cp) >= 200 ? 2 : 1, 'pion', 'pions', 'pawn', 'pawns')}`;
      html += L('<h3 class="pz-section">Analyse de tes prises</h3><p class="pz-cap">Le moteur regarde si la prise garde son avantage, concède du contre-jeu ou fait manquer un meilleur coup.</p>', '<h3 class="pz-section">Your captures analysed</h3><p class="pz-cap">The engine checks whether the capture keeps its advantage, allows counterplay or misses a better move.</p>');
      html += captureNotes.map((x) => {
        const piece = pieceNames[x.captured] || L('une pièce', 'a piece');
        let title, detail;
        if (x.kind === 'advantageous') {
          title = L('Prise avantageuse', 'Good capture');
          detail = L(`Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : prendre ${piece} conserve un avantage et gagne du matériel.`, `Game of ${fmtDate(x.date)}, move ${x.move} (${x.played}): taking ${piece} keeps an advantage and wins material.`);
        } else if (x.kind === 'counterplay') {
          title = L('La prise laisse du contre-jeu', 'The capture allows counterplay');
          detail = L(`Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : après cette prise, l’adversaire pouvait répondre ${x.reply || 'par une forte riposte'} et dégrader fortement ta position.`, `Game of ${fmtDate(x.date)}, move ${x.move} (${x.played}): after this capture, your opponent could reply ${x.reply || 'with a strong counter'} and badly damage your position.`);
        } else {
          title = L('Prise matérielle, meilleur coup manqué', 'Material grab, better move missed');
          const better = x.bestMate ? L(`${x.best} permettait de mater en ${x.mateInBest} coup${x.mateInBest > 1 ? 's' : ''}`, `${x.best} mated in ${x.mateInBest} move${x.mateInBest === 1 ? '' : 's'}`) : L(`${x.best} conservait mieux l’avantage (écart estimé : ${pawns(x.loss)})`, `${x.best} kept the advantage better (estimated gap: ${pawns(x.loss)})`);
          detail = L(`Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : la prise gagne ${piece}, mais ${better}.`, `Game of ${fmtDate(x.date)}, move ${x.move} (${x.played}): the capture wins ${piece}, but ${better}.`);
        }
        return `<article class="capture-note ${x.kind}"><b>${title}</b><small>${detail}</small></article>`;
      }).join('');
    }
    const nextLabel = next.type === 'wait' ? L('Joue une partie pour confirmer tes niveaux', 'Play a game to confirm your levels') : next.type === 'lesson' ? L(`Leçon : ${lessonOf(next.theme).title}`, `Lesson: ${lessonOf(next.theme).title}`) : L(`Problèmes : ${PZ[next.theme].name} · niveau ${themeRow(c, next.theme).level} (${themeRow(c, next.theme).ok}/${LEVEL_SET})`, `Puzzles: ${PZ[next.theme].name} · level ${themeRow(c, next.theme).level} (${themeRow(c, next.theme).ok}/${LEVEL_SET})`);
    html += `<button class="btn primary wide" id="pz-go">${L('Continuer mon entraînement', 'Continue my training')}</button><p class="pz-next">${L('Prochaine étape', 'Next step')} · ${nextLabel}</p>`;
    const tips = tipMotifs();
    if (tips.length) html += `<h3 class="pz-section">${L('Astuces solutions', 'Solution tips')}</h3><p class="pz-cap">${L(`Les erreurs qui reviennent dans tes parties, expliquées par ${COACH}.`, `The mistakes that keep coming back in your games, explained by ${COACH}.`)}</p>` + tips.map(tipCard).join('');
    html += `<h3 class="pz-section">${c.games ? L('Ton programme, par priorité', 'Your plan, by priority') : L('Programme de départ', 'Starter plan')}</h3>`;
    html += order.map((k, i) => card(k, themeRow(c, k), i + 1, k === next.theme)).join('');
    if (acquired.length && order.some((k) => !acquired.includes(k))) html += `<h3 class="pz-section">${L('Thèmes acquis', 'Mastered themes')}</h3>` + acquired.map((k) => card(k, c.themes[k], 0)).join('');
    const body = $('problems-body');
    body.innerHTML = html;
    body.querySelectorAll('[data-theme]').forEach((b) => (b.onclick = () => openTheme(b.dataset.theme)));
    body.querySelectorAll('[data-tip]').forEach((b) => (b.onclick = () => startTip(b.dataset.tip)));
    $('pz-go').onclick = nextActivity;
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
    const recent = row.recent.reduce((a, b) => a + b, 0);
    $('theme-title').textContent = info.name;
    let html = `<p style="color:var(--muted)">${row.errors ? info.short : L('Pas encore de faute de ce type dans tes parties.', 'No mistake of this kind in your games yet.')} ${row.errors ? `<span class="chip ${themeStatus(row)[0]}">${themeStatus(row)[1]}</span> ${trendOf(row)}` : ''}</p>`;
    html += `<div class="pz-stats"><div><b>${recent}</b><span>${L('fautes (10 dernières parties)', 'mistakes (last 10 games)')}</span></div><div><b>${row.level}</b><span>${L('niveau', 'level')} / ${MAX_LEVEL}<br>${row.pending ? L('à confirmer en partie', 'to confirm in a game') : L(`${row.ok}/${LEVEL_SET} réussis`, `${row.ok}/${LEVEL_SET} solved`)}</span></div><div><b>${row.solved}</b><span>${L('problèmes réussis', 'puzzles solved')}</span></div></div>`;
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
  let speechUntil = 0, lastUtterance = null;
  const speechBusy = () => !!(tts && settings.voice && speechUntil > performance.now());
  function speak(text) {
    if (!tts || !settings.voice) return;
    if (shoutU) { pendingSpeech = text; return; }
    tts.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
    u.lang = LOCALE; if (frVoice) u.voice = frVoice;
    u.rate = 1.0; u.pitch = 0.9;
    const done = () => { if (lastUtterance === u) { speechUntil = 0; if (game && !replay && !pz) renderActions(); } };
    lastUtterance = u;
    u.onend = done; u.onerror = done;
    speechUntil = performance.now() + Math.min(45000, 3000 + text.length * 90);
    tts.speak(u);
  }
  const hush = () => { speechUntil = 0; shoutU = null; pendingSpeech = null; if (tts) tts.cancel(); };
  // Cri de technique : prononcé avant l'attaque ; la parole du coach attend la fin du cri
  let shoutU = null, pendingSpeech = null;
  function shout(name) {
    if (!tts || !settings.voice) return;
    tts.cancel();
    const u = new SpeechSynthesisUtterance(name);
    u.lang = LOCALE; if (frVoice) u.voice = frVoice;
    u.rate = 0.95; u.pitch = 0.7; u.volume = 1;
    const done = () => {
      if (shoutU !== u) return;
      shoutU = null; speechUntil = 0;
      if (pendingSpeech) { const t = pendingSpeech; pendingSpeech = null; speak(t); }
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
  }
  $('pz-voice').onclick = () => {
    settings.voice = !settings.voice; store.set('settings', settings); voiceButton(); renderCoachDock();
    if (settings.voice) speak($('pz-prompt').textContent); else hush();
  };
  voiceButton();
  function say(text, mood = '') {
    text = coachGreeting(text);
    const p = $('pz-prompt');
    p.textContent = text;
    $('coach').querySelector('.bubble b').textContent = coachName();
    showCoachFace($('coach-img'));
    coachMessage = text; coachMood = mood; renderCoachDock();
    speak(text);
    const box = $('coach');
    box.className = 'coach' + (mood ? ' ' + mood : '');
    void box.offsetWidth; box.classList.add('talk');
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
    attachBoard('puzzle');
    if (!$('puzzle').classList.contains('active')) { randomScenery(); show('puzzle'); }
  }
  function leavePuzzle() {
    hush();
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
  function promptOf(it) {
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
    $('puzzle-title').textContent = PZ[it.theme].name;
    $('pz-count').textContent = (it.personal ? L('Ta partie · ', 'Your game · ') : '') + `${L('Niveau', 'Level')} ${row.level} · ${row.pending ? L('révision', 'review') : `${Math.min(LEVEL_SET, row.ok + 1)}/${LEVEL_SET}`}`;
    say(promptOf(it));
    setPzStatus('', L('À toi de jouer', 'Your move'));
    renderBoard();
    pzButtons();
  }
  function pzButtons() {
    const task = pz.item && pz.item.line;
    $('pz-hint').disabled = !task || pz.done || pz.locked;
    $('pz-solution').disabled = !task || pz.done || pz.locked;
    $('pz-next').innerHTML = `<span>→</span>${pz.kind === 'lesson' ? lessonNextLabel() : L('Suivant', 'Next')}`;
    $('pz-next').disabled = !pz.done;
  }
  // Libellé du bouton du bas pendant un cours, et la phrase de l'entraîneur qui invite à l'utiliser
  function lessonNextLabel() {
    const lastStep = pz.idx >= pz.steps.length - 1;
    return lastStep ? (pz.lesson && (pz.lesson.tip || pz.lesson.champion || pz.lesson.onDone) ? L('Terminer', 'Finish') : L('Aux problèmes', 'To the puzzles')) : L('Continuer', 'Continue');
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
    renderBoard();
    const lessonStep = pz.kind === 'lesson' ? pz.steps[pz.idx] : null;
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
      const r = game.playUci(it.line[pz.step]);
      pz.step++;
      pz.hintLevel = 0;
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
      const lessonLevel = themeRow(loadCoach(), pz.lesson.theme).level;
      if (!pz.lesson.noRating) countPuzzle();
      say(`${st.why || L('Exactement ! Tu as trouvé.', 'Exactly! You found it.')} ${lessonCue()}`, 'happy');
      if (st.mistake) touchMistake(st.mistake, clean);
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
    if (it.id) { const st = store.get('pzdone', {}); if (clean && st[it.id] !== 's') { reward(5, 10, L('Problème résolu', 'Puzzle solved')); questEvent('puzzle'); } st[it.id] = clean ? 's' : 'f'; store.set('pzdone', st); }
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
    say(L('Regarde bien ce coup, je te le montre.', 'Watch this move carefully, I will show you.'));
    commit(window.Chess.sqIndex(u.slice(0, 2)), window.Chess.sqIndex(u.slice(2, 4)), u[4]);
  };
  $('pz-next').onclick = () => {
    if (!pz || !pz.done) return;
    if (pz.kind === 'lesson') return nextLessonStep();
    nextActivity();
  };
  $('btn-puzzle-back').onclick = leavePuzzle;
  $('btn-theme-back').onclick = () => show('problems');

  /* Leçons guidées par l'entraîneur */
  function startLesson(k) {
    const lesson = lessonOf(k);
    const c = loadCoach(), row = c.themes[k];
    const steps = lesson.steps.slice();
    const intro = row && row.errors
      ? L(`Bonjour, je suis ${COACH}. Dans tes parties, j'ai relevé ${row.errors} faute${row.errors > 1 ? 's' : ''} de type « ${PZ[k].name} ». C'est ta priorité du moment : on va la travailler ensemble.`, `Hello, I'm ${COACH}. In your games, I found ${row.errors} mistake${row.errors === 1 ? '' : 's'} of the “${PZ[k].name}” kind. It's your priority right now: let's work on it together.`)
      : L(`Bonjour, je suis ${COACH}. Aujourd'hui, on travaille « ${PZ[k].name} ».`, `Hello, I'm ${COACH}. Today we work on “${PZ[k].name}”.`);
    steps.unshift({ text: intro });
    // Dernière étape : une de tes propres erreurs sur ce thème
    const mine = store.get('mistakes', []).filter((m) => m.theme === k).pop();
    if (mine) steps.push({ text: L(`Maintenant, ta propre partie du ${fmtDate(mine.date)}. Au coup ${mine.move}, tu as joué ${mine.played}. Avec ce que tu viens de voir, trouve le bon coup.`, `Now, your own game of ${fmtDate(mine.date)}. On move ${mine.move}, you played ${mine.played}. With what you have just seen, find the right move.`), fen: mine.fen, line: mine.line, alts: mine.alts, mistake: mine.id, why: L('Voilà le coup que tu cherchais. La prochaine fois, tu le verras pendant la partie.', "That's the move you were looking for. Next time, you'll see it during the game.") });
    steps.push({ text: L(`${PZ[k].tip} Passons aux problèmes : à chaque réussite, le niveau monte.`, `${PZ[k].tip} On to the puzzles: each success raises the level.`) });
    pz = { kind: 'lesson', lesson: { ...lesson, resume: `lesson:${k}` }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  // Leçon ou problème ouvert : retenu pour l'écran « Reprendre » jusqu'à ce qu'il soit terminé
  function trackOpenLesson() {
    if (!pz || !pz.lesson || !pz.lesson.resume) return;
    store.set('openLesson', { key: pz.lesson.resume, title: pz.lesson.title, idx: pz.idx, total: pz.steps.length, at: Date.now() });
  }
  const clearOpenLesson = () => { if (store.get('openLesson', null)) store.set('openLesson', null); };
  function resumeOpenLesson() {
    const ol = store.get('openLesson', null); if (!ol) return;
    const [kind, id] = ol.key.split(':');
    if (kind === 'program') { show('problems'); nextActivity(); return; }
    if (kind === 'mate') startMateLesson(TR.MATES.find((x) => x.id === id));
    else if (kind === 'end') startEndgame(TR.ENDGAMES.find((x) => x.id === id));
    else if (kind === 'open') startOpening(TR.OPENINGS.find((x) => x.id === id));
    else if (kind === 'famous') startFamous(TR.FAMOUS.find((x) => x.id === id));
    else if (kind === 'daily') startDaily(Number(id) || 0);
    else if (kind === 'lesson') startLesson(id);
    else return;
    // reprise à l'étape où l'on s'était arrêté
    if (pz && pz.steps && ol.idx > 0 && ol.idx < pz.steps.length) { pz.idx = ol.idx; loadLessonStep(); }
  }
  function loadLessonStep() {
    trackOpenLesson();
    const st = pz.steps[pz.idx];
    const it = { theme: st.theme || pz.lesson.theme, level: 1, fen: st.fen, line: st.line, alts: st.alts };
    Object.assign(pz, { item: it, step: 0, failed: false, done: !st.line, locked: false });
    if (st.fen) setPosition(st.fen);
    else if (!game) setPosition('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    selected = -1; hint = null;
    marks = st.marks ? st.marks.map((s) => window.Chess.sqIndex(s)) : null;
    $('puzzle-title').textContent = pz.lesson.title;
    $('pz-count').textContent = L(`Étape ${pz.idx + 1} / ${pz.steps.length}`, `Step ${pz.idx + 1} / ${pz.steps.length}`);
    say(st.line ? st.text : `${st.text} ${lessonCue()}`);
    setPzStatus('', st.line ? L('À toi de jouer', 'Your move') : '');
    renderBoard();
    pzButtons();
  }
  function nextLessonStep() {
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

  // Profil d'une partie contre l'ordinateur, de 0 à 1 sur chaque axe de style
  function gameStyle(g) {
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
  const styleGames = () => store.get('archive', []).filter((g) => !g.fen && g.color && g.moves && g.moves.length >= 12).slice(-20);
  // Style du joueur : moyenne de ses dernières parties archivées
  function playerStyle() {
    const games = styleGames();
    if (!games.length) return null;
    const avg = { games: games.length };
    const all = games.map(gameStyle);
    for (const k of Object.keys(STYLE_AXES)) avg[k] = all.reduce((sum, v) => sum + v[k], 0) / all.length;
    return avg;
  }
  // Nom d'un style ; une partie riche en fautes relevées par l'analyse est jugée impulsive
  function styleLabel(v, errors) {
    const impulsive = errors >= 2;
    if (v.attaque >= 0.6) return impulsive ? L('Attaquant impulsif', 'Impulsive attacker') : L('Joueur agressif', 'Aggressive player');
    if (v.tactique >= 0.6) return impulsive ? L('Chasseur de matériel', 'Material hunter') : L('Tacticien opportuniste', 'Opportunistic tactician');
    if (v.finale >= 0.6 && v.positionnel >= 0.5) return L('Joueur positionnel patient', 'Patient positional player');
    if (v.positionnel >= 0.6) return impulsive ? L('Bâtisseur pressé', 'Hasty builder') : L('Stratège solide', 'Solid strategist');
    if (v.defense >= 0.6) return L('Défenseur tenace', 'Stubborn defender');
    if (v.finale >= 0.6) return L('Finisseur méthodique', 'Methodical finisher');
    return impulsive ? L('Joueur spontané', 'Spontaneous player') : L('Joueur polyvalent', 'All-round player');
  }
  // Style qui revient le plus souvent dans les parties jouées contre l'ordinateur (à égalité, le plus récent)
  function dominantStyle() {
    const games = styleGames();
    if (!games.length) return null;
    const mistakes = store.get('mistakes', []);
    const count = new Map();
    games.forEach((g, i) => {
      const label = styleLabel(gameStyle(g), mistakes.filter((m) => m.date === g.id).length);
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
    let pool = BANK.filter((p) => p.theme === theme && !used.has(p.id));
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
      return {
        text: L(`Retour sur ta partie du ${fmtDate(m.date)}. Au coup ${m.move}, tu as joué ${m.played}. Souviens-toi : ${pr.title.toLowerCase()}. Joue ce coup comme je l'aurais joué.`, `Back to your game of ${fmtDate(m.date)}. On move ${m.move}, you played ${m.played}. Remember: ${pr.title.toLowerCase()}. Play this move as I would have.`),
        fen: m.fen, line: m.line, alts: m.alts, mistake: m.id, theme: m.theme,
        why: L(`Voilà mon coup. La prochaine fois que cette situation se présente, pense à : ${pr.title.toLowerCase()}.`, `That's my move. Next time this situation comes up, think: ${pr.title.toLowerCase()}.`),
      };
    }
    // Sans faute sur ces thèmes : la position de ta dernière partie où la situation-clé du champion est apparue
    const finaleChamp = ch.style.finale >= 0.8;
    for (const g of store.get('archive', []).slice().reverse()) {
      if (g.fen || !g.color || !g.moves || g.moves.length < 16) continue;
      const G = new Game();
      for (let i = 0; i < g.moves.length; i++) {
        if (!G.playUci(g.moves[i])) break;
        if ((finaleChamp ? isEndgameBoard(G.state.board) : i >= 15) && G.turn === g.color) {
          return { text: L(`Retour sur ta partie du ${fmtDate(g.id)}, au coup ${Math.floor(i / 2) + 1}. ${finaleChamp ? ch.tips.finale : ch.tips.milieu} Observe la position et cherche mon plan.`, `Back to your game of ${fmtDate(g.id)}, move ${Math.floor(i / 2) + 1}. ${finaleChamp ? ch.tips.finale : ch.tips.milieu} Study the position and look for my plan.`), fen: window.Chess.toFen(G.state) };
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
      const it = championPuzzle(p.theme, used, p.piece);
      if (it) {
        used.add(it.id);
        steps.push({ text: L(`À toi, joue comme moi : ${lc(p.task)}`, `Your turn, play like me: ${lc(p.task)}`), fen: it.fen, line: it.line, alts: it.alts, theme: p.theme, why: L(`Bravo ! C'est exactement mon idée : ${p.title.toLowerCase()}.`, `Well done! That's exactly my idea: ${p.title.toLowerCase()}.`) });
      }
    });
    const mine = championPersonalStep(ch);
    if (mine) steps.push(mine);
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
      <p class="level-help">${L('Choisis une pièce puis touche les cases pour la poser. Avec la main, touche une pièce puis sa nouvelle case pour la déplacer.', 'Pick a piece, then tap squares to place it. With the hand, tap a piece and then its new square to move it.')}</p>
      <div class="ed-palette">${tool('move', '✋', L('Déplacer', 'Move'))}${ED_PIECES.slice(0, 6).map((p) => tool(p, `<span class="pc w">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
      <div class="ed-palette">${tool('erase', '⌫', L('Effacer', 'Erase'))}${ED_PIECES.slice(6).map((p) => tool(p, `<span class="pc b">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
      <div class="ed-board-wrap"><div id="ed-board" class="ed-board" role="grid" aria-label="${L('Échiquier à construire', 'Board to set up')}"></div></div>
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
      <p class="level-help">${L('Une partie jouée depuis une position libre ne compte pas pour ton Elo ni pour débloquer les niveaux.', 'A game played from a custom position does not count for your Elo or for unlocking levels.')}</p>`;
    renderEdBoard();
  }
  function renderEdBoard() {
    const el = $('ed-board'); if (!el) return;
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = ed.flip ? 63 - i : i, p = ed.board[sq], row = i >> 3, col = i & 7;
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      html += `<button type="button" class="sq ${dark ? 'd' : 'l'}${sq === ed.from ? ' sel' : ''}" data-sq="${sq}" aria-label="${sqName(sq)}${p ? ' ' + pieceName(p) : ''}">`
        + (row === 7 ? `<span class="coord f">${sqName(sq)[0]}</span>` : '') + (col === 0 ? `<span class="coord r">${sqName(sq)[1]}</span>` : '')
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
  const TC_LABELS = L({ unlim: '7 jours par coup', '7d': '7 jours par coup', '3d': '3 jours par coup', '1d': '1 jour par coup', pm60: '1 minute par coup', pm30: '30 secondes par coup', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' },
    { unlim: '7 days per move', '7d': '7 days per move', '3d': '3 days per move', '1d': '1 day per move', pm60: '1 minute per move', pm30: '30 seconds per move', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' });
  const announced = new Set();
  let justSignedUp = false, progressDirty = false, inviteStop = null, gamesStop = null, onlineInvites = { in: [], out: [] }, onlineGames = [];
  const SKIP_SYNC = new Set(['lastScreen', 'onlineSession', 'onlineSynced']);
  // toute modification de la progression sera envoyée au compte
  const rawSet = store.set.bind(store);
  store.set = (key, value) => { rawSet(key, value); if (!SKIP_SYNC.has(key)) progressDirty = true; };
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
    if (!ON || !ON.user || !progressDirty) return;
    progressDirty = false;
    try { await ON.saveProgress(localProgress()); } catch { progressDirty = true; }
  }
  setInterval(pushProgress, 45000);
  setInterval(() => { if (ON && ON.user && document.visibilityState === 'visible') ON.presence(); }, 60000);
  window.addEventListener('pagehide', pushProgress);
  // Après connexion : récupère la progression du compte, ou propose d'importer celle de l'appareil
  async function syncAfterLogin(user, profile) {
    const local = localProgress();
    let cloud = null;
    try { cloud = await ON.loadProgress(); } catch { cloud = null; }
    const synced = store.get('onlineSynced', null) === user.uid;
    const name = profile && profile.pseudo;
    if (name) { const p = playerProfile(); p.name = name; p.nameAsked = true; store.set('player', p); }
    if (synced && cloud) { refreshHome(); return; }
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
      syncAfterLogin(user, profile);
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
    } else { onlineInvites = { in: [], out: [] }; onlineGames = []; updateOnlineBadge(); }
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
  function updateOnlineBadge() {
    const myTurn = onlineGames.filter((g) => g.status === 'active' && ((g.moves.length % 2 === 0) === (g.white === (ON.user && ON.user.uid)))).length;
    const n = onlineInvites.in.length + myTurn;
    $('online-badge').hidden = !n; $('online-badge').textContent = n;
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
          <p class="level-help">${L('Ton profil, ton pseudo, ta progression en ligne et tes invitations seront effacés définitivement. Les parties déjà jouées restent dans l’historique de tes adversaires. La progression enregistrée sur cet appareil est conservée.', 'Your profile, nickname, online progress and invitations will be erased for good. Games already played stay in your opponents’ history. Progress saved on this device is kept.')}</p>
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
      if (accountMode === 'signup') accountAction(async () => { justSignedUp = true; await ON.signUp(v('acc-pseudo'), v('acc-email'), v('acc-pw'), estimatedElo()); }, L('Compte créé, bienvenue !', 'Account created, welcome!'));
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
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => accountAction(async () => { await ON.deleteAccount(pw); rawSet('onlineSynced', null); }, L('Ton compte a été supprimé.', 'Your account has been deleted.')) },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (t.id === 'acc-logout') accountAction(async () => { await pushProgress(); await ON.signOut(); rawSet('onlineSynced', null); }, L('Déconnecté.', 'Signed out.'));
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
    const tcOptions = Object.keys(TC_LABELS).filter((k) => k !== 'unlim').map((k) => `<option value="${k}"${k === store.get('onlineTc', '10m') ? ' selected' : ''}>${TC_LABELS[k]}</option>`).join('');
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
  const TC_GROUPS = { clock: ['10m', '5m', '2m', '1m'], move: ['pm30', 'pm60', '1d', '3d', '7d'] };
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
    if (!u) { body.innerHTML = `<p class="level-help">${L('Les tournois se jouent en ligne : connecte-toi ou crée un compte.', 'Tournaments are played online: sign in or create an account.')}</p><button id="tour-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>`; return; }
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
      body.innerHTML = `<div class="tour-menu">${SECTIONS.map(([id, icon, label, n]) => `<button class="btn tour-menu-btn" type="button" data-tour-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}</b>${n != null ? `<span class="tour-menu-count">${n}</span>` : ''}</button>`).join('')}</div>`;
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
    if (t.dataset.tourSection != null) { tourSection = t.dataset.tourSection || null; renderTournaments(); $('tour-body').scrollTop = 0; return; }
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
    ON.load().then(() => {
      if (ON.user && !tourListStop) tourListStop = ON.watchTournaments((all) => {
        tourList = all;
        for (const t of all.mine) if (t.status === 'open' && t.deadline && Date.now() > t.deadline && !autoStarted.has(t.id)) { autoStarted.add(t.id); ON.startTournament(t.id, true).catch(() => {}); }
        if (document.body.dataset.screen === 'tournaments' && !tourDoc) renderTournaments();
      });
      renderTournaments();
    }).catch(() => {});
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
    let html = `<div class="profile-head">${who.photo ? `<img class="profile-photo big${fr}" src="${who.photo}" alt="">` : `<span class="profile-photo big placeholder${fr}">♞</span>`}<div><b>${escHtml(who.name)}</b>${s.title ? `<em class="player-title">« ${escHtml(s.title)} »</em>` : ''}<span>${s.level ? `${L('Niveau', 'Level')} ${s.level} · ` : ''}Elo ${L('estimé', 'est.')} ${s.elo}</span>${won.length ? `<span class="profile-badges-line">${won.slice(-6).map((b) => b.icon).join(' ')}</span>` : ''}</div></div>`;
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
      body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🌾 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
      body.querySelector('.profile-shop').onclick = openShop;
      if (ON && ON.user) {
        try { tours = await ON.myTournaments(); } catch { tours = []; }
        payBadges(localSummary(tours));
        const s = localSummary(tours);
        body.innerHTML = profileHtml(s, { name: p.name || L('Joueur', 'Player'), photo: p.photo });
        body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🌾 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
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
      body.innerHTML = profileHtml({ ...s, elo: u.elo || s.elo }, { name: u.pseudo, photo: u.photo }) + (u.summary ? '' : `<p class="level-help">${L('Ce joueur n\'a pas encore publié ses statistiques.', 'This player has not published their statistics yet.')}</p>`);
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
  /* ---------- Récompenses : grains de blé 🌾, niveau du joueur, quêtes du jour, boutique de Sissa ---------- */
  const xpFor = (lvl) => 100 + 40 * (lvl - 1); // expérience pour passer du niveau lvl au suivant
  function walletState() { return Object.assign({ wheat: 0, xp: 0, owned: [], frame: null, title: null, firstWin: '', badgesPaid: [] }, store.get('wallet', {})); }
  function levelOf(xp) { let l = 1; while (l < 50 && xp >= xpFor(l)) { xp -= xpFor(l); l++; } return { level: l, into: xp, need: xpFor(l) }; }
  function rewardPop(text, big) {
    let box = document.querySelector('.reward-pops');
    if (!box) { box = document.createElement('div'); box.className = 'reward-pops'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'reward-pop' + (big ? ' big' : ''); el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), big ? 4200 : 3000);
  }
  function reward(wheat, xp, why) {
    const w = walletState(), before = levelOf(w.xp).level;
    w.wheat += wheat; w.xp += xp;
    const after = levelOf(w.xp).level;
    if (after > before) w.wheat += 50 * (after - before);
    store.set('wallet', w);
    rewardPop(`${why ? `${why} · ` : ''}+${wheat} 🌾 · +${xp} XP`);
    if (after > before) { rewardPop(L(`Niveau ${after} atteint ! +${50 * (after - before)} 🌾`, `Level ${after} reached! +${50 * (after - before)} 🌾`), true); sounds.win(); }
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
    } else store.set('quests', q);
  }
  // Gains par mode
  function gameReward(outcome, level, mate) {
    const w = walletState(), day = questState().day;
    questEvent('play_ai');
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
  }
  function lessonReward(key) {
    const first = !trainDone()[key];
    reward(first ? 25 : 5, first ? 40 : 10, L('Leçon terminée', 'Lesson finished'));
    questEvent('lesson');
  }
  // Boutique de Sissa : objets uniquement visuels, achetés avec le blé gagné
  function shopItems() {
    const out = [];
    for (const [k, th] of Object.entries(THEMES)) if (th.price) out.push({ id: `theme:${k}`, kind: 'theme', key: k, name: th.name, price: th.price, preview: `<span class="shop-board"><i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i></span>` });
    [['bronze', L('Cadre de bronze', 'Bronze frame'), 100], ['argent', L('Cadre d\'argent', 'Silver frame'), 250], ['or', L('Cadre d\'or', 'Gold frame'), 500], ['feu', L('Cadre de feu', 'Fire frame'), 800]]
      .forEach(([k, name, price]) => out.push({ id: `frame:${k}`, kind: 'frame', key: k, name, price, preview: `<span class="profile-photo shop-frame frame-${k}">♞</span>` }));
    [['ecuyer', L('Écuyer', 'Squire'), 80, 1], ['chevalier', L('Chevalier', 'Knight'), 200, 5], ['seigneur', L('Seigneur', 'Lord'), 400, 10], ['vizir', L('Grand vizir', 'Grand vizier'), 700, 20], ['roi', L('Roi du blé', 'King of wheat'), 1200, 30]]
      .forEach(([k, name, price, lvl]) => out.push({ id: `title:${k}`, kind: 'title', key: k, name, price, lvl, preview: `<span class="shop-title">« ${name} »</span>` }));
    return out;
  }
  const owns = (id) => { const it = id.startsWith('theme:') ? THEMES[id.slice(6)] : null; return (it && !it.price) || walletState().owned.includes(id); };
  const titleName = (k) => { const it = shopItems().find((x) => x.id === `title:${k}`); return it ? it.name : ''; };
  function renderHomeRewards() {
    const w = walletState(), lv = levelOf(w.xp), q = questState();
    const done = q.ids.filter((id) => q.claimed[id]).length;
    $('home-rewards').innerHTML = `<span class="lvl-badge">${L('Niv.', 'Lvl')} ${lv.level}</span><span class="xp-bar"><i style="width:${Math.round((100 * lv.into) / lv.need)}%"></i></span><span>🌾 ${w.wheat}</span><span>${L('Quêtes', 'Quests')} ${done}/3</span>`;
    $('home-player-photo').className = 'profile-photo' + (w.frame ? ` frame-${w.frame}` : '');
    $('home-player-title').hidden = !w.title; $('home-player-title').textContent = w.title ? `« ${titleName(w.title)} »` : '';
  }
  function renderShop() {
    const w = walletState(), lv = levelOf(w.xp), q = questState(), defs = questList();
    let html = `<div class="shop-head"><span class="lvl-badge big">${L('Niveau', 'Level')} ${lv.level}</span><div class="shop-xp"><span class="xp-bar"><i style="width:${Math.round((100 * lv.into) / lv.need)}%"></i></span><small>${lv.level >= 50 ? L('Niveau maximum', 'Max level') : `${lv.into} / ${lv.need} XP`}</small></div><span class="shop-wheat">🌾 ${w.wheat}</span></div>`;
    html += `<p class="level-help">${L('Gagne du blé et de l\'expérience dans tous les modes : parties, problèmes, leçons, défi du jour, parties en ligne et tournois. Chaque niveau gagné rapporte 50 🌾.', 'Earn wheat and experience in every mode: games, puzzles, lessons, daily challenge, online games and tournaments. Each level gained gives 50 🌾.')}</p>`;
    html += `<h3 class="train-h">${L('Quêtes du jour', 'Daily quests')}</h3><div class="quest-list">${q.ids.map((id) => { const d = defs.find((x) => x.id === id); const p = Math.min(d.goal, q.prog[id] || 0); return `<div class="quest${q.claimed[id] ? ' done' : ''}"><span>${q.claimed[id] ? '✅' : '🎯'} ${d.text}</span><b>${p}/${d.goal} · 30 🌾</b></div>`; }).join('')}<div class="quest${q.chest ? ' done' : ''}"><span>${q.chest ? '✅' : '🎁'} ${L('Coffre : finir les trois quêtes', 'Chest: finish all three quests')}</span><b>60 🌾</b></div></div>`;
    const section = (kind, title) => {
      const items = shopItems().filter((x) => x.kind === kind);
      return `<h3 class="train-h">${title}</h3><div class="shop-grid">${items.map((it) => {
        const have = owns(it.id), used = (kind === 'frame' && w.frame === it.key) || (kind === 'title' && w.title === it.key) || (kind === 'theme' && settings.theme === it.key);
        const locked = it.lvl && lv.level < it.lvl;
        const btn = used ? `<button class="btn" data-shop-off="${it.id}">${kind === 'theme' ? L('Utilisé', 'In use') : L('Retirer', 'Remove')}</button>`
          : have ? `<button class="btn primary" data-shop-use="${it.id}">${L('Utiliser', 'Use')}</button>`
          : locked ? `<button class="btn" disabled>${L(`Niveau ${it.lvl}`, `Level ${it.lvl}`)}</button>`
          : `<button class="btn${w.wheat >= it.price ? ' primary' : ''}" data-shop-buy="${it.id}" ${w.wheat >= it.price ? '' : 'disabled'}>${it.price} 🌾</button>`;
        return `<div class="shop-item${used ? ' on' : ''}">${it.preview}<b>${it.name}</b>${btn}</div>`;
      }).join('')}</div>`;
    };
    html += section('theme', L('Plateaux', 'Boards')) + section('frame', L('Cadres de photo', 'Photo frames')) + section('title', L('Titres', 'Titles'));
    $('shop-body').innerHTML = html;
  }
  function openShop() {
    returnTo = document.body.dataset.screen && document.body.dataset.screen !== 'shop' ? document.body.dataset.screen : 'home';
    show('shop'); renderShop();
  }
  $('shop-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-shop-buy],[data-shop-use],[data-shop-off]'); if (!b) return;
    const w = walletState();
    const id = b.dataset.shopBuy || b.dataset.shopUse || b.dataset.shopOff, it = shopItems().find((x) => x.id === id);
    if (b.dataset.shopBuy) {
      if (w.wheat < it.price || owns(id)) return;
      w.wheat -= it.price; w.owned.push(id); store.set('wallet', w);
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
      <button type="button" class="btn replay-item" data-profile="${p.uid}"><strong><i class="on-dot${isConnected(p) ? ' on' : ''}"></i>${escHtml(p.pseudo || '?')} (${p.elo})${p.summary && p.summary.title ? ` <em class="player-title">« ${escHtml(p.summary.title)} »</em>` : ''}</strong><span>${p.summary && p.summary.level ? `${L('Niveau', 'Level')} ${p.summary.level} · ` : ''}${lastSeenLabel(p)}${muted ? L(' · chat coupé', ' · chat muted') : ''}</span></button>
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
    onlineGame = g;
    onChatUpdate(g);
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
  const TR = window.TRAINER || { MATES: [], ENDGAMES: [], OPENINGS: [], FAMOUS: [] };
  const DAY = 86400000;
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
    pz = { kind: 'lesson', lesson: { theme: 'mat', ...lesson, back: 'train', noRating: true, onDone }, steps, idx: 0, misses: 0 };
    enterPuzzleMode();
    loadLessonStep();
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
    const steps = e.steps.map((text) => ({ text, fen: e.fen }));
    steps.push({ text: e.goal === 'draw'
      ? L(`À toi : tu joues les ${sideName(e.color)} contre l'ordinateur au plus haut niveau. Obtiens la nulle. Appuie sur « Terminer » pour commencer.`, `Your turn: you play ${sideName(e.color)} against the computer at its highest level. Get the draw. Press "Finish" to start.`)
      : L(`À toi : tu joues les ${sideName(e.color)} contre l'ordinateur au plus haut niveau. Donne le mat. Appuie sur « Terminer » pour commencer.`, `Your turn: you play ${sideName(e.color)} against the computer at its highest level. Deliver mate. Press "Finish" to start.`), fen: e.fen });
    startTrainer({ title: e.name, theme: 'finale', resume: `end:${e.id}` }, steps, () => startGame({ mode: 'ai', playerColor: e.color, level: MAX_GAME_LEVEL, fen: e.fen, drill: e.id }, [], null, e.color === 'b'));
  }
  // Ouvertures : révision espacée (1, 3, 7, 14 puis 30 jours) ; une erreur la fait revenir vite
  const OPEN_GAPS = [1, 3, 7, 14, 30];
  const openingsSR = () => store.get('openingsSR', {});
  function startOpening(o) {
    const pre = o.color === 'b' ? o.san.slice(0, 1) : [];
    const x = trainLine(null, pre, o.san.slice(pre.length));
    if (!x) return;
    let moves = '';
    o.san.forEach((s, i) => { moves += (i % 2 ? '' : `${i / 2 + 1}. `) + s + ' '; });
    const steps = [
      { text: `${o.name}. ${o.text} ${L('Les coups à retenir', 'The moves to remember')} : ${moves.trim()}.`, fen: window.Chess.START_FEN },
      { text: L(`Rejoue de mémoire les coups des ${sideName(o.color)}. Les réponses adverses se jouent seules.`, `Replay ${sideName(o.color)}'s moves from memory. The opponent's replies are played for you.`), fen: x.fen, line: x.line, theme: 'tactique',
        why: L('Ouverture rejouée en entier !', 'Opening replayed in full!'),
        wrong: L(`Ce n'est pas le coup de la ${o.name.toLowerCase()}. Réessaie, ou demande un indice.`, `That is not the ${o.name} move. Try again, or ask for a hint.`) },
    ];
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
    if (d.day !== todayKey()) { d.day = todayKey(); d.res = {}; d.finished = false; }
    return d;
  }
  function startDaily(i) {
    const list = dailyPuzzles(), p = list[i], d = dailyState();
    if (!p) return;
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
      const okCount = [0, 1, 2].filter((k) => st.res[k] === 'ok').length;
      if (okCount === 3 && !st.finished) {
        // la série avance quand les trois problèmes du jour sont trouvés du premier coup (au besoin en les refaisant)
        const yesterday = todayKey(new Date(Date.now() - DAY));
        st.streak = st.last === yesterday ? (st.streak || 0) + 1 : 1;
        st.best = Math.max(st.best || 0, st.streak); st.last = todayKey(); st.finished = true;
        toast(L(`Défi du jour réussi ! Série : ${st.streak} jour${st.streak > 1 ? 's' : ''}.`, `Daily challenge complete! Streak: ${st.streak} day${st.streak === 1 ? '' : 's'}.`));
        setTimeout(() => { reward(40 + 5 * Math.min(st.streak, 10), 50, L('Défi du jour', 'Daily challenge')); questEvent('daily'); }, 50);
      } else if (!clean) toast(L('Pas du premier coup : ce problème te sera reproposé aujourd\'hui.', 'Not at the first try: this puzzle will come back today.'));
      else toast(L(`Bravo ! ${okCount} sur 3 aujourd'hui.`, `Well done! ${okCount} out of 3 today.`));
      store.set('daily', st);
      leavePuzzle();
    });
  }
  let trainSection = 'daily';
  const TRAIN_TITLES = L({ daily: 'Défi du jour', mates: 'Les mats', endgames: 'Finales de base', openings: 'Ouvertures', famous: 'Devine le coup' },
    { daily: 'Daily challenge', mates: 'Checkmates', endgames: 'Basic endgames', openings: 'Openings', famous: 'Guess the move' });
  const TRAIN_HELP = L({
    daily: 'Trois problèmes par jour. Ceux que tu ne trouves pas du premier coup te sont reproposés dans la journée. Réussis les trois pour prolonger ta série.',
    mates: 'Choisis le mat que tu veux apprendre : Maître Sissa te le montre, puis tu le trouves toi-même.',
    endgames: 'Apprends la méthode, puis joue la position contre l\'ordinateur au plus haut niveau.',
    openings: 'Découvre les coups d\'une ouverture, puis rejoue-les de mémoire. Elles reviennent à réviser au bon moment.',
    famous: 'Prends la place d\'un champion dans sa partie la plus célèbre et devine ses coups.',
  }, {
    daily: 'Three puzzles a day. The ones you miss at the first try come back later the same day. Solve all three to extend your streak.',
    mates: 'Choose the mate you want to learn: Master Sissa shows it to you, then you find it yourself.',
    endgames: 'Learn the method, then play the position against the computer at its highest level.',
    openings: 'Discover the moves of an opening, then replay them from memory. They come back for review at the right time.',
    famous: 'Take a champion\'s place in their most famous game and guess their moves.',
  });
  function renderTrain(section = trainSection) {
    trainSection = section;
    $('train-title').textContent = TRAIN_TITLES[section];
    const done = trainDone(), sr = openingsSR(), d = dailyState(), now = Date.now();
    const item = (key, title, sub, extra = '') => `<button type="button" class="btn replay-item" data-train="${key}"><strong>${escHtml(title)}${extra}</strong><span>${escHtml(sub)}</span></button>`;
    const ok = ' ✓';
    let html = `<p class="level-help">${TRAIN_HELP[section]}</p>`;
    if (section === 'daily') {
      const label = { ok: L('trouvé du premier coup', 'found at the first try'), retry: L('à refaire', 'to try again') };
      html += `<p class="level-help">${L(`Série en cours : ${d.streak || 0} jour${(d.streak || 0) > 1 ? 's' : ''} · record : ${d.best || 0}`, `Current streak: ${d.streak || 0} day${(d.streak || 0) === 1 ? '' : 's'} · best: ${d.best || 0}`)}</p>`;
      // les problèmes ratés sont reproposés en premier
      const order = [0, 1, 2].sort((x, y) => (d.res[y] === 'retry') - (d.res[x] === 'retry'));
      html += `<div class="replay-items">${order.map((k) => item(`daily:${k}`, L(`Problème ${k + 1}`, `Puzzle ${k + 1}`) + (d.res[k] === 'retry' ? L(' · à refaire', ' · try again') : ''), d.res[k] ? label[d.res[k]] : L('à faire', 'to do'), d.res[k] === 'ok' ? ok : '')).join('')}</div>`;
    }
    if (section === 'mates') html += `<div class="replay-items">${TR.MATES.map((m) => item(`mate:${m.id}`, m.name, m.text.split('.')[0] + '.', done[`mate:${m.id}`] ? ok : '')).join('')}</div>`;
    if (section === 'endgames') html += `<div class="replay-items">${TR.ENDGAMES.map((e) => item(`end:${e.id}`, e.name, e.goal === 'draw' ? L('Défends et obtiens la nulle contre l\'ordinateur', 'Defend and draw against the computer') : L('Donne le mat contre l\'ordinateur', 'Deliver mate against the computer'), done[`end:${e.id}`] ? ok : '')).join('')}</div>`;
    if (section === 'openings') html += `<div class="replay-items">${TR.OPENINGS.map((o) => {
      const r = sr[o.id], due = r && r.due <= now;
      const sub = `${L('Avec les', 'With')} ${sideName(o.color)} · ${!r ? L('nouvelle', 'new') : due ? L('à réviser', 'to review') : L(`révision dans ${Math.max(1, Math.round((r.due - now) / DAY))} j`, `review in ${Math.max(1, Math.round((r.due - now) / DAY))} d`)}`;
      return item(`open:${o.id}`, o.name, sub, r && r.stage && !due ? ok : '');
    }).join('')}</div>`;
    if (section === 'famous') html += `<div class="replay-items">${TR.FAMOUS.map((f) => item(`famous:${f.id}`, f.name, `${f.players}${done[`famous:${f.id}`] != null ? L(` · record : ${done[`famous:${f.id}`]} coups trouvés`, ` · best: ${done[`famous:${f.id}`]} moves found`) : ''}`)).join('')}</div>`;
    $('train-body').innerHTML = html;
  }
  $('train-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-train]'); if (!b) return;
    const [kind, id] = b.dataset.train.split(':');
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
      card('♟️', who, `${c.fen ? L('Position libre · ', 'Custom position · ') : ''}${n} ${L('coup', 'move')}${n > 1 ? 's' : ''} ${L('joués', 'played')}`, 'game', true);
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
    return out;
  }

  /* ---------- Analyse de partie, export PGN, lien de partage, bilan ---------- */
  const REVIEW_LABELS = L({ best: 'Meilleur coup', good: 'Bon coup', inaccuracy: 'Imprécision', mistake: 'Erreur', blunder: 'Gaffe' }, { best: 'Best move', good: 'Good move', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' });
  const REVIEW_SIGN = { best: '', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' };
  const isSevere = (mark) => !!mark && (mark[0] === 'mistake' || mark[0] === 'blunder');
  const reviewKey = (fen, moves) => `${fen}|${moves.join(' ')}`;
  const loadReview = (k) => { const hit = store.get('reviews', []).find((x) => x.k === k); return hit ? hit.r : null; };
  const reviewJobs = new Map();
  let reviewing = false;

  // Une seule analyse par partie à la fois ; les demandes simultanées partagent le même calcul
  function requestReview(fen, moves, onProgress) {
    const k = reviewKey(fen, moves), cached = loadReview(k);
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
    $('rp-review').hidden = !rv;
    if (!reviewing) {
      const btn = $('rp-analyse');
      btn.disabled = false;
      btn.textContent = !replay.review ? L('📈 Analyser', '📈 Analyse') : replay.showReview ? L('📈 Masquer', '📈 Hide') : L('📈 Analyse', '📈 Analysis');
    }
    if (!rv) return;
    const n = rv.ev.length, X = (i) => (n > 1 ? (i / (n - 1)) * 200 : 0), Y = (e) => 32 - Math.tanh(e / 400) * 30;
    const pts = rv.ev.map((e, i) => `${X(i).toFixed(1)},${Y(e).toFixed(1)}`).join(' L');
    let svg = `<path class="g-area" d="M0,64 L${pts} L${X(n - 1).toFixed(1)},64 Z"/><line class="g-mid" x1="0" x2="200" y1="32" y2="32"/>`;
    rv.marks.forEach((m, i) => { if (isSevere(m)) svg += `<line class="g-bad" x1="${X(i + 1).toFixed(1)}" x2="${X(i + 1).toFixed(1)}" y1="54" y2="64"/>`; });
    svg += `<line class="g-cur" x1="${X(cur).toFixed(1)}" x2="${X(cur).toFixed(1)}" y1="0" y2="64"/>`;
    $('rp-graph').innerHTML = svg;
    const who = rv.accuracy;
    $('rp-acc').innerHTML = `${rv.opening ? `<b>${escHtml(rv.opening)}</b><br>` : ''}${L('Précision : Blancs', 'Accuracy: White')} ${who.w == null ? '–' : who.w + ' %'} · ${L('Noirs', 'Black')} ${who.b == null ? '–' : who.b + ' %'}`;
    const mark = rv.marks[cur - 1];
    let text = L(`Position de départ · évaluation ${fmtEval(rv.ev[0] || 0)}`, `Starting position · evaluation ${fmtEval(rv.ev[0] || 0)}`);
    if (mark) {
      text = `<b>${escHtml(replay.sans[cur - 1])}${REVIEW_SIGN[mark[0]]}</b> — ${REVIEW_LABELS[mark[0]]} · ${L('évaluation', 'evaluation')} ${fmtEval(rv.ev[cur])}`;
      if (['inaccuracy', 'mistake', 'blunder'].includes(mark[0])) {
        text += `<br>${L('Meilleur coup :', 'Best move:')} <b>${escHtml(sanOfBest(replay.fen, replay.moves, cur - 1, mark[2]))}</b> (${L('perte', 'loss')} ≈ ${NUM(mark[1] / 100)})`;
      }
    }
    $('rp-comment').innerHTML = text;
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
  const jumpToSevere = (dir) => {
    if (!replay || !replay.review) return;
    for (let p = replay.index + dir; p >= 1 && p <= replay.moves.length; p += dir) if (isSevere(replay.review.marks[p - 1])) return navigate(p);
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
    cancelAi(); stopReplayPlay();
    pz = null; marks = null;
    attachBoard('game');
    const fen = entry.fen || window.Chess.START_FEN;
    const probe = new Game(fen), sans = [];
    for (const u of entry.moves || []) { const r = probe.playUci(u); if (!r) break; sans.push(r.san); }
    replay = { moves: (entry.moves || []).slice(0, sans.length), sans, fen, index: 0, title: entry.title || L('Partie', 'Game'), result: entry.result || '*', back, white: entry.white, black: entry.black, event: entry.event, date: entry.date };
    replay.review = loadReview(reviewKey(fen, replay.moves));
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
  function gotoPly(n, animate = false) {
    if (!replay) return;
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
        const bad = mark && BAD.includes(mark[0]);
        const cls = [ply === cur ? 'cur' : '', bad ? `q-${mark[0]}` : ''].filter(Boolean).join(' ');
        return `<span data-ply="${ply}"${cls ? ` class="${cls}"` : ''}>${escHtml(sans[ply - 1])}${bad ? REVIEW_SIGN[mark[0]] : ''}</span>`;
      };
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i)} ${cell(i + 1)}`;
      ol.appendChild(li);
    }
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
    const back = replay && replay.back;
    stopReplayPlay();
    replay = null; game = null;
    setReplayUi(false);
    if (back) back(); else show('home');
  }
  $('rp-flip').onclick = () => { flipped = !flipped; render(); };
  const navigate = (n, animate = false) => {
    if (!replay || animBusy()) return;
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
      replayTimer = setTimeout(tick, Math.max(2200, busy + 700));
    };
    replayTimer = setTimeout(tick, 600);
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
      const parsed = parsePgn(src);
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

  const savedGame = store.get('game', null);
  const savedScreen = store.get('lastScreen', null);
  const restorableScreens = ['home', 'program', 'champions', 'setup', 'game', 'settings', 'problems', 'stats', 'rules', 'about'];
  // à chaque ouverture : l'écran « Reprendre » avec tout ce qui est en cours
  const initialScreen = 'welcome';
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
