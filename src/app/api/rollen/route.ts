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

export async function GET() {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan rollen beheren" }, { status: 403 });
  }

  const rollen = await prisma.rol.findMany({
    orderBy: { naam: "asc" },
    include: { _count: { select: { gebruikers: true } } },
  });
  return NextResponse.json({ rollen });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan rollen aanmaken" }, { status: 403 });
  }

  const body = await req.json();
  const { naam } = body;
  if (!naam || typeof naam !== "string" || naam.trim().length === 0) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  const bestaat = await prisma.rol.findUnique({ where: { naam: naam.trim() } });
  if (bestaat) {
    return NextResponse.json({ error: "Er bestaat al een rol met deze naam" }, { status: 409 });
  }

  const nieuw = await prisma.rol.create({
    data: { naam: naam.trim(), ...pakPermissies(body) },
    include: { _count: { select: { gebruikers: true } } },
  });

  return NextResponse.json({ rol: nieuw });
}
