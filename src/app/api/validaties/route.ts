import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

const GELDIGE_SOORTEN = ["productafkomst", "proces", "model", "klant"] as const;
type Soort = (typeof GELDIGE_SOORTEN)[number];

function isGeldigSoort(waarde: string | null): waarde is Soort {
  return !!waarde && (GELDIGE_SOORTEN as readonly string[]).includes(waarde);
}

export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const soort = req.nextUrl.searchParams.get("soort");
  if (!isGeldigSoort(soort)) {
    return NextResponse.json({ error: "Ongeldig of ontbrekend 'soort'-parameter" }, { status: 400 });
  }

  const items = await prisma.validatieItem.findMany({
    where: { soort, actief: true },
    orderBy: { naam: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // Rolcontrole server-side (§4.4), niet alleen door de knop te verbergen
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan validatielijsten aanpassen" }, { status: 403 });
  }

  const { soort, naam } = await req.json();
  if (!isGeldigSoort(soort)) {
    return NextResponse.json({ error: "Ongeldig 'soort'" }, { status: 400 });
  }
  if (!naam || typeof naam !== "string" || naam.trim().length === 0) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }

  const item = await prisma.validatieItem.upsert({
    where: { soort_naam: { soort, naam: naam.trim() } },
    update: { actief: true },
    create: { soort, naam: naam.trim() },
  });

  return NextResponse.json({ item });
}
