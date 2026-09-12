import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruikerId, getDeviceIdReadOnly, hashValue, setUnlockedCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) {
    return NextResponse.json({ error: "GEEN_SESSIE", message: "Log opnieuw in met e-mail." }, { status: 401 });
  }

  const deviceId = await getDeviceIdReadOnly();
  if (!deviceId) {
    return NextResponse.json({ error: "GEEN_TOESTEL", message: "Log opnieuw in met e-mail." }, { status: 401 });
  }

  const { pincode } = await req.json();
  if (!pincode) {
    return NextResponse.json({ error: "Pincode is verplicht" }, { status: 400 });
  }

  const devicePincode = await prisma.devicePincode.findUnique({
    where: { gebruikerId_deviceId: { gebruikerId, deviceId } },
  });

  if (!devicePincode) {
    return NextResponse.json(
      { error: "GEEN_PINCODE", message: "Nog geen pincode ingesteld op dit toestel. Log opnieuw in met e-mail." },
      { status: 401 }
    );
  }

  if (devicePincode.sessieVerlooptOp < new Date()) {
    return NextResponse.json(
      { error: "VERLOPEN", message: "Deze sessie is verlopen (2 weken). Log opnieuw in met e-mail." },
      { status: 401 }
    );
  }

  if (devicePincode.pincodeHash !== hashValue(pincode)) {
    return NextResponse.json({ error: "ONJUIST", message: "Onjuiste pincode." }, { status: 401 });
  }

  await setUnlockedCookie(gebruikerId);
  return NextResponse.json({ ok: true });
}
