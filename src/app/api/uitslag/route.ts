import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruikerId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json();
  const { transactionId, boxId, uitslagType, tarief, aantalKazenUit, opmerking } = body;

  if (!transactionId || !boxId) {
    return NextResponse.json({ error: "Ontbrekende gegevens" }, { status: 400 });
  }
  if (!["volledig", "klein"].includes(uitslagType)) {
    return NextResponse.json({ error: "Ongeldig uitslag type" }, { status: 400 });
  }
  if (!["standaard", "geetiketteerd"].includes(tarief)) {
    return NextResponse.json({ error: "Ongeldig uitslag tarief" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bestaand = await tx.uitslagLog.findUnique({ where: { transactionId } });
      if (bestaand) return { herhaling: true };

      const box = await tx.box.findUnique({ where: { boxId: Number(boxId) } });
      if (!box) throw new Error("Box niet gevonden");

      const isVolledig = uitslagType === "volledig";
      const aantalUit = isVolledig ? box.aantalKazen : Number(aantalKazenUit);
      if (aantalUit <= 0 || aantalUit > box.aantalKazen) {
        throw new Error("Aantal kazen uit klopt niet met de beschikbare hoeveelheid");
      }
      const gramPerKaas = box.nettoGram / box.aantalKazen;
      const gramUit = Math.round(gramPerKaas * aantalUit);

      await tx.uitslagLog.create({
        data: {
          transactionId,
          boxId: box.boxId,
          productafkomst: box.productafkomst,
          proces: box.proces,
          model: box.model,
          partijcode: box.partijcode,
          productiedatum: box.productiedatum,
          uitslagType,
          tarief,
          aantalKazenUit: aantalUit,
          nettoGramUit: gramUit,
          opmerking: opmerking || null,
        },
      });

      if (isVolledig || aantalUit === box.aantalKazen) {
        await tx.box.delete({ where: { id: box.id } });
      } else {
        await tx.box.update({
          where: { id: box.id },
          data: {
            aantalKazen: box.aantalKazen - aantalUit,
            nettoGram: box.nettoGram - gramUit,
          },
        });
      }

      return { herhaling: false };
    });

    return NextResponse.json({ ok: true, herhaling: result.herhaling });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Uitslag verwerken mislukt" }, { status: 400 });
  }
}
