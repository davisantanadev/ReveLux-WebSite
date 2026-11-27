-- Conta da cliente: medidas no perfil e telefone informado no cadastro.
-- Idempotente: pode rodar de novo sem quebrar.

-- ---------- Medidas (cm) ----------
alter table public.profiles add column if not exists measurements jsonb not null default '{}'::jsonb;

-- Validação no banco (CHECK não aceita subconsulta, então vai numa função).
-- Objeto; só as chaves busto/cintura/quadril/altura; valores numéricos entre 40 e 220.
create schema if not exists private;
create or replace function private.valid_measurements(m jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when m is null or jsonb_typeof(m) <> 'object' then false
    else not exists (
      select 1 from jsonb_each(m) e
      where e.key not in ('busto', 'cintura', 'quadril', 'altura')
         or case when jsonb_typeof(e.value) <> 'number' then true
                 else (e.value #>> '{}')::numeric not between 40 and 220 end
    )
  end
$$;
revoke execute on function private.valid_measurements(jsonb) from public, anon;
grant execute on function private.valid_measurements(jsonb) to authenticated;
-- service_role também atualiza profiles (Edge Functions): o CHECK precisa poder chamar a função.
grant execute on function private.valid_measurements(jsonb) to service_role;
grant usage on schema private to service_role;
grant usage on schema private to authenticated;

alter table public.profiles drop constraint if exists profiles_measurements_check;
alter table public.profiles add constraint profiles_measurements_check
  check (private.valid_measurements(measurements));

-- a cliente edita as próprias medidas (RLS "perfil: editar o próprio" limita à linha dela);
-- role continua fora do grant de coluna.
grant update (measurements) on public.profiles to authenticated;

-- ---------- Cadastro: grava também o telefone ----------
-- Metadados do cadastro são entrada não confiável: phone só se casar o formato
-- (senão null), nome cortado em 120, e role dos metadados é ignorado (vale o default 'customer').
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(new.raw_user_meta_data->>'full_name', 120),
    case when new.raw_user_meta_data->>'phone' ~ '^[0-9 ()+-]{8,20}$'
         then new.raw_user_meta_data->>'phone' end
  )
  on conflict (id) do nothing;
  return new;
end $$;
-- create or replace preserva o ACL da 000004; reafirma para o caso de rodar isolada.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- Endereços e pedidos: grants já existem na 000001 ----------
-- addresses: select/insert/update/delete; orders e order_items: select (authenticated).
-- Reafirmados aqui (idempotente) para a página Minha conta.
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.orders, public.order_items to authenticated;
