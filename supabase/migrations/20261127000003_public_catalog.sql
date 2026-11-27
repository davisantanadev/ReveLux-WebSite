-- Vitrine: visitante anônimo lê só produtos ativos, sem chamar is_admin()
-- (o Postgres não garante a ordem de avaliação do OR, e anon não executa is_admin()).
drop policy if exists "produtos: vitrine pública" on public.products;
drop policy if exists "produtos: visitante lê ativos" on public.products;
create policy "produtos: visitante lê ativos" on public.products for select to anon using (active);
drop policy if exists "produtos: logado lê ativos ou admin" on public.products;
create policy "produtos: logado lê ativos ou admin" on public.products for select to authenticated
  using (active or (select public.is_admin()));
