/* Effetti condivisi: galleria in apertura, comparsa allo scorrimento, parallasse, header compatto. */
(function () {
  var riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Galleria
  var galleria = document.querySelector('.hero-galleria');
  if (galleria) {
    var slide = galleria.querySelectorAll('.slide');
    var punti = document.querySelectorAll('.hero-punti .punto');
    var i = 0, timer;
    var mostra = function (n) {
      slide[i].classList.remove('attiva');
      slide[i].classList.add('uscita');
      punti[i] && punti[i].classList.remove('attivo');
      var vecchia = slide[i];
      setTimeout(function () { vecchia.classList.remove('uscita'); }, 1300);
      i = (n + slide.length) % slide.length;
      slide[i].classList.add('attiva');
      punti[i] && punti[i].classList.add('attivo');
    };
    var avvia = function () {
      clearInterval(timer);
      if (!riduci) timer = setInterval(function () { mostra(i + 1); }, 6500);
    };
    punti.forEach(function (p, n) {
      p.addEventListener('click', function () { if (n !== i) mostra(n); avvia(); });
    });
    avvia();
  }

  // Comparsa allo scorrimento
  if ('IntersectionObserver' in window && !riduci) {
    document.documentElement.classList.add('js-rivela');
    var elementi = document.querySelectorAll('.rivela, section .titolo-sezione, .scheda-modulo, .scheda-membro, .scheda-direttivo');
    elementi.forEach(function (el) { el.classList.add('rivela'); });
    var oss = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) { v.target.classList.add('visibile'); oss.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    elementi.forEach(function (el) { oss.observe(el); });
  }

  // Parallasse delle fasce + header compatto
  var fasce = document.querySelectorAll('.fascia-foto');
  var header = document.querySelector('header.principale');
  var inCoda = false;
  var aggiorna = function () {
    inCoda = false;
    var h = window.innerHeight;
    if (!riduci) fasce.forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      var p = (r.top + r.height / 2 - h / 2) / h;
      f.style.setProperty('--sposta', (p * -60).toFixed(1) + 'px');
    });
    if (header) header.classList.toggle('compatto', window.scrollY > 120);
  };
  window.addEventListener('scroll', function () {
    if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); }
  }, { passive: true });
  aggiorna();
})();
