# Rêve Lux · Moda Feminina

Protótipo **estático** da loja virtual Rêve Lux. Só HTML, CSS e JS puro, sem build e sem dependências. Os produtos são ilustrativos e as imagens são placeholders em gradiente.

> *Seu estilo, nossa essência ♡*

## Como rodar
Abra o `index.html` no navegador, ou sirva a pasta:
```bash
python3 -m http.server 8080
```
Também funciona direto no **GitHub Pages** (Settings → Pages → branch → `/root`).

## Estrutura
```
index.html            # Marcação de todas as seções
assets/css/style.css  # Tokens de design, temas claro/escuro e layout responsivo
assets/js/main.js     # Dados ilustrativos, tema, drawers, sacola visual, animações
assets/logo-revelux.jpg
docs/ARQUITETURA.md   # Mapa de frames/seções e decisões de design
docs/screenshots/     # Capturas desktop (claro/escuro) e mobile
```

## Identidade visual
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#f4eee9` pérola | `#16120f` | fundo |
| `--surface-2` | `#ebe2db` marfim | `#261f1b` | faixas e áreas de apoio |
| `--text` | `#2b2422` | `#f2e9e4` | texto |
| `--accent` | `#ad7d6e` rosé-gold suave | `#d4a998` | detalhes, preços no Pix, selos |

Tipografia: **Great Vibes** (script, como no logo), **Cormorant Garamond** (títulos) e **Jost** (texto e interface).
O rosa forte do logo virou um rosé-gold discreto, usado só como acento sobre uma base branca e pérola.

## Tema claro/escuro
- Segue o `prefers-color-scheme` do sistema e pode ser trocado pelo botão de sol/lua no header.
- A escolha fica salva no `localStorage` (`rl-theme`).
- A troca tem transição suave (`--t: .45s`) em fundo, texto, bordas e sombras.
- `prefers-reduced-motion` desliga as animações.

## O que funciona (só visualmente)
Busca (sem resultados), menu lateral no mobile, sacola lateral (adicionar e somar), favoritar, barra de avisos rotativa e aparição suave dos elementos ao rolar.
Não tem checkout, backend, filtros nem página de produto.

## Capturas
![Desktop claro](docs/screenshots/desktop-claro.png)
