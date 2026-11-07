import {
  ArrowLeftRight, Briefcase, Building2, Car, Circle, CircleEllipsis, HeartPulse, House, Landmark,
  PiggyBank, ShoppingCart, Sparkles, Ticket, Utensils, type LucideIcon,
} from 'lucide-react';

/** Ícones Lucide do design kit, pelo nome guardado na categoria. */
const ICONES: Record<string, LucideIcon> = {
  house: House, 'shopping-cart': ShoppingCart, car: Car, utensils: Utensils, ticket: Ticket,
  'heart-pulse': HeartPulse, briefcase: Briefcase, sparkles: Sparkles, 'piggy-bank': PiggyBank,
  landmark: Landmark, 'building-2': Building2, 'arrow-left-right': ArrowLeftRight, 'circle-ellipsis': CircleEllipsis,
};

export function IconeCategoria({ nome, className }: { nome: string; className?: string }) {
  const Icone = ICONES[nome] ?? Circle;
  return <Icone className={className} aria-hidden />;
}
