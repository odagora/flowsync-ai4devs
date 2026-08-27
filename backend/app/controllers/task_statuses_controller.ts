import Task, { TASK_STATUSES } from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { dataOf, errorsOf, messageOf } from '#openapi/schemas'
import TaskTransformer from '#transformers/task_transformer'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o ya no vale. El estado de la tarea no cambia.',
  schema: errorsOf({ errors: [{ message: 'Unauthorized access' }] }),
})
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
      'Admite cualquier transición entre los tres estados, incluida la vuelta desde `done`, a cualquier cuenta con sesión y sea o no la responsable. El título y el responsable no se tocan. La respuesta no informa del vencimiento: para eso está la consulta de la tarea suelta.',
  })
  @ApiBody({
    description: 'El estado de destino.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: [...TASK_STATUSES],
          description: 'Uno de los tres estados del dominio. No hay más, ni se pueden crear.',
          example: 'in_progress',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea con su nuevo estado.',
    schema: dataOf('Task'),
  })
  @ApiResponse({
    status: 404,
    description: 'No hay ninguna tarea con ese identificador.',
    schema: messageOf({ message: 'Row not found' }),
  })
  @ApiResponse({
    status: 422,
    description:
      'El estado pedido no es ninguno de los tres. La tarea conserva el que tenía y el estado inventado no pasa a existir.',
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
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status } = await request.validateUsing(updateTaskStatusValidator)

    task.status = status
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
