@echo off
REM Dit script doet twee dingen:
REM 1) kopieert de bestanden uit deze map naar je vaste projectmap (en
REM    verwijdert daar verouderde bestanden die hier niet meer bestaan)
REM 2) commit en pusht de wijziging naar GitHub, met een omschrijving die
REM    al is ingevuld
REM
REM De app draait zelfgehost op de VM (via Portainer). Die haalt wijzigingen
REM rechtstreeks van GitHub op en regelt zijn eigen database-migratie/seed
REM bij het opstarten van de container (zie docker-entrypoint.sh).
REM
REM LET OP: pak de zip uit in een EIGEN, NIEUWE map (bijv. met "Alles uitpakken").
REM Dit script kopieert alles wat naast het script staat.

setlocal

set "DOEL=C:\1 Automatiserings projecten\VanBeekDeVreugdKaas\Cheesstockmanager\cheese-stock-manager"
set "OMSCHRIJVING=Onderbalk lager, grotere bedrijfsnaam met appnaam eronder."

REM ---- Veiligheidscontrole: staat dit script echt in de uitgepakte app-map? ----
REM Zonder deze controle zou een zip die per ongeluk in bijvoorbeeld Downloads
REM is uitgepakt de hele map naar GitHub kunnen kopieren.
for %%B in ("package.json" "docker-compose.yml" "prisma\schema.prisma" "src\app") do (
  if not exist "%~dp0%%~B" goto :verkeerdeMap
)
set "AANTAL=0"
for /f %%N in ('dir /b /a "%~dp0." ^| find /c /v ""') do set "AANTAL=%%N"
if %AANTAL% GTR 40 goto :verkeerdeMap

echo.
echo ============================================
echo  Stap 1/2: bestanden bijwerken
echo ============================================
echo Van:  %~dp0
echo Naar: %DOEL%
echo.

REM /MIR zorgt dat verouderde/verwijderde bestanden ook in de doelmap
REM verdwijnen. .git, node_modules, .next en .env blijven met rust.
REM import-data.json (echte bedrijfsgegevens) en zip-bestanden gaan NOOIT mee.
robocopy "%~dp0." "%DOEL%" /MIR /XD .git node_modules .next /XF .env .env.local import-data.json *.zip /NFL /NDL /NJH /NJS

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
REM gc.auto=0: git ruimt zijn eigen map niet op tijdens dit script. Op Windows
REM blokkeert vaak virusscanner of synchronisatie een map in .git, waarna git
REM blijft wachten op "Should I try again? (y/n)". safecrlf=false haalt de
REM LF/CRLF-waarschuwingen weg (die zijn onschuldig).
git -c gc.auto=0 -c core.safecrlf=false add .
git -c gc.auto=0 -c core.safecrlf=false commit -m "%OMSCHRIJVING%"
git -c gc.auto=0 push

echo.
echo ============================================
echo  Klaar!
echo ============================================
echo De zelfgehoste VM (via Portainer) haalt deze wijziging nu zelf op.
echo Ga naar de "cheese-stock-manager"-stack in Portainer en klik op
echo "Pull and redeploy" (met "Re-pull image and redeploy" aan) om 'm
echo daadwerkelijk uit te rollen.
pause
exit /b 0

:verkeerdeMap
echo.
echo STOP: dit script staat niet in de uitgepakte app-map, of die map bevat
echo te veel andere bestanden. Er is niets gekopieerd en niets gepubliceerd.
echo.
echo Pak de zip uit in een eigen, nieuwe map en start publiceren.cmd daar.
echo Gevonden in: %~dp0
pause
exit /b 1
