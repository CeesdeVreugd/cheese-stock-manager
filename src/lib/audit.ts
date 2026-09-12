import { prisma } from "@/lib/prisma";

type GebruikerVoorLog = { naam: string; email: string };

// Denormaliseert bewust naam/e-mail op het moment van de actie i.p.v. een
// live koppeling — zo blijft de geschiedenis leesbaar als de gebruiker later
// wordt verwijderd of van naam verandert.
export async function logActiviteit(gebruiker: GebruikerVoorLog, actie: string, omschrijving: string) {
  try {
    await prisma.auditLog.create({
      data: {
        gebruikerNaam: gebruiker.naam,
        gebruikerEmail: gebruiker.email,
        actie,
        omschrijving,
      },
    });
  } catch (err) {
    // Een logfout mag nooit de eigenlijke actie (inslag, uitslag, etc.)
    // laten mislukken — alleen wegschrijven naar de servelogs.
    console.error("Kon activiteit niet loggen:", err);
  }
}
