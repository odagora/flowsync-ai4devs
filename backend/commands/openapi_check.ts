import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  VERSIONED_DOCUMENT_PATH,
  diffDocuments,
  versionedDocumentPath,
  writeDocument,
} from '#openapi/document'

/**
 * Cuántas diferencias se listan como mucho. Más allá, la lista deja de
 * ayudar: basta con saber que hay que regenerar.
 */
const MAX_LISTED_DIFFERENCES = 50

/**
 * Comprueba que `docs/api/openapi.json` coincide con el documento que genera
 * el código actual. Regenera en un directorio temporal y compara; **nunca**
 * escribe el fichero versionado. Si no coinciden, explica dónde difieren y
 * termina con código de salida 1.
 */
export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description = `Comprueba que ${VERSIONED_DOCUMENT_PATH} está al día con el código`

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const directory = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    try {
      const generated = await writeDocument(join(directory, 'openapi.json'))
      const versioned = await this.#readVersioned()
      if (versioned === null) return

      if (generated === versioned) {
        this.logger.success(`${VERSIONED_DOCUMENT_PATH} está al día`)
        return
      }

      this.#reportMismatch(versioned, generated)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }

  async #readVersioned() {
    try {
      return await readFile(versionedDocumentPath(), 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      this.logger.error(`${VERSIONED_DOCUMENT_PATH} no existe`)
      this.logger.info('Genéralo con `npm run openapi:generate` y commitéalo')
      this.exitCode = 1
      return null
    }
  }

  #reportMismatch(versioned: string, generated: string) {
    this.exitCode = 1
    this.logger.error(
      `${VERSIONED_DOCUMENT_PATH} no coincide con el documento que genera el código`
    )

    let differences
    try {
      differences = diffDocuments(JSON.parse(versioned), JSON.parse(generated))
    } catch {
      this.logger.info(`${VERSIONED_DOCUMENT_PATH} no es JSON válido`)
      return this.#hint()
    }

    // Mismo contenido, distinto formato: alguien editó el fichero a mano o con
    // otro serializador.
    if (differences.length === 0) {
      this.logger.info('El contenido es el mismo, pero el formato del fichero no es el generado')
      return this.#hint()
    }

    const labels = {
      added: 'falta en el versionado',
      removed: 'sobra en el versionado',
      changed: 'distinto',
    }
    this.logger.info(`${differences.length} diferencia(s), por ruta JSON:`)
    for (const { kind, path } of differences.slice(0, MAX_LISTED_DIFFERENCES)) {
      this.logger.log(`  ${this.colors.yellow(labels[kind].padEnd(22))} ${path}`)
    }
    if (differences.length > MAX_LISTED_DIFFERENCES) {
      this.logger.log(`  … y ${differences.length - MAX_LISTED_DIFFERENCES} más`)
    }
    this.#hint()
  }

  #hint() {
    this.logger.info(
      'Si el cambio de contrato es intencionado, regenera con `npm run openapi:generate` y commitea el diff'
    )
  }
}
