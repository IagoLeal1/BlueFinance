import { BARBATANA, LINHA_DAGUA } from '@/components/app/marca';

/**
 * Ícone do app (design kit: Identidade A · BlueFin): a barbatana do atum-azul cortando a linha d'água,
 * sobre o degradê Abismo → Atum. Sem cantos arredondados: o iPhone aplica a máscara.
 */
export function MarcaBlueFin({ lado }: { lado: number }) {
  return (
    <div style={{ width: lado, height: lado, display: 'flex' }}>
      <svg width={lado} height={lado} viewBox="0 0 180 180">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b1f4d" />
            <stop offset="1" stopColor="#1846c8" />
          </linearGradient>
        </defs>
        <rect width="180" height="180" fill="url(#g)" />
        <path d={BARBATANA} fill="#f3f7fb" />
        <path d={LINHA_DAGUA} fill="none" stroke="#3ccfc6" strokeWidth="9" strokeLinecap="round" />
      </svg>
    </div>
  );
}
