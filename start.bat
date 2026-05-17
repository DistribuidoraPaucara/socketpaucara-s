@echo off
echo.
echo ==========================================
echo  🚀 Iniciando Servidor WebSocket Cobrador
echo ==========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo ⚠️  Node_modules no encontrado. Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

echo 🔍 Verificando archivo .env...
if not exist ".env" (
    echo ⚠️  Archivo .env no encontrado. Creando desde ejemplo...
    copy .env.example .env 2>nul || (
        echo # Configuración del servidor WebSocket > .env
        echo WEBSOCKET_PORT=3001 >> .env
        echo CLIENT_URL=http://localhost:3000 >> .env
        echo LOG_LEVEL=info >> .env
        echo CORS_ORIGIN=http://localhost:3000 >> .env
    )
)

echo.
echo 🌐 Servidor se iniciará en: http://localhost:3001
echo 🧪 Archivo de prueba en: http://localhost:3001/test.html
echo.
echo ⚡ Iniciando servidor...
echo.

npm start

pause
