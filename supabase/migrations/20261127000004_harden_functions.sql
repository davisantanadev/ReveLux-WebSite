-- Funções SECURITY DEFINER fora do alcance da API pública (/rest/v1/rpc).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- is_admin() vai para o schema privado; as políticas acompanham (referência por OID).
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_admin') then
    alter function public.is_admin() set schema private;
  end if;
end $$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- funções de trigger: ninguém chama direto
revoke execute on function public.audit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.validate_product() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- endereços: uma política de leitura só (dono ou admin)
drop policy if exists "endereços: dono" on public.addresses;
drop policy if exists "endereços: admin lê" on public.addresses;
drop policy if exists "endereços: ler dono ou admin" on public.addresses;
create policy "endereços: ler dono ou admin" on public.addresses for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists "endereços: dono grava" on public.addresses;
create policy "endereços: dono grava" on public.addresses for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "endereços: dono altera" on public.addresses;
create policy "endereços: dono altera" on public.addresses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "endereços: dono apaga" on public.addresses;
create policy "endereços: dono apaga" on public.addresses for delete to authenticated using (user_id = (select auth.uid()));
