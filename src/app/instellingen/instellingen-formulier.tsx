"use client";

import { useState } from "react";

type Eenheid = "uur" | "dagen";

function splits(uren: number): { waarde: number; eenheid: Eenheid } {
  return uren % 24 === 0 ? { waarde: uren / 24, eenheid: "dagen" } : { waarde: uren, eenheid: "uur" };
}

export default function InstellingenFormulier({ startUren }: { startUren: number }) {
  const begin = splits(startUren);
  const [waarde, setWaarde] = useState(String(begin.waarde));
  const [eenheid, setEenheid] = useState<Eenheid>(begin.eenheid);
  const [busy, setBusy] = useState(false);
  const [bericht, setBericht] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);

  async function bewaar(e: React.FormEvent) {
    e.preventDefault();
    setBericht(null);
    const n = Number(waarde.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setBericht({ soort: "fout", tekst: "Vul een getal groter dan 0 in." });
      return;
    }
    const uren = Math.round(eenheid === "dagen" ? n * 24 : n);
    setBusy(true);
    try {
      const res = await fetch("/api/instellingen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieUren: uren }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      const nieuw = splits(data.sessieUren);
      setWaarde(String(nieuw.waarde));
      setEenheid(nieuw.eenheid);
      setBericht({ soort: "ok", tekst: "Opgeslagen. Dit geldt voor iedereen die vanaf nu inlogt." });
    } catch (err: any) {
      setBericht({ soort: "fout", tekst: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={bewaar} className="rounded-2xl border-[1.5px] border-line bg-white p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-ink">Inlog verloopt na</p>
        <p className="text-xs text-inkSoft mt-1">
          Zolang de inlog geldig is, open je de app met je pincode. Daarna moet iemand opnieuw inloggen met e-mail en
          code. De pincode zelf blijft op het toestel bewaard, die hoeft niet opnieuw ingesteld te worden.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={waarde}
          onChange={(e) => setWaarde(e.target.value)}
          className="input w-28"
          aria-label="Aantal"
        />
        <select value={eenheid} onChange={(e) => setEenheid(e.target.value as Eenheid)} className="input w-32">
          <option value="uur">uur</option>
          <option value="dagen">dagen</option>
        </select>
      </div>
      <p className="text-[11px] text-inkSoft">Tussen 1 uur en 365 dagen. Standaard: 14 dagen.</p>
      <p className="text-[11px] text-inkSoft">
        Een nieuwe waarde geldt vanaf de eerstvolgende keer dat iemand inlogt. Wie nu al is ingelogd, houdt de
        periode waarmee hij of zij is ingelogd.
      </p>
      {bericht && (
        <p className={`text-sm ${bericht.soort === "ok" ? "text-green" : "text-red-600"}`}>{bericht.tekst}</p>
      )}
      <div>
        <button disabled={busy} className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "Bezig…" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
