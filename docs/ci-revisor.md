# Revisor de Claude en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza un revisor de
código sobre cada PR con la acción oficial
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action). Se ejecuta al
abrir el PR, en cada push nuevo, al reabrirlo y al sacarlo de borrador. Los hallazgos llegan como
comentarios en el PR: uno en línea por hallazgo, sobre la línea afectada, y un resumen al final.

El workflow está commiteado, pero **no revisa nada hasta que se completen los pasos de abajo**.

## Pasos manuales pendientes

Todos se hacen en el repositorio donde corre Actions. Hoy ese repositorio es el fork
`odagora/flowsync-ai4devs`: la organización de `origin` está marcada por GitHub y ahí Actions no se
ejecuta.

1. **Instalar la GitHub App de Claude** en ese repositorio: <https://github.com/apps/claude>. El job
   pide `id-token: write` porque la acción cambia el token OIDC del job por un token de esa app. Con él
   comenta como `claude[bot]`. Sin la app instalada, el intercambio falla. *No verificado desde aquí:
   la API no deja comprobarlo sin un token de la propia app.*

   Ojo con el alcance: el bloque `permissions` del workflow solo limita el `GITHUB_TOKEN` del job.
   La acción lo sustituye por el token de la app, que por defecto pide `contents`, `pull_requests` e
   `issues` en escritura (`src/github/token.ts`, v1.0.250). Lo que de verdad acota lo que puede hacer
   el revisor es `--allowedTools`, no `permissions`.
2. **Crear el secreto de la credencial** en *Settings → Secrets and variables → Actions → New
   repository secret*, con el nombre exacto que corresponda al camino elegido
   ([abajo](#la-credencial)). En el fork ya existe un secreto `CLAUDE_CODE_OAUTH_TOKEN`, creado el
   14-10-2026. Comprueba que contiene un token de `claude setup-token` y no una clave de API.
3. **Llevar el workflow a `main` del repositorio, sin cambios.** La acción solo revisa si
   `claude-review.yml` está en la rama por defecto con el mismo contenido que en el PR. Si no lo está,
   se salta con «Workflow validation failed» y el job sale **en verde sin haber revisado nada**. Por eso
   el PR que introduce o cambia este workflow no se revisa a sí mismo: la revisión empieza en el
   siguiente PR, una vez el workflow está en `main`.
4. **Crear `REVIEW.md` en la raíz.** Es el archivo de calibración: qué es grave aquí, cuántas
   sugerencias como mucho y dónde no reportar. El prompt manda leerlo primero. Hoy no existe en esta
   rama, y sin él el revisor aplica su propio criterio. A partir de ese momento, el criterio se ajusta
   editando ese archivo, no el workflow.
5. **Comprobar la primera ejecución de verdad.** Un check verde no basta. En el primer PR posterior a
   los pasos 1–4 tienen que aparecer comentarios de `claude[bot]`. Si el job está en verde y no hay
   comentarios, el registro de la ejecución dice por qué; el caso típico es el paso 3.

Atajo para los pasos 1 y 2: desde Claude Code, en local, `/install-github-app` instala la app y crea el
secreto en un mismo flujo.

## La credencial

La acción acepta dos credenciales distintas, cada una en **su propia entrada**. No son intercambiables.

### 1. Suscripción (Pro o Max): la que usa el workflow tal como está

- **Cómo se obtiene:** en local, con la sesión de tu suscripción iniciada, ejecuta `claude setup-token`.
  Genera un token OAuth de larga duración que empieza por `sk-ant-oat`.
- **Entrada de la acción:** `claude_code_oauth_token`.
- **Nombre del secreto:** `CLAUDE_CODE_OAUTH_TOKEN`.

```yaml
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

El uso consume los límites de tu plan y no se factura aparte. El token va ligado a tu cuenta: si lo
revocas o cambias de plan, el revisor deja de funcionar.

### 2. Clave de API de la consola

- **Cómo se obtiene:** en <https://platform.claude.com/settings/keys>. Empieza por `sk-ant-api`.
- **Entrada de la acción:** `anthropic_api_key`.
- **Nombre del secreto:** `ANTHROPIC_API_KEY`.

```yaml
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Para usar este camino, sustituye en el workflow la línea de `claude_code_oauth_token` por esta y deja
solo una de las dos. Este uso se factura por tokens a la organización de la consola.

### No las cruces

Si pones un token de `setup-token` en `anthropic_api_key`, o una clave de API en
`claude_code_oauth_token`, **falla en la primera llamada al modelo con un error de autenticación que no
dice por qué**. La acción solo comprueba que la credencial no esté vacía y la da por buena hasta que la
API la rechaza. Si el job falla así, mira el prefijo de la credencial (`sk-ant-oat` o `sk-ant-api`) y en
qué entrada está.

Un secreto con otro nombre falla de otra forma. Un secreto que no existe llega como cadena vacía, y la
acción se para antes de llamar al modelo con un mensaje explícito: *«Either ANTHROPIC_API_KEY,
CLAUDE_CODE_OAUTH_TOKEN, or workload identity federation … is required»*. Si ves ese mensaje, el
problema es el nombre del secreto, no la credencial.

## En qué se va el dinero

Todo el gasto está en las llamadas al modelo del revisor. Lo fija `claude_args` en el workflow:

```yaml
claude_args: |
  --model sonnet --effort medium
  --max-turns 40
```

- **Modelo: `sonnet`.** Es un alias que apunta a la última versión de Sonnet. Revisar un diff es leer
  código y razonar sobre él, y Sonnet lo hace bien por bastante menos que Opus. El job corre en cada
  push a cada PR, así que el coste por ejecución se multiplica rápido, y ahí es donde compensa el
  modelo económico.
- **`--effort medium`.** Acota cuánto razona el modelo antes de responder. Menos razonamiento consume
  menos tokens.
- **`--max-turns 40`.** Es el techo de idas y vueltas del agente: cada `gh pr diff`, cada Read y cada
  comentario cuenta como turno. Al llegar al tope, la revisión se corta donde esté. Read, Grep y Glob
  van en la lista explícita para que ningún intento de leer un archivo se deniegue y gaste un turno en
  balde. Los comentarios en línea se publican con `confirmed: true`, así que un corte no se lleva los
  hallazgos ya hechos.
- **Clasificador de comentarios.** Un comentario en línea sin `confirmed: true` se guarda y, al acabar
  la sesión, la acción lo clasifica (hallazgo real o prueba) antes de publicarlo. Con clave de API, eso
  es una llamada más al modelo; el prompt la evita pidiendo `confirmed: true`.
- **`timeout-minutes: 10`.** Es el techo de reloj del job. Acota los minutos de runner y, de paso, el
  gasto de un revisor atascado.
- **`concurrency`.** Un push nuevo cancela la revisión en curso del anterior.

**Cómo cambiarlo:** edita la línea de `claude_args`.

- `--model opus` hace una revisión más profunda y más cara; `--model haiku`, una más barata y más
  superficial. También acepta un identificador de modelo completo, para fijar una versión concreta en
  vez de seguir al alias.
- `--effort low` o `--effort high` cambian cuánto razona el modelo.
- Subir `--max-turns` deja llegar más lejos en PRs grandes, a cambio de más gasto por ejecución.

**Precios:** no se citan aquí porque cambian.

- Clave de API, coste por millón de tokens según el modelo:
  <https://platform.claude.com/docs/en/about-claude/pricing>
- Suscripción, planes y sus límites de uso: <https://claude.com/pricing>

## PRs desde un fork en un repositorio público

El repositorio donde corre hoy es público. Para un PR abierto desde un fork de ese repositorio:

- GitHub no pasa los secretos del repositorio a un workflow `pull_request` disparado desde un fork.
  Además, le da un `GITHUB_TOKEN` de solo lectura y no le deja pedir el token OIDC.
- Si quien contribuye lo hace por primera vez, su primera ejecución espera a que un mantenedor la
  apruebe.
- La acción rechaza, por su cuenta, a autores sin permiso de escritura en el repositorio.

En ese caso, el revisor no podría ni autenticarse ni comentar. Por eso el job lleva esta condición, y
un PR desde un fork **se salta**: el check sale como *skipped*, no en rojo.

```yaml
if: github.event.pull_request.head.repo.full_name == github.repository
```

Los PRs que abren bots (como Dependabot) también se saltan. No reciben los secretos, y además la
comprobación de permisos de la acción deja pasar siempre a los actores `[bot]`, así que el filtro
tiene que estar en el `if` del workflow. Los borradores se revisan al marcarlos como listos.

**Lo que no hay que hacer para cubrir los forks es pasar a `pull_request_target`.** Ese evento sí da
acceso a los secretos, pero junto con código y texto que escribe un tercero, y basta un prompt
injection en el PR para que el revisor actúe con tu credencial. Para revisar un PR externo, que un
mantenedor suba la rama al repositorio y abra el PR desde ahí, o que lo revise en local.

## Riesgo que queda: prompt injection desde el propio PR

Excluir los forks acota el riesgo a quien ya tiene escritura en el repositorio, pero no lo elimina. El
revisor lee lo que escribe el autor del PR (diff, título, descripción, comentarios en el código), y con
ese contenido se le puede intentar dar órdenes. `--allowedTools` le quita Bash general y la escritura
de ficheros, pero no es una contención completa:

- **Fuga de la credencial por un comentario.** `Read` no está restringido a una ruta, así que puede
  leer ficheros del runner fuera del checkout, y el proceso del revisor tiene la credencial en su
  entorno. `Bash(gh pr comment:*)` admite cualquier argumento, incluido `--body-file`. Además, los
  comentarios que pasan por `gh pr comment` no se sanean ni se les tachan secretos, a diferencia de
  los que van por el MCP de comentarios en línea. Un prompt injection en el PR podría encadenar las dos
  cosas y publicar la credencial en un comentario. Si eso no es aceptable, hay dos salidas: quitar el
  resumen por `gh pr comment` (por ejemplo, pasando a `track_progress: true` y a la herramienta MCP
  `mcp__github_comment__update_claude_comment`, que sí sanea), o restringir `Read` a rutas del
  checkout.
- **La calibración la controla el PR.** La acción restaura `CLAUDE.md`, `CLAUDE.local.md` y `.claude/`
  desde la rama base antes de ejecutar (`src/github/operations/restore-config.ts`, v1.0.250). Por eso
  el revisor lee el `CLAUDE.md` de la base, no el del PR. `REVIEW.md` no está en esa lista: se lee de
  la versión del PR, así que un PR puede cambiar la calibración con la que se revisa a sí mismo.

No amplíes las herramientas permitidas sin tener esto en cuenta.
