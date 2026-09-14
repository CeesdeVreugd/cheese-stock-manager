import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSixDigitCode, hashValue, sendLoginCode } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "E-mailadres ontbreekt" }, { status: 400 });
  }

  const gebruiker = await prisma.gebruiker.findUnique({ where: { email } });
  // Bewust geen "bestaat niet"-melding: voorkomt dat een aanvaller kan
  // aftasten welke e-mailadressen als gebruiker bestaan.
  if (!gebruiker || gebruiker.status !== "actief") {
    return NextResponse.json({ ok: true });
  }

  const code = generateSixDigitCode();
  await prisma.loginCode.create({
    data: {
      gebruikerId: gebruiker.id,
      codeHash: hashValue(code),
      verlooptOp: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    await sendLoginCode(email, code);
  } catch (err: any) {
    console.error("Inlogcode versturen mislukt:", err?.message || err);
    return NextResponse.json(
      { error: "De inlogcode kon niet verstuurd worden. Probeer het opnieuw, of neem contact op met een beheerder." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
