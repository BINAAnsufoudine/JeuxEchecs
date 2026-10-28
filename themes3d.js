/* Ata Wawé — personnages 3D des thèmes Plantes, Animaux terrestres et Oiseaux tropicaux.
   Chaque modèle reprend les articulations des ninjas (torse, tête, bras, jambes) pour réutiliser
   toutes les animations ; un réglage de pose (p.pose) adapte ensuite le mouvement à la créature :
   les quadrupèdes marchent sur leurs quatre pattes, les plantes se balancent, les oiseaux battent des ailes.
   Toutes les créatures sont dans leur position naturelle. Blancs lumineux, Noirs sombres. */
(function (root) {
  'use strict';
  let T = null;
  const mats = new Map();
  function mat(color, o = {}) {
    const key = `${color}|${o.rough ?? 0.6}|${o.metal ?? 0.05}|${o.emissive || ''}|${o.opacity ?? 1}|${o.double ? 1 : 0}`;
    if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0.05,
      emissive: o.emissive || '#000000', emissiveIntensity: o.emissive ? 0.35 : 0,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, side: o.double ? T.DoubleSide : T.FrontSide,
    }));
    return mats.get(key);
  }
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; };
  const sphere = (r, w = 18, h = 12) => new T.SphereGeometry(r, w, h);
  const cone = (r, h, s = 10) => new T.ConeGeometry(r, h, s);
  const cyl = (r1, r2, h, s = 10) => new T.CylinderGeometry(r1, r2, h, s);
  const box = (x, y, z) => new T.BoxGeometry(x, y, z);
  // ellipsoïde coloré ajouté à un parent
  function ell(parent, color, sx, sy, sz, x = 0, y = 0, z = 0, o) {
    const m = mesh(sphere(1, 20, 14), mat(color, o), x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
  }
  // bâton (cylindre) orienté d'un point à un autre
  function stick(parent, color, r1, r2, a, b, o) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A);
    const m = mesh(cyl(r2, r1, d.length(), 8), mat(color, o));
    m.position.copy(A).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    parent.add(m); return m;
  }
  function base(y = 0.3) {
    const g = new T.Group();
    // les animations placent toujours le torse à 0,22 : un groupe intermédiaire règle la hauteur réelle
    const lift = new T.Group(); lift.position.y = y - 0.22; g.add(lift);
    const torso = new T.Group(); torso.position.y = 0.22; lift.add(torso);
    const head = new T.Group(); torso.add(head);
    const parts = { root: g, torso, head, weapon: 'brawl', noHeadScale: true };
    for (const k of ['armL', 'armR', 'legL', 'legR']) { const p = new T.Group(); torso.add(p); parts[k] = p; }
    return parts;
  }
  function eyes(head, x, y, z, r = 0.03, pupil = '#111', side = 0) {
    for (const s of [-1, 1]) {
      const g = new T.Group(); g.position.set(s * x, y, z); g.rotation.y = s * side; head.add(g);
      g.add(mesh(sphere(r, 12, 10), mat('#ffffff', { rough: 0.25 })));
      g.add(mesh(sphere(r * 0.55, 10, 8), mat(pupil, { rough: 0.2 }), 0, 0, r * 0.7));
      g.add(mesh(sphere(r * 0.18, 6, 4), mat('#ffffff', { emissive: '#ffffff' }), r * 0.2, r * 0.25, r * 0.95));
    }
  }
  function smile(head, y, z, w = 0.04, color = '#3a1d10') {
    const m = mesh(new T.TorusGeometry(w, w * 0.18, 6, 12, Math.PI), mat(color), 0, y, z); m.rotation.z = Math.PI; head.add(m); return m;
  }
  function crown(parent, y, color = '#f2c230', scale = 1, z = 0) {
    const c = new T.Group(); c.position.set(0, y, z); c.scale.setScalar(scale);
    c.add(mesh(cyl(0.09, 0.1, 0.05, 16), mat(color, { metal: 0.7, rough: 0.25 })));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.add(mesh(cone(0.025, 0.08, 6), mat(color, { metal: 0.7, rough: 0.25 }), Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08));
      c.add(mesh(sphere(0.014, 8, 6), mat(i % 2 ? '#e53b4f' : '#3fb6ff', { emissive: i % 2 ? '#e53b4f' : '#3fb6ff' }), Math.cos(a) * 0.08, 0.11, Math.sin(a) * 0.08));
    }
    parent.add(c); return c;
  }
  const tiara = (parent, y, color, z = 0) => crown(parent, y, color, 0.65, z);

  /* ---------- Poses propres à chaque famille ---------- */
  // Quadrupède : bras = pattes avant, jambes = pattes arrière ; on garde seulement les balancements avant/arrière
  function quadPose(p, t, state) {
    for (const k of ['armL', 'armR', 'legL', 'legR']) p[k].rotation.z = 0;
    if (state === 'run') {
      const g = t * 14 + p.phase;
      p.armL.rotation.x = Math.sin(g) * 0.6; p.armR.rotation.x = -Math.sin(g) * 0.6;
      p.legL.rotation.x = -Math.sin(g) * 0.6; p.legR.rotation.x = Math.sin(g) * 0.6;
    } else if (state === 'victory' || state === 'select') {
      p.armL.rotation.x = p.armR.rotation.x = -0.5; // se cabre un peu
      p.torso.rotation.x = -0.25;
    } else {
      // coup de patte avant seulement quand il frappe ; sinon les pattes restent sous le corps
      const lim = state === 'punch' ? 1.2 : 0.3;
      for (const k of ['armL', 'armR']) p[k].rotation.x = Math.max(-lim, Math.min(0.3, p[k].rotation.x));
      for (const k of ['legL', 'legR']) p[k].rotation.x = Math.max(-0.3, Math.min(0.3, p[k].rotation.x));
    }
  }
  // bipède trapu (gorille, suricate) : les bras ne se lèvent qu'en frappant
  function apePose(p, t, state) {
    if (state === 'punch' || state === 'victory') return;
    for (const k of ['armL', 'armR']) { p[k].rotation.x = Math.max(-0.4, Math.min(0.3, p[k].rotation.x)); p[k].rotation.z *= 0.3; }
  }
  // Plante : pas de jambes qui marchent, le tronc se balance doucement
  function plantPose(p, t, state) {
    const ph = t + p.phase;
    p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0);
    p.torso.rotation.z += Math.sin(ph * 1.3) * 0.05;
    if (state === 'run') p.torso.rotation.x = 0.2 + Math.sin(ph * 14) * 0.08;
  }
  // Oiseau : les ailes battent (bras), les pattes restent sous le corps
  function birdPose(p, t, state) {
    const ph = t + p.phase;
    for (const k of ['legL', 'legR']) p[k].rotation.set(Math.max(-0.4, Math.min(0.4, p[k].rotation.x)), 0, 0);
    if (state === 'run' || state === 'select' || state === 'victory') {
      const f = Math.sin(ph * 22) * 0.7;
      p.armL.rotation.set(0, 0, -0.4 - f); p.armR.rotation.set(0, 0, 0.4 + f);
    } else {
      // ailes repliées le long du corps, sauf quand il frappe
      const lim = state === 'punch' ? 1.4 : 0.25;
      for (const k of ['armL', 'armR']) { p[k].rotation.x = Math.max(-lim, Math.min(0.25, p[k].rotation.x)); p[k].rotation.z = Math.max(-0.3, Math.min(0.3, p[k].rotation.z)); }
    }
  }

  /* ---------- Gabarits ---------- */
  // quadrupède : corps allongé (avant = +z), quatre pattes posées au sol
  function quad(o) {
    o.h *= 0.82; // pattes plus courtes, corps plus près du sol
    const p = base(o.h);
    const body = ell(p.torso, o.color, o.w, o.bh, o.len, 0, 0, 0, o.mat);
    if (o.belly) ell(p.torso, o.belly, o.w * 0.85, o.bh * 0.7, o.len * 0.85, 0, -o.bh * 0.3, 0);
    const legY = -(o.h - 0.22) - 0.22 + 0.22; // pivot au niveau du torse
    const legLen = o.h - o.bh * 0.3;
    [[p.armL, -1, 1], [p.armR, 1, 1], [p.legL, -1, -1], [p.legR, 1, -1]].forEach(([g, sx, sz]) => {
      g.position.set(sx * o.w * 0.6, -o.bh * 0.3, sz * o.len * 0.6);
      stick(g, o.leg || o.color, o.legR || 0.03, (o.legR || 0.03) * 0.85, [0, 0, 0], [0, -legLen, 0]);
      if (o.hoof) g.add(mesh(cyl(0.032, 0.036, 0.03, 8), mat(o.hoof), 0, -legLen + 0.015, 0));
      else g.add(mesh(sphere((o.legR || 0.03) * 1.2, 8, 6), mat(o.leg || o.color), 0, -legLen, 0.01));
    });
    void legY;
    p.head.position.set(0, o.neckY ?? o.bh * 0.6, o.len * 0.95);
    if (o.tail) {
      const t = new T.Group(); t.position.set(0, o.bh * 0.3, -o.len); p.torso.add(t);
      stick(t, o.tailColor || o.color, 0.012, 0.008, [0, 0, 0], [0, -0.12, -0.08]);
      if (o.tuft) t.add(mesh(sphere(0.025, 8, 6), mat(o.tuft), 0, -0.13, -0.09));
      p.tail = t;
    }
    p.pose = quadPose;
    p.body = body;
    return p;
  }
  // oiseau perché : corps ovale incliné, tête, bec, ailes = bras, pattes = jambes
  function bird(o) {
    o.legLen = o.legLen ?? 0.08;
    o.h = o.h ?? o.legLen + o.bh * 0.6;
    const p = base(o.h);
    const body = ell(p.torso, o.color, o.w, o.bh, o.len, 0, 0, 0); body.rotation.x = o.tilt ?? -0.5;
    if (o.belly) { const b = ell(p.torso, o.belly, o.w * 0.8, o.bh * 0.8, o.len * 0.7, 0, -0.01, 0.04); b.rotation.x = o.tilt ?? -0.5; }
    p.head.position.set(0, o.bh * 0.9 + (o.neck || 0), o.len * 0.45);
    p.head.add(mesh(sphere(o.hr, 16, 12), mat(o.headColor || o.color)));
    const beak = mesh(cone(o.beakR || 0.025, o.beak || 0.08, 8), mat(o.beakColor || '#f2b134'), 0, -0.01, o.hr + (o.beak || 0.08) * 0.4);
    beak.rotation.x = Math.PI / 2 + (o.beakDown || 0); p.head.add(beak);
    eyes(p.head, o.hr * 0.6, o.hr * 0.25, o.hr * 0.6, o.hr * 0.32, o.pupil || '#111', 0.5);
    if (o.neck) stick(p.torso, o.neckColor || o.color, o.neckR || 0.03, (o.neckR || 0.03) * 0.8, [0, o.bh * 0.5, o.len * 0.4], [0, o.bh * 0.9 + o.neck, o.len * 0.45]);
    // ailes repliées le long du corps
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * o.w * 0.85, o.bh * 0.3, 0);
      const w = ell(g, o.wing || o.color, 0.02, o.bh * 0.75, o.len * 0.85, 0, -o.bh * 0.25, -0.02);
      w.rotation.x = (o.tilt ?? -0.5) + 0.15;
    }
    // queue
    const tail = ell(p.torso, o.tailColor || o.wing || o.color, o.w * 0.6, 0.015, o.tailLen || 0.12, 0, -o.bh * 0.2, -o.len - (o.tailLen || 0.12) * 0.6);
    tail.rotation.x = o.tailUp ?? 0.4;
    // pattes fines
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * o.w * 0.4, -o.bh * 0.6, 0.01);
      const L = o.legLen;
      stick(g, o.legColor || '#e0a33a', 0.008, 0.008, [0, 0, 0], [0, -L, 0]);
      for (const a of [-0.5, 0, 0.5]) stick(g, o.legColor || '#e0a33a', 0.006, 0.005, [0, -L, 0], [Math.sin(a) * 0.04, -L, Math.cos(a) * 0.04]);
    }
    p.pose = birdPose;
    return p;
  }
  // feuille plate (pour les plantes)
  function leaf(parent, color, len, wid, x, y, z, rx = 0, ry = 0, rz = 0) {
    const l = mesh(sphere(1, 14, 8), mat(color, { double: true }), x, y, z);
    l.scale.set(wid, 0.008, len); l.rotation.set(rx, ry, rz); parent.add(l); return l;
  }

  /* ================= PLANTES : le jardin enchanté ================= */
  const PLANTS = {
    P() { // pousse de riz souriante
      const p = base(0.05);
      p.torso.add(mesh(cyl(0.05, 0.07, 0.06, 12), mat('#7a5230'), 0, -0.02, 0)); // motte de terre
      stick(p.torso, '#8fd16b', 0.02, 0.025, [0, 0, 0], [0, 0.32, 0]);
      p.head.position.set(0, 0.34, 0);
      ell(p.head, '#b6e57d', 0.08, 0.08, 0.07);
      eyes(p.head, 0.03, 0.02, 0.06, 0.018); smile(p.head, -0.02, 0.065, 0.02);
      for (const s of [-1, 1]) { const g = s < 0 ? p.armL : p.armR; g.position.set(0, 0.18, 0); leaf(g, '#6cc04a', 0.04, 0.12, s * 0.1, 0.03, 0, 0, 0, s * -0.5); }
      for (let i = 0; i < 3; i++) leaf(p.head, '#f2d36b', 0.05, 0.015, (i - 1) * 0.025, 0.1, 0, 0.3, 0, (i - 1) * 0.4); // grains
      p.pose = plantPose; p.scaleK = 1.4;
      return p;
    },
    N() { // tournesol : grande fleur jaune qui suit le soleil, feuilles en bras
      const p = base(0.03);
      p.torso.add(mesh(cyl(0.06, 0.08, 0.05, 12), mat('#6d4c41'), 0, 0, 0)); // motte de terre
      stick(p.torso, '#689f38', 0.022, 0.03, [0, 0, 0], [0, 0.42, 0.03]);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(0, 0.2, 0); leaf(g, '#7cb342', 0.06, 0.13, s * 0.11, 0, 0.02, 0, 0, s * -0.5); }
      p.head.position.set(0, 0.46, 0.06);
      // pétales jaunes autour du cœur brun, face vers l'avant
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, pet = mesh(sphere(1, 10, 6), mat('#ffca28', { double: true }), Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.01); pet.scale.set(0.035, 0.065, 0.01); pet.rotation.z = a - Math.PI / 2; p.head.add(pet); }
      const heart = mesh(sphere(0.075, 16, 12), mat('#5d4037')); heart.scale.z = 0.45; p.head.add(heart);
      eyes(p.head, 0.03, 0.015, 0.035, 0.016); smile(p.head, -0.02, 0.036, 0.018);
      p.pose = plantPose; p.scaleK = 1.15;
      return p;
    },
    B() { // bambou : tige à nœuds, feuilles fines
      const p = base(0.05);
      for (let i = 0; i < 4; i++) { p.torso.add(mesh(cyl(0.045, 0.045, 0.13, 12), mat('#9ccc65'), 0, 0.06 + i * 0.14, 0)); p.torso.add(mesh(cyl(0.05, 0.05, 0.015, 12), mat('#7cb342'), 0, 0.13 + i * 0.14, 0)); }
      p.head.position.set(0, 0.45, 0.04);
      eyes(p.head, 0.02, 0, 0.01, 0.016); smile(p.head, -0.035, 0.012, 0.015);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(0, 0.35, 0); leaf(g, '#8bc34a', 0.035, 0.14, s * 0.13, 0.04, 0, 0, 0, s * -0.4); leaf(g, '#689f38', 0.03, 0.11, s * 0.1, -0.03, 0.03, 0, 0.4, s * -0.2); }
      for (let i = 0; i < 3; i++) leaf(p.torso, '#8bc34a', 0.03, 0.12, (i - 1) * 0.05, 0.62, 0, 0.6, i, (i - 1) * 0.6);
      p.pose = plantPose; p.scaleK = 1.05;
      return p;
    },
    R() { // baobab qui marche : tronc énorme, petites branches en couronne
      const p = base(0.06);
      p.torso.add(mesh(cyl(0.13, 0.18, 0.42, 14), mat('#a1887f', { rough: 0.9 }), 0, 0.17, 0));
      for (let i = 0; i < 6; i++) { const a = i * 1.05; stick(p.torso, '#8d6e63', 0.025, 0.035, [Math.cos(a) * 0.06, 0.36, Math.sin(a) * 0.06], [Math.cos(a) * 0.2, 0.5, Math.sin(a) * 0.2]); ell(p.torso, '#7cb342', 0.07, 0.04, 0.07, Math.cos(a) * 0.21, 0.52, Math.sin(a) * 0.21); }
      p.head.position.set(0, 0.24, 0.14);
      eyes(p.head, 0.05, 0.02, 0.01, 0.025); smile(p.head, -0.05, 0.02, 0.03);
      for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.08, -0.03, 0); stick(g, '#8d6e63', 0.04, 0.05, [0, 0, 0], [s * 0.04, -0.03, 0.08]); }
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.15, 0.25, 0); stick(g, '#8d6e63', 0.02, 0.03, [0, 0, 0], [s * 0.12, -0.08, 0.04]); }
      p.pose = plantPose; p.scaleK = 1.25; // la tour est la plus grande pièce du jardin
      return p;
    },
    Q() { // fleur de lotus géante posée sur sa feuille
      const p = base(0.03);
      const pad = mesh(cyl(0.22, 0.22, 0.015, 20), mat('#43a047')); p.torso.add(pad);
      stick(p.torso, '#66bb6a', 0.02, 0.025, [0, 0, 0], [0, 0.22, 0]);
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + ring * 0.45, pet = mesh(sphere(1, 12, 8), mat(ring ? '#f8bbd0' : '#f06292', { double: true }), Math.cos(a) * 0.08, 0.26 + ring * 0.03, Math.sin(a) * 0.08);
        pet.scale.set(0.045, 0.1, 0.02); pet.rotation.set(0, -a + Math.PI / 2, 0); pet.rotateX(-0.5 + ring * 0.25); p.torso.add(pet);
      }
      p.head.position.set(0, 0.3, 0.02);
      ell(p.head, '#fff59d', 0.06, 0.05, 0.06);
      eyes(p.head, 0.025, 0.015, 0.05, 0.015); smile(p.head, -0.015, 0.055, 0.015);
      tiara(p.head, 0.06, '#e9e4ff');
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(0, 0.15, 0); leaf(g, '#66bb6a', 0.05, 0.1, s * 0.09, 0, 0.02, 0, 0, s * -0.6); }
      p.pose = plantPose; p.scaleK = 1.15;
      return p;
    },
    K() { // grand manguier couronné
      const p = base(0.05);
      p.torso.add(mesh(cyl(0.06, 0.09, 0.32, 10), mat('#795548', { rough: 0.9 }), 0, 0.12, 0));
      ell(p.torso, '#2e7d32', 0.24, 0.18, 0.22, 0, 0.42, 0);
      for (let i = 0; i < 7; i++) { const a = i * 0.9; ell(p.torso, i % 2 ? '#ffb300' : '#ff8f00', 0.035, 0.045, 0.035, Math.cos(a) * 0.2, 0.36 + (i % 3) * 0.05, Math.sin(a) * 0.17); }
      p.head.position.set(0, 0.2, 0.08);
      eyes(p.head, 0.03, 0.02, 0.01, 0.022); smile(p.head, -0.03, 0.015, 0.025);
      crown(p.torso, 0.62);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.06, 0.2, 0); stick(g, '#6d4c41', 0.015, 0.025, [0, 0, 0], [s * 0.15, 0.05, 0.03]); leaf(g, '#43a047', 0.03, 0.07, s * 0.17, 0.06, 0.03); }
      p.pose = plantPose; p.scaleK = 1.0;
      return p;
    },
    p() { // ronce épineuse : boule de tiges sombres hérissées d'épines
      const p = base(0.05);
      ell(p.torso, '#4e342e', 0.11, 0.13, 0.1, 0, 0.13, 0);
      for (let i = 0; i < 14; i++) { const a = i * 2.4, e = (i % 5) / 5 * Math.PI - Math.PI / 2; const d = new T.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); const s = mesh(cone(0.012, 0.06, 5), mat('#bcaaa4'), d.x * 0.12, 0.13 + d.y * 0.13, d.z * 0.11); s.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); p.torso.add(s); }
      for (let i = 0; i < 3; i++) ell(p.torso, '#4a148c', 0.02, 0.02, 0.02, (i - 1) * 0.06, 0.24, 0.06); // mûres
      p.head.position.set(0, 0.15, 0.09);
      eyes(p.head, 0.035, 0.01, 0.01, 0.02, '#c62828');
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.09, 0.14, 0); stick(g, '#3e2723', 0.01, 0.015, [0, 0, 0], [s * 0.12, 0.03, 0.03]); }
      p.pose = plantPose; p.scaleK = 1.35;
      return p;
    },
    n() { // chardon épineux : tige hérissée, feuilles dentelées, fleur violette en pompon
      const p = base(0.03);
      stick(p.torso, '#4e6b3a', 0.02, 0.028, [0, 0, 0], [0, 0.36, 0]);
      for (let i = 0; i < 10; i++) { const y = 0.05 + i * 0.03, a = i * 2.2, sp = mesh(cone(0.006, 0.04, 4), mat('#c5e1a5'), Math.cos(a) * 0.025, y, Math.sin(a) * 0.025); sp.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); p.torso.add(sp); }
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
        g.position.set(0, 0.17, 0); leaf(g, '#33502a', 0.04, 0.13, s * 0.1, 0, 0.01, 0, 0, s * -0.35);
        for (let i = 0; i < 4; i++) { const sp = mesh(cone(0.006, 0.035, 4), mat('#c5e1a5'), s * (0.04 + i * 0.03), 0.012, 0.035); sp.rotation.x = -1.2; g.add(sp); }
      }
      p.head.position.set(0, 0.42, 0.01);
      const bulb = mesh(sphere(0.06, 14, 10), mat('#4e6b3a')); bulb.scale.y = 0.8; p.head.add(bulb);
      for (let i = 0; i < 12; i++) { const a = i * 0.9, sp = mesh(cone(0.007, 0.05, 4), mat('#2e3d24'), Math.cos(a) * 0.055, -0.01, Math.sin(a) * 0.055); sp.rotation.set(Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5); p.head.add(sp); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, f = mesh(cyl(0.004, 0.006, 0.07, 4), mat('#8e24aa'), Math.cos(a) * 0.03, 0.07, Math.sin(a) * 0.03); f.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); p.head.add(f); }
      eyes(p.head, 0.025, 0.0, 0.05, 0.015, '#c62828');
      p.pose = plantPose; p.scaleK = 1.15;
      return p;
    },
    b() { // cactus : grand cierge avec deux bras
      const p = base(0.05);
      p.torso.add(mesh(cyl(0.07, 0.075, 0.5, 12), mat('#2e5d32'), 0, 0.2, 0), mesh(sphere(0.07, 12, 8), mat('#2e5d32'), 0, 0.45, 0));
      for (let i = 0; i < 12; i++) p.torso.add(mesh(cone(0.006, 0.03, 4), mat('#f5f5dc'), Math.cos(i) * 0.075, 0.05 + (i % 6) * 0.07, Math.sin(i) * 0.075));
      p.torso.add(mesh(sphere(0.03, 8, 6), mat('#e91e63'), 0, 0.5, 0));
      p.head.position.set(0, 0.38, 0.07);
      eyes(p.head, 0.025, 0, 0, 0.018, '#b71c1c');
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.06, 0.22, 0); stick(g, '#2e5d32', 0.035, 0.035, [0, 0, 0], [s * 0.1, 0, 0]); stick(g, '#2e5d32', 0.035, 0.035, [s * 0.1, 0, 0], [s * 0.1, 0.12, 0]); }
      p.pose = plantPose; p.scaleK = 1.05;
      return p;
    },
    r() { // vieux saule noir : tronc tordu et longues branches tombantes
      const p = base(0.06);
      p.torso.add(mesh(cyl(0.1, 0.15, 0.36, 10), mat('#3e2f2a', { rough: 0.95 }), 0, 0.15, 0));
      ell(p.torso, '#33402c', 0.22, 0.12, 0.2, 0, 0.42, 0);
      for (let i = 0; i < 12; i++) { const a = i * 0.52; stick(p.torso, '#425536', 0.006, 0.006, [Math.cos(a) * 0.18, 0.4, Math.sin(a) * 0.16], [Math.cos(a) * 0.22, 0.12, Math.sin(a) * 0.2]); }
      p.head.position.set(0, 0.2, 0.11);
      eyes(p.head, 0.04, 0.02, 0, 0.022, '#ffb300');
      p.head.add(mesh(box(0.06, 0.012, 0.01), mat('#1a1210'), 0, -0.03, 0.01));
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.1, 0.25, 0); stick(g, '#3e2f2a', 0.015, 0.025, [0, 0, 0], [s * 0.14, -0.06, 0.03]); }
      for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.08, -0.02, 0); stick(g, '#3e2f2a', 0.03, 0.04, [0, 0, 0], [s * 0.06, -0.03, 0.06]); }
      p.pose = plantPose; p.scaleK = 1.25; // la tour est la plus grande pièce du jardin
      return p;
    },
    q() { // plante carnivore : grande mâchoire dentée sur une tige
      const p = base(0.03);
      for (let i = 0; i < 4; i++) leaf(p.torso, '#33691e', 0.06, 0.12, Math.cos(i * 1.57) * 0.1, 0.01, Math.sin(i * 1.57) * 0.1, 0, -i * 1.57, 0);
      stick(p.torso, '#558b2f', 0.02, 0.03, [0, 0, 0], [0, 0.28, 0.03]);
      p.head.position.set(0, 0.32, 0.04);
      for (const s of [-1, 1]) {
        const jaw = new T.Group(); jaw.rotation.x = s * 0.35; p.head.add(jaw);
        const lobe = mesh(new T.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7b1f2a', { double: true })); lobe.scale.set(1, 0.5, 1); lobe.rotation.x = s > 0 ? 0 : Math.PI; jaw.add(lobe);
        for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; const tooth = mesh(cone(0.007, 0.04, 4), mat('#f1f8e9'), Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); tooth.rotation.x = s > 0 ? 0 : Math.PI; jaw.add(tooth); }
      }
      eyes(p.head, 0.04, 0.06, 0.02, 0.018, '#ff3d00');
      tiara(p.head, 0.09, '#b9a6ff', -0.02);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(0, 0.14, 0); leaf(g, '#558b2f', 0.04, 0.1, s * 0.09, 0, 0.02, 0, 0, s * -0.5); }
      p.pose = plantPose; p.scaleK = 1.2;
      return p;
    },
    k() { // arbre mort couronné, couvert de lianes
      const p = base(0.05);
      p.torso.add(mesh(cyl(0.07, 0.11, 0.42, 9), mat('#4e4038', { rough: 0.95 }), 0, 0.17, 0));
      for (let i = 0; i < 5; i++) { const a = i * 1.25; const e = [Math.cos(a) * 0.2, 0.52 + (i % 2) * 0.06, Math.sin(a) * 0.18]; stick(p.torso, '#4e4038', 0.012, 0.03, [0, 0.36, 0], e); stick(p.torso, '#4e4038', 0.006, 0.012, e, [e[0] * 1.3, e[1] + 0.08, e[2] * 1.3]); }
      for (let i = 0; i < 6; i++) { const a = i * 1.05; stick(p.torso, '#2e7d32', 0.007, 0.007, [Math.cos(a) * 0.1, 0.4, Math.sin(a) * 0.1], [Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12]); }
      p.head.position.set(0, 0.22, 0.09);
      eyes(p.head, 0.035, 0.02, 0, 0.022, '#76ff03');
      crown(p.torso, 0.43, '#c9a227');
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.07, 0.24, 0); stick(g, '#4e4038', 0.012, 0.022, [0, 0, 0], [s * 0.15, 0.04, 0.03]); }
      p.pose = plantPose; p.scaleK = 1.0;
      return p;
    },
  };

  /* ================= ANIMAUX TERRESTRES : la savane ================= */
  // rayures : bandes sombres sur les flancs et le dos
  function stripes(parent, color, n, w, h, len, step) {
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const z = len * 0.7 - i * step, f = Math.sqrt(Math.max(0.1, 1 - (z / len) ** 2));
      const b = mesh(box(0.004, h * 1.5 * f, 0.016), mat(color), s * w * f * 0.98, 0.01, z); b.rotation.x = 0.25; parent.add(b);
    }
  }
  const LAND = {
    P() { // suricate dressé en sentinelle (sa position naturelle)
      const p = base(0.22), col = '#d7b98e';
      ell(p.torso, col, 0.06, 0.13, 0.055, 0, 0.02, 0);
      ell(p.torso, '#efdcbc', 0.04, 0.1, 0.03, 0, 0.0, 0.03);
      p.head.position.set(0, 0.17, 0.02);
      ell(p.head, col, 0.045, 0.045, 0.055);
      const snout = mesh(cone(0.025, 0.06, 8), mat(col), 0, -0.01, 0.06); snout.rotation.x = Math.PI / 2; p.head.add(snout);
      p.head.add(mesh(sphere(0.008, 6, 4), mat('#222'), 0, -0.01, 0.09));
      for (const s of [-1, 1]) ell(p.head, '#3e2c1c', 0.016, 0.018, 0.01, s * 0.028, 0.012, 0.035);
      eyes(p.head, 0.022, 0.012, 0.04, 0.013);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.045, 0.07, 0.04); stick(g, col, 0.012, 0.012, [0, 0, 0], [0, -0.06, 0.03]); }
      for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.04, -0.1, 0); stick(g, col, 0.018, 0.015, [0, 0, 0], [0, -0.1, 0.03]); }
      stick(p.torso, col, 0.015, 0.006, [0, -0.1, -0.04], [0, -0.21, -0.14]);
      p.pose = apePose; p.scaleK = 1.45;
      return p;
    },
    N() { // zèbre
      const p = quad({ h: 0.3, color: '#f5f5f5', w: 0.08, bh: 0.08, len: 0.17, leg: '#f5f5f5', legR: 0.022, hoof: '#222', tail: true, tuft: '#222', neckY: 0.15 });
      stripes(p.torso, '#222', 5, 0.08, 0.08, 0.17, 0.065);
      stick(p.torso, '#f5f5f5', 0.04, 0.05, [0, 0.03, 0.12], [0, 0.15, 0.19]);
      p.head.position.set(0, 0.17, 0.2);
      const hd = ell(p.head, '#f5f5f5', 0.035, 0.035, 0.07, 0, 0, 0.03); hd.rotation.x = 0.5;
      ell(p.head, '#333', 0.025, 0.025, 0.03, 0, -0.035, 0.09);
      for (let i = 0; i < 4; i++) p.head.add(mesh(box(0.072, 0.008, 0.01), mat('#222'), 0, 0.02 - i * 0.02, i * 0.015));
      p.torso.add(mesh(box(0.012, 0.04, 0.12), mat('#222'), 0, 0.15, 0.13)); // crinière
      for (const s of [-1, 1]) p.head.add(mesh(cone(0.012, 0.04, 6), mat('#f5f5f5'), s * 0.02, 0.045, -0.01));
      eyes(p.head, 0.03, 0.01, 0.01, 0.012, '#111', 0.9);
      p.scaleK = 1.25;
      return p;
    },
    B() { // girafe : très long cou
      const p = quad({ h: 0.3, color: '#f2c14e', w: 0.07, bh: 0.075, len: 0.14, leg: '#f2c14e', legR: 0.018, hoof: '#4e342e', tail: true, tuft: '#4e342e' });
      for (let i = 0; i < 8; i++) ell(p.torso, '#a0522d', 0.03, 0.025, 0.03, (i % 2 ? 1 : -1) * 0.055, 0.02 + (i % 3) * 0.02, -0.1 + i * 0.03);
      stick(p.torso, '#f2c14e', 0.025, 0.035, [0, 0.03, 0.1], [0, 0.34, 0.17]);
      for (let i = 0; i < 4; i++) p.torso.add(mesh(sphere(0.018, 6, 4), mat('#a0522d'), 0.02, 0.1 + i * 0.065, 0.12 + i * 0.013));
      p.head.position.set(0, 0.37, 0.19);
      const hd = ell(p.head, '#f2c14e', 0.03, 0.03, 0.06, 0, 0, 0.03); hd.rotation.x = 0.3;
      for (const s of [-1, 1]) { stick(p.head, '#f2c14e', 0.006, 0.006, [s * 0.015, 0.02, -0.01], [s * 0.018, 0.06, -0.015]); p.head.add(mesh(sphere(0.01, 6, 4), mat('#4e342e'), s * 0.018, 0.065, -0.015)); }
      eyes(p.head, 0.026, 0.01, 0.01, 0.011, '#111', 0.9);
      p.scaleK = 1.05;
      return p;
    },
    R() { // éléphant
      const p = quad({ h: 0.3, color: '#9e9e9e', w: 0.13, bh: 0.12, len: 0.18, leg: '#9e9e9e', legR: 0.045, hoof: '#757575', tail: true, tuft: '#555', neckY: 0.06 });
      p.head.position.set(0, 0.08, 0.2);
      ell(p.head, '#9e9e9e', 0.09, 0.09, 0.08);
      for (const s of [-1, 1]) { const ear = ell(p.head, '#8e8e8e', 0.01, 0.09, 0.07, s * 0.1, 0, -0.03, { double: true }); ear.rotation.y = s * 0.5; }
      let prev = [0, -0.02, 0.07];
      for (let i = 1; i <= 4; i++) { const nx = [0, -0.02 - i * 0.045, 0.08 + i * 0.012]; stick(p.head, '#9e9e9e', 0.028 - i * 0.004, 0.032 - i * 0.004, prev, nx); prev = nx; }
      for (const s of [-1, 1]) { const tusk = mesh(cone(0.012, 0.09, 6), mat('#fffde7'), s * 0.04, -0.06, 0.1); tusk.rotation.x = 2.2; p.head.add(tusk); }
      eyes(p.head, 0.06, 0.02, 0.05, 0.014, '#111', 0.6);
      p.scaleK = 1.0;
      return p;
    },
    Q() { // lionne
      const p = quad({ h: 0.24, color: '#d9a35b', w: 0.07, bh: 0.065, len: 0.18, leg: '#d9a35b', legR: 0.022, tail: true, tuft: '#6d4c2f', neckY: 0.06, belly: '#f0d3a3' });
      p.head.position.set(0, 0.08, 0.2);
      ell(p.head, '#d9a35b', 0.055, 0.05, 0.06);
      ell(p.head, '#f0d3a3', 0.032, 0.028, 0.03, 0, -0.02, 0.05);
      p.head.add(mesh(sphere(0.01, 6, 4), mat('#3e2723'), 0, -0.005, 0.08));
      for (const s of [-1, 1]) ell(p.head, '#c58b46', 0.015, 0.02, 0.008, s * 0.035, 0.045, -0.01);
      eyes(p.head, 0.024, 0.015, 0.045, 0.013, '#3b2a00', 0.4);
      tiara(p.head, 0.05, '#e9e4ff');
      p.scaleK = 1.3;
      return p;
    },
    K() { // lion à crinière dorée, couronné
      const p = quad({ h: 0.27, color: '#e0a84f', w: 0.085, bh: 0.075, len: 0.19, leg: '#e0a84f', legR: 0.026, tail: true, tuft: '#7a3e12', neckY: 0.08, belly: '#f2cf8e' });
      p.head.position.set(0, 0.1, 0.21);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ell(p.head, i % 2 ? '#b8641f' : '#d98e2f', 0.04, 0.04, 0.04, Math.cos(a) * 0.075, Math.sin(a) * 0.075, -0.02); }
      ell(p.head, '#e0a84f', 0.065, 0.06, 0.065, 0, 0, 0.02);
      ell(p.head, '#f2cf8e', 0.035, 0.03, 0.03, 0, -0.025, 0.07);
      p.head.add(mesh(sphere(0.012, 6, 4), mat('#3e2723'), 0, -0.008, 0.1));
      eyes(p.head, 0.03, 0.018, 0.06, 0.014, '#3b2a00', 0.4);
      crown(p.head, 0.09);
      p.scaleK = 1.2;
      return p;
    },
    p() { // hyène tachetée, dos en pente
      const p = quad({ h: 0.24, color: '#8d7b5a', w: 0.065, bh: 0.065, len: 0.15, leg: '#7a6a4c', legR: 0.02, tail: true, tuft: '#2e261b', neckY: 0.08 });
      p.body.rotation.x = 0.2;
      for (let i = 0; i < 8; i++) ell(p.torso, '#3b3125', 0.018, 0.015, 0.018, (i % 2 ? 1 : -1) * 0.055, 0.02 - (i % 3) * 0.015, -0.1 + i * 0.03);
      p.torso.add(mesh(box(0.012, 0.03, 0.14), mat('#2e261b'), 0, 0.075, 0.03));
      p.head.position.set(0, 0.09, 0.17);
      ell(p.head, '#7a6a4c', 0.045, 0.045, 0.06);
      ell(p.head, '#2e261b', 0.025, 0.022, 0.03, 0, -0.015, 0.06);
      for (const s of [-1, 1]) ell(p.head, '#7a6a4c', 0.02, 0.025, 0.008, s * 0.03, 0.045, -0.01);
      for (let i = 0; i < 4; i++) p.head.add(mesh(cone(0.005, 0.015, 4), mat('#fff'), -0.012 + i * 0.008, -0.04, 0.07));
      eyes(p.head, 0.022, 0.015, 0.04, 0.012, '#c62828', 0.4);
      p.scaleK = 1.35;
      return p;
    },
    n() { // gnou : cornes recourbées, barbe
      const p = quad({ h: 0.3, color: '#4a4f57', w: 0.08, bh: 0.085, len: 0.16, leg: '#3a3e45', legR: 0.022, hoof: '#111', tail: true, tuft: '#111', neckY: 0.1 });
      ell(p.torso, '#3a3e45', 0.07, 0.07, 0.06, 0, 0.06, 0.1); // garrot massif
      p.head.position.set(0, 0.1, 0.19);
      const hd = ell(p.head, '#3a3e45', 0.04, 0.045, 0.07, 0, -0.01, 0.03); hd.rotation.x = 0.6;
      p.head.add(mesh(cone(0.03, 0.06, 8), mat('#111'), 0, -0.07, 0.02));
      for (const s of [-1, 1]) { const h = mesh(new T.TorusGeometry(0.04, 0.01, 6, 10, Math.PI), mat('#d7ccc8')); h.position.set(s * 0.04, 0.04, -0.01); h.rotation.set(0, s * 0.3, s * 0.4); p.head.add(h); }
      eyes(p.head, 0.035, 0.01, 0.02, 0.013, '#ff7043', 0.9);
      p.scaleK = 1.2;
      return p;
    },
    b() { // serpent : enroulé sur lui-même, tête dressée (cobra)
      const p = base(0.05), col = '#3e5b2b';
      for (let i = 0; i < 16; i++) { const a = i * 0.75, r = 0.13 - i * 0.004; ell(p.torso, i % 3 ? col : '#c6b54a', 0.04, 0.035, 0.04, Math.cos(a) * r, i * 0.007, Math.sin(a) * r); }
      stick(p.torso, col, 0.03, 0.035, [0.05, 0.1, 0.02], [0, 0.32, 0.06]);
      const hood = ell(p.torso, col, 0.08, 0.1, 0.012, 0, 0.3, 0.05); hood.rotation.x = -0.15;
      ell(p.torso, '#c6b54a', 0.05, 0.07, 0.01, 0, 0.29, 0.063);
      p.head.position.set(0, 0.38, 0.08);
      ell(p.head, col, 0.04, 0.03, 0.05);
      const tongue = mesh(box(0.006, 0.002, 0.05), mat('#d32f2f'), 0, -0.01, 0.07); p.head.add(tongue);
      eyes(p.head, 0.025, 0.015, 0.03, 0.011, '#ffeb3b', 0.6);
      p.scaleK = 1.25;
      return p;
    },
    r() { // rhinocéros
      const p = quad({ h: 0.27, color: '#5d5f63', w: 0.12, bh: 0.11, len: 0.19, leg: '#505256', legR: 0.04, hoof: '#2f3033', tail: true, tuft: '#222', neckY: 0.03, mat: { rough: 0.85 } });
      p.head.position.set(0, 0.04, 0.22);
      const hd = ell(p.head, '#5d5f63', 0.06, 0.06, 0.09, 0, -0.01, 0.03); hd.rotation.x = 0.35;
      const horn = mesh(cone(0.025, 0.11, 8), mat('#d7ccc8'), 0, 0.03, 0.1); horn.rotation.x = -0.3; p.head.add(horn);
      p.head.add(mesh(cone(0.015, 0.05, 6), mat('#d7ccc8'), 0, 0.05, 0.04));
      for (const s of [-1, 1]) p.head.add(mesh(cone(0.015, 0.04, 6), mat('#5d5f63'), s * 0.035, 0.06, -0.04));
      eyes(p.head, 0.055, 0.01, 0.01, 0.011, '#ff5722', 1);
      p.scaleK = 1.05;
      return p;
    },
    q() { // panthère noire, couronnée d'un diadème
      const p = quad({ h: 0.24, color: '#1f1f24', w: 0.065, bh: 0.06, len: 0.19, leg: '#1f1f24', legR: 0.02, tail: true, tuft: '#1f1f24', neckY: 0.06, mat: { rough: 0.3 } });
      if (p.tail) p.tail.children[0].scale.y = 1.8;
      p.head.position.set(0, 0.08, 0.21);
      ell(p.head, '#1f1f24', 0.05, 0.045, 0.055, 0, 0, 0, { rough: 0.3 });
      ell(p.head, '#2a2a30', 0.028, 0.025, 0.025, 0, -0.02, 0.045);
      for (const s of [-1, 1]) p.head.add(mesh(cone(0.015, 0.03, 6), mat('#1f1f24'), s * 0.032, 0.045, -0.01));
      eyes(p.head, 0.024, 0.012, 0.04, 0.013, '#7cb342', 0.4);
      tiara(p.head, 0.055, '#b9a6ff');
      p.scaleK = 1.3;
      return p;
    },
    k() { // gorille noir couronné, appuyé sur ses poings
      const p = base(0.26), col = '#26262b';
      const body = ell(p.torso, col, 0.13, 0.13, 0.11, 0, 0.02, 0, { rough: 0.9 }); body.rotation.x = 0.35;
      ell(p.torso, '#4a4a52', 0.08, 0.08, 0.03, 0, 0.0, 0.08);
      p.head.position.set(0, 0.15, 0.08);
      ell(p.head, col, 0.065, 0.065, 0.06);
      ell(p.head, '#3a3a42', 0.045, 0.035, 0.03, 0, -0.025, 0.045);
      p.head.add(mesh(box(0.1, 0.02, 0.03), mat('#1a1a1e'), 0, 0.025, 0.045));
      eyes(p.head, 0.022, 0.008, 0.055, 0.012, '#5d4037');
      crown(p.head, 0.09, '#c9a227', 0.85);
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.13, 0.07, 0.05); stick(g, col, 0.035, 0.045, [0, 0, 0], [s * 0.04, -0.27, 0.06]); g.add(mesh(sphere(0.04, 10, 8), mat('#3a3a42'), s * 0.04, -0.29, 0.06)); }
      for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.07, -0.1, -0.03); stick(g, col, 0.035, 0.04, [0, 0, 0], [0, -0.14, 0.02]); }
      p.pose = apePose; p.scaleK = 1.0;
      return p;
    },
  };

  /* ================= OISEAUX TROPICAUX : le ciel des tropiques ================= */
  const BIRDS = {
    P() { // colibri posé au sol, ailes repliées (il ne vole qu'en se déplaçant)
      const p = bird({ color: '#26a69a', w: 0.035, bh: 0.035, len: 0.06, hr: 0.03, beak: 0.09, beakR: 0.006, beakColor: '#333', belly: '#e0f2f1', wing: '#80cbc4', tailLen: 0.05, legLen: 0.04, headColor: '#00897b' });
      p.scaleK = 1.6;
      return p;
    },
    N() { // perroquet perché
      const p = bird({ color: '#e53935', w: 0.06, bh: 0.075, len: 0.08, hr: 0.05, beak: 0.06, beakR: 0.025, beakDown: 0.5, beakColor: '#f5f5f5', wing: '#1e88e5', tailColor: '#fdd835', tailLen: 0.13, tailUp: 1.1, tilt: -0.9 });
      ell(p.head, '#ffffff', 0.025, 0.02, 0.01, 0, 0.0, 0.045); // joue blanche
      for (const [g] of [[p.armL], [p.armR]]) ell(g, '#fdd835', 0.021, 0.03, 0.03, 0, 0.0, 0.03);
      p.scaleK = 1.25;
      return p;
    },
    B() { // héron : longues pattes, long cou
      const p = bird({ h: 0.4, color: '#eceff1', w: 0.055, bh: 0.06, len: 0.11, hr: 0.035, beak: 0.13, beakR: 0.012, beakColor: '#ffb300', wing: '#b0bec5', neck: 0.14, neckR: 0.018, legLen: 0.3, legColor: '#795548', tilt: -0.2, tailLen: 0.07, tailUp: 0.1 });
      p.head.add(mesh(box(0.004, 0.004, 0.08), mat('#263238'), 0, 0.02, -0.06)); // plume de nuque
      p.scaleK = 1.1;
      return p;
    },
    R() { // calao à gros bec avec casque
      const p = bird({ color: '#212121', w: 0.08, bh: 0.09, len: 0.12, hr: 0.055, beak: 0.15, beakR: 0.035, beakDown: 0.3, beakColor: '#ffb300', belly: '#fafafa', wing: '#212121', tailLen: 0.16, tailUp: 0.6, tilt: -0.6 });
      const casque = ell(p.head, '#ff6f00', 0.025, 0.03, 0.06, 0, 0.05, 0.07); casque.rotation.x = 0.4;
      ell(p.head, '#fafafa', 0.03, 0.02, 0.01, 0, -0.03, 0.04);
      p.scaleK = 1.05;
      return p;
    },
    Q() { // paon qui fait la roue
      const p = bird({ color: '#1565c0', w: 0.06, bh: 0.07, len: 0.09, hr: 0.04, beak: 0.04, beakR: 0.012, beakColor: '#9e9e9e', wing: '#8d6e63', neck: 0.06, neckR: 0.025, neckColor: '#1565c0', tilt: -0.5, tailLen: 0.02 });
      for (let i = 0; i < 4; i++) p.head.add(mesh(sphere(0.008, 6, 4), mat('#00bfa5'), 0, 0.05 + i * 0.01, -0.01 - i * 0.008));
      tiara(p.head, 0.07, '#e9e4ff');
      // la roue : éventail de plumes ocellées derrière le corps
      const fan = new T.Group(); fan.position.set(0, 0.05, -0.1); p.torso.add(fan);
      for (let i = 0; i < 15; i++) {
        const a = -1.35 + (i / 14) * 2.7, f = new T.Group(); f.rotation.z = a; fan.add(f);
        ell(f, '#2e7d32', 0.025, 0.2, 0.006, 0, 0.18, 0, { double: true });
        ell(f, '#ffb300', 0.018, 0.02, 0.008, 0, 0.33, 0.002);
        ell(f, '#0d47a1', 0.01, 0.012, 0.01, 0, 0.33, 0.006);
      }
      fan.rotation.x = 0.25;
      p.fan = fan;
      p.scaleK = 1.2;
      return p;
    },
    K() { // aigle royal couronné
      const p = bird({ color: '#6d4c2f', w: 0.08, bh: 0.1, len: 0.11, hr: 0.055, beak: 0.06, beakR: 0.022, beakDown: 0.8, beakColor: '#ffc107', wing: '#5d4037', tailLen: 0.12, tailUp: 0.3, tilt: -0.9, headColor: '#f5f5f5', legColor: '#ffc107' });
      ell(p.head, '#f5f5f5', 0.05, 0.03, 0.04, 0, -0.035, -0.02); // collerette blanche
      crown(p.head, 0.07);
      p.scaleK = 1.15;
      return p;
    },
    p() { // moineau noir
      const p = bird({ color: '#2b2b30', w: 0.05, bh: 0.05, len: 0.07, hr: 0.038, beak: 0.04, beakR: 0.014, beakColor: '#ffb300', wing: '#1b1b1f', belly: '#4a4a52', tailLen: 0.08, tailUp: 0.6, tilt: -0.7, pupil: '#c62828' });
      p.scaleK = 1.7;
      return p;
    },
    n() { // corbeau
      const p = bird({ color: '#17171c', w: 0.065, bh: 0.075, len: 0.1, hr: 0.045, beak: 0.08, beakR: 0.02, beakDown: 0.2, beakColor: '#2c2c33', wing: '#101014', tailLen: 0.12, tailUp: 0.4, tilt: -0.55, legColor: '#2c2c33', pupil: '#c62828' });
      p.scaleK = 1.3;
      return p;
    },
    b() { // vautour : cou nu, collerette, dos voûté
      const p = bird({ color: '#3e3631', w: 0.08, bh: 0.09, len: 0.11, hr: 0.04, beak: 0.06, beakR: 0.02, beakDown: 0.9, beakColor: '#cfd8dc', wing: '#2e2824', neck: 0.08, neckR: 0.018, neckColor: '#e0a3a3', headColor: '#e0a3a3', tilt: -0.3, tailLen: 0.1, legColor: '#8d8d8d', pupil: '#b71c1c' });
      ell(p.torso, '#eeeeee', 0.06, 0.03, 0.05, 0, 0.08, 0.04); // collerette
      p.head.position.z -= 0.03; p.head.position.y -= 0.02;
      p.scaleK = 1.2;
      return p;
    },
    r() { // grand-duc : grosses plumes en aigrettes, grands yeux orange
      const p = bird({ color: '#5b4a3a', w: 0.1, bh: 0.12, len: 0.09, hr: 0.075, beak: 0.03, beakR: 0.014, beakDown: 1.0, beakColor: '#2e2a26', wing: '#4a3b2e', belly: '#8a7560', tailLen: 0.06, tilt: -1.2, pupil: '#111' });
      p.head.children.filter((c) => c.isGroup).forEach((g) => { g.scale.setScalar(1.3); g.children[0].material = mat('#ff9800'); });
      for (const s of [-1, 1]) { const tuft = mesh(cone(0.018, 0.07, 5), mat('#4a3b2e'), s * 0.045, 0.08, -0.01); tuft.rotation.z = -s * 0.35; p.head.add(tuft); }
      p.head.position.set(0, 0.13, 0.02);
      p.scaleK = 1.0;
      return p;
    },
    q() { // cygne noir, sur l'eau : cou en S
      const p = base(0.13), col = '#141418';
      const body = ell(p.torso, col, 0.08, 0.06, 0.13, 0, 0, -0.01, { rough: 0.35 }); body.rotation.x = 0.1;
      for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.06, 0.03, -0.02); const w = ell(g, '#1f1f26', 0.03, 0.035, 0.11, 0, 0, 0, { rough: 0.35 }); w.rotation.x = 0.35; ell(g, '#f5f5f5', 0.02, 0.012, 0.03, 0, -0.01, -0.1); }
      ell(p.torso, col, 0.04, 0.03, 0.05, 0, 0.04, -0.15).rotation.x = -0.6;
      let prev = [0, 0.03, 0.09];
      const pts = [[0, 0.12, 0.13], [0, 0.2, 0.1], [0, 0.27, 0.12]];
      for (const pt of pts) { stick(p.torso, col, 0.02, 0.022, prev, pt, { rough: 0.35 }); p.torso.add(mesh(sphere(0.021, 8, 6), mat(col, { rough: 0.35 }), ...pt)); prev = pt; }
      p.head.position.set(0, 0.29, 0.14);
      p.head.add(mesh(sphere(0.03, 12, 10), mat(col, { rough: 0.35 })));
      const beak = mesh(cone(0.014, 0.06, 8), mat('#d32f2f'), 0, -0.01, 0.05); beak.rotation.x = Math.PI / 2 + 0.3; p.head.add(beak);
      p.head.add(mesh(box(0.016, 0.006, 0.006), mat('#f5f5f5'), 0, -0.002, 0.066));
      eyes(p.head, 0.02, 0.008, 0.015, 0.009, '#d32f2f', 0.9);
      tiara(p.head, 0.035, '#b9a6ff');
      p.pose = birdPose;
      p.scaleK = 1.2;
      return p;
    },
    k() { // condor couronné : collerette blanche, crête
      const p = bird({ color: '#1b1b1f', w: 0.085, bh: 0.1, len: 0.12, hr: 0.045, beak: 0.06, beakR: 0.02, beakDown: 0.9, beakColor: '#e0e0e0', wing: '#121215', neck: 0.05, neckR: 0.02, neckColor: '#c98a7a', headColor: '#c98a7a', tilt: -0.6, tailLen: 0.11, legColor: '#9e9e9e', pupil: '#b71c1c' });
      ell(p.torso, '#f5f5f5', 0.07, 0.03, 0.06, 0, 0.1, 0.05);
      for (const [g] of [[p.armL], [p.armR]]) ell(g, '#e0e0e0', 0.021, 0.03, 0.05, 0, 0.02, -0.04);
      p.head.add(mesh(box(0.012, 0.03, 0.05), mat('#6d4c41'), 0, 0.045, 0.01));
      crown(p.head, 0.08, '#c9a227', 0.9);
      p.scaleK = 1.15;
      return p;
    },
  };

  // boîte à outils partagée avec les autres thèmes (warriors3d.js)
  root.ThemeKit = { use(THREE) { T = THREE; }, mat, mesh, sphere, cone, cyl, box, ell, stick, base, eyes, smile, crown, tiara, quad, quadPose, apePose };

  const THEMES = { plants: PLANTS, land: LAND, birds: BIRDS };
  root.ThemeModels = root.ThemeModels || {};
  for (const [id, B] of Object.entries(THEMES)) {
    root.ThemeModels[id] = {
      build(THREE, piece) { T = THREE; return (B[piece] || B[piece.toUpperCase()])(); },
    };
  }
})(window);
