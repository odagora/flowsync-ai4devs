import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que interesa aquí de una tarea en la respuesta. Se tipa a mano porque el
 * registro generado declara `/api/v1/tasks` como una tarea o una lista según el
 * método, y la unión no deja leer ninguna de las dos sin estrecharla.
 */
type TareaRespuesta = { id: number; assignee: Record<string, unknown> }

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el nombre y las iniciales bastan para
 * identificarlo, ningún otro dato de la cuenta sale con la tarea, y una cuenta
 * sin nombre sigue llegando representable.
 *
 * Aislamiento con transacción global por el mismo motivo que en `auth/`: la
 * suite pega contra el fichero SQLite del servidor de desarrollo.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La consulta de una tarea suelta exige el día de quien mira; cualquiera vale aquí.
  const today = '2026-10-14'

  async function sesion(client: any, fullName: string | null, email: string) {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(email: string) {
    const user = await User.findByOrFail('email', email)
    return Task.create({ title: 'Revisar el informe', status: 'pending', assigneeId: user.id })
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const token = await sesion(client, 'Alan Turing', 'alan@example.com')
    const task = await tareaDe('ada@example.com')

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('la tarea no filtra el email ni datos de acceso del responsable', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, 'Ada Lovelace', 'ada@example.com')

    // El scenario dice «cualquier tarea, suelta o dentro de la lista»: se
    // comprueban las tres formas de obtener una, incluida la respuesta del alta.
    const alta = await client
      .post('/api/v1/tasks')
      .json({ title: 'Revisar el informe' })
      .header('Authorization', `Bearer ${token}`)
    alta.assertStatus(201)
    const creada = alta.body().data as TareaRespuesta

    const suelta = await client
      .get(`/api/v1/tasks/${creada.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)
    const enLista = (lista.body().data as TareaRespuesta[]).find((t) => t.id === creada.id)
    assert.exists(enLista)

    const formas = {
      alta: creada.assignee,
      suelta: (suelta.body().data as TareaRespuesta).assignee,
      lista: enLista!.assignee,
    }

    // Se recogen todas las fugas antes de afirmar, para que el fallo diga por
    // qué caminos sale el dato y no solo por el primero que se mire.
    const fugas = Object.entries(formas).flatMap(([forma, assignee]) => {
      const serialized = JSON.stringify(assignee)
      return [
        'email' in assignee && `${forma}: trae la propiedad email`,
        serialized.includes('ada@example.com') && `${forma}: trae el email de la cuenta`,
        serialized.includes('secreto123') && `${forma}: trae la contraseña`,
        serialized.includes('password') && `${forma}: trae un campo password`,
      ].filter(Boolean)
    })

    assert.deepEqual(fugas, [])
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    await sesion(client, null, 'sin-nombre@example.com')
    const token = await sesion(client, 'Alan Turing', 'alan@example.com')
    const task = await tareaDe('sin-nombre@example.com')

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const { assignee } = response.body().data
    assert.isNull(assignee.fullName)
    assert.isString(assignee.initials)
    assert.isNotEmpty(assignee.initials)
  })
})
