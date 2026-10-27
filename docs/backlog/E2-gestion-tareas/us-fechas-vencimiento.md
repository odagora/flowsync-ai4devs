# Fecha de vencimiento y tareas vencidas

- **Identificador:** FS-118
- **Épica:** E2 «Gestión de tareas»

## Historia

Como miembro del equipo, quiero poder dar una fecha de vencimiento a una tarea al crearla y ver marcadas las tareas que se han pasado de plazo sin estar hechas, para detectar lo que va con retraso sin revisar la lista entera.

## Criterios de aceptación

Cada criterio indica su origen:

- **PRD:** sale de un requisito o de un supuesto de [`flowsync-mvp.md`](../../prd/flowsync-mvp.md).
- **[PROPUESTO]:** propuesta pendiente de revisión.

### Camino feliz

**CA-1. Crear una tarea con fecha** (PRD: RF-6, RF-9)

- DADO que estoy creando una tarea
- CUANDO le pongo título y una fecha de vencimiento y la confirmo
- ENTONCES la tarea aparece en la lista con esa fecha a la vista de todo el equipo.

**CA-2. Crear una tarea sin fecha** (PRD: RF-6, RF-15)

- DADO que estoy creando una tarea
- CUANDO solo le pongo título y la confirmo
- ENTONCES la tarea se crea sin fecha de vencimiento
- Y nunca aparece marcada como vencida, pase el tiempo que pase.

**CA-3. Tarea vencida** (PRD: RF-15)

- DADO una tarea pendiente o en curso cuya fecha de vencimiento es anterior a hoy
- CUANDO miro la lista
- ENTONCES la tarea aparece marcada como vencida.

**CA-4. Al marcarla como hecha deja de estar vencida** (PRD: RF-15)

- DADO una tarea marcada como vencida
- CUANDO alguien la pasa a «hecho»
- ENTONCES deja de aparecer marcada como vencida.

### Límites de la regla

**CA-5. Vence hoy, todavía no está vencida** (PRD: supuesto de RF-15)

- DADO una tarea pendiente o en curso cuya fecha de vencimiento es hoy
- CUANDO miro la lista
- ENTONCES no aparece marcada como vencida.

**CA-6. Fecha futura** (PRD: RF-15)

- DADO una tarea pendiente o en curso con fecha de vencimiento posterior a hoy
- CUANDO miro la lista
- ENTONCES no aparece marcada como vencida.

**CA-7. Una tarea hecha nunca está vencida** (PRD: RF-15)

- DADO una tarea en «hecho» cuya fecha de vencimiento ya pasó
- CUANDO miro la lista
- ENTONCES no aparece marcada como vencida.

**CA-8. «Hoy» depende del huso horario de quien mira** (PRD: supuesto y riesgo de RF-15; sigue abierto en PA-8)

- DADO una tarea pendiente cuya fecha de vencimiento es ayer para una persona y todavía hoy para otra que está en otro huso horario
- CUANDO las dos miran la lista
- ENTONCES la primera la ve vencida y la segunda no.

### Prohibiciones

**CA-9. La fecha no se puede cambiar ni quitar después de crear la tarea** (PRD: §4, RF-17)

- DADO una tarea ya creada, con fecha o sin ella
- CUANDO intento ponerle, cambiarle o quitarle la fecha
- ENTONCES el producto no me ofrece ninguna forma de hacerlo.

**CA-10. Que una tarea venza no cambia nada más** (PRD: RF-12, RF-21)

- DADO una tarea que pasa a estar vencida
- CUANDO eso ocurre
- ENTONCES su estado sigue siendo el mismo
- Y no se avisa a nadie: ni al responsable ni al resto del equipo.

### Casos límite y errores

**CA-11. Pasa la medianoche con la lista abierta** [PROPUESTO; depende de PA-8]

- DADO que tengo la lista abierta y una tarea pendiente vence hoy
- CUANDO empieza el día siguiente y sigo con la lista abierta, sin recargar
- ENTONCES la tarea pasa a aparecer marcada como vencida, como mucho en el plazo de RF-20.

**CA-12. Reabrir una tarea que vencía la vuelve a marcar** [PROPUESTO]

- DADO una tarea en «hecho» cuya fecha de vencimiento ya pasó
- CUANDO alguien la devuelve a «pendiente» o a «en curso»
- ENTONCES vuelve a aparecer marcada como vencida.

**CA-13. Se puede crear una tarea con una fecha ya pasada** [PROPUESTO]

- DADO que estoy creando una tarea
- CUANDO le pongo una fecha de vencimiento anterior a hoy y la confirmo
- ENTONCES la tarea se crea
- Y aparece marcada como vencida desde el primer momento.

**CA-14. Una fecha que no existe se rechaza** [PROPUESTO]

- DADO que estoy creando una tarea
- CUANDO intento ponerle una fecha que no existe, como el 31 de febrero
- ENTONCES la tarea no se crea
- Y se me explica en castellano que la fecha no es válida.

**CA-15. La fecha es un día, sin hora** [PROPUESTO]

- DADO que estoy poniendo una fecha de vencimiento
- CUANDO la elijo
- ENTONCES solo elijo un día, sin hora
- Y la tarea vence al terminar ese día, lo que encaja con CA-5.

**CA-16. Si la creación falla, no pierdo la fecha** [PROPUESTO]

- DADO que he puesto una fecha pero he dejado el título vacío
- CUANDO intento crear la tarea y se rechaza por falta de título
- ENTONCES la fecha que había puesto sigue ahí y no tengo que volver a escribirla.

**CA-17. La marca de vencida se mantiene al filtrar** [PROPUESTO]

- DADO una tarea vencida en «en curso»
- CUANDO filtro la lista por «en curso» o por «todas»
- ENTONCES la tarea aparece y sigue marcada como vencida.

**CA-18. Reasignar no cambia la fecha ni la marca** [PROPUESTO]

- DADO una tarea vencida
- CUANDO alguien cambia su responsable
- ENTONCES la tarea conserva su fecha y sigue marcada como vencida.

**CA-19. Una tarea vencida no cambia de posición en la lista** [PROPUESTO; deriva de RF-16]

- DADO una tarea que pasa a estar vencida
- CUANDO miro la lista
- ENTONCES sigue en la misma posición: estar vencida no la sube ni la destaca en el orden.
