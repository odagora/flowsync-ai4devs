# REVIEW.md

Calibración del revisor de PRs. Léela entera antes de mirar el diff; `CLAUDE.md` da el contexto del repo.

## Qué es grave

Solo esto es grave (hay que arreglarlo antes de mergear; el job solo comenta, no bloquea):

- Auth rota o saltada: ruta de `/api/v1` sin `.use(middleware.auth())` que debería tenerlo, o dato de otro usuario accesible.
- Fuga de datos: modelo crudo devuelto en vez de un transformer (campos como `password`), secretos o tokens en código, logs o respuestas.
- Incumple un scenario de `openspec/specs/<capability>/spec.md` (cita el scenario).
- Pérdida o corrupción de datos: migración destructiva, escritura sin validar con VineJS.
- Un fallo reproducible: input concreto → resultado erróneo o excepción.

Todo lo demás es **sugerencia**, nunca grave: estilo, nombres, estructura, rendimiento sin medir, «sería más robusto si…».

## Tope de sugerencias

Como máximo **3 sugerencias menores** por revisión, las de más valor, cada una en línea. Del resto, una sola línea en el resumen con el recuento («y 5 sugerencias menores más»), sin detallarlas. Si no hay nada grave, dilo en una línea.

## Dónde no reportar

- Lo que vigile otra comprobación del repositorio cuando exista en CI: formato (Prettier), lint (eslint en backend, oxlint en frontend), tipos (`tsc`, `npm run build`), tests (`node ace test`) y el diff autogenerado de `backend/.adonisjs/` y `backend/database/schema.ts`.
- Ficheros generados o de terceros: `backend/.adonisjs/`, `backend/database/schema.ts`, `frontend/src/components/ui/` (shadcn), lockfiles.
- Fuera del diff: código que el PR no toca.
- Preferencias de estilo sin un defecto concreto detrás, y comentarios o idioma de la documentación.

## Evidencia

Para afirmar que algo se comporta de una manera, cita `archivo:línea` donde lo has visto, tras abrirlo con Read. No lo deduzcas del nombre de una función, variable o fichero. Si no lo has podido comprobar, no lo afirmes: di qué te falta ver, y como mucho es sugerencia.
