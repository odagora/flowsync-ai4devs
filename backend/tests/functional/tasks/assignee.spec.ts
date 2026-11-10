import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que la tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`.
 *
 * «Se obtiene una tarea» se lee en sus dos formas, la lista y la tarea suelta,
 * y cada test comprueba las dos: son transformers distintos y nada garantiza
 * que enseñen lo mismo del responsable.
 *
 * Quien mira y quien lleva la tarea son cuentas distintas a propósito: así se
 * comprueba lo que la tarea dice de su responsable, no lo que la sesión sabe
 * de sí misma.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any) {
    await User.create({
      fullName: 'Alan Turing',
      email: 'alan@example.com',
      password: 'secreto123',
    })

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'alan@example.com', password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(fullName: string | null, email: string) {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })

    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  /**
   * El `assignee` de la misma tarea leído desde la lista y desde la tarea
   * suelta, en ese orden.
   */
  async function asignadoEnAmbasLecturas(client: any, assert: any, token: string, task: Task) {
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)
    assert.exists(enLista, 'la tarea no aparece en la lista')

    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-11-10' })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    return [enLista.assignee, suelta.body().data.assignee]
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const task = await tareaDe('Ada Lovelace', 'ada@example.com')

    for (const assignee of await asignadoEnAmbasLecturas(client, assert, token, task)) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('la tarea no filtra el email ni los datos de acceso del responsable', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const task = await tareaDe('Ada Lovelace', 'ada@example.com')

    const [enLista, suelta] = await asignadoEnAmbasLecturas(client, assert, token, task)

    // La tarea suelta va primero: si la lista falla, el fallo dice además que
    // la suelta ya pasó, en vez de dejarla sin comprobar.
    assert.notAnyProperties(suelta, ['email', 'password'], 'la tarea suelta expone datos de acceso')
    assert.notAnyProperties(enLista, ['email', 'password'], 'la lista expone datos de acceso')
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const task = await tareaDe(null, 'sin-nombre@example.com')

    for (const assignee of await asignadoEnAmbasLecturas(client, assert, token, task)) {
      assert.property(assignee, 'fullName')
      assert.isNull(assignee.fullName)
      assert.isString(assignee.initials)
      assert.isNotEmpty(assignee.initials)
    }
  })
})
