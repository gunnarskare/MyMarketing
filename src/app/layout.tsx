import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyMarketing",
  description: "AI-markedsføring for små bedrifter",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
