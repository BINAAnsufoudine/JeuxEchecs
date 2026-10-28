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
  };
  // Armes propres aux thèmes guerriers, par pièce (w = Blancs, b = Noirs) ; sinon jet ou salve aux couleurs du thème
  const WAR_PROJ = {
    ancient: { n: { w: 'spear', b: 'spear' }, b: { w: 'bolt', b: 'boulder' }, r: { w: 'arrows', b: 'firepot' }, q: { w: 'spears', b: 'arrows' } },
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
    modern: { w: { jet: 0xffd54f, foam: 0xffffff, bub: 0x8d8d7a, charge: 0xfff59d, boom: [0xfff1a8, 0xff6d00, 0xffc34d], debris: [0x5d5d5d, 0xffb74d], burst: [0xfff1a8, 0xff9100, 0xbdbdbd], bits: [0x616161, 0xffcc80] },
              b: { jet: 0x37474f, foam: 0xb0bec5, bub: 0x37474f, charge: 0x78909c, boom: [0xffab40, 0x263238, 0x546e7a], debris: [0x263238, 0xff6d00], burst: [0xffab40, 0x37474f, 0x546e7a], bits: [0x263238, 0xff9100] } },
  }; // à distance : la cible tire d'abord sa propre technique sur l'attaquant
const BURN_TIME = 1.8; // durée de la combustion jusqu'aux cendres

