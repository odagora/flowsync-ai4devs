import Task, { DEFAULT_LIST_STATUSES } from '#models/task'
import {
  createTaskValidator,
  listTasksValidator,
  taskReferenceDayValidator,
  toCalendarDay,
} from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import * as schemas from '#openapi/schemas'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@foadonis/openapi/decorators'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token o no es válido.',
  type: () => schemas.UnauthorizedError,
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
    summary: 'Lista del equipo',
    description:
      'Una sola lista, la misma para cualquier cuenta, de la más reciente a la más antigua y sin paginar. Sin `status` devuelve las pendientes y las que están en curso; las hechas quedan fuera.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    description:
      'Acota la lista a un solo estado. Los estados del dominio son `pending`, `in_progress` y `done`. Hoy el validador acepta cualquier texto: un valor que no es ninguno de esos tres devuelve `200` con lista vacía, no `422`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Las tareas del alcance pedido, o una lista vacía si no hay ninguna.',
    type: () => schemas.TaskListResponse,
  })
  @ApiResponse({
    status: 422,
    description: '`status` no es un texto, por ejemplo porque viene repetido en la query.',
    type: () => schemas.ValidationError,
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
    summary: 'Una tarea suelta',
    description:
      'Con su fecha de vencimiento y su condición de vencida, resuelta contra el día que manda quien consulta. El día se valida antes de buscar la tarea.',
  })
  @ApiQuery({
    name: 'today',
    required: true,
    schema: { type: 'string', format: 'date', example: '2026-10-08' },
    description: 'Día de referencia de quien consulta, `AAAA-MM-DD`. No tiene valor por defecto.',
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea.',
    type: () => schemas.TaskDetailResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: () => schemas.NotFoundError,
  })
  @ApiResponse({
    status: 422,
    description: '`today` falta o no es un día válido.',
    type: () => schemas.ValidationError,
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
    summary: 'Crear una tarea',
    description:
      'Solo con el título. Nace a nombre de quien la crea, en `pending` y sin fecha de vencimiento, aunque el cuerpo traiga otra cosa.',
  })
  @ApiBody({ type: () => schemas.CreateTaskBody })
  @ApiResponse({
    status: 201,
    description: 'La tarea creada.',
    type: () => schemas.TaskResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'El título falta, queda vacío tras recortar espacios o supera los 200 caracteres.',
    type: () => schemas.ValidationError,
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
