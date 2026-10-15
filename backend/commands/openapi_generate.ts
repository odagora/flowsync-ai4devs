import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { VERSIONED_DOCUMENT_PATH, versionedDocumentPath, writeDocument } from '#openapi/document'

/**
 * Escribe en `docs/api/openapi.json` el mismo documento que el servidor sirve
 * en `/api.json`. Es la única forma prevista de actualizar ese fichero: se
 * corre tras tocar rutas, controladores, validadores, transformers o
 * `app/openapi/schemas.ts`, y el resultado se commitea con el cambio.
 */
export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = `Genera el documento OpenAPI y lo escribe en ${VERSIONED_DOCUMENT_PATH}`

  static options: CommandOptions = {
    // Hace falta la app arrancada: las rutas se registran en los preloads y el
    // servicio `openapi` lo registra su provider.
    startApp: true,
  }

  async run() {
    await writeDocument(versionedDocumentPath())
    this.logger.success(`Documento OpenAPI escrito en ${VERSIONED_DOCUMENT_PATH}`)
  }
}
