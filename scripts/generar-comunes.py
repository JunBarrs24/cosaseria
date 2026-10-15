#!/usr/bin/env python3
"""Navegación común. El juego conserva navegación propia y añade soporte al pie."""
import sys
from comunes import ROOT, FOOTER, con_navegacion
for p in list((ROOT/'public').rglob('*.html'))+[ROOT/'templates/stone-vs-silicon.html']:
    if 'StoneVsSilicon' in p.parts: continue  # Generated from the game template next.
    s=p.read_text()
    ruta='/'+'/'.join(p.relative_to(ROOT/'public').parts[:-1])+'/' if 'public' in p.parts else ''
    pie=FOOTER
    if p.name=='stone-vs-silicon.html': pie=pie.replace('>Privacidad<','>Privacidad del sitio<').replace('</nav>','  <a href="/privacy-apps/">Apps · Privacy &amp; support</a>\n</nav>')
    s=con_navegacion(s,ruta,pie)
    if '--check' in sys.argv:
        if s!=p.read_text(): sys.exit(f'{p.relative_to(ROOT)}: navegación desactualizada; ejecuta npm run generate')
    else: p.write_text(s)
print('Navegación común '+('verificada' if '--check' in sys.argv else 'generada'))
