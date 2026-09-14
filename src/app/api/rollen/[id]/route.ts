import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

const PERMISSIE_VELDEN = ["canInslag", "canUitslag", "canVoorraad", "canFacturatie", "canReserveren", "canBeheer", "canActiviteiten", "ontvangtAfroepMeldingen"] as const;

function pakPermissies(body: any) {
  const data: Record<string, boolean> = {};
  for (const veld of PERMISSIE_VELDEN) {
    if (typeof body[veld] === "boolean") data[veld] = body[veld];
  }
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan rollen aanpassen" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const data = pakPermissies(body);

  if (typeof body.naam === "string" && body.naam.trim()) {
    data.naam = body.naam.trim() as any;
  }

  // Als dit de rol van de ingelogde beheerder zelf is: canBeheer niet uit
  // kunnen zetten, om te voorkomen dat de laatste beheerder zichzelf
  // buitensluit.
  if (id === gebruiker.rol.id && data.canBeheer === false) {
    return NextResponse.json({ error: "Je kunt beheerrechten niet van je eigen rol afhalen" }, { status: 400 });
  }

  const bijgewerkt = await prisma.rol.update({
    where: { id },
    data,
    include: { _count: { select: { gebruikers: true } } },
  });
  return NextResponse.json({ rol: bijgewerkt });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan rollen verwijderen" }, { status: 403 });
  }

  const { id } = await params;
  if (id === gebruiker.rol.id) {
    return NextResponse.json({ error: "Je kunt je eigen rol niet verwijderen" }, { status: 400 });
  }

  const aantalGebruikers = await prisma.gebruiker.count({ where: { rolId: id } });
  if (aantalGebruikers > 0) {
    return NextResponse.json(
      { error: `Deze rol is nog aan ${aantalGebruikers} gebruiker(s) toegekend — wijs eerst een andere rol toe` },
      { status: 400 }
    );
  }

  await prisma.rol.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
