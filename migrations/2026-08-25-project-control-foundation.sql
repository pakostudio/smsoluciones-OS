-- Sprint 1: base universal del Centro de Control del Proyecto.
-- Esta migracion es aditiva e idempotente: no elimina ni renombra datos existentes.

alter table public.proyectos
  add column if not exists control_habilitado boolean not null default true,
  add column if not exists control_plantilla text not null default 'estandar',
  add column if not exists control_salud text not null default 'en_control',
  add column if not exists control_visibilidad_cliente jsonb not null default jsonb_build_object(
    'resumen', true,
    'tareas', true,
    'hitos', true,
    'kpis', true,
    'bloqueos', true,
    'decisiones', true,
    'evidencias', false,
    'comentarios', false
  ),
  add column if not exists control_configuracion jsonb not null default '{}'::jsonb;

alter table public.proyectos
  drop constraint if exists proyectos_control_salud_check,
  add constraint proyectos_control_salud_check
  check (control_salud in ('en_control', 'en_riesgo', 'bloqueado', 'completado'));

create table if not exists public.control_areas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null,
  descripcion text,
  color text,
  orden integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proyecto_id, nombre)
);

create table if not exists public.control_hitos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  area_id uuid references public.control_areas(id) on delete set null,
  owner_id uuid references public.usuarios(id) on delete set null,
  titulo text not null,
  descripcion text,
  estado text not null default 'no_iniciado',
  avance smallint not null default 0,
  fecha_inicio date,
  fecha_vencimiento date,
  fecha_completado date,
  visible_cliente boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_hitos_estado_check
    check (estado in ('no_iniciado', 'en_curso', 'bloqueado', 'completado', 'cancelado')),
  constraint control_hitos_avance_check check (avance between 0 and 100)
);

alter table public.tareas
  add column if not exists control_area_id uuid references public.control_areas(id) on delete set null,
  add column if not exists control_hito_id uuid references public.control_hitos(id) on delete set null,
  add column if not exists control_avance smallint not null default 0,
  add column if not exists control_visible_cliente boolean not null default true,
  add column if not exists control_orden integer not null default 0;

alter table public.tareas
  drop constraint if exists tareas_control_avance_check,
  add constraint tareas_control_avance_check check (control_avance between 0 and 100);

create table if not exists public.control_kpis (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  area_id uuid references public.control_areas(id) on delete set null,
  nombre text not null,
  descripcion text,
  unidad text,
  valor_objetivo numeric,
  valor_actual numeric,
  estado text not null default 'en_control',
  visible_cliente boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_kpis_estado_check
    check (estado in ('en_control', 'en_riesgo', 'fuera_objetivo', 'completado'))
);

create table if not exists public.control_bloqueos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  tarea_id uuid references public.tareas(id) on delete set null,
  owner_id uuid references public.usuarios(id) on delete set null,
  titulo text not null,
  descripcion text,
  severidad text not null default 'media',
  estado text not null default 'abierto',
  fecha_limite date,
  fecha_resuelto timestamptz,
  visible_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_bloqueos_severidad_check
    check (severidad in ('baja', 'media', 'alta', 'critica')),
  constraint control_bloqueos_estado_check
    check (estado in ('abierto', 'en_atencion', 'resuelto', 'cancelado'))
);

create table if not exists public.control_decisiones (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  tarea_id uuid references public.tareas(id) on delete set null,
  owner_id uuid references public.usuarios(id) on delete set null,
  titulo text not null,
  descripcion text,
  decision text,
  estado text not null default 'pendiente',
  fecha_limite date,
  fecha_decidido timestamptz,
  visible_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_decisiones_estado_check
    check (estado in ('pendiente', 'aprobada', 'rechazada', 'cancelada'))
);

create table if not exists public.control_actualizaciones (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  salud text not null default 'en_control',
  avance smallint not null default 0,
  resumen text,
  visible_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  constraint control_actualizaciones_salud_check
    check (salud in ('en_control', 'en_riesgo', 'bloqueado', 'completado')),
  constraint control_actualizaciones_avance_check check (avance between 0 and 100)
);

create index if not exists control_areas_proyecto_orden_idx
  on public.control_areas (proyecto_id, orden);
create index if not exists control_hitos_proyecto_estado_idx
  on public.control_hitos (proyecto_id, estado, fecha_vencimiento);
create index if not exists control_kpis_proyecto_estado_idx
  on public.control_kpis (proyecto_id, estado);
create index if not exists control_bloqueos_proyecto_estado_idx
  on public.control_bloqueos (proyecto_id, estado, severidad);
create index if not exists control_decisiones_proyecto_estado_idx
  on public.control_decisiones (proyecto_id, estado, fecha_limite);
create index if not exists control_actualizaciones_proyecto_fecha_idx
  on public.control_actualizaciones (proyecto_id, created_at desc);
create index if not exists tareas_control_area_idx
  on public.tareas (proyecto_id, control_area_id);
create index if not exists tareas_control_hito_idx
  on public.tareas (proyecto_id, control_hito_id);

-- Las tablas nuevas permanecen cerradas al cliente anonimo durante Sprint 1.
-- Se habilitaran mediante Supabase Auth + RLS por proyecto antes del portal cliente.
alter table public.control_areas enable row level security;
alter table public.control_hitos enable row level security;
alter table public.control_kpis enable row level security;
alter table public.control_bloqueos enable row level security;
alter table public.control_decisiones enable row level security;
alter table public.control_actualizaciones enable row level security;

revoke all on table public.control_areas from anon, authenticated;
revoke all on table public.control_hitos from anon, authenticated;
revoke all on table public.control_kpis from anon, authenticated;
revoke all on table public.control_bloqueos from anon, authenticated;
revoke all on table public.control_decisiones from anon, authenticated;
revoke all on table public.control_actualizaciones from anon, authenticated;

grant select, insert, update, delete on table public.control_areas to service_role;
grant select, insert, update, delete on table public.control_hitos to service_role;
grant select, insert, update, delete on table public.control_kpis to service_role;
grant select, insert, update, delete on table public.control_bloqueos to service_role;
grant select, insert, update, delete on table public.control_decisiones to service_role;
grant select, insert, update, delete on table public.control_actualizaciones to service_role;

comment on column public.proyectos.control_habilitado is
  'Activa la capa universal Centro de Control del Proyecto.';
comment on column public.proyectos.control_plantilla is
  'Plantilla funcional; nunca identifica codigo exclusivo de un cliente.';
comment on table public.control_hitos is
  'Hitos universales del Centro de Control, siempre aislados por proyecto_id.';
comment on table public.control_kpis is
  'Indicadores universales del Centro de Control, siempre aislados por proyecto_id.';
comment on table public.control_bloqueos is
  'Bloqueos universales del Centro de Control, siempre aislados por proyecto_id.';
comment on table public.control_decisiones is
  'Decisiones requeridas del Centro de Control, siempre aisladas por proyecto_id.';

