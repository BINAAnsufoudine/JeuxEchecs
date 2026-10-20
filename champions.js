/* Cavalier — « Comme un champion » : idées et principes des champions du monde.
   style : profil de jeu sur 5 axes (0 à 1), comparé au style du joueur pour classer les champions.
   principles : chaque principe est expliqué puis appliqué sur un problème du thème indiqué.
   tips : rappels donnés par l'entraîneur pendant une partie, selon la situation. */
window.CHAMPIONS = [
  {
    id: 'steinitz', name: 'Wilhelm Steinitz', reign: 'Champion du monde de 1886 à 1894',
    tagline: 'Le père du jeu positionnel',
    style: { attaque: 0.2, tactique: 0.3, positionnel: 0.9, finale: 0.5, defense: 0.8 },
    intro: 'Je suis Wilhelm Steinitz, le premier champion du monde officiel. J\'ai montré qu\'on ne gagne pas une partie par une attaque folle, mais en accumulant de petits avantages : un pion de plus, une case forte, une pièce mieux placée.',
    principles: [
      { title: "N'attaque que si tu as un avantage", theme: 'prise', text: 'Attaquer sans avantage, c\'est s\'affaiblir. Je commençais toujours par gagner quelque chose de concret, même petit.', task: "Une pièce adverse est mal protégée : gagne-la proprement, sans te découvrir." },
      { title: 'Accumule les petits avantages', theme: 'clouage', text: 'Un petit avantage s\'ajoute au suivant. Une pièce clouée ne peut plus bouger : c\'est une faiblesse qui se fixe et qui s\'exploite.', task: 'Exploite un alignement pour gagner du matériel.' },
      { title: 'Défends avec sang-froid', theme: 'defense', text: 'J\'acceptais d\'être attaqué si je voyais la parade. Bien défendre, c\'est trouver le coup qui neutralise la menace.', task: "L'adversaire menace de mater : trouve la parade." },
    ],
    openings: ['e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4'],
    tips: {
      ouverture: "Pas d'aventure. Développe tes pièces et garde une structure de pions saine.",
      milieu: "Cherche le petit avantage concret, une pièce mal défendue ou une case faible, avant de lancer quoi que ce soit.",
      attaque: "Tu as des échecs à disposition, mais n'attaque que si ta position est supérieure. Sinon, renforce-toi d'abord.",
      defense: "On t'attaque ? Garde ton calme et cherche la défense la plus simple.",
      finale: 'En finale, tes petits avantages accumulés deviennent décisifs. Garde-les.',
    },
  },
  {
    id: 'lasker', name: 'Emanuel Lasker', reign: 'Champion du monde de 1894 à 1921',
    tagline: 'Le combattant pragmatique',
    style: { attaque: 0.5, tactique: 0.7, positionnel: 0.6, finale: 0.7, defense: 0.8 },
    intro: 'Je suis Emanuel Lasker. J\'ai gardé mon titre 27 ans, un record. Je jouais l\'adversaire autant que la position, je défendais avec ténacité et je ne lâchais jamais une partie.',
    principles: [
      { title: 'Cherche un meilleur coup', theme: 'tactique', text: 'On me prête cette maxime : quand tu vois un bon coup, cherches-en un meilleur. Ne joue pas le premier coup qui te plaît.', task: 'Une combinaison gagne du matériel. Ne te contente pas du premier coup venu.' },
      { title: 'Ne lâche jamais', theme: 'defense', text: 'J\'ai sauvé des positions que tout le monde croyait perdues. Même menacé, il y a souvent une ressource.', task: "L'adversaire menace de mater : trouve la ressource." },
      { title: 'Les cavaliers sortent tôt', theme: 'fourchette', text: 'Je conseillais de développer les cavaliers avant les fous. Un cavalier actif peut toucher deux cibles à la fois.', task: 'Une attaque double gagne du matériel. Trouve-la.' },
    ],
    openings: ['e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8'],
    tips: {
      ouverture: 'Sors tes cavaliers avant tes fous, et roque tôt.',
      milieu: 'Tu as un bon coup en tête ? Cherche s\'il en existe un meilleur avant de le jouer.',
      attaque: 'Avant de donner échec, regarde tous les coups forcés et choisis le plus fort.',
      defense: "Ne panique pas. Il y a presque toujours une défense, cherche-la calmement.",
      finale: 'En finale, chaque pion compte. Joue jusqu\'au bout, même si c\'est serré.',
    },
  },
  {
    id: 'capablanca', name: 'José Raúl Capablanca', reign: 'Champion du monde de 1921 à 1927',
    tagline: 'La machine à finales',
    style: { attaque: 0.3, tactique: 0.5, positionnel: 0.9, finale: 1, defense: 0.6 },
    intro: 'Je suis José Raúl Capablanca. Je jouais simplement, et je conseille d\'étudier les finales avant tout : quand on sait gagner une finale, on sait vers quoi diriger la partie.',
    principles: [
      { title: 'Simplifie quand tu es devant', theme: 'prise', text: 'Avec du matériel en plus, j\'échange les pièces : moins il en reste, plus l\'avantage compte.', task: 'Une pièce adverse est mal protégée : gagne-la simplement.' },
      { title: 'Le roi est une pièce forte en finale', theme: 'finale', text: 'En finale, il n\'y a plus de danger de mat : le roi doit marcher au centre et soutenir ses pions.', task: "C'est une finale : trouve le coup gagnant." },
      { title: 'Des coups simples et clairs', theme: 'clouage', text: 'Je préfère le coup clair au coup compliqué. Un clouage bien vu gagne du matériel sans risque.', task: 'Un alignement adverse se gagne. Trouve le coup simple.' },
    ],
    openings: ['d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7'],
    tips: {
      ouverture: 'Un développement simple et harmonieux, sans coup de pion inutile.',
      milieu: "Si tu as l'avantage, cherche les échanges qui te mènent à une finale gagnante.",
      attaque: "L'attaque n'est utile que si elle gagne quelque chose de clair. Sinon, simplifie.",
      defense: 'Échange les pièces attaquantes, la menace disparaît avec elles.',
      finale: 'On est en finale ! Active ton roi, centralise-le et pousse ton pion passé.',
    },
  },
  {
    id: 'alekhine', name: 'Alexandre Alekhine', reign: 'Champion du monde de 1927 à 1935 et de 1937 à 1946',
    tagline: "L'attaquant inventif",
    style: { attaque: 0.9, tactique: 0.9, positionnel: 0.6, finale: 0.4, defense: 0.3 },
    intro: 'Je suis Alexandre Alekhine. Je préparais mes attaques avec soin, puis je déclenchais des combinaisons d\'une grande richesse. Je cherche l\'initiative dès l\'ouverture.',
    principles: [
      { title: "Prends l'initiative", theme: 'tactique', text: 'Je force l\'adversaire à répondre à mes menaces. Celui qui menace choisit où se joue la partie.', task: 'Une combinaison gagne du matériel. Commence par les coups forcés.' },
      { title: 'Concentre tes forces contre le roi', theme: 'mat', text: 'Une attaque réussit quand plus de pièces attaquent que de pièces ne défendent. J\'amène tout le monde.', task: 'Il y a un mat : regarde tous les échecs.' },
      { title: 'Une position supérieure crée les combinaisons', theme: 'fourchette', text: 'Les combinaisons ne tombent pas du ciel : elles naissent quand tes pièces sont plus actives.', task: 'Une attaque double gagne du matériel. Trouve-la.' },
    ],
    openings: ['e2e4 g8f6 e4e5 f6d5 d2d4 d7d6 g1f3 c8g4', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', 'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7'],
    tips: {
      ouverture: "Cherche l'initiative dès l'ouverture, provoque les pions adverses et vise le centre.",
      milieu: 'Rapproche tes pièces du roi adverse avant d\'attaquer.',
      attaque: 'Tu peux donner échec. Calcule les coups forcés : une combinaison se cache peut-être là.',
      defense: "La meilleure défense, c'est souvent une contre-attaque. Cherche ta propre menace.",
      finale: 'Même en finale, garde tes pièces actives et crée des menaces.',
    },
  },
  {
    id: 'tal', name: 'Mikhaïl Tal', reign: 'Champion du monde de 1960 à 1961',
    tagline: 'Le magicien de Riga',
    style: { attaque: 1, tactique: 1, positionnel: 0.3, finale: 0.2, defense: 0.2 },
    intro: 'Je suis Mikhaïl Tal, le magicien de Riga. Je sacrifie des pièces pour ouvrir le roi adverse et j\'entraîne mon adversaire dans une forêt sombre où ses calculs ne tombent plus juste.',
    principles: [
      { title: 'Sacrifie pour ouvrir le roi', theme: 'mat', text: 'Une pièce sacrifiée qui ouvre le roi vaut plus qu\'une pièce de plus. Le mat compte, pas le matériel.', task: 'Il y a un mat : commence par les échecs, même les plus audacieux.' },
      { title: 'Crée des complications', theme: 'tactique', text: 'Je cherche les positions où chaque coup est une menace. L\'adversaire finit par se tromper.', task: 'Une combinaison gagne du matériel. Les coups forcés d\'abord.' },
      { title: "L'activité avant le matériel", theme: 'fourchette', text: 'Des pièces actives touchent plusieurs cibles à la fois. Je mets mes pièces là où elles frappent.', task: 'Une attaque double gagne du matériel. Trouve-la.' },
    ],
    openings: ['e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6'],
    tips: {
      ouverture: 'Développe vite et ouvre le jeu, les complications viendront.',
      milieu: "Regarde les sacrifices autour du roi adverse. S'il manque de défenseurs, ose.",
      attaque: 'Tu as des échecs ! Calcule les sacrifices qui ouvrent le roi adverse.',
      defense: 'Riposte par une menace plus forte que celle de ton adversaire.',
      finale: 'Même en finale, des pièces actives valent mieux que du matériel passif.',
    },
  },
  {
    id: 'petrosian', name: 'Tigran Petrosian', reign: 'Champion du monde de 1963 à 1969',
    tagline: 'Le maître de la prophylaxie',
    style: { attaque: 0.2, tactique: 0.4, positionnel: 0.9, finale: 0.6, defense: 1 },
    intro: 'Je suis Tigran Petrosian. Avant chaque coup, je me demande ce que veut jouer mon adversaire, et je l\'en empêche avant même que la menace n\'existe.',
    principles: [
      { title: 'Prophylaxie : que veut mon adversaire ?', theme: 'defense', text: 'Je regarde d\'abord le plan adverse. Une menace empêchée à temps ne coûte rien.', task: "L'adversaire menace de mater : trouve la parade." },
      { title: "Neutralise avant d'attaquer", theme: 'clouage', text: 'J\'immobilise les pièces adverses avant de passer à l\'action. Une pièce clouée ne menace plus rien.', task: 'Un clouage gagne du matériel. Cherche les alignements.' },
      { title: 'La sécurité avant tout', theme: 'prise', text: 'Je ne laisse jamais une pièce sans protection, et je punis celles de l\'adversaire.', task: "Une pièce adverse est mal protégée. Gagne-la sans prendre de risque." },
    ],
    openings: ['d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', 'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7', 'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6'],
    tips: {
      ouverture: 'Une position solide d\'abord. Roque et protège tes pièces.',
      milieu: "Avant de jouer, demande-toi ce que l'adversaire veut faire, et empêche-le.",
      attaque: "Un échec n'est utile que s'il améliore ta position. Vérifie d'abord ta sécurité.",
      defense: 'Renforce le point attaqué avant que la menace ne devienne réelle.',
      finale: 'En finale, ne laisse aucune chance de contre-jeu. Bloque les pions adverses.',
    },
  },
  {
    id: 'fischer', name: 'Bobby Fischer', reign: 'Champion du monde de 1972 à 1975',
    tagline: 'La clarté et la précision',
    style: { attaque: 0.7, tactique: 0.8, positionnel: 0.7, finale: 0.8, defense: 0.5 },
    intro: 'Je suis Bobby Fischer. Je joue des coups clairs et précis, et je me bats pour gagner chaque partie jusqu\'au dernier pion. Mes pièces, surtout mes fous, sont toujours actives.',
    principles: [
      { title: 'Punis le retard de développement', theme: 'prise', text: 'Je développe vite et je punis l\'adversaire qui laisse traîner une pièce mal protégée.', task: 'Une pièce adverse est mal protégée : gagne-la.' },
      { title: 'Chaque pièce doit travailler', theme: 'fourchette', text: 'Une pièce passive ne sert à rien. Je place les miennes là où elles touchent plusieurs cibles.', task: 'Une attaque double gagne du matériel. Trouve-la.' },
      { title: "Joue pour gagner jusqu'au bout", theme: 'finale', text: 'Je convertis mes finales avec précision. Je ne propose pas nulle, je joue.', task: "C'est une finale : trouve le coup gagnant." },
    ],
    openings: ['e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8'],
    tips: {
      ouverture: 'Développe vite, roque, et place tes fous sur les grandes diagonales.',
      milieu: 'Trouve ta pièce la moins active et donne-lui du travail.',
      attaque: 'Sois précis. Calcule jusqu\'au bout avant de lancer l\'attaque.',
      defense: 'Défends avec des coups actifs, pas en reculant.',
      finale: 'La finale se gagne avec précision. Active ton roi et tes tours.',
    },
  },
  {
    id: 'karpov', name: 'Anatoly Karpov', reign: 'Champion du monde de 1975 à 1985',
    tagline: 'Le boa constricteur',
    style: { attaque: 0.3, tactique: 0.5, positionnel: 1, finale: 0.8, defense: 0.7 },
    intro: 'Je suis Anatoly Karpov. J\'étouffe mes adversaires : je retire une à une les bonnes cases de leurs pièces, jusqu\'à ce qu\'elles n\'aient plus aucun coup utile.',
    principles: [
      { title: 'Restreins les pièces adverses', theme: 'clouage', text: 'J\'aime clouer et immobiliser. Une pièce qui ne peut plus bouger est une pièce perdue à terme.', task: 'Un clouage ou une enfilade gagne du matériel.' },
      { title: 'Améliore ta pire pièce', theme: 'prise', text: 'Quand rien ne presse, j\'améliore ma pièce la moins bien placée, puis je cueille le matériel mal défendu.', task: 'Une pièce adverse est mal protégée. Gagne-la.' },
      { title: 'Convertis sans risque', theme: 'finale', text: 'Avec l\'avantage, je vais en finale et je gagne lentement, sans jamais laisser de contre-jeu.', task: "C'est une finale : trouve le coup gagnant." },
    ],
    openings: ['e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8'],
    tips: {
      ouverture: 'Un développement solide, et des pions qui prennent de l\'espace.',
      milieu: "Quelle pièce adverse manque de cases ? Restreins-la encore.",
      attaque: "Pas besoin de forcer. Si l'échec ne gagne rien, améliore plutôt une pièce.",
      defense: 'Coupe les lignes d\'attaque et échange les pièces dangereuses.',
      finale: 'Avance pas à pas, et ne laisse aucun contre-jeu à ton adversaire.',
    },
  },
  {
    id: 'kasparov', name: 'Garry Kasparov', reign: 'Champion du monde de 1985 à 2000',
    tagline: "L'énergie et l'initiative",
    style: { attaque: 0.9, tactique: 0.9, positionnel: 0.7, finale: 0.5, defense: 0.4 },
    intro: 'Je suis Garry Kasparov. J\'allie une préparation immense à un jeu plein d\'énergie. Pour moi, l\'initiative et l\'activité des pièces valent souvent plus qu\'un pion.',
    principles: [
      { title: 'Le dynamisme avant le matériel', theme: 'tactique', text: 'Je donne un pion pour accélérer mon attaque. Des pièces actives créent des combinaisons.', task: 'Une combinaison gagne du matériel. Les coups forcés d\'abord.' },
      { title: 'Attaque avec toutes tes pièces', theme: 'mat', text: 'Mes attaques réussissent parce que toutes mes pièces y participent.', task: 'Il y a un mat : regarde tous les échecs.' },
      { title: 'Calcule les coups forcés', theme: 'fourchette', text: 'Échecs, prises, menaces : je calcule d\'abord les coups qui ne laissent pas le choix.', task: 'Une attaque double gagne du matériel. Trouve-la.' },
    ],
    openings: ['e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8'],
    tips: {
      ouverture: "Joue l'ouverture avec énergie, occupe le centre et développe tout.",
      milieu: "Garde l'initiative, chaque coup doit poser une question à l'adversaire.",
      attaque: 'Tu peux donner échec ! Calcule les coups forcés, toutes tes pièces doivent participer.',
      defense: 'Cherche le contre-jeu actif plutôt que la défense passive.',
      finale: "En finale aussi, l'activité des pièces décide.",
    },
  },
  {
    id: 'carlsen', name: 'Magnus Carlsen', reign: 'Champion du monde de 2013 à 2023',
    tagline: 'La pression sans fin',
    style: { attaque: 0.5, tactique: 0.7, positionnel: 0.9, finale: 1, defense: 0.7 },
    intro: 'Je suis Magnus Carlsen. Je gagne des positions que d\'autres jugeraient égales : je joue longtemps, je pose des problèmes à chaque coup et je profite de la moindre imprécision, surtout en finale.',
    principles: [
      { title: 'Garde la pression', theme: 'clouage', text: 'Je maintiens la tension et j\'attends la faute. Un clouage maintenu fait souffrir l\'adversaire.', task: 'Un clouage gagne du matériel. Cherche les alignements.' },
      { title: 'Les petites positions se gagnent en finale', theme: 'finale', text: 'Même avec un tout petit avantage, je vais en finale et je finis par l\'emporter.', task: "C'est une finale : trouve le coup gagnant." },
      { title: "Punis l'imprécision", theme: 'prise', text: 'Je ne laisse passer aucune erreur : une pièce mal protégée est aussitôt cueillie.', task: 'Une pièce adverse est mal protégée. Gagne-la.' },
    ],
    openings: ['e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8'],
    tips: {
      ouverture: "Pas besoin d'une ouverture spectaculaire, une position saine suffit pour jouer.",
      milieu: "Pose un petit problème à chaque coup et attends l'imprécision.",
      attaque: "L'échec est tentant, mais le meilleur coup est parfois un coup calme qui garde la pression.",
      defense: 'Défends avec précision, puis reprends la pression.',
      finale: "C'est ton terrain ! Joue la finale longtemps, la faute adverse viendra.",
    },
  },
];

// Version anglaise : remplace les textes quand l'interface est en anglais (même ordre de principes)
(function () {
  if (window.LANG !== 'en') return;
  const up = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const tips = (n, o) => ({ ouverture: up(o[0]), milieu: up(o[1]), attaque: up(o[2]), defense: up(o[3]), finale: up(o[4]) });
  const EN = {
    steinitz: {
      reign: 'World champion from 1886 to 1894', tagline: 'The father of positional play',
      intro: 'I am Wilhelm Steinitz, the first official world champion. I showed that a game is not won by a wild attack but by piling up small advantages: an extra pawn, a strong square, a better-placed piece.',
      principles: [
        ['Only attack when you have an advantage', 'Attacking without an advantage weakens you. I always started by winning something concrete, even something small.', 'An enemy piece is poorly protected: win it cleanly, without exposing yourself.'],
        ['Pile up small advantages', 'One small advantage adds to the next. A pinned piece can no longer move: it is a weakness you can fix and exploit.', 'Use an alignment to win material.'],
        ['Defend calmly', 'I accepted being attacked when I saw the defense. Good defense means finding the move that neutralises the threat.', 'Your opponent threatens mate: find the defense.'],
      ],
      tips: tips('Steinitz', ['no adventures. Develop your pieces and keep a healthy pawn structure.', 'look for the small concrete advantage, a poorly defended piece or a weak square, before launching anything.', 'you have checks available, but only attack if your position is better. Otherwise, strengthen it first.', 'being attacked? Stay calm and look for the simplest defense.', 'in the endgame, your accumulated small advantages become decisive. Keep them.']),
    },
    lasker: {
      reign: 'World champion from 1894 to 1921', tagline: 'The pragmatic fighter',
      intro: 'I am Emanuel Lasker. I kept my title for 27 years, a record. I played the opponent as much as the position, defended stubbornly and never gave up a game.',
      principles: [
        ['Look for a better move', 'A saying often attributed to me: when you see a good move, look for a better one. Do not play the first move you like.', 'A combination wins material. Do not settle for the first move that comes to mind.'],
        ['Never give up', 'I saved positions everyone thought were lost. Even under threat, there is often a resource.', 'Your opponent threatens mate: find the resource.'],
        ['Knights come out early', 'I advised developing knights before bishops. An active knight can hit two targets at once.', 'A double attack wins material. Find it.'],
      ],
      tips: tips('Lasker', ['bring out your knights before your bishops, and castle early.', 'you have a good move in mind? Check whether there is a better one before playing it.', 'before giving check, look at every forcing move and choose the strongest.', 'do not panic. There is almost always a defense, look for it calmly.', 'in the endgame every pawn counts. Play to the end, even when it is tight.']),
    },
    capablanca: {
      reign: 'World champion from 1921 to 1927', tagline: 'The endgame machine',
      intro: 'I am José Raúl Capablanca. I played simply, and I advise studying endgames above all: when you know how to win an endgame, you know where to steer the game.',
      principles: [
        ['Simplify when you are ahead', 'With extra material, I trade pieces: the fewer pieces left, the more the advantage counts.', 'An enemy piece is poorly protected: win it simply.'],
        ['The king is a strong piece in the endgame', 'In the endgame there is no more mating danger: the king must march to the center and support its pawns.', 'It is an endgame: find the winning move.'],
        ['Simple, clear moves', 'I prefer the clear move to the complicated one. A well-spotted pin wins material without risk.', 'An enemy alignment can be exploited. Find the simple move.'],
      ],
      tips: tips('Capablanca', ['a simple, harmonious development, without useless pawn moves.', 'if you are ahead, look for trades that lead you to a winning endgame.', 'an attack is only useful if it wins something clear. Otherwise, simplify.', 'trade off the attacking pieces, and the threat disappears with them.', 'it is the endgame! Activate your king, centralise it and push your passed pawn.']),
    },
    alekhine: {
      reign: 'World champion from 1927 to 1935 and from 1937 to 1946', tagline: 'The inventive attacker',
      intro: 'I am Alexander Alekhine. I prepared my attacks carefully, then unleashed rich combinations. I seek the initiative right from the opening.',
      principles: [
        ['Take the initiative', 'I force my opponent to answer my threats. Whoever threatens chooses where the game is played.', 'A combination wins material. Start with the forcing moves.'],
        ['Mass your forces against the king', 'An attack succeeds when more pieces attack than defend. I bring everyone in.', 'There is a mate: look at every check.'],
        ['A better position creates combinations', 'Combinations do not fall from the sky: they appear when your pieces are more active.', 'A double attack wins material. Find it.'],
      ],
      tips: tips('Alekhine', ['seek the initiative from the opening, provoke the enemy pawns and aim at the center.', 'bring your pieces closer to the enemy king before attacking.', 'you can give check. Work out the forcing moves: a combination may be hiding there.', 'the best defense is often a counter-attack. Look for your own threat.', 'even in the endgame, keep your pieces active and create threats.']),
    },
    tal: {
      reign: 'World champion from 1960 to 1961', tagline: 'The magician from Riga',
      intro: 'I am Mikhail Tal, the magician from Riga. I sacrifice pieces to open up the enemy king and lead my opponent into a dark forest where calculations no longer add up.',
      principles: [
        ['Sacrifice to open the king', 'A sacrificed piece that opens the king is worth more than an extra piece. Mate counts, not material.', 'There is a mate: start with the checks, even the boldest.'],
        ['Create complications', 'I look for positions where every move is a threat. My opponent ends up going wrong.', 'A combination wins material. Forcing moves first.'],
        ['Activity before material', 'Active pieces hit several targets at once. I put my pieces where they strike.', 'A double attack wins material. Find it.'],
      ],
      tips: tips('Tal', ['develop fast and open the game, complications will come.', 'look at sacrifices around the enemy king. If it lacks defenders, dare.', 'you have checks! Calculate the sacrifices that open the enemy king.', 'hit back with a threat stronger than your opponent’s.', 'even in the endgame, active pieces are worth more than passive material.']),
    },
    petrosian: {
      reign: 'World champion from 1963 to 1969', tagline: 'The master of prophylaxis',
      intro: 'I am Tigran Petrosian. Before each move, I ask myself what my opponent wants to play, and I prevent it before the threat even exists.',
      principles: [
        ['Prophylaxis: what does my opponent want?', 'I look at my opponent\'s plan first. A threat prevented in time costs nothing.', 'Your opponent threatens mate: find the defense.'],
        ['Neutralise before attacking', 'I immobilise my opponent\'s pieces before taking action. A pinned piece no longer threatens anything.', 'A pin wins material. Look for pieces lined up.'],
        ['Safety first', 'I never leave a piece unprotected, and I punish my opponent\'s.', 'An enemy piece is poorly protected. Win it without taking risks.'],
      ],
      tips: tips('Petrosian', ['a solid position first. Castle and protect your pieces.', 'before moving, ask yourself what your opponent wants to do, and stop it.', 'a check is only useful if it improves your position. Check your own safety first.', 'reinforce the attacked point before the threat becomes real.', 'in the endgame, give no chance of counterplay. Blockade the enemy pawns.']),
    },
    fischer: {
      reign: 'World champion from 1972 to 1975', tagline: 'Clarity and precision',
      intro: 'I am Bobby Fischer. I play clear, precise moves and fight to win every game down to the last pawn. My pieces, especially my bishops, are always active.',
      principles: [
        ['Punish slow development', 'I develop quickly and punish opponents who leave a piece poorly protected.', 'An enemy piece is poorly protected: win it.'],
        ['Every piece must work', 'A passive piece is useless. I place mine where they hit several targets.', 'A double attack wins material. Find it.'],
        ['Play to win until the end', 'I convert my endgames with precision. I do not offer draws, I play.', 'It is an endgame: find the winning move.'],
      ],
      tips: tips('Fischer', ['develop fast, castle, and put your bishops on the long diagonals.', 'find your least active piece and give it a job.', 'be precise. Calculate to the end before launching the attack.', 'defend with active moves, not by retreating.', 'the endgame is won with precision. Activate your king and your rooks.']),
    },
    karpov: {
      reign: 'World champion from 1975 to 1985', tagline: 'The boa constrictor',
      intro: 'I am Anatoly Karpov. I smother my opponents: one by one I take away the good squares of their pieces, until they have no useful move left.',
      principles: [
        ['Restrict the enemy pieces', 'I love to pin and immobilise. A piece that can no longer move will be lost sooner or later.', 'A pin or a skewer wins material.'],
        ['Improve your worst piece', 'When nothing is urgent, I improve my worst-placed piece, then pick up poorly defended material.', 'An enemy piece is poorly protected. Win it.'],
        ['Convert without risk', 'With the advantage, I go into the endgame and win slowly, never allowing counterplay.', 'It is an endgame: find the winning move.'],
      ],
      tips: tips('Karpov', ['a solid development, and pawns that gain space.', 'which enemy piece lacks squares? Restrict it even more.', 'no need to force. If the check wins nothing, improve a piece instead.', 'cut the lines of attack and trade off the dangerous pieces.', 'advance step by step, and give your opponent no counterplay.']),
    },
    kasparov: {
      reign: 'World champion from 1985 to 2000', tagline: 'Energy and initiative',
      intro: 'I am Garry Kasparov. I combine immense preparation with energetic play. For me, initiative and piece activity are often worth more than a pawn.',
      principles: [
        ['Dynamism before material', 'I give a pawn to speed up my attack. Active pieces create combinations.', 'A combination wins material. Forcing moves first.'],
        ['Attack with all your pieces', 'My attacks succeed because all my pieces take part.', 'There is a mate: look at every check.'],
        ['Calculate the forcing moves', 'Checks, captures, threats: I first calculate the moves that leave no choice.', 'A double attack wins material. Find it.'],
      ],
      tips: tips('Kasparov', ['play the opening with energy, take the center and develop everything.', 'keep the initiative, every move must ask your opponent a question.', 'you can give check! Calculate the forcing moves, all your pieces must take part.', 'look for active counterplay rather than passive defense.', 'in the endgame too, piece activity decides.']),
    },
    carlsen: {
      reign: 'World champion from 2013 to 2023', tagline: 'Endless pressure',
      intro: 'I am Magnus Carlsen. I win positions others would call equal: I play long, pose problems with every move and take advantage of the slightest inaccuracy, especially in the endgame.',
      principles: [
        ['Keep the pressure', 'I keep the tension and wait for the mistake. A pin that stays on makes my opponent suffer.', 'A pin wins material. Look for pieces lined up.'],
        ['Small edges are won in the endgame', 'Even with a tiny advantage, I go into the endgame and end up winning.', 'It is an endgame: find the winning move.'],
        ['Punish inaccuracy', 'I let no mistake slip: a poorly protected piece is picked up at once.', 'An enemy piece is poorly protected. Win it.'],
      ],
      tips: tips('Carlsen', ['no need for a spectacular opening, a sound position is enough to play.', 'pose a small problem with every move and wait for the inaccuracy.', 'the check is tempting, but the best move is sometimes a quiet one that keeps the pressure.', 'defend precisely, then take back the pressure.', 'it is your territory! Play the endgame long, the mistake will come.']),
    },
  };
  for (const c of window.CHAMPIONS) {
    const e = EN[c.id];
    if (!e) continue;
    Object.assign(c, { reign: e.reign, tagline: e.tagline, intro: e.intro, tips: e.tips });
    c.principles.forEach((p, i) => { [p.title, p.text, p.task] = e.principles[i]; });
  }
})();
