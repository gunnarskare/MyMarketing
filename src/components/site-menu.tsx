"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";
import { button } from "./ui";

/** Menyen på mobil: en knapp som åpner lenkene under toppen. Lukkes med Esc eller når du velger noe. */
export function SiteMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls="mobilmeny"
        onClick={() => setOpen((value) => !value)}
        className="-mr-2 flex size-11 items-center justify-center rounded-lg text-ink hover:bg-sand"
      >
        {open ? <CloseIcon className="size-7" /> : <MenuIcon className="size-7" />}
        <span className="sr-only">{open ? "Lukk menyen" : "Meny"}</span>
      </button>
      <div
        id="mobilmeny"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-paper shadow-[0_24px_40px_-24px_rgb(43_33_29/0.35)]"
      >
        <nav aria-label="Hovedmeny" className="mx-auto w-full max-w-6xl px-6 pt-2 pb-6">
          <ul className="flex flex-col">
            {links.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} onClick={close} className="block py-4 font-serif text-2xl text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="border-b border-line">
              <Link href="/login" onClick={close} className="block py-4 font-serif text-2xl text-ink">
                Logg inn
              </Link>
            </li>
          </ul>
          <Link href="/login" onClick={close} className={`${button.primary} mt-6 w-full`}>
            Lag merkevareprofil
          </Link>
        </nav>
      </div>
    </div>
  );
}
