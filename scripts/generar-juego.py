#!/usr/bin/env python3
"""Genera ambas rutas desde una fuente; --check detecta ediciones divergentes.
Solo Python estándar. Conserva el marcado SVG original y las entidades HTML.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cosaseria.mx/StoneVsSilicon/'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Idioma(HTMLParser):
    def __init__(self, idioma):
        super().__init__(convert_charrefs=False)
        self.idioma, self.stack, self.out = idioma, [], []
    def handle_starttag(self, tag, attrs):
        clases = dict(attrs).get('class', '').split()
        omitido = (self.stack and self.stack[-1]) or ('en' if self.idioma == 'es' else 'es') in clases
        if not omitido: self.out.append(self.get_starttag_text())
        if tag not in VOID: self.stack.append(bool(omitido))
    def handle_startendtag(self, tag, attrs):
        if not (self.stack and self.stack[-1]): self.out.append(self.get_starttag_text())
    def handle_endtag(self, tag):
        if not self.stack: raise ValueError('Etiqueta sin apertura: ' + tag)
        if not self.stack.pop(): self.out.append('</' + tag + '>')
    def emitir(self, s):
        if not (self.stack and self.stack[-1]): self.out.append(s)
    def handle_data(self, s): self.emitir(s)
    def handle_comment(self, s): self.emitir('<!--' + s + '-->')
    def handle_decl(self, s): self.emitir('<!' + s + '>')
    def handle_entityref(self, s): self.emitir('&' + s + ';')
    def handle_charref(self, s): self.emitir('&#' + s + ';')


def generar(idioma):
    parser = Idioma(idioma)
    parser.feed((ROOT / 'templates/stone-vs-silicon.html').read_text())
    parser.close()
    if parser.stack: raise ValueError('Etiquetas sin cerrar')
    s = ''.join(parser.out)
    ingles = idioma == 'en'
    url = BASE + ('en/' if ingles else '')
    titulo = 'StoneVsSilicon · ' + ('Offline strategy for iPhone' if ingles else 'Estrategia para iPhone')
    desc = ('Five tactical duels. Cavemen against machines: choose your characters and manage your resources. Available for iPhone, offline, no account, no ads.' if ingles else 'Cinco duelos de ingenio. Cavernícolas contra máquinas: elige personajes y administra tus recursos. Disponible para iPhone, sin conexión, cuenta ni anuncios.')
    s = s.replace('<html lang="es-MX" data-lang="es">', f'<html lang="{"en" if ingles else "es-MX"}" data-lang="{idioma}">')
    s = re.sub(r'<title>.*?</title>', '<title>' + titulo + '</title>', s)
    for attr, nombre, valor in [('name','description',desc),('property','og:title',titulo),('property','og:description',desc),('property','og:url',url),('name','twitter:title',titulo),('name','twitter:description',desc),('property','og:locale','en_US' if ingles else 'es_MX'),('property','og:locale:alternate','es_MX' if ingles else 'en_US')]:
        s = re.sub(fr'(<meta {attr}="{nombre}" content=")[^"]*', lambda m:m[1]+valor, s)
    s = re.sub(r'<link rel="canonical"[^>]+>', '<link rel="canonical" href="'+url+'">\n'+''.join(f'<link rel="alternate" hreflang="{code}" href="{target}">\n' for code,target in [('es-MX',BASE),('en',BASE+'en/'),('x-default',BASE)]),s)
    s = s.replace(f'data-set-lang="{idioma}"', f'data-set-lang="{idioma}" aria-current="page"')
    s = re.sub(r'aria-label="([^"]+) / ([^"]+)"',lambda m:'aria-label="'+m[2 if ingles else 1]+'"',s)
    if ingles:
        for a,b in {'CosaSeria. Engineering studio. Inicio':'CosaSeria. Engineering studio. Home','Pie de página':'Footer','PODER ':'POWER ','>Servicios<':'>Services (Spanish)<','>Trabajo<':'>Work (Spanish)<','>Notas<':'>Notes (Spanish)<','>Privacidad del sitio<':'>Site privacy (Spanish)<','Hecho a conciencia en México':'Made with care in Mexico','Stone y Silicon frente a frente: cavernícolas de un lado, máquinas del otro.':'Stone and Silicon face off: cavemen against machines.'}.items(): s=s.replace(a,b)
    def schema(m):
        data=json.loads(m[1])
        for n in data['@graph']:
            if n['@type']=='BreadcrumbList':
                n['itemListElement'][-1]['item']=url
                if ingles: n['itemListElement'][0]['name']='Home'
            elif n['@type']=='WebPage': n.update({'@id':url,'url':url,'inLanguage':'en' if ingles else 'es-MX'})
            elif isinstance(n['@type'],list):
                n.update(operatingSystem='iOS',gamePlatform='iOS',description=desc)
        return '<script type="application/ld+json">\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n</script>'
    s = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>',schema,s)
    return '\n'.join(line.rstrip() for line in s.splitlines()) + '\n'

if __name__ == '__main__':
    for idioma,ruta in [('es','StoneVsSilicon/index.html'),('en','StoneVsSilicon/en/index.html')]:
        destino=ROOT/'public'/ruta
        esperado=generar(idioma)
        if '--check' in sys.argv:
            if not destino.exists() or destino.read_text()!=esperado: sys.exit(f'{ruta} desactualizado: ejecuta python3 scripts/generar-juego.py')
        else:
            destino.parent.mkdir(parents=True,exist_ok=True)
            destino.write_text(esperado)
    print('StoneVsSilicon: ES y EN '+('verificados' if '--check' in sys.argv else 'generados'))
