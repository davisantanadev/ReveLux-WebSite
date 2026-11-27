/* Rêve Lux — página da conta: entrar, criar conta, esqueci a senha e minha conta.
   Usa RL.account (store.js), RL_VALID (validacao.js) e RL_MEDIDAS (medidas.js).
   Todo dado vindo da conta é escrito com textContent ou passa por RL.esc(). */
(() => {
  const { account, esc, brl, toast, mode } = window.RL;
  const V = window.RL_VALID;
  const M = window.RL_MEDIDAS;
  const $ = id => document.getElementById(id);
  const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  /* ---------- Formulários: erros por campo e estado de envio ---------- */
  const fieldEl = (form, name) => form.querySelector(`[name="${name}"]`);
  const formMsg = form => form.querySelector('.form__msg');

  const clearErrors = form => {
    form.querySelectorAll('[aria-invalid="true"]').forEach(inp => {
      inp.removeAttribute('aria-invalid');
      const err = $(inp.id + '-err');
      if (err) { err.hidden = true; err.textContent = ''; }
      const ids = (inp.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== inp.id + '-err');
      if (ids.length) inp.setAttribute('aria-describedby', ids.join(' ')); else inp.removeAttribute('aria-describedby');
    });
    const m = formMsg(form); if (m) { m.hidden = true; m.textContent = ''; }
  };

  const showErrors = (form, errors) => {
    let first = null;
    Object.keys(errors).forEach(name => {
      const inp = fieldEl(form, name); if (!inp) return;
      const err = $(inp.id + '-err'); if (!err) return;
      err.textContent = errors[name]; err.hidden = false;
      inp.setAttribute('aria-invalid', 'true');
      const ids = (inp.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (!ids.includes(err.id)) ids.push(err.id);
      inp.setAttribute('aria-describedby', ids.join(' '));
      if (!first) first = inp;
    });
    if (first) first.focus();
  };

  const showFormError = (form, text) => {
    const m = formMsg(form); if (!m) return;
    m.textContent = text; m.hidden = false;
  };

  // desabilita o botão de envio com "Aguarde…" enquanto a ação roda
  const withBusy = async (form, fn) => {
    const btn = form.querySelector('[type="submit"]');
    if (btn.disabled) return;
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Aguarde…'; form.setAttribute('aria-busy', 'true');
    try { await fn(); }
    catch (e) { showFormError(form, (e && e.message) || 'Não foi possível concluir. Tente de novo.'); }
    finally { btn.disabled = false; btn.textContent = label; form.removeAttribute('aria-busy'); }
  };

  const values = form => {
    const o = {};
    form.querySelectorAll('[name]').forEach(el => { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return o;
  };

  /* ---------- Mostrar/ocultar senha ---------- */
  document.querySelectorAll('[data-toggle-pass]').forEach(btn => btn.addEventListener('click', () => {
    const inp = $(btn.dataset.togglePass);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Ocultar' : 'Mostrar';
    btn.setAttribute('aria-pressed', String(show));
  }));

  /* ---------- Abas (padrão WAI-ARIA: setas, Home e End) ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const selectTab = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const n = tabs.length;
      const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); selectTab(tabs[to], true);
    });
  });

  /* ---------- Visões ---------- */
  const guestMsg = $('guest-msg');
  const showGuest = (tabId, info) => {
    $('conta-loading').hidden = true;
    $('conta-user').hidden = true;
    $('conta-recovery').hidden = true;
    $('conta-guest').hidden = false;
    guestMsg.textContent = info || ''; guestMsg.hidden = !info;
    selectTab($(tabId || 'tab-entrar'));
  };

  /* ---------- Entrar ---------- */
  const fLogin = $('form-login');
  fLogin.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fLogin);
    const v = values(fLogin); const errs = {};
    if (!EMAIL_RE.test(v.email.trim())) errs.email = 'Informe um e-mail válido';
    if (!v.password) errs.password = 'Informe sua senha';
    if (Object.keys(errs).length) return showErrors(fLogin, errs);
    withBusy(fLogin, async () => {
      await account.signIn(v.email, v.password);
      fLogin.reset();
      await showUser();
      toast('Que bom te ver por aqui ♡');
    });
  });

  /* ---------- Criar conta ---------- */
  const fSignup = $('form-signup');
  fSignup.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fSignup);
    const r = V.signup(values(fSignup));
    if (!r.ok) return showErrors(fSignup, r.errors);
    withBusy(fSignup, async () => {
      const { needsConfirmation } = await account.signUp(r.value);
      if (needsConfirmation) {
        fSignup.reset(); fSignup.hidden = true;
        const done = $('signup-done'); done.hidden = false; done.focus();
        return;
      }
      await account.signIn(r.value.email, r.value.password);
      fSignup.reset();
      await showUser();
      toast('Conta criada. Boas-vindas ♡');
    });
  });

  /* ---------- Esqueci a senha ---------- */
  const fForgot = $('form-forgot');
  fForgot.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fForgot);
    const email = values(fForgot).email.trim();
    if (!EMAIL_RE.test(email)) return showErrors(fForgot, { email: 'Informe um e-mail válido' });
    withBusy(fForgot, async () => {
      await account.resetPassword(email);
      fForgot.reset(); fForgot.hidden = true;
      const done = $('forgot-done'); done.hidden = false; done.focus();
    });
  });

  /* ---------- Nova senha (chegou pelo link de recuperação do e-mail) ---------- */
  const fRecovery = $('form-recovery');
  const showRecovery = () => {
    $('conta-loading').hidden = true;
    $('conta-guest').hidden = true;
    $('conta-user').hidden = true;
    $('conta-recovery').hidden = false;
    $('h-recovery').focus();
  };
  fRecovery.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fRecovery);
    const v = values(fRecovery); const errs = {};
    const passErr = V.signup({ password: v.password }).errors; // mesma regra de senha do cadastro
    if (passErr && passErr.password) errs.password = passErr.password;
    if (!v.confirm) errs.confirm = 'Confirme a nova senha';
    else if (v.confirm !== v.password) errs.confirm = 'As senhas não são iguais';
    if (Object.keys(errs).length) return showErrors(fRecovery, errs);
    withBusy(fRecovery, async () => {
      await account.updatePassword(v.password);
      fRecovery.reset();
      await showUser('Senha alterada. Você já está conectada.');
    });
  });

  /* ---------- Minha conta ---------- */
  const fProfile = $('form-profile');
  const fMeasures = $('form-measures');
  const fAddr = $('form-address');
  const MEASURE_KEYS = ['busto', 'cintura', 'quadril', 'altura'];
  const fmtNum = n => String(n).replace('.', ',');

  const renderSize = m => {
    const el = $('size-hint');
    const top = m && M.recommendSize('superior', m);
    const bottom = m && M.recommendSize('inferior', m);
    const parts = [];
    if (top) parts.push('peças de cima ' + top.size);
    if (bottom) parts.push('calças ' + bottom.size);
    el.textContent = parts.length ? 'Seu tamanho: ' + parts.join(' · ') : 'Informe suas medidas para ver o tamanho indicado.';
  };

  const fillProfile = (user, p) => {
    const first = (p.full_name || '').trim().split(/\s+/)[0];
    $('hello').textContent = first ? 'Olá, ' + first : 'Olá';
    $('pf-email').value = user.email || '';
    $('pf-name').value = p.full_name || '';
    $('pf-phone').value = p.phone || '';
    $('pf-cpf').value = p.cpf || '';
    const m = p.measurements || {};
    MEASURE_KEYS.forEach(k => { $('ms-' + k).value = m[k] != null ? fmtNum(m[k]) : ''; });
    renderSize(p.measurements);
  };

  fProfile.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fProfile);
    const r = V.profile(values(fProfile));
    if (!r.ok) return showErrors(fProfile, r.errors);
    withBusy(fProfile, async () => {
      await account.updateProfile(r.value);
      $('pf-phone').value = r.value.phone || '';
      $('pf-cpf').value = r.value.cpf || '';
      const first = r.value.full_name.split(/\s+/)[0];
      $('hello').textContent = 'Olá, ' + first;
      toast('Dados salvos.');
    });
  });

  fMeasures.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fMeasures);
    const r = V.measures(values(fMeasures));
    if (!r.ok) return showErrors(fMeasures, r.errors);
    withBusy(fMeasures, async () => {
      await account.saveMeasures(r.value);
      MEASURE_KEYS.forEach(k => { $('ms-' + k).value = r.value[k] != null ? fmtNum(r.value[k]) : ''; });
      renderSize(r.value);
      toast('Medidas salvas.');
    });
  });

  /* ---------- Endereços ---------- */
  let addrs = [];
  const stateSel = $('ad-state');
  stateSel.insertAdjacentHTML('beforeend', V.UFS.map(uf => `<option value="${esc(uf)}">${esc(uf)}</option>`).join(''));
  const fmtCep = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 8 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
  const btnNew = $('btn-addr-new');

  const renderAddrs = () => {
    const ul = $('addr-list');
    if (!addrs.length) { ul.innerHTML = '<li class="muted addr__empty">Nenhum endereço cadastrado.</li>'; return; }
    ul.innerHTML = addrs.map(a => `
      <li class="addr" data-id="${esc(a.id)}">
        <div class="addr__text">
          <strong>${esc(a.label || 'Endereço')}</strong>
          <span>${esc(a.street)}, ${esc(a.number)}${a.complement ? ' · ' + esc(a.complement) : ''}</span>
          <span class="muted">${esc(a.district)} · ${esc(a.city)}/${esc(a.state)} · CEP ${esc(fmtCep(a.cep))}</span>
        </div>
        <div class="addr__btns">
          <button type="button" class="btn btn--ghost btn--sm" data-addr-edit aria-label="Editar endereço ${esc(a.label || '')}">Editar</button>
          <button type="button" class="btn btn--ghost btn--sm" data-addr-del aria-label="Remover endereço ${esc(a.label || '')}">Remover</button>
        </div>
        <div class="addr__confirm" hidden>
          <span>Remover este endereço?</span>
          <button type="button" class="btn btn--primary btn--sm" data-addr-yes>Sim, remover</button>
          <button type="button" class="btn btn--ghost btn--sm" data-addr-no>Cancelar</button>
        </div>
      </li>`).join('');
  };

  const loadAddrs = async () => {
    try { addrs = await account.addresses.list(); renderAddrs(); }
    catch (e) { $('addr-list').innerHTML = `<li class="form__msg">${esc(e.message)}</li>`; }
  };

  const openAddrForm = a => {
    clearErrors(fAddr); fAddr.reset();
    $('addr-form-title').textContent = a ? 'Editar endereço' : 'Novo endereço';
    fAddr.elements.id.value = a ? a.id : '';
    if (a) ['label', 'cep', 'street', 'number', 'complement', 'district', 'city', 'state'].forEach(k => {
      fAddr.elements[k].value = k === 'cep' ? fmtCep(a.cep) : (a[k] || '');
    });
    fAddr.hidden = false; btnNew.setAttribute('aria-expanded', 'true');
    $('ad-label').focus();
  };
  const closeAddrForm = () => {
    fAddr.hidden = true; btnNew.setAttribute('aria-expanded', 'false');
    clearErrors(fAddr); fAddr.reset(); btnNew.focus();
  };
  btnNew.addEventListener('click', () => (fAddr.hidden ? openAddrForm(null) : closeAddrForm()));
  $('btn-addr-cancel').addEventListener('click', closeAddrForm);
  fAddr.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeAddrForm(); } });

  fAddr.addEventListener('submit', e => {
    e.preventDefault(); clearErrors(fAddr);
    const v = values(fAddr);
    const r = V.address(v);
    if (!r.ok) return showErrors(fAddr, r.errors);
    withBusy(fAddr, async () => {
      await account.addresses.save(v.id ? { ...r.value, id: v.id } : r.value);
      await loadAddrs();
      closeAddrForm();
      toast(v.id ? 'Endereço atualizado.' : 'Endereço adicionado.');
    });
  });

  $('addr-list').addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const a = addrs.find(x => String(x.id) === li.dataset.id); if (!a) return;
    const confirmBox = li.querySelector('.addr__confirm');
    const btns = li.querySelector('.addr__btns');
    if (e.target.closest('[data-addr-edit]')) return openAddrForm(a);
    if (e.target.closest('[data-addr-del]')) { btns.hidden = true; confirmBox.hidden = false; confirmBox.querySelector('[data-addr-no]').focus(); return; }
    if (e.target.closest('[data-addr-no]')) { confirmBox.hidden = true; btns.hidden = false; li.querySelector('[data-addr-del]').focus(); return; }
    const yes = e.target.closest('[data-addr-yes]');
    if (yes) {
      yes.disabled = true; yes.textContent = 'Aguarde…';
      try { await account.addresses.remove(a.id); await loadAddrs(); toast('Endereço removido.'); btnNew.focus(); }
      catch (err) { toast(err.message); yes.disabled = false; yes.textContent = 'Sim, remover'; }
    }
  });
  $('addr-list').addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const box = li.querySelector('.addr__confirm'); if (box.hidden) return;
    box.hidden = true; li.querySelector('.addr__btns').hidden = false; li.querySelector('[data-addr-del]').focus();
  });

  /* ---------- Pedidos ---------- */
  const STATUS = { pending: 'Aguardando pagamento', paid: 'Pago', shipped: 'Enviado', delivered: 'Entregue', canceled: 'Cancelado', refunded: 'Reembolsado' };
  const fmtDate = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('pt-BR'); };
  const loadOrders = async () => {
    const box = $('orders');
    try {
      const list = await account.orders();
      if (!list.length) { box.innerHTML = '<p class="muted">Você ainda não fez pedidos.</p>'; return; }
      box.innerHTML = '<ul class="orders">' + list.map(o => `
        <li class="order">
          <div class="order__head">
            <strong>Pedido ${esc(String(o.id).slice(0, 8).toUpperCase())}</strong>
            <span class="muted">${esc(fmtDate(o.created_at))}</span>
            <span class="order__status">${esc(STATUS[o.status] || o.status)}</span>
            <strong>${brl(o.total)}</strong>
          </div>
          <ul class="order__items muted">${(o.order_items || []).map(i => `<li>${esc(i.qty)}× ${esc(i.name)}${[i.color, i.size && 'Tam. ' + i.size].filter(Boolean).map(x => ' · ' + esc(x)).join('')}</li>`).join('')}</ul>
          ${o.tracking_code ? `<p class="muted">Rastreio: ${esc(o.tracking_code)}</p>` : ''}
        </li>`).join('') + '</ul>';
    } catch (e) { box.innerHTML = `<p class="form__msg">${esc(e.message)}</p>`; }
  };

  /* ---------- Sair ---------- */
  $('btn-logout').addEventListener('click', async () => {
    const b = $('btn-logout'); b.disabled = true;
    try { await account.signOut(); } finally { b.disabled = false; }
    fAddr.hidden = true; btnNew.setAttribute('aria-expanded', 'false');
    showGuest('tab-entrar');
    $('tab-entrar').focus();
    toast('Você saiu da conta.');
  });

  async function showUser(notice) {
    const user = await account.current();
    if (!user) return showGuest('tab-entrar');
    let p;
    try { p = await account.getProfile(); }
    catch (e) { return showGuest('tab-entrar', e.message); }
    fillProfile(user, p);
    const um = $('user-msg'); um.textContent = notice || ''; um.hidden = !notice;
    $('conta-loading').hidden = true;
    $('conta-guest').hidden = true;
    $('conta-recovery').hidden = true;
    $('conta-user').hidden = false;
    loadAddrs(); loadOrders();
    $('hello').setAttribute('tabindex', '-1');
    if (location.hash === '#medidas') $('medidas').scrollIntoView();
    else $('hello').focus({ preventScroll: true });
  }

  /* ---------- Início ---------- */
  if (mode === 'demo') $('demo-note').hidden = false;
  const wantSignup = new URLSearchParams(location.search).get('tab') === 'cadastro';
  const recovery = typeof account.recoveryPending === 'function' && typeof account.updatePassword === 'function'
    ? account.recoveryPending().catch(() => false) : Promise.resolve(false);
  recovery
    .then(r => (r ? showRecovery() : account.current()
      .then(u => (u ? showUser() : showGuest(wantSignup ? 'tab-cadastro' : 'tab-entrar')))))
    .catch(() => showGuest('tab-entrar', 'Não foi possível verificar sua sessão. Tente de novo.'));
})();
