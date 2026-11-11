  /* ---------- Écran « Reprendre » : affiché à chaque ouverture, tout ce qui est en cours ---------- */
  function renderWelcome() {
    const p = playerProfile(), items = [];
    const card = (icon, title, sub, key, hot) => items.push(`<button class="btn welcome-card${hot ? ' hot' : ''}" type="button" data-resume="${key}"><span class="welcome-icon">${icon}</span><span class="welcome-text"><strong>${title}</strong><small>${sub}</small></span><span class="welcome-go">${L('Continuer', 'Continue')} ›</span></button>`);
    // partie sur cet appareil (ordinateur, deux joueurs, Maître Sissa, position libre)
    const saved = store.get('game', null);
    if (saved && saved.cfg && !saved.result && saved.cfg.mode !== 'online' && (saved.moves || []).length) {
      const c = saved.cfg, n = Math.ceil((saved.moves || []).length / 2);
      const who = c.mode === 'local' ? L('Partie à deux joueurs', 'Two-player game') : c.mode === 'coach' ? L('Partie avec Maître Sissa', 'Game with Master Sissa') : `${L('Contre', 'Against')} ${sideNames(c)[c.playerColor === 'w' ? 'black' : 'white']}`;
      card('♟️', who, `${c.fen ? L('Position libre · ', 'Custom position · ') : ''}${L(`${n} coup${n > 1 ? 's' : ''} joué${n > 1 ? 's' : ''}`, `${n} move${n === 1 ? '' : 's'} played`)}`, 'game', true);
    }
    // parties en ligne et de tournoi
    if (ON && ON.user) {
      const me = ON.user.uid;
      onlineGames.filter((g) => g.status === 'active').sort((a, b) => b.lastMoveAt - a.lastMoveAt).forEach((g) => {
        const white = g.white === me, opp = white ? g.blackName : g.whiteName, mine = (g.moves.length % 2 === 0) === white;
        card(g.tournamentId ? '🏆' : '🌐', `${L('Contre', 'Against')} ${escHtml(opp)}${mine ? L(' · à toi de jouer', ' · your move') : ''}`, `${g.tournamentId ? `${escHtml(g.tournamentName || '')} · ${L('ronde', 'round')} ${g.round} · ` : L('En ligne · ', 'Online · ')}${TC_LABELS[g.tc] || ''} · ${Math.ceil(g.moves.length / 2)} ${L('coups', 'moves')}`, `online:${g.id}`, mine);
      });
    }
    // défi du jour commencé mais pas fini
    const d = dailyState(), okN = [0, 1, 2].filter((k) => d.res[k] === 'ok').length;
    if (!d.finished && Object.keys(d.res || {}).length) card('📅', L('Défi du jour', 'Daily challenge'), L(`${okN} sur 3 trouvés`, `${okN} of 3 found`), 'daily', true);
    // leçon ou problème ouvert puis quitté avant la fin
    const ol = store.get('openLesson', null);
    if (ol && ol.key) card(ol.key === 'program' ? '🧩' : '📘', escHtml(ol.title), ol.key === 'program' ? L('Problème ouvert, pas encore résolu', 'Puzzle opened, not solved yet') : L(`Arrêté à l’étape ${ol.idx + 1} sur ${ol.total}`, `Stopped at step ${ol.idx + 1} of ${ol.total}`), 'resume', true);
    $('welcome-title').textContent = p.name ? L(`Bon retour, ${p.name} !`, `Welcome back, ${p.name}!`) : L('Bienvenue !', 'Welcome!');
    $('welcome-body').innerHTML = `<div class="welcome-actions"><button class="btn primary" type="button" data-resume="new">${L('Nouvelle partie', 'New game')}</button><button class="btn ghost" type="button" data-resume="home">${L('Menu principal', 'Main menu')}</button></div>
      <p class="level-help">${items.length ? L('Voici ce que tu as commencé sans le terminer. Choisis ce que tu veux continuer.', 'Here is what you started without finishing. Choose what to continue.') : L('Rien en cours pour le moment : lance une nouvelle partie ou ouvre le menu principal.', 'Nothing in progress right now: start a new game or open the main menu.')}</p>
      <div class="welcome-list">${items.join('')}</div>`;
  }
  $('welcome-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-resume]'); if (!b) return;
    const [kind, id] = b.dataset.resume.split(':');
    returnTo = 'welcome';
    if (kind === 'home') return show('home');
    if (kind === 'new') { renderSetup(); show('setup'); return; }
    if (kind === 'game') { const saved = store.get('game', null); if (saved && saved.cfg) startGame(saved.cfg, saved.moves, saved.result, saved.flipped, saved.terrain, saved.weather); return; }
    if (kind === 'online') { const g = onlineGames.find((x) => x.id === id); if (g) openOnlineGame(g); return; }
    if (kind === 'invites') { onlineSection = 'in'; renderOnline(); show('online'); return; }
    if (kind === 'daily') { const d = dailyState(); const order = [0, 1, 2].sort((x, y) => (d.res[y] === 'retry') - (d.res[x] === 'retry')); const k = order.find((i) => d.res[i] !== 'ok'); return startDaily(k == null ? 0 : k); }
    if (kind === 'program') { returnTo = 'problems'; show('problems'); nextActivity(); return; }
    if (kind === 'open') return startOpening(TR.OPENINGS.find((x) => x.id === id));
    if (kind === 'mate') return startMateLesson(TR.MATES.find((x) => x.id === id));
    if (kind === 'end') return startEndgame(TR.ENDGAMES.find((x) => x.id === id));
    if (kind === 'quests') return openShop();
    if (kind === 'resume') return resumeOpenLesson();
  });
  $('btn-welcome').onclick = () => show('welcome');
  /* ---------- Administration : compte réservé au développeur, sans jeu ---------- */
  let adminSection = null, adminCache = null, adminQuery = '', adminSort = 'recent';
  const DAYMS = 86400000;
  function setAdminMode(on) {
    document.body.classList.toggle('admin-mode', on);
    $('btn-admin').hidden = !on;
  }
  async function loadAdmin() {
    $('admin-body').innerHTML = `<p class="level-help">${L('Chargement…', 'Loading…')}</p>`;
    try { adminCache = await ON.adminData(); } catch (err) { $('admin-body').innerHTML = `<p class="ed-error">${ON.explain(err)}</p><p class="level-help">${L('Vérifie que les règles Firebase avec l\u2019administration sont publiées.', 'Check that the Firebase rules with administration are published.')}</p>`; return; }
    renderAdmin();
  }
  function renderAdmin() {
    const body = $('admin-body'), u = ON && ON.user;
    if (!u || !ON.isAdminEmail()) { body.innerHTML = `<p class="level-help">${L('Réservé au compte administrateur.', 'Administrator account only.')}</p>`; return; }
    if (!ON.isAdmin()) {
      body.innerHTML = `<p class="level-help">${L(`Pour activer l’administration, confirme d’abord ton adresse <b>${escHtml(u.email)}</b> : un e-mail de vérification va t’être envoyé.`, `To enable administration, first confirm your address <b>${escHtml(u.email)}</b>: a verification e-mail will be sent to you.`)}</p>
        <button class="btn primary wide" data-admin="verify">${L('Envoyer l’e-mail de vérification', 'Send the verification e-mail')}</button>
        <button class="btn wide" data-admin="checked">${L('J’ai cliqué sur le lien', 'I clicked the link')}</button><p id="admin-msg" class="ed-error" role="status"></p>`;
      return;
    }
    if (!adminCache) { loadAdmin(); return; }
    const { users, games, tournaments } = adminCache, now = Date.now();
    const players = users.filter((x) => !x.admin);
    const SECTIONS = [['stats', '📊', L('Statistiques', 'Statistics')], ['users', '👥', L('Comptes', 'Accounts')], ['tours', '🏆', L('Tournois', 'Tournaments')], ['email', '✉️', L('Adresse administrateur', 'Administrator address')]];
    if (!adminSection) {
      body.innerHTML = `<p class="level-help">${L('Compte administrateur : on ne joue pas avec ce compte, il sert à gérer les comptes et à suivre l’appli.', 'Administrator account: you cannot play with it, it is used to manage accounts and follow the app.')}</p><div class="tour-menu">${SECTIONS.map(([id, icon, label]) => `<button class="btn tour-menu-btn" data-admin-section="${id}"><span class="tour-menu-icon">${icon}</span><b>${label}</b></button>`).join('')}</div>
        <button class="btn ghost wide" data-admin="reload" style="margin-top:10px">↻ ${L('Actualiser les données', 'Refresh data')}</button>`;
      return;
    }
    const sec = SECTIONS.find((x) => x[0] === adminSection);
    let html = `<button class="btn ghost" data-admin-section="">‹ ${L('Administration', 'Administration')}</button><h3 class="train-h">${sec[1]} ${sec[2]}</h3>`;
    if (adminSection === 'stats') {
      const seen = (d) => players.filter((x) => now - (x.lastSeen || 0) < d * DAYMS).length;
      const created = (d) => players.filter((x) => now - (x.createdAt || 0) < d * DAYMS).length;
      const over = games.filter((g) => g.status === 'over'), live = games.filter((g) => g.status === 'active');
      const recent = (d) => games.filter((g) => now - (g.createdAt || 0) < d * DAYMS).length;
      const elos = players.map((x) => x.elo || 600), avg = elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 0;
      const tc = {}; games.forEach((g) => { tc[g.tc] = (tc[g.tc] || 0) + 1; });
      const reasons = {}; over.forEach((g) => { reasons[g.reason || '?'] = (reasons[g.reason || '?'] || 0) + 1; });
      const card = (title, rows) => `<div class="stat-card"><h4>${title}</h4>${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
      const top = players.slice().sort((a, b) => (b.elo || 0) - (a.elo || 0)).slice(0, 5);
      html += `<div class="stat-cards">
        ${card(L('Comptes', 'Accounts'), [[L('Total', 'Total'), players.length], [L('Suspendus', 'Suspended'), players.filter((x) => x.banned).length], [L('Nouveaux (7 j)', 'New (7 d)'), created(7)], [L('Nouveaux (30 j)', 'New (30 d)'), created(30)]])}
        ${card(L('Activité', 'Activity'), [[L('Connectés maintenant', 'Online now'), players.filter((x) => now - (x.lastSeen || 0) < 3 * 60000).length], [L('Actifs aujourd’hui', 'Active today'), seen(1)], [L('Actifs (7 j)', 'Active (7 d)'), seen(7)], [L('Actifs (30 j)', 'Active (30 d)'), seen(30)], [L('Inactifs depuis 1 an', 'Inactive for 1 year'), players.filter((x) => now - (x.lastSeen || x.createdAt || 0) > 365 * DAYMS).length]])}
        ${card(L('Parties en ligne', 'Online games'), [[L('Total', 'Total'), games.length], [L('En cours', 'In progress'), live.length], [L('Terminées', 'Finished'), over.length], [L('Jouées (7 j)', 'Played (7 d)'), recent(7)], [L('De tournoi', 'Tournament'), games.filter((g) => g.tournamentId).length]])}
        ${card(L('Résultats', 'Results'), [[L('Blancs gagnent', 'White wins'), over.filter((g) => g.result === '1-0').length], [L('Noirs gagnent', 'Black wins'), over.filter((g) => g.result === '0-1').length], [L('Nulles', 'Draws'), over.filter((g) => g.result === '1/2-1/2').length], ...Object.entries(reasons).map(([k, v]) => [REASONS[k] || k, v])])}
        ${card(L('Cadences', 'Time controls'), Object.entries(tc).sort((a, b) => b[1] - a[1]).map(([k, v]) => [TC_LABELS[k] || k, v]))}
        ${card(L('Tournois', 'Tournaments'), [[L('Total', 'Total'), tournaments.length], [L('Inscriptions ouvertes', 'Open'), tournaments.filter((t) => t.status === 'open').length], [L('En cours', 'Running'), tournaments.filter((t) => t.status === 'running').length], [L('Terminés', 'Finished'), tournaments.filter((t) => t.status === 'over').length]])}
        ${card(L('Niveau', 'Level'), [[L('Elo moyen', 'Average Elo'), avg], ...top.map((x, i) => [`${i + 1}. ${escHtml(x.pseudo || '?')}`, x.elo || 600])])}
      </div>`;
    }
    if (adminSection === 'users') {
      const q = adminQuery.trim().toLowerCase();
      const idle = (x) => Math.floor((now - (x.lastSeen || x.createdAt || now)) / DAYMS);
      const list = players.filter((x) => !q || String(x.pseudo || '').toLowerCase().includes(q)).sort(adminSort === 'idle' ? (a, b) => idle(b) - idle(a) : (a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
      html += `<div class="players-tools"><input id="admin-search" class="profile-name-input" type="search" placeholder="${L('Chercher un pseudo', 'Search a nickname')}" value="${escHtml(adminQuery)}"></div><div class="ed-seg" style="margin-top:8px">${[['recent', L('Vus récemment', 'Recently seen')], ['idle', L('Plus inactifs d’abord', 'Most inactive first')]].map(([k, lab]) => `<button type="button" data-admin-sort="${k}" class="${adminSort === k ? 'on' : ''}">${lab}</button>`).join('')}</div><p id="admin-msg" class="ed-error" role="status"></p>
        <table class="tour-table admin-table"><tr><th>${L('Pseudo', 'Nickname')}</th><th>Elo</th><th>${L('Créé', 'Created')}</th><th>${L('Vu', 'Seen')}</th><th>${L('Inactif', 'Idle')}</th><th>${L('Parties', 'Games')}</th><th></th></tr>${list.map((x) => `<tr class="${x.banned ? 'banned' : ''}${idle(x) >= 365 ? ' inactive' : ''}"><td><a href="#" data-profile="${x.id}">${escHtml(x.pseudo || '?')}</a>${x.banned ? ` <small>(${L('suspendu', 'suspended')})</small>` : ''}</td><td>${x.elo || 600}</td><td>${x.createdAt ? new Date(x.createdAt).toLocaleDateString(LOCALE) : '–'}</td><td>${x.lastSeen ? new Date(x.lastSeen).toLocaleDateString(LOCALE) : '–'}</td><td class="${idle(x) >= 365 ? 'loss' : ''}">${idle(x)} ${L('j', 'd')}</td><td>${games.filter((g) => (g.players || []).includes(x.id)).length}</td><td class="admin-actions"><button class="mini" data-admin-ban="${x.id}">${x.banned ? L('Réactiver', 'Reinstate') : L('Suspendre', 'Suspend')}</button><button class="mini danger" data-admin-del="${x.id}">${L('Supprimer', 'Delete')}</button></td></tr>`).join('')}</table>`;
    }
    if (adminSection === 'email') {
      html += `<p class="level-help">${L(`L’administration est liée à <b>${escHtml(ON.getAdminEmail())}</b>. Tu peux la transmettre à une autre adresse, par exemple si tu crées un compte spécial pour l’administration. Ce compte-ci redeviendra alors un compte de joueur normal.`, `Administration is linked to <b>${escHtml(ON.getAdminEmail())}</b>. You can hand it over to another address, for example if you create a dedicated administration account. This account will then become a normal player account again.`)}</p>
        ${field('admin-email', L('Nouvelle adresse administrateur', 'New administrator address'), 'email', '', 'autocomplete="off"')}
        <button class="btn primary wide" data-admin="email">${L('Transmettre l’administration', 'Hand over administration')}</button>
        <p class="level-help">${L('Le nouveau compte devra se connecter et confirmer son adresse par e-mail pour accéder à l’administration.', 'The new account will have to sign in and confirm its address by e-mail to access administration.')}</p>
        <p id="admin-msg" class="ed-error" role="status"></p>`;
    }
    if (adminSection === 'tours') {
      html += `<p id="admin-msg" class="ed-error" role="status"></p><table class="tour-table admin-table"><tr><th>${L('Nom', 'Name')}</th><th>${L('État', 'Status')}</th><th>${L('Inscrits', 'Entrants')}</th><th>${L('Créé', 'Created')}</th><th></th></tr>${tournaments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((t) => `<tr><td>${escHtml(t.name || '?')}</td><td>${STATUS_LABELS[t.status] || t.status}</td><td>${(t.members || []).length}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString(LOCALE) : '–'}</td><td><button class="mini danger" data-admin-deltour="${t.id}">${L('Supprimer', 'Delete')}</button></td></tr>`).join('')}</table>`;
    }
    body.innerHTML = html;
  }
  $('admin-body').addEventListener('input', (e) => { if (e.target.id === 'admin-search') { adminQuery = e.target.value; const pos = e.target.selectionStart; renderAdmin(); const i = $('admin-search'); i.focus(); i.setSelectionRange(pos, pos); } });
  $('admin-body').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const msg = (t, ok) => { const m = $('admin-msg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--accent, #e9b949)' : ''; } };
    if (b.dataset.adminSection != null) { adminSection = b.dataset.adminSection || null; renderAdmin(); return; }
    if (b.dataset.admin === 'email') {
      const email = ($('admin-email').value || '').trim().toLowerCase();
      if (!email) { msg(L('Indique la nouvelle adresse.', 'Enter the new address.')); return; }
      if (email === ON.getAdminEmail()) { msg(L('C’est déjà l’adresse administrateur.', 'This is already the administrator address.')); return; }
      modal({ title: L('Transmettre l’administration ?', 'Hand over administration?'), text: L(`L’administration passera à ${email}. Ce compte perdra immédiatement ses droits d’administrateur.`, `Administration will move to ${email}. This account will lose its administrator rights immediately.`), actions: [
        { label: L('Transmettre', 'Hand over'), primary: true, onClick: async () => { try { await ON.setAdminEmail(email); toast(L(`Administration transmise à ${email}.`, `Administration handed over to ${email}.`)); show('home'); onUserChange(ON.user, ON.profile); } catch (err) { msg(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (b.dataset.adminSort) { adminSort = b.dataset.adminSort; renderAdmin(); return; }
    if (b.dataset.admin === 'reload') { adminCache = null; loadAdmin(); return; }
    if (b.dataset.admin === 'verify') { try { await ON.sendVerification(); msg(L('E-mail envoyé : clique sur le lien qu’il contient, puis sur « J’ai cliqué sur le lien ».', 'E-mail sent: click its link, then “I clicked the link”.'), true); } catch (err) { msg(ON.explain(err)); } return; }
    if (b.dataset.admin === 'checked') { try { const ok = await ON.refreshVerification(); if (ok) { renderAdmin(); } else msg(L('Adresse pas encore vérifiée.', 'Address not verified yet.')); } catch (err) { msg(ON.explain(err)); } return; }
    const find = (id) => adminCache.users.find((x) => x.id === id);
    if (b.dataset.adminBan) {
      const x = find(b.dataset.adminBan);
      try { await ON.adminSetBanned(x.id, !x.banned); x.banned = !x.banned; renderAdmin(); } catch (err) { msg(ON.explain(err)); }
      return;
    }
    if (b.dataset.adminDel) {
      const x = find(b.dataset.adminDel);
      modal({ title: L(`Supprimer le compte de ${x.pseudo} ?`, `Delete ${x.pseudo}’s account?`), text: L('Son profil, son pseudo, sa progression en ligne et ses invitations seront effacés. Ses parties restent dans l’historique de ses adversaires. Il ne pourra plus se reconnecter avec ce compte.', 'Their profile, nickname, online progress and invitations will be erased. Their games stay in their opponents’ history. They will not be able to sign in with this account again.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: async () => { try { await ON.adminDeleteUser(x.id); adminCache.users = adminCache.users.filter((y) => y.id !== x.id); renderAdmin(); toast(L('Compte supprimé.', 'Account deleted.')); } catch (err) { toast(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
      return;
    }
    if (b.dataset.adminDeltour) {
      const t = adminCache.tournaments.find((x) => x.id === b.dataset.adminDeltour);
      modal({ title: L(`Supprimer le tournoi « ${t.name} » ?`, `Delete the tournament “${t.name}”?`), text: L('Le tournoi disparaît des listes et de l’historique. Ses parties restent dans l’historique des joueurs.', 'The tournament disappears from the lists and history. Its games stay in the players’ history.'), actions: [
        { label: L('Supprimer', 'Delete'), primary: true, onClick: async () => { try { await ON.adminDeleteTournament(t.id); adminCache.tournaments = adminCache.tournaments.filter((y) => y.id !== t.id); renderAdmin(); } catch (err) { toast(ON.explain(err)); } } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ] });
    }
  });
  $('btn-admin').onclick = () => { returnTo = 'home'; adminSection = null; show('admin'); renderAdmin(); };
  $('btn-continue').onclick = () => {
    const saved = store.get('game', null);
    if (saved && saved.cfg) startGame(saved.cfg, saved.moves, saved.result, saved.flipped, saved.terrain, saved.weather);
  };
  $('btn-stats').onclick = () => { returnTo = 'home'; show('stats'); };
  $('btn-rules').onclick = () => { returnTo = 'home'; show('rules'); };
  $('btn-about').onclick = () => { returnTo = 'home'; show('about'); };
  $('btn-settings').onclick = () => { returnTo = 'home'; renderSettings(); show('settings'); };

