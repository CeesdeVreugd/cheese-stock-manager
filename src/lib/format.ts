// Centrale datum/tijd-opmaak, altijd expliciet in de Nederlandse tijdzone.
// Zonder dit formatteert de server (die op UTC draait, bv. op Vercel) alles
// 1-2 uur te vroeg, afhankelijk van winter-/zomertijd.

const TIJDZONE = "Europe/Amsterdam";

export function fmtDatum(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIJDZONE });
}

export function fmtDatumTijd(d: Date): string {
  const datum = fmtDatum(d);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TIJDZONE });
  return `${datum} ${tijd}`;
}

export function fmtDatumKort(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", timeZone: TIJDZONE });
}
