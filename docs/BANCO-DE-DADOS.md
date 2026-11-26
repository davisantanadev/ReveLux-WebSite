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
profiles      id (=auth.users), full_name, phone, cpf, role ('customer' | 'admin')
products      id (slug), name, category, description, details[], price, compare_at_price,
              tag, colors (jsonb), sizes[], images[], stock, active, is_new, is_bestseller
addresses     user_id, cep, street, number, complement, district, city, state
favorites     user_id + product_id
orders        user_id, status, subtotal, shipping, discount, total,
              payment_method, payment_provider, payment_id, shipping_address (jsonb)
order_items   order_id, product_id, name, color, size, unit_price, qty
storage       bucket público "product-images" (só admin envia)
```

## Como ligar o site ao Supabase (cerca de 10 minutos)
1. Crie um projeto em https://supabase.com, na região **South America (São Paulo)**.
2. Abra o **SQL Editor**, cole `supabase/schema.sql` e rode.
3. Ainda no SQL Editor, rode `supabase/seed.sql` se quiser os produtos de exemplo.
4. Em **Authentication → Users → Add user**, crie a conta da dona da loja.
5. No SQL Editor, transforme essa conta em admin:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'email-da-dona@exemplo.com');
   ```
6. Em **Settings → API**, copie a *Project URL* e a *anon public key* para `assets/js/config.js`.
7. Pronto: o painel `admin.html` passa a gravar no banco, e as fotos vão para o Storage.

Enquanto o `config.js` estiver vazio, o site roda em **modo demonstração**: tudo funciona, mas fica salvo só no navegador. O login de teste do painel é `admin@revelux.com` com a senha `revelux123`.

## Próximos passos
- [ ] Checkout: página de endereço e frete, e uma Edge Function `create-order` com Mercado Pago (Pix e cartão)
- [ ] Webhook do Mercado Pago atualizando `orders.status`
- [ ] Área da cliente: login, meus pedidos, endereços e favoritos salvos na conta
- [ ] Painel: aba de pedidos (mudar status, código de rastreio)
- [ ] Estoque por variação (cor × tamanho), se a loja precisar
