import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionGebruikerId } from "@/lib/auth";

export default async function InslagSuccesPage({
  searchParams,
}: {
  searchParams: Promise<{ boxId?: string }>;
}) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) redirect("/login");

  const { boxId } = await searchParams;
  if (!boxId) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-xs font-bold uppercase tracking-wide text-inkSoft">Inslag opgeslagen</p>
      <h1 className="font-serif text-2xl font-semibold text-green">Box #{boxId}</h1>

      <img
        src={`/api/box/${boxId}/qr`}
        alt={`QR-code voor box ${boxId}`}
        className="h-48 w-48 rounded-2xl border-[1.5px] border-line bg-white p-3"
      />

      <p className="text-xs text-inkSoft max-w-xs">
        Dit is de QR-code die op het label komt (§7 van het ontwerpdocument). De koppeling met een
        echte labelprinter is nog niet gebouwd — voorlopig kun je dit scherm gebruiken om de code
        te scannen bij het testen van uitslag.
      </p>

      <div className="flex gap-3 mt-2">
        <Link href="/inslag" className="rounded-xl border-[1.5px] border-line bg-white px-4 py-2.5 text-sm font-semibold text-green">
          Nog een inslag
        </Link>
        <Link href="/dashboard" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white">
          Naar hoofdscherm
        </Link>
      </div>
    </div>
  );
}
