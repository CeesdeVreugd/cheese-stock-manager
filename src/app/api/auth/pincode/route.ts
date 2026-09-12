import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruikerId, ensureDeviceId, hashValue, setUnlockedCookie } from "@/lib/auth";

const SESSIE_DAGEN = 14;

export async function POST(req: NextRequest) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { pincode } = await req.json();
  if (!/^[0-9]{4,6}$/.test(pincode || "")) {
    return NextResponse.json({ error: "Pincode moet 4 tot 6 cijfers zijn" }, { status: 400 });
  }

  const deviceId = await ensureDeviceId();
  const sessieVerlooptOp = new Date(Date.now() + SESSIE_DAGEN * 24 * 60 * 60 * 1000);

  await prisma.devicePincode.upsert({
    where: { gebruikerId_deviceId: { gebruikerId, deviceId } },
    update: { pincodeHash: hashValue(pincode), sessieVerlooptOp },
    create: { gebruikerId, deviceId, pincodeHash: hashValue(pincode), sessieVerlooptOp },
  });

  await setUnlockedCookie(gebruikerId);

  return NextResponse.json({ ok: true });
}
