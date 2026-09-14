"use client";

import { useMemo, useState } from "react";
import QrScanner from "./qr-scanner";

type Box = {
  id: string;
  boxId: number;
  productafkomst: string;
  model: string;
  partijcode: string;
  aantalKazen: number;
  nettoGram: number;
};

export default function BoxKiezer({
  boxen,
  onSelect,
  afgeroepenBoxIds = [],
  beschikbaarPerBox,
}: {
  boxen: Box[];
  onSelect: (box: Box) => void;
  afgeroepenBoxIds?: number[];
  /** Als meegegeven: toont per box het exacte beschikbare aantal i.p.v. alleen een "Afgeroepen"-label, en blokkeert volledig afgeroepen boxen. */
  beschikbaarPerBox?: Record<number, number>;
}) {
  const gereserveerd = new Set(afgeroepenBoxIds);
  const [zoek, setZoek] = useState("");
  const [scanning, setScanning] = useState(false);

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    if (!q) return boxen;
    return boxen.filter(
      (b) => String(b.boxId).includes(q) || b.partijcode.toLowerCase().includes(q) || b.productafkomst.toLowerCase().includes(q)
    );
  }, [zoek, boxen]);

  function scanResultaat(waarde: string) {
    setScanning(false);
    setZoek(waarde);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          autoFocus
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
          Scan
        </button>
      </div>

      {scanning && <QrScanner onResult={scanResultaat} onClose={() => setScanning(false)} />}

      {gefilterd.length === 0 && <p className="text-sm text-inkSoft text-center mt-4">Geen boxen gevonden.</p>}

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
        {gefilterd.map((box) => {
          const beschikbaar = beschikbaarPerBox ? beschikbaarPerBox[box.boxId] ?? box.aantalKazen : null;
          const volledigOp = beschikbaar !== null && beschikbaar <= 0;
          const deelsOp = beschikbaar !== null && beschikbaar > 0 && beschikbaar < box.aantalKazen;
          return (
            <button
              key={box.id}
              type="button"
              disabled={volledigOp}
              onClick={() => onSelect(box)}
              className={`text-left rounded-xl border-[1.5px] border-line bg-white p-3 transition-colors ${
                volledigOp ? "opacity-50 cursor-not-allowed" : "hover:border-goldDeep"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-semibold text-green">Box #{box.boxId}</span>
                <div className="flex items-center gap-1.5">
                  {beschikbaar === null && gereserveerd.has(box.boxId) && (
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-goldSoft text-goldDeep">
                      Afgeroepen
                    </span>
                  )}
                  {volledigOp && (
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-red-100 text-red-700">
                      Volledig afgeroepen
                    </span>
                  )}
                  {deelsOp && (
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-goldSoft text-goldDeep">
                      {beschikbaar} beschikbaar
                    </span>
                  )}
                  <span className="text-xs font-semibold">{(box.nettoGram / 1000).toFixed(1)} kg</span>
                </div>
              </div>
              <div className="text-xs text-inkSoft">
                {box.productafkomst} · {box.model} · {box.partijcode} · {box.aantalKazen} stuks
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
