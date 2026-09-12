import { NextRequest, NextResponse } from "next/server";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { getFacturatieOverzicht, huidigeGeneratieDatum, weekLabel } from "@/lib/facturatie";

export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canFacturatie) return NextResponse.json({ error: "Geen rechten voor facturatie" }, { status: 403 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const generatieDatum = weekParam ? new Date(weekParam) : huidigeGeneratieDatum();

  const overzicht = await getFacturatieOverzicht(generatieDatum);
  const label = weekLabel(overzicht.periode);

  return NextResponse.json({
    generatieDatum: generatieDatum.toISOString(),
    label,
    periode: { start: overzicht.periode.start, eind: overzicht.periode.eind },
    totalen: overzicht.totalen,
    inslag: overzicht.inslag,
    uitslagStandaard: overzicht.uitslagStandaard,
    uitslagGeetiketteerd: overzicht.uitslagGeetiketteerd,
    opslag: overzicht.opslag,
  });
}
