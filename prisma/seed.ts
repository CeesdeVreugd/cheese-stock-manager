import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Standaardrollen: deze worden ALLEEN aangemaakt als de rollen-tabel nog
  // volledig leeg is (eerste keer draaien). Zodra ze bestaan, laat dit
  // script ze verder met rust — ook als een beheerder er later één
  // verwijdert (bv. "Lezer" omdat die niet gebruikt wordt). Zonder deze
  // check kwam een verwijderde standaardrol bij elke volgende publicatie
  // gewoon weer terug, wat niet de bedoeling is.
  const aantalRollen = await prisma.rol.count();
  if (aantalRollen === 0) {
    await prisma.rol.createMany({
      data: [
        {
          naam: "Beheerder",
          canInslag: true,
          canUitslag: true,
          canVoorraad: true,
          canFacturatie: true,
          canReserveren: true,
          canBeheer: true,
          canActiviteiten: true,
          ontvangtAfroepMeldingen: true,
        },
        {
          naam: "Medewerker",
          canInslag: true,
          canUitslag: true,
          canVoorraad: true,
          canFacturatie: true,
          canReserveren: true,
          canBeheer: false,
          canActiviteiten: false,
          ontvangtAfroepMeldingen: true,
        },
        {
          naam: "Lezer",
          canInslag: false,
          canUitslag: false,
          canVoorraad: true,
          canFacturatie: true,
          canReserveren: false,
          canBeheer: false,
          canActiviteiten: false,
          ontvangtAfroepMeldingen: false,
        },
      ],
    });
    console.log("Standaardrollen aangemaakt: Beheerder, Medewerker, Lezer.");
  } else {
    console.log("Rollen bestaan al — hier niets aan veranderd (pas rechten aan via /rollen).");
  }

  // Veiligheidsnet, niet eenmalig maar bij elke publicatie: de rol die
  // letterlijk "Beheerder" heet, behoudt altijd volledige rechten. Dit
  // voorkomt dat een rol die ooit als "de" beheerdersrol is aangemaakt
  // stiekem rechten mist (bv. omdat een nieuw recht is toegevoegd ná het
  // aanmaken van die rol) en zo de laatste beheerder buitensluit van een
  // scherm. Andere rollen — ook een eventuele hernoemde of extra
  // aangemaakte beheerdersrol — raakt dit niet aan.
  await prisma.rol.updateMany({
    where: { naam: "Beheerder" },
    data: {
      canInslag: true,
      canUitslag: true,
      canVoorraad: true,
      canFacturatie: true,
      canReserveren: true,
      canBeheer: true,
      canActiviteiten: true,
      ontvangtAfroepMeldingen: true,
    },
  });

  // Voor de bootstrap-admin en voor "gebruiker zonder rol"-herstel hieronder
  // hebben we een veilige val-terug-rol nodig: bij voorkeur de rol
  // "Beheerder", anders de eerst beschikbare rol.
  const valTerugRol =
    (await prisma.rol.findUnique({ where: { naam: "Beheerder" } })) || (await prisma.rol.findFirst());

  // De standaard-beheerder (beheerder@beekvreugdkaas.nl) wordt alleen nog
  // aangemaakt als er nog HELEMAAL GEEN gebruikers bestaan — puur als
  // noodgreep om een volledig lege database mee te kunnen bootstrappen.
  // Zodra er al gebruikers zijn (het normale geval na de eerste keer),
  // laat dit script ze met rust; roltoewijzing en nieuwe accounts gaan
  // vanaf dan via het scherm Gebruikers.
  const aantalGebruikers = await prisma.gebruiker.count();
  if (aantalGebruikers === 0 && valTerugRol) {
    const email = process.env.SEED_ADMIN_EMAIL || "beheerder@beekvreugdkaas.nl";
    const naam = process.env.SEED_ADMIN_NAAM || "Beheerder";
    const gebruiker = await prisma.gebruiker.create({
      data: { email, naam, rolId: valTerugRol.id, status: "actief" },
    });
    console.log(`Eerste beheerder aangemaakt: ${gebruiker.email}`);
    console.log("Log hiermee in op /login — de code verschijnt in deze terminal (dev-modus).");
  }

  // Eenmalige migratie: bestaande gebruikers (van vóór het aanpasbare-
  // rollen-systeem) hebben nog geen rolId. Zonder rol zou de app voor hen
  // crashen bij het inloggen, dus zetten we ze veilig op de val-terug-rol —
  // dat kan daarna via /gebruikers per persoon aangepast worden.
  if (valTerugRol) {
    const zonderRol = await prisma.gebruiker.updateMany({
      where: { rolId: null },
      data: { rolId: valTerugRol.id },
    });
    if (zonderRol.count > 0) {
      console.log(`${zonderRol.count} bestaande gebruiker(s) zonder rol op ${valTerugRol.naam} gezet — pas dit eventueel aan via /gebruikers.`);
    }
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
