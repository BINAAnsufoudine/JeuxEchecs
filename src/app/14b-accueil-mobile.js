  /* ---------- Accueil sur mobile : chaque panneau se replie sous son titre et un petit résumé ---------- */
  // Sur téléphone et tablette, l'accueil affiche d'abord la liste des panneaux (titre + résumé en petits
  // caractères) ; un appui sur un titre déplie son contenu. Sur ordinateur, rien ne change.
  const homeAccQ = (sel) => document.querySelector(sel);
  const homeAccText = (sel) => { const el = homeAccQ(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  const HOME_ACC = [
    { id: 'profile', icon: '👤', title: () => L('Mon profil', 'My profile'), nodes: ['#home .player-profile'],
      sum: () => [homeAccText('#home-player-name'), homeAccText('#home-player-elo')].filter(Boolean).join(' · ') },
    { id: 'welcome', icon: '✨', title: () => homeAccText('#home-hero-kicker') || L('Ton aventure', 'Your adventure'), nodes: ['#home .home-welcome'],
      sum: () => homeAccText('#home-hero-title') },
    { id: 'theme', icon: '🌍', title: () => homeAccText('#home-theme-heading') || L('Ton thème', 'Your theme'), nodes: ['#home .home-garden-heading', '#home .home-tropical-layout'],
      sum: () => [homeAccText('#home-garden-grade'), homeAccText('#home-rice-amount')].filter(Boolean).join(' · ') },
    { id: 'journey', icon: '🗺️', title: () => homeAccText('#world-journey-title') || L('Parcours des mondes', 'World journey'), nodes: ['#world-journey'],
      sum: () => homeAccText('#world-journey-next') || L('Collectionne les titres de chaque monde', 'Collect each world’s titles'),
      onOpen: () => { const t = homeAccQ('#world-journey-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); } },
    { id: 'activities', icon: '🎯', title: () => L('Qu’est-ce qu’on fait ?', 'What shall we do?'), nodes: ['#home .home-dashboard > .home-section-heading:not(.home-garden-heading):not(.home-progress-heading)', '#home .home-activity-grid'],
      sum: () => L('Mon parcours · Apprendre · Jouer', 'My path · Learn · Play') },
    { id: 'quests', icon: '🏆', title: () => L('Défis du jour', 'Daily challenges'), nodes: ['#home .home-progress-heading', '#btn-home-rewards'],
      sum: () => [homeAccText('#home-quest-count'), homeAccText('#home-quest-title')].filter(Boolean).join(' · ') },
  ];
  const homeAccOpen = new Set(store.get('homeAccOpen', []));
  function setupHomeAccordion() {
    for (const g of HOME_ACC) {
      const nodes = g.nodes.map((sel) => homeAccQ(sel)).filter(Boolean);
      if (!nodes.length || document.querySelector(`.m-acc[data-m-acc="${g.id}"]`)) continue;
      const head = document.createElement('button');
      head.type = 'button'; head.className = 'm-acc'; head.dataset.mAcc = g.id;
      head.innerHTML = `<span class="m-acc-icon" aria-hidden="true">${g.icon}</span><span class="m-acc-copy"><b></b><small></small></span><span class="m-acc-arrow" aria-hidden="true">›</span>`;
      nodes[0].before(head);
      nodes.forEach((n) => { n.classList.add('m-acc-item'); n.dataset.mAccGroup = g.id; });
      head.addEventListener('click', () => {
        const open = !homeAccOpen.has(g.id);
        if (open) homeAccOpen.add(g.id); else homeAccOpen.delete(g.id);
        store.set('homeAccOpen', [...homeAccOpen]);
        applyHomeAccordion();
        if (open && g.onOpen) g.onOpen();
      });
    }
    applyHomeAccordion();
  }
  function applyHomeAccordion() {
    for (const g of HOME_ACC) {
      const head = document.querySelector(`.m-acc[data-m-acc="${g.id}"]`); if (!head) continue;
      const open = homeAccOpen.has(g.id);
      head.classList.toggle('m-open', open); head.setAttribute('aria-expanded', String(open));
      head.querySelector('b').textContent = g.title();
      head.querySelector('small').textContent = g.sum();
      document.querySelectorAll(`[data-m-acc-group="${g.id}"]`).forEach((n) => n.classList.toggle('m-open', open));
    }
  }
  setupHomeAccordion();
