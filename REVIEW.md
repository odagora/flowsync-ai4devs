# REVIEW.md

Solo para revisiones de código. Calibra al revisor; el resto de instrucciones están en `CLAUDE.md`.

## Grave (se reporta siempre)

- Romper un scenario de `openspec/specs/<capability>/spec.md`, citando el scenario.
- Un código de estado distinto del que pide la spec: un 2xx donde va un 4xx, o al revés.
- Saltarse la autenticación, o exponer datos de una cuenta que la spec no deja ver (el email, por ejemplo).
- Perder o cambiar datos que la petición no tocaba.
- Docs, comentarios o el contrato OpenAPI que afirman un comportamiento que el código no tiene.
- Un error de tipos o de lint en el diff: ningún CI los ejecuta, así que nadie más lo va a ver.

Todo lo demás es **sugerencia**: estilo, nombres, refactors, rendimiento sin un caso que lo demuestre,
tests que faltan para código que funciona.

## Tope

Como mucho **5 sugerencias** por revisión, las de más impacto. Del resto, una sola línea con el
recuento («y 7 sugerencias menores más, de nombres y estilo»). Los graves no tienen tope.

## Dónde no reportar

- La deriva entre el código y `docs/api/openapi.json`: ya la vigila `openapi:check` en CI. Que el
  contrato contradiga **la spec** sí es grave.
- Formato (Prettier): no cambia el comportamiento.
- Código generado: `backend/.adonisjs/`, `backend/database/schema.ts`, `frontend/src/components/ui/`
  (shadcn) y `docs/api/openapi.json`, salvo para señalar que falta regenerarlo.
- Lockfiles, `tmp/` y la base de datos SQLite.

## Evidencia

Para afirmar cómo se comporta algo, cita el `archivo:línea` donde lo has leído. Un nombre de función,
de fichero o de test no es evidencia. Si no lo has leído, márcalo «no verificado» o no lo afirmes.
Un grave sin cita se degrada a sugerencia.
