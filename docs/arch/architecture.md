# Arquitectura de FlowSync

Diagrama de contenedores (C4, nivel 2) de FlowSync tal como está hoy en el código: la SPA de React (`frontend/`, puerto 5173), la API de AdonisJS (`backend/`, puerto 3333, con la API bajo `/api/v1` y su documento OpenAPI en `/api`, `/api.json` y `/api.yaml`) y el fichero SQLite `backend/tmp/db.sqlite3`. La SPA y la API se muestran abiertas por capas para seguir el camino de una petición: en el navegador, todo sale por `lib/api.ts` con el token opaco que `AuthProvider` guarda en `localStorage`; en el servidor, rutas → controladores → validadores, modelos Lucid y transformers, que con `serialize()` envuelven la respuesta en `{ data }`. El guard `web` de sesión está configurado pero ninguna ruta lo usa, así que no aparece.

```mermaid
C4Container
  title FlowSync: diagrama de contenedores

  Person(member, "Miembro del equipo", "Se registra, inicia sesión y gestiona las tareas del espacio")

  System_Boundary(flowsync, "FlowSync") {

    Container_Boundary(spa, "SPA web (frontend/)") {
      Component(pages, "Páginas y guards", "React 19, react-router", "login, register, tasks, tasks/:id, profile; ProtectedRoute y PublicOnlyRoute")
      Component(authProvider, "AuthProvider", "React context", "Guarda la sesión y la rehidrata con GET /account/profile al arrancar")
      Component(apiClient, "lib/api.ts", "fetch", "Único punto de contacto con la API: desenvuelve { data }, adjunta el Bearer y traduce errores a ApiError")
    }

    ContainerDb(browserStorage, "localStorage", "Web Storage del navegador", "Clave flowsync.token")

    Container_Boundary(api, "API REST (backend/)") {
      Component(routes, "Rutas y middleware", "AdonisJS 7, start/routes.ts y start/kernel.ts", "/api/v1/auth, /account y /tasks; auth() protege /account y /tasks; /api, /api.json y /api.yaml sirven el documento OpenAPI, sin sesión; fuerza JSON y CORS")
      Component(validators, "Validadores", "VineJS 4, app/validators/", "user.ts: signup y login; task.ts: crear, listar, estado, día de referencia y vencimiento")
      Component(controllers, "Controladores", "app/controllers/", "NewAccount, AccessTokens, Profile, Tasks, TaskStatuses, TaskDueDates")
      Component(transformers, "Transformers y serialize()", "app/transformers/ y providers/api_provider.ts", "User, Task, TaskDetail y TaskAssignee; la respuesta sale envuelta en { data }")
      Component(models, "Modelos", "Lucid 22, app/models/", "User con access tokens; Task belongsTo User como assignee")
    }

    ContainerDb(db, "Base de datos", "SQLite, better-sqlite3", "tmp/db.sqlite3: users, auth_access_tokens y tasks")
  }

  Rel(member, pages, "Usa", "Navegador, HTTP :5173")
  Rel(pages, authProvider, "Lee la sesión", "useAuth()")
  Rel(pages, apiClient, "Pide y modifica tareas")
  Rel(authProvider, apiClient, "signup, login, logout y perfil")
  Rel(authProvider, browserStorage, "Lee y escribe el token")
  Rel(apiClient, routes, "Llama a /api/v1", "JSON sobre HTTP :3333, Bearer")
  Rel(routes, models, "Comprueba el token", "guard api")
  Rel(routes, controllers, "Despacha")
  Rel(controllers, validators, "Valida la entrada", "request.validateUsing()")
  Rel(controllers, models, "Lee y escribe")
  Rel(controllers, transformers, "Da forma a la respuesta")
  Rel(models, db, "Consulta", "Lucid")
```
