import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import { getSessieUren } from "@/lib/instellingen";
import InstellingenFormulier from "./instellingen-formulier";

export default async function InstellingenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canBeheer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-inkSoft">Dit scherm is alleen beschikbaar voor de rol beheerder.</p>
        <Link href="/dashboard" className="mt-4 text-sm font-semibold text-green">
          ‹ Terug naar hoofdscherm
        </Link>
      </div>
    );
  }

  const sessieUren = await getSessieUren();

  return (
    <OntgrendelGate>
      <div className="min-h-screen flex flex-col md:min-h-0">
        <div className="flex items-center justify-between px-4 pt-6 pb-3 md:hidden">
          <Link href="/dashboard" className="text-sm font-semibold text-green">
            ‹ Terug
          </Link>
          <h1 className="font-serif font-semibold text-green">Instellingen</h1>
          <div className="w-12" />
        </div>
        <div className="px-5 pb-6 md:px-10 md:py-10 md:max-w-3xl">
          <h1 className="hidden md:block font-serif text-3xl font-semibold text-green mb-6">Instellingen</h1>
          <InstellingenFormulier startUren={sessieUren} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
