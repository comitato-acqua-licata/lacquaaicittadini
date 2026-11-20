/* Mappa delle perdite idriche di Licata (condivisa da tutte le versioni a tema).
   - I numeri dell'anteprima in home si caricano subito.
   - La mappa Leaflet parte solo quando la sezione #mappa-perdite viene aperta
     (la navigazione a "pagine" la tiene nascosta finché non serve). */
(function () {
  'use strict';

  var EMAIL = 'info@lacquaaicittadini.it';
  var LICATA = [37.1034, 13.9376];
  var STATI = { attiva: 'Da riparare', riparata: 'Riparata' };
  var POSIZIONE = { civico: 'Sul civico', via: 'Sulla via (indicativa)', zona: 'Zona (approssimata)' };

  var sezione = document.getElementById('mappa-perdite');
  if (!sezione) return;

  /* ---------- utilità ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, testo) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (testo != null) e.textContent = testo;
    return e;
  }
  function mailto(oggetto, corpo) {
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(corpo);
  }
  function mostraErrore(msg) {
    var box = $('mp-errore');
    box.textContent = msg;
    box.style.display = 'block';
  }
  function scrivi(chiave, valore) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mp="' + chiave + '"]'), function (n) {
      n.textContent = valore;
    });
  }

  $('mp-segnala').href = mailto(
    'Segnalazione perdita idrica - Licata',
    'Via: \nNumero civico (importante): \nDescrizione (facoltativa): \n\nAllego foto o video della perdita.'
  );

  /* ---------- stato ---------- */
  var dati = [];
  var marker = {};            // id -> marker Leaflet
  var righe = {};             // id -> <tr>
  var filtro = 'tutte';
  var soloSenza = false;
  var testoRicerca = '';
  var selezionato = null;     // id della perdita selezionata
  var mappa = null, cluster = null;
  var caricati = null;        // promessa dei dati

  /* ---------- dati e contatori ---------- */
  function caricaDati() {
    if (caricati) return caricati;
    caricati = fetch('perdite/perdite.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) {
        dati = json.perdite || [];
        var conta = function (f) { return dati.filter(f).length; };
        var nSenza = conta(function (p) { return p.lat == null; });
        scrivi('totale', dati.length);
        scrivi('attive', conta(function (p) { return p.stato === 'attiva'; }));
        scrivi('riparate', conta(function (p) { return p.stato === 'riparata'; }));
        scrivi('senza', nSenza);
        $('mp-chip-senza').textContent = 'Solo da posizionare (' + nSenza + ')';
        if (json.aggiornato) {
          var d = new Date(json.aggiornato + 'T12:00:00');
          $('mp-data').textContent = isNaN(d) ? json.aggiornato : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      });
    caricati.catch(function (err) {
      mostraErrore('Non è stato possibile caricare l\'elenco delle perdite (' + err.message + '). Riprova più tardi o scrivi a ' + EMAIL + '.');
    });
    return caricati;
  }

  /* ---------- popup e marker ---------- */
  function popup(p) {
    var box = el('div');
    box.appendChild(el('div', 'popup-cod', p.id));
    box.appendChild(el('div', 'popup-ind', p.indirizzo));
    box.appendChild(el('span', 'mp-badge ' + p.stato, STATI[p.stato] || p.stato));
    var testoPrec;
    if (p.precisione === 'civico') testoPrec = 'Posizione sul civico indicato.';
    else if (p.precisione === 'via') testoPrec = /\d/.test(p.indirizzo)
      ? 'Posizione indicativa lungo la via: il civico esatto è quello indicato sopra.'
      : 'Posizione indicativa lungo la via. Il civico non è indicato nel registro.';
    else if (p.precisione === 'zona') testoPrec = 'Posizione approssimata della zona o località indicata.';
    if (testoPrec) box.appendChild(el('p', 'popup-prec', testoPrec));
    var a = el('a', 'popup-link', 'Segnala un aggiornamento su questa perdita →');
    a.href = mailto('Aggiornamento perdita ' + p.id + ' - ' + p.indirizzo,
      'Perdita ' + p.id + ' (' + p.indirizzo + ')\n\nAggiornamento: \n\nAllego foto o video.');
    box.appendChild(a);
    return box;
  }

  function evidenzia(m, attiva) {
    var e = m.getElement && m.getElement();
    var pallino = e && e.firstChild;
    if (pallino) pallino.classList.toggle('sel', attiva);
  }

  function creaMarker(p) {
    var icona = L.divIcon({
      className: '',
      html: '<div class="marker-perdita ' + p.stato + (p.precisione === 'zona' ? ' zona' : '') + '"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14]
    });
    var m = L.marker([p.lat, p.lng], { icon: icona, title: p.id + ' — ' + p.indirizzo, alt: p.id + ' ' + p.indirizzo, keyboard: true });
    m.bindPopup(function () { return popup(p); });
    // MAPPA -> TABELLA
    m.on('popupopen', function () {
      evidenzia(m, true);
      if (selezionato !== p.id) seleziona(p.id, 'mappa');
    });
    m.on('popupclose', function () {
      evidenzia(m, false);
      if (selezionato === p.id) deseleziona();
    });
    return m;
  }

  /* ---------- selezione sincronizzata ---------- */
  function deseleziona() {
    if (selezionato && righe[selezionato]) {
      righe[selezionato].classList.remove('selezionata');
      righe[selezionato].setAttribute('aria-selected', 'false');
    }
    selezionato = null;
  }

  function scrollRiga(tr) {
    var box = $('mp-tabella-scroll');
    var top = tr.offsetTop - box.clientHeight / 2 + tr.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function seleziona(id, origine) {
    deseleziona();
    selezionato = id;
    var tr = righe[id];
    if (tr) {
      tr.classList.add('selezionata');
      tr.setAttribute('aria-selected', 'true');
      if (origine === 'mappa') scrollRiga(tr);
    }
    var m = marker[id];
    if (!m) mappa.closePopup();
    if (origine === 'tabella' && m) {                   // TABELLA -> MAPPA
      $('mp-mappa').scrollIntoView({ behavior: 'smooth', block: 'center' });
      cluster.zoomToShowLayer(m, function () { evidenzia(m, true); m.openPopup(); });
    }
  }

  /* ---------- filtri e rendering ---------- */
  function visibile(p) {
    if (filtro !== 'tutte' && p.stato !== filtro) return false;
    if (soloSenza && p.lat != null) return false;
    if (testoRicerca) {
      var t = (p.id + ' ' + p.indirizzo).toLowerCase();
      if (t.indexOf(testoRicerca) === -1) return false;
    }
    return true;
  }

  function creaRiga(p) {
    var tr = el('tr', 'riga' + (p.lat == null ? ' senza' : ''));
    tr.tabIndex = 0;
    tr.setAttribute('aria-selected', 'false');
    tr.appendChild(el('td', 'cod', p.id));
    tr.appendChild(el('td', 'via', p.indirizzo));
    var tdStato = el('td'); tdStato.appendChild(el('span', 'mp-badge ' + p.stato, STATI[p.stato] || p.stato)); tr.appendChild(tdStato);
    var tdPos = el('td');
    if (p.lat == null) tdPos.appendChild(el('span', 'mp-badge pos-no', 'Da definire'));
    else tdPos.appendChild(el('span', 'mp-badge pos-ok', POSIZIONE[p.precisione] || 'Sulla mappa'));
    tr.appendChild(tdPos);
    var vai = function () { seleziona(p.id, 'tabella'); };
    tr.addEventListener('click', vai);
    tr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); vai(); }
    });
    righe[p.id] = tr;
    return tr;
  }

  function aggiorna() {
    mappa.closePopup();
    deseleziona();
    righe = {};
    var lista = dati.filter(visibile);
    var posizionate = lista.filter(function (p) { return p.lat != null; });
    var senza = lista.filter(function (p) { return p.lat == null; });

    cluster.clearLayers();
    posizionate.forEach(function (p) { cluster.addLayer(marker[p.id]); });

    var corpo = $('mp-corpo');
    corpo.textContent = '';
    posizionate.forEach(function (p) { corpo.appendChild(creaRiga(p)); });

    if (senza.length) {
      var g = el('tr', 'gruppo');
      var td = el('td'); td.colSpan = 4;
      td.appendChild(el('div', null, '⚠ Perdite non ancora posizionate sulla mappa (' + senza.length + ')'));
      td.appendChild(el('p', null, 'Stiamo verificando dove si trovano: per ora compaiono solo in questa tabella.'));
      g.appendChild(td);
      corpo.appendChild(g);
      senza.forEach(function (p) { corpo.appendChild(creaRiga(p)); });
    }
    if (!lista.length) {
      var v = el('tr'); var tv = el('td', 'mp-vuoto', 'Nessuna perdita corrisponde ai filtri scelti.'); tv.colSpan = 4;
      v.appendChild(tv); corpo.appendChild(v);
    }
    $('mp-conteggio').textContent = lista.length + (lista.length === 1 ? ' perdita' : ' perdite');
    $('mp-tabella-scroll').scrollTop = 0;
    if (posizionate.length) mappa.fitBounds(cluster.getBounds().pad(0.15), { maxZoom: 16 });
  }

  /* ---------- avvio della mappa (solo quando la sezione è visibile) ---------- */
  function avviaMappa() {
    if (typeof L === 'undefined') {
      mostraErrore('Non è stato possibile caricare la mappa. Controlla la connessione e ricarica la pagina, oppure scrivi a ' + EMAIL + '.');
      return;
    }
    var mobile = L.Browser.mobile;
    mappa = L.map('mp-mappa', {
      center: LICATA, zoom: 14, minZoom: 11, maxZoom: 19,
      scrollWheelZoom: false,          // non blocca lo scroll della pagina: si attiva dopo un clic sulla mappa
      dragging: !mobile                // su telefono: due dita per spostare, una per scorrere la pagina
    });
    if (mobile) $('mp-suggerimento-mobile').style.display = 'block';
    mappa.on('click focus', function () { mappa.scrollWheelZoom.enable(); });
    mappa.on('mouseout blur', function () { mappa.scrollWheelZoom.disable(); });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mappa);
    cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40, spiderfyOnMaxZoom: true });
    mappa.addLayer(cluster);

    Array.prototype.forEach.call(sezione.querySelectorAll('.mp-chip[data-filtro]'), function (c) {
      c.addEventListener('click', function () {
        filtro = c.getAttribute('data-filtro');
        Array.prototype.forEach.call(sezione.querySelectorAll('.mp-chip[data-filtro]'), function (x) {
          x.setAttribute('aria-pressed', x === c ? 'true' : 'false');
        });
        aggiorna();
      });
    });
    $('mp-chip-senza').addEventListener('click', function () {
      soloSenza = !soloSenza;
      this.setAttribute('aria-pressed', soloSenza ? 'true' : 'false');
      aggiorna();
    });
    $('mp-ricerca').addEventListener('input', function (e) {
      testoRicerca = e.target.value.trim().toLowerCase();
      aggiorna();
    });

    caricaDati().then(function () {
      dati.forEach(function (p) { if (p.lat != null && p.lng != null) marker[p.id] = creaMarker(p); });
      aggiorna();
    }).catch(function () { /* l'errore è già mostrato da caricaDati */ });
  }

  function sezioneAperta() { return !sezione.classList.contains('pagina-nascosta'); }

  function controlla() {
    if (!sezioneAperta()) return;
    if (!mappa) avviaMappa();
    else setTimeout(function () { mappa.invalidateSize(); }, 50);   // la mappa era in una sezione nascosta
  }

  /* Il codice di navigazione del sito aggiunge/toglie la classe "pagina-nascosta":
     la osserviamo per sapere quando la sezione diventa visibile. */
  new MutationObserver(controlla).observe(sezione, { attributes: true, attributeFilter: ['class'] });

  caricaDati().catch(function () {});
  controlla();
})();
