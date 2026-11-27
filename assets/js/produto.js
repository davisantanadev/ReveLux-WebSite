/* Rêve Lux — página de produto (produto.html?id=slug) */
(async () => {
  const { products, cart, favs, account, card, reveal, openDrawer, brl, esc, cfg, safeHex, safeImg } = window.RL;
  const { RL_MEDIDAS, RL_VALID, RL_GUIA } = window;
  const id = new URLSearchParams(location.search).get('id');
  const box = document.getElementById('pdp');
  const p = id ? await products.get(id).catch(() => null) : null;

  if (!p || p.active === false) {
    box.innerHTML = `<div class="empty"><p class="script">Ops…</p><p>Este produto não está mais disponível.</p><a class="btn btn--primary" href="catalogo.html">Ver produtos</a></div>`;
    document.getElementById('related').closest('section').remove();
    return;
  }

  const cat = window.RL_CATEGORIES.find(c => c.slug === p.category);
  document.title = `${p.name} · Rêve Lux`;
  document.getElementById('crumb-name').textContent = p.name;
  if (cat) { const a = document.getElementById('crumb-cat'); a.textContent = cat.name; a.href = `catalogo.html?cat=${cat.slug}`; }

  const imgs = (p.images || []).map(safeImg).filter(Boolean); if (!imgs.length) imgs.push(null);
  const colors = p.colors || [], sizes = p.sizes || [];
  const sel = { color: colors.length === 1 ? colors[0].name : '', size: sizes.length === 1 ? sizes[0] : '', qty: 1, img: 0 };
  const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
  // tipo de tabela de medidas (null = sem guia, ex.: acessórios)
  // só há guia se algum tamanho da peça existir na tabela (ex.: "Único" não existe)
  const kindFound = sizes.length && RL_MEDIDAS && RL_GUIA ? RL_MEDIDAS.guideFor(p.category, sizes) : null;
  const guideKind = kindFound && sizes.some(s => Object.prototype.hasOwnProperty.call(RL_MEDIDAS.GUIDE[kindFound].sizes, s)) ? kindFound : null;
  // tamanho único: mostra a faixa só se ela vier dos detalhes da peça, ex. "Tamanho único (veste do P ao G)"
  const oneSizeNote = !guideKind && sizes.length === 1 && /^único$/i.test(sizes[0])
    ? (p.details || []).map(d => /tamanho único\s*\(([^)]+)\)/i.exec(d)).find(Boolean) : null;
  const media = src => src ? `<img src="${esc(src)}" alt="${esc(p.name)}">` : '<div class="ph"><span>Rêve</span></div>';

  box.innerHTML = `
    <div class="pdp__gallery">
      <div class="pdp__main">${media(imgs[0])}
        <div class="card__tags">${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}${off ? `<span class="tag tag--off">-${off}%</span>` : ''}</div>
      </div>
      ${imgs.length > 1 ? `<div class="pdp__thumbs">${imgs.map((s, i) => `<button data-img="${i}" aria-label="Foto ${i + 1}" aria-pressed="${i === 0}">${media(s)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="pdp__info">
      <p class="eyebrow">${esc(cat ? cat.name : '')}</p>
      <h1 class="pdp__title">${esc(p.name)}</h1>
      <div class="pdp__price">${p.compare_at_price ? `<del>${brl(p.compare_at_price)}</del>` : ''}<strong>${brl(p.price)}</strong></div>
      <p class="inst">ou ${cfg.installments}x de ${brl(p.price / cfg.installments)} sem juros · <span class="pix">${brl(p.price * (1 - cfg.pixDiscount))} no Pix</span></p>

      ${colors.length ? `<fieldset class="opt"><legend>Cor: <strong id="sel-color">${esc(sel.color || 'escolha')}</strong></legend>
        <div class="opt__colors">${colors.map(c => `<button type="button" class="swatch" data-color="${esc(c.name)}" aria-pressed="${sel.color === c.name}" aria-label="${esc(c.name)}" style="--c:${safeHex(c.hex)}"></button>`).join('')}</div></fieldset>` : ''}

      ${sizes.length ? `<fieldset class="opt"><legend>Tamanho: <strong id="sel-size">${esc(sel.size || 'escolha')}</strong> <span class="fit-hint" id="fit-hint" hidden></span>${oneSizeNote ? ` <span class="size-note">Tamanho único · ${esc(oneSizeNote[1])}</span>` : ''}${guideKind ? ' <a href="medidas.html" class="link pdp__guide" aria-haspopup="dialog">Guia de medidas</a>' : ''}</legend>
        <div class="opt__sizes">${sizes.map(s => `<button type="button" class="size" data-size="${esc(s)}" aria-pressed="${sel.size === s}">${esc(s)}</button>`).join('')}</div></fieldset>` : ''}

      <div class="pdp__buy">
        <div class="qty qty--lg" aria-label="Quantidade"><button data-q="-1" aria-label="Diminuir">−</button><span id="qty">1</span><button data-q="1" aria-label="Aumentar">+</button></div>
        <button class="btn btn--primary pdp__add" id="add">Adicionar à sacola</button>
        <button class="icon-btn pdp__fav" data-fav="${esc(p.id)}" aria-pressed="${favs.has(p.id)}" aria-label="Favoritar">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
        </button>
      </div>
      <p class="pdp__msg" id="msg" role="alert"></p>
      <p class="muted pdp__stock">${p.stock > 0 ? (p.stock <= 5 ? `Restam só ${p.stock} unidades` : 'Em estoque') : 'Esgotado'}</p>

      <div class="pdp__desc"><p>${esc(p.description || '')}</p></div>
      <details class="acc" open><summary>Detalhes da peça</summary><ul>${(p.details || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul></details>
      <details class="acc"><summary>Entrega e trocas</summary><p>Frete grátis acima de ${brl(cfg.freeShippingFrom)}. Primeira troca grátis em até 30 dias após o recebimento.</p></details>
    </div>`;

  const $ = s => box.querySelector(s);
  if (p.stock <= 0) { $('#add').disabled = true; $('#add').textContent = 'Esgotado'; }

  const selectSize = s => {
    sel.size = s; $('#sel-size').textContent = s;
    box.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', b.dataset.size === s));
  };

  // "Seu tamanho: M" para a cliente logada com medidas salvas
  const fitHint = async () => {
    const el = $('#fit-hint'); if (!el || !guideKind || !account || !RL_VALID) return;
    let m = null;
    // sem sessão guardada: não consulta a conta (nem baixa o supabase-js)
    const logged = typeof account.hasLocalSession !== 'function' || account.hasLocalSession();
    try { if (logged && await account.current()) m = (await account.getProfile()).measurements; } catch (e) { m = null; }
    // mesmas medidas que o guia desta peça usa (saia: só cintura e quadril, sem busto)
    const fields = RL_MEDIDAS.fieldsFor(guideKind, p.category);
    const v = m ? RL_VALID.measures(fields.reduce((o, f) => (o[f] = m[f], o), {})) : null;
    const r = v && v.ok ? RL_MEDIDAS.recommendSize(guideKind, v.value, sizes) : null;
    el.textContent = r ? `Seu tamanho: ${r.size}` : '';
    el.hidden = !r;
  };
  fitHint();
  document.addEventListener('rl:account', fitHint);

  box.addEventListener('click', e => {
    const t = e.target.closest('button, a.pdp__guide'); if (!t) return;
    if (t.dataset.img !== undefined) {
      sel.img = +t.dataset.img; $('.pdp__main').firstElementChild.outerHTML = media(imgs[sel.img]);
      box.querySelectorAll('[data-img]').forEach(b => b.setAttribute('aria-pressed', b === t));
    }
    if (t.dataset.color) { sel.color = t.dataset.color; $('#sel-color').textContent = sel.color; box.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', b === t)); }
    if (t.dataset.size) selectSize(t.dataset.size);
    if (t.dataset.q) { sel.qty = Math.max(1, Math.min(p.stock || 99, sel.qty + +t.dataset.q)); $('#qty').textContent = sel.qty; }
    if (t.classList.contains('pdp__guide')) {
      e.preventDefault();
      RL_GUIA.open({ category: p.category, sizes, name: p.name, onPick: selectSize, opener: t });
    }
    if (t.id === 'add') {
      const miss = [colors.length && !sel.color && 'a cor', sizes.length && !sel.size && 'o tamanho'].filter(Boolean);
      if (miss.length) { $('#msg').textContent = `Escolha ${miss.join(' e ')} antes de adicionar.`; return; }
      $('#msg').textContent = '';
      cart.add({ id: p.id, name: p.name, price: p.price, image: imgs[0], color: sel.color, size: sel.size, qty: sel.qty });
      openDrawer('cart');
    }
  });

  // Relacionados: mesma categoria primeiro, depois o resto
  const all = await products.list().catch(() => []);
  const rel = all.filter(x => x.id !== p.id).sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 4);
  document.getElementById('related').innerHTML = rel.map(card).join('');
  reveal();
})();
