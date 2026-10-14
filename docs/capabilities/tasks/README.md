# Capability `tasks`

La lista de trabajo del equipo: una sola lista compartida con todas las tareas del espacio, en la que crear una tarea cuesta solo un título y en la que el responsable y el estado de cada una se ven sin abrirla. Cada tarea puede llevar una fecha de vencimiento, y es el servidor quien decide si está vencida respecto al día que indica quien la consulta.

> **Las reglas viven en la spec, no aquí.** La fuente de verdad del comportamiento es [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md). Este README solo indica dónde está cada cosa en el código y enlaza a cada requisito sin repetirlo. Si algo de aquí contradice la spec, manda la spec.

## Endpoints

Todos van bajo `/api/v1/tasks`, exigen `Authorization: Bearer <token>` (`middleware.auth()` sobre el grupo en `backend/start/routes.ts`) y envuelven la respuesta en `{ "data": ... }`.

| Método | Ruta | Controlador | Respuesta | Requisito |
|---|---|---|---|---|
| `GET` | `/api/v1/tasks[?status=]` | `TasksController.index` | `TaskTransformer[]` | [Una sola lista compartida](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio), [Acotar por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) |
| `POST` | `/api/v1/tasks` | `TasksController.store` | `TaskTransformer` (`201`) | [Creación con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) |
| `GET` | `/api/v1/tasks/:id?today=` | `TasksController.show` | `TaskDetailTransformer` | [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) |
| `PATCH` | `/api/v1/tasks/:id/status` | `TaskStatusesController.update` | `TaskTransformer` | [Cambio de estado](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) |
| `PUT` | `/api/v1/tasks/:id/due-date` | `TaskDueDatesController.update` | `TaskDetailTransformer` | [Fijar, cambiar y retirar la fecha](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento) |

El contrato detallado (parámetros, cuerpos, códigos y esquemas) se sirve como OpenAPI en `http://localhost:3333/api.json`, con una interfaz en `http://localhost:3333/api`. Sale de los decoradores de los controladores y de [`backend/app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts).

## Dónde está cada cosa

| Pieza | Fichero |
|---|---|
| Rutas | `backend/start/routes.ts` |
| Controladores | `backend/app/controllers/tasks_controller.ts`, `task_statuses_controller.ts`, `task_due_dates_controller.ts` |
| Validadores | `backend/app/validators/task.ts` |
| Modelo, estados y regla de vencida | `backend/app/models/task.ts` (`TASK_STATUSES`, `DEFAULT_LIST_STATUSES`, `isOverdueOn`) |
| Forma de las respuestas | `backend/app/transformers/task_transformer.ts`, `task_detail_transformer.ts`, `task_assignee_transformer.ts` |
| Migraciones | `backend/database/migrations/*_create_tasks_table.ts`, `*_add_due_date_to_tasks_table.ts` |
| Cliente HTTP del frontend | `frontend/src/lib/api.ts` (`listTasks`, `createTask`, `getTask`, `updateTaskStatus`, `setTaskDueDate`) |
| Pantallas | `frontend/src/pages/tasks-page.tsx` (`/tasks`), `frontend/src/pages/task-page.tsx` (`/tasks/:id`) |
| Componentes | `frontend/src/components/task-item.tsx`, `task-filter.tsx` |
| Tests | `backend/tests/functional/tasks/` |

## Reglas de negocio

Aquí solo hay un índice. Cada enlace lleva al requisito y a sus escenarios.

**API**

- [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título): `createTaskValidator` + `TasksController.store`
- [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) y [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo): `createTaskValidator`
- [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio): `TasksController.index` + `DEFAULT_LIST_STATUSES`
- [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable): `TaskAssigneeTransformer`
- [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) y [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea): `TASK_STATUSES` + `updateTaskStatusValidator` + `TaskStatusesController`
- [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión): `middleware.auth()` en `start/routes.ts`
- [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) y [Fijar, cambiar y retirar la fecha](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento): `setTaskDueDateValidator` + `TaskDueDatesController`
- [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida): `Task.isOverdueOn`, la única implementación de la regla
- [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira): `taskReferenceDayValidator`; en el frontend, `localToday()` en `lib/api.ts`
- [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) y [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento): `TaskDetailTransformer` frente a `TaskTransformer`
- [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima) y [Un estado que no existe se rechaza](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío): `listTasksValidator` + `TasksController.index` (ver la divergencia de abajo)

**Interfaz**

- [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo), [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas), [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo) y [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde): `tasks-page.tsx`
- [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista) y [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido): `tasks-page.tsx`
- [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila): el control en `task-item.tsx`, y la llamada y la vuelta atrás si falla en `tasks-page.tsx`
- [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista) y [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista): `task-filter.tsx` + `useSearchParams` en `tasks-page.tsx`
- [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia)
- [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea), [Poner y quitar la fecha](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea), [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale), [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida) y [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza): `task-page.tsx`

### Divergencias conocidas entre el código y la spec

- **Estado inventado en la lista.** La spec pide `422` para `GET /api/v1/tasks?status=archivado` ([escenario «Estado inventado»](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío)). Hoy `listTasksValidator` declara `status` como `vine.string().optional()` (commit `2ccf2c1`), así que un valor fuera de los tres pasa la validación y la API responde `200` con una lista vacía.
- **`today` en `PUT /due-date`.** El validador exige `today` también en el cuerpo de este endpoint, para resolver `isOverdue` en la misma respuesta. El escenario «Poner una fecha a una tarea que no tenía» solo menciona `dueDate`.

Cuando se resuelva una de ellas, bórrala de esta lista.

## Cómo probarlo en local

### Arrancar

Desde la raíz del repo:

```bash
make setup   # dependencias, .env de backend y frontend, APP_KEY y migraciones
make start   # backend en http://localhost:3333 y frontend en http://localhost:5173
```

Regístrate en `http://localhost:5173/register`. La lista está en `/tasks` y cada tarea en `/tasks/:id`.

### Tests

```bash
cd backend
npm test                                  # todas las suites
node ace test --files=tasks/assignee      # solo los de tareas
```

Hoy los tests de la capability solo cubren el requisito del responsable (`tests/functional/tasks/assignee.spec.ts`). El resto de requisitos no tiene test automático.

La suite usa el **mismo fichero SQLite** que el servidor de desarrollo (`tmp/db.sqlite3`). Los tests de tareas se aíslan con `testUtils.db().withGlobalTransaction()`. Cualquier test nuevo que escriba en la base de datos debe hacer lo mismo.

### A mano contra la API

Con el backend levantado. Estas peticiones **escriben en la base de datos de desarrollo**.

```bash
API=http://localhost:3333/api/v1

TOKEN=$(curl -s -X POST $API/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secret123","passwordConfirmation":"secret123"}' \
  | jq -r .data.token)

# Crear y listar
curl -s -X POST $API/tasks -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}' | jq
curl -s "$API/tasks" -H "Authorization: Bearer $TOKEN" | jq
curl -s "$API/tasks?status=done" -H "Authorization: Bearer $TOKEN" | jq

# Estado, fecha y detalle (sustituye 1 por el id devuelto)
curl -s -X PATCH $API/tasks/1/status -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}' | jq
curl -s -X PUT $API/tasks/1/due-date -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$(date +%F)\"}" | jq
curl -s "$API/tasks/1?today=$(date +%F)" -H "Authorization: Bearer $TOKEN" | jq
```

Si el email ya está registrado, usa `POST $API/auth/login` con `{"email","password"}`: devuelve el token en el mismo sitio (`.data.token`).
