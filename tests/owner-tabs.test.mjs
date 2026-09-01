// Pestañas por responsable en proyectos con Centro de Control estratégico (objetivos):
// permiten navegar visualmente "todo lo de Jorge", "todo lo de Alan", etc. sin tocar
// permisos ni datos — reutilizan el filtro BOARD_FILTERS.responsable que ya existía.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');

// Se calculan a partir de todas las tareas del proyecto (no las ya filtradas), para
// que la barra de pestañas siga visible incluso si un filtro deja la tabla en cero.
assert.match(app, /var ownerTabs = '';/);
assert.match(app, /if\(objectivesBoard\)\{\s*\n\s*var boardOwners = \[\];/);
assert.match(app, /allTasks\.forEach\(function\(t\)\{var o=boardOwnerName\(t,p\); if\(o && boardOwners\.indexOf\(o\)<0\) boardOwners\.push\(o\);\}\);/);

// Solo se muestran si hay más de un responsable (si es uno solo, no hay nada que separar).
assert.match(app, /if\(boardOwners\.length>1\)\{/);

// Reutiliza el mecanismo de filtro existente (BOARD_FILTERS.responsable), no crea uno nuevo.
assert.match(app, /setOwnerTab: function\(el\)\{\s*\n\s*A\.setBoardFilter\('responsable', el && el\.getAttribute\('data-owner'\) \|\| ''\);/);

// La barra aparece tanto si hay resultados como si el filtro deja la tabla vacía.
assert.match(app, /return ownerTabs\+filterBar\+'<div class="empty">/);
assert.match(app, /return ownerTabs\+filterBar\+frontStrip\+'<div class="card sticky-board"/);

// Estilos compactos, sin fondos oscuros salvo el estado activo (contraste intencional),
// y con scroll horizontal en móvil en vez de desbordar.
assert.match(css, /\.owner-tabs\{display:flex;gap:6px;flex-wrap:wrap/);
assert.match(css, /\.owner-tab\.active\{background:var\(--navy\)/);
assert.match(css, /@media\(max-width:760px\)\{\.owner-tabs\{overflow-x:auto/);

console.log('Owner tabs (pestañas por responsable): OK');
