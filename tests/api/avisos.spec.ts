import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createECDH, randomBytes } from 'node:crypto';
import { test, expect, admin, semearCartao, semearLancamentos } from './fixtures';
import { diaDe, mesAtual } from '../../src/domain/datas';

/** Chaves de um "navegador" de mentira, válidas para o web-push cifrar a mensagem. */
const chavesDeAparelho = () => {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') };
};

test.describe('aviso diário da fatura (agendado)', () => {
  test('sem o segredo do agendamento, não faz nada', async ({ request }) => {
    expect((await request.get('/api/avisos')).status()).toBe(401);
    expect((await request.get('/api/avisos', { headers: { Authorization: 'Bearer errado' } })).status()).toBe(401);
  });

  test('avisa quem tem fatura vencendo amanhã e esquece o aparelho que sumiu', async ({ request, usuario, outroUsuario }) => {
    // Serviço de push de mentira: guarda o que chegou; o caminho "sumiu" responde 410 (aparelho desinstalado).
    const recebidos: string[] = [];
    const servico = http.createServer((req, res) => {
      recebidos.push(req.url!);
      req.resume();
      req.on('end', () => {
        res.statusCode = req.url!.includes('sumiu') ? 410 : 201;
        res.end();
      });
    });
    await new Promise<void>((pronto) => servico.listen(0, '127.0.0.1', pronto));
    const base = `http://127.0.0.1:${(servico.address() as AddressInfo).port}`;

    // Fecha dia 1 e vence amanhã: a fatura deste mês vence amanhã.
    const amanha = diaDe(new Date(Date.now() + 86_400_000));
    await semearCartao(usuario, 'C6bank', 1, Number(amanha.slice(8)));
    await semearLancamentos(usuario, [
      { valor: 123456, categoria: 'Outros', descricao: 'Fatura', credito: { cartao: 'C6bank', parcela: 1, parcelas: 1, competencia: mesAtual() } },
    ]);
    await admin.from('inscricoes_push').insert([
      { user_id: usuario.id, endpoint: `${base}/push/iphone`, ...chavesDeAparelho() },
      { user_id: usuario.id, endpoint: `${base}/push/sumiu`, ...chavesDeAparelho() },
      { user_id: outroUsuario.id, endpoint: `${base}/push/sem-fatura`, ...chavesDeAparelho() },
    ]);

    try {
      const res = await request.get('/api/avisos', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
      expect(res.status()).toBe(200);
      expect(recebidos.sort()).toEqual(['/push/iphone', '/push/sumiu']);
      const { data } = await admin.from('inscricoes_push').select('endpoint').eq('user_id', usuario.id);
      expect(data?.map((i) => i.endpoint)).toEqual([`${base}/push/iphone`]);
    } finally {
      servico.close();
      await admin.from('inscricoes_push').delete().in('user_id', [usuario.id, outroUsuario.id]);
    }
  });
});
