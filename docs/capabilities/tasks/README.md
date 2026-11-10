# Capability: tareas

La lista de trabajo del equipo: una única lista compartida en la que cualquier persona con sesión apunta una tarea escribiendo solo su título, ve quién lleva cada una y en qué estado está, la cambia de estado y le pone, cambia o quita una fecha de vencimiento. No hay vistas personales ni permisos por responsable: lo que se comparte es el contenido, y lo único personal es el filtro por estado.

**Este README no repite reglas.** Lo que el sistema debe hacer está en la spec viva, [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md), y la forma exacta de cada petición y respuesta en el documento OpenAPI que sirve el backend (ver [Probarlo en local](#probarlo-en-local)). Aquí solo se dice dónde vive cada cosa y cómo encontrarla. Si algo de este fichero contradice a la spec, manda la spec.

## Dónde vive el código

| Pieza | Fichero |
|---|---|
| Modelo, los tres estados y la regla de vencida | [`backend/app/models/task.ts`](../../../backend/app/models/task.ts) |
| Tabla `tasks` | [`backend/database/migrations/`](../../../backend/database/migrations/) (`create_tasks_table`, `add_due_date_to_tasks_table`) |
| Validadores | [`backend/app/validators/task.ts`](../../../backend/app/validators/task.ts) |
| Controladores | [`tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts), [`task_statuses_controller.ts`](../../../backend/app/controllers/task_statuses_controller.ts), [`task_due_dates_controller.ts`](../../../backend/app/controllers/task_due_dates_controller.ts) |
| Forma de las respuestas | [`task_transformer.ts`](../../../backend/app/transformers/task_transformer.ts) (lista y escrituras), [`task_detail_transformer.ts`](../../../backend/app/transformers/task_detail_transformer.ts) (tarea suelta), [`task_assignee_transformer.ts`](../../../backend/app/transformers/task_assignee_transformer.ts) (responsable) |
| Esquemas OpenAPI compartidos | [`backend/app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts) |
| Rutas | [`backend/start/routes.ts`](../../../backend/start/routes.ts), grupo `tasks` |
| Cliente de la API | [`frontend/src/lib/api.ts`](../../../frontend/src/lib/api.ts) (`listTasks`, `createTask`, `getTask`, `updateTaskStatus`, `setTaskDueDate`) |
| Pantallas | [`tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx) (`/tasks`), [`task-page.tsx`](../../../frontend/src/pages/task-page.tsx) (`/tasks/:id`), con [`task-item.tsx`](../../../frontend/src/components/task-item.tsx) y [`task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) |
| Historia de los cambios | [`openspec/changes/archive/`](../../../openspec/changes/archive/) (`add-task-list`, `add-task-due-date`, `add-task-status-filter`) |

## Endpoints

Todos cuelgan de `/api/v1/tasks` y exigen `Authorization: Bearer <token>`. Las respuestas van envueltas en `{ "data": ... }`.

| Método | Ruta | Controlador | Para qué | Requisitos de la spec |
|---|---|---|---|---|
| `GET` | `/api/v1/tasks` | `TasksController.index` | La lista compartida, acotable por `?status=` | [Una sola lista compartida][lista], [Acotar la lista por estado][acotar], [La lista no lleva el vencimiento][lista-sin-venc] |
| `POST` | `/api/v1/tasks` | `TasksController.store` | Crear una tarea con solo el título | [Creación con solo el título][crear], [Ninguna tarea sin título][sin-titulo], [Título demasiado largo][largo] |
| `GET` | `/api/v1/tasks/:id` | `TasksController.show` | Una tarea suelta con su vencimiento; exige `?today=` | [Consulta de una tarea suelta][suelta], [El día de referencia lo pone quien mira][today] |
| `PATCH` | `/api/v1/tasks/:id/status` | `TaskStatusesController.update` | Cambiar el estado | [Cambio de estado de cualquier tarea][estado], [Tres estados fijos][estados] |
| `PUT` | `/api/v1/tasks/:id/due-date` | `TaskDueDatesController.update` | Fijar, cambiar o retirar la fecha; el cuerpo lleva `dueDate` y `today` | [Fijar, cambiar y retirar la fecha][fecha] |

Los parámetros, los cuerpos, los códigos de respuesta (`200`/`201`, `401`, `404`, `422`) y la forma de cada objeto están en el documento OpenAPI, generado a partir de los decoradores de esos controladores.

## Reglas de negocio

Cada regla está en la spec; esta tabla solo dice dónde se aplica en el código.

| Requisito de la spec | Dónde se aplica |
|---|---|
| [Creación con solo el título][crear], [Ninguna tarea sin título][sin-titulo], [Título demasiado largo][largo] | `createTaskValidator` y `TasksController.store` |
| [Una sola lista compartida del espacio][lista] | `TasksController.index` y `DEFAULT_LIST_STATUSES` en el modelo |
| [Lo que cada tarea muestra de su responsable][responsable] | `TaskAssigneeTransformer` |
| [Tres estados fijos][estados] | `TASK_STATUSES` en el modelo y `updateTaskStatusValidator` |
| [Cambio de estado de cualquier tarea][estado] | `TaskStatusesController` |
| [Las tareas exigen sesión][sesion] | `middleware.auth()` sobre el grupo en `start/routes.ts` |
| [Fecha de vencimiento opcional][fecha-opcional], [Fijar, cambiar y retirar la fecha][fecha] | Migración `add_due_date_to_tasks_table`, `setTaskDueDateValidator`, `TaskDueDatesController` |
| [Cuándo una tarea está vencida][vencida] | `Task.isOverdueOn()`, la única definición del sistema |
| [El día de referencia lo pone quien mira][today] | `taskReferenceDayValidator` en el backend; `localToday()` en `frontend/src/lib/api.ts` |
| [Consulta de una tarea suelta][suelta], [La lista no lleva el vencimiento][lista-sin-venc] | `TaskDetailTransformer` frente a `TaskTransformer` |
| [Acotar la lista por estado][acotar], [Un filtro válido sin resultados es una lista vacía legítima][vacia], [Un estado que no existe se rechaza][inventado] | `listTasksValidator` y `TasksController.index` |
| Requisitos de interfaz: [pantalla de la lista][ui-lista], [espacio sin tareas][ui-vacio], [crear desde la lista][ui-crear], [aviso de título][ui-titulo], [estado desde la fila][ui-fila], [una sola vista][ui-una], [pantalla de una tarea][ui-tarea], [fecha desde la pantalla][ui-fecha], [aviso de fecha][ui-aviso-fecha], [señal de vencida][ui-senal], [no tener fecha no se penaliza][ui-sin-fecha], [control del filtro][ui-control], [filtro en la dirección][ui-url], [lista sin filas][ui-sin-filas], [lo que sale de la vista][ui-sale] | `frontend/src/pages/tasks-page.tsx`, `task-page.tsx` y sus componentes |

### Divergencias conocidas entre código y spec

Estado a 2026-11-10. Cuando se corrijan, se borra este apartado.

- **[Un estado que no existe se rechaza, no se responde vacío][inventado] no se cumple.** `listTasksValidator` acepta cualquier texto en `status` (commit `2ccf2c1`), así que `GET /api/v1/tasks?status=archivado` responde `200` con una lista vacía en lugar de `422`. En consecuencia, el aviso de filtro inválido de la pantalla de la lista no llega a mostrarse. No hay ningún test que lo cubra.
- **El ejemplo de cuerpo de [Fijar, cambiar y retirar la fecha][fecha] no lleva `today`**, pero el código lo exige, en coherencia con [El día de referencia lo pone quien mira][today]. Si envías solo `{"dueDate": ...}`, recibes un `422`.

## Probarlo en local

### Arrancar

Desde la raíz del repo (los detalles, en el [README principal](../../../README.md)):

```bash
make setup   # solo la primera vez
make start   # backend en :3333 y frontend en :5173
```

- **Interfaz:** `http://localhost:5173/tasks`. Para ver la lista acotada, añade el estado a la dirección: `http://localhost:5173/tasks?status=done`. Cada tarea se abre en `/tasks/:id`.
- **Documento OpenAPI:** `http://localhost:3333/api.json`, con su interfaz (Scalar) en `http://localhost:3333/api`.

### Tests automáticos

```bash
cd backend
node ace test functional --files=tasks/assignee
```

Hoy la capability solo tiene esos tres tests, en [`backend/tests/functional/tasks/assignee.spec.ts`](../../../backend/tests/functional/tasks/assignee.spec.ts), y cubren un único requisito: [Lo que cada tarea muestra de su responsable][responsable]. El resto de la spec no tiene cobertura automática. Los tests usan la misma base SQLite que el servidor de desarrollo (`backend/tmp/db.sqlite3`) pero aíslan cada test en una transacción global, así que no dejan datos.

### A mano contra la API

Con el backend arrancado. **Ojo:** esto escribe en la base de desarrollo; cambia el email si ya existe.

```bash
API=http://localhost:3333/api/v1

# Crear una cuenta y quedarse con su token
TOKEN=$(curl -s -X POST $API/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | jq -r .data.token)

# Crear una tarea y quedarse con su id
ID=$(curl -s -X POST $API/tasks -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}' | jq .data.id)

# La lista por defecto (pendientes y en curso) y la acotada
curl -s $API/tasks -H "Authorization: Bearer $TOKEN" | jq
curl -s "$API/tasks?status=done" -H "Authorization: Bearer $TOKEN" | jq

# La tarea suelta: sin `today` responde 422
curl -s "$API/tasks/$ID?today=$(date +%F)" -H "Authorization: Bearer $TOKEN" | jq

# Cambiar el estado
curl -s -X PATCH $API/tasks/$ID/status -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}' | jq

# Poner una fecha ya pasada: la respuesta llega con isOverdue a true
curl -s -X PUT $API/tasks/$ID/due-date -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"dueDate\":\"2026-01-01\",\"today\":\"$(date +%F)\"}" | jq
```

**No pegues el token en la interfaz de `http://localhost:3333/api`.** Esa página carga Scalar desde `cdn.jsdelivr.net` sin versión fija, y su botón de probar peticiones las envía a través de `proxy.scalar.com`, un servicio de terceros que recibiría el token en la cabecera. Úsala solo para leer el contrato; para probar, usa `curl`.

[crear]: ../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título
[sin-titulo]: ../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título
[largo]: ../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo
[lista]: ../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio
[responsable]: ../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable
[estados]: ../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos
[estado]: ../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea
[sesion]: ../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión
[fecha-opcional]: ../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional
[fecha]: ../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento
[vencida]: ../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida
[today]: ../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira
[suelta]: ../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta
[lista-sin-venc]: ../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento
[acotar]: ../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado
[vacia]: ../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima
[inventado]: ../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío
[ui-lista]: ../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo
[ui-vacio]: ../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas
[ui-crear]: ../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista
[ui-titulo]: ../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido
[ui-fila]: ../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila
[ui-una]: ../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia
[ui-tarea]: ../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea
[ui-fecha]: ../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea
[ui-aviso-fecha]: ../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale
[ui-senal]: ../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida
[ui-sin-fecha]: ../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza
[ui-control]: ../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista
[ui-url]: ../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista
[ui-sin-filas]: ../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo
[ui-sale]: ../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde
