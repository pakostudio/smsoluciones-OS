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

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy "users all" on public.users for all using (true) with check (true);
create policy "clients all" on public.clients for all using (true) with check (true);
create policy "projects all" on public.projects for all using (true) with check (true);
create policy "tasks all" on public.tasks for all using (true) with check (true);

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
