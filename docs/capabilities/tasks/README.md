# Capability: `tasks`

La lista de trabajo del equipo: **una sola lista compartida**, la misma para todo el mundo, donde apuntar algo cuesta escribir un título y donde el responsable y el estado de cada tarea se leen sin abrir nada.

> **Las reglas de esta capability no están aquí.** Viven en
> **[`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md)**, que es la fuente de verdad
> (ver [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md)): 32 requisitos y 124 scenarios.
> Este README **no las repite**. Lo que aporta es el mapa que la spec no tiene: dónde está implementada
> cada regla y cómo ejercitarla en local. Si algo de aquí contradice a la spec, manda la spec.

## Endpoints

Todos bajo `/api/v1`, todos declarados en [`backend/start/routes.ts`](../../../backend/start/routes.ts) y todos con `middleware.auth()`: sin token válido responden `401`.

| Método | Ruta | Controlador | Devuelve |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | `TasksController.index` | La lista del alcance pedido, sin vencimiento |
| `POST` | `/api/v1/tasks` | `TasksController.store` | `201` con la tarea recién creada |
| `GET` | `/api/v1/tasks/:id` | `TasksController.show` | La tarea con su fecha y su condición de vencida |
| `PATCH` | `/api/v1/tasks/:id/status` | `TaskStatusesController.update` | La tarea con el estado ya cambiado |
| `PUT` | `/api/v1/tasks/:id/due-date` | `TaskDueDatesController.update` | La tarea con la fecha puesta, cambiada o retirada |

Dos parámetros que se olvidan con facilidad:

- **`GET /tasks` acepta `?status=`** con uno de los tres estados. Es opcional, y su ausencia **no** significa «todas».
- **`GET /tasks/:id` exige `?today=AAAA-MM-DD`**, y `PUT /tasks/:id/due-date` lo exige en el cuerpo. Sin él la respuesta es `422`.

El contrato completo —cuerpos, códigos y forma de los objetos— se sirve como documento OpenAPI en **`http://localhost:3333/api`** (interfaz), `.../api.json` y `.../api.yaml`. Sale de los decoradores de los propios controladores, así que no hay fichero que mantener aparte.

## Dónde vive cada regla

La columna izquierda enlaza al requisito en la spec; la derecha dice qué código lo sostiene. **La regla se lee en la spec, no aquí.**

| Requisito | Implementado en |
|---|---|
| [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) | `tasks_controller.ts` → `store()`: el `assigneeId` sale de `auth`, y el `status` va explícito |
| [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) · [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) | `validators/task.ts` → `createTaskValidator`. El orden importa: `trim()` corre **antes** que `minLength()` |
| [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) | `tasks_controller.ts` → `index()`: sin paginar, con doble `orderBy` para que el orden no lo decida la BD |
| [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | `transformers/task_assignee_transformer.ts`. **No** reutiliza `UserTransformer`, que sí lleva el email |
| [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) | `models/task.ts` → `TASK_STATUSES`, reutilizado por validadores y decoradores |
| [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) | `task_statuses_controller.ts`. Endpoint propio para que un update genérico no deje colar título ni responsable |
| [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) | `start/routes.ts` → `.use(middleware.auth())` sobre el grupo entero |
| [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) | Migración `..._add_due_date_to_tasks_table.ts`: nulable y sin valor por defecto |
| [Fijar, cambiar y retirar la fecha](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento) | `task_due_dates_controller.ts` + `setTaskDueDateValidator` (`dueDate` nulable) |
| [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida) | `models/task.ts` → `isOverdueOn()`. **Única definición del sistema**; el frontend nunca compara fechas |
| [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) | `validators/task.ts` → `taskReferenceDayValidator`, obligatorio y sin defecto. Lo genera `frontend/src/lib/api.ts` → `localToday()` |
| [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | Dos transformers separados: `task_transformer.ts` (lista) y `task_detail_transformer.ts` (detalle) |
| [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) · [Un estado que no existe se rechaza](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | `listTasksValidator` (el `422`) y `index()` (la rama por defecto). Son **dos caminos separados** a propósito |
| Requisitos de interfaz (`La interfaz SHALL…`) | `frontend/src/pages/tasks-page.tsx`, `task-page.tsx`, `components/task-item.tsx`, `components/task-filter.tsx` |

### Dos invariantes que ningún test protege

- **`DEFAULT_LIST_STATUSES` está escrito dos veces**, en `backend/app/models/task.ts` y en `frontend/src/lib/types.ts`. De que sean el mismo conjunto depende que marcar algo como hecho lo saque de la vista al instante. Nada lo comprueba.
- **La distinción entre filtro inválido (`422`) y filtro válido sin resultados (`200` vacío)** se sostiene en dos capas separadas. Fundirlas en cualquiera de las dos convierte «lo que has pedido no existe» en «no hay nada», y de ahí ya no se recupera.

## Cómo se prueba en local

### Levantar el entorno

```bash
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run                          # crea tmp/db.sqlite3
npm run dev                                     # http://localhost:3333
```

```bash
cd frontend && npm install && npm run dev       # http://localhost:5173
```

### Tests automáticos

```bash
cd backend
node ace test                        # la suite entera (23 tests)
node ace test --files=assignee       # solo los de tasks
```

**Sé lo que esto cubre y lo que no.** De los 124 scenarios de la spec, la suite ejercita **3**, todos en [`backend/tests/functional/tasks/assignee.spec.ts`](../../../backend/tests/functional/tasks/assignee.spec.ts), y todos sobre el responsable que acompaña a la tarea. **No hay ni un test de la creación, del filtro por estado, del cambio de estado ni del vencimiento.** Que `node ace test` esté en verde no dice nada sobre esas reglas.

Si añades tests que escriben, abre el grupo con el hook de aislamiento que usan todos los ficheros — `config/database.ts` apunta a la **misma** base de datos que el servidor de desarrollo:

```ts
group.each.setup(() => testUtils.db().withGlobalTransaction())
```

### A mano, contra el servidor real

Lo más rápido es la interfaz del documento OpenAPI en **`http://localhost:3333/api`**, que permite lanzar las peticiones con el token puesto. Con `curl`, el token sale de un registro:

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"password123","passwordConfirmation":"password123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')

curl -s -X POST http://localhost:3333/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}'                        # 201

curl -s "http://localhost:3333/api/v1/tasks?status=archivado" \
  -H "Authorization: Bearer $TOKEN"                          # 422 sobre el campo status, NO lista vacía

curl -s "http://localhost:3333/api/v1/tasks/1?today=2026-08-25" \
  -H "Authorization: Bearer $TOKEN"                          # trae dueDate e isOverdue
```

Los cuatro caminos que conviene mirar siempre que se toque la lista, porque son los que se confunden entre sí: un estado válido con tareas, un estado válido **sin** tareas (`200` con lista vacía), un estado inventado (`422`) y la vista por defecto en un espacio donde todo está hecho.

### Al cambiar rutas, controladores, validadores o transformers

```bash
cd backend
npm run lint && npm run typecheck && node ace test
```

Arranca además el servidor para regenerar `.adonisjs/` y commitea el diff: el registro Tuyau y los tipos del cliente salen de ahí. El documento OpenAPI no hay que regenerarlo —se construye en cada petición—, pero sí conviene abrir `/api` y comprobar que lo que publica sigue siendo cierto.
