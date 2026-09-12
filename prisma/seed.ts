import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Drie standaardrollen, aan te passen/aan te vullen via /rollen.
  const beheerderRol = await prisma.rol.upsert({
    where: { naam: "Beheerder" },
    update: {},
    create: {
      naam: "Beheerder",
      canInslag: true,
      canUitslag: true,
      canVoorraad: true,
      canFacturatie: true,
      canReserveren: true,
      canBeheer: true,
    },
  });
  await prisma.rol.upsert({
    where: { naam: "Medewerker" },
    update: {},
    create: {
      naam: "Medewerker",
      canInslag: true,
      canUitslag: true,
      canVoorraad: true,
      canFacturatie: true,
      canReserveren: true,
      canBeheer: false,
    },
  });
  await prisma.rol.upsert({
    where: { naam: "Lezer" },
    update: {},
    create: {
      naam: "Lezer",
      canInslag: false,
      canUitslag: false,
      canVoorraad: true,
      canFacturatie: true,
      canReserveren: false,
      canBeheer: false,
    },
  });
  console.log("Standaardrollen klaar: Beheerder, Medewerker, Lezer.");

  const email = process.env.SEED_ADMIN_EMAIL || "beheerder@beekvreugdkaas.nl";
  const naam = process.env.SEED_ADMIN_NAAM || "Beheerder";

  const gebruiker = await prisma.gebruiker.upsert({
    where: { email },
    update: {},
    create: { email, naam, rolId: beheerderRol.id, status: "actief" },
  });

  console.log(`Eerste beheerder klaar: ${gebruiker.email}`);
  console.log("Log hiermee in op /login — de code verschijnt in deze terminal (dev-modus).");

  // Eenmalige migratie: bestaande gebruikers (van vóór het aanpasbare-
  // rollen-systeem) hebben nog geen rolId. Zonder rol zou de app voor hen
  // crashen bij het inloggen, dus zetten we ze veilig op Beheerder — dat
  // kan daarna via /gebruikers per persoon aangepast worden.
  const zonderRol = await prisma.gebruiker.updateMany({
    where: { rolId: null },
    data: { rolId: beheerderRol.id },
  });
  if (zonderRol.count > 0) {
    console.log(`${zonderRol.count} bestaande gebruiker(s) zonder rol op Beheerder gezet — pas dit eventueel aan via /gebruikers.`);
  }

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
