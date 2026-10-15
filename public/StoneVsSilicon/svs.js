/* StoneVsSilicon: mejoras opcionales. El idioma y el contenido vienen del HTML. */
(function () {

  function cada(selector, fn) {
    var lista = document.querySelectorAll(selector);
    for (var i = 0; i < lista.length; i++) fn(lista[i]);
  }

  function listo() {
    /* Mejora progresiva: las secciones son legibles sin JS. showModal()
       aporta fondo inerte, contención de foco y cierre nativo con Escape. */
    var abierto = null;
    if (window.HTMLDialogElement && HTMLDialogElement.prototype.showModal) {
      cada('.modal', function (seccion) {
        var dialogo = document.createElement('dialog');
        dialogo.id = seccion.id;
        dialogo.className = seccion.className;
        dialogo.setAttribute('aria-labelledby', seccion.querySelector('.modal-caja').getAttribute('aria-labelledby'));
        while (seccion.firstChild) dialogo.appendChild(seccion.firstChild);
        seccion.replaceWith(dialogo);
        dialogo.querySelector('.modal-cerrar').hidden = false;
        dialogo.addEventListener('keydown', function (e) {
          if (e.key !== 'Tab') return;
          var controles = Array.from(dialogo.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')).filter(function (el) { return el.getClientRects().length; });
          var primero = controles[0], ultimo = controles[controles.length - 1];
          if (!primero) { e.preventDefault(); return; }
          if (e.shiftKey && (document.activeElement === primero || !controles.includes(document.activeElement))) {
            e.preventDefault(); ultimo.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault(); primero.focus();
          }
        });
        dialogo.addEventListener('close', function () {
          document.body.classList.remove('modal-abierto');
          abierto = null;
          if (dialogo.origen) dialogo.origen.focus();
        });
        dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });
      });
      cada('[data-abre-modal]', function (el) {
        el.setAttribute('aria-haspopup','dialog');
        el.addEventListener('click', function (e) {
          var dialogo = document.getElementById(el.getAttribute('data-abre-modal'));
          e.preventDefault();
          dialogo.querySelectorAll('template[data-imagen]').forEach(function (t) { t.replaceWith(t.content.cloneNode(true)); });
          dialogo.origen = el;
          dialogo.showModal();
          abierto = dialogo;
          document.body.classList.add('modal-abierto');
          dialogo.querySelector('.modal-caja').scrollTop = 0;
        });
      });
      cada('[data-cierra-modal]', function (el) {
        el.addEventListener('click', function () { if (abierto) abierto.close(); });
      });
    } else {
      cada('template[data-imagen]', function (t) {
        t.content.querySelector('img').loading = 'lazy';
        t.replaceWith(t.content.cloneNode(true));
      });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarTip(); });

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
      boton.hidden = false;
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
        function mostrarPoster() {
          video.poster = video.getAttribute('data-poster-' + sufijo);
          var fuente = video.querySelector('source');
          fuente.src = video.getAttribute('data-src-' + sufijo);
          video.load();
        }
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { mostrarPoster(); io.disconnect(); } }, {rootMargin:'100px'});
          io.observe(video);
        } else mostrarPoster();
        video.width = vertical ? 720 : 1280;
        video.height = vertical ? 1280 : 720;

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
