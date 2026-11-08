import { ImageResponse } from 'next/og';
import { MarcaBlueFin } from './marca';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<MarcaBlueFin lado={512} />, size);
}
