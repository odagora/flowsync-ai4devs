# PRD — FlowSync MVP

Este PRD parte del alcance acordado en [`alcance-mvp.md`](./alcance-mvp.md). Si los dos documentos chocan, manda el alcance: hay que corregir el PRD.

Es un documento de producto: describe qué necesita la persona usuaria, no cómo se implementa. Cómo se guardan los datos, cómo se comunican las partes, la arquitectura y los nombres en código se deciden en la spec de implementación. Los supuestos van marcados como **[SUPUESTO]** y hay que validarlos antes de tomarlos por hechos.

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
- **Pruebas.** El trabajo se entrega con pruebas automáticas.

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
  - una contraseña lo bastante larga para ser segura;
  - la misma contraseña repetida para confirmarla.

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

  En los dos casos indica el motivo. **[SUPUESTO]** Un título que solo tiene espacios cuenta como vacío.
- **RF-8 Elegir responsable.** Al crear o reasignar una tarea, se puede elegir como responsable a cualquier persona registrada. Cada persona aparece con su nombre o, si no tiene nombre, con su email.
- **RF-9 Lista compartida.** Cualquier persona autenticada ve todas las tareas del espacio. De cada tarea se ve el título, el responsable, el estado y la fecha de vencimiento si la tiene.
- **RF-10 Distinguir "en curso".** Mirando solo la lista, sin abrir ninguna tarea, se sabe en qué estado está cada una. Las tareas en curso se reconocen a simple vista, sin confundirlas con las pendientes ni con las hechas. Así se responde a "¿alguien está ya con esto?".
- **RF-11 Cambiar estado.** Desde la propia lista, sin cambiar de pantalla, cualquier persona autenticada puede poner cualquier tarea en cualquiera de los tres estados en dos clics como máximo. Se puede pasar de cualquier estado a cualquier otro, también de "hecho" a "pendiente", porque no hay flujo obligatorio.
- **RF-12 Estados fijos.** Los únicos estados posibles son pendiente, en curso y hecho. No se pueden añadir, renombrar ni quitar.
- **RF-13 Reasignar.** Cualquier persona autenticada puede cambiar el responsable de cualquier tarea por otro usuario registrado. Una tarea nunca se queda sin responsable.
- **RF-14 Filtrar por estado.** La lista se puede filtrar por "todas", "pendiente", "en curso" o "hecho", y solo por un estado a la vez. Con un filtro activo, solo aparecen las tareas en ese estado.
- **RF-15 Marcar vencidas.** Una tarea aparece marcada como vencida si cumple las dos condiciones:
  - su fecha de vencimiento es anterior al día de hoy;
  - no está en "hecho".

  Una tarea sin fecha nunca aparece como vencida. Al pasar a "hecho", una tarea vencida deja de estar marcada. **[SUPUESTO]** Una tarea que vence hoy todavía no está vencida, y "hoy" se calcula con el huso horario de quien mira la lista.

  *Riesgo:* con 3 husos horarios, la misma tarea puede verse vencida para una persona y no para otra durante unas horas. Se acepta en el MVP.
- **RF-16 Orden de la lista.** La lista tiene un orden por defecto que la persona no puede cambiar. Mientras no cambie nada, las tareas aparecen siempre en el mismo orden. **[SUPUESTO]** Las tareas creadas más recientemente aparecen primero.
- **RF-17 Lo que no se puede hacer.** El producto no ofrece ninguna forma de:
  - borrar una tarea;
  - editar el título o la fecha de una tarea ya creada;
  - guardar en una tarea más información que título, responsable, estado y fecha.

### E3 — Actividad del equipo

- **RF-18 Ver cambios ajenos sin recargar.** Si otra persona crea una tarea, le cambia el estado o la reasigna, el cambio aparece en la lista de quien la tiene abierta dentro del plazo de RNF-1. No hace falta recargar ni hacer nada. **[SUPUESTO]** Si dos personas cambian la misma tarea casi a la vez, prevalece el último cambio, y todo el equipo acaba viendo lo mismo dentro del plazo de RNF-1.
- **RF-19 El filtro se mantiene.** Al llegar cambios de otras personas, el filtro activo se conserva. Si una tarea cambia de estado y ya no cumple el filtro, desaparece de la vista; si pasa a cumplirlo, aparece.
- **RF-20 Volver a la lista.** Al abrir la lista, o al volver a ella después de dejarla abierta (por ejemplo, de un día para otro), se ve el estado actual de todas las tareas en el plazo de RNF-1, no una versión anterior.
- **RF-21 Sin presencia ni avisos.** El producto no muestra:
  - quién está conectado;
  - la última actividad de una persona;
  - indicadores de que alguien está escribiendo.

  Tampoco envía notificaciones push ni por email. Lo único que cambia es el estado de las tareas.

## 7. Requisitos no funcionales

- **RNF-1 Frescura.** Un cambio hecho por una persona aparece en la lista abierta de las demás en 10 segundos como máximo.
  - **Umbral de fallo:** más de 10 segundos.
  - **Margen aceptado:** se acordó que de 5 a 10 segundos vale, así que no hace falta bajar de 5 segundos. La sincronización en tiempo real no es un requisito.
  - **Cómo se prueba:** dos personas con la lista abierta a la vez y conexión normal.
  - **Carga [SUPUESTO]:** hasta 10 personas con la lista abierta a la vez, que es el tamaño máximo del equipo objetivo.
- **RNF-2 Coste de actualizar.**
  - Cambiar el estado de una tarea: 2 clics como máximo desde la lista.
  - Crear una tarea: no hace falta rellenar nada más que el título.
  - Ninguna acción del producto obliga a pasar por un formulario de varios pasos.
- **RNF-3 Respuesta.** Las acciones propias (crear, cambiar estado, reasignar) se ven reflejadas en la propia pantalla sin recargar. **[SUPUESTO]** Tardan menos de 1 segundo en condiciones normales.
- **RNF-4 Volumen.** El producto está pensado para un espacio con 3 a 10 usuarios. **[SUPUESTO]** Debe funcionar bien con hasta unos cientos de tareas acumuladas, todas visibles en la misma lista sin pasar de página.
- **RNF-5 Idioma.** Toda la interfaz y todos los mensajes de error están en castellano.
- **RNF-6 Plataforma.** Se usa en navegadores de escritorio actuales. En un móvil, la lista y el cambio de estado tienen que poder usarse, pero no se optimiza la experiencia.
- **RNF-7 Seguridad.**
  - Ver o cambiar tareas exige haber iniciado sesión.
  - Nadie puede ver la contraseña de otra persona, tampoco quien administra el producto.
  - Los errores de login no revelan si el email existe.
- **RNF-8 Privacidad.** El producto no registra ni muestra actividad de las personas: ni presencia, ni tiempo de conexión, ni métricas individuales. Se excluye a propósito porque sería vigilancia.
- **RNF-9 Calidad.**
  - Cada RF de E2 y E3 está cubierto por al menos una prueba automática. Las pruebas se pueden repetir y dan siempre el mismo resultado.
  - Una comprobación manual puede complementar una prueba automática, pero nunca la sustituye.
  - El MVP no se considera terminado mientras falle alguna prueba.

## 8. Restricciones

- **Stack actual, sin cambios.** Las épicas se construyen sobre AdonisJS 7 en el backend y React 19 en el frontend.
- **La autenticación ya existe** y se reutiliza: registro, login, perfil y logout. E1 no se reconstruye.
- **Un solo espacio.** No existe el concepto de equipo ni de espacio. Todo usuario registrado pertenece al único espacio. **[SUPUESTO]** Cada despliegue corresponde a un equipo.
- **Sin servicios de terceros.**
  - Nada de integraciones, inicio de sesión con cuentas de otros servicios ni servicios externos de avisos.
  - El estado lo escribe la persona; no se deriva de ninguna fuente externa.
- **Pruebas de lo que ve la persona.** Hoy solo hay pruebas automáticas para la parte del servidor. Para cubrir los requisitos que se ven en pantalla (RF-10, RF-11, RF-14, RF-15, RF-18 y RF-19) hará falta ampliarlas. Cómo hacerlo lo decide la spec.
- **Sin diseño técnico en este documento.** La spec de implementación decide cómo se guardan los datos, cómo se comunican las partes y cómo se consigue la frescura de RNF-1.

## 9. Métricas de éxito

El primer usuario es un **caso de estudio ficticio**, así que estas métricas no se pueden medir con un equipo real. En el MVP se validan con una prueba simulada o usándolo nosotros. Están pensadas para cuando haya un equipo real.

| # | Métrica | Cómo se mide | Objetivo |
|---|---|---|---|
| M-1 (principal) | La ronda de "¿en qué estás?" desaparece de la daily | Observación de la daily después de 1 semana de uso real | El equipo deja de hacer la ronda y nadie pide que vuelva. Si la siguen haciendo igual, el MVP no ha funcionado. |
| M-2 | El estado está fresco (riesgo #1) | Muestreo diario: se pregunta a cada responsable si sus tareas "en curso" reflejan lo que está haciendo de verdad | **[SUPUESTO]** ≥ 80 % de coincidencia |
| M-3 | El estado se actualiza a mano | **No se puede medir con este MVP.** Hace falta saber por qué estados pasó cada tarea, y el historial de cambios está fuera de alcance (§4). | Ninguno. Esta métrica no cuenta para evaluar el MVP. |
| M-4 | Menos interrupciones | Preguntas tipo "¿en qué estás?" o "¿cómo va?" en el chat del equipo por semana, comparadas con la semana anterior a usar FlowSync | **[SUPUESTO]** Bajan al menos a la mitad |
| M-5 | Sin trabajo duplicado | Episodios de dos personas trabajando en lo mismo sin saberlo, durante el periodo de prueba | **[SUPUESTO]** 0 entre tareas registradas en FlowSync durante la semana de M-1. Los que vengan de trabajo sin tarea cuentan para el riesgo #2. |

**Criterio de terminado del MVP**, distinto del éxito de producto:

- Todos los RF-1 a RF-21 se cumplen. Los de E1 solo se comprueban como no rotos, porque ya existen.
- RNF-1, RNF-2 y RNF-9 se han verificado.
- Ninguna prueba falla.

## 10. Puntos abiertos

Son hallazgos de la revisión adversarial del PRD, ordenados de más a menos riesgo. Ninguno cambia todavía el alcance: cada uno recoge el argumento y lo que haría falta para decidirlo. La fecha de vencimiento y el filtrado por estado se mantienen dentro del alcance, en E2. Los puntos que los cuestionan solo se refieren a cómo se hacen, no a si entran.

### PA-1. "Sustituye al gestor" funciona como supuesto, no como decisión

- **Argumento.**
  - Si el equipo no puede dejar su gestor actual (porque otros equipos, un cliente o la dirección siguen usándolo), acabará actualizando dos herramientas. El estado se quedará viejo y el producto morirá.
  - Además, importar tareas está fuera de alcance, así que adoptar FlowSync obliga a recrear a mano todo el trabajo en curso.
- **Para decidir.** Preguntar a un equipo real qué le obliga a seguir en su gestor actual y si podría dejarlo. Según la respuesta, marcarlo como [SUPUESTO] crítico o como riesgo #3.

### PA-2. La hipótesis principal no se valida dentro del MVP

- **Argumento.** El primer usuario es ficticio, así que ni el riesgo #1 ni las métricas M-1 a M-5 se pueden comprobar. El MVP puede cumplir su criterio de terminado sin haber aprendido nada sobre lo que más importa.
- **Para decidir.**
  - ¿Hay un equipo real disponible? Puede ser el nuestro.
  - ¿Durante cuánto tiempo lo usaría?
  - ¿El MVP se da por cerrado sin esa validación o no?

### PA-3. Espacio único con registro abierto

- **Argumento.** Cualquiera que se registre entra en el espacio. Ve y edita todas las tareas y, con RF-8, ve el email de todo el equipo. Vale para una demo, pero no para un uso real.
- **Para decidir.** Dónde se va a desplegar el producto. Si va a haber uso real, elegir un control de acceso mínimo, como invitaciones o una lista de emails permitidos, y decidir si entra en E1.

### PA-4. Caso síncrono frente a caso asíncrono

- **Argumento.**
  - E3 actualiza la lista en 10 segundos, y eso sirve a quien la tiene abierta mientras otros la cambian.
  - Pero con 3 husos horarios el uso mayoritario será otro: "llego por la mañana y veo qué ha cambiado" (JTBD-4).
  - Ese caso solo queda cubierto por el estado actual, porque "qué se ha movido desde mi última visita" está fuera de alcance.
  - Puede que estemos invirtiendo en el caso equivocado.
- **Para decidir.**
  - Observar cuándo consulta la lista el equipo: ¿mientras trabaja o al empezar el día?
  - Comparar en la spec el coste de E3 con el de "qué ha cambiado".

### PA-5. Detectar el solapamiento con títulos libres

- **Argumento.** El episodio de referencia fue un choque a nivel de módulo. Sin descripción, etiquetas ni búsqueda, dos tareas con títulos distintos sobre la misma zona no se ven como un choque, aunque las dos estén creadas.
- **Para decidir.** Comprobar con el episodio real si los títulos habrían delatado el choque. Si no, decidir qué dato mínimo haría falta.

### PA-6. El coste de E3

- **Argumento.** RF-18, RF-19 y el supuesto sobre cambios simultáneos traen consigo actualización automática, que el filtro se mantenga y pruebas que dependen del tiempo. Es la parte más cara del MVP para la necesidad más débil. Está ligado a PA-4.
- **Para decidir.** Estimar E3 en la spec y compararlo con lo que aporta.

### PA-7. Pruebas de interfaz: trabajo que no se ve

- **Argumento.** RNF-9 exige pruebas automáticas para requisitos que se ven en pantalla, y hoy solo hay pruebas en el servidor. Montar esas pruebas es trabajo propio que el plan no refleja.
- **Para decidir.** En la spec, estimarlo y decidir si va dentro de E2 y E3 o como tarea aparte.

### PA-8. Cómo se calcula "hoy" para las tareas vencidas (RF-15)

- **Argumento.** Calcular "hoy" con el huso horario de quien mira la lista añade complejidad, y con 3 husos la misma tarea se ve de forma distinta según la persona. La fecha de vencimiento sigue dentro del alcance, en E2. Lo que está abierto es la regla.
- **Para decidir.** Elegir con el equipo qué huso manda: el de quien mira, uno común del equipo o el de quien creó la tarea.

### PA-9. Uso en móvil (RNF-6)

- **Argumento.** "Tiene que poder usarse" no tiene límite claro y nadie lo va a verificar.
- **Para decidir.** Qué acciones mínimas tienen que funcionar en móvil y cómo se comprueba.

### PA-10. Criterio objetivo en RF-1 y RF-10

- **Argumento.** "Lo bastante larga para ser segura" (RF-1) y "se reconocen a simple vista" (RF-10) no tienen un criterio que se pueda comprobar. Se puede resolver durante la construcción.
- **Para decidir.** Fijar la longitud mínima de la contraseña como regla de producto y definir qué se observa para dar RF-10 por cumplido. Se puede cerrar en la spec.

### PA-11. Términos sin definir en los RNF

- **Argumento.** Faltan definiciones para "conexión normal" (RNF-1), "condiciones normales" (RNF-3), "unos cientos de tareas" y "funcionar bien" (RNF-4), y "nadie puede ver la contraseña" (RNF-7). Se puede resolver durante la construcción.
- **Para decidir.** Fijar en la spec las condiciones de prueba de cada uno.

### PA-12. RF-20 se solapa con RF-18

- **Argumento.** RF-20 repite en buena parte lo que ya dice RF-18, y "volver a la lista después de dejarla abierta" no tiene un criterio claro para saber si se cumple. Se puede resolver durante la construcción.
- **Para decidir.** Fusionarlos o darle a RF-20 un criterio propio en la spec.

### PA-13. Métodos de medición que chocan con la propuesta de valor

- **Argumento.**
  - M-2 pregunta a diario a cada responsable: es una interrupción, justo lo que el producto quiere evitar.
  - M-4 cuenta mensajes del chat del equipo, lo que exige leer su conversación. Choca con el espíritu de RNF-8 ("nada de vigilancia").
- **Para decidir.** Si estos métodos se aceptan durante una prueba acotada y con el consentimiento del equipo, o si se buscan otros.

### PA-14. Muestras demasiado pequeñas y umbrales sin base

- **Argumento.**
  - M-1 es binaria, con un equipo y una semana.
  - M-5 da 0 duplicados en una semana, que es lo esperable por puro azar.
  - Los umbrales de M-2 y M-4 son [SUPUESTO] sin ningún dato detrás.
- **Para decidir.** Cuántos equipos y cuánto tiempo, y qué resultado contaría como evidencia antes de empezar la prueba.
