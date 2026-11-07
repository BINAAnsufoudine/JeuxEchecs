/* Ata Wawé — personnages 3D du thème Saga des Auras (créations originales).
   Blancs : l'Ordre du Ciel Azur (ivoire, azur, argent). Noirs : l'Empire de l'Ombre (violet, noir cristal, rouge).
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
      case 'shock': p.torso.rotation.x = 0.5 * s; p.root.position.z += 0.1 * s; break;
      case 'burn': p.torso.scale.setScalar(1 + 0.3 * s); break;
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
    if (p.hover) {
      for (const g of ['armL', 'armR', 'legL', 'legR']) if (!p.hasLimbs) p[g].rotation.set(0, 0, 0);
      p.torso.rotation.x = state === 'run' ? 0.28 : 0;
      p.torso.position.y += Math.sin(ph * 2.6) * 0.018;
    }
    if (state === 'punch') strikePose(p, k);
    else if (state === 'kneel') kneelPose(p, k);
    else if (p.legL.userData.knee) {
      p.legL.userData.knee.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9;
      p.legR.userData.knee.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9;
    }
    if (p.armsUp) p.armsUp.forEach((a, i) => { if (state !== 'punch') a.rotation.x = Math.sin(ph * 2 + i) * 0.2; });
  }

  /* ---------- Gabarits ---------- */
  function fighter(o) {
    const p = K.base(0.3), skin = o.skin || '#e8bd98';
    K.ell(p.torso, o.body, 0.092 * (o.wide || 1), 0.105, 0.072 * (o.wide || 1), 0, 0.065, 0, o.bodyMat);
    if (o.belt) p.torso.add(K.mesh(K.cyl(0.088 * (o.wide || 1), 0.088 * (o.wide || 1), 0.024, 14), M(o.belt), 0, -0.005, 0));
    p.head.position.set(0, 0.215, 0);
    p.head.add(K.mesh(K.sphere(o.headR || 0.078, 16, 12), M(skin, o.skinMat)));
    if (!o.noEyes) K.eyes(p.head, 0.03, 0.006, 0.067, 0.017, o.pupil || '#22305e');
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.112 * (o.wide || 1), 0.13, 0);
      K.stick(g, o.sleeve || o.body, 0.036, 0.03, [0, 0, 0], [0, -0.17, 0]);
      g.add(K.mesh(K.sphere(0.036, 8, 6), M(o.hand || skin), 0, -0.18, 0));
      if (o.bracer) g.add(K.mesh(K.cyl(0.036, 0.036, 0.04, 10), M(o.bracer, { metal: 0.7, rough: 0.25 }), 0, -0.14, 0));
    }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.05, -0.04, 0);
      K.stick(g, o.legs || o.body, 0.042, 0.036, [0, 0, 0], [0, -0.12, 0]);
      const knee = new T.Group(); knee.position.y = -0.12; g.add(knee); g.userData.knee = knee;
      knee.add(K.mesh(K.sphere(0.036, 8, 6), M(o.legs || o.body)));
      K.stick(knee, o.legs || o.body, 0.036, 0.032, [0, 0, 0], [0, -0.12, 0]);
      knee.add(K.mesh(K.box(0.07, 0.04, 0.1), M(o.boots || '#2f3a6e'), 0, -0.13, 0.012));
    }
    p.pose = auraPose; p.strike = o.strike || 'fists'; p.orbit = []; p.hasLimbs = true;
    return p;
  }
  function cape(p, color, inner, h = 0.3) {
    const c = new T.Group(); c.position.set(0, 0.15, -0.075); c.userData.wind = 'cloak';
    c.add(K.mesh(K.box(0.2, h, 0.012), M(color), 0, -h / 2, -0.012));
    c.add(K.mesh(K.box(0.18, h - 0.02, 0.006), M(inner), 0, -h / 2, -0.002));
    c.rotation.x = 0.12; p.torso.add(c); return c;
  }
  const orbiter = (p, o, data) => { o.userData = Object.assign(o.userData, data); p.torso.add(o); p.orbit.push(o); return o; };
  function crystal(color, r = 0.02) { const m = K.mesh(new T.OctahedronGeometry(r, 0), M(color, { emissive: color, metal: 0.4, rough: 0.2 })); m.scale.y = 1.7; return m; }

  /* ---------- Blancs : l'Ordre du Ciel Azur ---------- */
  // Maître Oro, le sage des nuages
  function oro() {
    const p = fighter({ body: '#9fc4ee', sleeve: '#b7d3f2', legs: '#7fa6d6', boots: '#8a7a63', belt: '#ffd27a', skin: '#efc9a8', strike: 'staff', pupil: '#3a3a4a' });
    cape(p, '#ffffff', '#cfe6ff', 0.34);
    K.ell(p.head, '#ffffff', 0.058, 0.095, 0.034, 0, -0.08, 0.048);       // longue barbe
    p.head.add(K.mesh(K.box(0.03, 0.01, 0.012), M('#ffffff'), -0.032, 0.036, 0.072), K.mesh(K.box(0.03, 0.01, 0.012), M('#ffffff'), 0.032, 0.036, 0.072)); // sourcils
    for (const [x, y, r] of [[-0.09, 0.15, 0.04], [-0.05, 0.17, 0.034], [0.05, 0.17, 0.034], [0.09, 0.15, 0.04], [0, 0.19, 0.03]]) p.torso.add(K.mesh(K.sphere(r, 10, 8), M('#ffffff'), x, y, 0)); // manteau de nuages
    const staff = new T.Group(); staff.position.set(0, -0.18, 0.03); p.armR.add(staff); p.aimW = [{ o: staff, f: Math.PI / 2 }];
    K.stick(staff, '#c8a46a', 0.011, 0.011, [0, -0.14, 0], [0, 0.38, 0]);
    p.armR.rotation.z = 0.1;
    const pearl = K.mesh(K.sphere(0.03, 12, 10), glow('#fff4c2'), 0, 0.4, 0); staff.add(pearl); p.muzzle = pearl;
    p.scaleK = 1.04;
    return p;
  }
  // Sorën, l'Éveillée
  function soren() {
    const p = fighter({ body: '#dfe7f2', sleeve: '#dfe7f2', legs: '#2f6fd0', boots: '#1d4fa0', belt: '#2f9bff', bracer: '#ffd27a', skin: '#e9bf9a', strike: 'fists', pupil: '#1d6fd0' });
    p.torso.add(K.mesh(K.box(0.02, 0.15, 0.118), M('#2f9bff'), -0.03, 0.08, 0), K.mesh(K.box(0.02, 0.15, 0.118), M('#2f9bff'), 0.03, 0.08, 0)); // bandes azur
    K.ell(p.head, '#e9f6ff', 0.082, 0.062, 0.08, 0, 0.03, -0.01, { emissive: '#bfeaff' });
    p.head.add(K.mesh(K.cone(0.05, 0.02, 12), M('#e9f6ff', { emissive: '#bfeaff' }), 0, 0.078, 0.01));
    const braid = new T.Group(); braid.position.set(0, 0.0, -0.06); braid.userData.wind = 'tail'; p.head.add(braid);
    for (let i = 0; i < 6; i++) braid.add(K.mesh(K.sphere(0.024 - i * 0.002, 8, 6), M('#e9f6ff', { emissive: '#bfeaff' }), 0, -0.03 - i * 0.04, -0.012 * i));
    p.scaleK = 1.04;
    return p;
  }
  // Vaskar, le golem-gardien aux trois boucliers
  function vaskar() {
    const stone = '#59617a', rock = { rough: 0.95 };
    const p = fighter({ body: stone, bodyMat: rock, sleeve: '#4e5670', legs: '#454c63', boots: '#343a4e', hand: '#6a7290', skin: '#6a7290', skinMat: rock, wide: 1.5, headR: 0.05, noEyes: true, strike: 'bash' });
    for (const [x, y, w, h] of [[0, 0.12, 0.012, 0.09], [-0.04, 0.08, 0.05, 0.01], [0.04, 0.04, 0.05, 0.01]]) p.torso.add(K.mesh(K.box(w, h, 0.012), glow('#4cc3ff'), x, y, 0.082)); // runes
    p.head.add(K.mesh(K.box(0.07, 0.012, 0.012), glow('#7fd8ff'), 0, 0.01, 0.046));
    for (const s of [-1, 1]) p.torso.add(K.mesh(K.box(0.06, 0.05, 0.08), M('#7a829c', rock), s * 0.15, 0.18, 0));
    for (let i = 0; i < 3; i++) {
      const sh = new T.Group();
      const plate = K.mesh(K.cyl(0.065, 0.075, 0.014, 6), M('#3a6fb8', { metal: 0.5, rough: 0.35 })); plate.rotation.x = Math.PI / 2; sh.add(plate);
      const gem = K.mesh(K.sphere(0.018, 8, 6), glow('#4cc3ff'), 0, 0, 0.012); sh.add(gem);
      orbiter(p, sh, { r: 0.24, y: 0.1, speed: 0.9, faceOut: true });
    }
    p.scaleK = 1.12;
    return p;
  }
  // Zaïren, le duelliste de l'aube
  function zairen() {
    const p = fighter({ body: '#2a3566', sleeve: '#d8d3c4', legs: '#2a3566', boots: '#b9b4a6', belt: '#ffd27a', skin: '#f3d2b6', strike: 'blade', pupil: '#2a3566' });
    p.torso.add(K.mesh(K.cone(0.11, 0.2, 14), M('#f1efe8'), 0, -0.07, 0));
    cape(p, '#f1efe8', '#2f7fe0', 0.32);
    for (const s of [-1, 1]) p.torso.add(K.mesh(K.box(0.012, 0.17, 0.012), M('#ffd27a'), s * 0.05, 0.08, 0.06));
    K.ell(p.head, '#d7dced', 0.083, 0.058, 0.086, 0, 0.034, -0.016);
    for (let i = 0; i < 3; i++) { const lock = K.mesh(K.cone(0.022, 0.09, 6), M('#f2f5ff'), (i - 1) * 0.03, 0.03, -0.085); lock.rotation.x = -1.9; p.head.add(lock); } // cheveux plaqués en arrière
    const blade = K.mesh(new T.TorusGeometry(0.17, 0.012, 6, 16, 1.5), glow('#fff2b8'), -0.02, -0.34, 0.02);
    blade.rotation.set(0, Math.PI / 2, 0.75); blade.scale.z = 0.5; p.armR.add(blade);
    p.armR.add(K.mesh(K.cyl(0.012, 0.012, 0.06, 6), M('#ffd27a'), 0, -0.2, 0.02)); p.muzzle = blade;
    return p;
  }
  // Nilo, le jeune prodige
  function nilo() {
    const p = fighter({ body: '#2f7fe0', sleeve: '#2f7fe0', legs: '#20356d', boots: '#f4f7ff', belt: '#f4f7ff', skin: '#e7b98f', strike: 'kick' });
    K.ell(p.head, '#2a2340', 0.082, 0.058, 0.08, 0, 0.034, -0.01);
    const tail = new T.Group(); tail.position.set(0, 0.04, -0.07); tail.userData.wind = 'tail'; p.head.add(tail);
    const hair = K.mesh(K.cone(0.03, 0.15, 8), M('#2a2340'), 0, -0.065, -0.02); hair.rotation.x = Math.PI + 0.25; tail.add(hair);
    p.torso.add(K.mesh(new T.TorusGeometry(0.05, 0.02, 8, 14), M('#ffffff'), 0, 0.16, 0));
    p.torso.children[p.torso.children.length - 1].rotation.x = Math.PI / 2;
    const scarf = new T.Group(); scarf.position.set(0.02, 0.16, -0.05); scarf.userData.wind = 'tail'; p.torso.add(scarf);
    scarf.add(K.mesh(K.box(0.04, 0.18, 0.008), M('#ffffff'), 0, -0.09, -0.01));
    p.scaleK = 0.98;
    return p;
  }
  // Apprenti du Temple Azur
  function apprenti() {
    const p = fighter({ body: '#e4dcc8', sleeve: '#e8bd98', legs: '#cfc6ae', boots: '#3b4a7a', belt: '#3a9cff', skin: '#f1c8a4', strike: 'fists' });
    p.head.add(K.mesh(K.cyl(0.081, 0.081, 0.018, 18), M('#3a9cff'), 0, 0.028, 0));
    p.scaleK = 0.95;
    return p;
  }

  /* ---------- Noirs : l'Empire de l'Ombre ---------- */
  // Vorax, le roi-comète
  function vorax() {
    const dark = { metal: 0.45, rough: 0.2 };
    const p = fighter({ body: '#14101f', bodyMat: dark, sleeve: '#2c2042', legs: '#14101f', boots: '#2c2042', belt: '#b07aff', skin: '#e6e0f0', strike: 'staff', pupil: '#ff3d3d' });
    cape(p, '#7a1230', '#ff3d6e', 0.34);
    for (const s of [-1, 1]) { const pad = K.mesh(new T.OctahedronGeometry(0.05, 0), M('#2c2042', dark), s * 0.1, 0.17, 0); pad.scale.y = 0.7; p.torso.add(pad); }
    p.torso.add(K.mesh(new T.OctahedronGeometry(0.03, 0), glow('#c04bff'), 0, 0.1, 0.06));
    for (let i = 0; i < 7; i++) { // couronne de pointes de cristal
      const a = (i / 7) * Math.PI * 2, tip = crystal('#7a2bff', 0.018); tip.position.set(Math.cos(a) * 0.068, 0.082 + (i % 2) * 0.015, Math.sin(a) * 0.068); p.head.add(tip);
    }
    const staff = new T.Group(); staff.position.set(0, -0.18, 0.03); p.armR.add(staff); p.aimW = [{ o: staff, f: Math.PI / 2 }];
    K.stick(staff, '#2c2042', 0.011, 0.011, [0, -0.12, 0], [0, 0.32, 0]);
    const gem = crystal('#ff3d6e', 0.04); gem.position.set(0, 0.37, 0); staff.add(gem); p.muzzle = gem;
    for (let i = 0; i < 4; i++) orbiter(p, crystal('#c04bff', 0.022), { r: 0.22, y: 0.14, speed: 1.5 });
    p.scaleK = 1.06;
    return p;
  }
  // Mélyx, la reine d'obsidienne à quatre bras
  function melyx() {
    const stone = { metal: 0.45, rough: 0.14 };
    const p = fighter({ body: '#17151f', bodyMat: stone, sleeve: '#17151f', legs: '#17151f', boots: '#2b2438', hand: '#c04bff', skin: '#201d2b', skinMat: stone, strike: 'claws', pupil: '#c04bff' });
    p.head.add(K.mesh(K.box(0.012, 0.09, 0.13), M('#c04bff', { emissive: '#c04bff' }), 0, 0.06, -0.012));
    K.ell(p.head, '#17151f', 0.018, 0.05, 0.075, 0, 0.055, -0.012, stone);
    p.armsUp = [];
    for (const s of [-1, 1]) {
      const a = new T.Group(); a.position.set(s * 0.09, 0.09, 0); a.rotation.z = s * 0.7; p.torso.add(a);
      K.stick(a, '#17151f', 0.02, 0.017, [0, 0, 0], [0, -0.15, 0]);
      const b = K.mesh(K.cone(0.016, 0.13, 5), M('#cfc6e6', { metal: 0.8, rough: 0.15 }), 0, -0.21, 0); b.rotation.x = Math.PI; a.add(b);
      p.armsUp.push(a);
      const low = s < 0 ? p.armL : p.armR, l = K.mesh(K.cone(0.016, 0.13, 5), M('#cfc6e6', { metal: 0.8, rough: 0.15 }), 0, -0.25, 0); l.rotation.x = Math.PI; low.add(l);
    }
    for (let i = 0; i < 2; i++) {
      const g = new T.Group(), face = K.mesh(K.cyl(0.06, 0.06, 0.008, 18), M('#dfe8ff', { metal: 0.95, rough: 0.05 })); face.rotation.x = Math.PI / 2; g.add(face);
      const rim = K.mesh(new T.TorusGeometry(0.06, 0.007, 6, 18), glow('#c04bff')); g.add(rim);
      orbiter(p, g, { r: 0.25, y: 0.16, speed: 0.8, faceOut: true });
    }
    p.scaleK = 1.04;
    return p;
  }
  // Golmar, le titan de magma
  function golmar() {
    const rock = { rough: 0.95 };
    const p = fighter({ body: '#2b2326', bodyMat: rock, sleeve: '#332a2c', legs: '#241d20', boots: '#1a1517', hand: '#ff7a1a', skin: '#2f2628', skinMat: rock, wide: 1.6, headR: 0.052, noEyes: true, strike: 'slam' });
    for (const [x, y, rz, l] of [[-0.05, 0.09, 0.5, 0.11], [0.05, 0.05, -0.6, 0.12], [0, 0.13, 1.3, 0.09], [0.03, 0.0, 0.9, 0.08]]) { const c = K.mesh(K.box(0.012, l, 0.012), glow('#ff7a1a'), x, y, 0.082); c.rotation.z = rz; p.torso.add(c); }
    for (const s of [-1, 1]) p.head.add(K.mesh(K.sphere(0.012, 8, 6), glow('#ffb347'), s * 0.022, 0.006, 0.048));
    for (const [x, z, h] of [[0, 0, 0.08], [-0.035, 0.012, 0.06], [0.035, 0.012, 0.06], [0, -0.035, 0.06]]) p.head.add(K.mesh(K.cone(0.018, h, 6), M('#3f3437', rock), x, 0.05 + h / 2, z));
    for (const a of [p.armL, p.armR]) a.add(K.mesh(K.sphere(0.042, 10, 8), glow('#ff7a1a'), 0, -0.19, 0));
    p.scaleK = 1.14;
    return p;
  }
  // Sentinelle : drone volant sans jambes, un seul œil, ailes en lame
  function sentinelle() {
    const p = K.base(0.42), hull = { metal: 0.5, rough: 0.3 };
    p.pose = auraPose; p.strike = 'shock'; p.hover = true; p.orbit = [];
    K.ell(p.torso, '#3a2354', 0.1, 0.085, 0.09, 0, 0.06, 0, hull);
    p.torso.add(K.mesh(K.cone(0.05, 0.1, 8), M('#2a1a40', hull), 0, -0.05, 0)); p.torso.children[p.torso.children.length - 1].rotation.x = Math.PI;
    const eye = K.mesh(K.sphere(0.036, 14, 10), glow('#9ef7ff'), 0, 0.075, 0.08); p.torso.add(eye); p.muzzle = eye;
    p.torso.add(K.mesh(new T.TorusGeometry(0.1, 0.007, 6, 22), glow('#c04bff'), 0, 0.06, 0));
    p.torso.children[p.torso.children.length - 1].rotation.x = Math.PI / 2;
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.1, 0.08, 0);
      const wing = K.mesh(K.cone(0.04, 0.24, 4), M('#7f6fa8', { metal: 0.8, rough: 0.2 }), s * 0.1, 0, 0); wing.rotation.z = s * -Math.PI / 2 - s * 0.25; wing.scale.z = 0.25; g.add(wing);
    }
    return p;
  }
  // Krax, le chasseur de primes au grappin
  function krax() {
    const p = fighter({ body: '#4a3524', sleeve: '#3c2c20', legs: '#2d2219', boots: '#1d1612', belt: '#ff3d6e', skin: '#c9a080', strike: 'hook', pupil: '#ff3d6e' });
    cape(p, '#2a2030', '#4a1230', 0.28);
    K.ell(p.head, '#3a2c3e', 0.09, 0.083, 0.086, 0, 0.018, -0.016);    // capuche
    p.head.add(K.mesh(K.cone(0.03, 0.07, 8), M('#3a2c3e'), 0, 0.075, -0.05));
    K.ell(p.head, '#17121b', 0.06, 0.03, 0.028, 0, -0.036, 0.06);      // masque
    for (const s of [-1, 1]) p.torso.add(K.mesh(K.box(0.012, 0.19, 0.11), M('#2d2219'), s * 0.03, 0.08, 0));
    for (let i = 0; i < 4; i++) p.armR.add(K.mesh(new T.TorusGeometry(0.012, 0.004, 5, 8), M('#b9bcc7', { metal: 0.9, rough: 0.3 }), 0, -0.2 - i * 0.022, 0.02));
    const hook = K.mesh(new T.TorusGeometry(0.03, 0.007, 6, 12, 4.4), M('#dfe2ea', { metal: 0.9, rough: 0.2 }), 0, -0.32, 0.02); p.armR.add(hook); p.muzzle = hook;
    p.scaleK = 0.98;
    return p;
  }
  // Feu follet d'ombre : petite flamme violette aux yeux jaunes
  function feuFollet() {
    const p = K.base(0.26);
    p.pose = auraPose; p.strike = 'burn'; p.hover = true; p.orbit = []; p.flames = [];
    K.ell(p.torso, '#3c1a66', 0.085, 0.085, 0.085, 0, 0.03, 0, { emissive: '#7a2bff' });
    for (const [x, z, r, h, c] of [[0, 0, 0.075, 0.26, '#7a2bff'], [-0.04, 0.02, 0.04, 0.17, '#c04bff'], [0.04, -0.01, 0.042, 0.19, '#c04bff'], [0, 0.04, 0.03, 0.12, '#ff6ad5']]) {
      const f = K.mesh(K.cone(r, 1, 10), glow(c), x, 0.07 + h * 0.4, z); f.scale.y = h; f.userData.h = h; p.torso.add(f); p.flames.push(f);
    }
    for (const s of [-1, 1]) {
      const e = K.mesh(K.sphere(0.017, 8, 6), glow('#ffe14d'), s * 0.03, 0.05, 0.078); e.scale.y = 1.4; p.torso.add(e);
    }
    p.muzzle = p.flames[0];
    p.scaleK = 1.05;
    return p;
  }

  const SET = { P: apprenti, N: nilo, B: zairen, R: vaskar, Q: soren, K: oro, p: feuFollet, n: krax, b: sentinelle, r: golmar, q: melyx, k: vorax };
  root.ThemeModels = root.ThemeModels || {};
  root.ThemeModels.auras = {
    build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return SET[piece](); },
  };
})(window);
