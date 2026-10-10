import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vereisOntgrendeldeGebruikerApi, sendUitnodiging } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) {
    return NextResponse.json({ error: "Alleen een beheerder kan gebruikers aanpassen" }, { status: 403 });
  }

  const { id } = await params;
  const { status, rolId, resetPincode, stuurUitnodiging, naam, email } = await req.json();

  const data: { status?: "actief" | "geblokkeerd"; rolId?: string; naam?: string; email?: string } = {};

  const voor = await prisma.gebruiker.findUnique({ where: { id } });
  if (!voor) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }

  if (naam !== undefined) {
    if (typeof naam !== "string" || naam.trim().length === 0) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }
    data.naam = naam.trim();
  }

  if (email !== undefined) {
    const nieuwEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nieuwEmail)) {
      return NextResponse.json({ error: "Geldig e-mailadres is verplicht" }, { status: 400 });
    }
    if (nieuwEmail !== voor.email) {
      // Inloggen gaat met dit adres: een typfout in je eigen adres zou je
      // buitensluiten. Een andere beheerder kan het wel voor je aanpassen.
      if (id === gebruiker.id) {
        return NextResponse.json({ error: "Je kunt je eigen e-mailadres niet wijzigen — laat dat een andere beheerder doen" }, { status: 400 });
      }
      const bestaand = await prisma.gebruiker.findUnique({ where: { email: nieuwEmail } });
      if (bestaand && bestaand.id !== id) {
        return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres" }, { status: 409 });
      }
      data.email = nieuwEmail;
    }
  }

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

  let bijgewerkt;
  try {
    bijgewerkt = await prisma.gebruiker.update({ where: { id }, data, include: { rol: true } });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres" }, { status: 409 });
    }
    throw err;
  }

  if (data.naam !== undefined && data.naam !== voor.naam) {
    await logActiviteit(gebruiker, "Gebruiker", `Naam gewijzigd van ${voor.naam} naar ${data.naam}`);
  }
  if (data.email !== undefined) {
    await logActiviteit(gebruiker, "Gebruiker", `E-mailadres van ${bijgewerkt.naam} gewijzigd van ${voor.email} naar ${data.email}`);
  }

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

  let uitnodigingVerstuurd = false;
  let uitnodigingFout: string | null = null;
  if (stuurUitnodiging === true) {
    try {
      await sendUitnodiging(bijgewerkt.email, bijgewerkt.naam, req.nextUrl.origin);
      uitnodigingVerstuurd = true;
      await logActiviteit(gebruiker, "Gebruiker", `Uitnodigingsmail (opnieuw) verstuurd naar ${bijgewerkt.email}`);
    } catch (err: any) {
      console.error("Uitnodigingsmail versturen mislukt:", err?.message || err);
      uitnodigingFout = "De uitnodigingsmail kon niet verstuurd worden.";
    }
  }

  return NextResponse.json({ gebruiker: bijgewerkt, uitnodigingVerstuurd, uitnodigingFout });
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
