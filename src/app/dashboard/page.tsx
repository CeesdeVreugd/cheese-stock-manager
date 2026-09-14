import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UitloggenKnop from "@/components/uitloggen-knop";
import OntgrendelGate from "@/components/ontgrendel-gate";

export default async function DashboardPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();

  const [boxCount, totaalGram, openAfroepen] = await Promise.all([
    prisma.box.count(),
    prisma.box.aggregate({ _sum: { nettoGram: true } }),
    gebruiker.rol.canReserveren ? prisma.afroep.count({ where: { status: "open" } }) : Promise.resolve(0),
  ]);
  const totaalKg = ((totaalGram._sum.nettoGram ?? 0) / 1000).toFixed(1);

  const acties = [
    { href: "/inslag", label: "Inslag", sub: "Nieuwe box registreren", primary: true, mag: gebruiker.rol.canInslag },
    { href: "/uitslag", label: "Uitslag", sub: "Zoek en slag uit", mag: gebruiker.rol.canUitslag },
    { href: "/afroepen", label: "Afroepen", sub: "Box/kazen vastzetten", mag: gebruiker.rol.canReserveren },
  ].filter((t) => t.mag);

  const overzichten = [
    { href: "/voorraad", label: "Voorraad", sub: `${boxCount} boxen actief`, mag: gebruiker.rol.canVoorraad },
    { href: "/inslag/overzicht", label: "Inslag overzicht", sub: "Historie & details", mag: gebruiker.rol.canInslag },
    { href: "/uitslag/overzicht", label: "Uitslag overzicht", sub: "Historie & details", mag: gebruiker.rol.canUitslag },
    { href: "/facturatie", label: "Facturatie", sub: "Weekoverzicht & PDF", mag: gebruiker.rol.canFacturatie },
    {
      href: "/afroeporders",
      label: "Afroeporders",
      sub: openAfroepen > 0 ? `${openAfroepen} openstaand` : "Geen openstaande",
      mag: gebruiker.rol.canReserveren,
    },
  ].filter((o) => o.mag);

  const beheer = [
    { href: "/validaties", label: "Validatielijsten", sub: "Productafkomst, proces, model", mag: gebruiker.rol.canBeheer },
    { href: "/gebruikers", label: "Gebruikers", sub: "Aanmaken, rol en toegang", mag: gebruiker.rol.canBeheer },
    { href: "/rollen", label: "Rollen", sub: "Rechten per rol instellen", mag: gebruiker.rol.canBeheer },
    { href: "/activiteiten", label: "Activiteiten", sub: "Wie deed wanneer wat", mag: gebruiker.rol.canActiviteiten },
  ].filter((o) => o.mag);

  return (
    <OntgrendelGate>
    <div className="min-h-screen">
      {/* ---------- Mobiel ---------- */}
      <div className="md:hidden">
        <div className="bg-green px-6 pt-8 pb-6 rounded-b-3xl">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <img src="/logo-emblem.png" alt="" className="h-9 w-auto" />
              <div>
                <div className="text-xs uppercase tracking-wide text-white/60">Van Beek &amp; De Vreugd Kaas</div>
                <h1 className="font-serif text-lg font-semibold text-white leading-tight">Cheese Stock Manager</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/profiel" className="text-xs font-semibold text-white/70 underline">
                Profiel
              </Link>
              <UitloggenKnop className="text-xs font-semibold text-white/70 underline" />
            </div>
          </div>
          <p className="mt-4 text-sm text-white/70">Actuele voorraad</p>
          <p className="font-serif text-3xl font-semibold text-white">
            {boxCount} boxen · {totaalKg} kg
          </p>
        </div>

        <div className="px-6 py-6">
          {openAfroepen > 0 && (
            <Link
              href="/afroeporders"
              className="flex items-center justify-between rounded-2xl bg-goldSoft border-[1.5px] border-goldDeep/30 p-3.5 mb-5"
            >
              <div className="text-sm text-goldDeep">
                <span className="font-bold">{openAfroepen}</span> openstaande afroeporder
                {openAfroepen === 1 ? "" : "s"} wacht{openAfroepen === 1 ? "" : "en"} op uitvoering
              </div>
              <span className="text-goldDeep">›</span>
            </Link>
          )}

          {acties.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Registreren</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {acties.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`rounded-2xl border-[1.5px] p-4 flex flex-col gap-3 min-h-[92px] ${
                      t.primary ? "bg-gold border-gold text-white" : "bg-white border-line"
                    }`}
                  >
                    <span className="font-semibold text-sm">{t.label}</span>
                    <span className={`text-xs ${t.primary ? "text-white/80" : "text-inkSoft"}`}>{t.sub}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {overzichten.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Overzichten</p>
              {overzichten.map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="flex items-center justify-between rounded-2xl border-[1.5px] border-line bg-white p-3.5 mb-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold">{o.label}</div>
                    <div className="text-xs text-inkSoft">{o.sub}</div>
                  </div>
                  <span className="text-inkSoft">›</span>
                </Link>
              ))}
            </>
          )}

          {beheer.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5 mt-4">Beheer</p>
              {beheer.map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="flex items-center justify-between rounded-2xl border-[1.5px] border-line bg-white p-3.5 mb-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold">{o.label}</div>
                    <div className="text-xs text-inkSoft">{o.sub}</div>
                  </div>
                  <span className="text-inkSoft">›</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ---------- Desktop: brede, eigen indeling ---------- */}
      <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-inkSoft mb-1">Van Beek &amp; De Vreugd Kaas</p>
            <h1 className="font-serif text-3xl font-semibold text-green">Hoofdscherm</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-inkSoft mb-1">Actuele voorraad</p>
            <p className="font-serif text-2xl font-semibold text-green">
              {boxCount} boxen · {totaalKg} kg
            </p>
          </div>
        </div>

        {openAfroepen > 0 && (
          <Link
            href="/afroeporders"
            className="flex items-center justify-between rounded-2xl bg-goldSoft border-[1.5px] border-goldDeep/30 px-5 py-3.5 mb-8"
          >
            <div className="text-sm text-goldDeep">
              <span className="font-bold">{openAfroepen}</span> openstaande afroeporder
              {openAfroepen === 1 ? "" : "s"} wacht{openAfroepen === 1 ? "" : "en"} op uitvoering
            </div>
            <span className="text-sm font-semibold text-goldDeep">Bekijken ›</span>
          </Link>
        )}

        {acties.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-3">Registreren</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {acties.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-2xl border-[1.5px] p-6 flex flex-col gap-2 ${
                    t.primary ? "bg-gold border-gold text-white" : "bg-white border-line hover:border-goldDeep"
                  }`}
                >
                  <span className="font-serif text-lg font-semibold">{t.label}</span>
                  <span className={`text-sm ${t.primary ? "text-white/80" : "text-inkSoft"}`}>{t.sub}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {overzichten.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-3">Overzichten</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {overzichten.map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="rounded-2xl border-[1.5px] border-line bg-white p-6 flex flex-col gap-2 hover:border-goldDeep"
                >
                  <span className="font-serif text-lg font-semibold text-ink">{o.label}</span>
                  <span className="text-sm text-inkSoft">{o.sub}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {beheer.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-3">Beheer</p>
            <div className="grid grid-cols-4 gap-4">
              {beheer.map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className="rounded-2xl border-[1.5px] border-line bg-white p-6 flex flex-col gap-2 hover:border-goldDeep"
                >
                  <span className="font-serif text-lg font-semibold text-ink">{o.label}</span>
                  <span className="text-sm text-inkSoft">{o.sub}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </OntgrendelGate>
  );
}
