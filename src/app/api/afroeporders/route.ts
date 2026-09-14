import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";
import { stuurPushNaarRecht } from "@/lib/push";

export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor afroep" }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status");
  const afroeporders = await prisma.afroep.findMany({
    where: statusParam ? { status: statusParam as any } : undefined,
    include: { gebruiker: { select: { naam: true } }, afgehandeldDoor: { select: { naam: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ afroeporders });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor afroep" }, { status: 403 });

  const { boxId, volledigeBox, aantalKazen, klant, opmerking } = await req.json();

  if (!boxId) {
    return NextResponse.json({ error: "BoxID ontbreekt" }, { status: 400 });
  }

  const box = await prisma.box.findUnique({ where: { boxId: Number(boxId) } });
  if (!box) {
    return NextResponse.json({ error: "Box niet gevonden" }, { status: 404 });
  }

  if (!volledigeBox) {
    const aantal = Number(aantalKazen);
    if (!aantal || aantal <= 0 || aantal > box.aantalKazen) {
      return NextResponse.json({ error: "Aantal kazen klopt niet met de beschikbare hoeveelheid" }, { status: 400 });
    }
  }

  const afroep = await prisma.afroep.create({
    data: {
      boxId: box.boxId,
      volledigeBox: !!volledigeBox,
      aantalKazen: volledigeBox ? null : Number(aantalKazen),
      klant: klant || null,
      opmerking: opmerking || null,
      gebruikerId: gebruiker.id,
    },
    include: { gebruiker: { select: { naam: true } } },
  });

  await logActiviteit(
    gebruiker,
    "Afroep",
    `Box #${box.boxId} afgeroepen (${volledigeBox ? "hele box" : `${aantalKazen} kazen`})${klant ? ` voor ${klant}` : ""}`
  );

  // Iedereen die afroeporders mag uitvoeren een seintje geven — behalve
  // degene die 'm net zelf aanmaakte, die hoeft daar geen melding over.
  await stuurPushNaarRecht(
    "ontvangtAfroepMeldingen",
    {
      title: "Nieuwe afroeporder",
      body: `Box #${box.boxId}${klant ? ` voor ${klant}` : ""} (${volledigeBox ? "hele box" : `${aantalKazen} kazen`})`,
      url: "/afroeporders",
    },
    gebruiker.id
  );

  return NextResponse.json({ afroep });
}
