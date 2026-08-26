import Task, { DEFAULT_LIST_STATUSES, TASK_STATUSES } from '#models/task'
import {
  createTaskValidator,
  listTasksValidator,
  taskReferenceDayValidator,
  toCalendarDay,
} from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import {
  ErrorResponse,
  TaskDetailResponse,
  TaskListResponse,
  TaskResponse,
  ValidationErrorResponse,
} from '#openapi/schemas'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@foadonis/openapi/decorators'

/**
 * El token y el `401` se declaran en la clase y no operación a operación: «Las
 * tareas exigen sesión» es un requisito del grupo entero, y el generador funde
 * los metadatos de la clase con los de cada método.
 */
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o no es válido. No se devuelve ninguna tarea.',
  type: ErrorResponse,
})
export default class TasksController {
  /**
   * La lista del espacio: una sola, la misma para todo el mundo, sin filtrar
   * por quién la pide. El responsable va precargado en la misma consulta —
   * es el 100 % de los accesos y resolverlo tarea a tarea sería el error caro
   * y evidente aquí.
   *
   * Admite acotarse por estado, y aquí hay tres caminos que no se cruzan:
   * un estado válido devuelve solo el suyo (aunque no haya ninguna, y eso es
   * una lista vacía legítima, no un error); no pedir nada devuelve lo que
   * sigue abierto; y un estado que no existe ni siquiera llega, porque el
   * validador lo corta antes con un 422. Devolverlo vacío sería el fallo
   * silencioso que esta lista no se puede permitir.
   *
   * Acotar es solo lectura: ninguna tarea cambia por consultarla.
   */
  @ApiOperation({
    summary: 'La lista compartida del espacio',
    description:
      'Una sola lista para todo el equipo, ordenada de la más reciente a la más antigua y entera en una sola respuesta: no se pagina. Sin `status` no llegan «todas», sino las pendientes y las que están en curso; lo hecho se consulta pidiéndolo. Es solo lectura: consultarla no cambia ninguna tarea.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [...TASK_STATUSES],
    description:
      'Acota la lista a un único estado. Ausente significa la vista por defecto (`pending` e `in_progress`), no «todas». No hay forma de pedir dos estados a la vez.',
  })
  @ApiResponse({
    status: 200,
    description:
      'La lista del alcance pedido. Un estado válido en el que ahora mismo no hay nada devuelve una lista vacía, con la misma forma que cualquier otra.',
    type: TaskListResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'El `status` pedido no es ninguno de los tres del dominio. Se responde con un error sobre ese campo y nunca con una lista vacía: pedir algo que no existe y no encontrar nada tienen que ser distinguibles desde fuera.',
    type: ValidationErrorResponse,
  })
  async index({ request, serialize }: HttpContext) {
    const { status } = await request.validateUsing(listTasksValidator)

    const query = Task.query().preload('assignee')

    if (status) {
      query.where('status', status)
    } else {
      // Sin filtro no es «todas»: lo hecho se queda fuera.
      query.whereIn('status', [...DEFAULT_LIST_STATUSES])
    }

    const tasks = await query
      .orderBy('createdAt', 'desc')
      // Desempate estable: dos tareas creadas en el mismo milisegundo tienen
      // la misma marca de tiempo, y sin esto su orden relativo sería el que
      // quisiera la base de datos.
      .orderBy('id', 'desc')

    return serialize(TaskTransformer.transform(tasks))
  }

  /**
   * Una tarea suelta, con todo lo que tiene: es la única lectura que informa
   * del vencimiento, y por eso es la única que exige el día de quien mira.
   */
  @ApiOperation({
    summary: 'Una tarea suelta, con su vencimiento',
    description:
      'La única lectura que informa del vencimiento, y por eso la única que exige el día de quien mira. No comprueba quién es el responsable: una tarea ajena se recibe entera igual que una propia.',
  })
  @ApiQuery({
    name: 'today',
    required: true,
    schema: { type: 'string', format: 'date' },
    example: '2026-08-26',
    description:
      'El día de referencia de quien consulta, `AAAA-MM-DD`. Obligatorio y sin valor por defecto: el servidor no sustituye el día que falte por el de su propio reloj, porque eso daría la lectura equivocada a quien mire desde otro huso.',
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea, con su fecha de vencimiento —o su ausencia— y su condición de vencida.',
    type: TaskDetailResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'Falta `today` o no es una fecha del calendario. No se devuelve ninguna tarea.',
    type: ValidationErrorResponse,
  })
  async show({ params, request, serialize }: HttpContext) {
    const { today } = await request.validateUsing(taskReferenceDayValidator)
    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }

  /**
   * Crear cuesta un título. El responsable y el estado no se leen de la
   * petición ni aunque vengan: los pone el sistema.
   */
  @ApiOperation({
    summary: 'Crear una tarea con solo el título',
    description:
      'El título es lo único que se pide. El responsable es la cuenta dueña del token y el estado es `pending`, y los pone el sistema: si la petición trae además `status`, un responsable o una fecha, esos valores se ignoran y la tarea se crea igual.',
  })
  // El cuerpo sale del propio validador —VineJS 4 publica su JSON Schema—, así
  // que el mínimo, el máximo y «solo se acepta el título» no se escriben aquí
  // dos veces ni pueden quedar desfasados.
  @ApiBody({ type: createTaskValidator })
  @ApiResponse({
    status: 201,
    description: 'La tarea ya creada, a nombre de quien la envía y en estado `pending`.',
    type: TaskResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'El título falta, está vacío, es solo espacios o pasa de 200 caracteres. No se crea ninguna tarea, ni se guarda una versión recortada del título.',
    type: ValidationErrorResponse,
  })
  async store({ request, response, auth, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    // El estado va explícito y no se deja al valor por defecto de la columna:
    // el modelo recién creado no vuelve a leerse de la base de datos, así que
    // ese defecto no llegaría a la respuesta.
    const task = await Task.create({ title, status: 'pending', assigneeId: user.id })
    await task.load('assignee')

    // El estado se marca aparte y el cuerpo se devuelve: `serialize()` entrega
    // una promesa que resuelve el pipeline al devolverla, y pasársela a
    // `response.created()` deja la respuesta con el cuerpo vacío.
    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }
}
