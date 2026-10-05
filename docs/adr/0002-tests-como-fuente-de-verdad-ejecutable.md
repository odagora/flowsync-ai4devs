# 2. Los tests de integración como única fuente de verdad ejecutable

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) hizo de la spec viva de OpenSpec (`openspec/specs/<capability>/spec.md`) el contrato de FlowSync, y estableció que solo cambiara mediante delta-specs archivadas. Ya entonces sabía cuál era su punto débil y lo escribió en sus consecuencias: *la spec solo es verdad si algo la comprueba, y hoy nada lo hace*.

Después de un año manteniéndola, ese coste no se ha reducido. Los que el 0001 daba por aceptables han resultado ser los que más pesan:

- **La spec no se ejecuta.** Ningún escenario `WHEN` / `THEN` está enlazado con código. Una desviación como la de `2ccf2c1` —`listTasksValidator` pasó del enum a `vine.string()` y un estado inventado empezó a responder `200` con lista vacía donde la spec pide `422`— solo se descubre si alguien lee la spec contra el código a mano. Eso mismo fue lo que la descubrió entonces.
- **La verificación que sí detecta desviaciones son los tests functional.** Viven en `backend/tests/functional/<capability>/`, corren con Japa contra la API real y usan el cliente tipado del registro de `.adonisjs/`. Cada grupo está aislado con `testUtils.db().withGlobalTransaction()`. Sus títulos ya están escritos como reglas del dominio: «un email desconocido responde igual que una contraseña equivocada», «la tarea no filtra datos de la cuenta de su responsable». Un test que falla frena el cambio. Una spec desfasada no frena nada.
- **El contrato se mantiene por duplicado.** Cada comportamiento se escribe como escenario en la delta, como requisito fundido en la spec viva y como test. Las tres copias se sincronizan a mano, y cuando discrepan la que se rompe primero es la única que nadie ejecuta.
- **El mecanismo de deltas cuesta más de lo que protege.** Un `MODIFIED` reemplaza el requisito entero, así que dos changes que tocan el mismo requisito tienen que ir en serie. Además, el `## Purpose` no se puede corregir mediante una delta: el de `tasks` sigue diciendo «todas las tareas del espacio».
- **Las desviaciones no son un accidente.** Cuando hay prisa, el camino de proponer, diseñar, desglosar, escribir la delta y archivar se salta (FS-142, `2ccf2c1`), y la deuda vuelve como un change retroactivo.

Las alternativas que se consideraron:
1. Mantener OpenSpec y añadir verificación: un test por escenario, con el nombre del escenario en el título, y un chequeo en CI que compare ambas listas. Deja tres copias del contrato y añade una herramienta más que mantener.
2. Generar los tests a partir de la spec. Ninguna herramienta de las que usamos lo hace, y los escenarios de interfaz no tienen un runner donde ejecutarse.
3. Quedarse con la única copia que se ejecuta.

## Decisión

Los tests de integración son la única fuente de verdad ejecutable del comportamiento de FlowSync, y OpenSpec deja de mantenerse:

1. **Un comportamiento forma parte del contrato si y solo si un test functional lo fija.** Cambiar el comportamiento es cambiar un test, en el mismo PR que el código. Un PR que cambie comportamiento observable de la API sin tocar ningún test no se acepta.
2. **El título del test enuncia la regla**, en castellano y en términos del dominio, como ya hacen los de `auth` y `tasks`. Cada fichero agrupa una capability y una regla, y empieza con un comentario que explica el porqué cuando no es evidente.
3. **`openspec/` se congela como archivo histórico.** No se crean changes nuevos ni se edita `openspec/specs/`, que deja de describir el sistema. No se borra, porque las propuestas y diseños archivados siguen siendo el único registro del porqué de las decisiones de 2026. Al aplicar este ADR se añade un aviso al principio de cada spec viva que remita aquí. Las skills `openspec-*` y el comando `opsx` se retiran de `.claude/`.
4. **El porqué de las decisiones nuevas va en ADRs** (`docs/adr/`) si son de arquitectura o de producto, y en la descripción del PR, que el proceso ya exige, si son locales a un cambio.
5. **Las demás descripciones del contrato siguen al código y a los tests.** Eso incluye el documento OpenAPI (`app/openapi/schemas.ts` y los decoradores de los controladores) y los tipos de `frontend/src/lib/types.ts`. Si discrepan de un test, se corrigen ellas.
6. **El comportamiento de interfaz queda fuera de esta fuente de verdad hasta que el frontend tenga runner de tests.** Mientras tanto vive solo en el código de `frontend/`, y así se acepta.

## Estado

Aceptada, 2027-10-04. Reemplaza al [ADR 0001](0001-openspec-como-fuente-de-verdad.md).

## Consecuencias

**Lo que ganamos**

- **Una desviación entre el contrato y el código hace fallar un test.** Una regresión como la de `2ccf2c1` deja de esperar a una auditoría manual, siempre que exista el test del caso.
- **Una sola copia del contrato** en lugar de tres. No hay que sincronizar delta, spec viva y test, ni serializar changes por culpa de un `MODIFIED` de bloque entero.
- **Cambiar el comportamiento cuesta lo que cuesta el cambio**: código y test en el mismo PR, sin el ciclo de proponer, diseñar, desglosar y archivar.
- **El contrato está escrito en el mismo lenguaje que el código** y lo revisa la misma persona en el mismo diff.

**Lo que nos cuesta**

- **Lo que no tiene test no está definido.** Un hueco de cobertura deja de ser un descuido y pasa a ser un comportamiento sin contrato, que cualquiera puede cambiar sin romper nada. La spec al menos enumeraba los casos aunque nadie los comprobara. Ahora nadie los enumera.
- **La mitad de la spec de `tasks` se queda sin sitio.** El frontend no tiene runner de tests, y requisitos como la pantalla de la lista, el control del filtro, el «Sin nombre», los cuatro finales de una lista sin filas, la señal de vencida que no depende solo del color o la operabilidad con teclado no tienen dónde fijarse. Hasta que se adopte un runner, esas reglas solo existen como implementación. Adoptarlo (unitario, E2E o los dos) es trabajo que esta decisión deja pendiente.
- **Los requisitos negativos son difíciles de probar.** «No hay vista de mis tareas», «la lista no adelanta el vencimiento» o «el estado es la única dimensión de filtrado» se afirmaban en una línea de spec. Con tests solo se cubren los casos que alguien piensa en negar, y la ausencia de una vista no se puede probar en absoluto.
- **Se pierde el sitio donde vivía lo que queda fuera.** Las propuestas de OpenSpec obligaban a decir qué no se hacía y qué riesgos se aceptaban. Ahora eso depende de que alguien lo escriba en un ADR o en un PR, y un PR se lee una vez y se olvida.
- **Un test se puede cambiar para que pase.** Editar un test que estorba es más fácil que editar una spec, y desde fuera parece lo mismo que cambiar el contrato a propósito. La revisión tiene que tratar cualquier cambio en `tests/functional/` como un cambio de contrato, y eso exige una disciplina que hasta ahora recaía en la spec.
- **Producto pierde un documento que podía leer.** Los escenarios `WHEN` / `THEN` eran legibles sin saber TypeScript. Los tests no lo son, aunque sus títulos ayuden. Las preguntas de «qué hace el sistema» pasan a responderse leyendo código o preguntando a quien lo mantiene.
- **`openspec/` queda en el repo describiendo un sistema que ya no existe.** Sin el aviso de la regla 3, quien lo lea confundirá historia con contrato. El aviso es una edición manual de las specs vivas, justo lo que el ADR 0001 prohibía, y se hace una sola vez.
- **La base de pruebas sigue siendo el fichero SQLite de desarrollo** (`config/database.ts`). Las transacciones globales evitan que los tests dejen datos, pero la fuente de verdad corre contra el mismo fichero que el servidor de desarrollo, y un test sin ese aislamiento lo ensucia.
