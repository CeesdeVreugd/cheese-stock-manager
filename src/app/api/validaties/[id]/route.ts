import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruiker } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getSessionGebruiker();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan validatielijsten aanpassen" }, { status: 403 });
  }

  const { id } = await params;
  // Zachte verwijdering: bestaande inslag/uitslag-historie blijft leesbaar
  // verwijzen naar deze naam (die staat als tekst in de logs, niet als koppeling).
  await prisma.validatieItem.update({ where: { id }, data: { actief: false } });

  return NextResponse.json({ ok: true });
}
