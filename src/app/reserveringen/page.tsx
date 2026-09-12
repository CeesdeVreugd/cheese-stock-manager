import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import ReserveringenLijst from "./reserveringen-lijst";

export default async function ReserveringenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canReserveren) return <GeenToegang />;

  const reserveringenRaw = await prisma.reservering.findMany({
    include: { gebruiker: { select: { naam: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const reserveringen = reserveringenRaw.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Reserveringen</h1>
            <Link href="/reserveren" className="text-sm font-semibold text-goldDeep">
              + Nieuw
            </Link>
          </div>
          <div className="px-5 pb-6">
            <ReserveringenLijst initieel={reserveringen} />
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-semibold text-green">Reserveringen</h1>
            <Link href="/reserveren" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white">
              + Nieuwe reservering
            </Link>
          </div>
          <ReserveringenLijst initieel={reserveringen} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
