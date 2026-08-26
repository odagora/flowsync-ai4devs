import { test } from '@japa/runner'

/**
 * El documento OpenAPI es el contrato que se publica de la API, así que lo que
 * dice tiene que seguir siendo verdad. Este fichero no prueba la API: prueba lo
 * que el documento cuenta de ella, y existe porque las clases de
 * `app/openapi/schemas.ts` son el espejo de los transformers y nada obliga a
 * los dos a moverse a la vez.
 *
 * Cada test nombra el scenario de `openspec/specs/tasks/spec.md` que sostiene.
 *
 * Ojo con los parámetros de ruta: `@foadonis/openapi` añade el `id` una vez por
 * cada vez que reconstruye el documento, así que fuera de producción salen
 * repetidos. Por eso aquí nunca se cuenta cuántos hay, solo se busca el que
 * interesa.
 */
test.group('OpenAPI | lo que el documento dice de las tareas', () => {
  async function documento(client: any) {
    const response = await client.get('/api.json')
    response.assertStatus(200)

    return response.body()
  }

  const operacion = (doc: any, metodo: string, ruta: string) => doc.paths[ruta]?.[metodo]

  const parametro = (op: any, sitio: string, nombre: string) =>
    (op.parameters ?? []).find((p: any) => p.in === sitio && p.name === nombre)

  /** El esquema al que apunta un `$ref`, ya resuelto contra `components`. */
  const resolver = (doc: any, ref: string) => doc.components.schemas[ref.split('/').pop()!]

  const respuesta = (doc: any, op: any, status: number) => {
    const esquema = op.responses?.[status]?.content?.['application/json']?.schema
    return esquema?.$ref ? resolver(doc, esquema.$ref) : esquema
  }

  /**
   * «Filtrar por un estado concreto» y «Un solo estado por petición»: el
   * contrato tiene que decir que existe el parámetro, que admite exactamente
   * los tres estados y que es opcional.
   */
  test('la lista declara el filtro por estado con los tres estados y opcional', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)
    const status = parametro(operacion(doc, 'get', '/api/v1/tasks'), 'query', 'status')

    assert.isObject(status, 'la lista no declara el parámetro `status`')
    assert.deepEqual(status.schema.enum, ['pending', 'in_progress', 'done'])
    assert.notOk(status.required, 'el filtro tiene que poder no pedirse')
  })

  /**
   * «Estado inventado» y «El error no se confunde con la ausencia»: el
   * documento tiene que declarar los dos desenlaces y que son distintos.
   */
  test('la lista declara el 422 del estado inventado además del 200 vacío', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)
    const lista = operacion(doc, 'get', '/api/v1/tasks')

    assert.containsSubset(Object.keys(lista.responses), ['200', '422'])

    const error = resolver(doc, respuesta(doc, lista, 422).properties.errors.items.$ref)
    assert.property(
      error.properties,
      'field',
      'el 422 tiene que señalar el campo, que es lo que lo distingue de una lista vacía'
    )
  })

  /**
   * «La lista calla sobre el vencimiento»: la forma que publica la lista no
   * puede traer ni la fecha ni la condición de vencida, y la de la tarea
   * suelta sí. Son dos esquemas distintos a propósito.
   */
  test('la forma de la lista no lleva el vencimiento y la de la tarea suelta sí', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)

    const enLista = respuesta(doc, operacion(doc, 'get', '/api/v1/tasks'), 200)
    const tareaDeLista = resolver(doc, enLista.properties.data.items.$ref)
    assert.notProperty(tareaDeLista.properties, 'dueDate')
    assert.notProperty(tareaDeLista.properties, 'isOverdue')

    const suelta = respuesta(doc, operacion(doc, 'get', '/api/v1/tasks/{id}'), 200)
    const tareaSuelta = resolver(doc, suelta.properties.data.$ref)
    assert.property(tareaSuelta.properties, 'dueDate')
    assert.property(tareaSuelta.properties, 'isOverdue')
    assert.isTrue(tareaSuelta.properties.dueDate.nullable, 'sin fecha se dice explícitamente')
  })

  /**
   * «La tarea no filtra datos de cuenta»: el documento no puede prometer del
   * responsable nada más que lo justo para identificarlo. Si alguien amplía
   * `TaskAssigneeTransformer` y actualiza el esquema sin pensar, esto salta.
   */
  test('el responsable que publica el documento son tres claves y ninguna más', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)
    const lista = respuesta(doc, operacion(doc, 'get', '/api/v1/tasks'), 200)
    const tarea = resolver(doc, lista.properties.data.items.$ref)
    const assignee = resolver(doc, tarea.properties.assignee.$ref)

    assert.deepEqual(Object.keys(assignee.properties).sort(), ['fullName', 'id', 'initials'])
    assert.isTrue(assignee.properties.fullName.nullable, 'el responsable puede no tener nombre')
  })

  /**
   * «Falta el día de referencia»: toda petición que informe del vencimiento
   * exige `today`, y el documento tiene que decir que es obligatorio.
   */
  test('el día de referencia se declara obligatorio donde se informa del vencimiento', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)

    const today = parametro(operacion(doc, 'get', '/api/v1/tasks/{id}'), 'query', 'today')
    assert.isObject(today, 'la tarea suelta no declara `today`')
    assert.isTrue(today.required, '`today` no tiene valor por defecto: o llega o es un 422')

    const cuerpo = operacion(doc, 'put', '/api/v1/tasks/{id}/due-date').requestBody.content[
      'application/json'
    ].schema
    assert.includeMembers(cuerpo.required, ['today', 'dueDate'])
    assert.isTrue(cuerpo.properties.dueDate.nullable, 'retirar la fecha es una operación admitida')
  })

  /**
   * «Las tareas exigen sesión»: las cinco operaciones piden token y declaran
   * el 401. Sin esto el documento las daría por públicas.
   */
  test('las cinco operaciones de tareas exigen token y declaran el 401', async ({
    client,
    assert,
  }) => {
    const doc = await documento(client)
    const operaciones: [string, string][] = [
      ['get', '/api/v1/tasks'],
      ['post', '/api/v1/tasks'],
      ['get', '/api/v1/tasks/{id}'],
      ['patch', '/api/v1/tasks/{id}/status'],
      ['put', '/api/v1/tasks/{id}/due-date'],
    ]

    assert.property(doc.components.securitySchemes, 'bearer')

    for (const [metodo, ruta] of operaciones) {
      const op = operacion(doc, metodo, ruta)
      assert.deepEqual(op.security, [{ bearer: [] }], `${metodo} ${ruta} no exige token`)
      assert.property(op.responses, '401', `${metodo} ${ruta} no declara el 401`)
    }
  })

  /**
   * «Tarea inexistente»: las tres operaciones que trabajan sobre una tarea
   * concreta tienen que declarar el 404.
   */
  test('las operaciones sobre una tarea concreta declaran el 404', async ({ client, assert }) => {
    const doc = await documento(client)

    for (const [metodo, ruta] of [
      ['get', '/api/v1/tasks/{id}'],
      ['patch', '/api/v1/tasks/{id}/status'],
      ['put', '/api/v1/tasks/{id}/due-date'],
    ]) {
      assert.property(operacion(doc, metodo, ruta).responses, '404', `${metodo} ${ruta}`)
    }
  })

  /**
   * «Alta con el título como único dato» y «No se admite fijar responsable ni
   * estado al crear»: el cuerpo de la creación es un título y nada más.
   */
  test('la creación solo declara el título en su cuerpo', async ({ client, assert }) => {
    const doc = await documento(client)
    const cuerpo = operacion(doc, 'post', '/api/v1/tasks').requestBody.content['application/json']
      .schema

    assert.deepEqual(Object.keys(cuerpo.properties), ['title'])
    assert.equal(cuerpo.properties.title.maxLength, 200)
    assert.property(operacion(doc, 'post', '/api/v1/tasks').responses, '201')
  })
})
