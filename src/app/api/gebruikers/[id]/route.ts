import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";

const GELDIGE_ROLLEN = ["beheerder", "medewerker", "lezer"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (gebruiker.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers aanpassen" }, { status: 403 });
  }

  const { id } = await params;
  const { status, rol } = await req.json();

  const data: { status?: "actief" | "geblokkeerd"; rol?: "beheerder" | "medewerker" | "lezer" } = {};

  if (status !== undefined) {
    if (!["actief", "geblokkeerd"].includes(status)) {
      return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
    }
    if (id === gebruiker.id && status === "geblokkeerd") {
      return NextResponse.json({ error: "Je kunt jezelf niet blokkeren" }, { status: 400 });
    }
    data.status = status;
  }

  if (rol !== undefined) {
    if (!GELDIGE_ROLLEN.includes(rol)) {
      return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
    }
    // Zelfde voorzichtigheidsprincipe als bij blokkeren: niet je eigen rol
    // kunnen aanpassen, om te voorkomen dat je jezelf per ongeluk degradeert
    // en zo de laatste beheerder buitensluit.
    if (id === gebruiker.id) {
      return NextResponse.json({ error: "Je kunt je eigen rol niet aanpassen" }, { status: 400 });
    }
    data.rol = rol;
  }

  const bijgewerkt = await prisma.gebruiker.update({ where: { id }, data });
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
