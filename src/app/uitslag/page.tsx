import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canUitslag) return <GeenToegang />;

  const boxen = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <OntgrendelGate>
      <UitslagForm boxen={boxen} />
    </OntgrendelGate>
  );
}
