import { prisma } from "@/lib/prisma";
import { amsterdamDelen, amsterdamMiddernacht } from "@/lib/tijd";
import { berekenOpslag } from "@/lib/opslag";

/**
 * Periode: donderdag t/m woensdag, gegenereerd op donderdagochtend (§8/§8.1
 * van het ontwerpdocument). `generatieDatum` is de donderdag waarop het
 * rapport "gedraaid" wordt; de periode is de 7 dagen daarvoor.
 *
 * Alle dagen lopen van 00:00 tot 24:00 NEDERLANDSE tijd, ongeacht de
 * tijdzone van de server (Docker draait op UTC). `dagStarts` zijn de
 * beginmomenten van de 7 dagen in de periode.
 */
export function getPeriode(generatieDatum: Date) {
  const k = amsterdamDelen(generatieDatum);
  const dagStarts = Array.from({ length: 7 }, (_, i) => amsterdamMiddernacht(k.jaar, k.maand, k.dag - 7 + i));
  const start = dagStarts[0];
  // 23:59:59.999 op woensdag (de dag vóór generatieDatum)
  const eind = new Date(amsterdamMiddernacht(k.jaar, k.maand, k.dag).getTime() - 1);

  return { start, eind, generatieDatum, dagStarts };
}

/**
 * Meest recente donderdag op of vóór `nu` — dat is de "huidige" facturatieweek.
 * Geeft de donderdag terug als UTC-middernacht van die kalenderdatum (zoals
 * `?week=YYYY-MM-DD` in de adresbalk ook wordt ingelezen).
 */
export function huidigeGeneratieDatum(nu: Date = new Date()) {
  const k = amsterdamDelen(nu); // de kalenderdatum zoals die nu in Nederland is
  const dagenSindsDonderdag = (k.weekdag - 4 + 7) % 7;
  return new Date(Date.UTC(k.jaar, k.maand - 1, k.dag - dagenSindsDonderdag));
}

export function weekLabel(periode: { start: Date; eind: Date }) {
  // Het weeknummer volgt de ISO-week van de EINDDATUM (woensdag), net als in
  // het oude rapport: periode 01-10 t/m 07-10-2026 heet "W41" (de donderdag
  // erbij zou nog in week 40 vallen).
  const iso = getIsoWeekNumber(periode.eind);
  const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", timeZone: "Europe/Amsterdam" });
  return {
    week: `Week ${iso.week} · ${iso.year}`,
    range: `${fmt(periode.start)} t/m ${fmt(periode.eind)}`,
  };
}

function getIsoWeekNumber(date: Date) {
  const k = amsterdamDelen(date);
  const d = new Date(Date.UTC(k.jaar, k.maand - 1, k.dag));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7);
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
 * de periode, uit InslagLog + UitslagLog. De rekenregel zelf staat in
 * `lib/opslag.ts`: een box telt mee op een dag als hij bij het BEGIN van die
 * dag (00:00) in opslag lag — gelijk aan de dagelijkse StartDag-snapshot van
 * het oude Excel-systeem.
 */
export async function getOpslagRegels(dagStarts: Date[], eind: Date) {
  const inslagLogs = await prisma.inslagLog.findMany({
    where: { inslagtijd: { lte: eind } },
    select: { boxId: true, partijcode: true, productafkomst: true, model: true, nettoGram: true, inslagtijd: true },
  });
  const boxIds = inslagLogs.map((l) => l.boxId);
  const uitslagLogs = boxIds.length
    ? await prisma.uitslagLog.findMany({
        where: { boxId: { in: boxIds }, uitslagtijd: { lte: eind } },
        select: { boxId: true, nettoGramUit: true, uitslagtijd: true },
      })
    : [];

  return berekenOpslag(inslagLogs, uitslagLogs, dagStarts).map((r) => ({
    partijcode: r.partijcode,
    productafkomst: r.productafkomst,
    model: r.model,
    kgDagen: r.kgDagen,
    aantalDagen: r.aantalDagen,
  }));
}

export async function getFacturatieOverzicht(generatieDatum: Date) {
  const periode = getPeriode(generatieDatum);
  const [inslag, uitslagStandaard, uitslagGeetiketteerd, opslag] = await Promise.all([
    getInslagRegels(periode.start, periode.eind),
    getUitslagRegels(periode.start, periode.eind, "standaard"),
    getUitslagRegels(periode.start, periode.eind, "geetiketteerd"),
    getOpslagRegels(periode.dagStarts, periode.eind),
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
