"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CalendarIcon, CardIcon, CompassIcon, FlagIcon, GridIcon, PanelIcon } from "@/components/icons";

const LINKS = [
  { href: "/dashboard", label: "Oversikt", Icon: GridIcon },
  { href: "/profil", label: "Merkevareprofil", Icon: PanelIcon },
  { href: "/merkevare", label: "Strategi", Icon: CompassIcon },
  { href: "/uke", label: "Innholdsplan", Icon: CalendarIcon },
  { href: "/kom-i-gang", label: "Kom i gang", Icon: FlagIcon },
  { href: "/abonnement", label: "Abonnement", Icon: CardIcon },
] as const;

/**
 * Hovedmenyen. Siden du er på, markeres (også for skjermlesere).
 * «sidebar»: loddrett liste med ikoner på PC. «bar»: en rad som kan rulles, på mobil.
 */
export function AppNav({ variant }: { variant: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  // På mobil er menyen en rad som kan rulles. Sørg for at siden du er på, synes.
  useEffect(() => {
    if (variant !== "bar") return;
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, variant]);

  const sidebar = variant === "sidebar";
  return (
    <nav aria-label="Hovedmeny">
      <ul
        ref={list}
        className={sidebar ? "flex flex-col gap-1" : "-mx-5 flex gap-1 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8"}
      >
        {LINKS.map(({ href, label, Icon }) => {
          const current = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={
                  "flex items-center rounded-lg font-semibold transition-colors " +
                  (sidebar ? "gap-3.5 px-3.5 py-3 text-[1.0625rem] " : "gap-2 px-3 py-2 text-sm ") +
                  (current ? "bg-terra text-white" : "text-ink hover:bg-sand")
                }
              >
                <Icon className={sidebar ? "size-6 shrink-0" : "size-5 shrink-0"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
