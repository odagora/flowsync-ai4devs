# REVIEW.md — calibración del revisor

Solo para revisiones de código. El árbitro son los scenarios de `openspec/specs/<capability>/spec.md`;
las convenciones, `CLAUDE.md`.

## Grave: se reporta siempre

- Rompe un scenario de la spec. Cita el scenario y da la entrada concreta que lo rompe.
- Se salta la autenticación: una ruta que debería ir tras `middleware.auth()` y no va.
- Expone lo que no debe salir: la contraseña, un token, o datos de otra cuenta.
- Un 2xx donde la spec exige un 4xx, o al revés; o una respuesta que no pasa por `serialize()`.
- Pierde o altera datos que la petición no venía a cambiar.
- Un test que escribe en la BD sin aislarse con `testUtils.db()`: pisa la BD de desarrollo.
- Un comentario o doc del repo que afirma algo que el código no hace.

## Sugerencia: todo lo demás

Nombres, estructura, duplicación, legibilidad, tests que faltan, rendimiento sin un caso medible.
**Máximo 5 sugerencias por revisión**, las de más valor. El resto, en una línea y contadas:
«y N sugerencias menores más».

## Dónde no reportar

- `docs/api/openapi.json` desactualizado: lo vigila el job `OpenAPI check` en CI.
- Formato: Prettier (`npm run format`; en `frontend/` lo aplica además un hook). Lint y tipos **no**
  los vigila ningún CI: un error de lint o de tipos en el diff sí se reporta.
- Código generado: `backend/database/schema.ts`, `backend/.adonisjs/`, `frontend/src/components/ui/`.
- Lockfiles, `tmp/` y ficheros SQLite.
- Gustos sin consecuencia: si no puedes decir qué se rompe, no es un hallazgo.

## Evidencia

Toda afirmación sobre cómo se comporta el código lleva `archivo:línea` de donde lo has leído. No lo
deduzcas del nombre de una función, de un comentario ni de un test: el comentario puede mentir y el
test puede no existir. Lo que no hayas podido leer se marca **no verificado**, o no se afirma.
