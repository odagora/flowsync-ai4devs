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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@foadonis/openapi/decorators'
import {
  notFound,
  taskDetailSchema,
  taskSchema,
  unauthorized,
  unprocessable,
  wrapped,
} from '#openapi/tasks'
import { TASK_STATUSES } from '#models/task'

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
      'Una sola lista, la misma para cualquier cuenta que pida el mismo alcance, ordenada de la más reciente a la más antigua. Llega entera: no se pagina ni se recorta. Sin `status` el alcance son las pendientes y las que están en curso — no es «todas», porque las hechas quedan fuera.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Acota la lista a un único estado. Su ausencia significa la vista por defecto (pendientes y en curso), no «todas». Un valor fuera del enum es un 422, nunca una lista vacía.',
    schema: { type: 'string', enum: [...TASK_STATUSES] },
  })
  @ApiResponse({
    status: 200,
    description:
      'La lista del alcance pedido. Ninguna tarea trae fecha de vencimiento ni condición de vencida. Una lista vacía es una respuesta legítima con esta misma forma, no un error.',
    schema: wrapped({ type: 'array', items: taskSchema }),
  })
  @ApiResponse(unauthorized())
  @ApiResponse(
    unprocessable(
      'El `status` pedido no es ninguno de los tres del dominio. Se señala el campo `status`, y no se responde con una lista vacía: pedir algo que no existe y no encontrar nada tienen que ser distinguibles desde fuera.'
    )
  )
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
      'La única lectura que informa del vencimiento, y por eso la única que exige el día de quien mira. No comprueba quién es el responsable: una tarea ajena llega entera igual que una propia.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'today',
    required: true,
    description:
      'El día de hoy de quien consulta, en `AAAA-MM-DD`. Es obligatorio y no tiene valor por defecto: el servidor no sustituye el día que falte por el de su propio reloj, porque eso daría la lectura equivocada a quien mire desde otro huso.',
    schema: { type: 'string', format: 'date', example: '2026-08-25' },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea con su fecha de vencimiento —o la ausencia de ella— y su condición de vencida ya resuelta contra el `today` recibido.',
    schema: wrapped(taskDetailSchema),
  })
  @ApiResponse(unauthorized())
  @ApiResponse(notFound())
  @ApiResponse(
    unprocessable(
      'Falta el `today` o no es una fecha válida del calendario. No se devuelve ninguna tarea.'
    )
  )
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
      'Crear cuesta un título y nada más. El responsable y el estado los pone el sistema: si el cuerpo trae `status`, un responsable o una fecha de vencimiento, esos valores se ignoran y la tarea se crea igualmente a nombre de quien la envía, pendiente y sin fecha.',
  })
  @ApiBearerAuth()
  @ApiBody({
    description: 'El título es el único dato que se lee del cuerpo.',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description:
            'Se recortan los espacios de los extremos antes de comprobar nada, así que un título de solo espacios se rechaza igual que uno vacío. El máximo se comprueba sobre el título ya recortado y superarlo es un error, nunca un recorte silencioso.',
          example: 'Revisar el informe',
        },
      },
      required: ['title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'La tarea recién creada, pendiente y a nombre de quien la ha creado.',
    schema: wrapped(taskSchema),
  })
  @ApiResponse(unauthorized())
  @ApiResponse(
    unprocessable(
      'El título falta, está vacío, es solo espacios o supera los 200 caracteres. No se crea ninguna tarea.'
    )
  )
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
