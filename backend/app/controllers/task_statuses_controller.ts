import Task from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ErrorResponse, TaskResponse, ValidationErrorResponse } from '#openapi/schemas'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o no es válido. Nada cambia en el espacio.',
  type: ErrorResponse,
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
      'Admite cualquier transición entre los tres estados, incluida la vuelta desde `done`, y a cualquier cuenta con sesión, sea o no la responsable. No toca el título ni el responsable. Tiene endpoint propio precisamente para que por él no puedan colarse.',
  })
  // El cuerpo sale del validador, así que el enum de los tres estados se
  // publica desde el mismo sitio que lo aplica.
  @ApiBody({ type: updateTaskStatusValidator })
  @ApiResponse({
    status: 200,
    description: 'La tarea ya en el nuevo estado, tal y como la devuelve la lista.',
    type: TaskResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'El estado pedido no es ninguno de los tres. La tarea conserva el que tenía y el estado inventado no pasa a existir.',
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
