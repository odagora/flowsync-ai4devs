# 2. Los tests de integración son la única fuente de verdad ejecutable

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) puso las delta-specs de OpenSpec como fuente de verdad del comportamiento, y ya entonces anotó el agujero que esa decisión dejaba abierto:

> **169 scenarios de prosa que nada ejecuta.** […] La suite tiene 23 tests […] La spec afirma mucho más de lo que la suite demuestra, y esa distancia no la señala nadie: un requisito puede llevar meses siendo falso sin que nada se ponga en rojo.

Un año después ese agujero no se cerró, y las consecuencias que 0001 anticipaba se cobraron. La spec siguió creciendo en prosa mientras la suite crecía mucho más despacio, así que la distancia entre lo afirmado y lo demostrado se ensanchó en lugar de estrecharse. El uso retrospectivo que 0001 ya observaba —los tres changes de 2026-08-13 documentaban comportamiento ya implementado— se consolidó como la práctica normal: la spec pasó a ser un acta que se levanta después, y por tanto un documento que hay que verificar contra el código antes de fiarse de él. Una fuente de verdad que hay que comprobar contra otra cosa no está haciendo su trabajo.

El coste de redacción tampoco bajó. Cuatro artefactos por change (`proposal.md`, `design.md`, `tasks.md` y la delta-spec) siguieron siendo la entrada obligatoria de cualquier cambio de comportamiento, con la lentitud que eso impone incluso para un requisito pequeño.

Mientras tanto, la infraestructura de tests que hace viable la alternativa ya estaba montada y madura:

- **Dos suites declaradas** en `adonisrc.ts`: `unit` (2 s de timeout) y `functional` (30 s).
- **`tests/bootstrap.ts` engancha el `apiClient` de Japa al registro Tuyau** (`Registry` de `.adonisjs/client/registry/schema.d.ts`), así que cada test está **tipado contra las rutas y los payloads reales**: una ruta que cambia de forma rompe la compilación del test, no solo su aserción.
- Los plugins `dbAssertions`, `authApiClient` y `sessionApiClient` dan aserciones contra la base de datos y autenticación sin fabricar tokens a mano.
- **El aislamiento es uniforme**: los cinco ficheros de test abren con `group.each.setup(() => testUtils.db().withGlobalTransaction())`.

Los scenarios de la spec, además, se escribieron desde el principio lo bastante concretos como para traducirse casi literalmente a un test: nombran el endpoint, el código de respuesta y el campo señalado. *Estado inventado* —«se solicita `GET /api/v1/tasks?status=archivado`» → «la respuesta es `422` con un error sobre el campo `status`»— es prácticamente un test ya escrito.

Dos hechos del repositorio condicionan el alcance de lo que se decide aquí, y conviene tenerlos delante:

| | Scenarios | Ejecutables hoy |
|---|---|---|
| De API (HTTP) | 92 | sí, con la suite `functional` |
| De interfaz | 77 | **no: `frontend/` no tiene runner de tests instalado** |
| **Total** | **169** | |

Y `config/database.ts` declara **una sola conexión SQLite** apuntando a `app.tmpPath('db.sqlite3')` sin override por entorno; `.env.test` solo cambia `SESSION_DRIVER=memory`. Los tests pegan contra el mismo fichero que el servidor de desarrollo, y que eso no haya dado problemas se debe a que todos los ficheros recuerdan poner el hook de transacción, no a que la configuración lo impida.

## Decisión

**Los tests de integración son la única fuente de verdad ejecutable del comportamiento de FlowSync.** Un comportamiento que ningún test cubre no está especificado, por mucho que exista un párrafo que lo describa.

1. **Todo cambio de comportamiento entra con su test.** El test se escribe **antes o junto** al código, no después: es la especificación, y una especificación posterior al hecho es un acta. Un PR que cambia comportamiento sin tocar tests se rechaza.
2. **Los tests se organizan por capability y por requisito**, no por fichero de código: la ruta del test dice a qué requisito responde, y el título del test es la frase del scenario. Lo que el ADR 0001 lograba con `### Requirement:` y `#### Scenario:` se logra ahora con `test.group()` y `test()`.
3. **`openspec/` se congela.** No se archiva ni se borra: pasa a ser **registro histórico de solo lectura**. Sus specs dejan de actualizarse y dejan de ser fuente de verdad, pero se conservan porque contienen el *porqué* de decisiones que el código no explica, y los `proposal.md` y `design.md` de los tres changes siguen siendo la única memoria de por qué el sistema es como es.
4. **Requisito previo, no opcional: el frontend recibe un runner de tests.** Sin él, los 77 scenarios de interfaz no pasan a estar cubiertos: pasan a estar **indocumentados**, que es peor que estar en prosa. Esta decisión no está completa hasta que existan.
5. **Requisito previo: `config/database.ts` declara una conexión propia de test.** Que el aislamiento dependa de que cada fichero se acuerde del hook es aceptable con cinco ficheros y no lo es cuando los tests son el contrato.
6. **Lo que no se puede ejecutar, se anota junto al test que más se le acerque.** Los requisitos negativos —«NO SHALL existir ningún alcance que devuelva las hechas mezcladas con el resto»— no siempre se pueden probar; se dejan escritos como comentario en el punto del test donde alguien los rompería.

## Estado

**Aceptada** — 2027-08-25.

**Reemplaza al [ADR 0001 — Las delta-specs de OpenSpec son la fuente de verdad viva del proyecto](0001-openspec-como-fuente-de-verdad.md)**, que queda marcado como reemplazado. Su contexto y su decisión siguen siendo el registro fiel de lo que se creía y se decidió en 2026-08-25; lo que cambia es que ya no está en vigor.

La decisión no surte efecto completo hasta que se cumplan los dos requisitos previos de los puntos 4 y 5.

## Consecuencias

### Lo que ganamos

- **La deriva se vuelve imposible por construcción.** Una afirmación falsa sobre el sistema deja de ser un párrafo desactualizado y pasa a ser un test en rojo. Es exactamente el problema que 0001 no podía resolver y que enumeró como su primer coste.
- **Se puede verificar en cualquier momento, no solo cuando alguien lo escribió.** La pregunta «¿esto sigue siendo cierto?» se responde con un comando en vez de con una lectura.
- **Un artefacto por comportamiento en lugar de cuatro.** Desaparece el coste fijo de redacción por change, que era la segunda consecuencia negativa de 0001.
- **Desaparece la documentación retrospectiva.** Si el test va antes del código, la especificación no puede ir por detrás.
- **La verdad queda tipada contra las rutas reales** gracias al registro Tuyau: un cambio de contrato rompe la compilación del test, no solo su aserción.

### Lo que nos cuesta

- **Perdemos el *porqué*, y es la pérdida grave.** Un test que exige `422` demuestra que el sistema responde `422`; no explica por qué un `422` sobre el campo vale más que una lista vacía, ni qué fallo silencioso se evitó con esa decisión. Eso vivía en `proposal.md` y `design.md`. Congelar `openspec/` conserva el porqué **de lo ya decidido** y no crea ningún sitio donde escribir el de lo que venga: a partir de aquí, el razonamiento de cada decisión nueva depende de que alguien lo ponga en un comentario.
- **Los requisitos negativos dejan de ser expresables.** *El catálogo de estados no se toca* —«se recorre la API entera en busca de una operación para crear, renombrar o borrar un estado; no existe ninguna»— no se puede escribir como test: no se prueba la ausencia de algo que no se sabe nombrar. Lo mismo con *Un solo estado por petición*. Esos requisitos se degradan a comentario.
- **La fuente de verdad deja de ser legible para quien no programa.** Un `spec.md` lo lee producto, negocio o cualquiera que escribiera los criterios de aceptación. Un fichero de Japa, no. Quien encarga el trabajo pierde acceso de lectura a lo que el sistema promete.
- **La verdad se puede poner verde editándola.** Una spec en prosa se incumple; un test se cambia. Renombrar un endpoint y ajustar el test deja todo en verde sin que nadie decida nada — el mismo gesto que corrige un fallo puede tapar un cambio de contrato no querido.
- **Los tests se atan a los detalles de implementación.** Rutas, payloads y códigos concretos entran en la especificación, así que un refactor legítimo rompe «la verdad» aunque el comportamiento no haya cambiado. La prosa aguantaba eso; los tests no.
- **77 scenarios se quedan a la intemperie mientras el frontend no tenga runner** — casi la mitad del total. El requisito previo del punto 4 es trabajo real y sin hacer, y hasta que esté, esta decisión empeora la cobertura documental en lugar de mejorarla.
- **Migrar los 92 scenarios de API es trabajo de verdad.** La suite de partida son 23 tests. Los scenarios se traducen casi literalmente, pero «casi literalmente» multiplicado por 92 sigue siendo un esfuerzo que hay que planificar, no un efecto secundario de aceptar este ADR.
- **La completitud pasa a medirse por cobertura, y la cobertura no sabe de requisitos.** Una suite al 100 % de líneas no dice nada sobre el comportamiento que nadie pensó en pedir. La prosa al menos permitía escribir un requisito antes de tener dónde ejecutarlo.
