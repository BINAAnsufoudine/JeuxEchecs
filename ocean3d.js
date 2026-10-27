/* Ata Wawé — personnages 3D du thème « Océan Indien ».
   Blancs : créatures lumineuses du lagon. Noirs : créatures des abysses.
   Chaque modèle expose les mêmes articulations que les ninjas (torse, tête, bras, jambes),
   ce qui permet de réutiliser toutes les animations : les bras deviennent des nageoires,
   des pinces ou des tentacules, les jambes des nageoires caudales ou des pattes. */
(function (root) {
  'use strict';
  let T = null;
  const mats = new Map();
  function mat(color, o = {}) {
    const key = `${color}|${o.rough ?? 0.55}|${o.metal ?? 0.05}|${o.emissive || ''}|${o.opacity ?? 1}`;
    if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.55, metalness: o.metal ?? 0.05,
      emissive: o.emissive || '#000000', emissiveIntensity: o.emissive ? 0.35 : 0,
      transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, side: o.double ? T.DoubleSide : T.FrontSide,
    }));
    return mats.get(key);
  }
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; };
  const sphere = (r, w = 20, h = 14) => new T.SphereGeometry(r, w, h);
  const cone = (r, h, s = 10) => new T.ConeGeometry(r, h, s);
  const box = (x, y, z) => new T.BoxGeometry(x, y, z);

  // squelette commun : torse au centre du corps, tête devant, bras/jambes en pivots vides
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
  // yeux expressifs (blanc, pupille, reflet)
  function eyes(head, x, y, z, r = 0.035, pupil = '#111') {
    for (const s of [-1, 1]) {
      head.add(mesh(sphere(r, 14, 10), mat('#ffffff', { rough: 0.25 }), s * x, y, z));
      head.add(mesh(sphere(r * 0.55, 12, 8), mat(pupil, { rough: 0.2 }), s * x, y, z + r * 0.7));
      head.add(mesh(sphere(r * 0.18, 8, 6), mat('#ffffff', { emissive: '#ffffff' }), s * x + r * 0.2, y + r * 0.25, z + r * 0.95));
    }
  }
  function crown(head, y, color = '#f2c230', scale = 1) {
    const c = new T.Group(); c.position.y = y; c.scale.setScalar(scale);
    c.add(mesh(new T.CylinderGeometry(0.09, 0.1, 0.05, 16), mat(color, { metal: 0.7, rough: 0.25 })));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, spike = mesh(cone(0.025, 0.08, 6), mat(color, { metal: 0.7, rough: 0.25 }), Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08);
      c.add(spike);
      c.add(mesh(sphere(0.014, 8, 6), mat(i % 2 ? '#e53b4f' : '#3fb6ff', { emissive: i % 2 ? '#e53b4f' : '#3fb6ff' }), Math.cos(a) * 0.08, 0.11, Math.sin(a) * 0.08));
    }
    head.add(c); return c;
  }
  // corps de poisson allongé vers l'avant (+z)
  function fishBody(p, color, len, h, w) {
    const body = mesh(sphere(1, 24, 16), mat(color), 0, 0, 0); body.scale.set(w, h, len); p.torso.add(body);
    return body;
  }
  function fin(parent, color, sx, sy, sz, x, y, z, ry = 0, opacity = 0.9) {
    const f = mesh(sphere(1, 14, 10), mat(color, { opacity, double: true }), x, y, z);
    f.scale.set(sx, sy, sz); f.rotation.y = ry; parent.add(f); return f;
  }

  const BUILD = {
    // ---------- Blancs : le lagon ----------
    P() { // poisson-clown
      const p = base(0.32);
      fishBody(p, '#ff7a1a', 0.2, 0.15, 0.09);
      // trois bandes blanches autour du corps (anneaux ouverts, axe le long du poisson)
      for (const z of [0.1, -0.02, -0.13]) {
        const f = Math.sqrt(Math.max(0.05, 1 - (z / 0.2) ** 2));
        const s = mesh(new T.CylinderGeometry(1, 1, 1, 20, 1, true), mat('#ffffff', { double: true }), 0, 0, z);
        s.rotation.x = Math.PI / 2; s.scale.set(0.092 * f, 0.03, 0.152 * f); p.torso.add(s);
      }
      eyes(p.head, 0.055, 0.04, 0.15, 0.03);
      fin(p.armL, '#ff9a3a', 0.02, 0.05, 0.06, -0.09, -0.02, 0.03); fin(p.armR, '#ff9a3a', 0.02, 0.05, 0.06, 0.09, -0.02, 0.03);
      fin(p.legL, '#ff7a1a', 0.015, 0.09, 0.06, 0, 0.02, -0.24); fin(p.legR, '#ffffff', 0.016, 0.03, 0.05, 0, 0.13, -0.02);
      p.scaleK = 1.7;
      return p;
    },
    N() { // hippocampe
      const p = base(0.2);
      const col = '#ffd23f';
      for (let i = 0; i < 6; i++) p.torso.add(mesh(sphere(0.085 - i * 0.008, 16, 12), mat(col), 0, 0.05 + i * 0.06, Math.sin(i * 0.7) * 0.04));
      p.head.position.set(0, 0.42, 0.04);
      p.head.add(mesh(sphere(0.07, 16, 12), mat(col)));
      const snout = mesh(new T.CylinderGeometry(0.02, 0.03, 0.12, 10), mat(col), 0, -0.01, 0.09); snout.rotation.x = Math.PI / 2; p.head.add(snout);
      for (let i = 0; i < 4; i++) p.head.add(mesh(cone(0.012, 0.05, 6), mat('#ff9f1c'), 0, 0.06 + i * 0.01, -0.04 - i * 0.02));
      eyes(p.head, 0.045, 0.02, 0.045, 0.022);
      const tail = mesh(new T.TorusGeometry(0.06, 0.03, 10, 20, Math.PI * 1.5), mat(col), 0, -0.02, -0.03); tail.rotation.y = Math.PI / 2; p.legL.add(tail);
      fin(p.armL, '#ffe98a', 0.01, 0.06, 0.05, -0.07, 0.25, -0.02); fin(p.armR, '#ffe98a', 0.01, 0.06, 0.05, 0.07, 0.25, -0.02);
      fin(p.legR, '#ffe98a', 0.012, 0.09, 0.05, 0, 0.2, -0.09);
      return p;
    },
    B() { // raie manta
      const p = base(0.34);
      const body = mesh(sphere(1, 24, 12), mat('#2d4f86'), 0, 0, 0); body.scale.set(0.12, 0.05, 0.16); p.torso.add(body);
      const belly = mesh(sphere(1, 24, 12), mat('#f4f6ff'), 0, -0.012, 0); belly.scale.set(0.11, 0.042, 0.15); p.torso.add(belly);
      // grandes ailes = bras (battent avec les animations)
      for (const [arm, s] of [[p.armL, -1], [p.armR, 1]]) {
        const w = mesh(new T.ConeGeometry(0.15, 0.24, 4, 1), mat('#2d4f86', { double: true }), s * 0.15, 0, 0);
        w.rotation.z = s * Math.PI / 2; w.scale.set(1, 1, 0.18); arm.add(w);
      }
      for (const s of [-1, 1]) { const horn = mesh(cone(0.02, 0.09, 8), mat('#2d4f86'), s * 0.05, 0, 0.17); horn.rotation.x = Math.PI / 2; p.head.add(horn); }
      eyes(p.head, 0.07, 0.03, 0.12, 0.022);
      const tail = mesh(new T.CylinderGeometry(0.006, 0.012, 0.3, 6), mat('#1e3560'), 0, 0, -0.3); tail.rotation.x = Math.PI / 2; p.legL.add(tail);
      p.scaleK = 1.25;
      return p;
    },
    R() { // tortue marine
      const p = base(0.04);
      const shell = mesh(new T.SphereGeometry(0.2, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2f8f5b', { rough: 0.7 }), 0, 0, 0); shell.scale.set(1, 0.75, 1.15); p.torso.add(shell);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, plate = mesh(new T.CylinderGeometry(0.05, 0.05, 0.01, 6), mat('#9fd17a', { rough: 0.6 }), Math.cos(a) * 0.11, 0.1, Math.sin(a) * 0.12); plate.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); p.torso.add(plate); }
      p.torso.add(mesh(new T.CylinderGeometry(0.06, 0.06, 0.012, 6), mat('#9fd17a'), 0, 0.15, 0));
      const plastron = mesh(new T.CylinderGeometry(0.2, 0.19, 0.03, 22), mat('#f3e3b5'), 0, -0.01, 0); plastron.scale.set(1, 1, 1.15); p.torso.add(plastron);
      p.head.position.set(0, 0.05, 0.25); p.head.add(mesh(sphere(0.07, 16, 12), mat('#7cc49a')));
      eyes(p.head, 0.04, 0.02, 0.05, 0.02);
      // nageoires avant fixées au corps, inclinées vers le bas (les animations de bras les feraient lever comme des ailes)
      for (const x of [-0.19, 0.19]) { const f = fin(p.torso, '#7cc49a', 0.12, 0.02, 0.055, x, -0.03, 0.12, x < 0 ? 0.45 : -0.45, 1); f.rotation.z = x < 0 ? 0.35 : -0.35; }
      for (const [g, x, z] of [[p.legL, -0.12, -0.17], [p.legR, 0.12, -0.17]]) fin(g, '#7cc49a', 0.11, 0.02, 0.05, x, -0.01, z, x < 0 ? 0.4 : -0.4, 1);
      p.scaleK = 1.25;
      return p;
    },
    Q() { // dauphin, dressé sur sa queue
      const p = base(0.36);
      const body = mesh(sphere(1, 24, 16), mat('#7fb2d9', { rough: 0.35 }), 0, 0.06, 0); body.scale.set(0.11, 0.26, 0.12); p.torso.add(body);
      const belly = mesh(sphere(1, 24, 16), mat('#eaf4ff', { rough: 0.35 }), 0, 0.04, 0.03); belly.scale.set(0.09, 0.22, 0.1); p.torso.add(belly);
      p.head.position.set(0, 0.3, 0.03);
      p.head.add(mesh(sphere(0.09, 18, 14), mat('#7fb2d9', { rough: 0.35 })));
      const beak = mesh(new T.CylinderGeometry(0.02, 0.04, 0.1, 10), mat('#7fb2d9', { rough: 0.35 }), 0, -0.02, 0.1); beak.rotation.x = Math.PI / 2; p.head.add(beak);
      eyes(p.head, 0.05, 0.03, 0.06, 0.022);
      crown(p.head, 0.1, '#e9e4ff', 0.7); // diadème de la dame
      fin(p.torso, '#5a92bf', 0.015, 0.09, 0.06, 0, 0.15, -0.1);
      fin(p.armL, '#5a92bf', 0.02, 0.07, 0.04, -0.11, 0.05, 0.02); fin(p.armR, '#5a92bf', 0.02, 0.07, 0.04, 0.11, 0.05, 0.02);
      fin(p.legL, '#5a92bf', 0.12, 0.02, 0.06, -0.05, -0.22, -0.03, 0.3); fin(p.legR, '#5a92bf', 0.12, 0.02, 0.06, 0.05, -0.22, -0.03, -0.3);
      return p;
    },
    K() { // baleine à bosse couronnée
      const p = base(0.36);
      const body = mesh(sphere(1, 26, 18), mat('#3d6fb0', { rough: 0.5 }), 0, 0.05, 0); body.scale.set(0.17, 0.29, 0.17); p.torso.add(body);
      const belly = mesh(sphere(1, 26, 18), mat('#f1f5ff'), 0, 0.02, 0.05); belly.scale.set(0.13, 0.24, 0.14); p.torso.add(belly);
      for (let i = 0; i < 6; i++) p.torso.add(mesh(box(0.13, 0.008, 0.01), mat('#c9d6ee'), 0, -0.08 + i * 0.045, 0.185));
      p.head.position.set(0, 0.3, 0.02);
      eyes(p.head, 0.11, -0.02, 0.1, 0.03);
      crown(p.head, 0.06);
      // jet de la baleine (évent)
      p.head.add(mesh(cone(0.03, 0.12, 8), mat('#bfe8ff', { opacity: 0.6, emissive: '#bfe8ff' }), 0, 0.2, -0.02));
      fin(p.armL, '#2f5b93', 0.03, 0.15, 0.05, -0.18, -0.02, 0.02, 0, 1); fin(p.armR, '#2f5b93', 0.03, 0.15, 0.05, 0.18, -0.02, 0.02, 0, 1);
      fin(p.legL, '#2f5b93', 0.14, 0.02, 0.07, -0.07, -0.26, -0.03, 0.3, 1); fin(p.legR, '#2f5b93', 0.14, 0.02, 0.07, 0.07, -0.26, -0.03, -0.3, 1);
      return p;
    },
    // ---------- Noirs : les abysses ----------
    p() { // piranha
      const p = base(0.32);
      fishBody(p, '#3a3f4b', 0.18, 0.15, 0.09);
      const belly = mesh(sphere(1, 20, 14), mat('#c0392b'), 0, -0.06, 0.03); belly.scale.set(0.075, 0.07, 0.13); p.torso.add(belly);
      for (let i = 0; i < 5; i++) p.head.add(mesh(cone(0.012, 0.03, 4), mat('#ffffff', { rough: 0.2 }), -0.04 + i * 0.02, -0.04, 0.17));
      eyes(p.head, 0.055, 0.04, 0.13, 0.03, '#d4242c');
      fin(p.armL, '#2a2e38', 0.02, 0.05, 0.06, -0.09, -0.02, 0.03); fin(p.armR, '#2a2e38', 0.02, 0.05, 0.06, 0.09, -0.02, 0.03);
      fin(p.legL, '#2a2e38', 0.015, 0.09, 0.06, 0, 0.02, -0.22); fin(p.legR, '#2a2e38', 0.015, 0.06, 0.05, 0, 0.13, -0.02);
      p.scaleK = 1.7;
      return p;
    },
    n() { // murène
      const p = base(0.05);
      const col = '#2f4a2b';
      for (let i = 0; i < 9; i++) { const s = mesh(sphere(0.065 - i * 0.002, 14, 10), mat(col, { rough: 0.4 }), Math.sin(i * 0.9) * 0.06, 0.04 + i * 0.05, 0); p.torso.add(s); }
      for (let i = 0; i < 9; i++) p.torso.add(mesh(sphere(0.012, 6, 4), mat('#c6d84a'), Math.sin(i * 0.9) * 0.06 + 0.05, 0.05 + i * 0.05, 0.03));
      p.head.position.set(Math.sin(8 * 0.9) * 0.06, 0.5, 0.05);
      const skull = mesh(sphere(0.07, 16, 12), mat(col, { rough: 0.4 })); skull.scale.set(0.9, 0.8, 1.3); p.head.add(skull);
      const jaw = mesh(box(0.08, 0.02, 0.1), mat('#6e1e26'), 0, -0.04, 0.06); jaw.rotation.x = 0.3; p.head.add(jaw);
      eyes(p.head, 0.035, 0.03, 0.06, 0.018, '#f2c230');
      fin(p.armL, col, 0.01, 0.03, 0.03, -0.06, 0.3, 0); fin(p.armR, col, 0.01, 0.03, 0.03, 0.06, 0.3, 0);
      return p;
    },
    b() { // poisson-lion
      const p = base(0.33);
      fishBody(p, '#7a1f24', 0.16, 0.12, 0.08);
      for (const z of [0.08, 0, -0.08]) { const s = mesh(sphere(1, 16, 10), mat('#f5e6d8'), 0, 0, z); s.scale.set(0.083, 0.11, 0.012); p.torso.add(s); }
      // grandes épines venimeuses en éventail
      for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.27, sp = mesh(new T.CylinderGeometry(0.004, 0.008, 0.26, 5), mat(i % 2 ? '#f5e6d8' : '#7a1f24'), 0, 0.12 + Math.cos(a) * 0.12, Math.sin(a) * 0.12); sp.rotation.x = a; p.torso.add(sp); }
      eyes(p.head, 0.05, 0.03, 0.13, 0.025, '#2a0a0a');
      for (const [arm, s] of [[p.armL, -1], [p.armR, 1]]) for (let i = 0; i < 4; i++) { const r = mesh(new T.CylinderGeometry(0.003, 0.005, 0.22, 4), mat('#f5e6d8', { opacity: 0.85 }), s * 0.12, -0.03 - i * 0.02, 0.02 - i * 0.03); r.rotation.z = s * (1.0 + i * 0.15); arm.add(r); }
      fin(p.legL, '#7a1f24', 0.012, 0.08, 0.06, 0, 0.01, -0.2);
      p.scaleK = 1.4;
      return p;
    },
    r() { // crabe géant
      const p = base(0.13);
      const shell = mesh(sphere(1, 22, 14), mat('#7d1c1c', { rough: 0.45 }), 0, 0.04, 0); shell.scale.set(0.2, 0.11, 0.16); p.torso.add(shell);
      for (let i = 0; i < 5; i++) p.torso.add(mesh(sphere(0.018, 8, 6), mat('#a83a2a'), -0.12 + i * 0.06, 0.15, 0.02));
      p.head.position.set(0, 0.12, 0.14);
      for (const s of [-1, 1]) { p.head.add(mesh(new T.CylinderGeometry(0.01, 0.01, 0.1, 6), mat('#7d1c1c'), s * 0.05, 0.05, 0)); }
      eyes(p.head, 0.05, 0.11, 0, 0.026, '#111');
      // grosses pinces = bras
      for (const [arm, s] of [[p.armL, -1], [p.armR, 1]]) {
        arm.position.set(s * 0.17, 0.05, 0.1);
        arm.add(mesh(new T.CylinderGeometry(0.03, 0.035, 0.16, 8), mat('#7d1c1c'), 0, -0.06, 0));
        const claw = mesh(sphere(1, 16, 12), mat('#9b2a22', { rough: 0.4 }), 0, -0.17, 0.02); claw.scale.set(0.07, 0.09, 0.06); arm.add(claw);
        const pincer = mesh(cone(0.03, 0.12, 6), mat('#e8d5c0'), s * 0.03, -0.27, 0.02); pincer.rotation.z = Math.PI; arm.add(pincer);
      }
      // pattes = jambes (trois de chaque côté)
      for (const [leg, s] of [[p.legL, -1], [p.legR, 1]]) for (let i = 0; i < 3; i++) {
        const l = mesh(new T.CylinderGeometry(0.012, 0.018, 0.18, 6), mat('#7d1c1c'), s * 0.2, -0.06, -0.07 + i * 0.07); l.rotation.z = s * 0.9; leg.add(l);
      }
      p.scaleK = 0.85;
      return p;
    },
    q() { // requin, dressé sur sa queue
      const p = base(0.36);
      const body = mesh(sphere(1, 24, 16), mat('#5b6a78', { rough: 0.4 }), 0, 0.06, 0); body.scale.set(0.12, 0.28, 0.13); p.torso.add(body);
      const belly = mesh(sphere(1, 24, 16), mat('#e8ecf0'), 0, 0.03, 0.035); belly.scale.set(0.09, 0.23, 0.1); p.torso.add(belly);
      fin(p.torso, '#4a5866', 0.015, 0.13, 0.08, 0, 0.18, -0.13, 0, 1);
      p.head.position.set(0, 0.31, 0.03);
      const snout = mesh(sphere(0.09, 18, 14), mat('#5b6a78', { rough: 0.4 })); snout.scale.set(1, 1, 1.3); p.head.add(snout);
      for (let i = 0; i < 6; i++) p.head.add(mesh(cone(0.01, 0.025, 4), mat('#ffffff', { rough: 0.2 }), -0.05 + i * 0.02, -0.05, 0.08));
      eyes(p.head, 0.06, 0.03, 0.07, 0.02, '#000');
      crown(p.head, 0.1, '#b9a6ff', 0.7);
      fin(p.armL, '#4a5866', 0.02, 0.09, 0.05, -0.12, 0.03, 0.02, 0, 1); fin(p.armR, '#4a5866', 0.02, 0.09, 0.05, 0.12, 0.03, 0.02, 0, 1);
      fin(p.legL, '#4a5866', 0.12, 0.02, 0.07, -0.05, -0.23, -0.03, 0.3, 1); fin(p.legR, '#4a5866', 0.12, 0.02, 0.07, 0.05, -0.23, -0.03, -0.3, 1);
      return p;
    },
    k() { // pieuvre géante couronnée
      const p = base(0.36);
      const headDome = mesh(sphere(1, 24, 18), mat('#5b2a6e', { rough: 0.35 }), 0, 0.12, -0.02); headDome.scale.set(0.17, 0.22, 0.18); p.torso.add(headDome);
      for (let i = 0; i < 8; i++) p.torso.add(mesh(sphere(0.02, 8, 6), mat('#8e4fa8'), Math.cos(i) * 0.12, 0.15 + Math.sin(i * 2) * 0.06, 0.1));
      p.head.position.set(0, 0.05, 0.12);
      eyes(p.head, 0.07, 0.02, 0.04, 0.035, '#f2c230');
      crown(p.head, 0.28);
      // huit tentacules répartis sur les bras et les jambes
      const tentacle = (parent, a, len) => {
        let prev = parent;
        for (let i = 0; i < 6; i++) {
          const seg = new T.Group(); seg.position.set(i ? 0 : Math.cos(a) * 0.1, i ? -len : -0.08, i ? 0 : Math.sin(a) * 0.1);
          seg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
          seg.add(mesh(sphere(0.035 - i * 0.004, 10, 8), mat('#6a3380', { rough: 0.35 })));
          prev.add(seg); prev = seg;
        }
      };
      [[p.armL, 2.4], [p.armL, 3.1], [p.armR, 0.7], [p.armR, 0], [p.legL, 3.9], [p.legL, 4.6], [p.legR, 5.3], [p.legR, 6.0]].forEach(([g, a]) => tentacle(g, a, 0.045));
      return p;
    },
  };

  function build(THREE, piece) {
    T = THREE;
    const make = BUILD[piece] || BUILD[piece.toUpperCase()];
    return make();
  }
  root.OceanModels = { build };
})(window);
