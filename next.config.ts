import type { NextConfig } from "next";

// Sikkerhetshoder for alle sider. Innholdsreglene (CSP) sier hvor siden får hente ting fra:
// oss selv, Supabase (bilder og fonter i biblioteket) og Google Fonts (forhåndsvisning av skrifttyper).
// 'unsafe-inline' trengs fordi Next.js legger små skript og stiler rett i siden.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `font-src 'self' data: https://fonts.gstatic.com ${supabaseOrigin}`,
  `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com ${supabaseOrigin}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].map((rule) => rule.trim()).join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
