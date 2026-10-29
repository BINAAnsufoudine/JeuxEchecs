  /* ---------- En ligne : compte, progression sauvegardée, invitations et parties à distance ---------- */
  const ON = window.Online;
  const TC_LABELS = L({ unlim: '3 jours par coup', '7d': '3 jours par coup', '3d': '3 jours par coup', '1d': '1 jour par coup', pm60: '1 minute par coup', pm30: '30 secondes par coup', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' },
    { unlim: '3 days per move', '7d': '3 days per move', '3d': '3 days per move', '1d': '1 day per move', pm60: '1 minute per move', pm30: '30 seconds per move', '10m': '10 minutes', '5m': '5 minutes', '2m': '2 minutes', '1m': '1 minute' });
  const announced = new Set();
  let justSignedUp = false, progressDirty = false, progressRev = 0, progressPushing = false, inviteStop = null, gamesStop = null, onlineInvites = { in: [], out: [] }, onlineGames = [];
  const SKIP_SYNC = new Set(['lastScreen', 'onlineSession', 'onlineSynced', 'progressDirty', 'progressAt', 'progressEditAt', 'deviceId', 'lastOtb', 'lastTrainSection']);
  // toute modification de la progression sera envoyée au compte
  const rawSet = store.set.bind(store);
  // Progression modifiée mais pas encore envoyée : retenu sur l'appareil, pour être envoyé même après
  // une coupure de connexion ou une fermeture de l'appli (à la prochaine connexion)
  store.set = (key, value) => {
    rawSet(key, value);
    if (SKIP_SYNC.has(key)) return;
    progressDirty = true; progressRev++;
    if (!store.get('progressDirty', false)) rawSet('progressDirty', true);
    rawSet('progressEditAt', Date.now());
    // envoi rapide pour que les autres appareils du compte voient la même chose (écran Reprendre compris)
    clearTimeout(pushSoon); pushSoon = setTimeout(() => pushProgress(), 4000);
  };
  let pushSoon = null;
  const deviceId = store.get('deviceId', null) || (() => { const id = Math.random().toString(36).slice(2, 10); rawSet('deviceId', id); return id; })();
  progressDirty = store.get('progressDirty', false);
  function localProgress() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cavalier.') && !SKIP_SYNC.has(k.slice(9))) { try { data[k.slice(9)] = JSON.parse(localStorage.getItem(k)); } catch { /* ignoré */ } }
    }
    return data;
  }
  const hasProgress = (d) => !!(d && ((d.archive && d.archive.length) || (d.localArchive && d.localArchive.length) || (d.reviews && d.reviews.length) || (d.stats && Object.keys(d.stats).length) || (d.pzdone && Object.keys(d.pzdone).length) || (d.coach && d.coach.themes && Object.keys(d.coach.themes).length)));
  // Tournois en réel : jamais écrasés par une copie plus ancienne venue du compte ou d'un autre appareil ;
  // on garde, tournoi par tournoi, la version la plus récente. Renvoie vrai si l'appareil avait du plus récent.
  function mergeOtb(remote, local) {
    const byId = new Map((remote || []).map((t) => [t.id, t]));
    let newer = false;
    for (const t of local || []) { const r = byId.get(t.id); if (!r || (t.updatedAt || 0) > (r.updatedAt || 0)) { byId.set(t.id, t); newer = true; } }
    return { list: [...byId.values()].sort((a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id)).slice(0, 50), newer };
  }
  function replaceLocal(data, keepOtb = true) {
    const localOtb = keepOtb ? store.get('otb', []) : [];
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('cavalier.') && !SKIP_SYNC.has(k.slice(9))) localStorage.removeItem(k); }
    for (const [k, v] of Object.entries(data || {})) rawSet(k, v);
    if (!localOtb.length) return false;
    const gone = new Set([...(store.get('otbDeleted', []) || []), ...((data || {}).otbDeleted || [])]);
    const m = mergeOtb(((data || {}).otb || []).filter((t) => !gone.has(t.id)), localOtb.filter((t) => !gone.has(t.id)));
    rawSet('otb', m.list);
    return m.newer;
  }
  async function pushProgress() {
    if (!ON || !ON.user || !progressDirty || progressPushing) { renderSyncStatus(); return; }
    // on n'envoie que la progression qui appartient au compte connecté
    if (store.get('onlineSynced', null) !== ON.user.uid) { renderSyncStatus('local'); return; }
    if (!navigator.onLine) { renderSyncStatus('offline'); return; }
    // le drapeau n'est levé qu'une fois l'envoi confirmé par le serveur (hors connexion, l'envoi attend)
    progressPushing = true;
    renderSyncStatus('pending');
    const rev = progressRev;
    let failed = false;
    try {
      const at = Date.now();
      await ON.saveProgress(localProgress(), at, deviceId);
      rawSet('progressAt', at);
      if (rev === progressRev) { progressDirty = false; rawSet('progressDirty', false); }
    } catch {
      failed = true;
      renderSyncStatus('error');
    }
    progressPushing = false;
    if (!progressDirty) renderSyncStatus('synced');
    else {
      renderSyncStatus(failed ? 'error' : 'pending');
      clearTimeout(pushSoon);
      pushSoon = setTimeout(() => pushProgress(), failed ? 10000 : 1500);
    }
  }
  setInterval(pushProgress, 45000);
  window.addEventListener('online', () => pushProgress());
  window.addEventListener('offline', () => renderSyncStatus('offline'));
  setInterval(() => { if (ON && ON.user && document.visibilityState === 'visible') ON.presence(); }, 60000);
  window.addEventListener('pagehide', pushProgress);
  // Après connexion : récupère la progression du compte, ou propose d'importer celle de l'appareil
  // Progression enregistrée par un autre appareil du même compte : on la reprend ici si elle est plus récente
  let progressStop = null;
  function watchCloudProgress() {
    if (progressStop) progressStop();
    progressStop = ON.watchProgress(({ data, updatedAt, device }) => {
      if (!data || device === deviceId || updatedAt <= store.get('progressAt', 0)) return;
      if (store.get('onlineSynced', null) !== (ON.user && ON.user.uid)) return; // première connexion : gérée par syncAfterLogin
      // modifications locales plus récentes pas encore envoyées : elles l'emportent (elles partent juste après)
      if (progressDirty && store.get('progressEditAt', 0) > updatedAt) { pushProgress(); return; }
      const keptNewer = replaceLocal({ ...data, settings: store.get('settings', data.settings || {}) });
      rawSet('progressAt', updatedAt);
      progressDirty = false; rawSet('progressDirty', false);
      // des tournois en réel plus récents sur cet appareil : ils repartent vers le compte
      if (keptNewer) { progressDirty = true; rawSet('progressDirty', true); clearTimeout(pushSoon); pushSoon = setTimeout(() => pushProgress(), 1500); }
      refreshHome();
      const scr = document.body.dataset.screen;
      if (scr === 'otb') renderOtb();
      if (scr === 'welcome') renderWelcome();
      if (scr === 'profile') openProfile();
      if (scr === 'train') renderTrain();
    });
  }
  // Chaque compte garde ses propres données : la progression locale appartient au compte « onlineSynced »
  // (ou à un joueur sans compte si ce champ est vide) et n'est jamais donnée à un autre compte.
  function wipeLocalProgress() {
    replaceLocal({ settings: store.get('settings', {}) }, false);
    progressDirty = false; rawSet('progressDirty', false); rawSet('progressAt', 0); rawSet('progressEditAt', 0);
    rawSet('lastOtb', null); rawSet('lastTrainSection', null); rawSet('lastScreen', 'home'); // aucun écran de l'ancien compte ne se rouvre
  }
  // progression pas encore envoyée d'un compte (hors connexion) : mise de côté pour ce seul compte
  const backupKey = (uid) => `cavalierbackup.${uid}`;
  function backupFor(uid) { try { localStorage.setItem(backupKey(uid), JSON.stringify(localProgress())); } catch { /* stockage plein */ } }
  let syncingUid = null;
  async function syncAfterLogin(user, profile) {
    // l'événement de connexion peut arriver deux fois : une seule synchronisation à la fois par compte
    if (syncingUid === user.uid) return;
    syncingUid = user.uid;
    try { await syncAfterLoginNow(user, profile); } finally { syncingUid = null; }
  }
  async function syncAfterLoginNow(user, profile) {
    const owner = store.get('onlineSynced', null);
    if (owner && owner !== user.uid) {
      // données d'un autre compte sur cet appareil : mises de côté pour lui, jamais reprises par ce compte
      if (progressDirty) backupFor(owner);
      wipeLocalProgress(); rawSet('onlineSynced', null);
    }
    let backup = null;
    try { backup = JSON.parse(localStorage.getItem(backupKey(user.uid)) || 'null'); } catch { backup = null; }
    if (backup) {
      // progression de ce compte restée sur l'appareil après une déconnexion hors ligne : on la renvoie
      localStorage.removeItem(backupKey(user.uid));
      replaceLocal({ ...backup, settings: store.get('settings', backup.settings || {}) });
      rawSet('onlineSynced', user.uid); rawSet('progressEditAt', Date.now());
      progressDirty = true; await pushProgress();
      location.reload();
      return;
    }
    const local = localProgress();
    let cloud = null;
    try { cloud = await ON.loadProgress(); } catch { cloud = null; }
    const synced = store.get('onlineSynced', null) === user.uid;
    const name = profile && profile.pseudo;
    if (name) { const p = playerProfile(); p.name = name; p.nameAsked = true; store.set('player', p); }
    // progression faite hors connexion sur cet appareil : envoyée maintenant
    if (synced && cloud) { if (progressDirty) pushProgress(); refreshHome(); return; }
    if (!hasProgress(cloud) && hasProgress(local)) {
      modal({ title: L('Garder ta progression ?', 'Keep your progress?'),
        text: L('Cet appareil contient déjà une progression (parties, problèmes, niveaux). Veux-tu l\'importer dans ton compte ?', 'This device already holds progress (games, puzzles, levels). Do you want to import it into your account?'),
        actions: [
          { label: L('Importer ma progression', 'Import my progress'), primary: true, onClick: async () => { rawSet('onlineSynced', user.uid); progressDirty = true; await pushProgress(); toast(L('Progression importée dans ton compte.', 'Progress imported into your account.')); } },
          { label: L('Repartir de zéro', 'Start from scratch'), ghost: true, onClick: async () => { const keep = { settings: store.get('settings', {}), player: store.get('player', {}) }; replaceLocal(keep, false); rawSet('onlineSynced', user.uid); progressDirty = true; await pushProgress(); location.reload(); } },
        ] });
      return;
    }
    if (hasProgress(cloud) && !synced) {
      // la progression du compte remplace celle de l'appareil
      replaceLocal({ ...cloud, settings: store.get('settings', cloud.settings || {}) });
      rawSet('onlineSynced', user.uid);
      if (name) { const p = playerProfile(); p.name = name; rawSet('player', p); }
      location.reload();
      return;
    }
    rawSet('onlineSynced', user.uid);
    progressDirty = true; pushProgress();
    refreshHome();
  }
  async function onUserChange(user, profile) {
    // session terminée sans passer par « Se déconnecter » (session expirée, compte suspendu…) : les données
    // du compte quittent aussi l'appareil (ce qui n'a pas pu être envoyé est gardé pour ce seul compte)
    const owner = store.get('onlineSynced', null);
    if (!user && owner) {
      if (progressDirty) backupFor(owner);
      wipeLocalProgress(); rawSet('onlineSynced', null);
      // on recharge pour vider aussi tout ce qui est en mémoire (partie en ligne affichée, tournois partagés, club…)
      location.reload();
      return;
    }
    rawSet('onlineSession', !!user);
    renderSyncStatus();
    clearTimeout(pushSoon); // un envoi prévu pour l'ancien compte ne part pas vers le nouveau
    if (user) await ON.loadAdminEmail();
    // compte suspendu par l'administrateur : déconnexion
    if (user && profile && profile.banned) {
      ON.signOut();
      modal({ title: L('Compte suspendu', 'Account suspended'), text: L('Ce compte a été suspendu par l’administrateur. Tu peux continuer à jouer sur cet appareil sans compte.', 'This account has been suspended by the administrator. You can keep playing on this device without an account.'), actions: [{ label: 'OK', primary: true }] });
      return;
    }
    // compte administrateur : pas de jeu, écran d'administration
    const admin = !!(user && ON.isAdminEmail());
    setAdminMode(admin);
    if (admin) {
      adminCache = null; adminSection = null;
      $('btn-account').textContent = L('Mon compte', 'My account');
      closeModal(); returnTo = 'home'; show('admin'); renderAdmin();
      ON.markAdmin();
      return;
    }
    // ancien compte administrateur redevenu joueur : il réapparaît dans la liste des joueurs
    if (user && profile && profile.admin) ON.markAdmin(false);
    $('btn-account').textContent = user ? L('Mon compte', 'My account') : L('Se connecter', 'Sign in');
    if (inviteStop) { inviteStop(); inviteStop = null; }
    if (gamesStop) { gamesStop(); gamesStop = null; }
    if (user) {
      syncAfterLogin(user, profile).finally(() => { watchCloudProgress(); renderSyncStatus(); });
      startTourWatch();
      ON.presence();
      let known = null;
      inviteStop = ON.watchInvites((all) => {
        onlineInvites = all;
        const ids = all.in.map((i) => i.id);
        if (known) for (const inv of all.in) if (!known.includes(inv.id)) toast(L(`${inv.fromName} t'invite à une partie (${TC_LABELS[inv.tc]}).`, `${inv.fromName} invites you to a game (${TC_LABELS[inv.tc]}).`));
        known = ids;
        updateOnlineBadge();
        if (document.body.dataset.screen === 'welcome') renderWelcome();
        if (document.body.dataset.screen === 'online') renderOnline();
      });
      gamesStop = ON.watchGames((games) => {
        // parties en différé : prévenir quand l'adversaire a joué dans une autre partie que celle affichée
        const me = user.uid, prev = new Map(onlineGames.map((g) => [g.id, g.moves.length]));
        for (const g of games) {
          const was = prev.get(g.id), myTurn = g.status === 'active' && (g.moves.length % 2 === 0) === (g.white === me);
          const shown = cfg && cfg.mode === 'online' && cfg.online && cfg.online.id === g.id;
          if (was != null && g.moves.length > was && myTurn && !shown) toast(L(`${g.white === me ? g.blackName : g.whiteName} a joué : à toi de jouer.`, `${g.white === me ? g.blackName : g.whiteName} has moved: your turn.`));
        }
        onlineGames = games;
        renderOnlineSwitch();
        for (const g of games) {
          if (g.status !== 'active') continue;
          const side = g.moves.length % 2 === 0 ? 'w' : 'b', left = onlineTimeLeft(g, side);
          if (left != null && left <= 0) ON.endGame(g.id, side === 'w' ? '0-1' : '1-0', 'temps');
        }
        updateOnlineBadge();
        if (document.body.dataset.screen === 'online') renderOnline();
        if (document.body.dataset.screen === 'welcome') renderWelcome();
        // une invitation que j'ai envoyée vient d'être acceptée : la partie s'ouvre
        const fresh = games.find((g) => !g.tournamentId && g.status === 'active' && !g.moves.length && g.createdAt > Date.now() - 20000 && !(cfg && cfg.online && cfg.online.id === g.id));
        for (const g of games) if (g.tournamentId && g.status === 'active' && !g.moves.length && g.createdAt > Date.now() - 20000 && !announced.has(g.id)) {
          announced.add(g.id);
          toast(L(`${g.tournamentName} : ta partie de la ronde ${g.round} est prête.`, `${g.tournamentName}: your round ${g.round} game is ready.`));
        }
        if (fresh && document.body.dataset.screen === 'online') openOnlineGame(fresh);
      });
    } else { onlineInvites = { in: [], out: [] }; onlineGames = []; updateOnlineBadge(); stopTourWatch(); if (progressStop) { progressStop(); progressStop = null; } }
    if (document.body.dataset.screen === 'account') renderAccount();
    if (document.body.dataset.screen === 'online') renderOnline();
  }
  // Pendant une partie en ligne : les autres parties en cours, pour passer de l'une à l'autre
  function renderOnlineSwitch() {
    const box = $('online-switch');
    if (!box) return;
    const cur = cfg && cfg.mode === 'online' && cfg.online ? cfg.online.id : null;
    const me = ON && ON.user && ON.user.uid;
    const others = cur && me ? onlineGames.filter((g) => g.status === 'active' && g.id !== cur) : [];
    box.hidden = !others.length;
    if (!others.length) return;
    const mine = (g) => (g.moves.length % 2 === 0) === (g.white === me);
    others.sort((a, b) => mine(b) - mine(a) || b.lastMoveAt - a.lastMoveAt);
    box.innerHTML = `<b>${L('Mes autres parties', 'My other games')} (${others.length})</b>${others.map((g) => `<button class="btn switch-game${mine(g) ? ' hot' : ''}" type="button" data-switch-game="${g.id}"><span>${L('contre', 'vs')} ${escHtml(g.white === me ? g.blackName : g.whiteName)}</span><small>${mine(g) ? L('à toi de jouer', 'your move') : L('en attente', 'waiting')} · ${TC_LABELS[g.tc] || ''}</small></button>`).join('')}`;
  }
  $('online-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-switch-game]'); if (!b) return;
    const g = onlineGames.find((x) => x.id === b.dataset.switchGame);
    if (g) openOnlineGame(g);
  });
