import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Schibsted Grotesk: norsk avisgrotesk, åpen lisens (se fonts/LICENSE.txt).
const schibsted = localFont({
  src: "./fonts/schibsted-grotesk-latin.woff2",
  variable: "--font-schibsted",
  weight: "400 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Spott – ukas innlegg, ferdig skrevet",
    template: "%s · Spott",
  },
  description:
    "Spott skriver ukas innlegg til Facebook, Instagram og LinkedIn for små bedrifter. Ingenting publiseres før du har godkjent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${schibsted.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
