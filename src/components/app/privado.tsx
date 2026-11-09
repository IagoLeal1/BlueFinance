/** Guardado no aparelho: fechado fica fechado até tocar de novo (Início e Investir juntos). */
export const CHAVE_PRIVADO = 'bf:privado';

/** Roda no <head> antes de desenhar a tela, para o valor nunca aparecer nem por um instante. */
export const SCRIPT_PRIVADO = `try{if(localStorage.getItem('${CHAVE_PRIVADO}')==='1')document.documentElement.setAttribute('data-privado','')}catch(e){}`;

/**
 * Valor com dinheiro que o olhinho esconde (design kit: TelaOlhinho). O valor vai no HTML; com `<html data-privado>`
 * o CSS mostra a máscara no lugar, sem piscar o valor ao abrir o app.
 */
export function Privado({ children, mascara = 'R$ ••••' }: { children: React.ReactNode; mascara?: string }) {
  return (
    // A máscara é só CSS (::after): o texto da página continua sendo o valor, e ele some quando o olho fecha.
    <span className="privado" data-mascara={mascara}>
      <span className="privado-valor">{children}</span>
    </span>
  );
}
