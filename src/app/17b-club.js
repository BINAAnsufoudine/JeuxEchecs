  /* ---------- Club ou école : un responsable crée un club, les élèves le rejoignent avec un code ---------- */
  // Le responsable suit chaque membre : Elo, problèmes résolus, série et résultat du défi du jour.
  let clubOpen = null, clubCache = [];
  function renderClub() {
    const body = $('club-body'), u = ON && ON.user;
    $('club-title').textContent = clubOpen ? clubOpen.name : L('Club ou école', 'Club or school');
    if (!u) { body.innerHTML = `<p class="level-help">${L('Les clubs se gèrent en ligne : connecte-toi ou crée un compte.', 'Clubs are managed online: sign in or create an account.')}</p><button id="club-login" class="btn primary wide" type="button">${L('Se connecter', 'Sign in')}</button>`; return; }
    if (clubOpen) { renderClubDetail(); return; }
    const list = clubCache.length
      ? `<div class="replay-items">${clubCache.map((c) => `<button type="button" class="btn replay-item" data-club-open="${c.id}"><strong>🏫 ${escHtml(c.name)}</strong><span>${c.owner === u.uid ? L('Tu es responsable', 'You are in charge') : L(`Responsable : ${escHtml(c.ownerName)}`, `In charge: ${escHtml(c.ownerName)}`)} · ${L(`${c.members.length} membre${c.members.length > 1 ? 's' : ''}`, `${c.members.length} member${c.members.length === 1 ? '' : 's'}`)}</span></button>`).join('')}</div>`
      : `<p class="level-help">${L('Tu ne fais partie d’aucun club pour l’instant.', 'You are not in any club yet.')}</p>`;
    body.innerHTML = `<p class="level-help">${L('Un professeur ou un responsable de club crée le club et donne son code aux élèves. Il voit ensuite la progression de chacun.', 'A teacher or club leader creates the club and gives its code to the students, then follows everyone’s progress.')}</p>
      <h3 class="train-h">${L('Mes clubs', 'My clubs')}</h3>${list}
      <h3 class="train-h">${L('Rejoindre un club', 'Join a club')}</h3>
      <div class="club-form"><input id="club-code" maxlength="6" autocomplete="off" placeholder="${L('Code du club', 'Club code')}"><button id="club-join" class="btn primary" type="button">${L('Rejoindre', 'Join')}</button></div>
      <h3 class="train-h">${L('Créer un club', 'Create a club')}</h3>
      <div class="club-form"><input id="club-name" maxlength="40" placeholder="${L('Nom du club ou de la classe', 'Club or class name')}"><button id="club-create" class="btn" type="button">${L('Créer', 'Create')}</button></div>`;
  }
  async function renderClubDetail() {
    const c = clubOpen, u = ON.user, boss = c.owner === u.uid, body = $('club-body');
    body.innerHTML = `<p class="level-help">${L('Chargement des membres…', 'Loading members…')}</p>`;
    const [members, today] = await Promise.all([
      Promise.all(c.members.map((uid) => ON.getProfile(uid).catch(() => null))),
      ON.dailyBoard(dayId()).catch(() => []),
    ]);
    if (clubOpen !== c) return;
    const daily = new Map(today.map((r) => [r.uid, r]));
    const rows = members.map((m, i) => ({ uid: c.members[i], m })).filter((r) => r.m)
      .sort((a, b) => (b.m.elo || 0) - (a.m.elo || 0));
    const cell = (r) => {
      const s = r.m.summary || {}, d = daily.get(r.uid);
      return `<tr><td><a href="#" data-profile="${r.uid}">${escHtml(r.m.pseudo || '?')}</a>${r.uid === c.owner ? ' 🎓' : ''}</td><td>${r.m.elo || 600}</td><td>${s.pz || 0}</td><td>${s.dailyBest || 0}</td><td>${d ? `✓ ${d.first}/3` : '—'}</td>${boss ? `<td>${r.uid === c.owner ? '' : `<button type="button" class="btn ghost club-kick" data-club-kick="${r.uid}" aria-label="${L('Retirer', 'Remove')}">✕</button>`}</td>` : ''}</tr>`;
    };
    body.innerHTML = `${boss ? `<p class="level-help">${L('Code à donner aux élèves', 'Code to give to students')} : <b class="tour-code">${c.code}</b></p>` : `<p class="level-help">${L(`Responsable : ${escHtml(c.ownerName)}`, `In charge: ${escHtml(c.ownerName)}`)}</p>`}
      <h3 class="train-h">${L(`Membres (${rows.length})`, `Members (${rows.length})`)}</h3>
      <div class="tour-scroll"><table class="tour-table club-table"><tr><th>${L('Joueur', 'Player')}</th><th>Elo</th><th>${L('Problèmes', 'Puzzles')}</th><th>${L('Série', 'Streak')}</th><th>${L('Défi du jour', 'Daily')}</th>${boss ? '<th></th>' : ''}</tr>${rows.map(cell).join('')}</table></div>
      <p class="level-help">${L('Clique sur un joueur pour voir son profil complet. Les chiffres se mettent à jour quand le joueur ouvre l’appli.', 'Click a player to see their full profile. Figures update when the player opens the app.')}</p>
      <div class="actions">${boss ? `<button id="club-delete" class="btn ghost" type="button">${L('Supprimer le club', 'Delete the club')}</button>` : `<button id="club-leave" class="btn ghost" type="button">${L('Quitter le club', 'Leave the club')}</button>`}</div>`;
  }
  async function refreshClubs() {
    if (!ON || !ON.user) { clubCache = []; return; }
    try { clubCache = (await ON.myClubs()).sort((a, b) => a.name.localeCompare(b.name)); } catch { clubCache = []; }
    if (clubOpen) clubOpen = clubCache.find((c) => c.id === clubOpen.id) || null;
  }
  $('btn-club').onclick = () => {
    returnTo = 'home'; clubOpen = null;
    show('club'); renderClub();
    if (!ON) return;
    ON.load().then(refreshClubs).then(renderClub).catch(() => {});
  };
  $('club-body').addEventListener('click', async (e) => {
    const t = e.target.closest('button, [data-club-open]'); if (!t) return;
    if (t.id === 'club-login') return openAccount();
    try {
      if (t.dataset.clubOpen) { clubOpen = clubCache.find((c) => c.id === t.dataset.clubOpen) || null; return renderClub(); }
      if (t.id === 'club-create') {
        const name = $('club-name').value.trim();
        if (!name) return toast(L('Donne un nom au club.', 'Give the club a name.'));
        clubOpen = await ON.createClub(name);
        await refreshClubs(); return renderClub();
      }
      if (t.id === 'club-join') {
        const code = $('club-code').value.trim().toUpperCase();
        if (code.length !== 6) return toast(L('Le code a 6 caractères.', 'The code has 6 characters.'));
        const c = await ON.joinClub(code);
        if (!c) return toast(L('Aucun club avec ce code.', 'No club with this code.'));
        toast(L(`Bienvenue dans le club ${c.name} !`, `Welcome to the ${c.name} club!`));
        await refreshClubs(); clubOpen = clubCache.find((x) => x.id === c.id) || null; return renderClub();
      }
      if (t.id === 'club-leave' || t.id === 'club-delete') {
        const del = t.id === 'club-delete', c = clubOpen;
        return modal({ title: del ? L('Supprimer le club ?', 'Delete the club?') : L('Quitter le club ?', 'Leave the club?'), text: c.name, actions: [
          { label: L('Annuler', 'Cancel'), ghost: true },
          { label: del ? L('Supprimer', 'Delete') : L('Quitter', 'Leave'), primary: true, onClick: async () => { await (del ? ON.deleteClub(c.id) : ON.leaveClub(c.id)); clubOpen = null; await refreshClubs(); renderClub(); } },
        ] });
      }
      if (t.dataset.clubKick) { await ON.removeFromClub(clubOpen.id, t.dataset.clubKick); await refreshClubs(); return renderClub(); }
    } catch (err) { toast(ON.explain ? ON.explain(err) : L('Action impossible pour le moment.', 'Action not possible right now.')); }
  });
