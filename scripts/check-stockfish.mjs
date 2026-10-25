import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = path.resolve(root, process.argv[2] || 'stockfish.js');
const child = spawn(process.execPath, [engine], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
let output = '';
let done = false;
const finish = (error) => {
  if (done) return;
  done = true;
  clearTimeout(timer);
  child.kill();
  if (error) { console.error(error.message); process.exitCode = 1; }
  else console.log('Stockfish a répondu à UCI et a retourné un coup.');
};
const timer = setTimeout(() => finish(new Error('Stockfish ne répond pas dans le délai prévu.')), 20000);
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (text) => {
  output += text;
  if (/\bbestmove\s+[a-h][1-8][a-h][1-8][qrbn]?\b/.test(output)) {
    if (!output.includes('uciok') || !output.includes('readyok')) return finish(new Error('Réponse UCI incomplète.'));
    finish();
  }
});
child.on('error', (error) => finish(error));
child.on('exit', (code) => { if (!done) finish(new Error(`Stockfish s'est arrêté prématurément (${code}).`)); });
child.stdin.write('uci\nisready\nposition startpos\ngo depth 5\n');
