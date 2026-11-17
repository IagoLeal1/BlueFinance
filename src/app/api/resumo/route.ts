import { diaDe, mesAtual } from '@/domain/datas';
import { vencimentoDaFatura } from '@/domain/parcelas';
import { summarizeMonth } from '@/domain/summary';
import { bearer } from '@/server/auth';
import { listarCartoes, resumoDosCartoes } from '@/server/cartoes';
import { erro } from '@/server/http';
import { lancamentosDoCaixa } from '@/server/lancamentos';
import { usuarioDoToken } from '@/server/tokens';
import { vrPeloAtalho } from '@/server/vr';

/**
 * Resumo do mês para os widgets e os avisos do app do iPhone (design kit: TelaWidgets): Entrou, Saiu, Investiu,
 * Sobrou e "a pagar" (como no Início), a próxima fatura de cada cartão (a fechada até vencer; depois, a aberta) e o VR.
 */
export async function GET(request: Request) {
  const userId = await usuarioDoToken(bearer(request));
  if (!userId) return erro(401, 'Token inválido. Gere um novo em Ajustes.');

  const agora = new Date();
  const mes = mesAtual(agora);
  const [caixa, cartoes, vr] = await Promise.all([lancamentosDoCaixa(mes, userId), listarCartoes(userId), vrPeloAtalho(userId, agora)]);
  const { entrou, saiu, investiu, sobrou, aPagar } = summarizeMonth(caixa, mes, diaDe(agora));
  const { cartoes: resumos } = await resumoDosCartoes(cartoes, agora, userId);
  const faturas = resumos.map(({ cartao, aberta, fechada }) =>
    fechada
      ? { cartao: cartao.nome, mes: fechada.mes, total: fechada.total, vence: fechada.vence }
      : { cartao: cartao.nome, mes: aberta.mes, total: aberta.total, vence: vencimentoDaFatura(aberta.mes, cartao.diaFechamento, cartao.diaVencimento) },
  );
  return Response.json({
    mes,
    entrou,
    saiu,
    investiu,
    sobrou,
    aPagar,
    faturas,
    vr: vr && { saldo: vr.saldo, valorMensal: vr.valorMensal, proximo: vr.proximo },
  });
}
