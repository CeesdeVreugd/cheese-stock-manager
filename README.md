# Cheese Stock Manager — werkend prototype

Dit is een werkende versie van de app uit het technisch ontwerpdocument:
inloggen met e-mail + code, inslag, uitslag (met QR-scan), voorraad,
leveranciersbeheer en een facturatiemodule met PDF-export — met een echte
PostgreSQL-database erachter. Nog niet in dit prototype: het daadwerkelijk
printen van labels op een fysieke printer (§7.1 Raspberry Pi/Zebra Browser
Print) en een geplande (cron) taak die de facturatie automatisch draait —
dat laatste kan nu handmatig per week bekeken/gedownload worden.

**Belangrijk:** deze code is geschreven en gecontroleerd op syntaxis, maar nog
niet zelf gebouwd/gedraaid — dat kon niet vanuit de omgeving waarin dit is
gemaakt (geen internettoegang om packages te installeren). Volg onderstaande
stappen; als je ergens een foutmelding tegenkomt, kun je die gewoon terugkoppelen.

## 1. Gratis accounts aanmaken (eenmalig, kost niets)

1. **GitHub** (github.com) — voor de broncode.
2. **Neon** (neon.tech) — gratis PostgreSQL-database. Maak een project aan en
   kopieer de "connection string" (begint met `postgresql://`).
3. **Vercel** (vercel.com) — voor het hosten van de webapp. Log in met je
   GitHub-account.
4. **Resend** (resend.com) — optioneel, voor het echt versturen van
   inlogcodes per e-mail. Zonder dit account werkt de app ook: de inlogcode
   verschijnt dan in de servertermina (handig om lokaal te testen).

## 2. Lokaal draaien (op je eigen laptop, met internet)

```bash
npm install
cp .env.example .env
# Plak je Neon-connection-string in .env bij DATABASE_URL

npm run db:push     # zet het datamodel in de database
npm run db:seed     # maakt een eerste beheerder-account aan
npm run dev         # start de app op http://localhost:3000
```

Log in met het e-mailadres dat de seed net aanmaakte (standaard
`beheerder@beekvreugdkaas.nl`, aan te passen via `SEED_ADMIN_EMAIL` in `.env`).
Zonder `RESEND_API_KEY` verschijnt de 6-cijferige inlogcode in het terminal-venster
waar `npm run dev` draait.

Voeg daarna via **Validatielijsten** (in het hoofdscherm, alleen zichtbaar voor
de rol beheerder) minimaal één Productafkomst/Proces/Model toe — die lijsten
voeden de dropdowns in het inslagformulier. Via **Gebruikers** (ook
beheerder-only) maak je collega's aan met naam, e-mail en rol.

**Over QR-scannen:** camera-toegang in de browser vereist HTTPS, met
`localhost` als uitzondering. Lokaal testen (`npm run dev`) werkt dus gewoon;
zodra de app naar Vercel gepubliceerd is (stap 3), werkt scannen ook daar
automatisch (Vercel levert altijd HTTPS).

## 3. Gratis publiceren op internet

1. Zet deze map in een nieuwe GitHub-repository (`git init`, `git add .`,
   `git commit`, dan naar GitHub pushen).
2. Ga naar vercel.com → "Add New Project" → kies deze repository.
3. Zet bij "Environment Variables" dezelfde waarden als in je `.env`
   (`DATABASE_URL`, eventueel `RESEND_API_KEY`, `RESEND_FROM`, `SESSION_SECRET`).
4. Klik "Deploy". Je krijgt een gratis `.vercel.app`-adres waarmee je met
   collega's kunt testen.
5. Later, als het bevalt: in Vercel een eigen (sub)domein koppelen
   (bijvoorbeeld `voorraad.beekvreugdkaas.nl`) via een DNS-instelling bij je
   huidige domeinregistrar — dit raakt de bestaande website niet aan.

## Wijzigingen publiceren

`publiceren.cmd` is volledig automatisch, van uitpakken tot live: hij kopieert
de bestanden naar je vaste projectmap (en ruimt daar verouderde bestanden op),
draait `npm install`, werkt de database bij (`prisma db push`), zet
standaardwaarden klaar (`db:seed`), en commit + pusht — allemaal met één
dubbelklik. Je hoeft de uitgepakte map nergens specifiek neer te zetten — pak
'm uit, bijvoorbeeld in Downloads, en dubbelklik op `publiceren.cmd`.

**Eén bewuste afweging:** de database-stap gebruikt `--accept-data-loss`, wat
betekent dat een waarschuwing over dataverlies (zoals je eerder handmatig met
"y" bevestigde) nu automatisch wordt geaccepteerd, zonder te vragen. Dat is
precies wat "geen omkijken naar" vraagt, maar betekent ook dat een
schemawijziging die een keer écht belangrijke data zou raken, zonder
tussenstop wordt doorgevoerd. Voor deze testfase is dat een prima afweging;
zodra er echte bedrijfsdata in staat waar je niet per ongeluk iets van kwijt
wilt raken, is het verstandig om dit stukje er weer uit te halen en
database-wijzigingen dan bewust handmatig te bevestigen.

`db:seed` is veilig om steeds opnieuw te draaien: het zet alleen ontbrekende
standaardwaarden (rollen, validatielijst-items) klaar en raakt nooit gegevens
aan die je zelf al hebt aangepast.

## Webapp installeren (pc en telefoon)

De app is een PWA (Progressive Web App): op pc en Android verschijnt een
"Installeren"-bannertje bovenin (gebruikt het browsereigen installatiemechanisme
— werkt in Chrome/Edge; Firefox desktop ondersteunt dit type installatie niet).
Op iPhone werkt dat anders (Apple staat geen installatie-pop-up toe): daar
toont de app een korte instructie om het via Delen → "Zet op beginscherm" te
doen.

Op schermen vanaf tabletformaat (breder dan ca. 768px) verschijnt een vaste
zijbalk met navigatie. Elk scherm heeft nu een eigen, brede desktop-indeling
(bijvoorbeeld een echte tabel voor Voorraad en Gebruikers, drie kolommen naast
elkaar voor Validatielijsten) in plaats van simpelweg de mobiele versie
uitgerekt te tonen.
Uitloggen kan zowel op het mobiele hoofdscherm als in de desktop-zijbalk.

## Inloggen met pincode (§4.3)

Na de eerste volledige login (e-mail + code) wordt om een pincode gevraagd.
Bij het heropenen van de app (zolang de browser niet volledig is afgesloten
én de 2-wekelijkse sessie nog geldig is) volstaat die pincode. Na 2 weken, of
na het volledig afsluiten van de browser, is een nieuwe e-mailcode nodig.

## Activiteitenlog en pincode resetten

Onder **Activiteiten** (beheerder-only) staat een doorzoekbaar logboek van
inslag, uitslag, reserveringen en gebruikersbeheer — wie deed wat, en
wanneer. Verstandig om af en toe te bekijken, vooral bij meerdere mensen met
toegang.

Bij **Gebruikers** kan een beheerder nu ook iemands pincode resetten (bv. bij
een kwijtgeraakt of vervangen toestel) — die persoon moet dan bij de
volgende app-opening weer volledig met e-mail + code inloggen.

## Wat hierna nog moet gebeuren (zie het technisch ontwerpdocument)

- Labelprinten naar een fysieke printer (§7.1: Raspberry Pi-printstation of Zebra Browser Print) — de QR-code zelf wordt al gegenereerd en getoond (na inslag, en op elke box in de voorraadlijst)
- Geplande (cron) taak die de facturatie automatisch elke donderdag klaarzet, i.p.v. nu op-aanvraag berekend — zie §8.1 over de afhankelijkheid met de dagsnapshot
- Overstap van gratis tiers naar betaalde tiers zodra dit meer dan een proef is
  (zie §11 van het ontwerpdocument voor de kosteninschatting)

## Rollen en rechten

Rollen zijn niet langer vast (beheerder/medewerker/lezer), maar volledig zelf
samen te stellen via het scherm **Rollen** (alleen zichtbaar voor rollen met
"Beheer"-rechten): per rol vink je aan welke schermen toegankelijk zijn
(Inslag, Uitslag, Voorraad, Facturatie, Reserveren, Beheer). Zo kan
bijvoorbeeld een rol "Alleen voorraad" gemaakt worden die verder nergens bij
kan. De rechten worden zowel op elk scherm als in de bijbehorende API's
gecontroleerd, niet alleen verborgen in het menu.

## Reserveringsmodule

Nieuw: verkopers kunnen via **Reserveren** een box scannen of opzoeken en
vastleggen dat (een deel van) de box gereserveerd is voor een groothandel-
klant. Dit past de voorraad nog niet aan — het is puur een aankondiging,
zichtbaar via een "Gereserveerd"-label in Voorraad en in het overzicht
**Reserveringen**, waar een reservering afgerond of geannuleerd kan worden.
De daadwerkelijke koppeling met Uitslag (bijvoorbeeld automatisch afronden
zodra de gereserveerde hoeveelheid ook echt is uitgeslagen) is een logische
vervolgstap.

## Een opmerking over de opslagberekening (kg-dagen)

Dit prototype berekent de opslag (kg-dagen) voor de facturatie live, door de
inslag- en uitslaghistorie terug te rekenen over de gekozen week — er draait
nog geen dagelijkse snapshot-taak (§3.3/§8.1). Het resultaat komt op hetzelfde
neer, maar bij een groeiende hoeveelheid historie is een dagelijkse
snapshot-taak op termijn efficiënter dan dit telkens achteraf te herberekenen.
