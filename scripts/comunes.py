"""Navegación común. La comparten generar-comunes.py y los generadores de páginas."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HEADER = (ROOT / 'templates/nav-principal.html').read_text().strip()
FOOTER = (ROOT / 'templates/nav-pie.html').read_text().strip()


def con_navegacion(s, ruta, pie=FOOTER):
    """Reemplaza ambas navegaciones y marca la sección activa según la ruta."""
    principal = HEADER
    for href in re.findall(r'href="([^"]+)"', HEADER):
        if ruta.startswith(href) and '#' not in href: principal = principal.replace(f'href="{href}"', f'href="{href}" aria-current="page"')
    s = re.sub(r'<nav class="nav" aria-label="Principal">[\s\S]*?</nav>', lambda _: principal, s)
    return re.sub(r'<nav class="pie-nav" aria-label="Pie de página">[\s\S]*?</nav>', lambda _: pie, s)
