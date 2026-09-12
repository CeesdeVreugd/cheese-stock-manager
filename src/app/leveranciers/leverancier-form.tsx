"use client";

import { useState } from "react";

type Leverancier = { id: string; naam: string };

export default function LeverancierForm({ initieel }: { initieel: Leverancier[] }) {
  const [lijst, setLijst] = useState(initieel);
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leveranciers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toevoegen mislukt");
      setLijst((l) => [...l.filter((x) => x.id !== data.leverancier.id), data.leverancier].sort((a, b) => a.naam.localeCompare(b.naam)));
      setNaam("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verwijderen(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leveranciers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setLijst((l) => l.filter((x) => x.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={toevoegen} className="flex gap-2">
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Naam productafkomst"
          className="input flex-1"
        />
        <button disabled={busy} className="rounded-xl bg-gold px-4 text-sm font-semibold text-white">
          Toevoegen
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {lijst.length === 0 && <p className="text-sm text-inkSoft">Nog geen leveranciers toegevoegd.</p>}
        {lijst.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5">
            <span className="text-sm font-medium">{l.naam}</span>
            <button onClick={() => verwijderen(l.id)} disabled={busy} className="text-xs text-red-600 underline">
              verwijderen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
