/* Ata Wawé — lecture des fichiers PGN */
(function (root) {
  'use strict';

  function parseGame(text) {
    const tags = {};
    text.replace(/^\s*\[([A-Za-z0-9_]+)\s+"((?:\\.|[^"])*)"\]\s*$/gm, (_, key, value) => {
      tags[key] = value.replace(/\\([\\"])/g, '$1');
      return '';
    });
    const movetext = text.replace(/^\s*\[[^\r\n]*\]\s*$/gm, '').replace(/\{[^}]*\}/gs, '').replace(/;[^\r\n]*/g, '');
    let clean = '', variationDepth = 0;
    for (const char of movetext) {
      if (char === '(') variationDepth++;
      else if (char === ')' && variationDepth) variationDepth--;
      else if (!variationDepth) clean += char;
    }
    const game = new root.Chess.Game();
    let result = tags.Result || '*';
    for (let token of clean.replace(/\$\d+/g, '').split(/\s+/)) {
      token = token.replace(/^\d+\.(?:\.\.)?/, '').replace(/[!?]+$/g, '');
      if (!token || /^(?:e\.p\.?|ep)$/i.test(token)) continue;
      if (/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(token)) { result = token; break; }
      if (!game.playSan(token)) return { error: token };
    }
    if (!game.history.length) return { error: root.L('aucun coup reconnu', 'no move recognised') };
    if (!/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(result)) result = '*';
    return { tags, moves: game.uciList(), result, status: game.status() };
  }

  function parse(text) {
    const source = text.replace(/^\uFEFF/, '').trim();
    const starts = [...source.matchAll(/^\s*\[Event\s+/gm)].map((match) => match.index);
    const chunks = starts.length > 1 ? starts.map((start, index) => source.slice(start, starts[index + 1] || source.length).trim()) : [source];
    const games = [];
    for (const chunk of chunks) {
      const parsed = parseGame(chunk);
      if (parsed.error) return { error: parsed.error, games: [] };
      games.push(parsed);
    }
    return { games };
  }

  root.Pgn = Object.freeze({ parse });
})(window);
