  /* ---------- Tournoi en réel : l'appli organise un tournoi joué sur de vrais échiquiers ---------- */
  // Les noms sont saisis librement et numérotés ; à chaque ronde, l'appli annonce les tables (qui joue contre qui,
  // avec quelle couleur), on saisit les résultats, puis elle calcule la ronde suivante jusqu'au classement final.
  // Tout reste sur l'appareil (hors connexion). Calculs : otb.js.
  const OTB = window.OTB;
  const FORMAT_NAMES = L({ swiss: 'Système suisse', rr: 'Toutes rondes', rr2: 'Toutes rondes aller-retour', ko: 'Élimination directe' },
    { swiss: 'Swiss system', rr: 'Round robin', rr2: 'Double round robin', ko: 'Knockout' });
  let otbId = null, otbTab = 'round', otbNew = null;
  // Classement cumulé : tournois choisis et nombre de joueurs à afficher
  let otbBest = null;
  // Tournois partagés par d'autres joueurs (lecture seule), et celui qu'on regarde en direct
  let otbShared = [], otbView = null, otbStopWatch = null;
  let otbFallback = null, otbWarned = false;
  const otbList = () => otbFallback || store.get('otb', []);
  // Enregistre la liste et vérifie qu'elle a bien été écrite : si la mémoire de l'appareil est pleine,
  // le tournoi continue en mémoire (et sur le compte en ligne) et on prévient l'organisateur
  function otbWrite(list) {
    store.set('otb', list);
    const back = store.get('otb', null), ok = !!back && back.length === list.length && (!list[0] || (back[0].id === list[0].id && back[0].updatedAt === list[0].updatedAt));
    otbFallback = ok ? null : list;
    if (!ok && !otbWarned) {
      otbWarned = true;
      modal({ title: L('Mémoire de l’appareil pleine', 'Device storage full'), text: L('Le tournoi continue, mais il ne peut plus être enregistré sur cet appareil : ne ferme pas et ne rafraîchis pas la page. Connecte-toi pour qu’il soit gardé sur ton compte, ou libère de la place (Réglages > Ma progression).', 'The tournament goes on, but it can no longer be saved on this device: do not close or refresh the page. Sign in so it is kept on your account, or free some space.'), actions: [{ label: 'OK', primary: true }] });
    }
  }
  const otbGet = () => (otbView && otbId === otbView.key ? otbView.t : otbList().find((t) => t.id === otbId) || null);
  // Enregistré sur l'appareil, puis (compte connecté) sur le compte en ligne, quelques instants après la dernière saisie
  let otbUpload = null;
  // Nombre de tournois en cours, affiché sur le bouton du menu
  function updateOtbCount() {
    const n = otbList().filter((t) => t.status !== 'over').length, el = $('otb-count');
    el.hidden = !n; el.textContent = n;
    el.title = L(`${n} tournoi${n > 1 ? 's' : ''} en cours`, `${n} tournament${n === 1 ? '' : 's'} in progress`);
  }
  function otbSave(t) {
    t.updatedAt = Date.now();
    const list = otbList().filter((x) => x.id !== t.id); list.unshift(t); otbWrite(list.slice(0, 50)); updateOtbCount();
    if (!ON || !ON.user) return;
    clearTimeout(otbUpload);
    otbUpload = setTimeout(() => ON.saveOtb(t).catch(() => {}), 1500);
  }
  // Historique du compte : les tournois créés sur un autre appareil reviennent ici (le plus récent l'emporte)
  async function otbSync() {
    if (!ON || !ON.user) { otbShared = []; return; }
    try {
      await ON.load();
      const [mine, shared] = await Promise.all([ON.myOtbs(), ON.sharedOtbs()]);
      const local = otbList(), byId = new Map(local.map((t) => [t.id, t]));
      const gone = new Set(store.get('otbDeleted', []));
      for (const t of mine) {
        if (gone.has(t.id)) { ON.deleteOtb(t).catch(() => {}); continue; } // supprimé sur un appareil : on finit de l'effacer du compte
        const l = byId.get(t.id); if (!l || (t.updatedAt || 0) > (l.updatedAt || 0)) byId.set(t.id, t);
      }
      // les tournois de l'appareil pas encore envoyés partent sur le compte
      for (const t of local) if (!mine.some((m) => m.id === t.id)) ON.saveOtb(t).catch(() => {});
      otbWrite([...byId.values()].sort((a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id)).slice(0, 50)); updateOtbCount();
      otbShared = shared;
    } catch { /* hors ligne : on garde l'appareil */ }
  }
  const otbReadOnly = (t) => !!(otbView && otbView.t === t);
  // Suppression par son créateur, quel que soit son statut ; retenue pour qu'aucune copie (compte, autre appareil) ne la fasse revenir
  function deleteOtbTournament(t) {
    clearTimeout(otbUpload);
    store.set('otbDeleted', [...new Set([...store.get('otbDeleted', []), t.id])].slice(-200));
    otbWrite(otbList().filter((x) => x.id !== t.id)); updateOtbCount();
    if (ON && ON.user) ON.deleteOtb(t).catch(() => {});
    otbId = null; renderOtb();
    toast(L('Tournoi supprimé.', 'Tournament deleted.'));
  }
  const who = (t, no) => { const e = OTB.byNo(t, no); return e ? `<span class="otb-no">${no}</span> ${escHtml(e.name)}` : '—'; };
  const plain = (t, no) => { const e = OTB.byNo(t, no); return e ? `${no}. ${e.name}` : '—'; };
  // Infos pratiques : date, heure de début, lieu, référent
  const fmtOtbDate = (d) => { if (!d) return ''; const x = new Date(`${d}T12:00`); return isNaN(x) ? d : x.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  function otbInfoLine(t, sep = ' · ') {
    const i = t.info || {}, parts = [];
    if (i.date) parts.push(`📅 ${fmtOtbDate(i.date)}${i.time ? ` ${L('à', 'at')} ${i.time.replace(':', ' h ')}` : ''}`);
    else if (i.time) parts.push(`🕘 ${i.time.replace(':', ' h ')}`);
    if (i.place) parts.push(`📍 ${escHtml(i.place)}`);
    if (i.referee) parts.push(`🧑‍⚖️ ${L('Référent', 'Organiser')} : ${escHtml(i.referee)}`);
    return parts.join(sep);
  }
  const infoFields = (i) => `<div class="otb-info-grid">
      <label><span class="field-label">${L('Date', 'Date')}</span><input id="otb-date" type="date" class="otb-input" value="${escHtml(i.date || '')}"></label>
      <label><span class="field-label">${L('Heure de début', 'Start time')}</span><input id="otb-time" type="time" class="otb-input" value="${escHtml(i.time || '')}"></label>
      <label class="wide"><span class="field-label">${L('Lieu', 'Venue')}</span><input id="otb-place" class="otb-input" maxlength="80" value="${escHtml(i.place || '')}" placeholder="${L('Salle, école, adresse…', 'Hall, school, address…')}"></label>
      <label class="wide"><span class="field-label">${L('Référent (arbitre ou organisateur)', 'Organiser (arbiter or contact)')}</span><input id="otb-referee" class="otb-input" maxlength="60" value="${escHtml(i.referee || '')}" placeholder="${L('Nom et téléphone', 'Name and phone')}"></label>
    </div>`;
  const readInfo = () => ({ date: $('otb-date').value, time: $('otb-time').value, place: $('otb-place').value.trim(), referee: $('otb-referee').value.trim() });
  function closeOtbView() { if (otbStopWatch) otbStopWatch(); otbStopWatch = null; otbView = null; }
  function openOtb() { returnTo = 'home'; closeOtbView(); otbBest = null; otbDir = null; otbId = null; otbNew = null; show('otb'); renderOtb(); otbSync().then(() => { if (document.body.dataset.screen === 'otb' && !otbId && !otbNew) renderOtb(); }); }
  $('btn-otb').onclick = openOtb;
  // Après un rafraîchissement de la page : retour au tournoi qui était ouvert, sur le même onglet
  function restoreOtb() {
    const last = store.get('lastOtb', null); // lu avant openOtb, qui le remet à zéro
    openOtb();
    if (last && otbList().some((t) => t.id === last.id)) { otbId = last.id; otbTab = last.tab || 'round'; renderOtb(); }
  }
  updateOtbCount();

  function renderOtb() {
    const t = otbGet();
    store.set('lastOtb', t && !otbReadOnly(t) ? { id: t.id, tab: otbTab } : null); // rouvert après un rafraîchissement
    $('otb-title').textContent = t ? t.name : L('Tournoi en réel', 'Over-the-board tournament');
    if (otbNew) return renderOtbSetup();
    if (otbBest) { $('otb-title').textContent = L('Meilleurs joueurs', 'Best players'); return renderOtbBest(); }
    if (otbDir) { $('otb-title').textContent = L('Joueurs des tournois', 'Tournament players'); return renderOtbDir(); }
    if (!t) return renderOtbHome();
    renderOtbTournament(t);
  }
  // Tournois disponibles pour le classement cumulé : les miens, puis ceux partagés avec moi (clé « s:… »)
  const bestSources = () => [...otbList().map((t) => ({ key: String(t.id), t, owner: null })), ...otbShared.map((s) => ({ key: `s:${s.docId}`, t: s.t, owner: s.ownerName }))];
  function renderOtbBest() {
    const sources = bestSources(), sel = otbBest.sel, chosen = sources.filter((s) => sel.has(s.key)).map((s) => s.t);
    const rows = OTB.aggregate(chosen, otbBest.by), top = rows.slice(0, otbBest.top);
    const medals = (x) => `${'🥇'.repeat(x.gold)}${'🥈'.repeat(x.silver)}${'🥉'.repeat(x.bronze)}` || '—';
    $('otb-body').innerHTML = `<p class="level-help">${L('Coche les tournois à prendre en compte : l’appli additionne les résultats de chaque joueur (reconnu par son nom) et les classe. En équipe, ce sont les parties de chaque joueur à son échiquier qui comptent.', 'Tick the tournaments to include: the app adds up each player’s results (matched by name) and ranks them. In team events, each player’s own board games count.')}</p>
      <div class="otb-best-tools"><button type="button" class="btn ghost" data-otb="best-all">${L('Tout cocher', 'Select all')}</button><button type="button" class="btn ghost" data-otb="best-none">${L('Tout décocher', 'Clear')}</button></div>
      <div class="otb-best-list">${sources.map(({ key, t, owner }) => `<label class="switch"><input type="checkbox" data-otb-pick="${escHtml(key)}"${sel.has(key) ? ' checked' : ''}><span>${owner ? '👁️' : t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}${owner ? ` · ${L(`partagé par ${escHtml(owner)}`, `shared by ${escHtml(owner)}`)}` : ''}${t.info && t.info.date ? ` · ${fmtOtbDate(t.info.date)}` : ''}${t.status === 'over' ? '' : ` · ${L('en cours', 'in progress')}`}</span></label>`).join('')}</div>
      <label class="field-label">${L('Classer par', 'Rank by')}</label>
      <div class="ed-seg otb-tabs">${[['points', L('Points marqués', 'Points scored')], ['places', L('Places obtenues', 'Places achieved')]].map(([v, label]) => `<button type="button" data-otb-by="${v}" class="${otbBest.by === v ? 'on' : ''}">${label}</button>`).join('')}</div>
      <label class="field-label" for="otb-top">${L('Nombre de joueurs à afficher', 'Number of players to show')}</label>
      <input id="otb-top" class="otb-input otb-small" type="number" min="1" max="200" value="${otbBest.top}">
      <h3 class="train-h">${L(`Les ${top.length} meilleurs joueurs`, `Top ${top.length} players`)} <span class="otb-count">${chosen.length} ${L(chosen.length > 1 ? 'tournois' : 'tournoi', chosen.length === 1 ? 'tournament' : 'tournaments')}</span></h3>
      ${top.length ? `<div class="tour-scroll"><table class="tour-table otb-best"><tr><th>${L('Rang', 'Rank')}</th><th>${L('Joueur', 'Player')}</th><th>${L('Points', 'Points')}</th><th>${L('Parties', 'Games')}</th><th>${L('V', 'W')}</th><th>${L('N', 'D')}</th><th>${L('D', 'L')}</th><th>%</th><th>${L('Tournois', 'Events')}</th><th>${L('Podiums', 'Podiums')}</th><th>${L('Meilleure place', 'Best place')}</th></tr>
        ${top.map((x, i) => `<tr><td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td><b>${escHtml(x.name)}</b></td><td><b>${x.pts}</b></td><td>${x.games}</td><td>${x.wins}</td><td>${x.draws}</td><td>${x.losses}</td><td>${x.pct}&nbsp;%</td><td>${x.tournaments}</td><td>${medals(x)}</td><td>${x.best ? `${x.best}${x.best === 1 ? L('er', 'st') : L('e', 'th')}` : '—'}</td></tr>`).join('')}</table></div>
        <p class="level-help">${otbBest.by === 'places' ? L('Classement par places : titres (🥇), puis 2es places, puis 3es places, puis meilleure place, puis points.', 'By places: wins (🥇), then 2nd places, then 3rd places, then best place, then points.') + ' ' : ''}${L('Points marqués : points, puis pourcentage de points marqués, puis victoires. V/N/D : victoires, nulles, défaites (les forfaits comptent dans les points mais pas dans les parties). Podiums et meilleure place : tournois terminés seulement.', 'Order: points, then score percentage, then wins. W/D/L: wins, draws, losses (forfeits count in points but not as games). Podiums and best place: finished tournaments only.')}</p>
        <div class="actions"><button type="button" class="btn" data-otb="best-print">🖨️ ${L('Imprimer', 'Print')}</button></div>`
        : `<p class="level-help">${L('Coche au moins un tournoi.', 'Tick at least one tournament.')}</p>`}
      <div class="actions"><button type="button" class="btn ghost" data-otb="best-close">${L('Mes tournois', 'My tournaments')}</button></div>`;
  }
  function printOtbBest() {
    const chosen = bestSources().filter((s) => otbBest.sel.has(s.key)).map((s) => s.t), top = OTB.aggregate(chosen, otbBest.by).slice(0, otbBest.top);
    const doc = `<!doctype html><html lang="${window.LANG === 'en' ? 'en' : 'fr'}"><head><meta charset="utf-8"><title>${L('Meilleurs joueurs', 'Best players')}</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #999;padding:6px 8px;text-align:left}</style></head><body>
      <h1>${L(`Les ${top.length} meilleurs joueurs`, `Top ${top.length} players`)}</h1><div>${chosen.map((t) => escHtml(t.name)).join(' · ')}</div>
      <table><tr><th>#</th><th>${L('Joueur', 'Player')}</th><th>${L('Points', 'Points')}</th><th>${L('Parties', 'Games')}</th><th>${L('V', 'W')}</th><th>${L('N', 'D')}</th><th>${L('D', 'L')}</th><th>%</th><th>${L('Tournois', 'Events')}</th><th>🥇</th><th>🥈</th><th>🥉</th></tr>
      ${top.map((x, i) => `<tr><td>${i + 1}</td><td>${escHtml(x.name)}</td><td>${x.pts}</td><td>${x.games}</td><td>${x.wins}</td><td>${x.draws}</td><td>${x.losses}</td><td>${x.pct} %</td><td>${x.tournaments}</td><td>${x.gold}</td><td>${x.silver}</td><td>${x.bronze}</td></tr>`).join('')}</table>
      <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast(L('Autorise les fenêtres pour imprimer.', 'Allow pop-ups to print.'));
    w.document.write(doc); w.document.close();
  }
  const KO_ROUNDS = L({ barrage: 'Tour de barrage', final: 'Finale', semi: 'Demi-finales', quarter: 'Quarts de finale', eighth: 'Huitièmes de finale' },
    { barrage: 'Play-in round', final: 'Final', semi: 'Semi-finals', quarter: 'Quarter-finals', eighth: 'Round of 16' });
  const roundName = (t, no) => KO_ROUNDS[OTB.koStage(t, no)] || L(`Ronde ${no}`, `Round ${no}`);
  const otbSection = (title, items, card) => (items.length ? `<h3 class="train-h">${title} <span class="otb-count">${items.length}</span></h3><div class="replay-items">${items.map(card).join('')}</div>` : '');
  function renderOtbHome() {
    const list = otbList();
    $('otb-body').innerHTML = `<p class="level-help">${L('Pour un tournoi joué sur de vrais échiquiers : saisis les noms, l’appli annonce à chaque ronde qui joue contre qui, tu entres les résultats, et elle s’occupe du reste jusqu’au classement final.', 'For a tournament played on real boards: enter the names, the app announces each round who plays whom, you enter the results, and it handles the rest up to the final standings.')}</p>
      <button type="button" class="btn primary wide" data-otb="new">➕ ${L('Nouveau tournoi', 'New tournament')}</button>
      <button type="button" class="btn wide otb-best-btn" data-otb="dir">👥 ${L('Joueurs des tournois', 'Tournament players')}</button>
      ${list.length || otbShared.length ? `<button type="button" class="btn wide otb-best-btn" data-otb="best">📊 ${L('Meilleurs joueurs sur plusieurs tournois', 'Best players across tournaments')}</button>` : ''}
      ${ON && ON.user ? '' : `<p class="level-help">${L('Connecte-toi pour garder l’historique de tes tournois sur ton compte et les partager avec d’autres joueurs.', 'Sign in to keep your tournament history on your account and share it with other players.')}</p>`}
      ${otbShared.length ? `<h3 class="train-h">${L('Partagés avec moi', 'Shared with me')}</h3><div class="replay-items">${otbShared.map((s) => `<button type="button" class="btn replay-item" data-otb-shared="${s.docId}"><strong>👁️ ${escHtml(s.t.name)}</strong><span>${L(`Organisé par ${escHtml(s.ownerName)}`, `Organised by ${escHtml(s.ownerName)}`)}${s.t.info && s.t.info.date ? ` · ${fmtOtbDate(s.t.info.date)}` : ''} · ${s.t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${s.t.rounds.length} sur ${s.t.totalRounds}`, `round ${s.t.rounds.length} of ${s.t.totalRounds}`)}</span></button>`).join('')}</div>` : ''}
      ${otbSection(L('Tournois en cours', 'Tournaments in progress'), list.filter((t) => t.status !== 'over'), (t) => `<button type="button" class="btn replay-item" data-otb-open="${t.id}"><strong>${t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}</strong><span>${t.info && t.info.date ? `${fmtOtbDate(t.info.date)} · ` : ''}${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L('équipes', 'teams') : L('joueurs', 'players')} · ${t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${t.rounds.length} sur ${t.totalRounds}`, `round ${t.rounds.length} of ${t.totalRounds}`)}</span></button>`)}
      ${otbSection(L('Tournois terminés', 'Finished tournaments'), list.filter((t) => t.status === 'over'), (t) => `<button type="button" class="btn replay-item" data-otb-open="${t.id}"><strong>${t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}</strong><span>${t.info && t.info.date ? `${fmtOtbDate(t.info.date)} · ` : ''}${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L('équipes', 'teams') : L('joueurs', 'players')} · ${t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${t.rounds.length} sur ${t.totalRounds}`, `round ${t.rounds.length} of ${t.totalRounds}`)}</span></button>`)}`;
  }

  /* ----- Création ----- */
  function renderOtbSetup() {
    const f = otbNew, team = f.type === 'team';
    const seg = (name, opts) => `<div class="ed-seg" data-otb-seg="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${String(f[name]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const n = parseEntrants(f).length;
    $('otb-body').innerHTML = `<label class="field-label" for="otb-name">${L('Nom du tournoi', 'Tournament name')}</label>
      <input id="otb-name" class="otb-input" maxlength="50" value="${escHtml(f.name)}" placeholder="${L('Tournoi du club', 'Club tournament')}">
      ${infoFields(f)}
      <label class="field-label">${L('Type', 'Type')}</label>${seg('type', [['solo', L('Individuel', 'Individual')], ['team', L('Par équipes', 'Teams')]])}
      <label class="field-label">${L('Formule', 'Format')}</label>${seg('format', [['swiss', L('Suisse', 'Swiss')], ['rr', L('Toutes rondes', 'Round robin')], ['rr2', L('Aller-retour', 'Double RR')], ['ko', L('Élimination', 'Knockout')]])}
      <p class="level-help">${{ swiss: L('Chaque ronde oppose des joueurs qui ont le même nombre de points, sans jamais rejouer le même adversaire. Idéal pour un grand groupe.', 'Each round pairs players with the same score, never the same opponent twice. Ideal for a big group.'), rr: L('Chacun rencontre tout le monde une fois.', 'Everyone meets everyone once.'), rr2: L('Chacun rencontre tout le monde deux fois, une fois avec chaque couleur.', 'Everyone meets everyone twice, once with each colour.'), ko: L('Le perdant est éliminé. En cas de nulle, tu désignes qui passe après une partie de départage.', 'The loser is out. After a draw, you choose who goes through after a tie-break game.') }[f.format]}</p>
      ${f.format === 'swiss' ? `<label class="field-label" for="otb-rounds">${L('Nombre de rondes', 'Number of rounds')}</label><input id="otb-rounds" class="otb-input otb-small" type="number" min="1" max="15" value="${f.rounds || OTB.suggestedRounds(Math.max(2, n))}"${f.rounds ? ' data-touched="1"' : ''}><p class="level-help" id="otb-rounds-help">${L(`Conseillé pour ${n} ${team ? 'équipes' : 'joueurs'} : ${OTB.suggestedRounds(Math.max(2, n))} rondes.`, `Advised for ${n} ${team ? 'teams' : 'players'}: ${OTB.suggestedRounds(Math.max(2, n))} rounds.`)}</p>` : ''}
      ${f.format === 'ko' && OTB.barrageSize(Math.max(2, n)).direct ? `<label class="field-label">${L('Joueurs en trop', 'Extra players')}</label>${seg('koMode', [['barrage', L('Tour de barrage', 'Play-in round')], ['exempt', L('Exemptions', 'Byes')]])}` : ''}
      ${f.format === 'ko' && f.koMode === 'exempt' && OTB.barrageSize(Math.max(2, n)).direct ? `<p class="otb-info">${L('Tout le monde joue dès le premier tour. À chaque tour où le nombre de qualifiés est impair, un joueur est exempté et passe au tour suivant.', 'Everyone plays from round 1. In any round with an odd number of players left, one gets a bye to the next round.')}</p>
        <label class="field-label">${L('Exempté', 'Bye goes to')}</label>${seg('byes', [['seeds', L('Le mieux classé', 'Best seed')], ['random', L('Tiré au sort', 'Drawn at random')]])}` : ''}
      ${f.format === 'ko' && f.koMode !== 'exempt' && OTB.barrageSize(Math.max(2, n)).direct ? `<p class="otb-info">${L(`Avec ${n} ${team ? 'équipes' : 'joueurs'} : tour de barrage entre ${OTB.barrageSize(n).play}, et ${OTB.barrageSize(n).direct} ${OTB.barrageSize(n).direct > 1 ? 'qualifiés directement' : 'qualifié directement'} pour le tour suivant.`, `With ${n} ${team ? 'teams' : 'players'}: play-in round between ${OTB.barrageSize(n).play}, and ${OTB.barrageSize(n).direct} going straight to the next round.`)}</p>
        <label class="field-label">${L('Qualifiés directement', 'Straight through')}</label>${seg('byes', [['seeds', L('Les premiers numéros', 'Top numbers')], ['random', L('Tirés au sort', 'Drawn at random')]])}` : ''}
      ${team ? `<label class="field-label" for="otb-boards">${L('Échiquiers par équipe', 'Boards per team')}</label><input id="otb-boards" class="otb-input otb-small" type="number" min="1" max="10" value="${f.boards}">` : ''}
      <label class="field-label" for="otb-names">${team ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${n})</label>
      <textarea id="otb-names" class="otb-input" rows="10" placeholder="${team ? L('Une équipe par ligne :\nLes Lions : Awa, Moussa, Fatou, Ibrahim\nLes Aigles : Koffi, Aminata, Seydou, Mariam', 'One team per line:\nLions: Awa, Moussa, Fatou, Ibrahim') : L('Un nom par ligne :\nAwa\nMoussa\nFatou', 'One name per line:\nAwa\nMoussa')}">${escHtml(f.text)}</textarea>
      <p class="level-help">${team ? L('Range les joueurs de chaque équipe dans l’ordre des échiquiers (le premier joue à l’échiquier 1).', 'List each team’s players in board order (the first plays board 1).') : L('Chaque nom reçoit un numéro dans l’ordre de la liste.', 'Each name gets a number in list order.')}</p>
      ${(() => {
        const past = pastEntrants(f.type), picked = new Set(f.picked || []);
        if (!past.length) return '';
        return `<label class="field-label">${team ? L('Équipes des tournois précédents', 'Teams from previous tournaments') : L('Joueurs des tournois précédents', 'Players from previous tournaments')}${otbShared.length ? L(' (y compris partagés)', ' (shared ones included)') : ''} <span class="otb-count">${picked.size}</span></label>
          <p class="level-help">${L('Touche un nom pour l’ajouter ; les nouveaux se tapent dans la liste ci-dessus.', 'Tap a name to add it; type new ones in the list above.')}</p>
          ${past.length > 12 ? `<input id="otb-pick-search" class="otb-input" placeholder="${L('Rechercher un nom…', 'Search a name…')}" autocomplete="off">` : ''}
          <div class="otb-pick">${[...past].sort((x, y) => picked.has(nameKey(y.name)) - picked.has(nameKey(x.name))).map((e) => `<button type="button" class="${picked.has(nameKey(e.name)) ? 'on' : ''}" data-otb-pick-name="${escHtml(nameKey(e.name))}" title="${escHtml(e.sub || '')}">${picked.has(nameKey(e.name)) ? '✓ ' : ''}${escHtml(e.name)}${team && e.sub ? `<small>${escHtml(e.sub)}</small>` : ''}</button>`).join('')}</div>
          <div class="otb-best-tools"><button type="button" class="btn ghost" data-otb="pick-all">${L('Tout cocher', 'Select all')}</button><button type="button" class="btn ghost" data-otb="pick-none">${L('Tout décocher', 'Clear')}</button></div>`;
      })()}
      <label class="switch"><input type="checkbox" id="otb-shuffle"${f.shuffle ? ' checked' : ''}><span>${L('Tirer les numéros au sort', 'Draw the numbers at random')}</span></label>
      <div class="actions"><button type="button" class="btn ghost" data-otb="cancel">${L('Annuler', 'Cancel')}</button><button type="button" class="btn primary" data-otb="start">${L('Commencer le tournoi', 'Start the tournament')}</button></div>`;
  }
  /* ----- Joueurs des tournois : annuaire avec recherche ----- */
  // Chaque joueur inscrit à un tournoi est retenu ici ; on peut aussi en ajouter directement. Un joueur qui n'est
  // lié à aucun tournoi (les miens ou ceux partagés avec moi) peut être supprimé.
  let otbDir = null;
  const otbPlayers = () => store.get('otbPlayers', null);
  function registerPlayers(names) {
    const list = otbPlayers() || [], keys = new Set(list.map((n) => nameKey(n)));
    let changed = false;
    for (const n of names) { const k = nameKey(n); if (k && !keys.has(k)) { list.push(String(n).trim().slice(0, 40)); keys.add(k); changed = true; } }
    if (changed || !otbPlayers()) store.set('otbPlayers', list);
  }
  const tournamentNames = (t) => (t.type === 'team' ? t.entrants.flatMap((e) => e.players || []) : t.entrants.map((e) => e.name));
  function directory() {
    // première utilisation : l'annuaire part des joueurs des tournois déjà enregistrés
    if (!otbPlayers()) registerPlayers(otbList().flatMap(tournamentNames));
    const stats = new Map(OTB.aggregate(allTournaments()).map((x) => [nameKey(x.name), x]));
    const names = new Map();
    for (const n of otbPlayers() || []) names.set(nameKey(n), n);
    for (const x of stats.values()) if (!names.has(nameKey(x.name))) names.set(nameKey(x.name), x.name);
    return [...names.entries()].map(([k, name]) => ({ key: k, name: (stats.get(k) || {}).name || name, s: stats.get(k) || null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function renderOtbDir() {
    const rows = directory(), q = nameKey(otbDir.q || '');
    const shown = rows.filter((r) => !q || r.key.includes(q));
    $('otb-body').innerHTML = `<p class="level-help">${L('Tous les joueurs de tes tournois et de ceux partagés avec toi. Un joueur qui ne figure dans aucun tournoi peut être supprimé.', 'All players from your tournaments and those shared with you. A player who is in no tournament can be deleted.')}</p>
      <input id="otb-dir-search" class="otb-input" placeholder="${L('Rechercher un joueur…', 'Search a player…')}" value="${escHtml(otbDir.q || '')}" autocomplete="off">
      <div class="club-form"><input id="otb-dir-add" maxlength="40" placeholder="${L('Nouveau joueur', 'New player')}"><button type="button" class="btn" data-otb="dir-add">${L('Ajouter', 'Add')}</button></div>
      <h3 class="train-h">${L('Joueurs', 'Players')} <span class="otb-count">${shown.length}${q ? ` / ${rows.length}` : ''}</span></h3>
      ${shown.length ? `<div class="tour-scroll"><table class="tour-table otb-dir"><tr><th>${L('Joueur', 'Player')}</th><th>${L('Tournois', 'Events')}</th><th>${L('Parties', 'Games')}</th><th>${L('Points', 'Points')}</th><th>%</th><th></th></tr>
        ${shown.map((r) => `<tr><td><b>${escHtml(r.name)}</b></td><td>${r.s ? r.s.tournaments : 0}</td><td>${r.s ? r.s.games : 0}</td><td>${r.s ? r.s.pts : 0}</td><td>${r.s && r.s.games ? `${r.s.pct}&nbsp;%` : '—'}</td><td>${r.s && r.s.tournaments ? `<small>${L('lié à un tournoi', 'in a tournament')}</small>` : `<button type="button" class="btn ghost otb-dir-del" data-otb-dir-del="${escHtml(r.key)}" aria-label="${L('Supprimer', 'Delete')}">🗑️</button>`}</td></tr>`).join('')}</table></div>`
        : `<p class="level-help">${q ? L('Aucun joueur ne correspond.', 'No matching player.') : L('Aucun joueur pour l’instant.', 'No players yet.')}</p>`}
      <div class="actions"><button type="button" class="btn ghost" data-otb="dir-close">${L('Mes tournois', 'My tournaments')}</button></div>`;
  }
  // Joueurs (ou équipes) des tournois précédents, à cocher au lieu de les retaper
  const nameKey = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
  // mes tournois et ceux partagés avec moi : leurs participants sont mis en commun
  const allTournaments = () => [...otbList(), ...otbShared.map((x) => x.t)];
  function pastEntrants(type) {
    if (type !== 'team') return directory().map((r) => ({ name: r.name, sub: r.s ? L(`${r.s.tournaments} tournoi${r.s.tournaments > 1 ? 's' : ''}`, `${r.s.tournaments} event${r.s.tournaments === 1 ? '' : 's'}`) : L('aucun tournoi', 'no tournament') }));
    const teams = new Map();
    for (const t of allTournaments().filter((x) => x.type === 'team').sort((a, b) => (a.updatedAt || a.id) - (b.updatedAt || b.id)))
      for (const e of t.entrants) teams.set(nameKey(e.name), { name: e.name, players: e.players || [], sub: (e.players || []).join(', ') }); // la composition la plus récente
    return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  function parseEntrants(f) {
    const typed = String(f.text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      if (f.type !== 'team') return { name: line.slice(0, 40) };
      const [name, rest] = line.includes(':') ? [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)] : [line, ''];
      return { name: name.trim().slice(0, 40), players: rest.split(/[,;]/).map((p) => p.trim().slice(0, 30)).filter(Boolean) };
    });
    // les joueurs cochés dans la liste des tournois précédents s'ajoutent à ceux tapés (sans doublon)
    const seen = new Set(typed.map((e) => nameKey(e.name)));
    const picked = pastEntrants(f.type).filter((e) => (f.picked || []).includes(nameKey(e.name)) && !seen.has(nameKey(e.name)))
      .map((e) => (f.type === 'team' ? { name: e.name, players: e.players.slice() } : { name: e.name }));
    return [...picked, ...typed];
  }
  function readOtbForm() {
    if (!otbNew || !$('otb-names')) return;
    Object.assign(otbNew, readInfo());
    otbNew.name = $('otb-name').value; otbNew.text = $('otb-names').value; otbNew.shuffle = $('otb-shuffle').checked;
    // nombre de rondes : celui saisi à la main, sinon le nombre conseillé selon la liste
    if ($('otb-rounds') && $('otb-rounds').dataset.touched) otbNew.rounds = Number($('otb-rounds').value) || null;
    if ($('otb-boards')) otbNew.boards = Math.max(1, Math.min(10, Number($('otb-boards').value) || 4));
  }
  function startOtb() {
    readOtbForm();
    let entrants = parseEntrants(otbNew);
    if (entrants.length < 2) return toast(L('Il faut au moins deux noms.', 'At least two names are needed.'));
    if (otbNew.shuffle) entrants = entrants.map((e) => [Math.random(), e]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const t = OTB.create({ ...otbNew, entrants });
    registerPlayers(tournamentNames(t));
    otbSave(t); otbId = t.id; otbNew = null; otbTab = 'round';
    renderOtb();
  }

  /* ----- Déroulement ----- */
  const RESULTS = [['1-0', '1-0'], ['1/2', '½-½'], ['0-1', '0-1']];
  function resultButtons(attrs, r, locked) {
    return `<span class="otb-res">${RESULTS.map(([v, label]) => `<button type="button" ${attrs} data-res="${v}" class="${r === v ? 'on' : ''}"${locked ? ' disabled' : ''}>${label}</button>`).join('')}</span>`;
  }
  // Nom du joueur d'une équipe à un échiquier, et couleur : l'équipe citée en premier a les Blancs aux échiquiers impairs
  const boardPlayer = (t, no, k) => { const e = OTB.byNo(t, no); return (e && e.players && e.players[k]) || L(`Joueur ${k + 1}`, `Player ${k + 1}`); };
  function tableHtml(t, p, i, locked) {
    if (p.b == null) return `<div class="otb-table bye"><b>${t.format === 'ko' && t.koMode !== 'exempt' ? L('Qualifié', 'Through') : L('Exempt', 'Bye')}</b><span>${who(t, p.a)}</span><small>${t.format === 'ko' ? L(`qualifié directement pour ${({ final: 'la finale', semi: 'les demi-finales', quarter: 'les quarts de finale', eighth: 'les huitièmes de finale' })[OTB.koStage(t, OTB.current(t).no + 1)] || 'le tour suivant'}`, `goes straight to the ${(KO_ROUNDS[OTB.koStage(t, OTB.current(t).no + 1)] || 'next round').toLowerCase()}`) : t.type === 'team' ? L('+2 points de match', '+2 match points') : L('+1 point', '+1 point')}</small></div>`;
    let html = `<div class="otb-table"><div class="otb-head"><b>${L('Table', 'Table')} ${p.table}</b>`;
    if (t.type !== 'team') {
      html += `</div><div class="otb-match"><span class="otb-side">⚪ ${who(t, p.a)}</span>${resultButtons(`data-t="${i}"`, p.r, locked)}<span class="otb-side">⚫ ${who(t, p.b)}</span></div>`;
    } else {
      const s = OTB.tableScore(t, p);
      html += `<span>${who(t, p.a)} — ${who(t, p.b)}${s.done ? ` · <b>${s.ga} – ${s.gb}</b>` : ''}</span></div>`;
      html += p.games.map((g, k) => {
        const aWhite = k % 2 === 0;
        return `<div class="otb-match board"><span class="otb-side">${aWhite ? '⚪' : '⚫'} ${escHtml(boardPlayer(t, p.a, k))}</span>${resultButtons(`data-t="${i}" data-g="${k}"`, g.r, locked)}<span class="otb-side">${aWhite ? '⚫' : '⚪'} ${escHtml(boardPlayer(t, p.b, k))}</span><small class="otb-board">${L('Éch.', 'Bd')} ${k + 1}</small></div>`;
      }).join('');
    }
    // élimination directe : après une nulle, l'organisateur choisit (rejouer ou désigner le qualifié)
    if (t.format === 'ko' && p.b != null && OTB.tableScore(t, p).done && OTB.tableScore(t, p).a === OTB.tableScore(t, p).b) {
      const name = (no) => (t.type === 'team' ? `${boardPlayer(t, no, 0)} (${OTB.byNo(t, no).name})` : OTB.byNo(t, no).name);
      const state = OTB.tiebreakState(t, p), win = OTB.winnerOf(t, p);
      html += `<div class="otb-tb">`;
      if ((p.tb || []).length) html += `<b>${L('Parties de départage', 'Play-off games')}</b>${t.type === 'team' ? `<small>${L('entre les joueurs de l’échiquier 1', 'between the board 1 players')}</small>` : ''}`
        + p.tb.map((g, k) => `<div class="otb-match board"><span class="otb-side">⚪ ${escHtml(name(g.w))}</span>${resultButtons(`data-t="${i}" data-tb="${k}"`, g.r, locked || p.adv != null)}<span class="otb-side">⚫ ${escHtml(name(g.b))}</span><small class="otb-board">${k + 1}</small></div>`).join('');
      if (win != null) {
        html += `<div class="otb-tb-win">${OTB.isFinal(t) ? `🏆 ${escHtml(OTB.byNo(t, win).name)} ${L('remporte la finale', 'wins the final')}` : `✅ ${escHtml(OTB.byNo(t, win).name)} ${L('passe au tour suivant', 'goes through')}`}${p.adv != null ? ` <small>(${L('choix de l’organisateur', 'organiser’s decision')})</small>` : ''}</div>`;
        if (p.adv != null && !locked) html += `<span><button type="button" class="btn ghost" data-t="${i}" data-adv="">${L('Annuler ce choix', 'Cancel this decision')}</button></span>`;
      } else if (!locked) {
        const final = OTB.isFinal(t);
        html += `<div class="otb-adv"><span>${state === 'playing' ? L('Partie de départage en cours. Ou qualifier directement :', 'Play-off game in progress. Or qualify directly:') : final ? L('Nulle en finale : rejouer jusqu’à un gagnant, ou désigner le vainqueur :', 'Draw in the final: replay until there is a winner, or choose the winner:') : L('Nulle : qui passe au tour suivant ?', 'Draw: who goes through?')}</span>`
          + (state === 'choose' && final ? `<button type="button" class="btn primary" data-t="${i}" data-tb-add="1">▶ ${L('Rejouer une partie', 'Play another game')}</button>` : '')
          + [p.a, p.b].map((no) => `<button type="button" class="btn" data-t="${i}" data-adv="${no}">${OTB.isFinal(t) ? L('Vainqueur :', 'Winner:') : L('Qualifier', 'Qualify')} ${escHtml(OTB.byNo(t, no).name)}</button>`).join('') + '</div>';
      } else html += `<small>${L('En attente de la décision de l’organisateur.', 'Waiting for the organiser’s decision.')}</small>`;
      html += '</div>';
    }
    return html + '</div>';
  }
  // Élimination directe : parcours de chaque joueur
  const STAGES = L({ win: 'Vainqueur', final: 'Finaliste', semi: 'Demi-finale', quarter: 'Quart de finale', eighth: 'Huitième de finale', alive: 'Encore en course' },
    { win: 'Winner', final: 'Finalist', semi: 'Semi-final', quarter: 'Quarter-final', eighth: 'Round of 16', alive: 'Still in' });
  const stageName = (x) => STAGES[x.stage] || L(`Éliminé au tour ${x.reached}`, `Out in round ${x.reached}`);
  function koStandingsHtml(t) {
    const st = OTB.standings(t), team = t.type === 'team', over = t.status === 'over';
    const rank = (x) => (over && x.place <= 3 ? ['🥇', '🥈', '🥉'][x.place - 1] : x.place) + (x.tied ? ` <small>${L('ex æquo', 'tied')}</small>` : '');
    const hadBye = (no) => t.rounds.some((r) => r.tables.some((p) => p.b == null && p.a === no));
    return `<div class="tour-scroll"><table class="tour-table otb-standings"><tr><th>${L('Rang', 'Rank')}</th><th>${team ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${L('Parcours', 'Run')}</th><th>${L('Parties', 'Played')}</th><th>${team ? L('Pts match', 'Match pts') : L('Points', 'Points')}</th></tr>
      ${st.map((x) => `<tr class="${x.out ? 'otb-out' : ''}"><td>${rank(x)}</td><td>${who(t, x.no)}</td><td>${stageName(x)}${hadBye(x.no) ? ` <small>(${L('exempté au 1er tour', 'bye in round 1')})</small>` : ''}</td><td>${x.played}</td><td>${x.pts}</td></tr>`).join('')}</table></div>
      <p class="level-help">${L('En élimination directe, on est classé par le tour atteint : les joueurs éliminés au même tour sont ex æquo, quels que soient leurs résultats. Un exempté passe le tour sans jouer et sans marquer de point.', 'In a knockout, players are ranked by the round reached: players knocked out in the same round are tied, whatever their results. A bye goes through without playing or scoring.')}</p>`;
  }
  function standingsHtml(t) {
    if (t.format === 'ko') return koStandingsHtml(t);
    const st = OTB.standings(t), team = t.type === 'team', rr = t.format === 'rr' || t.format === 'rr2';
    const medal = (i) => (t.status === 'over' && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1);
    return `<div class="tour-scroll"><table class="tour-table otb-standings"><tr><th>${L('Rang', 'Rank')}</th><th>${team ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${team ? L('Pts match', 'Match pts') : L('Points', 'Points')}</th>${team ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}${t.format === 'ko' ? '' : `<th>${rr ? 'S-B' : 'Buchholz'}</th><th>${rr ? 'Buchholz' : 'S-B'}</th>`}<th>${L('Parties', 'Played')}</th></tr>
      ${st.map((x, i) => `<tr class="${x.out ? 'otb-out' : ''}"><td>${medal(i)}</td><td>${who(t, x.no)}${x.out ? ` <small>(${L('abandon', 'withdrew')})</small>` : ''}</td><td><b>${x.pts}</b></td>${team ? `<td>${x.game}</td>` : ''}${t.format === 'ko' ? '' : `<td>${+(rr ? x.sb : x.buch).toFixed(2)}</td><td>${+(rr ? x.buch : x.sb).toFixed(2)}</td>`}<td>${x.played}</td></tr>`).join('')}</table></div>
      <p class="level-help">${t.format === 'ko' ? L('Classement par tour atteint.', 'Ranked by round reached.') : L('À égalité de points : Buchholz (total des points des adversaires), puis Sonneborn-Berger (points des adversaires battus, la moitié pour les nulles).', 'Tied on points: Buchholz (opponents’ total points), then Sonneborn-Berger (points of beaten opponents, half for draws).')}</p>`;
  }
  function renderOtbTournament(t) {
    const round = OTB.current(t), done = OTB.roundDone(t, round), over = t.status === 'over', ro = otbReadOnly(t);
    const tabs = [['round', over ? L('Podium', 'Podium') : roundName(t, round.no)], ['table', L('Classement', 'Standings')], ['people', t.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')], ['history', L('Rondes', 'Rounds')]];
    const infoLine = otbInfoLine(t, '<br>');
    const shares = Object.entries(t.shares || {});
    let html = `${ro ? `<p class="otb-shared-note">👁️ ${L(`Tournoi de ${escHtml(otbView.ownerName)}, suivi en direct (lecture seule)`, `${escHtml(otbView.ownerName)}’s tournament, followed live (read only)`)}</p>` : ''}${infoLine ? `<p class="otb-info">${infoLine}</p>` : ''}<p class="level-help">${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L(`équipes · ${t.boards} échiquiers`, `teams · ${t.boards} boards`) : L('joueurs', 'players')} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</p>
      <div class="ed-seg otb-tabs">${tabs.map(([id, label]) => `<button type="button" data-otb-tab="${id}" class="${otbTab === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    if (otbTab === 'round') {
      if (over) {
        const st = OTB.standings(t);
        const podium = st.filter((x) => x.place <= 3);
        html += `<div class="otb-podium">${podium.map((x) => `<div class="p${x.place}"><span>${['🥇', '🥈', '🥉'][x.place - 1]}</span><b>${escHtml(x.name)}</b><small>${t.format === 'ko' ? stageName(x) : `${x.pts} ${t.type === 'team' ? L('pts de match', 'match pts') : L('pts', 'pts')}`}</small></div>`).join('')}</div>${standingsHtml(t)}`;
      } else {
        const missing = round.tables.filter((p) => !OTB.tableScore(t, p).done || (t.format === 'ko' && p.b != null && OTB.winnerOf(t, p) == null)).length;
        html += `<div class="otb-tables">${round.tables.map((p, i) => [p, i]).sort((x, y) => (x[0].b == null) - (y[0].b == null)).map(([p, i]) => tableHtml(t, p, i, false)).join('')}</div>
          <p class="level-help">${done ? L('Tous les résultats sont saisis.', 'All results are in.') : L(`Résultats à saisir : ${missing}.`, `Results to enter: ${missing}.`)}</p>
          <div class="actions"><button type="button" class="btn primary" data-otb="next"${done ? '' : ' disabled'}>${round.no >= t.totalRounds || (t.format === 'ko' && round.tables.length === 1) ? L('Terminer le tournoi', 'Finish the tournament') : L('Ronde suivante', 'Next round')}</button></div>`;
      }
      html += `<div class="actions otb-tools"><button type="button" class="btn" data-otb="big">📺 ${L('Grand écran', 'Big screen')}</button><button type="button" class="btn" data-otb="print">🖨️ ${L('Imprimer', 'Print')}</button>${t.rounds.length > 1 || over ? `<button type="button" class="btn ghost" data-otb="undo">↩️ ${over ? L('Rouvrir la dernière ronde', 'Reopen the last round') : L('Annuler cette ronde', 'Cancel this round')}</button>` : ''}</div>`;
    }
    if (otbTab === 'table') html += standingsHtml(t);
    if (otbTab === 'people') {
      const canEdit = t.format === 'swiss' && !over;
      html += `<div class="replay-items">${t.entrants.map((e) => `<div class="btn replay-item otb-person${e.out ? ' otb-out' : ''}"><strong>${who(t, e.no)}</strong>${e.players && e.players.length ? `<span>${e.players.map((p, k) => `${k + 1}. ${escHtml(p)}`).join(' · ')}</span>` : ''}${e.lateFrom > 1 ? `<span>${L(`arrivé à la ronde ${e.lateFrom}`, `joined at round ${e.lateFrom}`)}</span>` : ''}${canEdit ? `<button type="button" class="btn ghost" data-otb-out="${e.no}">${e.out ? L('Réintégrer', 'Bring back') : L('Abandon', 'Withdraw')}</button>` : ''}</div>`).join('')}</div>
        ${canEdit ? `<p class="level-help">${L('Un joueur qui abandonne n’est plus apparié à partir de la ronde suivante.', 'A withdrawn player is not paired from the next round.')}</p>
          <h3 class="train-h">${t.type === 'team' ? L('Équipes en retard', 'Late teams') : L('Retardataires', 'Latecomers')}</h3>
          <div class="otb-late-rule"><label for="otb-late-until">${L('Acceptés jusqu’à la ronde', 'Accepted up to round')}</label><input id="otb-late-until" class="otb-input otb-small" type="number" min="1" max="${t.totalRounds}" value="${OTB.lateUntil(t)}"><span>${L(`sur ${t.totalRounds}`, `of ${t.totalRounds}`)}</span></div>
          ${OTB.canAddLate(t) ? `<p class="level-help">${OTB.lateJoinRound(t) === 1 ? L('Aucun résultat n’est encore saisi : la ronde 1 sera refaite en l’incluant.', 'No result entered yet: round 1 will be redone to include them.') : L(`Il entrera à la ronde ${OTB.lateJoinRound(t)} avec 0 point.`, `They will join round ${OTB.lateJoinRound(t)} with 0 points.`)}</p>
          <div class="club-form"><input id="otb-late" maxlength="40" placeholder="${t.type === 'team' ? L('Équipe : joueur 1, joueur 2…', 'Team: player 1, player 2…') : L('Nom du retardataire', 'Latecomer’s name')}"><button type="button" class="btn" data-otb="late">${L('Ajouter', 'Add')}</button></div>`
            : `<p class="level-help">🚫 ${L(`Le tournoi est trop avancé : les retardataires ne sont plus acceptés (ils l’étaient jusqu’à la ronde ${OTB.lateUntil(t)}).`, `The tournament is too far along: latecomers are no longer accepted (they were up to round ${OTB.lateUntil(t)}).`)}</p>`}`
          : `<p class="level-help">${t.format === 'swiss' ? '' : L('Dans cette formule, la liste est fixée au départ : un joueur absent perd ses parties par forfait (saisis 1-0 ou 0-1).', 'In this format the list is fixed: an absent player loses by forfeit (enter 1-0 or 0-1).')}</p>`}`;
    }
    if (otbTab === 'history') {
      html += t.rounds.map((r) => `<h3 class="train-h">${roundName(t, r.no)}</h3><table class="tour-table">${r.tables.map((p) => {
        const s = OTB.tableScore(t, p);
        const res = p.b == null ? L('exempt', 'bye') : s.done ? (t.type === 'team' ? `${s.ga} – ${s.gb}` : { '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½' }[p.r]) : '…';
        return `<tr><td>${p.table}</td><td>${who(t, p.a)}</td><td><b>${res}</b>${t.format === 'ko' && s.done && s.a === s.b && p.adv != null ? ` <small>(${L('qualifié par l’organisateur', 'qualified by the organiser')} : ${escHtml(OTB.byNo(t, p.adv).name)})</small>` : ''}${t.format === 'ko' && s.done && s.a === s.b && p.adv == null && OTB.winnerOf(t, p) != null ? ` <small>(${L('départage', 'play-off')} : ${(p.tb || []).map((g) => ({ '1-0': '1-0', '0-1': '0-1', '1/2': '½' }[g.r] || '…')).join(', ')} · ${L('qualifié', 'through')} : ${escHtml(OTB.byNo(t, OTB.winnerOf(t, p)).name)})</small>` : ''}</td><td>${p.b == null ? '' : who(t, p.b)}</td></tr>`;
      }).join('')}</table>`).join('');
    }
    html += `<h3 class="train-h">${L('Partage', 'Sharing')}</h3>${ro ? `<p class="level-help">${L(`Organisé par ${escHtml(otbView.ownerName)}, partagé avec :`, `Organised by ${escHtml(otbView.ownerName)}, shared with:`)}</p>` : ''}${shares.length ? `<div class="otb-shares">${shares.map(([uid, name]) => `<span>${escHtml(name)}${ro ? '' : `<button type="button" class="btn ghost" data-otb-unshare="${uid}" aria-label="${L('Ne plus partager', 'Stop sharing')}">✕</button>`}</span>`).join('')}</div>` : `<p class="level-help">${L('Partage ce tournoi avec d’autres joueurs de l’appli : ils suivront les tables, les résultats et le classement en direct, sans pouvoir rien modifier.', 'Share this tournament with other players: they follow the tables, results and standings live, without being able to change anything.')}</p>`}
      ${ro ? '' : `<div class="club-form"><input id="otb-share" maxlength="30" autocomplete="off" placeholder="${L('Pseudo du joueur', 'Player’s nickname')}"><button type="button" class="btn" data-otb="share">🔗 ${L('Partager', 'Share')}</button></div>`}`;
    html += `<div class="actions"><button type="button" class="btn ghost" data-otb="list">${ro ? L('Retour', 'Back') : L('Mes tournois', 'My tournaments')}</button><button type="button" class="btn ghost" data-otb="info">✏️ ${L('Infos du tournoi', 'Tournament details')}</button><button type="button" class="btn ghost" data-otb="delete">🗑️ ${L('Supprimer', 'Delete')}</button></div>`;
    $('otb-body').innerHTML = html;
    // invité : exactement le même écran que l'organisateur, mais rien n'est modifiable (seuls les onglets,
    // le grand écran, l'impression et le retour restent actifs)
    $('otb-body').classList.toggle('otb-ro', ro);
    if (ro) $('otb-body').querySelectorAll('button, input, textarea').forEach((el) => { if (!el.matches('[data-otb-tab], [data-otb="big"], [data-otb="print"], [data-otb="list"]')) el.disabled = true; });
  }

  /* ----- Grand écran et impression ----- */
  function bigScreen(t) {
    const round = OTB.current(t), over = t.status === 'over';
    const box = document.createElement('div');
    box.className = 'otb-big';
    box.innerHTML = `<h1>${escHtml(t.name)} · ${over ? L('Classement final', 'Final standings') : roundName(t, round.no)}</h1>${otbInfoLine(t) ? `<div class="otb-big-info">${otbInfoLine(t)}</div>` : ''}`
      + (over ? `<ol>${OTB.standings(t).slice(0, 10).map((x) => `<li>${escHtml(x.name)} <b>${x.pts}</b></li>`).join('')}</ol>`
        : `<table>${round.tables.map((p) => (p.b == null ? `<tr><td>—</td><td colspan="3">${escHtml(plain(t, p.a))} : ${L('exempt', 'bye')}</td></tr>` : `<tr><td>${p.table}</td><td>⚪ ${escHtml(plain(t, p.a))}</td><td>${L('contre', 'vs')}</td><td>⚫ ${escHtml(plain(t, p.b))}</td></tr>`)).join('')}</table>`)
      + `<p>${L('Toucher l’écran pour fermer', 'Tap to close')}</p>`;
    box.onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); box.remove(); };
    document.body.appendChild(box);
    if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  }
  function printOtb(t) {
    const round = OTB.current(t), over = t.status === 'over', st = OTB.standings(t);
    const rows = round.tables.map((p) => {
      if (p.b == null) return `<tr><td></td><td>${escHtml(plain(t, p.a))}</td><td>${L('exempt', 'bye')}</td><td></td></tr>`;
      if (t.type !== 'team') return `<tr><td>${p.table}</td><td>${escHtml(plain(t, p.a))}</td><td class="r">…… – ……</td><td>${escHtml(plain(t, p.b))}</td></tr>`;
      return `<tr><td>${p.table}</td><td>${escHtml(plain(t, p.a))}</td><td class="r">…… – ……</td><td>${escHtml(plain(t, p.b))}</td></tr>` + p.games.map((g, k) => `<tr class="bd"><td>${L('Éch.', 'Bd')} ${k + 1}</td><td>${k % 2 ? '⚫' : '⚪'} ${escHtml(boardPlayer(t, p.a, k))}</td><td class="r">…… – ……</td><td>${k % 2 ? '⚪' : '⚫'} ${escHtml(boardPlayer(t, p.b, k))}</td></tr>`).join('');
    }).join('');
    const doc = `<!doctype html><html lang="${window.LANG === 'en' ? 'en' : 'fr'}"><head><meta charset="utf-8"><title>${escHtml(t.name)}</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:20px 0 6px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px 8px;text-align:left}td.r{text-align:center;width:110px}tr.bd td{font-size:12px;color:#333}</style></head><body>
      <h1>${escHtml(t.name)}</h1>${otbInfoLine(t) ? `<div>${otbInfoLine(t)}</div>` : ''}<div>${FORMAT_NAMES[t.format]} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</div>
      ${over ? '' : `<h2>${roundName(t, round.no)} : ${L('appariements', 'pairings')}</h2><table><tr><th>${L('Table', 'Table')}</th><th>${L('Blancs', 'White')}</th><th>${L('Résultat', 'Result')}</th><th>${L('Noirs', 'Black')}</th></tr>${rows}</table>`}
      <h2>${L('Classement', 'Standings')}</h2><table><tr><th>#</th><th>${t.type === 'team' ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${L('Points', 'Points')}</th>${t.type === 'team' ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}<th>Buchholz</th></tr>${st.map((x, i) => `<tr><td>${i + 1}</td><td>${escHtml(plain(t, x.no))}</td><td>${x.pts}</td>${t.type === 'team' ? `<td>${x.game}</td>` : ''}<td>${x.buch}</td></tr>`).join('')}</table>
      <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast(L('Autorise les fenêtres pour imprimer.', 'Allow pop-ups to print.'));
    w.document.write(doc); w.document.close();
  }

  /* ----- Clics ----- */
  $('otb-body').addEventListener('change', (e) => {
    if (e.target.id === 'otb-late-until') {
      const t = otbGet(); if (!t || otbReadOnly(t)) return;
      t.lateUntil = Math.max(1, Math.min(t.totalRounds, Number(e.target.value) || 1)); otbSave(t); return renderOtb();
    }
    if (!otbBest) return;
    if (e.target.dataset.otbPick) { const key = e.target.dataset.otbPick; if (e.target.checked) otbBest.sel.add(key); else otbBest.sel.delete(key); renderOtb(); }
    if (e.target.id === 'otb-top') { otbBest.top = Math.max(1, Math.min(200, Number(e.target.value) || 10)); renderOtb(); }
  });
  $('otb-body').addEventListener('input', (e) => {
    if (e.target.id === 'otb-dir-search' && otbDir) {
      otbDir.q = e.target.value; const pos = e.target.selectionStart; renderOtb();
      const el = $('otb-dir-search'); el.focus(); el.setSelectionRange(pos, pos); return;
    }
    if (!otbNew) return;
    if (e.target.id === 'otb-pick-search') { const k = nameKey(e.target.value); document.querySelectorAll('.otb-pick button').forEach((x) => { x.hidden = !!k && !x.dataset.otbPickName.includes(k); }); return; }
    if (e.target.id === 'otb-rounds') e.target.dataset.touched = '1';
    if (e.target.id === 'otb-names' && otbNew.format === 'ko') {
      const before = otbNew.count, now = parseEntrants({ ...otbNew, text: e.target.value }).length;
      otbNew.count = now;
      if (before !== undefined && before !== now) { readOtbForm(); const pos = e.target.selectionStart; renderOtb(); const ta = $('otb-names'); ta.focus(); ta.setSelectionRange(pos, pos); return; }
    }
    if (e.target.id === 'otb-names') {
      const n = parseEntrants({ ...otbNew, text: e.target.value }).length, sug = OTB.suggestedRounds(Math.max(2, n)), team = otbNew.type === 'team';
      if ($('otb-rounds') && !$('otb-rounds').dataset.touched) $('otb-rounds').value = sug;
      if ($('otb-rounds-help')) $('otb-rounds-help').textContent = L(`Conseillé pour ${n} ${team ? 'équipes' : 'joueurs'} : ${sug} rondes.`, `Advised for ${n} ${team ? 'teams' : 'players'}: ${sug} rounds.`); readOtbForm(); const lab = document.querySelector('label[for="otb-names"]'); if (lab) lab.textContent = `${otbNew.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${parseEntrants(otbNew).length})`; }
  });
  $('otb-body').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.otb;
    if (act === 'new') { const now = new Date(); otbNew = { date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, place: '', referee: '', name: '', type: 'solo', format: 'swiss', rounds: null, boards: 4, text: '', shuffle: false, byes: 'seeds', koMode: 'barrage' }; return renderOtb(); }
    if (act === 'cancel') { otbNew = null; return renderOtb(); }
    if (act === 'dir') { otbDir = { q: '' }; return renderOtb(); }
    if (act === 'dir-close') { otbDir = null; return renderOtb(); }
    if (act === 'dir-add') {
      const v = $('otb-dir-add').value.trim(); if (!v) return;
      if (directory().some((r) => r.key === nameKey(v))) return toast(L('Ce joueur est déjà dans la liste.', 'This player is already listed.'));
      registerPlayers([v]); toast(L(`${v} ajouté.`, `${v} added.`)); return renderOtb();
    }
    if (b.dataset.otbDirDel) {
      const k = b.dataset.otbDirDel, r = directory().find((x) => x.key === k);
      if (!r || (r.s && r.s.tournaments)) return;
      return modal({ title: L('Supprimer ce joueur ?', 'Delete this player?'), text: r.name, actions: [
        { label: L('Annuler', 'Cancel'), ghost: true },
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => { store.set('otbPlayers', (otbPlayers() || []).filter((n) => nameKey(n) !== k)); renderOtb(); } },
      ] });
    }
    if (otbNew && (b.dataset.otbPickName || act === 'pick-all' || act === 'pick-none')) {
      readOtbForm();
      const set = new Set(otbNew.picked || []);
      if (act === 'pick-all') pastEntrants(otbNew.type).forEach((e) => set.add(nameKey(e.name)));
      else if (act === 'pick-none') set.clear();
      else if (set.has(b.dataset.otbPickName)) set.delete(b.dataset.otbPickName); else set.add(b.dataset.otbPickName);
      otbNew.picked = [...set];
      const y = window.scrollY; renderOtb(); window.scrollTo(0, y); return;
    }
    if (act === 'best') { otbBest = { sel: new Set(bestSources().map((s) => s.key)), top: 10, by: 'points' }; return renderOtb(); }
    if (b.dataset.otbBy && otbBest) { otbBest.by = b.dataset.otbBy; return renderOtb(); }
    if (act === 'best-close') { otbBest = null; return renderOtb(); }
    if (act === 'best-all') { bestSources().forEach((s) => otbBest.sel.add(s.key)); return renderOtb(); }
    if (act === 'best-none') { otbBest.sel.clear(); return renderOtb(); }
    if (act === 'best-print') return printOtbBest();
    if (b.closest('[data-otb-seg]')) { readOtbForm(); const k = b.closest('[data-otb-seg]').dataset.otbSeg; otbNew[k] = b.dataset.value; if (k === 'format') otbNew.rounds = null; if (k === 'type') otbNew.picked = []; return renderOtb(); }
    if (act === 'start') return startOtb();
    if (b.dataset.otbOpen) { closeOtbView(); otbId = Number(b.dataset.otbOpen); otbTab = 'round'; return renderOtb(); }
    if (b.dataset.otbShared) {
      const s = otbShared.find((x) => x.docId === b.dataset.otbShared); if (!s) return;
      closeOtbView(); otbView = { key: `s:${s.docId}`, t: s.t, ownerName: s.ownerName }; otbId = otbView.key; otbTab = 'round';
      otbStopWatch = ON.watchOtb(s.docId, (t, ownerName) => {
        if (!otbView || otbView.key !== `s:${s.docId}`) return;
        if (!t) { closeOtbView(); otbId = null; toast(L('Ce tournoi n’est plus partagé avec toi.', 'This tournament is no longer shared with you.')); return renderOtb(); }
        otbView.t = t; otbView.ownerName = ownerName || otbView.ownerName;
        if (document.body.dataset.screen === 'otb') renderOtb();
      });
      return renderOtb();
    }
    if (act === 'list') { closeOtbView(); otbId = null; renderOtb(); otbSync().then(() => { if (!otbId && !otbNew) renderOtb(); }); return; }
    const t = otbGet(); if (!t) return;
    if (b.dataset.otbTab) { otbTab = b.dataset.otbTab; return renderOtb(); }
    if (act === 'big') return bigScreen(t);
    if (act === 'print') return printOtb(t);
    if (otbReadOnly(t)) return; // tournoi partagé : rien d'autre n'est modifiable
    if (act === 'share') {
      if (!ON || !ON.user) { toast(L('Connecte-toi pour partager un tournoi.', 'Sign in to share a tournament.')); return openAccount(); }
      const pseudo = $('otb-share').value.trim(); if (!pseudo) return;
      ON.load().then(() => ON.findPlayer(pseudo)).then((p) => {
        if (p.uid === ON.user.uid) return toast(L('C’est ton propre compte.', 'That is your own account.'));
        t.shares = { ...(t.shares || {}), [p.uid]: p.pseudo || pseudo };
        otbSave(t); clearTimeout(otbUpload); ON.saveOtb(t).catch(() => {});
        toast(L(`Tournoi partagé avec ${p.pseudo || pseudo}.`, `Tournament shared with ${p.pseudo || pseudo}.`)); renderOtb();
      }).catch((err) => toast(ON.explain ? ON.explain(err) : L('Joueur introuvable.', 'Player not found.')));
      return;
    }
    if (b.dataset.tbAdd && t.status !== 'over') { OTB.addTiebreak(t, OTB.current(t).tables[Number(b.dataset.t)]); otbSave(t); return renderOtb(); }
    if (b.dataset.adv != null && t.status !== 'over') {
      const p = OTB.current(t).tables[Number(b.dataset.t)];
      if (b.dataset.adv) p.adv = Number(b.dataset.adv); else delete p.adv;
      OTB.syncTiebreaks(t, p); otbSave(t); return renderOtb();
    }
    if (b.dataset.otbUnshare) { const s = { ...(t.shares || {}) }; delete s[b.dataset.otbUnshare]; t.shares = s; otbSave(t); clearTimeout(otbUpload); if (ON && ON.user) ON.saveOtb(t).catch(() => {}); return renderOtb(); }
    const round = OTB.current(t);
    if (b.dataset.res && t.status !== 'over') {
      const p = round.tables[Number(b.dataset.t)];
      const g = b.dataset.tb != null ? p.tb[Number(b.dataset.tb)] : b.dataset.g != null ? p.games[Number(b.dataset.g)] : p;
      g.r = g.r === b.dataset.res ? null : b.dataset.res;
      OTB.syncTiebreaks(t, p);
      otbSave(t); return renderOtb();
    }
    if (act === 'next') { if (OTB.next(t)) { otbSave(t); if (t.status === 'over') toast(L('Tournoi terminé : voici le podium !', 'Tournament over: here is the podium!')); renderOtb(); window.scrollTo(0, 0); } return; }
    if (act === 'undo') {
      return modal({ title: t.status === 'over' ? L('Rouvrir la dernière ronde ?', 'Reopen the last round?') : L('Annuler cette ronde ?', 'Cancel this round?'), text: t.status === 'over' ? L('Tu pourras corriger ses résultats.', 'You can then correct its results.') : L('Ses appariements et résultats sont effacés et tu reviens à la ronde précédente pour corriger un résultat.', 'Its pairings and results are erased and you go back to the previous round to correct a result.'), actions: [
        { label: L('Non', 'No'), ghost: true },
        { label: L('Oui', 'Yes'), primary: true, onClick: () => { OTB.undoRound(t); otbSave(t); renderOtb(); } },
      ] });
    }
    if (act === 'delete') {
      return modal({ title: L('Supprimer ce tournoi ?', 'Delete this tournament?'), text: t.name, actions: [
        { label: L('Annuler', 'Cancel'), ghost: true },
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => deleteOtbTournament(t) },
      ] });
    }
    if (b.dataset.otbOut) { const en = OTB.byNo(t, Number(b.dataset.otbOut)); en.out = !en.out; otbSave(t); return renderOtb(); }
    if (act === 'late') {
      const v = $('otb-late').value.trim(); if (!v) return;
      const [name, rest] = t.type === 'team' && v.includes(':') ? [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)] : [v, ''];
      const no = OTB.addEntrant(t, name.slice(0, 40), rest.split(/[,;]/).map((p) => p.trim()).filter(Boolean));
      if (no == null) return toast(L('Le tournoi est trop avancé pour accepter un retardataire.', 'The tournament is too far along to accept a latecomer.'));
      registerPlayers(tournamentNames(t));
      toast(OTB.byNo(t, no).lateFrom === 1 ? L(`${name.trim()} ajouté : la ronde 1 a été refaite.`, `${name.trim()} added: round 1 has been redone.`) : L(`${name.trim()} ajouté : il jouera dès la ronde ${OTB.byNo(t, no).lateFrom}.`, `${name.trim()} added: plays from round ${OTB.byNo(t, no).lateFrom}.`));
      otbSave(t); return renderOtb();
    }
    if (act === 'info') {
      const box = document.createElement('div');
      box.innerHTML = `<label class="field-label" for="otb-name">${L('Nom du tournoi', 'Tournament name')}</label><input id="otb-name" class="otb-input" maxlength="50" value="${escHtml(t.name)}">${infoFields(t.info || {})}`;
      return modal({ title: L('Infos du tournoi', 'Tournament details'), body: box, actions: [
        { label: L('Annuler', 'Cancel'), ghost: true },
        { label: L('Enregistrer', 'Save'), primary: true, onClick: () => { t.name = box.querySelector('#otb-name').value.trim() || t.name; t.info = readInfo(); otbSave(t); renderOtb(); } },
      ] });
    }
  });
