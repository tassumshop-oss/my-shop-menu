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
    var arrivals = (payload.items || []).filter(function (i) { return i.isNewArrival && !i.soldOut; });
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

  function renderItems(payload) {
    var content = el('menuContent');
    content.innerHTML = '';
    if (!payload.categories.length || !payload.items.length) {
      content.innerHTML = '<div class="empty-state"><div class="display">Nothing published yet</div>Please check back soon.</div>';
      return;
    }
    payload.categories.forEach(function (cat) {
      var itemsInCat = payload.items.filter(function (i) { return i.categoryId === cat.id; });
      if (!itemsInCat.length) return;
      var section = document.createElement('section');
      section.className = 'category';
      var h2 = document.createElement('h2');
      h2.textContent = textFor(cat, 'name');
      section.appendChild(h2);
      var grid = document.createElement('div');
      grid.className = 'items-grid';
      itemsInCat.forEach(function (item) { grid.appendChild(itemCard(item)); });
      section.appendChild(grid);
      content.appendChild(section);
    });
    el('pageFooter').hidden = false;
  }

  function render() {
    var payload = state.payload;
    renderHero(payload);
    renderArrivals(payload);
    renderGallery(payload);
    renderItems(payload);
  }

  fetch('items.json', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('not found'); return res.json(); })
    .then(function (payload) {
      state.payload = payload;
      state.language = detectStartingLanguage(payload);
      renderControls(payload);
      renderSectionNav(payload);
      render();
    })
    .catch(function () {
      el('menuContent').innerHTML = '<div class="empty-state"><div class="display">Menu not available right now</div>Please check back soon.</div>';
    });
})();
