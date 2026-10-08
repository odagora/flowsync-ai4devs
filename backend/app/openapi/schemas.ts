import { TASK_STATUSES } from '#models/task'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

/**
 * Esquemas del documento OpenAPI que se repiten entre operaciones. Cada clase
 * acaba una sola vez en `components.schemas`, con el nombre de la clase, y las
 * operaciones la referencian con `$ref`.
 *
 * Describen lo que el código **ya** devuelve, no lo que debería: cada forma
 * calca un transformer de `app/transformers/` o un validador de
 * `app/validators/`. Si uno de ellos cambia, el esquema de aquí tiene que
 * cambiar con él, porque nada los ata por tipos.
 *
 * Todos los tipos van explícitos: el `design:type` que inferiría el decorador
 * no distingue un entero de un número ni sabe que un campo es nulable.
 */

const DATE_TIME = { type: 'string', format: 'date-time' } as const

/** Un día del calendario, `AAAA-MM-DD`, sin hora ni huso. */
const CALENDAR_DAY = {
  type: 'string',
  format: 'date',
  example: '2026-09-30',
} as const

/** Calca `TaskAssigneeTransformer`: lo justo para identificar al responsable. */
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
 * Calca `TaskTransformer`: la tarea tal y como sale en la lista, al crearla y
 * al cambiarle el estado. No lleva fecha de vencimiento ni condición de
 * vencida.
 */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty(DATE_TIME)
  declare createdAt: string

  @ApiProperty(DATE_TIME)
  declare updatedAt: string

  @ApiProperty({ type: () => TaskAssignee })
  declare assignee: TaskAssignee
}

/**
 * Calca `TaskDetailTransformer`: la tarea suelta, con su fecha de vencimiento y
 * su condición de vencida resuelta contra el día de referencia de la petición.
 */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({
    ...CALENDAR_DAY,
    nullable: true,
    description: 'Nula si la tarea no tiene fecha de vencimiento.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Si tiene fecha, esa fecha es anterior al día de referencia y la tarea no está en `done`.',
  })
  declare isOverdue: boolean

  @ApiProperty(DATE_TIME)
  declare createdAt: string

  @ApiProperty(DATE_TIME)
  declare updatedAt: string

  @ApiProperty({ type: () => TaskAssignee })
  declare assignee: TaskAssignee
}

/*
|--------------------------------------------------------------------------
| Envoltorios de respuesta
|--------------------------------------------------------------------------
|
| `providers/api_provider.ts` envuelve toda respuesta de `serialize()` en
| `{ data: ... }`, así que ninguna operación devuelve el objeto pelado.
|
*/

export class TaskResponse {
  @ApiProperty({ type: () => Task })
  declare data: Task
}

export class TaskListResponse {
  @ApiProperty({ type: () => [Task] })
  declare data: Task[]
}

export class TaskDetailResponse {
  @ApiProperty({ type: () => TaskDetail })
  declare data: TaskDetail
}

/*
|--------------------------------------------------------------------------
| Errores
|--------------------------------------------------------------------------
*/

/** Un error de VineJS, con el campo que lo provoca. */
export class ValidationErrorItem {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiProperty({ type: 'string', example: 'required' })
  declare rule: string

  @ApiProperty({ type: 'string', example: 'title' })
  declare field: string

  @ApiPropertyOptional({
    type: 'object',
    description: 'Datos de la regla, como `choices` en `enum` o `min` en `minLength`.',
  })
  declare meta?: Record<string, unknown>
}

/** Lo que devuelve un `422`. */
export class ValidationError {
  @ApiProperty({ type: () => [ValidationErrorItem] })
  declare errors: ValidationErrorItem[]
}

export class ErrorMessage {
  @ApiProperty({ type: 'string', example: 'Unauthorized access' })
  declare message: string
}

/** Lo que devuelve un `401` cuando falta el token o no es válido. */
export class UnauthorizedError {
  @ApiProperty({ type: () => [ErrorMessage] })
  declare errors: ErrorMessage[]
}

/**
 * Lo que devuelve un `404` de `findOrFail`. Fuera de producción el manejador de
 * errores añade además `name` y la traza, que no forman parte del contrato.
 */
export class NotFoundError {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string
}

/*
|--------------------------------------------------------------------------
| Cuerpos de petición
|--------------------------------------------------------------------------
*/

/** Calca `createTaskValidator`. */
export class CreateTaskBody {
  @ApiProperty({
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description:
      'Se recortan los espacios de los extremos antes de validar, así que un título de solo espacios cuenta como vacío. Cualquier otro campo del cuerpo (estado, responsable, fecha) se ignora.',
    example: 'Revisar el informe',
  })
  declare title: string
}

/** Calca `updateTaskStatusValidator`. */
export class UpdateTaskStatusBody {
  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string
}

/** Calca `setTaskDueDateValidator`. */
export class SetTaskDueDateBody {
  @ApiProperty({
    ...CALENDAR_DAY,
    nullable: true,
    description: '`null` retira la fecha; no es un error.',
  })
  declare dueDate: string | null

  @ApiProperty({
    ...CALENDAR_DAY,
    description:
      'Día de referencia de quien hace la petición, contra el que se resuelve `isOverdue` en la respuesta.',
  })
  declare today: string
}
