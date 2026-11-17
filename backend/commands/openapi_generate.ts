import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { OPENAPI_DOCUMENT_PATH, renderOpenApiDocument } from '#openapi/document_file'

/**
 * Escribe el documento OpenAPI en `docs/api/openapi.json`, el fichero
 * versionado que `openapi:check` compara contra lo que el código produce.
 */
export default class OpenApiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI y lo escribe en docs/api/openapi.json'
  static options: CommandOptions = { startApp: true }

  async run() {
    const content = await renderOpenApiDocument()
    await mkdir(dirname(OPENAPI_DOCUMENT_PATH), { recursive: true })
    await writeFile(OPENAPI_DOCUMENT_PATH, content)
    this.logger.success(
      `Documento OpenAPI escrito en ${relative(process.cwd(), OPENAPI_DOCUMENT_PATH)}`
    )
  }
}
