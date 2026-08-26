import { TASK_STATUSES } from '#models/task'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

/**
 * Las clases de este fichero no se instancian nunca ni se usan como tipos en el
 * código: existen solo para que `@foadonis/openapi` publique en
 * `components.schemas` la forma de lo que devuelve la API.
 *
 * Son el espejo de los transformers de `app/transformers/`, que son quienes
 * deciden de verdad qué sale por el cable. Si cambia un transformer hay que
 * cambiar su clase de aquí; el test de `tests/functional/openapi/` está para
 * que esa deriva se note.
 */

/**
 * El responsable tal y como acompaña a una tarea. Espejo de
 * `TaskAssigneeTransformer`: nombre e iniciales, y deliberadamente ni el email
 * ni las fechas de la cuenta —«La tarea no filtra datos de cuenta»—.
 */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description:
      'Nulo si la cuenta se registró sin nombre. Las iniciales llegan igualmente, para poder representarla sin recurrir a su email.',
  })
  declare fullName: string | null

  @ApiProperty({ type: 'string', example: 'AL' })
  declare initials: string
}

/**
 * Una tarea tal y como la lleva la lista. Espejo de `TaskTransformer`.
 *
 * NO tiene `dueDate` ni `isOverdue`, y no es un olvido: «La lista no lleva el
 * vencimiento» exige que la lista no pueda enseñarlos. Por eso hay dos esquemas
 * y no uno con campos opcionales.
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

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare updatedAt: string
}

/**
 * Una tarea abierta: lo mismo que en la lista más su vencimiento. Espejo de
 * `TaskDetailTransformer`.
 */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    example: '2026-09-30',
    description:
      'Un día del calendario, sin hora ni huso. Nulo cuando la tarea no tiene fecha, que es el estado normal y no un dato a medio rellenar.',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Resuelto por el servidor contra el `today` de la petición: hay fecha, esa fecha es anterior a ese día, y la tarea no está en `done`. Quien consume no compara fechas.',
  })
  declare isOverdue: boolean

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare updatedAt: string
}

/**
 * El envoltorio `{ data: ... }` que pone `ApiSerializer` en
 * `providers/api_provider.ts` a toda respuesta con éxito.
 */
export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

export class TaskListResponse {
  @ApiProperty({
    type: [Task],
    description:
      'La lista entera del alcance pedido, de la más reciente a la más antigua. No se pagina ni se recorta, y vacía es una respuesta legítima.',
  })
  declare data: Task[]
}

export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/**
 * Un error de VineJS. `field` es lo que permite colocar el aviso bajo su campo,
 * y lo que hace que pedir un estado inventado sea distinguible de que no haya
 * ninguna tarea en un estado válido.
 */
export class ValidationError {
  @ApiProperty({ type: 'string', example: 'The selected status is invalid' })
  declare message: string

  @ApiPropertyOptional({ type: 'string', example: 'enum' })
  declare rule: string

  @ApiPropertyOptional({ type: 'string', example: 'status' })
  declare field: string

  @ApiPropertyOptional({
    type: 'object',
    description:
      'Datos de la regla que ha fallado. Para `enum`, las opciones válidas en `choices`.',
  })
  declare meta: Record<string, unknown>
}

export class ValidationErrorResponse {
  @ApiProperty({ type: [ValidationError] })
  declare errors: ValidationError[]
}

export class ApiErrorItem {
  @ApiProperty({ type: 'string', example: 'Unauthorized access' })
  declare message: string
}

export class ErrorResponse {
  @ApiProperty({ type: [ApiErrorItem] })
  declare errors: ApiErrorItem[]
}
