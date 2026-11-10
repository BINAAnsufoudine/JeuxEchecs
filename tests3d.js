/* Tests du plateau 3D, thème par thème, avec une horloge simulée (rapide et indépendante de l'écran) :
   - parties jouées coup par coup, pleines de prises, à rythme rapide puis normal : chaque pièce 3D doit
     correspondre au plateau (aucune pièce fantôme, aucune pièce en train de mourir à la fin) ;
   - aucun effet ne doit rester dans la scène après les animations (explosions, traînées, projectiles…) ;
   - la caméra doit revenir à la vue normale ;
   - chaque attaque de mat doit se terminer proprement et rendre les rois debout. */
(function () {
  'use strict';
  const THEMES = ['ninja', 'plants', 'land', 'birds', 'ocean', 'ancient', 'modern', 'auras', 'sabres', 'baobabs', 'dinos'];
  const results = [];
  window.__tests3d = { done: false, ok: false, results };
  const b = new window.Board3D(document.getElementById('stage'), () => {});
  b.setTerrain('steppe');
  // on teste la logique des animations, pas l'image : pas de rendu à chaque pas de temps (beaucoup plus rapide)
  b.renderer.render = () => {};
  b.renderer.shadowMap.enabled = false;
  const base = { selected: -1, targets: [], check: -1, mateFire: [], mateUltimate: null, hint: null, flipped: false, showMoves: false, coords: true, light: '#f0d9b5', dark: '#b58863', outcome: null, arrows: [] };
  const realNow = performance.now.bind(performance), t0 = realNow();
  let clock = 0;
  const setClock = () => { performance.now = () => t0 + clock * 1000; };
  const step = (sec) => { const to = clock + sec; while (clock < to) { clock = Math.min(to, clock + 0.05); setClock(); b.tick(t0 + clock * 1000); } };
  const isUnder = (o, parent) => { for (let p = o; p; p = p.parent) if (p === parent) return true; return false; };
  const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
  // Ce qui est volontairement permanent : pièces, repères de cases, fissures, décor, météo
  const snapshot = () => { const s = new Set(); b.scene.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints) s.add(o.uuid); }); return s; };
  const leftovers = (before) => {
    const out = [];
    b.scene.traverse((o) => {
      if (!(o.isMesh || o.isLine || o.isPoints) || before.has(o.uuid) || !shown(o)) return;
      if (isUnder(o, b.pieces) || isUnder(o, b.overlay) || (b.weatherGroup && isUnder(o, b.weatherGroup)) || (b.animalGroup && isUnder(o, b.animalGroup))) return;
      if ((b.boardCracks || []).some((c) => isUnder(o, c.object)) || (b.captureScars || []).some((c) => isUnder(o, c.object))) return;
      if (b.vaults && Object.values(b.vaults).some((v) => v && isUnder(o, v.g))) return;
      if (b.checkGroup && isUnder(o, b.checkGroup)) return;
      if (b.ropeGroup && isUnder(o, b.ropeGroup)) return; // halos des pièces liées : volontairement permanents
      out.push((o.geometry && o.geometry.type) || o.type);
    });
    return out;
  };
  const homeDistance = () => {
    const p = b.camera.position.clone(); b.setCamera(b.flipped, true);
    const d = b.camera.position.clone(); b.camera.position.copy(p);
    return p.distanceTo(d);
  };
  function test(name, fn) {
    try { fn(); results.push({ name, ok: true, error: '' }); }
    catch (e) { results.push({ name, ok: false, error: e.message }); }
  }
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  // Partie aléatoire reproductible (graine), qui prend dès qu'elle peut 7 fois sur 10
  function play(theme, seed, moves, delay) {
    let x = seed;
    const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    window.PieceTheme = theme; b.rebuildPieces();
    const g = new window.Chess.Game();
    const frame = (animate) => { const s = g.state; b.update({ ...base, board: s.board, last: g.lastMove(), check: g.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1, animate, ply: g.history.length }); };
    setClock(); frame(false); step(0.5);
    const before = snapshot();
    for (let i = 0; i < moves; i++) {
      const ms = window.Chess.legalMoves(g.state);
      if (!ms.length) break;
      const caps = ms.filter((m) => g.state.board[m.to]);
      const m = caps.length && rnd() < 0.7 ? caps[Math.floor(rnd() * caps.length)] : ms[Math.floor(rnd() * ms.length)];
      g.play(m.from, m.to, m.promo || 'q');
      frame(true); step(delay);
    }
    step(14);
    const onBoard = g.state.board.filter(Boolean).length;
    assert(b.chars.size === onBoard, `${b.chars.size} pièces 3D pour ${onBoard} pièces sur le plateau`);
    assert(b.pieces.children.length === onBoard, `${b.pieces.children.length} figurines affichées pour ${onBoard} pièces (pièce fantôme)`);
    assert(b.dying.length === 0, `${b.dying.length} pièce(s) prise(s) encore à l'écran`);
    for (const [sq, c] of b.chars) assert(g.state.board[sq] === c.piece, `pièce ${c.piece} affichée sur une case où se trouve ${g.state.board[sq]}`);
    const left = leftovers(before);
    assert(!left.length, `${left.length} reste(s) d'animation dans la scène (${[...new Set(left)].join(', ')})`);
    const cam = homeDistance();
    assert(cam < 0.05, `caméra restée décalée de ${cam.toFixed(2)} après les animations`);
  }
  function mate(theme, white, pc = white ? 'Q' : 'q') {
    window.PieceTheme = theme; b.rebuildPieces();
    const e = Array(64).fill(null);
    e[60] = 'K'; e[4] = 'k'; if (white) e[20] = pc; else e[44] = pc;
    if (pc === 'K') e[60] = null; if (pc === 'k') e[4] = null; // le roi joue lui-même le coup de mat
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const before = snapshot();
    const e2 = e.slice();
    if (white) { e2[12] = pc; e2[20] = null; } else { e2[52] = pc; e2[44] = null; }
    b.update({ ...base, board: e2, check: white ? 4 : 60, last: white ? { from: 20, to: 12, piece: pc } : { from: 44, to: 52, piece: pc }, animate: true, ply: 1,
      mateUltimate: { id: `m${theme}${white}`, piece: pc, attackerTo: white ? 12 : 52, to: white ? 4 : 60 }, outcome: white ? '1-0' : '0-1' });
    step(12);
    // nouvelle partie : tout doit disparaître et les rois revenir debout
    b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(1);
    const left = leftovers(before);
    assert(!left.length, `${left.length} reste(s) après le mat (${[...new Set(left)].join(', ')})`);
    for (const c of b.chars.values()) if (/k/i.test(c.piece)) {
      const r = c.parts.root;
      assert(c.holder.visible && r.visible && Math.abs(r.rotation.z) < 0.01 && Math.abs(r.rotation.x) < 0.01, `roi ${c.piece} pas remis debout après le mat`);
    }
  }

  // Orage de la reine (Empire des Baobabs) : les pièces du camp maté disparaissent, puis reviennent intactes
  function stormMate() {
    window.PieceTheme = 'baobabs'; b.rebuildPieces();
    const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[20] = 'Q'; e[9] = 'p'; e[14] = 'p'; e[1] = 'n';
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const scales = new Map([...b.chars.values()].map((c) => [c, c.parts.root.scale.y]));
    const e2 = e.slice(); e2[12] = 'Q'; e2[20] = null;
    b.update({ ...base, board: e2, check: 4, last: { from: 20, to: 12, piece: 'Q' }, animate: true, ply: 1, mateUltimate: { id: 'morage', piece: 'Q', attackerTo: 12, to: 4 }, outcome: '1-0' });
    step(10);
    assert(b.mateUltimate && b.mateUltimate.themed === 'orage', 'la reine blanche ne lance pas l’orage');
    for (const sq of [9, 14, 1]) assert(!b.chars.get(sq).holder.visible, `la pièce noire ${sq} n'est pas partie en cendres`);
    assert(b.chars.get(60).holder.visible, 'le roi blanc a été touché');
    step(4);
    b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(1);
    for (const sq of [9, 14, 1]) { const c = b.chars.get(sq); assert(c.holder.visible && Math.abs(c.parts.root.scale.y - (scales.get(c) || c.parts.root.scale.y)) < 1e-6, `la pièce ${sq} n'est pas revenue intacte`); }
  }

  // Arc géant : le pion noir dans le couloir est balayé pendant le mat et retrouve sa case à la partie suivante ; celui qui est hors du chemin ne bouge pas
  function giantArc() {
    window.PieceTheme = 'sabres'; b.rebuildPieces();
    const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[46] = 'B'; e[3] = 'p'; e[13] = 'p'; e[54] = 'P';
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const e2 = e.slice(); e2[46] = null; e2[25] = 'B';
    b.update({ ...base, board: e2, check: 4, last: { from: 46, to: 25, piece: 'B' }, animate: true, ply: 1, mateUltimate: { id: 'marc', piece: 'B', attackerTo: 25, to: 4 }, outcome: '1-0' });
    step(10);
    const pawn = b.chars.get(3);
    assert(pawn && !pawn.holder.visible, 'pion noir non emporté par l\'Arc géant');
    assert(b.chars.get(13).holder.visible, 'pion noir hors du chemin emporté par l\'Arc géant');
    b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(1);
    const back = b.chars.get(3), p = b.sqToPos(3);
    assert(back.holder.visible && Math.abs(back.holder.position.x - p.x) < 0.01 && Math.abs(back.holder.position.z - p.z) < 0.01, 'pion emporté pas revenu sur sa case');
  }

  // Thèmes à fiches : chaque pièce prend une cible proche puis lointaine, sans laisser de reste
  function kitCapture(theme, pc) {
    window.PieceTheme = theme; b.rebuildPieces();
    const white = pc === pc.toUpperCase(), foe = white ? 'p' : 'P';
    for (const [from, to] of [[35, pc.toLowerCase() === 'n' ? 18 : 36], [35, pc.toLowerCase() === 'n' ? 20 : 3]]) {
      const e = Array(64).fill(null); e[white ? 56 : 7] = white ? 'K' : 'k'; e[white ? 7 : 56] = white ? 'k' : 'K'; if (pc.toLowerCase() === 'k') e[white ? 56 : 7] = null;
      e[from] = pc; e[to] = foe;
      setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
      const before = snapshot(), e2 = e.slice(); e2[to] = pc; e2[from] = null;
      b.update({ ...base, board: e2, last: { from, to, piece: pc, captured: foe }, animate: true, ply: 1 });
      step(0.5); assert(b.dying.length === 1, 'la pièce prise n\'est pas animée');
      step(9);
      assert(b.dying.length === 0, 'pièce prise encore à l\'écran');
      const c = b.chars.get(to), p = b.sqToPos(to);
      assert(c && Math.abs(c.holder.position.x - p.x) < 0.01 && Math.abs(c.holder.position.z - p.z) < 0.01, 'attaquant pas arrivé sur sa case');
      const left = leftovers(before);
      assert(!left.length, `${left.length} reste(s) d'animation (${[...new Set(left)].join(', ')})`);
    }
  }

  // Saga des Auras, longs déplacements : la tour s'envole à l'horizontale puis se repose ; le fou laisse du feu qui s'éteint
  function flight(theme) {
    window.PieceTheme = theme; b.rebuildPieces();
    const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[56] = 'R'; e[58] = 'B';
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const before = snapshot();
    const e2 = e.slice(); e2[56] = null; e2[32] = 'R';
    b.update({ ...base, board: e2, last: { from: 56, to: 32, piece: 'R' }, animate: true, ply: 1 });
    const rook = b.chars.get(32), dur = rook.anim.dur;
    step(dur * 0.5);
    assert(rook.parts.root.position.y > 0.5, `tour pas en vol (${rook.parts.root.position.y.toFixed(2)})`);
    assert(!(b.auraPuffs || []).length && !(rook.auraFx && rook.auraFx.visible), 'la tour vole avec une aura');
    step(dur); assert(rook.parts.root.position.y < 0.1 && Math.abs(rook.parts.root.rotation.x) < 0.01, 'tour pas reposée');
    const e3 = e2.slice(); e3[58] = null; e3[31] = 'B'; // c1-h6
    const realFire = b.fireOnSquare; let fires = 0; b.fireOnSquare = function (...x) { fires++; return realFire.apply(this, x); };
    b.update({ ...base, board: e3, last: { from: 58, to: 31, piece: 'B' }, animate: true, ply: 2 });
    step(1);
    delete b.fireOnSquare;
    assert(fires === 5, `${fires} case(s) en feu au lieu de 5`);
    step(2);
    const left = leftovers(before);
    assert(!left.length, `${left.length} reste(s) après les déplacements (${[...new Set(left)].join(', ')})`);
  }

  // Alerte : la pièce visée ou qui vise tend son arme vers l'adversaire, et la ramène quand l'alerte disparaît
  function aimCheck() {
    window.PieceTheme = 'sabres'; b.rebuildPieces();
    const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[33] = 'Q'; e[39] = 'r'; // en a4, la dame viserait aussi le roi noir
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(1);
    const q = b.chars.get(33), nag = q.parts.naginata;
    assert(q.aimK > 0.9, `dame en alerte : arme à ${q.aimK.toFixed(2)}`);
    assert(Math.abs(nag.rotation.x - 1.5) < 0.1, `naginata pas pointée (${nag.rotation.x.toFixed(2)})`);
    const e2 = e.slice(); e2[39] = null;
    b.update({ ...base, board: e2, last: null, animate: false, ply: 0 }); step(1.5);
    const q2 = b.chars.get(33);
    assert(q2.aimK < 0.05 && Math.abs(q2.parts.naginata.rotation.x) < 0.01, 'naginata pas revenue au repos');
  }

  // Bouton « Passer » : au milieu d'une attaque spéciale, tout se pose aussitôt, sans reste à l'écran
  function skip(theme) {
    window.PieceTheme = theme; b.rebuildPieces();
    const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[59] = 'Q'; e[3] = 'q';
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const before = snapshot();
    const e2 = e.slice(); e2[3] = 'Q'; e2[59] = null;
    b.update({ ...base, board: e2, last: { from: 59, to: 3, piece: 'Q', captured: 'q' }, animate: true, ply: 1 });
    step(1.6);
    b.skipAnimations();
    b.update({ ...base, board: e2, last: { from: 59, to: 3, piece: 'Q', captured: 'q' }, animate: false, ply: 1 });
    step(0.5);
    assert(b.pieces.children.length === 3 && b.chars.size === 3 && !b.dying.length, `après « Passer » : ${b.pieces.children.length} figurines pour 3 pièces`);
    const q = b.chars.get(3), p = b.sqToPos(3);
    assert(q && Math.abs(q.holder.position.x - p.x) < 0.01 && Math.abs(q.holder.position.z - p.z) < 0.01, "la dame n'est pas posée sur sa case après « Passer »");
    const left = leftovers(before);
    assert(!left.length, `${left.length} reste(s) après « Passer » (${[...new Set(left)].join(', ')})`);
    assert(homeDistance() < 0.05, 'caméra pas revenue en place après « Passer »');
  }
  window.__debug = { play, mate, b, snapshot, leftovers, step };
  if (location.search.includes('debug')) return;
  for (const theme of THEMES) {
    test(`3D ${theme} : partie rapide pleine de prises`, () => play(theme, 3 + THEMES.indexOf(theme), 40, 0.2));
    test(`3D ${theme} : partie au rythme normal`, () => play(theme, 11 + THEMES.indexOf(theme), 30, 1.2));
    test(`3D ${theme} : mat des Blancs`, () => mate(theme, true));
    test(`3D ${theme} : mat des Noirs`, () => mate(theme, false));
    test(`3D ${theme} : bouton « Passer » pendant une attaque`, () => skip(theme));
  }
  test('3D ninja : la tour blanche emporte sa cible avec son dragon de feu', () => kitCapture('ninja', 'R'));
  test('3D alerte : l\'arme se pointe vers l\'adversaire puis revient au repos', () => aimCheck());
  test('3D auras : vol de la tour et feu du fou', () => flight('auras'));
  test('3D ninja : les longs déplacements ne changent pas', () => { window.PieceTheme = 'ninja'; b.rebuildPieces(); const e = Array(64).fill(null); e[60] = 'K'; e[4] = 'k'; e[56] = 'R'; setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5); const e2 = e.slice(); e2[56] = null; e2[24] = 'R'; b.update({ ...base, board: e2, last: { from: 56, to: 24, piece: 'R' }, animate: true, ply: 1 }); assert(!b.chars.get(24).anim.flight, 'vol hors de la Saga des Auras'); step(2); });
  // Saga des Auras : chaque pièce a son mat
  for (const pc of 'PNBRKpnbrk') test(`3D auras : mat de la pièce ${pc}`, () => mate('auras', pc === pc.toUpperCase(), pc));
  // L'Âge des Sabres : chaque pièce a son mat, joué aussi dans la cour du château
  b.setTerrain('castle');
  for (const pc of 'PNBRKpnbrk') test(`3D sabres : mat de la pièce ${pc}`, () => mate('sabres', pc === pc.toUpperCase(), pc));
  test('3D sabres : l\'Arc géant emporte les pièces sur son chemin, puis elles reviennent', () => giantArc());
  b.setTerrain('banco');
  for (const pc of 'KQRBNPkqrbnp') test(`3D baobabs : prise par la pièce ${pc}`, () => kitCapture('baobabs', pc));
  test('3D baobabs : mat des Blancs dans la cour royale', () => mate('baobabs', true));
  test('3D baobabs : mat des Noirs dans la cour royale', () => mate('baobabs', false));
  test('3D baobabs : mat du cavalier blanc (la meute de lions)', () => mate('baobabs', true, 'N'));
  test('3D baobabs : mat du cavalier noir (la meute de lions)', () => mate('baobabs', false, 'n'));
  test('3D baobabs : l’orage de la reine réduit le camp adverse en cendres, qui revient à la partie suivante', () => stormMate());
  b.setTerrain('volcano');
  for (const pc of 'KQRBNPkqrbnp') test(`3D dinos : prise par la pièce ${pc}`, () => kitCapture('dinos', pc));
  test('3D dinos : mat des Blancs dans la clairière', () => mate('dinos', true));
  test('3D dinos : mat des Noirs dans la clairière', () => mate('dinos', false));
  b.setTerrain('steppe');
  window.PieceThemeBlack = 'sabres';
  test('3D mélange ninja / sabres : partie pleine de prises', () => play('ninja', 41, 40, 0.3));
  test('3D mélange ninja / sabres : mat des Noirs', () => mate('ninja', false));
  window.PieceThemeBlack = null;
  // Mélange de thèmes : les Noirs avec les pièces d'un autre thème
  for (const [w, k] of [['ninja', 'modern'], ['ocean', 'ancient'], ['birds', 'plants']]) {
    window.PieceThemeBlack = k;
    test(`3D mélange ${w} / ${k} : partie pleine de prises`, () => play(w, 21 + THEMES.indexOf(k), 40, 0.3));
    test(`3D mélange ${w} / ${k} : mat des Noirs`, () => mate(w, false));
    window.PieceThemeBlack = null;
  }
  performance.now = realNow;
  const ok = results.every((r) => r.ok);
  document.getElementById('results').innerHTML = results.map((r) => `<li class="${r.ok ? 'ok' : 'ko'}">${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}</li>`).join('');
  document.getElementById('summary').textContent = ok ? `Tous les tests passent (${results.length})` : `${results.filter((r) => !r.ok).length} test(s) en échec sur ${results.length}`;
  window.__tests3d.ok = ok;
  window.__tests3d.done = true;
})();
