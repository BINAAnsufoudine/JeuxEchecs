  /* ---------- Version complète (payante) ---------- */
  // Gratuit : Échecs en bois et Antiquité, la partie contre l'ordinateur sans pendule, le jeu en ligne, le tutoriel.
  // Version complète : les autres thèmes, les entraînements, les problèmes, les analyses, la partie coachée,
  // la partie contre l'ordinateur avec pendule et les tournois.
  // L'interrupteur reste à false tant que le paiement n'est pas branché : rien n'est bloqué pour les joueurs.
  const PAYWALL_ON = false;
  const PAYMENT_URL = ''; // page de paiement, une fois le mode d'encaissement choisi
  const PAID_SCREENS = new Set(['problems', 'theme', 'program', 'champions', 'tournaments', 'otb']);
  // Accès complet : marque « premium » posée sur le compte par l'administrateur ou par le paiement (jamais par le joueur)
  const hasPremium = () => !PAYWALL_ON || !!(typeof ON !== 'undefined' && ON && ((ON.isAdmin && ON.isAdmin()) || (ON.isPremium && ON.isPremium())));
  const PREMIUM_FEATURES = {
    themes: L('Ce thème', 'This theme'), training: L('Les entraînements', 'Training'), problems: L('Les problèmes', 'Puzzles'),
    analysis: L('L’analyse des parties', 'Game analysis'), clock: L('La partie contre l’ordinateur avec pendule', 'Clock games against the computer'),
    coach: L('La partie coachée', 'Coached games'), tournaments: L('Les tournois', 'Tournaments'),
  };
  function openUpgrade(feature) {
    const what = PREMIUM_FEATURES[feature] || L('Cette fonction', 'This feature');
    const actions = PAYMENT_URL
      ? [{ label: L('Passer à la version complète', 'Get the full version'), primary: true, onClick: () => { window.open(PAYMENT_URL, '_blank', 'noopener'); } }]
      : [];
    actions.push({ label: L('Plus tard', 'Later'), ghost: true });
    modal({
      title: L('Version complète', 'Full version'),
      text: L(`${what} fait partie de la version complète, avec tous les thèmes, les entraînements, les problèmes, les analyses de parties, la partie coachée, la pendule contre l’ordinateur et les tournois. Gratuit pour tous : Échecs en bois, Antiquité, la partie contre l’ordinateur sans pendule et le jeu en ligne.${PAYMENT_URL ? '' : ' Le paiement arrive bientôt.'}`,
        `${what} is part of the full version, with every theme, training, puzzles, game analysis, coached games, clock games against the computer and tournaments. Free for everyone: Wooden chess, Ancient warriors, games against the computer without a clock, and online play.${PAYMENT_URL ? '' : ' Payment is coming soon.'}`),
      actions,
    });
  }
  // À appeler avant d'ouvrir une fonction payante : true si on peut continuer, sinon l'écran de la version complète s'ouvre
  function premiumOk(feature) {
    if (hasPremium()) return true;
    openUpgrade(feature);
    return false;
  }
  function premiumScreenOk(id) {
    if (!PAID_SCREENS.has(id)) return true;
    return premiumOk(id === 'tournaments' || id === 'otb' ? 'tournaments' : id === 'problems' || id === 'theme' ? 'problems' : 'training');
  }
