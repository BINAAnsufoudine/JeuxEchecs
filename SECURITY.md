# Sécurité de l’application

## Règles Firestore

Les accès aux données en ligne sont contrôlés par `firestore.rules`. Ces règles n’entrent en vigueur que lorsqu’elles sont publiées sur Firebase. Après connexion au projet Firebase, publier les règles avec :

```sh
firebase deploy --only firestore:rules --project jeuechecs-c1731
```

Le fichier `firebase.json` associe explicitement le projet aux règles du dépôt. Après publication, vérifier dans Firebase Console que le jeu en ligne, les invitations, les tournois et la synchronisation de progression fonctionnent encore.

## Actions à faire dans les consoles Firebase et Google Cloud

- Restreindre la clé API Web Firebase par référent HTTP aux domaines utilisés, notamment `atawawe.online` et `www.atawawe.online`, puis limiter les API autorisées aux services Firebase nécessaires. Cette clé est visible dans une application Web et ne constitue pas un secret ; les règles Firestore assurent le contrôle des données.
- Configurer Firebase App Check pour le site Web, surveiller ses métriques, puis activer l’application des contrôles pour Firestore après avoir confirmé que les visites légitimes sont reconnues.
- Activer les alertes de budget et surveiller les quotas Firestore et Authentication.

## Limite actuelle

Le site est une application statique hébergée par GitHub Pages. Les coups, les résultats de partie et une partie des données de tournoi sont produits par le navigateur. Les règles Firestore peuvent limiter les comptes et les champs qui écrivent, mais elles ne remplacent pas un serveur qui valide les règles d’échecs, les résultats et les limites de fréquence. Ne pas considérer les scores clients comme certifiés contre la triche.
