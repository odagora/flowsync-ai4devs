/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import openapi from '@foadonis/openapi/services/main'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Tasks, 'index'])
        router.post('/', [controllers.Tasks, 'store'])
        router.get(':id', [controllers.Tasks, 'show'])
        router.patch(':id/status', [controllers.TaskStatuses, 'update'])
        router.put(':id/due-date', [controllers.TaskDueDates, 'update'])
      })
      .prefix('tasks')
      .as('tasks')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

/**
 * Documentación de la API: la interfaz de lectura, y el mismo documento en JSON
 * y en YAML. Sin esta llamada el paquete no expone ninguna URL — el provider
 * solo deja el servicio en el contenedor.
 *
 * Se registra fuera del grupo `/api/v1` a propósito: la documentación no es un
 * recurso de la versión 1 de la API, sino la descripción de todas las que haya.
 *
 * Queda pública, igual que la raíz: cualquiera que alcance el servidor puede
 * leer qué endpoints existen y qué payload esperan. Es lo que se quiere en
 * local; si esto llega a desplegarse, `registerRoutes` admite un modificador
 * para pedirle sesión.
 */
openapi.registerRoutes()
