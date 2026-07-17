@echo off
echo ====================================
echo Desplegando en Vercel
echo ====================================
echo.

REM Verificar que estamos en la rama main
git branch --show-current

REM Hacer pull de los últimos cambios
echo Actualizando repositorio...
git pull

REM Desplegar en Vercel
echo Desplegando en Vercel...
vercel --prod --yes

echo.
echo ====================================
echo Despliegue completado!
echo ====================================
echo.
pause
