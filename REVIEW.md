# REVIEW.md — calibración del revisor

Solo para revisiones de código. El resto de reglas del proyecto están en `CLAUDE.md`.

## Grave: se reporta siempre, en línea

- Incumple un scenario de `openspec/specs/<capability>/spec.md`. Cita el título del scenario.
- Una ruta de `/api/v1` que debería exigir sesión queda fuera de `middleware.auth()`.
- Una respuesta expone datos que su transformer no elige, o devuelve un modelo crudo sin `serialize()`.
- El código responde algo distinto de lo que declaran sus decoradores OpenAPI: códigos, campos o nulabilidad.
- Pérdida o corrupción de datos, o un test que escribe en la BD sin aislarla con `testUtils.db()`.
- Un comentario o un README que afirma un comportamiento que el código no tiene.

## Sugerencia: todo lo demás

Nombres, refactors, duplicación, legibilidad, tests que faltan o casos borde no cubiertos por la spec.
**Como mucho 5 sugerencias por revisión**, las de más valor. El resto, en una línea al final del
resumen: «y N sugerencias menores más (nombres: 3, duplicación: 2…)».

## Dónde no reportar

- Que `docs/api/openapi.json` esté desfasado: lo vigila `openapi:check` en CI.
- Formato, estilo e imports: son de Prettier, eslint (backend) y oxlint (frontend). No corren en CI,
  solo en local. Los errores de tipos **sí** se reportan, porque nada los comprueba en el PR.
- Código generado, que no se edita a mano: `backend/database/schema.ts`, `backend/.adonisjs/`,
  `docs/api/openapi.json`, `frontend/src/components/ui/` y los `package-lock.json`.
- `openspec/changes/archive/`: es histórico.
- Versiones de dependencias: el stack va adelantado a propósito (ver `CLAUDE.md`).

## Evidencia

Cada afirmación sobre cómo se comporta algo cita `fichero:línea` donde lo has leído. No lo deduzcas
del nombre de una función, de un comentario ni de cómo suele funcionar la librería. Si no lo has
podido comprobar, dilo y no lo cuentes como hallazgo.
