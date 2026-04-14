import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname.slice(1), '..');
const releaseDir = path.join(root, 'release');
const publicDst = path.join(releaseDir, 'public');
const frontendDist = path.join(root, 'frontend', 'dist');
const traySrc = path.join(root, 'release-scripts');

await mkdir(releaseDir, { recursive: true });
await cp(frontendDist, publicDst, { recursive: true });

for (const file of await readdir(traySrc)) {
  await cp(path.join(traySrc, file), path.join(releaseDir, file));
}

console.log('✓ public/ copiado');
console.log('✓ tray.ps1 + UpSystem.vbs copiados');
console.log('✓ Release pronto em', releaseDir);
