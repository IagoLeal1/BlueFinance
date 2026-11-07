import { ImageResponse } from 'next/og';
import { MarcaBlueFinance } from './marca';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Ícone da tela de início do iPhone (o iOS arredonda os cantos sozinho). */
export default function AppleIcon() {
  return new ImageResponse(<MarcaBlueFinance lado={180} />, size);
}
