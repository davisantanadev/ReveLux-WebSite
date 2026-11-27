# Prompt único: imagens dos produtos, das categorias e do Instagram

Cole o bloco abaixo inteiro no **Google AI Studio** (Gemini / Imagen) ou no **Antigravity**. Ele pede todas as imagens de uma vez, com nome de arquivo, proporção e tamanho.

Depois, salve cada arquivo em `assets/img/` com o nome indicado e cadastre as fotos dos produtos pelo painel (`admin.html`, campo Fotos). As fotos de categoria e do Instagram precisam ser colocadas no código; se quiser, eu faço isso.

```
You are the art director and photographer for "Rêve Lux", a Brazilian women's fashion boutique (feminine, soft, quietly luxurious). Generate the image set below. Every image is a separate file, with no text, logos, watermarks or borders.

GLOBAL STYLE (applies to every image):
- Muted, airy palette: pearl, ivory, nude, champagne, sand, taupe, soft cocoa brown, touches of pale rose-gold. No vivid or neon pink, no saturated colors.
- Soft diffused natural daylight (or warm golden hour where noted), gentle shadows, fine film grain, editorial luxury campaign look, 85mm lens feel, shallow depth of field.
- Minimalist/abstract set dressing only: painted plaster arches, organic blob shapes on walls, thin rose-gold circles or lines, travertine blocks, ceramic vases, dried pampas grass, silk drapery. Lots of negative space.
- Models: adult women 25–40, varied Brazilian ethnicities and skin tones, natural skin texture, relaxed elegant poses, faces calm. Anatomically correct hands.
- Subject centered with generous margins (images are shown inside rounded/arched frames and may be cropped at the edges).
- Negative: vivid pink, neon, oversaturated, harsh flash, cluttered background, text, watermark, logo, distorted hands, extra fingers, deformed body, low resolution.

=== A) PRODUCT PHOTOS — vertical 3:4, 1536x2048 px ===

A1 · file: saia-plissada-nude-1.jpg
Woman wearing a nude-blush pleated midi skirt with elastic waistband, tucked-in ivory fitted knit top, beige strappy sandals. Mid-step turn so the pleats flare softly. Warm ivory plaster wall with a large pale nude arch painted behind her. Full body.

A2 · file: saia-plissada-nude-2.jpg
Still life of the same nude pleated midi skirt hanging on a slim wooden hanger against an ivory wall, pleats crisp, soft side light, a small ceramic vase with one pampas stem nearby. No people.

A3 · file: calca-alfaiataria-areia-1.jpg
Woman in sand-colored high-waisted tailored trousers with front pleats and straight leg, cream silk camisole, thin gold necklace, hands lightly in pockets, confident relaxed stance. Seamless warm sand backdrop with a thin rose-gold circle line floating behind. Full body.

A4 · file: calca-alfaiataria-areia-2.jpg
Close-up detail of the sand tailored trousers: waistband, front pleat and button, fabric texture, model's hand resting at the hip. Soft daylight.

A5 · file: body-renda-marfim-1.jpg
Woman wearing an ivory lace long-sleeve bodysuit with delicate floral lace, tucked into high-waisted champagne satin trousers, framed from head to mid-thigh, one hand touching her hair. Soft window light, ivory wall with organic nude blob shapes. Tasteful, elegant, not revealing.

A6 · file: body-renda-marfim-2.jpg
Flat lay of the ivory lace bodysuit on a champagne silk cloth, with pearl earrings and a small rose-gold ring beside it, top-down view, soft even light. No people.

A7 · file: kimono-cetim-rose-1.jpg
Woman wearing a soft dusty-rose satin kimono with wide sleeves and a waist sash, worn open over an ivory slip dress, arms slightly lifted so the sleeves drape beautifully. Warm taupe backdrop with golden-hour light glow. Full body.

A8 · file: kimono-cetim-rose-2.jpg
Back view of the same dusty-rose satin kimono on the model, sash tied at the waist, satin catching the light, minimal ivory background.

A9 · file: colar-perolas-delicado-1.jpg
Close-up portrait crop (chin to chest) of a woman wearing a delicate gold chain necklace with small pearls over a champagne silk blouse with open collar. Soft light, skin natural, shallow depth of field.

A10 · file: colar-perolas-delicado-2.jpg
Product still life: the delicate pearl and gold necklace arranged on a travertine stone block next to a small ceramic dish, soft shadow, ivory background, macro detail. No people.

A11 · file: vestido-aurora-midi-2.jpg
Back view of a woman in a pearl-white satin bias-cut midi slip dress with thin straps, looking over her shoulder, soft ivory room, pale nude arch on the wall.

A12 · file: conjunto-perola-linho-2.jpg
Seated pose: woman in a beige-pearl linen cropped shirt and wide-leg trousers set, sitting on a travertine bench, legs crossed, warm afternoon sun, pampas grass in a vase.

A13 · file: vestido-lumiere-longo-2.jpg
Full-length view of a woman in a long champagne satin slip gown with cowl neckline walking toward the camera, fabric flowing, deep warm taupe background with a soft glowing circle of light, tiny four-pointed sparkle highlights.

A14 · file: blusa-seda-champagne-2.jpg
Woman wearing a champagne silk button-up blouse half-tucked into sand tailored trousers, sleeves slightly rolled, leaning against an ivory plaster wall, relaxed and polished. Head to knees.

=== B) CATEGORY TILES — square 1:1, 1200x1200 px (shown as circles: keep the subject inside the central circle) ===

B1 · file: cat-vestidos.jpg — a pearl satin dress hanging on a wooden hanger against an ivory wall with a nude arch.
B2 · file: cat-conjuntos.jpg — folded beige linen shirt and trousers set stacked neatly on a travertine block.
B3 · file: cat-blusas.jpg — a champagne silk blouse draped over a minimal chair back, soft light.
B4 · file: cat-saias.jpg — a nude pleated skirt laid in a soft swirl on ivory linen, top-down.
B5 · file: cat-calcas.jpg — sand tailored trousers folded over a slim brass rail, minimal wall.
B6 · file: cat-acessorios.jpg — pearl necklace, gold hoop earrings and a rose-gold ring on a ceramic dish, macro.

=== C) INSTAGRAM GRID — square 1:1, 1080x1080 px ===

C1 · file: insta-1.jpg — mirror selfie mood (phone not visible) of a woman in a champagne slip dress in an ivory room, candid and soft.
C2 · file: insta-2.jpg — close-up of hands tying a satin sash, rose-gold ring, shallow focus.
C3 · file: insta-3.jpg — boutique detail: a rail of neutral-tone garments (ivory, nude, sand, champagne) on wooden hangers, soft light.
C4 · file: insta-4.jpg — flat lay: linen shirt, pearl earrings, sunglasses, a ceramic cup of coffee on travertine, top-down.
C5 · file: insta-5.jpg — woman laughing while walking outdoors on a sunny Brazilian city sidewalk with warm stone walls, wearing the beige linen set.
C6 · file: insta-6.jpg — gift packaging: an ivory box with a nude satin ribbon and a small dried flower sprig, soft shadow.

Output each image separately, labeled with its file name.
```

## Onde cada imagem entra
| Arquivos | Onde usar |
|---|---|
| A1–A14 | Painel → editar o produto → Fotos. A primeira foto é a capa; o `-2` entra como segunda foto, na galeria da página do produto |
| B1–B6 | Círculos de "Compre por categoria" na home |
| C1–C6 | Grade "Siga no Instagram" na home |

Se o gerador limitar a quantidade de imagens por pedido, envie o bloco GLOBAL STYLE junto com uma seção por vez (A, B, C).
