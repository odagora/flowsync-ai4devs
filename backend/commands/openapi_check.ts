import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  OPENAPI_DOCUMENT_PATH,
  diffJson,
  renderOpenApiDocument,
  type JsonDifference,
} from '#openapi/document_file'

const MAX_LISTED = 50

/**
 * Regenera el documento OpenAPI en un directorio temporal y lo compara con el
 * versionado en `docs/api/openapi.json`. Solo compara: nunca escribe en el
 * fichero versionado. Si no coinciden, explica la diferencia y sale con código 1.
 */
export default class OpenApiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento que produce el código'
  static options: CommandOptions = { startApp: true }

  async run() {
    const versionedPath = relative(process.cwd(), OPENAPI_DOCUMENT_PATH)

    const tmpDir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    const generatedPath = join(tmpDir, 'openapi.json')
    let generated: string
    try {
      await writeFile(generatedPath, await renderOpenApiDocument())
      generated = await readFile(generatedPath, 'utf-8')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }

    let versioned: string
    try {
      versioned = await readFile(OPENAPI_DOCUMENT_PATH, 'utf-8')
    } catch {
      return this.fail(`No existe ${versionedPath}.`)
    }

    if (versioned === generated) {
      this.logger.success(`${versionedPath} está al día con el código`)
      return
    }

    let versionedJson: unknown
    try {
      versionedJson = JSON.parse(versioned)
    } catch (error) {
      return this.fail(`${versionedPath} no es JSON válido: ${(error as Error).message}`)
    }

    const differences = diffJson(versionedJson, JSON.parse(generated))
    if (differences.length === 0) {
      return this.fail(
        `${versionedPath} tiene el mismo contenido que el generado, pero distinto formato ` +
          '(sangría, orden de claves o salto de línea final).'
      )
    }

    const lines = differences.slice(0, MAX_LISTED).map((d) => this.describe(d))
    if (differences.length > MAX_LISTED) {
      lines.push(`… y ${differences.length - MAX_LISTED} diferencias más`)
    }
    this.fail(
      `${versionedPath} no coincide con el documento que produce el código ` +
        `(${differences.length} diferencia${differences.length === 1 ? '' : 's'}):\n` +
        lines.join('\n')
    )
  }

  private describe(d: JsonDifference): string {
    const c = this.colors
    switch (d.kind) {
      case 'added':
        return `  ${c.green('+')} ${d.pointer}  (falta en el fichero): ${preview(d.actual)}`
      case 'removed':
        return `  ${c.red('-')} ${d.pointer}  (sobra en el fichero): ${preview(d.expected)}`
      case 'changed':
        return `  ${c.yellow('~')} ${d.pointer}: ${preview(d.expected)} → ${preview(d.actual)}`
    }
  }

  private fail(reason: string) {
    this.logger.error(reason)
    this.logger.info('Ejecuta `npm run openapi:generate` y commitea docs/api/openapi.json.')
    this.exitCode = 1
  }
}

function preview(value: unknown): string {
  const text = JSON.stringify(value)
  return text.length > 80 ? `${text.slice(0, 77)}...` : text
}
