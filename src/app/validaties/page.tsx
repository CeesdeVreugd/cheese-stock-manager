import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ValidatieLijst from "./validatie-lijst";

export default async function ValidatiesPage() {
  const gebruiker = await getSessionGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "beheerder") {
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

  const [productafkomst, proces, model] = await Promise.all([
    prisma.validatieItem.findMany({ where: { soort: "productafkomst", actief: true }, orderBy: { naam: "asc" } }),
    prisma.validatieItem.findMany({ where: { soort: "proces", actief: true }, orderBy: { naam: "asc" } }),
    prisma.validatieItem.findMany({ where: { soort: "model", actief: true }, orderBy: { naam: "asc" } }),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
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
      </div>
    </div>
  );
}
