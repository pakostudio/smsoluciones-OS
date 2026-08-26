# Centro de Control del Proyecto — Sprint 1

## Regla de arquitectura

El Centro de Control es una capacidad universal de `proyectos`.

- No existe codigo exclusivo para ProKicks, MONTESCANO, CIME, PINK LOVE u otro cliente.
- Todo proyecto existente queda habilitado mediante valores predeterminados aditivos.
- Todo proyecto futuro hereda la misma capacidad al insertarse en `proyectos`.
- Toda entidad nueva se relaciona por `proyecto_id` y se elimina en cascada solamente cuando se elimina el proyecto padre.
- Las tareas, subtareas, comentarios, entregables, reportes, Kanban, calendario, Gantt y pipeline actuales permanecen intactos.

## Base incorporada

- Configuracion y visibilidad por proyecto.
- Areas o categorias operativas.
- Hitos.
- Avance porcentual por tarea.
- KPIs.
- Bloqueos.
- Decisiones requeridas.
- Actualizaciones ejecutivas periodicas.
- Campos de visibilidad para el futuro portal del cliente.

## Seguridad de esta fase

Las nuevas tablas tienen RLS activo y no conceden acceso a `anon` ni a `authenticated` durante este sprint. Antes de exponerlas en la interfaz se implementaran Supabase Auth y politicas por proyecto. Esto evita ampliar la superficie publica del CRM actual.

## Proyecto de validacion

MONTESCANO se crea como cliente y proyecto activo con la descripcion `Fabrica de relojes`. Debe conservar todas las vistas actuales del CRM y heredar automaticamente `control_habilitado = true` y `control_plantilla = estandar`.

