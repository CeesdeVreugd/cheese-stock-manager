import { NextRequest, NextResponse } from "next/server";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Zegt wat er met een gescande box aan de hand is: nog in voorraad, al
// (volledig) uitgeslagen, of onbekend. Gebruikt door de scanknop bij Voorraad.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ boxId: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canVoorraad) return NextResponse.json({ error: "Geen rechten voor voorraad" }, { status: 403 });

  const { boxId: raw } = await params;
  const boxId = Number(raw);
  if (!Number.isInteger(boxId) || boxId <= 0) return NextResponse.json({ error: "Ongeldig BoxID" }, { status: 400 });

  const [box, inslag, uitslagen] = await Promise.all([
    prisma.box.findUnique({ where: { boxId } }),
    prisma.inslagLog.findFirst({ where: { boxId }, orderBy: { inslagtijd: "desc" } }),
    prisma.uitslagLog.findMany({ where: { boxId }, orderBy: { uitslagtijd: "desc" } }),
  ]);

  const laatste = uitslagen[0] ?? null;
  return NextResponse.json({
    boxId,
    inVoorraad: !!box,
    bekend: !!(box || inslag || laatste),
    inslag: inslag
      ? { datum: inslag.inslagtijd.toISOString(), partijcode: inslag.partijcode, productafkomst: inslag.productafkomst, model: inslag.model, aantalKazen: inslag.aantalKazen }
      : null,
    laatsteUitslag: laatste
      ? { datum: laatste.uitslagtijd.toISOString(), type: laatste.uitslagType, aantalKazen: laatste.aantalKazenUit, partijcode: laatste.partijcode }
      : null,
    aantalUitslagen: uitslagen.length,
  });
}
