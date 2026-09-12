"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UitloggenKnop from "./uitloggen-knop";

type Gebruiker = {
  naam: string;
  email: string;
  rol: {
    naam: string;
    canInslag: boolean;
    canUitslag: boolean;
    canVoorraad: boolean;
    canFacturatie: boolean;
    canReserveren: boolean;
    canBeheer: boolean;
  };
};

export default function AppSidebar({ gebruiker }: { gebruiker: Gebruiker }) {
  const pathname = usePathname();
  const { rol } = gebruiker;

  const links = [
    { href: "/dashboard", label: "Hoofdscherm", mag: true },
    { href: "/inslag", label: "Inslag", mag: rol.canInslag },
    { href: "/uitslag", label: "Uitslag", mag: rol.canUitslag },
    { href: "/voorraad", label: "Voorraad", mag: rol.canVoorraad },
    { href: "/facturatie", label: "Facturatie", mag: rol.canFacturatie },
    { href: "/reserveren", label: "Reserveren", mag: rol.canReserveren },
    { href: "/reserveringen", label: "Reserveringen", mag: rol.canReserveren },
  ].filter((l) => l.mag);

  const beheerLinks = rol.canBeheer
    ? [
        { href: "/validaties", label: "Validatielijsten" },
        { href: "/gebruikers", label: "Gebruikers" },
        { href: "/rollen", label: "Rollen" },
      ]
    : [];

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
        {[...links, ...beheerLinks].map((l) => {
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
        <div className="text-[11px] text-inkSoft mb-1">{gebruiker.email}</div>
        <div className="text-[11px] text-inkSoft mb-3">{rol.naam}</div>
        <UitloggenKnop className="text-xs font-semibold text-red-600 underline" />
      </div>
    </div>
  );
}
