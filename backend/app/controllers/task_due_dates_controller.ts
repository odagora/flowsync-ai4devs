import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { notFound, taskDetailSchema, unauthorized, unprocessable, wrapped } from '#openapi/tasks'

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
      'Las tres cosas son la misma operación y por eso comparten endpoint: quitar la fecha no es borrar un recurso, es poner el valor «sin fecha», que es un valor legítimo del campo. Una fecha ya pasada se acepta sin advertir nada. No exige ser el responsable, y no toca el título, el responsable ni el estado.',
  })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dueDate: {
          type: 'string',
          format: 'date',
          nullable: true,
          description:
            'El día de vencimiento en `AAAA-MM-DD`, o `null` para retirarlo. `null` es una operación admitida y no un error.',
          example: '2026-09-30',
        },
        today: {
          type: 'string',
          format: 'date',
          description:
            'El día de hoy de quien hace el cambio. Va aquí porque la respuesta devuelve la tarea con su condición de vencida ya resuelta: aplazar una tarea vencida tiene que dejar de mostrarla vencida en esta misma respuesta.',
          example: '2026-08-25',
        },
      },
      required: ['dueDate', 'today'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea con la fecha ya puesta, cambiada o retirada, y su condición de vencida recalculada.',
    schema: wrapped(taskDetailSchema),
  })
  @ApiResponse(unauthorized())
  @ApiResponse(notFound())
  @ApiResponse(
    unprocessable(
      'La fecha es imposible o está mal formada, o falta el `today`. La tarea conserva intacta la fecha que tuviera antes.'
    )
  )
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
