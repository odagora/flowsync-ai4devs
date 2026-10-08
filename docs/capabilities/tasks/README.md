# Capability `tasks`

La lista de trabajo del equipo: una sola lista compartida por todo el espacio, donde una tarea se crea solo con un título, nace a nombre de quien la crea y se mueve entre tres estados fijos. También admite una fecha de vencimiento opcional, que solo se ve al abrir la tarea. El propósito completo está en el [apartado *Purpose* de la spec](../../../openspec/specs/tasks/spec.md#purpose).

Este README **describe**; no decide. Las reglas no se copian aquí, se enlazan: si algo de esta página contradice la spec o los tests, se corrige esta página.

> **Qué manda.** El [ADR 0002](../../adr/0002-tests-como-fuente-de-verdad-ejecutable.md) reemplaza al [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md): los tests de integración pasan a ser la fuente de verdad, y `openspec/` queda como registro histórico de solo lectura. El propio ADR 0002 avisa de que no surte efecto completo hasta que existan un runner de tests en el frontend y una conexión de BD propia para tests, y hoy no existe ninguna de las dos. Además, los tests de `tasks` cubren un solo requisito (ver [Cómo se prueba](#cómo-se-prueba-en-local)). Por eso, mientras tanto, la referencia de las reglas sigue siendo [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md).

## Endpoints

Todos van bajo `/api/v1/tasks`, todos exigen `Authorization: Bearer <token>` (`middleware.auth()` sobre el grupo, en [`start/routes.ts`](../../../backend/start/routes.ts)) y todos responden envueltos en `{ "data": ... }`.

| Método | Ruta | Controlador | Devuelve |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | [`TasksController.index`](../../../backend/app/controllers/tasks_controller.ts) | Lista de tareas (`TaskTransformer`). Query opcional `status`. |
| `POST` | `/api/v1/tasks` | [`TasksController.store`](../../../backend/app/controllers/tasks_controller.ts) | La tarea creada, `201` (`TaskTransformer`). Cuerpo `{ "title" }`. |
| `GET` | `/api/v1/tasks/:id` | [`TasksController.show`](../../../backend/app/controllers/tasks_controller.ts) | La tarea con vencimiento (`TaskDetailTransformer`). Query obligatoria `today`. |
| `PATCH` | `/api/v1/tasks/:id/status` | [`TaskStatusesController.update`](../../../backend/app/controllers/task_statuses_controller.ts) | La tarea (`TaskTransformer`). Cuerpo `{ "status" }`. |
| `PUT` | `/api/v1/tasks/:id/due-date` | [`TaskDueDatesController.update`](../../../backend/app/controllers/task_due_dates_controller.ts) | La tarea con vencimiento (`TaskDetailTransformer`). Cuerpo `{ "dueDate", "today" }`. |

No hay ni actualización genérica ni borrado de tareas, y tampoco ninguna operación sobre los estados.

El contrato detallado (parámetros, cuerpos, códigos de respuesta y forma de cada objeto) **no se repite aquí**: lo publica el documento OpenAPI, generado a partir de los decoradores de esos controladores y de [`app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts). Con el backend arrancado:

- Interfaz: <http://localhost:3333/api>
- JSON: <http://localhost:3333/api.json> · YAML: <http://localhost:3333/api.yaml>

Fuera de producción, el documento servido no es un OpenAPI válido: `@foadonis/openapi` lo reconstruye en cada petición y en cada reconstrucción vuelve a añadir el parámetro `id` de las rutas `/tasks/{id}…`, que se va repitiendo. Para leer el contrato sirve; para generar clientes o validarlo, no. Solo cubre `tasks`: las operaciones de `auth` y `account` salen sin respuestas descritas.

### Piezas del backend

- **Modelo** [`app/models/task.ts`](../../../backend/app/models/task.ts): `Task` con la relación `assignee` (`belongsTo` `User` por `assigneeId`), las constantes `TASK_STATUSES` y `DEFAULT_LIST_STATUSES`, y `isOverdueOn(referenceDay)`, la única definición de «vencida» del sistema.
- **Validadores** [`app/validators/task.ts`](../../../backend/app/validators/task.ts): `createTaskValidator`, `listTasksValidator`, `updateTaskStatusValidator`, `taskReferenceDayValidator` y `setTaskDueDateValidator`.
- **Transformers** [`app/transformers/`](../../../backend/app/transformers/): `TaskTransformer` (lista, alta y cambio de estado; sin vencimiento), `TaskDetailTransformer` (tarea suelta y cambio de fecha; con `dueDate` e `isOverdue`) y `TaskAssigneeTransformer` (`id`, `fullName` e `initials` del responsable, sin email).
- **Tabla** `tasks`: migraciones [`create_tasks_table`](../../../backend/database/migrations/1786642030284_create_tasks_table.ts) y [`add_due_date_to_tasks_table`](../../../backend/database/migrations/1786644500000_add_due_date_to_tasks_table.ts). `assignee_id` referencia a `users.id` con borrado en cascada.

### Piezas del frontend

- **Rutas** (protegidas, en [`routes/app-routes.tsx`](../../../frontend/src/routes/app-routes.tsx)): `/tasks` → [`pages/tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx) y `/tasks/:id` → [`pages/task-page.tsx`](../../../frontend/src/pages/task-page.tsx). El filtro viaja en la URL como `?status=`.
- **Componentes**: [`task-item.tsx`](../../../frontend/src/components/task-item.tsx) (una fila de la lista) y [`task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) (el control para acotar por estado).
- **Llamadas a la API**: `listTasks`, `createTask`, `getTask`, `updateTaskStatus` y `setTaskDueDate` en [`lib/api.ts`](../../../frontend/src/lib/api.ts). `getTask` y `setTaskDueDate` mandan siempre el día local de quien mira como `today`.

## Reglas de negocio

Cada fila enlaza el requisito de la spec, que es donde están el enunciado y sus escenarios, y dice en qué parte del código se aplica.

### API

| Requisito | Dónde se aplica |
|---|---|
| [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) | `TasksController.store` |
| [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) | `createTaskValidator` |
| [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) | `createTaskValidator` |
| [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) | `TasksController.index`, `DEFAULT_LIST_STATUSES` |
| [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | `TaskAssigneeTransformer`, getter `User.initials` |
| [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) | `TASK_STATUSES`, `updateTaskStatusValidator` |
| [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) | `TaskStatusesController.update` |
| [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) | `middleware.auth()` en `start/routes.ts` |
| [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) | columna `due_date` nulable, `TasksController.store` |
| [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento) | `TaskDueDatesController.update`, `setTaskDueDateValidator` |
| [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida) | `Task.isOverdueOn` |
| [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) | `taskReferenceDayValidator`, `setTaskDueDateValidator` |
| [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) | `TasksController.show` |
| [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | `TaskTransformer` (separado de `TaskDetailTransformer`) |
| [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) | `TasksController.index`, `listTasksValidator` |
| [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima) | `TasksController.index` |
| [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | `listTasksValidator` — **hoy no se cumple**, ver abajo |

### Interfaz

| Requisito | Dónde se aplica |
|---|---|
| [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo) | `tasks-page.tsx`, `task-item.tsx` |
| [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas) | `tasks-page.tsx` |
| [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista) | `tasks-page.tsx` |
| [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido) | `tasks-page.tsx`, traducción de errores en `lib/api.ts` |
| [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila) | `task-item.tsx`, `tasks-page.tsx` |
| [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia) | `app-routes.tsx` (no hay otra ruta de tareas) |
| [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea) | `task-page.tsx` |
| [Poner y quitar la fecha desde la pantalla de la tarea](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea) | `task-page.tsx` |
| [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale) | `task-page.tsx`, `lib/api.ts` |
| [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida) | `task-page.tsx` |
| [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza) | `task-item.tsx`, `task-page.tsx` |
| [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista) | `task-filter.tsx` |
| [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista) | `tasks-page.tsx` (`useSearchParams`) |
| [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo) | `tasks-page.tsx` |
| [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde) | `tasks-page.tsx` |

### Desviaciones conocidas

- **Un estado inventado en la lista devuelve `200` con lista vacía, no `422`.** Desde el commit `2ccf2c1`, `listTasksValidator` acepta `status` como texto libre (`vine.string().optional()`) en vez de `vine.enum(TASK_STATUSES).optional()`. `GET /api/v1/tasks?status=archivado` responde `{"data": []}`, y con eso no se cumple el requisito [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío). Arrastra también al aviso de filtro no válido del frontend, que depende de ese `422`. El documento OpenAPI ya refleja el comportamiento real.

## Cómo se prueba en local

### Arrancar

Desde la raíz del repo:

```bash
make setup   # npm install en backend y frontend, .env y migraciones
make start   # backend en http://localhost:3333 y frontend en http://localhost:5173
```

O cada parte por separado, siguiendo los comandos de [`CLAUDE.md`](../../../CLAUDE.md#comandos).

### Probar a mano

En el navegador: regístrate en <http://localhost:5173/register> y llegarás a `/tasks`.

Contra la API, con `curl`:

```bash
# 1. Crear una cuenta y quedarse con el token
TOKEN=$(curl -s http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["token"])')

# 2. Crear una tarea
curl -s http://localhost:3333/api/v1/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Revisar el informe"}'

# 3. Listar (sin filtro: pendientes y en curso) y acotar
curl -s http://localhost:3333/api/v1/tasks -H "Authorization: Bearer $TOKEN"
curl -s 'http://localhost:3333/api/v1/tasks?status=done' -H "Authorization: Bearer $TOKEN"

# 4. Abrir una tarea: `today` es obligatorio
curl -s "http://localhost:3333/api/v1/tasks/1?today=$(date +%F)" -H "Authorization: Bearer $TOKEN"

# 5. Cambiar el estado y la fecha
curl -s -X PATCH http://localhost:3333/api/v1/tasks/1/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X PUT http://localhost:3333/api/v1/tasks/1/due-date -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$(date +%F)\"}"
```

Todo esto escribe en la base de datos de desarrollo (`backend/tmp/db.sqlite3`). La interfaz de <http://localhost:3333/api> permite lanzar las mismas peticiones pegando el token.

### Tests automáticos

Desde `backend/`:

```bash
node ace test --files=tests/functional/tasks/assignee.spec.ts   # solo los de tasks
npm test                                                        # toda la suite
```

Funcionan con el servidor de desarrollo arrancado.

Hoy la capability tiene **un solo fichero de tests**, [`tests/functional/tasks/assignee.spec.ts`](../../../backend/tests/functional/tasks/assignee.spec.ts), con 3 tests. Cubre solo el requisito *Lo que cada tarea muestra de su responsable*, comprobado al crear la tarea, al consultarla suelta y en la lista. El resto de requisitos de la API no tiene test, y el frontend no tiene runner de tests.

Ojo con la base de datos: los tests functional usan el **mismo fichero SQLite** que el servidor de desarrollo, porque `config/database.ts` no define una conexión aparte para tests. Todo test nuevo que escriba tiene que aislarse como hace `assignee.spec.ts`:

```ts
group.each.setup(() => testUtils.db().withGlobalTransaction())
```
