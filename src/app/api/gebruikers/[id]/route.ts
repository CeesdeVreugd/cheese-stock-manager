import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers (de)blokkeren" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();
  if (!["actief", "geblokkeerd"].includes(status)) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  if (id === gebruiker.id && status === "geblokkeerd") {
    return NextResponse.json({ error: "Je kunt jezelf niet blokkeren" }, { status: 400 });
  }

  const bijgewerkt = await prisma.gebruiker.update({ where: { id }, data: { status } });
  return NextResponse.json({ gebruiker: bijgewerkt });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers verwijderen" }, { status: 403 });
  }

  const { id } = await params;
  if (id === gebruiker.id) {
    return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }

  // Bestaande logincodes/pincodes van deze gebruiker worden meeverwijderd
  // (onDelete: Cascade in het schema). Inslag/uitslag-historie blijft
  // gewoon bestaan — daar staat geen koppeling naar de gebruiker in, alleen
  // wát er is gebeurd, niet wie precies (zie §9 audit-opmerking).
  await prisma.gebruiker.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
