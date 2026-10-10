// Eenmalige import van het omgezette Excel-bestand (import-data.json).
// Dit bestand bevat alleen zuivere functies (geen database) zodat de controle
// los te testen is; het wegschrijven gebeurt in app/api/import/route.ts.

import { amsterdamMiddernacht } from "@/lib/tijd";
import { vergelijkMetSnapshots } from "@/lib/opslag";

export type ImportBox = {
  boxId: number;
  productafkomst: string;
  proces: string;
  model: string;
  partijcode: string;
  productiedatum: string;
  aantalKazen: number;
  nettoGram: number;
  opmerking: string | null;
  createdAt: string;
  laatsteMutatie: string;
};

export type ImportInslag = {
  transactionId: string;
  boxId: number;
  productafkomst: string;
  proces: string;
  model: string;
  partijcode: string;
  productiedatum: string;
  aantalKazen: number;
  nettoGram: number;
  opmerking: string | null;
  inslagtijd: string;
  afgeleid: boolean;
};

export type ImportUitslag = {
  transactionId: string;
  boxId: number;
  productafkomst: string;
  proces: string;
  model: string;
  partijcode: string;
  productiedatum: string;
  uitslagType: "volledig" | "klein";
  tarief: "standaard" | "geetiketteerd";
  aantalKazenUit: number;
  nettoGramUit: number;
  opmerking: string | null;
  uitslagtijd: string;
};

export type ImportSnapshot = {
  datum: string;
  partijcode: string;
  productafkomst: string;
  model: string;
  nettoGram: number;
};

export type ImportData = {
  versie: number;
  bron: string;
  gemaaktOp: string;
  volgendeBoxId: number;
  validaties: { productafkomst: string[]; proces: string[]; model: string[]; klant: string[] };
  boxen: ImportBox[];
  inslagLogs: ImportInslag[];
  uitslagLogs: ImportUitslag[];
  snapshots: ImportSnapshot[];
};

const isTekst = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isHeelGetal = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isDatum = (v: unknown): boolean => typeof v === "string" && !Number.isNaN(new Date(v).getTime());

/** Controleert de structuur en inhoud van het bestand. Geeft een lijst fouten (leeg = in orde). */
export function valideerImport(invoer: unknown): { data: ImportData | null; fouten: string[]; waarschuwingen: string[] } {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const meld = (m: string) => {
    if (fouten.length < 25) fouten.push(m);
  };

  const d = invoer as Partial<ImportData> | null;
  if (!d || typeof d !== "object") return { data: null, fouten: ["Dit is geen geldig importbestand."], waarschuwingen };
  if (d.versie !== 1) meld("Onbekende versie van het importbestand.");
  for (const veld of ["boxen", "inslagLogs", "uitslagLogs", "snapshots"] as const) {
    if (!Array.isArray(d[veld])) meld(`Onderdeel '${veld}' ontbreekt.`);
  }
  if (!isHeelGetal(d.volgendeBoxId)) meld("'volgendeBoxId' ontbreekt.");
  if (!d.validaties || typeof d.validaties !== "object") meld("'validaties' ontbreekt.");
  if (fouten.length) return { data: null, fouten, waarschuwingen };

  const data = d as ImportData;

  const boxIds = new Set<number>();
  for (const b of data.boxen) {
    if (!isHeelGetal(b.boxId) || b.boxId <= 0) meld(`Box met ongeldig BoxID: ${JSON.stringify(b.boxId)}`);
    if (boxIds.has(b.boxId)) meld(`BoxID ${b.boxId} komt dubbel voor in de boxlijst.`);
    boxIds.add(b.boxId);
    if (![b.productafkomst, b.proces, b.model, b.partijcode].every(isTekst)) meld(`Box ${b.boxId}: afkomst/proces/model/partijcode ontbreekt.`);
    if (!/^[0-9]{10}$/.test(b.partijcode ?? "")) meld(`Box ${b.boxId}: partijcode '${b.partijcode}' is geen 10 cijfers.`);
    if (!isHeelGetal(b.aantalKazen) || b.aantalKazen <= 0) meld(`Box ${b.boxId}: ongeldig aantal kazen.`);
    if (!isHeelGetal(b.nettoGram) || b.nettoGram <= 0) meld(`Box ${b.boxId}: ongeldig gewicht.`);
    if (![b.productiedatum, b.createdAt, b.laatsteMutatie].every(isDatum)) meld(`Box ${b.boxId}: ongeldige datum.`);
    if (b.boxId >= data.volgendeBoxId) meld(`Box ${b.boxId} is hoger dan het volgende BoxID (${data.volgendeBoxId}).`);
  }

  const inslagIds = new Set<string>();
  const inslagBoxen = new Set<number>();
  for (const l of data.inslagLogs) {
    if (!isTekst(l.transactionId) || inslagIds.has(l.transactionId)) meld(`Inslag met ontbrekende of dubbele transactie-id: ${l.transactionId}`);
    inslagIds.add(l.transactionId);
    if (inslagBoxen.has(l.boxId)) meld(`Box ${l.boxId} heeft meer dan één inslagregel.`);
    inslagBoxen.add(l.boxId);
    if (!/^[0-9]{10}$/.test(l.partijcode ?? "")) meld(`Inslag box ${l.boxId}: ongeldige partijcode.`);
    if (!isHeelGetal(l.aantalKazen) || l.aantalKazen <= 0 || !isHeelGetal(l.nettoGram) || l.nettoGram <= 0) meld(`Inslag box ${l.boxId}: ongeldig aantal of gewicht.`);
    if (!isDatum(l.inslagtijd) || !isDatum(l.productiedatum)) meld(`Inslag box ${l.boxId}: ongeldige datum.`);
  }
  for (const id of boxIds) if (!inslagBoxen.has(id)) meld(`Box ${id} heeft geen inslagregel.`);

  const uitslagIds = new Set<string>();
  for (const l of data.uitslagLogs) {
    if (!isTekst(l.transactionId) || uitslagIds.has(l.transactionId)) meld(`Uitslag met ontbrekende of dubbele transactie-id: ${l.transactionId}`);
    uitslagIds.add(l.transactionId);
    if (!inslagBoxen.has(l.boxId)) meld(`Uitslag ${l.transactionId}: box ${l.boxId} heeft geen inslagregel.`);
    if (!["volledig", "klein"].includes(l.uitslagType)) meld(`Uitslag ${l.transactionId}: ongeldig type '${l.uitslagType}'.`);
    if (!["standaard", "geetiketteerd"].includes(l.tarief)) meld(`Uitslag ${l.transactionId}: ongeldig tarief '${l.tarief}'.`);
    if (!isHeelGetal(l.aantalKazenUit) || l.aantalKazenUit <= 0 || !isHeelGetal(l.nettoGramUit) || l.nettoGramUit <= 0) meld(`Uitslag ${l.transactionId}: ongeldig aantal of gewicht.`);
    if (!isDatum(l.uitslagtijd) || !isDatum(l.productiedatum)) meld(`Uitslag ${l.transactionId}: ongeldige datum.`);
  }

  // Boekhoudcontrole per box: wat is ingeslagen min wat is uitgeslagen moet
  // precies overeenkomen met wat er nog (als box) ligt. Meer uitgeslagen dan
  // ingeslagen komt in de bron voor (bijv. een dubbel geregistreerde uitslag);
  // dat wordt als waarschuwing gemeld en niet stilzwijgend gecorrigeerd.
  const uitPerBox = new Map<number, number>();
  for (const l of data.uitslagLogs) uitPerBox.set(l.boxId, (uitPerBox.get(l.boxId) ?? 0) + l.nettoGramUit);
  const boxPerId = new Map(data.boxen.map((b) => [b.boxId, b]));
  for (const l of data.inslagLogs) {
    const rest = l.nettoGram - (uitPerBox.get(l.boxId) ?? 0);
    const box = boxPerId.get(l.boxId);
    if (rest < 0) {
      waarschuwingen.push(
        `Box ${l.boxId} (partij ${l.partijcode}): ${(-rest / 1000).toLocaleString("nl-NL")} kg méér uitgeslagen dan ingeslagen — mogelijk een dubbel geregistreerde uitslag. Wordt ongewijzigd overgenomen.`
      );
    } else if (box ? rest !== box.nettoGram : rest !== 0) {
      meld(`Box ${l.boxId}: ingeslagen min uitgeslagen (${rest} g) klopt niet met de boxlijst.`);
    }
  }

  for (const s of data.snapshots) {
    if (!isDatum(s.datum) || !isTekst(s.partijcode) || !isHeelGetal(s.nettoGram)) {
      meld("Een dagsnapshot heeft een ongeldige waarde.");
      break;
    }
  }

  return { data: fouten.length ? null : data, fouten, waarschuwingen };
}

/** Rekent de voorraad opnieuw uit de in-/uitslagregels en vergelijkt met de dagsnapshots. */
export function controleerTegenSnapshots(
  inslag: { boxId: number; partijcode: string; productafkomst: string; model: string; nettoGram: number; inslagtijd: Date }[],
  uitslag: { boxId: number; nettoGramUit: number; uitslagtijd: Date }[],
  snapshots: { datum: Date; partijcode: string; productafkomst: string; model: string; nettoGram: number }[]
) {
  return vergelijkMetSnapshots(inslag, uitslag, snapshots, (datum) =>
    amsterdamMiddernacht(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate())
  );
}

export function samenvatting(data: ImportData) {
  const afgeleid = data.inslagLogs.filter((l) => l.afgeleid);
  const tijden = (arr: string[]) => {
    const t = arr.map((x) => new Date(x).getTime()).sort((a, b) => a - b);
    return t.length ? { eerste: new Date(t[0]).toISOString(), laatste: new Date(t[t.length - 1]).toISOString() } : null;
  };
  return {
    boxen: data.boxen.length,
    inslagLogs: data.inslagLogs.length,
    inslagAfgeleid: afgeleid.length,
    uitslagLogs: data.uitslagLogs.length,
    uitslagStandaard: data.uitslagLogs.filter((l) => l.tarief === "standaard").length,
    uitslagGeetiketteerd: data.uitslagLogs.filter((l) => l.tarief === "geetiketteerd").length,
    snapshots: data.snapshots.length,
    voorraadKg: data.boxen.reduce((s, b) => s + b.nettoGram, 0) / 1000,
    volgendeBoxId: data.volgendeBoxId,
    periodeInslag: tijden(data.inslagLogs.filter((l) => !l.afgeleid).map((l) => l.inslagtijd)),
    periodeUitslag: tijden(data.uitslagLogs.map((l) => l.uitslagtijd)),
    validaties: {
      productafkomst: data.validaties.productafkomst.length,
      proces: data.validaties.proces.length,
      model: data.validaties.model.length,
    },
  };
}
