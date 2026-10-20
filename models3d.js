/* Cavalier — personnages 3D style manga, construits en primitives Three.js (créations originales).
   Blancs : clan de ninjas. Noirs : guerriers à aura. Armes ninja : kunai, katana, shuriken, techniques de terre, glace, feu et eau. */
(function (root) {
  'use strict';

  let T = null;
  const geoCache = new Map(), matCache = new Map(), texCache = new Map();
  const SKIN = '#e9c3a7';

  function geo(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }
  function capsuleGeometry(key, radius, length) {
    return geo(`capsule:${key}:${radius}:${length}`, () => {
      const r = radius, h = length / 2, profile = [
        [0, -h - r], [r * 0.38, -h - r * 0.92], [r * 0.71, -h - r * 0.71],
        [r * 0.92, -h - r * 0.38], [r, -h], [r, h], [r * 0.92, h + r * 0.38],
        [r * 0.71, h + r * 0.71], [r * 0.38, h + r * 0.92], [0, h + r],
      ].map(([x, y]) => new T.Vector2(x, y));
      const geometry = new T.LatheGeometry(profile, 24);
      geometry.computeVertexNormals();
      return geometry;
    });
  }
  function mat(color, o = {}) {
    const key = color + JSON.stringify(o);
    if (!matCache.has(key)) {
      matCache.set(key, o.basic
        ? new T.MeshBasicMaterial({ color, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity, side: o.double ? T.DoubleSide : T.FrontSide, blending: o.additive ? T.AdditiveBlending : T.NormalBlending })
        : new T.MeshStandardMaterial({ color, transparent: !!o.opacity, opacity: o.opacity ?? 1, side: o.double ? T.DoubleSide : T.FrontSide, roughness: o.roughness ?? 0.78, metalness: o.metalness ?? 0.025 }));
    }
    return matCache.get(key);
  }
  function mesh(g, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; }

  /* ---------- Visage (texture canvas) ---------- */
  function faceTexture(o) {
    const key = JSON.stringify(o);
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    const L = '#2a1d1a';
    x.fillStyle = o.skin || SKIN; x.fillRect(0, 0, 256, 128);
    if (o.mask) {
      x.fillStyle = '#fbfbfb'; x.fillRect(0, 0, 256, 128);
      x.strokeStyle = '#d6303a'; x.lineWidth = 8; x.lineCap = 'round';
      for (const s of [-1, 1]) {
        x.beginPath(); x.moveTo(128 + s * 14, 52); x.quadraticCurveTo(128 + s * 40, 30, 128 + s * 62, 54); x.stroke();
        x.beginPath(); x.moveTo(128 + s * 46, 84); x.lineTo(128 + s * 74, 80); x.stroke();
      }
      x.fillStyle = '#222'; x.beginPath(); x.ellipse(128, 92, 8, 6, 0, 0, Math.PI * 2); x.fill();
    } else {
      x.fillStyle = 'rgba(255,120,120,0.35)';
      for (const s of [-1, 1]) { x.beginPath(); x.ellipse(128 + s * 58, 88, 14, 7, 0, 0, Math.PI * 2); x.fill(); }
      for (const s of [-1, 1]) {
        const ex = 128 + s * 34, ey = 60;
        if (!o.meshEyes) {
          x.fillStyle = '#fff'; x.strokeStyle = L; x.lineWidth = 4;
          x.beginPath(); x.ellipse(ex, ey, 9, 11, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.fillStyle = o.eye || '#3a6fd8'; x.beginPath(); x.ellipse(ex + s, ey + 2, 5.5, 8, 0, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#111'; x.beginPath(); x.ellipse(ex + s, ey + 4, 2.8, 5, 0, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex - 2, ey - 2.5, 2, 2.5, 0, 0, Math.PI * 2); x.fill();
        }
        x.strokeStyle = L; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath();
        if (o.fierce) { x.moveTo(ex - s * 15, ey - 23); x.lineTo(ex + s * 12, ey - 19); }
        else { x.moveTo(ex - s * 14, ey - 23); x.lineTo(ex + s * 12, ey - 24); }
        x.stroke();
      }
      const nose = x.createLinearGradient(122, 70, 136, 94);
      nose.addColorStop(0, 'rgba(126,76,59,0.02)'); nose.addColorStop(0.55, 'rgba(126,76,59,0.18)'); nose.addColorStop(1, 'rgba(255,240,222,0.12)');
      x.fillStyle = nose; x.beginPath(); x.moveTo(124, 68); x.quadraticCurveTo(128, 86, 135, 91); x.quadraticCurveTo(128, 96, 121, 91); x.closePath(); x.fill();
      if (o.marks) { x.strokeStyle = '#d6303a'; x.lineWidth = 6; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(128 + s * 34, 82); x.lineTo(128 + s * 36, 112); x.stroke(); } }
      if (o.scar) { x.strokeStyle = L; x.lineWidth = 3; x.beginPath(); x.moveTo(70, 90); x.lineTo(86, 104); x.stroke(); }
      x.strokeStyle = L; x.lineWidth = 5; x.beginPath();
      if (o.grin) { x.fillStyle = '#fff'; x.arc(128, 96, 14, 0.1 * Math.PI, 0.9 * Math.PI); x.closePath(); x.fill(); x.stroke(); }
      else if (o.fierce) { x.moveTo(116, 104); x.lineTo(140, 100); x.stroke(); }
      else { x.arc(128, 94, 10, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke(); }
    }
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    texCache.set(key, t);
    return t;
  }

  /* ---------- Squelette commun ---------- */
  function skeleton(o) {
    const g = new T.Group();
    const s = o.wide || 1;
    const parts = { root: g };
    // jambes (pivot à la hanche)
    for (const side of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(side * 0.075 * s, 0.22, 0);
      hip.add(mesh(capsuleGeometry('leg', 0.045, 0.12), mat(o.pants), 0, -0.1, 0));
      const shoe = mesh(geo('shoe', () => new T.SphereGeometry(0.06, 20, 14)), mat(o.shoes || '#3b3b4a'), 0, -0.2, 0.02);
      shoe.scale.set(1, 0.6, 1.4); hip.add(shoe);
      g.add(hip); parts[side < 0 ? 'legL' : 'legR'] = hip;
    }
    // torse
    const torso = new T.Group(); torso.position.y = 0.22; g.add(torso); parts.torso = torso;
    const chest = mesh(geo('torso' + s, () => {
      const profile = [[0, -0.15], [0.12 * s, -0.15], [0.15 * s, -0.12], [0.155 * s, -0.07],
        [0.14 * s, -0.015], [0.145 * s, 0.045], [0.17 * s, 0.1], [0.165 * s, 0.13],
        [0.135 * s, 0.15], [0, 0.15]].map(([radius, y]) => new T.Vector2(radius, y));
      const geometry = new T.LatheGeometry(profile, 32);
      geometry.computeVertexNormals();
      return geometry;
    }), mat(o.shirt), 0, 0.14, 0);
    torso.add(chest);
    const shoulderLine = mesh(geo('shoulderLine' + s, () => new T.SphereGeometry(1, 22, 14)), mat(o.shirt), 0, 0.27, 0);
    shoulderLine.scale.set(0.18 * s, 0.095, 0.14 * s); torso.add(shoulderLine);
    if (o.belt) torso.add(mesh(geo('belt' + s, () => new T.CylinderGeometry(0.163 * s, 0.163 * s, 0.045, 28, 2)), mat(o.belt), 0, 0.03, 0));
    if (o.vest) for (const side of [-1, 1]) {
      const v = mesh(geo('vest' + s, () => new T.BoxGeometry(0.11 * s, 0.24, 0.04)), mat(o.vest), side * 0.07 * s, 0.15, 0.13 * s);
      v.rotation.x = -0.12; torso.add(v);
    }
    if (o.pads) for (const side of [-1, 1]) {
      const p = mesh(geo('pad' + s, () => new T.BoxGeometry(0.13 * s, 0.05, 0.16 * s)), mat(o.pads), side * 0.17 * s, 0.29, 0);
      p.rotation.z = side * -0.35; torso.add(p);
    }
    if (o.emblem) {
      const e = mesh(geo('emb', () => new T.CircleGeometry(0.045, 16)), mat('#ffffff'), 0, 0.2, 0.142 * s + 0.004);
      e.rotation.x = -0.1; torso.add(e);
      const d = mesh(geo('embd', () => new T.CircleGeometry(0.025, 12)), mat(o.emblem), 0, 0.2, 0.142 * s + 0.006);
      d.rotation.x = -0.1; torso.add(d);
    }
    // bras (pivot à l'épaule)
    for (const side of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(side * 0.17 * s, 0.27, 0); sh.rotation.z = side * 0.25;
      sh.add(mesh(capsuleGeometry('arm', 0.039, 0.12), mat(o.sleeve || o.shirt), 0, -0.1, 0));
      sh.add(mesh(geo('hand', () => new T.SphereGeometry(0.05, 18, 12)), mat(o.hand || SKIN), 0, -0.22, 0));
      torso.add(sh); parts[side < 0 ? 'armL' : 'armR'] = sh;
    }
    // tête
    const head = new T.Group(); head.position.y = 0.32; torso.add(head); parts.head = head;
    head.add(mesh(capsuleGeometry('neck', 0.062, 0.035), mat(o.skin || SKIN), 0, 0.02, 0));
    head.add(mesh(geo('head', () => new T.SphereGeometry(0.19, 36, 26)), mat(o.skin || SKIN), 0, 0.17, 0));
    const faceOptions = o.face || {};
    const textureOptions = faceOptions.mask ? faceOptions : { ...faceOptions, meshEyes: true };
    const face = mesh(geo('face', () => new T.SphereGeometry(0.1915, 36, 24, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.3, Math.PI * 0.42)),
      new T.MeshStandardMaterial({ map: faceTexture(textureOptions), roughness: 0.72 }), 0, 0.17, 0);
    head.add(face);
    if (!(o.face || {}).mask) {
      const skin = mat(o.skin || SKIN, { roughness: 0.72, metalness: 0 });
      const nose = mesh(geo('nose', () => new T.SphereGeometry(1, 18, 14)), skin, 0, 0.14, 0.18);
      nose.scale.set(0.028, 0.038, 0.036); head.add(nose);
      const white = mat('#e6dfd4', { roughness: 0.38, metalness: 0 });
      const iris = mat((o.face || {}).eye || '#6a765b', { roughness: 0.32, metalness: 0.01 });
      const pupil = mat('#211c19', { roughness: 0.24, metalness: 0 });
      const highlight = mat('#fff9ef', { basic: true });
      for (const side of [-1, 1]) {
        const ear = mesh(geo('ear', () => new T.SphereGeometry(1, 16, 12)), skin, side * 0.178, 0.17, 0);
        ear.scale.set(0.028, 0.052, 0.035); head.add(ear);
        const eye = mesh(geo('eyeball', () => new T.SphereGeometry(1, 20, 16)), white, side * 0.067, 0.205, 0.178);
        eye.scale.set(0.029, 0.02, 0.013); head.add(eye);
        const irisMesh = mesh(geo('iris', () => new T.SphereGeometry(1, 16, 12)), iris, side * 0.067 + 0.003, 0.204, 0.19);
        irisMesh.scale.set(0.013, 0.015, 0.006); head.add(irisMesh);
        const pupilMesh = mesh(geo('pupil', () => new T.SphereGeometry(1, 12, 10)), pupil, side * 0.067 + 0.004, 0.204, 0.195);
        pupilMesh.scale.set(0.006, 0.009, 0.0035); head.add(pupilMesh);
        const catchlight = mesh(geo('eyeHighlight', () => new T.SphereGeometry(1, 10, 8)), highlight, side * 0.067, 0.21, 0.198);
        catchlight.scale.set(0.003, 0.004, 0.002); head.add(catchlight);
        const lidCurve = new T.CatmullRomCurve3([
          new T.Vector3(side * 0.095, 0.205, 0.18), new T.Vector3(side * 0.08, 0.224, 0.182),
          new T.Vector3(side * 0.06, 0.229, 0.182), new T.Vector3(side * 0.039, 0.217, 0.18),
        ]);
        head.add(new T.Mesh(new T.TubeGeometry(lidCurve, 10, 0.004, 6, false), skin));
      }
    }
    return parts;
  }

  // Cheveux en pointes réparties sur le crâne
  function spikes(head, color, o = {}) {
    const m = mat(color);
    const cap = mesh(geo('cap', () => new T.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42)), m, 0, 0.18, 0);
    head.add(cap);
    const n = o.n || 14, len = o.len || 0.16, r = o.r || 0.06;
    const g = geo('spike' + len + r, () => new T.SphereGeometry(1, 18, 12));
    const up = new T.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const phi = (i / n) * Math.PI * 2 + (o.twist || 0);
      const front = Math.cos(phi - Math.PI / 2) > 0.3; // côté visage (+z)
      const theta = o.up ? 0.15 + (i % 3) * 0.12 : front ? 0.32 + (i % 2) * 0.1 : 0.45 + (i % 3) * 0.18;
      const dir = new T.Vector3(Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).normalize();
      if (o.up) dir.lerp(up, 0.45).normalize();
      const s = mesh(g, m);
      s.position.copy(dir.clone().multiplyScalar(0.17 + len * 0.24)).add(new T.Vector3(0, 0.17, 0));
      s.quaternion.setFromUnitVectors(up, dir);
      s.scale.set(r * 1.25, len * 0.72, r * 1.25);
      head.add(s);
    }
  }
  function headband(head, cloth, r = 0.197) {
    head.add(mesh(geo('band' + r, () => new T.CylinderGeometry(r, r, 0.055, 24, 1, true)), mat(cloth, { double: true }), 0, 0.25, 0));
    const plate = mesh(geo('plate', () => new T.BoxGeometry(0.12, 0.055, 0.02)), mat('#c9d2dc'), 0, 0.25, r - 0.007);
    head.add(plate);
    const tail = mesh(geo('bandtail', () => new T.BoxGeometry(0.03, 0.14, 0.012)), mat(cloth), 0.06, 0.2, -r - 0.003);
    tail.rotation.z = 0.5; head.add(tail);
  }
  // Cagoule de ninja : couvre toute la tête et le cou, une fente laisse voir les yeux
  function hood(head, cloth) {
    const m = mat(cloth, { double: true, roughness: 0.9 });
    const R = 0.212, slitTop = 1.25, slitBottom = 1.56, slitHalf = 0.56;
    head.add(mesh(geo('hood-top', () => new T.SphereGeometry(R, 28, 12, 0, Math.PI * 2, 0, slitTop)), m, 0, 0.17, 0));
    head.add(mesh(geo('hood-band', () => new T.SphereGeometry(R, 28, 4, Math.PI / 2 + slitHalf, Math.PI * 2 - slitHalf * 2, slitTop, slitBottom - slitTop)), m, 0, 0.17, 0));
    head.add(mesh(geo('hood-low', () => new T.SphereGeometry(R, 28, 10, 0, Math.PI * 2, slitBottom, 1.2)), m, 0, 0.17, 0));
    // pan du cou qui descend sur les épaules
    head.add(mesh(geo('hood-neck', () => new T.CylinderGeometry(0.1, 0.16, 0.12, 20, 1, true)), m, 0, 0.0, 0));
  }
  // Coiffure noire en mèches arrondies, sans pointes coniques.
  function blackHair(head, style = 0) {
    const color = mat('#171820');
    const cap = mesh(geo('blackHairCap', () => new T.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.43)), color, 0, 0.18, 0);
    head.add(cap);
    for (let side of [-1, 1]) {
      const lock = mesh(geo('blackHairLock', () => new T.SphereGeometry(0.055, 10, 8)), color, side * (style === 2 ? 0.15 : 0.17), 0.11, -0.015);
      lock.scale.set(0.78, style === 1 ? 1.8 : 1.25, 0.9);
      head.add(lock);
    }
    // Une frange en mèches rondes donne une silhouette de cheveux sans effet de cône.
    for (let i = 0; i < (style === 1 ? 3 : 2); i++) {
      const fringe = mesh(geo('blackHairFringe', () => new T.SphereGeometry(0.055, 10, 8)), color,
        (i - 0.5) * 0.075, 0.275 - (i % 2) * 0.025, 0.13);
      fringe.scale.set(1.05, 0.72, 0.78);
      head.add(fringe);
    }
  }
  function aura(parts, color, power) {
    const a = new T.Group();
    // Conserve les particules d'énergie sans les halos coniques autour du personnage.
    const pm = mat(color, { basic: true, opacity: 0.8, additive: true });
    a.userData.sparks = [];
    for (let i = 0; i < 4 + power * 3; i++) {
      const s = mesh(geo('spark', () => new T.SphereGeometry(0.018, 6, 4)), pm);
      s.userData.seed = Math.random() * 10; s.userData.ang = Math.random() * Math.PI * 2;
      a.add(s); a.userData.sparks.push(s);
    }
    parts.root.add(a); parts.aura = a; parts.auraPower = power;
  }
  function lightning(parts) {
    const pts = [];
    for (let i = 0; i < 7; i++) pts.push(new T.Vector3((i % 2 ? 0.06 : -0.04), 1.05 - i * 0.12, 0));
    const g = new T.BufferGeometry().setFromPoints(pts);
    const l = new T.Line(g, new T.LineBasicMaterial({ color: 0x9be7ff }));
    const bolts = new T.Group();
    for (let i = 0; i < 3; i++) { const b = l.clone(); b.position.set(Math.cos(i * 2.1) * 0.3, 0, Math.sin(i * 2.1) * 0.3); bolts.add(b); }
    parts.root.add(bolts); parts.bolts = bolts;
  }

  /* ---------- Armes ninja ---------- */
  function metalMat(color) { return mat(color, { metalness: 0.68, roughness: 0.32 }); }
  // Kunai : poignée entourée de tissu, anneau au bout, lame en feuille ; tenu lame en avant
  function kunai(arm, o = {}, size = 1) {
    const s = new T.Group(); s.position.set(0, -0.22, 0.02); s.scale.setScalar(size);
    s.add(mesh(geo('kring', () => new T.TorusGeometry(0.022, 0.007, 6, 12)), metalMat(o.metal || '#3a3f48'), 0, 0.07, 0));
    s.add(mesh(geo('khandle', () => new T.CylinderGeometry(0.014, 0.016, 0.1, 8)), mat(o.wrap || '#2a2a33'), 0, 0, 0));
    const b = mesh(geo('kblade', () => new T.ConeGeometry(0.04, 0.2, 4)), metalMat(o.metal || '#3a3f48'), 0, -0.14, 0);
    b.rotation.x = Math.PI; b.scale.z = 0.3; s.add(b);
    s.rotation.x = -Math.PI * 0.5; // tenue au poing : lame vers l'avant quand le bras pend
    arm.add(s);
    return s;
  }
  // Katana (ou ninjatō s'il est droit) : longue lame, garde ronde, poignée tressée
  function katana(arm, o = {}, size = 1) {
    const s = new T.Group(); s.position.set(0, -0.22, 0.02); s.scale.setScalar(size);
    s.add(mesh(geo('kahandle', () => new T.CylinderGeometry(0.017, 0.017, 0.14, 8)), mat(o.wrap || '#1d1d24'), 0, 0.02, 0));
    const tsuba = o.square ? geo('ninjaguard', () => new T.BoxGeometry(0.08, 0.012, 0.08)) : geo('tsuba', () => new T.CylinderGeometry(0.045, 0.045, 0.012, 14));
    s.add(mesh(tsuba, metalMat(o.guard || '#c9a227'), 0, -0.055, 0));
    // lame légèrement courbée : trois segments
    const bm = metalMat(o.blade || '#e3e8ef');
    for (let i = 0; i < 3; i++) {
      const seg = mesh(geo('kaseg', () => new T.BoxGeometry(0.026, 0.19, 0.01)), bm, o.square ? 0 : 0.004 * i * i, -0.15 - i * 0.18, 0);
      seg.rotation.z = o.square ? 0 : -0.03 * i; s.add(seg);
    }
    const tip = mesh(geo('katip', () => new T.ConeGeometry(0.018, 0.06, 4)), bm, o.square ? 0 : 0.018, -0.63, 0);
    tip.rotation.x = Math.PI; tip.scale.z = 0.4; s.add(tip);
    s.rotation.x = -Math.PI * 0.5; // tenue au poing : lame vers l'avant quand le bras pend
    arm.add(s);
    return s;
  }
  // Grand shuriken à quatre lames
  function shurikenMesh(o) {
    const star = new T.Group();
    for (let i = 0; i < 4; i++) {
      const b = mesh(geo('shublade', () => new T.ConeGeometry(0.075, 0.36, 4)), metalMat(o.metal));
      b.position.set(Math.cos(i * Math.PI / 2) * 0.17, Math.sin(i * Math.PI / 2) * 0.17, 0);
      b.rotation.z = i * Math.PI / 2 - Math.PI / 2; b.scale.z = 0.22; star.add(b);
    }
    const hub = mesh(geo('shuhub', () => new T.CylinderGeometry(0.06, 0.06, 0.04, 14)), metalMat(o.hub)); hub.rotation.x = Math.PI / 2; star.add(hub);
    const hole = mesh(geo('shuhole', () => new T.CylinderGeometry(0.025, 0.025, 0.045, 10)), mat('#111')); hole.rotation.x = Math.PI / 2; star.add(hole);
    return star;
  }
  // Longs cheveux qui tombent dans le dos jusqu'aux fesses
  function longHair(p, color) {
    // repère du buste (la tête est réduite de moitié) : du haut du crâne jusqu'aux fesses, par-dessus le manteau
    const m = mat(color, { double: true, roughness: 0.6 });
    const hair = mesh(geo('long-back-hair', () => new T.CylinderGeometry(0.115, 0.27, 0.47, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9)), m, 0, 0.235, -0.02);
    p.torso.add(hair); p.hair = hair;
    const tip = mesh(geo('long-hair-tip', () => new T.ConeGeometry(0.27, 0.07, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9)), m, 0, -0.035, -0.02);
    tip.rotation.x = Math.PI; p.torso.add(tip);
  }
  // Manteau long de la dame, ouvert devant, col et bordure de couleur
  function queenCoat(p, cloth, trim) {
    const coat = mesh(geo('queen-coat', () => new T.CylinderGeometry(0.19, 0.29, 0.66, 24, 1, true, 0.5, Math.PI * 2 - 1.0)), mat(cloth, { double: true, roughness: 0.8 }), 0, -0.04, -0.005);
    p.torso.add(coat); p.cloak = coat;
    p.torso.add(mesh(geo('queen-coat-hem', () => new T.CylinderGeometry(0.292, 0.292, 0.03, 24, 1, true, 0.5, Math.PI * 2 - 1.0)), mat(trim, { double: true }), 0, -0.36, -0.005));
    for (const side of [-1, 1]) {
      const lapel = mesh(geo('queen-lapel', () => new T.BoxGeometry(0.03, 0.4, 0.02)), mat(trim), side * 0.1, 0.06, 0.17);
      lapel.rotation.z = side * -0.15; p.torso.add(lapel);
    }
    p.torso.add(mesh(geo('queen-collar', () => new T.TorusGeometry(0.15, 0.025, 8, 20, Math.PI * 1.4)), mat(cloth), 0, 0.3, 0)).children.at(-1).rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
  }
  // Katana rangé dans son fourreau, en travers du dos (poignée au-dessus de l'épaule droite)
  function backKatana(p, o = {}) {
    const g = new T.Group(); g.position.set(0, 0.16, -0.235); g.rotation.z = -0.75;
    g.add(mesh(geo('bk-saya', () => new T.CylinderGeometry(0.022, 0.02, 0.62, 10)), mat(o.saya || '#1d1d24', { roughness: 0.5 }), 0, -0.05, 0));
    g.add(mesh(geo('bk-kojiri', () => new T.CylinderGeometry(0.024, 0.024, 0.03, 10)), metalMat(o.guard || '#c9a227'), 0, -0.36, 0));
    g.add(mesh(geo('tsuba', () => new T.CylinderGeometry(0.045, 0.045, 0.012, 14)), metalMat(o.guard || '#c9a227'), 0, 0.265, 0));
    g.add(mesh(geo('bk-handle', () => new T.CylinderGeometry(0.017, 0.017, 0.16, 8)), mat(o.wrap || '#c9a227'), 0, 0.35, 0));
    p.torso.add(g); p.backKatana = g;
  }
  function shuriken(p, o) {
    const star = shurikenMesh(o);
    star.position.set(0, 0.18, -0.2); star.rotation.z = 0.4;
    p.torso.add(star); p.shuriken = star;
  }
  // Mur de terre (pion) : bloc de roche qui sort du sol devant le personnage
  function earthWall(p) {
    if (p.earthWall) return p.earthWall;
    const w = new T.Group(); w.position.set(0, 0, 0.3);
    const rock = mat('#8a6239'), dark = mat('#5e4126');
    const slab = new T.Mesh(geo('wall', () => new T.BoxGeometry(0.56, 0.48, 0.11).translate(0, 0.24, 0)), rock); w.add(slab);
    for (const [x, y, s] of [[-0.18, 0.12, 0.09], [0.15, 0.3, 0.07], [0.02, 0.4, 0.06], [0.22, 0.08, 0.08], [-0.1, 0.36, 0.05]]) {
      const r = mesh(geo('rock', () => new T.DodecahedronGeometry(1, 0)), dark, x, y, 0.06); r.scale.setScalar(s); w.add(r);
    }
    w.visible = false; p.root.add(w); p.earthWall = w;
    // Les pions utilisent déjà ce mur dans leur garde habituelle.
    if (!p.wall) p.wall = w;
    return w;
  }
  // Mur de glace (roi) : cristaux translucides
  function iceWall(p) {
    const w = new T.Group(); w.position.set(0, 0, 0.32);
    const ice = mat('#9fe3ff', { basic: true, opacity: 0.55 }), edge = mat('#e8fbff', { basic: true, opacity: 0.8 });
    for (const [x, h, r, tilt] of [[-0.22, 0.42, 0.08, 0.2], [-0.08, 0.6, 0.1, 0.05], [0.08, 0.54, 0.09, -0.08], [0.22, 0.38, 0.08, -0.22], [0, 0.3, 0.12, 0]]) {
      const c = new T.Mesh(geo('crystal' + h, () => new T.ConeGeometry(r, h, 5).translate(0, h / 2, 0)), ice);
      c.position.x = x; c.rotation.z = tilt; w.add(c);
      const e = new T.Mesh(geo('crystalE' + h, () => new T.ConeGeometry(r * 0.35, h * 0.9, 5).translate(0, h * 0.45, 0)), edge);
      e.position.set(x, 0, 0.03); e.rotation.z = tilt; w.add(e);
    }
    w.visible = false; p.root.add(w); p.wall = w;
  }
  // Flammes de la tour : jet de feu qui part des mains vers l'avant
  function fireHands(p) {
    const f = new T.Group(); f.position.set(0, 0.5, 0.22);
    const outer = mesh(geo('flame1', () => new T.ConeGeometry(0.16, 0.5, 12, 1, true).translate(0, 0.25, 0).rotateX(Math.PI / 2)), mat('#ff6a1a', { basic: true, opacity: 0.75, additive: true, double: true }));
    const inner = mesh(geo('flame2', () => new T.ConeGeometry(0.08, 0.4, 10, 1, true).translate(0, 0.2, 0).rotateX(Math.PI / 2)), mat('#ffe27a', { basic: true, opacity: 0.9, additive: true, double: true }));
    f.add(outer, inner);
    f.visible = false; p.root.add(f); p.flame = f;
  }
  // Pièces d'armure de samouraï : plastron laqué, épaulières, jupe d'écailles
  function samuraiArmor(p, lacquer, lace) {
    p.torso.add(mesh(geo('do', () => new T.CylinderGeometry(0.155, 0.175, 0.2, 14)), mat(lacquer), 0, 0.15, 0));
    for (let i = 0; i < 3; i++) p.torso.add(mesh(geo('dolace', () => new T.CylinderGeometry(0.178, 0.178, 0.012, 14)), mat(lace), 0, 0.08 + i * 0.06, 0));
    for (const side of [-1, 1]) {
      const sode = mesh(geo('sode', () => new T.BoxGeometry(0.12, 0.14, 0.16)), mat(lacquer), side * 0.23, 0.22, 0);
      sode.rotation.z = side * 0.3; p.torso.add(sode);
      p.torso.add(mesh(geo('sodelace', () => new T.BoxGeometry(0.125, 0.015, 0.165)), mat(lace), side * 0.235, 0.2, 0)).children.at(-1).rotation.z = side * 0.3;
    }
    const skirt = mesh(geo('kusazuri', () => new T.CylinderGeometry(0.17, 0.22, 0.12, 14, 1, true)), mat(lacquer, { double: true }), 0, -0.02, 0);
    p.torso.add(skirt);
    // fourreau à la hanche gauche
    const saya = mesh(geo('saya', () => new T.CylinderGeometry(0.02, 0.018, 0.5, 8)), mat('#1d1d24'), -0.17, 0.0, -0.05);
    saya.rotation.set(1.2, 0, 0.25); p.torso.add(saya);
  }
  // Kanji blanc sur fond coloré, pour le chapeau et le dos du manteau de Hokage
  const kanjiCache = new Map();
  function kanjiTexture(text, bg, fg, vertical) {
    const key = text + bg + fg + vertical;
    if (!kanjiCache.has(key)) {
      const c = document.createElement('canvas');
      c.width = vertical ? 128 : 256; c.height = vertical ? 256 : 128;
      const ctx = c.getContext('2d');
      if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 100px "Noto Sans CJK JP", "Yu Gothic", "MS Gothic", sans-serif';
      if (vertical) [...text].forEach((ch, i) => ctx.fillText(ch, 64, 70 + i * 116));
      else ctx.fillText(text, 128, 70);
      const tex = new T.CanvasTexture(c);
      if ('colorSpace' in tex) tex.colorSpace = T.SRGBColorSpace;
      kanjiCache.set(key, tex);
    }
    return kanjiCache.get(key);
  }
  // Chapeau de Hokage : large chapeau conique blanc, panneau rouge frappé de « 火 » sur le devant
  // Chapeau de chef : tricorne à la couleur du camp, un angle pointé vers l'avant, galon doré et plaque « 火 »
  // Losange de couleur avec « 火 » au centre, transparent autour (plaque avant du chapeau de Kage)
  const diamondCache = new Map();
  function diamondTexture(bg, fg) {
    const key = bg + fg;
    if (!diamondCache.has(key)) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(64, 2); ctx.lineTo(126, 64); ctx.lineTo(64, 126); ctx.lineTo(2, 64); ctx.closePath(); ctx.fill();
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 54px "Noto Sans CJK JP", "Yu Gothic", "MS Gothic", sans-serif';
      ctx.fillText('火', 64, 68);
      const tex = new T.CanvasTexture(c);
      if ('colorSpace' in tex) tex.colorSpace = T.SRGBColorSpace;
      diamondCache.set(key, tex);
    }
    return diamondCache.get(key);
  }
  // Chapeau de Kage : pyramide à quatre pans (un angle pointé vers l'avant), bord clair, losange « 火 » devant,
  // deux attaches sur le côté et un voile qui retombe sur les épaules et la nuque, le visage restant dégagé.
  function hokageHat(head, o) {
    const base = 0.335, h = 0.24, R = 0.37;
    head.add(mesh(geo('kage-pyramid', () => new T.ConeGeometry(R, h, 4, 1, true)), mat(o.top, { double: true, roughness: 0.7 }), 0, base + h / 2, 0));
    head.add(mesh(geo('kage-floor', () => new T.CylinderGeometry(R, R, 0.008, 4)), mat(o.rim, { roughness: 0.7 }), 0, base, 0));
    head.add(mesh(geo('kage-rim', () => new T.CylinderGeometry(R + 0.008, R + 0.008, 0.026, 4, 1, true)), mat(o.rim, { double: true }), 0, base + 0.004, 0));
    // losange sur l'arête avant, incliné comme la pente du chapeau
    const slope = Math.atan2(h, R), t = 0.42;
    const panel = new T.Mesh(geo('kage-diamond', () => new T.PlaneGeometry(0.17, 0.17)), new T.MeshStandardMaterial({ map: diamondTexture(o.panel, o.text), transparent: true, roughness: 0.7, side: T.DoubleSide }));
    panel.position.set(0, base + h * t + 0.012, R * (1 - t) + 0.018); panel.rotation.x = -(Math.PI / 2 - slope);
    head.add(panel);
    // deux attaches grises sur le pan droit
    for (const k of [0, 1]) {
      const clip = mesh(geo('kage-clip', () => new T.CylinderGeometry(0.012, 0.012, 0.09, 8)), mat('#8c9096', { metalness: 0.4, roughness: 0.4 }), 0.13 + k * 0.05, base + 0.1 - k * 0.025, 0.07 - k * 0.04);
      clip.rotation.set(0.6, 0, -0.9); head.add(clip);
    }
    // voile ouvert devant
    const veil = mesh(geo('kage-veil', () => {
      const g = new T.CylinderGeometry(0.27, 0.33, 0.5, 28, 4, true, 0.62, Math.PI * 2 - 1.24);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(x, z);
        const fold = 1 + Math.sin(a * 9) * 0.05 * (0.5 - y);
        pos.setXYZ(i, x * fold, y, z * fold);
      }
      g.computeVertexNormals();
      return g;
    }), mat(o.veil, { double: true, roughness: 0.9 }), 0, base - 0.25, -0.01);
    head.add(veil);
  }
  // Manteau de Hokage : long manteau ouvert devant, flammes à l'ourlet, « 火影 » brodé dans le dos
  function hokageRobe(p, cloth, flame) {
    const robe = mesh(
      geo('kage-robe', () => new T.CylinderGeometry(0.2, 0.31, 0.72, 24, 1, true, 0.42, Math.PI * 2 - 0.84)),
      mat(cloth, { double: true, roughness: 0.85 }),
      0, -0.06, -0.01,
    );
    p.torso.add(robe); p.cloak = robe;
    const flames = mat(flame, { double: true });
    const tongue = geo('kage-flame', () => new T.ConeGeometry(0.045, 0.16, 4));
    for (let i = 0; i < 16; i++) {
      const a = 0.55 + i * (Math.PI * 2 - 1.1) / 15;
      const f = mesh(tongue, flames, Math.sin(a) * 0.307, -0.35 + (i % 2) * 0.02, Math.cos(a) * 0.307 - 0.01);
      f.scale.y = 0.8 + (i % 3) * 0.25; p.torso.add(f);
    }
    const back = new T.Mesh(geo('kage-back', () => new T.PlaneGeometry(0.11, 0.22)), new T.MeshBasicMaterial({ map: kanjiTexture('火影', null, flame, true), transparent: true, depthWrite: false }));
    back.position.set(0, 0.0, -0.275); back.rotation.set(-0.13, Math.PI, 0); p.torso.add(back);
    for (const side of [-1, 1]) {
      const lapel = mesh(geo('kage-lapel', () => new T.BoxGeometry(0.035, 0.36, 0.02)), mat(cloth), side * 0.085, 0.1, 0.172);
      lapel.rotation.z = side * -0.12; p.torso.add(lapel);
    }
  }

  // Les deux cavaliers sont des ninjas en selle. La monture reste dans le même
  // groupe animé que le personnage afin de conserver les déplacements du plateau.
  function mountedNinja(black) {
    const rider = skeleton({
      shirt: black ? '#1d1d26' : '#eceef2', pants: black ? '#15151c' : '#d6d9df',
      belt: black ? '#c9a227' : '#2d3e70', sleeve: black ? '#1d1d26' : '#eceef2',
      shoes: black ? '#c9a227' : '#d6d9df', face: { eye: black ? '#222' : '#2f7fe0', fierce: true, mask: true },
    });
    const riderRoot = rider.root;
    rider.riderRoot = riderRoot;
    const root = new T.Group();
    riderRoot.scale.setScalar(0.68);
    riderRoot.position.set(0, 0.43, -0.03);
    root.add(riderRoot);
    rider.root = root;
    // Laisser le ninja assis, genoux écartés autour de la monture.
    rider.legL.rotation.z = -0.45; rider.legR.rotation.z = 0.45;
    const sphere = () => geo('mount-sphere', () => new T.SphereGeometry(1, 16, 12));
    const add = (parent, color, pos, scale, geometry = sphere()) => {
      const o = mesh(geometry, mat(color), ...pos); o.scale.set(...scale); parent.add(o); return o;
    };
    if (!black) {
      // Gros chien blanc : dos large, tête expressive, oreilles, queue et quatre pattes.
      add(root, '#f6f7fa', [0, 0.27, 0], [0.29, 0.24, 0.42]);
      rider.mountHead = add(root, '#fff', [0, 0.35, 0.31], [0.22, 0.23, 0.22]);
      add(root, '#fff', [0, 0.26, 0.49], [0.15, 0.105, 0.16]);
      add(root, '#25232a', [0, 0.27, 0.62], [0.035, 0.03, 0.025]);
      rider.mountJaw = add(root, '#3a3030', [0, 0.19, 0.51], [0.075, 0.015, 0.055]);
      for (const side of [-1, 1]) {
        const ear = mesh(geo('dog-ear', () => new T.ConeGeometry(0.07, 0.2, 7)), mat('#f6f7fa'), side * 0.14, 0.54, 0.29);
        ear.rotation.z = side * 0.3; root.add(ear);
        add(root, '#25232a', [side * 0.105, 0.39, 0.46], [0.018, 0.022, 0.016]);
      }
      const legs = [];
      for (const x of [-0.18, 0.18]) for (const z of [-0.25, 0.25]) {
        const leg = new T.Group(); leg.position.set(x, 0.19, z); root.add(leg);
        add(leg, '#f6f7fa', [0, -0.09, 0], [0.07, 0.15, 0.075]);
        add(leg, '#e5e8ee', [0, -0.17, 0.025], [0.075, 0.04, 0.085]);
        legs.push(leg);
      }
      const tail = mesh(geo('dog-tail', () => new T.TorusGeometry(0.1, 0.035, 8, 14, Math.PI * 1.35)), mat('#fff'), 0, 0.48, -0.38);
      tail.rotation.x = 0.3; tail.rotation.z = -0.8; root.add(tail);
      // Selle rouge sous le cavalier.
      add(root, '#b83b36', [0, 0.48, -0.04], [0.25, 0.055, 0.24]);
      rider.mountLegs = legs;
    } else {
      // Aigle en vol : ailes articulées et déployées, plumage brun et poitrine claire.
      add(root, '#78512f', [0, 0.36, 0], [0.22, 0.2, 0.34]);
      add(root, '#f4eee2', [0, 0.32, 0.22], [0.16, 0.15, 0.22]);
      add(root, '#8b5d35', [0, 0.52, 0.27], [0.14, 0.16, 0.16]);
      add(root, '#e6ad36', [0, 0.48, 0.42], [0.055, 0.045, 0.11]);
      for (const side of [-1, 1]) {
        const eye = add(root, '#171717', [side * 0.085, 0.55, 0.37], [0.018, 0.022, 0.018]);
        const wing = new T.Group(); wing.position.set(side * 0.13, 0.4, -0.02); wing.userData.side = side; root.add(wing);
        const main = add(wing, '#6b4930', [side * 0.2, 0, 0], [0.32, 0.055, 0.2]); main.rotation.z = side * -0.16;
        for (let i = 0; i < 4; i++) {
          const feather = add(wing, i % 2 ? '#8a6240' : '#a17a50', [side * (0.28 + i * 0.055), -0.015, -0.08 + i * 0.045], [0.16, 0.025, 0.06]);
          feather.rotation.y = side * 0.12;
        }
        rider.mountWings = rider.mountWings || [];
        rider.mountWings.push(wing);
      }
      // Serres repliées sous le corps.
      for (const side of [-1, 1]) {
        const claw = mesh(geo('eagle-claw', () => new T.ConeGeometry(0.035, 0.16, 6)), mat('#e6ad36'), side * 0.09, 0.16, 0.16);
        claw.rotation.x = Math.PI; root.add(claw);
      }
      rider.fast = true;
    }
    return rider;
  }

  /* ---------- Les 12 personnages ---------- */
  const BUILD = {
    // Blancs
    P() {
      // Ninja blanc cagoulé, bandeau frontal
      const p = skeleton({ shirt: '#f3f3ef', pants: '#e6e6e1', belt: '#2d3e70', shoes: '#2d3e70', emblem: '#f3f3ef', face: { eye: '#2f7fe0' } });
      hood(p.head, '#f7f7f3'); headband(p.head, '#2d3e70', 0.216);
      p.blade = kunai(p.armR, { metal: '#3a3f48', wrap: '#2d3e70' }); earthWall(p); p.weapon = 'karate';
      return p;
    },
    N() {
      // Ninja masqué sur un grand chien blanc.
      const p = mountedNinja(false);
      spikes(p.head, '#dfe3ea', { n: 12, len: 0.17 }); headband(p.head, '#2d3e70');
      samuraiArmor(p, '#e6e9ee', '#2d3e70');
      p.blade = katana(p.armR, { blade: '#e3e8ef', guard: '#c9a227' }, 0.7); p.weapon = 'katana'; p.fast = true;
      return p;
    },
    B() {
      const p = skeleton({ shirt: '#f2f2ee', pants: '#dcdcd6', vest: '#c9d0da', belt: '#2d3e70', shoes: '#cfd2d8', face: { eye: '#3a2a1a', grin: true, marks: true } });
      spikes(p.head, '#f4f4f4', { n: 12 }); headband(p.head, '#2d3e70');
      const hair = mesh(geo('longhair', () => new T.CylinderGeometry(0.1, 0.16, 0.42, 12)), mat('#f4f4f4'), 0, 0.02, -0.14); p.head.add(hair);
      shuriken(p, { metal: '#8c96a8', hub: '#555b66' }); p.weapon = 'fist';
      return p;
    },
    R() {
      const p = skeleton({ wide: 1.25, shirt: '#efede6', pants: '#d6d6d0', vest: '#c8ccd4', belt: '#2d3e70', face: { eye: '#2e6b3a', fierce: true } });
      spikes(p.head, '#8a3b22', { n: 12, len: 0.12 }); headband(p.head, '#2d3e70');
      fireHands(p); p.weapon = 'element';
      return p;
    },
    Q() {
      const p = skeleton({ shirt: '#f5f3ee', pants: '#e1e1dc', hand: '#3a2f45', belt: '#d32f4f', emblem: '#f5f3ee', face: { eye: '#2fa86b' } });
      const cap = mesh(geo('qcap', () => new T.SphereGeometry(0.205, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45)), mat('#f48fb1'), 0, 0.18, 0); p.head.add(cap);
      longHair(p, '#f48fb1');
      queenCoat(p, '#fbfbf7', '#d32f4f');
      headband(p.head, '#d32f4f');
      p.blades = [katana(p.armL, { square: true, blade: '#cfd6df', guard: '#222' }, 0.65), katana(p.armR, { square: true, blade: '#cfd6df', guard: '#222' }, 0.65)]; p.weapon = 'dual';
      return p;
    },
    K() {
      // Roi blanc en Hokage : manteau blanc à flammes rouges et chapeau de Kage
      const p = skeleton({ wide: 1.15, shirt: '#f0f0ea', pants: '#e1e1dc', belt: '#e8452c', face: { eye: '#2f7fe0', grin: true } });
      hokageRobe(p, '#fbfbf6', '#e8452c');
      hokageHat(p.head, { top: '#9e1217', rim: '#f7f7f2', panel: '#f7f7f2', text: '#b51f24', veil: '#f4f4f0' });
      aura(p, '#ffd23a', 3);
      lightning(p);
      iceWall(p); p.weapon = 'brawl';
      return p;
    },
    // Noirs
    p() {
      // Ninja noir cagoulé, bandeau frontal
      const p = skeleton({ shirt: '#18181e', pants: '#18181e', pads: '#2c2c35', belt: '#c9a227', shoes: '#18181e', face: { eye: '#222', fierce: true } });
      hood(p.head, '#141418'); headband(p.head, '#8b1e2d', 0.216);
      p.blade = kunai(p.armR, { metal: '#9aa3b5', wrap: '#c9a227' }); earthWall(p); p.weapon = 'karate';
      return p;
    },
    n() {
      // Ninja guerrier porté par un aigle qui vole, armure bleu nuit et lame d'énergie.
      const p = mountedNinja(true);
      blackHair(p.head, 1);
      samuraiArmor(p, '#1c1c24', '#c9a227');
      aura(p, '#6fb7ff', 1);
      p.blade = katana(p.armR, { blade: '#9fdcff', guard: '#c9a227' }, 0.8); p.weapon = 'katana'; p.fast = true;
      return p;
    },
    b() {
      const p = skeleton({ shirt: '#1d1d26', pants: '#17171e', belt: '#c9a227', sleeve: '#2b2b36', shoes: '#2b2b36', emblem: '#1d1d26', face: { eye: '#222' } });
      blackHair(p.head, 2);
      for (let i = 0; i < 6; i++) p.head.add(mesh(geo('dot', () => new T.SphereGeometry(0.012, 6, 4)), mat('#b8735a'), (i % 3 - 1) * 0.04, 0.33 + (i < 3 ? 0 : 0.03), 0.08 - (i < 3 ? 0 : 0.03)));
      shuriken(p, { metal: '#f2c230', hub: '#2a4fa8' }); p.weapon = 'fist';
      backKatana(p, { saya: '#1b1b24', guard: '#c9a227', wrap: '#2a4fa8' });
      aura(p, '#ffffff', 1);
      return p;
    },
    r() {
      const p = skeleton({ wide: 1.3, shirt: '#22222b', pants: '#17171e', pads: '#c9a227', belt: '#c9a227', shoes: '#22222b', face: { eye: '#222', fierce: true, scar: true } });
      blackHair(p.head);
      aura(p, '#be78ff', 1.5);
      fireHands(p); p.weapon = 'element';
      return p;
    },
    q() {
      const p = skeleton({ shirt: '#18181f', pants: '#121218', pads: '#8b1e2d', belt: '#8b1e2d', shoes: '#18181f', face: { eye: '#222', fierce: true } });
      blackHair(p.head, 1);
      longHair(p, '#171820');
      queenCoat(p, '#16161c', '#8b1e2d');
      aura(p, '#ff5a46', 2);
      p.blades = [katana(p.armL, { square: true, blade: '#b9c0ca', guard: '#c9a227' }, 0.65), katana(p.armR, { square: true, blade: '#b9c0ca', guard: '#c9a227' }, 0.65)]; p.weapon = 'dual';
      return p;
    },
    k() {
      const p = skeleton({ shirt: '#232338', pants: '#232338', pads: '#f3f0e6', belt: '#f2c230', shoes: '#f3f0e6', emblem: '#232338', face: { eye: '#1fa58f', fierce: true } });
      blackHair(p.head, 2);
      // Roi noir en Hokage : manteau sombre à flammes rouges et chapeau de Kage
      hokageRobe(p, '#2a2438', '#e8452c');
      hokageHat(p.head, { top: '#141416', rim: '#141416', panel: '#c0262b', text: '#141416', veil: '#d9c497' });
      aura(p, '#ffd23a', 3);
      lightning(p);
      iceWall(p); p.weapon = 'brawl';
      return p;
    },
  };

  const SCALE = 1.45;
  const SIZE = { p: 0.82, n: 0.9, b: 0.92, r: 1.4, q: 1.0, k: 1.1 };

  function build(THREE, piece) {
    T = THREE;
    const parts = BUILD[piece]();
    const k = SIZE[piece.toLowerCase()] * SCALE * (parts.scaleK || 1);
    if (parts.head) parts.head.scale.setScalar(0.5);
    parts.root.scale.setScalar(k);
    parts.piece = piece;
    parts.phase = Math.random() * Math.PI * 2;
    parts.root.traverse((o) => { if (o.isMesh) o.userData.char = parts; });
    return parts;
  }

  function animateAura(p, t, state) {
    if (p.aura) {
      const power = p.auraPower;
      const f = 1 + Math.sin(t * 13 + p.phase) * 0.05 + Math.sin(t * 7.3) * 0.04;
      p.aura.children[0].scale.set(f, 1 + Math.sin(t * 9 + p.phase) * 0.08, f);
      p.aura.children[1].scale.set(1.05 - (f - 1), 1 + Math.sin(t * 11) * 0.06, 1.05 - (f - 1));
      p.aura.rotation.y = t * 0.8;
      for (const s of p.aura.userData.sparks) {
        const u = ((t * (0.6 + power * 0.15) + s.userData.seed) % 1);
        s.position.set(Math.cos(s.userData.ang) * 0.28 * (1 - u * 0.5), u * 1.15, Math.sin(s.userData.ang) * 0.28 * (1 - u * 0.5));
        s.scale.setScalar(1 - u * 0.7);
      }
      p.aura.scale.setScalar(state === 'select' || state === 'run' || state === 'cast' ? 1.18 : 1);
    }
  }

  // Le mur (terre ou glace) sort du sol : h de 0 (caché) à 1 (levé)
  function setWall(p, h) {
    if (!p.wall) return;
    p.wall.visible = h > 0.02;
    p.wall.scale.set(1, Math.max(0.02, h), 1);
  }
  // Mur de terre levé spécifiquement pour parer une riposte à distance.
  function setEarthWall(p, h) {
    const wall = earthWall(p);
    wall.visible = h > 0.02;
    wall.scale.set(1, Math.max(0.02, h), 1);
  }
  // Intensité des flammes de la tour (0 = éteintes)
  function setFlame(p, f, t) {
    if (!p.flame) return;
    p.flame.visible = f > 0.02;
    const w = 0.8 + Math.random() * 0.4;
    p.flame.scale.set(f * w, f * w, f * (0.9 + Math.sin(t * 40) * 0.15));
  }

  /* Pose du personnage à l'instant t (secondes).
     state : idle | select | run | punch | guard | cast | ko | victory | kneel
     punch : k compte les coups (partie entière = numéro du coup, partie décimale = avancement) */
  function animate(p, t, state = 'idle', k = 0) {
    const ph = t + p.phase;
    const breathe = Math.sin(ph * 2.2);
    p.torso.position.y = 0.22 + breathe * 0.006;
    p.torso.rotation.set(0, 0, 0);
    p.head.rotation.set(Math.sin(ph * 0.9) * 0.05, Math.sin(ph * 0.6) * 0.18, 0);
    p.armL.rotation.set(Math.sin(ph * 2.2) * 0.08, 0, -0.25 - breathe * 0.04);
    p.armR.rotation.set(-Math.sin(ph * 2.2) * 0.08, 0, 0.25 + breathe * 0.04);
    p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0);
    p.root.position.y = 0;
    p.root.position.z = 0;
    if (p.mountWings) p.mountWings.forEach((w) => { w.rotation.z = w.userData.side * (0.12 + Math.sin(t * 7 + p.phase) * 0.28); });
    if (p.mountLegs) p.mountLegs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * 7 + i * Math.PI / 2) * 0.08; });
    const hit = Math.floor(k), e = k - hit, swing = Math.sin(Math.min(1, e) * Math.PI);
    setWall(p, 0); setFlame(p, 0, t);

    if (state === 'select') {
      const hop = Math.abs(Math.sin(t * 6));
      p.root.position.y = hop * 0.12;
      p.armL.rotation.z = -2.4 + hop * 0.3; p.armR.rotation.z = 2.4 - hop * 0.3; // bras levés, prêt au combat
      p.legL.rotation.x = -hop * 0.4; p.legR.rotation.x = hop * 0.2;
    } else if (state === 'run') {
      const s = Math.sin(t * (p.fast ? 26 : 18));
      p.legL.rotation.x = s * 0.8; p.legR.rotation.x = -s * 0.8;
      p.armL.rotation.x = 0.9; p.armR.rotation.x = 0.9; // course ninja, bras en arrière
      p.torso.rotation.x = p.fast ? 0.5 : 0.3;
      p.armL.rotation.z = -0.3; p.armR.rotation.z = 0.3;
    } else if (state === 'punch') {
      p.armR.rotation.x = -1.6 * swing; p.armR.rotation.z = 0.1;
      p.torso.rotation.y = -0.4 * swing; p.legL.rotation.x = -0.5 * swing;
    } else if (state === 'guard') {
      // garde : avant-bras croisés devant le visage
      p.armL.rotation.set(-1.9, 0, 0.6); p.armR.rotation.set(-1.9, 0, -0.6);
      p.torso.rotation.x = 0.1; p.legL.rotation.x = -0.3; p.legR.rotation.x = 0.3;
      setWall(p, Math.min(1, k));
    } else if (state === 'cast') {
      // signes des mains, puis poussée vers l'avant (k : 0 → 1)
      if (k < 0.6) {
        const s = Math.sin(t * 22) * 0.12;
        p.armL.rotation.set(-1.25 + s, 0, 0.55); p.armR.rotation.set(-1.25 - s, 0, -0.55);
        p.head.rotation.x = 0.15;
      } else {
        const u = Math.min(1, (k - 0.6) / 0.4);
        p.armL.rotation.set(-1.25 - 0.35 * u, 0, 0.55 - 0.45 * u); p.armR.rotation.set(-1.25 - 0.35 * u, 0, -0.55 + 0.45 * u);
        p.torso.rotation.x = 0.2 * u; p.legL.rotation.x = -0.6 * u; p.legR.rotation.x = 0.3 * u;
      }
    } else if (state === 'ko') {
      p.armL.rotation.z = -2.6; p.armR.rotation.z = 2.6; p.legL.rotation.x = 0.6; p.legR.rotation.x = -0.4;
      p.head.rotation.x = -0.5;
    } else if (state === 'victory') {
      const blend = Math.min(1, Math.max(0, k));
      const hop = Math.max(0, Math.sin(t * 7 + p.phase));
      p.root.position.y = hop * 0.3 * blend;
      p.armL.rotation.set(0, 0, -0.25 - 2.05 * blend);
      p.armR.rotation.set(0, 0, 0.25 + 2.05 * blend);
      p.legL.rotation.x = -0.35 * hop * blend;
      p.legR.rotation.x = 0.35 * hop * blend;
      p.torso.rotation.z = Math.sin(t * 7 + p.phase) * 0.06 * blend;
      p.head.rotation.x = -0.08 * blend;
    } else if (state === 'kneel') {
      const blend = Math.min(1, Math.max(0, k));
      p.root.position.y = -0.08 * blend + breathe * 0.004 * blend;
      p.torso.position.y = 0.22 - 0.06 * blend;
      p.torso.rotation.x = 0.32 * blend;
      p.head.rotation.x = 0.25 * blend;
      p.armL.rotation.set(-0.55 * blend, 0, -0.25 - 0.15 * blend);
      p.armR.rotation.set(-0.55 * blend, 0, 0.25 + 0.15 * blend);
      p.legL.rotation.x = 1.05 * blend;
      p.legR.rotation.x = 1.05 * blend;
    }

    if (p.weapon === 'karate') {
      // pion : kunai en main droite, karaté de l'autre ; coups de poing, de pied et de kunai en alternance
      if (state === 'idle') { p.armL.rotation.set(-1.1, 0, -0.1); p.armR.rotation.set(-0.5, 0, 0.35); p.legL.rotation.x = -0.15; }
      else if (state === 'select') { p.armL.rotation.set(-1.4, 0, 0.2); p.armR.rotation.set(-2.5, 0, 0.3); }
      else if (state === 'punch') {
        const move = hit % 3;
        p.armL.rotation.set(-1.1, 0, -0.1); p.armR.rotation.set(-0.6, 0, 0.35);
        if (move === 0) { p.armL.rotation.set(-1.6 * swing - 0.4, 0, 0.05); p.torso.rotation.y = 0.45 * swing; } // direct du gauche
        else if (move === 1) { p.legR.rotation.x = -1.7 * swing; p.torso.rotation.x = -0.25 * swing; p.root.position.y = 0.03 * swing; } // mae-geri
        else { p.armR.rotation.set(-2.6 + 2.5 * e, 0, 0.3 - 0.5 * e); p.torso.rotation.y = -0.45 * swing; } // taillade au kunai
      }
    } else if (p.weapon === 'fist') {
      // fou : arts martiaux à mains nues, le shuriken reste dans le dos
      if (state === 'idle') { p.armL.rotation.set(-0.9, 0, -0.15); p.armR.rotation.set(-0.5, 0, 0.2); }
      else if (state === 'punch') {
        // enchaînement poing, poing, coup de pied retourné
        const move = hit % 3;
        p.armL.rotation.set(-1.0, 0, -0.1); p.armR.rotation.set(-1.0, 0, 0.1);
        if (move === 0) { p.armR.rotation.set(-1.6 * swing - 0.2, 0, 0.05); p.torso.rotation.y = -0.5 * swing; }
        else if (move === 1) { p.armL.rotation.set(-1.6 * swing - 0.2, 0, -0.05); p.torso.rotation.y = 0.5 * swing; }
        else { p.root.position.y = 0.12 * swing; p.torso.rotation.y = -Math.PI * 2 * e; p.legR.rotation.set(-1.9 * swing, 0, 0.6 * swing); }
      } else if (state === 'throw') {
        // k : 0 → 1, bras armé derrière l'épaule puis projeté vers l'avant
        p.armR.rotation.set(k < 0.4 ? -2.9 * (k / 0.4) : -2.9 + 1.9 * Math.min(1, (k - 0.4) * 2.5), 0, 0.2);
        p.torso.rotation.y = k < 0.4 ? 0.5 * (k / 0.4) : 0.5 - 1.0 * Math.min(1, (k - 0.4) * 2.5);
      }
    } else if (p.weapon === 'katana') {
      // samouraï : main sur la poignée, frappes éclair
      if (state === 'idle') { p.armR.rotation.set(-0.4, 0, 0.35); p.armL.rotation.set(-0.5, 0, -0.1); }
      else if (state === 'select') { p.armR.rotation.set(-2.7, 0, 0.2); p.armL.rotation.set(-2.5, 0, -0.2); }
      else if (state === 'run') { p.armR.rotation.set(0.6, 0, 0.5); p.armL.rotation.set(0.6, 0, -0.3); } // lame tenue derrière, course penchée
      else if (state === 'punch') {
        const dir = hit % 2 ? -1 : 1;
        p.armR.rotation.set(-2.8 + 2.7 * Math.min(1, e * 1.6), 0, 0.2 + dir * 0.5 * swing);
        p.armL.rotation.set(-1.6 + 1.0 * e, 0, -0.2);
        p.torso.rotation.y = dir * -0.6 * swing; p.legL.rotation.x = -0.7 * swing; p.legR.rotation.x = 0.4 * swing;
      }
    } else if (p.weapon === 'dual') {
      // dame : deux sabres ninja
      if (state === 'idle') { p.armL.rotation.set(-0.45, 0, -0.35); p.armR.rotation.set(-0.45, 0, 0.35); }
      else if (state === 'select') { const s = Math.sin(t * 8); p.armL.rotation.set(-2.2 + s * 0.3, 0, -0.6); p.armR.rotation.set(-2.2 - s * 0.3, 0, 0.6); p.torso.rotation.y = s * 0.3; }
      else if (state === 'run') { p.armL.rotation.set(0.7, 0, -0.5); p.armR.rotation.set(0.7, 0, 0.5); }
      else if (state === 'punch') {
        const a = hit % 2 ? 1 : -1; // taillades croisées alternées
        p.armL.rotation.set(-2.6 + 2.4 * e, 0, -0.6 + 1.0 * e * (a > 0 ? 1 : 0.4)); p.armR.rotation.set(-2.6 + 2.4 * e, 0, 0.6 - 1.0 * e * (a < 0 ? 1 : 0.4));
        p.torso.rotation.y = a * 0.35 * swing;
      }
    } else if (p.weapon === 'brawl') {
      // roi : combat à mains nues, enchaînement direct du gauche, crochet du droit, coup de pied de face, coup de pied circulaire
      if (state === 'idle') { p.armR.rotation.set(-1.0, 0, 0.35); p.armL.rotation.set(-1.15, 0, -0.35); }
      else if (state === 'select') { p.armR.rotation.set(-1.3, 0, 0.3); p.armL.rotation.set(-1.45, 0, -0.3); p.root.position.y = Math.abs(Math.sin(t * 4)) * 0.05; }
      else if (state === 'run') { p.armR.rotation.set(-0.9, 0, 0.3); p.armL.rotation.set(-0.9, 0, -0.3); }
      else if (state === 'punch') {
        const move = hit % 4;
        p.armR.rotation.set(-1.0, 0, 0.35); p.armL.rotation.set(-1.15, 0, -0.35);
        if (move === 0) { p.armL.rotation.set(-1.6 * swing - 0.3, 0, 0.05); p.torso.rotation.y = 0.4 * swing; } // direct du gauche
        else if (move === 1) { p.armR.rotation.set(-1.55, 0, 0.9 - 1.3 * swing); p.torso.rotation.y = -0.6 * swing; } // crochet du droit
        else if (move === 2) { p.legR.rotation.x = -1.7 * swing; p.torso.rotation.x = -0.25 * swing; p.root.position.y = 0.03 * swing; } // coup de pied de face
        else { p.legL.rotation.set(-1.2 * swing, 0, 1.0 * swing); p.torso.rotation.set(-0.15 * swing, 0.9 * swing, 0.3 * swing); p.root.rotation.y = 0.5 * swing; } // coup de pied circulaire
      }
    } else if (p.weapon === 'element') {
      // tour : géant qui crache le feu à bout portant, paumes en avant
      if (state === 'idle') { p.armL.rotation.set(-0.3, 0, -0.3); p.armR.rotation.set(-0.3, 0, 0.3); }
      else if (state === 'punch') {
        p.armL.rotation.set(-1.5, 0, 0.35); p.armR.rotation.set(-1.5, 0, -0.35);
        p.torso.rotation.x = 0.1 * swing;
        setFlame(p, 0.4 + swing * 0.8, t);
      }
    }
    if (p.shuriken) p.shuriken.rotation.z = state === 'select' ? t * 10 : 0.4;
    if (p.blades) for (const b of p.blades) b.visible = state !== 'cast';
    if (p.tail) p.tail.rotation.x = Math.sin(ph * 3) * 0.3;
    if (p.pony) p.pony.rotation.z = Math.sin(ph * 2.5) * 0.15;
    if (p.cloak) p.cloak.scale.x = 1 + Math.sin(ph * 1.8) * 0.04;
    animateAura(p, t, state);
    if (p.bolts) {
      p.bolts.rotation.y = t * 2;
      p.bolts.children.forEach((b, i) => { b.visible = Math.sin(t * 23 + i * 5) > 0.55; });
    }
  }

  root.Models3D = { build, animate, setWall, setEarthWall, setFlame, shurikenMesh: (THREE, o) => { T = THREE; return shurikenMesh(o); }, SIZE, SCALE };
})(window);
