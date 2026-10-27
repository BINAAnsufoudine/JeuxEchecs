/* Icônes décoratives pour les commandes de l'application (univers Ninja). */
(() => {
  const iconRules = [
    [/retour|back|précédent|previous|fermer|close|annuler|cancel|undo/i, '↩️'],
    [/réglage|paramètre|setting|option/i, '⚙️'],
    [/valider|confirmer|confirm|submit|commencer|start|continuer|continue|reprendre/i, '✅'],
    [/indice|hint|aide|help/i, '💡'],
    [/solution|réponse|answer/i, '👁️'],
    [/suivant|next|étape|step/i, '➡️'],
    [/voix|voice|parler|prononcer|audio|son/i, '🔊'],
    [/envoyer|send|message/i, '📨'],
    [/chat|discussion/i, '💬'],
    [/partager|share|lien|link/i, '🔗'],
    [/copier|copy/i, '📋'],
    [/exporter|export|télécharger|download/i, '📤'],
    [/importer|import|charger|ouvrir|open|fichier|file/i, '📥'],
    [/supprimer|effacer|delete|remove/i, '🗑️'],
    [/analyser|analyse|analysis/i, '🔍'],
    [/indice|recherche|search|filtrer|filter/i, '🔎'],
    [/tourner|retourner|flip|orienter/i, '🔄'],
    [/jouer|partie|coup|move|échecs|chess/i, '⚔️'],
    [/problème|puzzle|défi|challenge|exercice/i, '🎯'],
    [/leçon|cours|apprendre|lesson|learn|tutoriel/i, '📜'],
    [/tournoi|champion|récompense|reward|grade/i, '🏆'],
    [/profil|compte|player|account/i, '🥷'],
    [/boutique|shop|achat|acheter|buy/i, '🪙'],
    [/statistique|progression|progrès|stats|progress/i, '📈'],
    [/thème|theme|apparence|couleur|décor/i, '🎨'],
    [/position|échiquier|board|setup/i, '🧩'],
    [/indice|conseil|règle|rule|conseil/i, '📖'],
    [/replay|rejouer|lecture|playback/i, '⏯️'],
    [/nulle|draw|égalité/i, '🤝'],
    [/abandon|resign|quitter|exit/i, '🏳️'],
  ];
  const alreadyIcon = /^[\s\p{Extended_Pictographic}\u200d\ufe0f\u2190-\u21ff\u2300-\u23ff\u25a0-\u27ff\u2934-\u2935\u2b00-\u2bff½]+/u;
  const containsIcon = /[\p{Extended_Pictographic}\u2190-\u21ff\u2300-\u23ff\u25a0-\u27ff\u2934-\u2935\u2b00-\u2bff½]/u;

  function decorate(button) {
    if (!(button instanceof HTMLButtonElement)) return;
    // L'icône est recalculée à chaque changement du bouton : une icône ajoutée
    // ensuite dans son contenu ne doit pas rester doublée par le pseudo-élément.
    delete button.dataset.uiIcon;
    // Les cases du mini-échiquier affichent les pièces de la position : ne pas
    // leur ajouter l’icône Ninja de repli, y compris sur les cases vides.
    if (button.closest('.minimap, .ed-board') || button.matches('.home-collection-tab') || button.querySelector('.menu-icon')) return;
    // Priorité à l’icône visible du bouton (ex. les commandes de replay) avant
    // les libellés accessibles, qui ne contiennent souvent que le nom d’action.
    const visible = button.innerText || button.textContent || '';
    if (containsIcon.test(visible)) return;
    const text = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''} ${visible}`.trim();
    if (!text || alreadyIcon.test(text)) return;
    const rule = iconRules.find(([pattern]) => pattern.test(text));
    button.dataset.uiIcon = rule ? rule[1] : '🥷';
  }

  function scan(root = document) {
    if (root instanceof HTMLButtonElement) decorate(root);
    root.querySelectorAll?.('button').forEach(decorate);
  }

  scan();
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      });
      else if (record.target instanceof Element) {
        const button = record.target.closest('button');
        if (button) { delete button.dataset.uiIcon; decorate(button); }
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
