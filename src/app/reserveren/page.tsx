import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import ReserverenForm from "./reserveren-form";

export default async function ReserverenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canReserveren) return <GeenToegang />;

  const [boxen, klanten, openReserveringen] = await Promise.all([
    prisma.box.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.validatieItem.findMany({ where: { soort: "klant", actief: true }, orderBy: { naam: "asc" } }),
    prisma.reservering.findMany({ where: { status: "open" }, select: { boxId: true } }),
  ]);
  const gereserveerdeBoxIds = openReserveringen.map((r) => r.boxId);

  return (
    <OntgrendelGate>
      <ReserverenForm boxen={boxen} klanten={klanten} gereserveerdeBoxIds={gereserveerdeBoxIds} />
    </OntgrendelGate>
  );
}
