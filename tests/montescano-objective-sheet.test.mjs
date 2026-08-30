import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../migrations/2026-08-29-montescano-objective-sheet.sql', import.meta.url), 'utf8');

assert.match(app, /isMontescanoObjectiveTask/);
assert.match(app, />Gestionar<\/button>/);
assert.match(app, /Ficha Estratégica del Objetivo/);
assert.match(app, /\['bloqueada','Bloqueada'\]/);
for (const section of ['Objetivo','Medición','Iniciativas','Plan de acción','Avances','Entregables \/ evidencias','Bloqueos \/ riesgos','Decisiones','Próximo paso']) {
  assert.match(app, new RegExp(section));
}
assert.match(app, /strategicObjectiveProgress/);
assert.match(app, /strategicInitiativeProgress/);
assert.match(app, /OBJ_ADVANCE::/);
assert.match(app, /OBJ_BLOCKER::/);
assert.match(app, /OBJ_DECISION::/);
assert.match(app, /strategicRecords/);
assert.match(css, /\.strategic-sheet/);
assert.match(css, /\.strategic-manage-btn/);
assert.match(migration, /add column if not exists tipo text/);
assert.match(migration, /add column if not exists parent_id uuid references public\.subtareas/);
assert.doesNotMatch(migration, /\bgrant\b/i);
assert.doesNotMatch(migration, /create policy/i);
assert.doesNotMatch(migration, /\bdelete from\b/i);
assert.doesNotMatch(migration, /\bdrop table\b/i);

console.log('MONTESCANO strategic objective sheet tests: OK');
