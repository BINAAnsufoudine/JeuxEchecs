  /* ---------- Profil : statistiques (ordinateur, joueurs, tournois, apprentissage) et grades ---------- */
  // Rang d'un participant à la fin d'un tournoi (points, puis départage)
  function tournamentPlace(t, uid) {
    if (t.status !== 'over') return null;
    const ids = ON.participants(t);
    const buch = (id) => ((t.met || {})[id] || []).reduce((s, o) => s + ((t.scores || {})[o] || 0), 0);
    const order = ids.slice().sort((a, b) => ((t.scores || {})[b] || 0) - ((t.scores || {})[a] || 0) || buch(b) - buch(a));
    const me = t.type === 'team' ? (t.teams.find((tm) => tm.members.includes(uid)) || {}).id : uid;
    const i = order.indexOf(me);
    return i < 0 ? null : i + 1;
  }
  function localSummary(tours) {
    const stats = store.get('stats', {});
    const ai = { win: 0, draw: 0, loss: 0, best: 0 };
    for (const [lvl, s] of Object.entries(stats)) { ai.win += s.win; ai.draw += s.draw; ai.loss += s.loss; if (s.win) ai.best = Math.max(ai.best, Number(lvl)); }
    const on = { win: 0, draw: 0, loss: 0, opponents: new Set() };
    for (const g of store.get('onlineArchive', [])) {
      const mine = g.color === 'w' ? '1-0' : '0-1';
      if (g.result === mine) on.win++; else if (g.result === '1/2-1/2') on.draw++; else on.loss++;
      on.opponents.add(g.color === 'w' ? g.black : g.white);
    }
    const pz = Object.values(store.get('pzdone', {})).filter((v) => v === 's').length;
    const done = store.get('trainDone', {});
    const mates = Object.keys(done).filter((k) => k.startsWith('mate:')).length;
    const ends = Object.keys(done).filter((k) => k.startsWith('end:')).length;
    const sr = store.get('openingsSR', {});
    const openings = Object.values(sr).filter((r) => r.stage >= 3).length;
    const daily = store.get('daily', {});
    const tour = { played: 0, wins: 0, second: 0, third: 0 };
    for (const t of tours || []) {
      const place = ON && ON.user ? tournamentPlace(t, ON.user.uid) : null;
      if (t.status === 'over' && place) { tour.played++; if (place === 1) tour.wins++; else if (place === 2) tour.second++; else if (place === 3) tour.third++; }
    }
    const w = walletState();
    return { level: levelOf(w.xp).level, title: w.title ? titleName(w.title) : null, frame: w.frame, ai, online: { win: on.win, draw: on.draw, loss: on.loss, opponents: on.opponents.size }, tour, pz, mates, ends, openings, dailyBest: daily.best || 0, unlocked: unlocked(), elo: estimatedElo() };
  }
  // Grades gagnés par les exploits : étoiles (ordinateur), médailles et coupes (tournois), et plus
  const BADGES = [
    { id: 'ai1', icon: '⭐', name: L('Première victoire', 'First win'), desc: L('Battre l\'ordinateur une fois', 'Beat the computer once'), ok: (s) => s.ai.win >= 1 },
    { id: 'ai10', icon: '⭐⭐', name: L('Dix victoires', 'Ten wins'), desc: L('10 victoires contre l\'ordinateur', '10 wins against the computer'), ok: (s) => s.ai.win >= 10 },
    { id: 'ai50', icon: '⭐⭐⭐', name: L('Cinquante victoires', 'Fifty wins'), desc: L('50 victoires contre l\'ordinateur', '50 wins against the computer'), ok: (s) => s.ai.win >= 50 },
    { id: 'lvl-exp', icon: '🎖️', name: L('Expert', 'Expert'), desc: L('Battre un niveau Expert', 'Beat an Expert level'), ok: (s) => s.ai.best >= 13 },
    { id: 'lvl-gm', icon: '🎖️🎖️', name: L('Grand maître', 'Grandmaster'), desc: L('Battre un niveau Grand maître', 'Beat a Grandmaster level'), ok: (s) => s.ai.best >= 19 },
    { id: 'lvl-ch', icon: '👑', name: L('Champion', 'Champion'), desc: L('Battre le niveau Champion', 'Beat the Champion level'), ok: (s) => s.ai.best >= 22 },
    { id: 'on1', icon: '♟️', name: L('Premier duel gagné', 'First duel won'), desc: L('Gagner une partie en ligne', 'Win an online game'), ok: (s) => s.online.win >= 1 },
    { id: 'on10', icon: '⚔️', name: L('Duelliste', 'Duellist'), desc: L('10 victoires en ligne', '10 online wins'), ok: (s) => s.online.win >= 10 },
    { id: 'friends', icon: '🤝', name: L('Sociable', 'Sociable'), desc: L('Jouer contre 5 joueurs différents', 'Play 5 different players'), ok: (s) => s.online.opponents >= 5 },
    { id: 'tour1', icon: '🎟️', name: L('Compétiteur', 'Competitor'), desc: L('Finir un tournoi', 'Finish a tournament'), ok: (s) => s.tour.played >= 1 },
    { id: 'bronze', icon: '🥉', name: L('Médaille de bronze', 'Bronze medal'), desc: L('Finir 3e d\'un tournoi', 'Finish 3rd in a tournament'), ok: (s) => s.tour.third >= 1 },
    { id: 'silver', icon: '🥈', name: L('Médaille d\'argent', 'Silver medal'), desc: L('Finir 2e d\'un tournoi', 'Finish 2nd in a tournament'), ok: (s) => s.tour.second >= 1 },
    { id: 'gold', icon: '🥇', name: L('Médaille d\'or', 'Gold medal'), desc: L('Gagner un tournoi', 'Win a tournament'), ok: (s) => s.tour.wins >= 1 },
    { id: 'cup', icon: '🏆', name: L('Coupe des champions', 'Champions cup'), desc: L('Gagner 3 tournois', 'Win 3 tournaments'), ok: (s) => s.tour.wins >= 3 },
    { id: 'pz50', icon: '🧩', name: L('Résolveur', 'Solver'), desc: L('Résoudre 50 problèmes', 'Solve 50 puzzles'), ok: (s) => s.pz >= 50 },
    { id: 'mates', icon: '🧠', name: L('Maître des mats', 'Master of mates'), desc: L('Apprendre les 13 mats', 'Learn all 13 mates'), ok: (s) => s.mates >= 13 },
    { id: 'ends', icon: '🏁', name: L('Finaliste', 'Endgame expert'), desc: L('Réussir les 5 finales de base', 'Pass the 5 basic endgames'), ok: (s) => s.ends >= 5 },
    { id: 'open', icon: '📖', name: L('Théoricien', 'Theorist'), desc: L('Maîtriser 5 ouvertures', 'Master 5 openings'), ok: (s) => s.openings >= 5 },
    { id: 'streak', icon: '🔥', name: L('Assidu', 'Dedicated'), desc: L('Série de 7 jours au défi du jour', '7-day daily challenge streak'), ok: (s) => s.dailyBest >= 7 },
  ];
  function profileHtml(s, who) {
    const n = (x) => NUM(x, x % 1 ? 1 : 0);
    const won = BADGES.filter((b) => b.ok(s));
    const pct = (w, d, l) => { const t = w + d + l; return t ? `${Math.round((100 * (w + d / 2)) / t)} %` : '–'; };
    const fr = s.frame ? ` frame-${escHtml(s.frame)}` : '';
    let html = `<div class="profile-head">${who.photo ? `<img class="profile-photo big${fr}" src="${who.photo}" alt="">` : `<span class="profile-photo big placeholder${fr}">♞</span>`}<div><b>${escHtml(who.name)}</b>${s.title ? `<em class="player-title">« ${escHtml(s.title)} »</em>` : ''}<span>${s.level ? `${L('Niveau', 'Level')} ${s.level} · ` : ''}Elo ${L('estimé', 'est.')} ${s.elo}</span>${who.grade != null ? `<span class="grade-line">${gradeLabel(who.grade)} · ${gradeOf(who.grade).pts} ${L('pts', 'pts')}${gradeOf(who.grade).next ? L(` (prochain : ${gradeOf(who.grade).nextName} à ${gradeOf(who.grade).next})`, ` (next: ${gradeOf(who.grade).nextName} at ${gradeOf(who.grade).next})`) : ''}</span>` : ''}${won.length ? `<span class="profile-badges-line">${won.slice(-6).map((b) => b.icon).join(' ')}</span>` : ''}</div></div>`;
    html += `<h3 class="train-h">${L('Grades', 'Ranks')} (${won.length}/${BADGES.length})</h3><div class="badge-grid">${BADGES.map((b) => `<div class="badge${b.ok(s) ? ' on' : ''}" title="${escHtml(b.desc)}"><span class="badge-icon">${b.icon}</span><b>${escHtml(b.name)}</b><small>${escHtml(b.desc)}</small></div>`).join('')}</div>`;
    const card = (title, rows) => `<div class="stat-card"><h4>${title}</h4>${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
    html += `<h3 class="train-h">${L('Statistiques', 'Statistics')}</h3><div class="stat-cards">
      ${card(L('Contre l\'ordinateur', 'Against the computer'), [[L('Victoires', 'Wins'), s.ai.win], [L('Nulles', 'Draws'), s.ai.draw], [L('Défaites', 'Losses'), s.ai.loss], [L('Score', 'Score'), pct(s.ai.win, s.ai.draw, s.ai.loss)], [L('Meilleur niveau battu', 'Best level beaten'), s.ai.best ? LEVEL_NAMES[s.ai.best] : '–']])}
      ${card(L('Contre les joueurs', 'Against players'), [[L('Victoires', 'Wins'), s.online.win], [L('Nulles', 'Draws'), s.online.draw], [L('Défaites', 'Losses'), s.online.loss], [L('Score', 'Score'), pct(s.online.win, s.online.draw, s.online.loss)], [L('Adversaires différents', 'Different opponents'), s.online.opponents]])}
      ${card(L('Tournois', 'Tournaments'), [[L('Terminés', 'Finished'), s.tour.played], ['🥇', s.tour.wins], ['🥈', s.tour.second], ['🥉', s.tour.third]])}
      ${card(L('Apprentissage', 'Learning'), [[L('Problèmes résolus', 'Puzzles solved'), s.pz], [L('Mats appris', 'Mates learned'), `${s.mates}/13`], [L('Finales réussies', 'Endgames passed'), `${s.ends}/5`], [L('Ouvertures maîtrisées', 'Openings mastered'), s.openings], [L('Meilleure série du défi', 'Best daily streak'), n(s.dailyBest)]])}
    </div>`;
    return html;
  }
  async function openProfile(uid) {
    returnTo = document.body.dataset.screen && document.body.dataset.screen !== 'profile' ? document.body.dataset.screen : 'home';
    const mine = !uid || (ON && ON.user && uid === ON.user.uid);
    $('profile-title').textContent = mine ? L('Mon profil', 'My profile') : L('Profil', 'Profile');
    show('profile');
    const body = $('profile-body');
    if (mine) {
      const p = playerProfile();
      let tours = [];
      const payBadges = (s) => { const w = walletState(), fresh = BADGES.filter((b) => b.ok(s) && !w.badgesPaid.includes(b.id)); if (!fresh.length) return; w.badgesPaid.push(...fresh.map((b) => b.id)); store.set('wallet', w); reward(50 * fresh.length, 50 * fresh.length, L(`${fresh.length} grade${fresh.length > 1 ? 's' : ''} gagné${fresh.length > 1 ? 's' : ''}`, `${fresh.length} rank${fresh.length > 1 ? 's' : ''} earned`)); };
      payBadges(localSummary([]));
      body.innerHTML = profileHtml(localSummary([]), { name: p.name || L('Joueur', 'Player'), photo: p.photo });
      body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🍚 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
      body.querySelector('.profile-shop').onclick = openShop;
      if (ON && ON.user) {
        try { tours = await ON.myTournaments(); } catch { tours = []; }
        payBadges(localSummary(tours));
        const s = localSummary(tours);
        body.innerHTML = profileHtml(s, { name: p.name || L('Joueur', 'Player'), photo: p.photo, grade: (ON.profile && ON.profile.gradePts) || 0 });
        body.insertAdjacentHTML('afterbegin', `<button class="btn primary profile-shop" type="button">🍚 ${L('Boutique et quêtes', 'Shop and quests')}</button>`);
        body.querySelector('.profile-shop').onclick = openShop;
        try { h2hGames = await ON.myGames(); body.insertAdjacentHTML('beforeend', opponentsHtml(h2hGames, ON.user.uid)); } catch { /* hors ligne */ }
        // résumé public pour que les autres joueurs voient ce profil
        ON.publishSummary({ ...s, badges: BADGES.filter((b) => b.ok(s)).map((b) => b.id) });
      } else body.insertAdjacentHTML('beforeend', `<p class="level-help">${L('Connecte-toi pour ajouter tes parties en ligne et tes tournois, et pour que les autres joueurs voient ton profil.', 'Sign in to add your online games and tournaments, and so other players can see your profile.')}</p>`);
      return;
    }
    body.innerHTML = `<p class="level-help">${L('Chargement…', 'Loading…')}</p>`;
    try {
      const u = await ON.getProfile(uid);
      if (!u) { body.innerHTML = `<p class="level-help">${L('Profil introuvable.', 'Profile not found.')}</p>`; return; }
      const s = u.summary || { ai: { win: 0, draw: 0, loss: 0, best: 0 }, online: { win: 0, draw: 0, loss: 0, opponents: 0 }, tour: { played: 0, wins: 0, second: 0, third: 0 }, pz: 0, mates: 0, ends: 0, openings: 0, dailyBest: 0, elo: u.elo || 600 };
      body.innerHTML = profileHtml({ ...s, elo: u.elo || s.elo }, { name: u.pseudo, photo: u.photo, grade: u.gradePts || 0 }) + (u.summary ? '' : `<p class="level-help">${L('Ce joueur n\'a pas encore publié ses statistiques.', 'This player has not published their statistics yet.')}</p>`);
      if (ON.user) {
        const me = ON.user.uid;
        h2hGames = (await ON.myGames()).filter((g) => g.players.includes(uid) && g.white !== g.black);
        const head = body.querySelector('.profile-head');
        head.insertAdjacentHTML('afterend', h2hHtml(h2hGames, me, u.pseudo));
      }
    } catch (err) { body.innerHTML = `<p class="level-help">${ON.explain(err)}</p>`; }
  }
  // Face-à-face : toutes les parties contre un joueur, tous modes confondus (amicales et tournois)
  const h2hScore = (g, me) => (g.status !== 'over' ? null : g.result === '1/2-1/2' ? 0.5 : (g.result === '1-0') === (g.white === me) ? 1 : 0);
  function h2hHtml(games, me, oppName) {
    const over = games.filter((g) => g.status === 'over');
    const w = over.filter((g) => h2hScore(g, me) === 1).length, d = over.filter((g) => h2hScore(g, me) === 0.5).length, l = over.length - w - d;
    let html = `<h3 class="train-h">${L(`Face à face contre ${escHtml(oppName)}`, `Head to head against ${escHtml(oppName)}`)}</h3>`;
    if (!games.length) return html + `<p class="level-help">${L('Vous n\'avez encore jamais joué ensemble.', 'You have never played each other yet.')}</p>`;
    html += `<div class="h2h-total"><span class="win">${w} ${L('victoire', 'win')}${w > 1 ? 's' : ''}</span><span>${d} ${L('nulle', 'draw')}${d > 1 ? 's' : ''}</span><span class="loss">${l} ${L('défaite', 'loss')}${l > 1 ? 's' : ''}</span></div>`;
    html += `<table class="tour-table h2h-table"><tr><th>${L('Date', 'Date')}</th><th>${L('Partie', 'Game')}</th><th>${L('Cadence', 'Time')}</th><th>${L('Couleur', 'Colour')}</th><th>${L('Résultat', 'Result')}</th><th></th></tr>${games.sort((a, b) => b.createdAt - a.createdAt).map((g) => {
      const sc = h2hScore(g, me);
      const res = sc === null ? L('en cours', 'in progress') : sc === 1 ? L('Victoire', 'Win') : sc === 0 ? L('Défaite', 'Loss') : L('Nulle', 'Draw');
      const kind = g.tournamentId ? `🏆 ${escHtml(g.tournamentName || L('Tournoi', 'Tournament'))}${g.round ? ` · ${L('r.', 'r.')}${g.round}` : ''}` : L('Amicale', 'Friendly');
      return `<tr><td>${new Date(g.createdAt).toLocaleDateString(LOCALE)}</td><td>${kind}</td><td>${TC_LABELS[g.tc] || ''}</td><td>${g.white === me ? '♔' : '♚'}</td><td class="${sc === 1 ? 'win' : sc === 0 ? 'loss' : ''}">${res}</td><td>${g.moves && g.moves.length ? `<button class="mini" data-h2h-replay="${g.id}">${L('Revoir', 'Replay')}</button>` : ''}</td></tr>`;
    }).join('')}</table>`;
    return html;
  }
  // Mon profil : bilan contre chaque adversaire
  function opponentsHtml(games, me) {
    const by = {};
    for (const g of games) {
      const opp = g.white === me ? g.black : g.white, name = g.white === me ? g.blackName : g.whiteName;
      const row = by[opp] || (by[opp] = { name, w: 0, d: 0, l: 0, n: 0 });
      const sc = h2hScore(g, me); row.n++;
      if (sc === 1) row.w++; else if (sc === 0.5) row.d++; else if (sc === 0) row.l++;
    }
    const rows = Object.entries(by).sort((a, b) => b[1].n - a[1].n);
    if (!rows.length) return '';
    return `<h3 class="train-h">${L('Mes adversaires', 'My opponents')}</h3><table class="tour-table h2h-table"><tr><th>${L('Joueur', 'Player')}</th><th>${L('Parties', 'Games')}</th><th>+</th><th>=</th><th>−</th></tr>${rows.map(([uid, r]) => `<tr><td><a href="#" data-profile="${uid}">${escHtml(r.name)}</a></td><td>${r.n}</td><td class="win">${r.w}</td><td>${r.d}</td><td class="loss">${r.l}</td></tr>`).join('')}</table><p class="level-help">${L('Clique sur un joueur pour voir le détail de vos parties.', 'Click a player to see the details of your games.')}</p>`;
  }
  let h2hGames = [];
  $('profile-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h2h-replay]'); if (!b) return;
    const g = h2hGames.find((x) => x.id === b.dataset.h2hReplay); if (!g) return;
    const back = returnTo;
    startReplay({ moves: g.moves, result: g.result || '*', title: g.tournamentId ? `${g.tournamentName} · ${L('ronde', 'round')} ${g.round}` : L('Partie amicale', 'Friendly game'), white: `${g.whiteName} (${g.whiteElo})`, black: `${g.blackName} (${g.blackElo})` }, () => { show('profile'); returnTo = back; });
  });
  $('btn-profile').onclick = () => openProfile();
  // clic sur un joueur (tournois) : son profil
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-profile]'); if (el) { e.preventDefault(); openProfile(el.dataset.profile); } });
