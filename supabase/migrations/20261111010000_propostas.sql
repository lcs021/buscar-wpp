-- =====================================================================
-- Lead Finder Cloud — planos e valores (usados só nas mensagens de WhatsApp)
-- Rode no Supabase: SQL Editor > New query > Run (pode rodar mais de uma vez)
-- =====================================================================

alter table public.perfis add column if not exists condicoes text not null default
  'Pagamento: 50% para começar e 50% na entrega (Pix ou cartão).';
alter table public.perfis add column if not exists validade_dias integer not null default 7 check (validade_dias between 1 and 90);
alter table public.perfis add column if not exists planos jsonb not null default '[
  {"nome":"Essencial","preco":497,"parcelas":"ou 3x de R$ 175","prazo":"5 dias úteis","destaque":false,
   "itens":["Site de uma página com a cara do seu negócio","Suas fotos, serviços e preços","Botão direto para o WhatsApp","Mapa e endereço","Funciona bem no celular","Publicação incluída"]},
  {"nome":"Profissional","preco":897,"parcelas":"ou 3x de R$ 315","prazo":"7 dias úteis","destaque":true,
   "itens":["Tudo do Essencial","Domínio próprio .com.br por 1 ano","Galeria de fotos e cardápio/tabela completa","Ajuste do seu perfil no Google","2 rodadas de ajustes"]},
  {"nome":"Manutenção mensal","preco":59,"parcelas":"por mês (opcional)","prazo":"","destaque":false,
   "itens":["Site sempre no ar","Troca de textos, preços e fotos","Suporte pelo WhatsApp"]}
]'::jsonb;

-- Os valores nunca ficam públicos: remove a página pública de proposta, se tiver sido criada antes.
drop function if exists public.proposta_publica(text, boolean);
