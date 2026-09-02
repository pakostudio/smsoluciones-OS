// SM OS 2.10.7: unifica la acción del tablero operativo en TODOS los proyectos (actuales y futuros),
// no solo los de objetivos estratégicos — un solo botón con icono de lápiz ("Gestionar"), como ya
// funcionaba en Montescano, en vez de los 2 botones "Editar rápido" + "Gestionar".
//
// SM OS 2.10.8: además, ese lápiz ahora abre la MISMA ficha completa (A.td) que se abre al picarle
// al nombre de la tarea/embajada, en vez de un modal reducido aparte (A.manageTask, eliminado). Con
// esto queda una sola ficha unificada — con Historial, Contacto, Alertas y el botón "Eliminar" (solo
// admin) — sin importar por dónde se entre. Es estructural (no depende del nombre del proyecto), así
// que aplica también a cualquier proyecto que se cree en el futuro.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

// El branch de proyectos NO estratégicos usa un solo botón-lápiz, con la misma clase visual que el
// de objetivos (structural, no atado a un nombre de proyecto), y abre la ficha completa unificada.
assert.match(app, /aria-label="Gestionar" title="Gestionar" onclick="A\.td\(/);

// Ya no debe quedar el markup viejo de los 2 botones en el tablero operativo.
assert.doesNotMatch(app, /Editar rápido<\/button><button class="btn btns btng" onclick="A\.manageTask/);

// El modal chico "Gestionar" (ficha duplicada) ya no debe existir como función independiente.
assert.doesNotMatch(app, /manageTask:\s*function/);
assert.doesNotMatch(app, /saveManagedTask:\s*function/);

// La ficha completa (A.td) sigue siendo la única puerta de entrada, y conserva "Eliminar" para admin.
assert.match(app, /editActions = canEditTask\(t\) \? '<button class="btn btns btnc" onclick="mClose\(\);A\._tm\(\\''\+id\+'\\'\)">Editar información<\/button>'\+\(adm\(\)\?'<button class="btn btns btnd" onclick="A\.dt\(\\''\+id\+'\\'\)">Eliminar<\/button>':''\) : '';/);

console.log('Ficha unificada (lápiz = ficha completa, con Eliminar estructural) en todos los tableros: OK');
