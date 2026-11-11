/* Cavalier — échiquier 3D (Three.js). Les personnages sont des modèles 3D animés (models3d.js). */
(function (root) {
  'use strict';

  const TEX = 1024, BORDER = 0.6, SIZE = 8 + BORDER * 2;
  const FILES = 'abcdefgh';
  const ROTATION_SENSITIVITY = 0.3;
  const MAX_ROTATION_STEP = 0.12;
  const PIECE_GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const TERRAINS = {
    forest: { name: 'Forêt', sky: 0x9eb5a1, ground: 0x304b35, wood: 0x493522, frame: ['#765735', '#503a25', '#302218'], squares: ['#c6d3a6', '#58734b'], kind: 'forest' },
    dojo: { id: 'dojo', name: 'Jardin du dojo', sky: 0x9bb8ad, ground: 0x344a3b, wood: 0x563a2b, frame: ['#8f4137', '#64322b', '#39231f'], squares: ['#d6d1a4', '#526b4a'], kind: 'forest' },
    desert: { name: 'Désert', sky: 0xd9bb91, ground: 0xb58b53, wood: 0x78502d, frame: ['#c79b61', '#9a693e', '#70492d'], squares: ['#f0d79e', '#aa7743'], kind: 'desert' },
    prairie: { name: 'Prairie verte', sky: 0xa9c895, ground: 0x6c9651, wood: 0x68482b, frame: ['#98734a', '#72502f', '#4d3825'], squares: ['#d7e6ab', '#78a654'], kind: 'grass' },
    steppe: { name: 'Plaine sèche', sky: 0xd1c194, ground: 0x9c895b, wood: 0x6d5032, frame: ['#a8875d', '#775a39', '#503d2c'], squares: ['#e3d2a3', '#9d8353'], kind: 'steppe' },
    mud: { name: 'Terrain boueux', sky: 0x9ca19a, ground: 0x514b3d, wood: 0x49352b, frame: ['#786451', '#514237', '#342b27'], squares: ['#c7b79d', '#796451'], kind: 'mud' },
    rock: { name: 'Terrain rocheux', sky: 0xa9afb4, ground: 0x62686b, wood: 0x55483c, frame: ['#8a8175', '#5b544d', '#393735'], squares: ['#d0d0c9', '#777c7e'], kind: 'rock' },
    water: { name: 'Terrain avec flaques', sky: 0x9bbbc1, ground: 0x526f66, wood: 0x59432f, frame: ['#806b50', '#5a4734', '#3d3027'], squares: ['#d0dfd8', '#63827a'], kind: 'water' },
    arena: { name: 'Arène du Ciel', sky: 0x4f8fdc, ground: 0x8ea3cc, wood: 0x6a6684, frame: ['#a7a3b8', '#7a7690', '#4e4b62'], squares: ['#c9c2da', '#5a5284'], kind: 'arena' },
    castle: { name: 'Cour du château de Hakuro', sky: 0x6a4a6e, ground: 0x6b5f58, wood: 0x4a3324, frame: ['#7a5234', '#553622', '#38241a'], squares: ['#d9b98a', '#5c3a24'], kind: 'castle' },
    banco: { name: 'Cour royale de Zalimba', sky: 0xb0522e, ground: 0xa87a5a, wood: 0x5a2e14, frame: ['#b8683a', '#7a3a1e', '#4a2412'], squares: ['#e2b07a', '#7a3a1e'], kind: 'banco' },
    volcano: { name: 'Clairière du Volcan', sky: 0x8a4a3a, ground: 0x6f7350, wood: 0x3a3228, frame: ['#6a6256', '#4a443c', '#2e2a26'], squares: ['#c9c4b4', '#55504a'], kind: 'volcano' },
    beach: { name: 'Plage tropicale', sky: 0x6cc5e8, ground: 0xa88a54, wood: 0x8a6a42, frame: ['#b98d57', '#8a6238', '#5f4226'], squares: ['#ead6a0', '#b98a4c'], kind: 'beach' },
  };
  // overcast : part de gris dans le ciel ; wind : force du vent (pluie penchée, rafales) ; snow : flocons
  const WEATHERS = {
    sun: { name: 'Soleil', sky: 0x000000, tint: 0x000000, sun: 1.05, hemi: 0.58, rain: 0, cloud: 0, fogFar: 85, overcast: 0, sunColor: 0xfff1d5, sunDisc: 0xffe39a },
    cloudy: { name: 'Ciel nuageux', sky: 0x000000, tint: 0x87939a, sun: 0.42, hemi: 0.42, rain: 0, cloud: 1, fogFar: 78, overcast: 0.36 },
    drizzle: { name: 'Pluie fine', sky: 0x000000, tint: 0x71828a, sun: 0.34, hemi: 0.36, rain: 360, cloud: 1, fogFar: 72, speed: 3.1, overcast: 0.48, rainOpacity: 0.4 },
    heavy: { name: 'Grosse pluie', sky: 0x000000, tint: 0x4c5c65, sun: 0.25, hemi: 0.3, rain: 950, cloud: 1, fogFar: 59, speed: 6.2, overcast: 0.68 },
    heavystorm: { name: 'Grosse pluie orageuse', sky: 0x000000, tint: 0x3a4654, sun: 0.22, hemi: 0.28, rain: 1100, cloud: 1, fogFar: 52, speed: 7, overcast: 0.76, lightning: true },
    windstorm: { name: 'Orage et grand vent', sky: 0x000000, tint: 0x35404c, sun: 0.2, hemi: 0.27, rain: 900, cloud: 1, fogFar: 52, speed: 7.2, overcast: 0.78, lightning: true, wind: 1.6, gusts: 160 },
    sunwind: { name: 'Soleil et vent', sky: 0x000000, tint: 0x000000, sun: 1.0, hemi: 0.56, rain: 0, cloud: 0, fogFar: 85, overcast: 0, sunColor: 0xfff1d5, sunDisc: 0xffe39a, wind: 1.1, gusts: 120, leaves: 40 },
    snow: { name: 'Neige fine', sky: 0x000000, tint: 0xc9d3dc, sun: 0.55, hemi: 0.62, rain: 0, cloud: 1, fogFar: 62, overcast: 0.55, snow: 700 },
    sunset: { name: 'Coucher de soleil', sky: 0x000000, tint: 0xe8916a, sun: 0.85, hemi: 0.46, rain: 0, cloud: 0, fogFar: 80, overcast: 0.55, sunColor: 0xffa060, sunDisc: 0xff8a3c, sunLow: true },
    storm: { name: 'Orage et éclairs', sky: 0x000000, tint: 0x3a4654, sun: 0.22, hemi: 0.28, rain: 820, cloud: 1, fogFar: 55, speed: 6.8, overcast: 0.76, lightning: true },
  };
  const DUEL = 1.3; // durée du coup final de chaque prise (secondes)
  // Avant chaque prise, les deux pièces s'affrontent : l'attaquant frappe, la cible riposte avec sa propre arme
  const X1 = 0.6, X2 = 1.4; // corps à corps : assaut jusqu'à X1, riposte de la cible jusqu'à X2
  const GROUND = -0.06; // le sol arrive au ras du plateau (au lieu d'être 0,5 plus bas)
  const EXR = 1.1;
  // Couleurs des techniques à distance des thèmes de créatures : jet (serpent), salve (bulles, graines,
  // cailloux, plumes) et éclatement à l'impact. w = Blancs, b = Noirs.
  // Attaques de mat des thèmes (w = Blancs, b = Noirs), à la place des techniques ninja
  const THEME_MATE = {
    ocean: { w: 'wave', b: 'whirlpool' },
    plants: { w: 'roots', b: 'jaws' },
    land: { w: 'stampede', b: 'quake' },
    birds: { w: 'eagle', b: 'crows' },
    ancient: { w: 'firearrows', b: 'boulder' },
    modern: { w: 'airstrike', b: 'orbital' },
    auras: { w: 'constellation', b: 'nova' },
    sabres: { w: 'sakura', b: 'lunepourpre' },
    baobabs: { w: 'ancetres', b: 'harmattan' },
    dinos: { w: 'meteores', b: 'couleelave' },
  };
  // Couleurs de la mise en scène des mats de thème : [lumière, trace au sol]
  const THEME_MATE_COLORS = {
    wave: [0x4fc3f7, 0x0d47a1], whirlpool: [0x7c4dff, 0x1a237e], roots: [0x9ccc65, 0x3e2723], jaws: [0xd81b60, 0x33691e],
    stampede: [0xffcc80, 0x6d4c41], quake: [0xff7043, 0x3e2723], eagle: [0xfff8e1, 0x8d6e63], crows: [0x9575cd, 0x212121],
    firearrows: [0xffa726, 0x3e2723], boulder: [0xbcaaa4, 0x4e342e], airstrike: [0xffab40, 0x263238], orbital: [0xff1744, 0x1a0000],
    constellation: [0x9fe3ff, 0x16306e], nova: [0xff3d3d, 0x1a0712],
    temple: [0xffffff, 0x16306e], nilocomet: [0x4cc3ff, 0x16306e], dawncross: [0xffd27a, 0x5a4210], fortress: [0x7fd8ff, 0x343a4e], cloudbreath: [0xdff4ff, 0x4a6a9e],
    shadeswarm: [0xc04bff, 0x1a0a2e], bounty: [0xff3d6e, 0x2d2219], lasernet: [0x9ef7ff, 0x2a1636], eruption: [0xff7a1a, 0x2b2326], crystalcomet: [0xc04bff, 0x14101f],
    ancetres: [0xffc247, 0x5a2e14], harmattan: [0xd9b25a, 0x3a2414], orage: [0xcfe6ff, 0x1c1a1e], lions: [0xffc247, 0x5a2e14], pietine: [0xd9b27a, 0x3a2414], meteores: [0xff8a2a, 0x2a1a14], couleelave: [0xff5a1a, 0x1a0e0a],
    sakura: [0xf9d2dc, 0x4a3324], lunepourpre: [0xff3b3b, 0x050305], dragonw: [0xffe066, 0x3a2410], tigreb: [0xb45cff, 0x120618],
    fracasw: [0xff8a26, 0x1a100a], fracasb: [0xb45cff, 0x120a1c], arcw: [0xffd27a, 0x3a2410], arcb: [0xc98cff, 0x1a0a2e],
    ridew: [0xff8a26, 0x3a2410], rideb: [0xb45cff, 0x1a0a2e], lamew: [0xff8a26, 0x3a2410], lameb: [0xb45cff, 0x1a0a2e],
  };
  // Armes propres aux thèmes guerriers, par pièce (w = Blancs, b = Noirs) ; sinon jet ou salve aux couleurs du thème
  const WAR_PROJ = {
    ancient: { n: { w: 'spear', b: 'spear' }, b: { w: 'bolt', b: 'boulder' }, r: { w: 'arrows', b: 'firepot' }, q: { w: 'spears', b: 'arrows' } },
    auras: { p: { w: 'disc', b: 'darkfire' }, n: { w: 'burst', b: 'hook' }, b: { w: 'slash', b: 'crosslaser' }, r: { w: 'shield', b: 'magma' }, q: { w: 'wave', b: 'mirror' }, k: { w: 'breath', b: 'gravity' } },
    modern: { n: { w: 'missiles', b: 'missiles' }, b: { w: 'missiles', b: 'missiles' }, r: { w: 'shell', b: 'shell' }, q: { w: 'bombs', b: 'bombs' } },
  };
  const THEME_FX = {
    ocean: { w: { jet: 0x3fa9f5, foam: 0xe6f7ff, bub: 0x5cc4ff, charge: 0xbfeaff, boom: [0xd6f2ff, 0x3fa9f5, 0x9fdcff], debris: [0x3fa9f5, 0xe6f7ff], burst: [0xe6f7ff, 0x7fd0ff, 0xbfeaff], bits: [0xbfeaff, 0xffffff] },
             b: { jet: 0x120d1f, foam: 0x8a7fb0, bub: 0x241a3a, charge: 0x6a5a90, boom: [0x6a5a90, 0x1c1530, 0x4a3d6e], debris: [0x1c1530, 0x6a5a90], burst: [0x6a5a90, 0x1c1530, 0x4a3d6e], bits: [0x1c1530, 0x6a5a90] } },
    plants: { w: { jet: 0x5fb83a, foam: 0xf8bbd0, bub: 0x9ccc65, charge: 0xdcedc8, boom: [0xf1f8e9, 0x7cb342, 0xf8bbd0], debris: [0x7cb342, 0xf48fb1], burst: [0xf1f8e9, 0x9ccc65, 0xfff59d], bits: [0x8bc34a, 0xfff59d] },
              b: { jet: 0x2e3b1f, foam: 0x6a1b9a, bub: 0x4e342e, charge: 0x7b5e57, boom: [0x8d6e63, 0x33402c, 0x6a1b9a], debris: [0x3e2723, 0x558b2f], burst: [0x8d6e63, 0x3e2723, 0x6a1b9a], bits: [0x3e2723, 0xbcaaa4] } },
    land: { w: { jet: 0xd9b26a, foam: 0xfff3d6, bub: 0x9e9e9e, charge: 0xe8d5a8, boom: [0xfff3d6, 0xd9b26a, 0xc9a66b], debris: [0xb08850, 0x9e9e9e], burst: [0xf5e6c4, 0xc9a66b, 0xe0c895], bits: [0x9e9e9e, 0xc9a66b] },
            b: { jet: 0x4a3b2c, foam: 0x8d7b5a, bub: 0x424242, charge: 0x6d5f4a, boom: [0x8d7b5a, 0x3b3125, 0x5d4f3a], debris: [0x3b3125, 0x616161], burst: [0x8d7b5a, 0x3b3125, 0x5d4f3a], bits: [0x424242, 0x5d4f3a] } },
    birds: { w: { jet: 0xe3f2fd, foam: 0xffffff, bub: 0xfafafa, charge: 0xffffff, boom: [0xffffff, 0xb3e5fc, 0xfff59d], debris: [0xffffff, 0xffcc80], burst: [0xffffff, 0xe1f5fe, 0xfff9c4], bits: [0xffffff, 0x81d4fa] },
             b: { jet: 0x1b1b22, foam: 0x5e5e6e, bub: 0x26262e, charge: 0x55556a, boom: [0x5e5e6e, 0x17171c, 0x3a3a48], debris: [0x17171c, 0x5e5e6e], burst: [0x5e5e6e, 0x17171c, 0x3a3a48], bits: [0x17171c, 0x5e5e6e] } },
    // Antiquité : traînée de feu des machines et volée de pierres ; moderne : rafale traçante et obus qui explosent
    ancient: { w: { jet: 0xffa726, foam: 0xfff3c4, bub: 0x9e9e9e, charge: 0xffcc80, boom: [0xfff1a8, 0xff8a2a, 0xffc34d], debris: [0x8d6e63, 0x9e9e9e], burst: [0xfff1a8, 0xffb74d, 0xd7ccc8], bits: [0x8d6e63, 0xbdbdbd] },
               b: { jet: 0x6d2a12, foam: 0x3e2723, bub: 0x5d4037, charge: 0x8d6e63, boom: [0xff8a65, 0x4e342e, 0x6d4c41], debris: [0x3e2723, 0x757575], burst: [0xff8a65, 0x5d4037, 0x6d4c41], bits: [0x3e2723, 0x757575] } },
    auras: { w: { jet: 0x4cc3ff, foam: 0xffffff, bub: 0x9fe3ff, charge: 0xbfeaff, boom: [0xffffff, 0x4cc3ff, 0xbfeaff], debris: [0x8d94a6, 0xbfeaff], burst: [0xffffff, 0x4cc3ff, 0xbfeaff], bits: [0xbfeaff, 0xffffff] },
             b: { jet: 0xc04bff, foam: 0xff3d6e, bub: 0x7a2bff, charge: 0xe58bff, boom: [0xff3d6e, 0xc04bff, 0x2a1636], debris: [0x2a1636, 0xc04bff], burst: [0xe58bff, 0xc04bff, 0xff3d6e], bits: [0xc04bff, 0xff3d6e] } },
    dinos: { w: { jet: 0xa8e05a, foam: 0xf0e68c, bub: 0x3f8f4a, charge: 0xf0e68c, boom: [0xf0e68c, 0xa8e05a, 0x2e6b3f], debris: [0x55504a, 0xc9c4b4], burst: [0xf0e68c, 0xa8e05a, 0x2e6b3f], bits: [0x55504a, 0xa8e05a] },
             b: { jet: 0xff6a1a, foam: 0xffd24d, bub: 0x7a1a10, charge: 0xffd24d, boom: [0xffd24d, 0xff6a1a, 0x7a1a10], debris: [0x2a2226, 0xff6a1a], burst: [0xffd24d, 0xff6a1a, 0x7a1a10], bits: [0x2a2226, 0xff6a1a] } },
    baobabs: { w: { jet: 0xffc247, foam: 0xfff1a8, bub: 0xe3aa2c, charge: 0xfff1a8, boom: [0xfff1a8, 0xffc247, 0xb8322a], debris: [0x7a3a1e, 0xe2b07a], burst: [0xfff1a8, 0xffc247, 0xb8322a], bits: [0x7a3a1e, 0xffc247] },
               b: { jet: 0xb5793a, foam: 0xe6d7b4, bub: 0x2b3a7a, charge: 0xe6d7b4, boom: [0xe6d7b4, 0xb5793a, 0x2b3a7a], debris: [0x3a2414, 0xb5793a], burst: [0xe6d7b4, 0xb5793a, 0x2b3a7a], bits: [0x3a2414, 0xb5793a] } },
    // L'Âge des Sabres : le feu orange et or des Blancs, le feu violet des Noirs (pour les ripostes dans les mélanges de thèmes)
    sabres: { w: { jet: 0xffb13b, foam: 0xfff1a8, bub: 0xff6a1a, charge: 0xfff1a8, boom: [0xfff1a8, 0xffb13b, 0xff6a1a], debris: [0x5c3a24, 0xd9b98a], burst: [0xfff1a8, 0xffb13b, 0xff6a1a], bits: [0x5c3a24, 0xffb13b] },
              b: { jet: 0xb45cff, foam: 0xead0ff, bub: 0x6a1fd0, charge: 0xead0ff, boom: [0xead0ff, 0xb45cff, 0x6a1fd0], debris: [0x2a2630, 0x8a46a8], burst: [0xead0ff, 0xb45cff, 0x6a1fd0], bits: [0x2a2630, 0xb45cff] } },
    modern: { w: { jet: 0xffd54f, foam: 0xffffff, bub: 0x8d8d7a, charge: 0xfff59d, boom: [0xfff1a8, 0xff6d00, 0xffc34d], debris: [0x5d5d5d, 0xffb74d], burst: [0xfff1a8, 0xff9100, 0xbdbdbd], bits: [0x616161, 0xffcc80] },
              b: { jet: 0x37474f, foam: 0xb0bec5, bub: 0x37474f, charge: 0x78909c, boom: [0xffab40, 0x263238, 0x546e7a], debris: [0x263238, 0xff6d00], burst: [0xffab40, 0x37474f, 0x546e7a], bits: [0x263238, 0xff9100] } },
  }; // à distance : la cible tire d'abord sa propre technique sur l'attaquant
// Saga des Auras : un mat par pièce (celle qui donne le mat)
const AURA_MATE = { P: 'temple', N: 'nilocomet', B: 'dawncross', R: 'fortress', Q: 'constellation', K: 'cloudbreath', p: 'shadeswarm', n: 'bounty', b: 'lasernet', r: 'eruption', q: 'nova', k: 'crystalcomet' };
const AURA_PROJ = new Set(['disc', 'darkfire', 'burst', 'hook', 'slash', 'crosslaser', 'shield', 'magma', 'wave', 'mirror', 'breath', 'gravity']);
const AURA_BEAMS = { wave: { r: 0.08, off: [0] }, mirror: { r: 0.03, off: [-0.5, 0.5] }, crosslaser: { r: 0.018, off: [-0.16, 0.16] } }; // off : écart de chaque rayon au départ
// L'Âge des Sabres : un mat par pièce (celle qui donne le mat) ; le roi a le mat de son camp. [instant du coup, durée]
const SABRE_MATE = { P: 'lamew', N: 'ridew', B: 'arcw', R: 'fracasw', Q: 'dragonw', K: 'sakura', p: 'lameb', n: 'rideb', b: 'arcb', r: 'fracasb', q: 'tigreb', k: 'lunepourpre' };
const SABRE_DRAGON_BORN = 1.15; // Dragon de feu : instant où la naginata lancée devient le dragon
const SABRE_STYLES = new Set(Object.values(SABRE_MATE));
const SABRE_MATE_TIME = { sakura: [3, 5.2], lunepourpre: [3, 5.4], dragonw: [1.75, 5.6], tigreb: [1.6, 5.5], fracasw: [4.2, 6.2], fracasb: [4.2, 6.2], arcw: [3, 5.6], arcb: [3, 5.6], ridew: [4.6, 6.6], rideb: [4.6, 6.6], lamew: [2.9, 5], lameb: [2.9, 5] };
// Thèmes à fiches (12d-kit-attaques.js) : couleurs [principale, seconde, sombre, cœur] et une fiche d'attaque par pièce
const KIT_PAL = {
  baobabs: { w: [0xffc247, 0xfff1a8, 0xb8322a, 0xffffff], b: [0xb5793a, 0xe6d7b4, 0x2b3a7a, 0xffffff] },
  dinos: { w: [0xa8e05a, 0xf0e68c, 0x2e6b3f, 0xffffff], b: [0xff6a1a, 0xffd24d, 0x7a1a10, 0xffe9a8] },
};
const KIT_ATTACKS = {
  baobabs: {
    K: { shot: 'ray', wind: 0.6, fly: [0.12, 0], end: 'fall', recover: 0.8, big: 1.1 },
    k: { gap: 0.7, wind: 0.6, impact: 'claws', end: 'fall', recover: 0.85 },
    Q: { shot: 'volley', wind: 0.55, fly: [0.25, 0.06], end: 'fall', recover: 0.8, big: 1.1 },
    q: { shot: 'shadow', wind: 0.55, fly: [0.15, 0.05], end: 'fall', recover: 0.8 },
    R: { gap: 0.8, wind: 0.5, end: 'crush', impact: 'cracks', big: 1.3, shake: 0.2, recover: 0.8 },
    r: { gap: 0.85, wind: 0.6, pose: 'trunk', end: 'fling', recover: 1 },
    B: { shot: 'wave', wind: 0.5, fly: [0.25, 0.08], end: 'bounce', recover: 0.8 },
    b: { shot: 'spirit', wind: 0.6, fly: [0.3, 0.07], carry: true, end: 'carry', recover: 0.8 },
    N: { gap: 0.8, leap: 0.9, wind: 0.5, during: 'roar', end: 'fall', recover: 0.8 },
    n: { gap: 0.72, leap: 0.9, wind: 0.45, end: 'crush', impact: 'slash', recover: 0.8 },
    P: { gap: 0.62, wind: 0.55, end: 'fall', recover: 0.7 }, p: { gap: 0.62, wind: 0.55, end: 'fall', recover: 0.7 },
  },
  dinos: {
    K: { gap: 0.8, wind: 0.6, end: 'fall', impact: 'slash', big: 1.1, recover: 0.8 },
    k: { shot: 'flame', wind: 0.6, fly: [0.15, 0], burn: true, end: 'fall', recover: 0.85, big: 1.1 },
    Q: { gap: 0.82, wind: 0.6, spin: true, end: 'fling', recover: 0.9 },
    q: { shot: 'embers', wind: 0.55, fly: [0.25, 0.06], burn: true, end: 'fall', recover: 0.85 },
    R: { gap: 0.75, wind: 0.4, end: 'skyward', big: 1.2, shake: 0.16, recover: 0.8 },
    r: { gap: 0.8, wind: 0.45, end: 'bounce', impact: 'quake', big: 1.2, recover: 0.8 },
    B: { gap: 0.05, leap: 1.6, wind: 0.08, end: 'skyward', recover: 0.5 },
    b: { gap: 0.05, leap: 1.6, wind: 0.08, burn: true, end: 'skyward', during: 'fire', recover: 0.5 },
    N: { gap: 0.72, leap: 1.1, wind: 0.4, end: 'fall', impact: 'slash', recover: 0.75 },
    n: { gap: 0.72, leap: 1.1, wind: 0.4, burn: true, end: 'fall', impact: 'claws', during: 'fire', recover: 0.8 },
    P: { gap: 0.6, leap: 0.55, wind: 0.32, end: 'bounce', recover: 0.7 }, p: { gap: 0.6, leap: 0.55, wind: 0.32, end: 'bounce', recover: 0.7 },
  },
};
const KIT_STYLES = new Set(['ancetres', 'harmattan', 'orage', 'lions', 'pietine', 'meteores', 'couleelave']);
// Empire des Baobabs : les reines ont leur propre mat, l'orage (danse, nuages noirs, pluie et vent, éclairs, cendres),
// les cavaliers le leur, la meute (trois lions entrent sur le plateau, attaquent le roi avec le cavalier, le dévorent
// et repartent en laissant une case rouge),
// et les tours le leur : l'éléphant se cabre, piétine trois fois le roi de ses pattes de devant, puis retourne
// sur sa case en laissant un trou à la place du roi
const KIT_PIECE_MATE = { baobabs: { Q: 'orage', q: 'orage', N: 'lions', n: 'lions', R: 'pietine', r: 'pietine' } };
const KIT_MATE_TIME = { orage: [4.2, 8], lions: [3.4, 6.8], pietine: [3.6, 5.8] }; // [impact, durée]
const AURA_CRATER_PLIES = 6; // Saga des Auras : durée d'un cratère, en demi-coups
const BURN_TIME = 1.8; // durée de la combustion jusqu'aux cendres

  class Board3D {
    constructor(container, onSquare) {
      this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.speed = this.reducedMotion ? 1.2 : 0.75;
      const THREE = root.THREE;
      if (!THREE) throw new Error('three.js absent');
      this.THREE = THREE;
      this.container = container;
      this.onSquare = onSquare;
      Board3D.instance = this;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      // Un plafond plus bas réduit fortement le coût du rendu sur les écrans haute densité.
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.98;
      container.appendChild(this.renderer.domElement);
      this.renderer.domElement.className = 'board3d';

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x18211f);
      this.environmentTexture = this.makeStudioEnvironment();
      this.scene.environment = this.environmentTexture;
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      this.hemi = new THREE.HemisphereLight(0xeaf1ff, 0x3a342d, 0.88);
      this.scene.add(this.hemi);
      const sun = new THREE.DirectionalLight(0xffe8c9, 1.05);
      sun.position.set(-5, 11, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
      sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
      sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
      sun.shadow.bias = -0.00025;
      sun.shadow.normalBias = 0.025;
      sun.shadow.radius = 4;
      this.scene.add(sun);
      this.sun = sun;
      const fill = new THREE.DirectionalLight(0xc8dcff, 0.28);
      fill.position.set(5, 6, -7); this.scene.add(fill);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x28332f, roughness: 0.94 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = GROUND; floor.receiveShadow = true;
      this.scene.add(floor);
      this.floor = floor;
      this.woodTexture = this.makeWoodTexture();

      // Socle en bois
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE + 0.3, 0.5, SIZE + 0.3),
        new THREE.MeshStandardMaterial({ map: this.woodTexture, color: 0x543821, roughness: 0.35, metalness: 0.01, bumpMap: this.woodTexture, bumpScale: 0.035 }),
      );
      base.position.y = -0.27;
      base.castShadow = true; base.receiveShadow = true;
      this.scene.add(base);
      this.base = base;
      this.terrainGroup = new THREE.Group(); this.terrainGroup.position.y = GROUND + 0.535; this.scene.add(this.terrainGroup);
      this.terrain = null;
      this.weatherGroup = new THREE.Group(); this.scene.add(this.weatherGroup);
      this.weather = null; this.weatherBolts = [];
      this.weatherFlash = null;
      this.lightningLight = new THREE.PointLight(0xc9e2ff, 0, 35, 2);
      this.lightningLight.position.set(0, 8, 0); this.scene.add(this.lightningLight);

      // Plateau : une texture canvas (cases + coordonnées)
      this.boardCanvas = document.createElement('canvas');
      this.boardCanvas.width = this.boardCanvas.height = TEX;
      this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
      this.boardTex.encoding = THREE.sRGBEncoding;
      this.boardTex.anisotropy = 4;
      this.boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.38, metalness: 0.005, bumpMap: this.woodTexture, bumpScale: 0.022 }));
      this.boardMesh.rotation.x = -Math.PI / 2;
      this.boardMesh.receiveShadow = true;
      this.scene.add(this.boardMesh);

      this.overlay = new THREE.Group();
      this.scene.add(this.overlay);
      this.tutorialStarGeometry = null;
      this.tutorialStarMaterial = null;
      this.pieces = new THREE.Group();
      this.scene.add(this.pieces);
      this.mateFireGroup = new THREE.Group();
      this.scene.add(this.mateFireGroup);
      this.mateFireKey = '';

      this.chars = new Map(); // case -> personnage
      this.dying = [];
      this.mateUltimate = null;
      this.mateUltimateKey = '';
      this.captureScars = [];
      this.checkGroup = new THREE.Group(); this.scene.add(this.checkGroup);
      // échec : disque noir sous le roi, trait noir au sol jusqu'à la pièce qui donne l'échec
      this.checkDiskGeo = new THREE.CircleGeometry(0.49, 48);
      this.checkLineGeo = new THREE.PlaneGeometry(1, 0.07);
      this.checkMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide });
      this.checkLinks = []; this.checkKey = '';
      this.shadowTex = this.makeShadowTexture();
      this.flipped = null;
      this.boardKey = '';
      this.boardTextureKey = '';
      this.elevation = 38;
      this.cameraTarget = new THREE.Vector3(0, 0.3, 0);
      this.captureCamera = null;
      this.attackCamera = null;

      this.raycaster = new THREE.Raycaster();
      this.bindInput();
      this.resize();
      if (root.ResizeObserver) new ResizeObserver(() => this.resize()).observe(container);
      else window.addEventListener('resize', () => this.resize());
      // La boucle ne doit jamais s'arrêter : une erreur ponctuelle ne fige plus l'affichage
      let fails = 0, lost = false;
      const cv = this.renderer.domElement;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; this.container.dispatchEvent(new CustomEvent('board3dcontext', { bubbles: true, detail: { lost: true } })); });
      cv.addEventListener('webglcontextrestored', () => { lost = false; this.boardTextureKey = ''; this.resize(); this.container.dispatchEvent(new CustomEvent('board3dcontext', { bubbles: true, detail: { lost: false } })); });
      const loop = (t) => {
        requestAnimationFrame(loop);
        if (lost) return;
        try { this.tick(t); fails = 0; }
        catch (err) {
          if (fails++ === 0) console.error('Erreur 3D', err);
          if (fails === 3) { try { this.clearTransient(); } catch { /* ignoré */ } }
        }
      };
      requestAnimationFrame(loop);
    }

    resize() {
      const w = this.container.clientWidth || 300, h = this.container.clientHeight || w;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    sqToPos(sq) { return { x: (sq & 7) - 3.5, z: (sq >> 3) - 3.5 }; }

    drawBoard(light, dark, coords, flipped, board = []) {
      const terrain = this.terrain;
      const squareLight = terrain ? terrain.squares[0] : light;
      const squareDark = terrain ? terrain.squares[1] : dark;
      const key = light + dark + coords + flipped + !!this.faceToFace + (terrain ? terrain.name : '') + board.map((p) => p || '.').join('');
      if (key === this.boardTextureKey) return;
      this.boardTextureKey = key;
      const c = this.boardCanvas.getContext('2d');
      const cell = TEX / SIZE, off = BORDER * cell;
      const g = c.createLinearGradient(0, 0, TEX, TEX);
      const frame = terrain ? terrain.frame : ['#987148', '#694728', '#3f291b'];
      g.addColorStop(0, frame[0]); g.addColorStop(0.48, frame[1]); g.addColorStop(1, frame[2]);
      c.fillStyle = g; c.fillRect(0, 0, TEX, TEX);
      // Veines discrètes dans le bois du cadre, dessinées une fois par thème.
      for (let i = 0; i < 74; i++) {
        const y = (i + 0.5) * TEX / 74, sway = 4 + (i % 5) * 3;
        c.strokeStyle = i % 3 ? 'rgba(255,225,176,0.035)' : 'rgba(24,12,5,0.10)';
        c.lineWidth = i % 4 === 0 ? 2 : 1;
        c.beginPath(); c.moveTo(0, y);
        c.bezierCurveTo(TEX * 0.28, y - sway, TEX * 0.68, y + sway, TEX, y - sway * 0.3); c.stroke();
      }
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const x = off + f * cell, y = off + r * cell;
        c.fillStyle = (r + f) % 2 ? squareDark : squareLight;
        c.fillRect(x, y, cell + 0.5, cell + 0.5);
        const polish = c.createLinearGradient(x, y, x + cell, y + cell);
        polish.addColorStop(0, 'rgba(255,255,255,0.10)');
        polish.addColorStop(0.52, 'rgba(255,255,255,0.015)');
        polish.addColorStop(1, 'rgba(20,14,9,0.10)');
        c.fillStyle = polish; c.fillRect(x, y, cell, cell);
        c.strokeStyle = 'rgba(35,24,15,0.12)'; c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        if (terrain && terrain.kind === 'castle') { // planches de cèdre
          c.strokeStyle = 'rgba(30,16,8,0.32)'; c.lineWidth = 1.2;
          for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + 2, y + i * cell / 4); c.lineTo(x + cell - 2, y + i * cell / 4); c.stroke(); }
          c.strokeStyle = 'rgba(255,230,190,0.08)'; for (let i = 0; i < 7; i++) { const yy = y + ((i * 37 + r * 11 + f * 7) % 100) / 100 * cell; c.beginPath(); c.moveTo(x + 3, yy); c.bezierCurveTo(x + cell * 0.3, yy + 2, x + cell * 0.6, yy - 2, x + cell - 3, yy + 1); c.stroke(); }
        }
        const piece = board[r * 8 + f];
        if (piece) {
          const white = piece === piece.toUpperCase();
          c.save();
          c.translate(x + cell * 0.5, y + cell * 0.5);
          if (flipped) c.rotate(Math.PI);
          // mode deux joueurs (faceToFace) : l'icône du camp d'en face est tournée vers ce joueur
          if (this.faceToFace && white === flipped) c.rotate(Math.PI);
          c.font = `${Math.round(cell * 0.94)}px "DejaVu Sans", "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = cell * 0.065; c.lineJoin = 'round';
          c.strokeStyle = white ? 'rgba(35,29,22,0.96)' : 'rgba(255,255,255,0.96)';
          c.fillStyle = white ? '#fffdf6' : '#171719';
          c.shadowColor = white ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)';
          c.shadowBlur = cell * 0.09;
          const icon = PIECE_GLYPHS[piece.toLowerCase()] + '\uFE0E';
          c.strokeText(icon, 0, 0); c.fillText(icon, 0, 0);
          c.restore();
        }
      }
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4;
      c.strokeRect(off, off, cell * 8, cell * 8);
      if (coords) {
        c.fillStyle = '#f3dfbf'; c.font = `bold ${Math.round(cell * 0.34)}px system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) {
          const m = off + (i + 0.5) * cell;
          // Lettres lisibles du côté du joueur, même plateau tourné
          const label = (s, x, y) => { c.save(); c.translate(x, y); if (flipped) c.rotate(Math.PI); c.fillText(s, 0, 0); c.restore(); };
          label(FILES[i], m, TEX - off / 2); label(FILES[i], m, off / 2);
          label(String(8 - i), off / 2, m); label(String(8 - i), TEX - off / 2, m);
        }
      }
      this.boardTex.needsUpdate = true;
    }

    setTerrain(id) {
      const terrain = TERRAINS[id] || TERRAINS.forest;
      this.terrain = terrain;
      this.scene.background.setHex(terrain.sky);
      this.scene.fog = new this.THREE.Fog(terrain.sky, 32, 85);
      this.skyBase = new this.THREE.Color(terrain.sky);
      this.floor.material.color.setHex(terrain.ground);
      this.base.material.color.setHex(terrain.wood);
      this.hemi.color.setHex(terrain.sky);
      this.hemi.groundColor.setHex(terrain.ground);
      this.sun.color.setHex(terrain.kind === 'desert' || terrain.kind === 'steppe' || terrain.kind === 'beach' ? 0xffe1af : 0xffffff);
      this.boardTextureKey = '';
      this.buildTerrain(terrain);
      this.buildAnimals(terrain);
      this.buildScenery(terrain);
    }

    setWeather(id) {
      const T = this.THREE, weather = WEATHERS[id] || WEATHERS.sun, terrain = this.terrain || TERRAINS.forest;
      this.weather = weather;
      // le vent fait aussi bouger les tenues des pièces
      if (window.Models3D && window.Models3D.setWind) window.Models3D.setWind(weather.wind || 0);
      const overcast = weather.overcast || 0;
      const sky = new T.Color(terrain.sky).lerp(new T.Color(weather.tint), overcast);
      this.scene.background.copy(sky);
      this.scene.fog = new T.Fog(sky, weather.fogFar * 0.38, weather.fogFar);
      this.skyBase = sky.clone();
      this.backdropTint = new T.Color(0xffffff).lerp(new T.Color(weather.tint || 0x888888), overcast * 0.8);
      this.hemi.intensity = weather.hemi;
      this.hemi.color.copy(sky);
      this.sun.intensity = weather.sun;
      this.sun.color.setHex(weather.sunColor || 0xffffff);
      this.lightningLight.intensity = 0;
      this.weatherFlash = null;
      this.nextLightning = weather.lightning ? (this.lastT || 0) + 1.8 + Math.random() * 2.2 : 0;
      this.boardTextureKey = '';
      this.buildWeather(weather);
    }

    buildWeather(weather) {
      const T = this.THREE, oldGeo = new Set(), oldMat = new Set();
      this.weatherGroup.traverse((o) => {
        if (o.geometry) oldGeo.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => oldMat.add(m));
      });
      this.weatherGroup.clear();
      oldGeo.forEach((g) => g.dispose()); oldMat.forEach((m) => m.dispose());
      this.weatherBolts = []; this.weatherRain = null; this.weatherSnow = null; this.weatherWind = null;

      if (weather.sunDisc) {
        // soleil haut dans le ciel, ou bas et orangé au coucher
        const sun = new T.Mesh(new T.SphereGeometry(weather.sunLow ? 1.4 : 0.72, 16, 12), new T.MeshBasicMaterial({ color: weather.sunDisc, fog: false }));
        sun.position.set(-8, weather.sunLow ? 2.2 : 8.5, weather.sunLow ? -16 : -9); this.weatherGroup.add(sun);
        if (weather.sunLow) {
          const halo = new T.Mesh(new T.SphereGeometry(3, 16, 12), new T.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.25, fog: false, depthWrite: false, blending: T.AdditiveBlending }));
          halo.position.copy(sun.position); this.weatherGroup.add(halo);
        }
      }

      if (weather.snow) {
        // flocons qui descendent lentement en se balançant
        const count = weather.snow, positions = new Float32Array(count * 3), seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 17; positions[i * 3 + 1] = Math.random() * 12; positions[i * 3 + 2] = (Math.random() - 0.5) * 17;
          seeds[i] = Math.random() * 10;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const flakes = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 0.11, transparent: true, opacity: 0.95, depthWrite: false }));
        flakes.frustumCulled = false; this.weatherGroup.add(flakes);
        this.weatherSnow = { positions, seeds, count, geometry: geo };
      }

      if (weather.gusts) {
        // rafales : traits de vent et feuilles qui traversent le plateau
        const count = weather.gusts, positions = new Float32Array(count * 6), speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const x = (Math.random() - 0.5) * 20, y = 0.2 + Math.random() * 4, z = (Math.random() - 0.5) * 17, l = 0.4 + Math.random() * 0.9;
          positions.set([x, y, z, x + l, y + 0.02, z + 0.05], i * 6);
          speeds[i] = 7 + Math.random() * 6;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const streaks = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: weather.rain ? 0.22 : 0.32, depthWrite: false }));
        streaks.frustumCulled = false; this.weatherGroup.add(streaks);
        const leaves = [];
        for (let i = 0; i < (weather.leaves || 0); i++) {
          const leaf = new T.Mesh(new T.PlaneGeometry(0.1, 0.06), new T.MeshBasicMaterial({ color: [0x6f9a3c, 0xb8a04a, 0xc77a2e][i % 3], side: T.DoubleSide, transparent: true, opacity: 0.9 }));
          leaf.position.set((Math.random() - 0.5) * 20, 0.2 + Math.random() * 3, (Math.random() - 0.5) * 16); leaf.userData.seed = Math.random() * 10;
          this.weatherGroup.add(leaf); leaves.push(leaf);
        }
        this.weatherWind = { positions, speeds, count, geometry: geo, leaves };
      }

      if (weather.cloud) {
        const cloudMat = new T.MeshStandardMaterial({ color: weather.tint, roughness: 1 });
        const cloudGeo = new T.SphereGeometry(1, 10, 7);
        const clouds = [[-8,7,-8,2.8,0.7,1.4],[0,8,-10,3.5,0.8,1.3],[8,7,-7,2.6,0.7,1.4],[-9,7,1,2.5,0.65,1.3],[9,7,2,2.8,0.7,1.5]];
        clouds.forEach(([x,y,z,sx,sy,sz]) => {
          const cloud = new T.Mesh(cloudGeo, cloudMat); cloud.position.set(x,y,z); cloud.scale.set(sx,sy,sz);
          cloud.castShadow = false; cloud.receiveShadow = false; this.weatherGroup.add(cloud);
        });
      }

      if (weather.rain) {
        const count = weather.rain, positions = new Float32Array(count * 6), speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const at = i * 6, x = (Math.random() - 0.5) * 17, y = Math.random() * 12, z = (Math.random() - 0.5) * 17;
          positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
          positions[at + 3] = x - 0.055; positions[at + 4] = y - 0.34; positions[at + 5] = z + 0.035;
          speeds[i] = weather.speed * (0.72 + Math.random() * 0.65);
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const material = new T.LineBasicMaterial({ color: 0xc6d9e7, transparent: true, opacity: weather.rainOpacity || 0.52, depthWrite: false });
        const rain = new T.LineSegments(geo, material); rain.frustumCulled = false; this.weatherGroup.add(rain);
        this.weatherRain = { positions, speeds, count, geometry: geo };
      }
    }

    makeLightning(t) {
      const T = this.THREE, x = (Math.random() - 0.5) * 7, z = (Math.random() - 0.5) * 7;
      const points = [new T.Vector3(x, 9.5, z)];
      for (let i = 1; i < 9; i++) points.push(new T.Vector3(x + (Math.random() - 0.5) * 1.25, 9.5 - i * 1.15, z + (Math.random() - 0.5) * 1.25));
      const geometry = new T.BufferGeometry().setFromPoints(points);
      const material = new T.LineBasicMaterial({ color: 0xe1efff, transparent: true, opacity: 0.96, blending: T.AdditiveBlending });
      const bolt = new T.Line(geometry, material); this.weatherGroup.add(bolt);
      this.weatherBolts.push({ bolt, until: t + 0.18 });
      this.weatherFlash = { start: t, end: t + 0.28 };
      this.nextLightning = t + 4 + Math.random() * 7;
    }

    tickWeather(t, dt) {
      if (!this.weather) return;
      if (this.weatherRain) {
        const { positions, speeds, count, geometry } = this.weatherRain;
        for (let i = 0; i < count; i++) {
          const at = i * 6;
          const lean = 0.09 + (this.weather.wind || 0) * 0.55;
          positions[at + 1] -= speeds[i] * dt;
          positions[at] += speeds[i] * dt * (this.weather.wind ? lean : -0.09);
          positions[at + 4] -= speeds[i] * dt;
          positions[at + 3] += speeds[i] * dt * (this.weather.wind ? lean : -0.09);
          if (positions[at + 1] < -0.45) {
            const w = this.weather.wind || 0;
            const x = (Math.random() - 0.5) * 17 - w * 4, y = 7 + Math.random() * 6, z = (Math.random() - 0.5) * 17;
            positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
            positions[at + 3] = x - 0.055 - w * 0.2; positions[at + 4] = y - 0.34; positions[at + 5] = z + 0.035;
          }
        }
        geometry.attributes.position.needsUpdate = true;
      }
      if (this.weatherSnow) {
        const { positions, seeds, count, geometry } = this.weatherSnow;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= (0.45 + (seeds[i] % 1) * 0.35) * dt;
          positions[i * 3] += Math.sin(t * 0.9 + seeds[i]) * 0.25 * dt;
          positions[i * 3 + 2] += Math.cos(t * 0.7 + seeds[i]) * 0.2 * dt;
          if (positions[i * 3 + 1] < -0.4) { positions[i * 3] = (Math.random() - 0.5) * 17; positions[i * 3 + 1] = 10 + Math.random() * 2; positions[i * 3 + 2] = (Math.random() - 0.5) * 17; }
        }
        geometry.attributes.position.needsUpdate = true;
      }
      if (this.weatherWind) {
        const { positions, speeds, count, geometry, leaves } = this.weatherWind;
        // rafales : le vent forcit et faiblit
        const gust = 0.7 + 0.3 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3);
        for (let i = 0; i < count; i++) {
          const d = speeds[i] * gust * dt;
          positions[i * 6] += d; positions[i * 6 + 3] += d;
          if (positions[i * 6] > 11) { const l = positions[i * 6 + 3] - positions[i * 6]; positions[i * 6] = -11 - Math.random() * 3; positions[i * 6 + 3] = positions[i * 6] + l; }
        }
        geometry.attributes.position.needsUpdate = true;
        leaves.forEach((leaf) => {
          const s = leaf.userData.seed;
          leaf.position.x += (3.5 + (s % 2)) * gust * dt;
          leaf.position.y += Math.sin(t * 3 + s) * 0.6 * dt;
          leaf.rotation.set(t * 4 + s, t * 3, t * 5 + s);
          if (leaf.position.x > 11) { leaf.position.x = -11; leaf.position.y = 0.2 + Math.random() * 3; leaf.position.z = (Math.random() - 0.5) * 16; }
        });
      }
      if (this.weather.lightning && t >= this.nextLightning) this.makeLightning(t);
      this.weatherBolts = this.weatherBolts.filter(({ bolt, until }) => {
        if (t < until) return true;
        this.weatherGroup.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); return false;
      });
      let flash = 0;
      if (this.weatherFlash && t < this.weatherFlash.end) {
        const age = t - this.weatherFlash.start;
        flash = age < 0.07 ? 7 : age < 0.15 ? 1.2 : age < 0.2 ? 5 : 0;
      } else this.weatherFlash = null;
      this.lightningLight.intensity = flash;
      this.sun.intensity = this.weather.sun + flash * 0.23;
      this.hemi.intensity = this.weather.hemi + flash * 0.08;
      // Ciel assombri par une technique (éclairs du fou noir) : les éclairs n'en brillent que plus
      const dim = this.skyDim || 0;
      if (dim > 0) { this.sun.intensity *= 1 - 0.85 * dim; this.hemi.intensity *= 1 - 0.75 * dim; }
      const night = this.night || 0;
      if (night > 0) { this.sun.intensity *= 1 - 0.7 * night; this.hemi.intensity *= 1 - 0.45 * night; }
    }

    // Clairière du Volcan : volcan fumant toujours à l'arrière-plan, fougères géantes, rochers
    buildVolcanoClearing(add, mat, moundGeo) {
      const T = this.THREE, rock = mat(0x241a18, { flatShading: true }), rockLight = mat(0x4a403c, { flatShading: true }), lava = new T.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false }), smoke = new T.MeshBasicMaterial({ color: 0x3a3030, transparent: true, opacity: 0.6, depthWrite: false });
      const fern = mat(0x2e6b3a, { flatShading: true }), fernLight = mat(0x4a8f4a, { flatShading: true }), trunkMat = mat(0x4a3a2a);
      const pivot = new T.Group(), volcano = new T.Group(); pivot.add(volcano); volcano.position.set(0, -0.3, -10.8); volcano.scale.setScalar(0.82); this.terrainGroup.add(pivot);
      const part = (...o) => { const m = add(...o); volcano.add(m); return m; };
      part(new T.CylinderGeometry(0.9, 6.4, 5.4, 12), rock, 0, 2.7, 0);
      part(new T.CylinderGeometry(0.95, 0.75, 0.1, 12), lava, 0, 5.42, 0, 1, 1, 1, false);
      for (const [x, z, h, r] of [[-0.4, 3, 3.6, 0.12], [0.8, 2.6, 2.6, 0.1], [-1.5, 2.2, 1.8, 0.09]]) { const l = part(new T.BoxGeometry(r * 2, h, 0.05), lava, x * 0.55, 3.6 - h * 0.34, z * 0.9, 1, 1, 1, false); l.rotation.x = 0.82; }
      for (let i = 0; i < 6; i++) part(moundGeo, smoke, Math.sin(i) * 0.5, 6 + i * 0.9, 0, 2 + i * 0.7, 1.5 + i * 0.4, 2 + i * 0.7, false);
      this.castleKeep = pivot;
      // fougères géantes : une touffe de frondes, parfois sur un tronc
      this.volcanoFerns = [];
      const frond = new T.ConeGeometry(0.2, 1.8, 4);
      const clump = (x, z, s, h) => {
        const g = new T.Group(); g.position.set(x, h - 0.5, z); this.terrainGroup.add(g);
        if (h) { const t = add(new T.CylinderGeometry(0.11 * s, 0.17 * s, h + 0.5, 7), trunkMat, x, h / 2 - 0.5, z); t.castShadow = true; }
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, m = add(frond, i % 2 ? fern : fernLight, 0, 0, 0, s, s, s * 0.45); g.add(m); m.position.set(Math.cos(a) * 0.62 * s, 0.56 * s, Math.sin(a) * 0.62 * s); m.rotation.set(Math.sin(a) * 1.05, -a + Math.PI / 2, -Math.cos(a) * 1.05); m.rotation.order = 'YXZ'; }
        this.volcanoFerns.push(g); return g;
      };
      for (const [x, z, s, h] of [[-6.2, -5.6, 1.1, 0], [6.3, -5.2, 1.2, 0], [-6.6, 0.4, 1, 0], [6.7, 1, 1.05, 0], [-6.2, 5.6, 1.15, 0], [6.3, 5.8, 1.1, 0], [-8.8, -5.6, 1.5, 2.2], [9, -4.4, 1.6, 2.6], [-9.4, 3, 1.4, 1.8], [9.4, 4.6, 1.5, 2.2], [-3.6, -6.6, 0.9, 0], [3.8, -6.8, 0.9, 0]]) clump(x, z, s, h);
      for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 7.6 + (i % 3) * 1.6; const m = add(new T.DodecahedronGeometry(0.5 + (i % 3) * 0.25, 0), i % 2 ? rock : rockLight, Math.cos(a) * r, -0.2, Math.sin(a) * r, 1, 0.7, 1); m.rotation.y = i; }
    }

    // Cour royale de Zalimba : palais en banco hérissé de poutres (toujours à l'arrière-plan), cases rondes, baobabs
    buildRoyalCourt(add, mat, moundGeo) {
      const T = this.THREE, banco = mat(0xb8683a), bancoDark = mat(0xa35a30), beam = mat(0x4a2412), thatch = mat(0xc9a24a, { flatShading: true }), bark = mat(0x5a4030), leaf = mat(0x3c5a2e, { flatShading: true }), door = mat(0x2e160a);
      const box = new T.BoxGeometry(1, 1, 1), stick = new T.CylinderGeometry(0.05, 0.05, 1, 6);
      const pivot = new T.Group(), palace = new T.Group(); pivot.add(palace); palace.position.set(0, -0.35, -8.9); palace.scale.setScalar(0.82); this.terrainGroup.add(pivot);
      const part = (...o) => { const m = add(...o); palace.add(m); return m; };
      part(box, banco, 0, 1.3, 0, 13, 2.6, 2.6);
      part(box, bancoDark, 0, 2.9, 0, 6.5, 2.2, 2.2);
      for (const x of [-4.8, -1.8, 1.8, 4.8]) { const t = part(new T.CylinderGeometry(0.5, 0.75, 4.6, 10), banco, x, 2.3, 0.4); part(new T.ConeGeometry(0.5, 0.8, 10), bancoDark, x, 5, 0.4); void t; }
      part(new T.CylinderGeometry(0.8, 0.8, 2, 14), door, 0, 0.9, 1.2, 1, 1, 0.1, false);
      for (let i = 0; i < 16; i++) { const x = -6 + i * 0.8; for (const y of [1.2, 2.2]) { const b = part(stick, beam, x, y, 1.4, 1, 0.55, 1); b.rotation.x = Math.PI / 2; } }
      for (let i = 0; i < 8; i++) { const b = part(stick, beam, -2.6 + i * 0.75, 3.4, 1.2, 1, 0.5, 1); b.rotation.x = Math.PI / 2; }
      this.castleKeep = pivot;
      // cases rondes à toit de paille
      const wall = new T.CylinderGeometry(0.8, 0.85, 1, 14), roof = new T.ConeGeometry(1.15, 0.95, 14);
      for (const [x, z, s] of [[-7, -7.6, 1.2], [-9.4, -3.6, 1], [7.4, -7.4, 1.15], [9.6, -3.4, 1], [-9.4, 3.8, 0.95], [9.6, 3.6, 1]]) {
        add(wall, banco, x, 0, z, s, s, s); add(roof, thatch, x, 0.95 * s, z, s, s, s);
        add(box, door, x + (x < 0 ? 0.78 : -0.78) * s, -0.1, z, 0.06, 0.65 * s, 0.4 * s, false);
      }
      // baobabs : tronc énorme, branches courtes, feuillage plat
      const trunk = new T.CylinderGeometry(0.55, 0.95, 1, 12), limb = new T.CylinderGeometry(0.06, 0.14, 1, 6);
      for (const [x, z, s] of [[-11, -8.6, 1.6], [11, -8.2, 1.5], [-11.4, 8, 1.3], [11.6, 8.2, 1.25]]) {
        add(trunk, bark, x, 0.9 * s, z, s, 2.8 * s, s);
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2, b = add(limb, bark, x + Math.cos(a) * 0.55 * s, 2.5 * s, z + Math.sin(a) * 0.55 * s, s, 1.1 * s, s); b.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
          add(moundGeo, leaf, x + Math.cos(a) * 1.05 * s, 2.95 * s, z + Math.sin(a) * 1.05 * s, 1.5 * s, 0.5 * s, 1.5 * s);
        }
      }
    }

    // Cour du château de Hakuro : donjon à toits superposés au fond, murs d'enceinte, lanternes de pierre, cerisiers en fleur.
    // Le donjon reste à l'arrière-plan quel que soit le côté d'où l'on regarde.
    buildCastleCourt(add, mat, moundGeo) {
      const T = this.THREE, stone = mat(0x6d6a68), stoneDark = mat(0x57524f), plaster = mat(0xece6da), roof = mat(0x2b2a33, { roughness: 0.6, flatShading: true }), gold = mat(0xc9a24a, { metalness: 0.6, roughness: 0.35 }), timber = mat(0x3a2620);
      const box = new T.BoxGeometry(1, 1, 1), trunk = new T.CylinderGeometry(0.12, 0.22, 1, 7);
      // soubassement de pierre et cinq étages, chacun coiffé d'un toit à quatre pans
      const pivot = new T.Group(), keep = new T.Group(); pivot.add(keep); keep.position.set(0, -0.25, -10.1); keep.scale.setScalar(0.6); this.terrainGroup.add(pivot);
      const part = (...o) => { const m = add(...o); keep.add(m); return m; };
      const base = part(new T.CylinderGeometry(4.6, 6, 2.6, 4), stone, 0, 1.3, 0); base.rotation.y = Math.PI / 4;
      const floors = [[6.2, 1.9], [5, 1.7], [3.9, 1.5], [2.8, 1.4], [1.9, 1.2]];
      let y = 2.6;
      floors.forEach(([w, h], i) => {
        part(box, plaster, 0, y + h / 2, 0, w, h, w);
        const windows = i > 2 ? 3 : 4;
        for (let n = 0; n < windows; n++) part(box, timber, -w / 2 + (n + 0.5) * w / windows, y + h * 0.55, w / 2 + 0.01, 0.34, 0.5, 0.04, false);
        const eave = part(new T.CylinderGeometry(w * 0.36, w * 0.95, 0.9, 4), roof, 0, y + h + 0.4, 0); eave.rotation.y = Math.PI / 4;
        part(box, gold, 0, y + h + 0.0, w * 0.68, w * 0.98, 0.06, 0.06, false);
        y += h + 0.68;
      });
      for (const s of [-1, 1]) { const f = part(new T.ConeGeometry(0.16, 0.7, 6), gold, s * 0.55, y + 0.05, 0); f.rotation.z = s * 0.5; }
      this.castleKeep = pivot; // il tourne avec la vue : toujours au fond, jamais entre la caméra et les pièces
      // murs d'enceinte, blancs à chaperon sombre
      for (const [x, z, w, d] of [[-8.5, -11.5, 8, 0.45], [8.5, -11.5, 8, 0.45], [-12.5, 0, 0.45, 23], [12.5, 0, 0.45, 23], [-8.5, 11.5, 8, 0.45], [8.5, 11.5, 8, 0.45]]) {
        add(box, stoneDark, x, -0.25, z, w + 0.1, 0.5, d + 0.1, false);
        add(box, plaster, x, 0.45, z, w, 1, d);
        add(box, roof, x, 1.05, z, w + 0.34, 0.2, d + 0.34);
      }
      // lanternes de pierre : pied, foyer allumé, toit
      const flame = new T.MeshBasicMaterial({ color: 0xffcf7a }), halo = this.glow(0xffb45e, 0.09);
      for (const [x, z] of [[-6.6, -5.2], [6.6, -5.2], [-6.6, 5.2], [6.6, 5.2]]) {
        add(trunk, stone, x, -0.05, z);
        add(box, stone, x, 0.5, z, 0.62, 0.1, 0.62);
        add(box, flame, x, 0.75, z, 0.3, 0.38, 0.3, false);
        add(new T.CylinderGeometry(0.08, 0.56, 0.3, 6), stoneDark, x, 1.1, z);
        add(new T.SphereGeometry(0.75, 12, 8), halo, x, 0.8, z, 1, 1, 1, false);
      }
      // cerisiers en fleur
      const bark = mat(0x3a2620), blossom = [mat(0xf4b6c6, { roughness: 1 }), mat(0xeaa0b6, { roughness: 1 }), mat(0xf9d2dc, { roughness: 1 })];
      for (const [x, z, s] of [[-8.6, -7.2, 1.35], [8.8, -6.4, 1.15], [-9.2, 7, 1], [9.4, 6.8, 0.9]]) {
        add(trunk, bark, x, 0.55, z, s * 1.3, s * 2.2, s * 1.3);
        for (const k of [-1, 1]) { const b = add(trunk, bark, x + k * 0.5 * s, 1.7 * s, z, s * 0.6, s * 1.5, s * 0.6); b.rotation.z = -k * 0.8; }
        for (let i = 0; i < 16; i++) { const a = i * 2.4, r = (0.4 + (i % 4) * 0.42) * s; add(moundGeo, blossom[i % 3], x + Math.cos(a) * r, (1.9 + (i % 5) * 0.34) * s, z + Math.sin(a) * r, 1.5 * s, 1.1 * s, 1.5 * s); }
      }
    }

    // Animaux du décor : ceux qui représentent le mieux chaque paysage se promènent, sautent, volent ou nagent autour du plateau
    // Arène du Ciel : rochers qui flottent lentement autour de l'arène
    buildSkyRocks() {
      const T = this.THREE, rock = new T.MeshStandardMaterial({ color: 0x8a8799, roughness: 0.95, flatShading: true }), moss = new T.MeshStandardMaterial({ color: 0xcfd6e6, roughness: 1, flatShading: true });
      const geo = new T.IcosahedronGeometry(1, 0), topGeo = new T.CylinderGeometry(0.72, 0.9, 0.3, 7);
      for (let i = 0; i < 9; i++) {
        const g = new T.Group(), s = 0.55 + (i * 37 % 10) / 10, ang = i / 9 * Math.PI * 2 + 0.3, r = 13 + (i * 53 % 10) * 0.7, y = 0.5 + (i * 71 % 10) * 0.42;
        const under = new T.Mesh(geo, rock); under.scale.set(s * 1.1, s * 1.25, s); under.position.y = -s * 0.55; under.rotation.y = i; g.add(under);
        const top = new T.Mesh(topGeo, moss); top.scale.set(s * 1.3, s, s * 1.2); top.position.y = s * 0.3; g.add(top);
        g.rotation.y = i * 1.7; this.animalGroup.add(g);
        this.animals.push({ g, behave: 'float', ang, r, y, phase: i * 1.3 });
      }
    }

    // Cour du château : pétales de cerisier emportés par le vent
    buildPetals(colors = [0xf4b6c6, 0xeaa0b6, 0xfbe0e7]) {
      const T = this.THREE, geo = new T.PlaneGeometry(0.11, 0.075), tints = colors.map((color) => new T.MeshBasicMaterial({ color, side: T.DoubleSide, transparent: true, opacity: 0.92 }));
      for (let i = 0; i < 70; i++) {
        const g = new T.Mesh(geo, tints[i % 3]); this.animalGroup.add(g);
        this.animals.push({ g, behave: 'petal', x: (i * 37 % 100) / 100 * 28, y: (i * 53 % 100) / 100 * 7, z: (i * 71 % 100) / 100 * 22 - 11, sp: 0.5 + (i % 5) * 0.16, phase: i * 1.3 });
      }
    }

    // Clairière du Volcan : ptérosaures qui tournent très haut au-dessus du plateau
    buildPterosaurs() {
      const T = this.THREE, skin = new T.MeshStandardMaterial({ color: 0x4a3a34, roughness: 0.9, side: T.DoubleSide }), wingGeo = new T.BoxGeometry(0.8, 0.02, 0.3), body = new T.ConeGeometry(0.07, 0.45, 6);
      for (let i = 0; i < 4; i++) {
        const g = new T.Group(), b = new T.Mesh(body, skin); b.rotation.x = Math.PI / 2; g.add(b); const wings = [];
        for (const s of [-1, 1]) { const w = new T.Group(), m = new T.Mesh(wingGeo, skin); m.position.x = s * 0.4; w.add(m); g.add(w); wings.push(w); }
        this.animalGroup.add(g);
        this.animals.push({ g, behave: 'fly', wings, ang: i * 1.6, r: 14 + i * 1.5, y: 5 + i * 0.7, speed: 0.14 + i * 0.03, dir: i % 2 ? 1 : -1, phase: i * 1.7 });
      }
    }

    buildAnimals(terrain) {
      const T = this.THREE;
      if (!this.animalGroup) { this.animalGroup = new T.Group(); this.animalGroup.position.y = GROUND + 0.535; this.scene.add(this.animalGroup); }
      this.animalGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.animalGroup.clear();
      this.animals = [];
      if (terrain.kind === 'castle') { this.buildPetals(); return; } // pétales de cerisier dans le vent du soir
      if (terrain.kind === 'banco') { this.buildPetals([0xe2b07a, 0xb8683a, 0xf3d9a0]); return; } // poussière de terre dans le vent
      if (terrain.kind === 'volcano') { this.buildPetals([0xff8a2a, 0x6d6478, 0x8d8590]); this.buildPterosaurs(); return; } // braises, cendres et ptérosaures
      if (terrain.kind === 'arena') { this.buildSkyRocks(); return; } // pas d'animaux dans le ciel : des rochers flottants
      const mat = (color) => new T.MeshStandardMaterial({ color, roughness: 0.85 });
      const mesh = (geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; };
      const box = new T.BoxGeometry(1, 1, 1), ball = new T.SphereGeometry(0.5, 12, 9), cone = new T.ConeGeometry(0.5, 1, 7), cyl = new T.CylinderGeometry(0.5, 0.5, 1, 7);
      const eyeM = mat(0x111111);
      const put = (p, o, rx = 0, ry = 0, rz = 0) => { o.rotation.set(rx, ry, rz); p.add(o); return o; };
      // Quadrupède : corps, cou, tête, pattes articulées (cerf, vache, chameau, chèvre…)
      const quad = (o) => {
        const g = new T.Group(), m = mat(o.color), dark = mat(o.dark || 0x2b2018);
        const L = o.len, H = o.h, W = o.w, legH = o.legH;
        g.add(mesh(ball, m, 0, legH + H / 2, 0, W, H, L));
        if (o.spots) for (let i = 0; i < 4; i++) g.add(mesh(ball, mat(o.spots), (i % 2 ? 0.5 : -0.5) * W * 0.55, legH + H * 0.6, (i - 1.5) * L * 0.18, W * 0.35, H * 0.35, L * 0.2));
        if (o.wool) for (let i = 0; i < 6; i++) g.add(mesh(ball, m, (i % 2 ? 0.3 : -0.3) * W, legH + H * 0.62, (i / 5 - 0.5) * L * 0.7, W * 0.6, H * 0.6, W * 0.6));
        if (o.humps) for (let i = 0; i < o.humps; i++) g.add(mesh(ball, m, 0, legH + H * 0.95, (o.humps === 1 ? 0 : (i ? -0.18 : 0.18)) * L, W * 0.6, H * 0.6, L * 0.3));
        const neck = new T.Group(); neck.position.set(0, legH + H * 0.7, L * 0.42); g.add(neck);
        neck.add(mesh(cyl, m, 0, o.neck / 2, 0, W * 0.35, o.neck, W * 0.35));
        const head = new T.Group(); head.position.set(0, o.neck, 0.02); neck.add(head);
        neck.rotation.x = o.neckTilt || 0.5; head.rotation.x = -(o.neckTilt || 0.5);
        head.add(mesh(ball, m, 0, 0, o.head * 0.4, o.head * 0.75, o.head * 0.7, o.head * 1.3));
        head.add(mesh(ball, o.muzzle ? mat(o.muzzle) : dark, 0, -o.head * 0.08, o.head * 1.0, o.head * 0.45, o.head * 0.38, o.head * 0.4));
        for (const s of [-1, 1]) {
          head.add(mesh(ball, eyeM, s * o.head * 0.3, o.head * 0.12, o.head * 0.62, o.head * 0.12, o.head * 0.12, o.head * 0.12));
          if (o.ears) put(head, mesh(cone, m, s * o.head * 0.32, o.head * 0.42, o.head * 0.1, o.head * 0.18, o.head * o.ears, o.head * 0.12), 0, 0, -s * 0.5);
          if (o.horns) put(head, mesh(cone, mat(o.hornColor || 0xd8ccb0), s * o.head * 0.22, o.head * 0.55, -o.head * 0.05, o.head * 0.12, o.head * o.horns, o.head * 0.12), -0.5, 0, -s * 0.25);
          if (o.antlers) {
            const a = new T.Group(); a.position.set(s * o.head * 0.22, o.head * 0.4, 0); a.rotation.z = -s * 0.35; head.add(a);
            a.add(mesh(cyl, mat(0x8a6a44), 0, o.head * 0.45, 0, o.head * 0.07, o.head * 0.9, o.head * 0.07));
            for (let k = 0; k < 3; k++) put(a, mesh(cyl, mat(0x8a6a44), s * o.head * 0.15, o.head * (0.35 + k * 0.22), o.head * 0.05, o.head * 0.05, o.head * 0.35, o.head * 0.05), 0, 0, -s * 0.9);
          }
        }
        if (o.mane) neck.add(mesh(box, mat(o.mane), 0, o.neck * 0.55, -W * 0.15, W * 0.12, o.neck * 1.05, W * 0.18));
        const tail = mesh(cyl, o.tailColor ? mat(o.tailColor) : m, 0, legH + H * 0.75, -L * 0.52, W * 0.1, H * 0.7, W * 0.1); tail.rotation.x = 0.5; g.add(tail);
        const legs = [];
        for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
          const pivot = new T.Group(); pivot.position.set(sx * W * 0.3, legH, sz * L * 0.32); g.add(pivot);
          pivot.add(mesh(cyl, m, 0, -legH / 2, 0, W * 0.16, legH, W * 0.16));
          pivot.add(mesh(cyl, dark, 0, -legH + 0.02, 0, W * 0.18, 0.05, W * 0.18));
          legs.push(pivot);
        }
        g.scale.setScalar(o.scale || 1);
        return { g, legs, neck, tail };
      };
      // Oiseau en vol : corps fuselé et deux ailes qui battent
      const bird = (color, span, beakColor = 0xe0a030) => {
        const g = new T.Group(), m = mat(color);
        g.add(mesh(ball, m, 0, 0, 0, span * 0.22, span * 0.2, span * 0.55));
        g.add(mesh(ball, m, 0, span * 0.06, span * 0.3, span * 0.17, span * 0.17, span * 0.2));
        put(g, mesh(cone, mat(beakColor), 0, span * 0.05, span * 0.45, span * 0.06, span * 0.14, span * 0.06), Math.PI / 2, 0, 0);
        const wings = [];
        for (const s of [-1, 1]) {
          const w = new T.Group(); w.position.set(s * span * 0.08, span * 0.04, 0); g.add(w);
          w.add(mesh(box, m, s * span * 0.27, 0, 0, span * 0.55, span * 0.03, span * 0.26));
          wings.push(w);
        }
        return { g, wings };
      };
      // Petites bêtes : lapin, grenouille, crabe, lézard, tortue, canard, cochon, papillon
      const small = (kind) => {
        const g = new T.Group();
        if (kind === 'rabbit') {
          const m = mat(0x9b9188);
          g.add(mesh(ball, m, 0, 0.14, 0, 0.22, 0.2, 0.3)); g.add(mesh(ball, m, 0, 0.24, 0.14, 0.15, 0.15, 0.16));
          for (const s of [-1, 1]) { g.add(mesh(ball, m, s * 0.04, 0.36, 0.12, 0.04, 0.16, 0.03)); g.add(mesh(ball, eyeM, s * 0.05, 0.26, 0.21, 0.025, 0.025, 0.025)); }
          g.add(mesh(ball, mat(0xffffff), 0, 0.16, -0.16, 0.07, 0.07, 0.07));
        } else if (kind === 'frog') {
          const m = mat(0x4f9a3a);
          g.add(mesh(ball, m, 0, 0.07, 0, 0.2, 0.11, 0.24));
          for (const s of [-1, 1]) { g.add(mesh(ball, m, s * 0.06, 0.13, 0.08, 0.07, 0.07, 0.07)); g.add(mesh(ball, eyeM, s * 0.07, 0.15, 0.1, 0.035, 0.035, 0.035)); g.add(mesh(ball, m, s * 0.1, 0.04, -0.08, 0.08, 0.05, 0.14)); }
        } else if (kind === 'crab') {
          const m = mat(0xd2462e);
          g.add(mesh(ball, m, 0, 0.07, 0, 0.26, 0.09, 0.18));
          for (const s of [-1, 1]) {
            g.add(mesh(ball, m, s * 0.16, 0.08, 0.1, 0.09, 0.06, 0.07));
            g.add(mesh(cyl, m, s * 0.04, 0.13, 0.05, 0.015, 0.06, 0.015)); g.add(mesh(ball, eyeM, s * 0.04, 0.17, 0.05, 0.03, 0.03, 0.03));
            for (let k = 0; k < 3; k++) put(g, mesh(cyl, m, s * 0.15, 0.04, (k - 1) * 0.06, 0.015, 0.12, 0.015), 0, 0, s * 1.1);
          }
        } else if (kind === 'lizard') {
          const m = mat(0x8a7a3c);
          g.add(mesh(ball, m, 0, 0.04, 0, 0.08, 0.05, 0.3)); g.add(mesh(ball, m, 0, 0.05, 0.17, 0.07, 0.05, 0.09));
          put(g, mesh(cone, m, 0, 0.03, -0.27, 0.04, 0.3, 0.04), -Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) for (const z of [0.08, -0.08]) put(g, mesh(cyl, m, s * 0.07, 0.02, z, 0.015, 0.08, 0.015), 0, 0, s * 1.2);
        } else if (kind === 'turtle') {
          g.add(mesh(ball, mat(0x5c6b2c), 0, 0.09, 0, 0.32, 0.16, 0.38)); g.add(mesh(ball, mat(0x9aa86a), 0, 0.06, 0.22, 0.1, 0.08, 0.12));
          for (const s of [-1, 1]) for (const z of [0.12, -0.12]) g.add(mesh(ball, mat(0x9aa86a), s * 0.14, 0.03, z, 0.08, 0.04, 0.1));
        } else if (kind === 'duck') {
          const m = mat(0xf1efe6);
          g.add(mesh(ball, m, 0, 0.1, 0, 0.18, 0.13, 0.28)); g.add(mesh(ball, mat(0x2f6e3a), 0, 0.24, 0.12, 0.11, 0.11, 0.11));
          g.add(mesh(box, mat(0xe6a22a), 0, 0.22, 0.2, 0.06, 0.02, 0.08));
          for (const s of [-1, 1]) g.add(mesh(ball, eyeM, s * 0.045, 0.26, 0.16, 0.02, 0.02, 0.02));
        } else if (kind === 'pig') {
          const m = mat(0xe9a9a4);
          g.add(mesh(ball, m, 0, 0.22, 0, 0.32, 0.28, 0.46)); g.add(mesh(ball, m, 0, 0.26, 0.26, 0.22, 0.2, 0.18)); put(g, mesh(cyl, mat(0xd98a86), 0, 0.25, 0.36, 0.09, 0.05, 0.09), Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) { g.add(mesh(cone, m, s * 0.08, 0.38, 0.24, 0.06, 0.08, 0.04)); g.add(mesh(ball, eyeM, s * 0.06, 0.3, 0.33, 0.025, 0.025, 0.025)); for (const z of [0.12, -0.12]) g.add(mesh(cyl, m, s * 0.1, 0.06, z, 0.06, 0.12, 0.06)); }
          // un peu de boue sur le dos
          g.add(mesh(ball, mat(0x5a4632), 0.05, 0.33, -0.08, 0.16, 0.06, 0.18));
        } else if (kind === 'butterfly') {
          const wings = [];
          put(g, mesh(cyl, mat(0x222222), 0, 0, 0, 0.012, 0.08, 0.012), Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) { const w = new T.Group(); g.add(w); w.add(mesh(ball, mat(s > 0 ? 0xf2a43a : 0xf2a43a), s * 0.05, 0, 0, 0.09, 0.008, 0.07)); wings.push(w); }
          g.userData.wings = wings;
        }
        return g;
      };
      const groundY = -0.535;
      const place = (g, behave, extra = {}) => {
        const a = { g, behave, ang: Math.random() * Math.PI * 2, r: (extra.r || 5.2 + Math.random() * 1.3) + 1.4, speed: extra.speed || 0.06, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * 10, pauseUntil: 0, ...extra };
        g.position.set(Math.cos(a.ang) * a.r, groundY + (a.y || 0), Math.sin(a.ang) * a.r);
        this.animalGroup.add(g); this.animals.push(a); return a;
      };
      const herd = (n, make, extra) => { const ang = Math.random() * Math.PI * 2; for (let i = 0; i < n; i++) { const q = make(); place(q.g, 'walk', { legs: q.legs, neck: q.neck, ...extra, ang: ang + i * 0.45 + Math.random() * 0.1, r: 5.3 + (i % 2) * 0.8 }); } };
      const flock = (n, color, span, extra = {}) => { for (let i = 0; i < n; i++) { const b = bird(color, span, extra.beak); place(b.g, 'fly', { wings: b.wings, r: 4.5 + Math.random() * 2.5, y: 5 + Math.random() * 2.5, speed: 0.25 + Math.random() * 0.1, ...extra }); } };
      const critters = (n, kind, behave, extra = {}) => { for (let i = 0; i < n; i++) place(small(kind), behave, { speed: 0.12, r: 5.0 + Math.random() * 1.6, ...extra }); };
      const k = terrain.kind;
      if (k === 'forest') {
        herd(2, () => quad({ color: 0x9a6a3c, dark: 0x3b2a1c, muzzle: 0x3b2a1c, len: 0.9, h: 0.42, w: 0.38, legH: 0.55, neck: 0.42, head: 0.24, ears: 0.6, antlers: true, tailColor: 0xf3eadb, scale: 0.8 }), { speed: 0.05 });
        critters(3, 'rabbit', 'hop', { speed: 0.18 });
        flock(4, 0x3a3530, 0.45);
      } else if (k === 'desert') {
        herd(2, () => quad({ color: 0xc9a066, len: 1.1, h: 0.5, w: 0.45, legH: 0.8, neck: 0.75, neckTilt: 0.85, head: 0.24, ears: 0.3, humps: 2, scale: 0.85 }), { speed: 0.035 });
        critters(3, 'lizard', 'dash', { speed: 0.5 });
        flock(2, 0x2c2522, 0.9, { beak: 0xd0b07a, y: 7, speed: 0.12 });
      } else if (k === 'grass') {
        herd(2, () => quad({ color: 0xf2efe7, spots: 0x2a2522, muzzle: 0xe9b1a8, len: 1.0, h: 0.5, w: 0.48, legH: 0.48, neck: 0.25, neckTilt: 0.2, head: 0.27, ears: 0.25, horns: 0.25, scale: 0.85 }), { speed: 0.03, graze: true });
        herd(3, () => quad({ color: 0xf4f1ea, dark: 0x2a2522, muzzle: 0x2a2522, len: 0.6, h: 0.34, w: 0.36, legH: 0.3, neck: 0.15, neckTilt: 0.3, head: 0.18, ears: 0.35, wool: true, scale: 0.85 }), { speed: 0.04, graze: true });
        critters(4, 'butterfly', 'flutter', { r: 5.6 + Math.random() * 2, y: 0.8 });
      } else if (k === 'steppe') {
        herd(2, () => quad({ color: 0x7a4e2c, mane: 0x2a1c12, tailColor: 0x2a1c12, len: 1.0, h: 0.45, w: 0.4, legH: 0.7, neck: 0.55, neckTilt: 0.7, head: 0.26, ears: 0.35, scale: 0.85 }), { speed: 0.07 });
        herd(3, () => quad({ color: 0xc89a5e, muzzle: 0xf2ead8, len: 0.7, h: 0.32, w: 0.3, legH: 0.55, neck: 0.4, neckTilt: 0.6, head: 0.18, ears: 0.5, horns: 1.6, hornColor: 0x3a2c22, tailColor: 0xf2ead8, scale: 0.8 }), { speed: 0.09 });
        flock(1, 0x5a3f28, 1.0, { beak: 0xe0b040, y: 7.5, speed: 0.1 });
      } else if (k === 'mud') {
        for (let i = 0; i < 3; i++) place(small('pig'), 'walk', { speed: 0.035, graze: true, r: 5.3 + i * 0.4 });
        critters(4, 'frog', 'hop', { speed: 0.14 });
        flock(3, 0x2a2a2a, 0.35);
      } else if (k === 'rock') {
        herd(3, () => quad({ color: 0xece8de, dark: 0x3a332c, muzzle: 0x9a9088, len: 0.65, h: 0.36, w: 0.32, legH: 0.42, neck: 0.32, neckTilt: 0.55, head: 0.2, ears: 0.35, horns: 1.4, hornColor: 0x4a4038, scale: 0.85 }), { speed: 0.05, perch: true });
        flock(2, 0x4a3524, 1.1, { beak: 0xe0b040, y: 8, speed: 0.09 });
      } else if (k === 'water') {
        for (let i = 0; i < 4; i++) place(small('duck'), 'swim', { speed: 0.05, r: 5.6 + Math.random() * 1.8, y: 0.02 });
        critters(3, 'frog', 'hop', { speed: 0.14 });
        herd(1, () => quad({ color: 0xeef0f0, dark: 0xd8a83a, muzzle: 0xd8a83a, len: 0.35, h: 0.3, w: 0.26, legH: 0.75, neck: 0.55, neckTilt: 0.3, head: 0.12, scale: 0.9 }), { speed: 0.02, graze: true });
      } else if (k === 'beach') {
        critters(4, 'crab', 'scuttle', { speed: 0.25 });
        critters(2, 'turtle', 'walk', { speed: 0.02 });
        flock(4, 0xf4f4f0, 0.6, { beak: 0xf0b030, y: 4.5 });
      }
    }
    tickAnimals(t, dt) {
      if (!this.animals || !this.animals.length || !this.animalGroup.visible) return;
      const groundY = -0.535;
      if (this.castleKeep) this.castleKeep.rotation.y = this.viewYaw();
      for (const a of this.animals) {
        const g = a.g;
        if (a.behave === 'petal') {
          a.x = (a.x + dt * a.sp * 1.1) % 28; a.y -= dt * a.sp * 0.28; if (a.y < 0.05) a.y = 7;
          g.position.set(a.x - 14, a.y + Math.sin(t * 1.3 + a.phase) * 0.14, a.z + Math.sin(t * 0.6 + a.phase) * 0.6);
          g.rotation.set(t * 1.7 + a.phase, t * 1.1 + a.phase, 0);
          continue;
        }
        if (a.behave === 'float') {
          a.ang += dt * 0.012;
          g.position.set(Math.cos(a.ang) * a.r, a.y + Math.sin(t * 0.5 + a.phase) * 0.28, Math.sin(a.ang) * a.r);
          continue;
        }
        if (a.behave === 'fly') {
          a.ang += a.dir * a.speed * dt;
          g.position.set(Math.cos(a.ang) * a.r, a.y + Math.sin(t * 0.7 + a.phase) * 0.4, Math.sin(a.ang) * a.r);
          g.rotation.set(0, Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir), -a.dir * 0.25);
          const flap = Math.sin(t * (a.speed > 0.2 ? 11 : 4) + a.phase) * (a.speed > 0.2 ? 0.7 : 0.25);
          a.wings[0].rotation.z = flap; a.wings[1].rotation.z = -flap;
          continue;
        }
        if (a.behave === 'flutter') {
          a.ang += a.dir * a.speed * 0.6 * dt + Math.sin(t * 1.3 + a.phase) * 0.004;
          g.position.set(Math.cos(a.ang) * a.r, groundY + a.y + Math.sin(t * 2.2 + a.phase) * 0.35, Math.sin(a.ang) * a.r);
          g.rotation.y = Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir);
          const f = Math.sin(t * 22 + a.phase) * 1.1; g.userData.wings[0].rotation.z = f; g.userData.wings[1].rotation.z = -f;
          continue;
        }
        // pauses : les bêtes s'arrêtent, broutent ou regardent autour d'elles, puis repartent (parfois dans l'autre sens)
        if (t > a.pauseUntil && Math.random() < dt * 0.12) { a.pauseUntil = t + 1.5 + Math.random() * 3.5; if (Math.random() < 0.3) a.dir *= -1; }
        const moving = t > a.pauseUntil;
        if (moving) { a.ang += a.dir * a.speed * dt; a.r += Math.sin(t * 0.3 + a.phase) * 0.004; a.r = Math.max(5.0, Math.min(6.8, a.r)); }
        let lift = 0;
        if (a.behave === 'hop') lift = moving ? Math.abs(Math.sin(t * 5 + a.phase)) * 0.18 : 0;
        if (a.behave === 'swim') lift = Math.sin(t * 2 + a.phase) * 0.015;
        g.position.set(Math.cos(a.ang) * a.r, groundY + (a.y || 0) + lift, Math.sin(a.ang) * a.r);
        const heading = Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir);
        g.rotation.y = a.behave === 'scuttle' ? heading + Math.PI / 2 : heading;
        if (a.legs) a.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(t * 7 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45 : 0; });
        if (a.neck) a.neck.rotation.x = (a.graze && !moving ? 1.3 : 0.5) + Math.sin(t * 1.5 + a.phase) * 0.06;
        if (a.behave === 'dash' && moving) a.ang += a.dir * a.speed * dt * (Math.sin(t * 3 + a.phase) > 0.6 ? 2 : 0);
      }
    }

    // Sol peint selon le paysage (herbe, sable, boue, cailloux…) et panorama de fond (collines, dunes, montagnes, mer…)
    groundTexture(terrain) {
      const T = this.THREE, c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d'), k = terrain.kind, base = new T.Color(terrain.ground);
      const rnd = (() => { let x = 12345; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
      const col = (dl, alpha = 1) => { const cc = base.clone().offsetHSL(0, 0, dl); return `rgba(${Math.round(cc.r * 255)},${Math.round(cc.g * 255)},${Math.round(cc.b * 255)},${alpha})`; };
      g.fillStyle = col(0); g.fillRect(0, 0, 512, 512);
      // grain de fond
      for (let i = 0; i < 2600; i++) { g.fillStyle = col((rnd() - 0.5) * 0.12, 0.5); g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 4, 2 + rnd() * 4); }
      if (k === 'volcano') { // herbe rase, terre et cendre
        for (let i = 0; i < 3000; i++) { g.fillStyle = col((rnd() - 0.5) * 0.18, 0.7); g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
        for (let i = 0; i < 16; i++) { const x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 50, a = g.createRadialGradient(x, y, 2, x, y, r); a.addColorStop(0, 'rgba(50,44,40,0.5)'); a.addColorStop(1, 'rgba(50,44,40,0)'); g.fillStyle = a; g.fillRect(x - r, y - r, r * 2, r * 2); }
      } else if (k === 'banco') { // terre rouge battue, craquelée, traces de pas
        for (let i = 0; i < 2600; i++) { g.fillStyle = col((rnd() - 0.5) * 0.14, 0.7); g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
        g.strokeStyle = 'rgba(60,24,10,0.25)'; g.lineWidth = 1.2; for (let i = 0; i < 90; i++) { let x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 34; y += (rnd() - 0.5) * 34; g.lineTo(x, y); } g.stroke(); }
      } else if (k === 'castle') { // cour de terre battue, gravier ratissé et dalles de pierre
        for (let i = 0; i < 2200; i++) { g.fillStyle = col((rnd() - 0.5) * 0.16, 0.7); g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2.4, 1 + rnd() * 2.4); }
        g.lineWidth = 1; for (let y = 6; y < 512; y += 13) { g.strokeStyle = 'rgba(40,26,20,0.14)'; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + y) * 2); g.stroke(); }
        for (let i = 0; i < 26; i++) { const x = rnd() * 512, y = rnd() * 512, w = 26 + rnd() * 34, h = 18 + rnd() * 22; g.fillStyle = 'rgba(120,108,104,0.42)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(30,20,18,0.35)'; g.strokeRect(x, y, w, h); }
      } else if (k === 'arena') { // mer de nuages sous l'arène
        for (let i = 0; i < 150; i++) { const x = rnd() * 512, y = rnd() * 512, r = 18 + rnd() * 48, a = g.createRadialGradient(x, y, 1, x, y, r); a.addColorStop(0, rnd() < 0.7 ? 'rgba(235,242,252,0.6)' : 'rgba(150,178,220,0.6)'); a.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = a; g.fillRect(x - r, y - r, r * 2, r * 2); }
      } else if (k === 'forest' || k === 'grass') {
        for (let i = 0; i < 1800; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = col(0.04 + rnd() * 0.12, 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 6); g.stroke(); }
        if (k === 'grass') for (let i = 0; i < 60; i++) { g.fillStyle = ['#f6f2d0', '#f3d34a', '#e98fb0', '#ffffff'][i % 4]; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 2.2, 0, 7); g.fill(); }
        if (k === 'forest') for (let i = 0; i < 90; i++) { g.fillStyle = ['#6b4a26', '#8a6a2a', '#4d3a1f'][i % 3]; g.save(); g.translate(rnd() * 512, rnd() * 512); g.rotate(rnd() * 6); g.beginPath(); g.ellipse(0, 0, 5, 2.5, 0, 0, 7); g.fill(); g.restore(); }
      } else if (k === 'desert' || k === 'beach') {
        for (let y = 0; y < 512; y += 9) { g.strokeStyle = col(0.06, 0.45); g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 3); g.stroke(); }
        for (let i = 0; i < 40; i++) { g.fillStyle = k === 'beach' ? '#f4ead8' : col(-0.12, 0.7); g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 1.5 + rnd() * 2, 0, 7); g.fill(); }
      } else if (k === 'steppe') {
        for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = rnd() < 0.5 ? '#c9b36d' : '#8f7d45'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y - 4 - rnd() * 5); g.stroke(); }
        for (let i = 0; i < 25; i++) { g.strokeStyle = col(-0.15, 0.5); g.lineWidth = 1.2; g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
      } else if (k === 'mud') {
        for (let i = 0; i < 45; i++) { g.fillStyle = col(-0.1 - rnd() * 0.06, 0.75); g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(160,170,160,0.25)'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 4 + rnd() * 6, 2, 0, 0, 7); g.fill(); }
      } else if (k === 'rock') {
        for (let i = 0; i < 220; i++) { g.fillStyle = col((rnd() - 0.3) * 0.3, 0.9); g.beginPath(); const x = rnd() * 512, y = rnd() * 512, r = 2 + rnd() * 8; g.moveTo(x + r, y); for (let a = 1; a < 6; a++) g.lineTo(x + Math.cos(a * 1.25) * r * (0.7 + rnd() * 0.4), y + Math.sin(a * 1.25) * r * (0.7 + rnd() * 0.4)); g.fill(); }
      } else if (k === 'water') {
        for (let i = 0; i < 28; i++) { g.fillStyle = 'rgba(90,150,160,0.55)'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 14 + rnd() * 26, 8 + rnd() * 12, rnd() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = col(0.08, 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 5); g.stroke(); }
      }
      const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(26, 26); tex.anisotropy = 4;
      if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
      return tex;
    }
    panoramaTexture(terrain) {
      const T = this.THREE, c = document.createElement('canvas'); c.width = 2048; c.height = 512;
      const g = c.getContext('2d'), k = terrain.kind, sky = new T.Color(terrain.sky);
      const hex = (cc) => `#${cc.getHexString()}`;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, hex(sky.clone().offsetHSL(0, 0.05, 0.12))); grad.addColorStop(0.7, hex(sky)); grad.addColorStop(1, hex(sky.clone().offsetHSL(0, 0, 0.06)));
      g.fillStyle = grad; g.fillRect(0, 0, 2048, 512);
      const rnd = (() => { let x = 777; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
      // nuages légers
      for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; const x = rnd() * 2048, y = 40 + rnd() * 120; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 28, y + (j % 2) * 6, 40, 14, 0, 0, 7); g.fill(); } }
      const ridge = (color, base, amp, freq, rough) => {
        g.fillStyle = color; g.beginPath(); g.moveTo(0, 512);
        for (let x = 0; x <= 2048; x += 8) g.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * freq + rough)) - amp * 0.35 * Math.sin(x * freq * 3.1 + rough * 2) - (rough > 0 ? rnd() * amp * 0.08 : 0));
        g.lineTo(2048, 512); g.fill();
      };
      const ground = new T.Color(terrain.ground), shade = (dl, h = 0) => hex(ground.clone().offsetHSL(h, 0, dl).lerp(sky, 0.35 - dl));
      if (k === 'volcano') { // chaînes de volcans lointains, jungle sombre
        ridge('#6a3a34', 340, 120, 0.005, 0.7); ridge('#4a2c2c', 400, 80, 0.009, 2.1);
        for (let x = 0; x < 2048; x += 28) { const h = 40 + (x * 17 % 40), y = 450; g.fillStyle = '#26382a'; g.beginPath(); g.ellipse(x, y - h / 2, 34, h / 2, 0, 0, 7); g.fill(); }
      } else if (k === 'banco') { // savane au soleil couchant, acacias lointains
        ridge('#c9713a', 400, 40, 0.004, 0.7); ridge('#a85a30', 440, 30, 0.008, 2.1);
        for (let x = 30; x < 2048; x += 150) { const y = 432 - Math.sin(x * 0.01) * 10, h = 40 + (x * 13 % 22); g.fillStyle = '#3a2418'; g.fillRect(x - 3, y - h, 6, h); g.beginPath(); g.ellipse(x, y - h, 50, 12, 0, 0, 7); g.fill(); }
      } else if (k === 'castle') { // collines au crépuscule, pins sombres et murailles lointaines
        ridge('#6a4560', 350, 90, 0.004, 0.7); ridge('#4e3350', 400, 70, 0.007, 2.1);
        for (let x = 0; x < 2048; x += 34) { const h = 34 + (x * 13 % 26), y = 430 - Math.sin(x * 0.01) * 16; g.fillStyle = '#2f2238'; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x, y - h); g.lineTo(x + 18, y); g.fill(); }
        ridge('#3a2838', 462, 28, 0.012, 0.4);
      } else if (k === 'arena') { // horizon de nuages et rochers flottants au loin
        for (let i = 0; i < 26; i++) { const x = rnd() * 2048, y = 90 + rnd() * 170, s = 16 + rnd() * 34; g.fillStyle = '#7f8db0'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.lineTo(x + s * 0.3, y + s * 1.2); g.lineTo(x - s * 0.4, y + s * 0.8); g.fill(); g.fillStyle = '#dfe7f4'; g.fillRect(x - s, y - 3, s * 2, 4); }
        for (let i = 0; i < 70; i++) { const x = rnd() * 2048, y = 370 + rnd() * 130, r = 30 + rnd() * 70; g.fillStyle = i % 3 ? 'rgba(255,255,255,0.82)' : 'rgba(205,222,245,0.8)'; g.beginPath(); g.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, 7); g.fill(); }
      } else if (k === 'rock') { ridge('#8d939a', 360, 180, 0.006, 1.3); ridge('#6c7277', 410, 120, 0.011, 2.1); ridge(shade(0), 460, 50, 0.02, 0.4); }
      else if (k === 'desert') { ridge('#c99a63', 400, 60, 0.004, 0.2); ridge('#b98a52', 440, 45, 0.008, 1.7); g.fillStyle = '#9a6f45'; g.fillRect(300, 330, 160, 80); g.fillRect(1500, 345, 120, 70); ridge(shade(0.05), 470, 30, 0.012, 0.9); }
      else if (k === 'beach') {
        g.fillStyle = '#1aa3c4'; g.fillRect(0, 380, 2048, 132); g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 40; i++) g.fillRect(rnd() * 2048, 390 + rnd() * 100, 30 + rnd() * 40, 2);
        for (let i = 0; i < 6; i++) { const x = 150 + i * 340 + rnd() * 80; g.strokeStyle = '#3d3020'; g.lineWidth = 8; g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x + 20, 400, x + 10, 340); g.stroke(); g.fillStyle = '#2d6b3a'; for (let a = 0; a < 6; a++) { g.beginPath(); g.ellipse(x + 10 + Math.cos(a) * 30, 340 + Math.sin(a) * 10, 34, 7, a, 0, 7); g.fill(); } }
      } else if (k === 'forest') { ridge('#5c7a5e', 380, 70, 0.005, 0.6); for (let x = 0; x < 2048; x += 22) { const h = 70 + rnd() * 60; g.fillStyle = rnd() < 0.5 ? '#2f5434' : '#3b6640'; g.beginPath(); g.moveTo(x, 470); g.lineTo(x + 18, 470 - h); g.lineTo(x + 36, 470); g.fill(); } }
      else if (k === 'grass') { ridge('#8db37a', 400, 70, 0.004, 0.3); ridge('#79a65e', 440, 50, 0.007, 1.9); for (let i = 0; i < 18; i++) { const x = rnd() * 2048; g.fillStyle = '#4f7a3c'; g.beginPath(); g.arc(x, 420, 18, 0, 7); g.fill(); g.fillRect(x - 3, 420, 6, 30); } }
      else if (k === 'steppe') { ridge('#a6a3a8', 380, 90, 0.003, 2.4); ridge('#b9a575', 445, 30, 0.006, 0.8); }
      else if (k === 'mud') { ridge('#7d7a6e', 400, 80, 0.005, 1.1); ridge('#5f594a', 450, 40, 0.01, 0.5); }
      else { ridge('#86a3a0', 400, 70, 0.005, 1.6); g.fillStyle = '#7fb0b8'; g.fillRect(0, 440, 2048, 30); ridge('#5f7f73', 470, 25, 0.012, 0.2); }
      const tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping; tex.repeat.set(1, 1);
      if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
      return tex;
    }
    buildScenery(terrain) {
      const T = this.THREE;
      const oldG = this.floor.material.map; this.floor.material.map = this.groundTexture(terrain); this.floor.material.color.setHex(0xffffff); this.floor.material.needsUpdate = true; if (oldG) oldG.dispose();
      if (!this.backdrop) {
        this.backdrop = new T.Mesh(new T.CylinderGeometry(70, 70, 36, 48, 1, true), new T.MeshBasicMaterial({ side: T.BackSide, fog: false, depthWrite: false }));
        this.backdrop.position.y = 16.5; this.backdrop.renderOrder = -1; this.scene.add(this.backdrop);
      }
      const oldP = this.backdrop.material.map; this.backdrop.material.map = this.panoramaTexture(terrain); this.backdrop.material.needsUpdate = true; if (oldP) oldP.dispose();
    }

    buildTerrain(terrain) {
      const T = this.THREE, oldGeo = new Set(), oldMat = new Set();
      this.terrainGroup.traverse((o) => {
        if (o.geometry) oldGeo.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => oldMat.add(m));
      });
      this.terrainGroup.clear();
      this.castleKeep = null; this.volcanoFerns = null;
      oldGeo.forEach((g) => g.dispose()); oldMat.forEach((m) => m.dispose());

      const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.94, ...extra });
      const stone = mat(terrain.kind === 'desert' || terrain.kind === 'steppe' ? 0x9a805c : 0x777974);
      const wood = mat(terrain.kind === 'forest' ? 0x553b27 : 0x766044);
      const green = mat(terrain.kind === 'forest' ? 0x315d35 : 0x477a38);
      const paleGreen = mat(terrain.id === 'dojo' ? 0xd28a9e : terrain.kind === 'forest' ? 0x527543 : 0x82a84c);
      const sand = mat(terrain.kind === 'beach' ? 0xbfa468 : 0xd2b06f);
      const drySoil = mat(0xb09a6b);
      const water = mat(0x5598a2, { roughness: 0.18, metalness: 0.16, transparent: true, opacity: 0.82 });
      const mud = mat(0x493b2d, { roughness: 0.45 });
      const points = [[-5.8,-5.4],[-3.7,-6.3],[0,-6.1],[3.7,-6.3],[5.8,-5.4],[-6.1,-2.8],[-6.5,0],[-6.1,2.8],[-5.8,5.4],[-3.7,6.3],[0,6.1],[3.7,6.3],[5.8,5.4],[6.1,2.8],[6.5,0],[6.1,-2.8]];
      const add = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, cast = true) => {
        const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
        m.castShadow = cast; m.receiveShadow = true; this.terrainGroup.add(m); return m;
      };
      const disk = new T.CircleGeometry(1, 20);
      const rockGeo = new T.IcosahedronGeometry(0.5, 0);
      const moundGeo = new T.SphereGeometry(0.5, 9, 6);
      const trunkGeo = new T.CylinderGeometry(0.12, 0.2, 1.2, 7);
      const crownGeo = new T.IcosahedronGeometry(0.72, 1);
      const spikeGeo = new T.ConeGeometry(0.17, 1.1, 7);
      const stemGeo = new T.CylinderGeometry(0.055, 0.075, 0.9, 6);

      // Plage : la mer turquoise borde le sable des deux côtés du plateau
      if (terrain.kind === 'beach') {
        const sea = mat(0x0f8fb0, { roughness: 0.2, metalness: 0.12 });
        const foam = mat(0xdcefee, { roughness: 0.6 });
        const seaGeo = new T.PlaneGeometry(120, 22), foamGeo = new T.PlaneGeometry(120, 0.6);
        for (const s of [-1, 1]) {
          const w = add(seaGeo, sea, 0, -0.52, s * 21.5, 1, 1, 1, false); w.rotation.x = -Math.PI / 2;
          const f = add(foamGeo, foam, 0, -0.51, s * 10.3, 1, 1, 1, false); f.rotation.x = -Math.PI / 2;
        }
      }
      const frondGeo = new T.ConeGeometry(0.16, 1.5, 4), trunkPalmGeo = new T.CylinderGeometry(0.1, 0.18, 2.5, 7), nutGeo = new T.SphereGeometry(0.1, 6, 5);
      const palmGreen = mat(0x2f8f4a), palmTrunk = mat(0x8a6a45), nutMat = mat(0x5a3b22), tide = mat(0x1fb0c4, { roughness: 0.18, metalness: 0.14, transparent: true, opacity: 0.88 });
      const palm = (x, z, lean) => {
        const g = new T.Group();
        const trunk = new T.Mesh(trunkPalmGeo, palmTrunk); trunk.position.y = 1.25; trunk.castShadow = true; g.add(trunk);
        for (let k = 0; k < 7; k++) {
          const arm = new T.Group(); arm.position.y = 2.5; arm.rotation.y = (k / 7) * Math.PI * 2;
          const frond = new T.Mesh(frondGeo, palmGreen); frond.position.x = 0.65; frond.rotation.z = -Math.PI / 2 - 0.5; frond.scale.z = 0.3; frond.castShadow = true;
          arm.add(frond); g.add(arm);
        }
        for (let k = 0; k < 3; k++) { const nut = new T.Mesh(nutGeo, nutMat); nut.position.set(Math.cos(k * 2.1) * 0.14, 2.38, Math.sin(k * 2.1) * 0.14); g.add(nut); }
        g.position.set(x, -0.5, z); g.rotation.z = lean; g.rotation.y = x * 0.7;
        this.terrainGroup.add(g);
      };

      // Quelques reliefs proches du socle relient visuellement le plateau au terrain.
      for (let i = 0; i < points.length; i++) {
        // devant et derrière le plateau, le décor est reculé pour ne pas cacher les pièces (le sol est au ras du plateau)
        const x = points[i][0], z = points[i][1] * (Math.abs(points[i][1]) > 5 ? 1.35 : 1), jitter = (i % 3) * 0.16;
        if (terrain.kind === 'arena' || terrain.kind === 'castle' || terrain.kind === 'banco' || terrain.kind === 'volcano') {
          // rien sur la mer de nuages ; la cour du château est bâtie plus bas : les dalles et bornes sont posées plus bas
        } else if (terrain.kind === 'beach') {
          add(moundGeo, sand, x, -0.32, z, 1.7, 0.3, 1);
          if (i % 4 === 0) palm(x, z, (i % 8 === 0 ? 1 : -1) * 0.12);
          else if (i % 4 === 2) { const pool = add(disk, tide, x, -0.512, z, 1.3, 1, 0.8, false); pool.rotation.x = -Math.PI / 2; }
          else if (i % 4 === 1) add(rockGeo, stone, x + 0.2, -0.3, z + 0.1, 0.5, 0.3, 0.42);
        } else if (terrain.kind === 'forest') {
          if (i % 2 === 0) {
            add(trunkGeo, wood, x, 0.05, z, 0.8, 0.9 + jitter, 0.8);
            add(crownGeo, green, x, 0.85, z, 1.2, 1.25, 1.2);
            add(crownGeo, paleGreen, x + 0.32, 1.1, z - 0.16, 0.75, 0.82, 0.75);
          } else add(moundGeo, paleGreen, x, -0.24, z, 0.95, 0.3, 0.85);
        } else if (terrain.kind === 'desert') {
          add(moundGeo, sand, x, -0.32, z, 1.6, 0.35, 0.9);
          if (i % 4 === 0) {
            add(stemGeo, green, x + 0.25, 0.35, z, 1.2, 1.2, 1.2);
            add(stemGeo, green, x + 0.07, 0.62, z, 1, 0.42, 1).rotation.z = Math.PI / 2;
            add(stemGeo, green, x + 0.43, 0.68, z, 1, 0.36, 1).rotation.z = Math.PI / 2;
          }
        } else if (terrain.kind === 'grass') {
          add(moundGeo, paleGreen, x, -0.34, z, 1.25, 0.22, 1.05);
          if (i % 3 === 0) for (let j = 0; j < 3; j++) add(spikeGeo, green, x + (j - 1) * 0.15, -0.1, z + 0.1, 0.35, 0.45, 0.35);
        } else if (terrain.kind === 'steppe') {
          add(moundGeo, drySoil, x, -0.32, z, 1.6, 0.28, 0.85);
          if (i % 3 === 0) add(rockGeo, stone, x + 0.25, -0.08, z, 0.65, 0.48, 0.58);
        } else if (terrain.kind === 'mud') {
          const puddle = add(disk, mud, x, -0.515, z, 1.3, 1, 0.74, false); puddle.rotation.x = -Math.PI / 2;
          if (i % 3 === 0) add(rockGeo, stone, x + 0.35, -0.1, z + 0.22, 0.55, 0.34, 0.62);
        } else if (terrain.kind === 'rock') {
          add(rockGeo, stone, x, -0.1, z, 1.2 + jitter, 1.1, 0.95);
          if (i % 2 === 0) add(rockGeo, paleGreen, x + 0.42, -0.22, z + 0.25, 0.62, 0.46, 0.58);
        } else {
          if (i % 2 === 0) {
            const puddle = add(disk, water, x, -0.514, z, 1.45, 1, 0.9, false); puddle.rotation.x = -Math.PI / 2;
          } else {
            add(stemGeo, green, x, -0.03, z, 0.45, 0.48, 0.45);
            add(stemGeo, paleGreen, x + 0.16, -0.05, z + 0.12, 0.38, 0.43, 0.38);
          }
        }
      }
      if (terrain.kind === 'arena') {
        // Arène de pierre posée sur les nuages : dalle octogonale à gradins, bornes aux angles, nuages tout autour
        const slab = mat(0x6a6584), rim = mat(0x4d4968), cloud = mat(0xcfdcf4, { roughness: 1 }), glowStone = mat(0x4cc3ff, { emissive: 0x2a8fd8, emissiveIntensity: 0.9 });
        const top = add(new T.CylinderGeometry(7.4, 7.7, 0.18, 8), slab, 0, -0.59, 0, 1, 1, 1, false); top.rotation.y = Math.PI / 8;
        const step = add(new T.CylinderGeometry(8.2, 8.6, 0.3, 8), rim, 0, -0.665, 0, 1, 1, 1, false); step.rotation.y = Math.PI / 8;
        const pillar = new T.CylinderGeometry(0.2, 0.28, 1.5, 8), gem = new T.OctahedronGeometry(0.2, 0);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 7.05, z = Math.sin(a) * 7.05;
          add(pillar, rim, x, 0.3, z); add(gem, glowStone, x, 1.25, z, 1, 1.4, 1, false);
        }
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2, r = 9 + (i * 7 % 5) * 0.55;
          add(moundGeo, cloud, Math.cos(a) * r, -0.5, Math.sin(a) * r, 3.4 + i % 3, 1 + (i % 2) * 0.5, 2.4 + i % 2, false);
        }
      }
      if (terrain.kind === 'castle') this.buildCastleCourt(add, mat, moundGeo);
      if (terrain.kind === 'banco') this.buildRoyalCourt(add, mat, moundGeo);
      if (terrain.kind === 'volcano') this.buildVolcanoClearing(add, mat, moundGeo);
      if (terrain.id === 'dojo') {
        const vermilion = mat(0x9e352c), darkWood = mat(0x38251f);
        const post = new T.BoxGeometry(0.2, 1.45, 0.2), crossbar = new T.BoxGeometry(3.1, 0.2, 0.3), lintel = new T.BoxGeometry(3.45, 0.22, 0.38);
        for (const z of [-7.4, 7.4]) {
          add(post, vermilion, -0.92, 0.68, z); add(post, vermilion, 0.92, 0.68, z);
          add(crossbar, darkWood, 0, 1.52, z); add(lintel, vermilion, 0, 1.82, z);
        }
      }
    }

    makeShadowTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new this.THREE.CanvasTexture(c);
    }

    makeStudioEnvironment() {
      const T = this.THREE, canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const context = canvas.getContext('2d');
      const backdrop = context.createLinearGradient(0, 0, 0, canvas.height);
      backdrop.addColorStop(0, '#242b38'); backdrop.addColorStop(0.43, '#aeb9c3');
      backdrop.addColorStop(0.58, '#6b747d'); backdrop.addColorStop(1, '#20262e');
      context.fillStyle = backdrop; context.fillRect(0, 0, canvas.width, canvas.height);
      for (const [x, y, radius, color] of [
        [92, 82, 86, 'rgba(255,244,224,0.88)'], [350, 76, 108, 'rgba(208,229,255,0.78)'],
        [242, 120, 62, 'rgba(255,255,255,0.55)'],
      ]) {
        const glow = context.createRadialGradient(x, y, 2, x, y, radius);
        glow.addColorStop(0, color); glow.addColorStop(0.26, color.replace(/0\.\d+\)$/, '0.32)'));
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = glow; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const texture = new T.CanvasTexture(canvas);
      texture.mapping = T.EquirectangularReflectionMapping;
      texture.encoding = T.sRGBEncoding;
      texture.needsUpdate = true;
      return texture;
    }

    makeWoodTexture() {
      const T = this.THREE, canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      context.fillStyle = '#dedbd4'; context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 180; i++) {
        const y = i * 256 / 180, sway = 1 + (i % 7) * 0.45;
        context.beginPath(); context.moveTo(0, y);
        context.bezierCurveTo(72, y - sway, 184, y + sway, 256, y - sway * 0.3);
        context.strokeStyle = i % 4 ? 'rgba(52,38,22,0.045)' : 'rgba(255,255,255,0.12)';
        context.lineWidth = i % 9 === 0 ? 1.4 : 0.7; context.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const x = 12 + (i * 83) % 232, y = 12 + (i * 137) % 232;
        context.strokeStyle = 'rgba(70,48,25,0.07)'; context.lineWidth = 0.8;
        context.beginPath(); context.ellipse(x, y, 2 + i % 3, 7 + i % 5, 0.04, 0, Math.PI * 2); context.stroke();
      }
      const texture = new T.CanvasTexture(canvas);
      texture.encoding = T.sRGBEncoding;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.repeat.set(2, 1); texture.anisotropy = 4;
      return texture;
    }

    // Angle de vue : côté du joueur + rotation choisie en glissant depuis le bord du plateau
    viewYaw() { return (this.flipped ? Math.PI : 0) + (this.yaw || 0); }
    setCamera(flipped, force) {
      if (flipped === this.flipped && !force) return;
      if (flipped !== this.flipped) this.yaw = 0; // changement de camp : on revient en face
      this.flipped = flipped;
      const a = this.viewYaw(), sn = Math.sin(a), cs = Math.cos(a);
      const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
      const horizontal = radius * Math.cos(elevation);
      this.camera.position.set(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
      this.cameraTarget.set(0.45 * sn, 0.3, 0.45 * cs);
      this.camera.lookAt(this.cameraTarget);
    }

    // Toute action du joueur sur la vue reprend la main sur les caméras automatiques (prise, mat)
    takeCamera() {
      this.captureCamera = null;
      this.attackCamera = null;
      if (this.mateUltimate && this.mateUltimate.camera) this.mateUltimate.camera.released = true;
    }

    startCaptureCamera(from, to, victim, now) {
      const dying = this.dying.find((d) => d.c === victim);
      const impactEnd = dying
        ? dying.knightAttack ? dying.t0 : dying.t0 + (dying.impaled ? 2.4 : 1.1)
        : now + 1;
      const holdUntil = Math.max(impactEnd, this.busyUntil || now);
      const center = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 };
      const dx = to.x - from.x, dz = to.z - from.z;
      const length = Math.hypot(dx, dz) || 1;
      const sideA = { x: -dz / length, z: dx / length };
      const sideB = { x: -sideA.x, z: -sideA.z };
      const currentX = this.camera.position.x - center.x, currentZ = this.camera.position.z - center.z;
      const side = sideA.x * currentX + sideA.z * currentZ >= sideB.x * currentX + sideB.z * currentZ ? sideA : sideB;
      const yaw = Math.atan2(side.x, side.z), elevation = 42 * Math.PI / 180, radius = 8.3;
      const horizontal = radius * Math.cos(elevation);
      this.captureCamera = {
        start: now,
        holdUntil,
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        toPosition: new this.THREE.Vector3(center.x + horizontal * Math.sin(yaw), 0.65 + radius * Math.sin(elevation), center.z + horizontal * Math.cos(yaw)),
        toTarget: new this.THREE.Vector3(center.x, 0.65, center.z),
      };
    }

    tickCaptureCamera(t) {
      const c = this.captureCamera;
      if (!c) return;
      const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
      if (t <= c.holdUntil) {
        const u = smooth((t - c.start) / 0.45);
        this.camera.position.lerpVectors(c.fromPosition, c.toPosition, u);
        this.cameraTarget.lerpVectors(c.fromTarget, c.toTarget, u);
      } else {
        if (!c.restoreStart) {
          c.restoreStart = t;
          c.restorePosition = this.camera.position.clone();
          c.restoreTarget = this.cameraTarget.clone();
          const yaw = this.viewYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
          const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
          const horizontal = radius * Math.cos(elevation);
          c.endPosition = new this.THREE.Vector3(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
          c.endTarget = new this.THREE.Vector3(0.45 * sn, 0.3, 0.45 * cs);
        }
        const u = smooth((t - c.restoreStart) / 0.55);
        this.camera.position.lerpVectors(c.restorePosition, c.endPosition, u);
        this.cameraTarget.lerpVectors(c.restoreTarget, c.endTarget, u);
        if (u >= 1) this.captureCamera = null;
      }
      this.camera.lookAt(this.cameraTarget);
    }

    // Cadre l'attaque à distance, puis suit l'attaquant depuis l'arrière jusqu'à sa cible.
    startAttackCamera(actor, from, to, now) {
      const dx = to.x - from.x, dz = to.z - from.z;
      const length = Math.hypot(dx, dz) || 1;
      const dir = { x: dx / length, z: dz / length };
      const radius = Math.max(8.5, Math.min(12, length + 4));
      const side = { x: -dir.z, z: dir.x };
      const center = new this.THREE.Vector3((from.x + to.x) * 0.5, 0.85, (from.z + to.z) * 0.5);
      const widePosition = new this.THREE.Vector3(from.x - dir.x * radius + side.x * 1.5, 0.45 + radius * 0.64, from.z - dir.z * radius + side.z * 1.5);
      const wideTarget = center;
      this.captureCamera = null;
      this.attackCamera = {
        start: now,
        holdUntil: Math.max(now + 1.2, this.busyUntil || now),
        actor, dir, side, radius,
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        widePosition, wideTarget,
      };
    }

    tickAttackCamera(t) {
      const c = this.attackCamera;
      if (!c) return;
      const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
      if (t <= c.holdUntil) {
        const approach = smooth((t - c.start) / 0.5);
        if (approach < 1) {
          this.camera.position.lerpVectors(c.fromPosition, c.widePosition, approach);
          this.cameraTarget.lerpVectors(c.fromTarget, c.wideTarget, approach);
        } else {
          const p = c.actor.holder.position;
          const followPosition = new this.THREE.Vector3(
            p.x - c.dir.x * 7.5 + c.side.x * 1.2,
            5.4,
            p.z - c.dir.z * 7.5 + c.side.z * 1.2,
          );
          const followTarget = new this.THREE.Vector3(p.x + c.dir.x * 2.4, 0.85, p.z + c.dir.z * 2.4);
          this.camera.position.lerp(followPosition, 0.16);
          this.cameraTarget.lerp(followTarget, 0.2);
        }
      } else {
        if (!c.restoreStart) {
          c.restoreStart = t;
          c.restorePosition = this.camera.position.clone();
          c.restoreTarget = this.cameraTarget.clone();
          const yaw = this.viewYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
          const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
          const horizontal = radius * Math.cos(elevation);
          c.endPosition = new this.THREE.Vector3(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
          c.endTarget = new this.THREE.Vector3(0.45 * sn, 0.3, 0.45 * cs);
        }
        const u = smooth((t - c.restoreStart) / 0.55);
        this.camera.position.lerpVectors(c.restorePosition, c.endPosition, u);
        this.cameraTarget.lerpVectors(c.restoreTarget, c.endTarget, u);
        if (u >= 1) this.attackCamera = null;
      }
      this.camera.lookAt(this.cameraTarget);
    }

    tickMateCamera(t) {
      const u = this.mateUltimate;
      if (!u || !u.camera || u.camera.released || t < u.start) return;
      const c = u.camera, elapsed = t - u.start;
      const smooth = (value) => { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); };
      if (elapsed < 0.4) {
        this.camera.position.copy(c.fromPosition);
        this.cameraTarget.lerpVectors(c.fromTarget, c.actionTarget, smooth(elapsed / 0.4));
      } else if (elapsed < 1.8) {
        this.camera.position.copy(c.fromPosition);
        this.cameraTarget.copy(c.actionTarget);
      } else {
        const zoom = smooth((elapsed - 1.8) / 1.25);
        this.camera.position.lerpVectors(c.fromPosition, c.widePosition, zoom);
        this.cameraTarget.lerpVectors(c.actionTarget, c.wideTarget, zoom);
      }
      this.camera.lookAt(this.cameraTarget);
    }

    square(color, opacity) {
      const T = this.THREE;
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      return m;
    }

    /* opts : board, selected, targets, marks, last, check, hint, flipped, showMoves, coords, light, dark, animate */
    update(o) {
      const T = this.THREE;
      this.outcome = o.outcome || null;
      this.drawBoard(o.light, o.dark, o.coords, !!o.flipped, o.board);
      this.setCamera(o.flipped);

      this.overlay.clear();
      this.ply = o.ply == null ? null : o.ply;
      if (o.tutorialStars && o.tutorialStars.length) {
        if (!this.tutorialStarGeometry) {
          const shape = new T.Shape(), outer = 0.39, inner = 0.17;
          for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? inner : outer;
            const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
            if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
          }
          shape.closePath();
          this.tutorialStarGeometry = new T.ShapeGeometry(shape);
          this.tutorialStarMaterial = new T.MeshBasicMaterial({ color: 0xffd33f, side: T.DoubleSide, transparent: true, opacity: 0.96, depthWrite: false, toneMapped: false });
        }
        for (const sq of o.tutorialStars) {
          const occupied = !!o.board[sq], p = this.sqToPos(sq), star = new T.Mesh(this.tutorialStarGeometry, this.tutorialStarMaterial);
          star.rotation.x = -Math.PI / 2;
          star.position.set(p.x + (occupied ? 0.2 : 0), 0.065, p.z + (occupied ? 0.2 : 0));
          if (occupied) star.scale.setScalar(0.68);
          star.renderOrder = 5;
          this.overlay.add(star);
        }
      }
      if (this.boardCracks && this.boardCracks.length) {
        this.boardCracks = this.boardCracks.filter((c) => {
          if (this.ply != null && c.ply != null && this.ply >= c.ply) return true;
          this.scene.remove(c.object); this.disposeGroup(c.object); return false;
        });
      }
      // Pion à un pas de la promotion : un anneau doré pulse sous ses pieds
      for (let sq = 0; sq < 64; sq++) {
        const pc = o.board[sq];
        if (!((pc === 'P' && sq >> 3 === 1) || (pc === 'p' && sq >> 3 === 6))) continue;
        const p = this.sqToPos(sq), g = new T.Group();
        const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; g.add(ring);
        const beam = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 1.1, 20, 1, true), new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        beam.position.y = 0.55; g.add(beam);
        g.position.set(p.x, 0.03, p.z); g.userData.pulse = sq; this.overlay.add(g);
      }
      this.setMateFire((o.mateUltimate && o.mateUltimate.piece.toLowerCase() === 'q') || THEME_MATE[root.themeOf(o.mateUltimate ? o.mateUltimate.piece : 'K')] ? [] : o.mateFire || []);
      let capture = null, pushedVictim = null;
      const mark = (sq, color, opacity) => {
        if (sq < 0 || sq == null) return;
        const m = this.square(color, opacity); const p = this.sqToPos(sq);
        m.position.set(p.x, 0.01, p.z); this.overlay.add(m);
      };
      if (o.last) { mark(o.last.from, 0xf1c232, 0.35); mark(o.last.to, 0xf1c232, 0.45); }
      if (o.selected >= 0) mark(o.selected, 0x4fc3f7, 0.55);
      if (o.check >= 0) mark(o.check, 0xff3b30, 0.6);
      if (o.hint) { mark(o.hint.from, 0x7c4dff, 0.5); mark(o.hint.to, 0x7c4dff, 0.5); }
      if (o.marks) for (const sq of o.marks) mark(sq, 0x35a9ff, 0.52);
      if (o.showMoves) for (const t of o.targets) {
        const p = this.sqToPos(t.to);
        const capture = !!o.board[t.to] || t.flag === 'ep';
        const geo = capture ? new T.RingGeometry(0.36, 0.46, 32) : new T.CircleGeometry(0.15, 24);
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x1b2a22, transparent: true, opacity: 0.45, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.02, p.z);
        this.overlay.add(m);
      }

      // Réutilise les personnages déjà sur le plateau ; seul celui qui joue se déplace
      const now = this.now();
      const old = this.chars, next = new Map();
      // une case vide compte (sinon un pion qui avance sans dépasser une autre pièce donnait la même clé)
      const boardKey = o.board.map((p) => p || '.').join('');
      const boardChanged = boardKey !== this.boardKey;
      this.boardKey = boardKey;
      // Un nouveau coup peut commencer pendant la fin de l'animation précédente :
      // on conserve alors son animation en cours et on anime uniquement le nouveau coup.
      if (boardChanged && !o.animate) this.clearTransient();
      // Nouveau coup pendant qu'une caméra automatique filme encore l'action précédente :
      // elle revient tout de suite à la vue normale (elle se recentrera sur la nouvelle action s'il y en a une)
      if (boardChanged && o.animate) {
        const now = this.now();
        for (const cam of [this.captureCamera, this.attackCamera]) if (cam && !cam.restoreStart) cam.holdUntil = Math.min(cam.holdUntil, now);
      }
      const take = (sq, piece) => {
        const c = old.get(sq);
        if (c && (!piece || c.piece === piece)) { old.delete(sq); return c; }
        return null;
      };
      const moveChar = (c, from, to, extra = {}) => {
        if (c.anim) this.endToss(c); // la pièce rejoue avant la fin de sa propre attaque : on termine proprement l'ancienne
        const a = this.sqToPos(from), b = this.sqToPos(to);
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        c.anim = Object.assign({ from: a, to: b, t0: now, dur: 0.35 + dist * 0.09 }, extra);
        c.holder.position.set(a.x, 0, a.z);
      };
      let attackCameraStarted = false;
      if (o.animate && o.last) {
        const m = o.last;
        const white = m.piece === m.piece.toUpperCase();
        let duel = null, toss = null, shot = null, knightAttack = null, escort = null;
        const kind = m.piece.toLowerCase();
        const quietTheme = root.NO_ATTACK_ANIMATION_THEMES && root.NO_ATTACK_ANIMATION_THEMES.has(root.themeOf(m.piece));
        const vSq = m.flag === 'ep' ? m.to + (white ? 8 : -8) : m.to;
        const far = Math.max(Math.abs((m.from & 7) - (vSq & 7)), Math.abs((m.from >> 3) - (vSq >> 3))) > 1;
        if (m.captured && !o.mateUltimate && quietTheme && m.flag !== 'ep') {
          // Royaume des animaux et Échecs en bois : l'attaquant avance et pousse sa cible hors de la case.
          const victim = take(vSq);
          if (victim) {
            if (victim.anim) this.endToss(victim);
            victim.anim = null;
            const from = this.sqToPos(m.from), to = this.sqToPos(vSq), length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
            pushedVictim = { c: victim, base: victim.parts.root.scale.x, from: to, dx: (to.x - from.x) / length, dz: (to.z - from.z) / length };
            capture = { from, to, victim };
          }
        } else if (m.captured && !o.mateUltimate && quietTheme) {
          // Prise en passant : la pièce capturée n'est pas sur la case d'arrivée de l'attaquant.
          const victim = take(vSq);
          if (victim) { if (victim.anim) this.endToss(victim); victim.anim = null; this.pieces.remove(victim.holder); }
        } else if (m.captured && !o.mateUltimate) {
          const v = take(vSq);
          if (v && v.anim) { this.endToss(v); v.anim = null; } // la pièce prise arrête net sa propre attaque en cours (sinon ses effets restaient figés)
          const a = this.sqToPos(m.from), b = this.sqToPos(vSq);
          capture = { from: a, to: b, victim: v };
          const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
          const die = (o) => { if (v) { v.holder.position.set(b.x, 0, b.z); this.dying.push(Object.assign({ c: v, dx: ux, dz: uz, from: a, base: v.parts.root.scale.x }, o)); this.auraOnFall(v, b, o.t0, m.piece); } };
          const theme = root.themeOf(white ? 'K' : 'k'), themeFx = THEME_FX[theme], ocean = !!themeFx;
          if (KIT_ATTACKS[root.themeOf(m.piece)]) {
            // Empire des Baobabs, Âge des Géants : une fiche d'attaque par pièce, de près comme de loin
            const spec = KIT_ATTACKS[root.themeOf(m.piece)][m.piece];
            knightAttack = this.kitAttack(Object.assign({ pal: root.themeOf(m.piece) }, spec), white, a, b, this.sqToPos(m.to), v, now, len, { x: ux, z: uz });
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (root.themeOf(m.piece) === 'sabres') {
            // L'Âge des Sabres : chaque pièce a son attaque, de près comme de loin
            knightAttack = this.sabreAttack(kind, white, a, b, this.sqToPos(m.to), v, now, len, { x: ux, z: uz });
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (ocean && far && m.flag !== 'ep') {
            // Thèmes de créatures : jet (tour, dame) ou salve (cavalier, fou), aux couleurs du thème :
            // eau et encre (océan), liane et épines (plantes), sable et cailloux (animaux), plumes (oiseaux)
            const jet = kind === 'q' || kind === 'r';
            const proj = WAR_PROJ[theme] && WAR_PROJ[theme][kind] && WAR_PROJ[theme][kind][white ? 'w' : 'b'];
            shot = { tech: proj ? 'proj' : jet ? 'water' : 'bubble', proj, white, pal: themeFx[white ? 'w' : 'b'], victim: v, target: b, fire: proj ? 0.55 : 0.7 };
            shot.flight = jet ? 0.45 + len * 0.09 : 0.3 + len * 0.07;
            if (proj) shot.flight = { shell: 0.12 + len * 0.025, laser: 0.55, missiles: 0.35 + len * 0.06, bombs: 0.9, boulder: 0.6 + len * 0.08, firepot: 0.55 + len * 0.08, wave: 0.55, mirror: 0.55, crosslaser: 0.5, magma: 0.6 + len * 0.08 }[proj] || 0.35 + len * 0.07;
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + 0.9;
            die({ t0: now + EXR + shot.impact, hit: true, swept: true, counter: { start: now, end: now + EXR, at: a } });
          } else if (theme === 'modern' && kind === 'k' && m.flag !== 'ep') {
            // Guerriers modernes : le général appelle deux soldats qui entrent sur le plateau, se placent devant lui
            // de chaque côté et mitraillent la cible ; ensuite seulement il prend la case.
            escort = { white, from: a, target: b, dir: { x: ux, z: uz }, wait: 2.1, flying: !!(v && v.parts.fly) }; // engin volant : tir au bazooka
            die({ t0: now + 1.85, hit: true });
          } else if (ocean && kind === 'k' && m.flag !== 'ep') {
            // roi des thèmes de créatures et de guerriers : combat au corps à corps, comme les autres pièces côte à côte
            const gap = Math.min(0.62, len);
            duel = { stop: { x: b.x - ux * gap, z: b.z - uz * gap }, foe: b, len: 2.6, rate: 1.5, brawl: true };
            duel.approach = 0.35 + Math.max(0, len - gap) * 0.09;
            duel.len += X2;
            die({ t0: now + duel.approach + duel.len, from: duel.stop, start: now + duel.approach, ex: true, far: true }); // sans cela, la pièce prise restait affichée
          } else if (m.flag === 'ep') {
            // Prise en passant : le pion file en un éclair à côté de sa cible, dont la tête tombe au sol
            knightAttack = { style: 'enpassant', start: now, from: a, target: b, to: this.sqToPos(m.to), duration: 2.6, victim: v, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'n') {
            const style = white
              ? (Math.random() < 0.5 ? 'tunnel-eat' : 'tunnel-impact')
              : (Math.random() < 0.5 ? 'eagle-release' : 'eagle-slam');
            // tunnel percutant : le chien et son ninja se changent d'abord en tourbillon
            const pre = style === 'tunnel-impact' ? 0.6 : 0;
            const duration = pre + (style === 'tunnel-eat' ? 2.8 : style === 'tunnel-impact' ? 2.45 : style === 'eagle-release' ? 3.65 : 3.85);
            knightAttack = { style, start: now, from: a, target: b, duration, pre, victim: v, hitCount: 0 };
            die({ t0: now + duration, knightAttack });
          } else if (far && kind === 'q') {
            // Dame : une ligne de flammes (blanches et éblouissantes ou noires) court au sol jusqu'à la cible et la consume
            const travel = 0.3 + len * 0.09;
            knightAttack = { style: 'flameline', white, start: now, from: a, target: b, travel, duration: 0.45 + travel + 2.0, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'k') {
            // Roi blanc : Jugement du Hokage (symbole « 火 » dans le ciel, rayon de lumière dorée).
            // Roi noir : Main de l'Empereur (une main d'ombre géante sort du sol et écrase la cible).
            knightAttack = { style: white ? 'judgment' : 'emperorhand', white, start: now, from: a, target: b, duration: white ? 3.6 : 3.4, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'r' && white) {
            // Tour blanche : elle envoie un dragon de feu qui fonce sur sa cible et l'emporte dans les airs, de près comme de loin
            shot = { tech: 'water', fireDragon: true, lift: true, victim: v, target: b, fire: 0.9, flight: 0.45 + len * 0.09 };
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + shot.flight * 1.5;
            die({ t0: now + EXR + shot.impact, hit: true, lift: shot.flight, counter: { start: now, end: now + EXR, at: a } });
          } else if (far && kind === 'b' && white) {
            // Fou blanc : boule d'énergie blanche en main, il court frapper sa cible et la projette au loin
            const run = 0.2 + len * 0.06;
            knightAttack = { style: 'orb', start: now, from: a, target: b, run, duration: 0.5 + run + 1.9, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (far && (kind === 'q' || kind === 'r')) {
            // Technique à distance lancée depuis sa case : boule de feu (dame), dragon d'eau (tour blanche)
            // ou dragon de feu (tour noire, même au contact) qui réduit sa cible en cendres
            const fireDragon = kind === 'r' && !white;
            shot = { tech: kind === 'q' ? 'fire' : 'water', fireDragon, victim: v, target: b, fire: kind === 'q' ? 0.8 : 0.9 };
            shot.flight = kind === 'q' ? 0.25 + len * 0.06 : 0.45 + len * 0.09;
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + 0.9;
            const fireball = kind === 'q';
            die({ t0: now + EXR + shot.impact, hit: true, burn: fireball || fireDragon, burnAt: now + EXR + shot.impact, swept: kind === 'r' && !fireDragon, counter: { start: now, end: now + EXR, at: a } });
          } else if (far && kind === 'b' && !white) {
            // Fou noir : la main chargée d'éclairs, il fonce transpercer sa cible sous un ciel assombri.
            const run = 0.25 + len * 0.055, pierce = 0.7 + run;
            knightAttack = { style: 'chidori', start: now, from: a, target: b, run, pierce, duration: pierce + 2.75, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else {
            // Pièces côte à côte : elles se battent uniquement aux poings et aux pieds
            const gap = Math.min(0.62, len);
            duel = { stop: { x: b.x - ux * gap, z: b.z - uz * gap }, foe: b, len: DUEL, rate: 1.5, brawl: true };
            if (kind === 'k') duel.len = 2.6; // enchaînement de coups de poing et de pied
            duel.approach = 0.35 + Math.max(0, len - gap) * 0.09;
            duel.len += X2; // assaut + riposte, puis le coup final
            const o = { t0: now + duel.approach + duel.len, from: duel.stop, start: now + duel.approach, ex: true, far: true };
            die(o);
          }
        }
        let mover = take(m.from, m.piece);
        const landed = o.board[m.to];
        if (mover && landed !== m.piece) { this.pieces.remove(mover.holder); mover = null; } // promotion
        if (!mover && landed) mover = this.makeChar(landed);
        if (mover) {
          const knightLeap = kind === 'n' && !duel && !toss && !shot && !knightAttack;
          moveChar(mover, m.from, m.to, {
            leap: knightLeap,
            high: knightLeap ? (white ? 1.05 : 2.25) : undefined,
            knightFlight: knightLeap && !white,
            duel, toss, shot, knightAttack,
          });
          // Saga des Auras, long déplacement sans prise (3 cases ou plus) : la tour et la dame volent, le fou file en laissant du feu sur les cases
          const reach = Math.max(Math.abs((m.from & 7) - (m.to & 7)), Math.abs((m.from >> 3) - (m.to >> 3)));
          if (reach >= 3 && !m.captured && m.flag !== 'castle' && 'rqb'.includes(kind) && root.themeOf(m.piece) === 'auras') {
            mover.anim.flight = kind === 'b' ? 'fire' : 'fly'; mover.anim.reach = reach;
            if (kind === 'b') mover.anim.dur *= 0.55;
          }
          if (knightAttack) mover.anim.dur = knightAttack.duration;
          else if (knightLeap) mover.anim.dur = (white ? 0.38 : 0.68) + Math.hypot(mover.anim.to.x - mover.anim.from.x, mover.anim.to.z - mover.anim.from.z) * (white ? 0.045 : 0.07);
          if (duel) mover.anim.dur = duel.approach;
          if (toss || shot) { mover.anim.t0 = now + EXR; mover.anim.pre = now; } // la cible tire d'abord
          if (escort) { mover.anim.t0 = now + escort.wait; mover.anim.wait = true; this.addEscort(escort, now); }
          if (pushedVictim) {
            const duration = 0.42, start = now + Math.max(0, mover.anim.dur - duration);
            this.dying.push(Object.assign({ t0: start, push: true }, pushedVictim));
            this.busyUntil = Math.max(this.busyUntil || now, start + duration);
          }
          const followAttack = (shot || toss || knightAttack) && Math.hypot(mover.anim.to.x - mover.anim.from.x, mover.anim.to.z - mover.anim.from.z) > 2;
          this.busyUntil = now + mover.anim.dur + (escort ? escort.wait + 0.2 : 0) + (duel ? duel.len + 0.35 : 0) + (toss ? EXR + toss.runStart : 0) + (shot ? EXR + shot.runStart : 0) + (knightAttack ? 0.35 : 0);
          // laisse la victime embrochée finir d'être éjectée avant tout autre coup
          if (toss) this.busyUntil = Math.max(this.busyUntil, now + EXR + toss.impact + 0.2 + 2.4);
          const burning = this.dying.find((x) => x.c === (capture && capture.victim) && x.burn);
          if (burning) this.busyUntil = Math.max(this.busyUntil, burning.t0 + BURN_TIME);
          next.set(m.to, mover);
          if (kind === 'p' && landed !== m.piece && !o.mateUltimate) {
            const at = Math.max(now + mover.anim.dur, (this.busyUntil || now) - 0.35);
            this.addPromotionFx(mover, this.sqToPos(m.to), at);
            this.busyUntil = Math.max(this.busyUntil, at + 2.0);
          }
          if (followAttack) {
            this.startAttackCamera(mover, mover.anim.from, mover.anim.to, now);
            attackCameraStarted = true;
          }
        }
        if (m.flag === 'castle') {
          const kingside = m.to > m.from;
          const rf = kingside ? m.from + 3 : m.from - 4, rt = kingside ? m.from + 1 : m.from - 1;
          const rook = take(rf);
          // Roque : le roi et la tour échangent leurs places d'un bond croisé, puis un dôme protecteur se lève
          // Guerriers modernes : le tank roule au sol et c'est le roi qui saute par-dessus
          const kingJumps = root.themeOf(mover ? mover.piece : 'K') === 'modern';
          if (mover) { mover.anim.leap = true; mover.anim.dur = 0.7; if (kingJumps) mover.anim.high = 1.6; }
          if (rook) { moveChar(rook, rf, rt, { leap: !kingJumps }); rook.anim.dur = 0.7; if (!kingJumps) rook.anim.high = 1.5; next.set(rt, rook); }
          const k = this.sqToPos(m.to), r = this.sqToPos(rt);
          this.addCastleDome({ x: (k.x + r.x) / 2, z: (k.z + r.z) / 2 }, white, now + 0.7);
          this.busyUntil = Math.max(this.busyUntil || now, now + 1.1);
        }
      }
      for (let sq = 0; sq < 64; sq++) {
        const piece = o.board[sq];
        if (!piece || next.has(sq)) continue;
        const c = take(sq, piece) || this.makeChar(piece);
        const p = this.sqToPos(sq);
        // un personnage encore en route (duel en cours) termine son animation
        const arriving = c.anim && Math.abs(c.anim.to.x - p.x) < 0.01 && Math.abs(c.anim.to.z - p.z) < 0.01;
        if (!arriving) { this.endToss(c); c.anim = null; c.holder.position.set(p.x, 0, p.z); }
        next.set(sq, c);
      }
      for (const c of old.values()) this.pieces.remove(c.holder);
      const captureFoes = this.captureFoes(o.board);
      const watch = this.nearestFoes(o.board);
      for (const [sq, c] of next) {
        c.selected = sq === o.selected; c.inCheck = sq === o.check;
        const foe = captureFoes.get(sq);
        c.foe = foe == null ? null : this.sqToPos(foe);
        const seen = watch.get(sq);
        c.watch = seen == null ? null : this.sqToPos(seen);
      }
      this.chars = next;
      if (capture && capture.victim && !attackCameraStarted && !(root.NO_ATTACK_ANIMATION_THEMES && root.NO_ATTACK_ANIMATION_THEMES.has(root.themeOf(o.last && o.last.piece)))) this.startCaptureCamera(capture.from, capture.to, capture.victim, now);
      // Pièce liée au moment de prendre : sa technique est plus puissante (onde d'énergie, éclat, tremblement renforcé)
      if (capture && capture.victim && o.last && (this.ropes || []).some(([a, b]) => a === o.last.from || b === o.last.from)) {
        const d = this.dying.find((x) => x.c === capture.victim);
        const at = d ? (d.knightAttack ? now + Math.max(0.6, d.knightAttack.duration * 0.55) : d.t0) : now + 0.8;
        this.addPowerBurst(capture.to, o.last.piece === o.last.piece.toUpperCase(), at);
        this.powerUntil = Math.max(this.powerUntil || 0, (this.busyUntil || now) + 0.2);
        // aura électrique sur l'attaquant, l'échiquier tremble à l'impact et la case se fissure pour de bon
        const attacker = next.get(o.last.to);
        if (attacker) this.addElectricAura(attacker, now, at + 0.7);
        this.addBoardQuake(at);
        this.addPermanentCracks(o.last.to, at, o.ply);
      }
      if (o.mateUltimate && o.animate && !(root.NO_ATTACK_ANIMATION_THEMES && root.NO_ATTACK_ANIMATION_THEMES.has(root.themeOf(o.mateUltimate.piece))) && o.mateUltimate.id !== this.mateUltimateKey) {
        const actor = next.get(o.mateUltimate.attackerTo);
        this.mateUltimateKey = o.mateUltimate.id;
        this.mateUltimate = actor ? {
          ...o.mateUltimate, actor, king: next.get(o.mateUltimate.to),
          start: now + (actor.anim ? actor.anim.dur : 0.35) + 0.15,
          fromPos: { ...this.sqToPos(o.mateUltimate.attackerTo) }, target: this.sqToPos(o.mateUltimate.to),
          duration: o.mateUltimate.piece === 'k' ? 9.6 : o.mateUltimate.piece === 'K' ? 7.8 : o.mateUltimate.piece.toLowerCase() === 'q' ? 6.8 : o.mateUltimate.piece.toLowerCase() === 'p' ? 3.6 : o.mateUltimate.piece === 'N' ? 4.8 : o.mateUltimate.piece === 'n' ? 5.4 : o.mateUltimate.piece === 'b' ? 5.8 : o.mateUltimate.piece === 'R' ? 6.0 : o.mateUltimate.piece === 'r' ? 7.0 : 3.4,
        } : null;
        if (this.mateUltimate && THEME_MATE[root.themeOf(o.mateUltimate.piece)]) {
          const white = o.mateUltimate.piece === o.mateUltimate.piece.toUpperCase();
          const mateTheme = root.themeOf(o.mateUltimate.piece);
          this.mateUltimate.themed = mateTheme === 'auras' ? AURA_MATE[o.mateUltimate.piece] : mateTheme === 'sabres' ? SABRE_MATE[o.mateUltimate.piece] : (KIT_PIECE_MATE[mateTheme] || {})[o.mateUltimate.piece] || THEME_MATE[mateTheme][white ? 'w' : 'b'];
          this.mateUltimate.duration = 4.8;
          if (KIT_MATE_TIME[this.mateUltimate.themed]) [this.mateUltimate.hitAt, this.mateUltimate.duration] = KIT_MATE_TIME[this.mateUltimate.themed];
          if (mateTheme === 'sabres') [this.mateUltimate.hitAt, this.mateUltimate.duration] = SABRE_MATE_TIME[this.mateUltimate.themed];
        }
        if (this.mateUltimate) {
          this.makeMateUltimateFx(this.mateUltimate);
          this.busyUntil = Math.max(this.busyUntil || now, this.mateUltimate.start + this.mateUltimate.duration);
        }
      }
      if (!this.outcome && this.mateUltimate) this.resetMateUltimate();
      this.setCheckChains(o.board, o.check);
      this.updateVaults(o.board, o.animate);
      if (!this.outcome) for (const c of this.chars.values()) { c.endPose = null; c.endPoseAt = null; c.drawTo = null; }
      if (this.outcome === '1/2-1/2') this.planDrawFormation(now);
      this.ropes = this.findRopes(o.board);
      this.ropesPrev = this.ropes;
      this.setArrows(o.arrows || []);
    }

    // Interrompt proprement toute animation en cours (saut dans une partie rejouée, coup pendant un duel)
    // Saute toutes les animations en cours : chaque pièce se pose sur sa case au prochain update
    skipAnimations() {
      this.clearTransient();
      if (this.mateUltimate) this.resetMateUltimate();
      this.boardKey = null;
    }

    clearTransient() {
      if (this.effects) { this.effects.forEach((fx) => fx.end()); this.effects = []; }
      for (const c of this.chars.values()) {
        const a = c.anim;
        this.endToss(c);
        if (a && a.knightAttack) this.endShot(a.knightAttack);
        if (a && a.toss && a.toss.proj) {
          this.scene.remove(a.toss.proj);
          a.toss.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          a.toss.proj = null;
        }
        c.anim = null;
        c.holder.visible = true;
        c.parts.root.visible = true;
        if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
        if (c.shadow) { c.shadow.visible = true; c.shadow.scale.setScalar(1); }
      }
      for (const d of this.dying) {
        this.pieces.remove(d.c.holder);
        this.endBurn(d);
        this.endCounter(d);
        if (d.knightAttack) this.endShot(d.knightAttack);
        if (d.spikes && d.spikes.proj) {
          this.scene.remove(d.spikes.proj);
          d.spikes.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          d.spikes.proj = null;
        }
      }
      this.dying = [];
      (this.auraPuffs || []).forEach((p) => { this.scene.remove(p.m); p.m.material.dispose(); });
      this.auraPuffs = [];
      this.auraEvents = [];
      for (const scar of this.captureScars) {
        this.scene.remove(scar.object);
        scar.object.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      this.captureScars = [];
      // la caméra automatique s'arrêtait là où elle était (zoomée sur une ancienne action) : on revient à la vue normale
      const autoCam = this.captureCamera || this.attackCamera;
      this.captureCamera = null;
      this.attackCamera = null;
      if (autoCam) this.setCamera(this.flipped, true);
      if (this.spark) this.spark.visible = false;
      this.shakeUntil = 0;
      this.busyUntil = 0;
    }

    // Flèches de replay : { from, to, color } posées à plat au-dessus du plateau
    setArrows(list) {
      const T = this.THREE;
      const key = list.map((a) => `${a.from}-${a.to}-${a.color}`).join(',');
      if (key === this.arrowKey) return;
      this.arrowKey = key;
      if (!this.arrowGroup) { this.arrowGroup = new T.Group(); this.scene.add(this.arrowGroup); }
      for (const child of [...this.arrowGroup.children]) {
        this.arrowGroup.remove(child);
        child.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
      }
      for (const a of list) {
        const p = this.sqToPos(a.from), q = this.sqToPos(a.to);
        const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) - 0.12;
        if (len <= 0.5) continue;
        const hex = { red: 0xe53935, blue: 0x2f7bff, violet: 0xa855f7 }[a.color] || 0x2ecc40;
        const mat = new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.88, depthTest: false });
        const shaftLen = len - 0.42;
        const shaft = new T.Mesh(new T.BoxGeometry(shaftLen, 0.05, 0.13), mat);
        shaft.position.set(shaftLen / 2, 0, 0);
        const head = new T.Mesh(new T.ConeGeometry(0.24, 0.42, 16), mat);
        head.rotation.z = -Math.PI / 2;
        head.position.set(len - 0.21, 0, 0);
        const arrow = new T.Group();
        arrow.add(shaft, head);
        arrow.position.set(p.x, 0.45, p.z);
        arrow.rotation.y = -Math.atan2(dz, dx);
        arrow.renderOrder = 999;
        shaft.renderOrder = head.renderOrder = 999;
        this.arrowGroup.add(arrow);
      }
    }

    makeMateUltimateFx(u) {
      const T = this.THREE, kind = u.piece.toLowerCase();
      const actor = u.actor, king = u.king;
      this.captureCamera = null;
      this.attackCamera = null;
      const yaw = this.viewYaw(), radius = 18.5, elevation = 48 * Math.PI / 180;
      const horizontal = radius * Math.cos(elevation);
      const actionPos = this.sqToPos(u.attackerTo);
      const actionCenter = { x: (actionPos.x + u.target.x) * 0.5, z: (actionPos.z + u.target.z) * 0.5 };
      u.camera = {
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        actionTarget: new T.Vector3(actionCenter.x, 2.6, actionCenter.z),
        widePosition: new T.Vector3(horizontal * Math.sin(yaw), 0.3 + radius * Math.sin(elevation), horizontal * Math.cos(yaw)),
        wideTarget: new T.Vector3(
          actionCenter.x * 0.18,
          0.55,
          actionCenter.z * 0.18,
        ),
      };
      u.actorRoot = actor.parts.root;
      u.kingRoot = king && king.parts.root;
      u.actorBase = { position: u.actorRoot.position.clone(), rotation: u.actorRoot.rotation.clone(), scale: u.actorRoot.scale.clone() };
      u.actorHolderBase = actor.holder.position.clone();
      u.kingBase = u.kingRoot && { position: u.kingRoot.position.clone(), rotation: u.kingRoot.rotation.clone(), scale: u.kingRoot.scale.clone() };
      u.kingHolderBase = king && king.holder.position.clone();
      u.kingHolderVisible = king && king.holder.visible;
      if (u.fromPos) actor.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
      u.fx = new T.Group(); this.scene.add(u.fx);
      if (u.themed) { this.makeThemeMate(u); return; }
      if (kind === 'n' && u.piece === u.piece.toUpperCase()) {
        // Le ninja se fond dans son chien blanc, qui devient une bête à deux têtes.
        u.hiddenParts = u.actorRoot.children.filter((o) => o.isMesh && o.position.z >= 0.28 && o.visible);
        u.extraHeads = [];
        const fur = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
        const dark = new T.MeshStandardMaterial({ color: 0x25232a, roughness: 0.6 });
        const eyes = new T.MeshBasicMaterial({ color: 0xff2a1a });
        const fang = new T.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.4 });
        for (const side of [-1, 1]) {
          const neck = new T.Group(); neck.position.set(side * 0.17, 0.36, 0.2); neck.rotation.y = side * 0.22; u.actorRoot.add(neck);
          const ball = (material, pos, scale) => { const m = new T.Mesh(new T.SphereGeometry(1, 16, 12), material); m.position.set(...pos); m.scale.set(...scale); neck.add(m); return m; };
          ball(fur, [0, 0.03, 0.08], [0.13, 0.13, 0.16]);
          ball(fur, [0, 0.07, 0.2], [0.19, 0.19, 0.19]);
          ball(fur, [0, 0.0, 0.37], [0.12, 0.09, 0.14]);
          ball(dark, [0, 0.02, 0.5], [0.032, 0.028, 0.024]);
          const jaw = new T.Group(); jaw.position.set(0, -0.06, 0.3); neck.add(jaw);
          const jawMesh = new T.Mesh(new T.SphereGeometry(1, 12, 8), fur); jawMesh.position.set(0, -0.02, 0.06); jawMesh.scale.set(0.1, 0.035, 0.12); jaw.add(jawMesh);
          for (const s of [-1, 1]) {
            ball(eyes, [s * 0.085, 0.13, 0.34], [0.026, 0.026, 0.02]);
            const ear = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 6), fur); ear.position.set(s * 0.11, 0.27, 0.16); ear.rotation.z = s * -0.35; neck.add(ear);
            const top = new T.Mesh(new T.ConeGeometry(0.018, 0.08, 5), fang); top.position.set(s * 0.05, -0.08, 0.42); top.rotation.x = Math.PI; neck.add(top);
            const low = new T.Mesh(new T.ConeGeometry(0.016, 0.07, 5), fang); low.position.set(s * 0.045, 0.02, 0.14); jaw.add(low);
          }
          neck.userData = { side, jaw }; neck.scale.setScalar(0.01); u.extraHeads.push(neck);
        }
        u.fusionRing = new T.Mesh(new T.TorusGeometry(0.55, 0.05, 8, 40), new T.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
        u.fusionRing.rotation.x = Math.PI / 2; u.fx.add(u.fusionRing);
        u.dust = [];
        for (let i = 0; i < 3; i++) {
          const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: 0xcdbfa6, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
          ring.rotation.x = -Math.PI / 2; ring.position.set(u.target.x, 0.04, u.target.z); u.fx.add(ring); u.dust.push(ring);
        }
        // Lambeaux du roi arrachés par les deux gueules.
        u.shreds = [];
        const kingWhite = king && king.piece === king.piece.toUpperCase();
        for (let i = 0; i < 26; i++) {
          const color = i % 4 === 0 ? 0xc9a227 : i % 3 === 0 ? 0x8b1e2a : kingWhite ? 0xf1ece0 : 0x26232b;
          const shred = new T.Mesh(new T.BoxGeometry(0.07 + Math.random() * 0.06, 0.03, 0.05 + Math.random() * 0.05), new T.MeshStandardMaterial({ color, roughness: 0.8, transparent: true, opacity: 1 }));
          shred.visible = false; shred.userData.seed = i; u.fx.add(shred); u.shreds.push(shred);
        }
        u.fireLight = new T.PointLight(0xdcecff, 0, 4, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'R') {
        // Tour blanche : tornade de flammes blanches qui avance jusqu'au roi et l'emporte en le brûlant
        const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
        u.tornado = new T.Group(); u.tornado.visible = false; u.fx.add(u.tornado);
        u.tornadoFlames = [];
        for (let layer = 0; layer < 9; layer++) {
          const ring = new T.Group(); ring.position.y = 0.12 + layer * 0.26; ring.userData.layer = layer; u.tornado.add(ring);
          const r = 0.16 + layer * 0.075;
          for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4 + layer * 0.45;
            const fl = new T.Mesh(new T.ConeGeometry(0.07 + layer * 0.012, 0.34 + layer * 0.03, 6, 1, true), glow(k % 3 === 0 ? 0xffffff : k % 3 === 1 ? 0xe6f6ff : 0xc4e4ff, 0.8));
            fl.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); fl.rotation.set(0, -a, 0.5); fl.userData.phase = layer * 1.1 + k;
            ring.add(fl); u.tornadoFlames.push(fl);
          }
        }
        u.tornadoCore = new T.Mesh(new T.CylinderGeometry(0.8, 0.14, 2.4, 20, 1, true), glow(0xf4fbff, 0.28));
        u.tornadoCore.position.y = 1.2; u.tornado.add(u.tornadoCore);
        // traînée de flammes blanches sur le chemin
        u.trail = [];
        const dx = u.target.x - u.fromPos.x, dz = u.target.z - u.fromPos.z, n = Math.max(5, Math.round(Math.hypot(dx, dz) * 4));
        for (let i = 1; i <= n; i++) {
          const g = new T.Group(), f = i / n;
          g.position.set(u.fromPos.x + dx * f, 0.02, u.fromPos.z + dz * f);
          for (let k = 0; k < 3; k++) {
            const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.24 + k * 0.08, 6, 1, true), glow(k === 1 ? 0xffffff : 0xd8eeff, 0.85));
            fl.position.set((k - 1) * 0.08, 0.12 + k * 0.03, (i + k) % 2 ? 0.05 : -0.05); fl.userData.phase = i * 1.3 + k; g.add(fl);
          }
          const scorch = new T.Mesh(new T.CircleGeometry(0.16, 16), new T.MeshBasicMaterial({ color: 0x3a3a40, transparent: true, opacity: 0.5, depthWrite: false }));
          scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.012; g.add(scorch);
          g.visible = false; g.userData.f = f; u.fx.add(g); u.trail.push(g);
        }
        u.ashes = [];
        for (let i = 0; i < 26; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.03 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0xd9d6d0 : 0x8f8b86, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.fireLight = new T.PointLight(0xeef7ff, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'r') {
        // Tour noire : golem de feu noir, double coup de poings, puis boule de feu noire tombée du ciel
        // feu noir : flammes opaques très sombres, avec quelques braises rouge sombre qui luisent
        const dark = (k) => k % 4 === 3
          ? new T.MeshBasicMaterial({ color: 0x9a1430, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })
          : new T.MeshBasicMaterial({ color: k % 2 ? 0x050307 : 0x10060e, side: T.DoubleSide });
        u.golemFlames = new T.Group(); u.golemFlames.visible = false; u.fx.add(u.golemFlames);
        for (let i = 0; i < 16; i++) {
          const a = i * 2.399, h = 0.3 + (i % 4) * 0.12;
          const fl = new T.Mesh(new T.ConeGeometry(0.09 + (i % 3) * 0.03, h, 7, 1, true), dark(i));
          fl.position.set(Math.cos(a) * 0.32, 0.2 + (i % 6) * 0.26, Math.sin(a) * 0.32); fl.userData = { phase: i * 1.3, y: fl.position.y };
          u.golemFlames.add(fl);
        }
        u.ball = new T.Group(); u.ball.visible = false; u.fx.add(u.ball);
        u.ball.add(new T.Mesh(new T.SphereGeometry(0.55, 20, 16), new T.MeshBasicMaterial({ color: 0x07040a })));
        u.ball.add(new T.Mesh(new T.SphereGeometry(0.66, 20, 16), new T.MeshBasicMaterial({ color: 0x6a1a3a, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })));
        u.ballSpikes = [];
        for (let i = 0; i < 18; i++) {
          const th = i * 2.399, ph = Math.acos(1 - 2 * (i + 0.5) / 18);
          const dir = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
          const f = new T.Mesh(new T.ConeGeometry(0.14, 0.5, 6, 1, true), dark(i));
          f.position.copy(dir).multiplyScalar(0.6); f.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
          u.ball.add(f); u.ballSpikes.push(f);
        }
        // Le trou laissé par l'impact, les fissures du plateau et les flammes noires qui y brûlent
        u.crater = new T.Group(); u.crater.position.set(u.target.x, 0, u.target.z); u.crater.visible = false; u.fx.add(u.crater);
        const hole = new T.Mesh(new T.CircleGeometry(0.62, 28), new T.MeshBasicMaterial({ color: 0x020102 }));
        hole.rotation.x = -Math.PI / 2; hole.position.y = 0.035; u.crater.add(hole);
        const rim = new T.Mesh(new T.RingGeometry(0.6, 0.86, 28), new T.MeshBasicMaterial({ color: 0x2a1d16, transparent: true, opacity: 0.9, depthWrite: false }));
        rim.rotation.x = -Math.PI / 2; rim.position.y = 0.033; u.crater.add(rim);
        u.cracks = [];
        for (let c = 0; c < 11; c++) {
          let a = c * Math.PI * 2 / 11 + Math.random() * 0.3, x = Math.cos(a) * 0.7, z = Math.sin(a) * 0.7;
          const len = 1.6 + Math.random() * 1.9, steps = 6;
          for (let s = 0; s < steps; s++) {
            a += (Math.random() - 0.5) * 0.7;
            const l = len / steps, nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l;
            // les fissures s'arrêtent au bord du plateau
            if (Math.abs(u.target.x + nx) > 3.95 || Math.abs(u.target.z + nz) > 3.95) break;
            const seg = new T.Mesh(new T.BoxGeometry(l + 0.02, 0.012, 0.05 - s * 0.006), new T.MeshBasicMaterial({ color: s % 2 ? 0x0a0608 : 0x160a12 }));
            seg.position.set((x + nx) / 2, 0.034, (z + nz) / 2); seg.rotation.y = -Math.atan2(nz - z, nx - x);
            seg.userData.order = s; seg.visible = false; u.crater.add(seg); u.cracks.push(seg);
            x = nx; z = nz;
          }
        }
        u.craterFlames = [];
        for (let i = 0; i < 10; i++) {
          const a = i * Math.PI * 2 / 10, h = 0.5 + (i % 3) * 0.25;
          const fl = new T.Mesh(new T.ConeGeometry(0.12, h, 7, 1, true), dark(i));
          fl.position.set(Math.cos(a) * 0.45, h / 2, Math.sin(a) * 0.45); fl.userData = { phase: i * 1.7 };
          u.crater.add(fl); u.craterFlames.push(fl);
        }
        u.shock = new T.Mesh(new T.RingGeometry(0.5, 0.75, 40), new T.MeshBasicMaterial({ color: 0x3a1a2a, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
        u.shock.rotation.x = -Math.PI / 2; u.shock.position.set(u.target.x, 0.06, u.target.z); u.fx.add(u.shock);
        u.smoke = [];
        for (let i = 0; i < 12; i++) {
          const puff = new T.Mesh(new T.SphereGeometry(0.22 + (i % 3) * 0.08, 10, 8), new T.MeshBasicMaterial({ color: 0x1a1418, transparent: true, opacity: 0, depthWrite: false }));
          u.fx.add(puff); u.smoke.push(puff);
        }
        u.fireLight = new T.PointLight(0x9a2a4a, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'b') {
        // Fou noir : des nuages d'orage noirs, d'où descend en spirale un dragon de foudre violette.
        const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
        const ink = (color) => new T.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false });
        u.clouds = new T.Group(); u.clouds.position.set(u.target.x, 4.9, u.target.z); u.fx.add(u.clouds);
        for (let i = 0; i < 14; i++) {
          const puff = new T.Mesh(new T.SphereGeometry(0.32 + (i % 4) * 0.12, 14, 10), new T.MeshBasicMaterial({ color: i % 3 ? 0x17121f : 0x2a1d3a, transparent: true, opacity: 0, depthWrite: false }));
          const a = i * 2.399, r = 0.2 + (i % 5) * 0.28;
          puff.position.set(Math.cos(a) * r, (i % 3) * 0.2, Math.sin(a) * r); puff.scale.y = 0.45; u.clouds.add(puff);
        }
        u.dragon = [];
        const n = 28;
        for (let i = 0; i < n; i++) {
          const seg = new T.Group(), r = 0.24 - (i / n) * 0.16;
          seg.add(new T.Mesh(new T.SphereGeometry(r * 0.7, 10, 8), ink(0x0d0614)));
          seg.add(new T.Mesh(new T.SphereGeometry(r, 12, 10), glow(i % 2 ? 0x9b4dff : 0xc79bff, 0.6)));
          if (i % 3 === 1) { const fin = new T.Mesh(new T.ConeGeometry(r * 0.35, r * 1.5, 5), glow(0xe2c8ff, 0.8)); fin.position.y = r * 0.95; seg.add(fin); }
          seg.visible = false; u.fx.add(seg); u.dragon.push(seg);
        }
        // Tête : gueule allongée, cornes et yeux blancs
        const head = new T.Group(), skull = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), ink(0x10071a));
        skull.scale.set(1, 0.8, 1.6); head.add(skull);
        const aura = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), glow(0xa45cff, 0.55)); aura.scale.set(1, 0.85, 1.7); head.add(aura);
        const jaw = new T.Mesh(new T.ConeGeometry(0.13, 0.42, 8), ink(0x10071a)); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.09, 0.26); head.add(jaw);
        for (const side of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.045, 0.36, 6), glow(0xe8d6ff, 0.95)); horn.position.set(side * 0.11, 0.17, -0.14); horn.rotation.set(-1.0, 0, side * -0.3); head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), glow(0xffffff, 1)); eye.position.set(side * 0.1, 0.06, 0.22); head.add(eye);
          const whisker = new T.Mesh(new T.CylinderGeometry(0.008, 0.002, 0.5, 4), glow(0xc79bff, 0.9)); whisker.position.set(side * 0.12, -0.04, 0.42); whisker.rotation.set(Math.PI / 2, 0, side * 0.6); head.add(whisker);
        }
        head.visible = false; u.fx.add(head); u.dragonHead = head;
        // Éclairs qui crépitent le long du corps, et foudres qui tombent sur le roi
        const line = (color, count) => {
          const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(count * 3), 3));
          const l = new T.Line(g, new T.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
          l.frustumCulled = false; u.fx.add(l); return l;
        };
        u.crackles = Array.from({ length: 5 }, (_, i) => line(i % 2 ? 0xffffff : 0xb98aff, 7));
        u.strikes = Array.from({ length: 3 }, (_, i) => line(i === 1 ? 0xf2e6ff : 0x9b4dff, 10));
        u.castBolt = line(0xc79bff, 10);
        u.ashes = [];
        for (let i = 0; i < 22; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0x2a2230 : 0x9b4dff, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.flashLight = new T.PointLight(0xa45cff, 0, 9, 2); this.scene.add(u.flashLight);
        u.sky = {
          background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
          fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
          sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
        };
      } else if (kind === 'n') {
        // L'aigle et son ninja fusionnent en phénix de feu.
        u.phoenix = this.makePhoenix(); u.phoenix.visible = false; actor.holder.add(u.phoenix);
        u.phoenixScale = this.formScaleMatchingActor(actor, u.phoenix) * 1.05;
        u.phoenix.scale.setScalar(0.05);
        const fireMat = new T.MeshBasicMaterial({ color: 0xff6a16, transparent: true, opacity: 0.85, depthWrite: false });
        // Tourbillon de flammes au moment de la fusion.
        u.vortex = [];
        for (let i = 0; i < 12; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.08 + (i % 3) * 0.03, 0.4 + (i % 4) * 0.12, 7), fireMat.clone());
          flame.material.color.setHex(i % 2 ? 0xff3a0b : 0xffb52a); flame.visible = false;
          flame.userData.a = i * Math.PI * 2 / 12; u.fx.add(flame); u.vortex.push(flame);
        }
        // Brasier autour du roi pendant l'étreinte des ailes.
        u.flames = [];
        for (let i = 0; i < 11; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.1 + (i % 3) * 0.035, 0.45 + (i % 4) * 0.12, 7), fireMat.clone());
          const angle = i * Math.PI * 2 / 11;
          flame.position.set(u.target.x + Math.cos(angle) * 0.42, 0.65 + (i % 3) * 0.18, u.target.z + Math.sin(angle) * 0.42);
          flame.rotation.z = Math.cos(angle) * 0.3; flame.visible = false; u.fx.add(flame); u.flames.push(flame);
        }
        u.ashes = [];
        for (let i = 0; i < 22; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0x56524e : 0xff8a32, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.fireLight = new T.PointLight(0xff6a16, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (kind === 'b') {
        // L'éclair du fou appelle trois foudres verticales au-dessus du roi.
        u.bolts = [];
        for (let j = 0; j < 3; j++) {
          const points = [new T.Vector3(u.target.x + (j - 1) * 0.35, 6.4, u.target.z - 0.2)];
          for (let i = 1; i < 8; i++) points.push(new T.Vector3(u.target.x + (j - 1) * 0.35 + (Math.random() - 0.5) * 0.45, 6.4 - i * 0.78, u.target.z + (Math.random() - 0.5) * 0.35));
          points.push(new T.Vector3(u.target.x, 0.55, u.target.z));
          const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: j === 1 ? 0xffffff : 0x7bd8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending }));
          u.fx.add(line); u.bolts.push(line);
        }
        const transform = [new T.Vector3(u.fromPos.x, 5.2, u.fromPos.z), new T.Vector3(u.fromPos.x - 0.22, 4.2, u.fromPos.z), new T.Vector3(u.fromPos.x + 0.16, 3.2, u.fromPos.z + 0.1), new T.Vector3(u.fromPos.x - 0.1, 2.1, u.fromPos.z - 0.08), new T.Vector3(u.fromPos.x, 0.8, u.fromPos.z)];
        u.transformBolt = new T.Line(new T.BufferGeometry().setFromPoints(transform), new T.LineBasicMaterial({ color: 0xc8f5ff, transparent: true, opacity: 0, blending: T.AdditiveBlending }));
        u.fx.add(u.transformBolt);
        u.flashLight = new T.PointLight(0x9be8ff, 0, 8, 2); u.flashLight.position.set(u.target.x, 3.5, u.target.z); this.scene.add(u.flashLight);
        u.actorLight = new T.PointLight(0x89e5ff, 0, 3.5, 2); this.scene.add(u.actorLight);
        u.oldFast = actor.parts.fast; actor.parts.fast = true;
        u.ashes = [];
        for (let i = 0; i < 20; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 2 ? 0x56524e : 0xaaa49a, transparent: true, opacity: 0 }));
          ash.userData.seed = i;
          u.fx.add(ash); u.ashes.push(ash);
        }
      } else if (kind === 'q' && u.piece === 'Q') {
        // La Dame reste sur l’échiquier : elle invoque un ange distinct.
        u.angel = this.makeWhiteAngel(); u.fx.add(u.angel);
        u.angelBaseScale = this.formScaleMatchingActor(actor, u.angel);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.angel.scale.setScalar(0.05);
        const summonPos = this.sqToPos(u.attackerTo);
        u.angel.position.set(summonPos.x, 0, summonPos.z);
        u.hiddenEnemies = [...this.chars.values()].filter((piece) => piece.piece === piece.piece.toLowerCase()).map((piece) => [piece, piece.holder.visible]);
        u.energyShots = [];
        const energyMaterial = new T.MeshBasicMaterial({ color: 0xf3fbff, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false });
        for (const [index, sq] of (u.energySquares || []).entries()) {
          const ball = new T.Mesh(new T.SphereGeometry(0.15, 12, 10), energyMaterial.clone());
          ball.visible = false; u.fx.add(ball);
          u.energyShots.push({ ball, target: this.sqToPos(sq), victim: this.chars.get(sq), index });
        }
        u.whiteFlames = [];
        for (const [index, sq] of (u.whiteFlameSquares || []).entries()) {
          const pos = this.sqToPos(sq), group = new T.Group();
          group.position.set(pos.x, 0.03, pos.z); group.visible = false; u.fx.add(group);
          const height = 1.5;
          const flame = new T.Mesh(
            new T.ConeGeometry(0.27, height, 8, 1, true),
            new T.MeshBasicMaterial({ color: 0xf4fcff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
          );
          flame.position.y = height / 2;
          flame.userData.base = height; flame.userData.phase = index * 1.7;
          group.add(flame);
          const queenPos = this.sqToPos(u.attackerTo);
          const distance = Math.hypot(pos.x - queenPos.x, pos.z - queenPos.z);
          u.whiteFlames.push({ group, flame, start: 0.65 + distance * 0.12 });
        }
        u.whiteBeam = new T.Group();
        u.whiteBeam.position.set(u.target.x, 0, u.target.z); u.whiteBeam.visible = false; u.fx.add(u.whiteBeam);
        const beamOuter = new T.Mesh(new T.ConeGeometry(0.72, 11, 12, 1, true), new T.MeshBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.78, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        beamOuter.position.y = 5.5; u.whiteBeam.add(beamOuter);
        const beamCore = new T.Mesh(new T.CylinderGeometry(0.12, 0.24, 10.8, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false }));
        beamCore.position.y = 5.4; u.whiteBeam.add(beamCore);
        u.crackLines = [];
        const crackMaterial = new T.LineBasicMaterial({ color: 0x18202d, transparent: true, opacity: 0, depthWrite: false });
        const center = this.sqToPos(u.to);
        for (let i = 0; i < 9; i++) {
          const angle = i * Math.PI * 2 / 9 + (Math.random() - 0.5) * 0.22;
          const edgeDistance = Math.min(3.9 / Math.max(0.01, Math.abs(Math.cos(angle))), 3.9 / Math.max(0.01, Math.abs(Math.sin(angle))));
          const points = [new T.Vector3(center.x, 0.055, center.z)];
          for (let j = 1; j <= 7; j++) {
            const distance = edgeDistance * j / 7;
            points.push(new T.Vector3(
              Math.max(-3.9, Math.min(3.9, center.x + Math.cos(angle) * distance + (j < 7 ? (Math.random() - 0.5) * 0.24 : 0))),
              0.055,
              Math.max(-3.9, Math.min(3.9, center.z + Math.sin(angle) * distance + (j < 7 ? (Math.random() - 0.5) * 0.24 : 0))),
            ));
          }
          const crack = new T.Line(new T.BufferGeometry().setFromPoints(points), crackMaterial.clone());
          crack.userData.delay = 3.15 + Math.random() * 0.45; u.fx.add(crack); u.crackLines.push(crack);
        }
        u.energyLight = new T.PointLight(0xd9f2ff, 0, 12, 2); u.energyLight.position.set(u.target.x, 4.5, u.target.z); this.scene.add(u.energyLight);
      } else if (kind === 'q') {
        // La Dame reste sur l’échiquier : la Banshee est invoquée comme entité distincte.
        u.blackBanshee = this.makeBlackBanshee(); u.fx.add(u.blackBanshee);
        u.blackBansheeBaseScale = this.formScaleMatchingActor(actor, u.blackBanshee);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.blackBanshee.scale.setScalar(0.05);
        const summonPos = this.sqToPos(u.attackerTo);
        u.blackBanshee.position.set(summonPos.x, 0, summonPos.z);
        u.sky = {
          background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
          fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
          sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
        };
        u.clouds = new T.Group(); u.clouds.position.set(u.target.x, 5.2, u.target.z); u.fx.add(u.clouds);
        for (let i = 0; i < 20; i++) {
          const puff = new T.Mesh(
            new T.SphereGeometry(0.85 + (i % 4) * 0.16, 12, 9),
            new T.MeshStandardMaterial({ color: i % 3 ? 0x100d18 : 0x211a2a, roughness: 1, transparent: true, opacity: 0, depthWrite: false }),
          );
          const angle = i * 2.399, radius = 0.35 + (i % 5) * 0.42;
          puff.position.set(Math.cos(angle) * radius, (i % 3) * 0.14, Math.sin(angle) * radius);
          puff.scale.set(1.2, 0.42, 0.85); puff.userData.baseY = puff.position.y;
          u.clouds.add(puff);
        }
        const flameVictims = (u.flameSquares || [])
          .map((sq) => this.chars.get(sq))
          .filter((piece) => piece && piece !== king && piece.piece === piece.piece.toUpperCase());
        u.flameVictims = flameVictims.map((character, index) => ({
          character,
          start: 1.35 + 1.8 * index / Math.max(1, flameVictims.length - 1),
          position: character.parts.root.position.clone(),
          scale: character.parts.root.scale.clone(),
          visible: character.holder.visible,
          phase: index * 1.73,
        }));
        u.blackFlames = [];
        const material = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
        for (const sq of u.flameSquares || []) {
          const pos = this.sqToPos(sq), column = sq === u.to, group = new T.Group();
          group.position.set(pos.x, 0, pos.z); u.fx.add(group);
          const heights = column ? [8.5, 12.5] : [0.42 + Math.random() * 0.16, 0.68 + Math.random() * 0.22];
          heights.forEach((height, i) => {
            const flame = new T.Mesh(new T.ConeGeometry(column ? 0.42 - i * 0.1 : 0.16 - i * 0.035, height, 8, 1, true), material(i ? 0x351146 : 0x09050d, column ? 0.92 : 0.9));
            flame.position.set((i ? 0.06 : 0), height / 2, i ? -0.04 : 0); flame.userData.base = height; flame.userData.phase = sq * 0.31 + i * 2.2; group.add(flame);
            if (column && i === 1) {
              const core = new T.Mesh(new T.ConeGeometry(0.13, 9.5, 7, 1, true), material(0x69228a, 0.78));
              core.position.y = 4.75; core.userData.base = 9.5; core.userData.phase = sq; group.add(core);
            }
          });
          u.blackFlames.push(group);
        }
        const queenPos = this.sqToPos(u.attackerTo);
        for (let i = 0; i < 9; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.12 + (i % 3) * 0.04, 0.65 + (i % 2) * 0.24, 7), material(i % 2 ? 0x4a175f : 0x08040c, 0.95));
          const angle = i * Math.PI * 2 / 9;
          flame.position.set(queenPos.x + Math.cos(angle) * 0.48, 0.35, queenPos.z + Math.sin(angle) * 0.48);
          flame.userData.phase = i * 1.7; flame.userData.base = flame.geometry.parameters.height;
          u.fx.add(flame); u.blackFlames.push(flame);
        }
        u.fireLight = new T.PointLight(0x581270, 0, 10, 2); u.fireLight.position.set(queenPos.x, 2, queenPos.z); this.scene.add(u.fireLight);
        u.columnLight = new T.PointLight(0x69228a, 0, 18, 2); u.columnLight.position.set(u.target.x, 5.5, u.target.z); this.scene.add(u.columnLight);
      } else if (kind === 'k' && u.piece === 'k') {
        actor.parts.root.visible = false;
        u.susanoo = this.makeSusanoo(); actor.holder.add(u.susanoo); u.susanoo.scale.setScalar(0.05);
        // Deux météorites invoquées, qui s'écrasent l'une après l'autre de part et d'autre du samouraï.
        u.meteors = [{ x: -2.1, z: -1.5, start: 1.15, impact: 3.45 }, { x: 2.0, z: 1.7, start: 1.75, impact: 4.15 }].map((spec) => {
          const group = new T.Group();
          const rock = new T.Mesh(new T.IcosahedronGeometry(1.18, 1), new T.MeshStandardMaterial({ color: 0x30251f, roughness: 0.96, emissive: 0x641a08, emissiveIntensity: 0.7 }));
          rock.scale.set(1, 0.82, 1.08); group.add(rock);
          const core = new T.Mesh(new T.SphereGeometry(0.74, 16, 12), new T.MeshBasicMaterial({ color: 0xff7625, transparent: true, opacity: 0.68, blending: T.AdditiveBlending, depthWrite: false }));
          group.add(core);
          const flames = [];
          for (let i = 0; i < 12; i++) {
            const flame = new T.Mesh(new T.ConeGeometry(0.16 + (i % 3) * 0.06, 1.05 + (i % 4) * 0.28, 7), new T.MeshBasicMaterial({ color: i % 2 ? 0xff3a0b : 0xffc14b, transparent: true, opacity: 0.84, blending: T.AdditiveBlending, depthWrite: false }));
            const angle = i * Math.PI * 2 / 12;
            flame.position.set(Math.cos(angle) * 0.74, 0.45 + (i % 3) * 0.12, Math.sin(angle) * 0.74);
            flame.rotation.z = Math.cos(angle) * 0.6; group.add(flame); flames.push(flame);
          }
          // Arrivée en biais depuis le ciel, du côté opposé à l'impact.
          const from = { x: spec.x * 2.4, y: 13, z: spec.z * 2.4 };
          group.position.set(from.x, from.y, from.z); u.fx.add(group);
          const shockwave = new T.Mesh(new T.RingGeometry(0.8, 1, 48), new T.MeshBasicMaterial({ color: 0xff8a32, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
          shockwave.rotation.x = -Math.PI / 2; shockwave.position.set(spec.x, 0.025, spec.z); shockwave.scale.setScalar(0.01); u.fx.add(shockwave);
          return { ...spec, from, group, flames, shockwave };
        });
        u.fireLight = new T.PointLight(0xff5b1b, 0, 16, 2); u.fireLight.position.set(0, 2, 0); this.scene.add(u.fireLight);
        u.debris = [];
        for (let i = 0; i < 48; i++) {
          const rubble = new T.Mesh(new T.DodecahedronGeometry(0.22 + Math.random() * 0.24, 0), new T.MeshStandardMaterial({ color: i % 3 ? 0x302820 : 0x5d3d2a, roughness: 1, emissive: 0x431407, emissiveIntensity: 0.42 }));
          rubble.visible = false;
          const fire = new T.Mesh(new T.ConeGeometry(0.12 + Math.random() * 0.08, 0.6 + Math.random() * 0.5, 6), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4a12 : 0xffae32, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
          fire.position.y = 0.34; rubble.add(fire); rubble.userData.fire = fire;
          u.fx.add(rubble); u.debris.push(rubble);
        }
      } else if (kind === 'k') {
        actor.parts.root.visible = false;
        u.fox = this.makeGiantFox();
        u.fox.scale.setScalar(0.05); actor.holder.add(u.fox);
        const sphereMat = new T.MeshStandardMaterial({ color: 0x05040a, emissive: 0x100a1d, roughness: 0.18, metalness: 0.25 });
        u.energy = new T.Mesh(new T.SphereGeometry(1, 32, 24), sphereMat);
        u.energy.position.set(0, 6.4, 0); u.energy.scale.setScalar(0.08); u.fx.add(u.energy);
        u.energyHalo = new T.Mesh(new T.SphereGeometry(1.25, 24, 16), new T.MeshBasicMaterial({ color: 0x261333, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false }));
        u.energy.add(u.energyHalo);
        u.energyRings = [];
        for (let i = 0; i < 3; i++) {
          const ring = new T.Mesh(new T.TorusGeometry(1.25 + i * 0.28, 0.025, 8, 48), new T.MeshBasicMaterial({ color: i % 2 ? 0x4a1d5c : 0x18121f, transparent: true, opacity: 0.72, blending: T.AdditiveBlending }));
          ring.rotation.set(i * 0.7, i * 0.9, i * 0.4); u.energy.add(ring); u.energyRings.push(ring);
        }
        u.shockwave = new T.Mesh(new T.RingGeometry(0.8, 1, 48), new T.MeshBasicMaterial({ color: 0x17101c, transparent: true, opacity: 0.95, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
        u.shockwave.rotation.x = -Math.PI / 2; u.shockwave.position.y = 0.025; u.shockwave.scale.setScalar(0.01); u.fx.add(u.shockwave);
        u.fireLight = new T.PointLight(0xff4c16, 0, 10, 2); u.fireLight.position.set(0, 1.5, 0); this.scene.add(u.fireLight);
        u.fireColumns = [];
        for (let i = 0; i < 14; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.16 + (i % 3) * 0.05, 0.65 + (i % 4) * 0.25, 7), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4716 : 0xffb52a, transparent: true, opacity: 0.82, blending: T.AdditiveBlending, depthWrite: false }));
          const angle = i * Math.PI * 2 / 14, radius = 0.8 + (i % 3) * 0.34;
          flame.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius); u.fx.add(flame); u.fireColumns.push(flame);
        }
        u.debris = [];
        for (let i = 0; i < 32; i++) {
          const rubble = new T.Mesh(new T.DodecahedronGeometry(0.12 + Math.random() * 0.2, 0), new T.MeshStandardMaterial({ color: i % 3 ? 0x342a25 : 0x625044, roughness: 1 }));
          rubble.visible = false; u.fx.add(rubble); u.debris.push(rubble);
        }
      }
    }

    formScaleMatchingActor(actor, form) {
      const T = this.THREE;
      actor.parts.root.updateMatrixWorld(true);
      const actorHeight = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y;
      form.scale.setScalar(1); actor.holder.updateMatrixWorld(true); form.updateMatrixWorld(true);
      const formHeight = new T.Box3().setFromObject(form).getSize(new T.Vector3()).y;
      return actorHeight / Math.max(formHeight, 0.001);
    }

    makeGiantFox() {
      const T = this.THREE, fox = new T.Group();
      const coat = new T.MeshStandardMaterial({ color: 0xc84c18, roughness: 0.83, emissive: 0x2b0800 });
      const cream = new T.MeshStandardMaterial({ color: 0xf0d6af, roughness: 0.9 });
      const dark = new T.MeshStandardMaterial({ color: 0x191316, roughness: 0.65 });
      const gold = new T.MeshBasicMaterial({ color: 0xffd44f });
      const sphere = (parent, material, position, scale) => { const mesh = new T.Mesh(new T.SphereGeometry(1, 20, 14), material); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh; };
      sphere(fox, coat, [0, 0.65, 0], [0.72, 0.78, 1.05]);
      sphere(fox, cream, [0, 0.55, 0.68], [0.43, 0.52, 0.48]);
      sphere(fox, coat, [0, 1.45, 0.38], [0.57, 0.52, 0.55]);
      sphere(fox, cream, [0, 1.29, 0.83], [0.36, 0.24, 0.38]);
      sphere(fox, dark, [0, 1.36, 1.16], [0.13, 0.1, 0.12]);
      for (const side of [-1, 1]) {
        const ear = new T.Mesh(new T.ConeGeometry(0.23, 0.72, 5), coat); ear.position.set(side * 0.36, 2.03, 0.27); ear.rotation.z = side * -0.24; fox.add(ear);
        const inner = new T.Mesh(new T.ConeGeometry(0.11, 0.44, 5), cream); inner.position.set(side * 0.36, 2.02, 0.31); inner.rotation.z = side * -0.24; fox.add(inner);
        sphere(fox, gold, [side * 0.24, 1.52, 0.82], [0.09, 0.075, 0.045]);
        sphere(fox, dark, [side * 0.24, 1.52, 0.86], [0.025, 0.064, 0.02]);
      }
      for (const x of [-0.46, 0.46]) for (const z of [-0.6, 0.65]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 0.8, 10), coat); leg.position.set(x, 0.12, z); fox.add(leg);
        sphere(fox, dark, [x, -0.27, z + 0.06], [0.22, 0.12, 0.3]);
      }
      const tail = new T.Mesh(new T.ConeGeometry(0.42, 1.8, 10), coat); tail.position.set(0, 0.78, -1.35); tail.rotation.x = Math.PI / 2.8; fox.add(tail);
      sphere(fox, cream, [0, 0.38, -1.92], [0.32, 0.33, 0.26]);
      fox.userData.coat = coat;
      return fox;
    }

    makeBlackBanshee() {
      const T = this.THREE, banshee = new T.Group();
      const robe = new T.MeshStandardMaterial({ color: 0x100b18, roughness: 0.86, emissive: 0x210b2f });
      const edge = new T.MeshBasicMaterial({ color: 0x652187 });
      const face = new T.MeshStandardMaterial({ color: 0x211726, roughness: 0.9 });
      const eye = new T.MeshBasicMaterial({ color: 0xd18cff });
      const wisps = [];
      const body = new T.Mesh(new T.ConeGeometry(0.62, 1.4, 12), robe); body.position.y = 0.72; banshee.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.32, 18, 14), face); head.position.set(0, 1.55, 0.08); banshee.add(head);
      const hood = new T.Mesh(new T.ConeGeometry(0.45, 0.72, 8), robe); hood.position.set(0, 1.77, -0.02); banshee.add(hood);
      const veil = new T.Mesh(new T.ConeGeometry(0.3, 0.85, 9), edge); veil.position.set(0, 1.14, -0.08); banshee.add(veil);
      for (const side of [-1, 1]) {
        const arm = new T.Mesh(new T.CylinderGeometry(0.1, 0.17, 0.86, 8), robe); arm.position.set(side * 0.54, 1.1, 0.04); arm.rotation.z = side * -0.72; banshee.add(arm);
        const wisp = new T.Mesh(new T.ConeGeometry(0.16, 1.0, 6), edge); wisp.position.set(side * 0.7, 0.6, -0.16); wisp.rotation.z = side * -0.45; wisp.userData.baseRotation = wisp.rotation.z; banshee.add(wisp); wisps.push(wisp);
        const eyeMesh = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), eye); eyeMesh.position.set(side * 0.13, 1.58, 0.36); banshee.add(eyeMesh);
      }
      banshee.userData.wisps = wisps;
      return banshee;
    }

    makeWhiteAngel() {
      const T = this.THREE, angel = new T.Group();
      const robe = new T.MeshStandardMaterial({ color: 0xf5f8ff, roughness: 0.48, metalness: 0.08, emissive: 0x6b7ca8, emissiveIntensity: 0.22 });
      const silver = new T.MeshStandardMaterial({ color: 0xc8d9f5, roughness: 0.38, metalness: 0.42, emissive: 0x5a83c4, emissiveIntensity: 0.28 });
      const skin = new T.MeshStandardMaterial({ color: 0xf1dfd0, roughness: 0.82 });
      const glow = new T.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false });
      const sphere = (parent, material, position, scale) => {
        const mesh = new T.Mesh(new T.SphereGeometry(1, 18, 14), material);
        mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
      };
      const gown = new T.Mesh(new T.ConeGeometry(0.62, 1.55, 12), robe); gown.position.y = 0.78; angel.add(gown);
      sphere(angel, robe, [0, 1.43, 0], [0.36, 0.56, 0.3]);
      sphere(angel, skin, [0, 2.02, 0.05], [0.25, 0.3, 0.23]);
      const hair = new T.Mesh(new T.SphereGeometry(0.28, 16, 12), silver); hair.position.set(0, 2.17, -0.04); hair.scale.set(1, 0.75, 0.9); angel.add(hair);
      const halo = new T.Mesh(new T.TorusGeometry(0.39, 0.045, 10, 48), glow); halo.position.set(0, 2.52, -0.02); angel.add(halo);
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.24, 1.62, -0.16); wing.rotation.y = side * -0.18; angel.add(wing);
        const span = new T.Mesh(new T.SphereGeometry(1, 16, 12), robe); span.position.set(side * 0.62, 0.12, -0.03); span.scale.set(0.72, 0.23, 0.12); wing.add(span);
        for (let i = 0; i < 6; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.14, 0.72 + (i % 3) * 0.12, 7), i % 2 ? silver : robe);
          feather.position.set(side * (0.3 + i * 0.19), -0.08 - i * 0.025, -0.04);
          feather.rotation.z = side * (Math.PI / 2 + 0.16 + i * 0.035); wing.add(feather);
        }
        wings.push(wing);
      }
      angel.userData.wings = wings;
      angel.userData.halo = halo;
      return angel;
    }

    makeSusanoo() {
      const T = this.THREE, warrior = new T.Group();
      const armor = new T.MeshStandardMaterial({ color: 0x123e83, roughness: 0.3, metalness: 0.58, emissive: 0x071e54, emissiveIntensity: 0.7 });
      const edge = new T.MeshStandardMaterial({ color: 0x62caff, roughness: 0.22, metalness: 0.42, emissive: 0x197fff, emissiveIntensity: 1.2 });
      const dark = new T.MeshStandardMaterial({ color: 0x10192e, roughness: 0.4, metalness: 0.48 });
      const sphere = (parent, material, position, scale) => {
        const mesh = new T.Mesh(new T.SphereGeometry(1, 16, 12), material);
        mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
      };
      const torso = new T.Mesh(new T.BoxGeometry(1.05, 1.28, 0.58), armor); torso.position.y = 1.28; warrior.add(torso);
      const chest = new T.Mesh(new T.BoxGeometry(0.76, 0.43, 0.1), edge); chest.position.set(0, 1.53, 0.33); warrior.add(chest);
      const skirt = new T.Mesh(new T.ConeGeometry(0.78, 0.75, 8), dark); skirt.position.y = 0.64; skirt.rotation.x = Math.PI; warrior.add(skirt);
      sphere(warrior, armor, [0, 2.18, 0.05], [0.38, 0.42, 0.34]);
      const mask = new T.Mesh(new T.BoxGeometry(0.44, 0.2, 0.12), edge); mask.position.set(0, 2.13, 0.33); warrior.add(mask);
      const helmet = new T.Mesh(new T.CylinderGeometry(0.17, 0.42, 0.48, 8), dark); helmet.position.set(0, 2.53, 0.01); warrior.add(helmet);
      for (const side of [-1, 1]) {
        const horn = new T.Mesh(new T.ConeGeometry(0.16, 0.8, 6), edge); horn.position.set(side * 0.35, 2.72, -0.02); horn.rotation.z = side * -0.45; warrior.add(horn);
        const shoulder = new T.Mesh(new T.BoxGeometry(0.78, 0.34, 0.54), armor); shoulder.position.set(side * 0.68, 1.86, 0); shoulder.rotation.z = side * -0.12; warrior.add(shoulder);
        const arm = new T.Mesh(new T.CylinderGeometry(0.18, 0.23, 0.9, 8), dark); arm.position.set(side * 0.74, 1.25, 0.08); arm.rotation.z = side * 0.14; warrior.add(arm);
        const leg = new T.Mesh(new T.CylinderGeometry(0.2, 0.27, 0.92, 8), armor); leg.position.set(side * 0.3, 0.05, 0); warrior.add(leg);
      }
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.46, 1.72, -0.26); warrior.add(wing);
        for (let i = 0; i < 7; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.17, 1.1 + (i % 3) * 0.18, 6), i % 2 ? edge : armor);
          feather.position.set(side * (0.28 + i * 0.2), 0.1 + i * 0.035, -0.04);
          feather.rotation.z = side * (Math.PI / 2 + 0.18 + i * 0.045); wing.add(feather);
        }
        wings.push(wing);
      }
      warrior.userData.wings = wings;
      warrior.userData.armor = armor;
      return warrior;
    }

    makePhoenix() {
      const T = this.THREE, bird = new T.Group(), flames = [];
      const plumage = new T.MeshStandardMaterial({ color: 0xe8500e, roughness: 0.55, emissive: 0xb02800, emissiveIntensity: 0.5 });
      const gold = new T.MeshStandardMaterial({ color: 0xffb22a, roughness: 0.4, emissive: 0xc06a00, emissiveIntensity: 0.4 });
      const eye = new T.MeshBasicMaterial({ color: 0xfff6c8 });
      // Mélange normal : les flammes restent orangées même sur un décor clair.
      const fire = (color, opacity = 0.88) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
      const sphere = (parent, material, position, scale) => { const m = new T.Mesh(new T.SphereGeometry(1, 18, 14), material); m.position.set(...position); m.scale.set(...scale); parent.add(m); return m; };
      sphere(bird, plumage, [0, 0.95, 0], [0.26, 0.3, 0.42]);
      sphere(bird, gold, [0, 0.9, 0.22], [0.2, 0.24, 0.24]);
      const neck = sphere(bird, plumage, [0, 1.22, 0.3], [0.14, 0.2, 0.14]); neck.rotation.x = -0.4;
      sphere(bird, plumage, [0, 1.42, 0.38], [0.16, 0.15, 0.18]);
      const beak = new T.Mesh(new T.ConeGeometry(0.06, 0.22, 8), gold); beak.position.set(0, 1.38, 0.6); beak.rotation.x = Math.PI / 2 + 0.25; bird.add(beak);
      for (const side of [-1, 1]) sphere(bird, eye, [side * 0.09, 1.46, 0.5], [0.03, 0.03, 0.02]);
      // Crête de flammes sur la tête.
      for (let i = 0; i < 4; i++) {
        const crest = new T.Mesh(new T.ConeGeometry(0.045, 0.32 + i * 0.05, 6), fire(i % 2 ? 0xffd04a : 0xff4a12));
        crest.position.set(0, 1.62 + i * 0.02, 0.36 - i * 0.09); crest.rotation.x = -0.5 - i * 0.18; bird.add(crest); flames.push(crest);
      }
      // Longue queue de flammes.
      for (let i = 0; i < 9; i++) {
        const len = 1.5 + (i % 3) * 0.35;
        const tail = new T.Mesh(new T.ConeGeometry(0.075, len, 7), fire(i % 3 === 0 ? 0xff3a0b : i % 3 === 1 ? 0xffb52a : 0xff7a1a));
        tail.position.set((i - 4) * 0.055, 0.66, -0.35 - len / 2); tail.rotation.x = -Math.PI / 2 - 0.3; tail.rotation.z = (i - 4) * 0.08; bird.add(tail); flames.push(tail);
      }
      // Ailes : plumes ardentes articulées depuis l'épaule.
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.2, 1.05, -0.02); wing.userData.side = side; bird.add(wing);
        sphere(wing, plumage, [side * 0.38, 0, 0], [0.42, 0.06, 0.2]);
        for (let i = 0; i < 8; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.09, 0.62 + i * 0.05, 6), fire(i % 2 ? 0xff5a12 : 0xffc14b));
          feather.position.set(side * (0.18 + i * 0.13), -0.05 - i * 0.012, -0.12);
          feather.rotation.x = -Math.PI / 2 + 0.25; feather.rotation.z = side * (0.15 + i * 0.05); wing.add(feather); flames.push(feather);
        }
        wings.push(wing);
      }
      for (const side of [-1, 1]) {
        const claw = new T.Mesh(new T.ConeGeometry(0.04, 0.32, 6), gold); claw.position.set(side * 0.1, 0.56, 0.05); claw.rotation.x = Math.PI; bird.add(claw);
      }
      flames.forEach((f, i) => { f.userData.phase = i * 1.37; });
      bird.userData = { wings, flames, plumage };
      return bird;
    }

    devastateForFox(u) {
      if (u.apocalypse) return;
      const T = this.THREE;
      u.apocalypse = {
        background: this.scene.background && this.scene.background.clone(), fog: this.scene.fog,
        floorY: this.floor.position.y, floorColor: this.floor.material.color.clone(),
        hemi: this.hemi.intensity, sun: this.sun.intensity,
        visibility: [this.boardMesh, this.base, this.terrainGroup, ...(this.animalGroup ? [this.animalGroup] : []), ...(this.backdrop ? [this.backdrop] : []), this.overlay, this.weatherGroup, this.mateFireGroup, this.checkGroup].map((o) => [o, o.visible]),
        chars: [...this.chars.values()].map((c) => [c, c.holder.visible]),
        dying: this.dying.map((d) => [d.c.holder, d.c.holder.visible]),
        scars: this.captureScars.map((s) => [s.object, s.object.visible]),
        spark: this.spark && this.spark.visible,
      };
      this.boardMesh.visible = false; this.base.visible = false; this.terrainGroup.visible = false; if (this.animalGroup) this.animalGroup.visible = false; if (this.backdrop) this.backdrop.visible = false;
      this.overlay.visible = false; this.weatherGroup.visible = false; this.mateFireGroup.visible = false; this.checkGroup.visible = false;
      for (const c of this.chars.values()) c.holder.visible = c === u.actor;
      this.dying.forEach((d) => { d.c.holder.visible = false; });
      this.captureScars.forEach((s) => { s.object.visible = false; });
      if (this.spark) this.spark.visible = false;
      this.floor.position.y = -0.03; this.floor.material.color.setHex(0x211a17);
      this.scene.background = new T.Color(0x120c10);
      this.scene.fog = new T.Fog(0x21100c, 8, 38);
      this.hemi.intensity = 0.48; this.sun.intensity = 0.22;
      this.scene.add(u.fx);
      this.shakeUntil = this.now() + 1.3; this.shakeAmp = 0.3;
    }

    restoreFoxWorld(u) {
      const a = u && u.apocalypse;
      if (!a) return;
      this.scene.background = a.background;
      this.scene.fog = a.fog;
      this.floor.position.y = a.floorY; this.floor.material.color.copy(a.floorColor);
      this.hemi.intensity = a.hemi; this.sun.intensity = a.sun;
      a.visibility.forEach(([object, visible]) => { object.visible = visible; });
      a.chars.forEach(([character, visible]) => { character.holder.visible = visible; });
      a.dying.forEach(([object, visible]) => { object.visible = visible; });
      a.scars.forEach(([object, visible]) => { object.visible = visible; });
      if (this.spark && a.spark != null) this.spark.visible = a.spark;
    }

    tickMateUltimate(c, t, M) {
      const T = this.THREE;
      const u = this.mateUltimate;
      if (u && t >= u.start && u.sabre && u.sabre.swept && u.sabre.swept.has(c)) return this.tickSabreSwept(c, t, M, u);
      if (!u || t < u.start || (c !== u.actor && c !== u.king)) return false;
      if (u.themed) return this.tickThemeMate(c, t, M, u);
      const kind = u.piece.toLowerCase(), e = t - u.start, target = u.target;
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const actor = u.actor, king = u.king;
      if (kind === 'q' && u.piece === 'Q') {
        const queenPos = this.sqToPos(u.attackerTo);
        if (c === actor) {
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = true;
          const grow = smooth(e / 0.9);
          u.angel.scale.setScalar(0.05 + grow * u.angelBaseScale);
          u.angel.position.set(queenPos.x, grow * u.floatH + Math.sin(t * 3.2) * 0.08, queenPos.z);
          u.angel.userData.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (0.12 + Math.sin(t * 5.2 + i) * 0.25); });
          u.angel.userData.halo.rotation.y = t * 1.4;
          for (const shot of u.energyShots || []) {
            const launch = 0.82 + shot.index * 0.075;
            const progress = clamp((e - launch) / 0.58);
            shot.ball.visible = e >= launch && progress < 1;
            shot.ball.position.set(
              queenPos.x + (shot.target.x - queenPos.x) * progress,
              1.85 + Math.sin(progress * Math.PI) * 0.5,
              queenPos.z + (shot.target.z - queenPos.z) * progress,
            );
            if (progress >= 1 && !shot.hit) {
              shot.hit = true;
              if (shot.victim) shot.victim.holder.visible = false;
            }
          }
          for (const fire of u.whiteFlames || []) {
            const age = e - fire.start;
            fire.group.visible = age > 0;
            const grow = smooth(age / 0.3);
            const flicker = 0.78 + Math.abs(Math.sin(t * 15 + fire.flame.userData.phase)) * 0.55;
            fire.flame.scale.y = grow * flicker;
            fire.flame.position.y = fire.flame.userData.base * fire.flame.scale.y / 2;
            fire.flame.material.opacity = grow * (0.58 + Math.abs(Math.sin(t * 12 + fire.flame.userData.phase)) * 0.32);
          }
          const beamGrow = smooth((e - 2.05) / 0.72);
          u.whiteBeam.visible = beamGrow > 0;
          u.whiteBeam.scale.y = Math.max(0.015, beamGrow);
          if (u.energyLight) u.energyLight.intensity = e > 2 ? 2 + Math.abs(Math.sin(t * 10)) * 5 : grow * 1.4;
          if (u.crackLines) u.crackLines.forEach((line) => { line.material.opacity = smooth((e - line.userData.delay) / 0.55) * 0.9; });
          if (e > 3.6) {
            this.shakeUntil = t + 0.035; this.shakeAmp = 0.045;
            for (const enemy of this.chars.values()) if (enemy.piece === enemy.piece.toLowerCase()) enemy.holder.visible = false;
          }
        } else if (c === king) {
          c.anim = null;
          const vanish = smooth((e - 2.55) / 1.65);
          c.parts.root.position.y = Math.sin(t * 24) * 0.08 + vanish * 0.15;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - vanish), u.kingBase.scale.y * (1 - vanish), u.kingBase.scale.z * (1 - vanish));
          if (e > 2.4) { this.shakeUntil = t + 0.035; this.shakeAmp = 0.035; }
        }
        return true;
      }
      if (kind === 'q') {
        const queenPos = this.sqToPos(u.attackerTo);
        if (c === actor) {
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = true;
          const grow = smooth(e / 0.9);
          u.blackBanshee.scale.setScalar(Math.max(0.05, grow * u.blackBansheeBaseScale));
          const approach = smooth((e - 0.85) / 1.35);
          u.blackBanshee.position.set(
            queenPos.x + (target.x - queenPos.x) * approach,
            grow * u.floatH + Math.sin(t * 3.2) * 0.08 + Math.sin(approach * Math.PI) * 0.7,
            queenPos.z + (target.z - queenPos.z) * approach,
          );
          const dx = target.x - queenPos.x, dz = target.z - queenPos.z;
          u.blackBanshee.rotation.y = Math.atan2(dx, dz) + Math.sin(t * 1.8) * 0.16;
          u.blackBanshee.userData.wisps.forEach((wisp, i) => {
            wisp.rotation.z = wisp.userData.baseRotation + Math.sin(t * 5.2 + i) * 0.24;
          });
          const dim = clamp(e / 0.8) * (1 - clamp((e - (u.duration - 0.7)) / 0.7));
          if (u.sky) {
            this.skyDim = dim;
            const night = new T.Color(0x07040c);
            if (u.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(u.sky.background).lerp(night, dim * 0.9);
            if (u.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(u.sky.fog).lerp(night, dim * 0.85);
            if (!this.weather) { this.sun.intensity = u.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = u.sky.hemi * (1 - 0.75 * dim); }
            this.renderer.toneMappingExposure = u.sky.exposure * (1 - 0.45 * dim);
          }
          u.clouds.rotation.y = t * 0.12;
          u.clouds.children.forEach((puff, i) => {
            puff.material.opacity = 0.88 * dim;
            puff.position.y = puff.userData.baseY + Math.sin(t * 1.3 + i) * 0.09;
          });
          if (u.fireLight) u.fireLight.intensity = 1.1 + Math.abs(Math.sin(t * 8)) * 1.8;
          if (u.columnLight) u.columnLight.intensity = 1.4 + Math.abs(Math.sin(t * 11)) * 3.2;
        } else if (c === king) {
          c.anim = null;
          const burn = smooth((e - 1.5) / 3.6);
          c.parts.root.position.y = u.kingBase.position.y + Math.sin(t * 26) * 0.12 + burn * 0.1;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - burn), u.kingBase.scale.y * (1 - burn), u.kingBase.scale.z * (1 - burn));
          if (burn >= 1) c.holder.visible = false;
          if (e > 2.2) { this.shakeUntil = t + 0.035; this.shakeAmp = 0.035; }
        }
        if (c === actor) for (const victim of u.flameVictims || []) {
          const burn = smooth((e - victim.start) / 0.85);
          if (burn <= 0) continue;
          const root = victim.character.parts.root;
          root.position.y = victim.position.y + Math.sin(t * 24 + victim.phase) * 0.045 + burn * 0.12;
          root.scale.set(victim.scale.x * (1 - burn), victim.scale.y * (1 - burn), victim.scale.z * (1 - burn));
          if (burn >= 1) victim.character.holder.visible = false;
        }
        if (u.blackFlames) for (const item of u.blackFlames) {
          const flames = item.isGroup ? item.children : [item];
          for (const flame of flames) {
            const flicker = 0.78 + Math.abs(Math.sin(t * 13 + flame.userData.phase)) * 0.6;
            flame.scale.y = flicker;
            flame.position.y = flame.userData.base * flicker / 2;
            if (flame.material) flame.material.opacity = Math.min(1, (flame.material.opacity > 0.5 ? 0.82 : 0.72) + Math.sin(t * 19 + flame.userData.phase) * 0.12);
          }
        }
        return true;
      }
      if (kind === 'k' && u.piece === 'k') {
        const impactAt = u.meteors[0].impact;
        if (c === actor) {
          c.anim = null; c.holder.position.set(0, 0, 0); c.holder.rotation.y = Math.sin(t * 0.42) * 0.12;
          c.parts.root.visible = false;
          const grow = smooth(e / 1.2);
          u.susanoo.visible = true; u.susanoo.scale.setScalar(0.05 + grow * 1.2);
          u.susanoo.rotation.y = Math.sin(t * 0.55) * 0.08;
          u.susanoo.userData.armor.emissiveIntensity = 0.55 + Math.abs(Math.sin(t * 8)) * 0.7;
          u.susanoo.userData.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (0.08 + Math.sin(t * 4.5 + i) * 0.18); });
          let shake = 0;
          for (const m of u.meteors) {
            const descent = smooth((e - m.start) / (m.impact - m.start));
            m.group.visible = e < m.impact;
            m.group.position.set(m.from.x + (m.x - m.from.x) * descent, m.from.y + (1.4 - m.from.y) * descent, m.from.z + (m.z - m.from.z) * descent);
            m.group.rotation.set(t * 0.72, t * 0.55, t * 0.68);
            m.flames.forEach((flame, i) => { flame.scale.y = 0.8 + Math.abs(Math.sin(t * 15 + i)) * 0.75; });
            if (e >= m.impact) {
              const blast = Math.min(1, (e - m.impact) / 0.9);
              m.shockwave.scale.setScalar(0.1 + blast * 14); m.shockwave.material.opacity = 0.96 * (1 - blast);
              shake = Math.max(shake, 0.26 * (1 - blast * 0.4));
            }
          }
          if (e >= impactAt) {
            this.devastateForFox(u);
            if (u.fireLight) u.fireLight.intensity = 5 + Math.abs(Math.sin(t * 6)) * 4;
            if (u.debris) u.debris.forEach((rock, i) => {
              // Chaque météorite projette la moitié des rochers enflammés autour de son point d'impact.
              const m = u.meteors[i % 2];
              if (e < m.impact) { rock.visible = false; return; }
              const age = Math.max(0, e - m.impact - (i % 8) * 0.025), angle = i * 2.399;
              const radius = 1.6 + (i % 6) * 0.4;
              rock.visible = true;
              const spread = age < 0.72 ? 0.35 + age * radius * 1.8 : radius;
              const y = age < 0.72 ? Math.max(0.1, Math.sin(age * Math.PI) * (2.5 + (i % 4) * 0.8)) : 0.2 + (i % 3) * 0.08;
              rock.position.set(m.x + Math.cos(angle) * spread, y, m.z + Math.sin(angle) * spread);
              rock.rotation.set(age * 7 + i, age * 9, age * 6);
              rock.userData.fire.scale.y = 0.7 + Math.abs(Math.sin(t * 13 + i)) * 0.9;
              rock.userData.fire.material.opacity = 0.6 + Math.abs(Math.sin(t * 15 + i)) * 0.35;
            });
          }
          if (shake > 0) { this.shakeUntil = t + 0.045; this.shakeAmp = shake; }
        } else if (c === king && e >= impactAt) {
          c.anim = null; c.holder.visible = false;
        }
        return true;
      }
      if (kind === 'k') {
        const impactAt = 2.65;
        if (c === actor) {
          c.anim = null; c.holder.position.set(0, 0, 0); c.holder.rotation.y = Math.sin(t * 0.45) * 0.15;
          c.parts.root.visible = false;
          const grow = smooth(e / 1.05);
          u.fox.visible = true; u.fox.scale.setScalar(0.05 + grow * 3.0);
          u.fox.rotation.y = Math.sin(t * 0.7) * 0.08;
          u.fox.userData.coat.emissiveIntensity = 0.45 + Math.abs(Math.sin(t * 9)) * 0.9;
          if (u.energy) {
            const fall = smooth((e - 1.4) / 1.18);
            u.energy.visible = e < impactAt;
            u.energy.position.set(0, e < 1.4 ? 6.2 + Math.sin(t * 3) * 0.18 : 6.2 - fall * 5.7, 0);
            const charge = 0.25 + smooth(e / 0.7) * 1.65;
            u.energy.scale.setScalar(charge * (e < 1.4 ? 1 + Math.sin(t * 8) * 0.06 : 1 + fall * 0.25));
            u.energy.rotation.y += 0.035; u.energy.rotation.x = Math.sin(t * 1.8) * 0.2;
            if (u.energyRings) u.energyRings.forEach((ring, i) => { ring.rotation.x += 0.025 * (i + 1); ring.rotation.z -= 0.02 * (i + 1); });
          }
          if (u.fireColumns) u.fireColumns.forEach((flame, i) => {
            flame.visible = e > 0.45;
            flame.position.y = 0.35 + Math.abs(Math.sin(t * 12 + i)) * (0.45 + grow * 0.8);
            flame.material.opacity = 0.55 + Math.abs(Math.sin(t * 15 + i)) * 0.4;
          });
          if (e >= impactAt) {
            this.devastateForFox(u);
            if (u.fireLight) u.fireLight.intensity = 4 + Math.abs(Math.sin(t * 7)) * 3;
            const blast = Math.min(1, (e - impactAt) / 0.8);
            if (u.shockwave) { u.shockwave.scale.setScalar(0.1 + blast * 13); u.shockwave.material.opacity = 0.95 * (1 - blast); }
            if (u.debris) u.debris.forEach((rubble, i) => {
              const age = clamp((e - impactAt) * 0.7 + (i % 6) * 0.07), angle = i * 2.399;
              rubble.visible = age < 1;
              rubble.position.set(Math.cos(angle) * (0.3 + age * (2.5 + (i % 4) * 0.5)), Math.max(-0.02, Math.sin(age * Math.PI) * (1.5 + (i % 3) * 0.5)), Math.sin(angle) * (0.3 + age * (2.5 + (i % 4) * 0.5)));
              rubble.rotation.set(age * 8, age * 11, age * 6);
            });
            u.fox.scale.setScalar(3.05); // le renard reste seul au milieu du terrain détruit
          }
        } else if (c === king && e >= impactAt) {
          c.anim = null; c.holder.visible = false;
        }
        return true;
      }
      if (u.piece === 'b') return this.tickBlackDragon(u, c, e, t, M, clamp, smooth);
      if (u.piece === 'R') return this.tickFireTornado(u, c, e, t, M, clamp, smooth);
      if (u.piece === 'r') return this.tickFireGolem(u, c, e, t, M, clamp, smooth);
      if (kind === 'n') {
        const dx = target.x - u.fromPos.x, dz = target.z - u.fromPos.z, len = Math.hypot(dx, dz) || 1;
        if (u.piece === 'N') {
          // Chien à deux têtes : fusion, bond sur le roi, trois piétinements, puis déchiquetage.
          const stand = { x: target.x - dx / len * 0.32, z: target.z - dz / len * 0.32 };
          const stompStart = 1.25, stompEnd = 2.75, slams = clamp((e - stompStart) / (stompEnd - stompStart)) * 3;
          if (c === actor) {
            c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
            const fuse = smooth(e / 0.5);
            if (c.parts.riderRoot) {
              c.parts.riderRoot.visible = fuse < 1;
              c.parts.riderRoot.scale.setScalar(0.68 * (1 - fuse * 0.95));
              c.parts.riderRoot.position.y = 0.43 - fuse * 0.25;
            }
            u.hiddenParts.forEach((o) => { o.visible = e < 0.3; });
            const heads = smooth((e - 0.3) / 0.3);
            u.actorRoot.scale.copy(u.actorBase.scale).multiplyScalar(1 + heads * 0.4);
            u.fusionRing.position.set(u.fromPos.x, 0.45, u.fromPos.z);
            u.fusionRing.scale.setScalar(0.4 + smooth(e / 0.6) * 1.6);
            u.fusionRing.material.opacity = e < 0.7 ? Math.sin(Math.PI * clamp(e / 0.7)) * 0.9 : 0;
            if (u.fireLight) { u.fireLight.position.set(c.holder.position.x, 1, c.holder.position.z); u.fireLight.intensity = e < 0.7 ? Math.sin(Math.PI * clamp(e / 0.7)) * 4 : 0; }
            let pitch = Math.sin(t * 15) * 0.05, lift = 0;
            if (e < 0.55) {
              M.animate(c.parts, t, 'guard', 1);
              c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
            } else if (e < stompStart) {
              M.animate(c.parts, t, 'run');
              const p = smooth((e - 0.55) / (stompStart - 0.55));
              c.holder.position.set(u.fromPos.x + (stand.x - u.fromPos.x) * p, Math.sin(Math.PI * p) * 0.9, u.fromPos.z + (stand.z - u.fromPos.z) * p);
            } else if (e < stompEnd) {
              M.animate(c.parts, t, 'run');
              c.holder.position.set(stand.x, 0, stand.z);
              // Se cabre puis retombe de tout son poids sur le roi.
              const ph = slams % 1;
              pitch = -0.6 * Math.sin(Math.PI * ph); lift = 0.18 * Math.sin(Math.PI * ph);
              if (ph < 0.08) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
            } else {
              M.animate(c.parts, t, 'guard', 1);
              const p = smooth((e - stompEnd) / 0.4);
              c.holder.position.set(stand.x + (target.x - stand.x) * p * 0.5, 0, stand.z + (target.z - stand.z) * p * 0.5);
              pitch = 0.12 + Math.sin(t * 22) * 0.05;
            }
            u.actorRoot.rotation.set(pitch, 0, e > stompEnd ? Math.sin(t * 18) * 0.06 : 0);
            u.actorRoot.position.y = u.actorBase.position.y + lift;
            u.extraHeads.forEach((neck) => {
              const side = neck.userData.side;
              neck.scale.setScalar(Math.max(0.01, heads));
              if (e > stompEnd) {
                // Les deux gueules mordent tour à tour et secouent la tête pour arracher.
                const bite = Math.sin(t * 13 + (side > 0 ? Math.PI : 0));
                neck.rotation.set(0.45 + bite * 0.3, side * 0.22 + Math.sin(t * 31 + side) * 0.3, 0);
                neck.userData.jaw.rotation.x = 0.15 + Math.max(0, -bite) * 0.5;
              } else {
                neck.rotation.set(-0.1 + Math.abs(Math.sin(t * 9 + side)) * -0.2, side * 0.22, 0);
                neck.userData.jaw.rotation.x = 0.1 + Math.abs(Math.sin(t * 11 + side)) * 0.35;
              }
            });
            u.dust.forEach((ring, i) => {
              const age = slams - i;
              ring.visible = age > 0 && age < 1;
              ring.scale.setScalar(1 + clamp(age) * 3);
              ring.material.opacity = age > 0 ? 0.55 * (1 - clamp(age)) : 0;
            });
            u.shreds.forEach((shred, i) => {
              const age = e - (stompEnd + 0.1 + (i % 9) * 0.15);
              shred.visible = age > 0;
              if (age <= 0) return;
              const angle = i * 2.399, reach = Math.min(age, 0.9) * (1.2 + (i % 4) * 0.35);
              shred.position.set(target.x + Math.cos(angle) * reach, Math.max(0.03, 0.5 + age * 2.4 - age * age * 4), target.z + Math.sin(angle) * reach);
              shred.rotation.set(age * 9 + i, age * 7, age * 11);
            });
            if (e >= u.duration) { c.holder.position.set(target.x, 0, target.z); u.actorRoot.rotation.set(0, 0, 0); u.actorRoot.position.y = u.actorBase.position.y; }
          } else if (c === king) {
            c.anim = null; c.holder.position.set(target.x, 0, target.z);
            const crushed = Math.floor(slams + 0.92);
            const squash = 1 - Math.min(3, crushed) * 0.17;
            const shred = smooth((e - stompEnd - 0.1) / 1.4);
            const s = 1 - shred;
            c.parts.root.scale.set(u.kingBase.scale.x * (1 + (1 - squash) * 0.6) * s, u.kingBase.scale.y * squash * s, u.kingBase.scale.z * (1 + (1 - squash) * 0.6) * s);
            c.parts.root.position.y = u.kingBase.position.y;
            c.parts.root.rotation.set(0, e > stompEnd ? Math.sin(t * 27) * 0.4 : 0, e > stompEnd ? Math.sin(t * 19) * 0.3 : 0);
            if (shred >= 1) c.holder.visible = false;
          }
          return true;
        }
        // Phénix : fusion dans un tourbillon de feu, vol jusqu'au roi, étreinte des ailes jusqu'aux cendres.
        const front = { x: target.x - dx / len * 0.75, z: target.z - dz / len * 0.75 };
        const bird = u.phoenix, wrapStart = 2.6;
        if (c === actor) {
          c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
          const fuse = smooth(e / 0.8);
          if (e < 0.8) {
            M.animate(c.parts, t, 'run');
            c.parts.root.visible = true;
            c.parts.root.rotation.set(0, e * 14, 0);
            c.parts.root.scale.copy(u.actorBase.scale).multiplyScalar(1 - fuse * 0.85);
          } else c.parts.root.visible = false;
          u.vortex.forEach((flame, i) => {
            flame.visible = e < 1.0;
            const a = flame.userData.a + t * 9, r = 0.55 * (1 - fuse * 0.6);
            flame.position.set(c.holder.position.x + Math.cos(a) * r, c.holder.position.y + 0.25 + (i % 4) * 0.18 + fuse * 0.3, c.holder.position.z + Math.sin(a) * r);
            flame.material.opacity = e < 1.0 ? 0.85 * (1 - clamp((e - 0.8) / 0.2)) : 0;
          });
          bird.visible = e > 0.45;
          bird.scale.setScalar(0.05 + smooth((e - 0.45) / 0.6) * u.phoenixScale);
          if (e < 0.9) c.holder.position.set(u.fromPos.x, fuse * 1.0, u.fromPos.z);
          else if (e < 2.1) {
            const f = smooth((e - 0.9) / 1.2);
            c.holder.position.set(u.fromPos.x + (front.x - u.fromPos.x) * f, (1 - f) * 1.0 + Math.sin(Math.PI * f) * 1.0, u.fromPos.z + (front.z - u.fromPos.z) * f);
          } else c.holder.position.set(front.x, 0, front.z);
          // Battements en vol, ailes déployées à l'atterrissage, puis repliées sur le roi.
          const spread = smooth((e - 2.1) / 0.4), wrap = smooth((e - wrapStart) / 0.7);
          bird.userData.wings.forEach((wing) => {
            const side = wing.userData.side;
            wing.rotation.z = e < 2.1 ? side * Math.sin(t * 14) * 0.55 : side * (-0.35 * spread * (1 - wrap) + Math.sin(t * 6) * 0.04);
            wing.rotation.y = -side * wrap * 1.3;
          });
          bird.position.y = e < 2.1 ? Math.sin(t * 14) * 0.04 : 0;
          bird.rotation.x = e > wrapStart ? wrap * 0.2 : 0;
          bird.userData.plumage.emissiveIntensity = 0.9 + Math.abs(Math.sin(t * 9)) * 0.7;
          bird.userData.flames.forEach((f) => { const w = 0.8 + Math.abs(Math.sin(t * 15 + f.userData.phase)) * 0.5; f.scale.set(1, w, 1); });
          if (u.fireLight) { u.fireLight.position.set(c.holder.position.x, c.holder.position.y + 1.2, c.holder.position.z); u.fireLight.intensity = bird.visible ? 0.8 + Math.abs(Math.sin(t * 8)) * 0.8 + wrap * 1.2 : 0; }
          if (e >= u.duration) c.holder.position.set(target.x, 0, target.z);
        } else if (c === king) {
          c.anim = null; c.holder.position.set(target.x, 0, target.z);
          const blaze = e > wrapStart + 0.2;
          if (u.flames) u.flames.forEach((f, i) => {
            f.visible = blaze && e < u.duration - 0.3;
            f.position.y = 0.55 + Math.abs(Math.sin(t * 12 + i)) * 0.45; f.material.opacity = 0.45 + Math.abs(Math.sin(t * 15 + i)) * 0.5;
          });
          if (blaze && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
          const ashes = smooth((e - wrapStart - 0.4) / 2.0);
          c.parts.root.position.y = -ashes * 0.3 + (blaze ? Math.sin(t * 30) * 0.03 : 0);
          c.parts.root.rotation.x = -ashes * 0.4;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
          u.ashes.forEach((ash, i) => {
            const age = Math.max(0, e - (wrapStart + 0.8 + (i % 7) * 0.12)), angle = i * 2.399;
            ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.16), 0.12 + age * (0.65 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.16));
            ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.3) : 0;
            ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
          });
          if (e >= u.duration) {
            c.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
            if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
          }
        }
        return true;
      }
      if (c === actor) {
        c.anim = null; c.holder.rotation.y = Math.atan2(target.x - u.fromPos.x, target.z - u.fromPos.z);
        if (kind === 'p') {
          M.animate(c.parts, t, e < 1.9 ? 'run' : 'victory', 1);
          const rush = smooth(e / 0.55), land = smooth((e - 1.45) / 0.6);
          c.holder.position.set(u.fromPos.x + (target.x - u.fromPos.x) * rush, e < 0.75 ? Math.sin(Math.PI * e / 0.75) * 1.1 : 0, u.fromPos.z + (target.z - u.fromPos.z) * rush);
          c.parts.root.position.y = e >= 1.9 ? 0.72 : 0;
          c.parts.root.rotation.set(0, 0, 0);
          if (e > 1.45) c.holder.position.set(target.x, land * 0.55, target.z);
        } else {
          const p = smooth(e / 0.48), dx = target.x - u.fromPos.x, dz = target.z - u.fromPos.z, len = Math.hypot(dx, dz) || 1;
          const hug = { x: target.x - dx / len * 0.42, z: target.z - dz / len * 0.42 };
          if (e < 0.48) {
            M.animate(c.parts, t, 'run'); this.trail(c, true, t);
            c.holder.position.set(u.fromPos.x + (hug.x - u.fromPos.x) * p, Math.sin(Math.PI * p) * 0.42, u.fromPos.z + (hug.z - u.fromPos.z) * p);
          } else {
            M.animate(c.parts, t, 'guard', 1);
            c.holder.position.set(hug.x, 0, hug.z);
            // Les bras s'ouvrent puis entourent le roi pour le maintenir pendant la foudre.
            const embrace = smooth((e - 0.48) / 0.35);
            c.parts.armL.rotation.set(-0.9, 0, -0.3 - embrace * 0.72);
            c.parts.armR.rotation.set(-0.9, 0, 0.3 + embrace * 0.72);
            c.parts.torso.rotation.x = 0.16 + embrace * 0.12;
          }
          c.parts.root.rotation.set(0, 0, Math.sin(t * 28) * 0.035);
          if (kind === 'b') {
            const transformation = e < 0.55 ? clamp((e - 0.12) / 0.25) : 0;
            if (u.transformBolt) u.transformBolt.material.opacity = transformation * (e < 0.48 ? 1 : 0);
            if (u.actorLight) { u.actorLight.position.set(c.holder.position.x, 0.9, c.holder.position.z); u.actorLight.intensity = 0.25 + Math.abs(Math.sin(t * 21)) * 1.5; }
          }
        }
        if (e >= u.duration) {
          c.holder.position.set(target.x, kind === 'p' ? 0.55 : 0, target.z);
          c.parts.root.position.y = kind === 'p' ? 0.72 : 0;
          c.parts.root.rotation.set(0, 0, 0);
        }
      }
      if (king) {
        king.anim = null; king.holder.position.set(target.x, 0, target.z);
        if (kind === 'p') {
          if (e < 0.6) king.parts.root.position.y = smooth(e / 0.6) * 2.35;
          else if (e < 2.1) king.parts.root.position.y = 2.35 - smooth((e - 0.6) / 1.5) * 2.25;
          else { king.parts.root.position.y = 0.035; king.parts.root.rotation.set(-Math.PI / 2, 0, 0); king.parts.root.scale.y = u.kingBase.scale.y * 0.48; }
        } else if (kind === 'b') {
          const beat = e % 0.58, strike = beat < 0.2, flash = strike ? 1 - beat / 0.2 : 0;
          if (u.bolts) u.bolts.forEach((b, i) => { b.material.opacity = strike ? flash * (i === 1 ? 1 : 0.9) : 0; });
          if (u.flashLight) u.flashLight.intensity = flash * 7.5;
          if (e > 0.82 && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
          const ashes = smooth((e - 0.9) / 2.4);
          king.parts.root.position.y = -ashes * 0.36 + (strike ? Math.random() * 0.12 : 0);
          king.parts.root.rotation.x = -ashes * 0.45;
          king.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
          if (u.ashes) u.ashes.forEach((ash, i) => {
            const delay = 1.2 + (i % 7) * 0.12, age = Math.max(0, e - delay), angle = i * 2.399;
            ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.14), 0.12 + age * (0.62 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.14));
            ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.27) : 0;
            ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
          });
          if (e >= u.duration) {
            king.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
            if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
          }
        } else {
          king.parts.root.position.y = e < 1.2 ? Math.sin(Math.PI * clamp(e / 1.2)) * 1.1 : Math.max(0.03, 1.1 - (e - 1.2) * 1.7);
          if (e > 2.0) { king.parts.root.rotation.set(-Math.PI / 2, 0, 0); king.parts.root.scale.y = u.kingBase.scale.y * 0.52; king.parts.root.position.y = 0.03; }
        }
      }
      if (u.piece === 'B' && this.mateUltimate === u) {
        const hit = (e % 0.72) < 0.18;
        if (hit) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.06; }
      }
      return true;
    }

    /* ---------- Attaques de mat des thèmes ----------
       Déroulé commun (4,8 s) : la pièce qui mate lance sa technique (0 → 0,6 s), l'effet grandit
       autour du roi (0,6 → 3 s), impact à 3 s (le roi tombe, le plateau tremble), puis la fumée retombe.
       ocean : vague géante (Blancs) / tourbillon des abysses (Noirs)
       plants : racines géantes qui emprisonnent le roi / mâchoire de plante carnivore géante
       land : charge du troupeau dans la poussière / le sol se fend sous un coup de poing
       birds : un aigle géant pique du ciel / tornade de corbeaux
       ancient : pluie de flèches enflammées / rocher géant de trébuchet
       modern : frappe aérienne de missiles / rayon laser venu de l'orbite */
    makeThemeMate(u) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed;
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, o));
      const basic = (color, opacity = 0.85) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
      const at = (o, x = 0, y = 0, z = 0) => { o.position.set(P.x + x, y, P.z + z); g.add(o); return o; };
      const parts = u.mateParts = [];
      const keep = (o, data = {}) => { o.userData = Object.assign(o.userData || {}, data); parts.push(o); return o; };
      if (style === 'wave') {
        // un mur d'eau courbé qui arrive de derrière l'attaquant et s'abat sur le roi
        const dir = new T.Vector3(P.x - u.fromPos.x, 0, P.z - u.fromPos.z).normalize();
        const wave = new T.Group(); wave.position.set(P.x, 0, P.z); wave.rotation.y = Math.atan2(dir.x, dir.z); g.add(wave);
        // mur d'eau (axe x = largeur, avance vers +z) avec une crête d'écume qui s'enroule vers l'avant
        const tilt = new T.Group(); wave.add(tilt);
        const body = new T.Mesh(new T.BoxGeometry(3.4, 2.2, 0.45), basic(0x1e88e5, 0.78)); body.position.y = 1.1; tilt.add(body);
        const lip = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 3.4, 16, 1, false), basic(0x64b5f6, 0.85)); lip.rotation.z = Math.PI / 2; lip.position.set(0, 2.2, 0.25); tilt.add(lip);
        const foam = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 3.5, 12), basic(0xffffff, 0.95)); foam.rotation.z = Math.PI / 2; foam.position.set(0, 2.45, 0.5); tilt.add(foam);
        u.waveTilt = tilt;
        u.wave = keep(wave, { dir });
      } else if (style === 'whirlpool') {
        for (let i = 0; i < 4; i++) { const r = at(new T.Mesh(new T.TorusGeometry(0.4 + i * 0.35, 0.06, 6, 40), basic(i % 2 ? 0x1a237e : 0x4527a0, 0.8)), 0, 0.03 + i * 0.01, 0); r.rotation.x = -Math.PI / 2; keep(r, { spin: 4 - i }); }
        u.funnel = at(new T.Mesh(new T.ConeGeometry(1.4, 2.2, 28, 1, true), basic(0x283593, 0.45)), 0, 1.1, 0); u.funnel.rotation.x = Math.PI;
      } else if (style === 'roots') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, root = new T.Group(); at(root, Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
          const r = new T.Mesh(new T.ConeGeometry(0.09, 1.8, 7), std(0x6d4c41, { roughness: 0.9 })); r.position.y = 0.9; root.add(r);
          const flower = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), std(i % 2 ? 0xf06292 : 0xffeb3b)); flower.position.y = 1.8; root.add(flower);
          root.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); keep(root, { a });
        }
      } else if (style === 'jaws') {
        u.stem = at(new T.Mesh(new T.CylinderGeometry(0.16, 0.24, 1, 10), std(0x33691e)), 0, 0, 0);
        for (const s of [-1, 1]) {
          const jaw = new T.Group(); at(jaw, 0, 0, 0);
          const lobe = new T.Mesh(new T.SphereGeometry(0.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x7b1f2a, { side: T.DoubleSide })); lobe.scale.y = 0.55; if (s < 0) lobe.rotation.x = Math.PI; jaw.add(lobe);
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, th = new T.Mesh(new T.ConeGeometry(0.04, 0.22, 4), std(0xf1f8e9)); th.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82); if (s < 0) th.rotation.x = Math.PI; jaw.add(th); }
          keep(jaw, { side: s });
        }
      } else if (style === 'stampede') {
        const dir = new T.Vector3(P.x - u.fromPos.x, 0, P.z - u.fromPos.z).normalize();
        for (let i = 0; i < 9; i++) {
          const beast = new T.Group(); g.add(beast);
          const hide = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), std(i % 3 ? 0x8d6e63 : 0x5d4037)); hide.scale.set(0.8, 0.75, 1.3); beast.add(hide);
          const head = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), std(0x4e342e)); head.position.set(0, 0.12, 0.42); beast.add(head);
          for (const s of [-1, 1]) { const horn = new T.Mesh(new T.ConeGeometry(0.03, 0.18, 5), std(0xefebe9)); horn.position.set(s * 0.1, 0.25, 0.45); horn.rotation.z = -s * 0.8; beast.add(horn); }
          keep(beast, { dir, lane: (i % 3 - 1) * 0.55 + (Math.random() - 0.5) * 0.2, delay: Math.floor(i / 3) * 0.28 + Math.random() * 0.1 });
        }
        u.dust = at(new T.Mesh(new T.SphereGeometry(1.2, 14, 10), basic(0xc9a66b, 0.0)), 0, 0.5, 0);
      } else if (style === 'quake') {
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3, crack = at(new T.Mesh(new T.BoxGeometry(0.06, 0.02, 1.1 + Math.random() * 0.8), basic(0xff5722, 0.95)), Math.cos(a) * 0.7, 0.02, Math.sin(a) * 0.7); crack.rotation.y = -a + Math.PI / 2; keep(crack, { crack: true }); }
        for (let i = 0; i < 12; i++) { const rock = at(new T.Mesh(new T.DodecahedronGeometry(0.1 + Math.random() * 0.1, 0), std(0x6d6d6d, { flatShading: true })), 0, -1, 0); keep(rock, { rock: true, a: Math.random() * Math.PI * 2, sp: 1 + Math.random() * 1.5, up: 3 + Math.random() * 3 }); }
      } else if (style === 'eagle') {
        const eagle = new T.Group(); g.add(eagle);
        const body = new T.Mesh(new T.SphereGeometry(0.35, 12, 10), std(0x6d4c2f)); body.scale.set(0.8, 0.7, 1.4); eagle.add(body);
        const head = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), std(0xf5f5f5)); head.position.set(0, 0.12, 0.5); eagle.add(head);
        const beak = new T.Mesh(new T.ConeGeometry(0.07, 0.2, 6), std(0xffc107)); beak.rotation.x = Math.PI / 2 + 0.6; beak.position.set(0, 0.06, 0.7); head.parent.add(beak);
        u.wings = [];
        for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.2, 0.05, 0); const m = new T.Mesh(new T.BoxGeometry(1.5, 0.04, 0.5), std(0x5d4037)); m.position.x = s * 0.75; w.add(m); eagle.add(w); u.wings.push(w); }
        u.eagle = keep(eagle);
      } else if (style === 'crows') {
        for (let i = 0; i < 26; i++) {
          const crow = new T.Group(); g.add(crow);
          crow.add(new T.Mesh(new T.SphereGeometry(0.09, 8, 6), std(0x111114)));
          for (const s of [-1, 1]) { const w = new T.Mesh(new T.BoxGeometry(0.24, 0.015, 0.09), std(0x1b1b20)); w.position.x = s * 0.13; crow.add(w); }
          keep(crow, { a: Math.random() * Math.PI * 2, h: Math.random(), r: 0.5 + Math.random() * 0.6, sp: 4 + Math.random() * 3 });
        }
        u.funnel = at(new T.Mesh(new T.ConeGeometry(1.2, 3, 24, 1, true), basic(0x37474f, 0.3)), 0, 1.5, 0); u.funnel.rotation.x = Math.PI;
      } else if (style === 'firearrows') {
        for (let i = 0; i < 24; i++) {
          const arrow = new T.Group(); g.add(arrow);
          const sh = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.55, 5), std(0x6d4c41)); arrow.add(sh);
          const fl = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: 0xff8f00, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); fl.position.y = -0.28; arrow.add(fl);
          keep(arrow, { x: (Math.random() - 0.5) * 1.6, z: (Math.random() - 0.5) * 1.6, delay: 0.6 + Math.random() * 1.9 });
        }
      } else if (style === 'boulder') {
        u.rock = at(new T.Mesh(new T.DodecahedronGeometry(1.0, 1), std(0x7d756c, { flatShading: true, roughness: 0.95 })), 0, 12, 0);
        u.shadowDisk = at(new T.Mesh(new T.CircleGeometry(1.1, 24), basic(0x000000, 0)), 0, 0.03, 0); u.shadowDisk.rotation.x = -Math.PI / 2;
      } else if (style === 'airstrike') {
        u.jets = [];
        for (const s of [-1, 1]) { const jet = new T.Group(); const b = new T.Mesh(new T.ConeGeometry(0.15, 1, 8), std(0x9e9e9e, { metalness: 0.5 })); b.rotation.x = Math.PI / 2; jet.add(b); const w = new T.Mesh(new T.BoxGeometry(1.1, 0.03, 0.35), std(0x757575)); jet.add(w); g.add(jet); u.jets.push(keep(jet, { s })); }
        for (let i = 0; i < 6; i++) { const m = new T.Group(); const c = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.4, 6), std(0xeceff1)); m.add(c); const f = new T.Mesh(new T.SphereGeometry(0.06, 6, 4), new T.MeshBasicMaterial({ color: 0xff9100 })); f.position.y = 0.22; m.add(f); g.add(m); keep(m, { missile: true, x: (Math.random() - 0.5) * 1.2, z: (Math.random() - 0.5) * 1.2, delay: 1.5 + i * 0.18 }); }
      } else if (style === 'constellation') {
        // Sorën trace une constellation au-dessus du roi noir ; les étoiles se relient puis s'abattent sur lui
        const pts = [[-1.7, 4.8], [-0.9, 5.6], [-0.1, 4.9], [0.7, 5.8], [1.6, 5], [0.5, 4.1], [-0.6, 4]];
        const starMat = () => new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
        u.stars = pts.map(([x, y], i) => { const s = at(new T.Mesh(new T.OctahedronGeometry(0.3, 0), starMat()), x, y, 0); s.add(new T.Mesh(new T.SphereGeometry(0.34, 10, 8), this.glow(0x4cc3ff, 0.4))); s.userData.delay = 0.3 + i * 0.22; return s; });
        u.links = pts.map(([x, y], i) => {
          const [x2, y2] = pts[(i + 1) % pts.length], len = Math.hypot(x2 - x, y2 - y);
          const l = at(new T.Mesh(new T.CylinderGeometry(0.04, 0.04, len, 6), new T.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0, depthWrite: false })), (x + x2) / 2, (y + y2) / 2, 0);
          l.rotation.z = Math.atan2(x - x2, y2 - y); l.userData.delay = 0.5 + i * 0.22; return l;
        });
        for (let i = 0; i < 26; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.05, 0.02, 1.1, 6), new T.MeshBasicMaterial({ color: i % 3 ? 0x7fd8ff : 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })); g.add(s); keep(s, { x: (Math.random() - 0.5) * 3.4, z: (Math.random() - 0.5) * 1.6, tx: (Math.random() - 0.5) * 1.1, tz: (Math.random() - 0.5) * 1.1, delay: 2.2 + Math.random() * 0.8 }); }
      } else if (style === 'nova') {
        // Mélyx concentre la lumière de ses miroirs en une boule rouge gigantesque qui s'abat sur le camp blanc :
        // toutes les pièces blanches volent en éclats, et un énorme cratère reste là où elle est tombée
        const src = this.sqToPos(u.attackerTo);
        u.novaFrom = new T.Vector3(src.x, 3, src.z);
        for (const s of [-1, 1]) {
          const mirror = new T.Mesh(new T.CircleGeometry(0.42, 24), std(0xdfe8ff, { metalness: 0.9, roughness: 0.08, side: T.DoubleSide })); mirror.position.set(src.x + s * 1.7, 1.5, src.z); g.add(mirror);
          const ray = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.3, 6), basic(0xff3d6e, 0.9)); ray.position.set(src.x + s * 0.85, 2.25, src.z); ray.rotation.z = s * Math.atan2(1.7, 1.5); g.add(ray);
          (u.novaRays = u.novaRays || []).push(mirror, ray);
        }
        u.nova = new T.Mesh(new T.SphereGeometry(1, 28, 18), new T.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.95, fog: false })); g.add(u.nova);
        u.novaCore = new T.Mesh(new T.SphereGeometry(0.72, 20, 14), new T.MeshBasicMaterial({ color: 0xffb060, fog: false })); u.nova.add(u.novaCore);
        u.novaHalo = new T.Mesh(new T.SphereGeometry(1.25, 24, 16), new T.MeshBasicMaterial({ color: 0xff3d6e, transparent: true, opacity: 0.35, depthWrite: false, side: T.BackSide, fog: false })); u.nova.add(u.novaHalo);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = new T.Mesh(new T.OctahedronGeometry(0.1, 0), new T.MeshBasicMaterial({ color: 0xc04bff })); g.add(s); keep(s, { shard: true, a, r: 2.2 + (i % 3) * 0.6 }); }
        // point de chute : le centre du camp blanc (là où se trouvent ses pièces), le roi blanc compris
        const whites = [...this.chars.values()].filter((c) => c.piece === c.piece.toUpperCase());
        const L = whites.reduce((s, c) => s.add(c.holder.position), new T.Vector3()).multiplyScalar(1 / Math.max(1, whites.length));
        u.novaLand = new T.Vector3((L.x + P.x) / 2, 0, (L.z + P.z) / 2);
        const crater = new T.Group(); crater.position.set(u.novaLand.x, 0, u.novaLand.z); crater.visible = false; g.add(crater); u.novaCrater = crater;
        const hole = new T.Mesh(new T.CircleGeometry(2.7, 48), new T.MeshBasicMaterial({ color: 0x07030a })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.04; crater.add(hole);
        const depth = new T.Mesh(new T.CircleGeometry(1.9, 40), new T.MeshBasicMaterial({ color: 0x2a0710 })); depth.rotation.x = -Math.PI / 2; depth.position.y = 0.045; crater.add(depth);
        const lava = new T.Mesh(new T.TorusGeometry(2.25, 0.07, 6, 56), new T.MeshBasicMaterial({ color: 0xff3d3d })); lava.rotation.x = Math.PI / 2; lava.position.y = 0.06; crater.add(lava); u.novaLava = lava;
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, r = 2.7 + (i % 3) * 0.12, rock = new T.Mesh(new T.DodecahedronGeometry(0.16 + (i % 4) * 0.06, 0), std(0x3a2a33, { flatShading: true, roughness: 1 })); rock.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); rock.scale.y = 0.6; crater.add(rock); }
        u.novaBits = [];
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3, crack = at(new T.Mesh(new T.BoxGeometry(0.06, 0.02, 1.4 + Math.random() * 1.4), basic(0xff3d6e, 0.95)), Math.cos(a) * 1, 0.02, Math.sin(a) * 1); crack.rotation.y = -a + Math.PI / 2; keep(crack, { crack: true }); }
      } else if (Object.values(AURA_MATE).includes(style) && style !== 'constellation' && style !== 'nova') {
        this.makeAuraMate(u, at, keep, basic, std);
      } else if (SABRE_STYLES.has(style)) {
        this.makeSabreMate(u, at, keep, basic, std);
      } else if (KIT_STYLES.has(style)) {
        this.makeKitMate(u, at, keep, basic, std);
      } else if (style === 'orbital') {
        u.target3 = at(new T.Mesh(new T.RingGeometry(0.5, 0.62, 32), basic(0xff1744, 0.9)), 0, 0.04, 0); u.target3.rotation.x = -Math.PI / 2;
        u.beam = at(new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 30, 20, 1, true), new T.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })), 0, 15, 0);
        u.beamCore = at(new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 30, 12), new T.MeshBasicMaterial({ color: 0xffffff })), 0, 15, 0);
        u.beam.visible = u.beamCore.visible = false;
      }
      // éclair d'impact commun
      u.flash = at(new T.Mesh(new T.SphereGeometry(1, 18, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })), 0, 0.6, 0);
      const fireStyles = ['firearrows', 'airstrike', 'orbital', 'quake', 'nova'];
      u.flash.material.color.setHex(fireStyles.includes(style) ? 0xffa726 : style === 'wave' || style === 'whirlpool' || style === 'constellation' ? 0xb3e5fc : style === 'roots' || style === 'jaws' ? 0xc5e1a5 : 0xfff3e0);
      // Mise en scène commune, aussi riche que les mats ninjas : l'attaquant se charge dans une colonne de lumière
      // aux couleurs du thème, le ciel s'assombrit, puis l'impact projette une onde au sol, des éclats et une lumière,
      // et laisse une trace sur la case du roi.
      const tint = THEME_MATE_COLORS[style] || [0xffffff, 0x888888];
      u.tint = tint;
      if ((Object.values(AURA_MATE).includes(style) && style !== 'constellation') || SABRE_STYLES.has(style) || KIT_STYLES.has(style)) u.flash.material.color.setHex(tint[0]);
      const A = this.sqToPos(u.attackerTo);
      u.pillar = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 6, 24, 1, true), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      u.pillar.position.set(A.x, 3, A.z); g.add(u.pillar);
      u.aura = new T.Mesh(new T.RingGeometry(0.35, 0.6, 40), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      u.aura.rotation.x = -Math.PI / 2; u.aura.position.set(A.x, 0.03, A.z); g.add(u.aura);
      u.shock = at(new T.Mesh(new T.RingGeometry(0.5, 0.75, 48), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })), 0, 0.04, 0);
      u.shock.rotation.x = -Math.PI / 2;
      u.scar = at(new T.Mesh(new T.CircleGeometry(0.62, 28), new T.MeshBasicMaterial({ color: tint[1], transparent: true, opacity: 0, depthWrite: false })), 0, 0.025, 0);
      u.scar.rotation.x = -Math.PI / 2;
      u.shards = [];
      for (let i = 0; i < 26; i++) {
        const m = at(new T.Mesh(new T.TetrahedronGeometry(0.05 + Math.random() * 0.06, 0), new T.MeshBasicMaterial({ color: i % 3 ? tint[0] : tint[1], transparent: true, opacity: 0.95 })), 0, 0.4, 0);
        const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
        m.userData.v = { x: Math.cos(a) * sp, y: 2.5 + Math.random() * 3.5, z: Math.sin(a) * sp }; m.visible = false; u.shards.push(m);
      }
      u.light = new T.PointLight(tint[0], 0, 9); u.light.position.set(P.x, 1.6, P.z); g.add(u.light);
    }
    tickThemeMate(c, t, M, u) {
      const T = this.THREE, e = t - u.start, P = u.target, style = u.themed;
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const hit = u.hitAt || 3.0, after = e - hit;
      if (SABRE_STYLES.has(style)) return this.tickSabreMate(c, t, M, u, hit);
      if (c === u.actor) {
        c.anim = null; c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
        M.animate(c.parts, t, e < hit ? 'cast' : 'victory', e < hit ? clamp(e / 0.6) : 1);
        if (style === 'orage') this.kitDance(u, c, e, smooth);
        if (style === 'lions') { u.kitM = M; this.kitCharge(u, c, t, e, smooth, hit, M); }
        if (style === 'pietine') this.kitStomp(u, c, t, e, smooth, hit, M);
        // une seule fois par image : l'effet est animé avec l'attaquant
        this.tickThemeMateFx(u, t, e, clamp, smooth, hit, after);
        return true;
      }
      if (c === u.king) {
        c.anim = null; c.holder.position.set(P.x, 0, P.z);
        const root = c.parts.root;
        if (e < hit) { M.animate(c.parts, t, 'panic', 1); if (style === 'pietine') this.kitStompKing(u, c, e, hit); return true; }
        M.animate(c.parts, t, 'ko', 1);
        // le roi est emporté, englouti ou renversé selon l'attaque
        if (style === 'eagle') { root.position.y = Math.min(6, after * after * 2.5); c.holder.visible = after < 1.6; }
        else if (style === 'whirlpool') { root.position.y = -smooth(after / 1.2) * 0.9; root.rotation.y = after * 8; c.holder.visible = after < 1.3; }
        else if (style === 'crows') { root.position.y = Math.min(4, after * 2.2); root.rotation.y = after * 10; c.holder.visible = after < 1.5; }
        else if (style === 'jaws') { c.holder.visible = after < 0.15; }
        else if (style === 'nova') { c.holder.visible = after < 0.05; } // le roi blanc disparaît dans l'explosion
        else if (style === 'boulder' || style === 'crystalcomet' || style === 'nilocomet') { root.scale.y = u.kingBase.scale.y * Math.max(0.2, 1 - after * 4); }
        else if (style === 'ancetres') { const L = u.kitMate.pull; if (L) c.holder.position.copy(L); c.holder.visible = after < 1.9; } // emporté vers le soleil couchant
        else if (style === 'meteores') { root.scale.y = u.kingBase.scale.y * Math.max(0.15, 1 - after * 4); }
        else if (style === 'couleelave') { root.position.y = -Math.min(0.7, after * 0.9); c.holder.visible = after < 0.9; } // englouti par la lave
        else if (style === 'lions') { root.rotation.z = Math.PI / 2 * smooth(after / 0.4); root.position.y = 0.05; const k = smooth((after - 0.9) / 0.5); root.scale.copy(u.kingBase.scale).multiplyScalar(Math.max(0.02, 1 - k)); c.holder.visible = after < 1.4; } // renversé, puis dévoré par la meute
        else if (style === 'pietine') { this.kitStompKing(u, c, e, hit); c.parts.root.position.y = -smooth(after / 0.4) * 0.5; c.holder.visible = after < 0.45; } // écrasé, puis enfoncé dans le sol
        else if (style === 'orage') { const k = smooth((after - 0.15) / 1.1); root.scale.set(u.kingBase.scale.x * (1 - k * 0.96), u.kingBase.scale.y * Math.max(0.02, 1 - k), u.kingBase.scale.z * (1 - k * 0.96)); c.holder.visible = after < 1.25; } // foudroyé, réduit en cendres
        else if (style === 'harmattan') { root.position.y = Math.min(3, after * 1.8); root.rotation.y = after * 11; c.holder.visible = after < 0.9; } // happé par le tourbillon
        else if (style === 'cloudbreath') { root.position.y = Math.min(4, after * 2.6); root.rotation.y = after * 9; c.holder.visible = after < 1.6; } // soulevé par le vent
        else if (style === 'eruption' || style === 'fortress' || style === 'shadeswarm') { c.holder.visible = after < 0.25; } // englouti
        else { root.rotation.z = Math.PI / 2 * smooth(after / 0.4); root.position.y = 0.05; } // tombe sur le côté
        return true;
      }
      return false;
    }
    tickThemeMateFx(u, t, e, clamp, smooth, hit, after) {
      const P = u.target, style = u.themed, grow = smooth((e - 0.6) / 2.2);
      if (e >= hit && !u.hitDone) { u.hitDone = true; this.shakeUntil = t + 0.8; this.shakeAmp = 0.16; }
      if (u.flash) { const f = after > 0 ? Math.max(0, 1 - after / 0.7) : 0; u.flash.material.opacity = f * 0.85; u.flash.scale.setScalar(0.4 + (1 - f) * 2.4); }
      if (u.pillar) {
        // charge de l'attaquant : colonne et anneau de lumière qui pulsent, puis s'éteignent à l'impact
        const charge = smooth(e / 0.8) * (after > 0 ? Math.max(0, 1 - after / 0.5) : 1);
        u.pillar.material.opacity = charge * (0.28 + Math.sin(t * 9) * 0.08); u.pillar.scale.set(1 + Math.sin(t * 6) * 0.05, smooth(e / 0.8), 1 + Math.sin(t * 6) * 0.05); u.pillar.rotation.y = t * 1.5;
        u.aura.material.opacity = charge * 0.8; u.aura.scale.setScalar(1 + Math.sin(t * 7) * 0.12);
        // le ciel s'assombrit pendant l'attaque et revient doucement après
        this.skyDim = Math.min(0.55, grow * 0.55) * (after > 0 ? Math.max(0, 1 - after / 1.5) : 1);
        // impact : onde au sol, éclats, lumière, et trace qui reste sur la case
        const k = after > 0 ? after : -1;
        u.shock.material.opacity = k >= 0 ? Math.max(0, 0.9 - k * 1.1) : 0; u.shock.scale.setScalar(k >= 0 ? 1 + k * 6 : 1);
        u.scar.material.opacity = k >= 0 ? Math.min(0.55, k * 2) : 0;
        u.light.intensity = k >= 0 ? Math.max(0, 6 - k * 7) : grow * 0.6;
        for (const m of u.shards) {
          m.visible = k >= 0 && k < 1.6;
          if (!m.visible) continue;
          const v = m.userData.v;
          m.position.set(P.x + v.x * k, Math.max(0.05, 0.4 + v.y * k - 4.9 * k * k), P.z + v.z * k);
          m.rotation.set(k * 9, k * 7, 0);
        }
      }
      if (style === 'wave') {
        // la vague grossit en arrivant de loin, puis s'écrase
        const k = smooth((e - 0.4) / 2.6), w = u.wave, d = w.userData.dir;
        w.position.set(P.x - d.x * (1 - k) * 5, after > 0 ? -after * 1.2 : 0, P.z - d.z * (1 - k) * 5);
        w.scale.set(0.5 + k * 0.6, 0.2 + k * 1.0, 1);
        u.waveTilt.rotation.x = after > 0 ? Math.min(1.4, after * 3) : 0; // elle s'abat vers l'avant
        w.visible = after < 1.2;
      } else if (style === 'whirlpool') {
        for (const r of u.mateParts) { r.rotation.z = t * r.userData.spin; r.scale.setScalar(0.2 + grow); r.visible = after < 1.8; }
        u.funnel.scale.set(grow, grow, grow); u.funnel.rotation.y = t * 5; u.funnel.visible = after < 1.6;
      } else if (style === 'roots') {
        for (const r of u.mateParts) { r.scale.set(1, Math.max(0.01, grow), 1); const a = r.userData.a, close = smooth((e - 2.2) / 0.8); r.rotation.set(Math.sin(a) * (0.35 - close * 0.6), 0, -Math.cos(a) * (0.35 - close * 0.6)); }
      } else if (style === 'jaws') {
        const rise = smooth((e - 0.6) / 1.4), close = smooth((e - 2.4) / 0.6);
        u.stem.scale.set(1, Math.max(0.01, rise * 1.2), 1); u.stem.position.y = rise * 0.6;
        for (const j of u.mateParts) { j.position.set(P.x, 0.4 + rise * 1.4 - (after > 0 ? Math.min(1.6, after * 2) : 0), P.z); j.rotation.x = j.userData.side * (1.1 - close * 1.1); }
        u.stem.visible = after < 0.9;
      } else if (style === 'stampede') {
        for (const b of u.mateParts) {
          const d = b.userData.dir, k = clamp((e - 0.8 - b.userData.delay) / 2.2), side = new this.THREE.Vector3(-d.z, 0, d.x);
          b.visible = k > 0 && k < 1;
          b.position.set(P.x + d.x * (k - 0.5) * 9 + side.x * b.userData.lane, Math.abs(Math.sin(t * 14 + b.userData.lane * 5)) * 0.12, P.z + d.z * (k - 0.5) * 9 + side.z * b.userData.lane);
          b.rotation.y = Math.atan2(d.x, d.z);
        }
        u.dust.material.opacity = smooth((e - 1.6) / 1) * 0.55 * (after > 0 ? Math.max(0, 1 - after / 1.6) : 1); u.dust.scale.setScalar(1 + grow * 0.8);
      } else if (style === 'quake') {
        for (const p of u.mateParts) {
          if (p.userData.crack) { p.scale.z = Math.max(0.01, smooth(after / 0.4)); p.visible = after > 0; }
          else if (p.userData.rock) { const a = after; p.visible = a > 0 && a < 1.6; const d = p.userData; p.position.set(P.x + Math.cos(d.a) * d.sp * a, Math.max(0, d.up * a - 4.9 * a * a), P.z + Math.sin(d.a) * d.sp * a); p.rotation.set(a * 6, a * 4, 0); }
        }
        if (e > 1.2 && e < hit && (e % 0.6) < 0.1) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.05; } // le gorille martèle sa poitrine
      } else if (style === 'eagle') {
        // l'aigle descend en spirale du ciel, plonge sur le roi et l'emporte
        const k = smooth((e - 0.4) / 2.6), a = (1 - k) * 4;
        const ey = after > 0 ? 0.9 + Math.min(6, after * after * 2.5) : 9 - k * 8.1;
        u.eagle.position.set(P.x + Math.cos(a) * (1 - k) * 4, ey, P.z + Math.sin(a) * (1 - k) * 4);
        u.eagle.rotation.set(after > 0 ? -0.5 : 0.6 * k, -a + Math.PI / 2, 0);
        u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * (after > 0 ? 14 : 6)) * 0.5; });
        u.eagle.visible = after < 1.6;
      } else if (style === 'crows') {
        for (const b of u.mateParts) { const d = b.userData, a = d.a + t * d.sp, r = d.r * (0.6 + grow * 0.8); b.position.set(P.x + Math.cos(a) * r, 0.2 + d.h * 2.6 * (0.3 + grow) + (after > 0 ? after * 2.2 : 0), P.z + Math.sin(a) * r); b.rotation.y = -a; b.children[1].rotation.z = Math.sin(t * 30 + d.a) * 0.6; b.children[2].rotation.z = -Math.sin(t * 30 + d.a) * 0.6; b.visible = e > 0.6 && after < 1.6; }
        u.funnel.scale.set(grow, grow, grow); u.funnel.rotation.y = t * 6; u.funnel.visible = after < 1.4;
      } else if (style === 'firearrows') {
        for (const a of u.mateParts) { const d = a.userData, k = clamp((e - d.delay) / 0.45); a.visible = k > 0 && (k < 1 || e < hit + 1.2); const y = k < 1 ? 7 * (1 - k) : 0.2; a.position.set(P.x + d.x * (k < 1 ? 1.4 - k * 0.4 : 1), y, P.z + d.z * (k < 1 ? 1.4 - k * 0.4 : 1)); a.rotation.set(0.25, 0, 0.1); }
      } else if (style === 'boulder') {
        const k = clamp((e - 0.9) / 2.1);
        u.rock.position.y = after > 0 ? 0.7 - Math.min(0.4, after * 0.6) : 12 - 11.3 * k * k; u.rock.rotation.set(t * 2, t * 1.5, 0);
        u.shadowDisk.material.opacity = k * 0.55; u.shadowDisk.scale.setScalar(0.3 + k * 0.7);
      } else if (style === 'airstrike') {
        for (const j of u.jets) { const k = clamp((e - 0.5) / 1.6), s = j.userData.s; j.visible = k > 0 && k < 1; j.position.set(P.x + s * 0.8, 5, P.z + (k - 0.5) * 22); j.rotation.set(0, 0, s * 0.2); }
        for (const m of u.mateParts) if (m.userData.missile) { const d = m.userData, k = clamp((e - d.delay) / (hit - d.delay)); m.visible = k > 0 && k < 1; m.position.set(P.x + d.x * (1 - k * 0.6), 5 - k * 4.8, P.z + d.z * (1 - k * 0.6)); m.rotation.set(Math.PI, 0, 0); }
      } else if (style === 'constellation') {
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.2) * 0.85 * (after > 0 ? Math.max(0, 1 - after / 1.5) : 1));
        for (const s of u.stars) { s.material.opacity = smooth((e - s.userData.delay) / 0.3) * (after > 0 ? Math.max(0, 1 - after) : 1); s.rotation.y = t * 2; s.children[0].material.opacity = s.material.opacity * 0.4; }
        for (const l of u.links) l.material.opacity = smooth((e - l.userData.delay) / 0.3) * 0.8 * (after > 0 ? Math.max(0, 1 - after) : 1);
        for (const s of u.mateParts) { const d = s.userData, k = clamp((e - d.delay) / 0.5); s.visible = k > 0 && k < 1; s.position.set(P.x + d.x + (d.tx - d.x) * k, 4.9 - k * 4.8, P.z + d.z + (d.tz - d.z) * k); s.rotation.set(0, 0, Math.atan2(d.tx - d.x, 4.8)); }
      } else if (style === 'nova') {
        // la boule grossit au-dessus de Mélyx jusqu'à couvrir le ciel, puis s'abat sur le camp blanc
        const size = 0.12 + smooth((e - 0.4) / 2) * 3.4, down = smooth((e - 2.1) / 0.9), burst = after > 0 ? smooth(after / 0.6) : 0, Ld = u.novaLand;
        u.nova.position.set(u.novaFrom.x + (Ld.x - u.novaFrom.x) * down, 3 + size * 0.8 - down * (2.5 + size * 0.8), u.novaFrom.z + (Ld.z - u.novaFrom.z) * down);
        u.nova.scale.setScalar(size * (1 + burst * 0.9));
        u.nova.material.opacity = 0.95 * (1 - burst); u.novaCore.material.transparent = true; u.novaCore.material.opacity = 1 - burst; u.novaHalo.material.opacity = 0.35 * (1 - burst);
        u.nova.visible = after < 0.6;
        if (after > 0 && !u.novaHit) { // impact : le camp blanc vole en éclats
          u.novaHit = true; this.shakeUntil = t + 1.4; this.shakeAmp = 0.32;
          const T3 = this.THREE;
          u.hiddenEnemies = u.hiddenEnemies || [];
          for (const c of this.chars.values()) {
            if (c.piece !== c.piece.toUpperCase() || c === u.king) continue;
            u.hiddenEnemies.push([c, c.holder.visible]); c.holder.visible = false;
            for (let i = 0; i < 7; i++) {
              const bit = new T3.Mesh(new T3.TetrahedronGeometry(0.06 + Math.random() * 0.06, 0), new T3.MeshBasicMaterial({ color: i % 3 ? 0xdfe8f5 : 0x2f7fe0 }));
              const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
              bit.position.set(c.holder.position.x, 0.4, c.holder.position.z); bit.userData = { x: bit.position.x, z: bit.position.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3 + Math.random() * 4 };
              u.fx.add(bit); u.novaBits.push(bit);
            }
          }
        }
        for (const bit of u.novaBits) { const k = after, d = bit.userData; bit.visible = k < 1.6; bit.position.set(d.x + d.vx * k, Math.max(0.05, 0.4 + d.vy * k - 4.9 * k * k), d.z + d.vz * k); bit.rotation.set(k * 9, k * 7, 0); }
        u.novaCrater.visible = after > 0.15; u.novaCrater.scale.setScalar(Math.min(1, 0.4 + after * 1.6)); // le trou reste jusqu'à la partie suivante
        u.novaLava.material.color.setHSL(0.99, 1, 0.45 + Math.sin(t * 4) * 0.1);
        for (const m of u.novaRays) m.visible = e > 0.4 && e < 2.2;
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 2.4) * 0.8 * (after > 0 ? Math.max(0, 1 - after / 1.5) : 1)); // le plateau s'éteint
        for (const p of u.mateParts) {
          if (p.userData.crack) { p.scale.z = Math.max(0.01, smooth(after / 0.4)); p.visible = after > 0; continue; }
          const d = p.userData, k = smooth(e / 1.6), a = d.a + t * 2;
          p.visible = e < 1.7; p.position.set(u.novaFrom.x + Math.cos(a) * d.r * (1 - k), 3 + Math.sin(a * 2) * 0.5 * (1 - k), u.novaFrom.z + Math.sin(a) * d.r * (1 - k));
        }
      } else if (Object.values(AURA_MATE).includes(style) && style !== 'constellation' && style !== 'nova') {
        this.tickAuraMate(u, t, e, clamp, smooth, hit, after);
      } else if (SABRE_STYLES.has(style)) {
        this.tickSabreMateFx(u, t, e, clamp, smooth, hit, after);
      } else if (KIT_STYLES.has(style)) {
        this.tickKitMate(u, t, e, clamp, smooth, hit, after);
      } else if (style === 'orbital') {
        const lock = smooth((e - 0.4) / 1.2);
        u.target3.scale.setScalar(2.5 - lock * 1.5); u.target3.rotation.z = t * 3; u.target3.visible = after < 0.6;
        const on = e > 2.6 && after < 1.2, wide = on ? (e < hit ? smooth((e - 2.6) / 0.4) * 0.4 : 1 + Math.sin(t * 40) * 0.1) : 0;
        u.beam.visible = u.beamCore.visible = on; u.beam.scale.set(wide, 1, wide); u.beamCore.scale.set(wide, 1, wide);
      }
    }

    // Remplace les matériaux d'un personnage par des copies teintées (rendues par resetMateUltimate)
    tintCharacter(u, c, color, amount) {
      if (!u.swaps) u.swaps = [];
      const T = this.THREE, list = [];
      c.parts.root.traverse((o) => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color || o.material.blending === T.AdditiveBlending) return;
        u.swaps.push([o, o.material]);
        o.material = o.material.clone(); o.material.userData.baseColor = o.material.color.clone(); list.push(o.material);
        if (amount) o.material.color.lerp(new T.Color(color), amount);
      });
      return list;
    }
    untint(u, c) {
      if (!u.swaps) return;
      u.swaps = u.swaps.filter(([o, m]) => {
        let mine = false; c.parts.root.traverse((x) => { if (x === o) mine = true; });
        if (!mine) return true;
        o.material.dispose(); o.material = m; return false;
      });
    }
    // Tour blanche : tornade de feu blanc, avance jusqu'au roi, l'aspire et le réduit en cendres en tournant
    tickFireTornado(u, c, e, t, M, clamp, smooth) {
      const target = u.target, from = u.fromPos, actor = u.actor, king = u.king;
      const travelStart = 0.7, arrive = 2.4, end = u.duration;
      if (c === actor) {
        c.anim = null; c.holder.position.set(from.x, 0, from.z);
        c.holder.rotation.y = Math.atan2(target.x - from.x, target.z - from.z);
        // la tour tourne sur elle-même de plus en plus vite et disparaît dans la tornade, puis revient à la fin
        const back = e > end - 0.6;
        c.parts.root.visible = e < 0.6 || back;
        if (e < 0.6) { M.animate(c.parts, t, 'cast', 1); c.parts.root.rotation.set(0, e * e * 40, 0); }
        else if (back) { M.animate(c.parts, t, 'idle', 1); c.parts.root.rotation.set(0, 0, 0); }
        const grow = smooth(e / 0.7) * (1 - smooth((e - (end - 1.0)) / 0.6));
        const go = smooth((e - travelStart) / (arrive - travelStart));
        const tw = u.tornado;
        tw.visible = grow > 0.01;
        tw.position.set(from.x + (target.x - from.x) * go + Math.sin(t * 5) * 0.06, 0, from.z + (target.z - from.z) * go + Math.cos(t * 4) * 0.06);
        tw.scale.set(Math.max(0.01, grow), Math.max(0.01, grow), Math.max(0.01, grow));
        tw.rotation.y = t * 11;
        tw.children.forEach((ring) => { if (ring.userData.layer !== undefined) ring.rotation.y = t * (2 + ring.userData.layer * 0.4); });
        u.tornadoFlames.forEach((fl) => { fl.scale.y = 0.7 + Math.abs(Math.sin(t * 15 + fl.userData.phase)) * 0.6; });
        u.tornadoCore.material.opacity = 0.22 + Math.abs(Math.sin(t * 9)) * 0.12;
        const fade = 1 - clamp((e - (end - 0.8)) / 0.8);
        u.trail.forEach((g) => {
          g.visible = e > travelStart && g.userData.f <= go + 0.02 && fade > 0;
          g.children.forEach((fl) => {
            if (fl.userData.phase === undefined) { fl.material.opacity = 0.5 * fade; return; }
            fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade; fl.material.opacity = 0.85 * fade;
          });
        });
        u.fireLight.position.set(tw.position.x, 1.2, tw.position.z);
        u.fireLight.intensity = grow * (4 + Math.random() * 1.5);
        if (e > arrive && e < arrive + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.08; }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        if (e < arrive) { M.animate(c.parts, t, 'guard', 1); return true; }
        M.animate(c.parts, t, 'ko', 1);
        // aspiré dans la tornade : il monte, tourne et blanchit en brûlant, puis tombe en cendres
        if (!u.kingTint) u.kingTint = this.tintCharacter(u, c, 0xffffff, 0);
        const lift = smooth((e - arrive) / 0.8), burn = smooth((e - arrive - 0.9) / 1.6);
        const white = new this.THREE.Color(0xf4f4f4), w = smooth((e - arrive) / 1.4);
        u.kingTint.forEach((m) => m.color.copy(m.userData.baseColor).lerp(white, w));
        c.parts.root.position.set(Math.sin(t * 9) * 0.12 * lift, lift * 1.1 + Math.sin(t * 6) * 0.08, Math.cos(t * 9) * 0.12 * lift);
        c.parts.root.rotation.set(Math.sin(t * 7) * 0.4 * lift, (e - arrive) * (6 + (e - arrive) * 6), 0);
        const s = Math.max(0.005, 1 - burn);
        c.parts.root.scale.set(u.kingBase.scale.x * s, u.kingBase.scale.y * s, u.kingBase.scale.z * s);
        u.ashes.forEach((ash, i) => {
          const age = Math.max(0, e - (arrive + 1.0 + (i % 9) * 0.12)), a = i * 2.399 + age * 6, r = 0.25 + age * 0.25;
          ash.position.set(target.x + Math.cos(a) * r, 0.4 + age * (0.9 + (i % 3) * 0.2), target.z + Math.sin(a) * r);
          ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.35) : 0;
          ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1, age * 0.4) : 0.001);
        });
        if (burn >= 1) c.holder.visible = false;
      }
      return true;
    }
    // Tour noire : golem de feu noir, écrase le roi de ses deux poings, bondit dans le ciel et retombe en boule de feu noire
    tickFireGolem(u, c, e, t, M, clamp, smooth) {
      const T = this.THREE, target = u.target, from = u.fromPos, actor = u.actor, king = u.king;
      const dx = target.x - from.x, dz = target.z - from.z, len = Math.hypot(dx, dz) || 1;
      const stand = { x: target.x - dx / len * 0.75, z: target.z - dz / len * 0.75 };
      const runStart = 0.9, runEnd = 1.9, slam = 2.4, leap = 2.8, apex = 3.6, impact = 4.3, reform = 4.9;
      if (c === actor) {
        c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
        const grow = smooth(e / 0.8);
        if (!u.golemTint) u.golemTint = this.tintCharacter(u, c, 0x120a0e, 0);
        const coal = new T.Color(0x140a10);
        if (e < reform) u.golemTint.forEach((m) => m.color.copy(m.userData.baseColor).lerp(coal, 0.85 * grow));
        else if (u.golemTint.length) { this.untint(u, c); u.golemTint = []; }
        const big = e < reform ? 1 + 0.9 * grow : 1;
        c.parts.root.scale.copy(u.actorBase.scale).multiplyScalar(big);
        c.parts.root.visible = e < leap + 0.35 || e >= reform;
        let pos = { x: from.x, y: 0, z: from.z };
        if (e < runStart) M.animate(c.parts, t, 'guard', 1);
        else if (e < runEnd) {
          M.animate(c.parts, t, 'run');
          const p = smooth((e - runStart) / (runEnd - runStart));
          pos = { x: from.x + (stand.x - from.x) * p, y: Math.abs(Math.sin(p * Math.PI * 3)) * 0.12, z: from.z + (stand.z - from.z) * p };
        } else if (e < leap) {
          M.animate(c.parts, t, 'guard', 1);
          pos = { x: stand.x, y: 0, z: stand.z };
          // les deux mains liées se lèvent au-dessus de la tête puis s'abattent sur le roi
          const raise = smooth((e - runEnd) / (slam - 0.15 - runEnd)), down = smooth((e - (slam - 0.15)) / 0.15);
          const ax = -0.4 - raise * 2.6 + down * 2.4;
          c.parts.armL.rotation.set(ax, 0, -0.25); c.parts.armR.rotation.set(ax, 0, 0.25);
          c.parts.torso.rotation.x = -0.2 * raise + 0.55 * down;
        } else if (e < reform) {
          // bond très haut au-dessus du roi, puis chute en boule de feu noire
          const up = smooth((e - leap) / (apex - leap)), fall = clamp((e - apex) / (impact - apex));
          pos = e < apex ? { x: stand.x + (target.x - stand.x) * up, y: up * 7, z: stand.z + (target.z - stand.z) * up } : { x: target.x, y: Math.max(0.5, 7 - fall * fall * 6.5), z: target.z };
          M.animate(c.parts, t, 'run');
        } else { M.animate(c.parts, t, 'idle', 1); pos = { x: target.x, y: 0, z: target.z }; }
        c.holder.position.set(pos.x, pos.y, pos.z);
        // flammes noires sur le golem
        u.golemFlames.visible = grow > 0.05 && e < leap + 0.35;
        u.golemFlames.position.set(pos.x, pos.y, pos.z);
        u.golemFlames.scale.setScalar(Math.max(0.01, grow * big * 0.8));
        u.golemFlames.children.forEach((fl) => { fl.scale.y = 0.7 + Math.abs(Math.sin(t * 13 + fl.userData.phase)) * 0.6; fl.position.y = fl.userData.y + Math.sin(t * 5 + fl.userData.phase) * 0.04; });
        // boule de feu noire
        const ballOn = e > leap + 0.3 && e < impact;
        u.ball.visible = ballOn;
        u.ball.position.set(pos.x, pos.y + 0.6, pos.z);
        u.ball.scale.setScalar(Math.max(0.01, smooth((e - leap - 0.3) / 0.3)));
        u.ball.rotation.set(t * 4, t * 3, 0);
        u.ballSpikes.forEach((f, i) => { f.scale.y = 0.7 + Math.abs(Math.sin(t * 17 + i)) * 0.6; });
        // impact : onde de choc, trou, fissures, fumée et flammes noires
        const after = e - impact;
        u.crater.visible = after > 0;
        u.crater.children[0].scale.setScalar(Math.max(0.01, smooth(after / 0.25)));
        u.crater.children[1].scale.setScalar(Math.max(0.01, smooth(after / 0.25)));
        u.cracks.forEach((seg) => { seg.visible = after > seg.userData.order * 0.06; });
        u.craterFlames.forEach((fl) => { fl.scale.y = 0.6 + Math.abs(Math.sin(t * 12 + fl.userData.phase)) * 0.6; fl.visible = after > 0.05; });
        u.shock.material.opacity = after > 0 && after < 0.7 ? 0.8 * (1 - after / 0.7) : 0;
        u.shock.scale.setScalar(1 + clamp(after / 0.7) * 5);
        u.smoke.forEach((puff, i) => {
          const age = after - (i % 6) * 0.15;
          puff.material.opacity = age > 0 ? Math.max(0, 0.6 - age * 0.25) : 0;
          const a = i * 2.399;
          puff.position.set(target.x + Math.cos(a) * (0.3 + age * 0.3), 0.3 + age * 0.7, target.z + Math.sin(a) * (0.3 + age * 0.3));
          puff.scale.setScalar(1 + Math.max(0, age) * 0.8);
        });
        u.fireLight.position.set(pos.x, pos.y + 1, pos.z);
        u.fireLight.intensity = (after > 0 ? 6 * Math.max(0.25, 1 - after) : grow * 2.5) + Math.random() * 0.6;
        if (e >= slam && e < slam + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.14; }
        if (after >= 0 && after < 0.45) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.35 * (1 - after / 0.45); }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        if (e < slam) { M.animate(c.parts, t, 'guard', 1); return true; }
        // écrasé au sol par les poings du golem, puis englouti par l'impact
        M.animate(c.parts, t, 'ko', 1);
        c.parts.root.rotation.set(-Math.PI / 2, 0, 0);
        c.parts.root.position.y = 0.04;
        c.parts.root.scale.set(u.kingBase.scale.x * 1.1, u.kingBase.scale.y * 0.45, u.kingBase.scale.z * 1.1);
        if (e >= impact) c.holder.visible = false;
      }
      return true;
    }

    // Dragon de foudre noire : orage, appel de la foudre, descente en spirale, enroulement autour du roi
    tickBlackDragon(u, c, e, t, M, clamp, smooth) {
      const T = this.THREE, target = u.target, actor = u.actor, king = u.king;
      const descend = 1.3, impact = 3.2, fadeOut = u.duration - 0.7;
      const jag = (l, a, b, amp) => {
        const arr = l.geometry.attributes.position.array, n = arr.length / 3;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), j = i === 0 || i === n - 1 ? 0 : amp;
          arr[i * 3] = a.x + (b.x - a.x) * f + (Math.random() - 0.5) * j;
          arr[i * 3 + 1] = a.y + (b.y - a.y) * f + (Math.random() - 0.5) * j * 0.6;
          arr[i * 3 + 2] = a.z + (b.z - a.z) * f + (Math.random() - 0.5) * j;
        }
        l.geometry.attributes.position.needsUpdate = true;
      };
      if (c === actor) {
        c.anim = null; c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
        c.holder.rotation.y = Math.atan2(target.x - u.fromPos.x, target.z - u.fromPos.z);
        M.animate(c.parts, t, e < impact + 0.4 ? 'cast' : 'idle', clamp(e / 0.3));
        // Le ciel s'assombrit, les nuages d'orage se forment au-dessus du roi
        const dim = clamp(e / 0.8) * (1 - clamp((e - fadeOut) / 0.7));
        if (u.sky) {
          this.skyDim = dim;
          const night = new T.Color(0x07040c);
          if (u.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(u.sky.background).lerp(night, dim * 0.9);
          if (u.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(u.sky.fog).lerp(night, dim * 0.85);
          if (!this.weather) { this.sun.intensity = u.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = u.sky.hemi * (1 - 0.75 * dim); }
          this.renderer.toneMappingExposure = u.sky.exposure * (1 - 0.45 * dim);
        }
        u.clouds.rotation.y = t * 0.25;
        u.clouds.children.forEach((puff, i) => { puff.material.opacity = 0.8 * dim; puff.position.y = (i % 3) * 0.2 + Math.sin(t * 1.3 + i) * 0.08; });
        // Le fou lève les bras et envoie la foudre vers les nuages
        const castOn = e > 0.6 && e < descend + 0.2;
        u.castBolt.material.opacity = castOn ? 0.5 + Math.random() * 0.5 : 0;
        if (castOn) jag(u.castBolt, { x: u.fromPos.x, y: 1.3, z: u.fromPos.z }, { x: target.x, y: 4.8, z: target.z }, 0.5);
        // Trajet du dragon : spirale qui descend des nuages jusqu'au roi
        const path = (s) => {
          const a = s * Math.PI * 3.2, r = 1.5 * (1 - s) + 0.35;
          return { x: target.x + Math.cos(a) * r, y: 4.7 - s * 3.95, z: target.z + Math.sin(a) * r };
        };
        const coil = (i, n) => {
          const a = -i * 0.55 + t * 2.6, r = 0.46 + (i / n) * 0.12;
          return { x: target.x + Math.cos(a) * r, y: 0.15 + (n - i) * 0.055, z: target.z + Math.sin(a) * r };
        };
        const head = smooth((e - descend) / (impact - descend)), wrap = smooth((e - impact) / 0.5), gone = clamp((e - fadeOut) / 0.6);
        const n = u.dragon.length, pts = [];
        u.dragon.forEach((seg, i) => {
          const s = head - (i + 1) * 0.03, p = path(Math.max(0, s)), q = coil(i + 1, n + 1);
          const pos = { x: p.x + (q.x - p.x) * wrap, y: p.y + (q.y - p.y) * wrap, z: p.z + (q.z - p.z) * wrap };
          seg.visible = e > descend && (s > 0 || wrap > 0) && gone < 1;
          seg.position.set(pos.x, pos.y + Math.sin(t * 9 + i * 0.7) * 0.04, pos.z);
          seg.scale.setScalar(Math.max(0.01, 1 - gone));
          seg.children[1].material.opacity = (0.45 + Math.abs(Math.sin(t * 17 + i)) * 0.35) * (1 - gone);
          pts.push(seg.position);
        });
        const hp = path(head), hq = { x: target.x, y: 0.15 + (n + 1) * 0.055 + 0.15, z: target.z };
        const h = u.dragonHead;
        h.visible = e > descend && gone < 1;
        h.position.set(hp.x + (hq.x - hp.x) * wrap, hp.y + (hq.y - hp.y) * wrap, hp.z + (hq.z - hp.z) * wrap);
        h.scale.setScalar(Math.max(0.01, 1.5 * (1 - gone)));
        // la tête regarde vers où elle va, puis plonge sur le roi une fois enroulée
        const ahead = e < impact ? path(Math.min(1, head + 0.04)) : { x: target.x, y: 0.4, z: target.z };
        if (Math.hypot(ahead.x - h.position.x, ahead.y - h.position.y, ahead.z - h.position.z) > 0.01) h.lookAt(ahead.x, ahead.y, ahead.z);
        // éclairs qui crépitent le long du corps
        u.crackles.forEach((l, k) => {
          const on = pts.length > 8 && e > descend + 0.1 && gone < 1 && Math.random() < 0.7;
          l.material.opacity = on ? 0.6 + Math.random() * 0.4 : 0;
          if (on) { const i = Math.floor(Math.random() * (pts.length - 6)); jag(l, pts[i], pts[i + 4 + (k % 3)], 0.35); }
        });
        // à l'impact : la foudre tombe des nuages sur le roi à plusieurs reprises
        const beat = (e - impact) % 0.45, striking = e > impact && e < fadeOut && beat < 0.16;
        u.strikes.forEach((l, k) => {
          l.material.opacity = striking ? 1 - beat / 0.16 : 0;
          if (striking) jag(l, { x: target.x + (k - 1) * 0.4, y: 4.8, z: target.z }, { x: target.x, y: 0.5, z: target.z }, 0.6);
        });
        u.flashLight.position.set(h.position.x, h.position.y + 0.4, h.position.z);
        u.flashLight.intensity = e < descend ? (castOn ? 2.5 : 0) : (striking ? 9 * (1 - beat / 0.16) : 0) + 2.2 * (1 - gone) + Math.random() * 0.6;
        if (e >= impact && e < impact + 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.16; }
        else if (striking && beat < 0.05) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.07; }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        M.animate(c.parts, t, e < impact ? 'guard' : 'ko', 1);
        if (e > impact && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
        const ashes = smooth((e - impact - 0.3) / 1.6);
        c.parts.root.position.y = -ashes * 0.3 + (e > impact ? Math.sin(t * 34) * 0.035 * (1 - ashes) : 0);
        c.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
        u.ashes.forEach((ash, i) => {
          const age = Math.max(0, e - (impact + 0.5 + (i % 7) * 0.12)), angle = i * 2.399;
          ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.16), 0.12 + age * (0.7 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.16));
          ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.3) : 0;
          ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
        });
        if (e >= u.duration) {
          c.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
          if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
        }
      }
      // fin de l'orage : le ciel revient tel qu'il était
      if (e >= u.duration && u.sky) this.restoreSky(u);
      return true;
    }

    resetMateUltimate() {
      const u = this.mateUltimate;
      if (!u) return;
      if (u.apocalypse) this.restoreFoxWorld(u);
      if (u.themed) this.skyDim = 0; // le ciel assombri par un mat de thème revient
      if (u.sabre) this.endSabreMate(u);
      if (u.kitMate) this.endKitMate(u);
      if (u.hiddenEnemies) u.hiddenEnemies.forEach(([piece, visible]) => { piece.holder.visible = visible; });
      if (u.flameVictims) u.flameVictims.forEach((victim) => {
        victim.character.holder.visible = victim.visible;
        victim.character.parts.root.position.copy(victim.position);
        victim.character.parts.root.scale.copy(victim.scale);
      });
      if (u.camera) this.setCamera(this.flipped, true);
      if (u.actor && u.actor.parts.riderRoot) u.actor.parts.riderRoot.visible = true;
      if (u.actorRoot) u.actorRoot.visible = true;
      if (u.burn && u.burn.flames && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
      if (u.extraHeads) u.extraHeads.forEach((h) => { h.parent && h.parent.remove(h); h.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
      if (u.hiddenParts) u.hiddenParts.forEach((o) => { o.visible = true; });
      if (u.actor && u.actor.parts.riderRoot && u.piece === 'N') { u.actor.parts.riderRoot.scale.setScalar(0.68); u.actor.parts.riderRoot.position.y = 0.43; }
      if (u.actorRoot && u.actorBase) { u.actorRoot.position.copy(u.actorBase.position); u.actorRoot.rotation.copy(u.actorBase.rotation); u.actorRoot.scale.copy(u.actorBase.scale); }
      if (u.kingRoot && u.kingBase) { u.kingRoot.position.copy(u.kingBase.position); u.kingRoot.rotation.copy(u.kingBase.rotation); u.kingRoot.scale.copy(u.kingBase.scale); }
      if (u.actor && u.actorHolderBase) u.actor.holder.position.copy(u.actorHolderBase);
      if (u.king && u.kingHolderBase) {
        u.king.holder.position.copy(u.kingHolderBase);
        u.king.holder.visible = u.kingHolderVisible;
      }
      if (u.fox && u.fox.parent) {
        u.fox.parent.remove(u.fox);
        u.fox.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      if (u.blackBanshee && u.blackBanshee.parent) {
        u.blackBanshee.parent.remove(u.blackBanshee);
        u.blackBanshee.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      for (const model of [u.angel, u.susanoo, u.phoenix]) if (model && model.parent) {
        model.parent.remove(model);
        model.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      if (u.fx) { this.scene.remove(u.fx); u.fx.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); }
      if (u.fireLight) this.scene.remove(u.fireLight);
      if (u.flashLight) this.scene.remove(u.flashLight);
      if (u.sky) this.restoreSky(u);
      if (u.swaps) { u.swaps.forEach(([o, m]) => { o.material.dispose(); o.material = m; }); u.swaps = null; }
      if (u.actorRoot) u.actorRoot.visible = true;
      if (u.actorLight) this.scene.remove(u.actorLight);
      if (u.columnLight) this.scene.remove(u.columnLight);
      if (u.energyLight) this.scene.remove(u.energyLight);
      if (u.actor) u.actor.parts.fast = u.oldFast;
      this.mateUltimate = null; this.mateUltimateKey = '';
    }

    setMateFire(squares) {
      const T = this.THREE;
      const key = [...new Set(squares)].sort((a, b) => a - b).join(',');
      if (key === this.mateFireKey) return;
      this.mateFireKey = key;
      this.mateFireGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      this.mateFireGroup.clear();
      for (const sq of key ? key.split(',').map(Number) : []) {
        const tile = new T.Group(), p = this.sqToPos(sq);
        tile.userData.phase = Math.random() * Math.PI * 2;
        for (let i = 0; i < 3; i++) {
          const height = 0.42 + (i % 2) * 0.12;
          const radius = 0.13 - (i % 2) * 0.025;
          const color = i === 0 ? 0xff3c12 : i === 1 ? 0xff8a16 : 0xffd84a;
          const flame = new T.Mesh(
            new T.ConeGeometry(radius, height, 7),
            new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.84, blending: T.AdditiveBlending, depthWrite: false }),
          );
          const angle = i * Math.PI * 2 / 3;
          flame.position.set(p.x + Math.cos(angle) * 0.16, height / 2 + 0.025, p.z + Math.sin(angle) * 0.16);
          flame.userData.phase = i * 2.4 + tile.userData.phase;
          flame.userData.baseHeight = 0.8 + (i % 2) * 0.25;
          tile.add(flame);
        }
        this.mateFireGroup.add(tile);
      }
    }

    // Les animations de duel ne concernent que deux voisins dont l'un peut
    // réellement capturer l'autre selon les règles légales des échecs.
    // Pour chaque pièce, l'adversaire le plus proche ; à distance égale, le plus fort
    nearestFoes(board) {
      const STRENGTH = { q: 9, r: 5, b: 3.2, n: 3, k: 4, p: 1 };
      const out = new Map();
      for (let a = 0; a < 64; a++) {
        const pa = board[a];
        if (!pa) continue;
        const white = pa === pa.toUpperCase();
        let best = -1, bestD = Infinity, bestS = -1;
        for (let b = 0; b < 64; b++) {
          const pb = board[b];
          if (!pb || (pb === pb.toUpperCase()) === white) continue;
          const dr = (a >> 3) - (b >> 3), df = (a & 7) - (b & 7), d = dr * dr + df * df;
          const st = STRENGTH[pb.toLowerCase()] || 0;
          if (d < bestD || (d === bestD && st > bestS)) { best = b; bestD = d; bestS = st; }
        }
        if (best >= 0) out.set(a, best);
      }
      return out;
    }

    // Pièces en alerte : pour chacune, l'adversaire le plus proche parmi ceux qu'elle peut prendre en un coup
    // ou qui peuvent la prendre en un coup, à n'importe quelle distance.
    captureFoes(board) {
      const foes = new Map(), best = new Map(), chess = root.Chess;
      if (!chess || !chess.legalMoves) return foes;
      const note = (sq, foe, d) => { if (!best.has(sq) || d < best.get(sq)) { best.set(sq, d); foes.set(sq, foe); } };
      for (const turn of ['w', 'b']) {
        const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
        for (const move of chess.legalMoves(state)) {
          if (!move.captured) continue;
          const dr = (move.from >> 3) - (move.to >> 3), df = (move.from & 7) - (move.to & 7), d = dr * dr + df * df;
          note(move.from, move.to, d); note(move.to, move.from, d);
        }
      }
      return foes;
    }

    // L'arme pointée vers l'adversaire. Le corps lui fait déjà face (tick) : l'arme n'a qu'à se tendre vers l'avant.
    // p.aimW liste les armes tenues : o, l'objet ; f, sa rotation autour de x qui la met pointe en avant ; arm, le bras qui la tient ('R', 'L' ou 'free').
    aimMode(p) {
      if (p.aimMode !== undefined) return p.aimMode;
      const biped = !p.themed || (p.legL.userData.knee && !p.jaw), kit = p.blade && !p.aimW ? [{ o: p.blade, f: -Math.PI / 2 }] : p.aimW;
      if (kit) for (const w of kit) w.rest = w.o.rotation.x;
      p.aimList = kit || [];
      p.aimBoth = p.aimBoth || p.weapon === 'element' || (!p.themed && p.weapon === 'brawl') || p.aimList.some((w) => w.arm === 'L');
      p.aimMode = p.weapon === 'none' ? null : p.gun ? 'gun' : biped ? 'arm' : 'lean';
      return p.aimMode;
    }
    resetAim(p) {
      if (!p.aimOn) return;
      p.aimOn = false;
      for (const w of p.aimList) w.o.rotation.x = w.rest;
    }
    // k : 0 au repos, 1 arme tendue. À appeler après M.animate.
    tickAim(p, k) {
      const mode = this.aimMode(p);
      if (!mode || k < 0.01) return;
      const mix = (from, to) => from + (to - from) * k;
      if (mode === 'arm') {
        p.aimOn = true;
        const arm = (a, z) => { a.rotation.set(mix(a.rotation.x, -1.5), mix(a.rotation.y, 0), mix(a.rotation.z, z)); };
        arm(p.armR, 0.05); if (p.aimBoth) arm(p.armL, -0.05);
        p.torso.rotation.y *= 1 - k; p.head.rotation.x *= 1 - k;
        for (const w of p.aimList) {
          const a = w.arm === 'free' ? null : w.arm === 'L' ? p.armL : p.armR;
          w.o.rotation.x = mix(w.rest, w.f - (a ? -1.5 : 0));
        }
      } else if (mode === 'lean') {
        // griffes, gueule, cornes, bec, branches : tout le corps se tend vers l'adversaire
        p.torso.rotation.x += 0.2 * k; p.head.rotation.x += 0.28 * k;
        if (p.jaw) p.jaw.rotation.x += 0.5 * k;
        if (p.trunk) p.trunk.rotation.x = mix(p.trunk.rotation.x, 1.25);
        if (p.lance) p.lance.rotation.x = -0.12 * k;
        p.root.position.z += 0.05 * k;
      }
    }

    // Identifie toutes les pièces qui attaquent effectivement le roi en échec.
    checkersOf(board, kingSq) {
      if (kingSq == null || kingSq < 0 || !board[kingSq] || !root.Chess) return [];
      const turn = board[kingSq] === board[kingSq].toUpperCase() ? 'b' : 'w';
      const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
      return [...new Set(root.Chess.pseudoMoves(state).filter((m) => m.to === kingSq).map((m) => m.from))];
    }

    // Crée une chaîne persistante seulement lorsque la configuration d'échec change.
    setCheckChains(board, kingSq) {
      const checkers = this.checkersOf(board, kingSq);
      const key = checkers.length ? `${kingSq}:${checkers.join(',')}` : '';
      if (key === this.checkKey) return;
      this.checkKey = key; this.checkGroup.clear(); this.checkLinks = [];
      if (!key) return;
      const disk = new this.THREE.Mesh(this.checkDiskGeo, this.checkMat);
      disk.rotation.x = -Math.PI / 2; disk.renderOrder = 3; this.checkGroup.add(disk);
      this.checkLinks.push({ disk, kingSq });
      for (const checkerSq of checkers) {
        // le même disque noir sous la pièce qui donne l'échec, et le trait qui relie les deux disques
        const cd = new this.THREE.Mesh(this.checkDiskGeo, this.checkMat);
        cd.rotation.x = -Math.PI / 2; cd.renderOrder = 3; this.checkGroup.add(cd);
        this.checkLinks.push({ disk: cd, kingSq: checkerSq });
        const line = new this.THREE.Mesh(this.checkLineGeo, this.checkMat);
        line.rotation.x = -Math.PI / 2; line.renderOrder = 3; this.checkGroup.add(line);
        this.checkLinks.push({ line, checkerSq, kingSq });
      }
    }

    // Suit les deux pièces pendant leurs déplacements et relie le roi à son assaillant.
    drawCheckChains() {
      // le roi en échec et la pièce qui le menace se font face, même de loin
      for (const c of this.chars.values()) c.faceTarget = null;
      for (const link of this.checkLinks) {
        const king = this.chars.get(link.kingSq);
        if (link.disk) {
          link.disk.visible = !!king;
          if (king) { link.disk.position.set(king.holder.position.x, 0.045, king.holder.position.z); link.disk.scale.setScalar(1 + Math.sin(performance.now() / 180) * 0.04); }
          continue;
        }
        const attacker = this.chars.get(link.checkerSq);
        if (!attacker || !king) { link.line.visible = false; continue; }
        link.line.visible = true;
        const a = attacker.holder.position, b = king.holder.position;
        attacker.faceTarget = { x: b.x, z: b.z }; king.faceTarget = { x: a.x, z: a.z };
        const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
        // trait au sol, d'un disque à l'autre
        link.line.scale.set(Math.max(0.01, len - 0.98), 1, 1);
        const mid = 0.5;
        link.line.position.set(a.x + dx * mid, 0.044, a.z + dz * mid);
        link.line.rotation.z = -Math.atan2(dz, dx);
      }
    }

    // Deux tours du même camp, alignées sans rien entre elles, sont reliées par un fil de feu
    // Deux pièces identiques du même camp sont liées quand elles se protègent l'une l'autre
    // (ligne libre pour les tours, les dames et les fous, saut pour les cavaliers) ou quand elles se touchent
    findRopes(board) {
      const pairs = [];
      const lineClear = (a, b, step) => { for (let s = a + step; s !== b; s += step) if (board[s]) return false; return true; };
      // Pions : ceux des colonnes qui se suivent forment un îlot et sont liés, quelle que soit leur rangée.
      for (const pawn of ['P', 'p']) {
        const files = Array.from({ length: 8 }, () => []);
        for (let i = 0; i < 64; i++) if (board[i] === pawn) files[i & 7].push(i);
        for (let f = 0; f < 8; f++) {
          if (!files[f].length) continue;
          // chaque pion est relié à un pion de la colonne voisine de droite (l'îlot entier est ainsi lié)
          if (f < 7 && files[f + 1].length) for (const a of files[f]) pairs.push([a, files[f + 1][0]]);
        }
      }
      for (const piece of ['R', 'r', 'Q', 'q', 'B', 'b', 'N', 'n']) {
        const kind = piece.toLowerCase(), sqs = [];
        for (let i = 0; i < 64; i++) if (board[i] === piece) sqs.push(i);
        for (let i = 0; i < sqs.length; i++) for (let j = i + 1; j < sqs.length; j++) {
          const a = sqs[i], b = sqs[j], dr = (b >> 3) - (a >> 3), df = (b & 7) - (a & 7);
          const adjacent = Math.max(Math.abs(dr), Math.abs(df)) === 1;
          let linked = adjacent;
          if (!linked && kind === 'n') linked = (Math.abs(dr) === 1 && Math.abs(df) === 2) || (Math.abs(dr) === 2 && Math.abs(df) === 1);
          const straight = dr === 0 || df === 0, diagonal = Math.abs(dr) === Math.abs(df);
          if (!linked && (kind === 'r' || kind === 'q') && straight) linked = lineClear(a, b, dr === 0 ? Math.sign(df) : 8 * Math.sign(dr));
          if (!linked && (kind === 'b' || kind === 'q') && diagonal) linked = lineClear(a, b, 8 * Math.sign(dr) + Math.sign(df));
          if (linked) pairs.push([a, b]);
        }
      }
      return pairs;
    }

    // Pièces liées : un cercle à leurs pieds qui s'élargit en boucle
    drawRopes(t) {
      const T = this.THREE;
      if (!this.ropeGroup) {
        this.ropeGroup = new T.Group(); this.scene.add(this.ropeGroup);
        this.ropeCore = new T.MeshBasicMaterial({ color: 0xfff1a8 });
        this.ropeFire = new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false });
      }
      for (const m of this.ropeGroup.children) if (!m.userData.shared) m.geometry.dispose();
      this.ropeGroup.clear();
      if (!this.auraMat) {
        // halo lumineux posé au sol : anneau doux qui s'estompe vers l'extérieur
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const cx = cv.getContext('2d'), g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.45, 'rgba(255,255,255,0.55)'); g.addColorStop(0.62, 'rgba(255,255,255,1)');
        g.addColorStop(0.72, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
        const tex = new T.CanvasTexture(cv);
        const haloMat = (color) => new T.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
        this.auraMat = { w: haloMat(0xffd36a), b: haloMat(0xb36bff),
          rw: new T.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }),
          rb: new T.MeshBasicMaterial({ color: 0xd9b3ff, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }) };
        this.haloGeo = new T.PlaneGeometry(1.15, 1.15);
        this.auraRing = new T.RingGeometry(0.39, 0.44, 48);
      }
      const pulse = 0.6 + Math.abs(Math.sin(t * 2.6)) * 0.4;
      this.auraMat.w.opacity = pulse; this.auraMat.b.opacity = pulse;
      this.auraMat.rw.opacity = this.auraMat.rb.opacity = 0.35 + Math.abs(Math.sin(t * 2.6)) * 0.45;
      const glowing = new Set();
      // pièces liées : un cercle à leurs pieds qui s'élargit en boucle (une fois arrivées sur leur case)
      for (const [a, b] of this.ropes || []) {
        const ca = this.chars.get(a), cb = this.chars.get(b);
        if (!ca || !cb || ca.anim || cb.anim) continue;
        for (const [c, sq] of [[ca, a], [cb, b]]) {
          if (glowing.has(c)) continue;
          glowing.add(c);
          const white = c.piece === c.piece.toUpperCase(), p = c.holder.position;
          const ring = new T.Mesh(this.auraRing, white ? this.auraMat.rw : this.auraMat.rb);
          ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.026, p.z);
          ring.scale.setScalar(0.8 + ((t * 0.6 + sq * 0.13) % 1) * 0.6); ring.userData.shared = true; // onde qui s'élargit
          this.ropeGroup.add(ring);
        }
      }
    }

    // Object3D.clone() sérialise userData en JSON : la référence circulaire userData.char le ferait planter
    cloneClean(obj) {
      const saved = [];
      obj.traverse((o) => { if (o.userData && o.userData.char) { saved.push([o, o.userData.char]); delete o.userData.char; } });
      try { return obj.clone(); }
      finally { saved.forEach(([o, ch]) => { o.userData.char = ch; }); }
    }

    // Changement de thème des personnages : on les recrée tous au prochain affichage
    // Voûte d'énergie : un roi roqué, à l'abri derrière ses trois pions encore en place, est protégé
    // par un dôme lumineux ; dès que le roque est brisé (un pion du bouclier part ou le roi sort), la voûte éclate.
    sheltered(board, white) {
      const k = board.indexOf(white ? 'K' : 'k');
      if (k < 0) return -1;
      const row = k >> 3, file = k & 7, home = white ? 7 : 0, step = white ? -1 : 1;
      if (row !== home || (file > 2 && file < 6)) return -1; // roi resté au centre : pas de roque
      const files = file >= 6 ? [5, 6, 7] : [0, 1, 2];
      const pawn = white ? 'P' : 'p';
      for (const f of files) if (board[(home + step) * 8 + f] !== pawn && board[(home + 2 * step) * 8 + f] !== pawn) return -1;
      return k;
    }
    updateVaults(board, animate) {
      const T = this.THREE, now = this.now();
      this.vaults = this.vaults || {};
      for (const white of [true, false]) {
        const key = white ? 'w' : 'b', sq = board ? this.sheltered(board, white) : -1, v = this.vaults[key];
        if (sq >= 0 && v && v.sq === sq) continue;
        if (v) { // la voûte éclate (roque brisé) ou suit le roi
          const old = v.g; v.breakAt = now; this.vaults[key] = null;
          const dur = animate ? 0.6 : 0.01;
          this.addEffect({ start: now, dur, tick: (e) => { const k = e / dur; old.scale.setScalar(1 + k * 0.6); old.children.forEach((m) => { m.material.opacity = m.userData.base * (1 - k); }); }, end: () => { this.scene.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } });
        }
        if (sq < 0) continue;
        const color = white ? 0x7fd8ff : 0xc77dff, p = this.sqToPos(sq), g = new T.Group();
        g.position.set(p.x, 0, p.z);
        const dome = new T.Mesh(new T.SphereGeometry(0.7, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        const grid = new T.Mesh(new T.SphereGeometry(0.71, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }));
        const ring = new T.Mesh(new T.RingGeometry(0.66, 0.74, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
        dome.userData.base = 0.22; grid.userData.base = 0.45; ring.userData.base = 0.6;
        dome.scale.y = grid.scale.y = 1.9; // assez haute pour couvrir tout le roi
        g.add(dome, grid, ring); this.scene.add(g);
        this.vaults[key] = { sq, g, born: animate ? now : now - 10 };
      }
    }
    tickVaults(t) {
      if (!this.vaults) return;
      for (const v of Object.values(this.vaults)) {
        if (!v) continue;
        const grow = Math.min(1, (t - v.born) / 0.5), pulse = 1 + Math.sin(t * 2.4) * 0.025;
        v.g.scale.setScalar(Math.max(0.01, grow * grow * (3 - 2 * grow)) * pulse);
        v.g.children[1].rotation.y = t * 0.25;
        v.g.children.forEach((m) => { m.material.opacity = m.userData.base * (0.75 + 0.25 * Math.sin(t * 3 + m.userData.base * 10)); });
      }
    }

    // Thème Océan : une fine couche d'eau translucide, avec des reflets qui ondulent, recouvre le plateau
    tickWater(t) {
      const on = root.PieceTheme === 'ocean' || root.PieceThemeBlack === 'ocean';
      if (!on && !this.waterLayer) return;
      if (!this.waterLayer) {
        const T = this.THREE, c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = 'rgb(30,175,230)'; g.fillRect(0, 0, 256, 256);
        // reflets clairs en vaguelettes, dessinés de façon à se raccorder quand la texture se répète
        g.strokeStyle = 'rgba(235,250,255,0.55)'; g.lineCap = 'round';
        for (let i = 0; i < 46; i++) {
          const x = (i * 97) % 256, y = (i * 53) % 256, w = 18 + (i % 5) * 7;
          g.lineWidth = 1.5 + (i % 3);
          for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
            g.beginPath(); g.moveTo(x + dx - w / 2, y + dy);
            g.quadraticCurveTo(x + dx, y + dy - 5, x + dx + w / 2, y + dy); g.stroke();
          }
        }
        const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
        const m = new T.Mesh(new T.PlaneGeometry(SIZE - 0.04, SIZE - 0.04), new T.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.1, emissive: 0x0b5f86, emissiveIntensity: 0.25, depthWrite: false }));
        // sous les repères de cases (0,01) pour qu'ils restent bien visibles
        m.rotation.x = -Math.PI / 2; m.position.y = 0.005;
        this.scene.add(m); this.waterLayer = m;
      }
      this.waterLayer.visible = on;
      if (!on) return;
      const tex = this.waterLayer.material.map;
      tex.offset.set(Math.sin(t * 0.21) * 0.06 + t * 0.012, Math.cos(t * 0.17) * 0.05 + t * 0.008);
      this.waterLayer.material.opacity = 0.38 + Math.sin(t * 0.9) * 0.04;
    }

    rebuildPieces() {
      // changement de thème : on termine d'abord les animations en cours pour ne laisser aucun effet orphelin
      this.clearTransient();
      if (this.mateUltimate) this.resetMateUltimate();
      for (const g of this.tracers || []) { for (const o of [g, g.userData.muzzle, g.userData.hit]) { this.scene.remove(o); o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); } }
      this.tracers = new Set();
      for (const c of this.chars.values()) this.pieces.remove(c.holder);
      this.chars = new Map();
      this.boardKey = null;
    }

    makeChar(piece) {
      const T = this.THREE;
      const parts = root.Models3D.build(T, piece);
      parts.root.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.char = parts;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        o.castShadow = !materials.some((m) => m.blending === T.AdditiveBlending);
      });
      const holder = new T.Group();
      const k = root.Models3D.SIZE[piece.toLowerCase()];
      const shadow = new T.Mesh(new T.PlaneGeometry(1.1 * k, 1.1 * k), new T.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
      holder.add(shadow); holder.add(parts.root);
      holder.rotation.y = this.viewYaw();
      this.pieces.add(holder);
      return { piece, parts, holder, shadow, yaw: holder.rotation.y };
    }

    // Mode léger : pixel ratio 1, pas d'ombres portées, 30 images/s au plus
    setLite(on) {
      on = !!on;
      if (this.liteApplied && on === this.lite) return;
      this.lite = on; this.liteApplied = true;
      this.renderer.setPixelRatio(on ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      this.sun.castShadow = !on;
      this.resize();
    }

    // Horloge des animations : ralentie (speed < 1) pour qu'on profite de chaque mouvement
    now() { return performance.now() / 1000 * this.speed; }
    // Temps réel (ms) avant la fin des animations en cours, pour l'interface
    busyLeftMs() { return this.busyUntil ? (this.busyUntil - this.now()) / this.speed * 1000 : 0; }

    tick(nowMs) {
      // Le plateau est conservé entre les écrans, mais ne doit pas animer ni
      // redessiner ses pièces tant qu'il est masqué.
      if (!this.renderer.domElement.getClientRects().length) return;
      if (this.lite && nowMs - (this.lastFrameMs || 0) < 31) return;
      if (nowMs - (this.lastFrameMs || nowMs) > 1000) { this.perfStart = nowMs; this.perfFrames = 0; this.slowRuns = 0; }
      this.lastFrameMs = nowMs;
      // Cadence mesurée sur 3 s : deux fenêtres lentes de suite → l'appli propose le mode léger
      this.perfFrames = (this.perfFrames || 0) + 1;
      if (!this.perfStart) this.perfStart = nowMs;
      if (nowMs - this.perfStart > 3000) {
        const fps = (this.perfFrames * 1000) / (nowMs - this.perfStart);
        this.slowRuns = fps < 20 ? (this.slowRuns || 0) + 1 : 0;
        if (this.slowRuns >= 2 && !this.lite && this.onSlow) this.onSlow();
        this.perfFrames = 0; this.perfStart = nowMs;
      }
      const t = nowMs / 1000 * this.speed;
      const dt = Math.min(0.25, Math.max(0, t - (this.lastT || t)));
      this.lastT = t;
      this.tickWater(t);
      this.tickVaults(t);
      this.hideTracers(t);
      const ease = 1 - Math.exp(-dt * 11); // rotation indépendante du nombre d'images par seconde
      const M = root.Models3D;
      const restYaw = this.viewYaw(); // tous regardent le joueur
      for (const tile of this.mateFireGroup.children) {
        for (const flame of tile.children) {
          const flicker = Math.sin(t * 19 + flame.userData.phase);
          flame.scale.y = flame.userData.baseHeight * (0.82 + Math.abs(flicker) * 0.32);
          flame.position.y = flame.geometry.parameters.height * flame.scale.y / 2 + 0.025;
          flame.material.opacity = 0.66 + Math.max(0, flicker) * 0.3;
          flame.rotation.z = Math.sin(t * 11 + flame.userData.phase) * 0.1;
        }
      }
      const turn = (c, target) => {
        let d = target - c.holder.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.holder.rotation.y += d * ease;
      };
      for (const c of this.chars.values()) {
        let state = 'idle', k = 0;
        this.trail(c, false, t);
        this.resetAim(c.parts);
        if (c.flyTilt) { c.parts.root.rotation.x = 0; c.flyTilt = false; }
        const wantAim = c.foe && !c.anim && !c.selected && !c.inCheck && !this.outcome ? 1 : 0;
        if (!wantAim && c.parts.lance && c.aimK && !c.anim) c.parts.lance.rotation.x = 0;
        if (this.tickMateUltimate(c, t, M)) continue;
        if (c.anim) {
          const a = c.anim, el = t - a.t0;
          const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
          const glide = (p0, p1, u, leap) => {
            const e = ease(u);
            c.holder.position.set(p0.x + (p1.x - p0.x) * e, 0, p0.z + (p1.z - p0.z) * e);
            turn(c, Math.atan2(p1.x - p0.x, p1.z - p0.z));
            M.animate(c.parts, t, a.knightFlight ? 'knight-flight' : 'run');
            // Thème Oiseaux : sur plus d'une case, l'oiseau s'envole, plane puis se pose
            const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z), bird = root.themeOf(c.piece) === 'birds' && dist > 1.2;
            // Saga des Auras : les pièces volent au ras du plateau en laissant une traînée de lumière
            const flyer = root.themeOf(c.piece) === 'auras';
            const bareFlight = a.flight === 'fly' && c.piece.toLowerCase() === 'r'; // la tour vole sans aura ni traînée
            if (bareFlight && c.auraFx) c.auraFx.visible = false;
            if (flyer && !bareFlight && u > 0 && u < 1) this.auraTrail(c, t);
            // Sorën : pas instantané, elle disparaît et réapparaît sur la case visée
            if (flyer && c.piece === 'Q' && dist > 1.2 && !a.flight) {
              const gone = u > 0.2 && u < 0.8;
              if (gone !== !!c.auraGone) { c.auraGone = gone; c.parts.root.visible = !gone; this.auraBurst('blink', c.holder.position, t); }
            }
            const arc = flyer ? Math.sin(Math.PI * u) * (leap ? Math.max(a.high || 0.9, 1.3) : 0.45) : bird ? Math.min(1, Math.sin(Math.PI * u) * 1.6) * Math.min(2.2, 0.7 + dist * 0.28) : Math.sin(Math.PI * u) * (leap ? a.high || 0.9 : 0.12);
            c.parts.root.position.y = arc;
            c.shadow.scale.setScalar(Math.max(0.35, 1 - arc * 0.4));
            if (c.parts.fast && u < 1) this.trail(c, true, t);
          };
          const arrive = () => { this.endToss(c); c.anim = null; c.holder.position.set(a.to.x, 0, a.to.z); c.shadow.scale.setScalar(1); };
          if (a.knightAttack) {
            this.tickKnightAttack(c, a.knightAttack, el, t, M);
            if (el >= a.dur) {
              this.endShot(a.knightAttack);
              c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
              c.anim = null; c.holder.position.set(a.to.x, 0, a.to.z);
              c.parts.root.rotation.set(0, 0, 0); c.parts.root.position.set(0, 0, 0); c.shadow.scale.setScalar(1);
            }
            continue;
          }
          if (a.wait && el < 0) { c.holder.position.set(a.from.x, 0, a.from.z); M.animate(c.parts, t, 'idle'); continue; } // le roi attend ses soldats
          if (a.pre && el < 0) {
            // Riposte de la cible avant l'attaque. Thème Ninjas : l'attaquant esquive par une technique de substitution
            // (fumée, bûche). Autres thèmes : pas de mur, il encaisse le coup de plein fouet puis lance son attaque.
            const tg = (a.shot || a.toss).target, u = t - a.pre;
            c.holder.position.set(a.from.x, 0, a.from.z);
            turn(c, Math.atan2(tg.x - a.from.x, tg.z - a.from.z));
            if (!THEME_FX[root.themeOf(c.piece)]) { this.substitution(c, a, u, t, M); continue; }
            M.setEarthWall(c.parts, 0);
            const hitAt = 0.85, hurt = u > hitAt && u < hitAt + 0.35 ? Math.sin((u - hitAt) / 0.35 * Math.PI) : 0;
            M.animate(c.parts, t, hurt > 0 ? 'ko' : 'guard', hurt > 0 ? hurt * 0.35 : 1);
            c.parts.root.position.z = -hurt * 0.2; // projeté en arrière par l'impact
            c.parts.root.rotation.x = -hurt * 0.35;
            if (u > hitAt && !a.hurtShake) { a.hurtShake = true; this.shakeUntil = t + 0.15; this.shakeAmp = 0.05; }
            continue;
          }
          if (a.shot) {
            M.setEarthWall(c.parts, 0);
            if (a.subst && !a.subst.shown) { a.subst.shown = true; c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true; if (c.shadow) c.shadow.visible = true; }
            const s = a.shot;
            if (el < s.runStart) {
              c.holder.position.set(a.from.x, 0, a.from.z);
              turn(c, Math.atan2(s.target.x - a.from.x, s.target.z - a.from.z));
              M.animate(c.parts, t, 'cast', Math.min(1, el / s.fire));
            } else {
              const u = Math.min(1, (el - s.runStart) / a.dur);
              glide(a.from, a.to, u, false);
              if (u >= 1) arrive();
            }
            if (s.ended) { /* effet déjà nettoyé : ne rien recréer */ } else if (s.tech === 'fire') this.flyFire(c, s, el, t); else if (s.tech === 'bubble') this.flyBubbles(c, s, el, t); else if (s.tech === 'proj') this.flyProj(c, s, el, t); else this.flyDragon(c, s, el, t);
            continue;
          }
          if (a.toss) {
            M.setEarthWall(c.parts, 0);
            const s = a.toss;
            if (el < s.runStart) {
              c.holder.position.set(a.from.x, 0, a.from.z);
              turn(c, Math.atan2(s.target.x - a.from.x, s.target.z - a.from.z));
              M.animate(c.parts, t, 'throw', Math.min(1, el / (s.windup + 0.15)));
              this.flySpikes(c, s, el, t);
            } else {
              const u = Math.min(1, (el - s.runStart) / a.dur);
              glide(a.from, a.to, u, false);
              if (u >= 1) arrive();
            }
            continue;
          }
          if (!a.duel) {
            const u = Math.min(1, Math.max(0, el / a.dur));
            glide(a.from, a.to, u, a.leap);
            if (a.flight) this.tickFlight(c, a, u, t);
            if (u >= 1) arrive();
          } else if (el < a.dur) {
            glide(a.from, a.duel.stop, Math.max(0, el / a.dur), a.leap);
          } else if (el < a.dur + a.duel.len) {
            // duel : la technique de chaque pièce (karaté, katana, sabre, flammes…)
            const d0 = el - a.dur;
            this.brawlMode(c, true);
            c.holder.position.set(a.duel.stop.x, 0, a.duel.stop.z);
            turn(c, Math.atan2(a.duel.foe.x - a.duel.stop.x, a.duel.foe.z - a.duel.stop.z));
            if (d0 >= X1 && d0 < X2) {
              // la cible riposte : l'attaquant pare et recule d'un pas
              M.animate(c.parts, t, 'guard', 1);
              c.parts.root.position.z = -Math.sin(((d0 - X1) / (X2 - X1)) * Math.PI) * 0.1;
              continue;
            }
            const d = d0 < X1 ? d0 : d0 - X2;
            const hits = d0 < X1 ? d0 * 1.7 : d * a.duel.rate;
            const finisher = d0 >= a.duel.len - 0.35;
            if (c.parts.weapon === 'element') M.animate(c.parts, t, 'punch', 0.5); // jet de flammes continu
            else M.animate(c.parts, t, 'punch', finisher ? 2.35 : hits);
            c.parts.root.position.z = c.parts.weapon === 'element' ? 0 : Math.sin(hits * Math.PI * 2) * 0.06;
            c.shadow.scale.setScalar(1);
            if (c.parts.mg && root.themeOf(c.piece) === 'modern') this.mgBurst(c, a.duel.foe, t); // guerriers modernes : rafales de mitrailleuse
            else if (c.parts.weapon !== 'element') this.flash(a.duel.stop, a.duel.foe, hits, c.parts.fast ? 0xffffff : 0xffe066);
          } else {
            const u = Math.min(1, (el - a.dur - a.duel.len) / 0.35);
            this.brawlMode(c, false);
            c.parts.root.position.z = 0;
            glide(a.duel.stop, a.to, u, false);
            if (u >= 1) arrive();
          }
          continue;
        }
        if (this.outcome && c.drawTo) { this.tickDrawFormation(c, t, M); continue; }
        if (this.outcome) {
          const winner = this.outcome === '1-0' ? 'w' : this.outcome === '0-1' ? 'b' : null;
          const side = c.piece === c.piece.toUpperCase() ? 'w' : 'b';
          const pose = winner && side === winner ? 'victory' : 'kneel';
          if (c.endPose !== pose) { c.endPose = pose; c.endPoseAt = t; }
          M.animate(c.parts, t, pose, Math.min(1, (t - c.endPoseAt) / 0.5));
          continue;
        }
        if (c.selected) state = 'select';
        this.tickAura(c, t); this.tickAuraCheck(c, t);
        if (c.auraGone) { c.auraGone = false; c.parts.root.visible = true; }
        // Les personnages ne suivent plus la caméra : ils fixent l'adversaire le plus proche (ou le plus fort à égalité)
        const at = c.holder.position;
        const look = c.faceTarget || c.foe || c.watch;
        turn(c, (look ? Math.atan2(look.x - at.x, look.z - at.z) : restYaw) + (c.parts.yawOffset || 0));
        if (c.inCheck && !c.selected) { state = 'panic'; k = 0; } // le roi en échec agite les bras en l'air
        c.aimK = (c.aimK || 0) + (wantAim - (c.aimK || 0)) * ease; // l'arme se tend, ou revient au repos quand l'alerte disparaît
        c.parts.gunAim = c.aimK > 0.3;
        M.animate(c.parts, t, state, k);
        this.tickAim(c.parts, c.aimK);
        if (c.inCheck) c.parts.root.position.x = Math.sin(t * 40) * 0.025; // le roi tremble en échec
        else c.parts.root.position.x = 0;
      }
      // Pièces prises : K.O., projetées, emportées ou brûlées, puis disparues
      this.dying = this.dying.filter((d) => {
        if (d.push) {
          const u = Math.min(1, Math.max(0, (t - d.t0) / 0.42)), eased = u * u * (3 - 2 * u);
          d.c.holder.position.set(d.from.x + d.dx * 0.7 * eased, 0, d.from.z + d.dz * 0.7 * eased);
          d.c.parts.root.rotation.set(-d.dx * 0.42 * eased, 0, d.dz * 0.42 * eased);
          d.c.parts.root.position.y = Math.sin(Math.PI * u) * 0.06;
          if (u >= 1) { this.pieces.remove(d.c.holder); d.c.parts.root.rotation.set(0, 0, 0); d.c.parts.root.position.set(0, 0, 0); return false; }
          return true;
        }
        if (d.knightAttack) {
          if (this.tickKnightVictim(d, t, M)) return true;
          this.pieces.remove(d.c.holder);
          return false;
        }
        const u = (t - d.t0) / (d.impaled ? 2.4 : d.lift ? d.lift * 1.5 : d.burn ? BURN_TIME : d.far || d.explode || d.swept ? 1.1 : 0.8);
        if (d.burn && t > (d.burnAt !== undefined ? d.burnAt : (d.start || d.t0) + X2 + 0.15)) this.burn(d, t);
        if (u < 0 && d.impaled && d.spikes.spikes && d.spikes.spikes[d.spikes.spikes.length - 1].scale.y > 0.02) {
          // la cible est soulevée au sommet de la dernière pique pendant qu'elle surgit
          M.animate(d.c.parts, t, 'ko');
          this.impalePose(d);
          return true;
        }
        if (u < 0) {
          // pendant le duel, la cible se défend : mur de terre (pion), mur de glace (roi), ou riposte
          const p = d.c.holder.position;
          let dd = Math.atan2(d.from.x - p.x, d.from.z - p.z) - d.c.holder.rotation.y;
          d.c.holder.rotation.y += Math.atan2(Math.sin(dd), Math.cos(dd)) * ease;
          const e = t - (d.start || 0);
          if (d.ex) this.brawlMode(d.c, true); // côte à côte : aux poings et aux pieds, sans mur de protection
          if (d.counter && t < d.counter.end) this.counterShot(d, t); // riposte à distance avec sa propre technique
          else if (d.ex && e >= 0 && e < X1) M.animate(d.c.parts, t, 'guard', Math.min(1, e * 4)); // encaisse l'assaut
          else if (d.ex && e >= X1 && e < X2) {
            // riposte au corps à corps, aux poings et aux pieds
            this.brawlMode(d.c, true);
            const hits = (e - X1) * 2.2;
            M.animate(d.c.parts, t, 'punch', d.c.parts.weapon === 'element' ? 0.5 : hits);
            if (d.c.parts.weapon !== 'element') this.flash(d.c.holder.position, d.from, hits, d.c.parts.fast ? 0xffffff : 0x9ad7ff);
          } else if (d.ex && !d.c.parts.wall) M.animate(d.c.parts, t, e < 0 ? 'idle' : 'guard', e < 0 ? 0 : 1); // attend, puis subit le coup final
          else if (d.c.parts.wall && t > (d.start || d.t0)) M.animate(d.c.parts, t, 'guard', Math.min(1, (t - d.start) * 4));
          else if (d.hit) M.animate(d.c.parts, t, 'idle'); // touché de loin ou trop vite : pas le temps de riposter
          else M.animate(d.c.parts, t, 'punch', t * 1.5 + 0.5);
          return true;
        }
        if (d.counter) this.endCounter(d);
        if (u >= 1) {
          this.pieces.remove(d.c.holder); this.endBurn(d);
          if (d.spikes && d.spikes.proj) {
            this.scene.remove(d.spikes.proj);
            d.spikes.proj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
            d.spikes.proj = null;
          }
          return false;
        }
        M.animate(d.c.parts, t, 'ko');
        const r = d.c.parts.root;
        if (d.impaled) {
          // Embrochée un instant, la cible glisse le long de la dernière pique puis est projetée hors du plateau.
          this.impalePose(d);
        } else if (d.burn) {
          // brûlée sur place jusqu'aux cendres : elle s'affaisse et s'enfonce
          r.position.set(0, -u * 0.3, 0);
          r.rotation.set(-u * 0.5, 0, 0);
          r.scale.set(d.base * (1 - u * 0.3), d.base * Math.max(0.05, 1 - u), d.base * (1 - u * 0.3));
          d.c.shadow.visible = false;
          return true;
        } else if (d.lift) {
          // emportée dans les airs par le dragon de feu de la tour blanche
          r.position.set(0, u * 11.25, 0);
          r.rotation.set(1.2, u * 6, 0);
        } else if (d.explode) {
          // soufflé par l'explosion : projeté haut, tourne vite et rétrécit
          r.position.set(d.dx * u * 9, Math.sin(Math.PI * u) * 2.2, d.dz * u * 9);
          r.rotation.set(u * 16, u * 6, u * 9);
        } else if (d.far) {
          // Coup final du duel : la cible est éjectée hors de l'échiquier.
          r.position.set(d.dx * u * 9, Math.sin(Math.PI * u) * 2.6, d.dz * u * 9);
          r.rotation.set(u * 14, u * 3, u * 6);
        } else if (d.swept) {
          // emporté par le dragon d'eau
          r.position.set(d.dx * u * 9, 0.3 + Math.sin(u * 9) * 0.15, d.dz * u * 9);
          r.rotation.set(u * 4, u * 12, 0);
        } else {
          r.position.set(d.dx * u * 1.6, Math.sin(Math.PI * u) * 1.1, d.dz * u * 1.6);
          r.rotation.set(u * 9, 0, u * 4);
        }
        if (!d.impaled) r.scale.setScalar(d.base * (1 - u * (d.far || d.explode || d.swept ? 0.4 : 0.8)));
        d.c.shadow.visible = false;
        return true;
      });
      if (this.spark && t > (this.sparkUntil || 0)) this.spark.visible = false;
      this.drawRopes(t);
      this.drawCheckChains();
      this.tickWeather(t, dt / this.speed);
      this.tickAnimals(t, dt / this.speed);
      this.tickEffects(t);
      this.tickDayNight(t, dt);
      this.tickCaptureScars(t);
      this.tickAuraTrails(t);
      this.tickAuraEvents(t);
      this.tickCaptureCamera(t);
      this.tickAttackCamera(t);
      this.tickMateCamera(t);
      // tremblement de l'image au lancer et à l'impact
      if (this.shakeUntil > t) { const a = (this.shakeAmp || 0.05) * (this.powerUntil > t ? 1.7 : 1); this.scene.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a); }
      else this.scene.position.set(0, 0, 0);
      // la nuit et le coucher de soleil assombrissent l'image (sans toucher aux réglages des techniques)
      const ex = this.renderer.toneMappingExposure, nt = this.night || 0;
      this.renderer.toneMappingExposure = ex * (1 - 0.45 * nt - 0.1 * (this.sunset || 0) * (1 - nt));
      this.renderer.render(this.scene, this.camera);
      this.renderer.toneMappingExposure = ex;
    }

    // Traînée de vitesse derrière le samouraï
    trail(c, on, t) {
      if (!c.parts.fast) return;
      const T = this.THREE;
      if (!c.trail) {
        c.trail = new T.Group();
        const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
        for (let i = 0; i < 6; i++) {
          const l = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.9), m);
          l.position.set((i % 3 - 1) * 0.16, 0.25 + i * 0.13, -0.6 - (i % 2) * 0.2);
          c.trail.add(l);
        }
        c.holder.add(c.trail);
      }
      c.trail.visible = on;
      if (on) c.trail.children.forEach((l, i) => { l.scale.z = 0.6 + Math.random() * 0.8; l.material.opacity = 0.35 + Math.random() * 0.3; });
    }

    // Brûlure : la cible noircit, des flammes la lèchent
    burn(d, t) {
      const T = this.THREE;
      if (!d.flames) {
        d.mats = [];
        d.c.parts.root.traverse((o) => {
          if (!o.isMesh || o.material.blending === T.AdditiveBlending) return;
          o.material = o.material.clone(); d.mats.push(o.material);
        });
        d.flames = new T.Group();
        const mk = (color, r, h) => new T.Mesh(new T.ConeGeometry(r, h, 8, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        for (let i = 0; i < 7; i++) {
          const f = mk(i % 2 ? 0xffd04a : 0xff5a1a, 0.08 + (i % 3) * 0.03, 0.35 + (i % 3) * 0.15);
          const a = (i / 7) * Math.PI * 2;
          f.userData = { a, r: 0.12 + (i % 2) * 0.1, y: 0.25 + (i % 4) * 0.2, seed: i * 1.7 };
          d.flames.add(f);
        }
        d.c.holder.add(d.flames);
        d.black = new T.Color(0x1a1412);
      }
      for (const m of d.mats) if (m.color) m.color.lerp(d.black, 0.04);
      for (const f of d.flames.children) {
        const u = f.userData, w = Math.sin(t * 18 + u.seed);
        f.position.set(Math.cos(u.a + t * 2) * u.r, u.y + w * 0.05, Math.sin(u.a + t * 2) * u.r);
        f.scale.set(1 + w * 0.2, 1 + Math.sin(t * 23 + u.seed) * 0.35, 1 + w * 0.2);
      }
    }
    endBurn(d) {
      if (!d.flames) return;
      d.c.holder.remove(d.flames);
      d.flames.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      for (const m of d.mats) m.dispose();
    }

    // Victime embrochée : suit la pointe de la dernière pique tout au long de sa montée
    impalePose(d) {
      const last = d.spikes.spikes[d.spikes.spikes.length - 1];
      const r = d.c.parts.root;
      r.position.set(0, d.spikes.tipH * last.scale.y, 0);
      r.rotation.set(-Math.PI / 2, 0, 0);
      r.scale.setScalar(d.base);
      d.c.shadow.visible = false;
    }

    // Le fou fait monter une rangée de pics du sol jusqu'à la cible.
    flySpikes(c, s, el, t) {
      const T = this.THREE;
      if (el < s.windup) return;
      if (!s.proj) {
        s.proj = new T.Group();
        s.spikes = [];
        s.start = new T.Vector3(c.holder.position.x, 0, c.holder.position.z);
        const end = new T.Vector3(s.target.x, 0, s.target.z);
        const count = Math.max(6, Math.ceil(s.start.distanceTo(end) * 1.35));
        const stone = new T.MeshStandardMaterial({ color: 0x8f795e, roughness: 0.95 });
        const edge = new T.MeshStandardMaterial({ color: 0xc0ad8c, roughness: 0.82 });
        for (let i = 0; i < count; i++) {
          const f = (i + 0.5) / count;
          const height = 1.1 + f * 3.5;
          const spike = new T.Group();
          const body = new T.Mesh(new T.ConeGeometry(0.22, height, 5).translate(0, height / 2, 0), stone);
          body.position.y = 0.015;
          spike.add(body);
          const shard = new T.Mesh(new T.ConeGeometry(0.09, height * 0.72, 4).translate(0, height * 0.36, 0), edge);
          shard.position.set(0.1, 0.02, 0.07);
          spike.add(shard);
          spike.position.lerpVectors(s.start, end, f);
          spike.scale.y = 0.001;
          s.tipH = height;
          s.proj.add(spike); s.spikes.push(spike);
        }
        this.scene.add(s.proj);
      }
      const u = Math.max(0, Math.min(1, (el - s.windup) / s.flight));
      s.spikes.forEach((spike, i) => {
        const start = i / Math.max(1, s.spikes.length - 1) * 0.62;
        spike.scale.y = s.stuck ? 1 : Math.max(0.001, Math.min(1, (u - start) / 0.18));
      });
      if (el < s.impact) {
        // Les pics se dressent à la suite, de l'attaquant vers sa cible.
      } else if (!s.stuck) {
        s.stuck = true;
        this.shakeUntil = t + 0.1; this.shakeAmp = 0.03;
      }
    }

    endToss(c) {
      if (c.anim && c.anim.shot) this.endShot(c);
      // attaque spéciale interrompue (coup suivant joué avant la fin) : ses effets ne doivent pas rester à l'écran
      if (c.anim && c.anim.knightAttack) {
        this.endShot(c.anim.knightAttack);
        c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
        c.parts.root.rotation.set(0, 0, 0); c.parts.root.position.set(0, 0, 0); if (c.shadow) c.shadow.scale.setScalar(1);
      }
      const s = c.anim && c.anim.toss;
      if (!s) return;
      if (s.proj && !s.stuck) this.scene.remove(s.proj);
      if (c.parts.shuriken) c.parts.shuriken.visible = true; // il en ressort un autre en arrivant
    }

    tickKnightAttack(c, a, el, t, M) {
      if (a.sabre) { this.tickSabreAttack(c, a, el, t, M); return; }
      if (a.customTick) { a.customTick(c, a, el, t, M); return; }
      if (a.style === 'chidori') { this.tickChidori(c, a, el, t, M); return; }
      if (a.style === 'orb') { this.tickOrb(c, a, el, t, M); return; }
      if (a.style === 'fireroll') { this.tickFireroll(c, a, el, t, M); return; }
      if (a.style === 'flameline') { this.tickFlameline(c, a, el, t, M); return; }
      if (a.style === 'judgment') { this.tickJudgment(c, a, el, t, M); return; }
      if (a.style === 'emperorhand') { this.tickEmperorHand(c, a, el, t, M); return; }
      if (a.style === 'enpassant') { this.tickEnPassant(c, a, el, t, M); return; }
      if (a.pre && a.style === 'tunnel-impact') {
        if (this.tickWhirlwind(c, a, el, t, M)) return;
        el -= a.pre;
      }
      const T = this.THREE, white = a.style.startsWith('tunnel') || a.style.startsWith('spin');
      const from = new T.Vector3(a.from.x, 0, a.from.z), target = new T.Vector3(a.target.x, 0, a.target.z);
      const travelEnd = white ? 0.88 : 1.08;
      const u = Math.max(0, Math.min(1, el / travelEnd));
      const pos = from.clone().lerp(target, u);
      const toward = Math.atan2(target.x - from.x, target.z - from.z);
      c.holder.rotation.y = toward;

      if (white) {
        // le forage laisse un trou dans le sol sur la case de départ, puis sur la case d'arrivée
        if (el >= 0.1 && !a.holeFrom) { a.holeFrom = true; this.createCrater(a.from, t); }
        if (el >= travelEnd - 0.1 && !a.holeTo) { a.holeTo = true; this.createCrater(a.target, t); this.shakeUntil = t + 0.15; this.shakeAmp = 0.08; }
        // Le ninja se baisse/disparaît pendant le forage : on ne voit que le chien tourner.
        if (c.parts.riderRoot) c.parts.riderRoot.visible = el >= 1.55;
        if (a.style === 'tunnel-eat') {
          M.animate(c.parts, t, el > 0.9 ? 'idle' : 'run');
          const depth = el < 0.18 ? -1.35 * (el / 0.18) : el < travelEnd - 0.12 ? -1.35 : -1.35 * (1 - (el - (travelEnd - 0.12)) / 0.12);
          c.holder.position.set(pos.x, el < travelEnd ? depth : 0, pos.z);
          c.parts.root.rotation.set(0, 0, el < 1.55 ? el * 31 : 0);
          this.tunnelDust(c, a, t);
          if (c.parts.mountHead) c.parts.mountHead.rotation.x = el > 1.65 ? -0.25 - Math.abs(Math.sin(t * 12)) * 0.35 : 0;
          if (c.parts.mountJaw) c.parts.mountJaw.scale.y = el > 1.65 ? 0.02 + Math.abs(Math.sin(t * 12)) * 0.065 : 0.015;
        } else {
          M.animate(c.parts, t, el > 0.82 ? 'idle' : 'run');
          const depth = el < 0.18 ? -1.35 * (el / 0.18) : el < travelEnd - 0.12 ? -1.35 : -1.35 * (1 - (el - (travelEnd - 0.12)) / 0.12);
          const jump = el < travelEnd ? depth : el < 1.55 ? Math.sin(Math.PI * (el - travelEnd) / (1.55 - travelEnd)) * 0.6 : 0;
          c.holder.position.set(pos.x, jump, pos.z);
          c.parts.root.rotation.set(0, 0, el < 1.55 ? el * 31 : 0);
        }
        if (el >= 0.92 && el < 1.58) {
          const h = (el - 0.92) / 0.3;
          const hit = Math.min(2, Math.floor(h) + 1);
          if (hit > a.hitCount) {
            a.hitCount = hit;
            this.flash(a.target, a.target, hit, 0xffdca0);
          }
          if (c.parts.mountLegs) c.parts.mountLegs.forEach((leg, i) => {
            leg.rotation.x = i % 2 ? -Math.max(0, Math.sin((h % 1) * Math.PI)) * 1.5 : 0;
          });
        } else if (c.parts.mountLegs) c.parts.mountLegs.forEach((leg) => { leg.rotation.x = 0; });
      } else {
        M.animate(c.parts, t, 'run');
        this.trail(c, el > 0.15 && el < 2.1, t);
        this.launchMiniEagles(a, el, t);
        // l'aigle saisit sa proie dans ses serres, monte avec elle puis redescend et l'écrase sur sa case
        const UP = 1.95, DOWN = 2.62, TOP = 2.7, clamp = (x) => Math.max(0, Math.min(1, x));
        if (el < travelEnd) {
          c.holder.position.set(pos.x, Math.sin(Math.PI * u) * 0.9, pos.z);
        } else if (el < UP) {
          const r = clamp((el - travelEnd) / (UP - travelEnd));
          c.holder.position.set(target.x, TOP * r * r * (3 - 2 * r), target.z);
        } else if (el < DOWN) {
          const d = clamp((el - UP) / (DOWN - UP));
          c.holder.position.set(target.x, TOP * (1 - d * d), target.z);
        } else c.holder.position.set(target.x, 0, target.z); // posé sur la proie écrasée
        a.eagleY = c.holder.position.y;
        if (el >= DOWN && !a.craterMade) {
          a.craterMade = true;
          // la case se fissure sous l'impact (les fissures restent jusqu'à la fin de la partie)
          const sq = Math.round(a.target.z + 3.5) * 8 + Math.round(a.target.x + 3.5);
          this.addPermanentCracks(sq, t, this.ply);
          this.shakeUntil = t + 0.45; this.shakeAmp = 0.14;
          if (a.style !== 'eagle-release') {
            this.createCrater(a.target, t);
            this.explode(a, new T.Vector3(a.target.x, 0.38, a.target.z), el, t,
              [0xfff0c8, 0xb98552, 0xffd35a], [0x513b2a, 0x9e7140], false);
          }
        }
        if (el >= 0.92 && !a.eaglesExploded) {
          a.eaglesExploded = true;
          a.eagles && a.eagles.forEach((bird) => { bird.visible = false; });
          this.explode(a, new T.Vector3(a.target.x, 0.52, a.target.z), el, t,
            [0xffffff, 0xe7f4ff, 0xa9dfff], [0xffffff, 0xb9e5ff], true);
          this.shakeUntil = t + 0.25; this.shakeAmp = 0.09;
        }
      }
      if (a.whirl) {
        // le tourbillon suit le chien sous terre, jaillit avec lui puis se dissipe et les rend visibles
        const gone = Math.max(0, Math.min(1, (el - 1.45) / 0.25));
        c.parts.root.visible = gone >= 1;
        if (c.parts.riderRoot) c.parts.riderRoot.visible = gone >= 1;
        a.whirl.visible = gone < 1;
        a.whirl.position.set(c.holder.position.x, c.holder.position.y + 0.42, c.holder.position.z);
        a.whirl.rotation.set(Math.PI / 2, toward, 0);
        a.whirl.scale.setScalar(Math.max(0.01, 1 + gone * 0.6));
        this.spinWhirl(a, t, 1 - gone);
      }
      if (a.boom) this.boomStep(a, el);
    }

    // Onde de puissance d'une pièce liée : colonne d'énergie, double anneau et éclat de lumière sur la cible
    addPowerBurst(at, white, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const color = white ? 0xffd36a : 0xb36bff;
      const glow = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const rings = [0, 1].map((i) => { const r = new T.Mesh(new T.RingGeometry(0.4, 0.62, 48), glow(i ? 0xffffff : color, 0)); r.rotation.x = -Math.PI / 2; r.position.y = 0.05 + i * 0.02; g.add(r); return r; });
      const pillar = new T.Mesh(new T.CylinderGeometry(0.25, 0.5, 4, 24, 1, true), glow(color, 0)); pillar.position.y = 2; g.add(pillar);
      const ball = new T.Mesh(new T.SphereGeometry(0.5, 20, 14), glow(0xffffff, 0)); ball.position.y = 0.7; g.add(ball);
      const light = new T.PointLight(color, 0, 8, 2); light.position.y = 1.2; g.add(light);
      this.addEffect({ start, dur: 1.4, tick: (e, t) => {
        g.visible = true;
        const k = Math.min(1, e / 1.4), f = 1 - k;
        rings.forEach((r, i) => { const w = Math.min(1, (e - i * 0.15) / 0.9); r.scale.setScalar(1 + Math.max(0, w) * (6 + i * 2)); r.material.opacity = w > 0 ? 0.8 * (1 - w) : 0; });
        pillar.material.opacity = 0.45 * f; pillar.scale.set(1 + k, 1, 1 + k);
        ball.material.opacity = e < 0.4 ? 0.8 * (1 - e / 0.4) : 0; ball.scale.setScalar(1 + e * 3);
        light.intensity = 8 * f;
        if (e < 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = Math.max(this.shakeAmp || 0, 0.12); }
      }, end: () => this.disposeGroup(g) });
    }
    // Pièce liée qui attaque : éclairs bleutés qui crépitent autour d'elle jusqu'à l'impact
    addElectricAura(c, start, until) {
      const T = this.THREE, g = new T.Group(); this.scene.add(g);
      const mats = [0xbfe8ff, 0x6fb8ff, 0xffffff].map((color) => new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const bolts = Array.from({ length: 7 }, (_, i) => { const l = new T.Line(new T.BufferGeometry(), mats[i % 3]); g.add(l); return l; });
      const light = new T.PointLight(0x8fd0ff, 0, 4, 2); light.position.y = 0.9; g.add(light);
      const shell = new T.Mesh(new T.SphereGeometry(0.55, 16, 12), new T.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      shell.position.y = 0.75; shell.scale.set(1, 1.5, 1); g.add(shell);
      this.addEffect({ start, dur: until - start, tick: (e, t) => {
        const p = c.holder.position; g.position.set(p.x, p.y, p.z);
        for (const b of bolts) {
          // éclair en zigzag de bas en haut autour du corps, redessiné à chaque image
          if (Math.random() < 0.35) { b.visible = false; continue; }
          b.visible = true;
          const a0 = Math.random() * Math.PI * 2, r = 0.32 + Math.random() * 0.18, pts = [];
          for (let k = 0; k <= 6; k++) {
            const a = a0 + (Math.random() - 0.5) * 0.9, y = 0.1 + k * 0.24;
            pts.push(new T.Vector3(Math.cos(a) * (r + (Math.random() - 0.5) * 0.12), y, Math.sin(a) * (r + (Math.random() - 0.5) * 0.12)));
          }
          b.geometry.dispose(); b.geometry = new T.BufferGeometry().setFromPoints(pts);
        }
        const flick = 0.6 + Math.random() * 0.4;
        light.intensity = 3.5 * flick; shell.material.opacity = 0.12 * flick;
      }, end: () => this.disposeGroup(g) });
    }
    // L'échiquier tremble fort à l'impact d'une pièce liée
    addBoardQuake(start) {
      this.addEffect({ start, dur: 0.75, tick: (e, t) => { this.shakeUntil = t + 0.05; this.shakeAmp = Math.max(this.shakeAmp || 0, 0.28 * (1 - e / 0.75)); }, end: () => {} });
    }
    // Fissures sur la case de la pièce prise : elles restent jusqu'à la fin de la partie
    addPermanentCracks(sq, start, ply) {
      const T = this.THREE, at = this.sqToPos(sq), g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const m = new T.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.85, depthWrite: false });
      const glowM = new T.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glowParts = [];
      const branch = (x, z, ang, len, width, depth) => {
        let px = x, pz = z;
        const n = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          ang += (Math.random() - 0.5) * 0.9;
          const l = len / n, nx = Math.max(-0.49, Math.min(0.49, px + Math.cos(ang) * l)), nz = Math.max(-0.49, Math.min(0.49, pz + Math.sin(ang) * l));
          const dx = nx - px, dz = nz - pz, d = Math.hypot(dx, dz);
          if (d < 0.01) break;
          const w = width * (1 - i / (n + 1));
          const seg = new T.Mesh(new T.PlaneGeometry(d, w), m); seg.rotation.x = -Math.PI / 2; seg.rotation.z = -Math.atan2(dz, dx);
          seg.position.set((px + nx) / 2, 0.021, (pz + nz) / 2); g.add(seg);
          const gl = new T.Mesh(new T.PlaneGeometry(d, w * 2.6), glowM); gl.rotation.copy(seg.rotation); gl.position.copy(seg.position); gl.position.y = 0.022; g.add(gl); glowParts.push(gl);
          if (depth < 2 && Math.random() < 0.4) branch(nx, nz, ang + (Math.random() < 0.5 ? 0.7 : -0.7), len * 0.5, w * 0.7, depth + 1);
          px = nx; pz = nz;
        }
      };
      const arms = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < arms; i++) branch(0, 0, i / arms * Math.PI * 2 + Math.random() * 0.5, 0.42 + Math.random() * 0.12, 0.035, 0);
      const pit = new T.Mesh(new T.CircleGeometry(0.07, 12), m); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.021; g.add(pit);
      (this.boardCracks = this.boardCracks || []).push({ object: g, ply });
      // les fissures apparaissent à l'impact avec une lueur électrique qui s'éteint
      this.addEffect({ start, dur: 1.2, tick: (e) => { g.visible = true; glowM.opacity = 0.8 * Math.max(0, 1 - e / 1.2); }, end: () => { g.visible = true; glowParts.forEach((x) => g.remove(x)); } });
    }
    // Combat rapproché : la pièce range son arme et se bat aux poings et aux pieds
    brawlMode(c, on) {
      const p = c.parts;
      if (on && p.savedWeapon === undefined) {
        p.savedWeapon = p.weapon; p.weapon = 'brawl'; p.noWall = true;
        if (p.blade) p.blade.visible = false;
      } else if (!on && p.savedWeapon !== undefined) {
        p.weapon = p.savedWeapon; p.savedWeapon = undefined; p.noWall = false;
        if (p.blade) p.blade.visible = true;
      }
    }
    // Effets passagers posés dans la scène : { start, dur, tick(e, t), end() }
    addEffect(fx) { (this.effects = this.effects || []).push(fx); return fx; }
    tickEffects(t) {
      if (this.overlay) for (const g of this.overlay.children) {
        if (g.userData.pulse == null) continue;
        const k = 0.5 + 0.5 * Math.sin(t * 4 + g.userData.pulse);
        g.children[0].material.opacity = 0.35 + k * 0.5;
        g.children[0].scale.setScalar(0.92 + k * 0.16);
        g.children[1].material.opacity = 0.06 + k * 0.12;
      }
      if (!this.effects || !this.effects.length) return;
      // un effet peut en créer un autre pendant son tick (roquette tirée par l'escorte) : on ne le perd pas
      const list = this.effects; this.effects = [];
      const keep = list.filter((fx) => {
        const e = t - fx.start;
        if (e < 0) return true;
        fx.tick(e, t);
        if (e >= fx.dur) { fx.end(); return false; }
        return true;
      });
      this.effects = keep.concat(this.effects);
    }
    disposeGroup(g) {
      this.scene.remove(g);
      g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    // Roque : dôme protecteur, blanc ou noir selon le camp, qui s'efface en quelques secondes
    addCastleDome(at, white, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const color = white ? 0xdff2ff : 0x7a3ad0;
      const shell = new T.Mesh(new T.SphereGeometry(1.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      const grid = new T.Mesh(new T.IcosahedronGeometry(1.27, 2), new T.MeshBasicMaterial({ color: white ? 0xffffff : 0xb98cff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      const ring = new T.Mesh(new T.RingGeometry(1.15, 1.3, 48), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
      const clip = new T.Plane(new T.Vector3(0, 1, 0), 0);
      grid.material.clippingPlanes = [clip]; this.renderer.localClippingEnabled = true;
      g.add(shell, grid, ring);
      this.addEffect({ start, dur: 3.2, tick: (e, t) => {
        g.visible = true;
        const rise = Math.min(1, e / 0.35), fade = 1 - Math.max(0, Math.min(1, (e - 2.2) / 1.0));
        g.scale.set(1, Math.max(0.01, rise), 1);
        shell.material.opacity = 0.28 * fade + (e < 0.35 ? 0.25 * (1 - e / 0.35) : 0);
        grid.material.opacity = (0.22 + Math.abs(Math.sin(t * 6)) * 0.12) * fade;
        grid.rotation.y = t * 0.6;
        ring.material.opacity = 0.6 * fade; ring.scale.setScalar(1 + Math.sin(t * 5) * 0.03);
      }, end: () => this.disposeGroup(g) });
    }
    // Promotion : colonne de lumière, la nouvelle pièce grandit dans la lumière avec son aura ; la dame déclenche une onde d'énergie
    addPromotionFx(c, at, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const white = c.piece === c.piece.toUpperCase(), queen = c.piece.toLowerCase() === 'q';
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const column = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 6, 24, 1, true), glow(white ? 0xfff4c8 : 0xd7b8ff, 0));
      column.position.y = 3;
      const core = new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 6, 16, 1, true), glow(0xffffff, 0));
      core.position.y = 3;
      const base = new T.Mesh(new T.RingGeometry(0.2, 0.6, 40), glow(white ? 0xffd65a : 0xb07cff, 0));
      base.rotation.x = -Math.PI / 2; base.position.y = 0.03;
      const motes = [];
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), glow(i % 2 ? 0xffffff : white ? 0xffe28a : 0xc9a0ff, 0.9));
        m.userData = { a: i * 2.399, h: (i % 8) * 0.25 }; motes.push(m); g.add(m);
      }
      const wave = new T.Mesh(new T.SphereGeometry(0.5, 24, 16), glow(white ? 0xfff0b0 : 0xc39bff, 0));
      wave.position.y = 0.6; wave.visible = queen;
      const shock = new T.Mesh(new T.RingGeometry(0.5, 0.7, 48), glow(0xffffff, 0));
      shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05; shock.visible = queen;
      g.add(column, core, base, wave, shock);
      const light = new T.PointLight(white ? 0xffe9b0 : 0xc59bff, 0, 6, 2); light.position.y = 1.2; g.add(light);
      const baseScale = c.parts.root.scale.x;
      c.parts.root.scale.setScalar(baseScale * 0.6); // encore à la taille d'un pion pendant son dernier pas
      this.addEffect({ start, dur: 2.0, tick: (e, t) => {
        g.visible = true;
        const inn = Math.min(1, e / 0.3), out = 1 - Math.max(0, Math.min(1, (e - 1.4) / 0.6));
        column.material.opacity = 0.2 * inn * out; core.material.opacity = 0.3 * inn * out;
        column.scale.set(1 + Math.sin(t * 9) * 0.04, 1, 1 + Math.sin(t * 9) * 0.04);
        base.material.opacity = 0.8 * inn * out; base.scale.setScalar(1 + e * 0.4);
        motes.forEach((m) => { const a = m.userData.a + t * 4, r = 0.35 + Math.sin(t * 3 + m.userData.a) * 0.06; m.position.set(Math.cos(a) * r, (m.userData.h + e * 1.2) % 2.2, Math.sin(a) * r); m.material.opacity = 0.9 * out; });
        // la pièce s'éveille : elle grandit dans la lumière
        const grow = e < 1.1 ? 0.6 + 0.4 * (1 - Math.pow(1 - e / 1.1, 3)) : 1;
        c.parts.root.scale.setScalar(baseScale * grow * (e > 1.0 && e < 1.3 ? 1 + Math.sin((e - 1.0) / 0.3 * Math.PI) * 0.12 : 1));
        if (queen && e > 1.0) {
          const w = Math.min(1, (e - 1.0) / 0.6);
          wave.scale.setScalar(1 + w * 5); wave.material.opacity = 0.5 * (1 - w);
          shock.scale.setScalar(1 + w * 6); shock.material.opacity = 0.7 * (1 - w);
          if (e < 1.15) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.1; }
        }
        light.intensity = 3.5 * inn * out;
      }, end: () => { c.parts.root.scale.setScalar(baseScale); this.disposeGroup(g); } });
    }
    // Prise en passant : le pion passe en un éclair à côté de sa cible et la fauche
    tickEnPassant(c, a, el, t, M) {
      const T = this.THREE, dash0 = 0.25, dash1 = 0.5;
      const u = Math.max(0, Math.min(1, (el - dash0) / (dash1 - dash0)));
      const e2 = u * u * (3 - 2 * u);
      c.holder.position.set(a.from.x + (a.to.x - a.from.x) * e2, 0, a.from.z + (a.to.z - a.from.z) * e2);
      c.holder.rotation.y = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
      if (el < dash0) M.animate(c.parts, t, 'guard', 1);
      else if (el < dash1 + 0.1) { M.animate(c.parts, t, 'run'); this.trail(c, true, t); }
      else M.animate(c.parts, t, el < 1.2 ? 'punch' : 'idle', el < 1.2 ? 0.5 : 0);
      if (!a.slash) {
        // trait de lumière qui fend l'air au passage
        a.slash = new T.Mesh(new T.PlaneGeometry(1.2, 0.05), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        a.slash.position.set((a.target.x + a.to.x) / 2, 0.75, (a.target.z + a.to.z) / 2);
        a.slash.rotation.set(0, Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z) + Math.PI / 2, 0.4);
        this.fx(a, a.slash);
      }
      const s = el - (dash0 + dash1) / 2 - 0.05;
      a.slash.material.opacity = s > 0 && s < 0.35 ? 1 - s / 0.35 : 0;
      a.slash.scale.set(1 + Math.max(0, s) * 2, 1, 1);
      if (s > 0 && s < 0.1) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.05; }
    }
    // La tête de la cible tombe au sol et roule ; le corps reste debout
    tickEnPassantVictim(d, a, c, el, t, M) {
      const T = this.THREE, cut = 0.42;
      c.holder.position.set(a.target.x, 0, a.target.z);
      if (el < cut) { M.animate(c.parts, t, 'idle'); return el < a.duration; }
      const head = c.parts.head;
      if (head && !a.headClone) {
        head.updateWorldMatrix(true, true);
        const pos = new T.Vector3(), quat = new T.Quaternion(), scl = new T.Vector3();
        head.matrixWorld.decompose(pos, quat, scl);
        // copie visuelle de la tête (clone() échoue : userData.char est circulaire)
        const copy = (o) => {
          const n = o.isMesh ? new T.Mesh(o.geometry, o.material) : new T.Group();
          n.position.copy(o.position); n.quaternion.copy(o.quaternion); n.scale.copy(o.scale); n.visible = o.visible;
          o.children.forEach((ch) => n.add(copy(ch)));
          return n;
        };
        const clone = copy(head); clone.visible = true;
        clone.position.copy(pos); clone.quaternion.copy(quat); clone.scale.copy(scl);
        this.scene.add(clone);
        head.visible = false;
        a.headClone = clone; a.headY = pos.y; a.headQuat = quat.clone();
        const dir = new T.Vector3(a.to.x - a.from.x, 0, a.to.z - a.from.z).normalize();
        a.headVel = { x: dir.x * 0.9 + (Math.random() - 0.5) * 0.3, y: 0.8, z: dir.z * 0.9 + (Math.random() - 0.5) * 0.3 };
        a.headRest = 0.06 * scl.y / 0.5;
      }
      // le corps reste figé debout
      if (a.headClone) {
        const h = a.headClone, f = el - cut;
        const ground = Math.max(0.06, a.headRest || 0.08);
        if (!a.headLanded) {
          h.position.x = a.target.x + a.headVel.x * f + (h.position.x - h.position.x);
          h.position.z = a.target.z + a.headVel.z * f;
          h.position.y = a.headY + a.headVel.y * f - 4.9 * f * f;
          h.rotation.set(f * 9, f * 3, f * 5);
          if (h.position.y <= ground) { h.position.y = ground; a.headLanded = el; a.landX = h.position.x; a.landZ = h.position.z; this.shakeUntil = t + 0.04; this.shakeAmp = 0.03; }
        } else {
          // petite roulade avant de s'arrêter
          const r = Math.min(1, (el - a.headLanded) / 0.6), k = 1 - (1 - r) * (1 - r);
          h.position.set(a.landX + a.headVel.x * 0.35 * k, ground, a.landZ + a.headVel.z * 0.35 * k);
          h.rotation.z += (1 - r) * 0.25;
        }
      }
      if (el >= a.duration) {
        if (a.headClone) { this.scene.remove(a.headClone); a.headClone = null; }
        return false;
      }
      return true;
    }
    // Partie nulle : les deux rois marchent au centre et se saluent, les autres pièces se rangent derrière leur roi
    planDrawFormation(now) {
      const start = Math.max(now, this.busyUntil || now) + 0.4;
      const order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
      let planned = false;
      for (const side of ['w', 'b']) {
        const sign = side === 'w' ? 1 : -1;
        const list = [...this.chars.entries()].filter(([, c]) => (c.piece === c.piece.toUpperCase() ? 'w' : 'b') === side);
        const king = list.find(([, c]) => c.piece.toLowerCase() === 'k');
        const others = list.filter(([, c]) => c.piece.toLowerCase() !== 'k').sort((x, y) => order[x[1].piece.toLowerCase()] - order[y[1].piece.toLowerCase()] || x[0] - y[0]);
        if (king) {
          const c = king[1];
          if (!c.drawTo) { const p = this.sqToPos(king[0]); c.drawFrom = { x: p.x, z: p.z }; c.drawTo = { x: 0, z: 0.55 * sign }; c.drawAt = start; c.drawFace = sign > 0 ? Math.PI : 0; c.drawKing = true; planned = true; }
        }
        const rows = [others.filter(([, c]) => c.piece.toLowerCase() !== 'p'), others.filter(([, c]) => c.piece.toLowerCase() === 'p')].filter((r) => r.length);
        rows.forEach((row, ri) => {
          row.forEach(([sq, c], i) => {
            if (c.drawTo) return;
            const p = this.sqToPos(sq), x = (i - (row.length - 1) / 2) * 0.85;
            c.drawFrom = { x: p.x, z: p.z }; c.drawTo = { x, z: (1.65 + ri * 1.0) * sign };
            c.drawAt = start + 0.15 + ri * 0.2 + Math.abs(x) * 0.05; c.drawFace = sign > 0 ? Math.PI : 0; planned = true;
          });
        });
      }
      if (planned) this.busyUntil = Math.max(this.busyUntil || now, start + 2.4);
    }
    tickDrawFormation(c, t, M) {
      const e = t - c.drawAt, dur = 1.6;
      const u = Math.max(0, Math.min(1, e / dur)), k = u * u * (3 - 2 * u);
      const x = c.drawFrom.x + (c.drawTo.x - c.drawFrom.x) * k, z = c.drawFrom.z + (c.drawTo.z - c.drawFrom.z) * k;
      c.holder.position.set(x, 0, z);
      if (e > 0 && u < 1) {
        const dx = c.drawTo.x - c.drawFrom.x, dz = c.drawTo.z - c.drawFrom.z;
        if (Math.hypot(dx, dz) > 0.01) c.holder.rotation.y = Math.atan2(dx, dz);
        M.animate(c.parts, t, 'run');
        return;
      }
      c.holder.rotation.y = c.drawFace;
      M.animate(c.parts, t, 'idle');
      if (e <= 0) return;
      // les rois se saluent, les autres baissent la tête
      const after = e - dur;
      if (c.drawKing) {
        const bow = after > 0.2 && after < 1.6 ? Math.sin((after - 0.2) / 1.4 * Math.PI) : 0;
        if (c.parts.torso) c.parts.torso.rotation.x = 0.6 * bow;
      } else if (c.parts.head) c.parts.head.rotation.x = 0.35 * Math.min(1, after / 0.5);
    }
    // Ciel qui passe du jour au coucher de soleil puis à la nuit au fil de la partie
    tickDayNight(t, dt) {
      const T = this.THREE;
      const ply = this.ply == null ? 0 : this.ply;
      const sunsetT = Math.max(0, Math.min(1, (ply - 30) / 40)), nightT = Math.max(0, Math.min(1, (ply - 70) / 40));
      // transition douce d'une valeur à l'autre (retour en arrière dans un replay compris)
      const ease = 1 - Math.exp(-dt * 1.5);
      this.sunset = (this.sunset || 0) + (sunsetT - (this.sunset || 0)) * ease;
      this.night = (this.night || 0) + (nightT - (this.night || 0)) * ease;
      if (!this.nightSky) {
        const g = new T.Group(), n = 260, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, el = 0.15 + Math.random() * 1.25, r = 55;
          pos[i * 3] = Math.cos(a) * Math.cos(el) * r; pos[i * 3 + 1] = Math.sin(el) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        const stars = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0, fog: false, depthWrite: false }));
        const moon = new T.Mesh(new T.SphereGeometry(2.2, 24, 16), new T.MeshBasicMaterial({ color: 0xf4f1df, transparent: true, opacity: 0, fog: false }));
        moon.position.set(-24, 26, -38);
        const halo = new T.Mesh(new T.SphereGeometry(3.6, 24, 16), new T.MeshBasicMaterial({ color: 0xbfcfff, transparent: true, opacity: 0, fog: false, blending: T.AdditiveBlending, depthWrite: false }));
        halo.position.copy(moon.position);
        g.add(stars, moon, halo); this.scene.add(g);
        this.nightSky = { g, stars, moon, halo };
      }
      const ns = this.nightSky, n = this.night;
      ns.g.visible = n > 0.01;
      ns.stars.material.opacity = n * (0.75 + Math.sin(t * 2) * 0.05);
      ns.moon.material.opacity = n; ns.halo.material.opacity = 0.18 * n;
      const u = this.mateUltimate;
      if (!this.skyBase || (u && u.apocalypse)) return;
      const sky = this.skyBase.clone().lerp(new T.Color(0xe08a5c), this.sunset * (1 - n) * 0.55).lerp(new T.Color(0x0a1024), n * 0.85);
      const dim = this.skyDim || 0;
      if (dim > 0) sky.lerp(new T.Color(0x05070d), dim * 0.9);
      if (this.scene.background && this.scene.background.isColor) this.scene.background.copy(sky);
      if (this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(sky);
      if (this.backdrop) this.backdrop.material.color.copy(this.backdropTint || new T.Color(0xffffff)).lerp(new T.Color(0xe8a070), this.sunset * (1 - n) * 0.4).multiplyScalar(1 - 0.75 * n - 0.6 * dim);
      if (this.sun && this.sunset * (1 - n) > 0.005) this.sun.color.setRGB(1, 1 - this.sunset * (1 - n) * 0.25, 1 - this.sunset * (1 - n) * 0.45);
    }

    // Cavalier blanc : le chien et son ninja tournent sur eux-mêmes et se changent en tourbillon de vent
    tickWhirlwind(c, a, el, t, M) {
      const T = this.THREE;
      if (!a.whirl) {
        // tourbillon couché à l'horizontale dans l'axe de l'attaque, anneaux fermés et serrés
        a.whirl = new T.Group(); a.whirl.rotation.order = 'YXZ';
        a.whirlBands = [];
        for (let i = 0; i < 7; i++) {
          const r = 0.2 + Math.abs(i - 3) * 0.035;
          const band = new T.Mesh(new T.TorusGeometry(r, 0.026, 6, 32, Math.PI * 1.9),
            new T.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xd9ecf5, transparent: true, opacity: 0.75, depthWrite: false, side: T.DoubleSide }));
          band.rotation.x = Math.PI / 2; band.position.y = (i - 3) * 0.13;
          band.userData = { speed: 9 + i * 1.5, phase: i * 0.9 };
          a.whirl.add(band); a.whirlBands.push(band);
        }
        a.whirlBits = [];
        for (let i = 0; i < 14; i++) {
          const bit = new T.Mesh(new T.PlaneGeometry(0.07, 0.04), new T.MeshBasicMaterial({ color: i % 3 ? 0xcfe6c4 : 0xb7a57a, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
          bit.userData = { a: i * 2.399, h: ((i % 7) - 3) * 0.13, r: 0.2 + (i % 3) * 0.05 };
          a.whirl.add(bit); a.whirlBits.push(bit);
        }
        a.whirl.scale.setScalar(0.01);
        this.fx(a, a.whirl);
      }
      if (el >= a.pre) return false;
      const k = el / a.pre;
      c.holder.position.set(a.from.x, 0, a.from.z);
      c.holder.rotation.y = Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z);
      M.animate(c.parts, t, 'run');
      // ils tournent de plus en plus vite, puis disparaissent dans le vent
      c.parts.root.rotation.set(0, k * k * 30, 0);
      c.parts.root.visible = k < 0.75;
      if (c.parts.riderRoot) c.parts.riderRoot.visible = k < 0.75;
      a.whirl.visible = true;
      a.whirl.position.set(a.from.x, 0.42, a.from.z);
      a.whirl.rotation.set(Math.PI / 2, Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z), 0);
      a.whirl.scale.setScalar(Math.max(0.01, Math.min(1, k * 1.4)));
      this.spinWhirl(a, t, 1);
      return true;
    }
    spinWhirl(a, t, fade) {
      a.whirlBands.forEach((b) => {
        b.rotation.z = t * b.userData.speed + b.userData.phase;
        b.material.opacity = (0.45 + Math.abs(Math.sin(t * 7 + b.userData.phase)) * 0.35) * fade;
      });
      a.whirlBits.forEach((bit, i) => {
        const d = bit.userData, ang = d.a + t * (8 + (i % 3));
        bit.position.set(Math.cos(ang) * d.r, d.h + Math.sin(t * 5 + i) * 0.05, Math.sin(ang) * d.r);
        bit.rotation.set(t * 6 + i, t * 4, 0);
        bit.material.opacity = 0.85 * fade;
      });
    }

    tunnelDust(c, a, t) {
      const T = this.THREE;
      if (!a.dust) {
        a.dust = new T.Group();
        for (let i = 0; i < 9; i++) {
          const dust = new T.Mesh(new T.SphereGeometry(0.09 + (i % 3) * 0.035, 7, 5),
            new T.MeshBasicMaterial({ color: i % 2 ? 0x9c7448 : 0xd0ae7a, transparent: true, opacity: 0.55, depthWrite: false }));
          dust.userData.phase = i * Math.PI * 2 / 9;
          a.dust.add(dust);
        }
        this.fx(a, a.dust);
      }
      const p = c.holder.position;
      a.dust.children.forEach((dust, i) => {
        const angle = dust.userData.phase + t * 12;
        const r = 0.3 + Math.sin(t * 17 + i) * 0.08;
        dust.position.set(p.x + Math.cos(angle) * r, 0.04 + (i % 3) * 0.12, p.z + Math.sin(angle) * r);
        dust.scale.setScalar(0.7 + Math.max(0, Math.sin(t * 14 + i)) * 0.7);
      });
    }

    makeMiniEagle() {
      const T = this.THREE, bird = new T.Group();
      const white = new T.MeshBasicMaterial({ color: 0xf6fbff });
      const cream = new T.MeshBasicMaterial({ color: 0xdceaf4 });
      const gold = new T.MeshBasicMaterial({ color: 0xffce42 });
      const ball = (parent, material, x, y, z, sx, sy, sz) => {
        const m = new T.Mesh(new T.SphereGeometry(1, 8, 6), material);
        m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
      };
      ball(bird, white, 0, 0, 0, 0.12, 0.09, 0.2);
      ball(bird, white, 0, 0.06, 0.17, 0.09, 0.08, 0.09);
      const beak = new T.Mesh(new T.ConeGeometry(0.035, 0.11, 5), gold);
      beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.02, 0.27); bird.add(beak);
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.07, 0.035, -0.01); wing.userData.side = side;
        ball(wing, white, side * 0.1, 0, 0, 0.15, 0.025, 0.075);
        for (let i = 0; i < 3; i++) ball(wing, cream, side * (0.16 + i * 0.025), -0.01, -0.04 + i * 0.045, 0.085, 0.018, 0.025);
        bird.add(wing); wings.push(wing);
      }
      bird.userData.wings = wings;
      return bird;
    }

    launchMiniEagles(a, el, t) {
      const T = this.THREE;
      if (!a.eagles) {
        a.eagles = [this.makeMiniEagle(), this.makeMiniEagle()];
        a.eagles.forEach((bird) => this.fx(a, bird));
      }
      const start = new T.Vector3(a.from.x, 0.75, a.from.z);
      const end = new T.Vector3(a.target.x, 0.62, a.target.z);
      a.eagles.forEach((bird, i) => {
        const u = Math.max(0, Math.min(1, (el - i * 0.12) / 0.8));
        const p = start.clone().lerp(end, u);
        p.y += Math.sin(Math.PI * u) * 0.85 + (i ? 0.2 : 0);
        bird.position.copy(p); bird.lookAt(end);
        bird.userData.wings.forEach((w) => { w.rotation.z = w.userData.side * Math.sin(t * 34 + i) * 0.9; });
      });
    }

    // Éclair en zigzag entre deux points (géométrie réutilisée, points retirés à chaque image)
    zigzag(line, p0, p1, jitter) {
      const pos = line.geometry.attributes.position, n = pos.count;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), j = i === 0 || i === n - 1 ? 0 : jitter;
        pos.setXYZ(i, p0.x + (p1.x - p0.x) * f + (Math.random() - 0.5) * j, p0.y + (p1.y - p0.y) * f + (Math.random() - 0.5) * j, p0.z + (p1.z - p0.z) * f + (Math.random() - 0.5) * j);
      }
      pos.needsUpdate = true;
    }
    makeChidoriFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const bolt = (color, n) => add(new T.Line(
        new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)),
        new T.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
      ));
      a.ball = add(new T.Mesh(new T.SphereGeometry(0.1, 16, 12), new T.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
      a.glow = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), new T.MeshBasicMaterial({ color: 0x4fb4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      a.ball.add(a.glow);
      a.handBolts = Array.from({ length: 6 }, (_, i) => bolt(i % 2 ? 0xffffff : 0x7fd0ff, 5));
      a.trailBolts = Array.from({ length: 3 }, () => bolt(0x9fdcff, 9));
      a.victimBolts = Array.from({ length: 7 }, (_, i) => bolt(i % 3 ? 0x8fd8ff : 0xffffff, 7));
      a.skyBolts = Array.from({ length: 2 }, () => bolt(0xe6f6ff, 11));
      a.light = add(new T.PointLight(0x7fc8ff, 0, 6, 2));
      a.sky = {
        background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
        fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
        sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
      };
      a.hand = new T.Vector3(); a.tmp = new T.Vector3(); a.tmp2 = new T.Vector3();
    }
    restoreSky(a) {
      if (a.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(a.sky.background);
      if (a.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(a.sky.fog);
      if (!this.weather) { this.sun.intensity = a.sky.sun; this.hemi.intensity = a.sky.hemi; }
      this.renderer.toneMappingExposure = a.sky.exposure;
      a.sky = null; this.skyDim = 0;
    }
    // Fou noir : charge d'éclairs, course, transpercement ; le ciel s'assombrit pendant toute l'attaque
    tickChidori(c, a, el, t, M) {
      const T = this.THREE;
      if (!a.ball) this.makeChidoriFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const stop = { x: to.x - dir.x * 0.32, z: to.z - dir.z * 0.32 };
      const runEnd = 0.7 + a.run, release = a.pierce + 1.35;
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      // Le ciel s'assombrit dès la charge et revient à la fin
      const dim = clamp(el / 0.45) * (1 - clamp((el - (a.duration - 0.55)) / 0.5));
      if (a.sky) {
        this.skyDim = dim;
        const night = new T.Color(0x05070d);
        if (a.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(a.sky.background).lerp(night, dim * 0.9);
        if (a.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(a.sky.fog).lerp(night, dim * 0.85);
        // Sans météo, l'éclairage n'est pas recalculé à chaque image : on l'assombrit ici
        if (!this.weather) { this.sun.intensity = a.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = a.sky.hemi * (1 - 0.75 * dim); }
        this.renderer.toneMappingExposure = a.sky.exposure * (1 - 0.5 * dim);
      }
      if (el < 0.7) {
        // Charge : la main droite crépite d'éclairs
        M.animate(c.parts, t, 'cast', clamp(el / 0.3));
        c.parts.armR.rotation.set(-0.6, 0, 0.9);
        c.holder.position.set(from.x, 0, from.z);
      } else if (el < runEnd) {
        const u = (el - 0.7) / a.run;
        M.animate(c.parts, t, 'run');
        c.parts.armR.rotation.set(0.9, 0, 0.35); // main chargée tenue en arrière pendant la course
        c.parts.torso.rotation.x = 0.35;
        c.holder.position.set(from.x + (stop.x - from.x) * u, 0, from.z + (stop.z - from.z) * u);
        this.trail(c, true, t);
      } else if (el < a.duration - 0.35) {
        // Transpercement : bras tendu dans la cible, puis il retire sa main
        M.animate(c.parts, t, 'idle');
        const hold = el < release;
        c.parts.armR.rotation.set(hold ? -1.55 : -0.5, 0, hold ? 0.05 : 0.3);
        c.parts.torso.rotation.x = hold ? 0.22 : 0;
        c.holder.position.set(stop.x, 0, stop.z);
      } else {
        // Il prend la case de la victime disparue
        const u = clamp((el - (a.duration - 0.35)) / 0.35);
        M.animate(c.parts, t, 'run');
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      }
      c.parts.armR.updateMatrixWorld(true);
      a.hand.set(0, -0.24, 0); c.parts.armR.localToWorld(a.hand);
      const pulse = 0.8 + Math.abs(Math.sin(t * 37)) * 0.4;
      const grow = clamp(el / 0.5) * (el < release ? 1 : 1 - clamp((el - release) / 0.3));
      a.ball.position.copy(a.hand);
      a.ball.scale.setScalar(Math.max(0.01, grow * pulse * (el > runEnd ? 1.3 : 1)));
      a.ball.material.opacity = grow * 0.95; a.glow.material.opacity = grow * 0.45;
      const tmp = a.tmp, tmp2 = a.tmp2;
      for (const line of a.handBolts) {
        line.material.opacity = grow > 0.05 && Math.random() < 0.8 ? grow : 0;
        const ang = Math.random() * Math.PI * 2, reach = 0.25 + Math.random() * 0.2;
        tmp.set(a.hand.x + Math.cos(ang) * reach, a.hand.y + (Math.random() - 0.3) * 0.5, a.hand.z + Math.sin(ang) * reach);
        this.zigzag(line, a.hand, tmp, 0.09);
      }
      // Traînée d'éclairs pendant la course
      a.trailBolts.forEach((line, i) => {
        const on = el >= 0.7 && el < runEnd + 0.15;
        line.material.opacity = on ? 0.85 : 0;
        if (!on) return;
        tmp2.set(c.holder.position.x, 0.45 + i * 0.1, c.holder.position.z);
        tmp.set(from.x, 0.35 + i * 0.12, from.z).lerp(tmp2, 0.55);
        this.zigzag(line, tmp, tmp2, 0.12);
      });
      // Électrocution de la cible, et la foudre qui tombe du ciel sombre
      const shock = el >= runEnd && el < a.pierce + 1.4;
      for (const line of a.victimBolts) {
        line.material.opacity = shock && Math.random() < 0.85 ? 0.95 : 0;
        if (!line.material.opacity) continue;
        const ang = Math.random() * Math.PI * 2;
        tmp2.set(to.x + (Math.random() - 0.5) * 0.2, 0.2 + Math.random(), to.z + (Math.random() - 0.5) * 0.2);
        tmp.set(to.x + Math.cos(ang) * 0.5, 0.75 + (Math.random() - 0.5) * 1.1, to.z + Math.sin(ang) * 0.5);
        this.zigzag(line, tmp2, tmp, 0.12);
      }
      a.skyBolts.forEach((line, i) => {
        const beat = (el - runEnd - i * 0.17) % 0.42;
        const on = shock && beat >= 0 && beat < 0.09;
        line.material.opacity = on ? 1 : 0;
        if (on) this.zigzag(line, tmp.set(to.x + (i - 0.5) * 0.8, 9, to.z - 0.5), tmp2.set(to.x, 0.9, to.z), 0.7);
      });
      if (shock) a.light.position.set(to.x, 1.1, to.z); else a.light.position.copy(a.hand);
      a.light.intensity = shock ? 4 + Math.random() * 6 : grow * (1.5 + Math.random() * 1.5);
      if (shock && Math.random() < 0.3) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.04; }
      if (el >= a.duration) this.endShot(a);
    }
    // Fou blanc : boule d'énergie blanche tenue en main, course, frappe, la boule grossit et projette la cible
    makeOrbFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      a.orb = add(new T.Group());
      a.orb.add(new T.Mesh(new T.SphereGeometry(1, 20, 14), glow(0xffffff, 0.95)));
      a.orb.add(new T.Mesh(new T.SphereGeometry(1.45, 20, 14), glow(0xbfe4ff, 0.35)));
      a.rings = [0, 1, 2].map((i) => {
        const ring = new T.Mesh(new T.TorusGeometry(1.15, 0.07, 6, 32), glow(i === 1 ? 0xdff2ff : 0xffffff, 0.7));
        ring.rotation.set(i * 1.1, i * 0.7, 0); a.orb.add(ring); return ring;
      });
      a.blast = add(new T.Mesh(new T.RingGeometry(0.3, 0.45, 40), glow(0xe8f6ff, 0)));
      a.blast.rotation.x = -Math.PI / 2;
      a.light = add(new T.PointLight(0xdcefff, 0, 5, 2));
      a.hand = new T.Vector3();
    }
    tickOrb(c, a, el, t, M) {
      if (!a.orb) this.makeOrbFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const stop = { x: to.x - dir.x * 0.42, z: to.z - dir.z * 0.42 };
      const runEnd = 0.5 + a.run, hit = runEnd, burst = hit + 0.5;
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      if (el < 0.5) {
        // La boule se forme dans la main droite
        M.animate(c.parts, t, 'cast', clamp(el / 0.3));
        c.parts.armR.rotation.set(-1.2, 0, 0.5);
        c.holder.position.set(from.x, 0, from.z);
      } else if (el < runEnd) {
        M.animate(c.parts, t, 'run');
        c.parts.armR.rotation.set(-1.0, 0, 0.6); // boule tenue sur le côté pendant la course
        const u = (el - 0.5) / a.run;
        c.holder.position.set(from.x + (stop.x - from.x) * u, 0, from.z + (stop.z - from.z) * u);
        if (c.parts.fast) this.trail(c, true, t);
      } else if (el < a.duration - 0.35) {
        // Frappe bras tendu, puis le bras reste en avant pendant l'explosion
        M.animate(c.parts, t, 'idle');
        c.parts.armR.rotation.set(-1.6, 0, 0.05);
        c.parts.torso.rotation.x = 0.2;
        c.holder.position.set(stop.x, 0, stop.z);
      } else {
        const u = clamp((el - (a.duration - 0.35)) / 0.35);
        M.animate(c.parts, t, 'run');
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      }
      c.parts.armR.updateMatrixWorld(true);
      a.hand.set(0, -0.26, 0); c.parts.armR.localToWorld(a.hand);
      // Taille : petite en main, elle grossit au contact puis éclate
      const form = clamp(el / 0.45), grow = clamp((el - hit) / 0.45), pop = clamp((el - burst) / 0.3);
      const size = (0.09 + form * 0.05 + grow * 0.32) * (1 + pop * 0.8);
      a.orb.visible = pop < 1;
      a.orb.position.copy(a.hand);
      if (el >= hit) a.orb.position.lerp({ x: to.x - dir.x * 0.05, y: 0.75, z: to.z - dir.z * 0.05 }, grow * 0.6);
      a.orb.scale.setScalar(Math.max(0.001, size));
      a.orb.children[0].material.opacity = 0.95 * (1 - pop);
      a.orb.children[1].material.opacity = (0.3 + Math.abs(Math.sin(t * 25)) * 0.15) * (1 - pop);
      a.rings.forEach((ring, i) => { ring.rotation.x += 0.35 + i * 0.1; ring.rotation.y += 0.27 - i * 0.05; ring.material.opacity = 0.7 * (1 - pop); });
      a.blast.position.set(to.x, 0.04, to.z);
      a.blast.material.opacity = el >= burst ? 0.85 * (1 - clamp((el - burst) / 0.6)) : 0;
      a.blast.scale.setScalar(1 + clamp((el - burst) / 0.6) * 7);
      a.light.position.copy(a.orb.position);
      a.light.intensity = (el >= burst ? 7 * (1 - pop) : 1 + form + grow * 4) * (pop >= 1 ? 0 : 1);
      if (el >= burst && el < burst + 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.1; }
      if (el >= a.duration) this.endShot(a);
    }
    // Cible du fou blanc : encaisse la boule, puis projetée loin derrière elle, dans l'axe de l'attaque
    tickOrbVictim(d, a, c, el, t, M) {
      const hit = 0.5 + a.run, launch = hit + 0.45;
      const p = a.target;
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hit) { c.holder.position.set(p.x, 0, p.z); M.animate(c.parts, t, 'guard', 1); return true; }
      if (el < launch) {
        // Repoussée par la boule qui grossit contre elle
        M.animate(c.parts, t, 'ko', 1);
        const push = (el - hit) / (launch - hit);
        c.holder.position.set(p.x + a.dir.x * push * 0.25, 0, p.z + a.dir.z * push * 0.25);
        c.parts.root.rotation.set(-0.5 * push, 0, Math.sin(t * 40) * 0.08);
        return true;
      }
      const u = Math.max(0, Math.min(1, (el - launch) / (a.duration - 0.35 - launch)));
      M.animate(c.parts, t, 'ko', 1);
      c.holder.position.set(p.x + a.dir.x * (0.25 + u * 7.5), Math.sin(Math.PI * u) * 2.2, p.z + a.dir.z * (0.25 + u * 7.5));
      c.parts.root.rotation.set(-0.5 - u * 9, u * 4, u * 6);
      c.parts.root.scale.setScalar(d.base * (1 - u * 0.6));
      if (u >= 1) c.holder.visible = false;
      return el < a.duration;
    }
    // Tour blanche : transformation en boule de feu, roulade éclair avec traînée de flammes, percussion
    makeFirerollFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
      a.ball = add(new T.Group());
      a.ball.add(new T.Mesh(new T.SphereGeometry(0.34, 20, 16), glow(0xff8a1c, 0.95)));
      a.ball.add(new T.Mesh(new T.SphereGeometry(0.2, 16, 12), glow(0xffe08a, 1)));
      a.spikes = [];
      for (let i = 0; i < 16; i++) {
        const f = new T.Mesh(new T.ConeGeometry(0.09, 0.32, 6), glow(i % 2 ? 0xff4a12 : 0xffb52a, 0.85));
        const th = i * 2.399, ph = Math.acos(1 - 2 * (i + 0.5) / 16);
        const dir = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        f.position.copy(dir).multiplyScalar(0.36); f.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        a.ball.add(f); a.spikes.push(f);
      }
      a.ball.visible = false;
      // traînée : des flammes posées le long du chemin, qui s'allument au passage de la boule
      a.trail = [];
      const n = Math.max(6, Math.round(a.len * 5));
      for (let i = 0; i < n; i++) {
        const g = new T.Group(), f = i / n;
        g.position.set(a.from.x + (a.target.x - a.from.x) * f, 0.02, a.from.z + (a.target.z - a.from.z) * f);
        for (let k = 0; k < 3; k++) {
          const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.22 + k * 0.08, 6), glow(k === 1 ? 0xffc14b : 0xff5a12, 0.85));
          fl.position.set((k - 1) * 0.07, 0.1 + k * 0.03, ((i + k) % 2 ? 0.05 : -0.05)); fl.userData.phase = i * 1.3 + k; g.add(fl);
        }
        const scorch = new T.Mesh(new T.CircleGeometry(0.14, 16), new T.MeshBasicMaterial({ color: 0x24160d, transparent: true, opacity: 0.6, depthWrite: false }));
        scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.01; g.add(scorch);
        g.visible = false; g.userData.f = f; add(g); a.trail.push(g);
      }
      a.light = add(new T.PointLight(0xff7a1a, 0, 6, 2));
    }
    tickFireroll(c, a, el, t, M) {
      if (!a.ball) {
        this.makeFirerollFx(a);
        // la boule a la taille de la tour : son diamètre (flammes comprises) égale la hauteur du personnage
        c.parts.root.updateMatrixWorld(true);
        const h = new this.THREE.Box3().setFromObject(c.parts.root).getSize(new this.THREE.Vector3()).y;
        a.size = Math.max(0.6, h) / 1.04;
      }
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const hitAt = 0.5 + a.run, stop = { x: to.x - dir.x * 0.38, z: to.z - dir.z * 0.38 };
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      const grow = clamp(el / 0.35), back = clamp((el - hitAt - 0.55) / 0.3);
      // le personnage disparaît dans la boule, puis réapparaît après le choc
      c.parts.root.visible = el < 0.25 || back >= 1;
      if (el < 0.5) { M.animate(c.parts, t, 'cast', clamp(el / 0.3)); c.holder.position.set(from.x, 0, from.z); }
      let bx = from.x, bz = from.z;
      if (el >= 0.5 && el < hitAt) {
        const u = (el - 0.5) / a.run;
        bx = from.x + (stop.x - from.x) * u; bz = from.z + (stop.z - from.z) * u;
      } else if (el >= hitAt) { bx = stop.x; bz = stop.z; }
      if (back >= 1) {
        M.animate(c.parts, t, 'run');
        const u = clamp((el - hitAt - 0.85) / 0.4);
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      } else if (el >= 0.5) c.holder.position.set(bx, 0, bz);
      a.ball.visible = el > 0.15 && back < 1;
      a.ball.position.set(bx, 0.52 * a.size, bz);
      a.ball.scale.setScalar(Math.max(0.01, a.size * grow * (1 - back) * (el >= hitAt && el < hitAt + 0.15 ? 1.15 : 1)));
      // roule dans le sens du déplacement
      a.ball.rotation.set(0, 0, 0);
      a.ball.rotateOnWorldAxis(new this.THREE.Vector3(dir.z, 0, -dir.x), el * 22);
      a.spikes.forEach((f, i) => { f.scale.y = 0.75 + Math.abs(Math.sin(t * 17 + i)) * 0.6; });
      const f = el < 0.5 ? 0 : clamp((el - 0.5) / a.run) * (1 - 0.38 / Math.max(0.4, a.len));
      a.trail.forEach((g) => {
        g.visible = el >= 0.5 && g.userData.f <= f + 0.02;
        const fade = 1 - clamp((el - (a.duration - 0.5)) / 0.5);
        g.children.forEach((fl) => {
          if (!fl.userData.phase && fl.userData.phase !== 0) { fl.material.opacity = 0.6 * fade; return; }
          fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade;
          fl.material.opacity = 0.85 * fade;
        });
      });
      a.light.position.set(bx, a.size, bz);
      a.light.intensity = a.ball.visible ? 3 + Math.random() * 1.5 : 0;
      if (el >= hitAt && el < hitAt + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
      if (el >= a.duration) { c.parts.root.visible = true; this.endShot(a); }
    }
    // Dame : flammes blanches éblouissantes (dame blanche) ou noires (dame noire) qui brûlent le sol jusqu'à la cible
    makeFlamelineFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const W = a.white;
      // blanches : lumineuses et additives ; noires : opaques et sombres pour rester visibles
      const flameMat = (k) => new T.MeshBasicMaterial(W
        ? { color: k % 2 ? 0xffffff : 0xcfe9ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }
        : { color: k % 2 ? 0x07050c : 0x3a1450, transparent: true, opacity: 0.92, depthWrite: false, side: T.DoubleSide });
      a.trail = [];
      const n = Math.max(6, Math.round(a.len * 5));
      for (let i = 1; i <= n; i++) {
        const g = new T.Group(), f = i / n;
        g.position.set(a.from.x + (a.target.x - a.from.x) * f, 0.02, a.from.z + (a.target.z - a.from.z) * f);
        for (let k = 0; k < 3; k++) {
          const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.24 + k * 0.08, 7, 1, true), flameMat(k));
          fl.position.set((k - 1) * 0.07, 0.12 + k * 0.03, ((i + k) % 2 ? 0.05 : -0.05)); fl.userData.phase = i * 1.3 + k; g.add(fl);
        }
        const scorch = new T.Mesh(new T.CircleGeometry(0.15, 16), new T.MeshBasicMaterial({ color: W ? 0x3a3a40 : 0x120a16, transparent: true, opacity: 0.55, depthWrite: false }));
        scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.012; g.add(scorch);
        g.visible = false; g.userData.f = f; add(g); a.trail.push(g);
      }
      // tête de la vague de flammes et grand brasier sur la cible
      a.head = add(new T.Mesh(new T.SphereGeometry(0.16, 14, 10), new T.MeshBasicMaterial(W ? { color: 0xffffff, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false } : { color: 0x2a0e3a, transparent: true, opacity: 0.95, depthWrite: false })));
      a.blaze = add(new T.Group());
      a.blaze.position.set(a.target.x, 0, a.target.z);
      for (let k = 0; k < 9; k++) {
        const ang = k * Math.PI * 2 / 9, h = 0.9 + (k % 3) * 0.35;
        const fl = new T.Mesh(new T.ConeGeometry(0.13 + (k % 2) * 0.05, h, 8, 1, true), flameMat(k));
        fl.position.set(Math.cos(ang) * 0.2, h / 2, Math.sin(ang) * 0.2); fl.userData = { phase: k * 1.7, base: h }; a.blaze.add(fl);
      }
      const core = new T.Mesh(new T.ConeGeometry(0.22, 1.6, 9, 1, true), flameMat(1));
      core.position.y = 0.8; core.userData = { phase: 0.5, base: 1.6 }; a.blaze.add(core);
      a.blaze.scale.setScalar(0.01); a.blaze.visible = false;
      a.light = add(new T.PointLight(W ? 0xf2f8ff : 0x7a2aa0, 0, 7, 2));
      if (W) a.sky = { exposure: this.renderer.toneMappingExposure };
    }
    tickFlameline(c, a, el, t, M) {
      if (!a.trail) this.makeFlamelineFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target;
      const launch = 0.45, arrive = launch + a.travel, end = a.duration;
      c.holder.rotation.y = Math.atan2(a.dir.x, a.dir.z);
      if (el < end - 0.35) {
        c.holder.position.set(from.x, 0, from.z);
        M.animate(c.parts, t, el < arrive + 0.3 ? 'cast' : 'idle', clamp(el / 0.3));
      } else {
        // la dame prend la case de sa victime consumée
        M.animate(c.parts, t, 'run');
        const u = clamp((el - (end - 0.35)) / 0.35);
        c.holder.position.set(from.x + (to.x - from.x) * u, 0, from.z + (to.z - from.z) * u);
      }
      const prog = clamp((el - launch) / a.travel);
      a.head.visible = el >= launch && el < arrive;
      a.head.position.set(from.x + (to.x - from.x) * prog, 0.18, from.z + (to.z - from.z) * prog);
      a.head.scale.setScalar(0.8 + Math.abs(Math.sin(t * 25)) * 0.5);
      const fade = 1 - clamp((el - (end - 0.5)) / 0.5);
      a.trail.forEach((g) => {
        g.visible = el >= launch && g.userData.f <= prog + 0.02 && fade > 0;
        g.children.forEach((fl) => {
          if (fl.userData.phase === undefined) { fl.material.opacity = 0.55 * fade; return; }
          fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade;
          fl.material.opacity = (a.white ? 0.9 : 0.92) * fade;
        });
      });
      // à l'arrivée, les flammes grandissent et engloutissent la cible
      const grow = clamp((el - arrive) / 0.6);
      a.blaze.visible = el >= arrive && fade > 0;
      a.blaze.scale.set(Math.max(0.01, grow * fade), Math.max(0.01, grow * fade * (1 + Math.sin(t * 9) * 0.06)), Math.max(0.01, grow * fade));
      a.blaze.children.forEach((fl) => { fl.scale.y = 0.75 + Math.abs(Math.sin(t * 12 + fl.userData.phase)) * 0.45; });
      a.blaze.rotation.y = t * 1.5;
      const lightAt = el < arrive ? a.head.position : a.blaze.position;
      a.light.position.set(lightAt.x, 0.8, lightAt.z);
      a.light.intensity = el < launch ? 0 : (a.white ? 6 : 4) * fade + Math.random();
      // lumière éblouissante de la dame blanche : l'image se voile de blanc un instant
      if (a.sky) this.renderer.toneMappingExposure = a.sky.exposure * (1 + (el >= launch ? 0.9 * Math.max(0, 1 - Math.abs(el - arrive) / 0.6) : 0));
      if (el >= arrive && el < arrive + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.06; }
      if (el >= end) { if (a.sky) { this.renderer.toneMappingExposure = a.sky.exposure; a.sky = null; } this.endShot(a); }
    }
    // ---------- Attaques du roi (prise sans mat) ----------
    // Le roi reste sur sa case pendant la technique, puis prend la case de sa victime
    kingStance(c, a, el, t, M, end) {
      const clamp = (x) => Math.max(0, Math.min(1, x));
      c.holder.rotation.y = Math.atan2(a.dir.x, a.dir.z);
      if (el < end) {
        c.holder.position.set(a.from.x, 0, a.from.z);
        M.animate(c.parts, t, el < end - 0.6 ? 'cast' : 'idle', clamp(el / 0.35));
      } else {
        M.animate(c.parts, t, 'run');
        const u = clamp((el - end) / (a.duration - end));
        c.holder.position.set(a.from.x + (a.target.x - a.from.x) * u, 0, a.from.z + (a.target.z - a.from.z) * u);
      }
    }
    // Roi blanc : le ciel s'assombrit, un « 火 » géant apparaît au-dessus de la cible et un rayon doré la frappe
    tickJudgment(c, a, el, t, M) {
      const T = this.THREE, clamp = (x) => Math.max(0, Math.min(1, x)), p = a.target;
      const SHOW = 0.7, STRIKE = 1.55, WALK = a.duration - 0.6;
      if (!a.sigil) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const cx = cv.getContext('2d');
        cx.font = 'bold 200px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.shadowColor = '#ffcf4a'; cx.shadowBlur = 28; cx.fillStyle = '#fff3c4'; cx.fillText('火', 128, 138);
        cx.lineWidth = 6; cx.strokeStyle = '#ffb21a'; cx.beginPath(); cx.arc(128, 128, 118, 0, Math.PI * 2); cx.stroke();
        const glow = (color, o = 0) => new T.MeshBasicMaterial({ color, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
        const sigilTex = new T.CanvasTexture(cv);
        a.sigil = this.fx(a, new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: sigilTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })));
        // au moment du rayon, le symbole s'imprime au sol sur la case et y reste quelques secondes
        // empreinte au sol : symbole doré cerné de brun, en mélange normal pour rester visible sur les cases claires
        const mc = document.createElement('canvas'); mc.width = mc.height = 256;
        const mx = mc.getContext('2d');
        mx.lineWidth = 12; mx.strokeStyle = '#6b3d00'; mx.beginPath(); mx.arc(128, 128, 114, 0, Math.PI * 2); mx.stroke();
        mx.lineWidth = 6; mx.strokeStyle = '#ffc83a'; mx.beginPath(); mx.arc(128, 128, 114, 0, Math.PI * 2); mx.stroke();
        mx.font = 'bold 190px serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
        mx.lineWidth = 14; mx.strokeStyle = '#6b3d00'; mx.strokeText('火', 128, 136);
        mx.fillStyle = '#ffcf4a'; mx.fillText('火', 128, 136);
        const mark = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), new T.MeshBasicMaterial({ map: new T.CanvasTexture(mc), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        mark.rotation.x = -Math.PI / 2; mark.position.set(p.x, 0.03, p.z); mark.rotation.z = -Math.atan2(a.dir.x, a.dir.z); mark.visible = false; this.scene.add(mark);
        const markLife = 5;
        this.addEffect({ start: a.start + STRIKE, dur: markLife, tick: (e) => {
          mark.visible = true;
          mark.material.opacity = Math.min(1, e / 0.2) * (1 - Math.max(0, (e - (markLife - 1.2)) / 1.2)) * (0.85 + 0.15 * Math.sin(e * 6));
        }, end: () => { this.scene.remove(mark); mark.geometry.dispose(); if (mark.material.map) mark.material.map.dispose(); mark.material.dispose(); } });
        a.sigil.position.set(p.x, 2.25, p.z);
        a.beam = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.28, 0.42, 2.2, 24, 1, true), glow(0xffd36a)));
        a.beam.position.set(p.x, 1.1, p.z);
        a.core = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 2.2, 12, 1, true), glow(0xffffff)));
        a.core.position.set(p.x, 1.1, p.z);
        a.ring = this.fx(a, new T.Mesh(new T.RingGeometry(0.3, 0.5, 40), glow(0xffe08a)));
        a.ring.rotation.x = -Math.PI / 2; a.ring.position.set(p.x, 0.04, p.z);
        a.sparks = this.fx(a, new T.Group());
        for (let i = 0; i < 26; i++) {
          const sp = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), glow(i % 2 ? 0xffffff : 0xffc23a, 0));
          sp.userData.v = { x: (Math.random() - 0.5) * 2.2, y: (Math.random() - 0.2) * 1.6, z: (Math.random() - 0.5) * 2.2 };
          a.sparks.add(sp);
        }
        a.sparks.position.set(p.x, 2.25, p.z);
        a.light = this.fx(a, new T.PointLight(0xffd36a, 0, 9, 2)); a.light.position.set(p.x, 1.6, p.z);
        a.expo = this.renderer.toneMappingExposure;
      }
      this.kingStance(c, a, el, t, M, WALK);
      // le ciel s'assombrit le temps du jugement
      const dark = clamp(el / 0.5) * (1 - clamp((el - 2.6) / 0.6));
      this.renderer.toneMappingExposure = a.expo * (1 - 0.45 * dark) * (el >= STRIKE && el < STRIKE + 0.25 ? 1.9 : 1);
      // le symbole apparaît, tourne lentement face à la caméra puis se dissout en étincelles
      const appear = clamp((el - SHOW) / 0.5), dissolve = clamp((el - 2.1) / 0.6);
      a.sigil.material.opacity = appear * (1 - dissolve);
      a.sigil.scale.setScalar(0.6 + appear * 0.4 + dissolve * 0.3);
      a.sigil.lookAt(this.camera.position.x, a.sigil.position.y, this.camera.position.z);
      a.sparks.children.forEach((sp) => {
        const v = sp.userData.v, k = dissolve;
        sp.position.set(v.x * k, v.y * k - 1.2 * k * k, v.z * k);
        sp.material.opacity = el >= 2.1 ? 0.95 * (1 - clamp((el - 2.5) / 0.5)) : 0;
      });
      // le rayon frappe la cible d'en haut
      const beam = el >= STRIKE ? 1 - clamp((el - STRIKE - 0.5) / 0.6) : 0;
      a.beam.material.opacity = 0.55 * beam; a.core.material.opacity = 0.95 * beam;
      a.beam.scale.set(0.6 + beam * 0.6, 1, 0.6 + beam * 0.6);
      a.core.scale.set(1 + Math.sin(t * 40) * 0.2, 1, 1 + Math.sin(t * 40) * 0.2);
      const wave = clamp((el - STRIKE) / 0.7);
      a.ring.material.opacity = el >= STRIKE ? 0.85 * (1 - wave) : 0; a.ring.scale.setScalar(1 + wave * 4);
      a.light.intensity = 9 * beam + (appear * (1 - dissolve)) * 2;
      if (el >= STRIKE && el < STRIKE + 0.3) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
      if (el >= a.duration) { this.renderer.toneMappingExposure = a.expo; this.endShot(a); }
    }
    // Roi noir : une main d'ombre géante sort du sol derrière lui, passe par-dessus et écrase la cible
    tickEmperorHand(c, a, el, t, M) {
      const T = this.THREE, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const RISE = 0.35, SWING = 1.15, SLAM = 1.55, SINK = 2.1, WALK = a.duration - 0.6;
      if (!a.hand) {
        const shade = new T.MeshStandardMaterial({ color: 0x120818, emissive: 0x3a1066, emissiveIntensity: 0.55, roughness: 0.7, transparent: true, opacity: 0.92 });
        const hand = new T.Group();
        const palm = new T.Mesh(new T.BoxGeometry(1.0, 0.22, 1.1), shade); hand.add(palm);
        [-0.36, -0.12, 0.12, 0.36].forEach((x, i) => {
          const f = new T.Mesh(new T.BoxGeometry(0.2, 0.18, 0.75 + (i === 1 || i === 2 ? 0.12 : 0)), shade);
          f.position.set(x, 0, 0.88 + (i === 1 || i === 2 ? 0.06 : 0)); hand.add(f);
        });
        const thumb = new T.Mesh(new T.BoxGeometry(0.22, 0.18, 0.55), shade); thumb.position.set(0.62, 0, 0.25); thumb.rotation.y = -0.7; hand.add(thumb);
        const wrist = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 1.6, 12), shade); wrist.rotation.x = Math.PI / 2; wrist.position.z = -1.2; hand.add(wrist);
        // halo violet autour de la main
        const aura = new T.Mesh(new T.SphereGeometry(1.25, 16, 12), new T.MeshBasicMaterial({ color: 0x9b4dff, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        aura.scale.set(0.9, 0.35, 1.4); aura.position.z = 0.1; hand.add(aura);
        a.hand = this.fx(a, hand); a.shade = shade; a.handAura = aura;
        // empreinte de main laissée sur la case
        const print = new T.Group();
        const ink = new T.MeshBasicMaterial({ color: 0x1a0b26, transparent: true, opacity: 0, depthWrite: false });
        const pp = new T.Mesh(new T.PlaneGeometry(0.42, 0.44), ink); pp.rotation.x = -Math.PI / 2; print.add(pp);
        [-0.15, -0.05, 0.05, 0.15].forEach((x, i) => { const f = new T.Mesh(new T.PlaneGeometry(0.08, 0.3 + (i === 1 || i === 2 ? 0.05 : 0)), ink); f.rotation.x = -Math.PI / 2; f.position.set(x, 0, 0.36); print.add(f); });
        const th = new T.Mesh(new T.PlaneGeometry(0.08, 0.22), ink); th.rotation.x = -Math.PI / 2; th.rotation.z = 0.8; th.position.set(0.27, 0, 0.12); print.add(th);
        print.position.set(a.target.x, 0.024, a.target.z); print.rotation.y = Math.atan2(a.dir.x, a.dir.z);
        a.print = this.fx(a, print); a.ink = ink;
        a.dust = this.fx(a, new T.Mesh(new T.RingGeometry(0.3, 0.6, 40), new T.MeshBasicMaterial({ color: 0x8a6fb0, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })));
        a.dust.rotation.x = -Math.PI / 2; a.dust.position.set(a.target.x, 0.05, a.target.z);
        a.light = this.fx(a, new T.PointLight(0xa45bff, 0, 7, 2));
      }
      this.kingStance(c, a, el, t, M, WALK);
      const yaw = Math.atan2(a.dir.x, a.dir.z);
      const behind = { x: a.from.x - a.dir.x * 1.3, z: a.from.z - a.dir.z * 1.3 };
      const hand = a.hand;
      hand.visible = el >= RISE && el < SINK + 0.9;
      if (el < SWING) {
        // la main sort du sol derrière le roi, paume vers l'avant, doigts vers le ciel
        const u = smooth((el - RISE) / (SWING - RISE));
        hand.position.set(behind.x, -1.6 + u * 4.1, behind.z);
        hand.rotation.set(-Math.PI / 2 + 0.2, yaw, 0);
      } else if (el < SLAM) {
        // elle bascule par-dessus le roi et s'abat sur la cible
        const u = smooth((el - SWING) / (SLAM - SWING));
        hand.position.set(behind.x + (a.target.x - behind.x) * u, 2.5 + Math.sin(u * Math.PI) * 1.2 - u * 2.3, behind.z + (a.target.z - behind.z) * u);
        hand.rotation.set(-Math.PI / 2 + 0.2 + u * (Math.PI / 2 - 0.2), yaw, 0);
      } else {
        // posée à plat sur la case, puis elle s'enfonce dans le sol
        const k = smooth((el - SINK) / 0.8);
        hand.position.set(a.target.x - a.dir.x * 0.45, 0.2 - k * 1.4, a.target.z - a.dir.z * 0.45);
        hand.rotation.set(0, yaw, 0);
      }
      a.shade.opacity = 0.92 * (1 - clamp((el - SINK - 0.3) / 0.6));
      a.handAura.material.opacity = 0.18 + Math.abs(Math.sin(t * 6)) * 0.1;
      a.light.position.set(hand.position.x, Math.max(0.5, hand.position.y + 0.6), hand.position.z);
      a.light.intensity = hand.visible ? 3 + (el >= SLAM && el < SLAM + 0.3 ? 6 : 0) : 0;
      // impact : tremblement, poussière et empreinte de main
      const hit = clamp((el - SLAM) / 0.8);
      a.dust.material.opacity = el >= SLAM ? 0.7 * (1 - hit) : 0; a.dust.scale.setScalar(1 + hit * 3.5);
      a.ink.opacity = el >= SLAM ? 0.75 * (1 - clamp((el - a.duration + 0.8) / 0.8)) : 0;
      if (el >= SLAM && el < SLAM + 0.35) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.22; }
      if (el >= a.duration) this.endShot(a);
    }
    // Victime d'un roi : foudroyée et dissoute en lumière (roi blanc) ou écrasée à plat (roi noir)
    tickKingVictim(d, a, c, el, t, M) {
      const p = a.target, hitAt = a.style === 'judgment' ? 1.55 : 1.55;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hitAt) { M.animate(c.parts, t, 'guard', 1); return true; }
      M.animate(c.parts, t, 'ko', 1);
      const k = Math.max(0, Math.min(1, (el - hitAt) / 1.0));
      if (a.style === 'judgment') {
        if (!d.tint) {
          d.tint = [];
          c.parts.root.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.blending !== this.THREE.AdditiveBlending) { o.material = o.material.clone(); d.tint.push(o.material); } });
        }
        const gold = new this.THREE.Color(0xffe08a);
        d.tint.forEach((m) => m.color.lerp(gold, 0.08));
        c.holder.position.y = k * 0.6;
        c.parts.root.scale.set(d.base * (1 - k), d.base * (1 + k * 0.6) * (1 - k * 0.9), d.base * (1 - k));
      } else {
        c.parts.root.scale.set(d.base * (1 + k * 0.5), d.base * Math.max(0.08, 1 - Math.min(1, (el - hitAt) / 0.15) * 0.92), d.base * (1 + k * 0.5));
      }
      if (k >= 1) {
        c.holder.visible = false;
        if (d.tint && !d.tintFreed) { d.tint.forEach((m) => m.dispose()); d.tintFreed = true; }
      }
      return el < a.duration;
    }
    // Cible des flammes de la dame : elle se tord dans le brasier puis se consume et disparaît
    tickFlamelineVictim(d, a, c, el, t, M) {
      const arrive = 0.45 + a.travel, p = a.target;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < arrive) { M.animate(c.parts, t, 'guard', 1); return true; }
      M.animate(c.parts, t, 'ko', 1);
      if (!d.tint) {
        d.tint = [];
        c.parts.root.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.blending !== this.THREE.AdditiveBlending) { o.material = o.material.clone(); d.tint.push(o.material); } });
      }
      const burn = Math.max(0, Math.min(1, (el - arrive - 0.3) / 1.3));
      const ash = new this.THREE.Color(a.white ? 0xffffff : 0x0c0910);
      d.tint.forEach((m) => m.color.lerp(ash, 0.06));
      c.parts.root.position.set(Math.sin(t * 30) * 0.03 * (1 - burn), 0, 0);
      c.parts.root.scale.set(d.base * (1 - burn * 0.4), d.base * Math.max(0.01, 1 - burn), d.base * (1 - burn * 0.4));
      if (burn >= 1) {
        c.holder.visible = false;
        if (!d.tintFreed) { d.tint.forEach((m) => m.dispose()); d.tintFreed = true; }
      }
      return el < a.duration;
    }
    // Cible de la boule de feu : elle s'embrase au choc puis est éjectée au loin en brûlant
    tickFirerollVictim(d, a, c, el, t, M) {
      const hitAt = 0.5 + a.run, p = a.target;
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hitAt) { c.holder.position.set(p.x, 0, p.z); M.animate(c.parts, t, 'guard', 1); return true; }
      this.burn(d, t);
      M.animate(c.parts, t, 'ko', 1);
      const u = Math.max(0, Math.min(1, (el - hitAt - 0.15) / (a.duration - hitAt - 0.3)));
      c.holder.position.set(p.x + a.dir.x * u * 7, Math.sin(Math.PI * u) * 2.3, p.z + a.dir.z * u * 7);
      c.parts.root.rotation.set(-u * 9, u * 5, u * 4);
      c.parts.root.scale.setScalar(d.base * (1 - u * 0.5));
      if (u >= 1 || el >= a.duration) { this.endBurn(d); return false; }
      return true;
    }
    // Cible du fou noir : électrocutée, elle tombe à genoux puis disparaît
    tickChidoriVictim(d, a, c, el, t, M) {
      const runEnd = 0.7 + a.run, p = a.target;
      const shockEnd = a.pierce + 1.4, kneelEnd = shockEnd + 0.55;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < runEnd) { M.animate(c.parts, t, 'guard', 1); return true; }
      if (el < shockEnd) {
        // Secousses électriques
        M.animate(c.parts, t, 'ko', 1);
        c.parts.root.position.set((Math.random() - 0.5) * 0.06, 0.04 + Math.random() * 0.05, (Math.random() - 0.5) * 0.06);
        c.parts.root.rotation.set(-0.25 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3);
        return true;
      }
      c.parts.root.rotation.set(0, 0, 0);
      M.animate(c.parts, t, 'kneel', Math.min(1, (el - shockEnd) / 0.5));
      if (el >= kneelEnd) {
        const fade = Math.max(0, Math.min(1, (el - kneelEnd) / (a.duration - 0.4 - kneelEnd)));
        c.parts.root.scale.set(d.base * (1 - fade * 0.3), d.base * Math.max(0.001, 1 - fade), d.base * (1 - fade * 0.3));
        if (fade >= 1) { c.holder.visible = false; return el < a.duration; }
      }
      return el < a.duration;
    }

    tickKnightVictim(d, t, M) {
      const a = d.knightAttack, c = d.c, el = t - a.start;
      if (a.sabre) return this.tickSabreVictim(d, a, c, el, t, M);
      if (a.customVictim) return a.customVictim(d, a, c, el, t, M);
      if (a.style === 'chidori') return this.tickChidoriVictim(d, a, c, el, t, M);
      if (a.style === 'orb') return this.tickOrbVictim(d, a, c, el, t, M);
      if (a.style === 'fireroll') return this.tickFirerollVictim(d, a, c, el, t, M);
      if (a.style === 'flameline') return this.tickFlamelineVictim(d, a, c, el, t, M);
      if (a.style === 'judgment' || a.style === 'emperorhand') return this.tickKingVictim(d, a, c, el, t, M);
      if (a.style === 'enpassant') return this.tickEnPassantVictim(d, a, c, el, t, M);
      if (a.style === 'tunnel-eat') {
        if (el < 1.55) { c.holder.position.set(a.target.x, 0, a.target.z); return true; }
        M.animate(c.parts, t, 'ko');
        const vanish = Math.max(0, Math.min(1, (el - 1.55) / (a.duration - 1.55)));
        c.parts.root.scale.setScalar(d.base * (1 - vanish));
        c.holder.position.set(a.target.x, 0, a.target.z);
        return el < a.duration;
      }
      if (a.style === 'tunnel-impact') {
        const pre = a.pre || 0, e2 = el - pre;
        if (e2 < 1.5) { c.holder.position.set(a.target.x, 0, a.target.z); return true; }
        const u = Math.max(0, Math.min(1, (e2 - 1.5) / (a.duration - pre - 1.5)));
        M.animate(c.parts, t, 'ko');
        c.holder.position.set(a.target.x + d.dx * u * 7, Math.sin(Math.PI * u) * 1.8, a.target.z + d.dz * u * 7);
        c.parts.root.rotation.set(u * 10, u * 8, u * 6);
        c.parts.root.scale.setScalar(d.base * (1 - u * 0.55));
        return u < 1;
      }
      M.animate(c.parts, t, el < 1.08 ? 'guard' : 'ko', 1);
      if (el < 2.62) {
        // suspendue sous les serres de l'aigle, elle suit exactement sa montée puis sa descente
        const y = el < 1.08 ? 0 : Math.max(0, (a.eagleY || 0) - 0.62);
        c.holder.position.set(a.target.x, y, a.target.z);
        c.parts.root.rotation.set(el < 1.08 ? 0 : 0.35, 0, el < 1.08 ? 0 : Math.sin(el * 8) * 0.1);
      } else {
        // écrasée à plat sur sa case
        c.holder.position.set(a.target.x, 0.06, a.target.z);
        c.parts.root.rotation.set(-Math.PI / 2, 0, 0.2);
        c.parts.root.scale.set(d.base * 0.95, d.base * 0.48, d.base * 0.95);
      }
      return el < a.duration;
    }

    createCrater(at, t, smoking = false) {
      const T = this.THREE, crater = new T.Group();
      const pit = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x21170f, transparent: true, opacity: 0.95, side: T.DoubleSide }));
      pit.rotation.x = -Math.PI / 2; pit.position.y = 0.025; crater.add(pit);
      const rim = new T.Mesh(new T.TorusGeometry(0.32, 0.075, 7, 20), new T.MeshStandardMaterial({ color: 0x59402b, roughness: 1 }));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.04; crater.add(rim);
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2, size = 0.09 + (i % 3) * 0.025;
        const rock = new T.Mesh(new T.DodecahedronGeometry(size, 0), new T.MeshStandardMaterial({ color: i % 2 ? 0x806044 : 0x493426, roughness: 1 }));
        rock.position.set(Math.cos(angle) * 0.31, 0.045, Math.sin(angle) * 0.31); rock.scale.y = 0.55; crater.add(rock);
      }
      const puffs = [];
      if (smoking) for (let i = 0; i < 5; i++) { // cratère fumant : la fumée monte tant qu'il reste sur la case
        const m = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), new T.MeshBasicMaterial({ color: 0x8b8a96, transparent: true, opacity: 0.4, depthWrite: false }));
        crater.add(m); puffs.push(m);
      }
      crater.position.set(at.x, 0, at.z); this.scene.add(crater);
      // Saga des Auras : le cratère dure quelques coups ; il disparaît aussi si l'on revient en arrière dans la partie
      this.captureScars.push({ object: crater, until: t + (smoking ? 40 : 5), start: t, ply: smoking ? this.ply : null, puffs });
    }

    tickCaptureScars(t) {
      this.captureScars = this.captureScars.filter((scar) => {
        scar.puffs.forEach((m, i) => { const u = ((t - scar.start) * 0.32 + i / 5) % 1; m.position.set(Math.sin(i * 2.4 + u * 3) * 0.12, 0.08 + u * 0.75, Math.cos(i * 1.7 + u * 3) * 0.12); m.scale.setScalar(0.6 + u * 2); m.material.opacity = 0.42 * (1 - u); });
        const plyOver = scar.ply != null && this.ply != null && (this.ply >= scar.ply + AURA_CRATER_PLIES || this.ply < scar.ply);
        if (t >= scar.until || plyOver) {
          this.scene.remove(scar.object);
          scar.object.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
          return false;
        }
        return true;
      });
    }

    // Saga des Auras : aura de la pièce sélectionnée (bleue pour les Blancs, pourpre pour les Noirs)
    auraKit(white) {
      const T = this.THREE, key = white ? 'w' : 'b';
      this.auraKits = this.auraKits || {};
      if (!this.auraKits[key]) this.auraKits[key] = {
        mat: new T.MeshBasicMaterial({ color: white ? 0x2f8fe0 : 0xc04bff, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
        tip: new T.MeshBasicMaterial({ color: white ? 0x7fd8ff : 0xff3d6e, transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
        shell: new T.CylinderGeometry(0.2, 0.42, 1.5, 16, 1, true), flame: new T.ConeGeometry(0.11, 0.8, 6), ring: new T.RingGeometry(0.3, 0.46, 28),
      };
      return this.auraKits[key];
    }
    tickAura(c, t) {
      const on = (c.selected || t < (c.auraFlare || 0)) && root.themeOf(c.piece) === 'auras'; // Nilo : l'aura explose quand un allié tombe
      if (!on) { if (c.auraFx) c.auraFx.visible = false; return; }
      const T = this.THREE;
      if (!c.auraFx) {
        const kit = this.auraKit(c.piece === c.piece.toUpperCase()), g = new T.Group();
        const shell = new T.Mesh(kit.shell, kit.mat); shell.position.y = 0.72; g.add(shell);
        const ring = new T.Mesh(kit.ring, kit.tip); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
        g.userData.flames = [];
        for (let i = 0; i < 7; i++) { const f = new T.Mesh(kit.flame, i % 2 ? kit.tip : kit.mat), a = i / 7 * Math.PI * 2; f.position.set(Math.cos(a) * 0.33, 0.5, Math.sin(a) * 0.33); g.add(f); g.userData.flames.push(f); }
        c.auraFx = g; c.holder.add(g);
      }
      c.auraFx.visible = true;
      c.auraFx.rotation.y = t * 1.4;
      c.auraFx.userData.flames.forEach((f, i) => { const u = (t * 1.3 + i * 0.37) % 1; f.position.y = 0.3 + u * 1.1; f.scale.set(1 - u * 0.6, 0.7 + (1 - u) * 0.9, 1 - u * 0.6); });
    }
    // Déplacement en vol : traînée de lumière qui s'efface derrière la pièce
    auraTrail(c, t) {
      if (t < (c.auraPuffAt || 0)) return;
      c.auraPuffAt = t + 0.035;
      const T = this.THREE, kit = this.auraKit(c.piece === c.piece.toUpperCase());
      this.auraPuffGeo = this.auraPuffGeo || new T.SphereGeometry(0.16, 8, 6);
      const m = new T.Mesh(this.auraPuffGeo, kit.mat.clone());
      m.position.copy(c.holder.position); m.position.y = c.parts.root.position.y + 0.55;
      this.scene.add(m); (this.auraPuffs = this.auraPuffs || []).push({ m, t0: t });
    }
    tickAuraTrails(t) {
      if (!this.auraPuffs || !this.auraPuffs.length) return;
      this.auraPuffs = this.auraPuffs.filter((p) => {
        const u = (t - p.t0) / 0.5;
        if (u >= 1) { this.scene.remove(p.m); p.m.material.dispose(); return false; }
        p.m.material.opacity = 0.5 * (1 - u); p.m.scale.setScalar(1 - u * 0.7);
        return true;
      });
    }

    fx(s, o) { this.scene.add(o); (s.fx = s.fx || []).push(o); return o; }
    glow(color, opacity = 0.9) {
      const T = this.THREE;
      return new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
    }
    handsOf(c) {
      const T = this.THREE, v = new T.Vector3();
      c.holder.updateMatrixWorld(true);
      c.parts.armL.getWorldPosition(v);
      const w = new T.Vector3(); c.parts.armR.getWorldPosition(w);
      const fwd = new T.Vector3(Math.sin(c.holder.rotation.y), 0, Math.cos(c.holder.rotation.y));
      return v.add(w).multiplyScalar(0.5).addScaledVector(fwd, 0.35);
    }

    // Technique de la boule de feu (dame) : jaillit des mains, traînée de flammes, explosion sur la cible
    flyFire(c, s, el, t) {
      const T = this.THREE;
      if (el >= s.fire && !s.ball && !s.boom) {
        s.start = this.handsOf(c);
        const ball = new T.Group();
        ball.add(new T.Mesh(new T.SphereGeometry(0.16, 14, 10), this.glow(0xfff1a8, 1)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.28, 14, 10), this.glow(0xff7a1a, 0.7)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.38, 14, 10), this.glow(0xd8301a, 0.35)));
        s.ball = this.fx(s, ball);
        s.puffs = [];
        this.shakeUntil = t + 0.12; this.shakeAmp = 0.03;
      }
      // pendant les signes des mains, une flamme grossit entre les paumes
      if (el < s.fire) {
        if (!s.charge) s.charge = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 10, 8), this.glow(0xff9a2a, 0.8)));
        s.charge.position.copy(this.handsOf(c));
        s.charge.scale.setScalar(0.3 + (el / s.fire) * 1.2 + Math.random() * 0.2);
      } else if (s.charge) s.charge.visible = false;
      const end = new T.Vector3(s.target.x, 0.6, s.target.z);
      if (s.ball && el < s.impact) {
        const u = Math.max(0, (el - s.fire) / s.flight);
        const pos = s.start.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.2;
        s.ball.position.copy(pos);
        s.ball.children.forEach((m, i) => m.scale.setScalar(0.9 + Math.random() * 0.3 + i * 0.05));
        if (!s.lastPuff || el - s.lastPuff > 0.02) {
          s.lastPuff = el;
          const puff = this.fx(s, new T.Mesh(new T.SphereGeometry(0.16, 8, 6), this.glow(Math.random() < 0.5 ? 0xff6a1a : 0xffb02e, 0.7)));
          puff.position.copy(pos);
          s.puffs.push({ m: puff, t0: el });
        }
      }
      if (s.ball && el >= s.impact && !s.boom) {
        this.scene.remove(s.ball); s.ball = null;
        this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffc34d], [0xff8a2a, 0x3b2a1a]);
      }
      this.boomStep(s, el);
      for (const p of s.puffs || []) {
        const age = el - p.t0;
        p.m.scale.setScalar(Math.max(0.05, 1 - age * 2.5));
        p.m.material.opacity = Math.max(0, 0.7 - age * 1.6);
        p.m.position.y += 0.006;
      }
    }

    // Technique du dragon d'eau (tour) : un serpent d'eau jaillit, ondule dans les airs et s'abat sur la cible
    flyDragon(c, s, el, t) {
      const T = this.THREE;
      const N = 22;
      if (el >= s.fire && !s.dragon && !s.splashDone) {
        s.start = this.handsOf(c);
        const g = new T.Group();
        const water = s.fireDragon
          ? new T.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.92 })
          : new T.MeshToonMaterial({ color: s.pal ? s.pal.jet : 0x3fa9f5, transparent: true, opacity: 0.9 });
        const foam = new T.MeshBasicMaterial({ color: s.fireDragon ? 0x3a1608 : s.pal ? s.pal.foam : 0xe6f7ff });
        for (let i = 0; i < N; i++) {
          // Dragon de feu : corps du jaune (tête) au rouge sombre (queue), avec des flammes le long du dos
          const segMat = s.fireDragon ? new T.MeshBasicMaterial({ color: new T.Color(0xffb020).lerp(new T.Color(0xc41a06), Math.min(1, i / N * 1.6)), transparent: true, opacity: 0.95, toneMapped: false }) : water;
          const seg = new T.Mesh(new T.SphereGeometry(0.24 * (1 - i / N * 0.65), 12, 8), segMat);
          if (s.fireDragon && i % 2 === 0) {
            const flame = new T.Mesh(new T.ConeGeometry(0.07 * (1 - i / N * 0.6), 0.26, 6), new T.MeshBasicMaterial({ color: i % 4 ? 0xff4a12 : 0xffb52a, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
            flame.position.y = 0.2 * (1 - i / N * 0.6); seg.add(flame);
          }
          g.add(seg);
        }
        // tête : gueule, cornes, yeux
        const head = g.children[0];
        head.scale.set(1.25, 1.05, 1.7);
        for (const sd of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.035, 0.22, 6), foam); horn.position.set(sd * 0.08, 0.14, -0.08); horn.rotation.x = -0.9; head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.028, 8, 6), new T.MeshBasicMaterial({ color: 0xffef5a })); eye.position.set(sd * 0.09, 0.06, 0.08); head.add(eye);
        }
        const jaw = new T.Mesh(new T.ConeGeometry(0.1, 0.2, 8), water); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.04, 0.18); head.add(jaw);
        s.dragon = this.fx(s, g);
        this.shakeUntil = t + 0.15; this.shakeAmp = 0.03;
      }
      const end = new T.Vector3(s.target.x, 0.55, s.target.z);
      if (s.dragon) {
        const dir = end.clone().sub(s.start); dir.y = 0;
        const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
        const pathAt = (u) => {
          if (s.lift && u > 1) return end.clone().add(new T.Vector3(0, (u - 1) * 7.5, 0)).addScaledVector(side, Math.sin(u * 9) * 0.09); // il monte dans le ciel avec sa proie
          const p = s.start.clone().lerp(end, Math.min(1, u));
          p.y += Math.sin(Math.PI * Math.min(1, u)) * 1.1;
          return p.addScaledVector(side, Math.sin(u * 9) * 0.22 * (1 - Math.min(1, u) * 0.6));
        };
        const head = (el - s.fire) / s.flight;
        s.dragon.children.forEach((m, i) => {
          const u = head - i * 0.04;
          m.visible = u > 0 && u < (s.lift ? 2.4 : 1.08);
          if (!m.visible) return;
          m.position.copy(pathAt(u));
          if (i === 0) m.lookAt(pathAt(u + 0.03));
        });
        if (head - (N - 1) * 0.04 > (s.lift ? 2.4 : 1.08)) { this.scene.remove(s.dragon); s.dragon = null; s.splashDone = true; }
      }
      if (el >= s.impact && !s.boom && !s.splashed) {
        s.splashed = true;
        if (s.fireDragon) this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffb347], [0xff4500, 0x2a1a12], false);
        else if (s.pal) this.explode(s, end, el, t, s.pal.boom, s.pal.debris, true);
        else this.explode(s, end, el, t, [0xd6f2ff, 0x3fa9f5, 0x9fdcff], [0x3fa9f5, 0xe6f7ff], true);
      }
      this.boomStep(s, el);
    }

    // Thèmes guerriers : armes propres à chaque pièce.
    // Antiquité : javelot, carreau de baliste, pierre de catapulte, volée de flèches, pot de feu.
    // Moderne : salve de missiles (hélicoptère), laser (drone), obus (tank), bombes larguées (avion).
    flyProj(c, s, el, t) {
      const T = this.THREE, kind = s.proj;
      const end = new T.Vector3(s.target.x, 0.5, s.target.z);
      if (AURA_PROJ.has(kind)) this.auraCharge(c, s, el);
      if (!s.start && el >= s.fire) {
        // départ : bout du canon, des lance-roquettes ou de l'arme, sinon les mains
        if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); s.start = c.parts.muzzle.getWorldPosition(new T.Vector3()); } else s.start = this.handsOf(c);
        s.items = []; s.puffs = [];
        const mat = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.2 }, o));
        // projectile allongé le long de +z (orienté ensuite vers sa trajectoire)
        const shaft = (len, r, color, tip, tipColor, fletch) => {
          const g = new T.Group();
          const sh = new T.Mesh(new T.CylinderGeometry(r, r, len, 6), mat(color)); sh.rotation.x = Math.PI / 2; g.add(sh);
          if (tip) { const h = new T.Mesh(new T.ConeGeometry(r * 3, tip, 6), mat(tipColor, { metalness: 0.8, roughness: 0.25 })); h.rotation.x = Math.PI / 2; h.position.z = len / 2 + tip / 2; g.add(h); }
          if (fletch) for (let i = 0; i < 3; i++) { const f = new T.Mesh(new T.BoxGeometry(0.004, r * 7, len * 0.18), mat(fletch)); f.rotation.z = i * Math.PI / 1.5; f.position.z = -len * 0.42; g.add(f); }
          return g;
        };
        const add = (o, delay = 0, off = new T.Vector3(), arc = 0.6, spin = 0) => { o.visible = false; this.fx(s, o); s.items.push({ o, delay, off, arc, spin }); return o; };
        const spread = (i, n, w) => new T.Vector3((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * w).add(new T.Vector3(0, 0, 0)).multiplyScalar(n > 1 ? 1 : 0);
        if (kind === 'spear') { add(shaft(0.85, 0.02, '#8d6e63', 0.12, '#cfd8dc'), 0, new T.Vector3(), 0.9); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'spears') { for (let i = 0; i < 3; i++) add(shaft(0.7, 0.017, '#8d6e63', 0.1, '#cfd8dc'), i * 0.08, spread(i, 3, 0.5), 1.0); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'bolt') { add(shaft(1.05, 0.03, '#6d4c41', 0.16, '#90a4ae', '#eeeeee'), 0, new T.Vector3(), 0.25); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'arrows') for (let i = 0; i < 9; i++) add(shaft(0.48, 0.011, '#8d6e63', 0.07, '#9e9e9e', s.white ? '#d32f2f' : '#212121'), i * 0.05, spread(i, 9, 0.7), 1.6);
        else if (kind === 'boulder') { const b = new T.Mesh(new T.DodecahedronGeometry(0.24, 0), mat('#8d8478', { roughness: 0.95, flatShading: true })); add(b, 0, new T.Vector3(), 2.2, 6); s.trail = [0xd7ccc8, 0xbcaaa4]; }
        else if (kind === 'firepot') { const g = new T.Group(); g.add(new T.Mesh(new T.SphereGeometry(0.14, 12, 10), mat('#6d4c41'))); g.add(new T.Mesh(new T.SphereGeometry(0.22, 12, 10), this.glow(0xff7a1a, 0.7))); add(g, 0, new T.Vector3(), 1.8, 3); s.trail = [0xff6a1a, 0xffb02e]; }
        else if (kind === 'shell') {
          const sh = shaft(0.22, 0.045, '#b08d2e', 0.07, '#8d6e2e'); sh.add(new T.Mesh(new T.SphereGeometry(0.06, 8, 6), this.glow(0xffd54f, 0.9)));
          add(sh, 0, new T.Vector3(), 0.05); s.trail = [0xffe082, 0xbdbdbd];
          this.shakeUntil = t + 0.2; this.shakeAmp = 0.06;
          s.muzzleFlash = this.fx(s, new T.Mesh(new T.SphereGeometry(0.3, 12, 10), this.glow(0xffc34d, 0.95))); s.muzzleFlash.position.copy(s.start);
        }
        else if (kind === 'missiles') { for (let i = 0; i < 4; i++) { const m = shaft(0.34, 0.032, '#eceff1', 0.08, '#c62828'); const fl = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), this.glow(0xffa726, 0.9)); fl.position.z = -0.13; m.add(fl); add(m, i * 0.09, new T.Vector3(i % 2 ? 0.12 : -0.12, 0, 0), 0.5); } s.trail = [0xeeeeee, 0xcfd8dc]; }
        else if (kind === 'bombs') for (let i = 0; i < 3; i++) { const bmb = shaft(0.3, 0.06, '#455a64', 0.08, '#37474f'); add(bmb, i * 0.12, new T.Vector3((i - 1) * 0.25, 0, (i - 1) * 0.1), 0); bmb.userData.drop = true; }
        else if (kind === 'laser') {
          const beam = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 8), this.glow(s.white ? 0x4fc3f7 : 0xff1744, 0.95));
          const core = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 1, 6), this.glow(0xffffff, 1)); beam.add(core);
          s.beam = this.fx(s, beam); s.beam.visible = false;
        }
        else if (AURA_BEAMS[kind]) this.startAuraBeams(s, kind);
        else if (AURA_PROJ.has(kind)) this.auraMissiles(kind, s, add);
      }
      if (s.muzzleFlash) { const k = Math.max(0, 1 - (el - s.fire) / 0.3); s.muzzleFlash.visible = k > 0; s.muzzleFlash.scale.setScalar(0.5 + k); }
      if (s.start && el < s.impact + 0.05) {
        const u0 = (el - s.fire) / s.flight;
        if (s.auraBeams) this.tickAuraBeams(s, end, el);
        if (s.beam) {
          // le rayon relie l'arme à la cible et grésille
          const a = s.start, d = end.clone().sub(a), L = d.length();
          s.beam.visible = u0 >= 0; s.beam.position.copy(a).addScaledVector(d, 0.5);
          s.beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
          s.beam.scale.set(0.7 + Math.random() * 0.6, L, 0.7 + Math.random() * 0.6);
        }
        for (const it of s.items || []) {
          const u = (el - s.fire - it.delay) / s.flight;
          it.o.visible = u >= 0 && u < 1;
          if (!it.o.visible) continue;
          const tgt = end.clone().add(it.off);
          let pos, next;
          if (it.o.userData.drop) {
            // bombe : tombe du ciel à la verticale de la cible
            const top = tgt.clone(); top.y = 4.5;
            pos = top.clone().lerp(tgt, u * u); next = top.clone().lerp(tgt, Math.min(1, (u + 0.02) ** 2));
          } else {
            const at = (k) => { const p = s.start.clone().lerp(tgt, k); p.y += Math.sin(Math.PI * k) * it.arc; return p; };
            pos = at(u); next = at(Math.min(1, u + 0.02));
          }
          it.o.position.copy(pos);
          if (it.spin) it.o.rotation.set(el * it.spin, el * it.spin * 0.7, 0); else it.o.lookAt(next);
          if (s.trail && (!it.last || el - it.last > 0.025)) {
            it.last = el;
            const puff = this.fx(s, new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: s.trail[Math.random() < 0.5 ? 0 : 1], transparent: true, opacity: 0.7, depthWrite: false })));
            puff.position.copy(pos); s.puffs.push({ m: puff, t0: el });
          }
        }
      }
      if (el >= s.impact && !s.exploded) {
        s.exploded = true; // une seule explosion, même si l'effet est encore appelé après son nettoyage
        for (const it of s.items || []) it.o.visible = false;
        if (s.beam) s.beam.visible = false;
        (s.auraBeams || []).forEach((b) => { b.visible = false; });
        const fire = kind === 'shell' || kind === 'missiles' || kind === 'bombs' || kind === 'firepot' || kind === 'laser';
        if (AURA_PROJ.has(kind)) this.explode(s, end, el, t, s.pal.boom, s.pal.debris, true);
        else if (fire) this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffc34d], [0x3b2a1a, 0xff8a2a]);
        else this.explode(s, end, el, t, [0xf5e6c4, 0xc9a66b, 0xe0c895], [0x8d6e63, 0x9e9e9e], true);
        if (kind === 'bombs' || kind === 'shell') { this.shakeUntil = t + 0.6; this.shakeAmp = 0.14; }
      }
      this.boomStep(s, el);
      for (const p of s.puffs || []) {
        const age = el - p.t0;
        p.m.scale.setScalar(Math.max(0.05, 1 + age * 2));
        p.m.material.opacity = Math.max(0, 0.7 - age * 1.4);
        p.m.position.y += 0.004;
      }
    }

    // Thème Océan : une salve de bulles part des nageoires, file en ondulant et éclate sur la cible
    flyBubbles(c, s, el, t) {
      const T = this.THREE;
      const N = 14;
      if (el < s.fire) {
        if (!s.charge) s.charge = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 12, 8), new T.MeshBasicMaterial({ color: s.pal.charge, transparent: true, opacity: 0.55, depthWrite: false })));
        s.charge.position.copy(this.handsOf(c));
        s.charge.scale.setScalar(0.4 + (el / s.fire) * 1.6);
      } else if (s.charge) s.charge.visible = false;
      if (el >= s.fire && !s.bubbles && !s.boom) {
        s.start = this.handsOf(c);
        s.bubbles = [];
        for (let i = 0; i < N; i++) {
          const r = 0.1 + Math.random() * 0.12;
          const b = new T.Mesh(new T.SphereGeometry(r, 12, 8), new T.MeshBasicMaterial({ color: s.pal.bub, transparent: true, opacity: 0.75, depthWrite: false }));
          const shine = new T.Mesh(new T.SphereGeometry(r * 0.3, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff }));
          shine.position.set(-r * 0.4, r * 0.45, r * 0.3); b.add(shine);
          b.userData = { lag: i * 0.035, ph: Math.random() * 6, off: (Math.random() - 0.5) * 0.3 };
          s.bubbles.push(this.fx(s, b));
        }
      }
      const end = new T.Vector3(s.target.x, 0.6, s.target.z);
      if (s.bubbles && el < s.impact + 0.3) {
        const dir = end.clone().sub(s.start); dir.y = 0;
        const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
        for (const b of s.bubbles) {
          const u = Math.max(0, Math.min(1, (el - s.fire - b.userData.lag) / s.flight));
          b.visible = el - s.fire > b.userData.lag && u < 1;
          const p = s.start.clone().lerp(end, u);
          p.y += Math.sin(Math.PI * u) * 0.35 + Math.sin(el * 9 + b.userData.ph) * 0.05;
          p.addScaledVector(side, Math.sin(u * 7 + b.userData.ph) * 0.12 + b.userData.off * (1 - u));
          b.position.copy(p);
        }
      }
      if (el >= s.impact && !s.exploded) {
        s.exploded = true;
        if (s.bubbles) for (const b of s.bubbles) b.visible = false;
        this.explode(s, end, el, t, s.pal.burst, s.pal.bits, true);
      }
      this.boomStep(s, el);
    }

    // Impact : noyau, halo, onde au sol et éclats (feu ou gerbe d'eau)
    explode(s, at, el, t, [c1, c2, c3], debrisColors, water) {
      const T = this.THREE;
      const boom = new T.Group(); boom.position.copy(at);
      const core = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), this.glow(c1, 1));
      const fire = new T.Mesh(new T.SphereGeometry(0.45, 16, 12), water ? new T.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.6, depthWrite: false }) : this.glow(c2));
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: c3, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -0.5;
      boom.add(core, fire, ring);
      s.debris = [];
      for (let i = 0; i < (water ? 22 : 14); i++) {
        const d = new T.Mesh(water ? new T.SphereGeometry(0.04, 6, 4) : new T.BoxGeometry(0.06, 0.06, 0.06), new T.MeshBasicMaterial({ color: debrisColors[i % 2] }));
        const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 2;
        d.userData.v = new T.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp);
        boom.add(d); s.debris.push(d);
      }
      s.boom = this.fx(s, boom); s.boomT = el;
      this.shakeUntil = t + 0.4; this.shakeAmp = water ? 0.07 : 0.12;
    }
    boomStep(s, el) {
      if (!s.boom) return;
      const b = (el - s.boomT);
      const [core, fire, ring] = s.boom.children;
      const g = Math.min(1, b / 0.18);
      core.scale.setScalar(0.4 + g * 1.4); core.material.opacity = Math.max(0, 1 - b / 0.4);
      fire.scale.setScalar(0.5 + g * 1.8 + b * 0.6); fire.material.opacity = Math.max(0, 0.9 - b / 0.7);
      ring.scale.setScalar(1 + b * 6); ring.material.opacity = Math.max(0, 0.8 - b / 0.5);
      for (const d of s.debris) {
        const v = d.userData.v;
        d.position.set(v.x * b, Math.max(-0.55, v.y * b - 4.9 * b * b), v.z * b);
        d.rotation.set(b * 10, b * 7, 0);
      }
      if (b > 1.2) { this.scene.remove(s.boom); s.boom = null; }
    }

    endShot(c) {
      const s = c && c.fx ? c : c && c.anim && c.anim.shot;
      if (!s) return;
      if (s.sky && s.style === 'flameline') { this.renderer.toneMappingExposure = s.sky.exposure; s.sky = null; }
      if (s.expo != null) { this.renderer.toneMappingExposure = s.expo; s.expo = null; }
      if (s.sabreRestore) { s.sabreRestore(); s.sabreRestore = null; }
      if (s.sky) this.restoreSky(s);
      for (const o of s.fx || []) {
        this.scene.remove(o);
        o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      if (s.headClone) { this.scene.remove(s.headClone); s.headClone = null; }
      s.fx = []; s.ball = null; s.boom = null; s.dragon = null; s.ended = true;
    }

    // Riposte à distance de la pièce prise : chacune lance sa propre technique sur l'attaquant
    // Technique de substitution : juste avant que la riposte ne l'atteigne, l'attaquant disparaît dans un nuage
    // de fumée et laisse à sa place une bûche qui encaisse le coup, puis il réapparaît pour lancer son attaque.
    substitution(c, a, u, t, M) {
      const T = this.THREE, swap = 0.62, back = 1.0, pos = a.from;
      M.setEarthWall(c.parts, 0);
      M.animate(c.parts, t, u < swap ? 'guard' : 'cast', 1);
      c.parts.root.visible = u < swap || u >= back;
      if (c.parts.riderRoot) c.parts.riderRoot.visible = c.parts.root.visible;
      if (c.shadow) c.shadow.visible = c.parts.root.visible;
      a.subst = a.subst || {};
      const puff = (at) => {
        const g = new T.Group(); g.position.set(at.x, 0, at.z); this.scene.add(g);
        const balls = [];
        for (let i = 0; i < 9; i++) {
          const m = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), new T.MeshBasicMaterial({ color: i % 3 ? 0xe8e8e8 : 0xbdbdbd, transparent: true, opacity: 0.85, depthWrite: false }));
          const ang = (i / 9) * Math.PI * 2;
          m.userData = { dx: Math.cos(ang) * 0.35, dz: Math.sin(ang) * 0.35, y: 0.25 + (i % 3) * 0.25 };
          g.add(m); balls.push(m);
        }
        this.addEffect({ start: t, dur: 0.45, tick: (e) => {
          const k = e / 0.45;
          for (const m of balls) { m.position.set(m.userData.dx * (0.4 + k), m.userData.y + k * 0.3, m.userData.dz * (0.4 + k)); m.scale.setScalar(0.6 + k * 1.2); m.material.opacity = 0.85 * (1 - k); }
        }, end: () => { this.scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } });
      };
      if (u >= swap && !a.subst.out) {
        a.subst.out = true;
        puff(pos);
        // la bûche prend sa place : elle encaisse la riposte, bascule et roule un peu en arrière
        const log = new T.Group(); log.position.set(pos.x, 0, pos.z); this.scene.add(log);
        const wood = new T.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 }), ring = new T.MeshStandardMaterial({ color: 0xd7b98e, roughness: 0.8 });
        const trunk = new T.Mesh(new T.CylinderGeometry(0.16, 0.17, 0.62, 12), wood); trunk.position.y = 0.31; log.add(trunk);
        for (const y of [0.62, 0]) { const r = new T.Mesh(new T.CircleGeometry(0.16, 12), ring); r.rotation.x = y ? -Math.PI / 2 : Math.PI / 2; r.position.y = y + (y ? 0.001 : -0.001); log.add(r); }
        const knot = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.12, 6), wood); knot.rotation.z = Math.PI / 2; knot.position.set(0.17, 0.42, 0); log.add(knot); log.scale.setScalar(1.3);
        log.rotation.y = c.holder.rotation.y;
        const fwd = { x: Math.sin(c.holder.rotation.y), z: Math.cos(c.holder.rotation.y) };
        this.addEffect({ start: t, dur: back - swap + 0.25, tick: (e) => {
          const hit = Math.max(0, e - (0.85 - swap));
          log.rotation.x = -Math.min(1.45, hit * 7); // touchée, elle tombe en arrière
          log.position.set(pos.x - fwd.x * Math.min(0.3, hit * 1.2), 0, pos.z - fwd.z * Math.min(0.3, hit * 1.2));
          log.visible = e < back - swap + 0.05;
        }, end: () => { this.scene.remove(log); log.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); wood.dispose(); ring.dispose(); } });
      }
      if (u >= back && !a.subst.in) { a.subst.in = true; puff(pos); }
    }

    // Projectile de riposte propre à la pièce ciblée, selon le thème (orienté le long de +z)
    counterProj(c, kind) {
      const T = this.THREE, theme = root.themeOf(c.piece), white = c.piece === c.piece.toUpperCase();
      const pal = THEME_FX[theme][white ? 'w' : 'b'];
      const g = new T.Group(); g.userData.themed = true;
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.2 }, o));
      const shaft = (len, r, color, tipColor) => {
        const sh = new T.Mesh(new T.CylinderGeometry(r, r, len, 6), std(color)); sh.rotation.x = Math.PI / 2; g.add(sh);
        const tip = new T.Mesh(new T.ConeGeometry(r * 3, len * 0.18, 6), std(tipColor, { metalness: 0.8 })); tip.rotation.x = Math.PI / 2; tip.position.z = len * 0.59; g.add(tip);
      };
      const glowBall = (r, c1, c2) => { g.add(new T.Mesh(new T.SphereGeometry(r, 12, 8), this.glow(c1, 1)), new T.Mesh(new T.SphereGeometry(r * 1.8, 12, 8), this.glow(c2, 0.5))); };
      const weapon = (WAR_PROJ[theme] && WAR_PROJ[theme][kind] && WAR_PROJ[theme][kind][white ? 'w' : 'b']) || (theme === 'modern' ? 'bullet' : theme === 'ancient' ? 'spear' : 'orb');
      if (AURA_PROJ.has(weapon)) g.add(this.auraProjMesh(weapon, white, pal));
      else if (weapon === 'spear' || weapon === 'spears') shaft(0.75, 0.018, '#8d6e63', '#cfd8dc');
      else if (weapon === 'bolt') shaft(0.95, 0.028, '#6d4c41', '#90a4ae');
      else if (weapon === 'arrows') shaft(0.5, 0.011, '#8d6e63', '#9e9e9e');
      else if (weapon === 'boulder') { g.add(new T.Mesh(new T.DodecahedronGeometry(0.2, 0), std(0x8d8478, { flatShading: true, roughness: 0.95 }))); g.userData.spin = true; }
      else if (weapon === 'firepot') { g.add(new T.Mesh(new T.SphereGeometry(0.12, 10, 8), std(0x6d4c41))); g.add(new T.Mesh(new T.SphereGeometry(0.2, 10, 8), this.glow(0xff7a1a, 0.7))); }
      else if (weapon === 'missiles' || weapon === 'bombs') { shaft(0.36, 0.032, '#eceff1', '#c62828'); const f = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), this.glow(0xffa726, 0.9)); f.position.z = -0.2; g.add(f); }
      else if (weapon === 'shell') { shaft(0.24, 0.045, '#b08d2e', '#8d6e2e'); g.add(new T.Mesh(new T.SphereGeometry(0.07, 8, 6), this.glow(0xffd54f, 0.9))); }
      else if (weapon === 'laser') { const beam = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.9, 8), this.glow(white ? 0x4fc3f7 : 0xff1744, 0.95)); beam.rotation.x = Math.PI / 2; g.add(beam); }
      else if (weapon === 'bullet') { for (let i = 0; i < 3; i++) { const tr = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3, 5), this.glow(0xffe082, 0.95)); tr.rotation.x = Math.PI / 2; tr.position.set((i - 1) * 0.06, (i % 2) * 0.05, -i * 0.25); g.add(tr); } }
      else if (kind === 'q' || kind === 'r') { const jet = new T.Mesh(new T.CylinderGeometry(0.06, 0.1, 0.7, 10), new T.MeshToonMaterial({ color: pal.jet, transparent: true, opacity: 0.9 })); jet.rotation.x = Math.PI / 2; g.add(jet); glowBall(0.08, pal.foam, pal.charge); } // créatures : jet du thème
      else glowBall(0.1, pal.bub, pal.charge); // créatures : bulle, graine, caillou, plume aux couleurs du thème
      return g;
    }

    counterShot(d, t) {
      const T = this.THREE, M = root.Models3D, k = d.counter, c = d.c, el = t - k.start;
      const kind = c.piece.toLowerCase(), cast = 'qrk'.includes(kind);
      if (el < 0.85) M.animate(c.parts, t, cast ? 'cast' : kind === 'b' ? 'throw' : 'punch', cast ? Math.min(1, el / 0.5) : Math.min(1, el / 0.45));
      else M.animate(c.parts, t, 'idle');
      if (el >= 0.3 && !k.proj && !k.done) {
        const g = THEME_FX[root.themeOf(c.piece)] ? this.counterProj(c, kind) : new T.Group();
        if (g.userData.themed) { /* arme propre à la pièce, aux couleurs du thème */ }
        else if (kind === 'b' && c.parts.shuriken) { g.add(this.cloneClean(c.parts.shuriken)); g.scale.setScalar(c.parts.root.scale.x * 1.1); }
        else {
          const col = { q: [0xfff1a8, 0xff7a1a], r: [0xd8f6ff, 0x2a8cff], k: [0xeaffff, 0x5fd8ff], n: [0xffffff, 0x9fb8ff], p: [0xffffff, 0xffc04a] }[kind] || [0xffffff, 0xffe066];
          const long = kind === 'p' || kind === 'k' || kind === 'n';
          const core = new T.Mesh(long ? new T.ConeGeometry(0.06, 0.42, 6) : new T.SphereGeometry(0.12, 12, 8), this.glow(col[0], 1));
          const halo = new T.Mesh(long ? new T.ConeGeometry(0.12, 0.5, 6) : new T.SphereGeometry(0.24, 12, 8), this.glow(col[1], 0.55));
          if (long) { core.rotation.x = halo.rotation.x = Math.PI / 2; }
          g.add(core, halo);
          g.scale.setScalar(1.5);
        }
        if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); k.start3 = c.parts.muzzle.getWorldPosition(new T.Vector3()); } else k.start3 = this.handsOf(c);
        k.proj = g; this.scene.add(g);
      }
      if (k.proj) {
        const u = Math.min(1, (el - 0.3) / 0.55);
        const end = new T.Vector3(k.at.x, 0.7, k.at.z);
        const pos = k.start3.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.25;
        k.proj.position.copy(pos);
        k.proj.lookAt(end);
        if (kind === 'b' && !k.proj.userData.themed) k.proj.rotation.z = -el * 28;
        if (k.proj.userData.spin) k.proj.rotation.set(el * 7, el * 5, 0);
        if (u >= 1) {
          // parée par l'attaquant : éclat à l'impact
          this.scene.remove(k.proj); k.proj = null; k.done = true;
          this.shakeUntil = t + 0.08; this.shakeAmp = 0.02;
          const pal = THEME_FX[root.themeOf(c.piece)] && THEME_FX[root.themeOf(c.piece)][c.piece === c.piece.toUpperCase() ? 'w' : 'b'];
          k.burst = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), this.glow(pal ? pal.burst[1] : kind === 'q' ? 0xff7a1a : kind === 'r' ? 0x2a8cff : 0xffe9a0, 0.85));
          k.burst.position.copy(end); k.burstT = el; this.scene.add(k.burst);
        }
      }
      if (k.burst) {
        // éclat sur la garde de l'attaquant
        const v = (el - k.burstT) / 0.25;
        k.burst.scale.setScalar(1 + v * 2.2); k.burst.material.opacity = Math.max(0, 0.85 * (1 - v));
        if (v >= 1) this.endBurst(k);
      }
    }
    endCounter(d) {
      const k = d.counter;
      if (k && k.proj) { this.scene.remove(k.proj); k.proj = null; k.done = true; }
      if (k) this.endBurst(k);
    }
    endBurst(k) {
      if (!k.burst) return;
      this.scene.remove(k.burst); k.burst.geometry.dispose(); k.burst.material.dispose(); k.burst = null;
    }

    // Étincelle au point d'impact pendant un duel
    // Escorte du général (guerriers modernes) : deux soldats de son camp entrent depuis le bord du plateau,
    // se postent devant lui de part et d'autre, mitraillent la cible puis repartent
    addEscort(esc, now) {
      const T = this.THREE, M = root.Models3D, P = esc.from, d = esc.dir, side = { x: -d.z, z: d.x };
      const soldiers = [-1, 1].map((sd) => {
        const parts = M.build(T, esc.white ? 'P' : 'p'), holder = new T.Group(); holder.add(parts.root); this.pieces.add(holder);
        const post = { x: P.x + d.x * 0.55 + side.x * sd * 0.6, z: P.z + d.z * 0.55 + side.z * sd * 0.6 };
        // entrée : depuis l'extérieur du plateau, du côté du soldat
        const out = { x: P.x + side.x * sd * 6.5 - d.x * 1.5, z: P.z + side.z * sd * 6.5 - d.z * 1.5 };
        holder.position.set(out.x, 0, out.z);
        if (esc.flying) {
          // bazooka sur l'épaule à la place du fusil
          if (parts.gun) parts.gun.visible = false;
          const tube = new T.Group(); tube.position.set(0.06, 0.15, 0.02); parts.torso.add(tube);
          const body = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.3, 10), new T.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.7 })); body.rotation.x = Math.PI / 2; tube.add(body);
          const mouth = new T.Mesh(new T.CylinderGeometry(0.03, 0.022, 0.05, 10), new T.MeshStandardMaterial({ color: 0x2e3318 })); mouth.rotation.x = Math.PI / 2; mouth.position.z = 0.16; tube.add(mouth);
          parts.bazooka = tube; parts.bazookaTip = new T.Object3D(); parts.bazookaTip.position.z = 0.2; tube.add(parts.bazookaTip);
          parts.pose = null; // pas de pose fusil : il tient le bazooka
        }
        return { parts, holder, post, out };
      });
      // roquette tirée au bazooka vers l'engin volant, avec traînée de fumée et explosion en l'air
      const fireRocket = (s, t0) => {
        const from = s.parts.bazookaTip.getWorldPosition(new T.Vector3()), to = new T.Vector3(esc.target.x, 0.9, esc.target.z);
        const rocket = new T.Group(); const rb = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 8), new T.MeshStandardMaterial({ color: 0x5d6b2f })); rb.rotation.x = Math.PI / 2; rocket.add(rb);
        const fl = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), this.glow(0xffa726, 0.9)); fl.position.z = -0.1; rocket.add(fl);
        this.scene.add(rocket); const puffs = [];
        const boom = new T.Mesh(new T.SphereGeometry(0.3, 14, 10), this.glow(0xff8a2a, 0.9)); boom.visible = false; boom.position.copy(to); this.scene.add(boom);
        this.addEffect({ start: t0, dur: 1.1, tick: (e) => {
          const u = Math.min(1, e / 0.4);
          rocket.visible = u < 1; rocket.position.copy(from).lerp(to, u); rocket.lookAt(to);
          if (u < 1 && Math.random() < 0.8) { const pf = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), new T.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7, depthWrite: false })); pf.position.copy(rocket.position); pf.userData.t = e; this.scene.add(pf); puffs.push(pf); }
          for (const pf of puffs) { const a = e - pf.userData.t; pf.scale.setScalar(1 + a * 3); pf.material.opacity = Math.max(0, 0.7 - a * 1.2); }
          if (u >= 1) { const k = (e - 0.4) / 0.7; boom.visible = k < 1; boom.scale.setScalar(0.5 + k * 2.2); boom.material.opacity = 0.9 * (1 - k); if (!s.boomShake) { s.boomShake = true; this.shakeUntil = this.now() + 0.3; this.shakeAmp = 0.08; } }
        }, end: () => { for (const o of [rocket, boom, ...puffs]) { this.scene.remove(o); o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); } } });
      };
      const run = (s, a, b, u, t) => {
        s.holder.position.set(a.x + (b.x - a.x) * u, 0, a.z + (b.z - a.z) * u);
        s.holder.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        M.animate(s.parts, t, 'run');
      };
      const tIn = 0.8, tFire = 1.85, tOut = 2.7;
      this.addEffect({ start: now, dur: tOut, tick: (e, t) => {
        for (const s of soldiers) {
          if (e < tIn) run(s, s.out, s.post, e / tIn, t);
          else if (e < tFire) {
            s.holder.position.set(s.post.x, 0, s.post.z);
            s.holder.rotation.y = Math.atan2(esc.target.x - s.post.x, esc.target.z - s.post.z);
            M.animate(s.parts, t, esc.flying ? 'guard' : 'punch', 1);
            if (esc.flying) {
              // épaule le bazooka (canon vers la cible en hauteur), puis tire une roquette
              s.parts.armR.rotation.set(-1.4, 0, -0.2); s.parts.armL.rotation.set(-1.2, 0, 0.5);
              if (s.parts.bazooka) s.parts.bazooka.rotation.x = -0.35;
              if (!s.fired && e > tIn + 0.25 + soldiers.indexOf(s) * 0.2) { s.fired = true; s.holder.updateMatrixWorld(true); fireRocket(s, t); }
            } else if (s.parts.mg) this.mgBurst(s, esc.target, t);
          } else run(s, s.post, s.out, (e - tFire) / (tOut - tFire), t);
        }
      }, end: () => {
        for (const s of soldiers) {
          this.pieces.remove(s.holder);
          if (s.tracer) for (const o of [s.tracer, s.tracer.userData.muzzle, s.tracer.userData.hit]) { this.scene.remove(o); if (this.tracers) this.tracers.delete(s.tracer); }
        }
      } });
    }

    // Rafale de mitrailleuse : balles traçantes de l'arme vers la cible, éclair au canon et étincelles à l'impact
    mgBurst(c, foe, t) {
      const T = this.THREE;
      if (!c.tracer) {
        const g = new T.Group();
        for (let i = 0; i < 4; i++) { const tr = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.35, 5), new T.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false })); g.add(tr); }
        g.userData.muzzle = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), new T.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        g.userData.hit = new T.Mesh(new T.IcosahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        this.scene.add(g, g.userData.muzzle, g.userData.hit);
        c.tracer = g; (this.tracers = this.tracers || new Set()).add(g);
      }
      const g = c.tracer; c.holder.updateMatrixWorld(true);
      const from = c.parts.mg.getWorldPosition(new T.Vector3()), to = new T.Vector3(foe.x, 0.55, foe.z), d = to.clone().sub(from), L = d.length();
      const dir = d.clone().normalize(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.children.forEach((tr, i) => { const u = ((t * 9 + i / 4) % 1); tr.position.copy(from).addScaledVector(d, u); tr.quaternion.copy(q); tr.visible = u * L > 0.1; });
      const on = Math.sin(t * 60) > 0;
      g.userData.muzzle.position.copy(from); g.userData.muzzle.visible = on; g.userData.muzzle.scale.setScalar(0.7 + Math.random() * 0.6);
      g.userData.hit.position.copy(to).addScaledVector(dir, -0.15); g.userData.hit.visible = !on; g.userData.hit.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.visible = true; g.userData.until = t + 0.06;
    }
    hideTracers(t) {
      for (const g of this.tracers || []) if (g.visible && !(t < g.userData.until)) { g.visible = false; g.userData.muzzle.visible = false; g.userData.hit.visible = false; }
    }

    flash(a, b, hits, color) {
      const T = this.THREE;
      if (!this.spark) {
        this.spark = new T.Mesh(new T.IcosahedronGeometry(0.12, 0), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        this.scene.add(this.spark);
      }
      const hit = hits % 1;
      const s = hit > 0.35 && hit < 0.6 ? 1 + Math.random() * 0.8 : 0;
      this.spark.material.color.setHex(color || 0xffe066);
      this.spark.visible = s > 0;
      this.spark.position.set((a.x + b.x) / 2, 0.75 + Math.random() * 0.1, (a.z + b.z) / 2);
      this.spark.scale.setScalar(s);
      this.spark.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.sparkUntil = this.now() + 0.05;
    }

    /* Saga des Auras : armes à distance, pouvoirs spéciaux et événements différés.
       Les pouvoirs sont de courts effets sur la case (addEffect) : ils ne changent rien aux règles. */
    auraAt(at, fn) { (this.auraEvents = this.auraEvents || []).push({ at, fn }); }
    tickAuraEvents(t) {
      if (!this.auraEvents || !this.auraEvents.length) return;
      const due = this.auraEvents.filter((e) => t >= e.at);
      this.auraEvents = this.auraEvents.filter((e) => t < e.at);
      due.forEach((e) => e.fn());
    }
    // Une pièce tombe : cratère sur la dalle, pouvoir de la victime, colère de Nilo, filet de Krax
    auraOnFall(victim, at, t0, attacker) {
      const fighter = (p) => root.themeOf(p) === 'auras';
      if (!fighter(attacker) && !fighter(victim.piece)) return;
      this.auraAt(t0, () => {
        const t = this.lastT || 0;
        this.createCrater(at, t, true);
        if (attacker === 'n' && fighter(attacker)) this.auraBurst('net', at, t);
        if (!fighter(victim.piece)) return;
        const style = { P: 'blind', p: 'smoke', B: 'parry', b: 'field', R: 'wall', r: 'rock', q: 'double' }[victim.piece];
        if (style) this.auraBurst(style, at, t);
        if (victim.piece === victim.piece.toUpperCase()) for (const c of this.chars.values()) if (c.piece === 'N') c.auraFlare = t + 1.6;
      });
    }
    auraBurst(style, at, t) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); this.scene.add(g);
      const glow = (c, o = 0.8) => { const m = this.glow(c, o); m.side = T.DoubleSide; return m; };
      const add = (geo, mat, y = 0.5) => { const m = new T.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
      const dur = { blind: 0.5, smoke: 0.9, parry: 0.6, field: 0.8, wall: 0.9, rock: 1.0, double: 0.8, net: 0.8, blink: 0.35 }[style];
      let step = () => {};
      if (style === 'blind') { const m = add(new T.SphereGeometry(0.5, 16, 12), glow(0xffffff, 1)); step = (k) => { m.scale.setScalar(0.3 + k * 2.2); m.material.opacity = 1 - k; }; }
      else if (style === 'smoke' || style === 'blink') {
        const color = style === 'smoke' ? 0x7a2bff : 0xbfeaff, balls = [];
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, m = add(new T.SphereGeometry(0.13, 10, 8), glow(color, 0.75)); m.userData = { x: Math.cos(a), z: Math.sin(a) }; balls.push(m); }
        step = (k) => balls.forEach((m) => { m.position.set(m.userData.x * (0.1 + k * 0.5), 0.3 + k * 0.5, m.userData.z * (0.1 + k * 0.5)); m.scale.setScalar(0.6 + k * 1.3); m.material.opacity = 0.75 * (1 - k); });
      } else if (style === 'parry') { const m = add(new T.TorusGeometry(0.38, 0.025, 8, 28), glow(0xffd27a, 0.95), 0.6); step = (k) => { m.rotation.y = k * 7; m.scale.setScalar(0.8 + k * 0.7); m.material.opacity = 0.95 * (1 - k); }; }
      else if (style === 'field') { const m = add(new T.IcosahedronGeometry(0.52, 1), Object.assign(glow(0x9ef7ff, 0.5), { wireframe: true })); step = (k) => { m.rotation.y = k * 3; m.material.opacity = 0.5 * (1 - k * k); }; }
      else if (style === 'wall') {
        const plates = [];
        for (let i = 0; i < 3; i++) { const a = -0.7 + i * 0.7, m = add(new T.CylinderGeometry(0.22, 0.26, 0.03, 6), glow(0x7fd8ff, 0.8)); m.rotation.x = Math.PI / 2; m.rotation.y = 0; m.position.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); plates.push(m); }
        step = (k) => plates.forEach((m) => { m.position.y = Math.min(0.55, k * 2); m.material.opacity = 0.8 * (1 - Math.max(0, k - 0.6) / 0.4); });
      } else if (style === 'rock') {
        const m = add(new T.DodecahedronGeometry(0.42, 0), new T.MeshStandardMaterial({ color: 0x3f3437, flatShading: true, transparent: true })), c = add(new T.SphereGeometry(0.46, 10, 8), glow(0xff7a1a, 0));
        step = (k) => { m.scale.setScalar(Math.min(1, k * 3)); c.material.opacity = k > 0.55 ? 0.8 * (1 - k) * 2 : 0; m.material.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; };
      } else if (style === 'double') {
        const m = add(new T.CylinderGeometry(0.13, 0.19, 0.85, 12), glow(0xc04bff, 0.55), 0.55);
        step = (k) => { m.position.x = 0.15 + k * 0.45; m.material.opacity = 0.55 * (1 - k); };
      } else if (style === 'net') {
        const m = add(new T.SphereGeometry(0.46, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), Object.assign(glow(0xdfe2ea, 0.9), { wireframe: true, blending: T.NormalBlending }), 0);
        step = (k) => { m.scale.setScalar(Math.min(1, 0.3 + k * 3)); m.material.opacity = k > 0.7 ? 0.9 * (1 - k) / 0.3 : 0.9; };
      }
      step(0);
      this.addEffect({ start: t, dur, tick: (e) => step(Math.min(1, e / dur)), end: () => this.disposeGroup(g) });
    }
    // En échec : dôme de lumière pour Oro, pesanteur (les cases s'enfoncent) pour Vorax
    tickAuraCheck(c, t) {
      const T = this.THREE, on = c.inCheck && (c.piece === 'K' || c.piece === 'k') && root.themeOf(c.piece) === 'auras';
      if (!on) { if (c.auraDome) c.auraDome.visible = false; return; }
      if (!c.auraDome) {
        const white = c.piece === 'K';
        const m = new T.Mesh(white ? new T.SphereGeometry(0.58, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2) : new T.RingGeometry(0.42, 1.0, 32), this.glow(white ? 0xbfeaff : 0x7a2bff, 0.35));
        m.material.side = T.DoubleSide; if (!white) { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; }
        c.auraDome = m; c.holder.add(m);
      }
      c.auraDome.visible = true;
      c.auraDome.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
    }

    /* Saga des Auras : un mat par pièce (AURA_MATE). Sorën et Mélyx ont la Constellation et la Nova, dans 05-mats-themes.js.
       Blancs : Cercle du Temple, Comète de Nilo, Aube Tranchante, Forteresse, Souffle des Nuages.
       Noirs : Nuée d'Ombre (les petits vilains embrasent le roi), Prime, Réseau (les Sentinelles en vol), Éruption, Chute de Comète. */
    makeAuraMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, style = u.themed, g = u.fx, A = this.sqToPos(u.attackerTo);
      const ball = (r, c, o = 0.9) => new T.Mesh(new T.SphereGeometry(r, 16, 12), basic(c, o));
      if (style === 'temple') {
        for (let i = 0; i < 8; i++) {
          const m = new T.Group(); g.add(m);
          const body = new T.Mesh(new T.ConeGeometry(0.16, 0.6, 10), std(0xe4dcc8)); body.position.y = 0.3; m.add(body);
          const head = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), std(0xf1c8a4)); head.position.y = 0.68; m.add(head);
          const band = new T.Mesh(new T.TorusGeometry(0.1, 0.018, 6, 14), std(0x3a9cff)); band.rotation.x = Math.PI / 2; band.position.y = 0.71; m.add(band);
          keep(m, { a: i / 8 * Math.PI * 2 });
        }
        u.joined = at(new T.Mesh(new T.TorusGeometry(1.25, 0.05, 8, 48), basic(0x4cc3ff, 0)), 0, 0.5, 0); u.joined.rotation.x = Math.PI / 2;
        u.blind = at(ball(1, 0xffffff, 0), 0, 0.8, 0);
      } else if (style === 'nilocomet') {
        const c = new T.Group(); g.add(c);
        c.add(ball(0.38, 0x2f8fe0, 0.85), ball(0.22, 0xffffff, 1));
        const tail = new T.Mesh(new T.ConeGeometry(0.36, 3.4, 12, 1, true), basic(0x4cc3ff, 0.55)); tail.position.y = 1.75; c.add(tail);
        u.comet = c;
      } else if (style === 'dawncross') {
        const d = new T.Vector3(P.x - A.x, 0, P.z - A.z), len = Math.max(0.1, d.length());
        u.streak = new T.Mesh(new T.BoxGeometry(0.1, 0.1, len), basic(0xffd27a, 0));
        u.streak.position.set((A.x + P.x) / 2, 0.7, (A.z + P.z) / 2); u.streak.rotation.y = Math.atan2(d.x, d.z); g.add(u.streak);
        const c = new T.Group(); c.position.set(P.x, 1, P.z); c.rotation.y = Math.atan2(this.camera.position.x - P.x, this.camera.position.z - P.z); g.add(c);
        for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(0.2, 3.4, 0.03), basic(0xffd27a, 1)); b.rotation.z = s * Math.PI / 4; b.add(new T.Mesh(new T.BoxGeometry(0.07, 3.4, 0.04), basic(0xffffff, 1))); c.add(b); }
        u.dawn = c; c.visible = false;
      } else if (style === 'fortress') {
        for (let i = 0; i < 3; i++) {
          const w = new T.Mesh(new T.CylinderGeometry(1, 1, 2.2, 8, 1, true, i / 3 * Math.PI * 2, Math.PI * 2 / 3 - 0.04), std(0x59617a, { side: T.DoubleSide, flatShading: true, roughness: 0.9 }));
          at(w, 0, 1.1, 0); keep(w, { i });
        }
        u.roof = at(new T.Mesh(new T.ConeGeometry(0.95, 0.7, 8), std(0x454c63, { flatShading: true })), 0, 6, 0);
        u.runes = at(new T.Mesh(new T.TorusGeometry(0.82, 0.03, 6, 40), basic(0x4cc3ff, 0)), 0, 1.1, 0); u.runes.rotation.x = Math.PI / 2;
      } else if (style === 'cloudbreath') {
        u.column = at(new T.Mesh(new T.CylinderGeometry(0.85, 1.1, 14, 24, 1, true), basic(0xbfeaff, 0)), 0, 7, 0);
        for (let i = 0; i < 18; i++) { const c = at(ball(0.3 + (i % 3) * 0.1, 0xffffff, 0.92)); c.scale.y = 0.6; keep(c, { a: i * 1.1, h: i / 18 }); }
      } else if (style === 'crystalcomet') {
        const c = new T.Group(); g.add(c);
        const core = new T.Mesh(new T.OctahedronGeometry(0.8, 0), std(0x2c2042, { emissive: 0x7a2bff, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.2, flatShading: true })); core.scale.y = 1.7; c.add(core);
        const tail = new T.Mesh(new T.ConeGeometry(0.62, 3.6, 8, 1, true), basic(0xc04bff, 0.5)); tail.position.y = 2.4; c.add(tail);
        u.comet = c;
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = at(new T.Mesh(new T.OctahedronGeometry(0.22, 0), std(0x2c2042, { emissive: 0x7a2bff, emissiveIntensity: 0.7, flatShading: true })), Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8); s.scale.y = 2.4; s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); keep(s, { spike: true }); }
      } else if (style === 'eruption') {
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = at(new T.Mesh(new T.BoxGeometry(0.07, 0.02, 1.5), basic(0xff7a1a, 0.95)), Math.cos(a) * 0.85, 0.03, Math.sin(a) * 0.85); c.rotation.y = -a + Math.PI / 2; keep(c, { crack: true }); }
        u.column = at(new T.Mesh(new T.CylinderGeometry(0.55, 0.85, 8, 16, 1, true), basic(0xff7a1a, 0.92)), 0, 4, 0);
        u.columnCore = at(new T.Mesh(new T.CylinderGeometry(0.3, 0.5, 8, 12), basic(0xffd27a, 0.95)), 0, 4, 0);
        for (let i = 0; i < 14; i++) { const r = at(new T.Mesh(new T.DodecahedronGeometry(0.1 + i % 3 * 0.05, 0), std(0x2b2326, { emissive: 0xff5a1a, emissiveIntensity: 0.6, flatShading: true }))); keep(r, { rock: true, a: i * 2.4, sp: 1 + i % 4 * 0.5, up: 5 + i % 3 }); }
        u.cooled = at(new T.Mesh(new T.DodecahedronGeometry(0.72, 0), std(0x3f3437, { flatShading: true, roughness: 1 })), 0, 0.55, 0); u.cooled.scale.setScalar(0.01);
      } else if (style === 'lasernet') {
        u.drones = [];
        for (let i = 0; i < 5; i++) { // Sentinelles en vol : casque à visière cyan, armure violet sombre, cape courte
          const d = new T.Group(); g.add(d);
          const body = new T.Mesh(new T.CylinderGeometry(0.17, 0.11, 0.48, 12), std(0x4a4466, { metalness: 0.5 })); body.position.y = -0.12; d.add(body);
          const helm = new T.Mesh(new T.SphereGeometry(0.15, 12, 10), std(0x4a4466, { metalness: 0.5 })); helm.position.y = 0.22; d.add(helm);
          const visor = new T.Mesh(new T.BoxGeometry(0.2, 0.04, 0.05), new T.MeshBasicMaterial({ color: 0x9ef7ff })); visor.position.set(0, 0.23, 0.13); d.add(visor);
          const chest = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), new T.MeshBasicMaterial({ color: 0x9ef7ff })); chest.position.set(0, 0, 0.15); d.add(chest);
          const back = new T.Mesh(new T.BoxGeometry(0.3, 0.46, 0.02), std(0x1a1626)); back.position.set(0, -0.14, -0.16); d.add(back);
          for (const s of [-1, 1]) { const arm = new T.Mesh(new T.CylinderGeometry(0.045, 0.04, 0.36, 8), std(0x2c2842)); arm.rotation.x = Math.PI / 2; arm.position.set(s * 0.2, 0, 0.15); d.add(arm); const palm = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: 0x9ef7ff })); palm.position.set(s * 0.2, 0, 0.34); d.add(palm); }
          const jet = new T.Mesh(new T.ConeGeometry(0.1, 0.34, 8), basic(0x9ef7ff, 0.55)); jet.rotation.x = Math.PI; jet.position.y = -0.52; d.add(jet);
          u.drones.push(d);
        }
        u.webs = [];
        for (let i = 0; i < 10; i++) { const l = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6), basic(i < 5 ? 0x9ef7ff : 0xff3d6e, 0.95)); l.visible = false; g.add(l); u.webs.push(l); }
      } else if (style === 'bounty') {
        u.chain = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), std(0xb9bcc7, { metalness: 0.9 })); g.add(u.chain);
        u.chainFrom = new T.Vector3(A.x, 0.7, A.z);
        for (let i = 0; i < 3; i++) { const r = at(new T.Mesh(new T.TorusGeometry(0.34, 0.03, 6, 22), std(0xb9bcc7, { metalness: 0.9 })), 0, 0.3 + i * 0.28, 0); r.rotation.x = Math.PI / 2; keep(r, { rope: i }); }
        u.net = at(new T.Mesh(new T.SphereGeometry(0.95, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0xdfe2ea, wireframe: true, transparent: true })), 0, 8, 0);
      } else if (style === 'shadeswarm') {
        for (let i = 0; i < 10; i++) { // petits vilains à chevelure de flamme : ils encerclent le roi en lançant leurs flammes
          const m = new T.Group(); g.add(m);
          const body = new T.Mesh(new T.CylinderGeometry(0.09, 0.13, 0.42, 10), std(0x1a1028)); body.position.y = 0.21; m.add(body);
          const head = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), std(0x5a3a8a)); head.position.y = 0.5; m.add(head);
          const mask = new T.Mesh(new T.CylinderGeometry(0.103, 0.103, 0.04, 12), std(0x120a1e)); mask.position.y = 0.51; m.add(mask);
          const hair = new T.Mesh(new T.ConeGeometry(0.09, 0.3, 8), basic(i % 2 ? 0x7a2bff : 0xc04bff, 0.95)); hair.position.y = 0.72; m.add(hair);
          keep(m, { walker: true, a: i / 10 * Math.PI * 2 });
        }
        for (let i = 0; i < 20; i++) { const f = new T.Mesh(new T.ConeGeometry(0.1, 0.34, 8), basic(i % 3 ? 0x7a2bff : 0xc04bff, 0.95)); g.add(f); keep(f, { a: i * 0.7, h: (i % 7) / 7, sp: 3 + i % 4 }); }
        u.engulf = at(ball(1, 0x7a2bff, 0.85), 0, 0.8, 0); u.engulf.scale.setScalar(0.01);
      }
    }
    tickAuraMate(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, P = u.target, style = u.themed, parts = u.mateParts, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1);
      this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.2) * 0.75 * fade(1.5));
      const link = (m, a, b) => { const d = b.clone().sub(a), L = Math.max(0.01, d.length()); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, L, 1); };
      const dive = (from, k) => { u.comet.position.set(P.x + from.x * (1 - k), 0.5 + from.y * (1 - k), P.z + from.z * (1 - k)); u.comet.rotation.y = t * 6; u.comet.visible = e > 0.7 && after < 0.05; };
      if (style === 'temple') {
        const k = smooth((e - 0.4) / 1.7);
        for (const m of parts) { const a = m.userData.a + (1 - k) * 1.5, r = 4.2 - k * 2.95; m.position.set(P.x + Math.cos(a) * r, 0, P.z + Math.sin(a) * r); m.rotation.y = -a - Math.PI / 2; m.visible = e > 0.3 && after < 1.2; }
        u.joined.material.opacity = smooth((e - 2.1) / 0.5) * 0.9 * fade(0.5); u.joined.rotation.z = t * 2;
        u.blind.material.opacity = after > 0 ? fade(0.8) : smooth((e - 2.7) / 0.3) * 0.9; u.blind.scale.setScalar(0.3 + smooth((e - 2.7) / 0.3) * 1.2 + Math.max(0, after) * 3);
      } else if (style === 'nilocomet') {
        const k = clamp((e - 0.8) / 2.2);
        dive(new T.Vector3(-3 + Math.cos(t * 7) * 0.7, 11, 2 + Math.sin(t * 7) * 0.7), k * k);
      } else if (style === 'dawncross') {
        u.streak.material.opacity = e > 0.7 && e < 1.2 ? Math.sin((e - 0.7) / 0.5 * Math.PI) : 0;
        const k = smooth((e - 2.85) / 0.2); // l'instant de silence, puis la croix
        u.dawn.visible = e > 2.85 && after < 1.5; u.dawn.scale.setScalar(0.2 + k * 0.8 + Math.max(0, after) * 0.3);
        u.dawn.children.forEach((b) => { b.material.opacity = fade(1.5); b.children[0].material.opacity = fade(1.5); });
      } else if (style === 'fortress') {
        const rise = smooth((e - 0.4) / 1.2), close = smooth((e - 1.6) / 1.2);
        for (const w of parts) { w.scale.set(1.9 - close, Math.max(0.01, rise), 1.9 - close); w.position.y = 1.1 * rise; w.rotation.y = (1 - close) * (1.2 + w.userData.i); w.visible = after < 1.4; }
        u.roof.position.y = 6 - smooth((e - 2.2) / 0.8) * 3.65; u.roof.visible = e > 2.2 && after < 1.4;
        u.runes.material.opacity = smooth((e - 1.9) / 0.6) * fade(1.4);
      } else if (style === 'cloudbreath') {
        u.column.material.opacity = smooth((e - 0.6) / 1.2) * 0.42 * fade(1.8); u.column.rotation.y = t * 2;
        for (const c of parts) { const d = c.userData, a = d.a + t * 3, h = (d.h + t * 0.3) % 1, r = 1.15 - h * 0.35; c.position.set(P.x + Math.cos(a) * r, 0.2 + h * 5, P.z + Math.sin(a) * r); c.visible = e > 0.6 && after < 1.8; }
      } else if (style === 'crystalcomet') {
        const k = clamp((e - 0.9) / 2.1);
        dive(new T.Vector3(3, 13, -2.5), k * k);
        for (const s of parts) { s.visible = after > 0; s.position.y = smooth(after / 0.25) * 0.42; }
      } else if (style === 'eruption') {
        const up = after > 0 ? smooth(after / 0.3) : smooth((e - 2.7) / 0.3) * 0.25;
        for (const p of parts) {
          if (p.userData.crack) { p.scale.z = Math.max(0.01, smooth((e - 0.5) / 1.8)); continue; }
          const d = p.userData, a = after; p.visible = a > 0 && a < 1.5;
          p.position.set(P.x + Math.cos(d.a) * d.sp * a, Math.max(0, d.up * a - 4.9 * a * a), P.z + Math.sin(d.a) * d.sp * a); p.rotation.set(a * 6, a * 4, 0);
        }
        for (const c of [u.column, u.columnCore]) { c.visible = e > 2.7 && after < 1.1; c.scale.y = Math.max(0.01, up); c.position.y = 4 * up; c.material.opacity = 0.92 * fade(1.1); }
        u.cooled.scale.setScalar(Math.max(0.01, smooth((after - 0.7) / 0.5))); // tout se refroidit en roche
      } else if (style === 'lasernet') {
        const tight = smooth((e - 1.1) / 1.9), r = 2.5 - tight * 1.55, spots = u.drones.map((d, i) => {
          const a = i / 5 * Math.PI * 2 + t * 1.4, v = new T.Vector3(P.x + Math.cos(a) * r, 1 + Math.sin(a * 2) * 0.35, P.z + Math.sin(a) * r);
          d.position.copy(v); d.lookAt(P.x, 0.6, P.z); d.visible = e > 0.3 && after < 1; return v;
        });
        const on = e > 1 && after < 0.7, king = new T.Vector3(P.x, 0.6, P.z);
        u.webs.forEach((l, i) => { l.visible = on; if (on) link(l, spots[i % 5], i < 5 ? spots[(i + 2) % 5] : king); });
      } else if (style === 'bounty') {
        const k = smooth((e - 0.5) / 0.7), to = new T.Vector3(P.x, 0.6, P.z);
        link(u.chain, u.chainFrom, u.chainFrom.clone().lerp(to, k)); u.chain.visible = e > 0.5;
        for (const r of parts) { const s = smooth((e - 1.1 - r.userData.rope * 0.25) / 0.4); r.visible = s > 0; r.scale.setScalar(2.2 - s * 1.2); }
        u.net.position.y = 8 - smooth((e - 2) / 1) * 8;
      } else if (style === 'shadeswarm') {
        const k = smooth((e - 0.5) / 2.3);
        for (const f of parts) {
          const d = f.userData;
          if (d.walker) { const a = d.a + t * 0.9, r = 3.2 - k * 1.8; f.position.set(P.x + Math.cos(a) * r, Math.abs(Math.sin(t * 9 + d.a)) * 0.06, P.z + Math.sin(a) * r); f.rotation.y = Math.atan2(P.x - f.position.x, P.z - f.position.z); f.visible = e > 0.3 && after < 1.2; continue; }
          const a = d.a + t * d.sp, r = 1.5 - k * 0.95; f.position.set(P.x + Math.cos(a) * r, 0.15 + d.h * 1.9, P.z + Math.sin(a) * r); f.visible = e > 0.9 && after < 0.2;
        }
        u.engulf.scale.setScalar(Math.max(0.01, after > 0 ? 0.75 + after * 0.5 : smooth((e - 2.5) / 0.5) * 0.75)); u.engulf.material.opacity = 0.85 * fade(1.6);
      }
    }

    // Armes à distance, orientées le long de +z
    auraProjMesh(kind, white, pal) {
      const T = this.THREE, g = new T.Group();
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.4, metalness: 0.5 }, o));
      const ball = (r, c1, c2) => g.add(new T.Mesh(new T.SphereGeometry(r, 12, 8), this.glow(c1, 1)), new T.Mesh(new T.SphereGeometry(r * 1.8, 12, 8), this.glow(c2, 0.5)));
      const bolt = (r, len) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 10), this.glow(pal.jet, 0.95)); m.rotation.x = Math.PI / 2; g.add(m); };
      if (kind === 'burst') ball(0.075, 0xffffff, pal.jet);
      else if (kind === 'darkfire') { g.add(new T.Mesh(new T.SphereGeometry(0.1, 12, 8), new T.MeshBasicMaterial({ color: 0x12081f }))); g.add(new T.Mesh(new T.SphereGeometry(0.19, 12, 8), this.glow(0xc04bff, 0.6))); }
      else if (kind === 'disc') { const m = new T.Mesh(new T.TorusGeometry(0.15, 0.03, 6, 22), this.glow(pal.jet, 1)); m.rotation.x = Math.PI / 2; g.add(m); }
      else if (kind === 'breath') { for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.TorusGeometry(0.12 + i * 0.06, 0.016, 6, 22), this.glow(0xffffff, 0.8)); m.position.z = -i * 0.14; g.add(m); } }
      else if (kind === 'gravity') { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, m = new T.Mesh(new T.OctahedronGeometry(0.075, 0), std(0xc04bff, { emissive: 0x7a2bff })); m.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0); g.add(m); } }
      else if (kind === 'hook') { const m = new T.Mesh(new T.TorusGeometry(0.1, 0.022, 6, 14, 4.4), std(0xdfe2ea)); g.add(m); const c = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.5, 6), std(0xb9bcc7)); c.rotation.x = Math.PI / 2; c.position.z = -0.32; g.add(c); }
      else if (kind === 'slash') { const m = new T.Mesh(new T.TorusGeometry(0.34, 0.035, 6, 20, 2.2), this.glow(0xfff2b8, 1)); m.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 1.1); g.add(m); }
      else if (kind === 'shield') { const m = new T.Mesh(new T.CylinderGeometry(0.17, 0.2, 0.03, 6), std(0xc9d2e4)); g.add(m); g.add(new T.Mesh(new T.SphereGeometry(0.05, 8, 6), this.glow(0x4cc3ff, 1))); }
      else if (kind === 'magma') { g.add(new T.Mesh(new T.DodecahedronGeometry(0.15, 0), std(0x2b2326, { flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.5 }))); g.add(new T.Mesh(new T.SphereGeometry(0.22, 10, 8), this.glow(0xff7a1a, 0.55))); }
      else bolt(0.04, 0.7); // rayons : un trait de lumière quand ils servent de riposte
      return g;
    }
    auraMissiles(kind, s, add) {
      const T = this.THREE, pal = s.pal, make = () => this.auraProjMesh(kind, s.white, pal), none = new T.Vector3();
      s.trail = kind === 'magma' ? [0xff7a1a, 0x3f3437] : kind === 'hook' ? [0xb9bcc7, 0x8d8d99] : [pal.charge, pal.jet];
      if (kind === 'burst') for (let i = 0; i < 6; i++) add(make(), i * 0.06, new T.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4), 0.3);
      else if (kind === 'magma') add(make(), 0, none, 1.9, 6);
      else if (kind === 'shield') add(make(), 0, none, 0.35, 12);
      else add(make(), 0, none, 0.08);
    }
    startAuraBeams(s, kind) {
      const T = this.THREE, spec = AURA_BEAMS[kind];
      s.auraBeams = spec.off.map((off) => {
        const b = new T.Mesh(new T.CylinderGeometry(spec.r, spec.r, 1, 12), this.glow(s.pal.jet, 0.85));
        b.add(new T.Mesh(new T.CylinderGeometry(spec.r * 0.45, spec.r * 0.45, 1, 10), this.glow(0xffffff, 1)));
        b.userData.off = off; b.visible = false; return this.fx(s, b);
      });
    }
    tickAuraBeams(s, end, el) {
      const T = this.THREE, u = Math.min(1, (el - s.fire) / s.flight * 1.3), dir = end.clone().sub(s.start), side = new T.Vector3(-dir.z, 0, dir.x).normalize();
      for (const b of s.auraBeams) {
        const a = s.start.clone().addScaledVector(side, b.userData.off), d = a.clone().lerp(end, u).sub(a), L = Math.max(0.01, d.length());
        b.visible = u > 0; b.position.copy(a).addScaledVector(d, 0.5);
        b.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        const w = 0.8 + Math.random() * 0.35; b.scale.set(w, L, w);
      }
    }
    // Charge de l'énergie dans les mains (ou le sceptre) avant le tir
    auraCharge(c, s, el) {
      const T = this.THREE;
      if (el >= s.fire) { if (s.auraGlow) s.auraGlow.visible = false; return; }
      if (!s.auraGlow) s.auraGlow = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 12, 8), this.glow(s.pal.charge, 0.8)));
      if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); c.parts.muzzle.getWorldPosition(s.auraGlow.position); } else s.auraGlow.position.copy(this.handsOf(c));
      s.auraGlow.scale.setScalar(0.3 + (el / s.fire) * 1.5);
    }

    /* L'Âge des Sabres : attaques (une par pièce, à toute distance) et mats (un par pièce, celui de la pièce qui mate).
       Les attaques passent par le mécanisme des attaques spéciales (knightAttack) : a.sabre donne la pièce qui attaque,
       a.hit l'instant du coup, a.moveAt l'instant où l'attaquant rejoint sa case. Tout est visuel, rien ne touche aux règles.
       Feu : orange et or côté blanc, violet côté noir. Modèles dans sabres3d.js. */
    sabrePal(white) {
      return white ? { hot: 0xfff1a8, mid: 0xffb13b, deep: 0xff6a1a, arc: 0xffffff, dragon: 0xffe066, ash: 0x8d8590 }
        : { hot: 0xead0ff, mid: 0xb45cff, deep: 0x6a1fd0, arc: 0xc98cff, dragon: 0xb45cff, ash: 0x6d6478 };
    }
    // Feu et énergie : couleur franche, sans mélange additif (sur le ciel clair du crépuscule, tout virerait au blanc)
    sabreFire(color, opacity = 0.9) {
      return new this.THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
    }
    // Faisceau de flammes (cônes qui dansent) ; sabreFlicker les anime
    sabreFlames(white, r = 0.3, h = 0.8, n = 9, opacity = 0.88) {
      const T = this.THREE, g = new T.Group(), geo = new T.ConeGeometry(1, 1, 7);
      const pal = Array.isArray(white) ? { mid: white[0], deep: white[2], hot: white[1] } : this.sabrePal(white); // ou les couleurs d'un thème à fiches
      g.userData.flames = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, rr = r * (0.2 + (i % 3) * 0.36), m = new T.Mesh(geo, this.sabreFire([pal.mid, pal.deep, pal.hot][i % 3], opacity));
        m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        m.userData.h = h * (0.55 + (i % 4) * 0.24); m.userData.w = r * (n > 12 ? 0.2 : 0.34 + (i % 2) * 0.16); m.userData.ph = i * 1.7;
        g.add(m); g.userData.flames.push(m);
      }
      return g;
    }
    sabreFlicker(g, t, k = 1) {
      g.visible = k > 0.01;
      for (const m of g.userData.flames) {
        const h = m.userData.h * k * (0.78 + 0.4 * Math.abs(Math.sin(t * 15 + m.userData.ph)));
        m.scale.set(m.userData.w * k, Math.max(0.01, h), m.userData.w * k); m.position.y = h / 2;
      }
    }
    // Lame d'énergie : croissant en voile courbe, visible sous tous les angles (axe +z = sens de la marche)
    sabreSail(w, h, color, opacity = 0.92) {
      const T = this.THREE, geo = new T.PlaneGeometry(1, 1, 22, 10), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i), a = u * 2.3, R = w / 2, thin = Math.pow(Math.max(0, Math.cos(v * Math.PI)), 0.55);
        pos.setXYZ(i, Math.sin(a) * R * thin, v * h, (Math.cos(a) - 1) * R * thin);
      }
      geo.computeVertexNormals();
      const m = this.sabreFire(color, opacity); m.side = T.DoubleSide;
      return new T.Mesh(geo, m);
    }
    sabreFace(c, x, z) {
      const p = c.holder.position; if (Math.hypot(x - p.x, z - p.z) < 0.02) return;
      const d = Math.atan2(x - p.x, z - p.z) - c.holder.rotation.y;
      c.holder.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * 0.3;
    }
    sabreLink(m, a, b) {
      const T = this.THREE, d = b.clone().sub(a), L = Math.max(0.01, d.length());
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, L, 1);
    }
    // Copie d'une arme du modèle, avec ses propres matériaux : l'effet peut les libérer sans toucher aux pièces
    sabreProp(o) { o.traverse((x) => { if (x.isMesh) { x.geometry = x.geometry.clone(); x.material = x.material.clone(); } }); return o; }
    // Impact : anneau au sol, boule de lumière, éclats
    sabreBurst(at, t, colors, n = 16, big = 1, y = 0.75) {
      const T = this.THREE, g = new T.Group(), dur = 0.75, bits = [];
      g.position.set(at.x, 0, at.z); this.scene.add(g);
      const ringMat = this.sabreFire(colors[0], 0.9); ringMat.side = T.DoubleSide;
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.46, 30), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const ball = new T.Mesh(new T.SphereGeometry(0.34 * big, 14, 10), this.sabreFire(colors[1] == null ? colors[0] : colors[1], 0.8)); ball.position.y = y; g.add(ball);
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(new T.TetrahedronGeometry(0.06, 0), this.sabreFire(colors[i % colors.length], 1)), a = Math.random() * 6.3, s = (1 + Math.random() * 2.2) * big;
        m.userData.v = [Math.cos(a) * s, 1.4 + Math.random() * 2.6, Math.sin(a) * s]; g.add(m); bits.push(m);
      }
      this.addEffect({ start: t, dur, tick: (e) => {
        const k = Math.min(1, e / dur);
        ring.scale.setScalar((1 + k * 4) * big); ringMat.opacity = 0.9 * (1 - k);
        ball.scale.setScalar(1 + k * 1.5); ball.material.opacity = 0.85 * (1 - k);
        for (const m of bits) { const v = m.userData.v; m.position.set(v[0] * e, Math.max(0.05, y + v[1] * e - 4.9 * e * e), v[2] * e); m.rotation.set(e * 9, e * 6, 0); m.material.opacity = 1 - k; }
      }, end: () => this.disposeGroup(g) });
    }

    /* ---------- Saga des Auras : longs déplacements ---------- */
    tickFlight(c, a, u, t) {
      const p = c.parts, r = p.root;
      if (a.flight === 'fly') {
        const lift = Math.min(1, Math.sin(Math.PI * u) * 2.4);
        r.position.y = lift * 0.85; c.shadow.scale.setScalar(Math.max(0.4, 1 - lift * 0.5));
        if (this.aimMode(p) === 'arm') { // à l'horizontale, bras tendus devant, jambes jointes
          r.rotation.x = lift * 1.3; c.flyTilt = true;
          p.armR.rotation.set(-2.9, 0, 0.1); p.armL.rotation.set(-2.9, 0, -0.1); p.legL.rotation.x = 0; p.legR.rotation.x = 0;
          for (const l of [p.legL, p.legR]) if (l.userData.knee) l.userData.knee.rotation.x = 0;
        }
        return;
      }
      // fou : flammes sur chaque case traversée
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, n = a.reach, done = Math.floor(e * n + 1e-6);
      for (a.fireDone = a.fireDone || 0; a.fireDone < done; a.fireDone++) {
        const k = (a.fireDone + 1) / n;
        this.fireOnSquare({ x: a.from.x + (a.to.x - a.from.x) * k, z: a.from.z + (a.to.z - a.from.z) * k }, c.piece, t);
      }
    }
    fireOnSquare(at, piece, t) {
      const dur = 1, colors = piece === piece.toUpperCase() ? [0x4cc3ff, 0xffd27a, 0x2f8fe0] : [0xc04bff, 0xff3d6e, 0x7a2bff]; // couleurs d'aura du camp
      const g = this.sabreFlames(colors, 0.36, 0.8, 8); g.position.set(at.x, 0.02, at.z); this.scene.add(g);
      this.addEffect({ start: t, dur, tick: (e, now) => this.sabreFlicker(g, now, Math.min(1, e / 0.12) * Math.max(0, 1 - Math.max(0, e - 0.55) / 0.45)), end: () => this.disposeGroup(g) });
    }

    /* ---------- Préparation d'une attaque ---------- */
    sabreAttack(kind, white, from, target, to, victim, now, len, dir) {
      const a = { style: 'sabre', sabre: kind === 'k' && white ? 'K' : kind, white, start: now, from, target, to, victim, dir, len, fx: [], pal: this.sabrePal(white) };
      a.fireHex = [a.pal.hot, a.pal.mid, a.pal.deep];
      const near = (gap) => ({ x: target.x - dir.x * gap, z: target.z - dir.z * gap });
      a.moveFrom = from;
      if (a.sabre === 'p') { const gap = Math.min(0.62, len); a.stop = near(gap); a.approach = 0.3 + Math.max(0, len - gap) * 0.09; a.clash = a.approach + 1.05; a.hit = a.clash + 0.25; a.moveAt = a.hit + 0.75; a.moveFrom = a.stop; }
      else if (a.sabre === 'n') { a.stop = near(Math.min(1, len)); a.approach = 0.75; a.hit = 0.75; a.moveAt = a.hit + 1.55; a.moveFrom = a.stop; }
      else if (a.sabre === 'q') { a.wind = 0.5; a.fly = 0.25 + len * 0.06; a.hit = a.wind + a.fly; a.moveAt = a.hit + 0.85; } // la lance reste plantée : elle va la chercher
      else if (a.sabre === 'r') { a.wind = 0.6; a.fly = 0.3 + len * 0.07; a.hit = a.wind + a.fly; a.back = 0.4 + len * 0.07; a.moveAt = a.hit + a.back + 0.15; }
      else if (a.sabre === 'b') { a.wind = 0.55; a.fly = 0.22 + len * 0.05; a.hit = a.wind + a.fly; a.moveAt = a.hit + 0.55; }
      else if (a.sabre === 'K') { a.wind = 0.5; a.hit = 0.62; a.stop = { x: target.x + dir.x * 0.72, z: target.z + dir.z * 0.72 }; a.moveAt = 1.6; a.moveFrom = a.stop; }
      else { const gap = Math.min(0.72, len); a.stop = near(gap); a.approach = 0.3 + Math.max(0, len - gap) * 0.09; a.hit = a.approach + 0.75; a.moveAt = a.hit + 0.95; a.moveFrom = a.stop; } // shōgun
      a.duration = a.moveAt + 0.3 + Math.hypot(to.x - a.moveFrom.x, to.z - a.moveFrom.z) * 0.09;
      return a;
    }
    // Naginata lancée : pointe en avant, enveloppée d'une vrille de feu qui s'affine vers l'avant
    sabreDrill(a) {
      const T = this.THREE, g = new T.Group(), spin = new T.Group(), fire = new T.Group(), hex = [a.pal.hot, a.pal.mid, a.pal.deep], cone = new T.ConeGeometry(1, 1, 6);
      spin.add(this.sabreProp(root.ThemeModels.sabres.naginata(T, a.white))); g.add(spin, fire); g.userData.spin = spin; g.userData.fire = fire;
      for (let i = 0; i < 26; i++) {
        const k = i / 26, r = 0.03 + k * 0.42, ang = i * 1.15, m = new T.Mesh(cone, this.sabreFire(hex[(i + 1) % 3], 0.9));
        m.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 1.05 - k * 1.8); m.rotation.x = Math.PI / 2; m.scale.set(0.05 + k * 0.08, 0.3 + k * 0.32, 0.05 + k * 0.08); fire.add(m);
      }
      for (let i = 0; i < 4; i++) { const k = 0.25 + i * 0.25, o = new T.Mesh(new T.TorusGeometry(0.03 + k * 0.42, 0.018, 6, 24), this.sabreFire(hex[(i + 1) % 3], 0.8)); o.position.z = 1.05 - k * 1.8; fire.add(o); }
      return g;
    }
    // Boule enflammée : le projectile, son feu et son lien avec la main
    sabreProjectile(a) {
      const T = this.THREE, g = new T.Group(), ball = this.sabreProp(root.ThemeModels.sabres.ball(T, a.white));
      g.add(ball); g.userData.spin = ball;
      const fire = new T.Group(); g.add(fire); g.userData.fire = fire; fire.userData.parts = [];
      // traînée de la boule : cônes couchés tournant autour de l'axe de marche
      const cone = new T.ConeGeometry(1, 1, 7), ring = [a.pal.hot, a.pal.mid, a.pal.deep];
      for (let i = 0; i < 10; i++) {
        const m = new T.Mesh(cone, this.sabreFire(ring[(i + 1) % 3], 0.88)), ang = i * 2.4;
        m.userData = { ang, r: 0.1, z: -0.05 - (i % 5) * 0.08, s: 0.1 + (i % 3) * 0.05, l: 0.45 + (i % 4) * 0.13 };
        m.rotation.x = -Math.PI / 2; fire.add(m); fire.userData.parts.push(m);
      }
      return g;
    }
    tickSabreProjectile(g, t, k) {
      const fire = g.userData.fire;
      fire.visible = k > 0.02;
      fire.rotation.z = t * 13;
      for (const m of fire.userData.parts) {
        const d = m.userData, w = Math.sin(t * 18 + d.ang) * 0.015;
        m.position.set(Math.cos(d.ang) * (d.r + w), Math.sin(d.ang) * (d.r + w), d.z * k);
        m.scale.set(d.s * k, d.l * k * (0.8 + Math.abs(Math.sin(t * 16 + d.ang)) * 0.45), d.s * k);
      }
    }

    /* ---------- L'attaquant ---------- */
    tickSabreAttack(c, a, el, t, M) {
      const T = this.THREE, p = c.parts, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (!a.sabreRestore) a.sabreRestore = () => { if (p.naginata) p.naginata.visible = true; if (p.ball) p.ball.visible = true; if (p.lance) p.lance.rotation.x = 0; };
      const hand = () => (p.muzzle ? p.muzzle.getWorldPosition(new T.Vector3()) : this.handsOf(c));
      const struck = (colors, big = 1, shake = 0.08) => { if (a.struck) return; a.struck = true; this.sabreBurst(a.target, t, colors, 16, big); this.shakeUntil = t + 0.3; this.shakeAmp = shake; };
      const going = el >= a.moveAt, kind = a.sabre;
      if (going) {
        const u = clamp((el - a.moveAt) / (a.duration - a.moveAt));
        this.sabreFace(c, a.to.x, a.to.z);
        c.holder.position.set(a.moveFrom.x + (a.to.x - a.moveFrom.x) * u, 0, a.moveFrom.z + (a.to.z - a.moveFrom.z) * u);
        M.animate(p, t, 'run'); p.root.position.y = 0;
      }
      if (kind === 'q') {
        if (!going) {
          c.holder.position.set(a.from.x, 0, a.from.z); this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          const w = clamp(el / a.wind);
          if (el < a.wind + 0.25) { p.armR.rotation.set(w < 1 ? -2.9 * w : -2.9 + (el - a.wind) * 7, 0, 0.25); p.torso.rotation.y = 0.5 * w * (1 - clamp((el - a.wind) * 4)); }
          else p.armR.rotation.set(-1.3, 0, 0.3);
        }
        const back = el >= a.duration - 0.06; // elle récupère sa lance en arrivant sur la case
        if (p.naginata) p.naginata.visible = el < a.wind || back;
        if (el >= a.wind && !a.ended) {
          if (!a.proj) { a.proj = this.fx(a, this.sabreDrill(a)); a.proj.rotation.y = Math.atan2(a.dir.x, a.dir.z); a.launch = hand(); }
          const g = a.proj, end = new T.Vector3(a.target.x, 0.85, a.target.z);
          if (el < a.hit) { const k = (el - a.wind) / a.fly; g.position.copy(a.launch).lerp(end, k); g.userData.spin.rotation.z = t * 30; g.userData.fire.rotation.z = -t * 22; g.userData.fire.scale.setScalar(0.7 + k * 0.4); }
          else {
            // plantée debout sur la case, elle vibre un instant
            const shiver = Math.sin(el * 46) * 0.1 * Math.max(0, 1 - (el - a.hit) / 0.5);
            g.userData.fire.visible = false; g.userData.spin.rotation.z = 0;
            g.position.set(a.target.x, 0.9, a.target.z); g.rotation.set(Math.PI / 2 + shiver, 0, 0); g.visible = !back;
            struck(a.fireHex, 1.15, 0.12);
          }
        }
      } else if (kind === 'r') {
        if (!going) {
          c.holder.position.set(a.from.x, 0, a.from.z); this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          const w = clamp(el / a.wind), throwing = el < a.wind + 0.25;
          if (throwing) { const s = w < 1 ? -2.9 * w : -2.9 + (el - a.wind) * 7; p.armR.rotation.set(s, 0, 0.25); p.torso.rotation.y = 0.5 * w * (1 - clamp((el - a.wind) * 4)); }
          else p.armR.rotation.set(-1.3, 0, 0.3);
        }
        const hold = el < a.wind || el >= a.hit + a.back;
        if (p.ball) p.ball.visible = hold;
        if (el >= a.wind && el < a.hit + a.back && !a.ended) {
          if (!a.proj) {
            a.proj = this.fx(a, this.sabreProjectile(a)); a.proj.rotation.y = Math.atan2(a.dir.x, a.dir.z);
            a.launch = hand();
            a.lineMat = new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 });
            a.line = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6), a.lineMat));
          }
          const end = new T.Vector3(a.target.x, 0.85, a.target.z), now = hand();
          let k, pos;
          if (el < a.hit) { k = (el - a.wind) / a.fly; pos = a.launch.clone().lerp(end, k); pos.y += Math.sin(k * Math.PI) * 0.55; }
          else { k = (el - a.hit) / a.back; pos = end.clone().lerp(now, k * k); pos.y += Math.sin(k * Math.PI) * 0.3; }
          a.proj.position.copy(pos);
          a.proj.userData.spin.rotation.x = t * 22;
          this.tickSabreProjectile(a.proj, t, el < a.hit ? 0.45 + clamp(k) * 0.75 : Math.max(0, 1 - (el - a.hit) / 0.25));
          if (a.line) this.sabreLink(a.line, now, pos);
          if (el >= a.hit) struck(a.fireHex, 1.15, 0.12);
        } else if (a.proj) { a.proj.visible = false; if (a.line) a.line.visible = false; }
      } else if (kind === 'b') {
        if (!going) {
          c.holder.position.set(a.from.x, 0, a.from.z); this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          const w = smooth(el / a.wind), cut = smooth((el - a.wind) / 0.12);
          p.armR.rotation.set(-2.8 * w + cut * 1.9, 0, 0.9 * (1 - cut) - 0.5 * cut);
          p.armL.rotation.set(-2.8 * w + cut * 1.9, 0, -0.9 * (1 - cut) + 0.5 * cut);
        }
        if (el >= a.wind && !a.arcs) {
          a.arcs = new T.Group(); a.arcs.rotation.y = this.viewYaw(); this.fx(a, a.arcs);
          for (const s of [-1, 1]) { const tilt = new T.Group(); tilt.rotation.z = s * Math.PI / 4; const m = this.sabreSail(0.46, 2, a.pal.arc), core = this.sabreSail(0.2, 1.7, a.white ? 0xffe9b0 : 0xffffff, 0.9); core.position.z = 0.03; tilt.add(m, core); a.arcs.add(tilt); }
          a.launch = hand(); a.launch.y = 0.85;
          a.arcAt = a.launch.clone();
        }
        if (a.arcs && !a.ended) {
          const end = new T.Vector3(a.target.x, 0.85, a.target.z), after = el - a.hit;
          if (after < 0) a.arcAt.copy(a.launch).lerp(end, (el - a.wind) / a.fly);
          else a.arcAt.set(end.x + a.dir.x * after * 13, 0.85, end.z + a.dir.z * after * 13);
          a.arcs.position.copy(a.arcAt); a.arcs.visible = after < 0.95;
          if (el >= a.hit) struck([a.pal.arc, a.pal.mid], 0.9, 0.08);
        }
      } else if (kind === 'K') {
        if (!going) {
          const dash = clamp((el - a.wind) / 0.12);
          c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * dash, 0, a.from.z + (a.stop.z - a.from.z) * dash);
          if (el < a.wind) this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          if (el < a.wind) { p.armR.rotation.set(-0.5, 0, -0.6); p.torso.rotation.y = 0.6; p.root.position.y = -0.05 * smooth(el / a.wind); } // main sur la poignée, ramassé
          else { const follow = clamp((el - a.wind) / 0.3); p.armR.rotation.set(-1.6 + follow * 0.2, 0, 0.5 + follow); p.torso.rotation.y = -0.5; }
        }
        if (el >= a.wind && !a.stroke) {
          // le trait blanc reste un instant dans l'air
          const d = new T.Vector3(a.stop.x - a.from.x, 0, a.stop.z - a.from.z), L = d.length() + 0.8;
          a.stroke = this.fx(a, new T.Mesh(new T.BoxGeometry(0.05, 0.05, L), this.glow(0xffffff, 1)));
          a.stroke.add(new T.Mesh(new T.BoxGeometry(0.16, 0.16, L), this.glow(0xdfeaff, 0.4)));
          a.stroke.position.set((a.from.x + a.stop.x) / 2, 0.82, (a.from.z + a.stop.z) / 2); a.stroke.rotation.y = Math.atan2(d.x, d.z);
        }
        if (a.stroke) { const k = clamp((el - a.hit) / 0.75); a.stroke.visible = k < 1; a.stroke.scale.set(1 - k, 1 - k, 1); }
        if (el >= a.hit) struck([0xffffff, 0xdfeaff], 0.7, 0.05);
      } else if (kind === 'k') {
        if (!going) {
          const w = clamp(el / a.approach);
          if (el < a.approach) { c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * w, 0, a.from.z + (a.stop.z - a.from.z) * w); M.animate(p, t, 'run'); }
          else {
            c.holder.position.set(a.stop.x, 0, a.stop.z);
            const k = (el - a.approach) / 0.75, up = k < 0.75 ? smooth(k / 0.6) : 1 - smooth((k - 0.75) / 0.22), s = -2.9 * up - 0.5 * (1 - up);
            M.animate(p, t, 'idle'); p.armR.rotation.set(s, 0, -0.45); p.armL.rotation.set(s, 0, 0.45); p.torso.rotation.x = 0.45 * (k >= 0.75 ? clamp((k - 0.75) * 5) : 0);
          }
          this.sabreFace(c, a.target.x, a.target.z);
        }
        if (el >= a.hit && !a.struck) {
          // le nodachi frappe le sol : la case tremble et se fend
          const P = a.target, sq = this.terrain && this.terrain.squares, plate = this.fx(a, new T.Mesh(new T.BoxGeometry(0.98, 0.05, 0.98), new T.MeshStandardMaterial({ color: sq ? sq[1] : '#5c3a24', roughness: 0.85 })));
          plate.position.set(P.x, 0.03, P.z); a.plate = plate;
          for (let i = 0; i < 6; i++) { const r = this.fx(a, new T.Mesh(new T.BoxGeometry(0.03, 0.012, 0.42), new T.MeshBasicMaterial({ color: 0x120d12 }))), ang = i * 1.05; r.position.set(P.x + Math.cos(ang) * 0.24, 0.062, P.z + Math.sin(ang) * 0.24); r.rotation.y = -ang + Math.PI / 2; }
          struck([0xbfb4c4, a.pal.mid], 1.25, 0.2);
        }
        if (a.plate) { const u = clamp((el - a.hit) / 0.7); a.plate.position.y = 0.03 + (u < 1 ? Math.abs(Math.sin(el * 42)) * 0.1 * (1 - u) : 0); a.plate.rotation.set((1 - u) * Math.sin(el * 37) * 0.09, 0, (1 - u) * Math.cos(el * 31) * 0.09); }
      } else if (kind === 'n') {
        if (!going) {
          const k = clamp(el / a.approach), e = k * k * (3 - 2 * k), lift = smooth((el - a.hit) / 0.3);
          c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * e, 0, a.from.z + (a.stop.z - a.from.z) * e);
          this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, el < a.approach ? 'run' : 'idle');
          p.root.position.y = Math.sin(k * Math.PI) * 0.75;
          if (p.lance) p.lance.rotation.x = -0.32 * lift * (1 - smooth((el - a.hit - 1) / 0.25));
          a.tipPos = p.lanceTip ? p.lanceTip.getWorldPosition(new T.Vector3()) : new T.Vector3(a.stop.x, 0.9, a.stop.z);
          if (el >= a.hit) struck([0xffffff, a.pal.mid], 0.55, 0.06);
        }
      } else if (!going) { // ashigaru : duel au sabre, puis il transperce
        const k = clamp(el / a.approach);
        if (el < a.approach) { c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * k, 0, a.from.z + (a.stop.z - a.from.z) * k); M.animate(p, t, 'run'); }
        else {
          c.holder.position.set(a.stop.x, 0, a.stop.z);
          if (el < a.clash) {
            const hits = (el - a.approach) * 3.4; M.animate(p, t, 'punch', hits);
            p.root.position.z = Math.sin(hits * Math.PI * 2) * 0.05;
            this.flash(a.stop, a.target, hits, a.white ? 0xffe6a0 : 0xd8b4ff);
          } else {
            const u = smooth((el - a.clash) / 0.25);
            M.animate(p, t, 'idle'); p.armR.rotation.set(-1.6, 0, 0); p.torso.rotation.x = 0.3 * u; p.root.position.z = 0.28 * u;
          }
        }
        this.sabreFace(c, a.target.x, a.target.z);
        if (el >= a.hit) struck([0xffffff, a.pal.mid], 0.5, 0.05);
      }
    }

    /* ---------- La pièce prise ---------- */
    tickSabreVictim(d, a, c, el, t, M) {
      if (el >= a.duration || a.ended) return false; // attaque finie, ou interrompue par le coup suivant
      const p = c.parts, r = p.root, B = a.target, dir = a.dir, after = el - a.hit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const kind = a.sabre;
      if (after < 0) {
        const from = a.stop && kind !== 'K' ? a.stop : a.from;
        this.sabreFace(c, from.x, from.z);
        if (kind === 'p' && el > a.approach) { M.animate(p, t, 'punch', (el - a.approach) * 3.4 + 0.5); r.position.z = 0; }
        else if (kind === 'p' || kind === 'K') M.animate(p, t, 'idle');
        else M.animate(p, t, 'guard', 1);
        return true;
      }
      if (c.shadow) c.shadow.visible = false;
      if (kind === 'q' || kind === 'r') {
        // éjectée loin dans le décor, en flammes si c'est la boule de la tour
        if (kind === 'r' && !a.victimFire) a.victimFire = this.fx(a, this.sabreFlames(a.white, 0.34, 1.1, 11));
        const u = clamp(after / 1.3), far = u * (2 - u) * 14;
        c.holder.position.set(B.x + dir.x * far, 0, B.z + dir.z * far);
        M.animate(p, t, 'ko'); r.position.y = Math.sin(u * Math.PI) * 3 + 0.05; r.rotation.set(u * 9, u * 3, u * 5);
        c.holder.visible = u < 1;
        if (a.victimFire) { a.victimFire.position.set(c.holder.position.x, r.position.y + 0.1, c.holder.position.z); this.sabreFlicker(a.victimFire, t, u < 1 ? 1 : 0); }
      } else if (kind === 'b') {
        // emportée par les deux arcs hors du plateau
        const at = a.arcAt || new this.THREE.Vector3(B.x, 0.85, B.z);
        c.holder.position.set(at.x, 0, at.z);
        M.animate(p, t, 'ko'); r.position.y = 0.3; r.rotation.set(after * 5, after * 9, 0);
        c.holder.visible = after < 0.95;
      } else if (kind === 'n') {
        // accrochée à la lance une seconde, puis elle tombe
        const tip = a.tipPos || new this.THREE.Vector3(B.x, 0.9, B.z), fall = smooth((after - 1) / 0.5);
        M.animate(p, t, 'ko');
        c.holder.position.set(tip.x + (B.x - tip.x) * fall, Math.max(0, (tip.y - 0.42) * (1 - fall)), tip.z + (B.z - tip.z) * fall);
        r.position.y = 0; r.rotation.set(0.35 + fall * 1.1, 0, Math.sin(el * 9) * 0.05 * (1 - fall));
        c.holder.visible = el < a.moveAt;
      } else if (kind === 'p') {
        M.animate(p, t, 'ko', 1);
        const fall = smooth((after - 0.35) / 0.35);
        r.position.y = 0; r.rotation.set(-1.5 * fall, 0, 0);
        c.holder.visible = el < a.moveAt;
      } else if (kind === 'K') {
        // un instant immobile, puis elle s'effondre : le coup est déjà passé
        const fall = smooth((after - 0.55) / 0.35);
        M.animate(p, t, fall > 0 ? 'ko' : 'idle');
        r.rotation.set(1.5 * fall, 0, 0); r.position.y = 0;
        c.holder.visible = el < a.moveAt;
      } else {
        const up = clamp(after / 0.5), fall = smooth((after - 0.45) / 0.3);
        M.animate(p, t, 'ko');
        r.position.y = Math.sin(up * Math.PI) * 0.75; r.rotation.set(up * 2 + fall, 0, 0);
        c.holder.visible = el < a.moveAt;
      }
      return true;
    }

    /* ---------- Mats ---------- */
    makeSabreMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed, A = this.sqToPos(u.attackerTo), white = u.piece === u.piece.toUpperCase(), pal = this.sabrePal(white);
      const s = u.sabre = { white, pal, A, dir: new T.Vector3(P.x - A.x, 0, P.z - A.z), flames: [] };
      g.visible = false; // rien ne se montre avant le début du mat, pendant que l'attaquant rejoint sa case
      s.len = Math.max(0.01, s.dir.length()); s.dir.normalize();
      const yaw = this.viewYaw();
      const crestBits = (color) => {
        s.bits = [];
        for (const k of [-1, 1]) { const m = new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 12, 2), std(color, { metalness: 0.7, roughness: 0.3 })); m.visible = false; m.userData.k = k; g.add(m); s.bits.push(m); }
      };
      if (style === 'sakura') {
        s.stroke = new T.Group(); s.stroke.position.set(P.x, 2.4, P.z); s.stroke.rotation.set(0, yaw, 0.42);
        s.stroke.add(new T.Mesh(new T.BoxGeometry(26, 0.11, 0.11), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })), new T.Mesh(new T.BoxGeometry(26, 0.34, 0.34), basic(0xdfeaff, 0.4)));
        g.add(s.stroke);
        const leaf = new T.PlaneGeometry(0.16, 0.11), tints = [basic(0xf4b6c6, 0.95), basic(0xeaa0b6, 0.95), basic(0xfbe0e7, 0.95)];
        s.petals = [];
        for (let i = 0; i < 240; i++) { const m = new T.Mesh(leaf, tints[i % 3]); m.userData = { a: Math.random() * 6.3, r: 0.3 + Math.random() * 2.6, y: Math.random() * 4.5, sp: 0.5 + Math.random() * 1.1, fall: 1.5 + Math.random() * 1.6, spin: Math.random() * 6 }; m.visible = false; g.add(m); s.petals.push(m); }
        crestBits(0xb07a3c);
      } else if (style === 'lunepourpre') {
        s.moon = new T.Group(); s.moon.position.set(-Math.sin(yaw) * 20 + Math.cos(yaw) * 6, 9, -Math.cos(yaw) * 20 - Math.sin(yaw) * 6);
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 4.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 3, 0);
        s.nightMat = new T.MeshBasicMaterial({ color: 0x0e090e, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; } // le soleil couchant s'efface devant la lune rouge
        s.night = new T.Mesh(new T.SphereGeometry(32, 24, 12), s.nightMat); s.night.renderOrder = -10; g.add(s.night);
        const lunar = new T.MeshBasicMaterial({ color: 0xc41e2e, transparent: true, opacity: 0, fog: false, toneMapped: false }), halo = new T.MeshBasicMaterial({ color: 0x8a1020, transparent: true, opacity: 0, fog: false, depthWrite: false, side: T.BackSide, toneMapped: false });
        s.moon.add(new T.Mesh(new T.SphereGeometry(3, 28, 18), lunar), new T.Mesh(new T.SphereGeometry(3.9, 24, 16), halo)); g.add(s.moon); s.moonMats = [lunar, halo];
        s.ink = [];
        const inkMat = new T.MeshBasicMaterial({ color: 0x050305, transparent: true, opacity: 0.95, depthWrite: false }), blob = new T.SphereGeometry(1, 12, 8);
        for (let i = 0; i < 26; i++) { const m = new T.Mesh(blob, inkMat), l = (i % 5 - 2) * 0.32; m.userData = { k: Math.floor(i / 5) * 0.06, l, h: 0.5 + (i % 4) * 0.32, w: 0.38 + (i % 3) * 0.14 }; m.visible = false; g.add(m); s.ink.push(m); }
        s.ash = [];
        const ashMat = basic(0x8d8590, 0.9), bit = new T.BoxGeometry(0.05, 0.05, 0.05);
        for (let i = 0; i < 80; i++) { const m = new T.Mesh(bit, ashMat); m.userData = { x: (Math.random() - 0.5) * 11, z: (Math.random() - 0.5) * 11, y: Math.random() * 7, sp: 0.4 + Math.random() * 0.8 }; m.visible = false; g.add(m); s.ash.push(m); }
        crestBits(0xc9a24a);
      } else if (style === 'tigreb') {
        this.makeTigerMate(u, s, g, std);
      } else if (style === 'dragonw') {
        // nuages sombres d'où descend le dragon
        const cloud = new T.SphereGeometry(1, 12, 8), cloudMat = new T.MeshBasicMaterial({ color: white ? 0x2a2433 : 0x161020, transparent: true, opacity: 0, depthWrite: false });
        s.cloudMat = cloudMat;
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 12.5 + (i % 4) * 1.2, c = new T.Mesh(cloud, cloudMat); c.position.set(Math.cos(a) * r, 5.5 + (i % 3) * 0.8, Math.sin(a) * r); c.scale.set(3.4, 1, 2.6); c.rotation.y = -a; g.add(c); }
        s.segs = [];
        const n = 48, mid = this.sabreFire(pal.dragon, 0.97), deep = this.sabreFire(pal.deep, 0.45), hot = this.sabreFire(pal.hot, 0.95), scale = new T.SphereGeometry(1, 12, 8), spine = new T.ConeGeometry(0.5, 1.5, 5);
        for (let i = 0; i < n; i++) {
          const m = new T.Group(), r = 0.44 * Math.pow(1 - i / n, 0.6) + 0.05;
          const body = new T.Mesh(scale, mid), halo = new T.Mesh(scale, deep); body.scale.setScalar(r); halo.scale.setScalar(r * 1.45); m.add(body, halo);
          if (i % 3 === 0) { const c = new T.Mesh(spine, hot); c.position.y = r * 1.25; c.scale.setScalar(r * 0.8); m.add(c); }
          m.visible = false; g.add(m); s.segs.push(m);
        }
        const head = new T.Group(); s.head = head; g.add(head);
        const skull = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), mid); skull.scale.set(0.95, 0.75, 1.3); head.add(skull);
        const snout = new T.Mesh(new T.BoxGeometry(0.46, 0.2, 0.62), hot); snout.position.set(0, 0.04, 0.66); head.add(snout);
        s.jaw = new T.Mesh(new T.BoxGeometry(0.4, 0.09, 0.62), mid); s.jaw.position.set(0, -0.2, 0.55); head.add(s.jaw);
        for (const k of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.08, 0.8, 6), hot); horn.position.set(k * 0.25, 0.35, -0.4); horn.rotation.set(-1.1, 0, k * -0.3); head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff })); eye.position.set(k * 0.27, 0.2, 0.3); head.add(eye);
          for (let i = 0; i < 3; i++) { const fang = new T.Mesh(new T.ConeGeometry(0.04, 0.16, 4), new T.MeshBasicMaterial({ color: 0xffffff })); fang.rotation.x = Math.PI; fang.position.set(k * 0.17, -0.1, 0.5 + i * 0.17); head.add(fang); }
        }
        head.visible = false;
        s.born = SABRE_DRAGON_BORN;
        this.sabreThrown(u, s, g, Math.min(1.5, s.len * 0.45));
        s.embers = [];
        const spark = new T.SphereGeometry(0.05, 6, 4);
        for (let i = 0; i < 60; i++) { const m = new T.Mesh(spark, hot); m.visible = false; g.add(m); s.embers.push(m); }
      } else if (style === 'fracasw' || style === 'fracasb') {
        const models = root.ThemeModels.sabres;
        s.ball = new T.Group(); s.ball.add(this.sabreProp(models.ball(T, white)));
        s.ball.scale.setScalar(1.6); g.add(s.ball);
        s.ballFire = this.sabreFlames(white, 0.4, 1.4, 14); g.add(s.ballFire);
        s.chain = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 })); g.add(s.chain);
        // sous les cases : le trou sombre, puis les 64 cases qui volent en éclats depuis le point d'impact
        const squares = (this.terrain && this.terrain.squares) || ['#d9b98a', '#5c3a24'];
        const lightMat = new T.MeshStandardMaterial({ color: squares[0], roughness: 0.8 }), darkMat = new T.MeshStandardMaterial({ color: squares[1], roughness: 0.8 }), tile = new T.BoxGeometry(0.98, 0.09, 0.98);
        s.pit = new T.Mesh(new T.PlaneGeometry(8.02, 8.02), new T.MeshBasicMaterial({ color: 0x0a0708 })); s.pit.rotation.x = -Math.PI / 2; s.pit.position.y = 0.018; s.pit.visible = false; g.add(s.pit);
        s.tiles = [];
        for (let i = 0; i < 64; i++) {
          const f = i & 7, r = i >> 3, m = new T.Mesh(tile, (f + r) % 2 ? darkMat : lightMat), x = f - 3.5, z = r - 3.5, d = Math.hypot(x - P.x, z - P.z), ang = Math.atan2(z - P.z, x - P.x);
          m.position.set(x, 0.05, z); m.visible = false;
          m.userData = { x, z, delay: d * 0.035, vx: Math.cos(ang) * (2.4 + Math.random() * 2.6) + (Math.random() - 0.5), vz: Math.sin(ang) * (2.4 + Math.random() * 2.6) + (Math.random() - 0.5), vy: 8.5 - Math.min(5, d * 0.7) + Math.random() * 3, rx: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14 };
          g.add(m); s.tiles.push(m);
        }
        s.cracks = [];
        for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + Math.random() * 0.2, L = 3 + Math.random() * 4, m = at(new T.Mesh(new T.BoxGeometry(0.06, 0.02, L), basic(pal.mid, 0.95)), Math.cos(a) * L / 2, 0.03, Math.sin(a) * L / 2); m.rotation.y = -a + Math.PI / 2; m.visible = false; s.cracks.push(m); }
      } else if (style === 'arcw' || style === 'arcb') {
        s.sail = new T.Group(); s.sail.rotation.y = yaw; g.add(s.sail);
        const big = this.sabreSail(1.25, 3.6, pal.arc, 0.92); big.position.y = 1.8; big.rotation.z = -0.28; s.sail.add(big);
        const core = this.sabreSail(0.6, 3.1, white ? 0xffe9b0 : 0xffffff, 0.9); core.position.set(0, 1.8, 0.05); core.rotation.z = -0.28; s.sail.add(core);
        s.sail.visible = false;
        // feu sur chaque case traversée
        s.trail = [];
        for (let k = 1; k < 12; k++) {
          const x = A.x + s.dir.x * k, z = A.z + s.dir.z * k;
          if (Math.abs(x) > 4 || Math.abs(z) > 4) break;
          const f = this.sabreFlames(white, 0.4, 0.95, 8); f.position.set(x, 0.02, z); f.userData.s = k; f.visible = false; g.add(f); s.trail.push(f);
        }
        // pièces adverses dans le couloir de l'arc
        const enemyWhite = !white; s.swept = new Map();
        for (const c of this.chars.values()) {
          if (c === u.king || (c.piece === c.piece.toUpperCase()) !== enemyWhite) continue;
          const dx = c.holder.position.x - A.x, dz = c.holder.position.z - A.z, along = dx * s.dir.x + dz * s.dir.z, side = Math.abs(dx * s.dir.z - dz * s.dir.x);
          if (along > 0.3 && side < 1.05) s.swept.set(c, { along, off: (dx * s.dir.z - dz * s.dir.x) * -1, spin: 1 + Math.random() * 2, position: c.holder.position.clone(), visible: c.holder.visible, rotation: c.parts.root.rotation.clone() });
        }
      } else if (style === 'ridew' || style === 'rideb') {
        s.riderFire = this.sabreFlames(white, 0.36, 0.8, 14, 0.55); g.add(s.riderFire);
        s.horseFire = this.sabreFlames(white, 0.5, 0.5, 16, 0.55); g.add(s.horseFire);
        s.kingFire = this.sabreFlames(white, 0.3, 0.9, 9); g.add(s.kingFire);
        const dist = Math.min(1.05, s.len);
        s.stop = { x: P.x - s.dir.x * dist, z: P.z - s.dir.z * dist };
      } else if (style === 'lamew' || style === 'lameb') {
        s.blade = this.sabreFlames(white, 0.11, 0.42, 7); g.add(s.blade);
        s.kingFire = this.sabreFlames(white, 0.36, 1.25, 13); g.add(s.kingFire);
        s.slashes = [];
        for (let i = 0; i < 3; i++) {
          const m = this.sabreSail(0.4, 1.5, pal.mid, 0.95); m.position.set(P.x, 0.8, P.z); m.rotation.set(0, yaw, [-0.8, 0.8, 0][i]); m.visible = false; g.add(m); s.slashes.push(m);
        }
        const dist = Math.min(0.62, s.len);
        s.stop = { x: P.x - s.dir.x * dist, z: P.z - s.dir.z * dist };
      }
    }
    // Le tigre de feu noir : corps noir, rayures violettes lumineuses ; +z = vers l'avant, la tête à l'origine
    makeTigerMate(u, s, g, std) {
      const T = this.THREE, A = s.A, cloud = new T.SphereGeometry(1, 12, 8), cloudMat = new T.MeshBasicMaterial({ color: 0x161020, transparent: true, opacity: 0, depthWrite: false });
      s.cloudMat = cloudMat; s.born = 1.1;
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 12.5 + (i % 4) * 1.2, c = new T.Mesh(cloud, cloudMat); c.position.set(Math.cos(a) * r, 5.5 + (i % 3) * 0.8, Math.sin(a) * r); c.scale.set(3.4, 1, 2.6); c.rotation.y = -a; g.add(c); }
      const hide = std(0x120a1a, { roughness: 0.5 }), glow = this.sabreFire(0xb45cff, 1), hot = this.sabreFire(0xffe14d, 1), part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };
      const ball = new T.SphereGeometry(1, 14, 10), stick = new T.CylinderGeometry(0.16, 0.12, 1, 8), bar = new T.BoxGeometry(1, 1, 1);
      const tiger = new T.Group(); s.tiger = tiger; s.head = tiger; g.add(tiger);
      tiger.add(part(ball, hide, 0, 0, 0, 0.42, 0.38, 0.46), part(ball, hide, 0, -0.09, 0.42, 0.25, 0.18, 0.26), part(ball, hide, 0, -0.1, -0.5, 0.42, 0.44, 0.45), part(ball, hide, 0, -0.1, -1.25, 0.5, 0.52, 0.95));
      s.jaw = part(ball, hide, 0, -0.28, 0.33, 0.22, 0.07, 0.3); tiger.add(s.jaw);
      for (const k of [-1, 1]) {
        tiger.add(part(ball, hide, k * 0.28, 0.34, -0.05, 0.13, 0.15, 0.06), part(ball, hot, k * 0.19, 0.1, 0.36, 0.07, 0.05, 0.05));
        for (const z of [0.42, 0.52]) { const f = new T.Mesh(new T.ConeGeometry(0.035, 0.15, 4), new T.MeshBasicMaterial({ color: 0xf4f0f8 })); f.position.set(k * 0.1, -0.2, z); f.rotation.x = Math.PI; tiger.add(f); }
      }
      for (let i = 0; i < 9; i++) { const z = -0.45 - i * 0.2; for (const k of [-1, 1]) { const m = part(bar, glow, k * 0.34, 0.14 - (i % 2) * 0.1, z, 0.22, 0.07, 0.06); m.rotation.z = k * -0.5; tiger.add(m); } tiger.add(part(bar, glow, 0, 0.49, z, 0.06, 0.04, 0.12)); }
      for (const [x, y] of [[-0.14, 0.2], [0.14, 0.2], [-0.05, 0.3], [0.05, 0.3]]) tiger.add(part(bar, glow, x, y, 0.3, 0.05, 0.04, 0.2));
      s.tigerLegs = [];
      for (const [x, z, ph] of [[-0.34, -0.55, 0], [0.34, -0.55, 3.14], [-0.34, -1.9, 2.1], [0.34, -1.9, 5.2]]) { const l = new T.Group(); l.position.set(x, -0.3, z); l.userData.ph = ph; l.add(part(stick, hide, 0, -0.42, 0, 1, 0.9, 1), part(ball, hide, 0, -0.86, 0.07, 0.15, 0.09, 0.2)); tiger.add(l); s.tigerLegs.push(l); }
      s.tigerTail = new T.Group(); s.tigerTail.position.set(0, 0.1, -2.15); tiger.add(s.tigerTail);
      for (let i = 0; i < 8; i++) s.tigerTail.add(part(ball, i % 2 ? glow : hide, 0, Math.sin(i * 0.5) * 0.4, -i * 0.2, 0.09 - i * 0.006, 0.09 - i * 0.006, 0.12));
      s.tigerFire = this.sabreFlames([0x2a0a3a, 0xb45cff, 0x0c0410], 0.95, 1.9, 18, 0.72); g.add(s.tigerFire);
      this.sabreThrown(u, s, g, Math.min(0.75, s.len * 0.45), new T.Vector3(A.x + s.dir.x * 0.5, 1.25, A.z + s.dir.z * 0.5));
    }
    // Naginata lancée ou qui retombe, et trajet de la bête : H, d'où elle part ; K, sa tête quand la gueule arrive sur le roi
    sabreThrown(u, s, g, reach, from) {
      const T = this.THREE, P = u.target, A = s.A;
      s.spear = new T.Group(); s.spearSpin = new T.Group(); s.spear.add(s.spearSpin);
      const thrown = this.sabreProp(root.ThemeModels.sabres.naginata(T, s.white)); thrown.rotation.x = Math.PI / 2; thrown.position.y = -0.14; s.spearSpin.add(thrown);
      s.spear.visible = false; g.add(s.spear);
      s.spearFire = this.sabreFlames(s.white, 0.26, 0.9, 10, 0.8); s.spear.add(s.spearFire);
      s.reach = reach;
      s.K = new T.Vector3(P.x - s.dir.x * reach, 0.95, P.z - s.dir.z * reach);
      s.H = from || new T.Vector3((A.x + s.K.x) / 2, 1.25, (A.z + s.K.z) / 2); s.L1 = Math.max(0.5, s.H.distanceTo(s.K)); s.a0 = Math.atan2(P.z, P.x);
    }
    // Trajet du dragon (q, en longueur) : il arrive derrière la Dame, file sur le roi, puis fait un tour du plateau en montant
    sabreDragonPos(s, q) {
      const T = this.THREE, ring = (k, y) => { const a = s.a0 + k * Math.PI * 2; return new T.Vector3(Math.cos(a) * 5.5, y, Math.sin(a) * 5.5); };
      if (q < 0) return new T.Vector3(s.H.x - s.dir.x * q * -1 + Math.sin(q * 0.8) * 0.5 * s.dir.z, s.H.y - q * 0.42, s.H.z - s.dir.z * q * -1 - Math.sin(q * 0.8) * 0.5 * s.dir.x);
      if (q < s.L1) return s.H.clone().lerp(s.K, q / s.L1);
      const r = q - s.L1;
      if (r < 3) return s.K.clone().lerp(ring(0, 3), r / 3);
      const k = (r - 3) / 34;
      return ring(k, 3 + k * 11);
    }
    // Où en est la tête de la bête à l'instant e : elle naît à s.born et fonce sur le roi
    sabreDragonAt(s, e, hit) {
      const born = s.born, q = e < born ? 0 : e < hit ? s.L1 * Math.pow((e - born) / (hit - born), 2) : s.L1 + (e - hit) * 14;
      s.q = q; s.headPos = this.sabreDragonPos(s, q); s.fwd = this.sabreDragonPos(s, q + 0.1).sub(s.headPos).normalize();
      s.mouth = s.headPos.clone().addScaledVector(s.fwd, s.reach);
    }
    tickSabreMateFx(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, s = u.sabre, P = u.target, style = u.themed, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1), A = s.A;
      u.fx.visible = true;
      if (this.checkGroup) this.checkGroup.visible = false;
      if (s.stop && e > 0.8) { u.pillar.material.opacity = 0; u.aura.material.opacity = 0; }
      const breakCrest = () => {
        if (after < 0 || s.broken) return;
        s.broken = true;
        const crest = u.king && u.king.parts.crest;
        if (crest) { crest.visible = false; (u.hiddenParts = u.hiddenParts || []).push(crest); }
        for (const m of s.bits) m.visible = true;
      };
      const dropBits = () => { if (!s.bits) return; for (const m of s.bits) { const k = clamp(after / 0.8), d = m.userData.k; m.visible = after >= 0; m.position.set(P.x + d * (0.16 + k * 0.42), Math.max(0.06, 1.35 - k * k * 1.3), P.z + d * k * 0.2); m.rotation.set(k * 5, d * k * 3, d * 0.8); } };
      if (style === 'sakura') {
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.6) * 0.7 * fade(2));
        s.stroke.visible = e > 2.15 && e < 2.75; s.stroke.scale.set(smooth((e - 2.15) / 0.1), 1 - clamp((e - 2.3) / 0.45), 1 - clamp((e - 2.3) / 0.45));
        for (const m of s.petals) {
          const d = m.userData, a = d.a + (after + 3) * d.sp, h = ((d.y - Math.max(0, after) * d.fall) % 4.5 + 4.5) % 4.5, r = d.r * (0.35 + 0.65 * (1 - clamp(after / 1.4)) ) + 0.2;
          m.visible = after > -0.15 && after < 2.2; m.position.set(P.x + Math.cos(a) * r, 0.05 + h, P.z + Math.sin(a) * r); m.rotation.set(d.spin + t * 3, d.spin + t * 2, 0);
        }
        breakCrest(); dropBits();
      } else if (style === 'lunepourpre') {
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.3) * 0.92 * fade(2.2));
        const rise = smooth((e - 0.3) / 1.4), f = fade(2.2);
        s.moonMats[0].opacity = rise; s.moonMats[1].opacity = rise * 0.6; s.nightMat.opacity = smooth(e / 1.3);
        const k = clamp((e - 2.3) / (hit - 2.3)), dir = s.dir, side = new T.Vector3(-dir.z, 0, dir.x);
        for (const m of s.ink) {
          const d = m.userData, w = clamp(k * 1.25 - d.k);
          m.visible = e > 2.3 && after < 1.5;
          m.position.set(A.x + dir.x * s.len * w + side.x * d.l, d.h * 0.5, A.z + dir.z * s.len * w + side.z * d.l);
          const sc = (d.w + (after > 0 ? after * 0.7 : 0)) * (1 - clamp((after - 0.7) / 0.8));
          m.scale.set(Math.max(0.01, sc), Math.max(0.01, sc * (1.5 + Math.sin(t * 9 + d.l) * 0.3)), Math.max(0.01, sc));
        }
        for (const m of s.ash) { const d = m.userData; m.visible = after > -0.2 && after < 2.2; m.position.set(d.x, ((d.y - after * d.sp) % 7 + 7) % 7, d.z); m.rotation.set(t * 2, t, 0); }
        breakCrest(); dropBits();
      } else if (style === 'tigreb') {
        this.skyDim = Math.max(this.skyDim || 0, smooth((e - 0.7) / 0.8) * 0.88 * fade(2.6));
        s.cloudMat.opacity = smooth((e - 0.7) / 0.8) * 0.9 * fade(3);
        const change = 0.75, end = hit + 2.65, back = hit + 2.7, caught = hit + 3.25, on = e > change && e < end, shrink = 1 - smooth((e - end + 0.6) / 0.6) * 0.92;
        if (e > change) { u.pillar.material.opacity *= 1 - smooth((e - change) / 0.3); u.aura.material.opacity *= 1 - smooth((e - change) / 0.3); }
        if (e >= change && !s.changed) { s.changed = true; this.sabreBurst(s.hand || s.H, t, [0xb45cff, 0x2a0a3a, 0xead0ff], 18, 0.9, (s.hand || s.H).y); }
        // la naginata devient le tigre dans la main de la Dame, puis il part à toute vitesse
        s.tiger.visible = on;
        if (on) {
          const k = e < s.born ? 0.5 * smooth((e - change) / 0.3) : 0.5 + 0.5 * smooth((e - s.born) / 0.25), behind = s.headPos.clone().addScaledVector(s.fwd, -1.1 * k);
          s.tiger.position.copy(s.headPos); s.tiger.lookAt(s.headPos.clone().add(s.fwd)); s.tiger.scale.setScalar(Math.max(0.01, k * shrink));
          for (const l of s.tigerLegs) l.rotation.x = Math.sin(t * 24 + l.userData.ph) * 0.95;
          s.tigerTail.rotation.y = Math.sin(t * 9) * 0.4; s.jaw.rotation.x = after > 0 ? 0.1 : 0.25 + Math.abs(Math.sin(t * 7)) * 0.3;
          s.tigerFire.position.set(behind.x, behind.y - 0.8 * k, behind.z); this.sabreFlicker(s.tigerFire, t, k * shrink);
        } else this.sabreFlicker(s.tigerFire, t, 0);
        const falling = e >= back && e < caught; s.spear.visible = falling;
        if (falling) { const k = (e - back) / (caught - back), to = s.hand || new T.Vector3(A.x, 1, A.z); s.spear.position.set(to.x, to.y + 9 * (1 - k * k), to.z); s.spearSpin.rotation.z = (1 - k) * 18; this.sabreFlicker(s.spearFire, t, 0); }
        if (e >= caught && !s.landed) { s.landed = true; this.sabreBurst(A, t, [0xb45cff, 0xead0ff], 10, 0.5, s.hand ? s.hand.y : 1.2); }
      } else if (style === 'dragonw') {
        this.skyDim = Math.max(this.skyDim || 0, smooth((e - 0.7) / 0.8) * 0.88 * fade(2.6));
        s.cloudMat.opacity = smooth((e - 0.7) / 0.8) * 0.9 * fade(3);
        const born = s.born, release = 0.6, end = hit + 2.65, back = hit + 2.7, caught = hit + 3.25, on = e > born && e < end, shrink = 1 - smooth((e - end + 0.6) / 0.6) * 0.92, size = s.reach / 1.5;
        if (e > release) { u.pillar.material.opacity *= 1 - smooth((e - release) / 0.3); u.aura.material.opacity *= 1 - smooth((e - release) / 0.3); }
        // la naginata part de la main, tourne et s'enflamme, puis retombe du ciel à la fin
        const flying = e >= release && e < born, falling = e >= back && e < caught;
        s.spear.visible = flying || falling;
        if (flying) {
          const hand = s.hand || new T.Vector3(A.x, 1, A.z); if (!s.throwFrom) s.throwFrom = hand.clone();
          const k = (e - release) / (born - release);
          s.spear.position.copy(s.throwFrom).lerp(s.H, k); s.spear.position.y += Math.sin(k * Math.PI) * 0.35;
          s.spear.rotation.y = Math.atan2(s.dir.x, s.dir.z); s.spearSpin.rotation.z = t * 24; this.sabreFlicker(s.spearFire, t, 0.5 + k * 0.7);
        } else if (falling) {
          const k = (e - back) / (caught - back), to = s.hand || new T.Vector3(A.x, 1, A.z);
          s.spear.position.set(to.x, to.y + 9 * (1 - k * k), to.z); s.spear.rotation.y = 0; s.spearSpin.rotation.z = (1 - k) * 18; this.sabreFlicker(s.spearFire, t, 0);
        }
        if (e >= born && !s.changed) { s.changed = true; this.sabreBurst(s.H, t, [s.pal.dragon, s.pal.hot, s.pal.mid], 18, 1, s.H.y); }
        s.segs.forEach((m, i) => { const q2 = s.q - 1.5 * size - i * 0.4; m.visible = on && q2 >= 0; if (m.visible) { m.position.copy(this.sabreDragonPos(s, q2)); m.lookAt(this.sabreDragonPos(s, q2 + 0.1)); m.scale.setScalar(smooth(q2 / 1.2) * shrink); } });
        s.head.visible = on;
        if (on) { s.head.position.copy(s.headPos); s.head.lookAt(s.headPos.clone().add(s.fwd)); s.head.scale.setScalar(2.3 * size * smooth((e - born) / 0.2) * shrink); s.jaw.rotation.x = 0.1 + Math.abs(Math.sin(t * (after > 0 ? 14 : 6))) * 0.45; } // il dévore le roi en volant
        s.embers.forEach((m, i) => { const ph = (t * 0.7 + i * 0.137) % 1, q2 = s.q - i * 0.33; m.visible = on && q2 >= 0; if (m.visible) { m.position.copy(this.sabreDragonPos(s, q2)); m.position.x += Math.sin(i * 7) * 0.5; m.position.z += Math.cos(i * 5) * 0.5; m.position.y += Math.sin(i * 3) * 0.3 - ph * 1.2; m.scale.setScalar(1 - ph * 0.8); } });
        if (e >= caught && !s.landed) { s.landed = true; this.sabreBurst(A, t, [s.pal.dragon, s.pal.hot], 10, 0.5, s.hand ? s.hand.y : 1.2); }
      } else if (style === 'fracasw' || style === 'fracasb') {
        const hand = u.actor.parts.muzzle ? u.actor.parts.muzzle.getWorldPosition(new T.Vector3()) : new T.Vector3(A.x, 1.2, A.z), king = new T.Vector3(P.x, 0.85, P.z);
        const whirl = hand.clone().add(new T.Vector3(Math.cos(t * 9) * 0.65, 0.55, Math.sin(t * 9) * 0.65));
        let pos = whirl, power = 0.55;
        for (const T0 of [1.1, 2.0, 2.9]) {
          if (e > T0 - 0.32 && e <= T0) { const k = (e - (T0 - 0.32)) / 0.32; pos = whirl.clone().lerp(king, k * k); power = 1; }
          else if (e > T0 && e <= T0 + 0.38) pos = king.clone().lerp(whirl, (e - T0) / 0.38);
          if (e >= T0 && !s['hit' + T0]) { s['hit' + T0] = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 12, 0.9); this.shakeUntil = t + 0.22; this.shakeAmp = 0.1; }
        }
        if (e > 3.3) {
          const top = new T.Vector3(P.x, 6.5, P.z), ground = new T.Vector3(P.x, 0.35, P.z);
          if (e < 3.95) pos = whirl.clone().lerp(top, smooth((e - 3.3) / 0.65));
          else if (after < 0) { const k = (e - 3.95) / (hit - 3.95); pos = top.clone().lerp(ground, k * k * k); }
          else pos = ground.clone().setY(0.2);
          power = 1.15;
        }
        s.ball.position.copy(pos); s.ball.rotation.set(t * 8, t * 5, 0);
        s.ballFire.position.copy(pos).setY(pos.y - 0.12); this.sabreFlicker(s.ballFire, t, power * fade(1.4));
        this.sabreLink(s.chain, hand, pos);
        // le plateau se brise
        if (after >= 0) {
          if (!s.shattered) { s.shattered = true; s.pit.visible = true; for (const m of s.cracks) m.visible = true; for (const m of s.tiles) m.visible = true; this.shakeUntil = t + 1.1; this.shakeAmp = 0.34; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 34, 2.1); }
          for (const m of s.tiles) {
            const d = m.userData, a = Math.max(0, after - d.delay), y = 0.05 + d.vy * a - 6 * a * a;
            m.position.set(d.x + d.vx * a, y, d.z + d.vz * a); m.rotation.set(d.rx * a, 0, d.rz * a); m.visible = y > -1.2;
          }
          for (const m of s.cracks) m.material.opacity = 0.95 * Math.max(0.35, 1 - after / 3);
        }
      } else if (style === 'arcw' || style === 'arcb') {
        const launch = 1.4, gone = after > 1.6;
        const travelled = e < launch ? 0 : after < 0 ? s.len * (e - launch) / (hit - launch) : s.len + after * 9;
        s.arcS = travelled;
        s.sail.visible = e >= launch && !gone;
        s.sail.position.set(A.x + s.dir.x * travelled, Math.sin(t * 8) * 0.04, A.z + s.dir.z * travelled);
        s.sail.scale.setScalar(smooth((e - launch) / 0.25));
        for (const f of s.trail) { const k = travelled >= f.userData.s ? clamp(1 - (after - 2.1) / 0.9) : 0; this.sabreFlicker(f, t, k); }
        if (e >= hit && !s.arcBurst) { s.arcBurst = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 20, 1.5); this.shakeUntil = t + 0.4; this.shakeAmp = 0.18; }
      } else if (style === 'ridew' || style === 'rideb') {
        const on = smooth((e - 0.2) / 0.7);
        if (!s.tinted) {
          s.tinted = true; const hotColor = s.white ? 0xff8a26 : 0x9440ff;
          this.tintCharacter(u, u.actor, hotColor, 0.72).forEach((m) => { if (m.emissive) { m.emissive.setHex(hotColor); m.emissiveIntensity = 0.75; } });
        }
        const h = u.actor.holder.position, y = u.actor.parts.root.position.y;
        s.riderFire.position.set(h.x, y + 0.55, h.z); this.sabreFlicker(s.riderFire, t, on);
        s.horseFire.position.set(h.x, y + 0.05, h.z); this.sabreFlicker(s.horseFire, t, on);
        if (u.king) { const k = u.king.holder.position; s.kingFire.position.set(k.x, k.y + 0.05, k.z); this.sabreFlicker(s.kingFire, t, smooth((e - 2.2) / 0.5) * fade(1.6)); }
        for (const T0 of [2.7, 3.15, 3.6, 4.05]) if (e >= T0 && !s['hit' + T0]) { s['hit' + T0] = true; this.sabreBurst(u.king ? u.king.holder.position : P, t, [s.pal.mid, s.pal.hot], 10, 0.7, 0.4); this.shakeUntil = t + 0.15; this.shakeAmp = 0.1; }
      } else if (style === 'lamew' || style === 'lameb') {
        const tip = u.actor.parts.tip ? u.actor.parts.tip.getWorldPosition(new T.Vector3()) : new T.Vector3(A.x, 1, A.z);
        s.blade.position.copy(tip).setY(tip.y - 0.25); this.sabreFlicker(s.blade, t, smooth((e - 0.15) / 0.4));
        s.slashes.forEach((m, i) => { const T0 = 1.0 + i * 0.6, k = clamp((e - T0) / 0.32); m.visible = e >= T0 && k < 1; m.material.opacity = 0.95 * (1 - k); m.scale.setScalar(0.6 + k * 0.7); if (e >= T0 && !s['hit' + i]) { s['hit' + i] = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot], 12, 0.8); this.shakeUntil = t + 0.14; this.shakeAmp = 0.08; } });
        if (u.king) { const k = u.king.holder.position; s.kingFire.position.set(k.x, 0.03, k.z); this.sabreFlicker(s.kingFire, t, smooth((e - 2.2) / 0.5) * fade(1.8)); }
      }
    }
    tickSabreMate(c, t, M, u, hit) {
      const T = this.THREE, e = t - u.start, after = e - hit, P = u.target, s = u.sabre, style = u.themed, p = c.parts, r = p.root;
      const clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (c === u.actor) {
        c.anim = null;
        const F = u.fromPos, face = () => this.sabreFace(c, P.x, P.z);
        c.holder.position.set(F.x, 0, F.z);
        if (style === 'ridew' || style === 'rideb') {
          const jump = clamp((e - 1) / 0.8), k = jump * jump * (3 - 2 * jump);
          c.holder.position.set(F.x + (s.stop.x - F.x) * k, 0, F.z + (s.stop.z - F.z) * k); face();
          M.animate(p, t, e > 1 && e < 1.8 ? 'run' : 'idle');
          r.position.y += Math.sin(jump * Math.PI) * 1.7;
          p.rear = smooth((e - 2.15) / 0.4) * (1 - smooth(after / 0.5));
          if (p.lance) p.lance.rotation.x = 0.2 * (p.rear || 0);
          p.rider.rotation.x = 0.7 * p.rear;
          if (p.lanceTip) s.tip = p.lanceTip.getWorldPosition(new T.Vector3());
        } else if (style === 'lamew' || style === 'lameb') {
          const w = clamp((e - 0.3) / 0.45);
          c.holder.position.set(F.x + (s.stop.x - F.x) * w, 0, F.z + (s.stop.z - F.z) * w); face();
          if (e < 0.75) M.animate(p, t, e > 0.3 ? 'run' : 'idle');
          else if (e < 2.6) M.animate(p, t, 'punch', (e - 0.75) / 0.6 + 0.0);
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'fracasw' || style === 'fracasb') {
          face(); M.animate(p, t, e < hit ? 'punch' : 'victory', e < hit ? e * 1.2 : 1); if (p.ball) p.ball.visible = false;
        } else if (style === 'arcw' || style === 'arcb') {
          face();
          if (e < 1.5) { M.animate(p, t, 'idle'); const w = smooth((e - 0.2) / 1), cut = smooth((e - 1.3) / 0.14); p.armR.rotation.set(-2.9 * w + cut * 2, 0, 0.3 - cut * 0.7); p.armL.rotation.set(-2.9 * w + cut * 2, 0, -0.3 + cut * 0.7); }
          else M.animate(p, t, e < hit + 0.5 ? 'idle' : 'victory', 1);
        } else if (style === 'sakura') {
          face();
          if (e < 2.1) { M.animate(p, t, 'idle'); p.armR.rotation.set(-0.5, 0, -0.6); p.torso.rotation.y = 0.6; p.root.position.y = -0.05; }
          else if (e < hit) { M.animate(p, t, 'idle'); const k = clamp((e - 2.1) / 0.15); p.armR.rotation.set(-1.7, 0, -0.6 + k * 2); p.torso.rotation.y = 0.6 - k * 1.1; }
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'lunepourpre') {
          face();
          if (e < hit - 0.55) { M.animate(p, t, 'idle'); const up = smooth(e / 1.5); p.armR.rotation.set(-2.9 * up - 0.9 * (1 - up), 0, -0.45); p.armL.rotation.set(-2.9 * up - 0.9 * (1 - up), 0, 0.45); }
          else if (e < hit) { M.animate(p, t, 'idle'); const k = smooth((e - hit + 0.55) / 0.2); p.armR.rotation.set(-2.9 + k * 2.2, 0, -0.45); p.armL.rotation.set(-2.9 + k * 2.2, 0, 0.45); p.torso.rotation.x = 0.4 * k; }
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'dragonw' || style === 'tigreb') {
          // elle lance sa naginata (dragon) ou le tigre qu'elle est devenue ; à la fin, la lance retombe dans sa main
          this.sabreDragonAt(s, e, hit);
          const tiger = style === 'tigreb', throwAt = tiger ? 1.0 : 0.6, gone = tiger ? 0.75 : 0.6;
          const caught = hit + 3.25, up = smooth((e - caught - 0.1) / 0.45), wind = smooth(e / 0.5), cut = clamp((e - throwAt) / 0.25);
          face(); M.animate(p, t, 'idle', 1);
          if (p.naginata) { p.naginata.visible = e < gone || e >= caught; p.naginata.rotation.x = Math.PI / 2 * up; }
          if (up > 0) { p.armR.rotation.set(0, 0, 0.3 + 2.45 * up); p.head.rotation.x = -0.55 * up; }
          else if (e < throwAt + 0.25) p.armR.rotation.set(-2.9 * wind + cut * 1.6, 0, 0.25);
          else p.armR.rotation.set(-1.3, 0, 0.3);
          if (p.muzzle) s.hand = p.muzzle.getWorldPosition(new T.Vector3());
        } else { face(); M.animate(p, t, e < hit ? 'cast' : 'victory', e < hit ? clamp(e / 0.6) : 1); }
        this.tickThemeMateFx(u, t, e, clamp, smooth, hit, after);
        return true;
      }
      // le roi
      c.anim = null; c.holder.position.set(P.x, 0, P.z);
      if (style === 'dragonw' || style === 'tigreb') {
        if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
        M.animate(p, t, 'ko', 1);
        if (s.head.visible && s.mouth) { c.holder.position.set(s.mouth.x, Math.max(0, s.mouth.y - 0.55), s.mouth.z); r.position.y = 0; r.rotation.set(1.1, after * 2, 0.4); if (style === 'dragonw') r.scale.setScalar(u.kingBase.scale.x * Math.max(0.15, 1 - after * 0.42)); c.holder.visible = e < hit + 2.2; }
        else c.holder.visible = false;
        return true;
      }
      if (style === 'fracasw' || style === 'fracasb') {
        if (after < 0) {
          let jolt = 0; for (const T0 of [1.1, 2, 2.9]) if (e > T0 && e < T0 + 0.4) jolt = Math.sin((e - T0) / 0.4 * Math.PI);
          M.animate(p, t, jolt > 0 ? 'ko' : 'panic', jolt > 0 ? jolt * 0.35 : 1); if (jolt > 0) { r.position.y = 0; r.rotation.x = -0.4 * jolt; } else r.rotation.x = 0;
        } else { M.animate(p, t, 'ko', 1); r.rotation.set(0, 0, 0); r.position.y = 0; r.scale.set(u.kingBase.scale.x * 1.3, u.kingBase.scale.y * Math.max(0.12, 1 - after * 6), u.kingBase.scale.z * 1.3); }
        return true;
      }
      if (style === 'arcw' || style === 'arcb') {
        if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
        const pos = s.sail.position;
        M.animate(p, t, 'ko', 1);
        c.holder.position.set(pos.x, 0, pos.z); r.position.y = 0.7; r.rotation.set(after * 5, after * 8, 0);
        c.holder.visible = after < 1.5;
        return true;
      }
      if (style === 'ridew' || style === 'rideb') {
        if (e < 1.8) { M.animate(p, t, 'panic', 1); return true; }
        M.animate(p, t, 'ko', 1);
        if (after < 0 && s.tip) {
          // accroché à la lance, devant le samouraï ; les sabots le frappent
          c.holder.position.set(s.tip.x, Math.max(0, s.tip.y - 0.5), s.tip.z); r.position.y = 0;
          r.rotation.set(0.3 + Math.sin(e * 15) * 0.14, 0, Math.sin(e * 11) * 0.1);
          s.lastTip = s.tip.clone();
        } else {
          const L = s.lastTip || new T.Vector3(P.x, 1, P.z), f = smooth(after / 0.55);
          c.holder.position.set(L.x + (P.x - L.x) * f, Math.max(0, L.y - 0.5) * (1 - f), L.z + (P.z - L.z) * f); r.position.y = 0;
          r.rotation.set(0.3 + f * 1.25, 0, 0);
        }
        return true;
      }
      if (style === 'lamew' || style === 'lameb') {
        if (after < 0) {
          let jolt = 0; for (const T0 of [1, 1.6, 2.2]) if (e > T0 && e < T0 + 0.3) jolt = Math.sin((e - T0) / 0.3 * Math.PI);
          M.animate(p, t, jolt > 0 ? 'ko' : 'panic', 1); if (jolt > 0) { r.position.y = 0; r.rotation.x = -0.35 * jolt; } else r.rotation.x = 0;
        } else { M.animate(p, t, 'ko', 1); r.rotation.set(1.5 * smooth(after / 0.5), 0, 0); r.position.y = 0; }
        return true;
      }
      if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
      // Pluie de Sakura, Lune Pourpre : le cimier se brise, puis le roi tombe
      const fall = smooth((after - 0.6) / 0.4);
      M.animate(p, t, fall > 0 ? 'ko' : 'idle', 1); r.rotation.set(1.5 * fall, 0, 0); r.position.y = 0;
      return true;
    }
    // Arc géant : les pièces sur le chemin sont emportées quand l'arc les atteint
    tickSabreSwept(c, t, M, u) {
      const s = u.sabre, d = s.swept.get(c);
      if (s.arcS == null || s.arcS < d.along) return false;
      const k = s.arcS - d.along, pos = s.sail.position, side = { x: -s.dir.z, z: s.dir.x };
      c.anim = null;
      M.animate(c.parts, t, 'ko', 1);
      c.holder.position.set(pos.x + side.x * d.off, 0, pos.z + side.z * d.off);
      c.parts.root.position.y = 0.4 + Math.min(1.6, k * 0.4);
      c.parts.root.rotation.set(k * 2 * d.spin, k * 3, 0);
      c.holder.visible = s.sail.visible;
      if (c.shadow) c.shadow.visible = false;
      return true;
    }
    endSabreMate(u) {
      const s = u.sabre;
      if (this.checkGroup) this.checkGroup.visible = true;
      if (s.weatherShown != null && this.weatherGroup) this.weatherGroup.visible = s.weatherShown;
      if (s.swept) for (const [c, d] of s.swept) { c.holder.position.copy(d.position); c.holder.visible = d.visible; c.parts.root.rotation.copy(d.rotation); c.parts.root.position.set(0, 0, 0); if (c.shadow) c.shadow.visible = true; }
      if (u.actor) { const p = u.actor.parts; p.rear = 0; if (p.naginata) { p.naginata.visible = true; p.naginata.rotation.x = 0; } if (p.ball) p.ball.visible = true; if (p.lance) p.lance.rotation.x = 0; if (p.rider) p.rider.rotation.x = 0; }
    }

    /* Attaques décrites par une fiche (KIT_ATTACKS, dans 00-constantes.js) : thèmes L'Empire des Baobabs et L'Âge des Géants.
       Une fiche dit comment la pièce va frapper : au contact (gap) ou à distance (fly), avec ou sans bond (leap), ce qui part
       de sa main (shot), ce qui se passe à l'impact (impact) et comment finit la pièce prise (end). Tout est visuel. */
    kitAttack(spec, white, from, target, to, victim, now, len, dir) {
      const a = { style: 'kit', kit: spec, white, start: now, from, target, to, victim, dir, len, fx: [], pal: KIT_PAL[spec.pal || 'baobabs'][white ? 'w' : 'b'] };
      a.customTick = (c, x, el, t, M) => this.tickKitAttack(c, x, el, t, M);
      a.customVictim = (d, x, c, el, t, M) => this.tickKitVictim(d, x, c, el, t, M);
      const wind = spec.wind || 0.5;
      if (spec.gap != null) {
        const gap = Math.min(spec.gap, len);
        a.stop = { x: target.x - dir.x * gap, z: target.z - dir.z * gap };
        a.approach = spec.leap ? 0.7 : 0.3 + Math.max(0, len - gap) * 0.09;
        a.hit = a.approach + wind;
        a.moveFrom = a.stop;
      } else {
        a.stop = from; a.approach = 0; a.wind = wind;
        a.fly = spec.fly ? spec.fly[0] + len * spec.fly[1] : 0;
        a.hit = wind + a.fly;
        a.moveFrom = from;
      }
      a.moveAt = a.hit + (spec.recover || 0.85);
      a.duration = a.moveAt + 0.3 + Math.hypot(to.x - a.moveFrom.x, to.z - a.moveFrom.z) * 0.09;
      return a;
    }
    tickKitAttack(c, a, el, t, M) {
      const T = this.THREE, p = c.parts, s = a.kit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (!a.sabreRestore) a.sabreRestore = () => { p.trunkUp = null; };
      if (el >= a.moveAt) {
        const u = clamp((el - a.moveAt) / (a.duration - a.moveAt));
        this.sabreFace(c, a.to.x, a.to.z);
        c.holder.position.set(a.moveFrom.x + (a.to.x - a.moveFrom.x) * u, 0, a.moveFrom.z + (a.to.z - a.moveFrom.z) * u);
        M.animate(p, t, 'run'); p.root.position.y = 0; p.trunkUp = null;
      } else if (el < a.approach) {
        const k = clamp(el / a.approach), e = k * k * (3 - 2 * k);
        c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * e, 0, a.from.z + (a.stop.z - a.from.z) * e);
        this.sabreFace(c, a.target.x, a.target.z);
        M.animate(p, t, 'run');
        if (s.leap) p.root.position.y = Math.sin(k * Math.PI) * s.leap;
      } else {
        c.holder.position.set(a.stop.x, 0, a.stop.z);
        this.sabreFace(c, a.target.x, a.target.z);
        const k = (el - a.approach) / Math.max(0.01, a.hit - a.approach);
        if (s.spin && el < a.hit) { M.animate(p, t, 'idle'); c.holder.rotation.y += 0.55; }
        else if (s.pose === 'trunk') { M.animate(p, t, 'idle'); p.trunkUp = el < a.hit ? 0.1 + clamp(k) * 1.2 : 1.3 * (1 - clamp((el - a.hit) / 0.5)); }
        else if (s.gap != null) { M.animate(p, t, 'punch', el < a.hit ? clamp(k) * 0.5 + Math.floor(k * (s.blows || 1)) : 0.9); p.root.position.z = Math.sin(clamp(k) * Math.PI) * 0.08; }
        else M.animate(p, t, 'cast', clamp(el / a.wind));
      }
      if (!a.launched && s.shot && el >= (a.approach + (a.wind || 0))) {
        a.launched = true; a.startPos = p.muzzle ? p.muzzle.getWorldPosition(new T.Vector3()) : this.handsOf(c);
        a.shotObj = this.fx(a, this.kitShot(a, s.shot));
      }
      if (a.shotObj && !a.ended) this.tickKitShot(a, a.shotObj, el, t);
      if (s.during && !a.ended) this.tickKitDuring(a, s.during, el, t, c);
      if (el >= a.hit && !a.struck) {
        a.struck = true;
        this.sabreBurst(a.target, t, [a.pal[0], a.pal[1], a.pal[2]], 16, s.big || 1);
        this.shakeUntil = t + 0.3; this.shakeAmp = s.shake || 0.1;
        if (s.impact) this.kitImpact(a, s.impact, t);
      }
      if (a.impactObj && !a.ended) this.tickKitImpact(a, a.impactObj, el, t);
    }
    // Ce qui part de la main : un groupe orienté vers la cible (axe +z)
    kitShot(a, kind) {
      const T = this.THREE, g = new T.Group(), P = a.pal, fire = (c, o) => this.sabreFire(c, o), dirY = Math.atan2(a.dir.x, a.dir.z);
      g.rotation.y = dirY; g.userData.kind = kind;
      const spearMesh = (c, core) => { const m = new T.Group(), sh = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.85, 7), fire(c, 1)); sh.rotation.x = Math.PI / 2; m.add(sh); const tip = new T.Mesh(new T.ConeGeometry(0.05, 0.2, 6), fire(core, 1)); tip.rotation.x = Math.PI / 2; tip.position.z = 0.5; m.add(tip); return m; };
      if (kind === 'ray' || kind === 'flame') {
        const m = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 1, 12), fire(P[0], 0.92)), core = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1, 10), fire(P[3] || 0xffffff, 1));
        m.rotation.x = core.rotation.x = Math.PI / 2; g.add(m, core); g.userData.beam = [m, core];
      } else if (kind === 'volley' || kind === 'embers') {
        g.userData.items = [];
        for (let i = 0; i < 7; i++) {
          const m = kind === 'volley' ? spearMesh(P[0], P[1]) : new T.Mesh(new T.SphereGeometry(0.09, 10, 8), fire(P[i % 3], 1));
          m.userData.off = [(i - 3) * 0.13, (i % 3 - 1) * 0.1, -Math.abs(i - 3) * 0.16]; g.add(m); g.userData.items.push(m);
        }
      } else if (kind === 'shadow') g.add(spearMesh(P[1], P[0]));
      else if (kind === 'wave') {
        g.userData.items = [];
        for (let i = 0; i < 4; i++) { const m = new T.Mesh(new T.TorusGeometry(0.34 + i * 0.1, 0.03, 6, 28), fire(P[i % 3], 0.9)); m.position.z = -i * 0.34; g.add(m); g.userData.items.push(m); }
      } else if (kind === 'spirit') {
        const m = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), fire(0xf4f4f8, 0.8)); m.position.y = 0.2; g.add(m);
        const tail = new T.Mesh(new T.ConeGeometry(0.24, 0.7, 12), fire(0xf4f4f8, 0.55)); tail.rotation.x = Math.PI; tail.position.y = -0.25; g.add(tail);
        for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: 0x111111 })); e.position.set(s * 0.1, 0.25, 0.22); g.add(e); }
        g.rotation.y = 0;
      }
      return g;
    }
    tickKitShot(a, g, el, t) {
      const T = this.THREE, kind = g.userData.kind, s = a.kit, launch = a.approach + (a.wind || 0), end = new T.Vector3(a.target.x, 0.8, a.target.z);
      const k = a.fly ? (el - launch) / a.fly : 1, after = el - a.hit;
      if (kind === 'ray' || kind === 'flame') {
        const mid = a.startPos.clone().lerp(end, 0.5), L = a.startPos.distanceTo(end), w = (el < a.hit + 0.35 ? 1 : Math.max(0, 1 - (el - a.hit - 0.35) * 5)) * (0.8 + Math.sin(t * 40) * 0.2);
        g.position.copy(mid); g.lookAt(end);
        for (const m of g.userData.beam) m.scale.set(Math.max(0.01, w), L * Math.min(1, Math.max(0.05, k)), Math.max(0.01, w));
        g.visible = w > 0.02;
        return;
      }
      const pos = a.startPos.clone().lerp(end, Math.min(1, k));
      if (after > 0) pos.set(end.x + a.dir.x * after * 13, 0.8, end.z + a.dir.z * after * 13);
      g.position.copy(pos);
      a.shotAt = pos;
      g.visible = after < (s.carry ? 1 : 0.02) || (kind === 'shadow' && after < 0.35);
      if (g.userData.items) for (const [i, m] of g.userData.items.entries()) {
        if (m.userData.off) { const o = m.userData.off; m.position.set(o[0], o[1], o[2]); } else m.scale.setScalar(1 + Math.sin(t * 12 + i) * 0.1);
      }
    }
    // Pendant le coup : griffures, onde au sol, feu sur l'arme…
    tickKitDuring(a, kind, el, t, c) {
      const T = this.THREE;
      if (kind === 'roar' && el >= a.approach && !a.roared) {
        a.roared = true;
        const ring = this.fx(a, new T.Mesh(new T.TorusGeometry(0.4, 0.035, 6, 30), this.sabreFire(a.pal[0], 0.9)));
        ring.position.copy(c.parts.head.getWorldPosition(new T.Vector3())); ring.rotation.y = Math.atan2(a.dir.x, a.dir.z); a.roar = ring;
      }
      if (a.roar) { const k = Math.min(1, (el - a.approach) / 0.45); a.roar.scale.setScalar(0.5 + k * 2.2); a.roar.material.opacity = 0.9 * (1 - k); a.roar.visible = k < 1; }
      if (kind === 'fire' && c.parts.tip) {
        if (!a.weaponFire) a.weaponFire = this.fx(a, this.sabreFlames(a.pal, 0.13, 0.5, 8));
        c.parts.tip.getWorldPosition(a.weaponFire.position);
        this.sabreFlicker(a.weaponFire, t, el < a.hit + 0.4 ? 1 : 0);
      }
    }
    kitImpact(a, kind, t) {
      const T = this.THREE, P = a.target, g = this.fx(a, new T.Group()); g.position.set(P.x, 0, P.z); g.userData.kind = kind; g.userData.t0 = a.hit; a.impactObj = g;
      if (kind === 'claws') {
        for (let i = 0; i < 3; i++) { const m = this.sabreSail(0.22, 1.5, a.pal[i % 2], 0.95); m.position.set((i - 1) * 0.34, 0.85, 0.3); m.rotation.set(0, this.viewYaw(), 0.32); g.add(m); }
      } else if (kind === 'cracks' || kind === 'quake') {
        const n = kind === 'quake' ? 9 : 6;
        for (let i = 0; i < n; i++) {
          const ang = i * 1.05, r = new T.Mesh(new T.BoxGeometry(0.035, 0.014, 0.46), new T.MeshBasicMaterial({ color: a.pal[3] != null && kind === 'quake' ? a.pal[1] : 0x1a100a }));
          r.position.set(Math.cos(ang) * 0.26, 0.05, Math.sin(ang) * 0.26); r.rotation.y = -ang + Math.PI / 2; g.add(r);
        }
        if (kind === 'quake') { // le sol se fend sur toute la ligne de la charge
          const line = new T.Mesh(new T.BoxGeometry(0.07, 0.016, a.len), new T.MeshBasicMaterial({ color: a.pal[1] })); line.position.set(-a.dir.x * a.len / 2, 0.05, -a.dir.z * a.len / 2); line.rotation.y = Math.atan2(a.dir.x, a.dir.z); g.add(line);
          this.shakeUntil = t + 0.7; this.shakeAmp = 0.2;
        }
      } else if (kind === 'slash') {
        const m = this.sabreSail(0.3, 1.5, a.pal[0], 0.95); m.position.set(0, 0.85, 0.2); m.rotation.set(0, this.viewYaw(), -0.5); g.add(m);
      }
    }
    tickKitImpact(a, g, el) {
      const k = Math.min(1, (el - g.userData.t0) / 0.75);
      if (g.userData.kind === 'claws' || g.userData.kind === 'slash') { g.children.forEach((m) => { m.material.opacity = 0.95 * (1 - k); }); g.visible = k < 1; }
    }

    /* ---------- La pièce prise ---------- */
    tickKitVictim(d, a, c, el, t, M) {
      if (el >= a.duration || a.ended) return false;
      const p = c.parts, r = p.root, B = a.target, dir = a.dir, after = el - a.hit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, s = a.kit;
      if (after < 0) {
        this.sabreFace(c, a.stop.x, a.stop.z);
        if (s.gap != null && s.blows > 1 && el > a.approach) { M.animate(p, t, 'punch', (el - a.approach) * 3 + 0.5); r.position.z = 0; } else M.animate(p, t, 'guard', 1);
        return true;
      }
      if (c.shadow) c.shadow.visible = false;
      M.animate(p, t, 'ko', 1);
      r.position.y = 0;
      const end = s.end || 'fall';
      if (s.burn) {
        if (!a.victimFire) a.victimFire = this.fx(a, this.sabreFlames(a.pal, 0.3, 0.9, 9));
        a.victimFire.position.set(c.holder.position.x, Math.max(0, c.holder.position.y) + r.position.y, c.holder.position.z);
      }
      if (end === 'fling') {
        const u = clamp(after / 1.25), far = u * (2 - u) * 13;
        c.holder.position.set(B.x + dir.x * far, 0, B.z + dir.z * far);
        r.position.y = Math.sin(u * Math.PI) * 2.8 + 0.05; r.rotation.set(u * 9, u * 3, u * 5);
        c.holder.visible = u < 1;
        if (a.victimFire) { a.victimFire.position.set(c.holder.position.x, r.position.y, c.holder.position.z); this.sabreFlicker(a.victimFire, t, u < 1 ? 1 : 0); }
        return true;
      }
      if (end === 'carry') {
        const at = a.shotAt || new this.THREE.Vector3(B.x, 0.8, B.z);
        c.holder.position.set(at.x, 0, at.z); r.position.y = 0.3; r.rotation.set(after * 5, after * 9, 0);
        c.holder.visible = after < 1;
        return true;
      }
      if (end === 'skyward') { // emportée dans les airs
        const u = clamp(after / 1.1);
        c.holder.position.set(B.x + dir.x * u * 7, 0, B.z + dir.z * u * 7);
        r.position.y = u * u * 7; r.rotation.set(1.2, u * 6, 0);
        c.holder.visible = u < 1;
        return true;
      }
      if (end === 'crush') {
        const f = smooth(after / 0.25);
        r.rotation.set(1.5 * f, 0, 0); r.scale.y = d.base * (1 - f * 0.6);
      } else if (end === 'bounce') {
        const up = clamp(after / 0.5), f = smooth((after - 0.45) / 0.3);
        r.position.y = Math.sin(up * Math.PI) * 0.75; r.rotation.set(up * 2 + f, 0, 0);
      } else r.rotation.set(-1.5 * smooth((after - 0.2) / 0.35), 0, 0); // elle tombe à la renverse
      if (a.victimFire) this.sabreFlicker(a.victimFire, t, 1 - clamp((after - 0.5) / 0.4));
      c.holder.visible = el < a.moveAt;
      return true;
    }

    /* ---------- Mats à fiche : un par camp ---------- */
    // Ciel du mat : dessiné avant tous les effets transparents, sinon il les recouvre
    kitSky(mat) { const m = new this.THREE.Mesh(new this.THREE.SphereGeometry(30, 20, 10), mat); m.renderOrder = -10; return m; }
    makeKitMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed, A = this.sqToPos(u.attackerTo), yaw = this.viewYaw();
      const s = u.kitMate = { A, dir: new T.Vector3(P.x - A.x, 0, P.z - A.z), yaw }; s.len = Math.max(0.01, s.dir.length()); s.dir.normalize();
      g.visible = false;
      if (style === 'ancetres') {
        // tambours, puis des silhouettes dorées sortent de terre et emportent le roi vers le soleil couchant
        const gold = this.sabreFire(0xffc247, 0.82);
        s.drums = [];
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, d = new T.Group(), body = new T.Mesh(new T.CylinderGeometry(0.3, 0.18, 0.6, 12), std(0x8a5a2c)), top = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.03, 12), std(0xf3ead8)); body.position.y = 0.3; top.position.y = 0.61; d.add(body, top); d.position.set(P.x + Math.cos(a) * 2.2, 0, P.z + Math.sin(a) * 2.2); d.userData.top = top; g.add(d); s.drums.push(d); }
        s.anc = [];
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2, f = new T.Group(), body = new T.Mesh(new T.ConeGeometry(0.28, 1.1, 10), gold), head = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), gold);
          body.position.y = 0.55; head.position.y = 1.2; f.add(body, head);
          for (const k of [-1, 1]) { const arm = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.6, 6), gold); arm.position.set(k * 0.2, 1.0, 0.08); arm.rotation.z = -k * 0.5; arm.rotation.x = -0.8; f.add(arm); }
          f.userData.a = a; g.add(f); s.anc.push(f);
        }
      } else if (style === 'meteores') {
        // le ciel s'embrase, une météorite tombe sur le roi, l'onde de choc couche les fougères
        u.camera.widePosition.set(Math.sin(yaw) * 15, 5, Math.cos(yaw) * 15); u.camera.wideTarget.set(0, 2.8, 0);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0xb8351a, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.rock = new T.Group();
        const core = new T.Mesh(new T.DodecahedronGeometry(0.75, 0), std(0x2a1a14, { flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.5 })); s.rock.add(core);
        const flames = this.sabreFlames([0xffb13b, 0xfff1a8, 0xff5a1a], 0.75, 3.4, 16); flames.position.y = 0.2; s.rock.add(flames); s.fire = flames; g.add(s.rock);
        s.rocks = [];
        for (let i = 0; i < 9; i++) { const m = new T.Group(); m.add(new T.Mesh(new T.SphereGeometry(0.11, 8, 6), this.sabreFire(0xffd24d, 1))); const tail = new T.Mesh(new T.ConeGeometry(0.1, 1.5, 7), this.sabreFire(0xff6a1a, 0.8)); tail.position.y = 0.75; m.add(tail); m.userData = { x: (i * 37 % 13) - 6, z: (i * 53 % 11) - 5, d: 0.5 + i * 0.26 }; g.add(m); s.rocks.push(m); }
      } else if (style === 'couleelave') {
        // le volcan explose, une rivière de lave descend jusqu'au roi et l'engloutit sous la cendre
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 5, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.6, -Math.cos(yaw) * 1.6);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0x1a0e0e, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.top = new T.Vector3(-Math.sin(yaw) * 10.8, 4.2, -Math.cos(yaw) * 10.8);
        s.bursts = [];
        const hot = this.sabreFire(0xff6a1a, 1), yellow = this.sabreFire(0xffd24d, 1), bomb = new T.SphereGeometry(0.2, 8, 6);
        for (let i = 0; i < 26; i++) { const a = i * 2.4, m = new T.Mesh(bomb, i % 3 ? hot : yellow); m.userData = { vx: Math.cos(a) * (1 + (i % 4) * 0.7), vz: Math.sin(a) * (1 + (i % 4) * 0.7), vy: 7 + (i % 5) * 1.3, d: (i % 6) * 0.18 }; g.add(m); s.bursts.push(m); }
        const foot = new T.Vector3(-Math.sin(yaw) * 6.2, 0.06, -Math.cos(yaw) * 6.2), d = new T.Vector3(P.x - foot.x, 0, P.z - foot.z), L = d.length();
        s.river = new T.Group(); s.river.position.copy(foot); s.river.rotation.y = Math.atan2(d.x, d.z); g.add(s.river); s.riverLen = L;
        const flow = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 1), this.sabreFire(0xff5a1a, 1)), crust = new T.Mesh(new T.BoxGeometry(0.7, 0.1, 1), this.sabreFire(0xffd24d, 1)); s.river.add(flow, crust); s.flow = [flow, crust];
        s.pool = at(new T.Mesh(new T.CylinderGeometry(1, 1, 0.1, 24), this.sabreFire(0xff5a1a, 1)), 0, 0.07, 0);
        s.ash = [];
        const ash = basic(0x8d8590, 0.9), bit = new T.BoxGeometry(0.05, 0.05, 0.05);
        for (let i = 0; i < 90; i++) { const m = new T.Mesh(bit, ash); m.userData = { x: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 12, y: Math.random() * 7, sp: 0.5 + Math.random() * 0.8 }; m.visible = false; g.add(m); s.ash.push(m); }
      } else if (style === 'orage') {
        // La reine danse, le ciel se couvre de nuages noirs, la pluie tombe dans un grand vent ; un gros éclair
        // frappe le roi, puis de petits éclairs frappent chaque pièce adverse : tout le camp part en cendres.
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 5.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.2, 0);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0x15171d, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.clouds = [];
        const puffGeo = new T.SphereGeometry(1, 12, 9);
        for (let i = 0; i < 30; i++) {
          const m = new T.Mesh(puffGeo, new T.MeshBasicMaterial({ color: i % 3 ? 0x1c1e25 : 0x2c2f38, transparent: true, opacity: 0, depthWrite: false, fog: false }));
          const a = i * 2.399, r = 1 + (i % 6) * 1.2;
          m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 6.2 + (i % 4) * 0.35, ph: i * 0.9 };
          m.scale.set(1.5 + (i % 3) * 0.4, 0.55, 1.2 + (i % 2) * 0.4); g.add(m); s.clouds.push(m);
        }
        s.rain = [];
        const drop = new T.BoxGeometry(0.014, 0.55, 0.014), water = this.sabreFire(0xa9c4dc, 0.55);
        for (let i = 0; i < 240; i++) { const m = new T.Mesh(drop, water); m.userData = { x: (Math.random() - 0.5) * 13, z: (Math.random() - 0.5) * 13, y: Math.random() * 7, sp: 9 + Math.random() * 4 }; m.rotation.z = 0.38; m.visible = false; g.add(m); s.rain.push(m); }
        s.gusts = [];
        const leaf = new T.PlaneGeometry(0.12, 0.07);
        for (let i = 0; i < 40; i++) { const m = new T.Mesh(leaf, new T.MeshBasicMaterial({ color: i % 2 ? 0x6b7a2a : 0x9a6a2c, side: T.DoubleSide })); m.userData = { z: (Math.random() - 0.5) * 11, y: 0.2 + Math.random() * 2.6, sp: 4 + Math.random() * 3, off: Math.random() * 14 }; m.visible = false; g.add(m); s.gusts.push(m); }
        // éclair : ligne brisée du ciel jusqu'à la case
        const bolt = (x, z, width, top) => {
          const b = new T.Group(), core = this.sabreFire(0xffffff, 1), glow = this.sabreFire(0x9fd0ff, 0.5);
          let p = new T.Vector3(x + (Math.random() - 0.5) * 1.5, top, z + (Math.random() - 0.5) * 1.5);
          const n = 9;
          for (let i = 1; i <= n; i++) {
            const k = i / n, q = i === n ? new T.Vector3(x, 0.3, z) : new T.Vector3(x + (Math.random() - 0.5) * 0.9 * (1 - k), top - (top - 0.3) * k, z + (Math.random() - 0.5) * 0.9 * (1 - k));
            const d = q.clone().sub(p), L = d.length(), mid = p.clone().add(q).multiplyScalar(0.5);
            for (const [mat, w] of [[core, width], [glow, width * 3.2]]) {
              const seg = new T.Mesh(new T.CylinderGeometry(w, w, L, 5), mat);
              seg.position.copy(mid); seg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); b.add(seg);
            }
            p = q;
          }
          b.visible = false; g.add(b); return b;
        };
        const ashMat = std(0x3a3634, { roughness: 1 }), emberMat = this.sabreFire(0xff7a2a, 0.9);
        const pile = (x, z, big) => {
          const a = new T.Group(); a.position.set(x, 0, z);
          const heap = new T.Mesh(new T.ConeGeometry(0.3 * big, 0.2 * big, 10), ashMat); heap.position.y = 0.1 * big; a.add(heap);
          for (let i = 0; i < 5; i++) { const e2 = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), emberMat); e2.position.set(Math.cos(i * 1.3) * 0.18 * big, 0.05, Math.sin(i * 1.3) * 0.18 * big); a.add(e2); }
          a.scale.setScalar(0.01); a.visible = false; g.add(a); return a;
        };
        const flames = (x, z, big) => { const f = this.sabreFlames([0xffb13b, 0xfff1a8, 0xff5a1a], 0.3 * big, 0.95 * big, 9); f.position.set(x, 0, z); f.visible = false; g.add(f); return f; };
        s.bigBolt = bolt(P.x, P.z, 0.07, 9);
        s.kingFire = flames(P.x, P.z, 1.3); s.kingAsh = pile(P.x, P.z, 1.3);
        // les autres pièces du camp du roi, de la plus proche à la plus éloignée
        const kingWhite = u.king && u.king.piece === u.king.piece.toUpperCase();
        const foes = [...this.chars.values()].filter((c) => c !== u.king && c.holder.visible && (c.piece === c.piece.toUpperCase()) === kingWhite)
          .sort((a, b) => a.holder.position.distanceTo(u.king.holder.position) - b.holder.position.distanceTo(u.king.holder.position));
        u.flameVictims = foes.map((character, i) => {
          const x = character.holder.position.x, z = character.holder.position.z;
          return { character, at: 0.45 + i * 0.12, position: character.parts.root.position.clone(), scale: character.parts.root.scale.clone(), visible: character.holder.visible,
            bolt: bolt(x, z, 0.03, 7), fire: flames(x, z, 0.9), ash: pile(x, z, 0.9), x, z };
        });
      } else if (style === 'lions') {
        // trois lions entrent par les bords du plateau, rugissent et se jettent sur le roi (sans sauter) avec le cavalier
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 6.2, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(P.x * 0.4, 0.6, P.z * 0.4);
        const from = Math.atan2(A.x - P.x, A.z - P.z);
        s.lions = [0, 1, 2].map((i) => {
          const a = from + (i + 1) * Math.PI / 2, parts = root.Models3D.build(T, u.piece);
          if (parts.rider) parts.rider.visible = false; // des lions sans cavalier
          parts.phase = i * 0.7;
          const h = new T.Group(); h.add(parts.root); h.scale.setScalar(1.2); h.visible = false; g.add(h);
          return { h, parts, a, delay: i * 0.22, from: new T.Vector3(P.x + Math.sin(a) * 8.5, 0, P.z + Math.cos(a) * 8.5), to: new T.Vector3(P.x + Math.sin(a) * 0.85, 0, P.z + Math.cos(a) * 0.85) };
        });
        s.roars = [0, 1, 2].map(() => { const r = new T.Mesh(new T.RingGeometry(0.4, 0.55, 40), this.sabreFire(0xffe08a, 0)); r.material.side = T.DoubleSide; r.rotation.x = -Math.PI / 2; r.position.set(P.x, 0.05, P.z); g.add(r); return r; });
        s.dust = [];
        const dust = this.sabreFire(0xd9b27a, 0.5), puff = new T.SphereGeometry(0.12, 8, 6);
        for (let i = 0; i < 36; i++) { const m = new T.Mesh(puff, dust); m.userData = { lion: i % 3, off: (i / 3 | 0) / 12 }; m.visible = false; g.add(m); s.dust.push(m); }
        // la case rouge laissée là où le roi a été dévoré, jusqu'à la partie suivante
        s.red = at(new T.Mesh(new T.PlaneGeometry(0.98, 0.98), new T.MeshBasicMaterial({ color: 0x9b1111, transparent: true, opacity: 0, depthWrite: false })), 0, 0.028, 0);
        s.red.rotation.x = -Math.PI / 2;
      } else if (style === 'pietine') {
        // l'éléphant marche sur le roi, se cabre et le piétine trois fois de ses pattes de devant
        s.rings = [0, 1, 2].map(() => { const r = new T.Mesh(new T.RingGeometry(0.35, 0.5, 36), this.sabreFire(0xd9b27a, 0)); r.material.side = T.DoubleSide; r.rotation.x = -Math.PI / 2; r.position.set(P.x, 0.05, P.z); g.add(r); return r; });
        s.crack = at(new T.Mesh(new T.CircleGeometry(0.6, 28), new T.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0, depthWrite: false })), 0, 0.03, 0);
        s.crack.rotation.x = -Math.PI / 2;
        s.stomped = [];
        // le trou laissé à la place du roi, jusqu'à la partie suivante
        s.hole = new T.Group(); s.hole.position.set(P.x, 0, P.z); s.hole.visible = false; g.add(s.hole);
        const pit = new T.Mesh(new T.CircleGeometry(0.42, 32), new T.MeshBasicMaterial({ color: 0x0b0704 })); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.035; s.hole.add(pit);
        const inner = new T.Mesh(new T.CircleGeometry(0.3, 28), new T.MeshBasicMaterial({ color: 0x000000 })); inner.rotation.x = -Math.PI / 2; inner.position.y = 0.037; s.hole.add(inner);
        const rim = new T.Mesh(new T.TorusGeometry(0.44, 0.05, 6, 32), std(0x6b4423, { roughness: 1 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.04; s.hole.add(rim);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 0.5 + (i % 3) * 0.07, rock = new T.Mesh(new T.DodecahedronGeometry(0.04 + (i % 3) * 0.02, 0), std(0x8a5a2c, { flatShading: true, roughness: 1 })); rock.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r); s.hole.add(rock); }
      } else if (style === 'harmattan') {
        // ciel jaune, tempête de sable, yeux de léopard dans la poussière
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 4.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.6, 0); // la caméra descend pour montrer le ciel
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0xc9992f, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.sand = [];
        const sand = this.sabreFire(0xd9b25a, 0.7), sandDark = this.sabreFire(0xa8772e, 0.7), grain = new T.SphereGeometry(0.16, 8, 6);
        for (let i = 0; i < 90; i++) { const m = new T.Mesh(grain, i % 3 ? sand : sandDark); m.userData = { a: i * 0.7, h: (i % 13) / 13, r: 0.5 + (i % 7) * 0.3, sp: 3 + (i % 4) }; m.scale.y = 0.6; g.add(m); s.sand.push(m); }
        s.eyes = [];
        const eye = new T.MeshBasicMaterial({ color: 0xffe14d, toneMapped: false });
        for (let i = 0; i < 4; i++) { const pair = new T.Group(); for (const k of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), eye); e.scale.y = 0.55; e.position.x = k * 0.28; pair.add(e); } pair.position.set(P.x + Math.sin(yaw + i * 1.6) * 2.2, 1.4 + (i % 2) * 1.1, P.z + Math.cos(yaw + i * 1.6) * 2.2); pair.rotation.y = yaw; g.add(pair); s.eyes.push(pair); }
      }
    }
    // Danse de la reine avant l'orage : elle tourne sur elle-même en sautillant, puis lève les bras vers le ciel
    kitDance(u, c, e, smooth) {
      const root = c.parts.root, base = u.actorBase, k = smooth(e / 2.2);
      root.rotation.y = base.rotation.y + k * Math.PI * 4;
      root.position.y = base.position.y + (e < 2.2 ? Math.abs(Math.sin(e * 7)) * 0.14 : 0);
    }
    // Le cavalier court avec la meute jusqu'au roi et bondit sur lui au moment de l'impact
    kitCharge(u, c, t, e, smooth, hit, M) {
      const P = u.target, F = u.fromPos, k = smooth((e - 0.6) / (hit - 1.05)), jump = Math.max(0, Math.min(1, (e - hit + 0.45) / 0.6));
      const d = Math.hypot(P.x - F.x, P.z - F.z) || 1, stop = Math.max(0, 1 - 0.85 / d) * k + jump * 0.45 * (0.85 / d);
      // une fois le roi dévoré, le cavalier rentre sur sa case et se remet dans son sens
      const back = smooth((e - hit - 1.8) / 0.8), s2 = stop * (1 - back);
      c.holder.position.set(F.x + (P.x - F.x) * s2, 0, F.z + (P.z - F.z) * s2); // il reste au sol, comme la meute
      c.parts.root.rotation.y = back >= 1 ? u.actorBase.rotation.y : Math.atan2(P.x - F.x, P.z - F.z) + (back > 0 ? Math.PI : 0) - c.holder.rotation.y; // l'avant du modèle est son axe +z
      M.animate(c.parts, t, (k < 1 && e > 0.6) || (back > 0 && back < 1) || (jump > 0 && jump < 1) ? 'run' : 'idle', 1); // ni bond ni cabrage
    }
    // Les trois coups de pattes de l'éléphant : le dernier est l'impact du mat
    kitStompTimes(hit) { return [hit - 1.6, hit - 0.8, hit]; }
    kitStomp(u, c, t, e, smooth, hit, M) {
      const P = u.target, F = u.fromPos, d = Math.hypot(P.x - F.x, P.z - F.z) || 1, p = c.parts, base = u.actorBase;
      // il grandit jusqu'à doubler de taille, marche (vite) jusqu'au roi, puis revient à reculons sur sa case une fois
      // le roi écrasé, se remet dans son sens et reprend sa taille
      const g = 1 + smooth(e / 0.6) - smooth((e - hit - 1.4) / 0.5);
      p.root.scale.copy(base.scale).multiplyScalar(g);
      const back = smooth((e - hit - 0.5) / 0.65), k = smooth((e - 0.3) / 0.55) * Math.max(0, 1 - 0.62 * g / d) * (1 - back);
      c.holder.position.set(F.x + (P.x - F.x) * k, 0, F.z + (P.z - F.z) * k);
      const face = Math.atan2(P.x - F.x, P.z - F.z) - c.holder.rotation.y, turn = smooth((e - hit - 1.2) / 0.5);
      const delta = Math.atan2(Math.sin(base.rotation.y - face), Math.cos(base.rotation.y - face));
      p.root.rotation.y = face + delta * turn;
      M.animate(p, t, (e > 0.3 && e < 0.85) || (back > 0 && back < 1) ? 'run' : 'idle', 1);
      // il se cabre (montée lente) puis abat ses pattes de devant (chute rapide), trois fois
      let lift = 0;
      for (const st of this.kitStompTimes(hit)) { const q = (e - st + 0.65) / 0.65; if (q > 0 && q < 1) lift = q < 0.78 ? smooth(q / 0.78) : 1 - smooth((q - 0.78) / 0.22); }
      // cabré droit sur les pattes arrière (l'inclinaison suit l'orientation de l'éléphant, sinon il se penche de côté),
      // le corps relevé autour des pattes arrière, qui restent plantées au sol ; les deux pattes de devant se lèvent ensemble
      const a = lift * 0.75;
      p.root.rotation.order = 'YXZ';
      p.root.rotation.x = base.rotation.x - a; p.root.position.y = base.position.y + Math.sin(a) * 0.2 * base.scale.z * g;
      // les pattes ne sont figées que pendant qu'il se cabre : le reste du temps, elles suivent la marche
      if (lift > 0) { p.armL.rotation.x = p.armR.rotation.x = -lift * 1.3; p.legL.rotation.x = p.legR.rotation.x = a; }
      p.trunkUp = lift > 0.05 ? -0.9 * lift : null;
    }
    // Le roi s'écrase un peu plus à chaque coup de pattes
    kitStompKing(u, c, e, hit) {
      const n = this.kitStompTimes(hit).filter((st) => e >= st).length, h = [1, 0.72, 0.45, 0.12][n], b = u.kingBase.scale, root = c.parts.root;
      root.rotation.set(u.kingBase.rotation.x, root.rotation.y, u.kingBase.rotation.z);
      root.scale.set(b.x * (1 + (1 - h) * 0.4), b.y * h, b.z * (1 + (1 - h) * 0.4));
    }
    endKitMate(u) {
      if (u.actor && u.themed === 'pietine') u.actor.parts.trunkUp = null;
      if (u.kitMate.lions) for (const l of u.kitMate.lions) u.fx.remove(l.h); // modèles partagés avec les pièces : on ne les libère pas
      if (this.checkGroup) this.checkGroup.visible = true;
      for (const f of this.volcanoFerns || []) f.rotation.set(0, 0, 0);
      if (u.kitMate.weatherShown != null && this.weatherGroup) this.weatherGroup.visible = u.kitMate.weatherShown;
    }
    tickKitMate(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, s = u.kitMate, P = u.target, style = u.themed, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1);
      u.fx.visible = true;
      if (this.checkGroup) this.checkGroup.visible = false; // le trait d'échec ne suit pas le roi emporté
      if (style === 'ancetres') {
        for (const [i, d] of s.drums.entries()) { const beat = Math.abs(Math.sin(t * 9 + i)); d.scale.y = Math.max(0.01, smooth(e / 0.4) * (1 - clamp((after - 1) / 0.4))); d.userData.top.position.y = 0.61 + beat * 0.04; d.visible = after < 1.4; }
        for (const m of s.anc) {
          const d = m.userData, rise = smooth((e - 1.1) / 1.2), close = smooth((e - 2.1) / 0.9), r = 2.5 - close * 1.5, up = after > 0 ? after * after * 2.4 : 0;
          m.position.set(P.x + Math.cos(d.a) * r - Math.sin(s.yaw) * up * 1.5, up + (rise - 1) * 1.7, P.z + Math.sin(d.a) * r - Math.cos(s.yaw) * up * 1.5);
          m.rotation.y = Math.atan2(P.x - m.position.x, P.z - m.position.z); m.visible = e > 1.1 && after < 1.9;
        }
        s.pull = after > 0 ? new T.Vector3(P.x - Math.sin(s.yaw) * after * after * 3.6, after * after * 2.4, P.z - Math.cos(s.yaw) * after * after * 3.6) : null;
      } else if (style === 'meteores') {
        s.skyMat.opacity = smooth((e - 0.2) / 1);
        const k = clamp((e - 0.7) / (hit - 0.7)), f = new T.Vector3(-Math.sin(s.yaw) * 13 + 6, 16, -Math.cos(s.yaw) * 13);
        s.rock.position.set(P.x + (f.x - P.x) * (1 - k * k), 0.4 + (f.y - 0.4) * (1 - k * k), P.z + (f.z - P.z) * (1 - k * k));
        s.rock.visible = e > 0.7 && after < 0.05; s.rock.rotation.y = t * 3; this.sabreFlicker(s.fire, t, 1);
        for (const m of s.rocks) { const d = m.userData, q = clamp((e - d.d) / 0.7); m.visible = q > 0 && q < 1; m.position.set(d.x + 3 * (1 - q), 13 * (1 - q), d.z - 2 * (1 - q)); }
        if (after > 0 && !s.boom) { s.boom = true; this.sabreBurst(P, t, [0xff8a2a, 0xffd24d, 0x2a1a14], 30, 2.2); this.shakeUntil = t + 0.9; this.shakeAmp = 0.3; }
        // l'onde de choc couche les fougères, en s'éloignant du point d'impact
        for (const f2 of this.volcanoFerns || []) {
          const dx = f2.position.x - P.x, dz = f2.position.z - P.z, dist = Math.hypot(dx, dz), w = smooth((after * 7 - dist) / 2.5) * (1 - smooth((after - 1.1) / 0.9) * 0.55);
          f2.rotation.set(dz / dist * w * 1.15, 0, -dx / dist * w * 1.15);
        }
      } else if (style === 'couleelave') {
        s.skyMat.opacity = smooth((e - 0.2) / 0.9);
        const q0 = 0.8;
        for (const m of s.bursts) { const d = m.userData, a = e - q0 - d.d, q = a % 1.7; m.visible = a > 0 && after < 1.2; m.position.set(s.top.x + d.vx * q, s.top.y + d.vy * q - 4.9 * q * q, s.top.z + d.vz * q); }
        if (e > q0 && !s.boom) { s.boom = true; this.shakeUntil = t + 2.1; this.shakeAmp = 0.1; }
        const k = smooth((e - 1) / (hit - 1)) * s.riverLen, wide = 1 + Math.sin(t * 7) * 0.06;
        for (const [i, m] of s.flow.entries()) { m.scale.z = Math.max(0.01, k); m.position.z = k / 2; m.position.y = i * 0.02; m.scale.x = wide * (i ? 0.9 + Math.sin(t * 5) * 0.2 : 1); }
        s.river.visible = e > 1;
        s.pool.visible = after > 0; s.pool.scale.setScalar(Math.min(1.3, 0.2 + after * 2.2));
        for (const m of s.ash) { const d = m.userData; m.visible = e > 1.2; m.position.set(d.x, ((d.y - e * d.sp) % 7 + 7) % 7, d.z); m.rotation.set(t * 2, t, 0); }
      } else if (style === 'orage') {
        const storm = smooth((e - 0.9) / 1.4) * fade(3);
        s.skyMat.opacity = storm * 0.92;
        // éclairs lointains dans les nuages avant la frappe
        const flicker = e > 2.4 && e < hit && Math.sin(e * 23) > 0.93;
        s.skyMat.color.setHex(flicker || (after > 0 && after < 0.12) ? 0x58607a : 0x15171d);
        this.skyDim = Math.max(this.skyDim || 0, storm * 0.95);
        for (const m of s.clouds) { const d = m.userData, k = smooth((e - 0.8) / 1.6); m.position.set(d.x * (1.6 - k * 0.6) + Math.sin(t * 0.7 + d.ph) * 0.4, d.y + (1 - k) * 2, d.z * (1.6 - k * 0.6)); m.material.opacity = 0.95 * k * fade(3); m.visible = k > 0.01; }
        const raining = e > 2 && after < 3.2;
        for (const m of s.rain) { const d = m.userData, y = ((d.y - e * d.sp) % 7 + 7) % 7; m.visible = raining; m.position.set(d.x - y * 0.4, y, d.z); }
        for (const m of s.gusts) { const d = m.userData, q = ((e * d.sp + d.off) % 14) - 7; m.visible = e > 1.8 && after < 3; m.position.set(q, d.y + Math.sin(t * 6 + d.off) * 0.25, d.z); m.rotation.set(t * 7 + d.off, t * 5, 0); }
        // gros éclair sur le roi, qui brûle jusqu'aux cendres
        s.bigBolt.visible = after > 0 && after < 0.4 && Math.sin(after * 70) > -0.4;
        if (after > 0 && !s.boom) { s.boom = true; this.sabreBurst(P, t, [0xcfe6ff, 0xffffff, 0x5a7aa8], 26, 1.8); this.shakeUntil = t + 0.9; this.shakeAmp = 0.28; }
        const kb = smooth((after - 0.1) / 0.3) * (1 - smooth((after - 1.1) / 0.5));
        this.sabreFlicker(s.kingFire, t, kb);
        s.kingAsh.visible = after > 0.7; s.kingAsh.scale.setScalar(Math.max(0.01, smooth((after - 0.7) / 0.6)));
        // petits éclairs sur chaque pièce adverse, qui part en cendres à son tour
        for (const v of u.flameVictims) {
          const a = after - v.at, root = v.character.parts.root;
          v.bolt.visible = a > 0 && a < 0.25 && Math.sin(a * 80) > -0.3;
          if (a > 0 && !v.hit) { v.hit = true; this.sabreBurst({ x: v.x, z: v.z }, t, [0xcfe6ff, 0xffffff], 8, 0.7); }
          this.sabreFlicker(v.fire, t, smooth((a - 0.05) / 0.25) * (1 - smooth((a - 0.9) / 0.4)));
          const k = smooth((a - 0.1) / 0.9);
          if (a > 0) { root.scale.set(v.scale.x * (1 - k * 0.96), v.scale.y * Math.max(0.02, 1 - k), v.scale.z * (1 - k * 0.96)); v.character.holder.visible = a < 1; }
          v.ash.visible = a > 0.6; v.ash.scale.setScalar(Math.max(0.01, smooth((a - 0.6) / 0.5)));
        }
      } else if (style === 'lions') {
        const M = u.kitM;
        for (const l of s.lions) {
          const go = e - 0.4 - l.delay, k = smooth(go / (hit - 0.85 - l.delay)), jump = clamp((after + 0.45) / 0.6);
          const x = l.from.x + (l.to.x - l.from.x) * k, z = l.from.z + (l.to.z - l.from.z) * k, close = jump * 0.45;
          // après le bond, ils dévorent le roi, puis repartent en courant vers le bord d'où ils sont venus
          const eat = after > 0.15 && after < 1.6, leave = smooth((after - 1.6) / 1.4);
          const ex = x + (P.x - x) * close, ez = z + (P.z - z) * close;
          l.h.visible = go > 0 && leave < 1;
          l.h.position.set(ex + (l.from.x - ex) * leave, 0, ez + (l.from.z - ez) * leave); // ils restent au sol : élan jusqu'au roi, sans saut
          l.h.rotation.y = leave > 0 ? Math.atan2(l.from.x - ex, l.from.z - ez) : Math.atan2(P.x - x, P.z - z);
          l.pos = l.h.position;
          if (M) M.animate(l.parts, t, (k < 1 && go > 0) || leave > 0 || (jump > 0 && jump < 1) ? 'run' : 'idle', 1); // à quatre pattes : ni bond ni cabrage
          if (eat && l.parts.head) l.parts.head.rotation.x = 0.35 + Math.sin(t * 14 + l.delay * 9) * 0.3; // têtes qui mordent
        }
        for (const m of s.dust) { const l = s.lions[m.userData.lion], q = (t * 1.6 + m.userData.off) % 1; m.visible = l.h.visible && after < -0.45 && !!l.pos; if (m.visible) { m.position.set(l.pos.x - Math.sin(l.h.rotation.y) * q * 0.9, 0.08 + q * 0.25, l.pos.z - Math.cos(l.h.rotation.y) * q * 0.9); m.scale.setScalar(0.6 + q * 1.6); m.material.opacity = 0.5 * (1 - q); } }
        // rugissement de la meute juste avant de bondir, puis l'impact sur le roi
        for (const [i, r] of s.roars.entries()) { const q = e - (hit - 1.1) - i * 0.2; r.visible = q > 0 && q < 0.8; r.scale.setScalar(1 + q * 7); r.material.opacity = 0.8 * Math.max(0, 1 - q / 0.8); }
        if (after > 0 && !s.boom) { s.boom = true; this.sabreBurst(P, t, [0xffc247, 0xfff1a8, 0x7a3a1e], 24, 1.5); this.shakeUntil = t + 0.7; this.shakeAmp = 0.22; }
        if (after > 0.6 && !s.bite) { s.bite = true; this.sabreBurst(P, t, [0xb3121b, 0x6e0a0a], 10, 0.6, 0.3); }
        s.red.material.opacity = 0.85 * smooth((after - 0.3) / 1);
      } else if (style === 'pietine') {
        const steps = this.kitStompTimes(hit);
        for (const [i, st] of steps.entries()) {
          if (e >= st && !s.stomped[i]) { s.stomped[i] = true; this.sabreBurst(P, t, [0xd9b27a, 0x8a5a2c, 0xfff1a8], 12 + i * 8, 0.7 + i * 0.35, 0.2); this.shakeUntil = t + 0.3 + i * 0.15; this.shakeAmp = 0.1 + i * 0.08; }
          const q = e - st, r = s.rings[i]; r.visible = q > 0 && q < 0.7; r.scale.setScalar(1 + q * (5 + i * 3)); r.material.opacity = 0.75 * Math.max(0, 1 - q / 0.7);
        }
        s.crack.material.opacity = 0.25 * s.stomped.filter(Boolean).length; s.crack.scale.setScalar(0.7 + 0.25 * s.stomped.filter(Boolean).length);
        s.hole.visible = after > 0.1; s.hole.scale.setScalar(Math.max(0.01, smooth((after - 0.1) / 0.35)));
      } else if (style === 'harmattan') {
        s.skyMat.opacity = smooth((e - 0.2) / 1);
        const k = smooth((e - 0.5) / 2.2);
        for (const m of s.sand) { const d = m.userData, a = d.a + t * d.sp, r = (3.6 - k * 2.5) * (0.4 + d.r * 0.4), y = 0.1 + ((d.h + t * 0.28) % 1) * 3.6; m.position.set(P.x + Math.cos(a) * r, y, P.z + Math.sin(a) * r); m.visible = e > 0.5 && after < 1.4; m.material.opacity = 0.75 * fade(1.4); }
        for (const [i, p] of s.eyes.entries()) { const on = e > 1.1 + i * 0.25 && after < 0.8; p.visible = on && Math.sin(t * 2.3 + i * 2) > -0.75; }
      }
    }

    bindInput() {
      const el = this.renderer.domElement;
      let down = null, spin = null, lastBorderTap = 0;
      const pointers = new Map();
      let pinch = 0;
      const tilt = (dy) => {
        this.takeCamera();
        this.elevation = Math.max(18, Math.min(88, this.elevation + dy * 0.35));
        this.setCamera(this.flipped, true);
      };
      const zoomBy = (factor) => {
        this.takeCamera();
        this.zoom = Math.max(0.45, Math.min(1.7, (this.zoom || 1) * factor));
        this.setCamera(this.flipped, true);
      };
      el.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0015)); }, { passive: false });
      // angle du doigt autour du centre du plateau, à l'écran
      const angleAt = (x, y) => {
        const c = new this.THREE.Vector3(0, 0, 0).project(this.camera), r = el.getBoundingClientRect();
        return Math.atan2(y - (r.top + ((1 - c.y) / 2) * r.height), x - (r.left + ((c.x + 1) / 2) * r.width));
      };
      el.addEventListener('pointerdown', (e) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()];
          pinch = Math.hypot(p.x - q.x, p.y - q.y);
          spin = null;
          if (down) down.dragged = true;
          return;
        }
        down = { x: e.clientX, y: e.clientY, lastY: e.clientY, dragged: false, tilting: false };
        spin = null;
        // après la partie, on fait pivoter le plateau en glissant n'importe où
        if (this.outcome || this.onBorder(e.clientX, e.clientY)) {
          spin = { a: angleAt(e.clientX, e.clientY), moved: false, tilting: false, lastY: e.clientY };
        }
        try { el.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
      });
      el.addEventListener('pointermove', (e) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
          if (pinch > 0 && d > 0) zoomBy(pinch / d);
          pinch = d;
          return;
        }
        if (!down) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (spin) {
          if (!spin.moved && Math.hypot(dx, dy) < 8) return;
          if (spin.tilting || Math.abs(dy) > Math.abs(dx) * 1.1) {
            spin.tilting = true; spin.moved = true; down.dragged = true;
            tilt(e.clientY - spin.lastY); spin.lastY = e.clientY;
            return;
          }
          const a = angleAt(e.clientX, e.clientY);
          let d = a - spin.a; d = Math.atan2(Math.sin(d), Math.cos(d));
          spin.moved = true; spin.a = a;
          d = Math.max(-MAX_ROTATION_STEP, Math.min(MAX_ROTATION_STEP, d));
          this.takeCamera();
          this.yaw = (this.yaw || 0) + d * ROTATION_SENSITIVITY;
          this.setCamera(this.flipped, true);
          return;
        }
        if (down.tilting || (Math.hypot(dx, dy) >= 8 && Math.abs(dy) > Math.abs(dx) * 1.1)) {
          down.tilting = true; down.dragged = true;
          tilt(e.clientY - down.lastY); down.lastY = e.clientY;
        } else if (Math.hypot(dx, dy) >= 8) down.dragged = true;
      });
      el.addEventListener('pointerup', (e) => {
        pointers.delete(e.pointerId); pinch = 0;
        if (pointers.size && down) { down = null; spin = null; return; }
        if (spin) {
          const moved = spin.moved; spin = null; down = null;
          if (!moved) {
            // double toucher sur le bord : retour à la vue de face
            const now = performance.now();
            if (now - lastBorderTap < 400) { this.takeCamera(); this.yaw = 0; this.zoom = 1; this.setCamera(this.flipped, true); }
            lastBorderTap = now;
          }
          return;
        }
        if (!down || down.dragged || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
        down = null;
        const { sq, boardSq } = this.pick(e.clientX, e.clientY);
        if (sq >= 0) this.onSquare(sq, boardSq);
      });
      el.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch = 0; down = null; spin = null; });
    }

    // Le doigt est-il sur le cadre en bois (hors des 64 cases) ou juste autour du plateau ?
    onBorder(x, y) {
      const T = this.THREE, rect = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1), this.camera);
      const b = this.raycaster.intersectObject(this.boardMesh, false)[0];
      if (!b) return !this.raycaster.intersectObjects([...this.chars.values()].map((c) => c.parts.root), true).length;
      return Math.abs(b.point.x) > 4 || Math.abs(b.point.z) > 4;
    }

    // Position écran du centre d'une case (utile aux tests)
    screenOf(sq) {
      const p = this.sqToPos(sq), v = new this.THREE.Vector3(p.x, 0.05, p.z).project(this.camera);
      const r = this.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    }

    pick(x, y) {
      const T = this.THREE;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const v = new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(v, this.camera);
      // Case occupée sous le doigt d'abord ; sinon le personnage touché ; sinon la case vide
      let boardSq = -1;
      const b = this.raycaster.intersectObject(this.boardMesh, false)[0];
      if (b) {
        const f = Math.floor(b.point.x + 4), r = Math.floor(b.point.z + 4);
        if (f >= 0 && f <= 7 && r >= 0 && r <= 7) boardSq = r * 8 + f;
      }
      if (boardSq >= 0 && this.chars.has(boardSq)) return { sq: boardSq, boardSq };
      const roots = [...this.chars.values()].map((c) => c.parts.root);
      for (const h of this.raycaster.intersectObjects(roots, true)) {
        const ch = h.object.userData.char;
        if (!ch || h.object.material.blending === T.AdditiveBlending) continue; // l'aura ne compte pas
        for (const [sq, c] of this.chars) if (c.parts === ch) return { sq, boardSq };
      }
      return { sq: boardSq, boardSq };
    }
  }

  root.Board3D = Board3D;
})(window);
