"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UitloggenKnop from "./uitloggen-knop";

type Gebruiker = { naam: string; email: string; rol: "beheerder" | "medewerker" | "lezer" };

const LINKS = [
  { href: "/dashboard", label: "Hoofdscherm" },
  { href: "/inslag", label: "Inslag" },
  { href: "/uitslag", label: "Uitslag" },
  { href: "/voorraad", label: "Voorraad" },
  { href: "/facturatie", label: "Facturatie" },
];

const BEHEER_LINKS = [
  { href: "/validaties", label: "Validatielijsten" },
  { href: "/gebruikers", label: "Gebruikers" },
];

export default function AppSidebar({ gebruiker }: { gebruiker: Gebruiker }) {
  const pathname = usePathname();
  const alleLinks = gebruiker.rol === "beheerder" ? [...LINKS, ...BEHEER_LINKS] : LINKS;

  return (
    <div className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:py-8 md:pl-6">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <img src="/logo-emblem.png" alt="" className="h-8 w-auto" />
        <div>
          <div className="font-serif text-sm font-semibold text-green leading-tight">Cheese Stock</div>
          <div className="text-[10px] uppercase tracking-wide text-inkSoft">Van Beek &amp; De Vreugd Kaas</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {alleLinks.map((l) => {
          const actief = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                actief ? "bg-gold text-white" : "text-ink hover:bg-goldSoft"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 px-3">
        <div className="text-xs font-semibold text-ink">{gebruiker.naam}</div>
        <div className="text-[11px] text-inkSoft mb-3">{gebruiker.email}</div>
        <UitloggenKnop className="text-xs font-semibold text-red-600 underline" />
      </div>
    </div>
  );
}
