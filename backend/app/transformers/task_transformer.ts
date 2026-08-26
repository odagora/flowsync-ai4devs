import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Una tarea tal y como la devuelve la lista.
 *
 * El responsable pasa por `TaskAssigneeTransformer` y no por `UserTransformer`:
 * el segundo incluye el email y las fechas de la cuenta, y el requisito «Lo que
 * cada tarea muestra de su responsable» dice que junto a una tarea no viaja
 * ningún dato de esa cuenta más allá del nombre y las iniciales. Reutilizar
 * `UserTransformer` aquí ahorra un fichero y filtra el email de todo el equipo
 * en cada lista.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
