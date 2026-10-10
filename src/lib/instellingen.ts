import { prisma } from "@/lib/prisma";

// Instellingen die een beheerder in de app kan aanpassen (Beheer →
// Instellingen). Opgeslagen als sleutel/waarde in de database; de
// standaardwaarden hieronder gelden zolang er niets is ingesteld.

export const SESSIE_UREN_STANDAARD = 14 * 24; // 2 weken, zoals tot nu toe
export const SESSIE_UREN_MIN = 1;
export const SESSIE_UREN_MAX = 365 * 24;

const SLEUTEL_SESSIE_UREN = "sessieUren";

export function begrensSessieUren(n: number): number {
  if (!Number.isFinite(n)) return SESSIE_UREN_STANDAARD;
  return Math.min(SESSIE_UREN_MAX, Math.max(SESSIE_UREN_MIN, Math.round(n)));
}

/** Hoe lang een inlog (e-mailcode) geldig blijft, in uren. */
export async function getSessieUren(): Promise<number> {
  try {
    const rij = await prisma.instelling.findUnique({ where: { sleutel: SLEUTEL_SESSIE_UREN } });
    if (!rij) return SESSIE_UREN_STANDAARD;
    return begrensSessieUren(Number(rij.waarde));
  } catch (err) {
    // Een leesfout mag inloggen nooit blokkeren: val terug op de standaard.
    console.error("Kon instelling niet lezen, standaard gebruikt:", err);
    return SESSIE_UREN_STANDAARD;
  }
}

export async function setSessieUren(uren: number): Promise<number> {
  const waarde = begrensSessieUren(uren);
  await prisma.instelling.upsert({
    where: { sleutel: SLEUTEL_SESSIE_UREN },
    update: { waarde: String(waarde) },
    create: { sleutel: SLEUTEL_SESSIE_UREN, waarde: String(waarde) },
  });
  return waarde;
}

export function sessieTekst(uren: number): string {
  if (uren % 24 === 0) {
    const d = uren / 24;
    return d === 1 ? "1 dag" : `${d} dagen`;
  }
  return uren === 1 ? "1 uur" : `${uren} uur`;
}
