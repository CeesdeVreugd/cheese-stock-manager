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
`beheerder@vanbeekkaas.nl`, aan te passen via `SEED_ADMIN_EMAIL` in `.env`).
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
   (bijvoorbeeld `voorraad.vanbeekkaas.nl`) via een DNS-instelling bij je
   huidige domeinregistrar — dit raakt de bestaande website niet aan.

## Wijzigingen publiceren

`publiceren.cmd` is volledig automatisch: hij weet zelf waar je vaste
projectmap staat, kopieert de bestanden ernaartoe (en ruimt daar verouderde
bestanden op die niet meer bestaan), en commit + pusht met een omschrijving
die er al in staat. Je hoeft de uitgepakte map dus nergens specifiek neer te
zetten — pak 'm uit, bijvoorbeeld in Downloads, en dubbelklik op
`publiceren.cmd`. Vercel bouwt en publiceert daarna automatisch.

## Wat hierna nog moet gebeuren (zie het technisch ontwerpdocument)

- Labelprinten naar een fysieke printer (§7.1: Raspberry Pi-printstation of Zebra Browser Print) — de QR-code zelf wordt al gegenereerd en getoond (na inslag, en op elke box in de voorraadlijst)
- Geplande (cron) taak die de facturatie automatisch elke donderdag klaarzet, i.p.v. nu op-aanvraag berekend — zie §8.1 over de afhankelijkheid met de dagsnapshot
- Rollen/rechten verder afdwingen per scherm (nu zijn Validatielijsten en Gebruikers beheerder-only; de rest is gelijk voor iedere ingelogde gebruiker)
- App-pincode voor snelle her-toegang (§4.3) — nu alleen de volledige e-mail+code-login gebouwd
- Overstap van gratis tiers naar betaalde tiers zodra dit meer dan een proef is
  (zie §11 van het ontwerpdocument voor de kosteninschatting)

## Een opmerking over de opslagberekening (kg-dagen)

Dit prototype berekent de opslag (kg-dagen) voor de facturatie live, door de
inslag- en uitslaghistorie terug te rekenen over de gekozen week — er draait
nog geen dagelijkse snapshot-taak (§3.3/§8.1). Het resultaat komt op hetzelfde
neer, maar bij een groeiende hoeveelheid historie is een dagelijkse
snapshot-taak op termijn efficiënter dan dit telkens achteraf te herberekenen.
