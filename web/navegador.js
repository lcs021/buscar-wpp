import { montarLead, digitos } from './shared.js';

// A extensão só recebe critérios e dados públicos. Tokens ficam exclusivamente em sb.js.
export function chamarExtensao(acao, dados = {}, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const sair = () => { clearTimeout(timer); window.removeEventListener('message', receber); };
    const receber = (ev) => {
      if (ev.source !== window || ev.origin !== location.origin || ev.data?.canal !== 'LF_EXT_RESPOSTA' || ev.data.id !== id) return;
      sair();
      const r = ev.data.resposta;
      r?.erro ? reject(new Error(r.erro)) : resolve(r?.dados);
    };
    const timer = setTimeout(() => { sair(); reject(new Error('Extensão não conectada. Baixe e instale a extensão, depois recarregue este painel.')); }, timeout);
    window.addEventListener('message', receber);
    window.postMessage({ canal: 'LF_EXT_PEDIDO', id, acao, dados }, location.origin);
  });
}
const telefoneChave = (t) => {
  const d = digitos(t); return d.startsWith('55') && [12, 13].includes(d.length) ? d.slice(2) : d;
};
const nomeChave = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

export function prepararCandidatos(empresas, perfil, form, existentes = []) {
  const chaves = new Set(existentes.map(l => `${nomeChave(l.nome)}|${telefoneChave(l.telefone)}`));
  const linhas = [];
  for (const c of (Array.isArray(empresas) ? empresas : []).slice(0, 60)) {
    if (!c || typeof c.nome !== 'string' || !c.nome.trim() || typeof c.telefone !== 'string') continue;
    const tel = telefoneChave(c.telefone);
    if (!/^\d{10,11}$/.test(tel) || c.temSite !== false || c.temAgenda !== false || c.fechada !== false) continue;
    if (!Number.isFinite(c.nota) || c.nota < Number(perfil.nota_minima ?? 4.5) || c.nota > 5
      || !Number.isInteger(c.avaliacoes) || c.avaliacoes < Number(perfil.avaliacoes_minimas ?? 20)) continue;
    let u;
    try { u = new URL(c.maps_url); } catch { continue; }
    if (u.protocol !== 'https:' || !['www.google.com', 'www.google.com.br'].includes(u.hostname) || !u.pathname.startsWith('/maps/')) continue;
    const chave = `${nomeChave(c.nome)}|${tel}`;
    if (chaves.has(chave)) continue;
    chaves.add(chave);
    const l = montarLead({ nome: c.nome.trim().slice(0, 200), telefone: tel,
      categoria: String(c.categoria || '').slice(0, 120), endereco: String(c.endereco || '').slice(0, 500),
      cidade: form.cidade, uf: form.uf, bairro: form.bairro, nota: c.nota, avaliacoes: c.avaliacoes,
      maps_url: u.href, status_site: 'sem_site', origem: `navegador:${[form.tipo, form.cidade, form.uf].join(' ')}` }, perfil);
    // Ausência do botão Site é um sinal, não uma confirmação. A revisão libera a fila.
    linhas.push({ ...l, qualificado: false, motivo: 'Conferência pendente: nenhum botão de site ou agenda foi identificado na ficha. Confira no Google e confirme sem site para liberar a fila.' });
  }
  return linhas;
}
