# 2. OpenSpec, alimentado por delta-specs, como fuente de verdad viva del comportamiento

## Contexto

FlowSync describe su producto en cuatro capas que hoy conviven en el repo:

1. **PRD**: [`docs/prd/`](../prd/), con el qué y el porqué del MVP y sus preguntas abiertas (`PA-n`).
2. **Backlog**: [`docs/backlog/`](../backlog/), con historias de usuario y criterios de aceptación (`CA-n`). Su README afirma que «los criterios de aceptación viven en las historias».
3. **OpenSpec**: [`openspec/`](../../openspec/), con `schema: spec-driven` en `config.yaml` y sin contexto ni reglas propias configuradas todavía. Contiene:
   - **Specs principales**, una por capability: [`specs/auth/spec.md`](../../openspec/specs/auth/spec.md) (19 requisitos) y [`specs/tasks/spec.md`](../../openspec/specs/tasks/spec.md) (32 requisitos). Cada requisito se formula con `SHALL` y se prueba con escenarios `WHEN`/`THEN`.
   - **Changes archivados** en `changes/archive/`, los tres con fecha `2026-08-13`. Cada uno lleva `proposal.md`, `design.md`, `tasks.md` y unas **delta-specs** que no reescriben la spec, sino que dicen qué requisitos entran (`ADDED`) y cuáles se sustituyen (`MODIFIED`):

     | Change | `tasks` | `auth` |
     |---|---|---|
     | `add-task-list` | 14 ADDED | 3 MODIFIED, 1 ADDED |
     | `add-task-status-filter` | 7 ADDED, 4 MODIFIED | — |
     | `add-task-due-date` | 11 ADDED, 1 MODIFIED | — |

     Al archivar, cada delta se fusiona en la spec principal. Los 32 requisitos de `tasks` son exactamente la suma de los ADDED de los tres changes, y los MODIFIED reescriben requisitos que ya existían. Por ejemplo, «Una sola vista de tareas, sin señales de presencia» nace en `add-task-list` y la modifican después los otros dos.
4. **Código y tests**, en `backend/` y `frontend/`.

La spec de `auth` no nace de ningún change: se escribió directamente como línea base, y el primer change que la toca es `add-task-list`, que solo la modifica.

Las proposals actúan de puente entre capas. Citan las historias y los PA del PRD y **cierran decisiones que el backlog dejaba abiertas**:
- El límite de 200 caracteres del título (PA-9).
- Las transiciones libres entre estados (E2-4/CA-3, PA-7).
- La resolución del conflicto entre CA-9 y CA-17 a favor de CA-9. La desviación respecto a CA-17 solo queda anotada en el `design.md` del change.

Por tanto, tras un change archivado la historia del backlog ya no describe con exactitud lo que hace el sistema: describe lo que se pidió.

El historial muestra lo que pasa cuando el código se mueve sin pasar por OpenSpec:

- **FS-142 (filtro por estado)** se implementó con la instrucción explícita «no toques `openspec/`». La spec acabó contradiciendo al código en dos sitios: decía que la lista devolvía «todas las tareas» y la vista por defecto ya excluía las hechas. Se reparó a posteriori con un change propio que solo documenta, `add-task-status-filter`, archivado en `2de0f39`.
- **El 2026-08-18, tres refactors** tocaron la capability sin ningún change, y los tres contradicen la spec vigente:
  - `ed2c748` reutilizó `UserTransformer` para el responsable y volvió a exponer su email, contra el escenario «La tarea no filtra datos de cuenta». Solo se detectó al escribir tests a partir de ese escenario (`462ca92`), y se corrigió en `457d462`.
  - `707c9b6` quitó de `Task.isOverdueOn` la condición «la tarea no está hecha», contra los escenarios «Darla por hecha la deja de vencer» y «Una tarea hecha con la fecha pasada». **Sigue sin corregir.**
  - `2ccf2c1` cambió el filtro de `vine.enum(...)` a `vine.string()`, y un estado inventado devuelve `200 []` en lugar del `422` que exige «Estado inventado». **Sigue sin corregir.**
- **Dos changes se archivaron con tareas sin marcar**: 4 en `add-task-list` y 5 en `add-task-due-date`, todas de verificación manual en el navegador. Archivar no exige que el change esté verificado.
- **La trazabilidad spec → test es mínima.** Hay un único fichero de tests de tareas, `tests/functional/tasks/assignee.spec.ts`, que cubre 1 de los 32 requisitos.

A la vez, ya hay artefactos que tratan la spec como contrato y remiten a ella en lugar de copiarla: el documento OpenAPI, [`docs/capabilities/tasks/README.md`](../capabilities/tasks/README.md) y los comentarios de los propios tests.

Hace falta decidir explícitamente cuál de estas capas manda cuando discrepan.

## Decisión

**Las specs principales de `openspec/specs/<capability>/spec.md` son la fuente de verdad del comportamiento actual de FlowSync. Solo cambian archivando un change cuyas delta-specs digan qué requisitos entran, cuáles se modifican y cuáles se retiran.**

En concreto:

- **Precedencia.** Si la spec y el código discrepan, el código tiene un defecto o falta un change; nunca se da la spec por desactualizada sin más. Si la spec y una historia del backlog discrepan, manda la spec. La historia y el PRD quedan como registro de la **intención** que originó el cambio, no del comportamiento vigente.
- **Todo cambio de comportamiento observable pasa por un change.** Eso incluye los refactors que alteran una respuesta, una validación o una regla. Un refactor que de verdad no cambia nada observable no necesita change, pero tampoco puede hacer fallar ningún escenario.
- **Las delta-specs se escriben por requisito completo.** Un `MODIFIED` reescribe el requisito entero con todos sus escenarios, no solo el que cambia, porque al archivar sustituye el bloque.
- **Lo que no es una regla va al change, no a la spec.** El porqué y las alternativas van en `proposal.md` y `design.md`; las desviaciones respecto a una historia, también. La spec solo dice qué hace el sistema.
- **Ningún otro documento repite requisitos.** El README de capability, la documentación OpenAPI y los comentarios de código enlazan al requisito por su ancla.
- **Cuando el código ya ha divergido**, como en FS-142, se abre un change que documente lo que hace el código si esa conducta es la deseada, o se corrige el código si no lo es. Lo que no vale es dejar la discrepancia sin registrar.

## Estado

Aceptada.

La práctica se sigue de hecho desde el 2026-08-13: `2de0f39` llama a la spec «spec viva» y repara FS-142 con un change propio. Este ADR la deja por escrito. Las dos divergencias abiertas citadas en el contexto (`707c9b6` y `2ccf2c1`) no se corrigen aquí, y quedan pendientes de su propio change o arreglo.

## Consecuencias

**Lo que ganamos**

- Hay **una sola respuesta** a «¿qué hace hoy el sistema?», legible sin leer código y con escenarios verificables uno a uno. Lo que el backlog dejó abierto (PA-7, PA-9, CA-9 frente a CA-17) queda cerrado en un único sitio.
- **Cada regla tiene historia.** Los changes archivados explican cuándo y por qué entró o cambió cada requisito, separados del contrato vigente.
- **Los escenarios sirven de guion de tests.** El único test de tareas que existe se escribió a partir de tres escenarios y bastó para cazar la regresión de `ed2c748`, que nadie había notado en casi dos meses.
- **La documentación derivada no puede desincronizarse de la regla, solo de su enlace**: el README, el OpenAPI y los comentarios apuntan a la spec.
- **Da un contexto estable a los agentes de IA** que trabajan en el repo: las skills `openspec-*` y `/opsx:*` operan sobre estos ficheros.

**Lo que nos cuesta**

- **Nada hace cumplir la decisión.** Ni CI, ni un hook ni ningún test comprueba que la spec y el código coincidan. Los cuatro casos del contexto (FS-142 y los tres refactors del 18 de agosto) ocurrieron con OpenSpec ya instalado. La fuente de verdad solo es verdad mientras alguien la verifica, y hoy solo 1 de los 32 requisitos de `tasks` tiene test. Mientras no haya tests por escenario, la spec puede afirmar cosas falsas sin que nadie se entere: ahora mismo afirma dos.
- **Cada cambio de comportamiento, por pequeño que sea, paga el ciclo completo**: proposal, design, tasks, delta, implementación y archivo. Para cambiar una línea de un validador es mucha ceremonia, y esa fricción es justo lo que empuja a saltárselo, como pasó el 18 de agosto.
- **Archivar no significa verificado.** OpenSpec deja archivar con tareas pendientes, y dos de los tres changes lo están. Un requisito puede entrar en la spec sin que nadie haya comprobado nunca que el código lo cumple.
- **El backlog deja de ser fiable como descripción del producto.** Quien lea una historia tiene que saber que puede estar superada por un change, y las desviaciones (CA-17) solo constan en un `design.md` archivado. La afirmación del README del backlog, «los criterios de aceptación viven en las historias», queda en contradicción con esta decisión hasta que se actualice.
- **Las specs crecen y se vuelven caras de leer.** `tasks/spec.md` tiene 753 líneas y mezcla requisitos de API con requisitos de pantalla. Un `MODIFIED` obliga a reescribir el requisito entero, y un requisito tocado por varios changes, como «Una sola vista de tareas», va acumulando escenarios de orígenes distintos.
- **Los enlaces por ancla son frágiles.** Renombrar el título de un requisito cambia su ancla y rompe en silencio los enlaces del README, del OpenAPI y de los comentarios.
- **Hay que mantener el conocimiento de la herramienta.** OpenSpec, el esquema `spec-driven` y la semántica ADDED/MODIFIED/REMOVED tienen que aprenderlos todos los que tocan el repo, personas y agentes. `openspec/config.yaml` aún no fija contexto ni reglas que lo hagan explícito.
- **Las líneas base no tienen historia.** La spec de `auth` no tiene change de origen, así que los requisitos que traía antes de `add-task-list` no tienen ningún registro de por qué son así.
