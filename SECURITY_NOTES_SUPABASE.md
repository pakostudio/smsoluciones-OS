# Notas de seguridad — Supabase

## Estado detectado
Supabase avisó tablas públicas sin RLS:
- public.prokicks_records
- public.prokicks_settings

## Acción inmediata correcta
Activar RLS en esas tablas. No crear políticas abiertas para anon.

## Importante
El front actual usa anon key para consultar Supabase. Si una tabla tiene RLS activado sin políticas, las consultas anónimas pueden dejar de devolver datos. Eso es preferible a exponer datos, pero la fase correcta siguiente es implementar roles reales.

## Siguiente fase recomendada
SM OS 2.5 Seguridad:
- Supabase Auth o capa Edge Functions.
- Roles: admin, coordinador, colaborador, cliente.
- Políticas RLS por tabla.
- Evitar políticas tipo `using (true)` para anon en tablas sensibles.
- Revisar vistas cons_* con Security Definer.
