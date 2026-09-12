import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import RollenLijst from "./rollen-lijst";

export default async function RollenPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canBeheer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-inkSoft">Dit scherm is alleen beschikbaar voor een beheerder.</p>
        <Link href="/dashboard" className="mt-4 text-sm font-semibold text-green">
          ‹ Terug naar hoofdscherm
        </Link>
      </div>
    );
  }

  const rollen = await prisma.rol.findMany({
    orderBy: { naam: "asc" },
    include: { _count: { select: { gebruikers: true } } },
  });

  return (
    <OntgrendelGate>
      <div className="min-h-screen flex flex-col">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden flex flex-col flex-1">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Rollen</h1>
            <div className="w-12" />
          </div>
          <div className="flex-1 overflow-auto px-5 pb-6">
            <RollenLijst initieel={rollen} huidigRolId={gebruiker.rol.id} />
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-5xl">
          <h1 className="font-serif text-3xl font-semibold text-green mb-6">Rollen</h1>
          <RollenLijst initieel={rollen} huidigRolId={gebruiker.rol.id} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
