import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import AfroepenForm from "./afroepen-form";

export default async function AfroepenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canReserveren) return <GeenToegang />;

  const [boxen, klanten, openAfroepen] = await Promise.all([
    prisma.box.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.validatieItem.findMany({ where: { soort: "klant", actief: true }, orderBy: { naam: "asc" } }),
    prisma.afroep.findMany({ where: { status: "open" }, select: { boxId: true } }),
  ]);
  const afgeroepenBoxIds = openAfroepen.map((r) => r.boxId);

  return (
    <OntgrendelGate>
      <AfroepenForm boxen={boxen} klanten={klanten} afgeroepenBoxIds={afgeroepenBoxIds} />
    </OntgrendelGate>
  );
}
