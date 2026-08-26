-- Sprint 2: campos ejecutivos universales sobre las tareas existentes.
-- Aditiva e idempotente; no duplica tareas ni modifica las vistas actuales.

alter table public.tareas
  add column if not exists control_bloqueado boolean not null default false,
  add column if not exists control_bloqueo_resumen text,
  add column if not exists control_decision_requerida boolean not null default false,
  add column if not exists control_decision_resumen text,
  add column if not exists control_fecha_decision date;

create index if not exists tareas_control_foco_idx
  on public.tareas (proyecto_id, control_bloqueado, control_decision_requerida);

comment on column public.tareas.control_bloqueado is
  'Indica si la accion esta detenida por un bloqueo operativo.';
comment on column public.tareas.control_bloqueo_resumen is
  'Resumen ejecutivo del bloqueo activo.';
comment on column public.tareas.control_decision_requerida is
  'Indica si la accion necesita una decision para avanzar.';
comment on column public.tareas.control_decision_resumen is
  'Decision concreta requerida para destrabar o continuar la accion.';
comment on column public.tareas.control_fecha_decision is
  'Fecha limite esperada para tomar la decision.';
