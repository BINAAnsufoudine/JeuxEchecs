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
    unlim: { ms: 0 }, '3d': { perMove: 3 * 86400000 }, '1d': { perMove: 86400000 },
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
      'pseudo-taken': L('Ce pseudo est déjà pris.', 'This nickname is already taken.'),
      'pseudo-empty': L('Choisis un pseudo.', 'Choose a nickname.'),
      'player-unknown': L('Aucun joueur avec ce pseudo.', 'No player with this nickname.'),
      'self-invite': L('Tu ne peux pas t\'inviter toi-même.', 'You cannot invite yourself.'),
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
  async function invite(pseudo, tc) {
    const f = await load();
    const other = await findPlayer(pseudo);
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

  return {
    TIME_CONTROLS, load, onUser, explain,
    get user() { return user; }, get profile() { return profile; },
    signUp, signIn, signOut, resetPassword, changePseudo, changePassword, setElo,
    saveProgress, loadProgress, findPlayer, invite, watchInvites, answerInvite, watchGames, watchGame, playMove, endGame, heartbeat,
  };
})();
