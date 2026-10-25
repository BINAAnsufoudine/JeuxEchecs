import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = path.join(root, 'stockfish-version.json');
const stabilityDays = 45;
const api = 'https://api.github.com/repos/nmrugg/stockfish.js/releases?per_page=100';

function compareVersions(a, b) {
  const av = a.split('.').map(Number), bv = b.split('.').map(Number);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const diff = (av[i] || 0) - (bv[i] || 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

async function get(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  return response;
}

const manifest = JSON.parse(await readFile(versionFile, 'utf8'));
const token = process.env.GITHUB_TOKEN;
const releases = await (await get(api, {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})).json();
const cutoff = Date.now() - stabilityDays * 24 * 60 * 60 * 1000;
const stable = releases.find((release) => {
  const version = /^v?(\d+\.\d+\.\d+)$/.exec(release.tag_name || '');
  return !release.draft && !release.prerelease && version && Date.parse(release.published_at) <= cutoff
    && compareVersions(version[1], manifest.version) > 0
    && release.assets.some((asset) => /^stockfish-\d+-lite-single\.js$/.test(asset.name))
    && release.assets.some((asset) => /^stockfish-\d+-lite-single\.wasm$/.test(asset.name));
});

if (!stable) {
  console.log(`Aucune version stable de Stockfish.js supérieure à ${manifest.version} n'a dépassé ${stabilityDays} jours.`);
  process.exit(0);
}

const version = /^v?(\d+\.\d+\.\d+)$/.exec(stable.tag_name)[1];
const major = version.split('.')[0];
const jsAsset = stable.assets.find((asset) => asset.name === `stockfish-${major}-lite-single.js`);
const wasmAsset = stable.assets.find((asset) => asset.name === `stockfish-${major}-lite-single.wasm`);
const [js, wasm] = await Promise.all([
  get(jsAsset.browser_download_url).then((response) => response.text()),
  get(wasmAsset.browser_download_url).then((response) => response.arrayBuffer()),
]);
if (!js.includes(`Stockfish.js ${major}`) || wasm.byteLength < 500_000) {
  throw new Error(`Les fichiers Stockfish.js ${version} téléchargés ne correspondent pas au format attendu.`);
}

const jsTemp = path.join(root, 'stockfish.js.new');
const wasmTemp = path.join(root, 'stockfish.wasm.new');
await writeFile(jsTemp, js);
await writeFile(wasmTemp, new Uint8Array(wasm));
await rename(jsTemp, path.join(root, 'stockfish.js'));
await rename(wasmTemp, path.join(root, 'stockfish.wasm'));
await writeFile(versionFile, `${JSON.stringify({ version, source: manifest.source, stabilityDays }, null, 2)}\n`);

const swPath = path.join(root, 'sw.js');
let sw = await readFile(swPath, 'utf8');
const cache = /const CACHE = 'cavalier-v(\d+)'/.exec(sw);
if (!cache) throw new Error('Version du cache du service worker introuvable.');
sw = sw.replace(cache[0], `const CACHE = 'cavalier-v${Number(cache[1]) + 1}'`);
await writeFile(swPath, sw);
console.log(`Stockfish.js ${manifest.version} → ${version} (${stable.tag_name}, publié le ${stable.published_at}).`);
