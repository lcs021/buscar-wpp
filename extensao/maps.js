// Só lê a página pública já aberta. Não acessa APIs internas nem resolve verificações.
(() => {
  const texto = (el) => (el?.textContent || '').trim();
  function bloqueio() {
    const t = texto(document.body);
    if (/tráfego incomum|unusual traffic|não sou um robô|not a robot/i.test(t) || document.querySelector('iframe[src*="recaptcha"], #captcha-form')) return 'O Google pediu uma verificação. A pesquisa foi parada. Resolva na aba e comece uma nova busca.';
    if (/Before you continue to Google|Antes de (?:continuar|prosseguir) (?:para|no) Google/i.test(t)) return 'O Google pediu consentimento. Escolha na aba do navegador e depois inicie a busca novamente.';
    return '';
  }
  function ficha() {
    const h = document.querySelector('h1.DUwDvf, [role="main"] h1');
    if (!h || document.querySelector('[role="feed"]')) return null;
    const nome = texto(h);
    const telefone = document.querySelector('button[data-item-id^="phone:tel:"]');
    const endereco = document.querySelector('[data-item-id="address"]');
    // Exige uma ficha carregada: um título isolado nunca prova ausência de site.
    if (!nome || (!telefone && !endereco) || !document.querySelector('[role="tablist"], [data-item-id="authority"], .F7nice')) return null;
    const painel = h.closest('[role="main"]') || document;
    const notaEl = painel.querySelector('.F7nice span[aria-hidden="true"]');
    const notaTexto = texto(notaEl);
    const nota = /^\d[.,]\d$/.test(notaTexto) ? Number(notaTexto.replace(',', '.')) : null;
    const avalEl = [...painel.querySelectorAll('.F7nice [aria-label]')].find(el => /avaliaç|reviews?/i.test(el.getAttribute('aria-label')));
    const avTexto = avalEl?.getAttribute('aria-label') || '';
    const avMatch = avTexto.match(/([\d.,\s]+)\s*(?:avaliaç|reviews?)/i);
    const avaliacoes = avMatch ? Number(avMatch[1].replace(/\D/g, '')) : null;
    const autoridade = painel.querySelector('a[data-item-id="authority"], [data-item-id="authority"] a');
    const acoes = [...painel.querySelectorAll('a,button')].map(el => `${el.getAttribute('aria-label') || ''} ${texto(el)}`).join('\n');
    const corpo = texto(painel);
    return { nome, telefone: telefone?.getAttribute('data-item-id')?.replace(/^phone:tel:/, '') || '',
      endereco: texto(endereco?.querySelector('.Io6YTe')) || (endereco?.getAttribute('aria-label') || '').replace(/^(?:Endereço|Address):\s*/i, ''),
      categoria: texto(painel.querySelector('button.DkEaL')), nota, avaliacoes,
      temSite: !!autoridade || !!painel.querySelector('[data-item-id*="website"], a[aria-label^="Site:"], a[aria-label^="Website:"]'),
      temAgenda: /agendar|reservar (?:uma |um )?(?:mesa|horário)|pedir (?:on-?line|agora)|fazer pedido|order online|book (?:online|appointment)|reserve a table/i.test(acoes),
      fechada: /(?:temporariamente|permanentemente) fechad|fechad[oa] (?:temporária|permanente)|(?:temporarily|permanently) closed/i.test(corpo),
      maps_url: location.href };
  }
  chrome.runtime.onMessage.addListener((m, _sender, responder) => {
    if (!['COLETAR', 'LER'].includes(m.acao)) return;
    const b = bloqueio(); if (b) { responder({ bloqueio: b }); return; }
    if (m.acao === 'LER') {
      // Evita ler os dados antigos durante a troca de uma ficha para outra.
      if (m.esperado && location.href !== m.esperado) {
        try {
          // O Maps acrescenta @coordenadas/data na navegação. Compare apenas o nome da ficha.
          const fichaUrl = (url) => decodeURIComponent(new URL(url).pathname.split('/')[3] || '').replace(/\+/g, ' ');
          if (fichaUrl(location.href) !== fichaUrl(m.esperado)) { responder({ aguardar: true }); return; }
        } catch { responder({ aguardar: true }); return; }
      }
      const empresa = ficha(); responder(empresa ? { empresa } : { aguardar: true }); return;
    }
    const feed = document.querySelector('[role="feed"]');
    if (!feed) {
      const empresa = ficha();
      if (/Nenhum resultado|No results found/i.test(texto(document.body))) responder({ links: [], fim: true });
      else responder(empresa ? { empresa } : { aguardar: true });
      return;
    }
    const links = [...feed.querySelectorAll('a[href*="/maps/place/"]')].map(el => el.href);
    const fim = /chegou ao (?:final|fim)|reached the end/i.test(texto(feed));
    feed.scrollBy({ top: Math.max(600, feed.clientHeight), behavior: 'instant' });
    responder({ links, fim });
  });
})();
