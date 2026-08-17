import { contactoGet, contactoPost } from './contacto.js';

const RUTA_CONTACTO = '/api/contacto';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === RUTA_CONTACTO) {
      if (request.method === 'GET') return contactoGet(request, env);
      if (request.method === 'POST') return contactoPost(request, env);
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, POST' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
