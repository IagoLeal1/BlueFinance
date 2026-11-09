import { test, expect, entrar, semearInvestimento, semearTaxasCdi } from './fixtures';

// As taxas do CDI são uma tabela só para todos: este arquivo troca por taxas fixas de 2020 e roda em série.
test.describe.configure({ mode: 'serial' });

// R$ 1.000,00 aplicados em 1/6/2020 a 101,5% de um CDI de 0,05% ao dia, por dois dias úteis:
// 100.000 × 1,0005075 = 100.050,75 (dia 1) → × 1,0005075 = 100.101,53 (dia 2) → R$ 1.001,02.
const CDB = { nome: 'CDB', instituicao: 'C6bank', aplicado: 100000, cdi: { percentual: 101.5, aplicadoEm: '2020-06-01' } };

test.beforeAll(async () => {
  await semearTaxasCdi([
    { dia: '2020-06-01', taxa: 0.05 },
    { dia: '2020-06-02', taxa: 0.05 },
  ]);
});

test.describe('investimento pelo CDI', () => {
  test('o CDB a 101,5% do CDI sobe sozinho: patrimônio, rendeu e o último dia útil', async ({ page, usuario }) => {
    await semearInvestimento(usuario, CDB);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();

    const patrimonio = page.getByRole('region', { name: 'Patrimônio investido' });
    await expect(patrimonio).toContainText('R$ 1.001,02');
    await expect(patrimonio).toContainText('+ R$ 0,51 no último dia útil (2 jun 2020)');
    await expect(patrimonio.getByRole('group', { name: 'Aportado' })).toContainText('R$ 1.000');
    await expect(patrimonio.getByRole('group', { name: 'Rendeu' })).toContainText('+ R$ 1');

    const linha = page.getByRole('region', { name: 'C6bank' }).getByRole('listitem');
    await expect(linha).toContainText('101,5% do CDI');
    await expect(linha).toContainText('R$ 1.001,02');
    await expect(page.getByText(/CDI de 2 jun 2020: 0,0500% ao dia/)).toBeVisible();
  });

  test('liga o cálculo num investimento que já existe: % do CDI, aplicado em e quanto aplicou', async ({ page, usuario }) => {
    // Cadastrado à mão, com o rendimento somado no valor (como o CDB do C6 em produção).
    await semearInvestimento(usuario, { nome: 'CDB', instituicao: 'C6bank', aplicado: 100102 });
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();
    await page.getByRole('button', { name: /CDB/ }).click();
    await page.getByRole('dialog', { name: 'Atualizar investimento' }).getByRole('button', { name: 'Editar investimento' }).click();

    const sheet = page.getByRole('dialog', { name: 'Editar investimento' });
    await sheet.getByText('% do CDI', { exact: true }).click();
    await sheet.getByLabel('Quanto do CDI').fill('101,5');
    await sheet.getByLabel('Aplicado em').fill('2020-06-01');
    const aplicou = sheet.getByLabel('Quanto aplicou');
    for (let k = 0; k < 6; k++) await aplicou.press('Backspace');
    await aplicou.pressSequentially('100000');
    await expect(aplicou).toHaveValue('R$ 1.000,00');
    await expect(sheet.getByText('Tem IR (CDB)')).toBeVisible();
    await expect(sheet).toContainText('Pelo CDI, hoje vale R$ 1.001,02');
    await sheet.getByRole('button', { name: 'Salvar' }).click();
    await expect(sheet).toBeHidden();

    const linha = page.getByRole('region', { name: 'C6bank' }).getByRole('listitem');
    await expect(linha).toContainText('101,5% do CDI');
    await expect(linha).toContainText('R$ 1.001,02');
    const patrimonio = page.getByRole('region', { name: 'Patrimônio investido' });
    await expect(patrimonio.getByRole('group', { name: 'Aportado' })).toContainText('R$ 1.000');
    await expect(patrimonio.getByRole('group', { name: 'Rendeu' })).toContainText('+ R$ 1');
  });

  test('cadastra um investimento novo que já rende pelo CDI', async ({ page, usuario }) => {
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();
    await page.getByRole('button', { name: 'Adicionar investimento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo investimento' });
    await sheet.getByLabel('Nome').fill('LCI');
    await sheet.getByRole('button', { name: 'Renda fixa' }).click();
    await sheet.getByLabel('Onde está').fill('Inter');
    await sheet.getByText('% do CDI', { exact: true }).click();
    await sheet.getByLabel('Quanto do CDI').fill('100');
    await sheet.getByLabel('Aplicado em').fill('2020-06-01');
    await sheet.getByLabel('Quanto aplicou').pressSequentially('100000');
    await sheet.getByText('Isento (LCI, LCA)').click();
    await sheet.getByRole('button', { name: 'Salvar investimento' }).click();
    await expect(sheet).toBeHidden();

    // 100.000 × 1,0005 × 1,0005 = 100.100,03 → R$ 1.001,00
    const linha = page.getByRole('region', { name: 'Inter' }).getByRole('listitem');
    await expect(linha).toContainText('100% do CDI');
    await expect(linha).toContainText('R$ 1.001,00');
  });

  test('tocar no CDB mostra o bruto, o líquido se resgatar hoje e os aportes; "Ajustar valor" acerta com o banco', async ({ page, usuario }) => {
    await semearInvestimento(usuario, CDB);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();
    await page.getByRole('button', { name: /CDB/ }).click();

    const sheet = page.getByRole('dialog', { name: 'CDB' });
    await expect(sheet).toContainText('C6bank · 101,5% do CDI · tem IR');
    await expect(sheet.getByRole('group', { name: 'Valor bruto hoje' })).toContainText('R$ 1.001,02');
    // Mais de 2 anos: sem IOF e IR de 15% sobre o rendimento (R$ 1,02 → R$ 0,15).
    await expect(sheet.getByRole('group', { name: 'Se resgatar hoje' })).toContainText('R$ 1.000,87');
    const aportes = sheet.getByRole('list', { name: 'Aportes' });
    await expect(aportes.getByRole('listitem')).toHaveCount(1);
    await expect(aportes).toContainText('1 jun 2020');
    await expect(aportes).toContainText('R$ 1.000,00');
    await expect(aportes).toContainText('rendendo há 2 dias úteis');

    await sheet.getByRole('button', { name: 'Ajustar valor' }).click();
    const ajuste = page.getByRole('dialog', { name: 'Ajustar valor' });
    const valor = ajuste.getByLabel('Valor no app do banco');
    await expect(valor).toHaveValue('R$ 1.001,02');
    for (let k = 0; k < 6; k++) await valor.press('Backspace');
    await valor.pressSequentially('100150');
    await ajuste.getByRole('button', { name: 'Salvar ajuste' }).click();
    await expect(ajuste).toBeHidden();

    const patrimonio = page.getByRole('region', { name: 'Patrimônio investido' });
    await expect(patrimonio).toContainText('R$ 1.001,50');
    await expect(patrimonio.getByRole('group', { name: 'Aportado' })).toContainText('R$ 1.000');
  });

  test('aportar mais pelo sheet do CDB: entra no mesmo investimento e no "Investiu" do mês', async ({ page, usuario }) => {
    await semearInvestimento(usuario, CDB);
    await entrar(page, usuario);
    await page.getByRole('link', { name: 'Investir' }).click();
    await page.getByRole('button', { name: /CDB/ }).click();
    await page.getByRole('dialog', { name: 'CDB' }).getByRole('button', { name: 'Aportar' }).click();

    const aporte = page.getByRole('dialog', { name: 'Aportar no CDB' });
    await expect(aporte).toContainText('Entra no CDB (C6bank), no mesmo acúmulo, e rende 101,5% do CDI a partir de');
    await aporte.getByLabel('Valor').pressSequentially('50000');
    await aporte.getByRole('button', { name: 'Salvar aporte' }).click();
    await expect(aporte).toBeHidden();

    // O aporte de hoje ainda não rendeu: R$ 1.001,02 + R$ 500,00.
    await expect(page.getByRole('region', { name: 'Patrimônio investido' })).toContainText('R$ 1.501,02');
    await page.getByRole('button', { name: /CDB/ }).click();
    await expect(page.getByRole('dialog', { name: 'CDB' }).getByRole('list', { name: 'Aportes' }).getByRole('listitem')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page.getByRole('region', { name: /^Resumo de / }).getByRole('group', { name: 'Investiu' })).toContainText('R$ 500');
  });

  test('o botão + avisa que o aporte entra no mesmo CDB e quando começa a render', async ({ page, usuario }) => {
    await semearInvestimento(usuario, CDB);
    await entrar(page, usuario);
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    const sheet = page.getByRole('dialog', { name: 'Novo lançamento' });
    await sheet.getByText('Investimento', { exact: true }).click();
    await sheet.getByRole('button', { name: 'CDB' }).click();
    await expect(sheet).toContainText('Entra no CDB (C6bank), no mesmo acúmulo, e rende 101,5% do CDI a partir de');
  });
});
