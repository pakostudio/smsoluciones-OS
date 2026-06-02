create extension if not exists pgcrypto;

drop table if exists public.files cascade;
drop table if exists public.comments cascade;
drop table if exists public.subtasks cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.users cascade;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  pin text not null,
  role text not null default 'colaborador',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text default '',
  status text not null default 'activo',
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text default '',
  owner_id uuid references public.users(id),
  priority text not null default 'media',
  status text not null default 'pendiente',
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  owner_id uuid references public.users(id),
  status text not null default 'pendiente',
  due_date date,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.users(id),
  comment text not null,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.users(id),
  file_name text not null,
  file_url text not null,
  file_type text default '',
  version int not null default 1,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.comments enable row level security;
alter table public.files enable row level security;

create policy "public users read" on public.users for select using (true);
create policy "public users insert" on public.users for insert with check (true);
create policy "public users update" on public.users for update using (true);
create policy "public users delete" on public.users for delete using (true);

create policy "public clients read" on public.clients for select using (true);
create policy "public clients insert" on public.clients for insert with check (true);
create policy "public clients update" on public.clients for update using (true);
create policy "public clients delete" on public.clients for delete using (true);

create policy "public projects read" on public.projects for select using (true);
create policy "public projects insert" on public.projects for insert with check (true);
create policy "public projects update" on public.projects for update using (true);
create policy "public projects delete" on public.projects for delete using (true);

create policy "public tasks read" on public.tasks for select using (true);
create policy "public tasks insert" on public.tasks for insert with check (true);
create policy "public tasks update" on public.tasks for update using (true);
create policy "public tasks delete" on public.tasks for delete using (true);

create policy "public subtasks read" on public.subtasks for select using (true);
create policy "public subtasks insert" on public.subtasks for insert with check (true);
create policy "public subtasks update" on public.subtasks for update using (true);
create policy "public subtasks delete" on public.subtasks for delete using (true);

create policy "public comments read" on public.comments for select using (true);
create policy "public comments insert" on public.comments for insert with check (true);
create policy "public comments update" on public.comments for update using (true);
create policy "public comments delete" on public.comments for delete using (true);

create policy "public files read" on public.files for select using (true);
create policy "public files insert" on public.files for insert with check (true);
create policy "public files update" on public.files for update using (true);
create policy "public files delete" on public.files for delete using (true);

insert into public.users (name, username, pin, role) values
('Pako Ayala', 'pako', '1234', 'admin'),
('Alan', 'alan', '2222', 'responsable'),
('Nalleli', 'nalleli', '3333', 'colaborador'),
('Tere', 'tere', '4444', 'consulta');

insert into public.clients (name, description) values
('MENLUN', 'Consultoría estratégica y marketing anual'),
('LEM', 'La Emoción de la Música'),
('OFUNAM', 'Proyecto cultural musical'),
('PRO KICKS', 'Proyecto deportivo y comercial'),
('GPC', 'Grupo Profesionales en Contabilidad'),
('MAVAS', 'Proyecto operativo y comercial'),
('DX RX VET', 'Diagnóstico por Rayos X Veterinarios');

insert into public.projects (client_id, name, description, status, start_date, due_date)
select id, 'Proyecto General', 'Proyecto base operativo', 'activo', current_date, current_date + interval '30 days'
from public.clients;

insert into public.tasks (client_id, project_id, title, description, owner_id, priority, status, start_date, due_date)
select c.id, p.id, 'Diagnóstico inicial', 'Primera tarea operativa del cliente', u.id, 'alta', 'en_proceso', current_date, current_date + interval '7 days'
from public.clients c
join public.projects p on p.client_id = c.id
join public.users u on u.username = 'pako'
where c.name in ('MENLUN', 'LEM', 'PRO KICKS');
