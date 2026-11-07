/* Ata Wawé — personnages 3D du thème L'Empire des Baobabs (royaumes d'Afrique inventés, créations originales).
   Blancs : royaume de Zalimba, le Soleil d'or (or, crème, zigzags vert et rouge). Noirs : royaume de Kôrodu, le Bronze de la nuit
   (indigo, bronze, perles rouges, peintures blanches). Les modèles reprennent les articulations des ninjas ; p.stance donne
   la garde au repos, p.strike le coup au corps à corps. Les outils de base viennent de themes3d.js (ThemeKit). */
(function (root) {
  'use strict';
  let T = null, K = null;
  const M = (c, o) => K.mat(c, o);
  const METAL = { metal: 0.7, rough: 0.3 };
  const CLANS = {
    w: { skin: '#8a5a3c', top: '#f1ddb0', cloth: '#e3aa2c', pants: '#e9cf95', trim: '#d4a020', pat: '#1f6b4a', pat2: '#b8322a', dark: '#3a2414', metal: '#d9b25a', wood: '#8a5a2c', lion: '#c89448', mane: '#8a4a1c', ele: '#9a958f', shield: '#f3ead8', spot: '#6b3b1a', cape: '#b8322a' },
    b: { skin: '#5c3824', top: '#2c3770', cloth: '#2b3a7a', pants: '#3c2a55', trim: '#b0722e', pat: '#e6d7b4', pat2: '#c0392b', dark: '#120a06', metal: '#b5793a', wood: '#4a2e1a', lion: '#7a5a3a', mane: '#1a120c', ele: '#4f4a46', shield: '#3a2a22', spot: '#e6d7b4', cape: '#6b1f2a' },
  };

  /* ---------- Étoffes et blasons, dessinés une fois ---------- */
  const cloths = {}, crests = {};
  function clothMat(side, base) {
    const key = side + base;
    if (cloths[key]) return cloths[key];
    const c = CLANS[side], canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    g.lineWidth = 6; g.strokeStyle = c.pat;
    for (const y of [20, 84]) { g.beginPath(); for (let x = 0; x <= 128; x += 16) g[x ? 'lineTo' : 'moveTo'](x, y + (x % 32 ? 12 : 0)); g.stroke(); }
    g.fillStyle = c.pat2; for (const y of [52, 116]) g.fillRect(0, y, 128, 6);
    g.fillStyle = c.pat; for (let x = 8; x < 128; x += 24) g.fillRect(x, 60, 8, 8);
    const map = new T.CanvasTexture(canvas); map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(2, 1.4);
    cloths[key] = new T.MeshStandardMaterial({ map, roughness: 0.75, side: T.DoubleSide });
    return cloths[key];
  }
  function crestMat(side) {
    if (crests[side]) return crests[side];
    const c = CLANS[side], canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d'), m = 64;
    if (side === 'w') { // soleil à huit rayons
      g.fillStyle = c.trim; g.strokeStyle = c.trim; g.lineWidth = 9; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(m + Math.cos(a) * 34, m + Math.sin(a) * 34); g.lineTo(m + Math.cos(a) * 56, m + Math.sin(a) * 56); g.stroke(); }
      g.beginPath(); g.arc(m, m, 28, 0, 7); g.fill();
    } else { // tête de léopard
      g.fillStyle = c.metal; g.beginPath(); g.arc(m, m + 6, 38, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.beginPath(); g.arc(m + s * 30, m - 30, 15, 0, 7); g.fill(); }
      g.fillStyle = c.dark; for (const [x, y, r] of [[-15, -2, 6], [15, -2, 6], [0, 18, 7], [-26, 16, 3], [26, 16, 3], [-14, 30, 3], [14, 30, 3], [0, -22, 3]]) { g.beginPath(); g.arc(m + x, m + y, r, 0, 7); g.fill(); }
    }
    crests[side] = new T.MeshStandardMaterial({ map: new T.CanvasTexture(canvas), transparent: true, alphaTest: 0.35, roughness: 0.5, side: T.DoubleSide });
    return crests[side];
  }
  function crest(parent, side, size, x, y, z) { const m = new T.Mesh(new T.PlaneGeometry(size, size), crestMat(side)); m.position.set(x, y, z); parent.add(m); return m; }

  /* ---------- Armes (le long de z : le bras levé les tient droites) ---------- */
  function spear(c, len = 0.62) {
    const g = new T.Group();
    const shaft = K.mesh(K.cyl(0.0075, 0.0075, len, 7), M(c.wood)); shaft.rotation.x = Math.PI / 2; shaft.position.z = len * 0.2; g.add(shaft);
    const tip = K.mesh(K.cone(0.018, 0.09, 5), M('#d8dde2', { metal: 0.8, rough: 0.25 }), 0, 0, len * 0.7 + 0.04); tip.rotation.x = Math.PI / 2; tip.scale.z = 0.35; g.add(tip);
    const end = new T.Group(); end.position.set(0, 0, len * 0.7 + 0.09); g.add(end); g.userData.tip = end;
    return g;
  }
  function inHand(arm, w) { w.position.set(0, -0.19, 0.01); arm.add(w); return w; }
  function shield(parent, c, s = 1) {
    const g = new T.Group(); g.position.set(-0.012, -0.17, 0.05); g.rotation.y = -0.2; parent.add(g);
    const face = K.mesh(K.sphere(1, 16, 12), M(c.shield, { rough: 0.8 })); face.scale.set(0.08 * s, 0.135 * s, 0.018); g.add(face);
    for (const [x, y, r] of [[-0.03, 0.06, 0.013], [0.03, 0.03, 0.015], [-0.02, -0.02, 0.016], [0.03, -0.07, 0.013], [0, 0.1, 0.01], [-0.035, -0.08, 0.011]]) g.add(K.mesh(K.sphere(r, 8, 6), M(c.spot), x * s, y * s, 0.015));
    g.add(K.mesh(K.box(0.008, 0.25 * s, 0.006), M(c.dark), 0, 0, 0.02));
    return g;
  }

  /* ---------- Gabarit ---------- */
  function person(o) {
    const c = o.c, side = o.side, w = o.wide || 1, p = K.base(0.3);
    K.ell(p.torso, c.top, 0.084 * w, 0.1, 0.066 * w, 0, 0.075, 0);
    p.torso.add(K.mesh(K.cyl(0.08 * w, 0.082 * w, 0.02, 14), M(c.trim, METAL), 0, -0.012, 0));
    crest(p.torso, side, 0.07, 0, 0.1, 0.064 * w);
    if (o.robe) {
      const robe = new T.Mesh(new T.CylinderGeometry(0.083 * w, 0.17 * w, 0.31, 18, 1, true), clothMat(side, c.cloth));
      robe.position.y = -0.165; robe.userData.wind = 'skirt'; p.torso.add(robe);
    } else {
      const kilt = new T.Mesh(new T.CylinderGeometry(0.08, 0.115, 0.13, 14, 1, true), clothMat(side, c.cloth)); kilt.position.y = -0.075; kilt.userData.wind = 'skirt'; p.torso.add(kilt);
    }
    p.head.position.set(0, 0.215, 0);
    p.head.add(K.mesh(K.sphere(0.07, 16, 12), M(c.skin)));
    K.eyes(p.head, 0.027, 0.002, 0.058, 0.014, '#1a100a');
    if (o.paint) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const l = K.mesh(K.box(0.012, 0.004, 0.004), M(c.pat), s * 0.04, -0.012 - i * 0.012, 0.058); l.rotation.y = s * 0.5; p.head.add(l); }
    if (o.paint) p.head.add(K.mesh(K.box(0.005, 0.03, 0.004), M(c.pat), 0, 0.028, 0.066));
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.104 * w, 0.14, 0);
      K.stick(g, c.skin, 0.03, 0.026, [0, 0, 0], [0, -0.17, 0]);
      g.add(K.mesh(K.sphere(0.036, 8, 6), M(c.top)));
      g.add(K.mesh(K.cyl(0.03, 0.03, 0.014, 10), M(c.trim, METAL), 0, -0.13, 0));
      g.add(K.mesh(K.sphere(0.028, 8, 6), M(c.skin), 0, -0.185, 0));
    }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.05, -0.04, 0);
      K.stick(g, o.robe ? c.dark : c.skin, 0.036, 0.03, [0, 0, 0], [0, -0.12, 0]);
      const knee = new T.Group(); knee.position.y = -0.12; g.add(knee); g.userData.knee = knee;
      K.stick(knee, o.robe ? c.dark : c.skin, 0.03, 0.026, [0, 0, 0], [0, -0.12, 0]);
      knee.add(K.mesh(K.box(0.065, 0.024, 0.1), M(c.dark), 0, -0.13, 0.012));
    }
    p.pose = fighterPose; p.strike = o.strike || 'thrust'; p.stance = o.stance || null;
    return p;
  }
  function cape(p, c, h = 0.33) {
    const g = new T.Group(); g.position.set(0, 0.16, -0.07); g.userData.wind = 'cloak';
    g.add(K.mesh(new T.CylinderGeometry(0.075, 0.13, h, 14, 1, true, Math.PI / 2, Math.PI), M(c.cape, { double: true }), 0, -h / 2, 0.045));
    g.rotation.x = 0.12; p.torso.add(g);
  }
  function beads(p, c, y = 0.155, r = 0.052) {
    for (let i = 0; i < 11; i++) { const a = -0.3 + i / 10 * (Math.PI + 0.6); p.torso.add(K.mesh(K.sphere(0.0085, 6, 5), M(i % 2 ? c.trim : c.pat2), Math.cos(a) * r, y - Math.sin(a) * 0.02, Math.sin(a) * r * 0.9 + 0.02)); }
  }

  /* ---------- Poses ---------- */
  const STANCES = {
    sceptre(p) { p.armR.rotation.set(-1.45, 0, 0.3); },
    lance(p) { p.armR.rotation.set(-1.1, 0, 0.3); p.armL.rotation.set(-0.9, 0, -0.35); },
    baton(p) { p.armR.rotation.set(-1.2, 0, 0.25); p.armL.rotation.set(-0.5, 0, -0.3); },
  };
  function strikePose(p, k) {
    const hit = Math.floor(k), e = k - hit, s = Math.sin(Math.min(1, e) * Math.PI);
    if (p.strike === 'thrust') { p.armR.rotation.set(-1.5, 0, 0.1); p.root.position.z += 0.06 * s; p.torso.rotation.y = -0.4 * s; }
    else { p.armR.rotation.set(-2.5 + s * 1.5, 0, 0.25); p.torso.rotation.x = 0.25 * s; }
  }
  function kneelPose(p, k) {
    const kl = p.legL.userData.knee, kr = p.legR.userData.knee, b = Math.max(0, Math.min(1, k));
    if (!kl) return;
    p.root.position.y = -0.14 * p.root.scale.y * b;
    p.legL.rotation.set(-1.45 * b, 0, 0); kl.rotation.x = 1.45 * b;
    p.legR.rotation.set(0.15 * b, 0, 0); kr.rotation.x = 1.45 * b;
    p.torso.rotation.x = 0.12 * b;
  }
  function fighterPose(p, t, state, k) {
    if ((state === 'idle' || state === 'select') && p.stance) { STANCES[p.stance](p); if (state === 'select') p.root.position.y = 0; }
    else if (state === 'run') p.armR.rotation.set(-0.9, 0, 0.25);
    else if (state === 'punch') strikePose(p, k);
    else if (state === 'kneel') kneelPose(p, k);
    if (state !== 'kneel' && p.legL.userData.knee) {
      p.legL.userData.knee.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9;
      p.legR.userData.knee.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9;
    }
  }

  /* ---------- Rois et reines ---------- */
  function sceptre(c, top) {
    const g = new T.Group(), s = K.mesh(K.cyl(0.008, 0.009, 0.52, 7), M(c.metal, METAL)); s.rotation.x = Math.PI / 2; s.position.z = 0.1; g.add(s);
    const end = new T.Group(); end.position.z = 0.4; g.add(end); top(end); g.userData.tip = end;
    return g;
  }
  function mansa() {
    const c = CLANS.w, p = person({ c, side: 'w', robe: true, stance: 'sceptre', strike: 'staff' });
    cape(p, c); beads(p, c);
    // haute couronne perlée
    p.head.add(K.mesh(K.cyl(0.06, 0.072, 0.13, 14), M(c.metal, METAL), 0, 0.09, 0));
    for (const y of [0.05, 0.09, 0.13]) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 0.07 - (y - 0.05) * 0.14; p.head.add(K.mesh(K.sphere(0.006, 5, 4), M(i % 2 ? c.pat2 : c.pat), Math.cos(a) * r, y, Math.sin(a) * r)); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.head.add(K.mesh(K.cone(0.012, 0.04, 5), M(c.metal, METAL), Math.cos(a) * 0.052, 0.17, Math.sin(a) * 0.052)); }
    p.crown = p.head;
    const s = sceptre(c, (e) => { e.add(K.mesh(K.sphere(0.03, 12, 8), M(c.metal, Object.assign({ emissive: c.metal }, METAL)))); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = K.mesh(K.box(0.008, 0.03, 0.006), M(c.metal, METAL), Math.cos(a) * 0.046, Math.sin(a) * 0.046, 0); r.rotation.z = a - Math.PI / 2; e.add(r); } });
    inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.tip = s.userData.tip; p.muzzle = p.tip; p.scaleK = 1.04;
    return p;
  }
  function obade() {
    const c = CLANS.b, p = person({ c, side: 'b', robe: true, paint: true, stance: 'sceptre', strike: 'staff' });
    cape(p, c); beads(p, c);
    p.head.add(K.mesh(K.cyl(0.068, 0.074, 0.05, 14), M(c.metal, METAL), 0, 0.055, 0));
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, m = K.mesh(K.box(0.03, 0.05, 0.006), M(c.metal, METAL), Math.cos(a) * 0.066, 0.1, Math.sin(a) * 0.066); m.rotation.y = -a + Math.PI / 2; p.head.add(m); }
    const s = sceptre(c, (e) => { e.add(K.mesh(K.sphere(0.034, 12, 8), M(c.metal, METAL))); for (const k of [-1, 1]) { e.add(K.mesh(K.sphere(0.012, 6, 5), M(c.metal, METAL), k * 0.026, 0.03, -0.005)); e.add(K.mesh(K.sphere(0.006, 6, 5), M('#ffd27a', { emissive: '#ffd27a' }), k * 0.014, 0.008, 0.03)); } });
    inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.tip = s.userData.tip; p.muzzle = p.tip; p.scaleK = 1.06;
    return p;
  }
  function reine(side) {
    const c = CLANS[side], p = person({ c, side, robe: true, paint: side === 'b', stance: 'lance' });
    beads(p, c, 0.16, 0.05); beads(p, c, 0.145, 0.058);
    if (side === 'w') { // gélé haut et noué
      K.ell(p.head, c.cloth, 0.08, 0.06, 0.08, 0, 0.05, -0.005);
      for (const [y, s] of [[0.1, 0.07], [0.135, 0.058]]) { const b = K.ell(p.head, c.pat2, s, 0.03, s, 0, y, -0.015); b.rotation.z = 0.25; }
      const knot = K.ell(p.head, c.cloth, 0.03, 0.045, 0.02, 0.05, 0.13, 0); knot.rotation.z = -0.6;
    } else { // foulard indigo
      K.ell(p.head, c.cloth, 0.078, 0.05, 0.078, 0, 0.04, -0.01);
      p.head.add(K.mesh(K.cyl(0.0775, 0.0775, 0.012, 16), M(c.pat), 0, 0.03, 0));
      const tail = new T.Group(); tail.position.set(0, 0.02, -0.07); tail.userData.wind = 'tail'; p.head.add(tail);
      tail.add(K.mesh(K.box(0.03, 0.15, 0.006), M(c.cloth), 0, -0.075, -0.008));
    }
    const s = spear(c, 0.74); inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.spear = s; p.tip = s.userData.tip; p.muzzle = p.tip;
    shield(p.armL, c, 1.15);
    return p;
  }

  /* ---------- Éléphants de guerre ---------- */
  function elephantPose(p, t, state) {
    K.quadPose(p, t, state);
    p.torso.rotation.z = 0;
    p.trunk.rotation.x = (p.trunkUp != null ? p.trunkUp : 0.1 + Math.sin(t * 1.4 + p.phase) * 0.08);
    for (const e of p.ears) e.rotation.y = e.userData.s * (0.35 + Math.sin(t * 2 + p.phase) * 0.18);
  }
  function elephant(side) {
    const c = CLANS[side];
    const p = K.quad({ h: 0.34, color: c.ele, w: 0.13, bh: 0.125, len: 0.2, leg: c.ele, legR: 0.056, hoof: c.dark, neckY: 0.12 });
    K.ell(p.torso, c.ele, 0.128, 0.125, 0.11, 0, 0.012, 0.11);
    p.head.position.set(0, 0.09, 0.27);
    K.ell(p.head, c.ele, 0.09, 0.09, 0.085, 0, 0, 0);
    K.eyes(p.head, 0.078, 0.022, 0.03, 0.01, '#111', 1.2);
    p.ears = [];
    for (const s of [-1, 1]) { const e = new T.Group(); e.position.set(s * 0.075, 0.02, -0.02); e.userData.s = s; p.head.add(e); const m = K.ell(e, c.ele, 0.09, 0.1, 0.012, s * 0.08, 0, 0, { double: true }); m.scale.z = 0.012; p.ears.push(e); }
    // trompe : p.trunkUp la lève pour projeter la cible
    const trunk = new T.Group(); trunk.position.set(0, -0.02, 0.08); p.head.add(trunk); p.trunk = trunk;
    let y = 0, z = 0;
    for (let i = 0; i < 7; i++) { const r = 0.036 - i * 0.003; trunk.add(K.mesh(K.sphere(r, 8, 6), M(c.ele), 0, y, z)); y -= 0.038; z += 0.013 - i * 0.002; }
    const tipT = new T.Group(); tipT.position.set(0, y, z); trunk.add(tipT); p.trunkTip = tipT;
    for (const s of [-1, 1]) { const t = K.mesh(K.cone(0.016, 0.17, 7), M('#f4ecd8'), s * 0.05, -0.08, 0.11); t.rotation.x = 2.3; t.rotation.z = s * 0.12; p.head.add(t); }
    if (side === 'b') { // plaque de bronze au front
      const plate = K.mesh(K.box(0.075, 0.1, 0.012), M(c.metal, METAL), 0, 0.03, 0.08); plate.rotation.x = -0.2; p.head.add(plate);
      p.head.add(K.mesh(K.cone(0.012, 0.05, 5), M(c.metal, METAL), 0, 0.09, 0.08));
    } else { const band = K.mesh(new T.TorusGeometry(0.075, 0.009, 6, 16, Math.PI), M(c.metal, METAL), 0, 0.03, 0.04); band.rotation.x = -0.4; p.head.add(band); }
    // tapis à motifs, tour de bois et archer
    const rug = new T.Mesh(new T.CylinderGeometry(0.128, 0.135, 0.3, 16, 1, true, -1.2, 2.4), clothMat(side, c.cloth)); rug.rotation.x = Math.PI / 2; rug.rotation.z = 0; rug.position.set(0, 0.03, -0.01); p.torso.add(rug);
    const tour = new T.Group(); tour.position.set(0, 0.125, -0.02); p.torso.add(tour);
    tour.add(K.mesh(K.box(0.15, 0.1, 0.17), M(c.wood), 0, 0.05, 0));
    for (const [x, z] of [[-0.06, -0.07], [0.06, -0.07], [-0.06, 0.07], [0.06, 0.07], [0, 0.07], [0, -0.07]]) tour.add(K.mesh(K.box(0.03, 0.03, 0.03), M(c.wood), x, 0.115, z));
    crest(tour, side, 0.08, 0, 0.05, 0.087);
    tour.add(K.mesh(K.cyl(0.03, 0.04, 0.09, 8), M(c.top), 0, 0.14, 0));
    tour.add(K.mesh(K.sphere(0.03, 10, 8), M(c.skin), 0, 0.2, 0));
    tour.add(K.mesh(new T.TorusGeometry(0.06, 0.004, 5, 14, Math.PI), M(c.wood), 0.04, 0.17, 0.05));
    p.pose = elephantPose; p.scaleK = 1.05; p.muzzle = p.trunkTip;
    return p;
  }

  /* ---------- Griot et sorcier ---------- */
  function griot() {
    const c = CLANS.w, p = person({ c, side: 'w', robe: true, stance: 'baton', strike: 'staff' });
    K.ell(p.head, c.top, 0.074, 0.045, 0.074, 0, 0.045, 0); p.head.add(K.mesh(K.sphere(0.012, 6, 5), M(c.pat2), 0, 0.09, 0));
    K.ell(p.head, '#e8e4dc', 0.04, 0.05, 0.02, 0, -0.06, 0.05);
    const s = sceptre(c, (e) => { const d = K.mesh(K.cyl(0.05, 0.05, 0.01, 16), M(c.metal, METAL)); d.rotation.x = Math.PI / 2; e.add(d); });
    inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.tip = s.userData.tip; p.muzzle = p.tip;
    // djembé sur le flanc
    const drum = new T.Group(); drum.position.set(-0.09, -0.03, 0.09); p.torso.add(drum);
    drum.add(K.mesh(K.cyl(0.05, 0.03, 0.07, 12), M(c.wood), 0, 0.03, 0)); drum.add(K.mesh(K.cyl(0.03, 0.04, 0.05, 12), M(c.wood), 0, -0.03, 0));
    drum.add(K.mesh(K.cyl(0.052, 0.052, 0.006, 12), M(c.shield), 0, 0.066, 0));
    return p;
  }
  function sorcier() {
    const c = CLANS.b, p = person({ c, side: 'b', robe: true, stance: 'baton', strike: 'staff' });
    // grand masque de bois à plumes rouges
    const mask = K.ell(p.head, '#d8c7a0', 0.075, 0.1, 0.03, 0, 0, 0.06); mask.scale.z = 0.035;
    for (const s of [-1, 1]) p.head.add(K.mesh(K.box(0.04, 0.012, 0.006), M('#111'), s * 0.032, 0.012, 0.092));
    p.head.add(K.mesh(K.box(0.012, 0.05, 0.008), M(c.pat2), 0, -0.02, 0.094));
    p.head.add(K.mesh(K.box(0.04, 0.01, 0.006), M('#111'), 0, -0.06, 0.09));
    for (let i = 0; i < 7; i++) { const a = -1.1 + i * 0.37, f = K.mesh(K.cone(0.013, 0.1, 5), M(c.pat2), Math.sin(a) * 0.075, 0.075 + Math.cos(a) * 0.05, 0.05); f.rotation.z = -a; p.head.add(f); }
    const s = sceptre(c, (e) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; e.add(K.mesh(K.sphere(0.012, 6, 5), M('#f4ecd8'), Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0)); } });
    inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.tip = s.userData.tip; p.muzzle = p.tip;
    return p;
  }

  /* ---------- Guerriers montés sur des lions ---------- */
  function lionPose(p, t, state) {
    K.quadPose(p, t, state);
    p.torso.rotation.z = 0;
    if (state === 'punch') { p.armL.rotation.x = -1.5; p.armR.rotation.x = -0.4; p.torso.rotation.x = -0.25; }
    if (state === 'run') p.torso.rotation.x = Math.sin(t * 14) * 0.08;
    p.rider.rotation.x = state === 'punch' ? 0.2 : 0;
  }
  function lion(side) {
    const c = CLANS[side];
    const p = K.quad({ h: 0.3, color: c.lion, w: 0.08, bh: 0.09, len: 0.2, leg: c.lion, legR: 0.03, hoof: c.lion, neckY: 0.12 });
    K.ell(p.torso, c.lion, 0.082, 0.09, 0.09, 0, 0.005, 0.12);
    p.head.position.set(0, 0.12, 0.25);
    K.ell(p.head, c.mane, 0.1, 0.1, 0.075, 0, 0, -0.025);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; p.head.add(K.mesh(K.cone(0.03, 0.07, 5), M(c.mane), Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.04)); }
    K.ell(p.head, c.lion, 0.06, 0.058, 0.06, 0, 0, 0.04);
    K.ell(p.head, side === 'w' ? '#e6c48a' : '#9a7a58', 0.036, 0.028, 0.03, 0, -0.022, 0.088);
    p.head.add(K.mesh(K.sphere(0.011, 6, 5), M('#2a1a10'), 0, -0.012, 0.115));
    for (const s of [-1, 1]) p.head.add(K.mesh(K.sphere(0.018, 8, 6), M(c.lion), s * 0.05, 0.06, 0.01));
    K.eyes(p.head, 0.03, 0.016, 0.086, 0.01, '#111');
    const tail = new T.Group(); tail.position.set(0, 0.03, -0.2); tail.userData.wind = 'tail'; p.torso.add(tail);
    K.stick(tail, c.lion, 0.011, 0.009, [0, 0, 0], [0, -0.05, -0.15]); tail.add(K.mesh(K.sphere(0.026, 8, 6), M(c.mane), 0, -0.055, -0.16));
    const rug = new T.Mesh(new T.CylinderGeometry(0.086, 0.09, 0.15, 14, 1, true, -1.1, 2.2), clothMat(side, c.cloth)); rug.rotation.x = Math.PI / 2; rug.position.set(0, 0.012, -0.04); p.torso.add(rug);
    const rider = new T.Group(); rider.position.set(0, 0.1, -0.04); p.torso.add(rider); p.rider = rider;
    K.ell(rider, c.top, 0.055, 0.075, 0.044, 0, 0.075, 0);
    crest(rider, side, 0.045, 0, 0.09, 0.043);
    rider.add(K.mesh(K.cyl(0.05, 0.052, 0.012, 12), M(c.trim, METAL), 0, 0.012, 0));
    for (const s of [-1, 1]) {
      K.stick(rider, c.skin, 0.022, 0.018, [s * 0.04, 0.012, 0], [s * 0.1, -0.05, 0.03]);
      K.stick(rider, c.skin, 0.018, 0.015, [s * 0.1, -0.05, 0.03], [s * 0.1, -0.12, 0]);
      rider.add(K.mesh(K.box(0.028, 0.016, 0.055), M(c.dark), s * 0.1, -0.13, 0.012));
    }
    const head = new T.Group(); head.position.set(0, 0.17, 0); head.scale.setScalar(0.66); rider.add(head);
    head.add(K.mesh(K.sphere(0.07, 14, 10), M(c.skin))); K.eyes(head, 0.027, 0.002, 0.058, 0.014, '#1a100a');
    K.ell(head, c.cloth, 0.073, 0.04, 0.073, 0, 0.04, 0);
    head.add(K.mesh(K.cone(0.012, 0.09, 5), M(c.pat2), 0, 0.11, 0));
    if (side === 'b') for (const s of [-1, 1]) head.add(K.mesh(K.box(0.03, 0.006, 0.004), M(c.pat), s * 0.036, -0.016, 0.06));
    K.stick(rider, c.skin, 0.02, 0.017, [-0.054, 0.115, 0], [-0.03, 0.04, 0.07]);
    K.stick(rider, c.skin, 0.02, 0.017, [0.054, 0.115, 0], [0.075, 0.085, 0.06]);
    const s = spear(c, 0.72); s.position.set(0.075, 0.085, 0.06); rider.add(s); p.spear = s; p.tip = s.userData.tip; p.muzzle = p.tip;
    p.pose = lionPose; p.scaleK = 1.18;
    return p;
  }

  /* ---------- Soldats ---------- */
  function guerrier(side) {
    const c = CLANS[side], p = person({ c, side, paint: side === 'b', stance: 'lance' });
    if (side === 'w') p.head.add(K.mesh(K.cyl(0.072, 0.072, 0.016, 16), M(c.pat2), 0, 0.02, 0));
    K.ell(p.head, c.dark, 0.068, 0.04, 0.068, 0, 0.042, -0.006);
    if (side === 'b') for (const a of [-0.5, 0, 0.5]) p.head.add(K.mesh(K.cone(0.009, 0.05, 4), M(c.pat2), Math.sin(a) * 0.05, 0.09, -0.02));
    const s = spear(c, 0.56); inHand(p.armR, s); p.aimW = [{ o: s, f: 0 }]; p.spear = s; p.tip = s.userData.tip; p.muzzle = p.tip;
    shield(p.armL, c, 1);
    p.scaleK = 0.98;
    return p;
  }

  const SET = { K: mansa, k: obade, Q: () => reine('w'), q: () => reine('b'), R: () => elephant('w'), r: () => elephant('b'), B: griot, b: sorcier, N: () => lion('w'), n: () => lion('b'), P: () => guerrier('w'), p: () => guerrier('b') };
  root.ThemeModels = root.ThemeModels || {};
  root.ThemeModels.baobabs = { build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return SET[piece](); } };
})(window);
