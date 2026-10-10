import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";
import { controleerTegenSnapshots, samenvatting, valideerImport } from "@/lib/import-data";

// Import van het omgezette Excel-bestand en leegmaken van de bedrijfsgegevens.
//   "stand"      — telt wat er in de database staat (wijzigt niets);
//   "proef"      — controleert het importbestand en schrijft NIETS weg;
//   "uitvoeren"  — schrijft alles in één databasetransactie weg (alles of niets),
//                  maar alleen als Voorraad, Inslag, Uitslag, Afroepen en Dagsnapshots leeg zijn;
//   "leegmaken"  — wist voorraad, inslag, uitslag, afroepen en dagsnapshots (alles of niets),
//                  alleen met de getypte bevestiging LEEGMAKEN. Gebruikers, rollen,
//                  validatielijsten en het activiteitenlog blijven staan.

const BATCH = 500; // Postgres staat max. ~32.000 parameters per opdracht toe

async function inBatches<T>(rijen: T[], schrijf: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rijen.length; i += BATCH) await schrijf(rijen.slice(i, i + BATCH));
}

async function databaseStand() {
  const [boxen, inslag, uitslag, afroepen, snapshots] = await Promise.all([
    prisma.box.count(),
    prisma.inslagLog.count(),
    prisma.uitslagLog.count(),
    prisma.afroep.count(),
    prisma.dagVoorraadSnapshot.count(),
  ]);
  return { boxen, inslag, uitslag, afroepen, snapshots, leeg: boxen + inslag + uitslag + afroepen + snapshots === 0 };
}

function naarDatum(s: string) {
  return new Date(s);
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) return NextResponse.json({ error: "Alleen een beheerder kan importeren" }, { status: 403 });

  let body: { modus?: string; data?: unknown; bevestiging?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Het bestand kon niet worden gelezen" }, { status: 400 });
  }
  if (!["stand", "proef", "uitvoeren", "leegmaken"].includes(body.modus ?? "")) {
    return NextResponse.json({ error: "Onbekende stand" }, { status: 400 });
  }

  if (body.modus === "stand") {
    return NextResponse.json({ ok: true, database: await databaseStand() });
  }

  if (body.modus === "leegmaken") {
    // Server-side getypte bevestiging, los van wat de knop in de browser doet.
    if (body.bevestiging !== "LEEGMAKEN") {
      return NextResponse.json({ ok: false, fouten: ["Typ LEEGMAKEN om te bevestigen. Er is niets gewist."] }, { status: 400 });
    }
    const voor = await databaseStand();
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.uitslagLog.deleteMany();
          await tx.afroep.deleteMany();
          await tx.inslagLog.deleteMany();
          await tx.box.deleteMany();
          await tx.dagVoorraadSnapshot.deleteMany();
          // BoxID-teller weer op 1; een daaropvolgende import zet hem op het juiste nummer.
          const teller = await tx.$queryRaw<{ naam: string | null }[]>`SELECT pg_get_serial_sequence('"Box"', 'boxId') AS naam`;
          const naam = teller[0]?.naam;
          if (!naam) throw new Error("De BoxID-teller is niet gevonden");
          await tx.$queryRaw`SELECT setval(${naam}::regclass, 1, false)`;
        },
        { maxWait: 10_000, timeout: 60_000 }
      );
    } catch (err) {
      console.error("Leegmaken mislukt:", err);
      return NextResponse.json(
        { ok: false, fouten: ["Leegmaken is mislukt en volledig teruggedraaid — er is niets gewist. Zie de serverlogs voor details."] },
        { status: 500 }
      );
    }
    await logActiviteit(
      gebruiker,
      "Leegmaken",
      `Database leeggemaakt: ${voor.boxen} boxen, ${voor.inslag} inslagregels, ${voor.uitslag} uitslagregels, ${voor.afroepen} afroepen, ${voor.snapshots} dagsnapshots verwijderd`
    );
    return NextResponse.json({ ok: true, verwijderd: voor, database: await databaseStand() });
  }

  // Altijd opnieuw controleren op de server — de browser wordt niet vertrouwd.
  const { data, fouten, waarschuwingen } = valideerImport(body.data);
  const stand = await databaseStand();
  if (!data) {
    return NextResponse.json({ ok: false, fouten, waarschuwingen, database: stand });
  }

  const controleVoor = controleerTegenSnapshots(
    data.inslagLogs.map((l) => ({ ...l, inslagtijd: naarDatum(l.inslagtijd) })),
    data.uitslagLogs.map((l) => ({ ...l, uitslagtijd: naarDatum(l.uitslagtijd) })),
    data.snapshots.map((s) => ({ ...s, datum: naarDatum(s.datum) }))
  );
  const resultaatControle = {
    dagenGecontroleerd: controleVoor.dagenGecontroleerd,
    aantalAfwijkingen: controleVoor.afwijkingen.length,
    afwijkingen: controleVoor.afwijkingen.slice(0, 10),
  };
  const kanImporteren = stand.leeg && controleVoor.afwijkingen.length === 0;

  if (body.modus === "proef") {
    return NextResponse.json({
      ok: true,
      samenvatting: samenvatting(data),
      waarschuwingen,
      controle: resultaatControle,
      database: stand,
      kanImporteren,
    });
  }

  // ---- uitvoeren
  if (!stand.leeg) {
    return NextResponse.json(
      { ok: false, fouten: ["De database bevat al gegevens (boxen, inslag, uitslag, afroepen of dagsnapshots). Maak eerst leeg. Er is niets geïmporteerd."], database: stand },
      { status: 409 }
    );
  }
  if (controleVoor.afwijkingen.length > 0) {
    return NextResponse.json(
      { ok: false, fouten: ["De nagerekende voorraad komt niet overeen met de dagsnapshots. Er is niets geïmporteerd."], controle: resultaatControle },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const items = (["productafkomst", "proces", "model", "klant"] as const).flatMap((soort) =>
          data.validaties[soort].map((naam) => ({ soort, naam }))
        );
        await tx.validatieItem.createMany({ data: items, skipDuplicates: true });

        await inBatches(data.boxen, (batch) =>
          tx.box.createMany({
            data: batch.map((b) => ({
              boxId: b.boxId,
              productafkomst: b.productafkomst,
              proces: b.proces,
              model: b.model,
              partijcode: b.partijcode,
              productiedatum: naarDatum(b.productiedatum),
              aantalKazen: b.aantalKazen,
              nettoGram: b.nettoGram,
              opmerking: b.opmerking,
              createdAt: naarDatum(b.createdAt),
              laatsteMutatie: naarDatum(b.laatsteMutatie),
            })),
          })
        );

        await inBatches(data.inslagLogs, (batch) =>
          tx.inslagLog.createMany({
            data: batch.map((l) => ({
              transactionId: l.transactionId,
              boxId: l.boxId,
              productafkomst: l.productafkomst,
              proces: l.proces,
              model: l.model,
              partijcode: l.partijcode,
              productiedatum: naarDatum(l.productiedatum),
              aantalKazen: l.aantalKazen,
              nettoGram: l.nettoGram,
              opmerking: l.opmerking,
              inslagtijd: naarDatum(l.inslagtijd),
            })),
          })
        );

        await inBatches(data.uitslagLogs, (batch) =>
          tx.uitslagLog.createMany({
            data: batch.map((l) => ({
              transactionId: l.transactionId,
              boxId: l.boxId,
              productafkomst: l.productafkomst,
              proces: l.proces,
              model: l.model,
              partijcode: l.partijcode,
              productiedatum: naarDatum(l.productiedatum),
              uitslagType: l.uitslagType,
              tarief: l.tarief,
              aantalKazenUit: l.aantalKazenUit,
              nettoGramUit: l.nettoGramUit,
              opmerking: l.opmerking,
              uitslagtijd: naarDatum(l.uitslagtijd),
            })),
          })
        );

        await inBatches(data.snapshots, (batch) =>
          tx.dagVoorraadSnapshot.createMany({
            data: batch.map((s) => ({
              datum: naarDatum(s.datum),
              partijcode: s.partijcode,
              productafkomst: s.productafkomst,
              model: s.model,
              nettoGram: s.nettoGram,
            })),
          })
        );

        // De BoxID-teller doorzetten, zodat de eerstvolgende nieuwe box het
        // volgende nummer uit het oude systeem krijgt (geen dubbele BoxID's).
        const teller = await tx.$queryRaw<{ naam: string | null }[]>`SELECT pg_get_serial_sequence('"Box"', 'boxId') AS naam`;
        const naam = teller[0]?.naam;
        if (!naam) throw new Error("De BoxID-teller is niet gevonden");
        await tx.$queryRaw`SELECT setval(${naam}::regclass, ${data.volgendeBoxId}::bigint, false)`;
      },
      { maxWait: 10_000, timeout: 120_000 }
    );
  } catch (err) {
    console.error("Import mislukt:", err);
    return NextResponse.json(
      { ok: false, fouten: ["De import is mislukt en volledig teruggedraaid — er is niets weggeschreven. Zie de serverlogs voor details."] },
      { status: 500 }
    );
  }

  await logActiviteit(
    gebruiker,
    "Import",
    `Excel-import: ${data.boxen.length} boxen, ${data.inslagLogs.length} inslagregels, ${data.uitslagLogs.length} uitslagregels, ${data.snapshots.length} dagsnapshots (bron: ${data.bron})`
  );

  // Controle op wat er NU in de database staat (niet op het bestand).
  const [inslag, uitslag, snapshots] = await Promise.all([
    prisma.inslagLog.findMany({
      select: { boxId: true, partijcode: true, productafkomst: true, model: true, nettoGram: true, inslagtijd: true },
    }),
    prisma.uitslagLog.findMany({ select: { boxId: true, nettoGramUit: true, uitslagtijd: true } }),
    prisma.dagVoorraadSnapshot.findMany({
      select: { datum: true, partijcode: true, productafkomst: true, model: true, nettoGram: true },
    }),
  ]);
  const controleNa = controleerTegenSnapshots(inslag, uitslag, snapshots);
  const eind = await databaseStand();

  return NextResponse.json({
    ok: true,
    ingevoerd: eind,
    controleNaImport: {
      dagenGecontroleerd: controleNa.dagenGecontroleerd,
      aantalAfwijkingen: controleNa.afwijkingen.length,
      afwijkingen: controleNa.afwijkingen.slice(0, 10),
    },
  });
}

