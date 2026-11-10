import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La versión de la API es la del prefijo de sus rutas (`/api/v1`).
      version: 'v1',
    },
  },
})
