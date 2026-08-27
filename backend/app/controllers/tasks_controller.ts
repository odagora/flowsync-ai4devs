import Task, { DEFAULT_LIST_STATUSES, TASK_STATUSES } from '#models/task'
import {
  createTaskValidator,
  listTasksValidator,
  taskReferenceDayValidator,
  toCalendarDay,
} from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@foadonis/openapi/decorators'
import { dataListOf, dataOf, errorsOf, messageOf } from '#openapi/schemas'
import TaskTransformer from '#transformers/task_transformer'
import TaskDetailTransformer from '#transformers/task_detail_transformer'

/**
 * El `401` se declara en la clase y no en cada método: las tres operaciones
 * cuelgan del mismo `middleware.auth()`, así que la respuesta es la misma y
 * repetirla tres veces sería la forma de que algún día dejaran de coincidir.
 */
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o ya no vale. No se devuelve ninguna tarea.',
  schema: errorsOf({ errors: [{ message: 'Unauthorized access' }] }),
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
      'Una sola lista, la misma para cualquier cuenta que pida el mismo alcance, de la más reciente a la más antigua y sin paginar. Consultarla no cambia ninguna tarea.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Acota la lista a un único estado. Su ausencia es la vista por defecto —pendientes y en curso—, que no es «todas»: lo hecho se queda fuera y se alcanza pidiendo `status=done`.',
    enum: [...TASK_STATUSES],
  })
  @ApiResponse({
    status: 200,
    description:
      'Las tareas del alcance pedido, enteras y en una sola respuesta. Un estado válido sin tareas devuelve una lista vacía, que es una respuesta legítima y no un error.',
    schema: dataListOf('Task'),
  })
  @ApiResponse({
    status: 422,
    description:
      'El `status` pedido no es ninguno de los tres estados. Pedir algo que no existe se rechaza; nunca se responde con una lista vacía, que se confundiría con no haber encontrado nada.',
    schema: errorsOf({
      errors: [
        {
          message: 'The selected status is invalid',
          rule: 'enum',
          field: 'status',
          meta: { choices: [...TASK_STATUSES] },
        },
      ],
    }),
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
      'La única lectura que informa del vencimiento, y por eso la única que exige el día de quien mira. No comprueba quién es el responsable: cualquier cuenta con sesión la recibe entera.',
  })
  @ApiQuery({
    name: 'today',
    required: true,
    description:
      'El día de quien consulta, en `AAAA-MM-DD`. No tiene valor por defecto a propósito: usar el día del servidor daría la lectura equivocada a quien mire desde otro huso, y ese fallo solo se vería lejos.',
    schema: { type: 'string', format: 'date', example: '2026-08-26' },
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea, con su fecha de vencimiento —o su ausencia— y su condición de vencida.',
    schema: dataOf('TaskDetail'),
  })
  @ApiResponse({
    status: 404,
    description: 'No hay ninguna tarea con ese identificador.',
    schema: messageOf({ message: 'Row not found' }),
  })
  @ApiResponse({
    status: 422,
    description: 'Falta el día de referencia o no es una fecha que exista.',
    schema: errorsOf({
      errors: [{ message: 'The today field must be defined', rule: 'required', field: 'today' }],
    }),
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
      'El título es lo único que se pide. El responsable —quien envía la petición— y el estado inicial los pone el sistema: si vienen en el cuerpo, se ignoran. La tarea nace sin fecha de vencimiento.',
  })
  @ApiBody({
    description: 'El título, y nada más.',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description:
            'Se le recortan los espacios de los extremos antes de comprobar la longitud, de modo que un título de solo espacios se rechaza igual que uno vacío. Pasarse de 200 es un error, nunca un recorte.',
          example: 'Revisar el informe',
        },
      },
      required: ['title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'La tarea ya creada, a nombre de quien la envía y en estado `pending`.',
    schema: dataOf('Task'),
  })
  @ApiResponse({
    status: 422,
    description:
      'El título falta, está vacío, es solo espacios o se pasa de 200 caracteres. No se crea ninguna tarea ni se guarda ninguna versión recortada.',
    schema: errorsOf({
      errors: [{ message: 'The title field must be defined', rule: 'required', field: 'title' }],
    }),
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
