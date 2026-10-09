/* StoneVsSilicon: idioma, modales, mapa de la pantalla y parallax.
   Idioma: elección guardada, ancla #es/#en, idioma del navegador. Sin JavaScript queda español. */
(function () {
  var raiz = document.documentElement;

  function fijarIdioma(idioma, guardar) {
    raiz.setAttribute('data-lang', idioma);
    raiz.setAttribute('lang', idioma === 'es' ? 'es-MX' : 'en');
    var botones = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < botones.length; i++) {
      var propio = botones[i].getAttribute('data-set-lang') === idioma;
      botones[i].setAttribute('aria-pressed', propio ? 'true' : 'false');
    }
    if (guardar) {
      try { localStorage.setItem('svs-lang', idioma); } catch (e) {}
    }
  }

  function idiomaInicial() {
    var ancla = (location.hash || '').replace('#', '');
    if (ancla === 'es' || ancla === 'en') return ancla;
    var guardado = null;
    try { guardado = localStorage.getItem('svs-lang'); } catch (e) {}
    if (guardado === 'es' || guardado === 'en') return guardado;
    var navegador = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
    return /^es/i.test(navegador) ? 'es' : 'en';
  }

  fijarIdioma(idiomaInicial(), false);

  function cada(selector, fn) {
    var lista = document.querySelectorAll(selector);
    for (var i = 0; i < lista.length; i++) fn(lista[i]);
  }

  function listo() {
    cada('[data-set-lang]', function (boton) {
      boton.addEventListener('click', function (evento) {
        evento.preventDefault();
        var idioma = this.getAttribute('data-set-lang');
        fijarIdioma(idioma, true);
        if (history.replaceState) history.replaceState(null, '', '#' + idioma);
      });
    });
    fijarIdioma(raiz.getAttribute('data-lang'), false);

    /* Modales: historia y las dos alineaciones comparten el mismo mecanismo. */
    var abierto = null;
    var origen = null;
    function cerrarModal() {
      if (!abierto) return;
      abierto.hidden = true;
      abierto = null;
      document.body.classList.remove('modal-abierto');
      if (origen && origen.focus) origen.focus();
      origen = null;
    }
    function abrirModal(id) {
      var modal = document.getElementById(id);
      if (!modal) return;
      cerrarModal();
      origen = document.activeElement;
      modal.hidden = false;
      abierto = modal;
      document.body.classList.add('modal-abierto');
      var caja = modal.querySelector('.modal-caja');
      if (caja) { caja.scrollTop = 0; caja.focus(); }
    }
    cada('[data-abre-modal]', function (el) {
      el.addEventListener('click', function (evento) {
        evento.preventDefault();
        abrirModal(this.getAttribute('data-abre-modal'));
      });
    });
    cada('[data-cierra-modal]', function (el) {
      el.addEventListener('click', function () { cerrarModal(); });
    });
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') { cerrarModal(); cerrarTip(); }
    });
    if (location.hash === '#historia') abrirModal('historia');

    /* Mapa de la pantalla: cada piedra o chip muestra su explicación. */
    var tipAbierto = null;
    function cerrarTip() {
      if (!tipAbierto) return;
      var tip = document.getElementById(tipAbierto.getAttribute('data-tip'));
      if (tip) tip.hidden = true;
      tipAbierto.setAttribute('aria-expanded', 'false');
      tipAbierto.classList.remove('activo');
      tipAbierto = null;
    }
    function colocarTip(boton, tip) {
      var mapa = boton.parentNode;
      var ancho = mapa.clientWidth;
      var x = parseFloat(boton.style.getPropertyValue('--x')) || 50;
      var y = parseFloat(boton.style.getPropertyValue('--y')) || 50;
      tip.style.left = '';
      tip.style.right = '';
      if (x > 60) {
        tip.style.right = (100 - x) + '%';
        tip.classList.add('tip-derecha');
      } else {
        tip.style.left = x + '%';
        tip.classList.remove('tip-derecha');
      }
      tip.classList.toggle('tip-arriba', y > 55);
      tip.style.top = y + '%';
      tip.style.maxWidth = Math.min(300, ancho - 24) + 'px';
    }
    cada('.marcador', function (boton) {
      boton.addEventListener('click', function (evento) {
        evento.stopPropagation();
        var tip = document.getElementById(this.getAttribute('data-tip'));
        if (!tip) return;
        var mismo = tipAbierto === this;
        cerrarTip();
        if (mismo) return;
        colocarTip(this, tip);
        tip.hidden = false;
        this.setAttribute('aria-expanded', 'true');
        this.classList.add('activo');
        tipAbierto = this;
      });
    });
    document.addEventListener('click', function (evento) {
      if (tipAbierto && !evento.target.closest('.tip, .marcador')) cerrarTip();
    });

    /* Video: se decide una vez, según el ancho de pantalla, y solo se carga esa variante. */
    var marcoVideo = document.getElementById('video-marco');
    if (marcoVideo) {
      var vertical = window.matchMedia && window.matchMedia('(max-width: 780px)').matches;
      marcoVideo.classList.toggle('vertical', vertical);
      cada('#video-marco video[data-src-h]', function (video) {
        var sufijo = vertical ? 'v' : 'h';
        video.poster = video.getAttribute('data-poster-' + sufijo);
        video.width = vertical ? 720 : 1280;
        video.height = vertical ? 1280 : 720;
        var fuente = document.createElement('source');
        fuente.src = video.getAttribute('data-src-' + sufijo);
        fuente.type = 'video/mp4';
        video.appendChild(fuente);
      });
    }

    /* Parallax: el arte de fondo avanza más despacio que la página y cada sección
       cambia su encuadre; las piedras y los chips flotan a su propio ritmo. */
    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fondo = document.querySelector('[data-fondo]');
    var flotantes = document.querySelectorAll('[data-parallax]');
    var pendiente = false;
    function pintar() {
      pendiente = false;
      var y = window.pageYOffset || 0;
      var alto = window.innerHeight;
      if (fondo) {
        var tope = alto * 0.6;
        var desplazo = Math.min(y * 0.12, tope);
        fondo.style.transform = 'translate3d(0,' + Math.round(-desplazo) + 'px,0)';
      }
      var centro = alto / 2;
      for (var i = 0; i < flotantes.length; i++) {
        var el = flotantes[i];
        var franja = el.parentNode.getBoundingClientRect();
        var factor = parseFloat(el.getAttribute('data-parallax')) || 0;
        var limite = franja.height * 0.35;
        var delta = (franja.top + franja.height / 2 - centro) * factor * 0.6;
        if (delta > limite) delta = limite;
        if (delta < -limite) delta = -limite;
        el.style.transform = 'translate3d(0,' + delta.toFixed(1) + 'px,0)';
      }
    }
    function programar() {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(pintar);
    }
    if (!reducido) {
      window.addEventListener('scroll', programar, { passive: true });
      window.addEventListener('resize', programar);
      pintar();
    }

    /* Escena activa: la sección visible decide el encuadre y el tono del fondo. */
    var escenas = document.querySelectorAll('[data-escena]');
    if ('IntersectionObserver' in window && escenas.length) {
      var observador = new IntersectionObserver(function (entradas) {
        var mejor = null;
        for (var i = 0; i < entradas.length; i++) {
          if (entradas[i].isIntersecting && (!mejor || entradas[i].intersectionRatio > mejor.intersectionRatio)) mejor = entradas[i];
        }
        if (mejor) document.body.setAttribute('data-escena', mejor.target.getAttribute('data-escena'));
      }, { threshold: [0.25, 0.5, 0.75] });
      for (var j = 0; j < escenas.length; j++) observador.observe(escenas[j]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', listo);
  } else {
    listo();
  }
})();
