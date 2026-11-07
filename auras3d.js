/* Ata Wawé — personnages 3D du thème Saga des Auras (créations originales).
   Blancs : l'Ordre du Ciel Azur, super-héros (ivoire, azur, argent). Noirs : l'Empire de l'Ombre, super-vilains (violet, noir, rouge).
   Tous portent un costume : combinaison, cape, gants, bottes et un emblème original sur la poitrine.
   Chaque modèle reprend les articulations des ninjas pour réutiliser les animations ; p.strike choisit le coup
   porté au corps à corps et p.orbit les objets qui flottent autour de la pièce (éclats, miroirs, boucliers).
   Les outils de base viennent de themes3d.js (ThemeKit). */
(function (root) {
  'use strict';
  let T = null, K = null;
  const M = (c, o) => K.mat(c, o);
  const glow = (c) => M(c, { emissive: c, rough: 0.3 });

  /* ---------- Poses ---------- */
  function strikePose(p, k) {
    const hit = Math.floor(k), e = k - hit, s = Math.sin(Math.min(1, e) * Math.PI), alt = hit % 2 ? -1 : 1;
    switch (p.strike) {
      case 'staff': p.armR.rotation.set(-2.5 * s, 0, 0.3); p.torso.rotation.y = -0.5 * s; break;
      case 'fists': { const a = alt > 0 ? p.armR : p.armL; a.rotation.set(-1.7 * s, 0, 0); p.torso.rotation.y = -0.35 * s * alt; break; }
      case 'kick': p.legR.rotation.x = -1.9 * s; p.torso.rotation.x = -0.35 * s; p.root.position.y += 0.1 * s; break;
      case 'blade': p.armR.rotation.set(-1.5, 0, (alt > 0 ? -1.3 : 1.3) * (s - 0.5)); p.torso.rotation.y = -0.4 * s * alt; break;
      case 'claws': p.armL.rotation.x = p.armR.rotation.x = -1.9 * s; if (p.armsUp) for (const a of p.armsUp) a.rotation.x = -2.2 * s; break;
      case 'bash': p.armL.rotation.set(-1.6, 0, 0.3); p.torso.rotation.x = 0.35 * s; p.root.position.z += 0.08 * s; break;
      case 'slam': p.root.position.y += 0.26 * s; p.armL.rotation.z = -2.4 * s; p.armR.rotation.z = 2.4 * s; break;
      case 'hook': p.armR.rotation.set(-2.2 * s, 0, -0.5 * s); p.torso.rotation.y = 0.45 * s; break;
      case 'shock': p.armL.rotation.x = p.armR.rotation.x = -1.6 * s; p.torso.rotation.x = 0.25 * s; break; // décharge des deux paumes
      case 'burn': { const a = alt > 0 ? p.armR : p.armL; a.rotation.set(-1.8 * s, 0, 0); p.torso.rotation.x = 0.2 * s; break; } // paume enflammée
      default: break;
    }
  }
  function kneelPose(p, k) {
    const kl = p.legL.userData.knee, kr = p.legR.userData.knee, b = Math.max(0, Math.min(1, k));
    if (!kl) return;
    p.root.position.y = -0.14 * p.root.scale.y * b;
    p.legL.rotation.set(-1.45 * b, 0, 0); kl.rotation.x = 1.45 * b;
    p.legR.rotation.set(0.15 * b, 0, 0); kr.rotation.x = 1.45 * b;
    p.torso.rotation.x = 0.12 * b;
  }
  function auraPose(p, t, state, k) {
    const ph = t + p.phase;
    (p.orbit || []).forEach((o, i, all) => {
      const a = ph * (o.userData.speed || 1.2) + (i / all.length) * Math.PI * 2, r = o.userData.r || 0.24;
      o.position.set(Math.cos(a) * r, (o.userData.y || 0.1) + Math.sin(ph * 2 + i) * 0.02, Math.sin(a) * r);
      if (o.userData.faceOut) o.rotation.y = -a + Math.PI / 2; else o.rotation.y = ph * 2;
    });
    if (p.flames) p.flames.forEach((f, i) => { f.scale.y = f.userData.h * (1 + Math.sin(ph * 11 + i * 2) * 0.16); f.rotation.z = Math.sin(ph * 7 + i) * 0.1; });
    if (state === 'punch') strikePose(p, k);
    else if (state === 'kneel') kneelPose(p, k);
    else if (p.legL.userData.knee) {
      p.legL.userData.knee.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9;
      p.legR.userData.knee.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9;
    }
    if (p.armsUp) p.armsUp.forEach((a, i) => { if (state !== 'punch') a.rotation.x = Math.sin(ph * 2 + i) * 0.2; });
  }

  /* ---------- Gabarits ---------- */
  // Costume : combinaison d'une couleur (body), gants (gloves), bottes hautes (boots), cape et emblème
  function fighter(o) {
    const p = K.base(0.3), skin = o.skin || '#e8bd98', w = o.wide || 1, suit = o.body;
    K.ell(p.torso, suit, 0.092 * w, 0.105, 0.072 * w, 0, 0.065, 0, o.bodyMat);
    if (o.belt) p.torso.add(K.mesh(K.cyl(0.088 * w, 0.088 * w, 0.024, 14), M(o.belt), 0, -0.005, 0));
    p.head.position.set(0, 0.215, 0);
    p.head.add(K.mesh(K.sphere(o.headR || 0.078, 16, 12), M(skin, o.skinMat)));
    if (o.eyeGlow) for (const s of [-1, 1]) { const e = K.mesh(K.sphere(0.014, 8, 6), glow(o.eyeGlow), s * 0.03, 0.008, 0.074); e.scale.set(1.3, 0.75, 0.6); p.head.add(e); }
    else if (!o.noEyes) K.eyes(p.head, 0.03, 0.006, 0.067, 0.017, o.pupil || '#22305e');
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.112 * w, 0.13, 0);
      K.stick(g, suit, 0.036, 0.03, [0, 0, 0], [0, -0.17, 0], o.bodyMat);
      g.add(K.mesh(K.cyl(0.035, 0.032, 0.075, 10), M(o.gloves), 0, -0.14, 0));   // gant remontant sur l'avant-bras
      g.add(K.mesh(K.sphere(0.037, 8, 6), M(o.gloves), 0, -0.18, 0));
    }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.05, -0.04, 0);
      K.stick(g, suit, 0.042, 0.036, [0, 0, 0], [0, -0.12, 0], o.bodyMat);
      const knee = new T.Group(); knee.position.y = -0.12; g.add(knee); g.userData.knee = knee;
      knee.add(K.mesh(K.sphere(0.036, 8, 6), M(suit, o.bodyMat)));
      K.stick(knee, o.boots, 0.038, 0.034, [0, 0, 0], [0, -0.12, 0]);            // botte haute
      knee.add(K.mesh(K.box(0.07, 0.04, 0.1), M(o.boots), 0, -0.13, 0.012));
    }
    p.pose = auraPose; p.strike = o.strike || 'fists'; p.orbit = [];
    return p;
  }
  function cape(p, color, inner, h = 0.36, wide = 1) {
    const cw = 1 + (wide - 1) * 0.45; // les colosses gardent une cape plus étroite que leur carrure
    const c = new T.Group(); c.position.set(0, 0.16, -0.075 * wide); c.userData.wind = 'cloak';
    for (const s of [-1, 1]) c.add(K.mesh(K.box(0.022, 0.03, 0.05), M(color), s * 0.085 * cw, 0.02, 0.03)); // attaches aux épaules
    c.add(K.mesh(K.box(0.22 * cw, h, 0.012), M(color), 0, -h / 2, -0.012));
    c.add(K.mesh(K.box(0.2 * cw, h - 0.02, 0.006), M(inner), 0, -h / 2, -0.002));
    c.rotation.x = 0.12; p.torso.add(c); return c;
  }
  // Emblème de poitrine : un cercle et un symbole, tous dessinés pour ce thème
  const sym = (pts, color) => { const s = new T.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return new T.Mesh(new T.ShapeGeometry(s), M(color, { emissive: color, rough: 0.4 })); };
  const disc = (r, color, x = 0, y = 0) => { const m = new T.Mesh(new T.CircleGeometry(r, 18), M(color, { emissive: color, rough: 0.4 })); m.position.set(x, y, 0); return m; };
  const bar = (w, h, color, x, y, rz = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), M(color, { emissive: color, rough: 0.4 })); m.position.set(x, y, 0); m.rotation.z = rz; return m; };
  const SYMBOLS = {
    cloud: (c) => [disc(0.34, c, -0.3, -0.1), disc(0.42, c, 0.05, 0.14), disc(0.3, c, 0.38, -0.12), bar(1.1, 0.3, c, 0.03, -0.3)],
    star: (c) => { const pts = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.32 : 0.8; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return [sym(pts, c)]; },
    shield: (c) => [sym([[-0.56, 0.6], [0.56, 0.6], [0.56, 0], [0.28, -0.42], [0, -0.74], [-0.28, -0.42], [-0.56, 0]], c)],
    sun: (c) => { const out = [disc(0.38, c)]; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; out.push(bar(0.3, 0.1, c, Math.cos(a) * 0.62, Math.sin(a) * 0.62, a)); } return out; },
    bolt: (c) => [sym([[0.22, 0.8], [-0.42, -0.08], [-0.04, -0.08], [-0.24, -0.8], [0.44, 0.16], [0.06, 0.16]], c)],
    temple: (c) => [sym([[-0.72, 0.28], [0, 0.74], [0.72, 0.28]], c), bar(0.14, 0.72, c, -0.42, -0.14), bar(0.14, 0.72, c, 0, -0.14), bar(0.14, 0.72, c, 0.42, -0.14), bar(1.3, 0.14, c, 0, -0.56)],
    comet: (c) => [disc(0.3, c, 0.3, 0.3), sym([[0.5, 0.08], [-0.72, -0.7], [0.08, 0.5]], c)],
    diamond: (c) => [sym([[0, 0.8], [0.56, 0], [0, -0.8], [-0.56, 0]], c)],
    flame: (c) => [sym([[0, 0.82], [0.2, 0.34], [0.5, 0.1], [0.42, -0.42], [0.1, -0.76], [-0.36, -0.68], [-0.54, -0.22], [-0.3, 0.2], [-0.18, 0.02]], c)],
    eye: (c) => [sym([[-0.8, 0], [-0.36, 0.34], [0, 0.44], [0.36, 0.34], [0.8, 0], [0.36, -0.34], [0, -0.44], [-0.36, -0.34]], c), disc(0.2, '#0f0c1a')],
    target: (c) => [disc(0.22, c), bar(1.5, 0.08, c, 0, 0), bar(0.08, 1.5, c, 0, 0)],
  };
  function emblem(p, kind, color, bg = '#0f0c1a', wide = 1) {
    const g = new T.Group(); g.position.set(0, 0.105, 0.074 * wide); g.scale.setScalar(0.046); g.rotation.x = -0.12;
    const inner = new T.Mesh(new T.CircleGeometry(1, 28), M(bg)); inner.position.z = 0.02;
    g.add(new T.Mesh(new T.CircleGeometry(1.14, 28), M(color, { emissive: color })), inner);
    SYMBOLS[kind](color).forEach((m) => { m.position.z = 0.05; g.add(m); });
    p.torso.add(g); return g;
  }
  // Loup : bandeau sur les yeux, qui passe autour de la tête
  function domino(p, color, r = 0.08) {
    p.head.add(K.mesh(K.cyl(r, r, 0.044, 20), M(color), 0, 0.008, 0));
    for (const s of [-1, 1]) { const t = K.mesh(K.cone(0.018, 0.05, 5), M(color), s * 0.066, 0.036, 0.04); t.rotation.z = -s * 0.5; p.head.add(t); }
  }
  // Plastron et épaulières
  function armor(p, color, trim, o = {}, wide = 1) {
    K.ell(p.torso, color, 0.094 * wide, 0.078, 0.075 * wide, 0, 0.1, 0, o);
    for (const s of [-1, 1]) { const pad = K.mesh(K.sphere(0.052, 12, 8), M(color, o), s * 0.112 * wide, 0.16, 0); pad.scale.set(1.15, 0.7, 1.1); p.torso.add(pad); }
    if (trim) { const r = K.mesh(new T.TorusGeometry(0.093 * wide, 0.006, 6, 24), glow(trim), 0, 0.045, 0); r.rotation.x = Math.PI / 2; r.scale.y = 0.8; p.torso.add(r); }
  }
  const orbiter = (p, o, data) => { o.userData = Object.assign(o.userData, data); p.torso.add(o); p.orbit.push(o); return o; };
  function crystal(color, r = 0.02) { const m = K.mesh(new T.OctahedronGeometry(r, 0), M(color, { emissive: color, metal: 0.4, rough: 0.2 })); m.scale.y = 1.7; return m; }
  // Chevelure de flamme (animée par auraPose)
  function flameHair(p, list, y = 0.05) {
    p.flames = [];
    for (const [x, z, r, h, c] of list) { const f = K.mesh(K.cone(r, 1, 10), glow(c), x, y + h * 0.42, z); f.scale.y = h; f.userData.h = h; p.head.add(f); p.flames.push(f); }
  }

  /* ---------- Blancs : l'Ordre du Ciel Azur, super-héros ---------- */
  // Maître Oro, le sage des nuages
  function oro() {
    const p = fighter({ body: '#dfe8f5', gloves: '#2f7fe0', boots: '#2f7fe0', belt: '#ffd27a', skin: '#efc9a8', strike: 'staff', pupil: '#3a3a4a' });
    cape(p, '#2f7fe0', '#bfeaff', 0.38);
    emblem(p, 'cloud', '#2f7fe0', '#ffffff');
    K.ell(p.head, '#ffffff', 0.058, 0.095, 0.034, 0, -0.08, 0.048);       // longue barbe
    K.ell(p.head, '#ffffff', 0.08, 0.05, 0.05, 0, 0.012, -0.05);          // couronne de cheveux blancs
    p.head.add(K.mesh(K.box(0.03, 0.01, 0.012), M('#ffffff'), -0.032, 0.036, 0.072), K.mesh(K.box(0.03, 0.01, 0.012), M('#ffffff'), 0.032, 0.036, 0.072)); // sourcils
    const staff = new T.Group(); staff.position.set(0, -0.18, 0.03); p.armR.add(staff); p.aimW = [{ o: staff, f: Math.PI / 2 }];
    K.stick(staff, '#c8a46a', 0.011, 0.011, [0, -0.14, 0], [0, 0.38, 0]);
    p.armR.rotation.z = 0.1;
    const pearl = K.mesh(K.sphere(0.03, 12, 10), glow('#fff4c2'), 0, 0.4, 0); staff.add(pearl); p.muzzle = pearl;
    p.scaleK = 1.04;
    return p;
  }
  // Sorën, l'Éveillée
  function soren() {
    const p = fighter({ body: '#e6ecf5', gloves: '#2f6fd0', boots: '#2f6fd0', belt: '#2f9bff', skin: '#e9bf9a', strike: 'fists', pupil: '#1d6fd0' });
    cape(p, '#2f9bff', '#bfeaff', 0.38);
    emblem(p, 'star', '#2f9bff', '#eaf6ff');
    K.ell(p.head, '#e9f6ff', 0.082, 0.062, 0.08, 0, 0.03, -0.01, { emissive: '#bfeaff' });
    p.head.add(K.mesh(K.cone(0.05, 0.02, 12), M('#e9f6ff', { emissive: '#bfeaff' }), 0, 0.078, 0.01));
    const braid = new T.Group(); braid.position.set(0, 0.0, -0.075); braid.userData.wind = 'tail'; p.head.add(braid);
    for (let i = 0; i < 6; i++) braid.add(K.mesh(K.sphere(0.024 - i * 0.002, 8, 6), M('#e9f6ff', { emissive: '#bfeaff' }), 0, -0.03 - i * 0.04, -0.012 * i));
    p.scaleK = 1.04;
    return p;
  }
  // Vaskar, le golem-gardien aux trois boucliers
  function vaskar() {
    const rock = { rough: 0.95 }, w = 1.5;
    const p = fighter({ body: '#33507e', gloves: '#b9c3d6', boots: '#b9c3d6', belt: '#4cc3ff', skin: '#8e98ab', skinMat: rock, wide: w, headR: 0.052, noEyes: true, strike: 'bash' });
    cape(p, '#1f3358', '#4cc3ff', 0.38, w);
    emblem(p, 'shield', '#4cc3ff', '#14233f', w);
    p.head.add(K.mesh(K.box(0.08, 0.014, 0.012), glow('#7fd8ff'), 0, 0.01, 0.05));
    for (const s of [-1, 1]) p.torso.add(K.mesh(K.box(0.08, 0.055, 0.1), M('#b9c3d6', rock), s * 0.155, 0.18, 0)); // épaulières de pierre
    for (let i = 0; i < 3; i++) {
      const sh = new T.Group();
      const plate = K.mesh(K.cyl(0.065, 0.075, 0.014, 6), M('#3a6fb8', { metal: 0.5, rough: 0.35 })); plate.rotation.x = Math.PI / 2; sh.add(plate);
      const gem = K.mesh(K.sphere(0.018, 8, 6), glow('#4cc3ff'), 0, 0, 0.012); sh.add(gem);
      orbiter(p, sh, { r: 0.27, y: 0.1, speed: 0.9, faceOut: true });
    }
    p.scaleK = 1.12;
    return p;
  }
  // Zaïren, le duelliste de l'aube
  function zairen() {
    const p = fighter({ body: '#24306a', gloves: '#ffd27a', boots: '#ffd27a', belt: '#ffd27a', skin: '#f3d2b6', strike: 'blade', pupil: '#2a3566' });
    cape(p, '#e8e4d8', '#2f7fe0', 0.38);
    emblem(p, 'sun', '#ffd27a', '#141c44');
    domino(p, '#f1efe8');
    K.ell(p.head, '#d7dced', 0.083, 0.058, 0.086, 0, 0.034, -0.016);
    for (let i = 0; i < 3; i++) { const lock = K.mesh(K.cone(0.022, 0.09, 6), M('#f2f5ff'), (i - 1) * 0.03, 0.03, -0.085); lock.rotation.x = -1.9; p.head.add(lock); } // cheveux plaqués en arrière
    const blade = K.mesh(new T.TorusGeometry(0.17, 0.012, 6, 16, 1.5), glow('#fff2b8'), -0.02, -0.34, 0.02);
    blade.rotation.set(0, Math.PI / 2, 0.75); blade.scale.z = 0.5; p.armR.add(blade);
    p.armR.add(K.mesh(K.cyl(0.012, 0.012, 0.06, 6), M('#ffd27a'), 0, -0.2, 0.02)); p.muzzle = blade;
    return p;
  }
  // Nilo, le jeune prodige
  function nilo() {
    const p = fighter({ body: '#2f7fe0', gloves: '#eef2f8', boots: '#eef2f8', belt: '#ffd27a', skin: '#e7b98f', strike: 'kick' });
    cape(p, '#eef2f8', '#bfeaff', 0.24);
    emblem(p, 'bolt', '#ffd27a', '#1d3f8a');
    domino(p, '#1d3f8a');
    K.ell(p.head, '#2a2340', 0.082, 0.058, 0.08, 0, 0.034, -0.01);
    const tail = new T.Group(); tail.position.set(0, 0.04, -0.07); tail.userData.wind = 'tail'; p.head.add(tail);
    const hair = K.mesh(K.cone(0.03, 0.15, 8), M('#2a2340'), 0, -0.065, -0.02); hair.rotation.x = Math.PI + 0.25; tail.add(hair);
    p.scaleK = 0.98;
    return p;
  }
  // Apprenti du Temple Azur
  function apprenti() {
    const p = fighter({ body: '#e4dcc8', gloves: '#3a9cff', boots: '#3a9cff', belt: '#3a9cff', skin: '#f1c8a4', strike: 'fists' });
    cape(p, '#3a9cff', '#bfeaff', 0.22);
    emblem(p, 'temple', '#3a9cff', '#f4efe4');
    domino(p, '#3a9cff');
    p.scaleK = 0.95;
    return p;
  }

  /* ---------- Noirs : l'Empire de l'Ombre, super-vilains ---------- */
  // Vorax, le roi-comète
  function vorax() {
    const dark = { metal: 0.45, rough: 0.2 };
    const p = fighter({ body: '#14101f', bodyMat: dark, gloves: '#b07aff', boots: '#b07aff', belt: '#b07aff', skin: '#e6e0f0', strike: 'staff', pupil: '#ff3d3d' });
    cape(p, '#7a1230', '#ff3d6e', 0.38);
    armor(p, '#4a2a8a', '#b07aff', dark);
    emblem(p, 'comet', '#ff3d6e', '#1a0712').position.z += 0.006;
    for (let i = 0; i < 7; i++) { // couronne de pointes de cristal
      const a = (i / 7) * Math.PI * 2, tip = crystal('#7a2bff', 0.018); tip.position.set(Math.cos(a) * 0.068, 0.082 + (i % 2) * 0.015, Math.sin(a) * 0.068); p.head.add(tip);
    }
    const staff = new T.Group(); staff.position.set(0, -0.18, 0.03); p.armR.add(staff); p.aimW = [{ o: staff, f: Math.PI / 2 }];
    K.stick(staff, '#2c2042', 0.011, 0.011, [0, -0.12, 0], [0, 0.32, 0]);
    const gem = crystal('#ff3d6e', 0.04); gem.position.set(0, 0.37, 0); staff.add(gem); p.muzzle = gem;
    for (let i = 0; i < 4; i++) orbiter(p, crystal('#c04bff', 0.022), { r: 0.24, y: 0.14, speed: 1.5 });
    p.scaleK = 1.06;
    return p;
  }
  // Mélyx, la reine d'obsidienne à quatre bras
  function melyx() {
    const stone = { metal: 0.45, rough: 0.14 }, blade = { metal: 0.8, rough: 0.15 };
    const p = fighter({ body: '#1a1626', bodyMat: stone, gloves: '#c04bff', boots: '#c04bff', belt: '#c04bff', skin: '#2c2640', skinMat: stone, strike: 'claws', pupil: '#c04bff' });
    cape(p, '#5b1f8a', '#c04bff', 0.38);
    emblem(p, 'diamond', '#e58bff', '#120e1c');
    p.head.add(K.mesh(K.box(0.012, 0.09, 0.13), M('#c04bff', { emissive: '#c04bff' }), 0, 0.075, -0.012));
    K.ell(p.head, '#120e1c', 0.018, 0.05, 0.075, 0, 0.068, -0.012, stone);
    p.armsUp = [];
    for (const s of [-1, 1]) {
      const a = new T.Group(); a.position.set(s * 0.1, 0.09, 0); a.rotation.z = s * 0.7; p.torso.add(a);
      K.stick(a, '#1a1626', 0.028, 0.024, [0, 0, 0], [0, -0.15, 0], stone);
      a.add(K.mesh(K.sphere(0.03, 8, 6), M('#c04bff'), 0, -0.16, 0));
      const b = K.mesh(K.cone(0.016, 0.13, 5), M('#cfc6e6', blade), 0, -0.24, 0); b.rotation.x = Math.PI; a.add(b);
      p.armsUp.push(a);
      const low = s < 0 ? p.armL : p.armR, l = K.mesh(K.cone(0.016, 0.13, 5), M('#cfc6e6', blade), 0, -0.27, 0); l.rotation.x = Math.PI; low.add(l);
    }
    for (let i = 0; i < 2; i++) {
      const g = new T.Group(), face = K.mesh(K.cyl(0.06, 0.06, 0.008, 18), M('#dfe8ff', { metal: 0.95, rough: 0.05 })); face.rotation.x = Math.PI / 2; g.add(face);
      const rim = K.mesh(new T.TorusGeometry(0.06, 0.007, 6, 18), glow('#c04bff')); g.add(rim);
      orbiter(p, g, { r: 0.28, y: 0.16, speed: 0.8, faceOut: true });
    }
    p.scaleK = 1.04;
    return p;
  }
  // Golmar, le titan de magma
  function golmar() {
    const rock = { rough: 0.95 }, w = 1.6;
    const p = fighter({ body: '#2a1e1e', bodyMat: rock, gloves: '#ff7a1a', boots: '#ff7a1a', belt: '#ff7a1a', skin: '#3b2b2b', skinMat: rock, wide: w, headR: 0.054, noEyes: true, strike: 'slam' });
    cape(p, '#1a1212', '#ff5a1a', 0.38, w);
    emblem(p, 'flame', '#ff9a3a', '#1a0d08', w);
    for (const [x, y, rz, l] of [[-0.1, 0.13, 0.5, 0.09], [0.1, 0.03, -0.6, 0.1], [-0.08, 0.0, 0.9, 0.08], [0.11, 0.14, 1.2, 0.07]]) { const c = K.mesh(K.box(0.012, l, 0.012), glow('#ff7a1a'), x, y, 0.09); c.rotation.z = rz; p.torso.add(c); } // fissures de lave
    for (const s of [-1, 1]) p.head.add(K.mesh(K.sphere(0.012, 8, 6), glow('#ffb347'), s * 0.022, 0.006, 0.05));
    for (const [x, z, h] of [[0, 0, 0.08], [-0.035, 0.012, 0.06], [0.035, 0.012, 0.06], [0, -0.035, 0.06]]) p.head.add(K.mesh(K.cone(0.018, h, 6), M('#3f3437', rock), x, 0.05 + h / 2, z));
    p.scaleK = 1.14;
    return p;
  }
  // Sentinelle : cyborg à casque, visière cyan et antenne
  function sentinelle() {
    const plate = { metal: 0.55, rough: 0.3 };
    const p = fighter({ body: '#2c2842', bodyMat: plate, gloves: '#9ef7ff', boots: '#4a4466', belt: '#9ef7ff', skin: '#9a93b0', noEyes: true, strike: 'shock' });
    cape(p, '#1a1626', '#7a6cff', 0.22);
    armor(p, '#4a4466', '#9ef7ff', plate);
    emblem(p, 'eye', '#9ef7ff', '#0f0c1a').position.z += 0.006;
    K.ell(p.head, '#4a4466', 0.086, 0.09, 0.086, 0, 0.012, 0, plate);       // casque
    const visor = K.mesh(K.box(0.12, 0.024, 0.024), glow('#9ef7ff'), 0, 0.012, 0.08); p.head.add(visor);
    K.stick(p.head, '#4a4466', 0.006, 0.006, [0.03, 0.08, 0], [0.04, 0.17, 0]);
    p.head.add(K.mesh(K.sphere(0.012, 8, 6), glow('#ff3d6e'), 0.04, 0.175, 0));
    for (const a of [p.armL, p.armR]) a.add(K.mesh(K.sphere(0.016, 8, 6), glow('#ffffff'), 0, -0.21, 0)); // émetteurs de laser dans les paumes
    return p;
  }
  // Krax, le chasseur de primes au grappin
  function krax() {
    const p = fighter({ body: '#3d2b62', gloves: '#ff3d6e', boots: '#ff3d6e', belt: '#ff3d6e', skin: '#c9a080', strike: 'hook', pupil: '#ff3d6e' });
    cape(p, '#1f1830', '#3d2b62', 0.32);
    emblem(p, 'target', '#ff3d6e', '#1f1830');
    K.ell(p.head, '#2d2148', 0.09, 0.083, 0.086, 0, 0.018, -0.016);    // capuche
    p.head.add(K.mesh(K.cone(0.03, 0.07, 8), M('#2d2148'), 0, 0.075, -0.05));
    K.ell(p.head, '#17121b', 0.06, 0.03, 0.028, 0, -0.036, 0.06);      // masque
    for (let i = 0; i < 4; i++) p.armR.add(K.mesh(new T.TorusGeometry(0.012, 0.004, 5, 8), M('#b9bcc7', { metal: 0.9, rough: 0.3 }), 0, -0.22 - i * 0.022, 0.02));
    const hook = K.mesh(new T.TorusGeometry(0.03, 0.007, 6, 12, 4.4), M('#dfe2ea', { metal: 0.9, rough: 0.2 }), 0, -0.34, 0.02); p.armR.add(hook); p.muzzle = hook;
    p.scaleK = 0.98;
    return p;
  }
  // Feu follet d'ombre : petit vilain à la chevelure de flamme violette
  function feuFollet() {
    const p = fighter({ body: '#1a1028', gloves: '#7a2bff', boots: '#7a2bff', belt: '#ffe14d', skin: '#5a3a8a', eyeGlow: '#ffe14d', strike: 'burn' });
    emblem(p, 'flame', '#b07aff', '#120a1e');
    domino(p, '#120a1e');
    flameHair(p, [[0, -0.01, 0.07, 0.2, '#7a2bff'], [-0.04, 0.02, 0.04, 0.14, '#c04bff'], [0.04, 0.01, 0.042, 0.15, '#c04bff'], [0, 0.04, 0.03, 0.11, '#ff6ad5']]);
    for (const a of [p.armL, p.armR]) a.add(K.mesh(K.sphere(0.024, 8, 6), glow('#c04bff'), 0, -0.21, 0)); // flammes au bout des gants
    p.muzzle = p.armR.children[p.armR.children.length - 1];
    p.scaleK = 0.92;
    return p;
  }

  const SET = { P: apprenti, N: nilo, B: zairen, R: vaskar, Q: soren, K: oro, p: feuFollet, n: krax, b: sentinelle, r: golmar, q: melyx, k: vorax };
  root.ThemeModels = root.ThemeModels || {};
  root.ThemeModels.auras = {
    build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return SET[piece](); },
  };
})(window);
