import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      version: 'v1',
    },
    components: {
      securitySchemes: {
        // Nombre que usa `@ApiBearerAuth()`. Access tokens opacos (`oat_...`)
        // de `DbAccessTokensProvider`, no JWT.
        bearer: { type: 'http', scheme: 'bearer' },
      },
    },
  },
})
