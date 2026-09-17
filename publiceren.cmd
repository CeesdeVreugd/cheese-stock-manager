@echo off
REM Dit script doet nu alleen nog wat er ook echt nog nodig is:
REM 1) kopieert de bestanden uit deze map naar je vaste projectmap (en
REM    verwijdert daar verouderde bestanden die hier niet meer bestaan)
REM 2) commit en pusht de wijziging naar GitHub, met een omschrijving die
REM    al is ingevuld
REM
REM Vercel/Neon zijn per <datum opschoning> buiten gebruik gesteld. De
REM zelfgehoste VM (via Portainer) haalt wijzigingen rechtstreeks van
REM GitHub op en regelt zijn eigen database-migratie/seed bij het opstarten
REM van de container (zie docker-entrypoint.sh) — daarom hoeft dit script
REM dat lokaal niet meer te doen.

setlocal

set "DOEL=C:\1 Automatiserings projecten\VanBeekDeVreugdKaas\Cheesstockmanager\cheese-stock-manager"
set "OMSCHRIJVING=Standaardrol 'Lezer' wordt niet meer automatisch aangemaakt bij een nieuwe installatie."

echo.
echo ============================================
echo  Stap 1/2: bestanden bijwerken
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

echo.
echo ============================================
echo  Stap 2/2: publiceren naar GitHub
echo ============================================
git add .
git commit -m "%OMSCHRIJVING%"
git push

echo.
echo ============================================
echo  Klaar!
echo ============================================
echo De zelfgehoste VM (via Portainer) haalt deze wijziging nu zelf op.
echo Ga naar de "cheese-stock-manager"-stack in Portainer en klik op
echo "Pull and redeploy" (met "Re-pull image and redeploy" aan) om 'm
echo daadwerkelijk uit te rollen.
pause
