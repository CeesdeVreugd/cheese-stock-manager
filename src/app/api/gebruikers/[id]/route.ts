import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers aanpassen" }, { status: 403 });
  }

  const { id } = await params;
  const { status, rolId, resetPincode } = await req.json();

  const data: { status?: "actief" | "geblokkeerd"; rolId?: string } = {};

  if (status !== undefined) {
    if (!["actief", "geblokkeerd"].includes(status)) {
      return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
    }
    if (id === gebruiker.id && status === "geblokkeerd") {
      return NextResponse.json({ error: "Je kunt jezelf niet blokkeren" }, { status: 400 });
    }
    data.status = status;
  }

  if (rolId !== undefined) {
    const rolBestaat = await prisma.rol.findUnique({ where: { id: rolId } });
    if (!rolBestaat) {
      return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
    }
    // Zelfde voorzichtigheidsprincipe als bij blokkeren: niet je eigen rol
    // kunnen aanpassen, om te voorkomen dat je jezelf per ongeluk degradeert
    // en zo de laatste beheerder buitensluit.
    if (id === gebruiker.id) {
      return NextResponse.json({ error: "Je kunt je eigen rol niet aanpassen" }, { status: 400 });
    }
    data.rolId = rolId;
  }

  let bijgewerkt = await prisma.gebruiker.update({ where: { id }, data, include: { rol: true } });

  if (status !== undefined) {
    await logActiviteit(gebruiker, "Gebruiker", `${bijgewerkt.naam} op status "${status}" gezet`);
  }
  if (rolId !== undefined) {
    await logActiviteit(gebruiker, "Gebruiker", `Rol van ${bijgewerkt.naam} gewijzigd naar ${bijgewerkt.rol?.naam}`);
  }

  // Beheerder-actie: forceert dat deze gebruiker overal opnieuw met e-mail +
  // code moet inloggen (§4.3) — bijvoorbeeld bij een vermoedelijk
  // zoekgeraakt toestel. Verwijdert alle opgeslagen pincodes van deze
  // gebruiker; de eerstvolgende "ontgrendelen"-poging vindt dan niets meer
  // en stuurt vanzelf door naar de volledige inlogflow.
  if (resetPincode === true) {
    await prisma.devicePincode.deleteMany({ where: { gebruikerId: id } });
    await logActiviteit(gebruiker, "Gebruiker", `Pincode van ${bijgewerkt.naam} gereset`);
  }

  return NextResponse.json({ gebruiker: bijgewerkt });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers verwijderen" }, { status: 403 });
  }

  const { id } = await params;
  if (id === gebruiker.id) {
    return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }

  const teVerwijderen = await prisma.gebruiker.findUnique({ where: { id } });

  // Bestaande logincodes/pincodes van deze gebruiker worden meeverwijderd
  // (onDelete: Cascade in het schema). Inslag/uitslag-historie blijft
  // gewoon bestaan (gebruikerId wordt daar leeggemaakt, zie onDelete:
  // SetNull) — het activiteitenlog zelf blijft sowieso leesbaar, want dat
  // bewaart naam/e-mail apart, niet als koppeling (zie §9 audit-opmerking).
  await prisma.gebruiker.delete({ where: { id } });

  if (teVerwijderen) {
    await logActiviteit(gebruiker, "Gebruiker", `${teVerwijderen.naam} (${teVerwijderen.email}) verwijderd`);
  }

  return NextResponse.json({ ok: true });
}
