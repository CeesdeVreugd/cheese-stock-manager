"use client";

import { useState } from "react";

type Rol = { id: string; naam: string };
type Gebruiker = {
  id: string;
  naam: string;
  email: string;
  rol: Rol | null;
  status: "actief" | "geblokkeerd";
  // Alleen gevuld in de lijst zoals de pagina die laadt; nieuw aangemaakte of
  // net aangepaste gebruikers krijgen deze waarden uit de bestaande rij.
  meldingenToestellen?: number;
  geactiveerdOp?: string | null;
  laatsteLogin?: string | null;
};

const TIJDZONE = "Europe/Amsterdam";
function fmtMoment(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const datum = d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIJDZONE });
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TIJDZONE });
  return `${datum} ${tijd}`;
}
function fmtDatumAlleen(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIJDZONE });
}

function Badge({ aan, aanTekst, uitTekst }: { aan: boolean; aanTekst: string; uitTekst: string }) {
  return (
    <span
      className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-1 ${
        aan ? "bg-greenSoft text-green" : "bg-cream text-inkSoft border border-line"
      }`}
    >
      {aan ? aanTekst : uitTekst}
    </span>
  );
}

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
  const [stuurUitnodiging, setStuurUitnodiging] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<Gebruiker | null>(null);
  const [gereset, setGereset] = useState<string | null>(null);
  const [uitnodigingStatus, setUitnodigingStatus] = useState<string | null>(null);
  const [teBewerken, setTeBewerken] = useState<Gebruiker | null>(null);
  const [bewerkNaam, setBewerkNaam] = useState("");
  const [bewerkEmail, setBewerkEmail] = useState("");
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);

  function startBewerken(g: Gebruiker) {
    setTeBewerken(g);
    setBewerkNaam(g.naam);
    setBewerkEmail(g.email);
    setBewerkFout(null);
  }

  async function bewaarBewerking(e: React.FormEvent) {
    e.preventDefault();
    if (!teBewerken) return;
    setBusy(true);
    setBewerkFout(null);
    try {
      const body: { naam: string; email?: string } = { naam: bewerkNaam };
      if (teBewerken.id !== huidigId) body.email = bewerkEmail;
      const res = await fetch(`/api/gebruikers/${teBewerken.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setLijst((l) => l.map((x) => (x.id === teBewerken.id ? { ...x, ...data.gebruiker } : x)).sort((a, b) => a.naam.localeCompare(b.naam)));
      setTeBewerken(null);
    } catch (err: any) {
      setBewerkFout(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toevoegen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUitnodigingStatus(null);
    try {
      const res = await fetch("/api/gebruikers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email, rolId, stuurUitnodiging }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setLijst((l) => [...l, { meldingenToestellen: 0, geactiveerdOp: null, laatsteLogin: null, ...data.gebruiker }].sort((a, b) => a.naam.localeCompare(b.naam)));
      if (stuurUitnodiging) {
        setUitnodigingStatus(
          data.uitnodigingVerstuurd
            ? `Uitnodigingsmail verstuurd naar ${data.gebruiker.email}.`
            : data.uitnodigingFout || "Uitnodigingsmail kon niet verstuurd worden."
        );
      }
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
      setLijst((l) => l.map((x) => (x.id === g.id ? { ...x, ...data.gebruiker } : x)));
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
      setLijst((l) => l.map((x) => (x.id === g.id ? { ...x, ...data.gebruiker } : x)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPincode(g: Gebruiker) {
    if (!confirm(`Pincode van ${g.naam} resetten? Die persoon moet dan overal opnieuw met e-mail inloggen.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gebruikers/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPincode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resetten mislukt");
      setGereset(g.naam);
      setTimeout(() => setGereset(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uitnodigen(g: Gebruiker) {
    setBusy(true);
    setError(null);
    setUitnodigingStatus(null);
    try {
      const res = await fetch(`/api/gebruikers/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stuurUitnodiging: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Versturen mislukt");
      setUitnodigingStatus(
        data.uitnodigingVerstuurd ? `Uitnodigingsmail verstuurd naar ${g.email}.` : data.uitnodigingFout || "Versturen mislukt."
      );
      setTimeout(() => setUitnodigingStatus(null), 4000);
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
    <div className="flex flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={() => setToonFormulier((v) => !v)}
          className="rounded-xl border-[1.5px] border-gold bg-white px-4 py-2 text-sm font-bold text-goldDeep"
        >
          {toonFormulier ? "Sluiten" : "+ Nieuwe gebruiker"}
        </button>
      </div>

      <form
        onSubmit={toevoegen}
        className={`${toonFormulier ? "flex" : "hidden"} flex-col gap-3 rounded-2xl border-[1.5px] border-line bg-white p-4 md:max-w-md`}
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

        <label className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2.5 cursor-pointer">
          <span className="text-xs font-semibold text-ink">Stuur uitnodigingsmail</span>
          <button
            type="button"
            role="switch"
            aria-checked={stuurUitnodiging}
            onClick={() => setStuurUitnodiging((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
              stuurUitnodiging ? "bg-gold" : "bg-line"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                stuurUitnodiging ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {uitnodigingStatus && <p className="text-xs text-green">{uitnodigingStatus}</p>}
        <button disabled={busy} className="rounded-xl bg-gold py-2.5 text-sm font-bold text-white">
          {busy ? "Bezig…" : "Gebruiker aanmaken"}
        </button>
        <p className="text-[11px] text-inkSoft">
          Geen wachtwoord nodig — de gebruiker logt in met e-mail + eenmalige code (§4.2).
        </p>
      </form>

      <div className="flex-1 min-w-0">
        {gereset && (
          <p className="text-sm text-green mb-3 bg-greenSoft rounded-lg px-3 py-2">
            Pincode van {gereset} gereset — die persoon moet nu opnieuw met e-mail inloggen.
          </p>
        )}
        {uitnodigingStatus && (
          <p className="text-sm text-green mb-3 bg-greenSoft rounded-lg px-3 py-2">{uitnodigingStatus}</p>
        )}
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
              <div className="flex items-center justify-between mb-1.5">
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
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge aan={(g.meldingenToestellen ?? 0) > 0} aanTekst={`Meldingen aan (${g.meldingenToestellen})`} uitTekst="Meldingen uit" />
                <Badge aan={!!g.geactiveerdOp} aanTekst="App geactiveerd" uitTekst="Niet geactiveerd" />
                <span className="text-[11px] text-inkSoft">
                  Laatst ingelogd: {fmtMoment(g.laatsteLogin) ?? "nog nooit"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => startBewerken(g)} disabled={busy} className="text-xs text-ink underline flex-shrink-0">
                    bewerken
                  </button>
                  <button onClick={() => uitnodigen(g)} disabled={busy} className="text-xs text-green underline flex-shrink-0">
                    uitnodigen
                  </button>
                  <button onClick={() => resetPincode(g)} disabled={busy} className="text-xs text-goldDeep underline flex-shrink-0">
                    pincode resetten
                  </button>
                </div>
                {g.id !== huidigId && (
                  <button onClick={() => setTeVerwijderen(g)} className="text-xs text-red-600 underline flex-shrink-0">
                    verwijderen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: overzichtelijke tabel, volledige breedte, naam en e-mail samen */}
        <div className="hidden md:block rounded-2xl border-[1.5px] border-line bg-white overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-inkSoft bg-greenSoft">
                <th className="py-2.5 px-4 font-semibold">Gebruiker</th>
                <th className="py-2.5 px-3 font-semibold">Rol</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Meldingen</th>
                <th className="py-2.5 px-3 font-semibold">App</th>
                <th className="py-2.5 px-3 font-semibold">Laatst ingelogd</th>
                <th className="py-2.5 px-4 font-semibold text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {lijst.map((g) => (
                <tr key={g.id} className="border-t border-line align-middle">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink">
                      {g.naam} {g.id === huidigId && <span className="text-inkSoft font-normal">(jij)</span>}
                    </div>
                    <div className="text-xs text-inkSoft break-all">{g.email}</div>
                  </td>
                  <td className="py-3 px-3">
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
                  <td className="py-3 px-3">
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
                  <td className="py-3 px-3">
                    <Badge aan={(g.meldingenToestellen ?? 0) > 0} aanTekst={`Aan (${g.meldingenToestellen})`} uitTekst="Uit" />
                  </td>
                  <td className="py-3 px-3">
                    <Badge aan={!!g.geactiveerdOp} aanTekst="Geactiveerd" uitTekst="Nog niet" />
                    {g.geactiveerdOp && (
                      <div className="text-[11px] text-inkSoft mt-1 whitespace-nowrap">sinds {fmtDatumAlleen(g.geactiveerdOp)}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs text-inkSoft">
                    {fmtMoment(g.laatsteLogin) ?? "nog nooit"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <button onClick={() => startBewerken(g)} disabled={busy} className="text-ink underline">
                        Bewerken
                      </button>
                      <button onClick={() => uitnodigen(g)} disabled={busy} className="text-green underline">
                        Uitnodigen
                      </button>
                      <button onClick={() => resetPincode(g)} disabled={busy} className="text-goldDeep underline">
                        Pincode resetten
                      </button>
                      {g.id !== huidigId && (
                        <button onClick={() => setTeVerwijderen(g)} className="text-red-600 underline">
                          Verwijderen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      {teBewerken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <form onSubmit={bewaarBewerking} className="w-full max-w-sm rounded-2xl bg-white p-5 flex flex-col gap-3">
            <p className="font-serif text-lg font-semibold text-green">Gebruiker bewerken</p>
            <label className="text-xs font-semibold text-ink">
              Naam
              <input required value={bewerkNaam} onChange={(e) => setBewerkNaam(e.target.value)} className="input mt-1" />
            </label>
            <label className="text-xs font-semibold text-ink">
              E-mailadres
              <input
                required
                type="email"
                value={bewerkEmail}
                onChange={(e) => setBewerkEmail(e.target.value)}
                disabled={teBewerken.id === huidigId}
                className="input mt-1 disabled:opacity-60"
              />
            </label>
            {teBewerken.id === huidigId ? (
              <p className="text-[11px] text-inkSoft">Je eigen e-mailadres kun je niet zelf wijzigen (daarmee log je in); laat dat een andere beheerder doen.</p>
            ) : (
              <p className="text-[11px] text-inkSoft">Na een wijziging logt deze persoon voortaan in met het nieuwe e-mailadres.</p>
            )}
            {bewerkFout && <p className="text-sm text-red-600">{bewerkFout}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setTeBewerken(null)}
                className="rounded-xl border-[1.5px] border-line px-4 py-2 text-sm font-semibold"
              >
                Annuleren
              </button>
              <button disabled={busy} className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Bezig…" : "Opslaan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
