/* Rêve Lux — guia de medidas: tabela, "Descubra seu tamanho" e painel lateral.
   Produto: RL_GUIA.open({category, sizes, name, onPick}). Página: elemento [data-guia-page].
   Depende de RL (store.js), RL_MEDIDAS (medidas.js) e RL_VALID (validacao.js). */
(() => {
  'use strict';
  const M = window.RL_MEDIDAS, V = window.RL_VALID, RL = window.RL;
  if (!M || !V || !RL) return;
  const { esc } = RL;

  const LABEL = { busto: 'Busto', cintura: 'Cintura', quadril: 'Quadril' };
  const KIND_TITLE = { superior: 'Peças de cima e vestidos', inferior: 'Saias e calças' };
  const FIT = { justo: 'Pode ficar justo.', folgado: 'Pode ficar folgado.' };
  const EXAMPLE = { busto: '92', cintura: '74', quadril: '100' };

  /* ---------- Tabela ---------- */
  // opts: { current: tamanho a destacar, fields: colunas, caption }
  function table(kind, sizes, opts = {}) {
    const g = M.GUIDE[kind]; if (!g) return '';
    const fields = (opts.fields || g.fields).filter(f => g.fields.includes(f));
    let order = Object.keys(g.sizes);
    if (Array.isArray(sizes) && sizes.length) {
      const avail = sizes.map(String), only = order.filter(s => avail.includes(s));
      if (only.length) order = only;
    }
    const cur = opts.current != null ? String(opts.current) : '';
    return `<table class="guide-table">
      <caption>${esc(opts.caption || KIND_TITLE[kind])} <span>(medidas do corpo, em cm)</span></caption>
      <thead><tr><th scope="col">Tamanho</th>${fields.map(f => `<th scope="col">${esc(LABEL[f])}</th>`).join('')}</tr></thead>
      <tbody>${order.map(s => `<tr${s === cur ? ' aria-current="true"' : ''}><th scope="row">${esc(s)}</th>${
        fields.map(f => `<td>${esc(g.sizes[s][f][0] + '–' + g.sizes[s][f][1])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  }

  /* ---------- Figura "como medir" ---------- */
  const figure = () => `
    <figure class="guide-fig">
      <span class="guide-fig__img" role="img" aria-label="Silhueta com as linhas de busto, cintura e quadril"></span>
      <figcaption>
        <p class="guide-fig__title">Como medir</p>
        <dl>
          <div><dt>Busto</dt><dd>Passe a fita na parte mais cheia do busto, sem apertar.</dd></div>
          <div><dt>Cintura</dt><dd>Meça a parte mais fina do tronco, acima do umbigo.</dd></div>
          <div><dt>Quadril</dt><dd>Meça a parte mais larga do quadril, com os pés juntos.</dd></div>
        </dl>
      </figcaption>
    </figure>`;

  /* ---------- Formulário "Descubra seu tamanho" ---------- */
  const formHTML = (fields, p) => `
    <form class="guide-form" novalidate aria-labelledby="${p}-form-t">
      <h3 class="guide-form__title" id="${p}-form-t">Descubra seu tamanho</h3>
      <p class="guide-form__hint muted">Informe suas medidas em centímetros.</p>
      <div class="guide-form__fields">${fields.map(f => `
        <div class="field">
          <label for="${p}-${f}">${esc(LABEL[f])} (cm)</label>
          <input id="${p}-${f}" name="${f}" type="text" inputmode="decimal" autocomplete="off" placeholder="Ex.: ${EXAMPLE[f]}" aria-describedby="${p}-${f}-err">
          <span class="field__err" id="${p}-${f}-err"></span>
        </div>`).join('')}
      </div>
      <button class="btn btn--primary btn--block" type="submit">Ver meu tamanho</button>
      <div class="guide-result"></div>
      <p class="sr-only" data-guide-live aria-live="polite"></p>
    </form>`;

  // Sessão da cliente: { user, profile } — nunca lança.
  async function who() {
    if (!RL.account) return { user: null, profile: null };
    // visitante sem sessão guardada: nem baixa o supabase-js
    if (typeof RL.account.hasLocalSession === 'function' && !RL.account.hasLocalSession()) return { user: null, profile: null };
    try {
      const user = await RL.account.current();
      if (!user) return { user: null, profile: null };
      const profile = await RL.account.getProfile().catch(() => null);
      return { user, profile };
    } catch (e) { return { user: null, profile: null }; }
  }

  // ctx: { fields, kinds: [{kind, available?}], onPick?(size), onResult?(recs) }
  function bindForm(form, ctx) {
    const out = form.querySelector('.guide-result');
    // só este parágrafo é aria-live: o leitor anuncia o resultado, não os botões
    const live = form.querySelector('[data-guide-live]');
    const say = t => { live.textContent = t || ''; };
    let auth = { user: null, profile: null };
    let last = null; // { value, recs }

    const input = f => form.elements[f];
    const read = () => ctx.fields.reduce((o, f) => (o[f] = input(f).value, o), {});
    const showErrors = errs => ctx.fields.forEach(f => {
      const i = input(f), msg = errs[f] || '';
      form.querySelector(`#${i.id}-err`).textContent = msg;
      if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
    });

    function render(note = '') {
      if (!last) { out.innerHTML = ''; say(''); return; }
      let html, text;
      if (last.recs.length === 1) {
        const r = last.recs[0].rec;
        html = r
          ? `<p class="guide-result__size">Indicamos o tamanho <strong>${esc(r.size)}</strong></p>${FIT[r.fit] ? `<p class="guide-result__fit">${FIT[r.fit]}</p>` : ''}`
          : '<p class="guide-result__msg">Não conseguimos indicar um tamanho desta peça para essas medidas.</p>';
        text = r ? `Indicamos o tamanho ${r.size}.${FIT[r.fit] ? ' ' + FIT[r.fit] : ''}` : 'Não conseguimos indicar um tamanho desta peça para essas medidas.';
      } else {
        text = last.recs.map(k => `${KIND_TITLE[k.kind]}: ${k.rec ? `tamanho ${k.rec.size}.${FIT[k.rec.fit] ? ' ' + FIT[k.rec.fit] : ''}` : 'informe cintura ou quadril.'}`).join(' ');
        html = `<ul class="guide-result__list">${last.recs.map(k => `<li><span>${esc(KIND_TITLE[k.kind])}</span>${k.rec
          ? `<span>Indicamos o tamanho <strong>${esc(k.rec.size)}</strong>${FIT[k.rec.fit] ? ` · ${FIT[k.rec.fit]}` : ''}</span>`
          : '<span class="muted">Informe cintura ou quadril.</span>'}</li>`).join('')}</ul>`;
      }
      const r0 = last.recs.length === 1 && last.recs[0].rec;
      const acts = [];
      if (r0 && ctx.onPick) acts.push('<button type="button" class="btn btn--primary btn--block" data-act="pick">Usar este tamanho</button>');
      if (auth.user) acts.push('<button type="button" class="btn btn--ghost btn--block" data-act="save">Salvar minhas medidas</button>');
      else acts.push('<a class="link" href="conta.html">Entre para salvar suas medidas</a>');
      out.innerHTML = `${html}<div class="guide-result__acts">${acts.join('')}</div><p class="guide-result__status">${esc(note)}</p>`;
      say(note ? `${text} ${note}` : text);
    }

    function run(focusError) {
      const r = V.measures(read());
      if (!r.ok) {
        showErrors(r.errors); last = null; out.innerHTML = ''; say('');
        if (ctx.onResult) ctx.onResult([]);
        if (focusError) { const bad = ctx.fields.find(f => r.errors[f]); if (bad) input(bad).focus(); }
        return;
      }
      showErrors({});
      if (!Object.keys(r.value).length) {
        last = null; out.innerHTML = '<p class="guide-result__msg">Informe ao menos uma medida.</p>'; say('Informe ao menos uma medida.');
        if (ctx.onResult) ctx.onResult([]);
        return;
      }
      const recs = ctx.kinds.map(k => ({ kind: k.kind, rec: M.recommendSize(k.kind, r.value, k.available) }));
      last = { value: r.value, recs };
      render();
      if (ctx.onResult) ctx.onResult(recs);
    }

    form.addEventListener('submit', e => { e.preventDefault(); run(true); });

    out.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b || !last) return;
      if (b.dataset.act === 'pick') { const r = last.recs[0].rec; if (r && ctx.onPick) ctx.onPick(r.size); return; }
      if (b.dataset.act === 'save') {
        b.disabled = true;
        const st = out.querySelector('.guide-result__status');
        // mantém o que já estava salvo (ex.: altura) e troca só os campos deste formulário
        const m = { ...((auth.profile && auth.profile.measurements) || {}) };
        ctx.fields.forEach(f => { if (f in last.value) m[f] = last.value[f]; else delete m[f]; });
        try {
          await RL.account.saveMeasures(m);
          auth.profile = { ...(auth.profile || {}), measurements: m };
          st.textContent = 'Suas medidas foram salvas.'; say(st.textContent);
        } catch (err) {
          st.textContent = (err && err.message) || 'Não foi possível salvar agora. Tente de novo.'; say(st.textContent);
        }
        b.disabled = false;
      }
    });

    return {
      setAuth(a) {
        auth = a || { user: null, profile: null };
        const saved = auth.profile && auth.profile.measurements;
        let filled = false;
        if (saved) ctx.fields.forEach(f => {
          const v = saved[f];
          if (v != null && v !== '' && !input(f).value) { input(f).value = String(v).replace('.', ','); filled = true; }
        });
        if (filled) { run(false); if (last) render('Preenchemos com as medidas salvas na sua conta.'); }
        else render();
      }
    };
  }

  /* ---------- Painel lateral (página do produto) ---------- */
  let panel = null, dialog = null, opener = null, openSeq = 0;
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const isOpen = () => !!panel && panel.classList.contains('is-open');

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement('aside');
    panel.className = 'drawer guide-drawer';
    panel.id = 'guide';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="drawer__panel guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" tabindex="-1">
        <button type="button" class="icon-btn drawer__close" aria-label="Fechar guia de medidas">✕</button>
        <h2 class="guide__title" id="guide-title" tabindex="-1">Guia de medidas</h2>
        <div class="guide__body"></div>
      </div>`;
    document.body.appendChild(panel);
    dialog = panel.querySelector('.guide');
    panel.addEventListener('click', e => { if (e.target === panel || e.target.closest('.drawer__close')) close(); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', e => { if (isOpen() && !dialog.contains(e.target)) dialog.querySelector('#guide-title').focus(); });
  }

  function onKey(e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !items.includes(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !items.includes(at) && at !== dialog.querySelector('#guide-title') && at !== dialog)) { e.preventDefault(); first.focus(); }
  }

  function close() {
    if (!isOpen()) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    const back = opener; opener = null;
    if (back && back.isConnected) back.focus();
  }

  function open(opts = {}) {
    const kind = M.guideFor(opts.category, opts.sizes);
    if (!kind) return;
    ensurePanel();
    // Safari não foca links no clique: quem abriu passa o elemento em opts.opener
    if (!isOpen()) opener = opts.opener || document.activeElement;
    const seq = ++openSeq;
    const fields = M.fieldsFor(kind, opts.category);
    const sizes = Array.isArray(opts.sizes) ? opts.sizes : null;
    const tbl = current => table(kind, sizes, { fields, current, caption: 'Tamanhos desta peça' });
    const body = dialog.querySelector('.guide__body');
    body.innerHTML = `
      ${opts.name ? `<p class="guide__product muted">${esc(opts.name)}</p>` : ''}
      <div class="guide__table">${tbl()}</div>
      ${figure()}
      ${formHTML(fields, 'guide')}`;
    const ctrl = bindForm(body.querySelector('.guide-form'), {
      fields,
      kinds: [{ kind, available: sizes }],
      onPick: opts.onPick ? size => { opts.onPick(size); close(); } : null,
      onResult: recs => { body.querySelector('.guide__table').innerHTML = tbl(recs[0] && recs[0].rec && recs[0].rec.size); }
    });
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    dialog.scrollTop = 0;
    dialog.querySelector('#guide-title').focus();
    who().then(a => { if (seq === openSeq) ctrl.setAuth(a); });
  }

  /* ---------- Página medidas.html ---------- */
  function initPage(root) {
    const fields = ['busto', 'cintura', 'quadril'];
    root.innerHTML = `
      <div class="guide-page__tables">
        <div data-guia-table="superior">${table('superior')}</div>
        <div data-guia-table="inferior">${table('inferior')}</div>
      </div>
      <div class="guide-page__side">
        ${figure()}
        <div class="guide-page__form">${formHTML(fields, 'gp')}</div>
      </div>`;
    const ctrl = bindForm(root.querySelector('.guide-form'), {
      fields,
      kinds: [{ kind: 'superior' }, { kind: 'inferior' }],
      onResult: recs => ['superior', 'inferior'].forEach(kind => {
        const k = recs.find(x => x.kind === kind);
        root.querySelector(`[data-guia-table="${kind}"]`).innerHTML = table(kind, null, { current: k && k.rec && k.rec.size });
      })
    });
    who().then(a => ctrl.setAuth(a));
  }

  const page = document.querySelector('[data-guia-page]');
  if (page) initPage(page);

  window.RL_GUIA = { table, open, close };
})();
