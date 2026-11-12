  /* ---------- Statistiques ---------- */
  function estimatedElo() {
    const player = playerProfile();
    let rating = player.rating;
    if (rating === null) {
      const gameRating = gamePerformance();
      const done = store.get('pzdone', {}), bank = window.PUZZLES || [];
      const outcomes = Object.entries(done).map(([id, outcome]) => {
        const puzzle = bank.find((item) => item.id === id);
        return puzzle ? { challenge: 400 + Math.max(1, puzzle.rating || puzzle.level * 3 - 1) * 200, score: outcome === 's' ? 1 : 0 } : null;
      }).filter(Boolean);
      const puzzleRating = outcomes.length
        ? outcomes.reduce((sum, item) => sum + item.challenge, 0) / outcomes.length + 250 * (outcomes.reduce((sum, item) => sum + item.score, 0) / outcomes.length - 0.5)
        : null;
      rating = gameRating === null ? puzzleRating : puzzleRating === null ? gameRating : (gameRating * 0.75 + puzzleRating * 0.25);
    }
    return Math.round(Math.max(100, Math.min(3000, rating === null ? 600 : rating)) / 10) * 10;
  }
  function updatePlayerRating(opponentElo, score, k, kind) {
    const player = playerProfile();
    const current = player.rating === null ? (gamePerformance() ?? 600) : player.rating;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - current) / 400));
    player.rating = Math.round(Math.max(100, Math.min(3000, current + k * (score - expected))) / 10) * 10;
    player[kind] = (player[kind] || 0) + 1;
    store.set('player', player);
    // le même Elo est visible des autres joueurs, quel que soit le mode où il a changé
    if (window.Online && window.Online.user) window.Online.setElo(estimatedElo());
  }
  // Les problèmes et leçons ne changent plus l'Elo : il ne dépend que des parties jouées
  function countPuzzle() { const p = playerProfile(); p.puzzles = (p.puzzles || 0) + 1; store.set('player', p); }
  function recordStat(level, outcome) {
    const stats = store.get('stats', {});
    const row = stats[level] || { win: 0, loss: 0, draw: 0 };
    row[outcome]++;
    stats[level] = row;
    store.set('stats', stats);
  }
  /* Araignée des compétences : mesurée uniquement sur tes parties contre l'ordinateur.
     Base = ta performance (force des niveaux affrontés et résultats), puis chaque thème
     est corrigé selon la fréquence de ses fautes dans tes parties analysées. */
  function gamePerformance() {
    const stats = store.get('stats', {});
    let n = 0, opp = 0, score = 0;
    for (const [l, r] of Object.entries(stats)) {
      if (!LEVEL_NAMES[l]) continue;
      const k = r.win + r.draw + r.loss;
      n += k; opp += LEVEL_ELO[+l] * k; score += r.win - r.loss;
    }
    return n ? Math.round(opp / n + (400 * score) / n) : null;
  }
  function skillOf(row, base) {
    const recent = row.recent.slice(-10);
    const games = recent.length;
    if (!games || base === null) return { value: base || 800, data: false };
    const avg = recent.reduce((x, y) => x + y, 0) / games; // fautes par partie dans ce thème
    const r = base + 150 - Math.min(500, avg * 300);
    return { value: Math.round(Math.max(100, Math.min(3000, r)) / 10) * 10, data: true };
  }
  function skillRadar() {
    const c = loadCoach();
    const SHORT = L({ mat: 'Mat', defense: 'Défense', prise: 'Prises', fourchette: 'Fourchettes', clouage: 'Clouages', tactique: 'Combinaisons', finale: 'Finales' }, { mat: 'Mates', defense: 'Defense', prise: 'Captures', fourchette: 'Forks', clouage: 'Pins', tactique: 'Combinations', finale: 'Endgames' });
    const base = gamePerformance();
    const axes = PZ_KEYS.map((k) => ({ k, name: SHORT[k] || PZ[k].name, ...skillOf(themeRow(c, k), base) }));
    const any = axes.some((a) => a.data);
    const W = 340, H = 300, cx = W / 2, cy = 158, R = 96, MIN = 0, MAX = 3000;
    const n = axes.length, ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const at = (i, v) => { const r = (R * (v - MIN)) / (MAX - MIN); return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; };
    let g = '';
    for (const v of [750, 1500, 2250, 3000]) g += `<polygon points="${axes.map((_, i) => at(i, v).join(',')).join(' ')}" class="rd-grid"/>`;
    axes.forEach((_, i) => { const [x, y] = at(i, MAX); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="rd-grid"/>`; });
    for (const v of [750, 1500, 2250, 3000]) g += `<text x="${cx + 3}" y="${cy - (R * (v - MIN)) / (MAX - MIN) + 10}" class="rd-scale">${v}</text>`;
    const pts = axes.map((a, i) => at(i, a.value));
    g += `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="rd-area${any ? '' : ' empty'}"/>`;
    g += pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" class="rd-dot"/>`).join('');
    axes.forEach((a, i) => {
      const [x, y0] = at(i, MAX + 430), cos = Math.cos(ang(i)), y = y0 - (i === 0 ? 14 : 0);
      const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
      g += `<text x="${x}" y="${y}" text-anchor="${anchor}" class="rd-label">${a.name}</text><text x="${x}" y="${y + 14}" text-anchor="${anchor}" class="rd-val">${a.data ? a.value : '—'}</text>`;
    });
    const best = axes.filter((a) => a.data).sort((a, b) => b.value - a.value);
    const note = !any ? L("Joue des parties contre l'ordinateur : chaque thème recevra une note tirée de l'analyse de tes parties.", 'Play games against the computer: each theme will get a rating from the analysis of your games.')
      : L(`Mesuré sur tes ${c.games} partie${c.games > 1 ? 's' : ''} analysée${c.games > 1 ? 's' : ''} (performance ${base}). Point fort : ${best[0].name} (${best[0].value}). À travailler : ${best[best.length - 1].name} (${best[best.length - 1].value}).`,
        `Measured on your ${c.games} analysed game${c.games === 1 ? '' : 's'} (performance ${base}). Strength: ${best[0].name} (${best[0].value}). To work on: ${best[best.length - 1].name} (${best[best.length - 1].value}).`);
    return `<h3 class="pz-section">${L('Mes compétences par thème', 'My skills by theme')}</h3><svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Araignée des compétences par thème', 'Skills radar by theme')}">${g}</svg><p class="pz-cap">${note}</p>`;
  }
  // Tactiques : problèmes réussis ou ratés par thème (programme, parcours, thèmes) et entraînements (mats, finales, ouvertures)
  function tacticsStats() {
    const c = loadCoach(), pct = (ok, n) => (n ? `${Math.round((100 * ok) / n)} %` : '—');
    const rows = PZ_KEYS.map((k) => ({ k, row: c.themes[k] })).filter((x) => x.row && (x.row.solved || x.row.failed));
    const drills = store.get('drills', {});
    const kinds = [['mate', L('Mats', 'Checkmates')], ['end', L('Finales', 'Endgames')], ['open', L('Ouvertures', 'Openings')]].filter(([k]) => drills[k] && drills[k].tot);
    const total = playerProfile().puzzles || 0;
    if (!rows.length && !kinds.length) return `<h3 class="pz-section">${L('Tactiques', 'Tactics')}</h3><p class="empty">${L('Résous des problèmes ou fais un entraînement : tes résultats par thème apparaîtront ici.', 'Solve puzzles or do some training: your results by theme will appear here.')}</p>`;
    let html = `<h3 class="pz-section">${L('Tactiques', 'Tactics')}</h3><p class="pz-cap">${L(`${total} problème${total > 1 ? 's' : ''} joué${total > 1 ? 's' : ''} au total.`, `${total} puzzle${total === 1 ? '' : 's'} played in all.`)}</p>`;
    if (rows.length) html += `<table class="stats-table"><thead><tr><th>${L('Thème', 'Theme')}</th><th>${L('Réussis', 'Solved')}</th><th>${L('Ratés', 'Missed')}</th><th>%</th><th>${L('Niveau', 'Level')}</th></tr></thead><tbody>${rows.map(({ k, row }) => `<tr><td>${escHtml(PZ[k].name)}</td><td>${row.solved || 0}</td><td>${row.failed || 0}</td><td>${pct(row.solved || 0, (row.solved || 0) + (row.failed || 0))}</td><td>${row.level || 1}</td></tr>`).join('')}</tbody></table>`;
    if (kinds.length) html += `<table class="stats-table"><thead><tr><th>${L('Entraînement', 'Training')}</th><th>${L('Réussis', 'Solved')}</th><th>${L('Joués', 'Played')}</th><th>%</th><th>${L('Niveau', 'Level')}</th></tr></thead><tbody>${kinds.map(([k, name]) => { const d = drills[k]; return `<tr><td>${name}</td><td>${d.ok || 0}</td><td>${d.tot}</td><td>${pct(d.ok || 0, d.tot)}</td><td>${Math.round(d.level || 1)}</td></tr>`; }).join('')}</tbody></table>`;
    return html;
  }
  function renderStats() {
    const stats = store.get('stats', {});
    const body = $('stats-body');
    const levels = Object.keys(stats).filter((l) => LEVEL_NAMES[l]).sort((a, b) => a - b);
    const radar = skillRadar() + tacticsStats();
    if (!levels.length) {
      body.innerHTML = radar + L('<p class="empty">Aucune partie terminée contre l\'ordinateur pour l\'instant.<br>Vos résultats apparaîtront ici.</p>', '<p class="empty">No finished game against the computer yet.<br>Your results will appear here.</p>');
      return;
    }
    let total = { win: 0, loss: 0, draw: 0 };
    let rows = '';
    for (const l of levels) {
      const s = stats[l];
      total.win += s.win; total.loss += s.loss; total.draw += s.draw;
      const n = s.win + s.loss + s.draw;
      rows += `<tr><td>${LEVEL_NAMES[l]} <small>(${LEVEL_ELO[l]})</small></td><td>${s.win}</td><td>${s.draw}</td><td>${s.loss}</td><td>${n ? Math.round((100 * s.win) / n) : 0} %</td></tr>`;
    }
    const n = total.win + total.loss + total.draw;
    body.innerHTML = radar + `<h3 class="pz-section">${L("Résultats contre l'ordinateur", 'Results against the computer')}</h3><table class="stats-table"><thead><tr><th>${L('Niveau', 'Level')}</th><th>${L('V', 'W')}</th><th>${L('N', 'D')}</th><th>${L('D', 'L')}</th><th>${L('Réussite', 'Win rate')}</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td><b>Total</b></td><td>${total.win}</td><td>${total.draw}</td><td>${total.loss}</td><td>${Math.round((100 * total.win) / n)} %</td></tr></tfoot></table>
      <button class="btn ghost wide" id="btn-reset-stats">${L('Remettre à zéro', 'Reset')}</button>`;
    $('btn-reset-stats').onclick = () => modal({
      title: L('Effacer les statistiques ?', 'Clear the statistics?'), actions: [
        { label: L('Effacer', 'Clear'), primary: true, onClick: () => { store.del('stats'); renderStats(); } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ],
    });
  }

