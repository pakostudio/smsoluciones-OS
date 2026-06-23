# SM OS

CRM ligero para SM Soluciones. Funciona como app estática en GitHub Pages y usa Supabase como base de datos.

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

Prueba estructural:

`node tests/prokicks-plan.test.mjs`

## Login

El login actual usa usuarios y PIN dentro de la tabla `usuarios`. Sirve para operación interna controlada, pero antes de producción conviene migrar a Supabase Auth y políticas RLS estrictas.


## SM OS 1.5

La app fue refactorizada para GitHub Pages: `index.html` quedó como estructura base, los estilos viven en `assets/css/styles.css` y la lógica principal en `assets/js/app.js`. Esto permite seguir creciendo sin saturar un solo archivo.


## SM OS 2.3.2
Ajuste visual premium: reemplazo de fondo beige por gris-azul claro y mejora de contraste general.
