// Opslagberekening (kg-dagen) als zuivere functie — geen database, geen
// tijdzone-afhankelijkheid. Zo is hij los te testen en hergebruikbaar voor de
// controle na een import.
//
// Rekenregel (gelijk aan de dagelijkse "StartDag"-snapshot van het oude
// Excel-systeem): een box telt mee op een dag als hij bij het BEGIN van die dag
// (00:00) al was ingeslagen en nog niet geheel was uitgeslagen. Gevolgen:
//   - de dag van inslag telt nog niet mee, de eerste opslagdag is de dag erna;
//   - de dag van een volledige uitslag telt nog wél mee (de box lag er bij
//     het begin van de dag nog);
//   - bij kleine uitslag telt de rest die bij het begin van de dag over was.

export type OpslagInslag = {
  boxId: number;
  partijcode: string;
  productafkomst: string;
  model: string;
  nettoGram: number;
  inslagtijd: Date;
};

export type OpslagUitslag = {
  boxId: number;
  nettoGramUit: number;
  uitslagtijd: Date;
};

export type OpslagRegel = {
  partijcode: string;
  productafkomst: string;
  model: string;
  kgDagen: number;
  aantalDagen: number;
};

export function opslagSleutel(partijcode: string, productafkomst: string, model: string) {
  return `${partijcode}|${productafkomst}|${model}`;
}

function uitslagPerBox(uitslag: OpslagUitslag[]) {
  const perBox = new Map<number, OpslagUitslag[]>();
  for (const u of uitslag) {
    const lijst = perBox.get(u.boxId);
    if (lijst) lijst.push(u);
    else perBox.set(u.boxId, [u]);
  }
  return perBox;
}

/** Gram per partij/afkomst/model dat bij het begin van `moment` in opslag lag. */
export function voorraadBijBegin(
  inslag: OpslagInslag[],
  perBox: Map<number, OpslagUitslag[]>,
  moment: Date
): Map<string, number> {
  const t = moment.getTime();
  const uit = new Map<string, number>();
  for (const box of inslag) {
    if (box.inslagtijd.getTime() >= t) continue;
    let rest = box.nettoGram;
    for (const u of perBox.get(box.boxId) ?? []) {
      if (u.uitslagtijd.getTime() < t) rest -= u.nettoGramUit;
    }
    if (rest <= 0) continue;
    const sleutel = opslagSleutel(box.partijcode, box.productafkomst, box.model);
    uit.set(sleutel, (uit.get(sleutel) ?? 0) + rest);
  }
  return uit;
}

/**
 * kg-dagen per partijcode/productafkomst/model over een reeks dagen.
 * `dagStarts` zijn de beginmomenten (00:00 Nederlandse tijd) van elke dag in
 * de periode.
 */
export function berekenOpslag(inslag: OpslagInslag[], uitslag: OpslagUitslag[], dagStarts: Date[]): OpslagRegel[] {
  const perBox = uitslagPerBox(uitslag);
  const totalen = new Map<string, { partijcode: string; productafkomst: string; model: string; gramDagen: number; dagen: number }>();

  for (const start of dagStarts) {
    for (const [sleutel, gram] of voorraadBijBegin(inslag, perBox, start)) {
      let t = totalen.get(sleutel);
      if (!t) {
        const [partijcode, productafkomst, model] = sleutel.split("|");
        t = { partijcode, productafkomst, model, gramDagen: 0, dagen: 0 };
        totalen.set(sleutel, t);
      }
      t.gramDagen += gram;
      t.dagen += 1;
    }
  }

  return [...totalen.values()]
    .map((t) => ({
      partijcode: t.partijcode,
      productafkomst: t.productafkomst,
      model: t.model,
      kgDagen: t.gramDagen / 1000,
      aantalDagen: t.dagen,
    }))
    .sort((a, b) => a.partijcode.localeCompare(b.partijcode) || a.model.localeCompare(b.model));
}

export type SnapshotRegel = {
  /** Kalenderdatum van de snapshot (UTC-middernacht van die datum). */
  datum: Date;
  partijcode: string;
  productafkomst: string;
  model: string;
  nettoGram: number;
};

export type SnapshotAfwijking = {
  datum: string;
  partijcode: string;
  productafkomst: string;
  model: string;
  berekendGram: number;
  snapshotGram: number;
};

/**
 * Vergelijkt de berekende voorraad bij het begin van elke snapshotdag met de
 * snapshots uit het oude systeem. `dagStartVan` zet de kalenderdatum van een
 * snapshot om naar het beginmoment van die dag in Nederland.
 * `toleranceGram`: snapshots staan in kg met max. 3 decimalen.
 */
export function vergelijkMetSnapshots(
  inslag: OpslagInslag[],
  uitslag: OpslagUitslag[],
  snapshots: SnapshotRegel[],
  dagStartVan: (datum: Date) => Date,
  toleranceGram = 1
) {
  const perBox = uitslagPerBox(uitslag);
  const perDatum = new Map<string, SnapshotRegel[]>();
  for (const s of snapshots) {
    const k = s.datum.toISOString().slice(0, 10);
    const lijst = perDatum.get(k);
    if (lijst) lijst.push(s);
    else perDatum.set(k, [s]);
  }

  const afwijkingen: SnapshotAfwijking[] = [];
  let dagenGecontroleerd = 0;
  for (const [datumTekst, regels] of [...perDatum.entries()].sort()) {
    dagenGecontroleerd++;
    const berekend = voorraadBijBegin(inslag, perBox, dagStartVan(regels[0].datum));
    const gezien = new Set<string>();
    for (const r of regels) {
      const sleutel = opslagSleutel(r.partijcode, r.productafkomst, r.model);
      gezien.add(sleutel);
      const b = berekend.get(sleutel) ?? 0;
      if (Math.abs(b - r.nettoGram) > toleranceGram) {
        afwijkingen.push({ datum: datumTekst, partijcode: r.partijcode, productafkomst: r.productafkomst, model: r.model, berekendGram: b, snapshotGram: r.nettoGram });
      }
    }
    for (const [sleutel, gram] of berekend) {
      if (gezien.has(sleutel) || gram <= toleranceGram) continue;
      const [partijcode, productafkomst, model] = sleutel.split("|");
      afwijkingen.push({ datum: datumTekst, partijcode, productafkomst, model, berekendGram: gram, snapshotGram: 0 });
    }
  }
  return { dagenGecontroleerd, afwijkingen };
}
