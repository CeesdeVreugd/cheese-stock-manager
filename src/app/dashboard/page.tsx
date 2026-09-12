import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionGebruikerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) redirect("/login");

  const [boxCount, totaalGram] = await Promise.all([
    prisma.box.count(),
    prisma.box.aggregate({ _sum: { nettoGram: true } }),
  ]);
  const totaalKg = ((totaalGram._sum.nettoGram ?? 0) / 1000).toFixed(1);

  const tegels = [
    { href: "/inslag", label: "Inslag", sub: "Nieuwe box registreren", primary: true },
    { href: "/uitslag", label: "Uitslag", sub: "Zoek en slag uit" },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-green px-6 pt-8 pb-6 rounded-b-3xl">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-1">Van Beek &amp; De Vreugd</div>
        <h1 className="font-serif text-xl font-semibold text-white">Cheese Stock Manager</h1>
        <p className="mt-4 text-sm text-white/70">Actuele voorraad</p>
        <p className="font-serif text-3xl font-semibold text-white">{boxCount} boxen · {totaalKg} kg</p>
      </div>

      <div className="px-6 py-6">
        <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Snel registreren</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {tegels.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-2xl border-[1.5px] p-4 flex flex-col gap-3 min-h-[92px] ${
                t.primary ? "bg-gold border-gold text-white" : "bg-white border-line"
              }`}
            >
              <span className="font-semibold text-sm">{t.label}</span>
              <span className={`text-xs ${t.primary ? "text-white/80" : "text-inkSoft"}`}>{t.sub}</span>
            </Link>
          ))}
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">Overzichten</p>
        <Link
          href="/voorraad"
          className="flex items-center justify-between rounded-2xl border-[1.5px] border-line bg-white p-3.5 mb-2.5"
        >
          <div>
            <div className="text-sm font-semibold">Voorraad</div>
            <div className="text-xs text-inkSoft">{boxCount} boxen actief</div>
          </div>
          <span className="text-inkSoft">›</span>
        </Link>
        <Link
          href="/facturatie"
          className="flex items-center justify-between rounded-2xl border-[1.5px] border-line bg-white p-3.5 mb-2.5"
        >
          <div>
            <div className="text-sm font-semibold">Facturatie</div>
            <div className="text-xs text-inkSoft">Weekoverzicht &amp; PDF</div>
          </div>
          <span className="text-inkSoft">›</span>
        </Link>
        <Link
          href="/leveranciers"
          className="flex items-center justify-between rounded-2xl border-[1.5px] border-line bg-white p-3.5"
        >
          <div>
            <div className="text-sm font-semibold">Leveranciers</div>
            <div className="text-xs text-inkSoft">Beheer validatielijst (beheerder)</div>
          </div>
          <span className="text-inkSoft">›</span>
        </Link>
      </div>
    </div>
  );
}
