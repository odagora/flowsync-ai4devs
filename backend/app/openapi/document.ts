import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

/**
 * Dónde vive la copia versionada del contrato. Está fuera de `backend/`
 * porque es documentación del proyecto, no código del servidor.
 */
export const OPENAPI_DOCUMENT_PATH = app.makePath('..', 'docs', 'api', 'openapi.json')

/**
 * Construye el mismo documento que se sirve en `/api.json`, pero sin levantar
 * el servidor HTTP.
 *
 * Fuera del servidor nadie hace `router.commit()`, y sin él `router.toJSON()`
 * sale vacío y el documento no tendría ninguna ruta. `commit()` es idempotente,
 * así que llamarlo aquí no interfiere si el servidor ya lo hizo.
 */
export async function buildOpenAPIDocument(): Promise<unknown> {
  router.commit()
  const openapi = await app.container.make('openapi')
  return openapi.buildDocument()
}

/**
 * Serialización estable del documento: indentado para que los diffs de git
 * sean legibles, y con salto de línea final como cualquier otro fichero del repo.
 * `openapi:generate` y `openapi:check` pasan los dos por aquí, así que una
 * diferencia de formato nunca puede venir de que cada uno serialice a su manera.
 */
export function serializeOpenAPIDocument(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`
}
