import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionGebruikerId } from "@/lib/auth";

// Genereert een QR-code die alleen het BoxID bevat (zie ontwerpdocument §7:
// "Het label bevat daarnaast een QR-code met het BoxID"). Dit is de
// server-side bron voor zowel het labelbeeld als het scannen bij uitslag.
export async function GET(req: NextRequest, { params }: { params: Promise<{ boxId: string }> }) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { boxId } = await params;
  const png = await QRCode.toBuffer(boxId, { type: "png", margin: 1, width: 320 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
