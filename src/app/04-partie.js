  /* ---------- Écran de configuration ---------- */
  function renderSetup() {
    document.querySelectorAll('.segmented').forEach((seg) => {
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.value === setup[seg.dataset.name]));
    });
    $('ai-options').hidden = setup.mode === 'local';
    $('level-name').textContent = `${LEVEL_NAMES[setup.level]} (Elo ${LEVEL_ELO[setup.level]})`;
    $('level-grid').innerHTML = levelGridHtml(setup.level);
  }
  function levelGridHtml(current) {
    const top = unlocked(), wins = store.get('stats', {});
    let html = '';
    TIERS.forEach((t, i) => {
      const lv = i === 7 ? [22] : [i * 3 + 1, i * 3 + 2, i * 3 + 3];
      html += `<div class="level-row${lv.length === 1 ? ' single' : ''}"><span class="tier">${t}</span>` + lv.map((l) =>
        `<button data-level="${l}" role="radio" aria-checked="${l === current}" class="${l === current ? 'on' : ''}${wins[l] && wins[l].win ? ' done' : ''}" ${l > top ? 'disabled' : ''} aria-label="${LEVEL_NAMES[l]}, Elo ${LEVEL_ELO[l]}${l > top ? L(' (verrouillé)', ' (locked)') : ''}" title="Elo ${LEVEL_ELO[l]}">${lv.length === 1 ? 'Champion' : (l - 1) % 3 + 1}<small>${LEVEL_ELO[l]}</small></button>`).join('') + '</div>';
    });
    return html;
  }
  document.querySelectorAll('.segmented').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      setup[seg.dataset.name] = b.dataset.value; renderSetup();
    });
  });
  $('level-grid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-level]'); if (!b || b.disabled) return;
    setup.level = +b.dataset.level; store.set('setup', setup); renderSetup();
  });

  /* ---------- Partie ---------- */
  function startGame(conf, uciMoves = [], res = null, flip, terrainId, weatherId) {
    if (document.body.classList.contains('admin-mode')) { toast(L('Le compte administrateur ne peut pas jouer.', 'The administrator account cannot play.')); show('admin'); return; }
    $('chat').hidden = true; $('online-switch').hidden = true;
    pendingMove = null;
    cancelAi();
    if (conf.mode !== 'online' && typeof stopOnline === 'function') stopOnline();
    replay = null; setReplayUi(false);
    pz = null; marks = null;
    attachBoard('game');
    game = new Game(conf.fen || undefined);
    const entryLastMove = uciMoves.length ? uciMoves[uciMoves.length - 1] : null;
    let entryPrefixValid = true;
    const entryPrefix = entryLastMove ? uciMoves.slice(0, -1) : uciMoves;
    for (const u of entryPrefix) if (!game.playUci(u)) { entryPrefixValid = false; break; }
    cfg = conf;
    if (cfg.mode === 'coach') cfg.coachTheme = coachPlan().theme;
    result = res;
    $('terrain-name').textContent = randomScenery(terrainId, weatherId);
    flipped = flip !== undefined ? flip : conf.mode !== 'local' && conf.playerColor === 'b';
    selected = -1; hint = null; animateNext = false;
    const drillOf = conf.drill && window.TRAINER && window.TRAINER.ENDGAMES.find((x) => x.id === conf.drill);
    $('game-title').textContent = conf.mode === 'online' ? (conf.online.tournament ? `${conf.online.tournament} · ${L('ronde', 'round')} ${conf.online.round}` : `${L('En ligne', 'Online')} · ${TC_LABELS[conf.online.tc] || ''}`) : (drillOf ? `${drillOf.name} · ` : conf.fen ? L('Position libre · ', 'Custom position · ') : '') + (conf.mode === 'local' ? L('Deux joueurs', 'Two players') : conf.mode === 'coach' ? `${conf.champion && champById(conf.champion) ? L(`Face à ${champShort(champById(conf.champion))}`, `Against ${champShort(champById(conf.champion))}`) : L('Partie coachée', 'Coached game')} · ${LEVEL_NAMES[conf.level]}` : `${LEVEL_NAMES[conf.level]} (Elo ${LEVEL_ELO[conf.level]})`);
    show('game');
    if (entryLastMove && entryPrefixValid) {
      if (b3d) {
        const s = game.state;
        const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
        b3d.update({ board: s.board, selected: -1, targets: [], last: game.lastMove(), check: game.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1, mateFire: [], mateUltimate: null, hint: null, flipped, showMoves: settings.showMoves, coords: settings.coords, light: th.light, dark: th.dark, animate: false, outcome: null, arrows: [], ply: game.history.length });
      }
      if (game.playUci(entryLastMove)) animateNext = true;
    }
    if (conf.mode === 'coach') {
      coachDockOpen = false;
      coachHintLevel = 0;
      const focus = cfg.coachTheme ? L(` Objectif du jour: ${PZ[cfg.coachTheme].name.toLowerCase()}.`, ` Today's goal: ${PZ[cfg.coachTheme].name.toLowerCase()}.`) : '';
      const champ = conf.champion && champById(conf.champion);
      setCoachMessage(champ ? L(`Je suis ${champ.name}, et c'est moi ton adversaire. Je te rappellerai mes principes quand la situation se présentera.`, `I am ${champ.name}, and I am your opponent. I will remind you of my principles when the situation arises.`) : L(`Nous allons jouer une partie à ton niveau. Je commenterai les idées et te laisserai chercher les coups.${focus}`, `We are going to play a game at your level. I will comment on the ideas and let you find the moves.${focus}`), 'happy');
    }
    render();
    save();
    if (conf.mode === 'online') {
      toast(L(`Tu joues les ${conf.playerColor === 'w' ? 'Blancs' : 'Noirs'}`, `You play ${conf.playerColor === 'w' ? 'White' : 'Black'}`));
    } else if (conf.mode !== 'local' && !uciMoves.length && conf.fen) {
      toast(L(`Tu joues les ${conf.playerColor === 'w' ? 'Blancs' : 'Noirs'}`, `You play ${conf.playerColor === 'w' ? 'White' : 'Black'}`));
    } else if (conf.mode !== 'local' && !uciMoves.length) {
      const side = conf.playerColor === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      toast(L(`Tirage au sort : tu joues les ${side}`, `Random draw: you play ${side}`));
      const champ = conf.mode === 'coach' && conf.champion && champById(conf.champion);
      if (champ) setCoachMessage(L(`Tu joues les ${side}. Je suis ${champ.name} et je joue contre toi. Montre-moi ce que tu as retenu de mon cours. ${championTip()}`, `You play ${side}. I am ${champ.name} and I play against you. Show me what you learned in my course. ${championTip()}`).trim(), 'happy', true);
      else if (conf.mode === 'coach') setCoachMessage(L(`Tu joues les ${side}. Je serai ton adversaire et je t’aiderai à réfléchir sans te souffler les coups.`, `You play ${side}. I will be your opponent and help you think without giving away the moves.`), 'happy', true);
    }
    maybeAiMove();
  }

  function save() {
    if (!game || pz || replay || (cfg && cfg.mode === 'online')) return;
    store.set('game', { cfg, moves: game.uciList(), result, flipped, terrain: currentTerrain, weather: currentWeather });
  }

  const isHumanTurn = () => cfg.mode === 'local' || game.turn === cfg.playerColor;
  // Une animation 3D (déplacement, duel, technique de prise ou de mat) doit finir avant tout nouveau mouvement
  const animBusy = () => !!(b3d && b3d.busyLeftMs() > 0);
  const canInteract = (ignoreAnim = false) => (replay ? false : !ignoreAnim && animBusy() ? false : pz ? !!(pz.item && pz.item.line) && !pz.done && !pz.locked : !result && !thinking && !judging && !(cfg.mode === 'coach' && speechBusy()) && isHumanTurn());

  function render() { if (replay) { renderReplay(); return; } renderBoard(); renderPlayers(); renderMoves(); renderStatus(); renderActions(); }

  function displayToBoard(i) { return flipped ? 63 - i : i; }

  // Petit échiquier 2D en haut à droite : la position exacte, en icônes
  const MINI = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function renderMinimap(board, last, selectedSq = -1, targets = [], mateFire = [], arrows = [], hintMark = null, tutorialStars = []) {
    const el = $('minimap');
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = flipped ? 63 - i : i, p = board[sq];
      const name = sqName(sq), row = i >> 3, col = i & 7;
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      const lit = last && (last.from === sq || last.to === sq);
      const selected = selectedSq === sq;
      const hinted = hintMark && hintMark.from === sq && !!p;
      const target = targets.some((m) => m.to === sq);
      const capture = target && (!!p || targets.some((m) => m.to === sq && m.flag === 'ep'));
      const coords = `${row === 0 ? `<span class="mini-coord file top ${dark ? 'd' : 'l'}">${name[0]}</span>` : ''}${row === 7 ? `<span class="mini-coord file bottom ${dark ? 'd' : 'l'}">${name[0]}</span>` : ''}${col === 0 ? `<span class="mini-coord rank left ${dark ? 'd' : 'l'}">${name[1]}</span>` : ''}${col === 7 ? `<span class="mini-coord rank right ${dark ? 'd' : 'l'}">${name[1]}</span>` : ''}`;
      const star = tutorialStars.includes(sq);
      html += `<button type="button" class="${dark ? 'd' : 'l'}${lit ? ' last' : ''}${selected ? ' sel' : ''}${hinted ? ' hint-piece' : ''}${mateFire.includes(sq) ? ' mate-fire' : ''}${star ? ' tutorial-star' : ''}${target ? ` target${capture ? ' capture' : ''}` : ''}" data-sq="${sq}" aria-label="${name} ${star ? L('étoile à récupérer', 'star to collect') : p ? pieceName(p) : mateFire.includes(sq) ? L('case vide en feu', 'empty square on fire') : L('case vide', 'empty square')}"${selected ? ' aria-pressed="true"' : ''}>${p ? `<b class="${p === p.toUpperCase() ? 'w' : 'k'}">${MINI[p.toLowerCase()]}</b>` : ''}${star ? '<span class="mini-tutorial-star">★</span>' : ''}${coords}</button>`;
    }
    el.innerHTML = html + arrowsSvg(arrows);
  }
  function animateMinimapMove(last) {
    if (!last) return;
    const animatePiece = (fromSq, toSq, piece) => {
      const from = flipped ? 63 - fromSq : fromSq, to = flipped ? 63 - toSq : toSq;
      const token = document.createElement('b');
      token.className = `mini-move-replay-token ${colorOf(piece)}`;
      token.textContent = MINI[piece.toLowerCase()];
      token.style.left = `${(from & 7) * 12.5}%`;
      token.style.top = `${(from >> 3) * 12.5}%`;
      minimap.appendChild(token);
      token.animate([
        { transform: 'translate(0, 0)' },
        { transform: `translate(${((to & 7) - (from & 7)) * 100}%, ${((to >> 3) - (from >> 3)) * 100}%)` },
      ], { duration: 800, easing: 'cubic-bezier(.2,.75,.35,1)' }).onfinish = () => token.remove();
    };
    animatePiece(last.from, last.to, last.piece);
    if (last.flag === 'castle') {
      const kingside = last.to > last.from;
      animatePiece(last.from + (kingside ? 3 : -4), last.from + (kingside ? 1 : -1), last.piece === 'K' ? 'R' : 'r');
    }
  }
  // Flèches de replay et de coach en SVG (plateau 2D et mini-carte)
  const ARROW_COLORS = { green: '#2ecc40', red: '#e53935', blue: '#2f7bff', violet: '#a855f7' };
  function arrowsSvg(arrows) {
    if (!arrows.length) return '';
    const center = (sq) => [(flipped ? 7 - (sq & 7) : sq & 7) + 0.5, (flipped ? 7 - (sq >> 3) : sq >> 3) + 0.5];
    let body = '';
    for (const a of arrows) {
      const [x1, y1] = center(a.from), [x2, y2] = center(a.to);
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const ex = x2 - ux * 0.1, ey = y2 - uy * 0.1, bx = ex - ux * 0.38, by = ey - uy * 0.38;
      const color = ARROW_COLORS[a.color] || ARROW_COLORS.green;
      body += `<g fill="${color}" stroke="${color}" opacity="0.88"><line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke-width="0.14" stroke-linecap="round"/><polygon stroke="none" points="${ex},${ey} ${bx - uy * 0.2},${by + ux * 0.2} ${bx + uy * 0.2},${by - ux * 0.2}"/></g>`;
    }
    return `<svg class="arrows-svg" viewBox="0 0 8 8" aria-hidden="true">${body}</svg>`;
  }
  const minimap = $('minimap');
  let minimapResize = null, resizeCandidate = null, suppressMinimapClick = false, minimapTap = null;
  let minimapMove = null, moveCandidate = null;
  // Position et taille choisies par le joueur, gardées d'une partie à l'autre (position en fraction de la place libre)
  const minimapPrefs = Object.assign({ size: 0, fx: null, fy: null }, store.get('minimap', {}));
  function placeMinimap() {
    if (minimapPrefs.size) { minimap.style.setProperty('--minimap-size', `${minimapPrefs.size}px`); minimap.classList.add('user-sized'); }
    if (minimapPrefs.fx === null) return;
    const wrap = $('board-wrap').getBoundingClientRect();
    if (!wrap.width) return;
    const size = minimap.getBoundingClientRect().width || minimapPrefs.size || 150;
    const free = (n) => Math.max(0, n - size - 16);
    minimap.style.left = `${8 + minimapPrefs.fx * free(wrap.width)}px`;
    minimap.style.top = `${8 + minimapPrefs.fy * free(wrap.height)}px`;
    minimap.classList.add('user-placed');
  }
  // Mémorise la position actuelle (en px dans l'échiquier) sous forme de fractions
  function rememberMinimapPlace(left, top) {
    const wrap = $('board-wrap').getBoundingClientRect(), size = minimap.getBoundingClientRect().width;
    const frac = (v, n) => { const free = n - size - 16; return free > 0 ? Math.max(0, Math.min(1, (v - 8) / free)) : 0; };
    minimapPrefs.fx = frac(left, wrap.width); minimapPrefs.fy = frac(top, wrap.height);
    store.set('minimap', minimapPrefs);
  }
  window.addEventListener('resize', placeMinimap);
  minimap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rect = minimap.getBoundingClientRect(), wrap = $('board-wrap').getBoundingClientRect();
    const left = e.clientX - rect.left <= 12;
    const bottom = rect.bottom - e.clientY <= 12;
    // Ailleurs que sur les bords : un glissement déplace l'aperçu
    if (!left && !bottom) {
      moveCandidate = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left - wrap.left, top: rect.top - wrap.top };
      return;
    }
    // Attendre un vrai glissement avant de redimensionner : un simple appui
    // près du bord doit toujours pouvoir sélectionner ou jouer un coup.
    resizeCandidate = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, size: rect.width, left: rect.left - wrap.left, top: rect.top - wrap.top, edge: left && bottom ? 'corner' : left ? 'left' : 'bottom' };
  });
  // Suivi au niveau de la fenêtre : un glissement rapide peut quitter l'aperçu avant la capture du pointeur
  window.addEventListener('pointermove', (e) => {
    if (minimapResize && e.pointerId === minimapResize.pointerId) {
      applyMinimapResize(e, minimapResize);
      return;
    }
    if (minimapMove && e.pointerId === minimapMove.pointerId) {
      applyMinimapMove(e, minimapMove);
      return;
    }
    if (moveCandidate && e.pointerId === moveCandidate.pointerId && Math.hypot(e.clientX - moveCandidate.x, e.clientY - moveCandidate.y) >= 7) {
      minimapMove = moveCandidate;
      moveCandidate = null;
      minimapTap = null;
      try { minimap.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
      minimap.classList.add('dragging');
      e.preventDefault();
      applyMinimapMove(e, minimapMove);
      return;
    }
    if (!resizeCandidate || e.pointerId !== resizeCandidate.pointerId || Math.hypot(e.clientX - resizeCandidate.x, e.clientY - resizeCandidate.y) < 7) return;
    minimapResize = resizeCandidate;
    resizeCandidate = null;
    minimapTap = null;
    try { minimap.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    e.preventDefault();
    applyMinimapResize(e, minimapResize);
  });
  function applyMinimapMove(e, drag) {
    const wrap = $('board-wrap').getBoundingClientRect(), size = minimap.getBoundingClientRect().width;
    const left = Math.max(0, Math.min(wrap.width - size, drag.left + e.clientX - drag.x));
    const top = Math.max(0, Math.min(wrap.height - size, drag.top + e.clientY - drag.y));
    minimap.style.left = `${left}px`; minimap.style.top = `${top}px`;
    minimap.classList.add('user-placed');
    drag.last = { left, top };
    suppressMinimapClick = true;
  }
  function applyMinimapResize(e, drag) {
    const dx = drag.x - e.clientX, dy = e.clientY - drag.y;
    const delta = drag.edge === 'left' ? dx : drag.edge === 'bottom' ? dy : (Math.abs(dx) >= Math.abs(dy) ? dx : dy);
    const bounds = $('board-wrap').getBoundingClientRect();
    const size = Math.max(120, Math.min(420, bounds.width - 16, bounds.height - 16, drag.size + delta));
    minimap.style.setProperty('--minimap-size', `${size}px`);
    minimap.classList.add('user-sized');
    // Aperçu déplacé : il s'agrandit vers la gauche en gardant son bord droit, sans sortir de l'échiquier
    if (minimap.classList.contains('user-placed')) {
      const left = Math.max(0, Math.min(bounds.width - size, drag.left + drag.size - size));
      const top = Math.max(0, Math.min(bounds.height - size, drag.top));
      minimap.style.left = `${left}px`; minimap.style.top = `${top}px`;
      drag.last = { left, top };
    }
    drag.lastSize = size;
    suppressMinimapClick = true;
  }
  const endMinimapResize = (e) => {
    if (resizeCandidate && e.pointerId === resizeCandidate.pointerId) resizeCandidate = null;
    if (moveCandidate && e.pointerId === moveCandidate.pointerId) moveCandidate = null;
    if (minimapMove && e.pointerId === minimapMove.pointerId) {
      if (minimap.hasPointerCapture(e.pointerId)) minimap.releasePointerCapture(e.pointerId);
      if (e.type === 'pointercancel' || !minimap.contains(e.target)) suppressMinimapClick = false;
      minimap.classList.remove('dragging');
      if (minimapMove.last) rememberMinimapPlace(minimapMove.last.left, minimapMove.last.top);
      minimapMove = null;
      return;
    }
    if (!minimapResize || e.pointerId !== minimapResize.pointerId) return;
    if (minimap.hasPointerCapture(e.pointerId)) minimap.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel' || !minimap.contains(e.target)) suppressMinimapClick = false;
    if (minimapResize.lastSize) { minimapPrefs.size = minimapResize.lastSize; store.set('minimap', minimapPrefs); }
    if (minimapResize.last) rememberMinimapPlace(minimapResize.last.left, minimapResize.last.top);
    minimapResize = null;
  };
  window.addEventListener('pointerup', endMinimapResize);
  window.addEventListener('pointercancel', endMinimapResize);
  minimap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest('button[data-sq]');
    minimapTap = cell ? { pointerId: e.pointerId, sq: Number(cell.dataset.sq) } : null;
  });
  minimap.addEventListener('pointerup', (e) => {
    if (suppressMinimapClick) { suppressMinimapClick = false; minimapTap = null; return; }
    const tap = minimapTap;
    minimapTap = null;
    if (!tap || e.pointerId !== tap.pointerId) return;
    const cell = e.target.closest('button[data-sq]');
    if (!cell || Number(cell.dataset.sq) !== tap.sq) return;
    e.preventDefault();
    tapSquare(tap.sq, tap.sq);
  });
  minimap.addEventListener('pointercancel', () => { minimapTap = null; });
  // Garder aussi l'activation clavier et lecteur d'écran (sans doubler le pointeur).
  minimap.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const cell = e.target.closest('button[data-sq]');
    if (cell) { const sq = Number(cell.dataset.sq); tapSquare(sq, sq); }
  });
  function renderBoard() {
    const el = $('board');
    if (!minimapMove && !minimapResize) placeMinimap();
    const s = game.state;
    const last = replayAnimationOverride || game.lastMove();
    const targets = marks ? marks.map((to) => ({ to })) : selected >= 0 ? game.movesFrom(selected) : [];
    const checkSq = game.inCheck() ? s.board.indexOf(s.turn === 'w' ? 'K' : 'k') : -1;
    const mateFire = [];
    let mateUltimate = null;
    // En problème ou en cours, un mat déclenche aussi l'attaque de mat, comme en partie
    let shown = result;
    if (!shown && pz) { const st = game.status(); if (st.over && st.reason === 'mat') shown = { result: st.result, reason: 'mat', ultimateId: `pz-${window.Chess.toFen(s)}` }; }
    if (shown && shown.reason === 'mat') {
      const kingSq = s.board.indexOf(s.turn === 'w' ? 'K' : 'k');
      if (kingSq >= 0) {
        // C'est la pièce qui donne échec (celle qui mate) qui fait l'attaque de mat, même sur un échec à la découverte
        const checkers = window.Chess.pseudoMoves({ ...s, turn: s.turn === 'w' ? 'b' : 'w', ep: -1, castling: '' }).filter((m) => m.to === kingSq).map((m) => m.from);
        const mater = last && checkers.includes(last.to) ? last.to : checkers[0];
        // Un Roi ne peut pas attaquer directement le Roi adverse dans une position légale.
        // Ne pas lancer l'animation spectaculaire de mat si une position invalide le désigne comme attaquant.
        if (last && mater != null && s.board[mater] && s.board[mater].toLowerCase() !== 'k') {
          const movedPiece = s.board[mater];
          const ultimatePiece = movedPiece;
          const attackerTo = mater;
          const whiteQueenUltimate = ultimatePiece === 'Q';
          const flameSquares = ultimatePiece === 'q' ? s.board.reduce((squares, piece, sq) => {
            if (!piece || (piece === piece.toUpperCase()) !== (ultimatePiece === ultimatePiece.toUpperCase())) squares.push(sq);
            return squares;
          }, []) : [];
          const energySquares = whiteQueenUltimate ? s.board.reduce((squares, piece, sq) => {
            if (piece && piece === piece.toLowerCase() && piece.toLowerCase() !== 'k') squares.push(sq);
            return squares;
          }, []) : [];
          const whiteFlameSquares = whiteQueenUltimate ? s.board.reduce((squares, piece, sq) => {
            if (!piece || piece !== piece.toUpperCase()) squares.push(sq);
            return squares;
          }, []) : [];
          mateUltimate = { id: shown.ultimateId, from: mater === last.to ? last.from : mater, attackerTo, to: kingSq, piece: ultimatePiece, flameSquares, energySquares, whiteFlameSquares };
        }
        if (!b3d || !mateUltimate || mateUltimate.piece.toLowerCase() !== 'q') {
          const legalKingMoves = new Set(game.movesFrom(kingSq).map((m) => m.to));
          for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
            if (!dr && !df) continue;
            const r = (kingSq >> 3) + dr, f = (kingSq & 7) + df;
            if (r < 0 || r > 7 || f < 0 || f > 7) continue;
            const sq = r * 8 + f;
            if (!s.board[sq] && !legalKingMoves.has(sq)) mateFire.push(sq);
          }
        }
      }
    }
    const lessonStep = pz && pz.kind === 'lesson' ? pz.steps[pz.idx] : null;
    const tutorialStars = lessonStep && !pz.done && lessonStep.stars ? lessonStep.stars.map((square) => window.Chess.sqIndex(square)) : [];
    const arrows = replay ? replayArrows() : (lessonStep && lessonStep.arrows ? lessonStep.arrows : (!pz && cfg && cfg.mode === 'coach' ? coachArrows : []));
    // vue « 2D » seule : la 3D n'est pas mise à jour (et ne se dessine plus), le plateau 2D prend toute la place
    if (b3d && settings.boardView !== '2d') {
      const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
      b3d.update({ board: s.board, selected, targets, marks, last, check: checkSq, mateFire, mateUltimate, hint, tutorialStars, flipped, showMoves: settings.showMoves || !!marks, coords: settings.coords, light: th.light, dark: th.dark, animate: animateNext && settings.anim !== 'none', outcome: shown ? shown.result : null, arrows, ply: pz ? null : game.history.length });
      animateNext = false;
      renderMinimap(s.board, last, selected, targets, mateFire, arrows, hint, tutorialStars);
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 64; i++) {
      const sq = displayToBoard(i);
      const r = sq >> 3, f = sq & 7;
      const cell = document.createElement('div');
      cell.className = 'sq ' + ((r + f) % 2 ? 'd' : 'l');
      cell.dataset.sq = sq;
      cell.setAttribute('role', 'gridcell');
      if (last && (last.from === sq || last.to === sq)) cell.classList.add('last');
      if (marks && marks.includes(sq)) cell.classList.add('coach-square-mark');
      if (sq === selected) cell.classList.add('sel');
      if (sq === checkSq) cell.classList.add('check');
      if (mateFire.includes(sq)) cell.classList.add('mate-fire');
      if (hint && hint.from === sq) cell.classList.add('hint-from');
      if (hint && hint.to === sq) cell.classList.add('hint-to');
      const p = s.board[sq];
      if (tutorialStars.includes(sq)) cell.classList.add('tutorial-star');
      if (p && marks && marks.includes(sq)) cell.classList.add('coach-piece-mark');
      cell.setAttribute('aria-label', sqName(sq) + (p ? ' ' + p : ''));
      if (tutorialStars.includes(sq)) cell.setAttribute('aria-label', `${sqName(sq)} · ${L('étoile à récupérer', 'star to collect')}`);
      if (settings.coords) {
        const row = i >> 3, col = i & 7;
        const name = sqName(sq);
        if (row === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord f top">${name[0]}</span>`);
        if (row === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord f bottom">${name[0]}</span>`);
        if (col === 0) cell.insertAdjacentHTML('beforeend', `<span class="coord r left">${name[1]}</span>`);
        if (col === 7) cell.insertAdjacentHTML('beforeend', `<span class="coord r right">${name[1]}</span>`);
      }
      if (p) {
        const pc = document.createElement('span');
        pc.className = 'pc ' + colorOf(p);
        pc.textContent = glyph(p);
        cell.appendChild(pc);
      }
      if (settings.showMoves && targets.some((m) => m.to === sq)) {
        cell.insertAdjacentHTML('beforeend', p || targets.some((m) => m.to === sq && m.flag === 'ep') ? '<span class="ring"></span>' : '<span class="dot"></span>');
      }
      frag.appendChild(cell);
    }
    el.replaceChildren(frag);
    if (animateNext && last) {
      animateNext = false;
      const animatePiece = (from, to, piece) => {
        const fromView = displayToBoard(from), toView = displayToBoard(to);
        const fromRow = fromView >> 3, fromCol = fromView & 7;
        const toRow = toView >> 3, toCol = toView & 7;
        const target = el.querySelector(`.sq[data-sq="${to}"] .pc`);
        if (target) target.style.visibility = 'hidden';
        const token = document.createElement('span');
        token.className = `pc ${colorOf(piece)} move-replay-token`;
        token.textContent = glyph(piece);
        token.style.left = `${fromCol * 12.5}%`;
        token.style.top = `${fromRow * 12.5}%`;
        el.appendChild(token);
        const animation = token.animate([
          { transform: 'translate(0, 0)' },
          { transform: `translate(${(toCol - fromCol) * 100}%, ${(toRow - fromRow) * 100}%)` },
        ], { duration: 800, easing: 'cubic-bezier(.2,.75,.35,1)' });
        animation.onfinish = () => { token.remove(); if (target) target.style.visibility = ''; };
      };
      animatePiece(last.from, last.to, last.piece);
      if (last.flag === 'castle') {
        const kingside = last.to > last.from;
        animatePiece(last.from + (kingside ? 3 : -4), last.from + (kingside ? 1 : -1), last.piece === 'K' ? 'R' : 'r');
      }
    } else animateNext = false;
    if (arrows.length) el.insertAdjacentHTML('beforeend', arrowsSvg(arrows));
  }


  function capturedBy(color) {
    // Pièces adverses manquantes par rapport à la position de départ
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const enemy = color === 'w' ? 'b' : 'w';
    const count = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const p of game.state.board) if (p && colorOf(p) === enemy && p.toLowerCase() !== 'k') count[p.toLowerCase()]++;
    let out = '';
    for (const t of 'qrbnp') for (let i = 0; i < Math.max(0, start[t] - count[t]); i++) {
      const piece = enemy === 'w' ? t.toUpperCase() : t;
      out += `<span class="captured-piece ${enemy === 'w' ? 'w' : 'k'}" role="img" aria-label="${pieceName(piece)}" title="${pieceName(piece)}">${GLYPH[t]}</span>`;
    }
    return out;
  }
  function material(color) {
    const v = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let sum = 0;
    for (const p of game.state.board) if (p) sum += (colorOf(p) === color ? 1 : -1) * v[p.toLowerCase()];
    return sum;
  }

  function renderPlayers() {
    const bottomColor = flipped ? 'b' : 'w';
    const topColor = flipped ? 'w' : 'b';
    const playerName = String(playerProfile().name || L('Joueur', 'Player')).trim() || L('Joueur', 'Player');
    const label = (c) => {
      // Replay : les noms des joueurs du PGN remplacent « Blancs » et « Noirs »
      if (replay && (c === 'w' ? replay.white : replay.black)) return c === 'w' ? replay.white : replay.black;
      if (cfg.mode === 'local') return c === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      if (cfg.mode === 'online' && onlineGame) {
        const g = onlineGame, t = onlineTimeLeft(g, c);
        return `${c === 'w' ? g.whiteName : g.blackName} (${c === 'w' ? g.whiteElo : g.blackElo})${t != null ? ` · ${fmtClock(t)}` : ''}`;
      }
      if (c === cfg.playerColor) return playerName;
      return cfg.mode === 'coach' ? coachName() : L('Ordinateur', 'Computer');
    };
    for (const [pos, c] of [['bottom', bottomColor], ['top', topColor]]) {
      const name = $('name-' + pos);
      name.textContent = label(c);
      const champ = !replay && cfg.mode === 'coach' && c !== cfg.playerColor && activeChampion();
      if (champ && champ.photo) { const im = document.createElement('img'); im.className = 'player-photo'; im.src = champ.photo.src; im.alt = ''; name.prepend(im); }
      const ph = cfg.mode === 'online' && onlineGame ? onlinePhotos[c === 'w' ? onlineGame.white : onlineGame.black] : !replay && cfg.mode !== 'local' && c === cfg.playerColor ? playerProfile().photo : null;
      if (ph) { const im = document.createElement('img'); im.className = 'player-photo'; im.src = ph; im.alt = ''; name.prepend(im); }
      name.classList.toggle('turn', !result && game.turn === c);
      const adv = material(c);
      $('cap-' + pos).innerHTML = capturedBy(c) + (adv > 0 ? `<small>+${adv}</small>` : '');
    }
  }

  function renderMoves() {
    const ol = $('moves'); ol.innerHTML = '';
    // Position libre où les Noirs commencent : le premier coup s'écrit « 1… »
    const off = game.states[0].turn === 'b' ? 1 : 0, h = [...new Array(off).fill(null), ...game.history];
    const cell = (k) => (h[k] ? `<span data-ply="${k - off + 1}"${k === h.length - 1 ? ' class="cur"' : ''}>${h[k].san}</span>` : h.length > k ? '<span>…</span>' : '');
    for (let i = 0; i < h.length; i += 2) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i)} ${cell(i + 1)}`;
      ol.appendChild(li);
    }
    ol.scrollTop = ol.scrollHeight;
  }

  function renderStatus() {
    const st = $('status');
    st.classList.remove('alert');
    if (result) { st.textContent = `${REASONS[result.reason]} · ${resultText()}`; return; }
    if (thinking) { st.textContent = L("L'ordinateur réfléchit…", 'The computer is thinking…'); return; }
    const side = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
    if (game.inCheck()) { st.textContent = L('Échec !', 'Check!'); st.classList.add('alert'); return; }
    st.textContent = cfg.mode !== 'local' ? (isHumanTurn() ? L('À vous de jouer', 'Your move') : cfg.mode === 'coach' ? L(`${coachName()} réfléchit…`, `${coachName()} is thinking…`) : cfg.mode === 'online' && onlineGame ? L(`Au tour de ${game.turn === 'w' ? onlineGame.whiteName : onlineGame.blackName}`, `${game.turn === 'w' ? onlineGame.whiteName : onlineGame.blackName} to move`) : '') : L(`Au tour des ${side}`, `${side} to move`);
  }

  function renderActions() {
    const plies = game.history.length;
    const myPlies = cfg.mode === 'online' ? game.history.filter((h, i) => (i % 2 === 0 ? 'w' : 'b') === cfg.playerColor).length : 0;
    // parties rapides (à la pendule) : pas de reprise de coup
    const rapid = cfg.mode === 'online' && !isDeferred();
    $('btn-undo').hidden = rapid;
    $('btn-undo').disabled = rapid || !!result || plies === 0 || !!pendingMove || (cfg.mode === 'online' ? myPlies === 0 : cfg.mode !== 'local' && plies < (cfg.playerColor === 'w' ? 1 : 2));
    $('btn-draw').hidden = !humanVsHuman();
    $('btn-draw').disabled = !!result || plies < 2;
    renderConfirm();
    $('btn-hint').disabled = cfg.mode === 'online' || !canInteract(true);
    $('btn-resign').disabled = !!result;
  }

  function resultText() {
    if (!result) return '';
    if (result.result === '1/2-1/2') return L('Partie nulle', 'Draw');
    const winner = result.result === '1-0' ? 'w' : 'b';
    if (cfg.mode === 'online') return winner === cfg.playerColor ? L('Vous gagnez', 'You win') : L('Votre adversaire gagne', 'Your opponent wins');
    if (cfg.mode !== 'local') return winner === cfg.playerColor ? L('Vous gagnez', 'You win') : cfg.mode === 'coach' ? L(`${coachName()} gagne`, `${coachName()} wins`) : L("L'ordinateur gagne", 'The computer wins');
    return winner === 'w' ? L('Les Blancs gagnent', 'White wins') : L('Les Noirs gagnent', 'Black wins');
  }

