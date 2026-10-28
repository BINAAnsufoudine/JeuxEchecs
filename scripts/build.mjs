// Assemble les gros fichiers de l'appli à partir de leurs modules (un fichier par partie du jeu) :
//   src/app/*.js     → app.js      (interface, en ligne, tournois, boutique, profil, admin, leçons…)
//   src/board3d/*.js → board3d.js  (plateau 3D : scène, caméra, mats, attaques, projectiles…)
// Les modules sont concaténés dans l'ordre de leur numéro, octet pour octet : le résultat est le
// fichier servi par GitHub Pages, sans aucune étape de construction côté navigateur.
// Usage : node scripts/build.mjs          → réécrit app.js et board3d.js
//         node scripts/build.mjs --check  → échoue si un fichier assemblé n'est pas à jour
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TARGETS = [['src/app', 'app.js'], ['src/board3d', 'board3d.js']];
const check = process.argv.includes('--check');
let stale = false;
for (const [dir, out] of TARGETS) {
  const parts = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const built = Buffer.concat(parts.map((f) => readFileSync(join(dir, f))));
  const current = existsSync(out) ? readFileSync(out) : Buffer.alloc(0);
  if (built.equals(current)) { console.log(`✓ ${out} à jour (${parts.length} modules)`); continue; }
  if (check) { console.log(`::error title=Assemblage::${out} n'est pas à jour : lancer node scripts/build.mjs`); stale = true; continue; }
  writeFileSync(out, built);
  console.log(`✎ ${out} réassemblé (${parts.length} modules)`);
}
if (stale) process.exit(1);
