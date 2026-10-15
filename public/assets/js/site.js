(function () {
  'use strict';

  var reducirMovimiento = false;
  try {
    reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  (function aparicion() {
    if (reducirMovimiento) return;
    if (!('IntersectionObserver' in window)) return;

    var elementos = document.querySelectorAll('.revela');
    if (!elementos.length) return;

    var alto = window.innerHeight || document.documentElement.clientHeight;

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.remove('oculto');
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(elementos, function (el) {
      if (el.getBoundingClientRect().top < alto * 0.92) return;
      el.classList.add('oculto');
      observador.observe(el);
    });
  })();

  (function gallina() {
    var botones = document.querySelectorAll('[data-habla]');
    if (!botones.length) return;

    var frases = [
      'miau.', 'miau.', 'guau.', 'muuu.', 'cuac.',
      'jamás cacarea.', '200 OK.', 'funciona en mi máquina.',
      'no necesita Kubernetes.'
    ];
    var turno = 0;
    var ctx = null;

    var interruptor = document.getElementById('audio-toggle');
    var mudo = false;
    try { mudo = localStorage.getItem('cs-audio') === 'off'; } catch (e) {}

    function pintarInterruptor() {
      if (!interruptor) return;
      interruptor.textContent = mudo ? 'Audio · No' : 'Audio · Sí';
      interruptor.setAttribute('aria-pressed', mudo ? 'true' : 'false');
      interruptor.setAttribute(
        'aria-label',
        mudo ? 'Activar el sonido de la gallina' : 'Silenciar el sonido de la gallina'
      );
    }

    if (interruptor) {
      pintarInterruptor();
      interruptor.addEventListener('click', function () {
        mudo = !mudo;
        try { localStorage.setItem('cs-audio', mudo ? 'off' : 'on'); } catch (e) {}
        pintarInterruptor();
      });
    }

    var voces = {
      'miau.':      { onda: 'sawtooth', de: 620, a: 340, cima: 880, dura: 0.46 },
      'guau.':      { onda: 'square',   de: 300, a: 150, dura: 0.16 },
      'muuu.':      { onda: 'sawtooth', de: 130, a: 95,  dura: 0.68 },
      'cuac.':      { onda: 'square',   de: 260, a: 180, dura: 0.14 }
    };

    function sonar(frase) {
      if (mudo) return;
      var voz = voces[frase];
      if (!voz) return;
      try {
        var Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        ctx = ctx || new Audio();
        if (ctx.state === 'suspended') ctx.resume();

        var osc = ctx.createOscillator();
        var vol = ctx.createGain();
        var t = ctx.currentTime;
        osc.connect(vol); vol.connect(ctx.destination);
        osc.type = voz.onda;
        osc.frequency.setValueAtTime(voz.de, t);
        if (voz.cima) osc.frequency.exponentialRampToValueAtTime(voz.cima, t + 0.12);
        osc.frequency.exponentialRampToValueAtTime(voz.a, t + voz.dura);
        vol.gain.setValueAtTime(0.0001, t);
        vol.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
        vol.gain.exponentialRampToValueAtTime(0.0001, t + voz.dura + 0.04);
        osc.start(t);
        osc.stop(t + voz.dura + 0.08);

        if (interruptor) interruptor.hidden = false;
      } catch (e) {}
    }

    function hablar(boton) {
      var frase = frases[turno % frases.length];
      turno++;

      var previo = boton.querySelector('.globo');
      if (previo) previo.remove();

      var globo = document.createElement('span');
      globo.className = 'globo';
      globo.setAttribute('aria-hidden', 'true');
      globo.textContent = frase;
      boton.appendChild(globo);

      var vivo = boton.querySelector('[data-vivo]');
      if (vivo) {
        vivo.textContent = '';
        window.setTimeout(function () { vivo.textContent = frase; }, 40);
      }

      window.setTimeout(function () { globo.remove(); }, 1750);
      sonar(frase);
    }

    Array.prototype.forEach.call(botones, function (boton) {
      boton.addEventListener('click', function () { hablar(boton); });
    });
  })();

  (function formulario() {
    var forma = document.querySelector('[data-forma]');
    if (!forma || !window.fetch || !window.AbortController || !window.crypto || !crypto.randomUUID) return;
    var recado = forma.querySelector('[data-recado]');
    var enviar = forma.querySelector('button[type="submit"]');
    var campoToken = forma.querySelector('[name="token"]');
    var campoId = forma.querySelector('[name="envio_id"]');
    var destino = forma.getAttribute('action');
    var expiracion = 0;
    var pendienteToken = null;
    var ocupado = false;

    function decir(texto, error) {
      recado.textContent = texto;
      recado.classList.toggle('error', !!error);
    }
    async function solicitar(opciones) {
      var control = new AbortController();
      var reloj = setTimeout(function () { control.abort(); }, 15000);
      try {
        var r = await fetch(destino, Object.assign({}, opciones, {signal:control.signal}));
        if (!(r.headers.get('content-type') || '').includes('application/json')) throw new Error('RESPUESTA_INVALIDA');
        return {respuesta:r, datos:await r.json()};
      } finally { clearTimeout(reloj); }
    }
    function pedirToken(renovar) {
      if (pendienteToken) return pendienteToken;
      if (!renovar && campoToken.value && expiracion > Date.now() + 60000) return Promise.resolve();
      pendienteToken = solicitar({headers:{Accept:'application/json'}}).then(function (r) {
        if (!r.respuesta.ok || typeof r.datos.token !== 'string' || !Number.isFinite(r.datos.expiresAt)) throw new Error('TOKEN_NO_DISPONIBLE');
        campoToken.value = r.datos.token;
        expiracion = r.datos.expiresAt;
      }).finally(function () { pendienteToken = null; });
      return pendienteToken;
    }
    forma.addEventListener('focusin', function () { pedirToken(false).catch(function () {}); });
    forma.addEventListener('input', function (e) {
      if (e.target.setCustomValidity) e.target.setCustomValidity('');
      e.target.removeAttribute('aria-invalid');
    });
    async function mandar(renovado) {
      var r = await solicitar({method:'POST',body:new FormData(forma),headers:{Accept:'application/json'}});
      var d = r.datos;
      if (typeof d.ok !== 'boolean' || typeof d.codigo !== 'string' || typeof d.mensaje !== 'string') throw new Error('RESPUESTA_INVALIDA');
      if (d.codigo === 'TOKEN_CADUCADO' && r.respuesta.status === 403 && !renovado) {
        await pedirToken(true);
        return mandar(true); // Only this explicit pre-send rejection is retried automatically.
      }
      if (r.respuesta.status === 200 && d.ok === true && d.codigo === 'ENVIADO') {
        forma.reset();
        expiracion = 0;
        decir(d.mensaje, false);
        return;
      }
      if (d.ok || r.respuesta.status === 200) throw new Error('RESPUESTA_INVALIDA');
      if (d.campos) {
        Object.keys(d.campos).forEach(function (nombre) {
          var campo = forma.elements.namedItem(nombre);
          if (campo && campo.setCustomValidity && typeof d.campos[nombre] === 'string') {
            campo.setCustomValidity(d.campos[nombre]);
            campo.setAttribute('aria-invalid','true');
          }
        });
        decir(d.mensaje + ' ' + Object.values(d.campos).join(' '), true);
      } else decir(d.mensaje, true);
    }
    forma.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      if (ocupado) return;
      if (!campoId.value) campoId.value = Date.now() + '.' + crypto.randomUUID();
      ocupado = true;
      enviar.disabled = true;
      enviar.textContent = 'Enviando…';
      enviar.setAttribute('aria-busy','true');
      // readonly preserves FormData while preventing changes during the request.
      var editables = forma.querySelectorAll('input:not([type="hidden"]),textarea');
      editables.forEach(function (e) { e.readOnly = true; });
      decir('Enviando tu mensaje…', false);
      try {
        await pedirToken(false);
        await mandar(false);
      } catch (e) {
        decir('No pudimos confirmar el envío. Tu texto sigue aquí. Vuelve a intentar con el mismo mensaje o escribe a hola@cosaseria.mx; no crearemos otro envío con este identificador.', true);
      } finally {
        ocupado = false;
        enviar.disabled = false;
        enviar.textContent = 'Enviar';
        enviar.removeAttribute('aria-busy');
        editables.forEach(function (e) { e.readOnly = false; });
        if (forma.querySelector('[aria-invalid="true"]')) forma.reportValidity();
      }
    });
  })();

  try {
    console.log(
      '%cCosaSeria.%c\nEsta gallina tampoco necesita un framework.\nhola@cosaseria.mx',
      'font-weight:700;font-size:14px',
      'font-size:12px'
    );
  } catch (e) {}
})();
