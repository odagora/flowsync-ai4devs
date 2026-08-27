import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      // La versión del documento es la de la superficie que describe, y esa
      // superficie es la que cuelga de `/api/v1` en `start/routes.ts`. Si
      // algún día aparece un `/api/v2`, este número es lo que tiene que
      // moverse con él.
      version: '1.0.0',
    },
  },
})
