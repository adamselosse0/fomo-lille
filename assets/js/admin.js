/* FOMO — back-office */
(function () {
  'use strict';
  var CFG = window.FOMO_CONFIG;
  var sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k in e && typeof attrs[k] !== 'string') e[k] = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var toastT;
  function toast(msg, bad) {
    var t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, bad ? 4000 : 1600);
  }
  function check(res) {
    if (res.error) { toast('Erreur : ' + res.error.message, true); throw res.error; }
    return res.data;
  }

  /* Enregistrement automatique d'un champ */
  var timers = {};
  function save(table, id, patch) {
    return sb.from(table).update(patch).eq('id', id).select().then(function (r) {
      check(r);
      if (!r.data || !r.data.length) { toast('Non enregistré : droits insuffisants', true); return; }
      toast('Enregistré ✓');
    });
  }
  function bind(input, table, id, col, kind) {
    var key = table + id + col;
    function value() {
      if (kind === 'bool') return input.checked;
      if (kind === 'num') { var v = input.value.trim().replace(',', '.'); return v === '' ? null : Number(v); }
      if (kind === 'int') { var n = parseInt(input.value, 10); return isNaN(n) ? 0 : Math.max(0, n); }
      if (kind === 'intnull') { var m = parseInt(input.value, 10); return isNaN(m) ? null : m; }
      var s = input.value.trim(); return s === '' ? null : s;
    }
    function go() { var v = value(); if (kind === 'req' && v == null) { toast('Ce champ ne peut pas être vide', true); return; } var p = {}; p[col] = v; save(table, id, p); }
    if (kind === 'bool' || input.tagName === 'SELECT') input.addEventListener('change', go);
    else input.addEventListener('input', function () { clearTimeout(timers[key]); timers[key] = setTimeout(go, 600); });
  }
  function field(type, val, extra) {
    var i = el('input', Object.assign({ type: type }, extra || {}));
    if (type === 'checkbox') i.checked = !!val; else i.value = val == null ? '' : val;
    return i;
  }

  /* ---------- Vues ---------- */
  function show(view) {
    ['login-view', 'denied-view', 'app-view'].forEach(function (v) { $('#' + v).classList.toggle('hidden', v !== view); });
    $('#who').classList.toggle('hidden', view === 'login-view');
  }

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#login-err').textContent = '';
    var btn = this.querySelector('button'); btn.disabled = true; btn.textContent = 'Connexion…';
    sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value }).then(function (r) {
      btn.disabled = false; btn.textContent = 'Se connecter';
      if (r.error) { $('#login-err').textContent = 'E-mail ou mot de passe incorrect.'; return; }
      start(r.data.session);
    });
  });
  function logout() { sb.auth.signOut().then(function () { show('login-view'); }); }
  $('#logout').addEventListener('click', logout);
  $('#logout2').addEventListener('click', logout);

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('on', p.id === t.dataset.panel); });
    });
  });

  function start(session) {
    if (!session) { show('login-view'); return; }
    $('#who-email').textContent = session.user.email;
    sb.from('admins').select('user_id').eq('user_id', session.user.id).then(function (r) {
      if (r.error || !r.data || !r.data.length) { show('denied-view'); return; }
      show('app-view');
      loadMenu(); loadEvents(); loadScores(); loadSettings();
    });
  }
  sb.auth.getSession().then(function (r) { start(r.data.session); });

  /* ---------- Carte ---------- */
  var openSections = {};
  function loadMenu() {
    sb.from('menu_sections').select('*, menu_items(*)').order('position').order('position', { referencedTable: 'menu_items' }).then(function (r) {
      var secs = check(r);
      var box = $('#sections'); box.innerHTML = '';
      secs.forEach(function (s, si) { box.appendChild(sectionBlock(s, si, secs)); });
    });
  }
  function sectionBlock(s, si, secs) {
    var d = el('details', { class: 'sec' });
    if (openSections[s.id]) d.open = true;
    d.addEventListener('toggle', function () { openSections[s.id] = d.open; });
    d.appendChild(el('summary', {}, '<span><span class="fam">' + esc(s.family) + '</span>' + esc(s.name) + '</span><span class="count">' + (s.menu_items || []).length + ' produits</span>'));
    var body = el('div', { class: 'sec-body' });

    var f = el('div', { class: 'fields' });
    [['Nom de la rubrique', 'name', 'wide'], ['Groupe (onglet de la carte)', 'family', 'wide'], ['Colonne prix 1 (ex. 25 cl)', 'col1', ''], ['Colonne prix 2 (ex. 50 cl)', 'col2', ''], ['Note sous la rubrique', 'note', 'wide']].forEach(function (c) {
      var w = el('div', { class: c[2] }); var id = 'f-' + s.id + c[1];
      w.appendChild(el('label', { for: id }, c[0]));
      var i = field('text', s[c[1]], { id: id }); bind(i, 'menu_sections', s.id, c[1], c[1] === 'name' || c[1] === 'family' ? 'req' : 'text');
      w.appendChild(i); f.appendChild(w);
    });
    body.appendChild(f);

    var two = !!(s.col1 || s.col2);
    var wrap = el('div', { class: 'scroll' });
    var t = el('table', { class: 'items' });
    t.innerHTML = '<thead><tr><th>Nom</th><th>Précision</th><th>Volume</th><th>Prix ' + esc(s.col1 || '') + '</th>' + (two ? '<th>Prix ' + esc(s.col2 || '') + '</th>' : '') + '<th>Prix texte</th><th class="chk">Phare</th><th class="chk">Dispo</th><th></th></tr></thead>';
    var tb = el('tbody');
    var items = s.menu_items || [];
    items.forEach(function (it, ii) {
      var tr = el('tr', { class: it.available ? '' : 'off' });
      function cell(node) { var td = el('td'); td.appendChild(node); tr.appendChild(td); return td; }
      var n = field('text', it.name, { 'aria-label': 'Nom' }); bind(n, 'menu_items', it.id, 'name', 'req'); cell(n);
      var de = field('text', it.detail, { 'aria-label': 'Précision' }); bind(de, 'menu_items', it.id, 'detail'); cell(de);
      var vo = field('text', it.volume, { 'aria-label': 'Volume', class: 'num' }); bind(vo, 'menu_items', it.id, 'volume'); cell(vo);
      var p1 = field('text', it.price1 == null ? '' : String(it.price1).replace('.', ','), { 'aria-label': 'Prix 1', class: 'num', inputmode: 'decimal' }); bind(p1, 'menu_items', it.id, 'price1', 'num'); cell(p1);
      if (two) { var p2 = field('text', it.price2 == null ? '' : String(it.price2).replace('.', ','), { 'aria-label': 'Prix 2', class: 'num', inputmode: 'decimal' }); bind(p2, 'menu_items', it.id, 'price2', 'num'); cell(p2); }
      var pt = field('text', it.price_text, { 'aria-label': 'Prix texte', class: 'num' }); bind(pt, 'menu_items', it.id, 'price_text'); cell(pt);
      var hl = field('checkbox', it.highlight, { 'aria-label': 'Mis en avant' }); bind(hl, 'menu_items', it.id, 'highlight', 'bool'); cell(hl).className = 'chk';
      var av = field('checkbox', it.available, { 'aria-label': 'Disponible' }); bind(av, 'menu_items', it.id, 'available', 'bool'); cell(av).className = 'chk';
      av.addEventListener('change', function () { tr.classList.toggle('off', !av.checked); });
      var act = el('div', { class: 'row-actions' });
      act.appendChild(moveBtn('↑', 'Monter', ii > 0, function () { swap('menu_items', it, items[ii - 1]); }));
      act.appendChild(moveBtn('↓', 'Descendre', ii < items.length - 1, function () { swap('menu_items', it, items[ii + 1]); }));
      act.appendChild(delBtn('Supprimer « ' + it.name + ' » ?', function () { return sb.from('menu_items').delete().eq('id', it.id); }, loadMenu));
      cell(act);
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); body.appendChild(wrap);

    var foot = el('div', { class: 'box-head', style: 'margin-top:14px' });
    var add = el('button', { class: 'btn btn-sm btn-teal', type: 'button' }, '+ Ajouter un produit');
    add.addEventListener('click', function () {
      var pos = items.length ? items[items.length - 1].position + 1 : 1;
      openSections[s.id] = true;
      sb.from('menu_items').insert({ section_id: s.id, name: 'Nouveau produit', position: pos }).then(function (r) { check(r); toast('Produit ajouté'); loadMenu(); });
    });
    var mv = el('div', { class: 'row-actions' });
    mv.appendChild(moveBtn('↑ Rubrique', 'Monter la rubrique', si > 0, function () { swap('menu_sections', s, secs[si - 1]); }));
    mv.appendChild(moveBtn('↓ Rubrique', 'Descendre la rubrique', si < secs.length - 1, function () { swap('menu_sections', s, secs[si + 1]); }));
    mv.appendChild(delBtn('Supprimer la rubrique « ' + s.name + ' » et tous ses produits ?', function () { return sb.from('menu_sections').delete().eq('id', s.id); }, loadMenu, 'Supprimer la rubrique'));
    foot.appendChild(add); foot.appendChild(mv);
    body.appendChild(foot);
    d.appendChild(body);
    return d;
  }
  function moveBtn(label, title, enabled, fn) {
    var b = el('button', { class: 'btn btn-sm btn-ghost' + (label.length < 3 ? ' icon-btn' : ''), type: 'button', title: title, 'aria-label': title }, label);
    b.disabled = !enabled; if (!enabled) b.style.visibility = 'hidden';
    b.addEventListener('click', fn); return b;
  }
  function delBtn(question, fn, after, label) {
    var b = el('button', { class: 'btn btn-sm btn-danger' + (label ? '' : ' icon-btn'), type: 'button', title: 'Supprimer', 'aria-label': 'Supprimer' }, label || '✕');
    b.addEventListener('click', function () {
      if (!window.confirm(question)) return;
      fn().then(function (r) { check(r); toast('Supprimé'); after(); });
    });
    return b;
  }
  function swap(table, a, b) {
    var pa = a.position, pb = b.position;
    if (pa === pb) pb = pa + 1;
    Promise.all([
      sb.from(table).update({ position: pb }).eq('id', a.id),
      sb.from(table).update({ position: pa }).eq('id', b.id)
    ]).then(function (rs) { rs.forEach(check); reloadFor(table); });
  }
  function reloadFor(table) { if (table === 'events') loadEvents(); else loadMenu(); }
  $('#add-section').addEventListener('click', function () {
    sb.from('menu_sections').select('position').order('position', { ascending: false }).limit(1).then(function (r) {
      var pos = (check(r)[0] || { position: 0 }).position + 10;
      sb.from('menu_sections').insert({ family: 'Nouveau groupe', name: 'Nouvelle rubrique', position: pos }).select().then(function (r2) {
        var row = check(r2)[0]; openSections[row.id] = true; toast('Rubrique ajoutée'); loadMenu();
      });
    });
  });

  /* ---------- Événements ---------- */
  function loadEvents() {
    sb.from('events').select('*').order('event_date', { ascending: true, nullsFirst: true }).order('position').then(function (r) {
      var evs = check(r); var box = $('#events'); box.innerHTML = '';
      if (!evs.length) box.innerHTML = '<p class="muted">Aucun événement pour l’instant.</p>';
      evs.forEach(function (e, i) {
        var b = el('div', { class: 'box' });
        var head = el('div', { class: 'box-head' });
        head.appendChild(el('h2', {}, esc(e.title)));
        var acts = el('div', { class: 'row-actions' });
        acts.appendChild(moveBtn('↑', 'Monter', i > 0, function () { swap('events', e, evs[i - 1]); }));
        acts.appendChild(moveBtn('↓', 'Descendre', i < evs.length - 1, function () { swap('events', e, evs[i + 1]); }));
        acts.appendChild(delBtn('Supprimer l’événement « ' + e.title + ' » ?', function () { return sb.from('events').delete().eq('id', e.id); }, loadEvents, 'Supprimer'));
        head.appendChild(acts); b.appendChild(head);
        var f = el('div', { class: 'fields' });
        [['Titre', 'title', 'text', 'wide', 'req'], ['Date', 'event_date', 'date', '', 'text'], ['Heure (ex. 20h)', 'event_time', 'text', '', 'text'],
         ['Récurrence (ex. Tous les jeudis)', 'recurring', 'text', 'wide', 'text'], ['Lien (https://…)', 'link', 'url', '', 'text'], ['Texte du bouton', 'link_label', 'text', '', 'text'],
         ['Description', 'description', 'textarea', 'full', 'text']].forEach(function (c) {
          var w = el('div', { class: c[3] }); var id = 'e-' + e.id + c[1];
          w.appendChild(el('label', { for: id }, c[0]));
          var i2 = c[2] === 'textarea' ? el('textarea', { id: id }) : field(c[2], null, { id: id });
          i2.value = e[c[1]] == null ? '' : e[c[1]];
          bind(i2, 'events', e.id, c[1], c[4]);
          w.appendChild(i2); f.appendChild(w);
        });
        b.appendChild(f);
        var sw = el('label', { class: 'switch' }); var pub = field('checkbox', e.published); bind(pub, 'events', e.id, 'published', 'bool');
        sw.appendChild(pub); sw.appendChild(document.createTextNode(' Publié sur le site')); b.appendChild(sw);
        box.appendChild(b);
      });
    });
  }
  $('#add-event').addEventListener('click', function () {
    sb.from('events').insert({ title: 'Nouvel événement', published: false, position: Date.now() % 100000 }).then(function (r) { check(r); toast('Événement ajouté (non publié)'); loadEvents(); });
  });

  /* ---------- Scores ---------- */
  var GAMES = [['echecs', 'Échecs', true], ['flechettes', 'Fléchettes', false]];
  function loadScores() {
    sb.from('players').select('*').order('name').then(function (r) {
      var all = check(r); var box = $('#scores'); box.innerHTML = '';
      GAMES.forEach(function (g) {
        var chess = g[2];
        var list = all.filter(function (p) { return p.game === g[0]; });
        var b = el('div', { class: 'box' });
        var head = el('div', { class: 'box-head' }); head.appendChild(el('h2', {}, g[1]));
        var add = el('button', { class: 'btn btn-sm btn-teal', type: 'button' }, '+ Ajouter un joueur');
        add.addEventListener('click', function () { sb.from('players').insert({ game: g[0], name: 'Nouveau joueur' }).then(function (r2) { check(r2); toast('Joueur ajouté'); loadScores(); }); });
        head.appendChild(add); b.appendChild(head);
        var wrap = el('div', { class: 'scroll' }); var t = el('table', { class: 'items' });
        t.innerHTML = '<thead><tr><th>Joueur</th><th>Victoires</th>' + (chess ? '<th>Nuls</th>' : '') + '<th>Défaites</th>' + (chess ? '' : '<th>Meilleur finish</th>') + '<th></th></tr></thead>';
        var tb = el('tbody');
        list.forEach(function (p) {
          var tr = el('tr');
          function cell(n) { var td = el('td'); td.appendChild(n); tr.appendChild(td); }
          var n = field('text', p.name, { 'aria-label': 'Nom du joueur' }); bind(n, 'players', p.id, 'name', 'req'); cell(n);
          ['wins'].concat(chess ? ['draws'] : []).concat(['losses']).forEach(function (col) { cell(counter(p, col)); });
          if (!chess) { var bf = field('number', p.best_finish, { min: 2, max: 170, class: 'num', 'aria-label': 'Meilleur finish' }); bind(bf, 'players', p.id, 'best_finish', 'intnull'); cell(bf); }
          var act = el('div', { class: 'row-actions' });
          act.appendChild(delBtn('Retirer « ' + p.name + ' » du classement ?', function () { return sb.from('players').delete().eq('id', p.id); }, loadScores));
          cell(act); tb.appendChild(tr);
        });
        if (!list.length) tb.innerHTML = '<tr><td colspan="6" class="muted">Aucun joueur.</td></tr>';
        t.appendChild(tb); wrap.appendChild(t); b.appendChild(wrap); box.appendChild(b);
      });
    });
  }
  function counter(p, col) {
    var w = el('div', { class: 'score-btns' });
    var minus = el('button', { class: 'btn btn-sm icon-btn', type: 'button', 'aria-label': 'Retirer 1' }, '−');
    var i = field('number', p[col], { min: 0, 'aria-label': col });
    var plus = el('button', { class: 'btn btn-sm icon-btn btn-coral', type: 'button', 'aria-label': 'Ajouter 1' }, '+');
    bind(i, 'players', p.id, col, 'int');
    function step(d) { i.value = Math.max(0, (parseInt(i.value, 10) || 0) + d); var o = {}; o[col] = parseInt(i.value, 10); save('players', p.id, o); }
    minus.addEventListener('click', function () { step(-1); });
    plus.addEventListener('click', function () { step(1); });
    w.appendChild(minus); w.appendChild(i); w.appendChild(plus);
    return w;
  }

  /* ---------- Réglages ---------- */
  var settings = null;
  function loadSettings() {
    sb.from('settings').select('*').eq('id', 1).single().then(function (r) {
      settings = check(r);
      [['#announcement', 'announcement'], ['#phone', 'phone'], ['#cemail', 'email'], ['#insta', 'instagram'], ['#chess-rule', 'chess_rule'], ['#darts-rule', 'darts_rule']].forEach(function (c) {
        var i = $(c[0]); i.value = settings[c[1]] || '';
        if (!i.dataset.bound) { bind(i, 'settings', 1, c[1]); i.dataset.bound = '1'; }
      });
      var demo = $('#scores-demo'); demo.checked = !!settings.scores_demo;
      if (!demo.dataset.bound) { bind(demo, 'settings', 1, 'scores_demo', 'bool'); demo.dataset.bound = '1'; }
      drawHours();
    });
  }
  function drawHours() {
    var box = $('#hours'); box.innerHTML = '';
    var rows = Array.isArray(settings.hours) ? settings.hours : [];
    rows.forEach(function (h, idx) {
      var r = el('div', { class: 'hours-row' });
      var a = field('text', h.label, { 'aria-label': 'Jours', placeholder: 'Mardi – Jeudi' });
      var b = field('text', h.value, { 'aria-label': 'Horaires', placeholder: '17h – 1h' });
      var x = el('button', { class: 'btn btn-sm btn-danger icon-btn', type: 'button', 'aria-label': 'Supprimer la ligne' }, '✕');
      function upd() { rows[idx] = { label: a.value.trim(), value: b.value.trim() }; saveHours(rows, false); }
      a.addEventListener('input', debounce(upd)); b.addEventListener('input', debounce(upd));
      x.addEventListener('click', function () { rows.splice(idx, 1); saveHours(rows, true); });
      r.appendChild(a); r.appendChild(b); r.appendChild(x); box.appendChild(r);
    });
  }
  function debounce(fn) { var t; return function () { clearTimeout(t); t = setTimeout(fn, 600); }; }
  function saveHours(rows, redraw) {
    settings.hours = rows;
    save('settings', 1, { hours: rows.filter(function (r) { return r.label || r.value; }) }).then(function () { if (redraw) drawHours(); });
  }
  $('#add-hour').addEventListener('click', function () {
    settings.hours = (Array.isArray(settings.hours) ? settings.hours : []).concat([{ label: '', value: '' }]);
    drawHours();
    var inputs = document.querySelectorAll('#hours input'); if (inputs.length) inputs[inputs.length - 2].focus();
  });
})();
