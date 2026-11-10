import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La versión de la API es la del prefijo de sus rutas (`/api/v1`).
      version: 'v1',
    },
    components: {
      securitySchemes: {
        // El nombre lo fija `@ApiBearerAuth()`, que siempre referencia `bearer`.
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Token opaco de acceso que devuelven `POST /api/v1/auth/signup` y `POST /api/v1/auth/login`.',
        },
      },
    },
  },
})
