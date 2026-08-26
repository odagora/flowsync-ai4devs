# Arquitectura de FlowSync — diagrama de contenedores (C4 nivel 2)

Este diagrama muestra las piezas desplegables de FlowSync y cómo se hablan entre sí: una SPA de React que se sirve con Vite en `localhost:5173`, una API de AdonisJS en `localhost:3333` y el fichero SQLite `backend/tmp/db.sqlite3` al que esa API accede por Lucid. La SPA guarda el access token en `localStorage` y lo manda en cada llamada como `Authorization: Bearer`; todas las rutas cuelgan de `/api/v1` y devuelven el payload envuelto en `{ data }`. Solo aparece lo que está en el código: las rutas de `backend/start/routes.ts`, las tablas creadas por las migraciones y las llamadas que hace `frontend/src/lib/api.ts`, que es el único módulo del frontend que toca la red.

```mermaid
flowchart LR
    user["👤 Miembro del equipo<br/>[Persona]"]

    subgraph browser["Navegador"]
        spa["SPA FlowSync<br/>[React 19 · Vite 8 · react-router · Tailwind v4]<br/>Login, registro, lista de tareas,<br/>detalle de tarea y perfil.<br/>lib/api.ts es el único punto de<br/>contacto con la API."]
        storage[("localStorage<br/>[Almacén del navegador]<br/>clave flowsync.token")]
    end

    subgraph system["Sistema FlowSync"]
        api["API FlowSync<br/>[AdonisJS 7 · TypeScript 6]<br/>Controllers, validators VineJS 4,<br/>transformers y access tokens.<br/>Respuestas envueltas en data<br/>por providers/api_provider.ts."]
        db[("Base de datos<br/>[SQLite · better-sqlite3 · Lucid 22]<br/>tmp/db.sqlite3<br/>tablas: users, auth_access_tokens, tasks")]
    end

    user -->|"Usa · HTTP en :5173"| spa
    spa -->|"Lee y guarda el access token"| storage
    spa -->|"JSON sobre HTTP a VITE_API_URL (:3333)<br/>Authorization: Bearer para las rutas protegidas<br/>POST /api/v1/auth/signup · POST /api/v1/auth/login<br/>GET /api/v1/account/profile · POST /api/v1/account/logout<br/>GET /api/v1/tasks · POST /api/v1/tasks · GET /api/v1/tasks/:id<br/>PATCH /api/v1/tasks/:id/status · PUT /api/v1/tasks/:id/due-date"| api
    api -->|"SQL vía Lucid (Knex): lee y escribe<br/>modelos User y Task, esquema generado<br/>desde las migraciones"| db
```
