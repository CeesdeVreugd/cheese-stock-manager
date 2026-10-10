import { NextRequest, NextResponse } from "next/server";
import { vereisOntgrendeldeGebruikerApi, sendFacturatieOverzicht } from "@/lib/auth";
import { huidigeGeneratieDatum } from "@/lib/facturatie";
import { logActiviteit } from "@/lib/audit";
import { maakFacturatiePdf } from "@/lib/facturatie-pdf";

export async function POST(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canFacturatie) return NextResponse.json({ error: "Geen rechten voor facturatie" }, { status: 403 });

  let body: { week?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  const generatieDatum = typeof body.week === "string" && body.week ? new Date(body.week) : huidigeGeneratieDatum();
  if (isNaN(generatieDatum.getTime())) return NextResponse.json({ error: "Ongeldige week" }, { status: 400 });

  try {
    const { bytes, label } = await maakFacturatiePdf(generatieDatum);
    await sendFacturatieOverzicht(email, gebruiker.naam, label.pdfWeek, label.pdfRange, label.bestandsnaam, bytes);
    await logActiviteit(gebruiker, "Verzenden", `Facturatieoverzicht ${label.pdfWeek} (${label.pdfRange}) per e-mail verstuurd naar ${email}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Facturatieoverzicht versturen mislukt:", err);
    return NextResponse.json({ error: "Versturen is niet gelukt. Probeer het later opnieuw." }, { status: 500 });
  }
}
