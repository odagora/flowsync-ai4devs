# Capability `tasks`

La lista de trabajo del equipo: **una sola lista compartida** con las tareas del espacio, donde apuntar algo cuesta escribir un título y donde el responsable y el estado de cada tarea se leen sin abrir nada. Es lo que permite responder «¿en qué anda cada uno?» sin preguntar a nadie.

Alrededor de esa lista hay tres cosas más: los **tres estados fijos** por los que pasa una tarea, un **filtro por estado** que es una lente personal sobre la única lista, y una **fecha de vencimiento opcional** que solo se ve al abrir una tarea.

> **Las reglas de negocio no están aquí.** Están en [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md) — 32 requisitos y 124 scenarios. Este README dice **dónde vive cada cosa** y **cómo se prueba**; cuando hace falta enunciar una regla, enlaza al requisito que la enuncia en vez de repetirla.

## Dónde vive

### Backend (`backend/`)

| Fichero | Qué es |
|---|---|
| [`start/routes.ts`](../../../backend/start/routes.ts) | Las cinco rutas, bajo `/api/v1/tasks` y con `middleware.auth()` sobre el grupo |
| [`app/controllers/tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts) | Listar, crear y consultar una tarea suelta |
| [`app/controllers/task_statuses_controller.ts`](../../../backend/app/controllers/task_statuses_controller.ts) | Cambiar el estado. Endpoint propio para que por él no se cuelen el título ni el responsable |
| [`app/controllers/task_due_dates_controller.ts`](../../../backend/app/controllers/task_due_dates_controller.ts) | Fijar, cambiar y retirar la fecha: las tres son la misma operación |
| [`app/models/task.ts`](../../../backend/app/models/task.ts) | El modelo, `TASK_STATUSES`, `DEFAULT_LIST_STATUSES` y `isOverdueOn()` |
| [`app/validators/task.ts`](../../../backend/app/validators/task.ts) | Lo que se acepta de cada petición (VineJS 4) |
| [`app/transformers/`](../../../backend/app/transformers/) | Lo que sale por el cable: `task_transformer` (lista), `task_detail_transformer` (tarea suelta), `task_assignee_transformer` (responsable) |
| [`app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts) | El espejo de esos transformers para el documento OpenAPI |
| `database/migrations/*_tasks_table.ts` | La tabla `tasks` y su columna `due_date` |

La columna `status` se estrecha al tipo del dominio desde [`database/schema_rules.ts`](../../../backend/database/schema_rules.ts); `database/schema.ts` se genera y no se edita.

### Frontend (`frontend/`)

| Fichero | Qué es |
|---|---|
| [`src/pages/tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx) | La pantalla de la lista, en `/tasks` |
| [`src/pages/task-page.tsx`](../../../frontend/src/pages/task-page.tsx) | La pantalla de una tarea, en `/tasks/:id` |
| [`src/components/task-item.tsx`](../../../frontend/src/components/task-item.tsx) | La fila: título, responsable, estado y cambio de estado sin abrir nada |
| [`src/components/task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) | El control para acotar por estado, con la vista por defecto como primera opción |
| [`src/lib/api.ts`](../../../frontend/src/lib/api.ts) | Único punto de contacto con la API: `listTasks`, `createTask`, `getTask`, `setTaskDueDate`, `updateTaskStatus` |
| [`src/lib/types.ts`](../../../frontend/src/lib/types.ts) | Espejo en TypeScript de lo que devuelve la API |

Ambas rutas cuelgan de `ProtectedRoute` en [`src/routes/app-routes.tsx`](../../../frontend/src/routes/app-routes.tsx), y `/tasks` es el destino por defecto de la aplicación.

## Endpoints

Las cinco exigen `Authorization: Bearer <token>` y responden `401` sin él. Toda respuesta con éxito viaja envuelta en `{ "data": ... }`; los errores, en `{ "errors": [...] }`.

| Método y ruta | Qué hace | Códigos |
|---|---|---|
| `GET /api/v1/tasks` | La lista del espacio. `?status=` la acota a un estado; sin él llegan las pendientes y las que están en curso | `200` `401` `422` |
| `POST /api/v1/tasks` | Crea una tarea. Solo se lee el `title` | `201` `401` `422` |
| `GET /api/v1/tasks/:id` | Una tarea con su fecha y su condición de vencida. Exige `?today=AAAA-MM-DD` | `200` `401` `404` `422` |
| `PATCH /api/v1/tasks/:id/status` | Cambia el estado | `200` `401` `404` `422` |
| `PUT /api/v1/tasks/:id/due-date` | Fija, cambia o retira la fecha. `"dueDate": null` la retira | `200` `401` `404` `422` |

**El contrato completo** —parámetros, cuerpos, esquemas de respuesta y qué significa cada código— se publica como documento OpenAPI y se navega con el servidor arrancado:

- Interfaz: <http://localhost:3333/api>
- Documento: <http://localhost:3333/api.json> · <http://localhost:3333/api.yaml>

Sale de los decoradores de los propios controladores, así que se mueve con ellos.

## Dónde se aplica cada regla

Las reglas se enuncian en la spec; esta tabla dice qué trozo de código las hace ciertas, para poder ir de una a otro sin buscar.

| Regla (enlaza a la spec) | Dónde vive |
|---|---|
| [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) | `TASK_STATUSES` en `app/models/task.ts`, y `updateTaskStatusValidator` |
| [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) | `TasksController.index` — sin filtrar por quién pide, con doble `orderBy` para que el orden sea estable |
| [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) | `DEFAULT_LIST_STATUSES` (la vista por defecto, que no es «todas») y el `where` de `index` |
| [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | `listTasksValidator`: el enum es lo que separa el `422` de la lista vacía legítima |
| [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) | `createTaskValidator`, con `trim()` antes de `minLength()` |
| [Creación con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) | `TasksController.store`: el responsable sale del token y el estado va explícito |
| [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida) | `Task.isOverdueOn()` — la única definición de «vencida» del sistema |
| [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) | `taskReferenceDayValidator` y `setTaskDueDateValidator`: obligatorio y sin valor por defecto |
| [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | `TaskAssigneeTransformer`, que existe para no reutilizar `UserTransformer` y filtrar el email |
| [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | Dos transformers separados: la lista no puede enseñar lo que su objeto no contiene |

## Cómo se prueba en local

### Arrancar

Desde la raíz del repo:

```bash
make setup   # solo la primera vez: dependencias, .env, APP_KEY y migraciones
make start   # backend en :3333 y frontend en :5173, Ctrl-C para los dos
```

`make help` lista los targets. Los pasos equivalentes servidor a servidor están en [`CLAUDE.md`](../../../CLAUDE.md).

### Tests automatizados

```bash
cd backend
npm test                                  # la suite entera
node ace test --files=assignee            # un fichero
node ace test --tests="el responsable llega con su nombre y sus iniciales"
node ace test --watch
```

Lo que hay hoy sobre esta capability:

| Fichero | Qué comprueba |
|---|---|
| [`tests/functional/tasks/assignee.spec.ts`](../../../backend/tests/functional/tasks/assignee.spec.ts) | Los tres scenarios de «Lo que cada tarea muestra de su responsable», y los comprueba en las tres respuestas que llevan una tarea dentro |
| [`tests/functional/openapi/tasks_document.spec.ts`](../../../backend/tests/functional/openapi/tasks_document.spec.ts) | Lo que el documento OpenAPI **promete** de estos endpoints. No ejerce la API: vigila que el contrato publicado no se quede atrás |

**Lo que eso deja fuera, dicho sin adornos:** de los 68 scenarios de API de la spec, hay tres ejecutándose. Los 56 de interfaz no puede ejecutarlos nadie, porque `frontend/` no tiene runner de tests instalado. Los scenarios están escritos lo bastante concretos —nombran el endpoint, el código de respuesta y el campo señalado— como para traducirse casi literalmente a un test, así que escribir uno nuevo aquí es trabajo de valor inmediato.

**Aislamiento:** `config/database.ts` declara una única conexión SQLite sin override por entorno, así que la suite pega contra **el mismo fichero** que el servidor de desarrollo. Todo test que escriba abre con `group.each.setup(() => testUtils.db().withGlobalTransaction())`; sin ese hook, el estado se filtra entre ejecuciones y se lleva por delante los datos con los que estés trabajando.

### A mano, contra la API

Con el backend arrancado, lo más cómodo es <http://localhost:3333/api>: la interfaz de Scalar deja lanzar cada petición con su token. Y en crudo, de principio a fin:

```bash
API=http://localhost:3333/api/v1

TOKEN=$(curl -s -X POST $API/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

AUTH="Authorization: Bearer $TOKEN"

curl -s -X POST $API/tasks -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}'          # 201, nace pendiente y a tu nombre

curl -s $API/tasks -H "$AUTH"                   # la vista por defecto: sin las hechas
curl -s "$API/tasks?status=done" -H "$AUTH"     # lo hecho, que es lo que deja fuera
curl -s "$API/tasks?status=archivado" -H "$AUTH" # 422 sobre `status`, no una lista vacía

curl -s "$API/tasks/1?today=$(date +%F)" -H "$AUTH"   # con su fecha y su `isOverdue`

curl -s -X PUT $API/tasks/1/due-date -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"dueDate\":\"2020-01-01\",\"today\":\"$(date +%F)\"}"   # vencida
curl -s -X PATCH $API/tasks/1/status -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"status":"done"}'                        # y darla por hecha la deja de vencer
```

Dos comprobaciones que merecen hacerse a mano porque son justo donde la lista se rompería en silencio: que **un estado inventado da `422` y no una lista vacía**, y que **la lista no trae `dueDate` ni `isOverdue`** mientras la tarea suelta sí.

### A mano, contra la interfaz

En <http://localhost:5173/tasks> con sesión abierta. El filtro viaja en la URL (`/tasks?status=done`), así que una vista acotada se comparte por enlace y el botón «atrás» la deshace.

## Lo que esta capability no hace

No existe forma de **borrar una tarea**, **editar su título** ni **reasignar su responsable**: hay historias escritas para las tres en [`docs/backlog/E2-gestion-tareas/`](../../backlog/E2-gestion-tareas/), pero ninguna llegó a ser requisito ni código. Tampoco hay vista de «mis tareas», ni señales de presencia, ni paginación de la lista.

## Fuente de verdad

Las reglas de esta capability se enuncian en [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md), y el **porqué** de cada una vive en los tres changes archivados que las introdujeron —[`add-task-list`](../../../openspec/changes/archive/2026-08-13-add-task-list/), [`add-task-status-filter`](../../../openspec/changes/archive/2026-08-13-add-task-status-filter/) y [`add-task-due-date`](../../../openspec/changes/archive/2026-08-13-add-task-due-date/)—, cada uno con su `proposal.md` y su `design.md`. Saber que la vista por defecto no es «todas» es fácil leyendo la spec; saber por qué dejó de serlo solo es posible porque aquel change sigue ahí.

Con una advertencia: la spec afirma bastante más de lo que la suite demuestra —124 scenarios frente a los tres que se ejecutan—, y esa distancia no la señala nadie. Un requisito puede llevar meses siendo falso sin que nada se ponga en rojo. Ante una duda concreta, lo que decide es el código, y lo único que demuestra que algo sigue siendo cierto hoy es un test.

Este README describe y deriva: no decide. Si contradice al código o a la spec, el que se corrige es él.
