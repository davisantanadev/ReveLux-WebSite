-- Rêve Lux — fotos dos produtos (assets/img/produtos/).
-- Só atualiza onde `images` ainda é o valor original do seed (000002): não sobrescreve fotos
-- cadastradas pelo painel. Caminhos relativos "assets/..." passam em public.validate_product (000001).
-- Idempotente: depois de aplicada, a condição deixa de casar.
update public.products set images = array['assets/img/hero/slide-1.jpg','assets/img/produtos/vestido-aurora-midi-2.jpg']::text[]
  where id = 'vestido-aurora-midi' and images = array['assets/img/hero/slide-1.jpg']::text[];
update public.products set images = array['assets/img/hero/slide-2.jpg','assets/img/produtos/conjunto-perola-linho-2.jpg']::text[]
  where id = 'conjunto-perola-linho' and images = array['assets/img/hero/slide-2.jpg']::text[];
update public.products set images = array['assets/img/hero/slide-3.jpg','assets/img/produtos/vestido-lumiere-longo-2.jpg']::text[]
  where id = 'vestido-lumiere-longo' and images = array['assets/img/hero/slide-3.jpg']::text[];
update public.products set images = array['assets/img/produtos/saia-plissada-nude-1.jpg','assets/img/produtos/saia-plissada-nude-2.jpg']::text[]
  where id = 'saia-plissada-nude' and images = array[]::text[];
update public.products set images = array['assets/img/produtos/calca-alfaiataria-areia-1.jpg']::text[]
  where id = 'calca-alfaiataria-areia' and images = array[]::text[];
update public.products set images = array['assets/img/produtos/body-renda-marfim-1.jpg']::text[]
  where id = 'body-renda-marfim' and images = array[]::text[];
update public.products set images = array['assets/img/produtos/kimono-cetim-rose-1.jpg']::text[]
  where id = 'kimono-cetim-rose' and images = array[]::text[];
update public.products set images = array['assets/img/produtos/colar-perolas-delicado-1.jpg']::text[]
  where id = 'colar-perolas-delicado' and images = array[]::text[];
