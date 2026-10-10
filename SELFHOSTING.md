# Zelf hosten op de VM (Debian 13 + Docker + Portainer)

Dit document beschrijft hoe je de app draaiend krijgt op de VM
(`192.168.10.102`), beheerd via Portainer, bereikbaar via Nginx Proxy
Manager (die al apart draait, buiten deze opzet om).

Dit raakt op geen enkele manier de bestaande Vercel/Neon-productieomgeving
— dat blijft gewoon naast deze opzet bestaan tot je bewust besluit om over
te stappen.

## Hoe dit in elkaar steekt

```
GitHub (jouw push via publiceren.cmd)
        │
        ▼
Portainer  ("Stacks from Git" — haalt zelf de nieuwste code op)
        │
        ▼
cheesestockmanager-app container  ── bij het opstarten: database-schema bijwerken,
   (poort 3000, intern)    standaardwaarden klaarzetten, dan pas de app starten
        │
        ▼
postgres container  (alleen intern bereikbaar, nooit vanaf buiten)
```

Nginx Proxy Manager (een eigen, aparte Portainer-stack, netwerk
`npm_default`) stuurt van buitenaf binnenkomend verkeer door naar
`cheesestockmanager-app:3000` — dat stellen we in stap 4 hieronder in.

## 1. Deze stack aanmaken in Portainer

1. Ga in Portainer naar **Stacks** → **Add stack**
2. Naam: bijvoorbeeld `cheese-stock-manager`
3. Build method: **Repository**
4. Repository URL: jullie GitHub-repository (bv. `https://github.com/CeesdeVreugd/cheese-stock-manager`)
5. Repository reference: `refs/heads/main`
6. Compose path: `docker-compose.yml` (staat al goed, dit is de standaardwaarde)
7. Is er iets veranderd aan de zichtbaarheid van de repository (privé)? Dan moet je hier ook authenticatie instellen (Personal Access Token) — laat het weten als je daar hulp bij wilt.

## 2. Omgevingsvariabelen

Portainer's Git-stacks lezen zelf geen apart `.env.docker`-bestand van je
lokale pc — die moet je hier invullen bij het aanmaken van de stack, onder
**"Environment variables"**:

- `POSTGRES_PASSWORD`: een nieuw, lang wachtwoord (zelf verzinnen)
- Verder heeft de `cheesestockmanager-app`-container zijn eigen env-bestand nodig
  (`DATABASE_URL`, Resend/Microsoft Graph/VAPID/SESSION_SECRET). Voeg deze
  hier allemaal toe als losse environment variables, met dezelfde namen en
  waarden als in je Vercel-instellingen. `DATABASE_URL` wordt dan:
  ```
  postgresql://cheesestock:<POSTGRES_PASSWORD hierboven>@postgres:5432/cheesestock
  ```

## 3. De stack starten

Klik op **Deploy the stack**. Portainer bouwt nu de `cheesestockmanager-app`-image en
start beide containers. Dit duurt de eerste keer een paar minuten (de
volledige `npm install` + build gebeurt binnen de container).

Bij het opstarten van `cheesestockmanager-app` gebeurt automatisch: database-schema
bijwerken, standaardrollen + een eerste beheerder-account klaarzetten
(zie de container-logs voor het e-mailadres), en dan pas start de app.

Controleer de voortgang via **Containers** → `cheesestockmanager-app` → **Logs**.

## 4. Nginx Proxy Manager koppelen

In NPM (bereikbaar zoals je al gewend bent):

1. **Proxy Hosts** → **Add Proxy Host**
2. Domain Names: `cheesstockmanager.beekvreugdkaas.nl`
3. Scheme: `http`, Forward Hostname/IP: `cheesestockmanager-app`, Forward Port: `3000`
   (dit werkt omdat beide stacks nu op hetzelfde `npm_default`-netwerk
   zitten — geen IP-adres nodig, gewoon de containernaam)
4. Tabblad **SSL**: "Request a new SSL Certificate", vink "Force SSL" en
   "HTTP/2 Support" aan, vul een e-mailadres in, Save.

## 5. Testen

Open `https://cheesstockmanager.beekvreugdkaas.nl` — je zou het
inlogscherm moeten zien.

## Updates uitrollen — voortaan

**Vanaf jouw kant:** gewoon `publiceren.cmd` zoals altijd. Dat publiceert
naar Vercel, en pusht dezelfde code naar GitHub.

**Om dit ook op de VM te laten landen:** ga in Portainer naar de
`cheese-stock-manager`-stack en klik op **Pull and redeploy** (of stel bij
de stack-instellingen "Automatic updates" / een webhook in, dan hoeft dit
straks niet eens meer handmatig — vraag je IT'er of dit al aanstaat of nog
ingesteld moet worden). Portainer haalt dan de nieuwste code op, bouwt
opnieuw, en de container werkt bij het opstarten zelf de database bij.

Geen SSH, geen los script — dit is nu echt de enige handeling die nodig is
aan de VM-kant.

## Belangrijk: dit is nog los van de Vercel-data

Deze opzet start met een **lege** database. Het overzetten van de
bestaande gegevens (uit Neon, of uiteindelijk uit de Excel) is een aparte,
latere stap — zie het eerdere migratie-stappenplan.


---

## Eenmalige import uit het oude Excel-systeem

1. Maak met `excel_naar_import.py` (staat niet in de app, alleen bij de beheerder) uit een **kopie** van de Excel het bestand `import-data.json`.
   Het bestand bevat echte bedrijfsgegevens — zet het **nooit** in Git.
2. Open in de app **Beheer → Importeren**, kies het bestand en draai eerst de **proef** (schrijft niets weg).
3. Ziet de proef er goed uit en is de database nog leeg? Vink aan en klik **Nu importeren**. Alles gebeurt in één databasetransactie: het lukt helemaal of niet.
4. Na de import rekent de app de voorraad van elke snapshotdag opnieuw na uit de database zelf en meldt het aantal afwijkingen (hoort 0 te zijn).

Facturatie-dagen lopen van 00:00 tot 24:00 Nederlandse tijd, en de opslag telt de voorraad aan het **begin** van elke dag (zoals het oude systeem).
