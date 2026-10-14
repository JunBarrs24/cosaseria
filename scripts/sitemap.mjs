// Genera public/sitemap.xml a partir de las páginas indexables.
// lastmod sale del último commit que tocó cada archivo; si el archivo tiene
// cambios sin commit, se usa la fecha de hoy.
//
//   node scripts/sitemap.mjs            escribe el archivo
//   node scripts/sitemap.mjs --check    falla si el archivo está desactualizado

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { indexables, RAIZ } from './paginas.mjs';

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function fechaDe(archivo) {
  const rel = relative(RAIZ, archivo);
  const sucio = git('status', '--porcelain', '--', rel);
  if (sucio) return new Date().toISOString().slice(0, 10);
  const fecha = git('log', '-1', '--format=%ad', '--date=short', '--', rel);
  return fecha || new Date().toISOString().slice(0, 10);
}

export function generar() {
  const entradas = indexables().map((p) => {
    const fecha = fechaDe(p.archivo);
    return `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${fecha}</lastmod>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entradas.join('\n') + `\n</urlset>\n`;
}

const destino = join(RAIZ, 'public', 'sitemap.xml');
const nuevo = generar();

if (process.argv.includes('--check')) {
  const actual = readFileSync(destino, 'utf8');
  // Compara solo las URL: las fechas cambian con cada commit y eso es normal.
  const locs = (s) => [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).join('\n');
  if (locs(actual) !== locs(nuevo)) {
    console.error('sitemap.xml no coincide con las páginas indexables. Ejecuta: node scripts/sitemap.mjs');
    console.error('Esperado:\n' + locs(nuevo) + '\nActual:\n' + locs(actual));
    process.exit(1);
  }
  console.log('sitemap.xml al día (' + locs(nuevo).split('\n').length + ' URL).');
} else {
  writeFileSync(destino, nuevo);
  console.log('sitemap.xml escrito con ' + indexables().length + ' URL.');
}
