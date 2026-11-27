-- =====================================================================
-- Rêve Lux — esquema do banco (Supabase / Postgres) com segurança reforçada
-- Idempotente: pode rodar de novo sem quebrar.
-- Princípios: RLS em tudo, menor privilégio por coluna, validação no banco
-- (nunca confiar no navegador), funções com search_path fixo, trilha de auditoria.
-- =====================================================================

-- ---------- Perfis ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  phone       text check (phone is null or phone ~ '^[0-9 ()+-]{8,20}$'),
  cpf         text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(new.raw_user_meta_data->>'full_name', 120))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Produtos ----------
create table if not exists public.products (
  id                text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  name              text not null check (char_length(name) between 2 and 120),
  category          text not null check (category in ('vestidos','conjuntos','blusas','saias','calcas','acessorios')),
  description       text not null default '' check (char_length(description) <= 2000),
  details           text[] not null default '{}' check (cardinality(details) <= 20),
  price             numeric(10,2) not null check (price > 0 and price < 100000),
  compare_at_price  numeric(10,2) check (compare_at_price is null or compare_at_price > price),
  tag               text check (tag is null or char_length(tag) <= 30),
  colors            jsonb not null default '[]' check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 12),
  sizes             text[] not null default '{}' check (cardinality(sizes) <= 15),
  images            text[] not null default '{}' check (cardinality(images) <= 10),
  stock             int not null default 0 check (stock >= 0 and stock < 100000),
  active            boolean not null default true,
  is_new            boolean not null default false,
  is_bestseller     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category) where active;

-- valida cores (hex) e URLs de imagem: bloqueia javascript:, data: e injeção de CSS
create or replace function public.validate_product() returns trigger
language plpgsql set search_path = '' as $$
declare c jsonb; u text;
begin
  for c in select * from jsonb_array_elements(new.colors) loop
    if jsonb_typeof(c) <> 'object'
       or coalesce(c->>'hex','') !~ '^#[0-9a-fA-F]{6}$'
       or char_length(coalesce(c->>'name','')) not between 1 and 40 then
      raise exception 'cor inválida: %', c using errcode = '22023';
    end if;
  end loop;
  foreach u in array new.images loop
    if u !~ '^(https://[a-zA-Z0-9.-]+/|assets/)[^\s"''<>()]*$' or char_length(u) > 500 then
      raise exception 'URL de imagem inválida' using errcode = '22023';
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists products_validate on public.products;
create trigger products_validate before insert or update on public.products
  for each row execute function public.validate_product();
drop trigger if exists products_touch on public.products;

-- ---------- Endereços / Favoritos ----------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label       text default 'Casa' check (char_length(label) <= 30),
  cep         text not null check (cep ~ '^[0-9]{8}$'),
  street      text not null check (char_length(street) <= 150),
  number      text not null check (char_length(number) <= 10),
  complement  text check (char_length(complement) <= 80),
  district    text not null check (char_length(district) <= 80),
  city        text not null check (char_length(city) <= 80),
  state       char(2) not null check (state ~ '^[A-Z]{2}$'),
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.favorites (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists favorites_product_idx on public.favorites (product_id);

-- ---------- Pedidos (criados só no servidor) ----------
create table if not exists public.orders (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users(id) on delete set null,
  status             text not null default 'pending'
                     check (status in ('pending','paid','shipped','delivered','canceled','refunded')),
  subtotal           numeric(10,2) not null check (subtotal >= 0),
  shipping           numeric(10,2) not null default 0 check (shipping >= 0),
  discount           numeric(10,2) not null default 0 check (discount >= 0),
  total              numeric(10,2) not null check (total >= 0),
  payment_method     text check (payment_method in ('pix','card','boleto')),
  payment_provider   text,
  payment_id         text,
  tracking_code      text check (tracking_code is null or char_length(tracking_code) <= 40),
  shipping_address   jsonb not null,
  created_at         timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  product_id  text references public.products(id) on delete set null,
  name        text not null,
  color       text, size text,
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  qty         int not null check (qty between 1 and 99)
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- ---------- Auditoria das ações de admin ----------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid default auth.uid(),
  action      text not null,
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (action, table_name, record_id, old_data, new_data)
  values (tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
drop trigger if exists products_audit on public.products;
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit();
drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after update on public.orders
  for each row execute function public.audit();
drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after update of role on public.profiles
  for each row execute function public.audit();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.addresses   enable row level security;
alter table public.favorites   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_log   enable row level security;

-- privilégios mínimos por papel (RLS filtra as linhas; GRANT limita as operações/colunas)
revoke all on public.profiles, public.products, public.addresses, public.favorites,
              public.orders, public.order_items, public.audit_log from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;           -- RLS: só admin
grant select on public.profiles to authenticated;
grant update (full_name, phone, cpf) on public.profiles to authenticated;   -- role nunca pelo cliente
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status, tracking_code) on public.orders to authenticated;    -- RLS: só admin
grant select on public.audit_log to authenticated;                         -- RLS: só admin

drop policy if exists "perfil próprio" on public.profiles;
drop policy if exists "edita perfil próprio" on public.profiles;
drop policy if exists "perfil: ler o próprio ou admin" on public.profiles;
create policy "perfil: ler o próprio ou admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "perfil: editar o próprio" on public.profiles;
create policy "perfil: editar o próprio" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "vitrine pública" on public.products;
drop policy if exists "admin gerencia produtos" on public.products;
drop policy if exists "produtos: vitrine pública" on public.products;
create policy "produtos: vitrine pública" on public.products for select to anon, authenticated
  using (active or (select public.is_admin()));
drop policy if exists "produtos: admin insere" on public.products;
create policy "produtos: admin insere" on public.products for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "produtos: admin altera" on public.products;
create policy "produtos: admin altera" on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "produtos: admin exclui" on public.products;
create policy "produtos: admin exclui" on public.products for delete to authenticated using ((select public.is_admin()));

drop policy if exists "endereços do dono" on public.addresses;
drop policy if exists "endereços: dono" on public.addresses;
create policy "endereços: dono" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "endereços: admin lê" on public.addresses;
create policy "endereços: admin lê" on public.addresses for select to authenticated using ((select public.is_admin()));

drop policy if exists "favoritos do dono" on public.favorites;
drop policy if exists "favoritos: dono" on public.favorites;
create policy "favoritos: dono" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "pedidos do dono" on public.orders;
drop policy if exists "admin atualiza pedidos" on public.orders;
drop policy if exists "pedidos: dono ou admin lê" on public.orders;
create policy "pedidos: dono ou admin lê" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "pedidos: admin atualiza" on public.orders;
create policy "pedidos: admin atualiza" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "itens do dono" on public.order_items;
drop policy if exists "itens: dono ou admin lê" on public.order_items;
create policy "itens: dono ou admin lê" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

drop policy if exists "auditoria: admin lê" on public.audit_log;
create policy "auditoria: admin lê" on public.audit_log for select to authenticated using ((select public.is_admin()));

-- =====================================================================
-- Storage: fotos (públicas para leitura; só admin envia; só imagem, até 5 MB)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos públicas" on storage.objects;
drop policy if exists "admin envia fotos" on storage.objects;
drop policy if exists "admin altera fotos" on storage.objects;
drop policy if exists "admin apaga fotos" on storage.objects;
drop policy if exists "fotos: admin envia" on storage.objects;
create policy "fotos: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists "fotos: admin altera" on storage.objects;
create policy "fotos: admin altera" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
drop policy if exists "fotos: admin apaga" on storage.objects;
create policy "fotos: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
-- leitura: bucket público serve as imagens por URL; sem policy de SELECT ninguém lista os arquivos.
