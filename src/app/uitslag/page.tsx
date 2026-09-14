import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage({
  searchParams,
}: {
  searchParams: Promise<{ boxId?: string; afroepId?: string }>;
}) {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canUitslag) return <GeenToegang />;

  const { boxId, afroepId } = await searchParams;
  const boxen = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });

  // Vanuit Afroeporders kan direct naar een specifieke box + afroeporder
  // gelinkt worden (§ "Uitvoeren"-knop) — dan slaan we de boxkeuze-stap over.
  const voorgeselecteerdeBox = boxId ? boxen.find((b) => b.boxId === Number(boxId)) || null : null;

  return (
    <OntgrendelGate>
      <UitslagForm
        boxen={boxen}
        voorgeselecteerdeBox={voorgeselecteerdeBox}
        afroepId={afroepId || null}
      />
    </OntgrendelGate>
  );
}
