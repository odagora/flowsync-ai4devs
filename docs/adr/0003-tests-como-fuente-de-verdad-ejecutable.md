# 3. Los tests de integración, única fuente de verdad ejecutable del comportamiento

## Contexto

El [ADR 0002](./0002-openspec-como-fuente-de-verdad.md) hizo de las specs principales de `openspec/specs/` la fuente de verdad del comportamiento, alimentadas por delta-specs a través de changes. Ese mismo ADR ya anotaba entre sus costes que nada hacía cumplir la decisión. La spec solo era verdad mientras alguien la verificaba, y la única verificación automática posible eran los tests.

Al escribir el ADR 0002, el estado del repo era este:

- **La spec afirmaba cosas falsas sin que nada fallara.** Había dos divergencias abiertas en `tasks`:
  - `707c9b6` hace que una tarea hecha con la fecha pasada salga vencida.
  - `2ccf2c1` hace que un estado inventado devuelva `200 []` en lugar de `422`.
- **La única regresión de la capability que se cazó la cazó un test, no la spec.** `ed2c748` volvió a exponer el email del responsable, la spec siguió diciendo lo contrario durante casi dos meses y fueron los tests de `462ca92` los que lo hicieron visible.
- **El ciclo de un change** (proposal, design, tasks, delta y archivo) **resultaba caro para cambios pequeños.** Esa fricción explica que los tres refactors del 2026-08-18 se hicieran sin change.
- **La batería existente** estaba en `backend/tests/functional/`, con Japa y `@japa/api-client` contra la API HTTP real:
  - `auth`: 18 tests en 4 ficheros.
  - `tasks`: 3 tests, que cubrían 1 de sus 32 requisitos.
- **No había CI** (no existe `.github/`). Los tests solo corren cuando alguien lanza `npm test`.

El supuesto de partida de este ADR es que **el equipo deja de mantener las specs de OpenSpec**. Con dos fuentes de verdad, una que se ejecuta y otra que no, el equipo acaba confiando solo en la que falla en rojo. Mantener la otra al día es trabajo que ya no se hace. Este ADR registra el cambio para que la spec no siga pareciendo vigente cuando ya no lo es.

## Decisión

**Los tests de integración de `backend/tests/functional/` son la única fuente de verdad ejecutable del comportamiento de FlowSync. OpenSpec deja de mantenerse.**

En concreto:

- **Precedencia.** Si un test y el código discrepan, el test manda: o el código tiene un defecto, o el cambio de comportamiento es deliberado y el test se modifica en el mismo PR, explicando el porqué en el cuerpo del PR. Cualquier otro documento (spec, README de capability, OpenAPI, backlog) que contradiga a un test está desactualizado.
- **Un cambio de comportamiento empieza por el test.** Añadir o cambiar una regla es añadir o cambiar el test que la fija, y ese test falla antes del cambio de código.
- **Los tests se escriben para leerse como especificación.** Habrá un `test.group` por regla y un `test` por caso, con títulos en castellano que digan la conducta («un estado inventado se rechaza con 422 sobre `status`»), no la mecánica. El comentario del grupo explica el porqué, que antes vivía en el `proposal.md`.
- **Tests que no se fían del código.** Las reglas se toman de la intención del producto (spec congelada, historia o PR), no del comportamiento actual. Un test escrito mirando el código fija como correcto lo que el código ya hace, incluidos sus bugs.
- **OpenSpec se congela, no se borra.**
  - `openspec/specs/` se queda como fotografía histórica del contrato en la fecha de este ADR, con un aviso al principio de cada spec que remita aquí.
  - `openspec/changes/archive/` se conserva como registro de decisiones pasadas.
  - No se abren changes nuevos.
- **El aislamiento de la base de datos deja de ser opcional.** Hoy las suites usan el mismo SQLite que el servidor de desarrollo. Todo grupo que escriba usa `testUtils.db().withGlobalTransaction()` o un equivalente; un test que deja estado tras de sí rompe la fuente de verdad.

Fuera de esta decisión queda **el comportamiento de la interfaz**. El frontend no tiene runner de tests, así que los requisitos de pantalla de la spec congelada no tienen sustituto ejecutable. Hasta que otro ADR introduzca tests end-to-end, esas reglas no tienen fuente de verdad viva.

## Estado

Aceptada. Reemplaza al [ADR 0002](./0002-openspec-como-fuente-de-verdad.md).

## Consecuencias

**Lo que ganamos**

- **La fuente de verdad no puede mentir en silencio.** Una regla rota es un test en rojo, no una frase falsa en un markdown que nadie relee. Las divergencias de `707c9b6` y `2ccf2c1` habrían fallado en cuanto existiera su test.
- **Desaparece el doble mantenimiento** entre spec y código, y con él la ceremonia de proposal, design, delta y archivo para cambios pequeños. Un cambio de comportamiento es un PR con test y código.
- **La verificación es concreta.** Un test dice exactamente qué petición, qué respuesta y qué estado de la base de datos, mientras que un escenario `WHEN`/`THEN` en prosa admitía varias lecturas.
- **La conducta queda junto al código** que la implementa y se revisa en el mismo diff.

**Lo que nos cuesta**

- **La migración parte casi de cero.** `tasks` tiene 3 tests para 32 requisitos. Mientras no se escriban los que faltan, esas reglas no tienen ninguna fuente de verdad viva: la spec congelada ya no manda y el test todavía no existe. Ese hueco es más peligroso que la situación anterior.
- **Sin CI, «ejecutable» solo significa «ejecutable si alguien lo ejecuta».** Esta decisión pierde casi todo su valor hasta que `npm test` corra en cada PR y bloquee el merge.
- **La interfaz se queda sin fuente de verdad.** Aproximadamente la mitad de los requisitos de `tasks` son de pantalla: estados vacíos, filtro, teclado, señal de vencida que no depende solo del color. Ninguno se puede expresar en un test de integración del backend, y hoy no existe ningún runner en `frontend/`.
- **Se pierde el porqué.** OpenSpec separaba qué hace el sistema (spec) de por qué (proposal y design). Un test fija lo primero y solo admite lo segundo en un comentario o en el PR, que es más fácil de omitir y más difícil de encontrar. Decisiones como cerrar PA-9 en 200 caracteres pasan a vivir en la descripción de un PR.
- **Producto deja de poder leer el contrato.** Una spec en castellano con `SHALL`, `WHEN` y `THEN` se podía revisar sin saber TypeScript; un fichero de Japa, no. La conversación sobre qué debe hacer el sistema necesita otro soporte, y el backlog no lo es, porque ya estaba desfasado respecto a la spec.
- **Un test puede consagrar un bug.** Si se escribe mirando el código y no la intención, fija como correcto el `200 []` de `2ccf2c1` o la tarea hecha y vencida de `707c9b6`. La spec congelada sigue siendo la mejor referencia de la intención para escribir esos tests, y es la razón para no borrarla.
- **Lo construido sobre el ADR 0002 hay que revisarlo:**
  - [`docs/capabilities/tasks/README.md`](../capabilities/tasks/README.md) enlaza 32 requisitos por ancla.
  - Las descripciones del documento OpenAPI y los comentarios de los tests citan escenarios de la spec.
  - Las skills `openspec-*` y `/opsx:*` del repo quedan obsoletas.
- **Los tests se vuelven más lentos y más frágiles de mantener que un markdown.** Una suite que es contrato no puede tener tests intermitentes, y hoy comparte el fichero SQLite con el servidor de desarrollo. Si alguien olvida el aislamiento, los resultados dependen del orden de ejecución y de lo que haya en la base de datos local.
