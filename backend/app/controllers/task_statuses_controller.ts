import Task, { TASK_STATUSES } from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ApiErrorResponse, NotFoundResponse, TaskResponse } from '#openapi/schemas'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta la cabecera `Authorization` o el token no es válido.',
  type: ApiErrorResponse,
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
      'Cualquier transición entre los tres estados, incluida la vuelta desde `done`, sobre cualquier tarea. Título y responsable no cambian.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: [...TASK_STATUSES] } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'La tarea con el estado ya cambiado.',
    type: TaskResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: NotFoundResponse,
  })
  @ApiResponse({
    status: 422,
    description: '`status` falta o no es uno de los tres estados. La tarea no cambia.',
    type: ApiErrorResponse,
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
