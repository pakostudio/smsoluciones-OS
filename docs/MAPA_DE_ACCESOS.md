# Mapa de accesos — GitHub, Vercel, Supabase

Esta es la referencia rápida de "dónde está cada cosa y por dónde se entra" para SM OS (CRM
principal). Si algo falla, si hay que recuperar un acceso, o si entra alguien nuevo al proyecto,
esta página evita perder tiempo adivinando organizaciones, cuentas o proyectos.

## 1. GitHub — el código

- **Repositorio:** `pakostudio/smsoluciones-OS`
- **URL:** https://github.com/pakostudio/smsoluciones-OS
- **Rama de producción:** `main` — cualquier push a `main` dispara el deploy automático en Vercel.
- **Historial = respaldo:** cada commit queda guardado en el historial de git; no se pierde código
  aunque se borre un archivo, mientras el repositorio exista.

## 2. Vercel — el hosting / deploy

- **Proyecto de producción:** `smsoluciones-os`
- **URL pública:** https://smsoluciones-os.vercel.app
- **Team de Vercel:** `team_vRvY35K3FyduRkBYUYWOdYWW`
- **Conexión con GitHub:** el proyecto está conectado al repo `pakostudio/smsoluciones-OS` — cada
  push a `main` se despliega solo, sin pasos manuales.
- **Nota:** las variables de entorno y el historial de deploys viven únicamente en Vercel — no se
  respaldan solas en ningún otro lado (ver sección 4, Pendientes).

## 3. Supabase — la base de datos

### Organización correcta del CRM: **PAKO**

- **Organization ID:** `cgwecabbbzyienwkrszy`
- **Login:** por GitHub (botón "Continue with GitHub") — **no** es usuario/contraseña ni un correo
  suelto. Hay que entrar con la cuenta de GitHub que tiene acceso a esta organización.
- **Link directo:** https://supabase.com/dashboard/org/cgwecabbbzyienwkrszy

Proyectos dentro de "PAKO":

| Proyecto | Project ref | Estado | Uso |
|---|---|---|---|
| PAKO | `diqbmyqvuyollvlvjniz` | Activo | **CRM principal (SM OS) — este es el que usa la app en producción** |
| Mozart Inteligencia Comercial | `umvjezvmezvqpkyyywgk` | Activo | Base empresarial Mozart (134,440 registros) |
| Gestor de Claves SM | `kdzbenwkupdllrasoayc` | Inactivo | Pausado — revisar si sigue siendo necesario |

**Límite del plan gratis:** 2 proyectos *activos* por organización. "PAKO" ya está en ese límite
(PAKO + Mozart). Para agregar un proyecto activo más ahí mismo hace falta pausar uno existente,
pagar Pro ($25/mes en esa organización), o crear el proyecto nuevo en otra organización gratis.

### Otras organizaciones — NO son el CRM, cuidado al buscar

- **`pako@sportcstudio.com's Org`** (id `xvdzuzuabectfqoppnph`) — login con correo
  `pako@sportcstudio.com`. Contiene `menlun-leads` y un proyecto llamado `smsoluciones-os`
  (id `bljqlibgwvpflrtwgsef`) que, **a pesar del nombre, NO es el CRM principal** — es un proyecto
  distinto ligado a Menlun/Mozart. Fácil de confundir por el nombre; verificar siempre el project
  ref, no solo el nombre.
- **MATCH POINT** (id `ybmpvpdzzblivgdahbdm`) — organización creada para un proyecto nuevo
  (B2B CRM / ERP) que todavía no se ha creado dentro de ella. Vacía por ahora.

## 4. Pendiente — Vercel no está cubierto por el respaldo diario

El respaldo automático diario (10am Ciudad de México) cubre GitHub y Supabase de forma sólida.
Vercel se incluye de forma best-effort porque las herramientas automatizadas para leer sus
proyectos han fallado de forma intermitente. Si algún día hay que reconstruir Vercel desde cero,
lo mínimo que hace falta es: reconectar el repo de GitHub como proyecto nuevo en Vercel, y volver a
cargar a mano las variables de entorno (revisar en el dashboard de Vercel cuáles son antes de que
se pierda ese acceso).

## Resumen — si un día todo se pierde y hay que empezar de cero

1. El código siempre está a salvo en GitHub: `pakostudio/smsoluciones-OS`, rama `main`.
2. Los datos siempre están en Supabase, organización **PAKO** (`cgwecabbbzyienwkrszy`), proyecto
   **PAKO** (`diqbmyqvuyollvlvjniz`) — entra con la cuenta de GitHub correcta.
3. El sitio en producción se reconstruye conectando ese repo de GitHub a un proyecto de Vercel y
   configurando las variables de entorno de Supabase (URL + anon key del proyecto `diqbmyqvuyollvlvjniz`).
