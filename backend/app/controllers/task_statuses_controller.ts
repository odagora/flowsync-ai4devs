import Task from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import {
  NotFoundResponse,
  TaskResponse,
  UnauthorizedResponse,
  UpdateTaskStatusBody,
  ValidationErrorResponse,
} from '#openapi/schemas'

@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin token válido.', type: UnauthorizedResponse })
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
  @ApiOperation({ summary: 'Cambiar el estado de cualquier tarea' })
  @ApiBody({ type: UpdateTaskStatusBody })
  @ApiResponse({ status: 200, type: TaskResponse })
  @ApiResponse({ status: 404, description: 'La tarea no existe.', type: NotFoundResponse })
  @ApiResponse({
    status: 422,
    description: 'Estado distinto de los tres del dominio.',
    type: ValidationErrorResponse,
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
