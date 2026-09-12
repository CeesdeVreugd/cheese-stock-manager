"use client";

import { useState } from "react";

type Item = { id: string; naam: string };

export default function ValidatieLijst({
  soort,
  titel,
  initieel,
}: {
  soort: "productafkomst" | "proces" | "model";
  titel: string;
  initieel: Item[];
}) {
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
      const res = await fetch("/api/validaties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soort, naam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Toevoegen mislukt");
      setLijst((l) => [...l.filter((x) => x.id !== data.item.id), data.item].sort((a, b) => a.naam.localeCompare(b.naam)));
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
      const res = await fetch(`/api/validaties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setLijst((l) => l.filter((x) => x.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-7">
      <p className="text-xs font-bold uppercase tracking-wide text-inkSoft mb-2.5">{titel}</p>
      <form onSubmit={toevoegen} className="flex gap-2 mb-3">
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder={`Nieuwe ${titel.toLowerCase()}`}
          className="input flex-1"
        />
        <button disabled={busy} className="rounded-xl bg-gold px-4 text-sm font-semibold text-white">
          +
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex flex-col gap-2">
        {lijst.length === 0 && <p className="text-sm text-inkSoft">Nog niets toegevoegd.</p>}
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
