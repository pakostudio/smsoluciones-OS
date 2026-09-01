// Vista "Mi trabajo" vs "Resumen del proyecto": para usuarios no administradores en proyectos con
// Centro de Control estratégico (objetivos), projectTasks() se acota automáticamente a sus propias
// tareas por default (WORKSPACE_MODE='mine'), sin tocar la visibilidad de los administradores.
// Un botón de 2 opciones (arriba de las secciones del proyecto) deja cambiar a "Resumen del proyecto"
// donde cualquiera de los 3 (Alan/Jorge/Paco) puede ver los frentes juntos.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');

// Estado global, 'mine' por default.
assert.match(app, /var WORKSPACE_MODE = 'mine';/);

// projectTasksBase() sigue siendo la fuente sin acotar (para contar responsables y para admin).
assert.match(app, /function projectTasksBase\(pid\)\{/);

// projectTasks() aplica el modo solo cuando NO es admin y el proyecto tiene Centro de Control
// estratégico — los administradores nunca quedan limitados por este modo.
assert.match(app, /function projectTasks\(pid\)\{\s*\n\s*var base = projectTasksBase\(pid\);\s*\n\s*if\(WORKSPACE_MODE==='mine' && !adm\(\)\)\{/);
assert.match(app, /if\(isObjectivesBoard\(p\)\) return base\.filter\(function\(t\)\{ return t\.owner_id===SES\.userId; \}\);/);

// El switch visual solo aparece para usuarios no admin, en proyectos de objetivos, y solo si hay
// más de un responsable (si es uno solo no hay nada que separar).
assert.match(app, /function projectUsesWorkspaceMode\(p\)\{\s*\n\s*return !!p && !adm\(\) && isObjectivesBoard\(p\);\s*\n\}/);
assert.match(app, /function workspaceModeSwitchHtml\(p\)\{/);
assert.match(app, /if\(owners\.length<2\) return '';/);
assert.match(app, /Mi trabajo<\/button>/);
assert.match(app, /Resumen del proyecto<\/button>/);

// Se inserta en el encabezado del proyecto, arriba de las secciones (Centro de Control, Objetivos...).
assert.match(app, /workspaceModeSwitchHtml\(p\)\s*\n\s*\+projectTabs\(p\)/);

// A.setWorkspaceMode reutiliza render() y limpia los sub-filtros (Board/Control) al cambiar de modo,
// para que no queden filtros de un responsable pegados al cambiar a "Resumen del proyecto".
assert.match(app, /setWorkspaceMode: function\(mode\)\{\s*\n\s*WORKSPACE_MODE = mode==='all' \? 'all' : 'mine';/);

assert.match(css, /\.workspace-mode-switch\{display:flex/);
assert.match(css, /\.wm-btn\.active\{background:var\(--surface\)/);

console.log('Modo de vista por usuario (Mi trabajo / Resumen del proyecto): OK');
