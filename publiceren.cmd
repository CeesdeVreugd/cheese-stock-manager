@echo off
REM Dit script commit en pusht je wijzigingen, waarna Vercel automatisch
REM een nieuwe versie bouwt en publiceert (mits gekoppeld aan deze GitHub-repo).
cd /d "%~dp0"

if not exist ".git" (
  echo Er is nog geen git-repository in deze map.
  echo Volg eerst eenmalig de stappen uit README.md onder "Gratis publiceren op internet"
  echo ^(git init, GitHub-repository aanmaken, koppelen aan Vercel^).
  echo.
  pause
  exit /b
)

echo.
set /p BERICHT="Omschrijving van deze wijziging (Nederlands, bv. 'Het logo toegevoegd.'): "

if "%BERICHT%"=="" (
  echo Geen omschrijving ingevoerd, geannuleerd.
  pause
  exit /b
)

git add .
git commit -m "%BERICHT%"
git push

echo.
echo Klaar. Vercel bouwt en publiceert de nieuwe versie automatisch
echo ^(te volgen op vercel.com, meestal binnen 1-2 minuten^).
pause
