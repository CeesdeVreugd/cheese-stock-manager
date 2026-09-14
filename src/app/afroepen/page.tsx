import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import { beschikbaarheidPerBox } from "@/lib/afroep";
import AfroepenForm from "./afroepen-form";

export default async function AfroepenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canReserveren) return <GeenToegang />;

  const [boxen, klanten] = await Promise.all([
    prisma.box.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.validatieItem.findMany({ where: { soort: "klant", actief: true }, orderBy: { naam: "asc" } }),
  ]);
  const beschikbaarPerBox = await beschikbaarheidPerBox(boxen.map((b) => ({ boxId: b.boxId, aantalKazen: b.aantalKazen })));

  return (
    <OntgrendelGate>
      <AfroepenForm boxen={boxen} klanten={klanten} beschikbaarPerBox={beschikbaarPerBox} />
    </OntgrendelGate>
  );
}
