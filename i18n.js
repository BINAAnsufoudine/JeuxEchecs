/* Cavalier — langue de l'interface : français si le navigateur est en français, anglais sinon.
   L(fr, en) choisit le texte de la langue active ; translatePage traduit les textes fixes de index.html. */
(function (root) {
  'use strict';
  const nav = root.navigator || {};
  const first = (nav.languages && nav.languages[0]) || nav.language || 'en';
  // ?lang=fr ou ?lang=en dans l'adresse force la langue (utile pour tester)
  let forced = null;
  try { forced = new URLSearchParams(root.location.search).get('lang'); } catch { /* pas d'adresse */ }
  const lang = forced === 'fr' || forced === 'en' ? forced : /^fr\b/i.test(first) ? 'fr' : 'en';
  root.LANG = lang;
  root.LOCALE = lang === 'fr' ? 'fr-FR' : 'en-US';
  root.L = (fr, en) => (lang === 'fr' || en == null ? fr : en);
  // Accord en nombre : P(n, 'partie', 'parties', 'game', 'games')
  root.P = (n, frOne, frMany, enOne, enMany) => (lang === 'fr' ? (n > 1 ? frMany : frOne) : (n === 1 ? enOne : enMany));
  // Nombre décimal à l'écriture locale (virgule en français)
  root.NUM = (x, digits = 1) => { const s = Number(x).toFixed(digits); return lang === 'fr' ? s.replace('.', ',') : s; };

  // Textes fixes de la page d'accueil et des écrans (index.html)
  const PAGE = {
    'Ata Wawé · Échecs': 'Ata Wawé · Chess',
    'Elo estimé : 600': 'Estimated Elo: 600',
    'Modifier': 'Edit',
    'Programme personnalisé': 'Personal training plan',
    'Avec Maître Sissa': 'With Master Sissa',
    'Continuer le programme': 'Continue the plan',
    'Continuer mon entraînement': 'Continue my training',
    'Partie coachée': 'Coached game',
    'Progresser': 'Improve',
    'Problèmes': 'Puzzles',
    'Problème': 'Puzzle',
    'Comme un champion': 'Like a champion',
    'Jouer': 'Play',
    'Reprendre la partie': 'Resume game',
    'Nouvelle partie': 'New game',
    'Construire une position': 'Set up a position',
    '(La légende de Sissa)': '(The legend of Sissa)',
    'La légende de Sissa': 'The legend of Sissa',
    'Positions libres': 'Custom positions',
    'Se connecter': 'Sign in',
    'Jouer en ligne': 'Play online',
    'En ligne': 'Online',
    'Mon compte': 'My account',
    'Tournois': 'Tournaments',
    'Mon profil': 'My profile',
    '▶ Reprendre': '▶ Resume',
    'Boutique de Sissa': 'Sissa\'s shop',
    'Apprendre': 'Learn',
    'Défi du jour': 'Daily challenge',
    'Les mats': 'Checkmates',
    'Finales de base': 'Basic endgames',
    'Ouvertures': 'Openings',
    'Devine le coup': 'Guess the move',
    'Replay': 'Replay',
    'Contre ordinateur': 'Against the computer',
    'Deux joueurs': 'Two players',
    'Parties externes': 'External games',
    'Statistiques': 'Statistics',
    'Règles et conseils': 'Rules and tips',
    'Réglages': 'Settings',
    'À propos': 'About',
    'Fermer le menu': 'Close the menu',
    'Ouvrir le menu': 'Open the menu',
    'Retour': 'Back',
    'Adversaire': 'Opponent',
    'Ordinateur': 'Computer',
    'Commencer': 'Start',
    'Ta couleur est tirée au sort au début de chaque partie.': 'Your color is drawn at random at the start of each game.',
    'Niveau :': 'Level:',
    'Niveau': 'Level',
    'Touche un niveau débloqué pour le rejouer. Gagne au plus haut niveau pour débloquer le suivant.': 'Tap an unlocked level to play it again. Win at the highest level to unlock the next one.',
    'Menu': 'Menu',
    'Partie': 'Game',
    'Échiquier': 'Chessboard',
    'Aperçu 2D jouable ; le faire glisser pour le déplacer, tirer sur le bord gauche ou inférieur pour redimensionner': 'Playable 2D preview; drag it to move it, pull its left or bottom edge to resize it',
    'Coups joués': 'Moves played',
    'Prises recommandées du camp au trait': 'Recommended captures for the side to move',
    'Prises recommandées adverses': 'Recommended captures for the opponent',
    'Début': 'Start',
    'Coup précédent': 'Previous move',
    'Précédent': 'Previous',
    'Lecture': 'Play',
    'Coup suivant': 'Next move',
    'Suivant': 'Next',
    'Fin': 'End',
    'Tourner le plateau': 'Flip the board',
    'Tourner': 'Flip',
    'Analyser la partie': 'Analyse the game',
    '📈 Analyser': '📈 Analyse',
    'Exporter en PGN': 'Export as PGN',
    'Copier un lien de partage': 'Copy a share link',
    '🔗 Lien': '🔗 Link',
    "Courbe d'avantage": 'Advantage graph',
    '◀ Faute': '◀ Mistake',
    'Faute ▶': 'Mistake ▶',
    'Annuler': 'Undo',
    'Indice': 'Hint',
    'Abandon': 'Resign',
    'Solution': 'Solution',
    'Coller un PGN ou un FEN': 'Paste a PGN or a FEN',
    '[Event "…"] 1. e4 e5 …   ou   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': '[Event "…"] 1. e4 e5 …   or   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'Charger': 'Load',
    'Ouvrir un fichier PGN': 'Open a PGN file',
    'Historique des parties chargées': 'Loaded games history',
    'Plateau': 'Board',
    'Montrer les coups possibles': 'Show possible moves',
    'Afficher les coordonnées': 'Show coordinates',
    'Sons': 'Sounds',
    'Promotion automatique en dame': 'Always promote to a queen',
    "Voix de l'entraîneur": "Coach's voice",
    'Afficher Maître Sissa sur tous les écrans': 'Show Master Sissa on every screen',
    'Mode léger (3D allégé : sans ombres, 30 images/s)': 'Light mode (simpler 3D: no shadows, 30 frames/s)',
    'Ma progression': 'My progress',
    "Sauvegarde ta progression (niveaux, statistiques, entraînement, parties) dans un fichier, pour la réimporter ici ou dans une autre application. Les parties sont aussi au format PGN, lisible par la plupart des applications d'échecs.": 'Save your progress (levels, statistics, training, games) to a file, to import it here or into another app. Games are also exported as PGN, which most chess apps can read.',
    'Exporter ma progression': 'Export my progress',
    'Exporter mes parties (PGN)': 'Export my games (PGN)',
    'Importer une progression ou charger des parties': 'Import progress or load games',
    'Thème': 'Theme',
    'Le but': 'The goal',
    "Mettez le roi adverse en échec et mat : il est attaqué et ne peut plus s'échapper. Si le joueur au trait n'a aucun coup légal sans être en échec, c'est le pat, et la partie est nulle.": "Checkmate the enemy king: it is attacked and cannot escape. If the player to move has no legal move and is not in check, it is stalemate and the game is a draw.",
    'Les pièces': 'The pieces',
    'Roi': 'King', 'Dame': 'Queen', 'Tour': 'Rook', 'Fou': 'Bishop', 'Cavalier': 'Knight', 'Pion': 'Pawn',
    ': une case dans toutes les directions.': ': one square in any direction.',
    ": autant de cases qu'elle veut, en ligne droite ou en diagonale.": ': any number of squares, in a straight line or diagonally.',
    ': en ligne droite, horizontalement ou verticalement.': ': in a straight line, horizontally or vertically.',
    ': en diagonale, toujours sur la même couleur de case.': ': diagonally, always on the same square color.',
    ": en « L », et c'est la seule pièce qui saute par-dessus les autres.": ': in an “L” shape, and it is the only piece that jumps over the others.',
    ": avance d'une case (deux au premier coup) et prend en diagonale.": ': moves forward one square (two on its first move) and captures diagonally.',
    'Les coups spéciaux': 'Special moves',
    'Roque': 'Castling',
    ": le roi glisse de deux cases vers une tour qui saute de l'autre côté. Ni l'un ni l'autre ne doivent avoir bougé, et le roi ne peut ni être en échec ni traverser une case attaquée.": ': the king slides two squares toward a rook, which jumps to its other side. Neither may have moved, and the king may not be in check or cross an attacked square.',
    'Prise en passant': 'En passant',
    ": quand un pion avance de deux cases et arrive à côté d'un pion adverse, celui-ci peut le prendre comme s'il n'avait avancé que d'une case, mais seulement au coup suivant.": ': when a pawn advances two squares and lands next to an enemy pawn, that pawn may capture it as if it had moved only one square, but only on the very next move.',
    'Promotion': 'Promotion',
    ': un pion qui atteint la dernière rangée devient la pièce de votre choix (sauf un roi).': ': a pawn that reaches the last rank becomes the piece of your choice (except a king).',
    'Les parties nulles': 'Draws',
    'Pat, même position trois fois, cinquante coups de chaque côté sans prise ni mouvement de pion, ou matériel trop faible pour mater.': 'Stalemate, the same position three times, fifty moves by each side without a capture or pawn move, or too little material to checkmate.',
    'Quatre conseils pour progresser': 'Four tips to improve',
    "Occupez le centre avec vos pions dès l'ouverture.": 'Take the center with your pawns from the opening.',
    'Sortez cavaliers et fous avant de jouer la dame.': 'Develop knights and bishops before moving the queen.',
    "Roquez tôt pour mettre votre roi à l'abri.": 'Castle early to keep your king safe.',
    "Avant chaque coup, demandez-vous ce que menace l'adversaire.": 'Before each move, ask yourself what your opponent is threatening.',
    'Ata Wawé rend les échecs accessibles à tous.': 'Ata Wawé makes chess accessible to everyone.',
    'Jouez contre l’ordinateur ou à deux, et rejouez les niveaux débloqués.': 'Play against the computer or with a friend, and replay unlocked levels.',
    'Entraînez-vous avec des problèmes et les conseils de Maître Sissa.': "Train with puzzles and Master Sissa's advice.",
    'Créateur : Ansufoudine BINA': 'Creator: Ansufoudine BINA',
    'Contact :': 'Contact:',
    'Maître Sissa': 'Master Sissa',
    'Coach d’échecs': 'Chess coach',
    'Réduire le coach': 'Minimize the coach',
    'Couper la voix': 'Mute the voice',
  };
  root.PAGE_EN = PAGE;
  root.translatePage = (el) => {
    if (lang === 'fr' || !el) return;
    const walker = root.document.createTreeWalker(el, 4);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const raw = n.data, key = raw.trim();
      if (key && PAGE[key] != null) n.data = raw.replace(key, PAGE[key]);
    }
    for (const node of el.querySelectorAll('[aria-label],[title],[placeholder]')) {
      for (const a of ['aria-label', 'title', 'placeholder']) {
        const v = node.getAttribute(a);
        if (v && PAGE[v] != null) node.setAttribute(a, PAGE[v]);
      }
    }
  };
  if (root.document) {
    root.document.documentElement.lang = lang;
    if (lang === 'en') {
      root.document.title = PAGE[root.document.title] || root.document.title;
      root.translatePage(root.document.body);
    }
  }
})(typeof self !== 'undefined' ? self : globalThis);
