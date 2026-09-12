import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "beheerder@vanbeekkaas.nl";
  const naam = process.env.SEED_ADMIN_NAAM || "Beheerder";

  const gebruiker = await prisma.gebruiker.upsert({
    where: { email },
    update: {},
    create: { email, naam, rol: "beheerder", status: "actief" },
  });

  console.log(`Eerste beheerder klaar: ${gebruiker.email}`);
  console.log("Log hiermee in op /login — de code verschijnt in deze terminal (dev-modus).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
