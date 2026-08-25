import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  /**
   * Scalar como interfaz de lectura del documento. `generateUi()` la sirve ya
   * apuntando a la ruta JSON, así que cambiar este valor cambia la pantalla
   * pero no las URLs.
   */
  ui: 'scalar',

  document: {
    info: {
      title: 'FlowSync API',
      description:
        'API de FlowSync: cuentas de acceso y la lista de tareas del equipo. ' +
        'El documento se construye en cada petición a partir del router, ' +
        'así que refleja siempre las rutas realmente registradas.',

      /**
       * Acompaña al prefijo `/api/v1` de `start/routes.ts`, que es la única
       * versión que el código declara hoy. Si algún día nace un `/api/v2`,
       * este número es lo que tiene que moverse con él.
       */
      version: '1.0.0',
    },

    components: {
      securitySchemes: {
        /**
         * El nombre `bearer` no es decorativo: es el que referencia
         * `@ApiBearerAuth()` al decorar cada operación. Si se renombra aquí,
         * las operaciones quedan apuntando a un esquema que no existe.
         */
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Token de acceso opaco, el que devuelven `POST /api/v1/auth/signup` y `POST /api/v1/auth/login`. Viaja en `Authorization: Bearer <token>`.',
        },
      },
    },
  },
})
