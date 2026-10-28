  /* ---------- Joueurs : liste, adversaire proposé, chat coupé ---------- */
  let onlineSection = null, onlinePlayers = null, playersQuery = '', playersLoading = false;
  const isConnected = (p) => Date.now() - (p.lastSeen || 0) < 3 * 60000;
  const mutedList = () => (ON && ON.profile && ON.profile.muted) || [];
  function lastSeenLabel(p) {
    if (isConnected(p)) return L('connecté', 'online');
    if (!p.lastSeen) return '';
    const m = Math.round((Date.now() - p.lastSeen) / 60000);
    if (m < 60) return L(`vu il y a ${m} min`, `seen ${m} min ago`);
    if (m < 1440) return L(`vu il y a ${Math.round(m / 60)} h`, `seen ${Math.round(m / 60)} h ago`);
    return L(`vu il y a ${Math.round(m / 1440)} j`, `seen ${Math.round(m / 1440)} d ago`);
  }
  async function loadPlayers() {
    if (playersLoading) return;
    playersLoading = true;
    try { onlinePlayers = await ON.listPlayers(); } catch { onlinePlayers = onlinePlayers || []; }
    playersLoading = false;
    if (document.body.dataset.screen === 'online') renderOnline();
  }
  function playerRow(p, suggested) {
    const muted = mutedList().includes(p.uid), q = playersQuery.toLowerCase();
    const hide = !suggested && q && !String(p.pseudo || '').toLowerCase().includes(q);
    return `<div class="replay-row player-row" data-name="${escHtml(String(p.pseudo || '').toLowerCase())}"${hide ? ' hidden' : ''}>
      <button type="button" class="btn replay-item" data-profile="${p.uid}"><strong><i class="on-dot${isConnected(p) ? ' on' : ''}"></i>${escHtml(p.pseudo || '?')} (${p.elo})${p.summary && p.summary.title ? ` <em class="player-title">« ${escHtml(p.summary.title)} »</em>` : ''}</strong><span>${gradeLabel(p.gradePts)} · ${p.summary && p.summary.level ? `${L('Niveau', 'Level')} ${p.summary.level} · ` : ''}${lastSeenLabel(p)}${muted ? L(' · chat coupé', ' · chat muted') : ''}</span></button>
      <button class="btn primary" data-invite-uid="${p.uid}">${L('Inviter', 'Invite')}</button>
      <button class="btn ghost" data-mute="${p.uid}" title="${muted ? L('Réactiver le chat avec ce joueur', 'Unmute chat with this player') : L('Couper le chat avec ce joueur', 'Mute chat with this player')}" aria-label="${muted ? L('Réactiver le chat', 'Unmute chat') : L('Couper le chat', 'Mute chat')}">${muted ? '🔇' : '💬'}</button>
    </div>`;
  }
  // Adversaire proposé : joueurs connectés de niveau le plus proche (sinon les plus récemment vus)
  let suggestedOpp = null;
  function suggestOpponent() {
    const me = ON.user.uid, myElo = estimatedElo();
    const pool = (onlinePlayers || []).filter((p) => p.uid !== me && !mutedList().includes(p.uid));
    const live = pool.filter(isConnected), recent = pool.filter((p) => Date.now() - p.lastSeen < 7 * 86400000);
    const src = live.length ? live : recent;
    if (!src.length) return null;
    // un peu de hasard parmi les trois plus proches pour ne pas proposer toujours le même
    const close = src.slice().sort((a, b) => Math.abs(a.elo - myElo) - Math.abs(b.elo - myElo)).slice(0, 3);
    return close[Math.floor(Math.random() * close.length)];
  }
  function playersHtml(part) {
    let html = part === 'list' ? '' : `
      <button id="on-suggest" class="btn primary wide" type="button">🎲 ${L('Proposer un adversaire de mon niveau', 'Suggest an opponent at my level')}</button>`;
    if (suggestedOpp) html += `<p class="level-help">${L(`Je te propose <b>${escHtml(suggestedOpp.pseudo)}</b> (Elo ${suggestedOpp.elo}, ${lastSeenLabel(suggestedOpp)}) : son niveau est proche du tien (${estimatedElo()}).`, `I suggest <b>${escHtml(suggestedOpp.pseudo)}</b> (Elo ${suggestedOpp.elo}, ${lastSeenLabel(suggestedOpp)}): their level is close to yours (${estimatedElo()}).`)}</p><div class="replay-items">${playerRow(suggestedOpp, true)}</div>`;
    if (part === 'find') return html;
    if (!onlinePlayers) return `${html}<p class="level-help">${L('Chargement des joueurs…', 'Loading players…')}</p>`;
    const others = onlinePlayers.filter((p) => p.uid !== ON.user.uid);
    const live = others.filter(isConnected).length;
    html += `<div class="players-tools"><input id="on-search" class="profile-name-input" type="search" placeholder="${L('Chercher un joueur', 'Search a player')}" value="${escHtml(playersQuery)}"><button id="on-refresh" class="btn ghost" type="button" aria-label="${L('Actualiser', 'Refresh')}">↻</button></div>
      <p class="level-help">${L(`${others.length} joueur${others.length > 1 ? 's' : ''}, dont ${live} connecté${live > 1 ? 's' : ''}. Choisis la cadence plus haut, puis « Inviter ».`, `${others.length} player${others.length === 1 ? '' : 's'}, ${live} online. Choose the time control above, then “Invite”.`)}</p>`;
    html += others.length ? `<div class="replay-items players-list">${others.map((p) => playerRow(p)).join('')}</div>` : `<p class="level-help">${L('Aucun autre joueur pour le moment.', 'No other player yet.')}</p>`;
    return html;
  }
  async function invitePlayer(uid, msg) {
    const p = (onlinePlayers || []).find((x) => x.uid === uid);
    if (!p) return;
    const tc = $('on-tc').value; store.set('onlineTc', tc);
    msg(L('Envoi…', 'Sending…'), true);
    try { await ON.invite(p.pseudo, tc, { uid: p.uid, pseudo: p.pseudo, elo: p.elo }); msg(L(`Invitation envoyée à ${p.pseudo}. La partie s'ouvrira dès qu'il ou elle l'acceptera.`, `Invitation sent to ${p.pseudo}. The game will open as soon as they accept.`), true); } catch (err) { msg(ON.explain(err)); }
  }
  async function toggleMute(uid) {
    const list = mutedList().slice(), i = list.indexOf(uid);
    if (i >= 0) list.splice(i, 1); else list.push(uid);
    try { await ON.setMuted(list); } catch (err) { toast(ON.explain(err)); return; }
    if (document.body.dataset.screen === 'online') renderOnline();
    if (cfg && cfg.mode === 'online') renderChat();
  }
  $('online-body').addEventListener('input', (e) => {
    if (e.target.id !== 'on-search') return;
    playersQuery = e.target.value;
    const q = playersQuery.trim().toLowerCase();
    document.querySelectorAll('.players-list .player-row').forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
  });

  /* ---------- Chat pendant une partie en ligne ---------- */
  let oppMutedMe = false, chatSeen = 0;
  function renderChat() {
    const box = $('chat'), g = onlineGame;
    if (!g || !cfg || cfg.mode !== 'online') { box.hidden = true; return; }
    box.hidden = false;
    const me = ON.user.uid, opp = g.white === me ? g.black : g.white, oppName = g.white === me ? g.blackName : g.whiteName;
    const muted = mutedList().includes(opp);
    const msgs = (g.chat || []).filter((m) => !(muted && m.from === opp));
    $('chat-log').innerHTML = msgs.length ? msgs.map((m) => `<div class="chat-msg${m.from === me ? ' me' : ''}"><b>${escHtml(m.name)}</b> ${escHtml(m.text)}</div>`).join('') : `<p class="level-help">${muted ? L('Les messages de ce joueur sont masqués.', 'This player’s messages are hidden.') : L('Écris un message à ton adversaire.', 'Write a message to your opponent.')}</p>`;
    $('chat-log').scrollTop = $('chat-log').scrollHeight;
    const off = muted || oppMutedMe || (g.chat || []).length >= 300;
    $('chat-input').disabled = off; $('chat-send').disabled = off;
    $('chat-input').placeholder = muted ? L(`Chat coupé avec ${oppName}`, `Chat muted with ${oppName}`) : oppMutedMe ? L(`${oppName} a coupé le chat`, `${oppName} muted the chat`) : L('Message…', 'Message…');
    $('chat-mute').textContent = muted ? L('🔇 Réactiver le chat', '🔇 Unmute chat') : L('💬 Couper le chat', '💬 Mute chat');
    $('chat-mute').dataset.uid = opp;
  }
  function onChatUpdate(g) {
    const chat = g.chat || [], me = ON.user.uid;
    const opp = g.white === me ? g.black : g.white;
    if (chat.length > chatSeen && chatSeen) { const last = chat[chat.length - 1]; if (last.from !== me && !mutedList().includes(last.from)) { sounds.move(); const r = $('chat').getBoundingClientRect(); if (r.top > innerHeight - 40 || r.bottom < 0) toast(`${last.name} : ${last.text}`); } }
    chatSeen = chat.length;
    if (opp) renderChat();
  }
  $('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = $('chat-input').value.trim();
    if (!t || !onlineGame) return;
    // l'adversaire a peut-être coupé le chat depuis le début de la partie
    const me = ON.user.uid, opp = onlineGame.white === me ? onlineGame.black : onlineGame.white;
    try { const u = await ON.getProfile(opp); oppMutedMe = !!(u && (u.muted || []).includes(me)); } catch { /* hors ligne */ }
    if (oppMutedMe) { renderChat(); return; }
    $('chat-input').value = '';
    try { await ON.sendChat(onlineGame.id, t); } catch (err) { toast(ON.explain(err)); }
  });
  $('chat-mute').onclick = () => { if ($('chat-mute').dataset.uid) toggleMute($('chat-mute').dataset.uid); };
  $('btn-online').onclick = () => {
    returnTo = 'home';
    onlinePlayers = null; suggestedOpp = null; onlineSection = null;
    // sans pseudo, on le demande avant de jouer
    renderOnline(); show('online');
    if (ON) ON.load().then(() => { if (!ON.user) renderOnline(); }).catch(() => {});
  };

  // Partie en ligne : le plateau suit la partie stockée sur le serveur
  let onlineStop = null, onlineTimer = null, onlineGame = null, onlinePhotos = {};
  /* ---------- Entre deux humains : valider son coup (différé), reprendre un coup, proposer la nulle ---------- */
  let pendingMove = null;
  const isDeferred = () => cfg && cfg.mode === 'online' && onlineGame && !(ON.TIME_CONTROLS[onlineGame.tc] || {}).ms;
  const humanVsHuman = () => cfg && (cfg.mode === 'local' || cfg.mode === 'online');
  function renderConfirm() {
    const deferred = isDeferred();
    $('auto-confirm').hidden = !deferred || !!result;
    $('opt-autoconfirm').checked = settings.autoConfirm !== false;
    $('confirm-bar').hidden = !pendingMove;
    if (pendingMove) $('confirm-text').textContent = L(`Ton coup : ${pendingMove.san}`, `Your move: ${pendingMove.san}`);
  }
  $('opt-autoconfirm').addEventListener('change', (e) => { settings.autoConfirm = e.target.checked; store.set('settings', settings); renderConfirm(); });
  function sendOnlineMove(uci, ply, over) {
    ON.playMove(cfg.online.id, uci, ply, over).catch(() => toast(L('Coup non envoyé : vérifie ta connexion.', 'Move not sent: check your connection.')));
  }
  $('btn-confirm-move').onclick = () => {
    if (!pendingMove) return;
    const p = pendingMove; pendingMove = null;
    sendOnlineMove(p.uci, p.ply, null);
    renderConfirm(); render();
  };
  $('btn-cancel-move').onclick = () => {
    if (!pendingMove) return;
    pendingMove = null;
    game.undo(); selected = -1;
    renderConfirm(); render(); save();
  };
  // Annuler son dernier coup : l'adversaire doit l'accepter (refus : le coup reste)
  function requestTakeback() {
    if (result) return;
    if (cfg.mode === 'local') {
      const by = game.turn === 'w' ? L('Noirs', 'Black') : L('Blancs', 'White'), other = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black');
      modal({ title: L('Annuler le dernier coup ?', 'Take back the last move?'), text: L(`Les ${by} demandent à reprendre leur dernier coup. Les ${other} acceptent-ils ?`, `${by} ask to take back their last move. Do ${other} accept?`), actions: [
        { label: L(`Les ${other} acceptent`, `${other} accept`), primary: true, onClick: () => { game.undo(); selected = -1; hint = null; render(); save(); } },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => toast(L('Demande refusée : le coup reste joué.', 'Request refused: the move stands.')) },
      ] });
      return;
    }
    if (cfg.mode !== 'online' || !onlineGame || !isDeferred()) return;
    if (onlineGame.takeback) { toast(L('Une demande est déjà en attente.', 'A request is already pending.')); return; }
    ON.requestTakeback(onlineGame.id).then(() => toast(L('Demande envoyée : ton adversaire doit l’accepter.', 'Request sent: your opponent must accept it.'))).catch((e) => toast(ON.explain(e)));
  }
  // Proposer la nulle
  $('btn-draw').onclick = () => {
    if (result || !humanVsHuman()) return;
    if (cfg.mode === 'local') {
      const by = game.turn === 'w' ? L('Blancs', 'White') : L('Noirs', 'Black'), other = game.turn === 'w' ? L('Noirs', 'Black') : L('Blancs', 'White');
      modal({ title: L('Proposer la nulle ?', 'Offer a draw?'), text: L(`Les ${by} proposent la nulle. Les ${other} acceptent-ils ?`, `${by} offer a draw. Do ${other} accept?`), actions: [
        { label: L(`Les ${other} acceptent`, `${other} accept`), primary: true, onClick: () => { result = { result: '1/2-1/2', reason: 'accord' }; finish(); } },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => toast(L('Nulle refusée : la partie continue.', 'Draw refused: the game goes on.')) },
      ] });
      return;
    }
    if (!onlineGame) return;
    if (onlineGame.drawOffer) { toast(L('Une proposition est déjà en attente.', 'An offer is already pending.')); return; }
    modal({ title: L('Proposer la nulle ?', 'Offer a draw?'), text: L('Ton adversaire pourra accepter ou refuser.', 'Your opponent can accept or refuse.'), actions: [
      { label: L('Proposer', 'Offer'), primary: true, onClick: () => ON.offerDraw(onlineGame.id).then(() => toast(L('Nulle proposée.', 'Draw offered.'))).catch((e) => toast(ON.explain(e))) },
      { label: L('Annuler', 'Cancel'), ghost: true },
    ] });
  };
  // Demandes reçues de l'adversaire en ligne, et réponses à mes demandes
  const answered = new Set();
  function onlineRequests(g) {
    const me = ON.user.uid, opp = g.white === me ? g.blackName : g.whiteName;
    if (g.status !== 'active') return;
    if (g.takeback && g.takeback.by !== me && !answered.has(`t${g.takeback.at}`)) {
      answered.add(`t${g.takeback.at}`);
      modal({ title: L('Annuler un coup ?', 'Take back a move?'), text: L(`${opp} demande à reprendre son dernier coup.`, `${opp} asks to take back their last move.`), actions: [
        { label: L('Accepter', 'Accept'), primary: true, onClick: () => ON.answerTakeback(g.id, true).catch((e) => toast(ON.explain(e))) },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => ON.answerTakeback(g.id, false).catch((e) => toast(ON.explain(e))) },
      ] });
    }
    if (g.drawOffer && g.drawOffer.by !== me && !answered.has(`d${g.drawOffer.at}`)) {
      answered.add(`d${g.drawOffer.at}`);
      modal({ title: L('Nulle proposée', 'Draw offered'), text: L(`${opp} te propose la nulle.`, `${opp} offers you a draw.`), actions: [
        { label: L('Accepter la nulle', 'Accept the draw'), primary: true, onClick: () => ON.answerDraw(g.id, true).catch((e) => toast(ON.explain(e))) },
        { label: L('Refuser', 'Refuse'), ghost: true, onClick: () => ON.answerDraw(g.id, false).catch((e) => toast(ON.explain(e))) },
      ] });
    }
    for (const [k, a] of [['ta', g.takebackAnswer], ['da', g.drawAnswer]]) {
      if (!a || a.by === me || answered.has(`${k}${a.at}`)) continue;
      answered.add(`${k}${a.at}`);
      if (Date.now() - a.at > 60000) continue; // réponse ancienne : déjà vue
      if (k === 'ta') toast(a.ok ? L(`${opp} a accepté : ton coup est annulé.`, `${opp} accepted: your move is taken back.`) : L(`${opp} a refusé : le coup reste joué.`, `${opp} refused: the move stands.`));
      else if (!a.ok) toast(L(`${opp} a refusé la nulle.`, `${opp} refused the draw.`));
    }
  }
  function stopOnline() { if (onlineStop) onlineStop(); onlineStop = null; clearInterval(onlineTimer); onlineTimer = null; onlineGame = null; $('chat').hidden = true; $('online-switch').hidden = true; }
  function openOnlineGame(g) {
    stopOnline();
    const me = ON.user.uid, color = g.white === me ? 'w' : 'b';
    onlineGame = g; onlinePhotos = {};
    ON.getPhotos([g.white, g.black]).then((ph) => { onlinePhotos = ph; if (cfg && cfg.mode === 'online') renderPlayers(); });
    startGame({ mode: 'online', playerColor: color, level: 1, online: { id: g.id, tc: g.tc, tournament: g.tournamentName || null, round: g.round || null } }, g.moves, null, color === 'b');
    onlineStop = ON.watchGame(g.id, onOnlineUpdate);
    onlineTimer = setInterval(onlineTick, 1000);
    chatSeen = (g.chat || []).length; oppMutedMe = false; renderChat(); renderOnlineSwitch();
    const opp = color === 'w' ? g.black : g.white;
    ON.getProfile(opp).then((u) => { oppMutedMe = !!(u && (u.muted || []).includes(me)); renderChat(); }).catch(() => {});
    ON.heartbeat(g.id);
  }
  function onOnlineUpdate(g) {
    if (!cfg || cfg.mode !== 'online' || cfg.online.id !== g.id) return;
    // coup repris d'un commun accord : la partie est rechargée à la nouvelle position
    if (g.moves.length < game.history.length - (pendingMove ? 1 : 0)) { pendingMove = null; openOnlineGame(g); return; }
    onlineGame = g;
    onChatUpdate(g);
    onlineRequests(g);
    // coups de l'adversaire pas encore joués sur ce plateau
    let played = null;
    while (game.history.length < g.moves.length) {
      const r = game.playUci(g.moves[game.history.length]);
      if (!r) break;
      played = r;
    }
    if (played) {
      animateNext = true;
      const st = game.status();
      if (st.over && !result) { result = { result: st.result, reason: st.reason, ultimateId: `${game.history.length}-${Date.now()}` }; if (st.reason === 'mat') shout(L('Échec et mat !', 'Checkmate!')); finish(); }
      else if (game.inCheck()) { sounds.check(); shout(L('Échec !', 'Check!')); } else if (played.move.captured) sounds.capture(); else sounds.move();
    }
    if (g.status === 'over' && !result) { result = { result: g.result, reason: g.reason || 'abandon' }; finish(); }
    render();
  }
  // Pendule, délai par coup et coupure de connexion (nulle après 30 s sans nouvelles sur une partie chronométrée)
  function onlineTimeLeft(g, side) {
    const tc = ON.TIME_CONTROLS[g.tc] || {};
    const running = g.status === 'active' && (g.moves.length % 2 === 0 ? 'w' : 'b') === side;
    if (tc.ms) return g.clock[side] - (running && g.moves.length ? Date.now() - g.lastMoveAt : 0);
    if (tc.perMove) return running ? tc.perMove - (Date.now() - g.lastMoveAt) : tc.perMove;
    return null;
  }
  const fmtClock = (ms) => {
    if (ms == null) return '';
    ms = Math.max(0, ms);
    if (ms >= 86400000) return `${Math.floor(ms / 86400000)} ${L('j', 'd')} ${Math.floor(ms % 86400000 / 3600000)} h`;
    if (ms >= 3600000) return `${Math.floor(ms / 3600000)} h ${String(Math.floor(ms % 3600000 / 60000)).padStart(2, '0')}`;
    return `${Math.floor(ms / 60000)}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}`;
  };
  function onlineTick() {
    const g = onlineGame;
    if (!g || !cfg || cfg.mode !== 'online') return stopOnline();
    if (g.status !== 'active' || result) { renderPlayers(); return; }
    const tc = ON.TIME_CONTROLS[g.tc] || {}, side = g.moves.length % 2 === 0 ? 'w' : 'b';
    const left = onlineTimeLeft(g, side);
    if (left != null && left <= 0) {
      ON.endGame(g.id, side === 'w' ? '0-1' : '1-0', 'temps');
    } else if (tc.ms) {
      const opp = cfg.playerColor === 'w' ? g.black : g.white;
      const seen = g.seen && g.seen[opp];
      if (seen && Date.now() - seen > 30000) ON.endGame(g.id, '1/2-1/2', 'deconnexion');
    }
    if (Date.now() % 10000 < 1000) ON.heartbeat(g.id);
    renderPlayers();
  }

