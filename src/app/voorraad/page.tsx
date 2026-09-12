import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";

export default async function VoorraadPage() {
  await vereisOntgrendeldeGebruiker();

  const boxen = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Voorraad</h1>
            <div className="w-12" />
          </div>
          <div className="px-5 pb-6 flex flex-col gap-2.5">
            {boxen.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Nog geen boxen op voorraad.</p>}
            {boxen.map((box) => (
              <div key={box.id} className="rounded-2xl border-[1.5px] border-line bg-white p-3.5 flex gap-3">
                <img
                  src={`/api/box/${box.boxId}/qr`}
                  alt={`QR box ${box.boxId}`}
                  className="h-16 w-16 rounded-lg border border-line flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif font-semibold text-green">Box #{box.boxId}</span>
                    <span className="text-xs font-semibold">{(box.nettoGram / 1000).toFixed(1)} kg</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <div className="text-inkSoft">PRODUCTAFKOMST</div>
                    <div className="text-inkSoft">MODEL</div>
                    <div className="font-medium">{box.productafkomst}</div>
                    <div className="font-medium">{box.model}</div>
                    <div className="text-inkSoft mt-1">PARTIJCODE</div>
                    <div className="text-inkSoft mt-1">AANTAL</div>
                    <div className="font-medium">{box.partijcode}</div>
                    <div className="font-medium">{box.aantalKazen} stuks</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Desktop: brede tabel ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-semibold text-green">Voorraad</h1>
            <p className="text-sm text-inkSoft">{boxen.length} boxen actief</p>
          </div>

          {boxen.length === 0 ? (
            <p className="text-sm text-inkSoft">Nog geen boxen op voorraad.</p>
          ) : (
            <table className="w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden border-[1.5px] border-line">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-inkSoft bg-greenSoft">
                  <th className="py-3 px-4 font-semibold">QR</th>
                  <th className="py-3 px-4 font-semibold">Box</th>
                  <th className="py-3 px-4 font-semibold">Productafkomst</th>
                  <th className="py-3 px-4 font-semibold">Model</th>
                  <th className="py-3 px-4 font-semibold">Partijcode</th>
                  <th className="py-3 px-4 font-semibold text-right">Aantal</th>
                  <th className="py-3 px-4 font-semibold text-right">Netto kg</th>
                </tr>
              </thead>
              <tbody>
                {boxen.map((box) => (
                  <tr key={box.id} className="border-t border-line hover:bg-goldSoft/40">
                    <td className="py-2.5 px-4">
                      <img src={`/api/box/${box.boxId}/qr`} alt="" className="h-10 w-10 rounded border border-line" />
                    </td>
                    <td className="py-2.5 px-4 font-serif font-semibold text-green">#{box.boxId}</td>
                    <td className="py-2.5 px-4">{box.productafkomst}</td>
                    <td className="py-2.5 px-4">{box.model}</td>
                    <td className="py-2.5 px-4 text-inkSoft">{box.partijcode}</td>
                    <td className="py-2.5 px-4 text-right">{box.aantalKazen} stuks</td>
                    <td className="py-2.5 px-4 text-right font-semibold">{(box.nettoGram / 1000).toFixed(1)} kg</td>
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
