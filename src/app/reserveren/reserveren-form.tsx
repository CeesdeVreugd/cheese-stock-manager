"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QrScanner from "@/components/qr-scanner";

type Box = {
  id: string;
  boxId: number;
  productafkomst: string;
  model: string;
  partijcode: string;
  aantalKazen: number;
  nettoGram: number;
};

type BestaandeReservering = {
  id: string;
  volledigeBox: boolean;
  aantalKazen: number | null;
  klant: string | null;
} | null;

export default function ReserverenForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<Box | null>(null);
  const [bestaande, setBestaande] = useState<BestaandeReservering>(null);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [volledigeBox, setVolledigeBox] = useState(true);
  const [aantalKazen, setAantalKazen] = useState("");
  const [klant, setKlant] = useState("");
  const [opmerking, setOpmerking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);

  async function zoekOp(waarde: string) {
    setSearching(true);
    setError(null);
    setBox(null);
    setBestaande(null);
    try {
      const res = await fetch(`/api/reserveringen/zoek-box?q=${encodeURIComponent(waarde)}`);
      const data = await res.json();
      if (!data.box) throw new Error("Geen box gevonden met dat BoxID of die partijcode");
      setBox(data.box);
      setBestaande(data.bestaandeReservering || null);
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
      const res = await fetch("/api/reserveringen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId: box.boxId,
          volledigeBox,
          aantalKazen: volledigeBox ? undefined : aantalKazen,
          klant,
          opmerking,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reserveren mislukt");
      setGelukt(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function nieuweReservering() {
    setBox(null);
    setBestaande(null);
    setQuery("");
    setVolledigeBox(true);
    setAantalKazen("");
    setKlant("");
    setOpmerking("");
    setGelukt(false);
  }

  return (
    <div className="min-h-screen flex flex-col md:min-h-0 md:max-w-3xl md:mx-auto md:my-10 md:rounded-3xl md:border md:border-line md:shadow-xl md:bg-cream md:overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 md:px-8">
        <Link href="/dashboard" className="text-sm font-semibold text-green">
          ‹ Terug
        </Link>
        <h1 className="font-serif font-semibold text-green md:text-lg">Reserveren</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 md:px-8 flex flex-col gap-4">
        {gelukt && (
          <div className="flex flex-col items-center text-center gap-3 mt-10">
            <p className="font-serif text-xl font-semibold text-green">Reservering vastgelegd</p>
            <p className="text-sm text-inkSoft max-w-xs">
              Box #{box?.boxId} is gereserveerd{klant ? ` voor ${klant}` : ""}. Zichtbaar in het reserveringenoverzicht
              en met een label in Voorraad.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={nieuweReservering}
                className="rounded-xl border-[1.5px] border-line bg-white px-4 py-2.5 text-sm font-semibold text-green"
              >
                Nog een reservering
              </button>
              <Link href="/reserveringen" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white">
                Naar overzicht
              </Link>
            </div>
          </div>
        )}

        {!gelukt && !box && (
          <form onSubmit={zoek} className="flex flex-col gap-3 md:max-w-md">
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

        {!gelukt && box && (
          <form onSubmit={bevestig} className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 md:items-start">
            <div className="min-w-0 rounded-2xl border-[1.5px] border-gold bg-white p-3.5">
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
              {bestaande && (
                <div className="mt-3 rounded-lg bg-goldSoft p-2.5 text-xs text-goldDeep">
                  Let op: deze box heeft al een openstaande reservering
                  {bestaande.klant ? ` (voor ${bestaande.klant})` : ""}.
                </div>
              )}
            </div>

            <div className="min-w-0 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-ink mb-1.5">Reservering</p>
                <div className="flex rounded-xl bg-goldSoft p-1">
                  <button
                    type="button"
                    onClick={() => setVolledigeBox(true)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                      volledigeBox ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    Hele box
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolledigeBox(false)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                      !volledigeBox ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    Aantal kazen
                  </button>
                </div>
              </div>

              {!volledigeBox && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Aantal kazen</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={box.aantalKazen}
                    value={aantalKazen}
                    onChange={(e) => setAantalKazen(e.target.value)}
                    className="input"
                  />
                  <p className="text-[11px] text-inkSoft mt-1">Maximaal {box.aantalKazen} beschikbaar</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Klant / bestemming (optioneel)</label>
                <input value={klant} onChange={(e) => setKlant(e.target.value)} className="input" placeholder="Groothandel..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Opmerking (optioneel)</label>
                <textarea value={opmerking} onChange={(e) => setOpmerking(e.target.value)} className="input h-20" />
              </div>

              <button disabled={busy} className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60">
                {busy ? "Vastleggen…" : "Reservering vastleggen"}
              </button>
              <p className="text-[11px] text-inkSoft text-center">
                Dit past de voorraad nog niet aan — de daadwerkelijke uitslag gebeurt apart.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
