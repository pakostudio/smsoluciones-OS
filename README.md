# SM OS

Versión actual: **2.7.0** — Centro de Control con Mapa de Objetivos y trazabilidad universal.

## Centro de Control del Proyecto

- Sprint 1: base universal, MONTESCANO y modelo protegido en Supabase.
- Sprint 2: tablero de ejecución responsive para todos los proyectos, con avance, bloqueos, decisiones y visibilidad cliente.
- Sprint 3: dashboard visual con avance real vs. planeado, estados, carga, fases, hitos y focos ejecutivos.

CRM ligero para SM Soluciones. Funciona como app estática en GitHub Pages y usa Supabase como base de datos.

## Antes de hacer push (obligatorio)

Corre siempre este comando antes de subir un cambio a `main` (que despliega directo a producción en Vercel):

```bash
node tests/run-all.mjs
```

Revisa la sintaxis de `assets/js/app.js` y corre TODOS los tests de `tests/*.test.mjs` de un jalón. Si algo truena, el comando termina con código de error y una lista de qué falló — no se hace push hasta que quede todo en verde. Cuando se agregue o cambie una función importante (navegación, permisos, un módulo nuevo), conviene sumar un `tests/*.test.mjs` que verifique que sigue ahí, así una regresión futura se detecta sola en vez de descubrirse en producción.

## Documentación

- `README.md` — este archivo, la referencia general.
- `CHANGELOG.md` — índice cronológico de todas las versiones (el detalle de cada una vive en `docs/changelog/`).
- `docs/SECURITY_NOTES_SUPABASE.md` — hallazgos y decisiones de seguridad en Supabase.
- `docs/DEPLOY_CHECKLIST.md` — checklist manual de validación post-deploy.
- `docs/MAPA_DE_ACCESOS.md` — dónde está todo (GitHub, Vercel, Supabase): organizaciones, proyectos, cómo entrar. Revisar primero ante cualquier problema de acceso.

## Archivos necesarios

- index.html
- assets/css/styles.css
- assets/js/app.js
- assets/sm-logo.png
- README.md

## Backend

El frontend se conecta a Supabase desde `assets/js/app.js`; `index.html` conserva la estructura base, los CDN y la carga de estilos/scripts. Las tablas principales son:

- usuarios
- clientes
- proyectos
- tareas
- subtareas
- comentarios
- entregables
- pagos
- reuniones
- notification_preferences
- notification_log
- usage_events

## Migraciones

Para activar el control CRM avanzado en tareas, ejecuta en Supabase SQL Editor:

`migrations/2026-06-15-crm-task-control.sql`

Esto agrega etapa CRM, siguiente acción, próximo seguimiento, última actividad, probabilidad y monto estimado.

Ejecuta después:

`migrations/2026-06-20-alerts-observability.sql`

Esta migración agrega preferencias de notificación por usuario, deduplicación de envíos y analítica interna sin contenido sensible.

## Alertas y observabilidad

El CRM muestra alertas internas, permite notificaciones del navegador mientras está abierto y genera enlaces para Google Calendar sin instalar aplicaciones.

El correo automático vive en `supabase/functions/process-alerts/index.ts`. Para activarlo hay que desplegar la función y configurar estos secretos en Supabase:

- `RESEND_API_KEY`
- `ALERT_FROM_EMAIL`
- `APP_URL`

Sentry está integrado sin grabación de sesiones y con filtrado de datos sensibles. Se activa mediante `window.SM_CONFIG.sentryDsn` en el despliegue; Mixpanel queda preparado pero inactivo hasta definir `window.SM_CONFIG.mixpanelToken`.

## Plan de trabajo ProKicks

El proyecto ProKicks incluye un tablero operativo con tres frentes: Indoor Community, Comunidad ProKicks y Redes sociales. Cada tarea permite asignar un responsable interno y colaboradores sin crear cuentas de acceso, registrar avances, administrar microtareas y calcular automáticamente el porcentaje completado.

El semáforo utiliza vencimientos, próximo seguimiento, siguiente acción y días sin actividad. El botón **Crear plan de trabajo ProKicks** instala las tareas y microtareas base de forma idempotente desde la interfaz.

### Florida · Darío

La operación ProKicks incorpora un pipeline específico para Florida sobre los mismos registros de prospectos. La vista muestra cobertura regional, embudo comercial, visitas, potencial, contactos faltantes y permite registrar el siguiente avance sin crear un CRM paralelo. Darío Sala se maneja como responsable operativo; esa asignación no concede acceso automáticamente.

La importación idempotente de las 79 instalaciones se prepara y ejecuta con:

```bash
node scripts/import-prokicks-florida-2026-08-26.mjs
node scripts/import-prokicks-florida-2026-08-26.mjs --apply
```

Prueba estructural:

`node tests/prokicks-plan.test.mjs`

## Centro de Control del Proyecto

La migracion `migrations/2026-08-25-project-control-foundation.sql` agrega la base universal y replicable del Centro de Control. Todos los proyectos actuales y futuros heredan la capacidad sin duplicar tareas ni perder sus vistas existentes.

Incluye areas, hitos, avance, KPIs, bloqueos, decisiones y actualizaciones ejecutivas, siempre vinculados por `proyecto_id`. Las nuevas tablas permanecen cerradas al acceso anonimo hasta implementar Supabase Auth y politicas RLS por proyecto.

Prueba estructural:

`node tests/project-control-sprint1.test.mjs`

## Login

El login actual usa usuarios y PIN dentro de la tabla `usuarios`. Sirve para operación interna controlada, pero antes de producción conviene migrar a Supabase Auth y políticas RLS estrictas.


## SM OS 1.5

La app fue refactorizada para GitHub Pages: `index.html` quedó como estructura base, los estilos viven en `assets/css/styles.css` y la lógica principal en `assets/js/app.js`. Esto permite seguir creciendo sin saturar un solo archivo.


## SM OS 2.3.2
Ajuste visual premium: reemplazo de fondo beige por gris-azul claro y mejora de contraste general.
