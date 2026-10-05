import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`.
 *
 * Una tarea se «obtiene» por tres caminos —la lista, la consulta suelta y la
 * respuesta al crearla— y el requisito vale para todos, así que cada test los
 * recorre y compara el resultado de los tres a la vez: si uno se desvía, el
 * diff dice cuál.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const today = '2026-08-13'

  async function sesion(client: any, email: string, fullName: string | null = 'Alan Turing') {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })
    response.assertStatus(200)

    return response.body().data.token as string
  }

  /**
   * El `assignee` de una tarea por cada camino por el que se puede obtener. La
   * tarea se crea por la API con el token de su responsable, y la lista y la
   * consulta suelta se piden con el de quien mira.
   */
  async function assignees(client: any, tokenResponsable: string, tokenObservador: string) {
    const alta = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${tokenResponsable}`)
      .json({ title: 'Revisar el informe' })
    alta.assertStatus(201)
    const id = alta.body().data.id

    const lista = await client
      .get('/api/v1/tasks')
      .header('Authorization', `Bearer ${tokenObservador}`)
    lista.assertStatus(200)

    const suelta = await client
      .get(`/api/v1/tasks/${id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${tokenObservador}`)
    suelta.assertStatus(200)

    // Si la tarea no sale en la lista, que el fallo lo diga y no sea un
    // TypeError al leer `.assignee` de `undefined`.
    const enLista = lista.body().data.find((task: { id: number }) => task.id === id)
    if (!enLista) throw new Error(`la tarea ${id} recién creada no sale en la lista`)

    return {
      alta: alta.body().data.assignee,
      lista: enLista.assignee,
      suelta: suelta.body().data.assignee,
    }
  }

  test('el responsable se identifica por su nombre y sus iniciales', async ({ client, assert }) => {
    const ada = await sesion(client, 'ada@example.com', 'Ada Lovelace')
    const alan = await sesion(client, 'alan@example.com')

    const porCamino = await assignees(client, ada, alan)

    const identificado = { fullName: 'Ada Lovelace', initials: 'AL' }
    assert.deepEqual(
      {
        alta: { fullName: porCamino.alta.fullName, initials: porCamino.alta.initials },
        lista: { fullName: porCamino.lista.fullName, initials: porCamino.lista.initials },
        suelta: { fullName: porCamino.suelta.fullName, initials: porCamino.suelta.initials },
      },
      { alta: identificado, lista: identificado, suelta: identificado }
    )
  })

  test('la tarea no filtra datos de la cuenta de su responsable', async ({ client, assert }) => {
    const ada = await sesion(client, 'ada@example.com', 'Ada Lovelace')
    const alan = await sesion(client, 'alan@example.com')

    const porCamino = await assignees(client, ada, alan)

    // Nombre e iniciales, más el id con el que la interfaz distingue a dos
    // personas que se llamen igual. Cualquier otra clave —el email, las fechas
    // de la cuenta, la contraseña— es un dato de la cuenta que no toca aquí.
    const permitidas = ['fullName', 'id', 'initials']
    const claves = (assignee: object) => Object.keys(assignee).sort()
    assert.deepEqual(
      {
        alta: claves(porCamino.alta),
        lista: claves(porCamino.lista),
        suelta: claves(porCamino.suelta),
      },
      { alta: permitidas, lista: permitidas, suelta: permitidas }
    )

    // Y no solo por nombre de clave: el email no puede aparecer en ningún valor.
    const serializado = JSON.stringify(porCamino)
    assert.notInclude(serializado, 'ada@example.com')
    assert.notInclude(serializado, 'secreto123')
  })

  test('un responsable sin nombre llega con el nombre nulo y sus iniciales', async ({
    client,
    assert,
  }) => {
    const sinNombre = await sesion(client, 'ada@example.com', null)
    const alan = await sesion(client, 'alan@example.com')

    const porCamino = await assignees(client, sinNombre, alan)

    // Las iniciales de una cuenta sin nombre salen del email (requisito
    // «Iniciales de la cuenta» de auth): para `ada@example.com`, «AE».
    const sinNombreConIniciales = { fullName: null, initials: 'AE' }
    assert.deepEqual(
      {
        alta: { fullName: porCamino.alta.fullName, initials: porCamino.alta.initials },
        lista: { fullName: porCamino.lista.fullName, initials: porCamino.lista.initials },
        suelta: { fullName: porCamino.suelta.fullName, initials: porCamino.suelta.initials },
      },
      { alta: sinNombreConIniciales, lista: sinNombreConIniciales, suelta: sinNombreConIniciales }
    )
  })
})
