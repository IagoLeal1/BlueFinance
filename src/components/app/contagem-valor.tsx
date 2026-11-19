'use client';

import { useEffect, useRef } from 'react';
import { formatBRL } from '@/domain/money';

/** Separa "− R$ 32,90" em "− R$" e "32,90", para o símbolo ficar menor que o número. */
const partes = (centavos: number) => {
  const [, simbolo = '', numero = ''] = /^(.*R\$) (.*)$/.exec(formatBRL(centavos)) ?? [];
  return { simbolo, numero };
};

/**
 * O saldo grande do topo: conta de zero até o valor ao abrir (900 ms, saída suave), como no protótipo.
 * O HTML já vem com o valor certo; a contagem só mexe no número enquanto roda. Sem contagem com
 * "reduzir movimento" ou com o olhinho fechado.
 */
export function ContagemValor({ centavos }: { centavos: number }) {
  const numero = useRef<HTMLSpanElement>(null);
  const simbolo = useRef<HTMLElement>(null);
  const { simbolo: s, numero: n } = partes(centavos);

  useEffect(() => {
    const el = numero.current?.firstChild;
    const sim = simbolo.current?.firstChild;
    if (!el || !sim) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-privado')) return;
    const final = partes(centavos);
    const t0 = performance.now();
    let quadro = 0;
    const passo = (t: number) => {
      const p = Math.min((t - t0) / 900, 1);
      const agora = partes(Math.round(centavos * (1 - Math.pow(1 - p, 3))));
      el.nodeValue = agora.numero;
      sim.nodeValue = agora.simbolo;
      if (p < 1) quadro = requestAnimationFrame(passo);
      else [el.nodeValue, sim.nodeValue] = [final.numero, final.simbolo];
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      [el.nodeValue, sim.nodeValue] = [final.numero, final.simbolo];
    };
  }, [centavos]);

  return (
    <>
      <small ref={simbolo} className="mr-1 text-[26px] font-semibold opacity-85">
        {s}
      </small>{' '}
      <span ref={numero}>{n}</span>
    </>
  );
}
