import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../migrations/2026-08-29-montescano-objective-sheet.sql', import.meta.url), 'utf8');
const uxMigration = fs.readFileSync(new URL('../migrations/2026-08-30-montescano-objective-sheet-ux.sql', import.meta.url), 'utf8');

assert.match(app, /isMontescanoObjectiveTask/);
assert.match(app, />Gestionar<\/button>/);
assert.match(app, /Ficha Estratégica del Objetivo/);
assert.match(app, /\['bloqueada','Bloqueada'\]/);
for (const section of ['Objetivo','Medición','Iniciativas','Plan de acción','Avances','Entregables \/ evidencias','Bloqueos \/ riesgos','Decisiones','Próximo paso']) {
  assert.match(app, new RegExp(section));
}
assert.match(app, /strategicObjectiveProgress/);
assert.match(app, /strategicInitiativeProgress/);
assert.match(app, /strategicStages/);
assert.match(app, /newStrategicStage/);
assert.match(app, /Punto de partida/);
assert.match(app, /Qué buscamos lograr/);
assert.match(app, /Qué se logró/);
assert.match(app, /Qué sigue/);
assert.match(app, /En control/);
assert.match(app, /Atención/);
assert.match(app, /En riesgo/);
assert.match(app, /Continuar/);
assert.match(app, /Corregir/);
assert.match(app, /Escalar/);
assert.match(app, /Detener/);
assert.match(app, /OBJ_ADVANCE::/);
assert.match(app, /OBJ_BLOCKER::/);
assert.match(app, /OBJ_DECISION::/);
assert.match(app, /strategicRecords/);
assert.match(css, /\.strategic-sheet/);
assert.match(css, /\.strategic-manage-btn/);
assert.match(css, /\.strategic-section-body/);
assert.match(css, /@media\(max-width:760px\)/);
assert.match(migration, /add column if not exists tipo text/);
assert.match(migration, /add column if not exists parent_id uuid references public\.subtareas/);
assert.doesNotMatch(migration, /\bgrant\b/i);
assert.doesNotMatch(migration, /create policy/i);
assert.doesNotMatch(migration, /\bdelete from\b/i);
assert.doesNotMatch(migration, /\bdrop table\b/i);
assert.match(uxMigration, /tipo in \('accion', 'iniciativa', 'etapa'\)/);
assert.match(uxMigration, /add column if not exists fecha_inicio date/);
assert.match(uxMigration, /add column if not exists entregable_esperado text/);
assert.match(uxMigration, /add column if not exists subtarea_id uuid/);
assert.doesNotMatch(uxMigration, /\bgrant\b/i);
assert.doesNotMatch(uxMigration, /create policy/i);
assert.doesNotMatch(uxMigration, /\bdelete from\b/i);

console.log('MONTESCANO strategic objective sheet tests: OK');
