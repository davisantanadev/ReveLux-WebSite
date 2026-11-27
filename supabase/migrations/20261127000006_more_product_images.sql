-- Rêve Lux — segunda foto (e capa da blusa) dos produtos restantes (assets/img/produtos/).
-- Só atualiza onde `images` ainda é o valor original do seed (000002) OU o valor definido pela 000005,
-- então funciona aplicada antes ou depois da 000005 e não sobrescreve fotos cadastradas pelo painel.
-- Caminhos relativos "assets/..." passam em public.validate_product (000001). Idempotente: depois de aplicada, a condição deixa de casar.
update public.products set images = array['assets/img/produtos/calca-alfaiataria-areia-1.jpg','assets/img/produtos/calca-alfaiataria-areia-2.jpg']::text[]
  where id = 'calca-alfaiataria-areia'
    and images in (array[]::text[], array['assets/img/produtos/calca-alfaiataria-areia-1.jpg']::text[]);
update public.products set images = array['assets/img/produtos/body-renda-marfim-1.jpg','assets/img/produtos/body-renda-marfim-2.jpg']::text[]
  where id = 'body-renda-marfim'
    and images in (array[]::text[], array['assets/img/produtos/body-renda-marfim-1.jpg']::text[]);
update public.products set images = array['assets/img/produtos/kimono-cetim-rose-1.jpg','assets/img/produtos/kimono-cetim-rose-2.jpg']::text[]
  where id = 'kimono-cetim-rose'
    and images in (array[]::text[], array['assets/img/produtos/kimono-cetim-rose-1.jpg']::text[]);
update public.products set images = array['assets/img/produtos/colar-perolas-delicado-1.jpg','assets/img/produtos/colar-perolas-delicado-2.jpg']::text[]
  where id = 'colar-perolas-delicado'
    and images in (array[]::text[], array['assets/img/produtos/colar-perolas-delicado-1.jpg']::text[]);
-- Blusa: o seed usava a foto 4 do carrossel do hero; agora tem capa própria + segunda foto.
update public.products set images = array['assets/img/produtos/blusa-seda-champagne-1.jpg','assets/img/produtos/blusa-seda-champagne-2.jpg']::text[]
  where id = 'blusa-seda-champagne'
    and images = array['assets/img/hero/slide-4.jpg']::text[];
