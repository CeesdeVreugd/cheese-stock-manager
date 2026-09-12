"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QrScanner from "./qr-scanner";

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

export default function UitslagPage() {
  const router = useRouter();
  const transactionId = useMemo(newTransactionId, []);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<Box | null>(null);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [uitslagType, setUitslagType] = useState<"volledig" | "klein">("volledig");
  const [aantalKazenUit, setAantalKazenUit] = useState("");
  const [tarief, setTarief] = useState<"standaard" | "geetiketteerd">("standaard");
  const [opmerking, setOpmerking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function zoekOp(waarde: string) {
    setSearching(true);
    setError(null);
    setBox(null);
    try {
      const res = await fetch(`/api/uitslag/search?q=${encodeURIComponent(waarde)}`);
      const data = await res.json();
      if (!data.box) throw new Error("Geen box gevonden met dat BoxID of die partijcode");
      setBox(data.box);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function zoek(e: React.FormEvent) {
    e.preventDefault();
    await zoekOp(query);
  }

  function scanResultaat(waarde: string) {
    setScanning(false);
    setQuery(waarde);
    zoekOp(waarde);
  }

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
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green">Uitslag</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 flex flex-col gap-4">
        {!box && (
          <form onSubmit={zoek} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-ink">Zoek op BoxID of partijcode</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input flex-1"
                placeholder="bv. 12 of 0682600025"
              />
              <button disabled={searching} className="rounded-xl bg-green px-4 text-sm font-semibold text-white">
                {searching ? "…" : "Zoek"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="w-full rounded-xl border-[1.5px] border-dashed border-goldDeep bg-goldSoft py-3 text-sm font-semibold text-goldDeep"
            >
              Scan QR-label
            </button>
          </form>
        )}

        {scanning && <QrScanner onResult={scanResultaat} onClose={() => setScanning(false)} />}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {box && (
          <form onSubmit={bevestig} className="flex flex-col gap-4">
            <div className="rounded-2xl border-[1.5px] border-gold bg-white p-3.5">
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
          </form>
        )}
      </div>
    </div>
  );
}
