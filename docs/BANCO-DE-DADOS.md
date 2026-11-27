# Banco de dados: escolha e configuração

## Recomendação: Supabase

Para uma loja de roupas com catálogo, clientes e checkout, o **Supabase** é a melhor escolha. Ele junta, num único serviço:

| Necessidade da loja | O que o Supabase oferece |
|---|---|
| Produtos, pedidos, estoque | **Postgres** completo (relacional, com transações e restrições) |
| Login de clientes e da dona | **Auth** (e-mail e senha, Google, link mágico) |
| Fotos dos produtos | **Storage** com CDN |
| Segurança dos dados dos clientes | **Row Level Security**: cada cliente só lê os próprios pedidos e endereços |
| Pagamento e webhooks | **Edge Functions** para falar com Mercado Pago ou Stripe sem expor chaves |
| Painel de admin | o site lê e escreve direto, protegido pelas regras de RLS |

O plano gratuito aguenta bem o início: 500 MB de banco, 1 GB de fotos e 50 mil usuários.

### E as outras opções?
- **Vercel Postgres / Neon:** é um bom Postgres, mas vem só o banco. Login, upload de fotos e regras de acesso teriam que ser montados à parte, e isso dá mais trabalho e cria mais pontos de falha.
- **Firebase:** tem banco, login e armazenamento, mas o banco não é relacional. Pedidos, itens e estoque ficam mais difíceis de manter consistentes.
- **Plataformas prontas (Nuvemshop, Shopify, Stoqui, Bagy):** são a opção mais rápida se a ideia for não ter código próprio. O preço disso é mensalidade, taxas e um layout limitado.

**Resumo:** Supabase para o banco, o login e as fotos; Vercel ou GitHub Pages para hospedar o site; Mercado Pago (Pix, cartão e boleto) para o pagamento.

## Segurança (dados de clientes e checkout)
1. **Cartão nunca passa pelo nosso banco.** O gateway (Mercado Pago ou Stripe) recebe os dados do cartão e devolve só um `payment_id` e o status.
2. **RLS em todas as tabelas** (`supabase/schema.sql`):
   - produtos: leitura pública dos ativos; escrita só para admin;
   - perfis, endereços, favoritos e pedidos: só a dona da conta (e admins) leem;
   - ninguém consegue se promover a admin pelo site.
3. **Pedido criado no servidor:** uma Edge Function recalcula os preços a partir da tabela `products`. Assim, ninguém consegue mudar o preço pelo navegador.
4. **Chaves:** a `anon key` pode ficar no site, porque é pública e protegida pela RLS. A `service_role` fica só nas Edge Functions e **nunca** vai para o repositório.
5. **LGPD:** CPF e telefone ficam em `profiles`, com acesso restrito. Inclua uma política de privacidade e a opção de apagar a conta.

## Tabelas
```
profiles      id (=auth.users), full_name, phone, cpf, role ('customer' | 'admin'), measurements (jsonb: busto/cintura/quadril/altura em cm, 40–220)
products      id (slug), name, category, description, details[], price, compare_at_price,
              tag, colors (jsonb), sizes[], images[], stock, active, is_new, is_bestseller
addresses     user_id, cep, street, number, complement, district, city, state
favorites     user_id + product_id
orders        user_id, status, subtotal, shipping, discount, total,
              payment_method, payment_provider, payment_id, shipping_address (jsonb)
order_items   order_id, product_id, name, color, size, unit_price, qty
storage       bucket público "product-images" (só admin envia)
```

## Situação atual: conectado
O projeto **ReveLux** (`pfzuuypvagzztfpwjqyz`) está ligado. Em 27/11/2026 as migrações de `supabase/migrations/` foram aplicadas: esquema, catálogo de exemplo (9 produtos), vitrine pública e reforço das funções. O `assets/js/config.js` já tem a URL e a chave *publishable*, que é pública por definição.

### Criar a conta da administradora (falta fazer)
1. No Supabase, vá em **Authentication → Users → Add user → Create new user**, informe e-mail e senha forte e marque *Auto Confirm User*.
2. No **SQL Editor**, rode trocando o e-mail:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'email-da-dona@exemplo.com');
   ```
3. Entre em `admin.html` com esse e-mail e essa senha.

### Aplicar novas migrações
- **Pelo SQL Editor:** cole o arquivo e rode.
- **Pela linha de comando:** `SUPABASE_ACCESS_TOKEN=... ./supabase/run-sql.sh supabase/migrations/<arquivo>.sql`.
- **Pela CLI:** `supabase link --project-ref pfzuuypvagzztfpwjqyz` e depois `supabase db push`.

Para voltar ao modo demonstração, deixe `supabaseUrl` vazio em `config.js`.

Segurança em detalhes: [SEGURANCA.md](SEGURANCA.md).

## Próximos passos
- [ ] Checkout: página de endereço e frete, e uma Edge Function `create-order` com Mercado Pago (Pix e cartão)
- [ ] Webhook do Mercado Pago atualizando `orders.status`
- [ ] Área da cliente: login, meus pedidos, endereços e favoritos salvos na conta
- [ ] Painel: aba de pedidos (mudar status, código de rastreio)
- [ ] Estoque por variação (cor × tamanho), se a loja precisar
