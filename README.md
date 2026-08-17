# cosaseria

Esta página es cosa seria.

Sitio estático servido en Cloudflare Pages. Sin build, sin bundler, sin
dependencias. Un HTML por página, una hoja de estilos, un archivo de JavaScript
y una Pages Function.

Este archivo queda accesible por URL, igual que cualquier otro versionado en la
raíz. No pongas aquí nada que no publicarías.

## Estructura

```
index.html                 inicio
trabajo/                   evidencia, en tres categorías
notas/                     bitácora
notas/<slug>/              cada nota
privacidad/                aviso
gracias/                   acuse tras enviar el formulario
404.html                   página de error
assets/css/site.css        estilos, incluye los @font-face
assets/js/site.js          progresivo, nada indispensable
assets/fonts/              tipografías autoalojadas (woff2)
functions/api/contacto.js  Pages Function del formulario
_headers                   cabeceras de seguridad y caché
llms.txt                   resumen del sitio para motores de respuesta
og.png                     tarjeta social 1200x630
```

## Despliegue

Variables de entorno en Pages → Settings → Environment variables, todas como
secreto: `RESEND_API_KEY`, `CORREO_DESTINO`, `CORREO_ORIGEN`, `FIRMA_SECRETO`.

Bindings: `LIMITES`, un KV namespace. **Es obligatorio en producción.** Verifica
que exista después de cada cambio de entorno.

El límite de envíos que sí conviene tener se configura además como regla de Rate
Limiting del WAF sobre la ruta `/api/contacto`.

## CSP

`_headers` publica la política en modo `Report-Only`. Cuando lleve una semana sin
reportes, cambia el nombre de la cabecera a `Content-Security-Policy` para que
pase a aplicarse.

El `'unsafe-inline'` de `style-src` es necesario mientras existan atributos
`style=` en el HTML. Moverlos a clases permitiría quitarlo.

## Tipografías

Autoalojadas en `assets/fonts` como woff2, con subconjuntos `latin` y
`latin-ext`. Archivo comparte archivo entre los pesos 400 y 700 porque Google
sirve la fuente variable. Para actualizarlas hay que volver a descargar los
woff2 y ajustar los `@font-face` al inicio de `site.css`.

## Comprobaciones antes de publicar

```sh
node --check functions/api/contacto.js
node --check assets/js/site.js
python3 -m http.server 8899
```
