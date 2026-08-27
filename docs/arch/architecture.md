# Arquitectura de FlowSync — diagrama de contenedores (C4 nivel 2)

Este diagrama muestra las tres piezas ejecutables de FlowSync y cómo se hablan entre sí: la SPA de React que corre en el navegador, la API de AdonisJS y el fichero SQLite donde vive todo el estado. Dentro de cada contenedor se dibujan solo los bloques que existen hoy en el código (`frontend/src/`, `backend/app/`, `backend/start/`, `backend/database/`), y las flechas entre contenedores llevan el protocolo y las rutas reales declaradas en `backend/start/routes.ts` y consumidas desde `frontend/src/lib/api.ts`. No aparece nada que no se pueda verificar leyendo el repositorio: no hay proxy inverso, ni caché, ni cola, ni servicios externos, y el guard `web` de sesión, aunque está configurado en `config/auth.ts`, no lo usa ninguna ruta, así que tampoco se dibuja.

```mermaid
flowchart LR
    person["<b>Miembro del equipo</b><br/>Persona<br/>Crea tareas, cambia su estado<br/>y su fecha de vencimiento"]

    subgraph spa["SPA FlowSync — React 19 + Vite 8 — navegador, :5173"]
        direction TB
        routes["<b>Rutas y guards</b><br/>react-router<br/>/login /register /tasks<br/>/tasks/:id /profile<br/>ProtectedRoute · PublicOnlyRoute"]
        pages["<b>Pantallas y componentes</b><br/>LoginPage · RegisterPage<br/>TasksPage · TaskPage · ProfilePage<br/>TaskItem · TaskFilter · FieldError"]
        auth["<b>AuthProvider</b><br/>React Context<br/>Rehidrata la sesión contra<br/>GET /account/profile al arrancar"]
        apiclient["<b>lib/api.ts</b><br/>Único punto de contacto con la API<br/>Envuelve fetch, desenvuelve el data,<br/>añade el Bearer y traduce errores<br/>a ApiError con fieldErrors"]
        types["<b>lib/types.ts</b><br/>Tipos espejo de los transformers"]

        routes --> pages
        pages --> auth
        pages --> apiclient
        auth --> apiclient
        apiclient --> types
    end

    storage[("<b>localStorage</b><br/>Navegador<br/>Clave flowsync.token")]

    subgraph api["API FlowSync — AdonisJS 7 + TypeScript — Node, :3333"]
        direction TB
        router["<b>Router y middleware</b><br/>start/routes.ts · start/kernel.ts<br/>force_json_response · CORS · bodyparser<br/>session · shield · silent_auth<br/>middleware.auth sobre /account y /tasks"]
        controllers["<b>Controladores</b><br/>NewAccount · AccessTokens · Profile<br/>Tasks · TaskStatuses · TaskDueDates"]
        validators["<b>Validadores</b><br/>VineJS 4<br/>signup · login · createTask<br/>listTasks · updateTaskStatus<br/>taskReferenceDay · setTaskDueDate"]
        models["<b>Modelos Lucid</b><br/>User con withAuthFinder y accessTokens<br/>Task con belongsTo assignee<br/>e isOverdueOn"]
        transformers["<b>Transformers</b><br/>User · Task · TaskDetail<br/>TaskAssignee"]
        serializer["<b>ApiSerializer</b><br/>providers/api_provider.ts<br/>Inyecta ctx.serialize y envuelve<br/>toda respuesta en data"]
        schema["<b>database/schema.ts</b><br/>Generado desde las migraciones<br/>UserSchema · TaskSchema<br/>AuthAccessTokenSchema"]

        router --> controllers
        controllers --> validators
        controllers --> models
        controllers --> transformers
        transformers --> serializer
        models --> schema
    end

    db[("<b>SQLite</b><br/>better-sqlite3 — backend/tmp/db.sqlite3<br/>Tablas users · tasks · auth_access_tokens")]

    person -->|"Usa el navegador"| spa
    spa -->|"Lee y escribe el token"| storage
    apiclient -->|"JSON sobre HTTP, Bearer token<br/>POST /api/v1/auth/signup · /auth/login<br/>GET /api/v1/account/profile<br/>POST /api/v1/account/logout<br/>GET y POST /api/v1/tasks<br/>GET /api/v1/tasks/:id<br/>PATCH /api/v1/tasks/:id/status<br/>PUT /api/v1/tasks/:id/due-date"| router
    schema -->|"SQL vía Lucid 22 y Knex"| db
    models -->|"Access tokens opacos<br/>DbAccessTokensProvider"| db
```

## Notas de lectura

- **La URL de la API es configurable**: `frontend/src/lib/api.ts` la toma de `VITE_API_URL` y cae a `http://localhost:3333` si no está definida.
- **Autenticación por token de API**: el guard por defecto en `config/auth.ts` es `api` (tokens opacos en `auth_access_tokens`). El navegador guarda ese token en `localStorage` bajo `flowsync.token` y lo manda como `Authorization: Bearer` en cada llamada.
- **El vencimiento se decide en el servidor**: el cliente manda su día local (`today`, `AAAA-MM-DD`) y `Task.isOverdueOn()` resuelve `isOverdue`; el frontend nunca compara fechas.
- **Toda respuesta pasa por un transformer y por `serialize()`**, de modo que el cuerpo siempre llega envuelto en `{ data: ... }`.
- **El esquema no se escribe a mano**: las migraciones de `database/migrations/` generan `database/schema.ts`, y los modelos extienden esas clases.
