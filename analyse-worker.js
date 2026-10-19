/* Cavalier — analyse des parties en arrière-plan */
importScripts('engine.js', 'search.js', 'coach-core.js');

self.onmessage = (e) => {
  const { id, moves, color, explain, review, fen, insight } = e.data;
  try {
    if (insight) {
      self.postMessage({ id, ok: true, insight: self.Coach.judgeMove(insight.fen, insight.uci, insight.history, { user: insight.user }) });
      return;
    }
    if (review) {
      const r = self.Coach.reviewGame(moves, { fen, onProgress: (done, total) => self.postMessage({ id, progress: [done, total] }) });
      self.postMessage({ id, ok: true, review: r });
      return;
    }
    // Détail de fautes déjà relevées (astuces)
    if (explain) { self.postMessage({ id, ok: true, explained: explain.map((m) => ({ id: m.id, ...(self.Coach.explainError(m.fen, m.played, m.best, m.theme) || {}) })) }); return; }
    const r = self.Coach.analyseGame(moves, color, { depth: 3, q: 6 });
    for (const err of r.errors) Object.assign(err, self.Coach.explainError(err.fen, err.played, err.best, err.theme) || {});
    self.postMessage({ id, ok: true, ...r });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
