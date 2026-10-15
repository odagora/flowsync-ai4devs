import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { diffDocuments, renderDocument, VERSIONED_DOCUMENT_PATH } from '#openapi/document'

/**
 * Cuántas diferencias se listan como mucho. Un cambio grande (una capability
 * nueva entera) puede dar cientos; a partir de aquí basta con el recuento.
 */
const MAX_LISTED_DIFFERENCES = 50

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento que genera el código'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const versionedPath = relative(process.cwd(), VERSIONED_DOCUMENT_PATH)
    const versioned = await readFile(VERSIONED_DOCUMENT_PATH, 'utf-8').catch(() => null)

    if (versioned === null) {
      this.fail(`No existe ${versionedPath}. Genéralo con \`npm run openapi:generate\`.`)
      return
    }

    // Se regenera en un directorio temporal y nunca sobre el versionado: la
    // comprobación solo compara, no arregla.
    const tmpDir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    let generated: string
    try {
      const generatedPath = join(tmpDir, 'openapi.json')
      await writeFile(generatedPath, await renderDocument())
      generated = await readFile(generatedPath, 'utf-8')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }

    if (generated === versioned) {
      this.logger.success(`${versionedPath} está al día`)
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(versioned)
    } catch (error) {
      this.fail(`${versionedPath} no es JSON válido (${(error as Error).message}).`)
      return
    }

    const differences = diffDocuments(parsed, JSON.parse(generated))
    const lines = [`${versionedPath} no coincide con el documento que genera el código.`]

    if (differences.length === 0) {
      lines.push('El contenido es equivalente, pero el formato del fichero difiere.')
    } else {
      lines.push(
        `${differences.length} diferencia(s), desde el punto de vista del código respecto al fichero versionado:`
      )
      for (const { kind, path } of differences.slice(0, MAX_LISTED_DIFFERENCES)) {
        lines.push(`  ${kind.padEnd(9)} ${path}`)
      }
      if (differences.length > MAX_LISTED_DIFFERENCES) {
        lines.push(`  … y ${differences.length - MAX_LISTED_DIFFERENCES} más`)
      }
    }

    lines.push(
      'Si el cambio en el contrato es intencionado, regenera con `npm run openapi:generate` y commitea el resultado.'
    )
    this.fail(lines.join('\n'))
  }

  private fail(message: string) {
    this.logger.error(message)
    this.exitCode = 1
  }
}
