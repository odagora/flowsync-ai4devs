# PRD — FlowSync MVP

Este PRD parte del alcance acordado en [`alcance-mvp.md`](./alcance-mvp.md). Si los dos documentos chocan, manda el alcance: hay que corregir el PRD.

Es un documento de producto. No incluye modelo de datos, endpoints, arquitectura ni nombres en código; todo eso se decide en la spec de implementación. Los supuestos van marcados como **[SUPUESTO]** y hay que validarlos antes de tomarlos por hechos.

## 1. Problema y contexto

En un equipo remoto pequeño, nadie puede saber en qué está el resto sin interrumpir a alguien. Hoy eso cuesta tres cosas:

- **Tiempo de daily.** La ronda de "¿en qué estás?" ocupa la mitad de una daily de 15 minutos.
- **Interrupciones.** Durante el día se pregunta "¿cómo va?" por Slack o similar, y cada pregunta corta el trabajo de alguien.
- **Trabajo duplicado.** Dos personas tocaron el mismo módulo la misma semana porque una empezó sin que la otra lo supiera. Se perdieron dos días.

FlowSync quiere que el estado del equipo se vea de un vistazo, en una lista compartida que cada persona mantiene en segundos. La daily no desaparece entera: desaparece la ronda de estado. La parte de bloqueos sigue y este MVP no la resuelve.

**Punto de partida del producto.** Ya existen el registro, el login, el perfil y el logout. Las tareas no existen todavía.

## 2. Usuarios y jobs-to-be-done

**Usuario objetivo.** Las personas de un equipo remoto de 3 a 10 miembros, todas con el mismo rol. No hay jerarquía ni nadie que consuma reportes.

**Primer usuario.** Es un **caso de estudio, no un cliente real**: un equipo de producto SaaS de 6 personas, repartido en 3 husos horarios. Hoy trabaja con un gestor de tareas pesado y hace una daily de 15 minutos por videollamada.

**Quién no es nuestro usuario.** Un equipo que necesite sprints, estimaciones, épicas, backlog priorizado o informes.

| # | Cuando… | quiero… | para… |
|---|---|---|---|
| JTBD-1 | voy a empezar algo nuevo | ver si alguien ya lo tiene en curso | no duplicar trabajo |
| JTBD-2 | termino algo y busco qué hacer ahora | ver qué está pendiente y de quién es | elegir lo siguiente sin preguntar |
| JTBD-3 | empiezo o termino una tarea | dejarlo reflejado en segundos | que nadie tenga que interrumpirme para preguntar cómo va |
| JTBD-4 | llego por la mañana o vuelvo de una reunión | ver de un vistazo cómo está el equipo | ponerme al día sin preguntar a nadie |
| JTBD-5 | se acerca o se pasa una fecha | ver qué tareas están vencidas | detectar lo que va con retraso sin tener que revisar todo |

## 3. Propuesta de valor

> Abres una sola lista y ves en qué está cada uno, sin preguntar a nadie ni gastar la daily en la ronda de estado.

- **Para quien actualiza.** La lista es su propia cola de trabajo. Cambiar el estado cuesta dos clics y le ahorra interrupciones. El beneficio es para quien escribe, no solo para los demás.
- **Para quien consulta.** Antes de empezar una tarea ve si alguien ya la tiene en curso. Elige lo siguiente entre lo que está pendiente.
- **Frente al gestor de tareas pesado.** No hay flujos que configurar, ni sprints, ni estimaciones. FlowSync sustituye al gestor; no está pensado para usarse a la vez.
- **Frescura, no presencia.** El estado es de la tarea, no de la persona. FlowSync no muestra quién está conectado ni mide la actividad de nadie. La información espera a que la mires; no te interrumpe con avisos.

**Hipótesis principal (riesgo #1).** Si actualizar cuesta dos clics, el estado se mantendrá fresco sin obligar a nadie. Si la información se queda vieja, el producto no sirve.

**Riesgo #2.** Que alguien empiece a trabajar sin crear antes la tarea. FlowSync solo evita choques entre tareas que existen.

## 4. Alcance / Fuera de alcance

**Criterio de recorte.** Solo entra lo necesario para responder, sin interrumpir a nadie, a dos preguntas: "¿alguien está ya con esto?" y "¿qué cojo ahora?".

### Dentro del alcance

- **Espacio único.** Todo usuario registrado ve y edita todas las tareas.
- **Crear tareas.** Cada tarea tiene:
  - título, obligatorio;
  - responsable, obligatorio; por defecto, quien la crea;
  - fecha de vencimiento, opcional.
- **Estados.** Hay tres estados fijos: pendiente, en curso y hecho. Se cambian en dos clics.
- **Reasignar.** Se puede cambiar el responsable de una tarea.
- **Filtrar** la lista por estado.
- **Vencidas.** Las tareas vencidas aparecen marcadas.
- **Cambios del resto.** Lo que cambien los demás se ve en 10 segundos como máximo, sin recargar.
- **Tests.** El trabajo se entrega con tests automatizados.

### Fuera de alcance

La justificación completa de cada punto está en [`alcance-mvp.md`, §5](./alcance-mvp.md#5-no-alcance-out).

- Estado "bloqueado" y gestión de bloqueos.
- Estados o flujos configurables.
- Sincronización en tiempo real (aviso instantáneo de cambios). Es una ampliación futura de E3: el MVP cubre E3 solo hasta el límite de 10 segundos.
- "Qué se ha movido desde mi última visita".
- Borrar tareas.
- Editar el título o la fecha de una tarea ya creada.
- Descripción, comentarios, adjuntos, etiquetas y prioridad.
- Búsqueda, ordenación configurable y filtros combinados.
- Archivar u ocultar las tareas hechas.
- Historial o auditoría de cambios.
- Varios equipos o espacios, invitaciones y gestión de miembros.
- Permisos y roles.
- Ver quién está conectado e indicadores de actividad de las personas.
- Notificaciones push o por email.
- Chat, videollamada y edición simultánea.
- Integraciones con Git/PRs, CI o calendario.
- Importar tareas de otros gestores o sincronizar con ellos.
- Sprints, estimaciones, épicas de usuario, backlog priorizado e informes.
- Editar el perfil y recuperar la contraseña.
- App móvil o una experiencia móvil cuidada.

## 5. Épicas del MVP

- **E1 «Cuentas y acceso»:** registro, login, logout, perfil y acceso solo para usuarios autenticados (ya existe).
- **E2 «Gestión de tareas»:** crear, asignar, reasignar, cambiar de estado, filtrar y marcar vencidas en la lista compartida.
- **E3 «Actividad del equipo»:** ver los cambios de los demás en la lista sin recargar, dentro del límite de frescura.

## 6. Requisitos funcionales

Cada requisito se puede verificar con una prueba: hay una acción, un resultado esperado y, cuando aplica, una prohibición.

### E1 — Cuentas y acceso

Estos requisitos describen el comportamiento que ya existe. En el MVP solo hay que comprobar que se mantiene; no se construye nada nuevo.

- **RF-1 Registro.** Una persona se registra con:
  - nombre, opcional;
  - email, obligatorio y con formato válido;
  - contraseña de 8 a 32 caracteres;
  - confirmación de la contraseña.

  El sistema rechaza un email que ya esté registrado y una confirmación que no coincida, y muestra el motivo en el campo afectado. Al terminar el registro, la persona queda autenticada y dentro del espacio único.
- **RF-2 Login.** Con email y contraseña correctos, la persona accede. Si son incorrectos, el sistema muestra un error que no dice cuál de los dos ha fallado.
- **RF-3 Acceso restringido.** Una persona sin autenticar que intenta abrir la lista de tareas, o cualquier pantalla del producto que no sea registro o login, acaba en la pantalla de login. Ninguna tarea es visible sin autenticarse.
- **RF-4 Logout.** Después de cerrar sesión, la persona no puede ver la lista de tareas hasta que vuelva a iniciar sesión.
- **RF-5 Perfil.** La persona autenticada puede ver su nombre y su email.

### E2 — Gestión de tareas

- **RF-6 Crear tarea.** Una persona autenticada crea una tarea escribiendo un título y confirmando. El responsable viene preseleccionado con ella misma y la fecha de vencimiento es opcional. La tarea nueva:
  - empieza en estado "pendiente";
  - aparece en la lista sin recargar la página.
- **RF-7 Validación al crear.** El sistema rechaza crear una tarea si:
  - el título está vacío, o
  - no tiene responsable.

  En los dos casos indica el motivo. **[SUPUESTO]** Un título que solo tiene espacios cuenta como vacío. El título tiene una longitud máxima, que fijará la spec.
- **RF-8 Elegir responsable.** Al crear o al reasignar, el selector de responsable muestra a todos los usuarios registrados. A cada uno se le identifica por su nombre o, si no tiene nombre, por su email.
- **RF-9 Lista compartida.** Cualquier persona autenticada ve todas las tareas del espacio. De cada tarea se ve el título, el responsable, el estado y la fecha de vencimiento si la tiene.
- **RF-10 Distinguir "en curso".** Cada fila de la lista muestra el estado de la tarea con una marca visual propia: una etiqueta con el nombre del estado y un estilo distinto para cada uno. La marca de "en curso" es diferente de la de "pendiente" y de la de "hecho". Así se responde a "¿alguien está ya con esto?" sin abrir ninguna tarea.
- **RF-11 Cambiar estado.** Desde la propia lista, sin cambiar de pantalla, cualquier persona autenticada puede poner cualquier tarea en cualquiera de los tres estados en dos clics como máximo. Se puede pasar de cualquier estado a cualquier otro, también de "hecho" a "pendiente", porque no hay flujo obligatorio.
- **RF-12 Estados fijos.** Los únicos estados posibles son pendiente, en curso y hecho. No se pueden añadir, renombrar ni quitar.
- **RF-13 Reasignar.** Cualquier persona autenticada puede cambiar el responsable de cualquier tarea por otro usuario registrado. Una tarea nunca se queda sin responsable.
- **RF-14 Filtrar por estado.** La lista se puede filtrar por "todas", "pendiente", "en curso" o "hecho", y solo por un estado a la vez. Con un filtro activo, solo aparecen las tareas en ese estado.
- **RF-15 Marcar vencidas.** Una tarea aparece marcada como vencida si cumple las dos condiciones:
  - su fecha de vencimiento es anterior al día de hoy;
  - no está en "hecho".

  Una tarea sin fecha nunca aparece como vencida. Al pasar a "hecho", una tarea vencida deja de estar marcada. **[SUPUESTO]** Una tarea que vence hoy todavía no está vencida, y "hoy" se calcula con el huso horario de quien mira la lista.

  *Riesgo:* con 3 husos horarios, la misma tarea puede verse vencida para una persona y no para otra durante unas horas. Se acepta en el MVP; los tests deben fijar el huso horario.
- **RF-16 Orden de la lista.** La lista tiene un orden por defecto que la persona no puede cambiar. Si no cambia ninguna tarea, dos cargas seguidas muestran el mismo orden. **[SUPUESTO]** Las tareas creadas más recientemente aparecen primero; la spec puede ajustarlo.
- **RF-17 Lo que no se puede hacer.** El producto no ofrece ninguna forma de:
  - borrar una tarea;
  - editar el título o la fecha de una tarea ya creada;
  - añadirle campos distintos de título, responsable, estado y fecha.

### E3 — Actividad del equipo

- **RF-18 Ver cambios ajenos sin recargar.** Si otra persona crea una tarea, le cambia el estado o la reasigna, el cambio aparece en la lista de quien la tiene abierta dentro del plazo de RNF-1. No hace falta recargar ni hacer nada. **[SUPUESTO]** Si dos personas cambian la misma tarea casi a la vez, se queda el último cambio, y todos acaban viendo ese mismo valor dentro del plazo de RNF-1.
- **RF-19 El filtro se mantiene.** Al llegar cambios de otras personas, el filtro activo se conserva. Si una tarea cambia de estado y ya no cumple el filtro, desaparece de la vista; si pasa a cumplirlo, aparece.
- **RF-20 Volver a la lista.** Al abrir la lista, o al volver a una pestaña que se dejó abierta (por ejemplo, de un día para otro), se ve el estado actual de todas las tareas en el plazo de RNF-1, no una versión anterior.
- **RF-21 Sin presencia ni avisos.** El producto no muestra:
  - quién está conectado;
  - la última actividad de una persona;
  - indicadores de que alguien está escribiendo.

  Tampoco envía notificaciones push ni por email. Lo único que cambia es el estado de las tareas.

## 7. Requisitos no funcionales

- **RNF-1 Frescura.** Un cambio hecho por una persona aparece en la lista abierta de las demás en 10 segundos como máximo.
  - **Umbral de fallo:** más de 10 segundos.
  - **Margen aceptado:** se acordó que de 5 a 10 segundos vale, así que no hace falta bajar de 5 segundos. La sincronización en tiempo real no es un requisito.
  - **Cómo se prueba:** con dos sesiones abiertas a la vez y conexión normal.
  - **Carga [SUPUESTO]:** hasta 10 personas con la lista abierta a la vez, que es el tamaño máximo del equipo objetivo.
- **RNF-2 Coste de actualizar.**
  - Cambiar el estado de una tarea: 2 clics como máximo desde la lista.
  - Crear una tarea: no hace falta rellenar nada más que el título.
  - Ninguna acción del producto obliga a pasar por un formulario de varios pasos.
- **RNF-3 Respuesta.** Las acciones propias (crear, cambiar estado, reasignar) se ven reflejadas en la propia pantalla sin recargar. **[SUPUESTO]** Tardan menos de 1 segundo en condiciones normales.
- **RNF-4 Volumen.** El producto está pensado para un espacio con 3 a 10 usuarios. **[SUPUESTO]** Debe funcionar bien con hasta unos cientos de tareas acumuladas, sin paginar.
- **RNF-5 Idioma.** Toda la interfaz y todos los mensajes de error están en castellano.
- **RNF-6 Plataforma.** Se usa en navegadores de escritorio actuales. En un móvil, la lista y el cambio de estado tienen que poder usarse, pero no se optimiza la experiencia.
- **RNF-7 Seguridad.**
  - Todas las operaciones sobre tareas exigen estar autenticado.
  - Las contraseñas no se guardan ni se muestran en claro.
  - Los errores de login no revelan si el email existe.
- **RNF-8 Privacidad.** El producto no registra ni muestra actividad de las personas: ni presencia, ni tiempo de conexión, ni métricas individuales. Se excluye a propósito porque sería vigilancia.
- **RNF-9 Calidad.**
  - Cada RF de E2 y E3 tiene al menos un test automatizado que lo cubre. Una verificación manual puede complementar un test, pero nunca lo sustituye.
  - Los tests no modifican datos que ya existían antes de ejecutarlos.
  - El resultado de los tests no depende del orden en que se ejecutan ni de ejecuciones anteriores.
  - El MVP no se considera terminado con tests que fallen.

## 8. Restricciones

- **Stack actual, sin cambios.**
  - Backend: AdonisJS 7 con base de datos SQLite.
  - Frontend: React 19 con Vite.
  - Las épicas se construyen sobre ese stack.
- **La autenticación ya existe** y se reutiliza: registro, login, perfil y logout con tokens de acceso. E1 no se reconstruye.
- **Un solo espacio.** No existe el concepto de equipo ni de espacio. Todo usuario registrado pertenece al único espacio. **[SUPUESTO]** Cada despliegue corresponde a un equipo.
- **Sin servicios de terceros.**
  - Nada de integraciones, OAuth externo ni proveedores de notificaciones.
  - El estado lo escribe la persona; no se deriva de ninguna fuente externa.
- **Tests con lo que hay.**
  - El backend ya tiene un runner de tests.
  - El frontend no tiene ninguno instalado.
  - La spec decide cómo se cumple RNF-9 para los requisitos de interfaz (RF-10, RF-11, RF-14, RF-15, RF-18, RF-19), pero tienen que quedar cubiertos por tests automatizados. Eso probablemente obliga a añadir un runner de tests en el frontend.
- **Sin diseño técnico en este documento.** El modelo de datos, la API y cómo se logra la frescura de RNF-1 se deciden en la spec de implementación.

## 9. Métricas de éxito

El primer usuario es un **caso de estudio ficticio**, así que estas métricas no se pueden medir con un equipo real. En el MVP se validan con una prueba simulada o usándolo nosotros. Están pensadas para cuando haya un equipo real.

| # | Métrica | Cómo se mide | Objetivo |
|---|---|---|---|
| M-1 (principal) | La ronda de "¿en qué estás?" desaparece de la daily | Observación de la daily después de 1 semana de uso real | El equipo deja de hacer la ronda y nadie pide que vuelva. Si la siguen haciendo igual, el MVP no ha funcionado. |
| M-2 | El estado está fresco (riesgo #1) | Muestreo diario: se pregunta a cada responsable si sus tareas "en curso" reflejan lo que está haciendo de verdad | **[SUPUESTO]** ≥ 80 % de coincidencia |
| M-3 | El estado se actualiza a mano | % de tareas hechas que pasaron antes por "en curso" | **[SUPUESTO]** ≥ 70 %. Por debajo, la gente salta pasos y "en curso" deja de ser una señal fiable. |
| M-4 | Menos interrupciones | Preguntas tipo "¿en qué estás?" o "¿cómo va?" en el chat del equipo por semana, comparadas con la semana anterior a usar FlowSync | **[SUPUESTO]** Bajan al menos a la mitad |
| M-5 | Sin trabajo duplicado | Episodios de dos personas trabajando en lo mismo sin saberlo, durante el periodo de prueba | **[SUPUESTO]** 0 entre tareas registradas en FlowSync durante la semana de M-1. Los que vengan de trabajo sin tarea cuentan para el riesgo #2. |

**Criterio de terminado del MVP**, distinto del éxito de producto:

- Todos los RF-1 a RF-21 se cumplen. Los de E1 solo se comprueban como no rotos, porque ya existen.
- RNF-1, RNF-2 y RNF-9 se han verificado.
- Ningún test falla.
