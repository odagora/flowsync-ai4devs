import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer' },
      },
    },
  },
})
