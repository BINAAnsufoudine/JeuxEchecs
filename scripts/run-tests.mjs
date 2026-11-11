// Tests automatiques lancés par GitHub Actions à chaque envoi :
// 1. tests.html (moteur d'échecs, analyse, stress de l'échiquier 3D) ;
// 2. tests3d.html (plateau 3D dans les 11 thèmes : pièces fantômes, restes d'animation, caméra, mats) ;
// 3. démarrage de l'appli (index.html) sans aucune erreur JavaScript ;
// 4. rechargement de la page en pleine partie : le thème choisi s'applique sans repasser par l'accueil.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;

async function suite() {
  const page = await browser.newPage();
  await page.goto(BASE + 'tests.html', { timeout: 300000 });
  await page.waitForFunction(() => window.__tests && window.__tests.done, null, { timeout: 180000 });
  const t = await page.evaluate(() => window.__tests);
  for (const r of t.results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
    // les échecs apparaissent aussi en annotations sur la page de l'action GitHub
    if (!r.ok) console.log(`::error title=${r.name.replace(/[:,]/g, ' ')}::${r.error}`);
  }
  if (!t.ok) { failed = true; console.log('✗ tests.html en échec'); }
  await page.close();
}

async function suite3d() {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(`::error title=tests3d.html::${e.message}`));
  await page.goto(BASE + 'tests3d.html', { timeout: 300000 }); // les tests tournent pendant le chargement de la page
  await page.waitForFunction(() => window.__tests3d && window.__tests3d.done, null, { timeout: 300000 });
  const t = await page.evaluate(() => window.__tests3d);
  for (const r of t.results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
    if (!r.ok) console.log(`::error title=${r.name.replace(/[:,]/g, ' ')}::${r.error}`);
  }
  if (!t.ok) { failed = true; console.log('✗ tests3d.html en échec'); }
  await page.close();
}

async function boot() {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|firestore|firebase|net::/i.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + 'index.html', { timeout: 120000 });
  await page.waitForTimeout(4000);
  const screen = await page.evaluate(() => document.body.dataset.screen || '');
  console.log(`${screen ? '✓' : '✗'} démarrage de l'appli (écran « ${screen} »)`);
  if (!screen) failed = true;
  for (const e of errors) { console.log(`✗ erreur au démarrage : ${e}`); console.log(`::error title=Démarrage de l'appli::${e}`); }
  if (errors.length) failed = true;
  await page.close();
}

async function reloadTheme() {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.goto(BASE + 'index.html', { timeout: 120000 });
  await page.evaluate(() => {
    localStorage.setItem('cavalier.natureCollection', JSON.stringify('sabres'));
    localStorage.setItem('cavalier.wallet', JSON.stringify({ xp: 6000 })); // l'Âge des Sabres se gagne à 4 800 points
    localStorage.setItem('cavalier.game', JSON.stringify({ cfg: { mode: 'local', playerColor: 'w', level: 1 }, moves: ['e2e4', 'e7e5'], result: null, flipped: false }));
    localStorage.setItem('cavalier.lastScreen', JSON.stringify('game'));
  });
  await page.reload({ timeout: 120000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({ screen: document.body.dataset.screen, theme: window.PieceTheme }));
  const ok = r.screen === 'game' && r.theme === 'sabres';
  console.log(`${ok ? '✓' : '✗'} rechargement en pleine partie (écran « ${r.screen} », thème « ${r.theme} »)`);
  if (!ok) { failed = true; console.log(`::error title=Rechargement::thème « ${r.theme} » sur l'écran « ${r.screen} » au lieu de « sabres » sur « game »`); }
  await page.close();
}

try { await suite(); await suite3d(); await boot(); await reloadTheme(); } catch (e) { console.log('✗', e.message); console.log(`::error title=Tests::${e.message}`); failed = true; }
await browser.close();
process.exit(failed ? 1 : 0);
