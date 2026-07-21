@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  CemPulse - Local Production-Style Test
echo  (mirrors what Hostinger will run)
echo ============================================
echo.

if not exist "server\.env" (
  echo Creating server\.env from template...
  copy /y "server\.env.example" "server\.env" >nul
)
if not exist "client\.env" (
  echo Creating client\.env from template...
  copy /y "client\.env.example" "client\.env" >nul
)

if not exist "server\node_modules" (
  echo Installing server dependencies...
  call npm install --prefix server
  if errorlevel 1 goto :error
)

if not exist "client\node_modules" (
  echo Installing client dependencies...
  call npm install --prefix client
  if errorlevel 1 goto :error
)

echo.
echo Building client for production...
call npm run build --prefix client
if errorlevel 1 goto :error

echo.
echo ============================================
echo  Starting server at http://localhost:4000
echo  Press Ctrl+C to stop.
echo ============================================
echo.
start "" http://localhost:4000
node server\index.js
goto :eof

:error
echo.
echo Build/install failed - see the error above.
pause
exit /b 1
