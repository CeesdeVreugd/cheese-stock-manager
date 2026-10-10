"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Rol = { canInslag: boolean; canUitslag: boolean; canVoorraad: boolean; canReserveren: boolean };

const AUTH_ROUTES = ["/login", "/ontgrendel", "/pincode/instellen"];

const ICONEN: Record<string, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" />,
  inslag: <path d="M12 4v12m0 0-4.5-4.5M12 16l4.5-4.5M5 20h14" />,
  uitslag: <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14" />,
  afroepen: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />,
  voorraad: <path d="M4 8l8-4 8 4v8l-8 4-8-4V8Zm0 0 8 4m8-4-8 4m0 8v-8" />,
};

// Vaste onderbalk op de telefoon: links altijd het hoofdscherm, daarnaast de
// snelle knoppen voor wat de gebruiker mag doen.
export default function MobieleOnderbalk({ rol, openAfroepen = 0 }: { rol: Rol; openAfroepen?: number }) {
  const pathname = usePathname();
  if (AUTH_ROUTES.includes(pathname)) return null;

  const items = [
    { href: "/dashboard", label: "Hoofdscherm", icoon: "home", mag: true },
    { href: "/inslag", label: "Inslag", icoon: "inslag", mag: rol.canInslag },
    { href: "/uitslag", label: "Uitslag", icoon: "uitslag", mag: rol.canUitslag },
    { href: "/afroepen", label: "Afroepen", icoon: "afroepen", mag: rol.canReserveren },
    { href: "/voorraad", label: "Voorraad", icoon: "voorraad", mag: rol.canVoorraad },
  ].filter((i) => i.mag);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) * 0.45 + 4px)" }}
      aria-label="Snelle knoppen"
    >
      <div className="flex">
        {items.map((i) => {
          const actief = i.href === "/dashboard" ? pathname === "/dashboard" : pathname === i.href || pathname.startsWith(i.href + "/");
          const badge = i.href === "/afroepen" && openAfroepen > 0 ? openAfroepen : null;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-semibold relative ${
                actief ? "text-goldDeep" : "text-inkSoft"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {ICONEN[i.icoon]}
              </svg>
              <span>{i.label}</span>
              {badge && (
                <span className="absolute top-1 left-1/2 ml-2.5 text-[9px] font-bold rounded-full bg-goldDeep text-white px-1.5 leading-4">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
