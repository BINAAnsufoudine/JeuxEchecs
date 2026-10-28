# Modules de l'appli

`app.js` et `board3d.js` sont **assemblés** à partir des modules de ce dossier :

- `src/app/` : un fichier par partie de l'interface (navigation, partie, problèmes, en ligne, tournois, profil, récompenses, admin…).
- `src/board3d/` : un fichier par partie du plateau 3D (scène et terrains, caméra, mats, effets, attaques, projectiles, ripostes, saisie).

Les modules sont des morceaux d'un même fichier : ils partagent les mêmes variables et s'assemblent dans l'ordre de leur numéro.

**Pour modifier le jeu :** changer le module concerné, puis lancer

```
node scripts/build.mjs
```

Les tests GitHub vérifient que `app.js` et `board3d.js` sont bien à jour (`node scripts/build.mjs --check`).
