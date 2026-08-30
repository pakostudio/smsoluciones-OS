import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(app, /function projectControlVisualDashboard\(p,tasks\)/);
assert.match(app, /function projectPlannedProgress\(p,tasks\)/);
assert.match(app, /Frentes\\s\*:\\s\*\(\[\^\\n\]\+\)/);
assert.match(app, /Avance real vs\. planeado/);
assert.match(app, /Tareas por estado/);
assert.match(app, /Carga por responsable/);
assert.match(app, /Avance por fase o área/);
assert.match(app, /Hitos principales/);
assert.match(app, /Bloqueos y decisiones/);
assert.match(app, /projectControlVisualDashboard\(p,tasks\)/);

const start = app.indexOf('function projectControlVisualDashboard(p,tasks)');
const end = app.indexOf('function projectCommandCenterHtml(p)', start);
const dashboard = app.slice(start, end);
assert.ok(start > 0 && end > start);
assert.doesNotMatch(dashboard, /MONTESCANO|ProKicks|OFUNAM|Pink Love|CIME/i);
assert.match(dashboard, /controlProgress\(t\)/);
assert.match(dashboard, /controlArea\(t\)/);
assert.match(dashboard, /control_bloqueado/);
assert.match(dashboard, /control_decision_requerida/);

for (const selector of [
  '.control-dashboard', '.control-kpi-strip', '.control-visual-grid',
  '.control-donut', '.control-bar-row', '.control-phase-row',
  '.control-milestone', '.control-focus-item'
]) assert.ok(css.includes(selector), `${selector} debe tener estilos`);

assert.match(css, /@media\(max-width:1080px\)/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(html, /styles\.css\?v=2\.(?:6|7)\.0|styles\.css\?v=2\.8\.[0-5]|styles\.css\?v=2\.(?:9\.[01]|10\.0)/);
assert.match(html, /app\.js\?v=2\.(?:6|7)\.0|app\.js\?v=2\.8\.[0-5]|app\.js\?v=2\.(?:9\.[01]|10\.0)/);

console.log('Project Control Sprint 3 dashboard tests: OK');
