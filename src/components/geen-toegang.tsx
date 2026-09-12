import Link from "next/link";

export default function GeenToegang({ tekst }: { tekst?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-inkSoft">{tekst || "Je hebt geen toegang tot dit scherm met je huidige rol."}</p>
      <Link href="/dashboard" className="mt-4 text-sm font-semibold text-green">
        ‹ Terug naar hoofdscherm
      </Link>
    </div>
  );
}
