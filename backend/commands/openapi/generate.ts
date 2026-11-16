import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import {
  OPENAPI_DOCUMENT_PATH,
  buildOpenAPIDocument,
  serializeOpenAPIDocument,
} from '#openapi/document'

export default class OpenAPIGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI de la API y lo escribe en docs/api/openapi.json'

  static options: CommandOptions = { startApp: true }

  async run() {
    const content = serializeOpenAPIDocument(await buildOpenAPIDocument())

    await mkdir(dirname(OPENAPI_DOCUMENT_PATH), { recursive: true })
    await writeFile(OPENAPI_DOCUMENT_PATH, content, 'utf-8')

    this.logger.success(
      `Documento OpenAPI escrito en ${relative(process.cwd(), OPENAPI_DOCUMENT_PATH)}`
    )
  }
}
