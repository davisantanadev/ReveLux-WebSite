/* Rêve Lux — catálogo: busca (?q=), categoria (?cat=), favoritos (?fav=1) e filtros da home (?filtro=). */
(async () => {
  const { products, favs, card, reveal, esc } = window.RL;
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    fav: params.get('fav') === '1',
    filtro: params.get('filtro') || '',
    sort: 'relevance',
  };
  const cats = window.RL_CATEGORIES;
  const $ = id => document.getElementById(id);

  const title = () => {
    if (state.fav) return ['Sua lista', 'Favoritos'];
    if (state.q) return ['Resultados da busca', `“${state.q}”`];
    if (state.filtro === 'novidades') return ['Acabou de chegar', 'Novidades'];
    if (state.filtro === 'mais-vendidos') return ['As favoritas', 'Mais vendidos'];
    const c = cats.find(c => c.slug === state.cat);
    return c ? ['Categoria', c.name] : ['Loja', 'Todos os produtos'];
  };

  const renderChips = () => {
    $('chips').innerHTML = [{ slug: '', name: 'Todos' }, ...cats].map(c =>
      `<button role="listitem" class="chip" aria-pressed="${!state.fav && !state.filtro && state.cat === c.slug}" data-cat="${c.slug}">${c.name}</button>`).join('');
  };

  let all = [];
  const render = () => {
    let list = all.slice();
    if (state.fav) { const ids = favs.ids(); list = list.filter(p => ids.includes(p.id)); }
    if (state.filtro === 'novidades') list = list.filter(p => p.is_new);
    if (state.filtro === 'mais-vendidos') list = list.filter(p => p.is_bestseller);
    if (state.cat) list = list.filter(p => p.category === state.cat);
    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const [eb, h] = title();
    $('cat-eyebrow').textContent = eb; $('cat-title').textContent = h; $('crumb').textContent = h;
    document.title = `${h} · Rêve Lux`;
    $('cat-count').textContent = `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
    $('results').innerHTML = list.length ? list.map(card).join('') : `
      <div class="empty">
        <p class="script">Ops…</p>
        <p>${state.fav ? 'Você ainda não favoritou nenhuma peça. Toque no coração dos produtos para salvar aqui.' : `Não encontramos produtos${state.q ? ` para “${esc(state.q)}”` : ''}. Tente outra palavra ou veja todas as peças.`}</p>
        <a class="btn btn--primary" href="catalogo.html">Ver todos os produtos</a>
      </div>`;
    renderChips(); reveal();
  };

  $('chips').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    Object.assign(state, { cat: b.dataset.cat, fav: false, filtro: '' });
    const u = new URL(location.href); u.search = state.q ? `?q=${encodeURIComponent(state.q)}` : '';
    if (state.cat) u.searchParams.set('cat', state.cat);
    try { history.replaceState(null, '', u); } catch (err) {}
    render();
  });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  document.addEventListener('rl:favs', () => { if (state.fav) render(); });

  try { all = await products.list({ q: state.q }); render(); }
  catch (err) { console.error(err); $('results').innerHTML = '<p class="muted">Não foi possível carregar os produtos.</p>'; }
})();
