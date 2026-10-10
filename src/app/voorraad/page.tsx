import Link from "next/link";
import { vereisOntgrendeldeGebruiker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OntgrendelGate from "@/components/ontgrendel-gate";
import GeenToegang from "@/components/geen-toegang";
import { beschikbaarheidPerBox } from "@/lib/afroep";
import { fmtGetal } from "@/lib/format";
import VoorraadLijst from "./voorraad-lijst";

export default async function VoorraadPage() {
  const gebruiker = await vereisOntgrendeldeGebruiker();
  if (!gebruiker.rol.canVoorraad) return <GeenToegang />;

  const boxenRaw = await prisma.box.findMany({ orderBy: { createdAt: "desc" } });
  const boxen = boxenRaw.map((b) => ({
    id: b.id,
    boxId: b.boxId,
    productafkomst: b.productafkomst,
    model: b.model,
    partijcode: b.partijcode,
    productiedatum: b.productiedatum.toISOString(),
    aantalKazen: b.aantalKazen,
    nettoGram: b.nettoGram,
  }));

  const totaalBoxen = fmtGetal(boxen.length, 0);
  const totaalKazen = fmtGetal(boxen.reduce((t, b) => t + b.aantalKazen, 0), 0);
  const totaalKg = fmtGetal(boxen.reduce((t, b) => t + b.nettoGram, 0) / 1000, 1);

  const beschikbaarPerBox = gebruiker.rol.canReserveren
    ? await beschikbaarheidPerBox(boxenRaw.map((b) => ({ boxId: b.boxId, aantalKazen: b.aantalKazen })))
    : {};

  return (
    <OntgrendelGate>
      <div className="min-h-screen">
        {/* ---------- Mobiel ---------- */}
        <div className="md:hidden">
          <div className="bg-green px-6 pt-8 pb-6 rounded-b-3xl">
            <div className="flex items-center justify-between mb-1">
              <Link href="/dashboard" className="text-sm font-semibold text-white/80">
                ‹ Terug
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-white/60">Van Beek &amp; De Vreugd Kaas</span>
                <img src="/logo-emblem.png" alt="" className="h-6 w-auto" />
              </div>
            </div>
            <h1 className="font-serif text-xl font-semibold text-white mb-4">Voorraad</h1>
            <p className="text-xs uppercase tracking-wide text-white/60">Totaal actueel</p>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-white/10 px-3 py-3">
                <p className="font-serif text-xl font-semibold text-white leading-none">{totaalBoxen}</p>
                <p className="mt-1.5 text-xs text-white/70">boxen</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-3">
                <p className="font-serif text-xl font-semibold text-white leading-none">{totaalKazen}</p>
                <p className="mt-1.5 text-xs text-white/70">kazen</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-3">
                <p className="font-serif text-xl font-semibold text-white leading-none">{totaalKg}</p>
                <p className="mt-1.5 text-xs text-white/70">kg</p>
              </div>
            </div>
          </div>
          <div className="px-5 pt-5 pb-6">
            <VoorraadLijst boxen={boxen} beschikbaarPerBox={beschikbaarPerBox} />
          </div>
        </div>

        {/* ---------- Desktop ---------- */}
        <div className="hidden md:block md:px-10 md:py-10 md:max-w-6xl">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-inkSoft mb-1">Van Beek &amp; De Vreugd Kaas</p>
              <h1 className="font-serif text-3xl font-semibold text-green">Voorraad</h1>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border-[1.5px] border-line bg-white px-6 py-3 min-w-[130px]">
                <p className="font-serif text-3xl font-semibold text-green leading-none">{totaalBoxen}</p>
                <p className="mt-1.5 text-xs text-inkSoft">boxen</p>
              </div>
              <div className="rounded-2xl border-[1.5px] border-line bg-white px-6 py-3 min-w-[130px]">
                <p className="font-serif text-3xl font-semibold text-green leading-none">{totaalKazen}</p>
                <p className="mt-1.5 text-xs text-inkSoft">kazen</p>
              </div>
              <div className="rounded-2xl border-[1.5px] border-line bg-white px-6 py-3 min-w-[190px]">
                <p className="font-serif text-3xl font-semibold text-green leading-none">{totaalKg}</p>
                <p className="mt-1.5 text-xs text-inkSoft">kg</p>
              </div>
            </div>
          </div>
          <VoorraadLijst boxen={boxen} beschikbaarPerBox={beschikbaarPerBox} />
        </div>
      </div>
    </OntgrendelGate>
  );
}
