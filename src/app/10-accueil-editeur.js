  /* ---------- Accueil ---------- */
  const randomColor = () => (Math.random() < 0.5 ? 'w' : 'b');
  $('btn-player-name').onclick = () => (ON && ON.user ? openAccount() : promptPlayerName());
  $('btn-home-settings').onclick = () => $('btn-settings').click();
  $('btn-home-progress').onclick = () => { returnTo = 'home'; show('problems'); };
  $('btn-home-learn').onclick = () => $('btn-champions').click();
  $('btn-home-play').onclick = () => $('btn-new').click();
  $('btn-home-rewards').onclick = () => $('home-rewards').click();
  $('btn-program').onclick = () => { returnTo = 'home'; show('program'); };
  $('btn-progress-menu').onclick = () => {
    const open = $('progress-submenu').hidden;
    $('progress-submenu').hidden = !open;
    $('btn-progress-menu').setAttribute('aria-expanded', String(open));
  };
  $('btn-play-menu').onclick = () => {
    const open = $('play-submenu').hidden;
    $('play-submenu').hidden = !open;
    $('btn-play-menu').setAttribute('aria-expanded', String(open));
  };
  const closeMobileMenu = () => {
    document.body.classList.remove('mobile-menu-open');
    $('mobile-menu-backdrop').hidden = true;
    $('mobile-menu-toggle').setAttribute('aria-expanded', 'false');
  };
  $('mobile-menu-toggle').onclick = () => {
    const open = !document.body.classList.contains('mobile-menu-open');
    document.body.classList.toggle('mobile-menu-open', open);
    $('mobile-menu-backdrop').hidden = !open;
    $('mobile-menu-toggle').setAttribute('aria-expanded', String(open));
  };
  $('mobile-menu-backdrop').onclick = closeMobileMenu;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileMenu();
  });
  $('program-continue').onclick = () => { returnTo = 'problems'; show('problems'); nextActivity(); };
  $('program-game').onclick = () => $('btn-coach-game').click();
  $('btn-coach-game').onclick = () => {
    const target = estimatedElo(), top = unlocked();
    let level = 1;
    for (let candidate = 2; candidate <= top; candidate++) {
      if (Math.abs(LEVEL_ELO[candidate] - target) < Math.abs(LEVEL_ELO[level] - target)) level = candidate;
    }
    setup.mode = 'coach'; setup.level = level;
    store.set('setup', setup);
    startGame({ mode: 'coach', playerColor: randomColor(), level });
  };
  $('btn-coach-program').onclick = () => { returnTo = 'problems'; show('problems'); nextActivity(); };
  $('btn-new').onclick = () => { renderSetup(); returnTo = 'home'; show('setup'); };
  $('btn-start').onclick = () => {
    store.set('setup', setup);
    startGame({ mode: setup.mode, playerColor: randomColor(), level: setup.level });
  };
  /* ---------- Construire une position ---------- */
  const ED_PIECES = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];
  const ed = { board: [], tool: 'move', from: -1, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, mode: 'ai', color: 'w', level: 1, flip: false };
  function edLoad(fen) {
    const s = window.Chess.fromFen(fen);
    ed.board = s.board.slice(); ed.turn = s.turn; ed.from = -1;
    ed.castle = { K: s.castling.includes('K'), Q: s.castling.includes('Q'), k: s.castling.includes('k'), q: s.castling.includes('q') };
  }
  // Roques possibles seulement si le roi et la tour concernés sont sur leurs cases de départ
  const edCastleOk = { K: () => ed.board[60] === 'K' && ed.board[63] === 'R', Q: () => ed.board[60] === 'K' && ed.board[56] === 'R', k: () => ed.board[4] === 'k' && ed.board[7] === 'r', q: () => ed.board[4] === 'k' && ed.board[0] === 'r' };
  function edFen() {
    const castling = ['K', 'Q', 'k', 'q'].filter((c) => ed.castle[c] && edCastleOk[c]()).join('');
    return window.Chess.toFen({ board: ed.board, turn: ed.turn, castling, ep: -1, half: 0, full: 1 });
  }
  function edError() {
    const fen = edFen(), err = fenError(fen);
    if (err) { const m = err.replace(/^FEN invalide : /, '').replace(/^Invalid FEN: /, ''); return m.charAt(0).toUpperCase() + m.slice(1); }
    const s = window.Chess.fromFen(fen);
    if (window.Chess.inCheck(s, ed.turn === 'w' ? 'b' : 'w')) return L("Le camp qui n'a pas le trait ne peut pas être en échec.", 'The side not to move cannot be in check.');
    const st = new Game(fen).status();
    if (st.over) return st.reason === 'mat' ? L('Cette position est déjà échec et mat.', 'This position is already checkmate.') : L('Cette position est déjà terminée (pat ou nulle).', 'This position is already over (stalemate or draw).');
    return '';
  }
  function openEditor(fen) {
    edLoad(fen || window.Chess.START_FEN);
    ed.level = setup.level; ed.mode = setup.mode === 'local' ? 'local' : 'ai';
    returnTo = 'home';
    renderEditor();
    show('editor');
  }
  function renderEditor() {
    const seg = (name, opts, cur) => `<div class="ed-seg" data-ed="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${v === cur ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const tool = (v, inner, label) => `<button type="button" class="ed-tool${ed.tool === v ? ' on' : ''}" data-tool="${v}" aria-label="${label}" title="${label}">${inner}</button>`;
    const castleBox = (c, label) => `<label class="ed-check${edCastleOk[c]() ? '' : ' off'}"><input type="checkbox" data-castle="${c}" ${ed.castle[c] && edCastleOk[c]() ? 'checked' : ''} ${edCastleOk[c]() ? '' : 'disabled'}> ${label}</label>`;
    const err = edError();
    $('editor-body').innerHTML = `
      <div class="ed-layout">
        <div class="ed-board-column">
          <p class="level-help">${L('Choisis une pièce puis touche les cases pour la poser. Avec la main, touche une pièce puis sa nouvelle case pour la déplacer.', 'Pick a piece, then tap squares to place it. With the hand, tap a piece and then its new square to move it.')}</p>
          <div class="ed-palette">${tool('move', '✋', L('Déplacer', 'Move'))}${ED_PIECES.slice(0, 6).map((p) => tool(p, `<span class="pc w">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
          <div class="ed-palette">${tool('erase', '⌫', L('Effacer', 'Erase'))}${ED_PIECES.slice(6).map((p) => tool(p, `<span class="pc b">${glyph(p)}</span>`, pieceName(p))).join('')}</div>
          <div class="ed-board-wrap"><div id="ed-board" class="ed-board" role="grid" aria-label="${L('Échiquier à construire', 'Board to set up')}"></div></div>
        </div>
        <div class="ed-controls-column">
          <div class="ed-actions">
            <button type="button" class="btn" data-ed-act="start">${L('Position de départ', 'Starting position')}</button>
            <button type="button" class="btn" data-ed-act="clear">${L('Vider', 'Clear')}</button>
            <button type="button" class="btn" data-ed-act="flip">${L('Retourner', 'Flip')}</button>
          </div>
          <label class="field-label">${L('Trait aux', 'To move')}</label>
          ${seg('turn', [['w', L('Blancs', 'White')], ['b', L('Noirs', 'Black')]], ed.turn)}
          <label class="field-label">${L('Roques encore possibles', 'Castling still allowed')}</label>
          <div class="ed-castles">${castleBox('K', L('Blancs O-O', 'White O-O'))}${castleBox('Q', L('Blancs O-O-O', 'White O-O-O'))}${castleBox('k', L('Noirs O-O', 'Black O-O'))}${castleBox('q', L('Noirs O-O-O', 'Black O-O-O'))}</div>
          <label class="field-label">${L('Adversaire', 'Opponent')}</label>
          ${seg('mode', [['ai', L('Ordinateur', 'Computer')], ['local', L('Deux joueurs', 'Two players')]], ed.mode)}
          <div ${ed.mode === 'ai' ? '' : 'hidden'}>
            <label class="field-label">${L('Ta couleur', 'Your colour')}</label>
            ${seg('color', [['w', L('Blancs', 'White')], ['b', L('Noirs', 'Black')]], ed.color)}
            <label class="field-label">${L('Niveau', 'Level')} : <strong>${LEVEL_NAMES[ed.level]} (Elo ${LEVEL_ELO[ed.level]})</strong></label>
            <div id="ed-level-grid" class="level-grid" role="radiogroup" aria-label="${L('Niveau', 'Level')}">${levelGridHtml(ed.level)}</div>
          </div>
          <p class="ed-error" role="status">${escHtml(err)}</p>
          <button type="button" id="ed-play" class="btn primary wide" ${err ? 'disabled' : ''}>${L('Jouer cette position', 'Play this position')}</button>
          <p class="level-help">${L('Une partie jouée depuis une position libre ne compte pas pour ton Elo ni pour débloquer les niveaux.', 'A game played from a custom position does not count for your Elo or for unlocking levels.')}</p>
        </div>
      </div>`;
    renderEdBoard();
  }
  function renderEdBoard() {
    const el = $('ed-board'); if (!el) return;
    let html = '';
    for (let i = 0; i < 64; i++) {
      const sq = ed.flip ? 63 - i : i, p = ed.board[sq], row = i >> 3, col = i & 7;
      const dark = ((sq >> 3) + (sq & 7)) % 2 === 1;
      html += `<button type="button" class="sq ${dark ? 'd' : 'l'}${sq === ed.from ? ' sel' : ''}" data-sq="${sq}" aria-label="${sqName(sq)}${p ? ' ' + pieceName(p) : ''}">`
        + (row === 7 ? `<span class="coord f bottom">${sqName(sq)[0]}</span>` : '') + (col === 0 ? `<span class="coord r left">${sqName(sq)[1]}</span>` : '')
        + (p ? `<span class="pc ${colorOf(p)}">${glyph(p)}</span>` : '') + '</button>';
    }
    el.innerHTML = html;
  }
  function edTap(sq) {
    if (ed.tool === 'erase') ed.board[sq] = null;
    else if (ed.tool === 'move') {
      if (ed.from < 0) { if (ed.board[sq]) ed.from = sq; renderEdBoard(); return; }
      if (sq !== ed.from) { ed.board[sq] = ed.board[ed.from]; ed.board[ed.from] = null; }
      ed.from = -1;
    } else {
      const p = ed.tool;
      if (p.toLowerCase() === 'p' && (sq < 8 || sq >= 56)) return toast(L('Un pion ne peut pas être sur la première ou la dernière rangée.', 'A pawn cannot stand on the first or last rank.'));
      // un seul roi par camp : poser un roi déplace l'ancien
      if (p.toLowerCase() === 'k') { const old = ed.board.indexOf(p); if (old >= 0) ed.board[old] = null; }
      ed.board[sq] = ed.board[sq] === p ? null : p;
    }
    renderEditor();
  }
  $('editor-body').addEventListener('click', (e) => {
    const cell = e.target.closest('#ed-board [data-sq]');
    if (cell) return edTap(Number(cell.dataset.sq));
    const t = e.target.closest('[data-tool]');
    if (t) { ed.tool = t.dataset.tool; ed.from = -1; return renderEditor(); }
    const s = e.target.closest('.ed-seg [data-value]');
    if (s) { ed[s.parentElement.dataset.ed] = s.dataset.value; return renderEditor(); }
    const lv = e.target.closest('#ed-level-grid button[data-level]');
    if (lv && !lv.disabled) { ed.level = +lv.dataset.level; return renderEditor(); }
    const act = e.target.closest('[data-ed-act]');
    if (act) {
      const a = act.dataset.edAct;
      if (a === 'start') edLoad(window.Chess.START_FEN);
      else if (a === 'clear') { ed.board = new Array(64).fill(null); ed.from = -1; }
      else if (a === 'flip') ed.flip = !ed.flip;
      return renderEditor();
    }
    if (e.target.id === 'ed-play') {
      if (edError()) return;
      const fen = edFen();
      store.set('editorFen', fen);
      startGame({ mode: ed.mode, playerColor: ed.mode === 'local' ? 'w' : ed.color, level: ed.level, fen }, [], null, ed.mode === 'local' ? ed.flip : ed.color === 'b');
    }
  });
  $('editor-body').addEventListener('change', (e) => {
    const c = e.target.closest('[data-castle]');
    if (c) { ed.castle[c.dataset.castle] = c.checked; renderEditor(); }
  });
  $('btn-editor').onclick = () => openEditor(store.get('editorFen', null));
