import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import { ErrorResponse, TaskDetailResponse, ValidationErrorResponse } from '#openapi/schemas'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o no es válido. Nada cambia en el espacio.',
  type: ErrorResponse,
})
export default class TaskDueDatesController {
  /**
   * Fijar, cambiar y retirar la fecha de vencimiento son la misma operación, y
   * por eso comparten endpoint: quitar la fecha no es borrar un recurso, es
   * poner el valor «sin fecha», que es un valor legítimo del campo.
   *
   * Endpoint propio en vez de un update genérico de la tarea, por el mismo
   * motivo que el estado: por ahí se colarían el título y el responsable, que
   * este change no permite tocar.
   *
   * Cualquiera con sesión puede cambiar la fecha de cualquier tarea, igual que
   * el estado. No se comprueba quién es el responsable.
   */
  @ApiOperation({
    summary: 'Fijar, cambiar o retirar la fecha de vencimiento',
    description:
      'Las tres son la misma operación: `dueDate: null` retira la fecha y es un caso admitido, no un error. Una fecha ya pasada se acepta sin advertir nada. No toca el título, el responsable ni el estado.',
  })
  /**
   * Este cuerpo se escribe a mano en vez de salir del validador como los otros
   * dos: el JSON Schema que publica VineJS para `vine.date()` llega vacío, y el
   * de una fecha nulable llega como `type: 'null'` a secas. Derivarlo de ahí
   * documentaría que `dueDate` solo admite nulo, que es justo lo contrario de
   * lo que hace este endpoint.
   */
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dueDate: {
          type: 'string',
          format: 'date',
          nullable: true,
          example: '2026-09-30',
          description:
            'El día del calendario en que vence, o `null` para retirarle la fecha. La clave viaja siempre; `null` es un valor, no la ausencia del dato.',
        },
        today: {
          type: 'string',
          format: 'date',
          example: '2026-08-26',
          description:
            'El día de referencia de quien pide el cambio. Va aquí porque la respuesta devuelve la tarea con su condición de vencida ya resuelta: aplazar una tarea vencida tiene que dejar de mostrarla vencida en esta misma respuesta.',
        },
      },
      required: ['dueDate', 'today'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea ya actualizada, con su condición de vencida resuelta contra `today`.',
    type: TaskDetailResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'La fecha es imposible o está mal formada (`2026-02-31`, `30/09/2026`), o falta `today`. La tarea conserva intacta la fecha que tuviera.',
    type: ValidationErrorResponse,
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { today, dueDate } = await request.validateUsing(setTaskDueDateValidator)

    // El `DateTime` del validador se queda aquí: hacia dentro, una fecha de
    // vencimiento es un día en texto y nunca un instante.
    task.dueDate = dueDate === null ? null : toCalendarDay(dueDate)
    await task.save()
    await task.load('assignee')

    // Se devuelve ya resuelta contra el día de quien pide, para que aplazar una
    // tarea vencida deje de mostrarla vencida en esta misma respuesta.
    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }
}
