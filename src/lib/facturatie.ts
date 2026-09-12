import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Periode: donderdag t/m woensdag, gegenereerd op donderdagochtend (§8/§8.1
 * van het ontwerpdocument). `generatieDatum` is de donderdag waarop het
 * rapport "gedraaid" wordt; de periode is de 7 dagen daarvoor.
 */
export function getPeriode(generatieDatum: Date) {
  const eind = new Date(generatieDatum);
  eind.setHours(0, 0, 0, 0);
  eind.setMilliseconds(-1); // 23:59:59.999 op woensdag (de dag vóór generatieDatum)

  const start = new Date(generatieDatum);
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - 7 * DAY_MS); // donderdag, 7 dagen eerder

  return { start, eind, generatieDatum };
}

/** Meest recente donderdag (00:00) op of vóór `nu` — dat is de "huidige" facturatieweek. */
export function huidigeGeneratieDatum(nu: Date = new Date()) {
  const dag = nu.getDay(); // zo=0 ... do=4
  const daysSindsDonderdag = (dag - 4 + 7) % 7;
  const donderdag = new Date(nu);
  donderdag.setHours(0, 0, 0, 0);
  donderdag.setTime(donderdag.getTime() - daysSindsDonderdag * DAY_MS);
  return donderdag;
}

export function weekLabel(periode: { start: Date; eind: Date }) {
  const iso = getIsoWeekNumber(periode.start);
  const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });
  return {
    week: `Week ${iso.week} · ${iso.year}`,
    range: `${fmt(periode.start)} t/m ${fmt(periode.eind)}`,
  };
}

function getIsoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export async function getInslagRegels(start: Date, eind: Date) {
  return prisma.inslagLog.findMany({
    where: { inslagtijd: { gte: start, lte: eind } },
    orderBy: { inslagtijd: "asc" },
  });
}

export async function getUitslagRegels(start: Date, eind: Date, tarief: "standaard" | "geetiketteerd") {
  return prisma.uitslagLog.findMany({
    where: { uitslagtijd: { gte: start, lte: eind }, tarief },
    orderBy: { uitslagtijd: "asc" },
  });
}

/**
 * Reconstrueert de opslag (kg-dagen) per partijcode/productafkomst/model over
 * de periode, uit InslagLog + UitslagLog — dit prototype heeft nog geen
 * dagelijkse snapshot-taak (§3.3/§8.1) draaien; deze berekening komt op
 * hetzelfde resultaat uit, alleen achteraf berekend i.p.v. dagelijks
 * vastgelegd. Voor productiegebruik blijft een dagelijkse snapshot-taak de
 * aanbevolen aanpak (goedkoper om te berekenen bij groeiende historie).
 */
export async function getOpslagRegels(start: Date, eind: Date) {
  const inslagLogs = await prisma.inslagLog.findMany({ where: { inslagtijd: { lte: eind } } });
  const boxIds = inslagLogs.map((l) => l.boxId);
  const uitslagLogs = boxIds.length
    ? await prisma.uitslagLog.findMany({ where: { boxId: { in: boxIds } } })
    : [];

  const uitslagPerBox = new Map<number, typeof uitslagLogs>();
  for (const u of uitslagLogs) {
    const lijst = uitslagPerBox.get(u.boxId) || [];
    lijst.push(u);
    uitslagPerBox.set(u.boxId, lijst);
  }

  type Totaal = { partijcode: string; productafkomst: string; model: string; kgDagen: number; dagen: Set<string> };
  const totals = new Map<string, Totaal>();

  for (let i = 0; i < 7; i++) {
    const dagStart = new Date(start.getTime() + i * DAY_MS);
    const dagEind = new Date(dagStart.getTime() + DAY_MS - 1);
    if (dagEind > eind) break;

    for (const box of inslagLogs) {
      if (box.inslagtijd > dagEind) continue;
      const uitgeslagenTotOpDag = (uitslagPerBox.get(box.boxId) || [])
        .filter((u) => u.uitslagtijd <= dagEind)
        .reduce((sum, u) => sum + u.nettoGramUit, 0);
      const resterend = box.nettoGram - uitgeslagenTotOpDag;
      if (resterend <= 0) continue;

      const key = `${box.partijcode}|${box.productafkomst}|${box.model}`;
      const entry = totals.get(key) || {
        partijcode: box.partijcode,
        productafkomst: box.productafkomst,
        model: box.model,
        kgDagen: 0,
        dagen: new Set<string>(),
      };
      entry.kgDagen += resterend / 1000;
      entry.dagen.add(dagStart.toDateString());
      totals.set(key, entry);
    }
  }

  return [...totals.values()]
    .map((t) => ({ ...t, aantalDagen: t.dagen.size }))
    .sort((a, b) => a.partijcode.localeCompare(b.partijcode));
}

export async function getFacturatieOverzicht(generatieDatum: Date) {
  const periode = getPeriode(generatieDatum);
  const [inslag, uitslagStandaard, uitslagGeetiketteerd, opslag] = await Promise.all([
    getInslagRegels(periode.start, periode.eind),
    getUitslagRegels(periode.start, periode.eind, "standaard"),
    getUitslagRegels(periode.start, periode.eind, "geetiketteerd"),
    getOpslagRegels(periode.start, periode.eind),
  ]);

  const sumGram = (arr: { nettoGram: number }[]) => arr.reduce((s, x) => s + x.nettoGram, 0);
  const sumGramUit = (arr: { nettoGramUit: number }[]) => arr.reduce((s, x) => s + x.nettoGramUit, 0);

  return {
    periode,
    inslag,
    uitslagStandaard,
    uitslagGeetiketteerd,
    opslag,
    totalen: {
      inslagKg: sumGram(inslag) / 1000,
      opslagKgDagen: opslag.reduce((s, x) => s + x.kgDagen, 0),
      uitslagStandaardKg: sumGramUit(uitslagStandaard) / 1000,
      uitslagGeetiketteerdKg: sumGramUit(uitslagGeetiketteerd) / 1000,
    },
  };
}
