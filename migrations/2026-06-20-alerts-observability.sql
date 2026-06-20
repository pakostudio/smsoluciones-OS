-- SM OS: alert preferences, delivery log and privacy-safe product telemetry.
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.usuarios(id) on delete cascade,
  email text,
  email_enabled boolean not null default true,
  browser_enabled boolean not null default true,
  daily_digest boolean not null default true,
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  timezone text not null default 'America/Mexico_City',
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.usuarios(id) on delete cascade,
  task_id uuid references public.tareas(id) on delete cascade,
  alert_key text not null,
  channel text not null check (channel in ('email','browser','in_app')),
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  unique (user_id, alert_key, channel)
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.usuarios(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_created_idx on public.usage_events(created_at desc);
create index if not exists notification_log_user_idx on public.notification_log(user_id, sent_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notification_log enable row level security;
alter table public.usage_events enable row level security;

-- This CRM currently uses its own PIN session over the publishable Supabase key.
-- Match the existing project access model while avoiding update/delete access to audit data.
drop policy if exists "notification_preferences_public_read" on public.notification_preferences;
create policy "notification_preferences_public_read" on public.notification_preferences for select using (true);
drop policy if exists "notification_preferences_public_write" on public.notification_preferences;
create policy "notification_preferences_public_write" on public.notification_preferences for all using (true) with check (true);
drop policy if exists "usage_events_public_insert" on public.usage_events;
create policy "usage_events_public_insert" on public.usage_events for insert with check (true);

-- notification_log is intentionally service-role only. The Edge Function writes it.
-- Configure RESEND_API_KEY, ALERT_FROM_EMAIL and APP_URL as Supabase Edge Function secrets.
