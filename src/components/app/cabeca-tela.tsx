/** Cabeçalho de tela (design-preview: .cabeca-tela): título grande e, se houver, uma linha de apoio. */
export function CabecaTela({ titulo, subtitulo }: { titulo: string; subtitulo?: React.ReactNode }) {
  return (
    <header className="pt-2 pr-[110px] pb-1">
      <h1 className="text-[34px] leading-[41px] font-bold tracking-[-0.02em]">{titulo}</h1>
      {subtitulo && <p className="text-[15px] leading-5 text-muted-foreground">{subtitulo}</p>}
    </header>
  );
}
