# Ata Wawé — fiches des thèmes

Chaque collection débloquée dans l'accueil change les pièces 3D, leurs attaques et leurs mats.
Le thème actif est `window.PieceTheme` (posé par `renderHomeRewards` dans `src/app`). Les règles communes à tous les thèmes :

- **Déplacement** : chaque pièce marche, vole, nage ou roule jusqu'à sa case.
- **Prise au contact** : l'attaquant frappe, la victime tombe puis disparaît.
- **Prise à distance** (fou, tour, dame, cavalier) : un tir propre au thème part de l'arme de la pièce (`THEME_FX`, `WAR_PROJ`).
- **Riposte** : la cible tire d'abord sa propre arme sur l'attaquant. Seuls les ninjas l'esquivent par la *substitution* (bûche et fumée) et se protègent derrière des murs de terre ; dans les autres thèmes, la pièce encaisse le coup (pose blessée) puis riposte.
- **Roque** : un dôme d'énergie (la voûte) protège le roi roqué tant que son bouclier de pions tient, dans tous les thèmes.
- **Mat** : 4,8 s de mise en scène pour les thèmes, avec une base commune aussi riche que celle des ninjas :
  colonne et anneau de lumière sous l'attaquant pendant la charge, ciel qui s'assombrit, puis à l'impact (3 s) un éclair, une onde au sol, une gerbe d'éclats, une lumière colorée et une trace qui reste sur la case du roi jusqu'à la partie suivante.
  Les couleurs viennent de `THEME_MATE_COLORS` et l'attaque elle-même de `THEME_MATE`.

Les constantes sont dans `src/board3d/00-constantes.js`, les mats dans `src/board3d/05-mats-themes.js`.

---

## Ninjas (thème de base)

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | ninja blanc cagoulé | ninja noir cagoulé |
| Cavalier | ninja sur un grand chien blanc | ninja sur un aigle en vol |
| Fou | ermite aux cheveux blancs, rouleau | moine combattant |
| Tour | colosse au grand shuriken | colosse en armure, aura violette |
| Dame | kunoichi aux gants de combat | guerrière à aura rouge |
| Roi | chef du village au manteau à flammes | chef des guerriers, aura dorée et éclairs |

- **Armes à distance** : techniques élémentaires (feu, vent, foudre, eau…) propres à chaque pièce.
- **Défense** : substitution par une bûche et murs de terre (exclusifs à ce thème).
- **Mats** : un mat dédié par pièce (invocations, tempête, apocalypse…), dans `04-mats-ninjas.js` et `06-mats-effets.js`.

## Océan

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | poisson-clown | piranha |
| Cavalier | hippocampe | murène |
| Fou | raie manta | espadon voilier |
| Tour | tortue marine | crabe géant |
| Dame | dauphin | requin |
| Roi | baleine à bosse | orque |

- **Armes à distance** : jet d'eau et salves de bulles (bleu clair pour les Blancs, violet sombre pour les Noirs).
- **Décor** : une fine couche d'eau recouvre le plateau.
- **Mats** : Blancs, *vague* géante ; Noirs, *tourbillon*.

## Plantes

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | pousse de riz | tulipe violette en pot |
| Cavalier | tournesol | plant de maïs |
| Fou | oranger | cactus |
| Tour | baobab | saule noir |
| Dame | cerisier en fleurs | rosier aux roses noires |
| Roi | manguier | arbre mort couvert de lianes |

- **Armes à distance** : jets de sève et de pollen (vert et rose pour les Blancs, brun et violet pour les Noirs).
- **Mats** : Blancs, *racines* qui jaillissent du sol ; Noirs, *mâchoires* d'une plante carnivore.

## Animaux terrestres

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | suricate | hyène |
| Cavalier | zèbre | gnou |
| Fou | girafe | cobra |
| Tour | éléphant | rhinocéros |
| Dame | lionne | panthère noire |
| Roi | lion | gorille |

- **Armes à distance** : charges de sable et de poussière.
- **Mats** : Blancs, *ruée* d'un troupeau ; Noirs, *séisme*.

## Oiseaux

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | colibri (au sol, vole en se déplaçant) | moineau noir |
| Cavalier | perroquet | corbeau |
| Fou | héron | vautour |
| Tour | calao | grand-duc |
| Dame | paon | cygne noir |
| Roi | aigle royal | condor |

- **Déplacement** : les oiseaux restent posés au repos et s'envolent pour les longues distances.
- **Armes à distance** : rafales de plumes et de vent.
- **Mats** : Blancs, *aigle* géant qui fond sur le roi ; Noirs, nuée de *corbeaux*.

## Guerriers de l'Antiquité

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | légionnaire | guerrier barbare |
| Cavalier | cavalier à la lance | cavalier sombre |
| Fou | baliste | catapulte |
| Tour | tour de siège | bélier couvert |
| Dame | char de guerre | éléphant de guerre |
| Roi | empereur | roi barbare |

- **Armes à distance** (`WAR_PROJ.ancient`) : cavaliers, javelot ; baliste, carreau ; catapulte, rocher ; tour de siège, volée de flèches ; bélier, pot de feu ; char, javelots ; éléphant, flèches.
- **Mats** : Blancs, pluie de *flèches enflammées* ; Noirs, *rocher* géant.

## Guerriers modernes

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | soldat | soldat |
| Cavalier | hélicoptère | hélicoptère |
| Fou | blindé lance-missiles | blindé lance-missiles |
| Tour | char d'assaut | char d'assaut |
| Dame | avion de chasse à aile delta | avion de chasse à aile delta |
| Roi | général | général |

- **Soldats** : fusil contre la poitrine au repos, épaulé pour tirer, un genou à terre pour viser.
- **Prises** : toutes les pièces sauf le roi tirent à la mitrailleuse au contact et à portée ; à longue distance, missiles (hélicoptère, blindé), obus (char) ou bombes (avion).
- **Roi** : deux soldats arrivent du bord du plateau et mitraillent la cible, ou tirent au bazooka si c'est un engin volant.
- **Roque** : c'est le roi qui saute par-dessus la tour.
- **Mats** : Blancs, *frappe aérienne* ; Noirs, *frappe orbitale*.

---

## Ajouter ou modifier un thème

1. Pièces : un fichier qui remplit `window.ThemeModels[id].build(THREE, piece)` (voir `themes3d.js`, `ocean3d.js`, `warriors3d.js`).
2. Couleurs des tirs : une entrée dans `THEME_FX` ; armes particulières dans `WAR_PROJ`.
3. Mats : une entrée dans `THEME_MATE` (un style pour les Blancs, un pour les Noirs), ses couleurs dans `THEME_MATE_COLORS`, puis le décor dans `makeThemeMate` et l'animation dans `tickThemeMateFx`.
4. Ajouter le thème à la liste de `tests3d.js` et vérifier que `tests3d.html` passe.
