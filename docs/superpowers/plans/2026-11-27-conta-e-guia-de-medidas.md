# Conta da cliente e guia de medidas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a cliente cria conta, entra, vê e edita o perfil (dados, medidas, endereços, pedidos), e a página do produto ganha um guia de medidas em painel com recomendação de tamanho.

**Architecture:** site estático multipágina. Lógica pura (tabelas de medidas, recomendação, validação) em arquivos JS sem DOM, testados com `node --test`. Acesso a dados da cliente num novo objeto `RL.account` em `store.js`, com dois modos: Supabase (Auth + tabelas com RLS) e demonstração (localStorage). Telas novas: `conta.html` e `medidas.html`.

**Tech Stack:** HTML/CSS/JS puro, Supabase JS 2.45.4 já vendorizado, Node (só para `node --test` e `node --check`), Python http.server para o localhost.

**Spec:** `docs/superpowers/specs/2026-11-27-conta-e-guia-de-medidas-design.md`

## Global Constraints
- Sem dependência nova, sem build, sem `package.json` obrigatório (testes rodam com `node --test tests/`).
- CSP: `script-src 'self'` — nenhum `<script>` inline, nenhum `onclick=`/`onerror=`; `style="--var:…"` pontual é aceito (já usado).
- Toda saída de dado em HTML passa por `RL.esc()`.
- Todo texto de interface em português do Brasil.
- Cada página nova copia o `<head>` de `produto.html` (meta CSP idêntica, fontes, `style.css`, `theme-init.js`) e a ordem de scripts `config.js → data.js → store.js → layout.js → <página>.js`.
- `admin.html`/`RL.auth` (login da dona) não podem mudar de comportamento.
- Modo demonstração (sem `supabaseUrl`) tem de funcionar de ponta a ponta.
- Migração nova não é aplicada; não editar migrações existentes.
- Não fazer commit/push (o orquestrador faz no fim, se o Davi pedir).
- Tabela de medidas é ilustrativa: um único objeto, comentado "valores de exemplo — ajuste com as medidas reais das peças".

## Review Focus
1. Medida fora da tabela (maior que GG ou menor que PP): recomendar o extremo com aviso "pode ficar justo/folgado", nunca `undefined`. → teste na Task 1.
2. Medidas parciais (só cintura): recomendar com o que houver; nenhuma medida → `null`. → teste na Task 1.
3. Vírgula decimal ("88,5") e espaços digitados por brasileiras. → teste na Task 2.
4. Cadastro com e-mail já existente / e-mail não confirmado: mensagem clara, sem revelar se o e-mail existe além do que o Supabase já revela. → verificação manual na Task 6.
5. Cliente comum tentando abrir `admin.html` logada: continua "Acesso negado" (sessões não se misturam: o admin usa `sessionStorage rl-admin` no demo; no Supabase o `isAdmin` checa `role`). → verificação manual na Task 7.

---

### Task 1: Tabela de medidas e recomendação (lógica pura)

**Files:**
- Create: `assets/js/medidas.js`
- Test: `tests/medidas.test.js`

**Interfaces:**
- Produces (em `window.RL_MEDIDAS` no navegador e `module.exports` no Node):
  - `GUIDE`: `{ superior: { fields: ['busto','cintura','quadril'], sizes: { PP:{busto:[80,84],cintura:[62,66],quadril:[88,92]}, P:{busto:[85,89],cintura:[67,71],quadril:[93,97]}, M:{busto:[90,94],cintura:[72,76],quadril:[98,102]}, G:{busto:[95,100],cintura:[77,82],quadril:[103,108]}, GG:{busto:[101,106],cintura:[83,88],quadril:[109,114]} } }, inferior: { fields: ['cintura','quadril'], sizes: { '36':{cintura:[64,67],quadril:[90,93]}, '38':{cintura:[68,71],quadril:[94,97]}, '40':{cintura:[72,75],quadril:[98,101]}, '42':{cintura:[76,79],quadril:[102,105]}, '44':{cintura:[80,84],quadril:[106,110]} } } }` (cm, valores de exemplo)
  - `guideFor(category: string, sizes?: string[]): 'superior'|'inferior'|null` — acessorios/desconhecida → null; calcas → inferior; vestidos/conjuntos/blusas → superior; saias → inferior se `sizes` só tem números, senão superior (as saias do catálogo usam P/M/G).
  - `recommendSize(kind: 'superior'|'inferior', measures: {busto?,cintura?,quadril?}, available?: string[]): { size: string, fit: 'ok'|'justo'|'folgado' } | null` — para cada medida informada, acha o menor tamanho cujo limite superior ≥ medida; resultado = o maior entre eles; se a medida passa do maior tamanho → maior tamanho com `fit:'justo'`; se menor que o menor → menor com `fit:'folgado'`. Com `available`, só considera tamanhos dessa lista (se o recomendado não existir, o próximo maior disponível; se nenhum, o maior com `fit:'justo'`).
  - `fieldsFor(kind, category): string[]` — saias e calças: `['cintura','quadril']`; superior: `['busto','cintura','quadril']`.

- [ ] **Step 1: Escrever testes** em `tests/medidas.test.js` com `node:test` e `node:assert/strict`:
  - `recommendSize('superior',{busto:92,cintura:74,quadril:100})` → `{size:'M',fit:'ok'}`
  - `recommendSize('superior',{busto:92,cintura:80})` → `{size:'G',fit:'ok'}` (pega o maior)
  - `recommendSize('superior',{cintura:70})` → `{size:'P',fit:'ok'}`
  - `recommendSize('superior',{busto:120})` → `{size:'GG',fit:'justo'}`
  - `recommendSize('superior',{busto:70})` → `{size:'PP',fit:'folgado'}`
  - `recommendSize('superior',{})` → `null`
  - `recommendSize('inferior',{cintura:73,quadril:99})` → `{size:'40',fit:'ok'}`
  - `recommendSize('superior',{busto:82},['P','M','G'])` → `{size:'P',fit:'ok'}`
  - `guideFor('vestidos')` → `'superior'`; `guideFor('calcas')` → `'inferior'`; `guideFor('acessorios')` → `null`; `guideFor('saias',['P','M','G'])` → `'superior'`; `guideFor('saias',['38','40'])` → `'inferior'`
  - `fieldsFor('superior','saias')` → `['cintura','quadril']`
- [ ] **Step 2:** `node --test tests/` → FAIL (módulo não existe).
- [ ] **Step 3:** implementar `assets/js/medidas.js` como IIFE que atribui a `window.RL_MEDIDAS` quando `window` existe e a `module.exports` quando `module` existe.
- [ ] **Step 4:** `node --test tests/` → PASS.

### Task 2: Validação dos formulários (lógica pura)

**Files:**
- Create: `assets/js/validacao.js`
- Test: `tests/validacao.test.js`

**Interfaces:**
- Produces (`window.RL_VALID` / `module.exports`), cada função retorna `{ ok: true, value } | { ok: false, errors: { campo: 'mensagem' } }`:
  - `signup({name,email,password,phone,consent})` — nome 2–120; e-mail com `@` e domínio, minúsculo, ≤254; senha ≥8 com letra e número; telefone normalizado só dígitos, 10–11 dígitos (retorna formatado `(11) 98888-7777`, que passa no check `^[0-9 ()+-]{8,20}$` do banco); `consent === true` ("Aceite a política de privacidade").
  - `profile({full_name, phone, cpf})` — cpf opcional: só dígitos, 11, dígitos verificadores válidos.
  - `measures({busto,cintura,quadril,altura})` — aceita string com vírgula ("88,5"), vazio = ausente, cada valor 40–200 (altura 120–220); retorna números com 1 casa.
  - `address({label,cep,street,number,complement,district,city,state})` — CEP 8 dígitos (aceita `01310-100`), UF 2 letras maiúsculas de uma lista das 27 UFs, limites de tamanho iguais às colunas de `public.addresses`.
- [ ] **Step 1: testes** em `tests/validacao.test.js`:
  - `signup` válido retorna `value.phone === '(11) 98888-7777'` para entrada `'11988887777'` e `value.email === 'ana@x.com'` para `' Ana@X.com '`
  - senha `'abcdefgh'` → `errors.password`; `consent:false` → `errors.consent`
  - `measures({busto:'88,5',cintura:'',quadril:' 99 '})` → `{ok:true,value:{busto:88.5,quadril:99}}`
  - `measures({busto:'300'})` → `errors.busto`
  - `profile({full_name:'Ana',cpf:'111.111.111-11'})` → `errors.cpf`; cpf `'529.982.247-25'` → ok com `'52998224725'`
  - `address` com `cep:'01310-100', state:'sp'` → ok com `cep:'01310100', state:'SP'`; `state:'XX'` → `errors.state`
- [ ] **Step 2:** `node --test tests/` → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `node --test tests/` → PASS.

### Task 3: Migração das medidas e telefone no cadastro

**Files:**
- Create: `supabase/migrations/20261127000007_customer_account.sql`
- Modify: `docs/BANCO-DE-DADOS.md` (uma linha em `profiles` citando `measurements`)

**Interfaces:**
- Produces: coluna `public.profiles.measurements jsonb` (default `'{}'`), check: objeto; só chaves `busto,cintura,quadril,altura`; valores numéricos 40–220. `grant update (measurements) on public.profiles to authenticated`.
- `public.handle_new_user()` passa a gravar também `phone` de `raw_user_meta_data->>'phone'` quando casa `^[0-9 ()+-]{8,20}$` (senão null). Manter `security definer set search_path = ''` e ignorar `role` dos metadados.

- [ ] **Step 1:** ler `…01_schema.sql` e `…04_harden_functions.sql` para seguir o padrão (idempotência, `create or replace`, `if not exists`, onde `handle_new_user` vive hoje — se a 000004 a moveu para `private`, alterar lá).
- [ ] **Step 2:** escrever a migração idempotente (`add column if not exists`, `drop constraint if exists` antes do `add constraint`).
- [ ] **Step 3:** conferir que addresses e orders já têm `grant` para `authenticated` (select/insert/update/delete em addresses; select em orders/order_items). Se faltar, incluir na mesma migração.
- [ ] **Step 4:** verificação: revisão de leitura (não há Postgres local). Registrar no relatório o que foi conferido.

### Task 4: `RL.account` em store.js

**Files:**
- Modify: `assets/js/store.js` (novo bloco depois de `auth`, e incluir `account` no `window.RL`)

**Interfaces:**
- Consumes: `RL_VALID` (Task 2) — `store.js` não depende dele; quem valida é a página. `account` recebe dados já validados.
- Produces `RL.account`:
  - `signUp({name,email,password,phone}) → Promise<{needsConfirmation: boolean}>` — Supabase: `auth.signUp({email,password,options:{data:{full_name:name, phone}, emailRedirectTo: location.origin + '/conta.html'}})`.
  - `signIn(email,password) → Promise<{email}>` — mesmo bloqueio progressivo de `auth.signIn`, mas com chave própria `rl-cust-lock`; não exige admin. Erro "Email not confirmed" → "Confirme seu e-mail antes de entrar."
  - `signOut() → Promise<void>`; `resetPassword(email) → Promise<void>` (Supabase `resetPasswordForEmail` com `redirectTo` `conta.html`); sempre responde sucesso genérico.
  - `current() → Promise<{id,email}|null>` — Supabase: `auth.getUser()`.
  - `getProfile() → Promise<{full_name,phone,cpf,measurements}>`; `updateProfile({full_name,phone,cpf})`; `saveMeasures(obj)`.
  - `addresses.list() → Promise<Address[]>`; `addresses.save(addr)` (insert sem id, update com id); `addresses.remove(id)`.
  - `orders() → Promise<Order[]>` — `orders` com `order_items(name,qty,size,color)`, mais recentes primeiro, limite 50.
  - Emite `document` event `rl:account` em signIn/signOut/saveMeasures.
- Modo demo (localStorage): contas em `rl-demo-accounts` `{ [email]: { id, email, passHash, profile, addresses } }`, sessão em `rl-demo-session` (email). `passHash` = SHA-256 hex via `crypto.subtle` (só para não guardar texto puro no demo; o aviso de demonstração continua). `signUp` no demo → `needsConfirmation:false`. `orders()` no demo → `[]`.
- Todos os erros do Supabase passam por `friendly()`; não logar senha.

- [ ] **Step 1:** implementar.
- [ ] **Step 2:** `node --check assets/js/store.js` → sem erro.
- [ ] **Step 3:** no localhost demo (`http://localhost:5174`, pasta de demonstração é recriada pelo orquestrador), no console: `await RL.account.signUp({...})`, `signIn`, `current`, `saveMeasures`, `getProfile`, `addresses.save/list/remove`, `signOut` → resultados coerentes. `admin.html` continua entrando com a credencial demo.

### Task 5: Guia de medidas na página do produto e `medidas.html`

**Files:**
- Modify: `produto.html` (incluir `<script src="assets/js/medidas.js">` antes de `produto.js`)
- Modify: `assets/js/produto.js:41,71` (link abre painel; remover o toast)
- Create: `assets/js/guia.js` — renderiza o painel/tabela, usado por produto e medidas.html
- Create: `medidas.html`
- Create: `assets/img/como-medir.svg` (silhueta de linha fina com três marcações: busto, cintura, quadril; cores via `currentColor`)
- Modify: `assets/css/style.css` (seção nova "Guia de medidas" no fim)

**Interfaces:**
- Consumes: `RL_MEDIDAS.{GUIDE,guideFor,fieldsFor,recommendSize}` (Task 1), `RL_VALID.measures` (Task 2), `RL.account.current/getProfile/saveMeasures` (Task 4).
- Produces `window.RL_GUIA`:
  - `table(kind, sizes?: string[]) → string` (HTML de `<table>` com `<caption>`, `<th scope>`; destaca a linha do tamanho recomendado via `aria-current="true"`)
  - `open({category, sizes, name}) → void` — painel lateral (reusar o padrão visual do drawer da sacola em `layout.js`/`style.css`): título "Guia de medidas", tabela, figura "como medir", formulário "Descubra seu tamanho" (inputs `inputmode="decimal"`), resultado "Indicamos o tamanho M" (+ "pode ficar justo/folgado"), botão "Usar este tamanho" que seleciona o tamanho na página e fecha; se logada, preenche com as medidas salvas e oferece "Salvar minhas medidas"; se não logada, link "Entre para salvar suas medidas" → `conta.html`. Fecha com Esc, botão ×, clique no fundo; foco preso no painel e devolvido ao link ao fechar.
- Página do produto: se `guideFor` = null (acessórios), o link "Guia de medidas" não aparece. Se a cliente está logada e tem medidas, mostrar ao lado da legenda "Tamanho": `<span class="fit-hint">Seu tamanho: M</span>` calculado com `available = p.sizes`.
- `medidas.html`: título "Guia de medidas", as duas tabelas (peças de cima e vestidos; saias e calças), a figura, o mesmo formulário de descoberta (sem "Usar este tamanho").

- [ ] **Step 1:** implementar `guia.js`, svg, CSS e as alterações em `produto.js`/`produto.html`.
- [ ] **Step 2:** criar `medidas.html` (head padrão, scripts `config,data,store,layout,medidas,validacao,guia` e um `medidas-page.js` pequeno ou inicialização dentro de `guia.js` por `data-guia-page`).
- [ ] **Step 3:** `node --check` nos JS novos/alterados.
- [ ] **Step 4:** localhost demo: produto vestido → painel abre, recomenda M para 92/74/100, "Usar este tamanho" marca M; Esc fecha e o foco volta; produto colar → sem link; `medidas.html` mostra as duas tabelas; tema escuro legível; largura 375px sem rolagem horizontal.

### Task 6: `conta.html` — entrar, criar conta, esqueci a senha, minha conta

**Files:**
- Create: `conta.html`, `assets/js/conta.js`, `assets/css/conta.css`
- Modify: `assets/js/layout.js:32` (ícone de conta → `conta.html`, `aria-label` "Entrar" ou "Minha conta" conforme sessão via `RL.account.current()`), `assets/js/layout.js:64` (rodapé "Guia de medidas" → `medidas.html`), e incluir "Minha conta" no drawer/menu mobile se ele lista links
- Modify: `vercel.json` e `_headers`: `conta.html` com `Cache-Control: no-store` e `X-Robots-Tag: noindex` (seguir o bloco de `admin.html`)

**Interfaces:**
- Consumes: `RL.account.*` (Task 4), `RL_VALID.{signup,profile,measures,address}` (Task 2), `RL_MEDIDAS` só para mostrar o tamanho indicado na seção de medidas.
- Deslogada: abas acessíveis (`role="tablist"`) Entrar | Criar conta | Esqueci a senha.
  - Entrar: e-mail, senha (botão mostrar/ocultar), "Entrar".
  - Criar conta: nome, e-mail, telefone, senha (dica "mín. 8, com letra e número"), checkbox "Li e aceito a política de privacidade" (link para `#` por enquanto, mesmo do rodapé), "Criar conta". Sucesso com confirmação: "Enviamos um link para seu e-mail. Confirme para entrar."
  - Esqueci: e-mail → "Se houver conta com esse e-mail, você vai receber um link."
  - Erros por campo com `aria-describedby` e `aria-invalid`; botão desabilitado com "Aguarde…" durante envio.
  - No modo demo, aviso discreto: "Modo demonstração: os dados ficam só neste navegador."
- Logada: "Olá, {nome}" + seções em cards: Meus dados (editar nome, telefone, CPF opcional; e-mail só leitura), Minhas medidas (busto, cintura, quadril, altura + "Seu tamanho: peças de cima M · calças 40"), Endereços (lista + formulário adicionar/editar/remover com confirmação), Meus pedidos (lista ou "Você ainda não fez pedidos"), Sair, e "Excluir conta: peça pelo contato@revelux.com.br ou WhatsApp" (texto).
  - `?tab=cadastro` abre a aba Criar conta; `#medidas` rola para a seção de medidas.
- [ ] **Step 1:** implementar.
- [ ] **Step 2:** `node --check assets/js/conta.js assets/js/layout.js`.
- [ ] **Step 3:** localhost demo: criar conta (inválidos mostram erros por campo; válido entra), sair, entrar de novo (senha errada 5× bloqueia), salvar dados, medidas ("88,5" aceito), endereço CRUD, pedidos vazio; ícone do topo leva à conta; teclado só (Tab/Enter/Esc) funciona; 375px ok; tema escuro ok.

### Task 7: Verificação final e revisões

- [ ] **Step 1:** `node --test tests/` e `node --check` em todos os JS → verdes.
- [ ] **Step 2:** fluxo e2e no localhost demo: cadastro → salvar medidas → produto mostra "Seu tamanho" → painel pré-preenchido → `admin.html` com cliente logada continua exigindo login de admin.
- [ ] **Step 3:** cinco ciclos de revisão (funcionamento; arquitetura/contratos; segurança e dados — RLS, `esc`, CSP, LGPD; testes e casos limite; diff final/acessibilidade/desempenho), corrigindo achados confirmados.
- [ ] **Step 4:** atualizar `docs/ARQUITETURA.md` (páginas novas) e `docs/SEGURANCA.md` (conta da cliente) em poucas linhas.
