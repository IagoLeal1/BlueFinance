# Publicação — Supabase na nuvem + Vercel

## O que já está pronto

- **Supabase** `bluefinance` (organização Projetos, região São Paulo `sa-east-1`, plano grátis)
  - URL: `https://msjgdgmhfvkjmhloogla.supabase.co`
  - Todas as migrations de `supabase/migrations/` aplicadas; advisors de segurança sem avisos pendentes
    (o "tokens_pessoais sem política" é intencional: só o servidor acessa).
- **Código** no GitHub `IagoLeal1/BlueFinance`, com manifest e ícone para a tela de início do iPhone.

## Passos que são seus

A chave **secreta** do Supabase só passa pelas suas mãos, e o login na Vercel é seu.

### 1. Supabase — fechar cadastro e criar o seu usuário
No [painel do projeto](https://supabase.com/dashboard/project/msjgdgmhfvkjmhloogla):
1. **Authentication › Sign In / Providers** → desligue **Allow new users to sign up**.
   Sem isso, qualquer pessoa com a URL poderia criar conta (cada um só veria os próprios dados, mas não é o que queremos).
2. **Authentication › Users › Add user › Create new user** → seu e-mail e uma senha forte, marque **Auto Confirm User**.
   As categorias padrão são criadas sozinhas.
3. **Project Settings › API Keys** → copie a **secret key** (`sb_secret_…`). Não cole em lugar nenhum além da Vercel.

### 2. Vercel — importar o repositório
1. Abra [vercel.com/new](https://vercel.com/new) e importe **IagoLeal1/BlueFinance** (framework Next.js é detectado).
2. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://msjgdgmhfvkjmhloogla.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_zsEhScKmit-Gnq9TbBnPfg_AllXwpoO` |
| `SUPABASE_SECRET_KEY` | a secret key copiada no passo 1.3 (marque como **Sensitive**) |

3. **Deploy**. Se a instalação reclamar da versão do pnpm, adicione também `ENABLE_EXPERIMENTAL_COREPACK` = `1` e faça redeploy.

### 3. Supabase — avisar qual é o endereço do app
**Authentication › URL Configuration › Site URL** → o endereço que a Vercel deu (ex.: `https://bluefinance.vercel.app`).

### 4. iPhone
1. Abra o endereço no **Safari**, entre com o usuário do passo 1.2.
2. **Compartilhar › Adicionar à Tela de Início**. O app abre em tela cheia, com ícone próprio.
3. **Ajustes do app › Gerar token do Atalho** → Copiar.
4. Monte o Atalho "Gasto rápido" seguindo [04-atalho-ios.md](04-atalho-ios.md), trocando a URL pelo endereço da Vercel.
5. **Ajustes do iPhone › Acessibilidade › Toque › Toque Traseiro › Toque Duplo** → escolha o Atalho "Gasto rápido".

## Depois de publicado

- Cada `git push` na `main` publica sozinho.
- Migration nova: aplicar no Supabase da nuvem antes do push que depende dela.
