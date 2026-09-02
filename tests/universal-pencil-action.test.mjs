// SM OS 2.10.7: unifica la acción del tablero operativo en TODOS los proyectos (actuales y futuros),
// no solo los de objetivos estratégicos — un solo botón con icono de lápiz ("Gestionar"), como ya
// funcionaba en Montescano, en vez de los 2 botones "Editar rápido" + "Gestionar".
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

// El branch de proyectos NO estratégicos ahora también usa un solo botón-lápiz, con la misma
// clase visual que el de objetivos (structural, no atado a un nombre de proyecto).
assert.match(app, /aria-label="Gestionar" title="Gestionar" onclick="A\.manageTask\(/);

// Ya no debe quedar el markup viejo de los 2 botones en el tablero operativo.
assert.doesNotMatch(app, /Editar rápido<\/button><button class="btn btns btng" onclick="A\.manageTask/);

console.log('Acción unificada (lápiz) en todos los tableros: OK');
