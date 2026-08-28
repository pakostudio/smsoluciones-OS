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

## 2026-08-28 — Vistas con Security Definer corregidas
El advisor de seguridad marcó 4 vistas en nivel ERROR ("Security Definer View"): `usuarios_publicos`,
`menlun_rh_permisos`, `menlun_rh_retardos`, `menlun_compras_solicitudes`. Corrían con los permisos del
dueño de la vista en vez de los de quien consulta, saltándose el RLS de las tablas subyacentes.

Se corrigió con `alter view ... set (security_invoker = true)` en las 4 — ahora cada vista respeta el RLS
de quien la consulta, igual que si consultara la tabla directamente. No se tocaron datos ni columnas.

## 2026-08-28 — Registro de errores del navegador (client_errors)
Se agregó la tabla `client_errors` para capturar errores reales de JavaScript en producción (antes no
había ninguna forma de enterarnos si algo fallaba para un usuario). Usa las mismas políticas
`sm_current_app_*` con `using(true)` que el resto de las tablas de esta app (consistente con el modelo
actual de acceso por anon key, no más ni menos permisivo). Los mensajes y stacks pasan por
`scrubTelemetry()` antes de guardarse, para no filtrar datos como email, teléfono, PIN o descripciones.
Visible solo para administradores desde Ayuda → "Errores recientes".

Nota pendiente: esta tabla, como el resto del modelo actual, seguirá siendo de acceso amplio (anon) hasta
que se implemente Supabase Auth con roles reales — es la misma limitación estructural señalada arriba,
no una nueva.
