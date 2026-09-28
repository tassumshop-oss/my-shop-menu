(function () {
  'use strict';

  // A few common language labels for the switcher; anything else just
  // shows its own code (e.g. "tw") rather than blocking the feature.
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
    // Fall back to the shop's own default-language text — never a blank.
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
    (payload.categories || []).forEach(function (c) {
      Object.keys(c.translations || {}).forEach(function (l) { set[l] = true; });
    });
    (payload.items || []).forEach(function (i) {
      Object.keys(i.translations || {}).forEach(function (l) { set[l] = true; });
    });
    return Object.keys(set);
  }

  function renderControls(payload) {
    var languages = availableLanguages(payload);
    var langSelect = el('languageSelect');
    langSelect.innerHTML = '';
    languages.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = LANGUAGE_LABELS[code] || code.toUpperCase();
      if (code === state.language) opt.selected = true;
      langSelect.appendChild(opt);
    });
    langSelect.hidden = languages.length < 2;

    var currencySelect = el('currencySelect');
    var currencies = [{ code: payload.mainCurrency.code, symbol: payload.mainCurrency.symbol, rateToMain: 1 }]
      .concat(payload.displayCurrencies || []);
    currencySelect.innerHTML = '';
    currencies.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.code;
      currencySelect.appendChild(opt);
    });
    currencySelect.hidden = currencies.length < 2;
    var savedCurrency = localStorage.getItem(CURRENCY_KEY);
    var match = currencies.find(function (c) { return c.code === savedCurrency; }) || currencies[0];
    currencySelect.value = match.code;
    state.currency = match;

    el('controls').hidden = languages.length < 2 && currencies.length < 2;

    langSelect.onchange = function () {
      state.language = langSelect.value;
      localStorage.setItem(LANG_KEY, state.language);
      render();
    };
    currencySelect.onchange = function () {
      state.currency = currencies.find(function (c) { return c.code === currencySelect.value; });
      localStorage.setItem(CURRENCY_KEY, state.currency.code);
      render();
    };
  }

  function itemCard(item) {
    var card = document.createElement('div');
    card.className = 'item-card' + (item.soldOut ? ' sold-out' : '');
    var name = textFor(item, 'name');
    var desc = textFor(item, 'description');

    var photoHtml = item.imageDataUri
      ? '<img src="' + item.imageDataUri + '" alt="' + escapeHtml(name) + '">'
      : '<span class="placeholder">◈</span>';

    card.innerHTML =
      '<div class="photo">' + photoHtml + '</div>' +
      (item.soldOut ? '<span class="sold-out-badge">Sold out</span>' : '') +
      '<div class="info">' +
        '<p class="name">' + escapeHtml(name) + '</p>' +
        (desc ? '<p class="desc">' + escapeHtml(desc) + '</p>' : '') +
        '<div class="price">' + priceFor(item) + '</div>' +
      '</div>';
    return card;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function render() {
    var payload = state.payload;
    el('shopName').textContent = payload.shopName || 'Our Items';
    if (payload.logoDataUri) {
      var header = el('shopHeader');
      if (!el('shopLogo')) {
        var img = document.createElement('img');
        img.id = 'shopLogo'; img.className = 'logo'; img.src = payload.logoDataUri; img.alt = payload.shopName;
        header.insertBefore(img, header.firstChild);
      }
    }
    el('updatedAt').textContent = payload.publishedAt ? ('Updated ' + payload.publishedAt) : '';

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

  fetch('items.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('not found');
      return res.json();
    })
    .then(function (payload) {
      state.payload = payload;
      state.language = detectStartingLanguage(payload);
      renderControls(payload);
      render();
    })
    .catch(function () {
      el('menuContent').innerHTML = '<div class="empty-state"><div class="display">Menu not available right now</div>Please check back soon.</div>';
    });
})();
