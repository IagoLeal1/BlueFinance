Entrada de valor em reais: número grande, centralizado, preenchido da direita para a esquerda como caixa de banco.

- Mostra `R$` em `ink-muted` e os dígitos em `amount-hero` com números tabulares.
- Vazio mostra `0,00` em `ink-muted`; cada dígito digitado empurra os anteriores ("3" → 0,03 → "32" → 0,32).
- Guarda e envia **centavos inteiros** (3290), nunca float.
- Abre o teclado numérico (`inputmode="numeric"`).
