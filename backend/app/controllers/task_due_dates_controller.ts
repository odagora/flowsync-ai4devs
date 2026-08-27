import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { dataOf, errorsOf, messageOf } from '#openapi/schemas'
import TaskDetailTransformer from '#transformers/task_detail_transformer'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o ya no vale. La fecha de la tarea no cambia.',
  schema: errorsOf({ errors: [{ message: 'Unauthorized access' }] }),
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
      'Las tres cosas son la misma operación: retirar la fecha es mandar `null`, un valor legítimo del campo y no un error. Una fecha ya pasada se acepta sin advertencia. El título, el responsable y el estado no se tocan.',
  })
  @ApiBody({
    description: 'La fecha de destino y el día desde el que se mira.',
    schema: {
      type: 'object',
      properties: {
        dueDate: {
          type: 'string',
          format: 'date',
          nullable: true,
          description:
            'Un día del calendario. `null` retira la fecha, y es una operación admitida. La clave debe viajar siempre.',
          example: '2026-09-30',
        },
        today: {
          type: 'string',
          format: 'date',
          description:
            'El día de quien pide el cambio. Viaja también aquí porque la respuesta devuelve la condición de vencida ya resuelta: aplazar una tarea vencida tiene que dejar de mostrarla vencida en esta misma respuesta.',
          example: '2026-08-26',
        },
      },
      required: ['dueDate', 'today'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea con su nueva fecha y su condición de vencida ya resuelta.',
    schema: dataOf('TaskDetail'),
  })
  @ApiResponse({
    status: 404,
    description: 'No hay ninguna tarea con ese identificador.',
    schema: messageOf({ message: 'Row not found' }),
  })
  @ApiResponse({
    status: 422,
    description:
      'La fecha no existe o está mal formada, o falta el día de referencia. La tarea conserva intacta la fecha que tuviera.',
    schema: errorsOf({
      errors: [
        {
          message: 'The dueDate field must be a datetime value',
          rule: 'date',
          field: 'dueDate',
        },
      ],
    }),
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
