import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionGebruikerId } from "@/lib/auth";
import { getFacturatieOverzicht, huidigeGeneratieDatum, weekLabel } from "@/lib/facturatie";

const GOLD = rgb(0.89, 0.65, 0.16);
const GREEN = rgb(0.13, 0.23, 0.17);
const INK = rgb(0.17, 0.15, 0.13);

function fmtDate(d: Date) {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d: Date) {
  return `${fmtDate(d)} ${d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
}
function fmtKg(n: number) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export async function GET(req: NextRequest) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const generatieDatum = weekParam ? new Date(weekParam) : huidigeGeneratieDatum();
  const overzicht = await getFacturatieOverzicht(generatieDatum);
  const label = weekLabel(overzicht.periode);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  function addPage(titel: string) {
    const page = pdf.addPage([841.89, 595.28]); // A4 liggend
    const { width, height } = page.getSize();
    let y = height - 40;

    page.drawText(titel, { x: 40, y, size: 15, font: fontBold, color: GREEN });
    y -= 22;
    page.drawText(`${label.week} — ${label.range}`, { x: 40, y, size: 9, font, color: INK });
    page.drawText(`Gegenereerd op: ${fmtDateTime(generatieDatum)}`, {
      x: width - 220,
      y: height - 40,
      size: 9,
      font,
      color: INK,
    });
    y -= 22;

    return { page, width, height, y };
  }

  function drawTable(
    page: any,
    startY: number,
    headers: string[],
    widths: number[],
    rows: string[][],
    totaalRow?: string[]
  ) {
    let y = startY;
    const rowH = 16;
    const x0 = 40;

    function drawRow(cells: string[], bold: boolean, fill?: any) {
      if (fill) {
        page.drawRectangle({ x: x0, y: y - rowH + 4, width: widths.reduce((a, b) => a + b, 0), height: rowH, color: fill });
      }
      let x = x0;
      for (let i = 0; i < cells.length; i++) {
        page.drawText(cells[i] ?? "", { x: x + 4, y: y - rowH + 8, size: 8.5, font: bold ? fontBold : font, color: INK });
        x += widths[i];
      }
      y -= rowH;
    }

    drawRow(headers, true, GOLD);
    for (const r of rows) {
      if (y < 50) return y; // eenvoudige begrenzing: geen paginering in dit prototype
      drawRow(r, false);
    }
    if (totaalRow) drawRow(totaalRow, true, GOLD);
    return y;
  }

  // Pagina 1: Inslag
  {
    const { page, y: y0 } = addPage("Facturatie overzicht - inslag boerenkazen");
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
    drawTable(page, y0, headers, widths, rows, totaal);
  }

  // Pagina 2: Opslag
  {
    const { page, y: y0 } = addPage("Facturatie overzicht - opslag boerenkazen");
    const headers = ["Partijcode", "Productafkomst", "Model", "Aantal dagen", "Opslag hoeveelheid (kg-dagen)"];
    const widths = [110, 140, 100, 100, 220];
    const rows = overzicht.opslag.map((r) => [r.partijcode, r.productafkomst, r.model, String(r.aantalDagen), fmtKg(r.kgDagen)]);
    const totaal = [String(overzicht.opslag.length), "", "", "", fmtKg(overzicht.totalen.opslagKgDagen)];
    drawTable(page, y0, headers, widths, rows, totaal);
  }

  // Pagina 3 en 4: Uitslag Standaard / Geëtiketteerd
  for (const [titel, regels, totaalKg] of [
    ["Facturatie overzicht - uitslag (standaard) boerenkazen", overzicht.uitslagStandaard, overzicht.totalen.uitslagStandaardKg],
    ["Facturatie overzicht - uitslag (Geëtiketteerd) boerenkazen", overzicht.uitslagGeetiketteerd, overzicht.totalen.uitslagGeetiketteerdKg],
  ] as const) {
    const { page, y: y0 } = addPage(titel);
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
      drawTable(page, y0, headers, widths, [["Geen uitslag van dit type deze week", "", "", "", "", "", "", "", "", "0,0"]], [
        "0",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "0,0",
      ]);
    } else {
      const totaal = [String(regels.length), "", "", "", "", "", "", "", "", fmtKg(totaalKg)];
      drawTable(page, y0, headers, widths, rows, totaal);
    }
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Facturatie_overzicht_${label.week.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
