  /* ---------- Tournois proposés : pastilles et notification ---------- */
  // Un tournoi ouvert auquel je ne suis pas inscrit et que je n'ai pas encore vu : pastille sur « Jouer »,
  // sur « Tournois » et sur « Tournois ouverts », et une notification qui m'invite à m'inscrire.
  let newTours = [];
  function startTourWatch() {
    if (!ON || !ON.user || tourListStop) return;
    tourListStop = ON.watchTournaments((all) => {
      tourList = all;
      for (const t of all.mine) if (t.status === 'open' && t.deadline && Date.now() > t.deadline && !autoStarted.has(t.id)) { autoStarted.add(t.id); ON.startTournament(t.id, true).catch(() => {}); }
      // tournoi auquel je participe qui démarre : notification
      for (const t of all.mine) {
        const key = `tour-start:${t.id}`;
        if (t.status === 'running' && notifyWatchReady.tours && !notifySeen.has(key)) notifyUser(L('Le tournoi commence', 'The tournament is starting'), L(`« ${t.name} » a commencé : ta première partie t’attend.`, `“${t.name}” has started: your first game is waiting.`), key);
        if (t.status === 'running') notifySeen.add(key);
      }
      notifyWatchReady.tours = true;
      updateTourBadge();
      if (document.body.dataset.screen === 'tournaments' && !tourDoc) renderTournaments();
    });
  }
  /* ---------- Notifications : à toi de jouer, invitation, tournoi qui commence ---------- */
  // Affichées en silence quand l'appli est en arrière-plan (onglet caché ou appli installée réduite), si le joueur les a activées.
  const notifySeen = new Set(), notifyWatchReady = { games: false, tours: false };
  function notifyUser(title, body, tag) {
    if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
    const opts = { body, tag, icon: 'logo/logo-192.png', badge: 'logo/logo-192.png', silent: true }; // sans son ni vibration
    const fallback = () => { try { new Notification(title, opts); } catch { /* non disponible */ } };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(fallback);
    else fallback();
  }
  function stopTourWatch() { if (tourListStop) { tourListStop(); tourListStop = null; } tourList = { open: [], mine: [] }; newTours = []; updateTourBadge(); }
  function updateTourBadge() {
    const me = ON && ON.user && ON.user.uid, now = Date.now(), seen = store.get('toursSeen', []);
    newTours = me ? (tourList.open || []).filter((t) => t.owner !== me && !(t.members || []).includes(me) && (!t.deadline || t.deadline > now) && !seen.includes(t.id)) : [];
    const n = newTours.length;
    $('tour-badge').hidden = !n; $('tour-badge').textContent = n;
    updatePlayBadge();
    // une seule notification par tournoi
    const told = store.get('toursNotified', []), fresh = newTours.filter((t) => !told.includes(t.id));
    if (!fresh.length) return;
    store.set('toursNotified', [...told, ...fresh.map((t) => t.id)].slice(-200));
    notifyTours(fresh);
  }
  function markToursSeen() {
    const seen = store.get('toursSeen', []), ids = (tourList.open || []).map((t) => t.id).filter((id) => !seen.includes(id));
    if (ids.length) { store.set('toursSeen', [...seen, ...ids].slice(-300)); updateTourBadge(); }
  }
  function notifyTours(list) {
    const t = list[0];
    const title = list.length > 1 ? L(`${list.length} nouveaux tournois`, `${list.length} new tournaments`) : L('Nouveau tournoi', 'New tournament');
    const text = list.length > 1
      ? L(`Des tournois sont ouverts aux inscriptions, dont « ${t.name} ». Viens t’inscrire !`, `Tournaments are open for registration, including “${t.name}”. Come and sign up!`)
      : L(`« ${t.name} » est ouvert aux inscriptions${t.deadline ? ` jusqu’au ${fmtDeadline(t.deadline)}` : ''}. Viens t’inscrire !`, `“${t.name}” is open for registration${t.deadline ? ` until ${fmtDeadline(t.deadline)}` : ''}. Come and sign up!`);
    // notification du système si le joueur l'a déjà autorisée (appli en arrière-plan)
    try { if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') new Notification(title, { body: text, icon: 'logo/logo-192.png', tag: `tour-${t.id}` }); } catch { /* non disponible */ }
    // pendant une partie, simple message pour ne pas interrompre le jeu
    if (document.body.dataset.screen === 'game' || !$('modal').hidden) { toast(`🏆 ${title} : ${t.name}`); return; }
    modal({ title: `🏆 ${title}`, text, actions: [
      { label: L('Voir les tournois ouverts', 'See open tournaments'), primary: true, onClick: () => { $('btn-tournaments').click(); tourSection = 'open'; markToursSeen(); renderTournaments(); } },
      { label: L('Plus tard', 'Later'), ghost: true },
    ] });
  }
  function updatePlayBadge() {
    const n = (Number($('online-badge').textContent) || 0) * !$('online-badge').hidden + newTours.length;
    $('play-badge').hidden = !n; $('play-badge').textContent = n;
  }
  function updateOnlineBadge() {
    const me = ON.user && ON.user.uid;
    const turnGames = onlineGames.filter((g) => g.status === 'active' && ((g.moves.length % 2 === 0) === (g.white === me)));
    const myTurn = turnGames.length;
    // notifications : un nouveau coup de l'adversaire, une nouvelle invitation (pas au démarrage pour ce qui attendait déjà)
    for (const g of turnGames) {
      const key = `turn:${g.id}:${g.moves.length}`;
      if (notifyWatchReady.games && !notifySeen.has(key) && g.moves.length) notifyUser(L('À toi de jouer', 'Your move'), L(`${g.white === me ? g.blackName : g.whiteName} a joué. C’est ton tour.`, `${g.white === me ? g.blackName : g.whiteName} has moved. It’s your turn.`), `turn-${g.id}`);
      notifySeen.add(key);
    }
    for (const inv of onlineInvites.in) {
      const key = `inv:${inv.id}`;
      if (notifyWatchReady.games && !notifySeen.has(key)) notifyUser(L('Nouvelle invitation', 'New invitation'), L(`${inv.fromName || 'Un joueur'} t’invite à jouer une partie.`, `${inv.fromName || 'A player'} invites you to play a game.`), key);
      notifySeen.add(key);
    }
    notifyWatchReady.games = true;
    const n = onlineInvites.in.length + myTurn;
    $('online-badge').hidden = !n; $('online-badge').textContent = n;
    updatePlayBadge();
  }
  if (ON) {
    ON.onUser(onUserChange);
    if (store.get('onlineSession', false)) ON.load().catch(() => {});
  }
  const field = (id, label, type = 'text', value = '', extra = '') => `<label class="field-label" for="${id}">${label}</label><input id="${id}" class="profile-name-input" type="${type}" value="${escHtml(value)}" ${extra}>`;
  let accountMode = 'signin';
  function renderAccount() {
    const body = $('account-body'), u = ON && ON.user, p = ON && ON.profile;
    if (u) {
      body.innerHTML = `<p class="level-help">${L('Connecté avec', 'Signed in as')} <b>${escHtml(u.email)}</b>${p ? ` · ${L('pseudo', 'nickname')} <b>${escHtml(p.pseudo)}</b>` : ''}</p>
        ${field('acc-pseudo', L('Changer de pseudo', 'Change nickname'), 'text', p ? p.pseudo : '', 'maxlength="24" autocomplete="nickname"')}
        <button id="acc-save-pseudo" class="btn primary wide" type="button">${L('Enregistrer le pseudo', 'Save nickname')}</button>
        <div class="photo-row">${playerProfile().photo ? `<img class="profile-photo big" alt="" src="${playerProfile().photo}">` : ''}<button id="acc-photo" class="btn" type="button">${playerProfile().photo ? L('Changer ma photo', 'Change my photo') : L('Ajouter ma photo', 'Add my photo')}</button></div>
        ${field('acc-pw-old', L('Mot de passe actuel', 'Current password'), 'password', '', 'autocomplete="current-password"')}
        ${field('acc-pw-new', L('Nouveau mot de passe (6 caractères au moins)', 'New password (at least 6 characters)'), 'password', '', 'autocomplete="new-password"')}
        <button id="acc-save-pw" class="btn wide" type="button">${L('Changer le mot de passe', 'Change password')}</button>
        <button id="acc-logout" class="btn ghost wide" type="button">${L('Se déconnecter', 'Sign out')}</button>
        <p id="acc-msg" class="ed-error" role="status"></p>
        <details class="danger-zone"><summary>${L('Supprimer mon compte', 'Delete my account')}</summary>
          <p class="level-help">${L('Ton profil, ton pseudo, ta progression en ligne et tes invitations seront effacés définitivement. Les parties déjà jouées restent dans l’historique de tes adversaires. Cet appareil repart ensuite de zéro.', 'Your profile, nickname, online progress and invitations will be erased for good. Games already played stay in your opponents’ history. This device then starts from scratch.')}</p>
          ${field('acc-del-pw', L('Mot de passe, pour confirmer', 'Password, to confirm'), 'password', '', 'autocomplete="current-password"')}
          <button id="acc-delete" class="btn danger wide" type="button">${L('Supprimer définitivement mon compte', 'Delete my account permanently')}</button>
        </details>`;
    } else {
      const up = accountMode === 'signup';
      body.innerHTML = `<div class="ed-seg" id="acc-tabs"><button type="button" data-mode="signin" class="${up ? '' : 'on'}">${L('Se connecter', 'Sign in')}</button><button type="button" data-mode="signup" class="${up ? 'on' : ''}">${L('Créer un compte', 'Create an account')}</button></div>
        <p class="level-help">${up ? L('Ton compte garde ta progression sur tous tes appareils et te permet de jouer en ligne avec tes amis.', 'Your account keeps your progress on all your devices and lets you play online with your friends.') : L('Connecte-toi avec ton adresse e-mail et ton mot de passe.', 'Sign in with your e-mail address and password.')}</p>
        ${up ? field('acc-pseudo', L('Pseudo (visible par les autres joueurs)', 'Nickname (visible to other players)'), 'text', playerProfile().name || '', 'maxlength="24" autocomplete="nickname"') : ''}
        ${field('acc-email', L('Adresse e-mail', 'E-mail address'), 'email', '', 'autocomplete="email"')}
        ${field('acc-pw', L('Mot de passe', 'Password') + (up ? L(' (6 caractères au moins)', ' (at least 6 characters)') : ''), 'password', '', `autocomplete="${up ? 'new-password' : 'current-password'}"`)}
        <button id="acc-go" class="btn primary wide" type="button">${up ? L('Créer mon compte', 'Create my account') : L('Se connecter', 'Sign in')}</button>
        ${up ? '' : `<button id="acc-forgot" class="btn ghost wide" type="button">${L('Mot de passe oublié ?', 'Forgot your password?')}</button>`}
        <p id="acc-msg" class="ed-error" role="status"></p>`;
    }
  }
  const accMsg = (t, ok) => { const m = $('acc-msg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
  async function accountAction(fn, okText) {
    accMsg(L('Un instant…', 'One moment…'), true);
    try { await fn(); if (document.body.dataset.screen === 'account') renderAccount(); if (okText) accMsg(okText, true); } catch (e) { accMsg(ON.explain(e)); }
  }
  $('account-body').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const v = (id) => ($(id) ? $(id).value : '');
    if (t.dataset.mode) { accountMode = t.dataset.mode; renderAccount(); return; }
    if (t.id === 'acc-go') {
      if (accountMode === 'signup') accountAction(async () => { justSignedUp = true; await ON.signUp(v('acc-pseudo'), v('acc-email'), v('acc-pw'), store.get('onlineSynced', null) ? 600 : estimatedElo()); }, L('Compte créé, bienvenue !', 'Account created, welcome!'));
      else accountAction(() => ON.signIn(v('acc-email'), v('acc-pw')), L('Connecté !', 'Signed in!'));
    }
    // mot de passe oublié : un lien de renouvellement est envoyé par e-mail
    if (t.id === 'acc-forgot') {
      if (!v('acc-email')) { accMsg(L('Indique d\'abord ton adresse e-mail ci-dessus.', 'First enter your e-mail address above.')); return; }
      accountAction(() => ON.resetPassword(v('acc-email')), L('Un e-mail pour choisir un nouveau mot de passe vient de t\'être envoyé.', 'An e-mail to choose a new password has just been sent to you.'));
    }
    if (t.id === 'acc-save-pseudo') accountAction(async () => { const p = await ON.changePseudo(v('acc-pseudo')); const pl = playerProfile(); pl.name = p.pseudo; store.set('player', pl); refreshHome(); }, L('Pseudo enregistré.', 'Nickname saved.'));
    if (t.id === 'acc-save-pw') accountAction(() => ON.changePassword(v('acc-pw-old'), v('acc-pw-new')), L('Mot de passe changé.', 'Password changed.'));
    if (t.id === 'acc-photo') { pickPhoto(() => renderAccount()); return; }
    if (t.id === 'acc-delete') {
      const pw = v('acc-del-pw');
      if (!pw) { accMsg(L('Indique ton mot de passe pour confirmer.', 'Enter your password to confirm.')); return; }
      modal({ title: L('Supprimer ton compte ?', 'Delete your account?'), text: L('Cette action est définitive : ton profil, ton pseudo et ta progression en ligne seront effacés.', 'This cannot be undone: your profile, nickname and online progress will be erased.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => accountAction(async () => { await ON.deleteAccount(pw); wipeLocalProgress(); rawSet('onlineSynced', null); location.reload(); }, L('Ton compte a été supprimé.', 'Your account has been deleted.')) },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (t.id === 'acc-logout') accountAction(async () => {
      const uid = ON.user && ON.user.uid;
      await pushProgress();
      // ce qui n'a pas pu partir (hors connexion) est gardé pour ce compte seulement
      if (progressDirty && uid && store.get('onlineSynced', null) === uid) backupFor(uid);
      await ON.signOut();
      // l'appareil redevient vierge : rien de ce compte ne passe au suivant
      if (store.get('onlineSynced', null)) wipeLocalProgress();
      rawSet('onlineSynced', null);
      location.reload();
    }, L('Déconnecté.', 'Signed out.'));
  });
  function openAccount() { returnTo = 'home'; renderAccount(); show('account'); if (ON) ON.load().catch(() => accMsg(L('Impossible de joindre le serveur. Vérifie ta connexion.', 'Cannot reach the server. Check your connection.'))); }
  $('btn-account').onclick = openAccount;

  /* Jouer en ligne */
  function renderOnline() {
    const body = $('online-body'), u = ON && ON.user;
    if (!u) {
      body.innerHTML = `<p class="level-help">${L('Pour jouer en ligne avec un ami, connecte-toi ou crée un compte : tes amis t\'invitent avec ton pseudo.', 'To play online with a friend, sign in or create an account: your friends invite you with your nickname.')}</p><button id="on-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>`;
      return;
    }
    const me = u.uid, myName = (ON.profile && ON.profile.pseudo) || '';
    // plus de partie sans limite : chaque partie doit pouvoir se terminer
    const tcOptions = Object.keys(TC_LABELS).filter((k) => k !== 'unlim' && k !== '7d').map((k) => `<option value="${k}"${k === store.get('onlineTc', '10m') ? ' selected' : ''}>${TC_LABELS[k]}</option>`).join('');
    const inv = onlineInvites.in, out = onlineInvites.out;
    const active = onlineGames.filter((g) => g.status === 'active').sort((a, b) => b.lastMoveAt - a.lastMoveAt);
    const myTurn = active.filter((g) => (g.moves.length % 2 === 0) === (g.white === me)).length;
    if (!onlinePlayers) loadPlayers();
    const SECTIONS = [
      ['find', '🎲', L('Trouver un adversaire', 'Find an opponent'), null],
      ['players', '👥', L('Joueurs', 'Players'), onlinePlayers ? onlinePlayers.filter((p) => p.uid !== me && isConnected(p)).length : null],
      ['pseudo', '✉️', L('Inviter par pseudo', 'Invite by nickname'), null],
      ['in', '📥', L('Invitations reçues', 'Invitations received'), inv.length],
      ['out', '📤', L('Invitations envoyées', 'Invitations sent'), out.length],
      ['games', '♟️', L('Parties en cours', 'Games in progress'), active.length],
    ];
    if (!onlineSection) {
      body.innerHTML = `<p class="level-help">${L(`Ton pseudo : <b>${escHtml(myName)}</b>. Donne-le à tes amis pour qu'ils t'invitent.`, `Your nickname: <b>${escHtml(myName)}</b>. Give it to your friends so they can invite you.`)}</p>
        <div class="tour-menu">${SECTIONS.map(([id, icon, label, n]) => `<button class="btn tour-menu-btn" type="button" data-online-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}${id === 'players' && n != null ? `<small class="tour-menu-sub">${L('connectés', 'online')}</small>` : ''}${id === 'games' && myTurn ? `<small class="tour-menu-sub">${L(`à toi de jouer : ${myTurn}`, `your move: ${myTurn}`)}</small>` : ''}</b>${n != null ? `<span class="tour-menu-count${(id === 'in' && n) || (id === 'games' && myTurn) ? ' hot' : ''}">${n}</span>` : ''}</button>`).join('')}</div>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === onlineSection);
    const tcField = `<label class="field-label" for="on-tc">${L('Cadence', 'Time control')}</label><select id="on-tc" class="profile-name-input">${tcOptions}</select>`;
    let html = `<button class="btn ghost" type="button" data-online-section="">‹ ${L('Jouer en ligne', 'Play online')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (onlineSection === 'find') html += tcField + playersHtml('find') + '<p id="on-msg" class="ed-error" role="status"></p>';
    if (onlineSection === 'players') html += tcField + '<p id="on-msg" class="ed-error" role="status"></p>' + playersHtml('list');
    if (onlineSection === 'pseudo') html += `${field('on-pseudo', L('Pseudo du joueur', 'Player\'s nickname'), 'text', '', 'maxlength="24"')}${tcField}<button id="on-invite" class="btn primary wide" type="button">${L('Envoyer l\'invitation', 'Send the invitation')}</button><p id="on-msg" class="ed-error" role="status"></p>`;
    if (onlineSection === 'in') html += inv.length ? `<div class="replay-items">${inv.map((i) => `<div class="replay-row"><div class="btn replay-item"><strong>${escHtml(i.fromName)} (${i.fromElo})</strong><span>${TC_LABELS[i.tc]}</span></div><button class="btn primary" data-accept="${i.id}">${L('Accepter', 'Accept')}</button><button class="btn ghost" data-decline="${i.id}">✕</button></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune pour le moment.', 'None for now.')}</p>`;
    if (onlineSection === 'out') html += out.length ? `<div class="replay-items">${out.map((i) => `<div class="replay-row"><div class="btn replay-item"><strong>${escHtml(i.toName)} (${i.toElo})</strong><span>${TC_LABELS[i.tc]} · ${L('en attente', 'waiting')}</span></div><button class="btn ghost" data-cancel="${i.id}">${L('Annuler', 'Cancel')}</button></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune invitation en attente.', 'No pending invitation.')}</p>`;
    if (onlineSection === 'games') html += active.length ? `<div class="replay-items">${active.map((g) => {
      const white = g.white === me, opp = white ? `${g.blackName} (${g.blackElo})` : `${g.whiteName} (${g.whiteElo})`;
      const mine = (g.moves.length % 2 === 0) === white;
      return `<button class="btn replay-item" data-game="${g.id}"><strong>${L('contre', 'vs')} ${escHtml(opp)}${mine ? L(' · à toi de jouer', ' · your move') : ''}</strong><span>${TC_LABELS[g.tc]} · ${L('tu as les', 'you play')} ${white ? L('Blancs', 'White') : L('Noirs', 'Black')} · ${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}</span></button>`;
    }).join('')}</div>` : `<p class="level-help">${L('Aucune partie en cours.', 'No game in progress.')}</p>`;
    body.innerHTML = html;
  }
  $('online-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'on-login') return openAccount();
    const msg = (x, ok) => { const m = $('on-msg'); if (m) { m.textContent = x; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    if (t.dataset.onlineSection != null) { onlineSection = t.dataset.onlineSection || null; suggestedOpp = null; renderOnline(); return; }
    if (t.id === 'on-refresh') { loadPlayers(); return; }
    if (t.id === 'on-suggest') {
      if (!onlinePlayers) await loadPlayers();
      suggestedOpp = suggestOpponent();
      renderOnline();
      if (!suggestedOpp) msg(L('Aucun adversaire disponible pour le moment : réessaie plus tard.', 'No opponent available right now: try again later.'));
      return;
    }
    if (t.dataset.inviteUid) { await invitePlayer(t.dataset.inviteUid, msg); $('on-msg').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (t.dataset.mute) { toggleMute(t.dataset.mute); return; }
    if (t.id === 'on-invite') {
      const tc = $('on-tc').value; store.set('onlineTc', tc);
      msg(L('Envoi…', 'Sending…'), true);
      try { const o = await ON.invite($('on-pseudo').value, tc); msg(L(`Invitation envoyée à ${o.pseudo}. La partie s'ouvrira dès qu'il ou elle l'acceptera.`, `Invitation sent to ${o.pseudo}. The game will open as soon as they accept.`), true); } catch (err) { msg(ON.explain(err)); }
      return;
    }
    const find = (id) => [...onlineInvites.in, ...onlineInvites.out].find((i) => i.id === id);
    if (t.dataset.accept) { try { const id = await ON.answerInvite(find(t.dataset.accept), true); const g = onlineGames.find((x) => x.id === id); if (g) openOnlineGame(g); else toast(L('Partie créée : elle apparaît dans tes parties en cours.', 'Game created: it appears in your games in progress.')); } catch (err) { toast(ON.explain(err)); } }
    if (t.dataset.decline || t.dataset.cancel) { try { await ON.answerInvite(find(t.dataset.decline || t.dataset.cancel), false); } catch (err) { toast(ON.explain(err)); } }
    if (t.dataset.game) { const g = onlineGames.find((x) => x.id === t.dataset.game); if (g) openOnlineGame(g); }
  });
  /* ---------- Tournois en ligne : individuels ou par équipe ---------- */
  let tourSection = null, tourList = { open: [], mine: [] }, tourListStop = null, tourId = null, tourDoc = null, tourStop = null;
  const FORMAT_LABELS = L({ swiss: 'Système suisse', rr: 'Toutes rondes' }, { swiss: 'Swiss system', rr: 'Round robin' });
  const TYPE_LABELS = L({ solo: 'Individuel', team: 'Par équipe' }, { solo: 'Individual', team: 'Team' });
  const STATUS_LABELS = L({ open: 'inscriptions ouvertes', running: 'en cours', over: 'terminé', cancelled: 'annulé (pas assez d\'inscrits)' }, { open: 'registration open', running: 'in progress', over: 'finished', cancelled: 'cancelled (not enough players)' });
  // cadence : pendule (temps total) ou temps par coup
  const TC_GROUPS = { clock: ['10m', '5m', '2m', '1m'], move: ['pm30', 'pm60', '1d', '3d'] };
  let tourForm = { type: 'solo', teamMode: 'auto', format: 'swiss', tcKind: 'clock', tc: '10m', rounds: 5, teamSize: 4 };
  const fmtDeadline = (ms) => new Date(ms).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const localInput = (ms) => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const autoStarted = new Set();
  const pName = (t, id) => (t.type === 'team' ? (t.teams.find((x) => x.id === id) || {}).name || '?' : t.names[id] || '?');
  function standings(t) {
    const ids = ON.participants(t);
    // départage : somme des points des adversaires rencontrés (Buchholz)
    const buch = (id) => (t.met[id] || []).reduce((s, o) => s + (t.scores[o] || 0), 0);
    return ids.map((id) => ({ id, pts: t.scores[id] || 0, buch: buch(id) })).sort((a, b) => b.pts - a.pts || b.buch - a.buch);
  }
  function renderTournaments() {
    const body = $('tour-body'), u = ON && ON.user;
    $('tour-title').textContent = tourDoc ? tourDoc.name : L('Tournois', 'Tournaments');
    const otbLink = `<button id="tour-otb" class="btn wide otb-link" type="button">♟️ ${L('Tournoi en réel, sur de vrais échiquiers', 'Over-the-board tournament, on real boards')}</button>`;
    if (!u) { body.innerHTML = `<p class="level-help">${L('Les tournois se jouent en ligne : connecte-toi ou crée un compte.', 'Tournaments are played online: sign in or create an account.')}</p><button id="tour-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>${otbLink}`; return; }
    if (tourDoc) { renderTournamentDetail(); return; }
    const seg = (name, opts) => `<div class="ed-seg" data-tour="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${String(tourForm[name]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const tcOpts = Object.keys(TC_LABELS).map((k) => `<option value="${k}"${k === tourForm.tc ? ' selected' : ''}>${TC_LABELS[k]}</option>`).join('');
    const card = (t) => `<button class="btn replay-item" data-tour-open="${t.id}"><strong>${escHtml(t.name)}</strong><span>${TYPE_LABELS[t.type]} · ${FORMAT_LABELS[t.format]} · ${TC_LABELS[t.tc] || ''} · ${ON.participants(t).length} ${t.type === 'team' ? L('équipe(s)', 'team(s)') : L('joueur(s)', 'player(s)')} · ${t.status === 'open' && t.deadline ? (Date.now() < t.deadline ? L(`inscriptions jusqu'au ${fmtDeadline(t.deadline)}`, `registration until ${fmtDeadline(t.deadline)}`) : L('inscriptions closes', 'registration closed')) : STATUS_LABELS[t.status]}</span></button>`;
    const mine = tourList.mine.slice().sort((a, b) => b.createdAt - a.createdAt), open = tourList.open.filter((t) => !t.members.includes(u.uid));
    const pub = tourList.public || [];
    const running = pub.filter((t) => t.status === 'running').sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    const history = pub.filter((t) => t.status === 'over').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)).slice(0, 30);
    const list = (arr, empty) => (arr.length ? `<div class="replay-items">${arr.map(card).join('')}</div>` : `<p class="level-help">${empty}</p>`);
    // menu : un bouton par rubrique, puis la rubrique choisie
    const SECTIONS = [
      ['mine', '🎟️', L('Mes tournois', 'My tournaments'), mine.length],
      ['code', '🔑', L('Rejoindre avec un code', 'Join with a code'), null],
      ['open', '📝', L('Tournois ouverts', 'Open tournaments'), open.length],
      ['live', '🔴', L('En direct', 'Live'), running.length],
      ['history', '📜', L('Historique', 'History'), history.length],
      ['create', '➕', L('Créer un tournoi', 'Create a tournament'), null],
    ];
    if (!tourSection) {
      body.innerHTML = `<div class="tour-menu">${SECTIONS.map(([id, icon, label, n]) => `<button class="btn tour-menu-btn" type="button" data-tour-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}</b>${n != null ? `<span class="tour-menu-count${id === 'open' && newTours.length ? ' hot' : ''}">${n}</span>` : ''}${id === 'open' && newTours.length ? `<small class="tour-menu-sub">${L(`${newTours.length} nouveau${newTours.length > 1 ? 'x' : ''}`, `${newTours.length} new`)}</small>` : ''}</button>`).join('')}</div>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === tourSection);
    let html = `<button class="btn ghost" type="button" data-tour-section="">‹ ${L('Tournois', 'Tournaments')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (tourSection === 'mine') html += list(mine, L('Aucun pour le moment.', 'None for now.'));
    if (tourSection === 'code') html += `${field('tour-code', L('Code du tournoi', 'Tournament code'), 'text', '', 'maxlength="6" style="text-transform:uppercase"')}<button id="tour-join-code" class="btn primary wide" type="button">${L('Rejoindre', 'Join')}</button><p id="tour-msg" class="ed-error" role="status"></p>`;
    if (tourSection === 'open') html += list(open, L('Aucun tournoi ouvert pour le moment.', 'No open tournament for now.'));
    if (tourSection === 'live') html += `<p class="level-help">${L('Tournois en cours : ouvre-en un pour regarder les parties en direct.', 'Tournaments in progress: open one to watch the games live.')}</p>` + list(running, L('Aucun tournoi en cours.', 'No tournament in progress.'));
    if (tourSection === 'history') html += list(history, L('Aucun tournoi terminé pour le moment.', 'No finished tournament yet.'));
    if (tourSection !== 'create') { body.innerHTML = html; return; }
    body.innerHTML = html + `
      ${seg('type', [['solo', TYPE_LABELS.solo], ['team', TYPE_LABELS.team]])}
      ${tourForm.type === 'team' ? `<label class="field-label">${L('Formation des équipes', 'How teams are formed')}</label>${seg('teamMode', [['auto', L('Équilibrées par niveau', 'Balanced by level')], ['made', L('Équipes déjà faites', 'Ready-made teams')]])}<p class="level-help">${tourForm.teamMode === 'auto' ? L('Chacun s\'inscrit seul ; au départ, les équipes sont formées automatiquement pour que leur niveau moyen soit le plus proche possible.', 'Everyone registers alone; at the start, teams are formed automatically so their average levels are as close as possible.') : L('Un capitaine crée son équipe et y ajoute ses coéquipiers par leur pseudo.', 'A captain creates the team and adds teammates by nickname.')}</p>` : ''}
      ${field('tour-name', L('Nom du tournoi', 'Tournament name'), 'text', tourForm.name || '', 'maxlength="40"')}
      ${field('tour-deadline', L('Date limite d\'inscription (le tournoi démarre à ce moment-là)', 'Registration deadline (the tournament starts then)'), 'datetime-local', localInput(tourForm.deadline || Date.now() + 86400000))}
      <label class="field-label">${L('Format', 'Format')}</label>${seg('format', [['swiss', FORMAT_LABELS.swiss], ['rr', FORMAT_LABELS.rr]])}
      ${tourForm.format === 'swiss' ? `<label class="field-label">${L('Nombre de rondes', 'Number of rounds')}</label>${seg('rounds', [[3, '3'], [4, '4'], [5, '5'], [7, '7']])}` : ''}
      ${tourForm.type === 'team' ? `<label class="field-label">${L('Joueurs par équipe', 'Players per team')}</label>${seg('teamSize', [[2, '2'], [3, '3'], [4, '4']])}` : ''}
      <label class="field-label">${L('Cadence', 'Time control')}</label>${seg('tcKind', [['clock', L('Pendule', 'Clock')], ['move', L('Temps par coup', 'Time per move')]])}
      <div style="margin-top:8px">${seg('tc', (TC_GROUPS[tourForm.tcKind] || TC_GROUPS.clock).map((k) => [k, TC_LABELS[k]]))}</div>
      <button id="tour-create" class="btn primary wide" type="button">${L('Créer le tournoi', 'Create the tournament')}</button>
      <p id="tour-msg" class="ed-error" role="status"></p>`;
  }
  // Tableau du tournoi, dans la forme la plus adaptée : grille croisée pour les toutes rondes,
  // tableau ronde par ronde (couleur, rang de l'adversaire, résultat) pour le système suisse
  function tourTable(t, me) {
    const ids = t.players, rounds = Object.keys(t.pairings).map((k) => Number(k.slice(1))).sort((a, b) => a - b);
    // pour chaque joueur et chaque ronde : la liste de ses parties (aller et retour)
    const per = {}; ids.forEach((id) => { per[id] = {}; });
    for (const r of rounds) for (const m of t.pairings[`r${r}`]) {
      if (m.bye) { per[m.a][r] = [{ bye: true, pts: 2 }]; continue; }
      for (const g of m.games) {
        const sw = g.result === '1-0' ? 1 : g.result === '0-1' ? 0 : g.result ? 0.5 : null;
        (per[g.white][r] = per[g.white][r] || []).push({ opp: g.black, color: 'w', pts: sw });
        (per[g.black][r] = per[g.black][r] || []).push({ opp: g.white, color: 'b', pts: sw == null ? null : 1 - sw });
      }
    }
    const all = (id) => Object.values(per[id]).flat();
    const pts = (id) => all(id).reduce((s, x) => s + (x.pts || 0), 0);
    const opps = (id) => [...new Set(all(id).filter((x) => x.opp).map((x) => x.opp))];
    const buch = (id) => opps(id).reduce((s, o) => s + pts(o), 0);
    const order = ids.slice().sort((a, b) => pts(b) - pts(a) || buch(b) - buch(a) || (t.elos[b] || 0) - (t.elos[a] || 0));
    const rank = (id) => order.indexOf(id) + 1;
    const fmt = (x) => (x == null ? '…' : x === 0.5 ? '½' : String(x));
    const n = (x) => NUM(x, x % 1 ? 1 : 0);
    const sum = (list) => (list.some((x) => x.pts == null) ? null : list.reduce((s, x) => s + x.pts, 0));
    const title = t.status === 'over' ? L('Classement final', 'Final standings') : t.status === 'cancelled' ? L('Tournoi annulé', 'Tournament cancelled') : L('Tableau du tournoi', 'Tournament table');
    let html = `<h3 class="train-h">${title}</h3><div class="tour-scroll"><table class="tour-table">`;
    if (t.format === 'rr') {
      // grille croisée : résultats des deux parties (Blancs puis Noirs) du joueur de la ligne contre celui de la colonne
      html += `<tr><th>#</th><th>${L('Joueur', 'Player')}</th>${order.map((_, i) => `<th class="c">${i + 1}</th>`).join('')}<th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>`;
      html += order.map((id, i) => `<tr${id === me ? ' class="me"' : ''}><td>${i + 1}</td><td><a href="#" data-profile="${id}">${escHtml(t.names[id] || '?')}</a></td>${order.map((o) => {
        if (o === id) return '<td class="c x">■</td>';
        const games = all(id).filter((x) => x.opp === o).sort((x, y) => (x.color === 'w' ? -1 : 1) - (y.color === 'w' ? -1 : 1));
        return `<td class="c">${games.map((x) => fmt(x.pts)).join(' ')}</td>`;
      }).join('')}<td><b>${n(pts(id))}</b></td><td>${n(buch(id))}</td></tr>`).join('');
    } else {
      // suisse : pour chaque ronde, rang de l'adversaire et points marqués sur les deux parties
      html += `<tr><th>#</th><th>${L('Joueur', 'Player')}</th><th>Elo</th>${rounds.map((r) => `<th class="c">R${r}</th>`).join('')}<th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>`;
      html += order.map((id, i) => `<tr${id === me ? ' class="me"' : ''}><td>${i + 1}</td><td><a href="#" data-profile="${id}">${escHtml(t.names[id] || '?')}</a></td><td>${t.elos[id] || 600}</td>${rounds.map((r) => {
        const list = per[id][r];
        if (!list) return '<td class="c"></td>';
        if (list[0].bye) return `<td class="c">${L('exempt', 'bye')} 2</td>`;
        return `<td class="c">${L('c.', 'vs')} ${rank(list[0].opp)} : ${fmt(sum(list))}</td>`;
      }).join('')}<td><b>${n(pts(id))}</b></td><td>${n(buch(id))}</td></tr>`).join('');
    }
    html += '</table></div>';
    html += `<p class="level-help">${t.format === 'rr' ? L('Chaque rencontre se joue en deux parties, une avec chaque couleur : la case montre le résultat avec les Blancs, puis avec les Noirs.', 'Each pairing is played over two games, one with each colour: the square shows the result with White, then with Black.') : L('Chaque ronde se joue en deux parties, une avec chaque couleur : « c. 3 : 1½ » veut dire 1 point et demi marqué contre le 3e du classement ; … partie en cours.', 'Each round is played over two games, one with each colour: “vs 3: 1½” means 1.5 points scored against the 3rd in the standings; … game in progress.')}</p>`;
    return html;
  }
  function renderTournamentDetail() {
    const t = tourDoc, me = ON.user.uid, body = $('tour-body');
    const isOwner = t.owner === me, myTeam = t.type === 'team' ? t.teams.find((x) => x.members.includes(me)) : null;
    const inIt = t.type === 'team' && t.teamMode !== 'auto' ? !!myTeam : t.players.includes(me);
    let html = `<button id="tour-back" class="btn ghost" type="button">‹ ${L('Tous les tournois', 'All tournaments')}</button>
      <p class="level-help">${TYPE_LABELS[t.type]} · ${FORMAT_LABELS[t.format]}${t.format === 'swiss' ? ` · ${t.rounds} ${L('rondes', 'rounds')}` : ''} · ${TC_LABELS[t.tc] || ''}${t.type === 'team' ? ` · ${t.teamSize} ${L('joueurs par équipe', 'players per team')}` : ''}<br>
      ${L('Organisé par', 'Organised by')} <b>${escHtml(t.ownerName)}</b> · ${STATUS_LABELS[t.status]}${t.status === 'running' ? ` · ${L('ronde', 'round')} ${t.round}/${t.totalRounds || t.rounds}` : ''}<br>
      ${t.status === 'open' && t.deadline ? `${L('Inscriptions jusqu\'au', 'Registration until')} <b>${fmtDeadline(t.deadline)}</b><br>` : ''}
      ${L('Code à partager', 'Code to share')} : <b class="tour-code">${t.code}</b></p>`;
    // date limite passée : le premier inscrit qui ouvre le tournoi le lance
    if (t.status === 'open' && t.deadline && Date.now() > t.deadline && t.members.includes(me) && !autoStarted.has(t.id)) { autoStarted.add(t.id); ON.startTournament(t.id, true).catch(() => {}); }
    if (t.status === 'open') {
      if (t.type === 'solo' || t.teamMode === 'auto') {
        if (t.type === 'team') html += `<p class="level-help">${L(`Équipes de ${t.teamSize} formées automatiquement au départ, de niveau moyen équivalent.`, `Teams of ${t.teamSize} formed automatically at the start, with equivalent average levels.`)}</p>`;
        html += `<h3 class="train-h">${L('Joueurs inscrits', 'Registered players')} (${t.players.length})</h3><div class="replay-items">${t.players.map((p) => `<button type="button" class="btn replay-item" data-profile="${p}"><strong>${escHtml(t.names[p] || '?')} (${t.elos[p] || 600})</strong><span>${L('voir le profil', 'see profile')}</span></button>`).join('')}</div>`;
        html += inIt ? `<button id="tour-leave" class="btn ghost wide" type="button">${L('Me désinscrire', 'Withdraw')}</button>` : `<button id="tour-join" class="btn primary wide" type="button">${L('M\'inscrire', 'Register')}</button>`;
      } else {
        html += `<h3 class="train-h">${L('Équipes', 'Teams')} (${t.teams.length})</h3>` + (t.teams.length ? `<div class="replay-items">${t.teams.map((tm) => `<div class="btn replay-item"><strong>${escHtml(tm.name)} (${tm.members.length}/${t.teamSize})</strong><span>${tm.members.map((m, i) => `${i + 1}. ${escHtml(t.names[m] || '?')}${m === tm.captain ? L(' (capitaine)', ' (captain)') : ''}`).join(' · ')}</span></div>`).join('')}</div>` : `<p class="level-help">${L('Aucune équipe pour le moment.', 'No team yet.')}</p>`);
        if (myTeam && myTeam.captain === me && myTeam.members.length < t.teamSize) html += `${field('tour-mate', L('Ajouter un coéquipier (pseudo)', 'Add a teammate (nickname)'), 'text', '', 'maxlength="24"')}<button id="tour-add-mate" class="btn wide" type="button">${L('Ajouter à mon équipe', 'Add to my team')}</button>`;
        if (!myTeam) html += `${field('tour-team', L('Nom de ton équipe', 'Your team name'), 'text', '', 'maxlength="30"')}<button id="tour-create-team" class="btn primary wide" type="button">${L('Créer mon équipe (j\'en serai le capitaine)', 'Create my team (I will be captain)')}</button>`;
        else if (myTeam.captain !== me) html += `<button id="tour-leave" class="btn ghost wide" type="button">${L('Quitter mon équipe', 'Leave my team')}</button>`;
      }
      if (isOwner) html += `<button id="tour-start" class="btn primary wide" type="button">${L('Lancer le tournoi', 'Start the tournament')}</button>`;
    } else {
      if (t.type === 'team') html += `<h3 class="train-h">${L('Équipes', 'Teams')}</h3><div class="replay-items">${t.teams.map((tm) => `<div class="btn replay-item"><strong>${escHtml(tm.name)}${tm.elo ? ` · Elo ${L('moyen', 'avg')} ${tm.elo}` : ''}</strong><span>${tm.members.map((m, i) => `${L('éch.', 'bd')} ${i + 1} : ${escHtml(t.names[m] || '?')} (${t.elos[m] || 600})`).join(' · ')}</span></div>`).join('')}</div>`;
      // ronde en cours : mes parties, puis tous les appariements
      const round = t.pairings[`r${t.round}`] || [];
      const myGames = [];
      round.forEach((m) => m.games.forEach((g) => { if ((g.white === me || g.black === me) && !g.result) myGames.push(g); }));
      if (t.status === 'running' && myGames.length) html += myGames.map((g) => `<button class="btn primary wide" data-tour-game="${g.id}">${L(`Jouer ma partie ${g.leg === 2 ? 'retour' : 'aller'} de la ronde ${t.round}`, `Play my round ${t.round} ${g.leg === 2 ? 'return' : 'first'} game`)} : ${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])}</button>`).join('');
      const res = (r) => (r ? r.replace('1/2-1/2', '½-½') : '…');
      html += `<h3 class="train-h">${t.status === 'over' ? L('Dernière ronde', 'Last round') : L(`Ronde ${t.round}`, `Round ${t.round}`)}</h3><div class="replay-items">${round.map((m) => m.bye
        ? `<div class="btn replay-item"><strong>${escHtml(pName(t, m.a))}</strong><span>${L('exempt (gagne le point)', 'bye (wins the point)')}</span></div>`
        : `<div class="btn replay-item"><strong>${escHtml(pName(t, m.a))} – ${escHtml(pName(t, m.b))}</strong>${m.games.map((g) => `<span class="tour-game">${t.type === 'team' ? `${L('éch.', 'bd')} ${g.board || 1} · ` : ''}${g.leg === 2 ? L('retour', 'return') : L('aller', 'first')} : ${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])} ${res(g.result)} <button type="button" class="btn ghost tour-watch" data-watch="${g.id}">${g.result ? L('Revoir', 'Replay') : L('Regarder', 'Watch')}</button></span>`).join('')}${isLiveTc(t) && m.games.length < (m.expected || 0) ? `<span class="tour-game">${L('retour : après la partie aller', 'return: after the first game')}</span>` : ''}</div>`).join('')}</div>`;
      // rondes précédentes, à revoir
      const past = Object.keys(t.pairings).map((k) => Number(k.slice(1))).filter((r) => r !== t.round).sort((a, b) => b - a);
      if (past.length) html += `<h3 class="train-h">${L('Rondes précédentes', 'Previous rounds')}</h3><div class="replay-items">${past.map((r) => t.pairings[`r${r}`].filter((m) => !m.bye).map((m) => `<div class="btn replay-item"><strong>${L('Ronde', 'Round')} ${r} · ${escHtml(pName(t, m.a))} – ${escHtml(pName(t, m.b))}</strong>${m.games.map((g) => `<span class="tour-game">${escHtml(t.names[g.white])} – ${escHtml(t.names[g.black])} ${res(g.result)} <button type="button" class="btn ghost tour-watch" data-watch="${g.id}">${L('Revoir', 'Replay')}</button></span>`).join('')}</div>`).join('')).join('')}</div>`;
    }
    if (t.status !== 'open') html += t.type === 'solo' ? tourTable(t, me) : `<h3 class="train-h">${t.status === 'over' ? L('Classement final', 'Final standings') : L('Classement', 'Standings')}</h3><table class="tour-table"><tr><th>#</th><th>${L('Équipe', 'Team')}</th><th>${L('Pts', 'Pts')}</th><th>${L('Départ.', 'Tiebr.')}</th></tr>${standings(t).map((r, i) => `<tr${myTeam && myTeam.id === r.id ? ' class="me"' : ''}><td>${i + 1}</td><td>${escHtml(pName(t, r.id))}</td><td>${NUM(r.pts, r.pts % 1 ? 1 : 0)}</td><td>${NUM(r.buch, r.buch % 1 ? 1 : 0)}</td></tr>`).join('')}</table>`;
    html += `<p id="tour-msg" class="ed-error" role="status"></p>`;
    body.innerHTML = html;
  }
  function openTournament(id) {
    if (tourStop) tourStop();
    tourId = id; tourDoc = (tourList.mine.concat(tourList.open, tourList.public || [])).find((x) => x.id === id) || null;
    tourStop = ON.watchTournament(id, (t) => { tourDoc = t; if (document.body.dataset.screen === 'tournaments' && tourId === t.id) renderTournaments(); });
    renderTournaments();
  }
  function closeTournament() { if (tourStop) tourStop(); tourStop = null; tourId = null; tourDoc = null; renderTournaments(); }
  const isLiveTc = (t) => !!((ON.TIME_CONTROLS[t.tc] || {}).ms);
  let spectStop = null;
  function stopSpect() { if (spectStop) spectStop(); spectStop = null; }
  // Partie de tournoi suivie en direct (les coups arrivent au fur et à mesure) ou revue une fois finie
  function openSpectate(id) {
    stopSpect();
    const tid = tourId;
    let first = true;
    spectStop = ON.watchGame(id, (g) => {
      const label = `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}${g.status === 'active' ? L(' · en direct', ' · live') : ''}`;
      if (first) {
        first = false;
        startReplay({ moves: g.moves, result: g.result || '*', title: label, white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})` }, () => { stopSpect(); show('tournaments'); if (tid) openTournament(tid); });
        replay.liveId = id;
        if (g.moves.length) gotoPly(g.moves.length);
        return;
      }
      if (!replay || replay.liveId !== id) { stopSpect(); return; }
      if (g.moves.length > replay.moves.length) {
        const atEnd = replay.index === replay.moves.length;
        const probe = new Game(replay.fen), sans = [];
        for (const u of g.moves) { const r = probe.playUci(u); if (!r) break; sans.push(r.san); }
        replay.moves = g.moves.slice(0, sans.length); replay.sans = sans;
        if (atEnd) gotoPly(replay.moves.length, true); else render();
      }
      if (g.status === 'over') { replay.result = g.result; $('game-title').textContent = `Replay · ${label}`; render(); }
    });
  }
  $('tour-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tourSection != null) { tourSection = t.dataset.tourSection || null; if (tourSection === 'open') markToursSeen(); renderTournaments(); $('tour-body').scrollTop = 0; return; }
    if (t.dataset.watch) return openSpectate(t.dataset.watch);
    const msg = (x, ok) => { const m = $('tour-msg'); if (m) { m.textContent = x; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    const run = async (fn, ok) => { msg(L('Un instant…', 'One moment…'), true); try { await fn(); msg(ok || '', true); } catch (err) { msg(ON.explain(err)); } };
    const seg = t.closest('[data-tour]');
    if (seg && t.dataset.value) {
      const k = seg.dataset.tour;
      if ($('tour-deadline')) tourForm.deadline = new Date($('tour-deadline').value).getTime() || tourForm.deadline;
      if ($('tour-name')) tourForm.name = $('tour-name').value;
      tourForm[k] = /^\d+$/.test(t.dataset.value) ? Number(t.dataset.value) : t.dataset.value;
      if (k === 'tcKind') tourForm.tc = TC_GROUPS[t.dataset.value][0];
      renderTournaments(); return;
    }
    if (t.id === 'tour-login') return openAccount();
    if (t.id === 'tour-otb') return openOtb();
    if (t.id === 'tour-back') return closeTournament();
    if (t.dataset.tourOpen) return openTournament(t.dataset.tourOpen);
    if (t.id === 'tour-create') return run(async () => {
      const deadline = new Date($('tour-deadline').value).getTime();
      if (!(deadline > Date.now())) throw Object.assign(new Error(L('Choisis une date limite dans le futur.', 'Choose a deadline in the future.')), { code: 'deadline' });
      const tt = await ON.createTournament({ ...tourForm, name: $('tour-name').value, deadline });
      openTournament(tt.id);
    });
    if (t.id === 'tour-join-code') return run(async () => { const tt = await ON.findTournament($('tour-code').value); openTournament(tt.id); });
    if (t.id === 'tour-join') return run(() => ON.joinTournament(tourId), L('Inscription enregistrée.', 'Registration saved.'));
    if (t.id === 'tour-leave') return run(() => ON.leaveTournament(tourId));
    if (t.id === 'tour-create-team') return run(() => ON.createTeam(tourId, $('tour-team').value), L('Équipe créée : ajoute maintenant tes coéquipiers.', 'Team created: now add your teammates.'));
    if (t.id === 'tour-add-mate') return run(() => ON.addTeammate(tourId, tourDoc.teams.find((x) => x.members.includes(ON.user.uid)).id, $('tour-mate').value), L('Coéquipier ajouté.', 'Teammate added.'));
    if (t.id === 'tour-start') return run(() => ON.startTournament(tourId), L('Le tournoi commence : bonne chance à tous !', 'The tournament begins: good luck everyone!'));
    if (t.dataset.tourGame) {
      const g = onlineGames.find((x) => x.id === t.dataset.tourGame);
      if (g) openOnlineGame(g); else toast(L('La partie se prépare, réessaie dans un instant.', 'The game is being prepared, try again in a moment.'));
    }
  });
  $('btn-tournaments').onclick = () => {
    returnTo = 'home'; tourSection = null;
    show('tournaments'); renderTournaments();
    if (!ON) return;
    ON.load().then(() => { startTourWatch(); renderTournaments(); }).catch(() => {});
  };
