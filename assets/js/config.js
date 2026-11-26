/* Rêve Lux — configuração
   Preencha com os dados do seu projeto Supabase (Settings → API) para usar o banco real.
   Com os campos vazios, o site roda em "modo demonstração": produtos, sacola e favoritos
   ficam salvos só no navegador (localStorage).

   A chave "anon" é pública por definição: a segurança vem das políticas RLS
   definidas em supabase/schema.sql. NUNCA coloque aqui a chave "service_role". */
window.RL_CONFIG = {
  supabaseUrl: '',      // ex.: 'https://abcd1234.supabase.co'
  supabaseAnonKey: '',  // ex.: 'eyJhbGciOi...'
  storageBucket: 'product-images',
  installments: 6,      // parcelas sem juros
  pixDiscount: 0.05,    // 5% no Pix
  freeShippingFrom: 299,
  whatsapp: '',         // ex.: '5511900000000'
};
