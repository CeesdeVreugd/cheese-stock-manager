import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canReserveren) return NextResponse.json({ error: "Geen rechten voor afroep" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();
  if (!["open", "uitgevoerd", "geannuleerd"].includes(status)) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  const bijgewerkt = await prisma.afroep.update({
    where: { id },
    data: {
      status,
      afgehandeldDoorId: status === "open" ? null : gebruiker.id,
      afgehandeldOp: status === "open" ? null : new Date(),
    },
    include: { gebruiker: { select: { naam: true } }, afgehandeldDoor: { select: { naam: true } } },
  });

  await logActiviteit(gebruiker, "Afroep", `Box #${bijgewerkt.boxId} op status "${status}" gezet`);

  return NextResponse.json({ afroep: bijgewerkt });
}
