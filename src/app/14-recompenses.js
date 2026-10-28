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
    $('home-collection-tabs').innerHTML = AVAILABLE_NATURE_COLLECTIONS.map((item) => {
      const available = grade >= item.unlockGrade, selected = collection.id === item.id;
      return `<button type="button" class="home-collection-tab${selected ? ' selected' : ''}${available ? '' : ' locked'}" data-nature-collection="${item.id}" ${available ? '' : `aria-label="${escHtml(L(`${item.name}, se débloque au grade ${item.unlockGrade}`, `${item.name}, unlocks at rank ${item.unlockGrade}`))}"`} aria-pressed="${selected}" title="${escHtml(available ? item.name : L(`Débloqué au grade ${item.unlockGrade}`, `Unlocks at rank ${item.unlockGrade}`))}"${HOME_BACKGROUNDS.includes(item.id) ? ` style="background-image:url('fond_ecran/mini/${item.id}.webp')"` : ''}><span>${item.icon} ${escHtml(item.name)}${available ? '' : ` · 🔒 ${item.unlockGrade}`}</span></button>`;
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
