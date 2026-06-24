# Deploy checklist — SM OS 2.4 Oficial

## Estructura obligatoria en GitHub
Subir todo el contenido del ZIP a la raíz del repositorio:

- index.html
- assets/css/styles.css
- assets/js/app.js
- assets/sm-logo.png
- docs/Manual_SM_OS.pdf
- migrations/
- scripts/
- supabase/functions/
- tests/
- README.md
- VERSION_NOTES_*.md

## Validación después de subir
1. Abrir GitHub Pages.
2. Recargar con Cmd + Shift + R.
3. Validar sidebar en modo cliente: solo debe mostrar proyecto activo.
4. Validar Centro de mando.
5. Validar Plan de trabajo.
6. Validar Historial.
7. Validar Ayuda / Manual.
8. Crear proyecto temporal con Creación guiada.
9. Confirmar que ProKicks no se rompió.

## Commit sugerido
SM OS 2.4 oficial completo estructura corregida

## Nota importante
Si GitHub descarga un ZIP que solo trae index.html, se está descargando/subiendo el repositorio equivocado o una versión incompleta. La versión oficial debe contener assets, docs, migrations, scripts, tests y version notes.
