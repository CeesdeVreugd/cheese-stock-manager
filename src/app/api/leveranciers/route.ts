import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruiker } from "@/lib/auth";

export async function GET() {
  const gebruiker = await getSessionGebruiker();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const leveranciers = await prisma.leverancier.findMany({
    where: { actief: true },
    orderBy: { naam: "asc" },
  });
  return NextResponse.json({ leveranciers });
}

export async function POST(req: NextRequest) {
  const gebruiker = await getSessionGebruiker();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // Rolcontrole gebeurt hier server-side, niet alleen door de knop te verbergen (§4.4)
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan leveranciers toevoegen" }, { status: 403 });
  }

  const { naam } = await req.json();
  if (!naam || typeof naam !== "string" || naam.trim().length === 0) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  const leverancier = await prisma.leverancier.upsert({
    where: { naam: naam.trim() },
    update: { actief: true },
    create: { naam: naam.trim() },
  });

  return NextResponse.json({ leverancier });
}
