import { TASK_STATUSES } from '#models/task'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

/**
 * Esquemas del documento OpenAPI que comparten varias operaciones de tareas.
 *
 * Cada clase se publica una sola vez en `components.schemas`, con su nombre como
 * clave, y las respuestas la referencian con `$ref`. Las clases no se instancian
 * nunca: solo describen lo que ya devuelven los transformers y el manejador de
 * errores. Si cambia un transformer, este fichero tiene que cambiar con él; nada
 * los mantiene sincronizados solos.
 */

const isoDateTime = { type: 'string', format: 'date-time' } as const

/** Reflejo de `TaskAssigneeTransformer`: nombre e iniciales, nunca el email. */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  id!: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Nulo si la cuenta se registró sin nombre.',
  })
  fullName!: string | null

  @ApiProperty({
    type: 'string',
    description: 'Siempre presente, también cuando `fullName` es nulo.',
  })
  initials!: string
}

/**
 * Reflejo de `TaskTransformer`: la tarea tal como sale en la lista, al crearla y
 * al cambiar su estado. No lleva vencimiento a propósito.
 */
export class Task {
  @ApiProperty({ type: 'integer' })
  id!: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  title!: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  status!: string

  @ApiProperty({ ...isoDateTime })
  createdAt!: string

  @ApiProperty({ ...isoDateTime, nullable: true })
  updatedAt!: string | null

  @ApiProperty({ type: TaskAssignee })
  assignee!: TaskAssignee
}

/**
 * Reflejo de `TaskDetailTransformer`: la tarea suelta, con su fecha de
 * vencimiento y su condición de vencida resuelta contra el `today` de la
 * petición.
 */
export class TaskDetail extends Task {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'Día del calendario (AAAA-MM-DD), sin hora. Nulo si la tarea no tiene fecha.',
  })
  dueDate!: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Verdadero solo si hay fecha, es anterior al `today` de la petición y la tarea no está hecha.',
  })
  isOverdue!: boolean
}

/** Envoltorio `{ data }` de `serialize()` alrededor de una tarea. */
export class TaskResponse {
  @ApiProperty({ type: Task })
  data!: Task
}

/** Envoltorio `{ data }` alrededor de una tarea suelta con su vencimiento. */
export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  data!: TaskDetail
}

/** Envoltorio `{ data }` alrededor de la lista. Una lista vacía tiene la misma forma. */
export class TaskListResponse {
  @ApiProperty({ type: [Task] })
  data!: Task[]
}

/** Un error de validación (VineJS) o de autenticación. */
export class ApiErrorItem {
  @ApiProperty({ type: 'string' })
  message!: string

  @ApiPropertyOptional({
    type: 'string',
    description: 'Regla de VineJS que ha fallado. Solo en errores de validación.',
  })
  rule?: string

  @ApiPropertyOptional({
    type: 'string',
    description: 'Campo al que se refiere el error. Solo en errores de validación.',
  })
  field?: string

  @ApiPropertyOptional({
    schema: { type: 'object', additionalProperties: true },
    description: 'Datos de la regla, por ejemplo `choices` en la regla `enum`.',
  })
  meta?: Record<string, unknown>
}

/** Forma de los `401` y los `422`: `{ errors: [...] }`. */
export class ApiErrorResponse {
  @ApiProperty({ type: [ApiErrorItem] })
  errors!: ApiErrorItem[]
}

/**
 * Forma del `404` de `findOrFail`. Fuera de producción el manejador de errores
 * añade a este objeto la traza completa; en producción solo llega `message`.
 */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  message!: string
}
