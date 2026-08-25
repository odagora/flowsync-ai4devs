# 1. Las delta-specs de OpenSpec son la fuente de verdad viva del proyecto

## Contexto

El repositorio describe su propio comportamiento en varios sitios a la vez: `CLAUDE.md`, `docs/backlog/`, los README de capability, el documento OpenAPI y los comentarios del código. Todos ellos envejecen, y envejecen en silencio: nada falla cuando un documento deja de ser cierto. Hace falta decidir cuál de ellos manda cuando dos se contradicen.

En `openspec/` ya hay una estructura montada y en uso, con `schema: spec-driven` declarado en `openspec/config.yaml`. Funciona a dos niveles:

**La spec viva** — `openspec/specs/<capability>/spec.md` — es el estado acumulado de lo que el sistema debe hacer. Hoy son dos capabilities:

| Capability | Requisitos | Scenarios | Líneas |
|---|---|---|---|
| `auth` | 19 | 45 | 307 |
| `tasks` | 32 | 124 | 753 |

Cada requisito se enuncia con `SHALL`/`NO SHALL` y se acompaña de sus scenarios en `WHEN`/`THEN`, concretos hasta el endpoint, el código de respuesta y el nombre del campo.

**Las delta-specs** — `openspec/changes/<id>/specs/<capability>/spec.md` — no repiten la spec: contienen solo el diff, agrupado bajo `## ADDED Requirements`, `## MODIFIED Requirements` o `## REMOVED Requirements`. Cada change es una carpeta con cuatro artefactos —`proposal.md` (por qué y qué queda fuera), `design.md` (las decisiones y sus alternativas), `tasks.md` (el registro de lo hecho) y la delta-spec— más un `.openspec.yaml` con su fecha.

Hay tres changes, todos archivados y ninguno en curso:

- `2026-08-13-add-task-list` — 14 requisitos ADDED en `tasks`, más 3 MODIFIED y 1 ADDED en `auth`
- `2026-08-13-add-task-status-filter` — 11 requisitos entre ADDED y MODIFIED
- `2026-08-13-add-task-due-date` — 12 requisitos entre ADDED y MODIFIED

La relación entre los dos niveles se ve mejor siguiendo un requisito concreto. *Una sola lista compartida del espacio* nace en `add-task-list` diciendo:

> El sistema SHALL devolver en `GET /api/v1/tasks` **todas las tareas del espacio**, el mismo conjunto para cualquier cuenta que lo pida […]

Un change posterior, `add-task-status-filter`, lo reescribe entero bajo `## MODIFIED Requirements`:

> El sistema SHALL devolver en `GET /api/v1/tasks` **las tareas del espacio que correspondan al alcance pedido** […] Sin acotar, el alcance SHALL ser las tareas pendientes y en curso, dejando fuera las hechas […]

Y `openspec/specs/tasks/spec.md` contiene hoy, palabra por palabra, la segunda versión. Ese es el mecanismo: **la delta es el cambio, la spec viva es el resultado, y el archivo es la memoria de cómo se llegó hasta aquí**. El texto viejo no sobrevive en la spec viva; sobrevive en el change que lo reemplazó, junto al `proposal.md` que explica por qué dejó de ser cierto.

Un rasgo del uso que se le ha dado aquí conviene dejarlo escrito, porque condiciona lo que la spec significa. Los tres changes documentan comportamiento **que ya estaba implementado** cuando se escribieron. El propio `proposal.md` de `add-task-status-filter` lo dice sin rodeos:

> **Este change documenta comportamiento que ya está implementado y funcionando en el repositorio.** No es trabajo por hacer […] Lo que faltaba era la especificación — y, sobre todo, corregir los requisitos de la spec viva que este comportamiento vuelve falsos.

## Decisión

**`openspec/specs/<capability>/spec.md` es la fuente de verdad del comportamiento de FlowSync.** Cuando cualquier otro documento del repositorio la contradiga, el equivocado es el otro documento.

De ahí se siguen cuatro reglas:

1. **Todo cambio de comportamiento pasa por un change.** Se crea `openspec/changes/<id>/` con sus cuatro artefactos, y su delta-spec declara explícitamente qué requisitos añade, cuáles reescribe y cuáles retira.
2. **La delta solo contiene el diff.** Un requisito que no cambia no se copia. Un requisito que cambia se reescribe **entero** bajo `## MODIFIED Requirements`, no por parches parciales: la unidad de cambio es el requisito completo, con todos sus scenarios.
3. **Al archivar, la delta se funde en la spec viva** y el change pasa a `changes/archive/`. La spec viva no conserva nunca texto superado; el archivo no se reescribe nunca.
4. **Nada más es fuente de verdad.** `CLAUDE.md` explica cómo trabajar en el repo, `docs/backlog/` recoge lo que se pidió, el documento OpenAPI publica el contrato y los README describen cada capability. Todos ellos **describen o derivan**; ninguno decide. Cuando uno se desvía de la spec, se corrige él.

La granularidad es deliberada: requisitos con `SHALL`, scenarios con `WHEN`/`THEN`, y ambos redactados lo bastante concretos como para poder contrastarlos contra un artefacto real —un endpoint, una respuesta, una pantalla— sin tener que interpretarlos.

## Estado

**Reemplazada** por el [ADR 0002 — Los tests de integración son la única fuente de verdad ejecutable](0002-tests-como-fuente-de-verdad-ejecutable.md) — 2027-08-25.

Aceptada el 2026-08-25 y en vigor hasta el 2027-08-25. Estuvo vigente desde los tres changes de 2026-08-13, que eran la totalidad de la historia registrada; no había ningún change en curso y `openspec/changes/` contenía solo `archive/`.

El contexto y la decisión que siguen escritos arriba no se han tocado: son el registro de lo que se creía y se decidió entonces, y se conservan tal cual. `openspec/` deja de ser fuente de verdad, pero se conserva como registro histórico de solo lectura.

## Consecuencias

### Lo que ganamos

- **Hay una respuesta a «¿qué debe hacer el sistema?»**, y está en un solo sitio. Antes la pregunta se resolvía leyendo el código, que dice lo que hace pero no lo que debería hacer, ni por qué.
- **Lo revisable es el cambio, no solo el estado final.** Una delta de once requisitos se lee en una sentada; una spec de 753 líneas, no. Al revisar se ve exactamente qué se rompe y qué se añade.
- **La spec viva no acumula contradicciones.** Como `MODIFIED` sustituye el requisito completo, es imposible que queden dos versiones conviviendo. La lista no puede afirmar a la vez que devuelve «todas las tareas» y que deja fuera las hechas.
- **Los scenarios son contrastables contra artefactos reales.** Son lo bastante concretos —`?status=archivado` → `422` sobre el campo `status`— como para auditar con ellos un documento OpenAPI, una respuesta HTTP o una pantalla, y encontrar huecos de verdad.
- **El archivo preserva el porqué.** Saber que la vista por defecto dejó de ser «todas» es fácil; saber *por qué* solo es posible porque el `proposal.md` de aquel change sigue ahí.

### Lo que nos cuesta

- **169 scenarios de prosa que nada ejecuta.** Los 124 de `tasks` y los 45 de `auth` son afirmaciones sobre el sistema que ningún test comprueba. La suite tiene 23 tests, y cubren `auth` más un único scenario de `tasks` (el del responsable). **La spec afirma mucho más de lo que la suite demuestra**, y esa distancia no la señala nadie: un requisito puede llevar meses siendo falso sin que nada se ponga en rojo.
- **Cuatro artefactos por change.** Tres changes han producido unas 2.000 líneas de especificación entre el archivo y la spec viva. Ese coste de redacción se paga entero cada vez, y no es proporcional al tamaño del cambio: un requisito nuevo también quiere su proposal, su design y sus tasks.
- **La evolución de un requisito no se lee en la spec viva.** Como el texto viejo se sustituye, `git blame` sobre `openspec/specs/tasks/spec.md` apunta al momento en que se fundió la delta, no al razonamiento. Para entender por qué un requisito dice lo que dice hay que ir al archivo y encontrar el change que lo tocó — y nada en la spec viva indica cuál fue.
- **Usada en retrospectiva, la spec va por detrás del código.** Los tres changes documentan comportamiento ya implementado. Mientras esa sea la práctica, la spec es un registro *a posteriori* y no una puerta que haya que cruzar antes de programar: describe fielmente lo que se decidió, pero no garantiza que sea lo que el código hace **ahora mismo**.
- **No sirve como hoja de ruta.** La spec solo recoge lo que se construyó. En `docs/backlog/E2-gestion-tareas/` hay historias —borrar una tarea, editar el título, reasignar el responsable— que nunca llegaron a ser requisitos. Quien lea solo `openspec/` concluirá que esas funciones jamás se quisieron, cuando lo que pasa es que aún no se han hecho.
- **Los documentos derivados hay que reconciliarlos a mano.** Declarar que la spec manda no sincroniza nada: obliga a mantener el documento OpenAPI, los README de capability y `CLAUDE.md` al día con ella, y ninguna herramienta lo comprueba. Hoy mismo `CLAUDE.md` describe una API de cuatro rutas y afirma que `tasks` no tiene ni un test — dos cosas que dejaron de ser ciertas.
- **La calidad depende de la disciplina, no del tooling.** `openspec/config.yaml` está en su estado por defecto: sin `context`, sin `rules` por artefacto, sin `operations`. Nada obliga a que una delta declare bien sus secciones ni a que un `proposal.md` diga qué queda fuera. Que hasta ahora lo hagan es mérito de quien las escribe.

### Lo que reduciría el coste

No forma parte de esta decisión, pero queda anotado por si se quiere abordar: convertir los scenarios en tests de integración cerraría la brecha entre lo que la spec afirma y lo que se demuestra, y es la única de estas consecuencias que se puede pagar de una vez en lugar de en cada change.
