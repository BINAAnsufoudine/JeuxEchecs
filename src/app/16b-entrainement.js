  /* ---------- Entraînements : mats, finales et ouvertures ----------
     Problèmes au niveau du joueur (Elo estimé, puis ajusté par ses résultats). Un problème raté revient trois
     problèmes plus tard, avec le nombre d'échecs. Mats et finales : le motif n'est dit qu'à la fin ;
     ouvertures : le nom de l'ouverture est donné dès le début. Résultats dans store « drills » (synchronisé). */
  const DRILL_MATE_THEMES = { couloir: 'backRankMate', etouffe: 'smotheredMate', anastasie: 'anastasiaMate', boden: 'bodenMate', arabe: 'arabianMate', epaulettes: 'epauletteMate', opera: 'operaMate' };
  const DRILL_END_CATS = [
    ['pawnEndgame', L('Finales de pions', 'Pawn endgames')], ['rookEndgame', L('Finales de tours', 'Rook endgames')],
    ['queenEndgame', L('Finales de dames', 'Queen endgames')], ['bishopEndgame', L('Finales de fous', 'Bishop endgames')],
    ['knightEndgame', L('Finales de cavaliers', 'Knight endgames')], ['queenRookEndgame', L('Finales dame et tour', 'Queen and rook endgames')],
  ];
  const DRILL_KIND_OF = { mates: 'mate', endgames: 'end', openings: 'open' };
  const DRILL_TITLES = { mate: L('Entraînement aux mats', 'Checkmate training'), end: L('Entraînement aux finales', 'Endgame training'), open: L('Entraînement aux ouvertures', 'Opening training') };
  const DRILL_TOTAL_LABEL = { mate: L('Réussite aux problèmes de mats', 'Success rate on checkmate puzzles'), end: L('Réussite aux problèmes de finales', 'Success rate on endgame puzzles'), open: L('Réussite aux problèmes d’ouvertures', 'Success rate on opening puzzles') };
  let drillPools = null;
  function buildDrillPools() {
    if (drillPools) return drillPools;
    const mate = [], end = [], open = [];
    for (const m of TR.MATES) m.ex.forEach((e, i) => {
      const x = trainLine(e.fen, e.moves, e.san);
      if (x) mate.push({ id: `dm:${m.id}:${i}`, fen: x.fen, line: x.line, alts: x.line.length === 1 ? matingMoves(x.fen) : undefined, motif: m.id, rating: Math.min(9, 1 + i + (x.line.length > 1 ? 2 : 0)), theme: 'mat' });
    });
    for (const p of BANK) {
      if (!p.themes) continue;
      const motif = Object.keys(DRILL_MATE_THEMES).find((k) => p.themes.includes(DRILL_MATE_THEMES[k]));
      if (motif) mate.push({ id: `dl:${p.id}`, fen: p.fen, line: p.line, motif, rating: p.rating || 5, theme: 'mat' });
      const cat = DRILL_END_CATS.find(([k]) => p.themes.includes(k));
      if (cat) end.push({ id: `de:${p.id}`, fen: p.fen, line: p.line, motif: cat[0], rating: p.rating || 5, theme: 'finale' });
    }
    // Ouvertures : une position de la ligne étudiée, le joueur trouve le coup de la théorie (puis la suite, plus loin dans la ligne)
    for (const o of TR.OPENINGS) {
      const g = new Game(), ucis = [];
      for (const s of o.san) { const r = g.playSan(s); if (!r) break; ucis.push(window.Chess.toUci(r.move)); }
      for (let k = o.color === 'w' ? 2 : 1; k < ucis.length; k += 2) {
        const pos = new Game(); ucis.slice(0, k).forEach((u) => pos.playUci(u));
        const line = ucis.slice(k, k + (k >= 8 ? 3 : 1)); if (line.length === 2) line.pop();
        open.push({ id: `do:${o.id}:${k}`, fen: window.Chess.toFen(pos.state), line, motif: o.id, rating: Math.min(9, 1 + Math.floor(k / 2)), theme: 'tactique',
          wrong: L(`Ce n'est pas le coup de la ${o.name}. Réessaie : pense au plan de cette ouverture.`, `That is not the ${o.name} move. Try again: think about the plan of this opening.`) });
      }
    }
    // Mats en 1, 2, 3, 4 et plus : tous les problèmes de mat de la banque, en plus des motifs célèbres ;
    // depth = nombre de coups du joueur jusqu'au mat
    const seen = new Set(mate.map((it) => it.id.replace(/^dl:/, '')));
    for (const p of BANK) if (p.theme === 'mat' && Array.isArray(p.line) && p.line.length && !seen.has(p.id)) {
      const depth = Math.ceil(p.line.length / 2);
      mate.push({ id: `dn:${p.id}`, fen: p.fen, line: p.line, motif: `depth${Math.min(4, depth)}`, rating: p.rating || Math.min(9, depth * 2), theme: 'mat' });
    }
    for (const it of mate) it.depth = Math.ceil(it.line.length / 2);
    return (drillPools = { mate, end, open });
  }
  const drillData = (kind) => Object.assign({ items: {}, motifs: {}, n: 0, ok: 0, tot: 0, level: 0 }, store.get('drills', {})[kind] || {});
  const drillLevel = (kind) => { const d = drillData(kind); return Math.max(1, Math.min(9, d.level || Math.round((estimatedElo() - 400) / 200))); };
  const drillPct = (ok, tot) => (tot ? Math.round((ok / tot) * 100) : null);
  // Mat visé selon le niveau : en 1 coup pour débuter, puis en 2, en 3, et en 4 coups ou plus pour les plus forts
  const mateDepthFor = (level) => (level <= 2 ? 1 : level <= 4 ? 2 : level <= 6 ? 3 : 4);
  const depthName = (n) => (n >= 4 ? L('Mat en 4 coups ou plus', 'Mate in 4 or more') : L(`Mat en ${n}`, `Mate in ${n}`));
  const drillMotifName = (kind, motif) => (kind === 'mate' && /^depth\d$/.test(motif || '') ? depthName(+motif.slice(5)) : kind === 'mate' ? (TR.MATES.find((m) => m.id === motif) || {}).name : kind === 'open' ? (TR.OPENINGS.find((o) => o.id === motif) || {}).name : (DRILL_END_CATS.find(([k]) => k === motif) || [])[1]) || motif;
  function drillMotifText(kind, motif) {
    const m = drillData(kind).motifs[motif], pct = m ? drillPct(m.ok, m.tot) : null;
    return pct == null ? L('pas encore de problème', 'no puzzle yet') : L(`${pct} % de réussite (${m.ok}/${m.tot})`, `${pct}% success (${m.ok}/${m.tot})`);
  }
  function pickDrill(kind, motif) {
    const byDepth = kind === 'mate' && /^depth\d$/.test(motif || '') ? +motif.slice(5) : 0;
    let pool = buildDrillPools()[kind].filter((it) => !motif || (byDepth ? Math.min(4, it.depth) === byDepth : it.motif === motif));
    if (!pool.length) return null;
    const d = drillData(kind);
    // entraînement général aux mats : il mélange les mats en 1, 2, 3 et 4 coups ou plus ; la longueur qui correspond
    // au niveau revient le plus souvent (poids 4), les longueurs voisines un peu moins (2, puis 1, puis 0,5)
    if (kind === 'mate' && !motif) {
      const want = mateDepthFor(Math.round(drillLevel(kind))), weights = [1, 2, 3, 4].map((n) => [n, [4, 2, 1, 0.5][Math.abs(n - want)]]);
      let roll = Math.random() * weights.reduce((sum, [, w]) => sum + w, 0), depth = want;
      for (const [n, w] of weights) { if ((roll -= w) <= 0) { depth = n; break; } }
      const pick = pool.filter((it) => Math.min(4, it.depth) === depth);
      if (pick.length) pool = pick;
    }
    // d'abord les problèmes ratés dont le tour est revenu
    const due = pool.filter((it) => { const r = d.items[it.id]; return r && r.retryAt != null && r.retryAt <= d.n && it.id !== d.last; });
    if (due.length) return due.sort((a, b) => d.items[a.id].retryAt - d.items[b.id].retryAt)[0];
    const lvl = Math.round(drillLevel(kind));
    const fresh = (w) => pool.filter((it) => Math.abs(it.rating - lvl) <= w && !(d.items[it.id] && d.items[it.id].ok) && it.id !== d.last);
    const cand = [1, 2, 9].map(fresh).find((list) => list.length) || pool.filter((it) => it.id !== d.last);
    return (cand.length ? cand : pool)[Math.floor(Math.random() * (cand.length || pool.length))];
  }
  function startDrill(kind, motif = null) {
    pz = { kind: 'drill', drill: { kind, motif, index: 0 }, lesson: { back: 'train' }, idx: 0, misses: 0 };
    enterPuzzleMode();
    nextDrill();
  }
  function nextDrill() {
    const s = pz.drill, it = pickDrill(s.kind, s.motif);
    if (!it) { toast(L('Pas encore de problème pour ce choix.', 'No puzzle for this choice yet.')); return leavePuzzle(); }
    s.index++;
    loadItem({ ...it });
  }
  // En-tête du problème : jamais le nom du motif pour les mats et les finales ; le nom de l'ouverture dès le début
  function drillHeader(it) {
    const s = pz.drill, r = drillData(s.kind).items[it.id];
    $('puzzle-title').textContent = s.kind === 'open' ? `${DRILL_TITLES.open} · ${drillMotifName('open', it.motif)}` : DRILL_TITLES[s.kind];
    const again = r && r.fail ? L(` · raté ${r.fail} fois`, ` · missed ${r.fail} time${r.fail > 1 ? 's' : ''}`) : '';
    $('pz-count').textContent = `${L('Problème', 'Puzzle')} ${s.index} · ${s.kind === 'mate' && it.depth ? `${depthName(it.depth)} · ` : ''}${L('niveau', 'level')} ${it.rating}/9${again}`;
    const retry = r && r.fail ? L(`Tu avais raté ce problème ${r.fail} fois. Prends ton temps. `, `You missed this puzzle ${r.fail} time${r.fail > 1 ? 's' : ''}. Take your time. `) : '';
    const n = it.depth || 1;
    const ask = s.kind === 'mate' ? (n > 1
      ? L(`Mat en ${n} : construis toi-même la position jusqu’au mat. Joue tes ${n} coups l’un après l’autre, les réponses adverses se jouent seules. Commence par regarder les échecs et les coups qui enferment le roi.`, `Mate in ${n}: build the position up to the mate yourself. Play your ${n} moves one after another; the replies are played for you. Start by looking at checks and moves that trap the king.`)
      : L('Mat en 1 : trouve le coup qui donne échec et mat.', 'Mate in 1: find the move that gives checkmate.'))
      : s.kind === 'end' ? L('Trouve le meilleur coup dans cette finale. Le type de finale te sera dit à la fin.', 'Find the best move in this endgame. The type of endgame will be revealed at the end.')
        : L(`${drillMotifName('open', it.motif)} : joue le coup de la théorie${it.line.length > 1 ? ', puis continue la ligne' : ''}.`, `${drillMotifName('open', it.motif)}: play the book move${it.line.length > 1 ? ', then continue the line' : ''}.`);
    say(retry + ask);
  }
  function recordDrill(it, clean) {
    const kind = pz.drill.kind, all = store.get('drills', {}), d = drillData(kind);
    d.n++; d.tot++; d.last = it.id;
    const r = d.items[it.id] || { ok: 0, fail: 0 }, m = d.motifs[it.motif] || { ok: 0, tot: 0 };
    const wasMissed = r.fail > 0;
    m.tot++;
    if (clean) { r.ok++; d.ok++; m.ok++; r.retryAt = null; d.level = Math.min(9, (d.level || drillLevel(kind)) + 0.34); }
    else { r.fail++; r.retryAt = d.n + 3; d.level = Math.max(1, (d.level || drillLevel(kind)) - 0.5); }
    d.items[it.id] = r; d.motifs[it.motif] = m;
    if (kind === 'mate' && it.depth && it.motif !== `depth${Math.min(4, it.depth)}`) { const k = `depth${Math.min(4, it.depth)}`, dm = d.motifs[k] || { ok: 0, tot: 0 }; dm.tot++; if (clean) dm.ok++; d.motifs[k] = dm; }
    all[kind] = d; store.set('drills', all);
    // récompenses : chaque réussite rapporte (plus si le problème avait été raté), et chaque série de 10 réussites un bonus
    countPuzzle();
    if (clean) {
      reward(wasMissed ? 6 : 4, wasMissed ? 12 : 8, wasMissed ? L('Problème raté puis réussi', 'Missed puzzle now solved') : DRILL_TITLES[kind]);
      questEvent('puzzle'); countMode('puzzle');
      if (d.ok % 10 === 0) reward(20, 30, L(`${d.ok} problèmes réussis`, `${d.ok} puzzles solved`));
    }
    return { d, m };
  }
  function drillSolved(clean) {
    const it = pz.item, kind = pz.drill.kind, { d, m } = recordDrill(it, clean);
    const name = drillMotifName(kind, it.motif), total = drillPct(d.ok, d.tot), motif = drillPct(m.ok, m.tot);
    const reveal = kind === 'mate' ? L(`C'était ${name.charAt(0).toLowerCase() + name.slice(1)}.`, `That was the ${name.replace(/^The /, '').toLowerCase()}.`)
      : kind === 'end' ? L(`C'était une finale : ${name.toLowerCase()}.`, `That was an endgame: ${name.toLowerCase()}.`) : name + '.';
    const stats = L(`Réussite sur ce motif : ${motif} %. Réussite générale : ${total} %.`, `Success on this pattern: ${motif}%. Overall: ${total}%.`);
    say(clean ? `${L('Bravo, trouvé du premier coup !', 'Well done, found at the first try!')} ${reveal} ${stats}`
      : `${L('Résolu avec de l’aide.', 'Solved with help.')} ${reveal} ${L('Ce problème reviendra plus tard.', 'This puzzle will come back later.')} ${stats}`, clean ? 'happy' : '');
    setPzStatus('good', clean ? L('Réussi ! Appuie sur « Problème suivant ».', 'Solved! Press “Next puzzle”.') : L('Raté cette fois : il reviendra plus tard.', 'Missed this time: it will come back later.'));
  }
  // Abandon en cours de problème après une erreur : compté comme un échec
  function drillAbandon() {
    if (pz && pz.kind === 'drill' && pz.item && !pz.done && pz.failed) recordDrill(pz.item, false);
  }
  // Haut des rubriques Mats, Finales et Ouvertures : réussite générale et bouton d'entraînement
  function drillBox(section) {
    const kind = DRILL_KIND_OF[section]; if (!kind) return '';
    const d = drillData(kind), pct = drillPct(d.ok, d.tot);
    const toRedo = Object.values(d.items).filter((r) => r.retryAt != null).length;
    const line = pct == null ? L('Pas encore de problème : lance l’entraînement pour voir ton pourcentage de réussite.', 'No puzzle yet: start training to see your success rate.')
      : L(`${pct} % (${d.ok} réussi${d.ok > 1 ? 's' : ''} sur ${d.tot}) · niveau ${Math.round(drillLevel(kind))}/9${toRedo ? ` · ${toRedo} à refaire` : ''}`, `${pct}% (${d.ok} solved out of ${d.tot}) · level ${Math.round(drillLevel(kind))}/9${toRedo ? ` · ${toRedo} to redo` : ''}`);
    let html = `<div class="drill-box"><p class="drill-total"><strong>${escHtml(DRILL_TOTAL_LABEL[kind])}</strong><span>${escHtml(line)}</span></p>`;
    html += `<div class="replay-items"><button type="button" class="btn primary replay-item drill-start" data-train="drill:${kind}"><strong>🎯 ${escHtml(L('Entraînement', 'Training'))}</strong><span>${escHtml(L('Des problèmes à ton niveau ; ceux que tu rates reviennent plus tard.', 'Puzzles at your level; the ones you miss come back later.'))}</span></button></div>`;
    if (kind === 'end') html += `<p class="level-help">${escHtml(L('Par type de finale (appuie pour t’entraîner sur un seul type) :', 'By type of endgame (tap to train on one type only):'))}</p><div class="replay-items">${DRILL_END_CATS.map(([k, n]) => `<button type="button" class="btn replay-item" data-train="drill:end:${k}"><strong>${escHtml(n)}</strong><span>${escHtml(drillMotifText('end', k))}</span></button>`).join('')}</div><p class="level-help">${escHtml(L('Les leçons :', 'The lessons:'))}</p>`;
    return html + '</div>';
  }

  /* ---------- Leçons : « Voici un exemple », puis Continuer, et un bouton Replay pour revoir l'exemple ---------- */
  function replayButton() {
    let b = $('pz-replay');
    if (!b) {
      b = document.createElement('button'); b.id = 'pz-replay'; b.type = 'button'; b.className = 'act';
      b.innerHTML = `<span>↺</span>${escHtml(L('Replay', 'Replay'))}`;
      b.onclick = replayLessonDemo;
      $('pz-next').parentNode.insertBefore(b, $('pz-next'));
    }
    return b;
  }
  function replayLessonDemo() {
    if (!pz || pz.kind !== 'lesson' || pz.locked) return;
    const st = pz.steps[pz.idx];
    if (!st.demoMoves || !st.demoMoves.length || !pz.demoStartFen) return;
    if (b3d) b3d.skipAnimations();
    setPosition(pz.demoStartFen); if (st.side) flipped = st.side === 'b';
    Object.assign(pz, { locked: true, done: false, demoIndex: 0 });
    renderBoard(); pzButtons();
    playLessonDemo(st, pz.idx);
  }

