/* Rêve Lux — camada de dados
   Um único ponto de acesso a produtos, sacola, favoritos e login.
   - Com RL_CONFIG.supabaseUrl/anonKey preenchidos → usa o Supabase (Postgres + Auth + Storage).
   - Sem configuração → modo demonstração em localStorage. */
(() => {
  const cfg = window.RL_CONFIG || {};
  const useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  /* ---------- localStorage seguro ---------- */
  const ls = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  /* ---------- Supabase client (carregado sob demanda) ---------- */
  let clientP = null;
  const client = () => {
    if (!useSupabase) return Promise.resolve(null);
    if (!clientP) clientP = new Promise((res, rej) => {
      const done = () => res(window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey));
      if (window.supabase) return done();
      const s = document.createElement('script'); s.src = SUPABASE_JS; s.onload = done; s.onerror = rej;
      document.head.appendChild(s);
    });
    return clientP;
  };

  const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- Produtos ---------- */
  const DEMO_KEY = 'rl-products-v1';
  const demoProducts = () => {
    let p = ls.get(DEMO_KEY, null);
    if (!p) { p = JSON.parse(JSON.stringify(window.RL_SEED || [])); ls.set(DEMO_KEY, p); }
    return p;
  };

  const products = {
    async list({ q = '', category = '', onlyActive = true, ids = null } = {}) {
      let rows;
      const sb = await client();
      if (sb) {
        let query = sb.from('products').select('*').order('created_at', { ascending: false });
        if (onlyActive) query = query.eq('active', true);
        if (category) query = query.eq('category', category);
        if (ids) query = query.in('id', ids);
        if (q) query = query.ilike('name', `%${q}%`);
        const { data, error } = await query; if (error) throw error; rows = data;
      } else {
        rows = demoProducts();
        if (onlyActive) rows = rows.filter(p => p.active !== false);
        if (category) rows = rows.filter(p => p.category === category);
        if (ids) rows = rows.filter(p => ids.includes(p.id));
        if (q) { const n = slugify(q); rows = rows.filter(p => slugify(p.name + ' ' + p.category + ' ' + (p.description || '')).includes(n)); }
      }
      return rows;
    },
    async get(id) {
      const sb = await client();
      if (sb) { const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data; }
      return demoProducts().find(p => p.id === id) || null;
    },
    async save(p) {
      const row = { ...p };
      if (!row.id) row.id = slugify(row.name);
      const sb = await client();
      if (sb) { const { data, error } = await sb.from('products').upsert(row).select().single(); if (error) throw error; return data; }
      const all = demoProducts(); const i = all.findIndex(x => x.id === (p._originalId || row.id));
      delete row._originalId;
      if (i >= 0) all[i] = row; else all.unshift(row);
      ls.set(DEMO_KEY, all); return row;
    },
    async remove(id) {
      const sb = await client();
      if (sb) { const { error } = await sb.from('products').delete().eq('id', id); if (error) throw error; return; }
      ls.set(DEMO_KEY, demoProducts().filter(p => p.id !== id));
    },
    async uploadImage(file) {
      const sb = await client();
      if (sb) {
        const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${file.name.split('.').pop()}`;
        const { error } = await sb.storage.from(cfg.storageBucket).upload(path, file, { upsert: false });
        if (error) throw error;
        return sb.storage.from(cfg.storageBucket).getPublicUrl(path).data.publicUrl;
      }
      // demo: guarda como data URL reduzida
      return await new Promise((res, rej) => {
        const img = new Image(); const r = new FileReader();
        r.onload = () => { img.src = r.result; }; r.onerror = rej;
        img.onload = () => {
          const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .8));
        };
        r.readAsDataURL(file);
      });
    },
    resetDemo() { try { localStorage.removeItem(DEMO_KEY); } catch (e) {} },
    slugify,
  };

  /* ---------- Sacola (no navegador; vai para `orders` no checkout) ---------- */
  const CART_KEY = 'rl-cart-v1';
  const cart = {
    items() { return ls.get(CART_KEY, []); },
    count() { return cart.items().reduce((s, i) => s + i.qty, 0); },
    total() { return cart.items().reduce((s, i) => s + i.qty * i.price, 0); },
    add(item) { // {id,name,price,image,color,size,qty}
      const all = cart.items(); const key = `${item.id}|${item.color || ''}|${item.size || ''}`;
      const ex = all.find(i => i.key === key);
      if (ex) ex.qty += item.qty || 1; else all.push({ ...item, key, qty: item.qty || 1 });
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
    ids() { return ls.get(FAV_KEY, []); },
    has(id) { return favs.ids().includes(id); },
    toggle(id) {
      const s = new Set(favs.ids()); s.has(id) ? s.delete(id) : s.add(id);
      ls.set(FAV_KEY, [...s]); emit('rl:favs'); return s.has(id);
    },
  };

  /* ---------- Login (admin e, no futuro, clientes) ---------- */
  const DEMO_ADMIN = { email: 'admin@revelux.com', password: 'revelux123' };
  const auth = {
    async signIn(email, password) {
      const sb = await client();
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
        const { data: prof } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
        if (!prof || prof.role !== 'admin') { await sb.auth.signOut(); throw new Error('Esta conta não tem acesso de administradora.'); }
        return data.user;
      }
      if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password) { sessionStorage.setItem('rl-admin', '1'); return { email }; }
      throw new Error('E-mail ou senha incorretos.');
    },
    async isAdmin() {
      const sb = await client();
      if (sb) {
        const { data } = await sb.auth.getUser(); if (!data.user) return false;
        const { data: prof } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
        return prof?.role === 'admin';
      }
      try { return sessionStorage.getItem('rl-admin') === '1'; } catch (e) { return false; }
    },
    async signOut() {
      const sb = await client(); if (sb) await sb.auth.signOut();
      try { sessionStorage.removeItem('rl-admin'); } catch (e) {}
    },
    demoCredentials: useSupabase ? null : DEMO_ADMIN,
  };

  /* ---------- Formatação ---------- */
  const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.RL = { cfg, mode: useSupabase ? 'supabase' : 'demo', products, cart, favs, auth, brl, esc, slugify };
})();
