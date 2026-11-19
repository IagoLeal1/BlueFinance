import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/** Cabeçalho de subtela de Ajustes (design-preview: .cabeca-sub): o botão redondo de voltar e o título. */
export function CabecaSub({ titulo, voltar = '/ajustes' }: { titulo: string; voltar?: string }) {
  return (
    <header className="flex items-center gap-3 pt-1 pb-1">
      <Link
        href={voltar}
        aria-label="Voltar"
        className="vidro pressiona relative grid size-11 shrink-0 place-items-center rounded-full text-foreground focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{titulo}</h1>
    </header>
  );
}

/** O corpo de uma subtela: entra empurrando da direita com a mola calma. */
export function CorpoSub({ children }: { children: React.ReactNode }) {
  return <div className="grid animate-tela-empurra gap-3 motion-reduce:animate-aparece">{children}</div>;
}
