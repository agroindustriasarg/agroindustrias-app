@echo off
echo ====================================
echo Iniciando Agroindustrias App Local
echo ====================================
echo.

REM Verificar que existe el archivo .env
if not exist "client\.env" (
    echo Creando archivo .env para desarrollo local...
    echo VITE_API_URL=http://localhost:3000/api > client\.env
    echo Archivo .env creado.
    echo.
)

REM Matar procesos previos de Node
echo Cerrando procesos Node previos...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Iniciar servidor backend
echo Iniciando servidor backend...
start "Backend Server" cmd /k "cd server && npm run dev"
timeout /t 5 /nobreak >nul

REM Iniciar cliente frontend
echo Iniciando cliente frontend...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo.
echo ====================================
echo Servidores iniciados!
echo ====================================
echo.
echo Backend: http://localhost:3000/api
echo Frontend: http://localhost:5173
echo.
echo IMPORTANTE: Espera a que ambos servidores terminen de iniciar
echo y luego abre el navegador en http://localhost:5173
echo.
pause
