  /* ---------- Tournoi en réel : l'appli organise un tournoi joué sur de vrais échiquiers ---------- */
  // Les noms sont saisis librement et numérotés ; à chaque ronde, l'appli annonce les tables (qui joue contre qui,
  // avec quelle couleur), on saisit les résultats, puis elle calcule la ronde suivante jusqu'au classement final.
  // Tout reste sur l'appareil (hors connexion). Calculs : otb.js.
  const OTB = window.OTB;
  const FORMAT_NAMES = L({ swiss: 'Système suisse', rr: 'Toutes rondes', rr2: 'Toutes rondes aller-retour', ko: 'Élimination directe' },
    { swiss: 'Swiss system', rr: 'Round robin', rr2: 'Double round robin', ko: 'Knockout' });
  let otbId = null, otbTab = 'round', otbNew = null;
  // Tournois partagés par d'autres joueurs (lecture seule), et celui qu'on regarde en direct
  let otbShared = [], otbView = null, otbStopWatch = null;
  const otbList = () => store.get('otb', []);
  const otbGet = () => (otbView && otbId === otbView.key ? otbView.t : otbList().find((t) => t.id === otbId) || null);
  // Enregistré sur l'appareil, puis (compte connecté) sur le compte en ligne, quelques instants après la dernière saisie
  let otbUpload = null;
  function otbSave(t) {
    t.updatedAt = Date.now();
    const list = otbList().filter((x) => x.id !== t.id); list.unshift(t); store.set('otb', list.slice(0, 50));
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
      for (const t of mine) { const l = byId.get(t.id); if (!l || (t.updatedAt || 0) > (l.updatedAt || 0)) byId.set(t.id, t); }
      // les tournois de l'appareil pas encore envoyés partent sur le compte
      for (const t of local) if (!mine.some((m) => m.id === t.id)) ON.saveOtb(t).catch(() => {});
      store.set('otb', [...byId.values()].sort((a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id)).slice(0, 50));
      otbShared = shared;
    } catch { /* hors ligne : on garde l'appareil */ }
  }
  const otbReadOnly = (t) => !!(otbView && otbView.t === t);
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
  function openOtb() { returnTo = 'home'; closeOtbView(); otbId = null; otbNew = null; show('otb'); renderOtb(); otbSync().then(() => { if (document.body.dataset.screen === 'otb' && !otbId && !otbNew) renderOtb(); }); }
  $('btn-otb').onclick = openOtb;

  function renderOtb() {
    const t = otbGet();
    $('otb-title').textContent = t ? t.name : L('Tournoi en réel', 'Over-the-board tournament');
    if (otbNew) return renderOtbSetup();
    if (!t) return renderOtbHome();
    renderOtbTournament(t);
  }
  function renderOtbHome() {
    const list = otbList();
    $('otb-body').innerHTML = `<p class="level-help">${L('Pour un tournoi joué sur de vrais échiquiers : saisis les noms, l’appli annonce à chaque ronde qui joue contre qui, tu entres les résultats, et elle s’occupe du reste jusqu’au classement final.', 'For a tournament played on real boards: enter the names, the app announces each round who plays whom, you enter the results, and it handles the rest up to the final standings.')}</p>
      <button type="button" class="btn primary wide" data-otb="new">➕ ${L('Nouveau tournoi', 'New tournament')}</button>
      ${ON && ON.user ? '' : `<p class="level-help">${L('Connecte-toi pour garder l’historique de tes tournois sur ton compte et les partager avec d’autres joueurs.', 'Sign in to keep your tournament history on your account and share it with other players.')}</p>`}
      ${otbShared.length ? `<h3 class="train-h">${L('Partagés avec moi', 'Shared with me')}</h3><div class="replay-items">${otbShared.map((s) => `<button type="button" class="btn replay-item" data-otb-shared="${s.docId}"><strong>👁️ ${escHtml(s.t.name)}</strong><span>${L(`Organisé par ${escHtml(s.ownerName)}`, `Organised by ${escHtml(s.ownerName)}`)}${s.t.info && s.t.info.date ? ` · ${fmtOtbDate(s.t.info.date)}` : ''} · ${s.t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${s.t.rounds.length} sur ${s.t.totalRounds}`, `round ${s.t.rounds.length} of ${s.t.totalRounds}`)}</span></button>`).join('')}</div>` : ''}
      ${list.length ? `<h3 class="train-h">${L('Mes tournois', 'My tournaments')}</h3><div class="replay-items">${list.map((t) => `<button type="button" class="btn replay-item" data-otb-open="${t.id}"><strong>${t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}</strong><span>${t.info && t.info.date ? `${fmtOtbDate(t.info.date)} · ` : ''}${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L('équipes', 'teams') : L('joueurs', 'players')} · ${t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${t.rounds.length} sur ${t.totalRounds}`, `round ${t.rounds.length} of ${t.totalRounds}`)}</span></button>`).join('')}</div>` : ''}`;
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
      ${team ? `<label class="field-label" for="otb-boards">${L('Échiquiers par équipe', 'Boards per team')}</label><input id="otb-boards" class="otb-input otb-small" type="number" min="1" max="10" value="${f.boards}">` : ''}
      <label class="field-label" for="otb-names">${team ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${n})</label>
      <textarea id="otb-names" class="otb-input" rows="10" placeholder="${team ? L('Une équipe par ligne :\nLes Lions : Awa, Moussa, Fatou, Ibrahim\nLes Aigles : Koffi, Aminata, Seydou, Mariam', 'One team per line:\nLions: Awa, Moussa, Fatou, Ibrahim') : L('Un nom par ligne :\nAwa\nMoussa\nFatou', 'One name per line:\nAwa\nMoussa')}">${escHtml(f.text)}</textarea>
      <p class="level-help">${team ? L('Range les joueurs de chaque équipe dans l’ordre des échiquiers (le premier joue à l’échiquier 1).', 'List each team’s players in board order (the first plays board 1).') : L('Chaque nom reçoit un numéro dans l’ordre de la liste.', 'Each name gets a number in list order.')}</p>
      <label class="switch"><input type="checkbox" id="otb-shuffle"${f.shuffle ? ' checked' : ''}><span>${L('Tirer les numéros au sort', 'Draw the numbers at random')}</span></label>
      <div class="actions"><button type="button" class="btn ghost" data-otb="cancel">${L('Annuler', 'Cancel')}</button><button type="button" class="btn primary" data-otb="start">${L('Commencer le tournoi', 'Start the tournament')}</button></div>`;
  }
  function parseEntrants(f) {
    return String(f.text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      if (f.type !== 'team') return { name: line.slice(0, 40) };
      const [name, rest] = line.includes(':') ? [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)] : [line, ''];
      return { name: name.trim().slice(0, 40), players: rest.split(/[,;]/).map((p) => p.trim().slice(0, 30)).filter(Boolean) };
    });
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
    if (p.b == null) return `<div class="otb-table bye"><b>${L('Exempt', 'Bye')}</b><span>${who(t, p.a)}</span><small>${t.format === 'ko' ? L('qualifié d’office pour le tour suivant', 'goes straight to the next round') : t.type === 'team' ? L('+2 points de match', '+2 match points') : L('+1 point', '+1 point')}</small></div>`;
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
  function standingsHtml(t) {
    const st = OTB.standings(t), team = t.type === 'team', rr = t.format === 'rr' || t.format === 'rr2';
    const medal = (i) => (t.status === 'over' && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1);
    return `<div class="tour-scroll"><table class="tour-table otb-standings"><tr><th>${L('Rang', 'Rank')}</th><th>${team ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${team ? L('Pts match', 'Match pts') : L('Points', 'Points')}</th>${team ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}${t.format === 'ko' ? '' : `<th>${rr ? 'S-B' : 'Buchholz'}</th><th>${rr ? 'Buchholz' : 'S-B'}</th>`}<th>${L('Parties', 'Played')}</th></tr>
      ${st.map((x, i) => `<tr class="${x.out ? 'otb-out' : ''}"><td>${medal(i)}</td><td>${who(t, x.no)}${x.out ? ` <small>(${L('abandon', 'withdrew')})</small>` : ''}</td><td><b>${x.pts}</b></td>${team ? `<td>${x.game}</td>` : ''}${t.format === 'ko' ? '' : `<td>${+(rr ? x.sb : x.buch).toFixed(2)}</td><td>${+(rr ? x.buch : x.sb).toFixed(2)}</td>`}<td>${x.played}</td></tr>`).join('')}</table></div>
      <p class="level-help">${t.format === 'ko' ? L('Classement par tour atteint.', 'Ranked by round reached.') : L('À égalité de points : Buchholz (total des points des adversaires), puis Sonneborn-Berger (points des adversaires battus, la moitié pour les nulles).', 'Tied on points: Buchholz (opponents’ total points), then Sonneborn-Berger (points of beaten opponents, half for draws).')}</p>`;
  }
  function renderOtbTournament(t) {
    const round = OTB.current(t), done = OTB.roundDone(t, round), over = t.status === 'over', ro = otbReadOnly(t);
    const tabs = [['round', over ? L('Podium', 'Podium') : L(`Ronde ${round.no}`, `Round ${round.no}`)], ['table', L('Classement', 'Standings')], ['people', t.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')], ['history', L('Rondes', 'Rounds')]];
    const infoLine = otbInfoLine(t, '<br>');
    const shares = Object.entries(t.shares || {});
    let html = `${ro ? `<p class="otb-shared-note">👁️ ${L(`Tournoi de ${escHtml(otbView.ownerName)}, suivi en direct (lecture seule)`, `${escHtml(otbView.ownerName)}’s tournament, followed live (read only)`)}</p>` : ''}${infoLine ? `<p class="otb-info">${infoLine}</p>` : ''}<p class="level-help">${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L(`équipes · ${t.boards} échiquiers`, `teams · ${t.boards} boards`) : L('joueurs', 'players')} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</p>
      <div class="ed-seg otb-tabs">${tabs.map(([id, label]) => `<button type="button" data-otb-tab="${id}" class="${otbTab === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    if (otbTab === 'round') {
      if (over) {
        const st = OTB.standings(t);
        html += `<div class="otb-podium">${st.slice(0, 3).map((x, i) => `<div class="p${i + 1}"><span>${['🥇', '🥈', '🥉'][i]}</span><b>${escHtml(x.name)}</b><small>${x.pts} ${t.type === 'team' ? L('pts de match', 'match pts') : L('pts', 'pts')}</small></div>`).join('')}</div>${standingsHtml(t)}`;
      } else {
        const missing = round.tables.filter((p) => !OTB.tableScore(t, p).done || (t.format === 'ko' && p.b != null && OTB.winnerOf(t, p) == null)).length;
        html += `<div class="otb-tables">${round.tables.map((p, i) => [p, i]).sort((x, y) => (x[0].b == null) - (y[0].b == null)).map(([p, i]) => tableHtml(t, p, i, ro)).join('')}</div>
          <p class="level-help">${done ? L('Tous les résultats sont saisis.', 'All results are in.') : L(`Résultats à saisir : ${missing}.`, `Results to enter: ${missing}.`)}</p>
          ${ro ? '' : `<div class="actions"><button type="button" class="btn primary" data-otb="next"${done ? '' : ' disabled'}>${round.no >= t.totalRounds || (t.format === 'ko' && round.tables.length === 1) ? L('Terminer le tournoi', 'Finish the tournament') : L('Ronde suivante', 'Next round')}</button></div>`}`;
      }
      html += `<div class="actions otb-tools"><button type="button" class="btn" data-otb="big">📺 ${L('Grand écran', 'Big screen')}</button><button type="button" class="btn" data-otb="print">🖨️ ${L('Imprimer', 'Print')}</button>${!ro && (t.rounds.length > 1 || over) ? `<button type="button" class="btn ghost" data-otb="undo">↩️ ${over ? L('Rouvrir la dernière ronde', 'Reopen the last round') : L('Annuler cette ronde', 'Cancel this round')}</button>` : ''}</div>`;
    }
    if (otbTab === 'table') html += standingsHtml(t);
    if (otbTab === 'people') {
      const canEdit = t.format === 'swiss' && !over && !ro;
      html += `<div class="replay-items">${t.entrants.map((e) => `<div class="btn replay-item otb-person${e.out ? ' otb-out' : ''}"><strong>${who(t, e.no)}</strong>${e.players && e.players.length ? `<span>${e.players.map((p, k) => `${k + 1}. ${escHtml(p)}`).join(' · ')}</span>` : ''}${canEdit ? `<button type="button" class="btn ghost" data-otb-out="${e.no}">${e.out ? L('Réintégrer', 'Bring back') : L('Abandon', 'Withdraw')}</button>` : ''}</div>`).join('')}</div>
        ${canEdit ? `<p class="level-help">${L('Un joueur qui abandonne n’est plus apparié à partir de la ronde suivante. Un retardataire entre à la prochaine ronde avec 0 point.', 'A withdrawn player is not paired from the next round. A latecomer joins the next round with 0 points.')}</p>
          <div class="club-form"><input id="otb-late" maxlength="40" placeholder="${t.type === 'team' ? L('Équipe : joueur 1, joueur 2…', 'Team: player 1, player 2…') : L('Nom du retardataire', 'Latecomer’s name')}"><button type="button" class="btn" data-otb="late">${L('Ajouter', 'Add')}</button></div>`
          : `<p class="level-help">${t.format === 'swiss' ? '' : L('Dans cette formule, la liste est fixée au départ : un joueur absent perd ses parties par forfait (saisis 1-0 ou 0-1).', 'In this format the list is fixed: an absent player loses by forfeit (enter 1-0 or 0-1).')}</p>`}`;
    }
    if (otbTab === 'history') {
      html += t.rounds.map((r) => `<h3 class="train-h">${L(`Ronde ${r.no}`, `Round ${r.no}`)}</h3><table class="tour-table">${r.tables.map((p) => {
        const s = OTB.tableScore(t, p);
        const res = p.b == null ? L('exempt', 'bye') : s.done ? (t.type === 'team' ? `${s.ga} – ${s.gb}` : { '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½' }[p.r]) : '…';
        return `<tr><td>${p.table}</td><td>${who(t, p.a)}</td><td><b>${res}</b>${t.format === 'ko' && s.done && s.a === s.b && p.adv != null ? ` <small>(${L('qualifié par l’organisateur', 'qualified by the organiser')} : ${escHtml(OTB.byNo(t, p.adv).name)})</small>` : ''}${t.format === 'ko' && s.done && s.a === s.b && p.adv == null && OTB.winnerOf(t, p) != null ? ` <small>(${L('départage', 'play-off')} : ${(p.tb || []).map((g) => ({ '1-0': '1-0', '0-1': '0-1', '1/2': '½' }[g.r] || '…')).join(', ')} · ${L('qualifié', 'through')} : ${escHtml(OTB.byNo(t, OTB.winnerOf(t, p)).name)})</small>` : ''}</td><td>${p.b == null ? '' : who(t, p.b)}</td></tr>`;
      }).join('')}</table>`).join('');
    }
    if (!ro) html += `<h3 class="train-h">${L('Partage', 'Sharing')}</h3>${shares.length ? `<div class="otb-shares">${shares.map(([uid, name]) => `<span>${escHtml(name)}<button type="button" class="btn ghost" data-otb-unshare="${uid}" aria-label="${L('Ne plus partager', 'Stop sharing')}">✕</button></span>`).join('')}</div>` : `<p class="level-help">${L('Partage ce tournoi avec d’autres joueurs de l’appli : ils suivront les tables, les résultats et le classement en direct, sans pouvoir rien modifier.', 'Share this tournament with other players: they follow the tables, results and standings live, without being able to change anything.')}</p>`}
      <div class="club-form"><input id="otb-share" maxlength="30" autocomplete="off" placeholder="${L('Pseudo du joueur', 'Player’s nickname')}"><button type="button" class="btn" data-otb="share">🔗 ${L('Partager', 'Share')}</button></div>`;
    html += `<div class="actions"><button type="button" class="btn ghost" data-otb="list">${ro ? L('Retour', 'Back') : L('Mes tournois', 'My tournaments')}</button>${ro ? '' : `<button type="button" class="btn ghost" data-otb="info">✏️ ${L('Infos du tournoi', 'Tournament details')}</button><button type="button" class="btn ghost" data-otb="delete">🗑️ ${L('Supprimer', 'Delete')}</button>`}</div>`;
    $('otb-body').innerHTML = html;
  }

  /* ----- Grand écran et impression ----- */
  function bigScreen(t) {
    const round = OTB.current(t), over = t.status === 'over';
    const box = document.createElement('div');
    box.className = 'otb-big';
    box.innerHTML = `<h1>${escHtml(t.name)} · ${over ? L('Classement final', 'Final standings') : L(`Ronde ${round.no}`, `Round ${round.no}`)}</h1>${otbInfoLine(t) ? `<div class="otb-big-info">${otbInfoLine(t)}</div>` : ''}`
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
      ${over ? '' : `<h2>${L(`Ronde ${round.no} : appariements`, `Round ${round.no}: pairings`)}</h2><table><tr><th>${L('Table', 'Table')}</th><th>${L('Blancs', 'White')}</th><th>${L('Résultat', 'Result')}</th><th>${L('Noirs', 'Black')}</th></tr>${rows}</table>`}
      <h2>${L('Classement', 'Standings')}</h2><table><tr><th>#</th><th>${t.type === 'team' ? L('Équipe', 'Team') : L('Joueur', 'Player')}</th><th>${L('Points', 'Points')}</th>${t.type === 'team' ? `<th>${L('Pts parties', 'Game pts')}</th>` : ''}<th>Buchholz</th></tr>${st.map((x, i) => `<tr><td>${i + 1}</td><td>${escHtml(plain(t, x.no))}</td><td>${x.pts}</td>${t.type === 'team' ? `<td>${x.game}</td>` : ''}<td>${x.buch}</td></tr>`).join('')}</table>
      <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast(L('Autorise les fenêtres pour imprimer.', 'Allow pop-ups to print.'));
    w.document.write(doc); w.document.close();
  }

  /* ----- Clics ----- */
  $('otb-body').addEventListener('input', (e) => {
    if (!otbNew) return;
    if (e.target.id === 'otb-rounds') e.target.dataset.touched = '1';
    if (e.target.id === 'otb-names') {
      const n = parseEntrants({ ...otbNew, text: e.target.value }).length, sug = OTB.suggestedRounds(Math.max(2, n)), team = otbNew.type === 'team';
      if ($('otb-rounds') && !$('otb-rounds').dataset.touched) $('otb-rounds').value = sug;
      if ($('otb-rounds-help')) $('otb-rounds-help').textContent = L(`Conseillé pour ${n} ${team ? 'équipes' : 'joueurs'} : ${sug} rondes.`, `Advised for ${n} ${team ? 'teams' : 'players'}: ${sug} rounds.`); readOtbForm(); const lab = document.querySelector('label[for="otb-names"]'); if (lab) lab.textContent = `${otbNew.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')} (${parseEntrants(otbNew).length})`; }
  });
  $('otb-body').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.otb;
    if (act === 'new') { const now = new Date(); otbNew = { date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, place: '', referee: '', name: '', type: 'solo', format: 'swiss', rounds: null, boards: 4, text: '', shuffle: false }; return renderOtb(); }
    if (act === 'cancel') { otbNew = null; return renderOtb(); }
    if (b.closest('[data-otb-seg]')) { readOtbForm(); const k = b.closest('[data-otb-seg]').dataset.otbSeg; otbNew[k] = b.dataset.value; if (k === 'format') otbNew.rounds = null; return renderOtb(); }
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
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => { store.set('otb', otbList().filter((x) => x.id !== t.id)); if (ON && ON.user) ON.deleteOtb(t); otbId = null; renderOtb(); } },
      ] });
    }
    if (b.dataset.otbOut) { const en = OTB.byNo(t, Number(b.dataset.otbOut)); en.out = !en.out; otbSave(t); return renderOtb(); }
    if (act === 'late') {
      const v = $('otb-late').value.trim(); if (!v) return;
      const [name, rest] = t.type === 'team' && v.includes(':') ? [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)] : [v, ''];
      OTB.addEntrant(t, name.slice(0, 40), rest.split(/[,;]/).map((p) => p.trim()).filter(Boolean));
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
