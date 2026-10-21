import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  buildOpenAPIDocument,
  diffOpenAPIDocuments,
  openAPIDocumentPath,
  writeOpenAPIDocument,
  type OpenAPIDifference,
} from '#openapi/document'

/**
 * Cuántas diferencias se enumeran antes de resumir el resto: lo justo para
 * saber qué ha cambiado sin enterrar la salida cuando cambia medio documento.
 */
const MAX_LISTED_DIFFERENCES = 30

/**
 * Comprueba que `docs/api/openapi.json` coincide con el documento que sale del
 * código. Regenera el documento en un directorio temporal y compara: nunca
 * escribe en el fichero versionado. Si no coinciden, explica la diferencia y
 * sale con código 1; la corrección es correr `openapi:generate` y commitear.
 */
export default class OpenAPICheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description = 'Comprueba que docs/api/openapi.json está al día con el código'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const committedPath = openAPIDocumentPath(this.app)
    const displayPath = relative(process.cwd(), committedPath)

    const committed = await readFile(committedPath, 'utf-8').catch(() => null)
    if (committed === null) {
      this.#fail(`No existe ${displayPath}.`)
      return
    }

    const generated = await this.#generateInTemporaryDirectory()
    if (generated === committed) {
      this.logger.success(`${displayPath} está al día`)
      return
    }

    let committedDocument: unknown
    try {
      committedDocument = JSON.parse(committed)
    } catch (error) {
      this.#fail(`${displayPath} no es JSON válido: ${(error as Error).message}`)
      return
    }

    const differences = diffOpenAPIDocuments(committedDocument, JSON.parse(generated))
    if (differences.length === 0) {
      this.#fail(
        `${displayPath} describe el mismo contrato, pero no tiene el formato que escribe openapi:generate.`
      )
      return
    }

    this.#fail(
      `${displayPath} no coincide con el documento generado desde el código ` +
        `(${differences.length} ${differences.length === 1 ? 'diferencia' : 'diferencias'}):`,
      differences
    )
  }

  /**
   * Genera el documento en un directorio temporal propio y devuelve su
   * contenido. Pasar por disco, en vez de comparar con lo serializado en
   * memoria, compara exactamente lo que `openapi:generate` habría escrito.
   */
  async #generateInTemporaryDirectory() {
    const directory = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    try {
      const path = join(directory, 'openapi.json')
      await writeOpenAPIDocument(path, await buildOpenAPIDocument(this.app))
      return await readFile(path, 'utf-8')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }

  #fail(message: string, differences: OpenAPIDifference[] = []) {
    this.logger.error(message)

    for (const difference of differences.slice(0, MAX_LISTED_DIFFERENCES)) {
      this.logger.log(`  ${this.#describe(difference)}`)
    }
    if (differences.length > MAX_LISTED_DIFFERENCES) {
      this.logger.log(`  … y ${differences.length - MAX_LISTED_DIFFERENCES} más`)
    }

    this.logger.log(
      `Para actualizarlo: ${this.colors.cyan('npm run openapi:generate')} y commitea el resultado.`
    )
    this.exitCode = 1
  }

  #describe(difference: OpenAPIDifference) {
    const show = (value: unknown) => {
      const json = JSON.stringify(value)
      return json.length > 80 ? `${json.slice(0, 77)}...` : json
    }

    switch (difference.kind) {
      case 'added':
        return `${this.colors.green('+')} ${difference.pointer}: solo en el código ${this.colors.dim(show(difference.value))}`
      case 'removed':
        return `${this.colors.red('-')} ${difference.pointer}: solo en el fichero ${this.colors.dim(show(difference.value))}`
      case 'changed':
        return `${this.colors.yellow('~')} ${difference.pointer}: ${show(difference.before)} en el fichero, ${show(difference.after)} en el código`
    }
  }
}
