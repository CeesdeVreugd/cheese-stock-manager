import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionGebruikerId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const gebruikerId = await getSessionGebruikerId();
  if (!gebruikerId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ box: null });

  const boxIdNum = Number(q);
  const box = await prisma.box.findFirst({
    where: {
      OR: [
        Number.isFinite(boxIdNum) ? { boxId: boxIdNum } : undefined,
        { partijcode: { contains: q } },
      ].filter(Boolean) as any,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ box });
}
