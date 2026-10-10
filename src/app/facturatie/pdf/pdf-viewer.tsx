"use client";

import { useEffect, useRef, useState } from "react";
import TerugKnop from "@/components/terug-knop";

type Props = {
  week: string; // ISO-datum van de weekgrens
  terugHref: string;
  titel: string;
  periode: string;
  bestandsnaam: string;
  eigenEmail: string;
};

const PDFJS_URL = "/pdfjs/pdf.min.js";
const PDFJS_WORKER_URL = "/pdfjs/pdf.worker.min.js";

export default function PdfViewer({ week, terugHref, titel, periode, bestandsnaam, eigenEmail }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const [status, setStatus] = useState<"laden" | "klaar" | "fout">("laden");
  const [paginas, setPaginas] = useState(0);
  const [verzendenOpen, setVerzendenOpen] = useState(false);
  const [email, setEmail] = useState(eigenEmail);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);
  const [kanDelen, setKanDelen] = useState(false);

  const apiUrl = `/api/facturatie/pdf?week=${encodeURIComponent(week)}`;

  useEffect(() => {
    let weg = false;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}&weergave=1`, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        blobRef.current = new Blob([buf], { type: "application/pdf" });

        const pdfjs = await import(/* webpackIgnore: true */ PDFJS_URL);
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
        if (weg) return;

        const el = container.current;
        if (!el) return;
        el.innerHTML = "";
        // Scherp op telefoons (hoge pixeldichtheid) maar niet onnodig zwaar.
        const schaal = Math.min(2.5, Math.max(1.5, (window.devicePixelRatio || 1) * 1.4));
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: schaal });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "block w-full h-auto bg-white rounded-lg shadow-sm border border-line";
          canvas.style.marginBottom = "12px";
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          if (weg) return;
          el.appendChild(canvas);
        }
        setPaginas(doc.numPages);
        setStatus("klaar");
      } catch (err) {
        console.error("PDF tonen mislukt:", err);
        if (!weg) setStatus("fout");
      }
    })();
    return () => {
      weg = true;
    };
  }, [apiUrl]);

  useEffect(() => {
    try {
      const proef = new File([new Blob(["x"])], "x.pdf", { type: "application/pdf" });
      setKanDelen(typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [proef] }));
    } catch {
      setKanDelen(false);
    }
  }, []);

  function afdrukken() {
    document.body.classList.add("print-pdf");
    const opruimen = () => {
      document.body.classList.remove("print-pdf");
      window.removeEventListener("afterprint", opruimen);
    };
    window.addEventListener("afterprint", opruimen);
    window.print();
  }

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch("/api/facturatie/verzenden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Versturen is niet gelukt.");
      setMelding({ soort: "ok", tekst: `Verstuurd naar ${email}.` });
    } catch (err) {
      setMelding({ soort: "fout", tekst: err instanceof Error ? err.message : "Versturen is niet gelukt." });
    } finally {
      setBezig(false);
    }
  }

  async function delen() {
    if (!blobRef.current) return;
    try {
      const bestand = new File([blobRef.current], bestandsnaam, { type: "application/pdf" });
      await navigator.share({ files: [bestand], title: titel });
    } catch {
      /* geannuleerd door de gebruiker */
    }
  }

  const knop =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold disabled:opacity-40";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-green text-white px-4 pt-6 pb-4 md:px-10 md:pt-8 rounded-b-3xl md:rounded-none">
        <div className="flex items-center justify-between gap-3">
          <TerugKnop href={terugHref} className="text-sm font-semibold text-white/85">
            ‹ Terug
          </TerugKnop>
          <div className="text-center min-w-0">
            <h1 className="font-serif text-lg font-semibold leading-tight truncate">{titel}</h1>
            <p className="text-xs text-white/65">{periode}</p>
          </div>
          <div className="w-12" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 md:flex md:justify-center">
          <a href={apiUrl} download={bestandsnaam} className={`${knop} bg-gold text-white`}>
            Downloaden
          </a>
          <button type="button" onClick={() => { setMelding(null); setVerzendenOpen(true); }} disabled={status !== "klaar"} className={`${knop} bg-white/15 text-white`}>
            Verzenden
          </button>
          <button type="button" onClick={afdrukken} disabled={status !== "klaar"} className={`${knop} bg-white/15 text-white`}>
            Afdrukken
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 md:px-10">
        {status === "laden" && <p className="text-sm text-inkSoft text-center mt-10">PDF wordt opgebouwd…</p>}
        {status === "fout" && (
          <div className="max-w-md mx-auto mt-10 text-center">
            <p className="text-sm text-red-700 mb-3">De PDF kon niet getoond worden.</p>
            <a href={apiUrl} download={bestandsnaam} className={`${knop} bg-gold text-white`}>
              Download de PDF
            </a>
          </div>
        )}
        {status === "klaar" && paginas > 0 && (
          <p className="text-[11px] text-inkSoft text-center mb-3">
            {paginas} pagina{paginas === 1 ? "" : "’s"} · {bestandsnaam}
          </p>
        )}
        <div id="pdf-print" ref={container} className="max-w-5xl mx-auto" />
      </div>

      {verzendenOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4" onClick={() => setVerzendenOpen(false)}>
          <form onSubmit={verstuur} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h2 className="font-serif text-lg font-semibold text-green mb-1">PDF verzenden</h2>
            <p className="text-xs text-inkSoft mb-4">{titel} wordt als bijlage per e-mail verstuurd.</p>
            <label className="block text-[11px] font-bold text-inkSoft mb-1">E-mailadres</label>
            <input
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mb-3"
            />
            {melding && (
              <p className={`text-sm mb-3 ${melding.soort === "ok" ? "text-green" : "text-red-700"}`}>{melding.tekst}</p>
            )}
            <div className="flex flex-col gap-2">
              <button type="submit" disabled={bezig} className={`${knop} bg-gold text-white py-3`}>
                {bezig ? "Bezig met versturen…" : "Verstuur per e-mail"}
              </button>
              {kanDelen && (
                <button type="button" onClick={delen} className={`${knop} border-[1.5px] border-line text-green py-3`}>
                  Delen via een andere app…
                </button>
              )}
              <button type="button" onClick={() => setVerzendenOpen(false)} className={`${knop} text-inkSoft`}>
                Sluiten
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
