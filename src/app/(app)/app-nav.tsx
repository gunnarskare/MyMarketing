"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/dashboard", label: "Oversikt" },
  { href: "/profil", label: "Profil" },
  { href: "/merkevare", label: "Analyse" },
  { href: "/kom-i-gang", label: "Kom i gang" },
  { href: "/abonnement", label: "Abonnement" },
] as const;

/** Hovedmenyen. Siden du er på, markeres (også for skjermlesere). */
export function AppNav() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  // På mobil er menyen en rad som kan rulles. Sørg for at siden du er på, synes.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav aria-label="Hovedmeny" className="order-last w-full sm:order-none sm:w-auto">
      <ul ref={list} className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 sm:pb-0">
        {LINKS.map((link) => {
          const current = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={"block rounded-full px-3 py-2 text-sm font-semibold " + (current ? "bg-ink text-paper" : "text-ink-soft hover:bg-mist hover:text-ink")}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
