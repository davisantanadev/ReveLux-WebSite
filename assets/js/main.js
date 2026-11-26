/* Rêve Lux — protótipo estático
   Renderiza vitrines com dados ilustrativos e controla tema, drawers e sacola (apenas visual). */
(() => {
  const root = document.documentElement;

  /* ---------- Tema claro/escuro ---------- */
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (prefersDark.matches ? 'dark' : 'light');
  root.dataset.theme = current();
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('rl-theme', next); } catch (e) {}
  });

  /* ---------- Dados ilustrativos ---------- */
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const products = {
    new: [
      { name: 'Vestido Aurora Midi', price: 289.9, tag: 'Novo', colors: ['#f1e4da', '#d9b8a8', '#2b2422'] },
      { name: 'Conjunto Pérola Linho', price: 349.9, old: 419.9, colors: ['#f6efe6', '#c9a493'] },
      { name: 'Blusa Seda Champagne', price: 179.9, tag: 'Novo', colors: ['#efe0cf', '#ffffff'] },
      { name: 'Saia Plissada Nude', price: 219.9, colors: ['#e8d2c4', '#b98a7b'] },
    ],
    best: [
      { name: 'Vestido Lumière Longo', price: 459.9, old: 529.9, colors: ['#f3e6df', '#2b2422'] },
      { name: 'Calça Alfaiataria Areia', price: 239.9, colors: ['#e9dccd', '#8a7d78'] },
      { name: 'Body Renda Marfim', price: 149.9, tag: 'Mais vendido', colors: ['#fbf6ef'] },
      { name: 'Kimono Cetim Rosé', price: 269.9, old: 299.9, colors: ['#ecd3c8', '#f6efe6'] },
    ],
  };
  const cats = [['Vestidos','vestidos'], ['Conjuntos','conjuntos'], ['Blusas','blusas'], ['Saias','saias'], ['Calças','calcas'], ['Acessórios','acessorios']];

  const card = (p, i) => {
    const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
    return `
    <article class="card reveal" style="transition-delay:${i * 70}ms">
      <a href="#" class="card__media" aria-label="${p.name}">
        <div class="card__tags">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}${off ? `<span class="tag tag--off">-${off}%</span>` : ''}</div>
        <div class="ph"><span>RL</span></div>
      </a>
      <button class="icon-btn card__fav" aria-label="Favoritar ${p.name}" aria-pressed="false">
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
      </button>
      <button class="btn btn--primary card__add" data-name="${p.name}" data-price="${p.price}">Adicionar</button>
      <div class="card__body">
        <h3 class="card__name"><a href="#">${p.name}</a></h3>
        <div class="swatches">${p.colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>
        <div class="price">${p.old ? `<del>${brl(p.old)}</del>` : ''}<strong>${brl(p.price)}</strong></div>
        <div class="inst">ou 6x de ${brl(p.price / 6)} sem juros</div>
        <div class="pix">${brl(p.price * 0.95)} no Pix</div>
      </div>
    </article>`;
  };

  document.querySelectorAll('[data-shelf]').forEach(el => {
    el.innerHTML = products[el.dataset.shelf].map(card).join('');
  });
  document.getElementById('cats').innerHTML = cats
    .map(([c, id]) => `<li id="cat-${id}"><a href="#cat-${id}"><div class="ph"></div>${c}</a></li>`).join('');
  document.getElementById('insta').innerHTML = Array.from({ length: 6 },
    () => `<a href="#" aria-label="Post do Instagram"><div class="ph"></div></a>`).join('');
  document.querySelector('.drawer__nav').innerHTML = [...document.querySelectorAll('.nav a')]
    .map(a => `<li><a href="${a.getAttribute('href')}">${a.textContent}</a></li>`).join('');

  /* ---------- Drawers ---------- */
  const open = id => { const d = document.getElementById(id); d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false'); };
  const close = d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); };
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => open(b.dataset.open)));
  document.querySelectorAll('.drawer').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('.drawer__close') || e.target.closest('.drawer__nav a')) close(d); });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.drawer.is-open').forEach(close); });

  /* ---------- Sacola (visual) ---------- */
  const cart = [];
  const renderCart = () => {
    document.getElementById('cart-count').textContent = cart.length;
    document.getElementById('cart-list').innerHTML = cart.length
      ? cart.map(p => `<li><div class="ph"></div><div><strong>${p.name}</strong><br><span class="muted">Tam. M · 1 un.</span><br>${brl(p.price)}</div></li>`).join('')
      : '<li class="muted">Sua sacola está vazia.</li>';
    document.getElementById('cart-total').textContent = brl(cart.reduce((s, p) => s + p.price, 0));
  };
  document.addEventListener('click', e => {
    const add = e.target.closest('.card__add');
    if (add) { cart.push({ name: add.dataset.name, price: +add.dataset.price }); renderCart(); open('cart'); }
    const fav = e.target.closest('.card__fav');
    if (fav) fav.setAttribute('aria-pressed', fav.getAttribute('aria-pressed') !== 'true');
  });

  /* ---------- Navegação por âncoras ---------- */
  const goTo = hash => {
    const el = hash && hash.length > 1 && document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: el.matches('.cats li') ? 'center' : 'start' });
    document.querySelectorAll('.cats li.is-target').forEach(li => li.classList.remove('is-target'));
    if (el.matches('.cats li')) { el.classList.add('is-target'); setTimeout(() => el.classList.remove('is-target'), 2200); }
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') { if (a) e.preventDefault(); return; }
    e.preventDefault(); goTo(a.getAttribute('href'));
    try { history.replaceState(null, '', a.getAttribute('href')); } catch (err) {}
  });
  // destaca o item do menu da seção visível
  const navLinks = [...document.querySelectorAll('.nav a')];
  const spy = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['novidades', 'mais-vendidos'].forEach(id => spy.observe(document.getElementById(id)));

  /* ---------- Carrossel do hero ---------- */
  const slides = [...document.querySelectorAll('.hero__slide')];
  const dots = [...document.querySelectorAll('.hero__dots button')];
  let idx = 0, timer;
  const show = n => {
    idx = (n + slides.length) % slides.length;
    slides.forEach((s, i) => { s.classList.toggle('is-active', i === idx); s.setAttribute('aria-hidden', i !== idx); s.inert = i !== idx; });
    dots.forEach((d, i) => d.setAttribute('aria-selected', i === idx));
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(idx + 1), 6000); };
  document.querySelector('.hero__arrow--prev').addEventListener('click', () => { show(idx - 1); play(); });
  document.querySelector('.hero__arrow--next').addEventListener('click', () => { show(idx + 1); play(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { show(i); play(); }));
  const hero = document.querySelector('.hero');
  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', play);
  let x0 = null;
  hero.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(idx + (dx < 0 ? 1 : -1)); play(); } x0 = null; });
  show(0); play();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
