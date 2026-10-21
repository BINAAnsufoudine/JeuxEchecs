/* Cavalier — « Apprendre » : mats guidés, finales de base, ouvertures et parties célèbres.
   Les coups sont écrits en notation algébrique (SAN) et convertis par le moteur au chargement ;
   une ligne qui ne se joue pas est écartée. */
window.TRAINER = (function () {
  'use strict';
  const L = window.L;

  // Mats guidés : une démonstration commentée, puis un ou deux exercices (fen + coups, le joueur commence)
  const MATES = [
    { id: 'couloir', name: L('Le mat du couloir', 'Back-rank mate'),
      text: L('Le roi est enfermé derrière ses propres pions : il n\'a aucune case de fuite. Une tour ou une dame sur la dernière rangée suffit à le mater.', 'The king is shut in behind its own pawns: it has no escape square. A rook or queen on the back rank is enough to mate it.'),
      demo: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', marks: ['g8', 'f7', 'g7', 'h7'],
      ex: [{ fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', san: ['Rd8#'] }, { fen: '1r4k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', san: ['Rb1#'] }] },
    { id: 'baiser', name: L('Le baiser de la mort', 'The kiss of death'),
      text: L('La dame vient se coller au roi, protégée par une autre pièce : le roi ne peut ni la prendre, ni s\'enfuir.', 'The queen moves right next to the king, protected by another piece: the king can neither take it nor escape.'),
      demo: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1', marks: ['b7', 'b6'],
      ex: [{ fen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1', san: ['Qb7#'] }, { fen: '6k1/5p1p/6pB/8/3Q4/8/5PPP/6K1 w - - 0 1', san: ['Qg7#'] }] },
    { id: 'etouffe', name: L('Le mat à l\'étouffée', 'Smothered mate'),
      text: L('Le roi est entouré de ses propres pièces : seul un cavalier, qui saute par-dessus tout, peut l\'atteindre.', 'The king is surrounded by its own pieces: only a knight, which jumps over everything, can reach it.'),
      demo: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', marks: ['f7', 'g8', 'g7', 'h7'],
      ex: [{ fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', san: ['Nf7#'] }, { fen: 'r6k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1', san: ['Qg8+', 'Rxg8', 'Nf7#'], note: L('Le coup de Philidor : sacrifie la dame pour que la tour bouche la dernière case.', 'Philidor\'s legacy: sacrifice the queen so that the rook blocks the last square.') }] },
    { id: 'anastasie', name: L('Le mat d\'Anastasie', 'Anastasia\'s mate'),
      text: L('Un cavalier en e7 coupe les cases g8 et g6, le pion g7 bloque le roi : une tour sur la colonne h le mate.', 'A knight on e7 covers g8 and g6, the g7 pawn blocks the king: a rook on the h-file mates it.'),
      demo: '5r2/4Nppk/8/8/8/4R3/5PPP/6K1 w - - 0 1', marks: ['e7', 'g8', 'g6', 'h3'],
      ex: [{ fen: '5r2/4Nppk/8/8/8/4R3/5PPP/6K1 w - - 0 1', san: ['Rh3#'] }] },
    { id: 'boden', name: L('Le mat de Boden', 'Boden\'s mate'),
      text: L('Deux fous croisent leurs diagonales devant le roi roqué du côté de la dame : l\'un coupe la fuite, l\'autre donne le mat.', 'Two bishops cross their diagonals in front of the queenside-castled king: one cuts off the escape, the other mates.'),
      demo: '2kr4/p2n4/8/8/5B2/8/4B3/6K1 w - - 0 1', marks: ['b8', 'c7', 'a6'],
      ex: [{ fen: '2kr4/p2n4/8/8/5B2/8/4B3/6K1 w - - 0 1', san: ['Ba6#'] }] },
    { id: 'arabe', name: L('Le mat arabe', 'Arabian mate'),
      text: L('La tour mate le roi dans le coin, protégée par le cavalier qui couvre aussi la case de fuite.', 'The rook mates the king in the corner, protected by the knight which also covers the escape square.'),
      demo: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', marks: ['h7', 'g8', 'f6'],
      ex: [{ fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', san: ['Rh7#'] }] },
    { id: 'epaulettes', name: L('Le mat des épaulettes', 'Epaulette mate'),
      text: L('Le roi est coincé entre ses deux tours, comme entre deux épaulettes : la dame le mate en face.', 'The king is stuck between its two rooks, like between two epaulettes: the queen mates it from the front.'),
      demo: '3rkr2/8/8/8/8/8/8/4Q1K1 w - - 0 1', marks: ['d8', 'f8', 'e6'],
      ex: [{ fen: '3rkr2/8/8/8/8/8/8/4Q1K1 w - - 0 1', san: ['Qe6#'] }] },
    { id: 'damiano', name: L('Le mat de Damiano', 'Damiano\'s mate'),
      text: L('La dame se pose en h7, protégée par un pion en g6 : le roi est mat devant son propre roque.', 'The queen lands on h7, protected by a pawn on g6: the king is mated in front of its own castle.'),
      demo: '5rk1/5p2/6P1/8/8/8/8/6KQ w - - 0 1', marks: ['h7', 'g6'],
      ex: [{ fen: '5rk1/5p2/6P1/8/8/8/8/6KQ w - - 0 1', san: ['Qh7#'] }] },
    { id: 'opera', name: L('Le mat de l\'Opéra (Morphy)', 'The Opera mate (Morphy)'),
      text: L('Une tour sur la dernière rangée, protégée par un fou qui coupe aussi la fuite du roi : c\'est le mat de la célèbre « partie de l\'Opéra ».', 'A rook on the back rank, protected by a bishop that also cuts off the king\'s escape: the mate of the famous "Opera game".'),
      demo: '4kb1r/5ppp/8/6B1/8/8/8/3R2K1 w - - 0 1', marks: ['d8', 'g5', 'e7'],
      ex: [{ fen: '4kb1r/5ppp/8/6B1/8/8/8/3R2K1 w - - 0 1', san: ['Rd8#'] }] },
    { id: 'escalier', name: L('Le mat de l\'escalier', 'The ladder mate'),
      text: L('Deux tours avancent l\'une après l\'autre, rangée par rangée, comme les marches d\'un escalier : l\'une coupe, l\'autre donne échec.', 'Two rooks advance one after the other, rank by rank, like the steps of a ladder: one cuts off, the other gives check.'),
      demo: '7k/1R6/8/8/8/8/8/R5K1 w - - 0 1', marks: ['b7', 'a8'],
      ex: [{ fen: '7k/1R6/8/8/8/8/8/R5K1 w - - 0 1', san: ['Ra8#'] }] },
    { id: 'berger', name: L('Le mat du berger', 'Scholar\'s mate'),
      text: L('Le piège le plus connu des débutants : la dame et le fou visent ensemble le point faible f7, protégé seulement par le roi.', 'The best-known beginner trap: the queen and bishop aim together at the weak f7 square, protected only by the king.'),
      moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'], marks: ['f7'],
      ex: [{ moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'], san: ['Qxf7#'] }],
      tip: L('Pour t\'en défendre : protège f7 avec g6 ou Qe7, ou chasse la dame en la menaçant.', 'To defend against it: protect f7 with g6 or Qe7, or chase the queen away by threatening it.') },
    { id: 'lion', name: L('Le mat du lion (du fou)', 'Fool\'s mate'),
      text: L('Le mat le plus rapide possible : en deux coups, les Blancs ouvrent eux-mêmes la diagonale de leur roi.', 'The fastest possible mate: in two moves, White opens the diagonal to their own king.'),
      moves: ['f3', 'e5', 'g4'], marks: ['h4', 'e1'],
      ex: [{ moves: ['f3', 'e5', 'g4'], san: ['Qh4#'] }] },
    { id: 'legal', name: L('Le mat de Légal', 'Légal\'s mate'),
      text: L('Un piège d\'ouverture où l\'on sacrifie sa dame : le cavalier prend en e5, et si le fou mange la dame, les pièces mineures matent.', 'An opening trap where you sacrifice your queen: the knight takes on e5, and if the bishop eats the queen, the minor pieces mate.'),
      moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1'], marks: ['f7', 'd5'],
      ex: [{ moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1'], san: ['Bxf7+', 'Ke7', 'Nd5#'] }] },
  ];

  // Finales de base : la méthode expliquée, puis la position à jouer contre l'ordinateur
  const ENDGAMES = [
    { id: 'kqk', name: L('Roi et dame contre roi', 'King and queen vs king'), goal: 'win', color: 'w', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
      steps: [
        L('La dame seule ne peut pas mater : il faut l\'aide du roi. La méthode : avec la dame, enferme le roi adverse dans un rectangle de plus en plus petit, en restant à un saut de cavalier de lui.', 'The queen alone cannot mate: the king must help. The method: with the queen, box the enemy king into a smaller and smaller rectangle, staying a knight\'s jump away from it.'),
        L('Quand le roi est sur le bord, n\'avance plus la dame : amène ton roi tout près. Attention au pat : laisse toujours une case au roi adverse tant que tu ne donnes pas échec.', 'Once the king is on the edge, stop moving the queen: bring your king close. Beware of stalemate: always leave the enemy king a square until you give check.'),
      ] },
    { id: 'krk', name: L('Roi et tour contre roi', 'King and rook vs king'), goal: 'win', color: 'w', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
      steps: [
        L('La tour coupe le roi adverse sur une rangée ou une colonne. Ton roi vient se placer face à lui (opposition) pour l\'empêcher de revenir.', 'The rook cuts off the enemy king along a rank or file. Your king comes to face it (opposition) to stop it from coming back.'),
        L('Quand les rois sont face à face, la tour donne échec et repousse le roi d\'une rangée. Si la tour est attaquée, éloigne-la sur la même ligne.', 'When the kings face each other, the rook gives check and pushes the king back one rank. If the rook is attacked, move it away along the same line.'),
      ] },
    { id: 'kbbk', name: L('Roi et deux fous contre roi', 'King and two bishops vs king'), goal: 'win', color: 'w', fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
      steps: [
        L('Les deux fous, côte à côte, forment un mur diagonal que le roi ne peut pas traverser. Avec ton roi, repousse le roi adverse vers un coin.', 'The two bishops, side by side, form a diagonal wall the king cannot cross. With your king, push the enemy king towards a corner.'),
        L('Le mat se donne dans un coin, de n\'importe quelle couleur. Fais attention au pat quand le roi n\'a plus que deux cases.', 'The mate is given in a corner, of any colour. Watch out for stalemate when the king only has two squares left.'),
      ] },
    { id: 'lucena', name: L('La position de Lucena', 'The Lucena position'), goal: 'win', color: 'w', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
      steps: [
        L('Ton pion est presque à dame, mais ton roi est enfermé devant lui. La clé : « construire un pont ».', 'Your pawn is almost queening, but your king is stuck in front of it. The key: "build a bridge".'),
        L('Donne d\'abord un échec pour éloigner le roi noir, puis place ta tour sur la 4e rangée. Quand ton roi sortira, la tour s\'interposera contre les échecs de côté.', 'First give a check to push the black king away, then place your rook on the 4th rank. When your king comes out, the rook will block the side checks.'),
      ] },
    { id: 'philidor', name: L('La défense de Philidor', 'The Philidor defence'), goal: 'draw', color: 'b', fen: '4k3/1R6/r7/3KP3/8/8/8/8 b - - 0 1',
      steps: [
        L('Ici, tu défends avec les Noirs : une tour et un pion de moins, mais la nulle est possible. Le principe de Philidor : ta tour garde la 6e rangée pour empêcher le roi blanc d\'avancer.', 'Here you defend with Black: a pawn down, but a draw is possible. Philidor\'s principle: your rook guards the 6th rank to stop the white king from advancing.'),
        L('Dès que le pion avance en 6e rangée, ta tour part tout au fond et donne échec par derrière : le roi blanc n\'a plus d\'abri. Obtiens la nulle.', 'As soon as the pawn advances to the 6th rank, your rook goes all the way back and checks from behind: the white king has no shelter. Get the draw.'),
      ] },
  ];

  // Ouvertures : le joueur rejoue les coups de son camp de mémoire
  const OPENINGS = [
    { id: 'italienne', name: L('Partie italienne', 'Italian Game'), color: 'w', san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3'],
      text: L('Développe vite tes pièces vers le centre et vise le point f7. Les Blancs préparent d4 avec c3 pour prendre le centre.', 'Develop your pieces quickly towards the centre and aim at f7. White prepares d4 with c3 to take the centre.') },
    { id: 'espagnole', name: L('Partie espagnole', 'Ruy Lopez'), color: 'w', san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
      text: L('Le fou en b5 met la pression sur le cavalier qui défend e5. Les Blancs roquent tôt et préparent d4.', 'The bishop on b5 puts pressure on the knight that defends e5. White castles early and prepares d4.') },
    { id: 'gambitdame', name: L('Gambit dame refusé', 'Queen\'s Gambit Declined'), color: 'w', san: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3'],
      text: L('Les Blancs offrent le pion c4 pour attirer le pion d5 hors du centre ; les Noirs le refusent et tiennent solidement.', 'White offers the c4 pawn to lure the d5 pawn away from the centre; Black declines and holds firmly.') },
    { id: 'londres', name: L('Système de Londres', 'London System'), color: 'w', san: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3'],
      text: L('Un plan simple et solide : le fou sort en f4 avant e3, puis tout se met en place derrière la chaîne de pions.', 'A simple, solid plan: the bishop comes out to f4 before e3, then everything settles behind the pawn chain.') },
    { id: 'sicilienne', name: L('Défense sicilienne (Najdorf)', 'Sicilian Defence (Najdorf)'), color: 'b', san: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      text: L('Les Noirs échangent un pion de côté contre un pion central et jouent pour gagner. Le coup a6 prépare e5 ou b5.', 'Black trades a wing pawn for a central pawn and plays to win. The move a6 prepares e5 or b5.') },
    { id: 'carokann', name: L('Défense Caro-Kann', 'Caro-Kann Defence'), color: 'b', san: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
      text: L('Le coup c6 prépare d5 tout en gardant le fou de cases blanches libre de sortir en f5.', 'The move c6 prepares d5 while keeping the light-squared bishop free to come out to f5.') },
    { id: 'francaise', name: L('Défense française', 'French Defence'), color: 'b', san: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7'],
      text: L('Les Noirs attaquent le pion e4 avec d5 après l\'avoir préparé avec e6. Une structure solide, à contre-attaquer ensuite au centre.', 'Black attacks the e4 pawn with d5 after preparing it with e6. A solid structure, to counterattack in the centre later.') },
    { id: 'scandinave', name: L('Défense scandinave', 'Scandinavian Defence'), color: 'b', san: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6'],
      text: L('Les Noirs contestent e4 tout de suite. La dame reprend en d5 puis se met à l\'abri en a5.', 'Black challenges e4 immediately. The queen recaptures on d5 then takes shelter on a5.') },
    { id: 'estindienne', name: L('Défense est-indienne', 'King\'s Indian Defence'), color: 'b', san: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
      text: L('Les Noirs laissent le centre aux Blancs, roquent vite, puis le frappent avec e5. Une défense de combat.', 'Black leaves the centre to White, castles quickly, then strikes it with e5. A fighting defence.') },
  ];

  // Parties célèbres : le joueur prend le camp du champion à partir d'un coup donné et devine ses coups
  const FAMOUS = [
    { id: 'siecle', champion: 'fischer', name: L('La partie du siècle', 'The Game of the Century'), players: 'Byrne – Fischer, New York 1956', color: 'b', from: 21,
      text: L('Fischer a 13 ans. Il vient de sacrifier sa dame et va prendre presque tout le camp blanc avec ses pièces mineures.', 'Fischer is 13. He has just sacrificed his queen and will take almost all of White\'s army with his minor pieces.'),
      san: ['Nf3', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'd4', 'O-O', 'Bf4', 'd5', 'Qb3', 'dxc4', 'Qxc4', 'c6', 'e4', 'Nbd7', 'Rd1', 'Nb6', 'Qc5', 'Bg4', 'Bg5', 'Na4', 'Qa3', 'Nxc3', 'bxc3', 'Nxe4', 'Bxe7', 'Qb6', 'Bc4', 'Nxc3', 'Bc5', 'Rfe8+', 'Kf1', 'Be6', 'Bxb6', 'Bxc4+', 'Kg1', 'Ne2+', 'Kf1', 'Nxd4+', 'Kg1', 'Ne2+', 'Kf1', 'Nc3+', 'Kg1', 'axb6', 'Qb4', 'Ra4', 'Qxb6', 'Nxd1', 'h3', 'Rxa2', 'Kh2', 'Nxf2', 'Re1', 'Rxe1', 'Qd8+', 'Bf8', 'Nxe1', 'Bd5', 'Nf3', 'Ne4', 'Qb8', 'b5', 'h4', 'h5', 'Ne5', 'Kg7', 'Kg1', 'Bc5+', 'Kf1', 'Ng3+', 'Ke1', 'Bb4+', 'Kd1', 'Bb3+', 'Kc1', 'Ne2+', 'Kb1', 'Nc3+', 'Kc1', 'Rc2#'] },
    { id: 'immortelle', champion: 'kasparov', name: L('L\'immortelle de Kasparov', 'Kasparov\'s Immortal'), players: 'Kasparov – Topalov, Wijk aan Zee 1999', color: 'w', from: 46,
      text: L('Kasparov sacrifie sa tour en d4 et chasse le roi noir à travers tout l\'échiquier.', 'Kasparov sacrifices his rook on d4 and chases the black king across the whole board.'),
      san: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'Qd2', 'c6', 'f3', 'b5', 'Nge2', 'Nbd7', 'Bh6', 'Bxh6', 'Qxh6', 'Bb7', 'a3', 'e5', 'O-O-O', 'Qe7', 'Kb1', 'a6', 'Nc1', 'O-O-O', 'Nb3', 'exd4', 'Rxd4', 'c5', 'Rd1', 'Nb6', 'g3', 'Kb8', 'Na5', 'Ba8', 'Bh3', 'd5', 'Qf4+', 'Ka7', 'Rhe1', 'd4', 'Nd5', 'Nbxd5', 'exd5', 'Qd6', 'Rxd4', 'cxd4', 'Re7+', 'Kb6', 'Qxd4+', 'Kxa5', 'b4+', 'Ka4', 'Qc3', 'Qxd5', 'Ra7', 'Bb7', 'Rxb7', 'Qc4', 'Qxf6', 'Kxa3', 'Qxa6+', 'Kxb4', 'c3+', 'Kxc3', 'Qa1+', 'Kd2', 'Qb2+', 'Kd1', 'Bf1', 'Rd2', 'Rd7', 'Rxd7', 'Bxc4', 'bxc4', 'Qxh8', 'Rd3', 'Qa8', 'c3', 'Qa4+', 'Ke1', 'f4', 'f5', 'Kc1', 'Rd2', 'Qa7'] },
    { id: 'steinitz', champion: 'steinitz', name: L('Le chef-d\'œuvre de Steinitz', 'Steinitz\'s masterpiece'), players: 'Steinitz – von Bardeleben, Hastings 1895', color: 'w', from: 32,
      text: L('Le roi noir ne peut pas roquer. Steinitz sacrifie sa tour et la fait danser autour du roi adverse.', 'The black king cannot castle. Steinitz sacrifices his rook and makes it dance around the enemy king.'),
      san: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'd5', 'exd5', 'Nxd5', 'O-O', 'Be6', 'Bg5', 'Be7', 'Bxd5', 'Bxd5', 'Nxd5', 'Qxd5', 'Bxe7', 'Nxe7', 'Re1', 'f6', 'Qe2', 'Qd7', 'Rac1', 'c6', 'd5', 'cxd5', 'Nd4', 'Kf7', 'Ne6', 'Rhc8', 'Qg4', 'g6', 'Ng5+', 'Ke8', 'Rxe7+', 'Kf8', 'Rf7+', 'Kg8', 'Rg7+', 'Kh8', 'Rxh7+'] },
    { id: 'reykjavik6', champion: 'fischer', name: L('Fischer, 6e partie à Reykjavik', 'Fischer, game 6 in Reykjavik'), players: 'Fischer – Spassky, Reykjavik 1972', color: 'w', from: 38,
      text: L('Fischer joue 1.c4 pour la première fois de sa vie et gagne une partie si belle que Spassky lui-même l\'applaudit.', 'Fischer plays 1.c4 for the first time in his life and wins a game so beautiful that Spassky himself applauds.'),
      san: ['c4', 'e6', 'Nf3', 'd5', 'd4', 'Nf6', 'Nc3', 'Be7', 'Bg5', 'O-O', 'e3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5', 'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8', 'Bb5', 'a6', 'dxc5', 'bxc5', 'O-O', 'Ra7', 'Be2', 'Nd7', 'Nd4', 'Qf8', 'Nxe6', 'fxe6', 'e4', 'd4', 'f4', 'Qe7', 'e5', 'Rb8', 'Bc4', 'Kh8', 'Qh3', 'Nf8', 'b3', 'a5', 'f5', 'exf5', 'Rxf5', 'Nh7', 'Rcf1', 'Qd8', 'Qg3', 'Re7', 'h4', 'Rbb7', 'e6', 'Rbc7', 'Qe5', 'Qe8', 'a4', 'Qd8', 'R1f2', 'Qe8', 'R2f3', 'Qd8', 'Bd3', 'Qe8', 'Qe4', 'Nf6', 'Rxf6', 'gxf6', 'Rxf6', 'Kg8', 'Bc4', 'Kh8', 'Qf4'] },
  ];

  return { MATES, ENDGAMES, OPENINGS, FAMOUS };
})();
