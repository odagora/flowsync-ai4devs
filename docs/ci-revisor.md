# Revisor de Claude en CI

[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml) lanza
[`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) en cada PR
(al abrirlo, en cada push, al reabrirlo y al pasar de borrador a listo). El revisor lee el diff,
abre los archivos con Read, Grep y Glob y publica los hallazgos **como comentarios en el PR**: uno
en línea por hallazgo y un resumen general al final. No modifica archivos ni hace commits.

Límites fijos: `--max-turns 40`, `timeout-minutes: 10`, y un push nuevo cancela la revisión que
siguiera en marcha sobre el anterior.

## Pasos manuales pendientes

Sin estos pasos el workflow existe pero no revisa nada.

1. **Instalar la GitHub App de Claude** en el repositorio: <https://github.com/apps/claude>. La
   acción pide su token por OIDC (por eso el job tiene `id-token: write`), y los comentarios salen
   firmados por `claude[bot]`. Desde una sesión local de Claude Code, `/install-github-app` hace
   este paso y el siguiente de forma guiada.
2. **Crear el secreto con la credencial** en *Settings → Secrets and variables → Actions*. Ver
   [Credencial](#credencial): el nombre del secreto depende del camino elegido.
3. **Llevar el workflow a la rama por defecto del repositorio** (`main` del fork). La acción
   comprueba que `.github/workflows/claude-review.yml` del PR es idéntico al de la rama por
   defecto; si no lo es, se salta con «Workflow validation failed» y el job **sale en verde sin
   haber revisado nada**. Consecuencia: el PR que introduce o cambia este workflow no se revisa a
   sí mismo; el cambio tiene que llegar antes a `main`.
4. **Comprobar que de verdad revisa**: un check verde no basta. Abre un PR de prueba y confirma que
   aparecen comentarios de `claude[bot]`.

La calibración del revisor vive en [`REVIEW.md`](../REVIEW.md), en la raíz: qué es grave, el tope
de sugerencias, dónde no reportar y qué evidencia exigir. El prompt la lee lo primero. Para ajustar
el criterio del revisor se edita ese archivo, no el workflow, y conviene que siga cabiendo en una
pantalla.

## Credencial

Hay dos caminos y **no son intercambiables**: cada uno va a una entrada distinta de la acción y se
guarda con un nombre de secreto distinto. Cruzarlos (un token de suscripción en
`anthropic_api_key`, o una clave de la consola en `claude_code_oauth_token`) falla en la primera
llamada al modelo con un error de autenticación que no dice que el problema es la entrada
equivocada.

### 1. Suscripción (Pro / Max): `claude setup-token`

- Se genera en local, con la sesión de tu cuenta abierta: `claude setup-token`. Imprime un token de
  larga duración.
- Secreto: **`CLAUDE_CODE_OAUTH_TOKEN`**.
- Entrada de la acción: **`claude_code_oauth_token`**. Es la que usa el workflow tal como está.
- El uso consume los límites de tu plan, no se factura por token.

### 2. Clave de API de la consola

- Se crea en la consola de Anthropic: <https://platform.claude.com/settings/keys>.
- Secreto: **`ANTHROPIC_API_KEY`**.
- Entrada de la acción: **`anthropic_api_key`**. Para pasarte a este camino, en el workflow
  sustituye la línea `claude_code_oauth_token: ...` por la que está comentada justo encima
  (`anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}`). Cambia las dos cosas a la vez.
- Se factura por token a la organización de la consola.

## En qué se va el dinero

Casi todo el coste son tokens del modelo: el diff, los archivos que abre y cada turno de
razonamiento. Los minutos del runner de GitHub son residuales en comparación.

- **Modelo**: `--model sonnet`, un alias que resuelve a la versión vigente de Sonnet, con
  `--effort medium`.
- **Por qué ese**: revisar un PR es leer y contrastar, no diseñar. Sonnet da una revisión
  útil a una fracción del precio de Opus, y `medium` evita que gaste razonamiento extra en cada
  archivo. El techo lo ponen `--max-turns 40` (cada turno vuelve a enviar el contexto acumulado, así
  que los turnos son el multiplicador real) y los 10 minutos.
- **Precio**: no se cita aquí porque cambia. Consulta la página oficial:
  - Clave de API (por token): <https://platform.claude.com/docs/en/about-claude/pricing>
  - Planes de suscripción: <https://claude.com/pricing>
- **Cómo cambiarlo**: en `claude_args` del workflow. Otro modelo: `--model opus` (más caro y más
  profundo) o `--model haiku` (más barato y más superficial), o un ID completo como
  `--model claude-sonnet-5-5` para fijar la versión. El esfuerzo: `--effort low|medium|high`. El
  techo de turnos: `--max-turns`. Recuerda el paso 3: el cambio solo surte efecto cuando el
  workflow modificado está en `main`.

## PRs desde un fork en un repositorio público

GitHub no pasa secretos ni token OIDC a los workflows lanzados por `pull_request` desde un fork, y el
`GITHUB_TOKEN` es de solo lectura. El revisor no podría autenticarse ni comentar, así que el job
lleva una condición (`head.repo.full_name == github.repository`) y **se salta** en esos PRs. Esos PRs
no reciben revisión automática.

No lo «arregles» cambiando a `pull_request_target`: ese evento sí da secretos y permisos de
escritura, pero ejecutaría un agente con tu credencial sobre código que controla un desconocido, y
el contenido del PR podría inducirle a filtrar el secreto o a abusar del token. Si hace falta
revisar PRs de fork, lánzalo a mano desde una rama propia tras leer el cambio.
