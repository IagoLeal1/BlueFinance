/**
 * Ícone do app, tirado da capa do design kit: o azul da marca com "pílulas" vazadas
 * de comprimentos diferentes, como a barra de gastos e os chips. Sem letras: ainda não há logo.
 */
export function MarcaBlueFinance({ lado }: { lado: number }) {
  const u = lado / 180; // desenhado numa grade de 180px
  const linhas: number[][] = [
    [62, 30],
    [40, 52],
    [96],
    [28, 40],
  ];
  return (
    <div style={{ width: lado, height: lado, background: '#1846c8', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 * u, padding: `0 ${32 * u}px` }}>
      {linhas.map((linha, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 * u }}>
          {linha.map((w, j) => (
            <div key={j} style={{ width: w * u, height: 16 * u, borderRadius: 8 * u, background: '#f3f5f9' }} />
          ))}
        </div>
      ))}
    </div>
  );
}
