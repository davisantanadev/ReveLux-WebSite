# Conta da cliente e guia de medidas — design

Aprovado pelo Davi em 2026-11-27.

## Intenção
A loja só tem login da dona (`admin.html`). A cliente não consegue criar conta, entrar nem ver os próprios dados, e o guia de medidas é um toast com "P 36–38 · M 40–42…" (`assets/js/produto.js:71`) e um link morto no rodapé (`assets/js/layout.js:64`). Objetivo: dar à cliente conta própria e um guia de medidas útil na página do produto.

## Metas
1. **Guia de medidas na página do produto** — painel lateral aberto pelo link "Guia de medidas":
   - tabela do tipo de peça (vestidos/blusas/conjuntos: busto, cintura, quadril; saias/calças: cintura, quadril; acessórios: sem guia);
   - ilustração simples "como medir" (SVG inline/arquivo, sem texto em imagem);
   - "Descubra seu tamanho": a cliente digita as medidas e o site indica o tamanho;
   - cliente logada com medidas salvas vê "Seu tamanho: X" junto dos tamanhos.
   - Valores da tabela são ilustrativos e ficam num único lugar fácil de editar.
   - O link "Guia de medidas" do rodapé abre a mesma tabela numa página própria (`medidas.html`).
2. **Login** em `conta.html`: abas Entrar / Criar conta / Esqueci a senha. O ícone de pessoa do topo leva para lá.
3. **Cadastro**: nome, e-mail, senha, telefone e aceite da política de privacidade (LGPD). Confirmação por e-mail do Supabase. CPF não é pedido no cadastro.
4. **Minha conta** (mesma página, quando logada): dados pessoais editáveis, minhas medidas, endereços (adicionar/editar/remover), meus pedidos, sair, e instrução de como pedir exclusão da conta.

## Não-metas
- Excluir a conta pelo site (precisa de função no servidor).
- Login com Google/social.
- Checkout/pagamento.

## Anti-metas
- Cliente conseguir virar admin ou ler dados de outra cliente.
- Guardar senha, token ou dado pessoal fora do Supabase Auth/tabelas com RLS (no modo demo, só localStorage local, com aviso de demonstração).
- Quebrar o login da dona em `admin.html`.

## Restrições
- Site estático (HTML/CSS/JS puro), padrão de uma página por assunto, sem build e sem dependência nova.
- CSP em `_headers`/`vercel.json`: sem scripts/handlers inline.
- Banco já tem `profiles` (full_name, phone, cpf, role), `addresses`, `favorites`, `orders` com RLS. Só falta guardar as medidas: migração nova, não aplicada (o conector do Supabase daqui não tem acesso ao projeto).
- Tudo precisa funcionar em modo demonstração (sem `supabaseUrl`) para teste no localhost.
- Tema claro/escuro, acessibilidade (teclado, foco, rótulos), celular.

## Abordagens
- **A (escolhida): páginas próprias** — `conta.html` (login/cadastro/perfil) e `medidas.html`, seguindo o padrão multipágina do site.
- B: login em modal sobre qualquer página — mais código e mais cuidado com CSP/foco, sem ganho real para a cliente.

## Deixado para quem implementa
Layout visual dentro do design system atual, nomes de funções em `store.js`, regra exata de recomendação de tamanho (ex.: maior tamanho entre as medidas informadas), textos de interface.
