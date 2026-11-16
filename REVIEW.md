# REVIEW.md — calibración del revisor

Solo para revisiones de código. Si una regla de aquí choca con tu criterio, gana la regla.

## Grave: se reporta siempre, en línea y con severidad

- Incumple un escenario de `openspec/specs/<capability>/spec.md`. Cita el escenario.
- Expone datos que no debe (p. ej. el email de otra cuenta) o deja una ruta sin `auth`.
- Pierde o cambia datos en silencio: una entrada mal formada que se acepta y borra o sobrescribe algo.
- Presenta un error como éxito o como vacío (un `200 []` donde tocaba un `422`, un `catch` que lo traga).
- El contrato miente: el README de la capability, los decoradores OpenAPI o un comentario afirman algo
  que el código no hace.

## Sugerencia: todo lo demás

Nombres, legibilidad, refactors, duplicación, tests que faltan sin que haya un fallo concreto.
**Como mucho 5 sugerencias por revisión**, las que más valgan. Del resto, una línea en el resumen con el
recuento: «+N sugerencias menores no detalladas».

## Dónde no reportar

- Formato, estilo e imports: ya los vigilan `eslint`/`prettier` (backend) y `oxlint`/`prettier` (frontend).
- Errores de tipos: ya los vigila `tsc` (`npm run typecheck` en el backend, `npm run build` en el frontend).
- Que `docs/api/openapi.json` esté al día: ya lo vigila `openapi:check` en CI. Sí es grave que el
  contrato que describe no coincida con lo que el código hace.
- Ficheros generados: `backend/database/schema.ts`, `backend/.adonisjs/`, `docs/api/openapi.json`,
  `frontend/src/components/ui/` (shadcn) y los `package-lock.json`. Si están mal, el fallo está en su
  origen; repórtalo allí.
- Versiones del stack (AdonisJS 7, Lucid 22, VineJS 4, TS 6, React 19, Vite 8): son deliberadas.
  No propongas la API de una versión anterior.
- Lo que el cambio no toca, salvo que el cambio lo rompa.

## Evidencia

Para afirmar que algo se comporta de una manera, cita `fichero:línea` donde lo has leído. No lo deduzcas
del nombre de una función, de un comentario ni de cómo suele funcionar la librería. Si solo se puede
saber ejecutándolo, dilo así («sin verificar: depende de …») y no lo marques como grave.
