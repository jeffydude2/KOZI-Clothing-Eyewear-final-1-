/* ==========================================================
   KOZI site script
   - Builds the shared ticker, header and footer
   - API / data integration: GET data/products.json and
     data/customers.json with fetch(), then renders them
       * featured pieces (home), product grid (shop)
       * "The crew" customer cards (home), customer table (contact)
   - Shop page search, category filter and sort
   - Contact form validation, newsletter form, countdown, promo code
   - Scroll reveal and photo figures

   Load order on every page:
     data/data.js (offline fallback), js/app.js, js/shop.js
   ========================================================== */
(function () {
  'use strict';

  var PAGE = document.body.getAttribute('data-page') || 'index.html';
  var SOCIAL = {
    Instagram: 'https://www.instagram.com/kozi.world',
    TikTok: 'https://www.tiktok.com/@kozi.world',
    Facebook: 'https://www.facebook.com/koziworld'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var nf = null;
  try { nf = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }); } catch (e) { /* use fallback */ }
  function money(n) { return nf ? nf.format(n) : '\u20B1' + Math.round(n).toLocaleString(); }

  /* ---------- Shared layout: ticker, header, footer ---------- */
  function buildLayout() {
    var body = document.body;
    var msg = 'DROP 01 \u2605 PRE-ORDER NOW \u2605 CODE KOZI26 \u2605 ';
    var links = [['index.html', 'Home'], ['products.html', 'Shop'], ['features.html', 'Features'], ['campaign.html', 'Campaign'], ['contact.html', 'Contact']];
    var nav = links.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[0] === PAGE ? ' class="on" aria-current="page"' : '') + '>' + l[1] + '</a>';
    }).join('');

    var skip = el('<a href="#main" class="skip">Skip to content</a>');
    var ticker = el('<div class="ticker alt" aria-hidden="true"><div>' + new Array(30).join(msg) + '</div></div>');
    var header = el('<header><a class="logo" href="index.html" aria-label="KOZI home">KOZI</a><nav aria-label="Main">' + nav + '</nav><button id="cartBtn" type="button">Bag (0)</button></header>');
    body.insertBefore(header, body.firstChild);
    body.insertBefore(ticker, body.firstChild);
    body.insertBefore(skip, body.firstChild);

    var first = $('section', body);
    if (first && !first.id) first.id = 'main';

    var social = Object.keys(SOCIAL).map(function (k) {
      return '<a href="' + SOCIAL[k] + '" target="_blank" rel="noopener noreferrer">' + k + '</a>';
    }).join('');
    var footer = el(
      '<footer>' +
      '<div><h3>KOZI</h3><a href="index.html">Clothing + Eyewear</a><a href="contact.html">Clark Freeport Zone, Angeles City</a><a href="mailto:hello@kozi.world">hello@kozi.world</a></div>' +
      '<div><h3>Explore</h3>' + links.slice(1).map(function (l) { return '<a href="' + l[0] + '">' + l[1] + '</a>'; }).join('') + '</div>' +
      '<div><h3>Follow</h3>' + social + '</div>' +
      '<div><h3>Join the list</h3><form id="nform" novalidate><input type="email" name="email" placeholder="Email address" aria-label="Email address"><button class="btn" type="submit">Join</button></form><p id="nmsg" role="status" style="font-size:.85rem;margin-top:8px;min-height:1.2em"></p></div>' +
      '</footer>'
    );
    body.appendChild(footer);
  }

  /* ---------- API / data: GET requests ---------- */
  function getJSON(url, fallbackKey) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(url + ' returned ' + r.status);
        return r.json();
      })
      .catch(function (err) {
        // fetch() is blocked when a page is opened straight from disk (file://).
        // data/data.js carries the same records so the site still works.
        if (window.KOZI_DATA && window.KOZI_DATA[fallbackKey]) {
          if (window.console) console.warn('KOZI: using offline copy of ' + fallbackKey + ' (' + err.message + ')');
          return window.KOZI_DATA[fallbackKey];
        }
        throw err;
      });
  }
  var tonesP = fetch('assets/tones.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });

  // Privacy: public pages never show a customer's full name or email.
  function shortName(n) { var w = String(n).trim().split(/\s+/); return w[0] + (w[1] ? ' ' + w[w.length - 1].charAt(0) + '.' : ''); }
  function maskEmail(e) { var p = String(e).split('@'); return p[0].charAt(0) + '\u2022\u2022\u2022\u2022\u2022@' + (p[1] || ''); }

  function availability(p) {
    if (p.stock != null && +p.stock <= 0) return '<span class="avail out">Sold out</span>';
    if (p.stock != null && +p.stock <= 5) return '<span class="avail low">Only ' + (+p.stock) + ' left</span>';
    return '<span class="avail">In stock</span>';
  }

  function productCard(p, tones) {
    var tone = tones['products/' + p.id + '.jpg'];
    return el(
      '<div class="card" data-id="' + esc(p.id) + '">' +
      '<div class="art has-img"' + (tone ? ' style="background:' + esc(tone) + '"' : '') + '><img src="' + esc(p.image) + '" alt="' + esc(p.name + ' ' + p.category.toLowerCase()) + '" loading="lazy"></div>' +
      '<div class="body"><small>' + esc(p.category) + '</small><h3>' + esc(p.name) + '</h3>' +
      '<p class="desc">' + esc(p.description) + '</p>' +
      '<p><span class="price">' + money(p.price) + '</span> ' + availability(p) + '</p>' +
      '<button class="btn alt" type="button">View details</button></div></div>'
    );
  }

  function showNotice(node, text) {
    if (node) node.innerHTML = '<p class="notice">' + esc(text) + '</p>';
  }

  function initProducts() {
    var feat = $('#featured'), list = $('#plist');
    if (!feat && !list) return;
    Promise.all([getJSON('data/products.json', 'products'), tonesP]).then(function (res) {
      var items = Array.isArray(res[0]) ? res[0] : (res[0].products || []);
      var tones = res[1] || {};

      if (feat) {
        var picks = items.filter(function (p) { return p.featured; });
        (picks.length ? picks : items).slice(0, 4).forEach(function (p) { feat.appendChild(productCard(p, tones)); });
      }

      if (list) {
        var cat = 'All', q = '', sort = '';
        var count = el('<p class="count" role="status" aria-live="polite"></p>');
        list.parentNode.insertBefore(count, list);
        var render = function () {
          var rows = items.filter(function (p) {
            return (cat === 'All' || p.category === cat) &&
              (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().indexOf(q) > -1;
          });
          if (sort === 'lo') rows.sort(function (a, b) { return a.price - b.price; });
          if (sort === 'hi') rows.sort(function (a, b) { return b.price - a.price; });
          list.innerHTML = '';
          rows.forEach(function (p) { list.appendChild(productCard(p, tones)); });
          count.textContent = rows.length ? rows.length + ' piece' + (rows.length === 1 ? '' : 's') : 'No pieces match your search.';
        };
        $$('.chip').forEach(function (b) {
          b.addEventListener('click', function () {
            $$('.chip').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on'); cat = b.getAttribute('data-cat'); render();
          });
        });
        var qi = $('#q'); if (qi) qi.addEventListener('input', function () { q = qi.value.trim().toLowerCase(); render(); });
        var si = $('#sort'); if (si) si.addEventListener('change', function () { sort = si.value; render(); });
        render();
      }
    }).catch(function () {
      showNotice(feat, 'Products could not be loaded. Please refresh the page.');
      showNotice(list, 'Products could not be loaded. Please refresh the page.');
    });
  }

  function initCustomers() {
    var crew = $('#crew'), table = $('#custTable');
    if (!crew && !table) return;
    getJSON('data/customers.json', 'customers').then(function (data) {
      var rows = Array.isArray(data) ? data : (data.customers || []);

      if (crew) {
        rows.slice(0, 6).forEach(function (c) {
          var initials = c.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
          crew.appendChild(el(
            '<div class="card"><div style="overflow:hidden"><span class="av" aria-hidden="true">' + esc(initials) + '</span>' +
            '<h3 style="font-size:1.1rem">' + esc(shortName(c.name)) + '</h3><small>' + esc(c.city) + ' \u00B7 ' + esc(c.tier) + '</small></div>' +
            '<p style="margin-top:12px">Wearing: ' + esc(c.favorite) + '<br>' + esc(c.orders) + ' order' + (c.orders == 1 ? '' : 's') + ' since ' + esc(c.since) + '</p></div>'
          ));
        });
      }

      if (table) {
        table.innerHTML =
          '<caption style="text-align:left;font-weight:600;letter-spacing:.2em;text-transform:uppercase;font-size:.7rem;padding-bottom:6px">Our community (fictional sample data, details masked)</caption>' +
          '<thead><tr><th scope="col">Name</th><th scope="col">City</th><th scope="col">Orders</th><th scope="col">Tier</th></tr></thead><tbody>' +
          rows.map(function (c) {
            return '<tr><td>' + esc(shortName(c.name)) + '<br><small>' + esc(maskEmail(c.email)) + '</small></td><td>' + esc(c.city) + '</td><td>' + esc(c.orders) + '</td><td>' + esc(c.tier) + '</td></tr>';
          }).join('') + '</tbody>';
      }
    }).catch(function () {
      showNotice(crew, 'Customer data could not be loaded.');
      if (table) table.innerHTML = '<tr><td>Customer data could not be loaded.</td></tr>';
    });
  }

  /* ---------- Forms ---------- */
  function setErr(input, text) {
    var s = input.parentNode.querySelector('.err');
    if (s) s.textContent = text || '';
    if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function initContactForm() {
    var form = $('#cform');
    if (!form) return;
    var date = form.elements.date;
    if (date && !date.value) {
      var d = new Date();
      date.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    var sent = $('#sent');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, ok = true;
      var name = f.name.value.trim(), email = f.email.value.trim(), subject = f.subject.value.trim(), message = f.message.value.trim();
      setErr(f.name, name.length < 2 ? (ok = false, 'Please enter your name.') : '');
      setErr(f.email, !validEmail(email) ? (ok = false, 'Enter a valid email address.') : '');
      setErr(f.subject, subject.length < 3 ? (ok = false, 'Please add a subject.') : '');
      setErr(f.message, message.length < 10 ? (ok = false, 'Your message needs at least 10 characters.') : '');
      if (sent) sent.style.display = 'none';
      if (!ok) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
      try {
        var all = JSON.parse(localStorage.getItem('kozi-messages') || '[]');
        all.push({ name: name, email: email, subject: subject, message: message, date: f.date.value, sentAt: new Date().toISOString() });
        localStorage.setItem('kozi-messages', JSON.stringify(all));
      } catch (err) { /* storage unavailable: confirmation still shows */ }
      form.reset();
      if (date) date.value = new Date().toISOString().slice(0, 10);
      if (sent) { sent.style.display = 'block'; sent.setAttribute('role', 'status'); }
    });
    $$('input,textarea', form).forEach(function (i) {
      i.addEventListener('input', function () { if (i.getAttribute('aria-invalid')) setErr(i, ''); });
    });
  }

  function initNewsletter() {
    var form = $('#nform'), msg = $('#nmsg');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = form.elements.email.value.trim();
      if (!validEmail(v)) { msg.textContent = 'Enter a valid email address.'; return; }
      try {
        var l = JSON.parse(localStorage.getItem('kozi-list') || '[]');
        if (l.indexOf(v) < 0) l.push(v);
        localStorage.setItem('kozi-list', JSON.stringify(l));
      } catch (err) { /* ignore */ }
      form.reset();
      msg.textContent = 'You are on the list. Watch your inbox for Drop 01.';
    });
  }

  /* ---------- Page extras ---------- */
  function initCountdown() {
    var cd = $('#cd');
    if (!cd) return;
    var now = new Date();
    var end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    if (end < now) end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);
    var tick = function () {
      var s = Math.max(0, Math.floor((end - new Date()) / 1000));
      var v = [['Days', Math.floor(s / 86400)], ['Hours', Math.floor(s % 86400 / 3600)], ['Mins', Math.floor(s % 3600 / 60)], ['Secs', s % 60]];
      cd.innerHTML = v.map(function (x) { return '<div>' + String(x[1]).padStart(2, '0') + '<small>' + x[0] + '</small></div>'; }).join('');
    };
    tick(); setInterval(tick, 1000);
  }

  function initPromoCode() {
    var code = $('#code');
    if (!code) return;
    code.setAttribute('role', 'button'); code.setAttribute('tabindex', '0');
    var copy = function () {
      var t = code.textContent.trim();
      var done = function () { var o = code.textContent; code.textContent = 'Copied!'; setTimeout(function () { code.textContent = o; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { /* ignore */ });
      else done();
    };
    code.addEventListener('click', copy);
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
  }

  function initPhotos() {
    $$('figure[data-photo]').forEach(function (f) {
      f.classList.add('photo');
      var im = new Image();
      im.alt = f.getAttribute('data-alt') || 'KOZI model wearing chrome eyewear and streetwear';
      im.loading = 'lazy'; im.decoding = 'async';
      if (f.getAttribute('data-fit') === 'contain') im.style.objectFit = 'contain';
      im.src = f.getAttribute('data-photo');
      f.appendChild(im);
    });
  }

  function initReveal() {
    var rv = $$('.rv'), bars = $$('.bar i[data-w]');
    var fill = function (b) { b.style.width = b.getAttribute('data-w') + '%'; };
    if (!('IntersectionObserver' in window)) {
      rv.forEach(function (e) { e.classList.add('in'); }); bars.forEach(fill); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('.bar i[data-w]', en.target).forEach(fill);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    rv.forEach(function (e) { io.observe(e); });
    // bars that are not inside a .rv block
    bars.forEach(function (b) { if (!b.closest('.rv')) fill(b); });
  }

  buildLayout();
  initPhotos();
  initProducts();
  initCustomers();
  initContactForm();
  initNewsletter();
  initCountdown();
  initPromoCode();
  initReveal();
})();
