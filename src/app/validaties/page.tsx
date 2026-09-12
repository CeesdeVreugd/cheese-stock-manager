import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import { prisma } from "@/lib/prisma";
import ValidatieLijst from "./validatie-lijst";

export default async function ValidatiesPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canBeheer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-inkSoft">
          Dit scherm is alleen beschikbaar voor de rol beheerder (§4.4/§6 van het ontwerpdocument).
        </p>
        <Link href="/dashboard" className="mt-4 text-sm font-semibold text-green">
          ‹ Terug naar hoofdscherm
        </Link>
      </div>
    );
  }

  const [productafkomst, proces, model, klant] = await Promise.all([
    prisma.validatieItem.findMany({ where: { soort: "productafkomst", actief: true }, orderBy: { naam: "asc" } }),
    prisma.validatieItem.findMany({ where: { soort: "proces", actief: true }, orderBy: { naam: "asc" } }),
    prisma.validatieItem.findMany({ where: { soort: "model", actief: true }, orderBy: { naam: "asc" } }),
    prisma.validatieItem.findMany({ where: { soort: "klant", actief: true }, orderBy: { naam: "asc" } }),
  ]);

  return (
    <OntgrendelGate>
      <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-none">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden flex flex-col flex-1">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Validatielijsten</h1>
            <div className="w-12" />
          </div>
          <div className="flex-1 overflow-auto px-5 pb-6">
            <ValidatieLijst soort="productafkomst" titel="Productafkomst" initieel={productafkomst} />
            <ValidatieLijst soort="proces" titel="Proces" initieel={proces} />
            <ValidatieLijst soort="model" titel="Model" initieel={model} />
            <ValidatieLijst soort="klant" titel="Klant / bestemming" initieel={klant} />
          </div>
        </div>

        {/* ---------- Desktop: vier kolommen naast elkaar ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <h1 className="font-serif text-3xl font-semibold text-green mb-6">Validatielijsten</h1>
          <div className="grid grid-cols-4 gap-6">
            <div className="rounded-2xl border-[1.5px] border-line bg-white p-5">
              <ValidatieLijst soort="productafkomst" titel="Productafkomst" initieel={productafkomst} />
            </div>
            <div className="rounded-2xl border-[1.5px] border-line bg-white p-5">
              <ValidatieLijst soort="proces" titel="Proces" initieel={proces} />
            </div>
            <div className="rounded-2xl border-[1.5px] border-line bg-white p-5">
              <ValidatieLijst soort="model" titel="Model" initieel={model} />
            </div>
            <div className="rounded-2xl border-[1.5px] border-line bg-white p-5">
              <ValidatieLijst soort="klant" titel="Klant / bestemming" initieel={klant} />
            </div>
          </div>
        </div>
      </div>
    </OntgrendelGate>
  );
}
