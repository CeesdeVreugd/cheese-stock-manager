import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi, sendUitnodiging } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";

export async function GET() {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers beheren" }, { status: 403 });
  }

  const gebruikers = await prisma.gebruiker.findMany({ orderBy: { naam: "asc" }, include: { rol: true } });
  return NextResponse.json({ gebruikers });
}

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  // Rolcontrole server-side (§4.1/§4.4) — een nieuwe gebruiker aanmaken is
  // een beheerder-actie, geen self-service registratie.
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers aanmaken" }, { status: 403 });
  }

  const { naam, email, rolId, stuurUitnodiging } = await req.json();
  if (!naam || typeof naam !== "string" || naam.trim().length === 0) {
    return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Geldig e-mailadres is verplicht" }, { status: 400 });
  }
  const rolBestaat = rolId && (await prisma.rol.findUnique({ where: { id: rolId } }));
  if (!rolBestaat) {
    return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
  }

  const bestaand = await prisma.gebruiker.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (bestaand) {
    return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres" }, { status: 409 });
  }

  const nieuw = await prisma.gebruiker.create({
    data: { naam: naam.trim(), email: email.trim().toLowerCase(), rolId },
    include: { rol: true },
  });

  await logActiviteit(gebruiker, "Gebruiker", `${nieuw.naam} (${nieuw.email}) aangemaakt met rol ${nieuw.rol?.naam}`);

  let uitnodigingVerstuurd = false;
  let uitnodigingFout: string | null = null;
  if (stuurUitnodiging) {
    try {
      await sendUitnodiging(nieuw.email, nieuw.naam, req.nextUrl.origin);
      uitnodigingVerstuurd = true;
      await logActiviteit(gebruiker, "Gebruiker", `Uitnodigingsmail verstuurd naar ${nieuw.email}`);
    } catch (err: any) {
      // Het aanmaken van de gebruiker mag nooit mislukken puur omdat de
      // uitnodigingsmail niet wegkwam — de beheerder kan die later alsnog
      // handmatig doorgeven. Wel duidelijk terugmelden dat het niet lukte.
      console.error("Uitnodigingsmail versturen mislukt:", err?.message || err);
      uitnodigingFout = "Gebruiker is aangemaakt, maar de uitnodigingsmail kon niet verstuurd worden.";
    }
  }

  return NextResponse.json({ gebruiker: nieuw, uitnodigingVerstuurd, uitnodigingFout });
}
