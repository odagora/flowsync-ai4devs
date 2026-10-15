import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { renderDocument, VERSIONED_DOCUMENT_PATH } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI y lo escribe en docs/api/openapi.json'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const content = await renderDocument()

    await mkdir(dirname(VERSIONED_DOCUMENT_PATH), { recursive: true })
    await writeFile(VERSIONED_DOCUMENT_PATH, content)

    this.logger.success(
      `Documento OpenAPI escrito en ${relative(process.cwd(), VERSIONED_DOCUMENT_PATH)}`
    )
  }
}
