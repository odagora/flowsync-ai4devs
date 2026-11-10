import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import type { Assert } from '@japa/assert'
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
   * El `assignee` de la misma tarea leído desde la tarea suelta y desde la
   * lista, con el nombre de cada lectura para que un fallo diga cuál fue.
   *
   * La suelta va primero: si la lista falla, la suelta ya quedó comprobada en
   * vez de quedarse sin mirar.
   */
  async function asignadoEnAmbasLecturas(client: any, assert: Assert, token: string, task: Task) {
    // `today` no pinta nada en este requisito, pero la tarea suelta lo exige
    // siempre (ver `taskReferenceDayValidator`): sin él la respuesta es un 422.
    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-11-10' })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === task.id)
    assert.exists(enLista, 'la tarea no aparece en la lista')

    return [
      ['la tarea suelta', suelta.body().data.assignee],
      ['la lista', enLista.assignee],
    ] as const
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const task = await tareaDe('Ada Lovelace', 'ada@example.com')

    for (const [lectura, assignee] of await asignadoEnAmbasLecturas(client, assert, token, task)) {
      assert.equal(assignee.fullName, 'Ada Lovelace', `nombre en ${lectura}`)
      assert.equal(assignee.initials, 'AL', `iniciales en ${lectura}`)
    }
  })

  test('la tarea no filtra el email ni ningún otro dato de la cuenta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const task = await tareaDe('Ada Lovelace', 'ada@example.com')

    // Lista blanca y no negra: el requisito pide «lo justo para identificarlo»
    // y ningún otro dato de la cuenta, así que un arreglo que quitara solo el
    // email y dejara, por ejemplo, las fechas de la cuenta tiene que seguir en
    // rojo.
    for (const [lectura, assignee] of await asignadoEnAmbasLecturas(client, assert, token, task)) {
      assert.sameMembers(
        Object.keys(assignee),
        ['id', 'fullName', 'initials'],
        `${lectura} expone del responsable más de lo justo`
      )
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const task = await tareaDe(null, 'ada@example.com')

    for (const [lectura, assignee] of await asignadoEnAmbasLecturas(client, assert, token, task)) {
      assert.property(assignee, 'fullName', `nombre en ${lectura}`)
      assert.isNull(assignee.fullName, `nombre en ${lectura}`)
      // Las mismas que da la cuenta sin nombre en `auth/initials.spec.ts`.
      assert.equal(assignee.initials, 'AE', `iniciales en ${lectura}`)
    }
  })
})
