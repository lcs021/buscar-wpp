// Ponte isolada: não lê login, cookies, senha nem tokens do sistema.
(() => {
  if (!/^\/buscar-wpp\/(?:index\.html)?$/.test(location.pathname)) return;
  window.addEventListener('message', async (event) => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.canal !== 'LF_EXT_PEDIDO' || typeof m.id !== 'string') return;
    if (!['PING', 'START', 'STATUS', 'CANCEL', 'ACK'].includes(m.acao)) return;
    try {
      const resposta = await chrome.runtime.sendMessage({ acao: m.acao, dados: m.dados });
      window.postMessage({ canal: 'LF_EXT_RESPOSTA', id: m.id, resposta }, location.origin);
    } catch {
      window.postMessage({ canal: 'LF_EXT_RESPOSTA', id: m.id, resposta: { erro: 'Recarregue o painel para conectar a extensão.' } }, location.origin);
    }
  });
})();
