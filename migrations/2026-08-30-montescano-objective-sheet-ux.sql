-- MONTESCANO: jerarquia practica de objetivo -> iniciativa -> etapa -> tarea.
-- Reutiliza subtareas y entregables; no crea tablas ni modifica registros existentes.

alter table public.subtareas
  add column if not exists fecha_inicio date,
  add column if not exists entregable_esperado text;

alter table public.subtareas
  drop constraint if exists subtareas_tipo_check;

alter table public.subtareas
  add constraint subtareas_tipo_check
  check (tipo in ('accion', 'iniciativa', 'etapa'));

alter table public.entregables
  add column if not exists subtarea_id uuid
  references public.subtareas(id) on delete set null;

create index if not exists idx_subtareas_tarea_tipo_parent
  on public.subtareas (tarea_id, tipo, parent_id);

create index if not exists idx_entregables_subtarea
  on public.entregables (subtarea_id);

comment on column public.subtareas.fecha_inicio is
  'Fecha de inicio de iniciativas y etapas de la ficha estrategica.';
comment on column public.subtareas.entregable_esperado is
  'Resultado concreto esperado de una etapa.';
comment on column public.entregables.subtarea_id is
  'Iniciativa o etapa a la que pertenece el entregable o evidencia.';
