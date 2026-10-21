import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * El documento OpenAPI como fichero.
 *
 * `@foadonis/openapi` construye el documento en memoria, a partir de las rutas
 * registradas y de los decoradores de los controladores, y lo sirve en
 * `/api.json`. Este módulo lo saca de ahí para que quede versionado en
 * `docs/api/openapi.json`: lo usan `openapi:generate`, que escribe ese fichero,
 * y `openapi:check`, que comprueba que sigue al día.
 *
 * Los dos comandos serializan con la misma función a propósito: si no, la
 * comprobación podría fallar por una diferencia de formato y no de contrato.
 */

/**
 * Ruta del documento versionado. Vive en el `docs/` de la raíz del repo, no en
 * el de `backend/`, junto al resto de documentación del proyecto.
 */
export function openAPIDocumentPath(app: ApplicationService) {
  return app.makePath('..', 'docs', 'api', 'openapi.json')
}

/**
 * Construye el documento con el mismo servicio que atiende `/api.json`, de modo
 * que el fichero y lo servido no pueden divergir.
 */
export async function buildOpenAPIDocument(app: ApplicationService) {
  const router = await app.container.make('router')
  /**
   * El servicio lee las rutas de `router.toJSON()`, que solo se rellena al
   * hacer `commit()`. El servidor HTTP lo hace al arrancar; un comando de ace
   * no arranca el servidor, así que hay que hacerlo aquí.
   */
  router.commit()

  const openapi = await app.container.make('openapi')
  return openapi.buildDocument()
}

/**
 * Formato estable del fichero: indentado a dos espacios y con salto de línea
 * final, para que los diffs de git se lean y los editores no lo reescriban.
 */
export function serializeOpenAPIDocument(document: unknown) {
  return `${JSON.stringify(document, null, 2)}\n`
}

export async function writeOpenAPIDocument(path: string, document: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, serializeOpenAPIDocument(document))
}

export type OpenAPIDifference =
  | { kind: 'added'; pointer: string; value: unknown }
  | { kind: 'removed'; pointer: string; value: unknown }
  | { kind: 'changed'; pointer: string; before: unknown; after: unknown }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * JSON Pointer (RFC 6901): es la forma estándar de señalar un nodo de un
 * documento OpenAPI y la que entienden las herramientas que lo consumen.
 */
function childPointer(pointer: string, key: string | number) {
  return `${pointer}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`
}

/**
 * Diferencias entre dos documentos, nodo a nodo. Desciende por objetos y
 * arrays hasta el primer nodo que difiere, así que una operación nueva sale
 * como una sola entrada y no como una por cada uno de sus campos.
 */
export function diffOpenAPIDocuments(
  before: unknown,
  after: unknown,
  pointer = ''
): OpenAPIDifference[] {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    return [...keys].flatMap((key) => {
      const path = childPointer(pointer, key)
      if (!(key in after)) return [{ kind: 'removed' as const, pointer: path, value: before[key] }]
      if (!(key in before)) return [{ kind: 'added' as const, pointer: path, value: after[key] }]
      return diffOpenAPIDocuments(before[key], after[key], path)
    })
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length)
    return Array.from({ length }, (_, index) => {
      const path = childPointer(pointer, index)
      if (index >= after.length)
        return [{ kind: 'removed' as const, pointer: path, value: before[index] }]
      if (index >= before.length)
        return [{ kind: 'added' as const, pointer: path, value: after[index] }]
      return diffOpenAPIDocuments(before[index], after[index], path)
    }).flat()
  }

  if (JSON.stringify(before) === JSON.stringify(after)) return []
  return [{ kind: 'changed', pointer: pointer || '/', before, after }]
}
