import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor reserveren" }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status");
  const reserveringen = await prisma.reservering.findMany({
    where: statusParam ? { status: statusParam as any } : undefined,
    include: { gebruiker: { select: { naam: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ reserveringen });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor reserveren" }, { status: 403 });

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

  const reservering = await prisma.reservering.create({
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

  return NextResponse.json({ reservering });
}
