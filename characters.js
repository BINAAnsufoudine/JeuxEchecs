/* Cavalier — personnages style manga dessinés au canvas (créations originales).
   Blancs : clan de ninjas. Noirs : guerriers à aura, plus puissants selon le rang de la pièce. */
(function (root) {
  'use strict';

  const W = 256, H = 384;
  const SKIN = '#ffd9b8', SKIN_SHADE = '#f0b994', LINE = '#2a1d1a';

  function poly(ctx, pts, fill, stroke = LINE, lw = 4) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function ellipse(ctx, x, y, rx, ry, fill, stroke = LINE, lw = 4) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  // Mèches en pointe autour d'un arc (cheveux manga)
  function spikes(ctx, cx, cy, r, n, len, a0, a1, fill, jitter = 0.25) {
    const pts = [];
    for (let i = 0; i <= n * 2; i++) {
      const t = a0 + ((a1 - a0) * i) / (n * 2);
      const rr = i % 2 ? r + len * (1 - jitter + ((i * 37) % 10) / 10 * jitter * 2) : r * 0.92;
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
    pts.push([cx, cy + r * 0.2]);
    poly(ctx, pts, fill);
  }
  function aura(ctx, cx, cy, rx, ry, inner, outer) {
    const g = ctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, inner); g.addColorStop(0.6, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n * 2; i++) {
      const t = -Math.PI / 2 + (Math.PI * 2 * i) / (n * 2);
      const k = i % 2 ? 1 : 0.8;
      const up = Math.sin(t) < 0 ? 1.25 : 1;
      const x = cx + Math.cos(t) * rx * k, y = cy + Math.sin(t) * ry * k * up;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
  function lightning(ctx, x, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x + 2, y + 22); ctx.lineTo(x + 14, y + 44); ctx.stroke();
  }

  function face(ctx, cx, cy, r, o = {}) {
    ellipse(ctx, cx, cy, r, r * 1.02, o.skin || SKIN);
    // joues
    ellipse(ctx, cx - r * 0.55, cy + r * 0.35, r * 0.14, r * 0.08, 'rgba(255,120,120,0.35)', null);
    ellipse(ctx, cx + r * 0.55, cy + r * 0.35, r * 0.14, r * 0.08, 'rgba(255,120,120,0.35)', null);
    const ey = cy + r * 0.08, ex = r * 0.38;
    for (const s of [-1, 1]) {
      const x = cx + s * ex;
      if (o.closed) {
        ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.beginPath();
        ctx.arc(x, ey, r * 0.16, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
        continue;
      }
      ellipse(ctx, x, ey, r * 0.17, r * 0.24, '#fff', LINE, 3);
      ellipse(ctx, x + s * 2, ey + 3, r * 0.12, r * 0.18, o.eye || '#3a6fd8', null);
      ellipse(ctx, x + s * 2, ey + 5, r * 0.06, r * 0.1, '#111', null);
      ellipse(ctx, x - 3, ey - 6, r * 0.05, r * 0.06, '#fff', null);
      // sourcils
      ctx.strokeStyle = LINE; ctx.lineWidth = 5; ctx.beginPath();
      const tilt = o.fierce ? 8 : -2;
      ctx.moveTo(x - s * r * 0.2, ey - r * 0.36 - (o.fierce ? 0 : 2));
      ctx.lineTo(x + s * r * 0.18, ey - r * 0.36 + tilt * (o.fierce ? 1 : 0));
      ctx.stroke();
    }
    // bouche
    ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.beginPath();
    if (o.grin) { ctx.arc(cx, cy + r * 0.45, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill(); }
    else if (o.fierce) { ctx.moveTo(cx - r * 0.14, cy + r * 0.55); ctx.lineTo(cx + r * 0.14, cy + r * 0.5); }
    else ctx.arc(cx, cy + r * 0.42, r * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  // Corps commun : jambes, torse, bras
  function body(ctx, o) {
    const cx = W / 2, top = o.top || 196, w = o.w || 92, h = o.h || 110;
    const foot = H - 14;
    // jambes
    for (const s of [-1, 1]) {
      poly(ctx, [[cx + s * 8, top + h - 10], [cx + s * (w * 0.42), top + h - 10], [cx + s * (w * 0.38), foot - 16], [cx + s * 10, foot - 16]], o.pants);
      ellipse(ctx, cx + s * (w * 0.26), foot - 10, w * 0.2, 11, o.shoes || '#3b3b4a');
    }
    // bras
    for (const s of [-1, 1]) {
      poly(ctx, [[cx + s * (w * 0.4), top + 8], [cx + s * (w * 0.68), top + h * 0.55], [cx + s * (w * 0.5), top + h * 0.62], [cx + s * (w * 0.3), top + 30]], o.sleeve || o.shirt);
      ellipse(ctx, cx + s * (w * 0.6), top + h * 0.62, 13, 13, o.hand || SKIN);
    }
    // torse
    poly(ctx, [[cx - w * 0.42, top], [cx + w * 0.42, top], [cx + w * 0.5, top + h], [cx - w * 0.5, top + h]], o.shirt);
    if (o.belt) poly(ctx, [[cx - w * 0.49, top + h - 22], [cx + w * 0.49, top + h - 22], [cx + w * 0.5, top + h - 8], [cx - w * 0.5, top + h - 8]], o.belt, LINE, 3);
    if (o.vest) {
      poly(ctx, [[cx - w * 0.42, top], [cx - 6, top], [cx - 10, top + h - 22], [cx - w * 0.49, top + h - 22]], o.vest, LINE, 3);
      poly(ctx, [[cx + w * 0.42, top], [cx + 6, top], [cx + 10, top + h - 22], [cx + w * 0.49, top + h - 22]], o.vest, LINE, 3);
    }
    if (o.pads) for (const s of [-1, 1]) poly(ctx, [[cx + s * (w * 0.2), top - 6], [cx + s * (w * 0.78), top - 2], [cx + s * (w * 0.7), top + 34], [cx + s * (w * 0.36), top + 24]], o.pads);
    if (o.emblem) { ellipse(ctx, cx, top + 34, 15, 15, '#fff', LINE, 3); ctx.fillStyle = o.emblem; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.emblemChar || '武', cx, top + 35); }
  }

  // Tricorne vu de face : calotte, bords relevés et pointe avant qui descend vers le spectateur, galon doré
  function tricorne2d(ctx, cx, cy, r, color) {
    ellipse(ctx, cx, cy - r * 0.92, r * 0.72, r * 0.42, color);
    poly(ctx, [[cx - r * 1.55, cy - r * 0.95], [cx - r * 0.45, cy - r * 0.62], [cx, cy - r * 0.38], [cx + r * 0.45, cy - r * 0.62], [cx + r * 1.55, cy - r * 0.95], [cx + r * 0.95, cy - r * 0.62], [cx, cy - r * 0.5], [cx - r * 0.95, cy - r * 0.62]], color, LINE, 3);
    ctx.strokeStyle = '#d4a72c'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(cx - r * 1.5, cy - r * 0.93); ctx.lineTo(cx - r * 0.45, cy - r * 0.6); ctx.lineTo(cx, cy - r * 0.4); ctx.lineTo(cx + r * 0.45, cy - r * 0.6); ctx.lineTo(cx + r * 1.5, cy - r * 0.93); ctx.stroke();
    ellipse(ctx, cx, cy - r * 0.5, r * 0.09, r * 0.09, '#d4a72c');
    poly(ctx, [[cx - r * 0.2, cy - r * 1.1], [cx + r * 0.2, cy - r * 1.1], [cx + r * 0.2, cy - r * 0.8], [cx - r * 0.2, cy - r * 0.8]], '#d8352a', LINE, 2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('火', cx, cy - r * 0.95);
  }
  // Cagoule : tissu sur toute la tête, sauf une fente horizontale à hauteur des yeux
  function hood2d(ctx, cx, cy, r, cloth) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
    ctx.rect(cx + r * 0.78, cy - r * 0.2, -r * 1.56, r * 0.42); // fente des yeux (tracé inversé = trou)
    ctx.fillStyle = cloth; ctx.fill('evenodd');
    ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  function headband(ctx, cx, cy, r, cloth) {
    poly(ctx, [[cx - r * 1.02, cy - r * 0.42], [cx + r * 1.02, cy - r * 0.42], [cx + r * 0.98, cy - r * 0.18], [cx - r * 0.98, cy - r * 0.18]], cloth, LINE, 3);
    poly(ctx, [[cx - r * 0.42, cy - r * 0.48], [cx + r * 0.42, cy - r * 0.48], [cx + r * 0.42, cy - r * 0.12], [cx - r * 0.42, cy - r * 0.12]], '#c9d2dc', LINE, 3);
    // gravure : étoile à quatre branches (symbole du clan, original)
    ctx.strokeStyle = '#59626e'; ctx.lineWidth = 3; ctx.beginPath();
    const y = cy - r * 0.3;
    ctx.moveTo(cx, y - 11); ctx.lineTo(cx + 3, y - 3); ctx.lineTo(cx + 11, y); ctx.lineTo(cx + 3, y + 3);
    ctx.lineTo(cx, y + 11); ctx.lineTo(cx - 3, y + 3); ctx.lineTo(cx - 11, y); ctx.lineTo(cx - 3, y - 3); ctx.closePath(); ctx.stroke();
    // pans du bandeau
    poly(ctx, [[cx + r * 0.9, cy - r * 0.35], [cx + r * 1.45, cy - r * 0.05], [cx + r * 1.35, cy + r * 0.1], [cx + r * 0.85, cy - r * 0.2]], cloth, LINE, 3);
  }

  const HEAD = { cx: W / 2, cy: 128, r: 66 };

  // Montures des cavaliers : dessinées derrière un ninja en posture assise.
  function whiteDog2d(ctx) {
    // Queue et pattes arrière
    ctx.strokeStyle = '#d8dce4'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(64, 257); ctx.quadraticCurveTo(20, 230, 31, 207); ctx.stroke();
    for (const x of [76, 162]) {
      poly(ctx, [[x - 17, 269], [x + 4, 269], [x + 9, 329], [x - 10, 333]], '#f7f8fb');
      ellipse(ctx, x, 332, 15, 8, '#e4e7ed');
    }
    ellipse(ctx, 115, 255, 91, 51, '#fff', '#59616d', 4);
    // Poitrine, cou et tête
    ellipse(ctx, 180, 246, 42, 48, '#f7f8fb', '#59616d', 4);
    ellipse(ctx, 207, 208, 40, 34, '#fff', '#59616d', 4);
    poly(ctx, [[180, 189], [177, 151], [202, 178], [204, 198]], '#f4f5f8', '#59616d', 4);
    poly(ctx, [[214, 183], [238, 155], [239, 196], [225, 204]], '#f4f5f8', '#59616d', 4);
    ellipse(ctx, 225, 218, 22, 15, '#fff', '#59616d', 3);
    ellipse(ctx, 222, 205, 4, 5, '#2a1d1a', null);
    ellipse(ctx, 245, 220, 5, 4, '#333', null);
    // Selle rouge et harnais
    poly(ctx, [[117, 211], [174, 215], [163, 238], [110, 236]], '#c0392b', '#2a1d1a', 3);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(199, 208); ctx.quadraticCurveTo(189, 249, 166, 262); ctx.stroke();
  }
  function eagle2d(ctx) {
    // Ailes déployées en plein vol
    poly(ctx, [[128, 252], [95, 218], [16, 180], [52, 220], [8, 207], [67, 248], [22, 240], [91, 271]], '#6b4930', '#2a1d1a', 4);
    poly(ctx, [[128, 252], [161, 218], [240, 180], [204, 220], [248, 207], [189, 248], [234, 240], [165, 271]], '#6b4930', '#2a1d1a', 4);
    for (let i = 0; i < 4; i++) {
      const y = 222 + i * 9;
      ctx.strokeStyle = i % 2 ? '#9b714b' : '#d0ab70'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(65, y); ctx.lineTo(20 + i * 5, y - 25 + i * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(191, y); ctx.lineTo(236 - i * 5, y - 25 + i * 3); ctx.stroke();
    }
    ellipse(ctx, 128, 272, 37, 52, '#8a5a35', '#2a1d1a', 4);
    ellipse(ctx, 128, 236, 29, 30, '#f4efe3', '#2a1d1a', 4);
    poly(ctx, [[108, 222], [106, 188], [127, 213]], '#6b4930');
    poly(ctx, [[148, 222], [151, 188], [130, 213]], '#6b4930');
    ellipse(ctx, 117, 235, 4, 5, '#222', null); ellipse(ctx, 139, 235, 4, 5, '#222', null);
    poly(ctx, [[123, 243], [133, 243], [128, 257]], '#e7a62f', '#2a1d1a', 2);
    // Serres repliées sous le corps
    ctx.strokeStyle = '#e7a62f'; ctx.lineWidth = 6; ctx.beginPath();
    ctx.moveTo(111, 311); ctx.lineTo(106, 330); ctx.lineTo(118, 325); ctx.moveTo(145, 311); ctx.lineTo(150, 330); ctx.lineTo(138, 325); ctx.stroke();
  }

  function mountedNinja2d(ctx, black = false) {
    ctx.save(); ctx.translate(0, -58); ctx.scale(0.68, 0.68);
    const { cx, cy, r } = HEAD;
    // jambes pliées autour de la selle, puis tenue de ninja
    poly(ctx, [[cx - 30, 207], [cx - 3, 211], [cx - 28, 260], [cx - 72, 254]], black ? '#202b45' : '#40455a');
    poly(ctx, [[cx + 30, 207], [cx + 3, 211], [cx + 30, 260], [cx + 72, 254]], black ? '#202b45' : '#40455a');
    body(ctx, { top: 151, h: 100, w: 78, shirt: black ? '#2a4fa8' : '#30384f', pants: black ? '#202b45' : '#40455a', belt: '#c9a227', sleeve: black ? '#203a7a' : '#40455a' });
    spikes(ctx, cx, cy - 4, r * 0.88, 8, 31, Math.PI * 0.9, Math.PI * 2.1, black ? '#171820' : '#dfe3ea');
    face(ctx, cx, cy, r * 0.88, { eye: black ? '#222' : '#2f7fe0', fierce: true });
    // Masque couvrant le bas du visage et bandeau
    poly(ctx, [[cx - 48, cy + 9], [cx + 48, cy + 9], [cx + 38, cy + 51], [cx, cy + 62], [cx - 38, cy + 51]], black ? '#17213a' : '#40455a', LINE, 3);
    headband(ctx, cx, cy - 2, r * 0.9, black ? '#c9a227' : '#c0392b');
    ctx.restore();
  }

  /* ---------- Blancs : le clan des ninjas ---------- */
  const NINJA = {
    // Pion : ninja blanc cagoulé, bandeau frontal
    p(ctx) {
      body(ctx, { shirt: '#f3f3ef', pants: '#e6e6e1', vest: null, belt: '#2d3e70', shoes: '#2d3e70', emblem: '#f3f3ef', emblemChar: '忍' });
      const { cx, cy, r } = HEAD;
      face(ctx, cx, cy, r, { eye: '#2f7fe0' });
      hood2d(ctx, cx, cy, r, '#f7f7f3');
      headband(ctx, cx, cy, r, '#2d3e70');
    },
    // Cavalier : ninja masqué chevauchant un grand chien blanc
    n(ctx) {
      whiteDog2d(ctx);
      mountedNinja2d(ctx);
    },
    // Fou : ermite aux longs cheveux blancs, rouleau sur le dos
    b(ctx) {
      poly(ctx, [[W / 2 + 30, 180], [W / 2 + 70, 170], [W / 2 + 90, 300], [W / 2 + 50, 310]], '#c0392b');
      body(ctx, { shirt: '#3f8f5a', pants: '#2d5e3f', vest: '#c0392b', belt: '#2d5e3f', shoes: '#5b3b22' });
      const { cx, cy, r } = HEAD;
      poly(ctx, [[cx - r * 0.9, cy - r * 0.2], [cx - r * 1.3, cy + r * 2.0], [cx - r * 0.6, cy + r * 1.5]], '#f4f4f4');
      spikes(ctx, cx, cy - 4, r, 8, 30, Math.PI * 0.9, Math.PI * 2.1, '#f4f4f4');
      face(ctx, cx, cy, r, { eye: '#3a2a1a', grin: true });
      ctx.strokeStyle = '#d6303a'; ctx.lineWidth = 5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.38, cy + r * 0.32); ctx.lineTo(cx + s * r * 0.42, cy + r * 0.75); ctx.stroke(); }
      headband(ctx, cx, cy, r, '#3f8f5a');
    },
    // Tour : colosse avec un grand shuriken dans le dos
    r(ctx) {
      const cx = W / 2;
      ctx.save(); ctx.translate(cx, 210);
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); poly(ctx, [[0, -12], [96, -6], [20, 12]], '#8c96a8'); }
      ellipse(ctx, 0, 0, 14, 14, '#555b66');
      ctx.restore();
      body(ctx, { w: 118, h: 120, top: 190, shirt: '#6b4a2f', pants: '#3d3a46', vest: '#7c8a4a', belt: '#3d3a46' });
      const { cy, r } = HEAD;
      spikes(ctx, cx, cy + 4, r * 0.92, 6, 22, Math.PI, Math.PI * 2, '#8a3b22');
      face(ctx, cx, cy + 6, r * 0.92, { eye: '#2e6b3a', fierce: true });
      headband(ctx, cx, cy + 6, r * 0.92, '#3d3a46');
    },
    // Dame : kunoichi aux cheveux roses, gants de combat
    q(ctx) {
      const { cx, cy, r } = HEAD;
      poly(ctx, [[cx - r * 1.05, cy - r * 0.3], [cx + r * 1.05, cy - r * 0.3], [cx + r * 1.1, cy + r * 1.45], [cx - r * 1.1, cy + r * 1.45]], '#f48fb1');
      body(ctx, { w: 84, shirt: '#d32f4f', pants: '#2b2b38', hand: '#3a2f45', belt: '#f48fb1', emblem: '#d32f4f', emblemChar: '桜' });
      ellipse(ctx, cx, cy - r * 0.15, r * 1.05, r * 0.9, '#f48fb1');
      face(ctx, cx, cy + 6, r * 0.9, { eye: '#2fa86b' });
      headband(ctx, cx, cy + 4, r * 0.95, '#d32f4f');
      // frange
      poly(ctx, [[cx - r * 0.9, cy - r * 0.15], [cx - r * 0.3, cy - r * 0.15], [cx - r * 0.6, cy + r * 0.25]], '#f48fb1');
      poly(ctx, [[cx + r * 0.9, cy - r * 0.15], [cx + r * 0.3, cy - r * 0.15], [cx + r * 0.6, cy + r * 0.25]], '#f48fb1');
    },
    // Roi : chef du village, chapeau large et manteau blanc à flammes
    k(ctx) {
      const cx = W / 2;
      poly(ctx, [[cx - 60, 196], [cx + 60, 196], [cx + 82, 352], [cx - 82, 352]], '#fdfdfd');
      for (let i = 0; i < 7; i++) poly(ctx, [[cx - 82 + i * 23.4, 352], [cx - 70 + i * 23.4, 318], [cx - 58 + i * 23.4, 352]], '#e8452c', LINE, 3);
      body(ctx, { shirt: '#fdfdfd', pants: '#2d3e70', belt: '#e8452c', sleeve: '#fdfdfd', emblem: '#e8452c', emblemChar: '火' });
      const { cy, r } = HEAD;
      spikes(ctx, cx, cy, r, 9, 24, Math.PI * 0.95, Math.PI * 2.05, '#f7cf3b');
      face(ctx, cx, cy + 4, r, { eye: '#2f7fe0', grin: true });
      // tricorne blanc, pointe vers l'avant
      tricorne2d(ctx, cx, cy, r, '#f7f7f2');
    },
  };

  /* ---------- Noirs : les guerriers à aura, de plus en plus puissants ---------- */
  const WARRIOR = {
    // Pion : ninja noir cagoulé, bandeau frontal
    p(ctx) {
      body(ctx, { shirt: '#18181e', pants: '#18181e', pads: '#2c2c35', belt: '#c9a227', shoes: '#18181e' });
      const { cx, cy, r } = HEAD;
      face(ctx, cx, cy, r * 0.95, { eye: '#222', fierce: true });
      hood2d(ctx, cx, cy, r * 0.95, '#141418');
      headband(ctx, cx, cy, r * 0.95, '#8b1e2d');
    },
    // Cavalier : ninja guerrier chevauchant un aigle en plein vol
    n(ctx) {
      aura(ctx, W / 2, 240, 126, 135, 'rgba(120,190,255,0.48)', 'rgba(80,140,255,0.2)');
      eagle2d(ctx);
      mountedNinja2d(ctx, true);
    },
    // Fou : moine combattant au crâne rasé
    b(ctx) {
      aura(ctx, W / 2, 210, 110, 160, 'rgba(255,255,255,0.45)', 'rgba(200,220,255,0.2)');
      body(ctx, { shirt: '#e8742a', pants: '#e8742a', belt: '#2a4fa8', sleeve: '#2a4fa8', shoes: '#2a4fa8', emblem: '#e8742a', emblemChar: '亀' });
      const { cx, cy, r } = HEAD;
      face(ctx, cx, cy, r * 0.92, { eye: '#222' });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ellipse(ctx, cx - 14 + i * 14, cy - r * 0.62 + j * 12, 3, 3, '#b8735a', null);
    },
    // Tour : colosse à crête, armure lourde, aura violette
    r(ctx) {
      aura(ctx, W / 2, 210, 128, 175, 'rgba(190,120,255,0.55)', 'rgba(120,60,200,0.25)');
      body(ctx, { w: 124, h: 124, top: 188, shirt: '#3b3346', pants: '#1f1b26', pads: '#c9a227', belt: '#c9a227', shoes: '#c9a227' });
      const { cx, cy, r } = HEAD;
      face(ctx, cx, cy + 8, r * 0.95, { eye: '#222', fierce: true });
      poly(ctx, [[cx - 18, cy - r * 0.7], [cx, cy - r * 1.6], [cx + 18, cy - r * 0.7]], '#1b1b1f');
      ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 30, cy + 20); ctx.lineTo(cx - 14, cy + 34); ctx.stroke();
    },
    // Dame : guerrière à queue de cheval, aura rouge intense
    q(ctx) {
      aura(ctx, W / 2, 206, 130, 185, 'rgba(255,110,90,0.65)', 'rgba(220,40,40,0.3)');
      const { cx, cy, r } = HEAD;
      poly(ctx, [[cx + r * 0.5, cy - r * 0.7], [cx + r * 1.5, cy + r * 0.3], [cx + r * 1.2, cy + r * 1.6], [cx + r * 0.8, cy + r * 0.2]], '#1b1b1f');
      body(ctx, { w: 84, shirt: '#8b1e2d', pants: '#1f1b26', pads: '#e9e2c9', belt: '#e9e2c9', shoes: '#e9e2c9' });
      spikes(ctx, cx, cy - 6, r, 7, 26, Math.PI * 0.95, Math.PI * 2.05, '#1b1b1f', 0.1);
      face(ctx, cx, cy, r * 0.95, { eye: '#222', fierce: true });
    },
    // Roi : Hokage des guerriers, manteau sombre à flammes, chapeau de Kage, aura dorée et éclairs
    k(ctx) {
      aura(ctx, W / 2, 200, 135, 195, 'rgba(255,240,120,0.85)', 'rgba(255,190,30,0.4)');
      lightning(ctx, 40, 120, '#9be7ff'); lightning(ctx, 200, 200, '#9be7ff'); lightning(ctx, 52, 250, '#9be7ff');
      const cx = W / 2;
      poly(ctx, [[cx - 60, 196], [cx + 60, 196], [cx + 82, 352], [cx - 82, 352]], '#2a2438');
      for (let i = 0; i < 7; i++) poly(ctx, [[cx - 82 + i * 23.4, 352], [cx - 70 + i * 23.4, 318], [cx - 58 + i * 23.4, 352]], '#e8452c', LINE, 3);
      body(ctx, { shirt: '#232338', pants: '#232338', pads: '#f3f0e6', belt: '#f2c230', sleeve: '#2a2438', shoes: '#f3f0e6', emblem: '#232338', emblemChar: '火' });
      const { cy, r } = HEAD;
      spikes(ctx, cx, cy - 10, r, 6, 40, Math.PI * 1.02, Math.PI * 1.98, '#ffd83a', 0.15);
      face(ctx, cx, cy, r, { eye: '#1fa58f', fierce: true });
      // tricorne noir, pointe vers l'avant
      tricorne2d(ctx, cx, cy, r, '#17171d');
    },
  };

  // Accessoires des portraits : kunai, katana, sabres ninja, grand shuriken, flammes
  function kunai2d(ctx, white, x = 200, y = 262) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = LINE; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 30, 9, 0, Math.PI * 2); ctx.stroke();
    poly(ctx, [[-5, 20], [5, 20], [5, 0], [-5, 0]], white ? '#2d3e70' : '#c9a227', LINE, 3);
    poly(ctx, [[0, -78], [14, -22], [0, 0], [-14, -22]], white ? '#3a3f48' : '#9aa3b5', LINE, 3);
    ctx.restore();
  }
  function katana2d(ctx, blade, guard, wrap = '#1d1d24', straight = false) {
    poly(ctx, [[196, 296], [206, 296], [206, 254], [196, 254]], wrap, LINE, 3);
    if (straight) poly(ctx, [[186, 250], [216, 250], [216, 258], [186, 258]], guard, LINE, 3);
    else ellipse(ctx, 201, 254, 16, 6, guard, LINE, 3);
    ctx.beginPath(); ctx.moveTo(197, 250);
    if (straight) { ctx.lineTo(197, 72); ctx.lineTo(201, 60); ctx.lineTo(206, 72); ctx.lineTo(206, 250); }
    else { ctx.quadraticCurveTo(200, 150, 222, 60); ctx.lineTo(226, 72); ctx.quadraticCurveTo(208, 150, 206, 250); }
    ctx.closePath(); ctx.fillStyle = blade; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.stroke();
  }
  // Grand shuriken dans le dos (dessiné derrière le personnage)
  function shuriken2d(ctx, white) {
    ctx.save(); ctx.translate(196, 120); ctx.rotate(0.4);
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); poly(ctx, [[0, -12], [86, -6], [24, 16]], white ? '#8c96a8' : '#f2c230', LINE, 4); }
    ellipse(ctx, 0, 0, 20, 20, white ? '#555b66' : '#2a4fa8', LINE, 4);
    ellipse(ctx, 0, 0, 7, 7, '#111', null);
    ctx.restore();
  }
  function flames2d(ctx, x, y) {
    ctx.save();
    ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 20;
    poly(ctx, [[x - 22, y], [x - 28, y - 40], [x - 10, y - 26], [x - 4, y - 70], [x + 10, y - 30], [x + 26, y - 50], [x + 22, y]], '#ff6a1a', null);
    poly(ctx, [[x - 10, y], [x - 8, y - 26], [x, y - 44], [x + 8, y - 22], [x + 10, y]], '#ffe27a', null);
    ctx.restore();
  }

  const cache = new Map();
  function canvasFor(piece) {
    if (cache.has(piece)) return cache.get(piece);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const t = piece.toLowerCase();
    const white = piece !== t;
    if (t === 'b') shuriken2d(ctx, white);
    (piece === t ? WARRIOR : NINJA)[t](ctx);
    if (t === 'p') kunai2d(ctx, white);
    if (t === 'n') katana2d(ctx, white ? '#e3e8ef' : '#9fdcff', '#c9a227');
    if (t === 'q') { katana2d(ctx, '#cfd6df', white ? '#222' : '#c9a227', '#1d1d24', true); ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); katana2d(ctx, '#cfd6df', white ? '#222' : '#c9a227', '#1d1d24', true); ctx.restore(); }
    if (t === 'r') { flames2d(ctx, 40, 300); flames2d(ctx, W - 40, 300); }
    cache.set(piece, c);
    return c;
  }
  const urls = new Map();
  function dataUrl(piece) {
    if (!urls.has(piece)) urls.set(piece, canvasFor(piece).toDataURL('image/png'));
    return urls.get(piece);
  }
  // Taille relative selon le rang (le roi domine le plateau)
  const SIZE = { p: 0.78, n: 0.88, b: 0.9, r: 0.95, q: 1.0, k: 1.06 };
  const NAMES = root.LANG === 'en' ? {
    w: { p: 'White ninja', n: 'Ninja on a white dog', b: 'Hermit', r: 'Colossus', q: 'Kunoichi', k: 'Village chief' },
    b: { p: 'Black ninja', n: 'Ninja on an eagle', b: 'Monk', r: 'Brute', q: 'Warrior', k: 'Golden Hokage' },
  } : {
    w: { p: 'Ninja blanc', n: 'Ninja sur chien blanc', b: 'Ermite', r: 'Colosse', q: 'Kunoichi', k: 'Chef du village' },
    b: { p: 'Ninja noir', n: 'Ninja sur aigle', b: 'Moine', r: 'Brute', q: 'Guerrière', k: 'Hokage doré' },
  };

  root.Characters = { canvasFor, dataUrl, SIZE, NAMES, W, H };
})(window);
