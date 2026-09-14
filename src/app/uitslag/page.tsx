import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import UitslagForm from "./uitslag-form";

export default async function UitslagPage({
  searchParams,
}: {
  searchParams: Promise<{ boxId?: string; afroepId?: string; volledigeBox?: string; aantalKazen?: string }>;
}) {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canUitslag) return <GeenToegang />;

  const { boxId, afroepId, volledigeBox, aantalKazen } = await searchParams;
  const boxen = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });

  // Vanuit Afroeporders kan direct naar een specifieke box + afroeporder
  // gelinkt worden (§ "Uitvoeren"-knop) — dan slaan we de boxkeuze-stap over
  // én nemen we het type (hele box / aantal kazen) van die afroep over, in
  // plaats van standaard op "hele box" te blijven staan.
  const voorgeselecteerdeBox = boxId ? boxen.find((b) => b.boxId === Number(boxId)) || null : null;

  return (
    <OntgrendelGate>
      <UitslagForm
        boxen={boxen}
        voorgeselecteerdeBox={voorgeselecteerdeBox}
        afroepId={afroepId || null}
        afroepVolledigeBox={volledigeBox === "true"}
        afroepAantalKazen={aantalKazen ? Number(aantalKazen) : null}
      />
    </OntgrendelGate>
  );
}
