// Tijdzone-hulpjes voor de facturatie. Bewust zonder afhankelijkheden, en
// altijd expliciet in Europe/Amsterdam: de server (Docker) draait op UTC, maar
// een "dag" in de facturatie loopt van 00:00 tot 24:00 Nederlandse tijd.

const TIJDZONE = "Europe/Amsterdam";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIJDZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
});

const WEEKDAGEN: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type AmsterdamDelen = {
  jaar: number;
  maand: number; // 1-12
  dag: number; // 1-31
  uur: number;
  minuut: number;
  weekdag: number; // zo=0 ... do=4 ... za=6
};

/** Kalenderdelen van een moment, zoals je ze op een Nederlandse klok zou aflezen. */
export function amsterdamDelen(d: Date): AmsterdamDelen {
  const delen: Record<string, string> = {};
  for (const p of formatter.formatToParts(d)) delen[p.type] = p.value;
  return {
    jaar: Number(delen.year),
    maand: Number(delen.month),
    dag: Number(delen.day),
    uur: Number(delen.hour),
    minuut: Number(delen.minute),
    weekdag: WEEKDAGEN[delen.weekday],
  };
}

/**
 * Het moment waarop de gegeven kalenderdag in Nederland begint (00:00 lokale
 * tijd). Dag-overloop wordt netjes doorgerekend (dag 0 = laatste dag van de
 * vorige maand, dag -6 = 6 dagen eerder, enz.). Houdt rekening met zomer- en
 * wintertijd: een dag kan 23, 24 of 25 uur lang zijn.
 */
export function amsterdamMiddernacht(jaar: number, maand: number, dag: number): Date {
  const norm = new Date(Date.UTC(jaar, maand - 1, dag));
  const j = norm.getUTCFullYear();
  const m = norm.getUTCMonth() + 1;
  const dd = norm.getUTCDate();
  // Zomertijd (UTC+2) eerst, dan wintertijd (UTC+1). Middernacht wordt in
  // Nederland nooit overgeslagen (de klok springt om 02:00/03:00).
  for (const uren of [2, 1]) {
    const kandidaat = new Date(Date.UTC(j, m - 1, dd) - uren * 3600 * 1000);
    const p = amsterdamDelen(kandidaat);
    if (p.jaar === j && p.maand === m && p.dag === dd && p.uur === 0 && p.minuut === 0) return kandidaat;
  }
  throw new Error(`Kon middernacht niet bepalen voor ${j}-${m}-${dd}`);
}
