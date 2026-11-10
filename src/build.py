"""Génère les pages HTML du site à partir d'un gabarit commun.

Usage : python3 src/build.py   (depuis la racine du dépôt)
Le contenu dynamique (carte, events, scores, horaires) vient de la base
de données : ce script ne sert qu'à la structure des pages.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://adamselosse0.github.io/fomo-lille/"
VERSION = "5"

NAV = [
    ("index.html", "Accueil", "accueil"),
    ("carte.html", "La carte", "carte"),
    ("evenements.html", "Événements", "evenements"),
    ("scores.html", "Scores", "scores"),
    ("infos.html", "Infos & accès", "infos"),
]

ICON = {
    "pin": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    "beer": '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h10v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M16 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M9 8v8M13 8v8"/></svg>',
    "pawn": '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M9 17h6l1 4H8z"/><path d="M10 17c0-3-2-4-2-7a4 4 0 0 1 8 0c0 3-2 4-2 7"/><path d="M12 3v3M10.5 4.5h3"/></svg>',
    "target": '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 12l7-7M17 3l2 2 2-1-1 2 2 2"/></svg>',
    "mega": '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
}


def head(title, desc, path):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0B7A5E">
<script>document.documentElement.classList.add('js')</script>
<link rel="canonical" href="{SITE}{'' if path == 'index.html' else path}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="FOMO Lille">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}{'' if path == 'index.html' else path}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230B7A5E'/%3E%3Ctext x='32' y='45' font-family='Arial Black,Arial' font-weight='900' font-size='38' text-anchor='middle' fill='%23FF7443'%3EF%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://eogckjhxuxbdflkrcmev.supabase.co" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Titan+One&family=Archivo:wdth,wght@62..125,400..800&display=swap">
<link rel="stylesheet" href="assets/css/site.css?v={VERSION}">
<script type="speculationrules">{{"prefetch":[{{"source":"document","where":{{"selector_matches":".nav-links a, .foot-nav a, .tile, .btn"}},"eagerness":"moderate"}}]}}</script>
"""


JSONLD = """<script type="application/ld+json">{"@context":"https://schema.org","@type":"BarOrPub","name":"FOMO","slogan":"Bar de soif entre copains","address":{"@type":"PostalAddress","streetAddress":"10 rue des Fossés","postalCode":"59800","addressLocality":"Lille","addressCountry":"FR"},"url":"%s","sameAs":["https://www.instagram.com/fomo.lille/"],"servesCuisine":"Planches apéritives","priceRange":"€"}</script>
""" % SITE


def header(active):
    cur = ' aria-current="page"'
    links = "\n".join(
        f'      <li><a href="{href}"{cur if key == active else ""}>{label}</a></li>'
        for href, label, key in NAV
    )
    return f"""</head>
<body data-page="{active}">
<a class="skip" href="#contenu">Aller au contenu</a>
<div class="loader" aria-hidden="true"><div class="word"><span>F</span><span>O</span><span>M</span><span>O</span></div><div class="board"></div></div>
<div class="progress" aria-hidden="true"></div>
<p class="announce" role="status"></p>
<header class="site-header">
  <nav class="wrap nav" aria-label="Navigation principale">
    <a href="index.html" class="brand" aria-label="FOMO, accueil">FOMO</a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="nav-links">Menu</button>
    <ul class="nav-links" id="nav-links">
{links}
    </ul>
  </nav>
</header>
<main id="contenu">
"""


FOOTER = """</main>
<footer class="site-footer">
  <div class="wrap">
    <a href="index.html" class="brand">FOMO</a>
    <p class="tagline">Bar de soif entre copains · 10 rue des Fossés, 59800 Lille</p>
    <nav class="foot-nav" aria-label="Pied de page">
      <a href="carte.html">La carte</a>
      <a href="evenements.html">Événements</a>
      <a href="scores.html">Scores</a>
      <a href="infos.html">Infos &amp; accès</a>
      <a href="infos.html#privatiser">Privatiser</a>
      <a href="https://www.instagram.com/fomo.lille/">Instagram</a>
    </nav>
    <div class="fine">
      <span>© 2026 FOMO Lille</span>
      <a href="mentions-legales.html">Mentions légales</a>
      <a href="admin.html" rel="nofollow">Espace gérant</a>
      <span>L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</span>
    </div>
  </div>
</footer>
<script src="assets/js/config.js?v=%s"></script>
<script src="assets/js/site.js?v=%s" defer></script>
</body>
</html>
""" % (VERSION, VERSION)


def page(path, key, title, desc, body, extra_head=""):
    h = head(title, desc, path)
    if path == "404.html":
        h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/fomo-lille/">', 1)
    html = h + extra_head + header(key) + body + FOOTER
    (ROOT / path).write_text(html, encoding="utf-8")
    print("écrit", path)


def hero(kicker, title, text):
    return f"""<section class="page-hero">
  <div class="wrap">
    <span class="label">{kicker}</span>
    <h1 class="display">{title}</h1>
    <p>{text}</p>
  </div>
</section>
<div class="checker" aria-hidden="true"></div>
"""


def sk(n, h):
    return "".join(f'<div class="sk" style="height:{h}px"></div>' for _ in range(n))


# ---------------- Accueil ----------------
page("index.html", "accueil",
     "FOMO — Bar de soif entre copains · Lille",
     "FOMO, bar de soif entre copains au 10 rue des Fossés à Lille : pintes à petits prix, cocktails, planches, échecs, fléchettes et soirées.",
     f"""<section class="home-hero">
  <div class="wrap">
    <h1 class="display">FOMO</h1>
    <p class="tag">Bar de soif entre copains</p>
    <p class="quote">Parce que « je reste chez moi » n’a jamais fait une bonne anecdote.</p>
    <div class="btns">
      <a class="btn btn-coral" href="carte.html">Voir la carte</a>
      <a class="btn btn-line" href="evenements.html">Les prochains events</a>
    </div>
    <p class="addr">{ICON['pin']} 10 rue des Fossés · Lille centre</p>
  </div>
</section>
<div class="wrap">
  <div class="stickers" aria-label="Quelques prix de la carte">
    <div class="sticker"><div class="price" id="st-pils">3€</div><p>Le demi de Super FOMO</p><small id="st-pils-sub">Notre pils maison · 5 € la pinte</small></div>
    <div class="sticker"><div class="price" id="st-cocktail">8€</div><p>Mojito, Margarita, Spritz…</p><small>La plupart des cocktails</small></div>
    <div class="sticker"><div class="price" id="st-metre">32€</div><p>Le mètre de shots</p><small>−20 % sur les shots, entre potes</small></div>
  </div>
</div>

<section class="section" aria-labelledby="h-tiles">
  <div class="wrap">
    <div class="section-head">
      <span class="label kicker">Au FOMO</span>
      <h2 class="display" id="h-tiles">On boit, on joue, on fête</h2>
    </div>
    <div class="grid-3 tiles">
      <a class="card tile reveal" href="carte.html"><span class="ico">{ICON['beer']}</span><h3>La carte</h3><p>Bières, cocktails, spritz, shots, softs et planches à partager, à prix doux.</p><span class="go">Voir toute la carte →</span></a>
      <a class="card tile reveal" href="evenements.html"><span class="ico">{ICON['mega']}</span><h3>Les events</h3><p>Tournois, soirées spéciales et collabs : tout ce qu’il ne faut pas rater.</p><span class="go">Voir l’agenda →</span></a>
      <a class="card tile reveal" href="scores.html"><span class="ico">{ICON['pawn']}</span><h3>Les scores</h3><p>Le classement maison aux échecs et aux fléchettes. Qui règne au FOMO ?</p><span class="go">Voir le classement →</span></a>
    </div>
  </div>
</section>

<section class="section teal" aria-labelledby="h-story">
  <div class="wrap">
    <div class="section-head">
      <span class="label kicker">L’histoire</span>
      <h2 class="display" id="h-story">Le rendez-vous à ne pas rater</h2>
    </div>
    <div class="story reveal">
      <p class="lead">Au 10 rue des Fossés, il y avait le Chess’nBar. Enzo, Ryad et Camille ont repris le lieu et l’ont rebaptisé FOMO, avec une idée simple : qu’on n’ait plus jamais envie de rester chez soi.</p>
      <p>L’esprit bar à jeux est toujours là, échiquiers compris. On y ajoute des pintes à petits prix, des cocktails, des planches à partager et des soirées qu’on raconte encore le lendemain.</p>
      <div class="btns" style="margin-top:30px"><a class="btn btn-coral" href="infos.html">Venir nous voir</a></div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="h-next">
  <div class="wrap">
    <div class="section-head">
      <span class="label kicker">En ce moment</span>
      <h2 class="display" id="h-next">Fear of missing out ?</h2>
    </div>
    <div class="ev-list" id="next-events">{sk(2, 150)}</div>
    <div class="btns" style="margin-top:36px"><a class="btn btn-ink" href="evenements.html">Tous les événements</a></div>
  </div>
</section>
""", extra_head=JSONLD)

# ---------------- Carte ----------------
page("carte.html", "carte",
     "La carte — FOMO · Bar à Lille",
     "La carte complète du FOMO à Lille : bières dont la Super FOMO à 3 €, vins, cocktails, spritz, mocktails, shots, softs et planches apéritives.",
     """<section class="pour" id="pour" aria-labelledby="pour-t">
  <div class="pour-stage">
    <div class="pour-lines" aria-live="off">
      <div class="pour-line on"><span class="label">La carte du FOMO</span><h1 class="display" id="pour-t">Une petite soif&nbsp;?</h1></div>
      <div class="pour-line"><span class="label">Notre pils maison</span><p class="display">La Super FOMO</p><p class="sub"><span id="pour-pils">3 €</span> le demi</p></div>
      <div class="pour-line"><span class="label">Mojito, Margarita, Spritz…</span><p class="display">Des cocktails</p><p class="sub">dès <span id="pour-cocktail">8 €</span></p></div>
      <div class="pour-line"><span class="label">Saucissons, tartinables, cheddar</span><p class="display">De quoi grignoter</p><p class="sub">dès <span id="pour-food">6 €</span></p></div>
      <div class="pour-line"><span class="label">Bières, vins, cocktails, softs, planches</span><p class="display">Toute la carte</p><p class="sub">juste en dessous</p></div>
    </div>
    <div class="glass-wrap" aria-hidden="true">
      <svg class="glass" viewBox="0 0 200 320" width="200" height="320">
        <defs>
          <clipPath id="glass-clip"><path d="M28 22 H172 L152 292 Q151 302 140 302 H60 Q49 302 48 292 Z"/></clipPath>
          <linearGradient id="beer-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFC24B"/><stop offset="1" stop-color="#E8901C"/></linearGradient>
        </defs>
        <rect class="stream" x="94" y="-40" width="12" height="0" rx="6" fill="#FFC24B"/>
        <g clip-path="url(#glass-clip)">
          <rect x="0" y="0" width="200" height="320" fill="rgba(255,255,255,.10)"/>
          <rect class="beer" x="0" y="302" width="200" height="320" fill="url(#beer-g)"/>
          <g class="bubbles" fill="rgba(255,255,255,.75)">
            <circle cx="70" cy="290" r="3"/><circle cx="96" cy="290" r="2"/><circle cx="118" cy="290" r="3.5"/><circle cx="140" cy="290" r="2"/><circle cx="84" cy="290" r="2.5"/><circle cx="128" cy="290" r="2"/>
          </g>
          <g class="foam" fill="#FFF8EC"><rect x="0" y="0" width="200" height="0"/></g>
        </g>
        <g class="foam-top" fill="#FFF8EC"><circle cx="46" cy="24" r="16"/><circle cx="74" cy="16" r="20"/><circle cx="106" cy="13" r="22"/><circle cx="138" cy="17" r="20"/><circle cx="162" cy="25" r="15"/></g>
        <path d="M28 22 H172 L152 292 Q151 302 140 302 H60 Q49 302 48 292 Z" fill="none" stroke="#FFF4E6" stroke-width="6" stroke-linejoin="round"/>
        <path d="M44 48 L60 270" stroke="rgba(255,255,255,.45)" stroke-width="7" stroke-linecap="round"/>
      </svg>
    </div>
    <a class="pour-skip" href="#carte-debut">Passer à la carte <span aria-hidden="true">↓</span></a>
    <div class="pour-bar" aria-hidden="true"><span></span></div>
  </div>
</section>
<div class="checker" aria-hidden="true" id="carte-debut"></div>
""" +
     f"""<nav class="chips" aria-label="Rubriques de la carte"><div class="wrap chips-inner" id="chips"></div></nav>
<div class="wrap" style="padding-bottom:96px">
  <div id="menu"><div class="family"><div class="menu-grid">{sk(4, 320)}</div></div></div>
  <p class="legal-line">Tous les prix sont TTC. L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>
</div>
""")

# ---------------- Événements ----------------
page("evenements.html", "evenements",
     "Événements — FOMO · Bar à Lille",
     "Les prochains événements du FOMO à Lille : tournois d’échecs, soirées spéciales et collaborations.",
     hero("Agenda", "Les events", "Tournois, soirées spéciales, collabs : voici ce qui arrive au FOMO. Le reste est annoncé en story sur Instagram.") +
     f"""<section class="section">
  <div class="wrap">
    <div class="ev-list" id="events">{sk(3, 150)}</div>
    <div class="btns" style="margin-top:44px"><a class="btn btn-teal" href="https://www.instagram.com/fomo.lille/">Suivre @fomo.lille</a></div>
  </div>
</section>
""")

# ---------------- Scores ----------------
page("scores.html", "scores",
     "Scores — FOMO · Bar à Lille",
     "Les classements échecs et fléchettes du FOMO, bar de soif entre copains à Lille.",
     hero("Le tableau des scores", "Qui règne au FOMO ?", "Échiquiers et cibles : voici les classements de la maison. Tu n’y es pas encore ? Il n’y a qu’une solution, venir jouer.") +
     f"""<section class="section">
  <div class="wrap">
    <p class="demo-note">Classement de démonstration : les vrais résultats arrivent bientôt.</p>
    <div class="tabs" role="tablist" aria-label="Choisir le classement">
      <button class="tab" type="button" role="tab" id="tab-echecs" aria-controls="score-panel" aria-selected="true" data-game="echecs">{ICON['pawn'].replace('30', '22')} Échecs</button>
      <button class="tab" type="button" role="tab" id="tab-flechettes" aria-controls="score-panel" aria-selected="false" tabindex="-1" data-game="flechettes">{ICON['target'].replace('30', '22')} Fléchettes</button>
    </div>
    <div id="score-panel" role="tabpanel" aria-labelledby="tab-echecs">
      <div class="podium" id="podium"></div>
      <div class="card table-card">
        <div class="table-scroll"><table><caption class="sr-only">Classement</caption><thead id="thead"></thead><tbody id="tbody"><tr><td colspan="7">{sk(5, 28)}</td></tr></tbody></table></div>
        <div class="rules" id="rules"></div>
      </div>
    </div>
    <div class="btns" style="margin-top:48px"><a class="btn btn-coral" href="evenements.html">Prochains tournois</a></div>
  </div>
</section>
""")

# ---------------- Infos ----------------
page("infos.html", "infos",
     "Infos & accès — FOMO · Bar à Lille",
     "Adresse, accès, horaires et privatisation du FOMO, 10 rue des Fossés à Lille, près du métro Rihour.",
     hero("Infos &amp; accès", "On t’attend.", "10 rue des Fossés, en plein Lille centre, à deux pas de la place Rihour et du Vieux-Lille.") +
     f"""<section class="section">
  <div class="wrap">
    <div class="grid-3 info-grid">
      <div class="card info reveal">
        <span class="label kicker">Adresse</span>
        <p class="big">10 rue des Fossés<br>59800 Lille</p>
        <p>Lille centre</p>
        <a class="btn btn-teal" href="https://www.google.com/maps/search/?api=1&amp;query=FOMO%2010%20rue%20des%20Foss%C3%A9s%2059800%20Lille">Itinéraire</a>
      </div>
      <div class="card info reveal">
        <span class="label kicker">Horaires</span>
        <div id="hours">{sk(4, 22)}</div>
      </div>
      <div class="card info reveal">
        <span class="label kicker">En transports</span>
        <p class="big">Métro Rihour</p>
        <p>Ligne 1, à quelques minutes à pied</p>
        <p class="big" style="margin-top:14px">Lille Flandres</p>
        <p>Lignes 1 et 2, gares et trams</p>
      </div>
    </div>
  </div>
</section>
<section class="section" id="privatiser" style="padding-top:0">
  <div class="wrap">
    <div class="private reveal">
      <span class="label">Réserver &amp; privatiser</span>
      <h2 class="display">Un anniv’ ? Un afterwork ? Un pot de départ ?</h2>
      <p>Viens fêter ça au FOMO. Envoie-nous la date, le nombre de personnes et ton idée, on te répond vite.</p>
      <ul class="occasions"><li>Anniversaires</li><li>Afterworks</li><li>Pots de départ</li><li>Tournois &amp; soirées jeux</li></ul>
      <div id="contact" style="margin-bottom:22px"></div>
      <div class="btns"><a class="btn btn-ink" href="https://ig.me/m/fomo.lille">Écrire sur Instagram</a></div>
    </div>
  </div>
</section>
""")

# ---------------- Mentions légales ----------------
page("mentions-legales.html", "legal",
     "Mentions légales — FOMO · Lille",
     "Mentions légales du site du FOMO, bar à Lille.",
     hero("Informations", "Mentions légales", "Les informations obligatoires sur l’éditeur et l’hébergement du site.") +
     """<section class="section">
  <div class="wrap prose">
    <h2>Éditeur du site</h2>
    <p>FOMO LILLE, SAS au capital de 3 000 €, 10 rue des Fossés, 59800 Lille. RCS Lille Métropole 927 793 588. Directrice de la publication : Camille Demilito, présidente.</p>
    <h2>Hébergement</h2>
    <p>Site hébergé par GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis). Données de la carte et des classements hébergées par Supabase (Supabase, Inc.), sur des serveurs situés dans l’Union européenne.</p>
    <h2>Données personnelles</h2>
    <p>Le site ne dépose pas de cookie publicitaire ni de traceur de mesure d’audience. Il mémorise seulement dans ton navigateur une copie de la carte, pour s’afficher plus vite. Les noms affichés dans les classements le sont avec l’accord des joueurs ; pour en demander le retrait, écris-nous sur Instagram.</p>
    <h2>Propriété intellectuelle</h2>
    <p>Le nom FOMO, le logo et les contenus du site appartiennent à FOMO LILLE. Toute reproduction sans autorisation est interdite.</p>
    <h2>Alcool</h2>
    <p>L’abus d’alcool est dangereux pour la santé, à consommer avec modération. La vente d’alcool aux mineurs est interdite.</p>
  </div>
</section>
""")

# ---------------- 404 ----------------
page("404.html", "404",
     "Page introuvable — FOMO · Lille",
     "Cette page n’existe pas.",
     hero("Oups", "Page introuvable", "Cette page a dû partir boire un verre sans nous.") +
     """<section class="section"><div class="wrap"><div class="btns"><a class="btn btn-coral" href="index.html">Retour à l’accueil</a><a class="btn btn-teal" href="carte.html">Voir la carte</a></div></div></section>
""")
