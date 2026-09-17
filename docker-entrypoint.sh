#!/bin/sh
# Draait bij elke (her)start van de container, vóór de app zelf. Idempotent:
# prisma db push doet niets als het schema al klopt, en db:seed raakt nooit
# bestaande, zelf aangepaste gegevens aan — alleen ontbrekende
# standaardwaarden (zie prisma/seed.ts).
set -e

echo "Database bijwerken naar nieuwste schema..."
npx prisma db push --accept-data-loss

echo "Standaardwaarden klaarzetten..."
npm run db:seed

echo "Database klaar — app starten."
exec "$@"
