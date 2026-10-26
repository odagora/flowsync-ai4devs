# Alcance del MVP de FlowSync

Este documento recoge el alcance acordado del MVP y sirve de base para el PRD ([`flowsync-mvp.md`](./flowsync-mvp.md)). Se queda a nivel de producto: el modelo de datos, los endpoints, los nombres en código y cómo se consigue la frescura de la información se deciden en la spec de implementación.

**Criterio de recorte.** Solo entra lo que hace falta para responder, sin interrumpir a nadie, a dos preguntas:

- ¿Alguien está ya con esto?
- ¿Qué cojo ahora?

Todo lo demás queda fuera, aunque sea barato de hacer.

**Punto de partida.** Hoy el repo solo tiene autenticación: registro, login, perfil y logout. Las tareas todavía no existen.

## 1. Problema

En un equipo remoto pequeño, nadie puede ver en qué está el resto sin interrumpir a alguien. Eso tiene tres costes:

- **La daily.** La ronda de "¿en qué estás?" se come la mitad de una daily de 15 minutos.
- **El chat.** Durante el día llegan preguntas constantes de "¿cómo va?" por Slack o similar.
- **El trabajo duplicado.** Dos personas tocaron el mismo módulo la misma semana porque una empezó sin que la otra lo supiera. Se perdieron dos días.

La daily no va a desaparecer entera. Desaparece la ronda de estado. La parte de bloqueos sigue, y este MVP no la resuelve.

## 2. Usuarios

- **Para quién es.** Para los miembros de un equipo remoto de 3 a 10 personas, todos con el mismo rol.
  - Los que más pierden hoy son dos: los dos devs que descubren tarde que estaban haciendo lo mismo, y la persona que tiene que interrumpir a otra para preguntar.
  - No hay reportes hacia arriba y ningún manager consume esta información.
- **Primer usuario.** Es un **caso de estudio, no un cliente real**: un equipo de producto SaaS de 6 personas, repartido en 3 husos horarios. Hoy usa un gestor de tareas pesado y hace una daily de 15 minutos por videollamada.
- **Para quién no es.** Para un equipo que necesite sprints, estimaciones, épicas, backlog priorizado o informes.

## 3. Propuesta de valor

> Abres una sola lista y ves en qué está cada uno, sin preguntar ni dedicar la daily a la ronda de estado.

- **Para quien actualiza.** La lista es su propia cola de trabajo y la mira para decidir qué hace después. Cambiar un estado son dos clics, y a cambio deja de recibir interrupciones. Si el beneficio fuera solo para los demás, no lo actualizaría.
- **Para quien consulta.** Antes de empezar algo ve si otra persona ya lo tiene en curso, y elige lo siguiente entre lo que está pendiente.
- **Frente al gestor de tareas pesado.** Crear una tarea y cambiarle el estado lleva segundos: no hay que configurar flujos, ni elegir sprint, ni estimar. FlowSync reemplaza al gestor actual; no está pensado para usarse junto a él.
- **Frescura, no presencia.** El estado pertenece a la tarea, no a la persona. Se muestra como un resumen que espera a que lo mires, no como un aviso que interrumpe. El caso típico es llegar por la mañana o volver de una reunión y ver qué se ha movido.

**Hipótesis principal (riesgo #1).** El estado se mantendrá al día sin obligar a nadie, siempre que actualizarlo cueste dos clics. Si la información se queda vieja, el producto pierde el sentido.

**Riesgo #2.** Que alguien empiece a trabajar sin crear antes la tarea. FlowSync solo evita choques entre tareas que existen.

**Criterio de éxito.** Tras una semana de uso real, el equipo deja de hacer la ronda de "¿en qué estás?" y nadie pide recuperarla. Si la siguen haciendo igual, no ha funcionado. Como el primer usuario es un caso de estudio, esto solo se puede validar con una prueba simulada.

## 4. Alcance (IN)

El MVP es una sola funcionalidad completa de principio a fin: una lista de tareas compartida.

1. **Espacio único.** Cualquier usuario registrado ve y edita todas las tareas. Se reutilizan el registro y el login que ya existen.
2. **Crear tarea.** Cada tarea tiene:
   - un título, obligatorio;
   - un responsable, obligatorio: puede ser cualquier usuario registrado y, por defecto, es quien la crea;
   - una fecha de vencimiento, opcional.

   Toda tarea nueva empieza en "pendiente".
3. **Cambiar el estado en dos clics** desde la propia lista. Hay tres estados fijos que no se pueden configurar:
   - **pendiente**;
   - **en curso**: es la señal que el producto existe para transmitir;
   - **hecho**.
4. **Cambiar el responsable.** Como toda tarea tiene dueño, quedarse con una tarea de otra persona es reasignarla.
5. **Filtrar la lista por estado**, para centrarse en lo pendiente o en lo que está en curso.
6. **Ver marcadas las tareas vencidas.** Una tarea está vencida si su fecha ya pasó y no está hecha. Una tarea sin fecha nunca aparece como vencida.
7. **Ver los cambios de los demás en 5 a 10 segundos**, sin recargar la página ni preguntar.
8. **Tests.** El trabajo se entrega con tests; sin ellos el MVP no está terminado.

## 5. NO-alcance (OUT)

| Queda fuera | Por qué |
|---|---|
| Estado "bloqueado" y gestión de bloqueos | Es la parte de la daily que el MVP declara no resuelta. Añadirlo a medias promete algo que no se cumple. |
| Estados o flujos configurables | Tener que configurarlo todo es precisamente lo pesado de Jira. Con tres estados basta para decidir. |
| Sincronización en tiempo real (ampliación futura de E3; el MVP cubre E3 solo hasta el umbral de 5-10 s) | Ver los cambios en 5 a 10 segundos ya responde a "¿alguien está con esto?". El tiempo real cuesta mucho más y apenas mejora esa decisión. |
| "Qué se ha movido desde mi última visita" | Encaja con el caso de "vuelvo por la mañana", pero es una segunda funcionalidad. Es mejor terminar una que dejar dos a medias. El filtro de la lista cubre parte de esa necesidad. |
| Borrar tareas | Marcarlas como hechas ya cierra el trabajo. Borrar abre preguntas (quién puede hacerlo, si se puede deshacer) que no ayudan a decidir nada. |
| Editar el título o la fecha después de crear la tarea | No cambia quién está en qué. Es lo primero que entraría en la siguiente iteración si molesta en el uso real. |
| Descripción, comentarios, adjuntos, etiquetas, prioridad | Cada campo nuevo aleja de "crear una tarea en segundos". Las conversaciones siguen en el chat. |
| Búsqueda, ordenación configurable, filtros combinados | Con 3 a 10 personas la lista es corta: basta con filtrar por estado y echar un vistazo. |
| Archivar u ocultar las tareas hechas | El filtro por estado ya las aparta. Se reconsidera si la lista se hace inmanejable. |
| Historial o auditoría de cambios | Sirve para rendir cuentas, no para coordinarse, y nadie consume reportes. |
| Varios equipos o espacios, y personas en más de uno | El caso de estudio es un solo equipo. Se recoge como supuesto en el PRD; no se construye. |
| Invitaciones y gestión de miembros | Con un solo espacio, registrarse ya es unirse al equipo. |
| Permisos y roles | Todos tienen el mismo rol por decisión de producto: todos ven y editan lo mismo. |
| Presencia ("quién está conectado") e indicadores de actividad | El estado es de la tarea, no de la persona. Lo otro sería vigilancia y se descarta a propósito. |
| Notificaciones push o por email | La información espera a que la mires, no te interrumpe. Las notificaciones traerían de vuelta las interrupciones que queremos quitar. |
| Chat, videollamada, edición simultánea | No es el problema que queremos resolver. Ya existen herramientas para eso y competir con ellas dispersaría el MVP. |
| Integraciones con Git/PRs, CI o calendario | Sacar el estado de otras herramientas sería otro producto, con integraciones y OAuth de terceros. Aquí el estado lo escribe la persona. |
| Importar tareas de otros gestores o sincronizarse con ellos | FlowSync reemplaza al gestor, no convive con él. Tener que actualizar dos herramientas es lo que suele hacer fracasar a este tipo de productos. |
| Sprints, estimaciones, épicas, backlog priorizado, informes | Renuncia explícita: un equipo que necesite esto no es nuestro usuario. |
| Editar el perfil, recuperar la contraseña | No tienen que ver con la hipótesis que queremos validar. La autenticación actual basta para el caso de estudio. |
| App móvil o una experiencia móvil cuidada | Se usa al sentarse a trabajar, desde el ordenador. En móvil basta con que no se rompa. |

## Supuestos para el PRD

- Cada instalación corresponde a un único equipo: quien se registra entra en el único espacio.
- El estado lo escribe la persona que hace la tarea; no se saca de ninguna herramienta externa.
- La daily no desaparece; solo desaparece su ronda de estado.
- El caso de estudio es ficticio. Las métricas de éxito están pensadas para un equipo real.
