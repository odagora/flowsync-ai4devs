# Convenciones de los tickets

## Qué es un ticket

- **Tamaño.** Un ticket es una unidad de trabajo que una persona termina en una sesión, como máximo media jornada.
- **Identificador.** Se deriva de la historia. Los tickets de FS-118 son FS-118.1, FS-118.2, FS-118.3, y así sucesivamente.
- **Criterios.** El ticket **hereda** los criterios de aceptación de su historia y no añade criterios nuevos.
- **Definition of Done.** Es una checklist de cómo se entrega el ticket (tests, manejo de errores, convenciones), según su tipo. No es un criterio nuevo ni una estimación en horas.
- **Capa y diseño.** El ticket **nombra la capa** que toca (migración, modelo, endpoint o interfaz), pero **no diseña**. Los tipos de columna, si admiten nulos, los índices, los nombres de ruta y los códigos de estado se deciden al implementar.

## Tipos

Endpoint/API · Migración/DB · Modelo/Dominio · Frontend · Bug · Test

## Definition of Done por tipo

Cada ticket cumple la DoD de su tipo y, además, los criterios de la historia que hereda. Algunos tickets añaden puntos propios de entrega a esa DoD; se indican en su fichero.

### Migración/DB

- [ ] Hay migración nueva y su `down` deshace exactamente su `up`.
- [ ] `node ace migration:run` y el rollback funcionan sobre una base de datos que ya tiene datos.
- [ ] `database/schema.ts` está regenerado (nunca editado a mano) y commiteado.
- [ ] Los registros que ya existían siguen siendo válidos después de migrar.
- [ ] `npm run typecheck` y `npm run lint` pasan.

### Modelo/Dominio

- [ ] La regla vive en el modelo o en el dominio, no repartida entre controladores y componentes.
- [ ] El modelo solo añade lógica; no redeclara columnas.
- [ ] Cada criterio heredado tiene tests unitarios (suite `unit`), límites incluidos.
- [ ] Typecheck y lint pasan.

### Endpoint/API

- [ ] La validación usa VineJS (`vine.create`) y reutiliza los builders que ya existan.
- [ ] La respuesta pasa por un transformer y `serialize()`; nunca se devuelven modelos crudos.
- [ ] Los errores de validación llegan por campo y en castellano.
- [ ] El endpoint está protegido con `middleware.auth()`.
- [ ] Hay tests funcionales aislados con `testUtils.db()` que cubren el camino feliz y cada error heredado.
- [ ] Si cambian controladores o rutas, el registro de `.adonisjs/` está regenerado y commiteado.
- [ ] Typecheck y lint pasan.

### Frontend

- [ ] Cada llamada nueva pasa por `lib/api.ts`.
- [ ] Los errores llegan como `ApiError` y se muestran en castellano, junto al campo afectado.
- [ ] Los componentes shadcn se traen con `npx shadcn add` y no se editan a mano.
- [ ] La interfaz tiene estados de carga y de error.
- [ ] `npm run build` (typecheck) y `npm run lint` (oxlint) pasan.
- [ ] Se ha comprobado a mano en el navegador.

### Test

- [ ] Cada criterio heredado tiene al menos un test automatizado que lo nombra (CA-n) en su título.
- [ ] Los tests se pueden repetir, no dependen del orden de ejecución y no ensucian la base de datos de desarrollo.
- [ ] Los tests fijan el tiempo y el huso horario; no usan el reloj real.
- [ ] La suite completa pasa.

## Escala de tallas (t-shirt sizing)

Las tallas son relativas entre tickets. No son horas.

| Talla | Significado |
|---|---|
| **S** | Una sola capa, pocos criterios heredados y un patrón que ya existe en el repo. Sin incógnitas. |
| **M** | Una capa con reglas o casos límite que probar, o con algo que el repo todavía no tiene. Cabe en la sesión, pero justo. |
| **L** | Varias capas, infraestructura que no existe o una decisión abierta que cambia el trabajo. **No cabe en media jornada**: indica que el ticket hay que partirlo. |
