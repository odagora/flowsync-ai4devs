import type { OpenAPIV3 } from 'openapi-types'
import type { TaskStatus } from '#models/task'

/**
 * Las piezas del documento OpenAPI que se repiten entre operaciones: los
 * objetos que devuelve la API y los envoltorios en los que viajan.
 *
 * Viven aquí y no dentro de cada controlador porque `config/openapi.ts` las
 * publica en `components.schemas`, de modo que el documento las describe una
 * sola vez y cada respuesta las referencia. Este fichero se carga con la
 * configuración, antes de que arranque la aplicación, así que no importa nada
 * en tiempo de ejecución: solo tipos, que desaparecen al compilar.
 */

/**
 * Los tres estados del dominio. Se escriben aquí como dato del documento, pero
 * el `satisfies` contra el tipo del modelo es un import **de solo tipo**: si
 * alguno se renombra allí, esto deja de compilar. Sin él, el documento podría
 * seguir anunciando un estado que ya no existe.
 */
export const TASK_STATUS_VALUES = [
  'pending',
  'in_progress',
  'done',
] as const satisfies readonly TaskStatus[]

const ref = (name: string): OpenAPIV3.ReferenceObject => ({
  $ref: `#/components/schemas/${name}`,
})

/**
 * Un objeto suelto envuelto como lo envuelve `serialize()`: bajo `data`.
 */
export const dataOf = (name: string): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: { data: ref(name) },
  required: ['data'],
})

/**
 * Una colección envuelta igual. Sin metadatos de paginación a propósito: la
 * lista llega entera en una sola respuesta.
 */
export const dataListOf = (name: string): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(name) } },
  required: ['data'],
})

/**
 * El cuerpo de un error de validación (`422`) o de sesión (`401`): una lista
 * de errores bajo `errors`. Es el formato que VineJS y el guard emiten siempre,
 * corra o no la aplicación en modo depuración.
 */
export const errorsOf = (example: unknown): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: { errors: { type: 'array', items: ref('ApiError') } },
  required: ['errors'],
  example,
})

/**
 * El cuerpo de los errores que no traen `errors`, como el `404` de una tarea
 * que no existe: los pinta el manejador genérico de AdonisJS, y fuera de
 * producción añade además la traza. Es una forma distinta de la de arriba y se
 * documenta como tal: darlas por iguales le costaría un `undefined` a quien
 * lea `errors[0].message` en esta respuesta.
 */
export const messageOf = (example: unknown): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: { message: { type: 'string', example: 'Row not found' } },
  required: ['message'],
  description:
    'En modo depuración esta respuesta llega enriquecida con la traza del error; en producción es solo el mensaje.',
  example,
})

export const openApiSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  /**
   * El responsable tal y como viaja junto a una tarea: lo justo para
   * identificarlo. El email no está, y su ausencia es el requisito «Lo que
   * cada tarea muestra de su responsable», no un olvido.
   */
  TaskAssignee: {
    type: 'object',
    description:
      'El responsable de una tarea: nombre e iniciales, lo justo para identificarlo. No incluye el email ni ningún otro dato de la cuenta.',
    properties: {
      id: { type: 'integer', example: 12 },
      fullName: {
        type: 'string',
        nullable: true,
        description:
          'Nulo cuando la cuenta se registró sin nombre. Las iniciales siguen llegando, para poder representarlo sin recurrir a su email.',
        example: 'Ada Lovelace',
      },
      initials: { type: 'string', example: 'AL' },
    },
    required: ['id', 'fullName', 'initials'],
  },

  /**
   * La tarea de la lista. Que no lleve `dueDate` ni `isOverdue` es deliberado:
   * la lista no informa del vencimiento, y por eso es otro objeto y no una
   * versión de `TaskDetail` con campos opcionales.
   */
  Task: {
    type: 'object',
    description:
      'Una tarea tal y como la devuelven la lista, la creación y el cambio de estado. No lleva fecha de vencimiento ni condición de vencida: eso solo lo informa la consulta de una tarea suelta.',
    properties: {
      id: { type: 'integer', example: 42 },
      title: { type: 'string', minLength: 1, maxLength: 200, example: 'Revisar el informe' },
      status: { type: 'string', enum: [...TASK_STATUS_VALUES], example: 'pending' },
      assignee: ref('TaskAssignee'),
      createdAt: { type: 'string', format: 'date-time', example: '2026-08-26T09:12:00.000+00:00' },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        example: '2026-08-26T09:12:00.000+00:00',
      },
    },
    required: ['id', 'title', 'status', 'assignee', 'createdAt', 'updatedAt'],
  },

  /**
   * La tarea suelta: lo mismo que en la lista, más su fecha y su condición de
   * vencida ya resuelta contra el día que indica quien consulta.
   */
  TaskDetail: {
    description:
      'Una tarea con todo lo que tiene: lo mismo que en la lista, más su fecha de vencimiento y su condición de vencida.',
    allOf: [
      ref('Task'),
      {
        type: 'object',
        properties: {
          dueDate: {
            type: 'string',
            format: 'date',
            nullable: true,
            description:
              'Un día del calendario, sin hora ni huso. Nulo cuando la tarea no tiene fecha, que es su estado normal y no un dato a medio rellenar.',
            example: '2026-09-30',
          },
          isOverdue: {
            type: 'boolean',
            description:
              'Resuelto por el servidor contra el `today` de la petición: hay fecha, es anterior a ese día y la tarea no está hecha. Quien consume la API no compara fechas.',
            example: false,
          },
        },
        required: ['dueDate', 'isOverdue'],
      },
    ],
  },

  /**
   * Un error suelto de los que viajan en `errors`. `rule` y `field` solo
   * aparecen en los errores de validación; los demás traen únicamente el
   * mensaje.
   */
  ApiError: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'The title field must be defined' },
      rule: {
        type: 'string',
        description: 'Regla de validación incumplida. Solo en los errores de validación.',
        example: 'required',
      },
      field: {
        type: 'string',
        description: 'Campo que la incumple. Solo en los errores de validación.',
        example: 'title',
      },
      meta: {
        type: 'object',
        description: 'Datos de la regla, como el mínimo o el máximo incumplidos.',
        additionalProperties: true,
      },
    },
    required: ['message'],
  },
}
