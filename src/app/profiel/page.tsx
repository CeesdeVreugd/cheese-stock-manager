import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import OntgrendelGate from "@/components/ontgrendel-gate";
import UitloggenKnop from "@/components/uitloggen-knop";
import MeldingenInschakelen from "@/components/meldingen-inschakelen";

export default async function ProfielPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();

  return (
    <OntgrendelGate>
      <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-md md:mx-auto md:my-10 md:rounded-3xl md:border md:border-line md:shadow-xl md:bg-cream md:overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-6 pb-3 md:px-6">
          <Link href="/dashboard" className="text-sm font-semibold text-green">
            ‹ Terug
          </Link>
          <h1 className="font-serif font-semibold text-green">Profiel</h1>
          <div className="w-12" />
        </div>

        <div className="flex-1 overflow-auto px-5 pb-6 md:px-6 flex flex-col gap-5">
          <div className="rounded-2xl border-[1.5px] border-line bg-white p-4">
            <p className="text-xs font-bold text-inkSoft uppercase tracking-wide mb-2">Account</p>
            <p className="text-sm font-semibold">{gebruiker.naam}</p>
            <p className="text-xs text-inkSoft">{gebruiker.email}</p>
            <p className="text-xs text-inkSoft mt-1">Rol: {gebruiker.rol.naam}</p>
          </div>

          {gebruiker.rol.ontvangtAfroepMeldingen && (
            <div>
              <p className="text-xs font-bold text-inkSoft uppercase tracking-wide mb-2">Meldingen</p>
              <MeldingenInschakelen />
            </div>
          )}

          <UitloggenKnop className="text-sm font-semibold text-red-600 underline text-center mt-2" />
        </div>
      </div>
    </OntgrendelGate>
  );
}
