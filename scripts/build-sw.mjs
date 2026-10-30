import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { serviceWorkerSource } from './sw-template.mjs';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
let notices = await readFile('THIRD_PARTY_NOTICES.md', 'utf8');
for (const [directory, metadata] of Object.entries(lock.packages)) {
  if (!directory || metadata.dev || !directory.startsWith('node_modules/')) continue;
  let entries;
  try { entries = await readdir(directory); } catch { continue; }
  notices += `\n\n---\n${directory} ${metadata.version}\nLicense: ${metadata.license || 'See package notices'}\n`;
  for (const name of entries.filter(name => /^(licen[cs]e|copying)(\.|$)/i.test(name))) {
    try { notices += '\n' + await readFile(path.join(directory, name), 'utf8'); } catch { /* Some packages have license directories instead. */ }
  }
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt', notices);
const files = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name !== 'sw.js' && entry.name !== 'CNAME')
  .map(entry => '/' + path.relative('dist', path.join(entry.parentPath, entry.name)).replaceAll('\\', '/')).sort();
const hash = createHash('sha256');
for (const file of files) { hash.update(file); hash.update(await readFile('dist' + file)); }
const version = hash.digest('hex').slice(0, 16);
await writeFile('dist/sw.js', serviceWorkerSource(files, version));
console.log(`Offline cache: ${files.length} app assets, version ${version}`);
