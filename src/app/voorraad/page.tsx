import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function VoorraadPage() {
  await vereisOntgrendeldeGebruiker();

  const boxen = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-2xl md:mx-auto md:my-10 md:rounded-3xl md:border md:border-line md:shadow-xl md:bg-cream md:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green">Voorraad</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 flex flex-col gap-2.5">
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
  );
}
