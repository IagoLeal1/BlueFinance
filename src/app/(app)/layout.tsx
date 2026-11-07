import { TabBar } from '@/components/app/tab-bar';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[100px]">
        {children}
      </main>
      <TabBar />
    </>
  );
}
