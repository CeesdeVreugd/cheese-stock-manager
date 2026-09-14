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
    canActiviteiten: boolean;
  };
};

export default function AppSidebar({
  gebruiker,
  openAfroepen = 0,
}: {
  gebruiker: Gebruiker;
  openAfroepen?: number;
}) {
  const pathname = usePathname();
  const { rol } = gebruiker;

  // Als iemand bewust naar /login (of de andere auth-schermen) navigeert
  // terwijl er toevallig nog een geldige sessie-cookie bestaat, moet de
  // hoofdnavigatie zich daar niet mee bemoeien — dat oogt als een dubbel
  // logo en overbodige tabs op een scherm dat juist "nog niet ingelogd"
  // hoort te voelen.
  const AUTH_ROUTES = ["/login", "/ontgrendel", "/pincode/instellen"];
  if (AUTH_ROUTES.includes(pathname)) return null;

  const groepen = [
    {
      titel: null, // hoofdscherm staat los bovenaan, geen kopje nodig
      links: [{ href: "/dashboard", label: "Hoofdscherm", mag: true }],
    },
    {
      titel: "Registreren",
      links: [
        { href: "/inslag", label: "Inslag", mag: rol.canInslag },
        { href: "/uitslag", label: "Uitslag", mag: rol.canUitslag },
        { href: "/afroepen", label: "Afroepen", mag: rol.canReserveren },
      ],
    },
    {
      titel: "Overzichten",
      links: [
        { href: "/voorraad", label: "Voorraad", mag: rol.canVoorraad },
        { href: "/inslag/overzicht", label: "Inslag overzicht", mag: rol.canInslag },
        { href: "/uitslag/overzicht", label: "Uitslag overzicht", mag: rol.canUitslag },
        { href: "/facturatie", label: "Facturatie", mag: rol.canFacturatie },
        { href: "/afroeporders", label: "Afroeporders", mag: rol.canReserveren },
      ],
    },
    {
      titel: "Beheer",
      links: [
        { href: "/validaties", label: "Validatielijsten", mag: rol.canBeheer },
        { href: "/gebruikers", label: "Gebruikers", mag: rol.canBeheer },
        { href: "/rollen", label: "Rollen", mag: rol.canBeheer },
        { href: "/activiteiten", label: "Activiteiten", mag: rol.canActiviteiten },
      ],
    },
  ]
    .map((g) => ({ ...g, links: g.links.filter((l) => l.mag) }))
    .filter((g) => g.links.length > 0);

  return (
    <div className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:py-8 md:pl-6">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <img src="/logo-emblem.png" alt="" className="h-9 w-auto" />
        <div className="text-[10px] uppercase tracking-wide text-inkSoft leading-tight">
          Van Beek &amp; De Vreugd Kaas
        </div>
      </div>

      <nav className="flex flex-col gap-4">
        {groepen.map((g, i) => (
          <div key={i} className="flex flex-col gap-1">
            {g.titel && (
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wide text-inkSoft">{g.titel}</p>
            )}
            {g.links.map((l) => {
              const actief = pathname === l.href;
              const badge = l.href === "/afroeporders" && openAfroepen > 0 ? openAfroepen : null;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${
                    actief ? "bg-gold text-white" : "text-ink hover:bg-goldSoft"
                  }`}
                >
                  <span>{l.label}</span>
                  {badge && (
                    <span
                      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                        actief ? "bg-white/25 text-white" : "bg-goldDeep text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6 px-3">
        <Link href="/profiel" className="block rounded-xl hover:bg-goldSoft -mx-3 px-3 py-2 mb-1">
          <div className="text-xs font-semibold text-ink">{gebruiker.naam}</div>
          <div className="text-[11px] text-inkSoft">{gebruiker.email}</div>
          <div className="text-[11px] text-inkSoft">{rol.naam} · Profiel</div>
        </Link>
        <UitloggenKnop className="text-xs font-semibold text-red-600 underline px-3" />
      </div>
    </div>
  );
}
