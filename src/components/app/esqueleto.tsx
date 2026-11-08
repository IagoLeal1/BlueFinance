/** Esqueletos com o formato do conteúdo final, para nada "pular" quando os dados chegam. */
const Bloco = ({ className }: { className: string }) => <div aria-hidden className={`esqueleto ${className}`} />;

function Linhas({ n }: { n: number }) {
  return (
    <div className="grid gap-4 rounded-lg bg-card p-4 shadow-card">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bloco className="size-10 rounded-[12px]" />
          <div className="grid flex-1 gap-1.5">
            <Bloco className="h-3.5 w-2/3" />
            <Bloco className="h-3 w-2/5" />
          </div>
          <Bloco className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function Resumo() {
  return (
    <div className="grid gap-3 rounded-lg bg-card p-5 shadow-card">
      <Bloco className="h-3.5 w-2/5" />
      <Bloco className="h-10 w-3/4" />
      <div className="grid grid-cols-3 gap-2">
        <Bloco className="h-14 rounded-md" />
        <Bloco className="h-14 rounded-md" />
        <Bloco className="h-14 rounded-md" />
      </div>
    </div>
  );
}

export function EsqueletoInicio() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-3">
      {/* O degradê do topo aparece já no carregamento: nada muda de cor quando os dados chegam. */}
      <div className="-mx-4 -mt-[max(env(safe-area-inset-top),16px)] grid gap-4 bg-linear-to-br from-hero to-hero-end px-4 pt-[calc(max(env(safe-area-inset-top),16px)+8px)] pb-11">
        <div className="h-8 w-40 rounded-lg bg-white/15" />
        <div className="grid gap-2">
          <div className="h-3.5 w-2/5 rounded-lg bg-white/15" />
          <div className="h-10 w-3/4 rounded-lg bg-white/15" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Bloco className="h-14 rounded-md" />
        <Bloco className="h-14 rounded-md" />
        <Bloco className="h-14 rounded-md" />
      </div>
      <Linhas n={3} />
    </div>
  );
}

export function EsqueletoLista({ titulo }: { titulo: string }) {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-3">
      <h1 className="mt-2 text-[28px] leading-[34px] font-extrabold tracking-tight">{titulo}</h1>
      <Bloco className="h-[46px] rounded-md" />
      <Linhas n={5} />
    </div>
  );
}

export function EsqueletoCarteira() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-3">
      <Resumo />
      <Linhas n={3} />
    </div>
  );
}
