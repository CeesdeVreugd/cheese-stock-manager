import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import { fmtDatumTijd } from "@/lib/format";

const ACTIE_KLEUR: Record<string, string> = {
  Inslag: "bg-goldSoft text-goldDeep",
  Uitslag: "bg-greenSoft text-green",
  Afroep: "bg-blue-50 text-blue-700",
  Gebruiker: "bg-red-50 text-red-700",
};

export default async function ActiviteitenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canActiviteiten) return <GeenToegang />;

  const regels = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Activiteiten</h1>
            <div className="w-12" />
          </div>
          <div className="px-5 pb-6 flex flex-col gap-2">
            {regels.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Nog geen activiteit gelogd.</p>}
            {regels.map((r) => (
              <div key={r.id} className="rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${ACTIE_KLEUR[r.actie] || "bg-cream text-inkSoft"}`}>
                    {r.actie}
                  </span>
                  <span className="text-[11px] text-inkSoft">{fmtDatumTijd(r.createdAt)}</span>
                </div>
                <div className="text-sm">{r.omschrijving}</div>
                <div className="text-xs text-inkSoft mt-0.5">{r.gebruikerNaam}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-semibold text-green">Activiteiten</h1>
            <p className="text-sm text-inkSoft">{regels.length} regels (laatste 300)</p>
          </div>

          {regels.length === 0 ? (
            <p className="text-sm text-inkSoft">Nog geen activiteit gelogd.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden border-[1.5px] border-line min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-inkSoft bg-greenSoft">
                    <th className="py-3 px-4 font-semibold">Wanneer</th>
                    <th className="py-3 px-4 font-semibold">Wie</th>
                    <th className="py-3 px-4 font-semibold">Actie</th>
                    <th className="py-3 px-4 font-semibold">Omschrijving</th>
                  </tr>
                </thead>
                <tbody>
                  {regels.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-2.5 px-4 text-inkSoft whitespace-nowrap">{fmtDatumTijd(r.createdAt)}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium">{r.gebruikerNaam}</div>
                        <div className="text-xs text-inkSoft">{r.gebruikerEmail}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${ACTIE_KLEUR[r.actie] || "bg-cream text-inkSoft"}`}>
                          {r.actie}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{r.omschrijving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OntgrendelGate>
  );
}
