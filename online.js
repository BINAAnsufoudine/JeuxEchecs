/* Cavalier — en ligne (Firebase) : comptes par e-mail et mot de passe, progression sauvegardée,
   invitations entre joueurs et parties à distance avec pendule.
   Le SDK Firebase n'est chargé que lorsqu'on en a besoin (première connexion ou compte déjà ouvert). */
window.Online = (function () {
  'use strict';
  const CONFIG = {
    apiKey: 'AIzaSyCJtFYXPTe0lvPSgVt4kBJxC550VpEWS74',
    authDomain: 'jeuechecs-c1731.firebaseapp.com',
    projectId: 'jeuechecs-c1731',
    storageBucket: 'jeuechecs-c1731.firebasestorage.app',
    messagingSenderId: '1015125085871',
    appId: '1:1015125085871:web:908d4ed6761c5858338e5a',
  };
  const SDK = 'https://www.gstatic.com/firebasejs/13.0.0/';
  // Cadences : durée totale par joueur (minutes) ou délai par coup (jours) ; « unlim » : sans limite
  const TIME_CONTROLS = {
    unlim: { ms: 0 }, '3d': { perMove: 3 * 86400000 }, '1d': { perMove: 86400000 }, pm60: { perMove: 60000 }, pm30: { perMove: 30000 },
    '10m': { ms: 600000 }, '5m': { ms: 300000 }, '2m': { ms: 120000 }, '1m': { ms: 60000 },
  };
  let fb = null, loading = null, user = null, profile = null;
  const listeners = new Set();

  function load() {
    if (fb) return Promise.resolve(fb);
    if (!loading) loading = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')])
      .then(([A, Au, F]) => {
        const app = A.initializeApp(CONFIG);
        const auth = Au.getAuth(app);
        auth.languageCode = window.LANG === 'fr' ? 'fr' : 'en';
        fb = { ...Au, ...F, auth, db: F.getFirestore(app) };
        Au.onAuthStateChanged(auth, async (u) => {
          user = u; profile = null;
          // juste après une inscription, le profil peut ne pas encore être écrit : on réessaie un peu plus tard
          for (let i = 0; u && i < 4 && !profile; i++) {
            try { const s = await F.getDoc(F.doc(fb.db, 'users', u.uid)); if (s.exists()) profile = s.data(); } catch { /* hors ligne */ }
            if (!profile) await new Promise((r) => setTimeout(r, 1200));
          }
          if (user !== u) return;
          listeners.forEach((f) => { try { f(user, profile); } catch { /* écouteur fautif ignoré */ } });
        });
        return fb;
      })
      .catch((e) => { loading = null; throw e; });
    return loading;
  }
  const onUser = (f) => { listeners.add(f); return () => listeners.delete(f); };
  const lower = (p) => String(p || '').trim().toLowerCase();
  // Messages d'erreur Firebase en clair
  function explain(e) {
    const code = (e && e.code) || '';
    const L = window.L;
    const map = {
      'auth/email-already-in-use': L('Cette adresse e-mail a déjà un compte.', 'This e-mail address already has an account.'),
      'auth/invalid-email': L('Adresse e-mail invalide.', 'Invalid e-mail address.'),
      'auth/weak-password': L('Mot de passe trop faible : 6 caractères au minimum.', 'Password too weak: at least 6 characters.'),
      'auth/invalid-credential': L('E-mail ou mot de passe incorrect.', 'Wrong e-mail or password.'),
      'auth/wrong-password': L('Mot de passe incorrect.', 'Wrong password.'),
      'auth/user-not-found': L('Aucun compte avec cette adresse e-mail.', 'No account with this e-mail address.'),
      'auth/too-many-requests': L('Trop d\'essais : réessaie dans quelques minutes.', 'Too many attempts: try again in a few minutes.'),
      'auth/network-request-failed': L('Pas de connexion internet.', 'No internet connection.'),
      'auth/configuration-not-found': L('Les comptes ne sont pas encore activés sur le serveur.', 'Accounts are not enabled on the server yet.'),
      'auth/operation-not-allowed': L('Les comptes ne sont pas encore activés sur le serveur.', 'Accounts are not enabled on the server yet.'),
      'auth/requires-recent-login': L('Reconnecte-toi puis réessaie.', 'Sign in again, then try again.'),
      'permission-denied': L('Accès refusé par le serveur (règles de sécurité).', 'Access denied by the server (security rules).'),
      'bad-email': L('Adresse e-mail invalide.', 'Invalid e-mail address.'),
      'pseudo-taken': L('Ce pseudo est déjà pris.', 'This nickname is already taken.'),
      'pseudo-empty': L('Choisis un pseudo.', 'Choose a nickname.'),
      'player-unknown': L('Aucun joueur avec ce pseudo.', 'No player with this nickname.'),
      'self-invite': L('Tu ne peux pas t\'inviter toi-même.', 'You cannot invite yourself.'),
      'tournament-unknown': L('Aucun tournoi avec ce code.', 'No tournament with this code.'),
      'tournament-started': L('Ce tournoi a déjà commencé.', 'This tournament has already started.'),
      'tournament-team': L('C\'est un tournoi par équipe : crée une équipe ou demande à un capitaine de t\'ajouter.', 'This is a team tournament: create a team or ask a captain to add you.'),
      'already-in-team': L('Ce joueur fait déjà partie d\'une équipe.', 'This player is already in a team.'),
      'not-captain': L('Seul le capitaine peut ajouter des coéquipiers.', 'Only the captain can add teammates.'),
      'team-full': L('L\'équipe est complète.', 'The team is full.'),
      'not-owner': L('Seul l\'organisateur peut lancer le tournoi.', 'Only the organiser can start the tournament.'),
      'too-few': L('Il faut au moins deux participants.', 'At least two participants are needed.'),
      'deadline-passed': L('Les inscriptions à ce tournoi sont closes.', 'Registration for this tournament is closed.'),
    };
    return map[code] || (e && e.message) || L('Erreur inconnue.', 'Unknown error.');
  }
  const fail = (code) => { const e = new Error(code); e.code = code; throw e; };

  /* ----- Comptes ----- */
  async function signUp(pseudo, email, password, elo) {
    const f = await load();
    const name = String(pseudo || '').trim().slice(0, 24);
    if (!name) fail('pseudo-empty');
    const cred = await f.createUserWithEmailAndPassword(f.auth, email.trim(), password);
    const uid = cred.user.uid;
    try {
      await f.runTransaction(f.db, async (tx) => {
        const ref = f.doc(f.db, 'pseudos', lower(name));
        if ((await tx.get(ref)).exists()) fail('pseudo-taken');
        tx.set(ref, { uid });
        tx.set(f.doc(f.db, 'users', uid), { pseudo: name, pseudoLower: lower(name), elo: elo || 600, createdAt: Date.now() });
      });
    } catch (e) { try { await cred.user.delete(); } catch { /* compte laissé sans profil */ } throw e; }
    profile = { pseudo: name, pseudoLower: lower(name), elo: elo || 600 };
    listeners.forEach((fn) => fn(cred.user, profile));
    return profile;
  }
  async function signIn(email, password) { const f = await load(); await f.signInWithEmailAndPassword(f.auth, email.trim(), password); }
  async function resetPassword(email) { const f = await load(); await f.sendPasswordResetEmail(f.auth, email.trim()); }
  async function signOut() { const f = await load(); await f.signOut(f.auth); }
  async function changePseudo(pseudo) {
    const f = await load();
    const name = String(pseudo || '').trim().slice(0, 24);
    if (!name) fail('pseudo-empty');
    const uid = f.auth.currentUser.uid, old = profile && profile.pseudoLower;
    await f.runTransaction(f.db, async (tx) => {
      const ref = f.doc(f.db, 'pseudos', lower(name));
      const cur = await tx.get(ref);
      if (cur.exists() && cur.data().uid !== uid) fail('pseudo-taken');
      tx.set(ref, { uid });
      if (old && old !== lower(name)) tx.delete(f.doc(f.db, 'pseudos', old));
      tx.update(f.doc(f.db, 'users', uid), { pseudo: name, pseudoLower: lower(name) });
    });
    profile = { ...(profile || {}), pseudo: name, pseudoLower: lower(name) };
    return profile;
  }
  async function changePassword(current, next) {
    const f = await load();
    const u = f.auth.currentUser;
    await f.reauthenticateWithCredential(u, f.EmailAuthProvider.credential(u.email, current));
    await f.updatePassword(u, next);
  }
  // Suppression du compte : profil, pseudo, progression, invitations, puis le compte lui-même.
  // Les parties déjà jouées restent dans l'historique de leurs adversaires.
  async function deleteAccount(password) {
    const f = await load();
    const u = f.auth.currentUser;
    await f.reauthenticateWithCredential(u, f.EmailAuthProvider.credential(u.email, password));
    for (const field of ['from', 'to']) {
      const snap = await f.getDocs(f.query(f.collection(f.db, 'invites'), f.where(field, '==', u.uid)));
      for (const d of snap.docs) { try { await f.deleteDoc(d.ref); } catch { /* déjà supprimée */ } }
    }
    try { await f.deleteDoc(f.doc(f.db, 'users', u.uid, 'private', 'progress')); } catch { /* aucune */ }
    if (profile && profile.pseudoLower) { try { await f.deleteDoc(f.doc(f.db, 'pseudos', profile.pseudoLower)); } catch { /* aucun */ } }
    await f.deleteDoc(f.doc(f.db, 'users', u.uid));
    await f.deleteUser(u);
  }
  /* ----- Administration (réservée à l'adresse du développeur, vérifiée) ----- */
  // adresse administrateur : enregistrée sur le serveur (config/admin), celle du développeur par défaut
  let adminEmail = 'ansuf.dev@gmail.com';
  async function loadAdminEmail() {
    const f = await load();
    try { const s = await f.getDoc(f.doc(f.db, 'config', 'admin')); if (s.exists() && s.data().email) adminEmail = s.data().email; } catch { /* valeur par défaut */ }
    return adminEmail;
  }
  async function setAdminEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) fail('bad-email');
    const f = await load();
    await f.setDoc(f.doc(f.db, 'config', 'admin'), { email: e, changedAt: Date.now(), changedBy: user.email });
    adminEmail = e;
  }
  const getAdminEmail = () => adminEmail;
  const isAdminEmail = () => !!(user && String(user.email || '').toLowerCase() === adminEmail);
  const isAdmin = () => isAdminEmail() && user.emailVerified;
  async function sendVerification() { const f = await load(); await f.sendEmailVerification(f.auth.currentUser); }
  async function refreshVerification() { const f = await load(); await f.auth.currentUser.reload(); await f.auth.currentUser.getIdToken(true); user = f.auth.currentUser; return user.emailVerified; }
  async function adminData() {
    const f = await load();
    const [u, g, t] = await Promise.all(['users', 'games', 'tournaments'].map((c) => f.getDocs(f.collection(f.db, c))));
    const rows = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { users: rows(u), games: rows(g), tournaments: rows(t) };
  }
  async function adminSetBanned(uid, banned) { const f = await load(); await f.updateDoc(f.doc(f.db, 'users', uid), { banned: !!banned }); }
  async function adminDeleteUser(uid) {
    const f = await load();
    const u = await f.getDoc(f.doc(f.db, 'users', uid)), data = u.exists() ? u.data() : {};
    for (const field of ['from', 'to']) {
      const snap = await f.getDocs(f.query(f.collection(f.db, 'invites'), f.where(field, '==', uid)));
      for (const d of snap.docs) { try { await f.deleteDoc(d.ref); } catch { /* déjà supprimée */ } }
    }
    try { await f.deleteDoc(f.doc(f.db, 'users', uid, 'private', 'progress')); } catch { /* aucune */ }
    if (data.pseudoLower) { try { await f.deleteDoc(f.doc(f.db, 'pseudos', data.pseudoLower)); } catch { /* aucun */ } }
    await f.deleteDoc(f.doc(f.db, 'users', uid));
  }
  // le profil de l'admin est marqué pour ne pas apparaître parmi les joueurs
  async function markAdmin(on = true) { const f = await load(); try { await f.updateDoc(f.doc(f.db, 'users', user.uid), { admin: on }); if (profile) profile.admin = on; } catch { /* pas de profil */ } }
  async function adminDeleteTournament(id) { const f = await load(); await f.deleteDoc(f.doc(f.db, 'tournaments', id)); }
  async function setPhoto(photo) {
    if (!user) return;
    const f = await load();
    await f.updateDoc(f.doc(f.db, 'users', user.uid), { photo: photo || null });
    if (profile) profile.photo = photo || null;
  }
  async function getPhotos(uids) {
    const f = await load(), out = {};
    await Promise.all(uids.map(async (u) => { try { const s = await f.getDoc(f.doc(f.db, 'users', u)); out[u] = s.exists() ? s.data().photo || null : null; } catch { out[u] = null; } }));
    return out;
  }
  // Profil public : résumé des statistiques et grades, visible des autres joueurs
  async function publishSummary(summary) {
    if (!user) return;
    const f = await load();
    try { await f.updateDoc(f.doc(f.db, 'users', user.uid), { summary, summaryAt: Date.now() }); } catch { /* hors ligne */ }
  }
  async function getProfile(uid) {
    const f = await load();
    const s = await f.getDoc(f.doc(f.db, 'users', uid));
    return s.exists() ? { uid, ...s.data() } : null;
  }
  async function myTournaments(uid) {
    const f = await load();
    const snap = await f.getDocs(f.query(f.collection(f.db, 'tournaments'), f.where('members', 'array-contains', uid || user.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  // Toutes mes parties en ligne (amicales et de tournoi)
  async function myGames() {
    const f = await load();
    const snap = await f.getDocs(f.query(f.collection(f.db, 'games'), f.where('players', 'array-contains', user.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async function setElo(elo) {
    if (!user) return;
    const f = await load();
    try { await f.updateDoc(f.doc(f.db, 'users', user.uid), { elo }); if (profile) profile.elo = elo; } catch { /* hors ligne */ }
  }

  /* ----- Progression : copie de toutes les données « cavalier.* » de l'appareil ----- */
  async function saveProgress(data) {
    if (!user) return;
    const f = await load();
    await f.setDoc(f.doc(f.db, 'users', user.uid, 'private', 'progress'), { json: JSON.stringify(data), updatedAt: Date.now() });
  }
  async function loadProgress() {
    if (!user) return null;
    const f = await load();
    const s = await f.getDoc(f.doc(f.db, 'users', user.uid, 'private', 'progress'));
    if (!s.exists()) return null;
    try { return JSON.parse(s.data().json); } catch { return null; }
  }

  /* ----- Invitations ----- */
  async function findPlayer(pseudo) {
    const f = await load();
    const s = await f.getDoc(f.doc(f.db, 'pseudos', lower(pseudo)));
    if (!s.exists()) fail('player-unknown');
    const uid = s.data().uid;
    const u = await f.getDoc(f.doc(f.db, 'users', uid));
    return { uid, ...(u.exists() ? u.data() : { pseudo }) };
  }
  // Présence : date de dernière visite, pour savoir qui est connecté
  async function presence() {
    if (!user) return;
    const f = await load();
    try { await f.updateDoc(f.doc(f.db, 'users', user.uid), { lastSeen: Date.now() }); } catch { /* hors ligne */ }
  }
  // Liste des joueurs, les plus récemment connectés d'abord (sans les photos, trop lourdes pour une liste)
  async function listPlayers() {
    const f = await load();
    const snap = await f.getDocs(f.query(f.collection(f.db, 'users'), f.orderBy('lastSeen', 'desc'), f.limit(150)));
    return snap.docs.filter((d) => !d.data().admin && !d.data().banned).map((d) => { const u = d.data(); return { uid: d.id, pseudo: u.pseudo, elo: u.elo || 600, lastSeen: u.lastSeen || 0, summary: u.summary ? { level: u.summary.level, title: u.summary.title } : null }; });
  }
  // Chat coupé avec certains joueurs
  async function setMuted(list) {
    const f = await load();
    await f.updateDoc(f.doc(f.db, 'users', user.uid), { muted: list });
    if (profile) profile.muted = list;
  }
  async function sendChat(gameId, text) {
    const f = await load();
    const msg = { from: user.uid, name: (profile && profile.pseudo) || '?', text: String(text).trim().slice(0, 200), at: Date.now() };
    if (!msg.text) return;
    await f.updateDoc(f.doc(f.db, 'games', gameId), { chat: f.arrayUnion(msg) });
  }
  async function invite(pseudo, tc, target) {
    const f = await load();
    const other = target || await findPlayer(pseudo);
    if (other.uid === user.uid) fail('self-invite');
    await f.addDoc(f.collection(f.db, 'invites'), {
      from: user.uid, fromName: profile.pseudo, fromElo: profile.elo || 600,
      to: other.uid, toName: other.pseudo, toElo: other.elo || 600,
      tc, status: 'pending', createdAt: Date.now(),
    });
    return other;
  }
  function watchInvites(cb) {
    let stop = [];
    load().then((f) => {
      const all = { in: [], out: [] };
      const sub = (field, key) => f.onSnapshot(f.query(f.collection(f.db, 'invites'), f.where(field, '==', user.uid)),
        (snap) => { all[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); cb(all); }, () => cb(all));
      stop = [sub('to', 'in'), sub('from', 'out')];
    });
    return () => stop.forEach((s) => s());
  }
  async function answerInvite(inv, accept) {
    const f = await load();
    const ref = f.doc(f.db, 'invites', inv.id);
    if (!accept) { await f.deleteDoc(ref); return null; }
    // couleurs tirées au sort
    const fromWhite = Math.random() < 0.5;
    const w = fromWhite ? { uid: inv.from, name: inv.fromName, elo: inv.fromElo } : { uid: inv.to, name: inv.toName, elo: inv.toElo };
    const b = fromWhite ? { uid: inv.to, name: inv.toName, elo: inv.toElo } : { uid: inv.from, name: inv.fromName, elo: inv.fromElo };
    const tc = TIME_CONTROLS[inv.tc] || TIME_CONTROLS.unlim, now = Date.now();
    const game = await f.addDoc(f.collection(f.db, 'games'), {
      players: [w.uid, b.uid], white: w.uid, black: b.uid, whiteName: w.name, blackName: b.name, whiteElo: w.elo, blackElo: b.elo,
      tc: inv.tc, clock: tc.ms ? { w: tc.ms, b: tc.ms } : null, moves: [], lastMoveAt: now, status: 'active', result: null, reason: null,
      seen: { [w.uid]: now, [b.uid]: now }, createdAt: now,
    });
    await f.deleteDoc(ref);
    return game.id;
  }

  /* ----- Parties ----- */
  function watchGames(cb) {
    let stop = () => {};
    load().then((f) => {
      stop = f.onSnapshot(f.query(f.collection(f.db, 'games'), f.where('players', 'array-contains', user.uid)),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
    });
    return () => stop();
  }
  function watchGame(id, cb) {
    let stop = () => {};
    load().then((f) => { stop = f.onSnapshot(f.doc(f.db, 'games', id), (s) => { if (s.exists()) cb({ id: s.id, ...s.data() }); }); });
    return () => stop();
  }
  // Coup joué : la pendule du joueur est décomptée du temps écoulé depuis le coup précédent
  async function playMove(id, uci, ply, over) {
    const f = await load();
    await f.runTransaction(f.db, async (tx) => {
      const ref = f.doc(f.db, 'games', id), s = await tx.get(ref);
      const g = s.data();
      if (!g || g.status !== 'active' || g.moves.length !== ply) return;
      const side = ply % 2 === 0 ? 'w' : 'b', now = Date.now(), upd = { moves: [...g.moves, uci], lastMoveAt: now, [`seen.${user.uid}`]: now };
      if (g.clock) upd.clock = { ...g.clock, [side]: Math.max(0, g.clock[side] - (g.moves.length ? now - g.lastMoveAt : 0)) };
      if (over) Object.assign(upd, { status: 'over', result: over.result, reason: over.reason });
      tx.update(ref, upd);
    });
  }
  async function endGame(id, result, reason) {
    const f = await load();
    try { await f.updateDoc(f.doc(f.db, 'games', id), { status: 'over', result, reason }); } catch { /* déjà terminée */ }
  }
  async function heartbeat(id) {
    if (!user) return;
    const f = await load();
    try { await f.updateDoc(f.doc(f.db, 'games', id), { [`seen.${user.uid}`]: Date.now() }); } catch { /* hors ligne */ }
  }


  /* ----- Tournois : individuels ou par équipe, système suisse ou toutes rondes ----- */
  // Un participant est un joueur (tournoi individuel) ou une équipe (tournoi par équipe).
  const code6 = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  async function createTournament(opts) {
    const f = await load();
    const me = user.uid, now = Date.now();
    const t = {
      name: String(opts.name || '').trim().slice(0, 40) || 'Tournoi', type: opts.type === 'team' ? 'team' : 'solo', format: opts.format === 'rr' ? 'rr' : 'swiss',
      tc: opts.tc || '10m', rounds: Math.max(1, Math.min(11, opts.rounds | 0 || 5)), teamSize: Math.max(2, Math.min(4, opts.teamSize | 0 || 4)),
      code: code6(), owner: me, ownerName: profile.pseudo, status: 'open', createdAt: now,
      // date limite d'inscription : le tournoi démarre tout seul à ce moment-là
      deadline: Number(opts.deadline) > now ? Number(opts.deadline) : now + 86400000,
      members: [me], names: { [me]: profile.pseudo }, elos: { [me]: profile.elo || 600 },
      players: [], teams: [], round: 0, pairings: {}, scores: {}, met: {},
      // par équipe : « auto » = équipes formées au départ selon le niveau ; « made » = équipes déjà faites
      teamMode: opts.teamMode === 'made' ? 'made' : 'auto',
    };
    if (t.type === 'solo' || t.teamMode === 'auto') t.players = [me];
    const ref = await f.addDoc(f.collection(f.db, 'tournaments'), t);
    return { id: ref.id, ...t };
  }
  async function findTournament(code) {
    const f = await load();
    const snap = await f.getDocs(f.query(f.collection(f.db, 'tournaments'), f.where('code', '==', String(code || '').trim().toUpperCase())));
    if (snap.empty) fail('tournament-unknown');
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  // Modification sûre d'un tournoi : relit le document et applique la fonction dans une transaction
  async function editTournament(id, fn) {
    const f = await load();
    return f.runTransaction(f.db, async (tx) => {
      const ref = f.doc(f.db, 'tournaments', id), s = await tx.get(ref);
      if (!s.exists()) fail('tournament-unknown');
      const t = { id, ...s.data() };
      const upd = await fn(t, tx, f);
      if (upd) tx.update(ref, upd);
      return { ...t, ...(upd || {}) };
    });
  }
  const meInfo = () => ({ [`names.${user.uid}`]: profile.pseudo, [`elos.${user.uid}`]: profile.elo || 600 });
  function joinTournament(id) {
    return editTournament(id, (t) => {
      if (t.status !== 'open') fail('tournament-started');
      if (t.deadline && Date.now() > t.deadline) fail('deadline-passed');
      if (t.type !== 'solo' && t.teamMode !== 'auto') fail('tournament-team');
      if (t.players.includes(user.uid)) return null;
      return { players: [...t.players, user.uid], members: [...new Set([...t.members, user.uid])], ...meInfo() };
    });
  }
  function leaveTournament(id) {
    return editTournament(id, (t) => {
      if (t.status !== 'open') fail('tournament-started');
      const teams = t.teams.map((tm) => ({ ...tm, members: tm.members.filter((u) => u !== user.uid) })).filter((tm) => tm.members.length && tm.captain !== user.uid);
      return { players: t.players.filter((u) => u !== user.uid), members: t.members.filter((u) => u !== user.uid || u === t.owner), teams };
    });
  }
  // Équipe : le capitaine la crée, puis ajoute ses coéquipiers par leur pseudo
  function createTeam(id, name) {
    return editTournament(id, (t) => {
      if (t.status !== 'open') fail('tournament-started');
      if (t.teams.some((tm) => tm.members.includes(user.uid))) fail('already-in-team');
      const team = { id: code6(), name: String(name || '').trim().slice(0, 30) || profile.pseudo, captain: user.uid, members: [user.uid] };
      return { teams: [...t.teams, team], members: [...new Set([...t.members, user.uid])], ...meInfo() };
    });
  }
  async function addTeammate(id, teamId, pseudo) {
    const other = await findPlayer(pseudo);
    return editTournament(id, (t) => {
      if (t.status !== 'open') fail('tournament-started');
      const team = t.teams.find((tm) => tm.id === teamId);
      if (!team || team.captain !== user.uid) fail('not-captain');
      if (team.members.length >= t.teamSize) fail('team-full');
      if (t.teams.some((tm) => tm.members.includes(other.uid))) fail('already-in-team');
      const teams = t.teams.map((tm) => (tm.id === teamId ? { ...tm, members: [...tm.members, other.uid] } : tm));
      return { teams, members: [...new Set([...t.members, other.uid])], [`names.${other.uid}`]: other.pseudo, [`elos.${other.uid}`]: other.elo || 600 };
    });
  }
  // Participants et appariements d'une ronde
  const participants = (t) => (t.type === 'team' ? t.teams.map((tm) => tm.id) : t.players);
  function pairRound(t, r) {
    const ids = participants(t);
    if (t.format === 'rr') {
      // toutes rondes : méthode du cercle
      const list = ids.length % 2 ? [...ids, null] : [...ids], n = list.length, out = [];
      const rest = list.slice(1), k = (r - 1) % Math.max(1, n - 1);
      const rot = [list[0], ...rest.slice(k), ...rest.slice(0, k)];
      for (let i = 0; i < n / 2; i++) { const a = rot[i], b = rot[n - 1 - i]; out.push(r % 2 ? [a, b] : [b, a]); }
      return out;
    }
    // suisse : par points (puis Elo), sans rejouer le même adversaire ; le dernier sans adversaire est exempt
    const score = (x) => t.scores[x] || 0;
    const rating = (x) => (t.type === 'team' ? (t.teams.find((tm) => tm.id === x) || {}).elo || 0 : t.elos[x] || 600);
    const order = [...ids].sort((a, b) => score(b) - score(a) || rating(b) - rating(a));
    const out = [], used = new Set();
    for (const a of order) {
      if (used.has(a)) continue;
      used.add(a);
      const b = order.find((x) => !used.has(x) && !(t.met[a] || []).includes(x)) || order.find((x) => !used.has(x));
      if (b) { used.add(b); out.push(r % 2 ? [a, b] : [b, a]); } else out.push([a, null]);
    }
    return out;
  }
  // Crée les parties d'une ronde (une par échiquier en tournoi par équipe)
  // Une partie de tournoi (leg 1 ou 2 : chaque appariement se joue en aller-retour, une fois avec chaque couleur)
  function makeGame(t, r, w, bl, board, leg, tx, f) {
    const tc = TIME_CONTROLS[t.tc] || TIME_CONTROLS.unlim, now = Date.now();
    const ref = f.doc(f.collection(f.db, 'games'));
    tx.set(ref, {
      players: [w, bl], white: w, black: bl, whiteName: t.names[w] || '?', blackName: t.names[bl] || '?', whiteElo: t.elos[w] || 600, blackElo: t.elos[bl] || 600,
      tc: t.tc, clock: tc.ms ? { w: tc.ms, b: tc.ms } : null, moves: [], lastMoveAt: now, status: 'active', result: null, reason: null,
      seen: { [w]: now, [bl]: now }, createdAt: now, tournamentId: t.id, tournamentName: t.name, round: r, board, leg,
    });
    return { id: ref.id, white: w, black: bl, board, leg, result: null };
  }
  // En différé (temps par coup ou illimité), les deux parties sont jouées en même temps ;
  // à la pendule, la partie retour est créée quand la partie aller est finie.
  const isLive = (t) => !!(TIME_CONTROLS[t.tc] || {}).ms;
  function roundGames(t, r, pairs, tx, f) {
    const out = [];
    pairs.forEach(([a, b]) => {
      if (!a || !b) { out.push({ a: a || b, b: null, bye: true, games: [] }); return; }
      const boards = t.type === 'team'
        ? (() => { const ta = t.teams.find((x) => x.id === a), tb = t.teams.find((x) => x.id === b); const n = Math.min(ta.members.length, tb.members.length); return Array.from({ length: n }, (_, i) => (i % 2 ? [tb.members[i], ta.members[i]] : [ta.members[i], tb.members[i]])); })()
        : [[a, b]];
      const games = [];
      boards.forEach(([w, bl], i) => {
        games.push(makeGame(t, r, w, bl, i + 1, 1, tx, f));
        if (!isLive(t)) games.push(makeGame(t, r, bl, w, i + 1, 2, tx, f));
      });
      out.push({ a, b, games, expected: boards.length * 2 });
    });
    return out;
  }
  // Équipes de force égale : joueurs classés par Elo, répartis en serpentin (1-2-3-3-2-1…) ;
  // chaque équipe range ensuite ses joueurs du plus fort au plus faible (échiquier 1 = le plus fort)
  function balancedTeams(t) {
    const n = Math.max(2, Math.round(t.players.length / t.teamSize));
    const teams = Array.from({ length: n }, (_, i) => ({ id: code6(), name: `${window.L('Équipe', 'Team')} ${i + 1}`, captain: null, members: [] }));
    const sorted = [...t.players].sort((a, b) => (t.elos[b] || 600) - (t.elos[a] || 600));
    sorted.forEach((uid, i) => {
      const lap = Math.floor(i / n), k = i % n;
      teams[lap % 2 ? n - 1 - k : k].members.push(uid);
    });
    return teams.filter((tm) => tm.members.length).map((tm) => ({ ...tm, captain: tm.members[0], elo: Math.round(tm.members.reduce((s, u) => s + (t.elos[u] || 600), 0) / tm.members.length) }));
  }
  const totalRounds = (t) => (t.format === 'rr' ? Math.max(1, participants(t).length - (participants(t).length % 2 ? 0 : 1)) : t.rounds);
  // Lancé par l'organisateur, ou automatiquement par un inscrit une fois la date limite passée
  function startTournament(id, auto) {
    return editTournament(id, (t, tx, f) => {
      if (t.status !== 'open') return null;
      const late = t.deadline && Date.now() > t.deadline;
      if (t.owner !== user.uid && !(auto && late && t.members.includes(user.uid))) fail('not-owner');
      let extra = {};
      if (t.type === 'team' && t.teamMode === 'auto') {
        if (t.players.length < 2) { if (auto && late) return { status: 'cancelled' }; fail('too-few'); }
        t = { ...t, teams: balancedTeams(t) };
        extra = { teams: t.teams };
      }
      if (participants(t).length < 2) { if (auto && late) return { status: 'cancelled' }; fail('too-few'); }
      const pairs = pairRound(t, 1);
      return { ...extra, status: 'running', round: 1, totalRounds: totalRounds(t), startedAt: Date.now(), [`pairings.r1`]: roundGames(t, 1, pairs, tx, f) };
    });
  }
  // Résultat d'une partie de tournoi : enregistré par les joueurs, puis ronde suivante quand tout est fini
  function reportResult(tid, gameId, result) {
    return editTournament(tid, (t, tx, f) => {
      if (t.status !== 'running') return null;
      const key = `r${t.round}`;
      const round = (t.pairings[key] || []).map((m) => {
        const games = m.games.map((g) => (g.id === gameId && !g.result ? { ...g, result } : g));
        // partie aller finie à la pendule : on lance la partie retour, couleurs inversées
        const done1 = games.find((g) => g.id === gameId && g.leg === 1);
        if (done1 && isLive(t) && !games.some((g) => g.board === done1.board && g.leg === 2)) games.push(makeGame(t, t.round, done1.black, done1.white, done1.board, 2, tx, f));
        return { ...m, games };
      });
      const upd = { [`pairings.${key}`]: round };
      const done = round.every((m) => m.bye || (m.games.length >= (m.expected || m.games.length) && m.games.every((g) => g.result)));
      if (!done) return upd;
      // fin de ronde : points (1, ½, 0 par partie ; 1 point pour l'exempt) et adversaires rencontrés
      const scores = { ...t.scores }, met = { ...t.met };
      for (const m of round) {
        // l'exempt gagne les deux parties de la ronde
        if (m.bye) { scores[m.a] = (scores[m.a] || 0) + (t.type === 'team' ? t.teamSize : 2); continue; }
        let pa = 0, pb = 0;
        for (const g of m.games) {
          const aWhite = t.type === 'team' ? (t.teams.find((x) => x.id === m.a) || { members: [] }).members.includes(g.white) : g.white === m.a;
          const wp = g.result === '1-0' ? 1 : g.result === '0-1' ? 0 : 0.5;
          pa += aWhite ? wp : 1 - wp; pb += aWhite ? 1 - wp : wp;
        }
        scores[m.a] = (scores[m.a] || 0) + pa; scores[m.b] = (scores[m.b] || 0) + pb;
        met[m.a] = [...(met[m.a] || []), m.b]; met[m.b] = [...(met[m.b] || []), m.a];
      }
      Object.assign(upd, { scores, met });
      if (t.round >= (t.totalRounds || t.rounds)) return { ...upd, status: 'over', endedAt: Date.now() };
      const next = t.round + 1, pairs = pairRound({ ...t, scores, met }, next);
      return { ...upd, round: next, [`pairings.r${next}`]: roundGames({ ...t, scores, met }, next, pairs, tx, f) };
    });
  }
  function watchTournaments(cb) {
    let stop = [];
    load().then((f) => {
      const all = { open: [], mine: [], public: [] };
      const sub = (q, key) => f.onSnapshot(q, (snap) => { all[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); cb(all); }, () => cb(all));
      stop = [sub(f.query(f.collection(f.db, 'tournaments'), f.where('status', '==', 'open')), 'open'),
        sub(f.query(f.collection(f.db, 'tournaments'), f.where('members', 'array-contains', user.uid)), 'mine'),
        sub(f.query(f.collection(f.db, 'tournaments'), f.where('status', 'in', ['running', 'over'])), 'public')];
    });
    return () => stop.forEach((s) => s());
  }
  function watchTournament(id, cb) {
    let stop = () => {};
    load().then((f) => { stop = f.onSnapshot(f.doc(f.db, 'tournaments', id), (s) => { if (s.exists()) cb({ id: s.id, ...s.data() }); }); });
    return () => stop();
  }

  return {
    TIME_CONTROLS, load, onUser, explain,
    get user() { return user; }, get profile() { return profile; },
    signUp, signIn, signOut, resetPassword, changePseudo, changePassword, setElo, setPhoto, getPhotos, publishSummary, getProfile, myTournaments,
    presence, listPlayers, setMuted, sendChat, myGames, deleteAccount,
    isAdmin, isAdminEmail, sendVerification, refreshVerification, adminData, adminSetBanned, adminDeleteUser, adminDeleteTournament, markAdmin, loadAdminEmail, setAdminEmail, getAdminEmail,
    saveProgress, loadProgress, findPlayer, invite, watchInvites, answerInvite, watchGames, watchGame, playMove, endGame, heartbeat,
    createTournament, findTournament, joinTournament, leaveTournament, createTeam, addTeammate, startTournament, reportResult, watchTournaments, watchTournament, participants,
  };
})();
