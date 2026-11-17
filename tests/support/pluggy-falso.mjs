// Pluggy de mentira para os testes: as mesmas rotas que o BlueFin usa da API da Pluggy
// (POST /auth, GET /items/:id, GET /accounts, GET /v2/transactions), com o estado montado por cada teste em
// PUT /__teste/items/:id. Cada teste usa um item próprio, então os testes rodam em paralelo sem se misturar.
// Roda como um webServer do Playwright (playwright.config.ts), na porta PLUGGY_FALSO_PORTA (padrão 3199).
import http from 'node:http';

const PORTA = Number(process.env.PLUGGY_FALSO_PORTA ?? 3199);
const CLIENTE = 'cliente-teste';
const SEGREDO = 'segredo-teste';
const CHAVE = 'chave-falsa';
/** Poucas por página, para o BlueFin precisar seguir o cursor. */
const POR_PAGINA = 2;

/** itemId → { item, contas: [{ conta, transacoes }] } */
const itens = new Map();

const responder = (res, status, corpo) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(corpo));
};

const lerCorpo = (req) =>
  new Promise((pronto) => {
    let texto = '';
    req.on('data', (p) => (texto += p));
    req.on('end', () => pronto(texto ? JSON.parse(texto) : {}));
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORTA}`);
    const partes = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/') return responder(res, 200, { ok: true });
    if (req.method === 'PUT' && partes[0] === '__teste' && partes[1] === 'items') {
      itens.set(partes[2], await lerCorpo(req));
      return responder(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/auth') {
      const { clientId, clientSecret } = await lerCorpo(req);
      return clientId === CLIENTE && clientSecret === SEGREDO ? responder(res, 200, { apiKey: CHAVE }) : responder(res, 401, { message: 'Unauthorized' });
    }
    if (req.headers['x-api-key'] !== CHAVE) return responder(res, 403, { message: 'Forbidden' });

    if (req.method === 'GET' && partes[0] === 'items' && partes[1]) {
      const estado = itens.get(partes[1]);
      return estado ? responder(res, 200, { id: partes[1], ...estado.item }) : responder(res, 404, { message: 'Item not found' });
    }
    if (req.method === 'GET' && url.pathname === '/accounts') {
      const estado = itens.get(url.searchParams.get('itemId'));
      if (!estado) return responder(res, 404, { message: 'Item not found' });
      return responder(res, 200, { total: estado.contas.length, results: estado.contas.map((c) => c.conta) });
    }
    if (req.method === 'GET' && url.pathname === '/v2/transactions') {
      const contaId = url.searchParams.get('accountId');
      const conta = [...itens.values()].flatMap((e) => e.contas).find((c) => c.conta.id === contaId);
      if (!conta) return responder(res, 404, { message: 'Account not found' });
      const de = url.searchParams.get('dateFrom');
      const todas = conta.transacoes.filter((t) => !de || t.date.slice(0, 10) >= de);
      const inicio = Number(url.searchParams.get('after') ?? 0);
      const pagina = todas.slice(inicio, inicio + POR_PAGINA);
      const proximo = inicio + POR_PAGINA < todas.length ? `?accountId=${contaId}&after=${inicio + POR_PAGINA}` : null;
      return responder(res, 200, { results: pagina.map((t) => ({ accountId: contaId, ...t })), next: proximo });
    }
    responder(res, 404, { message: 'Not found' });
  })
  .listen(PORTA, '127.0.0.1');
