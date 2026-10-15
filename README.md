# CosaSeria

Sitio estático en **Cloudflare Workers con Static Assets**. Se publica únicamente
`public/`; la raíz, `src/`, `tests/` y `docs/` no son activos del sitio.
El Worker atiende `/api/contacto` y el resto se sirve como HTML estático.
No hay framework ni dependencias de terceros en el código de producción.
Las herramientas de desarrollo están fijadas en `package-lock.json`.

## Fuentes

- `public/`: páginas, estilos, scripts, fuentes y medios publicados.
- `templates/nav-principal.html` y `nav-pie.html`: navegación común;
  `scripts/generar-comunes.py` la propaga a todas las páginas. El juego conserva
  sus enlaces de secciones y añade soporte de apps al pie.
- `templates/stone-vs-silicon.html`: fuente bilingüe única del juego.
- `scripts/generar-juego.py`: genera `/StoneVsSilicon/` (español) y
  `/StoneVsSilicon/en/` (inglés). No editar directamente esas dos salidas.
- `contenido/bitacora/*.md`: fuente de la bitácora, un archivo por entrada con
  frontmatter (`titulo`, `slug`, `orden`, `resumen`; opcionales `fecha`, `serie`,
  `parte`). `orden` 1 es la más reciente. Markdown mínimo: párrafos, listas,
  citas, negritas y enlaces.
- `templates/bitacora-entrada.html`, `bitacora-indice.html` y
  `scripts/generar-bitacora.py`: generan `/bitacora/`. No editar sus salidas.
  `scripts/comunes.py` aplica la navegación común a estas páginas y al resto.
- `scripts/paginas.mjs`, `sitemap.mjs`, `verificar.mjs`: inventario, sitemap y
  checks de enlaces, metadata, schema, idiomas, sello compartido y límites.
- `src/contacto.js`: contrato HTTP, validación y protección del formulario.
- `src/registro-contacto.js`: cuota y deduplicación en Durable Objects SQLite.
- `wrangler.jsonc`: bindings, migración, activos y observabilidad.
- `tests/`: pruebas unitarias, runtime y navegador; no envían correo real.

## Desarrollo y verificación

Requiere Node 24+, Python 3 y Chrome instalado para `test:browser`.

```sh
npm ci --ignore-scripts
npm run generate
npm run check
npm test
npm run test:runtime
npm run test:browser
WRANGLER_SEND_METRICS=false npm run build:check
node tests/server.cjs
```

`test:runtime` ejecuta workerd y SQLite reales, con el transporte de correo
sustituido. Usa la misma versión de Miniflare que Wrangler y su adaptador
`convertV4MiniflareOptions`. `test:browser` levanta un servidor efímero local;
intercepta la API para probar fallos sin tocar producción. Sus capturas y JSON
van a `/tmp/cosaseria-fixes` (configurable con `CS_EVIDENCE`). El servidor estático
solo previsualiza; no implementa la API. El dry-run **no despliega** ni crea bindings.

Para agregar páginas, usar canonical absoluto, metadata propia, un H1 y JSON-LD
con breadcrumb consistente. Ejecutar `npm run generate` y `npm run check`.
El chequeo común falla si divergen copias del sello o límites cliente/servidor.
Para modificar el sello se actualizan todas las copias y la plantilla del juego.

## Contrato de contacto

Campos admitidos: nombre (120), empresa opcional (160), email (200), problema
(8000), token, envio_id y empresa_adicional (honeypot). Longitudes en unidades
UTF-16, como `maxlength`; los saltos CRLF del transporte se normalizan a LF como
el valor del textarea. No se recorta el mensaje. Solo form-urlencoded o
multipart de texto; se rechazan archivos, repetidos y nombres desconocidos.
Límite de cuerpo **128 KiB**, también contando el stream sin Content-Length.

`GET /api/contacto` entrega `{token, expiresAt}`; el token dura 2 horas. Es una
señal de frescura, **no prueba de humanidad ni autenticación**. El origen se
valida, pero un cliente no navegador puede falsificarlo. El formulario nativo
no requiere token: su primer POST presenta una confirmación con ID, sin enviar
correo. El POST confirmado ya tiene un ID estable para los reintentos.

Con `Accept: application/json`, POST responde `{ok, codigo, mensaje, campos?}`.
Solo **HTTP 200 + ok:true + codigo:ENVIADO** confirma aceptación por el proveedor,
no entrega al buzón. `202 PROCESANDO` y `502 INCIERTO` no son éxito. Los errores
400/403/413/415/422/429/503 preservan el texto en el cliente; la respuesta HTML
lo devuelve escapado cuando ya pudo validarse el cuerpo. El cliente impone un
timeout de 15 segundos, conserva el ID y solo reintenta automáticamente el
rechazo explícito por token vencido. El resto requiere una acción del usuario.

## Garantías y operación

- `RAFAGA`: 2 peticiones por 60 segundos, aproximado y por ubicación de
  Cloudflare. No se presenta como cuota global estricta.
- `CONTACTO`: 5 IDs diferentes por IP y hora UTC, coordinados por transacciones
  de un Durable Object. Repetir un ID aceptado no consume otro cupo. La clave
  usa HMAC de IP + hora; no se almacena IP original. Redes NAT comparten cuota;
  varias IP pueden eludirla. Requiere mantener el secreto estable en la ventana.
- Cada ID de envío reserva su huella de contenido **antes** de invocar EMAIL.
  Reintentar el mismo ID y texto consulta el estado; cambiar texto produce 409.
  Una reserva sobrevive al fallo de persistencia del recibo. Se rechazan IDs
  mayores de 24 horas o demasiado futuros. Se programa eliminación a las
  24 horas del ID + un minuto; cuotas a los 61 minutos de su primera escritura.
- Garantía: como máximo una invocación de EMAIL por ID válido. **No exactamente
  una entrega**: una caída entre reserva y envío puede dejar el mensaje sin
  enviar; no se recupera repitiendo el efecto a ciegas. Un estado pendiente o
  incierto requiere conciliación por referencia con el proveedor/buzón. Nunca
  borrar reservas para forzar un reenvío sin verificar primero.
- Los datos de los formularios permanecen en la página, no en localStorage.
  Cerrar o recargar esa página puede perder el borrador. No cambiar el ID de
  un intento ambiguo para eludir la deduplicación.
- Registros de aplicación: códigos + referencia, sin mensajes/correos/IP en
  claro. Los logs de plataforma son otra capa. Revisar en la cuenta su acceso,
  retención, alertas y las copias de recuperación de Durable Objects.
- El buzón mantiene conversaciones; no tiene un borrado automático a las 24h.
  Atender manualmente solicitudes de acceso/eliminación y revisar retención.
  El aviso público diferencia este contenido, analítica y registros técnicos.

## Configuración para un despliegue posterior

No desplegar sin verificar la cuenta y destinatario. Secretos requeridos:
`FIRMA_SECRETO`, `CORREO_DESTINO`; variable `CORREO_ORIGEN`. Bindings obligatorios:
`EMAIL`, `RAFAGA`, `CONTACTO`, `ASSETS`. La ausencia de cualquiera necesario para
contacto produce 503 controlado; no activa un modo sin límites.

La migración `contacto-v1` crea la clase SQLite `RegistroContacto`. No eliminar
ni reutilizar ese tag en releases posteriores. Verificar disponibilidad de
Durable Objects en la cuenta, dominio/remitente y destinatario de Email Service.
El antiguo namespace KV LIMITES deja de usarse, pero este cambio **no borra** el
recurso remoto ni sus registros anteriores. Revisar su expiración antes de
retirarlo. Configurar protección del WAF según tráfico; no es requisito oculto
para la cuota de aplicación y no está provisionada por este repositorio.

Tras desplegar, comprobar token, envío autorizado a un buzón de prueba,
reintento del mismo ID, límite y fallos de configuración en staging. No probar
límites ni envíos masivos contra producción. Confirmar métricas/alertas de 5xx,
429 y estados inciertos; observabilidad habilitada no implica alertas creadas.

## Caché y seguridad

CSP está **aplicada**, no Report-Only. `_headers` cubre activos y `worker.js`
cubre todas las respuestas de la API, incluidas redirecciones, con `no-store`.
`style-src 'unsafe-inline'` sigue necesario por los estilos existentes.

CSS, JS y medios mutables revalidan con `max-age=0, must-revalidate`. Las
referencias CSS/JS incluyen `?v=20261014` para salir de la caché anterior de siete
días. Para invalidar un recurso antiguo aún fresco, cambiar también su URL.
Las fuentes mantienen `immutable`: nunca sobrescribir esos nombres; nuevas
versiones requieren nombres nuevos y actualizar `@font-face`/preloads.
Los logos optimizados tienen nombres propios y fallback WebP; no se sobrescribió
el original. Los HTML del juego tienen canonical y hreflang recíprocos.

## Fuentes operativas

- [Cloudflare Email Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/): `EmailMessageBuilder`, `messageId` y errores.
- [Durable Objects SQLite](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/): transacciones, alarmas y recuperación.
- [Rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): límite aproximado por ubicación.
- [Web Analytics](https://developers.cloudflare.com/web-analytics/about/): alcance de la analítica del proveedor.
