import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Una tarea tal y como la lleva la lista.
 *
 * El responsable va por `TaskAssigneeTransformer` y no por `UserTransformer`:
 * el requisito «Lo que cada tarea muestra de su responsable» pide el nombre y
 * las iniciales, y prohíbe exponer junto a la tarea ningún otro dato de esa
 * cuenta, en particular su email. `UserTransformer` incluye el email y las
 * fechas de la cuenta, así que reutilizarlo aquí filtraba los tres.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
