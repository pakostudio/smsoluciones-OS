-- Ficha Estrategica del Objetivo para MONTESCANO.
-- Cambio aditivo: reutiliza tareas, subtareas, comentarios, entregables,
-- control_bloqueos y control_decisiones sin alterar registros existentes.

alter table public.subtareas
  add column if not exists tipo text not null default 'accion',
  add column if not exists parent_id uuid references public.subtareas(id) on delete cascade,
  add column if not exists descripcion text,
  add column if not exists siguiente_accion text;

alter table public.subtareas
  drop constraint if exists subtareas_tipo_check,
  add constraint subtareas_tipo_check check (tipo in ('accion', 'iniciativa'));

create index if not exists subtareas_parent_id_idx
  on public.subtareas (parent_id, fecha_vencimiento);
create index if not exists subtareas_tarea_tipo_idx
  on public.subtareas (tarea_id, tipo, fecha_vencimiento);

comment on column public.subtareas.tipo is
  'Distingue iniciativas estrategicas de acciones operativas.';
comment on column public.subtareas.parent_id is
  'Relaciona una accion con su iniciativa dentro del mismo objetivo.';
