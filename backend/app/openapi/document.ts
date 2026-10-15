import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Ruta del documento OpenAPI versionado, relativa a la raíz del repositorio
 * (no a `backend/`): el contrato es documentación del proyecto y vive en
 * `docs/`, junto al resto.
 */
export const VERSIONED_DOCUMENT_PATH = 'docs/api/openapi.json'

/**
 * Ruta absoluta del documento versionado. `app.makePath()` resuelve contra
 * `backend/`, de ahí el `..`.
 */
export function versionedDocumentPath() {
  return app.makePath('..', VERSIONED_DOCUMENT_PATH)
}

/**
 * Construye el mismo documento que se sirve en `/api.json` —mismo contenido,
 * no mismos bytes: el servidor lo manda en una línea— y lo serializa de forma
 * estable: sangrado de dos espacios y salto de línea final, para que el
 * fichero versionado dé diffs legibles y dos generaciones sobre el mismo
 * código produzcan los mismos bytes.
 */
export async function renderDocument() {
  // El generador lee las rutas de `router.toJSON()`, que solo lista las ya
  // confirmadas. En el servidor lo hace el arranque HTTP; desde ace nadie lo
  // hace y el documento saldría sin `paths`. `commit()` es idempotente.
  router.commit()

  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()
  return `${JSON.stringify(document, null, 2)}\n`
}

/**
 * Genera el documento y lo escribe en `path`, creando los directorios que
 * falten. Devuelve el contenido escrito.
 */
export async function writeDocument(path: string) {
  const content = await renderDocument()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return content
}

/**
 * Una diferencia entre dos documentos, localizada por su ruta JSON
 * (`paths./api/v1/tasks.get.responses.200`).
 */
export type DocumentDifference = {
  kind: 'added' | 'removed' | 'changed'
  path: string
}

/**
 * Compara dos documentos ya parseados y devuelve, en orden, las rutas JSON
 * donde difieren. Desciende hasta la hoja que cambia en vez de dar por
 * distinto todo el subárbol, para que el mensaje señale el sitio exacto.
 */
export function diffDocuments(expected: unknown, actual: unknown, path = ''): DocumentDifference[] {
  if (
    isContainer(expected) &&
    isContainer(actual) &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    return keys.flatMap((key) => {
      const child = path ? `${path}.${key}` : key
      if (!(key in actual)) return [{ kind: 'removed' as const, path: child }]
      if (!(key in expected)) return [{ kind: 'added' as const, path: child }]
      return diffDocuments(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        child
      )
    })
  }

  return JSON.stringify(expected) === JSON.stringify(actual)
    ? []
    : [{ kind: 'changed', path: path || '(raíz)' }]
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
