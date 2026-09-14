"use client";

import { useEffect, useState } from "react";
import { pushWordtOndersteund, huidigPushAbonnement, schakelPushIn, schakelPushUit } from "@/lib/push-client";

export default function MeldingenInschakelen() {
  const [status, setStatus] = useState<"onbekend" | "niet-ondersteund" | "uit" | "aan" | "bezig">("onbekend");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function controleer() {
      if (!pushWordtOndersteund()) {
        setStatus("niet-ondersteund");
        return;
      }
      const sub = await huidigPushAbonnement();
      setStatus(sub ? "aan" : "uit");
    }
    controleer();
  }, []);

  async function inschakelen() {
    setStatus("bezig");
    setError(null);
    try {
      await schakelPushIn();
      setStatus("aan");
    } catch (err: any) {
      setError(err.message || "Inschakelen mislukt");
      setStatus("uit");
    }
  }

  async function uitschakelen() {
    setStatus("bezig");
    setError(null);
    try {
      await schakelPushUit();
      setStatus("uit");
    } catch (err: any) {
      setError(err.message || "Uitschakelen mislukt");
      setStatus("aan");
    }
  }

  if (status === "onbekend") return null;

  if (status === "niet-ondersteund") {
    return (
      <div className="rounded-xl bg-cream border-[1.5px] border-line p-3.5">
        <p className="text-xs font-bold text-ink">Meldingen bij nieuwe afroeporders</p>
        <p className="text-[11px] text-inkSoft mt-0.5">
          Wordt niet ondersteund in deze browser/dit toestel.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-greenSoft p-3.5 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-green">Meldingen bij nieuwe afroeporders</p>
        <p className="text-[11px] text-inkSoft mt-0.5">
          {status === "aan"
            ? "Ingeschakeld op dit toestel."
            : "Staat standaard aan; hier kun je 'm uitzetten of opnieuw aanzetten."}
        </p>
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>
      {status === "aan" ? (
        <button
          onClick={uitschakelen}
          className="rounded-lg border-[1.5px] border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink whitespace-nowrap"
        >
          Uitschakelen
        </button>
      ) : (
        <button
          onClick={inschakelen}
          disabled={status === "bezig"}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-60"
        >
          {status === "bezig" ? "Bezig…" : "Inschakelen"}
        </button>
      )}
    </div>
  );
}
