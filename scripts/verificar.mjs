// Comprobaciones de SEO técnico sobre el HTML que se publica.
// Sin dependencias. Falla con código 1 si encuentra un problema.
//
//   node scripts/verificar.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paginas, indexables, ORIGEN, PUBLICO, RAIZ } from './paginas.mjs';

const problemas = [];
const avisos = [];
const falla = (ruta, texto) => problemas.push(`${ruta}  ${texto}`);
const avisa = (ruta, texto) => avisos.push(`${ruta}  ${texto}`);

const todas = paginas();
const index = indexables();

// Rutas que existen en el sitio: páginas, archivos estáticos y el endpoint.
function existeRuta(ruta) {
  const limpia = ruta.split('#')[0].split('?')[0];
  if (limpia === '' || limpia === '/') return true;
  if (limpia === '/api/contacto') return true;
  const sinBarra = limpia.replace(/^\//, '');
  if (limpia.endsWith('/')) return existsSync(join(PUBLICO, sinBarra, 'index.html'));
  return existsSync(join(PUBLICO, sinBarra));
}

function resolver(base, destino) {
  if (/^(https?:|mailto:|tel:|data:|#)/.test(destino)) return null;
  if (destino.includes(' ')) destino = destino.split(/\s+/)[0]; // srcset
  return new URL(destino, ORIGEN + base).pathname;
}

const titulos = new Map();
const descripciones = new Map();

for (const p of todas) {
  const r = p.ruta;

  // Metadatos básicos.
  if (!p.lang) falla(r, 'sin atributo lang');
  if (!p.title) falla(r, 'sin <title>');
  if (!p.description) falla(r, 'sin meta description');
  if (p.title && p.title.length > 70) avisa(r, `title largo (${p.title.length} caracteres)`);
  if (p.description && p.description.length > 165) avisa(r, `description larga (${p.description.length} caracteres)`);
  if (!p.ogTitle || !p.ogDescription || !p.ogImage || !p.ogType) falla(r, 'Open Graph incompleto');
  if (!p.twitterCard) falla(r, 'sin twitter:card');
  if (p.ogImage && !p.ogImage.startsWith(ORIGEN)) falla(r, 'og:image no es absoluta');

  if (!p.esError) {
    if (!p.canonical) falla(r, 'sin canonical');
    else if (p.canonical !== p.url) falla(r, `canonical ${p.canonical} distinto de ${p.url}`);
    if (p.ogUrl && p.ogUrl !== p.url) falla(r, `og:url ${p.ogUrl} distinto de ${p.url}`);
  }

  // Un solo H1 por página.
  if (p.h1.length !== 1) falla(r, `${p.h1.length} elementos h1`);

  // Duplicados entre páginas indexables.
  if (!p.noindex && !p.esError) {
    if (titulos.has(p.title)) falla(r, `title duplicado con ${titulos.get(p.title)}`);
    titulos.set(p.title, r);
    if (descripciones.has(p.description)) falla(r, `description duplicada con ${descripciones.get(p.description)}`);
    descripciones.set(p.description, r);
  }

  // JSON-LD: debe parsear y tener @context.
  for (const bloque of p.jsonld) {
    try {
      const datos = JSON.parse(bloque);
      if (datos['@context'] !== 'https://schema.org') falla(r, 'JSON-LD sin @context de schema.org');
      const nodos = datos['@graph'] || [datos];
      for (const n of nodos) {
        if (!n['@type']) falla(r, 'nodo JSON-LD sin @type');
        if (n['@type'] === 'BreadcrumbList') {
          const items = n.itemListElement || [];
          const ultimo = items[items.length - 1];
          if (!ultimo || ultimo.item !== p.url) falla(r, 'el último breadcrumb no apunta a la página');
          items.forEach((it, i) => { if (it.position !== i + 1) falla(r, 'posiciones de breadcrumb fuera de orden'); });
        }
        if (n['@type'] === 'FAQPage') {
          for (const q of n.mainEntity || []) {
            const pregunta = q.name && q.name.replace(/\s+/g, ' ').trim();
            if (!pregunta || !p.html.replace(/\s+/g, ' ').includes(pregunta)) {
              falla(r, `pregunta del FAQPage ausente en el HTML visible: ${pregunta}`);
            }
          }
        }
      }
    } catch (e) {
      falla(r, `JSON-LD inválido: ${e.message}`);
    }
  }
  if (!p.esError && !p.noindex && p.jsonld.length === 0) avisa(r, 'sin JSON-LD');

  // Enlaces y recursos internos deben existir.
  for (const destino of p.enlaces) {
    const ruta = resolver(p.ruta, destino);
    if (ruta && !existeRuta(ruta)) falla(r, `enlace roto: ${destino}`);
  }

  // Páginas indexables no deben llevar hreflang hacia fragmentos.
  if (/hreflang="[^"]*"\s+href="[^"]*#/.test(p.cabecera)) falla(r, 'hreflang con fragmento (#) en la URL');
}

// El fragmento #id de los enlaces internos a otras páginas debe existir allí.
for (const p of todas) {
  for (const destino of p.anclas) {
    if (/^https?:/.test(destino)) continue;
    const [ruta, id] = destino.split('#');
    if (!id) continue;
    const base = ruta ? new URL(ruta, ORIGEN + p.ruta).pathname : p.ruta;
    const objetivo = todas.find((q) => q.ruta === base);
    if (!objetivo) continue;
    if (!new RegExp(`\\sid="${id}"`).test(objetivo.html)) falla(p.ruta, `ancla #${id} no existe en ${base}`);
  }
}

// Sitemap: mismas URL que las páginas indexables.
const sitemap = readFileSync(join(PUBLICO, 'sitemap.xml'), 'utf8');
const enSitemap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
for (const p of index) if (!enSitemap.has(p.url)) falla('/sitemap.xml', `falta ${p.url}`);
for (const u of enSitemap) if (!index.some((p) => p.url === u)) falla('/sitemap.xml', `sobra ${u}`);
for (const u of enSitemap) if (!u.startsWith(ORIGEN)) falla('/sitemap.xml', `URL no absoluta ${u}`);
if (!/^<\?xml version="1.0" encoding="UTF-8"\?>/.test(sitemap)) falla('/sitemap.xml', 'sin declaración XML');

// robots.txt: declara el sitemap y permite a los crawlers de búsqueda.
const robots = readFileSync(join(PUBLICO, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${ORIGEN}/sitemap.xml`)) falla('/robots.txt', 'no declara el sitemap');
for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'Claude-User']) {
  const re = new RegExp(`User-agent: ${bot}\\s*\\n(?:[^\\n]*\\n)*?Allow: /`, 'i');
  if (!re.test(robots)) falla('/robots.txt', `${bot} sin Allow explícito`);
}
if (/^Disallow:\s*\/\s*$/m.test(robots)) falla('/robots.txt', 'bloquea todo el sitio');

// llms.txt: todo enlace al sitio debe existir.
const llms = readFileSync(join(PUBLICO, 'llms.txt'), 'utf8');
for (const m of llms.matchAll(/\]\((https:\/\/cosaseria\.mx[^)]*)\)/g)) {
  const ruta = new URL(m[1]).pathname;
  if (!existeRuta(ruta)) falla('/llms.txt', `enlace roto: ${m[1]}`);
}

// Salida.
console.log(`${todas.length} páginas, ${index.length} indexables.`);
for (const a of avisos) console.log('aviso   ' + a);
for (const f of problemas) console.log('ERROR   ' + f);
if (problemas.length) {
  console.log(`\n${problemas.length} problema(s).`);
  process.exit(1);
}
console.log('Sin problemas.');
