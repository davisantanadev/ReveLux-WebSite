/* Rêve Lux — layout compartilhado: cabeçalho, rodapé, tema, sacola, favoritos e card de produto. */
(() => {
const HEADER_HTML = `
<!-- 1. Barra de anúncios rotativa -->
<div class="announce" role="region" aria-label="Avisos">
  <div class="announce__track">
    <span>Frete grátis nas compras acima de R$ 299</span>
    <span>Parcele em até 6x sem juros</span>
    <span>5% off no Pix · primeira troca grátis</span>
  </div>
</div>

<!-- 2. Header -->
<header class="header" id="top">
  <div class="container header__row">
    <button class="icon-btn menu-toggle" aria-label="Abrir menu" data-open="drawer">
      <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
    </button>
    <a href="index.html" class="brand" aria-label="Rêve Lux — início">
      
      <span class="brand__name">Rêve Lux</span><svg class="brand__star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 4.6 2.6 7.6 8.5 9.5-5.9 1.9-8 4.9-8.5 9.5-.5-4.6-2.6-7.6-8.5-9.5 5.9-1.9 8-4.9 8.5-9.5z"/></svg>
    </a>
    <form class="search" role="search" action="catalogo.html">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="search" name="q" placeholder="O que você procura?" aria-label="Buscar produtos">
    </form>
    <div class="header__actions">
      <button class="icon-btn theme-toggle" aria-label="Alternar tema claro/escuro">
        <svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>
      </button>
      <a class="icon-btn hide-sm" href="#" aria-label="Minha conta"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></a>
      <a class="icon-btn hide-sm" href="catalogo.html?fav=1" aria-label="Favoritos"><span class="badge badge--fav" id="fav-count" hidden>0</span><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></a>
      <button class="icon-btn" aria-label="Sacola" data-open="cart">
        <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <span class="badge" id="cart-count">0</span>
      </button>
    </div>
  </div>
  <nav class="nav" aria-label="Categorias">
    <ul class="container">
      <li><a href="#novidades">Novidades</a></li>
      <li><a href="#cat-vestidos">Vestidos</a></li>
      <li><a href="#cat-conjuntos">Conjuntos</a></li>
      <li><a href="#cat-blusas">Blusas</a></li>
      <li><a href="#cat-saias">Saias &amp; Calças</a></li>
      <li><a href="#cat-acessorios">Acessórios</a></li>
      <li><a href="#mais-vendidos" class="nav__sale">Sale</a></li>
    </ul>
  </nav>
</header>

`;
const FOOTER_HTML = `
<!-- 13. Footer -->
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <a href="index.html" class="brand"><span class="brand__name">Rêve Lux</span><svg class="brand__star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 4.6 2.6 7.6 8.5 9.5-5.9 1.9-8 4.9-8.5 9.5-.5-4.6-2.6-7.6-8.5-9.5 5.9-1.9 8-4.9 8.5-9.5z"/></svg></a>
      <p class="muted">Moda feminina com delicadeza e brilho.</p>
      <div class="socials"><a href="https://www.instagram.com/reveluxmoda/" target="_blank" rel="noopener" aria-label="Instagram">IG</a><a href="#" aria-label="TikTok">TT</a><a href="#" aria-label="WhatsApp">WA</a></div>
    </div>
    <div><h4>Institucional</h4><ul><li><a href="#">Sobre nós</a></li><li><a href="#">Política de privacidade</a></li><li><a href="#">Termos de uso</a></li><li><a href="admin.html">Área do lojista</a></li></ul></div>
    <div><h4>Ajuda</h4><ul><li><a href="#">Trocas e devoluções</a></li><li><a href="#">Guia de medidas</a></li><li><a href="#">Prazos de entrega</a></li><li><a href="#">Rastrear pedido</a></li></ul></div>
    <div><h4>Atendimento</h4><ul><li>Seg a Sex · 9h às 18h</li><li>(00) 90000-0000</li><li>contato@revelux.com.br</li></ul></div>
    <div><h4>Pagamento</h4><div class="pay"><span>Pix</span><span>Visa</span><span>Master</span><span>Elo</span><span>Boleto</span></div></div>
  </div>
  <div class="container footer__bottom muted">© 2026 Rêve Lux · Protótipo estático ilustrativo · CNPJ 00.000.000/0001-00</div>
</footer>

<!-- Flutuantes -->
<a class="whats" href="#" aria-label="Fale conosco no WhatsApp">
  <svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/></svg>
</a>

<!-- Drawer menu mobile -->
<aside class="drawer" id="drawer" aria-hidden="true">
  <div class="drawer__panel drawer__panel--left">
    <button class="icon-btn drawer__close" aria-label="Fechar">✕</button>
    <span class="script">Rêve Lux</span>
    <ul class="drawer__nav"></ul>
  </div>
</aside>

<!-- Mini-sacola -->
<aside class="drawer" id="cart" aria-hidden="true">
  <div class="drawer__panel">
    <button class="icon-btn drawer__close" aria-label="Fechar">✕</button>
    <h3>Sua sacola</h3>
    <ul class="cart__list" id="cart-list"><li class="muted">Sua sacola está vazia.</li></ul>
    <div class="cart__foot"><div><span>Subtotal</span><strong id="cart-total">R$ 0,00</strong></div><button class="btn btn--primary btn--block" id="checkout-btn">Finalizar compra</button></div>
  </div>
</aside>
`;
  const { cart, favs, brl, esc, cfg, safeHex, safeImg } = window.RL;
  const root = document.documentElement;
  const isHome = !!document.querySelector('.hero');

  /* ---------- Injeta cabeçalho e rodapé ---------- */
  const mount = (id, html) => { const el = document.getElementById(id); if (el) el.outerHTML = html; };
  mount('site-header', HEADER_HTML);
  mount('site-footer', FOOTER_HTML);
  if (!isHome) { // âncoras da home viram links para a home
    document.querySelectorAll('.header a[href^="#"], .footer a[href^="#"]').forEach(a => {
      const h = a.getAttribute('href'); if (h.length > 1) a.setAttribute('href', 'index.html' + h);
    });
  }
  const q = new URLSearchParams(location.search).get('q');
  if (q) { const i = document.querySelector('.search input'); if (i) i.value = q; }
  document.querySelector('.drawer__nav').innerHTML = [...document.querySelectorAll('.nav a')]
    .map(a => `<li><a href="${a.getAttribute('href')}">${a.textContent}</a></li>`).join('')
    + '<li><a href="catalogo.html">Ver todos os produtos</a></li><li><a href="catalogo.html?fav=1">Favoritos</a></li>';

  /* ---------- Tema claro/escuro ---------- */
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (prefersDark.matches ? 'dark' : 'light');
  root.dataset.theme = current();
  const setTheme = (apply) => {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { document.startViewTransition(apply); return; }
    root.classList.add('theme-fade'); apply(); setTimeout(() => root.classList.remove('theme-fade'), 400);
  };
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    setTheme(() => { root.dataset.theme = next; });
    try { localStorage.setItem('rl-theme', next); } catch (e) {}
  });

  /* ---------- Drawers ---------- */
  const open = id => { const d = document.getElementById(id); d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false'); };
  const close = d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); };
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => open(b.dataset.open)));
  document.querySelectorAll('.drawer').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('.drawer__close') || e.target.closest('.drawer__nav a')) close(d); });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.drawer.is-open').forEach(close); });

  /* ---------- Toast ---------- */
  const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  let tt; const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('is-on'), 2600); };

  /* ---------- Sacola ---------- */
  const thumb = src => safeImg(src) ? `<img src="${esc(safeImg(src))}" alt="" loading="lazy">` : '<div class="ph"></div>';
  const renderCart = () => {
    const items = cart.items();
    document.getElementById('cart-count').textContent = cart.count();
    document.getElementById('cart-list').innerHTML = items.length ? items.map(i => `
      <li data-key="${esc(i.key)}">
        <a href="produto.html?id=${encodeURIComponent(i.id)}" class="cart__thumb">${thumb(i.image)}</a>
        <div class="cart__info">
          <a href="produto.html?id=${encodeURIComponent(i.id)}"><strong>${esc(i.name)}</strong></a>
          <span class="muted">${[i.color, i.size && 'Tam. ' + i.size].filter(Boolean).map(esc).join(' · ')}</span>
          <div class="cart__row">
            <div class="qty" aria-label="Quantidade">
              <button data-q="-1" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-q="1" aria-label="Aumentar">+</button>
            </div>
            <strong>${brl(i.price * i.qty)}</strong>
          </div>
          <button class="cart__remove" data-remove>Remover</button>
        </div>
      </li>`).join('') : '<li class="muted cart__empty">Sua sacola está vazia.</li>';
    const total = cart.total(), falta = cfg.freeShippingFrom - total;
    document.getElementById('cart-total').textContent = brl(total);
    let ship = document.getElementById('cart-ship');
    if (!ship) { ship = document.createElement('p'); ship.id = 'cart-ship'; ship.className = 'cart__ship'; document.querySelector('.cart__foot').prepend(ship); }
    ship.textContent = !items.length ? '' : falta > 0 ? `Faltam ${brl(falta)} para o frete grátis` : 'Você ganhou frete grátis ♡';
  };
  document.getElementById('cart-list').addEventListener('click', e => {
    const li = e.target.closest('li[data-key]'); if (!li) return;
    const it = cart.items().find(i => i.key === li.dataset.key); if (!it) return;
    if (e.target.closest('[data-q]')) cart.setQty(it.key, it.qty + Number(e.target.closest('[data-q]').dataset.q));
    if (e.target.closest('[data-remove]')) cart.remove(it.key);
  });
  document.getElementById('checkout-btn').addEventListener('click', () => {
    if (!cart.count()) return toast('Adicione um produto à sacola primeiro.');
    toast('Checkout em construção: aqui entra o pagamento (Mercado Pago / Stripe).');
  });
  document.addEventListener('rl:cart', renderCart);
  renderCart();

  /* ---------- Favoritos ---------- */
  const renderFavCount = () => {
    const n = favs.ids().length, b = document.getElementById('fav-count');
    if (b) { b.textContent = n; b.hidden = !n; }
    document.querySelectorAll('[data-fav]').forEach(btn => btn.setAttribute('aria-pressed', favs.has(btn.dataset.fav)));
  };
  document.addEventListener('rl:favs', renderFavCount);

  /* ---------- Card de produto (usado em todas as vitrines) ---------- */
  const card = (p, i = 0) => {
    const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
    const url = `produto.html?id=${encodeURIComponent(p.id)}`;
    const img = safeImg(p.images && p.images[0]);
    return `
    <article class="card reveal" style="transition-delay:${(i % 4) * 70}ms">
      <a href="${url}" class="card__media" aria-label="${esc(p.name)}">
        <div class="card__tags">${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}${off ? `<span class="tag tag--off">-${off}%</span>` : ''}</div>
        ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<div class="ph"><span>RL</span></div>'}
      </a>
      <button class="icon-btn card__fav" data-fav="${esc(p.id)}" aria-label="Favoritar ${esc(p.name)}" aria-pressed="${favs.has(p.id)}">
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
      </button>
      <a href="${url}" class="btn btn--primary card__add">Ver detalhes</a>
      <div class="card__body">
        <h3 class="card__name"><a href="${url}">${esc(p.name)}</a></h3>
        <div class="swatches">${(p.colors || []).map(c => `<i style="background:${safeHex(c.hex)}" title="${esc(c.name)}"></i>`).join('')}</div>
        <div class="price">${p.compare_at_price ? `<del>${brl(p.compare_at_price)}</del>` : ''}<strong>${brl(p.price)}</strong></div>
        <div class="inst">ou ${cfg.installments}x de ${brl(p.price / cfg.installments)} sem juros</div>
        <div class="pix">${brl(p.price * (1 - cfg.pixDiscount))} no Pix</div>
      </div>
    </article>`;
  };
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]'); if (!f) return;
    e.preventDefault();
    const on = favs.toggle(f.dataset.fav);
    toast(on ? 'Adicionado aos favoritos ♡' : 'Removido dos favoritos');
  });
  renderFavCount();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  const reveal = (scope = document) => scope.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
  reveal();

  Object.assign(window.RL, { card, toast, openDrawer: open, reveal, renderFavCount });
})();
