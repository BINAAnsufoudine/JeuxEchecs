/* Ata Wawé — personnages 3D du thème L'Âge des Sabres (créations originales, samouraïs des temps anciens).
   Blancs : clan Hakuro, le Héron blanc (ivoire, vermillon, or). Noirs : clan Kurokane, le Fer noir (laque noire, violet, bronze).
   Chaque modèle reprend les articulations des ninjas pour réutiliser les animations. p.stance donne la garde au repos,
   p.strike le coup porté au corps à corps. Les armes qui quittent la main (naginata, boule de fer) sont nommées
   p.naginata et p.ball : les attaques les cachent pendant le lancer (src/board3d/12c-sabres.js).
   Les outils de base viennent de themes3d.js (ThemeKit). */
(function (root) {
  'use strict';
  let T = null, K = null;
  const M = (c, o) => K.mat(c, o);
  const LACQUER = { metal: 0.25, rough: 0.3 };
  const CLANS = {
    w: { armor: '#f2ede2', lace: '#c8312b', trim: '#c9a24a', dark: '#2e2620', cloth: '#3d5a80', skin: '#eac7a1', helm: '#f4efe4', cape: '#c8312b', wood: '#b98a5a', hair: '#1e1a18', horse: '#d4d0c8', mane: '#6b5d52', steel: '#e4eaef', flag: '#f4efe4', iron: '#5d5f66', edge: '#ffffff' },
    b: { armor: '#2a2630', lace: '#8a46a8', trim: '#b07a3c', dark: '#0d0b0f', cloth: '#4a1f2e', skin: '#cfa07a', helm: '#1c1a21', cape: '#5e1f3a', wood: '#4d3c31', hair: '#0d0b0f', horse: '#2a2430', mane: '#8a46a8', steel: '#aab2ba', flag: '#2a2630', iron: '#1b1a1f', edge: '#b980d6' },
  };

  /* ---------- Blasons : fleur de cerisier à cinq pétales, croissant de lune barré de trois traits ---------- */
  const crests = {};
  function crestMaterial(side) {
    if (crests[side]) return crests[side];
    const c = CLANS[side], canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const g = canvas.getContext('2d'), m = 64;
    g.strokeStyle = c.trim; g.lineWidth = 9; g.beginPath(); g.arc(m, m, 56, 0, 7); g.stroke();
    if (side === 'w') {
      g.fillStyle = c.lace;
      for (let i = 0; i < 5; i++) { const a = i * 1.2566 - Math.PI / 2; g.save(); g.translate(m + Math.cos(a) * 25, m + Math.sin(a) * 25); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, 15, 20, 0, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = c.trim; g.beginPath(); g.arc(m, m, 8, 0, 7); g.fill();
    } else {
      g.fillStyle = c.trim; g.beginPath(); g.arc(m - 4, m, 40, 0, 7); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(m + 14, m, 32, 0, 7); g.fill();
      g.globalCompositeOperation = 'source-over'; g.fillStyle = c.lace;
      for (const y of [m - 18, m - 3, m + 12]) g.fillRect(m - 10, y, 48, 7);
    }
    const map = new T.CanvasTexture(canvas);
    crests[side] = new T.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, roughness: 0.5, side: T.DoubleSide });
    return crests[side];
  }
  function kamon(parent, side, size, x, y, z, ry = 0) {
    const m = new T.Mesh(new T.PlaneGeometry(size, size), crestMaterial(side));
    m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
  }
  function fanion(parent, c, side, x, y, z, h, w) {
    const pole = K.mesh(K.cyl(0.006, 0.006, h, 6), M(c.dark), x, y + h / 2, z); parent.add(pole);
    const flag = new T.Group(); flag.position.set(x, y + h - w * 0.72, z - 0.004); flag.userData.wind = 'cloak'; parent.add(flag);
    flag.add(K.mesh(K.box(w, w * 1.4, 0.006), M(side === 'w' ? c.flag : c.lace), w / 2, 0, 0));
    kamon(flag, side, w * 0.85, w / 2, 0, 0.005);
    kamon(flag, side, w * 0.85, w / 2, 0, -0.005);
    return flag;
  }

  /* ---------- Armes (portées le long de z : le bras levé les tient droites) ---------- */
  function sabre(c, len, wide = 0.012) {
    const g = new T.Group();
    g.add(K.mesh(K.cyl(0.009, 0.009, 0.07, 6), M(c.dark)));
    g.children[0].rotation.x = Math.PI / 2; g.children[0].position.z = -0.025;
    const guard = K.mesh(K.cyl(0.02, 0.02, 0.006, 10), M(c.trim, { metal: 0.7, rough: 0.3 }), 0, 0, 0.012); guard.rotation.x = Math.PI / 2; g.add(guard);
    // lame légèrement courbe : trois segments
    let z = 0.015, y = 0;
    for (let i = 0; i < 3; i++) {
      const l = len / 3, tilt = 0.05 + i * 0.05, s = K.mesh(K.box(0.005, wide, l), M(c.steel, { metal: 0.85, rough: 0.2 }), 0, y + Math.sin(tilt) * l / 2, z + l / 2);
      s.rotation.x = -tilt; g.add(s); z += Math.cos(tilt) * l; y += Math.sin(tilt) * l;
    }
    const tip = new T.Group(); tip.position.set(0, y, z); g.add(tip); g.userData.tip = tip;
    return g;
  }
  function inHand(arm, weapon) { weapon.position.set(0, -0.19, 0.01); arm.add(weapon); return weapon; }
  function naginata(c, side) {
    const g = new T.Group();
    const shaft = K.mesh(K.cyl(0.0085, 0.0085, 0.66, 8), M(c.wood)); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.1; g.add(shaft);
    const collar = K.mesh(K.cyl(0.012, 0.012, 0.03, 8), M(c.trim, { metal: 0.7 }), 0, 0, 0.42); collar.rotation.x = Math.PI / 2; g.add(collar);
    const edge = sabre(c, side === 'w' ? 0.16 : 0.18, 0.024); edge.position.z = 0.42; edge.children[0].visible = edge.children[1].visible = false; g.add(edge);
    const tip = new T.Group(); tip.position.set(0, 0.02, 0.6); g.add(tip); g.userData.tip = tip;
    if (side === 'b') { // chaîne lestée au bout du manche
      for (let i = 0; i < 5; i++) g.add(K.mesh(new T.TorusGeometry(0.009, 0.003, 4, 8), M(c.steel, { metal: 0.8 }), 0.012 * Math.sin(i), -0.012 * i, -0.235 - i * 0.012));
      g.add(K.mesh(K.sphere(0.018, 8, 6), M(c.iron, { metal: 0.8 }), 0, -0.07, -0.3));
    }
    return g;
  }
  // Grosse boule de fer à pointes : aussi utilisée par les attaques, pour la boule lancée
  function spikedBall(c, r = 0.075) {
    const g = new T.Group();
    g.add(K.mesh(K.sphere(r, 14, 10), M(c.iron, { metal: 0.75, rough: 0.35 })));
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0], [0, 0.7, 0.7], [0, -0.7, 0.7], [0, 0.7, -0.7], [0, -0.7, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]];
    for (const [x, y, z] of dirs) {
      const d = new T.Vector3(x, y, z).normalize(), s = K.mesh(K.cone(r * 0.28, r * 0.75, 5), M(c.steel, { metal: 0.8, rough: 0.3 }));
      s.position.copy(d).multiplyScalar(r * 1.2); s.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); g.add(s);
    }
    return g;
  }

  /* ---------- Casques ---------- */
  function helmet(head, c, crest, r = 0.08) {
    const dome = K.mesh(new T.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M(c.helm, LACQUER), 0, 0.012, 0); head.add(dome);
    for (let i = 0; i < 6; i++) { const rib = K.mesh(new T.TorusGeometry(r * 1.005, 0.0035, 4, 10, Math.PI / 2), M(c.trim, { metal: 0.6 }), 0, 0.012, 0); rib.rotation.set(0, i * Math.PI / 6, Math.PI / 2 - 0.05); rib.rotation.y = i * Math.PI / 3; head.add(rib); }
    head.add(K.mesh(K.cyl(r * 1.04, r * 1.06, r * 0.13, 16), M(c.trim, { metal: 0.6, rough: 0.3 }), 0, 0.012, 0));
    // couvre-nuque à lames lacées
    for (let i = 0; i < 3; i++) {
      const y = -0.004 - i * r * 0.26, skirt = K.mesh(new T.CylinderGeometry(r * (1.05 + i * 0.13), r * (1.17 + i * 0.13), r * 0.26, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76 + Math.PI), M(c.helm, Object.assign({ double: true }, LACQUER)), 0, y, 0);
      head.add(skirt);
      const lace = K.mesh(new T.CylinderGeometry(r * (1.17 + i * 0.13), r * (1.175 + i * 0.13), r * 0.05, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76 + Math.PI), M(c.lace, { double: true }), 0, y - r * 0.13, 0);
      head.add(lace);
    }
    for (const s of [-1, 1]) { const flap = K.mesh(K.box(r * 0.5, r * 0.36, 0.008), M(c.helm, LACQUER), s * r * 1.02, 0.008, r * 0.42); flap.rotation.y = s * 0.7; head.add(flap); head.add(K.mesh(K.box(r * 0.5, r * 0.06, 0.009), M(c.lace), s * r * 1.02, 0.0, r * 0.425)); }
    const g = new T.Group(); g.position.set(0, 0.02 + r, 0); head.add(g);
    const gold = M(c.trim, { metal: 0.8, rough: 0.25 });
    if (crest === 'crescent') { const m = K.mesh(new T.TorusGeometry(r * 1.6, r * 0.14, 6, 24, Math.PI * 0.95), gold, 0, r * 1.45, r * 0.75); m.rotation.z = Math.PI * 1.025; m.scale.z = 0.5; g.add(m); g.add(K.mesh(K.sphere(r * 0.2, 8, 6), gold, 0, -r * 0.1, r * 0.72)); }
    else if (crest === 'horns') for (const s of [-1, 1]) { const m = K.mesh(new T.TorusGeometry(r * 1.15, r * 0.14, 6, 14, Math.PI * 0.62), gold, s * r * 1.5, r * 0.1, r * 0.45); m.rotation.z = s > 0 ? Math.PI * 0.42 : Math.PI * -0.04; g.add(m); }
    else if (crest === 'blade') { const m = K.mesh(K.cone(r * 0.26, r * 2, 4), gold, 0, r * 0.72, r * 0.72); m.scale.z = 0.25; g.add(m); }
    else if (crest === 'disc') { const m = K.mesh(K.cyl(r * 0.52, r * 0.52, 0.01, 18), M(c.lace, { emissive: c.lace }), 0, r * 0.35, r * 0.75); m.rotation.x = Math.PI / 2; g.add(m); const o = K.mesh(new T.TorusGeometry(r * 0.52, r * 0.07, 6, 18), gold, 0, r * 0.35, r * 0.75); g.add(o); }
    else if (crest === 'kuwagata') for (const s of [-1, 1]) { const m = K.mesh(K.cone(r * 0.2, r * 1.9, 5), gold, s * r * 0.5, r * 0.72, r * 0.72); m.rotation.z = -s * 0.42; m.scale.z = 0.3; g.add(m); }
    return g;
  }
  // Masque de guerre à crocs
  function warMask(head, c, r = 0.08) {
    const m = K.ell(head, c.cape, r * 0.84, r * 0.46, r * 0.5, 0, -r * 0.42, r * 0.56, LACQUER);
    for (let i = 0; i < 5; i++) { const fang = K.mesh(K.cone(r * 0.07, r * (i % 2 ? 0.2 : 0.3), 4), M('#f4efe4'), (i - 2) * r * 0.16, -r * 0.5, r * 0.98); fang.rotation.x = Math.PI; head.add(fang); }
    for (const s of [-1, 1]) { const w = K.mesh(K.box(r * 0.3, 0.005, 0.005), M(c.trim, { metal: 0.6 }), s * r * 0.55, -r * 0.28, r * 0.76); w.rotation.z = s * 0.4; head.add(w); }
    return m;
  }

  /* ---------- Gabarits ---------- */
  function samurai(o) {
    const c = o.c, side = o.side, w = o.wide || 1, p = K.base(0.3);
    // cuirasse laquée, rangées de laçage, ceinture, blason
    K.ell(p.torso, c.armor, 0.09 * w, 0.105 * (w > 1 ? 1.12 : 1), 0.072 * (w > 1 ? w * 0.86 : 1), 0, 0.075, 0, LACQUER);
    for (const y of [0.015, 0.04, 0.065]) { const ring = K.mesh(new T.TorusGeometry(1, 0.05, 5, 22), M(c.lace)); ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.scale.set(0.082 * w * (1 + (0.05 - Math.abs(y - 0.04)) * 0.3), 0.066 * w, 0.06); p.torso.add(ring); }
    p.torso.add(K.mesh(K.cyl(0.086 * w, 0.088 * w, 0.02, 14), M(c.trim, { metal: 0.6, rough: 0.3 }), 0, -0.012, 0));
    kamon(p.torso, side, 0.066, 0, 0.115, 0.069 * w);
    // grandes lames de jupe, lacées
    const blades = o.pawn ? 6 : 8;
    for (let i = 0; i < blades; i++) {
      const g = new T.Group(); g.rotation.y = i / blades * Math.PI * 2 + 0.2; p.torso.add(g);
      const skirtW = 0.046 * w * (8 / blades);
      const plate = K.mesh(K.box(skirtW, o.pawn ? 0.075 : 0.09, 0.012), M(c.armor, LACQUER), 0, -0.058, 0.082 * w * 0.86); plate.rotation.x = -0.24; g.add(plate);
      for (const y of [-0.04, -0.07]) { const line = K.mesh(K.box(skirtW, 0.008, 0.002), M(c.lace), 0, y, 0.087 * w * 0.86 + (-0.04 - y) * 0.24); line.rotation.x = -0.24; g.add(line); }
    }
    p.head.position.set(0, 0.215, 0);
    p.head.add(K.mesh(K.sphere(0.07, 16, 12), M(c.skin)));
    K.eyes(p.head, 0.027, 0.002, 0.058, 0.014, o.pupil || c.dark);
    if (o.crest !== null) p.crest = helmet(p.head, c, o.crest);
    if (o.mask) warMask(p.head, c);
    for (const [g, s] of [[p.armL, -1], [p.armR, 1]]) {
      g.position.set(s * 0.108 * w, 0.14, 0);
      K.stick(g, c.cloth, 0.035, 0.03, [0, 0, 0], [0, -0.17, 0]);
      g.add(K.mesh(K.cyl(0.032, 0.03, 0.09, 10), M(c.armor, LACQUER), 0, -0.13, 0));
      for (const y of [-0.105, -0.13, -0.155]) g.add(K.mesh(K.cyl(0.033, 0.033, 0.006, 10), M(c.lace), 0, y, 0));
      g.add(K.mesh(K.sphere(0.03, 8, 6), M(c.skin), 0, -0.185, 0));
      if (!o.pawn) { // grandes épaulières à trois lames, fixées aux épaules : les bras bougent librement dessous
        for (let i = 0; i < 3; i++) {
          const y = 0.165 - i * 0.03, x = s * (0.112 * w + i * 0.006);
          const pad = K.mesh(K.box(0.075, 0.026, 0.078), M(c.armor, LACQUER), x, y, 0); pad.rotation.z = s * -(0.5 + i * 0.05); p.torso.add(pad);
          const lace = K.mesh(K.box(0.077, 0.005, 0.08), M(c.lace), x, y - 0.014, 0); lace.rotation.z = s * -(0.5 + i * 0.05); p.torso.add(lace);
        }
      } else g.add(K.mesh(K.sphere(0.036, 8, 6), M(c.armor, LACQUER)));
    }
    for (const [g, s] of [[p.legL, -1], [p.legR, 1]]) {
      g.position.set(s * 0.052 * w, -0.04, 0);
      K.stick(g, c.cloth, 0.044 * Math.min(w, 1.2), 0.038, [0, 0, 0], [0, -0.12, 0]);
      const knee = new T.Group(); knee.position.y = -0.12; g.add(knee); g.userData.knee = knee;
      knee.add(K.mesh(K.sphere(0.036, 8, 6), M(c.armor, LACQUER)));
      knee.add(K.mesh(K.cyl(0.034, 0.03, 0.1, 10), M(c.armor, LACQUER), 0, -0.06, 0.004));
      knee.add(K.mesh(K.cyl(0.035, 0.035, 0.006, 10), M(c.lace), 0, -0.05, 0.004));
      knee.add(K.mesh(K.box(0.072, 0.03, 0.105), M(c.dark), 0, -0.125, 0.012));
    }
    p.pose = sabrePose; p.strike = o.strike || 'slash'; p.stance = o.stance || null;
    return p;
  }
  function cape(p, c, h = 0.33) {
    const g = new T.Group(); g.position.set(0, 0.16, -0.075); g.userData.wind = 'cloak';
    const m = K.mesh(new T.CylinderGeometry(0.075, 0.125, h, 14, 1, true, Math.PI / 2, Math.PI), M(c.cape, { double: true }), 0, -h / 2, 0.045); g.add(m);
    g.add(K.mesh(K.box(0.15, 0.022, 0.03), M(c.trim, { metal: 0.6 }), 0, -0.002, 0.012));
    g.rotation.x = 0.12; p.torso.add(g); return g;
  }
  function waistSwords(p, c, n = 1) {
    for (let i = 0; i < n; i++) { const s = K.mesh(K.cyl(0.008, 0.009, 0.24 - i * 0.05, 6), M(c.dark, LACQUER), -0.09, -0.015 + i * 0.012, 0.03 - i * 0.015); s.rotation.set(0, 0, 1.2 - i * 0.12); p.torso.add(s); }
  }

  /* ---------- Poses ---------- */
  const STANCES = {
    takemori(p) { p.armR.rotation.set(-1.75, 0, 0.3); p.armL.rotation.set(-0.95, 0, -0.45); },
    gendai(p) { p.armR.rotation.set(-1.05, 0, -0.5); p.armL.rotation.set(-1.05, 0, 0.5); },
    naginata(p) { p.armR.rotation.set(-1.0, 0, 0.32); p.armL.rotation.set(-0.5, 0, -0.2); },
    flail(p) { p.armR.rotation.set(-2.5, 0, 0.3); },
    deuxSabres(p) { p.armR.rotation.set(-0.85, 0, 0.75); p.armL.rotation.set(-0.85, 0, -0.75); },
    ashigaru(p) { p.armR.rotation.set(-1.05, 0, 0.2); },
  };
  function strikePose(p, k) {
    const hit = Math.floor(k), e = k - hit, s = Math.sin(Math.min(1, e) * Math.PI), alt = hit % 2 ? -1 : 1;
    switch (p.strike) {
      case 'dual': { const a = alt > 0 ? p.armR : p.armL; a.rotation.set(-2.5 + s * 1.6, 0, alt * 0.3); p.torso.rotation.y = -0.4 * s * alt; break; }
      case 'naginata': p.armR.rotation.set(-1.4, 0, 0.9 - s * 1.9); p.torso.rotation.y = -0.5 * (s - 0.5); break;
      case 'flail': p.armR.rotation.set(-2.6 + s * 1.5, 0, 0.3); p.torso.rotation.x = 0.3 * s; break;
      case 'nodachi': p.armR.rotation.set(-2.7 + s * 1.9, 0, -0.45); p.armL.rotation.set(-2.7 + s * 1.9, 0, 0.45); p.torso.rotation.x = 0.35 * s; break;
      default: p.armR.rotation.set(-2.5 + s * 1.5, 0, 0.25 - alt * 0.3); p.torso.rotation.y = -0.45 * s * alt; p.legL.rotation.x = -0.4 * s; break;
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
  function sabrePose(p, t, state, k) {
    if (state === 'idle' && p.stance) STANCES[p.stance](p);
    else if (state === 'select' && p.stance) { STANCES[p.stance](p); p.root.position.y = 0; }
    else if (state === 'run') { p.armR.rotation.set(-0.9, 0, 0.25); if (p.stance === 'gendai' || p.stance === 'deuxSabres') p.armL.rotation.set(-0.9, 0, -0.25); }
    else if (state === 'punch') strikePose(p, k);
    else if (state === 'kneel') kneelPose(p, k);
    if (state !== 'kneel' && p.legL.userData.knee) {
      p.legL.userData.knee.rotation.x = Math.max(0, p.legL.rotation.x) * 0.9;
      p.legR.userData.knee.rotation.x = Math.max(0, p.legR.rotation.x) * 0.9;
    }
  }

  /* ---------- Noblesse ---------- */
  function takemori() {
    const c = CLANS.w, p = samurai({ c, side: 'w', crest: 'crescent', stance: 'takemori' });
    cape(p, c, 0.36); waistSwords(p, c);
    const blade = sabre(c, 0.34); inHand(p.armR, blade); p.sword = blade; p.aimW = [{ o: blade, f: 0 }]; p.tip = blade.userData.tip;
    // éventail de guerre
    const fan = new T.Group(); fan.position.set(0, -0.2, 0.03); p.armL.add(fan);
    for (let i = 0; i < 7; i++) { const a = -0.95 + i * 0.32, rib = K.mesh(K.box(0.03, 0.002, 0.13), M(i % 2 ? c.lace : c.trim), Math.sin(a) * 0.065, 0, 0.018 + Math.cos(a) * 0.065); rib.rotation.y = a; fan.add(rib); }
    p.muzzle = p.tip; p.scaleK = 1.04;
    return p;
  }
  function gendai() {
    const c = CLANS.b, p = samurai({ c, side: 'b', crest: 'horns', mask: true, stance: 'gendai', strike: 'nodachi', pupil: '#c0392b' });
    cape(p, c, 0.36);
    const blade = sabre(c, 0.55, 0.018); blade.position.set(-0.11, -0.2, 0.03); blade.rotation.y = 0.5; p.armR.add(blade); p.aimW = [{ o: blade, f: 0 }]; p.aimBoth = true;
    p.sword = blade; p.tip = blade.userData.tip; p.muzzle = p.tip; p.scaleK = 1.06;
    return p;
  }
  function onna(side) {
    const c = CLANS[side], p = samurai({ c, side, crest: null, stance: 'naginata', strike: 'naginata' });
    K.ell(p.head, c.hair, 0.075, 0.066, 0.076, 0, 0.022, -0.01);
    const bun = K.mesh(K.sphere(0.03, 10, 8), M(c.hair), 0, 0.085, -0.03); p.head.add(bun);
    p.head.add(K.mesh(K.cyl(0.0755, 0.0755, 0.018, 18), M(c.lace), 0, 0.024, 0));
    const ribbon = new T.Group(); ribbon.position.set(0.02, 0.024, -0.07); ribbon.userData.wind = 'tail'; p.head.add(ribbon);
    ribbon.add(K.mesh(K.box(0.018, 0.12, 0.004), M(c.lace), 0, -0.06, -0.01));
    const hair = new T.Group(); hair.position.set(0, 0, -0.06); hair.userData.wind = 'hair'; p.head.add(hair);
    for (let i = 0; i < 6; i++) hair.add(K.mesh(K.sphere(0.04 - i * 0.003, 8, 6), M(c.hair), 0, -0.02 - i * 0.05, -0.012 - i * 0.004));
    if (side === 'b') { const scar = K.mesh(K.box(0.03, 0.004, 0.004), M(c.lace), 0, -0.03, 0.068); p.head.add(scar); }
    waistSwords(p, c);
    const n = naginata(c, side); inHand(p.armR, n); p.naginata = n; p.aimW = [{ o: n, f: 0 }]; p.tip = n.userData.tip; p.muzzle = p.tip;
    return p;
  }
  function colosse(side) {
    const c = CLANS[side], p = samurai({ c, side, crest: side === 'w' ? 'disc' : 'blade', wide: 1.55, mask: true, stance: 'flail', strike: 'flail', pupil: side === 'w' ? c.dark : '#c0392b' });
    p.torso.add(K.mesh(K.box(0.2, 0.05, 0.14), M(c.lace), 0, -0.01, 0));
    // manche sur l'épaule, chaîne et boule de fer à pointes
    const flail = new T.Group(); flail.position.set(0.14, 0.2, 0); p.torso.add(flail); p.flail = flail;
    K.stick(flail, c.wood, 0.014, 0.012, [-0.02, -0.05, 0.05], [0.04, 0.2, -0.13]);
    const end = new T.Group(); end.position.set(0.04, 0.2, -0.13); flail.add(end);
    for (let i = 0; i < 9; i++) { const link = K.mesh(new T.TorusGeometry(0.011, 0.0035, 4, 8), M(c.steel, { metal: 0.85, rough: 0.3 }), 0.012 * Math.sin(i * 0.5), -0.018 - i * 0.026, -0.008 * i); link.rotation.y = i % 2 ? Math.PI / 2 : 0; end.add(link); }
    const ball = spikedBall(c, 0.075); ball.position.set(0.012, -0.3, -0.075); end.add(ball); p.ball = ball;
    p.chain = end;
    p.aimW = [{ o: flail, f: 2, arm: 'free' }, { o: end, f: -2, arm: 'free' }]; // le fléau passe de l'épaule à l'avant, la boule reste pendue
    const hand = new T.Group(); hand.position.set(0, -0.19, 0); p.armR.add(hand); p.muzzle = hand;
    p.scaleK = 1.22;
    return p;
  }
  function bretteur(side) {
    const c = CLANS[side], p = samurai({ c, side, crest: side === 'w' ? 'blade' : 'disc', mask: side === 'b', stance: 'deuxSabres', strike: 'dual', pupil: side === 'b' ? '#8a46a8' : c.dark });
    waistSwords(p, c, 2);
    const long = sabre(c, 0.31), short = sabre(c, 0.2); inHand(p.armR, long); inHand(p.armL, short);
    if (side === 'b') for (const b of [long, short]) b.add(K.mesh(K.box(0.002, 0.018, 0.28), M(c.edge, { emissive: c.edge }), 0.004, 0.018, 0.16));
    p.sword = long; p.swordL = short; p.aimW = [{ o: long, f: 0 }, { o: short, f: 0, arm: 'L' }]; p.tip = long.userData.tip; p.muzzle = p.tip;
    return p;
  }
  function ashigaru(side) {
    const c = CLANS[side], p = samurai({ c, side, crest: null, pawn: true, stance: 'ashigaru' });
    // chapeau conique laqué
    const hat = K.mesh(K.cone(0.145, 0.075, 18), M(c.helm, LACQUER), 0, 0.078, 0); p.head.add(hat);
    p.head.add(K.mesh(K.cyl(0.145, 0.145, 0.006, 18), M(c.trim, { metal: 0.5 }), 0, 0.04, 0));
    p.head.add(K.mesh(K.sphere(0.012, 8, 6), M(c.lace), 0, 0.114, 0));
    waistSwords(p, c);
    const k = sabre(c, 0.26); inHand(p.armR, k); p.sword = k; p.aimW = [{ o: k, f: 0 }]; p.tip = k.userData.tip; p.muzzle = p.tip;
    fanion(p.torso, c, side, 0.0, 0.1, -0.075, 0.33, 0.085);
    p.scaleK = 0.98;
    return p;
  }

  /* ---------- Cavaliers : vrai cheval, longue lance pointée en avant, bannière dans le dos ---------- */
  function mountPose(p, t, state) {
    K.quadPose(p, t, state);
    p.torso.rotation.z = 0;
    if (state === 'run') p.torso.rotation.x = Math.sin(t * 14) * 0.05;
    p.rider.rotation.x = state === 'punch' ? 0.25 : state === 'run' ? Math.sin(t * 14) * 0.04 : 0;
    // cheval cabré : l'attaque de mat règle p.rear de 0 à 1 et les sabots avant frappent devant lui
    const r = p.rear || 0;
    if (r > 0) {
      p.torso.rotation.x = -0.95 * r;
      p.root.position.y += 0.13 * r;
      p.legL.rotation.x = p.legR.rotation.x = 0.95 * r;
      p.armL.rotation.x = -1.3 * r + Math.sin(t * 15) * 0.65 * r;
      p.armR.rotation.x = -1.3 * r - Math.sin(t * 15) * 0.65 * r;
      p.rider.rotation.x = 0.7 * r;
    }
  }
  function cavalier(side) {
    const c = CLANS[side];
    const p = K.quad({ h: 0.36, color: c.horse, w: 0.092, bh: 0.1, len: 0.205, leg: c.horse, legR: 0.03, hoof: c.dark, neckY: 0.2 });
    K.ell(p.torso, c.horse, 0.094, 0.098, 0.1, 0, 0.012, -0.1);  // croupe
    K.ell(p.torso, c.horse, 0.088, 0.1, 0.1, 0, 0.0, 0.12);      // poitrail
    // encolure épaisse, tête longue
    K.stick(p.torso, c.horse, 0.05, 0.075, [0, 0.06, 0.13], [0, 0.21, 0.25]);
    p.head.position.set(0, 0.235, 0.27);
    const skull = K.ell(p.head, c.horse, 0.04, 0.046, 0.06, 0, 0, 0.01); skull.rotation.x = 0.5;
    const muzzle = K.ell(p.head, c.horse, 0.03, 0.032, 0.062, 0, -0.045, 0.075); muzzle.rotation.x = 0.7;
    K.ell(p.head, c.mane, 0.018, 0.012, 0.012, 0, -0.07, 0.122);
    // crinière, toupet et longue queue
    for (let i = 0; i < 6; i++) { const m = K.mesh(K.box(0.016, 0.06, 0.05), M(c.mane), 0, 0.105 + i * 0.03, 0.135 + i * 0.022); m.rotation.x = -0.55; p.torso.add(m); }
    p.head.add(K.mesh(K.box(0.016, 0.03, 0.04), M(c.mane), 0, 0.05, 0.0));
    const tail = new T.Group(); tail.position.set(0, 0.05, -0.2); tail.userData.wind = 'tail'; p.torso.add(tail); p.tail = tail;
    for (let i = 0; i < 5; i++) tail.add(K.mesh(K.sphere(0.022 - i * 0.002, 8, 6), M(c.mane), 0, -0.02 - i * 0.042, -0.018 - i * 0.012));
    for (const s of [-1, 1]) p.head.add(K.mesh(K.cone(0.012, 0.045, 6), M(c.horse), s * 0.024, 0.055, -0.02));
    K.eyes(p.head, 0.038, 0.012, 0.018, 0.011, '#111', 0.9);
    // bride
    p.head.add(K.mesh(K.box(0.07, 0.007, 0.007), M(c.lace), 0, -0.035, 0.07));
    if (side === 'b') { // chanfrein et caparaçon de guerre
      const plate = K.mesh(K.box(0.052, 0.014, 0.13), M(c.armor, LACQUER), 0, 0.012, 0.055); plate.rotation.x = 0.62; p.head.add(plate);
      p.head.add(K.mesh(K.cone(0.01, 0.055, 5), M(c.trim, { metal: 0.7 }), 0, 0.055, 0.02));
      K.ell(p.torso, c.armor, 0.094, 0.1, 0.09, 0, 0.0, 0.135, LACQUER);
      for (let i = 0; i < 3; i++) p.torso.add(K.mesh(K.box(0.15, 0.006, 0.006), M(c.lace), 0, 0.06 - i * 0.04, 0.222 - i * 0.004));
    }
    // selle et tapis
    K.ell(p.torso, c.lace, 0.098, 0.1, 0.105, 0, 0.012, -0.015);
    K.ell(p.torso, c.dark, 0.05, 0.03, 0.08, 0, 0.1, -0.02);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) p.torso.add(K.mesh(K.cone(0.009, 0.03, 5), M(c.trim, { metal: 0.6 }), s * 0.088, -0.075, -0.08 + i * 0.05));
    // samouraï en selle
    const rider = new T.Group(); rider.position.set(0, 0.105, -0.02); p.torso.add(rider); p.rider = rider;
    K.ell(rider, c.armor, 0.058, 0.07, 0.046, 0, 0.075, 0, LACQUER);
    for (const y of [0.04, 0.055, 0.07]) { const l = K.mesh(new T.TorusGeometry(0.053, 0.0035, 4, 18), M(c.lace), 0, y, 0); l.rotation.x = Math.PI / 2; l.scale.y = 0.82; rider.add(l); }
    kamon(rider, side, 0.04, 0, 0.1, 0.044);
    for (let i = 0; i < 6; i++) { const g = new T.Group(); g.rotation.y = i / 6 * Math.PI * 2; rider.add(g); const plate = K.mesh(K.box(0.04, 0.05, 0.008), M(c.armor, LACQUER), 0, 0.005, 0.05); plate.rotation.x = -0.3; g.add(plate); }
    for (const s of [-1, 1]) {
      K.stick(rider, c.cloth, 0.025, 0.02, [s * 0.04, 0.02, 0], [s * 0.095, -0.06, 0.03]);
      K.stick(rider, c.armor, 0.021, 0.017, [s * 0.095, -0.06, 0.03], [s * 0.1, -0.14, 0.0], LACQUER);
      rider.add(K.mesh(K.box(0.03, 0.018, 0.06), M(c.dark), s * 0.1, -0.15, 0.012));
      for (let i = 0; i < 2; i++) { const pad = K.mesh(K.box(0.055, 0.02, 0.05), M(c.armor, LACQUER), s * 0.067, 0.13 - i * 0.022, 0); pad.rotation.z = s * -0.3; rider.add(pad); rider.add(K.mesh(K.box(0.056, 0.004, 0.051), M(c.lace), s * 0.067, 0.12 - i * 0.022, 0)); }
    }
    const head = new T.Group(); head.position.set(0, 0.185, 0); head.scale.setScalar(0.66); rider.add(head);
    head.add(K.mesh(K.sphere(0.07, 14, 10), M(c.skin)));
    K.eyes(head, 0.027, 0.002, 0.058, 0.014, c.dark);
    p.crest = helmet(head, c, 'kuwagata');
    if (side === 'b') warMask(head, c);
    // bras gauche aux rênes, bras droit qui tient la longue lance
    K.stick(rider, c.cloth, 0.021, 0.018, [-0.058, 0.115, 0], [-0.03, 0.04, 0.075]);
    K.stick(rider, c.cloth, 0.021, 0.018, [0.058, 0.115, 0], [0.078, 0.085, 0.06]);
    rider.add(K.mesh(K.sphere(0.02, 8, 6), M(c.skin), 0.078, 0.085, 0.06));
    const lance = new T.Group(); lance.position.set(0.078, 0.085, 0.06); rider.add(lance); p.lance = lance;
    const shaft = K.mesh(K.cyl(0.0065, 0.008, 0.72, 7), M(c.wood)); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.17; lance.add(shaft);
    const point = K.mesh(K.cone(0.016, 0.1, 5), M(c.steel, { metal: 0.85, rough: 0.2 }), 0, 0, 0.58); point.rotation.x = Math.PI / 2; point.scale.z = 0.35; lance.add(point);
    lance.add(K.mesh(K.sphere(0.014, 8, 6), M(c.lace), 0, 0, 0.525));
    const tip = new T.Group(); tip.position.set(0, 0, 0.63); lance.add(tip); p.lanceTip = tip; p.tip = tip; p.muzzle = tip;
    fanion(rider, c, side, 0, 0.1, -0.05, 0.3, 0.09);
    p.pose = mountPose; p.scaleK = 1.15;
    return p;
  }

  const SET = { K: takemori, k: gendai, Q: () => onna('w'), q: () => onna('b'), R: () => colosse('w'), r: () => colosse('b'), B: () => bretteur('w'), b: () => bretteur('b'), N: () => cavalier('w'), n: () => cavalier('b'), P: () => ashigaru('w'), p: () => ashigaru('b') };
  root.ThemeModels = root.ThemeModels || {};
  root.ThemeModels.sabres = {
    build(THREE, piece) { T = THREE; K = root.ThemeKit; K.use(THREE); return SET[piece](); },
    // Pièces réutilisées par les attaques (lancer, boule enflammée)
    ball(THREE, white) { T = THREE; K = root.ThemeKit; K.use(THREE); return spikedBall(CLANS[white ? 'w' : 'b'], 0.14); },
    naginata(THREE, white) { T = THREE; K = root.ThemeKit; K.use(THREE); const n = naginata(CLANS[white ? 'w' : 'b'], white ? 'w' : 'b'); n.scale.setScalar(1.5); return n; },
  };
})(window);
