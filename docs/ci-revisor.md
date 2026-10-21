# Revisor de código con Claude en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza
[`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) sobre cada pull
request que no sea borrador y que no venga de un fork. El revisor publica los hallazgos como
comentarios en línea sobre el diff y deja un comentario general con el resumen. Solo lee el
repositorio: no hace commits ni cambia nada.

## Pasos manuales pendientes

Sin estos pasos el workflow existe, pero no revisa nada.

1. **Instalar la GitHub App de Claude** en el repositorio donde corre el workflow (hoy, el fork
   `odagora/flowsync-ai4devs`). Hace falta ser administrador: <https://github.com/apps/claude>. La
   acción canjea el token OIDC del job (`id-token: write`) por un token de esa App, y con ese token
   publica los comentarios. También se puede hacer desde Claude Code con `/install-github-app`.
2. **Guardar la credencial como secreto del repositorio** en *Settings → Secrets and variables →
   Actions*. Hay dos caminos; ver [la sección de la credencial](#la-credencial-dos-caminos-no-intercambiables).
3. **Llevar el workflow a la rama por defecto (`main`) del fork, sin cambios.** La acción comprueba
   que el fichero del workflow que se ejecuta en el PR es idéntico al de la rama por defecto. Si no lo
   es, se salta la revisión («Workflow validation failed») y el job sale **en verde sin haber
   revisado nada**. Por eso el PR que añade este fichero no se revisa a sí mismo, y cualquier cambio
   posterior al workflow tiene que llegar a `main` por PR antes de que surta efecto. Los PRs de este
   repo apuntan a `sN/start`, así que hay que hacerlo aparte.
4. **Que [`REVIEW.md`](../REVIEW.md) llegue a la rama del PR.** Es el archivo de calibración del
   revisor: qué cuenta como grave, el tope de sugerencias, dónde no reportar y qué evidencia exigir.
   El revisor lee el de la rama revisada; si no está, revisa solo con el prompt y `CLAUDE.md`.
5. **Comprobar el primer PR a mano.** Un check verde no basta (ver el punto 3): tiene que haber
   comentarios de `claude[bot]` en el PR.

## La credencial: dos caminos, no intercambiables

Cada camino usa **una entrada distinta de la acción** y **un secreto con un nombre distinto**. El
workflow viene preparado para el primero.

### 1. Suscripción (Pro o Max): token de `claude setup-token`

- Se genera en local con `claude setup-token`, con la sesión de la cuenta de suscripción iniciada.
- Se guarda como secreto **`CLAUDE_CODE_OAUTH_TOKEN`**.
- Lo recibe la entrada **`claude_code_oauth_token`**:

  ```yaml
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  ```

- El consumo cuenta contra los límites de uso de la suscripción, no contra una factura por tokens.

### 2. Clave de API de la consola

- Se crea en <https://platform.claude.com> (*Settings → API keys*).
- Se guarda como secreto **`ANTHROPIC_API_KEY`**.
- Lo recibe la entrada **`anthropic_api_key`**. Hay que **sustituir** la línea del workflow, no
  añadirla junto a la otra:

  ```yaml
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
  ```

- Se factura por tokens a la organización de la consola.

### Si se cruzan, falla sin decir por qué

El token OAuth no es una clave de API ni a la inversa. Si se pone un token de `setup-token` en
`anthropic_api_key`, o una clave `sk-ant-api…` en `claude_code_oauth_token`, el job arranca bien y
falla **en la primera llamada al modelo** con un error de autenticación que no dice que el problema
es la entrada. Lo mismo pasa si el nombre del secreto no coincide con el que lee el workflow: GitHub
sustituye un secreto inexistente por una cadena vacía sin avisar. Ante un fallo de autenticación,
revisa primero que entrada, secreto y tipo de credencial sean los del mismo camino.

## En qué se va el dinero

El gasto está en las llamadas al modelo. El runner de GitHub Actions también consume minutos, pero en
un repositorio público son gratis.

- **Modelo: Sonnet** (`--model sonnet`), con **esfuerzo medio** (`--effort medium`). Es un modelo
  más barato que Opus y suficiente para revisar un diff y los ficheros que lo rodean. El esfuerzo
  medio limita cuánto razona antes de responder, que también se paga.
- **Topes**:
  - `--max-turns 40` corta la sesión a 40 turnos, que es lo que más acota el gasto de una revisión.
  - `timeout-minutes: 10` mata el job a los 10 minutos.
  - El grupo de `concurrency` cancela la revisión en curso cuando llega un push nuevo al mismo PR.
  - Los borradores no se revisan.
- **Herramientas de lectura** (`Read`, `Grep`, `Glob`): sin ellas el revisor no podría abrir ni
  `REVIEW.md` ni los ficheros del cambio, y cada intento denegado gasta un turno.
- **Precio**: no se cita aquí porque cambia. Consulta la página oficial,
  <https://platform.claude.com/docs/en/about-claude/pricing>, y para la suscripción,
  <https://claude.com/pricing>.

### Cambiar el modelo

Edita `claude_args` en el workflow:

```yaml
claude_args: |
  --model opus --effort high   # más profundo y más caro
  --max-turns 40
  ...
```

`--model` acepta alias (`sonnet`, `opus`, `haiku`) o un ID completo de modelo. Recuerda el paso 3: el
cambio no tiene efecto en los PRs hasta que el workflow modificado llegue a `main`.

## Pull requests desde un fork en un repositorio público

**No se revisan.** En un `pull_request` que viene de un fork, GitHub no pasa los secretos del
repositorio ni concede `id-token: write`, y el `GITHUB_TOKEN` es de solo lectura. Así que el revisor
no tendría ni credencial para el modelo ni forma de comentar. Además, la acción solo se ejecuta para
autores con permiso de escritura en el repositorio. Para no dejar un job en rojo en cada PR externo,
el workflow lo salta con la condición `head.repo.full_name == github.repository`.

La alternativa sería `pull_request_target`, que sí corre con los secretos del repositorio base.
**No se usa a propósito**: daría la credencial a una ejecución sobre código que no controlamos, y el
contenido del PR podría llevar instrucciones ocultas para el revisor. Para revisar el PR de un
colaborador externo, un mantenedor puede traer la rama al repositorio y abrir el PR desde ahí.
