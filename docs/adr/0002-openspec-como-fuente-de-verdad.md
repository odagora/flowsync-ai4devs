# 2. Las delta-specs de OpenSpec como fuente de verdad viva

## Contexto

FlowSync necesita un sitio donde diga qué hace el sistema, al que puedan remitirse por igual el código, los tests, el documento OpenAPI y quien revisa un cambio. Hoy ese sitio ya existe de hecho en `openspec/`, aunque nunca se ha decidido por escrito:

- **La spec viva**, una por capability: `openspec/specs/auth/spec.md` y `openspec/specs/tasks/spec.md`. Cada requisito va con `SHALL` / `NO SHALL` y escenarios `WHEN` / `THEN`. La de `tasks` tiene 32 requisitos y 753 líneas, y mezcla contrato de API con comportamiento de interfaz.
- **Los changes archivados**, en `openspec/changes/archive/`, todos del 2026-08-13. Cada uno trae `proposal.md` (por qué y qué queda fuera), `design.md`, `tasks.md` y una delta-spec por capability tocada, con secciones `ADDED Requirements` y `MODIFIED Requirements`. Al archivar, la delta se funde en la spec viva. Un `MODIFIED` sustituye el requisito entero, no lo parchea.
  - `add-task-list`: crea `tasks` con 14 requisitos y modifica 3 requisitos de `auth`, además de añadirle 1.
  - `add-task-due-date`: añade 11 requisitos y modifica *Una sola vista de tareas, sin señales de presencia*.
  - `add-task-status-filter`: añade 7 requisitos y modifica 4, entre ellos otra vez *Una sola vista de tareas…*. Es un change **retroactivo**. FS-142 se había implementado por delegación directa con la instrucción de no tocar `openspec/`, y la spec viva seguía diciendo que la lista devolvía «todas las tareas del espacio» cuando ya no era así (commit `2de0f39`). El change no tocó código: solo hizo que el contrato dijera la verdad.
- **No hay changes activos**, y `openspec/config.yaml` está con la configuración por defecto (`schema: spec-driven`, sin `context` ni `rules`). Los flujos de proponer, aplicar, verificar, sincronizar y archivar están en `.claude/skills/openspec-*` y `.claude/commands/opsx`.

Ya hemos usado la spec como vara de medir. Al contrastar con ella el documento OpenAPI servido en `/api.json` salieron dos cosas: el documento no recogía casi nada, y el código ha vuelto a separarse del contrato. El commit `2ccf2c1` (2026-08-18) cambió `listTasksValidator` de `vine.enum(TASK_STATUSES)` a `vine.string()`, así que `GET /api/v1/tasks?status=archivado` responde `200` con lista vacía. Los escenarios *Estado inventado* y *El error no se confunde con la ausencia* exigen un `422`. Ningún test ni ninguna herramienta lo detectó.

Las alternativas reales son:
1. Que la verdad sea el código, con la spec como documentación que se pone al día cuando alguien se acuerda. Es lo que pasó con FS-142, y la spec acabó mintiendo.
2. Repartirla entre PRD, backlog (`docs/prd/`, `docs/backlog/`), OpenAPI y tests.
3. Fijarla en `openspec/`.

## Decisión

La spec viva de OpenSpec (`openspec/specs/<capability>/spec.md`) es la fuente de verdad del comportamiento de FlowSync, y solo cambia a través de delta-specs:

1. **Todo cambio de comportamiento entra como un change de OpenSpec**, con propuesta, diseño, tareas y delta-spec. Al terminar se archiva, y es el archivo el que funde la delta en la spec viva. No se edita `openspec/specs/` a mano.
2. **Si el código se ha adelantado al contrato, se abre un change retroactivo** que documente lo que el sistema ya hace, como hizo `add-task-status-filter`, o se deshace el cambio de código. No vale corregir la spec en silencio.
3. **Si el código y la spec discrepan, el defecto es del código mientras ningún change diga otra cosa.** El caso actual de `listTasksValidator` se resuelve devolviendo el enum al validador, o con un change que cambie el requisito.
4. **Lo demás deriva de la spec y no la sustituye.** Eso incluye los tests functional, el documento OpenAPI (`app/openapi/schemas.ts` y los decoradores de los controladores), los tipos del frontend y este directorio `docs/`. Si alguno dice algo distinto de la spec, el que se corrige es él. Si lo que describe es el código y el código se desvía, lo anota como desviación, como hace hoy la descripción del parámetro `status` en OpenAPI.
5. **El PRD y el backlog siguen siendo el origen de las historias** (FS-118, FS-142…). Dejan de ser contrato cuando un change las traduce a requisitos.

## Estado

Aceptada, 2026-10-04. Registra una práctica que el proyecto ya seguía desde el 2026-08-13 (`5b5cd0a`, `2de0f39`) pero que no estaba escrita en ninguna parte.

## Consecuencias

**Lo que ganamos**

- **Requisitos que se pueden verificar uno a uno.** Cada escenario `WHEN` / `THEN` es casi un test, y ya ha servido para auditar OpenAPI y para encontrar la regresión del filtro.
- **El porqué no se pierde.** Las propuestas y diseños archivados recogen decisiones que el código no explica: el límite de 200 caracteres (PA-9), el orden de la lista, las transiciones libres desde `done` (PA-7), elegir CA-9 frente a CA-17, y por qué la lista no lleva el vencimiento.
- **Los requisitos negativos sobreviven.** «No hay vista de mis tareas», «la lista no adelanta el vencimiento» o «el estado es la única dimensión de filtrado» no dejan rastro en el código, y sin un sitio donde vivan acaban borrándose con la primera mejora bienintencionada.
- **Lo que queda fuera se dice en voz alta.** Cada propuesta deja escrito lo que no hace y los riesgos que acepta, como «sin tests» o CA-11, CA-12 y CA-14 sin implementar.

**Lo que nos cuesta**

- **La spec solo es verdad si algo la comprueba, y hoy nada lo hace.** Ningún test ni CI enlaza escenarios con código. La desviación de `2ccf2c1` lleva semanas sin que nadie la vea, y los tres changes se cerraron con «sin tests» como decisión explícita. Mantener esta decisión exige escribir los tests functional que la spec ya describe y revisar cada PR contra ella: es trabajo que antes no se hacía.
- **Todo cambio de comportamiento paga un peaje.** Hay que proponer, diseñar, desglosar, escribir la delta y archivar, también para cambios pequeños. Cuando alguien se lo salta (FS-142, `2ccf2c1`), la deuda vuelve como un change retroactivo y un commit de reconciliación.
- **`MODIFIED` reemplaza el requisito entero.** Cambiar una frase obliga a copiar el bloque completo, con todos sus escenarios. Por eso dos changes que tocan el mismo requisito tienen que ir en serie: `add-task-status-filter` tuvo que arrastrar el texto que `add-task-due-date` había metido en *Una sola vista de tareas…*. Si se archivan en otro orden, o en paralelo, el último en archivar borra lo del otro sin avisar.
- **Hay partes de la spec que una delta no puede tocar.** El `## Purpose` de `tasks` sigue diciendo «todas las tareas del espacio» porque un `MODIFIED` no llega hasta ahí (lo reconoce `2de0f39`). Corregirlo pide una edición manual, que choca con la regla 1, o una herramienta que hoy no tenemos.
- **La historia no empieza en el principio.** La spec de `auth` (307 líneas) entró entera en `5b5cd0a` sin ningún change que la creara: de su línea base no hay propuesta ni diseño que expliquen sus decisiones.
- **El mismo contrato se escribe varias veces.** La spec, el documento OpenAPI, los tipos de `frontend/src/lib/types.ts` y `DEFAULT_LIST_STATUSES` (copiado en backend y frontend) describen lo mismo y se mantienen a mano. Elegir una fuente de verdad no elimina las copias: solo decide cuál gana cuando discrepan.
- **Leer la spec es caro.** `tasks` ya pasa de 750 líneas mezclando API e interfaz, y cada change archivado repite texto de la spec viva. Hace falta criterio para saber qué escenarios importan en cada cambio, o la spec deja de leerse.
- **La regla todavía no está donde la leen los agentes.** Ni `CLAUDE.md` ni `AGENTS.md` mencionan `openspec/`. Un prompt que diga «no toques openspec/», como el de FS-142, gana a esta decisión mientras siga así. Hay que añadir la regla a esos dos ficheros, y conviene rellenar el `context` de `openspec/config.yaml` para que los changes nuevos nazcan con las convenciones del proyecto.
