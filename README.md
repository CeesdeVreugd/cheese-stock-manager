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
inslag, uitslag, afroeporders en gebruikersbeheer — wie deed wat, en
wanneer. Verstandig om af en toe te bekijken, vooral bij meerdere mensen met
toegang.

Bij **Gebruikers** kan een beheerder nu ook iemands pincode resetten (bv. bij
een kwijtgeraakt of vervangen toestel) — die persoon moet dan bij de
volgende app-opening weer volledig met e-mail + code inloggen.

## Afroep uitvoeren

Bij een openstaande afroeporder (`/afroeporders`) staat een knop **Uitvoeren**
— die opent Uitslag met de juiste box al klaargezet. Na bevestigen wordt de
afroeporder automatisch op "uitgevoerd" gezet, mét wie en wanneer, en het
uitslagoverzicht toont een "Afroep"-label bij regels die zo zijn afgehandeld.
Annuleren kan nog steeds direct vanuit Afroeporders, zonder via Uitslag te
hoeven.

## Pushmeldingen bij nieuwe afroeporders

Zodra iemand een afroeporder aanmaakt, krijgt iedereen wiens **rol** het
vinkje "Pushmelding bij nieuwe afroeporder" aan heeft staan (behalve de
aanmaker zelf) een echte systeemmelding — op telefoon én desktop, ook als de
app niet openstaat. Een beheerder stelt dit in via **Rollen**: dit vinkje
staat los van het recht om zelf af te roepen, dus een rol kan bijvoorbeeld
wél meldingen krijgen zonder zelf te mogen afroepen (of andersom).

Voor gebruikers met dit vinkje staat het **standaard aan**: bij het openen
van de app wordt automatisch geprobeerd te abonneren (de browser vraagt
daarbij zelf om toestemming). Uitzetten (of opnieuw aanzetten) kan iedereen
zelf via **Profiel** → Meldingen. Daarnaast blijft er ook een bannertje op
het hoofdscherm en een getal-badge bij "Afroeporders" in de zijbalk staan,
voor wie meldingen heeft uitgezet of de toestemming heeft geweigerd.

Dit gebruikt het Web Push-protocol met een VAPID-sleutelpaar (al ingevuld in
`.env.example`, werkt meteen). Wil je je eigen sleutelpaar? Draai
`node scripts/generate-vapid-keys.js` en zet de uitkomst in `.env` én in
Vercel's environment variables (let op: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` moet
zowel lokaal als op Vercel exact hetzelfde zijn als `VAPID_PRIVATE_KEY`,
anders werkt het abonneren niet meer).

## Naamgeving: Afroep(orders), niet Reservering(en)

Wat eerst "Reserveren"/"Reserveringen" heette, heet nu overal **Afroepen**
(het scherm om iets vast te leggen) en **Afroeporders** (het overzicht) —
paginanaam, route, knoppen, statuslabels en de rol-rechten zijn allemaal
bijgewerkt. Achter de schermen heet het Prisma-model bewust nog steeds
`Afroep` in de code maar is gekoppeld aan dezelfde onderliggende
databasetabel als voorheen (via `@@map`) — zo was deze hernoeming een
risicoloze wijziging, zonder een migratie die bestaande afroeporders had
kunnen wissen.

## Inlogcodes versturen via Outlook/Microsoft 365

Naast Resend kan de app inlogcodes ook versturen via jullie eigen Microsoft
365/Outlook-omgeving, via de Microsoft Graph API. Dit moet je één keer
instellen in de Microsoft-beheeromgeving — dat kan ik niet voor je doen.

**Stap 1 — App-registratie aanmaken**
1. Ga naar [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Geef een naam, bv. "Cheese Stock Manager — Mail". Laat de rest op de standaardwaarden staan → **Register**.
3. Noteer de **Application (client) ID** en **Directory (tenant) ID** die nu getoond worden.

**Stap 2 — Een geheime sleutel aanmaken**
1. In hetzelfde app-registratie-scherm: **Certificates & secrets** → **New client secret**.
2. Geef een omschrijving, kies een vervaldatum (bv. 24 maanden), klik **Add**.
3. Kopieer de waarde **direct** — die wordt maar één keer getoond.

**Stap 3 — Rechten geven om te mogen mailen**
1. **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**.
2. Zoek en vink aan: **Mail.Send** → **Add permissions**.
3. Klik daarna op **Grant admin consent for [jullie organisatie]** (hiervoor heb je beheerdersrechten in Microsoft 365 nodig — zonder deze stap werkt het niet).

**Stap 4 — Het verzendadres bepalen**
Kies het mailadres waar de inlogcodes vandaan moeten komen (bv. een bestaand
adres, of een nieuwe gedeelde mailbox zoals `noreply@beekvreugdkaas.nl`).
Zonder verdere actie mag de app hiermee namens **elk** mailadres in de
organisatie versturen — voor de meeste bedrijven prima, maar wil je dit
uit voorzichtigheid beperken tot alleen dat ene adres, dan kan dat via een
**Application Access Policy** in Exchange Online PowerShell:

```powershell
New-ApplicationAccessPolicy -AppId "<client-id-van-stap-1>" -PolicyScopeGroupId "noreply@beekvreugdkaas.nl" -AccessRight RestrictAccess -Description "Cheese Stock Manager mag alleen als dit adres versturen"
```

**Stap 5 — De vier waarden invullen**
Zet in `.env` én in Vercel's Environment Variables:

```
MS_TENANT_ID=<Directory (tenant) ID uit stap 1>
MS_CLIENT_ID=<Application (client) ID uit stap 1>
MS_CLIENT_SECRET=<de geheime waarde uit stap 2>
MS_SENDER_EMAIL=<het verzendadres uit stap 4>
```

Zodra deze vier zijn ingevuld (en er een nieuwe deployment is geweest),
gebruikt de app automatisch Outlook in plaats van Resend — er hoeft verder
niets aangepast te worden. Zonder deze vier blijft Resend (of, zonder beide,
de ontwikkelmodus met de code in de servertermina) gewoon werken zoals
voorheen.

## Rechten per scherm — ook voor nieuwe modules

Elke module heeft een eigen aan/uit-vinkje in **Rollen**, los van de algemene
"Beheer"-rol (zo ook Activiteiten: `canActiviteiten`). Dit is de vaste
werkwijze vanaf nu: elk nieuw scherm krijgt zijn eigen recht in het
rollen-systeem, in plaats van generieke rechten te hergebruiken.

## Standaard-beheerder alleen bij een lege database

`db:seed` maakt `beheerder@beekvreugdkaas.nl` alleen nog aan als er nog
helemaal geen gebruikers bestaan (bootstrap-geval). Bestaande gebruikers
worden met rust gelaten.

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

## Afroepmodule

Verkopers kunnen via **Afroepen** een box scannen of opzoeken en vastleggen
dat (een deel van) de box is afgeroepen voor een groothandelklant. Dit past
de voorraad nog niet aan — het is een aankondiging, zichtbaar met de exacte
beschikbaarheid in Voorraad en in het overzicht **Afroeporders**. De
koppeling met Uitslag is gelegd: de knop "Uitvoeren" bij een open
afroeporder opent Uitslag met de juiste box klaar, en rondt de afroeporder
na bevestigen automatisch af (zie "Afroep uitvoeren" hierboven).

Meerdere openstaande afroeporders op dezelfde box tellen bij elkaar op: is
er van een box van 20 stuks al 10 afgeroepen, dan ziet de volgende persoon
"10 beschikbaar" en kan die niet meer dan 10 afroepen — "Hele box" is dan
niet meer te kiezen. Dit wordt altijd server-side herberekend bij het
daadwerkelijk vastleggen (nooit op een mogelijk verouderd getal in de
browser vertrouwd), dus twee mensen kunnen elkaar niet per ongeluk
dubbel-afroepen.

## Een opmerking over de opslagberekening (kg-dagen)

Dit prototype berekent de opslag (kg-dagen) voor de facturatie live, door de
inslag- en uitslaghistorie terug te rekenen over de gekozen week — er draait
nog geen dagelijkse snapshot-taak (§3.3/§8.1). Het resultaat komt op hetzelfde
neer, maar bij een groeiende hoeveelheid historie is een dagelijkse
snapshot-taak op termijn efficiënter dan dit telkens achteraf te herberekenen.
