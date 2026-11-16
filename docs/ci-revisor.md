# Revisor de código en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza
[Claude Code GitHub Actions](https://github.com/anthropics/claude-code-action) sobre cada PR
(al abrirlo, en cada push, al reabrirlo y al pasar de borrador a listo). El revisor:

- lee `REVIEW.md` si existe, además de `CLAUDE.md`, el diff y los ficheros que toca el cambio;
- publica cada hallazgo como comentario en línea sobre el diff y cierra con un comentario de resumen
  en el PR;
- no puede editar, commitear ni ejecutar nada salvo `gh pr view`, `gh pr diff` y `gh pr comment`
  (`--allowedTools`).

Tiene un tope de **40 turnos** (`--max-turns 40`) y de **10 minutos** (`timeout-minutes: 10`). Un push
nuevo al PR cancela la revisión que estuviera en curso.

## Pasos manuales pendientes

El fichero del workflow no basta. Hasta que estén hechos estos pasos, el job falla o, peor, sale en
verde sin revisar nada.

1. **Instalar la GitHub App de Claude** en el repositorio: <https://github.com/apps/claude>. El job
   pide `id-token: write` para cambiar su token OIDC por el de esa App, y es la App la que publica
   los comentarios, así que salen firmados por `claude[bot]`.
2. **Crear la credencial y guardarla como secreto** del repositorio (*Settings → Secrets and
   variables → Actions → New repository secret*). Hay dos caminos; ver
   [Credencial](#credencial).
3. **Llevar el workflow a la rama por defecto** (`main`). La acción comprueba que el workflow del PR
   es idéntico al de la rama por defecto. Si no lo es, se salta con «Workflow validation failed» y
   el job **sale en verde sin haber revisado nada**. En este repo los PRs van a `s5/start`, no a
   `main`, así que hace falta un PR aparte que lleve este fichero a `main`. Cada vez que el workflow
   cambie, `main` tiene que recibir el mismo cambio. Un PR que modifique el workflow no se revisa a
   sí mismo.
4. **Escribir `REVIEW.md`** en la raíz: qué cuenta como hallazgo, con qué severidad y qué no hay que
   comentar. Hoy no existe. El revisor funciona sin él, pero sin calibración tiende a comentar estilo
   y cosas que ya cubren el lint o el typecheck.
5. **Comprobar el primer PR a mano.** Un job verde no demuestra nada (ver el paso 3). Lo que lo
   demuestra son los comentarios de `claude[bot]` en el PR.

## Credencial

La acción acepta dos credenciales, cada una por **su propia entrada** y con **su propio secreto**.
El workflow viene preparado para la primera.

### 1. Suscripción Pro o Max: token de `claude setup-token`

- Se genera en local con `claude setup-token`, con la sesión de la cuenta de la suscripción.
- Se guarda en el secreto **`CLAUDE_CODE_OAUTH_TOKEN`**.
- La acción lo recibe por la entrada **`claude_code_oauth_token`**:

  ```yaml
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  ```

- El uso del revisor descuenta de los límites de uso de esa suscripción, los mismos que gasta su
  dueño trabajando con Claude Code. No se factura por token.

### 2. Clave de API de la consola

- Se crea en la [Claude Console](https://console.anthropic.com/), en *API Keys*.
- Se guarda en el secreto **`ANTHROPIC_API_KEY`**.
- La acción la recibe por la entrada **`anthropic_api_key`**. Para usarla, se sustituye la línea de
  `claude_code_oauth_token` del workflow por esta:

  ```yaml
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
  ```

- Cada revisión se factura por tokens a la organización de la consola.

### No son intercambiables

Un token de suscripción no es una clave de API, ni al revés. Si se cruzan (el token de
`setup-token` en `anthropic_api_key`, o la clave de la consola en `claude_code_oauth_token`), el job
arranca normal y **falla en la primera llamada al modelo** con un error de autenticación que no dice
que el problema es la entrada equivocada. Si el revisor falla nada más empezar, lo primero es
comprobar que el nombre de la entrada, el nombre del secreto y el tipo de credencial coinciden.

## En qué se va el dinero

Casi todo el coste está en las llamadas al modelo. Los minutos de runner de GitHub son lo de menos.

- **Modelo:** `--model sonnet --effort medium` en `claude_args`. `sonnet` es un alias que apunta a
  la versión vigente de Sonnet, así que el modelo concreto cambia cuando Anthropic publica una nueva
  sin que este fichero se entere.
- **Por qué Sonnet:**
  - Revisar un diff es leer código y razonar sobre él. Sonnet lo hace bien y cuesta bastante menos
    por token que Opus.
  - Haiku es todavía más barato, pero pierde los fallos que no están en la superficie del diff,
    que son justo los que justifican pagar un revisor.
  - `--effort medium` limita cuánto piensa por turno. `high` encuentra algo más en cambios
    difíciles a cambio de más tokens.
- **Qué acota el gasto por PR:** el tope de 40 turnos, el de 10 minutos y la cancelación cuando
  llega un push nuevo. Lo que más lo dispara es un diff grande, o un `REVIEW.md` y un `CLAUDE.md`
  largos, porque los lee en cada revisión.
- **Cómo cambiarlo:** se edita `--model` en `claude_args` del workflow. Admite un alias (`haiku`,
  `sonnet`, `opus`) o un identificador completo para fijar una versión exacta, que es lo prudente
  si se quiere que el coste no cambie solo; ver la
  [lista de modelos](https://docs.claude.com/en/docs/about-claude/models/overview). El esfuerzo se
  cambia en `--effort` (`low`, `medium`, `high`). Acuérdate del paso 3: el cambio tiene que llegar
  también a `main`.
- **Precios:** no se citan aquí porque cambian.
  - Con clave de API: [precios de la API](https://docs.claude.com/en/docs/about-claude/pricing).
  - Con suscripción: [planes de Claude](https://claude.com/pricing).

## PRs desde un fork en un repositorio público

GitHub **no pasa los secretos** a los workflows disparados por `pull_request` desde un fork, y limita
el `GITHUB_TOKEN` a solo lectura. Sin la credencial, la acción no puede llamar al modelo ni publicar
comentarios. Por eso el job tiene una condición que lo **salta** cuando la rama del PR viene de otro
repositorio. Así el PR no muestra un rojo que no dice nada, y no se gasta nada.

Consecuencias:

- **Los PRs de contribuidores externos no se revisan automáticamente.** Los revisa una persona con
  acceso, o se trae la rama al repositorio y se abre el PR desde ahí.
- **No hay que «arreglarlo» cambiando el disparador a `pull_request_target`.** Ese evento sí tiene
  secretos porque corre con la configuración de la rama base, pero eso daría la credencial y un
  token con escritura a un job que lee código que controla un desconocido. El código de un PR puede
  incluir instrucciones dirigidas al propio revisor.
- Con la configuración por defecto, GitHub pide además aprobación manual antes de ejecutar
  workflows de quien contribuye por primera vez.
