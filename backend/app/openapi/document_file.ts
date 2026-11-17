import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

/**
 * Ruta del documento OpenAPI versionado. Vive en `docs/` de la raíz del repo,
 * no dentro de `backend/`, porque es el contrato que leen todos (frontend,
 * revisores, specs), no un artefacto del servidor.
 */
export const OPENAPI_DOCUMENT_PATH = app.makePath('..', 'docs', 'api', 'openapi.json')

/**
 * Construye el documento con la misma instancia de `@foadonis/openapi` que lo
 * sirve en `/api.json`, de modo que el fichero y lo servido por HTTP no pueden
 * divergir en contenido. Necesita la app arrancada (rutas precargadas).
 *
 * El texto es JSON con sangría de dos espacios y salto de línea final: es lo
 * que hace legibles los diffs del fichero versionado.
 */
export async function renderOpenApiDocument(): Promise<string> {
  /**
   * El servidor HTTP hace `commit()` al arrancar; un comando no, y sin él
   * `router.toJSON()` no ve las rutas de los grupos con prefijo.
   */
  router.commit()
  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()
  return `${JSON.stringify(document, null, 2)}\n`
}

export type JsonDifference = {
  pointer: string
  kind: 'added' | 'removed' | 'changed'
  expected?: unknown
  actual?: unknown
}

/**
 * Diferencias estructurales entre dos valores JSON, como JSON Pointers.
 * `expected` es lo versionado y `actual` lo regenerado: `added` es algo que el
 * código produce y el fichero no tiene; `removed`, lo contrario.
 */
export function diffJson(expected: unknown, actual: unknown, pointer = ''): JsonDifference[] {
  if (
    isContainer(expected) &&
    isContainer(actual) &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    const differences: JsonDifference[] = []
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
    for (const key of keys) {
      const child = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
      const inExpected = Object.hasOwn(expected, key)
      const inActual = Object.hasOwn(actual, key)
      const e = (expected as Record<string, unknown>)[key]
      const a = (actual as Record<string, unknown>)[key]
      if (!inExpected) differences.push({ pointer: child, kind: 'added', actual: a })
      else if (!inActual) differences.push({ pointer: child, kind: 'removed', expected: e })
      else differences.push(...diffJson(e, a, child))
    }
    return differences
  }
  if (JSON.stringify(expected) === JSON.stringify(actual)) return []
  return [{ pointer: pointer || '/', kind: 'changed', expected, actual }]
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
