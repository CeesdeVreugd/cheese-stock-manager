import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "beheerder@beekvreugdkaas.nl";
  const naam = process.env.SEED_ADMIN_NAAM || "Beheerder";

  const gebruiker = await prisma.gebruiker.upsert({
    where: { email },
    update: {},
    create: { email, naam, rol: "beheerder", status: "actief" },
  });

  console.log(`Eerste beheerder klaar: ${gebruiker.email}`);
  console.log("Log hiermee in op /login — de code verschijnt in deze terminal (dev-modus).");

  // Startwaarden voor de validatielijsten, overgenomen uit het bestaande
  // facturatie-overzicht — scheelt alles los te moeten intypen bij de eerste
  // keer testen. Zelf aan te vullen/aan te passen via /validaties.
  const validaties: { soort: "productafkomst" | "proces" | "model"; naam: string }[] = [
    { soort: "productafkomst", naam: "Novelle" },
    { soort: "productafkomst", naam: "Producent" },
    { soort: "productafkomst", naam: "Kinderdijk" },
    { soort: "productafkomst", naam: "Noordam" },
    { soort: "proces", naam: "Gethermiseerd" },
    { soort: "proces", naam: "Rauwe melk" },
    { soort: "proces", naam: "Gepasteuriseerd" },
    { soort: "model", naam: "12 Kg" },
    { soort: "model", naam: "16 Kg" },
    { soort: "model", naam: "30 Kg" },
  ];

  for (const v of validaties) {
    await prisma.validatieItem.upsert({
      where: { soort_naam: { soort: v.soort, naam: v.naam } },
      update: {},
      create: v,
    });
  }
  console.log(`${validaties.length} validatielijst-items klaargezet (Productafkomst/Proces/Model).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
