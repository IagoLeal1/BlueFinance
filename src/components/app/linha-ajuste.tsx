import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

/** Uma linha da lista de Ajustes (design-preview: .aj): ícone, nome, o estado em uma linha e a seta. */
export function LinhaAjuste({ href, Icone, titulo, children }: { href: string; Icone: LucideIcon; titulo: string; children?: React.ReactNode }) {
  return (
    <li className="not-first:border-t not-first:border-border">
      <Link
        href={href}
        className="pressiona flex min-h-[62px] items-center gap-3 rounded-md py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-foreground/7 text-primary">
          <Icone className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-[21px] font-medium">{titulo}</span>
          {children && <span className="block truncate text-[13px] leading-[18px] text-muted-foreground">{children}</span>}
        </span>
        <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** Um grupo de linhas de Ajustes num cartão de vidro, com o rótulo do grupo em cima. */
export function GrupoAjustes({ rotulo, children }: { rotulo?: string; children: React.ReactNode }) {
  return (
    <section aria-label={rotulo} className="grid gap-1">
      {rotulo && <h2 className="mx-4 text-[13px] leading-[18px] font-semibold text-muted-foreground">{rotulo}</h2>}
      <ul className="cartao px-4">{children}</ul>
    </section>
  );
}
