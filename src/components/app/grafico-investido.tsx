import { mesCurto } from '@/domain/datas';
import { formatReais } from '@/domain/money';

const L = 320;
const A = 92;

/**
 * O gráfico do Investir (design-preview: .grafico): a linha do total pelo CDI no fim de cada mês, em Água,
 * que se desenha ao abrir, com a área esmaecida embaixo e os meses no eixo.
 */
export function GraficoInvestido({ pontos }: { pontos: { mes: string; total: number }[] }) {
  if (pontos.length < 2) return null;
  const totais = pontos.map((p) => p.total);
  const [min, max] = [Math.min(...totais), Math.max(...totais)];
  const faixa = max - min || 1;
  const xy = pontos.map((p, i) => [(i / (pontos.length - 1)) * L, A - 12 - ((p.total - min) / faixa) * (A - 24)] as const);
  // Curva suave entre os pontos (cada trecho com as alças na horizontal).
  const linha = xy
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`;
      const [px, py] = xy[i - 1]!;
      const meio = (px + x) / 2;
      return `C${meio} ${py} ${meio} ${y} ${x} ${y}`;
    })
    .join('');
  const [primeiro, ultimo] = [pontos[0]!, pontos.at(-1)!];
  return (
    <figure className="mt-3.5">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`O total pelo CDI foi de ${formatReais(primeiro.total)} em ${mesCurto(primeiro.mes)} para ${formatReais(ultimo.total)} em ${mesCurto(ultimo.mes)}`}
        className="block h-[92px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="grafico-investido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--invest)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--invest)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${linha}V${A}H0z`} fill="url(#grafico-investido)" className="animate-aparece-depois motion-reduce:animate-none" />
        <path
          d={linha}
          pathLength={1}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="animate-traco stroke-invest [stroke-dasharray:1] motion-reduce:animate-none"
        />
      </svg>
      <figcaption aria-hidden className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        {pontos.map((p) => (
          <span key={p.mes}>{mesCurto(p.mes)}</span>
        ))}
      </figcaption>
    </figure>
  );
}
