# Arquitetura de layout

O pedido era se basear em `gabboss.stoqui.shop` (Stoqui) e `hippie-style-store.bagypro.com` (Bagy).
**A rede do ambiente de desenvolvimento bloqueou os dois domínios**, então não foi possível capturar os frames reais.
O layout segue a arquitetura padrão das vitrines Stoqui/Bagy, que esses temas compartilham. Para comparar seção por seção, adicione as capturas das referências em `docs/referencias/`.

## Frames da home, de cima para baixo
1. **Barra de avisos**: 3 mensagens rotativas (frete, parcelamento, Pix).
2. **Header fixo**: menu (mobile), logo, busca central, tema, conta, favoritos e sacola com contador.
3. **Menu de categorias**: cada item rola até a seção relacionada (Novidades, o círculo da categoria, que pisca em destaque, ou Mais vendidos).
4. **Hero em carrossel automático**: 4 slides que trocam a cada 6 s (pausa no hover), com setas ‹ › nas laterais, bolinhas, arraste no celular e altura que cabe na tela. As imagens ficam em `assets/img/hero/slide-N.jpg` (prompts em `docs/PROMPTS-HERO.md`).
5. **Faixa de benefícios**: frete, 6x sem juros, troca e segurança.
6. **Categorias em círculos**: 6 itens (3 por linha no mobile).
7. **Vitrine "Novidades"**: grade de 4 colunas (2 no mobile).
8. **Banners duplos**: "Festa & Noite" e "Básicos de Luxo".
9. **Vitrine "Mais vendidos"**.
10. **Manifesto da marca**: frase em itálico com assinatura em script.
11. **Depoimentos**: 3 cards com estrelas.
12. **Feed do Instagram**: 6 quadrados.
13. **Newsletter**: faixa escura com cupom de 10%.
14. **Rodapé**: marca e redes sociais, Institucional, Ajuda, Atendimento e Pagamento.
15. **Flutuantes**: botão de WhatsApp, menu lateral e sacola lateral.

## Anatomia do card de produto
Imagem 3:4 → selos (Novo / -%) → coração de favorito → botão "Adicionar" (aparece no hover; fixo no mobile) → nome → bolinhas de cor → preço "de/por" → "ou 6x de R$ X sem juros" → "R$ Y no Pix" (5% off).

## Breakpoints
- `>1024px`: 4 colunas
- `≤1024px`: 3 colunas, rodapé em 2 colunas
- `≤760px`: header compacto com menu lateral, 2 colunas, banners e depoimentos empilhados

## Próximos passos
Trocar os placeholders por fotos reais, criar a página de produto e de categoria e integrar com a plataforma (Stoqui, Bagy ou outra).
