# Revisor de código en CI (Claude)

El job `.github/workflows/claude-review.yml` lanza un revisor de Claude sobre cada PR (al abrirlo,
con cada push, al reabrirlo y al pasar de borrador a listo) usando la acción oficial
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action). Los hallazgos se
publican **en el PR**: un comentario en línea por hallazgo sobre la línea afectada y un comentario de
resumen al final. El registro de la ejecución no es el sitio donde mirar.

El revisor puede leer el repositorio (`Read`, `Grep`, `Glob`) y solo puede ejecutar tres comandos:
`gh pr view`, `gh pr diff` y `gh pr comment`. No puede editar, commitear ni ejecutar nada más. Se le
pide además que no redirija salida a ficheros: cada intento de escribir uno es una herramienta
denegada y un turno perdido.

## Pasos manuales pendientes

Hasta que no se hagan, el job no revisa nada.

1. **Guardar la credencial como secreto del repositorio** (*Settings → Secrets and variables →
   Actions → New repository secret*). Ver [Credencial](#credencial): el nombre del secreto depende del
   camino, y el workflow viene preparado para el de suscripción.
2. **Instalar la GitHub App de Claude** en el repositorio: <https://github.com/apps/claude>, o
   `/install-github-app` desde Claude Code, que además guía el paso 1. El job pide `id-token: write`
   para que la acción cambie el token OIDC de la ejecución por un token de esa App; sin la App
   instalada, falla al arrancar. Los comentarios salen firmados por `claude[bot]`.
3. **Llevar el workflow a la rama por defecto** (`main`). La acción comprueba que
   `.github/workflows/claude-review.yml` en la rama por defecto es idéntico al del PR; si no lo es, se
   salta con «Workflow validation failed» y el job **sale en verde sin haber revisado nada**. Por eso
   el PR que introduce (o cambia) este workflow no se revisa a sí mismo: hay que fusionarlo primero.
4. **Comprobar en un PR real** que aparecen comentarios de `claude[bot]`. Un check verde no basta:
   también es verde cuando se salta por el motivo del paso 3.
5. *(Opcional)* **Crear `REVIEW.md` en la raíz** con la calibración del revisor: qué cuenta como
   hallazgo, qué severidades usar, dónde no reportar (código generado, lockfiles…). Mientras no
   exista, el revisor usa los criterios de `.claude/agents/adversarial-reviewer.md`.

## Credencial

Dos caminos. Elige **uno**: el workflow solo pasa una entrada a la acción.

### 1. Suscripción Claude Pro / Max (el que viene configurado)

- Genera el token **en local**: `claude setup-token`. Abre el navegador, inicia sesión con tu cuenta
  de suscripción e imprime un token de larga duración (empieza por `sk-ant-oat…`).
- Secreto del repositorio: **`CLAUDE_CODE_OAUTH_TOKEN`**.
- Entrada de la acción: **`claude_code_oauth_token`**.

```yaml
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

El uso cuenta contra los límites de tu plan, igual que usar Claude Code en local; no se factura por
token.

### 2. Clave de API de la consola

- Créala en <https://console.anthropic.com/settings/keys> (empieza por `sk-ant-api…`).
- Secreto del repositorio: **`ANTHROPIC_API_KEY`**.
- Entrada de la acción: **`anthropic_api_key`**. En el workflow, sustituye la línea de
  `claude_code_oauth_token` por:

```yaml
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Se factura por token consumido contra la organización de la consola.

### No los cruces

Las dos entradas no son intercambiables: la acción manda cada una a la API con un mecanismo de
autenticación distinto. Un token de `setup-token` puesto en `anthropic_api_key`, o una clave de API en
`claude_code_oauth_token`, pasa la validación de entrada y **falla en la primera llamada al modelo**
con un error de autenticación que no dice que el problema es el tipo de credencial. Si el job falla
así, lo primero es comprobar que el prefijo del secreto (`sk-ant-oat…` / `sk-ant-api…`) casa con la
entrada que lo recibe.

Tampoco basta con renombrar el secreto: el nombre del secreto y la entrada de la acción tienen que
cambiar juntos.

## En qué se va el dinero

Lo único que cuesta es el modelo. El runner de GitHub (`ubuntu-latest`) es gratis en repositorios
públicos y consume minutos de Actions en los privados.

- **Modelo**: `--model sonnet --effort medium` en `claude_args`. `sonnet` es un alias que resuelve
  al Sonnet más reciente.
- **Por qué ese**: una revisión es leer un diff y los ficheros de alrededor y razonar sobre ellos.
  Sonnet lo hace bien a una fracción del precio de Opus, y Haiku se queda corto para encontrar fallos
  que no están a la vista. El esfuerzo `medium` recorta el razonamiento interno, que es salida
  facturada.
- **Topes**: `--max-turns 40` limita las vueltas del agente (cada lectura, búsqueda o comando es un
  turno, y cada turno reenvía el contexto acumulado) y `timeout-minutes: 10` mata el job si se
  alarga. Con suscripción, los topes protegen tus límites de uso; con clave de API, tu factura.
- **Precio**: no se apunta aquí porque cambia. Consulta la página oficial:
  <https://docs.claude.com/en/docs/about-claude/pricing> (API) o <https://claude.com/pricing>
  (planes de suscripción).
- **Cómo cambiarlo**: edita `--model` en `claude_args` del workflow. Admite alias (`opus`, `sonnet`,
  `haiku`) o un ID fijo (`claude-sonnet-5-5`) si no quieres que cambie solo al salir un modelo nuevo.
  `--effort` admite niveles como `low`, `medium` o `high`. Recuerda el paso 3: el cambio no tiene efecto hasta que
  llega a `main`.

## PRs desde un fork en un repositorio público

GitHub **no pasa los secretos** a los workflows disparados por `pull_request` desde un fork, y el
`GITHUB_TOKEN` les llega de solo lectura. Sin credencial la acción no puede llamar al modelo ni
comentar, así que el job tiene una condición (`head.repo.full_name == github.repository`) que lo
**salta** en esos PRs en vez de dejar un rojo sin explicación. Un PR desde fork aparece con el check
«skipped»: nadie lo ha revisado.

No lo arregles cambiando el disparador a `pull_request_target`: ese evento sí recibe secretos y
permisos de escritura, y combinado con hacer checkout del código del PR deja que un desconocido ejecute
lo que quiera con tu credencial. Para revisar un PR externo, la opción segura es que alguien con
permisos lo traiga a una rama del propio repositorio, o revisarlo en local.
