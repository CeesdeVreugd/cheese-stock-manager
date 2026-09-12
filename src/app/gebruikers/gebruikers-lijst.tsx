"use client";

import { useState } from "react";

type Gebruiker = {
  id: string;
  naam: string;
  email: string;
  rol: "beheerder" | "medewerker" | "lezer";
  status: "actief" | "geblokkeerd";
};

export default function GebruikersLijst({ initieel, huidigId }: { initieel: Gebruiker[]; huidigId: string }) {
  const [lijst, setLijst] = useState(initieel);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Gebruiker["rol"]>("medewerker");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gebruikers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email, rol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setLijst((l) => [...l, data.gebruiker].sort((a, b) => a.naam.localeCompare(b.naam)));
      setNaam("");
      setEmail("");
      setRol("medewerker");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function wisselStatus(g: Gebruiker) {
    setBusy(true);
    setError(null);
    const nieuweStatus = g.status === "actief" ? "geblokkeerd" : "actief";
    try {
      const res = await fetch(`/api/gebruikers/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nieuweStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bijwerken mislukt");
      setLijst((l) => l.map((x) => (x.id === g.id ? data.gebruiker : x)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={toevoegen} className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-line bg-white p-4">
        <p className="text-xs font-bold text-ink">Nieuwe gebruiker aanmaken</p>
        <input required value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam" className="input" />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@vanbeekkaas.nl"
          className="input"
        />
        <select value={rol} onChange={(e) => setRol(e.target.value as Gebruiker["rol"])} className="input">
          <option value="medewerker">Medewerker</option>
          <option value="beheerder">Beheerder</option>
          <option value="lezer">Lezer</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded-xl bg-gold py-2.5 text-sm font-bold text-white">
          Gebruiker aanmaken
        </button>
        <p className="text-[11px] text-inkSoft">
          Geen wachtwoord nodig — de gebruiker logt in met e-mail + eenmalige code (§4.2).
        </p>
      </form>

      <div className="flex flex-col gap-2">
        {lijst.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5">
            <div>
              <div className="text-sm font-semibold">
                {g.naam} {g.id === huidigId && <span className="text-inkSoft font-normal">(jij)</span>}
              </div>
              <div className="text-xs text-inkSoft">
                {g.email} · {g.rol}
              </div>
            </div>
            <button
              onClick={() => wisselStatus(g)}
              disabled={busy || g.id === huidigId}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
                g.status === "actief" ? "bg-greenSoft text-green" : "bg-red-100 text-red-700"
              } disabled:opacity-40`}
            >
              {g.status === "actief" ? "Actief" : "Geblokkeerd"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
