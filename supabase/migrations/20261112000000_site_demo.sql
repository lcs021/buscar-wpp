-- =====================================================================
-- Site próprio de cada lead (padrão "Site de 10K")
-- Rode no Supabase: Dashboard > SQL Editor > New query > Run. Pode rodar de novo sem problema.
-- =====================================================================
-- Endereço do site publicado para a empresa. Vazio = o painel usa o site gerado na hora (site.html?s=<slug>).
alter table public.leads add column if not exists site_demo text not null default '';
