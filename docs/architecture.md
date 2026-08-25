# Arquitectura

Diagrama de contenedores (C4 nivel 2) de FlowSync. Muestra las piezas que se
despliegan y se ejecutan por separado —la SPA de React, la API de AdonisJS y el
fichero SQLite— y las llamadas reales que van de una a otra, con los endpoints
tal y como están declarados en `backend/start/routes.ts` y consumidos desde
`frontend/src/lib/api.ts`. Dentro de cada contenedor se anotan los módulos que
existen hoy en el código, no una estructura prevista: si algo no aparece
(caché, colas, servicios externos, un segundo cliente) es porque no está en el
repositorio. El almacenamiento del navegador se dibuja aparte porque es donde
vive el token de sesión entre recargas, y eso condiciona el arranque de la SPA.

```mermaid
flowchart TB
    person(["<b>Miembro del equipo</b><br/><i>[Persona]</i><br/>Crea tareas, cambia su estado<br/>y fija fechas de vencimiento"])

    subgraph flowsync["Sistema: FlowSync"]
        spa["<b>SPA</b><br/><i>[Contenedor: React 19 + Vite 8 · :5173]</i><br/><br/>pages/ · components/ (shadcn/ui + Tailwind v4)<br/>routes/ con guards protected-route y public-only-route<br/>auth/auth-provider (sesión en memoria + rehidratación)<br/>lib/api.ts: único punto de contacto con el backend<br/>(fetch, desenvuelve { data }, traduce errores a ApiError)"]

        storage[("<b>Almacenamiento del navegador</b><br/><i>[Contenedor: localStorage]</i><br/><br/>Clave flowsync.token:<br/>el access token entre recargas")]

        api["<b>API</b><br/><i>[Contenedor: AdonisJS 7 · :3333]</i><br/><br/>start/routes.ts · middleware force_json / cors / silent_auth / auth<br/>controllers: NewAccount, AccessTokens, Profile,<br/>Tasks, TaskStatuses, TaskDueDates<br/>validators (VineJS 4) · transformers (User, Task,<br/>TaskDetail, TaskAssignee) · api_provider: envuelve todo en { data }<br/>models Lucid 22: User (initials, accessTokens), Task (isOverdueOn)"]

        db[("<b>Base de datos</b><br/><i>[Contenedor: SQLite · better-sqlite3]</i><br/>backend/tmp/db.sqlite3<br/><br/>users · auth_access_tokens · tasks<br/>Esquema desde database/migrations,<br/>database/schema.ts autogenerado")]
    end

    person -->|"Usa en el navegador<br/>/login · /register · /tasks · /tasks/:id · /profile<br/>[HTTPS]"| spa

    spa -->|"Guarda y lee el token<br/>[API del navegador]"| storage

    spa -->|"Alta y acceso, sin token<br/>POST /api/v1/auth/signup · POST /api/v1/auth/login<br/>[JSON/HTTP]"| api
    spa -->|"Sesión, con Authorization: Bearer<br/>GET /api/v1/account/profile · POST /api/v1/account/logout<br/>[JSON/HTTP]"| api
    spa -->|"Tareas, con Authorization: Bearer<br/>GET · POST /api/v1/tasks<br/>GET /api/v1/tasks/:id?today=AAAA-MM-DD<br/>PATCH /api/v1/tasks/:id/status<br/>PUT /api/v1/tasks/:id/due-date<br/>[JSON/HTTP]"| api

    api -->|"Consulta y escribe<br/>[Lucid ORM / better-sqlite3]"| db
```

## Notas de lectura

- **La URL de la API es configurable**: la SPA la toma de `VITE_API_URL` y cae
  a `http://localhost:3333` si no está definida (`frontend/src/lib/api.ts`).
- **La autenticación es por access tokens opacos**, no por sesión de navegador.
  El guard por defecto de `backend/config/auth.ts` es `api`
  (`DbAccessTokensProvider` sobre `auth_access_tokens`); el guard `web` está
  configurado pero ninguna ruta lo usa.
- **`silent_auth_middleware` corre en todas las rutas**; la protección efectiva
  la aplica `middleware.auth()` sobre los grupos `account` y `tasks`.
- **Toda respuesta pasa por `serialize()`** (`backend/providers/api_provider.ts`),
  que envuelve el payload en `{ data: ... }`; `lib/api.ts` lo desenvuelve en el
  cliente.
- **El día de referencia viaja del cliente al servidor** (`?today=` y en el
  cuerpo de la fecha de vencimiento): la SPA lo calcula con la hora local del
  navegador y el backend decide con él si una tarea está vencida
  (`Task.isOverdueOn`). No hay reloj de servidor en esa decisión.
- **No hay registro tipado en el camino real**: `backend/.adonisjs/client/registry/`
  (Tuyau) está generado y versionado, pero el frontend no lo consume — solo lo
  usa `backend/tests/bootstrap.ts` para tipar el `apiClient` de Japa.
