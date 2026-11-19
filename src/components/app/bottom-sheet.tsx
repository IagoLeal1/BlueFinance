'use client';

import { X } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

/**
 * A folha (design-preview: .folha): vidro forte, solta das bordas, sobe com a mola calma sobre o véu.
 * Tem alça, título e o botão redondo de fechar.
 */
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
      <DrawerContent className="vidro-forte mx-auto rounded-[44px] [--drawer-content-width:min(464px,calc(100%-16px))] [--drawer-bleed-background:transparent] [--drawer-inset:8px]">
        {/* Rola só na vertical: nada (ex.: o calendário nativo do iOS) pode empurrar a folha para o lado. */}
        <div
          data-rolagem="sheet"
          className="grid touch-pan-y gap-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(calc(env(safe-area-inset-bottom)-8px),18px)] [&>*]:min-w-0"
        >
          <div aria-hidden className="mx-auto h-[5px] w-9 rounded-full bg-muted-foreground/50" />
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="text-xl leading-[25px] font-bold tracking-[-0.01em]">{titulo}</DrawerTitle>
            <DrawerClose
              render={
                <button
                  type="button"
                  aria-label="Fechar"
                  className="pressiona grid size-11 shrink-0 place-items-center rounded-full bg-foreground/9 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              }
            >
              <X className="size-5" aria-hidden />
            </DrawerClose>
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
