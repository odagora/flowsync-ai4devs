import { TASK_STATUSES } from '#models/task'
import { ApiProperty } from '@foadonis/openapi/decorators'

/**
 * Esquemas que el documento OpenAPI publica una sola vez en
 * `components.schemas` y que cada operación referencia por `$ref`: el paquete
 * registra cada clase bajo su nombre la primera vez que una operación la usa.
 *
 * Describen lo que el código ya hace, no lo que debería hacer. La fuente de
 * verdad sigue estando en los transformers (forma de la respuesta), en los
 * validadores (forma de la petición) y en el exception handler (forma de los
 * errores); si uno de ellos cambia, este fichero se queda mintiendo hasta que
 * alguien lo actualice a mano.
 */

/** `TaskAssigneeTransformer`: lo justo para saber quién lleva la tarea. */
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

/** `TaskTransformer`: la tarea tal y como sale en la lista, sin vencimiento. */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', minLength: 1, maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare updatedAt: string
}

/** `TaskDetailTransformer`: la tarea suelta, con su vencimiento resuelto. */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', minLength: 1, maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'Día del calendario `AAAA-MM-DD`, sin hora ni huso. Nulo si no tiene fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Fecha estrictamente anterior al día de referencia `today` y tarea no hecha. Lo decide el servidor.',
  })
  declare isOverdue: boolean

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare updatedAt: string
}

/*
|--------------------------------------------------------------------------
| Envoltorios de respuesta
|--------------------------------------------------------------------------
|
| `serialize()` (providers/api_provider.ts) mete todo payload bajo `data`.
|
*/

export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

export class TaskListResponse {
  @ApiProperty({
    type: [Task],
    description: 'La lista entera del alcance pedido, sin paginar. Vacía es una respuesta válida.',
  })
  declare data: Task[]
}

export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/*
|--------------------------------------------------------------------------
| Cuerpos de petición (app/validators/task.ts)
|--------------------------------------------------------------------------
*/

export class CreateTaskBody {
  @ApiProperty({
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description:
      'Se recortan los espacios de los extremos antes de validar. Cualquier otro campo del cuerpo (estado, responsable, fecha) se ignora.',
  })
  declare title: string
}

export class UpdateTaskStatusBody {
  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string
}

export class SetTaskDueDateBody {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: '`AAAA-MM-DD`, o `null` para retirar la fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'string',
    format: 'date',
    description:
      'Día de referencia de quien pide (`AAAA-MM-DD`), para resolver `isOverdue` en la respuesta.',
  })
  declare today: string
}

/*
|--------------------------------------------------------------------------
| Errores
|--------------------------------------------------------------------------
|
| Formas que produce el ExceptionHandler de @adonisjs/http-server para una
| petición JSON.
|
*/

export class ValidationErrorItem {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiProperty({ type: 'string', example: 'maxLength' })
  declare rule: string

  @ApiProperty({ type: 'string', example: 'title' })
  declare field: string
}

/** 422 de VineJS: `{ errors: error.messages }`. */
export class ValidationErrorResponse {
  @ApiProperty({ type: [ValidationErrorItem] })
  declare errors: ValidationErrorItem[]
}

export class ErrorMessage {
  @ApiProperty({ type: 'string', example: 'Unauthorized access' })
  declare message: string
}

/** 401 del middleware `auth`. */
export class UnauthorizedResponse {
  @ApiProperty({ type: [ErrorMessage] })
  declare errors: ErrorMessage[]
}

/**
 * 404 de `findOrFail`, con el modo debug apagado (producción). En desarrollo el
 * handler devuelve en su lugar el JSON de Youch, con la traza.
 */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string
}
