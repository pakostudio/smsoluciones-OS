# SM OS

CRM ligero para SM Soluciones. Funciona como app estática en GitHub Pages y usa Supabase como base de datos.

## Archivos necesarios

- index.html
- assets/sm-logo.png
- README.md

## Backend

El frontend se conecta a Supabase desde `index.html`. Las tablas principales son:

- usuarios
- clientes
- proyectos
- tareas
- subtareas
- comentarios
- entregables
- pagos
- reuniones

## Migraciones

Para activar el control CRM avanzado en tareas, ejecuta en Supabase SQL Editor:

`migrations/2026-06-15-crm-task-control.sql`

Esto agrega etapa CRM, siguiente acción, próximo seguimiento, última actividad, probabilidad y monto estimado.

## Login

El login actual usa usuarios y PIN dentro de la tabla `usuarios`. Sirve para operación interna controlada, pero antes de producción conviene migrar a Supabase Auth y políticas RLS estrictas.
