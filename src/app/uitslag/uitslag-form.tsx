"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BoxKiezer from "@/components/box-kiezer";

type Box = {
  id: string;
  boxId: number;
  productafkomst: string;
  model: string;
  partijcode: string;
  aantalKazen: number;
  nettoGram: number;
};

function newTransactionId() {
  return crypto.randomUUID();
}

export default function UitslagForm({ boxen }: { boxen: Box[] }) {
  const router = useRouter();
  const transactionId = useMemo(newTransactionId, []);
  const [box, setBox] = useState<Box | null>(null);
  const [uitslagType, setUitslagType] = useState<"volledig" | "klein">("volledig");
  const [aantalKazenUit, setAantalKazenUit] = useState("");
  const [tarief, setTarief] = useState<"standaard" | "geetiketteerd">("standaard");
  const [opmerking, setOpmerking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function bevestig(e: React.FormEvent) {
    e.preventDefault();
    if (!box) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/uitslag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          boxId: box.boxId,
          uitslagType,
          tarief,
          aantalKazenUit: aantalKazenUit || undefined,
          opmerking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Uitslag mislukt");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-3xl md:mx-auto md:my-10 md:rounded-3xl md:border md:border-line md:shadow-xl md:bg-cream md:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 md:px-8">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green md:text-lg">Uitslag</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 md:px-8 flex flex-col gap-4">
        {!box && (
          <>
            <p className="text-xs font-bold text-ink">Kies een box</p>
            <BoxKiezer boxen={boxen} onSelect={setBox} />
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {box && (
          <form onSubmit={bevestig} className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 md:items-start">
            <div className="min-w-0 rounded-2xl border-[1.5px] border-gold bg-white p-3.5 md:sticky md:top-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif font-semibold text-green">Box #{box.boxId}</span>
                <button type="button" onClick={() => setBox(null)} className="text-xs text-inkSoft underline">
                  andere box
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <div className="text-inkSoft">PRODUCTAFKOMST</div>
                <div className="text-inkSoft">MODEL</div>
                <div className="font-medium">{box.productafkomst}</div>
                <div className="font-medium">{box.model}</div>
                <div className="text-inkSoft mt-1">PARTIJCODE</div>
                <div className="text-inkSoft mt-1">AANWEZIG</div>
                <div className="font-medium">{box.partijcode}</div>
                <div className="font-medium">
                  {box.aantalKazen} stuks · {(box.nettoGram / 1000).toFixed(1)} kg
                </div>
              </div>
            </div>

            <div className="min-w-0 flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold text-ink mb-1.5">Uitslag type</p>
              <div className="flex rounded-xl bg-goldSoft p-1">
                {(["volledig", "klein"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setUitslagType(t)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize ${
                      uitslagType === t ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {uitslagType === "klein" && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Aantal kazen uit</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={box.aantalKazen}
                  value={aantalKazenUit}
                  onChange={(e) => setAantalKazenUit(e.target.value)}
                  className="input"
                />
                <p className="text-[11px] text-inkSoft mt-1">Maximaal {box.aantalKazen} beschikbaar</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Uitslag tarief</label>
              <div className="flex rounded-xl bg-goldSoft p-1">
                {(["standaard", "geetiketteerd"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTarief(t)}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-semibold capitalize ${
                      tarief === t ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    {t === "geetiketteerd" ? "Geëtiketteerd" : "Standaard"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-inkSoft mt-1">Bepaalt de regel op het facturatie-overzicht</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Opmerking (optioneel)</label>
              <textarea value={opmerking} onChange={(e) => setOpmerking(e.target.value)} className="input h-20" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button disabled={busy} className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60">
              {busy ? "Bevestigen…" : "Bevestig uitslag"}
            </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
