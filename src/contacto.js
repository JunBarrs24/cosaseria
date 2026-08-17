const LIMITES_TEXTO = { nombre: 120, empresa: 160, email: 200, problema: 8000 };

const ORIGENES = [
  'https://cosaseria.mx',
  'https://www.cosaseria.mx'
];

const RAFAGA = { segundos: 20, max: 1 };
const VENTANA = { segundos: 3600, max: 5 };

const VIDA_TOKEN = { minimo: 3000, maximo: 2 * 60 * 60 * 1000 };

const RECADO_LIMITE = 'No tan rápido, vaquero. Deja respirar al servidor y vuelve a intentarlo en un rato.';

const CONTROL = /[\u0000-\u001F\u007F]+/g;

function limpiar(valor, max) {
  return String(valor || '').trim().slice(0, max);
}

function limpiarLinea(valor, max) {
  return String(valor || '')
    .replace(CONTROL, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pareceCorreo(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

function ipDe(request) {
  return request.headers.get('cf-connecting-ip') || '0.0.0.0';
}

function origenValido(request) {
  const origen = request.headers.get('origin');
  if (origen) return ORIGENES.includes(origen);

  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return ORIGENES.includes(new URL(referer).origin);
  } catch (e) {
    return false;
  }
}

async function firmar(secreto, mensaje) {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function tokenValido(env, token) {
  if (!token || !env.FIRMA_SECRETO) return false;
  const partes = String(token).split('.');
  if (partes.length !== 2) return false;

  const sello = Number(partes[0]);
  if (!Number.isFinite(sello)) return false;

  const edad = Date.now() - sello;
  if (edad < VIDA_TOKEN.minimo || edad > VIDA_TOKEN.maximo) return false;

  const esperada = await firmar(env.FIRMA_SECRETO, String(sello));
  return igualSeguro(esperada, partes[1]);
}

async function excedeLimite(env, ip) {
  if (!env.LIMITES) {
    console.warn('contacto: falta el binding KV LIMITES; sin rate limit');
    return false;
  }

  const ahora = Date.now();
  const ventanas = [
    { nombre: 'r', ...RAFAGA },
    { nombre: 'v', ...VENTANA }
  ];

  for (const ventana of ventanas) {
    const bloque = Math.floor(ahora / (ventana.segundos * 1000));
    const clave = `rl:${ventana.nombre}:${ip}:${bloque}`;
    const previo = Number(await env.LIMITES.get(clave)) || 0;

    if (previo >= ventana.max) return true;

    await env.LIMITES.put(clave, String(previo + 1), {
      expirationTtl: ventana.segundos + 60
    });
  }

  return false;
}

function paginaSimple(titulo, texto) {
  return `<!DOCTYPE html>
<html lang="es-MX"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapar(titulo)} · CosaSeria.</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css">
</head><body>
<main class="marco articulo">
<p class="ceja">Acuse</p>
<h1 style="font-size:clamp(2rem,5vw,3.2rem)">${escapar(titulo)}<span class="punto" style="color:var(--rosa)">.</span></h1>
<div class="prosa"><p>${escapar(texto)}</p>
<p>También puedes escribirnos directo a <a href="mailto:hola@cosaseria.mx">hola@cosaseria.mx</a>.</p></div>
<p class="acciones"><a class="btn btn-secundario" href="/#contacto">Volver al formulario</a></p>
</main></body></html>`;
}

function respuesta(request, ok, mensaje, estado, titulo) {
  const quiereJson = (request.headers.get('accept') || '').includes('application/json');

  if (quiereJson) {
    return new Response(JSON.stringify({ ok, mensaje }), {
      status: estado,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (ok) {
    return Response.redirect(new URL('/gracias/', request.url).toString(), 303);
  }

  return new Response(paginaSimple(titulo || 'No salió', mensaje), {
    status: estado,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}

async function enviar(env, datos) {
  const cuerpo = [
    `Nombre:  ${datos.nombre}`,
    `Empresa: ${datos.empresa || '(sin empresa)'}`,
    `Email:   ${datos.email}`,
    '',
    datos.problema
  ].join('\n');

  await env.EMAIL.send({
    to: env.CORREO_DESTINO,
    from: env.CORREO_ORIGEN,
    replyTo: datos.email,
    subject: `Sitio · ${datos.nombre}${datos.empresa ? ' · ' + datos.empresa : ''}`,
    text: cuerpo
  });
}

export async function contactoGet(request, env) {
  if (!env.FIRMA_SECRETO) {
    return new Response(JSON.stringify({ token: null }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const sello = Date.now();
  const firma = await firmar(env.FIRMA_SECRETO, String(sello));

  return new Response(JSON.stringify({ token: `${sello}.${firma}` }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function contactoPost(request, env) {
  if (!origenValido(request)) {
    return respuesta(request, false, 'Origen no permitido.', 403, 'No');
  }

  const ip = ipDe(request);

  if (await excedeLimite(env, ip)) {
    return respuesta(request, false, RECADO_LIMITE, 429, 'Calma');
  }

  let formulario;
  try {
    formulario = await request.formData();
  } catch (e) {
    return respuesta(request, false, 'No pudimos leer el formulario.', 400);
  }

  if (limpiarLinea(formulario.get('empresa_adicional'), 10)) {
    return respuesta(request, true, 'Recibido.', 200);
  }

  const token = formulario.get('token');
  if (token && !(await tokenValido(env, token))) {
    return respuesta(request, false, 'La sesión del formulario ya no es válida. Recarga la página e inténtalo otra vez.', 403, 'Caducó');
  }

  const datos = {
    nombre: limpiarLinea(formulario.get('nombre'), LIMITES_TEXTO.nombre),
    empresa: limpiarLinea(formulario.get('empresa'), LIMITES_TEXTO.empresa),
    email: limpiarLinea(formulario.get('email'), LIMITES_TEXTO.email),
    problema: limpiar(formulario.get('problema'), LIMITES_TEXTO.problema)
  };

  if (!datos.nombre || !datos.problema || !pareceCorreo(datos.email)) {
    return respuesta(request, false, 'Faltan datos o el correo no es válido.', 400, 'Falta algo');
  }

  if (!env.EMAIL || !env.CORREO_DESTINO || !env.CORREO_ORIGEN) {
    const faltan = [
      env.EMAIL ? null : 'binding EMAIL (send_email)',
      env.CORREO_DESTINO ? null : 'CORREO_DESTINO',
      env.CORREO_ORIGEN ? null : 'CORREO_ORIGEN'
    ].filter(Boolean);
    console.error('contacto: falta configuración →', faltan.join(', '));
    return respuesta(request, false, 'El envío no está disponible en este momento.', 503);
  }

  try {
    await enviar(env, datos);
  } catch (e) {
    console.error('contacto: fallo al enviar', e.message);
    return respuesta(request, false, 'No pudimos enviarlo.', 502);
  }

  return respuesta(request, true, 'Recibido. Leemos personalmente cada mensaje.', 200);
}

