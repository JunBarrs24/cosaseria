// Inventario de páginas del sitio. Lo comparten sitemap.mjs y verificar.mjs.
// Sin dependencias: lee public/, encuentra cada index.html y extrae lo que
// hace falta de la cabecera con expresiones regulares. El HTML lo escribimos
// nosotros, así que el parser puede ser modesto.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGEN = 'https://cosaseria.mx';
export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLICO = join(RAIZ, 'public');

function* archivosHtml(directorio) {
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) {
      yield* archivosHtml(ruta);
    } else if (nombre.endsWith('.html')) {
      yield ruta;
    }
  }
}

function atributo(html, patron) {
  const m = html.match(patron);
  return m ? m[1].trim() : null;
}

function meta(html, nombre) {
  const re = new RegExp(
    `<meta\\s+(?:name|property)="${nombre}"\\s+content="([^"]*)"`, 'i'
  );
  const alterno = new RegExp(
    `<meta\\s+content="([^"]*)"\\s+(?:name|property)="${nombre}"`, 'i'
  );
  return atributo(html, re) ?? atributo(html, alterno);
}

export function leerPagina(archivo) {
  const html = readFileSync(archivo, 'utf8');
  const relativa = relative(PUBLICO, archivo).split('\\').join('/');
  let ruta;
  if (relativa === 'index.html') ruta = '/';
  else if (relativa.endsWith('/index.html')) ruta = '/' + relativa.slice(0, -'index.html'.length);
  else ruta = '/' + relativa.replace(/\.html$/, '');

  const robots = meta(html, 'robots') || '';
  const cabecera = html.slice(0, html.indexOf('<body'));

  const jsonld = [];
  const reScript = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = reScript.exec(html))) jsonld.push(m[1]);

  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)]
    .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

  const enlaces = [...html.matchAll(/\b(?:href|src|srcset|poster)="([^"]*)"/g)].map((x) => x[1]);

  // Anclas internas: href de <a> que llevan #, salvo los selectores de
  // idioma (data-set-lang), cuyo fragmento es un estado y no un id.
  const anclas = [...html.matchAll(/<a\b([^>]*)>/g)]
    .filter((x) => !/data-set-lang/.test(x[1]))
    .map((x) => (x[1].match(/\bhref="([^"]*#[^"]*)"/) || [])[1])
    .filter(Boolean);

  return {
    archivo,
    ruta,
    url: ORIGEN + ruta,
    html,
    cabecera,
    lang: atributo(html, /<html[^>]*\slang="([^"]*)"/),
    title: atributo(html, /<title>([\s\S]*?)<\/title>/),
    description: meta(html, 'description'),
    canonical: atributo(html, /<link\s+rel="canonical"\s+href="([^"]*)"/),
    robots,
    noindex: /noindex/i.test(robots),
    ogTitle: meta(html, 'og:title'),
    ogDescription: meta(html, 'og:description'),
    ogImage: meta(html, 'og:image'),
    ogUrl: meta(html, 'og:url'),
    ogType: meta(html, 'og:type'),
    twitterCard: meta(html, 'twitter:card'),
    jsonld,
    h1,
    enlaces,
    anclas,
    esError: relativa === '404.html',
  };
}

export function paginas() {
  return [...archivosHtml(PUBLICO)].map(leerPagina).sort((a, b) => a.ruta.localeCompare(b.ruta));
}

// Páginas que deben ir al sitemap: indexables, con canonical propio y no de error.
export function indexables() {
  return paginas().filter((p) => !p.noindex && !p.esError && p.canonical === p.url);
}
