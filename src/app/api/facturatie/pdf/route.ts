import { NextRequest, NextResponse } from "next/server";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { huidigeGeneratieDatum } from "@/lib/facturatie";
import { logActiviteit } from "@/lib/audit";
import { maakFacturatiePdf } from "@/lib/facturatie-pdf";

// ?weergave=1 -> voor de ingebouwde PDF-viewer: inline, niet als download gelogd.
// Zonder die parameter is het een echte download en komt die in Activiteiten.
export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canFacturatie) return NextResponse.json({ error: "Geen rechten voor facturatie" }, { status: 403 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const weergave = req.nextUrl.searchParams.get("weergave") === "1";
  const generatieDatum = weekParam ? new Date(weekParam) : huidigeGeneratieDatum();
  const { bytes, label } = await maakFacturatiePdf(generatieDatum);

  if (!weergave) {
    await logActiviteit(gebruiker, "Download", `Facturatieoverzicht ${label.pdfWeek} (${label.pdfRange}) als PDF gedownload`);
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${weergave ? "inline" : "attachment"}; filename="${label.bestandsnaam}"`,
      "Cache-Control": "no-store",
    },
  });
}
