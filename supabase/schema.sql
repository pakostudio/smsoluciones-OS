-- SM OS — Supabase Schema Fase 1
-- Ejecutar en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  pin_hash text not null,
  role text not null check (role in ('admin', 'responsable', 'colaborador', 'consulta')),
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'activo' check (status in ('activo', 'pausado', 'cerrado')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'activo' check (status in ('activo', 'pausado', 'terminado', 'cancelado')),
  start_date date,
  due_date date,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_client_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  access_role text not null default 'colaborador' check (access_role in ('admin', 'responsable', 'colaborador', 'consulta')),
  created_at timestamptz not null default now(),
  unique(user_id, client_id)
);

create table if not exists public.user_project_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  access_role text not null default 'colaborador' check (access_role in ('admin', 'responsable', 'colaborador', 'consulta')),
  created_at timestamptz not null default now(),
  unique(user_id, project_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.users(id),
  priority text not null default 'media' check (priority in ('critica', 'alta', 'media', 'baja')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_proceso', 'en_revision', 'terminada', 'vencida')),
  start_date date,
  due_date date,
  completed_at timestamptz,
  traffic_light text not null default 'verde' check (traffic_light in ('verde', 'amarillo', 'rojo', 'gris')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.users(id),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_proceso', 'en_revision', 'terminada', 'vencida')),
  start_date date,
  due_date date,
  completed_at timestamptz,
  traffic_light text not null default 'verde' check (traffic_light in ('verde', 'amarillo', 'rojo', 'gris')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  subtask_id uuid references public.subtasks(id) on delete cascade,
  user_id uuid not null references public.users(id),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (task_id is not null or subtask_id is not null)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  subtask_id uuid references public.subtasks(id) on delete cascade,
  uploaded_by uuid references public.users(id),
  file_name text not null,
  file_url text not null,
  file_type text,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  subtask_id uuid references public.subtasks(id) on delete cascade,
  type text not null check (type in ('vencimiento_proximo', 'tarea_vencida', 'comentario_nuevo', 'archivo_subido', 'tarea_asignada')),
  message text not null,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- Datos demo: el PIN demo no está cifrado de forma productiva.
-- Para producción: usar Edge Function o backend seguro para hash/validación.
insert into public.users (name, username, pin_hash, role)
values
('Pako Ayala', 'pako', crypt('1234', gen_salt('bf')), 'admin'),
('Alan', 'alan', crypt('2222', gen_salt('bf')), 'responsable'),
('Nalleli', 'nalleli', crypt('3333', gen_salt('bf')), 'colaborador'),
('Tere', 'tere', crypt('4444', gen_salt('bf')), 'consulta')
on conflict (username) do nothing;

insert into public.clients (name, description)
values
('MENLUN', 'Proyecto de consultoría y marketing estratégico'),
('LEM', 'La Emoción de la Música'),
('OFUNAM', 'Proyecto cultural / musical'),
('PRO KICKS', 'Proyecto deportivo y comercial'),
('GPC', 'Grupo Profesionales en Contabilidad'),
('MAVAS', 'Proyecto operativo y comercial'),
('DX RX VET', 'Diagnóstico por Rayos X Veterinarios')
on conflict do nothing;
