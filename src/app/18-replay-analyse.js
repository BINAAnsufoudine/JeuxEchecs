  /* ---------- Replay ---------- */
  const MODE_LABELS = L({ ai: 'Contre ordinateur', coach: 'Partie coachée', local: 'Deux joueurs', free: 'Positions libres', online: 'En ligne' }, { ai: 'Against the computer', coach: 'Coached game', local: 'Two players', free: 'Custom positions', online: 'Online' });
  const RESULT_LABELS = L({ '1-0': 'Victoire des Blancs', '0-1': 'Victoire des Noirs', '1/2-1/2': 'Partie nulle', '*': 'Partie inachevée' }, { '1-0': 'White wins', '0-1': 'Black wins', '1/2-1/2': 'Draw', '*': 'Unfinished game' });
  const escHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDateTime = (id) => new Date(id).toLocaleString(LOCALE, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function setReplayUi(on) {
    $('replay-bar').hidden = !on;
    $('game-actions').hidden = on;
  }
  function stopReplayPlay() {
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    const btn = $('rp-play');
    if (btn) btn.innerHTML = `<span>▶</span>${L('Lecture', 'Play')}`;
  }

  // Seules les prises recommandées sont fléchées : la pièce prise vaut au moins autant que la pièce
  // qui prend, ou la case d'arrivée n'est plus attaquée par l'adversaire après la prise.
  function replayArrows() {
    const s = game.state, out = [], seen = new Set();
    const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    for (const [turn, color] of [[s.turn, 'green'], [s.turn === 'w' ? 'b' : 'w', 'red']]) {
      const st = turn === s.turn ? s : { ...s, turn, ep: -1 };
      const enemy = turn === 'w' ? 'b' : 'w';
      for (const m of window.Chess.legalMoves(st)) {
        if (!m.captured) continue;
        const gain = value[m.captured.toLowerCase()] - value[m.piece.toLowerCase()];
        let recommended = gain >= 0;
        if (!recommended) {
          const after = window.Chess.makeMove(st, m);
          recommended = !window.Chess.isAttacked(after.board, m.to, enemy);
        }
        if (!recommended) continue;
        const key = `${m.from}-${m.to}-${color}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ from: m.from, to: m.to, color });
      }
    }
    const mark = replay.showReview && replay.review && replay.review.marks[replay.index - 1];
    if (mark && ['inaccuracy', 'mistake', 'blunder'].includes(mark[0]) && mark[2]) {
      out.push({ from: window.Chess.sqIndex(mark[2].slice(0, 2)), to: window.Chess.sqIndex(mark[2].slice(2, 4)), color: 'blue' });
    }
    return out;
  }

  /* ---------- Analyse de partie, export PGN, lien de partage, bilan ---------- */
  const REVIEW_LABELS = L({ best: 'Meilleur coup', brilliant: 'Coup brillant', excellent: 'Très bon coup', good: 'Bon coup', inaccuracy: 'Imprécision', mistake: 'Erreur', blunder: 'Gaffe' }, { best: 'Best move', brilliant: 'Brilliant move', excellent: 'Very good move', good: 'Good move', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' });
  const REVIEW_SIGN = { best: '', brilliant: '!!', excellent: '!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' };
  const isSevere = (mark) => !!mark && (mark[0] === 'mistake' || mark[0] === 'blunder');
  const isFault = (mark) => !!mark && ['inaccuracy', 'mistake', 'blunder'].includes(mark[0]);
  const reviewKey = (fen, moves) => `v2|${fen}|${moves.join(' ')}`;
  const loadReview = (k, fen, moves) => {
    const reviews = store.get('reviews', []);
    let hit = reviews.find((x) => x.k === k);
    const legacyKey = k.startsWith('v2|') ? k.slice(3) : k;
    if (!hit) hit = reviews.find((x) => x.k === legacyKey);
    if (!hit) return null;
    const review = hit.r;
    // Reuse older saved analyses; promote exact engine choices to positive labels
    // and identify sound piece offers without making the user run the analysis again.
    if (hit.k === legacyKey && Array.isArray(review.marks) && Array.isArray(moves)) {
      const gameAtMove = new Game(fen);
      review.marks.forEach((mark, i) => {
        const played = moves[i] && gameAtMove.playUci(moves[i]);
        if (mark && mark[0] === 'best') {
          mark[0] = 'excellent';
          const last = gameAtMove.lastMove();
          const pieceValue = last && ({ p: 100, n: 320, b: 330, r: 500, q: 900 }[last.piece.toLowerCase()] || 0);
          if (played && last && pieceValue >= 300 && window.Chess.legalMoves(gameAtMove.state).some((reply) => reply.to === last.to && reply.captured)) mark[0] = 'brilliant';
        }
      });
    }
    return review;
  };
  const reviewJobs = new Map();
  let reviewing = false;

  // Une seule analyse par partie à la fois ; les demandes simultanées partagent le même calcul
  function requestReview(fen, moves, onProgress) {
    const k = reviewKey(fen, moves), cached = loadReview(k, fen, moves);
    if (cached) return Promise.resolve(cached);
    let job = reviewJobs.get(k);
    if (!job) {
      job = { listeners: new Set() };
      job.promise = new Promise((resolve, reject) => {
        let w;
        try { w = new Worker(`analyse-worker.js?lang=${LANG}`); } catch (err) { reject(err); return; }
        w.onmessage = (e) => {
          const d = e.data;
          if (d.progress) { job.listeners.forEach((f) => f(d.progress[0], d.progress[1])); return; }
          w.terminate();
          if (d.ok) {
            const list = store.get('reviews', []).filter((x) => x.k !== k);
            list.push({ k, r: d.review });
            store.set('reviews', list.slice(-20));
            resolve(d.review);
          } else reject(new Error(d.error));
        };
        w.onerror = (err) => { w.terminate(); reject(err); };
        w.postMessage({ id: 1, review: true, moves, fen: fen === window.Chess.START_FEN ? undefined : fen });
      }).finally(() => reviewJobs.delete(k));
      reviewJobs.set(k, job);
    }
    if (onProgress) job.listeners.add(onProgress);
    return job.promise;
  }

  function sanOfBest(fen, moves, ply0, uci) {
    const g = new Game(fen);
    for (let i = 0; i < ply0; i++) g.playUci(moves[i]);
    const r = g.playUci(uci);
    return r ? r.san : uci;
  }
  const fmtEval = (e) => (Math.abs(e) >= 1500 ? (e > 0 ? L('mat pour les Blancs', 'mate for White') : L('mat pour les Noirs', 'mate for Black')) : `${e > 0 ? '+' : ''}${NUM(e / 100)}`);

  function renderReview(rv, cur) {
    // Le panneau du maître fait partie de l'écran replay, même avant le calcul d'analyse.
    $('rp-review').hidden = !replay;
    $('rp-filter-label').textContent = L('Filtrer', 'Filter');
    $('rp-filter').setAttribute('aria-label', L('Filtrer la transcription', 'Filter the move list'));
    $('rp-filter').innerHTML = `<option value="all">${L('Tous les coups', 'All moves')}</option><option value="faults">${L('Fautes', 'Mistakes')}</option><option value="excellent">${L('Très bons coups', 'Excellent moves')}</option><option value="brilliant">${L('Coups brillants', 'Brilliant moves')}</option>`;
    $('rp-filter').disabled = !(replay && replay.review);
    $('rp-filter').value = replay && replay.filter || 'all';
    if (!reviewing) {
      const btn = $('rp-analyse');
      btn.disabled = false;
      btn.textContent = !replay.review ? L('📈 Analyser', '📈 Analyse') : replay.showReview ? L('📈 Masquer', '📈 Hide') : L('📈 Analyse', '📈 Analysis');
    }
    if (!rv) {
      $('rp-comment').textContent = replay
        ? replay.review
          ? L('Analyse masquée. Appuie sur « Analyser » pour afficher mes commentaires.', 'Analysis hidden. Tap “Analyse” to show my comments.')
          : L('Lance l’analyse de la partie pour que je commente les coups et repère les fautes.', 'Analyse the game to hear my comments and find mistakes.')
        : '';
      $('rp-prevbad').disabled = $('rp-nextbad').disabled = !(replay && replay.review);
      $('rp-voice').disabled = !replay;
      $('rp-acc').hidden = $('rp-graph').hidden = true;
      return;
    }
    $('rp-prevbad').disabled = $('rp-nextbad').disabled = false;
    $('rp-voice').disabled = false;
    const hasGraph = Array.isArray(rv.ev) && rv.ev.length > 1 && rv.ev.every(Number.isFinite);
    $('rp-acc').hidden = false;
    $('rp-graph').hidden = !hasGraph;
    if (hasGraph) {
      const n = rv.ev.length, X = (i) => (i / (n - 1)) * 200, Y = (e) => 32 - Math.tanh(e / 400) * 30;
      const pts = rv.ev.map((e, i) => `${X(i).toFixed(1)},${Y(e).toFixed(1)}`).join(' L');
      let svg = `<path class="g-area" d="M0,64 L${pts} L${X(n - 1).toFixed(1)},64 Z"/><line class="g-mid" x1="0" x2="200" y1="32" y2="32"/>`;
      rv.marks.forEach((m, i) => { if (isSevere(m)) svg += `<line class="g-bad" x1="${X(i + 1).toFixed(1)}" x2="${X(i + 1).toFixed(1)}" y1="54" y2="64"/>`; });
      svg += `<line class="g-cur" x1="${X(cur).toFixed(1)}" x2="${X(cur).toFixed(1)}" y1="0" y2="64"/>`;
      $('rp-graph').innerHTML = svg;
    }
    const who = rv.accuracy;
    $('rp-acc').innerHTML = `${rv.opening ? `<b>${escHtml(rv.opening)}</b><br>` : ''}${L('Précision : Blancs', 'Accuracy: White')} ${who.w == null ? '–' : who.w + ' %'} · ${L('Noirs', 'Black')} ${who.b == null ? '–' : who.b + ' %'}`;
    const mark = rv.marks[cur - 1];
    let text = L(`Position de départ · évaluation ${fmtEval(rv.ev[0] || 0)}`, `Starting position · evaluation ${fmtEval(rv.ev[0] || 0)}`);
    let speechText = '', speechCues = [];
    if (mark) {
      text = `<b>${escHtml(replay.sans[cur - 1])}${REVIEW_SIGN[mark[0]]}</b> — ${REVIEW_LABELS[mark[0]]} · ${L('évaluation', 'evaluation')} ${fmtEval(rv.ev[cur])}`;
      if (['inaccuracy', 'mistake', 'blunder'].includes(mark[0])) {
        const explanation = L(
          { inaccuracy: 'Une meilleure suite était disponible.', mistake: 'Ce coup détériore nettement la position.', blunder: 'Cette gaffe entraîne une forte dégradation de la position.' }[mark[0]],
          { inaccuracy: 'A better continuation was available.', mistake: 'This move significantly worsens the position.', blunder: 'This blunder causes a major deterioration in the position.' }[mark[0]],
        );
        const best = sanOfBest(replay.fen, replay.moves, cur - 1, mark[2]);
        const loss = NUM(mark[1] / 100), pawn = P(mark[1] / 100, 'pion', 'pions', 'pawn', 'pawns');
        text += `<br>${explanation} ${L('Perte estimée', 'Estimated loss')}: ≈ ${loss} ${pawn}.<br>${L('Meilleur coup :', 'Best move:')} <strong class="rp-best-move">${escHtml(best)}</strong>`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : ${REVIEW_LABELS[mark[0]].toLowerCase()}. ${explanation} Le meilleur coup était ${best}. Perte estimée : ${loss} ${pawn}.`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: ${REVIEW_LABELS[mark[0]].toLowerCase()}. ${explanation} The best move was ${best}. Estimated loss: ${loss} ${pawn}.`);
        const label = REVIEW_LABELS[mark[0]].toLowerCase();
        speechCues = [
          { index: speechText.indexOf(label), run: () => animateUndoMistake(cur) },
          { index: speechText.lastIndexOf(best), run: () => animateRecommendedMove(cur, mark[2]) },
        ];
      } else if (mark[0] === 'brilliant') {
        const explanation = L('Tu as trouvé un sacrifice tactique : la pièce offerte ne peut pas être prise sans conséquence, et le moteur confirme que c’est le meilleur coup.', 'You found a tactical sacrifice: taking the offered piece comes at a cost, and the engine confirms this is the best move.');
        text += `<br>${explanation}`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : coup brillant ! ${explanation}`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: brilliant move! ${explanation}`);
      } else if (mark[0] === 'excellent') {
        const explanation = L('Très bonne décision : tu as trouvé le meilleur coup ou une suite presque aussi précise.', 'Excellent decision: you found the best move or a continuation that is almost as precise.');
        text += `<br>${explanation}`;
        speechText = L(`Au coup ${Math.ceil(cur / 2)}, tu as joué ${replay.sans[cur - 1]} : très bon coup ! ${explanation}`, `On move ${Math.ceil(cur / 2)}, you played ${replay.sans[cur - 1]}: very good move! ${explanation}`);
      }
    }
    $('rp-comment').innerHTML = text;
    if (replay.lastSpokenReviewPly !== cur) {
      replay.lastSpokenReviewPly = cur;
      if (speechText) speak(speechText, speechCues);
    }
  }
  $('rp-analyse').onclick = () => {
    if (!replay || reviewing) return;
    if (replay.review) { replay.showReview = !replay.showReview; render(); return; }
    if (!replay.moves.length) return toast(L('Aucun coup à analyser.', 'No move to analyse.'));
    const mine = replay, btn = $('rp-analyse');
    reviewing = true; btn.disabled = true; btn.textContent = '📈 0 %';
    requestReview(mine.fen, mine.moves, (done, total) => { btn.textContent = `📈 ${Math.round((done / total) * 100)} %`; })
      .then((r) => { mine.review = r; mine.showReview = true; })
      .catch(() => toast(L("L'analyse n'a pas pu être lancée sur cet appareil.", 'The analysis could not start on this device.')))
      .finally(() => { reviewing = false; if (replay) render(); });
  };
  $('rp-filter').onchange = () => {
    if (!replay) return;
    replay.filter = $('rp-filter').value;
    render();
  };
  const jumpToSevere = (dir) => {
    if (!replay || !replay.review) return;
    for (let p = replay.index + dir; p >= 1 && p <= replay.moves.length; p += dir) if (isFault(replay.review.marks[p - 1])) return navigate(p);
    toast(dir > 0 ? L('Plus de faute après ce coup.', 'No more mistakes after this move.') : L('Plus de faute avant ce coup.', 'No more mistakes before this move.'));
  };
  $('rp-nextbad').onclick = () => jumpToSevere(1);
  $('rp-prevbad').onclick = () => jumpToSevere(-1);
  $('rp-graph').onclick = (e) => {
    if (!replay || !replay.review) return;
    const box = e.currentTarget.getBoundingClientRect();
    navigate(Math.round(((e.clientX - box.left) / box.width) * (replay.review.ev.length - 1)));
  };

  const pad2 = (x) => String(x).padStart(2, '0');
  const pgnDate = (id) => { const d = new Date(id); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; };
  const sideNames = (c) => {
    if (c.mode === 'local') return { white: L('Joueur 1', 'Player 1'), black: L('Joueur 2', 'Player 2') };
    const champ = c.champion && champById(c.champion);
    const ai = champ ? champ.name : c.mode === 'coach' ? L('Maître Sissa', 'Master Sissa') : `${L('Ordinateur', 'Computer')} ${LEVEL_NAMES[c.level] || ''}`.trim();
    const me = L('Joueur', 'Player');
    return c.playerColor === 'w' ? { white: me, black: ai } : { white: ai, black: me };
  };
  function pgnFor(entry) {
    const fen = entry.fen || window.Chess.START_FEN, G = new Game(fen), san = [];
    for (const u of entry.moves || []) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
    const st = G.status(), res = entry.result && entry.result !== '*' ? entry.result : st.over ? st.result : '*';
    const tags = { Event: entry.event || L('Partie Ata Wawé', 'Ata Wawé game'), Site: 'Ata Wawé', Date: entry.date || pgnDate(Date.now()), White: entry.white || L('Blancs', 'White'), Black: entry.black || L('Noirs', 'Black'), Result: res };
    if (entry.opening) tags.Opening = entry.opening;
    if (fen !== window.Chess.START_FEN) { tags.SetUp = '1'; tags.FEN = fen; }
    const start = new Game(fen).state;
    let turn = start.turn, n = start.full || 1, body = '';
    san.forEach((m, i) => {
      if (turn === 'w') body += `${n}. ${m} `;
      else { body += `${i === 0 ? `${n}... ` : ''}${m} `; n++; }
      turn = turn === 'w' ? 'b' : 'w';
    });
    return Object.entries(tags).map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`).join('\n') + '\n\n' + (body + res).replace(/(.{1,78})(\s|$)/g, '$1\n').trim() + '\n';
  }
  // Export PGN d'une partie : fichier texte ou copie dans le presse-papiers
  function exportPgn(entry) {
    const text = pgnFor(entry);
    const pre = document.createElement('pre'); pre.className = 'pgn-preview'; pre.textContent = text;
    modal({ title: L('Exporter la partie (PGN)', 'Export the game (PGN)'), body: pre, actions: [
      { label: L('📋 Copier', '📋 Copy'), primary: true, onClick: async () => {
        try { await navigator.clipboard.writeText(text); toast(L('PGN copié dans le presse-papiers', 'PGN copied to the clipboard')); }
        catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(L('PGN copié dans le presse-papiers', 'PGN copied to the clipboard')); } catch { toast(L('Copie impossible ici.', 'Copy not possible here.')); } ta.remove(); }
      } },
      { label: L('⬇ Fichier .txt', '⬇ .txt file'), onClick: () => saveFile(`cavalier-partie-${stamp()}.pgn.txt`, text) },
      { label: L('Fermer', 'Close'), ghost: true },
    ] });
  }
  // partie en cours, quel que soit le mode
  function currentGameEntry() {
    const g = onlineGame;
    const names = cfg.mode === 'online' && g ? { white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})`, event: g.tournamentName ? `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}` : L('Partie en ligne', 'Online game') }
      : cfg.mode === 'local' ? { white: L('Blancs', 'White'), black: L('Noirs', 'Black') } : sideNames(cfg);
    return { moves: game.uciList(), fen: cfg.fen, result: result ? result.result : '*', ...names };
  }
  $('btn-pgn').onclick = () => { if (game && cfg) exportPgn(currentGameEntry()); };
  $('rp-pgn').onclick = () => {
    if (!replay) return;
    exportPgn({ ...replay, opening: replay.review && replay.review.opening });
  };

  const toB64 = (obj) => {
    let s = '';
    new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64 = (text) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
  $('rp-share').onclick = async () => {
    if (!replay) return;
    const payload = { m: replay.moves.join(' '), t: replay.title, r: replay.result, w: replay.white, b: replay.black };
    if (replay.fen !== window.Chess.START_FEN) payload.f = replay.fen;
    const url = `${location.origin}${location.pathname}#r=${toB64(payload)}`;
    try { await navigator.clipboard.writeText(url); toast(L('Lien de la partie copié', 'Game link copied')); }
    catch { modal({ title: L('Lien de partage', 'Share link'), text: url, actions: [{ label: L('Fermer', 'Close'), primary: true }] }); }
  };
  function openSharedLink() {
    const match = /^#r=([\w-]+)$/.exec(location.hash);
    if (!match) return;
    history.replaceState(history.state, '', location.pathname + location.search);
    try {
      const p = fromB64(match[1]);
      if (typeof p.m !== 'string' || p.m.length > 30000) throw new Error('lien');
      const entry = { moves: p.m ? p.m.split(' ') : [], fen: typeof p.f === 'string' ? p.f : undefined, title: String(p.t || L('Partie partagée', 'Shared game')).slice(0, 80), white: p.w ? String(p.w).slice(0, 60) : undefined, black: p.b ? String(p.b).slice(0, 60) : undefined, result: ['1-0', '0-1', '1/2-1/2'].includes(p.r) ? p.r : '*' };
      if (entry.fen && fenError(entry.fen)) throw new Error('fen');
      startReplay(entry, () => show('home'));
    } catch { replay = null; toast(L('Lien de partage invalide.', 'Invalid share link.')); }
  }

  // Bilan de Maître Sissa à la fin d'une partie
  const PHASE_ADVICE = L({
    ouverture: "Ouverture : développe tes pièces, prends le centre et roque tôt avant de lancer des attaques.",
    milieu: "Milieu de partie : avant chaque coup, cherche les menaces adverses (échecs, prises, pièces non défendues), puis tes propres tactiques.",
    finale: "Finale : active ton roi, pousse tes pions libres et calcule les coups forcés jusqu'au bout.",
  }, {
    ouverture: 'Opening: develop your pieces, take the center and castle early before launching attacks.',
    milieu: "Middlegame: before each move, look for your opponent's threats (checks, captures, undefended pieces), then your own tactics.",
    finale: 'Endgame: activate your king, push your free pawns and calculate forcing moves all the way.',
  });
  const phaseOf = (ply0) => (ply0 < 20 ? 'ouverture' : ply0 < 60 ? 'milieu' : 'finale');
  let bilanId = 0;
  function showBilan(snap) {
    const my = ++bilanId;
    modal({ title: L('Bilan de Maître Sissa', 'Master Sissa’s review'), text: L('Analyse de la partie…', 'Analysing the game…'), actions: [{ label: L('Fermer', 'Close'), ghost: true, onClick: () => { bilanId++; } }] });
    requestReview(snap.cfg.fen || window.Chess.START_FEN, snap.moves, (done, total) => {
      if (my === bilanId && !$('modal').hidden) $('modal-text').textContent = L(`Analyse de la partie… ${done} / ${total} coups`, `Analysing the game… ${done} / ${total} moves`);
    }).then((r) => { if (my === bilanId && !$('modal').hidden) renderBilan(snap, r); })
      .catch(() => { if (my === bilanId) { closeModal(); toast(L("L'analyse n'a pas pu être lancée sur cet appareil.", 'The analysis could not start on this device.')); } });
  }
  function renderBilan(snap, r) {
    const local = snap.cfg.mode === 'local', me = snap.cfg.playerColor;
    const mine = [];
    r.marks.forEach((m, i) => { if (isSevere(m) && (local || (i % 2 ? 'b' : 'w') === me)) mine.push({ i, cls: m[0], loss: m[1], best: m[2] }); });
    const top = mine.slice().sort((a, b) => b.loss - a.loss).slice(0, 3).sort((a, b) => a.i - b.i);
    const sans = []; { const g = new Game(snap.cfg.fen || window.Chess.START_FEN); for (const u of snap.moves) { const x = g.playUci(u); if (!x) break; sans.push(x.san); } }
    const num = (i) => `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'}`;
    const acc = (c) => (r.accuracy[c] == null ? '–' : `${r.accuracy[c]} %`);
    let html = '';
    if (r.opening) html += `<p><b>${L('Ouverture :', 'Opening:')}</b> ${escHtml(r.opening)}</p>`;
    html += local ? `<p><b>${L('Précision :', 'Accuracy:')}</b> ${L('Blancs', 'White')} ${acc('w')} · ${L('Noirs', 'Black')} ${acc('b')}</p>` : `<p><b>${L('Précision :', 'Accuracy:')}</b> ${L('toi', 'you')} ${acc(me)} · ${L('adversaire', 'opponent')} ${acc(me === 'w' ? 'b' : 'w')}</p>`;
    if (top.length) {
      html += `<p><b>${L(`Tes ${top.length > 1 ? `${top.length} principales erreurs` : 'principale erreur'} :`, `Your ${top.length > 1 ? `${top.length} main mistakes` : 'main mistake'}:`)}</b></p><ul>` + top.map((t) => {
        const best = sanOfBest(snap.cfg.fen || window.Chess.START_FEN, snap.moves, t.i, t.best);
        return `<li>${L('Coup', 'Move')} ${num(t.i)} ${escHtml(sans[t.i])}${REVIEW_SIGN[t.cls]} — ${L('meilleur :', 'best:')} ${escHtml(best)} (${L('perte', 'loss')} ≈ ${NUM(t.loss / 100)})</li>`;
      }).join('') + '</ul>';
      const counts = { ouverture: 0, milieu: 0, finale: 0 };
      mine.forEach((m) => { counts[phaseOf(m.i)]++; });
      const worst = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      html += `<p><b>${L('Conseil :', 'Tip:')}</b> ${PHASE_ADVICE[worst]}</p>`;
    } else {
      html += L('<p>Aucune erreur grave repérée : partie très propre, bravo ! Continue à calculer les coups forcés avant chaque décision.</p>', '<p>No serious mistake found: a very clean game, well done! Keep calculating forcing moves before each decision.</p>');
    }
    const body = document.createElement('div');
    body.className = 'bilan';
    body.innerHTML = html;
    const names = sideNames(snap.cfg);
    modal({
      title: L('Bilan de Maître Sissa', 'Master Sissa’s review'), body,
      actions: [
        { label: L("Revoir avec l'analyse", 'Review with analysis'), primary: true, onClick: () => startReplay({ moves: snap.moves, result: snap.result, title: L('Ma dernière partie', 'My last game'), ...names, flipped: !local && me === 'b' }, () => show('home')) },
        { label: L('Exporter en PGN', 'Export as PGN'), onClick: () => exportPgn({ moves: snap.moves, result: snap.result, opening: r.opening, ...names }) },
        { label: L('Fermer', 'Close'), ghost: true },
      ],
    });
  }

  function startReplay(entry, back) {
    if (replay) restoreReplayDemo();
    cancelAi(); stopReplayPlay();
    pz = null; marks = null;
    attachBoard('game');
    const fen = entry.fen || window.Chess.START_FEN;
    const probe = new Game(fen), sans = [];
    for (const u of entry.moves || []) { const r = probe.playUci(u); if (!r) break; sans.push(r.san); }
    replay = { moves: (entry.moves || []).slice(0, sans.length), sans, fen, index: 0, title: entry.title || L('Partie', 'Game'), result: entry.result || '*', back, white: entry.white, black: entry.black, event: entry.event, date: entry.date };
    replay.review = loadReview(reviewKey(fen, replay.moves), fen, replay.moves);
    replay.showReview = !!replay.review;
    cfg = { mode: 'local', playerColor: 'w', level: 1 };
    result = null; selected = -1; hint = null;
    flipped = !!entry.flipped;
    $('terrain-name').textContent = randomScenery();
    $('game-title').textContent = `Replay · ${replay.title}`;
    setReplayUi(true);
    show('game');
    gotoPly(0);
  }
  function restoreReplayDemo() {
    if (!replay || !replay.demoRestore) return;
    if (replay.demoTimer) clearTimeout(replay.demoTimer);
    game = replay.demoRestore.game; result = replay.demoRestore.result;
    replay.demoRestore = null; replay.demoTimer = null; animateNext = false; replayAnimationOverride = null;
  }
  function animateUndoMistake(ply) {
    if (!replay || replay.index !== ply || !replay.showReview) return;
    restoreReplayDemo();
    const saved = { game, result }, wrong = game.lastMove();
    if (!wrong) return;
    const before = new Game(replay.fen);
    for (let i = 0; i < ply - 1; i++) if (!before.playUci(replay.moves[i])) return;
    replay.demoRestore = saved;
    game = saved.game; result = saved.result; animateNext = false;
    renderBoard();
    game = before; result = null;
    const reverse = { ...wrong, from: wrong.to, to: wrong.from, captured: null, flag: null, promo: null };
    replayAnimationOverride = reverse; animateNext = true;
    renderBoard();
    replayAnimationOverride = null;
    animateMinimapMove(reverse);
    const wait = Math.max(1200, speechUntil - performance.now() + 500);
    replay.demoTimer = setTimeout(() => {
      if (replay && replay.demoRestore === saved) { restoreReplayDemo(); renderBoard(); }
    }, wait);
  }
  function animateRecommendedMove(ply, uci) {
    if (!replay || replay.index !== ply || !replay.showReview || !uci) return;
    const staged = !!replay.demoRestore;
    const saved = replay.demoRestore || { game, result };
    if (replay.demoTimer) clearTimeout(replay.demoTimer);
    replay.demoTimer = null;
    if (!staged) {
      const demo = new Game(replay.fen);
      for (let i = 0; i < ply - 1; i++) if (!demo.playUci(replay.moves[i])) return;
      replay.demoRestore = saved;
      game = demo; result = null; animateNext = false;
      renderBoard();
    }
    if (!game.playUci(uci)) {
      restoreReplayDemo(); renderBoard(); return;
    }
    animateNext = true;
    renderBoard();
    animateMinimapMove(game.lastMove());
    const wait = Math.max(950, (b3d ? b3d.busyLeftMs() : 0) + 150);
    replay.demoTimer = setTimeout(() => {
      if (replay && replay.demoRestore === saved) { restoreReplayDemo(); renderBoard(); }
    }, wait);
  }
  function gotoPly(n, animate = false) {
    if (!replay) return;
    restoreReplayDemo();
    n = Math.max(0, Math.min(replay.moves.length, n));
    game = new Game(replay.fen);
    for (let i = 0; i < n; i++) game.playUci(replay.moves[i]);
    animateNext = animate && n === replay.index + 1;
    // Position finale de mat : même attaque de mat qu'en partie quand on y arrive coup par coup
    const st = game.status();
    result = st.over ? { result: st.result, reason: st.reason, ultimateId: `replay-${n}-${Date.now()}` } : null;
    if (animateNext && game.inCheck()) shout(game.status().over ? L('Échec et mat !', 'Checkmate!') : L('Échec !', 'Check!'));
    replay.index = n;
    render();
  }
  function renderReplay() {
    renderBoard(); renderPlayers();
    const ol = $('moves'); ol.innerHTML = '';
    const sans = replay.sans, cur = replay.index;
    const rv = replay.review && replay.showReview ? replay.review : null;
    const BAD = ['inaccuracy', 'mistake', 'blunder'];
    // Si les Noirs commencent (position libre), le premier coup s'écrit « 1… »
    const off = window.Chess.fromFen(replay.fen).turn === 'b' ? 1 : 0;
    for (let i = 0; i < sans.length + off; i += 2) {
      const cell = (k) => {
        const ply = k - off + 1;
        if (ply < 1) return '<span>…</span>';
        if (ply > sans.length) return '';
        const mark = replay.review && replay.review.marks[ply - 1];
        const tagged = mark && [...BAD, 'brilliant', 'excellent'].includes(mark[0]);
        const cls = [ply === cur ? 'cur' : '', tagged ? `q-${mark[0]}` : ''].filter(Boolean).join(' ');
        return `<span data-ply="${ply}"${cls ? ` class="${cls}"` : ''}>${escHtml(sans[ply - 1])}${tagged ? REVIEW_SIGN[mark[0]] : ''}</span>`;
      };
      const li = document.createElement('li');
      li.innerHTML = `<span class="n">${i / 2 + 1}.</span>${cell(i)} ${cell(i + 1)}`;
      ol.appendChild(li);
    }
    const wanted = replay.filter === 'faults' ? new Set(BAD)
      : replay.filter === 'excellent' ? new Set(['excellent'])
        : replay.filter === 'brilliant' ? new Set(['brilliant']) : null;
    if (wanted && replay.review) [...ol.children].forEach((li) => {
      const hasWantedMove = [...li.querySelectorAll('[data-ply]')].some((span) => {
        const mark = replay.review.marks[Number(span.dataset.ply) - 1];
        return mark && wanted.has(mark[0]);
      });
      li.hidden = !hasWantedMove;
    });
    renderReview(rv, cur);
    const current = ol.querySelector('.cur');
    if (current) current.scrollIntoView({ block: 'nearest' });
    const side = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
    const atEnd = cur === sans.length;
    const status = $('status');
    status.classList.remove('alert');
    status.textContent = sans.length ? L(`Coup ${cur} / ${sans.length} · Trait aux ${side}${game.inCheck() ? ' · Échec' : ''}`, `Move ${cur} / ${sans.length} · ${side} to move${game.inCheck() ? ' · Check' : ''}`) : L(`Position · Trait aux ${side}`, `Position · ${side} to move`);
    $('replay-info').textContent = atEnd && sans.length ? `${replay.title} — ${RESULT_LABELS[replay.result] || RESULT_LABELS['*']}` : replay.title;
    $('rp-start').disabled = $('rp-prev').disabled = cur === 0;
    $('rp-next').disabled = $('rp-end').disabled = atEnd;
    $('rp-play').disabled = !sans.length;
  }
  function exitReplay() {
    if (videoRec) stopVideo(false);
    const back = replay && replay.back;
    stopReplayPlay();
    restoreReplayDemo();
    replay = null; game = null;
    setReplayUi(false);
    if (back) back(); else show('home');
  }
  $('rp-flip').onclick = () => { flipped = !flipped; render(); };
  const navigate = (n, animate = false) => {
    if (!replay) return;
    const wasDemoing = !!replay.demoRestore;
    restoreReplayDemo();
    if (wasDemoing) renderBoard();
    if (animBusy()) return;
    stopReplayPlay();
    gotoPly(n, animate);
  };
  $('rp-start').onclick = () => navigate(0);
  $('rp-prev').onclick = () => replay && navigate(replay.index - 1);
  $('rp-next').onclick = () => replay && navigate(replay.index + 1, true);
  $('rp-end').onclick = () => replay && navigate(replay.moves.length);
  $('rp-play').onclick = () => {
    if (!replay) return;
    if (replayTimer) { stopReplayPlay(); return; }
    if (replay.index >= replay.moves.length) gotoPly(0);
    $('rp-play').innerHTML = `<span>⏸</span>${L('Pause', 'Pause')}`;
    // Attend la fin de l'animation en cours (duels, techniques) avant le coup suivant
    const tick = () => {
      if (!replay || replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      gotoPly(replay.index + 1, true);
      if (replay.index >= replay.moves.length) { stopReplayPlay(); return; }
      const busy = b3d ? b3d.busyLeftMs() : 0;
      const speech = Math.max(0, speechUntil - performance.now());
      replayTimer = setTimeout(tick, Math.max(2200, busy + 700, speech + 400));
    };
    replayTimer = setTimeout(tick, 600);
  };
  // « Ma partie en vidéo » : la partie est rejouée en 3D depuis le début et filmée, puis le fichier vidéo est proposé
  let videoRec = null;
  function videoType() {
    if (!window.MediaRecorder) return null;
    return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }
  function stopVideo(save) {
    const v = videoRec; if (!v) return;
    videoRec = null;
    clearTimeout(v.timer);
    v.save = save;
    if (v.rec.state !== 'inactive') v.rec.stop();
    $('rp-video').innerHTML = `<span>🎬</span>${L('Vidéo', 'Video')}`;
    document.body.classList.remove('recording-video');
    if (v.view) { settings.boardView = v.view; applyBoardView(true); }
  }
  $('rp-video').onclick = () => {
    if (videoRec) { stopVideo(true); return; }
    const type = videoType(), canvas = b3d && b3d.renderer && b3d.renderer.domElement;
    if (!replay || !replay.moves.length) return;
    if (!type || !canvas || !canvas.captureStream) { toast(L('Ton navigateur ne sait pas enregistrer de vidéo.', 'Your browser cannot record video.')); return; }
    restoreReplayDemo(); stopReplayPlay();
    // la vidéo filme le plateau 3D : on quitte la vue 2D le temps de l'enregistrement
    const view = settings.boardView === '2d' ? settings.boardView : null;
    if (view) { settings.boardView = 'both'; applyBoardView(true); }
    b3d.skipAnimations();
    gotoPly(0);
    const chunks = [], rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 5000000 });
    const v = videoRec = { rec, view, save: true, timer: 0 };
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (!v.save || !chunks.length) return;
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type: type.split(';')[0] }));
      a.download = `ata-wawe-${(replay && replay.title ? replay.title : 'partie').replace(/[^\w\u00C0-\u017F-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'partie'}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      toast(L('Vidéo enregistrée dans tes téléchargements.', 'Video saved to your downloads.'));
    };
    rec.start(1000);
    $('rp-video').innerHTML = `<span>⏹</span>${L('Arrêter', 'Stop')}`;
    document.body.classList.add('recording-video');
    toast(L('Enregistrement de la partie en cours… Appuie sur « Arrêter » pour finir plus tôt.', 'Recording the game… Press “Stop” to finish early.'));
    // même rythme que la lecture : chaque coup attend la fin de son animation
    const step = () => {
      if (videoRec !== v) return;
      if (!replay || replay.index >= replay.moves.length) { v.timer = setTimeout(() => stopVideo(true), Math.max(2500, (b3d ? b3d.busyLeftMs() : 0) + 1500)); return; }
      gotoPly(replay.index + 1, true);
      v.timer = setTimeout(step, Math.max(1800, (b3d ? b3d.busyLeftMs() : 0) + 600));
    };
    v.timer = setTimeout(step, 1500);
  };
  $('moves').addEventListener('click', (e) => {
    if (!replay) return;
    const span = e.target.closest('[data-ply]');
    if (span) navigate(Number(span.dataset.ply));
  });
  document.addEventListener('keydown', (e) => {
    if (!replay || document.body.dataset.screen !== 'game' || !$('modal').hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { navigate(replay.index - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { navigate(replay.index + 1, true); e.preventDefault(); }
  });

  function openReplayList(mode) {
    // Les parties jouées depuis une position construite ont leur propre rubrique, à deux ou contre l'ordinateur
    const source = mode === 'online' ? store.get('onlineArchive', []) : mode === 'free'
      ? [...store.get('archive', []), ...store.get('localArchive', []).map((g) => ({ ...g, mode: 'local' }))].filter((g) => g.fen).sort((a, b) => a.id - b.id)
      : (mode === 'local' ? store.get('localArchive', []) : store.get('archive', []).filter((g) => (g.mode || 'ai') === mode)).filter((g) => !g.fen);
    $('replay-list-title').textContent = `Replay · ${MODE_LABELS[mode]}`;
    const body = $('replay-list-body');
    if (!source.length) {
      body.innerHTML = `<p class="level-help">${L(`Aucune partie terminée dans ce mode pour le moment. Les parties « ${MODE_LABELS[mode]} » apparaîtront ici à la fin de chaque partie.`, `No finished game in this mode yet. “${MODE_LABELS[mode]}” games will appear here at the end of each game.`)}</p>`;
    } else {
      body.innerHTML = '<div class="replay-items">' + source.map((g, i) => [g, i]).reverse().map(([g, i]) => {
        const gm = mode === 'free' ? g.mode || 'ai' : mode;
        if (mode === 'online') return `<button type="button" class="btn replay-item" data-i="${i}"><strong>${escHtml(fmtDateTime(g.id))}</strong><span>${escHtml(g.white)} (${g.whiteElo}) – ${escHtml(g.black)} (${g.blackElo}) · ${TC_LABELS[g.tc] || ''} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}</span></button>`;
        const who = (mode === 'free' ? ` · ${MODE_LABELS[gm]}` : '') + (gm === 'local' ? '' : ` · ${g.champion && champById(g.champion) ? champById(g.champion).name : mode === 'coach' ? L('Maître Sissa', 'Master Sissa') : LEVEL_NAMES[g.level] || ''} · ${L('vous', 'you')}: ${g.color === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black')}`);
        return `<button type="button" class="btn replay-item" data-i="${i}"><strong>${escHtml(fmtDateTime(g.id))}</strong><span>${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}${escHtml(who)} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}</span></button>`;
      }).join('') + '</div>';
    }
    body.onclick = (e) => {
      const b = e.target.closest('.replay-item'); if (!b) return;
      const g = source[Number(b.dataset.i)]; if (!g) return;
      const gm = mode === 'free' ? g.mode || 'ai' : mode;
      if (mode === 'online') return startReplay({ moves: g.moves, result: g.result, title: `${MODE_LABELS.online} · ${fmtDateTime(g.id)}`, flipped: g.color === 'b', date: pgnDate(g.id), white: `${g.white} (${g.whiteElo})`, black: `${g.black} (${g.blackElo})` }, () => openReplayList(mode));
      startReplay({ moves: g.moves, fen: g.fen, result: g.result, title: `${MODE_LABELS[mode]} · ${fmtDateTime(g.id)}`, flipped: gm !== 'local' && g.color === 'b', date: pgnDate(g.id), ...sideNames({ mode: gm, playerColor: g.color, level: g.level, champion: g.champion }) }, () => openReplayList(mode));
    };
    returnTo = 'home';
    show('replay-list');
  }

  const looksLikeFen = (text) => /^\s*[prnbqkPRNBQK1-8]+(?:\/[prnbqkPRNBQK1-8]+){7}\s+[wb]\b/.test(text) && !/\[/.test(text);
  function fenError(fen) {
    const ranks = fen.split(/\s+/)[0].split('/');
    if (ranks.length !== 8) return L('FEN invalide : 8 rangées attendues.', 'Invalid FEN: 8 ranks expected.');
    for (const rank of ranks) {
      const width = [...rank].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 1), 0);
      if (width !== 8) return L('FEN invalide : une rangée ne compte pas 8 cases.', 'Invalid FEN: a rank does not have 8 squares.');
    }
    const board = fen.split(/\s+/)[0];
    if ((board.match(/K/g) || []).length !== 1 || (board.match(/k/g) || []).length !== 1) return L('FEN invalide : un roi blanc et un roi noir sont requis.', 'Invalid FEN: one white king and one black king are required.');
    if (/[pP]/.test(ranks[0] + ranks[7])) return L('FEN invalide : pion sur la première ou la dernière rangée.', 'Invalid FEN: pawn on the first or last rank.');
    return '';
  }
  function addExternal(text) {
    const src = text.replace(/^\uFEFF/, '').trim();
    if (!src) return toast(L('Collez un PGN ou un FEN.', 'Paste a PGN or a FEN.'));
    const entries = [];
    if (looksLikeFen(src)) {
      const fen = src.split(/\r?\n/)[0].trim().replace(/\s+/g, ' ');
      const err = fenError(fen);
      if (err) return toast(err);
      entries.push({ kind: 'fen', title: L('Position FEN', 'FEN position'), fen, moves: [], result: '*' });
    } else {
      const parsed = window.Pgn.parse(src);
      if (!parsed.games.length) return toast(L(`PGN invalide${parsed.error ? ` : ${parsed.error}` : '.'}`, `Invalid PGN${parsed.error ? `: ${parsed.error}` : '.'}`));
      for (const g of parsed.games) {
        entries.push({ kind: 'pgn', title: `${g.tags.White || L('Blancs', 'White')} – ${g.tags.Black || L('Noirs', 'Black')}`, white: g.tags.White, black: g.tags.Black, event: g.tags.Event || '', date: g.tags.Date || '', moves: g.moves, result: g.result !== '*' ? g.result : g.status.over ? g.status.result : '*' });
      }
    }
    const list = store.get('external', []), now = Date.now();
    entries.forEach((entry, i) => list.push({ ...entry, id: now + i }));
    store.set('external', list.slice(-50));
    $('ext-text').value = '';
    renderExternal();
    toast(L(`${entries.length} partie${entries.length > 1 ? 's' : ''} chargée${entries.length > 1 ? 's' : ''}`, `${entries.length} game${entries.length === 1 ? '' : 's'} loaded`));
    if (entries.length === 1) openExternal(now);
  }
  function openExternal(id) {
    const entry = store.get('external', []).find((x) => x.id === id);
    if (!entry) return;
    startReplay(entry, () => { renderExternal(); returnTo = 'home'; show('replay-external'); });
  }
  function renderExternal() {
    const list = store.get('external', []);
    $('ext-history').innerHTML = list.length
      ? '<div class="replay-items">' + list.slice().reverse().map((g) => `<div class="replay-row"><button type="button" class="btn replay-item" data-open="${g.id}"><strong>${escHtml(g.title)}</strong><span>${g.kind === 'fen' ? L('Position FEN', 'FEN position') : `${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')} · ${RESULT_LABELS[g.result] || RESULT_LABELS['*']}${g.event ? ` · ${escHtml(g.event)}` : ''}`} · ${L('chargée le', 'loaded on')} ${escHtml(fmtDateTime(g.id))}</span></button><button type="button" class="btn ghost replay-del" data-del="${g.id}" aria-label="${L('Supprimer', 'Delete')}">✕</button></div>`).join('') + '</div>'
      : L('<p class="level-help">Aucune partie chargée pour le moment. Les parties chargées sont conservées ici.</p>', '<p class="level-help">No game loaded yet. Loaded games are kept here.</p>');
  }
  $('ext-history').onclick = (e) => {
    const open = e.target.closest('[data-open]'), del = e.target.closest('[data-del]');
    if (open) openExternal(Number(open.dataset.open));
    else if (del) {
      store.set('external', store.get('external', []).filter((x) => x.id !== Number(del.dataset.del)));
      renderExternal();
    }
  };
  $('ext-load').onclick = () => addExternal($('ext-text').value);
  $('ext-file-btn').onclick = () => $('ext-file').click();
  $('ext-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { addExternal(await f.text()); } catch { toast(L('Le fichier n’a pas pu être lu.', 'The file could not be read.')); }
  };
  $('btn-replay-menu').onclick = () => {
    const open = $('replay-submenu').hidden;
    $('replay-submenu').hidden = !open;
    $('btn-replay-menu').setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('[data-replay-mode]').forEach((b) => { b.onclick = () => openReplayList(b.dataset.replayMode); });
  $('btn-replay-external').onclick = () => { renderExternal(); returnTo = 'home'; show('replay-external'); };

  // Bouton retour Android / navigateur : revient à l'accueil plutôt que de quitter
  history.replaceState({ s: 'root' }, '');
  history.pushState({ s: 'app' }, '');
  window.addEventListener('popstate', () => {
    if (!$('modal').hidden) closeModal();
    else if (replay && $('game').classList.contains('active')) exitReplay();
    else if ($('puzzle').classList.contains('active')) leavePuzzle();
    else if ($('theme').classList.contains('active')) show('problems');
    else if ((document.body.dataset.screen || 'home') !== 'home') { save(); show($('settings').classList.contains('active') ? returnTo : 'home'); }
    else return;
    history.pushState({ s: 'app' }, '');
  });

  applyTheme();
  $('board-wrap').addEventListener('board3dcontext', (e) => {
    const lost = !!e.detail.lost;
    $('board-wrap').classList.toggle('webgl-lost', lost);
    if (lost) { renderBoard(); toast(L('La 3D a été interrompue. Tu peux continuer sur le plateau 2D.', '3D was interrupted. You can keep playing on the 2D board.')); }
    else toast(L('Affichage 3D rétabli.', '3D display restored.'));
  });
  try {
    b3d = new window.Board3D($('board-wrap'), tapSquare);
    $('board-wrap').classList.add('is3d');
    b3d.setLite(settings.lite);
    b3d.onSlow = () => {
      if (settings.lite) return;
      settings.lite = true; store.set('settings', settings); b3d.setLite(true);
      toast(L('Affichage lent détecté : mode léger activé (modifiable dans Réglages).', 'Slow display detected: light mode enabled (change it in Settings).'));
    };
  } catch (err) {
    b3d = null; // pas de WebGL : plateau 2D
  }
  // Choix de la vue du plateau : 3D avec l'aperçu 2D, 2D seule (plus léger : la 3D s'arrête) ou 3D seule
  function applyBoardView(rerender) {
    const view = b3d ? (['both', '2d', '3d'].includes(settings.boardView) ? settings.boardView : 'both') : '2d';
    const wrap = $('board-wrap');
    wrap.classList.toggle('view-2d', view === '2d');
    wrap.classList.toggle('view-3d', view === '3d');
    $('view-switch').hidden = !b3d;
    for (const b of $('view-switch').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
    if (rerender && game) { if (b3d && view !== '2d') b3d.resize(); renderBoard(); }
  }
  $('view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]'); if (!b) return;
    settings.boardView = b.dataset.view; store.set('settings', settings);
    applyBoardView(true);
  });
  applyBoardView(false);
  applyAnimSpeed();
  applyBlackTheme();
  // Bouton « Passer » pendant une longue animation (prise spéciale, mat) : les pièces se posent tout de suite
  setInterval(() => {
    const show = !!(b3d && game && document.body.dataset.screen === 'game' && settings.boardView !== '2d' && b3d.busyLeftMs() > 700);
    if ($('btn-skip-anim').hidden === show) $('btn-skip-anim').hidden = !show;
  }, 250);
  $('btn-skip-anim').onclick = () => { if (!b3d) return; b3d.skipAnimations(); $('btn-skip-anim').hidden = true; renderBoard(); };

  const savedGame = store.get('game', null);
  const savedScreen = store.get('lastScreen', null);
  // À l'ouverture de l'appli, l'accueil présente le jardin et « Continuer mon aventure » ouvre les reprises.
  // Quand on rafraîchit la page, on revient sur l'écran où l'on était (même partie, même tournoi…).
  const reloaded = (() => { try { const nav = performance.getEntriesByType('navigation')[0]; return nav ? nav.type === 'reload' : performance.navigation && performance.navigation.type === 1; } catch { return false; } })();
  // Écrans rouverts en rejouant le bouton qui les ouvre (il prépare lui-même leur contenu)
  const REOPEN = {
    program: 'btn-program', champions: 'btn-champions', setup: 'btn-new', problems: 'btn-problems', stats: 'btn-stats', rules: 'btn-rules', about: 'btn-about',
    settings: 'btn-settings', shop: 'btn-shop', profile: 'btn-profile', online: 'btn-online', tournaments: 'btn-tournaments', club: 'btn-club',
    account: 'btn-account', 'replay-external': 'btn-replay-external',
  };
  let restored = false;
  if (reloaded && savedScreen && savedScreen !== 'home') {
    try {
      if (savedScreen === 'game' && savedGame && savedGame.cfg) { startGame(savedGame.cfg, savedGame.moves, savedGame.result, savedGame.flipped, savedGame.terrain, savedGame.weather); restored = true; }
      else if (savedScreen === 'otb') { restoreOtb(); restored = true; }
      else if (savedScreen === 'train') { const sec = store.get('lastTrainSection', 'daily'); const b = document.querySelector(`[data-train-section="${sec}"]`); if (b) { b.click(); restored = true; } }
      else if (REOPEN[savedScreen] && $(REOPEN[savedScreen])) { $(REOPEN[savedScreen]).click(); restored = document.body.dataset.screen === savedScreen; }
    } catch { restored = false; }
  }
  if (!restored) show('home');
  if (!playerProfile().nameAsked) setTimeout(promptPlayerName, 250);
  openSharedLink();
  setTimeout(analyseNext, 3000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
