import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

const GELDIGE_ROLLEN = ["beheerder", "medewerker", "lezer"] as const;

export async function GET() {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers beheren" }, { status: 403 });
  }

  const gebruikers = await prisma.gebruiker.findMany({ orderBy: { naam: "asc" } });
  return NextResponse.json({ gebruikers });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // Rolcontrole server-side (§4.1/§4.4) — een nieuwe gebruiker aanmaken is
  // een beheerder-actie, geen self-service registratie.
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers aanmaken" }, { status: 403 });
  }

  const { naam, email, rol } = await req.json();
  if (!naam || typeof naam !== "string" || naam.trim().length === 0) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Geldig e-mailadres is verplicht" }, { status: 400 });
  }
  if (!GELDIGE_ROLLEN.includes(rol)) {
    return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
  }

  const bestaand = await prisma.gebruiker.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (bestaand) {
    return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres" }, { status: 409 });
  }

  const nieuw = await prisma.gebruiker.create({
    data: { naam: naam.trim(), email: email.trim().toLowerCase(), rol },
  });

  return NextResponse.json({ gebruiker: nieuw });
}
