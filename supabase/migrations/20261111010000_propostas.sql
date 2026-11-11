-- =====================================================================
-- Lead Finder Cloud — propostas comerciais com valores
-- Rode no Supabase: SQL Editor > New query > Run (pode rodar mais de uma vez)
-- =====================================================================

alter table public.perfis add column if not exists whatsapp_vendedor text not null default '';
alter table public.perfis add column if not exists condicoes text not null default
  'Pagamento: 50% para começar e 50% na entrega (Pix ou cartão). Domínio .com.br e fotos profissionais não estão inclusos, salvo quando indicado no plano.';
alter table public.perfis add column if not exists validade_dias integer not null default 7 check (validade_dias between 1 and 90);
alter table public.perfis add column if not exists planos jsonb not null default '[
  {"nome":"Essencial","preco":497,"parcelas":"ou 3x de R$ 175","prazo":"5 dias úteis","destaque":false,
   "itens":["Site de uma página com a cara do seu negócio","Suas fotos, serviços e preços","Botão direto para o WhatsApp","Mapa e endereço","Funciona bem no celular","Publicação incluída"]},
  {"nome":"Profissional","preco":897,"parcelas":"ou 3x de R$ 315","prazo":"7 dias úteis","destaque":true,
   "itens":["Tudo do Essencial","Domínio próprio .com.br por 1 ano","Galeria de fotos e cardápio/tabela completa","Ajuste do seu perfil no Google","2 rodadas de ajustes"]},
  {"nome":"Manutenção mensal","preco":59,"parcelas":"por mês (opcional)","prazo":"","destaque":false,
   "itens":["Site sempre no ar","Troca de textos, preços e fotos","Suporte pelo WhatsApp"]}
]'::jsonb;

alter table public.leads add column if not exists proposta_visualizacoes integer not null default 0;
alter table public.leads add column if not exists proposta_ultima_visualizacao timestamptz;

-- Página pública da proposta: mesma regra da demo (slug exato + demo publicada).
-- Devolve só dados públicos da empresa e os planos/contato de quem vende.
create or replace function public.proposta_publica(p_slug text, p_contar boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.leads%rowtype;
  v public.perfis%rowtype;
begin
  if p_slug is null or length(p_slug) < 8 then
    return null;
  end if;
  select * into r from public.leads where slug = p_slug and demo_publicada;
  if not found then
    return null;
  end if;
  select * into v from public.perfis where user_id = r.user_id;

  if p_contar then
    update public.leads
       set proposta_visualizacoes = proposta_visualizacoes + 1, proposta_ultima_visualizacao = now()
     where id = r.id;
  end if;

  return jsonb_build_object(
    'slug', r.slug, 'nome', r.nome, 'nicho', r.nicho, 'bairro', r.bairro, 'cidade', r.cidade,
    'nota', r.nota, 'avaliacoes', r.avaliacoes, 'status_site', r.status_site,
    'vendedor', jsonb_build_object(
      'nome', coalesce(v.nome_vendedor, ''), 'whatsapp', coalesce(v.whatsapp_vendedor, ''),
      'planos', coalesce(v.planos, '[]'::jsonb), 'condicoes', coalesce(v.condicoes, ''),
      'validade_dias', coalesce(v.validade_dias, 7)
    )
  );
end;
$$;

revoke all on function public.proposta_publica(text, boolean) from public;
grant execute on function public.proposta_publica(text, boolean) to anon, authenticated;
