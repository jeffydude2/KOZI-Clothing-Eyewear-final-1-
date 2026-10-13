/* ==========================================================
   KOZI shop: product options, shopping bag and checkout.

   Self-contained. Load it after js/app.js on every page:
     <script src="js/shop.js" defer></script>

   What it does
   - Opens an options picker when a product card is clicked
     (clothing: size + color, eyewear: lens), and only adds to
     the bag after the customer confirms.
   - Keeps the bag in localStorage so it follows the customer
     from page to page. Each size/color combination is its own line.
   - Bag drawer: quantities, remove, clear, promo code, totals.
   - Checkout: customer details, delivery, payment choice,
     validation, order summary and confirmation.

   It takes over #cartBtn and any click on a product card. Product
   data comes from data/products.json when it can be read. Anything
   missing falls back to the list below.
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Settings: edit these ---------- */
  var CONFIG = {
    currency: 'PHP',
    locale: 'en-PH',
    freeShippingOver: 2500,            // order value (after discount) that ships free
    shippingFee: 150,                  // flat fee below that
    promo: { code: 'KOZI26', percent: 20 },
    maxQty: 10,                        // per line, or the product's stock if lower
    country: 'Philippines',
    applyNewNames: true,               // use the new product names for k1 to k10
    orderEndpoint: '',                 // e.g. '/api/orders'. Orders are POSTed here as JSON.
    storageKey: 'kozi-bag-v1',
    ordersKey: 'kozi-orders-v1'
  };

  /* ---------- Built-in product list ----------
     Used for anything data/products.json does not provide.
     Prices here are placeholders: set the real ones in your data file. */
  var SIZES = ['XS', 'S', 'M', 'L', 'XL'];
  var LENS = [
    { name: 'Smoke', a: '#3b3f48', b: '#3b3f48' },
    { name: 'Mirror Silver', a: '#cfd3da', b: '#8d94a3' },
    { name: 'Ice Blue', a: '#8fc6ef', b: '#8fc6ef' }
  ];
  function duo(n, a, b) { return { name: n, a: a, b: b || a }; }
  var FALLBACK = [
    { id: 'k1', category: 'Eyewear', name: 'Halo Flame', price: 2490, tag: 'Chrome sport wrap, sapphire stud' },
    { id: 'k2', category: 'Eyewear', name: 'Nightstar Wrap', price: 2290, tag: 'Matte black wrap, star-cast temples' },
    { id: 'k3', category: 'Eyewear', name: 'Thornwing', price: 2790, tag: 'Barbed mask frame, smoked lens' },
    { id: 'k4', category: 'Eyewear', name: 'Venom Lattice', price: 3190, tag: 'Oil-slick lattice band' },
    { id: 'k5', category: 'Eyewear', name: 'Mirror Blade', price: 1990, tag: 'Single-lens chrome visor' },
    { id: 'k6', category: 'Eyewear', name: 'Glacier Edge', price: 2190, tag: 'Rimless prism lens' },
    { id: 'k7', category: 'Clothing', name: 'Spine Rider', price: 7990, tag: 'Leather jacket with a red rib back',
      colors: [duo('Black / Red', '#0c0c0e', '#e8262b'), duo('Triple Black', '#0c0c0e')] },
    { id: 'k8', category: 'Clothing', name: 'Checkmate Crop', price: 5490, tag: 'Distressed checker work jacket',
      colors: [duo('Red / Cream', '#e8262b', '#f1e9dc'), duo('Black / Cream', '#0c0c0e', '#f1e9dc')] },
    { id: 'k9', category: 'Clothing', name: 'Red Line Tee', price: 1890, tag: 'Harness-stripe heavyweight tee',
      colors: [duo('White / Red', '#ffffff', '#e8262b'), duo('Black / Red', '#0c0c0e', '#e8262b')] },
    { id: 'k10', category: 'Clothing', name: 'Slipstream Baggy', price: 3990, tag: 'Raw-edge flame-cut denim',
      colors: [duo('Washed Indigo', '#5d7da6'), duo('Raw Black', '#202226')] }
  ];

  /* ---------- Small helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; }
  var nf = null;
  try { nf = new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }); } catch (e) { /* fall back below */ }
  function money(n) { return nf ? nf.format(n) : '₱' + Math.round(n).toLocaleString(); }

  var mem = {};
  function sget(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return mem[k] || null; } }
  function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }

  /* ---------- Catalog ---------- */
  var catalog = [], byId = {}, FB = {};
  FALLBACK.forEach(function (f) { FB[f.id] = f; });

  function isClothing(p) { return /^cloth/i.test(p.category || ''); }
  function normColors(c) {
    if (!Array.isArray(c) || !c.length) return null;
    return c.map(function (x) {
      if (typeof x === 'string') return duo(x, '#8d94a3');
      var a = x.hex || x.a || x.color || '#8d94a3';
      return duo(x.name || x.label || String(a), a, x.b || a);
    });
  }
  function norm(d, f) {
    d = d || {}; f = f || {};
    var useNew = CONFIG.applyNewNames && f.name;
    var stock = d.stock != null && !isNaN(+d.stock) ? +d.stock : (d.inventory != null && !isNaN(+d.inventory) ? +d.inventory : null);
    var id = String(d.id != null ? d.id : f.id);
    return {
      id: id,
      name: useNew ? f.name : (d.name || d.title || f.name || 'Product'),
      origName: d.name || d.title || '',
      category: useNew && f.category ? f.category : (d.category || d.cat || d.type || f.category || 'Eyewear'),
      price: num(d.price) > 0 ? num(d.price) : (f.price || 0),
      stock: stock,
      img: d.image || d.img || d.photo || f.img || ('assets/products/' + id + '.jpg'),
      desc: d.description || d.desc || f.tag || '',
      sizes: Array.isArray(d.sizes) && d.sizes.length ? d.sizes.map(String) : null,
      colors: normColors(d.colors) || f.colors || null
    };
  }
  function build(data) {
    var rows = Array.isArray(data) ? data : (data && Array.isArray(data.products) ? data.products : []);
    var out = [], seen = {};
    rows.forEach(function (d) {
      if (!d || d.id == null) return;
      seen[String(d.id)] = 1;
      out.push(norm(d, FB[String(d.id)]));
    });
    FALLBACK.forEach(function (f) { if (!seen[f.id]) out.push(norm(null, f)); });
    catalog = out; byId = {};
    out.forEach(function (p) { byId[p.id] = p; });
  }
  function readGlobal() {
    var names = ['PRODUCTS', 'products', 'DATA', 'data', 'KOZI', 'STORE', 'DB'];
    for (var i = 0; i < names.length; i++) {
      try {
        var v = (new Function('return typeof ' + names[i] + '!=="undefined"?' + names[i] + ':undefined'))();
        if (Array.isArray(v) && v[0] && v[0].price != null) return v;
        if (v && Array.isArray(v.products) && v.products[0]) return v.products;
      } catch (e) { /* not available */ }
    }
    return null;
  }
  build(readGlobal());
  var ready = fetch('data/products.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) build(j); })
    .catch(function () { /* keep the built-in list */ })
    .then(function () { decorate(); });

  function maxFor(p) { return p.stock != null ? Math.max(0, Math.min(CONFIG.maxQty, p.stock)) : CONFIG.maxQty; }

  /* ---------- Bag state ---------- */
  var bag = loadBag();
  function validLine(l) { return l && l.key && l.id && typeof l.price === 'number' && l.qty >= 1; }
  function loadBag() {
    var s = sget(CONFIG.storageKey);
    return { lines: (s && Array.isArray(s.lines) ? s.lines : []).filter(validLine), promo: (s && s.promo) || '' };
  }
  function saveBag() { sset(CONFIG.storageKey, bag); }
  function count() { return bag.lines.reduce(function (n, l) { return n + l.qty; }, 0); }
  function promoOn() { return !!bag.promo && bag.promo.toUpperCase() === CONFIG.promo.code.toUpperCase(); }
  function totals() {
    var subtotal = bag.lines.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
    var discount = promoOn() ? Math.round(subtotal * CONFIG.promo.percent / 100) : 0;
    var after = subtotal - discount;
    var shipping = bag.lines.length ? (after >= CONFIG.freeShippingOver ? 0 : CONFIG.shippingFee) : 0;
    return { subtotal: subtotal, discount: discount, after: after, shipping: shipping, total: after + shipping };
  }
  function optText(l) {
    var a = [];
    if (l.size) a.push('Size ' + l.size);
    if (l.color) a.push((l.colorLabel === 'Lens' ? 'Lens ' : '') + l.color);
    return a.join(' · ');
  }
  function addLine(p, size, color, colorLabel, qty) {
    var key = [p.id, size || '', color || ''].join('|');
    var max = maxFor(p), capped = false;
    var l = bag.lines.filter(function (x) { return x.key === key; })[0];
    if (l) {
      var q = l.qty + qty;
      if (q > max) { q = max; capped = true; }
      l.qty = q;
    } else {
      bag.lines.push({ key: key, id: p.id, name: p.name, category: p.category, img: p.img, price: p.price,
        size: size || '', color: color || '', colorLabel: colorLabel || '', qty: Math.min(max, qty) });
    }
    saveBag();
    return capped;
  }

  /* ---------- Layers (dialogs) ---------- */
  var layers = {}, current = null, lastFocus = null;
  function layer(id, cls) {
    if (layers[id]) return layers[id];
    var el = document.createElement('div');
    el.id = id; el.className = 'kz-layer ' + cls; el.setAttribute('aria-hidden', 'true');
    el.addEventListener('mousedown', function (e) { if (e.target === el) closeLayer(); });
    document.body.appendChild(el);
    layers[id] = el;
    return el;
  }
  function openLayer(el, trigger) {
    if (toastEl) toastEl.className = 'kz-toast';
    if (current && current !== el) { current.classList.remove('open'); current.setAttribute('aria-hidden', 'true'); }
    else if (!current) lastFocus = trigger || document.activeElement;
    current = el;
    el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('kz-lock');
  }
  function closeLayer() {
    if (!current) return;
    current.classList.remove('open'); current.setAttribute('aria-hidden', 'true');
    current = null;
    document.documentElement.classList.remove('kz-lock');
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
    lastFocus = null;
  }
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])', el)
      .filter(function (n) { return n.offsetWidth || n.offsetHeight || n.getClientRects().length; });
  }
  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLayer(); return; }
    if (e.key === 'Tab') {
      var f = focusables(current);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Toast ---------- */
  var toastEl = null, toastTimer = 0;
  function toast(msg, opt) {
    opt = opt || {};
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'kz-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.className = 'kz-toast show' + (opt.error ? ' err' : '');
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (opt.action ? '<button type="button">' + esc(opt.action) + '</button>' : '');
    var b = $('button', toastEl);
    if (b) b.onclick = function () { toastEl.className = 'kz-toast'; opt.fn && opt.fn(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'kz-toast'; }, opt.action ? 6000 : 4000);
  }

  /* ---------- Cart button badge + card decoration ---------- */
  function badges() {
    var n = count();
    $$('#cartBtn,[data-kz-bag]').forEach(function (b) {
      if (b.getAttribute('data-kz-n') === String(n) && b.querySelector('.kz-badge')) return;
      b.setAttribute('data-kz-n', n);
      b.setAttribute('aria-label', 'Open shopping bag, ' + n + (n === 1 ? ' item' : ' items'));
      b.innerHTML = 'Bag<span class="kz-badge' + (n ? '' : ' zero') + '" aria-hidden="true">' + n + '</span>';
    });
  }
  function bump() {
    $$('.kz-badge').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }
  function productFromCard(card) {
    var id = card.getAttribute('data-kz-id') || card.getAttribute('data-id') || card.getAttribute('data-pid') || card.getAttribute('data-product');
    if (!id) {
      var img = card.querySelector('img');
      var m = img && /\/(k\d+)\.[a-z]+/i.exec(img.getAttribute('src') || '');
      if (m) id = m[1];
    }
    var p = id && byId[id];
    if (!p) {
      var h = card.querySelector('h3');
      if (h) {
        var t = h.textContent.trim().toLowerCase();
        p = catalog.filter(function (x) { return x.name.toLowerCase() === t || (x.origName && x.origName.toLowerCase() === t); })[0];
      }
    }
    return p || null;
  }
  function decorate() {
    $$('.card').forEach(function (card) {
      if (card.closest('.kz-layer')) return;
      var p = productFromCard(card);
      if (!p) return;
      if (card.getAttribute('data-kz-id') !== p.id) card.setAttribute('data-kz-id', p.id);
      var h = card.querySelector('h3');
      if (CONFIG.applyNewNames && h && FB[p.id] && h.textContent.trim() !== p.name) h.textContent = p.name;
      if (!card.querySelector('button,a[href]') && !card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0'); card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Choose options for ' + p.name);
      }
    });
    badges();
  }
  var raf = 0;
  new MutationObserver(function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; decorate(); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ---------- Product options modal ---------- */
  var sel = null; // { p, qty }
  function radios(name, items, kind) {
    return items.map(function (it, i) {
      var id = 'kz-' + name + '-' + i;
      var dot = kind === 'sw' ? '<i style="background:linear-gradient(135deg,' + esc(it.a) + ' 50%,' + esc(it.b) + ' 50%)"></i>' : '';
      return '<label class="kz-chip kz-' + kind + '" for="' + id + '"><input type="radio" id="' + id + '" name="kz-' + name + '" value="' + esc(it.name) + '"><span>' + dot + esc(it.name) + '</span></label>';
    }).join('');
  }
  function productHTML(p) {
    var cl = isClothing(p), max = maxFor(p), sold = max < 1;
    var sizes = cl ? (p.sizes || SIZES).map(function (s) { return { name: s }; }) : [];
    var colors = p.colors || (cl ? [] : LENS);
    var cLabel = cl ? 'Color' : 'Lens';
    return '' +
      '<div class="kz-mbox" role="dialog" aria-modal="true" aria-labelledby="kzPName" tabindex="-1">' +
        '<div class="kz-art"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '"></div>' +
        '<div class="kz-pbody">' +
          '<button class="kz-x" type="button" data-close aria-label="Close">×</button>' +
          '<small class="kz-eyebrow">' + esc(p.category) + '</small>' +
          '<h2 id="kzPName">' + esc(p.name) + '</h2>' +
          '<p class="kz-pprice">' + money(p.price) + '</p>' +
          (p.desc ? '<p class="kz-desc">' + esc(p.desc) + '. Small batch. When it’s gone, it’s gone.</p>' : '') +
          (sizes.length ? '<fieldset class="kz-group" data-group="size"><legend>Size <b class="kz-sel" data-for="size"></b></legend><div class="kz-opts">' + radios('size', sizes, 'size') + '</div>' +
            '<details class="kz-guide"><summary>Size guide</summary><p>Cuts are boxy and oversized. Take your usual size for the intended fit, or one size down for a closer fit.</p></details></fieldset>' : '') +
          (colors.length ? '<fieldset class="kz-group" data-group="color"><legend>' + cLabel + ' <b class="kz-sel" data-for="color"></b></legend><div class="kz-opts">' + radios('color', colors, 'sw') + '</div></fieldset>' : '') +
          '<div class="kz-group"><span class="kz-leg">Quantity</span>' +
            '<div class="kz-step"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
            '<input id="kzQty" type="number" inputmode="numeric" min="1" max="' + Math.max(1, max) + '" value="1" aria-label="Quantity">' +
            '<button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>' +
            (p.stock != null && p.stock <= 5 && p.stock > 0 ? '<span class="kz-low">Only ' + p.stock + ' left</span>' : '') + '</div>' +
          '<p class="kz-err" role="alert" aria-live="assertive"></p>' +
          '<button class="btn kz-add" type="button"' + (sold ? ' disabled' : '') + '>' + (sold ? 'Sold out' : 'Add to bag · ' + money(p.price)) + '</button>' +
        '</div>' +
      '</div>';
  }
  function openProduct(p, trigger) {
    var el = layer('kzProduct', 'kz-modal');
    sel = { p: p, qty: 1 };
    el.innerHTML = productHTML(p);
    openLayer(el, trigger);
    var box = $('.kz-mbox', el); if (box) box.focus({ preventScroll: true });
  }
  function selected(el, group) {
    var r = $('input[name="kz-' + group + '"]:checked', el);
    return r ? r.value : '';
  }
  function updateAddLabel(el) {
    var b = $('.kz-add', el); if (!b || b.disabled || !sel) return;
    b.textContent = 'Add to bag · ' + money(sel.p.price * sel.qty);
  }
  function setQty(el, v) {
    var max = Math.max(1, maxFor(sel.p));
    v = parseInt(v, 10); if (isNaN(v) || v < 1) v = 1; if (v > max) v = max;
    sel.qty = v; $('#kzQty', el).value = v; updateAddLabel(el);
  }
  function submitProduct(el) {
    var p = sel.p, cl = isClothing(p), missing = [];
    var hasSize = !!$('[data-group="size"]', el), hasColor = !!$('[data-group="color"]', el);
    var size = hasSize ? selected(el, 'size') : '', color = hasColor ? selected(el, 'color') : '';
    if (hasSize && !size) missing.push('size');
    if (hasColor && !color) missing.push('color');
    $$('.kz-group', el).forEach(function (g) { g.classList.remove('missing'); });
    var err = $('.kz-err', el);
    if (missing.length) {
      missing.forEach(function (g) { $('[data-group="' + g + '"]', el).classList.add('missing'); });
      var words = missing.map(function (g) { return g === 'size' ? 'a size' : (cl ? 'a color' : 'a lens'); });
      err.textContent = 'Select ' + words.join(' and ') + ' to add this to your bag.';
      var f = $('[data-group="' + missing[0] + '"] input', el); if (f) f.focus();
      return;
    }
    err.textContent = '';
    var cLabel = cl ? 'Color' : 'Lens';
    var capped = addLine(p, size, color, cLabel, sel.qty);
    var detail = [size, color].filter(Boolean).join(', ');
    closeLayer(); badges(); bump(); refreshBag();
    toast((capped ? 'Limit reached for ' : 'Added to bag: ') + p.name + (detail ? ' (' + detail + ')' : '') + (capped ? '' : ' × ' + sel.qty),
      { action: 'View bag', fn: openBag });
  }
  (function bindProduct() {
    var el = layer('kzProduct', 'kz-modal');
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-close]')) return closeLayer();
      if (t.closest('.kz-add')) return submitProduct(el);
      var q = t.closest('[data-qty]');
      if (q) setQty(el, sel.qty + parseInt(q.getAttribute('data-qty'), 10));
    });
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type === 'radio') {
        var g = t.closest('.kz-group');
        g.classList.remove('missing');
        var out = $('.kz-sel[data-for="' + g.getAttribute('data-group') + '"]', g); if (out) out.textContent = '· ' + t.value;
        if (!$('.kz-group.missing', el)) $('.kz-err', el).textContent = '';
      } else if (t.id === 'kzQty') setQty(el, t.value);
    });
    el.addEventListener('input', function (e) { if (e.target.id === 'kzQty' && e.target.value !== '') setQty(el, e.target.value); });
  })();

  /* ---------- Bag drawer ---------- */
  var ui = { confirmClear: false, promoMsg: '', promoErr: false };
  function rowsHTML(t) {
    return '<dl class="kz-rows">' +
      '<div><dt>Subtotal</dt><dd>' + money(t.subtotal) + '</dd></div>' +
      (t.discount ? '<div class="kz-disc"><dt>Discount (' + esc(CONFIG.promo.code) + ')</dt><dd>−' + money(t.discount) + '</dd></div>' : '') +
      '<div><dt>Shipping</dt><dd>' + (t.shipping ? money(t.shipping) : 'Free') + '</dd></div>' +
      '<div class="kz-total"><dt>Total</dt><dd>' + money(t.total) + '</dd></div></dl>';
  }
  function bagHTML() {
    var t = totals(), n = count();
    var head = '<div class="kz-dhead"><h2 id="kzBagT">Your <em>bag</em></h2><span class="kz-count">' + n + (n === 1 ? ' item' : ' items') + '</span>' +
      '<button class="kz-x" type="button" data-close aria-label="Close bag">×</button></div>';
    if (!bag.lines.length) {
      return '<div class="kz-dbox" role="dialog" aria-modal="true" aria-labelledby="kzBagT" tabindex="-1">' + head +
        '<div class="kz-empty"><p class="kz-empty-t">Your bag is empty.</p>' +
        '<p>Pick a frame or a piece and it will show up here.</p>' +
        '<a class="btn" href="products.html" data-close>Shop the drop</a></div></div>';
    }
    var lines = bag.lines.map(function (l) {
      var lim = (byId[l.id] ? maxFor(byId[l.id]) : CONFIG.maxQty);
      return '<li class="kz-line"><img src="' + esc(l.img) + '" alt="' + esc(l.name) + '">' +
        '<div class="kz-lmain"><h3>' + esc(l.name) + '</h3>' +
        (optText(l) ? '<p class="kz-opt">' + esc(optText(l)) + '</p>' : '') +
        '<p class="kz-unit">' + money(l.price) + ' each</p>' +
        '<div class="kz-lrow"><div class="kz-step sm">' +
          '<button type="button" data-act="dec" data-key="' + esc(l.key) + '" data-kz-focus="dec:' + esc(l.key) + '" aria-label="Decrease quantity of ' + esc(l.name) + '"' + (l.qty <= 1 ? ' disabled' : '') + '>−</button>' +
          '<output aria-live="polite" aria-label="Quantity">' + l.qty + '</output>' +
          '<button type="button" data-act="inc" data-key="' + esc(l.key) + '" data-kz-focus="inc:' + esc(l.key) + '" aria-label="Increase quantity of ' + esc(l.name) + '"' + (l.qty >= lim ? ' disabled' : '') + '>+</button></div>' +
          '<button class="kz-link" type="button" data-act="rm" data-key="' + esc(l.key) + '">Remove</button></div></div>' +
        '<p class="kz-ltotal">' + money(l.price * l.qty) + '</p></li>';
    }).join('');
    var rem = CONFIG.freeShippingOver - t.after, pct = Math.max(0, Math.min(100, Math.round(t.after / CONFIG.freeShippingOver * 100)));
    var meter = '<div class="kz-meter"><p>' + (rem > 0 ? 'Add <b>' + money(rem) + '</b> more for free shipping' : 'You’ve unlocked free shipping') + '</p><div class="kz-bar"><i style="width:' + pct + '%"></i></div></div>';
    var promo = promoOn()
      ? '<div class="kz-promo on"><span><b>' + esc(CONFIG.promo.code) + '</b> applied · ' + CONFIG.promo.percent + '% off</span><button class="kz-link" type="button" data-act="promo-rm">Remove</button></div>'
      : '<form class="kz-promo" data-promo novalidate><label class="kz-sr" for="kzPromo">Promo code</label><input id="kzPromo" placeholder="Promo code" autocomplete="off" autocapitalize="characters"><button class="btn alt" type="submit">Apply</button></form>' +
        (ui.promoMsg ? '<p class="kz-pmsg' + (ui.promoErr ? ' bad' : '') + '" role="status">' + esc(ui.promoMsg) + '</p>' : '');
    var clear = ui.confirmClear
      ? '<div class="kz-confirm" role="alertdialog" aria-label="Clear bag"><span>Remove everything from your bag?</span><button class="kz-link" type="button" data-act="clear-yes" data-kz-focus="clear-yes">Yes, clear it</button><button class="kz-link" type="button" data-act="clear-no">Keep</button></div>'
      : '<button class="kz-link" type="button" data-act="clear" data-kz-focus="clear">Clear bag</button>';
    return '<div class="kz-dbox" role="dialog" aria-modal="true" aria-labelledby="kzBagT" tabindex="-1">' + head +
      '<div class="kz-dscroll"><ul class="kz-lines">' + lines + '</ul></div>' +
      '<div class="kz-dfoot">' + meter + promo + rowsHTML(t) +
        '<button class="btn kz-go" type="button" data-act="checkout">Checkout · ' + money(t.total) + '</button>' +
        '<p class="kz-fine">Shipping and taxes are shown at checkout. Delivery within the ' + esc(CONFIG.country) + '.</p>' +
        '<div class="kz-foot2">' + clear + '<a class="kz-link" href="products.html" data-close>Continue shopping</a></div>' +
      '</div></div>';
  }
  function renderBag() {
    var el = layer('kzBag', 'kz-drawer');
    var sc = $('.kz-dscroll', el), top = sc ? sc.scrollTop : 0;
    var fk = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-kz-focus');
    el.innerHTML = bagHTML();
    var sc2 = $('.kz-dscroll', el); if (sc2) sc2.scrollTop = top;
    if (fk) {
      var again = $('[data-kz-focus="' + fk.replace(/"/g, '\\"') + '"]', el);
      if (again && !again.disabled) again.focus({ preventScroll: true });
      else { var c = $('.kz-x', el); if (c) c.focus({ preventScroll: true }); }
    }
  }
  function refreshBag() { if (layers.kzBag && current === layers.kzBag) renderBag(); }
  function openBag(trigger) {
    ui.confirmClear = false; ui.promoMsg = '';
    renderBag();
    openLayer(layers.kzBag, trigger && trigger.nodeType === 1 ? trigger : null);
    var box = $('.kz-dbox', layers.kzBag); if (box) box.focus({ preventScroll: true });
  }
  (function bindBag() {
    var el = layer('kzBag', 'kz-drawer');
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-close]')) { if (t.closest('a') && !/products\.html$/.test(location.pathname)) { closeLayer(); return; } e.preventDefault(); return closeLayer(); }
      var b = t.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act'), key = b.getAttribute('data-key');
      var l = bag.lines.filter(function (x) { return x.key === key; })[0];
      if (act === 'inc' && l) { var p = byId[l.id], lim = p ? maxFor(p) : CONFIG.maxQty; if (l.qty < lim) l.qty++; }
      else if (act === 'dec' && l) { if (l.qty > 1) l.qty--; }
      else if (act === 'rm' && l) { bag.lines = bag.lines.filter(function (x) { return x.key !== key; }); toast('Removed ' + l.name + ' from your bag'); }
      else if (act === 'clear') { ui.confirmClear = true; }
      else if (act === 'clear-no') { ui.confirmClear = false; }
      else if (act === 'clear-yes') { bag.lines = []; bag.promo = ''; ui.confirmClear = false; toast('Your bag is empty'); }
      else if (act === 'promo-rm') { bag.promo = ''; ui.promoMsg = ''; }
      else if (act === 'checkout') { return openCheckout(); }
      saveBag(); badges(); renderBag();
    });
    el.addEventListener('submit', function (e) {
      if (!e.target.hasAttribute('data-promo')) return;
      e.preventDefault();
      var v = ($('#kzPromo', el).value || '').trim();
      if (!v) { ui.promoMsg = 'Enter a promo code.'; ui.promoErr = true; }
      else if (v.toUpperCase() === CONFIG.promo.code.toUpperCase()) { bag.promo = CONFIG.promo.code; ui.promoMsg = ''; ui.promoErr = false; saveBag(); }
      else { ui.promoMsg = 'That code isn’t valid.'; ui.promoErr = true; }
      renderBag();
      var i = $('#kzPromo', el); if (i) i.focus({ preventScroll: true });
    });
  })();

  /* ---------- Checkout ---------- */
  var PAY = [
    { v: 'cod', t: 'Cash on delivery', d: 'Pay in cash when your order arrives.' },
    { v: 'gcash', t: 'GCash', d: 'We’ll send payment details after you place the order.' },
    { v: 'bank', t: 'Bank transfer', d: 'We’ll send account details after you place the order.' }
  ];
  function field(id, label, type, extra, hint) {
    return '<label for="' + id + '">' + label + '<input id="' + id + '" name="' + id.replace('kzf-', '') + '" type="' + type + '" ' + (extra || '') + ' aria-describedby="' + id + '-e"><span class="err" id="' + id + '-e"></span></label>';
  }
  function summaryLines() {
    return '<ul class="kz-slines">' + bag.lines.map(function (l) {
      return '<li><span class="kz-sthumb"><img src="' + esc(l.img) + '" alt=""><b>' + l.qty + '</b></span>' +
        '<span class="kz-sname">' + esc(l.name) + (optText(l) ? '<small>' + esc(optText(l)) + '</small>' : '') + '</span>' +
        '<span class="kz-sprice">' + money(l.price * l.qty) + '</span></li>';
    }).join('') + '</ul>';
  }
  function checkoutHTML() {
    var t = totals();
    return '<div class="kz-cbox" role="dialog" aria-modal="true" aria-labelledby="kzCT" tabindex="-1">' +
      '<button class="kz-x" type="button" data-close aria-label="Close checkout">×</button>' +
      '<form class="kz-cform" id="kzForm" novalidate>' +
        '<div><h2 id="kzCT">Check<em>out</em></h2><button class="kz-link" type="button" data-back>← Back to bag</button></div>' +
        '<fieldset class="kz-fs"><legend>Contact</legend>' +
          field('kzf-name', 'Full name', 'text', 'autocomplete="name"') +
          '<div class="kz-row">' + field('kzf-email', 'Email', 'email', 'autocomplete="email" inputmode="email"') +
          field('kzf-phone', 'Mobile number', 'tel', 'autocomplete="tel" inputmode="tel" placeholder="09XX XXX XXXX"') + '</div></fieldset>' +
        '<fieldset class="kz-fs"><legend>Delivery</legend>' +
          field('kzf-address', 'Street address', 'text', 'autocomplete="street-address" placeholder="House no., street, barangay"') +
          '<div class="kz-row">' + field('kzf-city', 'City / municipality', 'text', 'autocomplete="address-level2"') +
          field('kzf-province', 'Province', 'text', 'autocomplete="address-level1"') + '</div>' +
          '<div class="kz-row">' + field('kzf-postal', 'Postal code', 'text', 'autocomplete="postal-code" inputmode="numeric" maxlength="4"') +
          '<label for="kzf-country">Country<input id="kzf-country" name="country" value="' + esc(CONFIG.country) + '" readonly></label></div>' +
          '<label for="kzf-notes">Order notes (optional)<textarea id="kzf-notes" name="notes" rows="2" placeholder="Landmarks, delivery instructions"></textarea></label></fieldset>' +
        '<fieldset class="kz-fs"><legend>Payment</legend><div class="kz-pays">' + PAY.map(function (p, i) {
          return '<label class="kz-pay" for="kzf-pay' + i + '"><input type="radio" id="kzf-pay' + i + '" name="payment" value="' + p.v + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + p.t + '</b><small>' + p.d + '</small></span></label>';
        }).join('') + '</div></fieldset>' +
        '<label class="kz-terms" for="kzf-terms"><input type="checkbox" id="kzf-terms" name="terms" aria-describedby="kzf-terms-e"><span>I confirm my details are correct and I agree to the order terms. Items are limited and made in small batches.</span></label>' +
        '<span class="err" id="kzf-terms-e"></span>' +
        '<button class="btn kz-go" type="submit">Place order · ' + money(t.total) + '</button>' +
      '</form>' +
      '<aside class="kz-cside" aria-label="Order summary"><div class="kz-sticky"><h3>Order summary</h3>' + summaryLines() + rowsHTML(t) +
        '<div class="kz-ship"><b>Shipping</b><p>Standard delivery within the ' + esc(CONFIG.country) + '. Ships within 3 days. ' +
          (t.shipping ? 'Add ' + money(CONFIG.freeShippingOver - t.after) + ' more for free shipping.' : 'Free shipping applies to this order.') + '</p></div>' +
        '<div class="kz-req"><b>Before you order</b><ul><li>Name, email and a mobile number we can reach</li><li>A full delivery address</li><li>A payment method</li><li>Agree to the order terms</li></ul></div>' +
      '</div></aside></div>';
  }
  function openCheckout() {
    if (!bag.lines.length) { toast('Your bag is empty. Add something first.', { error: true }); return; }
    var el = layer('kzCheckout', 'kz-modal');
    el.innerHTML = checkoutHTML();
    openLayer(el);
    var box = $('.kz-cbox', el); if (box) box.focus({ preventScroll: true });
  }
  function setErr(el, id, msg) {
    var inp = $('#' + id, el), e = $('#' + id + '-e', el);
    if (e) e.textContent = msg || '';
    if (inp) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
    return !msg;
  }
  function validate(el) {
    var v = function (id) { return ($('#' + id, el).value || '').trim(); };
    var checks = [
      ['kzf-name', v('kzf-name').length >= 2 ? '' : 'Enter your full name.'],
      ['kzf-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('kzf-email')) ? '' : 'Enter a valid email address.'],
      ['kzf-phone', /^(\+63|63|0)9\d{9}$/.test(v('kzf-phone').replace(/[\s\-()]/g, '')) ? '' : 'Enter a mobile number like 0917 123 4567.'],
      ['kzf-address', v('kzf-address').length >= 5 ? '' : 'Enter your street address.'],
      ['kzf-city', v('kzf-city').length >= 2 ? '' : 'Enter your city or municipality.'],
      ['kzf-province', v('kzf-province').length >= 2 ? '' : 'Enter your province.'],
      ['kzf-postal', /^\d{4}$/.test(v('kzf-postal')) ? '' : 'Enter a 4-digit postal code.'],
      ['kzf-terms', $('#kzf-terms', el).checked ? '' : 'Please accept the order terms to continue.']
    ];
    var firstBad = null;
    checks.forEach(function (c) { if (!setErr(el, c[0], c[1]) && !firstBad) firstBad = c[0]; });
    return firstBad;
  }
  function orderNo() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    var r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'KZ-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + r;
  }
  function placeOrder(el) {
    var f = $('#kzForm', el), fd = {};
    $$('input,textarea', f).forEach(function (i) { if (i.type === 'radio') { if (i.checked) fd[i.name] = i.value; } else if (i.type !== 'checkbox') fd[i.name] = (i.value || '').trim(); });
    var t = totals();
    var order = {
      number: orderNo(), placedAt: new Date().toISOString(), currency: CONFIG.currency,
      customer: { name: fd.name, email: fd.email, phone: fd.phone },
      delivery: { address: fd.address, city: fd.city, province: fd.province, postal: fd.postal, country: fd.country, notes: fd.notes },
      payment: fd.payment,
      items: bag.lines.map(function (l) { return { id: l.id, name: l.name, size: l.size, color: l.color, qty: l.qty, price: l.price, lineTotal: l.price * l.qty }; }),
      promo: promoOn() ? CONFIG.promo.code : '',
      totals: t
    };
    var btn = $('.kz-go', f); btn.disabled = true; btn.textContent = 'Placing order…';
    var lines = bag.lines.slice();
    var finish = function () {
      var log = sget(CONFIG.ordersKey) || [];
      log.unshift({ number: order.number, placedAt: order.placedAt, items: order.items, totals: order.totals, payment: order.payment });
      sset(CONFIG.ordersKey, log.slice(0, 20));
      bag.lines = []; bag.promo = ''; saveBag(); badges();
      el.innerHTML = doneHTML(order, lines);
      var h = $('#kzDT', el); if (h) h.focus();
    };
    if (CONFIG.orderEndpoint) {
      fetch(CONFIG.orderEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) })
        .then(function (r) { if (!r.ok) throw new Error('bad status'); finish(); })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Place order · ' + money(t.total);
          toast('We couldn’t send your order. Check your connection and try again.', { error: true });
        });
    } else finish();
  }
  function doneHTML(o, lines) {
    var pay = PAY.filter(function (p) { return p.v === o.payment; })[0];
    var t = o.totals, first = (o.customer.name || '').split(' ')[0];
    var li = '<ul class="kz-slines">' + lines.map(function (l) {
      return '<li><span class="kz-sthumb"><img src="' + esc(l.img) + '" alt=""><b>' + l.qty + '</b></span><span class="kz-sname">' + esc(l.name) + (optText(l) ? '<small>' + esc(optText(l)) + '</small>' : '') + '</span><span class="kz-sprice">' + money(l.price * l.qty) + '</span></li>';
    }).join('') + '</ul>';
    return '<div class="kz-cbox kz-done" role="dialog" aria-modal="true" aria-labelledby="kzDT">' +
      '<button class="kz-x" type="button" data-close aria-label="Close">×</button>' +
      '<div class="kz-dmain"><small class="kz-eyebrow">Order ' + esc(o.number) + '</small>' +
        '<h2 id="kzDT" tabindex="-1">Thank you, <em>' + esc(first || 'friend') + '</em>.</h2>' +
        '<p class="kz-lead">Your order is in. We’ll email ' + esc(o.customer.email) + ' with the details. ' + (pay ? esc(pay.d) : '') + '</p>' +
        '<div class="kz-addr"><b>Delivering to</b><p>' + esc(o.customer.name) + '<br>' + esc(o.delivery.address) + '<br>' + esc(o.delivery.city) + ', ' + esc(o.delivery.province) + ' ' + esc(o.delivery.postal) + '<br>' + esc(o.customer.phone) + '</p></div>' +
        (CONFIG.orderEndpoint ? '' : '<p class="kz-demo">Demo mode: no order endpoint is connected, so this order was not sent to the shop. It is saved in this browser only.</p>') +
        '<a class="btn" href="products.html" data-close>Keep shopping</a></div>' +
      '<aside class="kz-cside" aria-label="Order summary"><div class="kz-sticky"><h3>Order summary</h3>' + li + rowsHTML(t) + '</div></aside></div>';
  }
  (function bindCheckout() {
    var el = layer('kzCheckout', 'kz-modal');
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-back]')) { openBag(); return; }
      if (t.closest('[data-close]')) { if (t.closest('a') && !/products\.html$/.test(location.pathname)) { closeLayer(); return; } e.preventDefault(); closeLayer(); }
    });
    el.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = validate(el);
      if (bad) { var i = $('#' + bad, el); if (i) i.focus(); toast('Please fix the highlighted fields.', { error: true }); return; }
      placeOrder(el);
    });
    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id && t.getAttribute('aria-invalid')) setErr(el, t.id, '');
    });
    el.addEventListener('change', function (e) { if (e.target.id === 'kzf-terms' && e.target.checked) setErr(el, 'kzf-terms', ''); });
  })();

  /* ---------- Page wiring ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var cb = t.closest('#cartBtn,[data-kz-bag]');
    if (cb) { e.preventDefault(); e.stopImmediatePropagation(); openBag(cb); return; }
    if (t.closest('.kz-layer,.kz-toast')) return;
    var card = t.closest('.card');
    if (!card) return;
    var p = productFromCard(card);
    if (!p) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openProduct(p, card);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target && e.target.matches && e.target.matches('.card[role="button"]') ? e.target : null;
    if (!card) return;
    var p = productFromCard(card);
    if (p) { e.preventDefault(); openProduct(p, card); }
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== CONFIG.storageKey) return;
    bag = loadBag(); badges(); refreshBag();
  });

  badges();
  window.KoziShop = {
    ready: ready,
    get catalog() { return catalog; },
    count: count, money: money, openBag: openBag,
    openProduct: function (id) { var p = byId[id]; if (p) openProduct(p); }
  };
})();
