(function () {
  'use strict';

  var LANGUAGE_LABELS = {
    en: 'English', fr: 'Français', es: 'Español', pt: 'Português',
    ar: 'العربية', tw: 'Twi', ha: 'Hausa', yo: 'Yorùbá', ig: 'Igbo',
    sw: 'Kiswahili', zh: '中文', de: 'Deutsch', nl: 'Nederlands'
  };

  var LANG_KEY = 'boutique-menu-language';
  var CURRENCY_KEY = 'boutique-menu-currency';

  var state = { payload: null, language: 'en', currency: null };

  function el(id) { return document.getElementById(id); }

  function formatMoney(minorUnits, symbol) {
    var value = minorUnits / 100;
    return symbol + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function textFor(entity, field) {
    var t = entity.translations && entity.translations[state.language];
    if (t && t[field]) return t[field];
    return entity[field] || '';
  }

  function priceFor(item) {
    if (!state.currency || state.currency.code === state.payload.mainCurrency.code) {
      return formatMoney(item.price, state.payload.mainCurrency.symbol);
    }
    var converted = (item.price / 100) * state.currency.rateToMain;
    return state.currency.symbol + converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      + ' <span class="approx">approx.</span>';
  }

  function detectStartingLanguage(payload) {
    var saved = localStorage.getItem(LANG_KEY);
    var known = availableLanguages(payload);
    if (saved && known.indexOf(saved) !== -1) return saved;
    var phoneLangs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < phoneLangs.length; i++) {
      var code = (phoneLangs[i] || '').slice(0, 2).toLowerCase();
      if (known.indexOf(code) !== -1) return code;
    }
    return payload.defaultLanguage || 'en';
  }

  function availableLanguages(payload) {
    var set = {};
    set[payload.defaultLanguage || 'en'] = true;
    (payload.categories || []).forEach(function (c) { Object.keys(c.translations || {}).forEach(function (l) { set[l] = true; }); });
    (payload.items || []).forEach(function (i) { Object.keys(i.translations || {}).forEach(function (l) { set[l] = true; }); });
    return Object.keys(set);
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
  }

  function renderControls(payload) {
    var languages = availableLanguages(payload);
    var langSelect = el('languageSelect');
    langSelect.innerHTML = '';
    languages.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code; opt.textContent = LANGUAGE_LABELS[code] || code.toUpperCase();
      if (code === state.language) opt.selected = true;
      langSelect.appendChild(opt);
    });
    langSelect.hidden = languages.length < 2;

    var currencySelect = el('currencySelect');
    var currencies = [{ code: payload.mainCurrency.code, symbol: payload.mainCurrency.symbol, rateToMain: 1 }].concat(payload.displayCurrencies || []);
    currencySelect.innerHTML = '';
    currencies.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.code; opt.textContent = c.code;
      currencySelect.appendChild(opt);
    });
    currencySelect.hidden = currencies.length < 2;
    var savedCurrency = localStorage.getItem(CURRENCY_KEY);
    var match = currencies.find(function (c) { return c.code === savedCurrency; }) || currencies[0];
    currencySelect.value = match.code;
    state.currency = match;

    el('controls').hidden = languages.length < 2 && currencies.length < 2;

    langSelect.onchange = function () { state.language = langSelect.value; localStorage.setItem(LANG_KEY, state.language); render(); };
    currencySelect.onchange = function () { state.currency = currencies.find(function (c) { return c.code === currencySelect.value; }); localStorage.setItem(CURRENCY_KEY, state.currency.code); render(); };
  }

  function renderHero(payload) {
    el('shopName').textContent = payload.shopName || 'Our Shop';
    if (payload.logoDataUri) {
      el('shopHeaderTop').innerHTML = '<img class="logo" src="' + payload.logoDataUri + '" alt="">';
    }
    var aboutEl = el('aboutText');
    if (payload.aboutText) { aboutEl.textContent = payload.aboutText; aboutEl.classList.remove('hidden'); }

    var locRow = el('locationRow');
    if (payload.location && (payload.location.address || payload.location.phone)) {
      var bits = [];
      if (payload.location.address) bits.push('<span>📍 ' + escapeHtml(payload.location.address) + '</span>');
      if (payload.location.phone) bits.push('<span>📞 ' + escapeHtml(payload.location.phone) + '</span>');
      locRow.innerHTML = bits.join('');
      locRow.classList.remove('hidden');
    }
    el('updatedAt').textContent = payload.publishedAt ? ('Updated ' + payload.publishedAt) : '';
  }

  function renderSectionNav(payload) {
    var sections = [];
    var hasArrivals = (payload.items || []).some(function (i) { return i.isNewArrival; });
    var hasGallery = (payload.galleryImages || []).length > 0;
    if (hasArrivals) sections.push({ id: 'arrivalsSection', label: 'New Arrivals' });
    if (hasGallery) sections.push({ id: 'gallerySection', label: 'Gallery' });
    sections.push({ id: 'itemsSection', label: 'Items' });

    if (sections.length <= 1) { el('sectionNav').hidden = true; return; }
    el('sectionNav').hidden = false;
    var row = el('sectionNavRow');
    row.innerHTML = sections.map(function (s, i) {
      return '<button data-target="' + s.id + '" class="' + (i === 0 ? 'active' : '') + '">' + escapeHtml(s.label) + '</button>';
    }).join('');
    row.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        row.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function renderArrivals(payload) {
    var arrivals = (payload.items || []).filter(function (i) { return i.isNewArrival && !i.soldOut; }).slice(0, 40);   // a long row would only slow the page
    var section = el('arrivalsSection');
    if (!arrivals.length) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    el('arrivalsRow').innerHTML = arrivals.map(function (item) {
      var name = textFor(item, 'name');
      var photo = item.imageDataUri ? '<img src="' + item.imageDataUri + '" alt="' + escapeHtml(name) + '">' : '';
      return '<div class="arrival-card"><span class="badge">New</span><div class="photo">' + photo + '</div>' +
        '<div class="info"><p class="name">' + escapeHtml(name) + '</p><div class="price">' + priceFor(item) + '</div></div></div>';
    }).join('');
  }

  function renderGallery(payload) {
    var images = payload.galleryImages || [];
    var section = el('gallerySection');
    if (!images.length) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    el('galleryGrid').innerHTML = images.map(function (g) {
      return '<div class="g-item"><img src="' + g.imageDataUri + '" alt="' + escapeHtml(g.caption) + '">' +
        (g.caption ? '<div class="cap">' + escapeHtml(g.caption) + '</div>' : '') + '</div>';
    }).join('');
  }

  function itemCard(item) {
    var card = document.createElement('div');
    card.className = 'item-card' + (item.soldOut ? ' sold-out' : '');
    var name = textFor(item, 'name');
    var desc = textFor(item, 'description');
    var photoHtml = item.imageDataUri ? '<img src="' + item.imageDataUri + '" alt="' + escapeHtml(name) + '">' : '<span class="placeholder">◈</span>';
    var badge = item.soldOut ? '<span class="badge-corner sold">Sold out</span>' : (item.isNewArrival ? '<span class="badge-corner new">New</span>' : '');
    card.innerHTML =
      '<div class="photo">' + photoHtml + '</div>' + badge +
      '<div class="info">' +
        '<p class="name">' + escapeHtml(name) + '</p>' +
        (desc ? '<p class="desc">' + escapeHtml(desc) + '</p>' : '') +
        '<div class="price">' + priceFor(item) + '</div>' +
      '</div>';
    return card;
  }

  // Big shops (tens of thousands of items) must never freeze a customer's phone: items are grouped once,
  // shown a page at a time ("Show more"), and a search box finds anything without drawing the whole catalogue.
  var BIG = 300, ITEMS_PER_CAT = 24, CATS_PER_PAGE = 8, SEARCH_PAGE = 60;
  var view = { byCat: null, cats: [], shownCats: 0, query: '' };

  function moreButton(label, onclick) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'more-btn'; b.textContent = label;
    b.style.cssText = 'display:block;margin:14px auto;padding:11px 20px;border-radius:999px;border:1px solid var(--line,#ddd);background:#fff;color:inherit;font:600 14px inherit;cursor:pointer;';
    b.addEventListener('click', onclick);
    return b;
  }

  function categorySection(cat, items, big) {
    var section = document.createElement('section');
    section.className = 'category';
    var h2 = document.createElement('h2');
    h2.textContent = textFor(cat, 'name');
    section.appendChild(h2);
    var grid = document.createElement('div');
    grid.className = 'items-grid';
    var shown = 0, limit = big ? ITEMS_PER_CAT : items.length;
    function more() {
      var end = Math.min(items.length, shown + (shown === 0 ? limit : SEARCH_PAGE));
      var frag = document.createDocumentFragment();
      for (; shown < end; shown++) frag.appendChild(itemCard(items[shown]));
      grid.appendChild(frag);
      if (btn) { if (shown >= items.length) btn.remove(); else btn.textContent = 'Show more (' + (items.length - shown) + ' left)'; }
    }
    var btn = null;
    section.appendChild(grid);
    if (big && items.length > limit) { btn = moreButton('', more); section.appendChild(btn); }
    more();
    return section;
  }

  function showMoreCategories(content) {
    var frag = document.createDocumentFragment(), end = Math.min(view.cats.length, view.shownCats + CATS_PER_PAGE);
    for (; view.shownCats < end; view.shownCats++) {
      var c = view.cats[view.shownCats];
      frag.appendChild(categorySection(c, view.byCat[c.id], true));
    }
    var old = content.querySelector('.more-cats'); if (old) old.remove();
    content.appendChild(frag);
    if (view.shownCats < view.cats.length) {
      var b = moreButton('Show more categories (' + (view.cats.length - view.shownCats) + ' left)', function () { showMoreCategories(content); });
      b.className += ' more-cats'; content.appendChild(b);
    }
  }

  function renderSearch(content, q) {
    var hits = [], cats = {};
    (state.payload.categories || []).forEach(function (c) { cats[c.id] = textFor(c, 'name').toLowerCase(); });
    var items = state.payload.items || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if ((textFor(it, 'name').toLowerCase() + ' ' + (cats[it.categoryId] || '')).indexOf(q) !== -1) hits.push(it);
    }
    content.innerHTML = '';
    if (!hits.length) { content.innerHTML = '<div class="empty-state"><div class="display">No items found</div>Try another word.</div>'; return; }
    var grid = document.createElement('div'); grid.className = 'items-grid';
    var shown = 0, btn = null;
    function more() {
      var end = Math.min(hits.length, shown + SEARCH_PAGE), frag = document.createDocumentFragment();
      for (; shown < end; shown++) frag.appendChild(itemCard(hits[shown]));
      grid.appendChild(frag);
      if (btn) { if (shown >= hits.length) btn.remove(); else btn.textContent = 'Show more (' + (hits.length - shown) + ' left)'; }
    }
    content.appendChild(grid);
    if (hits.length > SEARCH_PAGE) { btn = moreButton('', more); content.appendChild(btn); }
    more();
  }

  function renderItems(payload) {
    var content = el('menuContent');
    content.innerHTML = '';
    var search = el('menuSearch');
    if (!payload.categories.length || !payload.items.length) {
      if (search) search.hidden = true;
      content.innerHTML = '<div class="empty-state"><div class="display">Nothing published yet</div>Please check back soon.</div>';
      return;
    }
    var by = {};
    payload.items.forEach(function (i) { (by[i.categoryId] = by[i.categoryId] || []).push(i); });
    view.byCat = by;
    view.cats = payload.categories.filter(function (c) { return by[c.id] && by[c.id].length; });
    view.shownCats = 0;
    var big = payload.items.length > BIG;
    if (search) search.hidden = !big;
    if (view.query) return renderSearch(content, view.query);
    if (!big) {
      view.cats.forEach(function (cat) { content.appendChild(categorySection(cat, by[cat.id], false)); });
      view.shownCats = view.cats.length;
    } else showMoreCategories(content);
    el('pageFooter').hidden = false;
  }

  function initSearch() {
    var box = el('menuSearch'); if (!box) return;
    var timer = null;
    box.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {                       // wait until the person pauses typing: the box never lags
        view.query = box.value.trim().toLowerCase();
        renderItems(state.payload);
      }, 220);
    });
  }

  function render() {
    var payload = state.payload;
    renderHero(payload);
    renderArrivals(payload);
    renderGallery(payload);
    renderItems(payload);
  }


  // ---- free shop assistant: answers only from the published items (no server, no AI service) ----
  function initChat() {
    var fab = el('chatFab'), panel = el('chatPanel'), log = el('chatLog'), form = el('chatForm'), input = el('chatInput');
    if (!fab || !window.Assistant) return;
    function add(cls, text) { var d = document.createElement('div'); d.className = 'chat-msg ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; }
    function lang() { var l = state.language; return window.Assistant.phrases[l] ? l : 'en'; }
    var chat = { key: null, all: null, vocab: null, fixed: null };
    function prepare() {
      var key = state.language + '|' + (state.payload.items || []).length;
      if (chat.key === key) return;
      var cats = {}; (state.payload.categories || []).forEach(function (c) { cats[c.id] = textFor(c, 'name'); });
      var all = (state.payload.items || []).map(function (i) {
        var name = textFor(i, 'name'), cat = cats[i.categoryId] || '';
        return { name: name, price: i.price, soldOut: i.soldOut, category: cat, isNewArrival: i.isNewArrival, _l: (name + ' ' + cat).toLowerCase() };
      });
      chat = { key: key, all: all, vocab: null, fixed: null };
      if (all.length > 1500) {
        chat.vocab = window.Assistant.vocabOf(all);
        var byPrice = all.slice().sort(function (a, b) { return a.price - b.price; });
        var fixed = byPrice.slice(0, 120).concat(byPrice.slice(-120), all.filter(function (i) { return i.isNewArrival; }).slice(0, 120));
        chat.fixed = fixed;
      }
    }
    // For a shop with thousands of items, only the few hundred that could answer the question are handed to the
    // assistant, so typing and answering stay instant.
    function items(q) {
      prepare();
      if (!chat.fixed) return chat.all;
      var fixedQ = window.Assistant.correct(q, chat.vocab).toLowerCase();
      var toks = fixedQ.split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 3 && !/^\d+$/.test(t); });
      var picked = [];
      if (toks.length) for (var i = 0; i < chat.all.length && picked.length < 400; i++) {
        for (var k = 0; k < toks.length; k++) if (chat.all[i]._l.indexOf(toks[k]) !== -1) { picked.push(chat.all[i]); break; }
      }
      return picked.concat(chat.fixed);
    }
    function reply(q) {
      var p = state.payload, loc = p.location || {};
      return window.Assistant.answer(q, { items: items(q), shop: { name: p.shopName, address: loc.address, phone: loc.phone }, lang: lang(), money: function (n) { return priceFor({ price: n }); } }).text;
    }
    fab.onclick = function () { panel.classList.toggle('open'); if (panel.classList.contains('open') && !log.children.length) add('chat-bot', reply('hello')); if (panel.classList.contains('open')) input.focus(); };
    form.onsubmit = function (e) { e.preventDefault(); var q = input.value.trim(); if (!q) return; add('chat-me', q); input.value = ''; add('chat-bot', reply(q)); };
  }

  fetch('items.json', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('not found'); return res.json(); })
    .then(function (payload) {
      state.payload = payload;
      state.language = detectStartingLanguage(payload);
      renderControls(payload);
      renderSectionNav(payload);
      render();
      initSearch();
      initChat();
    })
    .catch(function () {
      el('menuContent').innerHTML = '<div class="empty-state"><div class="display">Menu not available right now</div>Please check back soon.</div>';
    });
})();
