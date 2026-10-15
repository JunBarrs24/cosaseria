#!/usr/bin/env python3
"""Genera /bitacora/ desde contenido/bitacora/*.md; --check detecta salidas divergentes.
Solo Python estándar. Cada .md lleva un frontmatter breve y un Markdown mínimo:
párrafos, listas (- o 1.), citas (>), **negritas** y [enlaces](url).
"""
from html import escape
from pathlib import Path
import json
import math
import re
import sys
from comunes import ROOT, con_navegacion

ORIGEN = 'https://cosaseria.mx'
BASE = ORIGEN + '/bitacora/'
FUENTE = ROOT / 'contenido/bitacora'
DESTINO = ROOT / 'public/bitacora'
SERIES = {
    'alerta': 'Alerta de post incómodo',
    'egresado': 'Consejos para mi yo recién egresado',
}
MESES = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split()


def leer(archivo):
    texto = archivo.read_text()
    m = re.match(r'---\n([\s\S]*?)\n---\n', texto)
    if not m: raise ValueError(f'{archivo.name}: falta el frontmatter')
    datos = dict(linea.split(': ', 1) for linea in m[1].splitlines())
    for campo in ('titulo', 'slug', 'orden', 'resumen'):
        if not datos.get(campo): raise ValueError(f'{archivo.name}: falta {campo}')
    datos['orden'] = int(datos['orden'])
    datos['parte'] = int(datos.get('parte', 0))
    datos['md'] = texto[m.end():].strip()
    return datos


def en_linea(s):
    s = escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    def enlace(m):
        url = m[2].replace('"', '&quot;')
        rel = ' rel="noopener"' if url.startswith('http') else ''
        return f'<a href="{url}"{rel}>{m[1]}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', enlace, s)


def bloques(md):
    """Markdown mínimo a HTML. Las viñetas separadas por líneas vacías forman una sola lista."""
    out, lista = [], None
    def cerrar():
        nonlocal lista
        if lista:
            etiqueta, inicio, items = lista
            attr = f' start="{inicio}"' if etiqueta == 'ol' and inicio != 1 else ''
            out.append(f'      <{etiqueta}{attr}>\n' + ''.join(f'        <li>{i}</li>\n' for i in items) + f'      </{etiqueta}>')
        lista = None
    for b in re.split(r'\n\s*\n', md):
        b = b.strip()
        if b.startswith('>'):
            cerrar()
            parrafos = [p.strip() for p in re.sub(r'^> ?', '', b, flags=re.M).split('\n\n') if p.strip()]
            out.append('      <blockquote>\n' + ''.join(f'        <p>{en_linea(p)}</p>\n' for p in parrafos) + '      </blockquote>')
        elif b.startswith('- '):
            if not lista or lista[0] != 'ul': cerrar(); lista = ['ul', 1, []]
            lista[2].append(en_linea(b[2:]))
        elif re.match(r'\d+\. ', b):
            n = int(b.split('.')[0])
            if not lista or lista[0] != 'ol': cerrar(); lista = ['ol', n, []]
            lista[2].append(en_linea(b.split('. ', 1)[1]))
        else:
            cerrar()
            out.append(f'      <p>{en_linea(b)}</p>')
    cerrar()
    return '\n\n'.join(out) + '\n'


def fecha_larga(iso):
    a, m, d = iso.split('-')
    return f'{int(d)} de {MESES[int(m) - 1]} de {a}'


def con_punto(titulo):
    t = escape(titulo)
    return t + '<span class="punto">.</span>' if titulo[-1].isalnum() else t


def bloque_serie(e, entradas):
    clave = e.get('serie')
    if not clave or e['parte'] == 0: return ''
    partes = sorted((x for x in entradas if x.get('serie') == clave and x['parte']), key=lambda x: x['parte'])
    indice = next((x for x in entradas if x.get('serie') == clave and x['parte'] == 0), None)
    nombre = escape(SERIES[clave])
    if indice: nombre = f'<a href="/bitacora/{indice["slug"]}/">{nombre}</a>'
    items = ''.join(
        f'          <li><span aria-current="page">{escape(x["titulo"])}</span></li>\n' if x is e else
        f'          <li><a href="/bitacora/{x["slug"]}/">{escape(x["titulo"])}</a></li>\n' for x in partes)
    return (f'\n      <aside class="al-margen" aria-label="Serie">\n'
            f'        <p><b>Serie · {nombre}</b> · Parte {e["parte"]} de {len(partes)}</p>\n'
            f'        <ol>\n{items}        </ol>\n      </aside>\n\n')


def jsonld(grafo):
    return json.dumps({'@context': 'https://schema.org', '@graph': grafo}, ensure_ascii=False, indent=2)


def migas(*pares):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i, 'name': n, 'item': u} for i, (n, u) in enumerate(pares, 1)]}


def llenar(plantilla, valores):
    s = plantilla
    for k, v in valores.items(): s = s.replace('{{' + k + '}}', v)
    if '{{' in s: raise ValueError('Marcadores sin llenar: ' + ', '.join(set(re.findall(r'\{\{(\w+)\}\}', s))))
    return s


def pagina_entrada(e, entradas, plantilla):
    url = BASE + e['slug'] + '/'
    palabras = len(re.sub(r'[#>*\[\]()-]', ' ', e['md']).split())
    titulo_largo = f'{e["titulo"]} · Bitácora · CosaSeria.'
    posting = {
        '@type': 'BlogPosting', '@id': url, 'headline': e['titulo'], 'description': e['resumen'],
        'inLanguage': 'es-MX', 'mainEntityOfPage': url, 'url': url, 'image': ORIGEN + '/og.png',
        'author': {'@id': ORIGEN + '/#juan'}, 'publisher': {'@id': ORIGEN + '/#org'},
        'isPartOf': {'@id': BASE}, 'wordCount': palabras,
    }
    if e.get('fecha'): posting['datePublished'] = e['fecha']
    return llenar(plantilla, {
        'title': escape(titulo_largo if len(titulo_largo) <= 70 else f'{e["titulo"]} · CosaSeria.'),
        'descripcion': escape(e['resumen']), 'url': url, 'titulo': escape(e['titulo']),
        'og_fecha': f'<meta property="article:published_time" content="{e["fecha"]}">\n' if e.get('fecha') else '',
        'jsonld': jsonld([migas(('Inicio', ORIGEN + '/'), ('Bitácora', BASE), (e['titulo'], url)), posting]),
        'h1': con_punto(e['titulo']),
        'meta_fecha': f'      <span>{fecha_larga(e["fecha"])}</span>\n' if e.get('fecha') else '',
        'lectura': str(max(1, math.ceil(palabras / 200))),
        'cuerpo': bloques(e['md']), 'serie': bloque_serie(e, entradas),
    })


def pagina_indice(entradas, plantilla):
    items = []
    for e in entradas:
        palabras = len(e['md'].split())
        if e.get('serie'): etiqueta = 'Índice de serie' if e['parte'] == 0 else f'Serie · {e["parte"]} de {sum(1 for x in entradas if x.get("serie") == e["serie"] and x["parte"])}'
        else: etiqueta = ''
        if e.get('fecha'): etiqueta = (etiqueta + ' · ' if etiqueta else '') + f'{MESES[int(e["fecha"][5:7]) - 1][:3].capitalize()} {e["fecha"][:4]}'
        items.append(
            f'          <article class="nota-item">\n'
            f'            <span class="num">{max(1, math.ceil(palabras / 200))} min</span>\n'
            f'            <h3><a href="/bitacora/{e["slug"]}/">{escape(e["titulo"])}</a></h3>\n'
            + (f'            <span class="fecha">{etiqueta}</span>\n' if etiqueta else '')
            + f'            <p class="resumen">{escape(e["resumen"])}</p>\n'
            f'          </article>\n')
    descripcion = 'Lo que Juan Barrera, fundador de CosaSeria, ha ido pensando sobre ingeniería, equipos y criterio. Textos cortos publicados primero en LinkedIn.'
    blog = {'@type': 'Blog', '@id': BASE, 'name': 'Bitácora', 'url': BASE, 'inLanguage': 'es-MX', 'description': descripcion,
            'author': {'@id': ORIGEN + '/#juan'}, 'publisher': {'@id': ORIGEN + '/#org'}, 'isPartOf': {'@id': ORIGEN + '/#sitio'}}
    return llenar(plantilla, {
        'title': 'Bitácora · CosaSeria.', 'descripcion': escape(descripcion), 'url': BASE, 'titulo': 'Bitácora',
        'jsonld': jsonld([migas(('Inicio', ORIGEN + '/'), ('Bitácora', BASE)), blog]),
        'entradas': '\n'.join(items).rstrip('\n'),
    })


def generar():
    entradas = sorted((leer(f) for f in FUENTE.glob('*.md')), key=lambda e: e['orden'])
    slugs = [e['slug'] for e in entradas]
    if len(set(slugs)) != len(slugs): raise ValueError('Slugs repetidos')
    pe, pi = (ROOT / 'templates/bitacora-entrada.html').read_text(), (ROOT / 'templates/bitacora-indice.html').read_text()
    paginas = {'index.html': pagina_indice(entradas, pi)}
    for e in entradas: paginas[e['slug'] + '/index.html'] = pagina_entrada(e, entradas, pe)
    return {r: con_navegacion(html, '/bitacora/' + r.removesuffix('index.html')) for r, html in paginas.items()}


if __name__ == '__main__':
    esperado = generar()
    actuales = {str(p.relative_to(DESTINO)) for p in DESTINO.rglob('*.html')} if DESTINO.exists() else set()
    if '--check' in sys.argv:
        for ruta, html in esperado.items():
            destino = DESTINO / ruta
            if not destino.exists() or destino.read_text() != html: sys.exit(f'bitacora/{ruta} desactualizado: ejecuta python3 scripts/generar-bitacora.py')
        if actuales - set(esperado): sys.exit('Sobran páginas en public/bitacora: ' + ', '.join(sorted(actuales - set(esperado))))
    else:
        for sobrante in actuales - set(esperado):
            (DESTINO / sobrante).unlink()
            if (DESTINO / sobrante).parent != DESTINO and not any((DESTINO / sobrante).parent.iterdir()): (DESTINO / sobrante).parent.rmdir()
        for ruta, html in esperado.items():
            destino = DESTINO / ruta
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(html)
    print(f'Bitácora: {len(esperado) - 1} entradas ' + ('verificadas' if '--check' in sys.argv else 'generadas'))
