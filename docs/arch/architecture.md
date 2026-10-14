# Arquitectura de FlowSync

Diagrama de contenedores (nivel 2 de C4) de lo que existe hoy en el repo: un frontend React que se ejecuta en el navegador de la persona usuaria, una API AdonisJS que expone `/api/v1` y una base de datos SQLite en fichero. Dentro de cada contenedor se muestran los componentes que se han verificado leyendo el código; no se dibuja ningún servicio externo porque el código no usa ninguno.

```mermaid
C4Container
    title Contenedores de FlowSync

    Person(user, "Usuario", "Miembro del equipo que gestiona tareas")

    System_Boundary(flowsync, "FlowSync") {
        Container(spa, "Frontend SPA", "React 19, Vite 8, react-router", "Pantallas de login, registro, lista y detalle de tareas, y perfil. Escucha en :5173. Guarda el token en localStorage (flowsync.token)")
        Container(api, "API REST", "AdonisJS 7, VineJS, Lucid", "Expone /api/v1 en :3333. Validadores, controladores y transformers; las respuestas de los controladores pasan por serialize(), que las envuelve en { data }. Autenticación con access tokens opacos")
        ContainerDb(db, "Base de datos", "SQLite (better-sqlite3)", "Fichero tmp/db.sqlite3. Tablas: users, auth_access_tokens, tasks")
    }

    Rel(user, spa, "Usa", "Navegador")
    Rel(spa, api, "Llama vía lib/api.ts", "HTTP/JSON, Authorization: Bearer")
    Rel(api, db, "Lee y escribe", "Lucid ORM")
```

## Componentes de la API

Rutas bajo `/api/v1`. Las de `account` y `tasks` pasan por `middleware.auth()`.

```mermaid
C4Component
    title Componentes de la API REST

    Container(spa, "Frontend SPA", "React", "Cliente de la API")
    ContainerDb(db, "Base de datos", "SQLite", "users, auth_access_tokens, tasks")

    Container_Boundary(api, "API REST") {
        Component(routes, "start/routes.ts", "Router", "auth/signup, auth/login, account/profile, account/logout, tasks (index, store, show), tasks/:id/status, tasks/:id/due-date")
        Component(mw, "Middleware", "AdonisJS", "force_json_response, cors, silent_auth y auth (protege account y tasks)")
        Component(ctrl, "Controladores", "AdonisJS", "NewAccount, AccessTokens, Profile, Tasks, TaskStatuses, TaskDueDates")
        Component(val, "Validadores", "VineJS", "app/validators: user.ts y task.ts")
        Component(tr, "Transformers", "BaseTransformer", "User, Task, TaskDetail, TaskAssignee")
        Component(models, "Modelos", "Lucid", "User (+ access tokens) y Task (belongsTo assignee, isOverdueOn)")
    }

    Rel(spa, routes, "Peticiones HTTP")
    Rel(routes, mw, "Pasa por")
    Rel(mw, ctrl, "Delega en")
    Rel(ctrl, val, "Valida la entrada con")
    Rel(ctrl, models, "Consulta y persiste con")
    Rel(ctrl, tr, "Serializa la salida con")
    Rel(models, db, "Lee y escribe", "SQL")
```

## Componentes del frontend

```mermaid
C4Component
    title Componentes del frontend

    Container(api, "API REST", "AdonisJS", "/api/v1")

    Container_Boundary(spa, "Frontend SPA") {
        Component(routes, "routes/", "react-router", "app-routes con los guards protected-route y public-only-route")
        Component(pages, "pages/", "React", "login, register, tasks, task (detalle) y profile")
        Component(comps, "components/", "React + shadcn/ui", "task-item, task-filter, auth-layout, field-error, full-screen-loader")
        Component(auth, "auth/", "React Context", "auth-provider rehidrata la sesión con GET /account/profile; use-auth, use-auth-form")
        Component(lib, "lib/api.ts", "fetch", "Único punto de contacto con el backend: desenvuelve { data }, adjunta el Bearer y traduce errores a ApiError")
    }

    Rel(routes, pages, "Renderiza")
    Rel(pages, comps, "Usa")
    Rel(pages, auth, "Lee la sesión de")
    Rel(pages, lib, "Llama a")
    Rel(auth, lib, "Llama a")
    Rel(lib, api, "HTTP/JSON")
```
