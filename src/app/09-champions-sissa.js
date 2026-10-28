  /* ---------- Comme un champion : idées et principes des champions du monde ---------- */
  const CHAMPS = window.CHAMPIONS || [];
  const STYLE_AXES = L({ attaque: 'attaque', tactique: 'tactique', positionnel: 'jeu positionnel', finale: 'finales', defense: 'défense' }, { attaque: 'attack', tactique: 'tactics', positionnel: 'positional play', finale: 'endgames', defense: 'defense' });
  let championLevel = store.get('championLevel', 'same'); // « same » : ton niveau ; « above » : un cran au-dessus
  const champById = (id) => CHAMPS.find((c) => c.id === id);
  const champShort = (c) => c.name.split(' ').pop();
  // Plus que six pièces (hors rois et pions) sur l'échiquier : on est en finale
  const isEndgameBoard = (board) => board.filter((p) => p && !'kKpP'.includes(p)).length <= 6;

  // Profil basé sur les évaluations de l'analyse ; les parties historiques gardent un repli heuristique.
  function gameStyle(g) {
    const p = g.styleProfile;
    if (p && p.moves) {
      const m = p.moves, unit = (x) => Math.max(0, Math.min(1, x));
      return {
        attaque: unit((p.checks / m) * 4 + (p.goodCaptures / m) * 0.8),
        tactique: unit((p.tacticalMoves / m) * 3.5),
        positionnel: unit((p.quietMoves ? p.accurateQuietMoves / p.quietMoves : 0) * 0.55 + (p.accuracy || 0) / 100 * 0.3 + (p.castling / m) * 0.15),
        finale: unit(p.endgameMoves / m),
        defense: unit((p.moves ? p.accurateEvasions / m : 0) * 8),
      };
    }
    const G = new Game();
    let moves = 0, checks = 0, captures = 0, quiet = 0, castled = 0, endgame = 0;
    for (const u of g.moves) {
      const mover = G.turn, r = G.playUci(u);
      if (!r) break;
      if (mover === g.color) {
        moves++;
        if (G.inCheck()) checks++;
        if (r.move.captured) captures++;
        else if (r.move.piece.toLowerCase() === 'p' || r.move.flag === 'castle') quiet++;
        if (r.move.flag === 'castle') castled = 1;
      }
      if (!endgame && isEndgameBoard(G.state.board)) endgame = 1;
    }
    const won = g.result === (g.color === 'w' ? '1-0' : '0-1'), lost = g.result === (g.color === 'w' ? '0-1' : '1-0');
    const m = Math.max(1, moves), unit = (x) => Math.max(0, Math.min(1, x));
    return {
      attaque: unit((checks / m) / 0.12 * 0.7 + (won && g.reason === 'mat' ? 0.6 : 0)),
      tactique: unit((captures / m) / 0.3),
      positionnel: unit((quiet / m) / 0.45 * 0.6 + castled * 0.4),
      finale: endgame,
      defense: unit((g.moves.length >= 50 && !lost ? 0.6 : 0) + castled * 0.4),
    };
  }
  const styleGames = () => store.get('archive', []).filter((g) => ['ai', 'coach'].includes(g.mode) && !g.fen && g.color && g.moves && g.moves.length >= 12 && g.analysed).slice(-20);
  // Pondère davantage les parties récentes et écarte les parties à deux joueurs / personnalisées.
  function playerStyle() {
    const games = styleGames();
    if (games.length < 3) return null;
    const avg = { games: games.length }, totalWeight = games.reduce((sum, _, i) => sum + Math.pow(0.88, games.length - 1 - i), 0);
    for (const k of Object.keys(STYLE_AXES)) avg[k] = games.reduce((sum, g, i) => sum + gameStyle(g)[k] * Math.pow(0.88, games.length - 1 - i), 0) / totalWeight;
    return avg;
  }
  // L'impulsivité dépend de gaffes par nombre de coups, pas du nombre brut de fautes.
  function styleLabel(v, errors, profile) {
    const impulsive = profile && profile.moves ? profile.severe / profile.moves >= 0.08 : errors >= 2;
    if (v.attaque >= 0.6) return impulsive ? L('Attaquant impulsif', 'Impulsive attacker') : L('Joueur agressif', 'Aggressive player');
    if (v.tactique >= 0.6) return impulsive ? L('Chasseur de matériel', 'Material hunter') : L('Tacticien opportuniste', 'Opportunistic tactician');
    if (v.finale >= 0.6 && v.positionnel >= 0.5) return L('Joueur positionnel patient', 'Patient positional player');
    if (v.positionnel >= 0.6) return impulsive ? L('Bâtisseur pressé', 'Hasty builder') : L('Stratège solide', 'Solid strategist');
    if (v.defense >= 0.6) return L('Défenseur tenace', 'Stubborn defender');
    if (v.finale >= 0.6) return L('Finisseur méthodique', 'Methodical finisher');
    return impulsive ? L('Joueur spontané', 'Spontaneous player') : L('Joueur polyvalent', 'All-round player');
  }
  // Style qui revient le plus souvent dans les parties admissibles (à égalité, le plus récent).
  function dominantStyle() {
    const games = styleGames();
    if (games.length < 3) return null;
    const mistakes = store.get('mistakes', []);
    const count = new Map();
    games.forEach((g, i) => {
      const label = styleLabel(gameStyle(g), mistakes.filter((m) => m.date === g.id).length, g.styleProfile);
      const row = count.get(label) || { n: 0, last: 0 };
      row.n++; row.last = i; count.set(label, row);
    });
    const [label, row] = [...count].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0];
    return { label, n: row.n, games: games.length };
  }
  // Proximité (en %) entre le style du joueur et celui d'un champion
  function styleMatch(champ, style) {
    if (!style) return null;
    const keys = Object.keys(STYLE_AXES);
    return Math.round((1 - keys.reduce((s, k) => s + Math.abs(champ.style[k] - style[k]), 0) / keys.length) * 100);
  }
  function championOrder() {
    const style = playerStyle();
    const list = CHAMPS.map((c, i) => ({ c, i, match: styleMatch(c, style) }))
      .sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || a.i - b.i);
    return { style, list };
  }
  // Niveau de l'ordinateur le plus proche de ton Elo estimé, ou le niveau suivant
  function championGameLevel() {
    const target = estimatedElo();
    let level = 1;
    for (let l = 2; l <= unlocked(); l++) if (Math.abs(LEVEL_ELO[l] - target) < Math.abs(LEVEL_ELO[level] - target)) level = l;
    return championLevel === 'above' ? Math.min(MAX_GAME_LEVEL, level + 1) : level;
  }
  // Problème du thème, choisi à ton niveau (échelle de difficulté 1 à 9 de la banque) ou juste au-dessus
  // Pièce qui joue le premier coup de la solution, pour coller au principe annoncé (cavalier, pion…)
  const firstMover = (p) => { try { const g = new Game(p.fen); g.playUci(p.line[0]); const m = g.lastMove(); return m ? m.piece.toLowerCase() : ''; } catch { return ''; } };
  function championPuzzle(theme, used, piece) {
    const base = Math.max(1, Math.min(9, Math.round((estimatedElo() - 400) / 200)));
    const target = championLevel === 'above' ? base + 1 : base;
    const done = store.get('pzdone', {});
    let pool = BANK.filter((p) => p.theme === theme && p.line && p.line.length && !used.has(p.id));
    if (piece) { const same = pool.filter((p) => firstMover(p) === piece); if (same.length) pool = same; }
    if (!pool.length) return null;
    const dist = (p) => Math.abs((p.rating || p.level * 2) - target) + (done[p.id] ? 1.5 : 0);
    const best = Math.min(...pool.map(dist));
    const near = pool.filter((p) => dist(p) <= best + 0.5);
    return near[Math.floor(Math.random() * near.length)];
  }
  // Une situation de tes parties précédentes où l'idée du champion s'appliquait
  function championPersonalStep(ch) {
    const name = champShort(ch), themes = ch.principles.map((p) => p.theme);
    const ms = store.get('mistakes', []).filter((m) => themes.includes(m.theme) && m.line && m.line.length);
    const m = ms.filter((x) => !x.solved).pop() || ms.pop();
    if (m) {
      const pr = ch.principles.find((p) => p.theme === m.theme);
      const played = uciOf(m), arrows = played ? [{ from: window.Chess.sqIndex(played.slice(0, 2)), to: window.Chess.sqIndex(played.slice(2, 4)), color: 'red' }] : [];
      const steps = [];
      if (played) steps.push({
        text: L(`Retour sur ta partie du ${fmtDate(m.date)}. Au coup ${m.move}, tu as joué ${m.played}. Regarde ce coup et souviens-toi : ${pr.title.toLowerCase()}.`, `Back to your game of ${fmtDate(m.date)}. On move ${m.move}, you played ${m.played}. Watch this move and remember: ${pr.title.toLowerCase()}.`),
        fen: m.fen, demoMoves: [played], demoSpeech: openingSpeechLine(m.fen, [played]), arrows, annotateRelations: true,
      });
      steps.push({ text: L(`À toi : dans cette même position, joue comme je l'aurais fait.`, `Your turn: in this same position, play as I would.`),
        fen: m.fen, line: m.line, alts: m.alts, mistake: m.id, theme: m.theme, arrows,
        why: L(`Voilà mon coup. La prochaine fois que cette situation se présente, pense à : ${pr.title.toLowerCase()}.`, `That's my move. Next time this situation comes up, think: ${pr.title.toLowerCase()}.`),
      });
      return steps;
    }
    // Sans faute sur ces thèmes : la position de ta dernière partie où la situation-clé du champion est apparue
    const finaleChamp = ch.style.finale >= 0.8;
    for (const g of store.get('archive', []).slice().reverse()) {
      if (g.fen || !g.color || !g.moves || g.moves.length < 16) continue;
      const G = new Game();
      for (let i = 0; i < g.moves.length; i++) {
        const before = window.Chess.toFen(G.state), uci = g.moves[i];
        if (!G.playUci(uci)) break;
        if ((finaleChamp ? isEndgameBoard(G.state.board) : i >= 15) && G.turn === g.color) {
          const arrow = { from: window.Chess.sqIndex(uci.slice(0, 2)), to: window.Chess.sqIndex(uci.slice(2, 4)), color: 'red' };
          return [{ text: L(`Retour sur ta partie du ${fmtDate(g.id)}, au coup ${Math.floor(i / 2) + 1}. Regarde le dernier coup joué.`, `Back to your game of ${fmtDate(g.id)}, move ${Math.floor(i / 2) + 1}. Watch the last move.`),
            fen: before, demoMoves: [uci], demoSpeech: openingSpeechLine(before, [uci]), arrows: [arrow], annotateRelations: true },
          { text: L(`${finaleChamp ? ch.tips.finale : ch.tips.milieu} Observe la position obtenue et cherche mon plan.`, `${finaleChamp ? ch.tips.finale : ch.tips.milieu} Study the resulting position and look for my plan.`), fen: window.Chess.toFen(G.state) }];
        }
      }
    }
    return null;
  }
  function startChampionLesson(id) {
    const ch = champById(id);
    if (!ch) return;
    const name = champShort(ch), used = new Set();
    const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
    // Présentation : qui je suis, d'où je viens, quand et combien de temps j'ai régné
    const reign = L(`J'ai été champion du monde ${ch.period}, soit ${ch.years} an${ch.years > 1 ? 's' : ''} de règne.`, `I was world champion ${ch.period}, a reign of ${ch.years} year${ch.years === 1 ? '' : 's'}.`);
    const steps = [{ text: L(`Bonjour, ${lc(ch.intro)} ${ch.origin} ${reign} Aujourd'hui, c'est moi qui te donne le cours : je vais t'apprendre à jouer comme moi.`, `Hello, ${ch.intro} ${ch.origin} ${reign} Today I am your teacher: I will teach you to play like me.`) }];
    ch.principles.forEach((p, i) => {
      steps.push({ text: L(`Principe ${i + 1} : ${p.title}. ${p.text}`, `Principle ${i + 1}: ${p.title}. ${p.text}`) });
      const example = championPuzzle(p.theme, used, p.piece);
      if (example) {
        used.add(example.id);
        const examplePosition = new Game(example.fen);
        const exampleColor = examplePosition.state.turn;
        example.line.forEach((uci, moveIndex) => {
          const fen = window.Chess.toFen(examplePosition.state), color = examplePosition.state.turn;
          const played = examplePosition.playUci(uci);
          if (!played) return;
          const moveLabel = `${Math.floor(moveIndex / 2) + 1}${moveIndex % 2 ? '…' : '.'} ${played.san}`;
          const explanation = moveIndex === 0
            ? L(`Voici comment j’applique « ${p.title} » : ${p.text}`, `Here is how I apply “${p.title}”: ${p.text}`)
            : color === exampleColor
              ? L(`Ce coup poursuit mon idée : ${lc(p.title)}.`, `This move continues my idea: ${lc(p.title)}.`)
              : L('Observe la réponse adverse : elle montre pourquoi le coup précédent était important.', 'Watch the opponent’s reply: it shows why the previous move mattered.');
          const finalExampleMove = moveIndex === example.line.length - 1;
          steps.push({
            text: L(`Exemple guidé · ${moveLabel}. ${explanation}`, `Guided example · ${moveLabel}. ${explanation}`),
            fen, demoMoves: [uci], demoSpeech: openingSpeechLine(fen, [uci]), annotateRelations: true, syncDemoWithVoice: true,
            demoStartText: L(`Regarde ${moveLabel} : les flèches montrent le coup, ses attaques et ses défenses.`, `Watch ${moveLabel}: the arrows show the move, its attacks and defenses.`),
            demoDoneText: finalExampleMove
              ? L(`Exemple terminé. À toi d’appliquer « ${p.title} » dans un nouveau problème : appuie sur Continuer.`, `Example complete. Now apply “${p.title}” in a new puzzle: press Continue.`)
              : L('La suite de l’exemple arrive au prochain écran. Appuie sur Continuer.', 'The next part of the example is on the next screen. Press Continue.'),
          });
        });
      }
      const it = championPuzzle(p.theme, used, p.piece);
      if (it) {
        used.add(it.id);
        steps.push({ text: L(`À toi, joue comme moi : ${lc(p.task)}`, `Your turn, play like me: ${lc(p.task)}`), fen: it.fen, line: it.line, alts: it.alts, theme: p.theme, why: L(`Bravo ! C'est exactement mon idée : ${p.title.toLowerCase()}.`, `Well done! That's exactly my idea: ${p.title.toLowerCase()}.`) });
      }
    });
    const mine = championPersonalStep(ch);
    if (mine) steps.push(...mine);
    const level = championGameLevel();
    steps.push({ text: L(`Tu connais maintenant mes idées. Pour les appliquer, affronte-moi dans une partie au niveau ${LEVEL_NAMES[level]} : je jouerai contre toi et je te rappellerai mes principes quand la situation se présentera.`, `You now know my ideas. To apply them, face me in a game at level ${LEVEL_NAMES[level]}: I will play against you and remind you of my principles when the situation arises.`) });
    pz = { kind: 'lesson', lesson: { title: L(`Le cours de ${name}`, `${name}'s course`), theme: ch.principles[0].theme, champion: ch.id }, steps, idx: 0 };
    enterPuzzleMode();
    loadLessonStep();
  }
  function finishChampionLesson(id) {
    const ch = champById(id);
    const done = store.get('championsDone', {}); done[id] = Date.now(); store.set('championsDone', done);
    leavePuzzle();
    if (!ch) return;
    const level = championGameLevel();
    modal({
      title: L(`Cours terminé : ${ch.name}`, `Course finished: ${ch.name}`),
      text: L(`${ch.name} : « Prêt à m'affronter ? » Partie au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`, `${ch.name}: “Ready to face me?” Game at level ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`),
      actions: [
        { label: L(`Affronter ${champShort(ch)}`, `Play against ${champShort(ch)}`), primary: true, onClick: () => startChampionGame(id) },
        { label: L('Plus tard', 'Later'), ghost: true },
      ],
    });
  }
  function startChampionGame(id) {
    const ch = champById(id);
    if (!ch) return;
    const level = championGameLevel();
    setup.mode = 'coach'; setup.level = level;
    store.set('setup', setup);
    startGame({ mode: 'coach', playerColor: randomColor(), level, champion: ch.id });
  }
  // Situations de partie qui appellent un principe du champion, et les thèmes de fautes passées qui s'y rattachent
  const SITUATION_THEMES = { attaque: ['mat', 'tactique', 'fourchette'], defense: ['defense'], finale: ['finale'], milieu: ['prise', 'clouage', 'fourchette', 'tactique'], ouverture: [] };
  function championSituation() {
    const ply = game.history.length, told = cfg.champTold || (cfg.champTold = {});
    const fresh = (k, gap) => told[k] === undefined || (gap && ply - told[k] >= gap);
    const s = game.state;
    if (isEndgameBoard(s.board) && fresh('finale')) return 'finale';
    const last = game.lastMove();
    if ((game.inCheck() || (last && last.captured)) && fresh('defense', 12)) return 'defense';
    if (ply >= 8 && fresh('attaque', 12) && game.moves().some((m) => window.Chess.inCheck(window.Chess.makeMove(s, m)))) return 'attaque';
    if (ply <= 6 && fresh('ouverture')) return 'ouverture';
    if (ply >= 20 && fresh('milieu')) return 'milieu';
    return null;
  }
  // Rappel du principe du champion choisi, avec la partie précédente où la même situation t'a coûté un coup
  function championTip() {
    const ch = cfg && cfg.champion && champById(cfg.champion);
    if (!ch || !game) return '';
    const k = championSituation();
    if (!k) return '';
    cfg.champTold[k] = game.history.length;
    let text = ch.tips[k];
    const recalled = cfg.champRecalled || (cfg.champRecalled = []);
    const past = store.get('mistakes', []).filter((m) => SITUATION_THEMES[k].includes(m.theme) && !recalled.includes(m.id)).pop();
    if (past) {
      recalled.push(past.id);
      text += L(` Souviens-toi de ta partie du ${fmtDate(past.date)} : dans une situation semblable, au coup ${past.move}, tu avais joué ${past.played} et ce n'était pas le meilleur.`, ` Remember your game of ${fmtDate(past.date)}: in a similar situation, on move ${past.move}, you played ${past.played} and it wasn't the best.`);
    }
    return text;
  }
  function renderChampions() {
    const { style, list } = championOrder();
    const done = store.get('championsDone', {});
    const level = championGameLevel();
    let html = '<div class="pz-summary">';
    if (style) {
      const top = Object.keys(STYLE_AXES).sort((a, b) => style[b] - style[a]).slice(0, 2).map((k) => STYLE_AXES[k]);
      html += L(`Les champions sont classés du plus proche au plus éloigné de ton style, estimé sur tes <b>${style.games}</b> dernière${style.games > 1 ? 's' : ''} partie${style.games > 1 ? 's' : ''} : ton jeu penche vers <b>${top[0]}</b> et <b>${top[1]}</b>.`, `Champions are ranked from closest to furthest from your style, estimated on your last <b>${style.games}</b> game${style.games === 1 ? '' : 's'}: your play leans toward <b>${top[0]}</b> and <b>${top[1]}</b>.`);
    } else html += L("Joue quelques parties contre l'ordinateur : j'analyserai ton style pour classer en premier les champions dont les idées te ressemblent. En attendant, ils sont dans l'ordre de l'histoire.", 'Play a few games against the computer: I will analyse your style to rank first the champions whose ideas resemble yours. Meanwhile, they are listed in historical order.');
    html += '</div>';
    html += `<label class="field-label">${L('Niveau des cours', 'Course level')}</label><div class="segmented" id="champ-level">
      <button data-lv="same" class="${championLevel === 'same' ? 'on' : ''}" aria-pressed="${championLevel === 'same'}">${L('À mon niveau', 'At my level')}</button>
      <button data-lv="above" class="${championLevel === 'above' ? 'on' : ''}" aria-pressed="${championLevel === 'above'}">${L('Un cran au-dessus', 'One step above')}</button></div>
      <p class="pz-cap">${L(`Problèmes choisis pour ton Elo estimé (${estimatedElo()}) · partie d'application au niveau ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`, `Puzzles chosen for your estimated Elo (${estimatedElo()}) · practice game at level ${LEVEL_NAMES[level]} (Elo ${LEVEL_ELO[level]}).`)}</p>`;
    html += list.map(({ c, match }, i) => `<article class="champ-card">
      <div class="champ-head">${c.photo ? `<img class="champ-photo" src="${c.photo.src}" alt="${c.name}">` : '<span class="ico">♚</span>'}<div><b>${i + 1}. ${c.name}</b><small>${c.reign}</small></div>${match != null ? `<span class="chip ${match >= 75 ? 'ok' : match >= 60 ? 'warm' : 'free'}" title="${L('Proximité avec ton style', 'Closeness to your style')}">${match} %</span>` : ''}</div>
      <p class="champ-tag">${c.tagline}${done[c.id] ? L(' · cours suivi ✓', ' · course done ✓') : ''}</p>
      <p class="pz-cap">${c.principles.map((p) => p.title).join(' · ')}</p>
      ${c.photo ? `<p class="photo-credit">${L('Photo', 'Photo')} : <a href="${c.photo.page}" target="_blank" rel="noopener">${c.photo.author}</a> · ${c.photo.license} · Wikimedia Commons</p>` : ''}
      <div class="champ-actions"><button class="btn primary" data-champ-lesson="${c.id}">${L('Cours guidé', 'Guided course')}</button><button class="btn ghost" data-champ-game="${c.id}">${L(`Affronter ${champShort(c)}`, `Play against ${champShort(c)}`)}</button></div>
    </article>`).join('');
    const body = $('champions-body');
    body.innerHTML = html;
    body.querySelectorAll('[data-lv]').forEach((b) => (b.onclick = () => { championLevel = b.dataset.lv; store.set('championLevel', championLevel); renderChampions(); }));
    body.querySelectorAll('[data-champ-lesson]').forEach((b) => (b.onclick = () => startChampionLesson(b.dataset.champLesson)));
    body.querySelectorAll('[data-champ-game]').forEach((b) => (b.onclick = () => startChampionGame(b.dataset.champGame)));
  }
  // Garde-fou : une ancienne page en cache n'a pas encore ce bouton
  if ($('btn-champions')) $('btn-champions').onclick = () => { returnTo = 'home'; show('champions'); };

  $('btn-problems').onclick = () => { returnTo = 'home'; show('problems'); };
  Object.defineProperty(window, 'cavalierPz', { get: () => pz }); // pour les tests
  $('coach-img').src = 'sissa/sissa-face.jpg'; $('coach-img').classList.add('photo');
  /* ---------- La légende de Sissa : le maître raconte lui-même, en slides ---------- */
  const LEGEND = L([
    { img: 'sissa/sissa.jpg', text: 'Approche, mon élève. Je suis Sissa, et je vais te raconter comment est né le jeu auquel tu joues. Appuie sur « Continuer » pour écouter mon histoire.' },
    { img: 'sissa/legende-1.jpg', text: 'Il y a bien longtemps, j\'étais sage et conseiller à la cour du roi des Indes. Pour lui enseigner la stratégie et la sagesse, j\'ai inventé un jeu : les échecs. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-2.jpg', text: 'Le roi fut si impressionné qu\'il m\'offrit la récompense de mon choix. Je ne lui ai demandé que du riz : un grain sur la première case, deux sur la deuxième, quatre sur la troisième, huit sur la quatrième, en doublant à chaque fois. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-3.jpg', text: 'Le roi éclata de rire : « Ce n\'est qu\'un grain à chaque case ! C\'est une demande bien modeste. Fais-le préparer. » Appuie sur « Continuer ».' },
    { board: 8, text: 'Regarde bien la première rangée : 1, 2, 4, 8, 16, 32, 64, 128. Chaque case contient deux fois plus de grains que la précédente. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-4.jpg', text: 'Mais très vite, ses savants comprirent leur erreur. Il y avait déjà 64 grains sur la sixième case… et sur la vingtième, il en fallait plus d\'un million ! Appuie sur « Continuer ».' },
    { board: 64, text: 'Voici l\'échiquier complet : les nombres deviennent gigantesques. Les dernières cases demandent des milliards de milliards de grains. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-5.jpg', text: 'Au total, il aurait fallu plus de 18 quintillions de grains : 18 446 744 073 709 551 615. Bien plus que tout le riz récolté dans le monde entier. Appuie sur « Continuer ».' },
    { img: 'sissa/legende-6.jpg', text: 'Le roi resta sans voix. Je lui ai dit : « Majesté, ce jeu n\'est pas seulement un divertissement. Il montre que chaque décision, même petite, peut avoir des conséquences immenses. » Appuie sur « Continuer ».' },
    { img: 'sissa/legende-7.jpg', text: 'Le roi comprit alors la leçon et me respecta profondément. Depuis ce jour, on raconte cette légende pour rappeler que les petites choses peuvent avoir un effet immense, et que la sagesse vaut plus que la richesse. Appuie sur « Continuer ».' },
    { img: 'sissa/montagne-de-riz.jpg', text: 'Voilà la montagne de riz que ma simple demande aurait demandée. Aux échecs aussi, un petit avantage patiemment accumulé finit par tout emporter. Appuie sur « Terminer » pour revenir à ton entraînement.' },
  ], [
    { img: 'sissa/sissa.jpg', text: 'Come closer, my student. I am Sissa, and I will tell you how the game you play was born. Press "Continue" to hear my story.' },
    { img: 'sissa/legende-1.jpg', text: 'Long ago, I was a sage and counsellor at the court of the king of India. To teach him strategy and wisdom, I invented a game: chess. Press "Continue".' },
    { img: 'sissa/legende-2.jpg', text: 'The king was so impressed that he offered me any reward I wished. I only asked him for rice: one grain on the first square, two on the second, four on the third, eight on the fourth, doubling each time. Press "Continue".' },
    { img: 'sissa/legende-3.jpg', text: 'The king burst out laughing: "It is only a grain on each square! Such a modest request. Have it prepared." Press "Continue".' },
    { board: 8, text: 'Look at the first rank: 1, 2, 4, 8, 16, 32, 64, 128. Each square holds twice as many grains as the one before. Press "Continue".' },
    { img: 'sissa/legende-4.jpg', text: 'But very soon, his scholars understood their mistake. There were already 64 grains on the sixth square… and the twentieth needed more than a million! Press "Continue".' },
    { board: 64, text: 'Here is the whole board: the numbers become gigantic. The last squares need billions of billions of grains. Press "Continue".' },
    { img: 'sissa/legende-5.jpg', text: 'In all, it would have taken more than 18 quintillion grains: 18,446,744,073,709,551,615. Far more than all the rice ever harvested in the world. Press "Continue".' },
    { img: 'sissa/legende-6.jpg', text: 'The king was speechless. I told him: "Majesty, this game is not just a pastime. It shows that every decision, even a small one, can have immense consequences." Press "Continue".' },
    { img: 'sissa/legende-7.jpg', text: 'The king then understood the lesson and respected me deeply. Ever since, this legend is told to remind us that small things can have an immense effect, and that wisdom is worth more than wealth. Press "Continue".' },
    { img: 'sissa/montagne-de-riz.jpg', text: 'Here is the mountain of rice my simple request would have needed. In chess too, a small advantage patiently built up ends up carrying everything. Press "Finish" to go back to your training.' },
  ]);
  let legendIdx = 0, legendBack = 'home';
  // échiquier des grains : 1, 2, 4… sur les premières cases (en notation courte pour les grands nombres)
  const grains = (n) => { const v = Number(2n ** BigInt(n)); return v < 100000 ? v.toLocaleString(LOCALE) : v < 1e6 ? `${Math.round(v / 1000)} k` : v < 1e9 ? `${Math.round(v / 1e6)} M` : v < 1e12 ? `${Math.round(v / 1e9)} ${L('Md', 'B')}` : `2^${n}`; };
  function renderLegend() {
    const s = LEGEND[legendIdx];
    $('legend-img').hidden = !s.img;
    // image en largeur (montagne de riz, dernière vignette) : toute la largeur, proportions gardées
    if (s.img) { const im = $('legend-img'); im.onload = () => im.classList.toggle('wide', im.naturalWidth > im.naturalHeight); im.src = s.img; }
    const b = $('legend-board');
    b.hidden = !s.board;
    if (s.board) {
      let html = '';
      for (let i = 0; i < 64; i++) {
        const r = 7 - (i >> 3), f = i & 7, n = r * 8 + f, dark = (r + f) % 2 === 0;
        html += `<span class="${dark ? 'd' : 'l'}">${n < s.board ? grains(n) : ''}</span>`;
      }
      b.innerHTML = html;
    }
    $('legend-text').textContent = s.text;
    say_legend(s.text);
    $('legend-count').textContent = `${legendIdx + 1} / ${LEGEND.length}`;
    $('legend-next').textContent = legendIdx >= LEGEND.length - 1 ? L('Terminer', 'Finish') : L('Continuer', 'Continue');
  }
  function say_legend(text) { try { if (settings.voice) speak(text); } catch { /* pas de voix */ } }
  function openLegend() {
    if (activeChampion()) return;
    legendBack = document.body.dataset.screen || 'home'; returnTo = legendBack === 'legend' ? 'home' : legendBack;
    legendIdx = 0;
    renderLegend();
    show('legend');
  }
  $('legend-next').onclick = () => {
    if (legendIdx < LEGEND.length - 1) { legendIdx++; renderLegend(); return; }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* rien */ }
    show(legendBack === 'legend' ? 'home' : legendBack);
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-legend]') || (e.target.closest('#coach-img, #coach-dock-img') && !activeChampion())) { e.preventDefault(); openLegend(); }
  });


