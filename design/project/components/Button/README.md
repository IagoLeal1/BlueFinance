Botão de ação com quatro variantes: `bf-btn--primary`, `--secondary`, `--ghost`, `--danger`.

- Use **um** primário por tela ou sheet: a ação que conclui a tarefa ("Salvar gasto").
- Secundário (`brand-soft` + `on-brand-soft`) para ações de apoio; ghost para cancelar.
- Destrutivo só para excluir, sempre com confirmação depois.
- Altura `control-h` (52px), raio `radius-md`. `bf-btn--block` ocupa a largura toda dentro de sheets.
- Rótulo é verbo + objeto, em frase: "Salvar gasto", não "SALVAR" nem "OK".
- O consumidor fornece: o texto, um ícone Lucide opcional à esquerda, `disabled` quando faltar campo obrigatório.
