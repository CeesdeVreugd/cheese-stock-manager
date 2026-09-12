import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor reserveren" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();
  if (!["open", "uitgevoerd", "geannuleerd"].includes(status)) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  const bijgewerkt = await prisma.reservering.update({
    where: { id },
    data: { status },
    include: { gebruiker: { select: { naam: true } } },
  });

  return NextResponse.json({ reservering: bijgewerkt });
}
