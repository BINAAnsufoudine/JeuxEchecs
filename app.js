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
  const TIERS = ['Débutant', 'Facile', 'Intermédiaire', 'Difficile', 'Expert', 'Maître', 'Grand maître', 'Champion'];
  const MAX_GAME_LEVEL = 22;
  const LEVEL_NAMES = {};
  for (let l = 1; l <= MAX_GAME_LEVEL; l++) LEVEL_NAMES[l] = l === MAX_GAME_LEVEL ? 'Champion' : `${TIERS[Math.floor((l - 1) / 3)]} ${((l - 1) % 3) + 1}`;
  // Elo de chaque niveau, repris de l'application d'origine (Débutant 1-2, Intermédiaire 2 et Grand maître 1/3 interpolés)
  const LEVEL_ELO = [0, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2500, 2600, 2700, 2725, 2750, 2775, 2800];
  const THEMES = {
    foret: { name: 'Forêt', light: '#e8dcc0', dark: '#6f8f6a' },
    noyer: { name: 'Noyer', light: '#ecd8b8', dark: '#a0704b' },
    ardoise: { name: 'Ardoise', light: '#dfe3e8', dark: '#6d7f95' },
    corail: { name: 'Corail', light: '#f3e3d3', dark: '#c9775f' },
  };
  const REASONS = {
    mat: 'Échec et mat', pat: 'Pat', materiel: 'Matériel insuffisant',
    '50coups': 'Règle des 50 coups', repetition: 'Triple répétition', abandon: 'Abandon', import: 'Partie importée',
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
  const TERRAIN_NAMES = { forest: 'Forêt', desert: 'Désert', prairie: 'Prairie verte', steppe: 'Plaine sèche', mud: 'Terrain boueux', rock: 'Terrain rocheux', water: 'Flaques d’eau', beach: 'Plage tropicale' };
  const WEATHER_IDS = ['sun', 'cloudy', 'drizzle', 'heavy', 'storm'];
  const WEATHER_NAMES = { sun: 'Soleil', cloudy: 'Ciel nuageux', drizzle: 'Pluie fine', heavy: 'Grosse pluie', storm: 'Orage et éclairs' };
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
    }
    if (id === 'home') refreshHome();
    if (id === 'program') renderCoachProgram();
    if (id === 'stats') renderStats();
    if (id === 'problems') renderProblems();
    if (id === 'champions') renderChampions();
    updateCoachDockForScreen(id);
    if (desktopShell) document.getElementById(id)?.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }
  let returnTo = 'home';
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => show(returnTo)));

  function refreshHome() {
    const saved = store.get('game', null);
    $('btn-continue').disabled = !(saved && !saved.result);
    const player = playerProfile();
    $('home-player-name').textContent = player.name || 'Joueur';
    $('home-player-elo').textContent = `Elo estimé : ${estimatedElo()}`;
    const style = dominantStyle();
    $('home-player-style').hidden = !style;
    if (style) {
      $('home-player-style').textContent = `Style : ${style.label}`;
      $('home-player-style').title = `Le style qui revient le plus souvent : ${style.n} de tes ${style.games} dernières parties contre l'ordinateur.`;
    }
    const oldStats = Object.values(store.get('stats', {}));
    const games = player.games || oldStats.reduce((sum, row) => sum + row.win + row.loss + row.draw, 0);
    const puzzles = player.puzzles || Object.keys(store.get('pzdone', {})).length;
    $('home-player-progress').textContent = games || puzzles
      ? `Estimation basée sur ${games} partie${games > 1 ? 's' : ''} et ${puzzles} problème${puzzles > 1 ? 's' : ''}.`
      : 'L’estimation s’affine avec les parties et les problèmes.';
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
      badge: 'Départ', focus: 'Première étape',
      text: `Je vais construire ton programme à partir de tes parties et de tes problèmes. Pour commencer, ${profile.name || 'joue'} une partie contre l’ordinateur ou lance les problèmes de base.`,
      theme: null,
    };
    const row = priority.row, theme = PZ[priority.key];
    const puzzleText = row.failed ? ` Tu as aussi eu besoin d’aide sur ${row.failed} problème${row.failed > 1 ? 's' : ''} de ce thème.` : '';
    const personalText = priority.personalErrors ? ` ${priority.personalErrors} erreur${priority.personalErrors > 1 ? 's' : ''} personnelle${priority.personalErrors > 1 ? 's' : ''} reste${priority.personalErrors > 1 ? 'nt' : ''} à retravailler.` : '';
    const reviewText = dueReviews ? ` ${dueReviews} révision${dueReviews > 1 ? 's' : ''} ${dueReviews === 1 ? 'est prête' : 'sont prêtes'}.` : '';
    return {
      badge: `${c.games} partie${c.games === 1 ? '' : 's'} analysée${c.games === 1 ? '' : 's'} · ${completedPuzzles} problème${completedPuzzles === 1 ? '' : 's'}${dueReviews ? ` · ${dueReviews} révision${dueReviews > 1 ? 's' : ''} due${dueReviews > 1 ? 's' : ''}` : ''}`,
      focus: `Priorité: ${theme.name} · ${row.errors} faute${row.errors > 1 ? 's' : ''} repérée${row.errors > 1 ? 's' : ''}`,
      text: `${profile.name ? `${profile.name}, ` : ''}tes analyses montrent que ${theme.name.toLowerCase()} est le meilleur levier de progression.${puzzleText}${personalText}${reviewText} Je te propose une courte leçon, puis des exercices ciblés.`,
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
    $('coach-dock-status').textContent = coachMood || (settings.voice ? 'Coach d’échecs · voix active' : 'Coach d’échecs');
    $('coach-dock-voice').textContent = settings.voice ? '🔊' : '🔇';
    $('coach-dock-voice').setAttribute('aria-label', settings.voice ? 'Couper la voix' : 'Activer la voix');
  }

  function updateCoachDockForScreen(id) {
    if (id === 'home') coachMessage = coachPlan().text;
    else if (id === 'program') coachMessage = coachPlan().text;
    else if (id === 'game' && cfg && cfg.mode === 'coach') coachMessage = game && game.turn === cfg.playerColor ? 'À toi de jouer. Cherche les coups forcés et demande-toi ce que mon dernier coup a changé.' : 'Observe la position; je prépare ma réponse.';
    else if (id === 'problems' || id === 'theme') coachMessage = coachPlan().text;
    else if (id === 'champions') coachMessage = 'Choisis un champion du monde : je te présente ses idées, tu les appliques sur des problèmes à ton niveau, puis dans une partie où je te les rappelle au bon moment.';
    else if (id === 'settings') coachMessage = 'Tu peux garder ma présence discrète, couper ma voix ou me désactiver complètement ici.';
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
    return name && /^Bonjour,\s*/.test(text) ? text.replace(/^Bonjour,\s*/, `Bonjour ${name}, `) : text;
  }

  function setCoachMessage(text, mood = '', vocalize = false) {
    coachMessage = coachGreeting(text);
    coachMood = mood;
    // Sans bouton flottant, le panneau s'ouvre quand le coach commente la partie
    if (cfg && cfg.mode === 'coach' && game && !replay && !pz) coachDockOpen = true;
    renderCoachDock();
    if (vocalize) speak(coachMessage);
  }

  function promptPlayerName() {
    const player = playerProfile();
    const body = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'field-label'; label.htmlFor = 'player-name-input'; label.textContent = 'Comment l’entraîneur doit-il t’appeler ?';
    const input = document.createElement('input');
    input.id = 'player-name-input'; input.className = 'profile-name-input'; input.type = 'text';
    input.maxLength = 24; input.autocomplete = 'nickname'; input.placeholder = 'Ton prénom ou pseudo'; input.value = player.name || '';
    body.append(label, input);
    modal({ title: 'Faisons connaissance', text: 'Ton Elo estimé évoluera au fil de tes parties et de tes problèmes.', body, actions: [
      { label: 'Enregistrer', primary: true, onClick: () => {
        const current = playerProfile(); current.name = input.value.trim().slice(0, 24) || 'Joueur'; current.nameAsked = true;
        store.set('player', current); refreshHome();
      } },
      { label: 'Plus tard', ghost: true, onClick: () => { const current = playerProfile(); current.nameAsked = true; store.set('player', current); } },
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
    const th = THEMES[settings.theme] || THEMES.foret;
    document.documentElement.style.setProperty('--light', th.light);
    document.documentElement.style.setProperty('--dark', th.dark);
  }
  function renderSettings() {
    const wrap = $('themes'); wrap.innerHTML = '';
    for (const [key, th] of Object.entries(THEMES)) {
      const b = document.createElement('button');
      b.className = 'theme' + (settings.theme === key ? ' on' : '');
      b.setAttribute('aria-label', th.name);
      b.innerHTML = `<i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i><span class="theme-name">${th.name}</span>`;
      b.onclick = () => { settings.theme = key; saveSettings(); renderSettings(); };
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
      const G = new window.Chess.Game(); const san = [];
      for (const u of g.moves) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
      const st = G.status(), res = g.result && g.result !== '*' ? g.result : st.over ? st.result : '*';
      const d = new Date(g.id), me = 'Joueur', ai = `Ordinateur ${LEVEL_NAMES[g.level] || ''} (Elo ${LEVEL_ELO[g.level] || '?'})`;
      const tags = { Event: 'Partie Cavalier', Site: 'Cavalier', Date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
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
      try { await dl.save({ filename: filename.replace(/\.pgn$/, '.pgn.txt'), data: text }); toast('Fichier enregistré'); }
      catch (e) { if (e && e.code !== 'declined') toast("Le fichier n'a pas pu être enregistré ici."); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : 'application/x-chess-pgn' }));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('btn-export').onclick = () => saveFile(`cavalier-progression-${stamp()}.json`, JSON.stringify(exportData(), null, 2));
  $('btn-export-pgn').onclick = () => {
    if (!store.get('archive', []).length) return toast('Aucune partie enregistrée pour le moment.');
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
    if (!game.history.length) return { error: 'aucun coup reconnu' };
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
    if (!parsed.games.length) return toast(`Le fichier PGN est invalide${parsed.error ? ` : ${parsed.error}` : '.'}`);
    const select = document.createElement('select');
    select.className = 'profile-name-input';
    select.setAttribute('aria-label', 'Partie à charger');
    parsed.games.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${index + 1}. ${entry.tags.Event || 'Partie'} · ${entry.tags.White || 'Blancs'} - ${entry.tags.Black || 'Noirs'}`;
      select.appendChild(option);
    });
    const body = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'field-label'; label.htmlFor = 'pgn-game-select'; label.textContent = 'Partie';
    select.id = 'pgn-game-select'; body.append(label, select);
    modal({ title: 'Charger une partie', text: `${parsed.games.length} partie${parsed.games.length > 1 ? 's' : ''} trouvée${parsed.games.length > 1 ? 's' : ''}. La partie en cours sera remplacée.`, body, actions: [
      { label: 'Charger', primary: true, onClick: () => {
        const entry = parsed.games[Number(select.value)];
        const finalResult = entry.result !== '*' ? entry.result : entry.status.over ? entry.status.result : null;
        const importedResult = finalResult ? { result: finalResult, reason: entry.result !== '*' ? 'import' : entry.status.reason } : null;
        startGame({ mode: 'local', playerColor: 'w', level: 1 }, entry.moves, importedResult);
      } },
      { label: 'Annuler', ghost: true },
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
    if (!j || j.format !== 'cavalier-progression' || !validImportData(j.data)) return toast("Ce fichier n'est pas une progression Cavalier valide.");
    modal({
      title: 'Importer la progression ?',
      text: `Niveau débloqué : ${(j.summary && j.summary.unlockedLevelName) || '?'} · ${(j.data.archive || []).length} parties.\nTa progression actuelle sur cet appareil sera remplacée.`,
      actions: [
        { label: 'Importer', primary: true, onClick: () => {
          for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('cavalier.')) localStorage.removeItem(k); }
          for (const [k, v] of Object.entries(j.data)) if (/^[a-zA-Z0-9_.-]{1,40}$/.test(k)) store.set(k, v);
          location.reload();
        } },
        { label: 'Annuler', ghost: true },
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
    const top = unlocked(), wins = store.get('stats', {});
    let html = '';
    TIERS.forEach((t, i) => {
      const lv = i === 7 ? [22] : [i * 3 + 1, i * 3 + 2, i * 3 + 3];
      html += `<div class="level-row${lv.length === 1 ? ' single' : ''}"><span class="tier">${t}</span>` + lv.map((l) =>
        `<button data-level="${l}" role="radio" aria-checked="${l === setup.level}" class="${l === setup.level ? 'on' : ''}${wins[l] && wins[l].win ? ' done' : ''}" ${l > top ? 'disabled' : ''} aria-label="${LEVEL_NAMES[l]}, Elo ${LEVEL_ELO[l]}${l > top ? ' (verrouillé)' : ''}" title="Elo ${LEVEL_ELO[l]}">${lv.length === 1 ? 'Champion' : (l - 1) % 3 + 1}<small>${LEVEL_ELO[l]}</small></button>`).join('') + '</div>';
    });
    $('level-grid').innerHTML = html;
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
    cancelAi();
    replay = null; setReplayUi(false);
    pz = null; marks = null;
    attachBoard('game');
    game = new Game();
    for (const u of uciMoves) if (!game.playUci(u)) break;
    cfg = conf;
    if (cfg.mode === 'coach') cfg.coachTheme = coachPlan().theme;
    result = res;
    currentTerrain = TERRAIN_IDS.includes(terrainId) ? terrainId : TERRAIN_IDS[Math.floor(Math.random() * TERRAIN_IDS.length)];
    currentWeather = WEATHER_IDS.includes(weatherId) ? weatherId : WEATHER_IDS[Math.floor(Math.random() * WEATHER_IDS.length)];
    if (b3d) { b3d.setTerrain(currentTerrain); b3d.setWeather(currentWeather); }
    $('terrain-name').textContent = `${TERRAIN_NAMES[currentTerrain]} · ${WEATHER_NAMES[currentWeather]}`;
    flipped = flip !== undefined ? flip : conf.mode !== 'local' && conf.playerColor === 'b';
    selected = -1; hint = null;
    $('game-title').textContent = conf.mode === 'local' ? 'Deux joueurs' : conf.mode === 'coach' ? `${conf.champion && champById(conf.champion) ? `Comme ${champShort(champById(conf.champion))}` : 'Partie coachée'} · ${LEVEL_NAMES[conf.level]}` : `${LEVEL_NAMES[conf.level]} (Elo ${LEVEL_ELO[conf.level]})`;
    show('game');
    if (conf.mode === 'coach') {
      coachDockOpen = false;
      coachHintLevel = 0;
      const focus = cfg.coachTheme ? ` Objectif du jour: ${PZ[cfg.coachTheme].name.toLowerCase()}.` : '';
      const champ = conf.champion && champById(conf.champion);
      setCoachMessage(champ ? `Partie comme ${champ.name}. Je te rappellerai ses principes quand la situation se présentera.` : `Nous allons jouer une partie à ton niveau. Je commenterai les idées et te laisserai chercher les coups.${focus}`, 'happy');
    }
    render();
    save();
    if (conf.mode !== 'local' && !uciMoves.length) {
      const side = conf.playerColor === 'w' ? 'Blancs' : 'Noirs';
      toast(`Tirage au sort : tu joues les ${side}`);
      const champ = conf.mode === 'coach' && conf.champion && champById(conf.champion);
      if (champ) setCoachMessage(`Tu joues les ${side}. Aujourd'hui, joue comme ${champ.name} : ${champ.tagline.toLowerCase()}. ${championTip()}`.trim(), 'happy', true);
      else if (conf.mode === 'coach') setCoachMessage(`Tu joues les ${side}. Je serai ton adversaire et je t’aiderai à réfléchir sans te souffler les coups.`, 'happy', true);
    }
    maybeAiMove();
  }

  function save() {
    if (!game || pz || replay) return;
    store.set('game', { cfg, moves: game.uciList(), result, flipped, terrain: currentTerrain, weather: currentWeather });
  }

  const isHumanTurn = () => cfg.mode === 'local' || game.turn === cfg.playerColor;
  // Une animation 3D (déplacement, duel, technique de prise ou de mat) doit finir avant tout nouveau mouvement
  const animBusy = () => !!(b3d && b3d.busyUntil && b3d.busyUntil * 1000 > performance.now());
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
      html += `<button type="button" class="${dark ? 'd' : 'l'}${lit ? ' last' : ''}${selected ? ' sel' : ''}${mateFire.includes(sq) ? ' mate-fire' : ''}${target ? ` target${capture ? ' capture' : ''}` : ''}" data-sq="${sq}" aria-label="${sqName(sq)} ${p ? pieceName(p) : mateFire.includes(sq) ? 'case vide en feu' : 'case vide'}"${selected ? ' aria-pressed="true"' : ''}>${p ? `<b class="${p === p.toUpperCase() ? 'w' : 'k'}">${MINI[p.toLowerCase()]}</b>` : ''}</button>`;
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
      minimap.setPointerCapture(e.pointerId);
      minimap.classList.add('dragging');
      e.preventDefault();
      applyMinimapMove(e, minimapMove);
      return;
    }
    if (!resizeCandidate || e.pointerId !== resizeCandidate.pointerId || Math.hypot(e.clientX - resizeCandidate.x, e.clientY - resizeCandidate.y) < 7) return;
    minimapResize = resizeCandidate;
    resizeCandidate = null;
    minimapTap = null;
    minimap.setPointerCapture(e.pointerId);
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
    if (result && result.reason === 'mat') {
      const kingSq = s.board.indexOf(s.turn === 'w' ? 'K' : 'k');
      if (kingSq >= 0) {
        if (last && 'pnbqk'.includes(last.piece.toLowerCase())) {
          const movedPiece = s.board[last.to] || last.piece;
          const blackKingUltimate = result.result === '0-1' && movedPiece !== 'q' && movedPiece !== 'n';
          const ultimatePiece = blackKingUltimate ? 'k' : movedPiece;
          const attackerTo = blackKingUltimate ? s.board.indexOf('k') : last.to;
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
          mateUltimate = { id: result.ultimateId, from: blackKingUltimate ? attackerTo : last.from, attackerTo, to: kingSq, piece: ultimatePiece, flameSquares, energySquares, whiteFlameSquares };
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
      const th = THEMES[settings.theme] || THEMES.foret;
      b3d.update({ board: s.board, selected, targets, last, check: checkSq, mateFire, mateUltimate, hint, flipped, showMoves: settings.showMoves || !!marks, coords: settings.coords, light: th.light, dark: th.dark, animate: animateNext, outcome: result ? result.result : null, arrows });
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
    const playerName = String(playerProfile().name || 'Joueur').trim() || 'Joueur';
    const label = (c) => {
      if (cfg.mode === 'local') return c === 'w' ? 'Blancs' : 'Noirs';
      if (c === cfg.playerColor) return playerName;
      return cfg.mode === 'coach' ? 'Maître Hiro' : 'Ordinateur';
    };
    for (const [pos, c] of [['bottom', bottomColor], ['top', topColor]]) {
      const name = $('name-' + pos);
      name.textContent = label(c);
      name.classList.toggle('turn', !result && game.turn === c);
      const adv = material(c);
      $('cap-' + pos).innerHTML = capturedBy(c) + (adv > 0 ? `<small>+${adv}</small>` : '');
    }
  }

  function renderMoves() {
    const ol = $('moves'); ol.innerHTML = '';
    const h = game.history;
    for (let i = 0; i < h.length; i += 2) {
      const li = document.createElement('li');
      const cls = (k) => (k === h.length - 1 ? ' class="cur"' : '');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span><span data-ply="${i + 1}"${cls(i)}>${h[i].san}</span> ${h[i + 1] ? `<span data-ply="${i + 2}"${cls(i + 1)}>${h[i + 1].san}</span>` : ''}`;
      ol.appendChild(li);
    }
    ol.scrollTop = ol.scrollHeight;
  }

  function renderStatus() {
    const st = $('status');
    st.classList.remove('alert');
    if (result) { st.textContent = `${REASONS[result.reason]} · ${resultText()}`; return; }
    if (thinking) { st.textContent = "L'ordinateur réfléchit…"; return; }
    const side = game.turn === 'w' ? 'Blancs' : 'Noirs';
    if (game.inCheck()) { st.textContent = 'Échec !'; st.classList.add('alert'); return; }
    st.textContent = cfg.mode !== 'local' ? (isHumanTurn() ? 'À vous de jouer' : cfg.mode === 'coach' ? 'Maître Hiro réfléchit…' : '') : `Au tour des ${side}`;
  }

  function renderActions() {
    const plies = game.history.length;
    $('btn-undo').disabled = !!result || plies === 0 || (cfg.mode !== 'local' && plies < (cfg.playerColor === 'w' ? 1 : 2));
    $('btn-hint').disabled = !canInteract(true);
    $('btn-resign').disabled = !!result;
  }

  function resultText() {
    if (!result) return '';
    if (result.result === '1/2-1/2') return 'Partie nulle';
    const winner = result.result === '1-0' ? 'w' : 'b';
    if (cfg.mode !== 'local') return winner === cfg.playerColor ? 'Vous gagnez' : cfg.mode === 'coach' ? 'Maître Hiro gagne' : "L'ordinateur gagne";
    return winner === 'w' ? 'Les Blancs gagnent' : 'Les Noirs gagnent';
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
      const name = { q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' }[t];
      b.setAttribute('aria-label', `${name} ${color === 'w' ? 'blanche' : 'noire'}`);
      b.title = name;
      b.onclick = () => { chosen = t; closeModal(); commit(from, to, t); };
      body.appendChild(b);
    }
    modal({ title: 'Promotion', text: 'Choisissez la nouvelle pièce', body, actions: [{ label: 'Annuler', ghost: true, onClick: () => { if (!chosen) { selected = -1; renderBoard(); } } }] });
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
    try { judgeWorker = judgeWorker || new Worker('analyse-worker.js'); } catch { done(null); return; }
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
      if (st.reason === 'mat') shout('Échec et mat !');
      finish();
    } else {
      if (game.inCheck()) { sounds.check(); shout('Échec !'); }
      else if (res.move.captured) sounds.capture();
      else sounds.move();
    }
    if (cfg.mode === 'coach' && !result) coachGameCommentary(res, insight);
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
      setCoachMessage(`Êtes-vous sûr ? ${d.warning || ''} Utilise « Annuler » pour reprendre ton coup.`.replace(/\s+/g, ' '), 'worried', settings.voice);
      return;
    }
    let verdict = '';
    if (userPlayed && d.cls) {
      const why = d.reasons[0];
      if (d.cls === 'best') verdict = why ? `Excellent coup, c'est aussi celui que je jouerais : ${why}.` : 'Excellent coup, c\'est aussi celui que je jouerais.';
      else if (d.cls === 'good') verdict = why ? `Bon coup : ${why}.` : pick(['Bon coup, solide.', 'Bon coup : tu gardes ta position bien coordonnée.', 'Bon choix, tu ne laisses rien à ma portée.']);
      else if (d.cls === 'inaccuracy') verdict = pick(['Un peu imprécis : il y avait plus précis.', 'Coup jouable, mais pas le plus précis.']);
      else verdict = 'Tu as maintenu ton coup : voyons si je peux en profiter.';
    } else if (userPlayed && d.reasons[0]) verdict = d.reasons[0].charAt(0).toUpperCase() + d.reasons[0].slice(1) + '.';
    if (userPlayed) {
      setCoachMessage([...d.parts, verdict].filter(Boolean).join(' '), d.cls === 'mistake' || d.cls === 'blunder' ? 'worried' : 'happy', settings.voice);
      return;
    }
    setCoachMessage([...d.parts, championTip() || pick(['À toi de jouer.', 'Que réponds-tu ?', 'Regarde bien les menaces avant de répondre.'])].join(' '), '', settings.voice);
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
    if (cfg.mode !== 'local') {
      updatePlayerRating(LEVEL_ELO[cfg.level] || 600, outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0, 32, 'games');
      recordStat(cfg.level, outcome); archiveGame();
      // Une victoire au plus haut niveau débloqué ouvre le suivant
      if (outcome === 'win' && cfg.level === unlocked() && cfg.level < MAX_GAME_LEVEL) {
        opened = cfg.level + 1;
        store.set('unlocked', opened);
        setup.level = opened; store.set('setup', setup);
      }
    }
    (outcome === 'win' ? sounds.win : outcome === 'loss' ? sounds.lose : sounds.draw)();
    const snap = { moves: game.uciList(), cfg: { ...cfg }, result: result.result };
    // L'analyse démarre tout de suite : le bilan est souvent prêt quand on l'ouvre
    if (cfg.mode !== 'local' && snap.moves.length >= 8) requestReview(window.Chess.START_FEN, snap.moves).catch(() => {});
    if (cfg.mode === 'local' && !replay) {
      const local = store.get('localArchive', []);
      local.push({ id: Date.now(), mode: 'local', moves: game.uciList(), result: result.result, reason: result.reason });
      store.set('localArchive', local.slice(-30));
    }
    setTimeout(() => {
      modal({
        title: resultText(),
        text: REASONS[result.reason] + ` · ${Math.ceil(game.history.length / 2)} coups` + (opened ? `\nNiveau débloqué : ${LEVEL_NAMES[opened]} !` : ''),
        actions: [
          ...(opened ? [{ label: `Jouer ${LEVEL_NAMES[opened]}`, primary: true, onClick: () => startGame({ ...cfg, level: opened, playerColor: randomColor() }) }] : []),
          { label: 'Rejouer', primary: !opened, primary: true, onClick: () => startGame({ ...cfg, playerColor: randomColor() }) },
          ...(cfg.mode !== 'local' ? [{ label: 'Choisir un niveau', onClick: () => { renderSetup(); returnTo = 'home'; show('setup'); } }] : []),
          ...(snap.moves.length >= 8 ? [{ label: 'Bilan de Maître Hiro', onClick: () => showBilan(snap) }] : []),
          { label: 'Voir le plateau', ghost: true },
          { label: 'Accueil', ghost: true, onClick: () => show('home') },
        ],
      });
    }, Math.max(450, (b3d && b3d.busyUntil ? b3d.busyUntil * 1000 - performance.now() : 0) + 400)); // après le duel final
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
          w.postMessage('position startpos moves ' + moves);
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
      toast("L'IA ne peut pas démarrer ici. Ouvrez l'app via un serveur web.");
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
          setCoachMessage(`Premier indice: observe la pièce en ${move.slice(0, 2)}. Quels coups forcés peut-elle jouer?`, '', settings.voice);
          return;
        }
        if (hintLevel === 2) {
          setCoachMessage(`Deuxième indice: la case ${move.slice(2, 4)} est une cible possible. Calcule les réponses adverses avant de choisir.`, '', settings.voice);
          return;
        }
        const probe = new Game(window.Chess.toFen(game.state));
        const answer = probe.play(from, to, move[4]);
        const san = answer ? answer.san : `${move.slice(0, 2)} → ${move.slice(2, 4)}`;
        const advice = coachPlan().theme ? ` Garde aussi en tête ${PZ[coachPlan().theme].name.toLowerCase()}, ton axe de travail du moment.` : '';
        setCoachMessage(`Tu me demandes la solution : ${san}. Vérifie les menaces que ce coup crée et les pièces qu’il protège.${advice}`, 'happy', settings.voice);
      } else toast('Indice : ' + move.slice(0, 2) + ' → ' + move.slice(2, 4));
      return;
    }
    thinking = false;
    const res = game.play(from, to, move[4]);
    if (res) afterMove(res);
  }
  function maybeAiMove() {
    if (!game || result || cfg.mode === 'local' || game.turn === cfg.playerColor) return;
    thinking = true;
    renderStatus(); renderActions();
    // Petit délai pour que le coup du joueur s'affiche d'abord
    // Laisse le duel en cours se terminer avant que l'ordinateur ne joue
    const busy = b3d && b3d.busyUntil ? b3d.busyUntil * 1000 - performance.now() : 0;
    const launch = () => {
      if (!thinking) return;
      // En partie coachée, le coach finit de parler avant de jouer
      if (cfg.mode === 'coach' && speechBusy()) { setTimeout(launch, 200); return; }
      ask('move', cfg.level);
    };
    setTimeout(launch, Math.max(250, busy + 150));
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
    else toast('Recherche du meilleur coup…');
    ask('hint', 4);
  };
  $('btn-flip').onclick = () => { flipped = !flipped; render(); save(); };
  $('btn-resign').onclick = () => {
    if (result) return;
    modal({
      title: 'Abandonner ?', text: 'La partie sera comptée comme perdue.',
      actions: [
        { label: 'Abandonner', primary: true, onClick: () => {
          cancelAi();
          const loser = cfg.mode !== 'local' ? cfg.playerColor : game.turn;
          result = { result: loser === 'w' ? '0-1' : '1-0', reason: 'abandon' };
          finish();
        } },
        { label: 'Continuer à jouer', ghost: true },
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
  }
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
    const SHORT = { mat: 'Mat', defense: 'Défense', prise: 'Prises', fourchette: 'Fourchettes', clouage: 'Clouages', tactique: 'Combinaisons', finale: 'Finales' };
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
    const note = !any ? "Joue des parties contre l'ordinateur : chaque thème recevra une note tirée de l'analyse de tes parties."
      : `Mesuré sur tes ${c.games} partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} (performance ${base}). Point fort : ${best[0].name} (${best[0].value}). À travailler : ${best[best.length - 1].name} (${best[best.length - 1].value}).`;
    return `<h3 class="pz-section">Mes compétences par thème</h3><svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Araignée des compétences par thème">${g}</svg><p class="pz-cap">${note}</p>`;
  }
  function renderStats() {
    const stats = store.get('stats', {});
    const body = $('stats-body');
    const levels = Object.keys(stats).filter((l) => LEVEL_NAMES[l]).sort((a, b) => a - b);
    const radar = skillRadar();
    if (!levels.length) {
      body.innerHTML = radar + '<p class="empty">Aucune partie terminée contre l\'ordinateur pour l\'instant.<br>Vos résultats apparaîtront ici.</p>';
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
    body.innerHTML = radar + `<h3 class="pz-section">Résultats contre l'ordinateur</h3><table class="stats-table"><thead><tr><th>Niveau</th><th>V</th><th>N</th><th>D</th><th>Réussite</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td><b>Total</b></td><td>${total.win}</td><td>${total.draw}</td><td>${total.loss}</td><td>${Math.round((100 * total.win) / n)} %</td></tr></tfoot></table>
      <button class="btn ghost wide" id="btn-reset-stats">Remettre à zéro</button>`;
    $('btn-reset-stats').onclick = () => modal({
      title: 'Effacer les statistiques ?', actions: [
        { label: 'Effacer', primary: true, onClick: () => { store.del('stats'); renderStats(); } },
        { label: 'Annuler', ghost: true },
      ],
    });
  }

  /* ---------- Problèmes et leçons guidées ---------- */
  const PZ = {
    mat: { name: 'Mats à trouver', icon: '♛', short: "Tu as laissé passer un échec et mat.", tip: "Avant chaque coup, passe en revue tous tes échecs, puis toutes tes prises. Un échec qui ne laisse aucune case au roi, c'est souvent le mat." },
    defense: { name: 'Parer le mat', icon: '♚', short: "Tu as laissé l'adversaire mater ou forcer le mat.", tip: "Après chaque coup adverse, demande-toi : « Qu'est-ce qu'il menace ? » Fuir, s'interposer ou prendre l'attaquant : cherche les trois parades." },
    prise: { name: 'Pièces en prise', icon: '♟', short: "Une pièce sans défense a été perdue, ou pas prise.", tip: "Compte les attaquants et les défenseurs de chaque pièce avant de jouer. Une pièce plus attaquée que défendue est en danger." },
    fourchette: { name: 'Attaques doubles', icon: '♞', short: "Une pièce a attaqué deux cibles à la fois.", tip: "Repère les cases d'où un cavalier, un pion ou la dame toucherait deux de tes pièces, et n'y laisse pas tes pièces alignées." },
    clouage: { name: 'Clouages et enfilades', icon: '♝', short: "Une pièce s'est retrouvée clouée devant une plus précieuse.", tip: "Évite d'aligner ton roi et ta dame sur une même ligne ou diagonale ouverte face à un fou, une tour ou la dame adverse." },
    tactique: { name: 'Combinaisons', icon: '✦', short: "Un gain de matériel en plusieurs coups t'a échappé.", tip: "Cherche d'abord les coups forcés : échecs, prises, menaces. Calcule la réponse adverse la plus forte avant de te lancer." },
    finale: { name: 'Finales', icon: '♙', short: "Une faute en fin de partie a coûté le résultat.", tip: "En finale, active ton roi et pousse tes pions passés. La règle du carré dit si un pion peut être rattrapé." },
  };
  const PZ_KEYS = Object.keys(PZ);
  const PZ_LEVELS = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' };
  const BANK = window.PUZZLES || [];
  const LESSONS = window.LESSONS || [];
  const fmtDate = (id) => new Date(id).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
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
    if (row.score >= 0.3) return ['hot', 'À travailler'];
    if (isWeak(row)) return ['warm', 'À surveiller'];
    return ['ok', 'Acquis'];
  }
  function trendOf(row) {
    const h = row.hist;
    if (h.length < 3) return '';
    const d = row.score - h[Math.max(0, h.length - 6)];
    if (d <= -0.05) return '<span class="trend down">↓ en progrès</span>';
    if (d >= 0.05) return '<span class="trend up">↑ plus fréquent</span>';
    return '<span class="trend">→ stable</span>';
  }

  /* Archive des parties et analyse en arrière-plan */
  function archiveGame() {
    const arch = store.get('archive', []);
    arch.push({ id: Date.now(), mode: cfg.mode, color: cfg.playerColor, level: cfg.level, moves: game.uciList(), result: result ? result.result : '*', reason: result ? result.reason : '', analysed: game.history.length < 12 });
    store.set('archive', arch.slice(-30));
    setTimeout(analyseNext, 1500);
  }
  let aWorker = null, analysing = false;
  function analyseNext() {
    if (analysing) return;
    const g = store.get('archive', []).find((x) => !x.analysed);
    if (!g) return explainPending();
    try { aWorker = aWorker || new Worker('analyse-worker.js'); } catch { return; }
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
        if (n === 0 && row.level < MAX_LEVEL) { row.level++; promoted.push(`${PZ[k].name} niveau ${row.level}`); }
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
      setTimeout(() => toast(`Nouvelle astuce de ${COACH} : ${fresh[0].title}. Voir Problèmes.`), 7000);
    }
    refreshCoachProgram();
    const summary = countedErrors.length
      ? `${countedErrors.length} faute${countedErrors.length > 1 ? 's' : ''} (${[...new Set(countedErrors.map((e) => PZ[e.theme].name))].join(', ')})`
      : 'aucune grosse faute';
    const captureCounts = {
      advantageous: captures.filter((x) => x.kind === 'advantageous').length,
      counterplay: captures.filter((x) => x.kind === 'counterplay').length,
      materialOnly: captures.filter((x) => x.kind === 'material-only').length,
    };
    const captureSummary = [
      captureCounts.advantageous && `${captureCounts.advantageous} prise${captureCounts.advantageous > 1 ? 's' : ''} avantageuse${captureCounts.advantageous > 1 ? 's' : ''}`,
      captureCounts.counterplay && `${captureCounts.counterplay} prise${captureCounts.counterplay > 1 ? 's' : ''} laissant du contre-jeu`,
      captureCounts.materialOnly && `${captureCounts.materialOnly} prise${captureCounts.materialOnly > 1 ? 's' : ''} ayant fait manquer un meilleur coup`,
    ].filter(Boolean).join(' · ');
    toast(`Partie analysée : ${summary}${captureSummary ? ` · ${captureSummary}` : ''}. Voir Problèmes.`);
    if (promoted.length || retry.length) setTimeout(() => toast((promoted.length ? `Niveau confirmé : ${promoted.join(', ')}. ` : '') + (retry.length ? `À reprendre : ${retry.join(', ')}.` : '')), 3500);
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
        title: 'À toi de jouer une partie',
        text: "Tous tes niveaux en cours sont validés en problèmes. Joue une partie contre l'ordinateur : si mon analyse voit que tu ne refais plus ces fautes, tu passes au niveau suivant.",
        actions: [
          { label: 'Jouer une partie', primary: true, onClick: () => { setup.mode = 'ai'; renderSetup(); returnTo = 'problems'; show('setup'); } },
          { label: 'Réviser en attendant', ghost: true, onClick: () => nextActivity(true) },
          { label: 'Fermer', ghost: true },
        ],
      });
      act = { type: 'puzzle', theme: act.theme };
    }
    if (act.type === 'lesson') return startLesson(act.theme);
    const row = themeRow(loadCoach(), act.theme);
    const it = pickPuzzle(act.theme, row.level);
    if (!it) { toast('Aucun problème disponible pour ce thème.'); return leavePuzzle(); }
    pz = { kind: 'path', idx: 0, item: it };
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
      <span class="d">${row.recent.length ? `${recent} faute${recent > 1 ? 's' : ''} ${row.recent.length > 1 ? `sur tes ${row.recent.length} dernières parties` : 'dans ta dernière partie'} · ` : ''}Leçon ${done ? '✓' : 'à faire'} · Niveau ${row.level} ${levelState(row)} ${trendOf(row)}</span>
      <span class="bar2"><i style="width:${Math.max(4, width)}%;background:${color}"></i></span></button>`;
  }
  /* ---------- Astuces solutions : les motifs d'erreur qui reviennent dans tes parties ---------- */
  const PIECE_FR = {
    p: { mine: 'ton pion', theirs: 'un pion adverse', name: 'pion' },
    n: { mine: 'ton cavalier', theirs: 'un cavalier adverse', name: 'cavalier' },
    b: { mine: 'ton fou', theirs: 'un fou adverse', name: 'fou' },
    r: { mine: 'ta tour', theirs: 'une tour adverse', name: 'tour' },
    q: { mine: 'ta dame', theirs: 'la dame adverse', name: 'dame' },
    k: { mine: 'ton roi', theirs: 'le roi adverse', name: 'roi' },
  };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Titre, explication de l'erreur, solution et conséquence, selon le thème et le sens de la faute
  function tipText(theme, kind, piece, n) {
    const P = PIECE_FR[piece] || PIECE_FR.p, mine = P.mine;
    const fois = `${n} fois`;
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
    try { aWorker = aWorker || new Worker('analyse-worker.js'); } catch { return; }
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
        tips.push({ key, list, games, pos: true, theme: last.theme, title: `Position qui revient (coup ${last.move})`,
          explain: `Cette position est revenue dans ${games} de tes parties, et tu y as joué ${[...new Set(list.map((m) => m.played))].join(' ou ')}. Ce n'était pas le meilleur coup.`, solution: t[2], cons: t[3] });
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
    const chip = !done ? '<span class="chip hot">Nouveau</span>' : done < t.list.length ? '<span class="chip warm">Revient encore</span>' : '<span class="chip ok">Vue</span>';
    return `<button class="pz-card tip" data-tip="${t.key}"><span class="ico">💡</span><span class="t">${t.title}</span>${chip}
      <span class="d">${t.games} parties concernées · ${PZ[t.theme] ? PZ[t.theme].name : ''}</span></button>`;
  }
  // Leçon d'astuce : l'entraîneur explique l'erreur, la montre dans tes parties, puis te fait trouver la solution
  function startTip(key) {
    const t = tipMotifs().find((x) => x.key === key);
    if (!t) return;
    const steps = [{ text: `${t.explain} Je vais te montrer où ça s'est passé, puis on corrige ensemble.` }];
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
          if (r2) { reply = ` L'adversaire a répondu ${r2.san} : ${t.cons}.`; marks.push(m.punish.slice(0, 2), m.punish.slice(2, 4)); }
        }
      } catch { /* sans détail */ }
      steps.push({ text: `Ta partie du ${fmtDate(m.date)}, coup ${m.move}. Tu as joué ${m.played}.${reply || ' Il y avait beaucoup mieux.'}`, fen: m.fen, marks: [...new Set(marks)] });
      steps.push({ text: 'À toi : dans cette même position, trouve le bon coup.', fen: m.fen, line: m.line, alts: m.alts, mistake: m.id,
        why: `Voilà la solution. ${t.solution}`, wrong: `Pas encore. ${t.solution}`, hintText: 'Regarde la pièce en surbrillance : c\'est elle qui doit jouer.' });
    }
    steps.push({ text: `Retiens bien : ${t.solution.charAt(0).toLowerCase() + t.solution.slice(1)} Je surveille tes prochaines parties pour voir si ce motif disparaît.` });
    pz = { kind: 'lesson', lesson: { theme: t.theme, title: t.title, tip: t.key, count: t.list.length }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  const levelState = (row) => row.pending ? '· validé, à confirmer en partie' : `· ${row.ok}/${LEVEL_SET}`;
  function renderProblems() {
    const c = loadCoach();
    const pending = store.get('archive', []).filter((x) => !x.analysed).length;
    const mistakes = store.get('mistakes', []);
    const captureNotes = store.get('captureNotes', []).slice(-8).reverse();
    const order = pathOrder(c);
    const acquired = ranked(c).filter((k) => !isWeak(c.themes[k]));
    const next = peekActivity();
    let html = '<div class="pz-summary">';
    if (!c.games) html += "Joue une partie contre l'ordinateur : je l'analyse et je construis ton programme, du point faible le plus fréquent au plus rare. En attendant, on commence par les bases.";
    else html += `<b>${c.games}</b> partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} · <b>${mistakes.length}</b> faute${mistakes.length > 1 ? 's' : ''} relevée${mistakes.length > 1 ? 's' : ''}`;
    if (pending) html += `<br>Analyse en cours : ${pending} partie${pending > 1 ? 's' : ''} en attente…`;
    html += '</div>';
    if (captureNotes.length) {
      const pieceNames = { p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'une dame', k: 'un roi' };
      const pawns = (cp) => `${(Math.abs(cp) / 100).toFixed(1).replace('.', ',')} pion${Math.abs(cp) >= 200 ? 's' : ''}`;
      html += '<h3 class="pz-section">Analyse de tes prises</h3><p class="pz-cap">Le moteur regarde si la prise garde son avantage, concède du contre-jeu ou fait manquer un meilleur coup.</p>';
      html += captureNotes.map((x) => {
        const piece = pieceNames[x.captured] || 'une pièce';
        let title, detail;
        if (x.kind === 'advantageous') {
          title = 'Prise avantageuse';
          detail = `Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : prendre ${piece} conserve un avantage et gagne du matériel.`;
        } else if (x.kind === 'counterplay') {
          title = 'La prise laisse du contre-jeu';
          detail = `Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : après cette prise, l’adversaire pouvait répondre ${x.reply || 'par une forte riposte'} et dégrader fortement ta position.`;
        } else {
          title = 'Prise matérielle, meilleur coup manqué';
          const better = x.bestMate ? `${x.best} permettait de mater en ${x.mateInBest} coup${x.mateInBest > 1 ? 's' : ''}` : `${x.best} conservait mieux l’avantage (écart estimé : ${pawns(x.loss)})`;
          detail = `Partie du ${fmtDate(x.date)}, coup ${x.move} (${x.played}) : la prise gagne ${piece}, mais ${better}.`;
        }
        return `<article class="capture-note ${x.kind}"><b>${title}</b><small>${detail}</small></article>`;
      }).join('');
    }
    const nextLabel = next.type === 'wait' ? 'Joue une partie pour confirmer tes niveaux' : next.type === 'lesson' ? `Leçon : ${lessonOf(next.theme).title}` : `Problèmes : ${PZ[next.theme].name} · niveau ${themeRow(c, next.theme).level} (${themeRow(c, next.theme).ok}/${LEVEL_SET})`;
    html += `<button class="btn primary wide" id="pz-go">Continuer mon entraînement</button><p class="pz-next">Prochaine étape · ${nextLabel}</p>`;
    const tips = tipMotifs();
    if (tips.length) html += `<h3 class="pz-section">Astuces solutions</h3><p class="pz-cap">Les erreurs qui reviennent dans tes parties, expliquées par ${COACH}.</p>` + tips.map(tipCard).join('');
    html += `<h3 class="pz-section">${c.games ? 'Ton programme, par priorité' : 'Programme de départ'}</h3>`;
    html += order.map((k, i) => card(k, themeRow(c, k), i + 1, k === next.theme)).join('');
    if (acquired.length && order.some((k) => !acquired.includes(k))) html += '<h3 class="pz-section">Thèmes acquis</h3>' + acquired.map((k) => card(k, c.themes[k], 0)).join('');
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
    return `<svg class="spark" viewBox="0 0 300 70" preserveAspectRatio="none" role="img" aria-label="Évolution"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
      <p class="pz-cap">Fréquence de cette faute au fil de tes parties (plus bas = mieux)</p>`;
  }
  function openTheme(k) { themeOpen = k; renderTheme(); show('theme'); }
  function renderTheme() {
    const k = themeOpen, c = loadCoach(), row = themeRow(c, k), info = PZ[k];
    const mine = store.get('mistakes', []).filter((m) => m.theme === k).reverse();
    const recent = row.recent.reduce((a, b) => a + b, 0);
    $('theme-title').textContent = info.name;
    let html = `<p style="color:var(--muted)">${row.errors ? info.short : 'Pas encore de faute de ce type dans tes parties.'} ${row.errors ? `<span class="chip ${themeStatus(row)[0]}">${themeStatus(row)[1]}</span> ${trendOf(row)}` : ''}</p>`;
    html += `<div class="pz-stats"><div><b>${recent}</b><span>fautes (10 dernières parties)</span></div><div><b>${row.level}</b><span>niveau / ${MAX_LEVEL}<br>${row.pending ? 'à confirmer en partie' : `${row.ok}/${LEVEL_SET} réussis`}</span></div><div><b>${row.solved}</b><span>problèmes réussis</span></div></div>`;
    html += spark(row.hist);
    html += `<p class="pz-tip">${info.tip}</p>`;
    if (mine.length) {
      html += '<h3 class="pz-section">Tes erreurs relevées</h3>' + mine.slice(0, 12).map((m) =>
        `<div class="pz-err ${m.solved ? 'done' : ''}"><span>Partie du ${fmtDate(m.date)}, coup ${m.move}<small>Tu as joué ${m.played}${m.solved ? ' · acquise après révisions ✓' : m.reviewAt > Date.now() ? ` · prochaine révision ${fmtDate(m.reviewAt)}` : ' · à revoir maintenant'}</small></span></div>`).join('');
    }
    $('theme-body').innerHTML = html;
  }

  const personalItem = (m) => ({ personal: m, fen: m.fen, line: m.line, alts: m.alts, theme: m.theme, level: m.level || 1 });

  /* L'entraîneur */
  const COACH = 'Maître Hiro';
  // Voix de Maître Hiro : synthèse vocale du navigateur, en français
  const tts = window.speechSynthesis;
  let frVoice = null;
  function pickVoice() {
    const vs = tts ? tts.getVoices() : [];
    frVoice = vs.find((v) => /^fr(-|_|$)/i.test(v.lang) && /male|homme|thomas|paul|henri|nicolas/i.test(v.name)) || vs.find((v) => /^fr/i.test(v.lang)) || null;
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
    u.lang = 'fr-FR'; if (frVoice) u.voice = frVoice;
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
    u.lang = 'fr-FR'; if (frVoice) u.voice = frVoice;
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
    b.setAttribute('aria-label', settings.voice ? 'Couper la voix' : 'Activer la voix');
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
    if (!$('puzzle').classList.contains('active')) show('puzzle');
  }
  function leavePuzzle() {
    hush();
    const back = pz && pz.lesson && pz.lesson.champion ? 'champions' : 'problems';
    pz = null; marks = null; game = null;
    show(back);
  }
  function setPzStatus(cls, text) {
    const st = $('pz-status');
    st.className = 'status' + (cls ? ' ' + cls : '');
    st.textContent = text;
  }
  function promptOf(it) {
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
    $('pz-count').textContent = (it.personal ? 'Ta partie · ' : '') + `Niveau ${row.level} · ${row.pending ? 'révision' : `${Math.min(LEVEL_SET, row.ok + 1)}/${LEVEL_SET}`}`;
    say(promptOf(it));
    setPzStatus('', 'À toi de jouer');
    renderBoard();
    pzButtons();
  }
  function pzButtons() {
    const task = pz.item && pz.item.line;
    $('pz-hint').disabled = !task || pz.done || pz.locked;
    $('pz-solution').disabled = !task || pz.done || pz.locked;
    const lastStep = pz.kind === 'lesson' && pz.idx >= pz.steps.length - 1;
    $('pz-next').innerHTML = `<span>→</span>${pz.kind === 'lesson' ? (lastStep ? (pz.lesson && (pz.lesson.tip || pz.lesson.champion) ? 'Terminer' : 'Aux problèmes') : 'Continuer') : 'Suivant'}`;
    $('pz-next').disabled = !pz.done;
  }
  const busyDelay = (min) => Math.max(min, (b3d && b3d.busyUntil ? b3d.busyUntil * 1000 - performance.now() : 0) + 250);
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
      pz.failed = true; pz.locked = true;
      sounds.lose();
      setPzStatus('bad', 'Pas le bon coup, réessaie.');
      say(lessonStep && lessonStep.wrong ? lessonStep.wrong : `Pas tout à fait. ${PZ[it.theme].tip}`, 'sad');
      pzButtons();
      setTimeout(() => { if (!pz) return; game.undo(); pz.locked = false; renderBoard(); pzButtons(); }, busyDelay(700));
      return;
    }
    res.move.captured ? sounds.capture() : sounds.move();
    if (mated) shout('Échec et mat !'); else if (game.inCheck()) shout('Échec !');
    if (uci !== expected || mated) return pzSolved();
    pz.step++;
    pz.hintLevel = 0;
    if (pz.step >= it.line.length) return pzSolved();
    pz.locked = true;
    setPzStatus('good', 'Bien vu ! Continue…');
    say('Bien vu ! Regarde la réponse de l\'adversaire, puis termine le travail.', 'happy');
    pzButtons();
    setTimeout(() => {
      if (!pz || pz.item !== it) return;
      const r = game.playUci(it.line[pz.step]);
      pz.step++;
      pz.hintLevel = 0;
      animateNext = true; pz.locked = false;
      if (r) (r.move.captured ? sounds.capture : sounds.move)();
      if (r && game.inCheck()) shout(game.status().over ? 'Échec et mat !' : 'Échec !');
      renderBoard();
      if (pz.step >= it.line.length) pzSolved(); else pzButtons();
    }, busyDelay(600));
  }
  function pzSolved() {
    pz.done = true;
    const clean = !pz.failed;
    setTimeout(() => sounds.win(), 200);
    setPzStatus('good', clean ? 'Résolu du premier coup !' : 'Résolu, avec un peu d\'aide.');
    if (pz.kind === 'lesson') {
      const st = pz.steps[pz.idx];
      const lessonLevel = themeRow(loadCoach(), pz.lesson.theme).level;
      updatePlayerRating(400 + lessonLevel * 250, clean ? 1 : 0, 8, 'puzzles');
      say(st.why || 'Exactement ! Tu as trouvé.', 'happy');
      if (st.mistake) touchMistake(st.mistake, clean);
    } else {
      const r = recordPuzzle(pz.item, clean);
      say(r.validated ? `Bravo ! Niveau ${r.level} validé en problèmes. Joue maintenant une partie : si mon analyse voit que tu ne refais plus cette faute, tu passes au niveau ${r.level + 1}.`
        : clean ? (r.pending ? 'Bravo, bonne révision. Ton niveau sera confirmé par ta prochaine partie.' : `Bravo, c'est ça ! ${r.ok}/${LEVEL_SET} pour valider le niveau ${r.level}.`)
        : `Tu y es arrivé, mais avec de l'aide : celui-ci ne compte pas. On reste au niveau ${r.level}.`, 'happy');
    }
    pzButtons();
  }
  // Un problème réussi du premier coup compte pour valider le niveau ; le niveau ne monte qu'après confirmation en partie
  function recordPuzzle(it, clean) {
    const c = loadCoach(), row = themeRow(c, it.theme);
    let validated = false;
    if (clean) {
      row.solved++;
      row.score = Math.max(0, Math.round((row.score - 0.02) * 1000) / 1000);
      if (!row.pending && ++row.ok >= LEVEL_SET) { row.pending = true; validated = true; }
    } else row.failed++;
    const challengeElo = 400 + Math.max(1, it.rating || it.level * 3 - 1) * 200;
    updatePlayerRating(challengeElo, clean ? 1 : 0, 12, 'puzzles');
    store.set('coach', c);
    if (it.personal) touchMistake(it.personal.id, clean);
    if (it.id) { const st = store.get('pzdone', {}); st[it.id] = clean ? 's' : 'f'; store.set('pzdone', st); }
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
      ? (st && st.hintText ? st.hintText : `Observe la pièce en ${u.slice(0, 2)}. Cherche les coups forcés qu’elle peut jouer.`)
      : `La case ${u.slice(2, 4)} est la cible du motif. Trouve le meilleur trajet pour l’atteindre sans exposer ton roi.`;
    say(text);
    pzButtons();
  };
  $('pz-solution').onclick = () => {
    if (!pz || pz.done || pz.locked || !pz.item.line) return;
    const u = pz.item.line[pz.step];
    pz.failed = true;
    hint = null;
    say('Regarde bien ce coup, je te le montre.');
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
    const L = lessonOf(k);
    const c = loadCoach(), row = c.themes[k];
    const steps = L.steps.slice();
    const intro = row && row.errors
      ? `Bonjour, je suis ${COACH}. Dans tes parties, j'ai relevé ${row.errors} faute${row.errors > 1 ? 's' : ''} de type « ${PZ[k].name} ». C'est ta priorité du moment : on va la travailler ensemble.`
      : `Bonjour, je suis ${COACH}. Aujourd'hui, on travaille « ${PZ[k].name} ».`;
    steps.unshift({ text: intro });
    // Dernière étape : une de tes propres erreurs sur ce thème
    const mine = store.get('mistakes', []).filter((m) => m.theme === k).pop();
    if (mine) steps.push({ text: `Maintenant, ta propre partie du ${fmtDate(mine.date)}. Au coup ${mine.move}, tu as joué ${mine.played}. Avec ce que tu viens de voir, trouve le bon coup.`, fen: mine.fen, line: mine.line, alts: mine.alts, mistake: mine.id, why: 'Voilà le coup que tu cherchais. La prochaine fois, tu le verras pendant la partie.' });
    steps.push({ text: `${PZ[k].tip} Passons aux problèmes : à chaque réussite, le niveau monte.` });
    pz = { kind: 'lesson', lesson: L, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  function loadLessonStep() {
    const st = pz.steps[pz.idx];
    const it = { theme: st.theme || pz.lesson.theme, level: 1, fen: st.fen, line: st.line, alts: st.alts };
    Object.assign(pz, { item: it, step: 0, failed: false, done: !st.line, locked: false });
    if (st.fen) setPosition(st.fen);
    else if (!game) setPosition('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    selected = -1; hint = null;
    marks = st.marks ? st.marks.map((s) => window.Chess.sqIndex(s)) : null;
    $('puzzle-title').textContent = pz.lesson.title;
    $('pz-count').textContent = `Étape ${pz.idx + 1} / ${pz.steps.length}`;
    say(st.text);
    setPzStatus('', st.line ? 'À toi de jouer' : '');
    renderBoard();
    pzButtons();
  }
  function nextLessonStep() {
    if (pz.idx < pz.steps.length - 1) { pz.idx++; loadLessonStep(); return; }
    if (pz.lesson.champion) return finishChampionLesson(pz.lesson.champion);
    if (pz.lesson.tip) { const d = store.get('tipsDone', {}); d[pz.lesson.tip] = pz.lesson.count; store.set('tipsDone', d); return leavePuzzle(); }
    const done = store.get('lessonsDone', {}); done[pz.lesson.theme] = Date.now(); store.set('lessonsDone', done);
    nextActivity();
  }
  /* ---------- Comme un champion : idées et principes des champions du monde ---------- */
  const CHAMPS = window.CHAMPIONS || [];
  const STYLE_AXES = { attaque: 'attaque', tactique: 'tactique', positionnel: 'jeu positionnel', finale: 'finales', defense: 'défense' };
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
  const styleGames = () => store.get('archive', []).filter((g) => g.color && g.moves && g.moves.length >= 12).slice(-20);
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
    if (v.attaque >= 0.6) return impulsive ? 'Attaquant impulsif' : 'Joueur agressif';
    if (v.tactique >= 0.6) return impulsive ? 'Chasseur de matériel' : 'Tacticien opportuniste';
    if (v.finale >= 0.6 && v.positionnel >= 0.5) return 'Joueur positionnel patient';
    if (v.positionnel >= 0.6) return impulsive ? 'Bâtisseur pressé' : 'Stratège solide';
    if (v.defense >= 0.6) return 'Défenseur tenace';
    if (v.finale >= 0.6) return 'Finisseur méthodique';
    return impulsive ? 'Joueur spontané' : 'Joueur polyvalent';
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
  function championPuzzle(theme, used) {
    const base = Math.max(1, Math.min(9, Math.round((estimatedElo() - 400) / 200)));
    const target = championLevel === 'above' ? base + 1 : base;
    const done = store.get('pzdone', {});
    const pool = BANK.filter((p) => p.theme === theme && !used.has(p.id));
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
        text: `Retour sur ta partie du ${fmtDate(m.date)}. Au coup ${m.move}, tu as joué ${m.played}. Souviens-toi : ${pr.title.toLowerCase()}. Joue ce coup comme ${name} l'aurait joué.`,
        fen: m.fen, line: m.line, alts: m.alts, mistake: m.id, theme: m.theme,
        why: `Voilà le coup de ${name}. La prochaine fois que cette situation se présente, pense à : ${pr.title.toLowerCase()}.`,
      };
    }
    // Sans faute sur ces thèmes : la position de ta dernière partie où la situation-clé du champion est apparue
    const finaleChamp = ch.style.finale >= 0.8;
    for (const g of store.get('archive', []).slice().reverse()) {
      if (!g.color || !g.moves || g.moves.length < 16) continue;
      const G = new Game();
      for (let i = 0; i < g.moves.length; i++) {
        if (!G.playUci(g.moves[i])) break;
        if ((finaleChamp ? isEndgameBoard(G.state.board) : i >= 15) && G.turn === g.color) {
          return { text: `Retour sur ta partie du ${fmtDate(g.id)}, au coup ${Math.floor(i / 2) + 1}. ${finaleChamp ? ch.tips.finale : ch.tips.milieu} Observe la position et cherche le plan de ${name}.`, fen: window.Chess.toFen(G.state) };
        }
      }
    }
    return null;
  }
  function startChampionLesson(id) {
    const ch = champById(id);
    if (!ch) return;
    const name = champShort(ch), used = new Set();
    const steps = [{ text: `Bonjour, je suis ${COACH}. Aujourd'hui, on apprend à jouer comme ${ch.name}, ${ch.reign.charAt(0).toLowerCase() + ch.reign.slice(1)}. ${ch.intro}` }];
    ch.principles.forEach((p, i) => {
      steps.push({ text: `Principe ${i + 1} : ${p.title}. ${p.text}` });
      const it = championPuzzle(p.theme, used);
      if (it) {
        used.add(it.id);
        steps.push({ text: `À toi, comme ${name} : ${p.task.charAt(0).toLowerCase() + p.task.slice(1)}`, fen: it.fen, line: it.line, alts: it.alts, theme: p.theme, why: `Bravo ! C'est exactement l'idée de ${name} : ${p.title.toLowerCase()}.` });
      }
    });
    const mine = championPersonalStep(ch);
    if (mine) steps.push(mine);
    const level = championGameLevel();
    steps.push({ text: `Tu connais maintenant les idées de ${name}. Pour les appliquer, joue une partie « comme ${name} » au niveau ${LEVEL_NAMES[level]} : je te rappellerai ses principes quand la situation se présentera.` });
    pz = { kind: 'lesson', lesson: { title: `Comme ${name}`, theme: ch.principles[0].theme, champion: ch.id }, steps, idx: 0 };
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
      title: `Cours terminé : ${ch.name}`,
      text: `Prêt à jouer comme ${champShort(ch)} ? Partie coachée au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`,
      actions: [
        { label: `Jouer comme ${champShort(ch)}`, primary: true, onClick: () => startChampionGame(id) },
        { label: 'Plus tard', ghost: true },
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
      text += ` Souviens-toi de ta partie du ${fmtDate(past.date)} : dans une situation semblable, au coup ${past.move}, tu avais joué ${past.played} et ce n'était pas le meilleur.`;
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
      html += `Les champions sont classés du plus proche au plus éloigné de ton style, estimé sur tes <b>${style.games}</b> dernière${style.games > 1 ? 's' : ''} partie${style.games > 1 ? 's' : ''} : ton jeu penche vers <b>${top[0]}</b> et <b>${top[1]}</b>.`;
    } else html += "Joue quelques parties contre l'ordinateur : j'analyserai ton style pour classer en premier les champions dont les idées te ressemblent. En attendant, ils sont dans l'ordre de l'histoire.";
    html += '</div>';
    html += `<label class="field-label">Niveau des cours</label><div class="segmented" id="champ-level">
      <button data-lv="same" class="${championLevel === 'same' ? 'on' : ''}" aria-pressed="${championLevel === 'same'}">À mon niveau</button>
      <button data-lv="above" class="${championLevel === 'above' ? 'on' : ''}" aria-pressed="${championLevel === 'above'}">Un cran au-dessus</button></div>
      <p class="pz-cap">Problèmes choisis pour ton Elo estimé (${estimatedElo()}) · partie d'application au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).</p>`;
    html += list.map(({ c, match }, i) => `<article class="champ-card">
      <div class="champ-head"><span class="ico">♚</span><div><b>${i + 1}. ${c.name}</b><small>${c.reign}</small></div>${match != null ? `<span class="chip ${match >= 75 ? 'ok' : match >= 60 ? 'warm' : 'free'}" title="Proximité avec ton style">${match} %</span>` : ''}</div>
      <p class="champ-tag">${c.tagline}${done[c.id] ? ' · cours suivi ✓' : ''}</p>
      <p class="pz-cap">${c.principles.map((p) => p.title).join(' · ')}</p>
      <div class="champ-actions"><button class="btn primary" data-champ-lesson="${c.id}">Cours guidé</button><button class="btn ghost" data-champ-game="${c.id}">Partie comme ${champShort(c)}</button></div>
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
  try { $('coach-img').src = window.Characters.dataUrl('B'); } catch { /* pas de portrait */ }

  /* ---------- Accueil ---------- */
  const randomColor = () => (Math.random() < 0.5 ? 'w' : 'b');
  $('btn-player-name').onclick = promptPlayerName;
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
  $('btn-continue').onclick = () => {
    const saved = store.get('game', null);
    if (saved && saved.cfg) startGame(saved.cfg, saved.moves, saved.result, saved.flipped, saved.terrain, saved.weather);
  };
  $('btn-stats').onclick = () => { returnTo = 'home'; show('stats'); };
  $('btn-rules').onclick = () => { returnTo = 'home'; show('rules'); };
  $('btn-about').onclick = () => { returnTo = 'home'; show('about'); };
  $('btn-settings').onclick = () => { returnTo = 'home'; renderSettings(); show('settings'); };

  /* ---------- Replay ---------- */
  const MODE_LABELS = { ai: 'Contre ordinateur', coach: 'Partie coachée', local: 'Deux joueurs' };
  const RESULT_LABELS = { '1-0': 'Victoire des Blancs', '0-1': 'Victoire des Noirs', '1/2-1/2': 'Partie nulle', '*': 'Partie inachevée' };
  const escHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDateTime = (id) => new Date(id).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function setReplayUi(on) {
    $('replay-bar').hidden = !on;
    $('game-actions').hidden = on;
  }
  function stopReplayPlay() {
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    const btn = $('rp-play');
    if (btn) btn.innerHTML = '<span>▶</span>Lecture';
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
  const REVIEW_LABELS = { best: 'Meilleur coup', good: 'Bon coup', inaccuracy: 'Imprécision', mistake: 'Erreur', blunder: 'Gaffe' };
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
        try { w = new Worker('analyse-worker.js'); } catch (err) { reject(err); return; }
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
  const fmtEval = (e) => (Math.abs(e) >= 1500 ? (e > 0 ? 'mat pour les Blancs' : 'mat pour les Noirs') : `${e > 0 ? '+' : ''}${(e / 100).toFixed(1).replace('.', ',')}`);

  function renderReview(rv, cur) {
    $('rp-review').hidden = !rv;
    if (!reviewing) {
      const btn = $('rp-analyse');
      btn.disabled = false;
      btn.textContent = !replay.review ? '📈 Analyser' : replay.showReview ? '📈 Masquer' : '📈 Analyse';
    }
    if (!rv) return;
    const n = rv.ev.length, X = (i) => (n > 1 ? (i / (n - 1)) * 200 : 0), Y = (e) => 32 - Math.tanh(e / 400) * 30;
    const pts = rv.ev.map((e, i) => `${X(i).toFixed(1)},${Y(e).toFixed(1)}`).join(' L');
    let svg = `<path class="g-area" d="M0,64 L${pts} L${X(n - 1).toFixed(1)},64 Z"/><line class="g-mid" x1="0" x2="200" y1="32" y2="32"/>`;
    rv.marks.forEach((m, i) => { if (isSevere(m)) svg += `<line class="g-bad" x1="${X(i + 1).toFixed(1)}" x2="${X(i + 1).toFixed(1)}" y1="54" y2="64"/>`; });
    svg += `<line class="g-cur" x1="${X(cur).toFixed(1)}" x2="${X(cur).toFixed(1)}" y1="0" y2="64"/>`;
    $('rp-graph').innerHTML = svg;
    const who = rv.accuracy;
    $('rp-acc').innerHTML = `${rv.opening ? `<b>${escHtml(rv.opening)}</b><br>` : ''}Précision : Blancs ${who.w == null ? '–' : who.w + ' %'} · Noirs ${who.b == null ? '–' : who.b + ' %'}`;
    const mark = rv.marks[cur - 1];
    let text = `Position de départ · évaluation ${fmtEval(rv.ev[0] || 0)}`;
    if (mark) {
      text = `<b>${escHtml(replay.sans[cur - 1])}${REVIEW_SIGN[mark[0]]}</b> — ${REVIEW_LABELS[mark[0]]} · évaluation ${fmtEval(rv.ev[cur])}`;
      if (['inaccuracy', 'mistake', 'blunder'].includes(mark[0])) {
        text += `<br>Meilleur coup : <b>${escHtml(sanOfBest(replay.fen, replay.moves, cur - 1, mark[2]))}</b> (perte ≈ ${(mark[1] / 100).toFixed(1).replace('.', ',')})`;
      }
    }
    $('rp-comment').innerHTML = text;
  }
  $('rp-analyse').onclick = () => {
    if (!replay || reviewing) return;
    if (replay.review) { replay.showReview = !replay.showReview; render(); return; }
    if (!replay.moves.length) return toast('Aucun coup à analyser.');
    const mine = replay, btn = $('rp-analyse');
    reviewing = true; btn.disabled = true; btn.textContent = '📈 0 %';
    requestReview(mine.fen, mine.moves, (done, total) => { btn.textContent = `📈 ${Math.round((done / total) * 100)} %`; })
      .then((r) => { mine.review = r; mine.showReview = true; })
      .catch(() => toast("L'analyse n'a pas pu être lancée sur cet appareil."))
      .finally(() => { reviewing = false; if (replay) render(); });
  };
  const jumpToSevere = (dir) => {
    if (!replay || !replay.review) return;
    for (let p = replay.index + dir; p >= 1 && p <= replay.moves.length; p += dir) if (isSevere(replay.review.marks[p - 1])) return navigate(p);
    toast(dir > 0 ? 'Plus de faute après ce coup.' : 'Plus de faute avant ce coup.');
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
    if (c.mode === 'local') return { white: 'Joueur 1', black: 'Joueur 2' };
    const ai = c.mode === 'coach' ? 'Maître Hiro' : `Ordinateur ${LEVEL_NAMES[c.level] || ''}`.trim();
    return c.playerColor === 'w' ? { white: 'Joueur', black: ai } : { white: ai, black: 'Joueur' };
  };
  function pgnFor(entry) {
    const fen = entry.fen || window.Chess.START_FEN, G = new Game(fen), san = [];
    for (const u of entry.moves || []) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
    const st = G.status(), res = entry.result && entry.result !== '*' ? entry.result : st.over ? st.result : '*';
    const tags = { Event: entry.event || 'Partie Cavalier', Site: 'Cavalier', Date: entry.date || pgnDate(Date.now()), White: entry.white || 'Blancs', Black: entry.black || 'Noirs', Result: res };
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
  $('rp-pgn').onclick = () => {
    if (!replay) return;
    saveFile(`cavalier-partie-${stamp()}.pgn`, pgnFor({ ...replay, opening: replay.review && replay.review.opening }));
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
    try { await navigator.clipboard.writeText(url); toast('Lien de la partie copié'); }
    catch { modal({ title: 'Lien de partage', text: url, actions: [{ label: 'Fermer', primary: true }] }); }
  };
  function openSharedLink() {
    const match = /^#r=([\w-]+)$/.exec(location.hash);
    if (!match) return;
    history.replaceState(history.state, '', location.pathname + location.search);
    try {
      const p = fromB64(match[1]);
      if (typeof p.m !== 'string' || p.m.length > 30000) throw new Error('lien');
      const entry = { moves: p.m ? p.m.split(' ') : [], fen: typeof p.f === 'string' ? p.f : undefined, title: String(p.t || 'Partie partagée').slice(0, 80), white: p.w ? String(p.w).slice(0, 60) : undefined, black: p.b ? String(p.b).slice(0, 60) : undefined, result: ['1-0', '0-1', '1/2-1/2'].includes(p.r) ? p.r : '*' };
      if (entry.fen && fenError(entry.fen)) throw new Error('fen');
      startReplay(entry, () => show('home'));
    } catch { replay = null; toast('Lien de partage invalide.'); }
  }

  // Bilan de Maître Hiro à la fin d'une partie
  const PHASE_ADVICE = {
    ouverture: "Ouverture : développe tes pièces, prends le centre et roque tôt avant de lancer des attaques.",
    milieu: "Milieu de partie : avant chaque coup, cherche les menaces adverses (échecs, prises, pièces non défendues), puis tes propres tactiques.",
    finale: "Finale : active ton roi, pousse tes pions libres et calcule les coups forcés jusqu'au bout.",
  };
  const phaseOf = (ply0) => (ply0 < 20 ? 'ouverture' : ply0 < 60 ? 'milieu' : 'finale');
  let bilanId = 0;
  function showBilan(snap) {
    const my = ++bilanId;
    modal({ title: 'Bilan de Maître Hiro', text: 'Analyse de la partie…', actions: [{ label: 'Fermer', ghost: true, onClick: () => { bilanId++; } }] });
    requestReview(window.Chess.START_FEN, snap.moves, (done, total) => {
      if (my === bilanId && !$('modal').hidden) $('modal-text').textContent = `Analyse de la partie… ${done} / ${total} coups`;
    }).then((r) => { if (my === bilanId && !$('modal').hidden) renderBilan(snap, r); })
      .catch(() => { if (my === bilanId) { closeModal(); toast("L'analyse n'a pas pu être lancée sur cet appareil."); } });
  }
  function renderBilan(snap, r) {
    const local = snap.cfg.mode === 'local', me = snap.cfg.playerColor;
    const mine = [];
    r.marks.forEach((m, i) => { if (isSevere(m) && (local || (i % 2 ? 'b' : 'w') === me)) mine.push({ i, cls: m[0], loss: m[1], best: m[2] }); });
    const top = mine.slice().sort((a, b) => b.loss - a.loss).slice(0, 3).sort((a, b) => a.i - b.i);
    const sans = []; { const g = new Game(window.Chess.START_FEN); for (const u of snap.moves) { const x = g.playUci(u); if (!x) break; sans.push(x.san); } }
    const num = (i) => `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'}`;
    const acc = (c) => (r.accuracy[c] == null ? '–' : `${r.accuracy[c]} %`);
    let html = '';
    if (r.opening) html += `<p><b>Ouverture :</b> ${escHtml(r.opening)}</p>`;
    html += local ? `<p><b>Précision :</b> Blancs ${acc('w')} · Noirs ${acc('b')}</p>` : `<p><b>Précision :</b> toi ${acc(me)} · adversaire ${acc(me === 'w' ? 'b' : 'w')}</p>`;
    if (top.length) {
      html += `<p><b>Tes ${top.length > 1 ? `${top.length} principales erreurs` : 'principale erreur'} :</b></p><ul>` + top.map((t) => {
        const best = sanOfBest(window.Chess.START_FEN, snap.moves, t.i, t.best);
        return `<li>Coup ${num(t.i)} ${escHtml(sans[t.i])}${REVIEW_SIGN[t.cls]} — meilleur : ${escHtml(best)} (perte ≈ ${(t.loss / 100).toFixed(1).replace('.', ',')})</li>`;
      }).join('') + '</ul>';
      const counts = { ouverture: 0, milieu: 0, finale: 0 };
      mine.forEach((m) => { counts[phaseOf(m.i)]++; });
      const worst = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      html += `<p><b>Conseil :</b> ${PHASE_ADVICE[worst]}</p>`;
    } else {
      html += '<p>Aucune erreur grave repérée : partie très propre, bravo ! Continue à calculer les coups forcés avant chaque décision.</p>';
    }
    const body = document.createElement('div');
    body.className = 'bilan';
    body.innerHTML = html;
    const names = sideNames(snap.cfg);
    modal({
      title: 'Bilan de Maître Hiro', body,
      actions: [
        { label: "Revoir avec l'analyse", primary: true, onClick: () => startReplay({ moves: snap.moves, result: snap.result, title: 'Ma dernière partie', ...names, flipped: !local && me === 'b' }, () => show('home')) },
        { label: 'Exporter en PGN', onClick: () => saveFile(`cavalier-partie-${stamp()}.pgn`, pgnFor({ moves: snap.moves, result: snap.result, opening: r.opening, ...names })) },
        { label: 'Fermer', ghost: true },
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
    replay = { moves: (entry.moves || []).slice(0, sans.length), sans, fen, index: 0, title: entry.title || 'Partie', result: entry.result || '*', back, white: entry.white, black: entry.black, event: entry.event, date: entry.date };
    replay.review = loadReview(reviewKey(fen, replay.moves));
    replay.showReview = !!replay.review;
    cfg = { mode: 'local', playerColor: 'w', level: 1 };
    result = null; selected = -1; hint = null;
    flipped = !!entry.flipped;
    $('terrain-name').textContent = '';
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
    if (animateNext && game.inCheck()) shout(game.status().over ? 'Échec et mat !' : 'Échec !');
    replay.index = n;
    render();
  }
  function renderReplay() {
    renderBoard(); renderPlayers();
    const ol = $('moves'); ol.innerHTML = '';
    const sans = replay.sans, cur = replay.index;
    const rv = replay.review && replay.showReview ? replay.review : null;
    const BAD = ['inaccuracy', 'mistake', 'blunder'];
    for (let i = 0; i < sans.length; i += 2) {
      const cell = (ply) => {
        const mark = replay.review && replay.review.marks[ply - 1];
        const bad = mark && BAD.includes(mark[0]);
        const cls = [ply === cur ? 'cur' : '', bad ? `q-${mark[0]}` : ''].filter(Boolean).join(' ');
        return `<span data-ply="${ply}"${cls ? ` class="${cls}"` : ''}>${escHtml(sans[ply - 1])}${bad ? REVIEW_SIGN[mark[0]] : ''}</span>`;
      };
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i + 1)} ${sans[i + 1] ? cell(i + 2) : ''}`;
      ol.appendChild(li);
    }
    renderReview(rv, cur);
    const current = ol.querySelector('.cur');
    if (current) current.scrollIntoView({ block: 'nearest' });
    const side = game.turn === 'w' ? 'Blancs' : 'Noirs';
    const atEnd = cur === sans.length;
    const status = $('status');
    status.classList.remove('alert');
    status.textContent = sans.length ? `Coup ${cur} / ${sans.length} · Trait aux ${side}${game.inCheck() ? ' · Échec' : ''}` : `Position · Trait aux ${side}`;
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
    $('rp-play').innerHTML = '<span>⏸</span>Pause';
    // Attend la fin de l'animation en cours (duels, techniques) avant le coup suivant
    const tick = () => {
      if (!replay || replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      gotoPly(replay.index + 1, true);
      if (replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      const busy = b3d && b3d.busyUntil ? b3d.busyUntil * 1000 - performance.now() : 0;
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
    const source = mode === 'local' ? store.get('localArchive', []) : store.get('archive', []).filter((g) => (g.mode || 'ai') === mode);
    $('replay-list-title').textContent = `Replay · ${MODE_LABELS[mode]}`;
    const body = $('replay-list-body');
    if (!source.length) {
      body.innerHTML = `<p class="level-help">Aucune partie terminée dans ce mode pour le moment. Les parties « ${MODE_LABELS[mode]} » apparaîtront ici à la fin de chaque partie.</p>`;
    } else {
      body.innerHTML = '<div class="replay-items">' + source.map((g, i) => [g, i]).reverse().map(([g, i]) => {
        const who = mode === 'local' ? '' : ` · ${mode === 'coach' ? 'Maître Hiro' : LEVEL_NAMES[g.level] || ''} · vous : ${g.color === 'w' ? 'Blancs' : 'Noirs'}`;
        return `<button type="button" class="btn replay-item" data-i="${i}"><strong>${escHtml(fmtDateTime(g.id))}</strong><span>${Math.ceil(g.moves.length / 2)} coups${escHtml(who)} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}</span></button>`;
      }).join('') + '</div>';
    }
    body.onclick = (e) => {
      const b = e.target.closest('.replay-item'); if (!b) return;
      const g = source[Number(b.dataset.i)]; if (!g) return;
      startReplay({ moves: g.moves, result: g.result, title: `${MODE_LABELS[mode]} · ${fmtDateTime(g.id)}`, flipped: mode !== 'local' && g.color === 'b', date: pgnDate(g.id), ...sideNames({ mode, playerColor: g.color, level: g.level }) }, () => openReplayList(mode));
    };
    returnTo = 'home';
    show('replay-list');
  }

  const looksLikeFen = (text) => /^\s*[prnbqkPRNBQK1-8]+(?:\/[prnbqkPRNBQK1-8]+){7}\s+[wb]\b/.test(text) && !/\[/.test(text);
  function fenError(fen) {
    const ranks = fen.split(/\s+/)[0].split('/');
    if (ranks.length !== 8) return 'FEN invalide : 8 rangées attendues.';
    for (const rank of ranks) {
      const width = [...rank].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 1), 0);
      if (width !== 8) return 'FEN invalide : une rangée ne compte pas 8 cases.';
    }
    const board = fen.split(/\s+/)[0];
    if ((board.match(/K/g) || []).length !== 1 || (board.match(/k/g) || []).length !== 1) return 'FEN invalide : un roi blanc et un roi noir sont requis.';
    if (/[pP]/.test(ranks[0] + ranks[7])) return 'FEN invalide : pion sur la première ou la dernière rangée.';
    return '';
  }
  function addExternal(text) {
    const src = text.replace(/^\uFEFF/, '').trim();
    if (!src) return toast('Collez un PGN ou un FEN.');
    const entries = [];
    if (looksLikeFen(src)) {
      const fen = src.split(/\r?\n/)[0].trim().replace(/\s+/g, ' ');
      const err = fenError(fen);
      if (err) return toast(err);
      entries.push({ kind: 'fen', title: 'Position FEN', fen, moves: [], result: '*' });
    } else {
      const parsed = parsePgn(src);
      if (!parsed.games.length) return toast(`PGN invalide${parsed.error ? ` : ${parsed.error}` : '.'}`);
      for (const g of parsed.games) {
        entries.push({ kind: 'pgn', title: `${g.tags.White || 'Blancs'} – ${g.tags.Black || 'Noirs'}`, white: g.tags.White, black: g.tags.Black, event: g.tags.Event || '', date: g.tags.Date || '', moves: g.moves, result: g.result !== '*' ? g.result : g.status.over ? g.status.result : '*' });
      }
    }
    const list = store.get('external', []), now = Date.now();
    entries.forEach((entry, i) => list.push({ ...entry, id: now + i }));
    store.set('external', list.slice(-50));
    $('ext-text').value = '';
    renderExternal();
    toast(`${entries.length} partie${entries.length > 1 ? 's' : ''} chargée${entries.length > 1 ? 's' : ''}`);
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
      ? '<div class="replay-items">' + list.slice().reverse().map((g) => `<div class="replay-row"><button type="button" class="btn replay-item" data-open="${g.id}"><strong>${escHtml(g.title)}</strong><span>${g.kind === 'fen' ? 'Position FEN' : `${Math.ceil(g.moves.length / 2)} coups · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}${g.event ? ` · ${escHtml(g.event)}` : ''}`} · chargée le ${escHtml(fmtDateTime(g.id))}</span></button><button type="button" class="btn ghost replay-del" data-del="${g.id}" aria-label="Supprimer">✕</button></div>`).join('') + '</div>'
      : '<p class="level-help">Aucune partie chargée pour le moment. Les parties chargées sont conservées ici.</p>';
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
    try { addExternal(await f.text()); } catch { toast('Le fichier n’a pas pu être lu.'); }
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
      toast('Affichage lent détecté : mode léger activé (modifiable dans Réglages).');
    };
  } catch (err) {
    b3d = null; // pas de WebGL : plateau 2D
  }

  const savedGame = store.get('game', null);
  const savedScreen = store.get('lastScreen', null);
  const restorableScreens = ['home', 'program', 'champions', 'setup', 'game', 'settings', 'problems', 'stats', 'rules', 'about'];
  const initialScreen = restorableScreens.includes(savedScreen)
    ? savedScreen
    : savedGame && savedGame.cfg ? 'game' : 'home';
  if (initialScreen === 'game' && savedGame && savedGame.cfg) {
    startGame(savedGame.cfg, savedGame.moves, savedGame.result, savedGame.flipped, savedGame.terrain, savedGame.weather);
  } else {
    if (initialScreen === 'setup') renderSetup();
    if (initialScreen === 'settings') renderSettings();
    show(initialScreen);
  }
  if (initialScreen === 'home' && !playerProfile().nameAsked) setTimeout(promptPlayerName, 250);
  openSharedLink();
  setTimeout(analyseNext, 3000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
