import { defineConfig } from '@foadonis/openapi'
import { openApiSchemas } from '#openapi/schemas'

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
      description:
        'La lista de trabajo compartida de un equipo. Toda respuesta viaja envuelta en `data`, y las tareas exigen un token de acceso.',
    },
    components: {
      securitySchemes: {
        // El nombre tiene que ser exactamente `bearer`: es el que emite
        // `@ApiBearerAuth()` en los controladores, y un requisito de seguridad
        // que apunte a un esquema inexistente deja el documento roto sin que
        // nada falle al generarlo.
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description:
            'Token de acceso opaco, el que devuelven `POST /api/v1/auth/signup` y `POST /api/v1/auth/login`. Viaja en `Authorization: Bearer <token>`.',
        },
      },
      schemas: openApiSchemas,
    },
  },
})
