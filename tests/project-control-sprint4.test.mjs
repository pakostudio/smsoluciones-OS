import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(app, /function projectObjectivesHtml\(p\)/);
assert.match(app, /function objectiveName\(t\)/);
assert.match(app, /function objectiveSignal\(tasks\)/);
assert.match(app, /\['objetivos','Objetivos','target'\]/);
assert.match(app, /tab==='objetivos'\?projectObjectivesHtml\(p\)/);
assert.match(app, /Mapa de Objetivos/);
assert.match(app, /Matriz de trazabilidad/);
assert.match(app, /Objetivo → KPI y meta → fase → acción → responsable → evidencia → resultado/);
assert.match(app, /Trazabilidad del objetivo/);
assert.match(app, /objetivo:fv\('ob'\),entregable:fv\('en'\),kpi:fv\('kp'\),meta:fv\('mt'\)/);

const start = app.indexOf('function projectObjectivesHtml(p)');
const end = app.indexOf('function controlStateKey(t)', start);
const objectives = app.slice(start, end);
assert.ok(start > 0 && end > start);
assert.doesNotMatch(objectives, /MONTESCANO|ProKicks|OFUNAM|Pink Love|CIME/i);
assert.match(objectives, /projectTasks\(p\.id\)/);
assert.match(objectives, /DB\.entregables/);
assert.match(objectives, /controlProgress\(t\)/);
assert.match(app, /function objectiveSignal\(tasks\)[\s\S]*control_bloqueado/);
assert.match(app, /function objectiveSignal\(tasks\)[\s\S]*control_decision_requerida/);

for (const selector of [
  '.objectives-map', '.objective-summary', '.objective-route',
  '.objective-grid', '.objective-card', '.objective-task',
  '.objective-matrix'
]) assert.ok(css.includes(selector), `${selector} debe tener estilos`);

assert.match(html, /styles\.css\?v=2\.7\.0|styles\.css\?v=2\.8\.[0-5]|styles\.css\?v=2\.(?:9\.[01]|10\.[0-2])/);
assert.match(html, /app\.js\?v=2\.7\.0|app\.js\?v=2\.8\.[0-5]|app\.js\?v=2\.(?:9\.[01]|10\.[0-2])/);

console.log('Project Control Sprint 4 objective traceability tests: OK');
