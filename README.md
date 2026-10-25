# JeuxEchecs

Cavalier : échecs 3D (HTML/CSS/JS, sans dépendance serveur).

- **Replay** : revoir ses parties ou charger un PGN/FEN ; bouton « Analyser » (courbe d'avantage, `?!` `?` `??`, meilleur coup), export PGN, lien de partage (`#r=…`).
- **Bilan de Maître Hiro** à la fin d'une partie (ouverture, précision, principales erreurs).
- **Mode léger** (Réglages) : moins de GPU, activé automatiquement si l'affichage est lent.
- **Tests** : ouvrir `tests.html` (moteur, analyse, stress 3D) ; résultat dans `window.__tests`. L'onglet doit rester visible.
- **Stockfish** : GitHub Actions vérifie chaque semaine les versions stables de Stockfish.js. Une version n'est proposée qu'après 45 jours de disponibilité et après un contrôle UCI du moteur ; elle arrive sous forme de pull request à valider.
