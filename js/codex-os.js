/* Akalynth Codex — public surface renderer (proof-backed).
   Reads window.CODEX_PUBLIC (the review-gated projection). Each entry carries a
   public `proof` block (object_id, status, source_ref, evidence sha256). The
   detail panel surfaces that proof so the page is provenance-backed world memory,
   not just lore. Display-only: no creation, no network, no state mutation. */
(function () {
  'use strict';
  var DATA = Array.isArray(window.CODEX_PUBLIC) ? window.CODEX_PUBLIC : [];
  var byId = {};
  DATA.forEach(function (e) { byId[e.id] = e; });
  var $ = function (id) { return document.getElementById(id); };
  var iconFor = function (e) { return e.type === 'creature' ? '✦' : (e.type === 'faction' ? '◈' : (e.type === 'material' ? '◆' : (e.type === 'lore' ? '▤' : '◇'))); };
  var shortHash = function (h) { return h ? h.slice(0, 8) + '…' + h.slice(-6) : '—'; };

  var selectedCategory = null;
  var selectedId = null;

  function categories() {
    var counts = {};
    DATA.forEach(function (e) { var c = e.category || 'Other'; counts[c] = (counts[c] || 0) + 1; });
    return Object.keys(counts).sort().map(function (name) { return { name: name, count: counts[name] }; });
  }

  function renderStats() {
    var cats = categories();
    var stats = [
      { label: 'Entries', value: DATA.length, icon: '▣' },
      { label: 'Categories', value: cats.length, icon: '▦' },
      { label: 'Cities', value: DATA.filter(function (e) { return e.category === 'Cities'; }).length, icon: '◉' },
      { label: 'Creatures', value: DATA.filter(function (e) { return e.category === 'Creatures'; }).length, icon: '✦' }
    ];
    $('codexStats').innerHTML = stats.map(function (s) {
      return '<article class="stat-card"><div class="stat-icon">' + s.icon + '</div><div>' +
        '<div class="stat-label">' + s.label + '</div><div class="stat-value">' + s.value + '</div></div></article>';
    }).join('');
  }

  function renderCategories() {
    $('codexCats').innerHTML = categories().map(function (c) {
      return '<article class="category-card ' + (selectedCategory === c.name ? 'active' : '') + '" data-category="' + c.name + '">' +
        '<div class="cat-icon"><span class="dot ' + c.name + '"></span></div>' +
        '<div><strong>' + c.name + '</strong><span>' + c.count + ' entries</span></div></article>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.category-card'), function (card) {
      card.addEventListener('click', function () {
        selectedCategory = selectedCategory === card.dataset.category ? null : card.dataset.category;
        renderCategories(); renderList();
      });
    });
  }

  function filtered() {
    var q = ($('codexSearch').value || '').trim().toLowerCase();
    return DATA.filter(function (e) {
      var inCat = !selectedCategory || e.category === selectedCategory;
      var hay = (e.title + ' ' + e.category + ' ' + (e.summary || '') + ' ' + (e.body || '')).toLowerCase();
      return inCat && (!q || hay.indexOf(q) !== -1);
    });
  }

  function rowHtml(e) {
    var label = (e.proof && e.proof.status_label) || 'accepted';
    return '<article class="entry-row ' + (selectedId === e.id ? 'selected' : '') + '" data-id="' + e.id + '">' +
      '<div class="entry-icon">' + iconFor(e) + '</div>' +
      '<div><div class="entry-title">' + e.title + '</div><div class="entry-summary">' + (e.summary || '') + '</div></div>' +
      '<div class="pill"><span class="dot ' + e.category + '"></span>' + e.category + '</div>' +
      '<div class="time">' + label + '</div></article>';
  }

  function renderList() {
    var data = filtered();
    if (!data.length) { $('codexList').innerHTML = '<div class="empty">No entries match this filter.</div>'; return; }
    $('codexList').innerHTML = data.map(rowHtml).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.entry-row'), function (row) {
      row.addEventListener('click', function () { select(row.dataset.id); });
    });
  }

  function relatedLinks(e) {
    var rels = (e.related || []).filter(function (id) { return byId[id]; });
    if (!rels.length) return '—';
    return rels.map(function (id) { return '<a data-go="' + id + '">' + byId[id].title + '</a>'; }).join(', ');
  }

  function detailHtml(e) {
    var p = e.proof || {};
    var art = (e.assets && e.assets[0]) ? '<img class="detail-art" src="' + e.assets[0] + '" alt="' + e.title + '" loading="lazy" />' : '';
    var ev = p.evidence_sha256
      ? '<dd class="mono hash" title="' + p.evidence_sha256 + '">' + shortHash(p.evidence_sha256) + ' <span class="badge">' + (p.source_kind || '') + '</span></dd>'
      : '<dd class="mono">asserted (no source hash)</dd>';
    return '<p class="panel-kicker">Selected Entry</p>' +
      '<h3>' + e.title + '</h3>' + art +
      '<p>' + (e.body || e.summary || '') + '</p>' +
      '<dl class="meta">' +
        '<div><dt>Object ID</dt><dd class="mono">' + (p.object_id || e.id) + '</dd></div>' +
        '<div><dt>Status</dt><dd>' + (p.status_label || 'accepted') + '</dd></div>' +
        '<div><dt>Source</dt><dd class="mono">' + (p.source_ref || '—') + '</dd></div>' +
        '<div><dt>Evidence</dt>' + ev + '</div>' +
        '<div><dt>Authority</dt><dd>Akalynth</dd></div>' +
        '<div class="rel"><dt>Related</dt><dd>' + relatedLinks(e) + '</dd></div>' +
      '</dl>';
  }

  function select(id) {
    var e = byId[id]; if (!e) return;
    selectedId = id;
    $('codexDetail').innerHTML = detailHtml(e);
    Array.prototype.forEach.call($('codexDetail').querySelectorAll('[data-go]'), function (a) {
      a.addEventListener('click', function () { select(a.dataset.go); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
    renderList();
  }

  function wire() {
    $('codexSearch').addEventListener('input', renderList);
    $('codexClear').addEventListener('click', function () {
      selectedCategory = null; $('codexSearch').value = ''; renderCategories(); renderList();
    });
    window.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== $('codexSearch')) { ev.preventDefault(); $('codexSearch').focus(); }
    });
  }

  if (!DATA.length) { return; }
  renderStats(); renderCategories(); renderList(); wire();
  select(byId['forgehold'] ? 'forgehold' : DATA[0].id);   // Forgehold leads — the proof exemplar
})();
