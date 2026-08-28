// Blinda el registro de errores del navegador hacia Supabase (sin depender de un servicio externo).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

assert.match(app, /function logClientError\(message,stack\)/);
assert.match(app, /window\.addEventListener\('error',/);
assert.match(app, /window\.addEventListener\('unhandledrejection',/);
assert.match(app, /sb\.from\('client_errors'\)\.insert/);
assert.match(app, /CLIENT_ERROR_COUNT>=8/); // límite anti-saturación
assert.match(app, /showClientErrors: async function/);
assert.match(app, /if\(!adm\(\)\)\{ toast\('Solo administradores','r'\); return; \}/);

console.log('Error monitoring tests: OK');
