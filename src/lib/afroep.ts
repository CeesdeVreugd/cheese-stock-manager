import { prisma } from "@/lib/prisma";

/**
 * Berekent per box hoeveel er nog daadwerkelijk vrij is om af te roepen,
 * rekening houdend met reeds openstaande afroeporders op diezelfde box.
 * Een openstaande "hele box"-afroep claimt alles (beschikbaar = 0), anders
 * wordt het opgetelde aantal kazen van openstaande deel-afroepen afgetrokken.
 */
export async function beschikbaarheidPerBox(
  boxen: { boxId: number; aantalKazen: number }[]
): Promise<Record<number, number>> {
  if (boxen.length === 0) return {};

  const openAfroepen = await prisma.afroep.findMany({
    where: { status: "open", boxId: { in: boxen.map((b) => b.boxId) } },
    select: { boxId: true, volledigeBox: true, aantalKazen: true },
  });

  const map: Record<number, number> = {};
  for (const box of boxen) {
    const relevant = openAfroepen.filter((a) => a.boxId === box.boxId);
    const heleBoxGeclaimd = relevant.some((a) => a.volledigeBox);
    if (heleBoxGeclaimd) {
      map[box.boxId] = 0;
    } else {
      const gereserveerd = relevant.reduce((som, a) => som + (a.aantalKazen || 0), 0);
      map[box.boxId] = Math.max(0, box.aantalKazen - gereserveerd);
    }
  }
  return map;
}

/**
 * Zelfde berekening voor één specifieke box — gebruikt bij het daadwerkelijk
 * aanmaken van een afroep, als laatste, server-side controle (nooit op de
 * client vertrouwen: die kan een verouderde beschikbaarheid tonen als er
 * ondertussen iemand anders iets heeft afgeroepen).
 */
export async function beschikbaarVoorBox(boxId: number, aantalKazenTotaal: number): Promise<number> {
  const map = await beschikbaarheidPerBox([{ boxId, aantalKazen: aantalKazenTotaal }]);
  return map[boxId] ?? aantalKazenTotaal;
}
