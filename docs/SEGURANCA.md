# Segurança da Rêve Lux

O site é estático e roda no navegador, onde nada é confiável. Por isso **quem protege os dados é o banco** (Supabase/Postgres). O front-end só repete as validações para dar uma resposta mais rápida a quem usa.

## Camadas

| Camada | Proteção | Onde |
|---|---|---|
| Banco: acesso | **RLS em todas as tabelas** e **GRANT mínimo por papel e por coluna**. Visitante só lê produtos ativos; cliente só vê os próprios dados; só admin altera catálogo e pedidos | `supabase/migrations/…01_schema.sql`, `…03`, `…04` |
| Banco: escalada de privilégio | A coluna `role` não pode ser alterada pelo cliente (GRANT só em `full_name, phone, cpf`); não existe INSERT em `profiles`; o cadastro ignora `role` nos metadados | `…01_schema.sql` |
| Banco: funções | `is_admin()` fica no schema `private`, fora do `/rest/v1/rpc`; funções de trigger sem EXECUTE para anon e authenticated; todas com `search_path` fixo | `…04_harden_functions.sql` |
| Banco: validação | CHECKs de tamanho, formato, preço e estoque; trigger que aceita só cores `#RRGGBB` e imagens `https://` ou `assets/` (bloqueia `javascript:`, `data:` e injeção de CSS) | `validate_product()` |
| Banco: pedidos | Cliente não cria pedido pelo navegador: o pedido será criado numa Edge Function, que recalcula os preços | sem GRANT de INSERT em `orders` |
| Banco: auditoria | Trigger registra criação, edição e exclusão de produtos, mudança de pedidos e de `role` em `audit_log`, que só admin lê | `audit()` |
| Storage | Bucket só de imagens (jpeg/png/webp/avif, sem SVG), até 5 MB; só admin envia; ninguém lista os arquivos | `…01_schema.sql` |
| Login | Senha com no mínimo 10 caracteres, com maiúscula, minúscula e número; limite de tentativas no servidor (Supabase) e bloqueio progressivo no navegador depois de 5 erros; mensagem genérica, que não revela se o e-mail existe | Supabase Auth, `store.js` |
| Conta da cliente: dados | **RLS por dono**: a cliente só lê e altera o próprio perfil, endereços e pedidos; medidas validadas no banco (só busto, cintura, quadril e altura, entre 40 e 220 cm). A migração 000007 ainda não foi aplicada | `…07_customer_account.sql`, `RL.account` |
| Conta da cliente: `role` | O `role` nunca vem do cliente: fora do GRANT de coluna e ignorado nos metadados do cadastro | `…01_schema.sql`, `handle_new_user()` |
| Conta da cliente: LGPD | O aceite da política de privacidade é obrigatório e é gravado no cadastro, com data e versão (`privacy_accepted_at`, `privacy_version`) | `signUp()` em `store.js` |
| Conta da cliente: login | Bloqueio progressivo no navegador depois de 5 erros, com chave própria (`rl-cust-lock`), separada da do painel; só credencial errada conta; mensagem genérica | `RL.account.signIn()` |
| Conta da cliente: página | `conta.html` com `noindex` e `no-store` | `conta.html`, `vercel.json`, `_headers` |
| Sessão compartilhada | Lojista e cliente usam a mesma sessão do Supabase (`rl-auth`) no mesmo navegador, sem escalada de privilégio: o painel confere `role = 'admin'` no servidor | `admin.js`, `store.js` |
| Rota do painel | O painel só aparece depois que o servidor valida o token (`auth.getUser`) e confirma `role = 'admin'`; a sessão cai após 30 min sem uso; `noindex`, `no-store` e bloqueio no `robots.txt` | `admin.js`, `vercel.json` |
| XSS | Toda saída dinâmica passa por `esc()`; cores por `safeHex()`, URLs por `safeImg()`; **CSP `script-src 'self'`**, sem script inline nem `eval`; supabase-js servido pelo próprio site | `store.js`, metas CSP nas páginas |
| SQL / filtro injection | Consultas parametrizadas pelo supabase-js; a busca remove `% _ , ( ) * : ; ' " < >` e limita a 60 caracteres | `cleanQuery()` |
| Cabeçalhos HTTP | CSP com `frame-ancestors 'none'`, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e COOP | `vercel.json`, `_headers` |
| Erros | Mensagens genéricas na tela; detalhes do banco só no console | `friendly()` |

## Testes feitos (27/11/2026)
- **Ataques com a chave pública no banco real:** criar, alterar preço e apagar produto; ler perfis, pedidos e auditoria; chamar `is_admin`; listar o storage. **Todos foram negados.** A tentativa de SQL injection no filtro foi barrada antes, pelo WAF do Supabase.
- **Navegador (Playwright):** painel oculto sem login; login inválido recusado; forçar o painel pelo console **não grava nem lê** nada; bloqueio depois de 5 tentativas; produto cadastrado com `<img onerror>`, `<script>` e `javascript:` **não executa** em nenhuma página; nenhuma violação de CSP.
- **Supabase Security Advisor:** 0 avisos.
- **`security-review` do Claude Code:** nenhuma vulnerabilidade de alta confiança.

## Limitações conhecidas
- **Proteção contra senhas vazadas (HaveIBeenPwned):** só existe no plano Pro do Supabase.
- **GitHub Pages não envia cabeçalhos HTTP.** Lá valem só as metas CSP, e `frame-ancestors` e HSTS não se aplicam. Para ter tudo, hospede na Vercel (`vercel.json`) ou na Netlify/Cloudflare (`_headers`).
- **CAPTCHA no login e no cadastro:** ainda não está ligado. Recomendado quando a área da cliente for ao ar (Supabase → Auth → Bot protection).
- **2FA (TOTP) para a admin:** está habilitado no projeto, mas ainda não tem tela no painel.

## Rotina
- Depois de toda mudança no banco, rode o Security Advisor do Supabase.
- Nunca coloque a chave `secret`/`service_role` nem a senha do banco no repositório.
- Mudanças no banco entram como um novo arquivo em `supabase/migrations/`.
