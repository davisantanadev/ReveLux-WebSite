/* Rêve Lux — página inicial: vitrines, categorias, âncoras e carrossel do hero.
   Tema, cabeçalho, sacola e cards ficam em layout.js; dados em store.js. */
(async () => {
  const { products, card, reveal } = window.RL;

  /* ---------- Categorias (cada círculo abre o catálogo filtrado) ---------- */
  document.getElementById('cats').innerHTML = window.RL_CATEGORIES
    .map(c => `<li id="cat-${c.slug}"><a href="catalogo.html?cat=${c.slug}"><div class="ph"></div>${c.name}</a></li>`).join('');
  document.getElementById('insta').innerHTML = Array.from({ length: 6 },
    () => `<a href="https://www.instagram.com/reveluxmoda/" target="_blank" rel="noopener" aria-label="Post do Instagram"><div class="ph"></div></a>`).join('');

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

  /* ---------- Vitrines a partir do banco ---------- */
  try {
    const all = await products.list();
    const shelves = { new: all.filter(p => p.is_new), best: all.filter(p => p.is_bestseller) };
    document.querySelectorAll('[data-shelf]').forEach(el => {
      const list = (shelves[el.dataset.shelf] || []).slice(0, 4);
      el.innerHTML = list.length ? list.map(card).join('') : '<p class="muted">Nenhum produto por aqui ainda.</p>';
    });
    reveal();
  } catch (err) {
    console.error(err);
    document.querySelectorAll('[data-shelf]').forEach(el => { el.innerHTML = '<p class="muted">Não foi possível carregar os produtos.</p>'; });
  }
})();
