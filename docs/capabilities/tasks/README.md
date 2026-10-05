# Capability `tasks`

La lista de trabajo del equipo. Hay una sola lista compartida, igual para todas las cuentas, donde crear una tarea solo exige un título y cada fila muestra quién la lleva y en qué estado está. Cualquier persona con sesión puede cambiar el estado de cualquier tarea. Al abrir una tarea se le puede poner, cambiar o quitar una fecha de vencimiento, y la propia API dice si está vencida.

> **El contrato es [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md).** Este README no repite sus reglas: dice dónde están y dónde las implementa el código. Si algo de aquí contradice la spec, manda la spec.

## Endpoints

Todos van bajo `/api/v1`, piden `Authorization: Bearer <token>` (si no lo hay, responden `401`) y envuelven la respuesta en `{ "data": ... }`. Las rutas están en `backend/start/routes.ts`.

| Método | Ruta | Controlador | Entrada | Respuesta |
|---|---|---|---|---|
| `GET` | `/tasks` | `TasksController.index` | query `status` (opcional) | `200` con un array de tareas, sin vencimiento |
| `POST` | `/tasks` | `TasksController.store` | cuerpo `{ "title" }` | `201` con la tarea creada · `422` |
| `GET` | `/tasks/:id` | `TasksController.show` | query `today=AAAA-MM-DD` (obligatorio) | `200` con la tarea y su vencimiento · `404` · `422` |
| `PATCH` | `/tasks/:id/status` | `TaskStatusesController.update` | cuerpo `{ "status" }` | `200` con la tarea · `404` · `422` |
| `PUT` | `/tasks/:id/due-date` | `TaskDueDatesController.update` | cuerpo `{ "dueDate": "AAAA-MM-DD" \| null, "today" }` | `200` con la tarea y su vencimiento · `404` · `422` |

Hay dos formas de tarea en las respuestas, cada una con su transformer:

- **`TaskTransformer`** (lista, alta y cambio de estado): `id`, `title`, `status`, `assignee`, `createdAt`, `updatedAt`.
- **`TaskDetailTransformer`** (consulta suelta y cambio de fecha): lo mismo más `dueDate` e `isOverdue`.

El `assignee` sale siempre de `TaskAssigneeTransformer`: `id`, `fullName` e `initials`, nunca el email.

El detalle de cada operación (parámetros, cuerpos, esquemas y códigos) está en el documento OpenAPI que sirve el backend: `http://localhost:3333/api.json`, con interfaz en `http://localhost:3333/api`.

## Reglas de negocio

Las reglas son los requisitos de la spec. Aquí solo se agrupan por tema y se indica qué parte del código hace cumplir cada grupo:

| Tema | Requisitos de la spec | Dónde vive en el código |
|---|---|---|
| Alta | *Creación de una tarea con solo el título* · *Ninguna tarea sin título* · *Aviso ante un título demasiado largo* | `createTaskValidator` (`app/validators/task.ts`) · `TasksController.store` |
| La lista | *Una sola lista compartida del espacio* · *La lista no lleva el vencimiento* | `TasksController.index` · `DEFAULT_LIST_STATUSES` (`app/models/task.ts`) · `TaskTransformer` |
| Filtro por estado | *Acotar la lista por estado* · *Un filtro válido sin resultados es una lista vacía legítima* · *Un estado que no existe se rechaza, no se responde vacío* | `listTasksValidator` · `TasksController.index` — **ver desviación abajo** |
| Responsable | *Lo que cada tarea muestra de su responsable* | `TaskAssigneeTransformer` · getter `initials` de `User` |
| Estados | *Tres estados fijos* · *Cambio de estado de cualquier tarea* | `TASK_STATUSES` (`app/models/task.ts`) · `updateTaskStatusValidator` · `TaskStatusesController` |
| Sesión | *Las tareas exigen sesión* | `middleware.auth()` sobre el grupo `tasks` en `start/routes.ts` |
| Vencimiento | *Fecha de vencimiento opcional* · *Fijar, cambiar y retirar la fecha de vencimiento* · *Cuándo una tarea está vencida* · *El día de referencia lo pone quien mira* · *Consulta de una tarea suelta* | `Task.isOverdueOn()` (única definición de «vencida») · `setTaskDueDateValidator` · `taskReferenceDayValidator` · `TaskDueDatesController` · `TaskDetailTransformer` |
| Interfaz | *Pantalla de la lista del equipo* · *El espacio sin tareas* · *Crear una tarea desde la lista* · *Aviso al intentar crear sin un título válido* · *Cambiar el estado desde la propia fila* · *Una sola vista de tareas, sin señales de presencia* · *El control para acotar la lista* · *El filtro se pide en la dirección de la lista* · *Una lista sin filas no significa siempre lo mismo* · *Lo que sale de la vista no se pierde* · *Pantalla de una tarea* · *Poner y quitar la fecha desde la pantalla de la tarea* · *Aviso ante una fecha que no vale* · *La señal de tarea vencida* · *No tener fecha no se penaliza* | `frontend/src/pages/tasks-page.tsx` · `task-page.tsx` · `components/task-item.tsx` · `components/task-filter.tsx` · `lib/api.ts` (incluido `localToday()`, que manda el `today`) |

El porqué de cada decisión está en los changes archivados: [`add-task-list`](../../../openspec/changes/archive/2026-08-13-add-task-list/), [`add-task-due-date`](../../../openspec/changes/archive/2026-08-13-add-task-due-date/) y [`add-task-status-filter`](../../../openspec/changes/archive/2026-08-13-add-task-status-filter/).

### Desviación conocida

`listTasksValidator` acepta cualquier texto en `status` desde el commit `2ccf2c1`. Por eso `GET /tasks?status=archivado` responde `200` con lista vacía, cuando la spec (*Un estado que no existe se rechaza, no se responde vacío*) exige un `422` sobre el campo `status`. El documento OpenAPI lo deja anotado en la descripción del parámetro. Ningún test lo cubre.

## Cómo probarla en local

Todos los comandos del backend se ejecutan desde `backend/`.

**1. Preparar el backend (solo la primera vez)**

```bash
npm install
cp .env.example .env && node ace generate:key
node ace migration:run
```

**2. Tests automáticos**

```bash
node ace test --files=tasks/assignee   # solo los de esta capability
npm test                               # toda la suite
```

Hoy solo hay `tests/functional/tasks/assignee.spec.ts`, que cubre el requisito *Lo que cada tarea muestra de su responsable* por los tres caminos (alta, lista y consulta suelta). El resto de requisitos no tiene test, y el frontend no tiene runner. Los tests escriben en el mismo `tmp/db.sqlite3` que el servidor de desarrollo, así que cada grupo nuevo debe aislarse con `group.each.setup(() => testUtils.db().withGlobalTransaction())`, como hace el existente.

**3. A mano contra la API**

Arranca el backend con `npm run dev` y prueba desde la interfaz de `http://localhost:3333/api`, o con `curl`:

```bash
# Cuenta y token (el token sale en data.token)
curl -s -X POST http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}'

TOKEN=...   # pega aquí data.token

curl -s -X POST http://localhost:3333/api/v1/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Revisar el informe"}'
curl -s "http://localhost:3333/api/v1/tasks?status=pending" -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH http://localhost:3333/api/v1/tasks/1/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X PUT http://localhost:3333/api/v1/tasks/1/due-date -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"dueDate":"2026-09-30","today":"2026-10-04"}'
curl -s "http://localhost:3333/api/v1/tasks/1?today=2026-10-04" -H "Authorization: Bearer $TOKEN"
```

Estas llamadas crean datos en la base de desarrollo. `node ace migration:fresh` la deja vacía.

**4. Desde la interfaz**

Con el backend arrancado, ejecuta `npm install && npm run dev` en `frontend/` y abre `http://localhost:5173/tasks`. Sin sesión, la app te lleva a `/login`. La pantalla de una tarea está en `/tasks/:id`.
