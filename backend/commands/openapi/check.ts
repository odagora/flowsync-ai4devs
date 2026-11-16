import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  OPENAPI_DOCUMENT_PATH,
  buildOpenAPIDocument,
  serializeOpenAPIDocument,
} from '#openapi/document'

type Difference = { kind: 'añadido' | 'eliminado' | 'cambiado'; path: string }

/**
 * Cuántas diferencias se listan como mucho. Si el documento cambia entero
 * (p. ej. un fichero corrupto), listar miles de rutas no ayuda a nadie.
 */
const MAX_LISTED_DIFFERENCES = 50

export default class OpenAPICheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento que genera el código. No modifica nada.'

  static options: CommandOptions = { startApp: true }

  async run() {
    const versionedLabel = relative(process.cwd(), OPENAPI_DOCUMENT_PATH)

    // El documento recién generado se escribe en una carpeta temporal propia y
    // se compara desde ahí. El versionado solo se lee: esta comprobación nunca
    // lo reescribe, aunque esté desactualizado.
    const tempDir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    const generatedPath = join(tempDir, 'openapi.json')

    try {
      await writeFile(
        generatedPath,
        serializeOpenAPIDocument(await buildOpenAPIDocument()),
        'utf-8'
      )
      const generatedText = await readFile(generatedPath, 'utf-8')

      let versionedText: string
      try {
        versionedText = await readFile(OPENAPI_DOCUMENT_PATH, 'utf-8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        return this.#fail(`No existe ${versionedLabel}: el contrato no está versionado.`, [])
      }

      if (generatedText === versionedText) {
        this.logger.success(`${versionedLabel} está al día con el código.`)
        return
      }

      let versioned: unknown
      try {
        versioned = JSON.parse(versionedText)
      } catch (error) {
        return this.#fail(`${versionedLabel} no es JSON válido: ${(error as Error).message}`, [])
      }

      const generated: unknown = JSON.parse(generatedText)
      if (isDeepStrictEqual(versioned, generated)) {
        return this.#fail(
          `${versionedLabel} describe el mismo contrato, pero su formato no es el que produce openapi:generate (indentación, orden de claves o salto de línea final).`,
          []
        )
      }

      const differences: Difference[] = []
      collectDifferences(versioned, generated, '', differences)
      return this.#fail(
        `${versionedLabel} no coincide con el documento que genera el código: ${differences.length} diferencia(s). «añadido» es lo que el código tiene y el fichero no; «eliminado», lo que el fichero tiene y el código ya no.`,
        differences
      )
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  }

  #fail(reason: string, differences: Difference[]) {
    this.logger.error(reason)
    for (const difference of differences.slice(0, MAX_LISTED_DIFFERENCES)) {
      this.logger.log(`  ${difference.kind.padEnd(9)} ${difference.path || '/'}`)
    }
    if (differences.length > MAX_LISTED_DIFFERENCES) {
      this.logger.log(`  … y ${differences.length - MAX_LISTED_DIFFERENCES} más`)
    }
    this.logger.info('Para actualizarlo: npm run openapi:generate, y commitea el resultado.')
    this.exitCode = 1
  }
}

/**
 * Recorre los dos documentos a la vez y anota cada diferencia con su JSON
 * Pointer (RFC 6901), que es como OpenAPI nombra las ubicaciones dentro del
 * documento (`/paths/~1api~1v1~1tasks/get/...`).
 */
function collectDifferences(before: unknown, after: unknown, path: string, out: Difference[]) {
  if (isDeepStrictEqual(before, after)) return

  const bothObjects =
    isContainer(before) && isContainer(after) && Array.isArray(before) === Array.isArray(after)

  if (!bothObjects) {
    out.push({ kind: 'cambiado', path })
    return
  }

  const beforeRecord = before as Record<string, unknown>
  const afterRecord = after as Record<string, unknown>
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])

  for (const key of keys) {
    const childPath = `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
    if (!(key in beforeRecord)) out.push({ kind: 'añadido', path: childPath })
    else if (!(key in afterRecord)) out.push({ kind: 'eliminado', path: childPath })
    else collectDifferences(beforeRecord[key], afterRecord[key], childPath, out)
  }
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
