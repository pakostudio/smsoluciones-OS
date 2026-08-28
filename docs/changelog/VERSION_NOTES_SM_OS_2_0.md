# SM OS 2.0 — Control Ejecutivo

## Cambios incluidos

- Centro de mando ejecutivo en dashboard principal.
- Vista de riesgos críticos por tarea, responsable y fecha.
- Próximos vencimientos en tabla ejecutiva.
- Carga de trabajo por responsable.
- Nueva pestaña de Historial por proyecto.
- Bitácora profesional con comentarios, microtareas, entregables y eventos inferidos.
- Edición rápida de tareas desde tablero operativo y vista de tareas.
- Registro automático de cambios relevantes como comentario de sistema:
  - cambio de estado
  - edición rápida
  - actualización desde gestión de tarea
- Historial profesional dentro de la ficha de tarea.

## Nota técnica

Versión incremental sobre SM OS 1.5. No cambia estructura base ni migraciones existentes. Mantiene rutas relativas para GitHub Pages.

## Validación

- `node --check assets/js/app.js` ejecutado correctamente.
- Cambios no destructivos: no elimina tablas ni modifica credenciales.


## Hotfix 2.0.1 — Permisos operativos
- Se corrigió el bloqueo de edición rápida que mostraba “Solo el responsable puede editar esta tarea”.
- Ahora usuarios con acceso al proyecto pueden gestionar tareas del proyecto sin romper la trazabilidad.
- Se mantienen restricciones para usuarios sin acceso al proyecto.
