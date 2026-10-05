import { TASK_STATUSES } from '#models/task'
import { ApiProperty } from '@foadonis/openapi/decorators'

/**
 * Esquemas OpenAPI compartidos por los controladores de tareas.
 *
 * Cada clase decorada con `@ApiProperty` se publica una sola vez en
 * `components.schemas`, con el nombre de la clase, y las operaciones la
 * referencian con `$ref`. Son clases solo de documentación: nadie las instancia,
 * y lo que la API devuelve de verdad lo deciden los transformers. Por eso cada
 * una dice de qué transformer es copia, y si el transformer cambia, cambia ella.
 */

/**
 * Los tres estados del dominio, sacados del modelo para que el documento no
 * pueda quedarse con una lista distinta de la que valida el código.
 */
export const taskStatusSchema = {
  type: 'string' as const,
  enum: [...TASK_STATUSES],
}

/** Un día del calendario, sin hora ni huso: `AAAA-MM-DD`. */
export const calendarDaySchema = {
  type: 'string' as const,
  format: 'date',
  example: '2026-09-30',
}

/** Copia de `TaskAssigneeTransformer`: sin email ni ningún otro dato de la cuenta. */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Nulo si la cuenta se registró sin nombre.',
  })
  declare fullName: string | null

  @ApiProperty({ type: 'string', example: 'AL' })
  declare initials: string
}

/**
 * Copia de `TaskTransformer`: la tarea tal y como sale en la lista, en el alta y
 * en el cambio de estado. No lleva la fecha de vencimiento ni la condición de
 * vencida, y eso es lo que la separa de `TaskDetail`.
 */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/**
 * Copia de `TaskDetailTransformer`: la tarea suelta, con su fecha de vencimiento
 * y su condición de vencida resuelta contra el `today` de la petición.
 */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({
    schema: {
      ...calendarDaySchema,
      nullable: true,
      description: 'Nula cuando la tarea no tiene fecha de vencimiento.',
    },
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Vencida para el día `today` de la petición: tiene fecha, esa fecha es anterior a `today` y la tarea no está hecha.',
  })
  declare isOverdue: boolean

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/** El sobre `{ data }` que pone `ApiSerializer` alrededor de una tarea. */
export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

/** El sobre `{ data }` de la lista: un array, vacío si no hay nada en el alcance. */
export class TaskListResponse {
  @ApiProperty({ type: [Task] })
  declare data: Task[]
}

/** El sobre `{ data }` de una tarea suelta. */
export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/**
 * Un error de la lista `errors`. Los de VineJS (422) traen `field` y `rule`, y
 * algunos `meta` (los valores admitidos o la longitud máxima); el de sesión (401)
 * trae solo `message`.
 */
export class ErrorDetail {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiProperty({ type: 'string', required: false, example: 'title' })
  declare field?: string

  @ApiProperty({ type: 'string', required: false, example: 'maxLength' })
  declare rule?: string

  @ApiProperty({ type: 'object', required: false })
  declare meta?: Record<string, unknown>
}

/** Respuesta de error de validación (422) y de sesión (401). */
export class ErrorResponse {
  @ApiProperty({ type: [ErrorDetail] })
  declare errors: ErrorDetail[]
}

/**
 * Respuesta de `findOrFail` cuando la tarea no existe (404). Es la forma con la
 * depuración apagada; en desarrollo el manejador de errores devuelve en su lugar
 * el volcado de Youch.
 */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string
}
