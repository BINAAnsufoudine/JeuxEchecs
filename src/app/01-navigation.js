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

