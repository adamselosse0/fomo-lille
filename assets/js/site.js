/* FOMO — script commun du site public */
(function () {
  'use strict';

  var CFG = window.FOMO_CONFIG;
  var CACHE_KEY = 'fomo-data-v1';
  var page = document.body.getAttribute('data-page');

  /* ---------- Outils ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }
  function euro(n) {
    if (n == null || n === '') return '';
    var v = Number(n);
    var s = (v % 1 === 0) ? String(v) : v.toFixed(2).replace('.', ',');
    return s + ' €';
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- Loader et barre de progression ---------- */
  var loader = $('.loader');
  var firstVisit = true;
  try { firstVisit = !sessionStorage.getItem('fomo-seen'); sessionStorage.setItem('fomo-seen', '1'); } catch (e) {}
  var loaderStart = Date.now();
  function hideLoader() {
    if (!loader) return;
    var wait = firstVisit ? Math.max(0, 650 - (Date.now() - loaderStart)) : 0;
    setTimeout(function () { loader.classList.add('done'); }, wait);
  }
  if (loader && !firstVisit) loader.classList.add('done');
  setTimeout(hideLoader, 2500); // sécurité : jamais bloqué

  var bar = $('.progress');
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || !bar) return;
    var href = a.getAttribute('href') || '';
    if (a.target || /^(https?:|mailto:|tel:|#)/.test(href)) return;
    bar.style.opacity = '1'; bar.style.width = '70%';
  });
  window.addEventListener('pageshow', function () { if (bar) { bar.style.width = '0'; bar.style.opacity = '0'; } });

  /* ---------- Menu mobile ---------- */
  var burger = $('.burger'), links = $('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
    });
  }

  /* ---------- Apparition au défilement ---------- */
  function observeReveal() {
    var els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Données : cache local + base Supabase + secours ---------- */
  function api(path) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(CFG.url + '/rest/v1/' + path, {
      headers: { apikey: CFG.key },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function fetchAll() {
    return Promise.all([
      api('menu_sections?select=*,menu_items(*)&order=position.asc&menu_items.order=position.asc'),
      api('events?select=*&published=eq.true&order=event_date.asc.nullslast,position.asc'),
      api('players?select=*'),
      api('settings?select=*&id=eq.1')
    ]).then(function (r) { return { menu: r[0], events: r[1], players: r[2], settings: r[3], at: Date.now() }; });
  }
  function fallback() { return fetch(CFG.fallback).then(function (r) { return r.json(); }); }

  var rendered = null;
  function render(data) {
    var sig = JSON.stringify([data.menu, data.events, data.players, data.settings]);
    if (sig === rendered) return;
    rendered = sig;
    var s = (data.settings && data.settings[0]) || {};
    renderCommon(s);
    if (RENDER[page]) RENDER[page](data, s);
    observeReveal();
    hideLoader();
  }

  var cached = store(CACHE_KEY);
  if (cached) render(cached);
  fetchAll()
    .then(function (d) { store(CACHE_KEY, d); render(d); })
    .catch(function () { if (!cached) fallback().then(render).catch(hideLoader); });

  /* ---------- Éléments communs ---------- */
  function renderCommon(s) {
    var ann = $('.announce');
    if (ann) {
      if (s.announcement) { ann.textContent = s.announcement; ann.classList.add('on'); }
      else ann.classList.remove('on');
    }
  }

  /* ---------- Rendus par page ---------- */
  var RENDER = {};

  RENDER.carte = function (d) {
    var families = [];
    var byFam = {};
    (d.menu || []).forEach(function (sec) {
      if (!byFam[sec.family]) { byFam[sec.family] = []; families.push(sec.family); }
      byFam[sec.family].push(sec);
    });
    function slug(t) { return 'cat-' + String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

    $('#chips').innerHTML = families.map(function (f) {
      return '<a class="chip" href="#' + slug(f) + '">' + esc(f) + '</a>';
    }).join('');

    var tip = '';
    $('#menu').innerHTML = families.map(function (f) {
      return '<section class="family" id="' + slug(f) + '" aria-labelledby="' + slug(f) + '-t">' +
        '<h2 class="display" id="' + slug(f) + '-t">' + esc(f) + '</h2>' +
        '<div class="menu-grid">' + byFam[f].map(function (sec) {
          var two = !!(sec.col1 || sec.col2);
          var items = (sec.menu_items || []).map(function (it) {
            var prices = it.price_text
              ? '<span class="p">' + esc(it.price_text) + '</span>'
              : '<span class="p">' + euro(it.price1) + '</span>' + (two ? '<span class="p">' + euro(it.price2) + '</span>' : '');
            return '<div class="mrow' + (it.highlight ? ' hl' : '') + (it.available ? '' : ' off') + '">' +
              '<span class="n">' + esc(it.name) + (it.detail ? ' <small>' + esc(it.detail) + '</small>' : '') + '</span>' +
              (it.volume ? '<span class="v">' + esc(it.volume) + '</span>' : '') + prices + '</div>';
          }).join('');
          var note = sec.note || '';
          if (/cocktail personnalis/i.test(note)) { tip = note; note = ''; }
          return '<article class="card menu-card reveal"><h3>' + esc(sec.name) + '</h3>' +
            (two ? '<div class="mcols"><span>' + esc(sec.col1 || '') + '</span><span>' + esc(sec.col2 || '') + '</span></div>' : '') +
            items + (note ? '<p class="menu-note">' + esc(note) + '</p>' : '') + '</article>';
        }).join('') + '</div></section>';
    }).join('') + (tip ? '<p class="menu-tip reveal">' + esc(tip) + '</p>' : '');

    // Chip actif selon la section visible
    if ('IntersectionObserver' in window) {
      var chips = document.querySelectorAll('.chip');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('.family').forEach(function (f) { io.observe(f); });
    }
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  };

  var MONTHS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function upcoming(events) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return (events || []).filter(function (e) { return !e.event_date || new Date(e.event_date + 'T00:00:00') >= today; });
  }
  function eventCard(e) {
    var date;
    if (e.event_date) {
      var dt = new Date(e.event_date + 'T00:00:00');
      date = '<div class="date"><span class="d">' + dt.getDate() + '</span><span class="m">' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</span></div>';
    } else {
      date = '<div class="date"><span class="r">' + esc(e.recurring || 'Bientôt') + '</span></div>';
    }
    var meta = [e.event_date && e.recurring ? e.recurring : '', e.event_time || ''].filter(Boolean).join(' · ');
    return '<article class="card ev reveal">' + date + '<div class="body"><h3>' + esc(e.title) + '</h3>' +
      (meta ? '<span class="meta">' + esc(meta) + '</span>' : '') +
      (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
      (e.link ? '<a class="btn btn-teal" href="' + esc(safeUrl(e.link)) + '">' + esc(e.link_label || 'En savoir plus') + '</a>' : '') +
      '</div></article>';
  }

  RENDER.evenements = function (d) {
    var list = upcoming(d.events);
    $('#events').innerHTML = list.length ? list.map(eventCard).join('')
      : '<p class="empty">Pas d’événement annoncé pour le moment. Suis-nous sur Instagram pour ne rien rater !</p>';
  };

  RENDER.accueil = function (d) {
    var list = upcoming(d.events).slice(0, 3);
    var box = $('#next-events');
    if (box) box.innerHTML = list.length ? list.map(eventCard).join('') : '<p class="empty">Les prochains events arrivent très vite.</p>';
    // Prix mis en avant, lus dans la carte
    var all = [];
    (d.menu || []).forEach(function (s) { (s.menu_items || []).forEach(function (i) { all.push(i); }); });
    function find(n) { return all.filter(function (i) { return i.name === n || i.detail === n; })[0]; }
    var pils = find('Super FOMO'), mojito = find('Mojito'), metre = find('Mètre de shots');
    if (pils && $('#st-pils')) { $('#st-pils').textContent = euro(pils.price1).replace(' ', ''); $('#st-pils-sub').textContent = 'Notre pils maison · ' + euro(pils.price2) + ' la pinte'; }
    if (mojito && $('#st-cocktail')) $('#st-cocktail').textContent = euro(mojito.price1).replace(' ', '');
    if (metre && $('#st-metre')) $('#st-metre').textContent = euro(metre.price1).replace(' ', '');
  };

  RENDER.infos = function (d, s) {
    var h = Array.isArray(s.hours) ? s.hours : [];
    $('#hours').innerHTML = h.length
      ? '<ul class="hours">' + h.map(function (r) { return '<li><b>' + esc(r.label) + '</b><span>' + esc(r.value) + '</span></li>'; }).join('') + '</ul>'
      : '<p>Les horaires et fermetures exceptionnelles sont annoncés sur notre Instagram.</p>';
    var c = [];
    if (s.phone) c.push('<p class="big">' + esc(s.phone) + '</p>');
    if (s.email) c.push('<p>' + esc(s.email) + '</p>');
    $('#contact').innerHTML = c.length ? c.join('') : '<p class="big">@' + esc(s.instagram || 'fomo.lille') + '</p><p>Le plus simple : un message sur Instagram.</p>';
  };

  var GAMES = {
    echecs: {
      cols: ['#', 'Joueur', 'Parties', 'V', 'N', 'D', 'Points'],
      pts: function (p) { return p.wins * 3 + p.draws; },
      cells: function (p) { return [p.wins + p.draws + p.losses, p.wins, p.draws, p.losses]; },
      tie: function (a, b) { return b.wins - a.wins; }, rule: 'chess_rule'
    },
    flechettes: {
      cols: ['#', 'Joueur', 'Matchs', 'V', 'D', 'Meilleur finish', 'Points'],
      pts: function (p) { return p.wins * 2; },
      cells: function (p) { return [p.wins + p.losses, p.wins, p.losses, p.best_finish || '—']; },
      tie: function (a, b) { return (b.best_finish || 0) - (a.best_finish || 0); }, rule: 'darts_rule'
    }
  };
  var scoreData = null, scoreSettings = {};
  function drawScores(game) {
    var g = GAMES[game];
    var list = (scoreData || []).filter(function (p) { return p.game === game; })
      .map(function (p) { return { p: p, pts: g.pts(p) }; })
      .sort(function (a, b) { return (b.pts - a.pts) || g.tie(a.p, b.p) || a.p.name.localeCompare(b.p.name); });
    var rank = 0, prev = null;
    list.forEach(function (x, i) { if (x.pts !== prev) { rank = i + 1; prev = x.pts; } x.rank = rank; });
    $('#podium').innerHTML = ['p1', 'p2', 'p3'].map(function (c, i) {
      var x = list[i]; if (!x) return '';
      return '<div class="card step ' + c + '"><div class="pos">' + x.rank + (x.rank === 1 ? 'er' : 'e') + '</div><div class="who">' + esc(x.p.name) + '</div><div class="pts">' + x.pts + ' pts</div></div>';
    }).join('');
    $('#thead').innerHTML = '<tr>' + g.cols.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr>';
    $('#tbody').innerHTML = list.length ? list.map(function (x) {
      return '<tr><td>' + x.rank + '</td><td class="name">' + esc(x.p.name) + '</td>' + g.cells(x.p).map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '<td class="pts">' + x.pts + '</td></tr>';
    }).join('') : '<tr><td colspan="' + g.cols.length + '" class="empty">Pas encore de résultats : le premier tournoi arrive !</td></tr>';
    $('#rules').textContent = scoreSettings[g.rule] || '';
  }
  RENDER.scores = function (d, s) {
    scoreData = d.players || []; scoreSettings = s;
    $('.demo-note').classList.toggle('on', !!s.scores_demo);
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    function select(t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
      $('#score-panel').setAttribute('aria-labelledby', t.id);
      drawScores(t.getAttribute('data-game'));
      try { history.replaceState(null, '', '#' + t.getAttribute('data-game')); } catch (e) {}
      if (focus) t.focus();
    }
    if (!tabs[0].dataset.bound) {
      tabs.forEach(function (t, i) {
        t.dataset.bound = '1';
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
        });
      });
    }
    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    select(location.hash === '#flechettes' && !tabs[0].dataset.started ? tabs[1] : (current || tabs[0]));
    tabs[0].dataset.started = '1';
  };
})();
