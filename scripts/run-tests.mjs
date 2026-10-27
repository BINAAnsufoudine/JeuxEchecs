// Tests automatiques lancés par GitHub Actions à chaque envoi :
// 1. tests.html (moteur d'échecs, analyse, stress de l'échiquier 3D) ;
// 2. démarrage de l'appli (index.html) sans aucune erreur JavaScript.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;

async function suite() {
  const page = await browser.newPage();
  await page.goto(BASE + 'tests.html');
  await page.waitForFunction(() => window.__tests && window.__tests.done, null, { timeout: 180000 });
  const t = await page.evaluate(() => window.__tests);
  for (const r of t.results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
  if (!t.ok) { failed = true; console.log('✗ tests.html en échec'); }
  await page.close();
}

async function boot() {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|firestore|firebase|net::/i.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + 'index.html');
  await page.waitForTimeout(4000);
  const screen = await page.evaluate(() => document.body.dataset.screen || '');
  console.log(`${screen ? '✓' : '✗'} démarrage de l'appli (écran « ${screen} »)`);
  if (!screen) failed = true;
  for (const e of errors) console.log(`✗ erreur au démarrage : ${e}`);
  if (errors.length) failed = true;
  await page.close();
}

try { await suite(); await boot(); } catch (e) { console.log('✗', e.message); failed = true; }
await browser.close();
process.exit(failed ? 1 : 0);
