import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Skriftene fra merkevareprofilen, lagret hos oss selv (lisenser i fonts/LICENSE.txt).
// Overskrifter: Liberation Serif Regular, som utsnitt med navnet «Spyd Serif».
const serif = localFont({
  src: "./fonts/spyd-serif-regular.woff2",
  variable: "--font-spyd-serif",
  weight: "400",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

// Brødtekst, knapper og menyer: Open Sans med variabel vekt (Regular og Semibold brukes mest).
const sans = localFont({
  src: "./fonts/open-sans-latin-wght.woff2",
  variable: "--font-open-sans",
  weight: "300 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Spyd – markedsføring med tydelig retning",
    template: "%s · Spyd",
  },
  description:
    "Spyd gjør nettsiden til en merkevareprofil og lager ukas innlegg til Facebook, Instagram og LinkedIn. Du godkjenner før noe publiseres.",
};

export const viewport: Viewport = {
  themeColor: "#fff3e3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
