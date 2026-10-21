// Comptes inactifs : un compte inutilisé pendant un an est supprimé, après trois e-mails
// d'avertissement étalés sur trois semaines (J-21, J-14, J-7). Revenir dans l'appli annule tout.
// Les e-mails passent par l'extension Firebase « Trigger Email » (collection « mail »).
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const DAY = 86400000;
const YEAR = 365 * DAY;
const APP_URL = 'https://binaansufoudine.github.io/JeuxEchecs/';

function warningMail(email, pseudo, n, deleteAt) {
  const date = new Date(deleteAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    to: email,
    message: {
      subject: `Cavalier : ton compte sera supprimé le ${date} (rappel ${n}/3)`,
      html: `<p>Bonjour ${pseudo || ''},</p>
        <p>Ton compte Cavalier n'a pas été utilisé depuis près d'un an. Sans nouvelle visite, il sera <b>supprimé le ${date}</b>,
        avec ton profil, ton pseudo et ta progression en ligne.</p>
        <p>Pour le garder, il suffit d'ouvrir l'appli et de te connecter : <a href="${APP_URL}">${APP_URL}</a></p>
        <p>À bientôt sur l'échiquier,<br>Maître Sissa</p>`,
    },
  };
}

async function deleteAccount(uid) {
  const user = (await db.doc(`users/${uid}`).get()).data() || {};
  for (const field of ['from', 'to']) {
    const snap = await db.collection('invites').where(field, '==', uid).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await db.doc(`users/${uid}/private/progress`).delete().catch(() => {});
  if (user.pseudoLower) await db.doc(`pseudos/${user.pseudoLower}`).delete().catch(() => {});
  await db.doc(`users/${uid}`).delete().catch(() => {});
  await db.doc(`inactivity/${uid}`).delete().catch(() => {});
  await admin.auth().deleteUser(uid);
}

exports.inactiveAccounts = onSchedule({ schedule: 'every day 04:00', timeZone: 'Europe/Paris', region: 'europe-west1' }, async () => {
  const now = Date.now();
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    token = page.pageToken;
    for (const u of page.users) {
      if (!u.email) continue;
      const doc = (await db.doc(`users/${u.uid}`).get()).data() || {};
      // dernière utilisation : visite dans l'appli, connexion ou renouvellement de session
      const last = Math.max(doc.lastSeen || 0, Date.parse(u.metadata.lastSignInTime || 0) || 0, Date.parse(u.metadata.lastRefreshTime || 0) || 0, Date.parse(u.metadata.creationTime || 0) || 0);
      const ref = db.doc(`inactivity/${u.uid}`);
      const state = (await ref.get()).data();
      if (now - last < YEAR - 21 * DAY) { if (state) await ref.delete(); continue; } // compte actif ou revenu
      const deleteAt = state ? state.deleteAt : now + 21 * DAY;
      const sent = state ? state.sent : 0;
      if (now >= deleteAt && sent >= 3) { await deleteAccount(u.uid); continue; }
      // rappel 1 tout de suite, rappel 2 une semaine après, rappel 3 deux semaines après
      const due = sent < 3 && now >= deleteAt - (21 - 7 * sent) * DAY;
      if (due) {
        await db.collection('mail').add(warningMail(u.email, doc.pseudo, sent + 1, deleteAt));
        await ref.set({ deleteAt, sent: sent + 1, lastMailAt: now });
      }
    }
  } while (token);
});
