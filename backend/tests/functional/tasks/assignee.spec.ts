import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, la tarea no
 * filtra datos de cuenta y responsable sin nombre.
 *
 * El requisito habla de «cada tarea», no de un endpoint concreto, así que cada
 * test recorre todas las respuestas que devuelven una tarea —la creación, la
 * lista, la consulta suelta, el cambio de estado y el cambio de fecha— y
 * comprueba el `assignee` de todas. Los fallos se acumulan antes de afirmar
 * nada para que el mensaje diga en qué respuestas falla, y no solo en la
 * primera.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const today = '2026-08-13'

  async function sesion(client: any, fullName: string | null, email: string) {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  /**
   * Crea una tarea con `autor` y la lee por todas las vías que devuelven una
   * tarea, con el token de `lector`. Devuelve el `assignee` de cada respuesta,
   * indexado por la vía que lo produjo.
   */
  async function assigneePorRespuesta(client: any, autor: string, lector: string) {
    const lecturas: Record<string, any> = {}

    const creada = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${autor}`)
      .json({ title: 'Revisar el informe' })
    creada.assertStatus(201)
    const id = creada.body().data.id
    lecturas['POST /tasks'] = creada.body().data.assignee

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${lector}`)
    lista.assertStatus(200)
    lecturas['GET /tasks'] = lista.body().data.find((t: any) => t.id === id)?.assignee

    const suelta = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${lector}`)
    suelta.assertStatus(200)
    lecturas['GET /tasks/:id'] = suelta.body().data.assignee

    const estado = await client
      .patch(`/api/v1/tasks/${id}/status`)
      .header('Authorization', `Bearer ${lector}`)
      .json({ status: 'in_progress' })
    estado.assertStatus(200)
    lecturas['PATCH /tasks/:id/status'] = estado.body().data.assignee

    const fecha = await client
      .put(`/api/v1/tasks/${id}/due-date`)
      .header('Authorization', `Bearer ${lector}`)
      .json({ today, dueDate: '2026-09-30' })
    fecha.assertStatus(200)
    lecturas['PUT /tasks/:id/due-date'] = fecha.body().data.assignee

    return lecturas
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')

    const lecturas = await assigneePorRespuesta(client, ada, alan)

    const fallos = Object.entries(lecturas)
      .filter(
        ([, assignee]) => assignee?.fullName !== 'Ada Lovelace' || assignee?.initials !== 'AL'
      )
      .map(([via, assignee]) => `${via} → ${JSON.stringify(assignee)}`)

    assert.deepEqual(fallos, [], 'el assignee no identifica a Ada Lovelace en estas respuestas')
  })

  test('el responsable no trae el email ni ningún otro dato de la cuenta', async ({
    client,
    assert,
  }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')

    const lecturas = await assigneePorRespuesta(client, ada, alan)

    // `id` se admite: es el identificador de la referencia, no un dato de la
    // cuenta, y `TaskAssigneeTransformer` lo expone a propósito. Cualquier otra
    // clave —email, fechas de la cuenta, contraseña— es una filtración.
    const permitidas = ['id', 'fullName', 'initials']

    const fallos = Object.entries(lecturas)
      .filter(([, assignee]) => {
        const sobrantes = Object.keys(assignee ?? {}).filter((k) => !permitidas.includes(k))
        const serializado = JSON.stringify(assignee ?? {})
        return (
          sobrantes.length > 0 ||
          serializado.includes('ada@example.com') ||
          serializado.includes('secreto123')
        )
      })
      .map(([via, assignee]) => `${via} → ${JSON.stringify(assignee)}`)

    assert.deepEqual(fallos, [], 'el assignee expone datos de la cuenta en estas respuestas')
  })

  test('un responsable sin nombre llega con nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const anonima = await sesion(client, null, 'sin-nombre@example.com')
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')

    const lecturas = await assigneePorRespuesta(client, anonima, alan)

    const fallos = Object.entries(lecturas)
      .filter(([, assignee]) => {
        const sinNombre = assignee !== undefined && assignee.fullName === null
        const conIniciales = typeof assignee?.initials === 'string' && assignee.initials !== ''
        // «Sin recurrir a su email»: el email no debe ser lo que la interfaz
        // reciba en lugar del nombre.
        const sinEmail = !JSON.stringify(assignee ?? {}).includes('sin-nombre@example.com')
        return !(sinNombre && conIniciales && sinEmail)
      })
      .map(([via, assignee]) => `${via} → ${JSON.stringify(assignee)}`)

    assert.deepEqual(fallos, [], 'el assignee sin nombre no llega como dice la spec')
  })
})
