// Arma dist/ para un hosting estático: la pantalla de public/ y el núcleo de src/ en dist/lib/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');
const NUCLEO = ['consultorio.js', 'domain.js', 'adapters.js'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(RAIZ, 'public'), DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'lib'));
for (const archivo of NUCLEO) {
  fs.copyFileSync(path.join(RAIZ, 'src', archivo), path.join(DIST, 'lib', archivo));
}

console.log(`Listo: ${path.relative(RAIZ, DIST)}/`);
