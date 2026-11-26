/* Rêve Lux — painel do lojista: login, listagem e cadastro/edição de produtos. */
(() => {
  const { products, auth, brl, esc, mode } = window.RL;
  const $ = id => document.getElementById(id);
  const cats = window.RL_CATEGORIES;
  const catName = slug => (cats.find(c => c.slug === slug) || {}).name || slug;

  /* ---------- Tema ---------- */
  const root = document.documentElement, dark = matchMedia('(prefers-color-scheme: dark)');
  const cur = () => root.dataset.theme || (dark.matches ? 'dark' : 'light');
  root.dataset.theme = cur();
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const n = cur() === 'dark' ? 'light' : 'dark'; root.dataset.theme = n;
    try { localStorage.setItem('rl-theme', n); } catch (e) {}
  });

  let tt; const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 2600); };

  /* ---------- Login ---------- */
  if (auth.demoCredentials) {
    $('login-hint').innerHTML = `Modo demonstração. Entre com <strong>${auth.demoCredentials.email}</strong> e a senha <strong>${auth.demoCredentials.password}</strong>.`;
    $('login-email').value = auth.demoCredentials.email;
  } else {
    $('login-hint').textContent = 'Use o e-mail e a senha da conta administradora criada no Supabase.';
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); $('login-error').textContent = '';
    try { await auth.signIn($('login-email').value.trim(), $('login-pass').value); showPanel(); }
    catch (err) { $('login-error').textContent = err.message || 'Não foi possível entrar.'; }
  });
  $('logout').addEventListener('click', async () => { await auth.signOut(); location.reload(); });

  const showPanel = () => { $('login-view').hidden = true; $('panel-view').hidden = false; load(); };

  /* ---------- Listagem ---------- */
  $('mode').textContent = mode === 'supabase' ? 'Conectado ao Supabase' : 'Modo demonstração · dados salvos neste navegador';
  $('mode').dataset.mode = mode;
  $('reset-demo').hidden = mode !== 'demo';
  $('filter-cat').innerHTML += cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
  $('f-category').innerHTML = cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');

  let all = [];
  const load = async () => {
    try { all = await products.list({ onlyActive: false }); render(); }
    catch (err) { console.error(err); $('rows').innerHTML = `<tr><td colspan="6" class="muted">Erro ao carregar: ${esc(err.message)}</td></tr>`; }
  };
  const render = () => {
    const q = products.slugify($('filter').value || ''), c = $('filter-cat').value;
    const list = all.filter(p => (!c || p.category === c) && (!q || products.slugify(p.name).includes(q)));
    $('stats').innerHTML = [
      ['Produtos', all.length],
      ['Visíveis na loja', all.filter(p => p.active !== false).length],
      ['Estoque baixo (≤ 5)', all.filter(p => (p.stock || 0) <= 5).length],
      ['Unidades em estoque', all.reduce((s, p) => s + (+p.stock || 0), 0)],
    ].map(([l, v]) => `<div class="stat"><span>${l}</span><strong>${v}</strong></div>`).join('');
    $('rows').innerHTML = list.length ? list.map(p => `
      <tr data-id="${esc(p.id)}">
        <td><div class="cell-prod">${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<div class="ph"></div>'}<div><strong>${esc(p.name)}</strong><small class="muted">${esc(p.id)}</small></div></div></td>
        <td>${esc(catName(p.category))}</td>
        <td class="num">${brl(p.price)}${p.compare_at_price ? `<small class="muted"><del>${brl(p.compare_at_price)}</del></small>` : ''}</td>
        <td class="num"><span class="pill ${(p.stock || 0) <= 0 ? 'pill--bad' : (p.stock <= 5 ? 'pill--warn' : '')}">${p.stock || 0}</span></td>
        <td><span class="pill ${p.active === false ? 'pill--off' : 'pill--ok'}">${p.active === false ? 'Oculto' : 'Visível'}</span></td>
        <td class="actions"><a class="link" href="produto.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Ver</a><button class="btn btn--ghost btn--sm" data-edit>Editar</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted">Nenhum produto encontrado.</td></tr>';
  };
  $('filter').addEventListener('input', render);
  $('filter-cat').addEventListener('change', render);
  $('rows').addEventListener('click', e => {
    if (!e.target.closest('[data-edit]')) return;
    openEditor(all.find(p => p.id === e.target.closest('tr').dataset.id));
  });
  $('reset-demo').addEventListener('click', () => { products.resetDemo(); load(); toast('Catálogo de exemplo restaurado.'); });

  /* ---------- Editor ---------- */
  const ed = $('editor');
  let editing = null, images = [], colors = [];
  const close = () => { ed.classList.remove('is-open'); ed.setAttribute('aria-hidden', 'true'); };
  ed.addEventListener('click', e => { if (e.target === ed || e.target.closest('.drawer__close')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  const renderImages = () => {
    $('f-images').innerHTML = images.length ? images.map((src, i) => `
      <figure class="img"><img src="${esc(src)}" alt="">
        ${i === 0 ? '<span class="img__cover">Capa</span>' : ''}
        <div class="img__tools">
          ${i > 0 ? `<button type="button" data-left="${i}" aria-label="Mover para a esquerda">‹</button>` : ''}
          <button type="button" data-del="${i}" aria-label="Remover foto">✕</button>
        </div></figure>`).join('') : '<p class="muted">Nenhuma foto ainda.</p>';
  };
  const renderColors = () => {
    $('f-colors').innerHTML = colors.map((c, i) => `
      <div class="color-row"><input type="color" value="${esc(c.hex)}" data-hex="${i}" aria-label="Cor ${i + 1}">
      <input value="${esc(c.name)}" data-name="${i}" placeholder="Nome da cor" aria-label="Nome da cor ${i + 1}">
      <button type="button" class="icon-btn" data-cdel="${i}" aria-label="Remover cor">✕</button></div>`).join('');
  };

  const openEditor = p => {
    editing = p || null;
    $('form-title').textContent = p ? 'Editar produto' : 'Novo produto';
    $('f-name').value = p?.name || '';
    $('f-category').value = p?.category || cats[0].slug;
    $('f-tag').value = p?.tag || '';
    $('f-price').value = p?.price ?? '';
    $('f-compare').value = p?.compare_at_price ?? '';
    $('f-stock').value = p?.stock ?? 0;
    $('f-sizes').value = (p?.sizes || []).join(', ');
    $('f-description').value = p?.description || '';
    $('f-details').value = (p?.details || []).join('\n');
    $('f-active').checked = p ? p.active !== false : true;
    $('f-new').checked = !!p?.is_new;
    $('f-best').checked = !!p?.is_bestseller;
    images = [...(p?.images || [])]; colors = (p?.colors || []).map(c => ({ ...c }));
    $('delete-btn').hidden = !p; $('confirm').hidden = true; $('form-error').textContent = '';
    renderImages(); renderColors();
    ed.classList.add('is-open'); ed.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('f-name').focus(), 50);
  };
  $('new-btn').addEventListener('click', () => openEditor(null));

  $('f-images').addEventListener('click', e => {
    const d = e.target.closest('[data-del]'), l = e.target.closest('[data-left]');
    if (d) images.splice(+d.dataset.del, 1);
    if (l) { const i = +l.dataset.left; [images[i - 1], images[i]] = [images[i], images[i - 1]]; }
    renderImages();
  });
  $('f-upload').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = '';
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) { toast(`${f.name} passa de 8 MB.`); continue; }
      try { toast('Enviando foto…'); images.push(await products.uploadImage(f)); renderImages(); }
      catch (err) { toast('Erro ao enviar: ' + err.message); }
    }
  });
  $('f-add-url').addEventListener('click', () => {
    const u = $('f-image-url').value.trim();
    if (!/^https?:\/\/|^assets\//.test(u)) return toast('Cole um link começando com https://');
    images.push(u); $('f-image-url').value = ''; renderImages();
  });
  $('f-add-color').addEventListener('click', () => { colors.push({ name: '', hex: '#e8d2c4' }); renderColors(); });
  $('f-colors').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.hex !== undefined) colors[+t.dataset.hex].hex = t.value;
    if (t.dataset.name !== undefined) colors[+t.dataset.name].name = t.value;
  });
  $('f-colors').addEventListener('click', e => { const b = e.target.closest('[data-cdel]'); if (b) { colors.splice(+b.dataset.cdel, 1); renderColors(); } });

  $('form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('f-name').value.trim(), price = parseFloat($('f-price').value);
    const compare = $('f-compare').value ? parseFloat($('f-compare').value) : null;
    const err = !name ? 'Informe o nome do produto.' : !(price > 0) ? 'Informe um preço maior que zero.'
      : compare !== null && compare <= price ? 'O preço "de" precisa ser maior que o preço atual.' : '';
    if (err) { $('form-error').textContent = err; return; }
    const row = {
      id: editing ? editing.id : products.slugify(name),
      name, category: $('f-category').value, tag: $('f-tag').value.trim() || null,
      price, compare_at_price: compare, stock: Math.max(0, parseInt($('f-stock').value || '0', 10)),
      sizes: $('f-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
      colors: colors.filter(c => c.name.trim()).map(c => ({ name: c.name.trim(), hex: c.hex })),
      images, description: $('f-description').value.trim(),
      details: $('f-details').value.split('\n').map(s => s.trim()).filter(Boolean),
      active: $('f-active').checked, is_new: $('f-new').checked, is_bestseller: $('f-best').checked,
    };
    if (!editing && all.some(p => p.id === row.id)) { $('form-error').textContent = 'Já existe um produto com esse nome.'; return; }
    if (editing) row._originalId = editing.id;
    $('save-btn').disabled = true;
    try { await products.save(row); close(); await load(); toast(editing ? 'Produto atualizado.' : 'Produto cadastrado.'); }
    catch (er) { $('form-error').textContent = 'Não foi possível salvar: ' + (er.message || er); }
    finally { $('save-btn').disabled = false; }
  });

  $('delete-btn').addEventListener('click', () => { $('confirm').hidden = false; $('delete-btn').hidden = true; });
  $('confirm-no').addEventListener('click', () => { $('confirm').hidden = true; $('delete-btn').hidden = false; });
  $('confirm-yes').addEventListener('click', async () => {
    try { await products.remove(editing.id); close(); await load(); toast('Produto excluído.'); }
    catch (er) { $('form-error').textContent = 'Não foi possível excluir: ' + er.message; }
  });

  /* ---------- Início ---------- */
  auth.isAdmin().then(ok => { if (ok) showPanel(); });
})();
