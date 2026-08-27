import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/styles.css',import.meta.url),'utf8');

assert.match(app,/Administrar proyectos/);
assert.match(app,/Usuarios y permisos/);
assert.match(app,/Dar de baja/);
assert.match(app,/restoreProject: async function/);
assert.match(app,/Se conservarán sus tareas, historial y datos/);
assert.match(app,/project-back/);
assert.match(app,/Volver al Centro de Control/);
assert.match(app,/project-tabs/);
assert.match(app,/board-filter-panel/);
assert.match(app,/Administrador: ve y gestiona todo/);
assert.match(app,/prokicks-work-head/);
assert.match(app,/Florida · Darío/);
assert.match(app,/PKTAB=\\'florida\\'/);
assert.match(app,/front-panel/);
assert.match(css,/\.project-tab\.active/);
assert.match(css,/\.board-filter-panel/);
assert.match(css,/\.user-access-note/);
assert.match(css,/\.prokicks-work-head/);
assert.match(css,/\.florida-direct/);
assert.match(css,/\.front-panel/);

console.log('Admin and navigation UX tests: OK');
