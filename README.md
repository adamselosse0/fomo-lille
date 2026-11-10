# FOMO — Lille

Site du bar FOMO, bar de soif entre copains, 10 rue des Fossés à Lille.

## Pages
- `index.html` accueil · `carte.html` la carte complète · `evenements.html` · `scores.html` (échecs et fléchettes) · `infos.html` (accès, horaires, privatisation) · `mentions-legales.html`
- `admin.html` : back-office du gérant (connexion par e-mail et mot de passe)

## Fonctionnement
- Site statique (HTML, CSS, JavaScript sans framework), hébergé sur GitHub Pages.
- La carte, les événements, les scores et les horaires sont stockés dans une base Supabase et modifiés depuis le back-office. Le site les affiche en direct.
- Une copie locale est gardée dans le navigateur pour un affichage instantané, et `assets/data/fallback.json` sert de secours si la base ne répond pas.
- La structure des pages est générée par `src/build.py` (`python3 src/build.py`).
