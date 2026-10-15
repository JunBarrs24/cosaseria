# Correcciones de CosaSeria — 14 de octubre de 2026

Seguimiento de los **22 IDs seleccionados por el usuario** en [la auditoría original](cosaseria-audit.md). La auditoría es un registro histórico; sus números de línea y mediciones no describen esta versión corregida. No se hicieron commits, despliegues ni envíos de prueba a producción.

**Primera modificación:** StoneVsSilicon se añadió a Trabajo. La ficha usa el relato proporcionado por el usuario, enlaza a la página y al App Store y distingue iPhone disponible de Android/PvP previstos. No atribuye al estudio contratos o resultados nuevos.

Las correcciones de código y contenido están implementadas. Pasaron las verificaciones locales indicadas abajo. Esto **no cierra** las comprobaciones manuales con lector de pantalla, la configuración de la cuenta real, la indexación ni la validación comercial con compradores.

## Matriz de seguimiento

Las líneas corresponden al working tree corregido. Los criterios pendientes se detallan al final.

| ID | Cambio implementado y ubicación | Evidencia / aceptación local |
|---|---|---|
| CS-04 | `src/contacto.js:1,140` rechaza exceso sin recortar; `public/index.html` alinea los cuatro `maxlength`. | 120/160/200/8000 unidades UTF-16. Las cuatro pruebas max+1 retornan 422 sin enviar; 8000 unidades, incluidos emoji y saltos de línea, conservan el mensaje exacto (CRLF del transporte se normaliza a LF). Check compartido detecta divergencia. |
| CS-05 | `public/assets/js/site.js:157` permite reintentar la obtención del token, renueva antes de vencer y renueva/reintenta una vez ante rechazo explícito. `src/contacto.js:96` admite token fresco sin espera artificial. | Fallo inicial de GET se recupera; 403 TOKEN_CADUCADO produce nuevo GET y segundo POST con el mismo ID y texto. Campos conservados al fallar. |
| CS-06 | `src/contacto.js:30,157`, `src/registro-contacto.js:11`, `wrangler.jsonc`: bindings obligatorios; cuota horaria consistente con Durable Objects SQLite. | Ausencia de cada dependencia: 503. En runtime real, 12 solicitudes concurrentes admiten exactamente 5 IDs; repetir uno admitido no consume otra plaza. Ráfaga nativa documentada como aproximada, por ubicación. |
| CS-07 | `src/contacto.js:174`, `src/worker.js:25`: errores de infraestructura controlados, referencia y cabeceras incluso en redirects. | Fallos de RAFAGA/CONTACTO retornan 503 sin filtrar la excepción. HTML preserva/escapa datos disponibles; éxito nativo retorna 303 con no-store y cabeceras. |
| CS-08 | `public/index.html:529`, `public/assets/js/site.js:144,187`: región persistente status/polite/atomic, validación asociada al campo y recuperación de foco tras desbloquearlo. | DOM y escenarios de envío, éxito, 400, 422, 429, 503, red y timeout verificados. `aria-busy` está en el botón, no en el ancestro de la live region. **Pendiente escucha real VoiceOver/NVDA.** |
| CS-09 | `public/assets/js/site.js:148,172`, `src/registro-contacto.js:23`, `src/contacto.js:147`: esquema, timeout de 15 s, ID estable y reserva durable antes del efecto externo. | 200 con JSON inválido, contrato incompleto o ok:false no borra campos. Ocho solicitudes concurrentes + reintentos llaman EMAIL una vez. Error, recibo inválido y fallo al guardar recibo no disparan un segundo correo. Nativo: primera confirmación sin efecto, después POST con ID. |
| CS-10 | `public/privacidad/index.html:134`, `src/contacto.js:162`, README: inventario de contacto, IP, HMAC, registros, proveedores, analítica y almacenamiento local. | La aplicación ya no guarda IP literal en la cuota. Finalidad/retención de datos activos documentadas; no se promete anonimato ni borrado automático del buzón. **Logs y retención del proveedor/buzón requieren acceso operativo.** |
| CS-11 | `public/StoneVsSilicon/svs.js:11`: mejora a dialog.showModal(), fondo inerte nativo, contención explícita de Tab/Shift+Tab, Escape/cierre y restauración al disparador. | Los tres diálogos pasan navegación por teclado y axe en ES/EN a 390/1440 px. **Lectura real y Safari/iOS pendientes.** |
| CS-12 | `public/StoneVsSilicon/svs.css`: token `--vs-texto:#8A3B00` para el aviso sobre `#E8E4D9`. | Contraste calculado **6.108:1**; mínimo requerido 4.5:1. Axe sin la violación en ambos idiomas. Naranja decorativo conservado. |
| CS-13 | `templates/stone-vs-silicon.html`, `scripts/generar-juego.py`: enlaces reales con aria-current; etiquetas y metadata localizadas. Poder tiene rol img y nombre traducido. Las imágenes de personajes son decorativas junto a su descripción completa en el idioma activo. | Sin aria-pressed en enlaces; axe sin ARIA inválido; HTML lang correcto, nombres de controles y poder traducidos. |
| CS-14 | Plantilla del juego + `svs.js`: secciones legibles como base; solo se vuelven modales si existe showModal. Un video con source real por ruta, sin duplicado noscript. | Con JavaScript desactivado se leen historia y alineaciones, funcionan anclas/idiomas y **el único video se reproduce** en ES y EN. |
| CS-15 | Logo AVIF responsive 400/800/1000 con fallback WebP, prioridad alta en el LCP real, script defer, templates inertes de imágenes y posters/video al aproximarse al viewport. | Laboratorio local: mediana LCP **2.029 s**, CLS 0, performance 99. Ningún recurso exclusivo de roster cerrado, poster o MP4 se solicita al inicio de los casos de navegador. Capturas revisadas en DPR 1/2/3. **p75 real pendiente.** |
| CS-16 | `public/_headers`, referencias CSS/JS de todas las páginas: revalidación de recursos mutables y query de transición `v=20261014`. | Chrome conserva la caché del release A y obtiene CSS/JS del B sin hard refresh. Las fuentes immutable no se sobrescribieron; README exige nombres nuevos al actualizarlas. |
| CS-17 | `/StoneVsSilicon/` y `/StoneVsSilicon/en/`, generadas de una fuente: HTML y metadata propios, canonical propio, hreflang recíproco y x-default, sitemap. | Check estático y navegación sin JS comprueban idiomas deterministas. No hay elección implícita por localStorage/navegador. **Indexación/Search Console pendientes tras publicar.** |
| CS-18 | `public/notas/microservicios-cuando-no/index.html:242`: cobro externo, transacción local, incertidumbre, reserva atómica, deduplicación, proveedor y conciliación. | Desaparece la falsa equivalencia monolito=atomicidad. Pseudocódigo identificado; no promete que una clave produzca exactly-once. Bloque largo operable por teclado en móvil. |
| CS-19 | Artículo `:183,195,261,279` y resúmenes: independencia condicional, aislamiento de proceso frente a pools, redes/colas, repositorio frente a despliegue, heurísticas sin plazos/cifras universales. | Revisión editorial y enlaces a AWS/Microsoft. Escena inicial identificada como hipotética; timeouts/reintentos sin valores arbitrarios. No se presenta una postura arquitectónica como ley universal. |
| CS-22 | `public/servicios/index.html:272` y contexto del contacto en inicio: diagnóstico, implementación por hitos, acompañamiento, entregables, exclusiones y siguiente paso. | El contenido permite distinguir primera compra y resultado esperado. No inventa tarifas, SLA, plazos de respuesta o disponibilidad. **La prueba con cinco compradores no se ejecutó.** |
| CS-23 | `public/trabajo/index.html:212,235,400`: primero producto operativo y juego publicado; quiniela descrita como experimento; laboratorio personal colapsable con límites de evidencia. | Capacidad observable separada de resultados no publicados. Productos propios, trayectoria personal y trabajos privados permanecen diferenciados. No se inventan métricas, clientes ni validación de sandboxes externos. |
| CS-24 | `public/trabajo/index.html:235`: ficha de StoneVsSilicon, responsabilidad, gameplay, estado y enlaces. | Desde Trabajo se llega al juego en un clic. Publicación iPhone y futuro Android/PvP diferenciados. Captura móvil inspeccionada. |
| CS-25 | `templates/nav-principal.html`, `nav-pie.html`, `scripts/generar-comunes.py`; plantilla bilingüe y `--check`; `scripts/verificar.mjs`. | Navegación común se edita en una fuente y se propaga; excepciones del juego explícitas. Checks detectan divergencias de salidas, sello SVG, schema y límites. Comentario copiado que negaba build/dependencias eliminado. Sin framework nuevo. |
| CS-26 | JSON-LD de organización en inicio/notas; verificador compartido. | Perfiles personales permanecen en Person, no en Organization.sameAs. Check falla si vuelven a solaparse. |
| CS-27 | `src/contacto.js:70`: MIME permitido, Content-Length temprano y conteo del stream antes de formData; campos de texto, únicos y conocidos. | JSON=415, multipart roto=400, archivo/repetidos=400, stream de 128 KiB+1 sin Content-Length=413 y cancelación de lectura. Ningún correo en esos rechazos. |

## Decisión operativa importante: deduplicación

Se reemplaza el KV anterior por **Durable Objects SQLite** para coordinar cuotas y reservas. Es estado adicional, con costo y operación propios; no es un cambio puramente visual. `wrangler.jsonc` contiene binding CONTACTO y migración `contacto-v1`. No se aplicaron en la cuenta.

La garantía elegida es **como máximo una invocación de EMAIL por ID válido**, no exactamente una entrega. Un timeout después del cobro/envío no demuestra que el efecto no ocurrió. El registro reserva primero; si el proceso cae antes de invocar al proveedor, el intento puede quedar sin enviar. Si cae al guardar el recibo, un retry devuelve pendiente sin repetir el efecto. Se requiere conciliación del estado incierto; README documenta no borrar reservas para reenviar a ciegas.

El registro de envío guarda huella protegida y estado, no el texto en claro. El ID caduca a las 24 h; la eliminación se programa a las 24 h + un minuto. La cuota usa IP transformada con HMAC + hora UTC, máximo cinco IDs, con alarma a 61 minutos de su primera escritura. Esto no es protección absoluta contra bots, IP rotatorias o costos de tráfico hostil. NAT comparte cuota y rotar el secreto durante una ventana cambia las claves.

Para el formulario sin JavaScript, el primer POST presenta el texto y un botón **Confirmar envío**, sin correo. Esa página ya incluye el ID que acompañará al POST con efecto. Así, reenviar la confirmación reutiliza la reserva. Los rechazos tempranos que no pudieron leer un cuerpo válido no pueden reconstruirlo en HTML; el cliente con JS mantiene sus campos. El borrador no se persiste fuera de la página y puede perderse al cerrarla/recargarla.

## Pruebas y resultados

Evidencia en [cosaseria-fixes-2026-10-14](evidence/cosaseria-fixes-2026-10-14/).

| Herramienta / comando | Resultado |
|---|---|
| `npm test` / Node 24.1.0 | **18/18**: límites, exactitud, tokens, bindings, fallos, streams, MIME, archivos, duplicados, HTML escapado, origen y ráfaga. [Salida](evidence/cosaseria-fixes-2026-10-14/contact-tests.txt). |
| `npm run test:runtime` | **6 grupos aprobados** en workerd + SQLite reales: cuota concurrente, éxito/error/recibo inválido con reintentos, fallo al guardar recibo y proveedor lento. Transporte de correo simulado; no envío externo. [Resumen observado](evidence/cosaseria-fixes-2026-10-14/runtime-summary.json). |
| `npm run test:browser` / Playwright 1.62.1 + Chrome | **26 escenarios aprobados**, incluidos 12 casos de contacto. Teclado y axe en juego ES/EN, 390/1440; cinco páginas corporativas móviles; noJS con reproducción; DPR 2/3; dos releases con caché. [JSON](evidence/cosaseria-fixes-2026-10-14/browser.json). |
| axe-core 4.14.0 | Cero violaciones en los estados evaluados. Para páginas corporativas se usa reduced-motion para medir contenido estable y evitar capturar la animación de aparición. No sustituye auditoría manual de todas las páginas/estados. |
| `npm run check` | **16 páginas, 14 indexables**, generación y sitemap coherentes, sin problemas. [Salida](evidence/cosaseria-fixes-2026-10-14/static-checks.txt). |
| `node --check` | Worker, contacto, registro durable y ambos JS del navegador pasan. |
| Wrangler 4.151.0 `deploy --dry-run` | Empaquetado correcto; binding CONTACTO/migración reconocidos. No conectó recursos ni publicó. [Salida y tamaño](evidence/cosaseria-fixes-2026-10-14/build.txt). |
| `npm audit` | **0 vulnerabilidades reportadas**, tras actualizar las herramientas. Solo dependencias de desarrollo. [JSON](evidence/cosaseria-fixes-2026-10-14/npm-audit.json). |
| `git diff --check` | Sin errores de whitespace tras limpiar las salidas generadas. |

### Rendimiento: comparación local, no producción

Lighthouse **13.5.0**, perfil móvil predeterminado, Chrome headless, servidor local con gzip, mismo equipo y configuración. Baseline: copia de `HEAD/public` anterior a estas correcciones. Una ejecución baseline y tres después de optimizar. Los informes completos conservan perfil, entorno, URL local y advertencias; [resumen](evidence/cosaseria-fixes-2026-10-14/lighthouse.json).

| Métrica | Baseline local | Después |
|---|---:|---:|
| Performance | 85 | 99 / 99 / 99 |
| LCP | 4281 ms | 2030 / 2029 / 2027 ms; mediana **2029 ms** |
| CLS | 0 | 0 / 0 / 0 |
| TBT | 0 ms | 0 / 0 / 0 ms |
| Transferencia de navegación medida | 842743 bytes | 422917 bytes |
| Lighthouse Accessibility | 90 | 100 en las tres ejecuciones |

El logo siguió siendo el elemento LCP. La variante AVIF de 800 px pesa **30293 bytes**, frente a **134374** del WebP original; en DPR 3 se usa una variante de 1000 px para no reducir innecesariamente la resolución. El resto del ahorro proviene de aplazar recursos de alineaciones y posters. No se descargan ambas versiones de idioma.

No se compara causalmente este baseline con los **5288 ms medidos en producción durante la auditoría**: latencia, CDN y entorno difieren. Tampoco se presenta Accessibility 100 como cumplimiento total WCAG. Aún hay sugerencias de Lighthouse sobre imágenes fuera del LCP y recursos bloqueantes; no impiden cumplir el umbral de laboratorio solicitado.

## Revisiones pendientes y condiciones antes de publicar

1. **Cuenta Cloudflare / despliegue:** aplicar y comprobar CONTACTO/migración en staging cuando se autorice publicar, confirmar EMAIL, RAFAGA, remitente, destino y secreto. Ejecutar un envío autorizado a buzón de prueba, recepción real y reintento del mismo ID. Dry-run no acredita nada de esto. El KV antiguo no se borró.
2. **Accesibilidad manual:** VoiceOver o NVDA deben anunciar una sola vez envío/éxito/400/429/error de red; comprobar mensajes de validación sin duplicidad de anuncio, tres modales y retorno de foco. Chrome/axe/DOM no demuestran escucha real. Probar también Safari/iOS y zoom de texto.
3. **Privacidad operativa:** inventariar en la cuenta retención/acceso de logs, copias de recuperación y buzón; asignar responsable del borrado manual y comprobar la atención de solicitudes. El aviso evita plazos inventados de esos sistemas; no es un dictamen jurídico.
4. **Campo y buscadores:** medir p75 LCP/INP/CLS con tráfico representativo y validar indexación/canonical/hreflang en Search Console después del despliegue. No hay datos para prometer mejora de ranking/conversión.
5. **Compra:** presentar modalidades y fichas a cinco CTO/compradores reales; pedir que expliquen primera intervención, entregables y exclusiones. Ajustar según sus respuestas. Los nuevos textos reducen ambigüedad, pero no prueban capacidad operativa o resultados empresariales no publicados.
6. **Cachés existentes:** la transición de CSS/JS usa URL nueva. No sobrescribir fuentes immutable ni recursos que clientes antiguos aún tengan frescos; futuros cambios de esos archivos deben cambiar URL. Verificar cabeceras efectivas del CDN tras publicar.

No queda un bloqueo local de build o pruebas. Los puntos anteriores limitan el cierre de aceptación en producción y las afirmaciones que pueden hacerse sobre accesibilidad, privacidad y efecto comercial.
