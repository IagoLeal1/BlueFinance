'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

/** Painel que sobe do rodapé (design kit: Sheet) com alça, título e botão de fechar. */
export function BottomSheet({
  titulo,
  gatilho,
  aberto,
  onAbertoChange,
  children,
}: {
  titulo: string;
  gatilho: React.ReactElement;
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer open={aberto} onOpenChange={onAbertoChange}>
      <DrawerTrigger render={gatilho} />
      <DrawerContent className="rounded-t-xl bg-popover shadow-sheet">
        {/* Rola só na vertical: nada (ex.: o calendário nativo do iOS) pode empurrar o sheet para o lado. */}
        <div
          data-rolagem="sheet"
          className="grid touch-pan-y gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(env(safe-area-inset-bottom),32px)] [&>*]:min-w-0"
        >
          <div className="mx-auto h-[5px] w-9 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">{titulo}</DrawerTitle>
            <DrawerClose render={<Button type="button" size="icon" variant="ghost" aria-label="Fechar" />}>
              <X aria-hidden />
            </DrawerClose>
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
