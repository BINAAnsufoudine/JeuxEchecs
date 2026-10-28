/* Ata Wawé — personnages 3D des thèmes Guerriers de l'Antiquité et Guerriers modernes.
   Les fantassins sont des soldats qui se battent comme les ninjas ; les autres pièces sont des cavaliers
   ou des machines de guerre (baliste, catapulte, tour de siège, char, hélicoptère, drone, tank, avion),
   qui roulent, volent ou planent selon leur nature. Blancs clairs, Noirs sombres.
   Les outils de base (matériaux, squelette, quadrupède) viennent de themes3d.js (ThemeKit). */
(function (root) {
  'use strict';
  let T = null, K = null;
  const M = (c, o) => K.mat(c, o);

  /* ---------- Poses ---------- */
  // Machine : pas de membres ; elle tangue un peu, ses rotors et ses roues tournent
  function machinePose(p, t, state) {
    const ph = t + p.phase;
    for (const k of ['armL', 'armR', 'legL', 'legR']) p[k].rotation.set(0, 0, 0);
    p.torso.rotation.x = 0; p.torso.rotation.z = Math.sin(ph * 1.7) * (p.fly ? 0.05 : 0.01);
    if (p.fly) p.torso.position.y += Math.sin(ph * 2.4) * 0.015;
    if (state === 'run') p.torso.rotation.x = p.fly ? 0.18 : 0.03;
    for (const r of p.rotors || []) r.rotation[r.userData.axis || 'y'] = t * (r.userData.speed || 30);
    for (const w of p.wheels || []) if (state === 'run') w.rotation.x = t * 12;
    if (p.arm) p.arm.rotation.x = state === 'cast' || state === 'punch' ? -1.4 : -0.2; // bras de catapulte
  }
  // Cavalier : la monture marche, le cavalier lève son arme en frappant
  function riderPose(p, t, state) {
    K.quadPose(p, t, state);
    if (p.rider) p.rider.rotation.x = state === 'punch' ? -0.9 : state === 'run' ? Math.sin(t * 14) * 0.08 : 0;
  }

  /* ---------- Gabarits ---------- */
  // fantassin : torse, tête, bras qui pendent des épaules, jambes jusqu'au sol
  function soldier(o) {
    const p = K.base(0.3);
    K.ell(p.torso, o.body, 0.075, 0.09, 0.055, 0, 0.065, 0);
    if (o.belt) p.torso.add(K.mesh(K.cyl(0.072, 0.072, 0.02, 14), M(o.belt), 0, 0.0, 0));
    if (o.skirt) p.torso.add(K.mesh(K.cone(0.09, 0.12, 14), M(o.skirt), 0, -0.04, 0));
    p.head.position.set(0, 0.2, 0);
    p.head.add(K.mesh(K.sphere(0.052, 16, 12), M(o.skin || '#e0b48c')));
    K.eyes(p.head, 0.02, 0.005, 0.045, 0.012, o.pupil || '#2b1a10');
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.09, 0.13, 0);
      K.stick(g, o.sleeve || o.body, 0.022, 0.02, [0, 0, 0], [0, -0.17, 0]);
      g.add(K.mesh(K.sphere(0.024, 8, 6), M(o.skin || '#e0b48c'), 0, -0.18, 0));
    }
    // jambes articulées (cuisse + genou + tibia) pour pouvoir s'agenouiller
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.04, -0.04, 0);
      K.stick(g, o.legs || o.body, 0.026, 0.024, [0, 0, 0], [0, -0.12, 0]);
      const knee = new T.Group(); knee.position.y = -0.12; g.add(knee); g.userData.knee = knee;
      knee.add(K.mesh(K.sphere(0.025, 8, 6), M(o.legs || o.body)));
      K.stick(knee, o.legs || o.body, 0.024, 0.022, [0, 0, 0], [0, -0.12, 0]);
      knee.add(K.mesh(K.box(0.045, 0.03, 0.07), M(o.boots || '#3b2a1c'), 0, -0.13, 0.012));
    }
    p.pose = soldierPose;
    return p;
  }
  // Fantassin : genoux pliés en marchant ; à genou, un genou au sol et l'autre pied posé devant
  function soldierPose(p, t, state, k) {
    const kl = p.legL.userData.knee, kr = p.legR.userData.knee;
    if (!kl) return;
    if (state === 'kneel') {
      const b = Math.max(0, Math.min(1, k));
      p.root.position.y = -0.14 * p.root.scale.y * b;
      p.legL.rotation.set(-1.45 * b, 0, 0); kl.rotation.x = 1.45 * b;  // jambe avant : pied à plat devant
      p.legR.rotation.set(0.15 * b, 0, 0); kr.rotation.x = 1.45 * b;   // jambe arrière : genou au sol
      p.torso.rotation.x = 0.12 * b;
      return;
    }
    // en marche, le genou plie quand la jambe repart vers l'arrière
    kl.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9;
    kr.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9;
  }
  // arme tenue dans la main droite (pointe vers l'avant quand le bras se lève)
  function inHand(p, obj) { obj.position.y -= 0.18; p.armR.add(obj); return obj; }
  function spear(color, len = 0.42) { const g = new T.Group(); g.add(K.mesh(K.cyl(0.007, 0.007, len, 6), M('#6d4c41'))); g.add(K.mesh(K.cone(0.016, 0.05, 6), M(color, { metal: 0.7, rough: 0.3 }), 0, len / 2 + 0.02, 0)); g.position.y = 0.1; return g; }
  function sword(color, len = 0.18) { const g = new T.Group(); g.add(K.mesh(K.box(0.02, len, 0.006), M(color, { metal: 0.8, rough: 0.25 }), 0, len / 2 + 0.03, 0)); g.add(K.mesh(K.box(0.06, 0.012, 0.012), M('#c9a227', { metal: 0.6 }), 0, 0.03, 0)); g.rotation.x = Math.PI / 2; g.position.z = 0.02; return g; }
  function axe(head, len = 0.22) { const g = new T.Group(); g.add(K.mesh(K.cyl(0.008, 0.008, len, 6), M('#5d4037'))); g.add(K.mesh(K.box(0.07, 0.05, 0.01), M(head, { metal: 0.7, rough: 0.35 }), 0.03, len / 2 - 0.02, 0)); g.rotation.x = Math.PI / 2; g.position.z = 0.04; return g; }
  function rifle(color) { const g = new T.Group(); g.add(K.mesh(K.box(0.025, 0.04, 0.2), M(color, { metal: 0.4, rough: 0.5 }))); const bar = K.mesh(K.cyl(0.006, 0.006, 0.1, 6), M('#222', { metal: 0.7 }), 0, 0.01, 0.14); bar.rotation.x = Math.PI / 2; g.add(bar); g.add(K.mesh(K.box(0.02, 0.05, 0.02), M('#222'), 0, -0.035, 0.02)); g.position.set(-0.02, 0.0, 0.07); return g; }
  // roue de chariot (axe le long de x)
  function wheel(parent, color, r, x, y, z, list) { const w = K.mesh(new T.TorusGeometry(r, r * 0.18, 6, 16), M(color)); w.rotation.y = Math.PI / 2; const hub = K.mesh(K.cyl(r * 0.25, r * 0.25, 0.02, 8), M(color)); hub.rotation.z = Math.PI / 2; const g = new T.Group(); g.position.set(x, y, z); g.add(w, hub); for (let i = 0; i < 4; i++) { const sp = K.mesh(K.box(0.006, r * 1.9, 0.006), M(color)); sp.rotation.x = i * Math.PI / 4; g.add(sp); } parent.add(g); if (list) list.push(g); return g; }
  // cheval (monture)
  function horse(color, mane) {
    const p = K.quad({ h: 0.3, color, w: 0.075, bh: 0.08, len: 0.17, leg: color, legR: 0.022, hoof: '#2a1f18', tail: true, tuft: mane, neckY: 0.15 });
    K.stick(p.torso, color, 0.04, 0.05, [0, 0.03, 0.12], [0, 0.15, 0.19]);
    p.head.position.set(0, 0.17, 0.2);
    const hd = K.ell(p.head, color, 0.035, 0.035, 0.07, 0, 0, 0.03); hd.rotation.x = 0.5;
    p.torso.add(K.mesh(K.box(0.014, 0.05, 0.13), M(mane), 0, 0.15, 0.13));
    for (const s of [-1, 1]) p.head.add(K.mesh(K.cone(0.012, 0.04, 6), M(color), s * 0.02, 0.045, -0.01));
    K.eyes(p.head, 0.03, 0.01, 0.01, 0.012, '#111', 0.9);
    return p;
  }
  // petit personnage assis (cavalier, conducteur), sans articulations
  function rider(parent, o, y, z) {
    const g = new T.Group(); g.position.set(0, y, z); parent.add(g);
    K.ell(g, o.body, 0.05, 0.065, 0.04, 0, 0.06, 0);
    g.add(K.mesh(K.sphere(0.04, 12, 10), M(o.skin || '#e0b48c'), 0, 0.15, 0));
    if (o.helmet) g.add(K.mesh(new T.SphereGeometry(0.044, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(o.helmet, { metal: 0.5, rough: 0.35 }), 0, 0.155, 0));
    if (o.crest) g.add(K.mesh(K.box(0.012, 0.035, 0.08), M(o.crest), 0, 0.2, 0));
    for (const s of [-1, 1]) K.stick(g, o.body, 0.016, 0.016, [s * 0.05, 0.09, 0], [s * 0.06, 0.03, 0.05]);
    return g;
  }

  /* ================= GUERRIERS DE L'ANTIQUITÉ ================= */
  const ANCIENT = {
    P() { // légionnaire : casque à crête, grand bouclier, glaive
      const p = soldier({ body: '#b71c1c', skirt: '#c62828', belt: '#c9a227', legs: '#e0b48c', sleeve: '#e0b48c', boots: '#6d4c41' });
      K.ell(p.torso, '#c9a227', 0.08, 0.06, 0.06, 0, 0.1, 0, { metal: 0.6, rough: 0.35 }); // cuirasse
      p.head.add(K.mesh(new T.SphereGeometry(0.058, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#c9a227', { metal: 0.7, rough: 0.3 })));
      p.head.add(K.mesh(K.box(0.014, 0.05, 0.11), M('#d32f2f'), 0, 0.07, 0));
      const shield = K.mesh(K.box(0.11, 0.16, 0.02), M('#b71c1c'), -0.02, -0.1, 0.05); shield.add(K.mesh(K.sphere(0.02, 8, 6), M('#c9a227', { metal: 0.7 }), 0, 0, 0.012)); p.armL.add(shield);
      inHand(p, sword('#cfd8dc'));
      p.scaleK = 1.05;
      return p;
    },
    N() { // cavalier antique à cheval, lance en main
      const p = horse('#f5f0e6', '#8d6e63');
      p.rider = rider(p.torso, { body: '#b71c1c', helmet: '#c9a227', crest: '#d32f2f' }, 0.06, -0.01);
      const s = spear('#cfd8dc', 0.36); s.rotation.x = 1.1; s.position.set(0.06, 0.1, 0.05); p.rider.add(s);
      p.pose = riderPose; p.scaleK = 1.15;
      return p;
    },
    B() { // baliste : grande arbalète sur roues
      const p = K.base(0.12); p.wheels = [];
      p.torso.add(K.mesh(K.box(0.18, 0.04, 0.3), M('#a1887f')));
      for (const x of [-0.11, 0.11]) for (const z of [-0.1, 0.1]) wheel(p.torso, '#6d4c41', 0.06, x, -0.04, z, p.wheels);
      p.head.position.set(0, 0.06, 0.02);
      p.head.add(K.mesh(K.box(0.04, 0.04, 0.32), M('#8d6e63')));
      const bow = K.mesh(new T.TorusGeometry(0.16, 0.012, 6, 20, Math.PI), M('#5d4037')); bow.rotation.x = -Math.PI / 2; bow.position.z = 0.12; p.head.add(bow);
      K.stick(p.head, '#eeeeee', 0.002, 0.002, [-0.16, 0, 0.12], [0, 0, -0.06]); K.stick(p.head, '#eeeeee', 0.002, 0.002, [0.16, 0, 0.12], [0, 0, -0.06]);
      const bolt = spear('#cfd8dc', 0.3); bolt.rotation.x = Math.PI / 2; bolt.position.set(0, 0.03, 0.05); p.head.add(bolt);
      p.muzzle = new T.Object3D(); p.muzzle.position.set(0, 0.03, 0.2); p.head.add(p.muzzle);
      p.pose = machinePose; p.scaleK = 1.15;
      return p;
    },
    R() { // tour de siège en bois, sur roues, pont-levis à l'avant
      const p = K.base(0.06); p.wheels = [];
      p.torso.add(K.mesh(K.box(0.24, 0.5, 0.24), M('#a1887f', { rough: 0.9 }), 0, 0.27, 0));
      for (let i = 0; i < 5; i++) p.torso.add(K.mesh(K.box(0.245, 0.012, 0.245), M('#6d4c41'), 0, 0.06 + i * 0.1, 0));
      for (let i = 0; i < 4; i++) for (const x of [-0.08, 0.08]) p.torso.add(K.mesh(K.box(0.05, 0.05, 0.05), M('#a1887f'), x + (i % 2) * 0, 0.545, -0.08 + (i % 2) * 0.16));
      const bridge = K.mesh(K.box(0.18, 0.2, 0.015), M('#8d6e63'), 0, 0.4, 0.125); bridge.rotation.x = -0.25; p.torso.add(bridge);
      p.head.position.set(0, 0.3, 0.125);
      for (const x of [-0.12, 0.12]) for (const z of [-0.09, 0.09]) wheel(p.torso, '#5d4037', 0.05, x * 1.05, 0.0, z, p.wheels);
      p.pose = machinePose; p.scaleK = 0.62;
      return p;
    },
    Q() { // char de guerre tiré par un cheval, la reine debout dans le char
      const p = horse('#f5f0e6', '#c9a227'); p.wheels = [];
      const cart = new T.Group(); cart.position.set(0, -0.04, -0.3); p.torso.add(cart);
      cart.add(K.mesh(K.box(0.18, 0.1, 0.12), M('#c9a227', { metal: 0.5, rough: 0.35 }), 0, 0.02, 0));
      for (const s of [-1, 1]) wheel(cart, '#6d4c41', 0.08, s * 0.11, -0.04, 0, p.wheels);
      K.stick(p.torso, '#6d4c41', 0.008, 0.008, [0, -0.02, -0.1], [0, -0.03, -0.24]);
      p.rider = rider(cart, { body: '#f5f5f5', helmet: null }, 0.04, 0);
      K.tiara(p.rider, 0.2, '#c9a227');
      p.pose = riderPose; p.scaleK = 1.0;
      return p;
    },
    K() { // empereur : toge, cape pourpre, couronne de laurier dorée et couronne royale
      const p = soldier({ body: '#f5f5f5', skirt: '#f5f5f5', belt: '#7b1fa2', legs: '#e0b48c', sleeve: '#f5f5f5', boots: '#8d6e63' });
      const cape = K.mesh(K.box(0.15, 0.3, 0.012), M('#6a1b9a'), 0, 0.0, -0.06); cape.rotation.x = 0.12; cape.userData.wind = 'cloak'; p.torso.add(cape);
      for (let i = 0; i < 8; i++) { const a = -1.4 + i * 0.4; p.head.add(K.mesh(K.sphere(0.012, 6, 4), M('#7cb342'), Math.sin(a) * 0.055, 0.03, Math.cos(a) * 0.055)); }
      K.crown(p.head, 0.07, '#f2c230', 0.75);
      const sc = spear('#f2c230', 0.3); sc.children[1].geometry = K.sphere(0.022, 8, 6); inHand(p, sc); // sceptre
      p.scaleK = 1.0;
      return p;
    },
    p() { // guerrier barbare : fourrure, casque à cornes, bouclier rond, hache
      const p = soldier({ body: '#5d4037', skirt: '#4e342e', belt: '#212121', legs: '#3e2723', sleeve: '#d7a77f', skin: '#d7a77f', boots: '#212121', pupil: '#5a0000' });
      K.ell(p.torso, '#8d6e63', 0.085, 0.04, 0.065, 0, 0.13, 0); // fourrure sur les épaules
      p.head.add(K.mesh(new T.SphereGeometry(0.058, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#455a64', { metal: 0.6, rough: 0.4 })));
      for (const s of [-1, 1]) { const h = K.mesh(K.cone(0.014, 0.07, 6), M('#efebe9'), s * 0.06, 0.04, 0); h.rotation.z = -s * 1.0; p.head.add(h); }
      p.head.add(K.mesh(K.box(0.08, 0.035, 0.02), M('#6d4c41'), 0, -0.04, 0.045)); // barbe
      const shield = K.mesh(K.cyl(0.075, 0.075, 0.015, 16), M('#4e342e'), -0.02, -0.1, 0.05); shield.rotation.x = Math.PI / 2; shield.add(K.mesh(K.sphere(0.018, 8, 6), M('#455a64', { metal: 0.7 }), 0, 0.01, 0)); p.armL.add(shield);
      inHand(p, axe('#90a4ae'));
      p.scaleK = 1.05;
      return p;
    },
    n() { // cavalier sombre sur un cheval noir
      const p = horse('#2b2b30', '#111');
      p.rider = rider(p.torso, { body: '#3e2723', helmet: '#455a64', crest: '#111' }, 0.06, -0.01);
      const a = axe('#90a4ae', 0.2); a.rotation.x = 0.4; a.position.set(0.07, 0.07, 0.04); p.rider.add(a);
      p.pose = riderPose; p.scaleK = 1.15;
      return p;
    },
    b() { // catapulte : bras qui se lève pour tirer
      const p = K.base(0.12); p.wheels = [];
      p.torso.add(K.mesh(K.box(0.2, 0.04, 0.3), M('#4e342e')));
      for (const x of [-0.12, 0.12]) for (const z of [-0.1, 0.1]) wheel(p.torso, '#3e2723', 0.06, x, -0.04, z, p.wheels);
      for (const x of [-0.07, 0.07]) { p.torso.add(K.mesh(K.box(0.02, 0.16, 0.02), M('#3e2723'), x, 0.08, 0.03)); }
      const axle = K.mesh(K.cyl(0.012, 0.012, 0.16, 6), M('#212121'), 0, 0.14, 0.03); axle.rotation.z = Math.PI / 2; p.torso.add(axle);
      p.arm = new T.Group(); p.arm.position.set(0, 0.14, 0.03); p.torso.add(p.arm);
      K.stick(p.arm, '#5d4037', 0.012, 0.014, [0, 0, 0.06], [0, 0, -0.2]);
      const cup = K.mesh(new T.SphereGeometry(0.04, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#3e2723', { double: true }), 0, 0.01, -0.21); p.arm.add(cup);
      p.arm.add(K.mesh(K.sphere(0.028, 8, 6), M('#757575'), 0, 0.03, -0.21));
      p.muzzle = new T.Object3D(); p.muzzle.position.set(0, 0.03, -0.21); p.arm.add(p.muzzle); // la pierre part du godet
      p.pose = machinePose; p.scaleK = 1.15;
      return p;
    },
    r() { // bélier couvert : toit de bois sur roues, gros tronc à tête de fer
      const p = K.base(0.08); p.wheels = [];
      const roof = new T.Group(); roof.position.y = 0.16; p.torso.add(roof);
      for (const s of [-1, 1]) { const pl = K.mesh(K.box(0.15, 0.012, 0.34), M('#3e2723', { rough: 0.9 }), s * 0.065, 0, 0); pl.rotation.z = s * -0.6; roof.add(pl); }
      for (const x of [-0.11, 0.11]) for (const z of [-0.13, 0.13]) p.torso.add(K.mesh(K.box(0.02, 0.18, 0.02), M('#4e342e'), x, 0.06, z));
      const log = K.mesh(K.cyl(0.035, 0.035, 0.4, 10), M('#5d4037'), 0, 0.03, 0.04); log.rotation.x = Math.PI / 2; p.head.add(log);
      const ram = K.mesh(K.sphere(0.045, 10, 8), M('#455a64', { metal: 0.7, rough: 0.35 }), 0, 0.03, 0.25); ram.scale.z = 0.7; p.head.add(ram);
      for (const x of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) wheel(p.torso, '#3e2723', 0.05, x, -0.03, z, p.wheels);
      p.pose = (q, t, st) => { machinePose(q, t, st); q.head.position.z = st === 'punch' ? Math.max(0, Math.sin(t * 9)) * 0.08 : 0; };
      p.scaleK = 0.9;
      return p;
    },
    q() { // éléphant de guerre : armure et tour sur le dos, diadème
      const p = K.quad({ h: 0.3, color: '#616161', w: 0.13, bh: 0.12, len: 0.18, leg: '#5a5a5a', legR: 0.045, hoof: '#424242', tail: true, tuft: '#333', neckY: 0.06 });
      K.ell(p.torso, '#4a148c', 0.135, 0.06, 0.15, 0, 0.04, 0, { double: true }); // caparaçon
      p.torso.add(K.mesh(K.box(0.14, 0.09, 0.12), M('#3e2723'), 0, 0.16, -0.02));
      for (const x of [-0.06, 0.06]) for (const z of [-0.07, 0.04]) p.torso.add(K.mesh(K.box(0.02, 0.04, 0.02), M('#3e2723'), x, 0.22, z));
      p.head.position.set(0, 0.08, 0.2);
      K.ell(p.head, '#616161', 0.09, 0.09, 0.08);
      for (const s of [-1, 1]) { const ear = K.ell(p.head, '#575757', 0.01, 0.08, 0.06, s * 0.1, 0, -0.03, { double: true }); ear.rotation.y = s * 0.5; }
      let prev = [0, -0.02, 0.07];
      for (let i = 1; i <= 4; i++) { const nx = [0, -0.02 - i * 0.045, 0.08 + i * 0.012]; K.stick(p.head, '#616161', 0.028 - i * 0.004, 0.032 - i * 0.004, prev, nx); prev = nx; }
      for (const s of [-1, 1]) { const tusk = K.mesh(K.cone(0.012, 0.11, 6), M('#90a4ae', { metal: 0.7, rough: 0.3 }), s * 0.045, -0.06, 0.1); tusk.rotation.x = 2.2; p.head.add(tusk); }
      p.head.add(K.mesh(K.box(0.1, 0.06, 0.012), M('#455a64', { metal: 0.6 }), 0, 0.04, 0.08)); // frontal
      K.eyes(p.head, 0.06, 0.02, 0.05, 0.014, '#b71c1c', 0.6);
      K.tiara(p.torso, 0.23, '#b9a6ff', -0.02);
      p.scaleK = 1.0;
      return p;
    },
    k() { // roi barbare : cape de fourrure, couronne de fer, grande épée
      const p = soldier({ body: '#37474f', skirt: '#263238', belt: '#c9a227', legs: '#3e2723', sleeve: '#37474f', skin: '#d7a77f', boots: '#212121', pupil: '#5a0000' });
      const cape = K.mesh(K.box(0.17, 0.32, 0.015), M('#212121'), 0, 0.0, -0.065); cape.rotation.x = 0.12; cape.userData.wind = 'cloak'; p.torso.add(cape);
      K.ell(p.torso, '#6d4c41', 0.095, 0.045, 0.07, 0, 0.13, 0);
      p.head.add(K.mesh(K.box(0.09, 0.05, 0.02), M('#4e342e'), 0, -0.04, 0.045));
      K.crown(p.head, 0.06, '#9e9e9e', 0.8);
      inHand(p, sword('#b0bec5', 0.26));
      p.scaleK = 1.05;
      return p;
    },
  };

  /* ================= GUERRIERS MODERNES ================= */
  const W = { body: '#b8a97e', dark: '#8a7d58', metal: '#9a9a86' }; // Blancs : tenue sable
  const B = { body: '#3d4247', dark: '#25292d', metal: '#4a5056' }; // Noirs : tenue gris sombre
  function trooper(c, isBlack) {
    const p = soldier({ body: c.body, belt: c.dark, legs: c.dark, sleeve: c.body, boots: '#1f1f1f', skin: isBlack ? '#c08a62' : '#e0b48c' });
    K.ell(p.torso, c.dark, 0.08, 0.075, 0.06, 0, 0.07, 0.005); // gilet
    for (let i = 0; i < 3; i++) p.torso.add(K.mesh(K.box(0.03, 0.035, 0.015), M(c.dark), -0.04 + i * 0.04, 0.03, 0.06));
    p.head.add(K.mesh(new T.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(c.body, { rough: 0.8 }), 0, 0.005, 0));
    p.head.add(K.mesh(K.cyl(0.066, 0.066, 0.008, 16), M(c.dark), 0, 0.005, 0));
    if (isBlack) p.head.add(K.mesh(K.box(0.08, 0.018, 0.02), M('#111', { metal: 0.6, rough: 0.2 }), 0, 0.012, 0.048)); // lunettes
    // le fusil est tenu à deux mains : contre la poitrine au repos, épaulé et pointé vers l'adversaire à l'attaque
    const gun = rifle('#2b2b2b'); gun.position.set(0, 0, 0); gun.rotation.order = 'ZXY';
    const flash = K.mesh(K.cone(0.02, 0.06, 8), M('#ffd54f', { emissive: '#ffb300', opacity: 0.9 }), 0, 0.01, 0.23); flash.rotation.x = Math.PI / 2; flash.visible = false; gun.add(flash);
    p.torso.add(gun); p.gun = gun; p.flash = flash;
    p.pose = rifleman;
    return p;
  }
  function rifleman(p, t, state, k) {
    soldierPose(p, t, state, k);
    const aim = state === 'punch' || state === 'cast' || state === 'guard' || state === 'throw';
    if (state === 'ko') { p.gun.visible = false; return; }
    p.gun.visible = true;
    if (aim) {
      // épaulé, canon horizontal vers l'avant ; recul et éclair à chaque tir
      const fire = state === 'punch' || state === 'cast' ? Math.max(0, Math.sin(t * 22)) : 0;
      p.gun.position.set(0.035, 0.125, 0.1 - fire * 0.025); p.gun.rotation.set(0, 0, 0);
      p.flash.visible = fire > 0.6; p.flash.scale.setScalar(0.8 + fire * 0.6);
      p.armR.rotation.set(-1.35, 0, -0.25); p.armL.rotation.set(-1.5, 0, 0.55);
      p.head.rotation.set(0.1, 0.1, 0);
    } else {
      // contre la poitrine, en diagonale
      p.gun.position.set(0, 0.075, 0.075); p.gun.rotation.set(-1.25, 0, 0.75);
      p.flash.visible = false;
      p.armR.rotation.set(-0.75, 0, -0.45); p.armL.rotation.set(-1.05, 0, 0.55);
      if (state === 'run') { p.armR.rotation.x -= 0.1; p.armL.rotation.x -= 0.1; }
    }
  }
  function helicopter(c, attack) {
    const p = K.base(0.32); p.fly = true; p.rotors = [];
    K.ell(p.torso, c.body, 0.08, 0.075, 0.15, 0, 0, 0.02, { rough: 0.5 });
    K.ell(p.torso, '#90caf9', 0.065, 0.05, 0.06, 0, 0.025, 0.11, { metal: 0.3, rough: 0.1, opacity: 0.85 });
    K.stick(p.torso, c.body, 0.02, 0.035, [0, 0.01, -0.1], [0, 0.04, -0.33]);
    p.torso.add(K.mesh(K.box(0.012, 0.08, 0.05), M(c.dark), 0, 0.07, -0.33));
    for (const s of [-1, 1]) K.stick(p.torso, c.dark, 0.006, 0.006, [s * 0.05, -0.07, 0.02], [s * 0.08, -0.11, 0.02]), p.torso.add(K.mesh(K.box(0.008, 0.008, 0.22), M(c.dark), s * 0.08, -0.115, 0.02));
    p.torso.add(K.mesh(K.cyl(0.012, 0.012, 0.05, 8), M(c.dark), 0, 0.09, 0.0));
    const rotor = new T.Group(); rotor.position.set(0, 0.115, 0); p.torso.add(rotor);
    for (let i = 0; i < 4; i++) { const bl = K.mesh(K.box(0.36, 0.004, 0.025), M('#222')); bl.rotation.y = i * Math.PI / 4 * 2; rotor.add(bl); }
    rotor.userData = { speed: 40 }; p.rotors.push(rotor);
    const tr = new T.Group(); tr.position.set(0.015, 0.05, -0.34); p.torso.add(tr);
    for (let i = 0; i < 2; i++) { const bl = K.mesh(K.box(0.004, 0.09, 0.012), M('#222')); bl.rotation.x = i * Math.PI / 2; tr.add(bl); }
    tr.userData = { speed: 55, axis: 'x' }; p.rotors.push(tr);
    if (attack) for (const s of [-1, 1]) { p.torso.add(K.mesh(K.box(0.12, 0.008, 0.03), M(c.dark), s * 0.08, -0.02, 0.0)); const pod = K.mesh(K.cyl(0.016, 0.016, 0.07, 8), M('#222'), s * 0.13, -0.035, 0.0); pod.rotation.x = Math.PI / 2; p.torso.add(pod); }
    p.head.position.set(0, 0.0, 0.17);
    p.muzzle = new T.Object3D(); p.muzzle.position.set(0, -0.04, 0.12); p.torso.add(p.muzzle);
    p.pose = machinePose; p.scaleK = 1.15;
    return p;
  }
  function drone(c, glow) {
    const p = K.base(0.3); p.fly = true; p.rotors = [];
    K.ell(p.torso, c.body, 0.06, 0.03, 0.08, 0, 0, 0, { rough: 0.4 });
    p.torso.add(K.mesh(K.sphere(0.022, 10, 8), M('#111', { metal: 0.6, rough: 0.15 }), 0, -0.025, 0.06));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      K.stick(p.torso, c.dark, 0.008, 0.008, [0, 0, 0], [x * 0.12, 0.01, z * 0.12]);
      p.torso.add(K.mesh(K.cyl(0.015, 0.015, 0.025, 8), M(c.dark), x * 0.12, 0.02, z * 0.12));
      const r = new T.Group(); r.position.set(x * 0.12, 0.036, z * 0.12); p.torso.add(r);
      for (let i = 0; i < 2; i++) { const bl = K.mesh(K.box(0.11, 0.003, 0.012), M('#222')); bl.rotation.y = i * Math.PI / 2; r.add(bl); }
      r.userData = { speed: 50 + (x + z) * 4 }; p.rotors.push(r);
    }
    p.torso.add(K.mesh(K.sphere(0.01, 6, 4), M(glow, { emissive: glow }), 0, 0.03, -0.07));
    p.head.position.set(0, 0, 0.08);
    p.muzzle = new T.Object3D(); p.muzzle.position.set(0, -0.025, 0.08); p.torso.add(p.muzzle); // caméra-laser sous le drone
    p.pose = machinePose; p.scaleK = 1.25;
    return p;
  }
  function tank(c) {
    const p = K.base(0.09); p.wheels = [];
    p.torso.add(K.mesh(K.box(0.22, 0.07, 0.32), M(c.body, { rough: 0.7 }), 0, 0.02, 0));
    for (const s of [-1, 1]) {
      p.torso.add(K.mesh(K.box(0.06, 0.08, 0.36), M('#2a2a2a', { rough: 0.9 }), s * 0.13, -0.02, 0));
      for (let i = 0; i < 5; i++) { const w = K.mesh(K.cyl(0.03, 0.03, 0.065, 10), M('#3a3a3a')); w.rotation.z = Math.PI / 2; const g = new T.Group(); g.position.set(s * 0.13, -0.03, -0.14 + i * 0.07); g.add(w); p.torso.add(g); p.wheels.push(g); }
    }
    p.head.position.set(0, 0.09, -0.01);
    K.ell(p.head, c.dark, 0.09, 0.04, 0.1, 0, 0, 0, { rough: 0.6 });
    const barrel = K.mesh(K.cyl(0.013, 0.016, 0.28, 10), M(c.dark, { metal: 0.4 }), 0, 0.005, 0.2); barrel.rotation.x = Math.PI / 2; p.head.add(barrel);
    p.muzzle = new T.Object3D(); p.muzzle.position.set(0, 0.005, 0.35); p.head.add(p.muzzle); // bout du canon
    p.head.add(K.mesh(K.cyl(0.03, 0.03, 0.02, 10), M(c.body), 0.03, 0.045, -0.03));
    p.pose = machinePose; p.scaleK = 1.3; // la tour (tank) est la plus grande pièce
    return p;
  }
  function jet(c, stealth) {
    const p = K.base(0.24); p.fly = true;
    K.ell(p.torso, c.body, 0.04, 0.035, 0.22, 0, 0, 0, { rough: 0.35, metal: 0.3 });
    const nose = K.mesh(K.cone(0.035, 0.1, 10), M(c.body, { rough: 0.35, metal: 0.3 }), 0, 0, 0.26); nose.rotation.x = Math.PI / 2; p.torso.add(nose);
    K.ell(p.torso, '#4fc3f7', 0.025, 0.025, 0.06, 0, 0.03, 0.1, { metal: 0.5, rough: 0.1, opacity: 0.85 });
    const wingShape = new T.Shape(); wingShape.moveTo(0, 0.08); wingShape.lineTo(stealth ? 0.22 : 0.2, -0.08); wingShape.lineTo(0, -0.1); wingShape.lineTo(0, 0.08);
    for (const s of [-1, 1]) {
      const wg = K.mesh(new T.ShapeGeometry(wingShape), M(c.dark, { double: true })); wg.rotation.x = -Math.PI / 2; wg.scale.x = s; wg.position.set(0, -0.005, -0.02); p.torso.add(wg);
      const tail = K.mesh(K.box(0.008, 0.07, 0.06), M(c.dark), s * 0.04, 0.04, -0.18); tail.rotation.z = s * (stealth ? 0.5 : 0.15); p.torso.add(tail);
      if (!stealth) { const m = K.mesh(K.cyl(0.008, 0.008, 0.1, 6), M('#eeeeee'), s * 0.14, -0.02, -0.02); m.rotation.x = Math.PI / 2; p.torso.add(m); }
    }
    const flame = K.mesh(K.cyl(0.03, 0.025, 0.03, 10), M('#ff7043', { emissive: '#ff7043', opacity: 0.85 }), 0, 0, -0.235); flame.rotation.x = Math.PI / 2; p.torso.add(flame);
    p.head.position.set(0, 0, 0.3);
    p.muzzle = new T.Object3D(); p.muzzle.position.set(0, 0, 0.32); p.torso.add(p.muzzle);
    p.pose = machinePose; p.scaleK = 1.05;
    return p;
  }
  // Avion de chasse à aile delta et plans canard (modèle demandé pour la dame) : nez pointu, verrière,
  // petites ailes avant, grande aile delta avec nacelles en bout d'aile, une seule dérive, deux tuyères
  function deltaJet(c) {
    const p = K.base(0.26); p.fly = true;
    const skin = M(c.body, { rough: 0.35, metal: 0.35 }), dark = M(c.dark, { rough: 0.4, metal: 0.3, double: true });
    const flat = (pts) => { const sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) sh.lineTo(q[0], q[1]); sh.lineTo(pts[0][0], pts[0][1]); return new T.ShapeGeometry(sh); };
    K.ell(p.torso, c.body, 0.034, 0.036, 0.24, 0, 0, -0.02, { rough: 0.35, metal: 0.35 }); // fuselage
    const nose = K.mesh(K.cone(0.032, 0.16, 12), skin, 0, -0.004, 0.29); nose.rotation.x = Math.PI / 2; p.torso.add(nose);
    const canopy = K.ell(p.torso, '#263238', 0.022, 0.024, 0.07, 0, 0.03, 0.15, { metal: 0.6, rough: 0.08 }); canopy.scale.set(0.022, 0.022, 0.07);
    p.torso.add(K.mesh(K.box(0.07, 0.03, 0.07), skin, 0, -0.02, 0.05)); // entrée d'air sous le fuselage
    for (const sd of [-1, 1]) {
      // grande aile delta (dessinée en x / -z) et nacelle en bout d'aile
      const wing = K.mesh(flat([[0, -0.07], [0.22, 0.13], [0.22, 0.16], [0, 0.17]]), skin); wing.rotation.x = -Math.PI / 2; wing.scale.x = sd; wing.position.y = -0.012; p.torso.add(wing);
      const pod = K.mesh(K.cyl(0.008, 0.008, 0.11, 6), M('#cfd8dc', { metal: 0.4 }), sd * 0.22, -0.012, -0.1); pod.rotation.x = Math.PI / 2; p.torso.add(pod);
      // plan canard près du cockpit
      const can = K.mesh(flat([[0, -0.2], [0.075, -0.15], [0.07, -0.135], [0, -0.15]]), skin); can.rotation.x = -Math.PI / 2; can.scale.x = sd; can.position.y = 0.0; p.torso.add(can);
      // missiles sous l'aile
      for (const k of [0.09, 0.15]) { const m = K.mesh(K.cyl(0.007, 0.007, 0.1, 6), M('#eceff1'), sd * k, -0.03, -0.04); m.rotation.x = Math.PI / 2; p.torso.add(m); }
      // tuyère
      const noz = K.mesh(K.cyl(0.016, 0.019, 0.04, 10), M('#455a64', { metal: 0.6 }), sd * 0.017, -0.004, -0.27); noz.rotation.x = Math.PI / 2; p.torso.add(noz);
      const fl = K.mesh(K.cone(0.014, 0.06, 8), M('#ff7043', { emissive: '#ff7043', opacity: 0.8 }), sd * 0.017, -0.004, -0.31); fl.rotation.x = -Math.PI / 2; p.torso.add(fl);
    }
    // dérive unique, en flèche
    const fin = K.mesh(flat([[0.06, 0.03], [0.17, 0.15], [0.21, 0.15], [0.22, 0.03]]), dark); fin.rotation.y = Math.PI / 2; p.torso.add(fin);
    p.head.position.set(0, 0, 0.32);
    p.muzzle = new T.Object3D(); p.muzzle.position.set(0, -0.03, 0.12); p.torso.add(p.muzzle);
    p.pose = machinePose; p.scaleK = 1.35;
    return p;
  }
  function general(c, isBlack) {
    const p = soldier({ body: c.body, belt: '#4e342e', legs: c.dark, sleeve: c.body, boots: '#111', skin: isBlack ? '#c08a62' : '#e0b48c' });
    for (let i = 0; i < 4; i++) p.torso.add(K.mesh(K.box(0.014, 0.01, 0.006), M(['#c62828', '#1565c0', '#f2c230', '#2e7d32'][i]), -0.045 + (i % 2) * 0.018, 0.1 - Math.floor(i / 2) * 0.014, 0.055));
    for (const s of [-1, 1]) p.torso.add(K.mesh(K.box(0.04, 0.008, 0.035), M('#f2c230', { metal: 0.6 }), s * 0.075, 0.15, 0));
    const cape = K.mesh(K.box(0.15, 0.28, 0.01), M(isBlack ? '#1a1a1a' : '#5d4f3a'), 0, 0.0, -0.06); cape.rotation.x = 0.1; cape.userData.wind = 'cloak'; p.torso.add(cape);
    p.head.add(K.mesh(K.cyl(0.06, 0.055, 0.035, 16), M(c.dark), 0, 0.045, 0));
    p.head.add(K.mesh(K.box(0.08, 0.008, 0.05), M('#111'), 0, 0.03, 0.05));
    p.head.add(K.mesh(K.sphere(0.012, 6, 4), M('#f2c230', { metal: 0.7, emissive: '#f2c230' }), 0, 0.05, 0.058));
    K.crown(p.head, 0.11, '#f2c230', 0.7);
    const baton = K.mesh(K.cyl(0.008, 0.008, 0.12, 6), M('#4e342e'), 0, -0.2, 0.03); baton.rotation.x = 1.2; p.armR.add(baton);
    return p;
  }
  const MODERN = {
    P() { const p = trooper(W, false); p.scaleK = 1.05; return p; },
    N() { return helicopter(W, false); },
    B() { return drone(W, '#4fc3f7'); },
    R() { return tank(W); },
    Q() { const p = deltaJet(W); K.crown(p.torso, 0.075, '#e9e4ff', 0.4, 0.08); return p; },
    K() { const p = general(W, false); p.scaleK = 1.0; return p; },
    p() { const p = trooper(B, true); p.scaleK = 1.05; return p; },
    n() { return helicopter(B, true); },
    b() { return drone(B, '#ff1744'); },
    r() { const p = tank(B); p.head.children[1].scale.set(1.2, 1.15, 1.2); return p; },
    q() { const p = deltaJet(B); K.crown(p.torso, 0.075, '#b9a6ff', 0.4, 0.08); return p; },
    k() { const p = general(B, true); p.scaleK = 1.0; return p; },
  };

  root.ThemeModels = root.ThemeModels || {};
  for (const [id, set] of Object.entries({ ancient: ANCIENT, modern: MODERN })) {
    root.ThemeModels[id] = {
      build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return (set[piece] || set[piece.toUpperCase()])(); },
    };
  }
})(window);
