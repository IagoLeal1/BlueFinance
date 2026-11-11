@AGENTS.md

# BlueFin (BlueFinance)

App de finanças pessoais do dono, instalado no iPhone como PWA. Responda em português (pt-BR).

Antes de mudar qualquer coisa, leia `docs/decisoes.md`: tudo o que já foi decidido (plataforma, identidade,
cores, regras do dinheiro, Atalho, investimentos) e como o trabalho é feito. Não reabra uma decisão
registrada lá sem o dono pedir.

Resumo do jeito de trabalhar:
- Design primeiro (tela nova no design kit em `design/project`, publicada no Design System), aprovação do
  dono ("Aprovado, implementar"), depois código.
- TDD com Playwright em fatias verticais: teste vermelho, depois verde. `pnpm test` roda tudo.
- Commit e push no `main` ao fim de cada entrega (o push publica na Vercel).
- Confirme com o dono antes de migração no banco de produção ou de publicar algo fora.
- Segredos (chave secreta do Supabase, VAPID privada, CRON_SECRET, token do Atalho) só o dono manipula.

Arquitetura: `docs/arquitetura.html`.
