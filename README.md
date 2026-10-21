# JeuxEchecs

Cavalier : échecs 3D (HTML/CSS/JS, sans dépendance serveur).

- **Replay** : revoir ses parties ou charger un PGN/FEN ; bouton « Analyser » (courbe d'avantage, `?!` `?` `??`, meilleur coup), export PGN, lien de partage (`#r=…`).
- **Bilan de Maître Hiro** à la fin d'une partie (ouverture, précision, principales erreurs).
- **Mode léger** (Réglages) : moins de GPU, activé automatiquement si l'affichage est lent.
- **Tests** : ouvrir `tests.html` (moteur, analyse, stress 3D) ; résultat dans `window.__tests`. L'onglet doit rester visible.


## Comptes inactifs (suppression après un an)

Le dossier `functions/` contient une fonction planifiée (`inactiveAccounts`) qui tourne chaque nuit.
Un compte inutilisé depuis un an reçoit trois e-mails d'avertissement (trois, deux puis une semaine
avant la suppression), puis il est supprimé. Revenir dans l'appli annule la suppression.

Mise en service (une seule fois) :

1. Dans la console Firebase, passer le projet en formule **Blaze** (nécessaire pour les fonctions planifiées ; l'usage de Cavalier reste dans la partie gratuite).
2. Installer l'extension **Trigger Email from Firestore** (Extensions > Trigger Email), avec la collection `mail` et un compte SMTP pour l'envoi (par exemple un mot de passe d'application Gmail, ou SendGrid / Brevo).
3. Sur l'ordinateur : `npm install -g firebase-tools`, puis `firebase login`, puis dans ce dossier `cd functions && npm install && cd .. && firebase deploy --only functions`.
