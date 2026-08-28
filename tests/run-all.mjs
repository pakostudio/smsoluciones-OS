// Corre todos los tests/*.test.mjs y un chequeo de sintaxis del app.js.
// Uso: node tests/run-all.mjs
// Sale con código 0 solo si TODO pasó — úsalo como compuerta antes de cada push a producción.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let failed = 0;
let passed = 0;

function run(label, fn){
  try {
    fn();
    console.log('✓ ' + label);
    passed++;
  } catch (err) {
    console.log('✗ ' + label);
    console.log(String(err && err.message ? err.message : err).split('\n').slice(0,6).join('\n'));
    failed++;
  }
}

// 1) Sintaxis válida del archivo principal antes que nada
run('sintaxis: assets/js/app.js', () => {
  execFileSync('node', ['-c', path.join(root, 'assets/js/app.js')], { stdio: 'pipe' });
});

// 2) Cada archivo de test en tests/*.test.mjs
const testFiles = fs.readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort();
for (const f of testFiles) {
  run('test: ' + f, () => {
    execFileSync('node', [path.join(here, f)], { stdio: 'pipe' });
  });
}

console.log('\n' + passed + ' OK, ' + failed + ' fallidos de ' + (passed + failed) + ' verificaciones.');
if (failed > 0) {
  console.log('\nNO hagas push — corrige lo anterior primero.');
  process.exit(1);
} else {
  console.log('\nTodo en verde. Seguro para desplegar.');
}
