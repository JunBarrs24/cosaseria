#!/usr/bin/env python3
"""Navegación común. El juego conserva navegación propia y añade soporte al pie."""
from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
header=(ROOT/'templates/nav-principal.html').read_text().strip()
footer=(ROOT/'templates/nav-pie.html').read_text().strip()
for p in list((ROOT/'public').rglob('*.html'))+[ROOT/'templates/stone-vs-silicon.html']:
    if 'StoneVsSilicon' in p.parts: continue  # Generated from the game template next.
    s=p.read_text()
    ruta='/'+'/'.join(p.relative_to(ROOT/'public').parts[:-1])+'/' if 'public' in p.parts else ''
    principal=header
    for href in re.findall(r'href="([^"]+)"',header):
        if ruta.startswith(href) and '#' not in href: principal=principal.replace(f'href="{href}"',f'href="{href}" aria-current="page"')
    s=re.sub(r'<nav class="nav" aria-label="Principal">[\s\S]*?</nav>',lambda _:principal,s)
    pie=footer
    if p.name=='stone-vs-silicon.html': pie=pie.replace('>Privacidad<','>Privacidad del sitio<').replace('</nav>','  <a href="/privacy-apps/">Apps · Privacy &amp; support</a>\n</nav>')
    s=re.sub(r'<nav class="pie-nav" aria-label="Pie de página">[\s\S]*?</nav>',lambda _:pie,s)
    if '--check' in sys.argv:
        if s!=p.read_text(): sys.exit(f'{p.relative_to(ROOT)}: navegación desactualizada; ejecuta npm run generate')
    else: p.write_text(s)
print('Navegación común '+('verificada' if '--check' in sys.argv else 'generada'))
