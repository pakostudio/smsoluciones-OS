# Centro de Control del Proyecto — Sprint 2

## Resultado

Se agregó un tablero universal de ejecución para todos los proyectos actuales y futuros. No crea un sistema paralelo: utiliza las tareas, responsables, fechas y comentarios existentes.

## Nueva vista

- Pestaña `Ejecución` en cada proyecto.
- Resumen de avance, acciones, bloqueos y decisiones.
- Filtros visibles por estado, responsable, área/frente y foco.
- Acciones con avance de 0 a 100, estado, fecha, responsable, bloqueo, decisión y visibilidad cliente.
- Formulario compacto `Actualizar ejecución`.
- Diseño responsive sin tabla horizontal fija.
- Estado vacío con acceso a `+ Primera acción`.

## Compatibilidad

Se conservan Centro de Control, Plan de trabajo/Grupos y registros/Tablero operativo, Reporte, Historial, Kanban, Calendario, Gantt, Pipeline y la operación especial de ProKicks.

MONTESCANO valida la plantilla universal sin tareas inventadas.

## Datos

La migración es aditiva e idempotente. Agrega a `tareas` los indicadores ejecutivos necesarios para que la interfaz actual pueda operar sin abrir las tablas protegidas del portal cliente.

Las tablas especializadas de áreas, hitos, KPIs, bloqueos, decisiones y actualizaciones continúan cerradas mediante RLS hasta la fase de autenticación y portal.
