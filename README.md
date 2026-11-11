# Lead Finder Cloud

Sistema na nuvem para prospectar comércios sem site:

1. **Busca empresas** no Google (Places API oficial) por tipo, cidade e bairro.
2. **Qualifica** sozinho: nota alta + muitas avaliações + falha na presença digital (sem site, só Instagram/Facebook/WhatsApp, só link de iFood/cardápio/agenda).
3. **Monta um site demo** para cada empresa, com o tema do nicho (barbearia, oficina, pizzaria, pet, dentista…), com link público e faixa "DEMONSTRAÇÃO".
4. **Fila de envio no WhatsApp**: a mensagem personalizada já vem com o link do site. Um clique abre o WhatsApp com tudo pronto, você aperta enviar, e o sistema marca como enviado e pula para a próxima empresa.
5. **Avisa quem abriu o site demo**, com quantas vezes e quando. É a hora certa de chamar de novo.

Tudo roda no Supabase (banco, login e busca) e numa hospedagem grátis de site estático (Netlify). Não precisa instalar nada no computador.

---

## Passo a passo (pelo navegador, ~20 minutos)

### 1. Criar o projeto no Supabase
1. Crie uma conta em https://supabase.com e clique em **New project**. Guarde a senha do banco.
2. Espere o projeto ficar pronto (1 a 2 minutos).

### 2. Criar o banco
1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Abra o arquivo `supabase/migrations/20261111000000_lead_finder.sql`, copie tudo, cole e clique em **Run**.
   Tem que aparecer *Success*. Pode rodar de novo sem problema.

### 2b. Propostas com valores
Rode também `supabase/migrations/20261111010000_propostas.sql` no SQL Editor. Ele cria os campos de planos, preços e condições usados na página de proposta.

### 3. Criar seu usuário
1. **Authentication > Users > Add user > Create new user**: coloque seu e-mail e uma senha, marque **Auto Confirm User**.
2. Recomendado: em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**. Assim só você entra.

### 4. Chave do Google (opcional)
Sem ela o sistema funciona do mesmo jeito: você usa **Adicionar empresas** (cadastro manual ou importação de planilha CSV) em vez da busca automática. Para ligar a busca automática depois:

1. Em https://console.cloud.google.com crie um projeto, ative a **Places API (New)** (precisa de faturamento ativo; o Google dá uma cota grátis por mês) e crie uma **chave de API**.
2. No Supabase: **Edge Functions > Secrets > Add new secret**
   - Nome: `GOOGLE_PLACES_API_KEY`
   - Valor: a sua chave

### 5. Publicar a função de busca
1. **Edge Functions > Deploy a new function > Via Editor**.
2. Nome da função: `buscar-empresas` (exatamente assim).
3. Apague o código de exemplo, cole todo o conteúdo de `supabase/functions/buscar-empresas/index.ts` e clique em **Deploy**.
4. Na página da função, em **Details/Settings**, desligue **Enforce JWT Verification** e salve. A função já confere o seu login por conta própria.

### 6. Ligar o site ao seu projeto
1. **Project Settings > API Keys** (ou **Settings > API**): copie a **Project URL** e a chave **publishable** (ou a **anon public**, em projetos antigos).
2. Abra `web/config.js` num editor de texto (Bloco de Notas serve) e cole as duas. **Nunca** use a chave `secret`/`service_role`.

### 7. Colocar o painel no ar (grátis)
**Pelo GitHub Pages (já configurado neste repositório):** em *Settings > Pages*, escolha *Source: GitHub Actions*. A cada push na `main`, a pasta `web/` é publicada em `https://SEU_USUARIO.github.io/NOME_DO_REPO/`.

**Ou pelo Netlify:**
1. Entre em https://app.netlify.com/drop e arraste a pasta **`web`** inteira para a página.
2. O Netlify gera um endereço, tipo `https://nome-aleatorio.netlify.app`. Esse é o seu painel. Os links dos sites demo (`.../demo.html?s=...`) também usam esse endereço.
3. Dica: crie uma conta grátis no Netlify para o site não expirar e para trocar o nome do endereço (ex.: `seunome-sites.netlify.app`). Isso passa mais confiança no link.
4. Sempre que mudar algum arquivo, arraste a pasta `web` de novo em **Deploys**.

### 8. Usar
1. Entre no painel com o e-mail e a senha do passo 3.
2. **Configurações**: seu nome (vai na mensagem), cidade padrão, nota mínima e mínimo de avaliações.
3. **Buscar empresas**: escolha o tipo, a cidade e o bairro e clique em **PESQUISAR EMPRESAS**.
4. **Fila de envio**: revise a mensagem e o site ao lado, clique em **Enviar no WhatsApp e ir para a próxima**, e aperte enviar no WhatsApp.
5. **Dashboard**: acompanhe quem abriu o site demo e chame de novo.
6. **Propostas**: em *Configurações > Propostas e valores* defina seu WhatsApp, os planos, preços, prazos e o que cada um inclui. Em cada empresa use *Ver proposta*, *Copiar link da proposta* ou *Enviar proposta*. O cliente vê os planos com a cara do site dele e o botão *Escolher este plano* abre o seu WhatsApp. O painel mostra quantas vezes a proposta foi aberta.
7. **Melhorar mensagem**: na fila e nos detalhes da empresa, troque o estilo com um clique: *Curta e direta*, *Elogio primeiro*, *Pedir permissão (sem link)*, *Mostrar o ganho*, e as de acompanhamento (*Cobrar resposta*, *Depois que abriu o site*, *Quando perguntar o preço*). Todas começam com bom dia/boa tarde/boa noite conforme o horário.

---

## Por que o envio não é 100% automático

O WhatsApp proíbe mensagens automáticas para quem nunca falou com você. Isso vale também para a API oficial, que exige que a pessoa tenha aceitado receber mensagens. Robôs não oficiais (que "clonam" o WhatsApp Web) costumam ter o número **banido** depois de poucas dezenas de mensagens frias. Por isso o sistema faz o máximo sem correr esse risco: escolhe a empresa, escreve o texto, cria e publica o site e abre a conversa pronta. Para você sobra só apertar enviar.

Dica: mande poucas por dia (10 a 20) e responda rápido quem retornar. Para telefone fixo, o painel mostra o botão **Ligar** no lugar do WhatsApp.

## O que fica guardado e o que é público

- Cada usuário só vê os próprios dados (Row Level Security no banco).
- Quem recebe o link vê **só aquela demo**, e só depois que ela é publicada. O site é publicado automaticamente quando você clica em enviar, ou manualmente na tela de detalhes. Observações, status e as outras empresas nunca aparecem.
- Os sites demo têm `noindex` (não aparecem no Google) e a faixa "DEMONSTRAÇÃO — não é o site oficial". Você pode tirar uma demo do ar a qualquer momento.
- Os sites usam só dados públicos da ficha do Google (nome, nota, avaliações, endereço e telefone). Serviços aparecem como "lista de exemplo" e as fotos ficam como espaço reservado para as fotos reais do cliente.

## Custos e limites

- **Supabase**: o plano grátis é suficiente. No plano grátis, o projeto **pausa após 7 dias sem uso**, e aí os links das demos param de abrir até você reativar no painel. Se for mandar links toda semana, use o painel com frequência ou considere o plano Pro.
- **Netlify**: grátis.
- **Google Places**: cada busca de até 20 empresas é uma chamada; 60 empresas são 3 chamadas. Como pedimos telefone e site, as chamadas entram na faixa mais cara da Text Search. Confira a cota grátis e os preços atuais em https://developers.google.com/maps/billing-and-pricing/pricing e defina um limite de gastos no Google Cloud.
- Os termos do Google Maps Platform limitam por quanto tempo dados do Places podem ser guardados. Use o sistema como lista de prospecção ativa e exclua leads antigos que você não for trabalhar.

## Estrutura

```
lead-finder-cloud/
├── supabase/
│   ├── migrations/20261111000000_lead_finder.sql   # tabelas, segurança (RLS) e a função pública da demo
│   ├── functions/buscar-empresas/index.ts          # busca no Google, qualificação, nicho, gravação sem duplicar
│   └── config.toml                                  # só para quem usar o CLI
└── web/                                             # painel + site demo (HTML/JS puro, sem build)
    ├── index.html, app.js, app.css                  # painel: dashboard, busca, fila, leads, configurações
    ├── demo.html                                    # página pública do site demo
    ├── shared.js                                    # temas dos nichos, site demo e texto da mensagem
    ├── sb.js                                        # conexão com o Supabase
    └── config.js                                    # SUA URL e chave pública
```

Para mudar o visual de um nicho, os serviços de exemplo ou o texto da mensagem, edite `web/shared.js` e publique a pasta `web` de novo.

## Opcional: pelo terminal (Supabase CLI)

```bash
supabase login
supabase link --project-ref SEU_REF
supabase db push
supabase secrets set GOOGLE_PLACES_API_KEY=sua_chave
supabase functions deploy buscar-empresas --no-verify-jwt
```

## Problemas comuns

- **"Falta configurar"** ao abrir o painel: o `web/config.js` não foi preenchido, ou a pasta foi publicada antes de você preencher.
- **"A função 'buscar-empresas' não foi encontrada"**: refaça o passo 5 com o nome exato.
- **"Invalid JWT"** na busca: desligue *Enforce JWT Verification* na função (passo 5.4).
- **"O Google recusou a chave"**: confira o segredo `GOOGLE_PLACES_API_KEY` e se ativou a *Places API (New)*, não a antiga.
- **"permission denied for table"**: rode o SQL do passo 2 de novo (ele libera as tabelas para usuários logados).
- **Link da demo diz "não está disponível"**: a demo ainda não foi publicada (clique em *Publicar demo*), ou o projeto do Supabase está pausado.
