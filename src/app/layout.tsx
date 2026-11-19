import type { Metadata, Viewport } from "next";
import { SCRIPT_PRIVADO } from "@/components/app/privado";
import { ServiceWorker } from "@/components/app/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlueFinance",
  description: "Suas finanças em um toque.",
  appleWebApp: { capable: true, title: "BlueFin", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f9" },
    { media: "(prefers-color-scheme: dark)", color: "#050b18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: o olhinho marca o <html> (data-privado) antes do React chegar.
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PRIVADO }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
