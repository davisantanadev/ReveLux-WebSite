-- =====================================================================
-- Rêve Lux — esquema do banco (Supabase / Postgres)
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem quebrar (idempotente).
-- =====================================================================

-- ---------- Perfis (clientes e administradoras) ----------
-- Cada usuário do Supabase Auth ganha um perfil. role = 'customer' | 'admin'.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  cpf         text,                       -- dado pessoal: só a própria pessoa e admins leem
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);

-- cria o perfil automaticamente no cadastro
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper usado nas políticas
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Produtos ----------
create table if not exists public.products (
  id                text primary key,                 -- slug: 'vestido-aurora-midi'
  name              text not null,
  category          text not null,
  description       text default '',
  details           text[] default '{}',
  price             numeric(10,2) not null check (price > 0),
  compare_at_price  numeric(10,2) check (compare_at_price is null or compare_at_price > price),
  tag               text,
  colors            jsonb not null default '[]',      -- [{ "name": "Pérola", "hex": "#f1e4da" }]
  sizes             text[] not null default '{}',
  images            text[] not null default '{}',     -- URLs públicas do Storage
  stock             int not null default 0 check (stock >= 0),
  active            boolean not null default true,
  is_new            boolean not null default false,
  is_bestseller     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category) where active;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- Endereços ----------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text default 'Casa',
  cep         text not null, street text not null, number text not null, complement text,
  district    text not null, city text not null, state char(2) not null,
  created_at  timestamptz not null default now()
);

-- ---------- Favoritos ----------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Pedidos ----------
-- Pagamento: NUNCA guardar número de cartão. O gateway (Mercado Pago / Stripe)
-- processa o cartão e devolve só um id + status, salvos em payment_*.
create table if not exists public.orders (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users(id) on delete set null,
  status             text not null default 'pending'
                     check (status in ('pending','paid','shipped','delivered','canceled','refunded')),
  subtotal           numeric(10,2) not null,
  shipping           numeric(10,2) not null default 0,
  discount           numeric(10,2) not null default 0,
  total              numeric(10,2) not null,
  payment_method     text check (payment_method in ('pix','card','boleto')),
  payment_provider   text,
  payment_id         text,                      -- id da transação no gateway
  shipping_address   jsonb not null,            -- cópia do endereço no momento da compra
  created_at         timestamptz not null default now()
);
create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  product_id  text references public.products(id) on delete set null,
  name        text not null,                    -- cópia: o produto pode mudar depois
  color       text, size text,
  unit_price  numeric(10,2) not null,
  qty         int not null check (qty > 0)
);

-- =====================================================================
-- Segurança: Row Level Security (RLS)
-- A chave "anon" do site é pública. Quem protege os dados são estas regras.
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.addresses   enable row level security;
alter table public.favorites   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- perfis: cada um vê/edita o seu; admin vê todos. Ninguém se promove a admin.
drop policy if exists "perfil próprio" on public.profiles;
create policy "perfil próprio" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "edita perfil próprio" on public.profiles;
create policy "edita perfil próprio" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- produtos: todo mundo lê os ativos; só admin vê ocultos e escreve.
drop policy if exists "vitrine pública" on public.products;
create policy "vitrine pública" on public.products for select using (active or public.is_admin());
drop policy if exists "admin gerencia produtos" on public.products;
create policy "admin gerencia produtos" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- endereços e favoritos: só o dono.
drop policy if exists "endereços do dono" on public.addresses;
create policy "endereços do dono" on public.addresses for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());
drop policy if exists "favoritos do dono" on public.favorites;
create policy "favoritos do dono" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- pedidos: cliente LÊ os seus; admin lê todos e atualiza status.
-- A criação do pedido deve ser feita no servidor (Edge Function com service_role),
-- que recalcula preços a partir da tabela products e fala com o gateway de pagamento.
drop policy if exists "pedidos do dono" on public.orders;
create policy "pedidos do dono" on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin atualiza pedidos" on public.orders;
create policy "admin atualiza pedidos" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "itens do dono" on public.order_items;
create policy "itens do dono" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- =====================================================================
-- Storage: fotos dos produtos (leitura pública, escrita só admin)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
drop policy if exists "fotos públicas" on storage.objects;
create policy "fotos públicas" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin altera fotos" on storage.objects;
create policy "admin altera fotos" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin apaga fotos" on storage.objects;
create policy "admin apaga fotos" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- =====================================================================
-- Depois de criar a sua conta (Authentication → Users → Add user),
-- transforme-a em administradora trocando o e-mail abaixo:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
-- =====================================================================
