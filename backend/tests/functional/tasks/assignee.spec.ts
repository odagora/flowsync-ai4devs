import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable se identifica por su nombre y
 * sus iniciales, no se filtra ningún otro dato de su cuenta, y una cuenta sin
 * nombre sigue llegando con iniciales.
 *
 * Cada scenario se comprueba por las dos puertas por las que se obtiene una
 * tarea —suelta y dentro de la lista—, porque las sirven transformers
 * distintos y nada obliga a que digan lo mismo.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // `GET /tasks/:id` exige el día de quien mira; aquí da igual cuál sea.
  const today = '2026-10-08'

  async function sesion(client: any, fullName: string | null, email: string) {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function crearTarea(client: any, token: string, title = 'Revisar el informe') {
    const response = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title })

    response.assertStatus(201)
    return response.body().data.id as number
  }

  /**
   * El `assignee` de una tarea tal y como llega por cada puerta, mirado con el
   * token de `token`.
   */
  async function responsables(client: any, token: string, id: number) {
    const suelta = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)
    const enLista = lista.body().data.find((task: { id: number }) => task.id === id)

    return { suelta: suelta.body().data.assignee, lista: enLista?.assignee }
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const id = await crearTarea(client, ada)

    // La mira otra persona: identificar al responsable es justo lo que necesita
    // quien no lleva la tarea.
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')

    for (const [puerta, assignee] of Object.entries(await responsables(client, alan, id))) {
      assert.isObject(assignee, `la tarea ${puerta} no trae responsable`)
      assert.equal(assignee.fullName, 'Ada Lovelace', `nombre de la tarea ${puerta}`)
      assert.equal(assignee.initials, 'AL', `iniciales de la tarea ${puerta}`)
    }
  })

  test('la tarea no filtra datos de la cuenta de su responsable', async ({ client, assert }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const id = await crearTarea(client, ada)
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')

    // El requisito admite el nombre y las iniciales, «lo justo para
    // identificarlo»; el `id` es la referencia a la cuenta, no un dato suyo.
    // Cualquier otra clave es un dato de la cuenta que la tarea no debe llevar.
    const permitidas = ['id', 'fullName', 'initials']

    // Se recogen las fugas de las dos puertas antes de afirmar nada, para que
    // si fallan las dos el mensaje lo diga, y no solo la primera.
    const fugas: Record<string, string[]> = {}
    for (const [puerta, assignee] of Object.entries(await responsables(client, alan, id))) {
      assert.isObject(assignee, `la tarea ${puerta} no trae responsable`)

      const sobrantes = Object.keys(assignee).filter((clave) => !permitidas.includes(clave))
      if (JSON.stringify(assignee).includes('ada@example.com'))
        sobrantes.push('<email en un valor>')
      if (sobrantes.length > 0) fugas[puerta] = sobrantes
    }

    assert.deepEqual(fugas, {})
  })

  test('un responsable sin nombre llega con nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const anonima = await sesion(client, null, 'sin-nombre@example.com')
    const id = await crearTarea(client, anonima)

    for (const [puerta, assignee] of Object.entries(await responsables(client, anonima, id))) {
      assert.isObject(assignee, `la tarea ${puerta} no trae responsable`)
      assert.property(
        assignee,
        'fullName',
        `la tarea ${puerta} omite el nombre en vez de enviarlo nulo`
      )
      assert.isNull(assignee.fullName, `nombre de la tarea ${puerta}`)
      assert.isString(assignee.initials, `iniciales de la tarea ${puerta}`)
      assert.isNotEmpty(assignee.initials, `iniciales de la tarea ${puerta}`)
    }
  })
})
