import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable, la tarea que
 * no filtra datos de cuenta, y el responsable sin nombre.
 *
 * El requisito habla de «cualquier tarea, suelta o dentro de la lista», así
 * que cada scenario se comprueba en las dos superficies que devuelven un
 * responsable —`GET /api/v1/tasks` y `GET /api/v1/tasks/:id`— y no solo en la
 * más cómoda: son dos transformers distintos, y cumplirlo en uno no dice nada
 * del otro.
 *
 * El aislamiento es una transacción global, igual que en `auth`: la suite
 * functional pega contra el mismo fichero SQLite que el servidor de
 * desarrollo, y truncar se llevaría por delante los datos de trabajo.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La consulta de una tarea suelta exige el día de referencia del vencimiento.
  // Aquí es puro trámite: ninguno de estos scenarios habla de fechas.
  const HOY = '2026-08-26'

  async function sesion(
    client: any,
    { fullName = 'Ada Lovelace' as string | null, email = 'ada@example.com' } = {}
  ) {
    await User.create({ fullName, email, password: 'secreto123' })

    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return login.body().data.token as string
  }

  async function crearTarea(client: any, token: string, title = 'Revisar el informe') {
    const response = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title })

    response.assertStatus(201)

    return response.body().data
  }

  /** El responsable de esa tarea tal y como lo devuelve la lista. */
  async function responsableEnLaLista(client: any, token: string, taskId: number) {
    const response = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const tarea = response.body().data.find((t: { id: number }) => t.id === taskId)

    return tarea?.assignee
  }

  /** El responsable de esa tarea tal y como lo devuelve la consulta suelta. */
  async function responsableEnLaTareaSuelta(client: any, token: string, taskId: number) {
    const response = await client
      .get(`/api/v1/tasks/${taskId}`)
      .header('Authorization', `Bearer ${token}`)
      .qs({ today: HOY })

    response.assertStatus(200)

    return response.body().data.assignee
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const tarea = await crearTarea(client, token)

    for (const responsable of [
      await responsableEnLaLista(client, token, tarea.id),
      await responsableEnLaTareaSuelta(client, token, tarea.id),
    ]) {
      assert.equal(responsable.fullName, 'Ada Lovelace')
      assert.equal(responsable.initials, 'AL')
    }
  })

  test('la tarea no trae el email del responsable ni ningún otro dato de acceso', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await crearTarea(client, token)

    for (const responsable of [
      await responsableEnLaLista(client, token, tarea.id),
      await responsableEnLaTareaSuelta(client, token, tarea.id),
    ]) {
      assert.notProperty(responsable, 'email')
      assert.notProperty(responsable, 'password')

      // El email no se cuela por ningún otro nombre de campo: se busca el
      // valor, no la clave con la que esperamos encontrarlo.
      assert.notInclude(JSON.stringify(responsable), 'ada@example.com')

      // El requisito dice «nada más»: lo justo para identificarlo en la lista.
      assert.deepEqual(Object.keys(responsable).sort(), ['fullName', 'id', 'initials'])
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y las iniciales puestas', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, { fullName: null, email: 'sin-nombre@example.com' })
    const tarea = await crearTarea(client, token)

    for (const responsable of [
      await responsableEnLaLista(client, token, tarea.id),
      await responsableEnLaTareaSuelta(client, token, tarea.id),
    ]) {
      assert.isNull(responsable.fullName)

      // Las iniciales salen del email, pero el email no viaja: es justo lo que
      // permite a la interfaz representarlo sin recurrir a él.
      assert.equal(responsable.initials, 'SE')
    }
  })
})
