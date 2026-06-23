# SM OS 2.0.2 — Hotfix permisos edición rápida

## Corrección aplicada

- Se eliminó el bloqueo que impedía editar tareas cuando el usuario operativo no coincidía exactamente con el responsable asignado.
- Ahora cualquier usuario autenticado que ya puede ver la tarea puede usar **Editar rápido**, **Gestionar** y actualizar registros operativos.
- Se actualizó el cache-buster de `app.js` y `styles.css` a `v=2.0.2` para forzar a GitHub Pages / navegador a cargar la versión nueva.

## Motivo

El hotfix anterior corrigió la lógica parcialmente, pero podía seguir fallando por una función de visibilidad o por caché del navegador. Esta versión simplifica la regla para la etapa actual del CRM: si el usuario ya accedió al sistema y ve la tarea, puede editarla.

## Validación

- Sintaxis JavaScript validada.
- Cambio no destructivo sobre la base SM OS 2.0.
