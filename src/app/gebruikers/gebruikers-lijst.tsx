"use client";

import { useState } from "react";

type Rol = { id: string; naam: string };
type Gebruiker = {
  id: string;
  naam: string;
  email: string;
  rol: Rol | null;
  status: "actief" | "geblokkeerd";
};

export default function GebruikersLijst({
  initieel,
  rollen,
  huidigId,
}: {
  initieel: Gebruiker[];
  rollen: Rol[];
  huidigId: string;
}) {
  const [lijst, setLijst] = useState(initieel);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [rolId, setRolId] = useState(rollen[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<Gebruiker | null>(null);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gebruikers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email, rolId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setLijst((l) => [...l, data.gebruiker].sort((a, b) => a.naam.localeCompare(b.naam)));
      setNaam("");
      setEmail("");
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

  async function wisselRol(g: Gebruiker, nieuweRolId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gebruikers/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolId: nieuweRolId }),
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

  async function bevestigVerwijderen() {
    if (!teVerwijderen) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gebruikers/${teVerwijderen.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setLijst((l) => l.filter((x) => x.id !== teVerwijderen.id));
      setTeVerwijderen(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
      <form
        onSubmit={toevoegen}
        className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-line bg-white p-4 md:w-72 md:flex-shrink-0"
      >
        <p className="text-xs font-bold text-ink">Nieuwe gebruiker aanmaken</p>
        <input required value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam" className="input" />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@beekvreugdkaas.nl"
          className="input"
        />
        <select value={rolId} onChange={(e) => setRolId(e.target.value)} className="input">
          {rollen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.naam}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded-xl bg-gold py-2.5 text-sm font-bold text-white">
          Gebruiker aanmaken
        </button>
        <p className="text-[11px] text-inkSoft">
          Geen wachtwoord nodig — de gebruiker logt in met e-mail + eenmalige code (§4.2).
        </p>
      </form>

      <div className="flex-1 min-w-0">
        {/* Mobiel: gestapelde kaartjes */}
        <div className="flex flex-col gap-2 md:hidden">
          {lijst.map((g) => (
            <div key={g.id} className="rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-semibold">
                  {g.naam} {g.id === huidigId && <span className="text-inkSoft font-normal">(jij)</span>}
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
              <div className="flex items-center justify-between">
                <div className="text-xs text-inkSoft flex items-center gap-1.5">
                  <span>{g.email}</span>
                  {g.id === huidigId ? (
                    <span>· {g.rol?.naam ?? "Geen rol"}</span>
                  ) : (
                    <select
                      value={g.rol?.id ?? ""}
                      onChange={(e) => wisselRol(g, e.target.value)}
                      disabled={busy}
                      className="border-0 bg-transparent text-xs text-inkSoft underline"
                    >
                      {rollen.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.naam}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {g.id !== huidigId && (
                  <button onClick={() => setTeVerwijderen(g)} className="text-xs text-red-600 underline flex-shrink-0 ml-2">
                    verwijderen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: echte tabel */}
        <table className="hidden md:table w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-inkSoft border-b border-line">
              <th className="py-2 pr-3 font-semibold">Naam</th>
              <th className="py-2 pr-3 font-semibold">E-mail</th>
              <th className="py-2 pr-3 font-semibold">Rol</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((g) => (
              <tr key={g.id} className="border-b border-line last:border-0">
                <td className="py-3 pr-3 font-medium">
                  {g.naam} {g.id === huidigId && <span className="text-inkSoft font-normal">(jij)</span>}
                </td>
                <td className="py-3 pr-3 text-inkSoft">{g.email}</td>
                <td className="py-3 pr-3">
                  {g.id === huidigId ? (
                    <span>{g.rol?.naam ?? "Geen rol"}</span>
                  ) : (
                    <select
                      value={g.rol?.id ?? ""}
                      onChange={(e) => wisselRol(g, e.target.value)}
                      disabled={busy}
                      className="rounded-lg border-[1.5px] border-line px-2 py-1 text-xs"
                    >
                      {rollen.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.naam}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <button
                    onClick={() => wisselStatus(g)}
                    disabled={busy || g.id === huidigId}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
                      g.status === "actief" ? "bg-greenSoft text-green" : "bg-red-100 text-red-700"
                    } disabled:opacity-40`}
                  >
                    {g.status === "actief" ? "Actief" : "Geblokkeerd"}
                  </button>
                </td>
                <td className="py-3 text-right">
                  {g.id !== huidigId && (
                    <button onClick={() => setTeVerwijderen(g)} className="text-xs text-red-600 underline">
                      Verwijderen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teVerwijderen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="font-serif text-lg font-semibold text-green mb-2">Gebruiker verwijderen?</p>
            <p className="text-sm text-inkSoft mb-4">
              {teVerwijderen.naam} ({teVerwijderen.email}) wordt definitief verwijderd. Dit kan niet ongedaan gemaakt
              worden — overweeg in plaats daarvan "Geblokkeerd" als het account misschien nog terugkomt.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setTeVerwijderen(null)}
                className="rounded-xl border-[1.5px] border-line px-4 py-2 text-sm font-semibold"
              >
                Annuleren
              </button>
              <button
                onClick={bevestigVerwijderen}
                disabled={busy}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Bezig…" : "Definitief verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
