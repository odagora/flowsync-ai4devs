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
 * La documentación de la API: el propio documento OpenAPI en `/api.json` y
 * `/api.yaml`, y la interfaz de Scalar que lo lee en `/api`.
 *
 * Se registra al final y fuera del grupo `/api/v1` a propósito: el documento
 * describe la API, no forma parte de ella, y meterlo dentro lo dejaría
 * versionado —y protegido— junto a lo que documenta.
 */
openapi.registerRoutes()
