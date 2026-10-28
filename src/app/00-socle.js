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

