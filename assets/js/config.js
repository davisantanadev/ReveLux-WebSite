/* Rêve Lux — configuração
   A chave "publishable" (antiga "anon") é PÚBLICA por definição: pode ficar no site.
   Quem protege os dados são as políticas RLS em supabase/migrations/.
   NUNCA coloque aqui a chave "secret"/"service_role" nem a senha do banco.
   Para rodar em modo demonstração (sem banco), deixe supabaseUrl vazio. */
window.RL_CONFIG = Object.freeze({
  supabaseUrl: 'https://pfzuuypvagzztfpwjqyz.supabase.co',
  supabaseAnonKey: 'sb_publishable_nB8o4VEbkcJjAOpsF0a6Ww_1jh1tcYS',
  storageBucket: 'product-images',
  installments: 6,      // parcelas sem juros
  pixDiscount: 0.05,    // 5% no Pix
  freeShippingFrom: 299,
  adminIdleMinutes: 30, // painel encerra a sessão após 30 min sem uso
});
