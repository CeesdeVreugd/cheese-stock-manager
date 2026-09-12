@echo off
REM Dit script:
REM 1) kopieert de bestanden uit deze map naar je vaste projectmap (en
REM    verwijdert daar verouderde bestanden die hier niet meer bestaan)
REM 2) commit en pusht de wijziging, met een omschrijving die al is ingevuld
REM Jij hoeft alleen deze cmd te draaien, verder niets.

setlocal

set "DOEL=C:\Users\cees\OneDrive - De Vreugd\Documenten\Van Beek & De Vreugd Kaas\Cheesstockmanager\cheese-stock-manager"
set "OMSCHRIJVING=Automatisch publiceerscript: bestanden synchroniseren en opruimen ingebouwd."

echo.
echo Bestanden bijwerken in:
echo %DOEL%
echo.

REM /MIR zorgt dat verouderde/verwijderde bestanden ook in de doelmap
REM verdwijnen. .git, node_modules, .next en .env blijven met rust.
robocopy "%~dp0." "%DOEL%" /MIR /XD .git node_modules .next /XF .env .env.local /NFL /NDL /NJH /NJS

if %errorlevel% GEQ 8 (
  echo.
  echo Er ging iets mis bij het bijwerken van de bestanden.
  pause
  exit /b 1
)

cd /d "%DOEL%"

if not exist ".git" (
  echo.
  echo Er is geen git-repository gevonden op:
  echo %DOEL%
  echo Controleer of dit pad nog klopt.
  pause
  exit /b 1
)

git add .
git commit -m "%OMSCHRIJVING%"
git push

echo.
echo Klaar. Vercel bouwt en publiceert de nieuwe versie automatisch
echo ^(te volgen op vercel.com, meestal binnen 1-2 minuten^).
pause

