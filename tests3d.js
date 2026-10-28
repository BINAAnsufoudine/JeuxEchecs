/* Tests du plateau 3D, thème par thème, avec une horloge simulée (rapide et indépendante de l'écran) :
   - parties jouées coup par coup, pleines de prises, à rythme rapide puis normal : chaque pièce 3D doit
     correspondre au plateau (aucune pièce fantôme, aucune pièce en train de mourir à la fin) ;
   - aucun effet ne doit rester dans la scène après les animations (explosions, traînées, projectiles…) ;
   - la caméra doit revenir à la vue normale ;
   - chaque attaque de mat doit se terminer proprement et rendre les rois debout. */
(function () {
  'use strict';
  const THEMES = ['ninja', 'plants', 'land', 'birds', 'ocean', 'ancient', 'modern'];
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
  function mate(theme, white) {
    window.PieceTheme = theme; b.rebuildPieces();
    const e = Array(64).fill(null);
    if (white) { e[60] = 'K'; e[4] = 'k'; e[20] = 'Q'; } else { e[4] = 'k'; e[60] = 'K'; e[44] = 'q'; }
    setClock(); b.update({ ...base, board: e, last: null, animate: false, ply: 0 }); step(0.5);
    const before = snapshot();
    const e2 = e.slice();
    if (white) { e2[12] = 'Q'; e2[20] = null; } else { e2[52] = 'q'; e2[44] = null; }
    b.update({ ...base, board: e2, check: white ? 4 : 60, last: white ? { from: 20, to: 12, piece: 'Q' } : { from: 44, to: 52, piece: 'q' }, animate: true, ply: 1,
      mateUltimate: { id: `m${theme}${white}`, piece: white ? 'Q' : 'q', attackerTo: white ? 12 : 52, to: white ? 4 : 60 }, outcome: white ? '1-0' : '0-1' });
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
  performance.now = realNow;
  const ok = results.every((r) => r.ok);
  document.getElementById('results').innerHTML = results.map((r) => `<li class="${r.ok ? 'ok' : 'ko'}">${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}</li>`).join('');
  document.getElementById('summary').textContent = ok ? `Tous les tests passent (${results.length})` : `${results.filter((r) => !r.ok).length} test(s) en échec sur ${results.length}`;
  window.__tests3d.ok = ok;
  window.__tests3d.done = true;
})();
