@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  CemPulse - Dev Mode (hot reload)
echo  API: http://localhost:4000
echo  App: http://localhost:3000
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

if not exist "node_modules" (
  echo Installing root dependencies...
  call npm install
  if errorlevel 1 goto :error
)

call npm run dev
goto :eof

:error
echo.
echo Install failed - see the error above.
pause
exit /b 1
