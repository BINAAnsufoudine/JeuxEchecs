  /* ---------- Tournoi en réel : l'appli organise un tournoi joué sur de vrais échiquiers ---------- */
  // Les noms sont saisis librement et numérotés ; à chaque ronde, l'appli annonce les tables (qui joue contre qui,
  // avec quelle couleur), on saisit les résultats, puis elle calcule la ronde suivante jusqu'au classement final.
  // Tout reste sur l'appareil (hors connexion). Calculs : otb.js.
  const OTB = window.OTB;
  const FORMAT_NAMES = L({ swiss: 'Système suisse', rr: 'Toutes rondes', rr2: 'Toutes rondes aller-retour', ko: 'Élimination directe' },
    { swiss: 'Swiss system', rr: 'Round robin', rr2: 'Double round robin', ko: 'Knockout' });
  let otbId = null, otbTab = 'round', otbNew = null;
  const otbList = () => store.get('otb', []);
  const otbGet = () => otbList().find((t) => t.id === otbId) || null;
  function otbSave(t) { const list = otbList().filter((x) => x.id !== t.id); list.unshift(t); store.set('otb', list.slice(0, 30)); }
  const who = (t, no) => { const e = OTB.byNo(t, no); return e ? `<span class="otb-no">${no}</span> ${escHtml(e.name)}` : '—'; };
  const plain = (t, no) => { const e = OTB.byNo(t, no); return e ? `${no}. ${e.name}` : '—'; };
  function openOtb() { returnTo = 'home'; otbId = null; otbNew = null; show('otb'); renderOtb(); }
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
      ${list.length ? `<h3 class="train-h">${L('Mes tournois', 'My tournaments')}</h3><div class="replay-items">${list.map((t) => `<button type="button" class="btn replay-item" data-otb-open="${t.id}"><strong>${t.type === 'team' ? '👥' : '♟️'} ${escHtml(t.name)}</strong><span>${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L('équipes', 'teams') : L('joueurs', 'players')} · ${t.status === 'over' ? L('terminé', 'finished') : L(`ronde ${t.rounds.length} sur ${t.totalRounds}`, `round ${t.rounds.length} of ${t.totalRounds}`)}</span></button>`).join('')}</div>` : ''}`;
  }

  /* ----- Création ----- */
  function renderOtbSetup() {
    const f = otbNew, team = f.type === 'team';
    const seg = (name, opts) => `<div class="ed-seg" data-otb-seg="${name}">${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${String(f[name]) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const n = parseEntrants(f).length;
    $('otb-body').innerHTML = `<label class="field-label" for="otb-name">${L('Nom du tournoi', 'Tournament name')}</label>
      <input id="otb-name" class="otb-input" maxlength="50" value="${escHtml(f.name)}" placeholder="${L('Tournoi du club', 'Club tournament')}">
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
    // élimination directe : après une égalité, on désigne qui passe
    if (t.format === 'ko' && !locked) {
      const s = OTB.tableScore(t, p);
      if (s.done && s.a === s.b) html += `<div class="otb-adv"><span>${L('Égalité : qui passe au tour suivant ?', 'Tie: who goes through?')}</span>${[p.a, p.b].map((no) => `<button type="button" class="btn${p.adv === no ? ' primary' : ''}" data-t="${i}" data-adv="${no}">${escHtml(OTB.byNo(t, no).name)}</button>`).join('')}</div>`;
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
    const round = OTB.current(t), done = OTB.roundDone(t, round), over = t.status === 'over';
    const tabs = [['round', over ? L('Podium', 'Podium') : L(`Ronde ${round.no}`, `Round ${round.no}`)], ['table', L('Classement', 'Standings')], ['people', t.type === 'team' ? L('Équipes', 'Teams') : L('Joueurs', 'Players')], ['history', L('Rondes', 'Rounds')]];
    let html = `<p class="level-help">${FORMAT_NAMES[t.format]} · ${t.entrants.length} ${t.type === 'team' ? L(`équipes · ${t.boards} échiquiers`, `teams · ${t.boards} boards`) : L('joueurs', 'players')} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</p>
      <div class="ed-seg otb-tabs">${tabs.map(([id, label]) => `<button type="button" data-otb-tab="${id}" class="${otbTab === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    if (otbTab === 'round') {
      if (over) {
        const st = OTB.standings(t);
        html += `<div class="otb-podium">${st.slice(0, 3).map((x, i) => `<div class="p${i + 1}"><span>${['🥇', '🥈', '🥉'][i]}</span><b>${escHtml(x.name)}</b><small>${x.pts} ${t.type === 'team' ? L('pts de match', 'match pts') : L('pts', 'pts')}</small></div>`).join('')}</div>${standingsHtml(t)}`;
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
      html += `<div class="replay-items">${t.entrants.map((e) => `<div class="btn replay-item otb-person${e.out ? ' otb-out' : ''}"><strong>${who(t, e.no)}</strong>${e.players && e.players.length ? `<span>${e.players.map((p, k) => `${k + 1}. ${escHtml(p)}`).join(' · ')}</span>` : ''}${canEdit ? `<button type="button" class="btn ghost" data-otb-out="${e.no}">${e.out ? L('Réintégrer', 'Bring back') : L('Abandon', 'Withdraw')}</button>` : ''}</div>`).join('')}</div>
        ${canEdit ? `<p class="level-help">${L('Un joueur qui abandonne n’est plus apparié à partir de la ronde suivante. Un retardataire entre à la prochaine ronde avec 0 point.', 'A withdrawn player is not paired from the next round. A latecomer joins the next round with 0 points.')}</p>
          <div class="club-form"><input id="otb-late" maxlength="40" placeholder="${t.type === 'team' ? L('Équipe : joueur 1, joueur 2…', 'Team: player 1, player 2…') : L('Nom du retardataire', 'Latecomer’s name')}"><button type="button" class="btn" data-otb="late">${L('Ajouter', 'Add')}</button></div>`
          : `<p class="level-help">${t.format === 'swiss' ? '' : L('Dans cette formule, la liste est fixée au départ : un joueur absent perd ses parties par forfait (saisis 1-0 ou 0-1).', 'In this format the list is fixed: an absent player loses by forfeit (enter 1-0 or 0-1).')}</p>`}`;
    }
    if (otbTab === 'history') {
      html += t.rounds.map((r) => `<h3 class="train-h">${L(`Ronde ${r.no}`, `Round ${r.no}`)}</h3><table class="tour-table">${r.tables.map((p) => {
        const s = OTB.tableScore(t, p);
        const res = p.b == null ? L('exempt', 'bye') : s.done ? (t.type === 'team' ? `${s.ga} – ${s.gb}` : { '1-0': '1 – 0', '0-1': '0 – 1', '1/2': '½ – ½' }[p.r]) : '…';
        return `<tr><td>${p.table}</td><td>${who(t, p.a)}</td><td><b>${res}</b>${t.format === 'ko' && p.adv != null && s.a === s.b ? ` <small>(${L('passe', 'through')} : ${escHtml(OTB.byNo(t, p.adv).name)})</small>` : ''}</td><td>${p.b == null ? '' : who(t, p.b)}</td></tr>`;
      }).join('')}</table>`).join('');
    }
    html += `<div class="actions"><button type="button" class="btn ghost" data-otb="list">${L('Mes tournois', 'My tournaments')}</button><button type="button" class="btn ghost" data-otb="delete">🗑️ ${L('Supprimer', 'Delete')}</button></div>`;
    $('otb-body').innerHTML = html;
  }

  /* ----- Grand écran et impression ----- */
  function bigScreen(t) {
    const round = OTB.current(t), over = t.status === 'over';
    const box = document.createElement('div');
    box.className = 'otb-big';
    box.innerHTML = `<h1>${escHtml(t.name)} · ${over ? L('Classement final', 'Final standings') : L(`Ronde ${round.no}`, `Round ${round.no}`)}</h1>`
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
      <h1>${escHtml(t.name)}</h1><div>${FORMAT_NAMES[t.format]} · ${over ? L('tournoi terminé', 'finished') : L(`ronde ${round.no} sur ${t.totalRounds}`, `round ${round.no} of ${t.totalRounds}`)}</div>
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
    if (act === 'new') { otbNew = { name: '', type: 'solo', format: 'swiss', rounds: null, boards: 4, text: '', shuffle: false }; return renderOtb(); }
    if (act === 'cancel') { otbNew = null; return renderOtb(); }
    if (b.closest('[data-otb-seg]')) { readOtbForm(); const k = b.closest('[data-otb-seg]').dataset.otbSeg; otbNew[k] = b.dataset.value; if (k === 'format') otbNew.rounds = null; return renderOtb(); }
    if (act === 'start') return startOtb();
    if (b.dataset.otbOpen) { otbId = Number(b.dataset.otbOpen); otbTab = 'round'; return renderOtb(); }
    if (act === 'list') { otbId = null; return renderOtb(); }
    const t = otbGet(); if (!t) return;
    if (b.dataset.otbTab) { otbTab = b.dataset.otbTab; return renderOtb(); }
    const round = OTB.current(t);
    if (b.dataset.res && t.status !== 'over') {
      const p = round.tables[Number(b.dataset.t)];
      if (b.dataset.g != null) { const g = p.games[Number(b.dataset.g)]; g.r = g.r === b.dataset.res ? null : b.dataset.res; } else p.r = p.r === b.dataset.res ? null : b.dataset.res;
      if (t.format === 'ko') { const s = OTB.tableScore(t, p); if (!s.done || s.a !== s.b) delete p.adv; }
      otbSave(t); return renderOtb();
    }
    if (b.dataset.adv) { round.tables[Number(b.dataset.t)].adv = Number(b.dataset.adv); otbSave(t); return renderOtb(); }
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
        { label: L('Supprimer', 'Delete'), primary: true, onClick: () => { store.set('otb', otbList().filter((x) => x.id !== t.id)); otbId = null; renderOtb(); } },
      ] });
    }
    if (b.dataset.otbOut) { const en = OTB.byNo(t, Number(b.dataset.otbOut)); en.out = !en.out; otbSave(t); return renderOtb(); }
    if (act === 'late') {
      const v = $('otb-late').value.trim(); if (!v) return;
      const [name, rest] = t.type === 'team' && v.includes(':') ? [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)] : [v, ''];
      OTB.addEntrant(t, name.slice(0, 40), rest.split(/[,;]/).map((p) => p.trim()).filter(Boolean));
      otbSave(t); return renderOtb();
    }
    if (act === 'big') return bigScreen(t);
    if (act === 'print') return printOtb(t);
  });
