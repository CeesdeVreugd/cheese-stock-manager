"use client";

import { useState } from "react";

type Rol = {
  id: string;
  naam: string;
  canInslag: boolean;
  canUitslag: boolean;
  canVoorraad: boolean;
  canFacturatie: boolean;
  canReserveren: boolean;
  canBeheer: boolean;
  _count: { gebruikers: number };
};

const PERMISSIES: { veld: keyof Rol; label: string }[] = [
  { veld: "canInslag", label: "Inslag" },
  { veld: "canUitslag", label: "Uitslag" },
  { veld: "canVoorraad", label: "Voorraad" },
  { veld: "canFacturatie", label: "Facturatie" },
  { veld: "canReserveren", label: "Reserveren" },
  { veld: "canBeheer", label: "Beheer (validatielijsten, gebruikers, rollen)" },
];

export default function RollenLijst({ initieel, huidigRolId }: { initieel: Rol[]; huidigRolId: string }) {
  const [rollen, setRollen] = useState(initieel);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<Rol | null>(null);

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuweNaam.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rollen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: nieuweNaam }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setRollen((r) => [...r, data.rol].sort((a, b) => a.naam.localeCompare(b.naam)));
      setNieuweNaam("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function wisselPermissie(rol: Rol, veld: keyof Rol) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rollen/${rol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [veld]: !rol[veld] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bijwerken mislukt");
      setRollen((r) => r.map((x) => (x.id === rol.id ? data.rol : x)));
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
      const res = await fetch(`/api/rollen/${teVerwijderen.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verwijderen mislukt");
      setRollen((r) => r.filter((x) => x.id !== teVerwijderen.id));
      setTeVerwijderen(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={toevoegen} className="flex gap-2">
        <input
          value={nieuweNaam}
          onChange={(e) => setNieuweNaam(e.target.value)}
          placeholder="Naam nieuwe rol, bv. Verkoop"
          className="input flex-1"
        />
        <button disabled={busy} className="rounded-xl bg-gold px-4 text-sm font-semibold text-white whitespace-nowrap">
          Rol toevoegen
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {rollen.map((rol) => (
          <div key={rol.id} className="rounded-2xl border-[1.5px] border-line bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-serif font-semibold text-green">{rol.naam}</span>
                <span className="text-xs text-inkSoft ml-2">
                  {rol._count.gebruikers} gebruiker{rol._count.gebruikers === 1 ? "" : "s"}
                </span>
                {rol.id === huidigRolId && <span className="text-xs text-inkSoft ml-2">(jouw rol)</span>}
              </div>
              {rol._count.gebruikers === 0 && (
                <button onClick={() => setTeVerwijderen(rol)} className="text-xs text-red-600 underline">
                  verwijderen
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PERMISSIES.map((p) => {
                const aan = Boolean(rol[p.veld]);
                const disabled = busy || (rol.id === huidigRolId && p.veld === "canBeheer" && aan);
                return (
                  <label
                    key={p.veld}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
                      aan ? "bg-greenSoft text-green" : "bg-cream text-inkSoft"
                    } ${disabled ? "opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={aan}
                      disabled={disabled}
                      onChange={() => wisselPermissie(rol, p.veld)}
                      className="accent-green"
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {teVerwijderen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="font-serif text-lg font-semibold text-green mb-2">Rol verwijderen?</p>
            <p className="text-sm text-inkSoft mb-4">
              De rol "{teVerwijderen.naam}" wordt definitief verwijderd. Dit kan alleen omdat er nu geen gebruikers
              aan gekoppeld zijn.
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
