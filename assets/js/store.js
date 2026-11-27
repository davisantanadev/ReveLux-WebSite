/* Rêve Lux — camada de dados
   Um único ponto de acesso a produtos, pedidos, clientes, sacola, favoritos e login.
   - Com RL_CONFIG.supabaseUrl/anonKey → Supabase (Postgres + Auth + Storage), protegido por RLS.
   - Sem configuração → modo demonstração em localStorage.
   Segurança no cliente (o servidor valida de novo, pois o navegador não é confiável):
   - toda saída para HTML passa por esc(); cores e URLs passam por safeHex()/safeImg()
   - consultas usam o client do Supabase (parametrizado); a busca remove curingas e limita tamanho
   - upload aceita só imagens de até 5 MB, com nome aleatório */
(() => {
  const cfg = window.RL_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const SUPABASE_JS = 'assets/vendor/supabase-2.45.4.min.js'; // servido pelo próprio site (CSP script-src 'self')

  /* ---------- utilitários de segurança ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"'`=/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[c]));
  const safeHex = h => (/^#[0-9a-f]{6}$/i.test(String(h || '')) ? h : '#d9cfc8');
  const safeImg = u => {
    const s = String(u || '').trim();
    if (/^assets\/[\w\-./]+$/.test(s) && !s.includes('..')) return s;
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) return s; // só no modo demo
    try { const x = new URL(s); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
  };
  const cleanQuery = q => String(q || '').normalize('NFC').replace(/[%_\\,()*:;'"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const ls = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- Supabase client (carregado sob demanda) ---------- */
  let clientP = null;
  // cliente chegou pelo link de recuperação de senha (o Supabase limpa o hash da URL, então lemos já ao carregar)
  // o flag também vai para o sessionStorage: recarregar a página no meio da troca de senha não perde o formulário
  const RECOVERY_KEY = 'rl-recovery';
  const recoveryFlag = {
    get() { try { return sessionStorage.getItem(RECOVERY_KEY) === '1'; } catch (e) { return false; } },
    set() { try { sessionStorage.setItem(RECOVERY_KEY, '1'); } catch (e) {} },
    clear() { try { sessionStorage.removeItem(RECOVERY_KEY); } catch (e) {} },
  };
  let recovery = useSupabase && /[#&]type=recovery(&|$)/.test(location.hash || '');
  if (recovery) recoveryFlag.set();
  const client = () => {
    if (!useSupabase) return Promise.resolve(null);
    if (!clientP) clientP = new Promise((res, rej) => {
      const done = () => {
        const c = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, storageKey: 'rl-auth' },
        });
        c.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; recoveryFlag.set(); } });
        res(c);
      };
      if (window.supabase) return done();
      const s = document.createElement('script'); s.src = SUPABASE_JS; s.onload = done; s.onerror = rej;
      document.head.appendChild(s);
    });
    return clientP;
  };
  // mensagens genéricas: não vazar detalhes internos do banco para a tela
  const friendly = err => {
    console.error(err);
    const m = String(err?.message || '');
    if (/JWT|session|auth/i.test(m)) return new Error('Sua sessão expirou. Entre novamente.');
    if (/permission|policy|42501/i.test(m)) return new Error('Você não tem permissão para esta ação.');
    if (/duplicate|23505/i.test(m)) return new Error('Já existe um registro com esse identificador.');
    if (/inválid|22023|check constraint|23514/i.test(m)) return new Error('Algum campo tem um valor inválido.');
    return new Error('Não foi possível concluir. Tente de novo.');
  };

  /* ---------- Produtos ---------- */
  const DEMO_KEY = 'rl-products-v1';
  const demoProducts = () => {
    let p = ls.get(DEMO_KEY, null);
    if (!Array.isArray(p)) { p = JSON.parse(JSON.stringify(window.RL_SEED || [])); ls.set(DEMO_KEY, p); }
    return p;
  };
  const filterLocal = (rows, { q, category, onlyActive, ids }) => {
    if (onlyActive) rows = rows.filter(p => p.active !== false);
    if (category) rows = rows.filter(p => p.category === category);
    if (ids) rows = rows.filter(p => ids.includes(p.id));
    if (q) { const n = slugify(q); rows = rows.filter(p => slugify(p.name + ' ' + p.category + ' ' + (p.description || '')).includes(n)); }
    return rows;
  };
  const COLS = 'id,name,category,description,details,price,compare_at_price,tag,colors,sizes,images,stock,active,is_new,is_bestseller,created_at';

  const products = {
    async list({ q = '', category = '', onlyActive = true, ids = null } = {}) {
      q = cleanQuery(q);
      const sb = await client().catch(() => null);
      if (sb) {
        let query = sb.from('products').select(COLS).order('created_at', { ascending: false }).limit(500);
        if (onlyActive) query = query.eq('active', true);
        if (category) query = query.eq('category', category);
        if (ids) query = query.in('id', ids.slice(0, 100));
        if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
        const { data, error } = await query;
        if (!error) return data;
        if (onlyActive) { console.warn('Banco indisponível, usando catálogo local.', error); }
        else throw friendly(error);
      }
      return filterLocal(useSupabase ? (window.RL_SEED || []) : demoProducts(), { q, category, onlyActive, ids });
    },
    async get(id) {
      id = slugify(id);
      const sb = await client().catch(() => null);
      if (sb) {
        const { data, error } = await sb.from('products').select(COLS).eq('id', id).maybeSingle();
        if (!error) return data;
        console.warn('Banco indisponível, usando catálogo local.', error);
      }
      return (useSupabase ? (window.RL_SEED || []) : demoProducts()).find(p => p.id === id) || null;
    },
    async save(p, { isNew }) {
      const row = { ...p }; delete row._originalId; delete row.created_at;
      row.id = slugify(row.id || row.name);
      const sb = await client();
      if (sb) {
        const q = isNew ? sb.from('products').insert(row) : sb.from('products').update(row).eq('id', row.id);
        const { data, error } = await q.select(COLS).single();
        if (error) throw friendly(error); return data;
      }
      const all = demoProducts(); const i = all.findIndex(x => x.id === row.id);
      if (isNew && i >= 0) throw new Error('Já existe um produto com esse nome.');
      if (i >= 0) all[i] = row; else all.unshift(row);
      ls.set(DEMO_KEY, all); return row;
    },
    async remove(id) {
      const sb = await client();
      if (sb) { const { error } = await sb.from('products').delete().eq('id', id); if (error) throw friendly(error); return; }
      ls.set(DEMO_KEY, demoProducts().filter(p => p.id !== id));
    },
    async uploadImage(file) {
      const okTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
      if (!okTypes[file.type]) throw new Error('Envie só imagens JPG, PNG, WEBP ou AVIF.');
      if (file.size > 5 * 1024 * 1024) throw new Error('A imagem passa de 5 MB.');
      const sb = await client();
      if (sb) {
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
        const path = `produtos/${rand}.${okTypes[file.type]}`;
        const { error } = await sb.storage.from(cfg.storageBucket).upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });
        if (error) throw friendly(error);
        return sb.storage.from(cfg.storageBucket).getPublicUrl(path).data.publicUrl;
      }
      return await new Promise((res, rej) => { // demo: data URL reduzida
        const img = new Image(); const r = new FileReader();
        r.onload = () => { img.src = r.result; }; r.onerror = rej;
        img.onload = () => {
          const k = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .8));
        };
        r.readAsDataURL(file);
      });
    },
    resetDemo() { try { localStorage.removeItem(DEMO_KEY); } catch (e) {} },
  };

  /* ---------- Admin: pedidos, clientes, auditoria (só Supabase; RLS exige admin) ---------- */
  const admin = {
    async orders() {
      const sb = await client(); if (!sb) return [];
      const { data, error } = await sb.from('orders').select('id,status,total,payment_method,tracking_code,created_at,user_id,order_items(name,qty,size,color)').order('created_at', { ascending: false }).limit(200);
      if (error) throw friendly(error); return data;
    },
    async updateOrder(id, patch) {
      const allowed = ['pending', 'paid', 'shipped', 'delivered', 'canceled', 'refunded'];
      const row = {};
      if (patch.status !== undefined) { if (!allowed.includes(patch.status)) throw new Error('Status inválido.'); row.status = patch.status; }
      if (patch.tracking_code !== undefined) row.tracking_code = String(patch.tracking_code).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || null;
      const sb = await client(); const { error } = await sb.from('orders').update(row).eq('id', id);
      if (error) throw friendly(error);
    },
    async customers() {
      const sb = await client(); if (!sb) return [];
      const { data, error } = await sb.from('profiles').select('id,full_name,phone,role,created_at').order('created_at', { ascending: false }).limit(500);
      if (error) throw friendly(error); return data;
    },
    async audit() {
      const sb = await client(); if (!sb) return [];
      const { data, error } = await sb.from('audit_log').select('id,action,table_name,record_id,created_at').order('created_at', { ascending: false }).limit(100);
      if (error) throw friendly(error); return data;
    },
  };

  /* ---------- Sacola ---------- */
  const CART_KEY = 'rl-cart-v1';
  const validItem = i => i && typeof i.id === 'string' && Number.isFinite(i.price) && Number.isInteger(i.qty) && i.qty > 0 && i.qty < 100;
  const cart = {
    items() { const a = ls.get(CART_KEY, []); return Array.isArray(a) ? a.filter(validItem) : []; },
    count() { return cart.items().reduce((s, i) => s + i.qty, 0); },
    total() { return cart.items().reduce((s, i) => s + i.qty * i.price, 0); },
    add(item) {
      const all = cart.items(); const key = `${item.id}|${item.color || ''}|${item.size || ''}`;
      const ex = all.find(i => i.key === key);
      if (ex) ex.qty = Math.min(99, ex.qty + (item.qty || 1)); else all.push({ ...item, key, qty: Math.min(99, item.qty || 1) });
      ls.set(CART_KEY, all); emit('rl:cart');
    },
    setQty(key, qty) {
      let all = cart.items(); const it = all.find(i => i.key === key); if (!it) return;
      it.qty = Math.max(0, Math.min(99, qty)); all = all.filter(i => i.qty > 0); ls.set(CART_KEY, all); emit('rl:cart');
    },
    remove(key) { ls.set(CART_KEY, cart.items().filter(i => i.key !== key)); emit('rl:cart'); },
    clear() { ls.set(CART_KEY, []); emit('rl:cart'); },
  };

  /* ---------- Favoritos ---------- */
  const FAV_KEY = 'rl-favs-v1';
  const favs = {
    ids() { const a = ls.get(FAV_KEY, []); return Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 200) : []; },
    has(id) { return favs.ids().includes(id); },
    toggle(id) { const s = new Set(favs.ids()); s.has(id) ? s.delete(id) : s.add(id); ls.set(FAV_KEY, [...s]); emit('rl:favs'); return s.has(id); },
  };

  /* ---------- Login do painel ---------- */
  const DEMO_ADMIN = { email: 'admin@revelux.com', password: 'revelux123' };
  const LOCK_KEY = 'rl-login-lock';
  const lockState = () => ls.get(LOCK_KEY, { fails: 0, until: 0 });
  const auth = {
    lockedFor() { const s = lockState(); return Math.max(0, Math.ceil((s.until - Date.now()) / 1000)); },
    async signIn(email, password) {
      const wait = auth.lockedFor();
      if (wait) throw new Error(`Muitas tentativas. Aguarde ${wait}s.`);
      email = String(email || '').trim().toLowerCase().slice(0, 254);
      const fail = () => { // bloqueio progressivo no navegador (o Supabase também limita no servidor)
        const s = lockState(); s.fails += 1;
        if (s.fails >= 5) { s.until = Date.now() + Math.min(15 * 60, 30 * 2 ** (s.fails - 5)) * 1000; }
        ls.set(LOCK_KEY, s); throw new Error('E-mail ou senha incorretos.');
      };
      const sb = await client();
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) fail();
        const { data: prof } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
        if (!prof || prof.role !== 'admin') { await sb.auth.signOut(); fail(); }
        ls.set(LOCK_KEY, { fails: 0, until: 0 }); return data.user;
      }
      if (email !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) fail();
      try { sessionStorage.setItem('rl-admin', '1'); } catch (e) {}
      ls.set(LOCK_KEY, { fails: 0, until: 0 }); return { email };
    },
    async isAdmin() {
      const sb = await client().catch(() => null);
      if (sb) {
        const { data } = await sb.auth.getUser(); // valida o token no servidor (não confia só no localStorage)
        if (!data?.user) return false;
        const { data: prof } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
        return prof?.role === 'admin';
      }
      try { return sessionStorage.getItem('rl-admin') === '1'; } catch (e) { return false; }
    },
    async signOut() {
      const sb = await client().catch(() => null); if (sb) await sb.auth.signOut();
      try { sessionStorage.removeItem('rl-admin'); } catch (e) {}
    },
    demoCredentials: useSupabase ? null : DEMO_ADMIN,
  };

  /* ---------- Conta da cliente ---------- */
  const DEMO_ACC_KEY = 'rl-demo-accounts';
  const DEMO_SESSION_KEY = 'rl-demo-session';
  const CUST_LOCK_KEY = 'rl-cust-lock';
  const custLock = () => ls.get(CUST_LOCK_KEY, { fails: 0, until: 0 });
  const normEmail = e => String(e || '').trim().toLowerCase().slice(0, 254);
  // SHA-256 só para não guardar a senha em texto puro no demo. Em contexto não seguro (ex.: IP da rede local)
  // crypto.subtle não existe: cai num hash simples NÃO criptográfico, aceitável apenas na demonstração.
  const sha256 = async s => {
    s = String(s);
    if (window.crypto?.subtle) return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let k = 0; k < s.length; k++) { const c = s.charCodeAt(k); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'weak-' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  };
  const demoAccounts = () => { const a = ls.get(DEMO_ACC_KEY, {}); return a && typeof a === 'object' && !Array.isArray(a) ? a : {}; };
  const demoMe = () => { // conta logada no demo (ou erro de sessão)
    const all = demoAccounts(); const email = ls.get(DEMO_SESSION_KEY, null);
    if (!email || !all[email]) throw new Error('Sua sessão expirou. Entre novamente.');
    return { all, acc: all[email] };
  };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''));
  const ADDR_COLS = 'id,label,cep,street,number,complement,district,city,state,created_at';
  const ADDR_FIELDS = ['label', 'cep', 'street', 'number', 'complement', 'district', 'city', 'state'];
  const pickAddr = a => { const r = {}; ADDR_FIELDS.forEach(k => { if (a[k] !== undefined) r[k] = a[k]; }); return r; };
  // usuário logado no Supabase (valida o token no servidor); erro se não houver sessão
  const sbUser = async sb => {
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) throw new Error('Sua sessão expirou. Entre novamente.');
    return data.user;
  };
  const PROFILE_COLS = 'full_name,phone,cpf,measurements';
  const PRIVACY_VERSION = '2026-11-27'; // versão da política de privacidade aceita no cadastro

  const account = {
    async signUp({ name, email, password, phone, consent }) {
      if (consent !== true) throw new Error('Aceite a política de privacidade.');
      email = normEmail(email);
      // registro do aceite (LGPD art. 8 §2): quando e qual versão da política
      const privacy = { privacy_accepted_at: new Date().toISOString(), privacy_version: PRIVACY_VERSION };
      const sb = await client();
      if (sb) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, phone, ...privacy }, emailRedirectTo: location.origin + '/conta.html' } });
        if (error) throw friendly(error);
        return { needsConfirmation: !data.session };
      }
      const all = demoAccounts();
      if (all[email]) throw new Error('Já existe uma conta com esse e-mail.');
      all[email] = { id: newId(), email, passHash: await sha256(password), profile: { full_name: name || '', phone: phone || '', cpf: '', measurements: {}, ...privacy }, addresses: [] };
      ls.set(DEMO_ACC_KEY, all);
      return { needsConfirmation: false };
    },
    lockedFor() { const s = custLock(); return Math.max(0, Math.ceil((s.until - Date.now()) / 1000)); },
    async signIn(email, password) {
      const wait = account.lockedFor();
      if (wait) throw new Error(`Muitas tentativas. Aguarde ${wait}s.`);
      email = normEmail(email);
      const fail = () => { // mesmo bloqueio progressivo do painel, com chave própria
        const s = custLock(); s.fails += 1;
        if (s.fails >= 5) s.until = Date.now() + Math.min(15 * 60, 30 * 2 ** (s.fails - 5)) * 1000;
        ls.set(CUST_LOCK_KEY, s); throw new Error('E-mail ou senha incorretos.');
      };
      const sb = await client();
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          const m = String(error.message || '');
          if (/not confirmed/i.test(m)) throw new Error('Confirme seu e-mail antes de entrar.');
          if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(m)) fail(); // só credencial errada conta
          throw friendly(error); // rede/limite do servidor: mensagem genérica, sem contar tentativa
        }
      } else {
        const acc = demoAccounts()[email];
        if (!acc || acc.passHash !== await sha256(password)) fail();
        ls.set(DEMO_SESSION_KEY, email);
      }
      ls.set(CUST_LOCK_KEY, { fails: 0, until: 0 });
      emit('rl:account'); return { email };
    },
    async signOut() {
      const sb = await client().catch(() => null);
      if (sb) { const { error } = await sb.auth.signOut(); if (error) console.error(error); }
      try { localStorage.removeItem(DEMO_SESSION_KEY); } catch (e) {}
      recovery = false; recoveryFlag.clear();
      emit('rl:account');
    },
    async resetPassword(email) { // sempre sucesso genérico: não revela se o e-mail existe
      email = normEmail(email);
      const sb = await client().catch(() => null);
      if (sb) { try { await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/conta.html' }); } catch (e) { console.error(e); } }
    },
    async recoveryPending() { // true quando a cliente chegou pelo link de "esqueci a senha"
      if (recoveryFlag.get()) return true; // recarregou a página no meio da troca de senha
      if (!useSupabase) return false;
      await client().catch(() => null); // garante o listener PASSWORD_RECOVERY registrado
      return recovery;
    },
    async updatePassword(newPassword) {
      const sb = await client();
      if (sb) {
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw friendly(error);
      } else {
        const { all, acc } = demoMe(); acc.passHash = await sha256(newPassword); ls.set(DEMO_ACC_KEY, all);
      }
      recovery = false; recoveryFlag.clear();
    },
    hasLocalSession() { // só para rótulos: olha a sessão guardada, sem rede e sem validar no servidor
      if (useSupabase) { const s = ls.get('rl-auth', null); return !!(s && typeof s === 'object' && s.access_token); }
      return !!ls.get(DEMO_SESSION_KEY, null);
    },
    async current() {
      const sb = await client().catch(() => null);
      if (sb) { const { data } = await sb.auth.getUser(); return data?.user ? { id: data.user.id, email: data.user.email } : null; }
      const email = ls.get(DEMO_SESSION_KEY, null); const acc = email && demoAccounts()[email];
      return acc ? { id: acc.id, email: acc.email } : null;
    },
    async getProfile() {
      const sb = await client();
      if (sb) {
        const u = await sbUser(sb);
        const { data, error } = await sb.from('profiles').select(PROFILE_COLS).eq('id', u.id).single();
        if (error) throw friendly(error);
        return { full_name: data.full_name || '', phone: data.phone || '', cpf: data.cpf || '', measurements: data.measurements || {} };
      }
      const p = demoMe().acc.profile;
      return { full_name: p.full_name || '', phone: p.phone || '', cpf: p.cpf || '', measurements: p.measurements || {} };
    },
    async updateProfile(patch) { // só as chaves enviadas: undefined não mexe, null limpa
      const row = {}; ['full_name', 'phone', 'cpf'].forEach(k => { if (patch && patch[k] !== undefined) row[k] = patch[k]; });
      if (!Object.keys(row).length) return;
      const sb = await client();
      if (sb) {
        const u = await sbUser(sb);
        const { error } = await sb.from('profiles').update(row).eq('id', u.id);
        if (error) throw friendly(error); return;
      }
      const { all, acc } = demoMe(); acc.profile = { ...acc.profile, ...row }; ls.set(DEMO_ACC_KEY, all);
    },
    async saveMeasures(obj) {
      const m = {}; ['busto', 'cintura', 'quadril', 'altura'].forEach(k => { if (obj && obj[k] !== undefined) m[k] = obj[k]; });
      const sb = await client();
      if (sb) {
        const u = await sbUser(sb);
        const { error } = await sb.from('profiles').update({ measurements: m }).eq('id', u.id);
        if (error) throw friendly(error);
      } else {
        const { all, acc } = demoMe(); acc.profile.measurements = m; ls.set(DEMO_ACC_KEY, all);
      }
      emit('rl:account', { measurements: m });
    },
    addresses: {
      async list() {
        const sb = await client();
        if (sb) {
          const u = await sbUser(sb); // a política deixa a dona do painel ler tudo: filtra pelo próprio usuário
          const { data, error } = await sb.from('addresses').select(ADDR_COLS).eq('user_id', u.id).order('created_at', { ascending: false });
          if (error) throw friendly(error); return data;
        }
        return demoMe().acc.addresses.slice();
      },
      async save(addr) {
        const row = pickAddr(addr || {});
        const sb = await client();
        if (sb) {
          const u = await sbUser(sb);
          const q = addr.id ? sb.from('addresses').update(row).eq('id', addr.id) : sb.from('addresses').insert({ ...row, user_id: u.id });
          const { data, error } = await q.select(ADDR_COLS).single();
          if (error) throw friendly(error); return data;
        }
        const { all, acc } = demoMe(); let out;
        if (addr.id) {
          const i = acc.addresses.findIndex(a => a.id === addr.id);
          if (i < 0) throw new Error('Endereço não encontrado.');
          out = acc.addresses[i] = { ...acc.addresses[i], ...row };
        } else { out = { id: newId(), created_at: new Date().toISOString(), ...row }; acc.addresses.unshift(out); }
        ls.set(DEMO_ACC_KEY, all); return out;
      },
      async remove(id) {
        const sb = await client();
        if (sb) { await sbUser(sb); const { error } = await sb.from('addresses').delete().eq('id', id); if (error) throw friendly(error); return; }
        const { all, acc } = demoMe(); acc.addresses = acc.addresses.filter(a => a.id !== id); ls.set(DEMO_ACC_KEY, all);
      },
    },
    async orders() {
      const sb = await client(); if (!sb) return [];
      const u = await sbUser(sb);
      const { data, error } = await sb.from('orders').select('id,status,total,payment_method,tracking_code,created_at,order_items(name,qty,size,color)').eq('user_id', u.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw friendly(error); return data;
    },
  };

  window.RL = ({ cfg, mode: useSupabase ? 'supabase' : 'demo', products, admin, cart, favs, auth, account, brl, esc, slugify, safeHex, safeImg, cleanQuery });
})();
