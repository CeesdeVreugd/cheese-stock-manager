import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { getFacturatieOverzicht, huidigeGeneratieDatum, weekLabel } from "@/lib/facturatie";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function FacturatiePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canFacturatie) return <GeenToegang />;

  const { week } = await searchParams;
  const generatieDatum = week ? new Date(week) : huidigeGeneratieDatum();
  const overzicht = await getFacturatieOverzicht(generatieDatum);
  const label = weekLabel(overzicht.periode);

  const vorige = new Date(generatieDatum.getTime() - 7 * DAY_MS).toISOString().slice(0, 10);
  const volgende = new Date(generatieDatum.getTime() + 7 * DAY_MS).toISOString().slice(0, 10);
  const isHuidigeWeek = generatieDatum.getTime() === huidigeGeneratieDatum().getTime();

  const tegels = [
    { label: "Inslag", waarde: `${overzicht.totalen.inslagKg.toFixed(1)} kg`, sub: `${overzicht.inslag.length} boxen` },
    { label: "Opslag", waarde: overzicht.totalen.opslagKgDagen.toFixed(1), sub: `kg-dagen · ${overzicht.opslag.length} partijen` },
    {
      label: "Uitslag standaard",
      waarde: `${overzicht.totalen.uitslagStandaardKg.toFixed(1)} kg`,
      sub: `${overzicht.uitslagStandaard.length} uitslagen`,
    },
    {
      label: "Uitslag geëtiketteerd",
      waarde: `${overzicht.totalen.uitslagGeetiketteerdKg.toFixed(1)} kg`,
      sub: `${overzicht.uitslagGeetiketteerd.length} uitslagen`,
    },
  ];

  const pdfHref = `/api/facturatie/pdf?week=${generatieDatum.toISOString()}`;

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="bg-green px-6 pt-8 pb-6 rounded-b-3xl">
            <div className="flex items-center justify-between mb-1">
              <Link href="/dashboard" className="text-sm font-semibold text-white/80">
                ‹ Terug
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-white/60">Van Beek &amp; De Vreugd Kaas</span>
                <img src="/logo-emblem.png" alt="" className="h-6 w-auto" />
              </div>
            </div>
            <h1 className="font-serif text-xl font-semibold text-white mb-4">Facturatie</h1>
            <div className="flex items-center justify-between">
              <Link href={`/facturatie?week=${vorige}`} className="rounded-lg bg-white/15 px-2.5 py-1.5 text-white text-sm">
                ‹
              </Link>
              <div className="text-center">
                <div className="font-serif font-semibold text-white">{label.week}</div>
                <div className="text-xs text-white/65">{label.range}</div>
              </div>
              {isHuidigeWeek ? (
                <span className="rounded-lg px-2.5 py-1.5 text-white/30 text-sm">›</span>
              ) : (
                <Link href={`/facturatie?week=${volgende}`} className="rounded-lg bg-white/15 px-2.5 py-1.5 text-white text-sm">
                  ›
                </Link>
              )}
            </div>
          </div>

          <div className="px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Totalen deze week</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {tegels.map((t) => (
                <div key={t.label} className="rounded-2xl border-[1.5px] border-line bg-white p-3.5">
                  <div className="text-[10px] font-bold text-inkSoft mb-1.5">{t.label.toUpperCase()}</div>
                  <div className="font-serif text-lg font-semibold text-green">{t.waarde}</div>
                  <div className="text-[11px] text-inkSoft">{t.sub}</div>
                </div>
              ))}
            </div>

            <a
              href={pdfHref}
              className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-goldDeep bg-goldSoft py-3.5 text-sm font-bold text-goldDeep"
            >
              Download volledig PDF-rapport
            </a>

            <p className="text-[11px] text-inkSoft text-center mt-3">
              Vier tabbladen zoals gebruikelijk: Inslag, Opslag, Uitslag Standaard, Uitslag Geëtiketteerd (§8).
            </p>
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-3xl font-semibold text-green">Facturatie</h1>
            <div className="flex items-center gap-3">
              <Link href={`/facturatie?week=${vorige}`} className="rounded-lg bg-greenSoft px-3 py-2 text-green text-sm font-semibold">
                ‹ Vorige week
              </Link>
              <div className="text-center px-2">
                <div className="font-serif font-semibold text-green">{label.week}</div>
                <div className="text-xs text-inkSoft">{label.range}</div>
              </div>
              {isHuidigeWeek ? (
                <span className="rounded-lg px-3 py-2 text-inkSoft/40 text-sm">Volgende week ›</span>
              ) : (
                <Link href={`/facturatie?week=${volgende}`} className="rounded-lg bg-greenSoft px-3 py-2 text-green text-sm font-semibold">
                  Volgende week ›
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {tegels.map((t) => (
              <div key={t.label} className="rounded-2xl border-[1.5px] border-line bg-white p-5">
                <div className="text-xs font-bold text-inkSoft mb-2">{t.label.toUpperCase()}</div>
                <div className="font-serif text-2xl font-semibold text-green">{t.waarde}</div>
                <div className="text-xs text-inkSoft mt-1">{t.sub}</div>
              </div>
            ))}
          </div>

          <a
            href={pdfHref}
            className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-goldDeep bg-goldSoft px-6 py-3.5 text-sm font-bold text-goldDeep"
          >
            Download volledig PDF-rapport
          </a>
          <p className="text-xs text-inkSoft mt-3">
            Vier tabbladen zoals gebruikelijk: Inslag, Opslag, Uitslag Standaard, Uitslag Geëtiketteerd (§8).
          </p>
        </div>
      </div>
    </OntgrendelGate>
  );
}
