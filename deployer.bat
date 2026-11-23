@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title RED ROOM - deploiement
cd /d "%~dp0"

set "MODE=%~1"
if "%PORT%"=="" set "PORT=8080"
if not "%~2"=="" set "PORT=%~2"

echo ============================================
echo    RED ROOM - deploiement automatique
echo ============================================
echo.

if /i "%MODE%"=="start" goto :check
if /i "%MODE%"=="stop" goto :check
echo   [1] Lancer le site
echo   [2] Arreter le site
echo.
choice /c 12 /n /m "Ton choix, 1 ou 2 : "
if errorlevel 2 (set "MODE=stop") else (set "MODE=start")

:check
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Docker n'est pas installe.
  echo Installe Docker Desktop : https://www.docker.com/products/docker-desktop/
  goto :fail
)
docker info >nul 2>nul
if not errorlevel 1 goto :ready
echo Docker ne tourne pas : demarrage de Docker Desktop...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a TRIES=0
:waitdocker
timeout /t 3 /nobreak >nul
docker info >nul 2>nul
if not errorlevel 1 goto :ready
set /a TRIES+=1
if !TRIES! geq 40 (
  echo.
  echo [ERREUR] Docker n'a pas demarre apres 2 minutes.
  echo Lance Docker Desktop a la main, puis relance ce fichier.
  goto :fail
)
<nul set /p "=."
goto :waitdocker

:ready
echo.
if /i "%MODE%"=="stop" (
  docker compose down
  echo.
  echo Site arrete.
  goto :end
)

echo Construction et lancement sur le port %PORT%...
echo.
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERREUR] Le lancement a echoue.
  echo Si le port %PORT% est deja pris, essaie un autre port : deployer.bat start 8081
  goto :fail
)

echo.
echo Attente du site...
set /a TRIES=0
:waitsite
set "CODE="
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://localhost:%PORT%/ 2^>nul') do set "CODE=%%c"
if "!CODE!"=="200" goto :up
set /a TRIES+=1
if !TRIES! geq 30 (
  echo [ERREUR] Le site ne repond pas. Pour voir les erreurs : docker compose logs
  goto :fail
)
timeout /t 1 /nobreak >nul
goto :waitsite

:up
echo.
echo ============================================
echo   Site en ligne    : http://localhost:%PORT%
echo   Organisateurs    : http://localhost:%PORT%/orga.html
echo   Pour arreter     : deployer.bat stop
echo ============================================
if not "%NOPAUSE%"=="1" start "" "http://localhost:%PORT%"
goto :end

:fail
echo.
if not "%NOPAUSE%"=="1" pause
exit /b 1

:end
echo.
if not "%NOPAUSE%"=="1" pause
exit /b 0
