import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La única versión que la API declara de sí misma es el `v1` del prefijo
      // de `start/routes.ts`. Si algún día nace un `/api/v2`, este número es lo
      // que tiene que moverse con él.
      version: '1.0.0',
      description:
        'La lista de trabajo compartida de un equipo. Toda respuesta con éxito viaja envuelta en `{ "data": ... }`; los errores, en `{ "errors": [...] }`.',
    },
    components: {
      securitySchemes: {
        /**
         * La clave tiene que llamarse `bearer`: es el nombre que usa
         * `@ApiBearerAuth()` al marcar cada operación, y si no coincide con
         * ninguna de las declaradas aquí el documento queda inválido.
         */
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'El token opaco que devuelven `/auth/signup` y `/auth/login`, en la cabecera `Authorization: Bearer …`.',
        },
      },
    },
  },
})
