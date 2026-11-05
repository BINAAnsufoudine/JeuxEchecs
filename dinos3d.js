/* Ata Wawé — personnages 3D du thème L'Âge des Géants (dinosaures, créations originales, pas d'humains).
   Blancs : la Vallée des Fougères (peau verte, ventre crème, rayures vert foncé, yeux dorés, feuilles et fleurs).
   Noirs : le Volcan Noir (peau charbon, ventre rouge brique, rayures de lave lumineuses, yeux rouges).
   Les modèles gardent les articulations habituelles : armL/armR sont les petits bras (ou les ailes, ou les pattes avant),
   legL/legR les pattes arrière. p.jaw s'ouvre pour mordre. Les outils de base viennent de themes3d.js (ThemeKit). */
(function (root) {
  'use strict';
  let T = null, K = null;
  const M = (c, o) => K.mat(c, o);
  const CLANS = {
    w: { skin: '#5f9e3f', dark: '#477f30', belly: '#efe3b8', mark: '#2e6b3f', eye: '#f0c419', line: '#22301c', claw: '#f4ecd8', crest: '#3f8f4a', extra: '#f2a7c3', glow: false, sail: '#9fce7c' },
    b: { skin: '#3a3034', dark: '#2a2226', belly: '#7a3a2a', mark: '#ff6a1a', eye: '#ff3b1a', line: '#b8a8a8', claw: '#d9d0c8', crest: '#1a1418', extra: '#ff8a2a', glow: true, sail: '#7a2418' },
  };
  const markMat = (c) => M(c.mark, c.glow ? { emissive: c.mark } : undefined);
  function eyes(head, c, x, y, z, r = 0.014) { for (const s of [-1, 1]) { head.add(K.mesh(K.sphere(r, 8, 6), M(c.eye, { emissive: c.eye }), s * x, y, z)); head.add(K.mesh(K.sphere(r * 0.45, 6, 4), M('#111'), s * (x + r * 0.55), y, z + r * 0.45)); } }
  function stripes(body, c, list) { for (const [x, y, z, rot, l] of list) { const m = K.mesh(K.box(0.012, l, 0.02), markMat(c), x, y, z); m.rotation.z = rot; body.add(m); } }
  function tail(p, c, n, r, step, y = 0.03, z = -0.15) {
    const g = new T.Group(); g.position.set(0, y, z); p.torso.add(g); p.tail = g;
    for (let i = 0; i < n; i++) { const k = 1 - i / n, m = K.mesh(K.sphere(r * k + 0.008, 9, 7), M(c.skin), 0, -i * 0.006, -i * step); g.add(m); if (i % 2 === 0) g.add(K.mesh(K.cone(0.012 * k + 0.004, 0.04 * k + 0.01, 4), markMat(c), 0, r * k + 0.012, -i * step)); }
    return g;
  }
  // Tête de saurien : crâne, mâchoire mobile, dents
  function head(p, c, o) {
    const s = o.s || 1, h = p.head; h.position.set(0, o.y, o.z);
    K.ell(h, c.skin, 0.058 * s, 0.05 * s, 0.09 * s, 0, 0.012 * s, 0.05 * s);
    K.ell(h, c.dark, 0.044 * s, 0.03 * s, 0.05 * s, 0, 0.02 * s, 0.1 * s);
    const jaw = new T.Group(); jaw.position.set(0, -0.022 * s, 0.0); h.add(jaw); p.jaw = jaw;
    K.ell(jaw, c.belly, 0.045 * s, 0.016 * s, 0.085 * s, 0, -0.008 * s, 0.075 * s);
    for (let i = 0; i < 5; i++) for (const k of [-1, 1]) { const f = K.mesh(K.cone(0.0065 * s, 0.022 * s, 4), M('#f4ecd8'), k * 0.032 * s, -0.0, (0.05 + i * 0.022) * s); f.rotation.x = Math.PI; h.add(f); }
    eyes(h, c, 0.042 * s, 0.03 * s, 0.05 * s, 0.013 * s);
    const mouth = new T.Group(); mouth.position.set(0, 0, 0.15 * s); h.add(mouth); p.tip = mouth; p.muzzle = mouth;
  }
  function biped(o) {
    const c = o.c, p = K.base(o.h || 0.34), w = o.wide || 1;
    const body = K.ell(p.torso, c.skin, 0.085 * w, 0.09 * w, 0.17, 0, 0.02, 0); body.rotation.x = -0.15;
    K.ell(p.torso, c.belly, 0.06 * w, 0.06 * w, 0.14, 0, -0.03, 0.02);
    K.stick(p.torso, c.skin, 0.06 * w, 0.042, [0, 0.03, 0.12], [0, o.neckY || 0.14, o.neckZ || 0.2]);
    stripes(p.torso, c, [[0.07, 0.05, 0.05, 0.3, 0.06], [-0.07, 0.05, 0.05, -0.3, 0.06], [0.075, 0.04, -0.05, 0.25, 0.06], [-0.075, 0.04, -0.05, -0.25, 0.06], [0.06, 0.05, -0.12, 0.3, 0.05], [-0.06, 0.05, -0.12, -0.3, 0.05]]);
    tail(p, c, o.tail || 9, 0.052 * w, 0.042);
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.078 * w, -0.03, -0.03);
      K.ell(g, c.skin, 0.042, 0.07, 0.06, 0, -0.04, 0);
      const knee = new T.Group(); knee.position.set(0, -0.1, 0); g.add(knee); g.userData.knee = knee;
      K.stick(knee, c.dark, 0.03, 0.023, [0, 0, 0], [0, -0.13, -0.02]);
      knee.add(K.mesh(K.box(0.056, 0.022, 0.1), M(c.dark), 0, -0.135, 0.02));
      for (const x of [-0.018, 0, 0.018]) { const cl = K.mesh(K.cone(0.008, 0.03, 4), M(c.claw), x, -0.14, 0.08); cl.rotation.x = 1.57; knee.add(cl); }
    }
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.07 * w, 0.0, 0.12);
      K.stick(g, c.skin, 0.014, 0.011, [0, 0, 0], [0, -0.06, 0.03]);
      for (const a of [-0.3, 0.3]) { const cl = K.mesh(K.cone(0.005, 0.018, 4), M(c.claw), a * 0.02, -0.07, 0.04); g.add(cl); }
    }
    p.pose = dinoPose;
    return p;
  }
  function dinoPose(p, t, state, k) {
    const ph = t + p.phase;
    p.torso.rotation.z = 0;
    for (const a of [p.armL, p.armR]) a.rotation.z = 0;
    if (p.jaw) p.jaw.rotation.x = 0.06 + Math.max(0, Math.sin(ph * 0.8) - 0.8) * 2;
    if (p.tail) p.tail.rotation.y = Math.sin(ph * 1.6) * 0.22;
    if (p.head) p.head.rotation.z = 0;
    if (state === 'run') {
      const s = Math.sin(t * 16);
      p.legL.rotation.x = s * 0.75; p.legR.rotation.x = -s * 0.75; p.armL.rotation.x = p.armR.rotation.x = 0.4;
      p.torso.rotation.x = 0.1; if (p.tail) p.tail.rotation.y = Math.sin(t * 16) * 0.3;
    } else if (state === 'punch') {
      const e = k - Math.floor(k), s = Math.sin(Math.min(1, e) * Math.PI);
      if (p.jaw) p.jaw.rotation.x = 0.1 + (1 - s) * 0.75;
      p.torso.rotation.x = 0.3 * s; p.head.rotation.x = 0.35 * s; p.root.position.z += 0.06 * s;
      p.legL.rotation.x = -0.3 * s; p.armL.rotation.x = p.armR.rotation.x = -0.9 * s;
    } else if (state === 'cast') {
      if (p.jaw) p.jaw.rotation.x = 0.7; p.head.rotation.x = -0.25; p.torso.rotation.x = -0.15; p.legL.rotation.x = p.legR.rotation.x = 0; p.armL.rotation.x = p.armR.rotation.x = -0.4;
    } else if (state === 'guard' || state === 'panic') {
      if (p.jaw) p.jaw.rotation.x = 0.5; p.torso.rotation.x = -0.1; p.armL.rotation.x = p.armR.rotation.x = -0.6; p.legL.rotation.x = p.legR.rotation.x = 0;
      if (state === 'panic') p.head.rotation.y = Math.sin(t * 9) * 0.3;
    } else if (state === 'ko') {
      if (p.jaw) p.jaw.rotation.x = 0.6; p.armL.rotation.x = p.armR.rotation.x = 0.8; p.legL.rotation.x = 0.5; p.legR.rotation.x = -0.4; p.head.rotation.x = 0.3;
    } else if (state === 'victory') {
      if (p.jaw) p.jaw.rotation.x = 0.8; p.head.rotation.x = -0.5; p.torso.rotation.x = -0.25; p.legL.rotation.x = p.legR.rotation.x = 0; p.armL.rotation.x = p.armR.rotation.x = -0.5;
    } else if (state === 'kneel') {
      const b = Math.max(0, Math.min(1, k)); p.root.position.y = -0.08 * p.root.scale.y * b; p.torso.rotation.x = 0.3 * b; p.head.rotation.x = 0.4 * b;
      p.legL.rotation.x = p.legR.rotation.x = -0.6 * b; p.armL.rotation.x = p.armR.rotation.x = 0;
    } else { p.legL.rotation.x = p.legR.rotation.x = 0; p.armL.rotation.x = p.armR.rotation.x = 0.1; }
    if (p.legL.userData.knee && state !== 'kneel') { p.legL.userData.knee.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9; p.legR.userData.knee.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9; }
    if (p.fly) { // ailes : bras étendus qui battent
      const flap = Math.sin(t * (state === 'run' ? 16 : 3.5) + p.phase) * (state === 'run' ? 0.45 : 0.14);
      p.armL.rotation.set(0, 0, flap); p.armR.rotation.set(0, 0, -flap);
      p.torso.position.y += 0.22 + Math.sin(ph * 2) * 0.025; p.torso.rotation.x = state === 'run' ? 0.35 : 0.12;
    }
  }

  /* ---------- Rois : tyrannosaures ---------- */
  function rex(side) {
    const c = CLANS[side], p = biped({ c, h: 0.37, wide: 1.1, neckY: 0.15, neckZ: 0.2, tail: 10 });
    head(p, c, { y: 0.16, z: 0.2, s: 1.35 });
    const crown = new T.Group(); crown.position.set(0, 0.085, 0.02); p.head.add(crown); p.crest = crown;
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4;
      if (side === 'w') { const f = K.mesh(K.cone(0.022, 0.07, 4), M(c.crest), Math.sin(a) * 0.05, 0.02, Math.cos(a) * 0.04 - 0.02); f.scale.z = 0.3; f.rotation.y = a; crown.add(f); }
      else { const f = K.mesh(new T.OctahedronGeometry(0.018, 0), M(c.crest, { metal: 0.6, rough: 0.2 }), Math.sin(a) * 0.05, 0.028, Math.cos(a) * 0.04 - 0.02); f.scale.y = 2.2; crown.add(f); }
    }
    crown.add(K.mesh(K.sphere(0.014, 8, 6), M(side === 'w' ? c.extra : c.mark, side === 'w' ? undefined : { emissive: c.mark }), 0, 0.03, 0.03));
    p.scaleK = 1.05;
    return p;
  }
  /* ---------- Dames : spinosaures à grande voile ---------- */
  function spino(side) {
    const c = CLANS[side], p = biped({ c, h: 0.34, neckY: 0.13, neckZ: 0.21, tail: 10 });
    head(p, c, { y: 0.14, z: 0.21, s: 1 }); K.ell(p.head, c.skin, 0.03, 0.03, 0.07, 0, 0.015, 0.15);
    const pts = [0.06, 0.1, 0.13, 0.15, 0.14, 0.11, 0.07];
    const sail = new T.Group(); sail.position.set(0, 0.09, 0); p.torso.add(sail); p.sail = sail;
    pts.forEach((h, i) => { const z = 0.14 - i * 0.05, m = K.mesh(K.box(0.008, h * 1.5, 0.05), M(c.sail), 0, h * 0.75, z); sail.add(m); sail.add(K.mesh(K.box(0.01, h * 1.5, 0.006), markMat(c), 0, h * 0.75, z + 0.024)); });
    if (side === 'w') for (const [z, y] of [[0.1, 0.15], [-0.02, 0.24], [-0.1, 0.19]]) { sail.add(K.mesh(K.sphere(0.016, 8, 6), M(c.extra), 0.008, y, z)); sail.add(K.mesh(K.sphere(0.007, 6, 4), M('#ffe14d'), 0.02, y, z)); }
    p.scaleK = 1.02;
    return p;
  }
  /* ---------- Tours : tricératops ---------- */
  function triceratops(side) {
    const c = CLANS[side];
    const p = K.quad({ h: 0.3, color: c.skin, w: 0.12, bh: 0.115, len: 0.2, leg: c.dark, legR: 0.05, hoof: c.dark, neckY: 0.06 });
    K.ell(p.torso, c.belly, 0.09, 0.07, 0.17, 0, -0.06, 0);
    stripes(p.torso, c, [[0.1, 0.05, 0.08, 0.5, 0.08], [-0.1, 0.05, 0.08, -0.5, 0.08], [0.11, 0.05, -0.04, 0.5, 0.08], [-0.11, 0.05, -0.04, -0.5, 0.08], [0.09, 0.05, -0.15, 0.5, 0.07], [-0.09, 0.05, -0.15, -0.5, 0.07]]);
    tail(p, c, 7, 0.05, 0.035, 0.02, -0.18);
    p.head.position.set(0, 0.05, 0.26);
    K.ell(p.head, c.skin, 0.07, 0.07, 0.1, 0, 0, 0.04);
    K.ell(p.head, c.belly, 0.04, 0.03, 0.05, 0, -0.03, 0.12);
    const beak = K.mesh(K.cone(0.03, 0.05, 6), M(c.dark), 0, -0.03, 0.16); beak.rotation.x = 1.9; p.head.add(beak);
    const frill = new T.Mesh(new T.CircleGeometry(0.15, 22), M(c.sail, { double: true })); frill.position.set(0, 0.07, -0.02); frill.rotation.x = -0.45; p.head.add(frill);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; frill.add(K.mesh(K.sphere(0.013, 6, 5), markMat(c), Math.cos(a) * 0.145, Math.sin(a) * 0.145, 0.003)); frill.add(K.mesh(K.sphere(0.015, 6, 5), markMat(c), Math.cos(a + 0.3) * 0.085, Math.sin(a + 0.3) * 0.085, 0.003)); }
    for (const s of [-1, 1]) { const h = K.mesh(K.cone(0.02, 0.17, 7), M(c.claw), s * 0.05, 0.08, 0.1); h.rotation.x = 0.9; h.rotation.z = -s * 0.15; p.head.add(h); }
    const nose = K.mesh(K.cone(0.016, 0.08, 6), M(c.claw), 0, 0.03, 0.15); nose.rotation.x = 0.7; p.head.add(nose);
    eyes(p.head, c, 0.06, 0.03, 0.06, 0.012);
    p.pose = (x, t, state) => { K.quadPose(x, t, state); x.torso.rotation.z = 0; if (x.tail) x.tail.rotation.y = Math.sin(t * 1.6 + x.phase) * 0.2; if (state === 'punch') { x.armL.rotation.x = x.armR.rotation.x = 0; x.head.rotation.x = 0.4; } };
    const m = new T.Group(); m.position.set(0, 0.03, 0.2); p.head.add(m); p.muzzle = m; p.tip = m;
    p.scaleK = 0.88;
    return p;
  }
  /* ---------- Fous : ptéranodons ---------- */
  function pteranodon(side) {
    const c = CLANS[side], p = K.base(0.3);
    K.ell(p.torso, c.skin, 0.05, 0.05, 0.12, 0, 0.02, 0);
    K.ell(p.torso, c.belly, 0.034, 0.034, 0.09, 0, -0.012, 0.01);
    K.stick(p.torso, c.skin, 0.03, 0.022, [0, 0.03, 0.09], [0, 0.07, 0.15]);
    p.head.position.set(0, 0.075, 0.17);
    K.ell(p.head, c.skin, 0.026, 0.03, 0.05, 0, 0, 0);
    const beak = K.mesh(K.cone(0.018, 0.16, 6), M(side === 'w' ? '#d9b25a' : c.dark), 0, -0.004, 0.11); beak.rotation.x = 1.57; beak.scale.x = 0.7; p.head.add(beak);
    const crestM = K.mesh(K.cone(0.018, 0.14, 4), side === 'w' ? M(c.crest) : markMat(c), 0, 0.022, -0.08); crestM.rotation.x = -1.8; crestM.scale.x = 0.25; p.head.add(crestM);
    eyes(p.head, c, 0.022, 0.012, 0.022, 0.009);
    const wing = side === 'w' ? '#6ea05a' : '#7a2418';
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.04, 0.03, 0.03);
      const shape = new T.Shape(); shape.moveTo(0, 0.06); shape.lineTo(s * 0.34, 0.02); shape.quadraticCurveTo(s * 0.14, -0.04, 0, -0.13); shape.closePath();
      const geo = new T.ShapeGeometry(shape); const m = new T.Mesh(geo, M(wing, { double: true })); m.rotation.x = Math.PI / 2; g.add(m);
      K.stick(g, c.dark, 0.009, 0.006, [0, 0, 0.06], [s * 0.34, 0, 0.02]);
      for (const k of [0.3, 0.55, 0.8]) g.add(K.mesh(K.box(0.05, 0.006, 0.01), markMat(c), s * 0.34 * k, 0.003, 0.02 - k * 0.05));
    }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.025, -0.02, -0.08); K.stick(g, c.dark, 0.008, 0.006, [0, 0, 0], [0, -0.05, -0.06]); }
    p.pose = dinoPose; p.fly = true; p.tip = p.head; p.muzzle = p.head; p.scaleK = 1.05;
    return p;
  }
  /* ---------- Cavaliers : vélociraptors ---------- */
  function raptor(side) {
    const c = CLANS[side], p = biped({ c, h: 0.31, wide: 0.62, neckY: 0.1, neckZ: 0.17, tail: 9 });
    head(p, c, { y: 0.11, z: 0.18, s: 0.72 });
    const crest = new T.Group(); crest.position.set(0, 0.04, -0.02); p.head.add(crest);
    for (let i = 0; i < 4; i++) { const f = K.mesh(K.cone(0.01, 0.05, 4), side === 'w' ? M(c.crest) : markMat(c), 0, 0.012, 0.02 - i * 0.022); f.rotation.x = -0.6; crest.add(f); }
    for (const g of [p.legL, p.legR]) { const f = K.mesh(K.cone(0.012, 0.07, 5), M(c.claw), 0, -0.21, 0.05); f.rotation.x = -0.5; g.userData.knee.add(f); f.position.y = -0.12; f.position.z = 0.085; }
    for (const a of [p.armL, p.armR]) { a.children[0].scale.set(1.3, 1.5, 1.3); const cl = K.mesh(K.cone(0.008, 0.04, 4), M(c.claw), 0, -0.1, 0.06); cl.rotation.x = Math.PI - 0.3; a.add(cl); }
    p.scaleK = 1.12;
    return p;
  }
  /* ---------- Pions : bébés dans leur œuf ---------- */
  function baby(side) {
    const c = CLANS[side], p = K.base(0.3);
    const shell = new T.Mesh(new T.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), M('#f4ecd8', { double: true }));
    const egg = new T.Group(); egg.position.set(0, -0.14, 0); egg.scale.y = 1.25; p.root.children[0].add(egg); egg.add(shell); p.egg = egg;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, f = K.mesh(K.cone(0.022, 0.05, 4), M('#f4ecd8'), Math.cos(a) * 0.1, 0.03 + (i % 2) * 0.012, Math.sin(a) * 0.1); egg.add(f); }
    for (const [x, y, z] of [[0.06, -0.04, 0.08], [-0.08, -0.07, 0.04], [0.02, -0.09, -0.09]]) egg.add(K.mesh(K.sphere(0.018, 6, 5), markMat(c), x, y, z));
    K.ell(p.torso, c.skin, 0.065, 0.075, 0.06, 0, 0.0, 0);
    K.ell(p.torso, c.belly, 0.045, 0.055, 0.03, 0, -0.01, 0.04);
    p.head.position.set(0, 0.1, 0.02);
    K.ell(p.head, c.skin, 0.068, 0.06, 0.075, 0, 0, 0.012);
    K.ell(p.head, c.dark, 0.042, 0.022, 0.03, 0, -0.012, 0.07);
    for (const s of [-1, 1]) { p.head.add(K.mesh(K.sphere(0.02, 8, 6), M('#ffffff'), s * 0.035, 0.022, 0.05)); p.head.add(K.mesh(K.sphere(0.011, 6, 5), M(side === 'w' ? '#1a1a12' : c.eye), s * 0.038, 0.024, 0.066)); }
    if (side === 'w') { const leaf = K.mesh(K.cone(0.03, 0.09, 5), M(c.crest), 0.01, 0.085, 0); leaf.scale.z = 0.3; leaf.rotation.z = -0.3; p.head.add(leaf); }
    else for (let i = 0; i < 3; i++) { const f = K.mesh(K.cone(0.012, 0.05, 4), markMat(c), 0, 0.07, 0.01 - i * 0.025); f.rotation.x = -0.4; p.head.add(f); }
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) { g.position.set(s * 0.058, 0.03, 0.02); K.stick(g, c.skin, 0.013, 0.01, [0, 0, 0], [0, -0.05, 0.03]); }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) { g.position.set(s * 0.04, -0.07, 0); K.stick(g, c.skin, 0.018, 0.014, [0, 0, 0], [0, -0.05, 0]); }
    p.pose = dinoPose; p.scaleK = 1.05; p.tip = p.head; p.muzzle = p.head;
    return p;
  }

  const SET = { K: () => rex('w'), k: () => rex('b'), Q: () => spino('w'), q: () => spino('b'), R: () => triceratops('w'), r: () => triceratops('b'), B: () => pteranodon('w'), b: () => pteranodon('b'), N: () => raptor('w'), n: () => raptor('b'), P: () => baby('w'), p: () => baby('b') };
  root.ThemeModels = root.ThemeModels || {};
  root.ThemeModels.dinos = { build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return SET[piece](); } };
})(window);
