import { NextRequest, NextResponse } from "next/server";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { logActiviteit } from "@/lib/audit";
import { getSessieUren, setSessieUren, begrensSessieUren, sessieTekst, SESSIE_UREN_MIN, SESSIE_UREN_MAX } from "@/lib/instellingen";

export async function GET() {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) return NextResponse.json({ error: "Alleen een beheerder kan instellingen bekijken" }, { status: 403 });
  return NextResponse.json({ sessieUren: await getSessieUren() });
}

export async function PUT(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canBeheer) return NextResponse.json({ error: "Alleen een beheerder kan instellingen wijzigen" }, { status: 403 });

  let body: { sessieUren?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const uren = Number(body.sessieUren);
  if (!Number.isFinite(uren) || uren < SESSIE_UREN_MIN || uren > SESSIE_UREN_MAX) {
    return NextResponse.json(
      { error: `De inlogduur moet tussen ${SESSIE_UREN_MIN} uur en ${SESSIE_UREN_MAX / 24} dagen liggen.` },
      { status: 400 }
    );
  }

  const voor = await getSessieUren();
  const nieuw = await setSessieUren(begrensSessieUren(uren));
  if (voor !== nieuw) {
    await logActiviteit(gebruiker, "Instelling", `Inlogduur gewijzigd van ${sessieTekst(voor)} naar ${sessieTekst(nieuw)}`);
  }
  return NextResponse.json({ ok: true, sessieUren: nieuw });
}
