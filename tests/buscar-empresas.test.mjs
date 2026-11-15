import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarSite, qualificar, pesquisarPlaces, executarBusca, handler } from '../supabase/functions/buscar-empresas/index.ts';

const criterios = { nota_minima: 4.5, avaliacoes_minimas: 20 };
const place = (id, extra = {}) => ({ id, displayName: { text: `Barbearia ${id}` },
  rating: 4.8, userRatingCount: 35, nationalPhoneNumber: '(21) 99999-1234',
  businessStatus: 'OPERATIONAL', ...extra });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
function mockFetch(t, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => { globalThis.fetch = original; });
}

test('classifica pelo domínio real e exclui URLs incertas e agregadores', () => {
  for (const [url, status] of [
    ['', 'sem_site'], ['https://www.instagram.com/barbearia', 'instagram'],
    ['https://m.facebook.com/barbearia', 'facebook'], ['https://wa.me/5521999991234', 'whatsapp'],
    ['https://api.whatsapp.com/send?phone=5521999991234', 'whatsapp'],
    ['https://foo.booksy.com', 'link_agregador'], ['https://ifood.com.br/loja', 'link_agregador'],
    ['https://linktr.ee/loja', 'link_agregador'], ['https://sites.google.com/view/loja', 'link_agregador'],
    ['https://empresa.com/instagram.com', 'com_site'], ['https://instagram.com.empresa.com', 'com_site'],
    ['https://empresa.com/?destino=wa.me', 'com_site'], ['???', 'com_site'],
  ]) assert.equal(classificarSite(url).status_site, status, url);
  assert.equal(classificarSite('https://wa.me/5521999991234').whatsapp, '5521999991234');
  assert.equal(qualificar({ status_site: 'incerto', nota: 4.8, avaliacoes: 30, telefone: '123', whatsapp: '' }, criterios).qualificado, false);
});

test('continua nas próximas páginas quando as primeiras empresas têm site e limita chamadas', async (t) => {
  const bodies = [];
  mockFetch(t, async (_url, init) => {
    const body = JSON.parse(init.body); bodies.push(body);
    return bodies.length === 1
      ? json({ places: [place('com-site', { websiteUri: 'https://exemplo.com' }), place('fechada', { businessStatus: 'CLOSED_TEMPORARILY' })], nextPageToken: 'pagina2' })
      : json({ places: [place('sem-site')], nextPageToken: 'pagina2' });
  });
  const r = await pesquisarPlaces('key', 'barbearias', 'Nova Iguaçu', 'RJ', '', 1, criterios, async () => {});
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].pageToken, 'pagina2');
  assert.equal(r.analisadas, 3);
  assert.equal(r.empresas.filter(e => e.qualificado && e.status_negocio === 'OPERATIONAL').length, 1);
});

test('no máximo três páginas, com deduplicação por place_id', async (t) => {
  let chamadas = 0;
  mockFetch(t, async () => json({ places: [place('mesma', { websiteUri: 'https://site.com' })], nextPageToken: `t${++chamadas}` }));
  const r = await pesquisarPlaces('key', 'lojas', 'Rio', 'RJ', '', 60, criterios, async () => {});
  assert.equal(chamadas, 3);
  assert.equal(r.analisadas, 1);
});

test('cadastra apenas qualificadas e preserva descartes, contato, mensagens e demo retirada', async (t) => {
  const existentes = [
    { place_id: 'contatada', id: '1', status: 'enviado', status_site: 'sem_site', mensagem: 'Minha mensagem', demo_publicada: false, qualificado: true },
    { place_id: 'manual', id: '2', status: 'descartado', status_site: 'com_site', qualificado: false },
    { place_id: 'ganhou-site', id: '3', status: 'novo', status_site: 'sem_site', demo_publicada: true, qualificado: true },
    { place_id: 'fechou', id: '4', status: 'novo', status_site: 'sem_site', demo_publicada: true, qualificado: true },
  ];
  const writes = [];
  mockFetch(t, async (input, init = {}) => {
    const url = new URL(input);
    if (url.hostname === 'places.googleapis.com') return json({ places: [
      place('nova'), place('contatada'), place('manual'), place('ganhou-site', { websiteUri: 'https://proprio.com' }),
      place('fechou', { businessStatus: 'CLOSED_PERMANENTLY' }), place('agenda', { websiteUri: 'https://booksy.com/agenda' }),
      place('nota-baixa', { rating: 3 }), place('sem-tel', { nationalPhoneNumber: '' }),
      place('incerta', { businessStatus: undefined }),
    ] });
    if (url.pathname === '/auth/v1/user') return json({ id: 'dono' });
    if (url.pathname === '/rest/v1/perfis') return json([criterios]);
    if (!init.method) return json(existentes);
    const body = JSON.parse(init.body); writes.push({ url, body, method: init.method, headers: init.headers });
    if (url.pathname === '/rest/v1/buscas') return new Response(null, { status: 204 });
    if (init.method === 'PATCH') {
      const antigo = existentes.find(e => `eq.${e.place_id}` === url.searchParams.get('place_id'));
      Object.assign(antigo, body); return json([antigo]);
    }
    return json(body.map(e => ({ ...e, id: 'nova-id', slug: 'abcdefghij', status: 'novo', demo_publicada: false, mensagem: null })));
  });
  const r = await executarBusca({ url: 'https://supabase.test', apikey: 'anon', auth: 'Bearer user' }, 'google-key',
    { tipo: 'barbearias', cidade: 'Nova Iguaçu', uf: 'RJ', quantidade: 10 }, async () => {});
  assert.equal(r.novos, 1);
  assert.equal(r.qualificados, 2);
  assert.equal(r.analisadas, 9);
  assert.equal(r.ignoradas, 1);
  const insert = writes.find(w => w.method === 'POST' && w.url.pathname.endsWith('/leads'));
  assert.deepEqual(insert.body.map(e => e.place_id), ['nova']);
  assert.match(insert.headers.Prefer, /ignore-duplicates/);
  assert.equal(existentes[0].mensagem, 'Minha mensagem');
  assert.equal(existentes[0].status, 'enviado');
  assert.equal(existentes[0].demo_publicada, false);
  assert.equal(existentes[1].status_site, 'com_site');
  assert.equal(existentes[2].qualificado, false);
  assert.equal(existentes[2].demo_publicada, false);
  assert.equal(existentes[3].qualificado, false);
  assert.equal(existentes[3].demo_publicada, false);
  assert.ok(r.leads.find(e => e.place_id === 'nova').slug);
});

test('falha do Google não vira sucesso nem grava no banco', async (t) => {
  let gravacoes = 0;
  mockFetch(t, async (input, init = {}) => {
    if (input.includes('/auth/v1/user')) return json({ id: 'dono' });
    if (input.includes('/rest/v1/perfis')) return json([criterios]);
    if (input.includes('places.googleapis.com')) return json({ error: { message: 'quota' } }, 429);
    if (init.method) gravacoes++;
    return json([]);
  });
  await assert.rejects(() => executarBusca({ url: 'https://supabase.test', apikey: 'anon', auth: 'Bearer user' }, 'key',
    { tipo: 'lojas', cidade: 'Rio', uf: 'RJ' }), /Limite de uso/);
  assert.equal(gravacoes, 0);
});

test('rejeita requisições sem sessão e explica configuração ausente', async () => {
  const semLogin = await handler(new Request('https://function.test', { method: 'POST' }), () => undefined);
  assert.equal(semLogin.status, 401);
  const semChave = await handler(new Request('https://function.test', { method: 'POST', headers: { Authorization: 'Bearer user' },
    body: JSON.stringify({ tipo: 'lojas', cidade: 'Rio', uf: 'RJ' }) }), () => undefined);
  assert.equal(semChave.status, 500);
  assert.match((await semChave.json()).erro, /GOOGLE_PLACES_API_KEY/);
});


test('meta limita novos cadastros sem criar duplicatas em buscas concorrentes', async (t) => {
  let chamadas = 0;
  mockFetch(t, async (input, init = {}) => {
    if (input.includes('/auth/v1/user')) return json({ id: 'dono' });
    if (input.includes('/rest/v1/perfis')) return json([criterios]);
    if (input.includes('places.googleapis.com')) return json({ places: [place('a'), place('b'), place('c')] });
    if (!init.method) return json([]);
    if (input.includes('/rest/v1/buscas')) return new Response(null, { status: 204 });
    chamadas++;
    const body = JSON.parse(init.body);
    assert.equal(body.length, 2);
    // Outra busca criou um dos registros entre o SELECT e o INSERT.
    return json([{ ...body[0], id: 'a', slug: 'abcdefghij' }]);
  });
  const r = await executarBusca({ url: 'https://supabase.test', apikey: 'anon', auth: 'Bearer user' }, 'key',
    { tipo: 'lojas', cidade: 'Rio', uf: 'RJ', quantidade: 2 });
  assert.equal(chamadas, 1);
  assert.equal(r.novos, 1);
  assert.equal(r.qualificados, 1);
});

test('cadastro normalizado usa demo e mensagens atuais sem preços no site', async () => {
  const { normalizar } = await import('../supabase/functions/buscar-empresas/index.ts');
  const { linkSite, mensagemEstilo, renderSite } = await import('../web/shared.js');
  const originalLocation = globalThis.location;
  globalThis.location = { href: 'https://lcs021.github.io/buscar-wpp/' };
  try {
    const lead = { ...normalizar(place('nova'), 'barbearias em Nova Iguaçu', 'barbearias', criterios), slug: 'abcdefghij' };
    const perfil = { nome_vendedor: 'Lucas', planos: [{ nome: 'Essencial', preco: 997, itens: ['Site completo'] }] };
    const link = linkSite(lead);
    assert.equal(link, 'https://lcs021.github.io/buscar-wpp/site.html?s=abcdefghij');
    const msg = mensagemEstilo('padrao', lead, perfil, link);
    assert.ok(msg.includes(lead.nome));
    assert.ok(msg.includes('Lucas'));
    assert.ok(msg.includes(link));
    assert.match(msg, /me desculpa/);
    assert.match(mensagemEstilo('proposta', lead, perfil, link), /997/);
    const html = renderSite(lead, { preview: true });
    assert.ok(html.includes(lead.nome));
    assert.match(html, /Não é o site oficial/);
    assert.match(html, /noindex/);
    assert.match(html, /ilustrativ/);
    assert.ok(!html.includes('997'));
  } finally { globalThis.location = originalLocation; }
});
