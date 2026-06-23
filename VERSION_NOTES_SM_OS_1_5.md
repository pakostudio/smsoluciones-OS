# SM OS 1.5 — Refactor seguro para GitHub

## Objetivo
Preparar el CRM para crecer sin seguir saturando `index.html`.

## Cambios realizados

- `index.html` reducido de 2,466 líneas a 110 líneas.
- CSS separado en `assets/css/styles.css`.
- JavaScript separado en `assets/js/app.js`.
- Rutas ajustadas para GitHub Pages usando rutas relativas.
- Se mantiene el logo en `assets/sm-logo.png`.
- Se conserva la conexión actual a Supabase.
- Se conserva la integración CDN de Supabase, Lucide y Sentry.
- Se actualizó la prueba estructural para validar el nuevo archivo JS externo.

## Validaciones realizadas

- Sintaxis JavaScript validada con `node --check assets/js/app.js`.
- Prueba estructural ProKicks validada con `node tests/prokicks-plan.test.mjs`.

## Resultado
La app mantiene el mismo funcionamiento, pero ahora está lista para evolucionar por módulos: centro de mando, historial, edición rápida, automatizaciones, carga de trabajo y dashboards ejecutivos.

## Instrucciones para subir a GitHub

1. Descomprimir este ZIP.
2. Subir todos los archivos y carpetas al repositorio.
3. Verificar que GitHub Pages apunte a la rama correcta.
4. Abrir la app y presionar `Recargar app` si el navegador mantiene caché.

## Siguiente fase recomendada
SM OS 2.0: Centro de mando ejecutivo + historial profesional + edición rápida + dependencias + automatizaciones.
