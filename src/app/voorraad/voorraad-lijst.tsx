"use client";

import { useMemo, useState } from "react";
import QrScanner from "@/components/qr-scanner";

type Box = {
  id: string;
  boxId: number;
  productafkomst: string;
  model: string;
  partijcode: string;
  productiedatum: string; // ISO-string, meegegeven vanuit de server component
  aantalKazen: number;
  nettoGram: number;
};

function leeftijdInWeken(productiedatum: string): number {
  const ms = Date.now() - new Date(productiedatum).getTime();
  const dagen = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  return Math.floor(dagen / 7);
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Amsterdam" });
}

export default function VoorraadLijst({ boxen, beschikbaarPerBox = {} }: { boxen: Box[]; beschikbaarPerBox?: Record<number, number> }) {
  const [zoek, setZoek] = useState("");
  const [productafkomstFilter, setProductafkomstFilter] = useState("");
  const [leeftijdVanaf, setLeeftijdVanaf] = useState("");
  const [leeftijdTotEnMet, setLeeftijdTotEnMet] = useState("");
  const [scanning, setScanning] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Alle productafkomst-waarden die op dit moment daadwerkelijk in
  // voorraad zijn — dit is de "leverancier"-achtige indeling die er in de
  // praktijk voor deze vraag toe doet (§ Validatielijsten/Productafkomst).
  const productafkomstOpties = useMemo(() => {
    return Array.from(new Set(boxen.map((b) => b.productafkomst))).sort((a, b) => a.localeCompare(b));
  }, [boxen]);

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const vanaf = leeftijdVanaf ? Number(leeftijdVanaf) : null;
    const totEnMet = leeftijdTotEnMet ? Number(leeftijdTotEnMet) : null;

    return boxen.filter((b) => {
      if (q && !(String(b.boxId).includes(q) || b.partijcode.toLowerCase().includes(q) || b.productafkomst.toLowerCase().includes(q))) {
        return false;
      }
      if (productafkomstFilter && b.productafkomst !== productafkomstFilter) return false;
      const weken = leeftijdInWeken(b.productiedatum);
      if (vanaf !== null && weken < vanaf) return false;
      if (totEnMet !== null && weken > totEnMet) return false;
      return true;
    });
  }, [zoek, boxen, productafkomstFilter, leeftijdVanaf, leeftijdTotEnMet]);

  const totalen = useMemo(() => {
    return gefilterd.reduce(
      (acc, b) => ({ aantalKazen: acc.aantalKazen + b.aantalKazen, nettoGram: acc.nettoGram + b.nettoGram }),
      { aantalKazen: 0, nettoGram: 0 }
    );
  }, [gefilterd]);

  const filtersActief = !!(productafkomstFilter || leeftijdVanaf || leeftijdTotEnMet);

  function scanResultaat(waarde: string) {
    setScanning(false);
    setZoek(waarde);
  }

  function wisFilters() {
    setProductafkomstFilter("");
    setLeeftijdVanaf("");
    setLeeftijdTotEnMet("");
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op BoxID, partijcode of productafkomst"
          className="input flex-1"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="rounded-xl border-[1.5px] border-dashed border-goldDeep bg-goldSoft px-4 text-xs font-semibold text-goldDeep whitespace-nowrap"
        >
          Scan box
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen((v) => !v)}
        className={`text-xs font-semibold mb-3 ${filtersActief ? "text-goldDeep" : "text-inkSoft"}`}
      >
        {filtersOpen ? "Filters verbergen ▲" : `Filters op leverancier/leeftijd ${filtersActief ? "(actief)" : ""} ▼`}
      </button>

      {filtersOpen && (
        <div className="rounded-xl border-[1.5px] border-line bg-white p-3.5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-inkSoft mb-1">Productafkomst / leverancier</label>
            <select value={productafkomstFilter} onChange={(e) => setProductafkomstFilter(e.target.value)} className="input">
              <option value="">Alle</option>
              {productafkomstOpties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-inkSoft mb-1">Leeftijd vanaf (weken)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={leeftijdVanaf}
              onChange={(e) => setLeeftijdVanaf(e.target.value)}
              placeholder="bv. 8"
              className="input"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-inkSoft mb-1">Leeftijd t/m (weken)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={leeftijdTotEnMet}
              onChange={(e) => setLeeftijdTotEnMet(e.target.value)}
              placeholder="bv. 12"
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={wisFilters}
              disabled={!filtersActief}
              className="w-full rounded-xl border-[1.5px] border-line py-2.5 text-xs font-semibold text-inkSoft disabled:opacity-40"
            >
              Filters wissen
            </button>
          </div>
        </div>
      )}

      {scanning && <QrScanner onResult={scanResultaat} onClose={() => setScanning(false)} />}

      {(filtersActief || zoek) && gefilterd.length > 0 && (
        <div className="rounded-xl bg-greenSoft px-3.5 py-2.5 mb-4 text-sm text-green">
          <span className="font-bold">{totalen.aantalKazen} kazen</span> in {gefilterd.length} box{gefilterd.length === 1 ? "" : "en"} ·{" "}
          {(totalen.nettoGram / 1000).toFixed(1)} kg totaal
        </div>
      )}

      {gefilterd.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Geen boxen gevonden.</p>}

      {/* ---------- Mobiel: kaartjes ---------- */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {gefilterd.map((box) => {
          const weken = leeftijdInWeken(box.productiedatum);
          const beschikbaar = beschikbaarPerBox[box.boxId];
          const heeftAfroep = beschikbaar !== undefined && beschikbaar < box.aantalKazen;
          return (
            <div key={box.id} className="rounded-2xl border-[1.5px] border-line bg-white p-3.5 flex gap-3">
              <img
                src={`/api/box/${box.boxId}/qr`}
                alt={`QR box ${box.boxId}`}
                className="h-16 w-16 rounded-lg border border-line flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-semibold text-green">Box #{box.boxId}</span>
                  <div className="flex items-center gap-1.5">
                    {heeftAfroep && (
                      <span
                        className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          beschikbaar <= 0 ? "bg-red-100 text-red-700" : "bg-goldSoft text-goldDeep"
                        }`}
                      >
                        {beschikbaar} beschikbaar
                      </span>
                    )}
                    <span className="text-xs font-semibold">{(box.nettoGram / 1000).toFixed(1)} kg</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <div className="text-inkSoft">PRODUCTAFKOMST</div>
                  <div className="text-inkSoft">MODEL</div>
                  <div className="font-medium">{box.productafkomst}</div>
                  <div className="font-medium">{box.model}</div>
                  <div className="text-inkSoft mt-1">PARTIJCODE</div>
                  <div className="text-inkSoft mt-1">AANTAL</div>
                  <div className="font-medium">{box.partijcode}</div>
                  <div className="font-medium">{box.aantalKazen} stuks</div>
                  <div className="text-inkSoft mt-1">PRODUCTIEDATUM</div>
                  <div className="text-inkSoft mt-1">LEEFTIJD</div>
                  <div className="font-medium">{fmtDatum(box.productiedatum)}</div>
                  <div className={`font-medium ${weken > 8 ? "text-goldDeep" : ""}`}>{weken} weken</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Desktop: tabel ---------- */}
      {gefilterd.length > 0 && (
        <div className="overflow-x-auto">
        <table className="hidden md:table w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden border-[1.5px] border-line min-w-[900px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-inkSoft bg-greenSoft">
              <th className="py-3 px-4 font-semibold">QR</th>
              <th className="py-3 px-4 font-semibold">Box</th>
              <th className="py-3 px-4 font-semibold">Productafkomst</th>
              <th className="py-3 px-4 font-semibold">Model</th>
              <th className="py-3 px-4 font-semibold">Partijcode</th>
              <th className="py-3 px-4 font-semibold">Productiedatum</th>
              <th className="py-3 px-4 font-semibold text-right">Leeftijd</th>
              <th className="py-3 px-4 font-semibold text-right">Aantal</th>
              <th className="py-3 px-4 font-semibold text-right">Netto kg</th>
            </tr>
          </thead>
          <tbody>
            {gefilterd.map((box) => {
              const weken = leeftijdInWeken(box.productiedatum);
              const beschikbaar = beschikbaarPerBox[box.boxId];
              const heeftAfroep = beschikbaar !== undefined && beschikbaar < box.aantalKazen;
              return (
                <tr key={box.id} className="border-t border-line hover:bg-goldSoft/40">
                  <td className="py-2.5 px-4">
                    <img src={`/api/box/${box.boxId}/qr`} alt="" className="h-10 w-10 rounded border border-line" />
                  </td>
                  <td className="py-2.5 px-4 font-serif font-semibold text-green">
                    #{box.boxId}
                    {heeftAfroep && (
                      <span
                        className={`ml-2 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          beschikbaar <= 0 ? "bg-red-100 text-red-700" : "bg-goldSoft text-goldDeep"
                        }`}
                      >
                        {beschikbaar} beschikbaar
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">{box.productafkomst}</td>
                  <td className="py-2.5 px-4">{box.model}</td>
                  <td className="py-2.5 px-4 text-inkSoft">{box.partijcode}</td>
                  <td className="py-2.5 px-4">{fmtDatum(box.productiedatum)}</td>
                  <td className={`py-2.5 px-4 text-right ${weken > 8 ? "font-semibold text-goldDeep" : ""}`}>{weken} weken</td>
                  <td className="py-2.5 px-4 text-right">{box.aantalKazen} stuks</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{(box.nettoGram / 1000).toFixed(1)} kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
