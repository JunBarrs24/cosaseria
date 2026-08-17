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
    if (!forma || !window.fetch) return;

    var recado = forma.querySelector('[data-recado]');
    var enviar = forma.querySelector('button[type="submit"]');
    var campoToken = forma.querySelector('[name="token"]');
    var destino = forma.getAttribute('action') || '';
    var correo = forma.getAttribute('data-correo') || 'hola@cosaseria.mx';
    var pidiendoToken = false;

    function decir(texto, esError) {
      if (!recado) return;
      recado.textContent = texto;
      recado.hidden = false;
      recado.classList.toggle('error', !!esError);
    }

    function pedirToken() {
      if (pidiendoToken || !campoToken || campoToken.value) return;
      pidiendoToken = true;
      window.fetch(destino, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (datos) { if (datos && datos.token) campoToken.value = datos.token; })
        .catch(function () {});
    }

    forma.addEventListener('focusin', pedirToken, { once: true });

    forma.addEventListener('submit', function (evento) {
      var trampa = forma.querySelector('[name="empresa_adicional"]');
      if (trampa && trampa.value) { evento.preventDefault(); return; }

      evento.preventDefault();
      if (enviar) { enviar.disabled = true; enviar.textContent = 'Enviando…'; }
      decir('Enviando…');

      window.fetch(destino, {
        method: 'POST',
        body: new FormData(forma),
        headers: { 'Accept': 'application/json' }
      }).then(function (respuesta) {
        return respuesta.json()
          .catch(function () { return {}; })
          .then(function (datos) { return { ok: respuesta.ok, datos: datos }; });
      }).then(function (r) {
        if (r.ok) {
          forma.reset();
          if (campoToken) campoToken.value = '';
          decir(r.datos.mensaje || 'Recibido. Leemos personalmente cada mensaje.');
          if (enviar) enviar.textContent = 'Enviado';
          return;
        }
        decir(r.datos.mensaje || ('No salió. Escríbenos directo a ' + correo + '.'), true);
        if (enviar) { enviar.disabled = false; enviar.textContent = 'Enviar'; }
      }).catch(function () {
        decir('No salió. Escríbenos directo a ' + correo + ' y lo resolvemos por ahí.', true);
        if (enviar) { enviar.disabled = false; enviar.textContent = 'Enviar'; }
      });
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
