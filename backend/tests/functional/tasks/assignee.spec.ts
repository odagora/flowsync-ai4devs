import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que interesa aquí de una tarea en la respuesta. Se tipa a mano porque el
 * registro generado declara `/api/v1/tasks` como una tarea o una lista según el
 * método, y la unión no deja leer ninguna de las dos sin estrecharla.
 */
type TareaRespuesta = { id: number; assignee: Record<string, unknown> }

/**
 * Lo único que el responsable puede enseñar junto a la tarea: nombre e
 * iniciales para identificarlo, y el `id` que `TaskAssigneeTransformer` expone
 * a propósito. Cualquier otra clave es un dato de la cuenta que no toca.
 */
const CAMPOS_DEL_RESPONSABLE = ['fullName', 'id', 'initials']

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el nombre y las iniciales bastan para
 * identificarlo, ningún otro dato de la cuenta sale con la tarea, y una cuenta
 * sin nombre sigue llegando representable.
 *
 * En todos los tests quien mira es una cuenta distinta del responsable, para
 * que no pase una implementación que solo oculte los datos a su dueño o solo a
 * terceros.
 *
 * Aislamiento con transacción global por el mismo motivo que en `auth/`: la
 * suite pega contra el fichero SQLite del servidor de desarrollo.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La consulta de una tarea suelta exige el día de quien mira; cualquiera vale aquí.
  const today = '2026-10-14'

  async function sesion(client: ApiClient, email = 'alan@example.com') {
    await User.create({ fullName: 'Alan Turing', email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  function tareaDe(user: User) {
    return Task.create({ title: 'Revisar el informe', status: 'pending', assigneeId: user.id })
  }

  async function suelta(client: ApiClient, token: string, id: number) {
    const response = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    return response.body().data as TareaRespuesta
  }

  async function enLista(client: ApiClient, token: string, id: number) {
    const response = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    return (response.body().data as TareaRespuesta[]).find((t) => t.id === id)
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const token = await sesion(client)
    const task = await tareaDe(ada)

    const { assignee } = await suelta(client, token, task.id)

    assert.equal(assignee.fullName, 'Ada Lovelace')
    assert.equal(assignee.initials, 'AL')
  })

  test('la tarea no filtra el email ni datos de acceso del responsable', async ({
    client,
    assert,
  }) => {
    const tokenAda = await sesion(client, 'ada@example.com')
    const tokenAlan = await sesion(client)

    // El scenario dice «cualquier tarea, suelta o dentro de la lista»: se
    // comprueban las tres formas de obtener una, incluida la respuesta del alta.
    const alta = await client
      .post('/api/v1/tasks')
      .json({ title: 'Revisar el informe' })
      .header('Authorization', `Bearer ${tokenAda}`)
    alta.assertStatus(201)
    const creada = alta.body().data as TareaRespuesta

    const deLista = await enLista(client, tokenAlan, creada.id)
    assert.exists(deLista)

    const deSuelta = await suelta(client, tokenAlan, creada.id)

    const formas = {
      alta: creada.assignee,
      suelta: deSuelta.assignee,
      lista: deLista!.assignee,
    }

    // Se recogen todas las fugas antes de afirmar, para que el fallo diga por
    // qué caminos sale el dato y no solo por el primero que se mire.
    const fugas = Object.entries(formas).flatMap(([forma, assignee]) => [
      ...Object.keys(assignee)
        .filter((clave) => !CAMPOS_DEL_RESPONSABLE.includes(clave))
        .map((clave) => `${forma}: trae ${clave}`),
      ...(JSON.stringify(assignee).includes('ada@example.com')
        ? [`${forma}: trae el email de la cuenta`]
        : []),
    ])

    assert.deepEqual(fugas, [])
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const sinNombre = await User.create({
      fullName: null,
      email: 'sin-nombre@example.com',
      password: 'secreto123',
    })
    const token = await sesion(client)
    const task = await tareaDe(sinNombre)

    const { assignee } = await suelta(client, token, task.id)

    assert.isNull(assignee.fullName)
    // Las de una cuenta sin nombre salen del email (`auth/initials.spec.ts`);
    // lo que no debe llegar es el email en sí.
    assert.equal(assignee.initials, 'SE')
    assert.notInclude(JSON.stringify(assignee), 'sin-nombre@example.com')
  })
})
