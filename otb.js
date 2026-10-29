/* Ata Wawé — tournoi en réel (sur de vrais échiquiers) : appariements, résultats et classement.
   Tout est calculé sur l'appareil ; l'interface est dans src/app/17c-tournoi-reel.js.
   Formats : système suisse, toutes rondes (aller ou aller-retour), élimination directe.
   Types : individuel, ou par équipes (chaque rencontre se joue sur plusieurs échiquiers). */
(function (root) {
  'use strict';
  // Résultats d'une table, du point de vue des Blancs (en équipe : de l'équipe citée en premier)
  const SCORE = { '1-0': [1, 0], '0-1': [0, 1], '1/2': [0.5, 0.5], '+-': [1, 0], '-+': [0, 1] };
  const BYE_POINTS = 1; // exempt : un point (règle la plus courante dans les clubs)

  function create(opts) {
    const type = opts.type === 'team' ? 'team' : 'solo';
    const entrants = opts.entrants.map((e, i) => ({ no: i + 1, name: String(e.name).trim(), players: type === 'team' ? (e.players || []).map((p) => String(p).trim()).filter(Boolean) : undefined, out: false }));
    const t = {
      id: Date.now(), name: String(opts.name || '').trim() || 'Tournoi', type, format: opts.format || 'swiss',
      boards: type === 'team' ? Math.max(1, opts.boards || 4) : 1, entrants, rounds: [], status: 'running', createdAt: Date.now(),
    };
    t.totalRounds = totalRounds(t, opts.rounds);
    t.rounds.push(pairNext(t));
    return t;
  }
  const active = (t) => t.entrants.filter((e) => !e.out);
  const byNo = (t, no) => t.entrants.find((e) => e.no === no);
  function suggestedRounds(n) { return n <= 2 ? 1 : Math.min(11, Math.ceil(Math.log2(n)) + (n > 8 ? 2 : 1)); }
  function totalRounds(t, wanted) {
    const n = t.entrants.length;
    if (t.format === 'rr') return n % 2 ? n : n - 1;
    if (t.format === 'rr2') return 2 * (n % 2 ? n : n - 1);
    if (t.format === 'ko') return Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));
    return Math.max(1, Math.min(n - 1 || 1, wanted || suggestedRounds(n)));
  }

  /* ----- Points ----- */
  // Points d'une table pour chaque camp : en individuel, les points de la partie ; en équipe, les points de match
  // (2 victoire, 1 nulle, 0 défaite) et les points de partie (somme des échiquiers)
  function tableScore(t, p) {
    if (p.b == null) return { a: t.type === 'team' ? 2 : BYE_POINTS, b: 0, ga: t.type === 'team' ? t.boards * BYE_POINTS : BYE_POINTS, gb: 0, done: true };
    if (t.type !== 'team') {
      const s = SCORE[p.r]; if (!s) return { done: false };
      return { a: s[0], b: s[1], ga: s[0], gb: s[1], done: true };
    }
    if (!p.games || p.games.some((g) => !SCORE[g.r])) return { done: false };
    let ga = 0, gb = 0;
    p.games.forEach((g, k) => { const s = SCORE[g.r]; ga += s[0]; gb += s[1]; });
    return { a: ga > gb ? 2 : ga === gb ? 1 : 0, b: gb > ga ? 2 : ga === gb ? 1 : 0, ga, gb, done: true };
  }
  const roundDone = (t, round) => round.tables.every((p) => tableScore(t, p).done && (t.format !== 'ko' || p.b == null || winnerOf(t, p) != null));
  // Élimination directe : vainqueur d'une table (en cas d'égalité, celui désigné après le départage)
  function winnerOf(t, p) {
    if (p.b == null) return p.a;
    const s = tableScore(t, p); if (!s.done) return null;
    if (s.a > s.b) return p.a; if (s.b > s.a) return p.b;
    return p.adv != null ? p.adv : null;
  }

  // Classement : points, puis départages (Buchholz et Sonneborn-Berger, dans l'ordre adapté au format)
  function standings(t) {
    const st = new Map(t.entrants.map((e) => [e.no, { no: e.no, name: e.name, out: e.out, pts: 0, game: 0, wins: 0, played: 0, opps: [], bye: 0, res: [] }]));
    for (const round of t.rounds) for (const p of round.tables) {
      const s = tableScore(t, p); if (!s.done) continue;
      const A = st.get(p.a), B = p.b != null ? st.get(p.b) : null;
      A.pts += s.a; A.game += s.ga;
      if (!B) { A.bye++; continue; }
      B.pts += s.b; B.game += s.gb;
      A.played++; B.played++;
      if (s.a > s.b) A.wins++; else if (s.b > s.a) B.wins++;
      A.opps.push({ no: B.no, got: s.a, max: Math.max(s.a + s.b, 1) }); B.opps.push({ no: A.no, got: s.b, max: Math.max(s.a + s.b, 1) });
    }
    for (const x of st.values()) {
      x.buch = x.opps.reduce((n, o) => n + st.get(o.no).pts, 0);
      x.sb = x.opps.reduce((n, o) => n + st.get(o.no).pts * (o.got / o.max), 0);
    }
    const rr = t.format === 'rr' || t.format === 'rr2';
    const list = [...st.values()].sort((a, b) => b.pts - a.pts
      || (t.type === 'team' ? b.game - a.game : 0)
      || (rr ? b.sb - a.sb || b.buch - a.buch : b.buch - a.buch || b.sb - a.sb)
      || b.wins - a.wins || a.no - b.no);
    if (t.format === 'ko') {
      // élimination : on est classé par le tour atteint
      const reached = new Map(t.entrants.map((e) => [e.no, 0]));
      t.rounds.forEach((round, i) => round.tables.forEach((p) => { reached.set(p.a, i + 1); if (p.b != null) reached.set(p.b, i + 1); const w = winnerOf(t, p); if (w != null && i === t.rounds.length - 1 && t.status === 'over') reached.set(w, i + 2); }));
      list.sort((a, b) => reached.get(b.no) - reached.get(a.no) || b.pts - a.pts || a.no - b.no);
    }
    return list;
  }

  /* ----- Couleurs ----- */
  function colorHistory(t, no) {
    const h = [];
    for (const round of t.rounds) for (const p of round.tables) {
      if (p.b == null) continue;
      if (p.a === no) h.push('w'); else if (p.b === no) h.push('b');
    }
    return h;
  }
  // Ordonne deux joueurs (Blancs d'abord) : celui qui a eu le moins les Blancs les prend ; à égalité, on alterne ;
  // sinon le mieux classé reçoit la couleur opposée à sa dernière
  function orient(t, x, y) {
    const hx = colorHistory(t, x), hy = colorHistory(t, y);
    const bal = (h) => h.filter((c) => c === 'w').length - h.filter((c) => c === 'b').length;
    if (bal(hx) !== bal(hy)) return bal(hx) < bal(hy) ? [x, y] : [y, x];
    const lx = hx[hx.length - 1], ly = hy[hy.length - 1];
    if (lx && lx !== ly) return lx === 'b' ? [x, y] : [y, x];
    if (lx) return lx === 'b' ? [x, y] : [y, x];
    return t.rounds.length % 2 ? [y, x] : [x, y];
  }
  const twoSameColor = (t, no) => { const h = colorHistory(t, no); return h.length >= 2 && h[h.length - 1] === h[h.length - 2] ? h[h.length - 1] : null; };

  /* ----- Appariements ----- */
  function pairNext(t) {
    const r = t.rounds.length + 1;
    let tables;
    if (t.format === 'rr' || t.format === 'rr2') tables = pairRoundRobin(t, r);
    else if (t.format === 'ko') tables = pairKnockout(t, r);
    else tables = pairSwiss(t);
    tables = tables.map((p, i) => ({ ...p, table: i + 1 }));
    if (t.type === 'team') tables.forEach((p) => { if (p.b != null) p.games = Array.from({ length: t.boards }, () => ({ r: null })); });
    return { no: r, tables };
  }
  // Toutes rondes : tables de Berger (méthode du cercle) ; en aller-retour, la seconde moitié inverse les couleurs
  function pairRoundRobin(t, r) {
    const ids = t.entrants.map((e) => e.no), list = ids.length % 2 ? [...ids, null] : ids, n = list.length;
    const half = n - 1, k = (r - 1) % half, back = r > half;
    const rest = list.slice(1), rot = [list[0], ...rest.slice(rest.length - k), ...rest.slice(0, rest.length - k)];
    const out = [];
    for (let i = 0; i < n / 2; i++) {
      let a = rot[i], b = rot[n - 1 - i];
      if (i === 0 ? k % 2 === 1 : false) [a, b] = [b, a];
      if (back) [a, b] = [b, a];
      if (a == null) out.push({ a: b, b: null, r: 'bye' });
      else if (b == null) out.push({ a, b: null, r: 'bye' });
      else out.push({ a, b, r: null });
    }
    // un joueur forfait : ses adversaires gagnent par forfait
    for (const p of out) if (p.b != null) { if (byNo(t, p.a).out) p.r = '-+'; else if (byNo(t, p.b).out) p.r = '+-'; }
    out.sort((x, y) => (x.b == null) - (y.b == null));
    return out;
  }
  // Élimination directe : tableau classique (1 contre le dernier…), exempts pour les mieux placés au premier tour
  function seedOrder(size) {
    let o = [1];
    while (o.length < size) { const m = o.length * 2 + 1; o = o.flatMap((s) => [s, m - s]); }
    return o;
  }
  function pairKnockout(t, r) {
    if (r === 1) {
      const n = t.entrants.length, size = 2 ** Math.ceil(Math.log2(Math.max(2, n))), order = seedOrder(size), out = [];
      for (let i = 0; i < size; i += 2) {
        const a = order[i] <= n ? order[i] : null, b = order[i + 1] <= n ? order[i + 1] : null;
        if (a == null && b == null) continue;
        out.push(a == null ? { a: b, b: null, r: 'bye' } : b == null ? { a, b: null, r: 'bye' } : { a, b, r: null });
      }
      return out.map((p) => { if (p.b == null) return p; const [w, bl] = orient(t, p.a, p.b); return { ...p, a: w, b: bl }; });
    }
    const prev = t.rounds[r - 2].tables, winners = prev.map((p) => winnerOf(t, p)), out = [];
    for (let i = 0; i < winners.length; i += 2) {
      const a = winners[i], b = winners[i + 1];
      if (b == null) { out.push({ a, b: null, r: 'bye' }); continue; }
      const [w, bl] = orient(t, a, b); out.push({ a: w, b: bl, r: null });
    }
    return out;
  }
  // Système suisse : groupes de points, moitié haute contre moitié basse, jamais deux fois le même adversaire,
  // pas trois fois de suite la même couleur quand c'est évitable ; l'exempt est le moins bien classé qui ne l'a pas encore été
  function pairSwiss(t) {
    const st = new Map(standings(t).map((x) => [x.no, x]));
    const met = new Map(t.entrants.map((e) => [e.no, new Set()]));
    const hadBye = new Set();
    for (const round of t.rounds) for (const p of round.tables) {
      if (p.b == null) { hadBye.add(p.a); continue; }
      met.get(p.a).add(p.b); met.get(p.b).add(p.a);
    }
    let players = active(t).map((e) => e.no).sort((a, b) => st.get(b).pts - st.get(a).pts || a - b);
    const out = [];
    if (players.length % 2) {
      const bye = [...players].reverse().find((no) => !hadBye.has(no)) || players[players.length - 1];
      players = players.filter((no) => no !== bye);
      out.push({ a: bye, b: null, r: 'bye' });
    }
    const pts = (no) => st.get(no).pts;
    const ok = (x, y, strict) => !met.get(x).has(y) && (!strict || !(twoSameColor(t, x) && twoSameColor(t, x) === twoSameColor(t, y)));
    let budget = 200000;
    function solve(list, strict) {
      if (!list.length) return [];
      if (--budget < 0) return null;
      const [x, ...rest] = list;
      // candidats : même groupe de points d'abord, en commençant par la moitié basse du groupe (x1 contre x(n/2+1)…)
      const group = list.filter((y) => pts(y) === pts(x)), half = Math.floor(group.length / 2);
      const inGroup = rest.filter((y) => pts(y) === pts(x));
      const ideal = group.slice(half).filter((y) => y !== x), before = inGroup.filter((y) => !ideal.includes(y)).reverse();
      const others = rest.filter((y) => pts(y) !== pts(x)).sort((a, b) => Math.abs(pts(a) - pts(x)) - Math.abs(pts(b) - pts(x)));
      for (const y of [...ideal, ...before, ...others]) {
        if (!ok(x, y, strict)) continue;
        const sub = solve(rest.filter((z) => z !== y), strict);
        if (sub) return [[x, y], ...sub];
      }
      return null;
    }
    let pairs = solve(players, true);
    if (!pairs) { budget = 200000; pairs = solve(players, false); }
    if (!pairs) { // impossible sans revoir un adversaire : on apparie dans l'ordre du classement
      pairs = []; for (let i = 0; i + 1 < players.length; i += 2) pairs.push([players[i], players[i + 1]]);
    }
    const tables = pairs.map(([x, y]) => { const [a, b] = orient(t, x, y); return { a, b, r: null }; })
      .sort((p, q) => Math.max(pts(q.a), pts(q.b)) - Math.max(pts(p.a), pts(p.b)) || (pts(q.a) + pts(q.b)) - (pts(p.a) + pts(p.b)) || Math.min(p.a, p.b) - Math.min(q.a, q.b));
    return [...tables, ...out];
  }

  /* ----- Déroulement ----- */
  const current = (t) => t.rounds[t.rounds.length - 1];
  // Ronde terminée : on passe à la suivante, ou le tournoi se termine
  function next(t) {
    if (!roundDone(t, current(t))) return false;
    const koOver = t.format === 'ko' && current(t).tables.length === 1;
    if (t.rounds.length >= t.totalRounds || koOver || (t.format === 'swiss' && active(t).length < 2)) { t.status = 'over'; return true; }
    t.rounds.push(pairNext(t));
    return true;
  }
  // Annule la ronde en cours (pour corriger un résultat de la ronde précédente)
  function undoRound(t) {
    if (t.status === 'over') { t.status = 'running'; return true; }
    if (t.rounds.length <= 1) return false;
    t.rounds.pop();
    return true;
  }
  function addEntrant(t, name, players) {
    const no = Math.max(0, ...t.entrants.map((e) => e.no)) + 1;
    t.entrants.push({ no, name: String(name).trim(), players: t.type === 'team' ? players || [] : undefined, out: false });
    return no;
  }

  root.OTB = { create, standings, tableScore, roundDone, winnerOf, next, undoRound, addEntrant, current, suggestedRounds, totalRounds, seedOrder, byNo, SCORE };
})(typeof window !== 'undefined' ? window : globalThis);
