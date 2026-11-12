# Ata Wawé — fiches des thèmes

Chaque collection débloquée dans l'accueil change les pièces 3D, leurs attaques et leurs mats.
Le thème actif est `window.PieceTheme` (posé par `renderHomeRewards` dans `src/app`). Les règles communes à tous les thèmes :

- **Déplacement** : chaque pièce marche, vole, nage ou roule jusqu'à sa case.
- **Alerte** : une pièce qui peut prendre un adversaire en un coup, ou qu'un adversaire peut prendre en un coup, lui fait face et tend son arme vers lui ; s'il y en a plusieurs, vers le plus proche. Les créatures sans arme tendent le corps, la gueule ou les cornes. L'arme revient au repos quand l'alerte disparaît (`captureFoes`, `tickAim`).
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
- **Tour blanche** : de près comme de loin, elle envoie un dragon de feu qui fonce sur la cible et l'emporte dans les airs.
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
| Fou | phacochère | cobra |
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

## Les Gardiens Célestes (identifiant interne : auras)

Arts martiaux cosmiques (création originale). Blancs : l'Ordre du Ciel Azur, super-héros (ivoire, azur, argent). Noirs : l'Empire de l'Ombre, super-vilains (violet, noir cristal, rouge). Tous portent un costume : combinaison, cape, gants, bottes et un emblème dessiné pour le thème sur la poitrine. Plateau : l'Arène du Ciel, dalles de pierre au-dessus des nuages et rochers flottants. Sans sons propres.

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | Apprentis du Temple Azur | Feux follets d'ombre |
| Cavalier | Nilo, le jeune prodige | Krax, le chasseur de primes |
| Fou | Zaïren, le duelliste de l'aube | les Sentinelles (cyborgs) |
| Tour | Vaskar, le golem-gardien | Golmar, le titan de magma |
| Dame | Sorën, l'Éveillée | Mélyx, la reine d'obsidienne |
| Roi | Maître Oro, le sage des nuages | Vorax, le roi-comète |

| Personnage | Corps à corps | À distance (`WAR_PROJ.auras`) | Spécial |
|---|---|---|---|
| Apprentis | enchaînement de poings | disque d'énergie (riposte) | éclair aveuglant quand ils tombent |
| Feux follets | brûlure | boule de feu noir (riposte) | se dispersent en fumée |
| Nilo | coup de pied sauté | rafale d'énergie | l'aura explose quand un allié tombe |
| Krax | crochet | grappin lancé | filet sur la pièce prise |
| Zaïren | deux coups de lame | onde tranchante | parade (anneau doré) |
| Sentinelles | décharge | deux lasers croisés | champ de force |
| Vaskar | coup de bouclier | bouclier en boomerang | mur de boucliers |
| Golmar | bond et poings de lave | jet de magma en arc | se refroidit en roche puis se fissure |
| Sorën | rafale de poings | Vague Céleste, rayon chargé | pas instantané sur les longs déplacements |
| Mélyx | griffes et lames | rayons croisés des miroirs | reflet, un double prend le coup |
| Oro | coup de bâton | Souffle ancestral (riposte) | dôme de lumière quand il est en échec |
| Vorax | coup de sceptre | éclats gravitationnels (riposte) | pesanteur autour de lui quand il est en échec |

- **Déplacement** : vol au ras du plateau avec traînée de lumière ; le cavalier passe par-dessus les autres.
- **Longs déplacements** (3 cases ou plus, sans prise) : la tour (sans aura ni traînée) et la dame volent à l'horizontale ; le fou file à grande vitesse et laisse des flammes sur les cases traversées, bleu et or côté Blancs, violet côté Noirs (`tickFlight`).
- **Aura** : la pièce sélectionnée s'entoure de son aura, bleue ou pourpre.
- **Cratères** : une prise laisse un cratère fumant pendant 6 demi-coups (`AURA_CRATER_PLIES`).
- **Mats** : un mat par pièce (`AURA_MATE`), celui de la pièce qui donne le mat ; sur un mat double, la plus forte. Un roi ne donne jamais échec : son mat se joue quand il vient lui-même de jouer le coup de mat (découverte, roque).

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | *Cercle du Temple* : les apprentis encerclent le roi, éclair aveuglant | *Nuée d'Ombre* : les petits vilains l'encerclent et l'embrasent d'une flamme violette |
| Cavalier | *Comète de Nilo* : plongeon en vrille, onde de choc | *La Prime* : grappin, liens, filet |
| Fou | *Aube Tranchante* : un éclair sur la diagonale, un silence, une croix de lumière | *Le Réseau* : les Sentinelles, en vol, resserrent une toile de lasers |
| Tour | *La Forteresse* : les boucliers se referment en cage de pierre | *L'Éruption* : colonne de magma, puis tout se refroidit en roche |
| Dame | *Constellation d'Azur* : les étoiles reliées s'abattent sur le roi | *Nova Noire* : la lumière des miroirs forme une boule rouge gigantesque qui s'abat sur le camp blanc ; toutes les pièces blanches volent en éclats et un énorme cratère reste à la place |
| Roi | *Souffle des Nuages* : une colonne de vent soulève le roi adverse | *Chute de Comète* : une comète de cristal tombe du ciel |
- **Code** : modèles dans `auras3d.js`, armes, pouvoirs et mats dans `src/board3d/12b-auras.js` (Constellation et Nova dans `05-mats-themes.js`). Les pouvoirs sont des effets visuels courts, sans effet sur les règles.
- **Échiquier 2D** : il garde les ninjas, comme pour tous les thèmes.

## L'Âge des Sabres

Samouraïs des temps anciens (création originale, noms et blasons inventés). Blancs : le clan Hakuro, le Héron blanc (ivoire, vermillon, or, blason fleur de cerisier à cinq pétales). Noirs : le clan Kurokane, le Fer noir (laque noire, violet, bronze, masques à crocs, blason croissant de lune barré de trois traits). Plateau : la cour du château de Hakuro au crépuscule (terrain `castle`, météo `sunset` imposée), échiquier en planches de cèdre, lanternes de pierre, cerisiers, pétales qui volent, donjon à toits superposés qui reste à l'arrière-plan quelle que soit la vue. Sans sons propres.

À ne pas confondre avec les ninjas : ici armures lourdes laquées, casques à cimier, bannières dans le dos et vrais chevaux.

| Pièce | Blancs | Noirs |
|---|---|---|
| Pion | Ashigaru de Hakuro | Ashigaru de Kurokane |
| Cavalier | Cavalier Hayate, cheval gris clair | Cavalier Kurogiri, cheval noir caparaçonné |
| Fou | Bretteur Ren, aux deux sabres | Bretteur Gōki, aux deux sabres |
| Tour | Colosse Daigorō | Colosse Tesshin |
| Dame | Dame Sakuya, naginata | Dame Kagerō, naginata à chaîne |
| Roi | Daimyō Takemori, sabre et éventail | Shōgun Gendai, nodachi |

| Pièce | Attaque (de près comme de loin, sans riposte de la cible) |
|---|---|
| Pion | échange de coups de sabre, puis il transperce |
| Cavalier | charge à la lance : la cible reste accrochée une seconde, puis tombe |
| Fou | deux arcs d'énergie croisés en X, qui l'emportent hors du plateau |
| Tour | boule de fer lancée, enflammée en vol ; la cible brûle et part loin dans le décor ; la chaîne ramène la boule |
| Dame | naginata lancée, enveloppée d'une vrille de feu en pointe ; la cible est éjectée hors du plateau ; la lance reste plantée debout sur la case, où la dame vient la reprendre |
| Roi blanc | iaï éclair : un trait blanc, un instant de silence, la cible s'effondre |
| Roi noir | le nodachi frappe le sol, la case tremble et se fend |

Feu orange et or côté blanc, violet côté noir. Mats : un par pièce (`SABRE_MATE`), celui de la pièce qui donne le mat, comme pour les Gardiens Célestes (mat double : la plus forte ; mat joué par le roi : mat du camp). Ils durent plus longtemps que les 4,8 s habituelles (`SABRE_MATE_TIME`).

| Pièce | Mat |
|---|---|
| Pion | *Lame ardente* : le sabre s'enflamme, trois coups, le roi brûle puis tombe |
| Cavalier | *Cavalier de feu* : saut sur le roi accroché à la lance, le cheval cabré le frappe de ses sabots |
| Fou | *L'Arc géant* : haut comme deux tours, feu sur les cases traversées, il emporte le roi et les pièces adverses de son couloir |
| Tour | *Fracas de fer* : trois coups de boule enflammée, puis le dernier écrase le roi et brise tout le plateau |
| Dame blanche | *Dragon de feu* : la dame lance sa naginata, qui devient un dragon jaune à mi-chemin ; il percute le roi et l'emporte en le dévorant, fait un tour du plateau et disparaît dans le ciel ; la naginata retombe dans la main que la dame lève vers le ciel |
| Dame noire | *Tigre de feu noir* : en position de lancer, sa naginata devient un tigre de feu noir et violet, qu'elle lance à toute vitesse ; il emporte le roi dans le ciel en faisant un tour du plateau ; la naginata retombe dans sa main |
| Roi blanc | *Pluie de Sakura* : trait blanc, tempête de pétales, le cimier du roi noir se brise |
| Roi noir | *Lune Pourpre* : nuit noire, lune rouge, vague d'encre, cendres, le croissant du roi blanc se fend |

- **Code** : modèles dans `sabres3d.js`, attaques et mats dans `src/board3d/12c-sabres.js`, décor dans `buildCastleCourt` (`01-scene-terrain.js`).
- **Échiquier 2D** : il garde les ninjas, comme pour tous les thèmes.
- **Images d'accueil** : rendues depuis le plateau 3D, aux tailles des autres thèmes.

## L'Empire des Baobabs

Deux royaumes d'Afrique inventés. Blancs : Zalimba, le Soleil d'or (or, crème, zigzags vert et rouge, blason soleil à huit rayons). Noirs : Kôrodu, le Bronze de la nuit (indigo, bronze, perles rouges, peintures blanches, blason tête de léopard). Plateau : la cour royale de Zalimba (terrain `banco`, météo `sunset` imposée), échiquier en terre claire et terre brûlée, palais en banco hérissé de poutres toujours à l'arrière-plan, cases rondes à toit de paille, baobabs. Sans sons propres.

| Pièce | Blancs | Noirs | Attaque (de près comme de loin, sans riposte) |
|---|---|---|---|
| Pion | guerrier au bandeau rouge | guerrier aux peintures blanches | coup de sagaie derrière le bouclier tacheté |
| Cavalier | Tamba, lion à crinière rousse | Dôro, lion à crinière noire | bond en L ; rugissement et lance / coup de patte qui plaque la cible |
| Fou | Griot Sanou, djembé et bâton au disque d'or | Sorcier Ogo, grand masque à plumes rouges | onde sonore dorée / esprit blanc qui emporte la cible |
| Tour | éléphant à tour de bois et archer | éléphant sombre à plaque de bronze | charge et piétine / coup de trompe qui projette |
| Dame | Reine Nalé, gélé et collier d'or | Reine Sika, foulard indigo | volée de lances dorées / lance d'ombre qui traverse |
| Roi | Mansa Kélo, haute couronne perlée | Roi Obadé, couronne de bronze | rayon d'or / trois griffures de bronze |

- **Mat de la dame** (`KIT_PIECE_MATE`), dans les deux camps : *l'Orage*. La reine danse, le ciel se couvre de nuages noirs, la pluie tombe dans un grand vent, un gros éclair frappe le roi adverse puis de petits éclairs frappent chacune des autres pièces de son camp : toutes partent en cendres (les tas de cendres restent jusqu'à la partie suivante).
- **Mat du cavalier** (`KIT_PIECE_MATE`), dans les deux camps : *la Meute*. Trois lions entrent par les bords du plateau, courent jusqu'au roi adverse avec le cavalier, rugissent, puis se jettent sur lui sans sauter (le cavalier non plus) : le roi est renversé, puis dévoré. Les lions repartent ensuite en courant vers les bords et le cavalier rentre sur sa case ; la case du roi reste rouge jusqu'à la partie suivante.
- **Mat de la tour** (`KIT_PIECE_MATE`), dans les deux camps : *le Piétinement*. L'éléphant grandit jusqu'à doubler de taille, marche vite jusqu'au roi adverse, se cabre et l'écrase trois fois de ses pattes de devant ; le roi s'aplatit un peu plus à chaque coup, puis s'enfonce dans le sol. L'éléphant retourne sur sa case et laisse un trou à la place du roi, jusqu'à la partie suivante.
- **Mat du pion** (`KIT_PIECE_MATE`), dans les deux camps : *la Lance*. Le guerrier court jusqu'au roi adverse, échange quelques coups avec lui (étincelles), recule, puis le transperce de sa lance ; le roi tombe et le guerrier retourne sur sa case.
- **Autres mats** (`THEME_MATE`) : Blancs, *Chant des Ancêtres* : tambours, ancêtres dorés qui sortent de terre et emportent le roi vers le soleil couchant. Noirs, *Tempête d'Harmattan* : ciel jaune, tempête de sable, yeux de léopard, le roi disparaît dans le tourbillon.
- **Code** : modèles dans `baobabs3d.js`, fiches d'attaque dans `KIT_ATTACKS` (`00-constantes.js`), moteur des fiches et mats dans `src/board3d/12d-kit-attaques.js`, décor dans `buildRoyalCourt` (`01-scene-terrain.js`).

## L'Âge des Géants

Dinosaures, sans humains. Blancs : la Vallée des Fougères (peau verte, ventre crème, rayures vert foncé, yeux dorés, feuilles et fleurs). Noirs : le Volcan Noir (peau charbon, ventre rouge brique, rayures de lave lumineuses, yeux rouges). Plateau : la clairière du Volcan (terrain `volcano`, météo `sunset` imposée), dalles de pierre claire et sombre, fougères géantes, ptérosaures dans le ciel, volcan fumant qui reste à l'arrière-plan. Sans sons propres.

| Pièce | Blancs | Noirs | Attaque (de près comme de loin, sans riposte) |
|---|---|---|---|
| Pion | Petit Pousse, bébé dans son œuf, feuille sur la tête | Petit Tison, crête de lave | il bondit hors de la coquille, coup de tête |
| Cavalier | vélociraptor | vélociraptor de lave | bond en L, griffe / double griffe enflammée |
| Fou | ptéranodon aux ailes vertes | ptéranodon aux ailes rouge sombre | piqué qui emporte la cible / piqué enflammé |
| Tour | tricératops à collerette tachetée | tricératops de basalte | charge cornue qui soulève la cible / charge sismique, le sol se fend sur la ligne |
| Dame | Reine Voilière, spinosaure à voile verte fleurie | Reine Brasevoile, voile rouge à nervures de lave | coup de queue tournoyant / la voile projette des braises |
| Roi | Roi Fougerex, tyrannosaure à couronne de feuilles | Roi Cendrax, couronne d'obsidienne | morsure / souffle brûlant |

- **Mats** (`THEME_MATE`) : Blancs, *Pluie de météorites* : le ciel s'embrase, une météorite frappe le roi, l'onde de choc couche les fougères. Noirs, *Éruption* : le volcan explose, une rivière de lave engloutit le roi sous la cendre.
- **Code** : modèles dans `dinos3d.js`, fiches dans `KIT_ATTACKS.dinos`, décor dans `buildVolcanoClearing` (`01-scene-terrain.js`), mats dans `12d-kit-attaques.js`.

---

## Ajouter ou modifier un thème

1. Pièces : un fichier qui remplit `window.ThemeModels[id].build(THREE, piece)` (voir `themes3d.js`, `ocean3d.js`, `warriors3d.js`, `auras3d.js`, `sabres3d.js`).
2. Couleurs des tirs : une entrée dans `THEME_FX` ; armes particulières dans `WAR_PROJ`.
3. Mats : une entrée dans `THEME_MATE` (un style pour les Blancs, un pour les Noirs), ses couleurs dans `THEME_MATE_COLORS`, puis le décor dans `makeThemeMate` et l'animation dans `tickThemeMateFx`.
4. Ajouter le thème à la liste de `tests3d.js` et vérifier que `tests3d.html` passe.
