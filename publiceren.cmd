@echo off
REM Dit script doet alles in één keer:
REM 1) kopieert de bestanden uit deze map naar je vaste projectmap (en
REM    verwijdert daar verouderde bestanden die hier niet meer bestaan)
REM 2) installeert eventuele nieuwe packages (npm install)
REM 3) werkt de database bij naar het nieuwste schema (prisma db push)
REM 4) zet standaardwaarden klaar (db:seed) - raakt nooit bestaande, zelf
REM    aangepaste gegevens aan, alleen ontbrekende standaardwaarden
REM 5) commit en pusht de wijziging, met een omschrijving die al is ingevuld
REM Jij hoeft alleen deze cmd te draaien, verder niets.
REM
REM De zelfgehoste VM wordt hier bewust niet meer bijgewerkt: dat regelt
REM Portainer voortaan zelf, rechtstreeks vanuit dezelfde GitHub-push
REM (zie SELFHOSTING.md).

setlocal

set "DOEL=C:\1 Automatiserings projecten\VanBeekDeVreugdKaas\Cheesstockmanager\cheese-stock-manager"
set "OMSCHRIJVING=Fix: docker-compose.yml verwachtte een niet-bestaand .env.docker-bestand; gebruikt nu Portainer's eigen omgevingsvariabelen direct."

echo.
echo ============================================
echo  Stap 1/5: bestanden bijwerken
echo ============================================
echo Doel: %DOEL%
echo.

REM /MIR zorgt dat verouderde/verwijderde bestanden ook in de doelmap
REM verdwijnen. .git, node_modules, .next en .env blijven met rust.
robocopy "%~dp0." "%DOEL%" /MIR /XD .git node_modules .next /XF .env .env.local /NFL /NDL /NJH /NJS

if %errorlevel% GEQ 8 (
  echo.
  echo FOUT: Er ging iets mis bij het bijwerken van de bestanden.
  pause
  exit /b 1
)

cd /d "%DOEL%"

if not exist ".git" (
  echo.
  echo FOUT: Er is geen git-repository gevonden op: %DOEL%
  echo Controleer of dit pad nog klopt.
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo FOUT: Er is geen .env-bestand gevonden in deze map.
  echo Zet daar eerst je DATABASE_URL in ^(zie README.md^) en probeer opnieuw.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Stap 2/5: packages installeren
echo ============================================
call npm install
if %errorlevel% NEQ 0 (
  echo.
  echo FOUT: npm install is mislukt. Er wordt niets gepusht.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Stap 3/5: database bijwerken naar nieuwste schema
echo ============================================
call npx prisma db push --accept-data-loss
if %errorlevel% NEQ 0 (
  echo.
  echo FOUT: database bijwerken is mislukt. Er wordt niets gepusht.
  echo Controleer je .env ^(DATABASE_URL^) en internetverbinding.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Stap 4/5: standaardwaarden klaarzetten
echo ============================================
call npm run db:seed
if %errorlevel% NEQ 0 (
  echo.
  echo FOUT: db:seed is mislukt. Er wordt niets gepusht.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Stap 5/5: publiceren naar Vercel
echo ============================================
git add .
git commit -m "%OMSCHRIJVING%"
git push

echo.
echo ============================================
echo  Klaar!
echo ============================================
echo Vercel bouwt en publiceert de nieuwe versie automatisch
echo ^(te volgen op vercel.com, meestal binnen 1-2 minuten^).
echo.
echo De zelfgehoste VM ^(via Portainer^) haalt deze wijziging nu ook zelf op
echo — zie SELFHOSTING.md voor hoe je dat daar bevestigt/controleert.
pause
