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
    },
  },
})
