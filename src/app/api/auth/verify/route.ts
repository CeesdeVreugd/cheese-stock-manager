import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashValue, setSessionCookie } from "@/lib/auth";

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

  return NextResponse.json({ ok: true });
}
