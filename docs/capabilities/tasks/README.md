# Capability: `tasks`

La lista de trabajo compartida de un equipo: una sola lista para todo el espacio, donde apuntar algo cuesta escribir un título y donde se lee de un vistazo quién lleva cada cosa y en qué estado está. Incluye la fecha de vencimiento opcional de cada tarea y el filtro por estado.

Este README **no define comportamiento**: dice qué hay, dónde está y cómo ejecutarlo. Las reglas viven en la spec, y aquí solo se enlazan.

| Qué busca | Dónde está |
|---|---|
| Qué debe hacer el sistema | [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md) — 32 requisitos, 124 scenarios |
| Qué se demuestra que hace | [`backend/tests/functional/tasks/`](../../../backend/tests/functional/tasks/) |
| El contrato HTTP publicado | `http://localhost:3333/api` (interfaz) y `/api.json` |
| Dónde encaja en el sistema | [`docs/arch/architecture.md`](../../arch/architecture.md) |

> **Sobre el estado de la spec.** La spec es el enunciado más completo de esta capability, y por eso es a ella a la que apunta este documento. Pero afirma bastante más de lo que la suite demuestra: 124 scenarios frente a los 3 tests que hoy cubren `tasks`. Un requisito puede llevar tiempo siendo falso sin que nada se ponga en rojo — como el que recogen las [desviaciones conocidas](#desviaciones-conocidas).

## Qué hace

- **Crear** una tarea escribiendo solo su título. El responsable —quien la crea— y el estado inicial los pone el sistema.
- **Listar** las tareas del espacio, las mismas para todo el mundo, de la más reciente a la más antigua y sin paginar. La vista por defecto deja fuera lo hecho.
- **Acotar** esa lista por uno de los tres estados (`pending`, `in_progress`, `done`).
- **Abrir** una tarea concreta, que es la única lectura que informa de la fecha de vencimiento y de si está vencida.
- **Cambiar** el estado de cualquier tarea, en cualquier dirección, con solo tener sesión.
- **Fijar, cambiar o retirar** su fecha de vencimiento.

Todo ello exige sesión iniciada; nada de esto distingue entre cuentas: no hay tareas privadas, ni permisos por responsable, ni roles.

## Endpoints

Todos bajo `middleware.auth()` en [`backend/start/routes.ts`](../../../backend/start/routes.ts), y todos responden con el cuerpo envuelto en `data`.

| Método | Ruta | Controlador | Devuelve |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | [`tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts) · `index` | La lista, sin vencimiento. Admite `?status=` |
| `POST` | `/api/v1/tasks` | [`tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts) · `store` | `201` con la tarea creada |
| `GET` | `/api/v1/tasks/:id` | [`tasks_controller.ts`](../../../backend/app/controllers/tasks_controller.ts) · `show` | La tarea con `dueDate` e `isOverdue`. Exige `?today=AAAA-MM-DD` |
| `PATCH` | `/api/v1/tasks/:id/status` | [`task_statuses_controller.ts`](../../../backend/app/controllers/task_statuses_controller.ts) · `update` | La tarea con su nuevo estado |
| `PUT` | `/api/v1/tasks/:id/due-date` | [`task_due_dates_controller.ts`](../../../backend/app/controllers/task_due_dates_controller.ts) · `update` | La tarea con su nueva fecha y `isOverdue` resuelto |

Los tres controladores están decorados, así que el documento OpenAPI publica ya los parámetros, los cuerpos, los códigos (`200`/`201`/`401`/`404`/`422`) y los esquemas. Con el backend arrancado: **[`localhost:3333/api`](http://localhost:3333/api)** para la interfaz, `/api.json` o `/api.yaml` para el documento.

## Reglas de negocio

Cada regla se enuncia una sola vez, en la spec. Esta tabla dice **dónde se aplica** cada una, para poder ir del código al requisito y al revés.

### En la API

| Regla | Dónde se aplica | Requisito |
|---|---|---|
| Una tarea se crea solo con el título | `tasks_controller.ts` · `store` | [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) |
| El título no puede quedar vacío ni ser espacios | `validators/task.ts` · `createTaskValidator` | [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) |
| El título no pasa de 200 caracteres | `validators/task.ts` · `createTaskValidator` | [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) |
| Una sola lista, igual para todos, sin paginar | `tasks_controller.ts` · `index` | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) |
| Junto a una tarea no viaja el email de nadie | `transformers/task_assignee_transformer.ts` | [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) |
| Los tres estados son fijos | `models/task.ts` · `TASK_STATUSES` | [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) |
| Cualquiera cambia el estado de cualquier tarea | `task_statuses_controller.ts` | [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) |
| Sin token no hay tareas | `start/routes.ts` · `middleware.auth()` | [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) |
| La fecha es opcional y es un día, no un instante | migración `add_due_date_to_tasks_table`, `validators/task.ts` · `toCalendarDay` | [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) |
| Poner, cambiar y quitar la fecha son la misma operación | `task_due_dates_controller.ts` | [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento) |
| Cuándo cuenta como vencida | `models/task.ts` · `isOverdueOn()` — **única definición del sistema** | [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida) |
| El día de referencia lo manda quien consulta | `validators/task.ts` · `taskReferenceDayValidator` | [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) |
| La tarea suelta llega entera, exista o no | `tasks_controller.ts` · `show` | [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) |
| La lista calla sobre el vencimiento | `transformers/task_transformer.ts` (distinto de `task_detail_transformer.ts`) | [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) |
| El filtro admite un estado y es de solo lectura | `tasks_controller.ts` · `index` | [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) |
| Filtrar y no encontrar nada es un `200` vacío | `tasks_controller.ts` · `index` | [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima) |
| Un estado inventado se rechaza, no se responde vacío | `validators/task.ts` · `listTasksValidator` — ⚠️ ver [Desviaciones conocidas](#desviaciones-conocidas) | [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) |

### En la interfaz

| Regla | Dónde se aplica | Requisito |
|---|---|---|
| La lista es una pantalla propia, con sesión | `pages/tasks-page.tsx`, `routes/protected-route.tsx` | [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo) |
| El espacio sin ninguna tarea se explica | `pages/tasks-page.tsx` · `doneCount` | [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas) |
| Se crea desde la propia lista, sin salir | `pages/tasks-page.tsx` · `handleCreate` | [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista) |
| El aviso del título va junto al campo | `lib/api.ts` · `translate()`, `components/field-error.tsx` | [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido) |
| El estado se cambia desde la fila | `components/task-item.tsx`, `pages/tasks-page.tsx` · `handleChangeStatus` | [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila) |
| No hay «mis tareas» ni señales de presencia | `routes/app-routes.tsx` (no existe tal ruta) | [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia) |
| Cada tarea tiene su pantalla | `pages/task-page.tsx` | [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea) |
| La fecha se pone y se quita ahí mismo | `pages/task-page.tsx` | [Poner y quitar la fecha desde la pantalla de la tarea](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea) |
| El aviso de fecha inválida va junto al campo | `lib/api.ts` · `translate()` (regla `date`) | [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale) |
| Vencida se anuncia con texto, no solo con color | `pages/task-page.tsx` | [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida) |
| No tener fecha no se señala como carencia | `components/task-item.tsx`, `pages/task-page.tsx` | [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza) |
| El control de filtro no ofrece un «Todas» | `components/task-filter.tsx` | [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista) |
| El filtro vive en la URL y en ningún otro sitio | `pages/tasks-page.tsx` · `useSearchParams` | [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista) |
| Una lista sin filas dice por qué está vacía | `pages/tasks-page.tsx` · `invalidFilter` / `doneCount` | [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo) |
| Lo que sale de la vista dice adónde ha ido | `pages/tasks-page.tsx` · `notice` | [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde) |

## Las piezas

**Backend** (`backend/`)

```
app/models/task.ts                       estados, relación con el responsable, isOverdueOn()
app/controllers/tasks_controller.ts      lista, alta y consulta de una tarea
app/controllers/task_statuses_controller.ts
app/controllers/task_due_dates_controller.ts
app/validators/task.ts                   título, estado, día de referencia y fecha
app/transformers/task_transformer.ts         lo que devuelve la lista
app/transformers/task_detail_transformer.ts  la tarea suelta, con vencimiento
app/transformers/task_assignee_transformer.ts
app/openapi/schemas.ts                   los esquemas que publica el documento
database/migrations/*_create_tasks_table.ts
database/migrations/*_add_due_date_to_tasks_table.ts
```

**Frontend** (`frontend/src/`)

```
pages/tasks-page.tsx        la lista, el alta y el cambio de estado
pages/task-page.tsx         la tarea suelta y su fecha
components/task-item.tsx    una fila
components/task-filter.tsx  el control de estado
lib/api.ts                  listTasks, createTask, getTask, updateTaskStatus, setTaskDueDate
lib/types.ts                Task, TaskDetail, TaskAssignee, TaskStatus
```

## Cómo se prueba en local

### Arrancar

```bash
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run                          # crea tmp/db.sqlite3
npm run dev                                     # http://localhost:3333

cd ../frontend
npm install
npm run dev                                     # http://localhost:5173
```

### La suite

```bash
cd backend
node ace test                                   # las dos suites
node ace test --files=assignee                  # solo un fichero
node ace test --tests="el responsable llega con su nombre y sus iniciales"
```

Hoy `tasks` tiene **un solo fichero de test**, [`tests/functional/tasks/assignee.spec.ts`](../../../backend/tests/functional/tasks/assignee.spec.ts), con tres tests que cubren el requisito del responsable en las dos superficies que lo devuelven. El resto de la capability no tiene cobertura automática: se comprueba a mano, como está más abajo, o no se comprueba.

**Ojo con la base de datos:** `config/database.ts` declara una única conexión SQLite y los tests pegan contra **el mismo fichero** que el servidor de desarrollo. Todo test que escriba abre con `group.each.setup(() => testUtils.db().withGlobalTransaction())`; sin ese hook, la suite se lleva por delante los datos con los que estabas trabajando.

### A mano, contra la API

Con el backend arrancado, una sesión completa de la capability:

```bash
# 1. una cuenta y su token
TOKEN=$(curl -s -X POST http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# 2. crear (201) y quedarse con el id
ID=$(curl -s -X POST http://localhost:3333/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# 3. la lista, y la lista acotada
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3333/api/v1/tasks
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:3333/api/v1/tasks?status=done'

# 4. cambiar el estado
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}' http://localhost:3333/api/v1/tasks/$ID/status

# 5. poner fecha, y leerla ya vencida desde un día posterior
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"dueDate":"2026-09-30","today":"2026-08-26"}' http://localhost:3333/api/v1/tasks/$ID/due-date
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3333/api/v1/tasks/$ID?today=2026-10-01"

# 6. sin token, 401
curl -s -i http://localhost:3333/api/v1/tasks | head -1
```

La interfaz de Scalar en `http://localhost:3333/api` hace lo mismo desde el navegador: pega el token en **Authorize** y las cinco operaciones quedan probables desde ahí.

## Desviaciones conocidas

- **El filtro por un estado inventado devuelve `200` con lista vacía, no `422`.** `GET /api/v1/tasks?status=archivado` responde `{"data":[]}`. La causa está en [`app/validators/task.ts`](../../../backend/app/validators/task.ts), donde `listTasksValidator` declara `status` como `vine.string().optional()` en vez de `vine.enum(TASK_STATUSES).optional()` (commit `2ccf2c1`). Incumple el requisito [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío), deja muerta la rama `fieldErrors.status` de `frontend/src/lib/api.ts`, y el documento OpenAPI anuncia el `422` que la spec exige y que hoy no ocurre.
