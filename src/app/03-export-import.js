  /* ---------- Export / import de la progression ---------- */
  // Fichier JSON ouvert : toutes les données « cavalier.* » + les parties en PGN standard (lisible par d'autres apps d'échecs)
  function gamesAsPgn() {
    const out = [];
    for (const g of store.get('archive', [])) {
      const G = new window.Chess.Game(g.fen || undefined); const san = [];
      for (const u of g.moves) { const r = G.playUci(u); if (!r) break; san.push(r.san); }
      const st = G.status(), res = g.result && g.result !== '*' ? g.result : st.over ? st.result : '*';
      const d = new Date(g.id), me = L('Joueur', 'Player'), ai = `${L('Ordinateur', 'Computer')} ${LEVEL_NAMES[g.level] || ''} (Elo ${LEVEL_ELO[g.level] || '?'})`;
      const tags = { Event: L('Partie Ata Wawé', 'Ata Wawé game'), Site: 'Ata Wawé', Date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
        White: g.color === 'w' ? me : ai, Black: g.color === 'w' ? ai : me, Result: res,
        [g.color === 'w' ? 'BlackElo' : 'WhiteElo']: String(LEVEL_ELO[g.level] || '') };
      let body = '';
      san.forEach((m, i) => { body += (i % 2 ? '' : `${i / 2 + 1}. `) + m + ' '; });
      out.push(Object.entries(tags).map(([k, v]) => `[${k} "${v}"]`).join('\n') + '\n\n' + (body + res).replace(/(.{1,78})(\s|$)/g, '$1\n').trim());
    }
    return out.join('\n\n') + '\n';
  }
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cavalier.')) { try { data[k.slice(9)] = JSON.parse(localStorage.getItem(k)); } catch { /* ignoré */ } }
    }
    return { format: 'cavalier-progression', version: 1, exportedAt: new Date().toISOString(),
      summary: { unlockedLevel: unlocked(), unlockedLevelName: LEVEL_NAMES[unlocked()], unlockedElo: LEVEL_ELO[unlocked()], gamesArchived: (data.archive || []).length },
      levels: Array.from({ length: MAX_GAME_LEVEL }, (_, i) => ({ level: i + 1, name: LEVEL_NAMES[i + 1], elo: LEVEL_ELO[i + 1] })),
      pgn: gamesAsPgn(), data };
  }
  async function saveFile(filename, text) {
    // Dans claude.ai : téléchargement confirmé par la plateforme ; ailleurs (appli installée) : lien de téléchargement classique
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch { dl = null; }
    if (dl) {
      try { await dl.save({ filename: filename.replace(/\.pgn$/, '.pgn.txt'), data: text }); toast(L('Fichier enregistré', 'File saved')); }
      catch (e) { if (e && e.code !== 'declined') toast(L("Le fichier n'a pas pu être enregistré ici.", 'The file could not be saved here.')); }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : filename.endsWith('.txt') ? 'text/plain' : 'application/x-chess-pgn' }));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('btn-export').onclick = () => saveFile(`cavalier-progression-${stamp()}.json`, JSON.stringify(exportData(), null, 2));
  $('btn-export-pgn').onclick = () => {
    if (!store.get('archive', []).length) return toast(L('Aucune partie enregistrée pour le moment.', 'No saved games yet.'));
    saveFile(`cavalier-parties-${stamp()}.pgn`, gamesAsPgn());
  };
  function loadPgn(text) {
    const parsed = window.Pgn.parse(text);
    if (!parsed.games.length) return toast(L(`Le fichier PGN est invalide${parsed.error ? ` : ${parsed.error}` : '.'}`, `The PGN file is invalid${parsed.error ? `: ${parsed.error}` : '.'}`));
    const select = document.createElement('select');
    select.className = 'profile-name-input';
    select.setAttribute('aria-label', L('Partie à charger', 'Game to load'));
    parsed.games.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${index + 1}. ${entry.tags.Event || L('Partie', 'Game')} · ${entry.tags.White || L('Blancs', 'White')} - ${entry.tags.Black || L('Noirs', 'Black')}`;
      select.appendChild(option);
    });
    const body = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'field-label'; label.htmlFor = 'pgn-game-select'; label.textContent = L('Partie', 'Game');
    select.id = 'pgn-game-select'; body.append(label, select);
    modal({ title: L('Charger une partie', 'Load a game'), text: L(`${parsed.games.length} partie${parsed.games.length > 1 ? 's' : ''} trouvée${parsed.games.length > 1 ? 's' : ''}. La partie en cours sera remplacée.`, `${parsed.games.length} game${parsed.games.length === 1 ? '' : 's'} found. The current game will be replaced.`), body, actions: [
      { label: L('Charger', 'Load'), primary: true, onClick: () => {
        const entry = parsed.games[Number(select.value)];
        const finalResult = entry.result !== '*' ? entry.result : entry.status.over ? entry.status.result : null;
        const importedResult = finalResult ? { result: finalResult, reason: entry.result !== '*' ? 'import' : entry.status.reason } : null;
        startGame({ mode: 'local', playerColor: 'w', level: 1 }, entry.moves, importedResult);
      } },
      { label: L('Annuler', 'Cancel'), ghost: true },
    ] });
  }
  $('btn-import').onclick = () => $('import-file').click();
  const IMPORT_SHAPES = {
    player: 'object', settings: 'object', setup: 'object', unlocked: 'number', miniSize: 'number', stats: 'object', game: 'object',
    pzdone: 'object', archive: 'array', coach: 'object', mistakes: 'array', captureNotes: 'array',
    tipsSeen: 'array', tipsDone: 'object', lessonsDone: 'object', localArchive: 'array', external: 'array', reviews: 'array',
  };
  const validImportData = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const entries = Object.entries(data);
    if (!entries.length) return false;
    return entries.every(([key, value]) => {
      const shape = IMPORT_SHAPES[key];
      if (!shape) return false;
      if (shape === 'array') return Array.isArray(value);
      if (shape === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
      return Number.isFinite(value) && (key === 'miniSize' ? value >= 32 && value <= 512 : Number.isInteger(value) && value >= 1 && value <= MAX_GAME_LEVEL);
    });
  };
  $('import-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    const text = await f.text();
    if (/\.pgn(?:\.txt)?$/i.test(f.name) || /^\s*\[Event\s+/m.test(text)) return loadPgn(text);
    let j = null;
    try { j = JSON.parse(text); } catch { /* pas du JSON */ }
    if (!j || j.format !== 'cavalier-progression' || !validImportData(j.data)) return toast(L("Ce fichier n'est pas une progression Ata Wawé valide.", 'This file is not a valid Ata Wawé progress file.'));
    modal({
      title: L('Importer la progression ?', 'Import this progress?'),
      text: L(`Niveau débloqué : ${(j.summary && j.summary.unlockedLevelName) || '?'} · ${(j.data.archive || []).length} parties.\nTa progression actuelle sur cet appareil sera remplacée.`, `Unlocked level: ${(j.summary && j.summary.unlockedLevelName) || '?'} · ${(j.data.archive || []).length} games.\nYour current progress on this device will be replaced.`),
      actions: [
        { label: L('Importer', 'Import'), primary: true, onClick: () => {
          for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('cavalier.')) localStorage.removeItem(k); }
          for (const [k, v] of Object.entries(j.data)) if (/^[a-zA-Z0-9_.-]{1,40}$/.test(k)) store.set(k, v);
          location.reload();
        } },
        { label: L('Annuler', 'Cancel'), ghost: true },
      ],
    });
  };

