export const LIMITES_TEXTO = { nombre: 120, empresa: 160, email: 200, problema: 8000 };
export const LIMITE_CUERPO = 128 * 1024;
const ORIGENES = ['https://cosaseria.mx', 'https://www.cosaseria.mx'];
const VIDA_TOKEN = 2 * 60 * 60 * 1000;
export const VIDA_ENVIO = 24 * 60 * 60 * 1000;
const CONTROL = /[\u0000-\u001F\u007F]+/g;
const encoder = new TextEncoder();

export async function firmar(secreto, mensaje) {
  const clave = await crypto.subtle.importKey('raw', encoder.encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', clave, encoder.encode(mensaje));
  return Array.from(new Uint8Array(firma), b => b.toString(16).padStart(2, '0')).join('');
}
function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}
function origenValido(request) {
  const origen = request.headers.get('origin');
  if (origen) return ORIGENES.includes(origen);
  try { return ORIGENES.includes(new URL(request.headers.get('referer')).origin); }
  catch { return false; }
}
function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function configurado(env) {
  return typeof env.FIRMA_SECRETO === 'string' && env.FIRMA_SECRETO.length > 0 &&
    typeof env.RAFAGA?.limit === 'function' && typeof env.CONTACTO?.idFromName === 'function' &&
    typeof env.CONTACTO?.get === 'function' && typeof env.EMAIL?.send === 'function' &&
    !!env.CORREO_DESTINO && !!env.CORREO_ORIGEN;
}
function paginaSimple(mensaje, datos, confirmar = false) {
  const campos = datos ? `<form method="post" action="/api/contacto" class="forma">
${Object.entries(LIMITES_TEXTO).map(([nombre, max]) => {
    const etiqueta = { nombre:'Nombre', empresa:'Empresa (opcional)', email:'Email', problema:'Cuéntanos el problema' }[nombre];
    const valor = escapar(datos[nombre]);
    return `<div class="campo"><label for="${nombre}">${etiqueta}</label>` + (nombre === 'problema'
      ? `<textarea id="${nombre}" name="${nombre}" maxlength="${max}" required>${valor}</textarea>`
      : `<input id="${nombre}" name="${nombre}" type="${nombre === 'email' ? 'email' : 'text'}" maxlength="${max}" value="${valor}" ${nombre !== 'empresa' ? 'required' : ''}>`) + '</div>';
  }).join('')}
<input type="hidden" name="envio_id" value="${escapar(datos.envio_id)}">
<button class="btn btn-primario" type="submit">${confirmar ? 'Confirmar envío' : 'Volver a intentar'}</button></form>` : '';
  return `<!DOCTYPE html><html lang="es-MX"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Contacto · CosaSeria.</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/site.css?v=20261014"></head><body><main class="marco articulo">
<h1>Tu mensaje</h1><div class="prosa"><p>${escapar(mensaje)}</p>
<p>También puedes escribir a <a href="mailto:hola@cosaseria.mx">hola@cosaseria.mx</a>.</p></div>
${campos}<p class="acciones"><a href="/#contacto">Volver al sitio</a></p></main></body></html>`;
}
function respuesta(request, estado, codigo, mensaje, { datos, campos, retryAfter } = {}) {
  const ok = codigo === 'ENVIADO';
  const headers = { 'cache-control':'no-store' };
  if (retryAfter) headers['retry-after'] = String(retryAfter);
  if ((request.headers.get('accept') || '').includes('application/json')) {
    headers['content-type'] = 'application/json; charset=utf-8';
    return new Response(JSON.stringify({ ok, codigo, mensaje, ...(campos ? { campos } : {}) }), { status:estado, headers });
  }
  if (ok) return new Response(null, { status:303, headers:{ ...headers, location:new URL('/gracias/', request.url).href } });
  headers['content-type'] = 'text/html; charset=utf-8';
  return new Response(paginaSimple(mensaje, datos, codigo === 'PREPARADO'), { status:estado, headers });
}
class ErrorFormulario extends Error {
  constructor(estado, codigo, mensaje) { super(mensaje); this.estado=estado; this.codigo=codigo; }
}
async function leerFormulario(request) {
  const tipo = request.headers.get('content-type') || '';
  if (!/^(multipart\/form-data\s*;|application\/x-www-form-urlencoded(?:\s*;|$))/i.test(tipo)) {
    throw new ErrorFormulario(415, 'TIPO_INVALIDO', 'Envía los campos del formulario, sin archivos adjuntos.');
  }
  if (Number(request.headers.get('content-length')) > LIMITE_CUERPO) {
    throw new ErrorFormulario(413, 'CUERPO_GRANDE', 'El formulario es demasiado grande. Reduce el texto y vuelve a intentarlo.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ErrorFormulario(400, 'FORMULARIO_INVALIDO', 'No pudimos leer el formulario.');
  let total = 0; const partes = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_CUERPO) {
        await reader.cancel();
        throw new ErrorFormulario(413, 'CUERPO_GRANDE', 'El formulario es demasiado grande. Reduce el texto y vuelve a intentarlo.');
      }
      partes.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(new Blob(partes), { headers:{'content-type':tipo} }).formData(); }
  catch { throw new ErrorFormulario(400, 'FORMULARIO_INVALIDO', 'No pudimos leer el formulario.'); }
}
async function tokenValido(env, token) {
  if (token.length > 100) return false;
  const [sello, firma, extra] = token.split('.');
  if (extra || !/^\d{13}$/.test(sello) || !/^[a-f0-9]{64}$/.test(firma || '')) return false;
  const edad = Date.now() - Number(sello);
  return edad >= -60000 && edad <= VIDA_TOKEN && igualSeguro(await firmar(env.FIRMA_SECRETO, sello), firma);
}
export function idValido(id) {
  const match = /^(\d{13})\.([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.exec(id);
  return !!match && Date.now() - Number(match[1]) <= VIDA_ENVIO && Number(match[1]) - Date.now() <= 60000;
}
export async function contactoGet(request, env) {
  if (!configurado(env)) {
    console.error('contacto: CONFIGURACION_INCOMPLETA');
    return respuesta(request, 503, 'NO_DISPONIBLE', 'El envío no está disponible. Escríbenos a hola@cosaseria.mx.');
  }
  const sello = String(Date.now());
  const firma = await firmar(env.FIRMA_SECRETO, sello);
  return Response.json({ token:`${sello}.${firma}`, expiresAt:Number(sello) + VIDA_TOKEN }, { headers:{'cache-control':'no-store'} });
}
export async function contactoPost(request, env) {
  if (!origenValido(request)) return respuesta(request, 403, 'ORIGEN_INVALIDO', 'Origen no permitido.');
  if (!configurado(env)) {
    console.error('contacto: CONFIGURACION_INCOMPLETA');
    return respuesta(request, 503, 'NO_DISPONIBLE', 'El envío no está disponible. Escríbenos a hola@cosaseria.mx.');
  }
  let datos;
  try {
    const f = await leerFormulario(request);
    const permitidos = new Set([...Object.keys(LIMITES_TEXTO), 'token', 'envio_id', 'empresa_adicional']);
    for (const [nombre, valor] of f) {
      if (!permitidos.has(nombre) || typeof valor !== 'string' || f.getAll(nombre).length !== 1) {
        return respuesta(request, 400, 'CAMPOS_INVALIDOS', 'El formulario admite solo sus campos de texto, sin archivos ni campos repetidos.');
      }
    }
    datos = Object.fromEntries([...Object.keys(LIMITES_TEXTO), 'envio_id'].map(k => [k, f.get(k) || '']));
    // Multipart serializes textarea LF as CRLF. Count the same units as the
    // browser's textarea value so line breaks do not reduce its allowed length.
    datos.problema = datos.problema.replace(/\r\n?/g, '\n');
    // Native forms remain usable without JS. Tokens check freshness, not humanity.
    const token = f.get('token');
    if (token && !(await tokenValido(env, token))) {
      return respuesta(request, 403, 'TOKEN_CADUCADO', 'Renueva el formulario y vuelve a intentar. Tu texto sigue aquí.', {datos});
    }
    const campos = {};
    for (const [nombre, max] of Object.entries(LIMITES_TEXTO)) {
      if (datos[nombre].length > max) campos[nombre] = `Máximo ${max} caracteres.`;
      if (nombre !== 'empresa' && !datos[nombre].trim()) campos[nombre] = 'Completa este campo.';
    }
    if (/[\r\n]/.test(datos.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.email.trim())) campos.email = 'Escribe un correo válido.';
    if (Object.keys(campos).length) return respuesta(request, 422, 'VALIDACION', 'Revisa los campos indicados. No se envió ni se recortó tu mensaje.', {datos, campos});
    if (!datos.envio_id) {
      // A native form needs its ID BEFORE the external effect. The confirmation
      // page gives browser resubmissions the same ID even if the receipt is lost.
      if ((request.headers.get('accept') || '').includes('application/json')) {
        return respuesta(request, 400, 'ID_REQUERIDO', 'Actualiza la página conservando tu texto para iniciar un envío.', {datos});
      }
      datos.envio_id = `${Date.now()}.${crypto.randomUUID()}`;
      return respuesta(request, 200, 'PREPARADO', 'Revisa tu mensaje y confirma el envío. Todavía no lo hemos enviado.', {datos});
    }
    if (!idValido(datos.envio_id)) return respuesta(request, 400, 'ID_INVALIDO', 'Este intento ya venció. Conserva tu texto y escríbenos a hola@cosaseria.mx.', {datos});
    const ip = request.headers.get('cf-connecting-ip');
    if (!ip) throw new Error('IP_AUSENTE');
    const { success } = await env.RAFAGA.limit({key:ip});
    if (!success) return respuesta(request, 429, 'LIMITE', 'Espera un minuto antes de volver a intentar. Tu texto sigue aquí.', {datos, retryAfter:60});
    if ((f.get('empresa_adicional') || '').trim()) return respuesta(request, 200, 'ENVIADO', 'Recibido.');
    const bloque = Math.floor(Date.now() / 3600000);
    const clave = await firmar(env.FIRMA_SECRETO, `ip:${bloque}:${ip}`);
    const limite = env.CONTACTO.get(env.CONTACTO.idFromName(`cuota:${clave}`));
    const cuota = await limite.fetch(new Request('https://interno/limite', {method:'POST',body:JSON.stringify({id:datos.envio_id})}));
    if (cuota.status === 429) return respuesta(request, 429, 'LIMITE', 'Se alcanzó el límite de mensajes de esta hora. Intenta en la próxima hora o escríbenos por correo.', {datos, retryAfter:Math.ceil((3600000 - Date.now() % 3600000)/1000)});
    if (!cuota.ok) throw new Error('CUOTA_NO_DISPONIBLE');
    const contenido = Object.fromEntries(Object.keys(LIMITES_TEXTO).map(k => [k, k === 'problema' ? datos[k] : datos[k].replace(CONTROL, ' ').trim()]));
    const huella = await firmar(env.FIRMA_SECRETO, JSON.stringify(contenido));
    const envio = env.CONTACTO.get(env.CONTACTO.idFromName(`envio:${datos.envio_id}`));
    const r = await envio.fetch(new Request('https://interno/enviar', {method:'POST',body:JSON.stringify({id:datos.envio_id, huella, datos:contenido})}));
    const resultado = await r.json();
    return respuesta(request, r.status, resultado.codigo, resultado.mensaje, {datos, retryAfter:r.status === 202 ? 5 : undefined});
  } catch (error) {
    if (error instanceof ErrorFormulario) return respuesta(request, error.estado, error.codigo, error.message, {datos});
    const referencia = idValido(datos?.envio_id) ? datos.envio_id : crypto.randomUUID();
    console.error(JSON.stringify({evento:'contacto_infraestructura', referencia}));
    return respuesta(request, 503, 'NO_DISPONIBLE', `No pudimos confirmar el envío. Conservamos tu texto; vuelve a intentar con el mismo mensaje o escríbenos a hola@cosaseria.mx. Referencia: ${referencia}`, {datos});
  }
}
