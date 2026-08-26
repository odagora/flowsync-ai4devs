import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable, la tarea que no
 * filtra datos de cuenta y el responsable sin nombre.
 *
 * El requisito habla de «cada tarea» y el segundo scenario dice explícitamente
 * «suelta o dentro de la lista», así que cada scenario se comprueba en los tres
 * sitios por los que una tarea sale de la API —la respuesta de la creación, la
 * lista y la tarea suelta—, no en uno solo: cumplirlo en un sitio y no en otro
 * es incumplirlo.
 *
 * El aislamiento es una transacción global y no un truncate, por el mismo
 * motivo que en `auth`: la suite functional pega contra el mismo fichero SQLite
 * que el servidor de desarrollo (`config/database.ts` no tiene override por
 * entorno), y vaciarlo se llevaría por delante los datos con los que se está
 * trabajando.
 */
test.group('Tasks | el responsable de la tarea', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * La tarea suelta exige día de referencia porque es la única lectura que
   * informa del vencimiento. Aquí no se está probando el vencimiento, así que
   * el día es una constante cualquiera: solo tiene que ser válido.
   */
  const DIA_DE_REFERENCIA = '2026-08-26'

  async function sesion(client: any, fullName: string | null, email: string) {
    await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  /**
   * Crea una tarea y devuelve el `assignee` tal y como lo entrega cada una de
   * las tres respuestas que llevan una tarea dentro.
   *
   * En la lista la tarea se busca por id en vez de dar por hecho que es la
   * única: `GET /api/v1/tasks` devuelve la lista del espacio entero, y el
   * fichero SQLite puede traer tareas de antes.
   */
  async function responsableSegunCadaRespuesta(client: any, token: string) {
    const autorizado = (peticion: any) => peticion.header('Authorization', `Bearer ${token}`)

    const creacion = await autorizado(client.post('/api/v1/tasks')).json({
      title: 'Revisar el informe',
    })
    creacion.assertStatus(201)
    const tarea = creacion.body().data

    const lista = await autorizado(client.get('/api/v1/tasks'))
    lista.assertStatus(200)
    const enLaLista = lista.body().data.find((otra: any) => otra.id === tarea.id)

    const suelta = await autorizado(client.get(`/api/v1/tasks/${tarea.id}`)).qs({
      today: DIA_DE_REFERENCIA,
    })
    suelta.assertStatus(200)

    return {
      'la respuesta de la creación': tarea.assignee,
      'la lista': enLaLista?.assignee,
      'la tarea suelta': suelta.body().data.assignee,
    }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client, 'Ada Lovelace', 'ada@example.com')

    const responsables = await responsableSegunCadaRespuesta(client, token)

    for (const [donde, assignee] of Object.entries(responsables)) {
      assert.isObject(assignee, `${donde} no trae responsable`)
      assert.equal(assignee.fullName, 'Ada Lovelace', `${donde} no trae el nombre`)
      assert.equal(assignee.initials, 'AL', `${donde} no trae las iniciales`)
    }
  })

  test('la tarea no filtra el email ni ningún otro dato de la cuenta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, 'Ada Lovelace', 'ada@example.com')

    const responsables = await responsableSegunCadaRespuesta(client, token)

    for (const [donde, assignee] of Object.entries(responsables)) {
      // Primero lo que el scenario nombra, para que el fallo diga qué se ha
      // filtrado y no solo que las claves no cuadran.
      assert.notProperty(assignee, 'email', `${donde} filtra el email del responsable`)
      assert.notProperty(assignee, 'password', `${donde} filtra la contraseña del responsable`)
      assert.notInclude(
        JSON.stringify(assignee),
        'ada@example.com',
        `${donde} filtra el email del responsable`
      )

      // Y después el requisito entero: «ningún otro dato de esa cuenta». Lo
      // justo para identificarlo son estas tres claves y ninguna más.
      assert.deepEqual(
        Object.keys(assignee).sort(),
        ['fullName', 'id', 'initials'],
        `${donde} expone datos de la cuenta que la tarea no necesita`
      )
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y sus iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client, null, 'sin-nombre@example.com')

    const responsables = await responsableSegunCadaRespuesta(client, token)

    for (const [donde, assignee] of Object.entries(responsables)) {
      assert.isObject(assignee, `${donde} no trae responsable`)
      assert.isNull(assignee.fullName, `${donde} no deja el nombre nulo`)
      // Derivadas del email por `User.initials`, para que la interfaz pueda
      // representarlo sin recurrir al email.
      assert.equal(assignee.initials, 'SE', `${donde} no trae las iniciales`)
    }
  })
})
