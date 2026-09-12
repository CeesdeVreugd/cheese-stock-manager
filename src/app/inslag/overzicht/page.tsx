import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import { fmtDatum, fmtDatumTijd } from "@/lib/format";

export default async function InslagOverzichtPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canInslag) return <GeenToegang />;

  const regels = await prisma.inslagLog.findMany({
    orderBy: { inslagtijd: "desc" },
    take: 300,
  });

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Inslag overzicht</h1>
            <div className="w-12" />
          </div>
          <div className="px-5 pb-6 flex flex-col gap-2.5">
            {regels.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Nog geen inslag geregistreerd.</p>}
            {regels.map((r) => (
              <div key={r.id} className="rounded-2xl border-[1.5px] border-line bg-white p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-semibold text-green">Box #{r.boxId}</span>
                  <span className="text-xs font-semibold">{(r.nettoGram / 1000).toFixed(1)} kg</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <div className="text-inkSoft">PRODUCTAFKOMST</div>
                  <div className="text-inkSoft">MODEL</div>
                  <div className="font-medium">{r.productafkomst}</div>
                  <div className="font-medium">{r.model}</div>
                  <div className="text-inkSoft mt-1">PARTIJCODE</div>
                  <div className="text-inkSoft mt-1">AANTAL</div>
                  <div className="font-medium">{r.partijcode}</div>
                  <div className="font-medium">{r.aantalKazen} stuks</div>
                  <div className="text-inkSoft mt-1">INSLAGTIJD</div>
                  <div className="text-inkSoft mt-1">PRODUCTIEDATUM</div>
                  <div className="font-medium">{fmtDatumTijd(r.inslagtijd)}</div>
                  <div className="font-medium">{fmtDatum(r.productiedatum)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-semibold text-green">Inslag overzicht</h1>
            <p className="text-sm text-inkSoft">{regels.length} regels (laatste 300)</p>
          </div>

          {regels.length === 0 ? (
            <p className="text-sm text-inkSoft">Nog geen inslag geregistreerd.</p>
          ) : (
            <table className="w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden border-[1.5px] border-line">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-inkSoft bg-greenSoft">
                  <th className="py-3 px-4 font-semibold">Partijcode</th>
                  <th className="py-3 px-4 font-semibold">Productafkomst</th>
                  <th className="py-3 px-4 font-semibold">Proces</th>
                  <th className="py-3 px-4 font-semibold">Model</th>
                  <th className="py-3 px-4 font-semibold">Box</th>
                  <th className="py-3 px-4 font-semibold">Inslagtijd</th>
                  <th className="py-3 px-4 font-semibold">Productiedatum</th>
                  <th className="py-3 px-4 font-semibold text-right">Aantal</th>
                  <th className="py-3 px-4 font-semibold text-right">Netto kg</th>
                </tr>
              </thead>
              <tbody>
                {regels.map((r) => (
                  <tr key={r.id} className="border-t border-line hover:bg-goldSoft/40">
                    <td className="py-2.5 px-4 text-inkSoft">{r.partijcode}</td>
                    <td className="py-2.5 px-4">{r.productafkomst}</td>
                    <td className="py-2.5 px-4">{r.proces}</td>
                    <td className="py-2.5 px-4">{r.model}</td>
                    <td className="py-2.5 px-4 font-serif font-semibold text-green">#{r.boxId}</td>
                    <td className="py-2.5 px-4">{fmtDatumTijd(r.inslagtijd)}</td>
                    <td className="py-2.5 px-4">{fmtDatum(r.productiedatum)}</td>
                    <td className="py-2.5 px-4 text-right">{r.aantalKazen}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">{(r.nettoGram / 1000).toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </OntgrendelGate>
  );
}
