import { VIDA_ENVIO, idValido } from './contacto.js';

// One object per hourly pseudonymous quota or logical submission. Only the
// Worker invokes these routes. Never store the message, email or raw IP here.
export class RegistroContacto {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, {status:405});
    const entrada = await request.json();
    if (!idValido(entrada.id)) return Response.json({codigo:'ID_INVALIDO',mensaje:'El identificador de envío venció.'},{status:400});
    const ruta = new URL(request.url).pathname;
    if (ruta === '/limite') {
      const permitido = await this.ctx.storage.transaction(async tx => {
        const ids = await tx.get('intentos') || [];
        if (ids.includes(entrada.id)) return true;
        if (ids.length >= 5) return false;
        if (!ids.length) await tx.setAlarm(Date.now() + 3660000);
        await tx.put('intentos', [...ids, entrada.id]);
        return true;
      });
      return new Response(null, {status:permitido ? 204 : 429});
    }
    if (ruta !== '/enviar') return new Response(null, {status:404});
    const previo = await this.ctx.storage.transaction(async tx => {
      const registro = await tx.get('envio');
      if (registro) return registro;
      await tx.setAlarm(Number(entrada.id.split('.')[0]) + VIDA_ENVIO + 60000);
      await tx.put('envio', { huella:entrada.huella, estado:'procesando' });
      return null;
    });
    if (previo) {
      if (previo.huella !== entrada.huella) return Response.json({codigo:'CONFLICTO',mensaje:'Este intento corresponde a otro texto. No enviamos los cambios. Para evitar duplicados, escríbenos por correo con el mensaje completo.'},{status:409});
      return this.resultado(previo.estado);
    }
    // Persist reservation BEFORE the external effect. An ambiguous failure stays
    // uncertain: retrying the same ID must never invoke the provider again.
    const {datos, id} = entrada;
    try {
      const recibo = await this.env.EMAIL.send({
        to:this.env.CORREO_DESTINO, from:this.env.CORREO_ORIGEN, replyTo:datos.email,
        subject:`Sitio · ${datos.nombre}${datos.empresa ? ' · '+datos.empresa : ''}`,
        text:`Referencia: ${id}\nNombre: ${datos.nombre}\nEmpresa: ${datos.empresa || '(sin empresa)'}\nEmail: ${datos.email}\n\n${datos.problema}`
      });
      if (typeof recibo?.messageId !== 'string' || !recibo.messageId) throw new Error('RECIBO_INVALIDO');
    } catch {
      await this.ctx.storage.put('envio', {huella:entrada.huella,estado:'incierto'});
      console.error(JSON.stringify({evento:'contacto_correo_incierto',referencia:id}));
      return this.resultado('incierto');
    }
    // If saving this receipt fails, the durable reservation remains. No second send.
    await this.ctx.storage.put('envio', {huella:entrada.huella,estado:'enviado'});
    return this.resultado('enviado');
  }
  resultado(estado) {
    if (estado === 'enviado') return Response.json({codigo:'ENVIADO',mensaje:'Recibido. Leemos personalmente cada mensaje.'});
    if (estado === 'incierto') return Response.json({codigo:'INCIERTO',mensaje:'El proveedor no confirmó el envío. No lo repetiremos para evitar duplicados. Conserva este texto y escríbenos a hola@cosaseria.mx.'},{status:502});
    return Response.json({codigo:'PROCESANDO',mensaje:'El envío sigue pendiente de confirmación. Espera unos segundos y vuelve a consultar con el mismo texto; no enviaremos otro correo.'},{status:202});
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}
