"use client";

import { useState } from "react";

type Reservering = {
  id: string;
  boxId: number;
  volledigeBox: boolean;
  aantalKazen: number | null;
  klant: string | null;
  opmerking: string | null;
  status: "open" | "uitgevoerd" | "geannuleerd";
  createdAt: string;
  gebruiker: { naam: string };
};

function fmtDatumTijd(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

const STATUS_LABEL: Record<Reservering["status"], string> = {
  open: "Open",
  uitgevoerd: "Uitgevoerd",
  geannuleerd: "Geannuleerd",
};
const STATUS_KLEUR: Record<Reservering["status"], string> = {
  open: "bg-goldSoft text-goldDeep",
  uitgevoerd: "bg-greenSoft text-green",
  geannuleerd: "bg-red-100 text-red-700",
};

export default function ReserveringenLijst({ initieel }: { initieel: Reservering[] }) {
  const [lijst, setLijst] = useState(initieel);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function wisselStatus(r: Reservering, status: Reservering["status"]) {
    setBusy(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/reserveringen/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bijwerken mislukt");
      setLijst((l) => l.map((x) => (x.id === r.id ? data.reservering : x)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const omschrijving = (r: Reservering) => (r.volledigeBox ? "Hele box" : `${r.aantalKazen} kazen`);

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {lijst.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Nog geen reserveringen.</p>}

      {/* ---------- Mobiel ---------- */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {lijst.map((r) => (
          <div key={r.id} className="rounded-2xl border-[1.5px] border-line bg-white p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif font-semibold text-green">Box #{r.boxId}</span>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_KLEUR[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <div className="text-xs text-inkSoft mb-1">
              {omschrijving(r)} {r.klant ? `· ${r.klant}` : ""}
            </div>
            <div className="text-xs text-inkSoft mb-2">
              {r.gebruiker.naam} · {fmtDatumTijd(r.createdAt)}
            </div>
            {r.status === "open" && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => wisselStatus(r, "uitgevoerd")}
                  disabled={busy === r.id}
                  className="flex-1 rounded-lg bg-greenSoft text-green text-xs font-semibold py-2"
                >
                  Markeer uitgevoerd
                </button>
                <button
                  onClick={() => wisselStatus(r, "geannuleerd")}
                  disabled={busy === r.id}
                  className="flex-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold py-2"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ---------- Desktop ---------- */}
      {lijst.length > 0 && (
        <table className="hidden md:table w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden border-[1.5px] border-line">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-inkSoft bg-greenSoft">
              <th className="py-3 px-4 font-semibold">Box</th>
              <th className="py-3 px-4 font-semibold">Reservering</th>
              <th className="py-3 px-4 font-semibold">Klant</th>
              <th className="py-3 px-4 font-semibold">Door</th>
              <th className="py-3 px-4 font-semibold">Wanneer</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2.5 px-4 font-serif font-semibold text-green">#{r.boxId}</td>
                <td className="py-2.5 px-4">{omschrijving(r)}</td>
                <td className="py-2.5 px-4 text-inkSoft">{r.klant || "—"}</td>
                <td className="py-2.5 px-4 text-inkSoft">{r.gebruiker.naam}</td>
                <td className="py-2.5 px-4 text-inkSoft">{fmtDatumTijd(r.createdAt)}</td>
                <td className="py-2.5 px-4">
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_KLEUR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  {r.status === "open" && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => wisselStatus(r, "uitgevoerd")}
                        disabled={busy === r.id}
                        className="text-xs font-semibold text-green underline"
                      >
                        Uitgevoerd
                      </button>
                      <button
                        onClick={() => wisselStatus(r, "geannuleerd")}
                        disabled={busy === r.id}
                        className="text-xs font-semibold text-red-600 underline"
                      >
                        Annuleren
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
