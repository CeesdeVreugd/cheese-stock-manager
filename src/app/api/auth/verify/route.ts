import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashValue, setSessionCookie, ensureDeviceId, registreerLogin } from "@/lib/auth";
import { getSessieUren } from "@/lib/instellingen";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email || !code) {
    return NextResponse.json({ error: "E-mail en code zijn verplicht" }, { status: 400 });
  }

  const gebruiker = await prisma.gebruiker.findUnique({ where: { email } });
  if (!gebruiker || gebruiker.status !== "actief") {
    return NextResponse.json({ error: "Ongeldige code" }, { status: 401 });
  }

  const codeHash = hashValue(code);
  const loginCode = await prisma.loginCode.findFirst({
    where: {
      gebruikerId: gebruiker.id,
      codeHash,
      gebruikt: false,
      verlooptOp: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!loginCode) {
    return NextResponse.json({ error: "Ongeldige of verlopen code" }, { status: 401 });
  }

  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { gebruikt: true },
  });

  await setSessionCookie(gebruiker.id);
  const deviceId = await ensureDeviceId();
  await registreerLogin(gebruiker.id);

  // Pincode onthouden: heeft deze persoon op dit toestel al eerder een pincode
  // ingesteld, dan blijft die staan en geldt hij opnieuw voor de nieuwe
  // inlogperiode — er hoeft geen nieuwe pincode te worden gekozen.
  const bestaand = await prisma.devicePincode.findUnique({
    where: { gebruikerId_deviceId: { gebruikerId: gebruiker.id, deviceId } },
  });
  if (bestaand) {
    const uren = await getSessieUren();
    await prisma.devicePincode.update({
      where: { id: bestaand.id },
      data: { sessieVerlooptOp: new Date(Date.now() + uren * 60 * 60 * 1000) },
    });
  }

  return NextResponse.json({ ok: true, heeftPincode: !!bestaand });
}
