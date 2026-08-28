# SM OS 2.7.0 — Mapa de Objetivos

## Resultado

Cada proyecto actual y futuro incorpora una vista universal `Objetivos` dentro del Centro de Control.

- Ruta visual: objetivo, KPI/meta, fase, acción, responsable, evidencia y resultado.
- Cobertura y brechas de alineación.
- Avance agregado por objetivo.
- Bloqueos, decisiones y vencimientos visibles por objetivo.
- Matriz completa de trazabilidad.
- Acceso directo a la ficha de cada acción.
- Formulario universal con objetivo, entregable/resultado, KPI y meta.

## Arquitectura

No se duplican tareas ni se crea un sistema paralelo. La vista utiliza las tareas, responsables, fechas, entregables y campos de control ya existentes. Cuando una acción todavía no tiene un objetivo explícito, su fase o área funciona como agrupador; las acciones sin ninguno se muestran como brecha.

No se ampliaron permisos ni políticas de Supabase en este sprint.
