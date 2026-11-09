/*
 * Shop assistant engine — free, offline, no AI service, no account.
 *
 * It answers from the shop's OWN catalogue only: it looks things up (is it in
 * stock? how much is it? what's new? what is under 50?) and never invents
 * anything. If it cannot find something it says so. Works in the staff app and
 * on the public online menu (same file), in the shop's language.
 *
 *   Assistant.answer(question, { items, shop, lang, money, staff })
 *     items: [{ name, price (minor units), quantity?, soldOut?, category?, brand?, color?, size?, isNewArrival? }]
 *     shop:  { name, address, phone }
 *     money: function(minorUnits) -> "GHS 12.00"
 *   -> { text, items: [matching items] }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Assistant = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var P = {
    en: { hello: 'Hello! Ask me about our items: what is in stock, prices, what is new, or where to find us.', none: 'I could not find that in our catalogue. Try another word, or ask what is new.', found: 'Here is what I found:', instock: 'in stock', left: '{n} left', soldout: 'sold out', newin: 'Newly arrived:', nonew: 'Nothing new has arrived recently.', cheap: 'Our lowest prices:', under: 'Items up to {p}:', over: 'Items from {p}:', where: 'You can find us at: {a}', phone: 'Phone: {p}', noaddr: 'I do not have the shop address yet.', low: 'Running low (staff only):', nolow: 'No items are running low.', help: 'I can answer from our catalogue: "do you have a red dress?", "price of sandals", "what is new?", "cheapest items", "under 100", "where are you?".', cats: 'We carry:' },
    fr: { hello: 'Bonjour ! Demandez-moi nos articles : disponibilité, prix, nouveautés ou notre adresse.', none: "Je n'ai pas trouvé cela dans notre catalogue. Essayez un autre mot ou demandez les nouveautés.", found: "Voici ce que j'ai trouvé :", instock: 'en stock', left: 'reste {n}', soldout: 'épuisé', newin: 'Nouveautés :', nonew: "Aucune nouveauté récemment.", cheap: 'Nos prix les plus bas :', under: "Articles jusqu'à {p} :", over: 'Articles à partir de {p} :', where: 'Vous nous trouverez ici : {a}', phone: 'Téléphone : {p}', noaddr: "Je n'ai pas encore l'adresse de la boutique.", low: 'Stock bas (personnel) :', nolow: 'Aucun article en stock bas.', help: 'Je réponds à partir du catalogue : « avez-vous une robe rouge ? », « prix des sandales », « nouveautés », « moins cher », « moins de 100 », « où êtes-vous ? ».', cats: 'Nous proposons :' },
    es: { hello: '¡Hola! Pregúntame por nuestros artículos: existencias, precios, novedades o dónde encontrarnos.', none: 'No lo encontré en nuestro catálogo. Prueba otra palabra o pregunta por las novedades.', found: 'Esto es lo que encontré:', instock: 'disponible', left: 'quedan {n}', soldout: 'agotado', newin: 'Recién llegado:', nonew: 'No hay novedades recientes.', cheap: 'Nuestros precios más bajos:', under: 'Artículos hasta {p}:', over: 'Artículos desde {p}:', where: 'Nos encuentras en: {a}', phone: 'Teléfono: {p}', noaddr: 'Aún no tengo la dirección de la tienda.', low: 'Quedan pocos (solo personal):', nolow: 'No hay artículos con poco stock.', help: 'Respondo desde el catálogo: «¿tienen un vestido rojo?», «precio de sandalias», «novedades», «lo más barato», «menos de 100», «¿dónde están?».', cats: 'Tenemos:' },
    pt: { hello: 'Olá! Pergunte sobre os nossos artigos: stock, preços, novidades ou onde nos encontrar.', none: 'Não encontrei isso no nosso catálogo. Tente outra palavra ou pergunte pelas novidades.', found: 'Isto é o que encontrei:', instock: 'em stock', left: 'restam {n}', soldout: 'esgotado', newin: 'Recém-chegados:', nonew: 'Sem novidades recentes.', cheap: 'Os nossos preços mais baixos:', under: 'Artigos até {p}:', over: 'Artigos a partir de {p}:', where: 'Encontra-nos em: {a}', phone: 'Telefone: {p}', noaddr: 'Ainda não tenho a morada da loja.', low: 'A acabar (só equipa):', nolow: 'Nenhum artigo a acabar.', help: 'Respondo a partir do catálogo: «têm um vestido vermelho?», «preço das sandálias», «novidades», «mais barato», «menos de 100», «onde estão?».', cats: 'Temos:' },
    ar: { hello: 'مرحبًا! اسألني عن منتجاتنا: التوفر والأسعار والجديد أو مكاننا.', none: 'لم أجد ذلك في الكتالوج. جرّب كلمة أخرى أو اسأل عن الجديد.', found: 'وجدت ما يلي:', instock: 'متوفر', left: 'تبقّى {n}', soldout: 'نفد', newin: 'وصل حديثًا:', nonew: 'لا يوجد جديد مؤخرًا.', cheap: 'أقل أسعارنا:', under: 'منتجات حتى {p}:', over: 'منتجات من {p}:', where: 'تجدنا في: {a}', phone: 'الهاتف: {p}', noaddr: 'ليس لديّ عنوان المتجر بعد.', low: 'على وشك النفاد (للموظفين فقط):', nolow: 'لا توجد منتجات على وشك النفاد.', help: 'أجيب من الكتالوج: «هل لديكم فستان أحمر؟»، «سعر الصنادل»، «ما الجديد؟»، «الأرخص»، «أقل من 100»، «أين أنتم؟».', cats: 'لدينا:' },
    nl: { hello: 'Hallo! Vraag me naar onze artikelen: voorraad, prijzen, nieuwtjes of waar je ons vindt.', none: 'Dat vond ik niet in onze catalogus. Probeer een ander woord of vraag naar nieuwtjes.', found: 'Dit heb ik gevonden:', instock: 'op voorraad', left: 'nog {n}', soldout: 'uitverkocht', newin: 'Nieuw binnen:', nonew: 'Recent niets nieuws binnengekomen.', cheap: 'Onze laagste prijzen:', under: 'Artikelen tot {p}:', over: 'Artikelen vanaf {p}:', where: 'Je vindt ons op: {a}', phone: 'Telefoon: {p}', noaddr: 'Ik heb het adres van de winkel nog niet.', low: 'Bijna op (alleen personeel):', nolow: 'Geen artikelen bijna op.', help: 'Ik antwoord uit de catalogus: "hebben jullie een rode jurk?", "prijs van sandalen", "wat is nieuw?", "goedkoopste", "minder dan 100", "waar zijn jullie?".', cats: 'Wij hebben:' },
    sv: { hello: 'Hej! Fråga om våra varor: lager, priser, nyheter eller var vi finns.', none: 'Jag hittade inte det i vår katalog. Prova ett annat ord eller fråga om nyheter.', found: 'Det här hittade jag:', instock: 'i lager', left: '{n} kvar', soldout: 'slutsåld', newin: 'Nyinkommet:', nonew: 'Inga nyheter på sistone.', cheap: 'Våra lägsta priser:', under: 'Varor upp till {p}:', over: 'Varor från {p}:', where: 'Du hittar oss på: {a}', phone: 'Telefon: {p}', noaddr: 'Jag har inte butikens adress ännu.', low: 'Håller på att ta slut (endast personal):', nolow: 'Inga varor håller på att ta slut.', help: 'Jag svarar utifrån katalogen: "har ni en röd klänning?", "pris på sandaler", "vad är nytt?", "billigast", "under 100", "var finns ni?".', cats: 'Vi har:' },
    zh: { hello: '您好！可以问我商品库存、价格、新品或我们的地址。', none: '目录里没有找到。请换个词，或问问有什么新品。', found: '找到以下商品：', instock: '有货', left: '剩 {n} 件', soldout: '已售罄', newin: '新到：', nonew: '最近没有新品。', cheap: '最低价商品：', under: '{p} 以内的商品：', over: '{p} 起的商品：', where: '我们的地址：{a}', phone: '电话：{p}', noaddr: '我还没有店铺地址。', low: '库存偏低（仅员工可见）：', nolow: '没有库存偏低的商品。', help: '我根据商品目录回答：“有红色连衣裙吗？”“凉鞋多少钱”“有什么新品”“最便宜的”“100以内”“你们在哪？”', cats: '我们有：' }
  };

  var W = {
    hello: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'bonjour', 'salut', 'hola', 'buenas', 'ola', 'olá', 'hallo', 'hej', 'goddag', 'مرحبا', 'السلام', 'اهلا', '你好', '您好'],
    where: ['where', 'address', 'location', 'directions', 'find you', 'ou etes', 'adresse', 'localisation', 'donde', 'direccion', 'ubicacion', 'onde', 'morada', 'waar', 'adres', 'var ligger', 'var finns', 'adress', 'اين', 'عنوان', 'موقع', '哪里', '哪裡', '地址'],
    phone: ['phone', 'call', 'number', 'contact', 'telephone', 'telefono', 'telefone', 'telefoon', 'telefon', 'هاتف', 'رقم', '电话', '電話'],
    news: ['new', 'newest', 'latest', 'arrival', 'arrivals', 'nouveau', 'nouveaute', 'nouveautes', 'nuevo', 'novedades', 'novo', 'novidades', 'nieuw', 'nieuwe', 'nieuwtjes', 'nyheter', 'nytt', 'جديد', '新品', '新到'],
    cheap: ['cheap', 'cheapest', 'lowest', 'affordable', 'moins cher', 'pas cher', 'barato', 'mais barato', 'lo mas barato', 'goedkoop', 'goedkoopste', 'billig', 'billigast', 'ارخص', 'الارخص', '最便宜', '便宜'],
    under: ['under', 'below', 'less than', 'up to', 'max', 'moins de', 'jusqu', 'menos de', 'menos que', 'hasta', 'ate', 'até', 'minder dan', 'tot', 'under', 'hogst', 'اقل', 'حتى', '以内', '以下', '低于'],
    over: ['over', 'above', 'more than', 'from', 'at least', 'plus de', 'a partir', 'mas de', 'desde', 'mais de', 'meer dan', 'vanaf', 'over', 'fran', 'från', 'اكثر', 'من', '以上', '起'],
    low: ['low stock', 'running low', 'lowstock', 'restock', 'stock bas', 'poco stock', 'stock baixo', 'bijna op', 'tar slut', 'اوشك', '库存低', '库存不足'],
    cats: ['categories', 'category', 'what do you sell', 'what do you have', 'catalogue', 'catalog', 'categories', 'categorias', 'categorias', 'categorieen', 'kategorier', 'ماذا لديكم', '分类', '有什么'],
    help: ['help', 'aide', 'ayuda', 'ajuda', 'hulp', 'hjalp', 'مساعدة', '帮助']
  };
  var STOP = ['do', 'you', 'have', 'any', 'a', 'an', 'the', 'is', 'are', 'there', 'of', 'for', 'me', 'i', 'want', 'need', 'looking', 'price', 'how', 'much', 'does', 'cost', 'in', 'stock', 'available', 'show', 'with', 'and', 'or', 'to', 'it', 'your', 'our', 'what', 'which', 'avez', 'vous', 'un', 'une', 'le', 'la', 'les', 'des', 'de', 'du', 'prix', 'combien', 'tienen', 'tiene', 'un', 'una', 'el', 'los', 'las', 'precio', 'tem', 'têm', 'preco', 'preço', 'um', 'uma', 'os', 'as', 'hebben', 'jullie', 'een', 'het', 'prijs', 'har', 'ni', 'ett', 'en', 'pris', 'هل', 'لديكم', 'سعر', '有', '吗', '多少钱',
    // chat shorthand, filler and Ghanaian pidgin: "abeg do u av red dres wey dey?"
    'please', 'pls', 'plz', 'can', 'could', 'would', 'give', 'get', 'got', 'sell', 'selling', 'so', 'on', 'at', 'this', 'that', 'these', 'those', 'u', 'ur', 'r', 'wat', 'wats', 'whats', 'dis', 'dat', 'av', 'hav', 'hv', 'wit', 'na', 'abeg', 'dey', 'wey', 'una', 'dem', 'sef', 'oo', 'paa', 'ebe', 'be', 'bi', 'make', 'wan', 'wana', 'wanna', 'gimme', 'show', 'tell', 'about', 'any', 'some', 'there', 'here', 'am', 'my', 'we', 'they', 'if', 'ok', 'okay', 'thanks', 'thank', 'sir', 'madam', 'ma', 'boss'];

  // ---- tolerance for spelling mistakes ----
  // Damerau-Levenshtein distance (a swapped pair of letters counts as ONE mistake), stopping early past `max`.
  function dl(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j, best;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i]; best = i;
      for (j = 1; j <= lb; j++) {
        var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (prev2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v; if (v < best) best = v;
      }
      if (best > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[lb];
  }
  // How many mistakes are forgiven in a word of this length (short words must be exact).
  function allowed(len) { return len <= 3 ? 0 : (len <= 6 ? 1 : 2); }
  function latin(w) { return /^[a-z0-9]+$/.test(w); }
  function squash(w) { return w.replace(/(.)\1{2,}/g, '$1$1'); }       // "dresssss" -> "dress"
  function qwords(q) { return q.split(/[^a-z0-9؀-ۿ一-鿿]+/).filter(Boolean); }
  // Is this shorthand/typo version of the trigger word in the question?
  var shopWords = null;       // the words the shop itself uses: they are never mistaken for trigger words
  function subseq(f, w) { var j = 0; for (var i = 0; i < w.length && j < f.length; i++) if (w.charAt(i) === f.charAt(j)) j++; return j === f.length; }
  function fuzzyWord(words, f) {
    var a = allowed(f.length), hit = -1;
    for (var i = 0; i < words.length; i++) {
      var w = squash(words[i]);
      if (w === f) return i;
      if (w.length < 3 || STOP.indexOf(w) !== -1 || (shopWords && shopWords[w])) continue;
      if (a === 0) { if (f.length === 3 && w.length === 4 && w.charAt(0) === f.charAt(0) && subseq(f, w)) return i; continue; }   // "neew" -> "new"
      if (f.length >= 5 && w.length >= 4 && f.indexOf(w) === 0) return i;        // "locat" -> "location"
      if ((w.charAt(0) === f.charAt(0) || (f.length >= 7 && w.length >= 6)) && dl(w, f, a) <= a) return i;
    }
    return hit;
  }
  function hasFuzzy(q, list) {
    if (has(q, list)) return true;
    var words = null;
    for (var i = 0; i < list.length; i++) {
      var f = fold(list[i]);
      var parts = f.split(' ');
      if (!parts.every(latin)) continue;                      // non-Latin scripts: exact only
      if (!words) words = qwords(q);
      var from = 0, ok = true, first = -1, last = -1;
      for (var k = 0; k < parts.length && ok; k++) {
        var at = fuzzyWord(words.slice(from), parts[k]);
        if (at < 0) ok = false; else { at += from; if (first < 0) first = at; last = at; from = at + 1; }
      }
      if (ok && last - first <= parts.length) return true;    // the words must sit together, in order
    }
    return false;
  }
  // Turns a misspelt word into the nearest word the shop really uses ("dres" -> "dress").
  function nearest(t, vocab) {
    if (!vocab || !latin(t) || t.length < 3) return t;
    var forms = [t, squash(t), t.replace(/ies$/, 'y'), t.replace(/es$/, ''), t.replace(/s$/, '')];
    var k, i;
    for (k = 0; k < forms.length; k++) if (vocab[forms[k]]) return forms[k];
    for (i = 0; i < forms.length; i++) { for (var w in vocab) if (w.length > forms[i].length && forms[i].length >= 3 && w.indexOf(forms[i]) === 0) return forms[i]; }   // a start of a real word is fine as it is
    var a = allowed(t.length + 1); if (!a) return t;      // plural-stripped words are one letter shorter than typed
    var best = null, bestD = a + 1, bestN = -1;
    for (var w2 in vocab) {
      if (Math.abs(w2.length - t.length) > a) continue;
      if (t.length <= 5 && w2.charAt(0) !== t.charAt(0)) continue;
      var d = Math.min(dl(squash(t), w2, a), dl(squash(t) + 's', w2, a));
      if (d < bestD || (d === bestD && vocab[w2] > bestN)) { best = w2; bestD = d; bestN = vocab[w2]; }
    }
    return best && bestD <= a ? best : t;
  }
  function vocabOf(items) {
    var v = {};
    (items || []).forEach(function (it) {
      qwords(fold([it.name, it.category, it.brand, it.color, it.size].join(' '))).forEach(function (w) { if (w.length >= 3 && latin(w)) v[w] = (v[w] || 0) + 1; });
    });
    return v;
  }
  // Same question, with every misspelt shop word put right. Used to search a big catalogue.
  function correct(question, vocab) {
    var q = fold(question), out = [];
    qwords(q).forEach(function (w) { out.push(latin(w) && STOP.indexOf(w) === -1 && !/^\d+$/.test(w) ? nearest(w, vocab) : w); });
    return out.join(' ');
  }

  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function has(q, list) { for (var i = 0; i < list.length; i++) { if (q.indexOf(fold(list[i])) !== -1) return true; } return false; }
  function fill(s, p) { return s.replace(/\{(\w+)\}/g, function (m, k) { return p && p[k] !== undefined ? p[k] : m; }); }
  function tokens(q) {
    var out = [], parts = q.split(/[^a-z0-9؀-ۿ一-鿿]+/);
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i]; if (!t) continue;
      if (/[一-鿿]/.test(t)) { for (var j = 0; j < t.length; j++) out.push(t[j]); if (t.length > 1) out.push(t); }
      else if (t.length >= 2 && STOP.indexOf(t) === -1 && !/^\d+$/.test(t)) out.push(t.replace(/s$/, ''));
    }
    return out;
  }
  function hay(it) { return fold([it.name, it.category, it.brand, it.color, it.size].join(' ')); }
  function line(it, T, money) {
    var st = it.soldOut || (it.quantity !== undefined && it.quantity <= 0) ? T.soldout : (it.quantity !== undefined && it.quantity <= 3 ? fill(T.left, { n: it.quantity }) : T.instock);
    return '• ' + it.name + ' — ' + money(it.price) + ' (' + st + ')';
  }
  function number(q) { var m = q.match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }

  function answer(question, o) {
    o = o || {};
    var items = o.items || [], shop = o.shop || {}, lang = P[o.lang] ? o.lang : 'en', T = P[lang];
    var money = o.money || function (n) { return (n / 100).toFixed(2); };
    var q = fold(question).trim();
    shopWords = vocabOf(items);
    function reply(text, list) { return { text: text, items: list || [] }; }
    function listReply(head, list) { return reply(head + '\n' + list.slice(0, 8).map(function (i) { return line(i, T, money); }).join('\n'), list.slice(0, 8)); }
    var avail = items.filter(function (i) { return !(i.soldOut || (i.quantity !== undefined && i.quantity <= 0)); });

    if (!q) return reply(T.hello);
    if (o.staff && hasFuzzy(q, W.low)) {
      var low = items.filter(function (i) { return i.quantity !== undefined && i.quantity <= 3; }).sort(function (a, b) { return a.quantity - b.quantity; });
      return low.length ? listReply(T.low, low) : reply(T.nolow);
    }
    if (hasFuzzy(q, W.help)) return reply(T.help);
    if (hasFuzzy(q, W.where)) return shop.address ? reply(fill(T.where, { a: shop.address }) + (shop.phone ? '\n' + fill(T.phone, { p: shop.phone }) : '')) : reply(T.noaddr);
    if (hasFuzzy(q, W.phone) && shop.phone && !tokens(q).some(function (t) { return hay({ name: items.map(function (i) { return i.name; }).join(' ') }).indexOf(t) !== -1 && t.length > 3; })) return reply(fill(T.phone, { p: shop.phone }));
    if (hasFuzzy(q, W.news)) { var nw = avail.filter(function (i) { return i.isNewArrival; }); return nw.length ? listReply(T.newin, nw) : reply(T.nonew); }
    if (hasFuzzy(q, W.cats)) {
      var cats = {}; items.forEach(function (i) { if (i.category) cats[i.category] = 1; });
      var names = Object.keys(cats); if (names.length) return reply(T.cats + ' ' + names.slice(0, 20).join(', '));
    }

    var n = number(q), min = null, max = null;
    if (n !== null) {
      if (hasFuzzy(q, W.under)) max = Math.round(n * 100);
      else if (hasFuzzy(q, W.over)) min = Math.round(n * 100);
    }
    var vocab = vocabOf(items);
    var toks = tokens(q).map(function (t) { return nearest(t, vocab); });
    var pool = items.filter(function (i) { return (max === null || i.price <= max) && (min === null || i.price >= min); });
    var scored = [];
    if (toks.length) {
      pool.forEach(function (i) {
        var h = hay(i), s = 0;
        toks.forEach(function (t) { if (h.indexOf(t) !== -1) s += (fold(i.name).indexOf(t) !== -1 ? 3 : 1); });
        if (s) scored.push({ i: i, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s || (b.i.soldOut ? -1 : 0); });
      if (scored.length) return listReply(T.found, scored.map(function (x) { return x.i; }));
    }
    if (hasFuzzy(q, W.cheap)) return listReply(T.cheap, avail.slice().sort(function (a, b) { return a.price - b.price; }));
    if (max !== null) { var u = avail.filter(function (i) { return i.price <= max; }).sort(function (a, b) { return b.price - a.price; }); return u.length ? listReply(fill(T.under, { p: money(max) }), u) : reply(T.none); }
    if (min !== null) { var v = avail.filter(function (i) { return i.price >= min; }).sort(function (a, b) { return a.price - b.price; }); return v.length ? listReply(fill(T.over, { p: money(min) }), v) : reply(T.none); }
    if (hasFuzzy(q, W.hello)) return reply(T.hello);
    return reply(T.none);
  }

  return { answer: answer, phrases: P, correct: correct, vocabOf: vocabOf, dl: dl };
});
