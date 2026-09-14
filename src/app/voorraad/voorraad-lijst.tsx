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

function leeftijdInDagen(productiedatum: string): number {
  const ms = Date.now() - new Date(productiedatum).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function fmtDatum(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Amsterdam" });
}

export default function VoorraadLijst({ boxen, afgeroepenBoxIds = [] }: { boxen: Box[]; afgeroepenBoxIds?: number[] }) {
  const gereserveerd = new Set(afgeroepenBoxIds);
  const [zoek, setZoek] = useState("");
  const [scanning, setScanning] = useState(false);

  const gefilterd = useMemo(() => {
    if (!zoek.trim()) return boxen;
    const q = zoek.trim().toLowerCase();
    return boxen.filter(
      (b) => String(b.boxId).includes(q) || b.partijcode.toLowerCase().includes(q) || b.productafkomst.toLowerCase().includes(q)
    );
  }, [zoek, boxen]);

  function scanResultaat(waarde: string) {
    setScanning(false);
    setZoek(waarde);
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
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

      {scanning && <QrScanner onResult={scanResultaat} onClose={() => setScanning(false)} />}

      {gefilterd.length === 0 && <p className="text-sm text-inkSoft text-center mt-8">Geen boxen gevonden.</p>}

      {/* ---------- Mobiel: kaartjes ---------- */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {gefilterd.map((box) => {
          const dagen = leeftijdInDagen(box.productiedatum);
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
                    {gereserveerd.has(box.boxId) && (
                      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-goldSoft text-goldDeep">
                        Afgeroepen
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
                  <div className={`font-medium ${dagen > 60 ? "text-goldDeep" : ""}`}>{dagen} dagen</div>
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
              const dagen = leeftijdInDagen(box.productiedatum);
              return (
                <tr key={box.id} className="border-t border-line hover:bg-goldSoft/40">
                  <td className="py-2.5 px-4">
                    <img src={`/api/box/${box.boxId}/qr`} alt="" className="h-10 w-10 rounded border border-line" />
                  </td>
                  <td className="py-2.5 px-4 font-serif font-semibold text-green">
                    #{box.boxId}
                    {gereserveerd.has(box.boxId) && (
                      <span className="ml-2 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-goldSoft text-goldDeep">
                        Afgeroepen
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">{box.productafkomst}</td>
                  <td className="py-2.5 px-4">{box.model}</td>
                  <td className="py-2.5 px-4 text-inkSoft">{box.partijcode}</td>
                  <td className="py-2.5 px-4">{fmtDatum(box.productiedatum)}</td>
                  <td className={`py-2.5 px-4 text-right ${dagen > 60 ? "font-semibold text-goldDeep" : ""}`}>{dagen} dagen</td>
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
