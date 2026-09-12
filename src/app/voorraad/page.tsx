import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import VoorraadLijst from "./voorraad-lijst";

export default async function VoorraadPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canVoorraad) return <GeenToegang />;

  const boxenRaw = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });
  const boxen = boxenRaw.map((b) => ({
    id: b.id,
    boxId: b.boxId,
    productafkomst: b.productafkomst,
    model: b.model,
    partijcode: b.partijcode,
    productiedatum: b.productiedatum.toISOString(),
    aantalKazen: b.aantalKazen,
    nettoGram: b.nettoGram,
  }));

  const openReserveringen = gebruiker.rol.canReserveren
    ? await prisma.reservering.findMany({ where: { status: "open" }, select: { boxId: true } })
    : [];
  const gereserveerdeBoxIds = openReserveringen.map((r) => r.boxId);

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
          <div className="px-5 pb-6">
            <VoorraadLijst boxen={boxen} gereserveerdeBoxIds={gereserveerdeBoxIds} />
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-semibold text-green">Voorraad</h1>
            <p className="text-sm text-inkSoft">{boxen.length} boxen actief</p>
          </div>
          <VoorraadLijst boxen={boxen} gereserveerdeBoxIds={gereserveerdeBoxIds} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
