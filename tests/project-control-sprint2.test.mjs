import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../migrations/2026-08-26-project-control-execution-board.sql', import.meta.url), 'utf8');

for (const field of [
  'control_bloqueado boolean not null default false',
  'control_bloqueo_resumen text',
  'control_decision_requerida boolean not null default false',
  'control_decision_resumen text',
  'control_fecha_decision date'
]) assert.match(migration, new RegExp(field));

assert.doesNotMatch(migration, /\b(drop|truncate|delete from)\b/i);
assert.match(app, /function projectExecutionBoardHtml\(p\)/);
assert.match(app, /\['ejecucion','Ejecución'\]/);
assert.match(app, /tab==='ejecucion'\?projectExecutionBoardHtml\(p\)/);
assert.match(app, /Centro de Control/);
assert.match(app, /Avance global/);
assert.match(app, /Bloqueos/);
assert.match(app, /Decisiones/);
assert.match(app, /Visible para el cliente/);
assert.match(app, /controlEdit: function\(id\)/);
assert.match(app, /saveControlEdit: async function\(id\)/);

for (const legacy of ['tareas','reporte','historial','kanban','calendario','gantt','pipeline']) {
  assert.match(app, new RegExp(`\\['${legacy}'`));
}

assert.match(css, /\.control-row\{/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /\.control-row\{grid-template-columns:1fr 1fr/);
assert.match(html, /styles\.css\?v=2\.(?:5|6|7)\.0/);
assert.match(html, /app\.js\?v=2\.(?:5|6|7)\.0/);

const boardStart = app.indexOf('function projectExecutionBoardHtml(p)');
const boardEnd = app.indexOf('function projectReportHtml', boardStart);
const boardSource = app.slice(boardStart, boardEnd);
assert.ok(boardStart > 0 && boardEnd > boardStart);
assert.doesNotMatch(boardSource, /MONTESCANO|ProKicks|OFUNAM|Pink/i);

console.log('Project Control Sprint 2 structural and responsive tests: OK');
