import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../migrations/2026-08-25-project-control-foundation.sql', import.meta.url),
  'utf8'
);

for (const table of [
  'control_areas',
  'control_hitos',
  'control_kpis',
  'control_bloqueos',
  'control_decisiones',
  'control_actualizaciones'
]) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
}

assert.match(migration, /control_habilitado boolean not null default true/);
assert.match(migration, /control_plantilla text not null default 'estandar'/);
assert.match(migration, /proyecto_id uuid not null references public\.proyectos\(id\) on delete cascade/g);
assert.match(migration, /control_avance smallint not null default 0/);
assert.match(migration, /check \(control_avance between 0 and 100\)/);
assert.match(migration, /control_visible_cliente boolean not null default true/);

assert.doesNotMatch(migration, /\bdelete from\b/i);
assert.doesNotMatch(migration, /\bdrop table\b/i);
assert.doesNotMatch(migration, /security definer/i);

console.log('Project Control Sprint 1 structural tests: OK');

