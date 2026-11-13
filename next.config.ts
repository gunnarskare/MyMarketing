import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // undici brukes til sikker henting av nettsider (src/lib/safe-fetch.ts) og skal ikke pakkes inn.
  serverExternalPackages: ["undici"],
  partialPrefetching: true,
  experimental: {
    // Av med vilje: Vercel gjenbrukte en gammel versjon av stilarket fra
    // byggecachen, så nye farger og skrift ikke kom med ut. Uten cachen
    // bygges stilarket på nytt hver gang. Det koster noen sekunder per bygg.
    turbopackFileSystemCacheForBuild: false,
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
