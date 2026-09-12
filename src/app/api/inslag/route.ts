import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canInslag) return NextResponse.json({ error: "Geen rechten voor inslag" }, { status: 403 });

  const body = await req.json();
  const {
    transactionId,
    productafkomst,
    proces,
    model,
    partijcode,
    productiedatum,
    aantalKazen,
    nettoGram,
    opmerking,
  } = body;

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId ontbreekt" }, { status: 400 });
  }
  if (!/^[0-9]{10}$/.test(partijcode || "")) {
    return NextResponse.json({ error: "Partijcode moet 10 cijfers zijn" }, { status: 400 });
  }

  try {
    // Eén databasetransactie: box aanmaken + log wegschrijven slagen samen of falen samen (§9)
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency: als deze transactionId al bestaat, is dit een herhaalde
      // poging (bv. na een timeout) — geef gewoon de eerder aangemaakte box terug.
      const bestaand = await tx.inslagLog.findUnique({ where: { transactionId } });
      if (bestaand) {
        const box = await tx.box.findUnique({ where: { boxId: bestaand.boxId } });
        return { box, herhaling: true };
      }

      const box = await tx.box.create({
        data: {
          productafkomst,
          proces,
          model,
          partijcode,
          productiedatum: new Date(productiedatum),
          aantalKazen: Number(aantalKazen),
          nettoGram: Math.round(Number(nettoGram) * 1000),
          opmerking: opmerking || null,
        },
      });

      await tx.inslagLog.create({
        data: {
          transactionId,
          boxId: box.boxId,
          productafkomst,
          proces,
          model,
          partijcode,
          productiedatum: new Date(productiedatum),
          aantalKazen: Number(aantalKazen),
          nettoGram: box.nettoGram,
          opmerking: opmerking || null,
          gebruikerId: gebruiker.id,
        },
      });

      return { box, herhaling: false };
    });

    if (!result.herhaling) {
      await logActiviteit(
        gebruiker,
        "Inslag",
        `Box #${result.box?.boxId} — ${productafkomst}, ${model}, ${aantalKazen} kazen`
      );
    }

    return NextResponse.json({ ok: true, box: result.box, herhaling: result.herhaling });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Opslaan mislukt, probeer opnieuw" }, { status: 500 });
  }
}
