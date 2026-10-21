import { relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { buildOpenAPIDocument, openAPIDocumentPath, writeOpenAPIDocument } from '#openapi/document'

/**
 * Escribe el documento OpenAPI en `docs/api/openapi.json`. Hay que correrlo y
 * commitear el resultado cada vez que cambian las rutas o los decoradores de
 * los controladores; `openapi:check` falla mientras no se haga.
 */
export default class OpenAPIGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI en docs/api/openapi.json'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const path = openAPIDocumentPath(this.app)
    await writeOpenAPIDocument(path, await buildOpenAPIDocument(this.app))
    this.logger.success(`Documento OpenAPI escrito en ${relative(process.cwd(), path)}`)
  }
}
