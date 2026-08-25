import Task from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { notFound, taskSchema, unauthorized, unprocessable, wrapped } from '#openapi/tasks'
import { TASK_STATUSES } from '#models/task'

export default class TaskStatusesController {
  /**
   * El estado es lo único mutable de una tarea en este momento, y por eso
   * tiene endpoint propio en vez de colgar de un update genérico: por ese
   * update acabarían colándose el título y el responsable, que son historias
   * que todavía no se han especificado.
   *
   * Cualquier persona con sesión puede cambiar el estado de cualquier tarea,
   * en cualquier dirección. No hay permisos por responsable ni transiciones
   * prohibidas: volver de «hecho» a «pendiente» es justamente lo que arregla
   * un clic dado por error.
   */
  @ApiOperation({
    summary: 'Cambiar el estado de una tarea',
    description:
      'Admite cualquier transición entre los tres estados, incluida la vuelta desde `done` —que es justo lo que arregla un clic dado por error—, a cualquier cuenta con sesión, sea o no la responsable. No toca el título ni el responsable.',
  })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: [...TASK_STATUSES],
          description: 'El estado de destino. Cualquier otro valor es un 422, no un estado nuevo.',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea ya en el estado pedido. No trae vencimiento: esta respuesta tiene la misma forma que las de la lista.',
    schema: wrapped(taskSchema),
  })
  @ApiResponse(unauthorized())
  @ApiResponse(notFound())
  @ApiResponse(
    unprocessable(
      'El estado pedido no es ninguno de los tres del dominio. La tarea conserva el que tenía.'
    )
  )
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status } = await request.validateUsing(updateTaskStatusValidator)

    task.status = status
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
