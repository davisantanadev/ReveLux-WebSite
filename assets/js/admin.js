/* Rêve Lux — painel do lojista
   Proteção em camadas:
   1. O painel só aparece depois que o servidor confirma a sessão e o papel 'admin' (auth.getUser + profiles.role).
   2. Toda leitura e escrita passa pelas políticas RLS do banco: mesmo forçando o HTML, sem ser admin nada é gravado.
   3. Sessão encerrada após inatividade; bloqueio progressivo após senhas erradas.
   4. Entradas validadas aqui E no banco (constraints e trigger); saídas escapadas com esc(). */
(() => {
  const { products, admin, auth, brl, esc, mode, safeHex, safeImg, slugify, cfg } = window.RL;
  const $ = id => document.getElementById(id);
  const cats = window.RL_CATEGORIES;
  const catName = slug => (cats.find(c => c.slug === slug) || {}).name || slug;
  const fmtDate = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  /* ---------- Tema ---------- */
  const root = document.documentElement, dark = matchMedia('(prefers-color-scheme: dark)');
  const cur = () => root.dataset.theme || (dark.matches ? 'dark' : 'light');
  root.dataset.theme = cur();
  const setTheme = apply => {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { document.startViewTransition(apply); return; }
    root.classList.add('theme-fade'); apply(); setTimeout(() => root.classList.remove('theme-fade'), 400);
  };
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const n = cur() === 'dark' ? 'light' : 'dark'; setTheme(() => { root.dataset.theme = n; });
    try { localStorage.setItem('rl-theme', n); } catch (e) {}
  });

  let tt; const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 3000); };

  /* ---------- Login ---------- */
  if (auth.demoCredentials) {
    $('login-hint').textContent = `Modo demonstração. Entre com ${auth.demoCredentials.email} e a senha ${auth.demoCredentials.password}.`;
    $('login-email').value = auth.demoCredentials.email;
  } else {
    $('login-hint').textContent = 'Acesso restrito à administradora da loja.';
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); $('login-error').textContent = '';
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try { await auth.signIn($('login-email').value, $('login-pass').value); $('login-pass').value = ''; showPanel(); }
    catch (err) { $('login-error').textContent = err.message; }
    finally { btn.disabled = false; }
  });
  const logout = async msg => { await auth.signOut(); if (msg) sessionStorage.setItem('rl-logout-msg', msg); location.replace('admin.html'); };
  $('logout').addEventListener('click', () => logout());
  try { const m = sessionStorage.getItem('rl-logout-msg'); if (m) { $('login-error').textContent = m; sessionStorage.removeItem('rl-logout-msg'); } } catch (e) {}

  /* ---------- Sessão: expira por inatividade ---------- */
  let idleTimer;
  const resetIdle = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => logout('Sessão encerrada por inatividade.'), (cfg.adminIdleMinutes || 30) * 60000); };
  const watchIdle = () => { ['click', 'keydown', 'pointermove', 'scroll'].forEach(ev => addEventListener(ev, resetIdle, { passive: true })); resetIdle(); };

  const showPanel = async () => {
    if (!(await auth.isAdmin())) { await auth.signOut(); $('login-error').textContent = 'Acesso negado.'; return; }
    $('login-view').hidden = true; $('panel-view').hidden = false;
    watchIdle(); loadProducts();
  };

  /* ---------- Abas ---------- */
  const loaders = { produtos: () => loadProducts(), pedidos: () => loadOrders(), clientes: () => loadCustomers(), auditoria: () => loadAudit() };
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    document.querySelectorAll('.tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    loaders[b.dataset.tab]();
  });
  const demoOnly = el => { el.innerHTML = '<tr><td colspan="6" class="muted">Disponível quando o site está ligado ao Supabase.</td></tr>'; };
  const failRow = (el, err) => { el.innerHTML = `<tr><td colspan="6" class="muted">${esc(err.message)}</td></tr>`; };

  /* ---------- Produtos ---------- */
  $('mode').textContent = mode === 'supabase' ? 'Conectado ao Supabase' : 'Modo demonstração · dados salvos neste navegador';
  $('mode').dataset.mode = mode;
  $('reset-demo').hidden = mode !== 'demo';
  $('filter-cat').insertAdjacentHTML('beforeend', cats.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join(''));
  $('f-category').innerHTML = cats.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('');

  let all = [];
  const loadProducts = async () => {
    try { all = await products.list({ onlyActive: false }); renderProducts(); }
    catch (err) { failRow($('rows'), err); }
  };
  const renderProducts = () => {
    const q = slugify($('filter').value || ''), c = $('filter-cat').value;
    const list = all.filter(p => (!c || p.category === c) && (!q || slugify(p.name).includes(q)));
    $('stats').innerHTML = [
      ['Produtos', all.length],
      ['Visíveis na loja', all.filter(p => p.active !== false).length],
      ['Estoque baixo (≤ 5)', all.filter(p => (p.stock || 0) <= 5).length],
      ['Unidades em estoque', all.reduce((s, p) => s + (+p.stock || 0), 0)],
    ].map(([l, v]) => `<div class="stat"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('rows').innerHTML = list.length ? list.map(p => {
      const img = safeImg(p.images && p.images[0]);
      return `
      <tr data-id="${esc(p.id)}">
        <td><div class="cell-prod">${img ? `<img src="${esc(img)}" alt="">` : '<div class="ph"></div>'}<div><strong>${esc(p.name)}</strong><small class="muted">${esc(p.id)}</small></div></div></td>
        <td>${esc(catName(p.category))}</td>
        <td class="num">${brl(p.price)}${p.compare_at_price ? `<small class="muted"><del>${brl(p.compare_at_price)}</del></small>` : ''}</td>
        <td class="num"><span class="pill ${(p.stock || 0) <= 0 ? 'pill--bad' : (p.stock <= 5 ? 'pill--warn' : '')}">${esc(p.stock || 0)}</span></td>
        <td><span class="pill ${p.active === false ? 'pill--off' : 'pill--ok'}">${p.active === false ? 'Oculto' : 'Visível'}</span></td>
        <td class="actions"><a class="link" href="produto.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener noreferrer">Ver</a><button class="btn btn--ghost btn--sm" data-edit>Editar</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" class="muted">Nenhum produto encontrado.</td></tr>';
  };
  $('filter').addEventListener('input', renderProducts);
  $('filter-cat').addEventListener('change', renderProducts);
  $('rows').addEventListener('click', e => {
    if (!e.target.closest('[data-edit]')) return;
    openEditor(all.find(p => p.id === e.target.closest('tr').dataset.id));
  });
  $('reset-demo').addEventListener('click', () => { products.resetDemo(); loadProducts(); toast('Catálogo de exemplo restaurado.'); });

  /* ---------- Pedidos ---------- */
  const STATUS = { pending: 'Aguardando pagamento', paid: 'Pago', shipped: 'Enviado', delivered: 'Entregue', canceled: 'Cancelado', refunded: 'Reembolsado' };
  const loadOrders = async () => {
    const el = $('orders'); if (mode !== 'supabase') return demoOnly(el);
    try {
      const list = await admin.orders();
      el.innerHTML = list.length ? list.map(o => `
        <tr data-order="${esc(o.id)}">
          <td><strong>#${esc(o.id)}</strong></td>
          <td>${esc(fmtDate(o.created_at))}</td>
          <td>${(o.order_items || []).map(i => `${esc(i.qty)}× ${esc(i.name)}${i.size ? ' (' + esc(i.size) + ')' : ''}`).join('<br>')}</td>
          <td class="num">${brl(o.total)}</td>
          <td><select data-status aria-label="Status do pedido ${esc(o.id)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${o.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
          <td><input data-track value="${esc(o.tracking_code || '')}" placeholder="Código" maxlength="40" aria-label="Rastreio do pedido ${esc(o.id)}"></td>
        </tr>`).join('') : '<tr><td colspan="6" class="muted">Nenhum pedido ainda. Eles aparecem aqui quando o checkout estiver ativo.</td></tr>';
    } catch (err) { failRow(el, err); }
  };
  $('orders').addEventListener('change', async e => {
    const tr = e.target.closest('[data-order]'); if (!tr) return;
    const patch = e.target.matches('[data-status]') ? { status: e.target.value } : { tracking_code: e.target.value };
    try { await admin.updateOrder(+tr.dataset.order, patch); toast('Pedido atualizado.'); } catch (err) { toast(err.message); loadOrders(); }
  });

  /* ---------- Clientes ---------- */
  const loadCustomers = async () => {
    const el = $('customers'); if (mode !== 'supabase') return demoOnly(el);
    try {
      const list = await admin.customers();
      el.innerHTML = list.length ? list.map(c => `<tr><td>${esc(c.full_name || '—')}</td><td>${esc(c.phone || '—')}</td>
        <td><span class="pill ${c.role === 'admin' ? 'pill--warn' : ''}">${c.role === 'admin' ? 'Admin' : 'Cliente'}</span></td><td>${esc(fmtDate(c.created_at))}</td></tr>`).join('')
        : '<tr><td colspan="4" class="muted">Nenhuma cliente cadastrada ainda.</td></tr>';
    } catch (err) { failRow(el, err); }
  };

  /* ---------- Auditoria ---------- */
  const ACT = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu' };
  const loadAudit = async () => {
    const el = $('audit'); if (mode !== 'supabase') return demoOnly(el);
    try {
      const list = await admin.audit();
      el.innerHTML = list.map(a => `<tr><td>${esc(fmtDate(a.created_at))}</td><td>${esc(ACT[a.action] || a.action)}</td><td>${esc(a.table_name)}</td><td>${esc(a.record_id)}</td></tr>`).join('')
        || '<tr><td colspan="4" class="muted">Sem registros.</td></tr>';
    } catch (err) { failRow(el, err); }
  };

  /* ---------- Editor de produto ---------- */
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
      <div class="color-row"><input type="color" value="${safeHex(c.hex)}" data-hex="${i}" aria-label="Cor ${i + 1}">
      <input value="${esc(c.name)}" data-name="${i}" placeholder="Nome da cor" maxlength="40" aria-label="Nome da cor ${i + 1}">
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
    images = (p?.images || []).map(safeImg).filter(Boolean);
    colors = (p?.colors || []).map(c => ({ name: String(c.name || ''), hex: safeHex(c.hex) }));
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
    const files = [...e.target.files].slice(0, 10 - images.length); e.target.value = '';
    for (const f of files) {
      try { toast('Enviando foto…'); images.push(await products.uploadImage(f)); renderImages(); }
      catch (err) { toast(err.message); }
    }
  });
  $('f-add-url').addEventListener('click', () => {
    const u = safeImg($('f-image-url').value);
    if (!u || u.startsWith('data:')) return toast('Cole um link de imagem começando com https://');
    if (images.length >= 10) return toast('Máximo de 10 fotos por produto.');
    images.push(u); $('f-image-url').value = ''; renderImages();
  });
  $('f-add-color').addEventListener('click', () => { if (colors.length < 12) { colors.push({ name: '', hex: '#e8d2c4' }); renderColors(); } });
  $('f-colors').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.hex !== undefined) colors[+t.dataset.hex].hex = safeHex(t.value);
    if (t.dataset.name !== undefined) colors[+t.dataset.name].name = t.value.slice(0, 40);
  });
  $('f-colors').addEventListener('click', e => { const b = e.target.closest('[data-cdel]'); if (b) { colors.splice(+b.dataset.cdel, 1); renderColors(); } });

  const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
  $('form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = clean($('f-name').value, 120), price = Math.round(parseFloat($('f-price').value) * 100) / 100;
    const compare = $('f-compare').value ? Math.round(parseFloat($('f-compare').value) * 100) / 100 : null;
    const stock = parseInt($('f-stock').value || '0', 10);
    const err = name.length < 2 ? 'Informe o nome do produto (mínimo 2 letras).'
      : !(price > 0 && price < 100000) ? 'Informe um preço entre R$ 0,01 e R$ 99.999.'
      : compare !== null && !(compare > price) ? 'O preço "de" precisa ser maior que o preço atual.'
      : !(stock >= 0 && stock < 100000) ? 'Estoque inválido.'
      : !cats.some(c => c.slug === $('f-category').value) ? 'Categoria inválida.' : '';
    if (err) { $('form-error').textContent = err; return; }
    const row = {
      id: editing ? editing.id : slugify(name),
      name, category: $('f-category').value, tag: clean($('f-tag').value, 30) || null,
      price, compare_at_price: compare, stock,
      sizes: $('f-sizes').value.split(',').map(s => clean(s, 10)).filter(Boolean).slice(0, 15),
      colors: colors.map(c => ({ name: clean(c.name, 40), hex: safeHex(c.hex) })).filter(c => c.name).slice(0, 12),
      images: images.map(safeImg).filter(Boolean).slice(0, 10),
      description: clean($('f-description').value.replace(/[<>]/g, ''), 2000),
      details: $('f-details').value.split('\n').map(s => clean(s, 200)).filter(Boolean).slice(0, 20),
      active: $('f-active').checked, is_new: $('f-new').checked, is_bestseller: $('f-best').checked,
    };
    if (!row.id) { $('form-error').textContent = 'Use letras ou números no nome.'; return; }
    $('save-btn').disabled = true;
    try { await products.save(row, { isNew: !editing }); close(); await loadProducts(); toast(editing ? 'Produto atualizado.' : 'Produto cadastrado.'); }
    catch (er) { $('form-error').textContent = er.message; }
    finally { $('save-btn').disabled = false; }
  });

  $('delete-btn').addEventListener('click', () => { $('confirm').hidden = false; $('delete-btn').hidden = true; });
  $('confirm-no').addEventListener('click', () => { $('confirm').hidden = true; $('delete-btn').hidden = false; });
  $('confirm-yes').addEventListener('click', async () => {
    try { await products.remove(editing.id); close(); await loadProducts(); toast('Produto excluído.'); }
    catch (er) { $('form-error').textContent = er.message; }
  });

  /* ---------- Início: sessão válida no servidor? ---------- */
  auth.isAdmin().then(ok => { if (ok) showPanel(); }).catch(() => {});
})();
