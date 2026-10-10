import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import { vereisOntgrendeldeGebruikerApi } from "@/lib/auth";
import { getFacturatieOverzicht, huidigeGeneratieDatum, weekLabel } from "@/lib/facturatie";
import { fmtDatum as fmtDate, fmtDatumTijd as fmtDateTime } from "@/lib/format";

const GOLD = rgb(0.89, 0.65, 0.16);
const GREEN = rgb(0.13, 0.23, 0.17);
const INK = rgb(0.17, 0.15, 0.13);
const LINE = rgb(0.85, 0.82, 0.75);
const WHITE = rgb(1, 1, 1);

function fmtKg(n: number) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export async function GET(req: NextRequest) {
  const gebruiker = await vereisOntgrendeldeGebruikerApi();
  if (!gebruiker) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!gebruiker.rol.canFacturatie) return NextResponse.json({ error: "Geen rechten voor facturatie" }, { status: 403 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const generatieDatum = weekParam ? new Date(weekParam) : huidigeGeneratieDatum();
  const overzicht = await getFacturatieOverzicht(generatieDatum);
  const label = weekLabel(overzicht.periode);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logoImage: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-emblem.png"));
    logoImage = await pdf.embedPng(logoBytes);
  } catch {
    logoImage = null; // Geen logo? Dan gewoon zonder verder — geen harde afhankelijkheid.
  }

  function addPage(titel: string) {
    const page = pdf.addPage([841.89, 595.28]); // A4 liggend
    const { width, height } = page.getSize();
    const top = height - 40;

    // Titel + week/periode/gegenereerd-op, zoals het huidige rapport
    page.drawText(titel, { x: 40, y: top, size: 14, font: fontBold, color: GREEN });
    page.drawText(`Week:`, { x: 40, y: top - 20, size: 8.5, font, color: INK });
    page.drawText(label.pdfWeek, { x: 110, y: top - 20, size: 8.5, font, color: INK });
    page.drawText(`Periode:`, { x: 40, y: top - 33, size: 8.5, font, color: INK });
    page.drawText(label.pdfRange, { x: 110, y: top - 33, size: 8.5, font, color: INK });
    page.drawText(`Gegenereerd op:`, { x: 40, y: top - 46, size: 8.5, font, color: INK });
    page.drawText(fmtDateTime(new Date()), { x: 110, y: top - 46, size: 8.5, font, color: INK });

    // Bedrijfsgegevens + logo rechtsboven
    const rechtsX = width - 220;
    page.drawText("Van Beek & De Vreugd Kaas", { x: rechtsX, y: top, size: 9, font: fontBold, color: GREEN });
    page.drawText("Planckstraat 12", { x: rechtsX, y: top - 13, size: 8.5, font, color: INK });
    page.drawText("3902 HS Veenendaal", { x: rechtsX, y: top - 26, size: 8.5, font, color: INK });
    if (logoImage) {
      const logoW = 46;
      const logoH = (logoImage.height / logoImage.width) * logoW;
      page.drawImage(logoImage, { x: width - 40 - logoW, y: top - 46 - logoH + 30, width: logoW, height: logoH });
    }

    // Scheidingslijn onder de kop
    page.drawLine({ start: { x: 40, y: top - 58 }, end: { x: width - 40, y: top - 58 }, thickness: 0.75, color: LINE });

    return { page, width, height, y: top - 78 };
  }

  /**
   * Tekent een tabel over zoveel pagina's als nodig: elke vervolgpagina krijgt
   * opnieuw de kop en de tabelkop, en de totaalregel komt onder de laatste regel.
   */
  function tabel(titel: string, headers: string[], widths: number[], rows: string[][], totaalRow?: string[]) {
    const rowH = 17;
    const x0 = 40;
    const ondergrens = 50;
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    let { page, y } = addPage(titel);

    function drawRow(cells: string[], opts: { bold?: boolean; fill?: any } = {}) {
      const { bold, fill } = opts;
      if (fill) {
        page.drawRectangle({ x: x0, y: y - rowH, width: totalWidth, height: rowH, color: fill });
      }
      let x = x0;
      for (let i = 0; i < cells.length; i++) {
        const text = cells[i] ?? "";
        const size = 8;
        page.drawText(text, { x: x + 5, y: y - rowH + 6, size, font: bold ? fontBold : font, color: INK });
        // Rand rondom elke cel, voor het spreadsheet-achtige uiterlijk van het origineel
        page.drawRectangle({ x, y: y - rowH, width: widths[i], height: rowH, borderColor: LINE, borderWidth: 0.5 });
        x += widths[i];
      }
      y -= rowH;
    }

    function nieuweBladzijde() {
      ({ page, y } = addPage(`${titel} (vervolg)`));
      drawRow(headers, { bold: true, fill: GOLD });
    }

    drawRow(headers, { bold: true, fill: GOLD });
    for (const r of rows) {
      if (y - rowH < ondergrens) nieuweBladzijde();
      drawRow(r);
    }
    if (totaalRow) {
      if (y - rowH < ondergrens) nieuweBladzijde();
      drawRow(totaalRow, { bold: true, fill: GOLD });
    }
  }

  // Pagina 1: Inslag
  {
    const headers = ["Partijcode", "Productafkomst", "Proces", "Model", "BoxID", "InslagDatum", "Productiedatum", "AantalKazen", "NettoKgBox"];
    const widths = [90, 110, 100, 60, 50, 100, 100, 80, 90];
    const rows = overzicht.inslag.map((r) => [
      r.partijcode,
      r.productafkomst,
      r.proces,
      r.model,
      String(r.boxId),
      fmtDateTime(r.inslagtijd),
      fmtDate(r.productiedatum),
      String(r.aantalKazen),
      fmtKg(r.nettoGram / 1000),
    ]);
    const totaal = [String(overzicht.inslag.length), "", "", "", "", "", "", "", fmtKg(overzicht.totalen.inslagKg)];
    tabel("Facturatie overzicht - inslag boerenkazen", headers, widths, rows, totaal);
  }

  // Pagina 2: Opslag
  {
    const headers = ["Partijcode", "Productafkomst", "Model", "Aantal dagen", "Opslag hoeveelheid (kg-dagen)"];
    const widths = [110, 140, 100, 100, 220];
    const rows = overzicht.opslag.map((r) => [r.partijcode, r.productafkomst, r.model, String(r.aantalDagen), fmtKg(r.kgDagen)]);
    const totaal = [String(overzicht.opslag.length), "", "", "", fmtKg(overzicht.totalen.opslagKgDagen)];
    tabel("Facturatie overzicht - opslag boerenkazen", headers, widths, rows, totaal);
  }

  // Pagina 3 en 4: Uitslag Standaard / Geëtiketteerd
  for (const [titel, regels, totaalKg] of [
    ["Facturatie overzicht - uitslag (standaard) boerenkazen", overzicht.uitslagStandaard, overzicht.totalen.uitslagStandaardKg],
    ["Facturatie overzicht - uitslag (Geëtiketteerd) boerenkazen", overzicht.uitslagGeetiketteerd, overzicht.totalen.uitslagGeetiketteerdKg],
  ] as const) {
    const headers = ["Partijcode", "Productafkomst", "Proces", "Model", "Box ID", "UitslagDatum", "Productiedatum", "Uitslag type", "Aantal kazen uit", "NettoKg Uitslag"];
    const widths = [80, 100, 90, 55, 55, 100, 95, 75, 90, 90];
    const rows = regels.map((r) => [
      r.partijcode,
      r.productafkomst,
      r.proces,
      r.model,
      String(r.boxId),
      fmtDateTime(r.uitslagtijd),
      fmtDate(r.productiedatum),
      r.uitslagType === "volledig" ? "Volledig" : "Klein",
      String(r.aantalKazenUit),
      fmtKg(r.nettoGramUit / 1000),
    ]);
    if (rows.length === 0) {
      tabel(titel, headers, widths, [["Geen uitslag van dit type deze week", "", "", "", "", "", "", "", "", "0,0"]], [
        "0", "", "", "", "", "", "", "", "", "0,0",
      ]);
    } else {
      const totaal = [String(regels.length), "", "", "", "", "", "", "", "", fmtKg(totaalKg)];
      tabel(titel, headers, widths, rows, totaal);
    }
  }

  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${label.bestandsnaam}"`,
    },
  });
}
