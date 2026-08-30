import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(app, /function isObjectivesBoard\(p\)/);
assert.match(app, /objectivesBoard \? 'Objetivo'/);
assert.match(app, /aria-label="Editar rápido"/);
assert.match(app, /title="Gestionar objetivo"/);
assert.match(app, /iconHtml\('pencil'\)/);
assert.match(app, /iconHtml\('clipboard-list'\)/);
assert.match(app, /isObjectivesBoard\(p\) \? 'Objetivos estratégicos'/);
assert.match(app, /objectivesWorkspace\?'Objetivo':'Registro'/);
assert.match(app, /objectivesWorkspace\?'Objetivos':'Registros'/);
assert.match(css, /\.operational-table\.objective-table/);
assert.match(css, /\.compact-action:focus-visible/);
assert.match(css, /flex-direction:row!important/);
assert.match(css, /-webkit-line-clamp:2/);
assert.match(app, /class="objective-next-action"/);
assert.match(app, /FLD\('ti','Objetivo'/);
assert.match(app, /Editar objetivo':'Nuevo objetivo'/);
assert.match(app, /isObj\?ti:fv\('gr'\)/);
assert.match(app, /var actionsHead = 'Acciones'/);
assert.match(css, /width:24px;height:24px/);
assert.match(css, /background:transparent/);
assert.match(html, /styles\.css\?v=2\.(?:9\.[01]|10\.0)/);
assert.match(html, /app\.js\?v=2\.(?:9\.[01]|10\.0)/);

console.log('Objective board compact UX tests: OK');
