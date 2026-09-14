"use client";

import { useState } from "react";
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

type Klant = { id: string; naam: string };

export default function AfroepenForm({
  boxen,
  klanten,
  beschikbaarPerBox,
}: {
  boxen: Box[];
  klanten: Klant[];
  beschikbaarPerBox: Record<number, number>;
}) {
  const router = useRouter();
  const [box, setBox] = useState<Box | null>(null);
  const [volledigeBox, setVolledigeBox] = useState(true);
  const [aantalKazen, setAantalKazen] = useState("");
  const [klant, setKlant] = useState("");
  const [opmerking, setOpmerking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);

  const beschikbaar = box ? beschikbaarPerBox[box.boxId] ?? box.aantalKazen : 0;
  const volledigBeschikbaar = box ? beschikbaar >= box.aantalKazen : true;
  const nietsBeschikbaar = box ? beschikbaar <= 0 : false;

  function kiesBox(gekozen: Box) {
    setBox(gekozen);
    const beschikbaarVoorGekozen = beschikbaarPerBox[gekozen.boxId] ?? gekozen.aantalKazen;
    // Is er al een deel afgeroepen? Dan is "hele box" niet meer zinnig —
    // meteen op "aantal kazen" zetten, begrensd op wat nog vrij is.
    setVolledigeBox(beschikbaarVoorGekozen >= gekozen.aantalKazen);
    setAantalKazen("");
  }

  async function bevestig(e: React.FormEvent) {
    e.preventDefault();
    if (!box) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/afroeporders", {
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
      if (!res.ok) throw new Error(data.error || "Afroepen mislukt");
      setGelukt(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function nieuweAfroep() {
    setBox(null);
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
        <h1 className="font-serif font-semibold text-green md:text-lg">Afroepen</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-6 md:px-8 flex flex-col gap-4">
        {gelukt && (
          <div className="flex flex-col items-center text-center gap-3 mt-10">
            <p className="font-serif text-xl font-semibold text-green">Afroep vastgelegd</p>
            <p className="text-sm text-inkSoft max-w-xs">
              Box #{box?.boxId} is afgeroepen{klant ? ` voor ${klant}` : ""}. Zichtbaar bij afroeporders
              en met een label in Voorraad.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={nieuweAfroep}
                className="rounded-xl border-[1.5px] border-line bg-white px-4 py-2.5 text-sm font-semibold text-green"
              >
                Nog een afroep
              </button>
              <Link href="/afroeporders" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-white">
                Naar overzicht
              </Link>
            </div>
          </div>
        )}

        {!gelukt && !box && (
          <>
            <p className="text-xs font-bold text-ink">Kies een box</p>
            <BoxKiezer boxen={boxen} onSelect={kiesBox} beschikbaarPerBox={beschikbaarPerBox} />
          </>
        )}

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
                {!volledigBeschikbaar && (
                  <>
                    <div className="text-inkSoft mt-1">BESCHIKBAAR</div>
                    <div />
                    <div className={`font-medium ${nietsBeschikbaar ? "text-red-600" : "text-goldDeep"}`}>
                      {beschikbaar} van de {box.aantalKazen} stuks
                    </div>
                  </>
                )}
              </div>
              {nietsBeschikbaar && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                  Deze box is al volledig afgeroepen door iemand anders — niets meer beschikbaar.
                </p>
              )}
            </div>

            <div className="min-w-0 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-ink mb-1.5">Afroep</p>
                <div className="flex rounded-xl bg-goldSoft p-1">
                  <button
                    type="button"
                    disabled={!volledigBeschikbaar}
                    onClick={() => setVolledigeBox(true)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                      volledigeBox ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    Hele box
                  </button>
                  <button
                    type="button"
                    disabled={nietsBeschikbaar}
                    onClick={() => setVolledigeBox(false)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                      !volledigeBox ? "bg-white text-green shadow" : "text-goldDeep"
                    }`}
                  >
                    Aantal kazen
                  </button>
                </div>
                {!volledigBeschikbaar && !nietsBeschikbaar && (
                  <p className="text-[11px] text-inkSoft mt-1">
                    Een deel is al afgeroepen — je kunt nu alleen nog een aantal kazen kiezen.
                  </p>
                )}
              </div>

              {!volledigeBox && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Aantal kazen</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={beschikbaar}
                    value={aantalKazen}
                    onChange={(e) => setAantalKazen(e.target.value)}
                    className="input"
                  />
                  <p className="text-[11px] text-inkSoft mt-1">Maximaal {beschikbaar} beschikbaar</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Klant / bestemming</label>
                <select value={klant} onChange={(e) => setKlant(e.target.value)} className="input">
                  <option value="">Geen / onbekend</option>
                  {klanten.map((k) => (
                    <option key={k.id} value={k.naam}>
                      {k.naam}
                    </option>
                  ))}
                </select>
                {klanten.length === 0 && (
                  <p className="text-[11px] text-inkSoft mt-1">
                    Nog geen klanten ingesteld —{" "}
                    <Link href="/validaties" className="underline">
                      beheer validatielijsten
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Opmerking (optioneel)</label>
                <textarea value={opmerking} onChange={(e) => setOpmerking(e.target.value)} className="input h-20" />
              </div>

              <button
                disabled={busy || nietsBeschikbaar}
                className="w-full rounded-xl bg-gold py-3.5 font-bold text-white shadow-md disabled:opacity-60"
              >
                {busy ? "Vastleggen…" : "Afroep vastleggen"}
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
