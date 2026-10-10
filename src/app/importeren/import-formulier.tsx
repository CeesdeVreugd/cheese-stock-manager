"use client";

import { useEffect, useState } from "react";

type Afwijking = { datum: string; partijcode: string; productafkomst: string; model: string; berekendGram: number; snapshotGram: number };
type Controle = { dagenGecontroleerd: number; aantalAfwijkingen: number; afwijkingen: Afwijking[] };
type Stand = { boxen: number; inslag: number; uitslag: number; afroepen: number; snapshots: number; leeg: boolean };

type ProefResultaat = {
  ok: boolean;
  fouten?: string[];
  waarschuwingen?: string[];
  samenvatting?: {
    boxen: number;
    inslagLogs: number;
    inslagAfgeleid: number;
    uitslagLogs: number;
    uitslagStandaard: number;
    uitslagGeetiketteerd: number;
    snapshots: number;
    voorraadKg: number;
    volgendeBoxId: number;
  };
  controle?: Controle;
  database?: Stand;
  kanImporteren?: boolean;
};

type UitvoerResultaat = {
  ok: boolean;
  fouten?: string[];
  ingevoerd?: Stand;
  controleNaImport?: Controle;
};

const nl = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 3 });

export default function ImportFormulier() {
  const [bestandsnaam, setBestandsnaam] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [proef, setProef] = useState<ProefResultaat | null>(null);
  const [uitvoer, setUitvoer] = useState<UitvoerResultaat | null>(null);
  const [bevestigd, setBevestigd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [stand, setStand] = useState<Stand | null>(null);
  const [wisTekst, setWisTekst] = useState("");
  const [wisBezig, setWisBezig] = useState(false);
  const [wisKlaar, setWisKlaar] = useState<string | null>(null);

  async function laadStand() {
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modus: "stand" }),
      });
      const antwoord = await res.json();
      if (antwoord.database) setStand(antwoord.database);
    } catch {
      /* de stand is alleen informatief */
    }
  }

  useEffect(() => {
    laadStand();
  }, []);

  async function leegmaken() {
    setWisBezig(true);
    setFout(null);
    setWisKlaar(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modus: "leegmaken", bevestiging: wisTekst }),
      });
      const antwoord = await res.json();
      if (!res.ok || !antwoord.ok) throw new Error(antwoord.fouten?.[0] || antwoord.error || "Leegmaken mislukt");
      const v = antwoord.verwijderd as Stand;
      setWisKlaar(
        `Leeggemaakt: ${v.boxen} boxen, ${v.inslag} inslagregels, ${v.uitslag} uitslagregels, ${v.afroepen} afroepen en ${v.snapshots} dagsnapshots verwijderd.`
      );
      setWisTekst("");
      setProef(null);
      setUitvoer(null);
      setBevestigd(false);
      setStand(antwoord.database);
    } catch (err: any) {
      setFout(err.message || "Leegmaken mislukt");
    } finally {
      setWisBezig(false);
    }
  }

  async function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setProef(null);
    setUitvoer(null);
    setBevestigd(false);
    setFout(null);
    setData(null);
    setBestandsnaam(null);
    if (!f) return;
    try {
      setData(JSON.parse(await f.text()));
      setBestandsnaam(f.name);
    } catch {
      setFout("Dit bestand is geen geldig importbestand (import-data.json).");
    }
  }

  async function verstuur(modus: "proef" | "uitvoeren") {
    setBusy(true);
    setFout(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modus, data }),
      });
      const antwoord = await res.json();
      if (modus === "proef") {
        if (antwoord.error) throw new Error(antwoord.error);
        setProef(antwoord);
        setBevestigd(false);
      } else {
        if (antwoord.error) throw new Error(antwoord.error);
        setUitvoer(antwoord);
        laadStand();
      }
    } catch (err: any) {
      setFout(err.message || "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  const knop = "rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40";
  const s = proef?.samenvatting;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-[1.5px] border-line bg-white p-5 text-sm text-ink space-y-2">
        <p>
          Hiermee zet je de gegevens uit het oude Excel-systeem eenmalig in de app. Je kiest het bestand{" "}
          <span className="font-mono text-xs">import-data.json</span> (gemaakt uit een <em>kopie</em> van de Excel — het origineel wordt nergens aangeraakt).
        </p>
        <p className="text-inkSoft">
          Eerst draai je een <strong>proef</strong>: die controleert alles en schrijft niets weg. Pas daarna kun je importeren. Importeren kan alleen als
          Voorraad, Inslag, Uitslag, Afroepen en de dagsnapshots nog leeg zijn, en gebeurt in één keer (alles of niets).
        </p>
      </div>

      <div className="rounded-2xl border-[1.5px] border-line bg-white p-5">
        <label className="block text-xs font-bold uppercase tracking-wide text-inkSoft mb-2">Importbestand</label>
        <input type="file" accept=".json,application/json" onChange={kiesBestand} className="block w-full text-sm" />
        {bestandsnaam && <p className="mt-2 text-xs text-inkSoft">Gekozen: {bestandsnaam}</p>}
        <button
          onClick={() => verstuur("proef")}
          disabled={!data || busy}
          className={`${knop} mt-4 bg-green text-white`}
        >
          {busy && !proef ? "Bezig…" : "Proef draaien (schrijft niets weg)"}
        </button>
      </div>

      {fout && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-4">{fout}</div>}

      {proef && !proef.ok && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-4">
          <p className="font-semibold mb-1">Het bestand wordt niet geaccepteerd:</p>
          <ul className="list-disc pl-5 space-y-0.5">{proef.fouten?.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}

      {proef?.ok && s && (
        <div className="rounded-2xl border-[1.5px] border-line bg-white p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-inkSoft">Uitkomst van de proef</p>
          <table className="text-sm w-full">
            <tbody>
              <tr><td className="py-1 text-inkSoft">Boxen op voorraad</td><td className="py-1 text-right font-medium">{s.boxen} ({nl(s.voorraadKg)} kg)</td></tr>
              <tr><td className="py-1 text-inkSoft">Inslagregels</td><td className="py-1 text-right font-medium">{s.inslagLogs} <span className="text-inkSoft font-normal">(waarvan {s.inslagAfgeleid} afgeleid)</span></td></tr>
              <tr><td className="py-1 text-inkSoft">Uitslagregels</td><td className="py-1 text-right font-medium">{s.uitslagLogs} <span className="text-inkSoft font-normal">({s.uitslagStandaard} standaard, {s.uitslagGeetiketteerd} geëtiketteerd)</span></td></tr>
              <tr><td className="py-1 text-inkSoft">Dagsnapshots (ter controle)</td><td className="py-1 text-right font-medium">{s.snapshots}</td></tr>
              <tr><td className="py-1 text-inkSoft">Volgend BoxID</td><td className="py-1 text-right font-medium">{s.volgendeBoxId}</td></tr>
            </tbody>
          </table>

          {proef.controle && (
            <div className={`rounded-xl p-3 text-sm ${proef.controle.aantalAfwijkingen === 0 ? "bg-greenSoft text-green" : "bg-red-50 text-red-800"}`}>
              {proef.controle.aantalAfwijkingen === 0
                ? `Voorraadcontrole in orde: voor alle ${proef.controle.dagenGecontroleerd} dagen komt de nagerekende voorraad exact overeen met de dagsnapshots van het oude systeem.`
                : `Voorraadcontrole mislukt: ${proef.controle.aantalAfwijkingen} afwijking(en) t.o.v. de dagsnapshots.`}
            </div>
          )}

          {proef.waarschuwingen && proef.waarschuwingen.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3">
              <p className="font-semibold mb-1">Om te beoordelen (blokkeert de import niet):</p>
              <ul className="list-disc pl-5 space-y-0.5">{proef.waarschuwingen.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          {proef.database && (
            <div className={`rounded-xl p-3 text-sm ${proef.database.leeg ? "bg-greenSoft text-green" : "bg-red-50 text-red-800"}`}>
              {proef.database.leeg
                ? "De database is leeg: importeren kan."
                : `De database bevat al gegevens (${proef.database.boxen} boxen, ${proef.database.inslag} inslag, ${proef.database.uitslag} uitslag, ${proef.database.afroepen} afroepen, ${proef.database.snapshots} snapshots). Maak eerst leeg (onderaan deze pagina); importeren is nu geblokkeerd.`}
            </div>
          )}

          {proef.kanImporteren && !uitvoer && (
            <div className="space-y-3 border-t border-line pt-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={bevestigd} onChange={(e) => setBevestigd(e.target.checked)} className="mt-0.5" />
                <span>Ik heb de uitkomst van de proef bekeken en wil dit importeren.</span>
              </label>
              <button onClick={() => verstuur("uitvoeren")} disabled={!bevestigd || busy} className={`${knop} bg-gold text-white`}>
                {busy ? "Importeren…" : "Nu importeren"}
              </button>
            </div>
          )}
        </div>
      )}

      {uitvoer && !uitvoer.ok && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-4">
          <ul className="list-disc pl-5 space-y-0.5">{uitvoer.fouten?.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}

      {uitvoer?.ok && uitvoer.ingevoerd && (
        <div className="rounded-2xl border-[1.5px] border-line bg-white p-5 space-y-3 text-sm">
          <p className="font-semibold text-green">Import voltooid.</p>
          <p>
            In de database staan nu {uitvoer.ingevoerd.boxen} boxen, {uitvoer.ingevoerd.inslag} inslagregels, {uitvoer.ingevoerd.uitslag} uitslagregels en{" "}
            {uitvoer.ingevoerd.snapshots} dagsnapshots.
          </p>
          {uitvoer.controleNaImport && (
            <p className={uitvoer.controleNaImport.aantalAfwijkingen === 0 ? "text-green" : "text-red-800"}>
              Controle op de database zelf: {uitvoer.controleNaImport.dagenGecontroleerd} dagen nagerekend, {uitvoer.controleNaImport.aantalAfwijkingen} afwijkingen.
            </p>
          )}
          <p className="text-inkSoft">Je kunt nu naar Facturatie om de weekoverzichten te controleren.</p>
        </div>
      )}
      <div className="rounded-2xl border-[1.5px] border-red-200 bg-white p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Alles leegmaken</p>
        <p className="text-sm text-ink">
          Wist alle <strong>voorraad, inslag, uitslag, afroepen en dagsnapshots</strong> en zet de BoxID-teller terug op 1. Gebruikers, rollen,
          validatielijsten en het activiteitenlog blijven staan. Dit kan <strong>niet ongedaan</strong> worden gemaakt.
        </p>
        {stand && (
          <p className="text-sm text-inkSoft">
            Nu in de database: {stand.boxen} boxen, {stand.inslag} inslagregels, {stand.uitslag} uitslagregels, {stand.afroepen} afroepen, {stand.snapshots} dagsnapshots.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={wisTekst}
            onChange={(e) => setWisTekst(e.target.value)}
            placeholder="Typ LEEGMAKEN om te bevestigen"
            className="input sm:max-w-xs"
            autoComplete="off"
          />
          <button
            onClick={leegmaken}
            disabled={wisTekst !== "LEEGMAKEN" || wisBezig || (stand?.leeg ?? false)}
            className={`${knop} bg-red-600 text-white`}
          >
            {wisBezig ? "Bezig…" : "Alles leegmaken"}
          </button>
        </div>
        {stand?.leeg && <p className="text-xs text-inkSoft">Er valt niets te wissen: de database is al leeg.</p>}
        {wisKlaar && <p className="text-sm text-green">{wisKlaar}</p>}
      </div>
    </div>
  );
}
