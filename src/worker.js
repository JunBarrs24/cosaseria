import { contactoGet, contactoPost } from './contacto.js';

const RUTA_CONTACTO = '/api/contacto';

const CABECERAS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-robots-tag': 'noindex',
  'cache-control': 'no-store',
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ].join('; ')
};

function blindar(respuesta) {
  if (respuesta.status >= 300 && respuesta.status < 400) return respuesta;

  const copia = new Response(respuesta.body, respuesta);
  for (const [nombre, valor] of Object.entries(CABECERAS)) {
    copia.headers.set(nombre, valor);
  }
  return copia;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === RUTA_CONTACTO) {
      if (request.method === 'GET') return blindar(await contactoGet(request, env));
      if (request.method === 'POST') return blindar(await contactoPost(request, env));
      return blindar(new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, POST' }
      }));
    }

    return env.ASSETS.fetch(request);
  }
};
