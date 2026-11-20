#!/usr/bin/env python3
"""Genera le versioni a tema del sito partendo da index.html.

Uso:  python3 temi/build.py   (dalla cartella del progetto)

Ogni versione mantiene markup, ID e script dell'originale: cambia solo
l'aspetto (temi/<nome>.css), l'apertura con galleria di foto, le fasce
fotografiche tra le sezioni e i crediti delle immagini nel footer.
In più, ogni versione incorpora la mappa delle perdite idriche
(temi/mappa.html + mappa.css + mappa.js, dati in perdite/perdite.json):
un'anteprima in home, la sezione #mappa-perdite, la voce di menu, il
pulsante nell'apertura e il link nel footer. index.html non viene toccato.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "index.html").read_text(encoding="utf-8")
CREDITI = json.loads((ROOT / "img/licata/crediti.json").read_text(encoding="utf-8"))

VERSIONI = {
    "mare": {
        "titolo": "Mare e Faro",
        "font": "family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700",
        "effetto": "dissolvenza",
        "hero": ["porto-castello", "aerea-1", "porto", "panorama", "mollarella"],
        "fasce": {
            "turni": ("porto", "Il porto di Licata", "Una città sul mare che resta senz'acqua nelle case."),
            "modulistica": ("aerea-3", "Licata dall'alto", "Ogni quartiere ha diritto allo stesso servizio."),
            "chi-siamo": ("mollarella", "Mollarella", "Un comitato di cittadini, per i cittadini."),
        },
    },
    "pietra": {
        "titolo": "Pietra e Memoria",
        "font": "family=Playfair+Display:ital,wght@0,600;0,800;1,500&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@500;600",
        "effetto": "kenburns",
        "hero": ["corso", "palazzo-citta", "castello", "porto-faro"],
        "fasce": {
            "turni": ("corso", "Corso Vittorio Emanuele, primo Novecento", "La storia di Licata è anche storia della sua acqua."),
            "modulistica": ("palazzo-citta", "Palazzo di Città", "Le istituzioni devono rispondere ai cittadini."),
            "chi-siamo": ("castello-ovest", "Castel Sant'Angelo", "Custodire un bene comune, insieme."),
        },
    },
    "onda": {
        "titolo": "Onda",
        "font": "family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600",
        "effetto": "scorrimento",
        "hero": ["mollarella", "mollarella-2", "porto", "aerea-1", "porto-castello"],
        "fasce": {
            "turni": ("mollarella-2", "Mollarella", "Il mare non basta: serve acqua nei rubinetti."),
            "modulistica": ("aerea-1", "Licata vista dall'alto", "Segnala, documenta, partecipa."),
            "chi-siamo": ("panorama", "Panorama dal castello", "Insieme siamo un'onda."),
        },
    },
    "manifesto": {
        "titolo": "Manifesto",
        "font": "family=Anton&family=Space+Grotesk:wght@400;500;700",
        "effetto": "scatto",
        "hero": ["porto-faro", "corso", "aerea-3", "castello", "porto"],
        "fasce": {
            "turni": ("corso", "Licata, Corso Vittorio Emanuele", "L'ACQUA È UN DIRITTO."),
            "modulistica": ("porto-faro", "Porto e faro di Licata", "NON UN PRIVILEGIO."),
            "chi-siamo": ("aerea-3", "Licata dall'alto", "ORGANIZZIAMOCI."),
        },
    },
    "maiolica": {
        "titolo": "Maiolica",
        "font": "family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Nunito+Sans:wght@400;600;700",
        "effetto": "archi",
        "hero": ["castello", "palazzo-citta", "mollarella", "porto-castello"],
        "fasce": {
            "turni": ("castello", "Castel Sant'Angelo", "Acqua, terra e luce: i colori della nostra città."),
            "modulistica": ("mollarella", "La spiaggia di Mollarella", "Un bene comune va custodito da tutti."),
            "chi-siamo": ("palazzo-citta", "Palazzo di Città", "Licata merita un servizio degno."),
        },
    },
}

MAPPA_HTML = (ROOT / "temi/mappa.html").read_text(encoding="utf-8")

# Leaflet + MarkerCluster da cdnjs, con controllo di integrità (stessi file della pagina mappa_perdite.html)
LEAFLET_CSS = (
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" integrity="sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb" crossorigin="anonymous" referrerpolicy="no-referrer">\n'
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css" integrity="sha384-pmjIAcz2bAn0xukfxADbZIb3t8oRT9Sv0rvO+BR5Csr6Dhqq+nZs59P0pPKQJkEV" crossorigin="anonymous" referrerpolicy="no-referrer">\n'
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css" integrity="sha384-wgw+aLYNQ7dlhK47ZPK7FRACiq7ROZwgFNg0m04avm4CaXS+Z9Y7nMu8yNjBKYC+" crossorigin="anonymous" referrerpolicy="no-referrer">\n'
)
LEAFLET_JS = (
    '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" integrity="sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
    '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js" integrity="sha384-eXVCORTRlv4FUUgS/xmOyr66XBVraen8ATNLMESp92FKXLAMiKkerixTiBvXriZr" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n'
    '<script defer src="temi/mappa.js"></script>\n'
)

CRED = {Path(c["file"]).stem: c for c in CREDITI}


def img(key):
    return f"img/licata/{key}.jpg"


def galleria(v):
    slides = "".join(
        f'<div class="slide{" attiva" if i == 0 else ""}" style="background-image:url(\'{img(k)}\')" '
        f'role="img" aria-label="{html.escape(CRED[k]["titolo"])}"></div>'
        for i, k in enumerate(v["hero"])
    )
    punti = "".join(
        f'<button type="button" class="punto{" attivo" if i == 0 else ""}" aria-label="Foto {i + 1}"></button>'
        for i in range(len(v["hero"]))
    )
    return (
        f'<div class="hero-galleria" data-effetto="{v["effetto"]}" aria-hidden="false">{slides}'
        f'<div class="hero-velo"></div></div>'
        f'<div class="hero-punti" role="group" aria-label="Scegli la foto">{punti}</div>'
    )


def fascia(key, didascalia, frase):
    return (
        f'<div class="fascia-foto rivela" style="--foto:url(\'{img(key)}\')">'
        f'<div class="fascia-sfondo"></div>'
        f'<div class="fascia-testo wrap"><p class="fascia-frase">{html.escape(frase)}</p>'
        f'<p class="fascia-didascalia">{html.escape(didascalia)}</p></div></div>\n'
    )


def crediti():
    righe = "".join(
        f'<li><a href="{c["fonte"]}" target="_blank" rel="noopener">{html.escape(c["titolo"])}</a> — '
        f'{html.escape(c["autore"])}, '
        + (f'<a href="{c["licenza_url"]}" target="_blank" rel="noopener license">{c["licenza"]}</a>'
           if c["licenza_url"] else c["licenza"])
        + "</li>"
        for c in CREDITI
    )
    return (
        '<details class="crediti-foto wrap"><summary>Crediti fotografici (Wikimedia Commons)</summary>'
        f'<ul>{righe}</ul><p>Le foto CC BY-SA sono ridimensionate e ricompresse; '
        'le modifiche sono rilasciate con la stessa licenza.</p></details>\n'
    )


def selettore(attuale):
    voci = '<a href="index.html">Originale</a>' + "".join(
        f'<a href="index-{n}.html"{" aria-current=page" if n == attuale else ""}>{v["titolo"]}</a>'
        for n, v in VERSIONI.items()
    )
    return f'<nav class="selettore-versioni" aria-label="Versioni del sito"><span>Versioni:</span>{voci}</nav>\n'


def sostituisci(out, vecchio, nuovo):
    """Sostituzione esatta, con errore chiaro se index.html è cambiato."""
    assert vecchio in out, f"punto di aggancio non trovato in index.html: {vecchio[:60]!r}"
    return out.replace(vecchio, nuovo, 1)


def incorpora_mappa(out):
    """Collega la mappa delle perdite alla home: pulsante, menu, anteprima, sezione, footer."""
    # pulsante nell'apertura
    out = sostituisci(
        out,
        '<a href="#turni" class="btn btn-primario">Controlla il turno del tuo comune</a>\n',
        '<a href="#turni" class="btn btn-primario">Controlla il turno del tuo comune</a>\n'
        '        <a href="#mappa-perdite" class="btn btn-secondario">Mappa delle perdite a Licata</a>\n',
    )
    # voce di menu
    out = sostituisci(
        out,
        '<a href="#turni">Turni idrici</a>\n      <a href="#arera">ARERA</a>',
        '<a href="#turni">Turni idrici</a>\n      <a href="#mappa-perdite">Mappa perdite</a>\n      <a href="#arera">ARERA</a>',
    )
    # link nel footer
    out = sostituisci(
        out,
        '<li><a href="#arera">ARERA</a></li>',
        '<li><a href="#mappa-perdite">Mappa delle perdite</a></li>\n        <li><a href="#arera">ARERA</a></li>',
    )
    # anteprima (in home) + sezione con la mappa, subito dopo i turni
    marcatore = "<!-- ===================== ARERA ===================== -->"
    out = sostituisci(out, marcatore, MAPPA_HTML + marcatore)
    # l'anteprima compare in home insieme alle altre sezioni
    out = sostituisci(
        out,
        "const SEZIONI_HOME = ['contenuto', 'avvisi', 'comunicati-comitato', 'turni'];",
        "const SEZIONI_HOME = ['contenuto', 'avvisi', 'comunicati-comitato', 'turni', 'mappa-anteprima'];",
    )
    return out


def costruisci(nome, v):
    out = SRC
    testa = (
        f'<link href="https://fonts.googleapis.com/css2?{v["font"]}&display=swap" rel="stylesheet">\n'
        f'<link rel="stylesheet" href="temi/comune.css">\n'
        f'{LEAFLET_CSS}'
        f'<link rel="stylesheet" href="temi/mappa.css">\n'
        f'<link rel="stylesheet" href="temi/{nome}.css">\n</head>'
    )
    out = out.replace("</head>", testa, 1)
    out = out.replace("<body>", f'<body class="tema tema-{nome}">', 1)

    vecchia = '<section class="hero" id="contenuto">'
    assert vecchia in out, "apertura non trovata in index.html"
    out = out.replace(vecchia, f'<section class="hero" id="contenuto">\n{galleria(v)}', 1)

    for sezione, (k, didascalia, frase) in v["fasce"].items():
        marcatore = f'<section class="alt" id="{sezione}">' if f'<section class="alt" id="{sezione}">' in out else f'<section id="{sezione}">'
        assert marcatore in out, f"sezione {sezione} non trovata"
        out = out.replace(marcatore, fascia(k, didascalia, frase) + marcatore, 1)

    out = incorpora_mappa(out)

    out = out.replace('<div class="footer-base">', crediti() + '  <div class="footer-base">', 1)
    out = out.replace("</body>", f'{selettore(nome)}{LEAFLET_JS}<script src="temi/comune.js" defer></script>\n</body>', 1)
    (ROOT / f"index-{nome}.html").write_text(out, encoding="utf-8")
    print(f"index-{nome}.html")


if __name__ == "__main__":
    for nome, v in VERSIONI.items():
        costruisci(nome, v)
