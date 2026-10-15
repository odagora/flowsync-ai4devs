import { isDeepStrictEqual } from 'node:util'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

/**
 * Documento OpenAPI versionado.
 *
 * Es el mismo documento que se sirve en `/api.json`, pero escrito en el repo
 * para que el contrato exista sin tener el servidor arrancado. Lo escribe
 * `openapi:generate` y lo vigila `openapi:check`; a mano no se edita.
 *
 * Vive fuera de `backend/`, en el `docs/` de la raíz, junto al resto de la
 * documentación del proyecto.
 */
export const VERSIONED_DOCUMENT_PATH = app.makePath('..', 'docs', 'api', 'openapi.json')

/**
 * Construye el documento y lo devuelve ya serializado.
 *
 * El router se confirma antes porque, desde un comando, nadie más lo hace: el
 * servidor HTTP lo confirma al arrancar, y sin eso el loader de
 * `@foadonis/openapi` no ve las rutas definitivas.
 *
 * La serialización es la única fuente del formato del fichero (indentación de
 * dos espacios y salto de línea final), para que generar y comprobar produzcan
 * exactamente los mismos bytes.
 */
export async function renderDocument(): Promise<string> {
  router.commit()
  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()
  return `${JSON.stringify(document, null, 2)}\n`
}

export type DocumentDifference = {
  kind: 'añadido' | 'eliminado' | 'cambiado'
  path: string
}

/**
 * Lista las diferencias entre dos documentos como rutas JSON (`paths./x.get`),
 * desde el punto de vista de `actual`: «añadido» es lo que `actual` tiene y
 * `expected` no.
 *
 * Desciende hasta el nodo más profundo que difiere, de modo que un cambio en
 * una descripción sale como esa descripción y no como la operación entera.
 */
export function diffDocuments(expected: unknown, actual: unknown, path = ''): DocumentDifference[] {
  if (isDeepStrictEqual(expected, actual)) {
    return []
  }

  if (
    !isContainer(expected) ||
    !isContainer(actual) ||
    Array.isArray(expected) !== Array.isArray(actual)
  ) {
    return [{ kind: 'cambiado', path: path || '(raíz)' }]
  }

  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
  const differences: DocumentDifference[] = []

  for (const key of keys) {
    const childPath = path ? `${path}.${key}` : key
    if (!(key in actual)) {
      differences.push({ kind: 'eliminado', path: childPath })
    } else if (!(key in expected)) {
      differences.push({ kind: 'añadido', path: childPath })
    } else {
      differences.push(
        ...diffDocuments(
          (expected as Record<string, unknown>)[key],
          (actual as Record<string, unknown>)[key],
          childPath
        )
      )
    }
  }

  return differences
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
