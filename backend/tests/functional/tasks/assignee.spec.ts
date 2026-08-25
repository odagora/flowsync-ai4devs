import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: que el responsable se identifique, que junto
 * a la tarea no viaje ningún otro dato de su cuenta, y que una cuenta sin
 * nombre siga siendo representable.
 *
 * El aislamiento es una transacción global y no un truncate a propósito: la
 * suite functional pega contra el mismo fichero SQLite que el servidor de
 * desarrollo (`config/database.ts` no tiene override por entorno), y vaciarlo
 * se llevaría por delante los datos con los que se está trabajando.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * El día de referencia que exige la consulta de una tarea suelta. Aquí es
   * puro trámite —ninguno de estos scenarios habla de vencimiento— pero la
   * ruta no responde sin él.
   */
  const HOY = '2026-08-25'

  async function cuentaConSesion(client: ApiClient, fullName: string | null, email: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: response.body().data.token as string }
  }

  /**
   * La tarea se siembra por el modelo y no por `POST /api/v1/tasks`: lo que se
   * mira aquí es lo que las lecturas enseñan del responsable, y hacerlo pasar
   * por el alta ataría estos tests a un endpoint que este requisito no
   * describe.
   */
  function tareaDe(user: User, title = 'Revisar el informe') {
    return Task.create({ title, status: 'pending', assigneeId: user.id })
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { user, token } = await cuentaConSesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await tareaDe(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('la tarea no filtra datos de la cuenta del responsable', async ({ client, assert }) => {
    const { user, token } = await cuentaConSesion(client, 'Ada Lovelace', 'ada@example.com')
    const task = await tareaDe(user)

    // El scenario dice «suelta o dentro de la lista»: se comprueban las dos,
    // que son dos caminos distintos hasta la misma tarea.
    const suelta = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    // La tarea se busca por id dentro de la lista en vez de asumir que es la
    // única: la lista es la del espacio entero, y la suite functional comparte
    // fichero SQLite con el servidor de desarrollo, así que ahí puede haber
    // tareas que este test no ha creado.
    const enLaLista = [lista.body().data].flat().find((tarea) => tarea.id === task.id)
    assert.isDefined(enLaLista, 'la tarea recién creada tiene que salir en la lista del espacio')

    // El `!` es legítimo aquí: si la tarea no estuviera en la lista, el
    // `isDefined` de arriba ya habría cortado el test.
    const responsables: Array<[string, Record<string, unknown>]> = [
      ['la tarea suelta', suelta.body().data.assignee as Record<string, unknown>],
      ['la tarea dentro de la lista', enLaLista!.assignee as Record<string, unknown>],
    ]

    for (const [camino, assignee] of responsables) {
      assert.notProperty(assignee, 'email', `${camino} filtra el email del responsable`)
      assert.notProperty(assignee, 'password', `${camino} filtra la contraseña del responsable`)
      assert.deepEqual(
        Object.keys(assignee).sort(),
        ['fullName', 'id', 'initials'],
        `${camino} acompaña al responsable de datos que el requisito no permite`
      )
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y las iniciales puestas', async ({
    client,
    assert,
  }) => {
    const { user, token } = await cuentaConSesion(client, null, 'ada@example.com')
    const task = await tareaDe(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    // Sin nombre las iniciales salen del email, pero el email no acompaña a la
    // tarea: por eso tienen que venir ya calculadas.
    assert.equal(assignee.initials, 'AE')
  })
})
