#!/bin/zsh
set -u
out=/tmp/cosaseria-audit-evidence
for item in 'home|' 'trabajo|trabajo/' 'notas|notas/' 'articulo|notas/microservicios-cuando-no/' 'privacidad|privacidad/' 'apps|privacy-apps/' 'svs|StoneVsSilicon/' 'robots|robots.txt' 'sitemap|sitemap.xml' 'css|assets/css/site.css' 'js|assets/js/site.js' 'token|api/contacto' '404|auditoria-ruta-inexistente' 'readme|README.md'; do
 name=${item%%|*}
 route=${item#*|}
 curl -sS --max-time 20 -D "$out/http-$name.headers" -o "$out/http-$name.body" -w "$name %{http_code} %{size_download} %{time_total}\n" "https://cosaseria.mx/$route"
done
for item in 'auxi|https://auxidocente.com' 'quiniela|https://quinielaroyale.mx' 'valladolia|https://valladolia.com' 'denuncias|https://pdeanticorrupcion.michoacan.gob.mx/s5/' 'python|https://noe.vacacionesaprendiendo.xyz/' 'dino|https://angel.vacacionesaprendiendo.xyz/' 'appstore|https://apps.apple.com/mx/app/stonevssilicon/id6820747510' 'www|https://www.cosaseria.mx/'; do
 name=${item%%|*}
 url=${item#*|}
 curl -sS -L --max-time 20 -D "$out/external-$name.headers" -o "$out/external-$name.body" -w "$name %{http_code} %{size_download} %{url_effective}\n" "$url"
done
