import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // A bolinha "N" do modo dev fica em cima da aba Início no iPhone. Erros continuam aparecendo no overlay.
  devIndicators: false,
  partialPrefetching: true,
  // O service worker nunca fica em cache: uma versão nova vale na próxima abertura do app.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
