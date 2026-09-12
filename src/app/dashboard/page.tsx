import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UitloggenKnop from "@/components/uitloggen-knop";
import OntgrendelGate from "@/components/ontgrendel-gate";

export default async function DashboardPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();

  const [boxCount, totaalGram] = await Promise.all([
    prisma.box.count(),
    prisma.box.aggregate({ _sum: { nettoGram: true } }),
  ]);
  const totaalKg = ((totaalGram._sum.nettoGram ?? 0) / 1000).toFixed(1);

  const acties = [
    { href: "/inslag", label: "Inslag", sub: "Nieuwe box registreren", primary: true },
    { href: "/uitslag", label: "Uitslag", sub: "Zoek en slag uit" },
  ];

  const overzichten = [
    { href: "/voorraad", label: "Voorraad", sub: `${boxCount} boxen actief` },
    { href: "/inslag/overzicht", label: "Inslag overzicht", sub: "Historie & details" },
    { href: "/uitslag/overzicht", label: "Uitslag overzicht", sub: "Historie & details" },
    { href: "/facturatie", label: "Facturatie", sub: "Weekoverzicht & PDF" },
  ];

  const beheer =
    gebruiker.rol === "beheerder"
      ? [
          { href: "/validaties", label: "Validatielijsten", sub: "Productafkomst, proces, model" },
          { href: "/gebruikers", label: "Gebruikers", sub: "Aanmaken, rol en toegang" },
        ]
      : [];

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
            <UitloggenKnop className="text-xs font-semibold text-white/70 underline" />
          </div>
          <p className="mt-4 text-sm text-white/70">Actuele voorraad</p>
          <p className="font-serif text-3xl font-semibold text-white">
            {boxCount} boxen · {totaalKg} kg
          </p>
        </div>

        <div className="px-6 py-6">
          <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Snel registreren</p>
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
        <div className="flex items-start justify-between mb-8">
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

        <div className="grid grid-cols-4 gap-4 mb-4">
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

        <div className="grid grid-cols-4 gap-4 mb-10">
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
