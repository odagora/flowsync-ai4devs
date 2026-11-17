# Instrucciones de revisión

Solo para revisar PRs de FlowSync. Si algo de aquí choca con otra guía del repo, manda esto.

## Grave: se reporta siempre

- Rompe un scenario de `openspec/specs/`. Cita el requisito y el scenario por su nombre.
- Una ruta que debía pedir sesión deja de pedirla, o una respuesta expone datos de cuenta que la
  spec no permite (el email, por ejemplo).
- Un controlador devuelve un modelo crudo en vez de pasar por un transformer de `app/transformers/`.
- Un comentario, el README de la capability o el documento OpenAPI afirman algo que el código no
  hace. La documentación que miente es un fallo, no un detalle.
- Se edita a mano algo generado: `backend/database/schema.ts`, `backend/.adonisjs/`,
  `frontend/src/components/ui/`.
- Un test se afloja, se salta o se borra para que pase.
- Cambian rutas, controladores, validadores o transformers de una capability y no cambia su
  `docs/capabilities/<nombre>/README.md`.

Todo lo demás es **sugerencia**: nombres, legibilidad, duplicación, rendimiento sin un caso real,
robustez ante fallos que la spec no contempla, tests que faltan para código que el PR no toca.

## Tope

Como mucho **5 sugerencias** por revisión, las de más valor. El resto va contado en una línea del
comentario final («y 7 más de nombres y legibilidad»), sin detallarlas. Los graves no tienen tope.

## Dónde no reportar

- Formato y estilo: los deciden Prettier, ESLint (backend) y oxlint (frontend).
- Si `docs/api/openapi.json` está al día con el código: lo vigila el job `openapi:check` en cada PR.
- Archivos generados (`schema.ts`, `.adonisjs/`, `docs/api/openapi.json`, `package-lock.json`),
  salvo el caso grave de edición a mano.
- Código que el PR no modifica, e incumplimientos ya admitidos en un README de capability que el PR
  no toca ni empeora.
- Decisiones registradas en `docs/adr/`: no se reabren en una revisión.

## Evidencia

Para afirmar que algo se comporta de una manera, cita el `archivo:línea` donde lo has leído. Ni el
nombre de una función ni su comentario son evidencia: `isOverdueOn` no prueba que mire el estado de
la tarea, y un comentario que dice «el validador lo corta con un 422» no prueba que el validador lo
haga. Si no has podido leerlo, no lo presentes como hecho: márcalo como duda o no lo reportes.
