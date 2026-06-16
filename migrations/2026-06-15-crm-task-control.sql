-- CRM task-control fields for SM OS.
-- Run this in Supabase SQL editor before using the advanced CRM fields.

alter table public.tareas
  add column if not exists etapa_crm text default 'por_contactar',
  add column if not exists siguiente_accion text,
  add column if not exists fecha_proximo_seguimiento date,
  add column if not exists ultima_actividad timestamptz,
  add column if not exists probabilidad integer,
  add column if not exists monto_estimado numeric(14,2);

alter table public.tareas
  drop constraint if exists tareas_etapa_crm_check,
  add constraint tareas_etapa_crm_check
  check (
    etapa_crm is null or etapa_crm in (
      'por_contactar',
      'contactado',
      'respondio',
      'reunion_agendada',
      'propuesta_enviada',
      'negociacion',
      'aprobado',
      'rechazado',
      'dormido'
    )
  );

alter table public.tareas
  drop constraint if exists tareas_probabilidad_check,
  add constraint tareas_probabilidad_check
  check (probabilidad is null or (probabilidad >= 0 and probabilidad <= 100));

create index if not exists tareas_etapa_crm_idx
  on public.tareas (etapa_crm);

create index if not exists tareas_fecha_proximo_seguimiento_idx
  on public.tareas (fecha_proximo_seguimiento);

create index if not exists tareas_ultima_actividad_idx
  on public.tareas (ultima_actividad);

-- Backfill reasonable defaults for existing tasks.
update public.tareas
set
  etapa_crm = coalesce(etapa_crm, 'por_contactar'),
  ultima_actividad = coalesce(ultima_actividad, created_at)
where etapa_crm is null
   or ultima_actividad is null;
