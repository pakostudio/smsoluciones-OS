// Blinda la universalización de la Ficha Estratégica del Objetivo: debe depender de una
// capacidad reusable del proyecto (Vista: objetivos), nunca de un nombre fijo como "MONTESCANO".
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

// La compuerta genérica existe y ya no compara contra un nombre de proyecto.
assert.match(app, /function isStrategicObjectiveTask\(t\)\{/);
const gateBody = app.slice(app.indexOf('function isStrategicObjectiveTask'), app.indexOf('function isStrategicObjectiveTask') + 200);
assert.doesNotMatch(gateBody, /MONTESCANO/i);
assert.match(gateBody, /isObjectivesBoard\(p\)/);

// No debe quedar ninguna referencia a la compuerta vieja atada al nombre.
assert.doesNotMatch(app, /isMontescanoObjectiveTask/);

// isObjectivesBoard sigue siendo la capacidad estructural (por configuración del proyecto,
// no por nombre) que activa el Centro de Control estratégico.
assert.match(app, /function isObjectivesBoard\(p\)\{ return !!p && \/\^objetivos\$\/i\.test\(String\(descVal\(p,'Vista'\)\|\|''\)\); \}/);

// El botón "Gestionar objetivo" en el tablero operativo depende de la bandera del proyecto
// (objectivesBoard), no de una compuerta específica de tarea/nombre.
assert.match(app, /var actionButtons = objectivesBoard\s*\n\s*\? '<div class="operational-actions strategic-action">/);

// El encabezado de la ficha usa el nombre real del proyecto, no un texto fijo.
assert.doesNotMatch(app, /<span>MONTESCANO · Objetivo estratégico<\/span>/);
assert.match(app, /<span>'\+esc\(op\?op\.nombre:''\)\+' · Objetivo estratégico<\/span>/);
assert.match(app, /var op=taskProject\(t\);/);

// El formulario de proyecto expone un toggle para habilitar la capacidad sin editar texto a mano.
assert.match(app, /id="f_objectives"/);
assert.match(app, /Centro de Control estratégico \(Objetivos\)/);
assert.match(app, /aria-label="Habilitar Centro de Control estratégico para este proyecto"/);
assert.match(app, /var wantsObjectives=!!\(document\.getElementById\('f_objectives'\)/);
assert.match(app, /if\(wantsObjectives\)projectDesc\+='\\nVista: objetivos';/);

// "Vista" se limpia del texto libre de descripción para no duplicarse al reconstruirla,
// igual que Categoria/Icono/Color/Frentes.
assert.match(app, /Categoria\|Categoría\|Icono\|Color\|Frentes\|Vista\)\\s\*:/);

console.log('Universalización de la Ficha Estratégica: OK');
