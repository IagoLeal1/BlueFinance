/**
 * Marca BlueFin (design kit: Identidade A): a barbatana do atum-azul cortando a linha d'água.
 * Desenhada numa grade de 180px; as mesmas formas viram o ícone do app (src/app/marca.tsx).
 */
export const BARBATANA = 'M26 118 C 62 112 98 82 120 30 C 114 66 120 98 152 118 Z';
export const LINHA_DAGUA = 'M18 132 Q 42 120 66 132 T 114 132 T 162 132';

/** O ícone em miniatura, com o degradê Abismo → Atum (decorativo; o nome vem ao lado). */
export function SimboloBlueFin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 180" className={className} aria-hidden>
      <defs>
        <linearGradient id="bf-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--hero)" />
          <stop offset="1" stopColor="var(--hero-end)" />
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="40" fill="url(#bf-degrade)" />
      <path d={BARBATANA} fill="var(--on-hero)" />
      <path d={LINHA_DAGUA} fill="none" stroke="var(--water)" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

/** "bluefin" em minúsculas, com "fin" na cor da marca. */
export function NomeBlueFin({ className }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.03em] ${className ?? ''}`}>
      blue<span className="text-primary">fin</span>
    </span>
  );
}

/** Linha d'água no pé do topo do Início: a onda recorta o degradê com a cor do fundo da tela. */
export function LinhaDagua({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 24" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 14 Q 25 4 50 14 T 100 14 T 150 14 T 200 14 T 250 14 T 300 14 V24 H0Z" fill="currentColor" />
    </svg>
  );
}
