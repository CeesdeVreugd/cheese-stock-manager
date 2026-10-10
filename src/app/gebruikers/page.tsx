import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import { prisma } from "@/lib/prisma";
import GebruikersLijst from "./gebruikers-lijst";

export default async function GebruikersPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canBeheer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-inkSoft">
          Dit scherm is alleen beschikbaar voor de rol beheerder (§4.1/§4.4 van het ontwerpdocument).
        </p>
        <Link href="/dashboard" className="mt-4 text-sm font-semibold text-green">
          ‹ Terug naar hoofdscherm
        </Link>
      </div>
    );
  }

  const [gebruikersRuw, rollen] = await Promise.all([
    prisma.gebruiker.findMany({
      orderBy: { naam: "asc" },
      include: {
        rol: true,
        pushSubscriptions: { select: { id: true } },
        devicePincodes: { select: { createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.rol.findMany({ orderBy: { naam: "asc" } }),
  ]);

  // Per gebruiker: staan meldingen aan (op hoeveel toestellen), is de app
  // geactiveerd (eerste login gedaan + pincode ingesteld, en sinds wanneer)
  // en wanneer was de laatste login. Datums als tekst, zodat ze veilig naar
  // de browser kunnen.
  const gebruikers = gebruikersRuw.map(({ pushSubscriptions, devicePincodes, laatsteLogin, ...rest }) => ({
    ...rest,
    createdAt: rest.createdAt.toISOString(),
    meldingenToestellen: pushSubscriptions.length,
    geactiveerdOp: devicePincodes[0]?.createdAt.toISOString() ?? null,
    laatsteLogin: laatsteLogin ? laatsteLogin.toISOString() : null,
  }));

  return (
    <OntgrendelGate>
      <div className="min-h-screen flex flex-col">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden flex flex-col flex-1">
          <div className="flex items-center justify-between px-4 pt-6 pb-3">
            <Link href="/dashboard" className="text-sm font-semibold text-green">
              ‹ Terug
            </Link>
            <h1 className="font-serif font-semibold text-green">Gebruikers</h1>
            <div className="w-12" />
          </div>
          <div className="flex-1 overflow-auto px-5 pb-6">
            <GebruikersLijst initieel={gebruikers} rollen={rollen} huidigId={gebruiker.id} />
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-7xl">
          <h1 className="font-serif text-3xl font-semibold text-green mb-6">Gebruikers</h1>
          <GebruikersLijst initieel={gebruikers} rollen={rollen} huidigId={gebruiker.id} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
