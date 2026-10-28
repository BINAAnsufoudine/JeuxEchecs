  /* ---------- Sons (synthétisés) ---------- */
  let audio = null;
  function tone(freqs, dur = 0.09, type = 'triangle', gain = 0.18) {
    if (!settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      freqs.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = type; o.frequency.value = f;
        const st = t0 + i * dur * 0.9;
        g.gain.setValueAtTime(gain, st);
        g.gain.exponentialRampToValueAtTime(0.001, st + dur);
        o.connect(g).connect(audio.destination);
        o.start(st); o.stop(st + dur + 0.02);
      });
    } catch { /* pas d'audio */ }
  }
  const sounds = {
    move: () => tone([330], 0.07, 'sine', 0.25),
    capture: () => tone([220, 165], 0.07, 'square', 0.08),
    check: () => tone([660, 880], 0.08, 'triangle', 0.15),
    win: () => tone([523, 659, 784, 1046], 0.13),
    lose: () => tone([392, 330, 262], 0.16),
    draw: () => tone([440, 440], 0.12),
  };

  /* ---------- Toast & modale ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }
  function modal({ title, text = '', body = null, actions = [] }) {
    $('modal').querySelector('.sheet').classList.remove('light-sheet');
    $('modal-title').textContent = title;
    $('modal-text').textContent = text;
    $('modal-text').hidden = !text;
    const b = $('modal-body'); b.innerHTML = ''; if (body) b.appendChild(body);
    const a = $('modal-actions'); a.innerHTML = '';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (act.primary ? 'primary' : act.ghost ? 'ghost' : '');
      btn.textContent = act.label;
      btn.onclick = () => { closeModal(); act.onClick && act.onClick(); };
      a.appendChild(btn);
    }
    $('modal').hidden = false;
  }
  const closeModal = () => ($('modal').hidden = true);

  /* ---------- Réglages ---------- */
  function applyTheme() {
    const th = (owns(`theme:${settings.theme}`) && THEMES[settings.theme]) || THEMES.foret;
    const lightTheme = settings.colorTheme === 'light';
    document.documentElement.dataset.colorTheme = lightTheme ? 'light' : 'dark';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = lightTheme ? '#f3f5ef' : '#13201b';
    document.documentElement.style.setProperty('--light', th.light);
    document.documentElement.style.setProperty('--dark', th.dark);
  }
  function renderSettings() {
    const wrap = $('themes'); wrap.innerHTML = '';
    for (const [key, th] of Object.entries(THEMES)) {
      const b = document.createElement('button');
      b.className = 'theme' + (settings.theme === key ? ' on' : '');
      b.setAttribute('aria-label', th.name);
      const have = owns(`theme:${key}`);
      b.innerHTML = `<i style="background:${th.light}"></i><i style="background:${th.dark}"></i><i style="background:${th.dark}"></i><i style="background:${th.light}"></i><span class="theme-name">${th.name}${have ? '' : ` 🔒 ${riceAmount(th.price, true)}`}</span>`;
      b.onclick = () => { if (!have) { openShop(); return; } settings.theme = key; saveSettings(); renderSettings(); };
      wrap.appendChild(b);
    }
    $('opt-moves').checked = settings.showMoves;
    $('opt-coords').checked = settings.coords;
    $('opt-sound').checked = settings.sound;
    $('opt-autoq').checked = settings.autoQueen;
    $('opt-voice').checked = settings.voice;
    $('opt-coach').checked = settings.coachEnabled;
    $('opt-lite').checked = settings.lite;
    $('opt-notify').checked = !!settings.notify && 'Notification' in window && Notification.permission === 'granted';
    for (const b of $('opt-anim').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.anim === (settings.anim || 'full')));
    $('opt-light-theme').checked = settings.colorTheme === 'light';
    $('opt-black-theme').value = settings.blackTheme || '';
    renderSyncStatus();
  }
  function renderSyncStatus(state) {
    const el = $('sync-status');
    if (!el) return;
    if (storageUnavailable) {
      el.className = 'sync-status error';
      el.textContent = L('⚠ Le stockage de cet appareil est indisponible. Exporte ta progression pour la conserver.', '⚠ This device storage is unavailable. Export your progress to keep it safe.');
      return;
    }
    const online = !!(ON && ON.user && store.get('onlineSynced', null) === ON.user.uid);
    const key = state || (!online ? 'local' : !navigator.onLine ? 'offline' : progressDirty ? 'pending' : 'synced');
    const labels = {
      local: L('Progression enregistrée sur cet appareil. Exporte-la dans Réglages pour en garder une copie.', 'Progress saved on this device. Export it in Settings to keep a backup.'),
      offline: L('Hors connexion : la progression reste en attente sur cet appareil.', 'Offline: progress is waiting on this device.'),
      pending: L('Synchronisation de la progression en cours…', 'Syncing your progress…'),
      synced: L('Progression synchronisée avec ton compte.', 'Progress synced with your account.'),
      error: L('Synchronisation impossible pour le moment. Ta progression reste sur cet appareil et sera réessayée.', 'Sync is unavailable right now. Your progress stays on this device and will be retried.'),
    };
    el.className = `sync-status ${key}`;
    el.textContent = labels[key] || labels.local;
  }
  function saveSettings() { store.set('settings', settings); applyTheme(); if (b3d) b3d.setLite(settings.lite); if (game) renderBoard(); voiceButton(); renderCoachProgram(); renderCoachDock(); if (!settings.voice) hush(); }
  [['opt-moves', 'showMoves'], ['opt-coords', 'coords'], ['opt-sound', 'sound'], ['opt-autoq', 'autoQueen'], ['opt-voice', 'voice'], ['opt-coach', 'coachEnabled'], ['opt-lite', 'lite']].forEach(([id, key]) => {
    $(id).addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); });
  });
  $('opt-light-theme').addEventListener('change', (e) => { settings.colorTheme = e.target.checked ? 'light' : 'dark'; saveSettings(); });
  // Notifications : il faut l'accord du navigateur
  $('opt-notify').addEventListener('change', async (e) => {
    if (!e.target.checked) { settings.notify = false; saveSettings(); return; }
    if (!('Notification' in window)) { e.target.checked = false; toast(L('Les notifications ne sont pas disponibles sur cet appareil.', 'Notifications are not available on this device.')); return; }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission().catch(() => 'denied');
    settings.notify = perm === 'granted'; e.target.checked = settings.notify; saveSettings();
    if (!settings.notify) toast(L('Notifications refusées : tu peux les autoriser dans les réglages du navigateur.', 'Notifications blocked: you can allow them in your browser settings.'));
  });
  // Durée des animations : complètes, courtes (deux fois plus rapides) ou aucune (les pièces se posent directement)
  $('opt-anim').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-anim]'); if (!b) return;
    settings.anim = b.dataset.anim; applyAnimSpeed(); saveSettings();
    for (const x of $('opt-anim').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  });
  // Mélange de thèmes : les Noirs peuvent avoir les pièces d'un autre thème que celui de la collection
  $('opt-black-theme').addEventListener('change', (e) => { settings.blackTheme = e.target.value; saveSettings(); applyBlackTheme(); });
  function applyBlackTheme() {
    const t = settings.blackTheme || null;
    if ((window.PieceThemeBlack || null) === t) return;
    window.PieceThemeBlack = t;
    if (b3d && b3d.rebuildPieces) { b3d.rebuildPieces(); if (game) render(); }
  }
  function applyAnimSpeed() {
    if (!b3d) return;
    if (b3d.baseSpeed == null) b3d.baseSpeed = b3d.speed;
    const speed = b3d.baseSpeed * (settings.anim === 'short' ? 2.2 : 1);
    if (speed !== b3d.speed) { b3d.skipAnimations(); b3d.speed = speed; }
  }

  $('coach-dock-close').onclick = () => { coachDockOpen = false; renderCoachDock(); };
  $('coach-dock-voice').onclick = () => {
    settings.voice = !settings.voice; saveSettings();
    if (settings.voice) speak(coachMessage || coachPlan().text); else hush();
  };

