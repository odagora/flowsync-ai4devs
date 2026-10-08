import Task from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import * as schemas from '#openapi/schemas'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token o no es válido.',
  type: () => schemas.UnauthorizedError,
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
      'Cualquier transición entre los tres estados, incluida la vuelta desde `done`, sobre cualquier tarea. No toca nada más que el estado.',
  })
  @ApiBody({ type: () => schemas.UpdateTaskStatusBody })
  @ApiResponse({
    status: 200,
    description: 'La tarea con el estado nuevo.',
    type: () => schemas.TaskResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: () => schemas.NotFoundError,
  })
  @ApiResponse({
    status: 422,
    description: '`status` no es uno de los tres estados.',
    type: () => schemas.ValidationError,
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
