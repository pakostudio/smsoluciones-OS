// Guarda contra la regresión de navegación que causó el bug "me saca a Plan de trabajo":
// - localStorage con un pktab/fltab/view obsoleto debía autocorregirse en vez de romper la pantalla.
// - Florida y Operación no deben usar A.openProject() en sus botones de pestañas (eso las saca
//   al proyecto genérico en vez de quedarse en su propio módulo).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

// 1) El sistema de saneamiento de sesión debe existir y cubrir view/ptab/pktab/fltab
assert.match(app, /function sanitizeSessionState\(state\)/);
assert.match(app, /var VALID_VIEWS\s*=\s*\[/);
assert.match(app, /var VALID_PTABS\s*=\s*\[/);
assert.match(app, /var VALID_FLTABS\s*=\s*\[/);
assert.match(app, /VALID_FLTABS\.indexOf\(fltab\)<0/);
assert.match(app, /VALID_PTABS\.indexOf\(ptab\)<0/);
assert.match(app, /VALID_VIEWS\.indexOf\(view\)<0/);

// 2) activateSession debe pasar por el saneador, no asignar los valores crudos del localStorage
const activateSessionBody = app.slice(app.indexOf('function activateSession(found,state)'), app.indexOf('function restoreSession'));
assert.match(activateSessionBody, /sanitizeSessionState\(state\)/);

// 3) nav() debe rechazar vistas inválidas en vez de dejar la app en un estado roto
assert.match(app, /function nav\(v\)\{\s*if\(VALID_VIEWS\.indexOf\(v\)<0\)\s*return;/);

// 4) Florida y Operación deben tener sus propias funciones de tabs, y Florida no debe
//    enrutar sus pestañas con A.openProject (eso fue el bug raíz)
assert.match(app, /function floridaTabs\(activeKey\)/);
const floridaTabsBody = app.slice(app.indexOf('function floridaTabs'), app.indexOf('function pkScopedTabs'));
assert.doesNotMatch(floridaTabsBody, /A\.openProject/);

// 5) vPK (Operación) ya no debe usar la barra compartida pkScopedTabs — se quitó a petición
//    explícita del usuario, dejando solo un botón de Historial
const vPKBody = app.slice(app.indexOf('function vPK()'), app.indexOf('function vFlorida()'));
assert.doesNotMatch(vPKBody, /pkScopedTabs\(/);
assert.match(vPKBody, /nav\(\\'prokicksHistorial\\'\)/);

// 6) vPK debe autocorregir un PKTAB obsoleto (el bug original: localStorage con pktab:"florida")
assert.match(vPKBody, /PKTABS\.map\(function\(t\)\{return t\[0\];\}\)\.indexOf\(PKTAB\)<0\)\s*PKTAB='dashboard'/);

// 7) El FAQ de Florida debe seguir presente para Darío
assert.match(app, /floridaFaq: function\(\)/);
assert.match(app, /Guía de Florida · Darío/);

console.log('Session/navigation guard tests: OK');
