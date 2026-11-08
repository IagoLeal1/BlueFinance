import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ServiceWorker } from "@/components/app/service-worker";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

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
    { media: "(prefers-color-scheme: light)", color: "#eef4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#07101f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
