# Filtrar la lista por estado

- **Identificador:** FS-142
- **Épica:** E2 «Gestión de tareas»

## Historia

Como miembro del equipo, quiero filtrar la lista por un estado para centrarme en lo que está pendiente o en lo que está en curso.

## Criterios de aceptación

Cada criterio indica su origen:

- **PRD:** sale de un requisito de [`flowsync-mvp.md`](../../prd/flowsync-mvp.md).
- **USUARIO:** lo pidió el usuario.
- **[PROPUESTO]:** propuesta pendiente de revisión.

### Camino feliz

**CA-1. Filtrar por uno de los tres estados** (PRD: RF-14)

- DADO una lista con tareas en «pendiente», «en curso» y «hecho», de distintos responsables
- CUANDO filtro por «pendiente»
- ENTONCES veo todas las tareas pendientes del equipo, sean de quien sean
- Y no veo ninguna en «en curso» ni en «hecho».

Lo mismo vale al filtrar por «en curso» o por «hecho».

**CA-2. «Todas» quita el filtro** (PRD: RF-14)

- DADO que tengo la lista filtrada por un estado
- CUANDO elijo «todas»
- ENTONCES vuelvo a ver todas las tareas, en los tres estados.

**CA-3. Solo un estado a la vez** (PRD: RF-14; los filtros combinados están fuera de alcance, §4)

- DADO que tengo la lista filtrada por «pendiente»
- CUANDO elijo «en curso»
- ENTONCES solo veo las tareas en curso: el filtro nuevo sustituye al anterior
- Y no hay forma de ver «pendiente» y «en curso» a la vez, salvo eligiendo «todas».

**CA-4. Al abrir la lista no hay filtro** [PROPUESTO]

- DADO que abro la lista sin haber elegido filtro
- CUANDO se muestra
- ENTONCES el filtro activo es «todas».

### Errores y casos límite

**CA-5. Se pide un estado que no existe** (USUARIO)

- DADO que llego a la lista filtrada por un estado que no es ninguno de los tres (por ejemplo, desde un enlace antiguo o mal escrito, o pidiendo «bloqueado», que no existe en el producto)
- CUANDO se muestra la lista
- ENTONCES el producto me avisa en castellano de que ese estado no existe y me dice cuáles son válidos: pendiente, en curso y hecho
- Y no me muestra una lista vacía como si no hubiera tareas en ese estado.

**CA-6. Tras un estado inexistente, no se aplica nada sin avisar** [PROPUESTO]

- DADO que he recibido el aviso de CA-5
- CUANDO lo veo
- ENTONCES el producto no cambia el filtro por su cuenta, ni siquiera a «todas»
- Y me ofrece volver a «todas» con un solo clic.

**CA-7. Un estado válido sin tareas no es un error** [PROPUESTO]

- DADO que no hay ninguna tarea en «en curso»
- CUANDO filtro por «en curso»
- ENTONCES veo un mensaje que dice que no hay tareas en ese estado
- Y ese mensaje es distinto del aviso de estado inexistente de CA-5.

**CA-8. Si cambio el estado de una tarea, sale de la vista filtrada** [PROPUESTO]

- DADO que tengo la lista filtrada por «pendiente»
- CUANDO paso una de esas tareas a «en curso»
- ENTONCES la tarea deja de verse con este filtro
- Y sigue apareciendo en «en curso» y en «todas».

**CA-9. Crear una tarea con un filtro que no la incluye** [PROPUESTO]

- DADO que tengo la lista filtrada por «en curso» o por «hecho»
- CUANDO creo una tarea nueva, que nace en «pendiente»
- ENTONCES la tarea se crea
- Y el producto me confirma que se ha creado aunque no se vea con el filtro actual.

**CA-10. Los cambios de los demás respetan el filtro** (PRD: RF-19, de E3)

- DADO que tengo la lista filtrada por «pendiente»
- CUANDO otra persona pasa una tarea de «pendiente» a «en curso», o de «en curso» a «pendiente»
- ENTONCES, dentro del plazo de frescura, la primera desaparece de mi vista y la segunda aparece
- Y mi filtro sigue siendo «pendiente».

**CA-11. Filtrar no cambia el orden** (PRD: RF-16)

- DADO una lista con su orden habitual
- CUANDO filtro por un estado
- ENTONCES las tareas que siguen a la vista mantienen entre sí el mismo orden que tenían con «todas».

**CA-12. Mi filtro solo me afecta a mí** [PROPUESTO]

- DADO que filtro la lista por «hecho»
- CUANDO otra persona del equipo mira su lista
- ENTONCES sigue viendo su propio filtro; el mío no le cambia nada.

**CA-13. El filtro se mantiene al recargar** [PROPUESTO]

- DADO que tengo la lista filtrada por «pendiente»
- CUANDO recargo la página
- ENTONCES sigo viendo la lista filtrada por «pendiente».

**CA-14. Las tareas vencidas siguen marcadas al filtrar** (PRD: RF-15; coincide con CA-17 de FS-118)

- DADO una tarea vencida en «pendiente»
- CUANDO filtro por «pendiente»
- ENTONCES la tarea aparece y sigue marcada como vencida.
