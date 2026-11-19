import { test, expect, entrar, semearLancamentos, semearVr, type Page } from './fixtures';
import { diaCurto, diaDe, mesAtual, nomeDoMes, somarMeses } from '../../src/domain/datas';
import { proximoDeposito } from '../../src/domain/vr';

const proximo = (dia: number) => diaCurto(`${proximoDeposito(dia)}T12:00:00-03:00`);
/** Linha do extrato que não abre edição (depósito e acerto do VR). */
const linha = (page: Page, texto: string) => page.getByRole('listitem').filter({ hasText: texto });
const abaVr = (page: Page) => page.getByRole('radiogroup', { name: 'Extrato' }).getByText('VR', { exact: true }).click();

test.describe('VR (vale-refeição)', () => {
  test('configura o VR em Ajustes e o Início mostra o saldo e o próximo depósito', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Ajustes' }).click();
    await page.getByRole('link', { name: /^Vale-refeição/ }).click();
    const secao = page.getByRole('region', { name: 'Vale-refeição' });

    await secao.getByRole('button', { name: 'Adicionar VR' }).click();
    const sheet = page.getByRole('dialog', { name: 'VR' });
    await sheet.getByLabel('Quanto cai por mês').pressSequentially('90000');
    const dia = sheet.getByRole('group', { name: 'Dia que cai' });
    for (let i = 0; i < 4; i++) await dia.getByRole('button', { name: 'Mais' }).click();
    await expect(dia.getByRole('status')).toHaveText('dia 5');
    await sheet.getByLabel('Saldo de hoje').pressSequentially('41230');
    await expect(sheet.getByText('Todo dia 5 entram R$ 900,00 no VR.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Salvar VR' }).click();
    await expect(sheet).toBeHidden();
    await expect(secao.getByRole('listitem')).toContainText('R$ 900,00 todo dia 5 · saldo R$ 412,30');

    await page.getByRole('link', { name: 'Início' }).click();
    const card = page.getByRole('region', { name: 'VR', exact: true });
    await expect(card).toContainText('R$ 412,30');
    await expect(card).toContainText(`Próximo: R$ 900 em ${proximo(5)}`);

    // Tocar no card abre o extrato do VR.
    await card.getByRole('link').click();
    await expect(page).toHaveURL(/\/lancamentos\?ver=vr/);
    await expect(page.getByRole('radiogroup', { name: 'Extrato' }).getByRole('radio', { name: 'VR' })).toBeChecked();
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toContainText('R$ 412,30');
    await expect(linha(page, 'Saldo inicial do VR')).toContainText('+ R$ 412,30');
  });

  test('gasto no VR pelo + sai do VR, fica fora do Sobrou e conta em gastos por categoria', async ({ page, usuario }) => {
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    await entrar(page, usuario);

    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await sheet.getByLabel('Valor').pressSequentially('3290');
    await sheet.getByRole('button', { name: 'Alimentação' }).click();
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('VR', { exact: true }).click();
    await expect(sheet.getByText('Sai do VR: sobram R$ 379,40. Não mexe no Sobrou da conta.')).toBeVisible();
    await expect(sheet.getByText('Parcelas')).toBeHidden();
    await sheet.getByLabel('Com o quê (opcional)').fill('Almoço');
    await sheet.getByRole('button', { name: 'Salvar gasto' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Gasto salvo' })).toBeVisible();

    await expect(page.getByRole('region', { name: 'VR', exact: true })).toContainText('R$ 379,40');
    await expect(page.getByRole('region', { name: `Resumo de ${nomeDoMes(mesAtual())}` })).toContainText('R$ 0,00');
    await expect(page.getByRole('region', { name: 'Gastos por categoria' })).toContainText('Alimentação100%R$ 32,90');

    await page.goto('/lancamentos');
    await expect(page.getByText('Almoço')).toBeHidden();
    await abaVr(page);
    await expect(page.getByRole('button', { name: /Almoço/ })).toContainText('Alimentação · VR');
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toContainText('R$ 379,40');
  });

  test('o depósito do mês entra sozinho no dia do VR, uma vez só', async ({ page, usuario }) => {
    // Configurado há dois meses, no dia 1: os depósitos do mês passado e deste já caíram.
    await semearVr(usuario, { valorMensal: 90000, dia: 1, desde: `${somarMeses(mesAtual(), -2)}-01T12:00:00-03:00`, saldo: 10000 });
    await entrar(page, usuario);
    const card = page.getByRole('region', { name: 'VR', exact: true });
    await expect(card).toContainText('R$ 1.900,00');

    await page.reload();
    await expect(card).toContainText('R$ 1.900,00');
    await page.goto('/lancamentos?ver=vr');
    await expect(linha(page, 'Depósito do VR')).toHaveCount(1);
    await expect(linha(page, 'Depósito do VR')).toContainText('VR · todo dia 1');
    await expect(linha(page, 'Depósito do VR')).toContainText('+ R$ 900,00');
  });

  test('editar um gasto do débito para o VR leva ele para o extrato do VR', async ({ page, usuario }) => {
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    await semearLancamentos(usuario, [{ valor: 6450, categoria: 'Alimentação', descricao: 'Restaurante' }]);
    await entrar(page, usuario);
    await page.goto('/lancamentos');

    await page.getByRole('button', { name: /Restaurante/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Editar lançamento' });
    await sheet.getByRole('radiogroup', { name: 'Como pagou' }).getByText('VR', { exact: true }).click();
    await sheet.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByRole('button', { name: /Restaurante/ })).toBeHidden();
    await abaVr(page);
    await expect(page.getByRole('button', { name: /Restaurante/ })).toContainText('Alimentação · VR');
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toContainText('R$ 347,80');
  });

  test('corrigir o saldo de hoje em Ajustes lança a diferença como acerto', async ({ page, usuario }) => {
    await semearVr(usuario, { valorMensal: 90000, dia: 5, saldo: 41230 });
    await entrar(page, usuario);
    await page.goto('/ajustes/vale-refeicao');
    const secao = page.getByRole('region', { name: 'Vale-refeição' });

    await secao.getByRole('button', { name: /VR/ }).click();
    const sheet = page.getByRole('dialog', { name: 'VR' });
    await expect(sheet.getByLabel('Saldo de hoje')).toHaveValue('R$ 412,30');
    await sheet.getByLabel('Saldo de hoje').fill('40000');
    await sheet.getByRole('button', { name: 'Salvar VR' }).click();
    await expect(sheet).toBeHidden();
    await expect(secao.getByRole('listitem')).toContainText('saldo R$ 400,00');

    await page.goto('/lancamentos?ver=vr');
    await expect(linha(page, 'Acerto do saldo do VR')).toContainText('− R$ 12,30');
  });

  test('mudar o dia para hoje lança o depósito de hoje, sem acerto se o saldo não foi mexido (bug de 18/11)', async ({ page, usuario }) => {
    const ontem = diaDe(new Date(Date.now() - 86_400_000));
    const diaOntem = Number(ontem.slice(8));
    const diaHoje = Number(diaDe(new Date()).slice(8));
    // Configurado ontem, com o dia de ontem: nenhum depósito ainda.
    await semearVr(usuario, { valorMensal: 80080, dia: diaOntem, desde: `${ontem}T12:00:00-03:00`, saldo: 76 });
    await entrar(page, usuario);
    await page.goto('/ajustes/vale-refeicao');
    const secao = page.getByRole('region', { name: 'Vale-refeição' });

    await secao.getByRole('button', { name: /VR/ }).click();
    const sheet = page.getByRole('dialog', { name: 'VR' });
    await expect(sheet.getByLabel('Saldo de hoje')).toHaveValue('R$ 0,76');
    const dia = sheet.getByRole('group', { name: 'Dia que cai' });
    const passos = diaHoje - diaOntem;
    for (let i = 0; i < Math.abs(passos); i++) await dia.getByRole('button', { name: passos > 0 ? 'Mais' : 'Menos' }).click();
    await expect(dia.getByRole('status')).toHaveText(`dia ${diaHoje}`);
    await sheet.getByRole('button', { name: 'Salvar VR' }).click();
    await expect(sheet).toBeHidden();
    await expect(secao.getByRole('listitem')).toContainText('saldo R$ 801,56');

    await page.goto('/lancamentos?ver=vr');
    await expect(linha(page, 'Depósito do VR')).toContainText('+ R$ 800,80');
    await expect(linha(page, 'Acerto do saldo do VR')).toHaveCount(0);
  });

  test('acertar quanto caiu no depósito do mês: muda só aquele depósito e o saldo', async ({ page, usuario }) => {
    const ontem = diaDe(new Date(Date.now() - 86_400_000));
    const hoje = diaDe(new Date());
    const diaHoje = Number(hoje.slice(8));
    // Configurado ontem para cair hoje: o depósito de hoje entra sozinho, com o valor previsto.
    await semearVr(usuario, { valorMensal: 80080, dia: diaHoje, desde: `${ontem}T12:00:00-03:00`, saldo: 76 });
    await entrar(page, usuario);
    await page.goto('/lancamentos?ver=vr');
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toContainText('R$ 801,56');

    await linha(page, 'Depósito do VR').getByRole('button').click();
    const sheet = page.getByRole('dialog', { name: 'Depósito do VR' });
    const mes = nomeDoMes(hoje.slice(0, 7));
    await expect(sheet).toContainText(`${mes[0]!.toUpperCase()}${mes.slice(1)} · caiu dia ${diaHoje}`);
    await expect(sheet.getByLabel('Quanto caiu')).toHaveValue('R$ 800,80');
    await expect(sheet).toContainText('Previsto: R$ 800,80');
    await sheet.getByLabel('Quanto caiu').fill('81240');
    await sheet.getByRole('button', { name: 'Salvar depósito' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('region', { name: 'Saldo do VR' })).toContainText('R$ 813,16');
    await expect(linha(page, 'Depósito do VR')).toContainText('+ R$ 812,40');

    // O previsto dos próximos meses continua o de Ajustes.
    await page.goto('/ajustes/vale-refeicao');
    await expect(page.getByRole('region', { name: 'Vale-refeição' }).getByRole('listitem')).toContainText('R$ 800,80 todo dia');
  });
});
