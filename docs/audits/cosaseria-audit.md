# Auditoría adversarial de CosaSeria

> Seguimiento: las correcciones solicitadas después de esta auditoría están documentadas en [cosaseria-fixes.md](cosaseria-fixes.md). Los hallazgos y mediciones de este documento se conservan como evidencia histórica.

**Fecha:** 14 de octubre de 2026. **Referencia:** `293272526fb44e0dbe7ed6c3123684aa1b83584c`. **Sitio:** https://cosaseria.mx. **Alcance:** repositorio, navegación pública, pruebas locales con dobles de infraestructura, accesibilidad y mediciones de laboratorio. No se modificó código del producto, no se enviaron correos reales, no se hicieron commits ni despliegues.

Las rutas y líneas de este informe corresponden a esa revisión. Durante la auditoría aparecieron cambios ajenos a esta sesión: primero `scripts/` y `public/robots.txt`, y después README, HTML, CSS, sitemap, `llms.txt` y nuevas páginas de servicios. No se borraron ni ejecutaron los scripts concurrentes; esos cambios no se incorporaron como correcciones verificadas. La ausencia de pruebas/CI que se describe corresponde al commit de referencia, no constituye una evaluación de esos archivos nuevos. Las siete páginas de contenido consultadas y los dos recursos CSS/JS principales de producción coincidieron byte por byte con los archivos auditados. Los hashes están en [manifest.json](evidence/cosaseria-2026-10-14/manifest.json).

## 1. Resumen ejecutivo brutal

**La evidencia pública no alcanza para comprar la promesa de una firma de ingeniería premium capaz de asumir un proyecto crítico de alto valor.** Permite identificar a un fundador, leer su trayectoria declarada y abrir productos que existen. No permite comprobar que el estudio haya entregado un encargo comparable, con restricciones, equipo, resultados, aceptación y operación posterior verificables.

El problema comercial central es una sustitución de evidencia: experiencia individual en empresas conocidas ocupa el espacio donde deberían estar la capacidad contractual del estudio y sus resultados. El sitio **sí separa expresamente** ambas cosas en Trabajo; sería falso acusarlo de presentar Google o Amazon como clientes de CosaSeria. Pero esa separación honesta no llena el vacío de evidencia empresarial.

El problema técnico central no es usar HTML estático. Es prometer pruebas, operación y acabados sin dejar en el repositorio de referencia una suite, un proceso reproducible de validación ni un runbook vigente. El formulario trunca contenido sin avisar, tiene estados de token que penalizan al usuario legítimo, no anuncia sus resultados a tecnologías de asistencia y deja escapar fallos de sus dependencias antiabuso. StoneVsSilicon agrega un modal cuyo foco escapa al fondo, ARIA inválido, texto con contraste 2.08:1 y un LCP móvil de laboratorio de 5.29 s.

Además, `https://www.cosaseria.mx/` devolvió **HTTP 522 en dos consultas**, mientras el dominio canónico respondió. El aviso de privacidad omite la IP almacenada por el propio código. El artículo de microservicios usa un cobro para sostener una falsa equivalencia entre llamada local y resultado atómico: es una imprecisión especialmente cara para quien vende experiencia en pagos y sistemas distribuidos.

**No encontré un P0, una explotación de XSS, secretos reconocibles en los archivos versionados actuales ni una razón para declarar inseguro el sitio por su tecnología.** Tampoco hay evidencia para decir que el inicio sea lento: Lighthouse dio 98 de performance móvil y 100 de escritorio. Esos números no validan el formulario, los contratos comerciales ni la exactitud del artículo.

En el snapshot auditado se registran **27 hallazgos: 10 P1, 15 P2 y 2 P3**; no es un conteo de incidencias todavía abiertas después de los cambios concurrentes. Las prioridades comerciales/editoriales no son vulnerabilidades de seguridad ni puntuaciones CVSS. La decisión de compra sería **no adjudicar todavía un sistema crítico basándose en este expediente público**; primero exigir los artefactos de diligencia debida especificados abajo.

## 2. Descubrimiento: qué hay realmente

| Área | Evidencia y conclusión |
|---|---|
| Frontend | Nueve HTML independientes en `public/`, CSS compartido `public/assets/css/site.css`, JavaScript progresivo `public/assets/js/site.js`. Sin React, hidratación, bundler frontend ni dependencias npm declaradas. |
| Landing del juego | `public/StoneVsSilicon/`: CSS y JS adicionales, imágenes WebP, dos idiomas en el mismo documento, modales, tooltips, parallax y cuatro MP4. |
| Backend disponible | `src/worker.js:35–49` enruta `/api/contacto`; `src/contacto.js` implementa token HMAC, validación, rate limits y correo. No se extrapolan conclusiones a los backends de los productos enlazados. |
| Hosting | Cloudflare **Workers Static Assets**, según `wrangler.jsonc:3–14`; no la arquitectura Pages descrita en README. Solo `public/` es directorio de publicación. |
| Servicios de infraestructura | `ASSETS`, KV `LIMITES`, binding nativo `RAFAGA` de 2 solicitudes/60 s, `send_email` llamado `EMAIL`, secreto `FIRMA_SECRETO`, destino de correo y remitente. `wrangler.jsonc:23–68`. |
| Build/despliegue | El frontend no necesita build. El Worker sí admite empaquetado con Wrangler. Dry run con Wrangler 4.123.0: correcto, 9.46 KiB de Worker / 3.50 KiB gzip. No se desplegó. No hay versión de Wrangler fijada ni comando de bootstrap versionado. |
| Dependencias | No hay manifiesto ni lockfile del producto. Hay dependencias operativas reales: Cloudflare, su runtime/CLI y analítica inyectada. «Sin dependencias» describe mal la operación si se interpreta literalmente. No procede inventar un resultado de `npm audit` para un árbol inexistente. |
| Testing/CI | El commit contiene 64 archivos versionados, ninguna suite ni workflow CI. README solo propone dos comprobaciones de sintaxis con rutas que ya no existen y un servidor estático que no ejecuta el Worker. Los scripts concurrentes posteriores quedan fuera de esta conclusión. |
| Observabilidad | `wrangler.jsonc:67–68` habilita observabilidad. Hay dos logs explícitos de error en `src/contacto.js:238,245`. No hay alertas, SLO, runbook de incidentes, correlación de solicitudes o comprobación de entrega documentados en la revisión. No se inspeccionó el panel: no se afirma que allí no existan. |
| SEO | Canonical, metadatos sociales, robots, sitemap y cinco bloques JSON-LD sintácticamente válidos. El sitio principal es español; el juego cambia idioma mediante fragmento y JS. |
| Datos | Contacto recoge nombre, empresa opcional, correo y texto; además procesa IP y la usa literalmente en claves KV con TTL 3660 s. El navegador guarda preferencias `cs-audio` y `svs-lang` en localStorage. |

La arquitectura estática es proporcional a un sitio editorial. Añadir un framework, una base de datos o microservicios no resuelve ninguno de los bloqueadores identificados. La ausencia de TypeScript tampoco es, por sí sola, un defecto; faltan contratos y verificaciones, que pueden obtenerse con JSDoc, pruebas y validación de bindings.

## 3. Diez razones por las que un CTO no contrataría CosaSeria

1. **No hay un caso contractual comparable.** Trabajo enumera productos propios, empleos y proyectos domésticos; no documenta un encargo de cliente aceptado y operado por el estudio. CS-20.
2. **No puedo evaluar resultados.** La sección «Sobre los resultados» pospone los datos a una llamada; no ofrece siquiera resultados cualitativos comprobables mediante entregables, decisiones o referencias. CS-20.
3. **No sé qué capacidad estoy comprando.** Hay un fundador identificado, un empleo actual declarado y varios productos mantenidos. No se explican dedicación, capacidad simultánea, colaboradores ni sustitución. No es prueba de incumplimiento; sí una incógnita de compra. CS-21.
4. **No existe un modelo de contratación visible.** No se distingue un diagnóstico acotado de una implementación, un advisory recurrente o un rescate operativo. CS-22.
5. **No puedo evaluar continuidad.** No se describen responsables de soporte, transferencia, propiedad de repositorios, guardias, cobertura durante ausencias o límites de responsabilidad operativa. CS-21.
6. **Las credenciales no sustituyen referencias del proveedor.** Los enlaces a perfiles y productos no acreditan por sí mismos el alcance individual de las contribuciones ni la ejecución contractual de CosaSeria. CS-20.
7. **La propia puerta de entrada falla en una variante habitual.** `www` devuelve 522. Para una firma que vende operación, es una objeción concreta. CS-01.
8. **La muestra de criterio técnico contiene afirmaciones que no aceptaría en una revisión de pagos.** La incertidumbre sobre un cobro no desaparece al estar dentro de un monolito. CS-18.
9. **La promesa de acabado no está respaldada por su flujo de contacto.** Hay truncamiento silencioso y feedback inaccesible; los errores del rate limiter no se manejan como respuesta de aplicación. CS-04, CS-07, CS-08.
10. **El portafolio exige que yo haga la traducción comercial.** Debo deducir cómo una quiniela, proyectos familiares y una app de juego reducen el riesgo de mi migración o plataforma crítica. Esa conexión debería demostrarla el proveedor. CS-23.

Estas son objeciones sobre suficiencia de evidencia y riesgo de contratación. No demuestran que el fundador carezca de las competencias que declara.

## 4. Diez objeciones de un Principal Engineer adversarial

1. «¿Dónde está la prueba de regresión de la única ruta que produce una conversión? No está en el commit». CS-02.
2. «El README no reproduce ni la plataforma ni los comandos actuales. No es un runbook utilizable». CS-03.
3. «Un `200` después de cortar mi mensaje no significa que recibiste lo que envié». CS-04.
4. «Tu token es opcional para un bot, pero puede bloquear durante tres segundos al usuario que sí ejecuta JS». CS-05/06.
5. «Una dependencia de rate limiting que falla provoca una excepción sin respuesta controlada; el binding ausente, en cambio, permite todo». CS-06/07.
6. «`aria-modal=true` no vuelve modal al DOM, y actualizar un párrafo no anuncia el resultado del formulario». CS-08/11.
7. «HTML que se revalida y JS/CSS con siete días de frescura y URL estable pueden pertenecer a releases distintos». CS-16.
8. «La promesa pública de lectura sin JS no se sostiene para historia y personajes del juego». CS-14.
9. «Una llamada local no convierte efectos externos en una transacción. El ejemplo de cobro enseña el modelo equivocado». CS-18.
10. «Cuatro servicios no implican cuatro repositorios ni despliegue coordinado. Eso depende de tus contratos y acoplamiento». CS-19.

## 5. Hallazgos técnicos verificados y riesgos delimitados

### CS-01 — P1 — La variante `www` está indisponible

**Estado:** observado en producción; confianza alta sobre las dos respuestas, causa desconocida. **Ubicación:** configuración externa de dominio, no disponible; `src/contacto.js:3–6` incluso admite ese origen.

GET a `https://www.cosaseria.mx/` devolvió 522 a las **23:28:06 y 23:28:43 UTC**, con cabeceras de Cloudflare. El dominio canónico respondió 200. Evidencia: [http-results.txt](evidence/cosaseria-2026-10-14/http-results.txt) y [www-recheck.headers](evidence/cosaseria-2026-10-14/www-recheck.headers). No se atribuye a DNS, Worker u origen sin ver la configuración.

**Impacto:** usuarios que escriban o reciban la variante no llegan al sitio. **Corrección:** revisar asociación del dominio y configurar redirección permanente a la URL canónica. **Aceptación:** HTTP y HTTPS con/sin `www`, con ruta y query, terminan en el destino correcto; `www` responde 301/308, sin bucles ni error TLS. Verificar desde dos redes. No basta que `/` funcione en una sola ubicación.

### CS-02 — P1 — La promesa de pruebas no tiene respaldo reproducible en el repositorio de referencia

**Estado:** ausencia confirmada en el commit; no se infiere ausencia de controles privados. **Ubicación:** inventario `git ls-tree -r --name-only 2932725`, `README.md:58–64`, promesa `public/index.html:313–318`, esquema local de Wrangler `wrangler.jsonc:2`.

No hay tests, CI, linter, manifiesto de herramientas ni versión fijada de Wrangler. Los fallos de este informe se encontraron mediante quince pruebas nuevas y revisión de navegador que antes no formaban parte del repositorio. Un servidor de archivos no verifica el contrato del Worker.

**Impacto:** cambios en correo, antiabuso o accesibilidad pueden llegar a producción sin una comprobación repetible. **Corrección:** incorporar comandos mínimos de sintaxis, validación estática y tests del Worker con bindings falsos; fijar herramientas de desarrollo y ejecutar en CI antes de publicar. No introducir un framework frontend por esto. **Aceptación:** checkout limpio con una versión de Node documentada puede ejecutar un comando de validación; falla ante una regresión en CS-04/05/07/08/11; CI conserva resultados y el empaquetado no envía correo ni despliega. Evaluar los scripts concurrentes antes de crear alternativas duplicadas.

### CS-03 — P2 — README y comentarios describen una plataforma que ya no existe

**Estado:** confirmado. **Ubicación:** `README.md:5–10,14–28,33–46,60–64`; `.gitignore:1–4`; implementación real `wrangler.jsonc:3–14,23–25` y `public/_headers:7`.

README dice Pages, Pages Function, Resend y CSP Report-Only. El código usa Worker, `send_email` y CSP aplicada. Las dos instrucciones `node --check functions/api/contacto.js` y `node --check assets/js/site.js` fallan con archivo inexistente: [readme-check-results.json](evidence/cosaseria-2026-10-14/readme-check-results.json). También afirma que se publica la raíz; `/README.md` respondió 404 y la configuración sirve `public/`.

**Impacto:** onboarding incorrecto, secretos configurados en el lugar equivocado y decisiones de seguridad basadas en información obsoleta. **Corrección:** documentar el flujo Workers actual, secretos/bindings requeridos, arranque local, validación, publicación y rollback. **Aceptación:** todos los comandos de lectura/validación funcionan desde un checkout limpio; ninguna instrucción manda configurar Resend o CSP Report-Only; un lector identifica qué sale a internet sin deducirlo del código.

### CS-04 — P2 — El formulario pierde contenido sin informarlo

**Estado:** confirmado mediante ejecución local. **Ubicación:** `src/contacto.js:1,16–25,221–229`; `public/index.html:469–487`.

El servidor aplica `slice()` antes de validar; el navegador no declara `maxlength`. Un mensaje de 8100 caracteres produjo 200 y un correo simulado con **8000** caracteres de problema. Nombres y empresa también se cortan. Evidencia: prueba «mensaje de 8100 caracteres se trunca con éxito» en [contact-results.json](evidence/cosaseria-2026-10-14/contact-results.json).

**Impacto:** se pierde parte de un brief sin que remitente ni receptor lo sepan. **Corrección:** validar longitud original y devolver error de campo; alinear límites en HTML y servidor. **Aceptación:** valores en el límite se preservan exactamente; valores que lo superan reciben 400/422, no generan correo y permanecen en el formulario. Cubrir caracteres Unicode y no cortar pares sustitutos.

### CS-05 — P2 — El ciclo de vida del token castiga al usuario legítimo

**Estado:** confirmado en backend y código de cliente. **Ubicación:** `src/contacto.js:10,79–91,216–219`; `public/assets/js/site.js:150–159`.

El token se pide en el primer foco; uno menor de tres segundos se rechaza con el mensaje de sesión inválida. Tras dos horas también se rechaza. El cliente nunca lo renueva, no reinicia `pidiendoToken` tras un error y registra el listener con `once`. La prueba con un token recién emitido devuelve 403. Un autofill rápido puede entrar en esa ventana; una pestaña abierta queda con token vencido.

**Impacto:** falsos rechazos y reintentos inútiles hasta recargar, con riesgo de perder el texto. **Corrección:** definir si el token es una señal antiabuso opcional o un requisito; gestionar emisión, edad, renovación y retry conservando campos. **Aceptación:** autofill/envío inmediato tiene una espera explicada o un flujo aceptado; error de GET se recupera; una pestaña de más de dos horas puede enviar sin recargar ni borrar el mensaje. No considerar que volver opcional la validación arregla la protección antiabuso.

### CS-06 — P2 — El antiabuso falla abierto y el contador horario no es exacto

**Estado:** comportamiento confirmado; explotación en producción no demostrada. **Ubicación:** `src/contacto.js:94–114,197–218`; `wrangler.jsonc:27–29,45–54`.

La ausencia de `RAFAGA` o `LIMITES` devuelve `false` sin el aviso prometido en el comentario. Un POST sin token se procesa: `if (token && ...)` solo valida tokens presentes. La prueba local sin esos bindings y sin token llega al correo simulado. Esto **no prueba** que falten bindings en producción: están declarados en Wrangler.

El `get`/`put` de KV pierde incrementos concurrentes; dos peticiones locales coordinadas dejan contador 1. Un límite de dos por minuto todavía permite esas dos peticiones dentro del mismo segundo. Cloudflare documenta que el rate limiter es aproximado/local y KV admite una escritura por segundo por clave; un binding no convierte al otro en una transacción. [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [límites KV](https://developers.cloudflare.com/kv/platform/limits/).

**Impacto:** protección degradada silenciosamente y cuotas distintas de las que un operador podría creer. No es un bypass de autenticación: aquí no existe sesión autenticada. **Corrección:** validar bindings de producción, alertar sobre degradación y documentar límites aproximados. Si se exige cuota exacta, usar coordinación atómica; no introducirla solo por estética. **Aceptación:** falta de binding produce un diagnóstico visible y política explícita; pruebas concurrentes verifican la garantía elegida; WAF se verifica en panel y no se da por hecho a partir del comentario «Pendiente».

### CS-07 — P2 — Los fallos de KV y RAFAGA escapan del manejador

**Estado:** confirmado mediante inyección local de fallos. **Ubicación:** `src/contacto.js:197–207`; `src/worker.js:39–41`.

Las llamadas a los dos limitadores ocurren fuera de `try/catch`. Al lanzar un error desde cualquiera, `worker.fetch()` rechaza la promesa, sin pasar por `respuesta()` ni `blindar()`. No se predice el cuerpo exacto que Cloudflare mostraría en producción.

**Impacto:** respuesta fuera del contrato y diagnóstico inconsistente justo en el flujo de adquisición. **Corrección:** capturar fallos de infraestructura y decidir explícitamente entre cierre seguro y degradación controlada, con ID de correlación y sin datos personales en logs. **Aceptación:** bindings simulados que fallan generan una respuesta 503 controlada, JSON/HTML según Accept, cabeceras esperadas y mensaje accionable; nunca una excepción sin manejar. Mantener los campos en cliente.

### CS-08 — P1 — El resultado del contacto no se anuncia de forma accesible

**Estado:** confirmado en DOM y prueba de interacción; no se ejecutó un lector de pantalla real. **Ubicación:** `public/index.html:496–499`; `public/assets/js/site.js:143–147,177–189`.

`[data-recado]` es un párrafo inicialmente oculto sin `role=status`, `role=alert` ni `aria-live`. Al recibir éxito, el texto cambia y se borran los campos, pero el foco no se traslada al resultado. La captura del DOM confirma `role: null`, `ariaLive: null`, `focused: false`. Es un problema del criterio **WCAG 4.1.3**, aunque Lighthouse dé 100 a la página inicial. [Mensajes de estado, W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

**Impacto:** un usuario de lector de pantalla no recibe una notificación fiable de éxito o error. **Corrección:** región de estado persistente y anuncio apropiado para errores; evitar anuncios duplicados. **Aceptación:** probar envío, éxito, 400, 429 y error de red con teclado y VoiceOver/NVDA; cada cambio relevante se anuncia una sola vez, sin mover el foco arbitrariamente ni perder datos en error.

### CS-09 — P2 — El cliente confunde transporte exitoso con operación exitosa

**Estado:** defecto de contrato confirmado con mock; ocurrencia con backend actual no observada. **Ubicación:** `public/assets/js/site.js:169–189`; `src/contacto.js:135–147,242–249`.

El cliente solo usa `respuesta.ok`; ignora `datos.ok`, acepta un cuerpo JSON inválido sustituyéndolo por `{}` y borra los campos. Con HTTP 200 y `{ok:false,mensaje:'No enviado'}`, la prueba deja el botón «Enviado», campos vacíos y texto «No enviado». El Worker actual no emite esa combinación; es fragilidad ante cambios/intermediarios, no evidencia de pérdidas actuales por ese motivo. Tampoco hay deadline de fetch ni mecanismo para distinguir un reintento después de una respuesta perdida. Dos POST idénticos generan dos correos en el mock.

**Impacto:** falsos acuses y recuperación ambigua. **Corrección:** validar el esquema de respuesta, preservar el borrador en errores y definir timeout/retry. Si se adopta deduplicación, asignar un ID por envío lógico, no por cada intento HTTP. **Aceptación:** 200 inválido, `{ok:false}`, 5xx, desconexión y respuesta demorada no se muestran como éxito; el usuario puede recuperar el texto. Prueba de respuesta perdida con un solo envío lógico si esa es la garantía prometida.

### CS-10 — P1 — El inventario público de datos contradice la implementación

**Estado:** confirmado; no es dictamen jurídico. **Ubicación:** `public/privacidad/index.html:175–187`; `src/contacto.js:41–42,101–112`; `public/assets/js/site.js:48,64`; `public/StoneVsSilicon/svs.js:15,23`.

El aviso dice que únicamente recibe los datos escritos en el formulario. El servidor obtiene `cf-connecting-ip` y almacena la IP literal en claves `rl:v:<ip>:<bloque>`, TTL **3660 segundos**. No es solo procesamiento inevitable del CDN: es almacenamiento explícito diseñado por el sitio. Las preferencias en localStorage tampoco están inventariadas; no son cookies ni evidencia de seguimiento entre sitios. La política de apps sí menciona IP de alojamiento (`public/privacy-apps/index.html:163–164`), lo que vuelve inconsistente el conjunto.

**Impacto:** declaración pública materialmente incompleta sobre el tratamiento técnico. **Corrección:** inventariar IP/seguridad, analítica, preferencias y proveedores; precisar conservación y canales de derechos. Minimizar el identificador usado para limitar abuso si es viable, sin llamar «anónimo» a algo identificable o enlazable. **Aceptación:** cada dato leído, persistido o remitido en estas rutas tiene finalidad, responsable operativo y retención documentados; el aviso refleja lo observado. Verificar aparte logs del proveedor y buzón, que esta auditoría no inspeccionó.

### CS-11 — P1 — Los modales permiten tabular al contenido del fondo

**Estado:** confirmado en navegador. **Ubicación:** `public/StoneVsSilicon/svs.js:47–80`; `public/StoneVsSilicon/index.html:353–375,380–385,427–432`; `public/StoneVsSilicon/svs.css:176`.

Abrir Historia y pulsar Tab produce: cerrar → Cómo se juega → **Trabajo del footer, fuera del diálogo**. `aria-modal=true` y `overflow:hidden` no vuelven inerte al fondo ni contienen el foco. Escape sí cierra: no se acusa una trampa de teclado que no existe. Evidencia: [browser-results.json](evidence/cosaseria-2026-10-14/browser-results.json). El comportamiento incumple el patrón de diálogo y crea una secuencia de foco incoherente/oculta. [WAI-ARIA Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

**Corrección:** preferir `<dialog>.showModal()` con gestión de cierre/foco o implementar inercia y contención completas. **Aceptación:** Tab/Shift+Tab permanecen dentro de cada uno de los tres diálogos; Escape y botón cierran; foco regresa al disparador; el fondo no se puede operar; comprobar también lector de pantalla.

### CS-12 — P1 — Texto significativo con contraste 2.08:1

**Estado:** confirmado por axe y valores CSS. **Ubicación:** `public/StoneVsSilicon/svs.css:11,229–232`; etiqueta `.pronto > .es` en `public/StoneVsSilicon/index.html:299`.

Foreground `#f0821e`, fondo `#e8e4d9`, 10.56 px, contraste **2.08:1** frente al mínimo AA de **4.5:1** para ese texto ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). No se extrapola este fallo a todos los colores ni se afirma que el sitio entero tenga bajo contraste.

**Corrección:** usar un tono de texto que supere el umbral, conservando el naranja en decoración si se desea. **Aceptación:** ratio ≥4.5:1 en español/inglés y en estados aplicables; axe sin esa violación. Los casos de contraste que axe deja como incompletos requieren inspección, no se cuentan como aprobados.

### CS-13 — P2 — El selector de idioma anuncia un estado que su rol no admite

**Estado:** confirmado. **Ubicación:** `public/StoneVsSilicon/index.html:145–147`; `public/StoneVsSilicon/svs.js:6–12`.

Los dos `<a>` llevan `aria-pressed`, atributo de botón conmutable, no del rol link. axe registra dos nodos con `aria-allowed-attr`. Al cambiar a inglés se cambia `html.lang`, pero los `alt` de los personajes siguen en español (`index.html:389–445`); la localización de la información accesible está incompleta.

**Corrección:** botones reales si la acción cambia estado local, o enlaces reales a variantes con `aria-current`; traducir también nombres y descripciones accesibles. **Aceptación:** axe sin ARIA inválido, estado seleccionado comprensible por lector de pantalla y descripciones del idioma activo. No asignar `role=button` sin implementar además su interacción por teclado.

### CS-14 — P2 — La afirmación «apaga JavaScript» es falsa en el juego

**Estado:** confirmado con JS desactivado. **Ubicación:** promesa `public/StoneVsSilicon/index.html:66–72`; contenido oculto `:353,380,427`; video `:319–328`; lógica `svs.js:58–72`.

Sin JS, Historia y alineaciones permanecen `hidden`; sus controles no los revelan. `#en` deja el documento en español. Hay **dos videos visibles** en español: el elemento sin source y el fallback de `noscript`. No se afirma que el inicio corporativo necesite JS para leerse.

**Impacto:** funcionalidades y contenido no disponibles en el modo que la propia página promete soportar. **Corrección:** contenido base accesible mediante secciones/enlaces o `details`, con mejora progresiva a modal; mostrar un único reproductor utilizable; dar una ruta real al inglés o limitar expresamente la promesa. **Aceptación:** sin JS se leen historia y personajes y se reproduce un único video; los enlaces de idioma tienen un resultado útil.

### CS-15 — P1 — StoneVsSilicon tiene un LCP móvil de laboratorio deficiente

**Estado:** medición confirmada, generalización a usuarios reales pendiente. **Ubicación:** `public/StoneVsSilicon/index.html:33–37,157–158,387–465`; `svs.js:130–144`.

Lighthouse 13.5.0 midió **LCP 5288 ms**, performance 77, **874314 bytes** transferidos en la navegación. El elemento LCP fue `h1#h-portada > img` (`logo.webp`, 134374 bytes, 1000×680, mostrado aproximadamente a 371×252 CSS px en la emulación). Su solicitud tenía prioridad Medium, mientras el fondo decorativo tenía `fetchpriority=high`. El script `svs.js` bloquea el parser en el head. Diez imágenes de los rosters ocultos se descargaron: **189144 bytes de recurso**. No se descargaron MP4 en esa medición: no se les atribuye falsamente el peso inicial.

La herramienta estima 390 KiB potenciales en imágenes y 610 ms en recursos bloqueantes; son estimaciones, no ahorros demostrados. **Corrección:** dimensionar/comprimir el logo con variantes que respeten DPR, priorizar el LCP real, diferir comportamiento y recursos de modales, cargar posters según necesidad. Separar el mínimo ajuste inicial de idioma si diferir todo produce parpadeo.

**Aceptación:** repetir tres mediciones con perfil idéntico, mediana LCP ≤2.5 s y CLS ≤0.1; ninguna imagen exclusiva de un roster cerrado se solicita antes de necesitarla; comprobar calidad visual en DPR 1/2/3. Después medir percentil 75 real cuando haya datos. No exigir ni prometer 100 como sustituto de esas condiciones.

### CS-16 — P2 — Cache de siete días sin versionado de URLs

**Estado:** configuración confirmada; incidente de mezcla de versiones no observado. **Ubicación:** `public/_headers:9–17`; referencias estables `public/index.html:31,536`; resto de páginas equivalente.

CSS y JS se publican con `max-age=604800`, mientras HTML tiene `max-age=0, must-revalidate` en producción. No hay fingerprint ni versión en los enlaces. Un navegador puede combinar HTML nuevo con recursos frescos antiguos; un ETag no obliga a revalidar un recurso que todavía es fresco. Las fuentes usan `immutable` durante un año con nombres también estables.

**Corrección:** URLs con hash/versionado para recursos cambiantes o revalidación apropiada. **Aceptación:** simular dos releases, conservar la caché de la primera y cargar HTML de la segunda: obtiene los recursos compatibles sin «hard refresh». No sobrescribir fuentes bajo una URL immutable.

### CS-17 — P2 — `hreflang` apunta a fragmentos, no a versiones indexables independientes

**Estado:** implementación confirmada; efecto real en índice no consultado. **Ubicación:** `public/StoneVsSilicon/index.html:10–12`; `svs.js:19–26,37–43`.

Español e inglés usan la misma URL con `#es`/`#en`. El fragmento no selecciona una representación en el servidor; metadata/canonical permanecen iguales y el idioma puede depender del navegador/localStorage. Google desaconseja fragmentos para variar contenido. [URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure), [versiones localizadas](https://developers.google.com/search/docs/specialty/international/localized-versions).

**Corrección:** servir dos rutas estables con idioma y metadatos coherentes, enlazadas recíprocamente; mantener una estrategia canonical explícita. **Aceptación:** cada URL devuelve directamente el idioma correcto sin JS ni preferencias; `hreflang` recíproco con URLs completas y sitemap actualizado. Validar Search Console después; Lighthouse SEO 100 no comprueba esa indexación.

### CS-18 — P1 — El artículo enseña una falsa atomicidad para el cobro monolítico

**Estado:** imprecisión técnica confirmada; no es vulnerabilidad atribuida a un backend de pagos. **Ubicación:** `public/notas/microservicios-cuando-no/index.html:257,278–303`.

El diagrama dice «falla todo o no falla nada». El texto afirma que antes no había incertidumbre sobre el cobro porque la función corría o no corría. Una llamada local puede ejecutar efectos y luego fallar, perder el resultado, sufrir caída del proceso o llamar desde dentro a un PSP remoto. Una transacción ACID delimitada puede dar atomicidad a determinados datos; la llamada de función por sí sola no la da. Un monolito expuesto a reintentos del cliente también necesita razonar sobre duplicados.

**Impacto:** degrada la muestra pública de criterio en el dominio que se usa como credencial comercial. **Corrección:** separar llamada local pura, transacción de datos y efecto externo; explicar el estado incierto tanto para PSP como para servicios internos. Una clave no implementa sola la idempotencia: hace falta semántica de operación, registro/retención y tratamiento de conflictos/reintentos. [AWS Builders' Library: idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

**Aceptación:** texto y diagrama no prometen atomicidad por estar en un binario; un ejemplo muestra «efecto confirmado por proveedor, respuesta perdida» y reconciliación; explica alcance y persistencia de clave idempotente. Revisar la corrección con alguien que opere pagos antes de usarla como prueba de competencia.

### CS-19 — P2 — La tesis sobre microservicios se vuelve absoluta donde requiere condiciones

**Estado:** mezcla de imprecisiones verificables y recomendaciones opinables. **Ubicación:** mismo artículo, líneas `221–227,235,282–290,299–313,319–350`.

| Afirmación | Evaluación y corrección necesaria |
|---|---|
| «Exactamente un producto: independencia de despliegue» | Es una tesis editorial defendible como prioridad, no definición exhaustiva. Límites de recursos, cumplimiento y aislamiento operacional pueden justificar separar procesos. El propio artículo los admite después en 335–336. Redactar como beneficio principal bajo determinadas condiciones. |
| Bulkheads/timeouts/circuit breakers «funcionan igual dentro de un solo binario» | Pueden acotar concurrencia/dependencias dentro de un proceso; no equivalen a aislamiento ante crash, corrupción, OOM o fallo compartido del runtime. Además, **binario** y **proceso** son cosas distintas: un binario puede tener varias instancias aisladas. [Bulkhead, Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead). |
| «Cada llamada de función» se convierte en red | Solo las llamadas que cruzan una frontera. Otras permanecen locales; algunas relaciones pasan a mensajes/eventos, con otras garantías y costos. |
| «Ninguna de las líneas nuevas es opcional» | Reintentar tres veces y versionar explícitamente como `v2` no son obligaciones universales. Hace falta presupuesto de latencia, clasificación de fallos y una política de compatibilidad; a veces no reintentar es lo correcto. |
| `timeout = 800ms` | Pseudocódigo sin identificar. No es Python ejecutable. Etiquetarlo como pseudocódigo y aclarar si el timeout es por intento o total; añadir backoff/jitter solo cuando se recomiende retry. |
| «Cuatro servicios y un equipo dan cuatro repositorios ... en orden» | No se deduce: puede haber monorepo y contratos compatibles; varios repositorios pueden seguir acoplados. Un monolito distribuido se diagnostica por acoplamiento, no contando equipos/repositorios. |
| Despliegue independiente vs «ya no pueden ir en cualquier orden» | Explicar expand/contract y compatibilidad entre versiones coexistentes. Independencia no significa ausencia de contratos; despliegues coordinados sistemáticos indican una propiedad que no se logró. |
| «La petición más lenta manda» | Correcto para una espera de fan-out; una cadena secuencial acumula latencias y un flujo asíncrono tiene otro presupuesto. Delimitar la topología. |
| «Una tarde / un trimestre», «quince minutos», «se arregla con pipeline» | Heurísticas retóricas, no estimaciones ni diagnóstico causal. Despliegues infrecuentes pueden deberse a producto, gobernanza o riesgo, además del pipeline. Presentarlas como ejemplos condicionados. |

**Trade-off que no debe perderse:** preferir un monolito modular y extraer servicios cuando exista presión demostrada es una postura razonable. No se penaliza esa opinión. Se penaliza sostenerla con equivalencias falsas o recomendaciones universales. **Aceptación:** cada afirmación anterior delimita supuestos o se reemplaza; incluir un caso donde sí se justifique separación por aislamiento y uno donde no, con costos y señales medibles. Revisar también los resúmenes de inicio y `llms.txt` para no conservar la generalización anterior.

### CS-24 — P2 — El juego público está ausente del recorrido principal de evidencia

**Estado:** confirmado. **Ubicación:** catálogo `public/trabajo/index.html:240–279,413–460`; inicio `public/index.html:326–343`; presencia alternativa en `public/sitemap.xml:34–37` y `public/llms.txt:23`.

StoneVsSilicon tiene landing, soporte y enlace directo a App Store, pero no una ficha o enlace en Trabajo ni inicio. La extracción de enlaces locales no encuentra enlaces rotos: encuentra una **omisión editorial**, no una ruta inexistente.

**Impacto:** una publicación verificable no apoya la evaluación comercial; el visitante debe conocer su URL o descubrirla fuera del recorrido principal. **Corrección:** decidir expresamente si es evidencia relevante. Si lo es, añadir ficha con responsabilidad, restricciones y enlace a publicación; si es solo producto de consumo, conservar una separación de navegación consciente. **Aceptación:** desde Trabajo se llega al producto en un clic y se entiende qué demuestra; no basta insertar el logo sin contexto.

### CS-25 — P3 — La duplicación manual ya produce deuda de mantenimiento

**Estado:** estructura confirmada; costo futuro estimado. **Ubicación:** nueve copias de `id="sello-cs"`, cabecera y comentario de marca en los nueve HTML; ejemplo `public/index.html:159–218`, `public/StoneVsSilicon/index.html:66–72`.

La repetición del SVG no es un bug ni hay IDs duplicados dentro de cada documento. El riesgo es actualizar manualmente nueve plantillas; el comentario que promete una hoja de estilos/un JS y lectura sin JS ya no describe la landing del juego.

**Corrección:** considerar fragmentos o generación estática mínima de cabecera/footer/metadatos, conservando HTML final independiente; alternativamente, checks de invariantes compartidos. **Aceptación:** un cambio de navegación común se realiza en un punto y se verifica en todas las páginas; las excepciones editoriales permanecen explícitas. No convertir esta mejora P3 en una migración de framework.

### CS-26 — P3 — Los datos estructurados confunden identidad de organización y persona

**Estado:** semántica confirmada; impacto en buscadores no medido. **Ubicación:** `public/index.html:59–62,103–106`.

`Organization.sameAs` y `Person.sameAs` repiten los perfiles personales de Juan Barrera. La relación de fundador ya está modelada por separado. El JSON es válido, pero está afirmando equivalencia de identidad donde corresponde una relación entre entidades.

**Corrección:** dejar los perfiles personales en Person y usar solo perfiles de la firma en Organization, u omitir ese campo. **Aceptación:** JSON-LD parsea y mantiene entidades distintas con enlaces verificables; un validador de sintaxis por sí solo no cierra la revisión semántica.

### CS-27 — P2 — No hay límite de cuerpo antes de materializar el formulario

**Estado:** riesgo potencial derivado del código; no se hizo una prueba de agotamiento. **Ubicación:** `src/contacto.js:205–225`.

`request.formData()` consume el cuerpo completo antes de aplicar límites de caracteres. Se limita el contenido que llega al correo, no el costo de recibir/parsear multipart. Los límites generales de Cloudflare no sustituyen una política explícita de esta ruta. No se conoce el WAF desplegado ni se afirma que exista una denegación de servicio explotable.

**Corrección:** presupuesto pequeño y documentado para el cuerpo (por ejemplo 128 KiB, calibrado para los campos/Unicode soportados), control durante lectura y rechazo de tipos de campo/archivo no admitidos; no confiar solo en Content-Length. **Aceptación:** payload sobredimensionado con y sin Content-Length recibe 413 antes de materializarlo íntegro; campos de tipo File no se convierten silenciosamente en texto; tráfico válido permanece aceptado. Ejecutar estas pruebas solo localmente/staging.

## 6. Hallazgos comerciales y de comunicación

### CS-20 — P1 — No hay evidencia contractual ni resultados evaluables del estudio

**Estado:** ausencia pública confirmada en el corpus revisado; capacidad real no determinada. **Ubicación:** `public/trabajo/index.html:229–235,247–287,300–407`.

Las dos fichas de producto propio describen funciones y responsabilidad; no dan escala, periodo, restricciones, decisiones comparadas, resultado de operación ni un entregable inspeccionable. Los proyectos del fundador fuera del estudio no fueron encargos a CosaSeria, según el propio texto. La confidencialidad puede impedir publicar detalles de empleadores; no explica por sí sola la ausencia de una demostración técnica acotada de productos propios.

**Impacto:** no se puede distinguir ejecución de un producto pequeño de capacidad de entrega crítica. **Corrección:** publicar al menos un caso de producto propio y, si existe y está autorizado, uno contractual. No fabricar clientes ni métricas; si aún no hay encargos, decirlo y ofrecer evidencia alternativa precisa. **Aceptación:** caso con contexto, rol exacto, restricciones, decisiones/trade-offs, artefacto y resultado observable con fecha/método; referencias bajo NDA o muestra sanitizada cuando proceda. Un sitio que responde 200 no demuestra sus funciones internas ni su autoría.

### CS-21 — P1 — Capacidad operativa y continuidad no están explicadas

**Estado:** brecha de información confirmada; riesgo comercial inferido. **Ubicación:** `public/index.html:404–431`; `public/trabajo/index.html:300–326,390–391`; observabilidad `wrangler.jsonc:67–68`.

Solo se identifica a Juan Barrera y se declara empleo actual en RevenueCat. El comprador no sabe cuántas horas del principal se reservan, quién implementa, quién revisa, qué otros compromisos compiten, qué ocurre durante ausencias ni quién opera el sistema tras entrega. No se afirma incompatibilidad laboral ni que no existan colaboradores: no se verificó ninguna de las dos cosas.

**Corrección:** explicar modelo real de dotación, disponibilidad, continuidad y soporte, con límites claros. Adjuntar un ejemplo de plan operativo y handoff. **Aceptación:** antes de propuesta, el cliente puede identificar responsable técnico, capacidad comprometible, sustitución, revisión independiente, ventanas de soporte, propiedad/acceso a activos, escalamiento y salida ordenada. Las alertas/SLO del proyecto contratado se acuerdan; la simple bandera `observability.enabled` no los acredita.

### CS-22 — P2 — Se venden áreas de conocimiento, no una compra suficientemente definida

**Estado:** juicio comercial sustentado en contenido. **Ubicación:** `public/index.html:226–293,464–505`.

Arquitectura, escalabilidad, software a medida, IA y advisory abarcan casi todo el trabajo senior. «Cuéntanos el problema» abre una conversación, pero no explica qué sucede después, qué información hace falta, qué entrega una primera intervención ni cómo se decide avanzar. Publicar tarifas exactas no es requisito; sí reducir incertidumbre de contratación.

**Corrección:** describir modalidades reales: por ejemplo diagnóstico acotado con riesgos/ADR/plan, implementación con hitos verificables o advisory con cadencia y decisiones documentadas. Publicar selección, pasos, entregables y expectativas de respuesta que realmente puedan sostenerse. **Aceptación:** cinco lectores del perfil comprador pueden explicar qué comprarían primero, qué recibirían y qué queda fuera sin hablar con el fundador; validar con usuarios, no dar por probado un aumento de conversión.

### CS-23 — P2 — La narrativa de productos diluye la tesis premium si no demuestra ingeniería

**Estado:** opinión comercial explícita; no defecto de los productos. **Ubicación:** `public/trabajo/index.html:268–287,413–460`; `public/index.html:231–234`.

AuxiDocente puede respaldar producto completo/IA; QuinielaRoyale puede respaldar operación estacional; el juego puede respaldar trabajo móvil/offline; los proyectos familiares pueden respaldar criterio de diseño o aislamiento de ejecución. Hoy el sitio describe qué hacen, pero no muestra las decisiones, validación o consecuencias que vuelven transferible esa experiencia a un contrato grande. Los enlaces familiares conducen a experiencias no evaluadas tras autenticación; el comprador no puede comprobar el sandbox anunciado.

**Corrección:** ordenar primero por pertinencia a decisiones del comprador y evidencia verificable; dejar laboratorio personal como categoría secundaria con límites claros. No eliminar humor ni juegos por prejuicio estético. **Aceptación:** cada proyecto destacado responde «qué capacidad demuestra», «qué artefacto lo acredita» y «qué no demuestra»; las afirmaciones de seguridad de otros sistemas no se presentan como verificadas por esta auditoría.

### Respuestas directas a las preguntas de compra

| Pregunta | Respuesta basada en lo visible |
|---|---|
| ¿Qué vende exactamente? | Criterio senior aplicado a arquitectura, escalabilidad, sistemas a medida, IA y advisory temporal. No define suficientemente unidades de contratación y entregables. |
| ¿Por qué frente a un buen freelance? | La trayectoria declarada y la oferta de principal temporal pueden ser relevantes, pero no se documenta un mecanismo empresarial adicional de revisión, respaldo o capacidad. El sitio no prueba esa diferencia. |
| ¿Por qué frente a una consultora establecida? | Se puede inferir acceso directo al fundador y menor intermediación; no están explicados los compromisos que compensan menor redundancia o amplitud de equipo. No se atribuyen ventajas de precio/velocidad sin datos. |
| ¿Qué prueba entrega compleja? | Narraciones de trabajo previo y productos accesibles. No hay expediente público de entrega compleja contratada al estudio. |
| ¿Distingue fundador y estudio? | **Sí**, explícitamente en Trabajo. El hero usa marcas grandes como aval temprano, pero no las llama clientes. No confundir esa tensión de posicionamiento con falsedad demostrada. |
| ¿Hay evidencia verificable? | Enlaces vivos a productos y ficha de App Store. No se verificaron autoría/contribución individual, funciones autenticadas, métricas ni cumplimiento de entregables. |
| ¿Modelo y capacidad claros? | No: faltan dedicación, equipo, continuidad, alcance de soporte y proceso comercial. |
| ¿Los productos refuerzan el premium? | Potencialmente; ahora la conexión con decisiones de alto valor queda mayormente a cargo del lector. No es el género del producto lo que falla, sino su evidencia técnica. |
| ¿Qué objeciones quedan antes de una propuesta? | Equipo asignable, referencias, caso comparable, artefactos de calidad, cronograma/aceptación, disponibilidad, responsabilidades de seguridad, operación y salida. |

## 7. Seguridad, privacidad y operación: límites de las conclusiones

| Área | Resultado |
|---|---|
| Secretos | Búsqueda de patrones reconocibles de claves privadas, AWS, GitHub, Stripe y Resend en los 64 archivos versionados: cero coincidencias. No es análisis entrópico ni auditoría forense de todo el historial. No se leyeron secretos locales, panel o buzones. El ID del namespace KV y los correos públicos no son credenciales. |
| XSS | No se encontró sink de HTML dinámico con entrada del usuario en los JS revisados. `escapar()` protege el HTML de respuestas y el cliente usa `textContent`. No se demuestra vulnerabilidad XSS. |
| Origen/CSRF | Origen ajeno devolvió 403 localmente. Origin no es autenticación para clientes no-browser. No hay sesión autenticada disponible sobre la que afirmar un ataque CSRF con robo de privilegios. El token HMAC opcional no debe venderse como prueba de humanidad. |
| Correo | Destinatario/remitente salen del entorno, no del POST. La API actual de Cloudflare **sí admite** `EmailMessageBuilder`: no se reporta como bug usar `EMAIL.send({to,from,replyTo,subject,text})`. [Workers Email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/). No se verificaron entrega real, DNS de correo, cuenta, cuotas ni filtros del buzón. |
| Headers | En producción se observaron CSP aplicada, HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy y Permissions-Policy. En `/api/contacto`, además no-store y noindex. La CSP permite inline styles, no scripts inline ejecutables; no es prueba de XSS. HSTS con `preload` no prueba inscripción en la lista de preload. |
| Antiabuso | Riesgos CS-06/07/27. No se ejecutó rate-limit testing contra producción. El WAF está fuera de la evidencia disponible. |
| Privacidad | Contradicción técnica CS-10. No se emitió opinión de cumplimiento legal ni se auditó la política de las apps contra sus binarios. |
| Observabilidad/entrega | Logs habilitados no equivalen a alertas, prueba de entrega ni SLO. No hay confirmación de que un correo aceptado por el proveedor llegue al buzón; no se introdujo tráfico para comprobarlo. |

## 8. Performance, SEO, accesibilidad y experiencia

### Mediciones ejecutadas

Lighthouse **13.5.0**, Chrome headless **155**, macOS. Una navegación por perfil, sin carga concurrente, entre **23:27:08 y 23:27:31 UTC**. Móvil: viewport 412×823, DPR 1.75, throttling simulado, RTT 150 ms, throughput 1638.4 Kbps, CPU ×4. Escritorio: 1350×940, RTT 40 ms, throughput 10240 Kbps, CPU ×1. Los JSON completos comprimidos y el [resumen](evidence/cosaseria-2026-10-14/lighthouse-summary.json) conservan configuración exacta.

| URL/perfil | Performance | Accesibilidad automática | Best practices | SEO automático | FCP | LCP | TBT | CLS | Transferencia |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/`, móvil | 98 | 100 | 100 | 100 | 1.84 s | 2.09 s | 0 ms | 0 | 115.2 KiB |
| `/trabajo/`, móvil | 99 | 100 | 100 | 100 | 1.39 s | 1.70 s | 0 ms | 0 | 97.8 KiB |
| `/StoneVsSilicon/`, móvil | 77 | 90 | 100 | 100 | 2.29 s | 5.29 s | 0 ms | 0 | 853.8 KiB |
| `/`, escritorio | 100 | 100 | 100 | 100 | 0.46 s | 0.50 s | 0 ms | 0 | 117.4 KiB |

**No son Core Web Vitals de campo.** No se consultaron CrUX, Search Console ni RUM del propietario. INP no se midió; TBT no lo sustituye. No hay percentil 75 ni afirmación de cumplimiento sostenido. Una ejecución identifica una señal para investigar, no un SLA ni un benchmark estable.

Tamaños de fuente, no transferencia: HTML de inicio 23245 B, CSS compartido 28686 B, JS compartido 6954 B; juego agrega HTML 34769 B, CSS 14034 B y JS 8038 B. No hay un bundle de framework oculto. Los cuatro MP4 pesan entre 2.79 y 5.00 MB y usan `preload=none`; no corresponde sumarlos a la carga inicial medida.

### Accesibilidad y responsive

- axe-core **4.14.0**, reglas WCAG A/AA 2.0/2.1/2.2, nueve páginas locales a 390 px. Siete no tuvieron violaciones automáticas en ese estado; esto no demuestra conformidad integral.
- Juego: dos nodos con ARIA inválido y uno con contraste insuficiente. El modal y el feedback del contacto se comprobaron manualmente mediante DOM/teclado.
- Artículo: axe marcó `scrollable-region-focusable` en el `<pre>` de 605 px dentro de 348 px. **La prueba real de Tab en Chromium sí enfocó el PRE. Se descarta como defecto confirmado en ese navegador**; revisar Safari/Firefox antes de decidir si requiere `tabindex=0`. Se conserva el resultado bruto, no se oculta el desacuerdo.
- Nueve páginas × anchos **320, 390, 768 y 1440**: sin overflow horizontal del documento. El mapa del juego conserva desplazamiento interno; no se confunde con overflow general.
- Cuatro páginas a 1280 px con tamaño raíz de texto al 200 %: sin overflow del documento. Es una comprobación parcial, **no** equivalente a zoom de navegador al 400 % ni prueba de ausencia de todos los recortes.
- Se observan skip link, labels y estilos de foco. No se confirma accesibilidad de subtítulos/descripción de los videos: axe los dejó para revisión; no se escuchó/analizó su contenido. No se cuenta ausencia de `<track>` como incumplimiento probado sin revisar audio y alternativas.

### SEO y descubrimiento

Robots y sitemap públicos respondieron 200; sitemap con siete URLs, XML legible. Siete páginas de contenido consultadas respondieron 200; la ruta inexistente respondió 404 real. Extracción estática de href/src/action/poster: cero destinos locales inexistentes o fragmentos rotos dentro del alcance del script, cero IDs repetidos por documento y cinco JSON-LD parseables. No es validación HTML completa ni prueba de todos los recursos CSS/srcset.

Canonical y OG existen en las páginas revisadas. Se excluyen correctamente de sitemap Gracias y 404; no se penaliza ausencia de schema opcional en el juego. Quedan CS-17 (idiomas), CS-26 (identidades) y CS-24 (descubrimiento). No hay datos de ranking, indexación, CTR o conversiones para afirmar pérdidas cuantificadas.

### Experiencia y comunicación visual

La composición observada usa jerarquía editorial, contraste tipográfico, fondo papel y acento rosa. No hay evidencia objetiva para atribuir autoría a IA; usar monospace o una cita con borde no demuestra mala ingeniería. La forma visual no es el motivo principal para descartar al proveedor.

En móvil de 390×844, el inicio muestra la promesa, áreas, credenciales y ambos CTA en la primera pantalla; no hay fundamento para decir que el CTA esté escondido. La cabecera oculta «Quiénes están detrás» bajo 900 px (`site.css:700–703`), aunque la sección sigue presente: reduce un acceso directo de confianza, no elimina a la persona del sitio. Los enlaces de footer de 40 px no se declaran automáticamente infracción de WCAG 2.2 AA por no medir 44 px; ese umbral no es una regla universal de AA.

La fricción comercial está después del CTA: el formulario no explica siguiente paso, tiempo de respuesta, tipo de información útil ni entregable inicial. «Tres párrafos bastan» reduce carga, pero no sustituye esas expectativas. El tono coloquial del rate limit («vaquero») es una elección de voz; en un error conviene priorizar una instrucción y tiempo de recuperación. No hay datos A/B que prueben que el humor reduzca conversión.

Escala cualitativa de interfaz de la habilidad de auditoría, **no certificación ni puntuación Lighthouse**: accesibilidad 2/4, performance 3/4, responsive 3/4, consistencia de tema 3/4, ausencia de anti-patrones estéticos dominantes 3/4: **14/20**. La nota de apariencia no compensa los bloqueadores comerciales ni los fallos funcionales. No se exige dark mode: el sitio declara intencionalmente `only light`.

## 9. Resultados de herramientas y reproducibilidad

| Comprobación | Resultado real | Artefacto |
|---|---|---|
| Git/inventario | Commit inicial, 64 archivos; cambios concurrentes delimitados | [manifest.json](evidence/cosaseria-2026-10-14/manifest.json) |
| `node --check` | Pasa en `src/worker.js`, `src/contacto.js`, `public/assets/js/site.js`, `public/StoneVsSilicon/svs.js`; Node 24.1.0 | Comandos abajo |
| Comandos README | Dos fallan por rutas inexistentes | [readme-check-results.json](evidence/cosaseria-2026-10-14/readme-check-results.json) |
| Empaquetado Worker | Wrangler 4.123.0 `deploy --dry-run`, exit 0, sin publicación | [build-results.txt](evidence/cosaseria-2026-10-14/build-results.txt) |
| Pruebas backend locales | 15/15 aserciones de caracterización pasan; varias demuestran defectos, no significan «producto correcto» | [contact-tests.mjs](evidence/cosaseria-2026-10-14/contact-tests.mjs), [contact-results.json](evidence/cosaseria-2026-10-14/contact-results.json) |
| Análisis HTML/assets/secretos | Sin enlaces locales faltantes en atributos inspeccionados; sin IDs duplicados; 5 JSON-LD válidos; cero patrones de secretos del conjunto buscado | [static.py](evidence/cosaseria-2026-10-14/static.py), [static-results.json](evidence/cosaseria-2026-10-14/static-results.json) |
| axe/Playwright | Nueve páginas, 36 tamaños; estados y fallos descritos arriba | [browser-results.json](evidence/cosaseria-2026-10-14/browser-results.json) |
| Verificación manual automatizada | Tab de modal escapa; PRE sí enfocable en Chromium; feedback sin live region; 200 contradictorio borra campos | [manual-results.json](evidence/cosaseria-2026-10-14/manual-results.json) |
| Lighthouse producción | Cuatro navegaciones, sin warnings; puntuaciones y límites anteriores | [lighthouse-summary.json](evidence/cosaseria-2026-10-14/lighthouse-summary.json), archivos `lh-*.json.gz` adyacentes |
| HTTP público | Canonical 200, www 522 dos veces, 404 real, README no expuesto, API GET no-store | [http-results.txt](evidence/cosaseria-2026-10-14/http-results.txt), `http-*.headers` |
| Productos externos | AuxiDocente, QuinielaRoyale, ValladolIA, denuncias Michoacán, dos proyectos familiares y App Store devolvieron 200 con títulos correspondientes | Mismo registro HTTP; solo accesibilidad pública, no auditoría funcional |

Las quince pruebas backend cubren: ausencia de token/bindings, token inválido, token demasiado reciente, token vencido, duplicación, truncamiento, error KV, error RAFAGA, consumo de cuota por intentos inválidos, origen ajeno, error de correo, configuración de correo ausente, GET sin firma, método no permitido y carrera del contador. **No hubo envío real:** `EMAIL.send` fue un doble en memoria.

Para consultar una ubicación aunque el working tree haya cambiado: `git show 2932725:public/index.html | nl -ba`. Reproducción básica desde la raíz de un checkout de la referencia auditada, conservando aparte estos artefactos de auditoría:

```sh
node --check src/contacto.js
node --check src/worker.js
node --check public/assets/js/site.js
node --check public/StoneVsSilicon/svs.js
node docs/audits/evidence/cosaseria-2026-10-14/contact-tests.mjs "$PWD"
python3 -m http.server 8897 --bind 127.0.0.1 --directory public
```

`static.py` y los scripts de navegador conservan las rutas exactas de esta máquina para trazabilidad; ajustar `root`, la ruta de Playwright y `/tmp/cosaseria-audit-tools` en **una copia de trabajo de los scripts de auditoría** si se reproducen en otro entorno. Herramientas instaladas para esta revisión exclusivamente en `/tmp`: Lighthouse 13.5.0 y axe-core 4.14.0. Playwright se reutilizó de la caché disponible. No se instalaron dependencias en el producto.

El servidor Python sirve solo archivos, no simula Cloudflare ni aplica `_headers`. Por eso headers se midieron directamente en producción y backend mediante dobles; no se presenta el servidor estático como prueba de integración del correo. Los scripts `browser.cjs`, `manual.cjs`, `lighthouse.mjs` y `http.sh` conservan procedimiento; `http.sh` solo hace GET. Un error de red del beacon en la inspección Playwright se produjo en una sesión que bloqueaba POST de producción: **no se atribuye como defecto del sitio**. Lighthouse no registró errores de consola.

## 10. Tabla priorizada de correcciones

P0: explotación crítica demostrada o indisponibilidad total del flujo sin alternativa. P1: corregir antes de presentar esta implementación/evidencia como garantía premium; incluye barreras AA, disponibilidad o bloqueadores de compra. P2: corrección programable con workaround o riesgo condicionado. P3: mantenimiento/precisión de bajo impacto. Esfuerzo estimado: XS ≤2 h; S 0.5–1 día; M 2–4 días; L ≥1 semana. No incluye aprobaciones legales, referencias de terceros ni acceso pendiente al panel.

| ID | Severidad | Tipo / confianza | Esfuerzo | Solución propuesta |
|---|---|---|---|---|
| CS-01 | P1 | Producción observada / alta; causa pendiente | S* | Reparar asociación/redirección www y vigilar ambos hosts |
| CS-02 | P1 | Ausencia en commit / alta | M | Toolchain fijada, pruebas Worker/DOM y CI mínimo |
| CS-08 | P1 | Defecto accesibilidad / alta | S | Live region y validación con lector de pantalla |
| CS-10 | P1 | Contradicción de privacidad / alta | M | Inventario de datos y aviso concordante |
| CS-11 | P1 | Defecto teclado / alta | S–M | Modal real, fondo inerte y retorno de foco |
| CS-12 | P1 | Defecto contraste / alta | XS | Cambiar token de texto y verificar 4.5:1 |
| CS-15 | P1 | Laboratorio / alta en ejecución; media generalización | M | Optimizar LCP real y diferir contenido oculto |
| CS-18 | P1 | Imprecisión técnica / alta | S–M | Reescribir cobro, atomicidad e idempotencia |
| CS-20 | P1 | Evidencia pública insuficiente / alta | L | Caso verificable, artefactos y referencias autorizadas |
| CS-21 | P1 | Información ausente / alta; riesgo inferido | M | Capacidad, continuidad y operación explícitas |
| CS-03 | P2 | Documentación incorrecta / alta | S | Runbook Workers vigente y comandos ejecutables |
| CS-04 | P2 | Pérdida de datos local / alta | S | Rechazar exceso, no truncar; límites alineados |
| CS-05 | P2 | Defecto de estado / alta | S–M | Renovación/retry del token y preservación de campos |
| CS-06 | P2 | Comportamiento confirmado; abuso potencial / alta-media | M | Validar bindings y especificar garantía del limiter |
| CS-07 | P2 | Excepción reproducida / alta | S | Respuestas controladas para fallos de dependencias |
| CS-09 | P2 | Contrato frágil reproducido / alta; impacto condicionado | M | Validar respuesta, timeout y recuperación/deduplicación |
| CS-13 | P2 | Semántica ARIA/idioma / alta | S | Controles correctos y nombres accesibles traducidos |
| CS-14 | P2 | Fallback roto / alta | M | Mejora progresiva y un único video sin JS |
| CS-16 | P2 | Riesgo de releases / alta en configuración | S–M | Versionar URLs o revalidar recursos |
| CS-17 | P2 | SEO estructural / alta; índice no observado | M | Rutas por idioma con metadata/hreflang recíprocos |
| CS-19 | P2 | Imprecisiones/heurísticas / alta-media | M | Delimitar tesis y añadir casos/trade-offs |
| CS-22 | P2 | Juicio de compra / media | M | Modalidades, entregables y siguiente paso |
| CS-23 | P2 | Opinión de posicionamiento / media | M | Ordenar proyectos por evidencia y pertinencia |
| CS-24 | P2 | Omisión editorial / alta | S | Integrar caso del juego en Trabajo si es relevante |
| CS-27 | P2 | Riesgo no explotado / media | S–M | Límite de cuerpo y tipos antes del parseo completo |
| CS-25 | P3 | Mantenibilidad / media | M | Fragmentos/generación mínima o checks compartidos |
| CS-26 | P3 | Semántica schema / alta | XS | Separar sameAs de persona y organización |

`S*`: depende del acceso a Cloudflare y de la causa real. No implica autorización para cambiar infraestructura durante esta auditoría.

## 11. Quick wins, mejoras estructurales y oportunidades

**Quick wins:** CS-12 y CS-13 (contraste/ARIA); CS-08 (feedback); CS-04 (longitudes); CS-03 (README); CS-26 (schema). Investigar CS-01 inmediatamente con acceso autorizado al panel. Corregir las frases más dañinas de CS-18 antes de ampliar el corpus editorial. Cada cambio debe cumplir su aceptación y no limitarse a silenciar una regla de herramienta.

**Mejoras estructurales:** tratar contacto como una máquina de estados verificable, cubrir errores de infraestructura y transporte, definir antiabuso y presupuesto de cuerpo; consolidar CI y política de caché; convertir modales e idiomas en mejoras progresivas; optimizar la landing con mediciones repetibles. En comercial, convertir la trayectoria en un expediente de proveedor mediante casos, capacidad comprometible y entregables de contratación.

**Largo plazo:** publicar ADR sanitizados, un caso de incidente/recuperación autorizado y un caso con medición antes/después reproducible; mantener un registro editorial de revisiones técnicas; conectar cada servicio a evidencia concreta; instrumentar el embudo con un inventario de datos coherente y métricas de campo. Medir calidad de leads y cierre por modalidad antes de rediseñar el sitio por gusto. No inventar números donde no existen: producir la evidencia.

La secuencia recomendada es: disponibilidad y errores de contacto → accesibilidad y privacidad → gates de validación → contenido técnico → expediente comercial → optimización/SEO → mantenimiento visual final. Los criterios de aceptación están junto a cada ID para que el implementador no tenga que reconstruir la investigación.

## 12. Limitaciones y verificaciones pendientes

1. **Producción de correo no verificada de extremo a extremo.** No se enviaron formularios ni mensajes externos. Pendiente una prueba autorizada a un buzón controlado con comprobación de recepción y fallos del proveedor.
2. **Cloudflare fuera del repositorio:** no se accedió a panel, DNS administrado, reglas WAF, secretos, alertas, logs, configuración de correo ni historial de despliegues. El 522 es real en las consultas, su causa no está probada.
3. **Sin auditoría de productos externos.** Solo GET público y títulos/estado. No se accedió a cuentas, datos de menores, sandbox de código, backend de IA ni binarios móviles. No se valida su seguridad a partir del copy.
4. **Sin verificación independiente de carrera, clientes o resultados.** Los enlaces no prueban una participación específica ni un cumplimiento contractual. No se contactó a referencias.
5. **Performance:** una corrida por perfil, desde esta máquina; sin distribución estadística, CrUX, RUM, INP ni móviles físicos. El LCP del juego merece repetición tras cambios; no se fabrican percentiles.
6. **Accesibilidad:** Chromium y axe más teclado/DOM; sin Safari, Firefox, VoiceOver/NVDA reales, validación completa de zoom 400 %, subtítulos, audiodescripción o todos los estados visuales. No hay certificación WCAG.
7. **Seguridad:** patrones limitados en snapshot actual, no escáner especializado de todo el historial; sin pentest, fuzzing intensivo, pruebas de carga, enumeración de endpoints ocultos o intentos de explotación en producción. No hay declaración de «cero vulnerabilidades».
8. **Calidad estática:** `HTMLParser` no es un validador normativo HTML completo. El análisis de enlaces no agota CSS, JS generado ni todos los estados; no se ejecutó un linter del proyecto porque no existe configuración en la referencia.
9. **Trabajo concurrente:** al cierre se observaron cambios externos en 14 archivos versionados, además de scripts y páginas de servicios nuevos. El diff ya corrige las rutas de comprobación del README (parte de CS-03), elimina los `hreflang` con fragmentos (parte de CS-17) y añade verificadores/páginas de servicios que afectan la reevaluación de CS-02 y CS-22. No se ejecutaron ni validaron como solución integral. El resto de pruebas/capturas y los números de línea pertenecen al snapshot inicial. Revisar esos deltas antes de implementar; no sobrescribir correcciones posteriores. La cifra de hallazgos es histórica respecto de la referencia, no una certificación del working tree final.
10. **Métricas comerciales:** no hay analytics de conversiones ni entrevistas con compradores. Dilución premium y claridad de contratación se clasifican como evaluación profesional, no como causalidad estadística.

## Evaluación final de la promesa pública

La evidencia respalda que existe un sitio, un fundador identificado, un conjunto de productos públicamente accesibles y una postura favorable a evitar complejidad gratuita. **No respalda todavía el salto de «ingeniero con trayectoria y productos» a «proveedor premium con capacidad demostrada de asumir y operar mi proyecto crítico».** Para ese salto faltan casos verificables, compromisos de capacidad, artefactos de entrega y controles de calidad reproducibles.

El inicio carga dentro de los umbrales de laboratorio observados y la separación entre fundador y estudio está escrita; negar esos hechos sería una auditoría sesgada. Lo que no se puede conceder es que estética, marcas de empleadores y una nota técnica equivalgan a evidencia contractual. Las imprecisiones del artículo y los fallos del formulario/modales reducen precisamente la credibilidad de las promesas de criterio y acabado.

El veredicto es **evidencia insuficiente para una contratación de alto valor basada solo en el sitio**. La corrección prioritaria no es parecer más premium: es presentar y sostener pruebas de que el estudio puede entregar, validar, transferir y operar lo que pretende vender.
