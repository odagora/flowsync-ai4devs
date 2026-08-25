import { TASK_STATUSES } from '#models/task'
import type { OpenAPIV3 } from 'openapi-types'

/**
 * Las piezas del contrato de `tasks` tal y como el documento OpenAPI las
 * publica. Viven aquí y no repartidas por los controladores porque la misma
 * tarea aparece en cinco operaciones y describirla cinco veces es garantizar
 * que las cinco acaben diciendo cosas distintas.
 *
 * El documento se emite en OpenAPI **3.0.0**, así que lo nulable se expresa con
 * `nullable: true` y no con `type: ['string', 'null']`, que es sintaxis de 3.1 y
 * aquí no significaría nada.
 *
 * Estas formas describen lo que devuelven los transformers de
 * `app/transformers/`. Si un transformer cambia, esto cambia con él: son la
 * misma respuesta contada dos veces, y esa es la única duplicación que el
 * paquete no puede evitarnos mientras los modelos no lleven `@ApiProperty`.
 */

/**
 * El responsable tal y como lo publica `TaskAssigneeTransformer`.
 *
 * Que aquí no aparezca `email` no es un olvido: la spec exige que la tarea no
 * filtre datos de la cuenta, y el documento es donde esa promesa se hace
 * pública. Añadir el email aquí sería anunciar una fuga que el transformer no
 * comete.
 */
export const assigneeSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  description:
    'Lo justo para identificar a quien lleva la tarea. No incluye el email de la cuenta.',
  properties: {
    id: { type: 'integer', example: 1 },
    fullName: {
      type: 'string',
      nullable: true,
      description: 'Nulo si la cuenta se registró sin nombre. Las iniciales llegan igualmente.',
      example: 'Ada Lovelace',
    },
    initials: { type: 'string', example: 'AL' },
  },
  required: ['id', 'fullName', 'initials'],
}

const statusSchema: OpenAPIV3.SchemaObject = {
  type: 'string',
  enum: [...TASK_STATUSES],
  description: 'Los tres estados del dominio. No se añaden, ni se renombran, ni se eliminan.',
}

/**
 * La tarea tal y como la publica `TaskTransformer`: lo que va en la lista.
 *
 * No lleva `dueDate` ni `isOverdue`, y esa ausencia es el contrato: la lista no
 * informa del vencimiento, de modo que ninguna vista construida sobre ella
 * pueda enseñarlo. Para eso está `taskDetailSchema`.
 */
export const taskSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    title: { type: 'string', maxLength: 200, example: 'Revisar el informe' },
    status: statusSchema,
    assignee: assigneeSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['id', 'title', 'status', 'assignee', 'createdAt', 'updatedAt'],
}

/**
 * La tarea con todo lo que tiene, tal y como la publica `TaskDetailTransformer`:
 * lo que devuelve la consulta de una tarea suelta.
 *
 * `isOverdue` llega resuelto. Quien consume la API no compara fechas: la regla
 * de vencimiento vive en el servidor y se decide contra el día que le manden.
 */
export const taskDetailSchema: OpenAPIV3.SchemaObject = {
  ...taskSchema,
  properties: {
    ...taskSchema.properties,
    dueDate: {
      type: 'string',
      format: 'date',
      nullable: true,
      description: 'Un día del calendario, sin hora ni huso. Nulo si la tarea no tiene fecha.',
      example: '2026-09-30',
    },
    isOverdue: {
      type: 'boolean',
      description:
        'Resuelto por el servidor contra el `today` de la petición: hay fecha, es anterior a ese día, y la tarea no está hecha.',
    },
  },
  required: [...(taskSchema.required ?? []), 'dueDate', 'isOverdue'],
}

/**
 * El envoltorio `{ data: ... }` que `providers/api_provider.ts` pone en toda
 * respuesta correcta.
 */
export const wrapped = (schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties: { data: schema },
  required: ['data'],
})

/**
 * La forma de los errores de la API: `{ "errors": [...] }`. El `field` y el
 * `rule` solo viajan en los errores de validación; un 401 trae el mensaje a
 * secas.
 */
const errorsSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          rule: { type: 'string' },
          field: { type: 'string' },
          meta: { type: 'object' },
        },
        required: ['message'],
      },
    },
  },
  required: ['errors'],
}

/**
 * Las tres respuestas de error que comparten todas las operaciones de tareas.
 *
 * Son funciones y no constantes compartidas a propósito: el decorador guarda el
 * objeto que recibe, y compartir una misma referencia entre cinco operaciones
 * es pedir que la mutación de una se note en las otras cuatro.
 */
export const unauthorized = () => ({
  status: 401,
  description: 'Falta el token de acceso o no es válido. No se devuelve ninguna tarea.',
  schema: errorsSchema,
})

export const notFound = () => ({
  status: 404,
  description: 'No existe ninguna tarea con ese identificador.',
  schema: errorsSchema,
})

export const unprocessable = (description: string) => ({
  status: 422,
  description,
  schema: errorsSchema,
})
